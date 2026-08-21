import type { MetadataRoute } from "next";

/**
 * Generated rather than static, because the `Sitemap:` directive must be an
 * absolute URL, a relative one is invalid per the robots spec and silently
 * ignored by crawlers. Only the deploy knows its own origin, so this reads it
 * from the environment at build time.
 *
 * Everything a crawler can reach is allowed. The per-user screens used to be
 * listed here as `Disallow`, which Search Console reported as an error on
 * every one of them - "Crawl allowed? No: blocked by robots.txt" - and which
 * did not even do the job: a URL Google may not fetch is a URL whose noindex
 * Google cannot read, so those pages stayed eligible to be listed as bare
 * links. They are turned away at the page instead, with `X-Robots-Tag`. See
 * src/lib/private-routes.ts.
 *
 * `/api/` is the one exception. It is the rewrite proxy to FastAPI: JSON and
 * audio, nothing a crawler should spend a fetch on, and nothing that would
 * carry a meta tag if it did.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
