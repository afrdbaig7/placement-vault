import { db } from "@/lib/db";
import { fail, ok, requireVerified, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildViewer, reportView } from "@/lib/serialize";
import { getSessionUserId } from "@/lib/session";
import { assertPostCap, postsToday } from "@/lib/coins";
import { companyFilterParamSchema, createReportSchema, parseBody } from "@/lib/validation";

/**
 * GET /api/reports?company=slug&season=2026-27&platform=HackerRank&mine=1
 * Public: approved reports of CLOSED drives or off-campus OAs.
 * Prioritizes 2026-27 hiring season submissions.
 */
export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(req.url);
    const rawCompany = url.searchParams.get("company") ?? undefined;
    const parsedCompany = companyFilterParamSchema.safeParse(rawCompany);
    if (!parsedCompany.success) throw new ApiError(400, "Invalid company filter");
    const company = parsedCompany.data;
    const season = url.searchParams.get("season")?.trim();
    const platform = url.searchParams.get("platform")?.trim();
    const difficulty = url.searchParams.get("difficulty")?.trim();
    const mine = url.searchParams.get("mine") === "1";

    const viewer = await buildViewer(userId);
    const where =
      mine && viewer.user
        ? { authorId: viewer.user.id }
        : {
            status: "APPROVED",
            OR: [{ drive: null }, { drive: { status: "CLOSED" } }],
            ...(company ? { OR: [{ company: { slug: company } }, { drive: { company } }] } : {}),
            ...(season ? { hiringSeason: season } : {}),
            ...(platform ? { platform } : {}),
            ...(difficulty ? { difficulty } : {}),
          };

    const reports = await db.oaReport.findMany({
      where,
      orderBy: [
        { hiringSeason: "desc" }, // 2026-27 comes before 2025-26
        { createdAt: "desc" },
      ],
      include: {
        author: true,
        company: { select: { slug: true, name: true } },
        drive: { select: { company: true, status: true, role: true, driveDate: true } },
        body: true,
        questions: {
          orderBy: { order: "asc" },
        },
      },
      take: 100,
    });

    const views = reports.map((r) => reportView(r, viewer)).filter(Boolean);
    return ok({ reports: views });
  } catch (err) {
    return fail(err);
  }
}

/** Submit an OA report with granular questions. Gated by daily post cap. */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "content-create", limit: 10, windowMs: 60_000, keySuffix: user.id });
    assertPostCap(await postsToday(user.id));

    const body = await parseBody(req, createReportSchema);

    // Resolve target company and drive
    let companyId: string;
    let driveRole: string = body.role ?? "Software Engineer";
    let driveObj: { id: string; status: string } | null = null;

    if (body.driveId) {
      const drive = await db.drive.findUnique({ where: { id: body.driveId } });
      if (!drive) throw new ApiError(404, "Drive not found");
      companyId = drive.companyId;
      driveRole = drive.role;
      driveObj = { id: drive.id, status: drive.status };
    } else {
      const targetSlug = body.companySlug ?? body.company;
      if (!targetSlug) {
        throw new ApiError(400, "Must specify a company or drive");
      }
      const comp = await db.company.findUnique({ where: { slug: targetSlug } });
      if (!comp) throw new ApiError(404, "Company not found");
      companyId = comp.id;
    }

    const report = await db.$transaction(async (tx) => {
      const created = await tx.oaReport.create({
        data: {
          companyId,
          role: driveRole,
          authorId: user.id,
          driveId: driveObj?.id ?? null,
          hiringSeason: body.hiringSeason ?? "2026-27",
          graduatingBatch: body.graduatingBatch ?? 2027,
          assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date(),
          platform: body.platform,
          round: body.round ?? "Online Assessment",
          durationMin: body.durationMin ?? null,
          sections: body.sections ?? [],
          topics: body.topics ?? [],
          difficulty: body.difficulty,
          outcome: body.outcome,
          summary: body.summary,
          isAnonymous: Boolean(body.isAnonymous),
          status: "PENDING",
        },
      });

      // Monolithic text summary
      await tx.oaBody.create({
        data: {
          reportId: created.id,
          text: body.text || body.summary,
        },
      });

      // Granular questions
      if (body.questions && body.questions.length > 0) {
        await tx.oAQuestion.createMany({
          data: body.questions.map((q, idx) => ({
            reportId: created.id,
            type: q.type,
            title: q.title ?? null,
            statementMd: q.statementMd,
            constraints: q.constraints ?? null,
            sampleIO: q.sampleIO ?? null,
            topics: q.topics,
            difficulty: q.difficulty,
            linkedProblemId: q.linkedProblemId ?? null,
            marks: q.marks ?? null,
            order: idx,
          })),
        });

        // Link any problem to company's problem list
        for (const q of body.questions) {
          if (q.linkedProblemId) {
            await tx.companyProblem.upsert({
              where: {
                companyId_problemId_window_sourceName: {
                  companyId,
                  problemId: q.linkedProblemId,
                  window: "ALL",
                  sourceName: "student-oa-report",
                },
              },
              update: {
                frequency: { increment: 1.0 },
              },
              create: {
                companyId,
                problemId: q.linkedProblemId,
                window: "ALL",
                frequency: 1.0,
                sourceName: "student-oa-report",
                sourceSnapshotDate: new Date(),
              },
            });
          }
        }
      }

      return created;
    });

    const isEmbargoed = driveObj && driveObj.status === "OPEN";

    return ok({
      report: { id: report.id },
      message: isEmbargoed
        ? "Submitted — it stays under embargo until the drive closes, then a moderator reviews it"
        : "Submitted — a moderator will review it soon",
    });
  } catch (err) {
    return fail(err);
  }
}
