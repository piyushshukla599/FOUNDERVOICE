/**
 * Submits every indexable URL to IndexNow.
 *
 * Why this exists: a three-day-old domain with no inbound links gets crawled
 * on the schedule a search engine assigns to a site nothing points at, which
 * is slow. IndexNow inverts that - the site tells the engine a URL changed and
 * the engine fetches it, usually within hours instead of days.
 *
 * It reaches Bing, Yandex, Seznam and Naver, which share one submission
 * endpoint. Google is not an IndexNow participant and ignores it; for Google
 * the equivalent lever is the sitemap plus URL Inspection in Search Console.
 * This is worth running anyway: Bing indexation is what ChatGPT search and
 * Copilot read, so it is the fastest route to being cited by an assistant even
 * before Google has finished making up its mind.
 *
 * Run after a deploy:
 *   node scripts/indexnow.mjs
 *   node scripts/indexnow.mjs --dry-run     # print the payload, submit nothing
 *
 * The key file must be reachable at https://<host>/<key>.txt and contain the
 * key and nothing else - that is how the endpoint verifies you own the host.
 * It lives in public/, so it ships with the build.
 */

const KEY = process.env.INDEXNOW_KEY || "8710991534ac94dc9565c2a0fe6f8185";
const HOST = (process.env.NEXT_PUBLIC_SITE_URL || "https://foundervoice.app").replace(/\/+$/, "");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const dryRun = process.argv.includes("--dry-run");

/**
 * The URL list comes from the deployed sitemap rather than from a second list
 * maintained here. Two lists disagree the first time a page is added, and the
 * one that would be wrong is this one.
 */
async function urlsFromSitemap() {
  const res = await fetch(`${HOST}/sitemap.xml`, { headers: { "User-Agent": "foundervoice-indexnow" } });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) throw new Error("sitemap contained no <loc> entries");
  return urls;
}

async function main() {
  const host = new URL(HOST).host;
  const urlList = await urlsFromSitemap();

  // Every submitted URL has to be on the host the key belongs to, or the whole
  // batch is rejected rather than filtered.
  const offHost = urlList.filter((u) => new URL(u).host !== host);
  if (offHost.length) throw new Error(`sitemap contains off-host URLs: ${offHost.join(", ")}`);

  const payload = { host, key: KEY, keyLocation: `${HOST}/${KEY}.txt`, urlList };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    console.log(`\n${urlList.length} URLs would be submitted to ${ENDPOINT}`);
    return;
  }

  // Verify the key is actually being served before submitting; a 404 here is
  // the single most common reason a submission is silently ignored.
  const keyRes = await fetch(payload.keyLocation);
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : "";
  if (keyBody !== KEY) {
    throw new Error(
      `key file at ${payload.keyLocation} did not return the key ` +
        `(status ${keyRes.status}). Deploy public/${KEY}.txt first.`,
    );
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // 200 and 202 both mean accepted; 202 means the key is still being verified.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow returned ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  console.log(`Submitted ${urlList.length} URLs to IndexNow (${res.status}).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
