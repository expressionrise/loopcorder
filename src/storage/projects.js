// Projects in IndexedDB. Each record holds settings plus tracks as 16-bit mono WAV buffers.
const DB_NAME = 'loopcorder';
const STORE = 'projects';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(result.result);
    };
    t.onerror = t.onabort = () => {
      db.close();
      reject(t.error);
    };
  });
}

/**
 * @typedef {object} ProjectRecord
 * @property {string} id
 * @property {string} name
 * @property {number} updatedAt
 * @property {{mode:string,bpm:number,bars:number,clickOn:boolean}} settings
 * @property {number} sampleRate
 * @property {{wav:ArrayBuffer,vol:number,muted:boolean}[]} tracks
 */

export const newProjectId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Newest first. */
export async function listProjects() {
  const all = await tx('readonly', (s) => s.getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getProject = (id) => tx('readonly', (s) => s.get(id));

export function saveProject(rec) {
  return tx('readwrite', (s) => s.put({ ...rec, updatedAt: Date.now() }));
}

export const deleteProject = (id) => tx('readwrite', (s) => s.delete(id));

export async function renameProject(id, name) {
  const rec = await getProject(id);
  if (!rec) return;
  rec.name = name;
  await saveProject(rec);
}
