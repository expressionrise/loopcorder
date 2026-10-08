// Pure helpers for the microphone frame buffer.

/**
 * Cut [start, start+len) out of timestamped chunks ({f: firstFrame, d: Float32Array}).
 * Frames with no data stay silent.
 */
export function extractFrames(chunks, start, len) {
  const out = new Float32Array(len);
  for (const c of chunks) {
    const off = c.f - start;
    if (off + c.d.length <= 0 || off >= len) continue;
    for (let j = 0; j < c.d.length; j++) {
      const k = off + j;
      if (k >= 0 && k < len) out[k] = c.d[j];
    }
  }
  return out;
}

/** Linear fade in/out in place, to avoid clicks at the loop seam. */
export function applyEdgeFades(data, fadeFrames) {
  const len = data.length;
  const f = Math.min(len >> 2, fadeFrames);
  for (let i = 0; i < f; i++) {
    const g = i / f;
    data[i] *= g;
    data[len - 1 - i] *= g;
  }
  return data;
}

/** Peak level of every 4th sample, used for the input meter. */
export function peakLevel(d) {
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s = Math.max(s, Math.abs(d[i]));
  return s;
}

/** Linear resampling, used when a stored project was recorded at another sample rate. */
export function resampleLinear(data, fromRate, toRate) {
  if (fromRate === toRate) return data;
  const n = Math.round((data.length * toRate) / fromRate);
  const out = new Float32Array(n);
  const ratio = fromRate / toRate;
  for (let i = 0; i < n; i++) {
    const p = i * ratio;
    const i0 = Math.floor(p);
    const frac = p - i0;
    out[i] = data[i0] * (1 - frac) + (data[Math.min(i0 + 1, data.length - 1)] ?? 0) * frac;
  }
  return out;
}
