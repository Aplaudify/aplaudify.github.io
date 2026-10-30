import { audio, AMBIENT } from './audio.js';
import { STORES } from './data.js';
import { initUI, initReveals, prepareHero, heroReveal, toast } from './ui.js';
import { runIntro } from './intro.js';
import { createPads } from './pads.js';
import { initDemo } from './demo.js';
import { initFeatures } from './features.js';
import { initSections } from './sections.js';
import { initConsent } from './consent.js';

const { gsap, ScrollTrigger, SplitText } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (id) => document.getElementById(id);
const mq = (q) => window.matchMedia(q).matches;
const reduced = mq('(prefers-reduced-motion: reduce)');
const mobile = mq('(max-width: 860px)') || mq('(pointer: coarse)');

$('year').textContent = String(new Date().getFullYear());
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('load', () => { if (!entered) window.scrollTo(0, 0); });

let world = null;
const partsP = fetch('assets/img/logo/logo-parts.json').then((r) => r.json()).then((j) => j.parts);
const fontsP = document.fonts ? document.fonts.ready : Promise.resolve();

function webgl() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

initUI({ audio, reduced });
initConsent();
prepareHero();
const pads = createPads(audio);
const features = initFeatures({ audio, pads });
initDemo({ audio, pads });
const sections = initSections({ audio });
initStreet();
initHero();
initPadKeys();

let entered = false;
let markBuilt;
const builtP = new Promise((res) => { markBuilt = res; });

const ready = (async () => {
  const parts = await partsP;
  sections.footerLogo(parts);
  await fontsP;
  // El 3D se arma cuando el logo de la intro ya terminó, para que no se congele.
  const sceneModule = webgl() ? import('./scene.js') : null;
  await Promise.race([builtP, new Promise((res) => setTimeout(res, 3500))]);
  if (sceneModule) {
    try {
      const { World } = await sceneModule;
      const w = new World($('stage'), { audio, mobile, reduced });
      await w.init(parts);
      world = w;
      if (entered) world.intro();
    } catch (err) {
      console.warn('Escena 3D no disponible:', err);
      world = null;
    }
  }
  if (!world) fallbackWorld();
  initReveals();
  ScrollTrigger.refresh();
})();

runIntro({
  partsP,
  ready,
  audio,
  reduced,
  onBuilt: () => markBuilt(),
  onEnter: () => {
    entered = true;
    world?.intro();
    heroReveal();
  },
  onDone: () => ScrollTrigger.refresh(),
});

ScrollTrigger.addEventListener('refresh', () => world?.layout());
window.addEventListener('load', () => ScrollTrigger.refresh());
gsap.ticker.add(() => { if (!world) audio.sample(); });

// ---------- héroe: darle clic al logo (salen ofertas, ropa, mancuernas...) ----------
function initHero() {
  const stage = $('heroStage');
  const tip = $('heroTip');
  if (mobile) tip.textContent = 'Toca el logo y hazlo sonar';
  let plays = 0;
  stage.addEventListener('pointerdown', (e) => {
    const ndc = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight) * 2 + 1 };
    world?.burst(ndc);
    audio.burst();
    if (++plays === 1) gsap.to(tip, { opacity: 0, duration: 0.5 });
  });
}

// ---------- la calle: cada local con su música ----------
function initStreet() {
  const street = $('locales');
  const power = $('powerBtn');
  const label = $('powerLabel');
  const picker = $('storePicker');
  const radios = [...picker.querySelectorAll('[data-store]')];
  const place = $('nowPlace');
  const list = $('nowList');
  let powered = false;
  let current = 2;
  let inside = false;

  const playCurrent = () => {
    if (!audio.enabled) return;
    const s = STORES[current];
    if (s.audio && inside && powered) audio.playMusic(`local-${current}`, s.audio, { fade: 1.1 });
    else audio.playMusic('ambiente', AMBIENT, { fade: 1.4 });
  };

  function setPower(on, byUser) {
    if (on === powered) return;
    powered = on;
    power.setAttribute('aria-pressed', String(on));
    label.textContent = on ? 'Aplaudify encendido' : 'Encender Aplaudify';
    street.classList.toggle('is-on', on);
    world?.setPower(on);
    if (on && byUser && !audio.enabled) {
      audio.setEnabled(true);
      toast('Sonido activado para que escuches cada local');
    }
    if (on) {
      audio.sfx('shimmer', { vol: 0.55 });
      audio.flourish();
    } else {
      audio.sfx('powerdown', { vol: 0.5 });
    }
    playCurrent();
  }

  function select(i, byUser) {
    current = i;
    radios.forEach((r) => r.setAttribute('aria-checked', String(+r.dataset.store === i)));
    const s = STORES[i];
    gsap.to([place, list], { opacity: 0, y: -6, duration: 0.18, onComplete: () => {
      place.textContent = s.name;
      list.textContent = s.list;
      gsap.to([place, list], { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' });
    } });
    world?.select(i);
    audio.sfx('pop', { vol: 0.35 });
    if (byUser && !powered) setPower(true, true);
    else playCurrent();
  }

  power.addEventListener('click', () => setPower(!powered, true));
  radios.forEach((r) => r.addEventListener('click', () => select(+r.dataset.store, true)));
  picker.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (current + (e.key === 'ArrowRight' ? 1 : -1) + STORES.length) % STORES.length;
    select(n, true);
    radios[n].focus();
  });

  const ndc = (e) => ({ x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight) * 2 + 1 });
  street.addEventListener('click', (e) => {
    if (e.target.closest('button, a')) return;
    const i = world ? world.pickStore(ndc(e)) : -1;
    if (i >= 0) select(i, true);
  });
  street.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !world) return;
    if (e.target.closest('button, a')) return;
    const i = world.pickStore(ndc(e));
    if (i >= 0) street.dataset.cursor = 'Escuchar';
    else delete street.dataset.cursor;
  });

  ScrollTrigger.create({
    trigger: street,
    start: 'top 60%',
    end: 'bottom 40%',
    onToggle: (self) => {
      inside = self.isActive;
      if (powered) playCurrent();
    },
    onUpdate: (self) => {
      if (!powered && self.progress > 0.5) setPower(true, false);
    },
  });
}

// ---------- teclas 1 a 6 para la botonera visible ----------
function initPadKeys() {
  const demoPads = [...$('apPads').querySelectorAll('[data-pad]')];
  let demoVisible = false;
  new IntersectionObserver(([e]) => { demoVisible = e.isIntersecting; }, { threshold: 0.3 }).observe($('appwin'));
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select')) return;
    const n = '123456'.indexOf(e.key);
    if (n < 0) return;
    let btn = null;
    if (features.padsVisible()) btn = features.padButtons[n];
    else if (demoVisible) btn = demoPads[n];
    if (!btn) return;
    pads(btn.dataset.pad, btn);
  });
}

// ---------- sin 3D: el color de fondo igual cambia por sección ----------
function fallbackWorld() {
  document.documentElement.classList.add('no-3d');
  const stage = $('stage');
  document.querySelectorAll('[data-world]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => { if (self.isActive) gsap.to(stage, { backgroundColor: sec.dataset.world, duration: 0.8 }); },
    });
  });
}
