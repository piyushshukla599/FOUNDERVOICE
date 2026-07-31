"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ZONE_HEX,
  breathZone,
  clarityZone,
  stabilityZone,
  waveColorFromState,
  wpmZone,
  type CoachHint,
  type GhostHint,
  type LiveMetrics,
  type SentenceTip,
  type ZoneColor,
} from "@/lib/liveCoach";
import { LiveWaveform } from "@/components/LiveWaveform";

type Props = {
  stream: MediaStream | null;
  active: boolean;
  metrics: LiveMetrics;
  sentenceTip: SentenceTip | null;
  coachHint: CoachHint | null;
  ghostHint: GhostHint | null;
  speechSupported: boolean;
};

function LiveCoachPanelInner({
  stream,
  active,
  metrics,
  sentenceTip,
  coachHint,
  ghostHint,
  speechSupported,
}: Props) {
  const zone = wpmZone(metrics.wpm);
  const waveColor = waveColorFromState({
    wpm: metrics.wpm,
    clarity: metrics.clarity,
    monotone: metrics.monotone,
    mumbling: metrics.mumbling,
    emphasis: metrics.emphasis,
    rushing: metrics.risingSpeed || metrics.wpm >= 160,
  });

  const paceFill = Math.min(100, (metrics.wpm / 200) * 100);
  const zoneHex = ZONE_HEX[zone.color];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(15,20,18,0.9)] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">Live Coach</p>
          <p className="text-xs text-[var(--muted)]">
            Active instructor
            {!speechSupported && " · energy mode"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip label="Clarity" value={`${metrics.clarity}%`} color={clarityZone(metrics.clarity)} />
          <Chip label="Breath" value={breathLabel(metrics.breath)} color={breathZone(metrics.breath)} />
          <Chip label="Presence" value={`${metrics.executive}`} color={execColor(metrics.executive)} />
          <Chip label="Stable" value={`${metrics.stability}`} color={stabilityZone(metrics.stability)} />
        </div>
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center py-4">
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 transition-[border-color,box-shadow] duration-300"
          style={{
            borderColor: zoneHex,
            boxShadow: `0 0 28px ${zoneHex}33`,
          }}
        >
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">WPM</div>
            <div
              className="font-[family-name:var(--font-display)] text-5xl tabular-nums transition-colors duration-300"
              style={{ color: zoneHex }}
            >
              {metrics.wpm || "—"}
            </div>
            <div className="mt-1 text-sm font-semibold transition-colors duration-300" style={{ color: zoneHex }}>
              {zone.label}
            </div>
          </div>
          {metrics.risingSpeed && (
            <div className="absolute -top-3 rounded-full bg-[var(--danger)] px-2 py-0.5 text-[10px] font-bold text-white">
              Speed rising
            </div>
          )}
        </div>

        <div className="mt-5 w-full max-w-xs">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
            <span>Pace</span>
            <span style={{ color: zoneHex }}>{zone.label}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
            <div
              className="h-full rounded-full transition-[width,background-color] duration-300"
              style={{ width: `${paceFill}%`, backgroundColor: zoneHex }}
            />
          </div>
        </div>

        <div className="mt-4 grid w-full max-w-xs grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">Breath</div>
            <div className="flex h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full transition-[width,background-color] duration-300"
                style={{
                  width: `${metrics.breath}%`,
                  backgroundColor: ZONE_HEX[breathZone(metrics.breath)],
                }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">Momentum</div>
            <div className="text-sm tracking-widest">
              {"🔥".repeat(Math.max(0, metrics.momentum))}
              <span className="opacity-25">{"·".repeat(Math.max(0, 5 - metrics.momentum))}</span>
            </div>
          </div>
        </div>
      </div>

      <LiveWaveform stream={stream} active={active} color={ZONE_HEX[waveColor]} />

      {metrics.interimText ? (
        <p className="mt-3 line-clamp-1 text-center text-sm text-[var(--muted)] italic">
          “{metrics.interimText}”
        </p>
      ) : null}

      <AnimatePresence>
        {sentenceTip && (
          <motion.div
            key={sentenceTip.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              sentenceTip.kind === "great"
                ? "bg-[rgba(61,143,110,0.95)] text-white"
                : "bg-[rgba(212,160,23,0.95)] text-[#1a1510]"
            }`}
          >
            {sentenceTip.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {coachHint && (
          <motion.div
            key={coachHint.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute right-4 top-20 max-w-[200px] rounded-2xl border px-3 py-2 text-sm font-semibold shadow-xl"
            style={{
              borderColor: ZONE_HEX[coachHint.tone],
              background: "rgba(23,30,26,0.95)",
              color: ZONE_HEX[coachHint.tone],
            }}
          >
            {coachHint.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ghostHint && (
          <motion.div
            key={ghostHint.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute left-4 top-20 max-w-[220px] rounded-2xl border border-[var(--warn)] bg-[rgba(212,160,23,0.12)] px-3 py-2 text-sm text-[var(--warn)]"
          >
            <div className="text-[10px] uppercase tracking-wider opacity-80">Ghost Mode</div>
            {ghostHint.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const LiveCoachPanel = memo(LiveCoachPanelInner);

function Chip({ label, value, color }: { label: string; value: string; color: ZoneColor }) {
  return (
    <div
      className="rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-300"
      style={{ borderColor: `${ZONE_HEX[color]}66`, color: ZONE_HEX[color] }}
    >
      <span className="opacity-70">{label} </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function breathLabel(level: number) {
  if (level >= 45) return "Good";
  if (level >= 25) return "Low";
  return "Breathe";
}

function execColor(score: number): ZoneColor {
  if (score >= 80) return "green";
  if (score >= 65) return "blue";
  if (score >= 50) return "yellow";
  return "orange";
}
