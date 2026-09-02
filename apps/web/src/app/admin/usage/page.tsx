"use client";

/**
 * The usage dashboard.
 *
 * One honest caveat sits at the top of this page rather than buried in a
 * tooltip: **the app has no accounts**, so there are no sign-ups to count. A
 * "visitor" here is a workspace - a random token in a cookie that owns one
 * database. It is the closest thing to a person that exists, and it is weaker
 * than one: clearing cookies makes a new visitor, two browsers on one desk are
 * two, and a shared laptop is one. Every number below inherits that, and a
 * dashboard that quietly called these "users" would be lying in a chart.
 *
 * The token is held in this tab only. It is not written to storage, because a
 * key that reads every visitor's aggregate should not outlive the tab it was
 * typed into.
 */

import { useCallback, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { Button, ErrorBanner, PageHeader, Panel, SectionTitle } from "@/components/ui";

type Overview = {
  generated_at: string;
  window_days: number;
  visitors: {
    total: number;
    new_today: number;
    new_this_week: number;
    new_this_month: number;
    active_today: number;
    active_this_week: number;
    active_this_month: number;
    per_day: { day: string; count: number }[];
  };
  recordings: {
    total: number;
    failed: number;
    total_minutes: number;
    avg_seconds: number;
    longest: { category: string; duration: number; created_at: string } | null;
    per_day: { day: string; count: number; visitors: number }[];
  };
  categories: { category: string; count: number; minutes: number; avg_seconds: number }[];
  pages: { path: string; views: number; minutes: number; visitors: number; avg_seconds: number }[];
  features: { feature: string; used: number; buckets: number }[];
};

function clock(seconds: number): string {
  const whole = Math.round(seconds);
  if (whole < 60) return `${whole}s`;
  const mins = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${mins}m ${rest}s` : `${mins}m`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="fv-num mt-1 text-[1.6rem] leading-none text-[var(--ink)]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

/** A bar chart with no chart library: the widest row sets the scale. */
function Bars({
  rows,
  labelOf,
  valueOf,
  caption,
}: {
  rows: Record<string, unknown>[];
  labelOf: (row: never) => string;
  valueOf: (row: never) => number;
  caption?: string;
}) {
  const peak = Math.max(1, ...rows.map((r) => valueOf(r as never)));
  if (!rows.length) {
    return <p className="text-[13px] text-[var(--muted)]">Nothing recorded in this window yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => {
        const value = valueOf(row as never);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-[12px] text-[var(--muted)]">
              {labelOf(row as never)}
            </span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-[var(--r-full)] bg-[var(--bg)]">
              <span
                className="absolute inset-y-0 left-0 rounded-[var(--r-full)] bg-[var(--accent)]"
                style={{ width: `${Math.max(2, (value / peak) * 100)}%` }}
              />
            </span>
            <span className="fv-num w-16 shrink-0 text-right text-[12px] text-[var(--ink)]">
              {value}
            </span>
          </div>
        );
      })}
      {caption && <p className="pt-1 text-[11px] text-[var(--muted)]">{caption}</p>}
    </div>
  );
}

export default function UsagePage() {
  const [token, setToken] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (withToken: string, window: number) => {
      if (!withToken.trim()) {
        setError("Enter the admin token this server was started with.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl(`/api/analytics/overview?days=${window}`), {
          credentials: "include",
          cache: "no-store",
          headers: { "X-Admin-Token": withToken.trim() },
        });
        if (res.status === 404) {
          setError(
            "Rejected. Either the token is wrong, or ADMIN_TOKEN is not set on the API — it 404s in both cases on purpose.",
          );
          setData(null);
          return;
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        setData((await res.json()) as Overview);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the report.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Usage"
        sub="Recordings, visitors and pages across every workspace on this install."
      />

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[240px] space-y-1">
            <span className="text-[12px] text-[var(--muted)]">Admin token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load(token, days)}
              placeholder="ADMIN_TOKEN"
              className="w-full rounded-[var(--r-full)] border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent-line)]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px] text-[var(--muted)]">Window</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-[var(--r-full)] border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-[13px] text-[var(--ink)] outline-none"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </label>
          <Button onClick={() => void load(token, days)} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Load
          </Button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
          The token is kept in this tab only, never in storage. Start the API with{" "}
          <code className="rounded bg-[var(--bg)] px-1">ADMIN_TOKEN=…</code> to enable this.
        </p>
      </Panel>

      {error && <ErrorBanner message={error} />}

      {data && (
        <>
          <Panel tone="accent">
            <p className="text-[13px] leading-relaxed text-[var(--ink)]">
              <strong>There are no accounts in this app, so nobody signs up.</strong> A “visitor” below
              is a workspace — a random token in a cookie that owns one database. Clearing cookies
              makes a new visitor, two browsers on one desk count as two, and a shared laptop counts
              as one. It is the closest thing to a person the data actually contains.
            </p>
          </Panel>

          <section className="space-y-3">
            <SectionTitle title="Visitors" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="All time" value={String(data.visitors.total)} hint="workspaces ever seen" />
              <Stat
                label="New today"
                value={String(data.visitors.new_today)}
                hint={`${data.visitors.new_this_week} this week · ${data.visitors.new_this_month} this month`}
              />
              <Stat
                label="Active today"
                value={String(data.visitors.active_today)}
                hint={`${data.visitors.active_this_week} this week · ${data.visitors.active_this_month} this month`}
              />
              <Stat
                label="Recordings"
                value={String(data.recordings.total)}
                hint={`${data.recordings.failed} failed analysis`}
              />
            </div>
            <Panel>
              <Bars
                rows={data.visitors.per_day}
                labelOf={(r: { day: string }) => r.day}
                valueOf={(r: { count: number }) => r.count}
                caption="First time each visitor was seen, by day."
              />
            </Panel>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Recording" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total time" value={`${data.recordings.total_minutes}m`} hint="audio captured" />
              <Stat label="Average take" value={clock(data.recordings.avg_seconds)} />
              <Stat
                label="Longest take"
                value={data.recordings.longest ? clock(data.recordings.longest.duration) : "—"}
                hint={data.recordings.longest?.category}
              />
              <Stat
                label="Busiest day"
                value={String(
                  data.recordings.per_day.reduce((max, d) => Math.max(max, d.count), 0),
                )}
                hint="recordings in one day"
              />
            </div>
            <Panel>
              <Bars
                rows={data.recordings.per_day}
                labelOf={(r: { day: string }) => r.day}
                valueOf={(r: { count: number }) => r.count}
                caption="Recordings per day."
              />
            </Panel>
          </section>

          <section className="space-y-3">
            <SectionTitle title="What they practise" />
            <Panel>
              <Bars
                rows={data.categories.slice(0, 15)}
                labelOf={(r: { category: string }) => r.category}
                valueOf={(r: { count: number }) => r.count}
                caption="Takes per category, most used first. Time spent is in the table below."
              />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="text-[var(--muted)]">
                    <tr>
                      <th className="py-1 pr-4 font-normal">Category</th>
                      <th className="py-1 pr-4 font-normal">Takes</th>
                      <th className="py-1 pr-4 font-normal">Minutes</th>
                      <th className="py-1 font-normal">Average</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--ink)]">
                    {data.categories.slice(0, 15).map((c) => (
                      <tr key={c.category} className="border-t border-[var(--line)]">
                        <td className="py-1.5 pr-4">{c.category}</td>
                        <td className="fv-num py-1.5 pr-4">{c.count}</td>
                        <td className="fv-num py-1.5 pr-4">{c.minutes}</td>
                        <td className="fv-num py-1.5">{clock(c.avg_seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Pages" />
            <Panel>
              {data.pages.length === 0 ? (
                <p className="text-[13px] leading-relaxed text-[var(--muted)]">
                  No page data yet. Views and time-on-page start being recorded from the first visit
                  after this build shipped, so this fills in from today rather than backfilling.
                </p>
              ) : (
                <>
                  <Bars
                    rows={data.pages.slice(0, 15)}
                    labelOf={(r: { path: string }) => r.path}
                    valueOf={(r: { views: number }) => r.views}
                    caption="Views per page."
                  />
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead className="text-[var(--muted)]">
                        <tr>
                          <th className="py-1 pr-4 font-normal">Path</th>
                          <th className="py-1 pr-4 font-normal">Views</th>
                          <th className="py-1 pr-4 font-normal">Visitors</th>
                          <th className="py-1 pr-4 font-normal">Total time</th>
                          <th className="py-1 font-normal">Avg time</th>
                        </tr>
                      </thead>
                      <tbody className="text-[var(--ink)]">
                        {data.pages.slice(0, 20).map((p) => (
                          <tr key={p.path} className="border-t border-[var(--line)]">
                            <td className="py-1.5 pr-4">{p.path}</td>
                            <td className="fv-num py-1.5 pr-4">{p.views}</td>
                            <td className="fv-num py-1.5 pr-4">{p.visitors}</td>
                            <td className="fv-num py-1.5 pr-4">{p.minutes}m</td>
                            <td className="fv-num py-1.5">{clock(p.avg_seconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>
          </section>

          {data.features.length > 0 && (
            <section className="space-y-3">
              <SectionTitle title="Features used" />
              <Panel>
                <Bars
                  rows={data.features}
                  labelOf={(r: { feature: string }) => r.feature}
                  valueOf={(r: { used: number }) => r.used}
                  caption="From the quota counters, which are keyed by network address rather than by workspace — so this counts differently from the numbers above."
                />
              </Panel>
            </section>
          )}

          <p className="text-[11px] text-[var(--muted)]">
            Generated {new Date(data.generated_at).toLocaleString()} · window {data.window_days} days
          </p>
        </>
      )}
    </div>
  );
}
