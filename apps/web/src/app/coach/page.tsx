"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Button,
  Chip,
  Disclosure,
  Divider,
  ErrorBanner,
  EstimateNote,
  HeroLink,
  LoadingState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { api, type MemoryData, type VoiceProgramData } from "@/lib/api";
import { memoryDigest, splitTarget } from "@/lib/insight";
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  INTENSITY_OPTIONS,
  LENGTH_OPTIONS,
  STYLE_OPTIONS,
  usePrefs,
  type FocusKey,
  type GoalKey,
} from "@/lib/prefs";

const PROFILE_LABELS: Record<string, string> = {
  voice_warmth: "Voice warmth",
  voice_resonance: "Voice resonance",
  projection: "Projection",
  pitch_stability: "Pitch stability",
  pitch_range: "Pitch range",
  speaking_energy: "Speaking energy",
  articulation: "Articulation",
  clarity: "Clarity",
  authority: "Authority",
  executive_presence: "Executive presence",
  trustworthiness: "Trustworthiness",
  persuasiveness: "Persuasiveness",
  pronunciation: "Pronunciation",
  technical_communication: "Technical communication",
  pause_control: "Pause control",
  breathing_quality: "Breathing quality",
  storytelling: "Storytelling",
  conversation_flow: "Conversation flow",
  monotone_level: "Monotone level",
  voice_fatigue: "Voice fatigue",
};

const HIGHLIGHT = [
  "executive_presence",
  "clarity",
  "projection",
  "articulation",
  "pause_control",
  "technical_communication",
];

export default function CoachPage() {
  const { prefs, update } = usePrefs();
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
    load().catch((e) => setError(e instanceof Error ? e.message : "Could not load your coach"));
  }, []);

  const setGoal = async (goal_key: GoalKey) => {
    setBusy(true);
    update({ goal: goal_key });
    try {
      setProgram(await api.setVoiceGoal(goal_key));
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
      setFillerMsg(`Added “${phrase}”. The next analysis will flag it.`);
    } catch (e) {
      setFillerMsg(e instanceof Error ? e.message : "Could not add that phrase");
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
      setFillerMsg(e instanceof Error ? e.message : "Could not remove that phrase");
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (confirmText !== "DELETE") {
      setResetMsg("Type DELETE in the box to confirm.");
      return;
    }
    if (
      !window.confirm(
        "This permanently deletes all recordings, Voice Memory, and practice history. Continue?",
      )
    ) {
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

  if (error && !program) return <ErrorBanner message={error} />;
  if (!memory || !program) return <LoadingState label="Opening your coach…" />;

  const scores = program.profile.scores || {};
  const deltas = program.profile.deltas || {};
  const inverse = new Set(program.profile.inverse_keys || ["monotone_level", "voice_fatigue"]);
  const digest = memoryDigest(memory);
  /* Missions arrive as a headline plus a measurable target. Older rows may
     still carry the target inline. Split it back out either way. */
  const missionTitle = splitTarget(program.mission.title);
  const missionTarget = program.mission.target || missionTitle.target;

  return (
    <div className="mx-auto max-w-2xl space-y-2 pt-4 md:pt-10">
      <PageHeader
        eyebrow="Coach"
        title="Your development"
        sub="What you are training for, what the product has learned about your voice, and how it should talk to you."
      />

      {error && <ErrorBanner message={error} />}

      {/* ------------------------------------------------------ the mission */}
      <section className="fv-enter fv-halo pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="fv-eyebrow">Today’s mission</p>
          {program.mission.completed && <span className="fv-pill fv-pill-done">Done today</span>}
        </div>
        <h2 className="mt-3 fv-lede">{missionTitle.text || program.mission.title}</h2>
        {missionTarget && (
          <p className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className="fv-pill fv-pill-accent">{missionTarget}</span>
            <span className="text-[12.5px] text-[var(--faint)]">what “done well” measures</span>
          </p>
        )}
        {program.mission.why && (
          <p className="mt-3.5 max-w-lg text-[14px] leading-relaxed text-[var(--muted)]">
            {program.mission.why}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <HeroLink href="/trainer">Practice in Labs</HeroLink>
          <button
            type="button"
            disabled={busy || program.mission.completed}
            onClick={() => void completeMission()}
            className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--ink)] disabled:opacity-50"
          >
            {program.mission.completed ? "Marked done" : "Mark it done"}
          </button>
        </div>
      </section>

      <Divider />

      {/* -------------------------------------------------- what we remember */}
      <section className="fv-enter">
        <p className="fv-eyebrow-quiet mb-4">Your communication patterns</p>
        {digest.thin ? (
          <p className="text-[13.5px] text-[var(--muted)]">
            We are still learning your voice. A few more sessions and this fills in.
          </p>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2">
            <PatternGroup title="Strengths" lines={digest.strengths} />
            <PatternGroup title="Recurring" lines={digest.recurring} />
            <PatternGroup title="Improving" lines={digest.improving} />
            <PatternGroup title="Needs attention" lines={digest.attention} />
          </div>
        )}
      </section>

      <Divider />

      {/* --------------------------------------------------- what you aim at */}
      <section className="fv-enter">
        <p className="fv-eyebrow-quiet mb-3">What you are speaking for</p>
        <p className="mb-4 text-[13px] text-[var(--muted)]">
          This sets your training priorities and what Today recommends.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {GOAL_OPTIONS.map((g) => (
            <Chip
              key={g.key}
              selected={program.goal.goal_key === g.key}
              onClick={() => void setGoal(g.key)}
            >
              {g.label}
            </Chip>
          ))}
        </div>
      </section>

      <Divider />

      {/* ------------------------------------------------------- preferences */}
      <section className="fv-enter space-y-7">
        <div>
          <p className="fv-eyebrow-quiet mb-3">How the coach should talk to you</p>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map((s) => (
              <Chip key={s.key} selected={prefs.style === s.key} onClick={() => update({ style: s.key })}>
                {s.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2.5 text-[12.5px] text-[var(--muted)]">
            {STYLE_OPTIONS.find((s) => s.key === prefs.style)?.blurb}
          </p>
        </div>

        <div>
          <p className="fv-eyebrow-quiet mb-3">How hard you want to work</p>
          <div className="flex flex-wrap gap-1.5">
            {INTENSITY_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                selected={prefs.intensity === o.key}
                onClick={() => update({ intensity: o.key })}
              >
                {o.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2.5 text-[12.5px] text-[var(--muted)]">
            {INTENSITY_OPTIONS.find((o) => o.key === prefs.intensity)?.blurb}
          </p>
        </div>

        <div>
          <p className="fv-eyebrow-quiet mb-3">How long a session should be</p>
          <div className="flex flex-wrap gap-1.5">
            {LENGTH_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                selected={prefs.sessionLength === o.key}
                onClick={() => update({ sessionLength: o.key })}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="fv-eyebrow-quiet mb-3">What you want watched most</p>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_OPTIONS.map((f) => {
              const on = prefs.focus.includes(f.key);
              return (
                <Chip
                  key={f.key}
                  selected={on}
                  onClick={() =>
                    update({
                      focus: on
                        ? prefs.focus.filter((x) => x !== f.key)
                        : ([...prefs.focus, f.key] as FocusKey[]),
                    })
                  }
                >
                  {f.label}
                </Chip>
              );
            })}
          </div>
        </div>

        <div>
          <p className="fv-eyebrow-quiet mb-3">What should we call you</p>
          <input
            value={prefs.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="First name (optional)"
            className="w-full max-w-xs rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:bg-[rgba(244,243,251,0.07)]"
          />
        </div>
      </section>

      <Divider />

      {/* ----------------------------------------------------- deeper detail */}
      <Disclosure label="Your voice profile" sub="Long-term estimates across every dimension we measure.">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {HIGHLIGHT.map((key) => {
            const val = scores[key];
            const delta = deltas[key];
            return (
              <Stat
                key={key}
                label={PROFILE_LABELS[key] || key}
                value={val != null ? Math.round(Number(val)) : "—"}
                hint={
                  delta != null
                    ? `${inverse.has(key) ? (delta >= 0 ? "better " : "watch ") : delta >= 0 ? "+" : ""}${delta} vs baseline`
                    : undefined
                }
              />
            );
          })}
        </div>
        <details>
          <summary className="cursor-pointer text-[13px] text-[var(--muted)]">
            All {Object.keys(PROFILE_LABELS).length} dimensions
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {Object.keys(PROFILE_LABELS).map((key) => (
              <div key={key}>
                <div className="text-[11px] text-[var(--muted)]">{PROFILE_LABELS[key]}</div>
                <div className="fv-num mt-0.5 text-[14px]">
                  {scores[key] != null ? Math.round(Number(scores[key])) : "—"}
                  {deltas[key] != null && (
                    <span className="ml-2 text-[11px] text-[var(--accent)]">
                      {Number(deltas[key]) >= 0 ? "+" : ""}
                      {deltas[key]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
        <EstimateNote>
          {program.profile.note || program.philosophy} Based on{" "}
          {program.profile.sessions_counted || 0} sessions.
        </EstimateNote>
      </Disclosure>

      <Disclosure label="Your development plan" sub="The weaknesses being trained, in priority order.">
        <ul className="space-y-6">
          {program.plan.map((item) => (
            <li key={item.weakness_key}>
              <p className="text-[15px] font-medium">{item.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--muted)]">{item.why}</p>
              {item.exercise && (
                <Link
                  href={`/trainer?lab=${encodeURIComponent(item.exercise.key)}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-[var(--accent)]"
                >
                  {item.exercise.title} <ArrowRight size={13} />
                </Link>
              )}
              {item.expected_gain && Object.keys(item.expected_gain).length > 0 && (
                <p className="mt-2 text-[12px] text-[var(--faint)]">
                  Expected:{" "}
                  {Object.entries(item.expected_gain)
                    .map(([k, v]) => `${PROFILE_LABELS[k] || k} ${v > 0 ? "+" : ""}${v}`)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
          {!program.plan.length && (
            <li className="text-[13px] text-[var(--muted)]">
              Record a few sessions so the plan can find real weaknesses.
            </li>
          )}
        </ul>
      </Disclosure>

      {(program.profile.hard_words || []).length > 0 && (
        <Disclosure label="Words that trip you up" sub="Practise slow → normal → presentation speed.">
          <div className="flex flex-wrap gap-2">
            {program.profile.hard_words!.map((w) => (
              <span
                key={w.word}
                className="rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-3.5 py-1.5 text-[13px]"
              >
                {w.word} <span className="text-[var(--faint)]">×{w.count}</span>
              </span>
            ))}
          </div>
          <Link
            href="/trainer?lab=hard_word_ladder"
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--accent)]"
          >
            Open the Hard Word Ladder <ArrowRight size={13} />
          </Link>
        </Disclosure>
      )}

      <Disclosure label="Filler words to flag" sub="Your own phrases, merged with the built-in list.">
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
            className="min-w-[220px] flex-1 rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:bg-[rgba(244,243,251,0.07)]"
          />
          <Button variant="secondary" disabled={busy || !fillerInput.trim()} onClick={() => void addFiller()}>
            Add
          </Button>
        </div>
        {fillerCustom.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {fillerCustom.map((p) => (
              <button
                key={p}
                type="button"
                disabled={busy}
                onClick={() => void removeFiller(p)}
                title="Remove"
                className="rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-3.5 py-1.5 text-[13px] hover:text-[var(--danger)]"
              >
                {p} <span className="text-[var(--faint)]">×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--muted)]">
            No custom phrases yet. The built-in list still applies.
          </p>
        )}
        <details>
          <summary className="cursor-pointer text-[13px] text-[var(--muted)]">Built-in list</summary>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[var(--faint)]">
            {fillerBuiltin.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </details>
        {fillerMsg && <p className="text-[13px] text-[var(--emerald)]">{fillerMsg}</p>}
      </Disclosure>

      <Disclosure label="Recent sessions" sub="The last few takes Voice Memory learned from.">
        <div className="space-y-1">
          {(memory.recent_sessions || []).map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="fv-lift -mx-3 flex items-center justify-between rounded-[var(--r-md)] px-3 py-2.5 text-[13.5px]"
            >
              <span>{s.title || s.id.slice(0, 8)}</span>
              <span className="fv-num text-[var(--muted)]">{s.wpm ?? "—"} WPM</span>
            </Link>
          ))}
          {!memory.recent_sessions?.length && (
            <p className="text-[13px] text-[var(--muted)]">No sessions yet.</p>
          )}
        </div>
      </Disclosure>

      <Disclosure label="Fresh start" sub="Permanently delete everything this product knows about you.">
        <p className="text-[13.5px] leading-relaxed text-[var(--danger)]">
          This deletes every recording, your Voice Profile, the training plan, missions and practice
          history from this machine. It cannot be undone.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="min-w-[200px] rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:bg-[rgba(244,243,251,0.07)]"
          />
          <Button variant="danger" disabled={busy || confirmText !== "DELETE"} onClick={() => void wipe()}>
            {busy ? "Deleting…" : "Delete all my data"}
          </Button>
        </div>
        {resetMsg && (
          <p
            className={`text-[13px] ${
              resetMsg.toLowerCase().includes("deleted") || resetMsg.toLowerCase().includes("removed")
                ? "text-[var(--emerald)]"
                : "text-[var(--danger)]"
            }`}
          >
            {resetMsg}
          </p>
        )}
      </Disclosure>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
        <p className="text-[13px] text-[var(--muted)]">
          Team seats, priority coaching and rollout support.
        </p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("fv-open-contact", { detail: { interest: "upgrade" } }))
          }
          className="text-[13px] text-[var(--accent)]"
        >
          Talk to us about Pro
        </button>
      </div>
    </div>
  );
}

function PatternGroup({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">{title}</p>
      <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
        {lines.slice(0, 3).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
