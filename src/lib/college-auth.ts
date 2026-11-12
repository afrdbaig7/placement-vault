import "server-only";
import crypto from "node:crypto";

const DEFAULT_COLLEGE_DOMAINS = [
  "ac.in",
  "edu.in",
  "edu",
  "iitb.ac.in",
  "iitd.ac.in",
  "iitm.ac.in",
  "iitk.ac.in",
  "iitkgp.ac.in",
  "iitr.ac.in",
  "iitg.ac.in",
  "iith.ac.in",
  "bits-pilani.ac.in",
  "nitt.edu",
  "nitk.edu.in",
  "nitw.ac.in",
  "iiit.ac.in",
  "dtu.ac.in",
  "nsut.ac.in",
];

function getSecret(): string {
  return process.env.SESSION_SECRET || "fallback-insecure-dev-secret-at-least-32-chars-long";
}

/**
 * Checks whether an email belongs to an institutional college / university domain.
 */
export function isCollegeEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1].toLowerCase().trim();

  // Custom environment domains
  const customDomains = process.env.COLLEGE_EMAIL_DOMAINS
    ? process.env.COLLEGE_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
    : [];

  const allDomains = [...DEFAULT_COLLEGE_DOMAINS, ...customDomains];

  return allDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function extractCollegeDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

/**
 * Generates a 6-digit numeric OTP and a stateless HMAC verification token.
 * Token expires in 10 minutes.
 */
export function generateCollegeOtp(collegeEmail: string): {
  otp: string;
  verificationToken: string;
  expiresAt: number;
} {
  const normEmail = collegeEmail.toLowerCase().trim();
  // Cryptographically secure 6-digit OTP
  const otpNumber = crypto.randomInt(100000, 999999);
  const otp = otpNumber.toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  const payload = `${normEmail}:${otp}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  const verificationToken = Buffer.from(`${expiresAt}:${signature}`).toString("base64url");

  return { otp, verificationToken, expiresAt };
}

/**
 * Validates a submitted college email OTP against its stateless verification token.
 */
export function verifyCollegeOtp(
  collegeEmail: string,
  otp: string,
  verificationToken: string
): boolean {
  try {
    const normEmail = collegeEmail.toLowerCase().trim();
    const decoded = Buffer.from(verificationToken, "base64url").toString("utf-8");
    const [expiresAtStr, signature] = decoded.split(":");
    const expiresAt = Number.parseInt(expiresAtStr, 10);

    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Expired
    }

    const payload = `${normEmail}:${otp.trim()}:${expiresAt}`;
    const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

