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

const RATE_KEY = "fv.voice.rate";

/**
 * Slower than conversation on purpose. This is coaching: you are meant to be
 * able to act on the sentence, not admire the delivery. It is also the single
 * thing that most separates a voice you listen to from a voice you switch off.
 */
export const DEFAULT_RATE = 0.9;
/**
 * The coach's register: a man in his early thirties, warm and unhurried.
 *
 * Browser speech gives three dials — rate, pitch, volume — so "warm" has to be
 * built out of those. Everything sits a little under the voice's natural pitch,
 * because the default register of every stock voice is pitched up to sound
 * bright, and bright is what makes it sound like an announcement instead of a
 * person who has done this before. The contours below are relative to this, so
 * a question still rises; it rises from lower down.
 */
const BASE_PITCH = 0.94;

export type Delivery = {
  /** Multiplies the user's base rate. */
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Silence held after this line, in ms. Where "reading" becomes "talking". */
  pauseAfter?: number;
};

/**
 * How each kind of line is said.
 *
 * A voice that delivers eleven sentences at one speed, one pitch and no gaps is
 * reading a list, and everybody hears that instantly. People do not do that: a
 * verdict slows down and drops, a question rises, an aside is thrown away
 * faster and quieter, and the beat *after* a sentence is what tells you it
 * mattered. None of this is a better engine — it is the same free browser
 * voice, given the timing a person would use.
 */
const DELIVERY: Record<string, Delivery> = {
  open: { rate: 1, pitch: 1, pauseAfter: 380 },
  verdict: { rate: 0.93, pitch: 0.97, pauseAfter: 720 },
  read: { rate: 0.98, pitch: 1, pauseAfter: 560 },
  issue: { rate: 0.94, pitch: 1.03, pauseAfter: 620 },
  cause: { rate: 1, pitch: 0.98, pauseAfter: 400 },
  fix: { rate: 1.02, pitch: 1.04, pauseAfter: 680 },
  aside: { rate: 1.06, pitch: 0.96, volume: 0.85, pauseAfter: 420 },
  lab: { rate: 0.98, pitch: 1.01, pauseAfter: 520 },
  ask: { rate: 1, pitch: 1.07, pauseAfter: 160 },
  close: { rate: 0.95, pitch: 1, pauseAfter: 0 },
};

export function deliveryFor(kind: string, text = ""): Delivery {
  const base = DELIVERY[kind] || DELIVERY.read;
  const line = text.trim();
  let out: Delivery = { ...base };

  // A question is a question whatever the line was tagged as, and a coach who
  // ends one flat sounds like it is not expecting an answer.
  if (line.endsWith("?")) out = { ...out, pitch: (out.pitch ?? 1) + 0.06, pauseAfter: 160 };

  // "Yeah." "Right." "Got it." A person lands on one of these and then leaves a
  // gap while they decide what to say next. Said at full pace with no gap it
  // stops being agreement and becomes the first word of the next sentence.
  if (/^(yeah|yes|right|okay|ok|got it|sure|mm|hm+)\b[.,…!]*$/i.test(line)) {
    out = { ...out, rate: (out.rate ?? 1) * 0.92, pauseAfter: Math.max(out.pauseAfter ?? 0, 520) };
  }
  // Praise is the one thing a coach must not throw away. Slowing it slightly
  // and giving it room is what the voice has instead of italics. The phrases
  // are deliberately multi-word: a bare "good" also opens "Good to have you",
  // and weighting a greeting like a compliment is how sincerity gets spent.
  if (/\b(much better|a lot better|far better|way better|much stronger|that's better|thats better|nailed (it|that)|exactly that|that landed)\b/i.test(line)) {
    out = { ...out, rate: (out.rate ?? 1) * 0.95, pauseAfter: Math.max(out.pauseAfter ?? 0, 600) };
  }

  return { ...out, pitch: (out.pitch ?? 1) * BASE_PITCH };
}

/** How fast the coach speaks, as chosen by the listener. */
export function speechRate(): number {
  if (typeof window === "undefined") return DEFAULT_RATE;
  try {
    const stored = Number(window.localStorage.getItem(RATE_KEY));
    return stored >= 0.6 && stored <= 1.3 ? stored : DEFAULT_RATE;
  } catch {
    return DEFAULT_RATE;
  }
}

export function setSpeechRate(rate: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* the choice lasts for this tab only */
  }
}

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
export async function say(text: string, delivery: Delivery = {}): Promise<void> {
  const line = (text || "").trim();
  if (!line) return;
  const mine = generation;

  if (serverSpeech) {
    const played = await sayFromServer(line, mine);
    if (played || generation !== mine) {
      if (generation === mine) await hold(delivery.pauseAfter, mine);
      return;
    }
  }
  await sayInBrowser(line, mine, delivery);
  await hold(delivery.pauseAfter, mine);
}

/** The silence after a sentence. Cut short the moment the run is cancelled. */
async function hold(ms: number | undefined, mine: number): Promise<void> {
  const wait = ms ?? 0;
  if (wait <= 0) return;
  const until = Date.now() + wait;
  while (Date.now() < until) {
    if (generation !== mine) return;
    await new Promise((r) => setTimeout(r, Math.min(120, until - Date.now())));
  }
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
  // Sex first, then quality within it: the coach is written as one person, and
  // the best-sounding female voice on the machine is still the wrong person.
  return voices
    .filter((v) => /^en(-|_|$)/i.test(v.lang))
    .sort((a, b) => timbre(a) - timbre(b) || rank(a) - rank(b));
}

/**
 * Which voices sound male, judged by name — the only signal the API gives.
 *
 * The coach is written as one person, and a coach who changes sex between
 * machines is not that person. The list is names, not a guess at gender from
 * pitch: every TTS engine ships a fixed cast and each name is a known voice.
 */
const MALE = /\b(david|mark|george|guy|christopher|eric|roger|steffan|brian|daniel|alex|fred|tom|thomas|ryan|rishi|ravi|aaron|liam|william|james|male)\b/i;
const FEMALE = /\b(zira|hazel|susan|heera|samantha|karen|serena|moira|aria|jenny|michelle|ana|emma|sonia|libby|catherine|natasha|clara|female)\b/i;


/** 0 male, 1 can't tell, 2 female. */
function timbre(voice: SpeechSynthesisVoice): number {
  if (FEMALE.test(voice.name)) return 2;
  if (MALE.test(voice.name)) return 0;
  return 1;
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

async function sayInBrowser(line: string, mine: number, delivery: Delivery): Promise<void> {
  if (!browserSpeechSupported()) return;
  const pieces = chunk(line);
  for (let i = 0; i < pieces.length; i += 1) {
    if (generation !== mine) return;
    await speakChunk(pieces[i], mine, delivery);
    // A breath between sentences inside one thought — shorter than the beat
    // between thoughts, but the difference is what stops it sounding recited.
    if (i < pieces.length - 1) await hold(180, mine);
  }
}

function speakChunk(piece: string, mine: number, delivery: Delivery): Promise<void> {
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
    const rate = Math.max(0.5, Math.min(1.4, speechRate() * (delivery.rate ?? 1)));
    utterance.rate = rate;
    utterance.pitch = Math.max(0.5, Math.min(1.6, delivery.pitch ?? 1));
    utterance.volume = Math.max(0.2, Math.min(1, delivery.volume ?? 1));
    utterance.onend = finish;
    utterance.onerror = finish;
    // Chrome drops `onend` often enough that a queue built on it alone stalls
    // forever. Estimate the duration and move on regardless — and scale it by
    // the rate, or a slow voice gets cut off by its own safety net.
    const guard = window.setTimeout(
      finish,
      1200 + (piece.split(/\s+/).length * 480) / rate,
    );
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
    await say(line.text, deliveryFor(line.kind, line.text));
  }
  if (generation === mine) onLine?.(null);
}
