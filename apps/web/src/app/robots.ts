import type { MetadataRoute } from "next";

/**
 * Generated rather than static, because the `Sitemap:` directive must be an
 * absolute URL, a relative one is invalid per the robots spec and silently
 * ignored by crawlers. Only the deploy knows its own origin, so this reads it
 * from the environment at build time.
 *
 * The disallowed paths are the signed-in surfaces: they render a specific
 * person's recordings and coaching, have no value in an index, and would waste
 * crawl budget on pages that are empty without local data.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/guides",
          "/guides/",
          "/onboarding",
          "/contact",
          "/privacy",
          "/terms",
          "/welcome",
        ],
        disallow: [
          "/today",
          "/sessions/",
          "/library",
          "/coach",
          "/trainer",
          "/practice",
          "/listen",
          "/record",
          "/dashboard",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
