import { describe, it, expect } from 'vitest';
import { median, detectClickDelay, measureDelayFrames } from '../src/audio/calibration.js';

describe('median', () => {
  it('takes the middle of an odd list', () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  it('is robust to outliers', () => {
    expect(median([100, 102, 101, 5000, 99, 100])).toBe(101);
  });
  it('does not mutate the input', () => {
    const a = [3, 1, 2];
    median(a);
    expect(a).toEqual([3, 1, 2]);
  });
});

describe('detectClickDelay', () => {
  it('finds the first sample above half of the peak', () => {
    const w = new Float32Array(100);
    w[40] = 0.2;
    w[41] = 0.9;
    expect(detectClickDelay(w)).toBe(41);
  });
  it('returns -1 for a quiet window', () => {
    expect(detectClickDelay(new Float32Array(100).fill(0.01))).toBe(-1);
  });
});

describe('measureDelayFrames', () => {
  const sr = 1000;
  const t0 = 1;
  const make = (delay, skip = []) => {
    const total = 6000;
    const d = new Float32Array(total);
    for (let i = 0; i < 7; i++) {
      if (skip.includes(i)) continue;
      d[Math.round((t0 + i * 0.5) * sr) + delay] = 1;
    }
    return [{ f: 0, d }];
  };
  it('recovers the delay as the median across clicks', () => {
    expect(measureDelayFrames(make(37), t0, sr)).toBe(37);
  });
  it('returns null when fewer than 3 clicks are heard', () => {
    expect(measureDelayFrames(make(37, [1, 2, 3, 4]), t0, sr)).toBeNull();
  });
});
