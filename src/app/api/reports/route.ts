import { db } from "@/lib/db";
import { fail, ok, requireVerified, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildViewer, reportView } from "@/lib/serialize";
import { getSessionUserId } from "@/lib/session";
import { assertPostCap, postsToday } from "@/lib/coins";
import { companyFilterParamSchema, createReportSchema, parseBody } from "@/lib/validation";

/**
 * GET /api/reports?company=slug&mine=1
 * Public: approved reports of CLOSED drives (embargo honoured).
 * mine=1: your own submissions including pending/embargoed ones.
 */
export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(req.url);
    const rawCompany = url.searchParams.get("company") ?? undefined;
    const parsedCompany = companyFilterParamSchema.safeParse(rawCompany);
    if (!parsedCompany.success) throw new ApiError(400, "Invalid company filter");
    const company = parsedCompany.data;
    const mine = url.searchParams.get("mine") === "1";

    const viewer = await buildViewer(userId);
    const where =
      mine && viewer.user
        ? { authorId: viewer.user.id }
        : { status: "APPROVED", drive: { status: "CLOSED", ...(company ? { company } : {}) } };

    const reports = await db.oaReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        drive: { select: { company: true, status: true, role: true, driveDate: true } },
        body: true,
      },
      take: 100,
    });

    const views = reports.map((r) => reportView(r, viewer)).filter(Boolean);
    return ok({ reports: views });
  } catch (err) {
    return fail(err);
  }
}

/** Submit an OA report (structured form + free text). Gated by daily post cap. */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "content-create", limit: 10, windowMs: 60_000, keySuffix: user.id });
    assertPostCap(await postsToday(user.id));

    const { driveId, round, platform, difficulty, outcome, topics, summary, text } = await parseBody(
      req,
      createReportSchema
    );

    const drive = await db.drive.findUnique({ where: { id: driveId } });
    if (!drive) throw new ApiError(404, "Drive not found");

    const report = await db.$transaction(async (tx) => {
      const created = await tx.oaReport.create({
        data: {
          authorId: user.id,
          driveId,
          round,
          platform,
          topics: JSON.stringify(topics),
          difficulty,
          outcome,
          summary,
          status: "PENDING",
        },
      });
      await tx.oaBody.create({ data: { reportId: created.id, text } });
      return created;
    });

    return ok({
      report: { id: report.id },
      message:
        drive.status === "OPEN"
          ? "Submitted — it stays under embargo until the drive closes, then a moderator reviews it"
          : "Submitted — a moderator will review it soon",
    });
  } catch (err) {
    return fail(err);
  }
}
