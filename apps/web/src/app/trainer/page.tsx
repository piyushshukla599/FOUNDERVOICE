"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, Stat } from "@/components/ui";
import { PracticeRecorderBar } from "@/components/PracticeRecorderBar";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { api, type ExercisesData } from "@/lib/api";
import { fmtTime } from "@/lib/utils";

type Exercise = ExercisesData["exercises"][number];

export default function TrainerPage() {
  const router = useRouter();
  const rec = usePracticeRecorder();
  const [data, setData] = useState<ExercisesData | null>(null);
  const [active, setActive] = useState<Exercise | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const load = () =>
    api
      .exercises()
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  // Auto-stop when drill timer hits target
  useEffect(() => {
    if (!active || !rec.recording) return;
    if (rec.elapsed >= active.duration_sec) {
      void finishDrill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.elapsed, rec.recording, active]);

  const beginDrill = (ex: Exercise) => {
    setActive(ex);
    setLastSessionId(null);
    setError("");
    void rec.discard();
  };

  const finishDrill = useCallback(async () => {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await rec.stop();
      if (!result || result.blob.size < 1000) {
        setError("Recording too short — try again and speak for the full drill.");
        setBusy(false);
        return;
      }
      const title = `Labs · ${active.title} · ${new Date().toLocaleString()}`;
      const uploaded = await api.upload(result.blob, title, "exercise", {
        exercise_key: active.key,
        exercise_title: active.title,
        exercise_category: active.category,
        exercise_description: active.description,
        focus_note: `Full Record-equivalent evaluation for Labs drill: ${active.title}`,
      });
      await api.completeExercise(active.key);
      if (data?.mission?.exercise_key === active.key && !data.mission.completed) {
        try {
          await api.completeMission();
        } catch {
          /* non-fatal */
        }
      }
      setLastSessionId(uploaded.session_id);
      await load();
      setActive(null);
      router.push(`/sessions/${uploaded.session_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed — is the API running?");
    } finally {
      setBusy(false);
    }
  }, [active, busy, data?.mission, rec, router]);

  const cancelDrill = async () => {
    await rec.discard();
    setActive(null);
    setBusy(false);
  };

  if (!data && !error) return <p className="text-[var(--muted)]">Loading Labs…</p>;

  const byCategory = (data?.exercises || []).reduce<Record<string, Exercise[]>>((acc, ex) => {
    const cat = ex.category || "other";
    (acc[cat] ||= []).push(ex);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-4xl">Voice Labs</h2>
          <p className="mt-2 text-[var(--muted)]">
            2–15 min vocal training. Every drill gets the <strong>same full evaluation as Record</strong>
            {" "}(WPM, clarity, presence, coach) — saved as its own Labs session report.
          </p>
        </div>
        {data && <Stat label="Streak" value={`${data.streak}d`} />}
      </header>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {rec.error && <p className="text-sm text-[var(--danger)]">{rec.error}</p>}

      {data?.mission && !active && (
        <Panel className="border-[var(--accent)]/30">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Today&apos;s Mission</div>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl">{data.mission.title}</h3>
          {data.mission.why && <p className="mt-1 text-sm text-[var(--muted)]">{data.mission.why}</p>}
          {data.mission.exercise_key && (
            <button
              type="button"
              className="mt-3 rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const ex = data.exercises.find((e) => e.key === data.mission?.exercise_key);
                if (ex) beginDrill(ex);
              }}
            >
              Start mission drill
            </button>
          )}
        </Panel>
      )}

      {(data?.hard_words?.length || 0) > 0 && !active && (
        <Panel>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Your hard words</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Practice at slow → normal → presentation speed. Finish every consonant.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data!.hard_words!.map((w) => (
              <span key={w.word} className="rounded-lg border border-[var(--line)] px-3 py-1 text-sm">
                {w.word}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-sm text-[var(--accent)] hover:underline"
            onClick={() => {
              const ex = data!.exercises.find((e) => e.key === "hard_word_ladder");
              if (ex) beginDrill(ex);
            }}
          >
            Open Hard Word Ladder →
          </button>
        </Panel>
      )}

      {active ? (
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-[var(--accent)]">{active.category}</div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl">{active.title}</h3>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{active.description}</p>
              {(data?.hard_words?.length || 0) > 0 && active.key.includes("hard_word") && (
                <p className="mt-2 text-sm">
                  Words: {data!.hard_words!.map((w) => w.word).join(" · ")}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--muted)]">Target {fmtTime(active.duration_sec)}</p>
            </div>
            <button
              type="button"
              onClick={() => void cancelDrill()}
              className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>

          <PracticeRecorderBar
            recording={rec.recording}
            starting={rec.starting}
            elapsed={rec.elapsed}
            stream={rec.stream}
            liveTranscript={rec.liveTranscript}
            targetSec={active.duration_sec}
            startLabel="Start drill"
            disabled={busy}
            onStart={() => void rec.start()}
            onStop={() => void finishDrill()}
          />

          {busy && <p className="text-sm text-[var(--muted)]">Uploading & analyzing…</p>}
        </Panel>
      ) : (
        <>
          {lastSessionId && (
            <Panel>
              <p className="text-sm">
                Last drill saved.{" "}
                <Link href={`/sessions/${lastSessionId}`} className="text-[var(--accent)] hover:underline">
                  Open analysis
                </Link>
              </p>
            </Panel>
          )}

          <Panel>
            <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Recommended for you</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {(data?.recommended || []).map((ex) => (
                <div
                  key={ex.key}
                  className="rounded-xl border border-[var(--accent)]/40 bg-[rgba(196,163,90,0.06)] p-4"
                >
                  <div className="text-xs uppercase tracking-wider text-[var(--accent)]">{ex.category}</div>
                  <div className="mt-1 text-lg font-semibold">{ex.title}</div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{ex.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)]">{fmtTime(ex.duration_sec)}</span>
                    <button
                      type="button"
                      onClick={() => beginDrill(ex)}
                      className="rounded-lg bg-[var(--accent-2)] px-3 py-1.5 text-sm font-medium text-white"
                    >
                      Practice now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {Object.entries(byCategory).map(([cat, list]) => (
            <Panel key={cat}>
              <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl capitalize">{cat}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((ex) => (
                  <div key={ex.key} className="rounded-xl border border-[var(--line)] p-4">
                    <div className="mt-1 font-semibold">{ex.title}</div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{ex.description}</p>
                    <button
                      type="button"
                      onClick={() => beginDrill(ex)}
                      className="mt-3 text-sm text-[var(--accent)] hover:underline"
                    >
                      Practice now · {fmtTime(ex.duration_sec)}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </>
      )}
    </div>
  );
}
