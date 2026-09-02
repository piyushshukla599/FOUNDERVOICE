/**
 * The app's signed-in surfaces. They render one person's recordings and
 * coaching, are blank without that person's local data, and carry nothing an
 * index should hold.
 *
 * They are kept out of search with `X-Robots-Tag: noindex` (wired up in
 * next.config.ts), *not* with `Disallow` in robots.txt, and the difference is
 * the reason this list exists in one place. A disallowed URL is never fetched,
 * so Googlebot never reads a noindex on it; Search Console then reports the
 * page as a hard error - "Crawl allowed? No: blocked by robots.txt" - while
 * Google stays free to list the bare URL anyway if it finds a link to it.
 * Letting the crawler in and turning it away at the page is what actually
 * keeps these out of results, and it turns that red error into the honest
 * "Indexing allowed? No: 'noindex' detected".
 *
 * Prefixes, not exact paths: `/sessions` has to cover `/sessions/<id>`.
 */
export const PRIVATE_ROUTES = [
  "/today",
  "/sessions",
  "/library",
  "/coach",
  "/trainer",
  "/practice",
  "/listen",
  "/record",
  "/talk",
  "/dashboard",
] as const;
