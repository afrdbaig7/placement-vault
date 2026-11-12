import { db } from "@/lib/db";
import { fail, ok, ApiError } from "@/lib/auth";
import { companySlugSchema } from "@/lib/validation";

/**
 * GET /api/problems?company=amazon&window=6M&difficulty=Medium&topic=Array&search=sum&cursor=...&limit=25
 * Cursor-paginated problem frequency data with upstream attribution.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawCompany = url.searchParams.get("company");
    const rawWindow = url.searchParams.get("window");
    const rawDifficulty = url.searchParams.get("difficulty");
    const topic = url.searchParams.get("topic")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const cursor = url.searchParams.get("cursor")?.trim();
    const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "25", 10);
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 25 : rawLimit, 1), 100);

    let companySlug: string | undefined;
    if (rawCompany) {
      const parsed = companySlugSchema.safeParse(rawCompany);
      if (!parsed.success) throw new ApiError(400, "Invalid company slug");
      companySlug = parsed.data;
    }

    const window = ["30D", "90D", "6M", "OLDER", "ALL"].includes(rawWindow ?? "")
      ? rawWindow!
      : undefined;

    const difficulty = ["Easy", "Medium", "Hard"].includes(rawDifficulty ?? "")
      ? rawDifficulty!
      : undefined;

    const attribution = {
      source: "leetcode-company-wise",
      sourceUrl: "https://github.com/liquidslr/leetcode-company-wise-problems",
      snapshotDate: "2025-06-01",
      label: "LeetCode company-tag frequency, snapshot June 1, 2025 (Source: liquidslr/leetcode-company-wise-problems)",
      disclaimer: "Historical frequency metadata only. Not confirmed OA questions or Class of 2027 live submissions.",
    };

    if (companySlug) {
      const company = await db.company.findUnique({
        where: { slug: companySlug },
        select: { id: true, name: true, slug: true },
      });
      if (!company) throw new ApiError(404, "Company not found");

      const whereClause = {
        companyId: company.id,
        ...(window ? { window } : {}),
        problem: {
          ...(difficulty ? { difficulty } : {}),
          ...(topic ? { topics: { has: topic } } : {}),
          ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
        },
      };

      const [items, totalCount] = await Promise.all([
        db.companyProblem.findMany({
          where: whereClause,
          orderBy: [{ frequency: "desc" }, { id: "asc" }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            problem: true,
          },
        }),
        db.companyProblem.count({ where: whereClause }),
      ]);

      const hasMore = items.length > limit;
      const paginated = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? paginated[paginated.length - 1]?.id ?? null : null;

      return ok({
        company,
        items: paginated.map((cp) => ({
          id: cp.id,
          problemId: cp.problem.id,
          title: cp.problem.title,
          slug: cp.problem.externalSlug ?? cp.problem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          difficulty: cp.problem.difficulty,
          window: cp.window,
          frequency: cp.frequency,
          topics: cp.problem.topics,
          url: cp.problem.url,
          sourceName: cp.sourceName,
          sourceSnapshotDate: cp.sourceSnapshotDate,
        })),
        nextCursor,
        totalCount,
        attribution,
      });
    }

    // Global problem library query
    const problemWhere = {
      ...(difficulty ? { difficulty } : {}),
      ...(topic ? { topics: { has: topic } } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [problems, totalCount] = await Promise.all([
      db.problem.findMany({
        where: problemWhere,
        orderBy: { id: "asc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      db.problem.count({ where: problemWhere }),
    ]);

    const hasMore = problems.length > limit;
    const paginated = hasMore ? problems.slice(0, limit) : problems;
    const nextCursor = hasMore ? paginated[paginated.length - 1]?.id ?? null : null;

    return ok({
      items: paginated.map((p) => ({
        id: p.id,
        problemId: p.id,
        title: p.title,
        slug: p.externalSlug ?? p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        difficulty: p.difficulty,
        topics: p.topics,
        url: p.url,
      })),
      nextCursor,
      totalCount,
      attribution,
    });
  } catch (err) {
    return fail(err);
  }
}
