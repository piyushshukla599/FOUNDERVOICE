"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Chip, EmptyState, ErrorBanner, HeroLink, LoadingState, PageHeader } from "@/components/ui";
import { api, type SessionRow } from "@/lib/api";
import { modeLabel, relativeDay, sessionHeadline } from "@/lib/insight";
import { fmtTime } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "free", label: "Record" },
  { id: "exercise", label: "Labs" },
  { id: "practice", label: "Practice" },
  { id: "listening", label: "Listen" },
  { id: "pitch", label: "Pitch" },
] as const;

export default function LibraryPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  useEffect(() => {
    const load = () =>
      api
        .sessions()
        .then(setSessions)
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load sessions"));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const all = sessions || [];
    if (filter === "all") return all;
    if (filter === "free") return all.filter((s) => s.mode === "free" || !s.mode);
    return all.filter((s) => s.mode === filter);
  }, [sessions, filter]);

  /* Group by day so the list reads as a history, not a table. */
  const groups = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of visible) {
      const key = relativeDay(s.created_at) || "Earlier";
      map.set(key, [...(map.get(key) || []), s]);
    }
    return [...map.entries()];
  }, [visible]);

  if (!sessions && !error) return <LoadingState label="Opening your sessions…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-4 md:pt-8">
      <PageHeader
        eyebrow="Sessions"
        title="Everything you have recorded"
        sub="Each take kept its own analysis. Open one to hear the moment again."
      />

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {groups.map(([day, rows]) => (
        <section key={day} className="fv-enter space-y-1">
          <p className="fv-eyebrow-quiet pb-2">{day}</p>
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="fv-lift group -mx-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-[var(--r-md)] px-3 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-[15px] font-medium">{s.title}</span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--faint)]">
                    {modeLabel(s.mode)}
                  </span>
                  {s.status !== "ready" && (
                    <span className="text-[11px] text-[var(--accent)]">{s.status}</span>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
                  {sessionHeadline(s)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[var(--faint)]">
                <span className="fv-num">{fmtTime(s.duration || 0)}</span>
                <ArrowRight
                  size={14}
                  className="opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                />
              </div>
            </Link>
          ))}
        </section>
      ))}

      {!visible.length && !error && (
        <EmptyState
          title={sessions?.length ? "Nothing in this filter" : "Your sessions will appear here"}
          body={
            sessions?.length
              ? "Try All, or record something new."
              : "Record a pitch, finish a Lab, or start a Listen session. Every take lands here with its own analysis."
          }
          action={<HeroLink href="/today">Start your first recording</HeroLink>}
        />
      )}
    </div>
  );
}
