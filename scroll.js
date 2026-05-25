(function () {
  // Scroll position save/restore
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^https?:/.test(href)) return;
    sessionStorage.setItem('scroll:' + location.pathname, window.scrollY);
  });

  window.addEventListener('load', function () {
    var key = 'scroll:' + location.pathname;
    var saved = sessionStorage.getItem(key);
    if (saved !== null) {
      sessionStorage.removeItem(key);
      window.scrollTo(0, parseInt(saved, 10));
    }
  });

  // Floating scroll-to-top button
  var btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', 'Наверх');
  document.body.appendChild(btn);

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function updateBtn() {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', updateBtn, { passive: true });
  updateBtn();

  // ── Global Lightbox ──
  // Appended directly to <body> so it is never inside a CSS-transformed ancestor.
  // Elements with transform create a new containing block for position:fixed children,
  // which breaks full-viewport coverage. Keeping the lightbox at body level avoids this.

  var lb = document.createElement('div');
  lb.className = 'global-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<div class="global-lightbox-backdrop"></div>' +
    '<div class="global-lightbox-content">' +
    '<button class="global-lightbox-close" aria-label="Закрыть">✕</button>' +
    '<div class="global-lightbox-inner"></div>' +
    '</div>';
  document.body.appendChild(lb);

  var lbContent  = lb.querySelector('.global-lightbox-content');
  var lbBackdrop = lb.querySelector('.global-lightbox-backdrop');
  var lbClose    = lb.querySelector('.global-lightbox-close');

  function openLightbox(type) {
    lbContent.className = 'global-lightbox-content global-lightbox-content--' + (type || 'landscape');
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  lbBackdrop.addEventListener('click', closeLightbox);
  lbClose.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // Make all .img-placeholder elements zoomable on every page
  function initZoomables() {
    document.querySelectorAll('.img-placeholder:not([data-zoom-init])').forEach(function (el) {
      el.setAttribute('data-zoom-init', '1');
      el.addEventListener('click', function () { openLightbox('landscape'); });
    });
  }

  initZoomables();
  window.addEventListener('load', initZoomables);

  // Expose for carousel and any other inline scripts
  window.openGlobalLightbox  = openLightbox;
  window.closeGlobalLightbox = closeLightbox;
})();
