"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ListeningDetail, type ListeningSummary } from "@/lib/api";
import { listMics, openMicrophone, type MicDevice } from "@/lib/mic";
import { loadMicPrefs, saveMicPrefs, type MicPrefs } from "@/lib/micPrefs";
import { SmartVad, type VadSnapshot } from "@/lib/smartVad";

export type ListenStatus =
  | "idle"
  | "starting"
  | "listening"
  | "recording"
  | "analyzing"
  | "ending"
  | "ended";

export type ToastDevice = {
  deviceId: string;
  label: string;
};

export function useSmartSession() {
  const [prefs, setPrefs] = useState<MicPrefs>(loadMicPrefs);
  const [mics, setMics] = useState<MicDevice[]>([]);
  const [activeMicId, setActiveMicId] = useState("");
  const [activeMicLabel, setActiveMicLabel] = useState("");
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [status, setStatus] = useState<ListenStatus>("idle");
  const [message, setMessage] = useState("");
  const [vadSnap, setVadSnap] = useState<VadSnapshot | null>(null);
  const [detail, setDetail] = useState<ListeningDetail | null>(null);
  const [summary, setSummary] = useState<ListeningSummary | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [newMicPrompt, setNewMicPrompt] = useState<ToastDevice | null>(null);
  const [convFlash, setConvFlash] = useState<"started" | "saved" | null>(null);

  const vadRef = useRef<SmartVad | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const listeningIdRef = useRef<string | null>(null);
  const convIndexRef = useRef(0);
  const knownDevicesRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef(prefs);
  const statusRef = useRef(status);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    listeningIdRef.current = listeningId;
  }, [listeningId]);

  const refreshMics = useCallback(async () => {
    const list = await listMics();
    setMics(list);
    knownDevicesRef.current = new Set(list.map((m) => m.deviceId));
    return list;
  }, []);

  useEffect(() => {
    void refreshMics().then((list) => {
      const p = loadMicPrefs();
      setPrefs(p);
      const preferred = list.find((m) => m.deviceId === p.preferredDeviceId);
      const first = preferred || list[0];
      if (first) {
        setActiveMicId(first.deviceId);
        setActiveMicLabel(first.label);
      }
    });
  }, [refreshMics]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const uploadConversation = useCallback(async (blob: Blob, durationSec: number) => {
    const id = listeningIdRef.current;
    if (!id) return;
    convIndexRef.current += 1;
    const idx = convIndexRef.current;
    const now = new Date();
    const title = `${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · Conversation ${idx}`;
    setBanner("✓ Conversation Saved — analyzing in background…");
    setConvFlash("saved");
    window.setTimeout(() => setConvFlash(null), 2500);
    try {
      await api.uploadListeningConversation(id, blob, {
        title,
        conversation_index: idx,
        duration_hint: durationSec,
      });
      const d = await api.listening(id);
      setDetail(d);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    }
  }, []);

  const attachVad = useCallback(
    async (stream: MediaStream) => {
      await vadRef.current?.detach();
      const p = prefsRef.current;
      const vad = new SmartVad(
        {
          speechStartMs: p.speechStartSec * 1000,
          silenceEndMs: p.silenceEndSec * 1000,
          minConversationMs: p.minConversationSec * 1000,
          minSpeechRatio: p.minSpeechRatio,
        },
        {
          onSnapshot: setVadSnap,
          onConversationStart: () => {
            setStatus("recording");
            setBanner("🎙 Conversation Started");
            setConvFlash("started");
            window.setTimeout(() => setConvFlash(null), 2500);
          },
          onConversationEnd: (blob, meta) => {
            setStatus("listening");
            void uploadConversation(blob, meta.durationSec);
          },
          onDiscarded: (reason) => {
            setStatus("listening");
            setBanner(`Skipped: ${reason}`);
            window.setTimeout(() => setBanner(null), 3000);
          },
        },
      );
      vadRef.current = vad;
      await vad.attach(stream);

      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (statusRef.current === "idle" || statusRef.current === "ended") return;
          void handleDisconnect();
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadConversation],
  );

  // Resume DB-active session after refresh (mic must be re-armed).
  useEffect(() => {
    let cancelled = false;
    void api
      .activeListening()
      .then(async (d) => {
        if (cancelled || !d?.active || !d.listening?.id) return;
        setDetail(d);
        setListeningId(d.listening.id);
        listeningIdRef.current = d.listening.id;
        convIndexRef.current = d.conversations.length;
        setMessage("Previous session still open — re-arming microphone…");
        try {
          const list = await refreshMics();
          const p = prefsRef.current;
          const preferred = list.find((m) => m.deviceId === p.preferredDeviceId);
          const mic = preferred || list[0];
          if (!mic) throw new Error("No microphone");
          const stream = await openMicrophone(mic.deviceId);
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          setActiveMicId(mic.deviceId);
          setActiveMicLabel(mic.label);
          await attachVad(stream);
          if (cancelled) return;
          setStatus("listening");
          setMessage("");
          setBanner("Session resumed — listening for conversations");
        } catch (e) {
          if (cancelled) return;
          setStatus("idle");
          setMessage(
            e instanceof Error
              ? `Open session found but mic failed: ${e.message}. Use End Session to clear it.`
              : "Could not resume session",
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [attachVad, refreshMics]);

  const switchMic = useCallback(
    async (deviceId: string, label?: string) => {
      const list = mics.length ? mics : await refreshMics();
      const mic = list.find((m) => m.deviceId === deviceId) || list[0];
      if (!mic) throw new Error("No microphone available");
      const wasActive =
        statusRef.current === "listening" ||
        statusRef.current === "recording" ||
        statusRef.current === "analyzing";
      if (!wasActive) {
        setActiveMicId(mic.deviceId);
        setActiveMicLabel(label || mic.label);
        return;
      }
      // Hot-swap without ending listening session
      vadRef.current?.flushConversation();
      await vadRef.current?.detach();
      stopTracks();
      const stream = await openMicrophone(mic.deviceId);
      streamRef.current = stream;
      setActiveMicId(mic.deviceId);
      setActiveMicLabel(label || mic.label);
      await attachVad(stream);
      setBanner(`🎤 Switched to ${label || mic.label}`);
      window.setTimeout(() => setBanner(null), 3000);
    },
    [attachVad, mics, refreshMics, stopTracks],
  );

  const handleDisconnect = useCallback(async () => {
    const p = prefsRef.current;
    const list = await refreshMics();
    const backup = list.find((m) => m.deviceId === p.backupDeviceId && m.deviceId !== activeMicId);
    const fallback = backup || list.find((m) => m.deviceId !== activeMicId) || list[0];
    if (fallback) {
      setMessage(`Mic disconnected — switching to ${fallback.label}`);
      try {
        await switchMic(fallback.deviceId, fallback.label);
        setMessage("");
        return;
      } catch {
        /* fall through */
      }
    }
    setMessage("Microphone disconnected. Plug it back in or pick another device.");
    setStatus("listening");
  }, [activeMicId, refreshMics, switchMic]);

  // Device change watcher
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const onChange = async () => {
      const list = await refreshMics();
      const known = knownDevicesRef.current;
      const added = list.filter((m) => !known.has(m.deviceId));
      knownDevicesRef.current = new Set(list.map((m) => m.deviceId));

      const p = prefsRef.current;
      const sessionOn =
        statusRef.current === "listening" ||
        statusRef.current === "recording" ||
        statusRef.current === "analyzing";

      if (!sessionOn) return;

      for (const mic of added) {
        if (p.alwaysUsePreferred && p.preferredDeviceId && mic.deviceId === p.preferredDeviceId) {
          await switchMic(mic.deviceId, mic.label);
          setBanner(`Preferred mic online — switched to ${mic.label}`);
          return;
        }
        setNewMicPrompt({ deviceId: mic.deviceId, label: mic.label });
      }

      // Active mic gone?
      if (activeMicId && !list.some((m) => m.deviceId === activeMicId)) {
        await handleDisconnect();
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onChange);
  }, [activeMicId, handleDisconnect, refreshMics, switchMic]);

  // Poll conversation statuses while session active
  useEffect(() => {
    if (!listeningId || status === "idle" || status === "ended") return;
    const tick = async () => {
      try {
        const d = await api.listening(listeningId);
        setDetail(d);
        if (d.analyzing && statusRef.current === "listening") {
          // keep listening; show analyzing in UI via detail
        }
      } catch {
        /* ignore */
      }
    };
    const t = window.setInterval(tick, 4000);
    return () => window.clearInterval(t);
  }, [listeningId, status]);

  const updatePrefs = useCallback((partial: Partial<MicPrefs>) => {
    const next = saveMicPrefs(partial);
    setPrefs(next);
    vadRef.current?.updateConfig({
      speechStartMs: next.speechStartSec * 1000,
      silenceEndMs: next.silenceEndSec * 1000,
      minConversationMs: next.minConversationSec * 1000,
      minSpeechRatio: next.minSpeechRatio,
    });
  }, []);

  const startSession = useCallback(async () => {
    setStatus("starting");
    setMessage("");
    setSummary(null);
    setDetail(null);
    setBanner(null);
    convIndexRef.current = 0;
    try {
      const list = await refreshMics();
      const p = prefsRef.current;
      const preferred = list.find((m) => m.deviceId === p.preferredDeviceId);
      const mic =
        (activeMicId && list.find((m) => m.deviceId === activeMicId)) || preferred || list[0];
      if (!mic) throw new Error("No microphone detected");

      const started = await api.startListening({
        title: `Session ${new Date().toLocaleString()}`,
        device_label: mic.label,
        speech_start_sec: p.speechStartSec,
        silence_end_sec: p.silenceEndSec,
        min_conversation_sec: p.minConversationSec,
        min_speech_ratio: p.minSpeechRatio,
      });

      const stream = await openMicrophone(mic.deviceId);
      streamRef.current = stream;
      setActiveMicId(mic.deviceId);
      setActiveMicLabel(mic.label);
      setListeningId(started.id);
      listeningIdRef.current = started.id;
      await attachVad(stream);
      setStatus("listening");
      setBanner("Session active — listening for conversations");
      const d = await api.listening(started.id);
      setDetail(d);
    } catch (e) {
      await vadRef.current?.detach();
      stopTracks();
      setListeningId(null);
      setStatus("idle");
      setMessage(e instanceof Error ? e.message : "Could not start session");
    }
  }, [activeMicId, attachVad, refreshMics, stopTracks]);

  const endSession = useCallback(async () => {
    const id = listeningIdRef.current;
    if (!id) return;
    setStatus("ending");
    try {
      vadRef.current?.flushConversation();
      await vadRef.current?.detach();
      vadRef.current = null;
      stopTracks();
      // Give uploads a brief moment if flush kicked one off
      await new Promise((r) => setTimeout(r, 400));
      const res = await api.endListening(id);
      setSummary(res.summary);
      const d = await api.listening(id);
      setDetail(d);
      setStatus("ended");
      setBanner("Session ended");
    } catch (e) {
      setStatus("listening");
      setMessage(e instanceof Error ? e.message : "Could not end session");
    }
  }, [stopTracks]);

  useEffect(() => {
    return () => {
      void vadRef.current?.detach();
      stopTracks();
    };
  }, [stopTracks]);

  const levelBar = "█".repeat(vadSnap?.levelBars ?? 0) + "░".repeat(10 - (vadSnap?.levelBars ?? 0));

  const uiStatus: string = (() => {
    if (status === "recording") return "🎙 Recording Conversation";
    if (status === "ending") return "Ending session…";
    if (status === "ended") return "Session complete";
    if (status === "starting") return "Starting…";
    if (detail?.analyzing) return "🧠 Analyzing Previous Conversation";
    if (status === "listening") return "🎙 Waiting for Conversation";
    return "Ready";
  })();

  return {
    prefs,
    updatePrefs,
    mics,
    refreshMics,
    activeMicId,
    activeMicLabel,
    switchMic,
    listeningId,
    status,
    message,
    setMessage,
    vadSnap,
    levelBar,
    detail,
    summary,
    banner,
    convFlash,
    newMicPrompt,
    setNewMicPrompt,
    startSession,
    endSession,
    uiStatus,
  };
}
