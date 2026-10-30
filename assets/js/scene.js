// Mundo 3D de la página: el logo en 3D (al darle clic salen íconos de
// negocio), la calle de locales y una cámara que recorre todo mientras la
// persona hace scroll.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/SVGLoader.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { STORES } from './data.js';

const STREET_Y = -40;
const PALETTE = ['#f2f5ef', '#f2f5ef', '#f2f5ef', '#f2f5ef', '#2bea7a', '#2bea7a', '#2bea7a', '#ffc21a', '#ff6a1a', '#12b5a0', '#4f6bff', '#ff2d55', '#e0337a'];

// Encuadres de cámara por sección (posición, punto al que mira, giro).
const SHOTS = {
  hero: { pos: [0, 0.15, 10.5], look: [0, 0, 0], roll: 0 },
  hero2: { pos: [2.8, -5, 10.5], look: [1.2, -7.2, 0], roll: 0.05 },
  product: { pos: [-2.4, -55, 10], look: [0, -57, -1], roll: -0.05 },
  features: { pos: [2.2, -64, 9.5], look: [0.4, -66.5, -2], roll: 0.06 },
  calendar: { pos: [-3, -74, 10], look: [0, -76, -1], roll: -0.045 },
  ads: { pos: [2.4, -84, 9], look: [0, -86, -2], roll: 0.05 },
  film: { pos: [0, -92.5, 11], look: [0, -93.5, 0], roll: 0 },
  plans: { pos: [-2.2, -99, 10], look: [0, -101, -1], roll: -0.035 },
  download: { pos: [0, -105, 9], look: [0, -106, 0], roll: 0 },
  team: { pos: [2.2, -110, 10], look: [0, -111.5, -1], roll: 0.03 },
  contact: { pos: [-1.6, -113.5, 10], look: [0, -115, -1], roll: -0.02 },
  footer: { pos: [0, -118, 10.5], look: [0, -119, 0], roll: 0 },
};

// Cede el turno al navegador entre pasos pesados para que la intro siga fluida.
const breathe = () => new Promise((res) => {
  let done = false;
  const go = () => { if (!done) { done = true; res(); } };
  requestAnimationFrame(go);
  setTimeout(go, 60);
});
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => t * t * (3 - 2 * t);
const damp = (dt, k) => 1 - Math.exp(-dt * k);

function radialTexture(inner, outer = 'rgba(0,0,0,0)', size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Íconos de negocio que salen del logo: etiqueta de oferta, descuento (%),
// camiseta, bolsa de compras, taza de café, carrito, sello de oferta,
// megáfono y mancuerna. Todos del mismo tamaño para que se vean parejos.
function businessIcons() {
  const poly = (pts) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  };
  const hole = (cx, cy, r) => {
    const h = new THREE.Path();
    h.absarc(cx, cy, r, 0, Math.PI * 2, true);
    return h;
  };
  const ring = (cx, cy, r, inner) => {
    const s = new THREE.Shape();
    s.absarc(cx, cy, r, 0, Math.PI * 2, false);
    if (inner) s.holes.push(hole(cx, cy, inner));
    return s;
  };
  const round = (x, y, w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };

  const tag = poly([[0.75, 0], [2.7, 0], [2.7, 1.5], [0.75, 1.5], [0, 0.75]]);
  tag.holes.push(hole(0.62, 0.75, 0.18));

  const percent = [ring(0.55, 1.85, 0.5, 0.24), ring(1.85, 0.55, 0.5, 0.24), poly([[0.12, 0], [0.5, 0], [2.28, 2.4], [1.9, 2.4]])];

  const shirt = new THREE.Shape();
  shirt.moveTo(0.95, 2.3);
  shirt.quadraticCurveTo(1.3, 1.92, 1.65, 2.3);
  [[2.2, 2.12], [2.6, 1.62], [2.18, 1.3], [1.98, 1.48], [1.98, 0], [0.62, 0], [0.62, 1.48], [0.42, 1.3], [0, 1.62], [0.4, 2.12]].forEach(([x, y]) => shirt.lineTo(x, y));
  shirt.closePath();

  const handle = new THREE.Shape();
  handle.absarc(1.05, 1.75, 0.62, 0, Math.PI, false);
  handle.lineTo(0.61, 1.75);
  handle.absarc(1.05, 1.75, 0.44, Math.PI, 0, true);
  handle.closePath();
  const bag = [round(0, 0, 2.1, 1.85, 0.2), handle];

  const cup = [poly([[0.2, 0.25], [1.5, 0.25], [1.72, 1.75], [-0.02, 1.75]]), ring(1.78, 1.05, 0.42, 0.22), round(-0.38, 0, 2.3, 0.24, 0.12)];

  const basket = poly([[0.42, 0.6], [2.2, 0.6], [2.5, 1.7], [0.12, 1.7]]);
  [0.6, 1.05, 1.5, 1.95].forEach((x) => {
    const h = new THREE.Path();
    h.moveTo(x, 0.8); h.lineTo(x, 1.5); h.lineTo(x + 0.2, 1.5); h.lineTo(x + 0.2, 0.8); h.closePath();
    basket.holes.push(h);
  });
  const cart = [basket, poly([[0.1, 1.6], [0.32, 1.7], [-0.05, 2.2], [-0.45, 2.2], [-0.45, 1.98], [-0.16, 1.98]]), round(0.45, 0.44, 1.75, 0.16, 0.06), ring(0.7, 0.2, 0.2, 0.07), ring(1.95, 0.2, 0.2, 0.07)];

  const seal = new THREE.Shape();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 0.98 : 1.24;
    if (i) seal.lineTo(Math.cos(a) * r, Math.sin(a) * r); else seal.moveTo(r, 0);
  }
  seal.closePath();

  const megaphone = [poly([[0, 0.55], [0.55, 0.55], [0.55, 1.15], [0, 1.15]]), poly([[0.5, 0.5], [2.05, -0.1], [2.05, 1.8], [0.5, 1.2]]), round(1.95, -0.22, 0.26, 2.14, 0.12), poly([[0.7, 0.5], [1.02, 0.38], [0.92, -0.08], [0.62, -0.08]])];

  const opts = { depth: 0.34, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 2, curveSegments: 10 };
  const geos = [tag, percent, shirt, bag, cup, cart, seal, megaphone].map((s) => new THREE.ExtrudeGeometry(s, opts));

  const p = [[0, -1.4], [0.34, -1.4], [0.38, -1.36], [0.38, -1.14], [0.51, -1.14], [0.55, -1.1], [0.55, -0.76], [0.51, -0.72], [0.11, -0.72]];
  const profile = [...p, ...p.slice().reverse().map(([x, y]) => [x, -y])].map(([x, y]) => new THREE.Vector2(x, y));
  const dumbbell = new THREE.LatheGeometry(profile, 24);
  dumbbell.rotateZ(Math.PI / 2);
  geos.push(dumbbell);

  const size = new THREE.Vector3();
  return geos.map((g) => {
    g.computeBoundingBox();
    g.boundingBox.getSize(size);
    const k = 2.5 / Math.max(size.x, size.y);
    g.center();
    g.scale(k, k, k);
    return g;
  });
}

// Toldo curvo por franjas, con faldón de ondas al frente.
function awningGeometry(width, depth, drop, n) {
  const segT = 12;
  const colored = [];
  const white = [];
  const w = width / n;
  for (let i = 0; i < n; i++) {
    const x0 = -width / 2 + i * w;
    const x1 = x0 + w;
    const pos = [];
    const idx = [];
    for (let j = 0; j <= segT; j++) {
      const a = (j / segT) * (Math.PI / 2);
      const z = depth * Math.sin(a);
      const y = -drop * (1 - Math.cos(a));
      pos.push(x0, y, z, x1, y, z);
    }
    for (let j = 0; j < segT; j++) {
      const a = j * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const canopy = new THREE.BufferGeometry();
    canopy.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    canopy.setIndex(idx);
    canopy.computeVertexNormals();
    const sh = new THREE.Shape();
    const vh = 0.11;
    sh.moveTo(x0, 0);
    sh.lineTo(x1, 0);
    sh.lineTo(x1, -vh);
    sh.absarc((x0 + x1) / 2, -vh, w / 2, 0, Math.PI, true);
    sh.lineTo(x0, 0);
    const val = new THREE.ShapeGeometry(sh, 10);
    val.deleteAttribute('uv');
    val.translate(0, -drop, depth);
    (i % 2 ? white : colored).push(canopy, val);
  }
  return { colored: mergeGeometries(colored), white: mergeGeometries(white) };
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Interior de cada vitrina, dibujado según el tipo de negocio.
function interiorTexture(kind, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 368;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, c.height);
  grd.addColorStop(0, '#ffe2b0');
  grd.addColorStop(1, '#d99a52');
  g.fillStyle = grd;
  g.fillRect(0, 0, c.width, c.height);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const tints = ['#ff6a1a', '#2bea7a', '#4f6bff', '#ffc21a', '#ff2d55', '#12b5a0', '#f2f5ef'];
  if (kind === 'super') {
    for (let row = 0; row < 3; row++) {
      const y = 70 + row * 100;
      g.fillStyle = '#6b4a2a';
      g.fillRect(20, y + 62, 472, 10);
      for (let x = 26; x < 480;) {
        const w = rnd(22, 40);
        const h = rnd(34, 60);
        g.fillStyle = tints[(Math.random() * tints.length) | 0];
        g.fillRect(x, y + 62 - h, w - 4, h);
        x += w;
      }
    }
  } else if (kind === 'ropa') {
    g.fillStyle = '#5a4634';
    g.fillRect(30, 70, 452, 8);
    const cols = ['#12b5a0', '#111', '#f2f5ef', '#0d6f63', '#e0337a'];
    for (let i = 0; i < 9; i++) {
      const x = 46 + i * 50;
      g.fillStyle = cols[i % cols.length];
      rr(g, x, 84, 40, rnd(120, 190), 10);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(0, 300, 512, 68);
  } else if (kind === 'cafe') {
    for (let i = 0; i < 4; i++) {
      const x = 70 + i * 120;
      g.strokeStyle = '#4a3020';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 70); g.stroke();
      g.fillStyle = '#fff3c4';
      g.beginPath(); g.arc(x, 86, 22, Math.PI, 0); g.fill();
    }
    g.fillStyle = '#5b3a24';
    g.fillRect(0, 250, 512, 118);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? '#f2f5ef' : '#ffc21a';
      rr(g, 40 + i * 76, 214, 34, 36, 6);
      g.fill();
    }
  } else if (kind === 'gym') {
    g.fillStyle = '#2a2e35';
    g.fillRect(0, 0, 512, 368);
    g.fillStyle = '#ff2d55';
    g.fillRect(0, 40, 512, 10);
    for (let i = 0; i < 3; i++) {
      const y = 120 + i * 80;
      g.fillStyle = '#9aa3ad';
      g.fillRect(90, y + 12, 330, 10);
      g.fillStyle = '#111';
      g.fillRect(70, y, 30, 34);
      g.fillRect(410, y, 30, 34);
    }
  } else if (kind === 'industria') {
    g.fillStyle = '#c8d3e6';
    g.fillRect(0, 0, 512, 368);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? '#4f6bff' : '#8a9bb5';
      g.fillRect(30 + i * 96, 170 - (i % 3) * 30, 78, 200);
    }
    g.fillStyle = '#ffc21a';
    g.fillRect(0, 330, 512, 14);
  } else {
    g.fillStyle = '#06703f';
    g.fillRect(0, 0, 512, 368);
    g.fillStyle = 'rgba(43,234,122,.35)';
    for (let i = 0; i < 26; i++) {
      const h = 30 + Math.abs(Math.sin(i * 0.7)) * 180;
      rr(g, 24 + i * 18.5, 300 - h, 10, h, 5);
      g.fill();
    }
    g.fillStyle = '#f2f5ef';
    rr(g, 166, 40, 180, 54, 27);
    g.fill();
    g.fillStyle = '#06703f';
    g.font = '700 30px Bricolage, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('AL AIRE', 256, 68);
  }
  g.fillStyle = color;
  g.globalAlpha = 0.12;
  g.fillRect(0, 0, 512, 368);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function signTexture(def) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d');
  if (def.kind === 'aplaudify') {
    g.fillStyle = '#06703f';
    g.fillRect(0, 0, c.width, c.height);
    try {
      const img = new Image();
      img.src = 'assets/img/logo/aplaudify-logo-blanco.svg';
      await img.decode();
      const h = 110;
      const w = h * (3068 / 722);
      g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2 + 2, w, h);
    } catch {
      g.fillStyle = '#fff';
      g.font = '760 96px Bricolage, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Aplaudify', 512, 84);
    }
  } else {
    g.fillStyle = '#121519';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = def.color;
    g.beginPath();
    g.arc(86, 80, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2f5ef';
    g.font = '760 92px Bricolage, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(def.name, 540, 86);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class World {
  constructor(canvas, { audio, mobile = false, reduced = false } = {}) {
    this.canvas = canvas;
    this.audio = audio;
    this.mobile = mobile;
    this.reduced = reduced;
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerSmooth = new THREE.Vector2(0, 0);
    this.clock = new THREE.Clock();
    this.keys = [];
    this.power = 0;
    this.powerTarget = 0;
    this.sel = 2;
    this.focus = mobile ? 1 : 0;
    this.focusTarget = this.focus;
    this.introT = -1;
    this.kick = 0;
    this.ready = false;
  }

  async init(parts) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.mobile, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;

    const scene = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color('#050807');
    scene.background = this.bg;
    scene.fog = new THREE.Fog(this.bg, 15, 44);
    this.camera = new THREE.PerspectiveCamera(this.mobile ? 46 : 38, 1, 0.1, 160);
    this.camPos = new THREE.Vector3(0, 2, 34);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.camRoll = 0;
    // Cámara "de destino" (la del scroll, sin inercia ni intro) para ubicar el logo.
    this.vcam = this.camera.clone();
    this.tgPos = new THREE.Vector3();
    this.tgLook = new THREE.Vector3();
    this.tgRoll = 0;
    this.ray = new THREE.Raycaster();
    this.zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.stageEl = document.getElementById('heroStage');

    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    this.hemi = new THREE.HemisphereLight('#d8f5e6', '#08130d', 0.9);
    scene.add(this.hemi);
    this.key = new THREE.DirectionalLight('#ffffff', 2.4);
    this.key.position.set(-5, 6, 9);
    scene.add(this.key);
    this.rim = new THREE.PointLight('#2bea7a', 70, 16, 2);
    scene.add(this.rim);
    this.cursorLight = new THREE.PointLight('#ffffff', 26, 12, 2);
    scene.add(this.cursorLight);

    await breathe();
    this.buildHero(parts);
    await breathe();
    this.buildRings();
    this.buildBurst();
    await breathe();
    await this.buildStreet();
    await breathe();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    }, { passive: true });
    this.onResize();
    this.applyCamera(0);
    await breathe();
    r.compile(scene, this.camera);
    this.ready = true;
    this.tick = this.tick.bind(this);
    r.setAnimationLoop(this.tick);
  }

  // ---------- logo en 3D ----------
  buildHero(parts) {
    const loader = new SVGLoader();
    const ids = ['stripe0', 'stripe1', 'stripe2', 'scallop0', 'scallop1', 'scallop2', 'flag0', 'flag1', 'flag2'];
    const front = new THREE.MeshPhysicalMaterial({ color: '#f5f8f3', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.16 });
    const side = new THREE.MeshPhysicalMaterial({ color: '#0d9a55', roughness: 0.38, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.25, emissive: '#06401f', emissiveIntensity: 0.55 });
    this.iconMats = { front, side };
    const S = 3.7 / 845;
    const cx = (384 + 1229) / 2;
    const cy = (1212 + 1862) / 2;
    const group = (this.icon = new THREE.Group());
    const inner = new THREE.Group();
    group.add(inner);
    this.iconParts = [];
    for (const id of ids) {
      const part = parts.find((p) => p.id === id);
      if (!part) continue;
      const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${part.d}"/></svg>`);
      const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
      const geo = new THREE.ExtrudeGeometry(shapes, { depth: 74, bevelEnabled: true, bevelThickness: 16, bevelSize: 10, bevelSegments: 4, curveSegments: 12 });
      geo.translate(-cx, -cy, -37);
      geo.scale(S, S, S);
      geo.rotateX(Math.PI);
      geo.computeBoundingBox();
      const center = new THREE.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -center.y, -center.z);
      const mesh = new THREE.Mesh(geo, [front, side]);
      mesh.position.copy(center);
      mesh.userData.home = center.clone();
      const dir = center.clone().setZ(0).normalize();
      mesh.userData.from = new THREE.Vector3(dir.x * 7 + (Math.random() - 0.5) * 3, dir.y * 7 + (Math.random() - 0.5) * 3, 6 + Math.random() * 6);
      mesh.userData.spin = new THREE.Euler((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
      inner.add(mesh);
      this.iconParts.push(mesh);
    }
    this.iconInner = inner;
    this.scene.add(group);

    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(43,234,122,0.9)'), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.halo.scale.set(10, 10, 1);
    this.scene.add(this.halo);
    this.heroAnchor = new THREE.Vector3();
    this.heroScale = 1;
    this.iconRot = new THREE.Vector2();
    this.iconSpin = 0;
  }

  buildRings() {
    this.rings = [];
    const geo = new THREE.TorusGeometry(1, 0.012, 6, 160);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#2bea7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.userData.p = i / 6;
      this.scene.add(m);
      this.rings.push(m);
    }
  }

  // Íconos de negocio que salen disparados al darle clic al logo.
  buildBurst() {
    const n = 16;
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.15, emissive: '#111', emissiveIntensity: 0.3 });
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const col = new THREE.Color();
    this.burstMeshes = businessIcons().map((geo, k) => {
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      for (let i = 0; i < n; i++) {
        m.setMatrixAt(i, zero);
        m.setColorAt(i, col.set(PALETTE[4 + ((i * 7 + k * 3) % (PALETTE.length - 4))]));
      }
      m.instanceColor.needsUpdate = true;
      this.scene.add(m);
      return m;
    });
    this.bits = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < this.burstMeshes.length; k++) this.bits.push({ k, i, life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), phase: 0, spin: 0, s: 0.1 });
    }
  }

  spawn(at, count = 22, power = 1) {
    let made = 0;
    const start = (Math.random() * this.bits.length) | 0;
    for (let j = 0; j < this.bits.length && made < count; j++) {
      const b = this.bits[(start + j * 7) % this.bits.length];
      if (b.life > 0) continue;
      b.max = b.life = 1.6 + Math.random() * 0.9;
      b.p.copy(at);
      const a = Math.random() * Math.PI * 2;
      const sp = (1.8 + Math.random() * 3) * power;
      b.v.set(Math.cos(a) * sp, 2 + Math.random() * 3.6 * power, (Math.random() - 0.1) * 2.4);
      b.r.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2);
      b.phase = Math.random() * 6;
      b.spin = (Math.random() - 0.5) * 3;
      b.s = 0.085 + Math.random() * 0.06;
      made++;
    }
  }

  // ---------- la calle ----------
  async buildStreet() {
    const street = (this.street = new THREE.Group());
    street.position.y = STREET_Y;
    this.scene.add(street);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshStandardMaterial({ color: '#0c0f13', roughness: 0.92 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -4;
    street.add(ground);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(70, 0.12, 3.6), new THREE.MeshStandardMaterial({ color: '#1a1e24', roughness: 0.85 }));
    walk.position.set(0, 0.06, 1.3);
    street.add(walk);

    const W = 2.7;
    const H = 2.55;
    const D = 1.9;
    const baseGeo = new RoundedBoxGeometry(W + 0.35, 0.18, D + 1.1, 2, 0.05);
    const bodyGeo = new RoundedBoxGeometry(W, H, D, 2, 0.07);
    const corniceGeo = new THREE.BoxGeometry(W + 0.18, 0.16, D + 0.18);
    const winGeo = new THREE.PlaneGeometry(1.5, 1.08);
    const frameGeo = new THREE.PlaneGeometry(1.64, 1.22);
    const doorGeo = new THREE.PlaneGeometry(0.62, 1.32);
    const signGeo = new THREE.BoxGeometry(W * 0.82, 0.42, 0.07);
    const poolGeo = new THREE.PlaneGeometry(3.2, 2.4);
    const hitGeo = new THREE.BoxGeometry(W + 0.4, H + 0.8, D + 1.4);
    const aw = awningGeometry(W - 0.04, 0.8, 0.52, 9);
    const dark = new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.7 });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1b1e22', roughness: 0.5, metalness: 0.4 });
    const baseMat = new THREE.MeshStandardMaterial({ color: '#23282e', roughness: 0.8 });
    const awWhite = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.62, side: THREE.DoubleSide });
    const poolTex = radialTexture('rgba(255,214,150,1)');
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    this.stores = [];
    for (let i = 0; i < STORES.length; i++) {
      await breathe();
      const def = STORES[i];
      const g = new THREE.Group();
      const x = (i - 2.5) * 3.08;
      const z = -Math.abs(i - 2.5) * 0.42;
      g.position.set(x, 0, z);
      g.rotation.y = -(i - 2.5) * 0.045;
      street.add(g);

      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, 0.09, 0.45);
      g.add(base);
      const wallMat = new THREE.MeshStandardMaterial({ color: def.wall, roughness: 0.86 });
      const body = new THREE.Mesh(bodyGeo, wallMat);
      body.position.set(0, 0.18 + H / 2, 0);
      g.add(body);
      const cornice = new THREE.Mesh(corniceGeo, dark);
      cornice.position.set(0, 0.18 + H + 0.02, 0);
      g.add(cornice);

      const tex = interiorTexture(def.kind, def.color);
      const winMat = new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0, roughness: 0.25, metalness: 0.1, color: '#5d5d5d' });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(-0.42, 0.18 + 1.08, D / 2 + 0.004);
      g.add(frame);
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(-0.42, 0.18 + 1.08, D / 2 + 0.01);
      g.add(win);
      const doorMat = new THREE.MeshStandardMaterial({ color: '#262a30', roughness: 0.35, metalness: 0.3, emissive: '#ffcf8a', emissiveIntensity: 0 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0.86, 0.18 + 0.66, D / 2 + 0.01);
      g.add(door);

      const awColorMat = new THREE.MeshStandardMaterial({ color: '#555b61', roughness: 0.6, side: THREE.DoubleSide, emissive: def.color, emissiveIntensity: 0 });
      const awG = new THREE.Group();
      awG.position.set(0, 0.18 + 2.04, D / 2);
      awG.add(new THREE.Mesh(aw.colored, awColorMat), new THREE.Mesh(aw.white, awWhite));
      g.add(awG);

      const sTex = await signTexture(def);
      const signMat = new THREE.MeshStandardMaterial({ map: sTex, emissive: '#ffffff', emissiveMap: sTex, emissiveIntensity: 0, roughness: 0.4, color: '#6a6a6a' });
      const sign = new THREE.Mesh(signGeo, [dark, dark, dark, dark, signMat, dark]);
      sign.position.set(0, 0.18 + 2.36, D / 2 + 0.05);
      g.add(sign);

      const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, color: def.kind === 'aplaudify' ? '#7dffb3' : '#ffd29a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, 0.19, D / 2 + 1.3);
      g.add(pool);

      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.set(0, (H + 0.8) / 2, 0.3);
      hit.userData.index = i;
      g.add(hit);

      this.stores.push({ def, group: g, x, z, winMat, doorMat, signMat, awColorMat, wallMat, pool, hit, color: new THREE.Color(def.color), wall: new THREE.Color(def.wall), lit: 0 });
    }
    this.hits = this.stores.map((s) => s.hit);
    this.gray = new THREE.Color('#4b5157');
    this.wallOff = new THREE.Color('#6f747a');

    this.streetSpot = new THREE.SpotLight('#ffe2b8', 0, 30, 0.55, 0.7, 1.2);
    this.streetSpot.position.set(0, STREET_Y + 8, 7);
    this.streetSpot.target.position.set(0, STREET_Y + 1, 0);
    this.scene.add(this.streetSpot, this.streetSpot.target);
    this.fill = new THREE.SpotLight('#cfe8ff', 0, 40, 0.9, 0.9, 1.1);
    this.fill.position.set(0, STREET_Y + 10, 16);
    this.fill.target.position.set(0, STREET_Y + 1, 0);
    this.scene.add(this.fill, this.fill.target);

    this.storeRings = [];
    const rg = new THREE.TorusGeometry(1, 0.016, 6, 120);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.userData.p = i / 4;
      this.scene.add(m);
      this.storeRings.push(m);
    }
  }

  // ---------- API pública ----------
  layout() {
    const els = [...document.querySelectorAll('[data-shot]')];
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    let last = '#050807';
    const keys = els.map((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const at = Math.min(Math.max(top + r.height / 2 - window.innerHeight / 2, 0), max);
      const world = el.dataset.world || last;
      last = world;
      return { at, shot: el.dataset.shot, color: new THREE.Color(world) };
    }).sort((a, b) => a.at - b.at);
    for (let i = 1; i < keys.length; i++) if (keys[i].at <= keys[i - 1].at) keys[i].at = keys[i - 1].at + 1;
    this.keys = keys;
    this.streetAt = keys.find((k) => k.shot === 'street')?.at;
  }

  setPower(on) { this.powerTarget = on ? 1 : 0; }

  select(i) {
    this.sel = i;
    this.focusTarget = 1;
  }

  pickStore(ndc) {
    if (!this.ready) return -1;
    this.ray = this.ray || new THREE.Raycaster();
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    return hit ? hit.object.userData.index : -1;
  }

  burst(ndc) {
    if (!this.ready) return;
    this.ray = this.ray || new THREE.Raycaster();
    this.ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(plane, p)) p.copy(this.icon.position);
    this.spawn(p, 22, 1);
    this.kick = 1;
  }

  // El logo vive en su espacio de la página (#heroStage): se ubica con la cámara
  // de destino del scroll, así acompaña al contenido en cualquier pantalla y
  // nunca queda encima de los textos ni de los botones.
  placeHero() {
    const el = this.stageEl;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const h = window.innerHeight;
    if (!r.width || !r.height || r.bottom < -h || r.top > 2 * h) return;
    const vc = this.vcam;
    vc.position.copy(this.tgPos);
    vc.up.set(Math.sin(this.tgRoll), Math.cos(this.tgRoll), 0);
    vc.lookAt(this.tgLook);
    vc.updateMatrixWorld();
    const ndc = this._ndc || (this._ndc = new THREE.Vector2());
    ndc.set(((r.left + r.width / 2) / window.innerWidth) * 2 - 1, -(((r.top + r.height / 2) / h) * 2 - 1));
    this.ray.setFromCamera(ndc, vc);
    if (!this.ray.ray.intersectPlane(this.zPlane, this.heroAnchor)) return;
    const dir = vc.getWorldDirection(this._dir || (this._dir = new THREE.Vector3()));
    const depth = (this._rel || (this._rel = new THREE.Vector3())).subVectors(this.heroAnchor, vc.position).dot(dir);
    const perPx = (2 * depth * Math.tan(THREE.MathUtils.degToRad(vc.fov / 2))) / h;
    const fit = r.width > 600 ? 0.64 : 0.74;
    this.heroScale = (Math.min(r.width, r.height * 1.25) * fit * perPx) / 3.7;
  }

  intro() {
    this.introT = 0;
    this.camLook.copy(this.target(window.scrollY).look);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 46 : 38;
    this.camera.updateProjectionMatrix();
    this.vcam.fov = this.camera.fov;
    this.vcam.aspect = this.camera.aspect;
    this.vcam.updateProjectionMatrix();
    const dist = 10.5;
    const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const vw = vh * this.camera.aspect;
    if (w / h > 1.05) {
      this.heroAnchor.set(vw * 0.235, -0.15, 0);
      this.heroScale = Math.min(1.08, vw / 13);
    } else {
      this.heroAnchor.set(0, -vh * 0.29, 0);
      this.heroScale = Math.min(0.8, vw / 4.9);
    }
    this.focusTarget = this.focus = w < 760 ? 1 : this.focusTarget;
    this.layout();
  }

  shot(name) {
    if (name === 'street') return this.streetShot();
    return SHOTS[name] || SHOTS.hero;
  }

  streetShot() {
    const s = this.stores[this.sel];
    const k = this.mobile || window.innerWidth < 760 ? 1 : smooth(clamp01(this.focus)) * (0.35 + 0.65 * this.power);
    const wide = { pos: [0, STREET_Y + 3.5, 15.5], look: [0, STREET_Y + 2.15, 0] };
    const tall = this.camera.aspect < 0.8;
    const close = tall
      ? { pos: [s.x, STREET_Y + 2.9, s.z + 11.5], look: [s.x, STREET_Y + 1.25, s.z] }
      : { pos: [s.x * 0.94, STREET_Y + 2.35, s.z + 7.4], look: [s.x, STREET_Y + 1.5, s.z] };
    this._ss = this._ss || { pos: [0, 0, 0], look: [0, 0, 0], roll: 0 };
    for (let i = 0; i < 3; i++) {
      this._ss.pos[i] = wide.pos[i] + (close.pos[i] - wide.pos[i]) * k;
      this._ss.look[i] = wide.look[i] + (close.look[i] - wide.look[i]) * k;
    }
    // Las casas acompañan al scroll como cualquier parte de la página: entran
    // desde abajo con su sección y se van con ella (no aparecen de golpe).
    if (this.streetAt != null && this._y != null) {
      const depth = this._ss.pos[2] - this._ss.look[2];
      const perPx = (2 * depth * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / window.innerHeight;
      const off = -(this._y - this.streetAt) * perPx;
      this._ss.pos[1] += off;
      this._ss.look[1] += off;
    }
    return this._ss;
  }

  // Calcula a dónde debe ir la cámara según el scroll.
  target(y) {
    this._y = y;
    const keys = this.keys;
    if (!keys.length) return { pos: SHOTS.hero.pos, look: SHOTS.hero.look, roll: 0, color: this.bg, t: 0, i: 0 };
    let i = 0;
    while (i < keys.length - 2 && y >= keys[i + 1].at) i++;
    const a = keys[i];
    const b = keys[i + 1] || a;
    const t = smooth(clamp01((y - a.at) / Math.max(1, b.at - a.at)));
    const sa = this.shot(a.shot);
    const sb = this.shot(b.shot);
    const out = (this._t = this._t || { pos: new THREE.Vector3(), look: new THREE.Vector3(), roll: 0, color: new THREE.Color() });
    out.pos.set(sa.pos[0] + (sb.pos[0] - sa.pos[0]) * t, sa.pos[1] + (sb.pos[1] - sa.pos[1]) * t, sa.pos[2] + (sb.pos[2] - sa.pos[2]) * t);
    out.look.set(sa.look[0] + (sb.look[0] - sa.look[0]) * t, sa.look[1] + (sb.look[1] - sa.look[1]) * t, sa.look[2] + (sb.look[2] - sa.look[2]) * t);
    const arc = this.reduced ? 0 : Math.sin(t * Math.PI);
    out.pos.z += arc * 2.6;
    out.pos.x += arc * (i % 2 ? 1.6 : -1.6);
    out.roll = (sa.roll || 0) + ((sb.roll || 0) - (sa.roll || 0)) * t + arc * (i % 2 ? 0.05 : -0.05);
    out.color.copy(a.color).lerp(b.color, t);
    return out;
  }

  applyCamera(dt) {
    const y = window.scrollY;
    const tg = this.target(y);
    this.tgPos.copy(tg.pos);
    this.tgLook.copy(tg.look);
    this.tgRoll = tg.roll;
    const k = dt ? damp(dt, 3.4) : 1;
    const px = this.pointerSmooth.x;
    const py = this.pointerSmooth.y;
    const want = this._want || (this._want = new THREE.Vector3());
    want.copy(tg.pos);
    want.x += px * 0.45;
    want.y += py * 0.28;
    if (this.introT >= 0 && this.introT < 1) {
      const e = 1 - Math.pow(1 - this.introT, 3);
      want.lerpVectors(new THREE.Vector3(0, 1.6, 34), want, e);
    } else if (this.introT < 0) {
      want.set(0, 1.6, 34);
    }
    this.camPos.lerp(want, this.introT >= 0 && this.introT < 1 ? 1 : k);
    this.camLook.lerp(tg.look, k);
    this.camRoll += (tg.roll - this.camRoll) * k;
    this.camera.position.copy(this.camPos);
    this.camera.up.set(Math.sin(this.camRoll), Math.cos(this.camRoll), 0);
    this.camera.lookAt(this.camLook);
    this.bg.lerp(tg.color, dt ? damp(dt, 4) : 1);
    this.scene.fog.color.copy(this.bg);
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    const time = this.clock.elapsedTime;
    const audio = this.audio;
    audio?.sample();
    const bass = audio ? audio.bass : 0;
    const level = audio ? audio.level : 0;
    this.pointerSmooth.lerp(this.pointer, damp(dt, 4));
    if (this.introT >= 0 && this.introT < 1) this.introT = Math.min(1, this.introT + dt / 2.6);
    this.focus += (this.focusTarget - this.focus) * damp(dt, 2.2);
    this.power += (this.powerTarget - this.power) * damp(dt, 1.4);
    this.kick *= Math.exp(-dt * 3);

    this.applyCamera(dt);
    const camY = this.camPos.y;

    // Logo
    const assemble = this.introT < 0 ? 0 : smooth(clamp01(this.introT * 1.25));
    const ip = this.iconParts;
    for (let i = 0; i < ip.length; i++) {
      const m = ip[i];
      const local = smooth(clamp01(assemble * 1.6 - i * 0.07));
      const home = m.userData.home;
      const from = m.userData.from;
      m.position.set(from.x + (home.x - from.x) * local, from.y + (home.y - from.y) * local, from.z + (home.z - from.z) * local);
      const sp = m.userData.spin;
      m.rotation.set(sp.x * (1 - local), sp.y * (1 - local), sp.z * (1 - local));
    }
    if (camY > -20) this.placeHero();
    const ic = this.icon;
    this.iconRot.x += (-this.pointerSmooth.y * 0.32 - this.iconRot.x) * damp(dt, 5);
    this.iconRot.y += (this.pointerSmooth.x * 0.55 - this.iconRot.y) * damp(dt, 5);
    this.iconSpin += dt * (0.25 + this.kick * 6);
    ic.position.set(this.heroAnchor.x, this.heroAnchor.y + Math.sin(time * 0.9) * 0.12, this.heroAnchor.z);
    const s = this.heroScale * (1 + bass * 0.06 + this.kick * 0.12);
    ic.scale.setScalar(s);
    ic.rotation.set(this.iconRot.x + Math.sin(time * 0.6) * 0.05, this.iconRot.y + Math.sin(this.iconSpin) * 0.32 + this.kick * Math.sin(time * 18) * 0.15, Math.sin(time * 0.5) * 0.03);
    this.halo.position.set(ic.position.x, ic.position.y, -1.5);
    this.halo.material.opacity = (0.16 + bass * 0.35 + this.kick * 0.2) * assemble;
    this.rim.position.set(ic.position.x + 2.6, ic.position.y + 1.8, -2.6);
    this.rim.intensity = 60 + bass * 120;
    const cl = this._cl || (this._cl = new THREE.Vector3());
    cl.set(this.pointerSmooth.x, this.pointerSmooth.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize().multiplyScalar(6.5).add(this.camera.position);
    this.cursorLight.position.copy(cl);
    this.iconMats.side.emissiveIntensity = 0.45 + bass * 1.4 + this.kick;

    // Anillos de sonido
    for (const r of this.rings) {
      r.userData.p = (r.userData.p + dt * (0.16 + bass * 0.5 + this.kick * 0.8)) % 1;
      const p = r.userData.p;
      const sc = (1.5 + p * 4.6) * this.heroScale;
      r.scale.set(sc, sc, sc);
      r.position.set(ic.position.x, ic.position.y, -0.6);
      r.rotation.set(this.iconRot.x * 0.5, this.iconRot.y * 0.5, 0);
      r.material.opacity = Math.pow(1 - p, 2) * (0.28 + level * 1.2 + this.kick * 0.4) * assemble;
    }

    // Íconos que salen del logo: estallan, flotan hacia arriba y se desvanecen
    const m4 = this._m4 || (this._m4 = new THREE.Matrix4());
    const q = this._q || (this._q = new THREE.Quaternion());
    const e = this._e || (this._e = new THREE.Euler());
    const scl = this._s || (this._s = new THREE.Vector3());
    let alive = false;
    for (let j = 0; j < this.bits.length; j++) {
      const b = this.bits[j];
      if (b.life <= 0) continue;
      alive = true;
      b.life -= dt;
      b.v.y -= 2.4 * dt;
      b.v.multiplyScalar(Math.exp(-dt * 1.1));
      b.p.addScaledVector(b.v, dt);
      b.p.x += Math.sin(time * 3 + b.phase) * 0.004;
      b.r.y += b.spin * dt;
      e.set(b.r.x, b.r.y, b.r.z + Math.sin(time * 4 + b.phase) * 0.25);
      q.setFromEuler(e);
      const age = 1 - b.life / b.max;
      const k = b.life <= 0 ? 0 : b.s * Math.min(1, age * 7) * (1 + Math.sin(age * 9) * 0.06) * Math.min(1, b.life * 1.8);
      scl.set(k, k, k);
      m4.compose(b.p, q, scl);
      this.burstMeshes[b.k].setMatrixAt(b.i, m4);
    }
    if (alive || this._burstWasAlive) this.burstMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    this._burstWasAlive = alive;

    // Calle: solo se dibuja cuando la cámara está cerca (nunca detrás del inicio)
    this.street.visible = camY < -14;
    // Calle: luces según encendido y local elegido
    const w = clamp01(1 - Math.abs(camY - (STREET_Y + 2.5)) / 16);
    this.key.intensity = 2.4 * (1 - w) + (0.22 + 0.55 * this.power) * w;
    this.hemi.intensity = 0.9 * (1 - w) + (0.16 + 0.34 * this.power) * w;
    this.fill.intensity = this.power * 38 * w;
    const sel = this.stores[this.sel];
    this.streetSpot.position.x += (sel.x - this.streetSpot.position.x) * damp(dt, 3);
    this.streetSpot.target.position.set(this.streetSpot.position.x, STREET_Y + 1, sel.z);
    this.streetSpot.intensity = this.power * 70 * w;
    for (let i = 0; i < this.stores.length; i++) {
      const s2 = this.stores[i];
      const lit = clamp01(this.power * 2.2 - Math.abs(i - 2.5) * 0.28);
      s2.lit = lit;
      const isSel = i === this.sel ? 1 : 0;
      s2.winMat.emissiveIntensity = lit * (0.85 + isSel * 0.5 + (isSel ? level * 1.2 : 0));
      s2.doorMat.emissiveIntensity = lit * 0.25;
      s2.signMat.emissiveIntensity = lit * (0.75 + isSel * 0.4);
      s2.awColorMat.color.copy(this.gray).lerp(s2.color, 0.18 + lit * 0.82);
      s2.awColorMat.emissiveIntensity = lit * 0.22;
      s2.wallMat.color.copy(this.wallOff).lerp(s2.wall, 0.3 + lit * 0.7);
      s2.pool.material.opacity = lit * (0.22 + isSel * 0.3);
      s2.group.position.y = isSel ? Math.sin(time * 2.2) * 0.012 * this.power : 0;
    }
    const ringOn = this.power * w;
    for (const r of this.storeRings) {
      r.userData.p = (r.userData.p + dt * (0.3 + bass * 0.8)) % 1;
      const p = r.userData.p;
      const sc = 0.6 + p * 3.2;
      r.scale.set(sc, sc, sc);
      r.position.set(sel.x, STREET_Y + 1.35, sel.z + 1.4);
      r.material.color.copy(sel.color);
      r.material.opacity = Math.pow(1 - p, 2) * 0.5 * ringOn * (0.5 + level * 1.5);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
