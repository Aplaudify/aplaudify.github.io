// Pago en línea de los planes con ePayco (la misma integración de la web
// anterior): se genera un código de un solo uso, la Cloud Function
// epaycoCreateSession arma la sesión de pago y, cuando ePayco confirma el pago
// (webhook del servidor), el código llega al correo del cliente para canjearlo
// en la app, en Configuración → Canjear código.
// Antes de abrir la pasarela, la persona acepta los Términos, la Política de
// reembolsos y la Política de tratamiento de datos.
import { WHATSAPP } from './data.js';

const SESSION_URL = 'https://us-central1-aplaudify-e264b.cloudfunctions.net/epaycoCreateSession';
const CHECKOUT_JS = 'https://checkout.epayco.co/checkout-v2.js';
const DOWNLOAD = 'https://github.com/Aplaudify/aplaudify-releases/releases/latest/download/Aplaudify-Setup.exe';
const PENDING_KEY = 'aplPendingWebCode';
const PLANS = {
  basic: { name: 'Básico', m: 60000, a: 612000 },
  pro: { name: 'Pro', m: 120000, a: 1224000 },
  premium: { name: 'Premium', m: 200000, a: 2040000 },
};
const cop = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;

let scriptP = null;
function loadCheckout() {
  if (window.ePayco) return Promise.resolve();
  if (scriptP) return scriptP;
  scriptP = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_JS;
    s.onload = resolve;
    s.onerror = () => { scriptP = null; reject(new Error('checkout')); };
    document.head.appendChild(s);
  });
  return scriptP;
}

// Sin 0/O/1/I para que no se confundan al escribirlo.
function redeemCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function dialog(html, label) {
  const box = document.createElement('div');
  box.className = 'pay';
  box.innerHTML = `<div class="pay__scrim" data-close></div><div class="pay__panel" role="dialog" aria-modal="true" aria-label="${label}">${html}</div>`;
  const last = document.activeElement;
  const close = () => {
    box.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => box.remove(), 300);
    last?.focus?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  box.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('is-open'));
  return { box, close };
}

function showPending(planLabel) {
  dialog(`
    <p class="pay__eyebrow">Pago en proceso</p>
    <h3 class="pay__title">${planLabel}</h3>
    <p class="pay__text">Si tu pago fue aprobado, ya te enviamos tu código al correo que pusiste al pagar (la primera vez revisa también la carpeta de <b>spam</b>).</p>
    <ol class="pay__steps">
      <li>Abre Aplaudify en tu computador.</li>
      <li>Ve a <b>Configuración → Canjear código</b>.</li>
      <li>Pega el código que te llegó por correo y dale <b>Activar</b>.</li>
    </ol>
    <p class="pay__fine">¿No te llegó nada? Puede que el pago no se haya completado: revisa tu correo en unos minutos o intenta de nuevo.</p>
    <a class="btn btn--quiet pay__btn" href="${DOWNLOAD}">Descargar Aplaudify</a>
    <button class="pay__link" type="button" data-close>Cerrar</button>
  `, 'Pago en proceso');
}

export function createCheckout({ toast }) {
  // Si ePayco recargó la página al terminar, el aviso se muestra igual (30 min).
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) {
      localStorage.removeItem(PENDING_KEY);
      const p = JSON.parse(raw);
      if (p?.code && Date.now() - p.ts < 30 * 60 * 1000) showPending(p.planLabel);
    }
  } catch { /* sin almacenamiento */ }

  async function open(plan, cycle, d) {
    const info = PLANS[plan];
    const planLabel = `Plan ${info.name}${cycle === 'a' ? ' Anual' : ''}`;
    const code = redeemCode();
    const go = d.box.querySelector('[data-go]');
    const err = d.box.querySelector('.pay__error');
    go.disabled = true;
    go.classList.add('is-loading');
    err.hidden = true;
    try {
      await loadCheckout();
      const res = await fetch(SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan, cycle: cycle === 'a' ? 'annual' : 'monthly', source: 'web', code }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error('sin sesión');
      const checkout = window.ePayco.checkout.configure({ sessionId: data.sessionId, type: 'onpage', test: !!data.test });
      // ePayco suele recargar la página entera al terminar: el código se guarda antes.
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ code, planLabel, ts: Date.now() })); } catch { /* sin almacenamiento */ }
      const before = [...document.body.children];
      checkout.setHooks({ onResponse: () => showPending(planLabel), onClosed: () => {} });
      d.close();
      checkout.open();
      // Respaldo por si la ventana de ePayco no se cierra sola.
      setTimeout(() => {
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'pay__force';
        x.textContent = '✕ Cerrar ventana de pago';
        x.onclick = () => { [...document.body.children].forEach((el) => { if (!before.includes(el)) el.remove(); }); };
        document.body.appendChild(x);
      }, 2000);
    } catch {
      go.disabled = false;
      go.classList.remove('is-loading');
      err.hidden = false;
    }
  }

  return function pay(plan, cycle) {
    const info = PLANS[plan];
    if (!info) return;
    const base = cycle === 'a' ? info.a : info.m;
    const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, quiero activar el plan ${info.name} ${cycle === 'a' ? 'anual' : 'mensual'} de Aplaudify.`)}`;
    const d = dialog(`
      <button class="pay__x" type="button" data-close aria-label="Cerrar">×</button>
      <p class="pay__eyebrow">Pagar en línea</p>
      <h3 class="pay__title">Plan ${info.name} <span>${cycle === 'a' ? 'anual' : 'mensual'}</span></h3>
      <dl class="pay__sum">
        <div><dt>Valor del plan</dt><dd>${cop(base)}</dd></div>
        <div><dt>IVA (19%)</dt><dd>${cop(base * 0.19)}</dd></div>
        <div class="is-total"><dt>Total a pagar</dt><dd>${cop(base * 1.19)} <small>COP</small></dd></div>
      </dl>
      <p class="pay__text">Pagas con tarjeta, PSE o Nequi en la pasarela segura de ePayco. Cuando se aprueba el pago te llega un código al correo para activar tu plan en la app.</p>
      <label class="pay__check"><input type="checkbox" data-accept> <span>He leído y acepto los <a href="terminos.html" target="_blank" rel="noopener">Términos y condiciones</a>, la <a href="reembolsos.html" target="_blank" rel="noopener">Política de reembolsos</a> y la <a href="privacidad.html" target="_blank" rel="noopener">Política de tratamiento de datos</a>.</span></label>
      <p class="pay__error" role="alert" hidden>No pudimos conectar con la pasarela de pago. Intenta de nuevo en un momento o paga por WhatsApp.</p>
      <button class="btn btn--primary pay__btn" type="button" data-go disabled>Ir a pagar ${cop(base * 1.19)}</button>
      <a class="pay__link" href="${wa}" target="_blank" rel="noopener">Prefiero pagar por WhatsApp</a>
    `, `Pagar plan ${info.name}`);
    const accept = d.box.querySelector('[data-accept]');
    const go = d.box.querySelector('[data-go]');
    accept.addEventListener('change', () => { go.disabled = !accept.checked; });
    go.addEventListener('click', () => { if (accept.checked) open(plan, cycle, d); });
    d.box.querySelector('.pay__link').addEventListener('click', () => { toast('Te llevamos a WhatsApp para activar tu plan'); d.close(); });
    setTimeout(() => accept.focus(), 60);
  };
}
