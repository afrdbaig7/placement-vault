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
    const mine = url.searchParams.get("mine") === "1";

    const viewer = await buildViewer(userId);
    const experiences = await db.experience.findMany({
      where:
        mine && viewer.user
          ? { authorId: viewer.user.id }
          : { status: "APPROVED", ...(company ? { company } : {}) },
      orderBy: { createdAt: "desc" },
      include: { author: true },
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

    const { company, role, round, platform, difficulty, outcome, topics, text } = await parseBody(
      req,
      createExperienceSchema
    );

    const experience = await db.experience.create({
      data: {
        authorId: user.id,
        company,
        role,
        round,
        platform,
        topics: JSON.stringify(topics),
        difficulty,
        outcome,
        body: text,
        status: "PENDING",
      },
    });
    return ok({
      experience: { id: experience.id },
      message: "Submitted — a moderator will review it soon",
    });
  } catch (err) {
    return fail(err);
  }
}
