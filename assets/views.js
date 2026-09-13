/* ============================================================
   BAND — page renderers
   ============================================================ */
(function (w) {
  'use strict';
  var C = w.Core, U = w.UI, G = w.Charts, A = w.AI;
  var $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;

  var SKILL_TONE = {
    listening: 'var(--paper)',
    reading: 'var(--mid)',
    writing: 'var(--high)',
    speaking: 'var(--low)'
  };

  /* shared filter state */
  var F = {
    range: { preset: 'days', days: 90 },
    skills: { listening: true, reading: true, writing: true, speaking: true },
    sort: { col: 'date', dir: 'desc' },
    query: '',
    source: 'all',
    heatSkill: 'all',
    heatMetric: 'seconds',
    chartMode: 'all'
  };

  function S() { return C.State; }
  function recs() { return S().records; }
  function bounds() { return U.rangeBounds(F.range, recs()); }

  function filtered(opts) {
    opts = opts || {};
    var b = bounds();
    return recs().filter(function (r) {
      if (!opts.ignoreRange && !C.inRange(r, b.from, b.to)) return false;
      if (!opts.ignoreSkill && !F.skills[r.skill]) return false;
      if (opts.skill && r.skill !== opts.skill) return false;
      if (F.source !== 'all' && r.source !== F.source) return false;
      if (F.query) {
        var q = F.query.toLowerCase();
        if ((r.test + ' ' + r.source + ' ' + (r.url || '') + ' ' + (r.notes || '')).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function go(hash) { w.location.hash = hash; }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  function overview(host) {
    var all = recs();
    var per = C.bySkill(all);
    var target = S().target;
    var basis = S().basis;
    var mode = S().colormode;

    var hour = new Date().getHours();
    var greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    var totalSecs = all.reduce(function (s, r) { return s + (r.seconds || 0); }, 0);
    var days = {}; all.forEach(function (r) { days[r.date] = 1; });
    var streak = currentStreak(days);

    var ov = C.overallBand(per, basis);
    var ovPrev = previousOverall(all, basis);

    host.innerHTML =
      '<div class="hero">' +
      '<div>' +
      '<div style="margin-bottom:18px">' +
      '<div class="hello">' + greet + ', ' + esc(S().name || 'there') + '.</div>' +
      '<div class="hello-sub">' + overviewLede(all, per, target) + '</div>' +
      '</div>' +
      '<div class="rings">' + C.SKILLS.map(function (sk, i) { return ringCell(sk, per[sk], target, basis, mode, i); }).join('') + '</div>' +
      '</div>' +
      '<div class="overall">' +
      '<div>' +
      '<div class="colhead" style="margin-bottom:10px">Overall band</div>' +
      '<div class="overall-big serif"><span data-ov>' + (ov == null ? '—' : '0.0') + '</span><span class="of">of 9</span></div>' +
      (ovPrev != null && ov != null ? '<div class="delta" style="margin-top:10px;color:' + (ov >= ovPrev ? 'var(--high)' : 'var(--low)') + '">' +
        (ov >= ovPrev ? '▲' : '▼') + ' ' + Math.abs(ov - ovPrev).toFixed(1) + ' since the previous set</div>'
        : '<div class="delta dim" style="margin-top:10px">Not enough history to trend yet</div>') +
      '</div>' +
      '<div class="overall-row">' +
      '<span class="dim">Target</span>' +
      '<span class="target-edit" data-target>' + target.toFixed(1) + ' — change</span>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="stats">' +
      stat(all.length, 'tests logged') +
      stat(C.fmtMins(totalSecs), 'total practice') +
      stat(Object.keys(days).length, 'active days') +
      stat(streak + (streak === 1 ? ' day' : ' days'), 'current streak') +
      stat(gapToTarget(ov, target), 'to target') +
      '</div>' +

      '<div class="grid g-main">' +
      '<div class="card">' +
      '<div class="card-h"><h3>Band over time</h3><div class="spacer"></div><div class="chips" data-orange></div></div>' +
      '<div class="card-b"><div data-line style="min-height:300px"></div>' +
      '<div class="chips" style="margin-top:14px" data-legend></div></div>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card-h"><h3>Needs attention</h3></div>' +
      '<div class="card-b" data-attention></div>' +
      '</div>' +
      '</div>' +

      '<div class="grid g-main" style="margin-top:18px">' +
      '<div class="card">' +
      '<div class="card-h"><h3>Practice activity</h3><div class="spacer"></div>' +
      '<span class="dim" style="font-size:11px">' + U.rangeLabel(F.range) + '</span></div>' +
      '<div class="card-b" data-heat></div>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card-h"><h3>Latest attempts</h3><div class="spacer"></div>' +
      '<button class="btn sm ghost" data-alltests>See all</button></div>' +
      '<div class="card-b flush" data-recent></div>' +
      '</div>' +
      '</div>';

    // range chips
    U.mountRange($('[data-orange]', host), F.range, all, function () { overview(host); });

    // overall count-up
    if (ov != null) U.countUp($('[data-ov]', host), ov, 1, 1000);

    // rings
    $$('.ring-cell', host).forEach(function (cell, i) {
      var sk = cell.getAttribute('data-skill');
      var b = C.currentBand(per[sk], basis);
      G.ring($('.ring-wrap', cell), b, C.levelColor(C.bandLevel(b, target, mode)), i * 110);
      var v = $('.ring-val b', cell);
      if (b != null) U.countUp(v, b, 1, 950);
      cell.addEventListener('click', function () { go('#/skill/' + sk); });
    });

    $('[data-target]', host).addEventListener('click', editTarget);
    $('[data-alltests]', host).addEventListener('click', function () { go('#/tests'); });

    drawMainLine($('[data-line]', host), $('[data-legend]', host));
    drawAttention($('[data-attention]', host), per, target);
    drawHeat($('[data-heat]', host));
    drawRecent($('[data-recent]', host), all.slice().reverse().slice(0, 7));
  }

  function overviewLede(all, per, target) {
    if (!all.length) return 'Your file loaded but holds no readable attempts yet.';
    var missing = C.SKILLS.filter(function (s) { return !per[s].length; });
    var last = C.lastDate(all);
    var d = C.daysAgo(last);
    var bits = [];
    bits.push('Last logged ' + C.relDay(d) + ', ' + all.length + ' attempt' + (all.length === 1 ? '' : 's') + ' on file.');
    if (missing.length) bits.push('Nothing recorded yet for ' + missing.map(function (m) { return C.SKILL_LABEL[m].toLowerCase(); }).join(' or ') + '.');
    return bits.join(' ');
  }

  function stat(v, k) {
    return '<div class="stat"><div class="stat-v serif">' + esc(String(v)) + '</div><div class="stat-k">' + k + '</div></div>';
  }

  function gapToTarget(ov, target) {
    if (ov == null) return '—';
    var d = target - ov;
    if (d <= 0) return 'reached';
    return '+' + d.toFixed(1);
  }

  function ringCell(sk, list, target, basis, mode, i) {
    var b = C.currentBand(list, basis);
    var last = C.lastDate(list);
    var d = C.daysAgo(last);
    var rl = C.recencyLevel(d);
    return '<div class="ring-cell" data-skill="' + sk + '" tabindex="0">' +
      '<div class="ring-wrap"><div class="ring-val serif"><b>' + (b == null ? '—' : '0.0') + '</b></div></div>' +
      '<div class="ring-name">' + C.SKILL_LABEL[sk] + '</div>' +
      '<div class="ring-meta"><i class="recency" style="background:' + C.levelColor(rl) + '"></i>' +
      (list.length ? C.relDay(d) : 'no data') + '</div>' +
      '</div>';
  }

  function currentStreak(daysMap) {
    var n = 0, d = new Date(); d.setHours(0, 0, 0, 0);
    if (!daysMap[C.iso(d)]) d.setDate(d.getDate() - 1);
    var guard = 0;
    while (daysMap[C.iso(d)] && guard++ < 900) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function previousOverall(all, basis) {
    // overall computed on everything except the most recent attempt per skill
    var per = C.bySkill(all);
    var trimmed = {};
    C.SKILLS.forEach(function (s) {
      var sorted = per[s].slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      trimmed[s] = sorted.slice(1).reverse();
    });
    var any = C.SKILLS.some(function (s) { return trimmed[s].length; });
    return any ? C.overallBand(trimmed, basis) : null;
  }

  /* ---------- main line chart ---------- */
  function drawMainLine(host, legendHost) {
    var b = bounds();
    var list = recs().filter(function (r) { return C.inRange(r, b.from, b.to); });
    var showSkills = C.SKILLS.filter(function (s) { return F.skills[s]; });
    var dates = C.dateSeq(b.from, b.to);
    if (dates.length > 400) dates = dates.slice(dates.length - 400);

    var series = showSkills.map(function (sk) {
      var vals = {}, meta = {};
      list.filter(function (r) { return r.skill === sk && r.band != null; }).forEach(function (r) {
        if (vals[r.date] == null) { vals[r.date] = r.band; meta[r.date] = [r]; }
        else { meta[r.date].push(r); vals[r.date] = meta[r.date].reduce(function (s, x) { return s + x.band; }, 0) / meta[r.date].length; }
      });
      return {
        name: C.SKILL_LABEL[sk], color: SKILL_TONE[sk], values: vals, meta: meta,
        dim: showSkills.length > 1,
        tipHtml: function (p) {
          var rs = p.meta || [];
          var head = '<b>' + C.SKILL_LABEL[sk] + ' · ' + C.fmtDate(p.d) + '</b>';
          var rows = rs.map(function (r) {
            return '<div class="tip-row"><span>' + esc(shortName(r.test)) + '</span><span>' + (r.band != null ? r.band.toFixed(1) : '—') + '</span></div>' +
              (r.correct != null ? '<div class="tip-row"><span>raw</span><span>' + r.correct + '/' + r.total + '</span></div>' : '') +
              (r.seconds != null ? '<div class="tip-row"><span>time</span><span>' + C.fmtDur(r.seconds) + '</span></div>' : '');
          }).join('');
          return head + rows + '<div class="tip-cta">Click to open the attempt</div>';
        },
        onPick: function (p) { var rs = p.meta || []; if (rs[0]) go('#/test/' + rs[0].id); },
        pointColor: showSkills.length > 1 ? null : function (v) { return C.levelColor(C.bandLevel(v, S().target, S().colormode)); }
      };
    });

    G.line(host, {
      dates: dates, series: series, target: S().target, height: 300,
      dayOnly: F.range.preset === 'month'
    });

    if (legendHost) {
      legendHost.innerHTML = C.SKILLS.map(function (sk) {
        return '<button class="chip legend' + (F.skills[sk] ? '' : ' off') + '" data-sk="' + sk + '">' +
          '<i style="background:' + SKILL_TONE[sk] + '"></i>' + C.SKILL_LABEL[sk] + '</button>';
      }).join('') + (showSkills.length === 1 ? '<span class="dim" style="font-size:11px;margin-left:8px">Dots are coloured by band level</span>' : '');
      $$('[data-sk]', legendHost).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var sk = btn.getAttribute('data-sk');
          var onCount = C.SKILLS.filter(function (s) { return F.skills[s]; }).length;
          if (F.skills[sk] && onCount === 1) { C.SKILLS.forEach(function (s) { F.skills[s] = true; }); }
          else F.skills[sk] = !F.skills[sk];
          drawMainLine(host, legendHost);
        });
      });
    }
  }

  function shortName(t) { return String(t).length > 34 ? String(t).slice(0, 33) + '…' : t; }

  /* ---------- attention panel ---------- */
  function drawAttention(host, per, target) {
    var items = [];
    C.SKILLS.forEach(function (sk) {
      var last = C.lastDate(per[sk]);
      var d = C.daysAgo(last);
      var lv = C.recencyLevel(d);
      items.push({
        lv: lv, sk: sk,
        title: C.SKILL_LABEL[sk],
        body: per[sk].length ? 'Last practised ' + C.relDay(d) : 'Never practised',
        sort: d == null ? 999 : d
      });
    });

    // writing tasks tracked separately
    var wr = per.writing;
    [1, 2].forEach(function (tn) {
      var withTask = wr.filter(function (r) { return r.tasks && r.tasks.some(function (t) { return +t.task === tn; }); });
      if (!wr.length) return;
      var last = C.lastDate(withTask);
      var d = C.daysAgo(last);
      items.push({
        lv: C.recencyLevel(d), sk: 'writing',
        title: 'Writing Task ' + tn,
        body: withTask.length ? 'Last done ' + C.relDay(d) : 'No Task ' + tn + ' recorded',
        sort: d == null ? 998 : d
      });
    });

    items.sort(function (a, b) { return b.sort - a.sort; });

    host.innerHTML = items.map(function (it) {
      return '<button class="acc-h" data-sk="' + it.sk + '" style="padding:11px 0;width:100%;border-bottom:1px solid var(--line-soft)">' +
        '<i class="recency" style="background:' + C.levelColor(it.lv) + ';width:7px;height:7px;flex:0 0 7px"></i>' +
        '<div style="text-align:left"><b style="display:block">' + it.title + '</b>' +
        '<span class="dim" style="font-size:11.5px">' + it.body + '</span></div>' +
        '<div class="spacer"></div><span class="caret">' + icon('chev', 14) + '</span></button>';
    }).join('') +
      '<div class="hint" style="margin-top:14px">Green means practised within two days, amber three to four, red five or more.</div>';

    $$('[data-sk]', host).forEach(function (b) {
      b.addEventListener('click', function () { go('#/skill/' + b.getAttribute('data-sk')); });
    });
  }

  /* ---------- heatmap ---------- */
  function drawHeat(host) {
    var b = bounds();
    var list = recs().filter(function (r) { return F.heatSkill === 'all' || r.skill === F.heatSkill; });
    var map = C.daily(list, b.from, b.to);
    var box = document.createElement('div');
    host.innerHTML = '';
    var ctrl = document.createElement('div');
    ctrl.className = 'chips';
    ctrl.style.marginBottom = '14px';
    ctrl.innerHTML = ['all'].concat(C.SKILLS).map(function (s) {
      return '<button class="chip' + (F.heatSkill === s ? ' on' : '') + '" data-h="' + s + '">' + (s === 'all' ? 'Everything' : C.SKILL_LABEL[s]) + '</button>';
    }).join('') +
      '<span style="width:14px"></span>' +
      '<button class="chip' + (F.heatMetric === 'seconds' ? ' on' : '') + '" data-m="seconds">By time</button>' +
      '<button class="chip' + (F.heatMetric === 'count' ? ' on' : '') + '" data-m="count">By tests</button>';
    host.appendChild(ctrl);
    host.appendChild(box);
    G.heatmap(box, {
      map: map, from: b.from, to: b.to, metric: F.heatMetric,
      onPick: function (d) { F.query = ''; go('#/tests?day=' + d); }
    });
    $$('[data-h]', ctrl).forEach(function (btn) {
      btn.addEventListener('click', function () { F.heatSkill = btn.getAttribute('data-h'); drawHeat(host); });
    });
    $$('[data-m]', ctrl).forEach(function (btn) {
      btn.addEventListener('click', function () { F.heatMetric = btn.getAttribute('data-m'); drawHeat(host); });
    });
  }

  /* ---------- recent list ---------- */
  function drawRecent(host, list) {
    if (!list.length) { host.innerHTML = '<div class="empty"><h4>Nothing yet</h4><p>Log your first test and it will appear here.</p></div>'; return; }
    host.innerHTML = list.map(function (r) {
      var lv = C.bandLevel(r.band, S().target, S().colormode);
      return '<button data-id="' + r.id + '" style="display:flex;align-items:center;gap:13px;width:100%;padding:12px 18px;border-bottom:1px solid var(--line-soft);text-align:left;transition:background .16s" onmouseover="this.style.background=\'var(--panel-2)\'" onmouseout="this.style.background=\'none\'">' +
        '<span style="color:var(--mute)">' + icon(U.SKILL_ICON[r.skill], 15) + '</span>' +
        '<span style="flex:1;min-width:0"><b style="display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.test) + '</b>' +
        '<span class="dim" style="font-size:11px">' + C.fmtDateShort(r.date) + ' · ' + esc(r.source) + '</span></span>' +
        '<span class="band-pill" style="color:' + C.levelColor(lv) + '">' + (r.band != null ? r.band.toFixed(1) : '—') + '</span>' +
        '</button>';
    }).join('');
    $$('[data-id]', host).forEach(function (b) {
      b.addEventListener('click', function () { go('#/test/' + b.getAttribute('data-id')); });
    });
  }

  /* ---------- target editor ---------- */
  function editTarget() {
    var opts = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
    U.modal('Target band', '<p class="hint" style="margin:0 0 16px">Everything on the dashboard is measured against this: the dotted line on the charts, the gap on the overview, and how the assistant marks your writing.</p>' +
      '<div class="chips">' + opts.map(function (o) {
        return '<button class="chip' + (S().target === o ? ' on' : '') + '" data-t="' + o + '">' + o.toFixed(1) + '</button>';
      }).join('') + '</div>', {
      onOpen: function (veil, close) {
        $$('[data-t]', veil).forEach(function (b) {
          b.addEventListener('click', function () {
            S().target = parseFloat(b.getAttribute('data-t'));
            S().save(); close(); w.App.redraw(); U.toast('Target set to band ' + S().target.toFixed(1));
          });
        });
      }
    });
  }

  /* ============================================================
     PROGRESS
     ============================================================ */
  function progress(host) {
    var all = recs();
    host.innerHTML =
      '<div class="toolbar"><div class="chips" data-orange></div><div class="spacer"></div>' +
      '<div class="chips" data-legend></div></div>' +
      '<div class="card"><div class="card-h"><h3>Band over time</h3><div class="spacer"></div>' +
      '<span class="dim" style="font-size:11px">Click any point to open that attempt</span></div>' +
      '<div class="card-b"><div data-line style="min-height:340px"></div><div class="chips" style="margin-top:14px" data-legend2></div></div></div>' +
      '<div class="grid g-2" style="margin-top:18px">' +
      '<div class="card"><div class="card-h"><h3>Papers per day</h3></div><div class="card-b"><div data-count></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Minutes per day</h3></div><div class="card-b"><div data-mins></div></div></div>' +
      '</div>' +
      '<div class="grid g-2" style="margin-top:18px">' +
      '<div class="card"><div class="card-h"><h3>Best and worst by skill</h3></div><div class="card-b" data-range></div></div>' +
      '<div class="card"><div class="card-h"><h3>Consistency</h3></div><div class="card-b" data-consist></div></div>' +
      '</div>';

    U.mountRange($('[data-orange]', host), F.range, all, function () { progress(host); });
    drawMainLine($('[data-line]', host), $('[data-legend2]', host));

    var b = bounds();
    var list = filtered();
    var map = C.daily(list, b.from, b.to);
    var seq = C.dateSeq(b.from, b.to);
    if (seq.length > 90) seq = seq.slice(seq.length - 90);

    G.bars($('[data-count]', host), {
      height: 180,
      fmtY: function (v) { return Math.round(v); },
      data: seq.map(function (d) {
        var rec = map[d];
        return {
          v: rec ? rec.count : 0, label: C.parseISO(d).getDate(),
          tip: '<b>' + C.fmtDate(d) + '</b><div class="tip-row"><span>papers</span><span>' + (rec ? rec.count : 0) + '</span></div>',
          onPick: rec ? function () { go('#/tests?day=' + d); } : null
        };
      })
    });

    G.bars($('[data-mins]', host), {
      height: 180,
      fmtY: function (v) { return Math.round(v / 60) + 'm'; },
      data: seq.map(function (d) {
        var rec = map[d];
        return {
          v: rec ? rec.seconds : 0, label: C.parseISO(d).getDate(),
          tip: '<b>' + C.fmtDate(d) + '</b><div class="tip-row"><span>time</span><span>' + (rec ? C.fmtMins(rec.seconds) : '0m') + '</span></div>',
          onPick: rec ? function () { go('#/tests?day=' + d); } : null
        };
      })
    });

    // best / worst
    var per = C.bySkill(list);
    $('[data-range]', host).innerHTML = C.SKILLS.map(function (sk) {
      var bands = per[sk].filter(function (r) { return r.band != null; }).map(function (r) { return r.band; });
      if (!bands.length) return '<div class="sitebar"><span class="sitebar-n">' + C.SKILL_LABEL[sk] + '</span><span class="dim" style="font-size:12px">no data</span></div>';
      var lo = Math.min.apply(null, bands), hi = Math.max.apply(null, bands);
      var left = ((lo - 4) / 5) * 100, wdt = ((hi - lo) / 5) * 100;
      return '<div class="sitebar"><span class="sitebar-n">' + C.SKILL_LABEL[sk] + '</span>' +
        '<span class="sitebar-t"><i style="left:' + Math.max(0, left) + '%;width:' + Math.max(2, wdt) + '%;background:' + SKILL_TONE[sk] + '"></i></span>' +
        '<span class="sitebar-v">' + lo.toFixed(1) + ' – ' + hi.toFixed(1) + '</span></div>';
    }).join('') + '<div class="hint">Scale runs from band 4 to band 9.</div>';

    // consistency
    $('[data-consist]', host).innerHTML = C.SKILLS.map(function (sk) {
      var bands = per[sk].filter(function (r) { return r.band != null; }).map(function (r) { return r.band; });
      if (bands.length < 2) return '<div class="sitebar"><span class="sitebar-n">' + C.SKILL_LABEL[sk] + '</span><span class="dim" style="font-size:12px">needs two or more attempts</span></div>';
      var m = bands.reduce(function (a, x) { return a + x; }, 0) / bands.length;
      var sd = Math.sqrt(bands.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0) / bands.length);
      var steady = Math.max(0, 1 - sd / 1.5);
      return '<div class="sitebar"><span class="sitebar-n">' + C.SKILL_LABEL[sk] + '</span>' +
        '<span class="sitebar-t"><i style="width:' + (steady * 100).toFixed(0) + '%;background:' + SKILL_TONE[sk] + '"></i></span>' +
        '<span class="sitebar-v">±' + sd.toFixed(2) + '</span></div>';
    }).join('') + '<div class="hint">A smaller spread means your band is predictable. Big swings usually mean pacing, not knowledge.</div>';
  }

  /* ============================================================
     ACTIVITY
     ============================================================ */
  function activity(host) {
    host.innerHTML =
      '<div class="toolbar"><div class="chips" data-orange></div></div>' +
      '<div class="card"><div class="card-h"><h3>Practice calendar</h3></div><div class="card-b" data-heat></div></div>' +
      '<div class="grid g-2" style="margin-top:18px">' +
      '<div class="card"><div class="card-h"><h3>Time by skill</h3></div><div class="card-b" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap"><div data-pie></div><div style="flex:1;min-width:170px" data-pielist></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>When you practise</h3></div><div class="card-b" data-dow></div></div>' +
      '</div>';

    U.mountRange($('[data-orange]', host), F.range, recs(), function () { activity(host); });
    drawHeat($('[data-heat]', host));

    var list = filtered();
    var mins = {};
    list.forEach(function (r) { mins[r.skill] = (mins[r.skill] || 0) + (r.seconds || 0); });
    var items = C.SKILLS.filter(function (s) { return mins[s]; }).map(function (s) {
      return { name: C.SKILL_LABEL[s], n: Math.round(mins[s] / 60), color: SKILL_TONE[s], skill: s };
    });
    var totalMin = items.reduce(function (a, b) { return a + b.n; }, 0);
    G.donut($('[data-pie]', host), items, {
      size: 180, unit: 'minutes', centre: totalMin ? (totalMin >= 600 ? Math.round(totalMin / 60) + 'h' : totalMin + 'm') : '—',
      centreLabel: 'logged', onPick: function (it) { go('#/skill/' + it.skill); }
    });
    $('[data-pielist]', host).innerHTML = items.length ? items.map(function (it) {
      return '<div class="sitebar"><span class="sitebar-n" style="width:auto;flex:1">' +
        '<i style="display:inline-block;width:9px;height:9px;background:' + it.color + ';margin-right:8px"></i>' + it.name + '</span>' +
        '<span class="sitebar-v">' + C.fmtMins(it.n * 60) + '</span></div>';
    }).join('') : '<span class="dim" style="font-size:12px">No durations recorded. Add a duration when you log a test and this fills in.</span>';

    // day-of-week bars
    var dow = [0, 0, 0, 0, 0, 0, 0];
    list.forEach(function (r) { var d = C.parseISO(r.date); if (d) dow[(d.getDay() + 6) % 7]++; });
    var names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    G.bars($('[data-dow]', host), {
      height: 190, fmtY: function (v) { return Math.round(v); },
      data: dow.map(function (v, i) {
        return { v: v, label: names[i], tip: '<b>' + names[i] + '</b><div class="tip-row"><span>papers</span><span>' + v + '</span></div>' };
      })
    });
  }

  /* ============================================================
     TESTS TABLE
     ============================================================ */
  function tests(host, params) {
    var dayFilter = params && params.day;
    var all = recs();
    var sources = C.sourceProfile(all).list;

    host.innerHTML =
      '<div class="toolbar">' +
      '<div class="search">' + icon('finder', 15) + '<input data-q placeholder="Search tests, sources, notes" value="' + esc(F.query) + '"></div>' +
      '<div class="chips" data-skills></div>' +
      '<div class="spacer"></div>' +
      '<select class="sel" data-src style="width:auto;padding:8px 34px 8px 12px;font-size:12px">' +
      '<option value="all">All sources</option>' +
      sources.map(function (s) { return '<option value="' + esc(s.name) + '"' + (F.source === s.name ? ' selected' : '') + '>' + esc(s.name) + ' (' + s.n + ')</option>'; }).join('') +
      '</select>' +
      '<div class="chips" data-orange></div>' +
      '</div>' +
      (dayFilter ? '<div class="note" style="margin-bottom:16px">Showing <b>' + C.fmtDate(dayFilter) + '</b> only. <button class="btn quiet sm" data-clearday style="padding:0 4px">Clear</button></div>' : '') +
      '<div class="card"><div class="card-b flush"><div class="tbl-wrap" data-tbl></div></div></div>';

    U.mountRange($('[data-orange]', host), F.range, all, function () { tests(host, params); });

    $('[data-skills]', host).innerHTML = C.SKILLS.map(function (sk) {
      return '<button class="chip' + (F.skills[sk] ? ' on' : '') + '" data-sk="' + sk + '">' + C.SKILL_LABEL[sk] + '</button>';
    }).join('');
    $$('[data-sk]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var sk = b.getAttribute('data-sk');
        var on = C.SKILLS.filter(function (s) { return F.skills[s]; }).length;
        if (F.skills[sk] && on === 1) C.SKILLS.forEach(function (s) { F.skills[s] = true; });
        else F.skills[sk] = !F.skills[sk];
        tests(host, params);
      });
    });

    var qIn = $('[data-q]', host);
    var qT;
    qIn.addEventListener('input', function () {
      clearTimeout(qT);
      qT = setTimeout(function () { F.query = qIn.value; paint(); }, 200);
    });
    $('[data-src]', host).addEventListener('change', function () { F.source = this.value; paint(); });
    if (dayFilter) $('[data-clearday]', host).addEventListener('click', function () { go('#/tests'); });

    function paint() {
      var list = filtered({ ignoreRange: !!dayFilter });
      if (dayFilter) list = list.filter(function (r) { return r.date === dayFilter; });
      list = sortList(list, F.sort);
      $('[data-tbl]', host).innerHTML = tableHtml(list);
      bindTable($('[data-tbl]', host), paint);
    }
    paint();
  }

  var COLS = [
    { k: 'date', label: 'Date' },
    { k: 'skill', label: 'Skill' },
    { k: 'test', label: 'Test' },
    { k: 'source', label: 'Source' },
    { k: 'correct', label: 'Raw' },
    { k: 'band', label: 'Band' },
    { k: 'seconds', label: 'Time' }
  ];

  function sortList(list, sort) {
    var dir = sort.dir === 'asc' ? 1 : -1;
    return list.slice().sort(function (a, b) {
      var x = a[sort.col], y = b[sort.col];
      if (sort.col === 'correct') { x = a.correct == null ? -1 : a.correct; y = b.correct == null ? -1 : b.correct; }
      if (sort.col === 'band') { x = a.band == null ? -1 : a.band; y = b.band == null ? -1 : b.band; }
      if (sort.col === 'seconds') { x = a.seconds == null ? -1 : a.seconds; y = b.seconds == null ? -1 : b.seconds; }
      if (typeof x === 'string') { x = x.toLowerCase(); y = String(y).toLowerCase(); }
      if (x < y) return -1 * dir;
      if (x > y) return 1 * dir;
      return a.date < b.date ? 1 : -1;
    });
  }

  function tableHtml(list) {
    if (!list.length) {
      return '<div class="empty">' + '<div class="empty-ico">' + icon('tests', 40) + '</div>' +
        '<h4>No attempts match</h4><p>Widen the date range, clear the search, or turn a skill back on.</p></div>';
    }
    var target = S().target, mode = S().colormode;
    return '<table class="tbl"><thead><tr>' +
      COLS.map(function (c) {
        var act = F.sort.col === c.k;
        return '<th class="sortable' + (act ? ' act ' + F.sort.dir : '') + '" data-c="' + c.k + '">' + c.label +
          '<span class="arrow">' + icon('chevD', 11) + '</span></th>';
      }).join('') + '<th style="width:36px"></th></tr></thead><tbody>' +
      list.map(function (r) {
        var lv = C.bandLevel(r.band, target, mode);
        return '<tr data-id="' + r.id + '">' +
          '<td class="num" style="white-space:nowrap">' + C.fmtDateShort(r.date) + ' <span class="dim">' + C.parseISO(r.date).getFullYear() + '</span></td>' +
          '<td><span class="skill-ico">' + icon(U.SKILL_ICON[r.skill], 15) + C.SKILL_LABEL[r.skill] + '</span></td>' +
          '<td><div class="ttl">' + esc(r.test) +
          (r.attemptsTotal > 1 ? '<span class="rep">' + r.attempt + ' of ' + r.attemptsTotal + '</span>' : '') + '</div></td>' +
          '<td class="src">' + esc(r.source) + '</td>' +
          '<td class="num">' + (r.correct != null ? r.correct + '<span class="dim">/' + r.total + '</span>' : '<span class="dim">—</span>') + '</td>' +
          '<td>' + U.bandPill(r.band, target, mode) + '</td>' +
          '<td class="num dim">' + (r.seconds != null ? C.fmtDur(r.seconds) : '—') + '</td>' +
          '<td><span class="row-go">' + icon('chev', 15) + '</span></td>' +
          '</tr>';
      }).join('') + '</tbody></table>';
  }

  function bindTable(host, repaint) {
    $$('th[data-c]', host).forEach(function (th) {
      th.addEventListener('click', function () {
        var c = th.getAttribute('data-c');
        if (F.sort.col === c) F.sort.dir = F.sort.dir === 'asc' ? 'desc' : 'asc';
        else { F.sort.col = c; F.sort.dir = (c === 'test' || c === 'source' || c === 'skill') ? 'asc' : 'desc'; }
        repaint();
      });
    });
    $$('tbody tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function () { go('#/test/' + tr.getAttribute('data-id')); });
    });
  }

  /* ============================================================
     SKILL PAGE
     ============================================================ */
  function skill(host, sk) {
    var all = recs().filter(function (r) { return r.skill === sk; });
    var target = S().target, mode = S().colormode, basis = S().basis;
    var b = bounds();
    var inr = all.filter(function (r) { return C.inRange(r, b.from, b.to); });
    var cur = C.currentBand(all, basis);
    var last = C.lastDate(all);
    var ep = C.errorProfile(inr);

    host.innerHTML =
      '<div class="toolbar"><div class="chips" data-orange></div><div class="spacer"></div>' +
      '<button class="btn sm ghost" data-coach>' + icon('coach', 14) + 'Ask the assistant about ' + C.SKILL_LABEL[sk].toLowerCase() + '</button></div>' +
      '<div class="stats">' +
      stat(cur == null ? '—' : cur.toFixed(1), 'current band') +
      stat(all.length, 'attempts') +
      stat(all.length ? C.relDay(C.daysAgo(last)) : '—', 'last practised') +
      stat(C.fmtMins(all.reduce(function (s, r) { return s + (r.seconds || 0); }, 0)), 'time on this skill') +
      stat(bestOf(all), 'best band') +
      '</div>' +
      '<div class="grid g-main">' +
      '<div class="card"><div class="card-h"><h3>' + C.SKILL_LABEL[sk] + ' over time</h3></div>' +
      '<div class="card-b"><div data-line style="min-height:280px"></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + (sk === 'writing' || sk === 'speaking' ? 'Criteria average' : 'Where marks go') + '</h3></div>' +
      '<div class="card-b" data-side></div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Every ' + C.SKILL_LABEL[sk].toLowerCase() + ' attempt</h3>' +
      '<div class="spacer"></div><span class="dim" style="font-size:11px">' + inr.length + ' in range</span></div>' +
      '<div class="card-b flush"><div class="tbl-wrap" data-tbl></div></div></div>';

    U.mountRange($('[data-orange]', host), F.range, recs(), function () { skill(host, sk); });
    $('[data-coach]', host).addEventListener('click', function () { go('#/coach?skill=' + sk); });

    // line
    var vals = {}, meta = {};
    inr.filter(function (r) { return r.band != null; }).forEach(function (r) {
      if (vals[r.date] == null) { vals[r.date] = r.band; meta[r.date] = [r]; }
      else { meta[r.date].push(r); vals[r.date] = meta[r.date].reduce(function (s, x) { return s + x.band; }, 0) / meta[r.date].length; }
    });
    G.line($('[data-line]', host), {
      dates: C.dateSeq(b.from, b.to), target: target, height: 280,
      dayOnly: F.range.preset === 'month',
      series: [{
        name: C.SKILL_LABEL[sk], color: 'var(--paper-dim)', values: vals, meta: meta, width: 1.4,
        pointColor: function (v) { return C.levelColor(C.bandLevel(v, target, mode)); },
        tipHtml: function (p) {
          var rs = p.meta || [];
          return '<b>' + C.fmtDate(p.d) + '</b>' + rs.map(function (r) {
            return '<div class="tip-row"><span>' + esc(shortName(r.test)) + '</span><span>' + (r.band != null ? r.band.toFixed(1) : '—') + '</span></div>' +
              (r.correct != null ? '<div class="tip-row"><span>raw</span><span>' + r.correct + '/' + r.total + '</span></div>' : '') +
              (r.seconds != null ? '<div class="tip-row"><span>time</span><span>' + C.fmtDur(r.seconds) + '</span></div>' : '');
          }).join('') + '<div class="tip-cta">Click to open the attempt</div>';
        },
        onPick: function (p) { if (p.meta && p.meta[0]) go('#/test/' + p.meta[0].id); }
      }]
    });

    // side panel
    var side = $('[data-side]', host);
    if (sk === 'writing' || sk === 'speaking') {
      var agg = {}, cnt = {};
      inr.forEach(function (r) {
        var src = r.criteria || (r.tasks && r.tasks[0] && r.tasks[0].criteria) || null;
        if (r.tasks) r.tasks.forEach(function (t) { if (t.criteria) Object.keys(t.criteria).forEach(function (k) { agg[k] = (agg[k] || 0) + (+t.criteria[k]); cnt[k] = (cnt[k] || 0) + 1; }); });
        if (r.criteria) Object.keys(r.criteria).forEach(function (k) { agg[k] = (agg[k] || 0) + (+r.criteria[k]); cnt[k] = (cnt[k] || 0) + 1; });
      });
      var keys = Object.keys(agg);
      side.innerHTML = keys.length ? keys.map(function (k) {
        var v = agg[k] / cnt[k];
        return critBar(k, v, target, mode);
      }).join('') + '<div class="hint">Averaged across ' + inr.length + ' attempt' + (inr.length === 1 ? '' : 's') + ' in this range.</div>'
        : '<span class="dim" style="font-size:12px">No criterion scores stored yet. Ask the logger to include them when you record a ' + sk + ' test.</span>';
    } else {
      side.innerHTML = ep.list.length ? ep.list.slice(0, 7).map(function (e) {
        return '<div class="sitebar"><span class="sitebar-n">' + esc(e.tag) + '</span>' +
          '<span class="sitebar-t"><i style="width:' + (e.pct * 100).toFixed(0) + '%;background:var(--low)"></i></span>' +
          '<span class="sitebar-v">' + e.n + ' · ' + Math.round(e.pct * 100) + '%</span></div>';
      }).join('') + '<div class="hint">' + ep.total + ' lost marks across ' + inr.length + ' paper' + (inr.length === 1 ? '' : 's') + '. Causes are worked out from your answer table.</div>'
        : '<span class="dim" style="font-size:12px">No answer tables stored in this range, so causes cannot be worked out. Include the answer table when you log a test.</span>';
    }

    var tb = $('[data-tbl]', host);
    function paint() {
      var l = sortList(inr, F.sort);
      tb.innerHTML = tableHtml(l);
      bindTable(tb, paint);
    }
    paint();
  }

  function bestOf(list) {
    var b = list.filter(function (r) { return r.band != null; }).map(function (r) { return r.band; });
    return b.length ? Math.max.apply(null, b).toFixed(1) : '—';
  }

  function critBar(name, v, target, mode) {
    var col = C.levelColor(C.bandLevel(v, target, mode));
    return '<div class="crit" style="color:' + col + '">' +
      '<div class="crit-h"><b style="color:var(--paper)">' + esc(name) + '</b><span>' + v.toFixed(1) + '</span></div>' +
      '<div class="crit-bar"><i data-w="' + ((v / 9) * 100).toFixed(1) + '"></i></div></div>';
  }

  function animateCrits(host) {
    setTimeout(function () {
      $$('.crit-bar i[data-w]', host).forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; });
    }, 60);
  }

  /* ============================================================
     TEST DETAIL
     ============================================================ */
  function detail(host, id) {
    var all = recs();
    var r = all.filter(function (x) { return x.id === id; })[0];
    if (!r) {
      host.innerHTML = '<div class="empty"><div class="empty-ico">' + icon('alert', 40) + '</div><h4>That attempt is not in the current file</h4>' +
        '<p>It may have come from an older upload. Load the file that contains it, or go back to the list.</p>' +
        '<button class="btn ghost" data-back>Back to all tests</button></div>';
      $('[data-back]', host).addEventListener('click', function () { go('#/tests'); });
      return;
    }
    var target = S().target, mode = S().colormode;
    var lv = C.bandLevel(r.band, target, mode);
    var peers = all.filter(function (x) { return x.skill === r.skill && x.date < r.date; });
    var cmp = comparison(r, peers);

    host.innerHTML =
      '<button class="btn quiet sm" data-back style="margin-bottom:14px">' + icon('chevL', 14) + 'Back</button>' +
      '<div class="grid g-main">' +
      '<div>' +
      '<div class="card"><div class="card-b">' +
      '<div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:230px">' +
      '<div class="skill-ico dim" style="font-size:11.5px;margin-bottom:7px">' + icon(U.SKILL_ICON[r.skill], 15) + C.SKILL_LABEL[r.skill] +
      (r.attemptsTotal > 1 ? '<span class="rep">attempt ' + r.attempt + ' of ' + r.attemptsTotal + '</span>' : '') + '</div>' +
      '<h2 class="serif" style="font-size:27px;line-height:1.2;margin-bottom:8px">' + esc(r.test) + '</h2>' +
      '<div class="dim" style="font-size:12.5px">' + C.fmtDate(r.date) + ' · ' + esc(r.source) +
      (r.seconds != null ? ' · ' + C.fmtDur(r.seconds) : '') + '</div>' +
      (r.url ? '<a class="btn sm ghost" style="margin-top:13px" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + icon('external', 14) + 'Open the test</a>' : '') +
      '</div>' +
      '<div style="text-align:right">' +
      '<div class="serif" style="font-size:58px;line-height:1;color:' + C.levelColor(lv) + '">' + (r.band != null ? r.band.toFixed(1) : '—') + '</div>' +
      (r.correct != null ? '<div class="dim num" style="font-size:13px;margin-top:4px">' + r.correct + ' of ' + r.total + ' correct</div>' : '') +
      '</div>' +
      '</div>' +
      (cmp ? '<div class="note ' + cmp.tone + '" style="margin-top:18px">' + cmp.html + '</div>' : '') +
      '</div></div>' +

      '<div data-body style="margin-top:18px"></div>' +
      '</div>' +

      '<div>' +
      '<div class="card"><div class="card-h"><h3>Assistant</h3></div><div class="card-b" data-ai></div></div>' +
      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>At a glance</h3></div><div class="card-b" data-glance></div></div>' +
      '</div>' +
      '</div>';

    $('[data-back]', host).addEventListener('click', function () { history.length > 1 ? history.back() : go('#/tests'); });

    var body = $('[data-body]', host);
    if (r.skill === 'reading' || r.skill === 'listening') body.innerHTML = answerBlock(r);
    else if (r.skill === 'writing') body.innerHTML = writingBlock(r, target, mode);
    else body.innerHTML = speakingBlock(r, target, mode);
    wireAcc(body);
    animateCrits(body);

    // glance
    var gl = $('[data-glance]', host);
    if (r.answers) {
      var ep = C.errorProfile([r]);
      gl.innerHTML = '<div data-spark style="margin-bottom:14px"></div>' +
        (ep.list.length ? ep.list.map(function (e) {
          return '<div class="sitebar"><span class="sitebar-n">' + esc(e.tag) + '</span>' +
            '<span class="sitebar-t"><i style="width:' + (e.pct * 100).toFixed(0) + '%;background:var(--low)"></i></span>' +
            '<span class="sitebar-v">' + e.n + '</span></div>';
        }).join('') : '<span class="dim" style="font-size:12px">A clean sheet.</span>');
      G.spark($('[data-spark]', gl), r);
      setTimeout(function () { $$('.sitebar-t i', gl).forEach(function (i) { i.style.width = i.style.width; }); }, 40);
    } else if (r.tasks || r.parts) {
      var units = r.tasks || r.parts;
      gl.innerHTML = units.map(function (u) {
        var ub = u.band != null ? +u.band : null;
        var text = u.essay || u.transcript || '';
        return '<div class="sitebar"><span class="sitebar-n">' + (r.tasks ? 'Task ' : 'Part ') + (u.task || u.part) + '</span>' +
          '<span class="sitebar-t"><i style="width:' + (ub != null ? ((ub / 9) * 100).toFixed(0) : 0) + '%;background:' + C.levelColor(C.bandLevel(ub, target, mode)) + '"></i></span>' +
          '<span class="sitebar-v">' + (ub != null ? ub.toFixed(1) : '—') + '</span></div>' +
          (text ? '<div class="hint" style="margin:-2px 0 12px">' + countWords(text) + ' words · ' + repeatedWords(text).replace(/<\/?span>/g, '') + '</div>' : '');
      }).join('') +
        (r.seconds != null ? '<div class="divider" style="margin:14px 0"></div><div class="sitebar"><span class="sitebar-n">Time taken</span><span class="sitebar-v">' + C.fmtDur(r.seconds) + '</span></div>' : '');
    } else {
      gl.innerHTML = '<span class="dim" style="font-size:12px">Only the band was recorded for this attempt.</span>';
    }

    // ai panel
    var ai = $('[data-ai]', host);
    renderAiPanel(ai, function (setOut, setBusy) {
      setBusy(true);
      A.analyseAttempt(r, all, target)
        .then(function (t) { setOut(A.md(t)); })
        .catch(function (e) { setOut('<div class="note bad">' + esc(e.message) + '</div>'); })
        .then(function () { setBusy(false); });
    }, 'Mark this attempt', 'A full examiner read of this paper, set against your earlier attempts at the same skill.');
  }

  function comparison(r, peers) {
    if (r.band == null || !peers.length) return null;
    var recent = peers.slice(-5).filter(function (x) { return x.band != null; });
    if (!recent.length) return null;
    var avg = recent.reduce(function (s, x) { return s + x.band; }, 0) / recent.length;
    var d = r.band - avg;
    var label = 'your average of ' + avg.toFixed(1) + ' across the previous ' + recent.length + ' ' + C.SKILL_LABEL[r.skill].toLowerCase() + ' paper' + (recent.length === 1 ? '' : 's');
    if (Math.abs(d) < 0.25) return { tone: '', html: 'This sits level with <b>' + label + '</b>.' };
    if (d > 0) return { tone: 'good', html: '<b>Up ' + d.toFixed(1) + '</b> on ' + label + '. Your best run in this skill so far is band ' + bestOf(peers.concat([r])) + '.' };
    return { tone: 'bad', html: '<b>Down ' + Math.abs(d).toFixed(1) + '</b> on ' + label + '. One dip is noise; two in a row is a pattern worth reading below.' };
  }

  /* ---------- reading / listening answers ---------- */
  function answerBlock(r) {
    if (!r.answers || !r.answers.length) {
      return '<div class="card"><div class="card-b"><div class="empty" style="padding:36px 20px">' +
        '<h4>No answer table stored</h4><p>Only the score was recorded for this attempt. Paste the answer table into the logger next time and every question will show up here.</p></div></div></div>';
    }
    var secs = C.SECTIONS[r.skill] || [[1, 40, 'All questions']];
    var byN = {};
    r.answers.forEach(function (a) { byN[a.n] = a; });

    return '<div class="card"><div class="card-h"><h3>Answer review</h3><div class="spacer"></div>' +
      '<span class="chips" style="gap:12px;font-size:11px">' +
      '<span class="dim"><i style="display:inline-block;width:8px;height:8px;background:var(--high);margin-right:6px"></i>correct</span>' +
      '<span class="dim"><i style="display:inline-block;width:8px;height:8px;background:var(--low);margin-right:6px"></i>wrong</span>' +
      '<span class="dim"><i style="display:inline-block;width:8px;height:8px;background:var(--line);margin-right:6px"></i>blank</span>' +
      '</span></div><div class="card-b">' +
      secs.map(function (s) {
        var from = s[0], to = s[1], name = s[2];
        var items = [];
        for (var n = from; n <= to; n++) if (byN[n]) items.push(byN[n]);
        if (!items.length) return '';
        var ok = items.filter(function (a) { return C.judge(a.you, a.ans).state === 'correct'; }).length;
        var blank = items.filter(function (a) { return C.judge(a.you, a.ans).state === 'blank'; }).length;
        return '<div class="qsec"><div class="qsec-h"><b>' + name + '</b>' +
          '<span>questions ' + from + '–' + to + ' · ' + ok + ' of ' + items.length + ' correct' + (blank ? ' · ' + blank + ' left blank' : '') + '</span></div>' +
          '<div class="qgrid">' + items.map(function (a) {
            var j = C.judge(a.you, a.ans);
            var cls = j.state === 'correct' ? 'ok' : j.state === 'wrong' ? 'no' : 'blank';
            var inner;
            if (j.state === 'correct') inner = '<b>' + esc(a.you) + '</b>';
            else if (j.state === 'blank') inner = '<b>not answered</b><em>' + esc(a.ans) + '</em>';
            else inner = '<s>' + esc(a.you) + '</s><em>' + esc(a.ans) + '</em>';
            return '<div class="q ' + cls + '"><div class="q-n num">' + a.n + '</div><div class="q-a">' + inner +
              (j.tag && j.state !== 'correct' ? '<div class="q-tag">' + esc(j.tag) + '</div>' : '') + '</div></div>';
          }).join('') + '</div></div>';
      }).join('') + '</div></div>';
  }

  /* ---------- writing ---------- */
  function writingBlock(r, target, mode) {
    if (!r.tasks || !r.tasks.length) {
      return '<div class="card"><div class="card-b"><div class="empty" style="padding:36px 20px"><h4>No task detail stored</h4>' +
        '<p>Only the overall band was recorded. Send your essay and the examiner feedback to the logger and both tasks will appear here in full.</p></div></div></div>';
    }
    return r.tasks.map(function (t) {
      var tb = t.band != null ? +t.band : null;
      var col = C.levelColor(C.bandLevel(tb, target, mode));
      var crits = t.criteria ? Object.keys(t.criteria) : [];
      return '<div class="acc open"><button class="acc-h"><span class="caret">' + icon('chev', 15) + '</span>' +
        '<b>Task ' + (t.task || 1) + '</b>' +
        (t.words ? '<span class="dim" style="font-size:11.5px">' + t.words + ' words</span>' : '') +
        '<div class="spacer"></div>' +
        '<span class="band-pill" style="color:' + col + '">' + (tb != null ? tb.toFixed(1) : '—') + '</span></button>' +
        '<div class="acc-b">' +
        (t.prompt ? '<div class="note" style="margin:14px 0 18px">' + esc(t.prompt) + '</div>' : '') +
        (crits.length ? '<div style="margin:16px 0 20px">' + crits.map(function (k) { return critBar(k, +t.criteria[k], target, mode); }).join('') + '</div>' : '') +
        (t.detail && t.detail.length ? '<div class="colhead" style="margin:20px 0 12px">Examiner notes</div>' +
          t.detail.map(function (d) {
            var dv = d.score != null ? +d.score : null;
            return '<div class="crit" style="color:' + C.levelColor(C.bandLevel(dv, target, mode)) + '">' +
              '<div class="crit-h"><b style="color:var(--paper)">' + esc(d.sub || d.criterion || 'Note') + '</b>' +
              '<span>' + (dv != null ? dv.toFixed(1) : '') + '</span></div>' +
              (dv != null ? '<div class="crit-bar"><i data-w="' + ((dv / 9) * 100).toFixed(1) + '"></i></div>' : '') +
              (d.comment ? '<div class="crit-note">' + esc(d.comment) + '</div>' : '') + '</div>';
          }).join('') : '') +
        (t.essay ? '<div class="colhead" style="margin:22px 0 10px">What you wrote</div>' +
          '<div class="essay">' + esc(t.essay) + '</div>' +
          '<div class="essay-meta"><span>' + (t.words || countWords(t.essay)) + ' words</span>' +
          repeatedWords(t.essay) + '</div>' : '') +
        (t.feedback ? '<div class="note" style="margin-top:18px">' + esc(t.feedback) + '</div>' : '') +
        '</div></div>';
    }).join('');
  }

  function countWords(s) { return (String(s).trim().match(/\S+/g) || []).length; }
  function repeatedWords(essay) {
    var stop = 'the a an of to in and or is are was were be been it its this that these those for on with as at by from which who whom whose not no but if then than so such there their they them he she his her you your we our i my'.split(' ');
    var m = {}, words = String(essay).toLowerCase().match(/[a-z']{4,}/g) || [];
    words.forEach(function (x) { if (stop.indexOf(x) < 0) m[x] = (m[x] || 0) + 1; });
    var top = Object.keys(m).filter(function (k) { return m[k] >= 3; }).sort(function (a, b) { return m[b] - m[a]; }).slice(0, 4);
    if (!top.length) return '<span>No word overused</span>';
    return '<span>Leaned on: ' + top.map(function (k) { return esc(k) + ' ×' + m[k]; }).join(', ') + '</span>';
  }

  /* ---------- speaking ---------- */
  function speakingBlock(r, target, mode) {
    var out = '';
    if (r.criteria) {
      out += '<div class="card"><div class="card-h"><h3>Criteria</h3></div><div class="card-b">' +
        Object.keys(r.criteria).map(function (k) { return critBar(k, +r.criteria[k], target, mode); }).join('') + '</div></div>';
    }
    if (!r.parts || !r.parts.length) {
      if (!out) out = '<div class="card"><div class="card-b"><div class="empty" style="padding:36px 20px"><h4>No part detail stored</h4>' +
        '<p>Only the overall band was recorded. Send the logger your answers or the feedback for each part and they will show here.</p></div></div></div>';
      return out;
    }
    out += '<div style="margin-top:18px">' + r.parts.map(function (p) {
      var pb = p.band != null ? +p.band : null;
      return '<div class="acc open"><button class="acc-h"><span class="caret">' + icon('chev', 15) + '</span>' +
        '<b>Part ' + (p.part || 1) + '</b><div class="spacer"></div>' +
        '<span class="band-pill" style="color:' + C.levelColor(C.bandLevel(pb, target, mode)) + '">' + (pb != null ? pb.toFixed(1) : '—') + '</span></button>' +
        '<div class="acc-b">' +
        (p.topic ? '<div class="note" style="margin:14px 0 16px">' + esc(p.topic) + '</div>' : '') +
        (p.transcript ? '<div class="colhead" style="margin:16px 0 10px">What you said</div><div class="essay">' + esc(p.transcript) + '</div>' +
          '<div class="essay-meta"><span>' + countWords(p.transcript) + ' words</span>' + repeatedWords(p.transcript) + '</div>' : '') +
        (p.feedback ? '<div class="note" style="margin-top:16px">' + esc(p.feedback) + '</div>' : '') +
        '</div></div>';
    }).join('') + '</div>';
    return out;
  }

  function wireAcc(host) {
    $$('.acc-h', host).forEach(function (h) {
      h.addEventListener('click', function () { h.parentNode.classList.toggle('open'); });
    });
  }

  /* ---------- reusable AI panel ---------- */
  function renderAiPanel(host, run, label, blurb) {
    if (!A.hasKey()) {
      host.innerHTML = '<div class="empty" style="padding:30px 10px"><div class="empty-ico">' + icon('key', 32) + '</div>' +
        '<h4>No key saved</h4><p>Add a free Groq or Google AI Studio key and the assistant will mark your work here.</p>' +
        '<button class="btn sm ghost" data-go>Add a key</button></div>';
      $('[data-go]', host).addEventListener('click', function () { go('#/settings'); });
      return;
    }
    host.innerHTML = '<p class="hint" style="margin:0 0 14px">' + blurb + '</p>' +
      '<button class="btn wide" data-run>' + icon('coach', 15) + label + '</button>' +
      '<div data-out style="margin-top:16px"></div>';
    var out = $('[data-out]', host), btn = $('[data-run]', host);
    btn.addEventListener('click', function () {
      run(function (html) { out.innerHTML = '<div class="ai-out">' + html + '</div>'; },
        function (busy) {
          btn.disabled = busy;
          btn.innerHTML = busy ? '<span class="spin" style="display:inline-flex">' + icon('refresh', 15) + '</span>Marking…' : icon('coach', 15) + label;
          if (busy) out.innerHTML = '<div class="shimmer" style="height:9px;margin-bottom:9px"></div><div class="shimmer" style="height:9px;width:80%;margin-bottom:9px"></div><div class="shimmer" style="height:9px;width:92%"></div>';
        });
    });
  }

  /* ============================================================
     TEST FINDER
     ============================================================ */
  function finder(host) {
    host.innerHTML =
      '<div class="grid g-main">' +
      '<div>' +
      '<div class="card"><div class="card-h"><h3>Have I done this one?</h3></div><div class="card-b">' +
      '<p class="hint" style="margin:0 0 14px">Paste the link to any practice test. If it is already in your file you will see the result; if not, you can start it straight away.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<input class="inp" data-url style="flex:1;min-width:240px" placeholder="https://engnovate.com/ielts-reading-tests/…">' +
      '<button class="btn" data-check>Check</button></div>' +
      '<div data-res></div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Find something new to do</h3></div><div class="card-b">' +
      '<p class="hint" style="margin:0 0 16px">The assistant reads everything you have already logged and suggests papers you have not touched.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      '<select class="sel" data-sk style="width:auto"><option value="any">Any skill</option>' +
      C.SKILLS.map(function (s) { return '<option value="' + s + '">' + C.SKILL_LABEL[s] + '</option>'; }).join('') + '</select>' +
      '<input class="inp" data-site style="flex:1;min-width:180px" placeholder="Preferred site (optional) — e.g. engnovate.com">' +
      '</div>' +
      '<button class="btn wide" data-find>' + icon('coach', 15) + 'Suggest tests</button>' +
      '<div data-findout style="margin-top:18px"></div>' +
      '</div></div>' +
      '</div>' +

      '<div><div class="card"><div class="card-h"><h3>Coverage</h3></div><div class="card-b" data-cov></div></div></div>' +
      '</div>';

    var res = $('[data-res]', host);
    function check() {
      var raw = $('[data-url]', host).value.trim();
      if (!raw) { res.innerHTML = ''; return; }
      var key = C.normUrl(raw);
      var hits = recs().filter(function (r) { return r.url && C.normUrl(r.url) === key; });
      if (!hits.length) {
        // try a looser match on the final slug
        var slug = key.split('/').filter(Boolean).pop();
        hits = recs().filter(function (r) { return r.url && C.normUrl(r.url).indexOf(slug) > -1; });
      }
      if (hits.length) {
        res.innerHTML = '<div class="finder-hit">' +
          '<div class="note good" style="margin-bottom:16px">You have done this <b>' + hits.length + ' time' + (hits.length === 1 ? '' : 's') + '</b>. Here is how it went.</div>' +
          hits.slice().reverse().map(function (r) {
            var lv = C.bandLevel(r.band, S().target, S().colormode);
            return '<button data-id="' + r.id + '" style="display:flex;align-items:center;gap:14px;width:100%;padding:12px 0;border-bottom:1px solid var(--line-soft);text-align:left">' +
              '<span style="color:var(--mute)">' + icon(U.SKILL_ICON[r.skill], 15) + '</span>' +
              '<span style="flex:1"><b style="display:block;font-size:12.5px">' + esc(r.test) + '</b>' +
              '<span class="dim" style="font-size:11px">' + C.fmtDate(r.date) + ' · ' + C.relDay(C.daysAgo(r.date)) +
              (r.correct != null ? ' · ' + r.correct + '/' + r.total : '') + '</span></span>' +
              '<span class="band-pill" style="color:' + C.levelColor(lv) + '">' + (r.band != null ? r.band.toFixed(1) : '—') + '</span>' +
              '<span class="row-go" style="opacity:1;transform:none">' + icon('chev', 15) + '</span></button>';
          }).join('') +
          '<a class="btn sm ghost" style="margin-top:16px" href="' + esc(raw) + '" target="_blank" rel="noopener">' + icon('refresh', 14) + 'Do it again</a>' +
          '</div>';
        $$('[data-id]', res).forEach(function (b) { b.addEventListener('click', function () { go('#/test/' + b.getAttribute('data-id')); }); });
      } else {
        var guess = C.titleFromUrl(raw), sk = C.detectSkillFromUrl(raw);
        res.innerHTML = '<div class="finder-hit">' +
          '<div class="note" style="margin-bottom:16px">Not in your file. <b>You have not done this one yet</b> — good, go and take it.</div>' +
          '<div style="margin-bottom:16px"><b style="font-size:13.5px">' + esc(guess || 'Unknown test') + '</b>' +
          '<div class="dim" style="font-size:12px;margin-top:3px">' + esc(C.hostOf(raw) || '') + (sk ? ' · ' + C.SKILL_LABEL[sk] : '') + '</div></div>' +
          '<a class="btn" href="' + esc(/^https?:/.test(raw) ? raw : 'https://' + raw) + '" target="_blank" rel="noopener">' + icon('play', 14) + 'Start this test</a>' +
          '</div>';
      }
    }
    $('[data-check]', host).addEventListener('click', check);
    $('[data-url]', host).addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });

    // coverage
    var sp = C.sourceProfile(recs());
    var cov = $('[data-cov]', host);
    cov.innerHTML = '<div data-pie style="display:flex;justify-content:center;margin-bottom:18px"></div><div data-list></div>';
    G.donut($('[data-pie]', cov), sp.list.slice(0, 7), {
      size: 180, unit: 'tests', centre: String(sp.total), centreLabel: 'papers',
      onPick: function (it) { F.source = it.name; go('#/tests'); }
    });
    $('[data-list]', cov).innerHTML = sp.list.length ? sp.list.slice(0, 8).map(function (s) {
      return '<div class="sitebar"><span class="sitebar-n">' + esc(s.name) + '</span>' +
        '<span class="sitebar-t"><i style="width:' + (s.pct * 100).toFixed(0) + '%;background:var(--paper-dim)"></i></span>' +
        '<span class="sitebar-v">' + Math.round(s.pct * 100) + '% · ' + s.n + '</span></div>';
    }).join('') : '<span class="dim" style="font-size:12px">No sources yet.</span>';
    setTimeout(function () { $$('.sitebar-t i', cov).forEach(function (i) { i.style.width = i.style.width; }); }, 40);

    // ai find
    var fo = $('[data-findout]', host), fb = $('[data-find]', host);
    fb.addEventListener('click', function () {
      if (!A.hasKey()) { fo.innerHTML = '<div class="note warn">Add an API key in Settings to use this.</div>'; return; }
      var sk = $('[data-sk]', host).value, site = $('[data-site]', host).value.trim();
      fb.disabled = true;
      fb.innerHTML = '<span class="spin" style="display:inline-flex">' + icon('refresh', 15) + '</span>Searching…';
      fo.innerHTML = '<div class="shimmer" style="height:9px;margin-bottom:9px"></div><div class="shimmer" style="height:9px;width:78%;margin-bottom:9px"></div><div class="shimmer" style="height:9px;width:90%"></div>';
      A.findTests(recs(), sk, site, S().target)
        .then(function (t) { fo.innerHTML = '<div class="ai-out">' + A.md(t) + '</div>'; })
        .catch(function (e) { fo.innerHTML = '<div class="note bad">' + esc(e.message) + '</div>'; })
        .then(function () { fb.disabled = false; fb.innerHTML = icon('coach', 15) + 'Suggest tests'; });
    });
  }

  /* ============================================================
     COACH
     ============================================================ */
  function coach(host, params) {
    var pre = params && params.skill;
    host.innerHTML =
      '<div class="grid g-main">' +
      '<div class="card"><div class="card-h"><h3>Review a stretch of work</h3></div><div class="card-b">' +
      '<p class="hint" style="margin:0 0 16px">The assistant reads your recent attempts together — bands, wrong answers, essays — and tells you what keeps costing you marks.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
      '<select class="sel" data-sk style="width:auto"><option value="all">All four skills</option>' +
      C.SKILLS.map(function (s) { return '<option value="' + s + '"' + (pre === s ? ' selected' : '') + '>' + C.SKILL_LABEL[s] + '</option>'; }).join('') + '</select>' +
      '<div class="chips" data-orange></div></div>' +
      '<button class="btn wide" data-run>' + icon('coach', 15) + 'Review my recent work</button>' +
      '<div data-out style="margin-top:18px"></div>' +
      '</div></div>' +
      '<div><div class="card"><div class="card-h"><h3>What it can see</h3></div><div class="card-b" data-scope></div></div></div>' +
      '</div>';

    U.mountRange($('[data-orange]', host), F.range, recs(), function () { coach(host, params); });

    function scope() {
      var sk = $('[data-sk]', host).value;
      var list = filtered({ ignoreSkill: true }).filter(function (r) { return sk === 'all' || r.skill === sk; });
      var withAns = list.filter(function (r) { return r.answers; }).length;
      var withText = list.filter(function (r) { return (r.tasks && r.tasks.some(function (t) { return t.essay; })) || (r.parts && r.parts.some(function (p) { return p.transcript; })); }).length;
      $('[data-scope]', host).innerHTML =
        '<div class="sitebar"><span class="sitebar-n">Attempts in range</span><span class="sitebar-v">' + list.length + '</span></div>' +
        '<div class="sitebar"><span class="sitebar-n">With answer tables</span><span class="sitebar-v">' + withAns + '</span></div>' +
        '<div class="sitebar"><span class="sitebar-n">With your own text</span><span class="sitebar-v">' + withText + '</span></div>' +
        '<div class="hint" style="margin-top:12px">The more of your own answers and essays are in the file, the more specific the review gets. Bands alone only buy you a trend.</div>' +
        '<div class="divider"></div>' +
        '<div class="sitebar"><span class="sitebar-n">Provider</span><span class="sitebar-v">' + (A.PROVIDERS[S().provider] || {}).label + '</span></div>' +
        '<div class="sitebar"><span class="sitebar-n">Model</span><span class="sitebar-v" style="width:auto">' + esc(A.cfg().model) + '</span></div>';
    }
    scope();
    $('[data-sk]', host).addEventListener('change', scope);

    var out = $('[data-out]', host), btn = $('[data-run]', host);
    btn.addEventListener('click', function () {
      if (!A.hasKey()) { out.innerHTML = '<div class="note warn">Add an API key in Settings to use this.</div>'; return; }
      var sk = $('[data-sk]', host).value;
      var list = filtered({ ignoreSkill: true }).filter(function (r) { return sk === 'all' || r.skill === sk; });
      if (!list.length) { out.innerHTML = '<div class="note warn">No attempts in this range. Widen the dates.</div>'; return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" style="display:inline-flex">' + icon('refresh', 15) + '</span>Reading your work…';
      out.innerHTML = '<div class="shimmer" style="height:9px;margin-bottom:9px"></div><div class="shimmer" style="height:9px;width:84%;margin-bottom:9px"></div><div class="shimmer" style="height:9px;width:74%"></div>';
      A.compareRange(list, sk, S().target)
        .then(function (t) { out.innerHTML = '<div class="ai-out">' + A.md(t) + '</div>'; })
        .catch(function (e) { out.innerHTML = '<div class="note bad">' + esc(e.message) + '</div>'; })
        .then(function () { btn.disabled = false; btn.innerHTML = icon('coach', 15) + 'Review my recent work'; });
    });
  }

  /* ============================================================
     INSIGHTS
     ============================================================ */
  function insights(host) {
    var list = filtered();
    var ep = C.errorProfile(list);
    var sp = C.sourceProfile(list);
    var per = C.bySkill(list);

    host.innerHTML =
      '<div class="toolbar"><div class="chips" data-orange></div></div>' +
      '<div class="grid g-2">' +
      '<div class="card"><div class="card-h"><h3>Why you lose marks</h3><div class="spacer"></div>' +
      '<span class="dim" style="font-size:11px">' + ep.total + ' lost marks</span></div><div class="card-b" data-err></div></div>' +
      '<div class="card"><div class="card-h"><h3>Where you practise</h3></div>' +
      '<div class="card-b" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap"><div data-pie></div><div style="flex:1;min-width:170px" data-plist></div></div></div>' +
      '</div>' +
      '<div class="grid g-2" style="margin-top:18px">' +
      '<div class="card"><div class="card-h"><h3>Marks lost by section</h3></div><div class="card-b" data-sect></div></div>' +
      '<div class="card"><div class="card-h"><h3>Pace against score</h3></div><div class="card-b" data-pace></div></div>' +
      '</div>';

    U.mountRange($('[data-orange]', host), F.range, recs(), function () { insights(host); });

    var eh = $('[data-err]', host);
    eh.innerHTML = ep.list.length ? ep.list.map(function (e) {
      return '<div class="sitebar"><span class="sitebar-n">' + esc(e.tag) + '</span>' +
        '<span class="sitebar-t"><i style="width:' + (e.pct * 100).toFixed(0) + '%;background:var(--low)"></i></span>' +
        '<span class="sitebar-v">' + e.n + ' · ' + Math.round(e.pct * 100) + '%</span></div>';
    }).join('') + '<div class="hint" style="margin-top:14px">Worked out by comparing your answer with the key: near-misses count as spelling, plural slips as word form, and a TRUE/NOT GIVEN swap as judgement.</div>'
      : '<div class="empty" style="padding:34px 10px"><h4>No answer tables in range</h4><p>Include the question-by-question table when you log a test and this panel fills with real causes.</p></div>';

    G.donut($('[data-pie]', host), sp.list.slice(0, 7), {
      size: 180, unit: 'tests', centre: String(sp.total), centreLabel: 'papers',
      onPick: function (it) { F.source = it.name; go('#/tests'); }
    });
    $('[data-plist]', host).innerHTML = sp.list.length ? sp.list.slice(0, 8).map(function (s) {
      return '<div class="sitebar"><span class="sitebar-n" style="flex:1;width:auto">' + esc(s.name) + '</span>' +
        '<span class="sitebar-v">' + Math.round(s.pct * 100) + '% · ' + s.n + '</span></div>';
    }).join('') : '<span class="dim" style="font-size:12px">Nothing in range.</span>';

    // marks lost per section
    var sect = {};
    list.forEach(function (r) {
      var defs = C.SECTIONS[r.skill];
      if (!defs || !r.answers) return;
      r.answers.forEach(function (a) {
        var j = C.judge(a.you, a.ans);
        if (j.state === 'correct') return;
        defs.forEach(function (d) {
          if (a.n >= d[0] && a.n <= d[1]) {
            var key = C.SKILL_LABEL[r.skill] + ' · ' + d[2];
            sect[key] = (sect[key] || 0) + 1;
          }
        });
      });
    });
    var sk = Object.keys(sect).sort(function (a, b) { return sect[b] - sect[a]; });
    var smax = sk.length ? sect[sk[0]] : 1;
    $('[data-sect]', host).innerHTML = sk.length ? sk.map(function (k) {
      return '<div class="sitebar"><span class="sitebar-n" style="width:170px;flex:0 0 170px">' + esc(k) + '</span>' +
        '<span class="sitebar-t"><i style="width:' + ((sect[k] / smax) * 100).toFixed(0) + '%;background:var(--mid)"></i></span>' +
        '<span class="sitebar-v">' + sect[k] + '</span></div>';
    }).join('') + '<div class="hint" style="margin-top:12px">If the last section always bleeds marks, the problem is the clock rather than the questions.</div>'
      : '<span class="dim" style="font-size:12px">No answer tables in range.</span>';

    // pace scatter as bars: duration bucket vs mean band
    var buckets = {};
    list.forEach(function (r) {
      if (r.seconds == null || r.band == null) return;
      var m = Math.round(r.seconds / 60);
      var b = m < 20 ? 'under 20m' : m < 35 ? '20–35m' : m < 50 ? '35–50m' : m < 65 ? '50–65m' : 'over 65m';
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(r.band);
    });
    var order = ['under 20m', '20–35m', '35–50m', '50–65m', 'over 65m'].filter(function (b) { return buckets[b]; });
    if (order.length) {
      G.bars($('[data-pace]', host), {
        height: 190, fmtY: function (v) { return v.toFixed(1); },
        data: order.map(function (b) {
          var avg = buckets[b].reduce(function (a, x) { return a + x; }, 0) / buckets[b].length;
          return {
            v: avg, label: b, color: C.levelColor(C.bandLevel(avg, S().target, S().colormode)),
            tip: '<b>' + b + '</b><div class="tip-row"><span>mean band</span><span>' + avg.toFixed(1) + '</span></div><div class="tip-row"><span>papers</span><span>' + buckets[b].length + '</span></div>'
          };
        })
      });
    } else {
      $('[data-pace]', host).innerHTML = '<div class="empty" style="padding:34px 10px"><h4>No durations recorded</h4><p>Tell the logger how long each test took and this shows whether rushing is costing you band points.</p></div>';
    }
  }

  /* ============================================================
     LOG A TEST — the data guide + prompt generator
     ============================================================ */
  var logFormat = 'json';
  function log(host) {
    host.innerHTML =
      '<div class="grid g-main">' +
      '<div>' +
      '<div class="card"><div class="card-h"><h3>How logging works</h3></div><div class="card-b">' +
      '<div class="steps">' +
      '<div class="step"><div><h4>Finish a practice test anywhere</h4><p>Any site, any book, any app. The dashboard does not care where the test came from — it only needs the result.</p></div></div>' +
      '<div class="step"><div><h4>Paste the prompt below into a chat assistant</h4><p>Groq, Google AI Studio, ChatGPT, Claude — whichever you use. Do this once and keep that conversation open; you can log every test in the same thread.</p></div></div>' +
      '<div class="step"><div><h4>Send it your link and your result</h4><p>The link tells it the site, the skill and the test name. Then paste whatever the site gave you: the score, the answer table, your essay, the examiner feedback. Missing pieces are fine.</p></div></div>' +
      '<div class="step"><div><h4>Copy the single line it returns</h4><p>Add it to the end of your data file, on its own line. Order does not matter. You never have to edit anything that is already in there.</p></div></div>' +
      '<div class="step"><div><h4>Load the file here</h4><p>Settings, then Replace file. Everything on the dashboard redraws around the new attempt.</p></div></div>' +
      '</div></div></div>' +

      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Your prompt</h3><div class="spacer"></div>' +
      '<div class="chips"><button class="chip' + (logFormat === 'json' ? ' on' : '') + '" data-f="json">Text file</button>' +
      '<button class="chip' + (logFormat === 'csv' ? ' on' : '') + '" data-f="csv">Spreadsheet</button></div></div>' +
      '<div class="card-b">' +
      '<p class="hint" style="margin:0 0 14px">' +
      (logFormat === 'json'
        ? 'This version returns one line of JSON per test. Keep your data in a plain <b>.txt</b> file and paste each new line at the bottom. It is the simplest option and it never breaks.'
        : 'This version returns one spreadsheet row per test. Keep a sheet with the twelve headers it describes, paste each row into the first empty line, and export as CSV when you want to load it here.') +
      '</p>' +
      '<div class="code-top"><span class="colhead">Copy all of this</span><div class="spacer"></div>' +
      '<button class="btn sm ghost" data-copy>' + icon('copy', 14) + 'Copy prompt</button></div>' +
      '<div class="code" data-prompt></div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Check a line before you keep it</h3></div><div class="card-b">' +
      '<p class="hint" style="margin:0 0 12px">Paste what the assistant gave you. This reads it exactly the way the dashboard will, so you find a problem now rather than later.</p>' +
      '<textarea class="ta" data-test placeholder=\'{"date":"2026-09-02","skill":"reading",…}\'></textarea>' +
      '<div class="btn-row"><button class="btn" data-val>Check the line</button>' +
      '<button class="btn ghost" data-append>Add it and download the file</button></div>' +
      '<div data-valout style="margin-top:16px"></div>' +
      '</div></div>' +
      '</div>' +

      '<div>' +
      '<div class="card"><div class="card-h"><h3>What a good line looks like</h3></div><div class="card-b">' +
      '<div class="colhead" style="margin-bottom:9px">Reading, with the answer table</div>' +
      '<div class="code" style="max-height:190px">' + esc(EX_READ) + '</div>' +
      '<div class="colhead" style="margin:18px 0 9px">Writing, with the essay</div>' +
      '<div class="code" style="max-height:190px">' + esc(EX_WRITE) + '</div>' +
      '<div class="colhead" style="margin:18px 0 9px">The bare minimum</div>' +
      '<div class="code">' + esc(EX_MIN) + '</div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Rules the file follows</h3></div><div class="card-b">' +
      '<ul style="font-size:12.5px;line-height:1.75;color:var(--mute)">' +
      '<li style="padding:7px 0;border-bottom:1px solid var(--line-soft)"><b style="color:var(--paper)">One line, one attempt.</b> Line breaks inside a record will break it.</li>' +
      '<li style="padding:7px 0;border-bottom:1px solid var(--line-soft)"><b style="color:var(--paper)">Only date and skill are required.</b> Everything else is optional and simply shows as blank.</li>' +
      '<li style="padding:7px 0;border-bottom:1px solid var(--line-soft)"><b style="color:var(--paper)">A blank answer is <code>""</code>.</b> That is what marks a question you never reached.</li>' +
      '<li style="padding:7px 0;border-bottom:1px solid var(--line-soft)"><b style="color:var(--paper)">No band? It is worked out.</b> From your raw score using the official conversion.</li>' +
      '<li style="padding:7px 0;border-bottom:1px solid var(--line-soft)"><b style="color:var(--paper)">Repeats are welcome.</b> The same link twice is counted and labelled as a second attempt.</li>' +
      '<li style="padding:7px 0"><b style="color:var(--paper)">Order does not matter.</b> Append at the bottom and sorting happens here.</li>' +
      '</ul></div></div>' +
      '</div></div>';

    function paintPrompt() {
      $('[data-prompt]', host).textContent = A.builderPrompt(S().name, logFormat);
    }
    paintPrompt();
    $$('[data-f]', host).forEach(function (b) {
      b.addEventListener('click', function () { logFormat = b.getAttribute('data-f'); log(host); });
    });
    $('[data-copy]', host).addEventListener('click', function () {
      U.copy(A.builderPrompt(S().name, logFormat), 'Prompt copied — paste it into your assistant');
    });

    var vo = $('[data-valout]', host);
    function validate() {
      var txt = $('[data-test]', host).value.trim();
      if (!txt) { vo.innerHTML = ''; return null; }
      var res = C.parseAny(txt, 'check.txt');
      if (!res.records.length) {
        vo.innerHTML = '<div class="note bad"><b>This will not load.</b> ' + esc(res.errors.join(' ') || 'Nothing readable in it.') +
          ' Check it is one line, valid JSON, and that quotes were not turned into curly ones by a word processor.</div>';
        return null;
      }
      vo.innerHTML = res.records.map(function (r) {
        var issues = [];
        if (r.band == null) issues.push('no band, and none could be worked out');
        if (!r.url) issues.push('no link, so it cannot be matched against future attempts');
        if ((r.skill === 'reading' || r.skill === 'listening') && !r.answers) issues.push('no answer table, so causes cannot be analysed');
        return '<div class="note good" style="margin-bottom:10px"><b>Reads correctly.</b></div>' +
          '<div class="sitebar"><span class="sitebar-n">Date</span><span class="sitebar-v" style="width:auto">' + C.fmtDate(r.date) + '</span></div>' +
          '<div class="sitebar"><span class="sitebar-n">Skill</span><span class="sitebar-v" style="width:auto">' + C.SKILL_LABEL[r.skill] + '</span></div>' +
          '<div class="sitebar"><span class="sitebar-n">Test</span><span class="sitebar-v" style="width:auto;text-align:right">' + esc(r.test) + '</span></div>' +
          '<div class="sitebar"><span class="sitebar-n">Band</span><span class="sitebar-v" style="width:auto">' + (r.band != null ? r.band.toFixed(1) : '—') +
          (r.correct != null ? ' (' + r.correct + '/' + r.total + ')' : '') + '</span></div>' +
          (r.answers ? '<div class="sitebar"><span class="sitebar-n">Questions</span><span class="sitebar-v" style="width:auto">' + r.answers.length + ' recorded</span></div>' : '') +
          (issues.length ? '<div class="note warn" style="margin-top:12px">Usable, but thin: ' + esc(issues.join('; ')) + '.</div>' : '');
      }).join('');
      return res.records;
    }
    $('[data-val]', host).addEventListener('click', validate);
    $('[data-append]', host).addEventListener('click', function () {
      var ok = validate();
      if (!ok) return;
      var line = $('[data-test]', host).value.trim();
      var merged = (S().raw || '').replace(/\s*$/, '') + '\n' + line + '\n';
      S().load(merged, S().fileName || 'ielts-data.txt');
      U.download(merged, S().fileName || 'ielts-data.txt');
      U.toast('Added. The updated file is downloading — keep it as your new master copy.');
      w.App.redraw();
    });
  }

  var EX_READ = '{"date":"2026-09-02","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 14 Academic Reading Test 3","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-14-academic-reading-test-3/","correct":13,"total":40,"band":4.5,"duration":"41:20","answers":[{"n":1,"you":"TRUE","ans":"FALSE"},{"n":2,"you":"FALSE","ans":"FALSE"},{"n":10,"you":"cuscus","ans":"bones"},{"n":14,"you":"","ans":"G"}],"notes":"Lost the last passage to the clock"}';
  var EX_WRITE = '{"date":"2026-09-04","skill":"writing","source":"engnovate.com","test":"Transport modes 2000 vs 2020","band":6.5,"duration":"40:30","tasks":[{"task":1,"band":6.5,"words":178,"prompt":"The chart shows transport modes in 2000 and 2020.","essay":"The chart illustrates...","criteria":{"Task Achievement":7,"Coherence & Cohesion":7,"Lexical Resource":6,"Grammatical Range & Accuracy":6},"detail":[{"sub":"Overview","score":7,"comment":"Captures the patterns but could be tighter."}]}]}';
  var EX_MIN = '{"date":"2026-09-06","skill":"listening","correct":31,"total":40}';

  /* ============================================================
     SETTINGS
     ============================================================ */
  function settings(host) {
    var provs = Object.keys(A.PROVIDERS);
    host.innerHTML =
      '<div class="grid g-2">' +
      '<div>' +
      '<div class="card"><div class="card-h"><h3>Your data file</h3></div><div class="card-b">' +
      '<div class="sitebar"><span class="sitebar-n">Loaded file</span><span class="sitebar-v" style="width:auto">' + esc(S().fileName || 'none') + '</span></div>' +
      '<div class="sitebar"><span class="sitebar-n">Attempts read</span><span class="sitebar-v">' + recs().length + '</span></div>' +
      '<div class="sitebar"><span class="sitebar-n">Date span</span><span class="sitebar-v" style="width:auto">' + spanText() + '</span></div>' +
      (S().errors.length ? '<div class="note warn" style="margin-top:12px">' + esc(S().errors.join(' ')) + '</div>' : '') +
      '<div class="btn-row">' +
      '<button class="btn" data-replace>' + icon('upload', 15) + 'Replace file</button>' +
      '<button class="btn ghost" data-exp>' + icon('download', 15) + 'Export .txt</button>' +
      '<button class="btn ghost" data-expcsv>Export .csv</button>' +
      '</div>' +
      '<input type="file" data-file accept=".txt,.jsonl,.json,.csv,.tsv" style="display:none">' +
      '<div class="hint">Replacing swaps the whole file. Your attempts live only in that file and in this browser — nothing is sent anywhere.</div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Assistant key</h3><div class="spacer"></div>' +
      '<button class="qmark" data-keyhelp aria-label="What is this for">?</button></div><div class="card-b">' +
      '<div class="note ' + (A.hasKey() ? 'good' : '') + '" style="margin-bottom:16px">' +
      (A.hasKey() ? 'A key is saved. The assistant is available across the dashboard.' : 'No key saved. Everything else works; only the assistant is switched off.') + '</div>' +
      '<div class="field"><label>Provider</label><select class="sel" data-prov>' +
      provs.map(function (p) { return '<option value="' + p + '"' + (S().provider === p ? ' selected' : '') + '>' + A.PROVIDERS[p].label + '</option>'; }).join('') +
      '</select><div class="hint" data-provhint></div></div>' +
      '<div class="field"><label>API key</label><input class="inp" type="password" data-key placeholder="paste your key" value="' + esc(S().apiKey) + '"></div>' +
      '<div class="field"><label>Model</label><input class="inp" data-model placeholder="' + esc(A.PROVIDERS[S().provider].model) + '" value="' + esc(S().model) + '"></div>' +
      '<div class="btn-row"><button class="btn" data-savekey>Save key</button>' +
      '<button class="btn ghost" data-testkey>Test the connection</button>' +
      (A.hasKey() ? '<button class="btn quiet" data-clearkey>Remove</button>' : '') + '</div>' +
      '<div data-keyout style="margin-top:14px"></div>' +
      '</div></div>' +
      '</div>' +

      '<div>' +
      '<div class="card"><div class="card-h"><h3>You</h3></div><div class="card-b">' +
      '<div class="field"><label>Name</label><input class="inp" data-name value="' + esc(S().name) + '"></div>' +
      '<div class="field"><label>Target band</label><div class="chips">' +
      [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(function (o) {
        return '<button class="chip' + (S().target === o ? ' on' : '') + '" data-t="' + o + '">' + o.toFixed(1) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>Current band is read as</label><div class="chips">' +
      [['latest', 'Latest attempt'], ['avg3', 'Mean of last 3'], ['avg5', 'Mean of last 5']].map(function (o) {
        return '<button class="chip' + (S().basis === o[0] ? ' on' : '') + '" data-b="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div><div class="hint">A mean is steadier; the latest attempt reacts faster. This drives the four rings and the overall band.</div></div>' +
      '<div class="field"><label>Colour scale</label><div class="chips">' +
      [['absolute', 'Fixed: 7 and up is green'], ['target', 'Relative to my target']].map(function (o) {
        return '<button class="chip' + (S().colormode === o[0] ? ' on' : '') + '" data-c="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div></div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Start over</h3></div><div class="card-b">' +
      '<p class="hint" style="margin:0 0 14px">Clears your name, key and the copy of the file held in this browser. Your downloaded file is untouched.</p>' +
      '<button class="btn ghost" data-reset>Clear everything on this device</button>' +
      '</div></div>' +
      '</div></div>';

    function provHint() {
      var p = A.PROVIDERS[$('[data-prov]', host).value];
      $('[data-provhint]', host).innerHTML = p.keyHint + ' <a href="' + p.keyUrl + '" target="_blank" rel="noopener">Get a key</a>';
      $('[data-model]', host).placeholder = p.model;
    }
    provHint();
    $('[data-prov]', host).addEventListener('change', provHint);

    $('[data-replace]', host).addEventListener('click', function () { $('[data-file]', host).click(); });
    $('[data-file]', host).addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) w.App.ingest(f, function () { settings(host); U.toast('File loaded — ' + recs().length + ' attempts'); });
    });
    $('[data-exp]', host).addEventListener('click', function () {
      U.download(C.toJsonl(recs()), 'ielts-data.txt');
    });
    $('[data-expcsv]', host).addEventListener('click', function () {
      U.download(C.toCsv(recs()), 'ielts-data.csv', 'text/csv;charset=utf-8');
    });

    $$('[data-t]', host).forEach(function (b) {
      b.addEventListener('click', function () { S().target = parseFloat(b.getAttribute('data-t')); S().save(); settings(host); w.App.refreshChrome(); });
    });
    $$('[data-b]', host).forEach(function (b) {
      b.addEventListener('click', function () { S().basis = b.getAttribute('data-b'); S().save(); settings(host); });
    });
    $$('[data-c]', host).forEach(function (b) {
      b.addEventListener('click', function () { S().colormode = b.getAttribute('data-c'); S().save(); settings(host); });
    });
    $('[data-name]', host).addEventListener('change', function () { S().name = this.value.trim(); S().save(); w.App.refreshChrome(); });

    $('[data-savekey]', host).addEventListener('click', function () {
      S().apiKey = $('[data-key]', host).value.trim();
      S().provider = $('[data-prov]', host).value;
      S().model = $('[data-model]', host).value.trim();
      S().save();
      U.toast(S().apiKey ? 'Key saved on this device' : 'Key cleared');
      settings(host);
    });
    if ($('[data-clearkey]', host)) $('[data-clearkey]', host).addEventListener('click', function () {
      S().apiKey = ''; S().save(); settings(host); U.toast('Key removed');
    });
    $('[data-testkey]', host).addEventListener('click', function () {
      var out = $('[data-keyout]', host);
      S().apiKey = $('[data-key]', host).value.trim();
      S().provider = $('[data-prov]', host).value;
      S().model = $('[data-model]', host).value.trim();
      S().save();
      out.innerHTML = '<div class="note">Calling ' + esc(A.PROVIDERS[S().provider].label) + '…</div>';
      A.ask('Reply with exactly: ok', 'ping', { max: 12, temp: 0 })
        .then(function (t) { out.innerHTML = '<div class="note good"><b>Connected.</b> The model answered: ' + esc(String(t).slice(0, 60)) + '</div>'; })
        .catch(function (e) { out.innerHTML = '<div class="note bad"><b>Did not connect.</b> ' + esc(e.message) + '</div>'; });
    });

    $('[data-keyhelp]', host).addEventListener('click', keyHelp);
    $('[data-reset]', host).addEventListener('click', function () {
      U.modal('Clear everything on this device?', '<p class="hint" style="margin:0">This removes your name, your target, your API key and the cached copy of your data file. The file you downloaded stays on your computer, so you can load it again at any time.</p>', {
        footer: '<button class="btn" data-yes>Clear it</button><button class="btn ghost" data-no>Keep it</button>',
        onOpen: function (veil, close) {
          $('[data-yes]', veil).addEventListener('click', function () { S().reset(); location.hash = ''; location.reload(); });
          $('[data-no]', veil).addEventListener('click', close);
        }
      });
    });
  }

  function spanText() {
    var l = recs();
    if (!l.length) return '—';
    var ds = l.map(function (r) { return r.date; }).sort();
    return C.fmtDateShort(ds[0]) + ' – ' + C.fmtDateShort(ds[ds.length - 1]);
  }

  function keyHelp() {
    U.modal('Why a key, and where to get one', KEY_HELP_HTML, { large: true });
  }

  var KEY_HELP_HTML =
    '<p class="hint" style="margin:0 0 18px;font-size:13px">The dashboard draws every chart on its own. The key is only for the parts where a language model has to read your work: marking an essay, explaining why an answer was wrong, comparing your last few papers, and hunting for tests you have not done.</p>' +
    '<div class="note good" style="margin-bottom:20px"><b>Your key stays in your browser.</b> This page has no server and no database. Requests go straight from your machine to the provider you pick, and the key is stored only on this device. Nobody else — including whoever deployed this page — can see it.</div>' +
    '<div class="colhead" style="margin-bottom:10px">Free options</div>' +
    '<div class="links" style="margin-bottom:20px">' +
    '<a class="link" href="https://console.groq.com/keys" target="_blank" rel="noopener"><span class="link-ico">' + icon('coach', 22) + '</span>' +
    '<span><b>Groq</b><span>Sign in, open API Keys, create one. Fast and free.</span></span></a>' +
    '<a class="link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener"><span class="link-ico">' + icon('coach', 22) + '</span>' +
    '<span><b>Google AI Studio</b><span>Click Get API key. Free, and good at long essays.</span></span></a>' +
    '</div>' +
    '<div class="colhead" style="margin-bottom:10px">Once you have it</div>' +
    '<div class="steps">' +
    '<div class="step"><div><h4>Paste it into Settings</h4><p>Pick the matching provider first, then paste the key and save.</p></div></div>' +
    '<div class="step"><div><h4>Press Test the connection</h4><p>If the model answers, everything is wired up. If it does not, the error tells you what went wrong.</p></div></div>' +
    '<div class="step"><div><h4>Skip it if you prefer</h4><p>Charts, tables, answer review, the heatmap and the test finder all work without a key. Only the marking and the suggestions need one.</p></div></div>' +
    '</div>';

  /* ============================================================
     CONNECT
     ============================================================ */
  var LINKS = [
    { k: 'mail', b: 'Email', s: 'rufatjabra@gmail.com', href: 'mailto:rufatjabra@gmail.com' },
    { k: 'github', b: 'GitHub', s: '@rufatj', href: 'https://github.com/rufatj' },
    { k: 'x', b: 'X', s: '@rufatjab', href: 'https://x.com/rufatjab' },
    { k: 'discord', b: "Rufat's open source community", s: 'Join the Discord', href: 'https://discord.gg/QQYFBHttFV' }
  ];

  function connect(host) {
    host.innerHTML =
      '<div class="connect">' +
      '<div style="width:100%">' +
      '<div class="connect-mark"><img src="assets/logo.png" alt=""></div>' +
      '<h2>Built by Rufat Jabrayilli</h2>' +
      '<p class="lede">This dashboard is open to anyone preparing for IELTS. If you improve it, break it, or want something added, the door is open.</p>' +
      '<div class="links" style="margin:0 auto">' +
      LINKS.map(function (l, i) {
        return '<a class="link" href="' + l.href + '" target="_blank" rel="noopener" style="animation-delay:' + (0.45 + i * 0.09) + 's">' +
          '<span class="link-ico">' + icon(l.k, 22) + '</span>' +
          '<span><b>' + esc(l.b) + '</b><span>' + esc(l.s) + '</span></span></a>';
      }).join('') +
      '</div></div></div>';
  }

  function connectModal() {
    U.modal('Get in touch', '<div style="text-align:center;margin-bottom:24px">' +
      '<div style="width:82px;margin:0 auto 16px" class="connect-mark"><img src="assets/logo.png" alt=""></div>' +
      '<p class="hint" style="margin:0">Rufat Jabrayilli built this. Say hello.</p></div>' +
      '<div class="links">' + LINKS.map(function (l) {
        return '<a class="link" href="' + l.href + '" target="_blank" rel="noopener" style="animation-delay:.1s">' +
          '<span class="link-ico">' + icon(l.k, 22) + '</span>' +
          '<span><b>' + esc(l.b) + '</b><span>' + esc(l.s) + '</span></span></a>';
      }).join('') + '</div>');
  }

  w.Views = {
    F: F, overview: overview, progress: progress, activity: activity, tests: tests,
    skill: skill, detail: detail, finder: finder, coach: coach, insights: insights,
    log: log, settings: settings, connect: connect, connectModal: connectModal,
    keyHelp: keyHelp, animateCrits: animateCrits
  };
})(window);
