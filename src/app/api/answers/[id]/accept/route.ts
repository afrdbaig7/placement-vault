import { db } from "@/lib/db";
import { fail, ok, ApiError, requireVerified } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { award } from "@/lib/coins";
import { idSchema } from "@/lib/validation";
import { config } from "@/data/config";

/** Asker accepts one answer on their doubt → author earns coins atomically. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "answer-accept", limit: 20, windowMs: 60_000, keySuffix: user.id });

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid answer ID");
    const id = parsedId.data;

    await db.$transaction(async (tx) => {
      const answer = await tx.answer.findUnique({ where: { id }, include: { doubt: true } });
      if (!answer) throw new ApiError(404, "Answer not found");
      if (answer.doubt.authorId !== user.id) {
        throw new ApiError(403, "Only the student who asked can accept an answer");
      }

      await tx.answer.updateMany({ where: { doubtId: answer.doubtId }, data: { accepted: false } });
      await tx.answer.update({ where: { id }, data: { accepted: true } });

      if (answer.authorId !== user.id) {
        await award(tx, {
          userId: answer.authorId,
          amount: config.rates.answerAccepted,
          reason: "ANSWER_ACCEPTED",
          refId: answer.id,
          note: "Answer accepted",
        });
      }
    });

    return ok({ message: "Answer accepted" });
  } catch (err) {
    return fail(err);
  }
}
