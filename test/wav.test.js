import { describe, it, expect } from 'vitest';
import { encodeWav, decodeWav } from '../src/recorder/wav.js';

const ascii = (v, o, n) => String.fromCharCode(...new Uint8Array(v.buffer, o, n));

describe('encodeWav', () => {
  const L = Float32Array.of(0, 1, -1, 2);
  const R = Float32Array.of(0.5, -0.5, 0, -3);
  const buf = encodeWav([L, R], 44100);
  const v = new DataView(buf);

  it('writes a valid 16-bit stereo PCM header', () => {
    expect(ascii(v, 0, 4)).toBe('RIFF');
    expect(ascii(v, 8, 4)).toBe('WAVE');
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint32(28, true)).toBe(44100 * 4);
    expect(v.getUint16(32, true)).toBe(4);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(16);
    expect(v.getUint32(4, true)).toBe(buf.byteLength - 8);
    expect(buf.byteLength).toBe(44 + 16);
  });

  it('interleaves channels L,R,L,R...', () => {
    // frame 0: L=0, R=0.5; frame 1: L=1, R=-0.5
    expect(v.getInt16(44, true)).toBe(0);
    expect(v.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(v.getInt16(48, true)).toBe(0x7fff);
    expect(v.getInt16(50, true)).toBe(Math.trunc(-0.5 * 0x8000));
  });

  it('maps -1 to full negative scale and clips out-of-range samples', () => {
    expect(v.getInt16(52, true)).toBe(-0x8000); // frame 2, L = -1
    expect(v.getInt16(56, true)).toBe(0x7fff); // frame 3, L = 2 -> clipped
    expect(v.getInt16(58, true)).toBe(-0x8000); // frame 3, R = -3 -> clipped
  });

  it('round-trips through decodeWav within 16-bit precision', () => {
    const { channels, sampleRate } = decodeWav(buf);
    expect(sampleRate).toBe(44100);
    expect(channels[0][1]).toBeCloseTo(1, 3);
    expect(channels[1][0]).toBeCloseTo(0.5, 3);
    expect(channels[1][1]).toBeCloseTo(-0.5, 3);
  });

  it('encodes mono as a 1-channel file', () => {
    const m = new DataView(encodeWav([Float32Array.of(0, 0.25)], 48000));
    expect(m.getUint16(22, true)).toBe(1);
    expect(m.getUint32(40, true)).toBe(4);
  });
});
