import { db } from "@/lib/db";
import { fail, ok, ApiError } from "@/lib/auth";
import { normalizeCompanyName, stringSimilarity } from "@/lib/company-utils";

/**
 * GET /api/companies/search?q=...
 * Fuzzy searches companies to prevent duplicate creation.
 * Returns suggestions with "Did you mean...?" warning if similar company exists.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return ok({ query: q, matches: [], exactMatch: false, warning: null });
    }

    const normQuery = normalizeCompanyName(q);

    const companies = await db.company.findMany({
      where: {
        status: { in: ["VERIFIED", "PENDING"] },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        normalizedName: true,
        aliases: true,
        status: true,
        sectors: true,
      },
    });

    const scored = companies.map((c) => {
      // 1. Exact match on normalized or slug
      if (c.normalizedName === normQuery || c.slug === normQuery) {
        return { company: c, similarity: 1.0, matchedOn: "exact" };
      }

      // 2. Exact match in aliases
      const aliasMatch = c.aliases.find((a) => normalizeCompanyName(a) === normQuery);
      if (aliasMatch) {
        return { company: c, similarity: 0.95, matchedOn: `alias: ${aliasMatch}` };
      }

      // 3. Substring containment
      if (c.normalizedName.includes(normQuery) || normQuery.includes(c.normalizedName)) {
        return { company: c, similarity: 0.85, matchedOn: "substring" };
      }

      // 4. Trigram similarity
      const nameSim = stringSimilarity(normQuery, c.normalizedName);
      let maxAliasSim = 0;
      for (const a of c.aliases) {
        const asim = stringSimilarity(normQuery, normalizeCompanyName(a));
        if (asim > maxAliasSim) maxAliasSim = asim;
      }
      const similarity = Math.max(nameSim, maxAliasSim);
      return { company: c, similarity, matchedOn: "fuzzy" };
    });

    const filtered = scored
      .filter((s) => s.similarity >= 0.4)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8);

    const topMatch = filtered[0];
    const exactMatch = topMatch ? topMatch.similarity >= 0.95 : false;

    let warning: string | null = null;
    if (topMatch && topMatch.similarity >= 0.6) {
      warning = `Did you mean "${topMatch.company.name}"? This company is already ${
        topMatch.company.status === "VERIFIED" ? "listed" : "pending review"
      }. Please select it instead of creating a duplicate.`;
    }

    return ok({
      query: q,
      matches: filtered.map((f) => ({
        id: f.company.id,
        slug: f.company.slug,
        name: f.company.name,
        status: f.company.status,
        sectors: f.company.sectors,
        similarity: Math.round(f.similarity * 100) / 100,
        matchedOn: f.matchedOn,
      })),
      exactMatch,
      warning,
    });
  } catch (err) {
    return fail(err);
  }
}

