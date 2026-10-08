// Looping playback of tracks, aligned to the loop grid.
import { engine } from './engine.js';
import { S, newTrackId, emit } from '../state.js';
import { startOffset } from './timing.js';

export function addTrack(data, { vol = 1, muted = false } = {}) {
  const { ctx, sr, master } = engine;
  const buf = ctx.createBuffer(1, data.length, sr);
  buf.copyToChannel(data, 0);
  const gain = ctx.createGain();
  gain.connect(master);
  const t = { id: newTrackId(), buf, gain, vol, muted, src: null, data };
  applyGain(t, true);
  S.tracks.push(t);
  startSrc(t);
  emit();
  return t;
}

export function startSrc(t) {
  stopSrc(t);
  if (!S.loop || !S.playing) return;
  const { ctx, sr } = engine;
  const src = ctx.createBufferSource();
  src.buffer = t.buf;
  src.loop = true;
  src.connect(t.gain);
  const when = ctx.currentTime + 0.03;
  const { T0, L } = S.loop;
  src.start(when, startOffset(Math.round(when * sr), T0, L) / sr);
  t.src = src;
}

export function stopSrc(t) {
  if (t.src) {
    try {
      t.src.stop();
    } catch (e) {
      /* already stopped */
    }
    t.src.disconnect();
    t.src = null;
  }
}

export function applyGain(t, immediate = false) {
  const v = t.muted ? 0 : t.vol;
  if (immediate) t.gain.gain.value = v;
  else t.gain.gain.setTargetAtTime(v, engine.ctx.currentTime, 0.01);
}

export function disposeTrack(t) {
  stopSrc(t);
  t.gain.disconnect();
}
