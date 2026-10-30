// Botonera de disparos compartida (la de la demo y la de Funciones).
const CLIPS = {
  bienvenida: 'assets/audio/voces/cuna-bienvenida.mp3',
  oferta: 'assets/audio/voces/cuna-promocion.mp3',
  cierre: 'assets/audio/voces/cuna-cierre.mp3',
};

export function createPads(audio) {
  const { gsap } = window;
  const flash = (el) => {
    if (!el) return;
    el.classList.add('is-hit');
    setTimeout(() => el.classList.remove('is-hit'), 240);
  };
  const progress = (el, dur) => {
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.fromTo(el, { '--p': 0 }, { '--p': 1, duration: dur, ease: 'none', onComplete: () => gsap.set(el, { '--p': 0 }) });
  };
  return function play(name, el, { explicit = true } = {}) {
    flash(el);
    if (!explicit && !audio.enabled) return;
    if (CLIPS[name]) {
      audio.playClip(CLIPS[name], {
        onProgress: (p) => el && el.style.setProperty('--p', p),
        onEnd: () => el && el.style.setProperty('--p', 0),
      });
      return;
    }
    if (name === 'timbre') { audio.chime({ explicit }); progress(el, 2.4); }
    else if (name === 'brillo') { audio.sfx('shimmer', { explicit, vol: 0.9 }); progress(el, 1.6); }
    else if (name === 'impacto') { audio.sfx('hit', { explicit, vol: 0.9 }); audio.sfx('subdrop', { explicit, vol: 0.7 }); progress(el, 1.2); }
  };
}
