import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/terms" }, title: "Terms of Use" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/onboarding" className="text-sm text-[var(--accent)]">
        ← About
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Terms of Use</h1>
      <p className="text-sm text-[var(--muted)]">Last updated: 2026-07-31 · Product version 1.0</p>

      <section className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
        <h2 className="text-lg text-[var(--ink)]">The product</h2>
        <p>
          FounderVoice AI is a free speech coaching tool. Features, estimates, and coach
          text are provided as-is for personal and professional practice.
        </p>
        <h2 className="text-lg text-[var(--ink)]">Not medical or legal advice</h2>
        <p>
          Voice quality, emotion, breath, and investor scores are acoustic or model estimates, not
          clinical diagnoses, guaranteed fundraising outcomes, or accent-change services.
        </p>
        <h2 className="text-lg text-[var(--ink)]">Your responsibilities</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Only record audio you have the right to capture.</li>
          <li>Keep API keys and local data secure on your machine.</li>
          <li>Do not use the software to harass or unlawfully monitor others.</li>
        </ul>
        <h2 className="text-lg text-[var(--ink)]">Availability</h2>
        <p>
          Self-hosted software depends on your hardware, Whisper model downloads, and optional third-party
          APIs. We do not guarantee uninterrupted cloud uptime for local installs.
        </p>
        <h2 className="text-lg text-[var(--ink)]">Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, authors and contributors are not liable for indirect
          or consequential damages arising from use of the software.
        </p>
        <h2 className="text-lg text-[var(--ink)]">License</h2>
        <p>See the repository LICENSE file for software licensing terms.</p>
      </section>
    </article>
  );
}
