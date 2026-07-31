"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, Stat } from "@/components/ui";
import { PracticeRecorderBar } from "@/components/PracticeRecorderBar";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { api } from "@/lib/api";

type Msg = { role: string; content: string };

const SCENARIOS = [
  {
    id: "seed",
    label: "Seed round",
    context:
      "We're raising a seed round for FounderVoice AI — a local-first speaking coach for founders and executives. Differentiator is Voice Memory (longitudinal patterns), not one-off scores. Audio stays on-device; coaching uses an LLM on text only.",
  },
  {
    id: "series_a",
    label: "Series A",
    context:
      "Series A pitch: B2B SaaS for executive communication coaching. Traction: early paying teams, strong retention on weekly practice. Seeking capital to expand enterprise sales and deepen acoustic analysis.",
  },
  {
    id: "demo_day",
    label: "Demo day",
    context:
      "Demo day: 2-minute pitch. Problem = founders sound unsure under pressure. Solution = local recording + causal coaching + Voice Memory. Ask = intros to design partners and follow-on capital.",
  },
  {
    id: "custom",
    label: "Custom",
    context: "",
  },
];

export default function PracticePage() {
  const router = useRouter();
  const rec = usePracticeRecorder();
  const solo = usePracticeRecorder();
  const [scenario, setScenario] = useState(SCENARIOS[0].id);
  const [context, setContext] = useState(SCENARIOS[0].context);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answerMode, setAnswerMode] = useState<"voice" | "type">("voice");
  const [savedSessions, setSavedSessions] = useState<string[]>([]);
  const [lastEvalId, setLastEvalId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    const s = SCENARIOS.find((x) => x.id === scenario);
    if (s && s.id !== "custom") setContext(s.context);
  }, [scenario]);

  const start = async () => {
    setBusy(true);
    setError("");
    setSavedSessions([]);
    try {
      const res = await api.practiceStart(context.trim() || "I am pitching my startup.");
      setHistory(res.history);
      setScores(res.scores);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start — is the API running?");
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
        pitch_context: context,
        history,
        founder_message: msg,
      });
      setHistory(res.history);
      setScores(res.scores);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const finishVoiceAnswer = async () => {
    if (!history.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await rec.stop();
      if (!result || result.blob.size < 800) {
        setError("Answer too short — hold and speak, then stop.");
        setBusy(false);
        return;
      }
      let spoken = result.transcript.trim();
      const title = `Practice · Investor answer · ${new Date().toLocaleString()}`;
      const uploaded = await api.upload(result.blob, title, "practice", {
        exercise_key: "investor_qa_answer",
        exercise_title: "Investor Q&A answer",
        exercise_category: "practice",
        exercise_description: "Spoken answer in AI investor practice — full voice evaluation.",
        focus_note: context.slice(0, 400),
      });
      setSavedSessions((prev) => [uploaded.session_id, ...prev].slice(0, 8));
      setLastEvalId(uploaded.session_id);

      if (!spoken) {
        spoken =
          input.trim() ||
          "(Spoken answer recorded — transcript unavailable in this browser; see session analysis.)";
        if (!input.trim()) {
          setError(
            "No live transcript (browser speech API). Recording was saved for analysis — type a short summary of what you said to continue the investor chat, or open the session.",
          );
        }
      }

      if (spoken && !spoken.startsWith("(Spoken")) {
        const res = await api.practiceTurn({
          pitch_context: context,
          history,
          founder_message: spoken,
        });
        setHistory(res.history);
        setScores(res.scores);
        setInput("");
        setError("");
      } else if (input.trim()) {
        await sendText(input);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice answer failed — is the API running?");
    } finally {
      setBusy(false);
    }
  };

  const finishSoloEval = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await solo.stop();
      if (!result || result.blob.size < 1000) {
        setError("Recording too short for full evaluation.");
        setBusy(false);
        return;
      }
      const title = `Practice · Full pitch · ${new Date().toLocaleString()}`;
      const uploaded = await api.upload(result.blob, title, "practice", {
        exercise_key: "full_pitch_eval",
        exercise_title: "Full pitch evaluation",
        exercise_category: "practice",
        exercise_description: "Same full analysis engine as Record — dedicated practice session result.",
        focus_note: context.slice(0, 400) || "Practice pitch evaluation",
      });
      router.push(`/sessions/${uploaded.session_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed — is the API running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-[family-name:var(--font-display)] text-4xl">AI practice mode</h2>
        <p className="mt-2 text-[var(--muted)]">
          Every spoken answer gets the same full voice evaluation as Record — plus investor scoring.
          Open each result as its own session report.
        </p>
      </header>

      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Full evaluation (like Record)</h3>
        <p className="text-sm text-[var(--muted)]">
          Record a pitch or answer. You get WPM, clarity, professional presence, coach summary — same
          engine as Record — saved as a dedicated Practice session.
        </p>
        <PracticeRecorderBar
          recording={solo.recording}
          starting={solo.starting}
          elapsed={solo.elapsed}
          stream={solo.stream}
          liveTranscript={solo.liveTranscript}
          startLabel="Record full evaluation"
          disabled={busy || rec.recording}
          onStart={() => void solo.start()}
          onStop={() => void finishSoloEval()}
        />
        {solo.error && <p className="text-sm text-[var(--danger)]">{solo.error}</p>}
      </Panel>

      {lastEvalId && (
        <Panel>
          <p className="text-sm">
            Latest spoken answer is running full analysis.{" "}
            <Link href={`/sessions/${lastEvalId}`} className="text-[var(--accent)] hover:underline">
              Open Practice session report →
            </Link>
          </p>
        </Panel>
      )}

      <Panel className="space-y-3">
        <label className="text-xs uppercase tracking-wider text-[var(--muted)]">Scenario</label>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                scenario === s.id
                  ? "bg-[var(--accent)] text-[#1a1510]"
                  : "border border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="text-xs uppercase tracking-wider text-[var(--muted)]">Pitch context</label>
        <textarea
          value={context}
          onChange={(e) => {
            setScenario("custom");
            setContext(e.target.value);
          }}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {history.length ? "Restart practice" : "Start investor Q&A"}
        </button>
      </Panel>

      {scores && (
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.entries(scores).map(([k, v]) => (
            <Stat key={k} label={k} value={Math.round(Number(v))} />
          ))}
        </div>
      )}

      <Panel className="min-h-[360px] space-y-4">
        <div className="mb-2 max-h-[360px] space-y-3 overflow-y-auto">
          {history.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-sm ${
                m.role === "user" || m.role === "founder"
                  ? "ml-8 border border-[var(--accent-2)]/40 bg-[rgba(61,143,110,0.1)]"
                  : "mr-8 border border-[var(--line)] bg-[var(--bg-elevated)]"
              }`}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {m.role === "assistant" ? "Investor" : "You"}
              </div>
              {m.content}
            </div>
          ))}
          {!history.length && (
            <p className="text-sm text-[var(--muted)]">Start a session, then answer by voice or text.</p>
          )}
          <div ref={chatEndRef} />
        </div>

        {history.length > 0 && (
          <>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setAnswerMode("voice")}
                className={`rounded-lg px-3 py-1 ${
                  answerMode === "voice" ? "bg-[var(--bg-soft)] text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                Voice answer
              </button>
              <button
                type="button"
                onClick={() => setAnswerMode("type")}
                className={`rounded-lg px-3 py-1 ${
                  answerMode === "type" ? "bg-[var(--bg-soft)] text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                Type answer
              </button>
            </div>

            {answerMode === "voice" ? (
              <PracticeRecorderBar
                recording={rec.recording}
                starting={rec.starting}
                elapsed={rec.elapsed}
                stream={rec.stream}
                liveTranscript={rec.liveTranscript}
                startLabel="Record your answer"
                disabled={busy}
                onStart={() => void rec.start()}
                onStop={() => void finishVoiceAnswer()}
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
                  placeholder="Type your answer to the investor…"
                  className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => void sendText(input)}
                  disabled={busy || !history.length}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a1510] disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            )}
          </>
        )}

        {(error || rec.error) && (
          <p className="text-sm text-[var(--danger)]">{error || rec.error}</p>
        )}
        {busy && <p className="text-sm text-[var(--muted)]">Working…</p>}

        {savedSessions.length > 0 && (
          <div className="border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
            Full evaluations (same as Record):{" "}
            {savedSessions.map((id, i) => (
              <span key={id}>
                {i > 0 && " · "}
                <Link href={`/sessions/${id}`} className="text-[var(--accent)] hover:underline">
                  Answer {i + 1}
                </Link>
              </span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
