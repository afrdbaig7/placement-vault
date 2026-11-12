import { db } from "@/lib/db";
import { fail, ok, ApiError } from "@/lib/auth";
import { companySlugSchema, safeParseTopics } from "@/lib/validation";
import companiesSeed from "@/data/companies.json";

/**
 * Company hub data: database backed company info merged with DB aggregates.
 * Topic frequencies are computed from APPROVED reports and experiences.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await params;
    const parsedSlug = companySlugSchema.safeParse(rawSlug);
    if (!parsedSlug.success) throw new ApiError(404, "Company not found");
    const slug = parsedSlug.data;

    const companyDb = await db.company.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { companyProblems: true },
        },
      },
    });
    if (!companyDb) throw new ApiError(404, "Company not found");

    const seed = (companiesSeed as Array<Record<string, unknown>>).find((c) => c.slug === slug) ?? {};

    const [drives, approvedReports, approvedExperiences, doubts, companyProblems] = await Promise.all([
      db.drive.findMany({
        where: { OR: [{ companyId: companyDb.id }, { company: slug }] },
        orderBy: { driveDate: "desc" },
        include: { _count: { select: { reports: true } } },
      }),
      db.oaReport.findMany({
        where: {
          companyId: companyDb.id,
          status: "APPROVED",
          OR: [{ drive: null }, { drive: { status: "CLOSED" } }],
        },
        select: {
          id: true,
          topics: true,
          difficulty: true,
          platform: true,
          round: true,
          hiringSeason: true,
          graduatingBatch: true,
          assessmentDate: true,
        },
      }),
      db.experience.findMany({
        where: {
          companyId: companyDb.id,
          status: "APPROVED",
        },
        select: {
          id: true,
          topics: true,
          difficulty: true,
          hiringSeason: true,
          graduatingBatch: true,
          offerStatus: true,
        },
      }),
      db.doubt.findMany({ where: { company: slug }, select: { id: true } }),
      db.companyProblem.findMany({
        where: { companyId: companyDb.id },
        include: { problem: true },
        orderBy: [{ frequency: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
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

    // Seasonal breakdown (2026-27 vs previous)
    const season2026Reports = approvedReports.filter((r) => r.hiringSeason === "2026-27").length;
    const season2026Experiences = approvedExperiences.filter((e) => e.hiringSeason === "2026-27").length;

    const company = {
      id: companyDb.id,
      slug: companyDb.slug,
      name: companyDb.name,
      aliases: companyDb.aliases,
      website: companyDb.website,
      logoUrl: companyDb.logoUrl,
      sectors: companyDb.sectors,
      hiringRoles: companyDb.hiringRoles,
      status: companyDb.status,
      color: (seed.color as string) ?? "#2563eb",
      type: (seed.type as string) ?? "product",
      region: (seed.region as string) ?? "Global",
      tier: (seed.tier as string) ?? "Product",
      tagline: (seed.tagline as string) ?? (companyDb.website ?? `${companyDb.name} Hiring Hub`),
      typicalRoles: (seed.typicalRoles as string[]) ?? companyDb.hiringRoles,
      rounds: (seed.rounds as { name: string; details: string }[]) ?? [
        { name: "Round 1", details: "Online Assessment" },
        { name: "Round 2", details: "Technical Interview" },
        { name: "Round 3", details: "HR / Fitment" },
      ],
      oaPattern: (seed.oaPattern as { platform: string; duration: string; questions: string; note: string }) ?? {
        platform: platforms[0] ?? "Online Assessment Platform",
        duration: "60-90 min",
        questions: "2 Coding + Aptitude / MCQs",
        note: "Negative marking on MCQs where applicable",
      },
      topicsFocus: (seed.topicsFocus as string[]) ?? topicFreq.slice(0, 5).map((t) => t.topic),
    };

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
        season2026Reports,
        season2026Experiences,
        platforms,
        rounds,
        difficultyDist,
        topicFreq,
        problemCount: companyProblems.length,
      },
      problems: companyProblems.map((cp) => ({
        id: cp.problem.id,
        title: cp.problem.title,
        slug: cp.problem.externalSlug ?? cp.problem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        difficulty: cp.problem.difficulty,
        window: cp.window,
        frequency: cp.frequency,
        url: cp.problem.url,
        topics: cp.problem.topics,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
