"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { fmtTime } from "@/lib/utils";

export type AudioHandle = {
  /** Jump to a second and start playing. Safe to call before metadata loads. */
  seek: (seconds: number) => void;
  toggle: () => void;
};

/**
 * Playback for one recording.
 *
 * This replaces `<audio controls>`, which brought three problems. It renders
 * as a grey operating-system widget in the middle of a page that is otherwise
 * carefully typeset; it gives no feedback at all when the file fails to load,
 * so a missing recording looks like a broken page rather than a message; and
 * its scrubber is unusable on a browser recording, because MediaRecorder
 * writes no duration and the element reports Infinity. The last one is fixed
 * on the server by serving the analysed WAV, but the duration we were given
 * by the analysis is still the better number to trust, so it wins here too.
 */
export const AudioPlayer = forwardRef<AudioHandle, {
  src: string;
  /** Length from the analysis, used until (and unless) the file reports its own. */
  fallbackDuration?: number;
  onProgress?: (seconds: number) => void;
}>(function AudioPlayer({ src, fallbackDuration = 0, onProgress }, ref) {
  const el = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [reported, setReported] = useState(0);
  const [failed, setFailed] = useState(false);

  const total = reported > 0 ? reported : fallbackDuration;

  const seek = useCallback((seconds: number) => {
    const a = el.current;
    if (!a) return;
    const go = () => {
      a.currentTime = Math.max(0, seconds);
      void a.play().catch(() => undefined);
    };
    // Assigning currentTime before the browser has the header is a no-op, and
    // silently doing nothing is exactly how "click the moment" appeared broken.
    if (a.readyState >= 1) go();
    else a.addEventListener("loadedmetadata", go, { once: true });
  }, []);

  const toggle = useCallback(() => {
    const a = el.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  }, []);

  useImperativeHandle(ref, () => ({ seek, toggle }), [seek, toggle]);

  useEffect(() => {
    setFailed(false);
    setReported(0);
    setCurrent(0);
  }, [src]);

  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  const scrub = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!total) return;
    const box = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - box.left) / box.width) * total);
  };

  // The <audio> element stays mounted even after a failure. Unmounting it on
  // error means a retry is impossible and a transient hiccup looks permanent.
  const audio = (
    <audio
      ref={el}
      src={src}
      preload="metadata"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onError={() => setFailed(true)}
      onLoadedMetadata={(e) => {
        setFailed(false);
        const d = e.currentTarget.duration;
        if (Number.isFinite(d) && d > 0) setReported(d);
      }}
      onTimeUpdate={(e) => {
        const t = e.currentTarget.currentTime;
        setCurrent(t);
        onProgress?.(t);
      }}
      className="hidden"
    />
  );

  if (failed) {
    return (
      <>
        <p className="text-[13px] leading-relaxed text-[var(--muted)]">
          This recording&rsquo;s audio could not be loaded. The coaching below still stands — it was
          written from the transcript — but the file itself is no longer on the server.
        </p>
        {audio}
      </>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play recording"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-full)] text-[var(--bg)] transition hover:brightness-110 active:scale-95"
        style={{ background: "var(--grad)" }}
      >
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        {/* A tall hit area around a hairline: easy to hit, quiet to look at. */}
        <div className="group -my-2 cursor-pointer py-2" onClick={scrub}>
          <div className="relative h-[3px] w-full rounded-[var(--r-full)] bg-[var(--line-strong)]">
            <div
              className="absolute inset-y-0 left-0 rounded-[var(--r-full)]"
              style={{ width: `${pct}%`, background: "var(--grad)" }}
            />
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-full)] bg-[var(--ink)] opacity-0 shadow-[0_0_12px_var(--accent-glow)] transition-opacity group-hover:opacity-100"
              style={{ left: `${pct}%` }}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[var(--faint)]">
          <span className="fv-num">{fmtTime(current)}</span>
          <span className="fv-num">{total ? fmtTime(total) : "--:--"}</span>
        </div>
      </div>

      {audio}
    </div>
  );
});
