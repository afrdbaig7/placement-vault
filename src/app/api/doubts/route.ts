import { db } from "@/lib/db";
import { ApiError, fail, ok, requireVerified } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildViewer, doubtView } from "@/lib/serialize";
import { getSessionUserId } from "@/lib/session";
import { assertPostCap, postsToday } from "@/lib/coins";
import { companyFilterParamSchema, createDoubtSchema, parseBody } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(req.url);
    const rawCompany = url.searchParams.get("company") ?? undefined;
    const parsedCompany = companyFilterParamSchema.safeParse(rawCompany);
    if (!parsedCompany.success) throw new ApiError(400, "Invalid company filter");
    const company = parsedCompany.data;

    const viewer = await buildViewer(userId);
    const doubts = await db.doubt.findMany({
      where: company ? { company } : {},
      orderBy: [{ createdAt: "desc" }],
      include: { author: true, _count: { select: { answers: true } } },
      take: 100,
    });
    return ok({ doubts: doubts.map((d) => doubtView(d, viewer)) });
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

    const { company, title, text, anonymous } = await parseBody(req, createDoubtSchema);

    const doubt = await db.doubt.create({
      data: { authorId: user.id, company, title, body: text, anonymous },
    });
    return ok({
      doubt: { id: doubt.id },
      message: anonymous ? "Posted anonymously" : "Doubt posted",
    });
  } catch (err) {
    return fail(err);
  }
}
