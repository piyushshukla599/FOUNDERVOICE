/**
 * The coaching round, built in the browser from the session it already has.
 *
 * The spoken review normally comes from the API. When that endpoint is not
 * there - an API a deploy or two behind the web app, or the voice service
 * down - every finished pitch used to end in silence, having been recorded,
 * uploaded and analysed successfully. All of the evidence the review is made
 * from is in the session detail the page already fetched, so the last resort
 * is to build the same round here rather than to have nothing to say.
 *
 * This is a port of `spoken_coach.build_conversation`, and it has to stay a
 * port: a browser that says something different from the server about the same
 * recording is worse than a browser that says nothing. It is deliberately the
 * qualitative half only - no measurement is spoken here either, because the
 * numbers belong on the report where they can be read rather than waited for.
 */

import type { CoachConversation, SessionDetail, SpokenLine } from "@/lib/api";

function num(value: unknown): number | null {
  const out = typeof value === "string" ? Number(value) : value;
  return typeof out === "number" && Number.isFinite(out) ? out : null;
}

function line(id: string, kind: string, text: string): SpokenLine {
  return { id, kind, text };
}

/** Where in the take it happened, placed the way a person places it. */
function where(start: unknown, duration: number | null): string {
  const begin = num(start);
  if (begin === null || !duration || duration <= 0) return "";
  const fraction = begin / duration;
  if (fraction <= 0.28) return "early on";
  if (fraction <= 0.62) return "about halfway through";
  return "when you got towards the end";
}

function verdict(metrics: Record<string, unknown>): string {
  // The server scores this properly. Here the inputs are the ones that survive
  // into metrics, so the wording stays deliberately broad rather than pretending
  // to a precision this copy of the logic does not have.
  const confidence = num(metrics.confidence_est) ?? 60;
  const fillers = num(metrics.filler_count) ?? 0;
  const wpm = num(metrics.wpm) ?? 135;
  const paceOff = wpm > 168 || wpm < 105;
  if (confidence >= 72 && fillers <= 2 && !paceOff) {
    return "That was strong. You sounded like someone who has run this pitch before.";
  }
  if (confidence >= 60 && fillers <= 5) {
    return "Solid. The pitch is there. The delivery is what's costing you.";
  }
  if (confidence >= 48) {
    return "It's rough, but it's fixable. The content held up better than the voice did.";
  }
  return "Honestly, that one got away from you. Let's find out where.";
}

type Observation = {
  key: string;
  frame: string;
  probe: string;
  yes: string;
  no: string;
  correction: string;
  retry: string;
};

function observe(
  metrics: Record<string, unknown>,
  events: { kind?: string; meta?: Record<string, unknown> }[],
  duration: number | null,
): Observation | null {
  const wpm = num(metrics.wpm);
  const fastest = (metrics.fastest_section as Record<string, unknown> | null) || null;
  const fastWpm = fastest ? num(fastest.wpm) : null;
  const monotone = num(metrics.monotone_score);
  const confidence = num(metrics.confidence_est);

  const phrases = new Map<string, number>();
  for (const event of events) {
    if (String(event.kind || "") !== "filler") continue;
    const phrase = String((event.meta as Record<string, unknown> | undefined)?.phrase || "").trim();
    if (phrase) phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }
  const fillers = num(metrics.filler_count) ?? [...phrases.values()].reduce((a, b) => a + b, 0);

  if (wpm !== null && fastWpm !== null && fastWpm - wpm >= 22) {
    const place = where(fastest?.start, duration);
    return {
      key: "surge",
      frame: "You were fairly measured for most of that.",
      probe: `Did you feel yourself speeding up${place ? ` ${place}` : ""}?`,
      yes: "Exactly. That's what I heard too.",
      no: "It's subtle from the inside. But it's there.",
      correction:
        "Take a breath before the part that matters, and let the number land on its own.",
      retry: "Give me that part again.",
    };
  }

  if (fillers >= 3) {
    const word = [...phrases.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "um";
    return {
      key: "filler",
      frame: "The shape of it was fine.",
      probe: `Did you catch how often you were saying "${word}"?`,
      yes: "Right. And every one of them sits where you weren't sure yet.",
      no: "They go past you when you're speaking. They don't when you're listening.",
      correction:
        "When you feel one coming, just stop instead. The silence does the same job and sounds certain.",
      retry: "Try the opening again, and let yourself pause.",
    };
  }

  if (monotone !== null && monotone >= 60) {
    return {
      key: "flat",
      frame: "You were clear the whole way through.",
      probe: "Did that feel a bit flat to you?",
      yes: "That's it. Every word got the same weight, so nothing stood out.",
      no: "It reads flatter from out here than it feels in your head.",
      correction:
        "Pick the one sentence you'd want them to repeat afterwards, and drop your voice on it.",
      retry: "Say me that one sentence.",
    };
  }

  if (confidence !== null && confidence < 52) {
    return {
      key: "trail",
      frame: "The content is there, and it holds up.",
      probe: "Did you notice your sentences trailing off at the end?",
      yes: "Yes. And that's the bit a room remembers.",
      no: "It's the last two words each time. They drop away.",
      correction: "Finish the sentence down and stop. Don't let it drift up like a question.",
      retry: "Give me your last line again, and land it.",
    };
  }

  if (wpm !== null && wpm < 105) {
    return {
      key: "slow",
      frame: "Every word of that was clear.",
      probe: "Did it feel a little careful to you?",
      yes: "That's the one. Careful reads as unsure, even when you're right.",
      no: "It's measured. A shade more push and it becomes certain instead.",
      correction: "Take the first two sentences a little quicker, like you already know they work.",
      retry: "Run the opening again, with a bit more front foot.",
    };
  }

  return null;
}

/** The whole round, from a session the page has already fetched. */
export function localReview(detail: SessionDetail | null): CoachConversation {
  const metrics = (detail?.metrics || {}) as Record<string, unknown>;
  const events = (detail?.events || []) as { kind?: string; meta?: Record<string, unknown> }[];
  const duration = num(detail?.session?.duration);

  const lines: SpokenLine[] = [
    line("open", "open", "Okay. I heard it."),
    line("verdict", "verdict", verdict(metrics)),
  ];

  const found = observe(metrics, events, duration);
  if (!found) {
    lines.push(line("clean", "read", "Nothing in the delivery got in the way that time."));
    return { status: "ready", lines, probe: null, correction: null, retry: null };
  }

  lines.push(line("frame", "read", found.frame));
  lines.push(line("turn", "aside", "But there's something I noticed."));

  return {
    status: "ready",
    lines,
    key: found.key,
    probe: { text: found.probe, yes: found.yes, no: found.no },
    correction: found.correction,
    retry: found.retry,
  };
}

/** How the second attempt went, compared without naming either measurement. */
export function localRetryReaction(
  before: SessionDetail | null,
  after: SessionDetail | null,
  key: string,
): SpokenLine[] {
  const b = (before?.metrics || {}) as Record<string, unknown>;
  const a = (after?.metrics || {}) as Record<string, unknown>;

  const moved = (field: string, lowerIsBetter = true): number | null => {
    const was = num(b[field]);
    const now = num(a[field]);
    if (was === null || now === null) return null;
    return lowerIsBetter ? was - now : now - was;
  };

  let gain: number | null = null;
  if (key === "surge") gain = moved("pace_variation");
  else if (key === "filler") gain = moved("filler_count");
  else if (key === "flat") gain = moved("monotone_score");
  else if (key === "trail") gain = moved("confidence_est", false);
  else if (key === "slow") gain = moved("wpm", false);

  if (gain === null) {
    return [line("react", "verdict", "Yeah."), line("react-2", "read", "That sat better. Keep that version.")];
  }
  if (gain > 0.5) {
    return [
      line("react", "verdict", "Yeah."),
      line("react-2", "read", "That's much easier to listen to."),
    ];
  }
  if (gain > -0.5) {
    return [
      line("react", "verdict", "Close."),
      line("react-2", "read", "Same as before, near enough. It's worth one more go."),
    ];
  }
  return [
    line("react", "verdict", "Hm."),
    line(
      "react-2",
      "read",
      "That one went the other way. Slow the whole thing down and try it once more.",
    ),
  ];
}
