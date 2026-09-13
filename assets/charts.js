/* ============================================================
   BAND — charts. Hand-built SVG so every mark obeys the palette.
   ============================================================ */
(function (w) {
  'use strict';
  var C = w.Core;

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  /* ---------- shared tooltip ---------- */
  var tipEl = null;
  function tip() {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl); }
    return tipEl;
  }
  function showTip(html, x, y) {
    var t = tip();
    t.innerHTML = html;
    t.classList.add('on');
    var r = t.getBoundingClientRect();
    var left = x + 14, top = y - r.height - 12;
    if (left + r.width > w.innerWidth - 10) left = x - r.width - 14;
    if (top < 10) top = y + 18;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('on'); }
  w.addEventListener('scroll', hideTip, true);

  /* ============================================================
     RING — circular band gauge, animated draw
     ============================================================ */
  function ring(host, band, color, delay) {
    // keep the value label that lives inside the host — only swap the svg
    var old = host.querySelector('svg');
    if (old) old.remove();
    var S = 96, R = 40, cx = S / 2, cy = S / 2;
    var svg = el('svg', { viewBox: '0 0 ' + S + ' ' + S, width: S, height: S });
    var circ = 2 * Math.PI * R;
    svg.appendChild(el('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 3 }));
    var arc = el('circle', {
      cx: cx, cy: cy, r: R, fill: 'none', stroke: color, 'stroke-width': 3,
      'stroke-linecap': 'butt', transform: 'rotate(-90 ' + cx + ' ' + cy + ')',
      'stroke-dasharray': circ, 'stroke-dashoffset': circ
    });
    arc.style.transition = 'stroke-dashoffset 1.05s cubic-bezier(.16,.84,.36,1)';
    svg.appendChild(arc);
    // 0.5-step ticks around the gauge
    for (var i = 0; i <= 9; i++) {
      var a = (i / 9) * Math.PI * 2 - Math.PI / 2;
      var r1 = R + 5, r2 = R + 8;
      svg.appendChild(el('line', {
        x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
        x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2,
        stroke: 'var(--line)', 'stroke-width': 1
      }));
    }
    host.insertBefore(svg, host.firstChild);
    var pct = band == null ? 0 : Math.max(0, Math.min(1, band / 9));
    setTimeout(function () { arc.setAttribute('stroke-dashoffset', circ * (1 - pct)); }, 60 + (delay || 0));
  }

  /* ============================================================
     LINE — band over time, one series per skill
     ============================================================ */
  function line(host, opts) {
    host.innerHTML = '';
    var dates = opts.dates || [];
    var series = opts.series || [];
    if (!dates.length) { host.innerHTML = emptyBox('No tests in this range.'); return; }

    var W = host.clientWidth || 760, H = opts.height || 300;
    var mL = 34, mR = 14, mT = 14, mB = 30;
    var iw = Math.max(40, W - mL - mR), ih = H - mT - mB;
    var yMin = opts.yMin != null ? opts.yMin : 4, yMax = 9;

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, preserveAspectRatio: 'none' });
    svg.style.overflow = 'visible';

    function X(i) { return mL + (dates.length === 1 ? iw / 2 : (i / (dates.length - 1)) * iw); }
    function Y(v) { return mT + ih - ((v - yMin) / (yMax - yMin)) * ih; }

    // y grid
    for (var b = yMin; b <= yMax; b += 1) {
      var y = Y(b);
      svg.appendChild(el('line', { x1: mL, y1: y, x2: mL + iw, y2: y, stroke: 'var(--line-soft)', 'stroke-width': 1 }));
      var lab = el('text', { x: mL - 8, y: y + 3.5, fill: 'var(--mute)', 'font-size': 10, 'text-anchor': 'end' });
      lab.textContent = b;
      svg.appendChild(lab);
    }

    // target line
    if (opts.target) {
      var ty = Y(opts.target);
      if (ty > mT && ty < mT + ih) {
        svg.appendChild(el('line', { x1: mL, y1: ty, x2: mL + iw, y2: ty, stroke: 'var(--paper)', 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: .45 }));
        var tl = el('text', { x: mL + 5, y: ty - 5, fill: 'var(--mute)', 'font-size': 9.5, 'text-anchor': 'start' });
        tl.textContent = 'target ' + opts.target;
        svg.appendChild(tl);
      }
    }

    // x labels — thin out to avoid collision
    var step = Math.max(1, Math.ceil(dates.length / Math.max(4, Math.floor(iw / 62))));
    var lastX = -1e9;
    dates.forEach(function (d, i) {
      var forced = (i === dates.length - 1);
      if (i % step && !forced) return;
      var x = X(i);
      if (x - lastX < 48) { if (!forced) return; }
      lastX = x;
      var t = el('text', { x: x, y: H - 10, fill: 'var(--mute)', 'font-size': 10, 'text-anchor': 'middle' });
      var dd = C.parseISO(d);
      t.textContent = opts.dayOnly ? dd.getDate() : C.fmtDateShort(d);
      svg.appendChild(t);
    });

    var totalPts = 0;
    series.forEach(function (s, si) {
      var pts = [];
      dates.forEach(function (d, i) {
        var v = s.values[d];
        if (v != null) pts.push({ i: i, v: v, d: d, meta: s.meta ? s.meta[d] : null });
      });
      if (!pts.length) return;
      totalPts += pts.length;

      // bridge gaps: a straight run through every recorded point
      var path = pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p.i) + ' ' + Y(p.v); }).join(' ');
      var stroke = s.color || 'var(--paper)';
      var pl = el('path', { d: path, fill: 'none', stroke: stroke, 'stroke-width': s.width || 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: s.dim ? .5 : 1 });
      var len = 0;
      try { svg.appendChild(pl); len = pl.getTotalLength ? pl.getTotalLength() : 0; } catch (e) { }
      if (len) {
        pl.style.strokeDasharray = len;
        pl.style.strokeDashoffset = len;
        pl.style.transition = 'stroke-dashoffset 1.05s cubic-bezier(.16,.84,.36,1) ' + (si * 90) + 'ms';
        setTimeout(function () { pl.style.strokeDashoffset = 0; }, 40);
      }

      pts.forEach(function (p, k) {
        var col = s.pointColor ? s.pointColor(p.v) : stroke;
        var g = el('g', { style: 'cursor:pointer' });
        var halo = el('circle', { cx: X(p.i), cy: Y(p.v), r: 11, fill: 'transparent' });
        var dot = el('circle', { cx: X(p.i), cy: Y(p.v), r: 3.4, fill: 'var(--panel)', stroke: col, 'stroke-width': 2 });
        dot.style.transition = 'r .18s cubic-bezier(.16,.84,.36,1), opacity .4s';
        dot.style.opacity = 0;
        setTimeout(function () { dot.style.opacity = 1; }, 380 + si * 90 + k * 22);
        g.appendChild(halo); g.appendChild(dot);
        g.addEventListener('mouseenter', function (e) {
          dot.setAttribute('r', 5.4);
          showTip(s.tipHtml ? s.tipHtml(p) : ('<b>' + C.fmtDate(p.d) + '</b>' + p.v), e.clientX, e.clientY);
        });
        g.addEventListener('mousemove', function (e) { showTip(s.tipHtml ? s.tipHtml(p) : ('<b>' + C.fmtDate(p.d) + '</b>' + p.v), e.clientX, e.clientY); });
        g.addEventListener('mouseleave', function () { dot.setAttribute('r', 3.4); hideTip(); });
        g.addEventListener('click', function () { hideTip(); if (s.onPick) s.onPick(p); });
        svg.appendChild(g);
      });
    });

    if (!totalPts) { host.innerHTML = emptyBox('No scores recorded in this range.'); return; }
    host.appendChild(svg);
  }

  /* ============================================================
     BARS — count or minutes per day
     ============================================================ */
  function bars(host, opts) {
    host.innerHTML = '';
    var data = opts.data || [];
    if (!data.length) { host.innerHTML = emptyBox('Nothing to plot yet.'); return; }
    var W = host.clientWidth || 700, H = opts.height || 190;
    var mL = 34, mR = 10, mT = 10, mB = 26;
    var iw = W - mL - mR, ih = H - mT - mB;
    var max = Math.max.apply(null, data.map(function (d) { return d.v; })) || 1;
    var bw = Math.max(2, Math.min(26, iw / data.length - 2));
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H });
    svg.style.overflow = 'visible';

    [0, .5, 1].forEach(function (f) {
      var y = mT + ih - f * ih;
      svg.appendChild(el('line', { x1: mL, y1: y, x2: mL + iw, y2: y, stroke: 'var(--line-soft)' }));
      var t = el('text', { x: mL - 7, y: y + 3.5, fill: 'var(--mute)', 'font-size': 10, 'text-anchor': 'end' });
      t.textContent = opts.fmtY ? opts.fmtY(max * f) : Math.round(max * f);
      svg.appendChild(t);
    });

    data.forEach(function (d, i) {
      var x = mL + (i / data.length) * iw + (iw / data.length - bw) / 2;
      var h = (d.v / max) * ih;
      var r = el('rect', { x: x, y: mT + ih, width: bw, height: 0, fill: d.color || 'var(--paper-dim)' });
      r.style.transition = 'height .7s cubic-bezier(.16,.84,.36,1) ' + (i * 12) + 'ms, y .7s cubic-bezier(.16,.84,.36,1) ' + (i * 12) + 'ms, opacity .2s';
      r.style.cursor = d.onPick ? 'pointer' : 'default';
      svg.appendChild(r);
      setTimeout(function () { r.setAttribute('height', Math.max(1, h)); r.setAttribute('y', mT + ih - Math.max(1, h)); }, 30);
      r.addEventListener('mouseenter', function (e) { r.style.opacity = .72; showTip(d.tip || d.label, e.clientX, e.clientY); });
      r.addEventListener('mousemove', function (e) { showTip(d.tip || d.label, e.clientX, e.clientY); });
      r.addEventListener('mouseleave', function () { r.style.opacity = 1; hideTip(); });
      if (d.onPick) r.addEventListener('click', function () { hideTip(); d.onPick(); });
    });

    var step = Math.max(1, Math.ceil(data.length / Math.max(3, Math.floor(iw / 56))));
    data.forEach(function (d, i) {
      if (i % step && i !== data.length - 1) return;
      var t = el('text', { x: mL + (i / data.length) * iw + (iw / data.length) / 2, y: H - 8, fill: 'var(--mute)', 'font-size': 10, 'text-anchor': 'middle' });
      t.textContent = d.label;
      svg.appendChild(t);
    });
    host.appendChild(svg);
  }

  /* ============================================================
     DONUT — share of practice by source or skill
     ============================================================ */
  function donut(host, items, opts) {
    host.innerHTML = '';
    opts = opts || {};
    if (!items.length) { host.innerHTML = emptyBox('No sources recorded yet.'); return; }
    var S = opts.size || 190, R = S / 2 - 4, r0 = R * 0.60, cx = S / 2, cy = S / 2;
    var svg = el('svg', { viewBox: '0 0 ' + S + ' ' + S, width: S, height: S });
    var total = items.reduce(function (a, b) { return a + b.n; }, 0) || 1;
    var shades = ['#F0F1F3', '#B9BCC2', '#8A8E96', '#63666D', '#45484E', '#2E3136', '#212329'];
    var acc = -Math.PI / 2;

    items.forEach(function (it, i) {
      var frac = it.n / total;
      var a0 = acc, a1 = acc + frac * Math.PI * 2;
      acc = a1;
      var col = it.color || shades[i % shades.length];
      var p = el('path', { d: arcPath(cx, cy, R, r0, a0, a1), fill: col, opacity: 0, style: 'cursor:pointer' });
      p.style.transition = 'opacity .5s cubic-bezier(.16,.84,.36,1) ' + (i * 65) + 'ms, transform .22s cubic-bezier(.16,.84,.36,1)';
      p.style.transformOrigin = cx + 'px ' + cy + 'px';
      svg.appendChild(p);
      setTimeout(function () { p.style.opacity = 1; }, 30);
      var mid = (a0 + a1) / 2;
      p.addEventListener('mouseenter', function (e) {
        p.style.transform = 'translate(' + (Math.cos(mid) * 4).toFixed(1) + 'px,' + (Math.sin(mid) * 4).toFixed(1) + 'px)';
        showTip('<b>' + it.name + '</b><div class="tip-row"><span>' + (opts.unit || 'tests') + '</span><span>' + it.n + '</span></div><div class="tip-row"><span>share</span><span>' + Math.round(frac * 100) + '%</span></div>', e.clientX, e.clientY);
      });
      p.addEventListener('mousemove', function (e) { showTip('<b>' + it.name + '</b><div class="tip-row"><span>' + (opts.unit || 'tests') + '</span><span>' + it.n + '</span></div><div class="tip-row"><span>share</span><span>' + Math.round(frac * 100) + '%</span></div>', e.clientX, e.clientY); });
      p.addEventListener('mouseleave', function () { p.style.transform = 'none'; hideTip(); });
      if (opts.onPick) p.addEventListener('click', function () { hideTip(); opts.onPick(it); });
    });

    if (opts.centre) {
      var t1 = el('text', { x: cx, y: cy - 2, fill: 'var(--paper)', 'text-anchor': 'middle', 'font-size': 26, 'font-family': 'var(--serif)' });
      t1.textContent = opts.centre;
      svg.appendChild(t1);
      var t2 = el('text', { x: cx, y: cy + 14, fill: 'var(--mute)', 'text-anchor': 'middle', 'font-size': 9.5, 'letter-spacing': '.1em' });
      t2.textContent = opts.centreLabel || '';
      svg.appendChild(t2);
    }
    host.appendChild(svg);
  }

  function arcPath(cx, cy, R, r0, a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 0.0001) a1 = a0 + Math.PI * 1.9999;
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
    var x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    var x2 = cx + Math.cos(a1) * r0, y2 = cy + Math.sin(a1) * r0;
    var x3 = cx + Math.cos(a0) * r0, y3 = cy + Math.sin(a0) * r0;
    return 'M' + x0 + ' ' + y0 + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 +
      ' L' + x2 + ' ' + y2 + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + x3 + ' ' + y3 + ' Z';
  }

  /* ============================================================
     HEATMAP — practice intensity, a week per column
     ============================================================ */
  function heatmap(host, opts) {
    host.innerHTML = '';
    var map = opts.map || {};
    var from = opts.from, to = opts.to;
    var dates = C.dateSeq(from, to);
    if (!dates.length) { host.innerHTML = emptyBox('Pick a range to see activity.'); return; }

    var metric = opts.metric || 'seconds';
    var vals = dates.map(function (d) { return map[d] ? (metric === 'seconds' ? map[d].seconds : map[d].count) : 0; }).filter(function (v) { return v > 0; });
    var max = vals.length ? Math.max.apply(null, vals) : 1;

    var wrap = document.createElement('div');
    wrap.className = 'hm-scroll';

    // months strip
    var monthRow = document.createElement('div');
    monthRow.className = 'hm-months';

    var grid = document.createElement('div');
    grid.className = 'hm';

    var first = C.parseISO(dates[0]);
    var lead = (first.getDay() + 6) % 7; // Monday-first
    var col = document.createElement('div'); col.className = 'hm-col';
    for (var i = 0; i < lead; i++) { var sp = document.createElement('div'); sp.className = 'hm-c empty'; col.appendChild(sp); }

    var lastMonth = -1;
    function pushMonthLabel(dd) {
      var m = document.createElement('div');
      m.style.cssText = 'width:13px;flex:0 0 13px;overflow:visible;white-space:nowrap';
      m.textContent = (dd.getMonth() !== lastMonth) ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dd.getMonth()] : '';
      lastMonth = dd.getMonth();
      monthRow.appendChild(m);
    }
    pushMonthLabel(first);
    dates.forEach(function (d, idx) {
      var dd = C.parseISO(d);
      var dow = (dd.getDay() + 6) % 7;
      if (dow === 0 && (idx > 0 || lead === 0)) {
        if (col.children.length) { grid.appendChild(col); pushMonthLabel(dd); }
        col = document.createElement('div'); col.className = 'hm-col';
      }
      var rec = map[d];
      var v = rec ? (metric === 'seconds' ? rec.seconds : rec.count) : 0;
      var cell = document.createElement('div');
      cell.className = 'hm-c';
      var lvl = 0;
      if (v > 0) { lvl = Math.min(4, Math.ceil((v / max) * 4)) || 1; cell.dataset.l = lvl; }
      cell.style.background = v > 0 ? heatShade(lvl) : 'var(--line-soft)';
      cell.dataset.date = d;
      if (v > 0) {
        cell.style.cursor = 'pointer';
        var bandsTxt = rec.bands.length ? rec.bands.map(function (b) { return b.toFixed(1); }).join(', ') : '—';
        var html = '<b>' + C.fmtDate(d) + '</b>' +
          '<div class="tip-row"><span>tests</span><span>' + rec.count + '</span></div>' +
          '<div class="tip-row"><span>time</span><span>' + C.fmtMins(rec.seconds) + '</span></div>' +
          '<div class="tip-row"><span>bands</span><span>' + bandsTxt + '</span></div>' +
          '<div class="tip-cta">Click to open this day</div>';
        cell.addEventListener('mouseenter', function (e) { showTip(html, e.clientX, e.clientY); });
        cell.addEventListener('mousemove', function (e) { showTip(html, e.clientX, e.clientY); });
        cell.addEventListener('mouseleave', hideTip);
        cell.addEventListener('click', function () { hideTip(); if (opts.onPick) opts.onPick(d); });
      } else {
        cell.addEventListener('mouseenter', function (e) { showTip('<b>' + C.fmtDate(d) + '</b><span class="dim">No practice logged</span>', e.clientX, e.clientY); });
        cell.addEventListener('mouseleave', hideTip);
      }
      col.appendChild(cell);
    });
    if (col.children.length) grid.appendChild(col);

    wrap.appendChild(monthRow);
    wrap.appendChild(grid);
    host.appendChild(wrap);

    var lg = document.createElement('div');
    lg.className = 'hm-legend';
    lg.innerHTML = '<span>Less</span>' +
      '<i style="background:var(--line-soft)"></i>' +
      [1, 2, 3, 4].map(function (l) { return '<i style="background:' + heatShade(l) + '"></i>'; }).join('') +
      '<span>More</span>' +
      '<span style="margin-left:auto">' + (metric === 'seconds' ? 'peak ' + C.fmtMins(max) : 'peak ' + max + ' tests') + '</span>';
    host.appendChild(lg);
  }

  function heatShade(l) {
    var dark = document.documentElement.getAttribute('data-theme') !== 'light';
    if (dark) return ['', '#33363C', '#5C6069', '#8F949C', '#EDEFF2'][l];
    return ['', '#D3D4D0', '#A0A29E', '#6A6C68', '#16171A'][l];
  }

  /* ============================================================
     ANSWER SPARK — 40 cells showing right / wrong / blank
     ============================================================ */
  function spark(host, record) {
    host.innerHTML = '';
    if (!record.answers || !record.answers.length) { host.innerHTML = '<span class="dim" style="font-size:12px">No answer key stored for this attempt.</span>'; return; }
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;gap:2px;flex-wrap:wrap';
    record.answers.forEach(function (a) {
      var j = C.judge(a.you, a.ans);
      var d = document.createElement('i');
      d.style.cssText = 'width:9px;height:9px;display:block;background:' +
        (j.state === 'correct' ? 'var(--high)' : j.state === 'wrong' ? 'var(--low)' : 'var(--line)');
      box.appendChild(d);
    });
    host.appendChild(box);
  }

  function emptyBox(msg) {
    return '<div style="padding:44px 16px;text-align:center;color:var(--mute);font-size:12.5px">' + msg + '</div>';
  }

  /* ---------- redraw on resize ---------- */
  var pending;
  w.addEventListener('resize', function () {
    clearTimeout(pending);
    pending = setTimeout(function () { if (w.App && w.App.redraw) w.App.redraw(); }, 180);
  });

  w.Charts = { ring: ring, line: line, bars: bars, donut: donut, heatmap: heatmap, spark: spark, showTip: showTip, hideTip: hideTip };
})(window);
