"use client";

import { Square } from "lucide-react";
import { HeroButton } from "@/components/ui";
import { VoiceViz } from "@/components/VoiceViz";
import { fmtTime } from "@/lib/utils";

/**
 * Compact recorder for surfaces that keep their surrounding context, a lab
 * script, a practice question. The waveform still carries the live state, but
 * the screen does not take over the way the full recorder does.
 */
export function PracticeRecorderBar({
  recording,
  starting,
  elapsed,
  stream,
  liveTranscript,
  targetSec,
  startLabel = "Start recording",
  onStart,
  onStop,
  disabled,
}: {
  recording: boolean;
  starting?: boolean;
  elapsed: number;
  stream: MediaStream | null;
  liveTranscript?: string;
  targetSec?: number;
  startLabel?: string;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}) {
  const remaining = targetSec != null ? Math.max(0, targetSec - elapsed) : null;

  return (
    <div className="space-y-4">
      <VoiceViz stream={stream} active={recording} height={recording ? 96 : 64} tone={recording ? "accent" : "quiet"} />

      <div className="flex flex-wrap items-center gap-4">
        {!recording ? (
          <HeroButton onClick={onStart} disabled={disabled || starting} arrow={false}>
            {starting ? "Opening microphone…" : startLabel}
          </HeroButton>
        ) : (
          <button type="button" onClick={onStop} className="fv-ghost !h-12 !px-6 text-[14px] text-[var(--ink)]">
            <Square size={14} className="text-[var(--danger)]" /> Stop
          </button>
        )}
        <span className="fv-num text-[13px] text-[var(--muted)]">
          {fmtTime(elapsed)}
          {remaining != null && recording ? ` · ${fmtTime(remaining)} left` : ""}
        </span>
      </div>

      {liveTranscript ? (
        <p className="max-w-xl text-[12.5px] leading-relaxed text-[var(--faint)]">
          {liveTranscript.slice(-160)}
        </p>
      ) : null}
    </div>
  );
}
