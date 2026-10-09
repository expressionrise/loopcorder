# Loopcorder

Mobile audio looper (PWA) for Android Chrome. Vanilla JS (ES modules) + Web Audio API, built with Vite. UI strings are Polish; code and comments are English.

## Commands
- `npm run dev` - dev server (http://localhost:5173)
- `npm run build` - production build to `dist/` (includes service worker)
- `npm run preview` - serve the build (http://localhost:4173), tests PWA/offline
- `npm test` - Vitest unit tests (pure logic only)
- `npm run icons` - regenerate `public/icons/` from `scripts/make-icons.mjs`

The microphone needs HTTPS or `localhost`. On a phone use USB port forwarding (`chrome://inspect`) or an HTTPS tunnel; plain LAN HTTP will not work.

## Structure
- `src/audio/` engine (graph, mic buffer, wake lock), `tap.worklet.js`, `playback.js` (tracks, trim), `timing.js` and `frames.js` (pure), `calibration.js`
- `src/recorder/` `wav.js` (pure encoder/decoder), `mix-recorder.js`
- `src/storage/` `settings.js` (localStorage), `projects.js` (IndexedDB)
- `src/ui/` `app.js` (all DOM wiring), `styles.css`, `haptics.js`
- `src/metronome.js`, `src/session.js` (pedal state machine), `src/state.js` (shared state `S` + `emit`), `src/project.js` (save/load glue)
- `resorces/` is git-ignored: original prototype `loopcorder.html` and draft docs. Reference only.

## Rules that must not break
- **Sync model:** every layer is exactly one loop length `L`. Capture range is `[start + latency, start + latency + L]`; playback uses `AudioBufferSourceNode` with `loop = true` and start offset `(when - T0) mod L`. Do not change this without explaining why to the user first.
- Mic is opened with echoCancellation, noiseSuppression and autoGainControl all off.
- Metronome clicks go on `engine.clickOut`, outside the master bus, so they never reach the mix recording.
- The worklet must stay a real file in the build (`build.assetsInlineLimit: 0` in `vite.config.js`); inlined as a `data:` URI it would not precache.
- Pure math belongs in `timing.js`, `frames.js`, `wav.js`, `calibration.js`, `metronome.js` and needs a test in `test/`.

## Features done
Two modes (free / metronome), layering, per-track volume/mute/delete, undo, clear (confirm), play/stop, mix recording to WAV (optional live mic), latency slider + auto calibration, wake lock, haptics, PWA + offline, projects in IndexedDB (save/load/rename/delete), **track trim** (see below).

## Track trim
"Przytnij" on a track opens start/end sliders over the waveform. Audio outside the range is silenced (4 ms fades), the length stays `L` so the layer stays on the grid. `track.source` is the untouched recording, `track.data` is what plays, `track.trim = {a, b}` as fractions. Projects store `source` plus `trim`.

## Status (2026-10-08)
- Git: local repo on `main`, remote `origin` = https://github.com/expressionrise/loopcorder.git, only `Initial commit` (LICENSE) pushed. **Nothing from this session is committed yet.** User plans to create a `develop` branch.
- Suggested commit: `feat: modular Loopcorder PWA with projects, tests and offline support`.
- 37 unit tests pass, build passes. **Not yet tested on a real phone**: layer alignment in both modes, offline after install, project save/load, trim.

## Open ideas
- Project rename currently uses the name field plus the "Nazwa" button (works, but a proper dialog would be nicer).
- Loaded projects start their loop at the current time, not at a stored position.
- Trim: live preview while dragging, snap-to-bar in metronome mode.
- Later (not now): per-track effects (reverb, delay, filter), Bluetooth pedal, export single loop, native Kotlin + Oboe version.
