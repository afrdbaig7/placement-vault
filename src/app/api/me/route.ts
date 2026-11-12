import { db } from "@/lib/db";
import { fail, ok, requireUser, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseBody, rollNumberSchema } from "@/lib/validation";
import { isCollegeEmail, extractCollegeDomain } from "@/lib/college-auth";
import { award } from "@/lib/coins";
import { config } from "@/data/config";

/**
 * First-login onboarding: submit roll number.
 * If user signed in with an institutional college email domain, auto-verifies immediately.
 * Otherwise, stores for moderator review or college-email OTP verification.
 */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireUser();
    enforceRateLimit(req, { bucket: "me-roll", limit: 10, windowMs: 60_000, keySuffix: user.id });

    if (user.rollVerified) throw new ApiError(400, "Your roll number is already verified");

    const { rollNumber } = await parseBody(req, rollNumberSchema);
    const normRoll = rollNumber.toUpperCase().trim();

    // Check if another verified student already claimed this roll number
    const existing = await db.user.findFirst({
      where: {
        rollNumber: normRoll,
        rollVerified: true,
        id: { not: user.id },
      },
    });

    if (existing) {
      throw new ApiError(
        409,
        "This roll number is already verified to another student account. Contact your placement cell if you believe this is an error."
      );
    }

    const hasCollegeEmail = isCollegeEmail(user.email);
    const collegeDomain = hasCollegeEmail ? extractCollegeDomain(user.email) : null;

    if (hasCollegeEmail) {
      // Auto-verify approved institutional domains!
      const updated = await db.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: {
            rollNumber: normRoll,
            collegeDomain,
            rollVerified: true,
            emailVerified: new Date(),
          },
        });

        await award(tx, {
          userId: user.id,
          amount: config.rates.welcomeGrant,
          reason: "WELCOME",
          refId: "welcome-grant",
          note: "Welcome grant (College domain verified)",
        });

        return u;
      });

      return ok({
        user: { rollNumber: updated.rollNumber, rollVerified: true },
        message: "Institutional email domain recognized! Your roll number has been automatically verified (+20 coins).",
      });
    }

    // Otherwise mark for moderator review
    const updated = await db.user.update({
      where: { id: user.id },
      data: { rollNumber: normRoll },
    });

    return ok({
      user: { rollNumber: updated.rollNumber, rollVerified: false },
      message:
        "Roll number submitted for moderator review. Alternatively, verify instantly using the College Email OTP option.",
    });
  } catch (err) {
    return fail(err);
  }
}
