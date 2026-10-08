# Loopcorder

A mobile loop station in your browser. Record a loop, layer more on top in perfect sync, and record the whole mix to WAV.

Built for Android phones in Chrome as a PWA, with vanilla JavaScript (ES modules) and the Web Audio API. No framework, no backend, no account. The interface is in Polish; code and comments are in English.

Part of the *-corder* family of tools by [ExpressionRise](https://expressionrise.com).

## Features

- **Two ways to start**
  - **Free mode:** tap to start, tap again to close the loop. The first loop sets the length.
  - **Metronome mode:** pick the BPM (40–240) and the loop length (1, 2, 4 or 8 bars of 4/4). After a one-bar count-in the loop records and closes on its own. The click can be switched off while you play.
- **Sample-accurate layering:** every new layer starts on the next loop boundary and records exactly one loop length.
- **Track controls:** volume, mute, delete, undo last layer, clear all (with confirmation), play/stop, and a waveform for each track.
- **Projects:** save, load, rename and delete projects. They are stored on the device in IndexedDB (tracks as 16-bit WAV, plus mode, BPM, bars, volumes and mutes).
- **Record the whole mix** to a 16-bit stereo WAV file, with the metronome click left out. You can include the live microphone, for example to sing over your loops.
- **Latency compensation:** a manual slider plus automatic calibration that plays clicks through the speaker and measures them through the mic.
- **Works offline** once installed, and keeps the screen awake while you play.
- **Haptics:** a short vibration when recording starts and ends.

## Getting started

The microphone only works on pages served over **HTTPS** or from `localhost`.

### Run locally

```bash
git clone https://github.com/expressionrise/loopcorder.git
cd loopcorder
npm install
npm run dev
```

Open `http://localhost:5173`. On the same machine the microphone works because `localhost` counts as secure.

To try it on your phone, either:

- deploy a build (see below), or
- tunnel the dev server over HTTPS, for example `npx localtunnel --port 5173` or a Cloudflare tunnel, or
- use Chrome on Android with USB debugging and port forwarding (`chrome://inspect` → *Port forwarding* → `5173` → `localhost:5173`); the phone then sees `localhost` too.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build in `dist/` (includes the service worker) |
| `npm run preview` | Serves `dist/` locally to test the PWA and offline mode |
| `npm test` | Unit tests (Vitest) |
| `npm run icons` | Regenerates the PWA icons in `public/icons/` |

### Deploy

The build uses relative paths, so the same `dist/` works at a domain root and under a sub-path.

- **Netlify:** connect the repo. `netlify.toml` already sets the build command (`npm run build`) and publish directory (`dist`). Or drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
- **GitHub Pages:** Settings → Pages → *Source: GitHub Actions*, then add a workflow that runs `npm ci && npm run build` and publishes `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages`.

On Android, open the page in Chrome and choose **Add to Home screen** (or **Install app**).

## Tips

- **Use headphones.** Without them the mic picks up the speaker and your loops record themselves.
- **Calibrate once.** Open *Opóźnienie*, take your headphones off, turn the volume up and tap *Kalibruj*. If layers still feel slightly late, fine-tune with the slider. The value is remembered on the device.

## How it works

- An `AudioWorklet` streams microphone frames tagged with their `currentFrame`. A layer is cut from that stream at `[loopStart + latency, loopStart + latency + loopLength]`, so it lines up with the loop to the sample.
- Each track plays from an `AudioBufferSourceNode` with `loop = true`, started at an offset measured from the first loop's start. Every track stays on the same grid.
- The metronome uses a lookahead scheduler (25 ms tick, 120 ms window) on its own output bus, so it never ends up in the recorded mix.
- The mic opens with echo cancellation, noise suppression and auto gain turned off, so the recording stays clean and unprocessed.

### Project layout

```
src/
  audio/       engine, worklet, playback, timing (pure), frames (pure), calibration
  recorder/    wav encoder (pure), mix recorder
  storage/     settings (localStorage), projects (IndexedDB)
  ui/          DOM wiring, styles, haptics
  metronome.js scheduler and beat math
  session.js   pedal state machine and actions
  state.js     shared session state
test/          unit tests for the pure logic
```

## Roadmap

- [x] Split into ES modules
- [x] PWA manifest and offline support
- [x] Save and load projects (IndexedDB)
- [ ] Per-track effects: reverb, delay, filter
- [ ] Bluetooth foot pedal support
- [ ] Export a single loop
- [ ] Native Android version (Kotlin + Oboe)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 ExpressionRise
