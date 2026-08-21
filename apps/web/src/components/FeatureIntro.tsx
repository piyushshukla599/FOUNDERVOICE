"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { usePrefs } from "@/lib/prefs";

/**
 * Lightweight contextual education. Shown once per feature, then never again,
 * dismissal is persisted, so a returning user gets a clean screen.
 */
export function FeatureIntro({
  id,
  title,
  body,
  steps,
}: {
  id: string;
  title: string;
  body: string;
  steps?: string[];
}) {
  const { prefs, ready, markSeen } = usePrefs();
  if (!ready || prefs.seen[id]) return null;

  return (
    <aside className="relative rounded-[var(--r-lg)] border border-[var(--accent-line)] bg-[var(--accent-soft)] p-4 md:p-5">
      <button
        type="button"
        onClick={() => markSeen(id)}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <X size={15} />
      </button>
      <h2 className="fv-display pr-8 text-lg">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-dim)]">{body}</p>
      {steps && steps.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-[var(--ink-dim)]">
              <span className="tabular-nums text-[var(--accent)]">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => markSeen(id)}
        className="mt-4 rounded-[var(--r-md)] border border-[var(--accent-line)] px-3 py-1.5 text-[13px] text-[var(--accent)]"
      >
        Got it
      </button>
    </aside>
  );
}

/**
 * A single forward step in the journey, "you did X, here's the feature that
 * builds on it". Only render when the user hasn't found that feature yet.
 */
export function DiscoveryNudge({
  id,
  question,
  cta,
  href,
}: {
  id: string;
  question: string;
  cta: string;
  href: string;
}) {
  const { prefs, ready, markSeen } = usePrefs();
  if (!ready || prefs.seen[id]) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] bg-[rgba(244,243,251,0.03)] px-4 py-3">
      <p className="text-[13px] text-[var(--ink-dim)]">{question}</p>
      <div className="flex items-center gap-2">
        <Link
          href={href}
          onClick={() => markSeen(id)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)]"
        >
          {cta} <ArrowRight size={14} />
        </Link>
        <button
          type="button"
          onClick={() => markSeen(id)}
          aria-label="Not now"
          className="text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
