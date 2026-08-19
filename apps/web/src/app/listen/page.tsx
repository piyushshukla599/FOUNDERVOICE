"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ear, RefreshCw, Sparkles, Square } from "lucide-react";
import {
  Button,
  Disclosure,
  EstimateNote,
  ErrorBanner,
  InsightCard,
  LinkButton,
  PageHeader,
  SectionTitle,
  Stat,
  Steps,
} from "@/components/ui";
import { FeatureIntro } from "@/components/FeatureIntro";
import { RecommendedLabs } from "@/components/RecommendedLabs";
import { useSmartSession } from "@/hooks/useSmartSession";
import { api, type ListeningRow } from "@/lib/api";
import { classifyMic, micProfileLabel, micTips } from "@/lib/micProfile";
import { fmtTime } from "@/lib/utils";

export default function ListenPage() {
  const s = useSmartSession();
  const [past, setPast] = useState<ListeningRow[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const active =
    s.status === "listening" ||
    s.status === "recording" ||
    s.status === "analyzing" ||
    s.status === "starting" ||
    s.status === "ending" ||
    Boolean(s.listeningId && s.status !== "ended");

  const micProfile = useMemo(() => classifyMic(s.activeMicLabel || ""), [s.activeMicLabel]);
  const tips = useMemo(() => micTips(micProfile), [micProfile]);
  const summary = s.summary;
  const verdict = summary?.verdict;
  const verdictReady = verdict?.status === "ready";

  /* Session clock, driven off the server-side start time. */
  useEffect(() => {
    const startedAt = s.detail?.listening.created_at;
    if (!active || !startedAt) return;
    const t0 = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [active, s.detail?.listening.created_at]);

  useEffect(() => {
    const load = () =>
      api
        .listListening()
        .then(setPast)
        .catch(() => undefined);
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [s.status, s.listeningId]);

  const tryUnlockVerdict = async () => {
    if (!s.listeningId) return;
    try {
      await api.unlockVerdict(s.listeningId);
      window.location.reload();
    } catch {
      /* the drill may genuinely not be recorded yet */
    }
  };

  const conversationCount =
    s.detail?.conversations.length ?? s.detail?.listening.conversation_count ?? 0;

  /* ------------------------------------------------------- listening state */
  if (active) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                s.status === "ending" ? "bg-[var(--muted)]" : "fv-rec-dot bg-[var(--emerald)]"
              }`}
            />
            <div>
              <p className="text-[13px] font-medium">
                {s.status === "ending" ? "Wrapping up…" : "Listening"}
              </p>
              <p className="text-[12px] text-[var(--muted)]">{s.uiStatus}</p>
            </div>
          </div>
          <Button variant="danger" disabled={s.status === "ending"} onClick={() => void s.endSession()}>
            <Square size={15} /> End session
          </Button>
        </div>

        {s.message && <ErrorBanner message={s.message} />}

        <section className="fv-enter fv-halo space-y-7 py-4">
          <div className="grid grid-cols-3 gap-6">
            <Stat label="Elapsed" value={fmtTime(elapsed)} />
            <Stat label="Conversations" value={conversationCount} tone="accent" />
            <Stat label="Microphone" value={s.vadSnap?.signalQuality ?? "—"} hint={s.activeMicLabel || undefined} />
          </div>

          <div>
            <p className="fv-eyebrow-quiet">Input level</p>
            <p className="mt-1 font-mono text-[13px] tracking-tight text-[var(--accent)]">{s.levelBar}</p>
          </div>

          <AnimatePresence mode="wait">
            {s.convFlash && (
              <motion.p
                key={s.convFlash}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px] text-[var(--accent)]"
              >
                {s.convFlash === "started" ? "Conversation started" : "Conversation saved"}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-[13px] text-[var(--muted)]">
            Talk normally. We capture short clips when you speak and stay quiet the rest of the time.
            Nothing leaves this machine.
          </p>
        </section>

        {s.newMicPrompt && (
          <section className="fv-enter space-y-3 rounded-[var(--r-lg)] bg-[var(--emerald-soft)] p-5">
            <p className="text-[14px] font-medium">New microphone detected: {s.newMicPrompt.label}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  void s.switchMic(s.newMicPrompt!.deviceId, s.newMicPrompt!.label);
                  s.setNewMicPrompt(null);
                }}
              >
                Switch now
              </Button>
              <Button variant="secondary" size="sm" onClick={() => s.setNewMicPrompt(null)}>
                Keep current
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  s.updatePrefs({ preferredDeviceId: s.newMicPrompt!.deviceId, alwaysUsePreferred: true });
                  void s.switchMic(s.newMicPrompt!.deviceId, s.newMicPrompt!.label);
                  s.setNewMicPrompt(null);
                }}
              >
                Always use this one
              </Button>
            </div>
          </section>
        )}

        {conversationCount > 0 && (
          <section className="fv-enter">
            <SectionTitle title="Captured so far" />
            <ul className="divide-y divide-[var(--line)]">
              {(s.detail?.conversations || []).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link href={`/sessions/${c.id}`} className="text-[14px] hover:text-[var(--accent)]">
                    {c.title}
                  </Link>
                  <span className="text-[12px] text-[var(--muted)]">
                    {fmtTime(c.duration || 0)} · {c.wpm != null ? `${Math.round(c.wpm)} WPM` : c.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------ idle state */
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Listen"
        title="Listen observes your real conversations"
        sub="Meetings, calls, and everyday talk — the way you actually speak when you are not being graded."
      />

      <FeatureIntro
        id="intro-listen"
        title="This is Listen."
        body="It observes your real conversations instead of a prepared recording. Start it once, talk normally, and end it when you are done."
        steps={[
          "Start Listen and put your headset or earbuds on.",
          "Talk normally — we capture short clips when you speak.",
          "End the session when you are finished.",
          "Complete the recommended Lab with the same mic.",
          "Get your real-world Founder Voice Verdict.",
        ]}
      />

      {s.message && <ErrorBanner message={s.message} />}

      {!summary && (
        <section className="fv-enter fv-halo space-y-6 py-4">
          <SectionTitle
            title="Ready when you are"
            sub="One tap, then forget about it. The verdict comes after you also record a Lab drill, so we can compare real talk against controlled practice."
          />
          <Steps
            items={[
              "Start Listen.",
              "Talk normally.",
              "We collect short conversation clips.",
              "End the session.",
              "Complete a Lab.",
              "Get your real-world Founder Voice Verdict.",
            ]}
          />
          <Button size="lg" disabled={s.status === "starting"} onClick={() => void s.startSession()}>
            <Ear size={16} /> {s.status === "starting" ? "Starting…" : "Start Listen"}
          </Button>
          <p className="text-[12px] text-[var(--faint)]">
            Using: {s.activeMicLabel || "default microphone"} · {micProfileLabel(micProfile)}
          </p>
        </section>
      )}

      {/* ------------------------------------------------------ summary */}
      {summary && (
        <>
          <SectionTitle eyebrow="Session ended" title="Your real-world communication" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Duration" value={summary.session_duration_label} />
            <Stat label="Conversations" value={summary.meaningful_conversations} />
            <Stat label="Speaking time" value={summary.speaking_time_label} />
            <Stat label="Average pace" value={summary.average_wpm ?? "—"} hint="WPM" tone="accent" />
          </div>

          {verdictReady ? (
            <InsightCard
              eyebrow="Founder Voice Verdict"
              title={verdict.headline}
              why={verdict.verdict}
              meta={
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        Real conversations
                      </p>
                      <p className="mt-1 fv-display text-3xl tabular-nums text-[var(--accent)]">
                        {verdict.founder_voice_score ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        Controlled practice
                      </p>
                      <p className="mt-1 fv-display text-3xl tabular-nums">{verdict.exercise_score ?? "—"}</p>
                    </div>
                  </div>
                  {(verdict.insights || []).length > 0 && (
                    <ul className="space-y-1 text-[13px] text-[var(--ink-dim)]">
                      {(verdict.insights || []).map((line) => (
                        <li key={line}>· {line}</li>
                      ))}
                    </ul>
                  )}
                  {verdict.mic_note && <EstimateNote>Microphone: {verdict.mic_note}</EstimateNote>}
                </div>
              }
              action={
                verdict.top_fix ? (
                  <LinkButton href="/trainer">
                    <Sparkles size={15} /> Work on this
                  </LinkButton>
                ) : undefined
              }
            />
          ) : (
            <section className="fv-enter fv-halo space-y-3 py-4">
              <p className="fv-eyebrow">Your verdict is waiting</p>
              <h2 className="fv-display text-xl">
                {verdict?.headline || "One drill away from your verdict."}
              </h2>
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
                {verdict?.why ||
                  "Complete the recommended Lab with the same microphone. We compare your real-world speech against controlled practice — that gap is the insight."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <LinkButton href="/trainer">Open recommended Lab</LinkButton>
                <button
                  type="button"
                  onClick={() => void tryUnlockVerdict()}
                  className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Already drilled? Refresh verdict
                </button>
              </div>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <section className="fv-enter">
              <p className="fv-eyebrow-quiet">Most common weakness</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed">{summary.most_common_weakness}</p>
            </section>
            <section className="fv-enter">
              <p className="fv-eyebrow-quiet">Most improved</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed">{summary.most_improved_skill}</p>
            </section>
            <section className="fv-enter">
              <p className="fv-eyebrow-quiet">Highest-ROI fix today</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed">{summary.highest_roi_recommendation}</p>
            </section>
          </div>

          <RecommendedLabs items={summary.lab_recs || []} heading="Train what we heard" />

          <Button size="lg" disabled={s.status === "starting"} onClick={() => void s.startSession()}>
            <Ear size={16} /> Start another session
          </Button>
        </>
      )}

      <Disclosure label="Microphone and detection settings" sub="Device, backup device, and how sensitive capture is.">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="fv-display text-lg">{s.activeMicLabel || "No microphone"}</p>
            <p className="text-[12px] text-[var(--accent)]">{micProfileLabel(micProfile)}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void s.refreshMics()}>
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>
        <ul className="space-y-1 text-[12px] text-[var(--muted)]">
          {tips.slice(0, 2).map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>

        <label className="block text-sm">
          Microphone
          <select
            className="fv-input mt-1"
            value={s.activeMicId}
            onChange={(e) => {
              const mic = s.mics.find((m) => m.deviceId === e.target.value);
              void s.switchMic(e.target.value, mic?.label);
            }}
          >
            {s.mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Preferred device (used automatically when present)
          <select
            className="fv-input mt-1"
            value={s.prefs.preferredDeviceId}
            onChange={(e) => s.updatePrefs({ preferredDeviceId: e.target.value })}
          >
            <option value="">None</option>
            {s.mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Backup if the mic disconnects
          <select
            className="fv-input mt-1"
            value={s.prefs.backupDeviceId}
            onChange={(e) => s.updatePrefs({ backupDeviceId: e.target.value })}
          >
            <option value="">Any available</option>
            {s.mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            Speech to start (sec)
            <input
              type="number"
              min={1}
              max={15}
              step={0.5}
              value={s.prefs.speechStartSec}
              onChange={(e) => s.updatePrefs({ speechStartSec: Number(e.target.value) })}
              className="fv-input mt-1"
            />
          </label>
          <label className="block text-sm">
            Silence to end (sec)
            <input
              type="number"
              min={1.5}
              max={30}
              step={0.5}
              value={s.prefs.silenceEndSec}
              onChange={(e) => s.updatePrefs({ silenceEndSec: Number(e.target.value) })}
              className="fv-input mt-1"
            />
          </label>
          <label className="block text-sm">
            Min conversation (sec)
            <input
              type="number"
              min={3}
              max={120}
              step={1}
              value={s.prefs.minConversationSec}
              onChange={(e) => s.updatePrefs({ minConversationSec: Number(e.target.value) })}
              className="fv-input mt-1"
            />
          </label>
        </div>
        <p className="text-[12px] text-[var(--muted)]">
          Works with built-in, USB, XLR interfaces, Bluetooth and wireless mics — anything the OS lists
          as an audio input.
        </p>
      </Disclosure>

      {past.length > 0 && (
        <section className="fv-enter">
          <SectionTitle title="Past Listen sessions" sub="Stored locally. Open one to see every conversation." />
          <ul className="divide-y divide-[var(--line)]">
            {past.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link href={`/listen/${row.id}`} className="text-[14px] font-medium hover:text-[var(--accent)]">
                    {row.title || "Work session"}
                  </Link>
                  <div className="text-[12px] text-[var(--muted)]">
                    {new Date(row.created_at).toLocaleString()} · {row.conversation_count} conversations ·{" "}
                    {fmtTime(row.speaking_time_sec || 0)} speaking
                  </div>
                </div>
                {row.summary?.average_wpm != null && (
                  <span className="text-[13px] text-[var(--muted)]">
                    {Math.round(row.summary.average_wpm)} avg WPM
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
