// Shared mutable session state (single source of truth for the UI and the engine).
export const S = {
  mode: 'free', // 'free' | 'metro'
  bpm: 90,
  bars: 2,
  beats: 4,
  clickOn: true,
  latMs: 80,
  phase: 'idle', // idle | countIn | recFirst | armed | rec | processing | cal
  loop: null, // { T0, L } in frames
  pending: null, // { start, len|null }
  playing: true,
  tracks: [], // { id, buf, gain, vol, muted, src, data }
  grid: null, // metronome grid origin (seconds)
  nextBeat: 0,
  beatIdx: 0,
};

let nextId = 1;
export const newTrackId = () => nextId++;
export const resetTrackIds = (n = 1) => {
  nextId = n;
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export const emit = () => listeners.forEach((fn) => fn());
