"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openMicrophone } from "@/lib/mic";

/** Lightweight mic recorder for Trainer drills and Practice answers. */
export function usePracticeRecorder() {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const stopSpeech = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  const startSpeech = useCallback(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SR) return;
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      transcriptRef.current = "";
      setLiveTranscript("");
      rec.onresult = (ev: SpeechRecognitionEvent) => {
        let text = "";
        for (let i = 0; i < ev.results.length; i++) {
          text += ev.results[i][0].transcript;
        }
        transcriptRef.current = text.trim();
        setLiveTranscript(transcriptRef.current);
      };
      rec.onerror = () => undefined;
      recognitionRef.current = rec;
      rec.start();
    } catch {
      /* SpeechRecognition optional */
    }
  }, []);

  const start = useCallback(async () => {
    if (starting || recording) return;
    setStarting(true);
    setError("");
    chunksRef.current = [];
    transcriptRef.current = "";
    setLiveTranscript("");
    try {
      stopTracks();
      const media = await openMicrophone();
      streamRef.current = media;
      setStream(media);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined;
      const mr = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mrRef.current = mr;
      mr.start(250);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      startSpeech();
    } catch (e) {
      stopTracks();
      setError(e instanceof Error ? e.message : "Microphone failed");
    } finally {
      setStarting(false);
    }
  }, [recording, startSpeech, starting, stopTracks]);

  const stop = useCallback(async (): Promise<{ blob: Blob; transcript: string; durationSec: number } | null> => {
    stopSpeech();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const mr = mrRef.current;
    const durationSec = Math.max(0.5, (Date.now() - startedAtRef.current) / 1000);
    if (!mr || mr.state === "inactive") {
      setRecording(false);
      stopTracks();
      return null;
    }
    const blob = await new Promise<Blob>((resolve) => {
      mr.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }));
      };
      try {
        mr.stop();
      } catch {
        resolve(new Blob([], { type: "audio/webm" }));
      }
    });
    mrRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    stopTracks();
    const transcript = transcriptRef.current;
    return { blob, transcript, durationSec };
  }, [stopSpeech, stopTracks]);

  const discard = useCallback(async () => {
    stopSpeech();
    if (timerRef.current) window.clearInterval(timerRef.current);
    const mr = mrRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.onstop = null;
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    mrRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
    setLiveTranscript("");
    transcriptRef.current = "";
    stopTracks();
  }, [stopSpeech, stopTracks]);

  useEffect(() => {
    return () => {
      void discard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    recording,
    starting,
    elapsed,
    stream,
    error,
    liveTranscript,
    start,
    stop,
    discard,
    setError,
  };
}

