import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

/**
 * The public landing page, and the only page most people see before deciding
 * whether to try this. It is a server component on purpose: the app's own
 * screens render nothing until they have a person's data, so a crawler
 * arriving at a client-rendered home found a loading state and left.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://foundervoice.app";

export const metadata: Metadata = {
  title: "Free AI Speech Coach: Improve English Communication and Speaking Skills",
  description:
    "Record yourself for 60 seconds and get instant feedback on pace, filler words, clarity and confidence. A free AI communication coach for English speakers, with no signup and no card.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Free AI Speech Coach for Better English Communication",
    description:
      "Record 60 seconds. Learn exactly which habit is costing you, and how to fix it. Free, no signup.",
    url: SITE,
    type: "website",
  },
};

const FAQS = [
  {
    q: "Is FounderVoice really free?",
    a: "Yes. You get ten recordings every 24 hours at no cost, with no account, no card and no trial period. The allowance resets a day after your first recording, so you can keep practising indefinitely.",
  },
  {
    q: "How can I improve my English communication skills?",
    a: "Improvement comes from hearing what you actually do, not from generic advice. Record yourself answering a real question, then measure four things: your speaking pace in words per minute, how often filler words appear, how long your pauses run, and how clearly each word is articulated. Fix the single worst one, then record again. FounderVoice measures all four automatically and tells you which to work on first.",
  },
  {
    q: "Do I need a good accent to communicate well in English?",
    a: "No. Clarity, pace and structure carry almost all of how competent you sound, and none of them require changing your accent. FounderVoice never scores you on sounding native. It measures whether you are understandable and whether you sound confident.",
  },
  {
    q: "What is a good speaking pace?",
    a: "Around 130 to 150 words per minute works for most rooms. Faster than about 170 and listeners stop retaining detail. Slower than about 110 and attention drifts. Nervous speakers usually drift fast without noticing, which is why measuring it matters more than trying to feel it.",
  },
  {
    q: "How do I stop saying um and uh?",
    a: "Fillers appear where you are thinking and afraid of silence. The fix is not removing them directly but becoming comfortable pausing instead. Record a minute, count your fillers, then record again while deliberately pausing where they appeared. Most people halve their rate within a week.",
  },
  {
    q: "Does it work for accents other than American or British English?",
    a: "Yes. Transcription handles Indian, African, Australian, Singaporean and other English accents well, and the analysis measures delivery rather than pronunciation against any one standard.",
  },
];

function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const MEASURES = [
  {
    h: "Speaking pace",
    p: "Words per minute across the whole recording and inside each section, so you can see exactly where you sped up.",
  },
  {
    h: "Filler words",
    p: "Every um, uh, like, you know and so, counted and timestamped, with the rate per minute you can actually track.",
  },
  {
    h: "Pauses",
    p: "How long you pause, and whether those pauses land where meaning breaks or in the middle of your own sentences.",
  },
  {
    h: "Clarity",
    p: "Word-level confidence, showing which words a listener is most likely to have missed entirely.",
  },
  {
    h: "Vocal energy",
    p: "Pitch range and volume variation, which is most of what people mean when they call a speaker flat or monotone.",
  },
  {
    h: "Voice Memory",
    p: "Your own history. After three recordings the coaching stops being generic and starts comparing you to you.",
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema()) }}
      />
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-14 text-center md:py-20">
          <p className="fv-eyebrow">Free, unlimited practice, no signup</p>
          <h1 className="fv-lede mx-auto mt-4 max-w-3xl text-balance">
            Improve your English communication by hearing what you actually sound like
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-[var(--muted)]">
            Record sixty seconds of ordinary speech. FounderVoice measures your pace, filler words,
            pauses, clarity and vocal energy, then names the one habit costing you the most and
            gives you a drill to fix it. No account, no card, ten recordings every day.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-full bg-[var(--accent)] px-7 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Record your first minute
            </Link>
            <Link href="/guides" className="text-[14px] text-[var(--violet-bright)]">
              Read the guides
            </Link>
          </div>
          <p className="mt-5 text-[12.5px] text-[var(--faint)]">
            Works in your browser. Nothing to install.
          </p>
        </section>

        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">
            What most speaking advice gets wrong
          </h2>
          <div className="mt-5 max-w-3xl space-y-4 text-[15px] leading-relaxed text-[var(--muted)]">
            <p>
              Being told to slow down, sound confident or stop using filler words is not coaching.
              It names a symptom you already know about and leaves you with no way to tell whether
              anything changed.
            </p>
            <p>
              What actually moves a speaker forward is measurement. You rushed to 178 words per
              minute in the second half. You said like eleven times in ninety seconds, nine of them
              before a number. Your longest pause was 0.3 seconds, which is why nothing you said had
              room to land. Those are fixable. Sound more confident is not.
            </p>
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">What gets measured</h2>
          <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {MEASURES.map((m) => (
              <div key={m.h}>
                <h3 className="text-[15px] font-medium text-[var(--ink)]">{m.h}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{m.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">How it works</h2>
          <ol className="mt-6 max-w-2xl space-y-5 text-[15px] leading-relaxed text-[var(--muted)]">
            <li>
              <span className="text-[var(--ink)]">1. Answer one question out loud.</span> You get a
              prompt like the ones you would face in an interview, a standup or a pitch. Sixty
              seconds is enough.
            </li>
            <li>
              <span className="text-[var(--ink)]">2. Read the report.</span> Every number comes with
              the timestamp that produced it, so you can hear the moment rather than trust a score.
            </li>
            <li>
              <span className="text-[var(--ink)]">3. Drill the worst habit.</span> You get one
              exercise, not a list of twelve, chosen from what your own recording showed.
            </li>
            <li>
              <span className="text-[var(--ink)]">4. Record again tomorrow.</span> After three
              sessions the coaching compares you against your own history instead of an average.
            </li>
          </ol>
        </section>

        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Who it is for</h2>
          <div className="mt-6 grid max-w-3xl gap-5 text-[15px] leading-relaxed text-[var(--muted)] sm:grid-cols-2">
            <p>
              <span className="text-[var(--ink)]">Non-native English speakers</span> who are fluent
              on paper but rush and lose people in conversation.
            </p>
            <p>
              <span className="text-[var(--ink)]">Founders and job seekers</span> preparing for
              pitches, interviews and investor calls where delivery decides the outcome.
            </p>
            <p>
              <span className="text-[var(--ink)]">Engineers and analysts</span> who know the
              material cold and lose the room in the first thirty seconds.
            </p>
            <p>
              <span className="text-[var(--ink)]">Anyone who hates their recorded voice</span> and
              wants a specific reason why rather than a vague feeling.
            </p>
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Common questions</h2>
          <dl className="mt-7 max-w-3xl space-y-7">
            {FAQS.map((f) => (
              <div key={f.q}>
                <dt className="text-[15.5px] font-medium text-[var(--ink)]">{f.q}</dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-[var(--line)] py-16 text-center">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">
            One minute of speech is enough to start
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
            You will know your pace, your filler rate and the one habit to fix before you finish
            reading this page.
          </p>
          <Link
            href="/onboarding"
            className="mt-7 inline-block rounded-full bg-[var(--accent)] px-7 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
