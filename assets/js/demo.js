// Demostración de la app real de Aplaudify: primero se muestra sola, por
// partes, y al final queda lista para que la persona la use ("Pruébalo tú").
const FILES = {
  music: [
    { t: 'Mañana tranquila', a: 'Lista acústica', d: 167 },
    { t: 'Pop alegre', a: 'Éxitos del momento', d: 192 },
    { t: 'Tarde acústica', a: 'Lista acústica', d: 201 },
    { t: 'Clásicos del pop', a: 'Éxitos de siempre', d: 245 },
  ],
  spot: [
    { t: 'Cuña de bienvenida', a: 'Voz cálida', d: 6 },
    { t: 'Promoción del día', a: 'Voz enérgica', d: 5 },
    { t: 'Cuña de cierre', a: 'Voz corporativa', d: 10 },
  ],
  folder: [
    { t: 'Música del local', a: 'Carpeta · 24 archivos', d: 3600 },
    { t: 'Cuñas del mes', a: 'Carpeta · 6 archivos', d: 60 },
  ],
};
const EXPLORER = [
  { t: 'Tarde acústica', a: 'Música del local', d: 201 },
  { t: 'Domingo lounge', a: 'Música del local', d: 190 },
  { t: 'Noche de salsa', a: 'Música del local', d: 228 },
  { t: 'Clásicos del pop', a: 'Música del local', d: 245 },
];
const PROJECTS = [
  { name: 'Lunes a viernes', rows: [['Mañana tranquila', 'Lista acústica', 167, 'music'], ['Cuña de bienvenida', 'Voz cálida', 6, 'spot'], ['Música del local', 'Carpeta · 24 archivos', 3600, 'tracklist'], ['Promoción del día', 'Voz enérgica', 5, 'spot']] },
  { name: 'Fin de semana', rows: [['Domingo lounge', 'Música del local', 190, 'music'], ['Aplaudify Live', 'Señal live · hasta que termine', 240, 'spotify'], ['Cuña de cierre', 'Voz corporativa', 10, 'spot']] },
  { name: 'Navidad 2026', rows: [['Navidad', 'Jingle de temporada', 136, 'spot'], ['Aplaudify Oficial', 'Stream en vivo · continuo', 3600, 'stream']] },
  { name: 'Black Friday', rows: [['Oferta relámpago', 'Voz enérgica', 8, 'spot'], ['Pop alegre', 'Éxitos del momento', 192, 'music']] },
];
const CHANNELS = [
  { name: 'Aplaudify Oficial', genres: 'Todos los géneros', oficial: true },
  { name: 'Restaurantes', genres: 'Acústico · Bossa · Jazz' },
  { name: 'Gimnasios', genres: 'Electrónica · Reggaetón · Rock' },
  { name: 'Supermercados', genres: 'Pop · Tropical · Salsa' },
  { name: 'Tiendas de ropa', genres: 'Urbano · Pop · House' },
  { name: 'Industria', genres: 'Instrumental · Lounge' },
];
const BANKS = ['Banco 1 — Efectos', 'Banco 2 — Cuñas', 'Banco 3 — Jingles', 'Banco 4', 'Banco 5', 'Banco 6'];
const PAD_NAMES = ['Timbre', 'Bienvenida', 'Oferta del día', 'Brillo', 'Cierre', 'Impacto'];
const SLIDERS = [['Volumen General', 72], ['Música', 100], ['Botonera', 90], ['Spots', 100], ['Hub', 80], ['Eventos', 100], ['Off-Music', 70], ['Stream', 85]];
const TYPE_LABEL = { music: 'MUSIC', spot: 'SPOT', stream: 'STREAM', pause: 'PAUSE', tracklist: 'MIX', spotify: 'APLY', event: 'EVENT', offmusic: 'OFF' };
const CAPTIONS = [
  'Agrega música y cuñas con el botón +.',
  'Dale play una sola vez.',
  'Programa tus eventos a la hora exacta.',
  'Suena solo, justo a tiempo.',
  'Dispara cuñas y efectos con un clic.',
  'Arrastra canciones desde el Explorador.',
  'Pon tu propia música en vivo con el Hub.',
  'Suma un stream en vivo según tu negocio.',
  'Ahora te toca: úsala tú.',
];
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clock12 = (min) => {
  const h24 = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return `${String(((h24 + 11) % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'a. m.' : 'p. m.'}`;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function initDemo({ audio, pads }) {
  const { gsap, ScrollTrigger } = window;
  const $ = (id) => document.getElementById(id);
  const win = $('appwin');
  const tilt = $('appTilt');
  const stage = $('productStage');
  const section = $('producto');
  const cur = $('apCursor');
  const caption = $('demoCaption');
  const stepBtns = [...$('demoSteps').querySelectorAll('button')];
  const rowsEl = $('apRows');
  const playBtn = $('apPlay');
  const addBtn = $('apAdd');
  const plus = $('apPlus');
  const grid = $('apGrid');
  const modal = $('apModal');
  const cfg = $('apCfg');
  const filesDlg = $('apFiles');
  const nameEl = $('apEvName');
  const clockEl = $('apEvClock');
  const dayEls = [...$('apDays').children];
  const modeEls = [...$('apModes').children];
  const padEls = [...$('apPads').children];
  const nowCard = $('apNowCard');
  const hubEl = $('apHub');
  const navs = [...win.querySelectorAll('.ap-side [data-ap-nav]')];
  const waveBars = [];
  const meterBars = [];
  const toastEl = document.createElement('div');
  toastEl.className = 'ap-toast';
  win.appendChild(toastEl);

  const d0 = new Date();
  $('apDate').textContent = `${DAYS[d0.getDay()]} ${d0.getDate()} ${MONTHS[d0.getMonth()]} ${d0.getFullYear()}`;
  for (let i = 0; i < 56; i++) {
    const b = document.createElement('i');
    b.style.height = `${18 + Math.abs(Math.sin(i * 1.37) * Math.cos(i * 0.41)) * 78}%`;
    $('apWave').appendChild(b);
    waveBars.push(b);
  }
  for (let i = 0; i < 18; i++) {
    const b = document.createElement('i');
    $('apMeter').appendChild(b);
    meterBars.push(b);
  }
  $('apSliders').innerHTML = SLIDERS.map(([n, v], i) => `<label class="ap-slider"><span>${n}</span><em>${v}%</em><input type="range" min="0" max="100" value="${v}" data-slider="${i}"></label>`).join('');
  $('apChannels').innerHTML = CHANNELS.map((c, i) => `<button type="button" class="ap-ch" data-ch="${i}">${c.oficial ? '<em>OFICIAL</em>' : ''}<b>${c.name}</b><small>${c.genres}</small><i class="ap-bulb"></i></button>`).join('');
  const chEls = [...$('apChannels').children];

  // ---------- estado ----------
  const S = {};
  let uid = 0;
  const mkRow = (t, a, d, type, extra = {}) => ({ id: ++uid, t, a, d, type, ...extra });
  function resetState() {
    Object.assign(S, {
      rows: [], sel: -1, now: -1, playing: false, pos: 0, events: [], hist: [], view: 'inicio', bank: 0,
      hubOn: false, hubMode: 'tiempo', ch: -1, files: null, filesSel: new Set(), mode: 0, vol: 72, eventPlaying: null, padsLoaded: false,
      projects: PROJECTS.map((p) => p.name), folderOpen: false,
    });
  }
  resetState();
  let inView = false;
  let tryMode = false;
  let step = 0;

  // ---------- pintar ----------
  const startMin = (i) => {
    let t = 7 * 60;
    for (let k = 0; k < i; k++) t += Math.max(1, S.rows[k].d / 60);
    return t;
  };
  function renderRows(flashId) {
    let t = 7 * 60;
    rowsEl.innerHTML = S.rows.map((r, i) => {
      const at = clock12(t);
      t += Math.max(1, r.d / 60);
      const cls = `ap-row${i === S.now ? ' is-now' : ''}${i === S.sel ? ' is-sel' : ''}${r.id === flashId ? ' is-new' : ''}`;
      const dur = r.type === 'stream' && r.live ? '∞' : r.type === 'pause' ? `${r.d}s` : r.d >= 3600 ? `${Math.round(r.d / 3600)} h` : fmt(r.d);
      return `<div class="${cls}" data-i="${i}"><span>${i === S.now && S.playing ? '▶' : i + 1}</span><b>${esc(r.t)} <small>· ${esc(r.a)}</small></b><span>${at}</span><span>${dur}</span><span class="ap-bulbs">${r.type === 'stream' ? '<i class="ap-bulb"></i>' : ''}<span class="ap-type t-${r.type}">${TYPE_LABEL[r.type]}</span></span><button type="button" class="ap-del" data-del="${i}" aria-label="Quitar de la parrilla">×</button></div>`;
    }).join('');
    $('apCount').textContent = `${S.rows.length} pista${S.rows.length === 1 ? '' : 's'}`;
    $('apQueue').textContent = String(S.rows.length);
  }
  function renderDeck() {
    const r = S.rows[S.now];
    const ev = S.eventPlaying;
    nowCard.classList.toggle('is-event', !!ev);
    if (ev) {
      $('apNowTitle').textContent = `${ev.name} — Evento`;
      $('apNowSub').textContent = 'Evento · interrupción con fundido';
    } else {
      $('apNowTitle').textContent = r ? `${r.t} — ${r.a}` : 'Selecciona una pista';
      $('apNowSub').textContent = r ? `${fmt(S.pos)} / ${fmt(Math.max(0, r.d - S.pos))} restante` : 'Arrastra archivos o usa el botón +';
    }
    $('apPrev').textContent = S.rows[S.now - 1]?.t || '---';
    $('apNext').textContent = S.rows[S.now + 1]?.t || '---';
    $('apOnAir').classList.toggle('is-live', S.playing);
    $('apMotor').textContent = S.playing ? 'Activo' : 'En espera';
    playBtn.querySelector('use').setAttribute('href', S.playing ? '#i-pause' : '#i-play');
    $('apVol').style.setProperty('--v', `${S.playing ? S.vol : 0}%`);
    $('apVolTxt').textContent = `${S.playing ? S.vol : 0}%`;
  }
  function renderEvents() {
    const box = $('apEvents');
    if (!S.events.length) {
      box.innerHTML = '<p class="ap-empty">Sin eventos próximos</p>';
      $('apEvCount').textContent = '0 activos';
      $('apNextEv').textContent = '—';
      return;
    }
    box.innerHTML = S.events.map((e) => `<div class="ap-ev${e.fired ? ' is-fired' : ''}"><b>${e.at}</b><span>${esc(e.name)}</span><em>${e.fired ? 'sonando' : e.left > 0 ? `en ${fmt(Math.ceil(e.left))}` : 'programado'}</em></div>`).join('');
    $('apEvCount').textContent = `${S.events.length} activo${S.events.length > 1 ? 's' : ''}`;
    $('apNextEv').textContent = S.events[0].at;
  }
  function renderHist() {
    const box = $('apHist');
    box.innerHTML = S.hist.length
      ? S.hist.slice(0, 7).map((h) => `<div class="ap-hrow"><span>${h[0]}</span><b>${esc(h[1])}</b><em>${h[2]}</em></div>`).join('')
      : '<p class="ap-empty">Sin reproducciones registradas aún</p>';
  }
  function renderPads() {
    padEls.forEach((p, k) => {
      const loaded = S.bank === 0 && S.padsLoaded;
      p.classList.toggle('is-loaded', loaded);
      p.querySelector('b').textContent = loaded ? PAD_NAMES[k] : '+ Añadir audio';
    });
    $('apBank').textContent = BANKS[S.bank];
  }
  function renderExplorer() {
    $('apProjects').innerHTML = S.projects.map((p, i) => `<li data-proj="${i}"><svg class="ic"><use href="#i-folder"/></svg>${esc(p)}<span>${PROJECTS[i] ? PROJECTS[i].rows.length : S.rows.length} pistas</span></li>`).join('');
    $('apCrumbs').textContent = S.folderOpen ? 'Escritorio › Música del local' : 'Elige una carpeta de tu computador';
    $('apFolderFiles').innerHTML = S.folderOpen
      ? EXPLORER.map((f, i) => `<li data-file="${i}"><svg class="ic"><use href="#i-music"/></svg><b>${f.t}.mp3</b><span>${fmt(f.d)}</span><button type="button" data-file-add="${i}" aria-label="Agregar a la parrilla">+</button></li>`).join('')
      : '';
  }
  function renderHub() {
    hubEl.dataset.state = S.hubOn ? 'on' : 'off';
    win.querySelectorAll('[data-hub-mode]').forEach((b) => b.classList.toggle('is-on', b.dataset.hubMode === S.hubMode));
    const live = S.hubMode === 'live';
    $('apHubDur').classList.toggle('is-off', live);
    $('apHubHint').textContent = live ? 'Se sincroniza con la canción que suena en tu cuenta y dura hasta que termine.' : 'Suena durante la duración fija que elijas.';
    $('apHubAdd').textContent = live ? 'Confirmar señal live' : 'Confirmar bloque de tiempo';
  }
  function renderStream() {
    const c = CHANNELS[S.ch];
    $('apStPanel').classList.toggle('is-set', !!c);
    $('apStName').textContent = c ? c.name : 'Sin canal seleccionado';
    chEls.forEach((el, i) => el.classList.toggle('is-on', i === S.ch));
  }
  function renderAll() {
    renderRows();
    renderDeck();
    renderEvents();
    renderHist();
    renderPads();
    renderExplorer();
    renderHub();
    renderStream();
    setView(S.view, true);
  }

  // ---------- acciones (las usa el guion y también la persona) ----------
  const say = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(say.t);
    say.t = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };
  const sfx = (name, opts) => { if (inView) audio.sfx(name, opts); };
  function addRows(list, at = S.rows.length) {
    const made = list.map((r) => (r.id ? r : mkRow(r.t, r.a, r.d, r.type, r)));
    S.rows.splice(at, 0, ...made);
    if (S.now >= at && S.now >= 0) S.now += made.length;
    renderRows(made[made.length - 1].id);
    renderDeck();
    sfx('tick2', { vol: 0.16 });
  }
  function removeRow(i) {
    if (i < 0 || i >= S.rows.length) return;
    S.rows.splice(i, 1);
    if (S.now === i) { S.pos = 0; if (S.now >= S.rows.length) S.now = S.rows.length ? 0 : -1; }
    else if (S.now > i) S.now--;
    if (!S.rows.length) S.playing = false;
    S.sel = -1;
    renderRows();
    renderDeck();
    sfx('pop2', { vol: 0.2 });
  }
  function histAdd(title, dur, at) {
    S.hist.unshift([at, title, dur]);
    renderHist();
    const first = $('apHist').firstElementChild;
    if (first) gsap.from(first, { y: -10, opacity: 0, duration: 0.5, ease: 'expo.out' });
  }
  function startRow(i) {
    if (!S.rows.length) return;
    S.now = Math.max(0, Math.min(i, S.rows.length - 1));
    S.pos = 0;
    S.playing = true;
    S.eventPlaying = null;
    const r = S.rows[S.now];
    histAdd(r.t, r.type === 'stream' && r.live ? '∞' : fmt(Math.min(r.d, 3599)), clock12(startMin(S.now)));
    renderRows();
    renderDeck();
    gsap.fromTo(nowCard, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
  }
  function togglePlay() {
    if (!S.rows.length) { say('Primero agrega algo a la parrilla con +'); return; }
    if (S.now < 0) { startRow(S.sel >= 0 ? S.sel : 0); return; }
    S.playing = !S.playing;
    renderRows();
    renderDeck();
  }
  function setView(v, instant) {
    if (v === 'eventos') { openModal(modal); markNav('eventos'); return; }
    if (v === 'config') { openModal(cfg); markNav('config'); return; }
    S.view = v;
    win.querySelectorAll('.ap-view').forEach((el) => el.classList.toggle('is-on', el.dataset.view === v));
    markNav(v);
    if (!instant) sfx('tick', { vol: 0.14 });
  }
  function markNav(v) { navs.forEach((n) => n.classList.toggle('is-active', n.dataset.apNav === v)); }
  function openModal(el, instant) {
    gsap.to(el, { autoAlpha: 1, duration: instant ? 0 : 0.25 });
    gsap.fromTo(el.firstElementChild, { scale: 0.95, y: 10 }, { scale: 1, y: 0, duration: instant ? 0 : 0.4, ease: 'expo.out' });
    el.setAttribute('aria-hidden', 'false');
  }
  function closeModal(el, instant) {
    gsap.to(el, { autoAlpha: 0, duration: instant ? 0 : 0.2 });
    el.setAttribute('aria-hidden', 'true');
    if (el === modal || el === cfg) markNav(S.view);
  }
  function openPlus() { plus.classList.add('is-open'); plus.classList.remove('is-type'); sfx('pop', { vol: 0.18 }); }
  function closePlus() { plus.classList.remove('is-open', 'is-type'); }
  function showType(forWhat) { S.plusFor = forWhat; plus.classList.add('is-type'); }
  function openFiles(kind) {
    S.files = kind;
    S.filesSel = new Set();
    const list = kind.startsWith('folder') ? FILES.folder : FILES[kind];
    $('apFilesTitle').textContent = kind.startsWith('folder') ? 'Elegir carpeta' : kind === 'spot' ? 'Abrir cuñas (SPOT)' : 'Abrir música (MUSIC)';
    $('apFilesTip').textContent = kind.startsWith('folder') ? 'Aplaudify rota los archivos al azar, sin repetir' : 'Elige uno o varios archivos';
    $('apFileList').innerHTML = list.map((f, i) => `<li data-f="${i}"><i></i><b>${f.t}${kind.startsWith('folder') ? '' : '.mp3'}</b><span>${kind.startsWith('folder') ? f.a.replace('Carpeta · ', '') : fmt(f.d)}</span></li>`).join('');
    closePlus();
    openModal(filesDlg);
  }
  function toggleFile(i) {
    if (S.files.startsWith('folder')) S.filesSel = new Set([i]);
    else if (S.filesSel.has(i)) S.filesSel.delete(i); else S.filesSel.add(i);
    [...$('apFileList').children].forEach((li, k) => li.classList.toggle('is-sel', S.filesSel.has(k)));
  }
  function confirmFiles() {
    const kind = S.files;
    const sel = [...S.filesSel].sort();
    closeModal(filesDlg);
    if (!sel.length) return;
    if (kind.startsWith('folder')) {
      const f = FILES.folder[sel[0]];
      addRows([{ t: f.t, a: `${f.a} · ${kind === 'folder-spot' ? 'Spot' : 'Música'}`, d: f.d, type: 'tracklist' }]);
    } else {
      addRows(sel.map((i) => ({ ...FILES[kind][i], type: kind })));
    }
  }
  function saveEvent() {
    const name = nameEl.value.trim() || 'Mi evento';
    const [hh, mm] = (clockEl.value || '08:00').split(':').map(Number);
    S.events.push({ name, at: clock12(hh * 60 + mm), left: tryMode ? 15 : 5, fired: false });
    closeModal(modal);
    renderEvents();
    const ev = $('apEvents').lastElementChild;
    if (ev) gsap.from(ev, { x: 20, opacity: 0, duration: 0.6, ease: 'expo.out' });
    if (tryMode) say('Evento guardado: en la demo suena en 15 segundos');
  }
  function fireEvent(e) {
    e.fired = true;
    S.eventPlaying = { name: e.name, left: 6 };
    renderEvents();
    renderDeck();
    gsap.fromTo('#apFlash', { opacity: 1 }, { opacity: 0, duration: 1.4, ease: 'power2.out' });
    histAdd(e.name, '0:06', e.at);
    if (inView && audio.enabled) {
      if (/bienvenida/i.test(e.name)) audio.playClip('assets/audio/voces/cuna-bienvenida.mp3');
      else audio.chime({ explicit: false });
    }
  }
  function endEvent() {
    const e = S.events.find((x) => x.fired);
    S.events = S.events.filter((x) => !x.fired);
    S.eventPlaying = null;
    if (e && !tryMode) S.events.push({ name: 'Promoción del día', at: '12:00 p. m.', left: 0, fired: false });
    if (S.playing && S.now >= 0 && S.now < S.rows.length - 1) startRow(S.now + 1);
    renderEvents();
    renderDeck();
  }
  function hubConnect() {
    $('apHubNote').textContent = 'Conectando con Aplaudify Live...';
    setTimeout(() => { S.hubOn = true; renderHub(); $('apHubNote').textContent = 'Requiere cuenta de música Premium para reproducir audio.'; sfx('pop2', { vol: 0.25 }); }, tryMode ? 900 : 700);
  }
  function hubAdd() {
    if (S.hubMode === 'live') {
      addRows([{ t: 'Aplaudify Live', a: 'Señal live · hasta que termine la canción', d: 240, type: 'spotify' }]);
    } else {
      const h = Math.max(0, Math.min(12, +$('apHubH').value || 0));
      const m = Math.max(0, Math.min(59, +$('apHubM').value || 0));
      const secs = h * 3600 + m * 60 || 1800;
      addRows([{ t: 'Aplaudify Tiempo', a: `Bloque de ${h ? `${h} h ` : ''}${m ? `${m} min` : ''}`.trim() || 'Bloque de 30 min', d: secs, type: 'spotify' }]);
    }
    if (tryMode) say('Bloque del Hub agregado a la parrilla');
  }
  function pickChannel(i) {
    S.ch = i;
    $('apStLabel').value = CHANNELS[i].name;
    renderStream();
    sfx('tick', { vol: 0.14 });
  }
  function streamAdd() {
    if (S.ch < 0) { say('Primero elige un canal'); return; }
    const live = $('apStLive').checked;
    addRows([{ t: $('apStLabel').value.trim() || CHANNELS[S.ch].name, a: live ? 'Stream en vivo · continuo' : 'Stream en vivo · 1 h', d: 3600, type: 'stream', live }]);
    if (tryMode) say('Stream agregado a la parrilla');
  }
  function openProject(i) {
    const p = PROJECTS[i];
    if (!p) return;
    S.rows = p.rows.map(([t, a, d, type]) => mkRow(t, a, d, type, type === 'stream' ? { live: true } : {}));
    S.now = -1;
    S.playing = false;
    S.pos = 0;
    renderRows();
    renderDeck();
    say(`Proyecto abierto: ${p.name}`);
  }
  function clearAll() { S.rows = []; S.now = -1; S.playing = false; S.sel = -1; renderRows(); renderDeck(); }

  // ---------- cursor falso y encuadre ----------
  const float = document.createElement('div');
  float.className = 'product__float';
  stage.insertBefore(float, tilt);
  float.appendChild(tilt);
  const pos = (el) => {
    let x = 0;
    let y = 0;
    let n = el;
    while (n && n !== win) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };
  const q = (s) => win.querySelector(s);
  // La ventana de la app se ve siempre completa, a escala del ancho disponible:
  // grande en computador y tablet, y pequeña en celular (como el video oficial).
  function frame() {
    gsap.set(win, { scale: tilt.clientWidth / 1280, x: 0, y: 0 });
  }
  gsap.set(win, { transformOrigin: '0 0' });
  new ResizeObserver(() => frame()).observe(tilt);

  gsap.fromTo(tilt, { rotationX: 28, rotationY: -16, rotationZ: 5, scale: 0.84, yPercent: 4 }, {
    rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 18%', scrub: 1 },
  });
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const rx = gsap.quickTo(float, 'rotationX', { duration: 0.8, ease: 'power3' });
    const ry = gsap.quickTo(float, 'rotationY', { duration: 0.8, ease: 'power3' });
    stage.addEventListener('pointermove', (e) => {
      if (tryMode) return;
      const r = stage.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 7);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 5);
    });
    stage.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  function click(el) {
    cur.classList.remove('is-click');
    void cur.offsetWidth;
    cur.classList.add('is-click');
    el.classList.add('is-press', 'is-hover');
    setTimeout(() => el.classList.remove('is-press', 'is-hover'), 220);
    sfx('click', { vol: 0.2 });
  }
  const to = (sel, dx = 0, dy = 0) => ({
    x: () => { const p = pos(typeof sel === 'function' ? sel() : sel); return p.x + Math.min(p.w / 2, 60) - 5 + dx; },
    y: () => { const p = pos(typeof sel === 'function' ? sel() : sel); return p.y + p.h / 2 - 3 + dy; },
  });
  function setStep(i, instant) {
    step = i;
    stepBtns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    if (caption.textContent !== CAPTIONS[i]) {
      caption.textContent = CAPTIONS[i];
      if (!instant) gsap.fromTo(caption, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    }
    frame();
  }

  // ---------- estados listos al inicio de cada parte ----------
  const EFFECTS = [
    () => addRows([{ ...FILES.music[0], type: 'music' }, { ...FILES.music[1], type: 'music' }, { ...FILES.spot[0], type: 'spot' }]),
    () => startRow(0),
    () => S.events.push({ name: 'Cuña de bienvenida', at: '08:00 a. m.', left: 0, fired: false }),
    () => { S.events = [{ name: 'Promoción del día', at: '12:00 p. m.', left: 0, fired: false }]; histAdd('Cuña de bienvenida', '0:06', '08:00 a. m.'); startRow(1); },
    () => { S.padsLoaded = true; },
    () => { S.folderOpen = true; addRows([{ ...EXPLORER[0], type: 'music' }]); },
    () => { S.hubOn = true; addRows([{ t: 'Aplaudify Tiempo', a: 'Bloque de 2 h', d: 7200, type: 'spotify' }]); },
    () => { S.ch = 0; addRows([{ t: 'Aplaudify Oficial', a: 'Stream en vivo · continuo', d: 3600, type: 'stream', live: true }]); },
  ];
  function closeAll(instant = true) {
    closePlus();
    [modal, cfg, filesDlg].forEach((m) => closeModal(m, instant));
    document.querySelectorAll('.ap-ghost').forEach((g) => g.remove());
    grid.classList.remove('is-drop');
  }
  function applyState(n) {
    audio.stopClip();
    closeAll(true);
    resetState();
    for (let i = 0; i < Math.min(n, EFFECTS.length); i++) EFFECTS[i]();
    nameEl.value = '';
    dayEls.forEach((el) => el.classList.remove('is-on'));
    modeEls.forEach((el) => el.classList.remove('is-on'));
    renderAll();
    gsap.set(cur, { x: 640, y: 430 });
    setStep(Math.min(n, 8), true);
  }

  // ---------- guion animado ----------
  const typing = { n: 0 };
  const word = 'Cuña de bienvenida';
  const ghost = document.createElement('div');
  ghost.className = 'ap-ghost';
  ghost.innerHTML = '<svg class="ic" width="14" height="14"><use href="#i-music"/></svg>Tarde acústica.mp3';
  const tl = gsap.timeline({ paused: true, onComplete: () => enterTry(false) });
  const move = (target, d = 0.9, at) => tl.to(cur, { ...to(target), duration: d, ease: 'power3.inOut' }, at);

  tl.addLabel('s0').call(() => setStep(0));
  move(addBtn, 1, '+=0.3');
  tl.call(() => { click(addBtn); openPlus(); });
  move(() => q('[data-pm="track"]'), 0.7, '+=0.3');
  tl.call(() => { click(q('[data-pm="track"]')); showType('track'); });
  move(() => q('[data-pm="music"]'), 0.6, '+=0.3');
  tl.call(() => { click(q('[data-pm="music"]')); openFiles('music'); });
  move(() => $('apFileList').children[0], 0.8, '+=0.4');
  tl.call(() => { click($('apFileList').children[0]); toggleFile(0); });
  move(() => $('apFileList').children[1], 0.5, '+=0.2');
  tl.call(() => { click($('apFileList').children[1]); toggleFile(1); });
  move(() => $('apFilesOk'), 0.7, '+=0.3');
  tl.call(() => { click($('apFilesOk')); confirmFiles(); });
  move(addBtn, 0.8, '+=0.6');
  tl.call(() => { click(addBtn); openPlus(); showType('track'); });
  move(() => q('[data-pm="spot"]'), 0.6, '+=0.3');
  tl.call(() => { click(q('[data-pm="spot"]')); openFiles('spot'); });
  move(() => $('apFileList').children[0], 0.8, '+=0.4');
  tl.call(() => { click($('apFileList').children[0]); toggleFile(0); });
  move(() => $('apFilesOk'), 0.6, '+=0.3');
  tl.call(() => { click($('apFilesOk')); confirmFiles(); });

  tl.addLabel('s1', '+=0.9').call(() => setStep(1), null, 's1');
  move(playBtn, 0.9, 's1+=0.2');
  tl.call(() => { click(playBtn); startRow(0); });

  tl.addLabel('s2', '+=2.2').call(() => setStep(2), null, 's2');
  move(() => q('[data-ap-nav="eventos"]'), 0.9, 's2+=0.2');
  tl.call(() => { click(q('[data-ap-nav="eventos"]')); setView('eventos'); });
  move(nameEl, 0.8, '+=0.5');
  tl.call(() => { click(nameEl); nameEl.classList.add('is-focus'); typing.n = 0; nameEl.value = ''; });
  tl.to(typing, { n: word.length, duration: 1.1, ease: 'none', onUpdate: () => { nameEl.value = word.slice(0, Math.round(typing.n)); } }, '+=0.2');
  dayEls.slice(0, 5).forEach((el, k) => tl.call(() => { el.classList.add('is-on'); sfx('tick', { vol: 0.12, rate: 1.2 + k * 0.06 }); }, null, `+=${k ? 0.13 : 0.35}`));
  move(() => modeEls[0], 0.7, '+=0.2');
  tl.call(() => { click(modeEls[0]); modeEls[0].classList.add('is-on'); });
  move(() => $('apSave'), 0.7, '+=0.35');
  tl.call(() => { click($('apSave')); nameEl.classList.remove('is-focus'); saveEvent(); });

  tl.addLabel('s3', '+=0.9').call(() => setStep(3), null, 's3');
  tl.to(cur, { x: 1080, y: 150, duration: 1, ease: 'power3.inOut' }, 's3');
  [5, 4, 3, 2, 1].forEach((s, k) => tl.call(() => { if (S.events[0]) { S.events[0].left = s; renderEvents(); sfx('tick', { vol: 0.1, rate: 1.4 }); } }, null, `s3+=${k}`));
  tl.call(() => { if (S.events[0]) fireEvent(S.events[0]); }, null, 's3+=5');
  tl.call(() => endEvent(), null, 's3+=9.5');

  tl.addLabel('s4', 's3+=10.6').call(() => { setStep(4); S.padsLoaded = true; renderPads(); }, null, 's4');
  move(padEls[0], 0.9, 's4+=0.6');
  tl.call(() => { click(padEls[0]); pads('timbre', padEls[0], { explicit: false }); });
  move(padEls[3], 0.8, '+=2.3');
  tl.call(() => { click(padEls[3]); pads('brillo', padEls[3], { explicit: false }); });

  tl.addLabel('s5', '+=2').call(() => setStep(5), null, 's5');
  move(() => q('.ap-side [data-ap-nav="explorador"]'), 0.9, 's5+=0.2');
  tl.call(() => { click(q('.ap-side [data-ap-nav="explorador"]')); setView('explorador'); });
  move(() => $('apOpenFolder'), 0.8, '+=0.5');
  tl.call(() => { click($('apOpenFolder')); S.folderOpen = true; renderExplorer(); });
  move(() => $('apFolderFiles').children[0], 0.8, '+=0.5');
  tl.call(() => { win.appendChild(ghost); gsap.set(ghost, { x: gsap.getProperty(cur, 'x') + 10, y: gsap.getProperty(cur, 'y') + 10, opacity: 1 }); });
  tl.to(cur, {
    x: () => pos(grid).x + 260, y: () => pos(grid).y + 120, duration: 1.3, ease: 'power2.inOut',
    onUpdate: () => { gsap.set(ghost, { x: gsap.getProperty(cur, 'x') + 10, y: gsap.getProperty(cur, 'y') + 10 }); grid.classList.add('is-drop'); },
  }, '+=0.2');
  tl.call(() => { ghost.remove(); grid.classList.remove('is-drop'); addRows([{ ...EXPLORER[0], type: 'music' }]); });

  tl.addLabel('s6', '+=1.4').call(() => setStep(6), null, 's6');
  move(() => q('.ap-side [data-ap-nav="hub"]'), 0.9, 's6+=0.2');
  tl.call(() => { click(q('.ap-side [data-ap-nav="hub"]')); setView('hub'); });
  move(() => $('apHubConnect'), 0.8, '+=0.5');
  tl.call(() => { click($('apHubConnect')); hubConnect(); });
  move(() => q('[data-hub-mode="tiempo"]'), 0.9, '+=1.1');
  tl.call(() => { click(q('[data-hub-mode="tiempo"]')); S.hubMode = 'tiempo'; renderHub(); });
  move(() => $('apHubAdd'), 0.8, '+=0.5');
  tl.call(() => { click($('apHubAdd')); hubAdd(); });

  tl.addLabel('s7', '+=1.4').call(() => setStep(7), null, 's7');
  move(() => q('.ap-side [data-ap-nav="stream"]'), 0.9, 's7+=0.2');
  tl.call(() => { click(q('.ap-side [data-ap-nav="stream"]')); setView('stream'); });
  move(() => chEls[0], 0.8, '+=0.5');
  tl.call(() => { click(chEls[0]); pickChannel(0); });
  move(() => $('apStAdd'), 0.8, '+=0.6');
  tl.call(() => { click($('apStAdd')); streamAdd(); });
  move(() => q('.ap-side [data-ap-nav="inicio"]'), 0.9, '+=1.2');
  tl.call(() => { click(q('.ap-side [data-ap-nav="inicio"]')); setView('inicio'); });
  tl.to({}, { duration: 1.6 });
  tl.addLabel('s8');

  const labels = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    const L = labels.map((l) => tl.labels[l]);
    let i = 0;
    while (i < 7 && t >= L[i + 1]) i++;
    const p = Math.min(1, Math.max(0, (t - L[i]) / (L[i + 1] - L[i])));
    stepBtns.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : k === i ? p : 0));
  });

  // keep: la persona tomó el control a mitad de la demo; todo queda como está
  // para que su clic caiga justo donde apuntó.
  function enterTry(fromUser, keep = false) {
    tl.pause();
    if (keep) {
      ghost.remove();
      grid.classList.remove('is-drop');
      nameEl.classList.remove('is-focus');
    } else {
      closeAll(true);
    }
    tryMode = true;
    if (!S.padsLoaded) { S.padsLoaded = true; renderPads(); }
    win.classList.add('is-try');
    section.classList.add('is-try');
    stepBtns.forEach((b) => b.style.setProperty('--p', 1));
    setStep(8, !fromUser);
    if (!keep && S.view !== 'inicio') setView('inicio', true);
    say(keep ? 'Listo: la ventana ya es tuya' : 'Ahora te toca: la ventana es tuya');
  }
  function exitTry() {
    tryMode = false;
    win.classList.remove('is-try');
    section.classList.remove('is-try');
  }

  stepBtns.forEach((b, i) => b.addEventListener('click', () => {
    if (i === 8) { if (!tryMode) enterTry(true); return; }
    exitTry();
    applyState(i);
    tl.play(labels[i]);
    if (!inView) tl.pause();
  }));

  // ---------- la persona usa la app ----------
  // Un clic mientras la demo corre sola la detiene y se aplica de verdad. Con
  // mouse basta con presionar (así también se puede arrastrar del Explorador);
  // en pantallas táctiles se espera al toque completo para no cortar el scroll.
  const takeOver = () => { if (!tryMode) enterTry(true, true); };
  win.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') takeOver(); }, true);
  win.addEventListener('click', takeOver, true);
  win.addEventListener('click', (e) => {
    const t = e.target;
    const pad = t.closest('.ap-pad');
    if (pad) {
      if (S.bank === 0 && S.padsLoaded) pads(pad.dataset.pad, pad);
      else if (tryMode) say('En la app eliges un audio de tu computador para este botón');
      return;
    }
    if (!tryMode) return;
    const nav = t.closest('[data-ap-nav]');
    if (nav) { setView(nav.dataset.apNav); return; }
    const pm = t.closest('[data-pm]');
    if (pm) {
      const k = pm.dataset.pm;
      if (k === 'track' || k === 'folder') showType(k);
      else if (k === 'back') plus.classList.remove('is-type');
      else if (k === 'music' || k === 'spot') openFiles(S.plusFor === 'folder' ? `folder-${k}` : k);
      else if (k === 'url') { closePlus(); setView('stream'); say('Elige un canal o escribe el nombre del stream'); }
      else if (k === 'pause') { closePlus(); addRows([{ t: 'Pausa', a: 'Silencio programado', d: 10, type: 'pause' }]); }
      return;
    }
    const del = t.closest('[data-del]');
    if (del) { removeRow(+del.dataset.del); return; }
    const row = t.closest('.ap-row');
    if (row) { S.sel = +row.dataset.i; renderRows(); return; }
    const fileLi = t.closest('#apFileList li');
    if (fileLi) { toggleFile(+fileLi.dataset.f); return; }
    const fileAdd = t.closest('[data-file-add]');
    if (fileAdd) { addRows([{ ...EXPLORER[+fileAdd.dataset.fileAdd], type: 'music' }]); return; }
    const proj = t.closest('[data-proj]');
    if (proj) { proj.classList.add('is-hover'); setTimeout(() => proj.classList.remove('is-hover'), 200); say('Doble clic para abrir el proyecto'); return; }
    const ch = t.closest('[data-ch]');
    if (ch) { pickChannel(+ch.dataset.ch); return; }
    const hm = t.closest('[data-hub-mode]');
    if (hm) { S.hubMode = hm.dataset.hubMode; renderHub(); return; }
    const day = t.closest('#apDays button');
    if (day) { day.classList.toggle('is-on'); return; }
    const mode = t.closest('#apModes .ap-mode');
    if (mode) { modeEls.forEach((m) => m.classList.toggle('is-on', m === mode)); return; }
    const act = t.closest('[data-ap-act]');
    if (!act) { if (!t.closest('.ap-plus')) closePlus(); return; }
    const a = act.dataset.apAct;
    if (a !== 'plus') closePlus();
    switch (a) {
      case 'plus': if (plus.classList.contains('is-open')) closePlus(); else openPlus(); break;
      case 'play': togglePlay(); break;
      case 'stop': S.playing = false; S.pos = 0; renderRows(); renderDeck(); break;
      case 'next': if (S.rows.length) startRow((S.now + 1) % S.rows.length); break;
      case 'prev': if (S.rows.length) startRow(Math.max(0, S.now - 1)); break;
      case 'shuffle': case 'repeat': act.classList.toggle('ap-round--on'); break;
      case 'clear': clearAll(); break;
      case 'bank-prev': S.bank = (S.bank + BANKS.length - 1) % BANKS.length; renderPads(); break;
      case 'bank-next': S.bank = (S.bank + 1) % BANKS.length; renderPads(); break;
      case 'files-cancel': closeModal(filesDlg); break;
      case 'files-ok': confirmFiles(); break;
      case 'ev-cancel': closeModal(modal); break;
      case 'ev-save': saveEvent(); break;
      case 'cfg-close': closeModal(cfg); break;
      case 'open-folder': S.folderOpen = true; renderExplorer(); break;
      case 'hub-connect': hubConnect(); break;
      case 'hub-add': hubAdd(); break;
      case 'stream-add': streamAdd(); break;
      case 'guardar': if (!S.projects.includes('Mi proyecto')) S.projects.push('Mi proyecto'); renderExplorer(); say('Proyecto guardado'); break;
      default: break;
    }
  });
  win.addEventListener('dblclick', (e) => {
    if (!tryMode) return;
    const row = e.target.closest('.ap-row');
    if (row && !e.target.closest('[data-del]')) { startRow(+row.dataset.i); return; }
    const proj = e.target.closest('[data-proj]');
    if (proj) openProject(+proj.dataset.proj);
  });
  win.addEventListener('keydown', (e) => {
    if (!tryMode || e.target.closest('input')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel >= 0) { e.preventDefault(); removeRow(S.sel); }
  });
  win.addEventListener('pointerdown', () => { if (tryMode && document.activeElement?.tagName !== 'INPUT') win.focus({ preventScroll: true }); });
  win.addEventListener('input', (e) => {
    const sl = e.target.closest('[data-slider]');
    if (!sl) return;
    sl.previousElementSibling.textContent = `${sl.value}%`;
    if (sl.dataset.slider === '0') { S.vol = +sl.value; renderDeck(); }
  });
  win.addEventListener('change', (e) => {
    if (e.target.id === 'apStLive' && tryMode) say(e.target.checked ? 'Sonará sin parar' : 'Sonará una hora');
  });

  // Arrastrar archivos del Explorador a la parrilla.
  let drag = null;
  win.addEventListener('pointerdown', (e) => {
    if (!tryMode || e.button !== 0) return;
    const li = e.target.closest('#apFolderFiles li');
    if (!li || e.target.closest('button')) return;
    e.preventDefault();
    const f = EXPLORER[+li.dataset.file];
    const g = document.createElement('div');
    g.className = 'ap-ghost';
    g.innerHTML = `<svg class="ic" width="14" height="14"><use href="#i-music"/></svg>${f.t}.mp3`;
    document.body.appendChild(g);
    drag = { f, g };
    gsap.set(g, { left: e.clientX, top: e.clientY });
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    gsap.set(drag.g, { left: e.clientX, top: e.clientY });
    const r = grid.getBoundingClientRect();
    grid.classList.toggle('is-drop', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    if (grid.classList.contains('is-drop')) addRows([{ ...drag.f, type: 'music' }]);
    drag.g.remove();
    drag = null;
    grid.classList.remove('is-drop');
  });

  // ---------- reloj de la app ----------
  let acc = 0;
  let uptime = 0;
  gsap.ticker.add((time, delta) => {
    if (!inView) return;
    const dt = Math.min(delta, 100) / 1000;
    uptime += dt;
    acc += dt;
    if (S.eventPlaying) {
      S.eventPlaying.left -= dt;
      if (tryMode && S.eventPlaying.left <= 0) endEvent();
    } else if (S.playing && S.rows[S.now]) {
      const r = S.rows[S.now];
      S.pos += dt;
      if (S.pos >= r.d && !(r.type === 'stream' && r.live)) {
        if (tryMode) startRow((S.now + 1) % S.rows.length); else S.pos = 0;
      }
      const k = (S.pos % r.d) / r.d;
      $('apProg').style.width = `${(k * 100).toFixed(2)}%`;
      const past = Math.floor(k * waveBars.length);
      waveBars.forEach((b, j) => b.classList.toggle('is-past', j < past));
    }
    if (tryMode) {
      S.events.forEach((ev) => {
        if (ev.fired || ev.left <= 0) return;
        ev.left -= dt;
        if (ev.left <= 0) fireEvent(ev);
      });
    }
    if (acc > 0.1) {
      acc = 0;
      $('apUptime').textContent = uptime < 60 ? `${Math.floor(uptime)}s` : `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;
      if (S.playing && S.rows[S.now] && !S.eventPlaying) {
        $('apTime').textContent = fmt(S.pos);
        const r = S.rows[S.now];
        $('apNowSub').textContent = r.type === 'stream' && r.live ? `${fmt(S.pos)} · en vivo` : `${fmt(S.pos)} / ${fmt(Math.max(0, r.d - S.pos))} restante`;
      }
      if (tryMode && S.events.some((ev) => !ev.fired && ev.left > 0)) renderEvents();
      const lvl = audio.enabled ? audio.level : 0;
      meterBars.forEach((b, j) => {
        const v = S.playing ? 0.35 + Math.random() * 0.45 + lvl * 0.8 - j * 0.012 : 0.04;
        b.style.height = `${Math.min(100, Math.max(4, v * 100))}%`;
      });
      const cpu = S.playing ? 14 + Math.round(Math.random() * 8) : 6;
      $('apCpuTxt').textContent = `${cpu}%`;
      $('apBarCpu').style.width = `${cpu}%`;
    }
  });

  applyState(0);
  ScrollTrigger.create({
    trigger: stage,
    start: 'top 70%',
    end: 'bottom 20%',
    onToggle: (self) => {
      inView = self.isActive;
      if (tryMode) return;
      if (inView) tl.play(); else tl.pause();
    },
  });
}
