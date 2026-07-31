export type ZoneColor =
  | "green"
  | "blue"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "pink"
  | "white";

export const ZONE_HEX: Record<ZoneColor, string> = {
  green: "#3d8f6e",
  blue: "#3b82c4",
  yellow: "#d4a017",
  orange: "#d97706",
  red: "#c45c4a",
  purple: "#8b6bb5",
  pink: "#d46a9a",
  white: "#e8efe9",
};

export function wpmZone(wpm: number): { color: ZoneColor; label: string } {
  if (wpm >= 170) return { color: "red", label: "Too Fast" };
  if (wpm >= 150) return { color: "orange", label: "Fast" };
  if (wpm >= 120) return { color: "green", label: "Perfect" };
  if (wpm >= 90) return { color: "blue", label: "Slightly Slow" };
  if (wpm > 0) return { color: "purple", label: "Too Slow" };
  return { color: "blue", label: "Listening" };
}

export function clarityZone(pct: number): ZoneColor {
  if (pct >= 90) return "green";
  if (pct >= 75) return "blue";
  if (pct >= 60) return "yellow";
  if (pct >= 45) return "orange";
  return "red";
}

export function stabilityZone(score: number): ZoneColor {
  // score 0-100, higher = more stable
  if (score >= 70) return "green";
  if (score >= 45) return "orange";
  return "red";
}

export function breathZone(level: number): ZoneColor {
  // 0 empty, 100 full
  if (level >= 45) return "green";
  if (level >= 25) return "orange";
  return "red";
}

export function waveColorFromState(input: {
  wpm: number;
  clarity: number;
  monotone: boolean;
  mumbling: boolean;
  emphasis: boolean;
  rushing: boolean;
}): ZoneColor {
  if (input.emphasis) return "white";
  if (input.mumbling) return "red";
  if (input.monotone) return "purple";
  if (input.rushing || input.wpm >= 170) return "orange";
  if (input.wpm >= 120 && input.wpm <= 145 && input.clarity >= 85) return "blue";
  return "green";
}

export type LiveMetrics = {
  wpm: number;
  clarity: number;
  confidence: number;
  breath: number;
  stability: number;
  executive: number;
  momentum: number;
  monotone: boolean;
  mumbling: boolean;
  emphasis: boolean;
  risingSpeed: boolean;
  speaking: boolean;
  interimText: string;
};

export type SentenceTip = {
  id: string;
  kind: "great" | "warn";
  text: string;
  at: number;
};

export type CoachHint = {
  id: string;
  text: string;
  tone: ZoneColor;
  at: number;
};

export type GhostHint = {
  id: string;
  text: string;
  at: number;
};

export { estimatePitch } from "./pitch";
