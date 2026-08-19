"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/ui";

/**
 * The score, as the emotional centre of the screen.
 *
 * A gradient ring that draws itself on arrival, lit from behind. The number
 * counts up rather than appearing, so the reading feels earned. Used on Today
 * and anywhere a single figure is the headline.
 */
export function ScoreRing({
  value,
  delta,
  label = "Founder presence",
  caption,
  size = 232,
}: {
  value: number | null;
  delta?: number | null;
  label?: string;
  caption?: string;
  size?: number;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value != null ? Math.max(0, Math.min(100, value)) / 100 : 0;
  const offset = circumference * (1 - (drawn ? pct : 0));

  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
      {/* light behind the ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.32) 0%, rgba(224,86,160,0.16) 45%, transparent 70%)",
          filter: "blur(34px)",
        }}
      />

      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label} ${value ?? "not yet measured"}`}>
        <defs>
          <linearGradient id="fv-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#5b7cfa" />
            <stop offset="100%" stopColor="#e056a0" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(244,243,251,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#fv-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <AnimatedNumber
          value={value}
          duration={1300}
          className="fv-display fv-grad-text text-[3.6rem] leading-none"
        />
        {delta != null && delta !== 0 && (
          <span
            className={`fv-num mt-1.5 text-[13px] ${
              delta > 0 ? "text-[var(--emerald)]" : "text-[var(--danger)]"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta} this month
          </span>
        )}
        <span className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
      </div>

      {caption && <p className="mt-5 text-center text-[12.5px] text-[var(--faint)]">{caption}</p>}
    </div>
  );
}
