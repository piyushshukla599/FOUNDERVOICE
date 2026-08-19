"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, Download, Headphones, Play } from "lucide-react";
import {
  BeforeAfter,
  Button,
  Disclosure,
  EstimateNote,
  ErrorBanner,
  InsightCard,
  LinkButton,
  LoadingState,
  SectionTitle,
  Stat,
  Steps,
} from "@/components/ui";
import { CoachSummary } from "@/components/CoachSummary";
import { SessionTimeline } from "@/components/SessionTimeline";
import { ProfessionalVoiceReport, RootCauseFinding } from "@/components/ProfessionalVoiceReport";
import { RecommendedLabs } from "@/components/RecommendedLabs";
import { api, apiUrl, type Finding, type SessionDetail, type SessionRow } from "@/lib/api";
import { compareSessions, num, sessionOpportunity, sessionStrength } from "@/lib/insight";
import { fmtTime } from "@/lib/utils";

export default function SessionPageRoute() {
  return (
    <Suspense fallback={<LoadingState label="Opening your report…" />}>
      <SessionPage />
    </Suspense>
  );
}

function SessionPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params.id;
  const isFirstEver = search.get("first") === "1";

  const [data, setData] = useState<SessionDetail | null>(null);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeStart, setActiveStart] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const d = await api.session(id);
        if (!alive) return;
        setData(d);
        if (d.session.status === "pending" || d.session.status === "analyzing") {
          setTimeout(tick, 2500);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load this session");
      }
    };
    void tick();
    api
      .sessions()
      .then((rows) => alive && setHistory(rows))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);

  const eventsBySentence = useMemo(() => {
    const map = new Map<number, Finding[]>();
    const sentences = data?.session.transcript?.sentences || [];
    for (const e of data?.events || []) {
      const idx = sentences.findIndex((s) => e.start >= s.start && e.start <= s.end);
      if (idx >= 0) map.set(idx, [...(map.get(idx) || []), e]);
    }
    return map;
  }, [data]);

  /* The comparison baseline: the previous take of the same kind of work.
     Declared before any early return so hook order never changes. */
  const previous = useMemo(() => {
    const current = data?.session;
    if (!current) return null;
    const mine = history.filter(
      (s) =>
        s.id !== id &&
        s.status === "ready" &&
        new Date(s.created_at) < new Date(current.created_at),
    );
    if (current.mode === "exercise" && current.exercise_key) {
      const sameDrill = mine.find((s) => s.exercise_key === current.exercise_key);
      if (sameDrill) return sameDrill;
    }
    return mine.find((s) => s.mode === current.mode) || mine[0] || null;
  }, [data?.session, history, id]);

  const playAt = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, t);
    void a.play();
    setActiveStart(t);
    a.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState label="Opening your report…" />;

  const session = data.session;
  const m = (data.metrics || {}) as Record<string, unknown>;
  const status = session.status;
  const isLab = session.mode === "exercise";
  const isPractice = session.mode === "practice";
  const isListenClip = session.mode === "listening";
  const analyzing = status === "pending" || status === "analyzing";


  const comparisons = compareSessions(m, previous);
  const opportunity = sessionOpportunity(m, data.events);
  const strength = sessionStrength(m);
  const topLab = (data.lab_recs || [])[0];
  const labHref = topLab ? `/trainer?lab=${encodeURIComponent(topLab.key)}` : "/trainer";

  /* --------------------------------------------------------------- header */
  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="fv-eyebrow">
          {isLab ? "Lab result" : isPractice ? "Practice answer" : isListenClip ? "Conversation" : "Session report"}
        </p>
        <h1 className="mt-1 fv-display text-2xl md:text-3xl">{session.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          {new Date(session.created_at).toLocaleString()} · {fmtTime(session.duration || 0)}
          {analyzing ? " · analyzing" : ""}
        </p>
      </div>
      {!analyzing && (
        <a href={apiUrl(`/api/sessions/${id}/report`)} className="inline-flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-strong)] px-3 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
          <Download size={14} /> PDF
        </a>
      )}
    </header>
  );

  /* ------------------------------------------------------------- analyzing */
  if (analyzing) {
    return (
      <div className="space-y-5">
        {header}
        <section className="fv-enter fv-halo space-y-4 py-8 text-center">
          <h2 className="fv-display text-[1.3rem]">Analyzing your communication…</h2>
          <Steps
            items={[
              "Transcribing on this machine with Whisper.",
              "Measuring pace, pauses, clarity and voice quality.",
              "Writing the coaching note from what it found.",
            ]}
          />
          <p className="text-[12px] text-[var(--faint)]">
            This page updates itself — no need to reload.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {session.error && <ErrorBanner message={`Analysis error: ${session.error}`} />}
      {session.transcript?.warning && (
        <p className="text-[13px] text-[var(--warn)]">{session.transcript.warning}</p>
      )}

      {isFirstEver && (
        <section className="fv-enter space-y-1">
          <p className="fv-eyebrow">Here&apos;s what we noticed</p>
          <p className="text-[13px] text-[var(--muted)]">
            We&apos;re showing one thing, not forty. The rest is under detailed analysis whenever you
            want it.
          </p>
        </section>
      )}

      {/* 1 — The one thing worth acting on. */}
      {opportunity ? (
        <InsightCard
          eyebrow={isLab ? "What this drill showed" : "Your biggest opportunity"}
          title={opportunity.title}
          why={opportunity.why}
          action={
            <LinkButton href={labHref}>
              <Play size={15} /> Practice this
            </LinkButton>
          }
          secondary={
            opportunity.at != null ? (
              <Button variant="secondary" onClick={() => playAt(opportunity.at!)}>
                <Headphones size={15} /> Listen to the moment
              </Button>
            ) : undefined
          }
          meta={
            <p className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[13px] leading-relaxed">
              <span className="text-[var(--emerald)]">How to fix it: </span>
              {opportunity.fix}
              {opportunity.exercise ? ` (${opportunity.exercise})` : ""}
            </p>
          }
        />
      ) : (
        <section className="fv-enter fv-halo py-4">
          <p className="fv-eyebrow">What your recording showed</p>
          <h2 className="mt-1 fv-display text-2xl">Nothing is standing out as a problem here.</h2>
          <p className="mt-2 text-[14px] text-[var(--ink-dim)]">
            Keep recording — patterns need a few sessions before we can name one honestly.
          </p>
        </section>
      )}

      {strength && (
        <p className="text-[13px] text-[var(--emerald)]">What worked: {strength}</p>
      )}

      {/* 2 — Did anything actually change since last time? */}
      {comparisons.length > 0 && (
        <section>
          <SectionTitle
            eyebrow={isLab ? "Same drill, last time" : "Compared with your previous session"}
            title={
              comparisons[0].improvedPct > 0
                ? `${comparisons[0].label} improved ${Math.abs(comparisons[0].improvedPct)}%`
                : `${comparisons[0].label} slipped ${Math.abs(comparisons[0].improvedPct)}%`
            }
            sub={previous ? `Versus “${previous.title}”.` : undefined}
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.slice(0, 3).map((c) => (
              <BeforeAfter
                key={c.key}
                label={c.label}
                from={Math.round(c.from)}
                to={Math.round(c.to)}
                unit={c.unit}
                improvedPct={c.improvedPct}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3 — Evidence: the audio, the timeline, then the words. */}
      <section className="fv-enter space-y-6 pt-2">
        <SessionTimeline
          duration={session.duration || 0}
          events={data.events}
          onSeek={playAt}
          activeStart={activeStart}
        />
        <audio ref={audioRef} controls className="w-full" src={apiUrl(`/api/sessions/${id}/audio`)} />
        <SectionTitle
          eyebrow="Transcript"
          title="Read along"
          sub="Click any line to jump to that moment."
        />
        <div className="fv-scroll max-h-[340px] space-y-2 pr-1">
          {(session.transcript?.sentences || []).map((s, i) => {
            const findings = eventsBySentence.get(i) || [];
            const hot = findings.length > 0;
            return (
              <button
                key={`${s.start}-${i}`}
                onClick={() => playAt(s.start)}
                className={`block w-full rounded-[var(--r-md)] border px-3 py-2 text-left text-[13.5px] transition ${
                  activeStart === s.start
                    ? "bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
                    : hot
                      ? "border-[var(--accent-line)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] hover:border-[var(--line-strong)]"
                }`}
              >
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  {fmtTime(s.start)} · confidence {(s.confidence * 100).toFixed(0)}%
                </div>
                <div>{s.text}</div>
                {findings.slice(0, 2).map((f, fi) => (
                  <div key={fi} className="mt-1.5 text-[12px] text-[var(--accent)]">
                    {f.label}
                  </div>
                ))}
              </button>
            );
          })}
          {!(session.transcript?.sentences || []).length && (
            <p className="text-[13px] text-[var(--muted)]">
              No transcript for this recording — the audio may have been too quiet to read.
            </p>
          )}
        </div>
      </section>

      {/* 4 — Root cause, in three short beats. */}
      {opportunity?.event && (
        <section className="fv-enter space-y-4">
          <SectionTitle eyebrow="Root cause" title="What happened, and why" />
          <dl className="space-y-3 text-[13.5px] leading-relaxed">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">What happened</dt>
              <dd className="mt-0.5">{opportunity.event.observation || opportunity.event.label}</dd>
            </div>
            {opportunity.event.cause && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Why it happened</dt>
                <dd className="mt-0.5">{opportunity.event.cause}</dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">How to fix it</dt>
              <dd className="mt-0.5 text-[var(--emerald)]">{opportunity.fix}</dd>
            </div>
          </dl>
          {opportunity.event.expected_improvement && (
            <EstimateNote>Expected if you fix it: {opportunity.event.expected_improvement}</EstimateNote>
          )}
        </section>
      )}

      {/* 5 — Your next practice. */}
      {topLab ? (
        <section className="fv-enter fv-halo space-y-4 py-4">
          <SectionTitle eyebrow="Your next practice" title={topLab.title} />
          {topLab.speak && (
            <div className="rounded-[var(--r-md)] border border-[var(--accent-line)] bg-[var(--bg)] px-4 py-3">
              <p className="fv-eyebrow">Speak this</p>
              <p className="mt-1 fv-display text-lg leading-snug">“{topLab.speak}”</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(topLab.how || topLab.fix_line) && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">How</p>
                <p className="mt-1 text-[13.5px] leading-relaxed">{topLab.how || topLab.fix_line}</p>
              </div>
            )}
            {(topLab.sense || topLab.why) && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Why</p>
                <p className="mt-1 text-[13.5px] leading-relaxed">{topLab.sense || topLab.why}</p>
              </div>
            )}
          </div>
          <LinkButton href={labHref}>
            Open Lab <ArrowRight size={15} />
          </LinkButton>
        </section>
      ) : (
        <RecommendedLabs items={data.lab_recs || []} heading="More labs like this" />
      )}

      {/* 6 — Everything else, on request. */}
      <Disclosure
        label="View detailed analysis"
        sub="Every metric, the professional voice report, and all findings."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="WPM" value={String(num(m, "wpm") ?? "—")} hint="Target 130–145" />
          <Stat label="Clarity" value={String(num(m, "clarity") ?? "—")} />
          <Stat label="Fillers" value={String(num(m, "filler_count") ?? "—")} />
          <Stat label="Pause quality" value={String(num(m, "pause_quality") ?? "—")} />
          {!isLab && (
            <>
              <Stat label="Confidence" value={String(num(m, "confidence_est") ?? "—")} />
              <Stat
                label="Presence"
                value={String(num(m, "executive_presence") ?? num(m, "ceo_presence") ?? "—")}
              />
              <Stat label="Trust" value={String(num(m, "founder_trust") ?? "—")} />
              <Stat label="Monotone" value={String(num(m, "monotone_score") ?? "—")} />
            </>
          )}
        </div>
        <EstimateNote>
          Presence, trust and confidence are model estimates from acoustic features — treat them as
          direction, not measurement.
        </EstimateNote>

        {session.coach_summary && (
          <div>
            <SectionTitle title="Coach notes" />
            <CoachSummary text={session.coach_summary} />
          </div>
        )}

        <div>
          <SectionTitle title={`All findings (${data.events.length})`} />
          <div className="fv-scroll max-h-[520px] space-y-3">
            {data.events.map((e, i) => (
              <RootCauseFinding key={i} event={e} onSeek={playAt} />
            ))}
            {!data.events.length && (
              <p className="text-[13px] text-[var(--muted)]">No individual findings in this take.</p>
            )}
          </div>
        </div>

        {!isLab && (
          <div>
            <SectionTitle title="Professional voice report" />
            <ProfessionalVoiceReport payload={(m.payload || null) as Record<string, unknown> | null} onSeek={playAt} />
          </div>
        )}

        {session.transcript?.text && (
          <div>
            <SectionTitle title="Full transcript" />
            <p className="fv-scroll max-h-64 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--ink-dim)]">
              {session.transcript.text}
            </p>
          </div>
        )}
      </Disclosure>

      <div className="space-y-1 text-[12px] text-[var(--muted)]">
        {isLab && (
          <p>
            A lab report covers the drill you chose. Other habits wait for their own lab — this is not a
            full founder verdict.
          </p>
        )}
        <p>
          This session is saved in your{" "}
          <Link href="/library" className="text-[var(--accent)]">
            Library
          </Link>{" "}
          and has updated Voice Memory.
        </p>
      </div>
    </div>
  );
}
