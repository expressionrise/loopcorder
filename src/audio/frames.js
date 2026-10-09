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

/**
 * Trim a loop layer: keep [a, b) (fractions of the length) and silence the rest,
 * with short fades at the cut points. The length stays the same so the layer stays on the loop grid.
 */
export function applyTrim(src, a, b, fadeFrames) {
  const len = src.length;
  const out = new Float32Array(len);
  const ia = Math.max(0, Math.min(len, Math.round(a * len)));
  const ib = Math.max(ia, Math.min(len, Math.round(b * len)));
  out.set(src.subarray(ia, ib), ia);
  const f = Math.min((ib - ia) >> 2, fadeFrames);
  // No fade at the loop seam itself (a = 0 / b = 1) - the seam already has edge fades.
  if (ia > 0) for (let i = 0; i < f; i++) out[ia + i] *= i / f;
  if (ib < len) for (let i = 0; i < f; i++) out[ib - 1 - i] *= i / f;
  return out;
}
