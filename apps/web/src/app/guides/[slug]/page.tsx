import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideSection, RichText } from "@/components/GuideBody";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES, getGuide, guideWordCount, relatedGuides } from "@/lib/guides";
import { ORG_ID, SITE_URL } from "@/lib/schema";
import { toolsForGuide } from "@/lib/tools";

const SITE = SITE_URL;

/** What `articleSection` says for each cluster. The internal key is a slug;
 *  this is the section name a human would give it. */
const CLUSTER_LABEL: Record<string, string> = {
  speaking: "Delivery",
  founder: "Founder communication",
  tools: "Free AI tools",
};

/** The date as a person reads it. The machine-readable half stays in the
 *  `dateTime` attribute of the same `<time>` element. */
function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Stable anchor for a section heading, so contents links and any deep link
 *  from elsewhere keep working as long as the heading text does. */
function sectionId(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Static params make every guide a real prerendered HTML document. */
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const url = `${SITE}/guides/${guide.slug}`;
  /* This guide's own card, drawn by opengraph-image.tsx in this directory.
     Named explicitly because Next attaches a file-convention image on its own
     only while the route inherits the parent's Open Graph metadata, and this
     page declares its own `openGraph` block. Every guide previously fell back
     to the site-wide card, so seventeen articles shared one image - a headline
     unrelated to the page on every share, and one `image` value across every
     Article on the site. */
  const card = {
    url: `/guides/${guide.slug}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: `${guide.title} - FounderVoice`,
  };
  return {
    title: guide.metaTitle,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    // Keywords are ignored by Google, but this is the only place the target
    // intent is visible from the rendered page, which makes an audit of what
    // each URL is meant to rank for possible without reading the source.
    keywords: [guide.primaryKeyword, ...guide.secondaryKeywords],
    openGraph: {
      type: "article",
      title: guide.metaTitle,
      description: guide.description,
      url,
      publishedTime: guide.published,
      modifiedTime: guide.updated,
      images: [card],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle,
      description: guide.description,
      images: [card.url],
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const url = `${SITE}/guides/${guide.slug}`;
  /* A hub links to its whole cluster. Capping a pillar at three related guides
     made it a hub in name and a spoke in its outbound links, which is the half
     of a cluster that search engines actually read. */
  const related = guide.pillar ? relatedGuides(guide, GUIDES.length) : relatedGuides(guide);
  const tools = toolsForGuide(guide.slug);

  // Article, breadcrumbs and FAQ in one graph. The Organization itself is
  // declared once in the root layout; referencing it by @id here rather than
  // repeating it is what makes the publisher one entity across the site
  // instead of eleven look-alikes with the same name.
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: guide.title,
        alternativeHeadline: guide.metaTitle,
        description: guide.description,
        // The extractable answer, stated as the article's abstract. It is the
        // same forty-odd words shown in the answer block on the page, which is
        // the point: schema that describes something not on the page is worth
        // less than nothing.
        abstract: guide.answer,
        // These were the same value. Every guide therefore told Google it had
        // been published and last modified on the same day, which describes a
        // page nobody has revisited and throws away the freshness signal an
        // actual revision earns.
        datePublished: guide.published,
        dateModified: guide.updated,
        mainEntityOfPage: url,
        url,
        // The per-guide social card, drawn from this guide's own title. Article
        // rich results want an image, and seventeen guides sharing one generic
        // site card gave the crawler seventeen reasons to think these pages
        // were the same page.
        image: [`${url}/opengraph-image`],
        inLanguage: "en",
        isAccessibleForFree: true,
        // Length and reading time are both things Google uses to tell a real
        // article from a stub, and neither was declared.
        wordCount: guideWordCount(guide),
        timeRequired: `PT${guide.readMinutes}M`,
        articleSection: CLUSTER_LABEL[guide.cluster],
        keywords: [guide.primaryKeyword, ...guide.secondaryKeywords].join(", "),
        // The subject, named as the thing people search for. This is what ties
        // the page to a topic rather than to a string of words in a headline.
        about: { "@type": "Thing", name: guide.primaryKeyword },
        isPartOf: { "@id": `${SITE}/#website` },
        author: { "@id": ORG_ID(SITE) },
        publisher: { "@id": ORG_ID(SITE) },
        // Points an assistant reading the page aloud at the short answer rather
        // than at whatever it finds first.
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["#short-answer"],
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
      // FAQPage no longer earns a SERP feature (Google retired FAQ rich results
      // in May 2026). It stays because the questions are real and the markup
      // still describes the page honestly to anything else reading it.
      ...(guide.faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: guide.faqs.map((f) => ({
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

      {/* max-w-5xl matches PublicHeader, so the breadcrumb starts on the same
          left edge as the logo. The article column inside stays at a reading
          measure; the spare column on lg holds the contents rail. */}
      <main className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
        <nav aria-label="Breadcrumb" className="fv-num text-[12px] text-[var(--faint)]">
          <Link href="/" className="transition-colors hover:text-[var(--ink-dim)]">
            Home
          </Link>
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <Link href="/guides" className="transition-colors hover:text-[var(--ink-dim)]">
            Guides
          </Link>
          {/* The third level was in the schema but not on the page. Google
              prefers a visible trail that matches the BreadcrumbList. */}
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <span className="text-[var(--muted)]">{guide.title}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_13rem] lg:gap-14">
          <article className="min-w-0 max-w-[68ch]">
            <h1 className="fv-hero-lede text-balance">{guide.title}</h1>
            <p className="fv-num mt-4 text-[11.5px] text-[var(--faint)]">
              {/* Was a raw ISO string. A <time> element is what a crawler reads
                  for freshness, and the formatted label is what a person reads.
                  Both dates are shown once they differ, because a visible
                  revision date is the human-readable half of `dateModified` -
                  and a page claiming a modification the page does not show is
                  the pattern Google discounts. */}
              Published{" "}
              <time dateTime={guide.published}>{longDate(guide.published)}</time>
              {guide.updated !== guide.published && (
                <>
                  <span className="px-2" aria-hidden>
                    &middot;
                  </span>
                  Updated <time dateTime={guide.updated}>{longDate(guide.updated)}</time>
                </>
              )}
              <span className="px-2" aria-hidden>
                &middot;
              </span>
              {guide.readMinutes} min read
            </p>

            {/* The extractable answer, in its own block.
                A featured snippet, a People Also Ask entry and an AI Overview
                citation are all extractions, and none of them lift a
                well-written paragraph - they lift a short, self-contained
                answer, a list or a table row. Seventeen guides of unbroken
                prose gave Google nothing to take, which is how a page can be
                the best answer on the web and still lose every position that
                actually gets clicked. This is 40-55 words, answers the primary
                query on its own, and repeats no pronoun that points at
                anything above it. */}
            <div id="short-answer" className="fv-tile mt-8 border-l-2 border-l-[var(--accent)]">
              <p className="fv-eyebrow-quiet">Short answer</p>
              <p className="mt-2.5 text-[15.5px] leading-relaxed text-[var(--ink-dim)]">
                {guide.answer}
              </p>
            </div>

            {/* Then the full opening. A page that makes you scroll past setup to
                reach what you searched for deserves the bounce it gets. */}
            <p className="mt-8 text-[16.5px] leading-relaxed text-[var(--ink-dim)]">
              <RichText>{guide.intro}</RichText>
            </p>

            {guide.sections.map((s) => (
              <GuideSection key={s.h} section={s} id={sectionId(s.h)} />
            ))}

            {guide.faqs.length > 0 && (
              <section id="questions" className="mt-14 scroll-mt-24 border-t border-[var(--line)] pt-10">
                <h2 className="text-[21px] leading-snug text-[var(--ink)]">Questions</h2>
                {/* Native disclosure, same as the landing FAQ: the answers stay
                    in the DOM for the FAQPage schema whether or not they are
                    open, and it costs no JavaScript on a static page. */}
                <div className="mt-6 border-b border-[var(--line)]">
                  {guide.faqs.map((f, i) => (
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

          {/* Contents. Long guides had no way to reach a section directly and no
              anchors to link to; both now exist. Rendered after the article in
              source order so it never precedes the content for a screen reader,
              and placed by grid on wide viewports only. */}
          {guide.sections.length > 2 && (
            <nav
              aria-label="On this page"
              className="order-first hidden lg:order-none lg:block"
            >
              <div className="sticky top-10">
                <p className="fv-eyebrow-quiet">On this page</p>
                <ul className="mt-4 space-y-2.5 border-l border-[var(--line)]">
                  {guide.sections.map((s) => (
                    <li key={s.h}>
                      <a
                        href={`#${sectionId(s.h)}`}
                        className="-ml-px block border-l border-transparent pl-3 text-[13px] leading-snug text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
                      >
                        {s.h}
                      </a>
                    </li>
                  ))}
                  {guide.faqs.length > 0 && (
                    <li>
                      <a
                        href="#questions"
                        className="-ml-px block border-l border-transparent pl-3 text-[13px] leading-snug text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
                      >
                        Questions
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </nav>
          )}
        </div>

        {/* The CTA names the number this reader came for. A generic "try the
            product" panel on a filler-words page asks someone mid-problem to
            take an interest in a tour instead. */}
        <aside className="fv-glow-panel mt-14 max-w-[68ch] p-8 md:p-9">
          <h2 className="text-[19px] leading-snug text-balance text-[var(--ink)]">{guide.cta.h}</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)]">{guide.cta.p}</p>
          <Link
            href={guide.cta.href}
            data-fv-event="seo_cta_click"
            data-fv-guide={guide.slug}
            className="fv-hero mt-6"
          >
            {guide.cta.label}
          </Link>
          <p className="mt-3 text-[12.5px] text-[var(--faint)]">
            Free, ten recordings a day, no account.
          </p>
          {/* The tool page that measures what this guide is about. Guides used
              to link only to other guides, which circulates traffic inside the
              articles and never reaches the pages built to win the commercial
              query. This is the link that closes the cluster. */}
          {tools.length > 0 && (
            <p className="mt-5 text-[13px] leading-relaxed text-[var(--muted)]">
              Or see what it measures first:{" "}
              {tools.map((t, i) => (
                <span key={t.slug}>
                  {i > 0 && ", "}
                  <Link href={`/tools/${t.slug}`} className="fv-quiet-link underline">
                    {t.h1}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </aside>

        {related.length > 0 && (
          <nav className="mt-12 border-t border-[var(--line)] pt-8" aria-label="Related guides">
            <h2 className="fv-eyebrow-quiet">Related guides</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((g) => (
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
      </main>

      <PublicFooter />
    </>
  );
}
