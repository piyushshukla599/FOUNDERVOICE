import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES, getGuide } from "@/lib/guides";

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
    openGraph: {
      type: "article",
      title: guide.metaTitle,
      description: guide.description,
      url,
      publishedTime: guide.updated,
      modifiedTime: guide.updated,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const url = `${SITE}/guides/${guide.slug}`;
  // Article and FAQ in one graph, plus breadcrumbs, so the page can win both a
  // normal result and an expandable FAQ result for the same query.
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
        author: { "@type": "Organization", name: "FounderVoice AI", url: SITE },
        publisher: { "@type": "Organization", name: "FounderVoice AI", url: SITE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
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

  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

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

        <aside className="mt-12 rounded-2xl border border-[var(--line)] p-7">
          <h2 className="text-[17px] text-[var(--ink)]">Measure yours in sixty seconds</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
            FounderVoice records a minute of your speech and reports every number in this guide:
            pace, filler rate, pause length and clarity. Ten recordings a day, free, no account.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </aside>

        {others.length > 0 && (
          <nav className="mt-12 border-t border-[var(--line)] pt-8" aria-label="More guides">
            <h2 className="text-[13px] uppercase tracking-[0.16em] text-[var(--faint)]">
              More guides
            </h2>
            <ul className="mt-4 space-y-3">
              {others.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="text-[15px] text-[var(--ink-dim)] transition-colors hover:text-[var(--violet-bright)]"
                  >
                    {g.title}
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
