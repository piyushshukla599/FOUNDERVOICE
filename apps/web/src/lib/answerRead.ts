/**
 * How an answer held up under questioning.
 *
 * The pitch itself goes through the full pipeline — Whisper, acoustics, the
 * whole analysis. The answers to investor questions deliberately do not: they
 * are short, there may be four of them, and uploading each one would turn a
 * two-minute conversation into a queue of transcription jobs.
 *
 * So this reads the three signals available for free from a browser
 * transcript, all of which a real investor is reading anyway:
 *
 *   hedging   — "I think", "probably", "kind of". Nine times out of ten the
 *               person hedging does not have the number.
 *   hesitation— how long before the first word. Someone who knows their
 *               business starts inside a second.
 *   length    — twelve words is a dodge; a hundred and twenty is a ramble that
 *               gets interrupted.
 *
 * It never claims to measure confidence acoustically. It says what it heard,
 * and what that sounds like from the other side of the table.
 */

const HEDGES = [
  "i think",
  "i guess",
  "i believe",
  "maybe",
  "probably",
  "kind of",
  "sort of",
  "hopefully",
  "i'm not sure",
  "im not sure",
  "not really sure",
  "we'll try",
  "we will try",
  "somewhat",
  "a little bit",
  "or something",
  "i would say",
];

const FILLERS = ["um", "uh", "erm", "like", "you know", "basically", "actually", "literally"];

export type AnswerSignal = {
  words: number;
  hedges: string[];
  fillers: string[];
  /** Milliseconds before they started talking. */
  pauseMs: number;
};

export function readAnswer(text: string, pauseMs: number): AnswerSignal {
  const clean = ` ${text.toLowerCase().replace(/[^a-z'\s]/g, " ").replace(/\s+/g, " ")} `;
  const hedges = HEDGES.filter((h) => clean.includes(` ${h} `) || clean.includes(` ${h},`));
  const fillers = FILLERS.filter((f) => clean.includes(` ${f} `));
  return {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    hedges,
    fillers,
    pauseMs,
  };
}

/**
 * One spoken paragraph on how the answers went.
 *
 * Ordered by what costs the most in a real room: hedging first, then a stall,
 * then answers too thin to be evidence, then a ramble. Only the worst one is
 * said — a list of four faults is a report, and this is a conversation.
 */
export function answerVerdict(signals: AnswerSignal[], apiConfidence?: number): string {
  const answered = signals.filter((s) => s.words > 0);
  if (!answered.length) {
    return "You didn't take the questions on. That's the part that decides the meeting, so try it again when you're ready.";
  }

  const hedges = answered.flatMap((s) => s.hedges);
  const fillers = answered.flatMap((s) => s.fillers);
  const avgWords = answered.reduce((n, s) => n + s.words, 0) / answered.length;
  const slowest = Math.max(...answered.map((s) => s.pauseMs));

  if (hedges.length >= 2) {
    const quoted = [...new Set(hedges)]
      .slice(0, 2)
      .map((h) => `"${h[0].toUpperCase()}${h.slice(1)}"`)
      .join(" and ");
    return (
      `Under questioning you hedged ${hedges.length} times — ${quoted}. ` +
      "From the other side of the table that reads as not having the number, even when you do."
    );
  }
  if (slowest >= 2600) {
    return (
      `You took about ${(slowest / 1000).toFixed(1)} seconds before answering one of those. ` +
      "The silence says more than the answer does. Buy it back with a short bridge, then talk."
    );
  }
  if (avgWords < 14) {
    return (
      "Your answers were short enough to sound defensive. One claim and one piece of proof " +
      "is the shape you want — not a sentence that hopes the question goes away."
    );
  }
  if (avgWords > 110) {
    return (
      "Those answers ran long, and long answers get interrupted. Lead with the claim, " +
      "then one number, then stop talking."
    );
  }
  if (fillers.length >= 3) {
    return (
      `Fillers crept into the answers — ${[...new Set(fillers)].slice(0, 2).join(", ")}. ` +
      "In a pitch they're forgivable. In a question they sound like you're stalling."
    );
  }
  if (typeof apiConfidence === "number" && apiConfidence < 52) {
    return "You held the answers, but they came out softer than the pitch did. Say them like the pitch.";
  }
  return "Those held up. You answered the question that was asked, which is rarer than it sounds.";
}
