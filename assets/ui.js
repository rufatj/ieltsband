/* ============================================================
   BAND — UI toolkit: icons, modal, toast, range picker
   ============================================================ */
(function (w) {
  'use strict';
  var C = w.Core;

  /* ---------- icons (16px stroke grid) ---------- */
  var P = function (d, extra) {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"' + (extra || '') + '>' + d + '</svg>';
  };
  var ICON = {
    overview: P('<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>'),
    progress: P('<path d="M3 17l5-6 4 3 5-8 4 5"/><path d="M3 21h18"/>'),
    activity: P('<rect x="3" y="4" width="18" height="17"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
    tests: P('<path d="M3 5h18M3 12h18M3 19h18"/>'),
    listening: P('<path d="M4 14v-2a8 8 0 0116 0v2"/><path d="M4 14h3v6H4zM17 14h3v6h-3z"/>'),
    reading: P('<path d="M12 6s-2-2-5-2H3v14h4c3 0 5 2 5 2s2-2 5-2h4V4h-4c-3 0-5 2-5 2zM12 6v14"/>'),
    writing: P('<path d="M4 20h16"/><path d="M15 4l5 5L9 20H4v-5z"/>'),
    speaking: P('<rect x="9" y="2" width="6" height="12"/><path d="M5 11a7 7 0 0014 0M12 18v4"/>'),
    finder: P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/><path d="M8.5 11l2 2 4-4"/>'),
    coach: P('<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>'),
    log: P('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M12 11v6M9 14h6"/>'),
    insights: P('<path d="M12 3a9 9 0 109 9h-9z"/><path d="M14 2a8 8 0 018 8h-8z"/>'),
    settings: P('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>'),
    connect: P('<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>'),
    chev: P('<path d="M9 6l6 6-6 6"/>'),
    chevL: P('<path d="M15 6l-6 6 6 6"/>'),
    chevD: P('<path d="M6 9l6 6 6-6"/>'),
    close: P('<path d="M6 6l12 12M18 6L6 18"/>'),
    copy: P('<rect x="9" y="9" width="12" height="12"/><path d="M15 5H3v12h2"/>'),
    download: P('<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 21h16"/>'),
    upload: P('<path d="M12 20V8M7 12l5-5 5 5"/><path d="M4 21h16"/>'),
    external: P('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'),
    check: P('<path d="M4 12l5 5L20 6"/>'),
    alert: P('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'),
    refresh: P('<path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 4v5h-5"/>'),
    sun: P('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>'),
    moon: P('<path d="M20 14a8.5 8.5 0 01-10-10 8.5 8.5 0 1010 10z"/>'),
    panel: P('<rect x="3" y="4" width="18" height="16"/><path d="M10 4v16"/>'),
    info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
    clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    target: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'),
    flame: P('<path d="M12 22c4 0 7-2.7 7-6.5 0-4.5-4-5.5-4-9.5-3 1-4 4-4 6-1-.7-1.5-2-1.5-3C7.5 10.5 5 12 5 15.5 5 19.3 8 22 12 22z"/>'),
    mail: P('<rect x="2" y="5" width="20" height="14"/><path d="M2 6l10 7 10-7"/>'),
    github: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.8 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.8-1.4-3.8-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 015.8 0C17.4 4.7 18.4 5 18.4 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.8-5.8 7.8-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.2l-7 8 8.3 10h-6.5l-5-6.2L4.6 21H1.4l7.5-8.6L1 3h6.7l4.6 5.7L17.5 3zm-1.1 16h1.8L7.7 4.8H5.8L16.4 19z"/></svg>',
    discord: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.3 5.3A16.8 16.8 0 0015.1 4l-.2.4a12.8 12.8 0 00-5.8 0L8.9 4a16.8 16.8 0 00-4.2 1.3C2 9.3 1.3 13.2 1.6 17a17 17 0 005.1 2.6l1-1.7a11 11 0 01-1.7-.8l.4-.3a12.1 12.1 0 0011.2 0l.4.3a11 11 0 01-1.7.8l1 1.7a17 17 0 005.1-2.6c.4-4.5-.7-8.3-3.1-11.7zM8.5 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2z"/></svg>',
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    key: P('<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M15 12v3"/>'),
    trend: P('<path d="M4 16l5-5 4 3 7-8"/><path d="M20 6h-4M20 6v4"/>'),
    doc: P('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    filter: P('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
    play: P('<path d="M7 4l13 8-13 8z"/>')
  };
  function icon(n, size) {
    var s = ICON[n] || '';
    if (size) s = s.replace(/width="\d+" height="\d+"/, 'width="' + size + '" height="' + size + '"');
    return s;
  }
  var SKILL_ICON = { listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking' };

  /* ---------- dom helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- toast ---------- */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  /* ---------- modal ---------- */
  function modal(title, bodyHtml, opts) {
    opts = opts || {};
    var veil = document.createElement('div');
    veil.className = 'veil';
    veil.innerHTML =
      '<div class="modal' + (opts.large ? ' lg' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-h"><h3>' + esc(title) + '</h3><div class="spacer"></div>' +
      '<button class="icobtn" data-x aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="modal-b">' + bodyHtml + '</div>' +
      (opts.footer ? '<div class="modal-f">' + opts.footer + '</div>' : '') +
      '</div>';
    document.body.appendChild(veil);
    function close() { veil.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    veil.addEventListener('click', function (e) { if (e.target === veil) close(); });
    $('[data-x]', veil).addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    if (opts.onOpen) opts.onOpen(veil, close);
    return { el: veil, close: close };
  }

  /* ---------- copy ---------- */
  function copy(text, label) {
    function ok() { toast(label || 'Copied'); }
    if (navigator.clipboard && w.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Copy failed — select the text manually'); }
      ta.remove();
    }
  }

  function download(text, filename, mime) {
    var b = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  }

  /* ---------- band pill ---------- */
  function bandPill(band, target, mode) {
    if (band == null) return '<span class="band-pill" style="color:var(--mute)">—</span>';
    var lv = C.bandLevel(band, target, mode);
    return '<span class="band-pill" style="color:' + C.levelColor(lv) + '">' + band.toFixed(1) + '</span>';
  }

  /* ============================================================
     RANGE CONTROL — presets, a free-text box, and a real calendar
     ============================================================ */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function rangeLabel(r) {
    if (r.preset === 'all') return 'All time';
    if (r.preset === 'days') return 'Last ' + r.days + ' days';
    if (r.preset === 'month') return MONTHS[r.month] + ' ' + r.year;
    return C.fmtDateShort(r.from) + ' – ' + C.fmtDateShort(r.to);
  }

  function rangeBounds(r, records) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (r.preset === 'all') {
      var dates = records.map(function (x) { return x.date; }).sort();
      return { from: dates[0] || C.iso(today), to: C.iso(today) };
    }
    if (r.preset === 'days') {
      var f = new Date(today.getTime()); f.setDate(f.getDate() - (r.days - 1));
      return { from: C.iso(f), to: C.iso(today) };
    }
    if (r.preset === 'month') {
      var a = new Date(r.year, r.month, 1), b = new Date(r.year, r.month + 1, 0);
      return { from: C.iso(a), to: C.iso(b) };
    }
    return { from: r.from, to: r.to };
  }

  /* parse "May", "may 2026", "54", "last 54 days" */
  function parseRangeText(s) {
    var t = String(s || '').trim().toLowerCase();
    if (!t) return null;
    var n = t.match(/(\d+)/);
    var monthIdx = -1;
    MONTHS.forEach(function (m, i) { if (t.indexOf(m.slice(0, 3).toLowerCase()) === 0 || t.indexOf(m.toLowerCase()) > -1) { if (monthIdx < 0) monthIdx = i; } });
    if (monthIdx >= 0) {
      var y = new Date().getFullYear();
      var ym = t.match(/(20\d\d)/);
      if (ym) y = +ym[1];
      return { preset: 'month', month: monthIdx, year: y };
    }
    if (n && !/[a-z]/.test(t.replace(/last|days?|day/g, '').trim())) {
      var d = Math.max(1, Math.min(1460, +n[1]));
      return { preset: 'days', days: d };
    }
    return null;
  }

  function mountRange(host, range, records, onChange) {
    function paint() {
      host.innerHTML =
        '<button class="chip' + (range.preset === 'days' && range.days === 30 ? ' on' : '') + '" data-p="30">30 days</button>' +
        '<button class="chip' + (range.preset === 'days' && range.days === 60 ? ' on' : '') + '" data-p="60">60 days</button>' +
        '<button class="chip' + (range.preset === 'days' && range.days === 90 ? ' on' : '') + '" data-p="90">90 days</button>' +
        '<button class="chip' + (range.preset === 'all' ? ' on' : '') + '" data-p="all">All</button>' +
        '<div class="range"><button class="chip' + (range.preset === 'month' || range.preset === 'custom' ? ' on' : '') + '" data-open>' +
        icon('activity', 14) + (range.preset === 'month' || range.preset === 'custom' ? rangeLabel(range) : 'Choose') + '</button></div>';

      $$('[data-p]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-p');
          if (v === 'all') { range.preset = 'all'; }
          else { range.preset = 'days'; range.days = +v; }
          paint(); onChange();
        });
      });
      $('[data-open]', host).addEventListener('click', function (e) {
        e.stopPropagation();
        openPop($('.range', host));
      });
    }

    function openPop(anchor) {
      if ($('.range-pop', anchor)) { $('.range-pop', anchor).remove(); return; }
      var pop = document.createElement('div');
      pop.className = 'range-pop';
      var view = range.preset === 'month' ? new Date(range.year, range.month, 1) : new Date();
      var pick = { from: range.preset === 'custom' ? range.from : null, to: range.preset === 'custom' ? range.to : null };
      var dayMap = {};
      records.forEach(function (r) { dayMap[r.date] = true; });

      function draw() {
        var y = view.getFullYear(), m = view.getMonth();
        var first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7;
        var days = new Date(y, m + 1, 0).getDate();
        var cells = '';
        for (var i = 0; i < lead; i++) cells += '<div class="cal-d off"></div>';
        for (var d = 1; d <= days; d++) {
          var ds = C.iso(new Date(y, m, d));
          var cls = 'cal-d';
          if (dayMap[ds]) cls += ' has';
          if (pick.from === ds || pick.to === ds) cls += ' sel';
          else if (pick.from && pick.to && ds > pick.from && ds < pick.to) cls += ' in';
          cells += '<button class="' + cls + '" data-d="' + ds + '">' + d + '</button>';
        }
        pop.innerHTML =
          '<div class="field" style="margin-bottom:14px"><label>Type a month or a number of days</label>' +
          '<input class="inp" data-txt placeholder="May 2026   ·   54" /></div>' +
          '<div class="cal-head"><b>' + MONTHS[m] + ' ' + y + '</b><div class="cal-nav">' +
          '<button data-prev>' + icon('chevL', 14) + '</button><button data-next>' + icon('chev', 14) + '</button></div></div>' +
          '<div class="cal">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<div class="cal-dow">' + x + '</div>'; }).join('') + cells + '</div>' +
          '<div class="btn-row" style="margin-top:14px">' +
          '<button class="btn sm" data-apply>Apply</button>' +
          '<button class="btn sm ghost" data-month>Whole month</button></div>' +
          '<div class="hint" data-st>' + (pick.from ? (pick.to ? C.fmtDate(pick.from) + ' to ' + C.fmtDate(pick.to) : 'Pick the end day') : 'Pick the first day, then the last.') + '</div>';

        $('[data-prev]', pop).addEventListener('click', function () { view.setMonth(view.getMonth() - 1); draw(); });
        $('[data-next]', pop).addEventListener('click', function () { view.setMonth(view.getMonth() + 1); draw(); });
        $$('[data-d]', pop).forEach(function (b) {
          b.addEventListener('click', function () {
            var ds = b.getAttribute('data-d');
            if (!pick.from || (pick.from && pick.to)) { pick.from = ds; pick.to = null; }
            else if (ds < pick.from) { pick.to = pick.from; pick.from = ds; }
            else pick.to = ds;
            draw();
          });
        });
        $('[data-month]', pop).addEventListener('click', function () {
          range.preset = 'month'; range.month = view.getMonth(); range.year = view.getFullYear();
          pop.remove(); paint(); onChange();
        });
        $('[data-apply]', pop).addEventListener('click', apply);
        var txt = $('[data-txt]', pop);
        txt.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          var r = parseRangeText(txt.value);
          if (!r) { txt.style.borderColor = 'var(--low)'; $('[data-st]', pop).textContent = 'Try a month name like "May 2026", or a number like 54.'; return; }
          Object.keys(range).forEach(function (k) { delete range[k]; });
          Object.keys(r).forEach(function (k) { range[k] = r[k]; });
          pop.remove(); paint(); onChange();
        });
        setTimeout(function () { txt.focus(); }, 40);
      }

      function apply() {
        if (!pick.from) return;
        range.preset = 'custom';
        range.from = pick.from;
        range.to = pick.to || pick.from;
        pop.remove(); paint(); onChange();
      }

      anchor.appendChild(pop);
      draw();
      setTimeout(function () {
        document.addEventListener('click', function away(e) {
          if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', away); }
        });
      }, 10);
    }

    paint();
  }

  /* ---------- animate a number ---------- */
  function countUp(node, to, decimals, ms) {
    if (to == null) { node.textContent = '—'; return; }
    var start = performance.now(), dur = ms || 900;
    function tick(t) {
      var k = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      node.textContent = (to * e).toFixed(decimals == null ? 1 : decimals);
      if (k < 1) requestAnimationFrame(tick);
      else node.textContent = to.toFixed(decimals == null ? 1 : decimals);
    }
    requestAnimationFrame(tick);
  }

  w.UI = {
    icon: icon, ICON: ICON, SKILL_ICON: SKILL_ICON, $: $, $$: $$, esc: esc,
    toast: toast, modal: modal, copy: copy, download: download, bandPill: bandPill,
    mountRange: mountRange, rangeBounds: rangeBounds, rangeLabel: rangeLabel, parseRangeText: parseRangeText,
    MONTHS: MONTHS, countUp: countUp
  };
})(window);
