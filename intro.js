/* ACTIA — Intro stage (scroll-driven curtain reveal)
   The .intro-stage section is taller than the viewport; while it is in
   view we read scroll progress 0→1 and set --p on the stage so CSS can
   animate everything (photos parting, logo emerging, progress bar, hero
   words). No timers, no auto-play — entirely driven by the user's scroll. */
(function () {
  'use strict';

  const stage = document.querySelector('.intro-stage');
  if (!stage) return;

  const percentEl = stage.querySelector('.intro-percent');
  const fillEl = stage.querySelector('.intro-progress-fill');

  // ── Hero h1 — wrap each word in masks so they can rise in on reveal ──
  const h1 = document.querySelector('.hero-main h1');
  if (h1 && !h1.classList.contains('reveal-host')) {
    h1.classList.add('reveal-host');
    const walk = (node) => {
      const out = [];
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) {
              out.push(document.createTextNode(p));
            } else {
              const w = document.createElement('span');
              w.className = 'word';
              const inner = document.createElement('span');
              inner.className = 'word-inner';
              inner.textContent = p;
              w.appendChild(inner);
              out.push(w);
            }
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const voidTags = new Set(['BR', 'HR', 'IMG', 'WBR']);
          if (voidTags.has(child.tagName)) {
            out.push(child.cloneNode(true));
            return;
          }
          const inner = document.createElement('span');
          inner.className = 'word-inner';
          while (child.firstChild) inner.appendChild(child.firstChild);
          child.appendChild(inner);
          child.classList.add('word', 'is-stencil');
          out.push(child);
        }
      });
      node.innerHTML = '';
      out.forEach((n) => node.appendChild(n));
    };
    walk(h1);
    h1.querySelectorAll('.word').forEach((w, i) => {
      w.style.setProperty('--word-i', i);
    });

    // Trigger the word-by-word reveal only once the headline actually enters
    // the viewport — not when the intro stage finishes scrolling. Keeps the
    // headline still until the user can see it.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            h1.classList.add('in-view');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.25 });
      io.observe(h1);
    } else {
      h1.classList.add('in-view');
    }
  }

  // ── Offset intro videos so the two halves don't show the same frame ──
  document.querySelectorAll('.intro-video[data-offset]').forEach((v) => {
    const offset = parseFloat(v.dataset.offset);
    if (!offset) return;
    const seek = () => {
      try { v.currentTime = offset; } catch (e) {}
      v.play().catch(() => {});
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener('loadedmetadata', seek, { once: true });
  });

  // ── Scroll handler ──
  let ticking = false;
  let lastP = -1;

  function update() {
    ticking = false;
    const rect = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    // Total scroll travel allotted to the intro animation = stage height − viewport
    const travel = stage.offsetHeight - vh;
    // How far we've scrolled INTO the stage (0 at stage top edge meeting viewport top)
    const scrolled = Math.max(0, -rect.top);
    // We want photos fully parted around 75% of the stage's available travel
    // so the last 25% feels like a quick handoff to the hero.
    const raw = travel > 0 ? scrolled / travel : 0;
    const p = Math.min(1, raw / 0.75);
    if (Math.abs(p - lastP) < 0.001) return;
    lastP = p;

    stage.style.setProperty('--p', p.toFixed(3));
    if (percentEl) percentEl.textContent = String(Math.round(p * 100)).padStart(2, '0');
    if (fillEl) fillEl.style.transform = `scaleX(${p.toFixed(3)})`;

    // Latch: once the intro is finished, never un-finish it. Otherwise scrolling
    // back up would re-hide the hero, which is what the user just reported.
    if (rect.bottom < vh * 0.85 || p >= 1) {
      document.body.classList.add('intro-finished');
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
