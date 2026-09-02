"use client";

/**
 * One spoken answer from the user, captured as text.
 *
 * This is deliberately NOT the recorder. When the coach asks "how are you?" the
 * answer is three words that exist only to be understood — uploading it, paying
 * for transcription and storing it as a session would be absurd. The browser's
 * own speech recognition answers that question for free and instantly.
 *
 * The whole difficulty is knowing when someone has finished talking. There is
 * no event for it, so: every result restarts a silence timer, and when that
 * timer survives long enough the turn is over. Too short and it cuts people off
 * mid-thought; too long and the conversation feels dead. 1.6s is roughly the
 * pause a person leaves before they expect you to answer.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type ReplyReason =
  | "spoken" /* they said something */
  | "silent" /* the mic was open and nothing came */
  | "stopped" /* the flow moved on, or they pressed done */
  | "blocked" /* the microphone was refused */
  | "unsupported"; /* this browser has no speech recognition */

export type Reply = {
  text: string;
  reason: ReplyReason;
  /**
   * Milliseconds between the question ending and the first word arriving.
   *
   * Under investor questioning this is the tell. Someone who knows the number
   * starts inside a second; someone assembling an answer takes three, and the
   * room notices even when the words that follow are fine.
   */
  latencyMs: number;
};

export function speechInputSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function useVoiceReply() {
  const [listening, setListening] = useState(false);
  /** What has been heard so far this turn, including the interim guess. */
  const [heard, setHeard] = useState("");

  const active = useRef<SpeechRecognition | null>(null);
  const settle = useRef<((r: Reply) => void) | null>(null);

  const finish = useCallback((reply: Reply) => {
    const resolve = settle.current;
    settle.current = null;
    active.current = null;
    setListening(false);
    resolve?.(reply);
  }, []);

  /** Abandon the turn. Safe to call when nothing is listening. */
  const cancel = useCallback(() => {
    const rec = active.current;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        // abort drops what was heard; stop delivers it. Cancelling wants abort.
        if (rec.abort) rec.abort();
        else rec.stop();
      } catch {
        /* already gone */
      }
    }
    finish({ text: "", reason: "stopped", latencyMs: 0 });
  }, [finish]);

  const listen = useCallback(
    (opts?: { silenceMs?: number; maxMs?: number }): Promise<Reply> => {
      const silenceMs = opts?.silenceMs ?? 1600;
      const maxMs = opts?.maxMs ?? 22000;

      const Recognition =
        typeof window === "undefined"
          ? undefined
          : window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) return Promise.resolve({ text: "", reason: "unsupported", latencyMs: 0 });

      cancel();
      setHeard("");

      return new Promise<Reply>((resolve) => {
        settle.current = resolve;
        let said = "";
        let quiet = 0;
        let cap = 0;
        const asked = Date.now();
        let firstWordAt = 0;

        const done = (reason: ReplyReason) => {
          window.clearTimeout(quiet);
          window.clearTimeout(cap);
          const rec = active.current;
          if (rec) {
            rec.onresult = null;
            rec.onerror = null;
            rec.onend = null;
            try {
              rec.stop();
            } catch {
              /* stopping an already-stopped recogniser throws on Safari */
            }
          }
          const text = said.trim();
          finish({
            text,
            reason: text ? "spoken" : reason,
            latencyMs: firstWordAt ? firstWordAt - asked : 0,
          });
        };

        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (ev: SpeechRecognitionEvent) => {
          let complete = "";
          let partial = "";
          for (let i = 0; i < ev.results.length; i += 1) {
            const result = ev.results[i];
            if (result.isFinal) complete += result[0].transcript;
            else partial += result[0].transcript;
          }
          if (!firstWordAt && (complete || partial)) firstWordAt = Date.now();
          said = complete;
          setHeard((complete + " " + partial).trim());
          window.clearTimeout(quiet);
          quiet = window.setTimeout(() => done("silent"), silenceMs);
        };

        recognition.onerror = (ev: SpeechRecognitionErrorEvent) => {
          const kind = ev.error;
          if (kind === "not-allowed" || kind === "service-not-allowed") {
            done("blocked");
          } else if (kind !== "no-speech") {
            // aborted / network / audio-capture: take whatever was heard.
            done("silent");
          }
        };

        recognition.onend = () => {
          // Chrome ends the session on its own after a long pause. Whatever was
          // said by then is the answer.
          if (settle.current) done("silent");
        };

        active.current = recognition;
        setListening(true);
        try {
          recognition.start();
        } catch {
          done("unsupported");
          return;
        }
        cap = window.setTimeout(() => done("silent"), maxMs);
      });
    },
    [cancel, finish],
  );

  useEffect(() => cancel, [cancel]);

  return { listen, cancel, listening, heard, supported: speechInputSupported() };
}
