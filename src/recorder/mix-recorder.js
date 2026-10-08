// Records the live mix (metronome excluded) from the master tap into a stereo WAV.
import { engine } from '../audio/engine.js';
import { wavBlob } from './wav.js';

let chunks = null;
let startedAt = 0;

export const isMixRecording = () => !!chunks;
export const mixElapsedSec = () => (Date.now() - startedAt) / 1000;

export function startMix() {
  chunks = [];
  startedAt = Date.now();
  engine.onMixFrames = (d) => chunks.push(d);
  engine.masterTap.port.postMessage(true);
}

/** @returns {{blob: Blob, seconds: number}|null} null if the take is shorter than 0.2 s */
export function stopMix() {
  engine.masterTap.port.postMessage(false);
  engine.onMixFrames = null;
  const ch = chunks;
  chunks = null;
  const sr = engine.sr;
  let n = 0;
  ch.forEach((c) => (n += c[0].length));
  if (n < sr * 0.2) return null;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  let o = 0;
  ch.forEach((c) => {
    L.set(c[0], o);
    R.set(c[1] || c[0], o);
    o += c[0].length;
  });
  return { blob: wavBlob([L, R], sr), seconds: n / sr };
}

export function takeFileName(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `loopcorder-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.wav`;
}
