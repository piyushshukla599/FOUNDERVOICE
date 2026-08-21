"use client";

import { useState } from "react";
import type { Finding } from "@/lib/api";
import { fmtTime } from "@/lib/utils";

/**
 * The recording as a single line you can scrub.
 *
 * Findings sit where they happened; clicking one plays that exact moment. This
 * replaces reading a list of timestamps with pointing at the thing you heard.
 */
export function SessionTimeline({
  duration,
  events,
  onSeek,
  activeStart,
  progress = 0,
}: {
  duration: number;
  events: Finding[];
  onSeek: (t: number) => void;
  activeStart?: number | null;
  /** Where playback is, so the line doubles as the scrubber. */
  progress?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = Math.max(duration || 0, 1);

  /* Keep the line readable: the most severe finding wins a crowded moment. */
  const marks = [...events]
    .filter((e) => Number.isFinite(e.start))
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .reduce<Finding[]>((kept, e) => {
      const pct = (e.start / total) * 100;
      const clash = kept.some((k) => Math.abs((k.start / total) * 100 - pct) < 4);
      return clash ? kept : [...kept, e];
    }, [])
    .sort((a, b) => a.start - b.start);

  if (!marks.length) return null;

  const active = hover != null ? marks[hover] : null;

  return (
    <section className="fv-enter">
      <p className="fv-eyebrow-quiet mb-6">Where it happened</p>

      <div className="relative">
        {/* The whole line is the scrubber; the marks are shortcuts along it. */}
        <div
          className="relative h-px w-full cursor-pointer bg-[var(--line-strong)]"
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            onSeek(((event.clientX - box.left) / box.width) * total);
          }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${Math.min(100, (progress / total) * 100)}%`, background: "var(--grad)" }}
          />
          <span
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[var(--ink)] transition-opacity"
            style={{
              left: `${Math.min(100, (progress / total) * 100)}%`,
              opacity: progress > 0 ? 0.9 : 0,
            }}
          />
          {marks.map((e, i) => {
            const pct = Math.min(98, Math.max(1, (e.start / total) * 100));
            const isActive = activeStart != null && Math.abs(activeStart - e.start) < 0.4;
            const severe = (e.severity || 0) >= 3;
            return (
              <button
                key={`${e.start}-${i}`}
                type="button"
                onClick={(event) => {
                  // Otherwise the click also lands on the track behind it and
                  // seeks to wherever the dot happens to sit, not to the mark.
                  event.stopPropagation();
                  onSeek(e.start);
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                onFocus={() => setHover(i)}
                onBlur={() => setHover((h) => (h === i ? null : h))}
                aria-label={`${fmtTime(e.start)}, ${e.label}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 p-2.5"
                style={{ left: `${pct}%`, top: 0 }}
              >
                <span
                  className={`block rounded-[var(--r-full)] transition-all ${
                    isActive || hover === i ? "h-3 w-3" : "h-2 w-2"
                  } ${severe ? "bg-[var(--accent)]" : "bg-[var(--muted)]"}`}
                  style={
                    isActive || hover === i
                      ? { boxShadow: "0 0 0 4px var(--accent-glow)" }
                      : undefined
                  }
                />
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-between text-[11px] text-[var(--faint)]">
          <span className="fv-num">0:00</span>
          <span className="fv-num">{fmtTime(total)}</span>
        </div>
      </div>

      {/* One label at a time. The timeline explains itself on hover. */}
      <div className="mt-4 min-h-[2.75rem]">
        {active ? (
          <p key={active.start} className="fv-cue text-[13.5px] leading-relaxed">
            <span className="fv-num text-[var(--accent)]">{fmtTime(active.start)}</span>{" "}
            <span className="text-[var(--ink-dim)]">{active.observation || active.label}</span>
          </p>
        ) : (
          <p className="text-[13px] text-[var(--muted)]">
            {marks.length} moment{marks.length === 1 ? "" : "s"} worth hearing again. Hover to read,
            click to play.
          </p>
        )}
      </div>
    </section>
  );
}
