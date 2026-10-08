import { describe, it, expect } from 'vitest';
import { metronomeLoop, loopPosition, nextLoopStart, startOffset, captureRange } from '../src/audio/timing.js';

describe('metronomeLoop', () => {
  it('starts one bar after the grid origin and lasts `bars` bars', () => {
    const r = metronomeLoop({ gridStartSec: 1, beatSec: 0.5, beats: 4, bars: 2, sampleRate: 48000 });
    expect(r.start).toBe(Math.round(3 * 48000)); // 1 s + one 2 s bar
    expect(r.len).toBe(4 * 48000);
  });
  it('rounds to whole frames at 90 BPM', () => {
    const r = metronomeLoop({ gridStartSec: 0, beatSec: 60 / 90, beats: 4, bars: 1, sampleRate: 44100 });
    expect(Number.isInteger(r.len)).toBe(true);
    expect(r.len).toBe(Math.round((4 * 60 * 44100) / 90));
  });
});

describe('loopPosition', () => {
  it('wraps forward and backward into [0, L)', () => {
    expect(loopPosition(1250, 1000, 100)).toBe(50);
    expect(loopPosition(950, 1000, 100)).toBe(50);
    expect(loopPosition(1000, 1000, 100)).toBe(0);
  });
});

describe('nextLoopStart', () => {
  it('returns the next boundary after the guard time', () => {
    expect(nextLoopStart(1010, 1000, 100, 8)).toBe(1100);
  });
  it('skips a boundary that is too close', () => {
    expect(nextLoopStart(1095, 1000, 100, 8)).toBe(1200);
  });
  it('is exactly on a boundary when now+guard lands on it', () => {
    expect(nextLoopStart(1092, 1000, 100, 8)).toBe(1100);
  });
  it('works before T0', () => {
    expect(nextLoopStart(500, 1000, 100, 0)).toBe(500);
  });
});

describe('startOffset', () => {
  it('equals the loop position at the start time', () => {
    expect(startOffset(1370, 1000, 100)).toBe(70);
    expect(startOffset(1000, 1000, 100)).toBe(0);
  });
});

describe('captureRange', () => {
  it('shifts the capture window by the latency', () => {
    expect(captureRange(1000, 100, 30)).toEqual({ from: 1030, to: 1130 });
  });
});
