/* ACTIA — Cookie consent banner (RGPD / LOPDGDD / Directiva ePrivacy)
   Two-layer banner with granular categories. Choice persisted in
   localStorage under 'actia_consent'. Reopenable via #cookie-settings-link
   or any element with [data-cookie-settings]. */
(function () {
  'use strict';

  const KEY = 'actia_consent';

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Aviso de cookies');
  banner.innerHTML = `
    <div class="cookie-card">
      <div class="cookie-head">
        <span class="cookie-tag">RGPD · ePrivacy · LSSI</span>
        <span class="cookie-id">CONSENT v1.0 · ES</span>
      </div>
      <h4 class="cookie-title">Cookies y datos en este sitio</h4>
      <p class="cookie-body">
        ACTIA usa cookies <strong>técnicas estrictamente necesarias</strong> para que el sitio
        funcione y, con tu consentimiento, cookies <strong>analíticas y de medición</strong>
        para entender cómo se usa la web. Puedes aceptarlas todas, rechazarlas todas o
        configurarlas por categoría. Más información en nuestra
        <a href="#cookies">Política de cookies</a> y
        <a href="#privacy">Política de privacidad</a>.
      </p>

      <div class="cookie-cats" hidden id="cookie-cats">
        <label class="cookie-cat">
          <input type="checkbox" checked disabled data-cat="necessary" />
          <div>
            <span class="cat-name">Necesarias <em>· obligatorias</em></span>
            <span class="cat-desc">Sesión, equilibrado de carga, preferencias de visualización, consentimiento de cookies.</span>
          </div>
        </label>
        <label class="cookie-cat">
          <input type="checkbox" data-cat="analytics" />
          <div>
            <span class="cat-name">Analíticas</span>
            <span class="cat-desc">Medimos páginas vistas, tiempo en página y eventos para mejorar el sitio. IPs anonimizadas.</span>
          </div>
        </label>
        <label class="cookie-cat">
          <input type="checkbox" data-cat="marketing" />
          <div>
            <span class="cat-name">Marketing</span>
            <span class="cat-desc">Atribución de campañas y re-targeting cuando llegas desde anuncios. No usadas si las rechazas.</span>
          </div>
        </label>
      </div>

      <div class="cookie-actions">
        <button class="btn ghost cookie-mini" data-action="reject">Rechazar todas</button>
        <button class="btn ghost cookie-mini" data-action="configure">Configurar</button>
        <button class="btn primary cookie-mini" data-action="accept-all">Aceptar todas</button>
        <button class="btn primary cookie-mini" data-action="save" hidden>Guardar selección</button>
      </div>

      <div class="cookie-meta">
        <span>Responsable: ACTIA Desarrollo, S.L.</span>
        <span>DPO: <a href="mailto:hola@actia.tech">hola@actia.tech</a></span>
      </div>
    </div>
  `;

  function show() {
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('in'));
  }

  function hide() {
    banner.classList.remove('in');
    setTimeout(() => banner.remove(), 320);
  }

  function save(consent) {
    consent.timestamp = new Date().toISOString();
    consent.version = '1.0';
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch (e) {}
  }

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  const saved = getSaved();
  if (!saved) show();

  banner.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'accept-all') {
      save({ necessary: true, analytics: true, marketing: true });
      hide();
    } else if (action === 'reject') {
      save({ necessary: true, analytics: false, marketing: false });
      hide();
    } else if (action === 'configure') {
      banner.querySelector('#cookie-cats').hidden = false;
      banner.querySelector('[data-action="configure"]').hidden = true;
      banner.querySelector('[data-action="accept-all"]').hidden = true;
      banner.querySelector('[data-action="save"]').hidden = false;
    } else if (action === 'save') {
      const cats = {};
      banner.querySelectorAll('input[data-cat]').forEach((i) => {
        cats[i.dataset.cat] = i.checked;
      });
      save(cats);
      hide();
    }
  });

  // Re-open settings on demand
  document.addEventListener('click', (e) => {
    const link = e.target.closest('#cookie-settings-link, [data-cookie-settings]');
    if (!link) return;
    e.preventDefault();
    // Pre-fill the checkboxes from saved state
    const s = getSaved() || {};
    if (!document.body.contains(banner)) document.body.appendChild(banner);
    banner.querySelector('#cookie-cats').hidden = false;
    banner.querySelector('[data-action="configure"]').hidden = true;
    banner.querySelector('[data-action="accept-all"]').hidden = true;
    banner.querySelector('[data-action="save"]').hidden = false;
    banner.querySelectorAll('input[data-cat]').forEach((i) => {
      if (i.disabled) return;
      i.checked = !!s[i.dataset.cat];
    });
    requestAnimationFrame(() => banner.classList.add('in'));
  });
})();
