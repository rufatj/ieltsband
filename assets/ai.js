/* ============================================================
   BAND — AI layer. The key never leaves the browser: every
   request goes straight from this page to the provider.
   ============================================================ */
(function (w) {
  'use strict';
  var C = w.Core;

  var PROVIDERS = {
    groq: {
      label: 'Groq',
      model: 'llama-3.3-70b-versatile',
      keyUrl: 'https://console.groq.com/keys',
      keyHint: 'Sign in, open API Keys, create a key. The free tier is generous and fast.',
      endpoint: function () { return 'https://api.groq.com/openai/v1/chat/completions'; },
      style: 'openai'
    },
    gemini: {
      label: 'Google AI Studio',
      model: 'gemini-2.0-flash',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      keyHint: 'Open AI Studio, click Get API key, create one in a new project. Free to use.',
      endpoint: function (m) { return 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent'; },
      style: 'gemini'
    },
    openai: {
      label: 'OpenAI',
      model: 'gpt-4o-mini',
      keyUrl: 'https://platform.openai.com/api-keys',
      keyHint: 'Paid account required.',
      endpoint: function () { return 'https://api.openai.com/v1/chat/completions'; },
      style: 'openai'
    },
    openrouter: {
      label: 'OpenRouter',
      model: 'google/gemini-2.0-flash-exp:free',
      keyUrl: 'https://openrouter.ai/keys',
      keyHint: 'One key, many models. Several are free.',
      endpoint: function () { return 'https://openrouter.ai/api/v1/chat/completions'; },
      style: 'openai'
    }
  };

  function cfg() {
    var p = PROVIDERS[C.State.provider] || PROVIDERS.groq;
    return { p: p, model: C.State.model || p.model, key: C.State.apiKey };
  }

  function hasKey() { return !!(C.State.apiKey && C.State.apiKey.trim()); }

  /* ---------- call ---------- */
  function ask(system, user, opts) {
    opts = opts || {};
    var c = cfg();
    if (!c.key) return Promise.reject(new Error('No API key saved. Add one in Settings to use the assistant.'));

    if (c.p.style === 'gemini') {
      var body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: opts.temp != null ? opts.temp : 0.4, maxOutputTokens: opts.max || 2400 }
      };
      if (opts.search) body.tools = [{ google_search: {} }];
      return fetch(c.p.endpoint(c.model) + '?key=' + encodeURIComponent(c.key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      }).then(readJson).then(function (d) {
        var cand = d.candidates && d.candidates[0];
        if (!cand) throw new Error(d.error ? d.error.message : 'The model returned no answer.');
        return (cand.content.parts || []).map(function (p) { return p.text || ''; }).join('');
      });
    }

    return fetch(c.p.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
      body: JSON.stringify({
        model: c.model,
        temperature: opts.temp != null ? opts.temp : 0.4,
        max_tokens: opts.max || 2400,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      })
    }).then(readJson).then(function (d) {
      if (d.error) throw new Error(d.error.message || 'The provider rejected the request.');
      var ch = d.choices && d.choices[0];
      if (!ch) throw new Error('The model returned no answer.');
      return ch.message.content || '';
    });
  }

  function readJson(res) {
    return res.text().then(function (t) {
      var d;
      try { d = JSON.parse(t); } catch (e) { d = null; }
      if (!res.ok) {
        var msg = (d && d.error && (d.error.message || d.error)) || ('Request failed (' + res.status + ').');
        if (res.status === 401 || res.status === 403) msg = 'The API key was rejected. Check it in Settings.';
        if (res.status === 429) msg = 'Rate limit reached. Wait a moment and try again.';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      if (!d) throw new Error('The provider sent a response this page could not read.');
      return d;
    });
  }

  /* ============================================================
     THE DATABASE-BUILDER PROMPT
     This is what the user copies into their chat assistant.
     ============================================================ */
  function builderPrompt(name, format) {
    var who = name || 'the student';
    var isCsv = format === 'csv';

    return [
      'You are the IELTS Logger for BAND, an IELTS practice analytics dashboard built by Rufat Jabrayilli.',
      'Your only job is to turn a student\'s practice-test results into one exact database line that their dashboard can read.',
      '',
      '## Your first message',
      'Open the conversation with exactly this, then stop and wait:',
      '',
      'Hello ' + who + '! You have reached the logger for the IELTS analytics dashboard Rufat built.',
      'I will turn each practice test you finish into one line you can paste straight into your data file.',
      'Send me the link to the test you just did — or, if there is no link, just tell me which skill you practised.',
      '',
      '## Language',
      'Reply in whatever language ' + who + ' writes to you in. The database line itself is always in English.',
      '',
      '## What to collect',
      'Work through these, but never ask for something you can already work out:',
      '1. The test URL. From it, derive the source site, the skill and the test name — do not ask for things the link already tells you.',
      '   Example: https://engnovate.com/ielts-reading-tests/cambridge-ielts-14-academic-reading-test-3/',
      '   gives source "engnovate.com", skill "reading", test "Cambridge IELTS 14 Academic Reading Test 3".',
      '   If the link does not say which skill it was, ask: listening, reading, writing or speaking?',
      '   If there is no link at all (spoken practice, a paper book, an app), ask where they practised and use that as the source.',
      '2. The date. If they do not say, assume today and say so.',
      '3. How long it took, as mm:ss or hh:mm:ss. If they do not know, leave it out.',
      '4. The result.',
      '   Reading / Listening: the raw score out of 40, and the answer table if they have it.',
      '   Writing: a band for each task, plus the essay text and any examiner feedback.',
      '   Speaking: a band for each part, plus any transcript or feedback.',
      '',
      '## Answer tables',
      'Students usually paste a table with three columns: question number, their answer, the correct answer.',
      'Rules for reading such a table:',
      '- An empty "your answer" cell means the question was left blank. Record it as an empty string, never as null and never guessed.',
      '- Copy answers exactly as written, including TRUE / FALSE / NOT GIVEN and single letters.',
      '- If the paste contains headers, banners, timers or advertising text, ignore all of it.',
      '- If only some questions are present, record only those. Never invent a row.',
      '- If the stated score and the table disagree, trust the table and mention the difference in your reply.',
      '',
      '## Band conversion (only when they did not give a band)',
      'Listening, out of 40: 39-40=9.0, 37-38=8.5, 35-36=8.0, 32-34=7.5, 30-31=7.0, 26-29=6.5, 23-25=6.0, 18-22=5.5, 16-17=5.0, 13-15=4.5, 11-12=4.0, 8-10=3.5, 6-7=3.0, 4-5=2.5.',
      'Academic Reading, out of 40: 39-40=9.0, 37-38=8.5, 35-36=8.0, 33-34=7.5, 30-32=7.0, 27-29=6.5, 23-26=6.0, 19-22=5.5, 15-18=5.0, 13-14=4.5, 10-12=4.0, 8-9=3.5, 6-7=3.0, 4-5=2.5.',
      'If the practice site printed its own band, use that instead and keep the raw score as well.',
      'Writing overall = (Task 1 + 2 x Task 2) / 3, rounded to the nearest 0.5.',
      'Speaking overall = the mean of the four criteria, rounded to the nearest 0.5.',
      '',
      '## Missing information',
      'Nothing is compulsory except the date and the skill. Leave out any field you were not given.',
      'Never guess a band, never invent answers, never pad an essay. A thin line is fine; a wrong line is not.',
      '',
      '## Repeats',
      'If they say they have done this test before, still produce a normal line. The dashboard counts repeats on its own.',
      '',
      isCsv ? csvSpec() : jsonSpec(),
      '',
      '## How to end every logging turn',
      'Give a one-sentence plain summary of what you recorded, then the line in a code block, then nothing else.',
      'No commentary after the code block. No blank line inside the block. The line must be a single line.',
      'Then say: "Paste this on a new line at the end of your data file."',
      '',
      'Begin with your first message now.'
    ].join('\n');
  }

  function jsonSpec() {
    return [
      '## Output format — one line of JSON',
      'Return exactly one line. No line breaks inside it. No trailing comma. No surrounding array.',
      'It must be valid JSON that survives being pasted at the end of a plain text file.',
      '',
      'Fields:',
      '  date      "YYYY-MM-DD"                          required',
      '  skill     "listening"|"reading"|"writing"|"speaking"   required',
      '  source    the site, e.g. "engnovate.com"',
      '  test      the human name of the test',
      '  url       the full link',
      '  correct   raw score, reading and listening only',
      '  total     usually 40',
      '  band      0-9 in 0.5 steps',
      '  duration  "mm:ss" or "hh:mm:ss"',
      '  answers   [{"n":1,"you":"TRUE","ans":"FALSE"}, ...]   use "" for a blank answer',
      '  tasks     writing:  [{"task":1,"band":6.5,"words":168,"prompt":"...","essay":"...","criteria":{"Task Achievement":7,"Coherence & Cohesion":7,"Lexical Resource":6,"Grammatical Range & Accuracy":6},"detail":[{"sub":"Overview","score":7,"comment":"..."}]}]',
      '  parts     speaking: [{"part":1,"band":7,"transcript":"...","feedback":"..."}]',
      '  criteria  speaking: {"Fluency & Coherence":7,"Lexical Resource":6.5,"Grammatical Range & Accuracy":7,"Pronunciation":7}',
      '  notes     anything worth remembering, one short sentence',
      '',
      'Escape every newline inside essay, transcript, comment and feedback as \\n so the record stays on one line.',
      '',
      'Reading example:',
      '{"date":"2026-09-02","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 14 Academic Reading Test 3","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-14-academic-reading-test-3/","correct":13,"total":40,"band":4.5,"duration":"00:01:04","answers":[{"n":1,"you":"TRUE","ans":"FALSE"},{"n":2,"you":"FALSE","ans":"FALSE"},{"n":14,"you":"","ans":"G"}],"notes":"Ran out of time on passage 3"}',
      '',
      'Writing example:',
      '{"date":"2026-09-04","skill":"writing","source":"engnovate.com","test":"Transport modes 2000 vs 2020","url":"","band":6.5,"duration":"40:30","tasks":[{"task":1,"band":6.5,"words":178,"prompt":"The chart shows transport modes in 2000 and 2020.","essay":"The chart illustrates...","criteria":{"Task Achievement":7,"Coherence & Cohesion":7,"Lexical Resource":6,"Grammatical Range & Accuracy":6},"detail":[{"sub":"Overview","score":7,"comment":"Captures the main patterns but could be tighter."},{"sub":"Data Support & Accuracy","score":7.5,"comment":"Figures are accurate; ranking of walking is wrong."}]}]}'
    ].join('\n');
  }

  function csvSpec() {
    return [
      '## Output format — one spreadsheet row',
      'The student keeps a sheet whose first row is exactly these twelve headers, in this order:',
      'date | time | skill | source | test | url | correct | total | band | duration | detail | notes',
      '',
      'Return the twelve values for one row, tab-separated, on a single line, so that pasting into the first empty cell fills the row.',
      'Leave a cell empty rather than writing "null" or "N/A".',
      'The "detail" cell holds one JSON object with whichever of these apply: answers, tasks, parts, criteria.',
      'Escape every newline inside it as \\n.',
      '',
      'Example row (tabs shown as → ):',
      '2026-09-02→→reading→engnovate.com→Cambridge IELTS 14 Academic Reading Test 3→https://engnovate.com/...→13→40→4.5→00:01:04→{"answers":[{"n":1,"you":"TRUE","ans":"FALSE"}]}→Ran out of time',
      '',
      'If the sheet does not exist yet, give the header row first, in its own code block, then the data row.'
    ].join('\n');
  }

  /* ============================================================
     In-app coaching prompts
     ============================================================ */
  var COACH = 'You are a senior IELTS examiner and tutor with fifteen years of Cambridge marking experience. ' +
    'You are blunt, specific and useful. You never pad, never flatter and never repeat the student\'s data back to them. ' +
    'Every claim you make must point at something concrete in the material you were given. ' +
    'Write in clean markdown: short paragraphs, ## for sections, bullets only for genuine lists. Never use a horizontal rule.';

  function recordDigest(r) {
    var o = {
      date: r.date, skill: r.skill, band: r.band, test: r.test, source: r.source,
      score: r.correct != null ? r.correct + '/' + r.total : null,
      duration: r.seconds != null ? C.fmtDur(r.seconds) : null
    };
    if (r.answers) {
      o.wrong = r.answers.filter(function (a) { return C.judge(a.you, a.ans).state === 'wrong'; })
        .map(function (a) { return { n: a.n, you: a.you, correct: a.ans, type: C.judge(a.you, a.ans).tag }; });
      o.blank = r.answers.filter(function (a) { return C.judge(a.you, a.ans).state === 'blank'; }).map(function (a) { return a.n; });
    }
    if (r.tasks) o.tasks = r.tasks;
    if (r.parts) o.parts = r.parts;
    if (r.criteria) o.criteria = r.criteria;
    if (r.notes) o.notes = r.notes;
    return o;
  }

  function analyseAttempt(r, history, target) {
    var past = history.filter(function (x) { return x.skill === r.skill && x.date < r.date; }).slice(-6).map(recordDigest);
    var user;
    if (r.skill === 'writing' || r.skill === 'speaking') {
      user = 'Target band: ' + target + '.\n\n' +
        'Mark this ' + r.skill + ' attempt as an examiner would.\n\n' +
        'ATTEMPT:\n' + JSON.stringify(recordDigest(r)) + '\n\n' +
        'THE STUDENT\'S LAST FEW ' + r.skill.toUpperCase() + ' ATTEMPTS:\n' + JSON.stringify(past) + '\n\n' +
        'Produce exactly these sections:\n' +
        '## Where this sits\nOne paragraph: the band you would award per criterion and why, against the descriptors.\n' +
        '## Language under the microscope\nQuote at least four phrases verbatim from their own text. For each, say what is wrong and give the rewrite you would accept at band ' + target + '. Flag any word or structure they lean on repeatedly and supply three replacements.\n' +
        '## Against their own history\nCompare with the earlier attempts above. Name what has improved and what keeps recurring. If a mistake appears in more than one attempt, say so explicitly.\n' +
        '## Next three sessions\nThree numbered drills, each tied to a specific weakness you just named. No generic advice.';
    } else {
      user = 'Target band: ' + target + '.\n\n' +
        'Diagnose this ' + r.skill + ' attempt.\n\n' +
        'ATTEMPT:\n' + JSON.stringify(recordDigest(r)) + '\n\n' +
        'THE STUDENT\'S LAST FEW ' + r.skill.toUpperCase() + ' ATTEMPTS:\n' + JSON.stringify(past) + '\n\n' +
        'Produce exactly these sections:\n' +
        '## What went wrong\nGroup the wrong answers by cause — spelling, word form, Not Given confusion, matching, detail missed, ran out of time. Cite question numbers.\n' +
        '## The pattern\nWhich question types cost the most marks, and where in the paper. If blanks cluster at the end, say what that means about pacing.\n' +
        '## Against their own history\nCompare with the earlier attempts above. Name the recurring cause.\n' +
        '## Next three sessions\nThree numbered drills aimed at the cause you just named, with the question type stated.';
    }
    return ask(COACH, user, { max: 2600 });
  }

  function compareRange(records, skill, target) {
    var set = records.filter(function (r) { return skill === 'all' || r.skill === skill; }).slice(-12).map(recordDigest);
    var user = 'Target band: ' + target + '.\n\n' +
      'Here are the student\'s recent attempts, oldest first:\n' + JSON.stringify(set) + '\n\n' +
      'Produce exactly these sections:\n' +
      '## The trajectory\nAre they improving, flat or sliding? Use the band numbers and dates. Estimate whether the current rate reaches band ' + target + ', and by roughly when.\n' +
      '## What keeps costing marks\nThe two or three error causes that repeat across attempts, with the attempt dates where each appeared.\n' +
      '## What has actually improved\nOnly things the data supports.\n' +
      '## The plan for the next two weeks\nA week-by-week schedule naming skills, question types and how many papers.';
    return ask(COACH, user, { max: 2400 });
  }

  function findTests(records, skill, site, target) {
    var done = records.filter(function (r) { return skill === 'any' || r.skill === skill; })
      .map(function (r) { return { test: r.test, url: r.url, date: r.date, band: r.band }; });
    var sys = 'You help an IELTS student find practice tests they have not done yet. ' +
      'You know the standard Cambridge IELTS series (books 1-19, four academic tests each) and the way practice sites name and number them. ' +
      'Be concrete: give real test names and, where you are confident of the URL pattern, the link. ' +
      'If you are not sure a link exists, say so next to it rather than presenting a guess as fact. Write clean markdown.';
    var user = 'Skill wanted: ' + (skill === 'any' ? 'any' : skill) + '\n' +
      'Preferred site: ' + (site || 'no preference') + '\n' +
      'Target band: ' + target + '\n\n' +
      'Already completed:\n' + JSON.stringify(done) + '\n\n' +
      'Suggest up to ten tests they have NOT done, hardest-matching-their-level first.\n' +
      'If they appear to have done everything on that site, instead list the ten completed tests they last touched longest ago, with the date and band, and say they are due for a retake.\n' +
      'Format each suggestion as a markdown list item: **Test name** — one line on why it suits them, then the link on its own.';
    return ask(sys, user, { max: 2000, search: (C.State.provider === 'gemini') });
  }

  /* ---------- tiny markdown renderer ---------- */
  function md(t) {
    if (!t) return '';
    var esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var lines = esc.split(/\r?\n/), out = [], inList = false;
    function closeList() { if (inList) { out.push('</ul>'); inList = false; } }
    lines.forEach(function (l) {
      var t2 = l.trim();
      if (/^#{1,6}\s/.test(t2)) { closeList(); out.push('<h4>' + t2.replace(/^#{1,6}\s/, '') + '</h4>'); return; }
      if (/^(\*|-|\d+\.)\s+/.test(t2)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(t2.replace(/^(\*|-|\d+\.)\s+/, '')) + '</li>');
        return;
      }
      if (/^(---+|___+|\*\*\*+)$/.test(t2)) { closeList(); return; }
      if (!t2) { closeList(); return; }
      closeList();
      out.push('<p>' + inline(t2) + '</p>');
    });
    closeList();
    return out.join('');
  }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  }

  w.AI = {
    PROVIDERS: PROVIDERS, cfg: cfg, hasKey: hasKey, ask: ask,
    builderPrompt: builderPrompt, analyseAttempt: analyseAttempt,
    compareRange: compareRange, findTests: findTests, md: md
  };
})(window);
