"use client";

import { useEffect, useRef, useState } from "react";
import {
  type CoachHint,
  type GhostHint,
  type LiveMetrics,
  type SentenceTip,
  estimatePitch,
} from "@/lib/liveCoach";

type Pattern = { key: string; label: string; frequency: number };

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    0: { transcript: string; confidence: number };
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  }
}

const EMPTY: LiveMetrics = {
  wpm: 0,
  clarity: 92,
  confidence: 70,
  breath: 100,
  stability: 75,
  executive: 70,
  momentum: 2,
  monotone: false,
  mumbling: false,
  emphasis: false,
  risingSpeed: false,
  speaking: false,
  interimText: "",
};

const TICK_MS = 550;
const PITCH_EVERY = 3; // compute pitch every N ticks

export function useLiveCoach(opts: {
  stream: MediaStream | null;
  active: boolean;
  paused: boolean;
  patterns?: Pattern[];
  elapsedSec: number;
}) {
  const { stream, active, paused, patterns = [], elapsedSec } = opts;
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY);
  const [sentenceTip, setSentenceTip] = useState<SentenceTip | null>(null);
  const [coachHint, setCoachHint] = useState<CoachHint | null>(null);
  const [ghostHint, setGhostHint] = useState<GhostHint | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const wordTimes = useRef<number[]>([]);
  const pitchHist = useRef<number[]>([]);
  const wpmHist = useRef<number[]>([]);
  const breathRef = useRef(100);
  const speakingMs = useRef(0);
  const lastHintAt = useRef(0);
  const lastGhostAt = useRef(0);
  const momentumRef = useRef(2);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const interimRef = useRef("");
  const clarityRef = useRef(92);
  const lastStability = useRef(75);
  const lastPitch = useRef(0);
  const tickCount = useRef(0);
  const lastMetricsKey = useRef("");
  const patternsRef = useRef(patterns);
  const elapsedRef = useRef(elapsedSec);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  patternsRef.current = patterns;
  elapsedRef.current = elapsedSec;
  activeRef.current = active;
  pausedRef.current = paused;

  useEffect(() => {
    if (!active || !stream) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec?.abort?.();
        rec?.stop();
      } catch {
        /* ignore */
      }
      if (!active) {
        setMetrics(EMPTY);
        setSentenceTip(null);
        setCoachHint(null);
        setGhostHint(null);
        wordTimes.current = [];
        pitchHist.current = [];
        wpmHist.current = [];
        breathRef.current = 100;
        speakingMs.current = 0;
        momentumRef.current = 2;
        lastMetricsKey.current = "";
      }
      return;
    }

    if (paused) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      return;
    }

    const pushHint = (text: string, tone: CoachHint["tone"]) => {
      const at = Date.now();
      if (at - lastHintAt.current < 5000) return;
      lastHintAt.current = at;
      setCoachHint({ id: `${at}`, text, tone, at });
      window.setTimeout(() => {
        setCoachHint((cur) => (cur?.id === `${at}` ? null : cur));
      }, 2600);
    };

    const flashGhost = (text: string) => {
      const at = Date.now();
      if (at - lastGhostAt.current < 9000) return;
      lastGhostAt.current = at;
      setGhostHint({ id: `${at}`, text, at });
      window.setTimeout(() => {
        setGhostHint((cur) => (cur?.id === `${at}` ? null : cur));
      }, 3200);
    };

    // Defer speech recognition so Start / PTT stays snappy
    let speechTimer = window.setTimeout(() => {
      if (!activeRef.current || pausedRef.current) return;
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) {
        setSpeechSupported(false);
        return;
      }
      setSpeechSupported(true);
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (ev) => {
        const now = Date.now();
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const text = res[0].transcript.trim();
          const conf = res[0].confidence || 0.75;
          if (res.isFinal) {
            const words = text.split(/\s+/).filter(Boolean);
            for (let w = 0; w < words.length; w++) wordTimes.current.push(now);
            clarityRef.current = Math.round(conf * 100) || clarityRef.current;
            const tip = tipForSentence(text, words.length, conf);
            setSentenceTip({ id: `${now}`, kind: tip.kind, text: tip.text, at: now });
            window.setTimeout(() => {
              setSentenceTip((cur) => (cur?.id === `${now}` ? null : cur));
            }, 2800);
            if (conf < 0.55) pushHint("I didn't catch that clearly.", "red");
            interimRef.current = "";
          } else {
            interim = text;
            if (conf > 0) clarityRef.current = Math.round(conf * 100);
          }
        }
        interimRef.current = interim;
      };
      rec.onerror = () => {
        /* keep audio coaching */
      };
      rec.onend = () => {
        if (activeRef.current && !pausedRef.current && recognitionRef.current === rec) {
          window.setTimeout(() => {
            try {
              rec.start();
            } catch {
              /* already started */
            }
          }, 200);
        }
      };
      try {
        rec.start();
        recognitionRef.current = rec;
      } catch {
        setSpeechSupported(false);
      }
    }, 350);

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512; // light
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);
    const time = new Float32Array(analyser.fftSize);

    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      if (pausedRef.current || !activeRef.current) return;
      const nowPerf = performance.now();
      const dt = nowPerf - lastTick;
      lastTick = nowPerf;
      tickCount.current += 1;

      analyser.getFloatTimeDomainData(time);

      let sum = 0;
      const len = time.length;
      for (let i = 0; i < len; i += 2) sum += time[i] * time[i];
      const rms = Math.sqrt(sum / (len / 2));
      const speaking = rms > 0.02;

      if (speaking) {
        speakingMs.current += dt;
        breathRef.current = Math.max(5, breathRef.current - dt * 0.012);
      } else {
        speakingMs.current = 0;
        breathRef.current = Math.min(100, breathRef.current + dt * 0.045);
      }

      // Pitch only every few ticks
      if (tickCount.current % PITCH_EVERY === 0 && speaking) {
        const pitch = estimatePitch(time, ctx.sampleRate);
        if (pitch > 0) {
          lastPitch.current = pitch;
          pitchHist.current.push(pitch);
          if (pitchHist.current.length > 12) pitchHist.current.shift();
        }
      }

      const pitches = pitchHist.current;
      let stability = lastStability.current;
      let monotone = false;
      if (pitches.length >= 4) {
        let mean = 0;
        for (const p of pitches) mean += p;
        mean /= pitches.length;
        let variance = 0;
        for (const p of pitches) variance += (p - mean) ** 2;
        const std = Math.sqrt(variance / pitches.length);
        stability = Math.max(0, Math.min(100, 100 - std * 1.8));
        lastStability.current = stability;
        monotone = std < 8 && speaking;
      }

      const cutoff = Date.now() - 8000;
      const words = wordTimes.current;
      let wStart = 0;
      while (wStart < words.length && words[wStart] < cutoff) wStart++;
      if (wStart > 0) wordTimes.current = words.slice(wStart);

      let wpm = Math.round((wordTimes.current.length / 8) * 60);
      if (wpm === 0 && speaking) {
        // cheap energy proxy — skip peak scan of full buffer
        wpm = Math.min(190, Math.round(40 + rms * 900));
      }

      wpmHist.current.push(wpm);
      if (wpmHist.current.length > 6) wpmHist.current.shift();
      const hist = wpmHist.current;
      const risingSpeed =
        hist.length >= 3 && hist[hist.length - 1] >= 150 && hist[hist.length - 1] > hist[0] + 18;

      const mumbling = clarityRef.current < 55 && speaking;
      const emphasis = speaking && rms > 0.12 && lastPitch.current > 0;

      if (wpm >= 120 && wpm <= 145 && clarityRef.current >= 75) {
        momentumRef.current = Math.min(5, momentumRef.current + 0.08);
      } else if (wpm >= 160 || mumbling) {
        momentumRef.current = Math.max(0, momentumRef.current - 0.15);
      }

      const confidence = Math.max(
        20,
        Math.min(
          100,
          55 +
            stability * 0.25 +
            (100 - Math.abs(wpm - 132)) * 0.15 -
            (100 - breathRef.current) * 0.1,
        ),
      );
      const executive = Math.round(
        confidence * 0.45 +
          Math.max(0, 100 - Math.abs(wpm - 135) * 1.2) * 0.35 +
          clarityRef.current * 0.2,
      );

      const next: LiveMetrics = {
        wpm,
        clarity: clarityRef.current,
        confidence: Math.round(confidence),
        breath: Math.round(breathRef.current),
        stability: Math.round(stability),
        executive,
        momentum: Math.round(momentumRef.current),
        monotone,
        mumbling,
        emphasis,
        risingSpeed,
        speaking,
        interimText: interimRef.current,
      };

      // Skip React update if nothing meaningful changed
      const key = `${next.wpm}|${next.clarity}|${next.breath}|${next.executive}|${next.momentum}|${next.risingSpeed}|${next.monotone}|${next.interimText.slice(0, 40)}`;
      if (key !== lastMetricsKey.current) {
        lastMetricsKey.current = key;
        setMetrics(next);
      }

      if (risingSpeed) pushHint("Slow down.", "orange");
      else if (breathRef.current < 22 && speaking) pushHint("Take a breath.", "red");
      else if (wpm >= 170) pushHint("Too fast.", "red");
      else if (wpm >= 120 && wpm <= 145 && speaking) pushHint("Perfect pace.", "green");
      else if (monotone) pushHint("Add pitch variety.", "purple");
      else if (mumbling) pushHint("Articulate clearly.", "red");

      const pats = patternsRef.current;
      const elapsed = elapsedRef.current;
      if (pats.length) {
        const rushIntro = pats.find((p) => p.key === "rush_on_intro");
        const fillers = pats.find((p) => p.key === "filler_overuse");
        const missPause = pats.find((p) => p.key === "missing_pauses");
        if (rushIntro && elapsed < 25 && wpm >= 145) {
          flashGhost("Remember — pause. You rush intros.");
        } else if (missPause && speakingMs.current > 9000) {
          flashGhost("You usually skip pauses here.");
        } else if (
          fillers &&
          /\b(um|uh|like|basically|actually|you know)\b/i.test(interimRef.current)
        ) {
          flashGhost("Filler habit — swap for silence.");
        }
      }
    }, TICK_MS);

    return () => {
      window.clearTimeout(speechTimer);
      window.clearInterval(interval);
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close();
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec?.abort?.();
        rec?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [stream, active, paused]);

  return { metrics, sentenceTip, coachHint, ghostHint, speechSupported };
}

function tipForSentence(
  text: string,
  wordCount: number,
  conf: number,
): { kind: "great" | "warn"; text: string } {
  if (wordCount >= 28) return { kind: "warn", text: "⚠ Too long — split that sentence." };
  if (!/[.?!,]/.test(text) && wordCount > 16) {
    return { kind: "warn", text: "⚠ No pause — breathe between claims." };
  }
  if (conf < 0.55) return { kind: "warn", text: "⚠ Unclear — restate that line." };
  if (wordCount >= 6 && wordCount <= 18 && conf >= 0.7) return { kind: "great", text: "✅ Great" };
  return { kind: "great", text: "✅ Solid" };
}
