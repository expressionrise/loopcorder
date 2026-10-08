// Latency calibration: detect speaker clicks in the mic recording and take the median delay.
import { extractFrames } from './frames.js';

export const CLICK_COUNT = 7;
export const CLICK_GAP_SEC = 0.5;
export const CLICK_LEAD_SEC = 0.4;

/** Median of a numeric array (upper median for even lengths, matching the prototype). */
export function median(values) {
  const a = [...values].sort((x, y) => x - y);
  return a[a.length >> 1];
}

/** Index of the first sample reaching half of the window peak, or -1 if the window is too quiet. */
export function detectClickDelay(win, minPeak = 0.03) {
  let pk = 0;
  for (const x of win) pk = Math.max(pk, Math.abs(x));
  if (pk < minPeak) return -1;
  const th = pk * 0.5;
  return win.findIndex((x) => Math.abs(x) >= th);
}

/**
 * Delay in frames from the mic chunks, or null if fewer than 3 clicks were heard.
 * The first click is skipped (output wake-up).
 */
export function measureDelayFrames(chunks, t0Sec, sampleRate, count = CLICK_COUNT, gap = CLICK_GAP_SEC) {
  const delays = [];
  for (let i = 1; i < count; i++) {
    const F = Math.round((t0Sec + i * gap) * sampleRate);
    const idx = detectClickDelay(extractFrames(chunks, F, Math.round(0.45 * sampleRate)));
    if (idx >= 0) delays.push(idx);
  }
  return delays.length < 3 ? null : median(delays);
}
