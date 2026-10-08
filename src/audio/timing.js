// Pure loop-timing math. All positions are in audio frames (samples).

/** Loop geometry for metronome mode: first loop starts one bar after the grid origin (count-in). */
export function metronomeLoop({ gridStartSec, beatSec, beats, bars, sampleRate }) {
  const bar = beats * beatSec;
  return {
    start: Math.round((gridStartSec + bar) * sampleRate),
    len: Math.round(bars * bar * sampleRate),
  };
}

/** Position inside the loop, always in [0, L). */
export function loopPosition(frame, T0, L) {
  return (((frame - T0) % L) + L) % L;
}

/** First loop start (T0 + k*L) at least `guardFrames` after `nowFrame`. */
export function nextLoopStart(nowFrame, T0, L, guardFrames) {
  const k = Math.ceil((nowFrame + guardFrames - T0) / L);
  return T0 + k * L;
}

/** Buffer offset (in frames) at which a looping source must start to be on the loop grid at `whenFrame`. */
export function startOffset(whenFrame, T0, L) {
  return loopPosition(whenFrame, T0, L);
}

/** Frame range of the input to cut for a layer: shifted by the latency compensation. */
export function captureRange(start, len, latencyFrames) {
  return { from: start + latencyFrames, to: start + latencyFrames + len };
}
