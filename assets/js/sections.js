// Secciones: calendario 3D, galería, reproductor de voces, video oficial,
// planes, cupos, logo del pie de página y la banda de clientes.
import { logoSVG } from './intro.js';
import { toast } from './ui.js';
import { createCheckout } from './pay.js';

const $ = (id) => document.getElementById(id);
const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const luminance = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export function initSections({ audio }) {
  const { gsap, ScrollTrigger } = window;
  initMarquee(gsap, ScrollTrigger);
  initRing(gsap, ScrollTrigger, audio);
  initGallery(gsap);
  initPlayer(gsap, audio);
  initFilm(gsap, audio);
  initPlans(gsap);
  initQuota(gsap);
  initContact();
  return {
    footerLogo: (parts) => initFooterLogo(gsap, ScrollTrigger, parts),
  };
}

function initMarquee(gsap, ScrollTrigger) {
  const track = document.querySelector('.marquee__track');
  const originals = [...track.children];
  let setW = 0;
  // Repite los logos las veces necesarias para cubrir siempre el ancho de pantalla.
  const build = () => {
    [...track.children].slice(originals.length).forEach((n) => n.remove());
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setW = originals.reduce((s, n) => s + n.getBoundingClientRect().width + gap, 0);
    if (!setW) return;
    const copies = Math.ceil((window.innerWidth * 2) / setW) + 1;
    for (let c = 0; c < copies; c++) {
      originals.forEach((n) => {
        const k = n.cloneNode(true);
        k.alt = '';
        k.setAttribute('aria-hidden', 'true');
        track.appendChild(k);
      });
    }
  };
  build();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 200); });
  window.addEventListener('load', build);
  let x = 0;
  let boost = 0;
  let on = false;
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(track);
  ScrollTrigger.create({ trigger: '.clients', start: 'top bottom', end: 'bottom top', onUpdate: (self) => { boost = Math.min(500, Math.abs(self.getVelocity()) * 0.35); } });
  gsap.ticker.add((t, d) => {
    if (!on || !setW) return;
    x -= (45 + boost) * (Math.min(d, 100) / 1000);
    boost *= 0.94;
    if (x <= -setW) x += setW;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  });
}

function initRing(gsap, ScrollTrigger, audio) {
  const ring = $('ring');
  const spin = $('ringSpin');
  const cards = [...spin.children];
  const n = cards.length;
  let r = 0;
  cards.forEach((c) => {
    const col = c.style.getPropertyValue('--c').trim();
    if (col) c.style.setProperty('--ci', luminance(col) > 0.36 ? '#0a0f0c' : '#ffffff');
  });
  const layout = () => {
    const w = spin.offsetWidth;
    r = Math.round(w / 2 / Math.tan(Math.PI / n) + w * 0.12);
    cards.forEach((c, i) => { c.style.transform = `rotateY(${(i * 360) / n}deg) translateZ(${r}px)`; });
  };
  layout();
  new ResizeObserver(layout).observe(spin);
  let scrollRot = 0;
  let drag = 0;
  let vel = 0;
  let dragging = false;
  let lastX = 0;
  let on = false;
  let lastSlot = 0;
  ScrollTrigger.create({ trigger: ring, start: 'top bottom', end: 'bottom top', onUpdate: (self) => { scrollRot = 40 - self.progress * 330; } });
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(ring);
  ring.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    vel = 0;
    ring.setPointerCapture(e.pointerId);
  });
  ring.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    drag += dx * 0.32;
    vel = dx * 0.32;
  });
  const up = () => { dragging = false; };
  ring.addEventListener('pointerup', up);
  ring.addEventListener('pointercancel', up);
  gsap.ticker.add(() => {
    if (!on) return;
    if (!dragging) { drag += vel; vel *= 0.94; }
    const total = scrollRot + drag;
    spin.style.transform = `translateZ(${-r}px) rotateX(-7deg) rotateY(${total}deg)`;
    const slot = Math.round(total / (360 / n));
    if (slot !== lastSlot) {
      lastSlot = slot;
      audio.sfx('tick', { vol: 0.1, rate: 1.5 });
    }
  });
}

function initGallery(gsap) {
  const rail = $('gallery');
  const figs = [...rail.children];
  let x = 0;
  let vel = 0;
  let dragging = false;
  let lastX = 0;
  let hover = false;
  let on = false;
  let dir = -1;
  let moved = 0;
  const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(rail);
  rail.addEventListener('pointerenter', () => { hover = true; });
  rail.addEventListener('pointerleave', () => { hover = false; });
  rail.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    vel = 0;
    moved = 0;
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    x += dx;
    vel = dx;
    moved += Math.abs(dx);
  });
  const up = () => { dragging = false; };
  rail.addEventListener('pointerup', up);
  rail.addEventListener('pointercancel', up);
  rail.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    x -= e.deltaX;
  }, { passive: false });
  gsap.ticker.add(() => {
    if (!on) return;
    const m = max();
    if (!dragging) {
      x += vel;
      vel *= 0.93;
      if (!hover && Math.abs(vel) < 0.2) x += dir * 0.35;
    }
    if (x > 0) { x += (0 - x) * 0.15; dir = -1; }
    if (x < -m) { x += (-m - x) * 0.15; dir = 1; }
    const center = rail.clientWidth / 2;
    figs.forEach((f) => {
      const c = (f.offsetLeft + f.offsetWidth / 2 + x - center) / rail.clientWidth;
      const rot = Math.max(-34, Math.min(34, -c * 46));
      const z = -Math.abs(c) * 160;
      f.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rot}deg)`;
    });
  });
}

function initPlayer(gsap, audio) {
  const voice = $('voice');
  const player = $('player');
  const tabs = [...voice.querySelectorAll('.voice__tabs [data-who]')];
  const panels = [...player.querySelectorAll('[data-panel]')];
  const title = $('playerTitle');
  const bar = $('playerBar');
  let current = null;
  // Hernán o el equipo: cambia la foto, la bio y la lista de audios.
  tabs.forEach((t) => t.addEventListener('click', () => {
    const who = t.dataset.who;
    if (voice.dataset.who === who) return;
    voice.dataset.who = who;
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== who; });
    const shown = panels.find((p) => !p.hidden);
    gsap.fromTo(shown, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    gsap.fromTo(voice.querySelector(`.voice__bio--${who}`), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out' });
  }));
  const setIcon = (btn, playing) => btn.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  player.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-src]');
    if (!btn) return;
    if (current === btn) { audio.stopClip(); return; }
    if (current) { current.classList.remove('is-playing'); setIcon(current, false); }
    current = btn;
    btn.classList.add('is-playing');
    setIcon(btn, true);
    title.textContent = `Sonando: ${btn.querySelector('b').textContent}`;
    audio.playClip(btn.dataset.src, {
      onProgress: (p) => { bar.style.width = `${p * 100}%`; },
      onEnd: () => {
        btn.classList.remove('is-playing');
        setIcon(btn, false);
        if (current === btn) { current = null; title.textContent = 'Elige un audio para escucharlo'; bar.style.width = '0%'; }
      },
    });
  });

  // Visualizador: un anillo de barras alrededor de la foto (Hernán o el equipo).
  const cvs = $('voiceViz');
  const ctx = cvs.getContext('2d');
  let on = false;
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(cvs);
  const N = 84;
  const vals = new Float32Array(N);
  gsap.ticker.add((time) => {
    if (!on) return;
    const w = cvs.width;
    const c = w / 2;
    const R = w * 0.37;
    ctx.clearRect(0, 0, w, w);
    const f = audio.mediaFreq;
    const live = audio.clip && f;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      const k = i / N;
      let v;
      if (live) v = f[2 + ((i % (N / 2)) * 1.4) | 0] / 255;
      else v = 0.08 + 0.06 * Math.sin(time * 2 + i * 0.45);
      vals[i] += (v - vals[i]) * 0.3;
      const a = k * Math.PI * 2 - Math.PI / 2;
      const len = 6 + vals[i] * w * 0.12;
      const x0 = c + Math.cos(a) * R;
      const y0 = c + Math.sin(a) * R;
      const x1 = c + Math.cos(a) * (R + len);
      const y1 = c + Math.sin(a) * (R + len);
      ctx.strokeStyle = live ? `rgba(160,178,255,${0.5 + vals[i] * 0.5})` : 'rgba(160,178,255,.35)';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  });
}

function initFilm(gsap, audio) {
  const sec = $('video');
  const frame = $('filmFrame');
  const video = $('film');
  const btn = $('filmPlay');
  gsap.fromTo(frame, { scale: 0.84, borderRadius: 44 }, {
    scale: 1, borderRadius: 22, ease: 'none',
    scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 12%', scrub: 1 },
  });
  btn.addEventListener('click', () => {
    audio.stopClip();
    video.controls = true;
    video.muted = false;
    video.play().catch(() => {});
    frame.removeAttribute('data-cursor');
  });
  video.addEventListener('play', () => { sec.classList.add('is-playing'); audio.duck('video', true); });
  video.addEventListener('pause', () => audio.duck('video', false));
  video.addEventListener('ended', () => {
    audio.duck('video', false);
    sec.classList.remove('is-playing');
    video.controls = false;
    frame.setAttribute('data-cursor', 'Reproducir');
    video.currentTime = 0;
  });
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && !video.paused) video.pause();
  }, { threshold: 0.2 }).observe(frame);
}

function initPlans(gsap) {
  const sec = $('planes');
  const btns = [...sec.querySelectorAll('[data-cycle]')];
  let cycle = 'm';
  btns.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.cycle === cycle) return;
    cycle = b.dataset.cycle;
    btns.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    sec.querySelectorAll('[data-m][data-a]').forEach((el) => {
      const v = el.dataset[cycle];
      el.textContent = el.tagName === 'B' ? `$${v}` : v;
      gsap.fromTo(el, { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    });
  }));
  const checkout = createCheckout({ toast });
  const pay = (plan) => checkout(plan, cycle);
  sec.querySelectorAll('[data-pay]').forEach((b) => b.addEventListener('click', () => pay(b.dataset.pay)));
  initPlanDetail(gsap, sec, () => cycle, pay);
  if (!fine()) return;
  sec.querySelectorAll('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
    gsap.set(card, { transformPerspective: 1100 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      ry((px - 0.5) * 9);
      rx(-(py - 0.5) * 7);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

// ---------- detalles completos de cada plan ----------
const PLAN_INFO = {
  gratis: { name: 'Gratis', note: 'Prueba completa por 7 días, sin tarjeta', price: { m: '$0', a: '$0' }, bill: { m: 'Sin tarjeta', a: 'Sin tarjeta' }, cta: 'Empezar gratis' },
  basic: { name: 'Básico', note: 'Para empezar a sonar profesional', price: { m: '$60.000 COP / mes', a: '$51.000 COP / mes' }, bill: { m: '+ 19% IVA · facturado mes a mes', a: '+ 19% IVA · $612.000 una vez al año' }, cta: 'Pagar Básico' },
  pro: { name: 'Pro', note: 'El más elegido', price: { m: '$120.000 COP / mes', a: '$102.000 COP / mes' }, bill: { m: '+ 19% IVA · facturado mes a mes', a: '+ 19% IVA · $1.224.000 una vez al año' }, cta: 'Pagar Pro' },
  premium: { name: 'Premium', note: 'La mejor calidad', price: { m: '$200.000 COP / mes', a: '$170.000 COP / mes' }, bill: { m: '+ 19% IVA · facturado mes a mes', a: '+ 19% IVA · $2.040.000 una vez al año' }, cta: 'Pagar Premium' },
};
const CORE = [
  ['Parrilla y programación de bloques', 'Arma la programación del día y suena sola, en el orden que definas.'],
  ['Aplaudify Live', 'Tu música desde el celular, programada en la parrilla por tiempo o con Señal Live (una canción).'],
  ['Botonera de disparos', 'Sonidos y cuñas listos para disparar con un clic o una tecla, en bancos.'],
  ['Stream de radio en vivo', 'Música en vivo de distintos géneros, directo en tu parrilla.'],
  ['Eventos programados', 'Jingles, cuñas y anuncios que suenan solos a la hora exacta.'],
  ['Historial y estadísticas', 'Registro de todo lo que suena, con hora, tipo y duración.'],
  ['Música Off (sin internet)', 'Si se cae el internet, sigue sonando tu catálogo de respaldo.'],
  ['Alerta de terremotos', 'Ante un sismo en tu zona, detiene la reproducción y activa una alarma.'],
];
const BASIC = [
  ['Sin límite de tiempo', 'Tu plan sigue activo mientras esté al día, sin el límite de 7 días de la prueba.'],
  ['Streams públicos', 'Programa streams públicos en vivo dentro de tu parrilla.'],
];
const quota = (m, a, extra = '') => (c) => (c === 'a' ? `Hasta ${a} al año con el plan anual${extra}.` : `Hasta ${m} al mes${extra}.`);
const DETAILS = {
  gratis: [{ title: 'Todo incluido durante 7 días', wide: true, items: [...CORE, ['Audios comerciales', '2 gratis durante la prueba.'], ['Videos para redes', '2 gratis durante la prueba.']] }],
  basic: [
    { title: 'Todo lo del plan Gratis', items: CORE },
    { title: 'Además, con Básico', items: [...BASIC, ['Audios comerciales', quota(5, 70)], ['Videos para redes', quota(5, 70)]] },
  ],
  pro: [
    { title: 'Todo lo del plan Gratis', items: CORE },
    { title: 'Todo lo del plan Básico', items: BASIC },
    { title: 'Además, con Pro', items: [['Música Off de mejor calidad', 'Música de respaldo de mejor calidad y más variada.'], ['Audios comerciales', quota(15, 210, ', con mejor calidad')], ['Videos para redes', quota(15, 210, ', con mejor calidad')]] },
  ],
  premium: [
    { title: 'Todo lo del plan Gratis', items: CORE },
    { title: 'Todo lo de Básico y Pro', items: [...BASIC, ['Música Off de mejor calidad', 'Música de respaldo de mejor calidad y más variada.']] },
    { title: 'Además, con Premium', items: [['Música Off en la mejor calidad', 'La música de respaldo con la mejor calidad de audio y la mayor variedad.'], ['Audios comerciales', quota(25, 350, ', en la mejor calidad')], ['Videos para redes', quota(25, 350, ', en la mejor calidad')]] },
  ],
};

function initPlanDetail(gsap, sec, getCycle, pay) {
  const box = $('planDetail');
  document.body.appendChild(box);
  const panel = $('pdPanel');
  const body = $('pdBody');
  const cta = $('pdCta');
  let openPlan = null;
  let fromCard = null;
  let lastFocus = null;

  const render = (plan) => {
    const info = PLAN_INFO[plan];
    const c = getCycle();
    panel.dataset.plan = plan;
    $('pdTitle').textContent = info.name;
    $('pdNote').textContent = info.note;
    $('pdPrice').textContent = info.price[c];
    $('pdBill').textContent = info.bill[c];
    cta.textContent = info.cta;
    cta.setAttribute('href', plan === 'gratis' ? '#descargar' : '#planes');
    const group = (g, cls = '') => `
      <section class="pd-group${cls}">
        <h4>${g.title}</h4>
        <ul>${g.items.map(([t, d]) => `<li><b>${t}</b><span>${typeof d === 'function' ? d(c) : d}</span></li>`).join('')}</ul>
      </section>`;
    const [first, ...rest] = DETAILS[plan];
    body.classList.toggle('is-single', !rest.length);
    body.innerHTML = rest.length
      ? `<div class="pd-left">${group(first, ' pd-group--core')}</div><div class="pd-right">${rest.map((g) => group(g)).join('')}</div>`
      : group(first, ' pd-group--wide');
  };

  const open = (plan, card) => {
    openPlan = plan;
    fromCard = card;
    lastFocus = document.activeElement;
    render(plan);
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    const a = card.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    gsap.fromTo(panel, {
      x: a.left - b.left, y: a.top - b.top, scaleX: a.width / b.width, scaleY: a.height / b.height, borderRadius: 30,
    }, { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 32, duration: 0.7, ease: 'expo.inOut' });
    gsap.fromTo(box.querySelector('.plan-detail__scrim'), { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.fromTo(panel.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, delay: 0.38, ease: 'expo.out' });
    setTimeout(() => panel.querySelector('.pd-close').focus({ preventScroll: true }), 300);
  };

  const close = () => {
    if (!openPlan) return;
    const card = fromCard;
    openPlan = null;
    const a = card.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    gsap.to(panel.children, { opacity: 0, duration: 0.18 });
    gsap.to(box.querySelector('.plan-detail__scrim'), { opacity: 0, duration: 0.45 });
    gsap.to(panel, {
      x: a.left - b.left, y: a.top - b.top, scaleX: a.width / b.width, scaleY: a.height / b.height, borderRadius: 30,
      duration: 0.55, ease: 'expo.inOut',
      onComplete: () => {
        box.hidden = true;
        gsap.set(panel, { clearProps: 'transform,borderRadius' });
        document.documentElement.style.overflow = '';
        lastFocus?.focus({ preventScroll: true });
      },
    });
  };

  sec.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => open(b.dataset.details, b.closest('.plan'))));
  box.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openPlan) close(); });
  cta.addEventListener('click', (e) => {
    if (openPlan === 'gratis') { close(); return; }
    e.preventDefault();
    e.stopPropagation();
    pay(openPlan);
  });
}

function initQuota(gsap) {
  const btns = [...document.querySelectorAll('[data-quota-cycle]')];
  btns.forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.quotaCycle;
    btns.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    document.querySelectorAll('.quota__table [data-m]').forEach((el) => {
      el.textContent = el.dataset[c];
      gsap.fromTo(el, { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    });
  }));
}

// Contacto: el correo abre Gmail listo para escribir (en el celular, la app de correo)
// y además queda copiado, por si la persona usa otro correo.
function initContact() {
  const mail = document.querySelector('[data-mail]');
  if (!mail) return;
  const to = mail.dataset.mail;
  const subject = encodeURIComponent('Información sobre Aplaudify');
  if (window.matchMedia('(pointer: coarse)').matches) {
    mail.href = `mailto:${to}?subject=${subject}`;
  } else {
    mail.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}`;
    mail.target = '_blank';
    mail.rel = 'noopener';
  }
  mail.addEventListener('click', () => {
    navigator.clipboard?.writeText(to).then(() => toast(`Correo copiado: ${to}`)).catch(() => {});
  });
}

function initFooterLogo(gsap, ScrollTrigger, parts) {
  const box = $('footerLogo');
  const svg = logoSVG(parts);
  box.appendChild(svg);
  const paths = [...svg.querySelectorAll('path')];
  // Orbes verdes que salen de detrás del logo y suben como cenizas (como en la app):
  // pocas, repartidas al azar por todo el logo.
  const embers = document.createElement('div');
  embers.className = 'footer__embers';
  embers.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 16; i++) {
    const dot = document.createElement('i');
    if (i % 4 === 0) dot.className = 'is-sm';
    dot.style.left = `${2 + Math.random() * 96}%`;
    dot.style.top = `${12 + Math.random() * 76}%`;
    dot.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 36)}px`);
    dot.style.setProperty('--rise', `${Math.round(160 + Math.random() * 200)}px`);
    dot.style.setProperty('--dur', `${(4.2 + Math.random() * 3).toFixed(2)}s`);
    dot.style.setProperty('--delay', `${(Math.random() * 5).toFixed(2)}s`);
    embers.appendChild(dot);
  }
  box.prepend(embers);
  gsap.set(paths, { yPercent: 70, opacity: 0 });
  ScrollTrigger.create({
    trigger: box,
    start: 'top 92%',
    once: true,
    onEnter: () => {
      gsap.to(paths, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.035 });
      setTimeout(() => embers.classList.add('is-on'), 700);
    },
  });
  ScrollTrigger.create({
    trigger: box,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => embers.classList.toggle('is-paused', !self.isActive),
  });
  if (!fine()) return;
  const lifts = paths.map((p) => gsap.quickTo(p, 'y', { duration: 0.6, ease: 'power3' }));
  box.addEventListener('pointermove', (e) => {
    paths.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const dx = Math.abs(e.clientX - (r.left + r.width / 2));
      const k = Math.max(0, 1 - dx / 220);
      lifts[i](-k * k * (p.dataset.g === 'letter' ? 70 : 40));
    });
  });
  box.addEventListener('pointerleave', () => lifts.forEach((l) => l(0)));
}
