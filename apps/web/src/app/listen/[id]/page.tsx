"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  AnimatedNumber,
  Divider,
  ErrorBanner,
  HeroLink,
  LoadingState,
  Stat,
} from "@/components/ui";
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
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load this session"));
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [id]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState label="Opening this Listen session…" />;

  const summary = data.listening.summary;
  const conversations = data.conversations || [];
  const verdict = summary?.verdict;

  return (
    <div className="mx-auto max-w-2xl space-y-2 pt-4 md:pt-10">
      <Link
        href="/listen"
        className="fv-enter inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
      >
        <ArrowLeft size={14} /> Listen
      </Link>

      <header className="fv-enter pt-4">
        <p className="fv-eyebrow">Real conversations</p>
        <h1 className="mt-2 fv-display text-[1.9rem] md:text-[2.3rem]">
          {data.listening.title || "Work session"}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          {new Date(data.listening.created_at).toLocaleString()} · {conversations.length} conversation
          {conversations.length === 1 ? "" : "s"}
          {data.analyzing ? " · still analyzing" : ""}
        </p>
      </header>

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-6 pt-8 sm:grid-cols-4">
            <Stat label="Duration" value={summary.session_duration_label} />
            <Stat label="Conversations" value={summary.meaningful_conversations} />
            <Stat label="Speaking time" value={summary.speaking_time_label} />
            <Stat label="Average pace" value={summary.average_wpm ?? "—"} hint="WPM" tone="accent" />
          </div>

          <Divider />

          {verdict?.status === "ready" ? (
            <section className="fv-enter">
              <p className="fv-eyebrow">Founder Voice Verdict</p>
              <div className="mt-3 flex items-baseline gap-4">
                <AnimatedNumber
                  value={verdict.founder_voice_score ?? null}
                  className="fv-display text-[3rem] text-[var(--accent)]"
                />
                {verdict.exercise_score != null && (
                  <span className="fv-num text-[13px] text-[var(--muted)]">
                    controlled practice {verdict.exercise_score}
                  </span>
                )}
              </div>
              <h2 className="mt-4 fv-lede">{verdict.headline}</h2>
              {verdict.verdict && (
                <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--ink-dim)]">
                  {verdict.verdict}
                </p>
              )}
              {(verdict.insights || []).length > 0 && (
                <ul className="mt-5 space-y-1.5 text-[13.5px] text-[var(--muted)]">
                  {(verdict.insights || []).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="fv-enter">
              <p className="fv-eyebrow">Your verdict is waiting</p>
              <h2 className="mt-2 fv-lede">One drill away.</h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--ink-dim)]">
                Complete the recommended Lab with the same microphone. Comparing your real conversations
                against controlled practice is where the insight comes from.
              </p>
              <div className="mt-6">
                <HeroLink href="/trainer">Open recommended Lab</HeroLink>
              </div>
            </section>
          )}

          <Divider />

          <div className="grid gap-7 sm:grid-cols-2">
            <section className="fv-enter">
              <p className="fv-eyebrow-quiet mb-2">Most common weakness</p>
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
                {summary.most_common_weakness}
              </p>
            </section>
            <section className="fv-enter">
              <p className="fv-eyebrow-quiet mb-2">Highest-ROI fix</p>
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
                {summary.highest_roi_recommendation}
              </p>
            </section>
          </div>

          {(summary.lab_recs || []).length > 0 && (
            <>
              <Divider />
              <section className="fv-enter space-y-5">
                <p className="fv-eyebrow-quiet">Train what we heard</p>
                {(summary.lab_recs || []).slice(0, 2).map((lab) => (
                  <Link
                    key={lab.key}
                    href={`/trainer?lab=${encodeURIComponent(lab.key)}`}
                    className="group block"
                  >
                    <p className="text-[14.5px] leading-relaxed text-[var(--ink-dim)] transition-colors group-hover:text-[var(--ink)]">
                      {lab.sound || lab.why || lab.description}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-[var(--accent)]">
                      {lab.title}
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </section>
            </>
          )}
        </>
      )}

      <Divider />

      <section className="fv-enter">
        <p className="fv-eyebrow-quiet mb-4">Conversations</p>
        <div className="space-y-1">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/sessions/${c.id}`}
              className="fv-lift group -mx-3 flex flex-wrap items-baseline justify-between gap-4 rounded-[var(--r-md)] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-[14.5px]">{c.title}</p>
                <p className="mt-0.5 text-[12px] text-[var(--faint)]">
                  {new Date(c.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
                  {fmtTime(c.duration || 0)}
                  {c.status !== "ready" ? ` · ${c.status}` : ""}
                </p>
              </div>
              <span className="fv-num text-[13px] text-[var(--muted)]">
                {c.wpm != null ? `${Math.round(Number(c.wpm))} WPM` : "—"}
              </span>
            </Link>
          ))}
          {!conversations.length && (
            <p className="text-[13px] text-[var(--muted)]">
              No conversations were captured in this session.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
