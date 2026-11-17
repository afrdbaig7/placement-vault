import { db } from "@/lib/db";
import { fail, ok, requireUser, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseBody, rollNumberSchema } from "@/lib/validation";

/** First-login onboarding: submit roll number for mod verification. */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireUser();
    enforceRateLimit(req, { bucket: "me-roll", limit: 10, windowMs: 60_000, keySuffix: user.id });

    if (user.rollVerified) throw new ApiError(400, "Your roll number is already verified");

    const { rollNumber } = await parseBody(req, rollNumberSchema);

    const updated = await db.user.update({
      where: { id: user.id },
      data: { rollNumber },
    });
    return ok({
      user: { rollNumber: updated.rollNumber },
      message: "Submitted — a moderator will verify it shortly",
    });
  } catch (err) {
    return fail(err);
  }
}
