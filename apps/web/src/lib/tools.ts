/**
 * The product pages.
 *
 * These exist because of a specific failure. Every commercial search this
 * product could win - "filler word counter", "speaking pace test", "AI pitch
 * practice" - had exactly one page pointed at it: the homepage. Google ranks
 * pages, not sites, and one page cannot be the best result for a dozen
 * different commercial intents. It ends up a mediocre result for all of them.
 *
 * The guides in lib/guides.ts answer the *question* searches; these answer the
 * *tool* searches, which are a different intent with a different SERP. Someone
 * typing "filler word counter" is not looking for an essay on why people say
 * um. They are looking for the thing that counts them, and Google knows it -
 * which is why an article, however good, loses that query to a page that is
 * visibly the tool.
 *
 * Each page describes one measurement this product actually produces. Nothing
 * here claims a capability the API does not have; the metrics named below map
 * to real fields in apps/api/app/services/analysis.py, and "what it does not
 * do" is on every page for the same reason the guides name their own limits.
 */

import { GUIDES } from "@/lib/guides";

export type ToolSection = {
  h: string;
  p: string[];
  list?: { ordered?: true; items: string[] };
  table?: { caption: string; head: string[]; rows: string[][] };
};

export type Tool = {
  slug: string;
  /** The H1. Leads with what the thing is, in the words people type. */
  h1: string;
  /** Under 60 characters where it can be. */
  metaTitle: string;
  description: string;
  /** The extractable answer, 40-55 words, in its own block under the H1. */
  answer: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  published: string;
  updated: string;
  /** The one measurement this page is about, named as the product names it. */
  measures: string;
  sections: ToolSection[];
  faqs: { q: string; a: string }[];
  /** Guide slugs. The tool page ranks; the guide explains. Both directions. */
  guides: string[];
  cta: { label: string; href: string };
};

/** Shared, because the free allowance is one fact and must not drift. It
 *  mirrors `free_upload_limit` and `free_practice_limit` in
 *  apps/api/app/config.py, and the `offers` node in app/layout.tsx. */
export const FREE_ALLOWANCE =
  "Ten recordings every 24 hours and two practice rounds. No account, no card.";

export const TOOLS: Tool[] = [
  {
    slug: "filler-word-counter",
    h1: "Free Filler Word Counter",
    metaTitle: "Free Filler Word Counter",
    description:
      "Count um, uh, like and you know in your own speech, with a timestamp on every one and a rate per minute you can compare week to week. Free, in the browser, no signup.",
    answer:
      "A filler word counter transcribes your speech and counts every um, uh, like, you know, so, actually and basically, then divides by the length to give a rate per minute. FounderVoice does this free in the browser, with a timestamp on each filler so you can hear the moment that produced it.",
    primaryKeyword: "filler word counter",
    secondaryKeywords: [
      "count filler words online",
      "um counter",
      "filler word tracker",
      "how many filler words do i say",
    ],
    published: "2026-08-24",
    updated: "2026-08-24",
    measures: "Filler count, filler rate per minute, and the timestamp behind each one",
    sections: [
      {
        h: "What it counts",
        p: [
          "Seven fillers, because those seven cover almost everything people actually produce under pressure. Counting a longer list makes the number look worse without making it more useful, and counting only um makes it look better while hiding the substitution most speakers make the moment they try to stop.",
          "The rate matters more than the count. Twelve fillers in ninety seconds and eight in sixty are the same habit, and only the rate says so. That is the number to write down.",
        ],
        table: {
          caption: "The filler words counted, and where each one tends to appear",
          head: ["Filler", "Usually appears"],
          rows: [
            ["um, uh", "Before a number or a name you are not certain of"],
            ["like", "Mid-sentence, while the next clause is still being planned"],
            ["you know", "At the seam between two ideas, checking for agreement"],
            ["so", "At the start of an answer, buying the first half-second"],
            ["actually, basically", "Ahead of a correction or a simplification"],
          ],
        },
      },
      {
        h: "How to use it",
        p: [
          "The whole thing takes about ninety seconds, and the only part that matters is that the prompt is one you have not rehearsed. A prepared paragraph read aloud produces almost no fillers regardless of skill, which makes it useless as a measurement.",
        ],
        list: {
          ordered: true,
          items: [
            "Open the recorder and answer a question you have not prepared, for sixty seconds.",
            "Read the count and the rate per minute. Do not try to fix anything yet.",
            "Play back the two or three timestamps with the most fillers around them and listen to what you were doing.",
            "Record the same prompt again with one instruction: when the filler comes, close your mouth instead.",
            "Repeat daily for a week. Most people roughly halve the rate, and the plateau after that is a different problem.",
          ],
        },
      },
      {
        h: "What the number means",
        p: [
          "There is no benefit in chasing zero. Speakers who reach zero usually get there by over-rehearsing, and that costs more in warmth than the fillers ever cost in credibility.",
        ],
        table: {
          caption: "Filler rate, and what a listener registers at each level",
          head: ["Fillers per minute", "What a listener registers"],
          rows: [
            ["Under 3", "Nothing. This is ordinary speech"],
            ["3 to 8", "Something is off, without being able to name it"],
            ["Above 8", "The fillers instead of the point"],
          ],
        },
      },
      {
        h: "What it does not do",
        p: [
          "It does not sit in your live calls. There is no meeting bot, so what it measures is a rehearsal you made on purpose rather than the real thing.",
          "It does not judge your accent, and it should not. Clarity is measured per word against how clearly that word arrived, not against a reference accent.",
          "It does not do video. Gesture, posture and eye contact are outside what a microphone can tell you, and a tool that claims otherwise from audio alone is guessing.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is this filler word counter free?",
        a: "Yes. Ten recordings every 24 hours with no account and no card. The allowance recurs daily rather than being a lifetime handful, because reducing a filler habit takes about two weeks of daily repetition and a five-attempt trial runs out before the useful part starts.",
      },
      {
        q: "How accurate is the filler count?",
        a: "It counts what the transcript contains, so accuracy tracks the transcription. Clear audio at a normal speaking distance is counted reliably; heavy background noise or a very distant microphone costs accuracy on short fillers first, since um and uh are the easiest words to lose.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. It records in the browser using the microphone you already have. There is no app, no extension and no meeting bot to add to a call.",
      },
      {
        q: "How many filler words per minute is normal?",
        a: "Under 3 per minute is ordinary speech that nobody notices. Between 3 and 8 a critical listener registers something without being able to name it. Above 8 the fillers become the content, which is the level at which people describe a speaker as unprepared even when the substance was strong.",
      },
    ],
    /* Ordered by relevance: the first four are shown on the page, and the
       whole list drives the reverse link from each of those guides back to
       here. Every guide belongs to exactly one tool for that reason - a guide
       that appears on no tool page is a page with no route to the product. */
    guides: [
      "how-to-stop-using-filler-words",
      "how-to-use-pauses-when-speaking",
      "how-to-speak-with-confidence",
      "free-ai-communication-tools",
      "ai-speaking-partner",
    ],
    cta: { label: "Count my filler words", href: "/onboarding" },
  },

  {
    slug: "speaking-pace-test",
    h1: "Speaking Pace Test: Your Words Per Minute",
    metaTitle: "Speaking Pace Test (Words Per Minute)",
    description:
      "Measure your speaking pace in words per minute from a sixty-second recording, for the whole clip and section by section, so you can see the exact point where you sped up. Free, no signup.",
    answer:
      "A speaking pace test measures how many words per minute you actually speak. Record sixty seconds of unrehearsed speech and the transcript word count divided by the length gives your rate. Most situations want 130 to 150 words per minute; above 170 a listener follows the words and retains almost none of them.",
    primaryKeyword: "speaking pace test",
    secondaryKeywords: [
      "words per minute speaking test",
      "how fast do i talk",
      "wpm speaking calculator",
      "measure speaking speed",
    ],
    published: "2026-08-24",
    updated: "2026-08-24",
    measures: "Words per minute overall and per section, with the point where the pace changed",
    sections: [
      {
        h: "Why one average is not enough",
        p: [
          "A single number for a whole recording hides the thing that actually costs you the room. A clip that starts at 140 and ends at 180 has an average that looks fine and reads to a listener as increasingly rattled. The variance carries the signal, not the mean.",
          "So the pace is measured across the whole clip and inside each section, which is what makes it possible to point at the exact sentence where you accelerated - almost always the one you were least sure about.",
        ],
      },
      {
        h: "What to aim for",
        p: [
          "The target moves with the material. Unfamiliar or technical content belongs slower, because every unfamiliar term costs the listener a beat they have to take out of the next sentence.",
        ],
        table: {
          caption: "Target speaking pace by situation",
          head: ["Situation", "Words per minute"],
          rows: [
            ["Conversation", "140-160"],
            ["Presentation or talk", "130-150"],
            ["Investor pitch", "130-150"],
            ["Technical explanation", "110-130"],
            ["Podcast", "150-170"],
          ],
        },
      },
      {
        h: "How to take the test",
        p: [
          "Sixty seconds is the shortest recording that gives a stable number. Thirty seconds swings too much on a single long pause, and anything longer stops being something you will do daily.",
        ],
        list: {
          ordered: true,
          items: [
            "Answer a question you have not rehearsed for sixty seconds. Reading a prepared paragraph measures your reading speed, not your speaking pace.",
            "Read the overall words per minute, then the per-section figures underneath it.",
            "Find the section furthest above the rest. That is the material you are least comfortable with, whatever you believed it was.",
            "Record again, stopping fully at the end of each thought. Do not slow the words themselves - that produces a drawl and does not survive past the first sentence.",
            "Compare the two. A pace of 175 typically lands between 135 and 145 with nothing changed but the stops.",
          ],
        },
      },
      {
        h: "What it does not do",
        p: [
          "It does not tell you to slow down, because that instruction does not work. Pace comes down when silence goes in between thoughts, and stays down because pausing is easier to sustain than drawling.",
          "It does not measure a live meeting. What it measures is a rehearsal, which is the only setting where the same prompt at the same length a week later means anything.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is a good speaking pace in words per minute?",
        a: "130 to 150 words per minute suits most situations. Go nearer 120 for technical or unfamiliar material and up to 160 for a story told to a familiar room. Below 110 sounds laboured; above 170 a listener can follow the words but retains very little of what you said.",
      },
      {
        q: "How do I measure my speaking speed without a tool?",
        a: "Record sixty seconds, transcribe it, count the words and divide by the length in minutes. At exactly sixty seconds the word count is the rate. Do it on two different prompts, because one recording measures that recording rather than you.",
      },
      {
        q: "Is the speaking pace test free?",
        a: "Yes. Ten recordings every 24 hours, in the browser, with no account and no card.",
      },
      {
        q: "Does speaking faster make me sound more confident?",
        a: "No. It reads as urgency rather than confidence, and above about 160 words per minute a listener stops retaining. What reads as confidence is a pace that does not change when you reach the part you are least sure of.",
      },
    ],
    guides: [
      "ideal-speaking-pace-words-per-minute",
      "how-to-stop-talking-too-fast",
      "how-to-stop-rambling",
      "how-to-improve-english-communication-skills",
      "free-ai-public-speaking-practice",
    ],
    cta: { label: "Measure my speaking pace", href: "/onboarding" },
  },

  {
    slug: "pitch-practice",
    h1: "AI Pitch Practice for Founders",
    metaTitle: "AI Pitch Practice for Founders",
    description:
      "Rehearse your investor pitch out loud and get delivery measured: pace, filler rate, pause placement, clarity and vocal energy, plus practice rounds where an AI pushes back on your answers. Free.",
    answer:
      "AI pitch practice means rehearsing your pitch out loud and getting the delivery measured rather than judged by memory. Record the sixty-second version and get pace, filler rate, pause placement, clarity and vocal energy, each with the timestamp behind it, then practise the questions with an AI that pushes back.",
    primaryKeyword: "ai pitch practice",
    secondaryKeywords: [
      "practice investor pitch online",
      "pitch practice tool",
      "rehearse startup pitch",
      "investor pitch simulator",
    ],
    published: "2026-08-24",
    updated: "2026-08-24",
    measures: "All five delivery numbers, plus practice rounds against a sceptical counterpart",
    sections: [
      {
        h: "Rehearsing the deck is not rehearsing the pitch",
        p: [
          "Rereading slides rehearses recognition. You finish knowing the deck better and sounding exactly the same, because nothing about the delivery was exercised. Investors are responding to the delivery.",
          "The gap shows up most clearly in length. Founders routinely deliver a sixty-second pitch in two minutes and are certain it was under a minute, because the estimate is made from the inside where planning time is invisible.",
        ],
      },
      {
        h: "What gets measured",
        p: [
          "Five numbers, each with the moment behind it, so you can hear what produced it rather than take the number on trust.",
        ],
        table: {
          caption: "What a recorded pitch rehearsal returns",
          head: ["Measurement", "What it tells you", "Target"],
          rows: [
            ["Speaking pace", "Whether you accelerate into the uncertain part", "130-150 wpm, stable"],
            ["Filler rate", "Whether you read as prepared", "Under 3 per minute"],
            ["Pause placement", "Whether the ask lands as an ask", "0.5-1.5s at thought ends"],
            ["Clarity", "Which words a listener would miss", "Under 5% unclear"],
            ["Vocal energy", "Whether pitch flattens under pressure", "Range that does not collapse"],
          ],
        },
      },
      {
        h: "Practice rounds, where an AI pushes back",
        p: [
          "Recording measures the pitch. It does not reproduce the moment a question arrives mid-sentence, which is where most founders lose the four behaviours they had held for the previous minute.",
          "Practice mode plays a role - a standup lead, a sceptical operator, a seed investor - and follows up on the weak half of your answer rather than moving politely to the next question. The free allowance there is two rounds, which is smaller than for recording, and that is honest about what each costs to run.",
        ],
        list: {
          items: [
            "Record the sixty-second version first, so there is a baseline to compare against.",
            "Then run a practice round on the questions you are dreading rather than the ones you enjoy.",
            "Record an answer immediately afterwards, while the pressure is still in your voice - that is the recording worth measuring.",
          ],
        },
      },
      {
        h: "What it does not do",
        p: [
          "It does not evaluate your business. Nothing here has an opinion on your market size, your traction or whether the round is priced sensibly, and a tool that claimed to would be guessing from a transcript.",
          "It does not join a real investor call. There is no meeting bot. What it gives you is the rehearsal, measured honestly, and a counterpart to practise the questions against.",
          "It does not do video, so eye contact, gesture and posture are outside what it measures.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the AI pitch practice free?",
        a: "Recording is free at ten a day with no account. Practice rounds, where an AI plays a counterpart and pushes back, are free at two rounds - a smaller allowance, because a live back-and-forth costs considerably more to run than analysing a recording.",
      },
      {
        q: "How long should a practised pitch be?",
        a: "Have a sixty-second version that survives being cut off, and a longer one you never reach for unless asked. The sixty-second version is the one to rehearse daily, because the first sixty to ninety seconds is where an investor decides whether to keep listening properly.",
      },
      {
        q: "What should I practise the week before a pitch?",
        a: "The questions, not the script. The pitch is the part founders rehearse and the questions are the part that decides the meeting. Build a bank of the ten you are dreading, answer each cold and timed, and check that your pace and filler rate on those hold near your baseline.",
      },
      {
        q: "Can it tell me whether my pitch is good?",
        a: "It can tell you how it was delivered, precisely, and it will not pretend to tell you anything about the business. Delivery is the half that is measurable and the half that decides the first ninety seconds, which is why it is the half this measures.",
      },
    ],
    guides: [
      "pitch-practice-for-founders",
      "investor-pitch-delivery",
      "how-to-prepare-for-investor-qa",
      "how-to-sound-confident-in-an-investor-pitch",
      "how-to-communicate-as-a-founder",
      "how-to-explain-your-startup-clearly",
      "yoodli-alternatives",
    ],
    cta: { label: "Record my pitch", href: "/onboarding" },
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/**
 * The reverse of `Tool.guides`, so a guide can link to the tool that measures
 * what it is about without a second list to keep in step with the first.
 *
 * This direction is the one that was missing. A guide with no route to the
 * product is a page that ranks and does nothing, and "related guides" tiles
 * pointing only at more guides is a section of a site that circulates its own
 * traffic.
 */
export function toolsForGuide(guideSlug: string): Tool[] {
  return TOOLS.filter((t) => t.guides.includes(guideSlug));
}

/**
 * Same rule as the guides: two pages holding one primary keyword compete for
 * one result and split the signal. Failing the build is cheap now and
 * expensive to diagnose from a ranking chart in three months.
 */
function assertNoDuplicatePrimaries() {
  const seen = new Map<string, string>();
  for (const t of TOOLS) {
    const key = t.primaryKeyword.trim().toLowerCase();
    const owner = seen.get(key);
    if (owner) {
      throw new Error(
        `Keyword cannibalisation: "${t.primaryKeyword}" is the primary keyword of both ` +
          `${owner} and ${t.slug}.`,
      );
    }
    seen.set(key, t.slug);
  }
}

/**
 * The tool pages and the guides are one cluster, not two sections that happen
 * to share a site. The tool page wins the commercial query and the guide wins
 * the question; each is worth much more with a link from the other, and a
 * `guides` entry naming a slug that does not exist is a dead link inside the
 * only part of that arrangement a crawler can see.
 */
function assertGuidesResolve() {
  const slugs = new Set(GUIDES.map((g) => g.slug));
  for (const t of TOOLS) {
    for (const slug of t.guides) {
      if (!slugs.has(slug)) {
        throw new Error(`Tool ${t.slug} links to /guides/${slug}, which is not a guide.`);
      }
    }
  }
}

assertNoDuplicatePrimaries();
assertGuidesResolve();
