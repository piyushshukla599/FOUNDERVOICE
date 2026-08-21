"use client";

import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream | null;
  active: boolean;
};

/** Idle/simple waveform, canvas paint only, no React bar state. */
export function Waveform({ stream, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d", { alpha: false });
    if (!c) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    let lastDraw = 0;
    const barCount = 40;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - lastDraw < 50) return;
      lastDraw = t;
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      c.fillStyle = "#0f1412";
      c.fillRect(0, 0, w, h);
      const gap = 3;
      const barW = (w - gap * barCount) / barCount;
      for (let i = 0; i < barCount; i++) {
        const v = Math.max(0.06, data[i % data.length] / 255);
        const bh = v * h;
        const x = i * (barW + gap);
        const y = (h - bh) / 2;
        const grad = c.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(0, "#c4a35a");
        grad.addColorStop(1, "#3d8f6e");
        c.fillStyle = grad;
        c.fillRect(x, y, barW, bh);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close();
    };
  }, [stream, active]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={96}
      className="h-24 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)]"
    />
  );
}
