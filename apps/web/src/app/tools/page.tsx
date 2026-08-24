import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { OG_IMAGE, ORG_ID, SITE_URL } from "@/lib/schema";
import { FREE_ALLOWANCE, TOOLS } from "@/lib/tools";

const SITE = SITE_URL;

export const metadata: Metadata = {
  title: "Free Speech Analysis Tools",
  description:
    "Measure your own delivery in the browser: a filler word counter, a speaking pace test in words per minute, and AI pitch practice. Free, ten recordings a day, no account.",
  alternates: { canonical: "/tools" },
  keywords: [
    "free speech analysis tool",
    "filler word counter",
    "speaking pace test",
    "ai pitch practice",
    "speech analysis online free",
  ],
  openGraph: {
    type: "website",
    title: "Free Speech Analysis Tools",
    description:
      "A filler word counter, a speaking pace test and AI pitch practice. Free in the browser, no account.",
    url: `${SITE}/tools`,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Speech Analysis Tools",
    images: [OG_IMAGE.url],
  },
};

/**
 * The hub for the commercial pages.
 *
 * It exists for the head term ("free speech analysis tool") and to give the
 * three pages below it a parent that groups them. A cluster with no hub is
 * three orphans that happen to be about related things.
 */
export default function ToolsIndex() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE}/tools#page`,
        name: "Free Speech Analysis Tools",
        url: `${SITE}/tools`,
        description:
          "Free browser tools that measure speaking delivery: filler word count, speaking pace in words per minute, and AI pitch practice.",
        isPartOf: { "@id": `${SITE}/#website` },
        publisher: { "@id": ORG_ID(SITE) },
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: TOOLS.length,
          itemListElement: TOOLS.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.h1,
            url: `${SITE}/tools/${t.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE}/tools` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
        <nav aria-label="Breadcrumb" className="fv-num text-[12px] text-[var(--faint)]">
          <Link href="/" className="transition-colors hover:text-[var(--ink-dim)]">
            Home
          </Link>
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <span className="text-[var(--muted)]">Tools</span>
        </nav>

        <h1 className="fv-hero-lede mt-6 max-w-[20ch] text-balance">
          Free tools that measure how you actually sound
        </h1>
        <p className="mt-5 max-w-[62ch] text-[15.5px] leading-relaxed text-[var(--muted)]">
          Each one runs in the browser on a sixty-second recording, and each returns the timestamp
          behind every number rather than a score on its own. {FREE_ALLOWANCE}
        </p>

        <ul className="mt-14 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {TOOLS.map((t) => (
            <li key={t.slug} className="fv-reveal">
              <Link href={`/tools/${t.slug}`} className="fv-lift group block px-3 py-7">
                <h2 className="text-[19px] leading-snug text-[var(--ink)] transition-colors group-hover:text-[var(--violet-bright)]">
                  {t.h1}
                </h2>
                <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-[var(--muted)]">
                  {t.description}
                </p>
                <p className="fv-num mt-3 text-[11.5px] text-[var(--faint)]">{t.measures}</p>
              </Link>
            </li>
          ))}
        </ul>

        <aside className="fv-glow-panel mt-16 grid items-center gap-8 p-8 md:grid-cols-[1.25fr_0.75fr] md:p-10">
          <div>
            <h2 className="text-[21px] leading-snug text-balance text-[var(--ink)]">
              One recording produces all of it
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)]">
              Pace, filler rate, pause length and placement, word-level clarity and vocal range come
              out of the same sixty seconds. You do not have to pick a tool first.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Link
              href="/onboarding"
              data-fv-event="seo_cta_click"
              data-fv-guide="tools-index"
              className="fv-hero"
            >
              Record my first minute
            </Link>
          </div>
        </aside>

        <nav className="mt-14 border-t border-[var(--line)] pt-8" aria-label="Guides">
          <h2 className="fv-eyebrow-quiet">The methods behind the numbers</h2>
          <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-[var(--muted)]">
            Measuring is the first half. The{" "}
            <Link href="/guides" className="fv-quiet-link underline">
              guides
            </Link>{" "}
            cover what to do with each number - what a good speaking pace is, how to reduce filler
            words without over-rehearsing, and where pauses belong.
          </p>
        </nav>
      </main>
      <PublicFooter />
    </>
  );
}
