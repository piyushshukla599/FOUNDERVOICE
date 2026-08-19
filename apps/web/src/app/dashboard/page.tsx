"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AnimatedNumber,
  Chip,
  Disclosure,
  Divider,
  EmptyState,
  ErrorBanner,
  EstimateNote,
  HeroLink,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { FeatureIntro } from "@/components/FeatureIntro";
import { api, type DashboardData } from "@/lib/api";
import { founderVoiceScore } from "@/lib/founderScore";
import { memoryDigest } from "@/lib/insight";

const WINDOWS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "60d", label: "60 days" },
] as const;

export default function ProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [win, setWin] = useState<(typeof WINDOWS)[number]["key"]>("7d");

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your trend"));
  }, []);

  const digest = useMemo(() => memoryDigest(data), [data]);

  const scoreFor = (key: string) => {
    const w = data?.windows?.[key] || {};
    if (w.clarity == null && w.wpm == null) return null;
    return founderVoiceScore({
      clarity: w.clarity,
      executive_presence: w.executive_presence,
      confidence_est: w.confidence_est,
      pause_quality: w.pause_quality,
      filler_rate: w.filler_rate,
      wpm: w.wpm,
    });
  };

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState label="Reading your trend…" />;

  const current = scoreFor(win);
  const baseline = scoreFor(win === "7d" ? "30d" : "60d");
  const delta = current != null && baseline != null ? current - baseline : null;
  const series = (data.series || []).map((r) => ({
    ...r,
    label: String(r.created_at || "").slice(5, 10),
  }));
  const w = data.windows?.[win] || {};

  if (!series.length) {
    return (
      <div className="mx-auto max-w-2xl pt-4 md:pt-10">
        <PageHeader eyebrow="Progress" title="Am I actually getting better?" />
        <EmptyState
          title="Three sessions and this opens up"
          body="Trends need a few recordings before they mean anything. We would rather show you nothing than a line drawn through one point."
          action={<HeroLink href="/">Record a session</HeroLink>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-2 pt-4 md:pt-10">
      <PageHeader eyebrow="Progress" title="Am I actually getting better?" />

      <FeatureIntro
        id="intro-progress"
        title="Progress shows what is changing over time."
        body="Not how you did once — the direction across weeks. Everything here is measured against your own history, never a benchmark."
      />

      <div className="flex gap-1.5 pt-2">
        {WINDOWS.map((o) => (
          <Chip key={o.key} selected={win === o.key} onClick={() => setWin(o.key)}>
            {o.label}
          </Chip>
        ))}
      </div>

      {/* The headline number. */}
      <section className="fv-enter pt-8">
        <p className="fv-eyebrow-quiet">Founder Voice · {WINDOWS.find((x) => x.key === win)?.label}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-4">
          <AnimatedNumber value={current} duration={1200} className="fv-display fv-grad-text text-[3.4rem]" />
          {delta != null && delta !== 0 && (
            <span
              className={`fv-num text-[14px] ${
                delta > 0 ? "text-[var(--emerald)]" : "text-[var(--danger)]"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta} vs your longer average
            </span>
          )}
        </div>
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          {w.sessions ?? 0} session{w.sessions === 1 ? "" : "s"} in this window.
        </p>
      </section>

      <Divider />

      {/* What is moving, in words first. */}
      <div className="grid gap-8 pt-2 sm:grid-cols-2">
        <section className="fv-enter">
          <p className="fv-eyebrow-quiet mb-3">Improving</p>
          {digest.improving.length ? (
            <ul className="space-y-2 text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
              {digest.improving.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted)]">
              Nothing has moved far enough to call it a trend yet.
            </p>
          )}
        </section>

        <section className="fv-enter">
          <p className="fv-eyebrow-quiet mb-3">Recurring</p>
          {digest.recurring.length ? (
            <ul className="space-y-2 text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
              {digest.recurring.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted)]">
              No habit has repeated often enough to name.
            </p>
          )}
        </section>
      </div>

      {digest.attention.length > 0 && (
        <>
          <Divider />
          <section className="fv-enter">
            <p className="fv-eyebrow-quiet mb-3">What to work on next</p>
            <p className="fv-display max-w-xl text-[1.2rem] leading-snug">{digest.attention[0]}</p>
            <div className="mt-6">
              <HeroLink href="/trainer">Practice now</HeroLink>
            </div>
          </section>
        </>
      )}

      {(data.insights || []).length > 0 && (
        <>
          <Divider />
          <section className="fv-enter">
            <p className="fv-eyebrow-quiet mb-3">What Voice Memory has noticed</p>
            <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
              {data.insights.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="pt-6">
        <Disclosure label="The charts" sub="Pace, fillers and clarity across your sessions.">
          <section>
            <p className="fv-eyebrow-quiet mb-4">Speaking pace</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(244,243,251,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#5c5b74" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5c5b74" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#141726",
                      border: "1px solid rgba(244,243,251,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="wpm" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <p className="fv-eyebrow-quiet mb-4">Fillers and clarity</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(244,243,251,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#5c5b74" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5c5b74" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#141726",
                      border: "1px solid rgba(244,243,251,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="filler_count" stroke="#e056a0" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clarity" stroke="#3fd69a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <EstimateNote>
            Every figure here is an estimate from your own recordings. Trust the direction, not the
            decimal.
          </EstimateNote>
        </Disclosure>
      </div>

      <div className="pt-6">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
        >
          Browse the sessions behind these numbers <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
