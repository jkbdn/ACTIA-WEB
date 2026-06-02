/* ACTIA — mobile drawer nav (shared across index + project pages) */
(function () {
  'use strict';
  var cb = document.getElementById('navToggle');
  if (!cb) return;

  function close() {
    cb.checked = false;
    document.body.classList.remove('nav-open');
  }
  function sync() {
    document.body.classList.toggle('nav-open', cb.checked);
  }

  cb.addEventListener('change', sync);

  // Close the drawer after tapping any nav link
  document.querySelectorAll('.site-header .nav a').forEach(function (a) {
    a.addEventListener('click', close);
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  // Reset state if the viewport grows past the mobile breakpoint
  var mq = window.matchMedia('(max-width: 860px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function (e) {
    if (!e.matches) close();
  });
})();
