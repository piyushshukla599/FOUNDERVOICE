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
import { Loader2, Mic, RotateCcw, Send, Square, Volume2, VolumeX } from "lucide-react";
import { FeatureIntro } from "@/components/FeatureIntro";
import { VoiceViz } from "@/components/VoiceViz";
import { Button, Chip, ErrorBanner, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { QuotaMeter, UpgradeGate } from "@/components/UpgradeGate";
import { useCoachVoice } from "@/hooks/useCoachVoice";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { useVoiceReply } from "@/hooks/useVoiceReply";
import { api, QuotaError, type QuotaState, type SessionDetail } from "@/lib/api";
import { answerVerdict, readAnswer, type AnswerSignal } from "@/lib/answerRead";
import {
  detectPurpose,
  greeting,
  moodAck,
  PURPOSE_CHOICES,
  PURPOSE_GIVE_UP,
  PURPOSE_QUESTION,
  PURPOSE_REASK,
  purposeFromAside,
  wantsShort,
  yesNo,
  type Purpose,
} from "@/lib/coachTalk";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/** Long enough for a real pitch, short enough that nobody uploads a podcast. */
const MAX_SECONDS = 180;

/** How many times the investor pushes back. Three is an interview, two is a test. */
const QUESTIONS = 2;

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

  /**
   * `kind` is what the sentence is doing — asking, judging, throwing something
   * away — and it decides the pace, the pitch and the silence after it. A coach
   * that says eleven sentences at one speed with no gaps is reading a list, and
   * everyone hears that immediately.
   */
  const say = useCallback(
    async (text: string, kind = "read") => {
      if (!text) return;
      push("coach", text);
      setSaying(text);
      if (voice.muted) await wait(Math.min(4200, 900 + text.length * 42));
      else await voice.speak(text, kind);
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
  const hear = useCallback(async (): Promise<{ text: string; pauseMs: number }> => {
    setStage("listening");
    const asked = Date.now();
    const spoken = reply.listen();
    const written = new Promise<string>((resolve) => {
      answer.current = resolve;
    });
    let pauseMs = 0;
    const text = await Promise.race([
      spoken.then((r) => {
        pauseMs = r.latencyMs;
        return r.text;
      }),
      // A typed answer has no hesitation to measure that means anything, so it
      // is timed from the question and left to the reader to discount.
      written.then((t) => {
        pauseMs = Date.now() - asked;
        return t;
      }),
    ]);
    answer.current = null;
    reply.cancel();
    push("you", text);
    return { text: text.trim(), pauseMs };
  }, [push, reply]);

  /* ---------------------------------------------------- the hard questions */

  /**
   * The part that actually decides a meeting.
   *
   * Nobody loses the room during the pitch — they lose it in the four minutes
   * afterwards, when someone asks why the growth is slow and the answer starts
   * with "I think". So the coach turns into the person across the table: it
   * asks about the pitch it just heard, listens to the answer, reacts to it,
   * pushes again, and then says how the answers held up.
   *
   * The questions come from the existing practice engine seeded with the real
   * transcript, so they are about this pitch and not a generic list. The
   * answers are read locally (hedging, hesitation, length) rather than
   * uploaded — four short recordings would cost more than they tell us.
   */
  const crossExamine = useCallback(
    async (context: string, mine: number) => {
      const signals: AnswerSignal[] = [];
      let history: { role: string; content: string }[] = [];
      let confidence: number | undefined;

      try {
        const opened = await api.practiceStart(context || "A founder pitching their startup.");
        history = opened.history;
        confidence = opened.scores?.confidence;
        await say(opened.reply, "ask");
      } catch (e) {
        if (e instanceof QuotaError) {
          await say(
            "I'd push back with questions here, but your free practice rounds are spent for today.",
            "aside",
          );
        }
        return;
      }

      for (let asked = 0; asked < QUESTIONS; asked += 1) {
        if (run.current !== mine) return;
        const answered = await hear();
        if (run.current !== mine) return;
        setStage("feedback");

        if (!answered.text) {
          await say("Silence is an answer too, and not the one you want. Let's move on.", "aside");
          break;
        }
        signals.push(readAnswer(answered.text, answered.pauseMs));

        try {
          const turn = await api.practiceTurn({
            pitch_context: context,
            history,
            founder_message: answered.text,
          });
          history = turn.history;
          confidence = turn.scores?.confidence ?? confidence;
          // The last reply would end on a fresh question nobody is going to
          // answer, so it is dropped in favour of the read on the answers.
          if (asked < QUESTIONS - 1) {
            if (run.current !== mine) return;
            await say(turn.reply, "ask");
          }
        } catch {
          break; // a spent turn allowance ends the round, it does not break it
        }
      }

      if (run.current !== mine) return;
      await say(answerVerdict(signals, confidence), "issue");
    },
    [hear, say],
  );

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

        // Kept after the loop: the transcript is what seeds the investor's
        // questions, so they are about this pitch rather than any pitch.
        let detail: SessionDetail | null = null;
        for (let tries = 0; tries < 160; tries += 1) {
          detail = await api.session(session_id);
          const status = detail.session.status;
          if (status !== "pending" && status !== "analyzing") break;
          await wait(2500);
          if (run.current !== mine) return;
        }

        const script = await api.voiceScript(session_id, chosen.key);
        if (run.current !== mine) return;
        setStage("feedback");

        /* The verdict first, then it stops and asks — because a coach that
           delivers eleven findings without drawing breath is reading a report
           at you, and you stopped listening around the fourth one. */
        const lines = script.lines;
        const cut = lines.findIndex((l) => l.kind === "verdict");
        const opening = cut >= 0 ? lines.slice(0, cut + 1) : lines.slice(0, 2);
        for (const line of opening) {
          if (run.current !== mine) return;
          await say(line.text, line.kind);
        }

        if (run.current !== mine) return;
        await say("Want me to go through what I heard?", "ask");
        if (run.current !== mine) return;
        const wants = await hear();
        if (run.current !== mine) return;
        setStage("feedback");

        const rest = lines.slice(opening.length);
        // "No" is not "say nothing" — it's "spare me the tour". They still get
        // the thing that matters, which is the one they can act on.
        const brief = yesNo(wants.text) === "no" || wantsShort(wants.text);
        const chosenLines = brief
          ? rest.filter((l) => ["issue", "fix", "lab"].includes(l.kind)).slice(0, 3)
          : rest;
        for (const line of chosenLines) {
          if (run.current !== mine) return;
          await say(line.text, line.kind);
        }

        /* Delivery was only half of it. The meeting is decided by what happens
           when someone pushes back, so offer that rather than assume it. */
        if (run.current !== mine) return;
        await say("Now the real test. Want me to push back on it, the way they will?", "ask");
        if (run.current !== mine) return;
        const pushBack = await hear();
        if (run.current !== mine) return;
        setStage("feedback");
        if (yesNo(pushBack.text) !== "no") {
          const spoken = detail?.session.transcript?.text || "";
          await crossExamine(spoken, mine);
        }

        if (run.current !== mine) return;
        await say("Do you want to run it again?", "ask");
        if (run.current !== mine) return;
        const again = await hear();
        if (run.current !== mine) return;
        if (yesNo(again.text) === "yes") {
          finishing.current = false;
          void startRef.current();
          return;
        }
        await say("Alright. It'll be here when you are.", "close");
        setStage("done");
      } catch (e) {
        if (e instanceof QuotaError) setLocked(e.quota);
        else setError(e instanceof Error ? e.message : "Could not send that take.");
        setStage("idle");
      } finally {
        finishing.current = false;
      }
    },
    [crossExamine, hear, rec, say, voice],
  );

  /* `finish` ends by offering another round, and `start` is declared below it.
     A ref breaks the circle without either of them lying about its deps. */
  const startRef = useRef<() => void>(() => undefined);
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
      await say(chosen.heard, "read");
      if (run.current !== mine) return;
      await say(chosen.bar, "aside");
      if (run.current !== mine) return;
      await say(`${chosen.prompt} Take your time, and press done when you finish.`, "fix");
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
    await say(greeting(prefs.name), "ask");
    if (!live()) return;

    const mood = await hear();
    if (!live()) return;
    setStage("talking");
    await say(moodAck(mood.text));
    if (!live()) return;

    // They may have said what they're here for while answering how they are.
    // Asking again would prove the coach wasn't listening.
    let chosen = detectPurpose(mood.text);
    if (chosen) {
      await say(purposeFromAside(chosen), "read");
      if (!live()) return;
    } else {
      for (const prompt of [PURPOSE_QUESTION, PURPOSE_REASK]) {
        await say(prompt, "ask");
        if (!live()) return;
        const said = await hear();
        if (!live()) return;
        chosen = detectPurpose(said.text);
        if (chosen) break;
        setStage("talking");
      }
    }

    if (!chosen) {
      await say(PURPOSE_GIVE_UP, "aside");
      if (!live()) return;
      setStage("choosing");
      return; // resumed when they press one of the chips
    }
    await takeTheFloor(chosen);
  }, [hear, prefs.name, say, takeTheFloor, voice]);
  startRef.current = () => void start();

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
        actions={
          <div className="flex items-center gap-2">
            {/* The mute preference is shared with the review screen and remembered
                across visits, so without a control here a coach silenced once is
                silent forever on the page whose whole point is that it talks. */}
            {voice.supported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={voice.toggleMute}
                aria-pressed={voice.muted}
                title={voice.muted ? "Let the coach speak" : "Silence the coach"}
              >
                {voice.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                {voice.muted ? "Voice off" : "Voice on"}
              </Button>
            )}
            <QuotaMeter quota={quota} />
          </div>
        }
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
