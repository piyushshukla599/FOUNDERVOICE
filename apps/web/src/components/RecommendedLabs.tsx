"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type LabRecCard = {
  key: string;
  title: string;
  description?: string;
  duration_sec?: number;
  level?: number;
  sound?: string;
  why?: string;
  fix_line?: string;
  speak?: string;
  how?: string;
  sense?: string;
  source?: string;
};

/**
 * What we heard, then the lab that trains it. Each item is one clickable tile,
 * the observation is the headline, the instruction sits under it, and anything
 * measurable rides in a pill rather than inside the sentence.
 */
export function RecommendedLabs({
  items,
  heading = "What your voice is doing",
  empty,
}: {
  items: LabRecCard[];
  heading?: string;
  empty?: string;
}) {
  const list = (items || []).filter((x) => x?.key);
  if (!list.length) {
    if (!empty) return null;
    return <p className="text-[13px] text-[var(--muted)]">{empty}</p>;
  }

  return (
    <section className="fv-enter space-y-4">
      <div>
        <p className="fv-eyebrow">{heading}</p>
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          Plain words first, then the lab that trains that habit.
        </p>
      </div>

      <div className="fv-stagger space-y-2.5">
        {list.slice(0, 3).map((item) => (
          <Link key={item.key} href={`/trainer?lab=${encodeURIComponent(item.key)}`} className="fv-tile group">
            <p className="text-[15px] leading-snug text-[var(--ink)]">
              {item.sound || item.why || "This habit showed up in your voice."}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
              {item.speak ? `Say this: “${item.speak}”` : item.fix_line || item.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--violet-bright)]">
                {item.title}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </span>
              {item.duration_sec ? (
                <span className="fv-pill">{Math.round(item.duration_sec / 60)} min</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
