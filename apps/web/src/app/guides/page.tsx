import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES, pillarFor, type Guide } from "@/lib/guides";
import { OG_IMAGE, ORG_ID, SITE_URL } from "@/lib/schema";

const SITE = SITE_URL;

export const metadata: Metadata = {
  title: "Guides to Speaking and Founder Communication",
  description:
    "Practical, measurable guides to delivery: filler words, speaking pace, pauses, rambling, investor pitches and Q&A. Free to read, no signup.",
  alternates: { canonical: "/guides" },
  openGraph: {
    type: "website",
    title: "Guides to Speaking and Founder Communication",
    description:
      "Measurable guides to delivery: filler words, pace, pauses, pitching and investor Q&A.",
    url: `${SITE}/guides`,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guides to Speaking and Founder Communication",
    images: [OG_IMAGE.url],
  },
};

/**
 * The index is split by cluster rather than listed flat. Two reasons: a reader
 * arriving on "how to stop saying um" is looking for the other delivery
 * problems and not for investor Q&A, and a hub that groups its spokes tells a
 * crawler what this section is about far more clearly than an undifferentiated
 * list of eleven links.
 */
const CLUSTERS: { key: Guide["cluster"]; h: string; p: string }[] = [
  {
    key: "speaking",
    h: "Delivery",
    p: "The habits that decide whether people follow you: pace, filler words, pauses, clarity and structure. Each one is measurable, which is what makes it fixable.",
  },
  {
    key: "founder",
    h: "Founder communication",
    p: "The situations where delivery decides the outcome - the pitch, the investor questions, and explaining the company to someone who has never heard of it.",
  },
];

export default function GuidesIndex() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE}/guides#page`,
        name: "Guides to Speaking and Founder Communication",
        url: `${SITE}/guides`,
        isPartOf: { "@id": `${SITE}/#website` },
        publisher: { "@id": ORG_ID(SITE) },
        // hasPart carried a headline and a URL and nothing else, which tells a
        // crawler these pages exist but nothing about them. The description and
        // the dates are already in the guide data and are what make an entry in
        // a collection worth indexing as part of the collection.
        hasPart: GUIDES.map((g) => ({
          "@type": "Article",
          headline: g.title,
          description: g.description,
          url: `${SITE}/guides/${g.slug}`,
          datePublished: g.updated,
          dateModified: g.updated,
          author: { "@id": ORG_ID(SITE) },
        })),
        // The order on the page is deliberate (cluster, then reading order), so
        // it is worth stating rather than leaving Google to infer it.
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: GUIDES.length,
          itemListElement: GUIDES.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: g.title,
            url: `${SITE}/guides/${g.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
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
      {/* max-w-5xl so the breadcrumb and headline sit on the same left edge as
          the logo in PublicHeader; the reading column inside stays narrow. */}
      <main className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
        <nav aria-label="Breadcrumb" className="fv-num text-[12px] text-[var(--faint)]">
          <Link href="/" className="transition-colors hover:text-[var(--ink-dim)]">
            Home
          </Link>
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <span className="text-[var(--muted)]">Guides</span>
        </nav>

        <h1 className="fv-hero-lede mt-6 max-w-[18ch] text-balance">Guides to speaking better</h1>
        <p className="mt-5 max-w-[62ch] text-[15.5px] leading-relaxed text-[var(--muted)]">
          Each guide answers one question properly, with the numbers to aim for and a way to check
          whether you hit them. No signup required to read any of it.
        </p>

        {CLUSTERS.map((cluster) => {
          const pillar = pillarFor(cluster.key);
          // The hub is presented as the way in, not as one more item in the
          // list, so the spokes below it read as the cluster it anchors.
          const guides = GUIDES.filter((g) => g.cluster === cluster.key && !g.pillar);
          if (guides.length === 0 && !pillar) return null;
          return (
            <section
              key={cluster.key}
              className="mt-16 grid gap-8 border-t border-[var(--line)] pt-12 md:grid-cols-[0.72fr_1.28fr] md:gap-12 lg:mt-20"
            >
              <div>
                <h2 className="text-[21px] leading-snug text-balance text-[var(--ink)]">
                  {cluster.h}
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)]">
                  {cluster.p}
                </p>
                {pillar && (
                  <Link
                    href={`/guides/${pillar.slug}`}
                    className="fv-tile mt-6 block"
                  >
                    <span className="fv-eyebrow">Start here</span>
                    <span className="mt-2 block text-[16px] leading-snug text-[var(--ink)]">
                      {pillar.title}
                    </span>
                    <span className="fv-num mt-2 block text-[11.5px] text-[var(--faint)]">
                      {pillar.readMinutes} min read
                    </span>
                  </Link>
                )}
                <p className="fv-eyebrow-quiet mt-5">
                  {guides.length} more {guides.length === 1 ? "guide" : "guides"}
                </p>
              </div>

              <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {guides.map((g) => (
                  <li key={g.slug} className="fv-reveal">
                    <Link href={`/guides/${g.slug}`} className="fv-lift group block px-3 py-6">
                      <h3 className="text-[18.5px] leading-snug text-[var(--ink)] transition-colors group-hover:text-[var(--violet-bright)]">
                        {g.title}
                      </h3>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
                        {g.description}
                      </p>
                      {/* Reading time and freshness are both things a reader
                          decides on before clicking, so they belong here rather
                          than only inside the article. */}
                      <p className="fv-num mt-3 text-[11.5px] text-[var(--faint)]">
                        {g.readMinutes} min read
                        <span className="px-2" aria-hidden>
                          &middot;
                        </span>
                        <span>
                          Updated{" "}
                          <time dateTime={g.updated}>
                            {new Date(g.updated).toLocaleDateString("en-GB", {
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
                        </span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <aside className="fv-glow-panel mt-20 grid items-center gap-8 p-8 md:grid-cols-[1.25fr_0.75fr] md:p-10">
          <div>
            <h2 className="text-[21px] leading-snug text-balance text-[var(--ink)]">
              Measure yours in sixty seconds
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)]">
              Every number in these guides &mdash; pace, filler rate, pause length, clarity and
              vocal energy &mdash; comes out of one recording. Ten a day, free, no account.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Link
              href="/onboarding"
              data-fv-event="seo_cta_click"
              data-fv-guide="guides-index"
              className="fv-hero"
            >
              Record your first minute
            </Link>
          </div>
        </aside>
      </main>
      <PublicFooter />
    </>
  );
}
