import { db } from "@/lib/db";
import { fail, ok } from "@/lib/auth";
import companiesSeed from "@/data/companies.json";

/** Companies grid: database backed with aggregated problem, report, experience, doubt counts. */
export async function GET() {
  try {
    const [companies, reportGroups, expGroups, doubtGroups, openDrives] = await Promise.all([
      db.company.findMany({
        where: { status: "VERIFIED" },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              companyProblems: true,
              oaReports: { where: { status: "APPROVED" } },
              experiences: { where: { status: "APPROVED" } },
              doubts: true,
            },
          },
        },
      }),
      db.oaReport.groupBy({
        by: ["companyId"],
        where: { status: "APPROVED" },
        _count: { _all: true },
      }),
      db.experience.groupBy({
        by: ["companyId"],
        where: { status: "APPROVED" },
        _count: { _all: true },
      }),
      db.doubt.groupBy({
        by: ["company"],
        _count: { _all: true },
      }),
      db.drive.findMany({
        where: { status: "OPEN" },
        orderBy: { driveDate: "asc" },
      }),
    ]);

    const seedMap = new Map((companiesSeed as Array<Record<string, unknown>>).map((c) => [c.slug, c]));
    const reportCounts = new Map<string, number>(reportGroups.map((g) => [g.companyId, g._count._all]));
    const expCounts = new Map<string, number>(expGroups.map((g) => [g.companyId, g._count._all]));
    const doubtCounts = new Map<string, number>(doubtGroups.map((g) => [g.company, g._count._all]));

    const result = companies.map((c) => {
      const seed = seedMap.get(c.slug) ?? {};
      const nextDrive = openDrives.find((d) => d.companyId === c.id || d.company === c.slug);
      const repCount = reportCounts.get(c.id) ?? c._count.oaReports;
      const expCount = expCounts.get(c.id) ?? c._count.experiences;
      const doubtCount = doubtCounts.get(c.slug) ?? c._count.doubts;

      const sectors = c.sectors ?? [];
      const isService = sectors.some((s) => s.toLowerCase().includes("service"));
      const isFintech = sectors.some((s) => s.toLowerCase().includes("fintech"));
      const isFinance = sectors.some((s) => s.toLowerCase().includes("finance") || s.toLowerCase().includes("banking"));

      let tier = (seed.tier as string) || (isFintech ? "Fintech" : isFinance ? "Finance" : isService ? "Service" : "Product");
      if (["google", "amazon", "microsoft", "meta", "apple"].includes(c.slug)) {
        tier = "FAANG";
      }

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        aliases: c.aliases,
        website: c.website,
        logoUrl: c.logoUrl,
        sectors: c.sectors,
        hiringRoles: c.hiringRoles,
        status: c.status,
        createdAt: c.createdAt,
        // UI card presentation helpers (fallback to seed or infer from DB):
        color: (seed.color as string) ?? "#2563eb",
        type: (seed.type as string) ?? (isService ? "service" : "product"),
        region: (seed.region as string) ?? (c.aliases.some((a) => a.toLowerCase().includes("india")) ? "Indian" : "Global"),
        tier,
        tagline: (seed.tagline as string) ?? (c.website ?? `${c.name} Hiring Hub`),
        topicsFocus: (seed.topicsFocus as string[]) ?? c.sectors,
        problemCount: c._count.companyProblems,
        windowLabel: "last 6 months",
        reportCount: repCount,
        experienceCount: expCount,
        doubtCount: doubtCount,
        nextDrive: nextDrive
          ? { role: nextDrive.role, driveDate: nextDrive.driveDate.toISOString() }
          : null,
      };
    });

    return ok({ companies: result });
  } catch (err) {
    return fail(err);
  }
}
