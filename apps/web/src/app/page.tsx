import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { GUIDES } from "@/lib/guides";
import { OG_IMAGE, SITE_URL } from "@/lib/schema";

/**
 * The public landing page, and the only page most people see before deciding
 * whether to try this. It is a server component on purpose: the app's own
 * screens render nothing until they have a person's data, so a crawler
 * arriving at a client-rendered home found a loading state and left.
 *
 * That constraint also decides how the page moves. Nothing here imports from
 * components/ui.tsx, because that module is "use client" and pulling it in for
 * a button would ship the client runtime to the one page that must not need
 * it. Motion comes from the CSS in globals.css instead, and the FAQ is a
 * native <details>, so the page still costs no JavaScript.
 */

const SITE = SITE_URL;

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
    unit: "words / minute",
    p: "Words per minute across the whole recording and inside each section, so you can see exactly where you sped up.",
  },
  {
    h: "Filler words",
    unit: "count + rate",
    p: "Every um, uh, like, you know and so, counted and timestamped, with the rate per minute you can actually track.",
  },
  {
    h: "Pauses",
    unit: "seconds",
    p: "How long you pause, and whether those pauses land where meaning breaks or in the middle of your own sentences.",
  },
  {
    h: "Clarity",
    unit: "confidence %",
    p: "Word-level confidence, showing which words a listener is most likely to have missed entirely.",
  },
  {
    h: "Vocal energy",
    unit: "pitch range",
    p: "Pitch range and volume variation, which is most of what people mean when they call a speaker flat or monotone.",
  },
  {
    h: "Voice Memory",
    unit: "across sessions",
    p: "Your own history. After three recordings the coaching stops being generic and starts comparing you to you.",
  },
];

const STEPS = [
  {
    h: "Answer one question out loud.",
    p: "You get a prompt like the ones you would face in an interview, a standup or a pitch. Sixty seconds is enough.",
  },
  {
    h: "Read the report.",
    p: "Every number comes with the timestamp that produced it, so you can hear the moment rather than trust a score.",
  },
  {
    h: "Drill the worst habit.",
    p: "You get one exercise, not a list of twelve, chosen from what your own recording showed.",
  },
  {
    h: "Record again tomorrow.",
    p: "After three sessions the coaching compares you against your own history instead of an average.",
  },
];

/* -------------------------------------------------------------------------- */
/* Hero asset                                                                  */
/*                                                                             */
/* A voice product whose front door showed no voice. These are the same sample  */
/* figures the copy below already argues from, drawn rather than described, so  */
/* the shape of a report is legible before anyone scrolls or records. The       */
/* envelope is a fixed array and not anything random: this renders on the       */
/* server, and a random waveform would differ between the HTML and the client.  */
/* -------------------------------------------------------------------------- */

const WAVE = [
  0.18, 0.34, 0.52, 0.71, 0.63, 0.44, 0.58, 0.82, 0.94, 0.76, 0.51, 0.29, 0.12, 0.09, 0.14, 0.38,
  0.66, 0.88, 0.72, 0.55, 0.41, 0.62, 0.79, 0.91, 0.68, 0.47, 0.22, 0.11, 0.08, 0.16, 0.43, 0.69,
  0.85, 0.97, 0.74, 0.5, 0.33, 0.57, 0.78, 0.61, 0.39, 0.25, 0.15, 0.1,
];

const SAMPLE_READINGS = [
  ["Pace", "178", "wpm"],
  ["Fillers", "11", "in 0:58"],
  ["Longest pause", "0.3", "sec"],
] as const;

function SampleReport() {
  return (
    <div className="fv-glow-panel p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="fv-eyebrow-quiet">Sample report</span>
        <span className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span
            className="fv-rec-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--danger)]"
            aria-hidden
          />
          <span className="fv-num">0:58</span>
        </span>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[var(--r-md)] bg-[rgba(244,243,251,0.03)] p-3">
        <svg
          viewBox="0 0 440 96"
          className="block h-auto w-full"
          role="img"
          aria-label="Waveform of a sixty-second recording, with quiet gaps between phrases"
        >
          <defs>
            <linearGradient id="fv-wave-grad" gradientUnits="userSpaceOnUse" x1="0" x2="440">
              <stop offset="0%" stopColor="var(--violet)" />
              <stop offset="45%" stopColor="var(--indigo)" />
              <stop offset="100%" stopColor="var(--magenta)" />
            </linearGradient>
          </defs>
          {WAVE.map((v, i) => {
            const h = Math.max(3, Math.round(v * 88));
            return (
              <rect
                key={i}
                x={i * 10 + 2}
                y={(96 - h) / 2}
                width={6}
                height={h}
                rx={3}
                fill={v < 0.16 ? "var(--surface-3)" : "url(#fv-wave-grad)"}
              />
            );
          })}
        </svg>
        <span className="fv-sweep" aria-hidden />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--line)] pt-4">
        {SAMPLE_READINGS.map(([label, value, unit]) => (
          <div key={label}>
            <dt className="fv-eyebrow-quiet">{label}</dt>
            <dd className="fv-num mt-1.5 text-[19px] text-[var(--ink)]">
              {value}
              <span className="ml-1 text-[11px] tracking-normal text-[var(--faint)]">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-[13px] leading-relaxed text-[var(--muted)]">
        Fix first:{" "}
        <span className="text-[var(--ink)]">the pause you never take before a number.</span>
      </p>
    </div>
  );
}

/** Inline rather than imported from ui.tsx: see the note at the top of the file. */
function Arrow() {
  return (
    <svg
      className="fv-arrow"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema()) }}
      />
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-6">
        {/* The headline runs the full container and everything else sits in an
            offset row beneath it. Kept out of the left column on purpose: at
            half width the same sentence wrapped to three tight lines, and a
            front door should open in two. */}
        <section className="fv-halo fv-stagger py-16 lg:py-28">
          <p className="fv-eyebrow">Free, unlimited practice, no signup</p>
          <h1 className="fv-hero-lede mt-5 text-balance">
            Founder-level communication starts with hearing what you actually sound like
          </h1>

          <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <p className="text-[15.5px] leading-relaxed text-[var(--muted)]">
                Record sixty seconds of ordinary speech. FounderVoice measures your pace, filler
                words, pauses, clarity and vocal energy, then names the one habit costing you the
                most and gives you a drill to fix it. No account, no card, ten recordings every day.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link href="/onboarding" className="fv-hero">
                  Record your first minute
                  <Arrow />
                </Link>
                <Link href="/guides" className="fv-quiet-link text-[14px]">
                  Read the guides
                </Link>
              </div>
              <p className="mt-6 text-[12.5px] text-[var(--faint)]">
                Works in your browser. Nothing to install.
              </p>
            </div>

            <SampleReport />
          </div>
        </section>

        {/* A label column on the left holds the heading, so the prose keeps one
            readable measure instead of running the full width of the page. */}
        <section className="grid gap-8 border-t border-[var(--line)] py-24 md:grid-cols-[0.72fr_1.28fr] md:gap-12 lg:py-32">
          <h2 className="fv-reveal text-[24px] leading-tight text-balance text-[var(--ink)]">
            What most speaking advice gets wrong
          </h2>
          <div className="fv-scrub text-[15px] leading-relaxed text-[var(--muted)]">
            <p>
              Being told to slow down, sound confident or stop using filler words is not coaching.
              It names a symptom you already know about and leaves you with no way to tell whether
              anything changed.
            </p>
            <p className="mt-4">What actually moves a speaker forward is measurement.</p>

            {/* The three findings ran together inside this paragraph. They are
                three separate observations, and now they read as three. */}
            <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              <li className="py-3.5">
                You rushed to <span className="fv-num text-[var(--ink)]">178 words per minute</span>{" "}
                in the second half.
              </li>
              <li className="py-3.5">
                You said <em className="text-[var(--ink-dim)] not-italic">like</em>{" "}
                <span className="text-[var(--ink)]">eleven times</span> in ninety seconds, nine of
                them before a number.
              </li>
              <li className="py-3.5">
                Your longest pause was <span className="fv-num text-[var(--ink)]">0.3 seconds</span>
                , which is why nothing you said had room to land.
              </li>
            </ul>

            <p className="mt-5">
              Those are fixable. <span className="text-[var(--ink-dim)]">Sound more confident</span>{" "}
              is not.
            </p>
          </div>
        </section>

        {/* Hairlines group the six measures. Boxing each one would turn a
            reference list into six cards competing for the same attention. */}
        {/* These six were numbered 01-06. They are a set, not a sequence, so the
            numbering encoded something untrue; the unit each one is measured in
            is the thing a reader actually needs. The reveal sits on each entry
            rather than the section, so they cascade in as they cross the
            viewport — nesting two reveals would multiply their opacities. */}
        <section className="border-t border-[var(--line)] py-24 lg:py-32">
          <h2 className="fv-reveal text-[24px] leading-tight text-[var(--ink)]">
            What gets measured
          </h2>
          <div className="mt-9 grid gap-x-14 sm:grid-cols-2">
            {MEASURES.map((m) => (
              <div key={m.h} className="fv-reveal border-t border-[var(--line)] py-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-[15.5px] font-medium text-[var(--ink)]">{m.h}</h3>
                  <span className="fv-num text-[11px] text-[var(--faint)]">{m.unit}</span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{m.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Four steps as a run you move down, rather than four boxes. */}
        <section className="fv-reveal grid gap-8 border-t border-[var(--line)] py-24 md:grid-cols-[0.72fr_1.28fr] md:gap-12 lg:py-32">
          <div>
            <h2 className="text-[24px] leading-tight text-[var(--ink)]">How it works</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">
              Four minutes end to end, the first time you do it.
            </p>
          </div>
          <ol className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {STEPS.map((s, i) => (
              <li key={s.h} className="grid gap-x-6 gap-y-1.5 py-6 sm:grid-cols-[3rem_1fr]">
                <span className="fv-num font-mono text-[13px] text-[var(--faint)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-[15px] font-medium text-[var(--ink)]">{s.h}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--muted)]">{s.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* A rail, not a grid: six short entries in six equal boxes is the most
            generic shape a landing page can take. The overflow lives on the
            rail itself, so the page body never scrolls sideways. */}
        <section className="fv-reveal border-t border-[var(--line)] py-24 lg:py-32">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-[24px] leading-tight text-[var(--ink)]">Where founders use it</h2>
            <span className="fv-eyebrow-quiet hidden sm:block">Scroll</span>
          </div>
          <dl className="fv-rail mt-9">
            {USE_CASES.map(([h, p]) => (
              <div key={h}>
                <dt className="text-[15px] font-medium text-[var(--ink)]">{h}</dt>
                <dd className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{p}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="fv-reveal border-t border-[var(--line)] py-24 lg:py-32">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Who it is for</h2>
          <div className="mt-9 grid gap-x-14 gap-y-8 text-[15px] leading-relaxed text-[var(--muted)] sm:grid-cols-2">
            <p className="border-l border-[var(--line)] pl-5">
              <span className="text-[var(--ink)]">Founders pitching</span> investors, customers and
              press, where the first sixty seconds decide whether the meeting continues.
            </p>
            <p className="border-l border-[var(--line)] pl-5">
              <span className="text-[var(--ink)]">Operators and job seekers</span> preparing for
              interviews, standups and board updates where delivery decides the outcome.
            </p>
            <p className="border-l border-[var(--line)] pl-5">
              <span className="text-[var(--ink)]">Engineers and analysts</span> who know the
              material cold and lose the room in the first thirty seconds.
            </p>
            <p className="border-l border-[var(--line)] pl-5">
              <span className="text-[var(--ink)]">Anyone who hates their recorded voice</span> and
              wants a specific reason why rather than a vague feeling.
            </p>
          </div>
        </section>

        {/* The answers stay in the DOM whether or not a reader opens them, which
            is what makes <details> safe to use underneath FAQ schema. */}
        <section className="fv-reveal grid gap-8 border-t border-[var(--line)] py-24 md:grid-cols-[0.72fr_1.28fr] md:gap-12 lg:py-32">
          <h2 className="text-[24px] leading-tight text-[var(--ink)]">Common questions</h2>
          <div className="border-b border-[var(--line)]">
            {FAQS.map((f, i) => (
              <details key={f.q} className="fv-faq" open={i === 0}>
                <summary>
                  <span className="text-[15.5px] leading-snug font-medium">{f.q}</span>
                  <span className="fv-faq-mark" aria-hidden />
                </summary>
                <p className="fv-faq-a pr-8 pb-5 text-[14.5px] leading-relaxed text-[var(--muted)]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* The guides were two clicks deep behind a single hub link, which left
            the only organic-acquisition surface on the site with no equity from
            the front door. Descriptive anchors, not "read more". */}
        <section className="border-t border-[var(--line)] py-24 lg:py-32">
          <div className="fv-reveal flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-[24px] leading-tight text-[var(--ink)]">Start with the problem</h2>
            <Link href="/guides" className="fv-quiet-link text-[14px]">
              All {GUIDES.length} guides
            </Link>
          </div>
          <ul className="mt-9 grid gap-4 sm:grid-cols-2">
            {FEATURED_GUIDES.map((slug) => {
              const guide = GUIDES.find((g) => g.slug === slug);
              if (!guide) return null;
              return (
                <li key={slug} className="fv-reveal">
                  <Link href={`/guides/${guide.slug}`} className="fv-tile h-full">
                    <span className="block text-[15.5px] leading-snug text-[var(--ink-dim)]">
                      {guide.title}
                    </span>
                    <span className="mt-2 block text-[13.5px] leading-relaxed text-[var(--faint)]">
                      {guide.description}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="fv-reveal py-24 lg:py-32">
          <div className="fv-glow-panel grid items-center gap-8 p-8 md:grid-cols-[1.25fr_0.75fr] md:p-10">
            <div>
              <h2 className="text-[24px] leading-tight text-balance text-[var(--ink)]">
                One minute of speech is enough to start
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                You will know your pace, your filler rate and the one habit to fix before you finish
                reading this page.
              </p>
            </div>
            <div className="md:justify-self-end">
              <Link href="/onboarding" className="fv-hero">
                Start free
                <Arrow />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
