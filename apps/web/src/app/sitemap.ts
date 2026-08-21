import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";

/**
 * Only the public, indexable surfaces belong here. The app's own screens
 * (/today, /trainer, /sessions/…) are per-user, carry `X-Robots-Tag: noindex`
 * from next.config.ts, and listing them here while telling Google not to index
 * them sends a contradiction that costs ranking signal.
 *
 * `lastmod` is a real edit date, not `new Date()`. Stamping build time made
 * every deploy claim that all six static pages had changed, which is exactly
 * the pattern that teaches a crawler to ignore the field. Update the constant
 * below when the page's content actually changes; guides carry their own.
 *
 * URLs are written to match the canonical tag byte for byte, trailing slash
 * included. A sitemap that disagrees with the canonical nominates two URLs for
 * one page and makes Google pick.
 */

/** Bump when the static marketing pages are meaningfully edited. */
const STATIC_UPDATED = {
  home: "2026-08-21",
  guidesIndex: "2026-08-21",
  onboarding: "2026-08-21",
  contact: "2026-08-21",
  privacy: "2026-06-01",
  terms: "2026-06-01",
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    {
      url: base,
      lastModified: new Date(STATIC_UPDATED.home),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/guides`,
      lastModified: new Date(STATIC_UPDATED.guidesIndex),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...GUIDES.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.updated),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${base}/onboarding`,
      lastModified: new Date(STATIC_UPDATED.onboarding),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/contact`,
      lastModified: new Date(STATIC_UPDATED.contact),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(STATIC_UPDATED.privacy),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date(STATIC_UPDATED.terms),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
