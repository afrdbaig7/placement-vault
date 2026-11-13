import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://placementvault.edu";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/companies", "/problems", "/drives", "/companies/*"],
        disallow: ["/api/", "/mod", "/wallet", "/profile"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

