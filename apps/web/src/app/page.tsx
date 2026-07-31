"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Pause, Play, Square, Upload, Mic, Hand, RotateCcw, Trash2 } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { LiveCoachPanel } from "@/components/LiveCoachPanel";
import { Panel, Stat } from "@/components/ui";
import { api } from "@/lib/api";
import { useLiveCoach } from "@/hooks/useLiveCoach";
import { listMics, openMicrophone, type MicDevice } from "@/lib/mic";
import { MAX_UPLOAD_LABEL, assertUploadSize, formatBytes } from "@/lib/upload";

export default function RecordPage() {
  const router = useRouter();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [autoStop, setAutoStop] = useState(false); // off by default — was stopping pitches during natural pauses
  const [liveCoach, setLiveCoach] = useState(true);
  const [coachReady, setCoachReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [title, setTitle] = useState("Pitch practice");
  const [mode, setMode] = useState("pitch");
  const [status, setStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [health, setHealth] = useState<{ deepseek_configured: boolean; whisper_model: string } | null>(null);
  const [patterns, setPatterns] = useState<{ key: string; label: string; frequency: number }[]>([]);
  const [mics, setMics] = useState<MicDevice[]>([]);
  const [micId, setMicId] = useState("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const silenceTimer = useRef<number | null>(null);
  const silenceWatch = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const elapsedTimer = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const recordingRef = useRef(false);
  const pausedRef = useRef(false);
  const coachDelay = useRef<number | null>(null);
  const startingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const micIdRef = useRef("");
  const autoStopRef = useRef(false);
  const pushToTalkRef = useRef(false);

  const live = useLiveCoach({
    stream,
    active: recording && liveCoach && coachReady,
    paused,
    patterns,
    elapsedSec: elapsed,
  });

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);
  useEffect(() => {
    micIdRef.current = micId;
  }, [micId]);
  useEffect(() => {
    autoStopRef.current = autoStop;
    if (!autoStop) clearSilenceWatch();
  }, [autoStop]);
  useEffect(() => {
    pushToTalkRef.current = pushToTalk;
  }, [pushToTalk]);

  useEffect(() => {
    api.health().then((h) => setHealth(h)).catch(() => setHealth(null));
    api
      .memory()
      .then((m) => setPatterns(m.top_patterns || []))
      .catch(() => setPatterns([]));

    // Enumerate only — do NOT open the mic on load (that caused hangs on Windows).
    void listMics()
      .then((list) => {
        setMics(list);
        if (list[0]?.deviceId) setMicId(list[0].deviceId);
        setStatus(
          list.length
            ? `Found ${list.length} mic(s). Click Start to record.`
            : "No mic listed yet — click Start (browser may ask once).",
        );
      })
      .catch(() => setStatus("Click Start to open the microphone."));
  }, []);

  const clearSilenceWatch = () => {
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
    if (silenceWatch.current) window.clearInterval(silenceWatch.current);
    silenceWatch.current = null;
  };

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (audioCtx.current) {
      void audioCtx.current.close().catch(() => undefined);
    }
    audioCtx.current = null;
    analyser.current = null;
  }, []);

  const finalize = useCallback(async () => {
    clearSilenceWatch();
    if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
    const mr = mediaRecorder.current;
    if (!mr || mr.state === "inactive") {
      stopTracks();
      setRecording(false);
      setPaused(false);
      pushToTalkRef.current = false;
      setPushToTalk(false);
      setStarting(false);
      startingRef.current = false;
      return;
    }
    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      try {
        mr.stop();
      } catch {
        resolve();
      }
    });
    const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
    chunks.current = [];
    setRecording(false);
    setPaused(false);
    pushToTalkRef.current = false;
    setPushToTalk(false);
    stopTracks();
    if (coachDelay.current) window.clearTimeout(coachDelay.current);
    setCoachReady(false);
    setStarting(false);
    startingRef.current = false;
    try {
      assertUploadSize(blob);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Recording too large");
      return;
    }
    setStatus("Uploading & analyzing…");
    try {
      const res = await api.upload(blob, title || "Untitled session", mode);
      setStatus("Queued. Opening session…");
      router.push(`/sessions/${res.session_id}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    }
  }, [mode, title, stopTracks, router]);

  const watchSilence = useCallback(() => {
    if (!autoStopRef.current || pushToTalkRef.current || !analyser.current) return;
    clearSilenceWatch();
    const data = new Uint8Array(analyser.current.fftSize);
    const MIN_RECORD_MS = 8000; // don't auto-stop in the first 8s
    const SILENCE_MS = 6000; // 6s of quiet (not 2.5s)
    const RMS_THRESHOLD = 0.012; // quieter = more tolerant of soft speech

    silenceWatch.current = window.setInterval(() => {
      if (!analyser.current || !recordingRef.current || pausedRef.current) return;
      if (!autoStopRef.current || pushToTalkRef.current) return;
      if (Date.now() - startedAt.current < MIN_RECORD_MS) return;

      analyser.current.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / (data.length / 4));
      if (rms < RMS_THRESHOLD) {
        if (!silenceTimer.current) {
          silenceTimer.current = window.setTimeout(() => {
            if (recordingRef.current && autoStopRef.current && !pushToTalkRef.current) {
              setStatus("Auto-stopped after silence — uploading…");
              void finalize();
            }
          }, SILENCE_MS);
        }
      } else if (silenceTimer.current) {
        window.clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }
    }, 500);
  }, [finalize]);

  const startRecording = async (opts?: { pushToTalk?: boolean }) => {
    if (startingRef.current || recordingRef.current) return;
    const isPtt = opts?.pushToTalk ?? false;
    if (isPtt) {
      pushToTalkRef.current = true;
      setPushToTalk(true);
      clearSilenceWatch();
    }
    startingRef.current = true;
    setStarting(true);
    chunks.current = [];
    setCoachReady(false);
    setStatus("Opening microphone…");
    try {
      stopTracks();

      const media = await openMicrophone(micIdRef.current || undefined);
      // Refresh device list now that permission is live
      void listMics().then((list) => {
        setMics(list);
        if (!micIdRef.current && list[0]?.deviceId) setMicId(list[0].deviceId);
      });

      streamRef.current = media;
      setStream(media);

      const ctx = new AudioContext();
      if (ctx.state === "suspended") await ctx.resume();
      const source = ctx.createMediaStreamSource(media);
      const a = ctx.createAnalyser();
      a.fftSize = 256;
      source.connect(a);
      audioCtx.current = ctx;
      analyser.current = a;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined;
      const mr = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      mediaRecorder.current = mr;
      mr.start(1000);

      recordingRef.current = true;
      setRecording(true);
      setPaused(false);
      startedAt.current = Date.now();
      setElapsed(0);
      setStatus("Recording…");
      if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
      elapsedTimer.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }, 1000);
      if (autoStopRef.current && !isPtt) {
        window.setTimeout(() => watchSilence(), 500);
      }
      if (coachDelay.current) window.clearTimeout(coachDelay.current);
      coachDelay.current = window.setTimeout(() => setCoachReady(true), 300);
    } catch (e) {
      recordingRef.current = false;
      setRecording(false);
      pushToTalkRef.current = false;
      setPushToTalk(false);
      stopTracks();
      setStatus(e instanceof Error ? e.message : "Mic permission denied");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  const pauseResume = () => {
    const mr = mediaRecorder.current;
    if (!mr) return;
    if (mr.state === "recording") {
      mr.pause();
      setPaused(true);
      clearSilenceWatch();
    } else if (mr.state === "paused") {
      mr.resume();
      setPaused(false);
      if (autoStopRef.current && !pushToTalkRef.current) watchSilence();
    }
  };

  const discardRecording = useCallback(async () => {
    clearSilenceWatch();
    if (coachDelay.current) window.clearTimeout(coachDelay.current);
    setCoachReady(false);
    if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
    const mr = mediaRecorder.current;
    if (mr && mr.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mr.onstop = () => resolve();
        try {
          mr.stop();
        } catch {
          resolve();
        }
      });
    }
    chunks.current = [];
    mediaRecorder.current = null;
    stopTracks();
    recordingRef.current = false;
    startingRef.current = false;
    setStarting(false);
    setRecording(false);
    setPaused(false);
    pushToTalkRef.current = false;
    setPushToTalk(false);
    setElapsed(0);
    setStatus("Recording discarded.");
  }, [stopTracks]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      assertUploadSize(file);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "File too large");
      return;
    }
    setStatus(`Uploading ${formatBytes(file.size)}…`);
    try {
      const res = await api.upload(file, title || file.name, mode);
      router.push(`/sessions/${res.session_id}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">FounderVoice AI</p>
        <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl">Record with intention</h2>
        <p className="max-w-2xl text-[var(--muted)]">
          Not a passive recorder — an active driving instructor for your voice. Live Coach adapts while you speak.
          For all-day auto-detection, use{" "}
          <a href="/listen" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Smart Session
          </a>
          .
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Whisper" value={health?.whisper_model || "…"} hint="Local ASR" />
        <Stat label="AI Executive Coach" value="Ready" hint="Local analysis + coaching" />
        <Stat label="Elapsed" value={`${elapsed}s`} hint={recording ? (paused ? "Paused" : "Live") : "Idle"} />
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-[220px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Session title"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="pitch">Pitch</option>
            <option value="practice">Practice</option>
            <option value="exercise">Exercise</option>
            <option value="free">Free</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[rgba(196,163,90,0.08)] px-3 py-2 text-sm text-[var(--accent)]">
            <input
              type="checkbox"
              checked={liveCoach}
              onChange={(e) => setLiveCoach(e.target.checked)}
            />
            Live Coach Mode
          </label>
          <select
            value={micId}
            onChange={(e) => setMicId(e.target.value)}
            className="min-w-[180px] max-w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
            title="Microphone"
          >
            {mics.length === 0 ? (
              <option value="">Default microphone</option>
            ) : (
              mics.map((m) => (
                <option key={m.deviceId || m.label} value={m.deviceId}>
                  {m.label}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            disabled={starting || recording}
            onClick={() => {
              void listMics()
                .then((list) => {
                  setMics(list);
                  if (list[0]?.deviceId && !list.find((x) => x.deviceId === micId)) {
                    setMicId(list[0].deviceId);
                  }
                  setStatus(list.length ? `Found ${list.length} mic(s).` : "No microphones found.");
                })
                .catch((e) => setStatus(e instanceof Error ? e.message : "Could not list mics"));
            }}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] disabled:opacity-50"
          >
            Refresh mics
          </button>
        </div>

        {recording && liveCoach && coachReady ? (
          <LiveCoachPanel
            stream={stream}
            active={recording && !paused}
            metrics={live.metrics}
            sentenceTip={live.sentenceTip}
            coachHint={live.coachHint}
            ghostHint={live.ghostHint}
            speechSupported={live.speechSupported}
          />
        ) : (
          <Waveform stream={stream} active={recording && !paused} />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!recording ? (
            <button
              onClick={() => void startRecording()}
              disabled={starting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Mic size={16} /> {starting ? "Starting…" : "Start"}
            </button>
          ) : (
            <>
              <button
                onClick={pauseResume}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm"
              >
                {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={() => void finalize()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Square size={16} /> Stop & analyze
              </button>
              <button
                onClick={() => {
                  void (async () => {
                    await discardRecording();
                    setStatus("");
                    await startRecording();
                  })();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent)]"
              >
                <RotateCcw size={16} /> Restart
              </button>
              <button
                onClick={() => void discardRecording()}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--muted)]"
              >
                <Trash2 size={16} /> Discard
              </button>
            </>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm">
            <Upload size={16} /> Drop / upload
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.flac"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] || null)}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]" title="Only when checked: stops and uploads after ~6s of silence (never in first 8s)">
            <input
              type="checkbox"
              checked={autoStop}
              onChange={(e) => {
                setAutoStop(e.target.checked);
                if (!e.target.checked) clearSilenceWatch();
                else if (recordingRef.current && !pushToTalkRef.current) watchSilence();
              }}
            />
            Auto-stop after long silence
          </label>

          <button
            type="button"
            disabled={starting}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!recordingRef.current) void startRecording({ pushToTalk: true });
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              if (pushToTalkRef.current && recordingRef.current) {
                pushToTalkRef.current = false;
                setPushToTalk(false);
                void finalize();
              }
            }}
            onPointerCancel={() => {
              if (pushToTalkRef.current && recordingRef.current) {
                pushToTalkRef.current = false;
                setPushToTalk(false);
                void finalize();
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent)] disabled:opacity-60 touch-none select-none"
          >
            <Hand size={16} /> {pushToTalk || starting ? "Hold to talk…" : "Push to talk"}
          </button>
        </div>

        <div
          className="mt-5 rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void onFile(f);
          }}
        >
          Drag & drop WAV / MP3 / M4A / FLAC here
          <span className="mt-2 block text-xs">Max file size {MAX_UPLOAD_LABEL}</span>
        </div>

        {status && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-4 text-sm ${
              /too large|timed out|denied|no mic|could not|error|fail/i.test(status)
                ? "text-[var(--danger)]"
                : "text-[var(--accent)]"
            }`}
          >
            {status}
          </motion.p>
        )}
      </Panel>
    </div>
  );
}
