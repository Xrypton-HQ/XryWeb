
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var navBackdrop = document.getElementById('navBackdrop');

  function setMenu(open) {
    if (!navLinks || !navToggle) return;
    navLinks.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (navBackdrop) navBackdrop.classList.toggle('show', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (navToggle) navToggle.addEventListener('click', function () {
    setMenu(!navLinks.classList.contains('open'));
  });
  if (navBackdrop) navBackdrop.addEventListener('click', function () { setMenu(false); });
  if (navLinks) navLinks.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var here = location.pathname.split('/').pop() || 'index.html';
  if (navLinks) {
    navLinks.querySelectorAll('a[href]').forEach(function (a) {
      var target = a.getAttribute('href').split('#')[0];
      if (target && target === here) a.classList.add('active');
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  var counters = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target) || reduceMotion) return;
    var duration = 1500;
    var start = performance.now();
    function frame(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(frame);
  }
  function initCounters() {
    if (!counters.length || !('IntersectionObserver' in window)) return;
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  function applyInfo(info) {
    var users = document.querySelector('[data-count-key="users"]');
    var guilds = document.querySelector('[data-count-key="guilds"]');
    if (users && Number.isFinite(info.users)) {
      users.setAttribute('data-count', String(Math.round(info.users)));
      users.textContent = Math.round(info.users).toLocaleString();
    }
    if (guilds && Number.isFinite(info.guilds)) {
      guilds.setAttribute('data-count', String(Math.round(info.guilds)));
      guilds.textContent = Math.round(info.guilds).toLocaleString();
    }
  }

  var infoFetch = fetch('/info', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });
  var infoTimeout = new Promise(function (resolve) {
    setTimeout(function () { resolve(null); }, 1200);
  });

  Promise.race([infoFetch, infoTimeout]).then(function (info) {
    if (info) applyInfo(info);
    initCounters();
  });

  document.querySelectorAll('[data-marquee]').forEach(function (track) {
    Array.prototype.slice.call(track.children).forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  var VERIFIED_BADGE = '<svg class="verified" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.4l-4-4 1.6-1.6 2.4 2.4 5.2-5.2 1.6 1.6z"/></svg>';

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function initials(name) {
    var words = name.trim().split(/\s+/);
    if (words.length >= 2 && words[1]) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  }

  function renderGuilds(list) {
    var track = document.querySelector('.marquee-track');
    if (!track || !list.length) return;
    var tints = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
    track.innerHTML = list.map(function (g, i) {
      var inner = g.icon
        ? '<img src="' + esc(g.icon) + '" alt="" loading="lazy">'
        : esc(initials(g.name));
      return '<div class="server">' +
        '<span class="server-avatar ' + tints[i % tints.length] + '" aria-hidden="true">' + inner + '</span>' +
        '<span class="server-meta"><span class="server-name">' + esc(g.name) +
        (g.verified === false ? '' : VERIFIED_BADGE) +
        '</span><span class="server-members">' + Number(g.members).toLocaleString() +
        ' members</span></span></div>';
    }).join('');
    Array.prototype.slice.call(track.children).forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    Array.prototype.slice.call(track.querySelectorAll('.server-avatar img')).forEach(function (img) {
      function toInitials() {
        var card = img.closest('.server');
        var nameEl = card && card.querySelector('.server-name');
        if (img.parentElement) img.parentElement.textContent = initials(nameEl ? nameEl.textContent : '');
      }
      img.addEventListener('error', toInitials);
      if (img.complete && img.naturalWidth === 0) toInitials();
    });
  }

  fetch('/guilds', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && Array.isArray(data.guilds)) renderGuilds(data.guilds);
    })
    .catch(function () {});

  var canvas = document.getElementById('particles');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0, height = 0, dots = [];

    function sizeCanvas() {
      var rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    }

    function buildDots() {
      var count = Math.min(46, Math.round(width / 34));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.1 + 0.4,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          a: Math.random() * 0.26 + 0.08
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -8) d.x = width + 8;
        if (d.x > width + 8) d.x = -8;
        if (d.y < -8) d.y = height + 8;
        if (d.y > height + 8) d.y = -8;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(196, 132, 252,' + d.a + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    sizeCanvas();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeCanvas, 180);
    });

    if (reduceMotion) {
      draw = function () {
        ctx.clearRect(0, 0, width, height);
        dots.forEach(function (d) {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(196, 132, 252,' + d.a + ')';
          ctx.fill();
        });
      };
      draw();
    } else {
      requestAnimationFrame(draw);
    }
  }

  document.querySelectorAll('.int-icon img, .social-btn img').forEach(function (img) {
    function fallback() {
      if (img.dataset.failed) return;
      img.dataset.failed = '1';
      var holder = img.parentElement;
      var name = (img.getAttribute('alt') || '').replace(/\s*logo$/i, '').trim();
      var span = document.createElement('span');
      span.className = 'logo-fallback';
      span.textContent = name ? name.charAt(0).toUpperCase() : '•';
      holder.replaceChild(span, img);
    }
    img.addEventListener('error', fallback);
    if (img.complete && img.naturalWidth === 0) fallback();
  });
})();
