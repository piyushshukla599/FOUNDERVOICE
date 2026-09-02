/**
 * Guide content lives as data rather than as one file per page, so the index,
 * the sitemap, the structured data and the cross-links cannot drift apart.
 * Adding a guide here adds it everywhere.
 *
 * These target the questions people actually type. Each one answers the
 * question properly on its own terms; a page that withholds the answer to push
 * a signup ranks badly and deserves to.
 *
 * Two clusters share this file. The speaking cluster (pace, fillers, pauses,
 * clarity, rambling) catches the problem searches; the founder cluster (pitch,
 * investor Q&A, explaining the company) catches the situation searches. Both
 * end at the same product, which is why `cta` is per-guide: a reader who
 * arrived on filler words should be offered a filler count, not a tour.
 *
 * `primaryKeyword` exists to make cannibalisation visible. Two guides holding
 * the same primary compete for one slot, so uniqueness is asserted at module
 * load below rather than left to whoever notices the ranking drop.
 */

/**
 * A section is prose plus, optionally, one extractable block.
 *
 * Prose-only was the single biggest thing wrong with these pages. A featured
 * snippet, an AI Overview citation and a People-Also-Ask answer are all
 * extractions, and what gets extracted is a list, a table or a short direct
 * answer - never a well-written paragraph. Seventeen guides of unbroken prose
 * gave Google nothing to lift, so they could rank on relevance and still lose
 * every result that actually gets clicked.
 *
 * One extractable block per section, placed after the paragraphs that set it
 * up rather than in place of them.
 */
export type Section = {
  h: string;
  p: string[];
  /** A steps list (ordered) or a criteria list (unordered). */
  list?: { ordered?: true; intro?: string; items: string[] };
  /** Comparison and threshold data. Tables win their own SERP treatment. */
  table?: { caption: string; head: string[]; rows: string[][] };
};

export type GuideCta = {
  /** Names the measurement the reader came for, not the product. */
  h: string;
  p: string;
  label: string;
  href: string;
};

export type Guide = {
  slug: string;
  title: string;
  /** Under 60 characters where possible, since Google truncates past that. */
  metaTitle: string;
  description: string;
  /**
   * The extractable answer: one self-contained paragraph, 40-55 words, that
   * answers `primaryKeyword` with no pronoun pointing at anything off-screen.
   * Rendered in its own block under the H1 and reused verbatim as the
   * Question/Answer pair a featured snippet is lifted from.
   *
   * Deliberately not the same sentences as `intro`. The answer is what a
   * machine lifts; the intro is what a person reads next.
   */
  answer: string;
  /** Answers the query in the first paragraph, before any preamble. */
  intro: string;
  /**
   * First publication, distinct from `updated`. They used to be one field, so
   * every guide told Google it was published and last modified on the same
   * day - which reads as a page nobody has revisited, and throws away the
   * freshness signal an actual revision earns.
   */
  published: string;
  updated: string;
  readMinutes: number;
  /** One guide, one primary intent. Asserted unique across the set. */
  primaryKeyword: string;
  secondaryKeywords: string[];
  cluster: "speaking" | "founder" | "tools";
  /**
   * A hub page for its cluster. Pillars carry the head term and link down to
   * every spoke; spokes link back up. Exactly one per cluster - a second would
   * split the cluster rather than anchor it.
   */
  pillar?: true;
  sections: Section[];
  faqs: { q: string; a: string }[];
  /** Slugs, most relevant first. Falls back to cluster siblings if empty. */
  related: string[];
  cta: GuideCta;
};

/**
 * Shared because several guides genuinely end at the same measurement, and a
 * near-identical block copied five times drifts. The CTA still has to name the
 * number the reader came for - a generic "try the product" panel converts a
 * fraction of what "count your own fillers" does on a filler-words page.
 */
const CTA = {
  fillers: {
    h: "Count your own fillers",
    p: "Record sixty seconds and get every um, uh, like and you know timestamped, with the rate per minute you can track week to week.",
    label: "Measure my filler rate",
    href: "/onboarding",
  },
  pace: {
    h: "Check your speaking pace",
    p: "Record sixty seconds and get your words per minute for the whole clip and for each section, so you can see the exact point where you sped up.",
    label: "Measure my pace",
    href: "/onboarding",
  },
  pauses: {
    h: "See where your pauses actually fall",
    p: "Record sixty seconds and get every pause measured and placed, so you can tell a thinking pause from a gap in the middle of your own sentence.",
    label: "Measure my pauses",
    href: "/onboarding",
  },
  pitch: {
    h: "Practise the pitch out loud",
    p: "Record your sixty-second version and get pace, fillers, pauses and vocal energy measured, plus the one habit costing you the most.",
    label: "Record my pitch",
    href: "/onboarding",
  },
  clarity: {
    h: "Find the words a listener would miss",
    p: "Record sixty seconds and get word-level clarity, showing which words came out too soft or too fast to survive the trip to a listener.",
    label: "Measure my clarity",
    href: "/onboarding",
  },
  answer: {
    h: "Hear how long you actually took",
    p: "Record an answer and get its length, pace and pause pattern - the fastest way to see a ninety-second reply you were sure was thirty.",
    label: "Record an answer",
    href: "/onboarding",
  },
  /* For the tools cluster. Those readers arrived on the word "free", so the
     panel has to answer that word first and name the allowance, not bury it. */
  free: {
    h: "Use the free one now",
    p: "Record sixty seconds in the browser and get pace, filler rate, pause length, clarity and vocal range, each with the timestamp behind it. Ten recordings every 24 hours, no account and no card.",
    label: "Measure my delivery free",
    href: "/onboarding",
  },
} as const;

export const GUIDES: Guide[] = [
  /* ---------------------------------------------------------------- pillars
     Two hub pages, one per cluster. Each carries the head term for its cluster
     and links down to every spoke in it; the spokes link back up through
     `related`. They sit first in the array because the index renders in order
     and the hub should open its section. */
  {
    slug: "how-to-communicate-as-a-founder",
    title: "How to Communicate as a Founder",
    metaTitle: "How to Communicate as a Founder",
    description:
      "The delivery habits that decide whether a founder is believed: pace, filler words, pauses, clarity and energy. What each one costs you, and how to measure your own.",
    answer:
      "Communicate as a founder by fixing delivery before content. Five measurable habits carry almost all of the signal a listener reads: speaking pace, filler rate, pause placement, word-level clarity and vocal energy. Record sixty seconds, measure all five, and work on the single habit furthest from its target range.",
    intro:
      "Founders are judged on delivery long before anyone evaluates the business. In a first meeting the listener has no data on you, so they read the only signal available - how you sound while you explain something you know better than they do. Five habits carry almost all of that signal: how fast you speak, how often you fill silence, where your pauses land, how clearly each word arrives, and how much your voice moves. None of them are personality. All five are measurable, and all five move within a couple of weeks once you can see them.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 11,
    primaryKeyword: "how to communicate as a founder",
    secondaryKeywords: [
      "founder communication skills",
      "how founders should speak",
      "communication for startup founders",
    ],
    cluster: "speaking",
    pillar: true,
    sections: [
      {
        h: "Why delivery outweighs content in a first meeting",
        p: [
          "An investor hearing your company for the first time cannot check anything you say. They cannot verify the market size, test the product or call your customers, not in the thirty minutes they have given you. What they can assess immediately is whether you sound like someone who has thought this through, and that assessment is made from delivery rather than substance.",
          "This is not a flaw in how investors think. It is a reasonable response to missing information. When the content cannot be evaluated in the room, the manner of its delivery becomes the proxy, and it is a proxy people apply confidently whether or not it deserves that confidence.",
          "The practical consequence is that a founder with a strong business and rushed, filler-heavy delivery loses to a founder with a weaker business and controlled delivery, in the specific window where the decision to continue gets made. That window is usually the first sixty to ninety seconds.",
        ],
      },
      {
        h: "The five habits that carry the signal",
        p: [
          "Speaking pace is the first. Most founders sit between 120 and 200 [words per minute](/guides/ideal-speaking-pace-words-per-minute), and the comfortable band for explaining something unfamiliar is roughly 130 to 150. Above about 170 listeners stop retaining detail even while they follow individual words, which is the worst possible failure - they cannot tell you they are lost, because nothing sounded wrong.",
          "Filler words are the second. Um, uh, like, you know and so appear at the exact points where you are thinking, so their distribution maps your uncertainty for the listener whether you want it to or not. The count matters less than where they cluster: fillers before every number read as a founder unsure of their own figures.",
          "Pauses are the third, and the one most founders have backwards. The problem is almost never pausing too long. It is pausing in the wrong place - mid-sentence, while searching for a word - and never pausing at the boundaries where a listener needs a moment to file what you just said.",
          "Clarity is the fourth: whether each word actually arrives intact. Word endings are the first thing to go under pressure, and a listener who misses a word does not stop you to ask. They reconstruct it, get it wrong, and quietly lose the thread. Vocal energy is the fifth - pitch and volume variation, which is most of what people mean when they call someone flat or unconvincing.",
        ],
        table: {
          caption:
            "The five delivery habits, what each one signals, and the range to aim for",
          head: ["Habit", "What a listener reads from it", "Target"],
          rows: [
            [
              "Speaking pace",
              "Whether you are in control or escaping the room",
              "130-150 words per minute",
            ],
            [
              "Filler words",
              "Whether you have thought this through",
              "Under 3 per minute",
            ],
            [
              "Pauses",
              "Whether you mean what you just said",
              "0.5-1.5s, at the end of thoughts",
            ],
            [
              "Clarity",
              "How much of it they can actually use",
              "Under 5% of words unclear",
            ],
            [
              "Vocal energy",
              "Whether you believe it yourself",
              "Pitch range that does not flatten",
            ],
          ],
        },
      },
      {
        h: "Why self-assessment does not work here",
        p: [
          "Every one of these habits is invisible from the inside, and for a structural reason. Your [speaking pace](/guides/how-to-stop-talking-too-fast) is coupled to your arousal, and so is your internal sense of tempo. When you speed up under pressure, your reference clock speeds up with it, so fast speech feels normal in the moment and only sounds fast on playback.",
          "Fillers are worse. They are produced pre-consciously, in the gap where the next phrase is still being assembled, which means the part of you that would notice them is busy doing the thing that causes them. Asking a founder how many times they said um is asking them to remember something they were never aware of.",
          "This is why generic advice fails. Being told to slow down, [sound confident](/guides/how-to-sound-confident-in-an-investor-pitch) or cut the fillers names a symptom you already suspected and gives you no way to tell whether anything changed. Measurement replaces that with a number that moves, and a number that moves is something you can actually train against.",
        ],
      },
      {
        h: "Fix one habit at a time, in this order",
        p: [
          "Pace first, because it is upstream of the others. When you slow into the 130 to 150 band you create the gaps where pauses can land, and you give yourself enough processing time that fillers stop being necessary. Founders who fix pace often find their [filler rate](/guides/how-to-stop-using-filler-words) falls without ever working on fillers directly.",
          "Pauses second, because the mechanism that lowers pace is pausing at boundaries rather than drawling the words. Deliberately slowing your articulation is exhausting and never survives past the first sentence. Stopping fully for half a second to a second and a half at the end of each thought drops the average without changing how the words themselves sound.",
          "Fillers third, and only if they are still there. Then clarity, then energy. Working on all five at once produces no measurable movement on any of them, which is the most common reason founders conclude that speaking practice does not work for them.",
        ],
        list: {
          ordered: true,
          intro:
            "Work down this list and stop at the first habit that is outside its range. Fixing two timing habits in the same fortnight makes both worse, because they interfere.",
          items: [
            "Pace, if you are above 160 words per minute. Everything else is easier to hear once the words arrive at a speed a listener can follow.",
            "Fillers, if you are above 8 per minute. This is the habit that most changes how prepared you sound, and it moves fastest.",
            "Pauses, once pace and fillers are inside range. Placement matters more than length: end of thought, never mid-sentence.",
            "Clarity, which usually improves on its own once the first three are fixed, and only needs separate work if it does not.",
            "Vocal energy last. It is the hardest to change deliberately and the least costly to leave alone.",
          ],
        },
      },
      {
        h: "What to measure, and how often",
        p: [
          "Record sixty seconds answering an unrehearsed question. Not a script - reading aloud produces a pace and a filler rate unlike anything you use in a real meeting, and it will tell you nothing useful about how you sound in the room you are worried about.",
          "Take the reading twice where you can: once relaxed, once immediately after something stressful. The gap between the two numbers is more informative than either one, because it predicts what your delivery will do under the conditions that actually matter.",
          "Then repeat weekly rather than daily. Delivery habits move on a scale of weeks, and measuring daily produces noise that looks like regression and discourages people who are in fact improving. Three recordings is roughly the point where a trend becomes separable from a bad morning.",
        ],
      },
      {
        h: "The situations worth practising specifically",
        p: [
          "General speaking practice transfers less than founders expect. The pitch, the investor question you did not anticipate, the demo to someone seeing the product cold and the board update are four different problems, and being good at one does not make you good at the next.",
          "The pitch rewards compression and structure. Investor questions reward composure and the willingness to pause before answering. The demo rewards ruthless removal of internal vocabulary. The board update rewards saying the number first and the explanation second.",
          "Practise the one that is coming up. The guides below cover each situation on its own terms, and each one names the specific delivery habit that situation punishes hardest.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does it take to change how you sound?",
        a: "Filler rate is the fastest to move - most people halve it within a week or two once they can see the count, because the fix is simply becoming comfortable with silence. Pace takes longer, usually three to four weeks, because it is tied to your arousal response rather than to a habit you can decide to stop. Vocal energy is the slowest and the least worth chasing directly; it tends to improve on its own once pace and pauses are under control.",
      },
      {
        q: "Do I need to change my accent to be taken seriously?",
        a: "No. Clarity, pace and structure carry almost all of how competent you sound, and none of them require changing your accent. The measurable question is whether each word arrives intact and whether your pace gives the listener room to process, not whether you sound native to any particular place.",
      },
      {
        q: "Is this different from public speaking training?",
        a: "Yes, in the situations it targets. Public speaking training is built around prepared delivery to a room. Founder communication is mostly unprepared: the question you did not expect, the demo that goes off script, the update where someone interrupts with a harder question. The habits overlap, but the pressure that produces them is different, and so is the practice that fixes them.",
      },
    ],
    related: [
      "how-to-stop-talking-too-fast",
      "how-to-stop-using-filler-words",
      "how-to-use-pauses-when-speaking",
      "how-to-speak-with-confidence",
      "how-to-stop-rambling",
      "ideal-speaking-pace-words-per-minute",
    ],
    cta: {
      h: "Measure all five in one recording",
      p: "Record sixty seconds and get your pace, filler rate, pause placement, clarity and vocal energy measured together, with the one habit costing you the most named first.",
      label: "Measure my delivery",
      href: "/onboarding",
    },
  },
  {
    slug: "investor-pitch-delivery",
    title: "Investor Pitch Delivery",
    metaTitle: "Investor Pitch Delivery: How to Sound Fundable",
    description:
      "The delivery side of raising: what the first sixty seconds decide, how pace and pauses change under investor pressure, and how to practise the questions rather than the script.",
    answer:
      "Investor pitch delivery is decided in the first sixty to ninety seconds, before the deck reaches the market slide. Open with what the company does in one plain sentence, hold a pace near 140 words per minute, stop fully after your ask, and rehearse the questions rather than the script.",
    intro:
      "Pitch delivery is judged in the first sixty to ninety seconds, before the deck reaches the market slide. In that window an investor is not evaluating the business - they do not have enough information to - they are deciding whether to keep listening properly or to start half-listening while they think about their next meeting. What tips that decision is almost entirely delivery: whether you open with the thing itself or with preamble, whether your pace leaves room to follow you, and whether you sound like someone answering a question rather than performing a rehearsal.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 10,
    primaryKeyword: "investor pitch delivery",
    secondaryKeywords: [
      "how to deliver a pitch to investors",
      "pitch delivery tips founders",
      "how to sound fundable",
    ],
    cluster: "founder",
    pillar: true,
    sections: [
      {
        h: "What the first sixty seconds actually decide",
        p: [
          "The opening does not decide whether you get funded. It decides whether the rest of the meeting is a real evaluation or a polite one, and those two meetings look identical from the front of the room. The second one ends with a warm email and no follow-up.",
          "Investors hear a large number of pitches, which means they have a well-developed shortcut for triage. The shortcut is not cynical, it is necessary: they are listening for whether this founder can explain their own company to someone who does not already understand it. A founder who cannot do that in a pitch will not do it with a customer, a hire or a journalist either.",
          "The most common way to fail this in the opening is preamble. Thanking everyone, explaining the agenda, describing how you came to be in the room - all of it spends the window on material that carries no information about the company.",
        ],
      },
      {
        h: "Open with the thing itself",
        p: [
          "Say what the company does in one sentence a non-expert could repeat afterwards. Not the category, not the mission, not the market - the thing. If your first sentence contains the words platform, solution, ecosystem or leverage, it is describing a shape rather than a business.",
          "The test is repeatability. After the meeting, the person you pitched has to be able to describe your company to a partner who was not there. Whatever they say in that moment is what your company is, as far as the decision is concerned, and it will be their compressed version rather than your careful one.",
          "This is why the sentence has to survive compression. Write it, say it out loud to someone outside your industry, and ask them to repeat it back an hour later. The gap between what you said and what comes back is the part that needs rewriting.",
        ],
      },
      {
        h: "What pressure does to your pace",
        p: [
          "Pitch delivery is where [speaking pace](/guides/how-to-stop-talking-too-fast) fails most reliably, because the arousal that drives it is highest. Founders who sit comfortably at 140 [words per minute](/guides/ideal-speaking-pace-words-per-minute) in conversation routinely hit 180 or more once the meeting is real, and they do not notice, because their internal sense of tempo rose with their heart rate.",
          "The signature is consistent: the first thirty seconds sit near normal and the back half accelerates as the pressure accumulates. That is exactly the wrong shape, because the back half is where the detail lives - the numbers, the traction, the thing you most need them to retain.",
          "The fix is not slowing the words. It is stopping fully at the end of each idea for half a second to a second and a half. The words keep their normal tempo, the average across the minute lands in the 130 to 150 band, and the listener gets the processing time the detail requires.",
        ],
      },
      {
        h: "Practise the questions, not the script",
        p: [
          "Most founders rehearse the pitch and neglect what follows it, which is backwards. The pitch is the part you control and the part you will have said a hundred times. The questions are unrehearsed by definition, and they are where the meeting is actually decided.",
          "Under an unexpected question the failure mode is answering immediately. The answer starts before the thought is finished, which produces a filler at the front, a wandering middle and a recovery at the end that contradicts the opening. A full second of silence before answering costs nothing and reads as consideration rather than hesitation.",
          "Practise by having someone ask you the four questions you least want to be asked, and record it. The recording matters more here than for the pitch itself, because the pitch you can hear in your head and the answers you genuinely cannot.",
        ],
      },
      {
        h: "The habits that read as unfundable",
        p: [
          "Fillers immediately before numbers. Um and uh cluster where you are least certain, so a founder who fills before every figure signals doubt about their own metrics even when the metrics are solid and they simply have not said them out loud enough times.",
          "Rising intonation at the end of statements, which turns your traction into a question. This one is unconscious and common in founders pitching a round they are not sure they deserve, and it undoes the content of the sentence entirely.",
          "Speeding up when challenged. The instinct under a hard question is to produce more words faster, which reads as defensiveness. Slowing down under challenge is the single most reliable delivery signal of someone who has thought about the objection before.",
        ],
        list: {
          intro:
            "None of these are about the business. All of them are read as information about the business anyway.",
          items: [
            "Accelerating past 170 words per minute the moment you reach the part you are least sure of.",
            "Answering a question with context first and the answer somewhere in the third sentence.",
            "Ending statements on a rising pitch, which turns a claim into a request for agreement.",
            "Filling every gap, so there is no moment where the investor can react to what you said.",
            "Running the [one-line description](/guides/how-to-explain-your-startup-clearly) together with the next sentence, so it never lands as a sentence.",
            "Going quiet in volume rather than in speech when challenged, which reads as retreat.",
          ],
        },
      },
      {
        h: "How to rehearse without sounding rehearsed",
        p: [
          "Rehearse the structure, not the wording. A founder who has memorised sentences sounds like a founder reciting, and the moment a question breaks the sequence they cannot recover, because there is no underlying map - only a script that has lost its place.",
          "Say it out loud rather than reading it. Silent rehearsal builds none of the motor patterns you will use in the room and gives you no information about pace, fillers or where you run out of breath. Ten out-loud repetitions are worth more than fifty read-throughs.",
          "Record at least a few of them. What you remember about a rehearsal and what actually happened in it diverge quickly, and the divergence is always in the same direction: you remember the version you intended to deliver.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long should the opening pitch be?",
        a: "Sixty seconds is the useful unit, because it is roughly how long you have before the listener decides how carefully to listen. It also forces the compression that makes the pitch repeatable. A longer version is worth having for when it is invited, but it should be an expansion of the sixty-second one rather than a different pitch.",
      },
      {
        q: "Should I memorise my pitch word for word?",
        a: "No. Memorised wording sounds recited, and it collapses the moment a question breaks the sequence, because there is no structure underneath to fall back on. Memorise the order of the ideas and the one sentence that says what the company does. Everything between those can be different every time and should be.",
      },
      {
        q: "What is a good speaking pace for a pitch?",
        a: "Around 130 to 150 words per minute. Faster than about 170 and listeners stop retaining detail, which matters most in the second half of a pitch where the numbers live. The band is not achieved by slowing the words down but by pausing fully at the end of each idea.",
      },
      {
        q: "How do I stop sounding nervous?",
        a: "Nervousness is read from three specific things rather than from a general impression: pace that climbs through the answer, fillers clustering before figures, and pauses that fall mid-sentence instead of at boundaries. All three are measurable, and fixing the pauses tends to move the other two on its own.",
      },
    ],
    related: [
      "pitch-practice-for-founders",
      "how-to-prepare-for-investor-qa",
      "how-to-sound-confident-in-an-investor-pitch",
      "how-to-explain-your-startup-clearly",
    ],
    cta: {
      h: "Practise the pitch out loud",
      p: "Record your sixty-second version and get pace, fillers, pauses and vocal energy measured, plus the one habit costing you the most in the room.",
      label: "Record my pitch",
      href: "/onboarding",
    },
  },
  {
    slug: "free-ai-communication-tools",
    title: "Free AI Communication Tools, and What They Actually Measure",
    metaTitle: "Free AI Tools for Communication Skills",
    description:
      "What free AI communication tools measure, where the free tier usually stops, and how to tell a tool that hands you evidence from one that hands you a score.",
    answer:
      "Free AI tools for communication skills fall into four categories: recording analysers, meeting copilots, roleplay partners and transcribers. Only the first three change how you speak, and all three measure the same five things - speaking pace, filler words, pause length, clarity and vocal energy. Choose on free allowance and evidence, not feature count.",
    intro:
      "Almost every AI communication tool does one of four jobs: it analyses a recording you made, it sits inside a live meeting, it talks back to you so you can practise, or it turns speech into text. Only the first three change how you speak, and each measures the same small set of things - [speaking pace](/guides/how-to-stop-talking-too-fast), [filler words](/guides/how-to-stop-using-filler-words), pause length, word-level clarity and vocal range. Nothing free, and nothing paid, can tell you whether the point you made was worth making. Knowing which of the four you need takes a minute, and it saves signing up for three tools that do the same job badly.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 10,
    primaryKeyword: "free ai tool for communication skills",
    secondaryKeywords: [
      "free ai communication app",
      "ai communication tools",
      "best free ai tool for communication skills",
      "free app to improve communication skills",
      "free websites to improve communication skills",
      "ai for communication skills",
      "tools to improve communication skills",
      "best ai tools for communications professionals",
    ],
    cluster: "tools",
    pillar: true,
    sections: [
      {
        h: "The five things an AI can measure",
        p: [
          "Speaking pace, in [words per minute](/guides/ideal-speaking-pace-words-per-minute), over the whole recording and inside each section. The section figure is the one that matters: almost nobody speaks at a constant rate, and the useful finding is not that you averaged 155 but that you hit 190 the moment you reached the number you were nervous about.",
          "Filler rate, in fillers per minute rather than a raw count. A count depends on how long you spoke, so it cannot be compared week to week. Under about 3 per minute reads as ordinary speech; above 8 becomes the thing a listener remembers instead of the point.",
          "Pause length and placement. A tool that reports an average pause tells you almost nothing. What you need is the longest pause in the clip and where each one fell, because a pause at the end of a thought does a completely different job from a pause in the middle of your own sentence.",
          "Word-level clarity, meaning which specific words came out too soft, too fast or too swallowed to survive the trip to a listener. This is the measurement people most often mistake for an accent score, and it is not one: it is about whether the word arrived.",
          "Vocal range, meaning how much your pitch and volume move. Flat delivery is the most common reason a technically correct explanation loses a room, and it is one of the few habits that shows clearly in the audio and not at all in a transcript.",
        ],
      },
      {
        h: "What none of them can measure",
        p: [
          "Whether your argument holds. Whether the person across the table believed you. Whether the thing you said was true. Those are the parts that decide most meetings, and no amount of signal processing reaches them.",
          "This matters when you are comparing tools, because the ones that overreach are easy to spot. A single confidence score out of 100 has taken the five measurements above, thrown away the timestamps, and handed you back a number you cannot act on. A charisma rating is worse: it rates nothing in particular, and it moves when you change microphone.",
          "The honest version of what these tools do is narrower and more useful. They tell you what happened in the recording, precisely enough that you can go and hear the moment for yourself. Everything after that is your judgement.",
        ],
      },
      {
        h: "Four categories, and which one you need",
        p: [
          "Recording analysers. You record on your own and the tool returns measurements with timestamps. Best for building a habit, because you control the prompt, the length and the pressure, and because you can repeat the same sixty seconds a week later and see whether anything moved. This is the category with the most genuinely free options.",
          "Live meeting coaches. Something joins your Zoom, Meet or Teams call and coaches during it or immediately after. Best when the problem only appears with real people in the room and you cannot reproduce it alone. The trade-off is real: something has to be in the meeting, which usually means a visible participant and a conversation with whoever else is on the call.",
          "Conversational practice partners. You talk out loud and an AI asks questions back, so you are answering something you did not write. Best for the specific failure of knowing your material perfectly and losing it the moment someone interrupts. Free tiers here are usually the tightest, because every turn costs the provider money.",
          "Transcription and writing assistants. Genuinely useful, and not coaching. A transcript shows you your sentence structure and how long you took to reach the point, which is worth having, but it is blind to everything the audio carried. If [rambling](/guides/how-to-stop-rambling) is your problem a transcript helps; if pace, pauses or flatness are the problem it cannot see them at all.",
        ],
        table: {
          caption:
            "The four categories of AI communication tool, and the situation each one fits",
          head: ["Category", "What it does", "Use it when"],
          rows: [
            [
              "Recording analyser",
              "Measures a rehearsal you made on purpose and shows the timestamps behind each number",
              "You have a date to prepare for and want a trend",
            ],
            [
              "Meeting copilot",
              "Joins a live call and coaches during or after it",
              "The problem only appears with other people present",
            ],
            [
              "Roleplay partner",
              "Asks you questions in a role so you practise answering",
              "You freeze when interrupted rather than when speaking",
            ],
            [
              "Transcriber",
              "Turns speech into text and nothing more",
              "You need the words, not feedback on the delivery",
            ],
          ],
        },
      },
      {
        h: "What free usually means",
        p: [
          "Free comes in three shapes, and the difference decides whether a tool is any use to you. A lifetime allowance gives you a handful of sessions ever, which is enough to evaluate the product and not enough to change a habit. A recurring allowance gives you a number of sessions per day or per week, which is what daily practice actually needs. A trial gives you everything for a fortnight and then stops, which suits a specific deadline and nothing else.",
          "Check three things before signing up. Whether a card is required, because a free tier that takes card details is a trial wearing a different word. What happens to your recordings, since audio of you rehearsing a fundraise is not neutral material and the answer belongs in the privacy policy rather than the marketing page. And whether an account is required at all, because for a recording analyser it usually does not need to be.",
          "Be suspicious of any tool whose free tier withholds the timestamps. Locating the moment behind a number is the part that costs almost nothing to compute and everything to act on, and putting it behind the paywall tells you the product is sold on the score rather than the evidence.",
        ],
      },
      {
        h: "How to tell evidence from a score",
        p: [
          "A number with a timestamp is evidence. A number without one is a horoscope. If a tool says you used eleven fillers it should let you jump to each of the eleven, and you should be able to hear that nine of them landed just before a figure you were unsure of. That pattern is the actual finding; the count was only how you found it.",
          "It should compare you against your own history rather than an average. Population averages are close to useless for delivery, because the question is never whether you are near the mean but whether this week differs from last week. A tool that cannot show a trend across your own sessions is measuring you in isolation every time.",
          "It should name one thing to fix, not twelve. A report listing every habit you have is a report you will read once. Working on pace, fillers and articulation simultaneously produces stilted speech that helps none of them, which is why the single worst number is the only one worth acting on this week.",
          "It should measure delivery rather than pronunciation against one standard. A tool that marks you down for an Indian, Nigerian or Singaporean accent is scoring the thing with almost no effect on whether you are understood, while ignoring the word endings that decide it. Test this directly: record a clip you know is clear and see whether the tool agrees.",
        ],
      },
      {
        h: "A free stack that covers the whole job",
        p: [
          "One recording analyser, used daily for sixty seconds, to establish where you are and to catch drift. This is the anchor, because it is the only part that produces comparable numbers over time.",
          "One conversational partner, twice a week, for the pressure that solo recording cannot manufacture. You need at least one format where the next question is not yours to choose.",
          "One transcript of a longer answer, read back once a fortnight, for structure. Seeing your own words on a page makes a buried point obvious in a way that hearing it does not.",
          "That is the whole stack, it costs nothing, and it takes about fifteen minutes a day. The common failure is collecting six tools and using none of them past the first week, which is a scheduling problem rather than a tooling one.",
        ],
      },
      {
        h: "The two-week routine that makes any of them work",
        p: [
          "Days 1 to 3: record one minute daily and change nothing. You need a baseline, and you need to get past hating your own recorded voice, which takes most people about three sessions.",
          "Days 4 to 7: take the single worst number and work only on it. If it is pace, pause deliberately at every full stop rather than trying to say words more slowly. If it is fillers, replace each one with silence instead of a different word.",
          "Days 8 to 14: keep the first habit, add the second, and bring in questions you did not write. At the end, re-record the day 1 prompt and compare. The gap is usually obvious enough that other people notice before you do.",
          "Re-record immediately after listening rather than tomorrow. The correction happens in the gap between hearing the defect and speaking again, and a day is long enough to lose most of it.",
        ],
        list: {
          ordered: true,
          intro:
            "The tool is the small part. This routine is what actually moves the numbers, and it works with any of the analysers above.",
          items: [
            "Days 1-3: record one unrehearsed minute a day and change nothing. You are establishing a baseline and getting past hearing your own voice.",
            "Day 3: pick the single number furthest from its target range. Ignore the other four entirely.",
            "Days 4-10: same daily minute, one instruction only, aimed at that number. Write the number down each day.",
            "Days 11-14: raise the pressure - an uncomfortable question, or a two-second limit before you must start - and see how much of the gain survives.",
            "Day 14: re-measure all five. Whatever is now furthest from range is next fortnight's work.",
          ],
        },
      },
    ],
    faqs: [
      {
        q: "What is the best free AI tool for communication skills?",
        a: "There is no single best one, because the four categories solve different problems. If you want to change a habit, use a recording analyser daily. If you freeze when interrupted, use a conversational practice partner. If the problem only appears in real meetings, use a live meeting coach. Picking the category first narrows the choice more than any review can.",
      },
      {
        q: "Are free AI communication apps genuinely free?",
        a: "Some are. The distinction that matters is whether the free tier is a lifetime allowance, a recurring daily or weekly allowance, or a time-limited trial. Only the second supports the repeated practice that actually changes delivery, and a free tier that requires card details is a trial regardless of what it is called.",
      },
      {
        q: "Can an AI replace a communication coach?",
        a: "Not for judgement. A coach can tell you that your second point was the interesting one and you buried it, and no current tool can. What an AI replaces is the measurement and the repetition, which is what the first several sessions with a coach are largely spent on, and it does that part at any hour for nothing.",
      },
      {
        q: "Do these tools work if English is not my first language?",
        a: "The ones worth using do, because they measure delivery rather than pronunciation against a single standard. Pace, pause placement, filler rate and word endings decide whether you are understood, and none of them is an accent. Avoid anything that scores you on sounding native, since that is the variable with the least effect on the outcome.",
      },
      {
        q: "Which tools suit communications professionals rather than beginners?",
        a: "Ones that expose the raw measurements and the timestamps rather than a summary score, and that let you compare sessions over months. If you already know what a filler word is, the value is entirely in the evidence trail and the trend line, and a product built around a single readout gives you neither.",
      },
    ],
    related: ["free-ai-public-speaking-practice", "ai-speaking-partner", "yoodli-alternatives"],
    cta: CTA.free,
  },
  {
    slug: "how-to-stop-using-filler-words",
    title: "How to Stop Saying Um, Uh and Like",
    metaTitle: "How to Stop Using Filler Words",
    description:
      "Filler words come from discomfort with silence, not a habit you can drop. The method that actually reduces them, with numbers to aim for and a two-week drill.",
    answer:
      "Stop using filler words by replacing each one with a closed-mouth pause rather than trying to delete it. An um is a placeholder produced while the sentence is still being planned, so silence has to take its place. Under 3 fillers per minute reads as normal speech; above 8 they become the content.",
    intro:
      "You reduce filler words by getting comfortable with silence, not by trying to delete the fillers. Every um is a placeholder your mouth produces while your brain is still assembling the sentence, so removing it without replacing it leaves nothing to fill the gap and the um comes straight back. The method that works is to swap each filler for a deliberate closed-mouth pause, one situation at a time, and to track the rate rather than judge the feeling. Under 3 fillers per minute reads as ordinary speech. Above 8 is where listeners start hearing the fillers instead of the point.",
    published: "2026-08-21",
    updated: "2026-08-24",
    readMinutes: 8,
    primaryKeyword: "how to stop using filler words",
    secondaryKeywords: [
      "how to stop saying um",
      "how to stop saying uh",
      "how to stop saying like",
      "filler words in speech",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Why you say um in the first place",
        p: [
          "Filler words are not a bad habit in the way biting your nails is a bad habit. They are a signal that speech production has outrun sentence planning. You committed to starting a sentence before you had finished deciding how it ends, and the um buys the fraction of a second you need to catch up.",
          "This is why fillers cluster in predictable places rather than scattering evenly. They appear before numbers, before names you are not certain of, at the start of an answer to a question you were not expecting, and at the seam between two ideas where you have to choose which one goes next. Look for those four positions in your own recording and you will find most of your fillers sitting in them.",
          "It also explains why fillers get worse under pressure and better when you are describing something you have explained fifty times. The vocabulary is identical. The planning load is not.",
        ],
      },
      {
        h: "A filler and a thinking pause are the same moment",
        p: [
          "Both occupy the same instant. Only one costs you anything. A [thinking pause](/guides/how-to-use-pauses-when-speaking) is silence while you decide what comes next; a filler is noise while you decide what comes next. The listener uses that moment identically either way, which is the part most people get wrong: they believe silence will read as being lost, when in practice it reads as being deliberate.",
          "Recordings make this obvious in a way live conversation never does. A one-second silence feels enormous from the inside and passes almost unnoticed from the outside. The reason it feels enormous is that you are the only person present who knows you had not finished planning.",
          "So the target is not fewer words. It is the same moment, spent silently. That reframing moves more speakers than any amount of trying to catch the um mid-flight.",
        ],
      },
      {
        h: "The replace-with-silence method",
        p: [
          "Record sixty seconds answering a question you have not rehearsed, and count your fillers. Do not try to fix anything on this pass. You need a number, and you need it from unedited speech.",
          "Listen back and note where each filler landed. You are looking for position, not count: before a number, at the start of an answer, at the seam between ideas. Most people find two positions account for the majority.",
          "Record again on the same prompt with one instruction: when you feel the filler coming, close your mouth. Closing the mouth matters mechanically - um and uh are both produced with the jaw open and the vocal folds already running, and a closed mouth cannot make either sound.",
          "Expect the second recording to feel slow and stilted. It will not sound that way. Compare the two on playback rather than from memory, because memory reports how it felt to produce and playback reports what a listener received.",
          "Repeat daily for a week on unrehearsed prompts. Most people roughly halve their rate in that time and then plateau. The plateau is the point where the remaining fillers are structural, and need the pace and structure work rather than more of this drill.",
        ],
        list: {
          ordered: true,
          intro:
            "Five passes. The whole method is one substitution, repeated until it stops requiring attention.",
          items: [
            "Record sixty seconds answering a question you have not rehearsed, and count your fillers. Fix nothing on this pass - you need a number from unedited speech.",
            "Listen back and note where each filler landed, not how many there were. Look for the four positions: before a number, before a name, at the start of an answer, at the seam between two ideas.",
            "Record the same prompt again with one instruction: when you feel the filler coming, close your mouth. A closed mouth cannot produce um or uh - both need the jaw open and the folds already running.",
            "Compare the two recordings on playback rather than from memory. The second will feel slow to produce and will not sound slow to a listener.",
            "Repeat daily for a week on prompts you have not seen. Most people roughly halve their rate, then plateau where the remaining fillers are structural.",
          ],
        },
      },
      {
        h: "Numbers to aim for",
        p: [
          "Under 3 fillers per minute is normal speech. Nobody notices, including you on playback. There is no benefit to chasing zero, and speakers who reach zero usually get there by over-rehearsing, which costs more in warmth than the fillers cost in credibility.",
          "3 to 8 per minute is where a critical listener registers something without being able to name it. Most nervous speakers sit here.",
          "Above 8 per minute the fillers become the content. In a pitch or an interview this is the level at which people report afterwards that the speaker seemed unprepared, even when the substance was strong.",
          "Track rate rather than count, because rate survives comparison across recordings of different lengths. Twelve fillers in ninety seconds and eight in sixty are the same problem; the raw counts suggest otherwise.",
        ],
        table: {
          caption:
            "Filler word rates, what a listener hears at each level, and what to do about it",
          head: ["Fillers per minute", "What a listener registers", "What to do"],
          rows: [
            [
              "Under 3",
              "Nothing. This is ordinary speech",
              "Leave it alone - chasing zero costs warmth",
            ],
            [
              "3 to 8",
              "Something is off, without being able to name it",
              "The closed-mouth drill, daily, for two weeks",
            ],
            [
              "Above 8",
              "The fillers instead of the point; reads as unprepared",
              "Fix pace first, then the drill",
            ],
          ],
        },
      },
      {
        h: "Mistakes that keep the rate high",
        p: [
          "Substituting a different filler. Replacing um with so, right or actually does nothing, because the listener registers the hesitation rather than the specific syllable. If your um count drops while your so count rises, you have moved the problem rather than solved it.",
          "Practising on rehearsed material. Reading a prepared paragraph aloud produces almost no fillers regardless of skill, which makes it useless as practice and misleading as measurement. Use questions you have not seen.",
          "Speeding up to escape. Many speakers accelerate to reach the end of a sentence before the planning gap opens. That trades fillers for a [pace problem](/guides/how-to-stop-talking-too-fast) and usually makes comprehension worse.",
          "Working on fillers and pace in the same week. Both are timing habits and they interfere with each other. Fix whichever number is further from target, then move to the other.",
        ],
      },
      {
        h: "A two-week drill",
        p: [
          "Days 1 to 3: one unrehearsed minute daily, no correction attempted. You are establishing a baseline and getting past the discomfort of hearing your own voice, which takes about three sessions for most people.",
          "Days 4 to 10: the same daily minute, with the closed-mouth substitution as the only instruction. Note the rate each day. It will not fall smoothly, and days after poor sleep will be visibly worse, which is worth seeing rather than hiding.",
          "Days 11 to 14: raise the pressure. Answer something you would genuinely rather not, or set a timer forcing you to start within two seconds of reading the prompt. The rate will rise. The point is to find how much of the gain survives stress, because that is the only part that will be there in the meeting.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why do people say um?",
        a: "Because speech production runs ahead of sentence planning. You start a sentence before you have finished deciding how it ends, and the um fills the gap while you catch up. It is a timing artefact rather than a vocabulary problem, which is why people with large vocabularies say um just as often under pressure.",
      },
      {
        q: "Are filler words actually bad?",
        a: "In ordinary conversation, no. Under about 3 per minute they are invisible and arguably make speech sound more natural. They start costing you above roughly 8 per minute, and they cost most in high-stakes settings where a listener is already deciding whether you know your material.",
      },
      {
        q: "How long does it take to reduce filler words?",
        a: "Most people roughly halve their rate within two weeks of daily one-minute recordings, because the substitution is a motor habit rather than a skill. Going from halved to consistently under 3 per minute under pressure takes longer, usually six to eight weeks.",
      },
      {
        q: "How do I measure my filler words?",
        a: "Record yourself answering an unrehearsed question for sixty seconds, transcribe it, and count um, uh, like, you know, so, actually and basically. Divide by the length in minutes for a rate you can compare across recordings. FounderVoice does the transcription, the count and the timestamps automatically.",
      },
      {
        q: "Does slowing down reduce filler words?",
        a: "Usually yes, because a slower pace lets sentence planning keep up with production. But it is a side effect rather than a method, and speakers who slow down without addressing the discomfort with silence often just spread the same number of fillers across more time.",
      },
    ],
    related: [
      "how-to-use-pauses-when-speaking",
      "how-to-stop-talking-too-fast",
      "how-to-speak-with-confidence",
    ],
    cta: CTA.fillers,
  },
  {
    slug: "how-to-stop-talking-too-fast",
    title: "How to Stop Talking Too Fast",
    metaTitle: "How to Stop Talking Too Fast",
    description:
      "Talking too fast is a pressure response, not a personality trait. How to find your real pace, why telling yourself to slow down fails, and the drills that work.",
    answer:
      "Stop talking too fast by adding full stops between thoughts, not by slowing the words themselves. Pausing for half a second to a second at the end of each thought lowers your words per minute without producing a drawl. Aim for 130 to 150 words per minute measured across a whole recording.",
    intro:
      "You stop talking too fast by adding pauses, not by slowing the words down. Deliberately slowing your articulation produces a drawl that is exhausting to maintain, which is why the instruction to slow down rarely survives past the first sentence. What actually lowers your [words per minute](/guides/ideal-speaking-pace-words-per-minute) is stopping fully at the end of each thought for half a second to a second and a half. The pace of the words themselves barely changes, the average across the minute drops into the comfortable 130 to 150 range, and comprehension rises sharply.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 8,
    primaryKeyword: "how to stop talking too fast",
    secondaryKeywords: [
      "how to speak slower",
      "talking too fast when nervous",
      "how to control speaking pace",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Why you speed up without noticing",
        p: [
          "Speaking pace is coupled to arousal. When your heart rate rises, your internal sense of tempo rises with it and speech follows. The consequence is that fast speech does not feel fast from the inside - it feels normal, because your reference clock sped up too. That is the single reason self-monitoring fails and measurement works.",
          "There is a second driver with nothing to do with nerves: the fear of being interrupted. Speakers who have been talked over, or who are presenting to someone visibly checking a phone, compress their delivery to get the point out before they lose the floor. The result reads as anxiety even when the cause is entirely rational.",
          "Both produce the same signature in a recording. The first thirty seconds sit near your normal rate and the back half accelerates, often by twenty or thirty words per minute, as the pressure of the situation accumulates.",
        ],
      },
      {
        h: "Find out how fast you actually are",
        p: [
          "Record sixty seconds answering an unrehearsed question and count the words. That number is your words per minute, and for most people it lands twenty to forty higher than they would have guessed.",
          "Do not use a prepared script. Reading aloud produces a pace unlike anything you use in conversation, generally slower and more even, and it will tell you nothing about what happens in a meeting.",
          "Take the reading twice: once relaxed, once immediately after something stressful. The gap between the two is the number that matters, because it predicts what your pace will do in the room you are actually worried about.",
        ],
      },
      {
        h: "What a good pace actually is",
        p: [
          "130 to 150 words per minute suits most rooms and most material. It leaves room for emphasis without dragging.",
          "Above roughly 170, comprehension starts falling even for listeners who follow every individual word. They keep up in the moment and retain much less afterwards, which is why a fast pitch can feel like it went well and produce no follow-up.",
          "Below roughly 110, attention drifts. Deliberate slowness has its uses for a single weighted sentence, but sustained across a minute it reads as hesitant rather than considered.",
          "Technical or unfamiliar material sits at the lower end of the range; material your audience already knows tolerates the upper end. The mistake is picking a pace by personality rather than by what the listener has to do with it.",
        ],
        table: {
          caption:
            "Speaking pace ranges and what each one does to a listener",
          head: ["Words per minute", "How it reads", "Where it fits"],
          rows: [
            [
              "Under 110",
              "Laboured; attention drifts between words",
              "Almost nowhere outside deliberate emphasis",
            ],
            [
              "110-130",
              "Considered, easy to follow",
              "Technical material, bad audio, non-native listeners",
            ],
            [
              "130-150",
              "Normal, in control",
              "Most situations, including a pitch",
            ],
            [
              "150-170",
              "Energetic, harder to retain",
              "Familiar material to a warm room",
            ],
            [
              "Above 170",
              "Followed word by word, remembered barely at all",
              "Nowhere you need the point to survive",
            ],
          ],
        },
      },
      {
        h: "The pause method",
        p: [
          "Take a recording where you ran fast and mark every point where a thought ends - not every sentence, but every genuinely complete idea. There are usually four to six in a minute.",
          "Record again with one instruction: stop completely at each of those points and count one full second before starting the next thought. Do not slow the words.",
          "Compare the two. The word rate inside each thought will be nearly identical. The average across the minute will have dropped, often by twenty or more, and the second version will sound markedly more composed.",
          "This works where slowing down fails because it changes one discrete decision six times, rather than demanding continuous conscious control of a motor process that runs faster than deliberate attention.",
        ],
        list: {
          ordered: true,
          intro:
            "You are not slowing the words. You are inserting silence between the thoughts, which is what the measured number actually reflects.",
          items: [
            "Say one complete thought at your natural speed. Do not modify the words themselves.",
            "Stop fully at the end of it. Mouth closed, half a second to a second, no sound of any kind.",
            "Start the next thought at the same natural speed. Resist the urge to make up the lost time.",
            "Repeat for sixty seconds and measure. A pace of 175 typically lands between 135 and 145 with nothing changed but the stops.",
          ],
        },
      },
      {
        h: "Drills that transfer to real situations",
        p: [
          "The full-stop drill. Read three sentences aloud and hold a two-second silence at each full stop. Two seconds is longer than you would ever use live; the point is to recalibrate what a pause feels like, so a one-second pause stops registering as a failure.",
          "The one-breath rule. Say one complete thought per breath and take the breath at the end rather than mid-sentence. Speakers who run fast almost always breathe in the wrong place, which is why they sound like they are running out of air when they are not.",
          "The hostile-question drill. Have someone ask a question you would rather not answer, and require two seconds of silence before you start. This is the only drill here that survives contact with an actual [investor meeting](/guides/investor-pitch-delivery), because it trains the pause into the exact moment your pace normally spikes.",
          "Ending on a full stop. Fast speakers chain thoughts with and, so and but, which removes every natural place to stop. Consciously ending on a full stop and starting the next thought fresh gives the pauses somewhere to live.",
        ],
      },
      {
        h: "What not to do",
        p: [
          "Do not stretch your vowels. Elongating words to hit a target pace produces the drawl everyone recognises as a speaker who has been told to slow down, and it lowers credibility rather than raising it.",
          "Do not keep the script and try to deliver it more slowly. In a fixed slot that is arithmetically impossible. Cut the script instead: at 140 words per minute a ninety-second pitch holds roughly 210 words, and that is the real constraint.",
          "Do not rely on how it feels. Two weeks after your pace drops, the new rate will feel normal and you will lose your sense of the old one entirely. Keep measuring.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why do I talk fast when I am nervous?",
        a: "Because speaking tempo is coupled to physiological arousal. A raised heart rate raises your internal sense of tempo and speech follows it. Your reference clock speeds up at the same time, which is why fast speech does not feel fast while you are producing it.",
      },
      {
        q: "What is a good speaking pace?",
        a: "130 to 150 words per minute for most situations. Above roughly 170 listeners stop retaining detail even when they follow every word; below roughly 110 attention drifts. Technical material belongs at the lower end of the range.",
      },
      {
        q: "Is talking fast always bad?",
        a: "No. Fast delivery carries energy and works well for material an audience already understands. It fails when the listener has to do something with the information - evaluate it, remember it, or decide on it - which is exactly the situation in a pitch or an interview.",
      },
      {
        q: "How do I slow down without sounding boring?",
        a: "Add pauses rather than slowing the words. Keeping your natural word rate inside each thought preserves the energy, while stopping fully between thoughts drops the average and gives each point room to land.",
      },
    ],
    related: [
      "ideal-speaking-pace-words-per-minute",
      "how-to-use-pauses-when-speaking",
      "how-to-stop-using-filler-words",
    ],
    cta: CTA.pace,
  },
  {
    slug: "ideal-speaking-pace-words-per-minute",
    title: "What Is a Good Speaking Pace? Words Per Minute Explained",
    metaTitle: "Ideal Speaking Pace (Words Per Minute)",
    description:
      "The right speaking pace is 130 to 150 words per minute for most situations. How to measure yours, why the target moves by context, and how to hit it reliably.",
    answer:
      "The ideal speaking pace is 130 to 150 words per minute for most situations. Go nearer 120 for technical or unfamiliar material and up to 160 for a story told to a familiar room. Below 110 sounds laboured; above 170 a listener follows the words but retains almost none of them.",
    intro:
      "A good [speaking pace](/guides/how-to-stop-talking-too-fast) is 130 to 150 words per minute for most situations. That range is wide enough to carry emphasis and slow enough for a listener to do something with what you said rather than merely follow it. The target moves with context: unfamiliar or technical material belongs nearer 120, while a story told to a room that already knows the space tolerates 160. What does not move is the ceiling. Above roughly 170 words per minute retention falls off regardless of how clearly you articulate, and above 190 comprehension itself starts to go.",
    published: "2026-08-21",
    updated: "2026-08-24",
    readMinutes: 7,
    primaryKeyword: "ideal speaking pace words per minute",
    secondaryKeywords: [
      "average speaking rate wpm",
      "how many words per minute should i speak",
      "good speaking pace for a presentation",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "The ranges, and what each one costs",
        p: [
          "Under 110 words per minute: attention drifts. There are legitimate uses - a single weighted sentence, a number you want remembered - but sustained across a minute it reads as hesitant, and audiences start filling the space with their own thoughts.",
          "110 to 130: deliberate. Appropriate for genuinely difficult material, bad news, or anything a listener has to hold in memory. It is also where most people land when they consciously slow down, which is why deliberate slowing so often overshoots.",
          "130 to 150: the default. Comfortable to listen to for extended periods and comfortable to produce without conscious management.",
          "150 to 170: energetic. Works for familiar material and for audiences already engaged. Costs you nothing in comprehension and something in retention.",
          "Above 170: the listener follows in the moment and remembers noticeably less afterwards. This is the most dangerous band, because the speaker gets no live feedback that anything is wrong - nobody looks confused - and only discovers the cost when the follow-up does not arrive.",
        ],
        table: {
          caption:
            "Ideal speaking pace by situation, in words per minute",
          head: ["Situation", "Words per minute", "Why"],
          rows: [
            [
              "Conversation",
              "140-160",
              "Turn-taking carries the rhythm, so speed costs less",
            ],
            [
              "Presentation or talk",
              "130-150",
              "One-way speech needs processing time built in",
            ],
            [
              "Investor pitch",
              "130-150",
              "High-stakes and unfamiliar - retention matters more than energy",
            ],
            [
              "Technical explanation",
              "110-130",
              "Every unfamiliar term costs the listener a beat",
            ],
            [
              "Audiobook or narration",
              "150-160",
              "The listener controls the pace and can rewind",
            ],
            [
              "Podcast",
              "150-170",
              "Conversational register, forgiving format",
            ],
          ],
        },
      },
      {
        h: "How to measure your own",
        p: [
          "Record sixty seconds of unrehearsed speech and count the words. Sixty seconds is the shortest sample that gives a stable number; thirty seconds swings too much on a single long pause.",
          "Use speech, not reading. Reading aloud produces a different and usually slower pace, and measuring it tells you nothing about your conversational rate.",
          "Measure the halves separately. A great many speakers sit at 140 for the first thirty seconds and 175 for the second, and a single average across the minute hides that completely. The acceleration is the actionable finding, not the mean.",
          "Take at least three samples across different days. Pace varies with sleep, caffeine and how much you care about the topic, and one reading will mislead you in whichever direction that day happened to fall.",
        ],
        list: {
          ordered: true,
          intro:
            "Two minutes of arithmetic, or one recording. Both give the same number.",
          items: [
            "Record sixty seconds of unrehearsed speech - an answer to a real question, not a paragraph read aloud.",
            "Transcribe it and count the words. Any transcription will do; you need the count, not the accuracy.",
            "Divide the word count by the length in minutes. Sixty seconds makes this the raw count.",
            "Repeat on a second, different prompt. A single recording measures that recording; two measure you.",
          ],
        },
      },
      {
        h: "Why the target moves",
        p: [
          "Pace should be set by what the listener has to do, not by how you like to talk. Following along tolerates speed. Evaluating a claim, holding a number in memory or making a decision does not.",
          "Density matters as much as rate. A hundred and sixty words per minute of familiar narrative is easier to absorb than a hundred and twenty words per minute of dense technical specification. If your material is unusually information-heavy, treat the lower end of every range above as your ceiling.",
          "Audience familiarity moves it too. The same pitch that lands at 155 with an investor who knows the sector will lose one who does not, and the speaker will read the confusion as a content problem.",
          "Non-native listeners, video calls with any latency, and rooms with poor acoustics each pull the ceiling down by roughly ten to twenty words per minute. These stack.",
        ],
      },
      {
        h: "Hitting the target without sounding slow",
        p: [
          "Do not lower the word rate inside a sentence. Slowed articulation is what produces the recognisable drawl of somebody who has been told to slow down.",
          "Lower the average with [pauses between complete thoughts](/guides/how-to-use-pauses-when-speaking) instead. Half a second to a second and a half at each of four to six thought boundaries in a minute is enough to move a 175 average into the low 150s without touching how fast the words come out.",
          "Write to the pace when the slot is fixed. At 140 words per minute a sixty-second pitch holds about 140 words and a ninety-second one about 210. Most over-length pitches are a word-count problem being treated as a delivery problem.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the average speaking rate?",
        a: "Conversational English typically sits between 120 and 160 words per minute, with 140 a reasonable middle. Presentation delivery tends to run slightly slower than casual conversation; nervous speakers routinely exceed 180 without noticing.",
      },
      {
        q: "How many words per minute should I speak in a presentation?",
        a: "130 to 150 for most presentations. Move toward 120 if the material is technical, unfamiliar, or being delivered to non-native listeners or over a video call with any latency.",
      },
      {
        q: "Is speaking slowly better?",
        a: "Only up to a point. Below roughly 110 words per minute attention drifts and the speaker reads as hesitant. Slowness is a tool for individual sentences you want remembered, not a setting for a whole talk.",
      },
      {
        q: "How do I measure my words per minute?",
        a: "Record sixty seconds of unrehearsed speech, transcribe it and count the words. Measure the first and second halves separately, since acceleration through a minute is common and an average conceals it.",
      },
    ],
    related: [
      "how-to-stop-talking-too-fast",
      "how-to-use-pauses-when-speaking",
      "how-to-speak-with-confidence",
    ],
    cta: CTA.pace,
  },
  {
    slug: "how-to-use-pauses-when-speaking",
    title: "How to Use Pauses When Speaking",
    metaTitle: "How to Use Pauses When Speaking",
    description:
      "A pause of half a second to a second and a half at the end of a thought is the highest-leverage change most speakers can make. Where to put them and why they work.",
    answer:
      "Use pauses at the end of complete thoughts, never inside them, and hold each one for half a second to a second and a half. Pauses placed at thought boundaries lower your average pace without slowing your words, remove the gap fillers were occupying, and give a listener time to process the point.",
    intro:
      "Use pauses at the end of complete thoughts, not in the middle of them, and hold each one for half a second to a second and a half. That single change does more work than any other delivery adjustment: it drops your [average pace](/guides/ideal-speaking-pace-words-per-minute) without slowing your words, it removes the gap that [fillers](/guides/how-to-stop-using-filler-words) were occupying, and it gives the listener the processing time they need to actually retain what you just said. The reason most people do not do it is that a one-second silence feels roughly three times longer to the speaker than it does to the room.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 7,
    primaryKeyword: "how to use pauses when speaking",
    secondaryKeywords: [
      "pausing while speaking",
      "how long should a pause be when speaking",
      "power of the pause in public speaking",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "What a pause is actually doing",
        p: [
          "A pause is processing time you are giving to somebody else. Speech arrives faster than comprehension completes, so a listener is always slightly behind, assembling the sentence you finished a moment ago while you start the next one. A pause at a thought boundary lets them catch up before you add more.",
          "It also marks structure. Written text has full stops, paragraph breaks and headings; speech has only timing. A pause is the only punctuation you have, and a speaker who never pauses is delivering a page with no paragraph breaks.",
          "And it displaces fillers. The um was occupying the gap between thoughts, so if you claim that gap deliberately there is nothing left for the um to fill. This is why pause work and filler work are the same project approached from opposite ends.",
        ],
      },
      {
        h: "Where to put them",
        p: [
          "At the end of a complete thought. This is the default and covers most of what you need. In a minute of speech there are usually four to six of these.",
          "Before a number or a name you want remembered. A short pause immediately before an important figure isolates it and roughly doubles the chance a listener repeats it back later.",
          "After a question, whether rhetorical or real. Speakers routinely ask a question and answer it themselves within half a second, which removes the entire benefit of having asked.",
          "Before you change direction. Moving from problem to solution, or from what happened to what it means, deserves a longer pause than a sentence boundary - closer to a second and a half.",
          "Not in the middle of a clause. A pause inside a phrase reads as searching for the word, which is exactly the impression you were trying to avoid. Where the pause lands matters more than how many you use.",
        ],
        list: {
          intro:
            "Placement decides whether a pause reads as control or as hesitation. The same one-second silence does both, depending only on where it falls.",
          items: [
            "At the end of a complete thought, always. This is the pause that does all the work.",
            "Before you answer a question you were not expecting - it buys planning time and reads as consideration.",
            "After your [one-line description](/guides/how-to-explain-your-startup-clearly), so it lands as a sentence rather than a clause.",
            "Before a number you want remembered, and after it.",
            "Never in the middle of a clause. A gap between subject and verb reads as losing the thread, because usually it is.",
          ],
        },
      },
      {
        h: "How long is right",
        p: [
          "Half a second at a sentence boundary. Barely perceptible as a pause; enough to stop the words running together.",
          "One second at the end of a complete thought. This is the workhorse. It feels long to produce and reads as composed.",
          "A second and a half to two seconds at a structural break, or immediately after something you want to land. This is close to the maximum a listener will tolerate without wondering whether you have lost your place.",
          "Beyond about three seconds you are no longer pausing, you are stopping, and the room will start to fill the silence. There are speakers who use that deliberately. It is not a beginner move.",
        ],
        table: {
          caption:
            "Pause length and what each one does",
          head: ["Length", "What it does", "Where to use it"],
          rows: [
            [
              "Under 0.3s",
              "Registers as a breath, not a pause",
              "Nowhere deliberately",
            ],
            [
              "0.5-1.0s",
              "Marks the end of a thought",
              "Between sentences, throughout",
            ],
            [
              "1.0-1.5s",
              "Signals that what came before mattered",
              "After a claim you want to land",
            ],
            [
              "2s or more",
              "Reads as searching, unless clearly deliberate",
              "Before answering a hard question",
            ],
          ],
        },
      },
      {
        h: "The drill",
        p: [
          "Record sixty seconds of unrehearsed speech and find your longest pause. If it is under half a second, you are not pausing at all, whatever it felt like at the time. This is the most common finding and it surprises nearly everyone.",
          "Re-record the same prompt and count one full second in your head at every full stop. It will feel absurd. Play it back before judging it, because production and reception are wildly different vantage points here.",
          "Then try the two-second version, which is longer than you should ever use. The purpose is calibration: after producing a two-second silence deliberately, one second stops feeling like a failure and starts feeling short.",
          "Finally, put it under pressure. Answer a question you find uncomfortable and hold a pause before you start. The pre-answer pause is the hardest one to keep and the most valuable, because it is the exact moment where pace spikes and fillers cluster.",
        ],
      },
      {
        h: "Why it feels harder than it is",
        p: [
          "You are the only person in the room who knows the silence is unplanned. From the inside, a pause is an interval of not-knowing-what-comes-next, which is uncomfortable. From the outside it is an interval of the speaker having finished a point, which reads as control.",
          "Video calls make this worse. Latency means you cannot tell whether a silence is yours or the connection, so speakers on calls tend to eliminate pauses entirely and talk over each other instead. Deliberately longer pauses are more valuable on a call, not less.",
          "The discomfort does fade, but not by reasoning about it. It fades from producing pauses, hearing them back, and noticing that they sound nothing like they felt.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long should a pause be when speaking?",
        a: "Half a second at a sentence boundary, about one second at the end of a complete thought, and a second and a half to two seconds at a structural break or after something you want remembered. Past about three seconds you are stopping rather than pausing.",
      },
      {
        q: "Do pauses make you sound unsure?",
        a: "Pauses at the end of a thought read as composed. Pauses in the middle of a clause read as searching for a word. The position matters far more than the number, which is why speakers who add pauses in the wrong place conclude that pausing does not work for them.",
      },
      {
        q: "Do pauses really reduce filler words?",
        a: "Yes, because they occupy the same moment. The um was filling the gap between thoughts, so claiming that gap deliberately leaves nothing for it to fill. Pause work and filler work are the same problem approached from opposite directions.",
      },
      {
        q: "How do I know if I am pausing enough?",
        a: "Record a minute and find your longest pause. Under half a second means you are not pausing at all, regardless of how it felt. Four to six pauses of around a second in a minute of speech is a reasonable target.",
      },
    ],
    related: [
      "how-to-stop-using-filler-words",
      "how-to-stop-talking-too-fast",
      "how-to-speak-with-confidence",
    ],
    cta: CTA.pauses,
  },
  {
    slug: "how-to-speak-with-confidence",
    title: "How to Speak with Confidence (Without Faking It)",
    metaTitle: "How to Speak with Confidence",
    description:
      "Confidence in speech is produced by pace, pauses and pitch range, not by feeling confident. What listeners actually respond to, and how to change each one.",
    answer:
      "Speak with confidence by changing four delivery behaviours rather than waiting to feel confident. Listeners read confidence from a pace that does not accelerate, pauses that land at the end of thoughts, pitch that varies rather than flattening, and sentences that end downward instead of rising. All four are measurable.",
    intro:
      "Sounding confident is a set of four measurable delivery behaviours, not an emotional state you have to reach first. Listeners read confidence from pace that does not accelerate, pauses that fall at the end of thoughts, pitch that varies rather than flattening, and sentences that end downward instead of rising. All four can be changed deliberately while you still feel nervous, which is the useful part: you do not have to feel confident to sound it, and sounding it usually brings the feeling along afterwards rather than the other way round.",
    published: "2026-08-21",
    updated: "2026-08-24",
    readMinutes: 8,
    primaryKeyword: "how to speak with confidence",
    secondaryKeywords: [
      "how to sound confident when speaking",
      "sound more confident in meetings",
      "confident speaking voice",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Confidence is received, not felt",
        p: [
          "The advice to be confident fails because it addresses the wrong end of the process. Your internal state is not transmitted; only your delivery is. Two speakers with identical anxiety can read completely differently to a room depending on what their pace, pauses and pitch happen to be doing.",
          "This is good news, because internal state is hard to change on demand and delivery is not. You can hold a one-second pause while your pulse is at 110. The room reads the pause.",
          "It also explains the common experience of being told you seemed relaxed after a talk you found agonising. Nobody was reading your state. They were reading four timing and pitch behaviours, and those happened to be fine.",
        ],
      },
      {
        h: "The four behaviours listeners actually read",
        p: [
          "[Stable pace](/guides/ideal-speaking-pace-words-per-minute). Not slow - stable. A recording that starts at 140 and ends at 180 reads as increasingly rattled even if the average looks fine. The variance carries the signal, so measuring the halves separately matters more than measuring the mean.",
          "[Pauses at thought boundaries](/guides/how-to-use-pauses-when-speaking). Silence at the end of a complete idea reads as having finished a point deliberately. Silence in the middle of a clause reads as having lost the word. Same duration, opposite interpretation.",
          "Pitch range. Anxiety compresses pitch toward a monotone, and flat delivery is heard as either bored or uncertain. Range does not mean sing-song; it means the difference between your highest and lowest note across a sentence not collapsing to nearly nothing.",
          "Terminal downward inflection. Statements that end on a rising note read as questions, and a speaker who ends every sentence upward sounds like they are seeking approval for each one. Ending downward is a small, learnable change with a disproportionate effect.",
        ],
        table: {
          caption:
            "The four measurable behaviours a listener reads as confidence",
          head: ["Behaviour", "What low confidence sounds like", "What to aim for"],
          rows: [
            [
              "Pace stability",
              "Accelerating into the uncertain part",
              "Same pace throughout, 130-150 wpm",
            ],
            [
              "Pause placement",
              "Gaps mid-sentence, none at the ends",
              "0.5-1.5s at the end of thoughts",
            ],
            [
              "Pitch range",
              "Flattening to a monotone under pressure",
              "Range that moves with the content",
            ],
            [
              "Sentence endings",
              "Rising, turning claims into questions",
              "Falling, on every statement",
            ],
          ],
        },
      },
      {
        h: "Changing each one",
        p: [
          "For pace: fix it with pauses rather than by slowing the words. Stop fully at the end of each thought and the average comes down while the energy stays. Deliberately slowed articulation produces a drawl that reads as condescension, not confidence.",
          "For pauses: use the calibration drill. Produce a two-second silence deliberately, listen back, and notice that it sounds like a beat rather than an eternity. After that a one-second pause stops feeling like a mistake.",
          "For pitch range: read a sentence you care about while exaggerating the pitch movement to the point of being ridiculous, then dial it back by half. The exaggerated version usually lands somewhere near normal on playback, because your sense of your own pitch movement is compressed too.",
          "For terminal inflection: record three statements and listen only to the final word of each. This is the fastest way to hear the upward drift, which is almost impossible to notice while speaking.",
        ],
      },
      {
        h: "What does not work",
        p: [
          "Power posing before the meeting, breathing exercises and self-talk all address the internal state rather than the delivery. They may make you feel better, and feeling better is worth something, but they do not reliably change the four things the room is reading.",
          "Over-rehearsal. A speaker who has memorised the words has nothing left to do under pressure but recite, and recitation flattens pitch and eliminates pauses - the two most visible confidence markers. Rehearse the structure and improvise the sentences.",
          "Copying a speaker you admire. Their pitch range and pace suit their voice and their material. Borrowing the surface produces something audibly performed, which reads worse than an unpolished version of your own delivery.",
          "Waiting to feel ready. The four behaviours are available to you today at your current anxiety level. Nothing about them requires the anxiety to resolve first.",
        ],
      },
      {
        h: "A four-week progression",
        p: [
          "Week 1: baseline only. One unrehearsed minute daily. Note your pace in each half, your longest pause and your [filler rate](/guides/how-to-stop-using-filler-words). Change nothing.",
          "Week 2: pauses. One instruction only - stop fully at the end of each thought. Expect pace and fillers to improve as side effects, since both were partly consequences of never stopping.",
          "Week 3: pitch and terminal inflection. Keep the pauses. Add the exaggerate-then-halve drill, and listen back to final words specifically.",
          "Week 4: pressure. Answer questions you have not seen, ideally uncomfortable ones, and re-measure everything. Whatever survives here is what you actually have. Whatever does not needs another cycle, which is normal rather than a sign it is not working.",
        ],
      },
    ],
    faqs: [
      {
        q: "How can I sound confident when I am not?",
        a: "Change the four delivery behaviours listeners actually read: keep your pace stable rather than accelerating, pause at the end of thoughts, keep some pitch variation, and end statements on a downward inflection. All four are available while you still feel anxious, because the room reads delivery rather than internal state.",
      },
      {
        q: "Does speaking slowly make you sound more confident?",
        a: "Stable pace does. Slow pace on its own does not, and deliberately slowed articulation often reads as condescending. What creates the impression is the absence of acceleration through the answer, which you get from pausing rather than from slowing the words.",
      },
      {
        q: "Why does my voice sound flat when I am nervous?",
        a: "Anxiety compresses pitch range toward a monotone, along with tightening the muscles involved in producing pitch variation. It is one of the most reliable audible markers of nerves, and one of the easiest to change deliberately once you can hear it in a recording.",
      },
      {
        q: "How long does it take to sound more confident?",
        a: "Pauses and pace change measurably within about two weeks of daily one-minute recordings. Pitch range and terminal inflection take longer, usually four to eight weeks, because both involve habits formed over years of speech.",
      },
    ],
    related: [
      "how-to-use-pauses-when-speaking",
      "how-to-stop-talking-too-fast",
      "how-to-sound-confident-in-an-investor-pitch",
    ],
    cta: CTA.clarity,
  },
  {
    slug: "how-to-stop-rambling",
    title: "How to Stop Rambling When You Talk",
    metaTitle: "How to Stop Rambling When You Talk",
    description:
      "Rambling is a structure problem, not a length problem. Why answers run long, the three-sentence shape that fixes it, and how to hear it in your own recordings.",
    answer:
      "Stop rambling by deciding where the answer ends before you start speaking. Rambling comes from beginning without a destination, so every sentence has to generate the next one. Use a three-sentence shape - answer, one piece of support, stop - and cap a spoken answer at roughly sixty seconds.",
    intro:
      "You stop rambling by deciding where the answer ends before you start it. Rambling is not caused by talking too much; it is caused by beginning to speak without having chosen a destination, so each sentence has to generate the next one and there is never an obvious place to stop. The fix is structural: answer in one sentence, support it in one or two, then stop. Most people who believe they ramble are producing ninety-second answers to questions that wanted twenty seconds, and they cannot tell because the length feels entirely different from the inside.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 7,
    primaryKeyword: "how to stop rambling",
    secondaryKeywords: [
      "how to stop rambling when talking",
      "how to give concise answers",
      "how to answer questions clearly",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Why answers run long",
        p: [
          "The usual cause is starting before deciding. You begin with the first true thing that comes to mind, which is rarely the answer, and then have to talk your way toward the answer in public. Everything before you arrive is the ramble.",
          "A second cause is hedging. Speakers who are unsure whether the answer will satisfy keep adding qualifications and alternatives, hoping one of them lands. The listener hears a speaker who does not have a position.",
          "A third is the absence of a stopping signal. Without a planned final sentence there is no moment that feels like the end, so you keep going until someone interrupts or the silence becomes unbearable - which is why rambling and discomfort with silence tend to travel together.",
          "None of these are caused by talking too much in general. Plenty of people who ramble in interviews are perfectly concise in writing, because writing lets you decide the ending before anyone sees the beginning.",
        ],
      },
      {
        h: "The three-sentence shape",
        p: [
          "Sentence one: the answer. Directly, with no preamble and no restating of the question. If the question was whether the metric is growing, sentence one says yes or no.",
          "Sentence two: the reason or the evidence. One piece, the strongest one. Not three.",
          "Sentence three: the implication, or the stop. Either what it means for the listener, or nothing at all - stopping after two sentences is a legitimate answer and it reads as decisive.",
          "This shape holds for roughly twenty to thirty seconds of speech, which is the right length for the large majority of questions in meetings, interviews and [investor conversations](/guides/how-to-prepare-for-investor-qa). Longer answers should be a deliberate choice you make because the question genuinely warranted it, not the default that happens when you did not choose.",
        ],
        list: {
          ordered: true,
          intro:
            "The shape is the whole method. It works because it decides the ending before you start, which is the thing rambling lacks.",
          items: [
            "Answer the question in one sentence. Not context, not background - the answer itself, first.",
            "Support it with one piece of evidence, example or number. One, not three.",
            "Stop. Do not summarise, do not add a second example, do not check whether that was enough.",
          ],
        },
      },
      {
        h: "Hearing it in your own recordings",
        p: [
          "Record yourself answering five questions you have not seen, and note the length of each answer before listening. Then check the actual times. The gap between your estimate and the real number is usually the whole problem, and it is typically a factor of two or three.",
          "Find the sentence where you actually answered the question. If it is not the first sentence, everything before it is preamble that can be deleted. Note where it fell - many people find their real answer arrives around forty seconds in, every time.",
          "Look for the second ending. Rambling answers often reach a natural conclusion and then continue, usually with and, so, or I guess what I mean is. That phrase is the marker. The answer ended at the word before it.",
          "Count how many separate claims you made. More than two in a short answer means the listener will retain none of them clearly.",
        ],
      },
      {
        h: "Drills",
        p: [
          "The twenty-second cap. Answer unrehearsed questions with a hard twenty-second limit. It will feel brutally short and produce answers that are noticeably better. The constraint forces the decision about the destination to happen before you start.",
          "Answer-first. Require the first sentence to contain the answer, with no run-up. This is harder than it sounds, because most people use the run-up to buy planning time, which is exactly what the [pre-answer pause](/guides/how-to-use-pauses-when-speaking) is for instead.",
          "The one-claim rule. Make exactly one claim per answer and support it once. If a second claim genuinely matters, offer it - out loud, explicitly - as a separate thing the listener can ask about.",
          "Deliberate stopping. Plan the final sentence before you begin and stop on it, even if it feels abrupt. Abrupt from the inside is usually crisp from the outside, the same asymmetry that makes pauses feel longer than they are.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why do I ramble when I talk?",
        a: "Almost always because you started speaking before deciding where the answer ends. Without a chosen destination each sentence has to generate the next one, and there is no natural place to stop. It is a planning problem rather than a talkativeness problem.",
      },
      {
        q: "How long should an answer be?",
        a: "Twenty to thirty seconds for most questions in meetings and interviews - roughly three sentences. Longer should be a deliberate choice because the question warranted it, not the default that happens when you did not choose an ending.",
      },
      {
        q: "How do I give more concise answers?",
        a: "Put the answer in the first sentence, give one piece of supporting evidence, then stop. Practise with a hard twenty-second cap on unrehearsed questions; the constraint forces you to choose the destination before you start talking.",
      },
      {
        q: "Is rambling the same as talking too fast?",
        a: "No, though they often appear together. Rambling is a structure problem - the answer has no planned ending. Talking too fast is a timing problem. A fast rambler and a slow rambler have the same underlying issue, and fixing [pace](/guides/how-to-stop-talking-too-fast) alone does not solve it.",
      },
    ],
    related: [
      "how-to-prepare-for-investor-qa",
      "how-to-explain-your-startup-clearly",
      "how-to-use-pauses-when-speaking",
    ],
    cta: CTA.answer,
  },
  {
    slug: "how-to-improve-english-communication-skills",
    title: "How to Improve Your Communication Skills by Speaking",
    metaTitle: "Improve English Communication Skills",
    description:
      "A measurable method for improving spoken English: track pace, filler words, pauses and clarity from your own recordings instead of following generic advice.",
    answer:
      "Improve spoken English by measuring it instead of studying it. Record sixty seconds answering a real question and check four numbers: words per minute, fillers per minute, average pause length, and how many words a listener would miss. Fix the worst number, record again, and repeat daily for two weeks.",
    intro:
      "The fastest way to improve spoken English is to stop studying it and start measuring it. Record sixty seconds of yourself answering a real question, then check four numbers: your [words per minute](/guides/ideal-speaking-pace-words-per-minute), your [filler words](/guides/how-to-stop-using-filler-words) per minute, your average pause length, and how many words a listener would have missed. Fix the worst number, record again, and repeat. Most people see a clear change within two weeks, because they are finally working on a specific defect instead of a vague feeling.",
    published: "2026-08-21",
    updated: "2026-08-24",
    readMinutes: 8,
    primaryKeyword: "how to improve english communication skills",
    secondaryKeywords: [
      "improve spoken english",
      "how to speak english fluently and confidently",
      "english speaking practice for professionals",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Why grammar study stops helping",
        p: [
          "Most people who worry about their English communication already have enough vocabulary and grammar. They read technical documents, write clear email, and follow films without subtitles. The gap is not knowledge. It is delivery under pressure.",
          "When you are nervous, three things happen at once: you speed up, you fill silence with um and like, and you stop articulating word endings. None of those are language problems. A native speaker under the same pressure does exactly the same thing. That is why another grammar course does not move the needle, and why hearing yourself does.",
          "It is worth being precise about what remains a language problem and what does not. Reaching for a word you do not have is vocabulary. Having the word and losing it under pressure is delivery. The second is far more common past intermediate level, and it responds to completely different practice.",
        ],
      },
      {
        h: "The four numbers that matter",
        p: [
          "Speaking pace, in words per minute. Comfortable listening sits around 130 to 150. Above roughly 170 people stop retaining detail even when they follow every word. Nervous speakers routinely hit 180 without noticing, because internal tempo speeds up along with the heart rate.",
          "Filler rate, in fillers per minute. Under about 3 reads as normal speech. Above 8 becomes the thing listeners remember instead of your point. Count um, uh, like, you know, so, actually and basically.",
          "Pause length. Confident speakers pause 0.5 to 1.5 seconds at the end of a thought. If your longest pause in a minute is under half a second, you are not giving anything room to land, and you will sound rushed even at a reasonable word count.",
          "Clarity, meaning how many words are actually recoverable by a listener. Dropped word endings and swallowed final consonants cost far more comprehension than accent does.",
        ],
        table: {
          caption:
            "The four numbers to check in a recording, and the range each should sit in",
          head: ["Number", "How to read it", "Target"],
          rows: [
            [
              "Words per minute",
              "Speed a listener has to keep up with",
              "130-150",
            ],
            [
              "Fillers per minute",
              "How often you fill a planning gap with sound",
              "Under 3",
            ],
            [
              "Average pause length",
              "Whether thoughts are separated at all",
              "0.5-1.5s at thought ends",
            ],
            [
              "Unclear words",
              "Words too soft or fast to survive the trip",
              "Under 5% of words",
            ],
          ],
        },
      },
      {
        h: "Accent is not the variable you think it is",
        p: [
          "Accent affects how you are categorised. Pace, pauses and clarity affect whether you are understood and whether you are believed. Those are different things, and only the second set changes outcomes in meetings.",
          "Word endings do most of the work that people attribute to accent. Final consonants carry tense, plurality and negation in English, so a swallowed ending is not a stylistic detail - it can invert the meaning of the sentence. This is worth practising specifically, and it is not accent reduction.",
          "Time spent on accent reduction is time not spent on the four numbers above. For almost everyone past intermediate level, the four numbers are where the remaining gains are.",
        ],
      },
      {
        h: "How to practise so it transfers",
        p: [
          "Practise the thing you actually do. Reading a passage aloud improves reading aloud. Answering a question you were not expecting improves answering questions you were not expecting, which is what interviews, standups and investor calls consist of.",
          "Work on one number at a time. Trying to slow down, cut fillers and articulate simultaneously produces stilted speech that helps nothing. Pick the worst number, spend a week on it, then move on.",
          "Re-record immediately after listening. The gap between hearing the defect and speaking again is where the correction actually happens. Waiting until tomorrow loses most of the effect.",
          "Vary the pressure deliberately. Skills practised calm do not automatically survive stress, so the last week of any cycle should use questions you would rather not answer.",
        ],
      },
      {
        h: "A two-week plan",
        p: [
          "Days 1 to 3: record one minute daily, without trying to fix anything. You need a baseline, and you need to get past hating your recorded voice, which takes about three sessions for most people.",
          "Days 4 to 7: work on whichever number is worst. If it is pace, deliberately pause at every full stop. If it is fillers, replace each one with silence rather than a different word.",
          "Days 8 to 14: keep the first habit and add the second. Re-record the same prompt from day 1 at the end and compare. The difference is usually obvious enough that other people notice before you do.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does it take to improve spoken English noticeably?",
        a: "Two weeks of daily one-minute recordings is enough for a measurable change in pace and filler rate, because both are habits rather than knowledge. Clarity and vocal range take longer, usually six to eight weeks.",
      },
      {
        q: "Should I try to lose my accent?",
        a: "No. Accent has almost no effect on whether people understand you or find you credible, while pace, pauses and clarity have a large effect. Time spent on accent reduction is time not spent on the things that actually change outcomes.",
      },
      {
        q: "Is speaking to myself useful, or do I need a partner?",
        a: "Recording yourself is more useful than an untrained partner, because a partner tells you how it felt while a recording tells you what happened. A trained coach beats both, and costs considerably more.",
      },
      {
        q: "I have good vocabulary but freeze when speaking. What should I work on?",
        a: "Delivery, not language. Freezing under pressure while having the words is a planning and timing problem: you commit to a sentence before deciding how it ends. Work on pausing before you answer, which buys the planning time the freeze was demanding.",
      },
    ],
    related: [
      "free-ai-communication-tools",
      "how-to-stop-using-filler-words",
      "how-to-speak-with-confidence",
      "how-to-stop-talking-too-fast",
    ],
    cta: CTA.clarity,
  },
  {
    slug: "pitch-practice-for-founders",
    title: "How to Practise Your Startup Pitch Out Loud",
    metaTitle: "How to Practise a Startup Pitch",
    description:
      "Most founders rehearse a pitch by rereading slides. How to practise delivery instead, the numbers investors respond to, and a rehearsal schedule that holds up.",
    answer:
      "Practise a startup pitch by recording it out loud and measuring the delivery, not by rereading the deck. Rereading rehearses recognition; investors respond to delivery. Record the sixty-second version, check pace, filler rate, pause placement and total length, fix the worst of the four, then record the same pitch again.",
    intro:
      "Practise your pitch by recording it out loud and measuring the delivery, not by rereading the deck. Rereading rehearses recognition; investors are responding to delivery. Record the sixty-second version, check four numbers - pace, [filler rate](/guides/how-to-stop-using-filler-words), [pause placement](/guides/how-to-use-pauses-when-speaking) and how long you actually took - fix the worst one, and record again. Founders who do this for a week before a raise usually find two things: the pitch is thirty seconds longer than they believed, and the acceleration in the back half is what was reading as nerves.",
    published: "2026-08-21",
    updated: "2026-08-24",
    readMinutes: 8,
    primaryKeyword: "how to practise a startup pitch",
    secondaryKeywords: [
      "startup pitch practice",
      "how to rehearse a pitch",
      "pitch delivery tips for founders",
    ],
    cluster: "founder",
    sections: [
      {
        h: "Why rereading the deck does not work",
        p: [
          "Reading slides silently rehearses recognition - you get better at recognising your own content. It does not rehearse retrieval under pressure, which is the actual task in the room, and the two are close to unrelated as skills.",
          "It also hides length. A pitch that reads in forty seconds routinely takes seventy-five to deliver, because reading skips the pauses, the reformulations and the moment where you decide whether to include the second metric. Founders discover this in the meeting.",
          "And it produces no signal you can act on. You finish the reread feeling either fine or vaguely anxious, neither of which tells you what to change.",
        ],
      },
      {
        h: "The four numbers to check",
        p: [
          "Length. Time the sixty-second version. If it runs past seventy-five seconds you do not have a sixty-second pitch, and the fix is cutting words rather than talking faster.",
          "Pace, measured in each half separately. The signature of an under-rehearsed pitch is 140 in the first half and 175 in the second. The average looks acceptable and the delivery does not.",
          "Filler rate. Fillers cluster before numbers, which in a pitch means they cluster on your traction slide - precisely where you least want hesitation. Check where yours fall rather than only how many there are.",
          "Pause placement. There should be a full stop after your [one-line description](/guides/how-to-explain-your-startup-clearly) of what the company does, and another before your ask. Both are moments the listener needs to process, and founders routinely run straight through them.",
        ],
        table: {
          caption:
            "What to measure in a recorded pitch rehearsal",
          head: ["Number", "Why it decides the meeting", "Target"],
          rows: [
            [
              "Pace",
              "Accelerating reads as escaping the room",
              "130-150 wpm, stable throughout",
            ],
            [
              "Filler rate",
              "Above 8 a minute and you read as unprepared",
              "Under 3 per minute",
            ],
            [
              "Pause placement",
              "A pause after the ask is what makes it an ask",
              "End of thoughts, 0.5-1.5s",
            ],
            [
              "Actual length",
              "Founders routinely run 2x their estimate",
              "60s version stays under 75s",
            ],
          ],
        },
      },
      {
        h: "Rehearse the structure, not the words",
        p: [
          "Memorised pitches fail in a specific way: the first interruption destroys them, and investor conversations consist of interruptions. Once the sequence breaks, a founder who memorised words has nothing to fall back on.",
          "Rehearse instead as five beats you can deliver in any order: what it does, who has the problem, why now, what the traction is, what you are asking for. Practise each beat as a standalone twenty-second answer, because that is how they will actually be requested.",
          "Then practise the joins. A large part of what reads as polish is the transition between beats, and transitions are the first thing to disappear when you rehearse the beats in isolation.",
          "Keep the wording loose deliberately. A pitch delivered in slightly different words each time sounds like someone who knows their company; a pitch delivered identically sounds like a recitation, and recitation flattens pitch range and eliminates pauses.",
        ],
      },
      {
        h: "The one-line description is the whole game",
        p: [
          "If the listener cannot repeat what your company does after one sentence, nothing later in the pitch is being evaluated on its merits - they are still working on the first question while you deliver the rest.",
          "Test it directly. Say the sentence to someone outside your sector and ask them to say it back. Not whether they understood it, which people say out of politeness, but what they think it is. The gap between the two is your real problem statement.",
          "Delivery matters here more than anywhere else in the pitch. This sentence needs a full stop after it. Founders almost universally run it into the next sentence, which removes the moment the listener needed to actually absorb it.",
        ],
      },
      {
        h: "A week of rehearsal",
        p: [
          "Days 1 to 2: record the full sixty-second pitch daily without correction. Note length, pace by half, filler rate and where the fillers land. You are looking for the pattern, not a good take.",
          "Days 3 to 4: cut. Almost every pitch at this stage is over length, and cutting words is the only fix that survives contact with nerves. Target the number of words your slot actually holds - roughly 140 for sixty seconds at a sustainable pace.",
          "Day 5: beats in isolation. Twenty seconds each, in random order, unrehearsed sequence.",
          "Days 6 to 7: interruptions. Have someone break in with a question partway through, and practise answering it and returning. This is the rehearsal that most closely resembles the actual meeting, and the one founders skip.",
        ],
        list: {
          ordered: true,
          intro:
            "Seven days, one recording a day. The point is repetition against a fixed deadline, not perfection on day one.",
          items: [
            "Day 1: record the sixty-second version cold and measure all four numbers. Do not fix anything.",
            "Day 2: record the one-line description on its own, twenty times. It is the sentence everything else depends on.",
            "Day 3: full pitch again, working the single worst number from day 1.",
            "Day 4: answer the five questions you least want, timed, sixty seconds each.",
            "Day 5: full pitch, then straight into two questions with no gap. This is the transition where founders lose pace.",
            "Day 6: record in the actual conditions - standing, at the time of day the meeting falls, on the device you will use.",
            "Day 7: rest. A pitch rehearsed on the morning of the meeting sounds rehearsed on the morning of the meeting.",
          ],
        },
      },
    ],
    faqs: [
      {
        q: "How many times should I practise my pitch?",
        a: "Daily for about a week before a raise, in short sessions rather than long ones. Beyond roughly ten recorded repetitions of the same version you start memorising the words, which makes the pitch more fragile under interruption rather than less.",
      },
      {
        q: "Should I memorise my pitch?",
        a: "Memorise the structure, not the sentences. Memorised wording collapses at the first interruption, and investor conversations are made of interruptions. Five beats you can deliver in any order is more robust and sounds less recited.",
      },
      {
        q: "How long should a startup pitch be?",
        a: "The sixty-second version should genuinely run sixty to seventy-five seconds, which is about 140 to 175 words at a sustainable pace. If yours runs longer, cut words rather than speeding up - speeding up costs retention precisely where you need it.",
      },
      {
        q: "How do I practise a pitch alone?",
        a: "Record it and measure it. A recording tells you length, pace, filler rate and pause placement, which is more actionable than what an untrained listener can report. Add a second person only for the interruption practice, which is the part you cannot do alone.",
      },
    ],
    related: [
      "how-to-sound-confident-in-an-investor-pitch",
      "how-to-prepare-for-investor-qa",
      "how-to-explain-your-startup-clearly",
    ],
    cta: CTA.pitch,
  },
  {
    slug: "how-to-sound-confident-in-an-investor-pitch",
    title: "How to Sound Confident in an Investor Pitch",
    metaTitle: "Sound Confident in an Investor Pitch",
    description:
      "Investors read confidence from four delivery signals, all of them measurable. What they are, where founders lose them, and how to hold them under real pressure.",
    answer:
      "Sound confident in an investor pitch by holding four behaviours steady under pressure: a pace that does not accelerate past about 160 words per minute, a full stop after your one-line description and before your ask, pitch range that does not flatten, and answers that begin with the answer.",
    intro:
      "You sound confident in an [investor pitch](/guides/investor-pitch-delivery) by holding four delivery behaviours steady under pressure: a pace that does not accelerate, a full stop after your [one-line description](/guides/how-to-explain-your-startup-clearly) and before your ask, pitch range that does not flatten, and answers that begin with the answer. Founders lose all four in the same place - the moment a question arrives that they were not expecting - which is why rehearsing the pitch does almost nothing for how confident you sound and rehearsing the interruptions does almost everything.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 7,
    primaryKeyword: "how to sound confident in an investor pitch",
    secondaryKeywords: [
      "investor pitch confidence",
      "pitching to investors nervous",
      "founder pitch delivery",
    ],
    cluster: "founder",
    sections: [
      {
        h: "What an investor is actually reading",
        p: [
          "In the first minute an investor is making a crude judgment about whether you know your own business well enough to be trusted with the details later. That judgment runs on delivery, because there is not yet enough content to run on anything else.",
          "The signals are the ordinary ones - stable pace, pauses at thought boundaries, pitch range, downward terminal inflection - but the stakes concentrate them. A founder who accelerates through the traction numbers reads as someone hoping the numbers are not examined, whether or not that is true.",
          "Nothing here requires you to feel calm. All four behaviours are producible at a high heart rate, which is fortunate, because the heart rate is not negotiable.",
        ],
      },
      {
        h: "Where founders lose it",
        p: [
          "On the unexpected question. Pace spikes, fillers cluster, and the answer starts before the destination is chosen. This is the single highest-value moment to rehearse and the one almost nobody rehearses.",
          "On the traction slide. Fillers gather before numbers as a rule, and a pitch concentrates the numbers into one place. A founder who says um before every metric is telling the room something about their confidence in the metrics.",
          "On the ask. Many founders speed up and drop their volume on the amount, which reads as apology. The ask deserves a pause before it and a downward inflection on the number.",
          "In the back half generally. Pace drifts upward through a pitch as the pressure accumulates, so the last twenty seconds are usually the worst-delivered and are also what the room remembers most recently.",
        ],
        list: {
          intro:
            "Almost always in the same four places, and almost always within a second of the same trigger.",
          items: [
            "The moment a question arrives mid-sentence, where pace jumps and the answer starts with context.",
            "The ask, delivered as a subordinate clause and run into the next sentence rather than stopped after.",
            "The traction slide, where an uncomfortable number gets said faster and quieter than everything around it.",
            "The competitor question, where pitch flattens and sentence endings start rising.",
          ],
        },
      },
      {
        h: "The pre-answer pause",
        p: [
          "Take two seconds of silence before answering any question you did not expect. It buys the planning time that would otherwise be spent on um, it prevents the answer starting before you have chosen where it ends, and it reads as consideration rather than hesitation.",
          "It feels wildly uncomfortable. Two seconds of silence after a partner asks about your churn feels like an admission. On playback it sounds like someone taking the question seriously, which is the opposite reading.",
          "Practise it in isolation, because it will not appear spontaneously under pressure. Have someone ask you uncomfortable questions and enforce a two-second gap before every answer. Ten repetitions is enough to make it available.",
        ],
      },
      {
        h: "Answer first, then support",
        p: [
          "Investors read a preamble as evasion, whether or not it is. If the question is about your burn, the first sentence contains the burn number.",
          "Then one piece of support, then stop. Two claims maximum. A third makes the listener retain none of them and reads as someone talking their way toward safety.",
          "Say what you do not know, plainly and once. I do not have that number in front of me, I will send it today reads far stronger than a constructed approximation, and investors are unusually good at detecting the difference.",
        ],
      },
      {
        h: "Rehearsing under pressure",
        p: [
          "Record answers to the ten questions you least want to be asked. Not the ten most likely - the ten you are dreading. The dread is what changes your delivery, and rehearsing comfortable questions does not touch it.",
          "Measure the same numbers you measure everywhere else: pace by half, [filler rate](/guides/how-to-stop-using-filler-words), longest pause, answer length. Compare the dread questions to your baseline. The size of the gap is the amount of work still to do.",
          "Re-record the worst one immediately. The correction happens in the gap between hearing the defect and speaking again, and that gap closes if you wait until tomorrow.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I stop sounding nervous when pitching investors?",
        a: "Work on delivery rather than on the nerves. Keep pace stable, pause fully after your one-line description and before your ask, and take two seconds of silence before answering unexpected questions. All three are producible while your heart rate is high, and the room reads them rather than your internal state.",
      },
      {
        q: "What do investors notice first in a pitch?",
        a: "Whether they can repeat what your company does after your first sentence, and whether your delivery stays stable when the questions start. There is not enough content in the first minute for anything else, so the early judgment runs largely on those two things.",
      },
      {
        q: "Should I pause before answering an investor question?",
        a: "Yes, about two seconds. It buys planning time that would otherwise become filler words, it stops the answer beginning before you have chosen an ending, and it reads as consideration. It feels far longer to you than it does to the room.",
      },
      {
        q: "What if I do not know the answer to a question?",
        a: "Say so once, plainly, and commit to following up. A constructed approximation is usually detectable and costs more credibility than the gap it was covering.",
      },
    ],
    related: [
      "how-to-prepare-for-investor-qa",
      "pitch-practice-for-founders",
      "how-to-speak-with-confidence",
    ],
    cta: CTA.pitch,
  },
  {
    slug: "how-to-prepare-for-investor-qa",
    title: "How to Prepare for Investor Q&A",
    metaTitle: "How to Prepare for Investor Q&A",
    description:
      "The questions decide the meeting, not the pitch. How to build a real question bank, structure answers so they land, and rehearse the ones you are dreading.",
    answer:
      "Prepare for investor Q&A by rehearsing the ten questions you are dreading, out loud and timed. Structure every answer as claim, then evidence, then stop, and cap it at about sixty seconds. Rehearse them cold rather than in order, because the meeting will not ask them in the order you practised.",
    intro:
      "Prepare for investor Q&A by rehearsing the ten questions you are dreading, out loud, with the answers timed. The [pitch](/guides/investor-pitch-delivery) is the part founders rehearse and the questions are the part that decides the meeting, which is exactly backwards. Build a bank of the questions you do not want, structure each answer as claim then evidence then stop, cap it at thirty seconds, and record yourself answering them cold. The measurable target is that your pace, [filler rate](/guides/how-to-stop-using-filler-words) and answer length on a dreaded question look like your baseline on an easy one.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 8,
    primaryKeyword: "how to prepare for investor q&a",
    secondaryKeywords: [
      "investor questions for founders",
      "how to answer investor questions",
      "vc q&a preparation",
    ],
    cluster: "founder",
    sections: [
      {
        h: "Build the bank from what you are avoiding",
        p: [
          "Write down every question you hope will not be asked. That list is more useful than any generic list of investor questions, because the generic ones do not produce the physiological response that changes your delivery.",
          "Add the questions you have already been asked and answered badly. Founders remember these vividly and then never rehearse them, which is a strange and very common pattern.",
          "Group them. Most fall into a small number of buckets - the market is smaller than you claim, the growth is not organic, the competitor is better funded, the team is missing a function, the churn is the real story. Preparing a bucket prepares several questions at once.",
          "Keep it to about ten. A bank of forty questions gets skimmed rather than rehearsed, and skimming is exactly the failure mode this exercise exists to fix.",
        ],
        list: {
          intro:
            "Start from the questions you hope are not asked. That list is short, you already know it, and it is where the meeting is decided.",
          items: [
            "Why is this a company rather than a feature someone else ships next quarter?",
            "What happens to you if the incumbent does this in a year?",
            "Which number here are you least confident in, and why?",
            "Why has growth flattened over the last two months?",
            "Why is this the right team for this specific problem?",
            "What did you get wrong in the last twelve months, and what changed as a result?",
            "How much of your revenue comes from your largest customer?",
            "What have you already tried that did not work?",
            "Why now, when this was possible three years ago?",
            "What would make you shut this down?",
          ],
        },
      },
      {
        h: "The shape of a good answer",
        p: [
          "Claim first. The answer to the question, in the first sentence, without restating the question and without a run-up. If the question is whether growth is organic, sentence one says what proportion is.",
          "One piece of evidence. The strongest one, with a real number if you have it. Not three pieces - three reads as arguing rather than answering.",
          "Then stop, or add one sentence of implication. Twenty to thirty seconds total. Longer answers to hard questions read as defensiveness almost regardless of content.",
          "Concede what is true. If the competitor genuinely is better funded, saying so and then explaining why it does not decide the outcome is far stronger than disputing it. Investors have heard the dispute and they have rarely heard the concession.",
        ],
        list: {
          ordered: true,
          intro:
            "Claim, evidence, stop. Under sixty seconds. The stop is the part founders skip, and it is the part that reads as confidence.",
          items: [
            "State the answer in the first sentence, even when the answer is that you do not know.",
            "Give one piece of evidence for it - a number, a customer, a specific thing that happened.",
            "Stop, and let them ask the follow-up. Answering the follow-up before it is asked reads as anticipating an attack.",
          ],
        },
      },
      {
        h: "Rehearse cold, and measure",
        p: [
          "Have someone ask the questions in random order without warning, or use a prompt you have not read. Rehearsing a question you are currently looking at trains nothing, because the thing you are training against is the surprise.",
          "Record it. Then compare four numbers against your baseline: pace in each half, filler rate, longest pause, and answer length. On dreaded questions expect pace up, fillers up, pauses gone and length roughly doubled.",
          "Work on the two worst questions rather than all ten. The delivery collapse is usually concentrated, and fixing the two that produce it moves the whole set, because much of what you are fixing is the response to being surprised rather than the content.",
          "Re-record immediately after listening. The correction lives in that gap.",
        ],
      },
      {
        h: "Two habits that cost founders the room",
        p: [
          "Answering a question you were not asked. Under pressure founders often answer the adjacent question they prepared for. The investor notices, and it converts an awkward question into a credibility problem.",
          "Filling the silence after your answer. You finish, nobody responds immediately, and you start adding qualifications. The pause after your answer belongs to them; leaving it alone is one of the strongest signals available to you.",
          "Both are discomfort-with-silence problems wearing different clothes, which is why the pre-answer pause drill tends to fix both at once.",
        ],
      },
    ],
    faqs: [
      {
        q: "What questions do investors ask founders?",
        a: "Most cluster into a few buckets: whether the market is as large as claimed, whether growth is organic, how you compare to a better-funded competitor, what is missing from the team, and what the churn or retention really looks like. Preparing the buckets prepares most of the individual questions.",
      },
      {
        q: "How long should an answer to an investor question be?",
        a: "Twenty to thirty seconds - roughly claim, one piece of evidence, stop. Longer answers to hard questions read as defensiveness fairly independently of what is in them.",
      },
      {
        q: "How do I answer a question I do not know the answer to?",
        a: "Say you do not have it, say when you will, and stop. Once, plainly. Constructed approximations are usually detectable and cost more than the gap they were covering.",
      },
      {
        q: "Should I rehearse investor questions out loud?",
        a: "Yes, and cold - asked in random order without warning. Rehearsing a question you are currently looking at trains recognition, while the thing that changes your delivery in the meeting is surprise.",
      },
    ],
    related: [
      "how-to-sound-confident-in-an-investor-pitch",
      "how-to-stop-rambling",
      "pitch-practice-for-founders",
    ],
    cta: CTA.answer,
  },
  {
    slug: "how-to-explain-your-startup-clearly",
    title: "How to Explain Your Startup Clearly",
    metaTitle: "How to Explain Your Startup Clearly",
    description:
      "If a listener cannot repeat what your company does, nothing after that sentence is being evaluated. How to build the one-liner and test whether it actually works.",
    answer:
      "Explain your startup in one sentence that names who has the problem and what changes for them, then stop and let it land. Test it by asking listeners to say it back rather than whether they understood. Until they can repeat it accurately, everything after that sentence is being half-heard.",
    intro:
      "Explain your startup in one sentence that names who has the problem and what changes for them, then stop and let it land. The test is not whether people say they understood - they will, out of politeness - but whether they can say it back to you accurately. Until they can, everything after that sentence is being heard by someone still working on the first question. Most founders fail this not on the wording but on the delivery: they run the one-liner straight into the next sentence and remove the moment the listener needed to absorb it.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 7,
    primaryKeyword: "how to explain your startup clearly",
    secondaryKeywords: [
      "startup one liner",
      "how to describe what your company does",
      "explaining your startup to non-technical people",
    ],
    cluster: "founder",
    sections: [
      {
        h: "The shape that works",
        p: [
          "Name who has the problem, then what changes for them. Not the technology, not the category, not the market size. A listener who knows who it is for and what is different can place everything you say next; a listener who has only heard a category cannot.",
          "Use the words your users use. Founders drift toward the vocabulary of their own build - the platform, the engine, the orchestration layer - because that is what they spend the day inside. Users describe the same thing in far plainer terms, and the plain version is the one that survives being repeated to a third party.",
          "One sentence, not two. The second sentence is almost always a hedge, and hedges are where the listener loses the thread.",
          "Avoid the X-for-Y analogy unless both halves are genuinely well known to this specific listener. It compresses well and misleads often, and you will spend the next minute correcting the wrong half.",
        ],
        list: {
          ordered: true,
          intro:
            "One sentence, three parts, in this order. Anything else in it is going in the second sentence.",
          items: [
            "Name who has the problem, specifically enough that the listener can picture one of them.",
            "Name what is broken for that person today, in their words rather than yours.",
            "Name what changes once they use it. Not what the product is - what is different afterwards.",
          ],
        },
      },
      {
        h: "Test it properly",
        p: [
          "Say it out loud to someone outside your sector and ask them to say it back. Not whether they got it - what they think it is. The gap between their version and yours is the actual problem, and it is usually specific enough to fix in one edit.",
          "Do this with three people. One misunderstanding is a person; three of the same misunderstanding is your sentence.",
          "Test it by voice, not in writing. A written one-liner gets reread; a spoken one gets one pass. If it only works on the page, it does not work in the meeting.",
          "Watch for the polite yes. Almost everyone will say they understood. The say-it-back requirement is what makes the test informative, and dropping it makes the whole exercise worthless.",
        ],
      },
      {
        h: "The delivery half nobody rehearses",
        p: [
          "Full stop after the sentence. A real one, a second or more. This is the single most common [delivery failure in a pitch](/guides/investor-pitch-delivery): the one-liner is fine and it is immediately buried under the next sentence.",
          "Do not accelerate into it. Founders have said this sentence hundreds of times, and familiar material drifts fast. The listener is hearing it for the first time and needs it at a [slower pace](/guides/ideal-speaking-pace-words-per-minute) than it feels natural to deliver.",
          "Land the last word downward. A one-liner ending on a rising inflection sounds like you are checking whether it was acceptable, which invites the listener to evaluate the sentence rather than absorb it.",
          "Say it the same way every time, even though the rest of your pitch should stay loose. This one sentence is the exception to the rehearse-structure-not-words rule, because it has to survive being repeated by someone else.",
        ],
      },
      {
        h: "Explaining something technical",
        p: [
          "Give the outcome before the mechanism. Almost every unclear technical explanation is a mechanism looking for an outcome it was never attached to. What changes for the user comes first; how it works comes second, and only if asked.",
          "Use one comparison, not a chain. Chained analogies compound their inaccuracies, and by the third the listener is reasoning about the analogy rather than about your company.",
          "Watch for the curse of knowledge in specific words rather than in general complexity. Usually two or three terms are doing all the damage, and they are terms you no longer register as jargon. Recording yourself and listening as a stranger is the fastest way to find them.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I write a one-line description of my startup?",
        a: "Name who has the problem and what changes for them, in the words your users would use rather than the words your team uses. Leave out the technology and the category. Then test it by asking three people outside your sector to say it back to you.",
      },
      {
        q: "Why do people not understand what my company does?",
        a: "Usually two or three specific terms rather than general complexity, and usually terms you stopped registering as jargon. Recording the explanation and listening back as a stranger is the fastest way to find them.",
      },
      {
        q: "Should I use an X for Y analogy?",
        a: "Only if both halves are genuinely well known to the person in front of you. Analogies compress well and mislead often, and correcting the wrong half costs more time than describing the thing plainly would have.",
      },
      {
        q: "How do I explain a technical product to non-technical people?",
        a: "Outcome before mechanism. Say what changes for the user first and explain how it works only if you are asked. Most unclear technical explanations are a mechanism that was never attached to an outcome.",
      },
    ],
    related: [
      "pitch-practice-for-founders",
      "how-to-stop-rambling",
      "how-to-prepare-for-investor-qa",
    ],
    cta: CTA.answer,
  },
  {
    slug: "free-ai-public-speaking-practice",
    title: "Free AI for Public Speaking Practice",
    metaTitle: "Free AI for Public Speaking Practice",
    description:
      "What AI can and cannot do for public speaking, the numbers that matter for a talk rather than a pitch, and a free rehearsal routine that fits in fifteen minutes a day.",
    answer:
      "Free AI for public speaking practice replaces the one part of rehearsal that used to need another person: an honest account of what you actually did. Record a rehearsal and you get pace across the whole talk and inside each section, filler rate, pause placement, and the words a listener would miss.",
    intro:
      "AI does not cure stage fright. What it removes is the part of rehearsal that used to require another person: an honest account of what you actually did, rather than what it felt like you did. Record a rehearsal and you get your pace across the whole talk and inside each section, your [filler rate](/guides/how-to-stop-using-filler-words), where your pauses fell, and which words a listener would have missed. That is most of what a speaking coach spends the first three sessions telling you, and it costs nothing.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 9,
    primaryKeyword: "free ai for public speaking",
    secondaryKeywords: [
      "public speaking apps free",
      "free ai communication coach",
      "free ai speech coach",
      "free presentation practice app",
    ],
    cluster: "tools",
    sections: [
      {
        h: "What AI is good for, and what it is not",
        p: [
          "It is good at the things that are true of the recording and invisible to you while speaking. You do not know that you sped up by thirty [words per minute](/guides/ideal-speaking-pace-words-per-minute) in the last two minutes, that your longest pause was under half a second, or that the word you built the whole talk around came out too soft to hear four times. All three are measurable and all three are fixable within a week.",
          "It is not good at whether the talk was worth giving. Structure, the choice of examples, whether the ending earned the applause - a competent human audience judges those in a way nothing automated approaches. If your problem is that the material is thin, no measurement will find it.",
          "It is also not an audience. Rehearsing alone into a laptop trains you for rehearsing alone into a laptop, which is why the last rehearsal before a real talk should have at least one person in the room even if the previous ten did not.",
        ],
      },
      {
        h: "A talk is not a pitch, and the numbers move",
        p: [
          "A sixty-second pitch is short enough that one pace figure describes it. A ten-minute talk is not. What you want from a longer rehearsal is pace per section, because the failure mode is drift: most speakers open at a reasonable rate and finish thirty to forty words per minute faster, usually starting from the slide they were least sure of.",
          "Filler rate behaves differently too. In a short pitch fillers cluster before numbers. In a talk they cluster at transitions, in the two or three seconds after one section ends and before the next begins, which is exactly where a rehearsed pause would have done the work instead.",
          "Overrun is its own measurement and the one most talks fail on. Time each rehearsal end to end rather than trusting the slide count. A talk that runs to eleven minutes in rehearsal runs to thirteen in the room, because nerves add words rather than removing them.",
          "The comfortable band is the same as anywhere else: roughly 130 to 150 words per minute, dropping toward 120 for material the audience has never heard before. Above about 170 people follow the words and stop retaining the point.",
        ],
      },
      {
        h: "Rehearse the parts that actually fail",
        p: [
          "The first thirty seconds. This is where nerves are highest, where pace is least controlled, and where an audience decides how much attention to give the remaining nine minutes. It is worth rehearsing this section more times than the rest of the talk combined.",
          "The transitions. Almost nobody rehearses the sentence that gets from section three to section four, which is why it is where fillers and lost pace concentrate. Write the transition sentences down and say them aloud on their own until they are automatic.",
          "The ending. Talks that trail off do it because the speaker rehearsed the middle and improvised the last twenty seconds. Know your final sentence exactly, and rehearse stopping after it.",
          "The questions afterwards. Q&A is unrehearsable as a script and very rehearsable as a format: answer in about thirty seconds, take a beat before you start, stop when you have made the point. Practising that shape matters more than predicting the questions.",
        ],
      },
      {
        h: "Stage fright is physical, and it shows up in the numbers",
        p: [
          "Nerves do not usually announce themselves as fear. They announce themselves as a faster heart rate, shallower breathing and a shorter fuse for silence, and those three produce exactly the delivery pattern you can measure: pace up, pauses gone, word endings dropped.",
          "This is useful because the symptom is more tractable than the cause. Telling yourself to be less nervous does nothing. Deliberately holding a one-second pause at every full stop does something immediately, and it works even while the nerves are still there.",
          "The other half is exposure, and exposure requires repetition rather than intensity. Ten one-minute recordings across ten days moves the physical response more than one long panicked rehearsal the night before.",
        ],
      },
      {
        h: "A free rehearsal schedule for a two-week runway",
        p: [
          "Days 1 to 3: record the opening ninety seconds only, once a day. Do not rehearse the whole talk yet. You are establishing pace and a baseline for the section that carries the most risk.",
          "Days 4 to 8: run the talk in halves, timing each half. Fix the worst single number after each run - usually pace drift in the second half, occasionally a filler cluster at one specific transition.",
          "Days 9 to 12: full run-throughs, timed, standing up, at the volume you will actually use. Volume changes pace, so a seated murmured rehearsal does not predict the real thing.",
          "Days 13 and 14: one run in front of a person, and one recorded run of the opening and closing only. Do not add new material in the last two days; the marginal value of a better example is lower than the cost of rehearsing it twice.",
        ],
        list: {
          ordered: true,
          intro:
            "Fourteen days to a talk, using only a free tier. One recording a day, and one thing to fix at a time.",
          items: [
            "Days 1-2: record the opening ninety seconds cold. Measure pace, fillers and [pause placement](/guides/how-to-use-pauses-when-speaking). Fix nothing yet.",
            "Days 3-5: work only the worst of the three numbers, on the opening, until it sits in range.",
            "Days 6-8: record the section you are least sure of, not the one you enjoy. Pace almost always spikes there.",
            "Days 9-10: run the transitions between sections back to back. Fillers cluster on seams.",
            "Days 11-12: full run-through, standing, timed. Compare the total length to the slot you have been given.",
            "Day 13: record the opening once more and compare against day 1 directly. This is the only honest measure of progress.",
            "Day 14: do not rehearse. Reread the opening sentence and stop there.",
          ],
        },
      },
      {
        h: "Where a free tier will stop",
        p: [
          "Most free tiers cap either the length of a recording or the number per day. For a ten-minute talk this matters, and the workaround is to rehearse in sections rather than fighting the cap - which is better practice anyway, since section-level rehearsal is where the fixes happen.",
          "Free tiers rarely include video, so eye contact, gesture and where you stand are outside what any of this measures. Those are real parts of public speaking and a phone camera propped on a shelf covers them adequately.",
          "Nothing free will give you an audience, room acoustics, or the specific feeling of a microphone that is louder than you expected. Book five minutes in the actual room if you possibly can; it is worth more than another rehearsal.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a genuinely free AI for public speaking practice?",
        a: "Yes, several, though the free tiers differ enormously. What to check is whether the allowance recurs daily or weekly rather than being a lifetime handful, because rehearsing a talk takes ten or more sessions and a five-session lifetime cap runs out before the useful part begins.",
      },
      {
        q: "Can an app help with stage fright?",
        a: "Indirectly, and more than you would expect. It cannot lower your heart rate, but nerves express themselves as measurable delivery changes - faster pace, vanished pauses, dropped word endings - and correcting those directly makes you sound composed while you are still nervous. The composure usually follows.",
      },
      {
        q: "How many times should I rehearse a talk?",
        a: "Around ten runs for a ten-minute talk, weighted heavily toward the opening and the transitions rather than distributed evenly. Full run-throughs matter less than most people think; sectional rehearsal is where the fixes actually happen.",
      },
      {
        q: "Does rehearsing alone into a laptop transfer to a real audience?",
        a: "Partly. Pace, pauses and filler rate transfer well because they are motor habits. Nerve tolerance transfers poorly, which is why the last rehearsal should have at least one live person in the room and, if possible, take place standing in the actual space.",
      },
    ],
    related: [
      "free-ai-communication-tools",
      "how-to-speak-with-confidence",
      "how-to-use-pauses-when-speaking",
    ],
    cta: CTA.pace,
  },
  {
    slug: "ai-speaking-partner",
    title: "Practising by Talking to an AI",
    metaTitle: "Free AI Speaking Partner: Does It Work?",
    description:
      "Talking to an AI is genuinely useful for one thing and useless for another. What a free AI speaking partner is good for, what it cannot give you, and how to run a session.",
    answer:
      "The best free AI English speaking partner is whichever one makes you speak out loud, unscripted, to questions you did not write. Voice matters more than the model behind it: typing to a chatbot trains writing rather than speech. Use a partner for speaking volume and a recording analyser for judgement.",
    intro:
      "An AI speaking partner is good at one thing that matters and bad at one thing people expect from it. It is good at making you speak out loud, unscripted, to a question you did not write, as often as you like and without the social cost of using up someone else's afternoon. It is bad at judging you the way a person would: it does not get bored, it does not misunderstand you in the specific way a distracted investor does, and it accepts a vague answer far more readily than a human ever would. Used for the first and not the second, it is the cheapest speaking practice available.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 9,
    primaryKeyword: "best free ai english speaking partner",
    secondaryKeywords: [
      "apps to talk to ai",
      "ai voice chat free",
      "english communication ai app free",
      "free ai app to improve communication skills",
      "chat bot online free",
    ],
    cluster: "tools",
    sections: [
      {
        h: "Why talking to an AI works at all",
        p: [
          "The gap most people have is not knowledge, it is retrieval under load. You know the answer, and something about being asked out loud, in real time, by someone who is waiting, makes it come out worse than it does in your head. Closing that gap requires reps of the exact thing - being asked and answering - and reps are what an AI partner supplies without limit.",
          "It also removes the social cost. A colleague will do this twice before it becomes an imposition. An AI will do it forty times, at midnight, and ask the same uncomfortable question again after you fumbled it, which is precisely the repetition the fumble needed.",
          "And it produces the one thing rehearsing in your head cannot: an actual spoken answer, with a real length, real pace and real hesitations. Almost everyone underestimates how long their answers run, usually by a factor of two, and no amount of mental rehearsal reveals that.",
        ],
      },
      {
        h: "Typing to a chatbot is not speaking practice",
        p: [
          "Text chat trains writing. It gives you unlimited time to compose, a backspace key, and no pressure to fill silence - the three things that are absent from every real conversation you were trying to prepare for.",
          "If a tool is going to help your speaking, the practice has to be spoken out loud, in one take, with the clock running. That is the only version that engages the machinery that fails you in the room.",
          "This is worth checking before you commit to a tool, because a lot of products described as speaking partners are text products with a play button. The test is simple: can you answer without touching the keyboard, and does it hold you to a length.",
        ],
      },
      {
        h: "What to look for in a free one",
        p: [
          "It should ask one question at a time and then wait. A partner that delivers three questions in a paragraph has turned a conversation into a reading exercise, and you will answer the last one and forget the first two - which is also what happens with human interviewers, but you cannot practise recovering from it if the format never creates it.",
          "It should follow up on the weakest part of your answer rather than moving on politely. The value is concentrated in the second question, because the first one you were ready for.",
          "It should measure something. A partner that only talks back leaves you with an impression of how it went, and impressions are exactly what recording exists to replace. [Pace](/guides/ideal-speaking-pace-words-per-minute), length and [filler rate](/guides/how-to-stop-using-filler-words) for each answer are the minimum worth having.",
          "It should let you pick the pressure. Practising a friendly standup and practising a [hostile investor](/guides/how-to-prepare-for-investor-qa) are different exercises, and doing only the friendly one builds a confidence that does not survive contact.",
        ],
        list: {
          intro:
            "Four things decide whether a free speaking partner is worth the twenty minutes. Feature lists rarely mention any of them.",
          items: [
            "It takes voice in and gives voice back. Typing to a chatbot trains writing, not speech.",
            "The free allowance recurs rather than being a lifetime handful. A habit needs two weeks, not five attempts.",
            "It asks follow-ups on the weak half of your answer instead of moving politely to the next question.",
            "It does not penalise your accent. Test this by saying something you know was perfectly clear.",
          ],
        },
      },
      {
        h: "What it cannot give you",
        p: [
          "Stakes. Nothing is at risk, and part of what breaks people in real meetings is knowing that something is. Practice narrows the gap without closing it.",
          "A face. Most of what you read from a listener - the moment they stop following, the small frown at the number you glossed - comes through an expression, and answering into a text box or a voice with no face trains none of that.",
          "Genuine standards. An AI will accept an answer that a person would have pushed back on, so you have to supply the discipline it will not. Set your own rules before the session and hold to them: thirty seconds a question, no restarting a sentence, no answering a question you were not asked.",
          "Silence that costs something. A human pause is uncomfortable and that discomfort is the thing you are training against. An AI pause is free, which makes pause practice easier than it will be on the day.",
        ],
      },
      {
        h: "How to run a twenty-minute session",
        p: [
          "Pick one scenario and stay in it. Mixing an interview, a pitch and a standup in one session gives you three shallow reps instead of six useful ones.",
          "Answer in about thirty seconds: a claim, one piece of evidence, then stop. The stopping is the part being practised. Most people keep talking past the point because the silence afterwards feels like a failure, and it is not.",
          "Do not restart. When an answer goes wrong, finish it anyway, because finishing badly is a skill and it is the one you will need. Restarting trains you to restart, and you cannot restart in a real meeting.",
          "Take the worst two answers and do those questions again at the end. That is the whole session: fifteen minutes of reps and five minutes on the two that failed.",
        ],
        list: {
          ordered: true,
          intro:
            "Twenty minutes, four blocks. The structure matters more than the partner does.",
          items: [
            "Five minutes on something you know well, to get past the first-two-minutes awkwardness that distorts everything after it.",
            "Ten minutes on something you have not explained before, which is where the actual practice happens.",
            "Three minutes answering follow-ups you did not expect, without preparing between them.",
            "Two minutes recording a summary of what you just said, which is the part you can measure and compare next week.",
          ],
        },
      },
      {
        h: "When to stop talking and start recording",
        p: [
          "A conversational partner is the right tool for retrieval under pressure. It is the wrong tool for measuring a habit, because every session has different questions and different lengths, so nothing is comparable week to week.",
          "For habit work you want the opposite: the same prompt, the same length, recorded solo, so the only variable is you. That is the exercise that shows a filler rate falling from nine per minute to four across a fortnight.",
          "Most people need both, in roughly a two to one ratio - daily solo recording to establish and track the habit, a conversational session twice a week to make sure it survives being interrupted. Doing only the second is how you end up comfortable talking and unable to say why nothing changed.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a free AI I can just talk to for practice?",
        a: "Yes, though free tiers on voice are tighter than on text because each spoken turn costs the provider more to run. Check two things: whether it is genuinely voice rather than a text chatbot with audio playback, and how many turns or sessions the free allowance covers per day.",
      },
      {
        q: "Can an AI speaking partner improve my spoken English?",
        a: "For fluency under pressure, yes, because the limiting factor past intermediate level is retrieval rather than vocabulary and retrieval improves with reps. For pronunciation it is weaker, and for whether your answer was actually good it is unreliable, since it will accept a vague answer a person would have challenged.",
      },
      {
        q: "How is this different from talking to myself?",
        a: "The question is not yours. Talking to yourself means you choose what to answer, which quietly removes the exact difficulty you are training for. A partner that asks a follow-up you were not ready for reproduces the part of a real conversation that goes wrong.",
      },
      {
        q: "How long should a practice session be?",
        a: "Twenty minutes, and no more than one scenario. Attention for this kind of practice falls off sharply after about that long, and a second scenario in the same session usually produces worse reps than stopping and coming back tomorrow.",
      },
    ],
    related: [
      "free-ai-communication-tools",
      "how-to-prepare-for-investor-qa",
      "how-to-improve-english-communication-skills",
    ],
    cta: CTA.answer,
  },
  {
    slug: "yoodli-alternatives",
    title: "Free Alternatives to Yoodli and Poised",
    metaTitle: "Free Yoodli and Poised Alternatives",
    description:
      "How Yoodli, Poised and recording-based coaches differ, where each free tier stops, and how to choose by the situation you are preparing for rather than the feature list.",
    answer:
      "Yoodli alternatives divide into three shapes that barely compete with each other: recording analysers that measure a rehearsal you made on purpose, meeting copilots that coach inside a live call, and roleplay simulators that ask you questions. Yoodli is mainly a roleplay simulator, so choose by the shape your situation needs.",
    intro:
      "AI speech coaches come in three shapes, and most comparison articles list them as if they competed. They mostly do not. A recording analyser measures a rehearsal you made on purpose. A meeting copilot sits in a real call and coaches you inside it. A roleplay simulator asks you questions so you can practise answering. Yoodli is mainly the first and third, Poised is the second, and which one is worth your time depends entirely on whether your problem shows up when you rehearse or only when someone else is in the room. Details below were accurate in August 2026; pricing and packaging on any of these products change, so check the vendor before you commit.",
    published: "2026-08-22",
    updated: "2026-08-24",
    readMinutes: 9,
    primaryKeyword: "yoodli alternatives",
    secondaryKeywords: [
      "yoodli ai",
      "poised ai",
      "free alternative to yoodli",
      "best ai tools for communications professionals",
      "ai speech coach comparison",
    ],
    cluster: "tools",
    sections: [
      {
        h: "The three shapes of AI speech coach",
        p: [
          "Recording analysers. You record deliberately, alone, and get measurements back with the timestamps that produced them. The strength is repeatability: the same prompt at the same length a week later is the only setup where a change in your [filler rate](/guides/how-to-stop-using-filler-words) means anything. The weakness is that rehearsal pressure is not meeting pressure.",
          "Meeting copilots. Something joins your live calls and coaches you during or immediately after them. The strength is that it sees the real thing, including the moment you talked over someone. The weakness is that a bot in the meeting is a decision involving everyone else on the call, and that you cannot practise a call you are not having.",
          "Roleplay simulators. An AI plays an interviewer, a customer or an investor and asks questions. The strength is pressure on demand. The weakness is that it will accept an answer a real counterpart would have pushed on, and that no two sessions are comparable, so it measures nothing over time.",
          "Most people need the first plus one of the others. Almost nobody needs all three, and buying all three is the most common way this category gets abandoned in week two.",
        ],
        table: {
          caption:
            "The three shapes of AI speech coach, and which situation each one answers",
          head: ["Shape", "What it does", "Strength", "Choose it when"],
          rows: [
            [
              "Recording analyser",
              "Measures a rehearsal you made on purpose, with timestamps",
              "Repeatable, so a change over time means something",
              "You have a date to prepare for",
            ],
            [
              "Meeting copilot",
              "Joins live calls and coaches during or after",
              "Sees the real thing, not the rehearsal",
              "The problem only appears with others present",
            ],
            [
              "Roleplay simulator",
              "Plays a role and asks you questions",
              "Pressure on demand",
              "You freeze when interrupted",
            ],
          ],
        },
      },
      {
        h: "Yoodli, briefly",
        p: [
          "Yoodli analyses speech and runs AI roleplays, reporting on filler words, pacing and word choice, with interview and sales-conversation practice as a headline use case. It is a mature product with a large feature surface, and it is aimed at a broad audience rather than one situation.",
          "The free tier, as of August 2026, is a small lifetime allowance - on the order of five roleplays - rather than a recurring one, with paid plans starting around eight dollars a month billed annually and a higher tier for unlimited practice. That shape is worth understanding before you start: a lifetime handful is sized for evaluating the product, not for the two weeks of repetition that changes a habit.",
          "If you want breadth, an established product, and you expect to pay, it is a reasonable default. If you want to record every day for a fortnight without a card, the free tier will run out before the useful part starts.",
        ],
      },
      {
        h: "Poised, briefly",
        p: [
          "Poised is the meeting copilot of the group. It coaches communication inside live calls across the usual platforms, which puts it in a genuinely different category from anything you use to rehearse alone.",
          "Poised was acquired by Deepgram in June 2024 and has continued as a product since. As with any acquired tool, confirm current availability and packaging on the vendor site rather than from a comparison article, this one included.",
          "It answers a question the others cannot: what you actually do in a real meeting, as opposed to what you do when you know you are rehearsing. That is worth a lot if the two differ for you. It is worth much less if your problem is a talk you are giving in ten days, since there is no live call to sit in.",
        ],
      },
      {
        h: "Choosing by situation rather than by feature list",
        p: [
          "You have a pitch, a talk or an interview on a date. You need a recording analyser and a daily habit, because the whole point is repetition against a fixed deadline. A meeting copilot has nothing to attach to.",
          "You are fine one-to-one and lose the room in group calls. You need a meeting copilot, because the failure does not reproduce when you rehearse and no amount of solo recording will surface it.",
          "You know your material and freeze when interrupted. You need roleplay, and specifically roleplay that follows up on the weak half of your answer rather than moving politely to the next question.",
          "You do not know which of the three describes you. Record sixty seconds answering a hard question about your own work. If the recording is already bad, the problem is delivery and rehearsal fixes it. If it is fine and meetings still go badly, the problem is what happens with other people present, and that is a different tool.",
        ],
      },
      {
        h: "Where FounderVoice sits, and where it does not",
        p: [
          "FounderVoice is a recording analyser first. You record sixty seconds in the browser and get pace overall and per section, filler count and rate with timestamps, pause length and placement, word-level clarity, and pitch range - with the moment behind each number, so you can hear it rather than trust it. The free allowance is ten recordings every 24 hours with no account and no card, which is deliberately the recurring shape rather than a lifetime handful, because a habit needs two weeks and not five attempts.",
          "It also has a practice mode, where an AI plays a standup lead, a sceptical operator or a seed investor and pushes back on what you said. The free allowance there is smaller than for recording, which is honest about what each costs to run.",
          "After several sessions it compares you against your own history rather than an average, which is the part that turns a set of numbers into a trend you can act on.",
          "What it is not: there is no meeting bot, so it will not sit in your calls; there is no video, so eye contact, gesture and posture are outside what it measures; and it is aimed at founder situations - the pitch, the [investor questions](/guides/how-to-prepare-for-investor-qa), the demo, the interview - rather than at general-purpose sales enablement. If you need a copilot inside live meetings, Poised is the category and this is not it.",
        ],
      },
      {
        h: "Evaluating any of them in one afternoon",
        p: [
          "Record the same sixty seconds into each candidate. Use a question you find genuinely uncomfortable about your own work, not a scripted paragraph, because a scripted paragraph hides every problem you are trying to find.",
          "Then check four things. Does it give you the timestamp behind each number, or only the number. Does it name one thing to fix, or list twelve. Can it compare this session to your last one. And does it penalise your accent, which you can test by recording something you know was perfectly clear.",
          "A tool that fails the first check is selling a score. A tool that fails the third is measuring you in isolation every time, which is the same as not measuring you at all. Those two eliminate most of the field in about twenty minutes.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is Yoodli free?",
        a: "It has a free tier, but as of August 2026 it is a small lifetime allowance of roleplays rather than a recurring daily or weekly one, with paid plans above it. That is enough to evaluate the product and not enough for the sustained repetition that changes a delivery habit. Check their pricing page for current terms.",
      },
      {
        q: "Is Poised still available?",
        a: "Poised was acquired by Deepgram in June 2024 and has continued as a live-meeting coaching product since. Availability and packaging after an acquisition are worth confirming on the vendor site rather than from any comparison article.",
      },
      {
        q: "What is the best AI communication tool for communications professionals?",
        a: "Whichever exposes the raw measurements and the timestamps instead of a summary score, and lets you compare sessions over months. If you already know what a filler word is, the value is entirely in the evidence trail and the trend line, and a product built around one readout gives you neither.",
      },
      {
        q: "Do I need a paid plan to actually improve?",
        a: "No, if the free tier recurs. What changes delivery is one minute a day for two weeks with the same prompt, and that fits inside a recurring free allowance. Paid tiers buy breadth - unlimited roleplay, team features, meeting integration - rather than a better measurement of the four numbers that matter.",
      },
    ],
    related: [
      "free-ai-communication-tools",
      "free-ai-public-speaking-practice",
      "pitch-practice-for-founders",
    ],
    cta: CTA.free,
  },
  /* ------------------------------------------------------- acquisition, 2026-09
     Added after the August GSC read, which showed the site collecting
     impressions at position ~70 on queries no page was actually pointed at:
     "speaking skills in communication" was the largest single source of
     impressions on the site and had no page aimed at it at all. Every entry
     below owns either a query that already produced impressions, or a
     commercial long-tail whose SERP is thin enough to enter without links. */
  {
    slug: "speaking-skills-in-communication",
    title: "Speaking Skills in Communication",
    metaTitle: "Speaking Skills in Communication",
    description:
      "What speaking skills actually are, the six that carry most of the weight, and how to measure each one on a recording of your own voice instead of guessing.",
    answer:
      "Speaking skills in communication are the delivery habits that decide whether what you said arrives intact: pace, pauses, filler rate, clarity, vocal energy and structure. They sit apart from vocabulary and grammar, they are measurable on any recording, and they are the half a listener judges within about fifteen seconds.",
    intro:
      "Speaking skills are the part of communication that survives the trip to a listener. Vocabulary and grammar decide what you are able to say; speaking skills decide how much of it lands. The distinction matters because they fail differently and are fixed differently, and because the second set is measurable in a way the first is not. Six habits carry most of the weight, each one countable on a sixty-second recording, and each one improvable on its own without touching the others.",
    published: "2026-09-02",
    updated: "2026-09-02",
    readMinutes: 8,
    primaryKeyword: "speaking skills in communication",
    secondaryKeywords: [
      "speaking skills",
      "better speaking skills",
      "types of speaking skills",
      "how to improve speaking skills",
      "verbal communication skills",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Speaking skills are not the same as language skills",
        p: [
          "Two people with identical vocabulary can produce completely different results in the same meeting, and the difference is entirely in delivery. One speaks at 190 words per minute with four fillers a minute and no pause before the important sentence; the other says the same words at 140 with a beat of silence in front of the conclusion. The second person is described afterwards as clearer, and often as more senior.",
          "This is why working only on language stalls. If you already have the words, more vocabulary adds nothing to the meeting - the loss is happening between your mouth and the listener, not in the dictionary. If English is a second language and you want that half addressed too, the practical version is in [improving English communication skills](/guides/how-to-improve-english-communication-skills), which separates the two problems properly.",
          "The useful consequence: delivery is countable. You cannot put a number on whether a sentence was well chosen, but you can put one on how fast it was said, how many fillers were in it, and whether the pause landed before or after the point.",
        ],
      },
      {
        h: "The six speaking skills that carry the weight",
        p: [
          "Not an exhaustive taxonomy. These are the six that change the outcome most per hour spent on them, ordered by how quickly a change becomes audible to other people.",
        ],
        table: {
          caption: "The six measurable speaking skills, with a working target for each",
          head: ["Skill", "What it controls", "Working target", "How to measure it"],
          rows: [
            ["Pace", "Whether the listener can keep up while thinking", "130-150 wpm, stable", "Words divided by minutes, per section"],
            ["Pauses", "Which sentence gets registered as important", "0.5-1.5s at thought ends", "Silence length and placement"],
            ["Filler rate", "Whether you read as prepared or unsure", "Under 3 per minute", "Count of um, uh, like, you know"],
            ["Clarity", "How many words survive the trip", "Under 5% unclear", "Word-level articulation on playback"],
            ["Vocal energy", "Whether attention holds past a minute", "Range that does not flatten", "Pitch variation across the clip"],
            ["Structure", "Whether the point arrives before attention goes", "Point inside 20 seconds", "Time to your first conclusion"],
          ],
        },
      },
      {
        h: "Pace: the one that moves everything else",
        p: [
          "Pace is first because fixing it drags three of the others with it. Speeding up is what people do under pressure, and a fast speaker loses pauses, gains fillers and loses clarity all at once, because the articulation of consonants is the first thing to go when the mouth is behind the brain.",
          "The comfortable range for explaining something unfamiliar sits around 130 to 150 words per minute. The number itself matters less than its stability: a clip that runs at 140 throughout is easier to follow than one that averages 140 by running at 110 for the safe half and 175 for the part you were dreading, and the second pattern is far more common. The full treatment is in [the ideal speaking pace](/guides/ideal-speaking-pace-words-per-minute), and the fix if you already know you rush is in [how to stop talking too fast](/guides/how-to-stop-talking-too-fast).",
        ],
        list: {
          intro: "Three checks that take one recording each:",
          items: [
            "Record ninety seconds explaining something you know well. That is your baseline pace, and it is the fastest you should ever need to go.",
            "Record the same length on the question you are dreading. The gap between the two clips is your pressure response, in words per minute.",
            "Read the transcript of the second clip aloud at the first clip's pace. That is what it should have sounded like, and hearing it is more persuasive than being told.",
          ],
        },
      },
      {
        h: "Pauses, fillers, and the same underlying gap",
        p: [
          "Filler words are not a vocabulary problem and not really a nervousness problem. They fill a gap that the speaker has not given themselves permission to leave silent. Every um is a pause that was going to happen anyway, dressed up so it does not feel like one. That is why telling someone to stop saying um rarely works, and why replacing the um with a deliberate pause works quickly: the gap was never the problem, and a silent gap reads as thinking while a filled one reads as searching.",
          "Pauses are also the only punctuation available out loud. A half-second before your conclusion is what tells a listener that the next sentence is the one to remember, and speakers who never pause deliver every sentence at the same weight, which leaves the listener to work out what mattered. Most decide it was nothing. [How to use pauses](/guides/how-to-use-pauses-when-speaking) covers the placement; [how to stop filler words](/guides/how-to-stop-using-filler-words) covers the substitution.",
        ],
      },
      {
        h: "How to actually improve them, in the order that works",
        p: [
          "One habit at a time, for about two weeks each. Working on all six simultaneously produces a speaker concentrating so hard on their own delivery that the content suffers, which is a worse outcome than the fillers were.",
          "The sequence below is ordered by dependency rather than by importance. Pace first because it moves three others. Pauses second because they are the mechanism that removes fillers. Clarity third because it only becomes fixable once you are no longer racing. Energy and structure last, because they are the ones that need attention to spare.",
        ],
        list: {
          ordered: true,
          intro: "Two weeks per step, sixty seconds a day, same prompt each time:",
          items: [
            "Get pace stable in the range, including on the hard question. Nothing else is reliably measurable until this holds.",
            "Replace filled gaps with silent ones. Count the fillers each day; the number should halve inside a fortnight.",
            "Fix the words that came out unclear - almost always the ones at the end of a fast sentence.",
            "Stop the pitch flattening after the first minute, which is what makes a listener disengage without knowing why.",
            "Move your conclusion to the front, and check the timestamp where it now lands.",
          ],
        },
      },
      {
        h: "Why self-assessment fails, and what to use instead",
        p: [
          "You cannot hear your own delivery while producing it. The brain suppresses the sound of your own voice during speech and fills in the intended version rather than the delivered one, which is why a recording of yourself is uncomfortable in a way that is genuinely informative: it is the first time you have heard what everyone else hears.",
          "Estimates made from memory are wrong in a consistent direction. People underestimate their own length, hear far fewer of their own fillers than are there, and remember pauses as longer than they were. That is not a character flaw; it is that planning time is invisible from the inside.",
          "So the honest options are a recording you analyse yourself, or a tool that counts for you. Either works. What does not work is asking a colleague, who will tell you it was fine, and who is answering a social question rather than a technical one. [Free AI communication tools](/guides/free-ai-communication-tools) covers what to look for, and the [speaking pace test](/tools/speaking-pace-test) and [filler word counter](/tools/filler-word-counter) do two of these six on their own.",
        ],
      },
    ],
    faqs: [
      {
        q: "What are speaking skills in communication?",
        a: "They are the delivery habits that decide how much of what you said reaches the listener: pace, pause placement, filler rate, clarity of articulation, vocal energy and the order you put your points in. They are distinct from vocabulary and grammar, and unlike those, every one of them is countable on a recording.",
      },
      {
        q: "What are the main types of speaking skills?",
        a: "The measurable ones split into three groups. Timing skills - pace and pauses. Precision skills - filler rate and clarity of articulation. Engagement skills - vocal energy and the structure of what you say. Body language is often listed alongside them, but it is a separate channel and needs video rather than audio to assess.",
      },
      {
        q: "How long does it take to improve speaking skills?",
        a: "A single habit shifts audibly in about two weeks of one minute a day, provided you record the same prompt each time so the comparison means something. Six habits worked one at a time is roughly three months. Working on all six at once takes longer and usually stalls, because attention spent monitoring delivery comes out of the content.",
      },
      {
        q: "Can you improve speaking skills without a coach?",
        a: "Yes, for the measurable half. Pace, fillers, pauses and clarity are all countable from a recording, and counting them is most of the work - the correction is usually obvious once the number is in front of you. A coach earns their fee on the parts that are judgement calls: what to cut, what to lead with, and how to handle a hostile room.",
      },
      {
        q: "What is the difference between speaking skills and communication skills?",
        a: "Communication skills is the wider set and includes listening, writing and reading a room. Speaking skills are the spoken-delivery subset. The distinction is practical rather than academic: speaking skills are the ones you can put a number on this afternoon, which makes them the ones that improve fastest.",
      },
    ],
    related: [
      "ideal-speaking-pace-words-per-minute",
      "how-to-stop-using-filler-words",
      "how-to-use-pauses-when-speaking",
      "how-to-speak-with-confidence",
    ],
    cta: CTA.free,
  },
  {
    slug: "free-ai-communication-coach-no-signup",
    title: "Free AI Communication Coach, No Sign Up",
    metaTitle: "Free AI Communication Coach, No Sign Up",
    description:
      "What you can genuinely use without an account or a card, what every free tier costs you in exchange, and how to tell a free tool from a free trial before you record anything.",
    answer:
      "A free AI communication coach with no sign up lets you record in the browser and get pace, filler count, pause length and clarity back without creating an account or entering a card. Most tools advertised as free are free trials behind a signup wall; the difference is whether the allowance recurs or runs out once.",
    intro:
      "Almost every tool in this category calls itself free, and almost none of them mean the same thing by it. Some mean a recurring daily allowance you never pay for. Some mean a lifetime handful of attempts, which is an evaluation rather than a free tier. Some mean free after you create an account, verify an email and add a card that is not charged yet. Those are three different products, and the word on the button does not distinguish them. This sets out what to check before you record anything, and what genuinely runs with no account at all.",
    published: "2026-09-02",
    updated: "2026-09-02",
    readMinutes: 7,
    primaryKeyword: "free ai communication coach no sign up",
    secondaryKeywords: [
      "communication ai no login",
      "free speech analysis without account",
      "practice speaking online free no registration",
      "free ai speaking coach no credit card",
      "no signup speaking practice",
    ],
    cluster: "tools",
    sections: [
      {
        h: "Three things the word free is used to mean",
        p: [
          "A recurring free tier gives you an allowance that refills - so many recordings a day, every day, with no payment relationship. This is the only shape in which a free tool can actually change a habit, because habit change needs about two weeks of repetition and no lifetime allowance survives that.",
          "A lifetime free allowance gives you a fixed number of attempts, ever. Five roleplays or three recordings, and then it stops. This is sized for deciding whether to buy, which is a legitimate thing for a product to offer and a useless thing to plan a fortnight of practice around.",
          "A free trial is a paid product with the payment deferred. Card up front, cancel before day fourteen. Nothing wrong with it, but it belongs in a different mental category from the other two, and the distinction is deliberately blurred on a lot of landing pages.",
        ],
        table: {
          caption: "What each meaning of free actually gives you",
          head: ["Shape", "Account needed", "Card needed", "Good for"],
          rows: [
            ["Recurring free tier", "Sometimes", "No", "Building a habit over weeks"],
            ["Lifetime free allowance", "Usually", "No", "Deciding whether to buy"],
            ["Free trial", "Yes", "Usually", "Evaluating a paid product in depth"],
            ["Free after signup", "Yes", "No", "Products funded by the email list"],
          ],
        },
      },
      {
        h: "Why the signup wall exists, and what it costs you",
        p: [
          "The account is not primarily there to hold your data. It is there because an email address is the asset that makes a free user worth having, and because a signup step filters out everyone who was only mildly curious - which improves every metric the company reports, at the cost of the person who wanted to check one recording before deciding anything.",
          "What it costs you is specific and worth naming. You cannot try before deciding whether the measurement is any good. Your voice recording is now attached to an identity on someone's server. And the friction lands at exactly the moment you were most likely to actually do the thing, which is why so many people intend to practise and never record once.",
          "There is a real trade-off on the other side. Without an account, nothing can compare today's recording against last month's, and the comparison against your own history is the part that turns numbers into progress. The reasonable arrangement is that the measurement works immediately with no account, and the history is what an account buys you later.",
        ],
      },
      {
        h: "What to check before you record anything",
        p: [
          "Five checks, about two minutes, and they eliminate most of the field before you have given anyone your voice.",
        ],
        list: {
          ordered: true,
          items: [
            "Open the tool in a private window. If the record button works without a form, the no-signup claim is true. If it does not, it was free-after-signup.",
            "Find the allowance as a number. Free forever with no number attached is a marketing sentence, not a limit you can plan around.",
            "Check whether the allowance refills daily or is a lifetime total. This is the single most consequential difference and it is usually one line deep in an FAQ.",
            "Look for the timestamp behind each number. A tool returning a score with no evidence trail cannot be checked, improved against, or trusted when it is wrong.",
            "Read what happens to the audio. Whether it is stored, for how long, and whether it trains a model should be answerable in one paragraph on the privacy page.",
          ],
        },
      },
      {
        h: "What runs with no account at all",
        p: [
          "Browser-based recording analysers are the category where no-signup genuinely happens, because analysing a sixty-second clip is cheap enough to give away and needs no persistent state to do once. Live conversational roleplay is the category where it mostly does not, because a back-and-forth with a language model costs real money per minute and is trivially abusable without a rate limit tied to something.",
          "That split explains most of what you will find. If a product offers both, expect the recording side to be generously free and the roleplay side to be metered tightly, and treat a product offering unlimited free roleplay with no account with mild suspicion about what is paying for it.",
          "On this site: recording is ten a day with no account and no card, and it returns pace overall and per section, filler count and rate with timestamps, pause length and placement, word-level clarity and pitch range. Practice rounds, where an AI plays a counterpart and pushes back, are two rounds free - a smaller number, for exactly the cost reason above. Nothing is gated behind an email, and there is no card field anywhere in the free path.",
        ],
      },
      {
        h: "Getting something useful out of one session",
        p: [
          "If you are only going to do this once, do not record a scripted paragraph. A script hides every problem you are trying to find, because the pressure that produces fillers and acceleration comes from composing while speaking, and a script removes the composing.",
          "Record the question you are dreading instead. Sixty seconds, one take, no restarts - a restart is you editing out the exact moment worth measuring. Then look at one number rather than six: whichever is furthest from the working target is the one to work on, and the other five can wait a fortnight.",
          "If you want the wider comparison rather than the no-account subset, [free AI communication tools](/guides/free-ai-communication-tools) covers what each category can and cannot do, [choosing an AI communication coach](/guides/best-ai-communication-coach) covers the selection checks in full, and [free AI public speaking practice](/guides/free-ai-public-speaking-practice) covers the same ground for talks rather than conversations.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a free AI communication coach with no sign up?",
        a: "Yes, in the recording-analyser category. Browser tools that measure a clip you record can run without an account, because a single sixty-second analysis is cheap and needs no stored state. Live conversational roleplay almost always requires one, because a back-and-forth with a model costs money per minute and needs a rate limit attached to something.",
      },
      {
        q: "Can I practise speaking online without creating an account?",
        a: "You can record and get measurements back without one. What you cannot get without an account is a comparison against your own past sessions, since there is nothing to attach the history to. A sensible arrangement is measurement free and immediate, history as the thing an account adds.",
      },
      {
        q: "Do free tools without signup keep my voice recording?",
        a: "It varies, and it should be stated plainly on the privacy page in one paragraph. The questions worth an answer are whether the audio is stored after analysis, for how long, and whether it is used to train anything. A tool that cannot answer those in a sentence each is one to skip, regardless of how good the free tier looks.",
      },
      {
        q: "What is the catch with a free tier that has no card and no account?",
        a: "Usually the allowance and the depth. The free path gives you the measurement, which is cheap to run; the paid path gives you history, longer recordings, or unlimited roleplay, which are not. That is a fair trade and it is visible up front. The catch actually worth watching for is a lifetime handful dressed up as a recurring allowance.",
      },
      {
        q: "Is there an AI communication coach with no login and no download?",
        a: "Browser-based analysers need neither. The recording happens in the page using the microphone permission the browser already manages, so there is nothing to install, and the analysis runs server-side on the clip. Anything asking you to install a desktop app is usually a meeting copilot, which is a different category solving a different problem.",
      },
    ],
    related: [
      "free-ai-communication-tools",
      "best-ai-communication-coach",
      "free-ai-public-speaking-practice",
      "yoodli-alternatives",
    ],
    cta: CTA.free,
  },
  {
    slug: "best-ai-communication-coach",
    title: "How to Choose the Best AI Communication Coach",
    metaTitle: "Best AI Communication Coach: How to Choose",
    description:
      "The five checks that separate an AI communication coach worth using from a score generator, which category fits which problem, and an honest account of where this one stops.",
    answer:
      "The best AI communication coach is the one matching how your problem shows up. Recording analysers suit a deadline you are rehearsing for, roleplay simulators suit freezing under questions, and meeting copilots suit failures that only appear with other people present. Judge candidates on evidence trails and session-to-session comparison, not feature counts.",
    intro:
      "There is no single best AI communication coach, and any article naming one has not asked what your problem is. The category contains at least three products that barely compete with each other, and choosing the wrong shape is the most common reason people try one of these and abandon it inside a fortnight. What follows is a selection framework rather than a ranking: which shape fits which failure, the five checks that eliminate most candidates in twenty minutes, and where this product sits including what it does not do. Anything said about the market was accurate in September 2026 and changes often.",
    published: "2026-09-02",
    updated: "2026-09-02",
    readMinutes: 8,
    primaryKeyword: "best ai communication coach",
    secondaryKeywords: [
      "best communication coach",
      "ai communication coach comparison",
      "best ai speaking coach",
      "ai coach for communication skills",
      "online communication coach",
    ],
    cluster: "tools",
    sections: [
      {
        h: "Start from how your problem shows up, not from features",
        p: [
          "Three failure patterns cover most people, and each one points at a different category of tool. Getting this right matters more than any feature comparison, because a tool aimed at the wrong pattern will report perfectly accurate numbers about something that is not your problem.",
          "The diagnostic takes one recording. Answer a genuinely uncomfortable question about your own work, out loud, for sixty seconds, alone. If the recording is already bad - fast, full of fillers, no pauses - your problem is delivery and it reproduces in private, which means rehearsal fixes it. If it is fine and real meetings still go badly, the problem needs other people present to appear, and no amount of solo recording will surface it.",
        ],
        table: {
          caption: "Which category answers which failure pattern",
          head: ["How it shows up", "Category to use", "What it gives you", "What it cannot do"],
          rows: [
            ["Bad even when rehearsing alone", "Recording analyser", "Repeatable numbers with timestamps", "Reproduce real pressure"],
            ["Fine alone, freezes when questioned", "Roleplay simulator", "Pressure on demand", "Measure anything comparably"],
            ["Fine alone, fails in group calls", "Meeting copilot", "Evidence from the real thing", "Help before the meeting exists"],
            ["Not sure which", "Recording analyser first", "A baseline to reason from", "Be answered without one recording"],
          ],
        },
      },
      {
        h: "The five checks that eliminate most of the field",
        p: [
          "Run these against any candidate. They take about twenty minutes in total, and they are ordered so the cheapest disqualifier comes first.",
        ],
        list: {
          ordered: true,
          items: [
            "Does every number come with the moment that produced it? A filler count with no timestamps cannot be verified, argued with, or learned from - it is a score, and a score is the least useful thing a coach can hand you.",
            "Can it compare this session to your last one? A tool that measures you in isolation each time is measuring nothing, because the only meaningful reading of 4.1 fillers a minute is whether it used to be 7.",
            "Does it name one thing to fix, or list twelve? Twelve findings is a report. One is coaching. Attention is the scarce resource, and a list of twelve spends all of it on triage.",
            "Does it penalise your accent? Test by recording something you know was perfectly clear. A clarity score that drops on clean speech in a non-native accent is measuring the wrong thing, and will teach you to fix what was never broken.",
            "Does the free allowance recur? A lifetime handful is an evaluation. Habit change takes about two weeks of daily repetition, and no fixed lifetime allowance survives it.",
          ],
        },
      },
      {
        h: "What the market currently looks like",
        p: [
          "Recording analysers are the crowded end. Browser tools that take a clip and return pace, filler rate and clarity, usually free for a limited number of recordings. They differ mainly in whether they show their working: most return a score and a summary, and a minority return the timestamps behind each number. That minority is the one worth your time, for the reasons in check one.",
          "Roleplay simulators have grown fastest. An AI plays an interviewer, a customer or an investor and asks you questions, which is genuinely valuable if freezing is your failure pattern. The weakness is consistent across all of them: they will accept an answer a real counterpart would have pushed back on, and no two sessions are comparable, so nothing accumulates. Yoodli is the best-known product spanning this and the analyser category; the fuller comparison, including Poised on the meeting-copilot side, is in [Yoodli alternatives](/guides/yoodli-alternatives).",
          "Meeting copilots are the smallest group and the hardest to adopt, because a bot joining your calls is a decision involving everyone else on the call. They answer a question nothing else can - what you actually do in a real meeting, rather than in a rehearsal - and they are useless for a talk you are giving in ten days, since there is no live call to sit in.",
          "General-purpose chatbots deserve a mention, because a lot of people use one for this. A text model can review a transcript and give you sensible advice about structure and word choice. It cannot hear you, so pace, pauses, filler rate, clarity and vocal energy are all outside what it can assess - and it will comment on them confidently anyway if you ask.",
        ],
      },
      {
        h: "The questions to ask about pricing before you commit",
        p: [
          "Find the free allowance as a number, and find out whether it refills. Those two facts determine whether you can build a habit on the free tier or are evaluating a purchase, and they are frequently one line deep in an FAQ rather than on the pricing page.",
          "Then check what the paid tier actually buys. In this category it is usually breadth - unlimited roleplay, team seats, meeting integration, longer recordings - rather than a better measurement of the four numbers that matter. If the core measurement is identical on both tiers and the free allowance recurs, paying may buy you nothing you need.",
          "Finally, check the annual-billing framing. A price quoted as eight dollars a month billed annually is a ninety-six dollar decision, and the monthly figure is the one on the page.",
        ],
      },
      {
        h: "Where FounderVoice sits, and where it stops",
        p: [
          "It is a recording analyser first, built for founder situations - the pitch, the investor questions, the demo, the board update, the interview. You record sixty seconds in the browser and get pace overall and per section, filler count and rate with timestamps, pause length and placement, word-level clarity and pitch range, each with the moment behind it. Ten recordings every 24 hours, no account and no card, and the allowance refills daily rather than running out once. If that no-account detail is the deciding factor, [what runs with no sign up](/guides/free-ai-communication-coach-no-signup) goes through it properly.",
          "There is a practice mode where an AI plays a standup lead, a sceptical operator or a seed investor and follows up on the weak half of your answer. Two rounds free, a smaller allowance than recording, because a live back-and-forth costs considerably more to run. After several sessions it compares you against your own history rather than against an average.",
          "What it is not: there is no meeting bot, so it will not sit in your calls. There is no video, so eye contact, gesture and posture are outside what it measures. It has no opinion on your business - not your market size, not your traction - because a tool claiming to would be guessing from a transcript. And it is aimed at high-stakes founder moments rather than at general sales enablement or language learning. If your failure only appears in live group calls, a meeting copilot is the category, and this is not it.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best AI communication coach?",
        a: "There is no single best one, because the category contains three products solving different failures. If your delivery is already poor when rehearsing alone, use a recording analyser. If you are fine alone and freeze when questioned, use a roleplay simulator. If you only fail in live group calls, use a meeting copilot. Choosing the wrong shape is why most people abandon these in two weeks.",
      },
      {
        q: "Are AI communication coaches actually effective?",
        a: "For the measurable habits, yes, and measurably so - pace, filler rate, pause placement and clarity all shift inside a fortnight of daily one-minute recordings, because the correction is usually obvious once the number is visible. For judgement calls like what to cut or how to handle a hostile room, a human coach is still better, and no current tool is close.",
      },
      {
        q: "Is a free AI communication coach good enough?",
        a: "If the free allowance recurs daily, usually yes. What changes delivery is one minute a day for two weeks with the same prompt, and that fits comfortably inside a recurring free tier. Paid tiers in this category buy breadth rather than a better measurement of the four numbers that matter.",
      },
      {
        q: "Can ChatGPT be a communication coach?",
        a: "It can review a transcript and give useful advice on structure and word choice. It cannot hear you, so pace, pause placement, filler rate, clarity and vocal energy are all outside what it can assess - and it will still answer confidently if you ask about them. Use a text model for what you said, and something that hears audio for how you said it.",
      },
      {
        q: "How much does an AI communication coach cost?",
        a: "As of September 2026 the paid tiers in this category commonly start in the region of eight to twenty dollars a month, frequently quoted at the annual rate. Check whether the free allowance recurs before paying, because if it does and it covers a daily minute of recording, the paid tier may be buying breadth you do not need.",
      },
    ],
    related: [
      "yoodli-alternatives",
      "free-ai-communication-coach-no-signup",
      "free-ai-communication-tools",
      "ai-speaking-partner",
    ],
    cta: CTA.free,
  },
  {
    slug: "what-to-do-before-an-investor-pitch",
    title: "What to Do Before an Investor Pitch",
    metaTitle: "What to Do Before an Investor Pitch",
    description:
      "A timed preparation plan for the two weeks, the day and the ten minutes before an investor meeting - what to rehearse, what to leave alone, and what to check.",
    answer:
      "Before an investor pitch, rehearse the questions rather than the deck. Spend the final fortnight recording your sixty-second version and the ten answers you are dreading, the day before on one clean run and proper sleep, and the last ten minutes on slow breathing and a deliberately slow first sentence rather than on changes.",
    intro:
      "Most pitch preparation is spent on the wrong half. Founders rework slides until the night before and rehearse the questions not at all, which is backwards: the deck is the part you control completely, and the questions are the part that decides the meeting. This is a timed plan built around that inversion - what to do with two weeks, with one day, and with ten minutes. It assumes the deck is finished, because if it is not, the answer to what to do before the pitch is finish the deck.",
    published: "2026-09-02",
    updated: "2026-09-02",
    readMinutes: 8,
    primaryKeyword: "what to do before an investor pitch",
    secondaryKeywords: [
      "investor pitch preparation checklist",
      "before investor pitch",
      "how to prepare for a pitch meeting",
      "day before pitch meeting",
      "pitch meeting preparation",
    ],
    cluster: "founder",
    sections: [
      {
        h: "Two weeks out: build the question bank, not more slides",
        p: [
          "Write down the ten questions you are most hoping they will not ask. Not the ten most likely - the ten you are dreading, which is a different and much shorter list, and the one that predicts how the meeting goes. The overlap between the two lists is usually about half, and the non-overlapping half is where meetings are lost.",
          "Then answer each one out loud, cold, timed, once. No rehearsing before the first take: the first take is the data. Most founders discover two things immediately - that answers they thought were thirty seconds run ninety, and that pace and filler rate on the dreaded questions are far worse than on the pitch itself, which they have rehearsed. That gap is the actual preparation gap.",
          "The full treatment is in [preparing for investor Q&A](/guides/how-to-prepare-for-investor-qa). The short version: an answer you have said out loud once is a different object from an answer you have thought about, and only the first survives being interrupted.",
        ],
        list: {
          intro: "The ten that belong on almost every founder's list:",
          items: [
            "Why now, and why has nobody done this already?",
            "What happens when the obvious large incumbent decides to do this?",
            "Walk me through the unit economics at your current scale.",
            "What is your actual retention, cohort by cohort?",
            "How much of that revenue comes from a single customer?",
            "What did you get wrong in the last twelve months?",
            "Why is this team the one to do it?",
            "What does this round buy you, in milestones rather than in months?",
            "What is the weakest part of this business?",
            "Who else is in the round, and on what terms?",
          ],
        },
      },
      {
        h: "The fortnight: one minute a day, same prompt",
        p: [
          "Record the sixty-second version of the pitch every day. Same length, same prompt, same time of day if you can, because the comparison is the entire value and a comparison between different prompts measures nothing. Ten minutes total across the whole fortnight, and it outperforms three long rehearsal sessions comfortably.",
          "Watch four numbers and ignore the rest. Pace should sit between 130 and 150 words per minute and, more importantly, stay there across the whole clip rather than averaging into range by running slow through the safe part and fast through the ask. Filler rate under three a minute. A pause of half a second to a second and a half before each conclusion. Clarity holding on the last words of sentences, which is where it fails first.",
          "Alternate: pitch on odd days, a dreaded question on even ones. The question days are the ones that move, because the pitch is already over-rehearsed and the answers are not.",
        ],
        table: {
          caption: "The four numbers to watch in the final fortnight",
          head: ["Number", "Target", "What a bad reading means"],
          rows: [
            ["Pace", "130-150 wpm, stable across the clip", "You accelerate into the part you are unsure of"],
            ["Filler rate", "Under 3 per minute", "You are composing while speaking, not recalling"],
            ["Pause before conclusions", "0.5-1.5 seconds", "Every sentence lands at the same weight"],
            ["Clarity at sentence ends", "Under 5% unclear", "You are outrunning your own articulation"],
          ],
        },
      },
      {
        h: "The day before: stop changing things",
        p: [
          "No new slides, no new numbers, no restructuring. A change made the day before has not been rehearsed and will be the sentence you stumble on, and the cost of stumbling is higher than the benefit of marginally better wording almost every time.",
          "Do one clean run of the whole thing, out loud, standing, timed, without stopping to fix anything. Stopping to fix is the habit that produces a founder who can deliver the first two minutes beautifully and has never once delivered the ending. Then do one pass on the three questions you are still worst at, and stop.",
          "Then sleep, properly. Sleep loss shows up in speech before it shows up anywhere you can feel it - pace rises, articulation degrades, and recovery from an interruption gets noticeably slower. It is the highest-leverage thing available on the last night, and the one most reliably sacrificed to slide edits.",
        ],
      },
      {
        h: "Logistics worth checking the day before",
        p: [
          "Boring, and each one has ended a meeting badly for somebody. Ten minutes of checking removes an entire category of failure that has nothing to do with how well you speak.",
        ],
        list: {
          items: [
            "Test the actual video link on the actual device, signed into the account you will use. Share a slide and confirm the audio route while you are there.",
            "Have the deck as a PDF locally, not only in a cloud tab, and know which key advances it.",
            "Know your three headline numbers well enough to say without the slide, because the slide will be the one that fails to load.",
            "Confirm who is in the room and what they invest in. Being pitched a seed thesis by someone who only does Series B is a five-minute meeting.",
            "Set the room up: light in front of you, camera at eye level, phone off rather than face down.",
          ],
        },
      },
      {
        h: "The last ten minutes",
        p: [
          "Do not rehearse. Reading the deck one more time in the ten minutes before does nothing for recall and reliably raises your baseline speaking rate, which is the opposite of what you need walking in.",
          "Slow breathing instead - out for longer than in, for about two minutes. This is not a relaxation ritual; it is the most direct available lever on the physiology that makes you speak too fast, and it works within a couple of minutes.",
          "Then plan the first sentence, and only the first sentence. Say it slower than feels natural, because the opening is delivered at whatever pace your adrenaline sets and everything after it anchors to that. A deliberately slow first sentence buys back the entire first minute. [Sounding confident in an investor pitch](/guides/how-to-sound-confident-in-an-investor-pitch) covers what a room reads off that opening, and the [pitch practice tool](/tools/pitch-practice) is where the fortnight of recordings goes.",
        ],
      },
    ],
    faqs: [
      {
        q: "What should I do the day before an investor pitch?",
        a: "One clean uninterrupted run of the whole pitch out loud, one pass on the three questions you are still worst at, and then stop. No new slides and no restructuring - an unrehearsed change is the sentence you will stumble on. Then sleep properly, because sleep loss degrades pace and articulation before you can feel it.",
      },
      {
        q: "How long should I practise before a pitch meeting?",
        a: "One minute a day for the final fortnight, recording the same prompt each time, plus one full run the day before. Under half an hour of practice in total. That beats three long rehearsal sessions, because the value is in the comparison between days, and a long session gives you one data point and a sore throat.",
      },
      {
        q: "Should I memorise my pitch word for word?",
        a: "No. A memorised pitch fails at the first interruption, because recall of a fixed sequence does not survive being knocked out of it, and investors interrupt. Memorise the sixty-second structure and the three headline numbers, and let the wording vary. The one thing worth rehearsing word for word is the first sentence.",
      },
      {
        q: "What do investors judge in the first minute?",
        a: "Whether you can explain the business clearly, and whether you sound like someone who knows it. That reads mostly off delivery, since they cannot yet evaluate the substance - pace, whether you pause before the important sentence, and whether the filler rate suggests recall or composition. It is not fair, but it is what a stranger has to work with in sixty seconds.",
      },
      {
        q: "What should I do in the ten minutes before the meeting?",
        a: "Slow breathing, out-breath longer than in, for about two minutes, then plan your first sentence and deliver it slower than feels natural. Do not read the deck again - it does nothing for recall and raises your baseline speaking rate at exactly the wrong moment.",
      },
    ],
    related: [
      "how-to-prepare-for-investor-qa",
      "pitch-practice-for-founders",
      "how-to-sound-confident-in-an-investor-pitch",
      "investor-pitch-delivery",
    ],
    cta: CTA.pitch,
  },
  {
    slug: "how-to-practice-a-presentation",
    title: "How to Practise a Presentation Out Loud",
    metaTitle: "How to Practise a Presentation Out Loud",
    description:
      "Why reading your slides is not rehearsal, how many run-throughs actually help, and a schedule for the week before a class presentation, a conference talk or a work update.",
    answer:
      "Practise a presentation by delivering it out loud, standing, timed, without stopping to fix anything. Three to five full run-throughs spread across a week beat a dozen partial ones, and recording at least one of them is the only way to find the pace and filler problems you cannot hear while speaking.",
    intro:
      "Nearly everyone practises presentations the same way, and it is the wrong way: reading through the slides silently, several times, stopping to improve the wording. That rehearses recognition of the material and nothing about the delivery, which is why people who have prepared for hours still speak too fast, run over time and lose their place at the first interruption. Rehearsal that works has three properties - out loud, uninterrupted, and timed - and this is how to arrange the week before around them, whether it is a class presentation, a conference talk or a Monday update.",
    published: "2026-09-02",
    updated: "2026-09-02",
    readMinutes: 8,
    primaryKeyword: "how to practise a presentation out loud",
    secondaryKeywords: [
      "how to practice a presentation",
      "how to practice a college presentation",
      "rehearse a presentation",
      "practice presentation for class",
      "how many times to rehearse a presentation",
    ],
    cluster: "speaking",
    sections: [
      {
        h: "Reading the slides is not practice",
        p: [
          "Silent reading builds familiarity with the material, and familiarity feels like preparedness. It is not the same thing. The mouth has never produced the sentences, so the transitions between points have never been said, the timing is unknown, and the parts you are shakiest on have been skimmed rather than exercised - because skimming is exactly what the brain does with material it finds uncomfortable.",
          "The measurable consequence is length. A deck read silently in eight minutes is routinely delivered in fourteen, because silent reading skips the pauses, the transitions, and the sentences you improvise between slides. Anyone who has run over their slot has usually rehearsed only in their head.",
          "So the minimum viable rehearsal is out loud, standing, with a timer running, and without stopping. The no-stopping part is the one people abandon first and the one that matters most, because stopping to fix produces a speaker who has delivered the opening twenty times and the conclusion never.",
        ],
      },
      {
        h: "How many run-throughs, and spread over how long",
        p: [
          "Three to five full uninterrupted run-throughs, spread across several days, is the range where the returns are. Below three, the ending has never been delivered under fatigue. Above about six in the same week, the delivery starts to flatten into recitation - the tell is that it stops sounding like you are thinking about what you are saying, which an audience hears immediately as reading.",
          "Spacing matters more than the count. Five run-throughs across five days beats five in one evening by a wide margin, for the same reason spaced repetition beats cramming, and it gives you five separate chances to notice that a section does not work rather than one.",
        ],
        table: {
          caption: "A week before a presentation, one pass a day",
          head: ["Day", "What to do", "Roughly how long"],
          rows: [
            ["7 days out", "First full run, out loud, timed. Expect it to be bad", "Talk length + 10 min"],
            ["5 days out", "Second run. Fix structure, not wording", "Talk length + 10 min"],
            ["4 days out", "Record 60 seconds of the opening and check pace", "5 minutes"],
            ["3 days out", "Third full run, standing, with the real slides", "Talk length"],
            ["2 days out", "Practise the three questions you are dreading", "10 minutes"],
            ["1 day out", "One clean run. Change nothing afterwards", "Talk length"],
            ["On the day", "Two minutes of slow breathing. No rehearsal", "2 minutes"],
          ],
        },
      },
      {
        h: "Record one of them, because you cannot hear yourself",
        p: [
          "You cannot assess your own delivery while producing it. The brain suppresses the sound of your own voice while you speak and substitutes the version you intended, which is why a recording is startling, and why it is the only honest feedback available without another person in the room.",
          "You do not need to record the whole talk. Sixty seconds of the opening and sixty seconds of the section you find hardest will surface almost everything: whether you are above 150 words per minute, whether the filler rate climbs on the hard section, whether you pause before conclusions or run every sentence together, and which words at the ends of sentences came out too soft to survive a room.",
          "The comparison is what makes it useful. Record the same sixty seconds on day seven and on day one, and the change is unmissable, where a single recording just tells you something you may not act on. The [speaking pace test](/tools/speaking-pace-test) and [filler word counter](/tools/filler-word-counter) do the two most common of these, and [free AI public speaking practice](/guides/free-ai-public-speaking-practice) covers what a tool can and cannot assess.",
        ],
      },
      {
        h: "If it is a college or class presentation",
        p: [
          "The constraints differ from a conference talk in two ways that change the plan. The time limit is enforced strictly and is usually short, and a portion of the grade is typically for delivery rather than content - which means the rehearsal is worth marks directly, not just indirectly.",
          "Rehearse to about ninety per cent of the limit rather than to the limit. Nerves add length, they do not subtract it, and a talk that fits exactly in rehearsal will overrun on the day. If the limit is ten minutes, your rehearsal target is nine.",
          "Practise the handover if it is a group presentation. Group presentations fail at the joins far more often than inside the sections - the handover is the one part nobody rehearses, because it belongs to two people and therefore to neither. Say the actual sentence you will use to hand over, out loud, with the other person, at least twice.",
          "And prepare for the question you cannot answer, because in an assessed presentation there will be one. \"I do not know, but here is how I would find out\", delivered calmly, costs almost nothing; a guess delivered fast costs a lot. [Speaking with confidence](/guides/how-to-speak-with-confidence) covers what that calm is actually made of.",
        ],
      },
      {
        h: "What to fix, in order",
        p: [
          "One thing per run-through. Trying to fix pace, fillers, pauses and structure simultaneously produces a speaker monitoring their own delivery so closely that the content degrades, which is a worse trade than the fillers were.",
          "Length first, because it is binary and everything else is wasted if you get cut off. Then pace, because it drags fillers and clarity along with it - [how to stop talking too fast](/guides/how-to-stop-talking-too-fast) is the mechanism. Then the transitions between sections, which is where people actually lose their place, rather than inside a section. Then pauses before your two or three key sentences, which is what tells a room which sentences those are.",
          "Wording last, and only if there is time. It is the thing everyone wants to work on, and the one with the smallest effect on how the talk is received.",
        ],
        list: {
          ordered: true,
          items: [
            "Length: land inside the slot with ten per cent to spare.",
            "Pace: 130-150 words per minute, and stable rather than averaging into range.",
            "Transitions: the sentence that gets you from each section to the next, said out loud.",
            "Pauses: half a second to a second and a half before each key point.",
            "Wording: last, and only once the four above are done.",
          ],
        },
      },
    ],
    faqs: [
      {
        q: "How many times should I rehearse a presentation?",
        a: "Three to five full uninterrupted run-throughs, spread across several days rather than done in one evening. Fewer than three and you have never delivered the ending under fatigue; more than about six in a week and the delivery flattens into recitation, which an audience hears as reading.",
      },
      {
        q: "Should I practise a presentation out loud or in my head?",
        a: "Out loud, always. Silent practice builds familiarity with the material but exercises none of the delivery, and it systematically underestimates length - a deck read silently in eight minutes commonly takes fourteen to deliver, because silent reading skips the pauses, transitions and improvised connective sentences.",
      },
      {
        q: "How do I practise a college presentation?",
        a: "The same as any talk, with two adjustments. Rehearse to ninety per cent of the time limit, because nerves add length. And if it is a group presentation, rehearse the handovers out loud with the other people - group presentations fail at the joins, which are the one part that belongs to two people and so gets rehearsed by neither.",
      },
      {
        q: "Is it worth recording myself practising?",
        a: "Yes, and sixty seconds is enough. You cannot hear your own delivery while producing it, because the brain substitutes the intended version for the delivered one. One minute of the opening and one of the hardest section will surface your pace, your filler rate under pressure, and the words that came out too soft to reach the back of a room.",
      },
      {
        q: "What should I do on the day of the presentation?",
        a: "Not rehearse. A final read-through does nothing for recall and reliably raises your baseline speaking rate at the worst possible moment. Two minutes of slow breathing with the out-breath longer than the in-breath, then deliver your first sentence slower than feels natural, because everything after it anchors to that pace.",
      },
    ],
    related: [
      "how-to-stop-talking-too-fast",
      "ideal-speaking-pace-words-per-minute",
      "how-to-speak-with-confidence",
      "free-ai-public-speaking-practice",
    ],
    cta: CTA.free,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/**
 * Every word the page actually renders, for `wordCount` in the Article schema.
 *
 * Counted rather than written down by hand, because a hand-written count is
 * wrong the first time a paragraph is edited, and a schema field that
 * contradicts the page is worse than an absent one.
 */
export function guideWordCount(guide: Guide): number {
  const parts: string[] = [guide.answer, guide.intro];
  for (const s of guide.sections) {
    parts.push(s.h, ...s.p);
    if (s.list) parts.push(s.list.intro ?? "", ...s.list.items);
    if (s.table) parts.push(s.table.caption, ...s.table.head, ...s.table.rows.flat());
  }
  for (const f of guide.faqs) parts.push(f.q, f.a);
  return parts.join(" ").trim().split(/\s+/).length;
}

/**
 * Resolves `related` to real guides and backfills from the same cluster if a
 * guide names fewer than three. Returning objects rather than slugs keeps the
 * template from having to know that a slug might not resolve.
 */
/** The hub for a cluster, if one has been designated. */
export function pillarFor(cluster: Guide["cluster"]): Guide | undefined {
  return GUIDES.find((g) => g.cluster === cluster && g.pillar);
}

export function relatedGuides(guide: Guide, count = 3): Guide[] {
  const picked: Guide[] = [];
  const take = (g: Guide | undefined) => {
    if (g && g.slug !== guide.slug && !picked.some((p) => p.slug === g.slug)) picked.push(g);
  };
  /* The cluster hub first, for every spoke. A cluster only works as a cluster
     if the links point up as well as down, and leaving that to each guide's
     hand-written related list meant a new guide silently joined nothing. */
  if (!guide.pillar) take(pillarFor(guide.cluster));
  guide.related.forEach((slug) => take(getGuide(slug)));
  GUIDES.filter((g) => g.cluster === guide.cluster).forEach(take);
  GUIDES.forEach(take);
  return picked.slice(0, count);
}

/**
 * Two guides sharing a primary keyword compete for one result and split the
 * signal between them. Failing the build is deliberate: this is cheap to fix
 * the day a guide is added and expensive to diagnose three months later from a
 * ranking chart.
 */
function assertNoDuplicatePrimaries() {
  const seen = new Map<string, string>();
  for (const g of GUIDES) {
    const key = g.primaryKeyword.trim().toLowerCase();
    const owner = seen.get(key);
    if (owner) {
      throw new Error(
        `Keyword cannibalisation: "${g.primaryKeyword}" is the primary keyword of both ` +
          `${owner} and ${g.slug}. Give one of them a distinct primary intent.`,
      );
    }
    seen.set(key, g.slug);
  }
}

assertNoDuplicatePrimaries();

/**
 * In-body links are written as `[anchor](/guides/slug)` inside the prose, and
 * rendered by components/GuideBody.tsx. They are the internal links that carry
 * weight: anchor text chosen for the target, inside the sentence that raises
 * the topic, rather than three identical tiles at the foot of the page.
 *
 * Which means a typo in a slug is a 404 sitting inside an article, and the
 * cheapest possible moment to catch it is now.
 */
function assertGuideLinksResolve() {
  const slugs = new Set(GUIDES.map((g) => g.slug));
  const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const g of GUIDES) {
    const prose: string[] = [g.answer, g.intro];
    for (const s of g.sections) {
      prose.push(...s.p);
      if (s.list) prose.push(s.list.intro ?? "", ...s.list.items);
    }
    for (const f of g.faqs) prose.push(f.a);
    for (const text of prose) {
      for (const m of text.matchAll(linkRe)) {
        const href = m[1];
        if (!href.startsWith("/")) {
          throw new Error(`${g.slug}: in-body link "${href}" is not site-relative.`);
        }
        const guideSlug = href.startsWith("/guides/") ? href.slice("/guides/".length) : null;
        if (guideSlug && !slugs.has(guideSlug)) {
          throw new Error(
            `${g.slug}: in-body link points at /guides/${guideSlug}, which is not a guide.`,
          );
        }
        if (guideSlug === g.slug) {
          throw new Error(`${g.slug}: in-body link points at its own page.`);
        }
      }
    }
  }
}

assertGuideLinksResolve();
