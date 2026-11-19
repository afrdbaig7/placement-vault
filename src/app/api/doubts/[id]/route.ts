import { db } from "@/lib/db";
import { fail, ok, requireVerified, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildViewer, doubtView, answerView } from "@/lib/serialize";
import { getSessionUserId } from "@/lib/session";
import { assertPostCap, postsToday } from "@/lib/coins";
import { createAnswerSchema, idSchema, parseBody } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid doubt ID");
    const id = parsedId.data;

    const viewer = await buildViewer(userId);
    const doubt = await db.doubt.findUnique({
      where: { id },
      include: { author: true, _count: { select: { answers: true } } },
    });
    if (!doubt) throw new ApiError(404, "Doubt not found");
    const answers = await db.answer.findMany({
      where: { doubtId: id },
      orderBy: [{ accepted: "desc" }, { upvoteCount: "desc" }, { createdAt: "asc" }],
      include: { author: true },
    });
    return ok({ doubt: doubtView(doubt, viewer), answers: answers.map((a) => answerView(a, viewer)) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "content-create", limit: 15, windowMs: 60_000, keySuffix: user.id });
    assertPostCap(await postsToday(user.id));

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid doubt ID");
    const id = parsedId.data;

    const { text } = await parseBody(req, createAnswerSchema);

    const doubt = await db.doubt.findUnique({ where: { id } });
    if (!doubt) throw new ApiError(404, "Doubt not found");

    const answer = await db.answer.create({
      data: { doubtId: id, authorId: user.id, body: text },
    });
    return ok({ answer: { id: answer.id }, message: "Answer posted" });
  } catch (err) {
    return fail(err);
  }
}
