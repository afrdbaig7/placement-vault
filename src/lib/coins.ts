import "server-only";
import { db } from "@/lib/db";
import { config, isMod } from "@/data/config";
import { ApiError } from "@/lib/auth";
import { Prisma, type PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// ---------- reads ----------

export async function balanceOf(userId: string, tx?: Tx): Promise<number> {
  const client = tx ?? db;
  const rows = await client.coinLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return rows._sum.amount ?? 0;
}

/** Companies where this user has an approved OA report or experience (give-to-get). */
export async function contributionCompanies(userId: string, tx?: Tx): Promise<string[]> {
  const client = tx ?? db;
  const [reportCompanies, expCompanies] = await Promise.all([
    client.oaReport.findMany({
      where: { authorId: userId, status: "APPROVED" },
      select: { drive: { select: { company: true } } },
      distinct: ["driveId"],
    }),
    client.experience.findMany({
      where: { authorId: userId, status: "APPROVED" },
      select: { company: true },
      distinct: ["company"],
    }),
  ]);
  const set = new Set<string>();
  reportCompanies.forEach((r) => set.add(r.drive.company));
  expCompanies.forEach((e) => set.add(e.company));
  return [...set];
}

export async function postsToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [reports, exps, doubts, answers] = await Promise.all([
    db.oaReport.count({ where: { authorId: userId, createdAt: { gte: start } } }),
    db.experience.count({ where: { authorId: userId, createdAt: { gte: start } } }),
    db.doubt.count({ where: { authorId: userId, createdAt: { gte: start } } }),
    db.answer.count({ where: { authorId: userId, createdAt: { gte: start } } }),
  ]);
  return reports + exps + doubts + answers;
}

export function assertPostCap(count: number) {
  if (count >= config.caps.dailyPosts) {
    throw new ApiError(
      429,
      `Daily post cap reached (${config.caps.dailyPosts}/day). Please come back tomorrow.`
    );
  }
}

// ---------- writes ----------

/**
 * Append one ledger row. Idempotent: the unique key on (user, reason, ref)
 * means the same reward can never be granted twice.
 */
export async function award(
  tx: Tx,
  opts: { userId: string; amount: number; reason: string; refId?: string | null; note?: string }
): Promise<boolean> {
  try {
    await tx.coinLedger.create({
      data: {
        userId: opts.userId,
        amount: opts.amount,
        reason: opts.reason,
        refId: opts.refId ?? null,
        note: opts.note ?? null,
      },
    });
    return true;
  } catch (e) {
    if (isUniqueConstraintError(e)) return false;
    throw e;
  }
}

/** Coins earned from upvotes so far today (for the daily cap). */
export async function upvoteEarnToday(userId: string, tx?: Tx): Promise<number> {
  const client = tx ?? db;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await client.coinLedger.aggregate({
    where: { userId, reason: "UPVOTE_RECEIVED", createdAt: { gte: start }, amount: { gt: 0 } },
    _sum: { amount: true },
  });
  return rows._sum.amount ?? 0;
}

/**
 * Reward the author of a target for receiving a distinct upvote.
 * Daily cap check and ledger write run atomically in a single transaction.
 */
export async function rewardUpvote(
  opts: {
    authorId: string;
    targetType: string;
    targetId: string;
    voterId: string;
  },
  outerTx?: Tx
) {
  const { authorId, targetType, targetId, voterId } = opts;
  if (authorId === voterId) return;

  const run = async (tx: Tx) => {
    const author = await tx.user.findUnique({ where: { id: authorId } });
    if (!author?.rollVerified) return;
    const earned = await upvoteEarnToday(authorId, tx);
    if (earned >= config.caps.upvoteEarnDaily) return;
    await award(tx, {
      userId: authorId,
      amount: config.rates.upvoteReceived,
      reason: "UPVOTE_RECEIVED",
      refId: `${targetType}:${targetId}:${voterId}`,
      note: `Upvote on ${targetType.toLowerCase()}`,
    });
  };

  if (outerTx) {
    await run(outerTx);
  } else {
    await db.$transaction(run);
  }
}

/**
 * Unlock an OA report atomically inside ONE transaction:
 * (a) verifies access, embargo, existing unlock & balance,
 * (b) writes the unlock row, and
 * (c) writes the negative (or 0-coin audit) ledger row.
 */
export async function unlockOa(userId: string, reportId: string) {
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new ApiError(401, "Sign in first");
      const userIsMod = isMod(user.role);
      if (!user.rollVerified && !userIsMod) {
        throw new ApiError(403, "A moderator must verify your roll number before you can spend coins");
      }

      const report = await tx.oaReport.findUnique({
        where: { id: reportId },
        include: { drive: true, body: true },
      });
      if (!report || !report.body) throw new ApiError(404, "Report not found");
      if (report.status !== "APPROVED") throw new ApiError(400, "Report is not approved");

      const isAuthor = report.authorId === userId;

      // Embargo: reports tied to an OPEN drive stay hidden until a moderator closes the drive.
      if (report.drive.status === "OPEN" && !isAuthor && !userIsMod) {
        throw new ApiError(
          423,
          "This drive is still open — reports stay under embargo until a moderator closes it"
        );
      }

      const existing = await tx.unlock.findUnique({
        where: { userId_reportId: { userId, reportId } },
      });
      if (existing) return { alreadyUnlocked: true, free: existing.free };

      const contribCompanies = await contributionCompanies(userId, tx);
      const giveToGet = contribCompanies.includes(report.drive.company);

      if (isAuthor || userIsMod || giveToGet) {
        await tx.unlock.create({
          data: { userId, reportId, free: true },
        });
        if (giveToGet && !isAuthor && !userIsMod) {
          await award(tx, {
            userId,
            amount: 0,
            reason: "GIVE_TO_GET",
            refId: reportId,
            note: `Give-to-get unlock (${report.drive.company})`,
          });
        }
        return {
          alreadyUnlocked: false,
          free: true,
          reason: isAuthor || userIsMod ? "author-or-mod" : "give-to-get",
        };
      }

      const cost = config.rates.unlockOa;
      const balance = await balanceOf(userId, tx);
      if (balance < cost) {
        throw new ApiError(
          402,
          `Not enough coins: unlocking costs ${cost}, you have ${balance}. Contribute an OA report or experience to earn more.`
        );
      }

      await tx.unlock.create({ data: { userId, reportId, free: false } });
      await award(tx, {
        userId,
        amount: -cost,
        reason: "UNLOCK_OA",
        refId: reportId,
        note: `Unlocked ${report.drive.company} OA report`,
      });
      return { alreadyUnlocked: false, free: false, balance: balance - cost };
    });
  } catch (err) {
    // Handle concurrent duplicate unlock requests idempotently
    if (isUniqueConstraintError(err)) {
      const existing = await db.unlock.findUnique({
        where: { userId_reportId: { userId, reportId } },
      });
      if (existing) return { alreadyUnlocked: true, free: existing.free };
    }
    throw err;
  }
}
