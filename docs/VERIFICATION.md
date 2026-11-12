# Student Verification & Anti-Spoofing Architecture

This document explains how student identity verification is enforced across **Campus Placement Hub / Placement Vault**, the cryptographic safeguards against roll-number spoofing, and the operational limitations of the model.

---

## 1. Multi-Tier Verification Model

Placement Vault implements a 3-tier authentication and verification model:

```
[ Tier 0: Unauthenticated ]
  │
  ├─► Can browse public company metadata & LeetCode frequencies
  │
[ Tier 1: Google OAuth Signed-In ]
  │
  ├─► Can view approved reports (with coin balance / give-to-get)
  ├─► Session authenticated via signed HMAC session cookie
  │
[ Tier 2: Institutional Domain / College-Email OTP Verified ]
  │
  ├─► Automatic verification if Google account ends with @college.ac.in
  ├─► Otherwise verified via 6-digit stateless HMAC OTP to college email
  ├─► Unique institutional roll number bound to account
  ├─► Can submit OA reports, interview loops, vote, and earn coins
  │
[ Tier 3: Placement Cell Moderator / Administrator ]
  │
  └─► Full moderation queue, bulk review, embargo controls, takedown logs
```

---

## 2. Anti-Spoofing Safeguards

To prevent students from claiming arbitrary roll numbers or impersonating batch toppers:

1. **Cryptographic College Email OTP:**
   - For students signing in with personal `@gmail.com` accounts, verification requires proving ownership of an institutional `@college.ac.in` / `@*.edu.in` inbox.
   - The OTP is an HMAC-SHA256 stateless token valid for 10 minutes, preventing brute-force forgery.
2. **Database Roll-Number Uniqueness:**
   - Every verified roll number is checked against all existing verified users. Two accounts cannot verify the same roll number.
3. **Format Regex Validation:**
   - Roll numbers must conform to canonical institutional naming standards (alphanumeric, 4–20 characters, matching department and year codes).
4. **Permanent Audit Log:**
   - Moderator manual verification records the moderator's identity and timestamp in `ModerationLog`.

---

## 3. Operational Limits & Edge Cases

While this architecture prevents unauthorized off-campus actors and cross-student identity theft, certain operational limits exist:

| Edge Case / Threat Vector | Threat Assessment | Mitigation Strategy |
| :--- | :--- | :--- |
| **Shared Roll Number Schemes across Different Colleges** | Two distinct universities might assign the same string (e.g. `2023CS01`). | The platform scopes uniqueness by combining `collegeDomain` + `rollNumber`. |
| **Delayed College Email Issuance** | Fresh first-year or transfer students may not receive `@college.ac.in` addresses immediately. | Such students can submit for manual moderator verification via `POST /api/me`, where a placement coordinator validates their physical ID card. |
| **Email Forwarding / Alumni Retention** | Some institutions allow alumni to retain college email access indefinitely. | Batch year (`batch: "2027"`) is recorded, and placement cell coordinators periodically audit active graduating rosters. |
| **Compromised Google Account** | Student's private Google account is breached. | Session cookies expire in 14 days, and all state-changing endpoints enforce CSRF double-submit protection. |
