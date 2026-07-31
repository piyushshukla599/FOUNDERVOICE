"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Panel, Stat, LoadingState, ErrorBanner, EmptyState } from "@/components/ui";
import { api, type DashboardData } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState label="Loading dashboard…" />;

  const w7 = data.windows["7d"] || {};
  const w30 = data.windows["30d"] || {};
  const w60 = data.windows["60d"] || {};
  const series = (data.series || []).map((r) => ({
    ...r,
    label: String(r.created_at || "").slice(5, 10),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-[family-name:var(--font-display)] text-4xl">Weekly improvement</h2>
        <p className="mt-2 text-[var(--muted)]">
          Voice Memory trends across 7 / 30 / 60 days. Estimates only — trust the pattern, not fake precision.
        </p>
      </header>

      {!series.length && (
        <EmptyState
          title="No trend data yet"
          body="Analyze a few recordings and your WPM, clarity, and patterns will chart here."
          action={
            <Link href="/" className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white">
              Record a session
            </Link>
          }
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="7d WPM" value={String(w7.wpm ?? "—")} hint={`${w7.sessions ?? 0} sessions`} />
        <Stat label="30d clarity" value={String(w30.clarity ?? "—")} hint={`${w30.sessions ?? 0} sessions`} />
        <Stat label="60d confidence" value={String(w60.confidence_est ?? "—")} hint={`${w60.sessions ?? 0} sessions`} />
      </div>

      {(data.insights || []).length > 0 && (
        <Panel>
          <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl">Insights</h3>
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            {data.insights.map((i, idx) => (
              <li key={idx}>• {i}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="h-80">
        <h3 className="mb-4 font-[family-name:var(--font-display)] text-xl">Speaking speed</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={series}>
            <CartesianGrid stroke="#2a3530" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#8fa094" />
            <YAxis stroke="#8fa094" />
            <Tooltip contentStyle={{ background: "#171e1a", border: "1px solid #2a3530" }} />
            <Line type="monotone" dataKey="wpm" stroke="#c4a35a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="h-72">
          <h3 className="mb-4 font-[family-name:var(--font-display)] text-xl">Fillers & clarity</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={series}>
              <CartesianGrid stroke="#2a3530" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8fa094" />
              <YAxis stroke="#8fa094" />
              <Tooltip contentStyle={{ background: "#171e1a", border: "1px solid #2a3530" }} />
              <Line type="monotone" dataKey="filler_count" stroke="#c45c4a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clarity" stroke="#3d8f6e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel>
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Recurring patterns</h3>
          <div className="space-y-3">
            {(data.top_patterns || []).map((p) => (
              <div key={p.key} className="rounded-xl border border-[var(--line)] p-3">
                <div className="font-medium">{p.label}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Seen {p.frequency}× · trend {p.trend > 0 ? "+" : ""}
                  {(p.trend * 100).toFixed(0)}%
                </div>
              </div>
            ))}
            {!data.top_patterns?.length && (
              <p className="text-sm text-[var(--muted)]">Patterns appear after a few analyzed sessions.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
