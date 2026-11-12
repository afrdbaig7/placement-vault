# Content Takedown & Copyright Policy

*Notice & Takedown Framework under Section 79 of the Information Technology Act, 2000 & Digital Personal Data Protection Act, 2023*

Placement Vault operates as an interactive academic peer-to-peer knowledge platform. We respect intellectual property rights, employer non-disclosure agreements, and personal data privacy.

---

## 1. Grounds for Content Takedown

We promptly review and honor takedown requests on the following grounds:

1. **Copyright Infringement (DMCA / Indian Copyright Act):**
   - Direct reproduction of proprietary test questions, proprietary test suites, or editorial solutions from testing platforms (e.g., HackerRank, Codility, TCS iON, Mettl).
2. **Confidentiality / NDA Breach:**
   - Disclosure of confidential employer project details, non-public system design architectures, or assessment problems subject to explicit written Non-Disclosure Agreements.
3. **Personal Data & Privacy Infringement (DPDP Act, 2023):**
   - Disclosure of individual interviewer names, interviewer personal contact details, or defamatory remarks.
4. **Active Campus Drive Embargo Violations:**
   - Immediate emergency suppression if test content from an active on-campus slot has been improperly published.

---

## 2. Expedited Takedown SLA

- **Active Placement Drive Materials:** Processed within **2 hours** of notice receipt.
- **General Copyright & NDA Inquiries:** Addressed within **24 hours**.

---

## 3. Submitting a Notice

To file a formal takedown notice, send an email to our designated contact with:

1. **Identification of the Infringing Material:**
   The exact URL or Unique Report/Experience ID (e.g., `/reports?id=cly...`).
2. **Legal Basis & Authority:**
   A statement confirming you are the copyright holder, employer representative, or an affected party.
3. **Contact Details:**
   Name, company/institution, official email, and phone number.
4. **Statement of Good Faith:**
   A declaration that the use of the material is not authorized by the copyright owner or the law.

**Designated Notice Contact:**
- **Email:** `takedown@campusplacementhub.internal`
- **Subject Line:** `URGENT: Placement Vault Content Takedown Notice - [Target ID]`

---

## 4. Technical Audit & Soft-Delete Architecture

When a takedown request is approved by a moderator:
1. The record is soft-deleted by setting `deletedAt = NOW()` and `takedownReason = <Reason>`.
2. The material is instantly purged from all public API responses, company hubs, search indexes, and cache layers.
3. The entry is retained exclusively within the `ModerationLog` table to preserve an immutable audit trail for legal dispute resolution.
