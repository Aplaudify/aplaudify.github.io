// Interfaz general: cursor, botones magnéticos, menú, navegación,
// avisos, sonidos al pasar y revelado de títulos.
const $ = (id) => document.getElementById(id);
const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let toastTimer;
export function toast(msg, ms = 2600) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}

export function initUI({ audio, reduced }) {
  const { gsap } = window;
  initCursor(gsap);
  initMagnetic(gsap);
  initNav();
  const menu = initMenu(gsap, audio);
  initAnchors(menu, reduced);
  initSound(audio);
  initHoverSounds(audio);
  document.querySelectorAll('[data-soon]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    toast('Disponible muy pronto');
  }));
}

function initCursor(gsap) {
  if (!fine()) return;
  const el = $('cursor');
  const dot = el.querySelector('.cursor__dot');
  const ring = el.querySelector('.cursor__ring');
  const label = $('cursorLabel');
  document.documentElement.classList.add('has-cursor');
  let x = -100;
  let y = -100;
  let rx = x;
  let ry = y;
  let down = false;
  let sc = 1;
  el.style.opacity = '0';
  const update = (t) => {
    if (!t || !t.closest) return;
    const lab = t.closest('[data-cursor]');
    const hov = t.closest('a, button, summary, label, [data-tilt]');
    if (lab && lab.dataset.cursor) {
      if (label.textContent !== lab.dataset.cursor) label.textContent = lab.dataset.cursor;
      el.classList.add('is-label');
      el.classList.remove('is-hover');
    } else {
      el.classList.remove('is-label');
      el.classList.toggle('is-hover', !!hov);
    }
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (el.style.opacity === '0') { rx = e.clientX; ry = e.clientY; el.style.opacity = '1'; }
    x = e.clientX;
    y = e.clientY;
    update(e.target);
  }, { passive: true });
  let pending = false;
  window.addEventListener('scroll', () => {
    if (pending || x < 0) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(document.elementFromPoint(x, y)); });
  }, { passive: true });
  window.addEventListener('pointerdown', () => { down = true; });
  window.addEventListener('pointerup', () => { down = false; });
  document.addEventListener('pointerleave', () => { el.style.opacity = '0'; });
  gsap.ticker.add(() => {
    rx += (x - rx) * 0.2;
    ry += (y - ry) * 0.2;
    sc += ((down ? 0.82 : 1) - sc) * 0.25;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${sc})`;
  });
}

function initMagnetic(gsap) {
  if (!fine()) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.38);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

function initNav() {
  const nav = $('nav');
  let last = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (document.body.classList.contains('menu-open')) return;
    if (y > last + 6 && y > 360) nav.classList.add('is-hidden');
    else if (y < last - 6 || y < 360) nav.classList.remove('is-hidden');
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const links = [...document.querySelectorAll('.nav__links a')];
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const a = map.get(en.target.id);
      if (a) a.classList.toggle('is-current', en.isIntersecting);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

function initMenu(gsap, audio) {
  const burger = $('burger');
  const menu = $('menu');
  let open = false;
  const set = (on) => {
    if (on === open) return;
    open = on;
    burger.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('menu-open', on);
    audio.sfx(on ? 'swish' : 'tick', { vol: 0.35 });
    if (on) {
      menu.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.out' });
      gsap.fromTo(menu.querySelectorAll('nav a, .btn'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.04, ease: 'expo.out', delay: 0.08 });
    } else {
      document.documentElement.style.overflow = '';
      gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.45, ease: 'expo.in', onComplete: () => { if (!open) menu.hidden = true; } });
    }
  };
  burger.addEventListener('click', () => set(!open));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  return { close: () => set(false) };
}

function initAnchors(menu, reduced) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    menu.close();
    const top = id === 'inicio' ? 0 : target.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });
}

function initSound(audio) {
  const btn = $('soundToggle');
  const sync = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Desactivar sonido' : 'Activar sonido');
  };
  btn.addEventListener('click', () => {
    const on = audio.toggle();
    toast(on ? 'Sonido activado' : 'Sonido desactivado', 1600);
  });
  audio.onChange(sync);
  sync(audio.enabled);
}

function initHoverSounds(audio) {
  let last = null;
  let lastAt = 0;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('a, button, summary');
    if (!el || el === last) return;
    last = el;
    const now = performance.now();
    if (now - lastAt < 70) return;
    lastAt = now;
    audio.sfx('tick', { vol: 0.14, rate: 0.95 + Math.random() * 0.15 });
  });
  document.addEventListener('pointerout', (e) => {
    if (last && !last.contains(e.relatedTarget)) last = null;
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button, summary');
    if (!el || el.closest('[data-pad], [data-src], [data-enter], #soundToggle, .ap-pad')) return;
    audio.sfx(el.dataset.sfx || 'click', { vol: 0.32 });
  });
}

// Títulos que entran por líneas al aparecer en pantalla.
export function initReveals() {
  const { gsap, SplitText } = window;
  document.querySelectorAll('[data-split]:not(.hero__title)').forEach((el) => {
    let split;
    try { split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' }); } catch { return; }
    gsap.from(split.lines, {
      yPercent: 115,
      duration: 1.15,
      ease: 'expo.out',
      stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

export function prepareHero() {
  const { gsap } = window;
  gsap.set('.hero__title .line__in', { yPercent: 115 });
  gsap.set(['.hero__lead', '.hero__ctas', '.hero__meta', '.hero__tip'], { opacity: 0, y: 26 });
}

export function heroReveal() {
  const { gsap } = window;
  gsap.to('.hero__title .line__in', { yPercent: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out', delay: 0.35 });
  gsap.to(['.hero__lead', '.hero__ctas', '.hero__meta', '.hero__tip'], { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out', delay: 0.6 });
}
