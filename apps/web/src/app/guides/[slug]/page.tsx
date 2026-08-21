import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES, getGuide, relatedGuides } from "@/lib/guides";
import { OG_IMAGE, ORG_ID } from "@/lib/schema";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://foundervoice.app";

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
      publishedTime: guide.updated,
      modifiedTime: guide.updated,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle,
      description: guide.description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const url = `${SITE}/guides/${guide.slug}`;
  const related = relatedGuides(guide);

  // Article, breadcrumbs and FAQ in one graph. The Organization itself is
  // declared once in the root layout; referencing it by @id here rather than
  // repeating it is what makes the publisher one entity across the site
  // instead of eleven look-alikes with the same name.
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        datePublished: guide.updated,
        dateModified: guide.updated,
        mainEntityOfPage: url,
        url,
        // The generated social card. Article rich results want an image and
        // this is the only one every guide is guaranteed to have.
        image: [`${SITE}/opengraph-image`],
        inLanguage: "en",
        author: { "@id": ORG_ID(SITE) },
        publisher: { "@id": ORG_ID(SITE) },
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

      <main className="mx-auto max-w-3xl px-6 py-10">
        <nav aria-label="Breadcrumb" className="text-[12.5px] text-[var(--faint)]">
          <Link href="/" className="hover:text-[var(--muted)]">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/guides" className="hover:text-[var(--muted)]">
            Guides
          </Link>
        </nav>

        <article className="mt-6">
          <h1 className="fv-lede">{guide.title}</h1>
          <p className="mt-3 text-[12.5px] text-[var(--faint)]">
            Updated {guide.updated} · {guide.readMinutes} min read
          </p>

          {/* The answer comes first. A page that makes you scroll past setup to
              reach what you searched for deserves the bounce it gets. */}
          <p className="mt-7 text-[16px] leading-relaxed text-[var(--ink-dim)]">{guide.intro}</p>

          {guide.sections.map((s) => (
            <section key={s.h} className="mt-10">
              <h2 className="text-[21px] leading-snug text-[var(--ink)]">{s.h}</h2>
              {s.p.map((para) => (
                <p
                  key={para.slice(0, 40)}
                  className="mt-3.5 text-[15px] leading-relaxed text-[var(--muted)]"
                >
                  {para}
                </p>
              ))}
            </section>
          ))}

          {guide.faqs.length > 0 && (
            <section className="mt-12 border-t border-[var(--line)] pt-8">
              <h2 className="text-[21px] leading-snug text-[var(--ink)]">Questions</h2>
              <dl className="mt-5 space-y-6">
                {guide.faqs.map((f) => (
                  <div key={f.q}>
                    <dt className="text-[15.5px] font-medium text-[var(--ink)]">{f.q}</dt>
                    <dd className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--muted)]">
                      {f.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>

        {/* The CTA names the number this reader came for. A generic "try the
            product" panel on a filler-words page asks someone mid-problem to
            take an interest in a tour instead. */}
        <aside className="mt-12 rounded-2xl border border-[var(--line)] p-7">
          <h2 className="text-[17px] text-[var(--ink)]">{guide.cta.h}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">{guide.cta.p}</p>
          <Link
            href={guide.cta.href}
            data-fv-event="seo_cta_click"
            data-fv-guide={guide.slug}
            className="mt-5 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {guide.cta.label}
          </Link>
          <p className="mt-3 text-[12.5px] text-[var(--faint)]">
            Free, ten recordings a day, no account.
          </p>
        </aside>

        {related.length > 0 && (
          <nav className="mt-12 border-t border-[var(--line)] pt-8" aria-label="Related guides">
            <h2 className="text-[13px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Related guides
            </h2>
            <ul className="mt-5 space-y-5">
              {related.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="text-[15.5px] text-[var(--ink-dim)] transition-colors hover:text-[var(--violet-bright)]"
                  >
                    {g.title}
                  </Link>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--faint)]">
                    {g.description}
                  </p>
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
