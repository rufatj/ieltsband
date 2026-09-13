/* ============================================================
   BAND — shell, onboarding and routing
   ============================================================ */
(function (w) {
  'use strict';
  var C = w.Core, U = w.UI, V = w.Views, A = w.AI;
  var $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;

  var NAV = [
    { group: null, items: [
      { r: 'overview', k: 'overview', t: 'Overview' },
      { r: 'progress', k: 'progress', t: 'Progress' },
      { r: 'activity', k: 'activity', t: 'Activity' },
      { r: 'tests', k: 'tests', t: 'All tests' }
    ]},
    { group: 'Skills', items: [
      { r: 'skill/listening', k: 'listening', t: 'Listening', skill: 'listening' },
      { r: 'skill/reading', k: 'reading', t: 'Reading', skill: 'reading' },
      { r: 'skill/writing', k: 'writing', t: 'Writing', skill: 'writing' },
      { r: 'skill/speaking', k: 'speaking', t: 'Speaking', skill: 'speaking' }
    ]},
    { group: 'Tools', items: [
      { r: 'finder', k: 'finder', t: 'Test finder' },
      { r: 'coach', k: 'coach', t: 'Assistant' },
      { r: 'insights', k: 'insights', t: 'Insights' },
      { r: 'log', k: 'log', t: 'Log a test' }
    ]}
  ];

  var TITLES = {
    overview: 'Overview', progress: 'Progress', activity: 'Activity', tests: 'All tests',
    finder: 'Test finder', coach: 'Assistant', insights: 'Insights', log: 'Log a test',
    settings: 'Settings', connect: 'Connect'
  };

  var current = '';

  /* ============================================================
     THEME
     ============================================================ */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    C.store.set('band.theme', t);
    var b = $('[data-theme-btn]');
    if (b) b.innerHTML = icon(t === 'light' ? 'moon' : 'sun');
  }

  /* ============================================================
     ONBOARDING
     ============================================================ */
  var pending = { name: '', file: null, text: '' };

  function gate() {
    var g = $('#gate');
    g.style.display = 'grid';
    var step = 0;

    function show(n) {
      step = n;
      $$('.gate-step', g).forEach(function (s, i) { s.classList.toggle('on', i === n); });
      $$('.gate-progress i', g).forEach(function (i, k) { i.classList.toggle('done', k <= n); });
      var f = $$('.gate-step', g)[n].querySelector('input, button.btn');
      if (f && f.tagName === 'INPUT') setTimeout(function () { f.focus(); }, 200);
    }

    // step 1 — name
    var nameIn = $('[data-gname]', g);
    nameIn.value = C.State.name || '';
    function nextFromName() {
      var v = nameIn.value.trim();
      if (!v) { nameIn.style.borderColor = 'var(--low)'; nameIn.placeholder = 'A name is needed to greet you'; return; }
      pending.name = v;
      C.State.name = v; C.State.save();
      show(1);
    }
    $('[data-gname-go]', g).addEventListener('click', nextFromName);
    nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') nextFromName(); });

    // step 2 — key
    var provSel = $('[data-gprov]', g);
    provSel.innerHTML = Object.keys(A.PROVIDERS).map(function (p) {
      return '<option value="' + p + '"' + (C.State.provider === p ? ' selected' : '') + '>' + A.PROVIDERS[p].label + '</option>';
    }).join('');
    function ghint() {
      var p = A.PROVIDERS[provSel.value];
      $('[data-ghint]', g).innerHTML = p.keyHint + ' <a href="' + p.keyUrl + '" target="_blank" rel="noopener">Open ' + p.label + '</a>';
    }
    ghint();
    provSel.addEventListener('change', ghint);
    $('[data-gkey-help]', g).addEventListener('click', V.keyHelp);
    $('[data-gkey-go]', g).addEventListener('click', function () {
      C.State.apiKey = $('[data-gkey]', g).value.trim();
      C.State.provider = provSel.value;
      C.State.save();
      show(2);
    });
    $('[data-gkey-skip]', g).addEventListener('click', function () { show(2); });
    $('[data-gkey-back]', g).addEventListener('click', function () { show(0); });

    // step 3 — file
    var drop = $('[data-gdrop]', g);
    var fileIn = $('[data-gfile]', g);
    drop.addEventListener('click', function () { fileIn.click(); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('hot'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('hot'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('hot');
      if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
    });
    fileIn.addEventListener('change', function (e) { if (e.target.files[0]) pickFile(e.target.files[0]); });
    $('[data-gfile-back]', g).addEventListener('click', function () { show(1); });
    $('[data-gfile-help]', g).addEventListener('click', function () { dataHelp(); });
    $('[data-gfile-sample]', g).addEventListener('click', function () {
      readText(SAMPLE, 'sample-data.txt');
    });

    function pickFile(f) {
      var reader = new FileReader();
      var name = f.name || 'data.txt';
      if (/\.(xlsx|xls)$/i.test(name)) {
        readXlsx(f, name);
        return;
      }
      reader.onload = function () { readText(String(reader.result), name); };
      reader.onerror = function () { U.toast('That file could not be read.'); };
      reader.readAsText(f);
    }

    function readXlsx(f, name) {
      if (!w.XLSX) {
        U.toast('Excel support did not load. Save the sheet as CSV and try again.');
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var wb = w.XLSX.read(new Uint8Array(reader.result), { type: 'array' });
          var sheet = wb.Sheets[wb.SheetNames[0]];
          var csv = w.XLSX.utils.sheet_to_csv(sheet);
          readText(csv, name.replace(/\.(xlsx|xls)$/i, '.csv'));
        } catch (e) { U.toast('That workbook could not be read. Save it as CSV instead.'); }
      };
      reader.readAsArrayBuffer(f);
    }

    function readText(text, name) {
      var res = C.parseAny(text, name);
      if (!res.records.length) {
        $('[data-gerr]', g).innerHTML = '<div class="note bad" style="margin-top:14px"><b>Nothing readable in that file.</b> ' +
          esc(res.errors.join(' ')) + ' Open the guide below to see what a line should look like.</div>';
        return;
      }
      $('[data-gerr]', g).innerHTML = '';
      boot(text, name);
    }
  }

  /* ============================================================
     BOOT — loading screen, then the app
     ============================================================ */
  var MSGS = ['Reading your file', 'Converting raw scores', 'Building the timeline', 'Drawing the dashboard'];

  function boot(text, name) {
    var g = $('#gate'), b = $('#boot');
    g.style.display = 'none';
    b.style.display = 'grid';
    var i = 0;
    var msg = $('.boot-msg', b);
    msg.textContent = MSGS[0];
    var t = setInterval(function () {
      i = (i + 1) % MSGS.length;
      msg.textContent = MSGS[i];
    }, 520);

    setTimeout(function () {
      clearInterval(t);
      C.State.load(text, name);
      b.style.display = 'none';
      mount();
    }, 1450);
  }

  function ingest(file, done) {
    var name = file.name || 'data.txt';
    function finish(text, nm) {
      var res = C.parseAny(text, nm);
      if (!res.records.length) { U.toast('Nothing readable in that file.'); return; }
      C.State.load(text, nm);
      refreshChrome();
      render();
      if (done) done();
    }
    if (/\.(xlsx|xls)$/i.test(name) && w.XLSX) {
      var r1 = new FileReader();
      r1.onload = function () {
        try {
          var wb = w.XLSX.read(new Uint8Array(r1.result), { type: 'array' });
          finish(w.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]), name.replace(/\.(xlsx|xls)$/i, '.csv'));
        } catch (e) { U.toast('That workbook could not be read. Save it as CSV instead.'); }
      };
      r1.readAsArrayBuffer(file);
      return;
    }
    var r = new FileReader();
    r.onload = function () { finish(String(r.result), name); };
    r.onerror = function () { U.toast('That file could not be read.'); };
    r.readAsText(file);
  }

  /* ============================================================
     SHELL
     ============================================================ */
  function mount() {
    $('#app').classList.add('on');
    buildRail();
    refreshChrome();
    if (!location.hash || location.hash === '#') location.hash = '#/overview';
    else render();
    w.addEventListener('hashchange', render);
  }

  function buildRail() {
    var rail = $('#rail-scroll');
    rail.innerHTML = NAV.map(function (grp) {
      return (grp.group ? '<div class="rail-group colhead">' + grp.group + '</div>' : '') +
        grp.items.map(function (it) {
          return '<button class="navi" data-r="' + it.r + '" title="' + it.t + '">' +
            icon(it.k) + '<span class="navi-txt">' + it.t + '</span>' +
            (it.skill ? '<i class="navi-dot" data-dot="' + it.skill + '"></i>' : '') +
            '</button>';
        }).join('');
    }).join('') +
      '<div class="rail-group colhead" style="margin-top:8px">Account</div>' +
      '<button class="navi" data-r="settings" title="Settings">' + icon('settings') + '<span class="navi-txt">Settings</span></button>' +
      '<button class="navi" data-r="connect" title="Connect">' + icon('connect') + '<span class="navi-txt">Connect</span></button>';

    $$('[data-r]', rail).forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#/' + b.getAttribute('data-r'); });
    });

    $('#rail-toggle').addEventListener('click', function () {
      document.body.classList.toggle('rail-min');
      C.store.set('band.rail', document.body.classList.contains('rail-min') ? '1' : '0');
      setTimeout(redraw, 360);
    });
    if (C.store.get('band.rail') === '1') document.body.classList.add('rail-min');

    $('[data-theme-btn]').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
      setTimeout(redraw, 60);
    });
    $('[data-mark]').addEventListener('click', V.connectModal);
  }

  function refreshChrome() {
    // recency dots on the skill nav
    var per = C.bySkill(C.State.records);
    $$('[data-dot]').forEach(function (d) {
      var sk = d.getAttribute('data-dot');
      var days = C.daysAgo(C.lastDate(per[sk]));
      d.style.background = per[sk].length ? C.levelColor(C.recencyLevel(days)) : 'var(--line)';
      d.title = per[sk].length ? 'Last practised ' + C.relDay(days) : 'No data';
    });
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function parseHash() {
    var h = (location.hash || '#/overview').replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var params = {};
    if (qi > -1) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      h = h.slice(0, qi);
    }
    return { path: h.replace(/\/$/, '') || 'overview', params: params };
  }

  function render() {
    var r = parseHash();
    current = r.path;
    var seg = r.path.split('/');
    var page = $('#page');

    // nav highlight
    $$('[data-r]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-r') === r.path);
    });

    var title = TITLES[r.path] || '';
    var sub = '';
    if (seg[0] === 'skill') { title = C.SKILL_LABEL[seg[1]] || 'Skill'; $$('[data-r="skill/' + seg[1] + '"]').forEach(function (b) { b.classList.add('on'); }); }
    if (seg[0] === 'test') { title = 'Attempt'; }
    if (r.path === 'overview') sub = C.State.records.length + ' attempts on file';

    $('#head-title').textContent = title;
    $('#head-sub').textContent = sub;
    $('#head-sub').style.display = sub ? '' : 'none';

    page.className = 'page page-enter';
    page.innerHTML = '';
    // force reflow so the entrance animation replays
    void page.offsetWidth;

    try {
      switch (seg[0]) {
        case 'overview': V.overview(page); break;
        case 'progress': V.progress(page); break;
        case 'activity': V.activity(page); break;
        case 'tests': V.tests(page, r.params); break;
        case 'skill': V.skill(page, C.SKILLS.indexOf(seg[1]) > -1 ? seg[1] : 'reading'); break;
        case 'test': V.detail(page, seg[1]); break;
        case 'finder': V.finder(page); break;
        case 'coach': V.coach(page, r.params); break;
        case 'insights': V.insights(page); break;
        case 'log': V.log(page); break;
        case 'settings': V.settings(page); break;
        case 'connect': V.connect(page); break;
        default: location.hash = '#/overview'; return;
      }
    } catch (e) {
      page.innerHTML = '<div class="empty"><div class="empty-ico">' + icon('alert', 40) + '</div>' +
        '<h4>This page hit a problem</h4><p>' + esc(e.message) + '</p>' +
        '<button class="btn ghost" onclick="location.hash=\'#/overview\'">Back to the overview</button></div>';
      if (w.console) console.error(e);
    }

    V.animateCrits(page);
    setTimeout(function () {
      $$('.sitebar-t i', page).forEach(function (i) {
        var wdt = i.style.width; i.style.width = '0'; void i.offsetWidth; i.style.width = wdt;
      });
    }, 30);
    w.scrollTo({ top: 0, behavior: 'auto' });
  }

  function redraw() { if ($('#app').classList.contains('on')) render(); }

  /* ---------- data help modal (shown from the gate) ---------- */
  function dataHelp() {
    var body =
      '<p class="hint" style="margin:0 0 18px;font-size:13px">There is no database behind this page. Your own file <em>is</em> the database, which is why it can be hosted anywhere for free and why your results never leave your machine. The only rule is that every test sits on its own line, in the same shape.</p>' +
      '<div class="colhead" style="margin-bottom:10px">Option one — a plain text file</div>' +
      '<p class="hint" style="margin:0 0 12px">One line of JSON per test. Open Notepad or TextEdit, save as <code>ielts-data.txt</code>, and paste each new line at the bottom. This is the one to pick.</p>' +
      '<div class="code" style="max-height:150px">' + esc(SAMPLE.split('\n').slice(0, 3).join('\n')) + '</div>' +
      '<div class="colhead" style="margin:22px 0 10px">Option two — a spreadsheet</div>' +
      '<p class="hint" style="margin:0 0 12px">Twelve columns in this order. Fill one row per test and export as CSV when you want to load it here.</p>' +
      '<div class="code">date | time | skill | source | test | url | correct | total | band | duration | detail | notes</div>' +
      '<div class="colhead" style="margin:22px 0 10px">You do not have to write any of this yourself</div>' +
      '<p class="hint" style="margin:0 0 14px">Once you are inside, the <b>Log a test</b> page gives you a prompt to paste into any chat assistant. Send it your test link and your result; it returns the finished line. You only ever copy and paste.</p>' +
      '<div class="note">Start with the sample file if you want to look around first. Your own file replaces it in one click from Settings.</div>';
    U.modal('Preparing your data file', body, { large: true });
  }

  /* ---------- sample data ---------- */
  var SAMPLE = [
    '{"date":"2026-08-03","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 15 Academic Reading Test 1","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-15-academic-reading-test-1/","correct":24,"total":40,"duration":"58:10","answers":[{"n":1,"you":"TRUE","ans":"TRUE"},{"n":2,"you":"FALSE","ans":"NOT GIVEN"},{"n":3,"you":"TRUE","ans":"TRUE"},{"n":4,"you":"NOT GIVEN","ans":"NOT GIVEN"},{"n":5,"you":"FALSE","ans":"FALSE"},{"n":6,"you":"chimneys","ans":"chimney"},{"n":7,"you":"","ans":"salt"},{"n":8,"you":"iron","ans":"iron"},{"n":9,"you":"steam","ans":"steam"},{"n":10,"you":"coper","ans":"copper"},{"n":27,"you":"B","ans":"D"},{"n":28,"you":"A","ans":"A"},{"n":38,"you":"","ans":"YES"},{"n":39,"you":"","ans":"NO"},{"n":40,"you":"","ans":"NOT GIVEN"}],"notes":"Ran out of time in passage 3"}',
    '{"date":"2026-08-05","skill":"listening","source":"engnovate.com","test":"Cambridge IELTS 16 Listening Test 2","url":"https://engnovate.com/ielts-listening-tests/cambridge-ielts-16-listening-test-2/","correct":29,"total":40,"duration":"33:40","answers":[{"n":1,"you":"harbour","ans":"harbour"},{"n":2,"you":"Tuesday","ans":"Tuesday"},{"n":3,"you":"15","ans":"50"},{"n":4,"you":"libary","ans":"library"},{"n":11,"you":"C","ans":"C"},{"n":12,"you":"A","ans":"B"},{"n":31,"you":"","ans":"migration"},{"n":32,"you":"","ans":"predators"}]}',
    '{"date":"2026-08-09","skill":"writing","source":"engnovate.com","test":"Transport modes 2000 vs 2020","band":6.5,"duration":"40:30","tasks":[{"task":1,"band":6.5,"words":178,"prompt":"The chart below shows the modes of transport people used in 2000 and 2020.","essay":"The chart illustrates the proportion of four transport modes in 2000 and 2020.\\n\\nOverall, despite a decline in car usage, cars remained the most popular mode of transportation throughout the period. Some of the transportation slightly increased, while popularity of walking remained same in the same timeline.\\n\\nThe figure of car was the most popular choice as traveling with exactly 60% in 2000, and it declined to 50% by 2020. The proportion of public transportation and bicycle rose from approximately 25% and 5% to about 30% and 10% respectively.\\n\\nIn contrast, walking stayed at 10% across both years, making it the least changed category.","criteria":{"Task Achievement":7,"Coherence & Cohesion":7,"Lexical Resource":6,"Grammatical Range & Accuracy":6},"detail":[{"sub":"Overview","score":7,"comment":"Captures the main patterns effectively. Tighten it: \\"while car usage declined, it remained dominant, whereas public transport and cycling grew and walking stayed stable\\"."},{"sub":"Data Support & Accuracy","score":7.5,"comment":"Figures are accurate, but walking is called the least popular mode when cycling was lower in 2000 at 5%."},{"sub":"Range & Flexibility of Structures","score":6,"comment":"Try participle clauses: \\"Rising from 25% to 30%, public transport became more popular.\\""},{"sub":"Precision & Appropriacy","score":6,"comment":"Replace \\"The figure of car\\" with \\"Car usage\\", and \\"as traveling with\\" with \\"accounting for\\"."}]}]}',
    '{"date":"2026-08-12","skill":"reading","source":"ieltsonlinetests.com","test":"IELTS Online Tests Academic Reading 7","url":"https://ieltsonlinetests.com/ielts-academic-reading-7","correct":28,"total":40,"duration":"59:02"}',
    '{"date":"2026-08-16","skill":"speaking","source":"self-study","test":"Speaking mock — hometown, a book, technology","band":6.5,"duration":"14:20","criteria":{"Fluency & Coherence":7,"Lexical Resource":6,"Grammatical Range & Accuracy":6,"Pronunciation":7},"parts":[{"part":1,"band":7,"topic":"Hometown and daily routine","transcript":"I come from Baku, which is the capital of Azerbaijan. I have lived there my whole life, so I know it quite well.","feedback":"Natural pace, but answers stop too early. Extend each one with a reason."},{"part":2,"band":6.5,"topic":"Describe a book you enjoyed","transcript":"I would like to talk about a book I read last year. It is called Sapiens and it is about human history.","feedback":"Good structure. Vocabulary stays general — reach for precise nouns."},{"part":3,"band":6,"topic":"Reading habits and technology","transcript":"I think people read less now because of phones. It is a big problem in my opinion.","feedback":"Opinions are stated but not defended. Give one concrete example per answer."}]}',
    '{"date":"2026-08-21","skill":"listening","source":"engnovate.com","test":"Cambridge IELTS 17 Listening Test 1","url":"https://engnovate.com/ielts-listening-tests/cambridge-ielts-17-listening-test-1/","correct":32,"total":40,"duration":"32:15"}',
    '{"date":"2026-08-24","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 19 Academic Reading Test 2","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-19-academic-reading-test-2/","correct":30,"total":40,"duration":"56:45","answers":[{"n":1,"you":"TRUE","ans":"TRUE"},{"n":2,"you":"NOT GIVEN","ans":"FALSE"},{"n":14,"you":"vi","ans":"vi"},{"n":15,"you":"iii","ans":"ii"},{"n":27,"you":"C","ans":"C"},{"n":36,"you":"sediment","ans":"sediments"},{"n":40,"you":"","ans":"NO"}]}',
    '{"date":"2026-08-28","skill":"writing","source":"engnovate.com","test":"Task 2 — Working from home","band":6,"duration":"41:00","tasks":[{"task":2,"band":6,"words":262,"prompt":"Some people believe working from home benefits employees more than employers. Discuss both views and give your opinion.","essay":"In recent years, remote work has become very common. Some people think it helps workers more than companies, while others disagree. In my opinion, both sides gain, but the balance depends on the industry.\\n\\nOn the one hand, employees save commuting time and money. This is a big advantage for people who live far from the city centre. They can also arrange their day more freely, which is good for families.\\n\\nOn the other hand, companies also benefit because they spend less on office space. However, communication can become harder and new staff may struggle to learn.\\n\\nIn conclusion, I believe working from home is good for both sides if companies invest in proper tools.","criteria":{"Task Response":6,"Coherence & Cohesion":6,"Lexical Resource":6,"Grammatical Range & Accuracy":6},"detail":[{"sub":"Position","score":6,"comment":"A position exists but it appears late. State it in the introduction and keep it consistent."},{"sub":"Development of Ideas","score":5.5,"comment":"Each body paragraph gives a claim without an example. One concrete example per paragraph would lift this a band."}]}]}',
    '{"date":"2026-09-01","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 14 Academic Reading Test 3","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-14-academic-reading-test-3/","correct":13,"total":40,"duration":"01:04","answers":[{"n":1,"you":"TRUE","ans":"FALSE"},{"n":2,"you":"FALSE","ans":"FALSE"},{"n":3,"you":"TRUE","ans":"TRUE"},{"n":4,"you":"NOT GIVEN","ans":"NOT GIVEN"},{"n":5,"you":"NOT GIVEN","ans":"TRUE"},{"n":6,"you":"TRUE","ans":"NOT GIVEN"},{"n":7,"you":"FALSE","ans":"FALSE"},{"n":8,"you":"caves","ans":"caves"},{"n":9,"you":"stone","ans":"stone"},{"n":10,"you":"cuscus","ans":"bones"},{"n":11,"you":"beads","ans":"beads"},{"n":12,"you":"pottery","ans":"pottery"},{"n":13,"you":"spices","ans":"spices"},{"n":14,"you":"","ans":"G"},{"n":15,"you":"","ans":"A"},{"n":16,"you":"","ans":"H"},{"n":17,"you":"","ans":"B"},{"n":18,"you":"carbon","ans":"carbon"},{"n":19,"you":"","ans":"fires"},{"n":20,"you":"8","ans":"biodiversity"},{"n":21,"you":"","ans":"ditches"},{"n":22,"you":"","ans":"subsidence"},{"n":23,"you":"","ans":"A"},{"n":24,"you":"","ans":"C"},{"n":25,"you":"","ans":"D"},{"n":26,"you":"","ans":"B"},{"n":27,"you":"D","ans":"D"},{"n":28,"you":"C","ans":"A"},{"n":29,"you":"C","ans":"C"},{"n":30,"you":"B","ans":"B"},{"n":31,"you":"D","ans":"C"},{"n":32,"you":"C","ans":"E"},{"n":33,"you":"","ans":"F"},{"n":34,"you":"","ans":"B"},{"n":35,"you":"","ans":"NO"},{"n":36,"you":"","ans":"YES"},{"n":37,"you":"","ans":"NO"},{"n":38,"you":"","ans":"NOT GIVEN"},{"n":39,"you":"","ans":"NOT GIVEN"},{"n":40,"you":"","ans":"YES"}],"notes":"Abandoned this one after a minute — logging it so the gap is visible"}',
    '{"date":"2026-09-05","skill":"listening","source":"engnovate.com","test":"Cambridge IELTS 18 Listening Test 3","url":"https://engnovate.com/ielts-listening-tests/cambridge-ielts-18-listening-test-3/","correct":33,"total":40,"duration":"31:50"}',
    '{"date":"2026-09-08","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 19 Academic Reading Test 2","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-19-academic-reading-test-2/","correct":34,"total":40,"duration":"54:30","notes":"Second attempt — much better"}',
    '{"date":"2026-09-11","skill":"listening","source":"ieltsliz.com","test":"Practice set — map and form completion","correct":35,"total":40,"duration":"29:10"}'
  ].join('\n');

  /* ============================================================
     START
     ============================================================ */
  function start() {
    applyTheme(C.store.get('band.theme') || 'dark');

    // returning visitor with a cached file
    if (C.State.name && C.State.raw) {
      var res = C.parseAny(C.State.raw, C.State.fileName);
      if (res.records.length) {
        C.State.records = res.records;
        C.State.errors = res.errors;
        $('#gate').style.display = 'none';
        mount();
        return;
      }
    }
    gate();
  }

  w.App = { redraw: redraw, render: render, ingest: ingest, refreshChrome: refreshChrome, SAMPLE: SAMPLE };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
