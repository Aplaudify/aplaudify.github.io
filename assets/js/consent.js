// Aviso de cookies. Hoy la web solo guarda lo necesario (sonido, esta elección
// y el aviso de pago en proceso). Si algún día se agrega analítica, sus scripts
// van como <script type="text/plain" data-consent="analitica"> y solo se
// activan cuando la persona acepta.
const KEY = 'aplaudify-consentimiento';
const YEAR = 365 * 24 * 3600 * 1000;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && Date.now() - v.ts < YEAR) return v;
  } catch { /* sin almacenamiento */ }
  return null;
}

function apply(choice) {
  window.aplaudifyConsent = { analitica: !!choice?.analitica };
  if (!choice?.analitica) return;
  document.querySelectorAll('script[type="text/plain"][data-consent="analitica"]').forEach((old) => {
    const s = document.createElement('script');
    [...old.attributes].forEach((a) => { if (a.name !== 'type') s.setAttribute(a.name, a.value); });
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

export function initConsent() {
  let banner = null;
  const close = () => {
    if (!banner) return;
    banner.classList.remove('is-on');
    const b = banner;
    banner = null;
    setTimeout(() => b.remove(), 400);
  };
  const save = (analitica) => {
    const choice = { v: 1, analitica, ts: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* sin almacenamiento */ }
    apply(choice);
    close();
  };
  const show = () => {
    if (banner) return;
    banner = document.createElement('section');
    banner.className = 'consent';
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML = `
      <p><b>Cookies</b> Usamos solo lo necesario para que la página funcione, como recordar si activaste el sonido. No usamos cookies de publicidad ni de analítica. <a href="cookies.html">Política de cookies</a></p>
      <div class="consent__btns">
        <button class="btn btn--quiet btn--sm" type="button" data-c="0">Solo necesarias</button>
        <button class="btn btn--primary btn--sm" type="button" data-c="1">Aceptar</button>
      </div>`;
    banner.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (b) save(b.dataset.c === '1');
    });
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner?.classList.add('is-on')));
  };

  const saved = read();
  apply(saved);
  document.querySelectorAll('[data-cookies]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(); }));
  if (location.hash === '#cookies') show();
  if (saved) return;
  // Aparece cuando termina la intro, para no tapar los botones de entrada.
  const body = document.body;
  if (!body.classList.contains('is-loading')) { setTimeout(show, 1200); return; }
  const mo = new MutationObserver(() => {
    if (body.classList.contains('is-loading')) return;
    mo.disconnect();
    setTimeout(show, 1600);
  });
  mo.observe(body, { attributes: true, attributeFilter: ['class'] });
}
