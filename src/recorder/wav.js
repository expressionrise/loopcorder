// Pure 16-bit PCM WAV encoder.

/** @param {Float32Array[]} chs channels @param {number} rate sample rate @returns {ArrayBuffer} */
export function encodeWav(chs, rate) {
  const n = chs[0].length;
  const nc = chs.length;
  const b = new ArrayBuffer(44 + n * nc * 2);
  const v = new DataView(b);
  const w = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * nc * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nc, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * nc * 2, true);
  v.setUint16(32, nc * 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * nc * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const s = Math.max(-1, Math.min(1, chs[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return b;
}

/** Decode a 16-bit PCM WAV back to float channels (used for stored projects). */
export function decodeWav(buffer) {
  const v = new DataView(buffer);
  const nc = v.getUint16(22, true);
  const rate = v.getUint32(24, true);
  const n = (v.getUint32(40, true) / (nc * 2)) | 0;
  const chs = Array.from({ length: nc }, () => new Float32Array(n));
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const s = v.getInt16(o, true);
      chs[c][i] = s < 0 ? s / 0x8000 : s / 0x7fff;
      o += 2;
    }
  }
  return { channels: chs, sampleRate: rate };
}

export const wavBlob = (chs, rate) => new Blob([encodeWav(chs, rate)], { type: 'audio/wav' });
