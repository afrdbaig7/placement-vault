import { db } from "@/lib/db";
import { fail, ok } from "@/lib/auth";

/** Companies grid: static info merged with per-company DB counts and problem-set metadata. */
export async function GET() {
  try {
    const [companies, problemsData] = await Promise.all([
      import("@/data/companies.json").then((m) => m.default),
      import("@/data/problems.json").then((m) => m.default),
    ]);

    const [reportGroups, expGroups, doubtGroups, openDrives] = await Promise.all([
      db.oaReport.groupBy({
        by: ["driveId"],
        where: { status: "APPROVED", drive: { status: "CLOSED" } },
        _count: { _all: true },
      }),
      db.experience.groupBy({ by: ["company"], where: { status: "APPROVED" }, _count: { _all: true } }),
      db.doubt.groupBy({ by: ["company"], _count: { _all: true } }),
      db.drive.findMany({ where: { status: "OPEN" }, orderBy: { driveDate: "asc" } }),
    ]);

    const driveIds = reportGroups.map((r) => r.driveId);
    const driveCompanies = driveIds.length
      ? await db.drive.findMany({
          where: { id: { in: driveIds } },
          select: { id: true, company: true },
        })
      : [];
    const driveToCompany = new Map<string, string>(driveCompanies.map((d) => [d.id, d.company]));

    const reportCounts = new Map<string, number>();
    for (const g of reportGroups) {
      const c = driveToCompany.get(g.driveId);
      if (c) reportCounts.set(c, (reportCounts.get(c) ?? 0) + g._count._all);
    }
    const expCounts = new Map<string, number>(expGroups.map((g) => [g.company, g._count._all]));
    const doubtCounts = new Map<string, number>(doubtGroups.map((g) => [g.company, g._count._all]));

    return ok({
      companies: companies.map((c) => {
        const nextDrive = openDrives.find((d) => d.company === c.slug);
        const problems = problemsData[c.slug as keyof typeof problemsData] ?? [];
        const windowLabel = problems.some((p) => p.window === "6mo")
          ? "last 6 months"
          : problems.some((p) => p.window === "1yr")
            ? "last 12 months"
            : "all time";
        return {
          ...c,
          problemCount: problems.length,
          windowLabel,
          reportCount: reportCounts.get(c.slug) ?? 0,
          experienceCount: expCounts.get(c.slug) ?? 0,
          doubtCount: doubtCounts.get(c.slug) ?? 0,
          nextDrive: nextDrive
            ? { role: nextDrive.role, driveDate: nextDrive.driveDate }
            : null,
        };
      }),
    });
  } catch (err) {
    return fail(err);
  }
}
