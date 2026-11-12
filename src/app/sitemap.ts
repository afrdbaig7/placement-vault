import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://placementvault.edu";
  const now = new Date();

  // Core static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/companies`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/problems`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contribute`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/drives`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    // Dynamic verified company routes
    const companies = await db.company.findMany({
      where: { status: "VERIFIED" },
      select: { slug: true, updatedAt: true },
    });

    const companyRoutes: MetadataRoute.Sitemap = companies.flatMap((c) => [
      {
        url: `${baseUrl}/companies/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${baseUrl}/companies/${c.slug}/oa-2026-27`,
        lastModified: c.updatedAt,
        changeFrequency: "daily",
        priority: 0.9,
      },
    ]);

    return [...staticRoutes, ...companyRoutes];
  } catch {
    // Graceful fallback during static build if DB is uninitialized
    return staticRoutes;
  }
}
