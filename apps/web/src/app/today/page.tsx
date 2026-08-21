"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Flame } from "lucide-react";
import { Divider, ErrorBanner, HeroLink, LoadingState } from "@/components/ui";
import { DiscoveryNudge } from "@/components/FeatureIntro";
import { ImmersiveRecorder } from "@/components/ImmersiveRecorder";
import { ScoreRing } from "@/components/ScoreRing";
import { VoiceViz } from "@/components/VoiceViz";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { useJourney } from "@/hooks/useJourney";
import { api, QuotaError, type QuotaState } from "@/lib/api";
import { QuotaMeter, UpgradeGate } from "@/components/UpgradeGate";
import { DAILY_PROMPTS, founderVoiceScore } from "@/lib/founderScore";
import { memoryDigest, todayFocus } from "@/lib/insight";
import { goalLabel, usePrefs } from "@/lib/prefs";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function TodayPage() {
  const router = useRouter();
  const rec = usePracticeRecorder();
  const journey = useJourney();
  const { prefs, ready: prefsReady } = usePrefs();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [hour, setHour] = useState(9);
  const [showCheck, setShowCheck] = useState(false);
  const [uploadQuota, setUploadQuota] = useState<QuotaState | undefined>(undefined);

  useEffect(() => {
    api
      .quota()
      .then((q) => setUploadQuota(q.features?.upload))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const now = new Date();
    setPromptIdx(now.getDate() % DAILY_PROMPTS.length);
    setHour(now.getHours());
  }, []);

  /* Anyone who has not been walked through the product gets the guided intro
     first, including someone who already has recordings from before the
     onboarding existed. Finishing or skipping it stamps onboardedAt. */
  useEffect(() => {
    if (!prefsReady || journey.loading) return;
    if (!prefs.onboardedAt && !journey.error) router.replace("/onboarding");
  }, [journey.error, journey.loading, prefs.onboardedAt, prefsReady, router]);

  const memory = journey.memory;
  const labs = journey.labs;
  const mission = labs?.mission;
  const prompt = DAILY_PROMPTS[promptIdx];

  /* This week against the 30-day average, both derived in one pass so the
     hook has a single, honest dependency. */
  const { score, delta } = useMemo(() => {
    const at = (key: string) => {
      const w = memory?.windows?.[key] || {};
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
    const now = at("7d");
    const before = at("30d");
    return { score: now, delta: now != null && before != null ? now - before : null };
  }, [memory]);

  const focus = useMemo(
    () => todayFocus(memory, mission, labs?.recommended, prefs),
    [labs?.recommended, memory, mission, prefs],
  );
  const digest = useMemo(() => memoryDigest(memory), [memory]);
  const wpm7 = memory?.windows?.["7d"]?.wpm ?? null;

  const finishCheck = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await rec.stop();
      if (!result || result.blob.size < 800) {
        setError("Too short, speak the full prompt, then stop.");
        setBusy(false);
        return;
      }
      const uploaded = await api.upload(result.blob, `Today · ${prompt.label}`, "exercise", {
        exercise_key: "one_liner",
        exercise_title: prompt.label,
        exercise_category: "daily",
        exercise_description: prompt.text,
        focus_note: prompt.text,
      });
      try {
        await api.completeExercise("one_liner");
        if (mission?.exercise_key === "one_liner" && !mission.completed) await api.completeMission();
      } catch {
        /* streak bookkeeping is not worth blocking the report on */
      }
      router.push(`/sessions/${uploaded.session_id}`);
    } catch (e) {
      // Running out of free recordings is a gate, not a failure to report in red.
      if (e instanceof QuotaError) {
        if (e.quota) setUploadQuota(e.quota);
        setShowCheck(false);
      } else {
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
      setBusy(false);
    }
  };

  if (journey.loading) return <LoadingState label="Reading your Voice Memory…" />;

  const firstRun = journey.stage === "new";
  const hello = prefs.name ? `${greeting(hour)}, ${prefs.name}.` : `${greeting(hour)}.`;

  /* While recording, everything else disappears. */
  if (rec.recording || busy) {
    return (
      <div className="mx-auto max-w-2xl">
        <ImmersiveRecorder
          title={prompt.label}
          targetSec={60}
          recording={rec.recording}
          starting={rec.starting}
          elapsed={rec.elapsed}
          stream={rec.stream}
          liveTranscript={rec.liveTranscript}
          busy={busy}
          onStart={() => void rec.start()}
          onStop={() => void finishCheck()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pt-2 md:pt-8">
      {journey.error && (
        <ErrorBanner
          message={journey.error}
          hint="Start the local API on port 8000, then reload this page."
        />
      )}
      {error && <ErrorBanner message={error} />}
      {rec.error && <ErrorBanner message={rec.error} />}

      <div className="fv-enter flex items-center justify-between gap-4">
        <p className="text-[13px] text-[var(--muted)]">{hello}</p>
        <span className="flex items-center gap-2.5">
          <QuotaMeter quota={uploadQuota} />
          {labs?.streak ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] fv-gold">
              <Flame size={13} /> {labs.streak} day streak
            </span>
          ) : null}
        </span>
      </div>

      {/* ------------------------------------------------- 1. The score, big */}
      {!firstRun && (
        <div className="fv-enter flex justify-center pt-8 pb-2">
          <ScoreRing value={score} delta={delta} label="Founder presence" />
        </div>
      )}

      {/* ----------------------------------------- 2. The opportunity + action */}
      <section className="fv-enter fv-halo pt-8 text-center">
        <p className="fv-eyebrow">
          {firstRun ? "Start here" : "What your voice is doing"}
        </p>
        <h1 className="fv-lede mx-auto mt-3">
          {firstRun
            ? "Let us hear how you speak."
            : focus
              ? focus.headline
              : "Sound like someone they trust."}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
          {firstRun
            ? "Sixty seconds of natural speech is enough to name the one habit costing you the most."
            : focus?.why || `Training for ${goalLabel(prefs.goal).toLowerCase()}.`}
        </p>

        {/* The instruction sits under the observation, and its number sits
            beside it, a heading should never carry its own spec in brackets. */}
        {!firstRun && focus?.action && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <span className="fv-eyebrow-quiet">Today</span>
            <span className="text-[15px] leading-snug text-[var(--ink-dim)]">{focus.action}</span>
            {focus.target && <span className="fv-pill fv-pill-accent">{focus.target}</span>}
          </div>
        )}

        {!firstRun && (
          <div className="mt-7">
            <VoiceViz active={false} height={72} />
            {wpm7 != null && (
              <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12px]">
                <span className="fv-pill">
                  <span className="fv-num fv-grad-text text-[14px] font-semibold">
                    {Math.round(wpm7)}
                  </span>
                  <span className="text-[var(--muted)]">WPM, your pace</span>
                </span>
                <span className="fv-pill text-[var(--muted)]">130–140 is the room</span>
              </p>
            )}
          </div>
        )}
      </section>

      <div className="pt-9">
        {uploadQuota?.exhausted ? (
          <UpgradeGate
            quota={uploadQuota}
            title="You have used today's free recordings"
            body="Every recording runs a full transcription and analysis. The free tier covers ten a day and resets 24 hours after your first one. Pro removes the cap."
          />
        ) : firstRun || showCheck ? (
          <ImmersiveRecorder
            title={prompt.label}
            subtitle={prompt.text}
            meta={`60 seconds · ${prompt.label}`}
            targetSec={60}
            startLabel="Start speaking"
            recording={rec.recording}
            starting={rec.starting}
            elapsed={rec.elapsed}
            stream={rec.stream}
            liveTranscript={rec.liveTranscript}
            disabled={busy}
            onStart={() => void rec.start()}
            onStop={() => void finishCheck()}
            footer={
              <button
                type="button"
                onClick={() => setPromptIdx((i) => (i + 1) % DAILY_PROMPTS.length)}
                className="mt-4 text-[12.5px] text-[var(--faint)] transition-colors hover:text-[var(--muted)]"
              >
                Try a different prompt
              </button>
            }
          />
        ) : (
          <div className="fv-enter flex flex-col items-center">
            <HeroLink href={focus?.labKey ? `/trainer?lab=${encodeURIComponent(focus.labKey)}` : "/trainer"}>
              Practice now
            </HeroLink>
            <p className="mt-3.5 text-[12.5px] text-[var(--faint)]">
              {prefs.sessionLength} min · {goalLabel(prefs.goal)}
            </p>
            <button
              type="button"
              onClick={() => setShowCheck(true)}
              className="mt-5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              or record a 60-second check
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------------------- 3. Progress, quietly */}
      {!firstRun && (digest.improving.length > 0 || digest.attention.length > 0 || journey.hasTrend) && (
        <>
          <Divider />
          <section className="fv-enter">
            <div className="flex items-center justify-between gap-4">
              <p className="fv-eyebrow-quiet">Moving</p>
              {journey.hasTrend && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--violet-bright)]"
                >
                  Full progress <ArrowRight size={12} />
                </Link>
              )}
            </div>
            <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
              {digest.improving.slice(0, 1).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {digest.attention.slice(0, 1).map((line) => (
                <li key={line} className="text-[var(--muted)]">
                  {line}
                </li>
              ))}
              {!digest.improving.length && !digest.attention.length && (
                <li className="text-[var(--muted)]">
                  {Math.max(0, 3 - journey.readyCount)} more session
                  {3 - journey.readyCount === 1 ? "" : "s"} and your trend opens up.
                </li>
              )}
            </ul>
          </section>
        </>
      )}

      {(labs?.recommended || []).length > 0 && (
        <>
          <Divider />
          <section className="fv-enter space-y-3">
            <p className="fv-eyebrow-quiet">Also worth your time</p>
            <div className="fv-stagger grid gap-2.5 sm:grid-cols-2">
              {(labs?.recommended || []).slice(0, 2).map((lab) => (
                <Link
                  key={lab.key}
                  href={`/trainer?lab=${encodeURIComponent(lab.key)}`}
                  className="fv-tile group"
                >
                  <p className="text-[14px] leading-relaxed text-[var(--ink-dim)] transition-colors group-hover:text-[var(--ink)]">
                    {lab.sound || lab.why || lab.description}
                  </p>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--violet-bright)]">
                    {lab.title}
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="space-y-2 pt-10">
        {journey.hasRecorded && !journey.hasLab && (
          <DiscoveryNudge id="nudge-labs" question="Want to fix the habit we found?" cta="Open Labs" href="/trainer" />
        )}
        {journey.hasLab && !journey.hasListen && (
          <DiscoveryNudge
            id="nudge-listen"
            question="Want to see whether this happens in real conversations?"
            cta="Try Listen"
            href="/listen"
          />
        )}
        {journey.readyCount >= 3 && !journey.hasPractice && (
          <DiscoveryNudge
            id="nudge-practice"
            question="Ready to test yourself under pressure?"
            cta="Try Practice"
            href="/practice"
          />
        )}
      </div>
    </div>
  );
}
