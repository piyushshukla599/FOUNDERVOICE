"use client";

/**
 * React's side of the coach's voice: what is being said right now, whether the
 * user has asked for silence, and which of their browser's voices to use.
 *
 * The speaking itself lives in `lib/voice.ts` and is deliberately not React —
 * a queue of utterances that must survive re-renders has no business being
 * state. This hook owns only what the screen needs to show.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpokenLine } from "@/lib/api";
import {
  browserSpeechSupported,
  DEFAULT_RATE,
  deliveryFor,
  listVoices,
  onVoicesReady,
  preferredVoiceName,
  say,
  sayAll,
  setPreferredVoice,
  setSpeechRate,
  speechRate,
  stopSpeaking,
  unlock,
} from "@/lib/voice";

const MUTE_KEY = "fv.voice.muted";

/** Slow, normal, brisk. Three is a choice; a slider is a fiddle. */
export const SPEEDS: { label: string; rate: number }[] = [
  { label: "Slower", rate: 0.78 },
  { label: "Normal", rate: DEFAULT_RATE },
  { label: "Faster", rate: 1.02 },
];

export type VoiceChoice = { name: string; lang: string };

export function useCoachVoice() {
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceChoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(DEFAULT_RATE);
  const run = useRef(0);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      /* storage disabled, the coach speaks by default */
    }
    setRate(speechRate());
    const load = () => {
      const found = listVoices().map((v) => ({ name: v.name, lang: v.lang }));
      setVoices(found);
      setVoiceName(preferredVoiceName() || found[0]?.name || "");
    };
    load();
    // Chrome returns an empty list on the first call and fills it in later.
    const off = onVoicesReady(load);
    setReady(true);
    return () => {
      off();
      stopSpeaking();
    };
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    stopSpeaking();
    setSpeakingId(null);
    setPlaying(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((was) => {
      const next = !was;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* the choice lasts for this tab only */
      }
      if (next) stop();
      return next;
    });
  }, [stop]);

  const chooseVoice = useCallback((name: string) => {
    setPreferredVoice(name);
    setVoiceName(name);
  }, []);

  const chooseSpeed = useCallback((next: number) => {
    setSpeechRate(next);
    setRate(next);
  }, []);

  /**
   * Say one line. `kind` is what the line is doing — a question, a verdict, an
   * aside — and it decides the pace, the pitch and the silence afterwards.
   */
  const speak = useCallback(
    async (text: string, kind = "read") => {
      if (muted || !text) return;
      unlock();
      const mine = ++run.current;
      setPlaying(true);
      await say(text, deliveryFor(kind, text));
      if (run.current === mine) setPlaying(false);
    },
    [muted],
  );

  /** Say a whole review, reporting which line is in the air. */
  const play = useCallback(
    async (lines: SpokenLine[]) => {
      if (muted || !lines.length) return;
      unlock();
      const mine = ++run.current;
      setPlaying(true);
      await sayAll(lines, (line) => {
        if (run.current === mine) setSpeakingId(line ? line.id : null);
      });
      if (run.current === mine) {
        setPlaying(false);
        setSpeakingId(null);
      }
    },
    [muted],
  );

  return {
    /** True once preferences and the voice list have been read. */
    ready,
    muted,
    playing,
    speakingId,
    voices,
    voiceName,
    rate,
    /** False in browsers with no speech synthesis at all (older Firefox on Linux). */
    supported: browserSpeechSupported(),
    speak,
    play,
    stop,
    toggleMute,
    chooseVoice,
    chooseSpeed,
    /** Spend a real user gesture unlocking audio for the rest of the flow. */
    unlock,
  };
}
