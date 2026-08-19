"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/*                                                                             */
/* The default grouping has no border and no fill — whitespace separates it.    */
/* `raised` is for the rare block that genuinely needs lifting off the page.    */
/* -------------------------------------------------------------------------- */

export function Panel({
  children,
  className,
  tone = "raised",
}: {
  children: ReactNode;
  className?: string;
  tone?: "raised" | "plain" | "accent" | "success" | "danger" | "quiet";
}) {
  const tones = {
    raised: "fv-raised p-5 md:p-6",
    plain: "p-0",
    quiet: "p-5 md:p-6",
    accent: "fv-raised p-5 md:p-6 shadow-[inset_0_0_0_1px_var(--accent-line)]",
    success: "p-5 md:p-6 rounded-[var(--r-lg)] bg-[var(--emerald-soft)]",
    danger: "p-5 md:p-6 rounded-[var(--r-lg)] bg-[var(--danger-soft)]",
  } as const;

  return <section className={cn("fv-enter", tones[tone], className)}>{children}</section>;
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="fv-enter flex flex-wrap items-end justify-between gap-5 pb-1">
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="fv-eyebrow">{eyebrow}</p>}
        <h1 className="fv-display text-[1.9rem] leading-tight md:text-[2.4rem]">{title}</h1>
        {sub && <p className="text-[14px] leading-relaxed text-[var(--muted)]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="fv-eyebrow-quiet mb-1.5">{eyebrow}</p>}
        <h2 className="fv-display text-[1.15rem]">{title}</h2>
        {sub && <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("fv-divider my-7", className)} />;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/** The single most important action on a screen. There should only be one. */
export function HeroButton({
  children,
  arrow = true,
  className,
  ...rest
}: { children: ReactNode; arrow?: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn("fv-hero", className)} {...rest}>
      {children}
      {arrow && <ArrowRight size={17} className="fv-arrow" aria-hidden />}
    </button>
  );
}

export function HeroLink({
  children,
  href,
  arrow = true,
  className,
}: {
  children: ReactNode;
  href: string;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("fv-hero", className)}>
      {children}
      {arrow && <ArrowRight size={17} className="fv-arrow" aria-hidden />}
    </Link>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

export function btnClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  const variants: Record<Variant, string> = {
    primary: "fv-hero !h-auto !text-[14px]",
    accent: "bg-[var(--emerald)] text-white font-medium hover:brightness-110 rounded-[var(--r-full)]",
    secondary: "fv-ghost !h-auto",
    ghost: "text-[var(--muted)] hover:text-[var(--ink)] rounded-[var(--r-full)]",
    danger: "bg-[var(--danger)] text-white font-medium hover:brightness-110 rounded-[var(--r-full)]",
  };
  const sizes: Record<Size, string> = {
    sm: "px-3.5 py-1.5 text-[13px]",
    md: "px-4 py-2.5 text-[14px]",
    lg: "px-5 py-3 text-[15px]",
  };
  return cn(
    "inline-flex items-center justify-center gap-2 transition disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={btnClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <Link href={href} className={btnClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Numbers                                                                     */
/* -------------------------------------------------------------------------- */

/** Counts up on first paint — a score should feel arrived at, not printed. */
export function AnimatedNumber({
  value,
  duration = 900,
  className,
}: {
  value: number | null | undefined;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, value]);

  if (value == null || !Number.isFinite(value)) return <span className={className}>—</span>;
  return <span className={cn("fv-num", className)}>{shown}</span>;
}

/** A metric, stated as type rather than boxed in a tile. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div
        className={cn(
          "mt-1 fv-display fv-num text-[1.45rem]",
          tone === "accent" ? "text-[var(--accent)]" : "text-[var(--ink)]",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

export function DeltaBadge({ value, suffix = "%", good }: { value: number; suffix?: string; good?: boolean }) {
  const positive = good ?? value >= 0;
  return (
    <span
      className={cn(
        "fv-num text-[12px] font-medium",
        positive ? "text-[var(--emerald)]" : "text-[var(--danger)]",
      )}
    >
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

/** Before → after, stated as one line of type. */
export function BeforeAfter({
  label,
  from,
  to,
  unit,
  improvedPct,
}: {
  label: string;
  from: number | string;
  to: number | string;
  unit?: string;
  improvedPct?: number;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
        <span className="fv-num text-[15px] text-[var(--faint)]">
          {from}
          {unit ? ` ${unit}` : ""}
        </span>
        <span aria-hidden className="text-[var(--faint)]">
          →
        </span>
        <span className="fv-display fv-num text-[1.6rem]">
          {to}
          {unit ? ` ${unit}` : ""}
        </span>
        {improvedPct != null && improvedPct !== 0 && (
          <DeltaBadge value={Math.abs(improvedPct)} good={improvedPct > 0} suffix={improvedPct > 0 ? "% better" : "% off"} />
        )}
      </div>
    </div>
  );
}

export function Meter({ value, max = 100, tone = "accent" }: { value: number; max?: number; tone?: "accent" | "quiet" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-[var(--r-full)] bg-[rgba(244,243,251,0.06)]">
      <div
        className={cn(
          "h-full rounded-[var(--r-full)] transition-[width] duration-700",
          tone === "accent" ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Coaching blocks                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What we noticed → why it matters → what to do. Unboxed: the sentence is the
 * interface, and the action sits directly under it.
 */
export function InsightCard({
  eyebrow = "Your biggest opportunity",
  title,
  why,
  action,
  secondary,
  meta,
}: {
  eyebrow?: string;
  title: string;
  why?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className="fv-enter space-y-4">
      <p className="fv-eyebrow">{eyebrow}</p>
      <h2 className="fv-lede">{title}</h2>
      {why && <p className="max-w-2xl text-[14.5px] leading-relaxed text-[var(--ink-dim)]">{why}</p>}
      {meta}
      {(action || secondary) && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {action}
          {secondary}
        </div>
      )}
    </section>
  );
}

export function NextStep({
  title,
  body,
  href,
  cta,
  onClick,
}: {
  title: string;
  body?: string;
  href?: string;
  cta: string;
  onClick?: () => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-5">
      <div className="min-w-0">
        <p className="fv-eyebrow-quiet">Your next step</p>
        <h3 className="mt-1.5 fv-display text-[1.1rem]">{title}</h3>
        {body && <p className="mt-1 text-[13px] text-[var(--muted)]">{body}</p>}
      </div>
      {href ? <HeroLink href={href}>{cta}</HeroLink> : <HeroButton onClick={onClick}>{cta}</HeroButton>}
    </section>
  );
}

export function Steps({ items, className }: { items: string[]; className?: string }) {
  return (
    <ol className={cn("space-y-3", className)}>
      {items.map((text, i) => (
        <li key={i} className="flex gap-3.5 text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
          <span className="fv-num mt-px w-4 shrink-0 text-[12px] text-[var(--accent)]">{i + 1}</span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Progressive disclosure                                                      */
/* -------------------------------------------------------------------------- */

export function Disclosure({
  label,
  children,
  sub,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  sub?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--line)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span>
          <span className="text-[14px] font-medium text-[var(--ink-dim)]">{label}</span>
          {sub && <span className="mt-0.5 block text-[12px] text-[var(--muted)]">{sub}</span>}
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-[var(--muted)] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && <div className="fv-enter space-y-8 pb-8">{children}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Choice controls                                                             */
/* -------------------------------------------------------------------------- */

export function Chip({
  children,
  selected,
  onClick,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-[var(--r-full)] px-3.5 py-1.5 text-[13px] transition",
        selected
          ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
          : "text-[var(--muted)] hover:bg-[rgba(244,243,251,0.05)] hover:text-[var(--ink)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ChoiceCard({
  title,
  blurb,
  selected,
  onClick,
  icon,
}: {
  title: string;
  blurb?: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "fv-lift rounded-[var(--r-md)] p-4 text-left",
        selected
          ? "bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
          : "bg-[rgba(244,243,251,0.03)]",
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[14px] font-medium">{title}</span>
      </div>
      {blurb && <p className="mt-1 text-[12.5px] leading-snug text-[var(--muted)]">{blurb}</p>}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="fv-enter py-14 text-center">
      {icon && <div className="mx-auto mb-4 flex justify-center text-[var(--accent)]">{icon}</div>}
      <h3 className="fv-display text-[1.2rem]">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--muted)]">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-5 py-8" role="status" aria-live="polite">
      <p className="text-[13px] text-[var(--muted)]">{label}</p>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-[var(--r-md)] bg-[rgba(244,243,251,0.04)]"
            style={{ opacity: 1 - i * 0.28 }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorBanner({ message, hint }: { message: string; hint?: string }) {
  return (
    <div
      role="alert"
      className="rounded-[var(--r-md)] bg-[var(--danger-soft)] px-4 py-3 text-[13.5px] text-[var(--danger)]"
    >
      {message}
      {hint && <p className="mt-1 text-[12px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function EstimateNote({ children }: { children: ReactNode }) {
  return <p className="text-[11.5px] leading-relaxed text-[var(--faint)]">{children}</p>;
}
