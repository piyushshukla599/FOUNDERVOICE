/**
 * Guide content lives as data rather than as one file per page, so the index,
 * the sitemap, the structured data and the cross-links cannot drift apart.
 * Adding a guide here adds it everywhere.
 *
 * These target the questions people actually type. Each one answers the
 * question properly on its own terms; a page that withholds the answer to push
 * a signup ranks badly and deserves to.
 */

export type Section = { h: string; p: string[] };

export type Guide = {
  slug: string;
  title: string;
  /** Under 60 characters where possible, since Google truncates past that. */
  metaTitle: string;
  description: string;
  /** Answers the query in the first paragraph, before any preamble. */
  intro: string;
  updated: string;
  readMinutes: number;
  sections: Section[];
  faqs: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-to-improve-english-communication-skills",
    title: "How to Improve Your Communication Skills by Speaking",
    metaTitle: "Improve English Communication Skills",
    description:
      "A measurable method for improving spoken English: track pace, filler words, pauses and clarity from your own recordings instead of following generic advice.",
    intro:
      "The fastest way to improve spoken English is to stop studying it and start measuring it. Record sixty seconds of yourself answering a real question, then check four numbers: your words per minute, your filler words per minute, your average pause length, and how many words a listener would have missed. Fix the worst number, record again, and repeat. Most people see a clear change within two weeks, because they are finally working on a specific defect instead of a vague feeling.",
    updated: "2026-08-21",
    readMinutes: 7,
    sections: [
      {
        h: "Why grammar study stops helping",
        p: [
          "Most people who worry about their English communication already have enough vocabulary and grammar. They read technical documents, write clear email, and follow films without subtitles. The gap is not knowledge. It is delivery under pressure.",
          "When you are nervous, three things happen at once: you speed up, you fill silence with um and like, and you stop articulating word endings. None of those are language problems. A native speaker under the same pressure does exactly the same thing. That is why another grammar course does not move the needle, and why hearing yourself does.",
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
      },
      {
        h: "How to practise so it transfers",
        p: [
          "Practise the thing you actually do. Reading a passage aloud improves reading aloud. Answering a question you were not expecting improves answering questions you were not expecting, which is what interviews, standups and investor calls consist of.",
          "Work on one number at a time. Trying to slow down, cut fillers and articulate simultaneously produces stilted speech that helps nothing. Pick the worst number, spend a week on it, then move on.",
          "Re-record immediately after listening. The gap between hearing the defect and speaking again is where the correction actually happens. Waiting until tomorrow loses most of the effect.",
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
    ],
  },
  {
    slug: "how-to-speak-with-confidence",
    title: "How to Speak with Confidence (Without Faking It)",
    metaTitle: "How to Speak with Confidence",
    description:
      "Confidence in speech is produced by pace, pauses and pitch range, not by feeling confident. Here is what listeners actually respond to, and how to change it.",
    intro:
      "Sounding confident is not a feeling you generate before speaking. It is a set of measurable behaviours: a pace under about 150 words per minute, pauses of half a second or longer at the end of thoughts, sentences that fall in pitch at the end rather than rising, and enough volume variation to avoid monotone. You can change all four deliberately, and listeners will read the result as confidence whether or not you feel it.",
    updated: "2026-08-21",
    readMinutes: 6,
    sections: [
      {
        h: "Confidence is heard before it is felt",
        p: [
          "People decide how confident a speaker is within a few seconds, long before they have evaluated the argument. They are responding to delivery, not content. This is frustrating if you know your material, and useful once you accept it, because delivery is trainable and self-belief is not directly.",
          "The practical consequence is that you should stop trying to feel confident before you speak and start controlling the four things listeners actually hear.",
        ],
      },
      {
        h: "Slow down, but only at the joints",
        p: [
          "Uniformly slow speech sounds laboured, not confident. What reads as authority is normal-speed delivery with real pauses at the boundaries between ideas.",
          "The practical rule: pause where a full stop would go in writing, and hold it for a full second. It will feel absurdly long from the inside and sound correct from the outside. That mismatch is why almost nobody does it without measuring.",
        ],
      },
      {
        h: "Let sentences fall",
        p: [
          "Uptalk, where statements end with a rising pitch as though asking a question, is the single most common thing that undermines otherwise good delivery. It signals that you are seeking agreement rather than stating a fact.",
          "Record a minute and listen only to the last word of each sentence. If the pitch rises, practise landing a few sentences deliberately flat or falling. Most people can fix this in under a week once they hear it.",
        ],
      },
      {
        h: "Fillers are a symptom, not the disease",
        p: [
          "Um and uh appear where you are thinking and unwilling to be silent. Attacking the filler directly usually produces a longer stretched word instead, which is worse.",
          "Fix the underlying discomfort with silence. When you feel a filler coming, close your mouth and wait. Two seconds of silence sounds thoughtful. A drawn-out so does not.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does speaking louder make me sound more confident?",
        a: "Only up to a point, and variation matters more than volume. A speaker at constant high volume reads as aggressive or nervous. What reads as confident is a comfortable baseline with deliberate emphasis on the words that matter.",
      },
      {
        q: "How do I stop my voice shaking when I am nervous?",
        a: "A shaking voice comes from shallow breathing. Exhale fully before you start, then speak on a controlled outbreath rather than gulping air between phrases. Longer pauses help here too, because they give you somewhere to breathe.",
      },
    ],
  },
  {
    slug: "how-to-stop-using-filler-words",
    title: "How to Stop Saying Um, Uh and Like",
    metaTitle: "How to Stop Using Filler Words",
    description:
      "Filler words come from discomfort with silence, not a habit you can drop. The method that actually reduces them, with numbers to aim for.",
    intro:
      "Filler words appear in the gap between finishing one thought and starting the next, when you are unwilling to leave that gap silent. You cannot remove them by trying not to say them, because that leaves the gap unfilled and the discomfort intact. What works is deliberately replacing each filler with a pause until silence stops feeling like failure. Aim for under 3 fillers per minute; above 8 is where listeners start noticing the fillers instead of your point.",
    updated: "2026-08-21",
    readMinutes: 5,
    sections: [
      {
        h: "Find out where yours actually occur",
        p: [
          "Fillers are not evenly distributed. Almost everyone has a specific trigger: before a number, when changing topic, when answering a question they were not ready for, or at the start of every sentence.",
          "Record ninety seconds and mark the timestamp of each filler. The pattern is usually obvious after one recording, and knowing your trigger is most of the work.",
        ],
      },
      {
        h: "Replace, do not remove",
        p: [
          "Record the same answer again, and every time you feel a filler arriving, stop making sound. Not a shorter filler, not a substitute word. Silence.",
          "It will feel like an eternity. On playback it is typically half a second and sounds deliberate. This mismatch between how a pause feels and how it sounds is the entire problem, and hearing the recording is what fixes it.",
        ],
      },
      {
        h: "Slow the run-up",
        p: [
          "Fillers cluster in fast speech, because speaking faster than you are thinking guarantees gaps. Dropping from 175 to 145 words per minute often halves the filler rate on its own, without any direct work on fillers.",
        ],
      },
      {
        h: "What to expect",
        p: [
          "Most people cut their filler rate roughly in half within a week of daily one-minute recordings. Getting to near zero is neither realistic nor desirable, since completely filler-free speech sounds rehearsed. Under 3 per minute is where it stops being noticeable.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are filler words always bad?",
        a: "No. A few signal spontaneity and make speech sound natural rather than scripted. They become a problem when the rate is high enough that listeners start tracking them, roughly above 8 per minute.",
      },
      {
        q: "Is like worse than um?",
        a: "In professional settings it tends to cost more, because it is heard as vagueness rather than thinking. It also clusters before numbers and estimates, exactly where you most want to sound precise.",
      },
    ],
  },
  {
    slug: "ideal-speaking-pace-words-per-minute",
    title: "What Is a Good Speaking Pace? Words Per Minute Explained",
    metaTitle: "Ideal Speaking Pace (Words Per Minute)",
    description:
      "The right speaking pace is 130 to 150 words per minute for most situations. Here is how to measure yours, why nerves push it up, and how to bring it down.",
    intro:
      "For most speaking situations, 130 to 150 words per minute is the target. Below about 110 attention drifts; above about 170 listeners follow the words but stop retaining the detail. Podcasts and conversation sit near 150, presentations work better near 130, and audiobooks are deliberately slow at around 120. Nerves reliably push speakers 20 to 40 words per minute above their intended pace, which is why measuring beats estimating.",
    updated: "2026-08-21",
    readMinutes: 5,
    sections: [
      {
        h: "How to measure it properly",
        p: [
          "Record at least sixty seconds of unscripted speech. Shorter samples swing wildly, and scripted reading is 15 to 25 words per minute slower than how you actually talk, so it flatters you.",
          "Count total words and divide by minutes. Note that this includes pauses, which is what makes it useful: a speaker at 140 with real pauses is articulating faster than one at 140 with none, and the second sounds calmer.",
        ],
      },
      {
        h: "Pace is not constant, and the variation is where problems hide",
        p: [
          "Almost nobody speaks at one speed. Most people start near their intended pace and accelerate, particularly through material they know well or find uncomfortable.",
          "An average of 145 can hide a second half at 180. Looking at pace section by section usually finds a specific passage rather than a general habit, which is far easier to fix.",
        ],
      },
      {
        h: "How to actually slow down",
        p: [
          "Do not try to say each word more slowly. That produces a drawl and is exhausting to sustain. Instead lengthen the gaps between sentences. Your articulation rate stays natural while your words per minute drops into range.",
          "Breathing at full stops rather than mid-sentence does most of this automatically, because a breath enforces a pause of about the right length.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is speaking fast a sign of intelligence?",
        a: "Listeners rate fast speakers as more energetic but not more competent, and comprehension drops measurably above roughly 170 words per minute. The perceived advantage disappears as soon as the content requires thought.",
      },
      {
        q: "What speaking pace should I use for a presentation?",
        a: "Nearer 130 than 150. Presentation audiences are processing slides as well as speech, and have no ability to ask you to repeat something.",
      },
    ],
  },
  {
    slug: "pitch-practice-for-founders",
    title: "How to Practise Your Startup Pitch Out Loud",
    metaTitle: "How to Practise a Startup Pitch",
    description:
      "Most founders rehearse a pitch by rereading slides. Here is how to practise delivery instead, and the specific numbers investors respond to.",
    intro:
      "Investors decide how much to trust a founder within the first thirty seconds, and that judgement is made on delivery before the content has been evaluated. Practising a pitch therefore means practising speech, not slides. Record the first sixty seconds out loud, check your pace, filler rate and pause length, and fix those before touching the deck again.",
    updated: "2026-08-21",
    readMinutes: 6,
    sections: [
      {
        h: "Rehearse the opening far more than the rest",
        p: [
          "The first thirty seconds carry disproportionate weight, and they are also when your adrenaline is highest and your pace fastest. Most founders rehearse the whole pitch evenly and are therefore least practised exactly where it matters most.",
          "Record only the opening, twenty times if necessary, until it is automatic enough to survive nerves.",
        ],
      },
      {
        h: "Practise answering, not just presenting",
        p: [
          "The pitch is the easy part. It falls apart in questions, where you cannot rely on rehearsed phrasing. Record yourself answering hard questions cold: why now, why you, what happens if a large incumbent copies this, what is your actual retention.",
          "Delivery under interrogation is a different skill from delivery under performance, and only the first one closes rounds.",
        ],
      },
      {
        h: "The numbers to hit",
        p: [
          "Pace between 130 and 150 words per minute. Founders regularly hit 180 in the opening minute from adrenaline alone.",
          "Fillers under 3 per minute. Pay particular attention to fillers immediately before numbers, which is the most common founder pattern and reads as uncertainty about your own metrics.",
          "At least one pause of a second or longer after your one-line description of the company. Investors need a moment to place you, and speaking through that moment costs you the framing.",
        ],
      },
    ],
    faqs: [
      {
        q: "Should I memorise my pitch word for word?",
        a: "Memorise the first two sentences and the one-line description precisely, then keep the rest as structured points. Fully memorised pitches collapse badly when interrupted, and investors interrupt.",
      },
      {
        q: "How long should a first pitch be?",
        a: "Assume you have sixty seconds before the first interruption, and design for that rather than for the deck length. If the first minute works, you get the rest.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
