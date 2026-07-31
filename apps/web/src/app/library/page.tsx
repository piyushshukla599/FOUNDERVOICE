"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel, EmptyState, ErrorBanner } from "@/components/ui";
import { api, type SessionRow } from "@/lib/api";
import { fmtTime } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "free", label: "Record" },
  { id: "exercise", label: "Labs" },
  { id: "practice", label: "Practice" },
  { id: "listening", label: "Smart" },
  { id: "pitch", label: "Pitch" },
] as const;

function modeLabel(mode: string) {
  if (mode === "listening") return "Smart conversation";
  if (mode === "exercise") return "Labs drill";
  if (mode === "practice") return "Practice";
  if (mode === "free") return "Record";
  return mode;
}

export default function LibraryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const load = () =>
    api
      .sessions()
      .then(setSessions)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return sessions;
    if (filter === "free") return sessions.filter((s) => s.mode === "free" || !s.mode);
    return sessions.filter((s) => s.mode === filter);
  }, [sessions, filter]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-[family-name:var(--font-display)] text-4xl">Library</h2>
        <p className="mt-2 text-[var(--muted)]">
          Every Record, Labs, and Practice take gets the same full evaluation — each as its own
          session.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f.id
                ? "bg-[var(--accent)] text-[#1a1510]"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      <div className="grid gap-3">
        {visible.map((s) => (
          <Panel key={s.id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/sessions/${s.id}`} className="text-lg font-semibold hover:text-[var(--accent)]">
                  {s.title}
                </Link>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {new Date(s.created_at).toLocaleString()} · {modeLabel(s.mode)} ·{" "}
                  {fmtTime(s.duration || 0)} · {s.status}
                </div>
              </div>
              <div className="flex gap-4 text-sm text-[var(--muted)]">
                <span>WPM {s.wpm ?? "—"}</span>
                <span>Fillers {s.filler_count ?? "—"}</span>
                <span>Clarity {s.clarity ?? "—"}</span>
              </div>
            </div>
          </Panel>
        ))}
        {!visible.length && !error && (
          <EmptyState
            title={sessions.length ? "Nothing in this filter" : "No sessions yet"}
            body={
              sessions.length
                ? "Try All, or record a new session."
                : "Record a pitch, finish a Labs drill, or start a Smart Session — results land here."
            }
            action={
              <Link
                href="/"
                className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white"
              >
                Go to Record
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
