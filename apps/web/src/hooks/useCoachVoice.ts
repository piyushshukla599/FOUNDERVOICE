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
  listVoices,
  onVoicesReady,
  preferredVoiceName,
  say,
  sayAll,
  setPreferredVoice,
  stopSpeaking,
  unlock,
} from "@/lib/voice";

const MUTE_KEY = "fv.voice.muted";

export type VoiceChoice = { name: string; lang: string };

export function useCoachVoice() {
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceChoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const run = useRef(0);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      /* storage disabled, the coach speaks by default */
    }
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

  /** Say one line — a prompt, a countdown, a single note. */
  const speak = useCallback(
    async (text: string) => {
      if (muted || !text) return;
      unlock();
      const mine = ++run.current;
      setPlaying(true);
      await say(text);
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
    /** False in browsers with no speech synthesis at all (older Firefox on Linux). */
    supported: browserSpeechSupported(),
    speak,
    play,
    stop,
    toggleMute,
    chooseVoice,
    /** Spend a real user gesture unlocking audio for the rest of the flow. */
    unlock,
  };
}
