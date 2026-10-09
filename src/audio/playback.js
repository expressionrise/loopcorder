// Looping playback of tracks, aligned to the loop grid.
import { engine } from './engine.js';
import { S, newTrackId, emit } from '../state.js';
import { startOffset } from './timing.js';
import { applyTrim } from './frames.js';

const fadeFrames = () => Math.round(0.004 * engine.sr);

function makeBuffer(data) {
  const buf = engine.ctx.createBuffer(1, data.length, engine.sr);
  buf.copyToChannel(data, 0);
  return buf;
}

/** `source` is the untouched recording; `data` is what plays (source with the trim applied). */
export function addTrack(source, { vol = 1, muted = false, trim = { a: 0, b: 1 } } = {}) {
  const { ctx, master } = engine;
  const data = trim.a > 0 || trim.b < 1 ? applyTrim(source, trim.a, trim.b, fadeFrames()) : source;
  const buf = makeBuffer(data);
  const gain = ctx.createGain();
  gain.connect(master);
  const t = { id: newTrackId(), buf, gain, vol, muted, src: null, data, source, trim: { ...trim } };
  applyGain(t, true);
  S.tracks.push(t);
  startSrc(t);
  emit();
  return t;
}

/** Re-cut the layer to [a, b) of the loop; playback stays on the grid. */
export function setTrim(t, a, b) {
  t.trim = { a, b };
  t.data = applyTrim(t.source, a, b, fadeFrames());
  t.buf = makeBuffer(t.data);
  startSrc(t);
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
