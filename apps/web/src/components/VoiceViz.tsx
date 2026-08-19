"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The voice visualization — this product speaks about speaking, so the waveform
 * is the visual identity rather than another card.
 *
 * Idle it breathes gently, so the interface feels alive before you press
 * anything. Live it follows your actual microphone. One canvas, no library.
 */
export function VoiceViz({
  stream,
  active = false,
  height = 120,
  className,
  tone = "accent",
}: {
  stream?: MediaStream | null;
  active?: boolean;
  height?: number;
  className?: string;
  tone?: "accent" | "quiet";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  /** Smoothed per-column amplitudes, so the line never jitters. */
  const levelsRef = useRef<number[]>([]);
  const phaseRef = useRef(0);

  /* Attach the analyser only while we actually have a live stream. */
  useEffect(() => {
    if (!stream || !active) {
      analyserRef.current = null;
      if (ctxRef.current) {
        void ctxRef.current.close().catch(() => undefined);
        ctxRef.current = null;
      }
      return;
    }
    let cancelled = false;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      if (!cancelled) {
        ctxRef.current = ctx;
        analyserRef.current = analyser;
      }
    } catch {
      /* visualization is decorative — never break recording over it */
    }
    return () => {
      cancelled = true;
      analyserRef.current = null;
      if (ctxRef.current) {
        void ctxRef.current.close().catch(() => undefined);
        ctxRef.current = null;
      }
    };
  }, [stream, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COLUMNS = 72;
    if (levelsRef.current.length !== COLUMNS) levelsRef.current = new Array(COLUMNS).fill(0);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const timeData = new Uint8Array(2048);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = height;
      const mid = h / 2;
      ctx2d.clearRect(0, 0, w, h);

      phaseRef.current += reduced ? 0 : 0.022;

      /* Current input envelope: real when live, a slow breath when idle. */
      let envelope = 0;
      const analyser = analyserRef.current;
      if (analyser && active) {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i += 2) {
          const v = (timeData[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / (timeData.length / 2));
        envelope = Math.min(1, rms * 3.4);
      }

      const levels = levelsRef.current;
      /* Shift the history left and push the newest sample on the right, so the
         waveform scrolls the way speech actually arrives. */
      for (let i = 0; i < COLUMNS - 1; i++) levels[i] = levels[i + 1];
      const idle = reduced ? 0.06 : 0.05 + Math.sin(phaseRef.current) * 0.028;
      levels[COLUMNS - 1] = active ? Math.max(envelope, 0.04) : Math.max(idle, 0.02);

      /* The spectrum, mirrored: violet leads, magenta trails. */
      const alpha = active ? 0.62 : 0.32;
      const gradient = ctx2d.createLinearGradient(0, 0, w, 0);
      if (tone === "accent") {
        gradient.addColorStop(0, "rgba(139, 92, 246, 0.06)");
        gradient.addColorStop(0.25, `rgba(139, 92, 246, ${alpha})`);
        gradient.addColorStop(0.55, `rgba(91, 124, 250, ${alpha})`);
        gradient.addColorStop(0.85, `rgba(224, 86, 160, ${alpha * 0.9})`);
        gradient.addColorStop(1, "rgba(224, 86, 160, 0.06)");
      } else {
        gradient.addColorStop(0, "rgba(139, 138, 163, 0.05)");
        gradient.addColorStop(0.5, `rgba(139, 138, 163, ${alpha * 0.7})`);
        gradient.addColorStop(1, "rgba(139, 138, 163, 0.05)");
      }

      ctx2d.beginPath();
      for (let i = 0; i < COLUMNS; i++) {
        const x = (i / (COLUMNS - 1)) * w;
        // taper the ends so the shape floats instead of being cut off
        const taper = Math.sin((i / (COLUMNS - 1)) * Math.PI);
        const y = mid - levels[i] * mid * 0.92 * taper;
        if (i === 0) ctx2d.moveTo(x, y);
        else {
          const px = ((i - 1) / (COLUMNS - 1)) * w;
          const pTaper = Math.sin(((i - 1) / (COLUMNS - 1)) * Math.PI);
          const py = mid - levels[i - 1] * mid * 0.92 * pTaper;
          ctx2d.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        }
      }
      for (let i = COLUMNS - 1; i >= 0; i--) {
        const x = (i / (COLUMNS - 1)) * w;
        const taper = Math.sin((i / (COLUMNS - 1)) * Math.PI);
        const y = mid + levels[i] * mid * 0.92 * taper;
        ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();
      if (active) {
        ctx2d.shadowColor = "rgba(139, 92, 246, 0.5)";
        ctx2d.shadowBlur = 18;
      }
      ctx2d.fillStyle = gradient;
      ctx2d.fill();
      ctx2d.shadowBlur = 0;

      /* Centre line — the resting state of a voice */
      ctx2d.beginPath();
      ctx2d.moveTo(0, mid);
      ctx2d.lineTo(w, mid);
      ctx2d.strokeStyle = active ? "rgba(167, 139, 250, 0.4)" : "rgba(139, 138, 163, 0.18)";
      ctx2d.lineWidth = 1;
      ctx2d.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, height, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("w-full", className)}
      style={{ height }}
    />
  );
}
