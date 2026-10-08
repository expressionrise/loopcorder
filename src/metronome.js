// Metronome: pure beat math + a lookahead scheduler on a bus separate from the mix.

export const LOOKAHEAD_SEC = 0.12;
export const TICK_MS = 25;

export const beatSec = (bpm) => 60 / bpm;

export const clampBpm = (v) => Math.min(240, Math.max(40, Math.round(v) || 90));

/** Index of the first beat at or after `nowSec + slack`, counted from the grid origin. */
export function nextBeatIndex(nowSec, gridSec, bpm, slack = 0.02) {
  return Math.ceil((nowSec + slack - gridSec) / beatSec(bpm));
}

export function createClick(ctx, out, t, accent, loud) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = loud ? 'square' : 'sine';
  o.frequency.value = accent ? 1600 : 1000;
  const v = loud ? 0.9 : accent ? 0.5 : 0.3;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (loud ? 0.02 : 0.05));
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.07);
}

/**
 * @param {object} deps
 * @param {() => AudioContext|null} deps.getCtx
 * @param {() => GainNode} deps.getOut click bus (outside the mix)
 * @param {() => {grid:number|null, nextBeat:number, beatIdx:number, bpm:number, beats:number, audible:boolean}} deps.getState
 *        mutable state object; `audible` is computed by the caller (count-in or click on while playing)
 */
export function createScheduler({ getCtx, getOut, getState }) {
  function tick() {
    const ctx = getCtx();
    const S = getState();
    if (!ctx || S.grid == null) return;
    const b = beatSec(S.bpm);
    while (S.nextBeat < ctx.currentTime + LOOKAHEAD_SEC) {
      if (S.audible() && S.nextBeat >= ctx.currentTime - 0.01) {
        createClick(ctx, getOut(), S.nextBeat, S.beatIdx % S.beats === 0);
      }
      S.beatIdx++;
      S.nextBeat = S.grid + S.beatIdx * b;
    }
  }
  return { start: () => setInterval(tick, TICK_MS), tick };
}
