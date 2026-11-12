import { z } from "zod";
import { db } from "@/lib/db";
import { fail, ok, requireUser, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseBody, rollNumberSchema } from "@/lib/validation";
import { verifyCollegeOtp, extractCollegeDomain } from "@/lib/college-auth";
import { award } from "@/lib/coins";
import { config } from "@/data/config";

const verifyOtpSchema = z.object({
  collegeEmail: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
  verificationToken: z.string().trim().min(10, "Invalid verification token"),
  rollNumber: rollNumberSchema.shape.rollNumber,
});

/**
 * POST /api/auth/college-otp/verify
 * Validates OTP and binds the student's institutional domain and verified roll number.
 */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireUser();
    enforceRateLimit(req, {
      bucket: "college-otp-verify",
      limit: 5,
      windowMs: 60_000,
      keySuffix: user.id,
    });

    const { collegeEmail, otp, verificationToken, rollNumber } = await parseBody(
      req,
      verifyOtpSchema
    );

    // Roll number uniqueness check across verified students
    const existing = await db.user.findFirst({
      where: {
        rollNumber: rollNumber.toUpperCase(),
        rollVerified: true,
        id: { not: user.id },
      },
    });

    if (existing) {
      throw new ApiError(
        409,
        "This roll number has already been verified by another student account. If you believe this is an error, contact your campus placement coordinator."
      );
    }

    const isValid = verifyCollegeOtp(collegeEmail, otp, verificationToken);
    if (!isValid) {
      throw new ApiError(400, "Invalid or expired verification OTP. Please request a new code.");
    }

    const collegeDomain = extractCollegeDomain(collegeEmail);

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: user.id },
        data: {
          rollNumber: rollNumber.toUpperCase(),
          collegeDomain,
          rollVerified: true,
          emailVerified: new Date(),
        },
      });

      // Grant welcome balance (+20 coins) if not already awarded
      await award(tx, {
        userId: user.id,
        amount: config.rates.welcomeGrant,
        reason: "WELCOME",
        refId: "welcome-grant",
        note: "Welcome to Campus Placement Hub",
      });

      return u;
    });

    return ok({
      user: {
        id: updated.id,
        rollNumber: updated.rollNumber,
        collegeDomain: updated.collegeDomain,
        rollVerified: updated.rollVerified,
      },
      message: "College email and roll number successfully verified! +20 coins credited.",
    });
  } catch (err) {
    return fail(err);
  }
}
