import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES, type Guide } from "@/lib/guides";
import { OG_IMAGE, ORG_ID } from "@/lib/schema";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://foundervoice.app";

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
        hasPart: GUIDES.map((g) => ({
          "@type": "Article",
          headline: g.title,
          url: `${SITE}/guides/${g.slug}`,
        })),
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
      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="text-[12.5px] text-[var(--faint)]">
          <Link href="/" className="hover:text-[var(--muted)]">
            Home
          </Link>{" "}
          / Guides
        </nav>

        <h1 className="fv-lede mt-6">Guides to speaking better</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--muted)]">
          Each guide answers one question properly, with the numbers to aim for and a way to check
          whether you hit them. No signup required to read any of it.
        </p>

        {CLUSTERS.map((cluster) => {
          const guides = GUIDES.filter((g) => g.cluster === cluster.key);
          if (guides.length === 0) return null;
          return (
            <section key={cluster.key} className="mt-14">
              <h2 className="text-[21px] leading-snug text-[var(--ink)]">{cluster.h}</h2>
              <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-[var(--muted)]">
                {cluster.p}
              </p>

              <ul className="mt-8 space-y-8">
                {guides.map((g) => (
                  <li key={g.slug} className="border-t border-[var(--line)] pt-7">
                    <h3 className="text-[19px] leading-snug">
                      <Link
                        href={`/guides/${g.slug}`}
                        className="text-[var(--ink)] transition-colors hover:text-[var(--violet-bright)]"
                      >
                        {g.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
                      {g.description}
                    </p>
                    <p className="mt-2.5 text-[12.5px] text-[var(--faint)]">
                      {g.readMinutes} min read
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <aside className="mt-16 rounded-2xl border border-[var(--line)] p-7">
          <h2 className="text-[17px] text-[var(--ink)]">Measure yours in sixty seconds</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
            Every number in these guides - pace, filler rate, pause length, clarity and vocal
            energy - comes out of one recording. Ten a day, free, no account.
          </p>
          <Link
            href="/onboarding"
            data-fv-event="seo_cta_click"
            data-fv-guide="guides-index"
            className="mt-5 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Record your first minute
          </Link>
        </aside>
      </main>
      <PublicFooter />
    </>
  );
}
