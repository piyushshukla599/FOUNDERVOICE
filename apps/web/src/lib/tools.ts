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
  /* `intro` is rendered by GuideSection, which tool pages share with the
     guides. It was missing from this type only, so a tool list could not
     introduce itself the way a guide list can. */
  list?: { ordered?: true; intro?: string; items: string[] };
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
  /* --------------------------------------------------------------- 2026-09
     Three head terms that had no page pointed at them. "ai communication
     coach" and "public speaking practice" were being answered by the homepage,
     which is also trying to be the founder positioning page and therefore wins
     neither; "presentation practice" was not answered at all, despite being
     the situation most people arrive from. */
  {
    slug: "ai-communication-coach",
    h1: "Free AI Communication Coach",
    metaTitle: "Free AI Communication Coach",
    description:
      "Record sixty seconds and get your communication measured: speaking pace, filler rate, pause placement, clarity and vocal energy, each with the timestamp behind it. No account, no card.",
    answer:
      "An AI communication coach measures how you speak rather than what you say. Record sixty seconds in the browser and get speaking pace overall and per section, filler count and rate, pause length and placement, word-level clarity and pitch range, each with the moment behind it. Ten recordings every 24 hours, free.",
    primaryKeyword: "ai communication coach",
    secondaryKeywords: [
      "free ai communication coach",
      "online communication coach",
      "ai coach for communication skills",
      "improve communication with ai",
      "communication skills ai tool",
    ],
    published: "2026-09-02",
    updated: "2026-09-02",
    measures: "All five delivery numbers, with the timestamp behind each one",
    sections: [
      {
        h: "What an AI can and cannot coach",
        p: [
          "It can measure delivery, precisely and repeatably. How fast you spoke, where you sped up, how many fillers and at which second, how long your pauses were and whether they landed before your point or in the middle of a sentence, which words came out too soft or too rushed to survive the trip to a listener, and whether your pitch flattened after the first minute. All of that is signal processing on audio, and a machine does it better than a human listener because a human listener is busy following your argument.",
          "It cannot tell you whether your argument was any good. Judgement calls - what to cut, what to lead with, whether that analogy will land with this particular room, how to handle someone hostile - are still a human coach's job, and a tool claiming otherwise is guessing from a transcript.",
          "The useful split is that the measurable half is also the half that fails first. Most people do not lose a room because their reasoning was weak. They lose it because they went at 180 words per minute with no pause before the conclusion, and nobody has ever told them.",
        ],
      },
      {
        h: "The five numbers, and what a bad reading means",
        p: [
          "Every number comes with the moment that produced it, so you can play back the second in question rather than take the figure on trust. A score with no evidence trail cannot be argued with, and cannot teach you anything.",
        ],
        table: {
          caption: "What one recording returns",
          head: ["Measurement", "Working target", "What a bad reading usually means"],
          rows: [
            ["Speaking pace", "130-150 wpm, stable", "You accelerate through the part you are unsure of"],
            ["Filler rate", "Under 3 per minute", "You are composing while speaking rather than recalling"],
            ["Pause placement", "0.5-1.5s at thought ends", "Every sentence is landing at the same weight"],
            ["Clarity", "Under 5% unclear", "You are outrunning your own articulation"],
            ["Vocal energy", "Range that does not collapse", "Attention drops off after about a minute"],
          ],
        },
      },
      {
        h: "Why one number matters more than five",
        p: [
          "A report listing twelve things to fix is a report. Attention is the scarce resource in changing a habit, and a list of twelve spends all of it deciding where to start.",
          "So the readout names one habit - whichever is furthest from its working target and most likely to be dragging the others with it. Pace usually is: a fast speaker loses pauses, gains fillers and loses clarity all at once, which means three of the five numbers move when you fix one.",
          "After several sessions the comparison shifts from targets to your own history, which is the reading that actually means something. Four fillers a minute is neither good nor bad in isolation. Four when it was seven a fortnight ago is the whole point.",
        ],
        list: {
          intro: "The routine that works, in about ten minutes total across two weeks:",
          items: [
            "Sixty seconds a day, same prompt every day, so the comparison between days is real.",
            "Use a question you find genuinely uncomfortable, not a script - a script removes the composing pressure that produces the problem.",
            "One take, no restarts. A restart edits out the exact moment worth measuring.",
            "Work on one number until it holds, then move to the next. Two weeks per habit is the realistic pace.",
          ],
        },
      },
      {
        h: "Free, and what that means here",
        p: [
          "Ten recordings every 24 hours, no account and no card, and the allowance refills daily rather than being a lifetime handful. That distinction is the one that decides whether a free tier can change anything: habit change takes about two weeks of repetition, and five lifetime attempts is an evaluation of the product, not a fortnight of practice.",
          "Practice rounds - where an AI plays a standup lead, a sceptical operator or a seed investor and pushes back on the weak half of your answer - are two rounds free. A smaller allowance, because a live back-and-forth with a model costs considerably more to run than analysing a recording, and pretending otherwise would mean quietly withdrawing it later.",
          "Nothing is gated behind an email address, and there is no card field anywhere in the free path. What an account adds later is history: the comparison against your own past sessions, which has nothing to attach to when there is no account.",
        ],
      },
      {
        h: "What it does not do",
        p: [
          "No video. Eye contact, gesture and posture are a separate channel and outside what this measures, so if body language is your question, this is the wrong tool.",
          "No meeting bot. It will not join your calls, which means it cannot see the failure that only appears when other people are in the room. That is a real category of problem and it needs a meeting copilot instead.",
          "No opinion on your content. It will not tell you your market sizing is optimistic or your analogy is confusing, because a tool making that call from a transcript would be guessing, and a confident guess is worse than silence.",
          "It is not language learning. It measures delivery, not grammar or vocabulary, so it is useful to a non-native speaker for exactly the same reasons it is useful to anyone else and no more than that.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is an AI communication coach?",
        a: "A tool that measures how you speak rather than what you say. It takes a recording and returns speaking pace, filler count and rate, pause length and placement, word-level clarity and vocal energy, ideally with the timestamp behind each figure. It replaces the guesswork in self-assessment, not the judgement of a human coach.",
      },
      {
        q: "Is this AI communication coach free?",
        a: "Recording is free at ten a day, with no account and no card, and the allowance refills every 24 hours rather than running out permanently. Practice rounds against an AI counterpart are free at two rounds - a smaller number, because a live conversation costs much more to run than analysing a clip.",
      },
      {
        q: "Can AI really improve your communication skills?",
        a: "For the measurable habits, yes. Pace, filler rate, pause placement and clarity all shift inside about two weeks of daily one-minute recordings, because the correction is usually obvious once the number is in front of you. For structure, argument and reading a room, a human coach is still better.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. It records in the browser using the microphone permission your browser already manages, and the analysis runs server-side on the clip. There is no app to install and no extension. Anything in this category asking you to install a desktop application is usually a meeting copilot, which solves a different problem.",
      },
      {
        q: "Will it penalise my accent?",
        a: "It measures articulation and audibility rather than conformity to an accent, so clean speech in any accent should score as clear. The honest way to check that claim on any tool, this one included, is to record something you know was perfectly clear and see whether the clarity number drops.",
      },
    ],
    guides: [
      "best-ai-communication-coach",
      "free-ai-communication-coach-no-signup",
      "free-ai-communication-tools",
      "speaking-skills-in-communication",
      "how-to-communicate-as-a-founder",
      "ai-speaking-partner",
      "yoodli-alternatives",
    ],
    cta: { label: "Measure my delivery free", href: "/onboarding" },
  },
  {
    slug: "presentation-practice",
    h1: "Presentation Practice: Rehearse Out Loud, Free",
    metaTitle: "Free Presentation Practice Tool",
    description:
      "Rehearse a presentation out loud and get the delivery measured: length, speaking pace, filler rate, pause placement and clarity, so you find the problems before the room does.",
    answer:
      "Presentation practice works when you deliver out loud, timed, without stopping - and record at least one run. Record sixty seconds of your opening and get length, speaking pace overall and per section, filler count and rate, pause placement and word-level clarity, so you can see the overrun and the rush before the day.",
    primaryKeyword: "presentation practice tool",
    secondaryKeywords: [
      "practice presentation online free",
      "college presentation practice",
      "rehearse presentation with ai",
      "practice speaking for class presentation",
      "presentation rehearsal tool",
    ],
    published: "2026-09-02",
    updated: "2026-09-02",
    measures: "Length and pace against your slot, plus fillers, pauses and clarity",
    sections: [
      {
        h: "The two ways presentations go wrong, and both are measurable",
        p: [
          "They run over, and they go too fast. These are the same failure seen from two angles: a talk rehearsed silently is estimated at roughly two thirds of its real length, so the speaker plans for eight minutes, discovers on the day that they are at minute nine with three slides left, and accelerates through the ending - which is the part they most needed the room to follow.",
          "Neither problem is visible from the inside. You cannot time a talk you rehearsed in your head, and you cannot hear your own pace while producing it, because the brain substitutes the version you intended for the version you delivered.",
          "Both are trivially visible from a recording. Length is a number. Pace is a number, and a pace that climbs across the clip is the acceleration you could not feel, plotted.",
        ],
      },
      {
        h: "What a recorded rehearsal returns",
        p: [
          "You do not need to record the whole talk. Sixty seconds of the opening and sixty of the section you find hardest surfaces almost everything worth fixing, and it is short enough that you will actually do it more than once.",
        ],
        table: {
          caption: "What to check on a rehearsal recording, and the target",
          head: ["Measurement", "Target for a presentation", "Why it matters here"],
          rows: [
            ["Length", "90% of your allotted slot", "Nerves add length on the day, never subtract it"],
            ["Speaking pace", "130-150 wpm, stable", "Slides plus speed is how an audience loses the thread"],
            ["Filler rate", "Under 3 per minute", "Climbs sharply on the section you know least well"],
            ["Pause placement", "0.5-1.5s before each key point", "It is the only way to mark what matters out loud"],
            ["Clarity", "Under 5% unclear", "Sentence endings fail first, and they carry the point"],
          ],
        },
      },
      {
        h: "A week before, one pass a day",
        p: [
          "Three to five full uninterrupted run-throughs spread across the week beats a dozen partial ones in a single evening. Below three, you have never delivered the ending under fatigue; above about six in a week, delivery flattens into recitation, which an audience hears immediately as reading.",
          "The rule that people abandon first and that matters most: do not stop to fix things mid-run. Stopping produces a speaker who has delivered the opening twenty times and the conclusion never. Make notes, finish the run, then fix.",
        ],
        list: {
          ordered: true,
          items: [
            "Seven days out: first full run, out loud, standing, timed. Expect it to be bad and do not stop.",
            "Five days out: second run. Fix structure and cuts, not wording.",
            "Four days out: record sixty seconds of the opening and check pace and length against the slot.",
            "Three days out: third full run with the real slides on the real screen.",
            "Two days out: the three questions you are dreading, answered out loud, cold.",
            "One day out: one clean run, then change nothing. On the day, two minutes of slow breathing and no rehearsal at all.",
          ],
        },
      },
      {
        h: "If it is a class or college presentation",
        p: [
          "Two things differ. The time limit is enforced and usually short, and a share of the grade is typically for delivery - so rehearsal is worth marks directly rather than only indirectly.",
          "Rehearse to about ninety per cent of the limit. A talk that fits exactly in rehearsal will overrun on the day, because adrenaline adds length through extra connective sentences you did not plan.",
          "If it is a group presentation, rehearse the handovers out loud with the other people. Group presentations fail at the joins far more often than inside the sections, because the handover belongs to two people and therefore gets rehearsed by neither. The step-by-step version is in [how to practise a presentation](/guides/how-to-practice-a-presentation).",
        ],
      },
      {
        h: "What it does not do",
        p: [
          "It does not make slides, and it has no view on your deck design. This measures the delivery of a presentation, which is a different product from the many tools that generate one.",
          "It does not do video, so eye contact, gesture, posture and where you are looking are outside what it measures.",
          "It does not grade your content. Whether the argument holds and whether the evidence supports it are judgement calls, and a tool making them from a transcript would be guessing.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I practise a presentation?",
        a: "Out loud, standing, timed, without stopping to fix anything mid-run. Three to five full run-throughs spread across a week, and record at least one of them - a talk rehearsed silently is estimated at about two thirds of its real length, so silent practice is how people end up running over.",
      },
      {
        q: "Is there a free tool to practise a presentation?",
        a: "This one is free at ten recordings every 24 hours, with no account and no card, and the allowance refills daily. It returns length, speaking pace overall and per section, filler count and rate, pause placement and word-level clarity, each with the timestamp behind it.",
      },
      {
        q: "How long before a presentation should I start practising?",
        a: "About a week, with one pass a day, is the shape that works. Spacing matters more than the total count - five run-throughs across five days beats five in one evening comfortably, and it gives you five separate chances to notice a section is not working rather than one.",
      },
      {
        q: "How do I stop going over time?",
        a: "Time a real out-loud run rather than estimating, and rehearse to ninety per cent of your slot. Nerves add length on the day through connective sentences you did not plan, so a talk that fits exactly in rehearsal will overrun. If you are already over, cut a section rather than planning to speak faster.",
      },
      {
        q: "Does it work for a class presentation as well as a work one?",
        a: "Yes - the measurements are the same, and a strict time limit makes them more useful rather than less. The one adjustment for an assessed presentation is to rehearse group handovers out loud with your group, because that is where group presentations actually fail.",
      },
    ],
    guides: [
      "how-to-practice-a-presentation",
      "free-ai-public-speaking-practice",
      "how-to-stop-talking-too-fast",
      "ideal-speaking-pace-words-per-minute",
      "how-to-speak-with-confidence",
      "speaking-skills-in-communication",
    ],
    cta: { label: "Record my rehearsal", href: "/onboarding" },
  },
  {
    slug: "public-speaking-practice",
    h1: "Public Speaking Practice, Online and Free",
    metaTitle: "Free Public Speaking Practice Online",
    description:
      "Practise public speaking in the browser and get the delivery measured - pace, fillers, pauses, clarity and vocal energy - with the timestamp behind every number. No account needed.",
    answer:
      "Public speaking practice online means recording yourself deliberately and getting the delivery measured rather than judged from memory. Record sixty seconds in the browser and get speaking pace, filler count and rate, pause length and placement, word-level clarity and pitch range, each with the second that produced it. Free, ten a day.",
    primaryKeyword: "public speaking practice online",
    secondaryKeywords: [
      "practice public speaking free",
      "public speaking practice tool",
      "speech practice online",
      "how to practice public speaking alone",
      "public speaking without an audience",
    ],
    published: "2026-09-02",
    updated: "2026-09-02",
    measures: "Pace, fillers, pauses, clarity and vocal energy, with timestamps",
    sections: [
      {
        h: "Practising alone works, if you record it",
        p: [
          "The standard objection to solo practice is that it cannot reproduce an audience, which is true and mostly beside the point. The habits that lose a room - racing, filling every gap, never pausing, letting sentence endings go soft - are all present when you rehearse alone. They get worse in front of people; they do not appear from nowhere.",
          "What solo practice genuinely cannot do is unrehearsed feedback. You cannot hear your own delivery while producing it, because the brain suppresses the sound of your own voice during speech and substitutes what you meant to say. This is why rehearsing without recording can be repeated fifty times without improving anything - you are practising, accurately, the version in your head.",
          "A recording removes that. It is the first time you hear what a room hears, which is uncomfortable and is the entire value.",
        ],
      },
      {
        h: "What gets measured, and the working targets",
        p: [
          "Five numbers, each with the moment behind it so you can hear what produced it instead of trusting a figure.",
        ],
        table: {
          caption: "Delivery measurements for a spoken piece, with targets",
          head: ["Measurement", "Target", "The failure it catches"],
          rows: [
            ["Speaking pace", "130-150 wpm, stable", "Racing through the part you know least well"],
            ["Filler rate", "Under 3 per minute", "Filling gaps instead of leaving them"],
            ["Pause placement", "0.5-1.5s at thought ends", "Every sentence delivered at the same weight"],
            ["Clarity", "Under 5% unclear", "Sentence endings that never reach the back of the room"],
            ["Vocal energy", "Range that does not flatten", "The monotone that loses attention after a minute"],
          ],
        },
      },
      {
        h: "Nerves show up as pace, and pace is fixable",
        p: [
          "Nervousness is not directly measurable and mostly not worth chasing. What it does to your speech is measurable, and that is the part that actually reaches the audience: the heart rate rises, the breath shortens, and the speaking rate goes up by twenty to forty words a minute without the speaker noticing at all.",
          "This is useful because it converts an unfixable-feeling problem into a fixable one. You are not going to stop feeling nervous before a talk, and the advice to relax has never worked for anyone. You can, however, practise starting slower than feels natural, and the opening sets the pace that everything after it anchors to.",
          "Two minutes of slow breathing with a longer out-breath than in-breath, immediately before, is the most direct lever available on the physiology. It is not a relaxation ritual - it is the fastest way to lower the rate you will speak at in the first minute.",
        ],
        list: {
          intro: "A fortnight that changes the delivery, at one minute a day:",
          items: [
            "Same prompt each day, sixty seconds, one take. The comparison between days is the whole value.",
            "Use something you find genuinely uncomfortable to talk about, not a script.",
            "Fix one number at a time. Pace first, because three of the others move with it.",
            "Record once more the day before the real thing, and change nothing after it.",
          ],
        },
      },
      {
        h: "Free, and what that actually covers",
        p: [
          "Ten recordings every 24 hours, no account and no card. The allowance refills daily rather than being a lifetime handful, which is the difference between a free tier you can build a fortnight of practice on and one sized for evaluating a purchase.",
          "There is also a practice mode where an AI plays a counterpart and pushes back on your answers - two rounds free, a deliberately smaller allowance, because a live back-and-forth costs much more to run than analysing a clip.",
          "The wider comparison of what is free in this category, and what free is being used to mean, is in [free AI public speaking practice](/guides/free-ai-public-speaking-practice) and [what runs with no sign up](/guides/free-ai-communication-coach-no-signup).",
        ],
      },
      {
        h: "What it does not do",
        p: [
          "It does not give you an audience. Roleplay against an AI counterpart is pressure of a sort, and it is not the same as forty people looking at you - for that, a speaking group in a room with actual humans is still the answer, and nothing online replaces it.",
          "It does not do video, so posture, gesture and eye contact are outside what it measures.",
          "It does not write or assess your speech. What you said and whether it was worth saying are judgement calls; how you said it is what this counts.",
        ],
      },
    ],
    faqs: [
      {
        q: "How can I practise public speaking alone?",
        a: "Record yourself deliberately - sixty seconds, one take, on something you find genuinely uncomfortable to talk about - and measure the result rather than assessing it from memory. Rehearsing without recording can be repeated indefinitely without improving anything, because you cannot hear your own delivery while producing it.",
      },
      {
        q: "Is there free public speaking practice online?",
        a: "This is free at ten recordings every 24 hours with no account and no card, returning pace, filler count and rate, pause length and placement, word-level clarity and pitch range with the timestamp behind each one. Check on any tool whether the free allowance refills daily or is a lifetime total.",
      },
      {
        q: "How do I stop being nervous when speaking?",
        a: "You mostly do not, and chasing the feeling is the wrong target. What nerves do to your speech is measurable and fixable: the rate rises twenty to forty words a minute without you noticing. Two minutes of slow breathing beforehand and a deliberately slow first sentence handle most of the damage, because everything after the opening anchors to its pace.",
      },
      {
        q: "How long does it take to get better at public speaking?",
        a: "One habit shifts audibly in about two weeks of one minute a day, recorded against the same prompt so the comparison is real. Working on pace, fillers, pauses and clarity one at a time is roughly two months. Attempting all four at once takes longer, because the attention spent monitoring your own delivery comes out of the content.",
      },
      {
        q: "Can practising online replace a speaking group?",
        a: "For the measurable habits, yes, and it is faster - a room full of people will not tell you your filler rate. For the experience of a live audience, no, and nothing online does. The two solve different halves, and the recording half is the one you can do at seven in the morning.",
      },
    ],
    guides: [
      "free-ai-public-speaking-practice",
      "how-to-practice-a-presentation",
      "how-to-speak-with-confidence",
      "how-to-stop-using-filler-words",
      "speaking-skills-in-communication",
      "free-ai-communication-coach-no-signup",
    ],
    cta: { label: "Record and measure a minute", href: "/onboarding" },
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
