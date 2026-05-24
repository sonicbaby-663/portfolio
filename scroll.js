(function () {
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
})();
