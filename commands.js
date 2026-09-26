/* ================================================================
   Hollow — command browser
   Loads the command list (live /commands API, falling back to the
   static commands.json), then renders the search field, category
   pills, table rows, copy buttons and detail modal.
   Works on both index.html and commands.html.
   ================================================================ */
(function () {
  'use strict';

  var body = document.getElementById('commandBody');
  if (!body) return; // page without a command table

  var table = document.getElementById('commandTable');
  var pillRow = document.getElementById('pillRow');
  var searchInput = document.getElementById('commandSearch');
  var sortSelect = document.getElementById('sortSelect');
  var resultMeta = document.getElementById('resultMeta');
  var emptyState = document.getElementById('emptyState');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');

  var limit = parseInt(table && table.dataset.limit, 10) || 0;
  var allCommands = [];
  var activeCategory = 'all';
  var searchTerm = '';
  var sortMode = 'az'; // az (default) | za | category
  var lastFocusedRow = null;

  /* ---------------- helpers ---------------- */
  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function capitalize(value) {
    value = String(value || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /* ---------------- data loading ---------------- */
  function fetchWithTimeout(url, ms) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, ms) : null;
    return fetch(url, controller ? { signal: controller.signal } : undefined)
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      });
  }

  function normalise(data) {
    var list = Array.isArray(data) ? data : (data && data.commands) || [];
    return list.filter(function (cmd) { return cmd && cmd.name; }).map(function (cmd) {
      return {
        name: cmd.name,
        category: cmd.category || 'other',
        description: cmd.description || '',
        arguments: Array.isArray(cmd.arguments) ? cmd.arguments : [],
        permissions: Array.isArray(cmd.permissions) ? cmd.permissions : [],
        usage_count: typeof cmd.usage_count === 'number' ? cmd.usage_count : null
      };
    });
  }

  function loadCommands() {
    // Live API first (works once deployed on Vercel), static JSON as fallback
    // so the page still renders when opened without the serverless function.
    return fetchWithTimeout('/commands', 3000)
      .catch(function () { return fetch('commands.json').then(function (r) { return r.json(); }); })
      .then(function (data) { allCommands = normalise(data); })
      .catch(function () { allCommands = []; })
      .then(function () {
        buildPills();
        render();
      });
  }

  /* ---------------- category pills ---------------- */
  function buildPills() {
    if (!pillRow) return;
    var categories = [];
    allCommands.forEach(function (cmd) {
      if (categories.indexOf(cmd.category) === -1) categories.push(cmd.category);
    });
    categories.sort();

    var markup = ['<button class="pill active" data-category="all" type="button">all <span class="count">' +
      allCommands.length + '</span></button>'];
    categories.forEach(function (cat) {
      var count = allCommands.filter(function (c) { return c.category === cat; }).length;
      markup.push('<button class="pill" data-category="' + escapeHtml(cat) + '" type="button">' +
        escapeHtml(capitalize(cat)) + ' <span class="count">' + count + '</span></button>');
    });
    pillRow.innerHTML = markup.join('');

    pillRow.querySelectorAll('.pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        activeCategory = pill.dataset.category;
        pillRow.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        render();
      });
    });
  }

  /* ---------------- filtering + sorting ---------------- */
  function filteredCommands() {
    var term = searchTerm.trim().toLowerCase();
    var list = allCommands
      .filter(function (cmd) {
        return activeCategory === 'all' || cmd.category === activeCategory;
      })
      .filter(function (cmd) {
        if (!term) return true;
        return (cmd.name + ' ' + cmd.description + ' ' + cmd.category).toLowerCase().indexOf(term) !== -1;
      });

    if (sortMode === 'za') {
      list.sort(function (a, b) { return b.name.localeCompare(a.name); });
    } else if (sortMode === 'category') {
      list.sort(function (a, b) {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });
    } else { // 'az'
      list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    return list;
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      sortMode = sortSelect.value;
      render();
    });
  }

  /* ---------------- table rendering ---------------- */
  function render() {
    var matches = filteredCommands();
    var visible = limit ? matches.slice(0, limit) : matches;
    var wrap = table ? table.parentElement : null;

    if (resultMeta) {
      var shown = visible.length;
      var total = allCommands.length;
      resultMeta.innerHTML = matches.length === total
        ? 'Showing <strong>' + shown + '</strong> of <strong>' + total + '</strong> commands'
        : 'Showing <strong>' + shown + '</strong> of <strong>' + matches.length +
          '</strong> matching commands <span>(' + total + ' total)</span>';
    }

    if (matches.length === 0) {
      if (wrap) wrap.style.display = 'none';
      if (emptyState) emptyState.classList.add('show');
      body.innerHTML = '';
      return;
    }
    if (wrap) wrap.style.display = '';
    if (emptyState) emptyState.classList.remove('show');

    body.innerHTML = visible.map(function (cmd) {
      var index = allCommands.indexOf(cmd);
      return '' +
        '<tr tabindex="0" data-index="' + index + '">' +
          '<td class="col-name"><span class="cmd-name"><span class="slash">/</span>' +
            escapeHtml(cmd.name) + '</span></td>' +
          '<td class="col-cat"><span class="cat-tag">' + escapeHtml(cmd.category) + '</span></td>' +
          '<td class="col-desc">' + escapeHtml(cmd.description) + '</td>' +
          '<td class="col-copy">' +
            '<button class="copy-btn" type="button" data-copy="' + escapeHtml(cmd.name) + '" ' +
              'aria-label="Copy /' + escapeHtml(cmd.name) + ' to clipboard">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>' +
              '<span class="copy-label">Copy</span>' +
            '</button>' +
          '</td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        copyCommand(btn);
      });
    });

    body.querySelectorAll('tr').forEach(function (row) {
      row.addEventListener('click', function () {
        openModal(allCommands[row.dataset.index], row);
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(allCommands[row.dataset.index], row);
        }
      });
    });
  }

  /* ---------------- copy to clipboard ---------------- */
  function copyCommand(btn) {
    var text = '/' + btn.dataset.copy;
    var label = btn.querySelector('.copy-label');

    function done() {
      btn.classList.add('copied');
      if (label) label.textContent = 'Copied!';
      setTimeout(function () {
        btn.classList.remove('copied');
        if (label) label.textContent = 'Copy';
      }, 1600);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* clipboard unavailable */ }
    document.body.removeChild(area);
  }

  /* ---------------- detail modal ---------------- */
  function openModal(cmd, row) {
    if (!modalOverlay || !modalBody || !cmd) return;
    lastFocusedRow = row || null;

    var argsHtml = cmd.arguments.length
      ? cmd.arguments.map(function (a) {
          return '<div class="arg-row">' +
            '<div>' +
              '<div class="arg-name">' + escapeHtml(a.name) + '</div>' +
              '<div class="arg-desc">' + escapeHtml(a.description) + '</div>' +
            '</div>' +
            '<span class="arg-badge ' + (a.required ? 'required' : 'optional') + '">' +
              (a.required ? 'required' : 'optional') + '</span>' +
          '</div>';
        }).join('')
      : '<p class="muted-note">This command takes no arguments.</p>';

    var permsHtml = cmd.permissions.length
      ? '<div class="perm-list">' + cmd.permissions.map(function (p) {
          return '<span class="perm-chip">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>' +
            escapeHtml(p) + '</span>';
        }).join('') + '</div>'
      : '<p class="muted-note">No special permissions required — anyone can use this.</p>';

    var usageHtml = cmd.usage_count !== null && cmd.usage_count > 0
      ? '<div class="modal-section"><h4>usage</h4><p class="muted-note">' +
        cmd.usage_count.toLocaleString() + ' uses</p></div>'
      : '';

    modalBody.innerHTML =
      '<span class="cat-tag">' + escapeHtml(cmd.category) + '</span>' +
      '<div class="cmd-name" id="modalTitle"><span class="slash">/</span>' + escapeHtml(cmd.name) + '</div>' +
      '<p class="cmd-desc">' + escapeHtml(cmd.description) + '</p>' +
      usageHtml +
      '<div class="modal-section"><h4>arguments</h4>' + argsHtml + '</div>' +
      '<div class="modal-section"><h4>permissions required</h4>' + permsHtml + '</div>';

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (modalClose) modalClose.focus();
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocusedRow && document.contains(lastFocusedRow)) lastFocusedRow.focus();
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ---------------- search ---------------- */
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchTerm = searchInput.value;
      render();
    });
  }

  loadCommands();
})();
