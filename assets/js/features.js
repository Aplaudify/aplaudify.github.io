// Funciones: lista a la izquierda y un escenario de color a la derecha que
// muestra cada función funcionando. En celular cada visual va bajo su texto.
const LOG = [
  ['Mañana tranquila', 'Música', '2:47'],
  ['Cuña de bienvenida', 'Cuña', '0:06'],
  ['Pop alegre', 'Hub', '3:12'],
  ['Promoción del día', 'Cuña', '0:05'],
  ['Jingle de la casa', 'Jingle', '0:34'],
  ['Clásicos del pop', 'Stream', '4:05'],
  ['Oferta relámpago', 'Botonera', '0:08'],
  ['Tarde acústica', 'Música', '3:21'],
];

import { toast } from './ui.js';

export function initFeatures({ audio, pads }) {
  const { gsap, ScrollTrigger } = window;
  const $ = (id) => document.getElementById(id);
  const stage = $('featureStage');
  const items = [...$('featureList').querySelectorAll('.feature')];
  const fx = Object.fromEntries([...stage.querySelectorAll('.fx')].map((el) => [el.dataset.fx, el]));
  const mobile = window.matchMedia('(max-width: 860px)');
  const visible = new Set();
  let active = null;

  const place = () => {
    items.forEach((li) => {
      const el = fx[li.dataset.feature];
      if (mobile.matches) li.appendChild(el); else stage.appendChild(el);
    });
    if (!mobile.matches) activate(active || 'parrilla', true);
  };

  // Barrido de color entre funciones (sin mezclar tonos en el camino).
  const wipe = document.createElement('div');
  wipe.className = 'features__wipe';
  stage.prepend(wipe);
  function paint(color, instant) {
    gsap.killTweensOf(wipe);
    if (instant) {
      stage.style.setProperty('--fx-c', color);
      gsap.set(wipe, { clipPath: 'inset(100% 0 0 0)' });
      return;
    }
    wipe.style.background = color;
    gsap.fromTo(wipe, { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', duration: 0.65, ease: 'expo.inOut',
      onComplete: () => { stage.style.setProperty('--fx-c', color); gsap.set(wipe, { clipPath: 'inset(100% 0 0 0)' }); },
    });
  }

  function activate(name, silent) {
    if (name === active && !silent) return;
    active = name;
    const li = items.find((i) => i.dataset.feature === name);
    paint(getComputedStyle(li).getPropertyValue('--c').trim(), silent);
    stage.classList.toggle('is-dark', li.dataset.ink === 'dark');
    stage.classList.remove('is-offline');
    items.forEach((i) => i.classList.toggle('is-active', i === li));
    Object.entries(fx).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
    if (!silent) audio.sfx('swish', { vol: 0.2, rate: 1.1 });
  }

  items.forEach((li) => {
    ScrollTrigger.create({
      trigger: li,
      start: 'top 58%',
      end: 'bottom 58%',
      onToggle: (self) => { if (self.isActive && !mobile.matches) activate(li.dataset.feature); },
    });
    li.addEventListener('click', () => { if (!mobile.matches) activate(li.dataset.feature); });
  });
  place();
  mobile.addEventListener('change', () => { place(); ScrollTrigger.refresh(); });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) visible.add(en.target.dataset.fx); else visible.delete(en.target.dataset.fx); });
  });
  Object.values(fx).forEach((el) => io.observe(el));
  const running = (name) => visible.has(name) && (mobile.matches || active === name);

  // Parrilla: el cabezal recorre el día.
  const setTrack = () => {
    const row = fx.parrilla.querySelector('.fx-day__row');
    fx.parrilla.style.setProperty('--track', `${row.clientWidth - 3}px`);
  };
  new ResizeObserver(setTrack).observe(fx.parrilla);

  // Aplaudify Live: tu música entra a la parrilla por tiempo o con Señal Live
  // (una sola canción); cuando termina, la parrilla sigue con lo siguiente.
  const LIVE = {
    tiempo: {
      song: 'Tu playlist favorita', title: 'Tu música · 1 hora', next: '11:01 a. m.', dur: 6.5,
      text: 'Tu música suena el tiempo que tú elijas, por ejemplo <b>1 hora</b>. Cuando se cumple, la parrilla sigue sola con lo que viene.',
    },
    cancion: {
      song: 'La canción que pusiste', title: 'Tu canción actual', next: '10:05 a. m.', dur: 4.5,
      text: 'Suena <b>solo la canción</b> que tienes puesta en tu celular y, cuando termina, la parrilla sigue con lo siguiente.',
    },
  };
  const liveEl = $('fxLive');
  const liveBtns = [...liveEl.querySelectorAll('[data-live-mode]')];
  const liveRow = $('fxLiveRow');
  const liveNext = $('fxLiveNext');
  const liveSwap = ['fxLiveSong', 'fxLiveTitle', 'fxLiveNextAt', 'fxLiveText'].map($);
  const eq = $('fxEq');
  const eqBars = Array.from({ length: 6 }, () => { const b = document.createElement('i'); eq.appendChild(b); return b; });
  let liveMode = 'tiempo';
  let liveT = 0;
  let liveHold = 0;
  const setLive = (mode) => {
    const m = LIVE[mode];
    liveMode = mode;
    liveT = 0;
    liveEl.dataset.mode = mode;
    liveBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.liveMode === mode)));
    [m.song, m.title, m.next].forEach((t, i) => { liveSwap[i].textContent = t; });
    liveSwap[3].innerHTML = m.text;
    liveRow.classList.remove('is-done');
    liveNext.classList.remove('is-on');
    gsap.fromTo(liveSwap, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.04 });
  };
  liveBtns.forEach((b) => b.addEventListener('click', () => {
    liveHold = 16;
    if (b.dataset.liveMode === liveMode) return;
    setLive(b.dataset.liveMode);
    audio.sfx('tick', { vol: 0.2 });
  }));

  // Música Off: la canción se corta con eco y entra la música de respaldo.
  const offBtn = $('fxOffBtn');
  const offState = $('fxOffState');
  const offUse = $('fxOffUse');
  const offCanvas = $('fxOffWave');
  const offCtx = offCanvas.getContext('2d');
  const offNow = $('fxOffNow');
  const offTag = $('fxOffTag');
  const offSong = $('fxOffSong');
  const offArtist = $('fxOffArtist');
  const offNote = $('fxOffNote');
  let offMode = 'online';
  const showSong = (info, tag) => {
    offTag.textContent = tag;
    offSong.textContent = info.title;
    offArtist.textContent = info.mode === 'off' ? 'Música de respaldo · sin internet' : `Tu parrilla · ${info.artist}`;
    gsap.fromTo(offNow, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
  };
  audio.onTrack((info) => { if (offMode === 'online' && info.mode === 'lista') showSong(info, 'Sonando'); });
  offBtn.addEventListener('click', async () => {
    if (offMode === 'online') {
      if (!audio.enabled) { audio.setEnabled(true); toast('Sonido activado para que escuches la diferencia'); }
      offMode = 'down';
      offUse.setAttribute('href', '#i-wifi-off');
      offState.textContent = 'Se cayó el internet';
      offTag.textContent = 'Interrumpida';
      offNow.classList.add('is-cut');
      offNote.textContent = 'La canción se cortó…';
      offBtn.disabled = true;
      (mobile.matches ? fx.off : stage).classList.add('is-offline');
      audio.sfx('glitch', { vol: 0.5, explicit: true });
      const backup = await audio.interrupt();
      if (offMode !== 'down') return;
      offMode = 'backup';
      offNow.classList.remove('is-cut');
      (mobile.matches ? fx.off : stage).classList.remove('is-offline');
      showSong({ title: backup?.title || 'Funk Groove Soul', artist: backup?.artist || 'Catálogo de respaldo', mode: 'off' }, 'Off · Respaldo');
      offState.textContent = 'Sin internet · Música Off';
      offNote.textContent = 'Aplaudify cambió sola a otra canción del catálogo de respaldo. Tus clientes no escuchan silencio.';
      offBtn.textContent = 'Volver a conectar';
      offBtn.disabled = false;
    } else if (offMode === 'backup') {
      offMode = 'online';
      offUse.setAttribute('href', '#i-wifi');
      offState.textContent = 'Internet de vuelta';
      offNote.textContent = 'Con el internet de vuelta, Aplaudify regresa sola a tu programación.';
      offBtn.textContent = 'Simular caída de internet';
      audio.reconnect();
      audio.sfx('pop', { vol: 0.4 });
    }
  });

  // Botonera
  const padBtns = [...$('fxPads').querySelectorAll('[data-pad]')];
  padBtns.forEach((b) => b.addEventListener('click', () => pads(b.dataset.pad, b)));

  // Eventos: un día completo en pocos segundos.
  const clockEl = $('fxClock');
  const clockItems = [...$('fxClockList').children];
  let vmin = 470;
  let lastMin = -1;
  const showClock = (m) => {
    const h24 = Math.floor(m / 60) % 24;
    const mm = String(Math.floor(m % 60)).padStart(2, '0');
    const h12 = ((h24 + 11) % 12) + 1;
    clockEl.innerHTML = `${String(h12).padStart(2, '0')}:${mm}<small>${h24 < 12 ? 'a. m.' : 'p. m.'}</small>`;
  };

  // Historial
  const logEl = $('fxLog');
  let logI = 0;
  let logClock = 7 * 60 + 2;
  let logAcc = 1.2;
  const addLog = () => {
    const [t, type, dur] = LOG[logI++ % LOG.length];
    logClock += 3 + Math.floor(Math.random() * 40);
    const h24 = Math.floor(logClock / 60) % 24;
    const h12 = ((h24 + 11) % 12) + 1;
    const row = document.createElement('div');
    row.className = 'fx-log__row';
    row.innerHTML = `<span>${h12}:${String(logClock % 60).padStart(2, '0')} ${h24 < 12 ? 'a. m.' : 'p. m.'}</span><b>${t}</b><em>${type}</em><i>${dur}</i>`;
    logEl.prepend(row);
    gsap.from(row, { y: -24, opacity: 0, duration: 0.6, ease: 'expo.out' });
    while (logEl.children.length > 6) logEl.lastElementChild.remove();
  };
  for (let i = 0; i < 4; i++) addLog();

  // Sismo
  const quakeBtn = $('fxQuakeBtn');
  const quakeState = $('fxQuakeState');
  const quakeCanvas = $('fxQuakeWave');
  const qctx = quakeCanvas.getContext('2d');
  let quake = 0;
  let quakeBusy = false;
  const quakeLine = new Float32Array(160);
  quakeBtn.addEventListener('click', () => {
    if (quakeBusy) return;
    quakeBusy = true;
    quake = 1;
    const box = mobile.matches ? fx.sismo : stage;
    box.classList.remove('is-alarm');
    void box.offsetWidth;
    box.classList.add('is-alarm');
    quakeState.textContent = 'Sismo detectado: reproducción detenida';
    audio.sfx('alarm', { explicit: true, vol: 0.3 });
    audio.duck('sismo', true, 0.05);
    setTimeout(() => { quakeState.textContent = 'Alarma activada en tu local'; }, 2600);
    setTimeout(() => {
      quakeState.textContent = 'Monitoreando tu zona';
      box.classList.remove('is-alarm');
      audio.duck('sismo', false);
      quakeBusy = false;
    }, 5600);
  });

  // Stream
  const stations = [...$('fxStations').children];
  let stI = 0;
  let stAcc = 0;

  const drawWave = (ctx, cvs, t, color, amp, noise) => {
    const w = cvs.width;
    const h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const k = x / w;
      const env = Math.sin(k * Math.PI);
      const y = h / 2 + env * amp * h * 0.42 * (Math.sin(k * 24 + t * 6) * 0.6 + Math.sin(k * 61 - t * 9) * 0.3 + (Math.random() - 0.5) * noise);
      if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };

  gsap.ticker.add((time, delta) => {
    const dt = Math.min(delta, 100) / 1000;
    const lvl = audio.enabled ? audio.level : 0;
    if (running('live')) {
      const m = LIVE[liveMode];
      liveT += dt;
      liveHold = Math.max(0, liveHold - dt);
      liveRow.style.setProperty('--p', Math.min(1, liveT / m.dur).toFixed(4));
      if (liveT >= m.dur && !liveRow.classList.contains('is-done')) {
        liveRow.classList.add('is-done');
        liveNext.classList.add('is-on');
        if (audio.enabled) audio.sfx('pop2', { vol: 0.22 });
      }
      if (liveT > m.dur + 2.4) setLive(liveHold > 0 ? liveMode : liveMode === 'tiempo' ? 'cancion' : 'tiempo');
      const f = audio.freq;
      const playing = liveT < m.dur;
      eqBars.forEach((b, i) => {
        let v;
        if (!playing) v = 0.12;
        else if (audio.enabled && f && audio.level > 0.02) v = f[3 + i * 6] / 255;
        else v = 0.3 + 0.6 * Math.abs(Math.sin(time * (2 + (i % 4) * 0.5) + i * 0.9));
        b.style.height = `${Math.max(12, v * 100)}%`;
      });
    }
    if (running('off')) {
      const amp = offMode === 'down' ? 0.05 : 0.55 + lvl;
      drawWave(offCtx, offCanvas, time, offMode === 'down' ? '#ff8a9a' : '#ffffff', amp, offMode === 'down' ? 1.4 : 0.15);
    }
    if (running('eventos')) {
      vmin += dt * 26;
      if (vmin > 1215) { vmin = 470; clockItems.forEach((li) => li.classList.remove('is-now', 'is-done')); }
      const m = Math.floor(vmin);
      if (m !== lastMin) {
        lastMin = m;
        showClock(m);
        clockItems.forEach((li) => {
          const at = +li.dataset.at;
          const now = m >= at && m < at + 40;
          if (now && !li.classList.contains('is-now')) {
            gsap.fromTo(clockEl, { scale: 1.04 }, { scale: 1, duration: 0.6, ease: 'expo.out' });
            if (audio.enabled) audio.sfx('pop2', { vol: 0.3 });
          }
          li.classList.toggle('is-now', now);
          li.classList.toggle('is-done', m >= at + 40);
        });
      }
    }
    if (running('historial')) {
      logAcc -= dt;
      if (logAcc <= 0) { logAcc = 1.7; addLog(); }
    }
    if (running('sismo')) {
      quake = Math.max(0, quake - dt * 0.2);
      quakeLine.copyWithin(0, 1);
      const amp = 0.04 + quake * quake * 0.9;
      quakeLine[quakeLine.length - 1] = (Math.random() - 0.5) * 2 * amp;
      const w = quakeCanvas.width;
      const h = quakeCanvas.height;
      qctx.clearRect(0, 0, w, h);
      qctx.strokeStyle = '#ffffff';
      qctx.lineWidth = 3;
      qctx.lineJoin = 'round';
      qctx.beginPath();
      for (let i = 0; i < quakeLine.length; i++) {
        const x = (i / (quakeLine.length - 1)) * w;
        const y = h / 2 + quakeLine[i] * h * 0.45;
        if (i) qctx.lineTo(x, y); else qctx.moveTo(x, y);
      }
      qctx.stroke();
    }
    if (running('stream')) {
      stAcc += dt;
      if (stAcc > 2.6) {
        stAcc = 0;
        stations[stI].classList.remove('is-on');
        stI = (stI + 1) % stations.length;
        stations[stI].classList.add('is-on');
      }
    }
  });

  return {
    padsVisible: () => visible.has('botonera') && (mobile.matches || active === 'botonera'),
    padButtons: padBtns,
  };
}
