// Intro: el logo se arma pieza por pieza, la persona elige cómo entrar
// y un toldo verde y blanco cae y se enrolla para abrir el local.
const NS = 'http://www.w3.org/2000/svg';
const SEEN_KEY = 'aplaudify-intro';

export function logoSVG(parts, { fill = '#f2f5ef' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '363 1187 3068 722');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const p of parts) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', p.d);
    path.setAttribute('fill', fill);
    path.setAttribute('fill-rule', 'evenodd');
    path.dataset.id = p.id;
    path.dataset.g = p.g;
    svg.appendChild(path);
  }
  return svg;
}

export function runIntro({ partsP, ready, audio, reduced, onBuilt, onEnter, onDone }) {
  const { gsap } = window;
  const intro = document.getElementById('intro');
  const box = document.getElementById('introLogo');
  const status = document.getElementById('introStatus');
  const actions = document.getElementById('introActions');
  const hint = document.getElementById('introHint');
  const awning = document.getElementById('introAwning');
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* sin almacenamiento */ }

  const lines = ['Preparando el escenario', 'Afinando el sonido', 'Encendiendo las luces', 'Abriendo el local'];
  let li = 0;
  const statusTimer = setInterval(() => {
    li = (li + 1) % lines.length;
    gsap.fromTo(status, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out', onStart: () => { status.textContent = lines[li]; } });
  }, 1300);

  const built = partsP.then((parts) => {
    const svg = logoSVG(parts);
    box.appendChild(svg);
    const q = (g) => svg.querySelectorAll(`[data-g="${g}"]`);
    if (seen || reduced) {
      gsap.from(svg, { opacity: 0, duration: 0.6 });
      return null;
    }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(q('stripe'), { scaleY: 0, transformOrigin: '100% 0%', duration: 0.9, stagger: 0.1 })
      .from(q('scallop'), { scale: 0, transformOrigin: '50% 30%', duration: 0.7, stagger: 0.08, ease: 'back.out(2.2)' }, '-=0.55')
      .from(q('flag'), { scale: 0, rotation: -60, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.06, ease: 'back.out(1.8)' }, '-=0.5')
      .from(q('line'), { scaleX: 0, transformOrigin: '0% 50%', duration: 1.1, ease: 'expo.inOut' }, '-=0.6')
      .from(q('letter'), { yPercent: 70, opacity: 0, duration: 0.8, stagger: 0.05 }, '-=0.9')
      .from(q('dot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(3)' }, '-=0.35');
    return new Promise((res) => tl.eventCallback('onComplete', res));
  });

  built.then(() => onBuilt?.(), () => onBuilt?.());
  const timeout = new Promise((res) => setTimeout(res, 9000));
  Promise.all([Promise.race([ready, timeout]), built.catch(() => {})]).then(() => {
    clearInterval(statusTimer);
    status.textContent = 'Todo listo';
    gsap.fromTo(actions, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' });
    gsap.to(hint, { opacity: 1, duration: 0.7, delay: 0.15 });
    actions.querySelector('[data-enter="sound"]').focus({ preventScroll: true });
  });

  let entered = false;
  function enter(withSound) {
    if (entered) return;
    entered = true;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* sin almacenamiento */ }
    if (withSound) audio.setEnabled(true);
    else audio.setEnabled(false, { save: true });
    document.body.classList.remove('is-loading');
    if (reduced) {
      onEnter?.(withSound);
      gsap.to(intro, { opacity: 0, duration: 0.5, onComplete: () => { intro.classList.add('is-gone'); onDone?.(); } });
      return;
    }
    const n = window.innerWidth < 700 ? 6 : 12;
    awning.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'intro__stripe';
      awning.appendChild(s);
    }
    const stripes = awning.children;
    audio.sfx('whoosh', { vol: 0.6 });
    const tl = gsap.timeline();
    tl.to(['.intro__center'], { opacity: 0, y: -16, duration: 0.35, ease: 'power2.in' })
      .to(stripes, { scaleY: 1, duration: 0.62, ease: 'expo.inOut', stagger: { each: 0.035, from: 'edges' } }, 0.05)
      .add(() => {
        intro.style.background = 'transparent';
        onEnter?.(withSound);
        audio.sfx('subdrop', { vol: 0.7 });
        audio.sfx('shimmer', { vol: 0.45, when: 0.15 });
      })
      .to(stripes, { yPercent: -118, duration: 1.05, ease: 'expo.inOut', stagger: { each: 0.03, from: 'center' } }, '+=0.12')
      .add(() => { intro.classList.add('is-gone'); onDone?.(); });
  }

  actions.addEventListener('click', (e) => {
    const b = e.target.closest('[data-enter]');
    if (b) enter(b.dataset.enter === 'sound');
  });
  window.addEventListener('keydown', function onKey(e) {
    if (entered) { window.removeEventListener('keydown', onKey); return; }
    if (getComputedStyle(actions).visibility === 'hidden') return;
    if (e.key === 'Escape') enter(false);
  });
}
