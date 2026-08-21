"use client";

/**
 * User preference system (local only. No backend change).
 *
 * The one preference the API already owns is the voice goal (`/api/voice-goal`),
 * which drives the training plan. Everything else here shapes the *interface*:
 * what we show first, how much we explain, and how long we ask you to work.
 */

import { useCallback, useEffect, useState } from "react";

const KEY = "fv.prefs.v1";

export type GoalKey =
  | "executive_presence"
  | "investor_pitch"
  | "ted_style"
  | "podcast_host"
  | "conference_speaker"
  | "sales_leader"
  | "interview_excellence"
  | "teacher"
  | "public_speaking"
  | "daily_communication";

export type CoachingStyle = "direct" | "supportive" | "detailed" | "minimal" | "data";
export type Intensity = "light" | "normal" | "intensive";
export type SessionLength = 2 | 5 | 10 | 20;
export type FocusKey =
  | "pace"
  | "fillers"
  | "pauses"
  | "clarity"
  | "voice"
  | "presence"
  | "confidence"
  | "persuasion";

export type Prefs = {
  /** First name, used only to make the coach sound like it knows you. */
  name: string;
  goal: GoalKey;
  style: CoachingStyle;
  intensity: Intensity;
  sessionLength: SessionLength;
  focus: FocusKey[];
  /** ISO date the guided intro was finished. Empty = never onboarded. */
  onboardedAt: string;
  /** Feature intros already dismissed ("listen", "labs", "progress", …). */
  seen: Record<string, boolean>;
};

export const DEFAULT_PREFS: Prefs = {
  name: "",
  goal: "executive_presence",
  style: "direct",
  intensity: "normal",
  sessionLength: 5,
  focus: [],
  onboardedAt: "",
  seen: {},
};

/** Goals mirror `training_program.GOALS` on the API, keys must match. */
export const GOAL_OPTIONS: { key: GoalKey; label: string; blurb: string }[] = [
  {
    key: "investor_pitch",
    label: "Investor pitch",
    blurb: "Raise money. Say more with fewer words.",
  },
  {
    key: "executive_presence",
    label: "Executive presence",
    blurb: "Lead the room. Sound certain without pushing.",
  },
  {
    key: "interview_excellence",
    label: "Interviews",
    blurb: "Answer hard questions without rushing.",
  },
  {
    key: "sales_leader",
    label: "Sales",
    blurb: "Be trusted fast, then be persuasive.",
  },
  {
    key: "public_speaking",
    label: "Public speaking",
    blurb: "Stage delivery, projection and pauses.",
  },
  {
    key: "conference_speaker",
    label: "Conference talks",
    blurb: "Long-form clarity that survives a big room.",
  },
  {
    key: "ted_style",
    label: "Storytelling",
    blurb: "Rhythm, emphasis, and a landing line.",
  },
  {
    key: "podcast_host",
    label: "Podcast / interviews you host",
    blurb: "Warmth and conversational flow.",
  },
  {
    key: "teacher",
    label: "Teaching",
    blurb: "Explain complex things simply.",
  },
  {
    key: "daily_communication",
    label: "Everyday meetings",
    blurb: "Standups, 1:1s, and calls.",
  },
];

export const STYLE_OPTIONS: { key: CoachingStyle; label: string; blurb: string }[] = [
  { key: "direct", label: "Direct", blurb: "Name the problem in one line." },
  { key: "supportive", label: "Supportive", blurb: "Lead with what worked." },
  { key: "detailed", label: "Detailed", blurb: "Show the reasoning behind each note." },
  { key: "minimal", label: "Minimal", blurb: "One thing to fix. Nothing else." },
  { key: "data", label: "Data-driven", blurb: "Numbers and trends up front." },
];

export const INTENSITY_OPTIONS: { key: Intensity; label: string; blurb: string }[] = [
  { key: "light", label: "Light", blurb: "A few minutes, a few days a week." },
  { key: "normal", label: "Normal", blurb: "One drill most days." },
  { key: "intensive", label: "Intensive", blurb: "Daily drill plus a pressure round." },
];

export const LENGTH_OPTIONS: { key: SessionLength; label: string }[] = [
  { key: 2, label: "2 min" },
  { key: 5, label: "5 min" },
  { key: 10, label: "10 min" },
  { key: 20, label: "20+ min" },
];

export const FOCUS_OPTIONS: { key: FocusKey; label: string }[] = [
  { key: "pace", label: "Pace" },
  { key: "fillers", label: "Fillers" },
  { key: "pauses", label: "Pauses" },
  { key: "clarity", label: "Clarity" },
  { key: "voice", label: "Voice quality" },
  { key: "presence", label: "Presence" },
  { key: "confidence", label: "Confidence" },
  { key: "persuasion", label: "Persuasion" },
];

/** Metric keys each focus area maps to, used to order what a page shows first. */
export const FOCUS_METRICS: Record<FocusKey, string[]> = {
  pace: ["wpm"],
  fillers: ["filler_count", "filler_rate"],
  pauses: ["pause_quality"],
  clarity: ["clarity", "articulation"],
  voice: ["voice_resonance", "projection", "monotone_score"],
  presence: ["executive_presence", "authority"],
  confidence: ["confidence_est"],
  persuasion: ["persuasiveness", "founder_trust"],
};

export function goalLabel(key: string): string {
  return GOAL_OPTIONS.find((g) => g.key === key)?.label || "Executive presence";
}

function coerce(raw: unknown): Prefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const p = raw as Partial<Prefs>;
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 40) : "",
    goal: (GOAL_OPTIONS.find((g) => g.key === p.goal)?.key || DEFAULT_PREFS.goal) as GoalKey,
    style: (STYLE_OPTIONS.find((s) => s.key === p.style)?.key || DEFAULT_PREFS.style) as CoachingStyle,
    intensity: (INTENSITY_OPTIONS.find((i) => i.key === p.intensity)?.key ||
      DEFAULT_PREFS.intensity) as Intensity,
    sessionLength: (LENGTH_OPTIONS.find((l) => l.key === p.sessionLength)?.key ||
      DEFAULT_PREFS.sessionLength) as SessionLength,
    focus: Array.isArray(p.focus)
      ? p.focus.filter((f): f is FocusKey => FOCUS_OPTIONS.some((o) => o.key === f))
      : [],
    onboardedAt: typeof p.onboardedAt === "string" ? p.onboardedAt : "",
    seen: p.seen && typeof p.seen === "object" ? (p.seen as Record<string, boolean>) : {},
  };
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    return coerce(JSON.parse(window.localStorage.getItem(KEY) || "null"));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(next: Prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("fv-prefs", { detail: next }));
  } catch {
    /* storage disabled, preferences stay in memory for this tab */
  }
}

/**
 * Reads preferences on mount (never during render, so SSR and the first client
 * paint agree). `ready` tells a page whether it may adapt yet.
 */
export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
    const onChange = (ev: Event) => {
      const detail = (ev as CustomEvent<Prefs>).detail;
      if (detail) setPrefs(detail);
    };
    window.addEventListener("fv-prefs", onChange);
    return () => window.removeEventListener("fv-prefs", onChange);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = coerce({ ...prev, ...patch });
      savePrefs(next);
      return next;
    });
  }, []);

  const markSeen = useCallback((key: string) => {
    setPrefs((prev) => {
      if (prev.seen[key]) return prev;
      const next = { ...prev, seen: { ...prev.seen, [key]: true } };
      savePrefs(next);
      return next;
    });
  }, []);

  return { prefs, ready, update, markSeen };
}
