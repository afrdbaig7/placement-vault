# Privacy Policy & Student Data Protection

*Last updated: November 2026 · Digital Personal Data Protection (DPDP) Act, 2023 Compliance Framework*

> [!IMPORTANT]
> **LEGAL NOTICE FOR ADMINISTRATORS:**
> This policy outlines the technical data protection architecture implemented across Placement Vault. Because this application processes student personal identifiers and institutional records under Indian jurisdiction, **formal review by qualified legal counsel is required prior to commercial launch or university-wide rollout**.

---

## 1. Statutory Framework & Scope

This Privacy Policy governs the processing of digital personal data across **Campus Placement Hub / Placement Vault** ("Platform") in compliance with:
- **The Digital Personal Data Protection Act, 2023 (DPDP Act, 2023)** (India)
- **The Information Technology Act, 2000** and Intermediary Guidelines (2021)
- Applicable University Placement Cell data privacy mandates.

### Roles Defined under DPDP Act, 2023
- **Data Fiduciary:** The institution or administrative team operating the Placement Vault deployment.
- **Data Principal:** The individual student, alumnus, or placement coordinator whose personal data is collected.

---

## 2. Personal Data Collected & Purpose of Processing

Placement Vault collects only digital personal data necessary for authenticating candidates, preventing recruitment fraud, and facilitating peer placement preparation:

| Data Category | Data Elements Collected | Lawful Purpose & Processing Ground |
| :--- | :--- | :--- |
| **Authentication Identity** | Google Name, Email, Profile Avatar | Account creation, session token management, user identification. |
| **Institutional Affiliation** | College Email Domain (`@college.ac.in`), Roll/Registration Number | Verification that contributor is a genuine candidate; anti-spoofing; recruitment cell compliance. |
| **Recruitment Status** | Batch year (e.g., 2027), Placed Company, Roles | Tailoring peer guidance; highlighting Class of 2027 contributions; give-to-get access. |
| **User Submissions** | OA Reports, Interview Loops, Doubts, Upvotes | Peer placement knowledge repository; platform coin ledger economy. |
| **Audit & Security Logs** | IP hashes, Rate-limit timestamps, Moderation event logs | Fraud prevention; maintaining drive embargoes; forensic logging of takedown actions. |

---

## 3. Data Minimization & Anonymous Submissions

1. **Pseudonymization by Design:**
   Students may choose to post OA reports and interview experiences **anonymously**.
2. **Public Presentation:**
   When the anonymous flag is toggled, public API endpoints strip:
   - Full name $\rightarrow$ replaced with `"Anonymous Student"`
   - Avatar image $\rightarrow$ stripped to `null`
   - Roll number and batch $\rightarrow$ never exposed in client payloads
3. **Internal Audit Isolation:**
   The author's underlying foreign key is retained internally solely for:
   - Fraud investigation and abuse mitigation.
   - Enforcing employer NDA takedown requests.
   - Crediting earned virtual platform coins to the correct student wallet.

---

## 4. Student Data Principal Rights (DPDP Act, 2023, Chapter III)

In accordance with Sections 11–14 of the DPDP Act 2023, students maintain enforceable rights over their personal data:

1. **Right to Access Information (Section 11):**
   Students can view all submitted reports, wallet ledger history, unlocked materials, and profile metadata directly via the `/api/me` and `/api/wallet` endpoints.
2. **Right to Correction & Updating (Section 12):**
   Students may update placement status and batch records when they receive job offers.
3. **Right to Erasure / Content Removal (Section 12):**
   Students may request account deletion or content withdrawal. Content is soft-deleted (`deletedAt` timestamp recorded) to preserve moderation history while purging public availability.
4. **Right of Grievance Redressal (Section 13):**
   A designated Grievance Officer is accessible for privacy complaints (see Section 7 below).

---

## 5. Security Safeguards & Data Storage

1. **Cryptographic Protection:**
   - Database passwords, session tokens, and OTP verifications use HMAC-SHA256 and SCRAM-SHA-256 protocols.
   - CSRF double-submit tokens protect all state-changing endpoints.
2. **Storage Location:**
   - All production PostgreSQL databases and Redis instances are deployed in local or regional compliant availability zones.
3. **No Third-Party Data Monetization:**
   - Student personal data is **never sold, rented, or traded** to recruiters, marketing agencies, or external commercial networks.

---

## 6. Retention & Storage Limitation

- **Active Season Data:** Submissions from the active hiring season (Class of 2027) are retained with primary visibility.
- **Historical Content:** Older seasons (e.g., 2024-25) transition to historical reference archives.
- **Deleted Accounts:** Upon verified account termination, personal identifiers are purged within 30 business days, retaining anonymized moderation audit entries required for campus recruitment governance.

---

## 7. Grievance Officer & Contact

In accordance with Section 13 of the DPDP Act 2023, the designated Data Protection Grievance Officer is:

- **Designation:** Campus Placement Hub Data Protection Officer
- **Email:** `privacy@campusplacementhub.internal` / `grievance-placement@college.ac.in`
- **SLA for Resolution:** All formal privacy and erasure inquiries are addressed within 7 business days.
