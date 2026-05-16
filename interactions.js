/* ACTIA — interactions */
(function () {
  'use strict';

  // -------------------------------------------------------
  // Header active nav state on scroll
  // -------------------------------------------------------
  const navLinks = Array.from(document.querySelectorAll('.site-header .nav a'));
  const sectionIds = navLinks.map(a => a.getAttribute('href')).filter(h => h && h.startsWith('#'));
  const sectionEls = sectionIds.map(id => document.querySelector(id)).filter(Boolean);

  const setActiveNav = () => {
    let activeId = sectionIds[0];
    const y = window.scrollY + 140;
    for (const el of sectionEls) {
      if (el.offsetTop <= y) activeId = '#' + el.id;
    }
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === activeId));
  };
  window.addEventListener('scroll', setActiveNav, { passive: true });
  setActiveNav();

  // -------------------------------------------------------
  // Exploded view toggle
  // -------------------------------------------------------
  const exploded = document.getElementById('exploded');
  if (exploded) {
    exploded.querySelectorAll('[data-mode-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode-btn');
        exploded.setAttribute('data-mode', mode);
        exploded.querySelectorAll('[data-mode-btn]').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  // -------------------------------------------------------
  // Production line — scroll-driven progress + active station
  // -------------------------------------------------------
  const line = document.getElementById('production-line');
  if (line) {
    const stations = Array.from(line.querySelectorAll('.station'));
    const rail = line.querySelector('.rail-col');
    const update = () => {
      const rect = line.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = rect.top - vh * 0.5;
      const end = rect.bottom - vh * 0.5;
      const total = rect.height;
      let progress = 0;
      if (start <= 0 && end >= 0) {
        progress = Math.min(1, Math.max(0, -start / total));
      } else if (end < 0) {
        progress = 1;
      }
      rail.style.setProperty('--prog', (progress * 100).toFixed(1) + '%');

      // Active station: whichever station marker is closest to the line head
      const headY = rect.top + progress * total;
      stations.forEach((s, i) => {
        const sRect = s.getBoundingClientRect();
        const onScreen = sRect.top < vh * 0.65 && sRect.bottom > vh * 0.2;
        s.classList.toggle('active', onScreen);
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // -------------------------------------------------------
  // Layer toggles for components vis
  // -------------------------------------------------------
  const toggleHost = document.getElementById('layer-toggles');
  const buildingVis = document.getElementById('building-vis');
  if (toggleHost && buildingVis) {
    toggleHost.querySelectorAll('.layer-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const on = !btn.classList.contains('on');
        btn.classList.toggle('on', on);
        const layer = btn.getAttribute('data-layer');
        const vis = buildingVis.querySelector('.layer-vis[data-layer="' + layer + '"]');
        if (vis) vis.classList.toggle('on', on);
      });
    });
  }

  // -------------------------------------------------------
  // Filter chips (visual only)
  // -------------------------------------------------------
  document.querySelectorAll('.projects .filters .chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.projects .filters .chip').forEach(x => x.classList.toggle('active', x === c));
    });
  });

  // -------------------------------------------------------
  // Smart form opts (multi-toggle within fieldset where appropriate)
  // -------------------------------------------------------
  document.querySelectorAll('#smart-form fieldset').forEach((fs, idx) => {
    const multi = idx === 1; // "What do you need" supports multi
    fs.querySelectorAll('.opt').forEach(opt => {
      opt.addEventListener('click', () => {
        if (multi) {
          opt.classList.toggle('on');
        } else {
          fs.querySelectorAll('.opt').forEach(o => o.classList.toggle('on', o === opt));
        }
      });
    });
  });

  // -------------------------------------------------------
  // Smart form submit — build a mailto: to hola@actia.tech with the
  // selected fieldset values, then trigger the email client. Files
  // cannot be attached via mailto: (HTML spec limitation) — we surface
  // a reminder so the user knows to attach them manually.
  // -------------------------------------------------------
  const smartForm = document.getElementById('smart-form');
  if (smartForm) {
    const fieldsetLabels = ['¿Qué tienes ahora?', '¿Qué necesitas?', '¿Qué tipología es?'];
    smartForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fieldsets = smartForm.querySelectorAll('fieldset');
      const lines = ['Solicitud desde la web ACTIA · Abrir proyecto', ''];
      fieldsets.forEach((fs, i) => {
        const label = fieldsetLabels[i] || `Pregunta ${i + 1}`;
        const selections = [...fs.querySelectorAll('.opt.on')].map(o => o.textContent.trim());
        if (selections.length === 0) return;
        lines.push(`${(i + 1).toString().padStart(2, '0')}. ${label}`);
        lines.push(`    → ${selections.join(', ')}`);
        lines.push('');
      });
      const email = (smartForm.querySelector('#contact-email')?.value || '').trim();
      lines.push('04. Correo de contacto');
      lines.push(`    → ${email || '(no proporcionado)'}`);
      lines.push('');
      lines.push('— Enviado desde actia.tech');

      const subject = 'Abrir proyecto · Solicitud técnica';
      const body = lines.join('\n');
      const mailto = `mailto:hola@actia.tech?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Open the user's email client
      window.location.href = mailto;

      // Show the on-page confirmation
      const ok = document.getElementById('form-ok');
      if (ok) ok.hidden = false;
    });
  }

  // Calculator option groups
  document.querySelectorAll('.calc-form .options').forEach(group => {
    group.querySelectorAll('.opt').forEach(opt => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('.opt').forEach(o => o.classList.toggle('on', o === opt));
        recalc();
      });
    });
  });

  // -------------------------------------------------------
  // Counters animate when impact dashboard scrolls into view
  // -------------------------------------------------------
  const counters = document.querySelectorAll('[data-counter]');
  const formatNum = (n) => Math.round(n).toLocaleString('es-ES');
  const animateCounter = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.getAttribute('data-counter'));
    const dur = 1200;
    const start = performance.now();
    const unit = el.querySelector('.unit');
    const unitHTML = unit ? unit.outerHTML : '';
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = formatNum(target * eased) + unitHTML;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => io.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  // -------------------------------------------------------
  // Calculator logic
  // -------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const sqm = $('#calc-sqm');
  const floors = $('#calc-floors');
  const sqmOut = $('#calc-sqm-out');
  const floorsOut = $('#calc-floors-out');
  const sqmMid = $('#calc-sqm-mid');
  const floorsMid = $('#calc-floors-mid');

  const getActiveOpt = (group) => {
    const g = document.querySelector('.calc-form .options[data-group="' + group + '"]');
    if (!g) return null;
    const a = g.querySelector('.opt.on');
    return a ? a.getAttribute('data-v') : null;
  };

  function recalc() {
    if (!sqm || !floors) return;
    const m2 = parseInt(sqm.value, 10);
    const f = parseInt(floors.value, 10);
    const type = getActiveOpt('type') || 'residencia';
    const phase = getActiveOpt('phase') || 'basico';

    // Heuristics — playable, not authoritative
    const typeFactor = { residencia: 1.05, vivienda: 1.0, hotel: 1.1, equipamiento: 0.95, oficina: 0.85 }[type] || 1;
    const phaseFactor = { idea: 0.7, ante: 0.82, basico: 0.92, ejec: 0.96, lic: 0.98 }[phase] || 0.9;
    const floorPenalty = Math.max(0.7, 1 - (Math.max(0, f - 6) * 0.04));

    const pot = Math.round(80 * typeFactor * phaseFactor * floorPenalty + (f >= 3 ? 4 : 0));
    const plazo = Math.round(2 + m2 / 800);
    const madera = Math.round(m2 * 0.16 * typeFactor);
    const peso = Math.round(55 + (f >= 5 ? 8 : 0));
    const co2 = Math.round(madera * 0.8);

    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('r-pot', pot + '<span class="unit">%</span>');
    set('r-plazo', '−' + plazo + '<span class="unit">meses</span>');
    set('r-madera', madera.toLocaleString('es-ES') + '<span class="unit">m³</span>');
    set('r-peso', '−' + peso + '<span class="unit">%</span>');
    set('r-co2', co2.toLocaleString('es-ES') + '<span class="unit">t</span>');

    const next = phase === 'idea' || phase === 'ante'
      ? 'Sesión con ACTIA Studio para definir parcela y modulación.'
      : phase === 'basico'
        ? 'Enviar a oficina técnica para diagnóstico industrial.'
        : 'Pasar a ACTIA Producción con re-ingeniería de fábrica.';
    set('r-next', next);

    if (sqmOut) sqmOut.textContent = m2.toLocaleString('es-ES') + ' m²';
    if (floorsOut) floorsOut.textContent = f;
    if (sqmMid) sqmMid.textContent = m2.toLocaleString('es-ES') + ' m²';
    if (floorsMid) floorsMid.textContent = f;
  }
  if (sqm) sqm.addEventListener('input', recalc);
  if (floors) floors.addEventListener('input', recalc);
  recalc();

  // -------------------------------------------------------
  // Route dash animation on the logistic map
  // -------------------------------------------------------
  const routes = document.querySelectorAll('#logistic-map .route');
  if (routes.length) {
    routes.forEach((r, i) => {
      r.setAttribute('stroke-dasharray', '6 8');
      r.style.animation = `dashFlow 1.8s linear ${i * 0.18}s infinite`;
    });
    const style = document.createElement('style');
    style.textContent = '@keyframes dashFlow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -28; } }';
    document.head.appendChild(style);
  }

  // -------------------------------------------------------
  // Smooth scroll for in-page anchor links
  // -------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // -------------------------------------------------------
  // Random id for form ack
  // -------------------------------------------------------
  const formOk = document.getElementById('form-ok');
  if (formOk) {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    formOk.innerHTML = formOk.innerHTML.replace('{{rand}}', rand);
  }

  // -------------------------------------------------------
  // Factory stack — scroll-driven overlay reveal
  // -------------------------------------------------------
  const factoryStack = document.getElementById('factory-stack');
  if (factoryStack) {
    const updateStack = () => {
      const rect = factoryStack.getBoundingClientRect();
      const vh = window.innerHeight;
      const travel = factoryStack.offsetHeight - vh;
      const scrolled = Math.max(0, -rect.top);
      const p = travel > 0 ? Math.min(1, scrolled / travel) : 0;
      factoryStack.style.setProperty('--p', p.toFixed(3));
    };
    window.addEventListener('scroll', updateStack, { passive: true });
    window.addEventListener('resize', updateStack);
    updateStack();
  }

})();
