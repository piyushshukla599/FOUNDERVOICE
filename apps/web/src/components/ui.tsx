"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "rounded-2xl border border-[var(--line)] bg-[rgba(23,30,26,0.72)] p-5 backdrop-blur",
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel className="text-center">
      <h3 className="font-[family-name:var(--font-display)] text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Panel>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[rgba(196,92,74,0.45)] bg-[rgba(196,92,74,0.1)] px-4 py-3 text-sm text-[var(--danger)]"
    >
      {message}
    </div>
  );
}
