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
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
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

  var lb = document.createElement('div');
  lb.className = 'global-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<div class="global-lightbox-backdrop"></div>' +
    '<div class="global-lightbox-content">' +
    '<button class="global-lightbox-close" aria-label="Закрыть">✕</button>' +
    '<div class="global-lightbox-inner"></div>' +
    '<div class="global-lightbox-zoom-controls">' +
    '<button class="global-lightbox-zoom-btn" data-zoom="out" aria-label="Отдалить">−</button>' +
    '<button class="global-lightbox-zoom-btn" data-zoom="in"  aria-label="Приблизить">+</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(lb);

  var lbContent  = lb.querySelector('.global-lightbox-content');
  var lbBackdrop = lb.querySelector('.global-lightbox-backdrop');
  var lbClose    = lb.querySelector('.global-lightbox-close');
  var lbInner    = lb.querySelector('.global-lightbox-inner');
  var lbZoomIn   = lb.querySelector('[data-zoom="in"]');
  var lbZoomOut  = lb.querySelector('[data-zoom="out"]');

  var zoomScale  = 1;
  var panX = 0, panY = 0;
  var isDragging = false;
  var dragStartX, dragStartY, dragPanX, dragPanY;

  function clampPan() {
    var rect = lbContent.getBoundingClientRect();
    var maxX = Math.max(0, (zoomScale - 1) / 2 * rect.width);
    var maxY = Math.max(0, (zoomScale - 1) / 2 * rect.height);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function applyZoom() {
    if (panX === 0 && panY === 0 && zoomScale === 1) {
      lbInner.style.transform = '';
    } else {
      lbInner.style.transform =
        'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomScale + ')';
    }
    lbInner.style.cursor = zoomScale > 1
      ? (isDragging ? 'grabbing' : 'grab')
      : '';
  }

  function resetView() {
    zoomScale = 1;
    panX = 0;
    panY = 0;
  }

  function openLightbox(type, src) {
    lbContent.className = 'global-lightbox-content global-lightbox-content--' + (type || 'landscape');
    if (src) {
      lbInner.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:contain;display:block;user-select:none;-webkit-user-drag:none;">';
    }
    resetView();
    applyZoom();
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    resetView();
    applyZoom();
    setTimeout(function () { lbInner.innerHTML = ''; }, 300);
  }

  lbBackdrop.addEventListener('click', closeLightbox);
  lbClose.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // Zoom buttons
  lbZoomIn.addEventListener('click', function () {
    zoomScale = Math.min(4, zoomScale + 0.25);
    clampPan();
    applyZoom();
  });
  lbZoomOut.addEventListener('click', function () {
    zoomScale = Math.max(0.5, zoomScale - 0.25);
    if (zoomScale <= 1) { panX = 0; panY = 0; }
    clampPan();
    applyZoom();
  });

  // Wheel zoom
  lbContent.addEventListener('wheel', function (e) {
    e.preventDefault();
    var step = e.deltaY < 0 ? 0.15 : -0.15;
    zoomScale = Math.min(4, Math.max(0.5, zoomScale + step));
    if (zoomScale <= 1) { panX = 0; panY = 0; }
    clampPan();
    applyZoom();
  }, { passive: false });

  // Mouse drag to pan
  lbInner.addEventListener('mousedown', function (e) {
    if (zoomScale <= 1) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragPanX = panX;
    dragPanY = panY;
    applyZoom();
  });
  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    panX = dragPanX + (e.clientX - dragStartX);
    panY = dragPanY + (e.clientY - dragStartY);
    clampPan();
    applyZoom();
  });
  document.addEventListener('mouseup', function () {
    if (!isDragging) return;
    isDragging = false;
    applyZoom();
  });

  // Touch: pinch to zoom + single-finger pan
  var pinchDist0 = 0, pinchScale0 = 1;
  var touchPanStartX, touchPanStartY, touchPanX0, touchPanY0;
  var isTouchPanning = false;

  lbContent.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      isTouchPanning = false;
      pinchDist0 = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchScale0 = zoomScale;
    } else if (e.touches.length === 1 && zoomScale > 1) {
      isTouchPanning = true;
      touchPanStartX = e.touches[0].clientX;
      touchPanStartY = e.touches[0].clientY;
      touchPanX0 = panX;
      touchPanY0 = panY;
    }
  });
  lbContent.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      isTouchPanning = false;
      var dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      zoomScale = Math.min(4, Math.max(0.5, pinchScale0 * dist / pinchDist0));
      if (zoomScale <= 1) { panX = 0; panY = 0; }
      clampPan();
      applyZoom();
    } else if (e.touches.length === 1 && isTouchPanning) {
      e.preventDefault();
      panX = touchPanX0 + (e.touches[0].clientX - touchPanStartX);
      panY = touchPanY0 + (e.touches[0].clientY - touchPanStartY);
      clampPan();
      applyZoom();
    }
  }, { passive: false });
  lbContent.addEventListener('touchend', function () { isTouchPanning = false; });

  // Make .img-placeholder and img[data-lightbox] elements zoomable
  function initZoomables() {
    document.querySelectorAll('.img-placeholder:not([data-zoom-init])').forEach(function (el) {
      el.setAttribute('data-zoom-init', '1');
      el.addEventListener('click', function () { openLightbox('landscape'); });
    });
    document.querySelectorAll('img[data-lightbox]:not([data-zoom-init])').forEach(function (el) {
      el.setAttribute('data-zoom-init', '1');
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', function () {
        openLightbox(el.getAttribute('data-lightbox') || 'landscape', el.src);
      });
    });
  }

  initZoomables();
  window.addEventListener('load', initZoomables);

  window.openGlobalLightbox  = openLightbox;
  window.closeGlobalLightbox = closeLightbox;

  // Replace text arrows in .btn-outline elements with SVG icons
  var SVG_RIGHT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var SVG_LEFT  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

  document.querySelectorAll('.btn-outline, .back-link').forEach(function (el) {
    var html = el.innerHTML;
    if (/→\s*$/.test(html)) {
      el.innerHTML = html.replace(/→\s*$/, '') + SVG_RIGHT;
    } else if (/^\s*←/.test(html)) {
      el.innerHTML = SVG_LEFT + html.replace(/^\s*←\s*/, '');
    }
  });
})();
