import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";

/**
 * Only the public, indexable surfaces belong here. The app's own screens
 * (/today, /trainer, /sessions/…) are per-user and excluded in robots.ts;
 * listing them in a sitemap while disallowing them sends crawlers a
 * contradiction and costs ranking signal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...GUIDES.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.updated),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/onboarding`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
