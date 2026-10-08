// Sends input frames to the main thread together with currentFrame (sample-accurate timestamp).
class Tap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = true;
    this.port.onmessage = (e) => {
      this.on = e.data;
    };
  }
  process(inp) {
    const i = inp[0];
    if (this.on && i && i.length && i[0]) {
      this.port.postMessage({ f: currentFrame, d: i.map((c) => c.slice(0)) });
    }
    return true;
  }
}
registerProcessor('tap', Tap);
