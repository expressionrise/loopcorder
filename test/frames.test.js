import { describe, it, expect } from 'vitest';
import { extractFrames, applyEdgeFades, resampleLinear } from '../src/audio/frames.js';

const chunk = (f, arr) => ({ f, d: Float32Array.from(arr) });

describe('extractFrames', () => {
  it('cuts a range spanning several chunks sample for sample', () => {
    const chunks = [chunk(0, [1, 2, 3, 4]), chunk(4, [5, 6, 7, 8])];
    expect([...extractFrames(chunks, 2, 4)]).toEqual([3, 4, 5, 6]);
  });
  it('leaves gaps silent', () => {
    expect([...extractFrames([chunk(0, [1, 2])], 0, 4)]).toEqual([1, 2, 0, 0]);
  });
  it('handles a range starting before the first chunk', () => {
    expect([...extractFrames([chunk(2, [9, 9])], 0, 4)]).toEqual([0, 0, 9, 9]);
  });
  it('ignores chunks fully outside', () => {
    expect([...extractFrames([chunk(100, [1, 1])], 0, 4)]).toEqual([0, 0, 0, 0]);
  });
});

describe('applyEdgeFades', () => {
  it('ramps both ends and keeps the middle', () => {
    const d = new Float32Array(16).fill(1);
    applyEdgeFades(d, 4);
    expect(d[0]).toBe(0);
    expect(d[3]).toBeCloseTo(0.75);
    expect(d[4]).toBe(1);
    expect(d[15]).toBe(0);
    expect(d[12]).toBeCloseTo(0.75);
  });
  it('limits fades to a quarter of a short buffer', () => {
    const d = new Float32Array(8).fill(1);
    applyEdgeFades(d, 100);
    expect(d[2]).toBe(1);
  });
});

describe('resampleLinear', () => {
  it('returns the input for equal rates', () => {
    const d = Float32Array.of(1, 2);
    expect(resampleLinear(d, 48000, 48000)).toBe(d);
  });
  it('doubles the length when upsampling 2x with interpolation', () => {
    const out = resampleLinear(Float32Array.of(0, 1, 0, 1), 24000, 48000);
    expect(out.length).toBe(8);
    expect(out[1]).toBeCloseTo(0.5);
  });
});
