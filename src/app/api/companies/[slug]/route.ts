import { db } from "@/lib/db";
import { fail, ok, ApiError } from "@/lib/auth";
import { companySlugSchema, safeParseTopics } from "@/lib/validation";

/**
 * Company hub data: static company info merged with DB aggregates.
 * Topic frequencies are computed from APPROVED reports and experiences.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await params;
    const parsedSlug = companySlugSchema.safeParse(rawSlug);
    if (!parsedSlug.success) throw new ApiError(404, "Company not found");
    const slug = parsedSlug.data;

    const companies = (await import("@/data/companies.json")).default;
    const company = companies.find((c) => (c as { slug: string }).slug === slug);
    if (!company) throw new ApiError(404, "Company not found");

    const [drives, approvedReports, approvedExperiences, doubts] = await Promise.all([
      db.drive.findMany({
        where: { company: slug },
        orderBy: { driveDate: "desc" },
        include: { _count: { select: { reports: true } } },
      }),
      db.oaReport.findMany({
        where: { status: "APPROVED", drive: { company: slug, status: "CLOSED" } },
        select: { topics: true, difficulty: true, platform: true, round: true },
      }),
      db.experience.findMany({
        where: { company: slug, status: "APPROVED" },
        select: { topics: true, difficulty: true },
      }),
      db.doubt.findMany({ where: { company: slug }, select: { id: true } }),
    ]);

    const freq = new Map<string, number>();
    for (const r of [...approvedReports, ...approvedExperiences]) {
      for (const t of safeParseTopics(r.topics)) {
        freq.set(t, (freq.get(t) ?? 0) + 1);
      }
    }
    const topicFreq = [...freq.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const platforms = [...new Set(approvedReports.map((r) => r.platform))];
    const difficultyDist = { Easy: 0, Medium: 0, Hard: 0 } as Record<string, number>;
    for (const r of approvedReports) {
      difficultyDist[r.difficulty] = (difficultyDist[r.difficulty] ?? 0) + 1;
    }
    const rounds = [...new Set(approvedReports.map((r) => r.round))];

    return ok({
      company,
      drives: drives.map((d) => ({
        id: d.id,
        role: d.role,
        driveDate: d.driveDate,
        status: d.status,
        branches: d.branches,
        minCgpa: d.minCgpa,
        notes: d.notes,
        reportCount: d._count.reports,
      })),
      aggregates: {
        approvedReports: approvedReports.length,
        approvedExperiences: approvedExperiences.length,
        doubts: doubts.length,
        platforms,
        rounds,
        difficultyDist,
        topicFreq,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
