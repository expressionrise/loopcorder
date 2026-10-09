// DOM wiring: reads/writes S, calls session actions. UI strings are Polish.
import { S, onChange, emit } from '../state.js';
import { engine, initEngine, nowF, requestWake, watchVisibility } from '../audio/engine.js';
import { applyGain, setTrim } from '../audio/playback.js';
import { beatSec, clampBpm } from '../metronome.js';
import { loopPosition } from '../audio/timing.js';
import { pedalPress, advance, removeTrack, clearAll, togglePlay, calibrate, scheduler, setLat } from '../session.js';
import { startMix, stopMix, isMixRecording, mixElapsedSec, takeFileName } from '../recorder/mix-recorder.js';
import { listProjects, deleteProject, renameProject } from '../storage/projects.js';
import { saveCurrent, loadProject, currentProjectId, forgetCurrentProject } from '../project.js';

const $ = (s) => document.querySelector(s);
const fmt = (s) => {
  s = Math.max(0, s);
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s % 1) * 10);
};
const RING = 289.03;

/* ---------- start ---------- */
$('#startBtn').onclick = async () => {
  try {
    S.latMs = await initEngine();
    setLat(S.latMs);
    $('#start').hidden = true;
    $('#app').hidden = false;
    requestWake();
    watchVisibility();
    scheduler.start();
    requestAnimationFrame(tick);
    emit();
    refreshProjects();
  } catch (err) {
    const m = $('#startErr');
    m.hidden = false;
    m.textContent =
      location.protocol !== 'https:' && location.hostname !== 'localhost'
        ? 'Mikrofon działa tylko na stronie z HTTPS. Wrzuć plik na hosting z HTTPS i otwórz go stamtąd.'
        : 'Nie udało się włączyć mikrofonu. Zezwól przeglądarce na dostęp do mikrofonu i spróbuj ponownie. (' + err.message + ')';
  }
};

/* ---------- controls ---------- */
$('#pedalBtn').onclick = pedalPress;
$('#playBtn').onclick = togglePlay;
$('#undoBtn').onclick = () => {
  const t = S.tracks[S.tracks.length - 1];
  if (t) removeTrack(t.id);
};
let clearArm = 0;
$('#clearBtn').onclick = () => {
  const b = $('#clearBtn');
  if (Date.now() - clearArm > 2500) {
    clearArm = Date.now();
    b.textContent = 'Na pewno?';
    setTimeout(() => {
      b.textContent = 'Wyczyść';
    }, 2500);
    return;
  }
  clearArm = 0;
  b.textContent = 'Wyczyść';
  clearAll();
  forgetCurrentProject();
};

const locked = () => !!S.loop || S.phase !== 'idle';
$('#modeFree').onclick = () => {
  if (!locked()) {
    S.mode = 'free';
    emit();
  }
};
$('#modeMetro').onclick = () => {
  if (!locked()) {
    S.mode = 'metro';
    emit();
  }
};
function setBpm(v) {
  if (S.loop) return;
  S.bpm = clampBpm(v);
  $('#bpm').value = S.bpm;
  emit();
}
$('#bpmDown').onclick = () => setBpm(S.bpm - 1);
$('#bpmUp').onclick = () => setBpm(S.bpm + 1);
$('#bpm').onchange = (e) => setBpm(+e.target.value);
$('#bars').onclick = (e) => {
  const b = e.target.dataset.b;
  if (!b || S.loop) return;
  S.bars = +b;
  emit();
};
$('#clickOn').onchange = (e) => {
  S.clickOn = e.target.checked;
};
$('#liveMic').onchange = (e) => {
  engine.liveGain.gain.value = e.target.checked ? 1 : 0;
};
$('#lat').oninput = (e) => setLat(+e.target.value);
$('#calBtn').onclick = () => {
  if (S.phase !== 'idle') return;
  $('#calBtn').disabled = true;
  $('#calMsg').textContent = 'Słuchaj… nie mów nic.';
  calibrate((ok) => {
    $('#calBtn').disabled = false;
    $('#calMsg').textContent = ok
      ? `Ustawione: ${S.latMs} ms. Załóż słuchawki z powrotem.`
      : 'Za cicho. Zdejmij słuchawki, podgłośnij telefon i spróbuj ponownie.';
  });
};

/* ---------- mix recording ---------- */
$('#mixBtn').onclick = () => {
  if (!isMixRecording()) {
    startMix();
  } else {
    const take = stopMix();
    if (take) showTake(take);
  }
  render();
};
function showTake({ blob, seconds }) {
  const url = URL.createObjectURL(blob);
  const name = takeFileName();
  const el = document.createElement('div');
  el.className = 'take';
  el.innerHTML = `<div class="top"><span></span><span>${fmt(seconds)}</span></div><audio controls preload="metadata"></audio><a download>Pobierz plik WAV</a>`;
  el.querySelector('.top span').textContent = name;
  el.querySelector('audio').src = url;
  const a = el.querySelector('a');
  a.href = url;
  a.download = name;
  $('#takes').prepend(el);
  a.click();
}

/* ---------- tracks ---------- */
const trimOpen = new Set(); // track ids whose trim editor is expanded

function drawTracks() {
  const box = $('#tracks');
  box.textContent = '';
  if (!S.tracks.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Nie ma jeszcze żadnej pętli.';
    box.append(p);
    return;
  }
  S.tracks.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'tr' + (t.muted ? ' muted' : '');
    const trimmed = t.trim.a > 0 || t.trim.b < 1;
    el.innerHTML = `<span class="n">${i + 1}</span><div class="mid"><canvas></canvas><input class="vol" type="range" min="0" max="1.5" step="0.01" value="${t.vol}" aria-label="Głośność ścieżki ${i + 1}"><div class="acts"><button class="m" aria-pressed="${t.muted}">Wycisz</button><button class="t" aria-pressed="${trimOpen.has(t.id)}">${trimmed ? 'Przycięta ✂' : 'Przytnij ✂'}</button><button class="d" aria-label="Usuń ścieżkę ${i + 1}">✕</button></div></div>`;
    el.querySelector('.vol').oninput = (e) => {
      t.vol = +e.target.value;
      applyGain(t);
    };
    el.querySelector('.m').onclick = () => {
      t.muted = !t.muted;
      applyGain(t);
      drawTracks();
    };
    el.querySelector('.d').onclick = () => {
      trimOpen.delete(t.id);
      removeTrack(t.id);
    };
    el.querySelector('.t').onclick = () => {
      if (trimOpen.has(t.id)) trimOpen.delete(t.id);
      else trimOpen.add(t.id);
      drawTracks();
    };
    box.append(el);
    wave(el.querySelector('canvas'), t.data);
    if (trimOpen.has(t.id)) el.querySelector('.mid').append(trimEditor(t));
  });
}

/** Editor with two handles: everything outside [start, end) of the loop is silenced. */
function trimEditor(t) {
  const MIN_GAP = 20; // out of 1000 steps
  const secs = (v) => fmt((v / 1000) * (t.source.length / engine.sr));
  const ed = document.createElement('div');
  ed.className = 'trim';
  ed.innerHTML = `<div class="tw"><canvas></canvas><i class="sh l"></i><i class="sh r"></i></div>
    <label>Początek <output class="oa"></output><input class="ra" type="range" min="0" max="1000" step="1" aria-label="Początek nagrania"></label>
    <label>Koniec <output class="ob"></output><input class="rb" type="range" min="0" max="1000" step="1" aria-label="Koniec nagrania"></label>
    <div class="row"><button class="reset">Cała pętla</button></div>`;
  const ra = ed.querySelector('.ra');
  const rb = ed.querySelector('.rb');
  ra.value = Math.round(t.trim.a * 1000);
  rb.value = Math.round(t.trim.b * 1000);
  const paint = () => {
    ed.querySelector('.sh.l').style.width = ra.value / 10 + '%';
    ed.querySelector('.sh.r').style.width = (1000 - rb.value) / 10 + '%';
    ed.querySelector('.oa').textContent = secs(+ra.value);
    ed.querySelector('.ob').textContent = secs(+rb.value);
  };
  // Live preview of the handles while dragging; the audio is re-cut on release.
  ra.oninput = () => {
    if (+ra.value > rb.value - MIN_GAP) ra.value = rb.value - MIN_GAP;
    paint();
  };
  rb.oninput = () => {
    if (+rb.value < +ra.value + MIN_GAP) rb.value = +ra.value + MIN_GAP;
    paint();
  };
  const commit = () => {
    setTrim(t, ra.value / 1000, rb.value / 1000);
    drawTracks();
  };
  ra.onchange = rb.onchange = commit;
  ed.querySelector('.reset').onclick = () => {
    ra.value = 0;
    rb.value = 1000;
    commit();
  };
  requestAnimationFrame(() => {
    wave(ed.querySelector('canvas'), t.source, 56);
    paint();
  });
  return ed;
}
function wave(cv, d, h = 30) {
  const w = cv.clientWidth || 240;
  const dpr = devicePixelRatio || 1;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  c.fillStyle = '#ffb547';
  const step = Math.max(1, Math.floor(d.length / w));
  let peak = 0.001;
  for (let i = 0; i < d.length; i += 16) peak = Math.max(peak, Math.abs(d[i]));
  for (let x = 0; x < w; x++) {
    let m = 0;
    const s = x * step;
    for (let j = 0; j < step; j += 8) {
      const v = Math.abs(d[s + j] || 0);
      if (v > m) m = v;
    }
    const bh = Math.max(1, (m / peak) * (h - 2));
    c.fillRect(x, (h - bh) / 2, 1, bh);
  }
}

/* ---------- projects ---------- */
const msg = (t) => {
  $('#projMsg').textContent = t;
};
$('#saveBtn').onclick = async () => {
  try {
    await saveCurrent($('#projName').value.trim());
    msg('Zapisano.');
    refreshProjects();
  } catch (e) {
    msg('Nie udało się zapisać: ' + e.message);
  }
};
async function refreshProjects() {
  const box = $('#projects');
  let list = [];
  try {
    list = await listProjects();
  } catch (e) {
    msg('Pamięć projektów jest niedostępna.');
  }
  box.textContent = '';
  for (const p of list) {
    const el = document.createElement('div');
    el.className = 'proj' + (p.id === currentProjectId ? ' cur' : '');
    el.innerHTML = '<div class="nm"><b></b><span></span></div><button class="ld">Wczytaj</button><button class="rn" aria-label="Zmień nazwę">Nazwa</button><button class="del" aria-label="Usuń projekt">✕</button>';
    el.querySelector('b').textContent = p.name;
    el.querySelector('span').textContent = `${p.tracks.length} ścieżek · ${p.settings.mode === 'metro' ? p.settings.bpm + ' BPM' : 'tryb wolny'} · ${new Date(p.updatedAt).toLocaleDateString('pl-PL')}`;
    el.querySelector('.ld').onclick = async () => {
      if (S.phase !== 'idle') return msg('Zakończ nagrywanie przed wczytaniem.');
      await loadProject(p.id);
      $('#projName').value = p.name;
      msg(`Wczytano: ${p.name}`);
      refreshProjects();
    };
    el.querySelector('.rn').onclick = async () => {
      const name = ($('#projName').value || '').trim();
      if (!name) return msg('Wpisz nową nazwę w polu powyżej i dotknij „Nazwa”.');
      await renameProject(p.id, name);
      refreshProjects();
    };
    const del = el.querySelector('.del');
    let armed = 0;
    del.onclick = async () => {
      if (Date.now() - armed > 2500) {
        armed = Date.now();
        del.textContent = '?';
        setTimeout(() => {
          del.textContent = '✕';
        }, 2500);
        return;
      }
      await deleteProject(p.id);
      if (p.id === currentProjectId) forgetCurrentProject();
      refreshProjects();
    };
    box.append(el);
  }
  if (!list.length) {
    const e = document.createElement('p');
    e.className = 'empty';
    e.textContent = 'Brak zapisanych projektów.';
    box.append(e);
  }
}

/* ---------- render ---------- */
const PHASE_LABELS = {
  countIn: ['1… 2… 3…', 'dotknij, by anulować'],
  armed: ['CZEKAM', 'start na początku pętli'],
  rec: ['NAKŁADAM', 'dotknij, by anulować'],
  processing: ['…', ''],
  cal: ['KALIBRACJA', ''],
};

function render() {
  const lock = locked();
  const busy = !!S.loop || S.phase !== 'idle';
  $('#modeFree').setAttribute('aria-pressed', S.mode === 'free');
  $('#modeMetro').setAttribute('aria-pressed', S.mode === 'metro');
  $('#modeFree').disabled = $('#modeMetro').disabled = lock;
  $('#metroBox').hidden = S.mode !== 'metro';
  $('#freeNote').hidden = S.mode !== 'free';
  ['#bpmDown', '#bpmUp', '#bpm'].forEach((s) => ($(s).disabled = busy));
  [...$('#bars').children].forEach((b) => {
    b.setAttribute('aria-pressed', +b.dataset.b === S.bars);
    b.disabled = busy;
  });
  $('#bpm').value = S.bpm;
  $('#clickOn').checked = S.clickOn;
  $('#lat').value = S.latMs;
  $('#latOut').textContent = S.latMs + ' ms';
  const leds = $('#leds');
  if (leds.children.length !== S.beats) {
    leds.textContent = '';
    for (let i = 0; i < S.beats; i++) leds.append(document.createElement('i'));
  }
  const pd = $('#pedal');
  pd.className = 'pedal' + (['recFirst', 'rec'].includes(S.phase) ? ' rec' : '') + (['armed', 'countIn'].includes(S.phase) ? ' armed' : '');
  const idle = S.loop ? ['NAKŁADAJ', 'kolejna warstwa od początku pętli'] : ['NAGRAJ', S.mode === 'metro' ? 'po odliczeniu' : 'pierwsza pętla'];
  const recFirst = S.mode === 'free' ? ['ZAMKNIJ', 'dotknij na końcu pętli'] : ['NAGRYWAM', 'zamknie się sama'];
  const [b, s] = S.phase === 'idle' ? idle : S.phase === 'recFirst' ? recFirst : PHASE_LABELS[S.phase] || ['', ''];
  $('#pBig').textContent = b;
  $('#pSmall').textContent = s;
  $('#pedalBtn').disabled = S.phase === 'processing' || S.phase === 'cal';
  $('#playBtn').disabled = !S.loop;
  $('#playBtn').textContent = S.playing ? '■ Stop' : '▶ Graj';
  $('#undoBtn').disabled = $('#clearBtn').disabled = !S.tracks.length || S.phase !== 'idle';
  $('#saveBtn').disabled = !S.tracks.length || S.phase !== 'idle';
  $('#mixBtn').classList.toggle('on', isMixRecording());
  if (!isMixRecording()) $('#mixBtn').textContent = '● Nagraj całość';
  const n = S.tracks.length;
  const word = n === 1 ? 'ścieżka' : n < 5 ? 'ścieżki' : 'ścieżek';
  $('#status').textContent = S.loop
    ? `${n} ${word} · ${fmt(S.loop.L / engine.sr)}` + (S.mode === 'metro' ? ` · ${S.bpm} BPM` : '')
    : S.mode === 'metro'
      ? `${S.bpm} BPM · ${S.bars} takt${S.bars === 1 ? '' : 'y'}`
      : 'tryb wolny';
}

let tracksSig = '';
onChange(() => {
  render();
  const sig = S.tracks.map((t) => `${t.id}${t.muted}`).join();
  if (sig !== tracksSig) {
    tracksSig = sig;
    drawTracks();
  }
});

/* ---------- frame loop ---------- */
function tick() {
  requestAnimationFrame(tick);
  advance();
  const n = nowF();
  const sr = engine.sr;
  let frac = 0;
  let txt = '—';
  if (S.phase === 'countIn') {
    const left = (S.pending.start - n) / sr;
    txt = 'odliczanie ' + Math.max(1, Math.ceil(left / beatSec(S.bpm)));
    frac = 1 - left / (S.beats * beatSec(S.bpm));
  } else if (S.phase === 'recFirst' && S.mode === 'free') {
    txt = '● ' + fmt((n - S.pending.start) / sr);
    frac = (((n - S.pending.start) / sr) % 4) / 4;
  } else if (S.phase === 'recFirst') {
    frac = (n - S.pending.start) / S.pending.len;
    txt = '● ' + fmt((n - S.pending.start) / sr) + ' / ' + fmt(S.pending.len / sr);
  } else if (S.loop) {
    const pos = loopPosition(n, S.loop.T0, S.loop.L);
    frac = S.playing ? pos / S.loop.L : 0;
    txt = (S.phase === 'rec' ? '● ' : '') + fmt(pos / sr) + ' / ' + fmt(S.loop.L / sr) + (S.phase === 'armed' ? '  start za ' + fmt((S.pending.start - n) / sr) : '');
  }
  $('#ring').style.strokeDashoffset = RING * (1 - Math.min(1, Math.max(0, frac)));
  $('#counter').textContent = txt;
  $('#meter').style.width = Math.min(100, engine.level * 130) + '%';
  if (isMixRecording()) $('#mixBtn').textContent = '■ Zatrzymaj nagrywanie  ' + fmt(mixElapsedSec());
  const leds = $('#leds').children;
  if (S.grid != null && S.mode === 'metro') {
    const bt = Math.floor((engine.ctx.currentTime - S.grid) / beatSec(S.bpm));
    for (let i = 0; i < leds.length; i++) {
      leds[i].className = bt >= 0 && ((bt % S.beats) + S.beats) % S.beats === i ? 'on' + (i === 0 ? ' down' : '') : '';
    }
  } else for (const l of leds) l.className = '';
}

