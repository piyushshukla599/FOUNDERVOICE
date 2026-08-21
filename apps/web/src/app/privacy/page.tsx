import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/privacy" }, title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/onboarding" className="text-sm text-[var(--accent)]">
        ← About
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Privacy Policy</h1>
      <p className="text-sm text-[var(--muted)]">Last updated: 2026-08-20 · Product version 1.0</p>

      <section className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
        <h2 className="text-lg text-[var(--ink)]">Two ways to run this</h2>
        <p>
          FounderVoice AI is open source, and where your audio goes depends entirely on which copy
          you are using. The hosted demo and a self-hosted install behave very differently, so both
          are described below.
        </p>

        <h2 className="text-lg text-[var(--ink)]">The hosted demo</h2>
        <p>
          If you are reading this on our public demo site, treat it as a shared sandbox rather than a
          private workspace:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Your recording is uploaded to our server, converted, analysed, and stored there along
            with its transcript, metrics, and coaching report.
          </li>
          <li>
            Audio is sent to Groq for speech-to-text. Their handling is governed by their own
            privacy terms, not ours.
          </li>
          <li>
            <strong className="text-[var(--ink)]">There are no accounts.</strong> Your recordings
            live in a private workspace identified by a cookie in your browser, so other visitors
            cannot see or delete them. Clearing that cookie, or opening the site in another
            browser, starts a new empty workspace and makes the old one unreachable.
          </li>
        </ul>
        <p>
          Because there is no password, treat this as convenient rather than secure. It suits
          practice material and interview answers. Do not upload unreleased financials, customer
          information, or anything else you would not want stored on a server you do not control.
        </p>

        <h2 className="text-lg text-[var(--ink)]">Running it yourself</h2>
        <p>
          When you run FounderVoice AI on your own machine or server, microphone audio, recordings,
          transcripts, and the SQLite database stay on that machine. Set{" "}
          <code>ASR_PROVIDER=local</code> and transcription runs in-process through Whisper, so no
          audio is sent anywhere. This is the configuration the project is designed around.
        </p>

        <h2 className="text-lg text-[var(--ink)]">Optional cloud coaching text</h2>
        <p>
          If a coaching API key is configured on the API server, derived text and metrics (not raw
          audio) may be sent to that provider to generate coach language. Leave the key unset to use
          the built-in templates instead.
        </p>

        <h2 className="text-lg text-[var(--ink)]">Contact form</h2>
        <p>
          If you submit the in-app contact or feedback form, we receive the details you enter (name,
          email, phone, company, message) so we can reply. Do not include sensitive audio or secrets.
        </p>

        <h2 className="text-lg text-[var(--ink)]">No unnecessary tracking</h2>
        <p>
          The app does not embed advertising trackers, and analytics are not required to use the
          product.
        </p>

        <h2 className="text-lg text-[var(--ink)]">Your control</h2>
        <p>
          Use Fresh start in Coach to wipe sessions and Voice Memory. On a self-hosted install,
          deleting the <code>data/</code> folder removes every stored file.
        </p>

        <h2 className="text-lg text-[var(--ink)]">Contact</h2>
        <p>Use Contact us in the app sidebar, or the repository maintainer email if published.</p>
      </section>
    </article>
  );
}
