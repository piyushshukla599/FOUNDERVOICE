/**
 * Lightweight Voice Activity Detection for Smart Session Listening.
 * Idle path: AnalyserNode + low-rate RMS only — no transcription, no network.
 * Speech path: PCM ring buffer → conversation buffer → local WAV encode.
 */

import { concatFloat32, encodeWavMono } from "./wav";

export type VadPhase = "idle" | "arming" | "recording" | "saving";

export type VadConfig = {
  /** Sustained speech before starting a conversation (ms). */
  speechStartMs: number;
  /** Sustained silence before ending a conversation (ms). */
  silenceEndMs: number;
  /** Discard conversations shorter than this (ms). */
  minConversationMs: number;
  /** Fraction of frames that must be "speech" to keep recording. */
  minSpeechRatio: number;
  /** RMS above this = speech (0–1 scale from time-domain). */
  speechRms: number;
  /** Pre-roll seconds kept in memory while idle. */
  preRollSec: number;
};

export type VadSnapshot = {
  phase: VadPhase;
  rms: number;
  levelBars: number; // 0–10
  signalQuality: "Excellent" | "Good" | "Fair" | "Poor" | "Silent";
  sampleRate: number;
  speechMs: number;
  silenceMs: number;
  conversationSec: number;
};

export type VadCallbacks = {
  onSnapshot?: (s: VadSnapshot) => void;
  onConversationStart?: () => void;
  onConversationEnd?: (blob: Blob, meta: { durationSec: number; speechRatio: number }) => void;
  onDiscarded?: (reason: string) => void;
};

const DEFAULT_CONFIG: VadConfig = {
  speechStartMs: 3500,
  silenceEndMs: 4500,
  minConversationMs: 8000,
  minSpeechRatio: 0.22,
  speechRms: 0.018,
  preRollSec: 2.5,
};

export class SmartVad {
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private config: VadConfig;
  private cbs: VadCallbacks;

  private phase: VadPhase = "idle";
  private speechMs = 0;
  private silenceMs = 0;
  private sampleRate = 48000;
  private lastRms = 0;
  private peakRms = 0;

  /** Idle pre-roll ring (PCM chunks). */
  private ring: Float32Array[] = [];
  private ringSamples = 0;
  /** Active conversation PCM. */
  private convo: Float32Array[] = [];
  private speechFrames = 0;
  private totalFrames = 0;
  private convoStartedAt = 0;

  constructor(config: Partial<VadConfig> = {}, cbs: VadCallbacks = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cbs = cbs;
  }

  getPhase() {
    return this.phase;
  }

  updateConfig(partial: Partial<VadConfig>) {
    this.config = { ...this.config, ...partial };
  }

  async attach(stream: MediaStream) {
    await this.detach();
    this.stream = stream;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;

    const bufferSize = 4096;
    this.processor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    this.processor.onaudioprocess = (ev) => {
      const input = ev.inputBuffer.getChannelData(0);
      this.onPcm(input);
    };

    // Mute monitor path so ScriptProcessor keeps firing without speakers/feedback.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.source.connect(this.analyser);
    this.source.connect(this.processor);
    this.processor.connect(mute);
    mute.connect(this.ctx.destination);

    this.timer = window.setInterval(() => this.tick(), 100);
    this.emit();
  }

  async detach() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* ignore */
    }
    this.processor = null;
    this.source = null;
    this.analyser = null;
    if (this.ctx) {
      await this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
    this.stream = null;
    this.ring = [];
    this.ringSamples = 0;
    this.resetConvo();
    this.phase = "idle";
  }

  /** Force-end current conversation if recording (e.g. End Session). */
  flushConversation() {
    if (this.phase === "recording" || this.phase === "arming") {
      this.finishConversation();
    }
  }

  private onPcm(input: Float32Array) {
    const copy = new Float32Array(input.length);
    copy.set(input);

    // RMS of this block
    let sum = 0;
    for (let i = 0; i < copy.length; i += 4) {
      const v = copy[i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, copy.length / 4));
    this.lastRms = rms;
    this.peakRms = Math.max(this.peakRms * 0.995, rms);
    const isSpeech = rms >= this.config.speechRms;

    if (this.phase === "idle" || this.phase === "arming") {
      this.pushRing(copy);
    }
    if (this.phase === "recording") {
      this.convo.push(copy);
      this.totalFrames += 1;
      if (isSpeech) this.speechFrames += 1;
    }
  }

  private pushRing(chunk: Float32Array) {
    this.ring.push(chunk);
    this.ringSamples += chunk.length;
    const max = Math.floor(this.config.preRollSec * this.sampleRate);
    while (this.ringSamples > max && this.ring.length > 1) {
      const dropped = this.ring.shift()!;
      this.ringSamples -= dropped.length;
    }
  }

  private tick() {
    const isSpeech = this.lastRms >= this.config.speechRms;
    const step = 100;

    if (this.phase === "idle") {
      if (isSpeech) {
        this.speechMs += step;
        this.silenceMs = 0;
        if (this.speechMs >= this.config.speechStartMs) {
          this.beginConversation();
        } else if (this.speechMs >= 400) {
          this.phase = "arming";
        }
      } else {
        this.speechMs = Math.max(0, this.speechMs - step * 1.5);
        this.silenceMs += step;
      }
    } else if (this.phase === "arming") {
      if (isSpeech) {
        this.speechMs += step;
        this.silenceMs = 0;
        if (this.speechMs >= this.config.speechStartMs) {
          this.beginConversation();
        }
      } else {
        this.silenceMs += step;
        this.speechMs = Math.max(0, this.speechMs - step);
        if (this.silenceMs > 800) {
          this.phase = "idle";
          this.speechMs = 0;
        }
      }
    } else if (this.phase === "recording") {
      if (isSpeech) {
        this.silenceMs = 0;
      } else {
        this.silenceMs += step;
        if (this.silenceMs >= this.config.silenceEndMs) {
          this.finishConversation();
        }
      }
    }

    this.emit();
  }

  private beginConversation() {
    this.phase = "recording";
    this.silenceMs = 0;
    this.speechMs = 0;
    this.convo = this.ring.length ? [...this.ring] : [];
    this.ring = [];
    this.ringSamples = 0;
    this.speechFrames = 0;
    this.totalFrames = 0;
    this.convoStartedAt = Date.now();
    this.cbs.onConversationStart?.();
  }

  private finishConversation() {
    this.phase = "saving";
    const durationSec = (Date.now() - this.convoStartedAt) / 1000;
    const speechRatio = this.totalFrames ? this.speechFrames / this.totalFrames : 0;
    const pcm = concatFloat32(this.convo);
    this.resetConvo();

    const minSec = this.config.minConversationMs / 1000;
    if (durationSec < minSec) {
      this.phase = "idle";
      this.cbs.onDiscarded?.(`Too short (${durationSec.toFixed(1)}s)`);
      this.emit();
      return;
    }
    if (speechRatio < this.config.minSpeechRatio) {
      this.phase = "idle";
      this.cbs.onDiscarded?.("Mostly silence / noise — skipped");
      this.emit();
      return;
    }
    if (pcm.length < this.sampleRate * 1.5) {
      this.phase = "idle";
      this.cbs.onDiscarded?.("Insufficient audio content");
      this.emit();
      return;
    }

    const blob = encodeWavMono(pcm, this.sampleRate);
    this.phase = "idle";
    this.cbs.onConversationEnd?.(blob, { durationSec, speechRatio });
    this.emit();
  }

  private resetConvo() {
    this.convo = [];
    this.speechFrames = 0;
    this.totalFrames = 0;
    this.convoStartedAt = 0;
    this.silenceMs = 0;
    this.speechMs = 0;
  }

  private emit() {
    const rms = this.lastRms;
    const levelBars = Math.min(10, Math.round(rms * 80));
    let signalQuality: VadSnapshot["signalQuality"] = "Silent";
    if (rms > 0.08) signalQuality = "Excellent";
    else if (rms > 0.04) signalQuality = "Good";
    else if (rms > 0.02) signalQuality = "Fair";
    else if (rms > 0.008) signalQuality = "Poor";

    this.cbs.onSnapshot?.({
      phase: this.phase,
      rms,
      levelBars,
      signalQuality,
      sampleRate: this.sampleRate,
      speechMs: this.speechMs,
      silenceMs: this.silenceMs,
      conversationSec: this.convoStartedAt ? (Date.now() - this.convoStartedAt) / 1000 : 0,
    });
  }
}
