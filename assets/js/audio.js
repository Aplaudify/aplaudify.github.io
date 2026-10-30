// Motor de sonido de la web.
// - Música de fondo: lista de canciones chill con transiciones tipo DJ.
// - Música de cada local (la calle) y la canción de respaldo de Música Off.
// - Efectos (el "pop" del logo, el timbre, los clics): obedecen el botón de sonido.
// - Clips a pedido (voces, botonera, video): suenan siempre que la persona los pide.
const STORE_KEY = 'aplaudify-sonido';
export const AMBIENT = 'ambiente';

export const PLAYLIST = [
  { url: 'assets/audio/musica/ambiente-chill.mp3', title: 'Gardens', artist: 'penguinmusic' },
  { url: 'assets/audio/musica/lounge-cybersdf.mp3', title: 'Lounge', artist: 'CyberSDF' },
  { url: 'assets/audio/musica/lazy-beach-breaks.mp3', title: 'Lazy beach breaks', artist: 'K4MMERER' },
  { url: 'assets/audio/musica/upbeat-lounge.mp3', title: 'Upbeat Lounge', artist: 'Soundrider' },
];
export const BACKUP = { url: 'assets/audio/musica/respaldo-animado.mp3', title: 'Funk Groove Soul', artist: 'Catálogo de respaldo' };

const SFX = {
  click: 'click', tick: 'tick-a', tick2: 'tick-b', pop: 'pop-a', pop2: 'pop-b',
  swish: 'swish', whoosh: 'wh-1', shimmer: 'shimmer', subdrop: 'subdrop', hit: 'hit',
  glitch: 'glitch-a', powerdown: 'powerdown', alarm: 'alarm',
};
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];
// Acordes maj7 y maj9 en registro alto para las chispas del clic en el logo.
const CHORDS = [
  [1046.5, 1318.51, 1567.98, 1975.53],
  [1174.66, 1479.98, 1760, 2217.46],
  [880, 1108.73, 1318.51, 1661.22],
  [783.99, 987.77, 1174.66, 1479.98],
];
const XF = 7;

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.buffers = new Map();
    this.music = null;
    this.level = 0;
    this.bass = 0;
    this.mediaLevel = 0;
    this.current = null;
    this._subs = new Set();
    this._trackSubs = new Set();
    this._duckers = new Set();
    this._pl = { index: 0, active: false };
    this.clip = null;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  get savedChoice() {
    try { return localStorage.getItem(STORE_KEY); } catch { return null; }
  }

  onChange(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
  onTrack(fn) { this._trackSubs.add(fn); return () => this._trackSubs.delete(fn); }
  _emitTrack(info) { this.current = info; this._trackSubs.forEach((fn) => fn(info)); }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.72;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 0.8;
    this.duckGain = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.mediaBus = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -12;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.008;
    this.comp.release.value = 0.25;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.mediaAnalyser = ctx.createAnalyser();
    this.mediaAnalyser.fftSize = 256;
    this.mediaAnalyser.smoothingTimeConstant = 0.72;

    this.musicBus.connect(this.filter).connect(this.duckGain).connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.comp);
    this.mediaBus.connect(this.mediaAnalyser);
    this.mediaBus.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // Eco para las transiciones y para el corte de Música Off.
    this.echoIn = ctx.createGain();
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.375;
    const fbFilter = ctx.createBiquadFilter();
    fbFilter.type = 'lowpass';
    fbFilter.frequency.value = 2600;
    const fb = ctx.createGain();
    fb.gain.value = 0.52;
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.75;
    this.echoIn.connect(delay);
    delay.connect(fbFilter).connect(fb).connect(delay);
    delay.connect(echoOut).connect(this.musicBus);

    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.mediaFreq = new Uint8Array(this.mediaAnalyser.frequencyBinCount);

    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(2.2, 2.6);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.34;
    this.verb.connect(verbGain).connect(this.master);
    this.verbExplicit = ctx.createConvolver();
    this.verbExplicit.buffer = this.verb.buffer;
    const verbGain2 = ctx.createGain();
    verbGain2.gain.value = 0.34;
    this.verbExplicit.connect(verbGain2).connect(this.mediaBus);

    this._timer = setInterval(() => this._watch(), 400);
    return ctx;
  }

  setEnabled(on, { save = true } = {}) {
    this.enabled = on;
    document.documentElement.classList.toggle('sound-on', on);
    if (on) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(1, t, 0.25);
      if (!this.music && !this._pl.active) this.startPlaylist();
      this.preload(['click', 'tick', 'pop', 'pop2', 'swish', 'whoosh', 'shimmer', 'subdrop']);
    } else if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(0, t, 0.12);
    }
    if (save) { try { localStorage.setItem(STORE_KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ } }
    this._subs.forEach((fn) => fn(on));
  }

  toggle() { this.setEnabled(!this.enabled); return this.enabled; }

  async load(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); })
      .then((b) => new Promise((res, rej) => this.ensure().decodeAudioData(b, res, rej)));
    this.buffers.set(url, p);
    try { return await p; } catch (e) { this.buffers.delete(url); throw e; }
  }

  preload(names) {
    if (!this.ensure()) return;
    names.forEach((n) => this.load(`assets/audio/sfx/${SFX[n] || n}.mp3`).catch(() => {}));
  }

  // ---------- una pista con su propia cadena (filtros + envío de eco) ----------
  _voice(buf, { loop = false, offset = 0 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    if (loop) { src.loopStart = 0.06; src.loopEnd = buf.duration - 0.06; }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 20;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 20000;
    const send = ctx.createGain();
    send.gain.value = 0;
    src.connect(gain).connect(hp).connect(lp).connect(this.musicBus);
    lp.connect(send).connect(this.echoIn);
    src.start(ctx.currentTime + 0.02, offset);
    const voice = {
      src, gain, hp, lp, send, buf, startedAt: ctx.currentTime + 0.02,
      stop(at) {
        try { src.stop(at); } catch { /* ya detenida */ }
        setTimeout(() => { try { lp.disconnect(); send.disconnect(); } catch { /* listo */ } }, Math.max(0, (at - ctx.currentTime) * 1000) + 400);
      },
    };
    return voice;
  }

  // Entrada con filtro que se abre; salida con eco y filtro que se cierra.
  _mixIn(v, t, dur = XF) {
    v.gain.gain.setValueAtTime(0, t);
    v.gain.gain.linearRampToValueAtTime(1, t + dur * 0.7);
    v.lp.frequency.setValueAtTime(320, t);
    v.lp.frequency.exponentialRampToValueAtTime(18000, t + dur * 0.95);
  }

  _mixOut(v, t, dur = XF) {
    v.hp.frequency.setValueAtTime(20, t);
    v.hp.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.85);
    v.send.gain.setValueAtTime(0, t + dur * 0.35);
    v.send.gain.linearRampToValueAtTime(0.85, t + dur * 0.5);
    v.send.gain.linearRampToValueAtTime(0, t + dur * 0.62);
    v.gain.gain.setValueAtTime(1, t + dur * 0.4);
    v.gain.gain.linearRampToValueAtTime(0, t + dur);
    v.stop(t + dur + 0.1);
  }

  // ---------- lista de música de fondo ----------
  async startPlaylist({ advance = false } = {}) {
    if (!this.ensure()) return;
    const pl = this._pl;
    if (pl.active && !advance) return;
    if (advance) pl.index = (pl.index + 1) % PLAYLIST.length;
    pl.active = true;
    const token = (this._musicToken = {});
    const item = PLAYLIST[pl.index];
    let buf;
    try { buf = await this.load(item.url); } catch { return; }
    if (this._musicToken !== token) return;
    const t = this.ctx.currentTime + 0.05;
    if (this.music) this._mixOut(this.music.voice, t);
    const voice = this._voice(buf);
    this._mixIn(voice, t, this.music ? XF : 3);
    this.music = { id: AMBIENT, voice, item, endsAt: voice.startedAt + Math.min(buf.duration - 0.3, 240) };
    this._emitTrack({ ...item, mode: 'lista' });
    this.load(PLAYLIST[(pl.index + 1) % PLAYLIST.length].url).catch(() => {});
    if (this.enabled) this.sfx('swish', { vol: 0.18, when: XF * 0.4 });
  }

  _watch() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.music) return;
    const m = this.music;
    if (m.id === AMBIENT && m.endsAt && ctx.currentTime > m.endsAt - XF) {
      m.endsAt = 0;
      this.startPlaylist({ advance: true });
    }
  }

  // Música propia de un local de la calle (en bucle). "ambiente" vuelve a la lista.
  async playMusic(id, url, { fade = 1.6 } = {}) {
    if (!this.ensure()) return;
    if (id === AMBIENT) {
      if (this.music && this.music.id === AMBIENT) return;
      this._pl.active = false;
      this.startPlaylist({ advance: !!this.music });
      return;
    }
    if (this.music && this.music.id === id) return;
    this._pl.active = false;
    const token = (this._musicToken = {});
    let buf;
    try { buf = await this.load(url); } catch { return; }
    if (this._musicToken !== token) return;
    const t = this.ctx.currentTime + 0.05;
    if (this.music) this._mixOut(this.music.voice, t, fade * 2);
    const voice = this._voice(buf, { loop: true });
    this._mixIn(voice, t, fade * 2);
    this.music = { id, voice };
  }

  stopMusic(fade = 1.2) {
    this._musicToken = {};
    this._pl.active = false;
    if (this.music) { this._mixOut(this.music.voice, this.ctx.currentTime, fade); this.music = null; }
  }

  // Música Off: la canción se corta con eco y entra la de respaldo.
  async interrupt() {
    if (!this.ensure()) return null;
    this._pl.active = false;
    const token = (this._musicToken = {});
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.music) {
      const v = this.music.voice;
      v.send.gain.cancelScheduledValues(t);
      v.send.gain.setValueAtTime(1, t);
      v.send.gain.linearRampToValueAtTime(0, t + 0.6);
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0, t + 0.35);
      v.stop(t + 0.5);
      this.music = null;
    }
    this.dip();
    let buf;
    try { buf = await this.load(BACKUP.url); } catch { return null; }
    await new Promise((r) => setTimeout(r, 1300));
    if (this._musicToken !== token) return null;
    const voice = this._voice(buf, { loop: true });
    this._mixIn(voice, ctx.currentTime, 2.4);
    this.music = { id: 'respaldo', voice };
    this._emitTrack({ ...BACKUP, mode: 'off' });
    return BACKUP;
  }

  reconnect() {
    if (!this.ctx) return;
    this._pl.active = false;
    this.startPlaylist({ advance: true });
  }

  // ---------- efectos ----------
  async sfx(name, { vol = 1, rate = 1, explicit = false, pan = 0, when = 0 } = {}) {
    if (!explicit && !this.enabled) return null;
    if (!this.ensure()) return null;
    let buf;
    try { buf = await this.load(`assets/audio/sfx/${SFX[name] || name}.mp3`); } catch { return null; }
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    let node = src.connect(g);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(explicit ? this.mediaBus : this.sfxBus);
    src.start(ctx.currentTime + when);
    return src;
  }

  // Una nota tipo marimba (sinusoide + armónico corto), con reverberación.
  _note(freq, when, { vol = 0.5, pan = 0, explicit = false, decay = 1.1 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01 + when;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vol, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 4.01;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.35, t);
    g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);
    o1.connect(out);
    o2.connect(g2).connect(out);
    let last = out;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      last = out.connect(p);
    }
    last.connect(explicit ? this.mediaBus : this.sfxBus);
    last.connect(explicit ? this.verbExplicit : this.verb);
    o1.start(t);
    o2.start(t);
    o1.stop(t + decay + 0.05);
    o2.stop(t + 0.25);
  }

  // Un tono corto y brillante de síntesis FM (como un "pluck" de synth).
  _pluck(freq, when, { vol = 0.3, pan = 0, explicit = false, decay = 0.4 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01 + when;
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq * 3;
    const index = ctx.createGain();
    index.gain.setValueAtTime(freq * 1.4, t);
    index.gain.exponentialRampToValueAtTime(freq * 0.02, t + 0.14);
    mod.connect(index).connect(car.frequency);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vol, t + 0.003);
    amp.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    let last = car.connect(amp);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      last = last.connect(p);
    }
    const send = ctx.createGain();
    send.gain.value = 0.45;
    last.connect(explicit ? this.mediaBus : this.sfxBus);
    last.connect(send).connect(explicit ? this.verbExplicit : this.verb);
    car.start(t);
    mod.start(t);
    car.stop(t + decay + 0.05);
    mod.stop(t + decay + 0.05);
  }

  _noise() {
    if (!this._noiseBuf) {
      const ctx = this.ctx;
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = b;
    }
    return this._noiseBuf;
  }

  // Clic en el logo: "pop" moderno con un soplo de aire y chispas de synth.
  burst({ explicit = false, vol = 0.5 } = {}) {
    if (!explicit && !this.enabled) return;
    if (!this.ensure()) return;
    const ctx = this.ctx;
    const out = explicit ? this.mediaBus : this.sfxBus;
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
    const n = ctx.createBufferSource();
    n.buffer = this._noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1600, t);
    bp.frequency.exponentialRampToValueAtTime(8000, t + 0.28);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(vol * 0.22, t + 0.03);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.32);
    n.connect(bp).connect(ng).connect(out);
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.35);
    const chord = CHORDS[(Math.random() * CHORDS.length) | 0];
    const from = Math.random() < 0.5 ? 0 : 1;
    for (let i = 0; i < 3; i++) {
      this._pluck(chord[from + i], 0.035 + i * 0.05, { vol: vol * (0.5 - i * 0.08), pan: (i - 1) * 0.45, explicit });
    }
  }

  // Remate alegre (encender la calle, final de la página).
  flourish({ explicit = false, vol = 0.36 } = {}) {
    if (!explicit && !this.enabled) return;
    if (!this.ensure()) return;
    [0, 2, 4, 5, 7].forEach((k, i) => this._note(PENTA[k], i * 0.085, { vol, pan: (i - 2) * 0.25, explicit, decay: 1.4 }));
  }

  // Timbre de anuncio "ding-dong" (campana con parciales inarmónicos).
  chime({ explicit = true, vol = 0.55 } = {}) {
    if (!explicit && !this.enabled) return;
    if (!this.ensure()) return;
    const ctx = this.ctx;
    const bell = (freq, when) => {
      const t = ctx.currentTime + 0.01 + when;
      [[1, 1, 2.4], [2.76, 0.32, 1.1], [5.4, 0.16, 0.5], [0.5, 0.25, 2.6]].forEach(([mult, amp, dec]) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
        o.connect(g);
        g.connect(explicit ? this.mediaBus : this.sfxBus);
        g.connect(explicit ? this.verbExplicit : this.verb);
        o.start(t);
        o.stop(t + dec + 0.05);
      });
    };
    bell(659.25, 0);
    bell(523.25, 0.62);
    return 2.4;
  }

  // ---------- baja la música mientras suena algo importante ----------
  duck(key, on, amount = 0.12) {
    if (on) this._duckers.add(key); else this._duckers.delete(key);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ducked = this._duckers.size > 0;
    const target = ducked ? (this._duckers.has('video') ? 0 : amount) : 1;
    this.duckGain.gain.cancelScheduledValues(t);
    this.duckGain.gain.setTargetAtTime(target, t, ducked ? 0.12 : 0.45);
  }

  // Filtro que "ahoga" la música un instante.
  dip() {
    if (!this.ctx) return;
    const f = this.filter.frequency;
    const t = this.ctx.currentTime;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(380, t + 0.18);
    f.setValueAtTime(380, t + 0.85);
    f.exponentialRampToValueAtTime(20000, t + 2.2);
  }

  // ---------- clips a pedido (voces, cuñas, jingles) ----------
  playClip(url, { onProgress, onEnd, duck = true } = {}) {
    this.stopClip();
    this.ensure();
    if (!this._el) {
      this._el = new Audio();
      this._el.preload = 'none';
      if (this.ctx) {
        try {
          this._elSrc = this.ctx.createMediaElementSource(this._el);
          this._elSrc.connect(this.mediaBus);
        } catch { /* el navegador reproduce directo */ }
      }
    }
    const el = this._el;
    const token = {};
    this.clip = token;
    el.src = url;
    el.currentTime = 0;
    const tick = () => {
      if (this.clip !== token) return;
      if (el.duration) onProgress?.(el.currentTime / el.duration, el);
      token.raf = requestAnimationFrame(tick);
    };
    el.onended = () => { if (this.clip === token) { this.clip = null; this.duck('clip', false); onEnd?.(); } };
    if (duck) this.duck('clip', true, 0.08);
    el.play().then(tick).catch(() => { this.clip = null; this.duck('clip', false); onEnd?.(); });
    token.stop = () => { cancelAnimationFrame(token.raf); el.pause(); this.duck('clip', false); onEnd?.(); };
    return token;
  }

  stopClip() {
    if (!this.clip) return;
    const c = this.clip;
    this.clip = null;
    c.stop();
  }

  // ---------- niveles para las visuales ----------
  sample() {
    if (!this.ctx || this.ctx.state !== 'running') {
      this.level *= 0.9; this.bass *= 0.9; this.mediaLevel *= 0.9;
      return;
    }
    this.analyser.getByteFrequencyData(this.freq);
    let b = 0, all = 0;
    for (let i = 1; i < 9; i++) b += this.freq[i];
    for (let i = 1; i < 120; i++) all += this.freq[i];
    b /= 8 * 255;
    all /= 119 * 255;
    this.bass += (b - this.bass) * 0.35;
    this.level += (all - this.level) * 0.25;
    this.mediaAnalyser.getByteFrequencyData(this.mediaFreq);
    let m = 0;
    for (let i = 2; i < 60; i++) m += this.mediaFreq[i];
    m /= 58 * 255;
    this.mediaLevel += (m - this.mediaLevel) * 0.3;
  }

  _impulse(sec, decay) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * sec;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
}

export const audio = new AudioEngine();
