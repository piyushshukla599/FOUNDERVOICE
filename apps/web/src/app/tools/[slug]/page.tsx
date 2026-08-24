import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideSection } from "@/components/GuideBody";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { getGuide } from "@/lib/guides";
import { ORG_ID, SITE_URL } from "@/lib/schema";
import { FREE_ALLOWANCE, TOOLS, getTool } from "@/lib/tools";

const SITE = SITE_URL;

/**
 * A page per measurement the product produces.
 *
 * The intent here is commercial, not informational, and Google treats the two
 * as different SERPs with different winners. Someone typing "filler word
 * counter" wants the thing that counts them; an article about why people say
 * um loses that query no matter how good it is. Every one of these searches
 * previously landed on the homepage, which was trying to be the best result
 * for a dozen unrelated commercial intents at once and was therefore a
 * mediocre result for each.
 */

function sectionId(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const url = `${SITE}/tools/${tool.slug}`;
  const card = {
    url: `/tools/${tool.slug}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: `${tool.h1} - FounderVoice`,
  };
  return {
    title: tool.metaTitle,
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}` },
    keywords: [tool.primaryKeyword, ...tool.secondaryKeywords],
    openGraph: {
      type: "website",
      title: tool.metaTitle,
      description: tool.description,
      url,
      images: [card],
    },
    twitter: {
      card: "summary_large_image",
      title: tool.metaTitle,
      description: tool.description,
      images: [card.url],
    },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const url = `${SITE}/tools/${tool.slug}`;
  /* Four tiles. The rest of `tool.guides` still earns this page a link from
     every guide in the list through `toolsForGuide`, which is the direction
     that matters; showing all seven here would just be a wall. */
  const guides = tool.guides.slice(0, 4).map(getGuide).filter((g) => g !== undefined);
  const others = TOOLS.filter((t) => t.slug !== tool.slug);

  /* A `SoftwareApplication` per page rather than one shared node, because each
     of these is a different function of the same product and `featureList`
     naming everything on every page tells a crawler these three URLs describe
     the same thing. The publisher is referenced by @id back to the single
     Organization in the root layout. */
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#app`,
        name: tool.h1,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Speech analysis",
        operatingSystem: "Web browser",
        url,
        description: tool.answer,
        featureList: [tool.measures],
        publisher: { "@id": ORG_ID(SITE) },
        isPartOf: { "@id": `${SITE}/#website` },
        // Mirrors apps/api/app/config.py. Schema that promises an allowance the
        // API does not grant is the kind of contradiction that costs the rich
        // result outright.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: FREE_ALLOWANCE,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: tool.metaTitle,
        description: tool.description,
        datePublished: tool.published,
        dateModified: tool.updated,
        inLanguage: "en",
        isPartOf: { "@id": `${SITE}/#website` },
        about: { "@type": "Thing", name: tool.primaryKeyword },
        mainEntity: { "@id": `${url}#app` },
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["#short-answer"],
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE}/tools` },
          { "@type": "ListItem", position: 3, name: tool.h1, item: url },
        ],
      },
      ...(tool.faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: tool.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
        <nav aria-label="Breadcrumb" className="fv-num text-[12px] text-[var(--faint)]">
          <Link href="/" className="transition-colors hover:text-[var(--ink-dim)]">
            Home
          </Link>
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <Link href="/tools" className="transition-colors hover:text-[var(--ink-dim)]">
            Tools
          </Link>
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <span className="text-[var(--muted)]">{tool.h1}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_13rem] lg:gap-14">
          <article className="min-w-0 max-w-[68ch]">
            <h1 className="fv-hero-lede text-balance">{tool.h1}</h1>

            <div id="short-answer" className="fv-tile mt-8 border-l-2 border-l-[var(--accent)]">
              <p className="fv-eyebrow-quiet">Short answer</p>
              <p className="mt-2.5 text-[15.5px] leading-relaxed text-[var(--ink-dim)]">
                {tool.answer}
              </p>
            </div>

            {/* The commercial intent gets answered above the fold. A page that
                makes someone searching for a tool read four paragraphs before
                reaching the tool has answered a different query. */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href={tool.cta.href}
                data-fv-event="seo_cta_click"
                data-fv-guide={`tool-${tool.slug}`}
                className="fv-hero"
              >
                {tool.cta.label}
              </Link>
              <p className="text-[13px] text-[var(--faint)]">{FREE_ALLOWANCE}</p>
            </div>

            {tool.sections.map((s) => (
              <GuideSection key={s.h} section={s} id={sectionId(s.h)} />
            ))}

            {tool.faqs.length > 0 && (
              <section
                id="questions"
                className="mt-14 scroll-mt-24 border-t border-[var(--line)] pt-10"
              >
                <h2 className="text-[21px] leading-snug text-[var(--ink)]">Questions</h2>
                <div className="mt-6 border-b border-[var(--line)]">
                  {tool.faqs.map((f, i) => (
                    <details key={f.q} className="fv-faq" open={i === 0}>
                      <summary>
                        <span className="text-[15.5px] leading-snug font-medium">{f.q}</span>
                        <span className="fv-faq-mark" aria-hidden />
                      </summary>
                      <p className="fv-faq-a pr-8 pb-5 text-[14.5px] leading-relaxed text-[var(--muted)]">
                        {f.a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </article>

          {tool.sections.length > 2 && (
            <nav aria-label="On this page" className="order-first hidden lg:order-none lg:block">
              <div className="sticky top-10">
                <p className="fv-eyebrow-quiet">On this page</p>
                <ul className="mt-4 space-y-2.5 border-l border-[var(--line)]">
                  {tool.sections.map((s) => (
                    <li key={s.h}>
                      <a
                        href={`#${sectionId(s.h)}`}
                        className="-ml-px block border-l border-transparent pl-3 text-[13px] leading-snug text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
                      >
                        {s.h}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href="#questions"
                      className="-ml-px block border-l border-transparent pl-3 text-[13px] leading-snug text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
                    >
                      Questions
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          )}
        </div>

        {/* Down into the guides. The tool page wins the commercial query and
            the guide explains the habit behind it; linking both ways is what
            makes them one cluster rather than two sections of a site. */}
        {guides.length > 0 && (
          <nav className="mt-14 border-t border-[var(--line)] pt-8" aria-label="Related guides">
            <h2 className="fv-eyebrow-quiet">Read the method behind the number</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="fv-tile h-full">
                    <span className="block text-[15.5px] leading-snug text-[var(--ink-dim)]">
                      {g.title}
                    </span>
                    <span className="mt-2 block text-[13.5px] leading-relaxed text-[var(--faint)]">
                      {g.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {others.length > 0 && (
          <nav className="mt-12 border-t border-[var(--line)] pt-8" aria-label="Other tools">
            <h2 className="fv-eyebrow-quiet">The other measurements</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {others.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/${t.slug}`} className="fv-tile h-full">
                    <span className="block text-[15.5px] leading-snug text-[var(--ink-dim)]">
                      {t.h1}
                    </span>
                    <span className="mt-2 block text-[13.5px] leading-relaxed text-[var(--faint)]">
                      {t.measures}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>

      <PublicFooter />
    </>
  );
}
