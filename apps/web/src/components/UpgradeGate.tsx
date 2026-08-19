"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import type { QuotaState } from "@/lib/api";

/**
 * What a visitor sees when the free allowance runs out.
 *
 * Deliberately not styled as an error: nothing broke, they reached the end of
 * what the free tier covers. The tone is "here is what is next", and the only
 * action is the one that helps us — telling us they want more.
 */
export function UpgradeGate({
  quota,
  title,
  body,
  interest = "pro",
}: {
  quota?: QuotaState;
  title?: string;
  body?: string;
  interest?: string;
}) {
  const label = quota?.label || "free runs";
  const limit = quota && quota.limit > 0 ? quota.limit : null;

  return (
    <section className="fv-enter fv-glow-panel p-6 text-center md:p-8">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--r-full)] bg-[var(--accent-soft)] text-[var(--violet-bright)]">
        <Lock size={18} aria-hidden />
      </div>

      <h2 className="mx-auto mt-4 fv-display text-[1.35rem]">
        {title || "You have used your free runs"}
      </h2>

      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--muted)]">
        {body ||
          (limit
            ? `Every visitor gets ${limit} free ${label}. Yours are spent — Pro removes the cap.`
            : `Pro removes the cap on ${label}.`)}
      </p>

      {limit && (
        <p className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="fv-pill">
            <span className="fv-num font-semibold text-[var(--ink-dim)]">
              {quota?.used ?? limit}/{limit}
            </span>
            <span className="text-[var(--muted)]">used</span>
          </span>
        </p>
      )}

      <div className="mt-7 flex flex-col items-center">
        <Link href={`/contact?interest=${encodeURIComponent(interest)}`} className="fv-hero">
          <Sparkles size={16} aria-hidden />
          Unlock Pro
        </Link>
        <p className="mt-3.5 text-[12.5px] text-[var(--faint)]">
          Tell us what you need — we reply personally.
        </p>
      </div>
    </section>
  );
}

/** The quiet inline version: how many runs are left, before they run out. */
export function QuotaMeter({ quota }: { quota?: QuotaState }) {
  if (!quota || quota.unlimited || quota.limit <= 0) return null;
  const low = quota.remaining <= 1;
  return (
    <span className={low ? "fv-pill fv-pill-gold" : "fv-pill"}>
      <span className="fv-num font-semibold">{quota.remaining}</span>
      <span className={low ? "" : "text-[var(--muted)]"}>
        free {quota.label} left
      </span>
    </span>
  );
}
