"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Square } from "lucide-react";
import { HeroButton } from "@/components/ui";
import { VoiceViz } from "@/components/VoiceViz";
import { fmtTime } from "@/lib/utils";

/**
 * One recording experience, shared by every surface that captures voice.
 *
 * Idle it is a single sentence and one action. Recording, the rest of the page
 * gets out of the way: the timer, the waveform, and a live cue that responds to
 * how you are actually speaking. Live figures are derived from the browser
 * transcript we already collect. The real analysis still happens after you stop.
 */

const FILLERS = [
  "um",
  "uh",
  "like",
  "basically",
  "actually",
  "literally",
  "you know",
  "kind of",
  "sort of",
  "right",
];

function liveStats(transcript: string, elapsed: number) {
  const clean = transcript.trim().toLowerCase();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const minutes = Math.max(elapsed, 1) / 60;
  const wpm = words.length ? Math.round(words.length / minutes) : 0;
  let fillers = 0;
  for (const f of FILLERS) {
    if (f.includes(" ")) {
      fillers += clean.split(f).length - 1;
    } else {
      fillers += words.filter((w) => w.replace(/[^a-z]/g, "") === f).length;
    }
  }
  return { wpm, fillers, words: words.length };
}

/** A short, human cue, never a metric restated as a warning. */
function coachCue(wpm: number, fillers: number, elapsed: number, speaking: boolean) {
  if (elapsed < 4) return "Take your time.";
  if (!speaking && elapsed > 6) return "Nice pause.";
  if (wpm > 175) return "Slow down.";
  if (wpm > 160) return "Ease off the pace.";
  if (wpm > 0 && wpm < 100) return "Lift the pace a little.";
  if (fillers >= 4) return "Let silence do that work.";
  if (wpm >= 125 && wpm <= 150) return "Great pace.";
  return "You are doing well.";
}

export function ImmersiveRecorder({
  title,
  subtitle,
  meta,
  targetSec,
  startLabel = "Start speaking",
  recording,
  starting,
  elapsed,
  stream,
  liveTranscript = "",
  disabled,
  busy,
  busyLabel = "Analyzing your communication…",
  onStart,
  onStop,
  footer,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  targetSec?: number;
  startLabel?: string;
  recording: boolean;
  starting?: boolean;
  elapsed: number;
  stream: MediaStream | null;
  liveTranscript?: string;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  onStart: () => void;
  onStop: () => void;
  footer?: React.ReactNode;
}) {
  const stats = useMemo(() => liveStats(liveTranscript, elapsed), [liveTranscript, elapsed]);

  /* Pressing start should feel like a moment, not a navigation: three beats,
     then the microphone opens and the waveform takes over. */
  const [count, setCount] = useState<number | null>(null);
  const begin = useCallback(() => {
    if (count != null) return;
    setCount(3);
  }, [count]);

  useEffect(() => {
    if (count == null) return;
    if (count === 0) {
      const t = setTimeout(() => {
        setCount(null);
        onStart();
      }, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => (c == null ? null : c - 1)), 800);
    return () => clearTimeout(t);
  }, [count, onStart]);

  /* "Speaking" is inferred from the transcript still growing. */
  const lastLenRef = useRef(0);
  const lastGrowthRef = useRef(0);
  const [speaking, setSpeaking] = useState(true);
  useEffect(() => {
    if (stats.words !== lastLenRef.current) {
      lastLenRef.current = stats.words;
      lastGrowthRef.current = elapsed;
      setSpeaking(true);
    } else if (elapsed - lastGrowthRef.current >= 2) {
      setSpeaking(false);
    }
  }, [elapsed, stats.words]);

  const cue = coachCue(stats.wpm, stats.fillers, elapsed, speaking);
  const remaining = targetSec != null ? Math.max(0, targetSec - elapsed) : null;

  if (count != null) {
    return (
      <section className="fv-enter flex min-h-[340px] flex-col items-center justify-center py-10 text-center">
        <p className="fv-eyebrow-quiet">{title}</p>
        <div key={count} className="fv-count fv-display fv-grad-text mt-6 text-[6rem] leading-none">
          {count === 0 ? "Speak" : count}
        </div>
        <p className="mt-6 text-[13px] text-[var(--muted)]">
          {count === 0 ? "Microphone is live." : "Get comfortable."}
        </p>
      </section>
    );
  }

  if (busy) {
    return (
      <section className="fv-enter py-10 text-center">
        <VoiceViz active height={96} tone="quiet" />
        <p className="mt-6 fv-display text-[1.15rem]">{busyLabel}</p>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          Transcribing and measuring on this machine. Your report opens by itself.
        </p>
      </section>
    );
  }

  if (recording) {
    return (
      <section className="fv-enter py-6 text-center">
        <p className="fv-eyebrow-quiet">{title}</p>

        <div className="mt-4 fv-display fv-num text-[3.4rem] leading-none md:text-[4.2rem]">
          {fmtTime(elapsed)}
        </div>
        {remaining != null && (
          <p className="mt-2 text-[12px] text-[var(--faint)]">{fmtTime(remaining)} left</p>
        )}

        {stats.wpm > 0 && (
          <div className="mt-5">
            <p className="fv-num fv-grad-text text-[1.4rem]">{stats.wpm} WPM</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]">
              target 130–140
            </p>
          </div>
        )}

        <VoiceViz stream={stream} active height={132} className="mt-2" />

        <p key={cue} className="fv-cue mt-4 text-[15px] text-[var(--ink-dim)]">
          {cue}
        </p>

        <div className="mx-auto mt-8 flex max-w-sm justify-between gap-6 text-center">
          <LiveStat label="Pace" value={stats.wpm ? `${stats.wpm}` : "—"} ok={stats.wpm >= 115 && stats.wpm <= 158} />
          <LiveStat label="Fillers" value={String(stats.fillers)} ok={stats.fillers <= 3} />
          <LiveStat label="Words" value={String(stats.words)} ok />
        </div>

        <button
          type="button"
          onClick={onStop}
          className="fv-ghost mx-auto mt-9 !h-12 !px-7 text-[14px] text-[var(--ink)]"
        >
          <Square size={14} className="text-[var(--danger)]" /> Stop
        </button>

        {liveTranscript && (
          <p className="mx-auto mt-6 max-w-lg text-[12.5px] leading-relaxed text-[var(--faint)]">
            {liveTranscript.slice(-180)}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="fv-enter">
      <VoiceViz active={false} height={104} tone="quiet" />
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <HeroButton onClick={begin} disabled={disabled || starting}>
          {starting ? "Opening microphone…" : startLabel}
        </HeroButton>
        {meta && <span className="text-[12.5px] text-[var(--muted)]">{meta}</span>}
      </div>
      {subtitle && <p className="mt-4 text-[13px] text-[var(--muted)]">{subtitle}</p>}
      {footer}
    </section>
  );
}

function LiveStat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex-1">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">{label}</div>
      <div
        className={`mt-1 fv-num text-[15px] ${ok ? "text-[var(--emerald)]" : "text-[var(--accent)]"}`}
      >
        {value}
      </div>
    </div>
  );
}
