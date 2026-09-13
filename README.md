# BAND — IELTS practice analytics

A dashboard for your own IELTS practice history. Every test you have taken, scored,
timed, compared and picked apart.

There is no backend and no database. Your own file is the data, which is why the whole
thing is a folder of static files you can drop onto any host for free, and why your
results never leave your machine.

Built by [Rufat Jabrayilli](https://github.com/rufatj).

---

## Deploy

No build step. No dependencies to install.

**Netlify** — drag this whole folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Done.

**Vercel** — `npx vercel` from inside this folder, or connect the repo and accept the
defaults. `vercel.json` is already here.

**GitHub Pages** — push the folder, then Settings → Pages → deploy from branch, root.

**Locally** — open `index.html` directly, or run `python3 -m http.server` and visit
`localhost:8000`.

---

## What it does

| Page | What you get |
| --- | --- |
| Overview | Four animated band gauges, the overall band, how far you are from target, and a colour-coded warning for any skill you have let slide |
| Progress | Band over time for one skill or all four, papers and minutes per day, best-to-worst spread, consistency |
| Activity | A practice calendar, time split by skill, and which days of the week you actually work |
| All tests | Every attempt in a sortable table — click any column header, click any row to open it |
| Skill pages | One page per skill: current band, error causes, every attempt |
| Test finder | Paste a link to see whether you have done it; or let the assistant suggest papers you have not touched |
| Assistant | An examiner read of a stretch of your work, compared against your own history |
| Insights | Why you lose marks, where you practise, which section bleeds marks, and whether rushing is costing you band points |
| Log a test | The prompt you paste into a chat assistant to turn a result into one database line |

Click a point on any chart, a cell on the calendar, or a slice of any donut and you land
on the attempt behind it.

---

## The data file

One test per line. Order does not matter — append at the bottom and forget about it.

Only `date` and `skill` are required. Everything else is optional and simply shows as
blank. If you leave out `band` it is worked out from your raw score using the official
conversion tables.

You do not have to write any of this by hand. The **Log a test** page gives you a prompt
to paste into any chat assistant; send it your test link and your result and it hands
back the finished line.

### Text file (recommended)

Save as `ielts-data.txt`. One line of JSON per test.

```json
{"date":"2026-09-02","skill":"reading","source":"engnovate.com","test":"Cambridge IELTS 14 Academic Reading Test 3","url":"https://engnovate.com/ielts-reading-tests/cambridge-ielts-14-academic-reading-test-3/","correct":13,"total":40,"band":4.5,"duration":"41:20","answers":[{"n":1,"you":"TRUE","ans":"FALSE"},{"n":14,"you":"","ans":"G"}],"notes":"Lost passage 3 to the clock"}
```

| Field | Meaning |
| --- | --- |
| `date` | `YYYY-MM-DD`. Required. |
| `skill` | `listening`, `reading`, `writing` or `speaking`. Required. |
| `source` | Site or place, e.g. `engnovate.com`. Filled in from the URL if missing. |
| `test` | Human name. Guessed from the URL slug if missing. |
| `url` | Full link. This is what lets the test finder match repeats. |
| `correct` / `total` | Raw score, reading and listening. |
| `band` | 0–9 in 0.5 steps. Worked out from the raw score if absent. |
| `duration` | `mm:ss` or `hh:mm:ss`. Plain numbers are read as minutes. |
| `answers` | `[{"n":1,"you":"TRUE","ans":"FALSE"}]`. Use `""` for a question left blank. |
| `tasks` | Writing. See below. |
| `parts` | Speaking. See below. |
| `criteria` | `{"Fluency & Coherence":7, …}` |
| `notes` | One short sentence. |

**Writing**

```json
"tasks":[{"task":1,"band":6.5,"words":178,"prompt":"…","essay":"…",
  "criteria":{"Task Achievement":7,"Coherence & Cohesion":7,"Lexical Resource":6,"Grammatical Range & Accuracy":6},
  "detail":[{"sub":"Overview","score":7,"comment":"…"}]}]
```

**Speaking**

```json
"parts":[{"part":1,"band":7,"topic":"…","transcript":"…","feedback":"…"}]
```

Escape newlines inside `essay`, `transcript`, `comment` and `feedback` as `\n` so each
record stays on one line.

### Spreadsheet

Twelve columns, in this order:

```
date | time | skill | source | test | url | correct | total | band | duration | detail | notes
```

`detail` holds one JSON object with whichever of `answers`, `tasks`, `parts` and
`criteria` apply. Export as CSV, or upload the `.xlsx` directly.

`sample-data.txt` in this folder is a working example you can open and copy.

---

## How marks are read

**Band conversion** uses the standard 40-question tables — Academic Reading and
Listening have different cut-offs, and both are applied per skill. An explicit `band` in
your file always wins over the calculated one.

**Writing overall** is `(Task 1 + 2 × Task 2) / 3`, rounded to the nearest 0.5, when both
tasks are present.

**Overall band** is the mean of the four skills, rounded the way IELTS rounds: `.25` goes
up to `.5`, `.75` goes up to the next whole number.

**Error causes** come from comparing your answer with the key. A near-miss on a long word
is spelling; an `s` on the end is word form; a TRUE/NOT GIVEN swap is judgement; a blank
is unanswered. Case, punctuation, leading articles and `a/b` alternatives in the key are
all forgiven before anything is marked wrong.

**Recency colour** — green within two days, amber three to four, red five or more.

---

## The assistant

Optional. Charts, tables, answer review, the calendar and the test finder all work
without it. A key only unlocks essay marking, error diagnosis, cross-attempt comparison
and test suggestions.

Free keys: [Groq](https://console.groq.com/keys) or
[Google AI Studio](https://aistudio.google.com/app/apikey).
OpenAI and OpenRouter also work.

The key is stored in your browser and nowhere else. Requests go straight from your device
to the provider — this page has no server to send them through, so nobody, including
whoever deployed it, can see your key or your work.

---

## Files

```
index.html          shell, onboarding, app chrome
assets/styles.css   design tokens and every component
assets/core.js      parsing, band maths, error classification, state
assets/ui.js        icons, modal, toast, the date range picker
assets/charts.js    hand-built SVG: gauges, lines, bars, donuts, calendar
assets/ai.js        provider calls, the logging prompt, coaching prompts
assets/views.js     one function per page
assets/app.js       routing and boot
sample-data.txt     a working example file
```

Browser support: anything current. Excel upload needs a network connection for the
SheetJS CDN; CSV and text work offline.

---

## Contact

Email **rufatjabra@gmail.com** · GitHub **[@rufatj](https://github.com/rufatj)** ·
X **[@rufatjab](https://x.com/rufatjab)** ·
[Rufat's open source community on Discord](https://discord.gg/QQYFBHttFV)
