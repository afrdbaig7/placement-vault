import { describe, it, expect } from "bun:test";
import {
  isCollegeEmail,
  extractCollegeDomain,
  generateCollegeOtp,
  verifyCollegeOtp,
} from "@/lib/college-auth";

describe("College Authentication & OTP Verification", () => {
  it("correctly identifies authorized college email domains", () => {
    // Valid Indian & International university domains
    expect(isCollegeEmail("student@nitt.edu")).toBe(true);
    expect(isCollegeEmail("rohit@iitd.ac.in")).toBe(true);
    expect(isCollegeEmail("user@campus.edu.in")).toBe(true);
    expect(isCollegeEmail("user@cs.stanford.edu")).toBe(true);
    expect(isCollegeEmail("afreed@bits-pilani.ac.in")).toBe(true);

    // Invalid commercial or personal domains
    expect(isCollegeEmail("student@gmail.com")).toBe(false);
    expect(isCollegeEmail("hacker@yahoo.com")).toBe(false);
    expect(isCollegeEmail("user@company.com")).toBe(false);
    expect(isCollegeEmail("fake@not-a-domain")).toBe(false);
    expect(isCollegeEmail("")).toBe(false);
  });

  it("extracts college domain accurately", () => {
    expect(extractCollegeDomain("student@NITT.EDU")).toBe("nitt.edu");
    expect(extractCollegeDomain("afrd@iitb.ac.in")).toBe("iitb.ac.in");
  });

  it("generates a valid 6-digit numeric OTP and cryptographic token", () => {
    const email = "student@nitt.edu";
    const { otp, verificationToken, expiresAt } = generateCollegeOtp(email);

    expect(otp).toHaveLength(6);
    expect(Number.parseInt(otp, 10)).toBeGreaterThanOrEqual(100000);
    expect(Number.parseInt(otp, 10)).toBeLessThanOrEqual(999999);
    expect(verificationToken).toBeTruthy();
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  it("verifies matching OTP and token successfully", () => {
    const email = "candidate@iitb.ac.in";
    const { otp, verificationToken } = generateCollegeOtp(email);

    const isValid = verifyCollegeOtp(email, otp, verificationToken);
    expect(isValid).toBe(true);
  });

  it("rejects mismatched OTP, modified email, or tampered token", () => {
    const email = "candidate@iitb.ac.in";
    const { otp, verificationToken } = generateCollegeOtp(email);

    // Incorrect OTP
    expect(verifyCollegeOtp(email, "000000", verificationToken)).toBe(false);

    // Different email
    expect(verifyCollegeOtp("attacker@iitb.ac.in", otp, verificationToken)).toBe(false);

    // Tampered token
    expect(verifyCollegeOtp(email, otp, "tampered-token-123")).toBe(false);
  });
});

