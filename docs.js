(function () {
  'use strict';

  var sidebar = document.getElementById('docsSidebar');
  var menuBtn = document.getElementById('docsMenu');
  var backdrop = document.getElementById('docsBackdrop');
  var search = document.getElementById('docsSearch');
  var navBox = document.getElementById('docsNav');
  var empty = document.getElementById('docsEmpty');
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('#docsToc a'));
  var sectionIds = tocLinks.map(function (a) { return a.getAttribute('href').slice(1); });
  var sections = sectionIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);

  function setDrawer(open) {
    if (!sidebar || !menuBtn) return;
    sidebar.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (backdrop) backdrop.classList.toggle('show', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (menuBtn) menuBtn.addEventListener('click', function () {
    setDrawer(!sidebar.classList.contains('open'));
  });
  if (backdrop) backdrop.addEventListener('click', function () { setDrawer(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setDrawer(false);
  });

  if (navBox) navBox.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setDrawer(false); });
  });

  if (search) search.addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    var hits = 0;
    navBox.querySelectorAll('.docs-group').forEach(function (group) {
      var shown = 0;
      group.querySelectorAll('a').forEach(function (a) {
        var match = !q || a.textContent.toLowerCase().indexOf(q) !== -1;
        a.hidden = !match;
        if (match) shown++;
      });
      group.hidden = shown === 0;
      hits += shown;
    });
    if (empty) empty.hidden = hits > 0;
  });

  function markActive(id) {
    tocLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
    if (navBox) navBox.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }

  function onScroll() {
    var current = sectionIds[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= 120) current = sectionIds[i];
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sectionIds[sectionIds.length - 1];
    }
    markActive(current);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('hashchange', function () {
    if (location.hash) markActive(location.hash.slice(1));
  });
})();
