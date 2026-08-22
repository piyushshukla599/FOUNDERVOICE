"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Flame } from "lucide-react";
import { Divider, ErrorBanner, EmptyState, HeroLink, LoadingState } from "@/components/ui";
import { FeatureIntro } from "@/components/FeatureIntro";
import { TrainingPath } from "@/components/TrainingPath";
import { ImmersiveRecorder } from "@/components/ImmersiveRecorder";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { api, type ExerciseItem, type ExercisesData } from "@/lib/api";
import { splitTarget } from "@/lib/insight";
import { fmtTime } from "@/lib/utils";

const LEVELS = [
  { n: 0, name: "For you", blurb: "From your voice history" },
  { n: 1, name: "Warm", blurb: "Breath, fillers, pause" },
  { n: 2, name: "Control", blurb: "Clarity and pace" },
  { n: 3, name: "Pressure", blurb: "The ask, and presence" },
];

export default function TrainerRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading Labs…" shape="page" />}>
      <TrainerPage />
    </Suspense>
  );
}

function TrainerPage() {
  const router = useRouter();
  const search = useSearchParams();
  const rec = usePracticeRecorder();
  const [data, setData] = useState<ExercisesData | null>(null);
  const [active, setActive] = useState<ExerciseItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const openedLab = useRef(false);

  useEffect(() => {
    api
      .exercises()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load Labs"));
  }, []);

  const beginDrill = useCallback(
    (ex: ExerciseItem) => {
      setActive(ex);
      setError("");
      void rec.discard();
    },
    [rec],
  );

  /* Deep link from a session report / Today: /trainer?lab=<key> */
  useEffect(() => {
    if (!data || openedLab.current) return;
    const key = search.get("lab");
    if (!key) return;
    const ex = data.exercises.find((e) => e.key === key);
    if (ex) {
      openedLab.current = true;
      beginDrill(ex);
    }
  }, [beginDrill, data, search]);

  const finishDrill = useCallback(async () => {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await rec.stop();
      if (!result || result.blob.size < 1000) {
        setError("Too short, speak the line, then stop.");
        setBusy(false);
        return;
      }
      const uploaded = await api.upload(result.blob, `Labs · ${active.title}`, "exercise", {
        exercise_key: active.key,
        exercise_title: active.title,
        exercise_category: active.category,
        exercise_description: active.description,
        focus_note: `Lab specialty only. Coach this drill: ${active.title}. Speak: ${active.speak || ""}. How: ${active.how || ""}. Sense: ${active.sense || ""}`,
      });
      await api.completeExercise(active.key);
      if (data?.mission?.exercise_key === active.key && !data.mission.completed) {
        try {
          await api.completeMission();
        } catch {
          /* non-fatal */
        }
      }
      /* A finished drill is what unlocks a pending real-world verdict. */
      try {
        const sessions = await api.listListening();
        const pending = sessions.find(
          (row) =>
            row.status === "ended" &&
            (row.summary?.verdict_status === "pending" || row.summary?.verdict?.status === "pending"),
        );
        if (pending) await api.unlockVerdict(pending.id, uploaded.session_id);
      } catch {
        /* non-fatal */
      }
      setActive(null);
      router.push(`/sessions/${uploaded.session_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed, is the local API running?");
    } finally {
      setBusy(false);
    }
  }, [active, busy, data?.mission, rec, router]);

  /* Drills are timed, stop automatically when the clock runs out. */
  useEffect(() => {
    if (!active || !rec.recording) return;
    if (rec.elapsed >= active.duration_sec) void finishDrill();
  }, [active, finishDrill, rec.elapsed, rec.recording]);

  if (!data && !error) return <LoadingState label="Loading Labs…" shape="page" />;

  const list = tab === 0 ? data?.recommended || [] : (data?.exercises || []).filter((e) => (e.level || 1) === tab);
  const topPick = (data?.recommended || [])[0];
  const mission = data?.mission;
  const missionTitle = splitTarget(mission?.title);
  const missionTarget = mission?.target || missionTitle.target;

  /* ------------------------------------------------------------ drill view */
  if (active) {
    return (
      <div className="mx-auto max-w-2xl pt-2 md:pt-8">
        <button
          type="button"
          onClick={() => {
            void rec.discard();
            setActive(null);
          }}
          className="fv-enter inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
        >
          <ArrowLeft size={14} /> All labs
        </button>

        {error && (
          <div className="pt-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {rec.error && (
          <div className="pt-4">
            <ErrorBanner message={rec.error} />
          </div>
        )}

        {/* One continuous surface: the line, then the microphone. */}
        <section className="fv-enter fv-halo pt-8 text-center">
          <p className="fv-eyebrow">
            {active.category} · {fmtTime(active.duration_sec)}
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[11px] uppercase tracking-[0.2em] text-[var(--faint)]">
            Speak this
          </p>
          <blockquote className="fv-display mx-auto mt-3 max-w-xl text-[1.5rem] leading-snug md:text-[1.75rem]">
            “{active.speak || active.description}”
          </blockquote>
        </section>

        <div className="pt-8">
          <ImmersiveRecorder
            title={active.title}
            meta={`${fmtTime(active.duration_sec)} · we review this drill only`}
            targetSec={active.duration_sec}
            startLabel="Start practice"
            recording={rec.recording}
            starting={rec.starting}
            elapsed={rec.elapsed}
            stream={rec.stream}
            liveTranscript={rec.liveTranscript}
            disabled={busy}
            busy={busy}
            busyLabel="Reviewing this drill…"
            onStart={() => void rec.start()}
            onStop={() => void finishDrill()}
          />
        </div>

        {!rec.recording && !busy && (
          <>
            <Divider />
            <div className="fv-enter grid gap-7 sm:grid-cols-2">
              <div>
                <p className="fv-eyebrow-quiet mb-2">How to speak it</p>
                <p className="text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
                  {active.how || active.description}
                </p>
              </div>
              <div>
                <p className="fv-eyebrow-quiet mb-2">What this trains</p>
                <p className="text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
                  {active.sense || active.why || "One habit at a time. Stay on this skill only."}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------- list view */
  return (
    <div className="mx-auto max-w-2xl pt-2 md:pt-8">
      <div className="fv-enter flex items-center justify-between gap-4">
        <p className="fv-eyebrow">Train one skill</p>
        {data?.streak ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] fv-gold">
            <Flame size={13} /> {data.streak} day streak
          </span>
        ) : null}
      </div>

      {error && (
        <div className="pt-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {rec.error && (
        <div className="pt-4">
          <ErrorBanner message={rec.error} />
        </div>
      )}

      <FeatureIntro
        id="intro-labs"
        title="Labs turn your weaknesses into exercises."
        body="One habit, one line to say, a couple of minutes. We review only that skill, not everything about your voice."
      />

      {/* The recommended drill is the page, not a card on it. */}
      {(mission || topPick) && (
        <section className="fv-enter fv-halo pt-6 text-center">
          <h1 className="fv-lede mx-auto">{missionTitle.text || topPick?.title}</h1>
          {(mission?.why || topPick?.sound || topPick?.why) && (
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
              {mission?.why || topPick?.sound || topPick?.why}
            </p>
          )}

          {/* Target and length as pills, measurable detail a heading should
              never have to carry. */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {missionTarget && <span className="fv-pill fv-pill-accent">{missionTarget}</span>}
            {topPick && (
              <span className="fv-pill">
                {fmtTime(topPick.duration_sec)} · {topPick.category}
              </span>
            )}
            {mission?.completed && <span className="fv-pill fv-pill-done">Done today</span>}
          </div>

          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                const ex =
                  data?.exercises.find((e) => e.key === mission?.exercise_key) || topPick || null;
                if (ex) beginDrill(ex);
              }}
              className="fv-hero"
            >
              Start practice
              <ArrowRight size={17} className="fv-arrow" aria-hidden />
            </button>
            {mission?.completed && (
              <p className="mt-3.5 text-[12.5px] text-[var(--muted)]">Go again if you want.</p>
            )}
          </div>
        </section>
      )}

      <Divider />

      <section className="fv-enter pt-2">
        <TrainingPath
          steps={LEVELS.map((lv) => ({
            ...lv,
            done:
              lv.n > 0 &&
              (data?.exercises || []).some((e) => (e.level || 1) === lv.n && e.completed),
          }))}
          active={tab}
          onSelect={setTab}
        />

        <p className="mb-6 mt-2 text-center text-[11.5px] text-[var(--faint)]">
          Every level is open. The path shows where you have been working.
        </p>

        <div className="space-y-1">
          {list.map((ex) => (
            <button
              key={ex.key}
              type="button"
              onClick={() => beginDrill(ex)}
              className="fv-lift group -mx-3 flex w-[calc(100%+1.5rem)] items-baseline justify-between gap-5 rounded-[var(--r-md)] px-3 py-3.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-[15px] font-medium">{ex.title}</span>
                  {ex.completed && (
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--emerald)]">
                      done{ex.times_completed ? ` ×${ex.times_completed}` : ""}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-[var(--muted)]">
                  {ex.sense || ex.sound || ex.why || (ex.speak ? `“${ex.speak}”` : ex.description)}
                </span>
              </span>
              <span className="fv-num shrink-0 text-[12px] text-[var(--faint)]">
                {fmtTime(ex.duration_sec)}
              </span>
            </button>
          ))}

          {!list.length && (
            <EmptyState
              title={tab === 0 ? "No personal picks yet" : "Nothing at this level yet"}
              body={
                tab === 0
                  ? "Record once and we will choose the drills that match what your voice is actually doing."
                  : "Try another level. Every lab is available."
              }
              action={tab === 0 ? <HeroLink href="/today">Record 60 seconds</HeroLink> : undefined}
            />
          )}
        </div>
      </section>

      <p className="pt-8 text-[12.5px] text-[var(--faint)]">
        After a drill you get a review of that skill only.{" "}
        <Link href="/today" className="text-[var(--violet-bright)]">
          Back to Today
        </Link>
      </p>
    </div>
  );
}
