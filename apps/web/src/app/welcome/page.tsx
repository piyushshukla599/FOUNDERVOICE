import Link from "next/link";

export const metadata = {
  title: "Welcome",
  description: "FounderVoice AI — free local-first executive speech coach.",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 20% 0%, rgba(61,143,110,0.22), transparent 55%), radial-gradient(700px 400px at 90% 10%, rgba(196,163,90,0.14), transparent 50%)",
          }}
        />
        <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div className="text-xs font-semibold tracking-[0.25em] uppercase text-[var(--accent)]">
            FounderVoice AI
          </div>
          <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <Link href="/privacy" className="hover:text-[var(--ink)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--ink)]">
              Terms
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-[#1a1510]"
            >
              Open app
            </Link>
          </nav>
        </header>

        <main className="relative mx-auto max-w-5xl px-6 pb-24 pt-10 md:pt-20">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
            v1.0 · 100% free · Local-first
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight md:text-6xl">
            The executive speech coach that remembers how <em>you</em> speak.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
            Most tools say “you spoke too fast.” FounderVoice answers why it happened, what caused
            it, and exactly how to fix it — with Voice Memory across weeks, not one-off scores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-[var(--accent-2)] px-5 py-3 text-sm font-semibold text-white"
            >
              Start recording
            </Link>
            <Link
              href="/listen"
              className="rounded-xl border border-[var(--line)] px-5 py-3 text-sm text-[var(--ink)]"
            >
              Try Smart Session
            </Link>
          </div>

          <ul className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                t: "Audio stays local",
                d: "Whisper and files run on your machine. We never store your voice in the cloud.",
              },
              {
                t: "Causal coaching",
                d: "Every finding: observation → cause → fix → exercise. Click timestamps to hear the evidence.",
              },
              {
                t: "Voice Memory",
                d: "Patterns across sessions. Personalized Labs drills and a daily mission from your weaknesses.",
              },
            ].map((item) => (
              <li key={item.t} className="rounded-2xl border border-[var(--line)] bg-[rgba(23,30,26,0.65)] p-5">
                <h2 className="font-[family-name:var(--font-display)] text-xl">{item.t}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.d}</p>
              </li>
            ))}
          </ul>

          <section className="mt-16 rounded-2xl border border-[var(--line)] bg-[rgba(23,30,26,0.65)] p-6 md:p-8">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">How to run</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Start the local API (`start-api.bat` or uvicorn on port 8000).</li>
              <li>Start the web app (`npm run dev` in `apps/web`).</li>
              <li>Open Record — speak — get a full session report.</li>
            </ol>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Full docs: see the repository <code className="text-[var(--accent)]">docs/</code> folder.
            </p>
          </section>
        </main>

        <footer className="relative border-t border-[var(--line)] px-6 py-8 text-center text-xs text-[var(--muted)]">
          FounderVoice AI — free forever for individuals. Privacy-first. No accounts required for local use.
        </footer>
      </div>
    </div>
  );
}
