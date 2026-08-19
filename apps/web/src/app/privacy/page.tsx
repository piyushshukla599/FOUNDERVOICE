import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/onboarding" className="text-sm text-[var(--accent)]">
        ← About
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Privacy Policy</h1>
      <p className="text-sm text-[var(--muted)]">Last updated: 2026-07-31 · Product version 1.0</p>

      <section className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
        <h2 className="text-lg text-[var(--ink)]">Local-first by design</h2>
        <p>
          FounderVoice AI is built so that microphone audio, recordings, Whisper transcripts, and
          SQLite data stay on the device where you run the app. We do not operate a cloud service that
          stores your raw audio.
        </p>
        <h2 className="text-lg text-[var(--ink)]">What stays on your machine</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Audio files under the local `data/audio` directory</li>
          <li>Transcripts, metrics, Voice Memory, and session reports in local SQLite</li>
          <li>Whisper model weights cached locally</li>
        </ul>
        <h2 className="text-lg text-[var(--ink)]">Optional cloud coaching text</h2>
        <p>
          If you configure an optional coaching API key on your own API server, derived text and
          metrics (not raw audio) may be sent to that provider to generate coach language. You can
          leave the key unset and use built-in local templates instead.
        </p>
        <h2 className="text-lg text-[var(--ink)]">Contact form</h2>
        <p>
          If you submit the in-app contact or feedback form, we receive the details you enter (name,
          email, phone, company, message) so we can reply. Do not include sensitive audio or secrets.
        </p>
        <h2 className="text-lg text-[var(--ink)]">No unnecessary tracking</h2>
        <p>
          The local app does not embed advertising trackers. Analytics are not required to use the
          product.
        </p>
        <h2 className="text-lg text-[var(--ink)]">Your control</h2>
        <p>
          Use Fresh start in Coach to wipe local sessions and Voice Memory. Deleting the `data/`
          folder on disk removes stored files.
        </p>
        <h2 className="text-lg text-[var(--ink)]">Contact</h2>
        <p>Use Contact us in the app sidebar, or the repository maintainer email if published.</p>
      </section>
    </article>
  );
}
