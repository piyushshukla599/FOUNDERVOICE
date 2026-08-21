/**
 * Plain-language coaching layer.
 *
 * Turns the metrics/events/patterns the API already returns into the four things
 * every screen has to answer: what happened, why it matters, what to do next,
 * and what evidence backs it. No new numbers are invented here. Every line is
 * derived from a value the pipeline produced, and estimates stay labelled.
 */

import type { Finding, MemoryData, SessionRow } from "@/lib/api";
import type { FocusKey, Prefs } from "@/lib/prefs";

export type Metrics = Record<string, unknown>;

export function num(m: Metrics | null | undefined, key: string): number | null {
  const v = m?.[key];
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* -------------------------------------------------------------------------- */
/* Session-level opportunity                                                   */
/* -------------------------------------------------------------------------- */

export type Opportunity = {
  /** One sentence, plain words: "You speed up when you explain the product." */
  title: string;
  /** Why it costs the listener something. */
  why: string;
  /** The concrete change to make. */
  fix: string;
  /** Named drill, when the finding carries one. */
  exercise?: string;
  /** Timestamp to seek to, when the finding is anchored in the audio. */
  at?: number;
  /** Source finding, if it came from an event rather than a metric threshold. */
  event?: Finding;
};

const METRIC_OPPORTUNITIES: {
  test: (m: Metrics) => boolean;
  build: (m: Metrics) => Opportunity;
}[] = [
  {
    test: (m) => (num(m, "wpm") ?? 0) > 165,
    build: (m) => ({
      title: `You're speaking faster than your ideal pace, ${Math.round(num(m, "wpm")!)} words per minute.`,
      why: "Above about 160 WPM listeners stop absorbing detail; the words arrive but the meaning doesn't.",
      fix: "Target 130–145 WPM on explanations. Plan one full second of silence after each main idea.",
      exercise: "Pause control",
    }),
  },
  {
    test: (m) => (num(m, "filler_count") ?? 0) >= 8,
    build: (m) => ({
      title: `You used ${Math.round(num(m, "filler_count")!)} filler words while you were thinking.`,
      why: "Fillers fill the gap where a pause would have made you sound more certain.",
      fix: "Replace each filler with a closed-mouth beat of silence. Silence reads as control.",
      exercise: "Filler swap",
    }),
  },
  {
    test: (m) => (num(m, "pause_quality") ?? 100) < 60,
    build: () => ({
      title: "Your ideas run together without a beat between them.",
      why: "Without pauses the listener never gets a moment to file one idea before the next arrives.",
      fix: "Pause a full second after each claim, especially before a number or an ask.",
      exercise: "Strategic pause",
    }),
  },
  {
    test: (m) => (num(m, "clarity") ?? 100) < 68,
    build: () => ({
      title: "Word endings are dropping, so parts of the sentence land soft.",
      why: "When endings fade, listeners reconstruct the sentence instead of following the point.",
      fix: "Finish every consonant, especially t, d, k and s at the end of a phrase.",
      exercise: "Consonant finish",
    }),
  },
  {
    test: (m) => (num(m, "monotone_score") ?? 0) > 60,
    build: () => ({
      title: "Your pitch stays flat across sentences, so nothing stands out.",
      why: "Without emphasis the listener can't tell which words carried the point.",
      fix: "Pick one keyword per sentence and let your pitch rise slightly on it.",
      exercise: "Keyword emphasis",
    }),
  },
  {
    test: (m) => (num(m, "confidence_est") ?? 100) < 58,
    build: () => ({
      title: "Your delivery wavers, volume and pace drift mid-sentence.",
      why: "Steadiness is what listeners read as certainty, more than the words themselves.",
      fix: "Take one breath before each claim and hold the same volume to the end of the sentence.",
      exercise: "Confidence stance",
    }),
  },
  {
    test: (m) => (num(m, "wpm") ?? 140) < 105,
    build: (m) => ({
      title: `You're speaking slowly, about ${Math.round(num(m, "wpm")!)} words per minute.`,
      why: "Under roughly 110 WPM attention drifts between your words.",
      fix: "Keep the pauses, lift the pace inside each sentence. Aim for 130–145 WPM.",
      exercise: "Pace ladder",
    }),
  },
];

/** The single most useful thing to say about one recording. */
export function sessionOpportunity(
  metrics: Metrics | null | undefined,
  events: Finding[] | undefined,
): Opportunity | null {
  const ranked = [...(events || [])].sort((a, b) => (b.severity || 0) - (a.severity || 0));
  const top = ranked[0];
  if (top && (top.severity || 0) >= 2) {
    return {
      title: top.observation || top.label,
      why: top.impact || top.cause || "This is the habit costing you the most right now.",
      fix: top.fix || "Slow the section down and repeat it until it feels deliberate.",
      exercise: top.exercise,
      at: top.start,
      event: top,
    };
  }
  const m = metrics || {};
  for (const rule of METRIC_OPPORTUNITIES) {
    try {
      if (rule.test(m)) return rule.build(m);
    } catch {
      /* a missing metric just means this rule doesn't apply */
    }
  }
  if (top) {
    return {
      title: top.observation || top.label,
      why: top.impact || top.cause || "Worth one drill before it becomes a habit.",
      fix: top.fix || "Repeat the section slower.",
      exercise: top.exercise,
      at: top.start,
      event: top,
    };
  }
  return null;
}

/** Anything genuinely good in this recording, used to lead with a strength. */
export function sessionStrength(metrics: Metrics | null | undefined): string | null {
  const m = metrics || {};
  const wpm = num(m, "wpm");
  if (wpm != null && wpm >= 125 && wpm <= 150) return `Your pace held at ${Math.round(wpm)} WPM, right in range.`;
  const clarity = num(m, "clarity");
  if (clarity != null && clarity >= 78) return `Clarity came in at ${Math.round(clarity)}, words landed fully formed.`;
  const pause = num(m, "pause_quality");
  if (pause != null && pause >= 72) return "Your pauses were doing real work between ideas.";
  const presence = num(m, "executive_presence");
  if (presence != null && presence >= 72) return "Presence read strong across the recording.";
  const fillers = num(m, "filler_count");
  if (fillers != null && fillers <= 2) return "Almost no fillers. You let silence do the thinking.";
  return null;
}

/* -------------------------------------------------------------------------- */
/* Comparison against previous work                                            */
/* -------------------------------------------------------------------------- */

export type Comparison = {
  key: string;
  label: string;
  from: number;
  to: number;
  /** Positive = moved the right way, whichever direction that is. */
  improvedPct: number;
  unit?: string;
};

const LOWER_IS_BETTER = new Set(["filler_count", "filler_rate", "monotone_score", "wpm_overrun"]);
/** WPM is judged by distance from the 138 WPM target, not raw direction. */
const TARGET_WPM = 138;

export function compareMetric(
  key: string,
  label: string,
  from: number | null,
  to: number | null,
  unit?: string,
): Comparison | null {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  if (from === to) return null;
  let improvedPct: number;
  if (key === "wpm") {
    const before = Math.abs(from - TARGET_WPM);
    const after = Math.abs(to - TARGET_WPM);
    if (before === 0) return null;
    improvedPct = ((before - after) / before) * 100;
  } else if (LOWER_IS_BETTER.has(key)) {
    if (from === 0) return null;
    improvedPct = ((from - to) / Math.abs(from)) * 100;
  } else {
    if (from === 0) return null;
    improvedPct = ((to - from) / Math.abs(from)) * 100;
  }
  if (!Number.isFinite(improvedPct)) return null;
  return { key, label, from, to, improvedPct: Math.round(improvedPct), unit };
}

/** Session-vs-previous-session comparisons, ordered by size of the change. */
export function compareSessions(
  current: Metrics | null | undefined,
  previous: SessionRow | null | undefined,
): Comparison[] {
  if (!current || !previous) return [];
  const rows: (Comparison | null)[] = [
    compareMetric("wpm", "Pace", previous.wpm ?? null, num(current, "wpm"), "WPM"),
    compareMetric("filler_count", "Fillers", previous.filler_count ?? null, num(current, "filler_count")),
    compareMetric("clarity", "Clarity", previous.clarity ?? null, num(current, "clarity")),
    compareMetric(
      "confidence_est",
      "Confidence",
      previous.confidence_est ?? null,
      num(current, "confidence_est"),
    ),
    compareMetric(
      "executive_presence",
      "Presence",
      previous.executive_presence ?? null,
      num(current, "executive_presence"),
    ),
  ];
  return rows
    .filter((r): r is Comparison => r != null && Math.abs(r.improvedPct) >= 3)
    .sort((a, b) => Math.abs(b.improvedPct) - Math.abs(a.improvedPct));
}

/* -------------------------------------------------------------------------- */
/* Voice Memory digest                                                         */
/* -------------------------------------------------------------------------- */

export type MemoryDigest = {
  strengths: string[];
  recurring: string[];
  improving: string[];
  attention: string[];
  /** True when there simply isn't enough history to say anything honest yet. */
  thin: boolean;
};

const WINDOW_LABELS: { key: string; label: string; lowerBetter?: boolean; strong: number; weak: number }[] = [
  { key: "clarity", label: "Clarity", strong: 76, weak: 66 },
  { key: "executive_presence", label: "Executive presence", strong: 74, weak: 60 },
  { key: "confidence_est", label: "Confidence", strong: 74, weak: 60 },
  { key: "pause_quality", label: "Pause quality", strong: 72, weak: 58 },
  { key: "filler_count", label: "Fillers", lowerBetter: true, strong: 3, weak: 8 },
];

export function memoryDigest(memory: MemoryData | null | undefined): MemoryDigest {
  const w7 = (memory?.windows?.["7d"] || {}) as Record<string, number | null>;
  const w30 = (memory?.windows?.["30d"] || {}) as Record<string, number | null>;
  const sessions7 = Number(w7.sessions || 0);
  const strengths: string[] = [];
  const improving: string[] = [];
  const attention: string[] = [];

  for (const dim of WINDOW_LABELS) {
    const now = w7[dim.key];
    const before = w30[dim.key];
    if (now == null) continue;
    const strong = dim.lowerBetter ? now <= dim.strong : now >= dim.strong;
    const weak = dim.lowerBetter ? now >= dim.weak : now <= dim.weak;
    if (strong) strengths.push(`${dim.label}, holding at ${Math.round(now)}${dim.lowerBetter ? " per session" : ""}.`);
    else if (weak) attention.push(`${dim.label}, sitting at ${Math.round(now)}. This is the one to work.`);

    if (before != null) {
      const cmp = compareMetric(dim.key, dim.label, before, now);
      if (cmp && cmp.improvedPct >= 8) {
        improving.push(`${dim.label} ${cmp.improvedPct > 0 ? "↑" : "↓"} ${Math.abs(cmp.improvedPct)}% vs your 30-day average.`);
      }
    }
  }

  const wpm7 = w7.wpm;
  const wpm30 = w30.wpm;
  if (wpm7 != null) {
    if (wpm7 > 160) attention.push(`Pace, averaging ${Math.round(wpm7)} WPM over 7 days. Target is 130–145.`);
    else if (wpm7 >= 125 && wpm7 <= 150) strengths.push(`Pace, steady at ${Math.round(wpm7)} WPM.`);
    if (wpm30 != null) {
      const cmp = compareMetric("wpm", "Pace", wpm30, wpm7);
      if (cmp && cmp.improvedPct >= 8) improving.push(`Pace moved ${cmp.improvedPct}% closer to target vs your 30-day average.`);
    }
  }

  const recurring = (memory?.top_patterns || [])
    .slice(0, 3)
    .map((p) => `${p.label}, seen in ${p.frequency} session${p.frequency === 1 ? "" : "s"}.`);

  return {
    strengths,
    recurring,
    improving,
    attention,
    thin: sessions7 < 1 && !recurring.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Today's focus                                                               */
/* -------------------------------------------------------------------------- */

export type TodayFocus = {
  /** What the voice is doing, an observation, in the user's own terms. */
  headline: string;
  why: string;
  /** The instruction for today, phrased as one speakable line. */
  action?: string;
  /** The measurable half of the instruction, rendered as a pill, never inline. */
  target?: string;
  /** Which lab key to send them to, when we know one. */
  labKey?: string;
  labTitle?: string;
};

/**
 * Older missions (and anything a model wrote) arrive as
 * "Do the thing (target ~130-140 WPM)." A heading should never carry its own
 * spec in brackets, so split the two apart and let the UI place them.
 */
export function splitTarget(text: string | undefined | null): { text: string; target?: string } {
  const raw = (text || "").trim();
  if (!raw) return { text: "" };
  const m = raw.match(/\s*\((?:target[:\s]*)?([^()]{2,48})\)\s*\.?$/i);
  if (!m) return { text: raw };
  return { text: raw.slice(0, m.index).trim().replace(/[,;:\s]+$/, "") + ".", target: m[1].trim() };
}

/**
 * A detected pattern, said the way a coach would say it out loud. The stored
 * labels read like database rows ("Delivery trends monotone"); a hero heading
 * needs a sentence.
 */
const SOUNDS_LIKE: Record<string, string> = {
  rush_on_intro: "You speed up the moment you start talking.",
  filler_overuse: "Fillers are covering your thinking time.",
  drop_technical_endings: "Your technical words lose their last syllable.",
  monotone: "Your voice is staying on one note.",
  missing_pauses: "The dense parts run without a breath.",
  confidence_drop_qa: "Your voice thins out when the pressure rises.",
};

/** Preference-aware: the focus areas a user picked outrank generic detection. */
export function todayFocus(
  memory: MemoryData | null | undefined,
  mission: { title?: string; why?: string; target?: string; exercise_key?: string } | null | undefined,
  recommended: { key: string; title: string; why?: string; sound?: string }[] | undefined,
  prefs: Prefs,
): TodayFocus | null {
  const pattern = pickPatternForFocus(memory, prefs.focus);
  const lab = recommended?.find((r) => r.key === mission?.exercise_key) || recommended?.[0];
  const missionTitle = splitTarget(mission?.title);
  const target = mission?.target || missionTitle.target;

  /* Today leads with the observation, not the instruction. The instruction is
     the Coach screen's headline, and repeating it verbatim here made every
     screen read like the same sentence pinned twice. */
  const observation =
    (pattern && (SOUNDS_LIKE[pattern.key] || pattern.label)) || lab?.sound || lab?.why;

  if (observation) {
    return {
      headline: observation,
      why:
        mission?.why ||
        (pattern
          ? `Heard in ${pattern.frequency} session${pattern.frequency === 1 ? "" : "s"}${
              pattern.trend > 0 ? ", and trending up" : ""
            }.`
          : "Picked from what your recent recordings sounded like."),
      action: missionTitle.text || undefined,
      target,
      labKey: mission?.exercise_key || lab?.key,
      labTitle: lab?.title,
    };
  }
  if (missionTitle.text) {
    return {
      headline: missionTitle.text,
      why: mission?.why || "One habit at a time is how delivery actually changes.",
      target,
      labKey: mission?.exercise_key || lab?.key,
      labTitle: lab?.title,
    };
  }
  if (lab) {
    return {
      headline: lab.sound || lab.why || `Work ${lab.title.toLowerCase()} today.`,
      why: "Picked from what your recent recordings sounded like.",
      labKey: lab.key,
      labTitle: lab.title,
    };
  }
  return null;
}

function pickPatternForFocus(memory: MemoryData | null | undefined, focus: FocusKey[]) {
  const patterns = memory?.top_patterns || [];
  if (!patterns.length) return null;
  if (!focus.length) return patterns[0];
  const wanted = focus.flatMap((f) => FOCUS_PATTERN_HINTS[f] || []);
  const match = patterns.find((p) => wanted.some((hint) => p.key.includes(hint) || p.label.toLowerCase().includes(hint)));
  return match || patterns[0];
}

/** Rough word hints that connect a chosen focus area to a detected pattern key. */
const FOCUS_PATTERN_HINTS: Record<FocusKey, string[]> = {
  pace: ["rush", "fast", "pace", "speed"],
  fillers: ["filler"],
  pauses: ["pause"],
  clarity: ["clarity", "unclear", "articul", "mumbl"],
  voice: ["monotone", "resonance", "projection", "energy"],
  presence: ["presence", "authority"],
  confidence: ["confidence", "nervous"],
  persuasion: ["persuas", "trust", "story"],
};

/* -------------------------------------------------------------------------- */
/* Misc copy helpers                                                           */
/* -------------------------------------------------------------------------- */

export function modeLabel(mode: string | undefined | null): string {
  switch (mode) {
    case "listening":
      return "Listen";
    case "exercise":
      return "Lab";
    case "practice":
      return "Practice";
    case "pitch":
      return "Pitch";
    case "free":
      return "Record";
    default:
      return "Record";
  }
}

export function relativeDay(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One-line summary of a past session for list rows. */
export function sessionHeadline(s: SessionRow): string {
  const bits: string[] = [];
  if (s.wpm != null) {
    const wpm = Math.round(s.wpm);
    bits.push(wpm > 165 ? `Pace ran hot at ${wpm} WPM` : wpm < 110 ? `Pace dropped to ${wpm} WPM` : `Pace held at ${wpm} WPM`);
  }
  if (s.filler_count != null && s.filler_count >= 6) bits.push(`${s.filler_count} fillers`);
  if (s.clarity != null && s.clarity < 68) bits.push("endings dropped");
  else if (s.clarity != null && s.clarity >= 78) bits.push("clean articulation");
  if (!bits.length) return s.status === "ready" ? "Analyzed, open for the full read." : "Waiting on analysis.";
  return bits.join(" · ");
}
