(function () {
  // ── Scroll position save/restore ────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^https?:/.test(href)) return;
    sessionStorage.setItem('scroll:' + location.pathname, window.scrollY);

    var cls = link.classList;
    if (!cls.contains('back-float-btn') && !cls.contains('hmw-return-btn')) {
      sessionStorage.setItem('scroll:fwd', '1');
    }

    // Track HMW → solutions navigation for the "Вернуться" button
    if (cls.contains('hmw-q-link')) {
      try {
        var dest = new URL(href, location.href).pathname;
        sessionStorage.setItem('hmw-return:' + dest, location.pathname);
      } catch (ex) {}
    } else {
      try {
        var dest = new URL(href, location.href).pathname;
        sessionStorage.removeItem('hmw-return:' + dest);
      } catch (ex) {}
    }
  });

  window.addEventListener('load', function () {
    var key   = 'scroll:' + location.pathname;
    var saved = sessionStorage.getItem(key);
    var isFwd = sessionStorage.getItem('scroll:fwd');
    sessionStorage.removeItem('scroll:fwd');
    sessionStorage.removeItem(key);
    if (saved !== null && !isFwd) {
      window.scrollTo(0, parseInt(saved, 10));
    }
  });

  // ── SVG arrows ──────────────────────────────────────────────────────────
  var SVG_RIGHT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var SVG_LEFT  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-arrow="left"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

  // ── Floating scroll-to-top button ────────────────────────────────────────
  var scrollTopBtn = document.createElement('button');
  scrollTopBtn.className = 'scroll-top-btn';
  scrollTopBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  scrollTopBtn.setAttribute('aria-label', 'Наверх');
  document.body.appendChild(scrollTopBtn);

  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function updateScrollTopBtn() {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', updateScrollTopBtn, { passive: true });
  updateScrollTopBtn();

  // ── Global Lightbox ──────────────────────────────────────────────────────
  // Appended directly to <body> so it is never inside a CSS-transformed ancestor.
  var lb = document.createElement('div');
  lb.className = 'global-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  var SVG_CLOSE   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var SVG_ZOOM_IN  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  var SVG_ZOOM_OUT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  lb.innerHTML =
    '<div class="global-lightbox-backdrop"></div>' +
    '<div class="global-lightbox-content">' +
    '<button class="global-lightbox-close" aria-label="Закрыть">' + SVG_CLOSE + '</button>' +
    '<div class="global-lightbox-inner"></div>' +
    '<div class="global-lightbox-zoom-controls">' +
    '<button class="global-lightbox-zoom-btn" data-zoom="out" aria-label="Отдалить">' + SVG_ZOOM_OUT + '</button>' +
    '<button class="global-lightbox-zoom-btn" data-zoom="in"  aria-label="Приблизить">' + SVG_ZOOM_IN + '</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(lb);

  var lbContent  = lb.querySelector('.global-lightbox-content');
  var lbBackdrop = lb.querySelector('.global-lightbox-backdrop');
  var lbClose    = lb.querySelector('.global-lightbox-close');
  var lbInner    = lb.querySelector('.global-lightbox-inner');
  var lbZoomIn      = lb.querySelector('[data-zoom="in"]');
  var lbZoomOut     = lb.querySelector('[data-zoom="out"]');
  var lbZoomControls = lb.querySelector('.global-lightbox-zoom-controls');

  var zoomScale  = 1;
  var panX = 0, panY = 0;
  var isDragging = false;
  var dragStartX, dragStartY, dragPanX, dragPanY;
  var lbIsSliderMode = false;

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
    lbZoomOut.disabled = zoomScale <= 1;
  }

  function resetView() {
    zoomScale = 1;
    panX = 0;
    panY = 0;
  }

  function openLightbox(type, src, opts) {
    var t = type || 'landscape';
    lbContent.className = 'global-lightbox-content global-lightbox-content--' + t;

    if (opts && opts.before && opts.after) {
      lbIsSliderMode = true;
      lbZoomControls.style.display = 'none';
      var baStyle = 'width:min(92vw,1200px);margin:0;border-radius:12px;';
      var SVG_HANDLE = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4L2 9L6 14" stroke="rgba(220,38,38,0.75)"/><path d="M12 4L16 9L12 14" stroke="rgba(22,163,74,0.75)"/></svg>';
      lbInner.innerHTML =
        '<div class="before-after before-after--landscape" style="' + baStyle + '">' +
        '<div class="ba-before"><img src="' + opts.before + '" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block;"></div>' +
        '<div class="ba-after"><img src="' + opts.after + '" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block;"></div>' +
        '<div class="ba-divider"><div class="ba-handle" aria-label="Перетащите для сравнения">' + SVG_HANDLE + '</div></div>' +
        '</div>';
      lbInner.style.height = 'auto';
      lbInner.style.width  = 'auto';
      var lbBa = lbInner.querySelector('.before-after');
      var lbBaAfter   = lbBa.querySelector('.ba-after');
      var lbBaDivider = lbBa.querySelector('.ba-divider');
      var lbBaDragging = false;
      function lbSetPos(pct) {
        pct = Math.max(0, Math.min(100, pct));
        lbBaAfter.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
        lbBaDivider.style.left = pct + '%';
      }
      lbSetPos(50);
      lbBa.addEventListener('mousedown', function (e) { lbBaDragging = true; e.preventDefault(); e.stopPropagation(); });
      document.addEventListener('mouseup',  function () { lbBaDragging = false; });
      document.addEventListener('mousemove', function (e) {
        if (!lbBaDragging) return;
        var r = lbBa.getBoundingClientRect();
        lbSetPos((e.clientX - r.left) / r.width * 100);
      });
      lbBa.addEventListener('touchstart', function () { lbBaDragging = true; }, { passive: true });
      lbBa.addEventListener('touchend',   function () { lbBaDragging = false; }, { passive: true });
      lbBa.addEventListener('touchmove', function (e) {
        if (!lbBaDragging) return;
        var r = lbBa.getBoundingClientRect();
        lbSetPos((e.touches[0].clientX - r.left) / r.width * 100);
      }, { passive: false });
    } else {
      lbIsSliderMode = false;
      lbZoomControls.style.display = '';
      if (src) {
        var imgStyle = t === 'landscape'
          ? 'max-width:min(92vw,1200px);max-height:calc(90vh - 80px);width:auto;height:auto;display:block;border-radius:12px;user-select:none;-webkit-user-drag:none;'
          : 'width:100%;height:100%;object-fit:contain;display:block;user-select:none;-webkit-user-drag:none;';
        lbInner.innerHTML = '<img src="' + src + '" style="' + imgStyle + '">';
      }
      lbInner.style.height = t === 'landscape' ? 'auto' : '100%';
      lbInner.style.width  = t === 'landscape' ? 'auto' : '100%';
    }

    resetView();
    applyZoom();
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    lbIsSliderMode = false;
    lbZoomControls.style.display = '';
    resetView();
    applyZoom();
    setTimeout(function () { lbInner.innerHTML = ''; }, 300);
  }

  lbBackdrop.addEventListener('click', closeLightbox);
  lbClose.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  lbZoomIn.addEventListener('click', function () {
    zoomScale = Math.min(4, zoomScale + 0.25);
    clampPan();
    applyZoom();
  });
  lbZoomOut.addEventListener('click', function () {
    zoomScale = Math.max(1, zoomScale - 0.25);
    if (zoomScale <= 1) { panX = 0; panY = 0; }
    clampPan();
    applyZoom();
  });

  lbContent.addEventListener('wheel', function (e) {
    e.preventDefault();
    var step = e.deltaY < 0 ? 0.15 : -0.15;
    zoomScale = Math.min(4, Math.max(1, zoomScale + step));
    if (zoomScale <= 1) { panX = 0; panY = 0; }
    clampPan();
    applyZoom();
  }, { passive: false });

  lbInner.addEventListener('mousedown', function (e) {
    if (lbIsSliderMode || zoomScale <= 1) return;
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
      zoomScale = Math.min(4, Math.max(1, pinchScale0 * dist / pinchDist0));
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
    document.querySelectorAll('.before-after[data-before]:not([data-zoom-init])').forEach(function (ba) {
      ba.setAttribute('data-zoom-init', '1');
      var btn = document.createElement('button');
      btn.className = 'ba-zoom-btn';
      btn.setAttribute('aria-label', 'Увеличить');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      ba.appendChild(btn);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openLightbox('landscape', null, {
          before: ba.getAttribute('data-before'),
          after:  ba.getAttribute('data-after')
        });
      });
    });
  }

  initZoomables();
  window.addEventListener('load', initZoomables);

  window.openGlobalLightbox  = openLightbox;
  window.closeGlobalLightbox = closeLightbox;

  // ── Carousel swipe (touch) ───────────────────────────────────────────────
  var swipeStartX = 0;
  var swipeStartY = 0;

  document.addEventListener('touchstart', function (e) {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    var carousel = e.target.closest('.carousel');
    if (!carousel) return;
    var dx = swipeStartX - e.changedTouches[0].clientX;
    var dy = swipeStartY - e.changedTouches[0].clientY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    var targetClass = dx > 0 ? 'is-right' : 'is-left';
    var target = carousel.querySelector('.carousel-slide.' + targetClass);
    if (!target) {
      var dataPos = dx > 0 ? '1' : '-1';
      target = carousel.querySelector('.carousel-slide[data-pos="' + dataPos + '"]');
    }
    if (target) target.click();
  }, { passive: true });

  // ── Replace text arrows in .btn-outline elements with SVG icons ──────────
  document.querySelectorAll('.btn-outline, .back-link, .hmw-q-link').forEach(function (el) {
    var html = el.innerHTML;
    if (/→\s*$/.test(html)) {
      el.innerHTML = html.replace(/→\s*$/, '') + SVG_RIGHT;
    } else if (/^\s*←/.test(html)) {
      el.innerHTML = SVG_LEFT + html.replace(/^\s*←\s*/, '');
    }
  });

  // ── Navigation config ────────────────────────────────────────────────────
  var CASES = [
    { id: 'op',             title: 'Термика',        path: '/cases/op/index.html' },
    { id: 'petsee',         title: 'PetSee',         path: '/cases/petsee/index.html' },
    { id: 'travel-summary', title: 'Travel Summary', path: '/cases/travel-summary/index.html' },
    { id: 'messenger',      title: 'Мессенджер',     path: '/cases/messenger/index.html' }
  ];

  var SECTIONS = {
    'petsee': [
      { path: '/cases/petsee/context.html',          title: 'Обзор' },
      { path: '/cases/petsee/segmentation.html',     title: 'Аудитория' },
      { path: '/cases/petsee/research/index.html',   title: 'Исследование' },
      { path: '/cases/petsee/benchmarking.html',     title: 'Бенчмаркинг' },
      { path: '/cases/petsee/user-flow.html',        title: 'User Flow' },
      { path: '/cases/petsee/hmw-before.html',       title: 'HMW' },
      { path: '/cases/petsee/solutions.html',        title: 'Дизайн-решения' },
      { path: '/cases/petsee/design.html',           title: 'Lo-fi → Hi-fi' },
      { path: '/cases/petsee/usability.html',        title: 'Юзабилити' },
      { path: '/cases/petsee/hmw-after.html',        title: 'HMW после тестов' },
      { path: '/cases/petsee/mvp-scope.html',        title: 'Приоритизация' },
      { path: '/cases/petsee/measurement-plan.html', title: 'Метрики' }
    ],
    'travel-summary': [
      { path: '/cases/travel-summary/context.html',          title: 'Обзор' },
      { path: '/cases/travel-summary/segments.html',         title: 'Аудитория' },
      { path: '/cases/travel-summary/research.html',         title: 'Исследование' },
      { path: '/cases/travel-summary/benchmarking.html',     title: 'Бенчмаркинг' },
      { path: '/cases/travel-summary/user-flow.html',        title: 'User Flow' },
      { path: '/cases/travel-summary/design.html',           title: 'Дизайн' },
      { path: '/cases/travel-summary/usability.html',        title: 'Валидация' },
      { path: '/cases/travel-summary/measurement-plan.html', title: 'Метрики' },
      { path: '/cases/travel-summary/next-steps.html',       title: 'Следующие шаги' }
    ],
    'op': [
      { path: '/cases/op/monitoring/index.html', title: 'Мониторинг' },
      { path: '/cases/op/admin/index.html',       title: 'Редизайн' },
      { path: '/cases/op/edo/index.html',         title: 'ЭДО' }
    ],
    'messenger': [
      { path: '/cases/messenger/context.html',            title: 'Обзор' },
      { path: '/cases/messenger/segments.html',           title: 'Аудитория' },
      { path: '/cases/messenger/research/index.html',     title: 'Исследование' },
      { path: '/cases/messenger/synthesis.html',          title: 'Синтез' },
      { path: '/cases/messenger/jtbd.html',               title: 'JTBD' },
      { path: '/cases/messenger/solutions.html',          title: 'Дизайн-решения' },
      { path: '/cases/messenger/usability.html',          title: 'Юзабилити' },
      { path: '/cases/messenger/iterations.html',         title: 'Итерации' }
    ]
  };

  // Sub-pages that belong to a hub page — get a floating back button to the hub
  var HUB_CHILDREN = {
    '/cases/petsee/research/qualitative.html': { hub: '/cases/petsee/research/index.html',   label: 'Исследование' },
    '/cases/petsee/research/survey-1.html':    { hub: '/cases/petsee/research/index.html',   label: 'Исследование' },
    '/cases/petsee/research/survey-2.html':    { hub: '/cases/petsee/research/index.html',   label: 'Исследование' },
    '/cases/travel-summary/research/qualitative.html': { hub: '/cases/travel-summary/research.html', label: 'Исследование' },
    '/cases/travel-summary/research/survey.html':      { hub: '/cases/travel-summary/research.html', label: 'Исследование' },
    '/cases/messenger/research/focus-group.html': { hub: '/cases/messenger/research/index.html', label: 'Исследование' },
    '/cases/messenger/research/interviews.html':  { hub: '/cases/messenger/research/index.html', label: 'Исследование' },
    '/cases/messenger/research/survey.html':      { hub: '/cases/messenger/research/index.html', label: 'Исследование' }
  };

  function isCaseIndex(path) {
    return /\/cases\/[^\/]+\/?(?:index\.html)?$/.test(path);
  }

  function getCaseId(path) {
    var m = /\/cases\/([^\/]+)/.exec(path);
    return m ? m[1] : null;
  }

  // ── Floating back button ─────────────────────────────────────────────────
  var curPath = location.pathname;
  var inCases = curPath.indexOf('/cases/') !== -1;
  var onCaseIndex = isCaseIndex(curPath);
  var onRoot = curPath === '/' || /^\/index\.html$/.test(curPath);

  function getParentPath(path) {
    if (!path || path === '/' || /^\/index\.html$/.test(path)) return null;
    if (isCaseIndex(path)) return '/index.html';
    if (HUB_CHILDREN[path]) return null; // hub children handled separately
    var m = /\/cases\/([^\/]+)/.exec(path);
    return m ? '/cases/' + m[1] + '/index.html' : null;
  }

  var parentPath = getParentPath(curPath);

  var hubChildEntry = HUB_CHILDREN[curPath];
  if (hubChildEntry) {
    var backFloatBtn = document.createElement('a');
    backFloatBtn.className = 'back-float-btn';
    backFloatBtn.href = hubChildEntry.hub;
    backFloatBtn.innerHTML = SVG_LEFT + ' ' + hubChildEntry.label;
    document.body.appendChild(backFloatBtn);
  } else if (parentPath) {
    var caseNameLabel = 'К кейсу';
    if (parentPath !== '/index.html') {
      var caseIdForLabel = getCaseId(curPath);
      for (var cni = 0; cni < CASES.length; cni++) {
        if (CASES[cni].id === caseIdForLabel) { caseNameLabel = CASES[cni].title; break; }
      }
    }
    var backLabel = parentPath === '/index.html' ? 'К кейсам' : caseNameLabel;

    var backFloatBtn = document.createElement('a');
    backFloatBtn.className = 'back-float-btn';
    backFloatBtn.href = parentPath;
    backFloatBtn.innerHTML = SVG_LEFT + ' ' + backLabel;

    document.body.appendChild(backFloatBtn);
  }

  // ── "Вернуться" button (HMW → solutions) ────────────────────────────────
  var hmwReturnSource = sessionStorage.getItem('hmw-return:' + curPath);
  if (hmwReturnSource) {
    var returnBtn = document.createElement('a');
    returnBtn.className = 'back-float-btn hmw-return-btn';
    returnBtn.href = hmwReturnSource;
    returnBtn.innerHTML = SVG_LEFT + ' Вернуться';
    document.body.appendChild(returnBtn);
  }

  // ── Bottom navigation ────────────────────────────────────────────────────
  if (inCases) {
    var navCaseId = getCaseId(curPath);

    if (navCaseId) {
      var navPrev = null, navNext = null;

      if (onCaseIndex) {
        var caseIdx = -1;
        for (var ci = 0; ci < CASES.length; ci++) {
          if (CASES[ci].id === navCaseId) { caseIdx = ci; break; }
        }
        if (caseIdx !== -1) {
          if (caseIdx > 0) navPrev = { href: CASES[caseIdx - 1].path, label: CASES[caseIdx - 1].title };
          if (caseIdx < CASES.length - 1) navNext = { href: CASES[caseIdx + 1].path, label: CASES[caseIdx + 1].title };
        }
      } else {
        var secs = SECTIONS[navCaseId];
        if (secs) {
          var secIdx = -1;
          for (var si = 0; si < secs.length; si++) {
            if (curPath === secs[si].path || curPath.endsWith(secs[si].path)) {
              secIdx = si; break;
            }
          }
          if (secIdx !== -1) {
            if (secIdx > 0) navPrev = { href: secs[secIdx - 1].path, label: secs[secIdx - 1].title };
            if (secIdx < secs.length - 1) navNext = { href: secs[secIdx + 1].path, label: secs[secIdx + 1].title };
          }
        }
      }

      if (navPrev || navNext) {
        var bottomNav = document.createElement('div');
        bottomNav.className = 'case-bottom-nav';

        if (navPrev) {
          var prevA = document.createElement('a');
          prevA.className = 'case-bottom-nav__btn';
          prevA.href = navPrev.href;
          prevA.innerHTML = SVG_LEFT + ' ' + navPrev.label;
          bottomNav.appendChild(prevA);
        }

        if (navNext) {
          var nextA = document.createElement('a');
          nextA.className = 'case-bottom-nav__btn case-bottom-nav__next';
          nextA.href = navNext.href;
          nextA.innerHTML = navNext.label + ' ' + SVG_RIGHT;
          bottomNav.appendChild(nextA);
        }

        var footer = document.querySelector('footer');
        if (footer) {
          footer.parentNode.insertBefore(bottomNav, footer);
        } else {
          document.body.appendChild(bottomNav);
        }
      }
    }
  }
})();
