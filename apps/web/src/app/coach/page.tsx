"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Stat } from "@/components/ui";
import { api, type MemoryData, type VoiceProgramData } from "@/lib/api";

const PROFILE_LABELS: Record<string, string> = {
  voice_warmth: "Voice Warmth",
  voice_resonance: "Voice Resonance",
  projection: "Projection",
  pitch_stability: "Pitch Stability",
  pitch_range: "Pitch Range",
  speaking_energy: "Speaking Energy",
  articulation: "Articulation",
  clarity: "Clarity",
  authority: "Authority",
  executive_presence: "Executive Presence",
  trustworthiness: "Trustworthiness",
  persuasiveness: "Persuasiveness",
  pronunciation: "Pronunciation",
  technical_communication: "Technical Communication",
  pause_control: "Pause Control",
  breathing_quality: "Breathing Quality",
  storytelling: "Storytelling",
  conversation_flow: "Conversation Flow",
  monotone_level: "Monotone Level",
  voice_fatigue: "Voice Fatigue",
};

const HIGHLIGHT = [
  "executive_presence",
  "clarity",
  "projection",
  "articulation",
  "pause_control",
  "technical_communication",
  "voice_resonance",
  "monotone_level",
];

export default function CoachPage() {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [program, setProgram] = useState<VoiceProgramData | null>(null);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [fillerCustom, setFillerCustom] = useState<string[]>([]);
  const [fillerBuiltin, setFillerBuiltin] = useState<string[]>([]);
  const [fillerInput, setFillerInput] = useState("");
  const [fillerMsg, setFillerMsg] = useState("");

  const load = async () => {
    const [m, p, f] = await Promise.all([api.memory(), api.voiceProgram(), api.fillers()]);
    setMemory(m);
    setProgram(p);
    setFillerCustom(f.custom || []);
    setFillerBuiltin(f.builtin || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const setGoal = async (goal_key: string) => {
    setBusy(true);
    try {
      const p = await api.setVoiceGoal(goal_key);
      setProgram(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set goal");
    } finally {
      setBusy(false);
    }
  };

  const completeMission = async () => {
    setBusy(true);
    try {
      const mission = await api.completeMission();
      setProgram((prev) => (prev ? { ...prev, mission } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const addFiller = async () => {
    const phrase = fillerInput.trim();
    if (!phrase) return;
    setBusy(true);
    setFillerMsg("");
    try {
      const f = await api.addFiller(phrase);
      setFillerCustom(f.custom || []);
      setFillerBuiltin(f.builtin || []);
      setFillerInput("");
      setFillerMsg(`Added “${phrase}”. Next analysis will flag it.`);
    } catch (e) {
      setFillerMsg(e instanceof Error ? e.message : "Could not add filler");
    } finally {
      setBusy(false);
    }
  };

  const removeFiller = async (phrase: string) => {
    setBusy(true);
    setFillerMsg("");
    try {
      const f = await api.removeFiller(phrase);
      setFillerCustom(f.custom || []);
      setFillerBuiltin(f.builtin || []);
      setFillerMsg(`Removed “${phrase}”.`);
    } catch (e) {
      setFillerMsg(e instanceof Error ? e.message : "Could not remove filler");
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (confirmText !== "DELETE") {
      setResetMsg('Type DELETE in the box to confirm.');
      return;
    }
    if (!window.confirm("This permanently deletes all recordings, Voice Memory, and practice history. Continue?")) {
      return;
    }
    setBusy(true);
    setResetMsg("");
    try {
      const res = await api.freshStart();
      setConfirmText("");
      setResetMsg(
        `${res.message} Removed ${res.deleted.sessions} sessions and ${res.deleted.files} files.`,
      );
      await load();
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : "Failed to delete data");
    } finally {
      setBusy(false);
    }
  };

  if (error && !program) return <p className="text-[var(--danger)]">{error}</p>;
  if (!memory || !program) return <p className="text-[var(--muted)]">Loading elite coach…</p>;

  const scores = program.profile.scores || {};
  const deltas = program.profile.deltas || {};
  const inverse = new Set(program.profile.inverse_keys || ["monotone_level", "voice_fatigue"]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-4xl">Elite Voice Coach</h2>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Train the strongest version of your own voice — not a different accent or personality.
          </p>
        </div>
      </header>

      <Panel className="flex flex-wrap items-center justify-between gap-3 border-[var(--accent)]/35">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Pro Plan</div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Team seats, priority coaching, and rollout support — talk to us.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("fv-open-contact", { detail: { interest: "upgrade" } }))
          }
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a1510]"
        >
          Upgrade to Pro
        </button>
      </Panel>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <Panel className="space-y-3 border-[var(--accent)]/30">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Today&apos;s Mission</div>
        <h3 className="font-[family-name:var(--font-display)] text-2xl">{program.mission.title}</h3>
        {program.mission.why && <p className="text-sm text-[var(--muted)]">{program.mission.why}</p>}
        <div className="flex flex-wrap gap-2">
          {program.mission.exercise_key && (
            <Link
              href="/trainer"
              className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white"
            >
              Practice in Labs
            </Link>
          )}
          <button
            type="button"
            disabled={busy || program.mission.completed}
            onClick={() => void completeMission()}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-50"
          >
            {program.mission.completed ? "Completed ✓" : "Mark mission done"}
          </button>
        </div>
      </Panel>

      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Voice Goal</h3>
        <p className="text-sm text-[var(--muted)]">Changes coaching priorities for your training plan.</p>
        <div className="flex flex-wrap gap-2">
          {program.goals.map((g) => (
            <button
              key={g.key}
              type="button"
              disabled={busy}
              onClick={() => void setGoal(g.key)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                program.goal.goal_key === g.key
                  ? "bg-[var(--accent)] text-[#1a1510]"
                  : "border border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Personal Voice Profile</h3>
          <span className="text-xs text-[var(--muted)]">
            {program.profile.sessions_counted || 0} sessions · estimates
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHT.map((key) => {
            const val = scores[key];
            const delta = deltas[key];
            const label = PROFILE_LABELS[key] || key;
            const hint =
              delta != null
                ? `${inverse.has(key) ? (delta >= 0 ? "better" : "watch") : delta >= 0 ? "+" : ""}${delta}`
                : undefined;
            return (
              <Stat
                key={key}
                label={label}
                value={val != null ? Math.round(Number(val)) : "—"}
                hint={hint != null ? `vs baseline ${hint}` : "Build with more sessions"}
              />
            );
          })}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-[var(--muted)]">All profile dimensions</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(PROFILE_LABELS).map((key) => (
              <div key={key} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                <div className="text-[var(--muted)]">{PROFILE_LABELS[key]}</div>
                <div className="font-medium">
                  {scores[key] != null ? Math.round(Number(scores[key])) : "—"}
                  {deltas[key] != null && (
                    <span className="ml-2 text-xs text-[var(--accent)]">
                      {Number(deltas[key]) >= 0 ? "+" : ""}
                      {deltas[key]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
        <p className="mt-3 text-xs text-[var(--muted)]">{program.profile.note || program.philosophy}</p>
      </Panel>

      <Panel>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Voice Development Program</h3>
        <ul className="space-y-3">
          {program.plan.map((item) => (
            <li key={item.weakness_key} className="rounded-xl border border-[var(--line)] p-4">
              <div className="font-semibold">{item.title}</div>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.why}</p>
              {item.exercise && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    Exercise: <strong>{item.exercise.title}</strong> ({item.exercise.category})
                  </span>
                  <Link href="/trainer" className="text-[var(--accent)] hover:underline">
                    Train now
                  </Link>
                </div>
              )}
              {item.expected_gain && Object.keys(item.expected_gain).length > 0 && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Expected:{" "}
                  {Object.entries(item.expected_gain)
                    .map(([k, v]) => `${PROFILE_LABELS[k] || k} ${v > 0 ? "+" : ""}${v}`)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
          {!program.plan.length && (
            <li className="text-sm text-[var(--muted)]">
              Record a few sessions so the program can detect weaknesses.
            </li>
          )}
        </ul>
      </Panel>

      {(program.profile.hard_words || []).length > 0 && (
        <Panel>
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Pronunciation list</h3>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Practice slow → normal → presentation speed. Finish every syllable.
          </p>
          <div className="flex flex-wrap gap-2">
            {program.profile.hard_words!.map((w) => (
              <span
                key={w.word}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm"
              >
                {w.word}{" "}
                <span className="text-[var(--muted)]">×{w.count}</span>
              </span>
            ))}
          </div>
          <Link href="/trainer" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
            Open Hard Word Ladder in Labs →
          </Link>
        </Panel>
      )}

      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Custom filler words</h3>
        <p className="text-sm text-[var(--muted)]">
          Add phrases you want flagged in every analysis (Record, Labs, Practice, Smart Session). Merged with
          built-ins.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={fillerInput}
            onChange={(e) => setFillerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addFiller();
              }
            }}
            placeholder='e.g. "so", "I mean", "right?"'
            className="min-w-[220px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            disabled={busy || !fillerInput.trim()}
            onClick={() => void addFiller()}
            className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add filler
          </button>
        </div>
        {fillerCustom.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fillerCustom.map((p) => (
              <button
                key={p}
                type="button"
                disabled={busy}
                onClick={() => void removeFiller(p)}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm hover:border-[var(--danger)]"
                title="Remove"
              >
                {p} <span className="text-[var(--muted)]">×</span>
              </button>
            ))}
          </div>
        )}
        {!fillerCustom.length && (
          <p className="text-sm text-[var(--muted)]">No custom fillers yet — built-ins still apply.</p>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-[var(--muted)]">Built-in fillers</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {fillerBuiltin.map((p) => (
              <span key={p} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
                {p}
              </span>
            ))}
          </div>
        </details>
        {fillerMsg && <p className="text-sm text-[var(--accent-2)]">{fillerMsg}</p>}
      </Panel>

      <Panel>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">What I remember</h3>
        <ul className="space-y-2 text-sm leading-relaxed">
          {(memory.insights || []).map((i, idx) => (
            <li key={idx} className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3">
              {i}
            </li>
          ))}
          {(memory.top_patterns || []).slice(0, 5).map((p) => (
            <li key={p.key} className="rounded-xl border border-[var(--line)] p-3">
              <strong>{p.label}.</strong> Appeared in {p.frequency} sessions.
            </li>
          ))}
          {!memory.insights?.length && !memory.top_patterns?.length && (
            <li className="text-[var(--muted)]">Record sessions so Voice Memory can form patterns.</li>
          )}
        </ul>
      </Panel>

      <Panel>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Recent sessions</h3>
        <div className="space-y-2">
          {(memory.recent_sessions || []).map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
            >
              <span>{s.title || s.id.slice(0, 8)}</span>
              <span className="text-[var(--muted)]">WPM {s.wpm ?? "—"}</span>
            </Link>
          ))}
          {!memory.recent_sessions?.length && (
            <p className="text-sm text-[var(--muted)]">No sessions yet.</p>
          )}
        </div>
      </Panel>

      <Panel className="border-[rgba(196,92,74,0.35)]">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--danger)]">
          Fresh start
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Permanently delete recordings, Voice Profile, training plan, missions, and practice history.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type DELETE to confirm'
            className="min-w-[200px] rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--danger)]"
          />
          <button
            disabled={busy || confirmText !== "DELETE"}
            onClick={() => void wipe()}
            className="rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete all my data"}
          </button>
        </div>
        {resetMsg && (
          <p
            className={`mt-3 text-sm ${
              resetMsg.toLowerCase().includes("deleted") || resetMsg.toLowerCase().includes("removed")
                ? "text-[var(--accent-2)]"
                : "text-[var(--danger)]"
            }`}
          >
            {resetMsg}
          </p>
        )}
      </Panel>
    </div>
  );
}
