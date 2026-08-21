import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

/**
 * The App Router already returns a real 404 status for unmatched routes, so
 * this is about what the person who hit one sees. The framework default is a
 * bare "This page could not be found" with nowhere to go, which converts a
 * mistyped URL or a stale link into a bounce.
 *
 * Deliberately no PublicHeader here. This renders for *any* unmatched path, so
 * AppShell has already decided whether to draw the app nav based on a pathname
 * that matches nothing in CHROMELESS - adding a second header would double the
 * navigation on every 404 under an app route.
 *
 * `noindex` is belt and braces: a 404 is not indexable anyway, but the status
 * is the only thing saying so, and this page answers URLs that other sites may
 * keep linking to.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const guides = GUIDES.slice(0, 4);

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="fv-eyebrow">404</p>
        <h1 className="fv-lede mt-4 max-w-2xl text-balance">
          That page is not here any more
        </h1>
        <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-[var(--muted)]">
          Either the address has a typo in it, or the page moved. Nothing you recorded is
          affected - your recordings live in this browser&apos;s workspace, not at this URL.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="rounded-full bg-[var(--accent)] px-7 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Record your first minute
          </Link>
          <Link href="/" className="text-[14px] text-[var(--violet-bright)]">
            Back to the home page
          </Link>
        </div>

        <section className="mt-16 border-t border-[var(--line)] pt-8">
          <h2 className="text-[13px] uppercase tracking-[0.16em] text-[var(--faint)]">
            Popular guides
          </h2>
          <ul className="mt-5 space-y-4">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="text-[15.5px] text-[var(--ink-dim)] transition-colors hover:text-[var(--violet-bright)]"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/guides" className="mt-6 inline-block text-[14px] text-[var(--violet-bright)]">
            All {GUIDES.length} guides
          </Link>
        </section>
      </main>
    </>
  );
}
