"use client";

/**
 * The 45-second pitch. One button, then nothing to read until it's over.
 *
 * Every other screen in this app is a document you study. This one is a room
 * you walk into: the coach briefs you out loud, counts you in, shuts up while
 * you talk, and then tells you what it heard — spoken, in the order a person
 * would say it, with the words on screen for whoever cannot listen right now.
 *
 * Forty-five seconds is the constraint doing the work. It is long enough for a
 * real pitch and short enough that you cannot pad, so the take exposes what
 * you actually reach for under time pressure. The clock is visible for the
 * same reason it is visible in a room: you should feel it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { CoachVoice } from "@/components/CoachVoice";
import { FeatureIntro } from "@/components/FeatureIntro";
import { VoiceViz } from "@/components/VoiceViz";
import { Button, ErrorBanner, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { QuotaMeter, UpgradeGate } from "@/components/UpgradeGate";
import { useCoachVoice } from "@/hooks/useCoachVoice";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { api, QuotaError, type QuotaState, type SpokenLine } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const SECONDS = 45;

/** Said before the clock starts if the API cannot be reached for the real brief. */
const FALLBACK_BRIEF: SpokenLine[] = [
  { id: "b1", kind: "open", text: `Alright. You have ${SECONDS} seconds to pitch me.` },
  { id: "b2", kind: "open", text: "Who it's for, what it does, why now, and what you want from me." },
  { id: "b3", kind: "open", text: "Don't read. Talk to me like I'm across the table." },
];

/**
 * `arming` exists because of a gap you only see once you run this: after "Go",
 * opening the microphone takes a beat — longer on Windows, and unbounded if
 * the browser is still waiting for someone to answer its permission prompt.
 * Without a state of its own that beat renders as a countdown that finished
 * and then nothing happened.
 */
type Stage =
  | "idle"
  | "brief"
  | "countdown"
  | "arming"
  | "recording"
  | "sending"
  | "analyzing"
  | "review";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PitchPage() {
  const router = useRouter();
  const rec = usePracticeRecorder();
  const voice = useCoachVoice();
  const { prefs } = usePrefs();

  const [stage, setStage] = useState<Stage>("idle");
  const [brief, setBrief] = useState<SpokenLine[]>(FALLBACK_BRIEF);
  const [count, setCount] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<QuotaState | undefined>(undefined);
  const [quota, setQuota] = useState<QuotaState | undefined>(undefined);

  /**
   * One token per attempt at the drill.
   *
   * `begin` is a single async function that spans a brief, a count-in and a
   * microphone open, and after every await it has to know whether the run it
   * belongs to is still the current one. Mirroring `stage` into a ref during
   * render looks like the obvious way to answer that and is not: React may
   * render and discard, so the ref can hold a value that was never committed,
   * and the flow silently stops. This counter is only ever touched from an
   * event handler, so it cannot go stale.
   */
  const run = useRef(0);
  const finishing = useRef(false);

  useEffect(() => {
    api
      .quota()
      .then((q) => {
        const state = q.features?.upload;
        setQuota(state);
        if (state?.exhausted) setLocked(state);
      })
      .catch(() => undefined);
  }, []);

  const left = Math.max(0, SECONDS - rec.elapsed);

  /** Stop the clock, ship the take, wait for the analysis, then let it talk. */
  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setStage("sending");
    try {
      const out = await rec.stop();
      if (!out || out.blob.size < 1200) {
        // Under a kilobyte is a mic that never opened, not a short pitch.
        setError("That take didn't record any audio. Check the microphone and try again.");
        setStage("idle");
        return;
      }
      void voice.speak("Got it. Give me a few seconds.");
      const { session_id } = await api.upload(out.blob, `${SECONDS}-second pitch`, "pitch");
      setSessionId(session_id);
      setStage("analyzing");

      // Poll rather than push: analysis runs in a background task on the API
      // and there is no socket. 2.5s matches the session report page.
      for (let tries = 0; tries < 160; tries += 1) {
        const detail = await api.session(session_id);
        const status = detail.session.status;
        if (status !== "pending" && status !== "analyzing") {
          setStage("review");
          return;
        }
        await wait(2500);
      }
      setError("The analysis is taking longer than expected. Your take is saved in Sessions.");
      setStage("idle");
    } catch (e) {
      if (e instanceof QuotaError) setLocked(e.quota);
      else setError(e instanceof Error ? e.message : "Could not send that take.");
      setStage("idle");
    } finally {
      finishing.current = false;
    }
  }, [rec, voice]);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  /* The clock is the thing that ends the take. A founder mid-sentence at 45
     seconds has already learned the lesson the drill is teaching. */
  useEffect(() => {
    if (stage === "recording" && rec.elapsed >= SECONDS) void finishRef.current();
  }, [rec.elapsed, stage]);

  const begin = useCallback(async () => {
    const mine = ++run.current;
    const live = () => run.current === mine;

    setError("");
    // Autoplay rules bind audio to a gesture, and the verdict plays a minute
    // from now. This click is what buys that.
    voice.unlock();
    setStage("brief");
    const fetched = await api.voiceBrief(SECONDS, prefs.name).catch(() => null);
    if (!live()) return;
    const lines = fetched?.lines?.length ? fetched.lines : FALLBACK_BRIEF;
    setBrief(lines);
    // A muted coach still gets read: hold the brief on screen long enough.
    if (voice.muted) await wait(2600);
    else await voice.play(lines);
    if (!live()) return; // cancelled while briefing

    setStage("countdown");
    for (const n of [3, 2, 1]) {
      setCount(n);
      await Promise.all([voice.speak(String(n)), wait(800)]);
      if (!live()) return;
    }
    setCount(0);

    setStage("arming");
    await rec.start();
    if (!live()) return;
    setStage("recording");
  }, [prefs.name, rec, voice]);

  /* The recorder reports a refused or missing microphone through `error`
     rather than by throwing, so a failed start would otherwise leave the clock
     running over a take that does not exist. */
  useEffect(() => {
    if (rec.error && (stage === "arming" || stage === "recording")) {
      voice.stop();
      setStage("idle");
    }
  }, [rec.error, stage, voice]);

  const abandon = useCallback(() => {
    // Retires the token, so whatever `begin` is waiting on lands on a dead run.
    run.current += 1;
    voice.stop();
    void rec.discard();
    setCount(0);
    setStage("idle");
  }, [rec, voice]);

  const again = useCallback(() => {
    run.current += 1;
    voice.stop();
    setSessionId("");
    setStage("idle");
  }, [voice]);

  if (locked) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Speak" title={`The ${SECONDS}-second pitch`} />
        <UpgradeGate
          quota={locked}
          title="You've used your free takes"
          body="Pro lifts the cap on recordings and spoken reviews."
        />
      </div>
    );
  }

  const live = stage === "recording";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Speak"
        title={`The ${SECONDS}-second pitch`}
        sub="Press start, listen, talk. The coach answers out loud — no reading required."
        actions={<QuotaMeter quota={quota} />}
      />

      <FeatureIntro
        id="pitch45"
        title="A drill you do with your eyes up"
        body={`The coach briefs you, counts you in, and gives you ${SECONDS} seconds. When the clock stops it tells you what it heard, why it happened and which lab fixes it — spoken, the way a coach in the room would.`}
        steps={[
          "Press start and listen to the brief.",
          `Pitch for ${SECONDS} seconds. The clock stops you.`,
          "Hear the verdict, then run it again with one thing changed.",
        ]}
      />

      {error && <ErrorBanner message={error} />}
      {rec.error && <ErrorBanner message={rec.error} />}

      <Panel tone="accent" className="text-center">
        <VoiceViz stream={rec.stream} active={live} height={140} />

        <div className="mt-6 flex flex-col items-center gap-5">
          {stage === "idle" && (
            <>
              <p className="max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
                One take, {SECONDS} seconds, no notes. The coach speaks first.
              </p>
              <Button size="lg" onClick={begin}>
                <Mic size={17} />
                Start the {SECONDS}-second pitch
              </Button>
            </>
          )}

          {stage === "brief" && (
            <>
              <ol className="max-w-lg space-y-2">
                {brief.map((line) => (
                  <li
                    key={line.id}
                    className={cn(
                      "rounded-[var(--r-md)] px-3.5 py-2 text-[15px] leading-relaxed transition-colors",
                      voice.speakingId === line.id
                        ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                        : "text-[var(--muted)]",
                    )}
                  >
                    {line.text}
                  </li>
                ))}
              </ol>
              <Button variant="ghost" size="sm" onClick={abandon}>
                Cancel
              </Button>
            </>
          )}

          {stage === "countdown" && (
            <p className="fv-display text-[4rem] leading-none text-[var(--accent)]">{count || "Go"}</p>
          )}

          {stage === "arming" && (
            <>
              <p className="flex items-center gap-2.5 text-[14px] text-[var(--muted)]">
                <Loader2 size={16} className="animate-spin" />
                Opening the microphone…
              </p>
              <p className="text-[13px] text-[var(--muted)]">
                Say yes if your browser asks. The clock starts when the mic is live, not before.
              </p>
              <Button variant="ghost" size="sm" onClick={abandon}>
                Cancel
              </Button>
            </>
          )}

          {live && (
            <>
              <Clock left={left} total={SECONDS} />
              <p className="text-[13px] text-[var(--muted)]">
                {left > 8 ? "Keep going." : "Land it. Say what you want from me."}
              </p>
              {rec.liveTranscript && (
                <p className="max-w-xl text-[13px] italic leading-relaxed text-[var(--muted)]">
                  “{rec.liveTranscript.slice(-180)}”
                </p>
              )}
              <Button variant="secondary" size="sm" onClick={() => void finish()}>
                <Square size={14} />
                I&rsquo;m done
              </Button>
            </>
          )}

          {(stage === "sending" || stage === "analyzing") && (
            <p className="flex items-center gap-2.5 text-[14px] text-[var(--muted)]">
              <Loader2 size={16} className="animate-spin" />
              {stage === "sending" ? "Sending your take…" : "Listening back. This takes a moment."}
            </p>
          )}

          {stage === "review" && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={again}>
                <RotateCcw size={16} />
                Go again
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/sessions/${sessionId}`)}>
                Open the full report
              </Button>
            </div>
          )}
        </div>
      </Panel>

      {stage === "review" && sessionId && (
        <Panel>
          <SectionTitle
            eyebrow="Spoken review"
            title="What the coach heard"
            sub="Playing now. The words stay here if you'd rather read them."
          />
          <CoachVoice sessionId={sessionId} autoPlay />
        </Panel>
      )}
    </div>
  );
}

/** The clock, as a ring that empties. Reading a number takes attention you need. */
function Clock({ left, total }: { left: number; total: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const remaining = Math.max(0, Math.min(1, left / total));
  const low = left <= 8;
  return (
    <div className="relative h-[112px] w-[112px]">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke={low ? "var(--danger)" : "var(--accent)"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remaining)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <span
        className={cn(
          "fv-display absolute inset-0 flex items-center justify-center text-[1.75rem]",
          low && "text-[var(--danger)]",
        )}
      >
        {left}
      </span>
    </div>
  );
}
