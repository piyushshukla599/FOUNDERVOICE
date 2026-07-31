"use client";

import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream | null;
  active: boolean;
  color: string;
};

/** Canvas-only waveform — no React state, no 60fps re-renders. */
export function LiveWaveform({ stream, active, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

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
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    let lastDraw = 0;
    const barCount = 40;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      // Cap ~20fps for UI smoothness
      if (t - lastDraw < 50) return;
      lastDraw = t;

      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      c.fillStyle = "#0f1412";
      c.fillRect(0, 0, w, h);

      const gap = 3;
      const barW = (w - gap * barCount) / barCount;
      const col = colorRef.current;
      for (let i = 0; i < barCount; i++) {
        const v = Math.max(0.06, data[i % data.length] / 255);
        const bh = v * h;
        const x = i * (barW + gap);
        const y = (h - bh) / 2;
        c.globalAlpha = 0.4 + v * 0.6;
        c.fillStyle = col;
        c.fillRect(x, y, barW, bh);
      }
      c.globalAlpha = 1;
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
      height={80}
      className="mt-4 h-20 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)]"
    />
  );
}
