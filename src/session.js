// Pedal state machine and session actions (no DOM here).
import { S, emit } from './state.js';
import { engine, nowF, extract } from './audio/engine.js';
import { addTrack, startSrc, stopSrc, disposeTrack } from './audio/playback.js';
import { metronomeLoop, nextLoopStart } from './audio/timing.js';
import { applyEdgeFades } from './audio/frames.js';
import { beatSec, createScheduler, nextBeatIndex, createClick } from './metronome.js';
import { measureDelayFrames, CLICK_COUNT, CLICK_GAP_SEC, CLICK_LEAD_SEC } from './audio/calibration.js';
import { saveLatency } from './storage/settings.js';
import { hapticStart, hapticEnd, hapticCancel } from './ui/haptics.js';

export const latF = () => Math.round((S.latMs / 1000) * engine.sr);

export function setLat(v) {
  S.latMs = v;
  saveLatency(v);
  emit();
}

/* ---------- metronome ---------- */
// The scheduler reads and advances the beat cursor stored in S.
const beatState = {
  get grid() {
    return S.grid;
  },
  get bpm() {
    return S.bpm;
  },
  get beats() {
    return S.beats;
  },
  get nextBeat() {
    return S.nextBeat;
  },
  set nextBeat(v) {
    S.nextBeat = v;
  },
  get beatIdx() {
    return S.beatIdx;
  },
  set beatIdx(v) {
    S.beatIdx = v;
  },
  audible: () => S.phase === 'countIn' || (S.clickOn && S.playing),
};

export const scheduler = createScheduler({
  getCtx: () => engine.ctx,
  getOut: () => engine.clickOut,
  getState: () => beatState,
});

function startGrid(t0) {
  S.grid = t0;
  S.beatIdx = 0;
  S.nextBeat = t0;
}

/** Jump the click grid to the current time without changing its phase. */
function resyncGrid() {
  if (S.grid == null) return;
  S.beatIdx = nextBeatIndex(engine.ctx.currentTime, S.grid, S.bpm);
  S.nextBeat = S.grid + S.beatIdx * beatSec(S.bpm);
}

/* ---------- pedal ---------- */
export function pedalPress() {
  const { ctx, sr } = engine;
  if (!ctx) return;
  ctx.resume();
  const p = S.phase;
  const n = nowF();
  if (!S.loop) {
    if (p === 'idle') {
      if (S.mode === 'metro') {
        const t0 = ctx.currentTime + 0.15;
        startGrid(t0);
        S.pending = metronomeLoop({ gridStartSec: t0, beatSec: beatSec(S.bpm), beats: S.beats, bars: S.bars, sampleRate: sr });
        engine.holdFrom = S.pending.start;
        S.phase = 'countIn';
      } else {
        S.pending = { start: n, len: null };
        engine.holdFrom = n;
        S.phase = 'recFirst';
        hapticStart();
      }
    } else if (p === 'recFirst' && S.mode === 'free') {
      const len = n - S.pending.start;
      if (len < 0.3 * sr) {
        cancel();
        return;
      }
      S.pending.len = len;
      S.phase = 'processing';
      hapticEnd();
    } else if (p === 'countIn' || p === 'recFirst') {
      cancel();
      S.grid = null;
    }
  } else if (p === 'idle') {
    const { T0, L } = S.loop;
    const B = nextLoopStart(n, T0, L, Math.round(0.08 * sr));
    S.pending = { start: B, len: L };
    engine.holdFrom = B;
    S.phase = 'armed';
  } else if (p === 'armed' || p === 'rec') {
    cancel();
  }
  emit();
}

export function cancel() {
  if (S.phase !== 'idle') hapticCancel();
  S.pending = null;
  engine.holdFrom = null;
  S.phase = 'idle';
  emit();
}

function finalize() {
  const { start, len } = S.pending;
  const data = applyEdgeFades(extract(start + latF(), len), Math.round(0.004 * engine.sr));
  if (!S.loop) {
    S.loop = { T0: start, L: len };
    if (S.mode === 'free') S.grid = null;
  }
  addTrack(data);
  S.pending = null;
  engine.holdFrom = null;
  S.phase = 'idle';
  hapticEnd();
  emit();
}

/** Called every animation frame: advances phases that depend on audio time. */
export function advance() {
  const n = nowF();
  const p = S.phase;
  if (S.pending && S.pending.len && engine.latestF >= S.pending.start + latF() + S.pending.len && (p === 'processing' || p === 'rec' || p === 'recFirst')) {
    finalize();
    return;
  }
  if (p === 'countIn' && n >= S.pending.start) {
    S.phase = 'recFirst';
    hapticStart();
    emit();
  }
  if (p === 'armed' && n >= S.pending.start) {
    S.phase = 'rec';
    hapticStart();
    emit();
  }
  if (p === 'recFirst' && S.mode === 'metro' && n >= S.pending.start + S.pending.len) {
    S.phase = 'processing';
    hapticEnd();
    emit();
  }
}

/* ---------- tracks / transport ---------- */
export function removeTrack(id) {
  const t = S.tracks.find((x) => x.id === id);
  if (!t) return;
  disposeTrack(t);
  S.tracks = S.tracks.filter((x) => x !== t);
  if (!S.tracks.length) {
    S.loop = null;
    S.grid = null;
    cancel();
  }
  emit();
}

export function clearAll() {
  S.tracks.forEach(disposeTrack);
  S.tracks = [];
  S.loop = null;
  S.grid = null;
  S.playing = true;
  cancel();
}

export function togglePlay() {
  S.playing = !S.playing;
  S.tracks.forEach((t) => (S.playing ? startSrc(t) : stopSrc(t)));
  if (S.playing) resyncGrid();
  emit();
}

/* ---------- calibration ---------- */
export function calibrate(onDone) {
  if (S.phase !== 'idle') return;
  const { ctx, sr } = engine;
  ctx.resume();
  S.phase = 'cal';
  const t0 = ctx.currentTime + CLICK_LEAD_SEC;
  engine.holdFrom = Math.round(t0 * sr);
  for (let i = 0; i < CLICK_COUNT; i++) createClick(ctx, engine.clickOut, t0 + i * CLICK_GAP_SEC, true, true);
  emit();
  setTimeout(() => {
    const d = measureDelayFrames(engine.chunks, t0, sr);
    engine.holdFrom = null;
    S.phase = 'idle';
    if (d != null) setLat(Math.round((d / sr) * 1000));
    emit();
    onDone(d != null);
  }, (CLICK_LEAD_SEC + CLICK_COUNT * CLICK_GAP_SEC + 0.7) * 1000);
}
