"use client";

import { Mic, Square } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { fmtTime } from "@/lib/utils";

type Props = {
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
};

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
}: Props) {
  const remaining = targetSec != null ? Math.max(0, targetSec - elapsed) : null;

  return (
    <div className="space-y-3">
      <Waveform stream={stream} active={recording} />
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            disabled={disabled || starting}
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Mic size={16} />
            {starting ? "Opening mic…" : startLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Square size={14} /> Stop & analyze
          </button>
        )}
        <span className="font-mono text-sm text-[var(--muted)]">
          {fmtTime(elapsed)}
          {remaining != null && ` · ${fmtTime(remaining)} left`}
        </span>
      </div>
      {liveTranscript ? (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--muted)]">
          <span className="text-[var(--accent)]">Live: </span>
          {liveTranscript}
        </p>
      ) : null}
    </div>
  );
}
