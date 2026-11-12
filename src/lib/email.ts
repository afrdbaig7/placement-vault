import { logger } from "./logger";
import { config } from "@/data/config";

const log = logger.child("email");

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || `Campus Placement Hub <notifications@${process.env.EMAIL_DOMAIN || "placementhub.edu"}>`;

  if (!to || !to.includes("@")) {
    log.warn("Skipping email send: invalid recipient address", { to });
    return false;
  }

  // Production Resend API dispatcher
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text: text ?? html.replace(/<[^>]+>/g, ""),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        log.error("Failed to send email via Resend", { status: res.status, error: errorText, to });
        return false;
      }

      log.info("Email dispatched successfully via Resend", { to, subject });
      return true;
    } catch (err) {
      log.error("Network error sending email via Resend", { error: err, to });
      return false;
    }
  }

  // Development / Staging fallback: log to console with styled banner
  log.info(`[Email Dispatch Mock] To: ${to} | Subject: "${subject}"`, {
    to,
    subject,
    sampleContent: text ? text.slice(0, 140) : html.slice(0, 140),
  });

  return true;
}

// ---------------------------------------------------------------------------
// Transactional Templates
// ---------------------------------------------------------------------------

export async function sendReportApprovedEmail(params: {
  to: string;
  userName?: string;
  companyName: string;
  coinsAwarded: number;
  isSeasonBounty?: boolean;
}) {
  const { to, userName = "Student", companyName, coinsAwarded, isSeasonBounty } = params;
  const bountyNote = isSeasonBounty
    ? `<p style="color: #16a34a; font-weight: bold;">🎉 Bonus: You earned a +25 coin pioneer bounty for submitting the first approved 2026-27 report for ${companyName}!</p>`
    : "";

  return sendEmail({
    to,
    subject: `✅ Approved: Your ${companyName} assessment report is live on ${config.collegeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">Report Approved!</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your Online Assessment report for <strong>${companyName}</strong> has been reviewed by student moderators and published to the company hub.</p>
        ${bountyNote}
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 15px;"><strong>Coins credited:</strong> +${coinsAwarded} Placement Coins</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Use your coins to unlock interview question solutions and practice sets.</p>
        </div>
        <p>Thank you for giving back to the batch. Your insights help your peers prepare smarter.</p>
        <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">${config.collegeName} Campus Placement Hub</p>
      </div>
    `,
  });
}

export async function sendReportRejectedEmail(params: {
  to: string;
  userName?: string;
  companyName: string;
  reason?: string;
  appealUrl?: string;
}) {
  const { to, userName = "Student", companyName, reason = "Incomplete questions or does not meet quality guidelines.", appealUrl } = params;

  return sendEmail({
    to,
    subject: `Update on your ${companyName} submission — ${config.collegeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">Submission Status Update</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for submitting your experience for <strong>${companyName}</strong>. Following review by our moderators, this submission could not be approved at this time.</p>
        <div style="background: #fff1f2; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #fecdd3; color: #9f1239;">
          <p style="margin: 0; font-size: 14px;"><strong>Moderator Feedback:</strong></p>
          <p style="margin: 6px 0 0; font-size: 14px;">${reason}</p>
        </div>
        <p>If you believe this was an error or have updated details to share, you can file an appeal or revise and submit a new report.</p>
        ${appealUrl ? `<p><a href="${appealUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px;">Submit an Appeal</a></p>` : ""}
        <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">${config.collegeName} Campus Placement Hub</p>
      </div>
    `,
  });
}

export async function sendAnswerAcceptedEmail(params: {
  to: string;
  userName?: string;
  questionTitle: string;
  bounty: number;
}) {
  const { to, userName = "Student", questionTitle, bounty } = params;

  return sendEmail({
    to,
    subject: `💡 Your answer was accepted! (+${bounty} coins) — ${config.collegeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">Answer Accepted!</h2>
        <p>Hi ${userName},</p>
        <p>The student who asked <em>"${questionTitle}"</em> has marked your solution as accepted.</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #bbf7d0; color: #166534;">
          <p style="margin: 0; font-size: 15px;"><strong>Reward:</strong> +${bounty} Placement Coins transferred to your wallet</p>
        </div>
        <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">${config.collegeName} Campus Placement Hub</p>
      </div>
    `,
  });
}

export async function sendCollegeOtpEmail(params: {
  to: string;
  otp: string;
  collegeName?: string;
}) {
  const { to, otp, collegeName = config.collegeName } = params;

  return sendEmail({
    to,
    subject: `🔐 Your Verification Code: ${otp} — ${collegeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">College Email Verification</h2>
        <p>We received a request to verify this student email address on <strong>${collegeName} Campus Placement Hub</strong>.</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">${otp}</div>
          <p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">This code expires in 15 minutes. Never share it with anyone.</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you did not request this verification, you can safely ignore this email.</p>
        <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">${collegeName} Campus Placement Hub</p>
      </div>
    `,
  });
}
