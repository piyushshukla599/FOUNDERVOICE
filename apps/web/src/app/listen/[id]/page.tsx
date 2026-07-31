"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Panel, Stat } from "@/components/ui";
import { api, type ListeningDetail } from "@/lib/api";
import { fmtTime } from "@/lib/utils";

export default function ListeningSessionDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [data, setData] = useState<ListeningDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = () =>
      api
        .listening(id)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [id]);

  const summary = data?.listening.summary;
  const conversations = data?.conversations || [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/listen" className="text-sm text-[var(--accent)] hover:underline">
          ← Smart Session
        </Link>
        <h2 className="font-[family-name:var(--font-display)] text-4xl">
          {data?.listening.title || "Listening session"}
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {data
            ? `${new Date(data.listening.created_at).toLocaleString()} · ${data.listening.status} · ${conversations.length} conversations`
            : "Loading…"}
        </p>
      </header>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {summary && (
        <Panel className="space-y-4">
          <h3 className="font-[family-name:var(--font-display)] text-2xl">Session Summary</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Duration" value={summary.session_duration_label} />
            <Stat label="Conversations" value={summary.meaningful_conversations} />
            <Stat label="Speaking Time" value={summary.speaking_time_label} />
            <Stat label="Avg WPM" value={summary.average_wpm ?? "—"} />
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--muted)]">Weakness</span>
              <br />
              {summary.most_common_weakness}
            </p>
            <p>
              <span className="text-[var(--muted)]">ROI tip</span>
              <br />
              {summary.highest_roi_recommendation}
            </p>
          </div>
        </Panel>
      )}

      <Panel>
        <h3 className="font-[family-name:var(--font-display)] text-2xl">Conversations</h3>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {conversations.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/sessions/${c.id}`} className="font-medium hover:text-[var(--accent)]">
                  {c.title}
                </Link>
                <div className="text-xs text-[var(--muted)]">
                  {new Date(c.created_at).toLocaleString()} · {fmtTime(c.duration || 0)} · {c.status}
                </div>
              </div>
              <div className="text-sm text-[var(--muted)]">
                {c.wpm != null ? `${Math.round(Number(c.wpm))} WPM` : "—"}
              </div>
            </li>
          ))}
          {!conversations.length && !error && (
            <li className="py-3 text-[var(--muted)]">No conversations in this session yet.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
