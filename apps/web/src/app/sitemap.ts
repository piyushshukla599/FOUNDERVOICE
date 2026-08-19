import type { MetadataRoute } from "next";

/**
 * Only the public, indexable surfaces belong here. The app's own screens
 * (/coach, /trainer, /sessions/…) are per-user and excluded in robots.ts —
 * listing them in a sitemap while disallowing them sends crawlers a
 * contradiction and costs ranking signal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/onboarding`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}
