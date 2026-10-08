// Audio graph, microphone capture buffer and wake lock.
import { extractFrames, peakLevel } from './frames.js';
import { loadLatency, saveLatency } from '../storage/settings.js';

const workletUrl = new URL('./tap.worklet.js', import.meta.url);

export const engine = {
  ctx: null,
  sr: 0,
  micSrc: null,
  micTap: null,
  masterTap: null,
  master: null,
  clickOut: null,
  liveGain: null,
  chunks: [],
  latestF: 0,
  holdFrom: null, // keep mic frames from this position on while recording
  level: 0,
  onMixFrames: null, // (channels: Float32Array[]) => void while mix recording
};

export const nowF = () => Math.round(engine.ctx.currentTime * engine.sr);

function onMic(e) {
  const d = e.data.d[0];
  engine.chunks.push({ f: e.data.f, d });
  engine.latestF = e.data.f + d.length;
  engine.level = Math.max(peakLevel(d), engine.level * 0.92);
  const keep = engine.holdFrom != null ? engine.holdFrom - engine.sr : engine.latestF - 3 * engine.sr;
  while (engine.chunks.length && engine.chunks[0].f + engine.chunks[0].d.length < keep) engine.chunks.shift();
}

export const extract = (start, len) => extractFrames(engine.chunks, start, len);

/** Creates the context, worklets and mic stream. Must be called from a user gesture. */
export async function initEngine() {
  const E = engine;
  E.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  E.sr = E.ctx.sampleRate;
  await E.ctx.audioWorklet.addModule(workletUrl);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  E.micSrc = E.ctx.createMediaStreamSource(stream);
  const sink = E.ctx.createGain();
  sink.gain.value = 0;
  sink.connect(E.ctx.destination);

  E.micTap = new AudioWorkletNode(E.ctx, 'tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' });
  E.micSrc.connect(E.micTap);
  E.micTap.connect(sink);
  E.micTap.port.onmessage = onMic;

  E.master = E.ctx.createGain();
  E.master.connect(E.ctx.destination);
  E.masterTap = new AudioWorkletNode(E.ctx, 'tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
  E.masterTap.port.postMessage(false);
  E.master.connect(E.masterTap);
  E.masterTap.connect(sink);
  E.masterTap.port.onmessage = (e) => E.onMixFrames?.(e.data.d);

  E.liveGain = E.ctx.createGain();
  E.liveGain.gain.value = 0;
  E.micSrc.connect(E.liveGain);
  E.liveGain.connect(E.masterTap);

  E.clickOut = E.ctx.createGain(); // metronome bus, outside the mix
  E.clickOut.connect(E.ctx.destination);

  const est = Math.round(((E.ctx.baseLatency || 0) + (E.ctx.outputLatency || 0)) * 1000 * 2);
  return loadLatency() ?? Math.min(300, Math.max(30, est || 80));
}

let wl = null;
export async function requestWake() {
  try {
    wl = await navigator.wakeLock.request('screen');
  } catch (e) {
    /* not supported or denied */
  }
}

export function watchVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && engine.ctx) {
      requestWake();
      engine.ctx.resume();
    }
  });
}

export { saveLatency };
