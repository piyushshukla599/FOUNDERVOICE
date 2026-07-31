/** Fast, downsampled pitch estimate — avoids O(n²) on full buffers. */
export function estimatePitch(timeDomain: Float32Array, sampleRate: number): number {
  // Downsample to ~2k samples max for speed
  const step = Math.max(1, Math.floor(timeDomain.length / 512));
  const n = Math.floor(timeDomain.length / step);
  if (n < 64) return 0;

  let rms = 0;
  for (let i = 0; i < timeDomain.length; i += step) {
    const v = timeDomain[i];
    rms += v * v;
  }
  rms = Math.sqrt(rms / n);
  if (rms < 0.015) return 0;

  const minLag = Math.floor(sampleRate / (400 * step));
  const maxLag = Math.min(n - 1, Math.floor(sampleRate / (70 * step)));
  if (maxLag <= minLag) return 0;

  let bestLag = -1;
  let bestCorr = -1;
  // Sample every other lag for speed
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let corr = 0;
    const limit = n - lag;
    for (let i = 0; i < limit; i += 2) {
      corr += timeDomain[i * step] * timeDomain[(i + lag) * step];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return 0;
  const freq = sampleRate / (bestLag * step);
  if (freq < 60 || freq > 400) return 0;
  return freq;
}
