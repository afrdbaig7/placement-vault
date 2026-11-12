import { db } from "@/lib/db";
import { ApiError, fail, ok, requireVerified } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildViewer, experienceView } from "@/lib/serialize";
import { getSessionUserId } from "@/lib/session";
import { assertPostCap, postsToday } from "@/lib/coins";
import { companyFilterParamSchema, createExperienceSchema, parseBody } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(req.url);
    const rawCompany = url.searchParams.get("company") ?? undefined;
    const parsedCompany = companyFilterParamSchema.safeParse(rawCompany);
    if (!parsedCompany.success) throw new ApiError(400, "Invalid company filter");
    const company = parsedCompany.data;
    const season = url.searchParams.get("season")?.trim();
    const offerStatus = url.searchParams.get("offerStatus")?.trim();
    const difficulty = url.searchParams.get("difficulty")?.trim();
    const mine = url.searchParams.get("mine") === "1";

    const viewer = await buildViewer(userId);
    const experiences = await db.experience.findMany({
      where:
        mine && viewer.user
          ? { authorId: viewer.user.id }
          : {
              status: "APPROVED",
              ...(company ? { OR: [{ company }, { companyRef: { slug: company } }] } : {}),
              ...(season ? { hiringSeason: season } : {}),
              ...(offerStatus ? { offerStatus } : {}),
              ...(difficulty ? { difficulty } : {}),
            },
      orderBy: [
        { hiringSeason: "desc" }, // Prioritize 2026-27 season
        { createdAt: "desc" },
      ],
      include: {
        author: true,
        companyRef: { select: { slug: true, name: true } },
        rounds: {
          orderBy: { order: "asc" },
          include: {
            questions: true,
          },
        },
      },
      take: 100,
    });
    return ok({ experiences: experiences.map((e) => experienceView(e, viewer)).filter(Boolean) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "content-create", limit: 10, windowMs: 60_000, keySuffix: user.id });
    assertPostCap(await postsToday(user.id));

    const body = await parseBody(req, createExperienceSchema);

    const comp = await db.company.findUnique({ where: { slug: body.company } });
    if (!comp) throw new ApiError(404, "Company not found");

    const experience = await db.$transaction(async (tx) => {
      const created = await tx.experience.create({
        data: {
          companyId: comp.id,
          authorId: user.id,
          company: comp.slug,
          hiringSeason: body.hiringSeason ?? "2026-27",
          graduatingBatch: body.graduatingBatch ?? 2027,
          role: body.role,
          offerStatus: body.offerStatus ?? "OFFERED",
          overallDifficulty: body.overallDifficulty ?? "Medium",
          round: body.round ?? "Full loop",
          platform: body.platform ?? "On-Campus",
          topics: body.topics ?? [],
          difficulty: body.difficulty ?? "Medium",
          outcome: body.outcome ?? "Cleared",
          tips: body.tips ?? null,
          body: body.text,
          isAnonymous: Boolean(body.isAnonymous),
          status: "PENDING",
        },
      });

      // Insert rounds and round questions
      if (body.rounds && body.rounds.length > 0) {
        for (let i = 0; i < body.rounds.length; i++) {
          const rd = body.rounds[i];
          const roundRecord = await tx.interviewRound.create({
            data: {
              experienceId: created.id,
              order: i,
              name: rd.name,
              type: rd.type,
              durationMin: rd.durationMin ?? null,
              notes: rd.notes ?? null,
            },
          });

          if (rd.questions && rd.questions.length > 0) {
            await tx.roundQuestion.createMany({
              data: rd.questions.map((q) => ({
                roundId: roundRecord.id,
                text: q.text,
                topics: q.topics ?? [],
                difficulty: q.difficulty ?? null,
                linkedProblemId: q.linkedProblemId ?? null,
              })),
            });
          }
        }
      }

      return created;
    });

    return ok({
      experience: { id: experience.id },
      message: "Submitted — a moderator will review it soon",
    });
  } catch (err) {
    return fail(err);
  }
}
