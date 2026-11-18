import { fail, ok, requireVerified } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { unlockOa } from "@/lib/coins";
import { parseBody, unlockSchema } from "@/lib/validation";
import { config } from "@/data/config";

/**
 * POST /api/unlock { reportId }
 * Server-side enforcement of coins: balance check, give-to-get check,
 * embargo check and unlock + ledger writes all happen in one transaction.
 */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "unlock", limit: 20, windowMs: 60_000, keySuffix: user.id });

    const { reportId } = await parseBody(req, unlockSchema);
    const result = await unlockOa(user.id, reportId);
    return ok({ ...result, unlockCost: config.rates.unlockOa });
  } catch (err) {
    return fail(err);
  }
}
