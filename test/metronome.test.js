import { describe, it, expect } from 'vitest';
import { beatSec, clampBpm, nextBeatIndex } from '../src/metronome.js';

describe('metronome math', () => {
  it('computes beat length', () => {
    expect(beatSec(120)).toBe(0.5);
  });
  it('clamps BPM to 40-240 and falls back to 90 for junk', () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(999)).toBe(240);
    expect(clampBpm(NaN)).toBe(90);
    expect(clampBpm(100.4)).toBe(100);
  });
  it('finds the next beat index from the grid origin', () => {
    expect(nextBeatIndex(10.1, 10, 120)).toBe(1);
    expect(nextBeatIndex(10.0, 10, 120)).toBe(1); // slack pushes past the current beat
    expect(nextBeatIndex(9, 10, 120)).toBe(-1);
  });
});
