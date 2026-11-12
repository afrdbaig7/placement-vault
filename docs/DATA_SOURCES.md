# Data Sources & Attribution Policy

This document details all third-party datasets ingested into **Campus Placement Hub / Placement Vault**, including upstream origins, snapshot dates, licensing analysis, and legal compliance boundaries.

---

## 1. Company-Wise Problem Frequency Dataset

- **Upstream Repository:** [`liquidslr/leetcode-company-wise-problems`](https://github.com/liquidslr/leetcode-company-wise-problems)
- **Snapshot Date:** `June 1, 2025` (per upstream documentation: *"Curated lists of Leetcode questions group by companies, updated as of 1 June 2025"*)
- **Ingestion Script:** [`scripts/import-leetcode-company-wise.ts`](file:///scripts/import-leetcode-company-wise.ts)
- **Database Models:** [`Problem`](file:///prisma/schema.prisma#L45-L62), [`CompanyProblem`](file:///prisma/schema.prisma#L64-L79)

### License & Intellectual Property Analysis

1. **Upstream Repository License:**
   - The upstream repository does not declare an open-source license file (default copyright / unlicensed under GitHub Terms of Service).
2. **LeetCode Proprietary Rights:**
   - LeetCode's Terms of Service strictly prohibit republishing or scraping proprietary problem statements, test cases, and official editorial solutions.
3. **Placement Vault Legal Safeguards:**
   - **Metadata Only:** Placement Vault stores exclusively non-copyrightable metadata:
     - Problem Title (e.g., *"Two Sum"*, *"LRU Cache"*)
     - External Slug & Canonical URL (`https://leetcode.com/problems/...`)
     - Standard Difficulty Tier (`Easy` | `Medium` | `Hard`)
     - Categorical Algorithmic Topics (`["Array", "Hash Table"]`)
     - Statistical Company Frequency Score (float)
     - Aggregation Time Window (`30D` | `90D` | `6M` | `ALL`)
   - **No Problem Statements:** Zero problem descriptions, sample I/O, hints, or test suites are scraped, stored, or served.
   - **Canonical Linking:** All problem cards link out directly to the official problem on LeetCode.

### UI Attribution & Transparency Requirement

- **Mandatory Attribution Label:**
  Any view rendering company-problem frequency tables must display:
  > *"LeetCode company-tag frequency, snapshot June 1, 2025 · Source: [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems)"*
- **Strict Disambiguation:**
  - This dataset is **never** presented as confirmed Online Assessment (OA) questions.
  - This dataset is **never** represented as Class of 2027 / 2026-27 hiring season data.
  - Verified student submissions from the 2026-27 season are isolated in the `OaReport` and `OAQuestion` models, visibly highlighted with a `"Latest (2026-27)"` badge, and prioritized in all searches and company hubs.

---

## 2. Company Directory & Alias Mapping

- **Seed Directory:** Initial company profiles seeded from verified recruiter lists and canonical college placement records.
- **Alias Normalization:** Automated mapping rules maintained in [`src/lib/company-utils.ts`](file:///src/lib/company-utils.ts) to merge legal corporate names, regional subsidiaries, and student colloquialisms (e.g., *"Tata Consultancy Services"* $\rightarrow$ *"TCS"*, *"Amazon India Development Centre"* $\rightarrow$ *"Amazon"*).
- **PostgreSQL Trigram Search:** Uses `pg_trgm` extension on `Company.normalizedName` and `Company.name` to prevent duplicate submissions by students.

---

## 3. Student Submissions & Moderation

- **User Generated Content (UGC):** Reports and interview experiences submitted by verified students.
- **Copyright & Non-Disclosure Notice:** Students are prompted with a mandatory confirmation acknowledging that they must describe questions in their own words and must not submit NDA-protected proprietary exam code or direct screenshots.
- **Takedown & Embargo Policies:** Detailed in [`docs/TERMS.md`](file:///docs/TERMS.md) and [`docs/LEGAL.md`](file:///docs/LEGAL.md). Active campus placement drives remain under hard cryptographic embargo until the drive closes.
