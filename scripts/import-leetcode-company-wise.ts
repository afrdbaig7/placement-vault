import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  FOLDER_NAME_MAP,
  isCampusRelevant,
  normalizeCompanyName,
  KNOWN_COMPANY_ALIASES,
} from "../src/lib/company-utils";

const prisma = new PrismaClient();

const SNAPSHOT_DATE = new Date("2025-06-01");
const SOURCE_NAME = "leetcode-company-wise";

const WINDOW_FILE_MAP: Record<string, string> = {
  "1. Thirty Days.csv": "30D",
  "2. Three Months.csv": "90D",
  "3. Six Months.csv": "6M",
  "4. More Than Six Months.csv": "OLDER",
  "5. All.csv": "ALL",
};

interface ParsedRow {
  difficulty: "Easy" | "Medium" | "Hard";
  title: string;
  frequency: number;
  link: string;
  externalSlug: string;
  topics: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeDifficulty(raw: string): "Easy" | "Medium" | "Hard" {
  const upper = raw.toUpperCase().trim();
  if (upper === "EASY") return "Easy";
  if (upper === "HARD") return "Hard";
  return "Medium";
}

function extractSlug(link: string, title: string): string {
  try {
    if (link && link.includes("/problems/")) {
      const parts = link.split("/problems/")[1]?.split("/").filter(Boolean);
      if (parts && parts[0]) {
        return parts[0].toLowerCase().trim();
      }
    }
  } catch {
    // fallback
  }
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsvFile(filePath: string): ParsedRow[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Header: Difficulty,Title,Frequency,Acceptance Rate,Link,Topics
  const header = parseCsvLine(lines[0]);
  const diffIdx = header.findIndex((h) => /difficulty/i.test(h));
  const titleIdx = header.findIndex((h) => /title/i.test(h));
  const freqIdx = header.findIndex((h) => /frequency/i.test(h));
  const linkIdx = header.findIndex((h) => /link|url/i.test(h));
  const topicsIdx = header.findIndex((h) => /topic/i.test(h));

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 3) continue;

    const rawDiff = diffIdx !== -1 ? cols[diffIdx] : cols[0];
    const rawTitle = titleIdx !== -1 ? cols[titleIdx] : cols[1];
    const rawFreq = freqIdx !== -1 ? cols[freqIdx] : cols[2];
    const rawLink = linkIdx !== -1 ? cols[linkIdx] : cols[4] ?? "";
    const rawTopics = topicsIdx !== -1 ? cols[topicsIdx] : cols[5] ?? "";

    if (!rawTitle || rawTitle.trim().length === 0) continue;

    const title = rawTitle.trim();
    const difficulty = normalizeDifficulty(rawDiff);
    const frequency = Number.parseFloat(rawFreq) || 1.0;
    const link = rawLink.trim();
    const externalSlug = extractSlug(link, title);
    const topics = rawTopics
      ? rawTopics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    rows.push({
      difficulty,
      title,
      frequency,
      link,
      externalSlug,
      topics,
    });
  }

  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const campusOnly = args.includes("--campus-only");
  const limitArgIdx = args.indexOf("--limit");
  const limit = limitArgIdx !== -1 ? Number.parseInt(args[limitArgIdx + 1], 10) : undefined;
  const dirArgIdx = args.indexOf("--data-dir");
  const dataDir =
    dirArgIdx !== -1
      ? args[dirArgIdx + 1]
      : path.resolve(process.cwd(), "data-sources", "leetcode-company-wise-problems");

  console.log(`[LeetCode Import] Starting import script...`);
  console.log(`  Data directory: ${dataDir}`);
  console.log(`  Dry run: ${isDryRun}`);
  console.log(`  Campus relevant only: ${campusOnly}`);
  if (limit) console.log(`  Limit: ${limit} companies`);

  if (!fs.existsSync(dataDir)) {
    console.error(`Error: Data directory not found at ${dataDir}`);
    process.exit(1);
  }

  const reportsDir = path.resolve(process.cwd(), "docs", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const unmatchedLogPath = path.join(reportsDir, "leetcode-import-unmatched.log");
  const unmatchedLogs: string[] = [];

  const folderEntries = fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."));

  console.log(`[LeetCode Import] Found ${folderEntries.length} company folders.`);

  // Prioritize campus relevant
  const selectedFolders = folderEntries.filter((f) => {
    if (!campusOnly) return true;
    const mapped = FOLDER_NAME_MAP[f.name];
    if (mapped && isCampusRelevant(mapped.slug)) return true;
    const norm = normalizeCompanyName(f.name);
    return isCampusRelevant(norm);
  });

  const targetFolders = limit ? selectedFolders.slice(0, limit) : selectedFolders;
  console.log(`[LeetCode Import] Processing ${targetFolders.length} folders...`);

  let totalCompaniesUpserted = 0;
  let totalProblemsUpserted = 0;
  let totalCompanyProblemsUpserted = 0;

  for (const folder of targetFolders) {
    const folderName = folder.name;
    const folderPath = path.join(dataDir, folderName);

    // 1. Resolve company
    let slug: string;
    let name: string;
    const mapped = FOLDER_NAME_MAP[folderName];

    if (mapped) {
      slug = mapped.slug;
      name = mapped.name;
    } else {
      const norm = normalizeCompanyName(folderName);
      slug = folderName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      name = folderName;

      // Check if norm is ambiguous
      if (norm.length <= 2) {
        unmatchedLogs.push(`[AMBIGUOUS_NAME] Folder: "${folderName}", Normalized: "${norm}"`);
      }
    }

    const normName = normalizeCompanyName(name);
    const isCampus = isCampusRelevant(slug) || isCampusRelevant(normName);

    // Read all window CSVs
    const windowFiles = Object.entries(WINDOW_FILE_MAP);
    const problemMap = new Map<string, { row: ParsedRow; window: string }>();

    for (const [fileName, windowCode] of windowFiles) {
      const csvPath = path.join(folderPath, fileName);
      if (fs.existsSync(csvPath)) {
        const rows = parseCsvFile(csvPath);
        for (const row of rows) {
          const key = `${row.externalSlug}_${windowCode}`;
          problemMap.set(key, { row, window: windowCode });
        }
      }
    }

    if (problemMap.size === 0) {
      unmatchedLogs.push(`[NO_PROBLEMS] Folder "${folderName}" has no parseable CSV data.`);
      continue;
    }

    if (isDryRun) {
      console.log(`  [DRY-RUN] Company "${name}" (${slug}): ${problemMap.size} problem mappings.`);
      totalCompaniesUpserted++;
      totalCompanyProblemsUpserted += problemMap.size;
      continue;
    }

    // Upsert Company
    const aliases = KNOWN_COMPANY_ALIASES[slug] ?? [];
    const company = await prisma.company.upsert({
      where: { slug },
      update: {
        name,
        normalizedName: normName,
        aliases: { set: aliases },
        status: "VERIFIED",
      },
      create: {
        slug,
        name,
        normalizedName: normName,
        aliases,
        sectors: isCampus ? ["Campus Recruiter"] : ["Technology"],
        hiringRoles: ["Software Engineer", "Intern"],
        status: "VERIFIED",
      },
    });
    totalCompaniesUpserted++;

    // Upsert Problems and CompanyProblems in transaction batches
    const entries = Array.from(problemMap.values());
    const BATCH_SIZE = 50;

    for (let b = 0; b < entries.length; b += BATCH_SIZE) {
      const batch = entries.slice(b, b + BATCH_SIZE);
      await prisma.$transaction(async (tx) => {
        for (const { row, window } of batch) {
          const problem = await tx.problem.upsert({
            where: {
              source_externalSlug: {
                source: "LEETCODE",
                externalSlug: row.externalSlug,
              },
            },
            update: {
              title: row.title,
              difficulty: row.difficulty,
              topics: row.topics,
              url: row.link,
            },
            create: {
              source: "LEETCODE",
              externalSlug: row.externalSlug,
              title: row.title,
              difficulty: row.difficulty,
              topics: row.topics,
              url: row.link,
            },
          });
          totalProblemsUpserted++;

          await tx.companyProblem.upsert({
            where: {
              companyId_problemId_window_sourceName: {
                companyId: company.id,
                problemId: problem.id,
                window,
                sourceName: SOURCE_NAME,
              },
            },
            update: {
              frequency: row.frequency,
              sourceSnapshotDate: SNAPSHOT_DATE,
            },
            create: {
              companyId: company.id,
              problemId: problem.id,
              window,
              frequency: row.frequency,
              sourceName: SOURCE_NAME,
              sourceSnapshotDate: SNAPSHOT_DATE,
            },
          });
          totalCompanyProblemsUpserted++;
        }
      });
    }

    console.log(`  ✓ Synced "${name}" (${slug}) with ${entries.length} window tags.`);
  }

  // Write unmatched logs
  if (unmatchedLogs.length > 0) {
    fs.writeFileSync(unmatchedLogPath, unmatchedLogs.join("\n") + "\n", "utf-8");
    console.log(`[LeetCode Import] Logged ${unmatchedLogs.length} warnings to ${unmatchedLogPath}`);
  }

  console.log("\n==========================================");
  console.log("LeetCode Company-Wise Import Complete!");
  console.log(`  Companies Processed: ${totalCompaniesUpserted}`);
  console.log(`  Problems Upserted:    ${totalProblemsUpserted}`);
  console.log(`  Mappings Upserted:   ${totalCompanyProblemsUpserted}`);
  console.log("==========================================\n");
}

main()
  .catch((err) => {
    console.error("Fatal error during import:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

