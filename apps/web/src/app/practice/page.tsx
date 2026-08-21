"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import {
  Chip,
  Disclosure,
  Divider,
  ErrorBanner,
  HeroButton,
  PageHeader,
  Stat,
} from "@/components/ui";
import { FeatureIntro } from "@/components/FeatureIntro";
import { PracticeRecorderBar } from "@/components/PracticeRecorderBar";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { api, QuotaError, type QuotaState } from "@/lib/api";
import { QuotaMeter, UpgradeGate } from "@/components/UpgradeGate";

type Msg = { role: string; content: string };

const ROUNDS = [
  {
    id: "standup",
    level: 1,
    label: "Standup",
    hint: "Warm. No investor heat.",
    context:
      "You are a sharp but friendly team lead in a daily standup. Ask one question at a time about what shipped and what’s blocked. Stay short.",
  },
  {
    id: "hard_q",
    level: 2,
    label: "Hard question",
    hint: "Control, pause before you answer.",
    context:
      "You are a skeptical operator. Ask one hard question: why growth is slow, why this team, or why now. Wait. Push once if they ramble.",
  },
  {
    id: "seed",
    level: 3,
    label: "Investor",
    hint: "Pressure, seed partner, live.",
    context:
      "You are a skeptical seed investor. Interrupt naturally. Push on moat, traction, and the ask. After each answer, one sentence of critique.",
  },
];

const emptyQuota: QuotaState = {
  feature: "practice",
  label: "practice rounds",
  used: 0,
  limit: 0,
  remaining: 0,
  unlimited: false,
  exhausted: true,
};

export default function PracticePage() {
  const rec = usePracticeRecorder();
  const [round, setRound] = useState(ROUNDS[0]);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(true);
  const [lastEvalId, setLastEvalId] = useState<string | null>(null);
  const [labRecs, setLabRecs] = useState<
    { key: string; title: string; sound?: string; why?: string; fix_line?: string; description?: string }[]
  >([]);
  const [locked, setLocked] = useState<QuotaState | undefined>(undefined);
  const [quota, setQuota] = useState<QuotaState | undefined>(undefined);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .quota()
      .then((q) => {
        const state = q.features?.practice;
        setQuota(state);
        if (state?.exhausted) setLocked(state);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api
      .exercises()
      .then((d) => setLabRecs(d.recommended || []))
      .catch(() => setLabRecs([]));
  }, []);

  useEffect(() => {
    if (!lastEvalId) return;
    api
      .session(lastEvalId)
      .then((d) => {
        if (d.lab_recs?.length) setLabRecs(d.lab_recs);
      })
      .catch(() => undefined);
  }, [lastEvalId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.practiceStart(round.context);
      setHistory(res.history);
      setScores(res.scores);
      if (res.quota) setQuota(res.quota);
    } catch (e) {
      // A spent allowance is a gate, not an error, swap the screen, do not
      // shout in red.
      if (e instanceof QuotaError) setLocked(e.quota ?? { ...emptyQuota });
      else setError(e instanceof Error ? e.message : "Could not start the round.");
    } finally {
      setBusy(false);
    }
  };

  const sendText = async (text: string) => {
    const msg = text.trim();
    if (!msg || !history.length) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.practiceTurn({
        pitch_context: round.context,
        history,
        founder_message: msg,
      });
      setHistory(res.history);
      setScores(res.scores);
      setInput("");
    } catch (e) {
      if (e instanceof QuotaError) setLocked(e.quota ?? { ...emptyQuota });
      else setError(e instanceof Error ? e.message : "Could not send that answer.");
    } finally {
      setBusy(false);
    }
  };

  const finishVoice = async () => {
    if (!history.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await rec.stop();
      if (!result || result.blob.size < 800) {
        setError("Too short, speak, then stop.");
        setBusy(false);
        return;
      }
      const uploaded = await api.upload(result.blob, `Practice · ${round.label}`, "practice", {
        exercise_key: "investor_qa_answer",
        exercise_title: round.label,
        exercise_category: "practice",
        exercise_description: round.hint,
        focus_note: round.context.slice(0, 400),
      });
      setLastEvalId(uploaded.session_id);
      const spoken = result.transcript.trim();
      if (!spoken) {
        setError("No live transcript, type a one-line summary to keep the chat going. Recording is saved.");
        setBusy(false);
        return;
      }
      const res = await api.practiceTurn({
        pitch_context: round.context,
        history,
        founder_message: spoken,
      });
      setHistory(res.history);
      setScores(res.scores);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice answer failed");
    } finally {
      setBusy(false);
    }
  };

  const started = history.length > 0;

  /* Out of free rounds: the gate replaces the page rather than sitting under a
     form they can no longer submit. */
  if (locked && !started) {
    return (
      <div className="mx-auto max-w-2xl pt-4 md:pt-10">
        <PageHeader
          eyebrow="Practice"
          title="Communication under pressure"
          sub="Someone asks. You answer out loud, under real time pressure."
        />
        <div className="pt-8">
          <UpgradeGate
            quota={locked}
            title="You have used your free practice rounds"
            body="Investor practice runs a live model on every answer, so the free tier covers a couple of rounds. Pro removes the cap."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-2 pt-4 md:pt-10">
      <PageHeader
        eyebrow="Practice"
        title="Communication under pressure"
        sub="Someone asks. You answer out loud. Each spoken answer still gets a full local report."
        actions={<QuotaMeter quota={quota} />}
      />

      {locked && started && (
        <div className="pt-4">
          <UpgradeGate
            quota={locked}
            title="That was your last free round"
            body="Your transcript above stays. Pro removes the cap so you can keep going."
          />
        </div>
      )}

      <FeatureIntro
        id="intro-practice"
        title="This is Practice."
        body="A conversation partner that pushes back. Pick the heat, answer with your voice, and see how your delivery holds when you have not rehearsed."
      />

      {!started && (
        <>
          <section className="fv-enter space-y-4 pt-6">
            <p className="fv-eyebrow-quiet">Choose the heat</p>
            <div className="space-y-1">
              {ROUNDS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRound(r)}
                  className={`fv-lift -mx-3 flex w-[calc(100%+1.5rem)] items-baseline justify-between gap-4 rounded-[var(--r-md)] px-3 py-3 text-left ${
                    round.id === r.id ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <span>
                    <span
                      className={`text-[15px] ${
                        round.id === r.id ? "font-medium text-[var(--ink)]" : "text-[var(--ink-dim)]"
                      }`}
                    >
                      Level {r.level}: {r.label}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[var(--muted)]">{r.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="pt-6">
            <HeroButton onClick={() => void start()} disabled={busy}>
              {busy ? "Starting…" : `Start ${round.label.toLowerCase()}`}
            </HeroButton>
          </div>
        </>
      )}

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

      {started && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="fv-eyebrow-quiet">
              Level {round.level} · {round.label}
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              Restart round
            </button>
          </div>

          {/* The conversation, as conversation, not a form. */}
          <div className="fv-scroll max-h-[400px] space-y-6 pt-4">
            {history.map((m, i) => {
              const mine = m.role === "user" || m.role === "founder";
              return (
                <div key={i} className={mine ? "pl-8 md:pl-16" : ""}>
                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                    {mine ? "You" : round.label}
                  </p>
                  <p
                    className={`text-[15px] leading-relaxed ${
                      mine ? "text-[var(--ink-dim)]" : "fv-display text-[1.05rem] text-[var(--ink)]"
                    }`}
                  >
                    {m.content}
                  </p>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <Divider />

          <div className="flex gap-1.5">
            <Chip selected={voice} onClick={() => setVoice(true)}>
              Speak
            </Chip>
            <Chip selected={!voice} onClick={() => setVoice(false)}>
              Type
            </Chip>
          </div>

          <div className="pt-4">
            {voice ? (
              <PracticeRecorderBar
                recording={rec.recording}
                starting={rec.starting}
                elapsed={rec.elapsed}
                stream={rec.stream}
                liveTranscript={rec.liveTranscript}
                startLabel="Answer out loud"
                disabled={busy}
                onStart={() => void rec.start()}
                onStop={() => void finishVoice()}
              />
            ) : (
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendText(input);
                    }
                  }}
                  placeholder="Type your answer…"
                  className="flex-1 rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-5 py-3 text-[14px] outline-none placeholder:text-[var(--faint)] focus:bg-[rgba(244,243,251,0.07)]"
                />
                <button
                  type="button"
                  onClick={() => void sendText(input)}
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="fv-hero !h-[46px] !w-[46px] !px-0"
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </div>

          {busy && <p className="pt-3 text-[13px] text-[var(--muted)]">Thinking…</p>}

          {lastEvalId && (
            <Link
              href={`/sessions/${lastEvalId}`}
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--accent)]"
            >
              Open the report for your last spoken answer <ArrowRight size={13} />
            </Link>
          )}

          {scores && (
            <div className="pt-6">
              <Disclosure label="How that round scored" sub="Model estimates from the conversation.">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {Object.entries(scores).map(([k, v]) => (
                    <Stat key={k} label={k.replace(/_/g, " ")} value={Math.round(Number(v))} />
                  ))}
                </div>
              </Disclosure>
            </div>
          )}
        </>
      )}

      {labRecs.length > 0 && (
        <>
          <Divider />
          <section className="fv-enter space-y-5">
            <p className="fv-eyebrow-quiet">Train what showed up</p>
            {labRecs.slice(0, 2).map((lab) => (
              <Link key={lab.key} href={`/trainer?lab=${encodeURIComponent(lab.key)}`} className="group block">
                <p className="text-[14.5px] leading-relaxed text-[var(--ink-dim)] transition-colors group-hover:text-[var(--ink)]">
                  {lab.sound || lab.why || lab.fix_line || lab.description}
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
    </div>
  );
}
