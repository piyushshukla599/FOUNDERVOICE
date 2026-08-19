"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hand, Mic, Pause, Play, RotateCcw, Settings2, Square, Trash2, Upload } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { LiveCoachPanel } from "@/components/LiveCoachPanel";
import {
  Button,
  ChoiceCard,
  Disclosure,
  ErrorBanner,
  PageHeader,
  SectionTitle,
} from "@/components/ui";
import { FeatureIntro } from "@/components/FeatureIntro";
import { api } from "@/lib/api";
import { useLiveCoach } from "@/hooks/useLiveCoach";
import { listMics, openMicrophone, type MicDevice } from "@/lib/mic";
import { MAX_UPLOAD_LABEL, assertUploadSize, formatBytes } from "@/lib/upload";
import { fmtTime } from "@/lib/utils";

/** Modes described by what the user is doing, not by what the pipeline calls it. */
const MODES = [
  { key: "pitch", label: "A pitch", blurb: "Investor or customer pitch you want judged end to end." },
  { key: "practice", label: "A practice answer", blurb: "One question, answered the way you would live." },
  { key: "exercise", label: "An exercise", blurb: "A drill or warmup you are repeating deliberately." },
  { key: "free", label: "Free speech", blurb: "Talk it through. No structure expected." },
] as const;

export default function RecordPage() {
  const router = useRouter();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [autoStop, setAutoStop] = useState(false); // off by default — it was cutting pitches at natural pauses
  const [liveCoach, setLiveCoach] = useState(true);
  const [coachReady, setCoachReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [title, setTitle] = useState("Pitch practice");
  const [mode, setMode] = useState<string>("pitch");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
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
    api
      .memory()
      .then((m) => setPatterns(m.top_patterns || []))
      .catch(() => setPatterns([]));

    // Enumerate only — do NOT open the mic on load (that caused hangs on Windows).
    void listMics()
      .then((list) => {
        setMics(list);
        if (list[0]?.deviceId) setMicId(list[0].deviceId);
      })
      .catch(() => undefined);
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
    if (audioCtx.current) void audioCtx.current.close().catch(() => undefined);
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
    setUploading(true);
    setStatus("");
    try {
      const res = await api.upload(blob, title || "Untitled session", mode);
      router.push(`/sessions/${res.session_id}`);
    } catch (e) {
      setUploading(false);
      setStatus(e instanceof Error ? e.message : "Upload failed");
    }
  }, [mode, title, stopTracks, router]);

  const watchSilence = useCallback(() => {
    if (!autoStopRef.current || pushToTalkRef.current || !analyser.current) return;
    clearSilenceWatch();
    const data = new Uint8Array(analyser.current.fftSize);
    const MIN_RECORD_MS = 8000; // never auto-stop in the first 8s
    const SILENCE_MS = 6000; // 6s of quiet
    const RMS_THRESHOLD = 0.012; // tolerant of soft speech

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
    setStatus("");
    try {
      stopTracks();
      const media = await openMicrophone(micIdRef.current || undefined);
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
      if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
      elapsedTimer.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }, 1000);
      if (autoStopRef.current && !isPtt) window.setTimeout(() => watchSilence(), 500);
      if (coachDelay.current) window.clearTimeout(coachDelay.current);
      coachDelay.current = window.setTimeout(() => setCoachReady(true), 300);
    } catch (e) {
      recordingRef.current = false;
      setRecording(false);
      pushToTalkRef.current = false;
      setPushToTalk(false);
      stopTracks();
      setStatus(e instanceof Error ? e.message : "Microphone permission denied");
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
    setUploading(true);
    setStatus(`Uploading ${formatBytes(file.size)}…`);
    try {
      const res = await api.upload(file, title || file.name, mode);
      router.push(`/sessions/${res.session_id}`);
    } catch (e) {
      setUploading(false);
      setStatus(e instanceof Error ? e.message : "Upload failed");
    }
  };

  /* ------------------------------------------------------------ analyzing */
  if (uploading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Record" title="Analyzing your communication…" />
        <section className="fv-enter fv-halo space-y-2 py-6 text-center">
          <p className="mx-auto text-[14px] text-[var(--ink-dim)]">
            Transcribing locally, measuring delivery, then writing the coaching note. Your report opens
            by itself.
          </p>
          {status && <p className="text-[12px] text-[var(--muted)]">{status}</p>}
        </section>
      </div>
    );
  }

  /* ------------------------------------------------------------ recording */
  if (recording) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                paused ? "bg-[var(--muted)]" : "fv-rec-dot bg-[var(--danger)]"
              }`}
            />
            <div>
              <p className="text-[13px] font-medium">{paused ? "Paused" : "Recording"}</p>
              <p className="text-[12px] text-[var(--muted)]">{title || "Untitled session"}</p>
            </div>
          </div>
          <span className="fv-display text-3xl tabular-nums">{fmtTime(elapsed)}</span>
        </div>

        <section className="fv-enter fv-halo space-y-5 py-2">
          {liveCoach && coachReady ? (
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

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="danger" onClick={() => void finalize()}>
              <Square size={15} /> Stop &amp; analyze
            </Button>
            <Button variant="secondary" onClick={pauseResume}>
              {paused ? <Play size={15} /> : <Pause size={15} />} {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void (async () => {
                  await discardRecording();
                  setStatus("");
                  await startRecording();
                })();
              }}
            >
              <RotateCcw size={15} /> Restart
            </Button>
            <Button variant="ghost" onClick={() => void discardRecording()}>
              <Trash2 size={15} /> Discard
            </Button>
            <label className="ml-auto inline-flex items-center gap-2 text-[12px] text-[var(--muted)]">
              <input type="checkbox" checked={liveCoach} onChange={(e) => setLiveCoach(e.target.checked)} />
              Live coach
            </label>
          </div>
        </section>

        {status && <p className="text-[13px] text-[var(--danger)]">{status}</p>}
      </div>
    );
  }

  /* ---------------------------------------------------------------- setup */
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Record"
        title="Record and get a complete communication review"
        sub="Use this when you want the full read on something you prepared — a pitch, a talk, an answer, or thinking out loud."
      />

      <FeatureIntro
        id="intro-record"
        title="This is Record."
        body="Unlike the 60-second check on Today, Record is for the long form: a whole pitch or talk, with a live coach while you speak and a full report afterwards."
      />

      {status && <ErrorBanner message={status} />}

      <section className="fv-enter space-y-5">
        <SectionTitle title="What are you recording?" />
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <ChoiceCard
              key={m.key}
              title={m.label}
              blurb={m.blurb}
              selected={mode === m.key}
              onClick={() => setMode(m.key)}
            />
          ))}
        </div>

        <label className="block">
          <span className="text-[12px] text-[var(--muted)]">Name it (so Library makes sense later)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="fv-input mt-1"
            placeholder="Seed round pitch — v3"
          />
        </label>

        <label className="block">
          <span className="text-[12px] text-[var(--muted)]">Microphone</span>
          <select
            value={micId}
            onChange={(e) => setMicId(e.target.value)}
            className="fv-input mt-1"
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
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button size="lg" disabled={starting} onClick={() => void startRecording()}>
            <Mic size={16} /> {starting ? "Opening microphone…" : "Start recording"}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-strong)] px-4 py-2.5 text-sm">
            <Upload size={15} /> Upload a file
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.flac"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </section>

      <Disclosure label="Recording options" sub="Live coach, push-to-talk, auto-stop, and mic tools.">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <input type="checkbox" checked={liveCoach} onChange={(e) => setLiveCoach(e.target.checked)} />
          Live coach while I speak
          <span className="text-[12px] text-[var(--muted)]">— pace and filler hints, on screen</span>
        </label>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoStop}
            onChange={(e) => {
              setAutoStop(e.target.checked);
              if (!e.target.checked) clearSilenceWatch();
              else if (recordingRef.current && !pushToTalkRef.current) watchSilence();
            }}
          />
          Stop automatically after long silence
          <span className="text-[12px] text-[var(--muted)]">— about 6s, never in the first 8s</span>
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
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
            className="inline-flex touch-none select-none items-center gap-2 rounded-[var(--r-md)] border border-[var(--accent-line)] px-4 py-2.5 text-sm text-[var(--accent)] disabled:opacity-60"
          >
            <Hand size={15} /> {pushToTalk || starting ? "Hold to talk…" : "Push to talk"}
          </button>
          <Button
            variant="secondary"
            size="sm"
            disabled={starting}
            onClick={() => {
              void listMics()
                .then((list) => {
                  setMics(list);
                  if (list[0]?.deviceId && !list.find((x) => x.deviceId === micId)) setMicId(list[0].deviceId);
                })
                .catch(() => setStatus("Could not list microphones"));
            }}
          >
            <Settings2 size={14} /> Refresh mics
          </Button>
        </div>

        <div
          className="rounded-[var(--r-md)] border border-dashed border-[var(--line)] p-6 text-center text-[13px] text-[var(--muted)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void onFile(f);
          }}
        >
          Drag &amp; drop WAV / MP3 / M4A / FLAC here
          <span className="mt-1 block text-[11px]">Max file size {MAX_UPLOAD_LABEL}</span>
        </div>
      </Disclosure>
    </div>
  );
}
