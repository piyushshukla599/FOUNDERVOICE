"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Panel, Stat } from "@/components/ui";
import { CoachSummary } from "@/components/CoachSummary";
import {
  ProfessionalVoiceReport,
  RootCauseFinding,
} from "@/components/ProfessionalVoiceReport";
import { api, apiUrl, type Finding, type SessionDetail } from "@/lib/api";
import { fmtTime } from "@/lib/utils";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<SessionDetail | null>(null);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeStart, setActiveStart] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const d = await api.session(id);
        if (alive) setData(d);
        if (d.session.status === "pending" || d.session.status === "analyzing") {
          setTimeout(tick, 2500);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed");
      }
    };
    tick();
    return () => {
      alive = false;
    };
  }, [id]);

  const eventsBySentence = useMemo(() => {
    const map = new Map<number, Finding[]>();
    const sentences = data?.session.transcript?.sentences || [];
    for (const e of data?.events || []) {
      const idx = sentences.findIndex((s) => e.start >= s.start && e.start <= s.end);
      if (idx >= 0) {
        const list = map.get(idx) || [];
        list.push(e);
        map.set(idx, list);
      }
    }
    return map;
  }, [data]);

  const playAt = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, t);
    void a.play();
    setActiveStart(t);
  };

  if (error) return <p className="text-[var(--danger)]">{error}</p>;
  if (!data) return <p className="text-[var(--muted)]">Loading session…</p>;

  const m = data.metrics || {};
  const payload = (m.payload || null) as Record<string, unknown> | null;
  const status = data.session.status;
  const isLabs = data.session.mode === "exercise";
  const isPractice = data.session.mode === "practice";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
            {status}
            {isLabs ? " · Labs" : isPractice ? " · Practice" : ""}
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl">{data.session.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {new Date(data.session.created_at).toLocaleString()} · {fmtTime(data.session.duration || 0)}
          </p>
        </div>
        <a
          href={apiUrl(`/api/sessions/${id}/report`)}
          className="rounded-xl border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]"
        >
          Download PDF report
        </a>
      </header>

      {(status === "pending" || status === "analyzing") && (
        <Panel>
          <p className="text-[var(--muted)]">
            Full evaluation running (same engine as Record): Whisper + professional voice + coach…
          </p>
        </Panel>
      )}

      {data.session.error && (
        <Panel>
          <p className="text-sm text-[var(--danger)]">Analysis error: {data.session.error}</p>
        </Panel>
      )}

      {data.session.transcript?.warning && (
        <Panel>
          <p className="text-sm text-[var(--warn)]">{data.session.transcript.warning}</p>
        </Panel>
      )}

      {(isLabs || isPractice) && (
        <Panel className="border-[var(--accent)]/35">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
            {isLabs ? "Labs drill · full evaluation" : "Practice · full evaluation"}
          </div>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {data.session.focus?.exercise_title || data.session.title}
          </h3>
          {data.session.focus?.exercise_description && (
            <p className="mt-2 text-sm text-[var(--muted)]">{data.session.focus.exercise_description}</p>
          )}
          <p className="mt-2 text-sm">
            Same analysis as Record (pace, acoustics, professional presence, coach). Drill/practice
            focus only adds coaching context — it does not replace the full report.
          </p>
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="WPM" value={String(m.wpm ?? "—")} />
        <Stat label="Fillers" value={String(m.filler_count ?? "—")} />
        <Stat label="Clarity" value={String(m.clarity ?? "—")} />
        <Stat label="Confidence (est.)" value={String(m.confidence_est ?? "—")} />
        <Stat label="Pause quality" value={String(m.pause_quality ?? "—")} />
        <Stat label="Executive Presence" value={String(m.executive_presence ?? m.ceo_presence ?? "—")} />
        <Stat label="Trust (est.)" value={String(m.founder_trust ?? "—")} />
        <Stat label="Monotone (est.)" value={String(m.monotone_score ?? "—")} />
      </div>

      <Panel>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Audio</h3>
        <audio ref={audioRef} controls className="w-full" src={apiUrl(`/api/sessions/${id}/audio`)} />
      </Panel>

      <ProfessionalVoiceReport payload={payload} onSeek={playAt} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Smart transcript</h3>
          <div className="max-h-[480px] space-y-3 overflow-y-auto pr-2">
            {(data.session.transcript?.sentences || []).map((s, i) => {
              const findings = eventsBySentence.get(i) || [];
              const hot = findings.length > 0;
              return (
                <button
                  key={`${s.start}-${i}`}
                  onClick={() => playAt(s.start)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    activeStart === s.start
                      ? "border-[var(--accent)] bg-[var(--bg-soft)]"
                      : hot
                        ? "border-[rgba(196,163,90,0.45)] bg-[rgba(196,163,90,0.08)]"
                        : "border-[var(--line)] hover:border-[var(--muted)]"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    {fmtTime(s.start)} · conf {(s.confidence * 100).toFixed(0)}%
                  </div>
                  <div>{s.text}</div>
                  {findings.slice(0, 2).map((f, fi) => (
                    <div key={fi} className="mt-2 text-xs text-[var(--accent)]">
                      {f.label}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Coach summary</h3>
            <CoachSummary text={data.session.coach_summary || ""} />
          </Panel>
          <Panel>
            <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Root-cause findings</h3>
            <div className="max-h-[520px] space-y-3 overflow-y-auto">
              {data.events.map((e, i) => (
                <RootCauseFinding key={i} event={e} onSeek={playAt} />
              ))}
              {!data.events.length && <p className="text-sm text-[var(--muted)]">No findings yet.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
