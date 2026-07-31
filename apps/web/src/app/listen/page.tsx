"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ear, Radio, RefreshCw, Settings2 } from "lucide-react";
import { Panel, Stat } from "@/components/ui";
import { useSmartSession } from "@/hooks/useSmartSession";
import { api, type ListeningRow } from "@/lib/api";
import { fmtTime } from "@/lib/utils";

export default function SmartListenPage() {
  const s = useSmartSession();
  const [showSettings, setShowSettings] = useState(false);
  const [past, setPast] = useState<ListeningRow[]>([]);
  const active =
    s.status === "listening" ||
    s.status === "recording" ||
    s.status === "analyzing" ||
    s.status === "starting" ||
    s.status === "ending" ||
    Boolean(s.listeningId && s.status !== "ended");

  useEffect(() => {
    const load = () =>
      api
        .listListening()
        .then(setPast)
        .catch(() => undefined);
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [s.status, s.listeningId]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">FounderVoice AI</p>
        <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl">Smart Session</h2>
        <p className="max-w-2xl text-[var(--muted)]">
          Start once. Conversations are detected, separated, and analyzed automatically — audio stays on this
          machine.
        </p>
      </header>

      <AnimatePresence>
        {s.banner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-[var(--accent)]/40 bg-[rgba(196,163,90,0.12)] px-4 py-3 text-sm"
          >
            {s.banner}
          </motion.div>
        )}
      </AnimatePresence>

      {s.newMicPrompt && active && (
        <Panel className="!border-[var(--accent-2)]/50">
          <p className="font-medium">New microphone detected: {s.newMicPrompt.label}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-[var(--accent-2)] px-3 py-2 text-sm text-white"
              onClick={() => {
                void s.switchMic(s.newMicPrompt!.deviceId, s.newMicPrompt!.label);
                s.setNewMicPrompt(null);
              }}
            >
              Switch Now
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              onClick={() => s.setNewMicPrompt(null)}
            >
              Keep Current Device
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              onClick={() => {
                s.updatePrefs({
                  preferredDeviceId: s.newMicPrompt!.deviceId,
                  alwaysUsePreferred: true,
                });
                void s.switchMic(s.newMicPrompt!.deviceId, s.newMicPrompt!.label);
                s.setNewMicPrompt(null);
              }}
            >
              Always Use Preferred Device
            </button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  active && s.status !== "ending"
                    ? "bg-[var(--accent-2)] shadow-[0_0_12px_rgba(61,143,110,0.8)]"
                    : "bg-[var(--muted)]"
                }`}
              />
              <div>
                <div className="text-sm font-medium">
                  {active ? "Session Active" : s.status === "ended" ? "Session Ended" : "Ready"}
                </div>
                <div className="text-xs text-[var(--muted)]">{s.uiStatus}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!active && s.status !== "ending" && !s.listeningId && (
                <button
                  type="button"
                  onClick={() => void s.startSession()}
                  disabled={s.status === "starting"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-2)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Ear size={16} /> Start Session
                </button>
              )}
              {(active || s.listeningId) && s.status !== "ended" && s.status !== "starting" && (
                <button
                  type="button"
                  onClick={() => void s.endSession()}
                  disabled={s.status === "ending"}
                  className="rounded-xl bg-[var(--danger)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  End Session
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm text-[var(--muted)]"
              >
                <Settings2 size={16} /> Settings
              </button>
            </div>
          </div>

          {s.message && <p className="text-sm text-[var(--danger)]">{s.message}</p>}

          <AnimatePresence mode="wait">
            {s.convFlash && (
              <motion.p
                key={s.convFlash}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-[var(--accent)]"
              >
                {s.convFlash === "started" ? "🎙 Conversation Started" : "✓ Conversation Saved"}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="Conversations"
              value={s.detail?.conversations.length ?? s.detail?.listening.conversation_count ?? 0}
            />
            <Stat label="Status" value={active ? "Listening…" : s.status === "ended" ? "Done" : "Idle"} />
            <Stat
              label="Sample rate"
              value={s.vadSnap ? `${Math.round(s.vadSnap.sampleRate / 1000)} kHz` : "—"}
            />
          </div>

          {showSettings && (
            <div className="space-y-4 border-t border-[var(--line)] pt-4">
              <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Detection thresholds</p>
              <label className="block text-sm">
                Speech to start (sec)
                <input
                  type="number"
                  min={1}
                  max={15}
                  step={0.5}
                  value={s.prefs.speechStartSec}
                  onChange={(e) => s.updatePrefs({ speechStartSec: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
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
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
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
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.prefs.alwaysUsePreferred}
                  onChange={(e) => s.updatePrefs({ alwaysUsePreferred: e.target.checked })}
                />
                Auto-switch to preferred mic when it appears
              </label>
            </div>
          )}
        </Panel>

        <Panel className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Radio size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Active Device</span>
            </div>
            <button
              type="button"
              onClick={() => void s.refreshMics()}
              className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl leading-tight">
            {s.activeMicLabel || "No microphone"}
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Signal Quality</dt>
              <dd>{s.vadSnap?.signalQuality ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Input Level</dt>
              <dd className="font-mono tracking-tight text-[var(--accent)]">{s.levelBar}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Sample Rate</dt>
              <dd>{s.vadSnap ? `${(s.vadSnap.sampleRate / 1000).toFixed(1)} kHz` : "—"}</dd>
            </div>
          </dl>

          <label className="block text-sm">
            Microphone
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
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
            Preferred (auto)
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
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
            Backup on disconnect
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
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
          <p className="text-xs text-[var(--muted)]">
            Built-in, USB, XLR interfaces, Bluetooth, DJI Mic, Rode, Hollyland, BOYA, Fifine, Maono — any OS
            audio input.
          </p>
        </Panel>
      </div>

      {(s.detail?.conversations.length ?? 0) > 0 && (
        <Panel>
          <h3 className="font-[family-name:var(--font-display)] text-2xl">Conversations</h3>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {s.detail!.conversations.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link href={`/sessions/${c.id}`} className="font-medium hover:text-[var(--accent)]">
                    {c.title}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">
                    {new Date(c.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {fmtTime(c.duration || 0)} · {c.status}
                  </div>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {c.wpm != null ? `${Math.round(c.wpm)} WPM` : "—"}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {s.summary && (
        <Panel className="space-y-4">
          <h3 className="font-[family-name:var(--font-display)] text-2xl">Session Summary</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Session Duration" value={s.summary.session_duration_label} />
            <Stat label="Meaningful Conversations" value={s.summary.meaningful_conversations} />
            <Stat label="Speaking Time" value={s.summary.speaking_time_label} />
            <Stat label="Average WPM" value={s.summary.average_wpm ?? "—"} />
          </div>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-[var(--muted)]">Most Common Weakness</span>
              <br />
              {s.summary.most_common_weakness}
            </p>
            <p>
              <span className="text-[var(--muted)]">Most Improved Skill</span>
              <br />
              {s.summary.most_improved_skill}
            </p>
            <p>
              <span className="text-[var(--muted)]">Today&apos;s Highest ROI Recommendation</span>
              <br />
              {s.summary.highest_roi_recommendation}
            </p>
          </div>
        </Panel>
      )}

      <Panel>
        <h3 className="font-[family-name:var(--font-display)] text-2xl">Past Smart Sessions</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Stored locally in SQLite. Open a session to see every conversation.
        </p>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {past.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/listen/${row.id}`} className="font-medium hover:text-[var(--accent)]">
                  {row.title || "Work session"}
                </Link>
                <div className="text-xs text-[var(--muted)]">
                  {new Date(row.created_at).toLocaleString()} · {row.status} ·{" "}
                  {row.conversation_count} conversations · {fmtTime(row.speaking_time_sec || 0)} speaking
                </div>
              </div>
              {row.summary?.average_wpm != null && (
                <div className="text-sm text-[var(--muted)]">{Math.round(row.summary.average_wpm)} avg WPM</div>
              )}
            </li>
          ))}
          {!past.length && (
            <li className="py-3 text-[var(--muted)]">No Smart Sessions yet. Start one above.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
