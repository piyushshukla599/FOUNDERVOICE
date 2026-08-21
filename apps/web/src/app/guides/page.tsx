import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Speaking and Communication Guides",
  description:
    "Practical, measurable guides to speaking better English: pace, filler words, confidence, clarity and pitch delivery. Free, with no signup.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="fv-lede">Guides to speaking better</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--muted)]">
          Each guide answers one question properly, with the numbers to aim for and a way to check
          whether you hit them. No signup required to read any of it.
        </p>

        <ul className="mt-10 space-y-8">
          {GUIDES.map((g) => (
            <li key={g.slug} className="border-t border-[var(--line)] pt-7">
              <h2 className="text-[19px] leading-snug">
                <Link
                  href={`/guides/${g.slug}`}
                  className="text-[var(--ink)] transition-colors hover:text-[var(--violet-bright)]"
                >
                  {g.title}
                </Link>
              </h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
                {g.description}
              </p>
              <p className="mt-2.5 text-[12.5px] text-[var(--faint)]">
                {g.readMinutes} min read
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-14 border-t border-[var(--line)] pt-8">
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            Reading helps. Hearing yourself helps more.{" "}
            <Link href="/onboarding" className="text-[var(--violet-bright)]">
              Record a minute and see your numbers
            </Link>
            .
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
