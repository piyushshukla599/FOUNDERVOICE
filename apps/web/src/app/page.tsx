import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES } from "@/lib/guides";
import { OG_IMAGE } from "@/lib/schema";

/**
 * The public landing page, and the only page most people see before deciding
 * whether to try this. It is a server component on purpose: the app's own
 * screens render nothing until they have a person's data, so a crawler
 * arriving at a client-rendered home found a loading state and left.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://foundervoice.app";

export const metadata: Metadata = {
  // Absolute so the home page does not inherit the "%s · FounderVoice"
  // template - Google appends the site name to a home page result itself, and
  // the doubled brand pushed the useful half of the title past the truncation.
  //
  // It deliberately does not say "AI speech coach". That phrase is contested by
  // products with years of authority, and it describes a category rather than
  // this product; "communication coach for founders" is the narrower claim this
  // site can actually earn.
  title: { absolute: "FounderVoice: AI Communication Coach for Founders" },
  description:
    "Practise your investor pitch, cut filler words and fix your speaking pace. Record sixty seconds and get delivery measured, with the one habit to fix first. Free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FounderVoice: AI Communication Coach for Founders",
    description:
      "Record sixty seconds. Learn exactly which habit is costing you the room, and how to fix it. Free, no signup.",
    url: SITE,
    type: "website",
    images: [OG_IMAGE],
  },
};

/** Linked from the body so the guides are one click from the front door. */
const FEATURED_GUIDES = [
  "how-to-stop-using-filler-words",
  "how-to-stop-talking-too-fast",
  "pitch-practice-for-founders",
  "how-to-prepare-for-investor-qa",
];

/** Where founders actually use this. Named because search intent lives here. */
const USE_CASES = [
  ["Investor pitches", "The sixty-second version, and the questions after it."],
  ["Customer demos", "Explaining the product to someone hearing it for the first time."],
  ["Podcasts and interviews", "Long-form answers where rambling costs you the edit."],
  ["Presentations", "Pace and pauses across ten minutes, not ten seconds."],
  ["Standups and board updates", "Short status that lands without filler."],
  ["Team communication", "The everyday case that decides how you are read."],
] as const;

const FAQS = [
  {
    q: "Is FounderVoice really free?",
    a: "Yes. You get ten recordings every 24 hours at no cost, with no account, no card and no trial period. The allowance resets a day after your first recording, so you can keep practising indefinitely.",
  },
  {
    q: "How do I communicate at a founder level?",
    a: "Improvement comes from hearing what you actually do, not from generic advice. Record yourself answering a real question, then measure four things: your speaking pace in words per minute, how often filler words appear, how long your pauses run, and how clearly each word is articulated. Fix the single worst one, then record again. FounderVoice measures all four automatically and tells you which to work on first.",
  },
  {
    q: "Do I need to change my accent to sound credible?",
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
    q: "Does it work with any accent?",
    a: "Yes. Transcription handles Indian, African, Australian, Singaporean and other accents well, and the analysis measures delivery rather than pronunciation against any one standard.",
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
            Founder-level communication starts with hearing what you actually sound like
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
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Where founders use it</h2>
          <dl className="mt-7 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(([h, p]) => (
              <div key={h}>
                <dt className="text-[15px] font-medium text-[var(--ink)]">{h}</dt>
                <dd className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{p}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Who it is for</h2>
          <div className="mt-6 grid max-w-3xl gap-5 text-[15px] leading-relaxed text-[var(--muted)] sm:grid-cols-2">
            <p>
              <span className="text-[var(--ink)]">Founders pitching</span> investors, customers and
              press, where the first sixty seconds decide whether the meeting continues.
            </p>
            <p>
              <span className="text-[var(--ink)]">Operators and job seekers</span> preparing for
              interviews, standups and board updates where delivery decides the outcome.
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

        {/* The guides were two clicks deep behind a single hub link, which left
            the only organic-acquisition surface on the site with no equity from
            the front door. Descriptive anchors, not "read more". */}
        <section className="border-t border-[var(--line)] py-14">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Start with the problem</h2>
          <ul className="mt-7 grid max-w-3xl gap-6 sm:grid-cols-2">
            {FEATURED_GUIDES.map((slug) => {
              const guide = GUIDES.find((g) => g.slug === slug);
              if (!guide) return null;
              return (
                <li key={slug}>
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="text-[15.5px] leading-snug text-[var(--ink-dim)] transition-colors hover:text-[var(--violet-bright)]"
                  >
                    {guide.title}
                  </Link>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--faint)]">
                    {guide.description}
                  </p>
                </li>
              );
            })}
          </ul>
          <Link
            href="/guides"
            className="mt-8 inline-block text-[14px] text-[var(--violet-bright)]"
          >
            All {GUIDES.length} guides
          </Link>
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
