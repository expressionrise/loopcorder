// Glue between the live session and stored projects.
import { S, emit } from './state.js';
import { engine, nowF } from './audio/engine.js';
import { addTrack } from './audio/playback.js';
import { clearAll } from './session.js';
import { encodeWav, decodeWav } from './recorder/wav.js';
import { resampleLinear } from './audio/frames.js';
import { newProjectId, saveProject, getProject } from './storage/projects.js';

export let currentProjectId = null;

/** Serialize the current session. Returns the id it was saved under. */
export async function saveCurrent(name) {
  if (!S.tracks.length) throw new Error('Brak ścieżek do zapisania.');
  const existing = currentProjectId ? await getProject(currentProjectId) : null;
  const id = existing ? existing.id : newProjectId();
  await saveProject({
    id,
    name: name || existing?.name || 'Bez nazwy',
    settings: { mode: S.mode, bpm: S.bpm, bars: S.bars, clickOn: S.clickOn },
    sampleRate: engine.sr,
    tracks: S.tracks.map((t) => ({ wav: encodeWav([t.source], engine.sr), vol: t.vol, muted: t.muted, trim: t.trim })),
  });
  currentProjectId = id;
  return id;
}

export async function loadProject(id) {
  const rec = await getProject(id);
  if (!rec) throw new Error('Nie znaleziono projektu.');
  clearAll();
  Object.assign(S, rec.settings);
  const decoded = rec.tracks.map((t) => {
    const { channels, sampleRate } = decodeWav(t.wav);
    return { data: resampleLinear(channels[0], sampleRate, engine.sr), vol: t.vol, muted: t.muted, trim: t.trim };
  });
  const L = decoded[0].data.length;
  const T0 = nowF();
  S.loop = { T0, L };
  if (S.mode === 'metro') {
    S.grid = T0 / engine.sr;
    S.beatIdx = 0;
    S.nextBeat = S.grid;
  }
  decoded.forEach((t) => addTrack(t.data, { vol: t.vol, muted: t.muted, trim: t.trim }));
  currentProjectId = id;
  emit();
}

export function forgetCurrentProject() {
  currentProjectId = null;
}
