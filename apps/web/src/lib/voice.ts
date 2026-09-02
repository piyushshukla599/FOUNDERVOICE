"use client";

/**
 * The coach's speaking voice.
 *
 * Two ways to say a line, and the app must never care which one it got:
 *
 * 1.  The API synthesises it (ElevenLabs / OpenAI / Groq) and hands back mp3.
 *     This is the one that sounds like a person.
 * 2.  The browser says it with `speechSynthesis`. Free, offline, works with no
 *     key at all, and on Edge and iOS the built-in voices are genuinely good.
 *
 * Path 1 is tried once per session. A 503 means nothing is configured on the
 * server, so the flag flips and every later line goes straight to the browser
 * rather than paying a round trip to be told the same thing again.
 *
 * Everything here is one line at a time on purpose. Synthesising the whole
 * review before the first word plays would put four or five seconds of silence
 * between "stop recording" and "here's what I heard", and that silence is
 * exactly where a person decides the feature is broken.
 */

import { apiUrl, type SpokenLine, type VoiceStatus } from "@/lib/api";

export type { SpokenLine, VoiceStatus };

/** 44 bytes of nothing. Played on the first tap to unlock audio (see `unlock`). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";

/** Chrome stops a long utterance dead at roughly 15 seconds. Speak in pieces. */
const CHUNK_CHARS = 180;

let serverSpeech = true;
let generation = 0;
let element: HTMLAudioElement | null = null;
let unlocked = false;

function audio(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = "auto";
  }
  return element;
}

export function browserSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Spend the user's first tap on permission to make noise later.
 *
 * Autoplay rules tie audio to a gesture, and the coach's verdict arrives
 * fifteen seconds after the last one — analysis takes as long as it takes. So
 * the same element that will play the verdict is started (silently) inside the
 * click that begins the drill, and reused from then on.
 */
export function unlock(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  try {
    const el = audio();
    el.src = SILENT_WAV;
    el.muted = true;
    void el
      .play()
      .then(() => {
        el.pause();
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
      });
  } catch {
    /* an element that will not start is caught again at the first real line */
  }
  try {
    // Safari needs speechSynthesis started from a gesture too, and it ignores
    // an utterance with no text at all.
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.volume = 0;
    window.speechSynthesis.speak(warmup);
  } catch {
    /* no speech synthesis in this browser */
  }
}

/** Cancel whatever is being said. Any line still in flight resolves as a no-op. */
export function stopSpeaking(): void {
  generation += 1;
  if (element) {
    try {
      element.pause();
      element.removeAttribute("src");
      element.load();
    } catch {
      /* already torn down */
    }
  }
  if (browserSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Say one line, resolving when it has finished (or been cancelled).
 *
 * It resolves rather than rejects on failure: a review is a queue of lines, and
 * one line that will not synthesise must not silence the rest of the coaching.
 */
export async function say(text: string): Promise<void> {
  const line = (text || "").trim();
  if (!line) return;
  const mine = generation;

  if (serverSpeech) {
    const played = await sayFromServer(line, mine);
    if (played || generation !== mine) return;
  }
  await sayInBrowser(line, mine);
}

async function sayFromServer(line: string, mine: number): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/voice/speak"), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: line }),
    });
    if (res.status === 503) {
      // Nothing configured server-side. Stop asking.
      serverSpeech = false;
      return false;
    }
    if (!res.ok) return false;
    const blob = await res.blob();
    if (generation !== mine) return true; // cancelled while synthesising
    if (!blob.size) return false;
    await playBlob(blob, mine);
    return true;
  } catch {
    // A dead API should not take the coaching silent, but it also should not
    // cost a failed round trip on every remaining line of the review.
    serverSpeech = false;
    return false;
  }
}

function playBlob(blob: Blob, mine: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = audio();
    let settled = false;
    let watch = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(watch);
      el.onended = null;
      el.onerror = null;
      URL.revokeObjectURL(url);
      resolve();
    };
    el.onended = finish;
    el.onerror = finish;
    el.src = url;
    void el.play().catch(finish);
    // A cancelled line has to let go of its promise, or the queue waits on a
    // playback nobody is listening to any more.
    watch = window.setInterval(() => {
      if (generation !== mine) finish();
    }, 250);
  });
}

const VOICE_KEY = "fv.voice.name";

/** The English voices this browser can offer, best first. */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!browserSpeechSupported()) return [];
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
  return voices.filter((v) => /^en(-|_|$)/i.test(v.lang)).sort((a, b) => rank(a) - rank(b));
}

/**
 * How human a voice is likely to sound, judged by its name.
 *
 * Crude, and the only signal available: the Web Speech API exposes no quality
 * field. But the good ones announce themselves — Edge ships "Microsoft Guy
 * Online (Natural)", Chrome ships the Google set, macOS and iOS ship Samantha
 * and Daniel — and each of those is a different product from the flat robot a
 * browser falls back to. Getting this order right is most of what makes the
 * free voice worth listening to.
 */
function rank(voice: SpeechSynthesisVoice): number {
  const name = voice.name;
  if (/natural|neural/i.test(name)) return 0;
  if (/premium|enhanced|siri/i.test(name)) return 1;
  if (/google/i.test(name)) return 2;
  if (/samantha|daniel|karen|aaron|serena|moira/i.test(name)) return 3;
  if (voice.default) return 4;
  return 5;
}

/** The voice the user picked, if their browser still has it. */
export function preferredVoiceName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(VOICE_KEY) || "";
  } catch {
    return "";
  }
}

export function setPreferredVoice(name: string): void {
  if (typeof window === "undefined") return;
  try {
    if (name) window.localStorage.setItem(VOICE_KEY, name);
    else window.localStorage.removeItem(VOICE_KEY);
  } catch {
    /* storage disabled: the choice lasts for this tab only */
  }
}

/**
 * Voices load asynchronously, and `getVoices()` is empty on first call in
 * Chrome. Callers subscribe rather than poll; the returned function detaches.
 */
export function onVoicesReady(callback: () => void): () => void {
  if (!browserSpeechSupported()) return () => undefined;
  const handler = () => callback();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (!voices.length) return null;
  const wanted = preferredVoiceName();
  return (wanted && voices.find((v) => v.name === wanted)) || voices[0];
}

function chunk(line: string): string[] {
  const sentences = line.match(/[^.!?]+[.!?]*\s*/g) || [line];
  const out: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if ((buffer + sentence).length > CHUNK_CHARS && buffer) {
      out.push(buffer.trim());
      buffer = "";
    }
    buffer += sentence;
  }
  if (buffer.trim()) out.push(buffer.trim());
  return out;
}

async function sayInBrowser(line: string, mine: number): Promise<void> {
  if (!browserSpeechSupported()) return;
  for (const piece of chunk(line)) {
    if (generation !== mine) return;
    await speakChunk(piece, mine);
  }
}

function speakChunk(piece: string, mine: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guard);
      window.clearInterval(watch);
      resolve();
    };
    const utterance = new SpeechSynthesisUtterance(piece);
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    // Slightly under natural pace: this is coaching, and the listener is
    // supposed to be able to act on it rather than admire the delivery.
    utterance.rate = 0.97;
    utterance.pitch = 1;
    utterance.onend = finish;
    utterance.onerror = finish;
    // Chrome drops `onend` often enough that a queue built on it alone stalls
    // forever. Estimate the duration and move on regardless.
    const guard = window.setTimeout(finish, 1200 + piece.split(/\s+/).length * 420);
    const watch = window.setInterval(() => {
      if (generation !== mine) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
        finish();
      }
    }, 250);
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finish();
    }
  });
}

/** Speak a whole script, calling back as each line starts. Resolves when done. */
export async function sayAll(
  lines: SpokenLine[],
  onLine?: (line: SpokenLine | null) => void,
): Promise<void> {
  stopSpeaking();
  const mine = generation;
  for (const line of lines) {
    if (generation !== mine) break;
    onLine?.(line);
    await say(line.text);
  }
  if (generation === mine) onLine?.(null);
}
