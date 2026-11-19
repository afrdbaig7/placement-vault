import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, ok, requireVerified, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { rewardUpvote } from "@/lib/coins";
import { parseBody, voteSchema } from "@/lib/validation";

type TargetType = "REPORT" | "EXPERIENCE" | "DOUBT" | "ANSWER";

async function resolveAuthor(tx: Prisma.TransactionClient, targetType: TargetType, targetId: string) {
  switch (targetType) {
    case "REPORT":
      return (await tx.oaReport.findUnique({ where: { id: targetId }, select: { authorId: true } }))?.authorId ?? null;
    case "EXPERIENCE":
      return (await tx.experience.findUnique({ where: { id: targetId }, select: { authorId: true } }))?.authorId ?? null;
    case "DOUBT":
      return (await tx.doubt.findUnique({ where: { id: targetId }, select: { authorId: true } }))?.authorId ?? null;
    case "ANSWER":
      return (await tx.answer.findUnique({ where: { id: targetId }, select: { authorId: true } }))?.authorId ?? null;
  }
}

async function adjustUpvoteCount(
  tx: Prisma.TransactionClient,
  targetType: TargetType,
  targetId: string,
  delta: 1 | -1
) {
  const data = { upvoteCount: delta === 1 ? { increment: 1 } : { decrement: 1 } };
  switch (targetType) {
    case "REPORT":
      await tx.oaReport.update({ where: { id: targetId }, data });
      break;
    case "EXPERIENCE":
      await tx.experience.update({ where: { id: targetId }, data });
      break;
    case "DOUBT":
      await tx.doubt.update({ where: { id: targetId }, data });
      break;
    case "ANSWER":
      await tx.answer.update({ where: { id: targetId }, data });
      break;
  }
}

/**
 * Toggle an upvote atomically. Upvotes count only from distinct users and
 * author coin earnings are daily-capped inside the transaction.
 */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "votes", limit: 30, windowMs: 60_000, keySuffix: user.id });

    const { targetType, targetId } = await parseBody(req, voteSchema);

    const voted = await db.$transaction(async (tx) => {
      const authorId = await resolveAuthor(tx, targetType, targetId);
      if (!authorId) throw new ApiError(404, "Target not found");

      const existing = await tx.vote.findUnique({
        where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } },
      });

      if (existing) {
        await tx.vote.delete({ where: { id: existing.id } });
        await adjustUpvoteCount(tx, targetType, targetId, -1);
        return false;
      }

      await tx.vote.create({ data: { userId: user.id, targetType, targetId } });
      await adjustUpvoteCount(tx, targetType, targetId, 1);
      await rewardUpvote({ authorId, targetType, targetId, voterId: user.id }, tx);
      return true;
    });

    return ok({ voted });
  } catch (err) {
    return fail(err);
  }
}
