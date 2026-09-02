"use client";

/**
 * A coaching session you have, rather than a form you fill in.
 *
 * The coach says hello, asks how you are, asks what you're practising for,
 * listens to each answer and replies to what you actually said — then asks you
 * to present, shuts up while you do, and tells you what it heard with the
 * numbers attached: the filler word you reached for and how often, your pace
 * against the range a room wants, whether you sounded certain.
 *
 * Two decisions shape the whole file:
 *
 * 1.  The short conversational answers ("good, thanks", "an investor pitch")
 *     go through the browser's own speech recognition, not the upload
 *     pipeline. They are throwaway context; transcribing and storing them as
 *     sessions would cost money and privacy for nothing. Only the presentation
 *     itself becomes a recording.
 * 2.  Everything spoken is also written on screen as it happens. Someone in an
 *     open-plan office, or on a browser with no speech at all, gets the same
 *     session with the audio missing rather than a broken one.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, RotateCcw, Send, Square } from "lucide-react";
import { FeatureIntro } from "@/components/FeatureIntro";
import { VoiceViz } from "@/components/VoiceViz";
import { Button, Chip, ErrorBanner, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { QuotaMeter, UpgradeGate } from "@/components/UpgradeGate";
import { useCoachVoice } from "@/hooks/useCoachVoice";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { useVoiceReply } from "@/hooks/useVoiceReply";
import { api, QuotaError, type QuotaState } from "@/lib/api";
import {
  detectPurpose,
  greeting,
  moodAck,
  PURPOSE_CHOICES,
  PURPOSE_GIVE_UP,
  PURPOSE_QUESTION,
  PURPOSE_REASK,
  purposeFromAside,
  type Purpose,
} from "@/lib/coachTalk";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/** Long enough for a real pitch, short enough that nobody uploads a podcast. */
const MAX_SECONDS = 180;

type Stage =
  | "idle"
  | "talking" /* coach is asking or answering */
  | "listening" /* waiting for a spoken answer */
  | "choosing" /* it gave up on hearing the answer; buttons instead */
  | "arming" /* opening the microphone for the real take */
  | "recording"
  | "sending"
  | "analyzing"
  | "feedback"
  | "done";

type Turn = { id: string; who: "coach" | "you"; text: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TalkPage() {
  const router = useRouter();
  const rec = usePracticeRecorder();
  const reply = useVoiceReply();
  const voice = useCoachVoice();
  const { prefs } = usePrefs();

  const [stage, setStage] = useState<Stage>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [saying, setSaying] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [typed, setTyped] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<QuotaState | undefined>(undefined);
  const [quota, setQuota] = useState<QuotaState | undefined>(undefined);

  /* One token per session. Every await in the conversation checks it, so
     "start over" cannot leave a half-finished flow talking over the new one.
     Only ever written from a handler — never mirrored from render. */
  const run = useRef(0);
  const finishing = useRef(false);
  const answer = useRef<((text: string) => void) | null>(null);
  const thread = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    thread.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, saying]);

  const push = useCallback((who: Turn["who"], text: string) => {
    if (!text.trim()) return;
    setTurns((prev) => [...prev, { id: `${who}-${prev.length}`, who, text }]);
  }, []);

  /* ----------------------------------------------------------- the coach */

  const say = useCallback(
    async (text: string) => {
      if (!text) return;
      push("coach", text);
      setSaying(text);
      if (voice.muted) await wait(Math.min(4200, 900 + text.length * 42));
      else await voice.speak(text);
      setSaying("");
    },
    [push, voice],
  );

  /**
   * Wait for one answer, spoken or typed.
   *
   * Both are offered at once rather than as a fallback chosen up front: the
   * mic can be busy, the room can be loud, and a person who would rather type
   * should not have to sit through a failed listen to be allowed to.
   */
  const hear = useCallback(async (): Promise<string> => {
    setStage("listening");
    const spoken = reply.listen();
    const written = new Promise<string>((resolve) => {
      answer.current = resolve;
    });
    const text = await Promise.race([spoken.then((r) => r.text), written]);
    answer.current = null;
    reply.cancel();
    push("you", text);
    return text.trim();
  }, [push, reply]);

  /* ------------------------------------------------------- the recording */

  const finish = useCallback(
    async (chosen: Purpose) => {
      if (finishing.current) return;
      finishing.current = true;
      const mine = run.current;
      setStage("sending");
      try {
        const out = await rec.stop();
        if (!out || out.blob.size < 1200) {
          setError("That take didn't record any audio. Check the microphone and try again.");
          setStage("idle");
          return;
        }
        void voice.speak("Got it. Give me a few seconds.");
        const { session_id } = await api.upload(out.blob, chosen.label, "pitch", {
          focus_note: `Practising for: ${chosen.label}`,
        });
        setSessionId(session_id);
        setStage("analyzing");

        for (let tries = 0; tries < 160; tries += 1) {
          const detail = await api.session(session_id);
          const status = detail.session.status;
          if (status !== "pending" && status !== "analyzing") break;
          await wait(2500);
          if (run.current !== mine) return;
        }

        const script = await api.voiceScript(session_id, chosen.key);
        if (run.current !== mine) return;
        setStage("feedback");
        for (const line of script.lines) {
          if (run.current !== mine) return;
          await say(line.text);
        }
        setStage("done");
      } catch (e) {
        if (e instanceof QuotaError) setLocked(e.quota);
        else setError(e instanceof Error ? e.message : "Could not send that take.");
        setStage("idle");
      } finally {
        finishing.current = false;
      }
    },
    [rec, say, voice],
  );

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (stage === "recording" && rec.elapsed >= MAX_SECONDS && purpose) {
      void finishRef.current(purpose);
    }
  }, [purpose, rec.elapsed, stage]);

  /** Say what this is, then hand the floor over and start recording. */
  const takeTheFloor = useCallback(
    async (chosen: Purpose) => {
      const mine = run.current;
      setPurpose(chosen);
      setStage("talking");
      await say(chosen.heard);
      if (run.current !== mine) return;
      await say(chosen.bar);
      if (run.current !== mine) return;
      await say(`${chosen.prompt} Take your time, and press done when you finish.`);
      if (run.current !== mine) return;

      setStage("arming");
      await rec.start();
      if (run.current !== mine) return;
      setStage("recording");
    },
    [rec, say],
  );

  /* ------------------------------------------------------- the whole flow */

  const start = useCallback(async () => {
    const mine = ++run.current;
    const live = () => run.current === mine;

    setError("");
    setTurns([]);
    setSessionId("");
    setPurpose(null);
    // Spends this click on permission to make sound later, when the verdict
    // arrives minutes from now with no gesture anywhere near it.
    voice.unlock();

    setStage("talking");
    await say(greeting(prefs.name));
    if (!live()) return;

    const mood = await hear();
    if (!live()) return;
    setStage("talking");
    await say(moodAck(mood));
    if (!live()) return;

    // They may have said what they're here for while answering how they are.
    // Asking again would prove the coach wasn't listening.
    let chosen = detectPurpose(mood);
    if (chosen) {
      await say(purposeFromAside(chosen));
      if (!live()) return;
    } else {
      for (const prompt of [PURPOSE_QUESTION, PURPOSE_REASK]) {
        await say(prompt);
        if (!live()) return;
        const said = await hear();
        if (!live()) return;
        chosen = detectPurpose(said);
        if (chosen) break;
        setStage("talking");
      }
    }

    if (!chosen) {
      await say(PURPOSE_GIVE_UP);
      if (!live()) return;
      setStage("choosing");
      return; // resumed when they press one of the chips
    }
    await takeTheFloor(chosen);
  }, [hear, prefs.name, say, takeTheFloor, voice]);

  const restart = useCallback(() => {
    run.current += 1;
    answer.current = null;
    reply.cancel();
    voice.stop();
    void rec.discard();
    setStage("idle");
    setSaying("");
    setTurns([]);
    setSessionId("");
    setPurpose(null);
  }, [rec, reply, voice]);

  /* A refused microphone is reported through `error`, not by throwing, so the
     conversation would otherwise sit waiting for a take that cannot happen. */
  useEffect(() => {
    if (rec.error && (stage === "arming" || stage === "recording")) {
      voice.stop();
      setStage("idle");
    }
  }, [rec.error, stage, voice]);

  const sendTyped = () => {
    const text = typed.trim();
    if (!text) return;
    setTyped("");
    answer.current?.(text);
  };

  if (locked) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Speak" title="Talk to your coach" />
        <UpgradeGate
          quota={locked}
          title="You've used your free sessions"
          body="Pro lifts the cap on recordings and spoken coaching."
        />
      </div>
    );
  }

  const live = stage === "recording";
  const left = Math.max(0, MAX_SECONDS - rec.elapsed);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Speak"
        title="Talk to your coach"
        sub="It asks, you answer out loud, then it listens to you present and tells you what it heard."
        actions={<QuotaMeter quota={quota} />}
      />

      <FeatureIntro
        id="talk"
        title="A session, not a form"
        body="The coach opens the way a person does — hello, what are we working on — and listens to your answers. Then you present, and it comes back with the specifics: the filler word you lean on, your pace against the range a room wants, whether you sounded certain."
        steps={[
          "Answer its questions out loud, or type if the room is loud.",
          "Present the way you would on the day. It stays quiet.",
          "Hear exactly what it heard, then go again.",
        ]}
      />

      {error && <ErrorBanner message={error} />}
      {rec.error && <ErrorBanner message={rec.error} />}

      <Panel tone="accent">
        <VoiceViz stream={rec.stream} active={live || reply.listening} height={110} />

        {/* The conversation so far. */}
        {turns.length > 0 && (
          <ol className="mt-6 space-y-3">
            {turns.map((turn) => (
              <li
                key={turn.id}
                className={cn("flex", turn.who === "you" ? "justify-end" : "justify-start")}
              >
                <p
                  className={cn(
                    "max-w-[80%] rounded-[var(--r-md)] px-4 py-2.5 text-sm leading-relaxed",
                    turn.who === "coach"
                      ? "bg-[var(--bg)] text-[var(--ink)]"
                      : "bg-[var(--accent-soft)] text-[var(--ink)]",
                    saying === turn.text && "shadow-[inset_0_0_0_1px_var(--accent-line)]",
                  )}
                >
                  {turn.text}
                </p>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-7 flex flex-col items-center gap-4 text-center">
          {stage === "idle" && (
            <>
              <p className="max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
                It talks first. Answer out loud, the way you would to a person.
              </p>
              <Button size="lg" onClick={start}>
                <Mic size={17} />
                Start the session
              </Button>
              {!reply.supported && (
                <p className="max-w-md text-[12px] text-[var(--muted)]">
                  This browser can&rsquo;t hear short answers, so you&rsquo;ll type those. Chrome,
                  Edge and Safari can.
                </p>
              )}
            </>
          )}

          {stage === "listening" && (
            <>
              <p className="flex items-center gap-2 text-[13px] text-[var(--accent)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                Listening…
              </p>
              {reply.heard && (
                <p className="max-w-xl text-[13px] italic text-[var(--muted)]">{reply.heard}</p>
              )}
              <div className="flex w-full max-w-md items-center gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendTyped()}
                  placeholder="…or type your answer"
                  className="flex-1 rounded-[var(--r-full)] border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent-line)]"
                />
                <Button variant="secondary" size="sm" onClick={sendTyped}>
                  <Send size={14} />
                </Button>
              </div>
            </>
          )}

          {stage === "choosing" && (
            <div className="flex flex-wrap justify-center gap-2">
              {PURPOSE_CHOICES.map((choice) => (
                <Chip key={choice.key} onClick={() => void takeTheFloor(choice)}>
                  {choice.label}
                </Chip>
              ))}
            </div>
          )}

          {stage === "arming" && (
            <p className="flex items-center gap-2.5 text-[14px] text-[var(--muted)]">
              <Loader2 size={16} className="animate-spin" />
              Opening the microphone… say yes if your browser asks.
            </p>
          )}

          {live && (
            <>
              <p className="fv-num text-[2rem] leading-none">{fmtClock(rec.elapsed)}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {left > 30
                  ? "Go. I'm not interrupting."
                  : `Wrap it up — ${left} seconds left on the clock.`}
              </p>
              {rec.liveTranscript && (
                <p className="max-w-xl text-[13px] italic leading-relaxed text-[var(--muted)]">
                  “{rec.liveTranscript.slice(-180)}”
                </p>
              )}
              <Button variant="secondary" size="sm" onClick={() => purpose && void finish(purpose)}>
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

          {stage === "done" && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={start}>
                <RotateCcw size={16} />
                Go again
              </Button>
              {sessionId && (
                <Button variant="secondary" onClick={() => router.push(`/sessions/${sessionId}`)}>
                  Open the full report
                </Button>
              )}
            </div>
          )}

          {stage !== "idle" && stage !== "done" && (
            <button
              type="button"
              onClick={restart}
              className="text-[12px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
            >
              Start over
            </button>
          )}
        </div>
        <div ref={thread} />
      </Panel>

      {stage === "done" && purpose && (
        <Panel>
          <SectionTitle
            eyebrow="What happens next"
            title={`One thing to change before your ${purpose.label.toLowerCase()}`}
            sub="The full report has the transcript, every finding and the audio to hear yourself do it."
          />
        </Panel>
      )}
    </div>
  );
}

function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
