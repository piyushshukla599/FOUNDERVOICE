"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Download, Headphones, Play } from "lucide-react";
import {
  BeforeAfter,
  Button,
  Disclosure,
  EstimateNote,
  ErrorBanner,
  LinkButton,
  LoadingState,
  SectionTitle,
  Stat,
  Steps,
} from "@/components/ui";
import { AudioPlayer, type AudioHandle } from "@/components/AudioPlayer";
import { CoachSummary } from "@/components/CoachSummary";
import { SessionTimeline } from "@/components/SessionTimeline";
import { ProfessionalVoiceReport, RootCauseFinding } from "@/components/ProfessionalVoiceReport";
import { RecommendedLabs } from "@/components/RecommendedLabs";
import { MetricRange } from "@/components/MetricRange";
import { FillerBreakdown } from "@/components/FillerBreakdown";
import { api, apiUrl, type Finding, type SessionDetail, type SessionRow } from "@/lib/api";
import {
  compareSessions,
  num,
  primaryMetricFor,
  sessionOpportunity,
  sessionStrength,
} from "@/lib/insight";
import { fmtTime } from "@/lib/utils";

export default function SessionPageRoute() {
  return (
    <Suspense fallback={<LoadingState label="Opening your report…" shape="report" />}>
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
  const audioRef = useRef<AudioHandle>(null);
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);

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
    audioRef.current?.seek(t);
    setActiveStart(t);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState label="Opening your report…" shape="report" />;

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
  const primaryMetric = primaryMetricFor(m, opportunity, previous);

  /* The overview grid. Only dimensions with a real measured value appear; a
     metric the analyser did not produce is left out rather than rendered as a
     dash, and the headline metric is skipped here so it is not stated twice. */
  const fillerEvents = data.events.filter((e) => e.kind === "filler");
  const hasFillerData = num(m, "filler_count") != null;
  const performance = (
    [
      num(m, "wpm") != null && {
        label: "Pace",
        value: Math.round(num(m, "wpm")!),
        unit: "WPM",
        min: 80,
        max: 220,
        ideal: [130, 145] as [number, number],
        previous: previous?.wpm ?? null,
      },
      num(m, "clarity") != null && {
        label: "Clarity",
        value: Math.round(num(m, "clarity")!),
        unit: "/ 100",
        min: 0,
        max: 100,
        previous: previous?.clarity ?? null,
        goal: "higher" as const,
      },
      num(m, "pause_quality") != null && {
        label: "Pause quality",
        value: Math.round(num(m, "pause_quality")!),
        unit: "/ 100",
        min: 0,
        max: 100,
        goal: "higher" as const,
      },
      hasFillerData && {
        label: "Fillers",
        value: Math.round(num(m, "filler_count")!),
        min: 0,
        max: Math.max(20, Math.round(num(m, "filler_count")!) + 4),
        previous: previous?.filler_count ?? null,
        goal: "lower" as const,
      },
    ].filter(Boolean) as import("@/components/MetricRange").MetricRangeProps[]
  ).filter((x) => x.label !== primaryMetric?.label.replace("Your ", ""));
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
            This page updates itself. No need to reload.
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

      {/* ------------------------------------------------------------------
          1. INSIGHT -> EVIDENCE -> WHY -> COACHING -> PRACTICE.

          This block used to be a single InsightCard: title, why and fix all at
          one visual weight inside a box, with the practice button as a small
          trailing action. The order was right and the hierarchy was not, so a
          reader had to read all of it to find the one thing to do.

          Now the claim leads at display size, the measured evidence sits
          underneath it as a drawn range, and the fix is a section of its own
          ending in the practice CTA. Same data, same source - `opportunity` is
          still built by sessionOpportunity() from the real analysis.
      ------------------------------------------------------------------- */}
      {opportunity ? (
        <section className="fv-enter fv-halo space-y-8 py-4">
          <div>
            <p className="fv-eyebrow">{isLab ? "What this drill showed" : "Your biggest opportunity"}</p>
            <h2 className="fv-hero-lede mt-3 max-w-[20ch] text-balance">{opportunity.title}</h2>
          </div>

          {primaryMetric && (
            <MetricRange {...primaryMetric} className="max-w-md" />
          )}

          <div className="max-w-[62ch] space-y-2">
            <h3 className="text-[15px] font-medium text-[var(--ink)]">Why this matters</h3>
            <p className="text-[14.5px] leading-relaxed text-[var(--muted)]">{opportunity.why}</p>
          </div>

          <div className="max-w-[62ch] space-y-2 border-l-2 border-[var(--emerald)] pl-5">
            <h3 className="text-[15px] font-medium text-[var(--ink)]">Your next move</h3>
            <p className="text-[15px] leading-relaxed text-[var(--ink-dim)]">
              {opportunity.fix}
            </p>
            {opportunity.exercise && (
              <p className="fv-num text-[12px] text-[var(--faint)]">Drill: {opportunity.exercise}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href={labHref}>
              <Play size={15} aria-hidden /> Practice this
            </LinkButton>
            {opportunity.at != null && (
              <Button variant="secondary" onClick={() => playAt(opportunity.at!)}>
                <Headphones size={15} aria-hidden /> Hear the moment
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section className="fv-enter fv-halo py-4">
          <p className="fv-eyebrow">What your recording showed</p>
          <h2 className="fv-hero-lede mt-3 max-w-[20ch] text-balance">
            Nothing is standing out as a problem here.
          </h2>
          <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-[var(--muted)]">
            Keep recording. Patterns need a few sessions before we can name one honestly.
          </p>
        </section>
      )}

      {/* What worked. Never let a report be entirely negative. */}
      {strength && (
        <section className="fv-enter border-t border-[var(--line)] pt-6">
          <h2 className="fv-eyebrow-quiet">What worked</h2>
          <p className="mt-3 flex items-start gap-2.5 text-[14.5px] leading-relaxed text-[var(--ink-dim)]">
            <Check size={16} className="mt-0.5 shrink-0 text-[var(--emerald)]" aria-hidden />
            {strength}
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------------
          2. PERFORMANCE OVERVIEW.

          The dimensions that have real values, each drawn against what good
          looks like for that dimension rather than all forced into one card
          shape. A metric with no value is omitted rather than shown as an
          em dash, because a missing measurement is not a measurement of zero.
      ------------------------------------------------------------------- */}
      {performance.length > 0 && (
        <section className="fv-enter border-t border-[var(--line)] pt-8">
          <h2 className="text-[21px] leading-snug text-[var(--ink)]">Your performance</h2>
          <div className="mt-7 grid gap-x-12 gap-y-9 sm:grid-cols-2">
            {performance.map((p) => (
              <MetricRange key={p.label} {...p} />
            ))}
          </div>
        </section>
      )}

      {/* Fillers, by the phrase actually said, each one anchored in the audio.
          Carries the lexicon editor: this is where someone notices the word
          they overuse is not on the list. */}
      {(hasFillerData || fillerEvents.length > 0) && (
        <section className="fv-enter border-t border-[var(--line)] pt-8">
          <h2 className="text-[21px] leading-snug text-[var(--ink)]">Filler words</h2>
          <div className="mt-6 max-w-[62ch]">
            <FillerBreakdown events={data.events} onSeek={playAt} />
          </div>
        </section>
      )}

      {/* 3. Did anything actually change since last time? */}
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

      {/* 3. Evidence: the audio, the timeline, then the words. */}
      <section className="fv-enter space-y-6 pt-2">
        <SessionTimeline
          duration={session.duration || 0}
          events={data.events}
          onSeek={playAt}
          activeStart={activeStart}
          progress={playhead}
        />
        <div ref={playerRef}>
          <AudioPlayer
            ref={audioRef}
            src={apiUrl(`/api/sessions/${id}/audio`)}
            fallbackDuration={session.duration || 0}
            onProgress={setPlayhead}
          />
        </div>
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
              No transcript for this recording. The audio may have been too quiet to read.
            </p>
          )}
        </div>
      </section>

      {/* 4. Root cause, in three short beats. */}
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

      {/* ------------------------------------------------------------------
          Practice. The loop this product runs on is speak -> analyse ->
          understand -> practice -> speak again, and the step that closes it
          used to be a text-sized link at the bottom of the page. It is now the
          heaviest thing below the insight. Same destination, same lab data.
      ------------------------------------------------------------------- */}
      {topLab ? (
        <section className="fv-enter fv-glow-panel space-y-5 p-7 md:p-9">
          <div>
            <p className="fv-eyebrow">Practice this</p>
            <h2 className="mt-2 text-[22px] leading-snug text-balance text-[var(--ink)]">
              {topLab.title}
            </h2>
          </div>
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
          <LinkButton href={labHref} size="lg">
            <Play size={16} aria-hidden /> Start this practice
            <ArrowRight size={15} aria-hidden />
          </LinkButton>
        </section>
      ) : (
        <RecommendedLabs items={data.lab_recs || []} heading="More labs like this" />
      )}

      {/* 6. Everything else, on request. */}
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
          Presence, trust and confidence are model estimates from acoustic features. Treat them as
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
            A lab report covers the drill you chose. Other habits wait for their own lab. This is not a
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
