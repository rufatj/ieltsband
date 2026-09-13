/* ============================================================
   BAND — core: state, storage, parsing, IELTS maths
   ============================================================ */
(function (w) {
  'use strict';

  /* ---------- safe storage (falls back to memory) ---------- */
  var mem = {};
  var LS = (function () {
    try {
      var k = '__band_probe__';
      w.localStorage.setItem(k, '1');
      w.localStorage.removeItem(k);
      return w.localStorage;
    } catch (e) { return null; }
  })();
  var store = {
    get: function (k) { try { return LS ? LS.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { try { if (LS) LS.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } },
    del: function (k) { try { if (LS) LS.removeItem(k); else delete mem[k]; } catch (e) { delete mem[k]; } },
    json: function (k, d) { var v = store.get(k); if (!v) return d; try { return JSON.parse(v); } catch (e) { return d; } },
    setJson: function (k, v) { store.set(k, JSON.stringify(v)); }
  };

  /* ---------- constants ---------- */
  var SKILLS = ['listening', 'reading', 'writing', 'speaking'];
  var SKILL_LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

  // Question groupings used by the answer-review grid
  var SECTIONS = {
    listening: [[1, 10, 'Part 1'], [11, 20, 'Part 2'], [21, 30, 'Part 3'], [31, 40, 'Part 4']],
    reading: [[1, 13, 'Passage 1'], [14, 26, 'Passage 2'], [27, 40, 'Passage 3']]
  };

  // Official raw-score → band conversion (40-question papers)
  var TABLE = {
    listening: [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1], [0, 0]],
    reading: [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1], [0, 0]]
  };

  function rawToBand(skill, correct, total) {
    var t = TABLE[skill];
    if (!t || correct == null) return null;
    var c = correct;
    if (total && total !== 40) c = Math.round((correct / total) * 40);
    for (var i = 0; i < t.length; i++) if (c >= t[i][0]) return t[i][1];
    return 0;
  }

  // IELTS rounding: .25 → .5, .75 → next whole
  function roundBand(n) {
    if (n == null || isNaN(n)) return null;
    return Math.round(n * 2) / 2;
  }

  /* ---------- small utils ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    if (!s) return null;
    var m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function daysAgo(isoStr) {
    var d = parseISO(isoStr); if (!d) return null;
    var t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
    return daysBetween(d, t);
  }
  function fmtDate(isoStr) {
    var d = parseISO(isoStr); if (!d) return '—';
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtDateShort(isoStr) {
    var d = parseISO(isoStr); if (!d) return '—';
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + M[d.getMonth()];
  }
  function relDay(n) {
    if (n == null) return 'never';
    if (n === 0) return 'today';
    if (n === 1) return 'yesterday';
    return n + ' days ago';
  }

  /* duration: accepts "40:30", "1:02:15", "67", "67 min", 4050 (seconds) */
  function toSeconds(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v > 1000 ? v : v * 60;
    var s = String(v).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 60);
    var m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (m) {
      return m[3] ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
    }
    var mm = s.match(/(\d+)\s*m/i), ss = s.match(/(\d+)\s*s/i), hh = s.match(/(\d+)\s*h/i);
    var tot = 0, got = false;
    if (hh) { tot += (+hh[1]) * 3600; got = true; }
    if (mm) { tot += (+mm[1]) * 60; got = true; }
    if (ss) { tot += (+ss[1]); got = true; }
    return got ? tot : null;
  }
  function fmtDur(sec) {
    if (sec == null) return '—';
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + ':' + pad(m) + ':' + pad(s);
    return m + ':' + pad(s);
  }
  function fmtMins(sec) {
    if (sec == null) return '—';
    var m = Math.round(sec / 60);
    if (m < 60) return m + 'm';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }

  function hostOf(url) {
    if (!url) return null;
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (e) {
      var m = String(url).match(/^(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
      return m ? m[1] : null;
    }
  }

  /* Normalise a test URL so the same test always matches */
  function normUrl(url) {
    if (!url) return '';
    var s = String(url).trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
    s = s.split('#')[0].split('?')[0];
    s = s.replace(/\/+$/, '');
    return s;
  }

  /* Guess a readable test name from a URL slug */
  function titleFromUrl(url) {
    if (!url) return null;
    var n = normUrl(url);
    var seg = n.split('/').filter(Boolean).pop();
    if (!seg) return null;
    var t = seg.replace(/-/g, ' ').replace(/\b(ielts|academic|general)\b/gi, function (x) { return x.toUpperCase(); });
    return t.replace(/\b\w/g, function (c) { return c.toUpperCase(); }).replace(/\bIelts\b/g, 'IELTS');
  }

  function detectSkillFromUrl(url) {
    var n = normUrl(url);
    if (/listen/.test(n)) return 'listening';
    if (/read/.test(n)) return 'reading';
    if (/writ/.test(n)) return 'writing';
    if (/speak/.test(n)) return 'speaking';
    return null;
  }

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

  /* ---------- error classification ---------- */
  var TFNG = ['true', 'false', 'not given', 'notgiven', 'yes', 'no'];

  function lev(a, b) {
    a = a || ''; b = b || '';
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur.slice();
    }
    return prev[n];
  }

  function clean(s) {
    return String(s == null ? '' : s).trim().toLowerCase()
      .replace(/[.,;:!?"'`’]/g, '').replace(/\s+/g, ' ');
  }

  /* Returns { state: 'correct'|'wrong'|'blank', tag: string } */
  function judge(you, ans) {
    var y = clean(you), a = clean(ans);
    if (!y) return { state: 'blank', tag: a ? 'Unanswered' : 'No key' };
    if (!a) return { state: 'blank', tag: 'No key' };
    if (y === a) return { state: 'correct', tag: '' };

    // accept "a/an/the" differences and slash alternatives in the key
    var alts = a.split(/\s*\/\s*|\s*\bor\b\s*/).map(function (x) { return x.replace(/^(a|an|the)\s+/, ''); });
    var ybare = y.replace(/^(a|an|the)\s+/, '');
    for (var i = 0; i < alts.length; i++) if (alts[i] === ybare) return { state: 'correct', tag: 'Article variant' };

    var isLetter = /^[a-j]$/.test(y) && /^[a-j]$/.test(a);
    if (isLetter) return { state: 'wrong', tag: 'Matching / MCQ' };

    var bothTF = TFNG.indexOf(y) > -1 && TFNG.indexOf(a) > -1;
    if (bothTF) {
      if ((y === 'not given') !== (a === 'not given')) return { state: 'wrong', tag: 'Not Given confusion' };
      return { state: 'wrong', tag: 'True/False judgement' };
    }

    if (/^\d+([.,]\d+)?$/.test(y) && /^\d+([.,]\d+)?$/.test(a)) return { state: 'wrong', tag: 'Number detail' };

    // plural / word form
    if (ybare.replace(/(es|s)$/, '') === alts[0].replace(/(es|s)$/, '')) return { state: 'wrong', tag: 'Word form (plural)' };

    var d = lev(ybare, alts[0]);
    if (d <= 2 && alts[0].length > 3) return { state: 'wrong', tag: 'Spelling' };
    if (ybare.split(' ').length !== alts[0].split(' ').length) return { state: 'wrong', tag: 'Word count / form' };

    return { state: 'wrong', tag: 'Wrong content word' };
  }

  /* ---------- record normalisation ---------- */
  function normSkill(s) {
    if (!s) return null;
    var x = String(s).trim().toLowerCase();
    if (x.indexOf('listen') === 0 || x === 'l') return 'listening';
    if (x.indexOf('read') === 0 || x === 'r') return 'reading';
    if (x.indexOf('writ') === 0 || x === 'w') return 'writing';
    if (x.indexOf('speak') === 0 || x === 's') return 'speaking';
    return null;
  }

  function normalise(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var r = {};
    r.id = raw.id || uid();
    r.date = (raw.date || raw.day || '').toString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      var p = parseISO(raw.date);
      r.date = p ? iso(p) : todayISO();
    }
    r.time = raw.time || null;
    r.skill = normSkill(raw.skill || raw.type || raw.section) || detectSkillFromUrl(raw.url) || 'reading';
    r.url = raw.url || raw.link || null;
    r.source = (raw.source || raw.site || hostOf(r.url) || 'unknown').toLowerCase().replace(/^www\./, '');
    r.test = raw.test || raw.title || raw.name || titleFromUrl(r.url) || 'Untitled test';
    r.notes = raw.notes || '';
    r.mode = raw.mode || null; // e.g. "timed", "practice"

    r.correct = raw.correct != null ? +raw.correct : (raw.score != null ? +raw.score : null);
    r.total = raw.total != null ? +raw.total : (r.skill === 'reading' || r.skill === 'listening' ? 40 : null);
    r.seconds = toSeconds(raw.duration != null ? raw.duration : raw.seconds != null ? raw.seconds : raw.time_spent);

    r.answers = Array.isArray(raw.answers) ? raw.answers.map(function (a, i) {
      if (Array.isArray(a)) return { n: i + 1, you: a[0], ans: a[1] };
      return { n: a.n != null ? +a.n : i + 1, you: a.you != null ? a.you : a.your, ans: a.ans != null ? a.ans : a.correct };
    }) : null;

    r.criteria = raw.criteria && typeof raw.criteria === 'object' ? raw.criteria : null;
    r.tasks = Array.isArray(raw.tasks) ? raw.tasks : null;
    r.parts = Array.isArray(raw.parts) ? raw.parts : null;

    // derive correct count from answers if missing
    if (r.answers && r.correct == null) {
      var c = 0, seen = 0;
      r.answers.forEach(function (a) { seen++; if (judge(a.you, a.ans).state === 'correct') c++; });
      if (seen) { r.correct = c; r.total = r.total || Math.max(seen, 40); }
    }

    // band
    r.band = raw.band != null && raw.band !== '' ? +raw.band : null;
    if (r.band == null) {
      if (r.skill === 'reading' || r.skill === 'listening') r.band = rawToBand(r.skill, r.correct, r.total);
      else {
        var vals = [];
        if (r.criteria) Object.keys(r.criteria).forEach(function (k) { var v = +r.criteria[k]; if (!isNaN(v)) vals.push(v); });
        if (!vals.length && r.tasks) r.tasks.forEach(function (t) { if (t.band != null) vals.push(+t.band); });
        if (!vals.length && r.parts) r.parts.forEach(function (t) { if (t.band != null) vals.push(+t.band); });
        if (vals.length) {
          // Writing: Task 2 is weighted double
          if (r.skill === 'writing' && r.tasks && r.tasks.length === 2 && r.tasks[0].band != null && r.tasks[1].band != null) {
            r.band = roundBand((+r.tasks[0].band + 2 * (+r.tasks[1].band)) / 3);
          } else {
            r.band = roundBand(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
          }
        }
      }
    }
    if (r.band != null) r.band = Math.max(0, Math.min(9, r.band));
    r.key = normUrl(r.url) || (r.skill + '|' + clean(r.test));
    return r;
  }

  /* ---------- parsing uploaded files ---------- */
  function parseJsonl(text) {
    var out = [], bad = 0;
    text.split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t || t[0] === '#' || t.slice(0, 2) === '//') return;
      // tolerate trailing commas / array wrappers pasted by hand
      t = t.replace(/^[\[,]\s*/, '').replace(/[,\]]\s*$/, '');
      if (!t || t === '[' || t === ']') return;
      try {
        var o = JSON.parse(t);
        if (Array.isArray(o)) o.forEach(function (x) { out.push(x); });
        else out.push(o);
      } catch (e) { bad++; }
    });
    return { rows: out, bad: bad };
  }

  function splitCsvLine(line, delim) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === delim) { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function parseTable(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, ''); });
    var map = {
      date: 'date', day: 'date', skill: 'skill', type: 'skill', section: 'skill',
      source: 'source', site: 'source', test: 'test', title: 'test', name: 'test',
      url: 'url', link: 'url', correct: 'correct', score: 'correct', raw: 'correct',
      total: 'total', outof: 'total', band: 'band', duration: 'duration', time: 'time',
      timespent: 'duration', detail: 'detail', details: 'detail', json: 'detail', notes: 'notes'
    };
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.join('').trim()) continue;
      var o = {};
      for (var c = 0; c < head.length; c++) {
        var k = map[head[c]] || head[c];
        var v = r[c];
        if (v == null || v === '') continue;
        o[k] = v;
      }
      if (o.detail) {
        try {
          var d = typeof o.detail === 'string' ? JSON.parse(o.detail) : o.detail;
          Object.keys(d).forEach(function (k) { if (o[k] == null) o[k] = d[k]; });
        } catch (e) { /* keep as note */ }
        delete o.detail;
      }
      if (!o.date && !o.skill && !o.url) continue;
      out.push(o);
    }
    return out;
  }

  function parseCsv(text) {
    var delim = (text.split('\n')[0].split('\t').length > text.split('\n')[0].split(',').length) ? '\t' : ',';
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length; });
    return parseTable(lines.map(function (l) { return splitCsvLine(l, delim); }));
  }

  /* Master parse — decides format by content, not just extension */
  function parseAny(text, filename) {
    var t = (text || '').replace(/^\uFEFF/, '').trim();
    if (!t) return { records: [], errors: ['The file is empty.'] };
    var errors = [], raws = [];

    if (t[0] === '[') {
      try { raws = JSON.parse(t); }
      catch (e) { var r1 = parseJsonl(t); raws = r1.rows; if (r1.bad) errors.push(r1.bad + ' line(s) could not be read as JSON.'); }
    } else if (t[0] === '{') {
      var r2 = parseJsonl(t);
      raws = r2.rows;
      if (r2.bad) errors.push(r2.bad + ' line(s) could not be read as JSON.');
    } else if (/\.(csv|tsv)$/i.test(filename || '') || /^[^\n]*\b(date|skill)\b[^\n]*[,\t]/i.test(t.split('\n')[0])) {
      raws = parseCsv(t);
    } else {
      var r3 = parseJsonl(t);
      if (r3.rows.length) { raws = r3.rows; if (r3.bad) errors.push(r3.bad + ' line(s) could not be read.'); }
      else { raws = parseCsv(t); }
    }

    if (!Array.isArray(raws)) raws = [raws];
    var records = [];
    raws.forEach(function (x, i) {
      try {
        var n = normalise(x);
        if (n) records.push(n);
      } catch (e) { errors.push('Row ' + (i + 1) + ' could not be read.'); }
    });

    records.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

    // attempt numbering for repeats of the same test
    var seen = {};
    records.forEach(function (r) {
      seen[r.key] = (seen[r.key] || 0) + 1;
      r.attempt = seen[r.key];
    });
    records.forEach(function (r) { r.attemptsTotal = seen[r.key]; });

    // stable ids so a deep link survives a reload
    function hash(str) {
      var h = 5381;
      for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
      return (h >>> 0).toString(36);
    }
    records.forEach(function (r) { r.id = hash(r.date + '|' + r.skill + '|' + r.key + '|' + r.attempt); });

    if (!records.length && !errors.length) errors.push('No readable test records were found in this file.');
    return { records: records, errors: errors };
  }

  /* ---------- analytics ---------- */
  function bySkill(records) {
    var o = { listening: [], reading: [], writing: [], speaking: [] };
    records.forEach(function (r) { if (o[r.skill]) o[r.skill].push(r); });
    return o;
  }

  function currentBand(list, basis) {
    if (!list || !list.length) return null;
    var withBand = list.filter(function (r) { return r.band != null; });
    if (!withBand.length) return null;
    var sorted = withBand.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var n = basis === 'latest' ? 1 : basis === 'avg3' ? 3 : 5;
    var take = sorted.slice(0, n);
    var avg = take.reduce(function (s, r) { return s + r.band; }, 0) / take.length;
    return n === 1 ? take[0].band : roundBand(avg);
  }

  function overallBand(perSkill, basis) {
    var vals = [];
    SKILLS.forEach(function (s) { var b = currentBand(perSkill[s], basis); if (b != null) vals.push(b); });
    if (!vals.length) return null;
    return roundBand(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
  }

  function lastDate(list) {
    if (!list || !list.length) return null;
    return list.reduce(function (m, r) { return (!m || r.date > m) ? r.date : m; }, null);
  }

  /* band → semantic level */
  function bandLevel(band, target, mode) {
    if (band == null) return 'none';
    if (mode === 'target' && target) {
      if (band >= target) return 'high';
      if (band >= target - 1) return 'mid';
      return 'low';
    }
    if (band >= 7) return 'high';
    if (band >= 6) return 'mid';
    return 'low';
  }
  function levelColor(l) {
    return l === 'high' ? 'var(--high)' : l === 'mid' ? 'var(--mid)' : l === 'low' ? 'var(--low)' : 'var(--mute)';
  }
  function recencyLevel(days) {
    if (days == null) return 'low';
    if (days <= 2) return 'high';
    if (days <= 4) return 'mid';
    return 'low';
  }

  function inRange(r, from, to) {
    return (!from || r.date >= from) && (!to || r.date <= to);
  }

  /* daily aggregation for charts + heatmap */
  function daily(records, from, to) {
    var map = {};
    records.forEach(function (r) {
      if (!inRange(r, from, to)) return;
      if (!map[r.date]) map[r.date] = { date: r.date, tests: [], seconds: 0, bands: [] };
      map[r.date].tests.push(r);
      map[r.date].seconds += r.seconds || 0;
      if (r.band != null) map[r.date].bands.push(r.band);
    });
    Object.keys(map).forEach(function (k) {
      var d = map[k];
      d.avg = d.bands.length ? d.bands.reduce(function (a, b) { return a + b; }, 0) / d.bands.length : null;
      d.count = d.tests.length;
    });
    return map;
  }

  function dateSeq(from, to) {
    var out = [], a = parseISO(from), b = parseISO(to);
    if (!a || !b) return out;
    var cur = new Date(a.getTime());
    var guard = 0;
    while (cur <= b && guard++ < 2000) { out.push(iso(cur)); cur.setDate(cur.getDate() + 1); }
    return out;
  }

  /* error tag frequency across a set of records */
  function errorProfile(records) {
    var tags = {}, total = 0;
    records.forEach(function (r) {
      if (!r.answers) return;
      r.answers.forEach(function (a) {
        var j = judge(a.you, a.ans);
        if (j.state === 'correct') return;
        var t = j.tag || 'Other';
        tags[t] = (tags[t] || 0) + 1;
        total++;
      });
    });
    var arr = Object.keys(tags).map(function (k) { return { tag: k, n: tags[k], pct: total ? tags[k] / total : 0 }; });
    arr.sort(function (a, b) { return b.n - a.n; });
    return { list: arr, total: total };
  }

  function sourceProfile(records) {
    var m = {}, total = records.length;
    records.forEach(function (r) { m[r.source] = (m[r.source] || 0) + 1; });
    var arr = Object.keys(m).map(function (k) { return { name: k, n: m[k], pct: total ? m[k] / total : 0 }; });
    arr.sort(function (a, b) { return b.n - a.n; });
    return { list: arr, total: total };
  }

  /* ---------- app state ---------- */
  var K = {
    name: 'band.name', key: 'band.key', prov: 'band.prov', model: 'band.model',
    data: 'band.data', file: 'band.file', target: 'band.target',
    theme: 'band.theme', rail: 'band.rail', basis: 'band.basis', colormode: 'band.colormode'
  };

  var State = {
    name: store.get(K.name) || '',
    apiKey: store.get(K.key) || '',
    provider: store.get(K.prov) || 'groq',
    model: store.get(K.model) || '',
    fileName: store.get(K.file) || '',
    target: parseFloat(store.get(K.target) || '7.5'),
    basis: store.get(K.basis) || 'avg3',
    colormode: store.get(K.colormode) || 'absolute',
    records: [],
    raw: store.get(K.data) || '',
    errors: []
  };

  State.save = function () {
    store.set(K.name, State.name);
    store.set(K.key, State.apiKey);
    store.set(K.prov, State.provider);
    store.set(K.model, State.model || '');
    store.set(K.file, State.fileName);
    store.set(K.target, String(State.target));
    store.set(K.basis, State.basis);
    store.set(K.colormode, State.colormode);
  };
  State.saveData = function (text) {
    State.raw = text;
    try { store.set(K.data, text); } catch (e) { }
  };
  State.load = function (text, filename) {
    var res = parseAny(text, filename);
    State.records = res.records;
    State.errors = res.errors;
    State.fileName = filename || State.fileName || 'data.txt';
    State.saveData(text);
    State.save();
    return res;
  };
  State.reset = function () {
    Object.keys(K).forEach(function (k) { store.del(K[k]); });
    State.records = []; State.raw = ''; State.name = ''; State.apiKey = ''; State.fileName = '';
  };

  /* ---------- export ---------- */
  function toJsonl(records) {
    return records.map(function (r) {
      var o = { date: r.date, skill: r.skill, source: r.source, test: r.test, url: r.url, band: r.band };
      if (r.time) o.time = r.time;
      if (r.correct != null) { o.correct = r.correct; o.total = r.total; }
      if (r.seconds != null) o.duration = fmtDur(r.seconds);
      if (r.answers) o.answers = r.answers;
      if (r.criteria) o.criteria = r.criteria;
      if (r.tasks) o.tasks = r.tasks;
      if (r.parts) o.parts = r.parts;
      if (r.notes) o.notes = r.notes;
      return JSON.stringify(o);
    }).join('\n');
  }

  function toCsv(records) {
    var cols = ['date', 'time', 'skill', 'source', 'test', 'url', 'correct', 'total', 'band', 'duration', 'detail', 'notes'];
    function esc(v) {
      if (v == null) return '';
      var s = String(v);
      return /[",\n\t]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var lines = [cols.join(',')];
    records.forEach(function (r) {
      var detail = {};
      if (r.answers) detail.answers = r.answers;
      if (r.criteria) detail.criteria = r.criteria;
      if (r.tasks) detail.tasks = r.tasks;
      if (r.parts) detail.parts = r.parts;
      lines.push([
        r.date, r.time || '', r.skill, r.source, r.test, r.url || '',
        r.correct != null ? r.correct : '', r.total != null ? r.total : '',
        r.band != null ? r.band : '', r.seconds != null ? fmtDur(r.seconds) : '',
        Object.keys(detail).length ? JSON.stringify(detail) : '', r.notes || ''
      ].map(esc).join(','));
    });
    return lines.join('\n');
  }

  /* ---------- expose ---------- */
  w.Core = {
    store: store, State: State, SKILLS: SKILLS, SKILL_LABEL: SKILL_LABEL, SECTIONS: SECTIONS,
    rawToBand: rawToBand, roundBand: roundBand, judge: judge, normalise: normalise,
    parseAny: parseAny, toJsonl: toJsonl, toCsv: toCsv,
    todayISO: todayISO, parseISO: parseISO, iso: iso, fmtDate: fmtDate, fmtDateShort: fmtDateShort,
    daysAgo: daysAgo, relDay: relDay, daysBetween: daysBetween, dateSeq: dateSeq,
    toSeconds: toSeconds, fmtDur: fmtDur, fmtMins: fmtMins, pad: pad,
    hostOf: hostOf, normUrl: normUrl, titleFromUrl: titleFromUrl, detectSkillFromUrl: detectSkillFromUrl,
    bySkill: bySkill, currentBand: currentBand, overallBand: overallBand, lastDate: lastDate,
    bandLevel: bandLevel, levelColor: levelColor, recencyLevel: recencyLevel,
    daily: daily, errorProfile: errorProfile, sourceProfile: sourceProfile, inRange: inRange,
    uid: uid, clean: clean, lev: lev
  };
})(window);
