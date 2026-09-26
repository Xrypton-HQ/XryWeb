(function () {
  'use strict';

  var modePick = document.getElementById('modePick');
  var editor = document.getElementById('editor');
  var normalForm = document.getElementById('normalForm');
  var v2Panel = document.getElementById('v2Panel');
  var v2Json = document.getElementById('v2Json');
  var v2Status = document.getElementById('v2Status');

  var state = {
    mode: 'normal',
    content: '',
    embedOn: true,
    color: '#8b5cf6',
    title: '',
    desc: '',
    authorName: '',
    authorIcon: '',
    thumb: '',
    image: '',
    footerText: '',
    footerIcon: '',
    timestamp: false,
    fields: [],
    buttons: []
  };

  try {
    var saved = JSON.parse(localStorage.getItem('hollow-embed-draft') || 'null');
    if (saved && typeof saved === 'object') Object.assign(state, saved, { mode: 'normal' });
  } catch (e) {  }

  function save() {
    try { localStorage.setItem('hollow-embed-draft', JSON.stringify(state)); } catch (e) {}
  }

  function $(id) { return document.getElementById(id); }

  function show(mode) {
    state.mode = mode;
    modePick.hidden = true;
    editor.hidden = false;
    normalForm.hidden = mode !== 'normal';
    v2Panel.hidden = mode !== 'v2';
    window.scrollTo(0, 0);
    render();
  }

  document.querySelectorAll('.mode-card').forEach(function (card) {
    card.addEventListener('click', function () { show(card.dataset.mode); });
  });

  $('backBtn').addEventListener('click', function () {
    editor.hidden = true;
    modePick.hidden = false;
    window.scrollTo(0, 0);
  });

  var bindings = [
    ['fContent', 'content'],
    ['fTitle', 'title'],
    ['fDesc', 'desc'],
    ['fAuthorName', 'authorName'],
    ['fAuthorIcon', 'authorIcon'],
    ['fThumb', 'thumb'],
    ['fImage', 'image'],
    ['fFooterText', 'footerText'],
    ['fFooterIcon', 'footerIcon']
  ];

  bindings.forEach(function (pair) {
    var el = $(pair[0]);
    el.value = state[pair[1]] || '';
    el.addEventListener('input', function () {
      state[pair[1]] = el.value;
      save();
      render();
    });
  });

  $('fEmbedOn').checked = state.embedOn;
  $('fEmbedOn').addEventListener('change', function () {
    state.embedOn = this.checked;
    $('embedFields').hidden = !this.checked;
    save();
    render();
  });
  $('embedFields').hidden = !state.embedOn;

  $('fTimestamp').checked = state.timestamp;
  $('fTimestamp').addEventListener('change', function () {
    state.timestamp = this.checked;
    save();
    render();
  });

  $('fColor').value = state.color;
  $('fColorHex').value = state.color;

  $('fColor').addEventListener('input', function () {
    state.color = this.value;
    $('fColorHex').value = this.value;
    save();
    render();
  });

  $('fColorHex').addEventListener('input', function () {
    var val = this.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      state.color = val.toLowerCase();
      $('fColor').value = val;
      save();
      render();
    }
  });

  function renderFieldList() {
    var list = $('fieldList');
    $('fieldCount').textContent = state.fields.length + ' / 25';
    list.innerHTML = state.fields.map(function (f, i) {
      return '' +
        '<div class="item-card" data-i="' + i + '">' +
          '<input type="text" data-key="name" maxlength="256" placeholder="Field name" value="' + escapeAttr(f.name) + '">' +
          '<input type="text" data-key="value" maxlength="1024" placeholder="Field value" value="' + escapeAttr(f.value) + '">' +
          '<label class="inline-check"><input type="checkbox" data-key="inline"' + (f.inline ? ' checked' : '') + '> inline</label>' +
          '<button type="button" class="remove-btn" data-remove="field" aria-label="Remove field">&times;</button>' +
        '</div>';
    }).join('');
  }

  $('addField').addEventListener('click', function () {
    if (state.fields.length >= 25) return;
    state.fields.push({ name: '', value: '', inline: true });
    save();
    renderFieldList();
    render();
  });

  function renderButtonList() {
    var list = $('buttonList');
    $('buttonCount').textContent = state.buttons.length + ' / 5';
    list.innerHTML = state.buttons.map(function (b, i) {
      return '' +
        '<div class="item-card" data-i="' + i + '">' +
          '<input type="text" data-key="label" maxlength="80" placeholder="Button label" value="' + escapeAttr(b.label) + '">' +
          '<select data-key="style">' +
            option('primary', b.style) + option('secondary', b.style) +
            option('success', b.style) + option('danger', b.style) + option('link', b.style) +
          '</select>' +
          '<input type="url" data-key="url" placeholder="URL (required for link)" value="' + escapeAttr(b.url) + '">' +
          '<button type="button" class="remove-btn" data-remove="button" aria-label="Remove button">&times;</button>' +
        '</div>';
    }).join('');
  }

  function option(value, current) {
    return '<option value="' + value + '"' + (current === value ? ' selected' : '') + '>' + value + '</option>';
  }

  $('addButton').addEventListener('click', function () {
    if (state.buttons.length >= 5) return;
    state.buttons.push({ label: '', style: 'primary', url: '' });
    save();
    renderButtonList();
    render();
  });

  function handleListEvent(e) {
    var card = e.target.closest('.item-card');
    if (!card) return;
    var i = parseInt(card.dataset.i, 10);
    var kind = card.closest('#fieldList') ? 'fields' : 'buttons';

    if (e.target.dataset.remove) {
      state[kind].splice(i, 1);
      save();
      kind === 'fields' ? renderFieldList() : renderButtonList();
      render();
      return;
    }

    var key = e.target.dataset.key;
    if (key) {
      state[kind][i][key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      save();
      render();
    }
  }

  $('fieldList').addEventListener('input', handleListEvent);
  $('fieldList').addEventListener('change', handleListEvent);
  $('fieldList').addEventListener('click', handleListEvent);
  $('buttonList').addEventListener('input', handleListEvent);
  $('buttonList').addEventListener('change', handleListEvent);
  $('buttonList').addEventListener('click', handleListEvent);

  function markdown(text) {
    var out = escapeHtml(text);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
  }

  function toggle(el, on) { el.hidden = !on; }

  function render() {
    var pvContent = $('pvContent');
    pvContent.innerHTML = markdown(state.content);
    toggle(pvContent, !!state.content.trim());

    var showEmbed = state.embedOn && (state.title || state.desc || state.authorName ||
      state.footerText || state.thumb || state.image || state.fields.length);
    toggle($('pvEmbed'), showEmbed);
    if (showEmbed) {
      $('pvEmbed').style.borderLeftColor = state.color;

      toggle($('pvAuthor'), !!state.authorName);
      $('pvAuthorName').textContent = state.authorName;
      var aIcon = $('pvAuthorIcon');
      aIcon.src = state.authorIcon;
      toggle(aIcon, !!state.authorIcon);

      toggle($('pvTitle'), !!state.title);
      $('pvTitle').textContent = state.title;
      $('pvTitle').href = '';

      toggle($('pvDesc'), !!state.desc);
      $('pvDesc').innerHTML = markdown(state.desc);

      var thumb = $('pvThumb');
      thumb.src = state.thumb;
      toggle(thumb, !!state.thumb);

      var image = $('pvImage');
      image.src = state.image;
      toggle(image, !!state.image);

      $('pvFields').innerHTML = state.fields
        .filter(function (f) { return f.name || f.value; })
        .map(function (f) {
          return '<div class="d-field' + (f.inline ? ' inline' : '') + '">' +
            '<strong>' + escapeHtml(f.name) + '</strong>' +
            '<span>' + escapeHtml(f.value) + '</span></div>';
        }).join('');

      var foot = !!(state.footerText || state.footerIcon || state.timestamp);
      toggle($('pvFoot'), foot);
      $('pvFootText').textContent = state.footerText;
      $('pvFootText').hidden = !state.footerText;
      var fIcon = $('pvFootIcon');
      fIcon.src = state.footerIcon;
      toggle(fIcon, !!state.footerIcon);
      $('pvTime').textContent = state.timestamp ? ' • ' + new Date().toLocaleString([], {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
      }) : '';
    }

    var styles = {
      primary: '#5865f2', secondary: '#4e5058',
      success: '#248046', danger: '#da373c', link: '#4e5058'
    };
    $('pvButtons').innerHTML = state.buttons
      .filter(function (b) { return b.label; })
      .map(function (b) {
        return '<span class="d-btn" style="background:' + (styles[b.style] || styles.primary) + '">' +
          escapeHtml(b.label) + (b.style === 'link' ? ' ↗' : '') + '</span>';
      }).join('');

    $('contentCount').textContent = state.content.length + ' / 2000';
  }

  function exportPayload() {
    var out = {};
    if (state.content) out.content = state.content;

    if (state.embedOn) {
      var e = {};
      if (state.title) e.title = state.title;
      if (state.desc) e.description = state.desc;
      var colour = parseInt(String(state.color).replace('#', ''), 16);
      e.color = isNaN(colour) ? 9159291 : colour;
      if (state.authorName) e.author = { name: state.authorName };
      if (state.authorIcon) e.author.icon_url = state.authorIcon;
      if (state.thumb) e.thumbnail = { url: state.thumb };
      if (state.image) e.image = { url: state.image };
      if (state.footerText) e.footer = { text: state.footerText };
      if (state.footerIcon) e.footer.icon_url = state.footerIcon;
      if (state.timestamp) e.timestamp = new Date().toISOString();
      if (state.fields.length) {
        e.fields = state.fields
          .filter(function (f) { return f.name && f.value; })
          .map(function (f) { return { name: f.name, value: f.value, inline: !!f.inline }; });
      }
      if (Object.keys(e).length) out.embeds = [e];
    }

    if (state.buttons.length) {
      var styleMap = { primary: 1, secondary: 2, success: 3, danger: 4, link: 5 };
      out.components = [{
        type: 1,
        components: state.buttons
          .filter(function (b) { return b.label; })
          .map(function (b) {
            var c = { type: 2, label: b.label, style: styleMap[b.style] || 1 };
            if (b.url) c.url = b.url;
            return c;
          })
      }];
    }

    return out;
  }

  function copyText(text, btn, done) {
    function ok() {
      var old = btn.textContent;
      btn.textContent = done || 'Copied!';
      setTimeout(function () { btn.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () { legacy(text, ok); });
    } else {
      legacy(text, ok);
    }
  }

  function legacy(text, done) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(area);
  }

  $('copyJson').addEventListener('click', function () {
    copyText(JSON.stringify(exportPayload(), null, 2), this, 'Copied JSON!');
  });

  $('copyScript').addEventListener('click', function () {
    if (state.mode === 'v2') {
      copyText(',embed send ' + (v2Json.value || '{}'), this, 'Copied!');
    } else {
      copyText(',embed send ' + JSON.stringify(exportPayload()), this, 'Copied!');
    }
  });

  $('clearBtn').addEventListener('click', function () {
    if (state.mode === 'v2') {
      v2Json.value = '';
      validateV2();
      return;
    }
    Object.assign(state, {
      content: '', embedOn: true, color: '#8b5cf6', title: '', desc: '',
      authorName: '', authorIcon: '', thumb: '', image: '',
      footerText: '', footerIcon: '', timestamp: false, fields: [], buttons: []
    });
    bindings.forEach(function (p) { $(p[0]).value = ''; });
    $('fColor').value = '#8b5cf6';
    $('fColorHex').value = '#8b5cf6';
    $('fEmbedOn').checked = true;
    $('embedFields').hidden = false;
    $('fTimestamp').checked = false;
    renderFieldList();
    renderButtonList();
    save();
    render();
  });

  var importOverlay = $('importOverlay');

  function openImport() {
    importOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('importText').focus();
  }

  function closeImport() {
    importOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  $('openScript').addEventListener('click', openImport);
  $('importBtn').addEventListener('click', openImport);
  $('importClose').addEventListener('click', closeImport);
  importOverlay.addEventListener('click', function (e) {
    if (e.target === importOverlay) closeImport();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeImport();
  });

  $('importLoad').addEventListener('click', function () {
    var status = $('importStatus');
    var data;
    try {
      data = JSON.parse($('importText').value);
    } catch (err) {
      status.textContent = 'That is not valid JSON — check for a missing comma or bracket.';
      status.classList.add('bad');
      return;
    }

    state.content = data.content || '';
    var emb = (data.embeds && data.embeds[0]) || {};
    state.embedOn = !!data.embeds;
    state.title = emb.title || '';
    state.desc = emb.description || '';
    state.color = typeof emb.color === 'number'
      ? '#' + emb.color.toString(16).padStart(6, '0')
      : (/^#[0-9a-fA-F]{6}$/.test(emb.color) ? emb.color : '#8b5cf6');
    state.authorName = (emb.author && emb.author.name) || '';
    state.authorIcon = (emb.author && emb.author.icon_url) || '';
    state.thumb = (emb.thumbnail && emb.thumbnail.url) || '';
    state.image = (emb.image && emb.image.url) || '';
    state.footerText = (emb.footer && emb.footer.text) || '';
    state.footerIcon = (emb.footer && emb.footer.icon_url) || '';
    state.timestamp = !!emb.timestamp;
    state.fields = (emb.fields || []).map(function (f) {
      return { name: f.name || '', value: f.value || '', inline: !!f.inline };
    });

    var flat = [];
    (data.components || []).forEach(function (row) {
      (row.components || []).forEach(function (c) {
        if (c.type === 2) {
          var names = { 1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger', 5: 'link' };
          flat.push({ label: c.label || '', style: names[c.style] || 'primary', url: c.url || '' });
        }
      });
    });
    state.buttons = flat.slice(0, 5);

    bindings.forEach(function (p) { $(p[0]).value = state[p[1]] || ''; });
    $('fColor').value = state.color;
    $('fColorHex').value = state.color;
    $('fEmbedOn').checked = state.embedOn;
    $('embedFields').hidden = !state.embedOn;
    $('fTimestamp').checked = state.timestamp;
    renderFieldList();
    renderButtonList();
    save();

    status.textContent = 'Loaded — opening the editor…';
    status.classList.remove('bad');
    setTimeout(function () {
      closeImport();
      show('normal');
    }, 350);
  });

  function validateV2() {
    var raw = v2Json.value.trim();
    if (!raw) {
      v2Status.textContent = 'Paste your V2 JSON — it is validated as you type.';
      v2Status.classList.remove('good', 'bad');
      return;
    }
    try {
      JSON.parse(raw);
      v2Status.textContent = 'Looks good — valid JSON.';
      v2Status.classList.add('good');
      v2Status.classList.remove('bad');
    } catch (err) {
      v2Status.textContent = 'Invalid JSON: ' + err.message;
      v2Status.classList.add('bad');
      v2Status.classList.remove('good');
    }
  }

  v2Json.addEventListener('input', validateV2);

  renderFieldList();
  renderButtonList();
  $('fEmbedOn').dispatchEvent(new Event('change'));
  render();
})();
