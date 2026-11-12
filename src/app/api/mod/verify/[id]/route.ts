import { db } from "@/lib/db";
import { fail, ok, requireMod, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { award } from "@/lib/coins";
import { idSchema, modVerifySchema, parseBody } from "@/lib/validation";
import { config } from "@/data/config";

/**
 * Roll-number verification. Approving unlocks earn/spend and grants the welcome coins
 * atomically in a single transaction.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const mod = await requireMod();
    enforceRateLimit(req, { bucket: "mod-action", limit: 40, windowMs: 60_000, keySuffix: mod.id });

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid user ID");
    const id = parsedId.data;

    const { action } = await parseBody(req, modVerifySchema);

    const message = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new ApiError(404, "User not found");
      if (user.rollVerified) throw new ApiError(400, "Already verified");

      if (action === "approve") {
        const claimed = await tx.user.updateMany({
          where: { id, rollVerified: false },
          data: { rollVerified: true },
        });
        if (claimed.count !== 1) throw new ApiError(409, "Verification conflict — please refresh");

        await award(tx, {
          userId: id,
          amount: config.rates.welcomeGrant,
          reason: "WELCOME",
          refId: id,
          note: "Roll number verified — welcome to the platform",
        });
        await tx.moderationLog.create({
          data: {
            moderatorId: mod.id,
            targetType: "USER",
            targetId: id,
            action: "VERIFY",
            beforeState: "UNVERIFIED",
            afterState: "VERIFIED",
            reason: "Roll number verified by moderator",
          },
        });
        return `${user.name} verified — welcome coins granted`;
      }

      await tx.user.update({ where: { id }, data: { rollNumber: null } });
      await tx.moderationLog.create({
        data: {
          moderatorId: mod.id,
          targetType: "USER",
          targetId: id,
          action: "REJECT_VERIFICATION",
          beforeState: "UNVERIFIED",
          afterState: "CLEARED",
          reason: "Roll number rejected by moderator",
        },
      });
      return `${user.name}'s roll number cleared — they can resubmit`;
    });

    return ok({ message });
  } catch (err) {
    return fail(err);
  }
}
