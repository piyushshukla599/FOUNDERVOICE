/**
 * What the coach says before it has heard you speak.
 *
 * A coach does not open with a form. It says hello, finds out what you are
 * here for, and only then asks you to perform — and the answers change what it
 * listens for, because "convince an investor" and "pass a viva" are not the
 * same job. This module is that opening conversation, kept as plain functions
 * so it can be read, changed and reasoned about without a component around it.
 *
 * The matching is keyword scoring rather than a model call. It runs instantly,
 * offline, and costs nothing; when it cannot tell, it does what a person does
 * and treats the answer as general rather than guessing confidently wrong.
 */

export type PurposeKey = "investor" | "class" | "job" | "general";

export type Purpose = {
  key: PurposeKey;
  /** Shown as a chip, and used in the report's focus note. */
  label: string;
  /** How the coach names it back to you, so you know it understood. */
  heard: string;
  /** What it asks you to do, phrased for that audience. */
  prompt: string;
  /** What "good" means here, said once before you start. */
  bar: string;
};

const PURPOSES: Record<PurposeKey, Purpose> = {
  investor: {
    key: "investor",
    label: "Investor pitch",
    heard: "An investor pitch. Good, that's the one where delivery does the most damage.",
    prompt:
      "Give me the pitch. Who it's for, what it does, why now, and what you want from me.",
    bar: "I'm listening for whether you sound like someone who has already decided this works.",
  },
  class: {
    key: "class",
    label: "College presentation",
    heard: "A college presentation. Fine, same rules, friendlier room.",
    prompt: "Take me through it the way you'd open in front of the class.",
    bar: "I'm listening for whether the first thirty seconds make people want the next thirty.",
  },
  job: {
    key: "job",
    label: "Job or work presentation",
    heard: "Work. Got it, so this has to sound certain without sounding rehearsed.",
    prompt: "Go ahead. Present it exactly the way you would on the day.",
    bar: "I'm listening for authority, and for whether you undercut yourself at the end of sentences.",
  },
  general: {
    key: "general",
    label: "Speaking practice",
    heard: "Okay, let's just work on how you sound.",
    prompt: "Talk to me about anything you'd have to explain out loud. Start when you're ready.",
    bar: "I'm listening to pace, fillers and how certain you sound.",
  },
};

const SIGNALS: Record<Exclude<PurposeKey, "general">, string[]> = {
  investor: [
    "investor", "investors", "vc", "venture", "funding", "fundrais", "raise", "raising",
    "seed", "angel", "series a", "demo day", "pitch deck", "startup", "founder", "yc",
  ],
  class: [
    "college", "class", "university", "school", "assignment", "professor", "teacher",
    "viva", "semester", "exam", "student", "thesis", "seminar", "campus",
  ],
  job: [
    "job", "interview", "recruiter", "hiring", "promotion", "appraisal", "client",
    "sales", "meeting", "standup", "stand up", "boss", "manager", "work", "office",
    "team", "board", "demo", "customer",
  ],
};

/**
 * What they said they are practising, or null when it genuinely cannot tell.
 *
 * Null matters. Silently defaulting to "general" would have the coach answer a
 * question it did not understand, which is the exact moment these things stop
 * feeling like a conversation. The caller asks again instead.
 */
export function detectPurpose(said: string): Purpose | null {
  const text = ` ${said.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")} `;
  if (!text.trim()) return null;
  let best: PurposeKey | null = null;
  let bestScore = 0;
  for (const key of ["investor", "class", "job"] as const) {
    // Longer signals win ties: "demo day" is a stronger tell than "demo".
    const score = SIGNALS[key].reduce(
      (n, word) => (text.includes(` ${word}`) ? n + word.split(" ").length : n),
      0,
    );
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  // "Just my speaking", "nothing special" — an answer, and it means general.
  if (!best && /(nothing|anything|general|just|speak|talk|voice|english|practice)/.test(text)) {
    return PURPOSES.general;
  }
  return best ? PURPOSES[best] : null;
}

export function purposeByKey(key: PurposeKey): Purpose {
  return PURPOSES[key];
}

export const PURPOSE_CHOICES: Purpose[] = [
  PURPOSES.investor,
  PURPOSES.class,
  PURPOSES.job,
  PURPOSES.general,
];

export function greeting(name?: string): string {
  const who = name?.trim() ? `, ${name.trim()}` : "";
  return `Hey${who}. Good to have you. How are you doing today?`;
}

export const PURPOSE_QUESTION =
  "So what are we working on? An investor pitch, a college presentation, or something for work?";

/** Asked once when the first answer did not land. After that, buttons. */
export const PURPOSE_REASK =
  "Sorry, I didn't catch that. Investor, college, or work?";

export const PURPOSE_GIVE_UP =
  "No problem. Pick the closest one on screen and we'll get going.";

/** Said when they mentioned the occasion while answering something else. */
export function purposeFromAside(purpose: Purpose): string {
  return `You already told me: ${purpose.label.toLowerCase()}. ${purpose.heard.split(". ").slice(1).join(". ")}`.trim();
}

/**
 * React to how they said they were, the way a person would.
 *
 * Not decoration: someone who says they are nervous has just told the coach
 * what to listen for, and saying so out loud is what makes the next four
 * minutes feel like coaching instead of a test.
 */
export function moodAck(said: string): string {
  const text = said.toLowerCase();
  if (!text.trim()) return "No problem, let's get straight into it.";
  if (/(nervous|anxious|scared|worried|stress|tense)/.test(text)) {
    return "Nerves are useful information. They show up in the voice, so let's find out where.";
  }
  if (/(tired|exhausted|sleepy|drained|long day|rough|bad|not good|terrible|awful)/.test(text)) {
    return "Fair enough. Tired voices go flat and quiet, so I'll watch for that.";
  }
  if (/(great|good|fine|well|okay|ok|amazing|excited|ready|pumped|happy)/.test(text)) {
    return "Good. Then let's use it while you've got it.";
  }
  return "Got it.";
}
