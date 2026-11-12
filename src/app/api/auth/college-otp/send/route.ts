import { z } from "zod";
import { fail, ok, requireUser, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation";
import { isCollegeEmail, generateCollegeOtp } from "@/lib/college-auth";
import { sendCollegeOtpEmail } from "@/lib/email";

const sendOtpSchema = z.object({
  collegeEmail: z.string().trim().email("Enter a valid college email address"),
});

/**
 * POST /api/auth/college-otp/send
 * Sends an OTP to the student's institutional email address.
 */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireUser();
    enforceRateLimit(req, {
      bucket: "college-otp-send",
      limit: 3,
      windowMs: 60_000,
      keySuffix: user.id,
    });

    const { collegeEmail } = await parseBody(req, sendOtpSchema);

    if (!isCollegeEmail(collegeEmail)) {
      throw new ApiError(
        400,
        "Please provide an authorized college or university email address (e.g. yourname@college.ac.in or yourname@university.edu)"
      );
    }

    const { otp, verificationToken, expiresAt } = generateCollegeOtp(collegeEmail);

    // Send email asynchronously (Resend API or mock in dev)
    void sendCollegeOtpEmail({ to: collegeEmail, otp });

    return ok({
      verificationToken,
      expiresAt,
      message:
        process.env.NODE_ENV === "production"
          ? `Verification OTP sent to ${collegeEmail}. Please check your inbox.`
          : `Verification OTP generated for ${collegeEmail}. (Dev mode: check terminal logs: ${otp})`,
    });
  } catch (err) {
    return fail(err);
  }
}

