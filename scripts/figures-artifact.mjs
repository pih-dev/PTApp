// Build the judging sheet Pierre reads on his phone.
//
// Same serialiser as the app (src/figures/svg.js), so what he judges is what
// ships. Writes a self-contained HTML page for publishing as an Artifact.
//
//   node scripts/figures-artifact.mjs <out.html>
//
// 🔴 RESTRUCTURED 2026-08-22 after a fresh-eyes design pass (Fable 5, max
//    effort, handed the structure and copy with ALL formatting stripped so it
//    could not be anchored by the treatment already chosen). Its central finding
//    was right and structural: the page's one job is a SAME-OR-DIFFERENT
//    judgement, and the first version served that job as a serial scroll —
//    figure four compared against a memory of figure one, three screens back.
//    Family resemblance is judged side by side. So the contact sheet leads, the
//    app context is mocked rather than described, the verdict gets somewhere to
//    land, and every paragraph that argued FOR the figures to the person who is
//    supposed to rule on them was cut.

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PATTERN_SAMPLES } from '../src/figures/poses.js';
const FIGURES = PATTERN_SAMPLES();
import { figureSvg } from '../src/figures/svg.js';
import { archetypeFor } from '../src/figures/classify.js';
import { figureText } from '../src/figureText.js';
import { exNameAr } from '../src/exerciseNamesAr.js';

const out = process.argv[2] || 'figures-review.html';

// The two shipped skins, as VALUES — exactly how styles.css carries them.
const SKINS = {
  midnight: {
    ground: '#0A1524', lit: '#0F2A52', chalk: '#E9EEF3', dim: '#9DAABB', bar: '#5A78A8',
    accent: '#35B7E8', warn: '#E0A32B', muscle: '#D8436A', muscle2: '#9A7BC8',
  },
  steel: {
    ground: '#A9BAD2', lit: '#D3DEEC', chalk: '#141C33', dim: '#3A4767', bar: '#4A5D80',
    accent: '#06465F', warn: '#8A5A00', muscle: '#A81F45', muscle2: '#5A4C9E',
  },
};
const ANATOMY = '#F2622C';

const skinVars = (id) => {
  const s = SKINS[id];
  return `--ground:${s.ground};--ground-lit:${s.lit};--chalk:${s.chalk};--chalk-dim:${s.dim};`
    + `--bar:${s.bar};--anatomy:${ANATOMY};--accent:${s.accent};--warn:${s.warn};`
    + `--muscle:${s.muscle};--muscle-2:${s.muscle2}`;
};

// 🔴 ONE WORD PER CONCEPT. The first version called the same thing "the posture
//    line, lost", "this is the injury" and "The fault" on one screen. It is THE
//    FAULT everywhere — and the caption names the SPECIFIC fault rather than the
//    category, so a pair can be judged without reading on.
const FAULT = {
  'Back Squat': 'knees caving in',
  'Deadlift': 'back rounding',
  'Chest Press Machine': 'elbow above the shoulder',
  'Flat Barbell Press': 'hips off the bench',
  'Pull-Up': 'swung, elbows wide',
  'Barbell Curl': 'heaved with the back',
  'Leg Press': 'snapped into lockout',
};

const NAMES = Object.keys(FIGURES);

// ── the geometry gate, joined onto the figures ───────────────────────────────
// Pierre, 2026-08-24: "they usually show to spot anomalies also, it's useful
// for me." The sanity gate already finds the anomalies and prints them by
// pattern id; the sheet already shows the figures. They were just never joined,
// so reading one meant scrolling the other looking for the right drawing.
//
// This RUNS the gate rather than duplicating its rules — the gate stays the
// single source of what counts as wrong, and this page can never disagree with
// the build about it.
function readFlags() {
  // 🔴 BOTH STREAMS. The gate prints its warnings to stderr and only its PASS
  // line to stdout, so capturing stdout alone returned an empty flag list and
  // the panel rendered "0 worth your eye" over a sheet with six real flags on
  // it — a confident, wrong all-clear, which is worse than no panel at all.
  const run = spawnSync(process.execPath, ['scripts/sanity/sanity-figures.mjs'],
    { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 16 << 20 });
  const out = String(run.stdout || '') + String(run.stderr || '');
  const byPattern = {};
  for (const line of out.split(String.fromCharCode(10))) {
    const m = /^([A-Z]+): "([^"]+)" (.*)$/.exec(line.trim());
    if (!m) continue;
    const [, kind, pattern, detail] = m;
    (byPattern[pattern] ||= []).push({ kind, detail });
  }
  return byPattern;
}

// 🔴 NOT EVERY WARNING IS A DEFECT, and printing 26 of them as if they were
//    wastes the one thing this page is for — Pierre's eye. A plank's arms
//    SHOULD measure -90°: that is a straight arm holding bodyweight, and the
//    ROM gate is measuring a quantity that does not apply to a support pose.
//    So the flags are split, and the reason each is expected is stated. The
//    ones left in the first group are the ones actually worth looking at.
const EXPECTED = {
  'plank': 'a straight support arm reads −90° by definition',
  'reverse-plank': 'a straight support arm reads −90° by definition',
  'push-up': 'the arm is loaded and straight at the top — that is the position',
  'knee-flexion': 'a leg curl is a deep knee bend; 126–145° is the movement',
  'triceps-overhead': 'the elbow is fully overhead — the range is the exercise',
};

const FLAGS = readFlags();
// pattern id → the sample name drawn on this sheet, so a flag can point at a figure
const NAME_OF = {};
for (const n of NAMES) NAME_OF[archetypeFor(n)] = n;
const FLAGGED = Object.keys(FLAGS).filter((p) => !EXPECTED[p]);
const flaggedNames = new Set(FLAGGED.map((p) => NAME_OF[p]).filter(Boolean));

const flagPanel = () => {
  const row = (pat) => {
    const nm = NAME_OF[pat];
    const fig = nm ? `<span class="fmk">${figureSvg(FIGURES[nm].correct, { detail: 'mark' })}</span>` : '';
    return `<li>${fig}<b>${pat}</b>${nm ? ` <span class="fnm">${nm}</span>` : ''}
      <ul>${FLAGS[pat].map((f) => `<li><span class="kind">${f.kind}</span> ${f.detail}</li>`).join('')}</ul></li>`;
  };
  const expected = Object.keys(FLAGS).filter((p) => EXPECTED[p]);
  return `<div class="flags">
    <h3>Geometry flags &mdash; ${FLAGGED.length} worth your eye</h3>
    <p class="sub">Straight from the build gate, joined to the drawings. Nothing here fails the
      build; these are the places the geometry is doing something a human should rule on.</p>
    <ul class="flist" style="${skinVars('midnight')}">${FLAGGED.map(row).join('')}</ul>
    ${expected.length ? `<h3 class="quiet">And ${expected.length} the gate reports that are correct</h3>
    <p class="sub">Listed so nobody re-investigates them. In each case the gate is measuring a
      quantity that does not apply to the pose.</p>
    <ul class="fexp">${expected.map((p) => `<li><b>${p}</b> &mdash; ${EXPECTED[p]}</li>`).join('')}</ul>` : ''}
  </div>`;
};

// ── screen one: the contact sheet ────────────────────────────────────────────
const contact = (skinId) => `
  <div class="sheet" style="${skinVars(skinId)}">
    <div class="sheet-tag">${skinId}</div>
    <div class="grid">
      ${NAMES.map(n => `<figure${flaggedNames.has(n) ? ' class="flagged"' : ''}>
        <div class="art">${figureSvg(FIGURES[n].correct)}</div>
        <figcaption>${n}</figcaption></figure>`).join('')}
    </div>
  </div>`;

// ── screen one, part two: the app context, mocked rather than described ──────
const listMock = (skinId) => `
  <div class="mock" style="${skinVars(skinId)}">
    <div class="sheet-tag">movement library &middot; ${skinId} &middot; true size</div>
    ${NAMES.map(n => `<div class="row">
      <span class="mk">${figureSvg(FIGURES[n].correct, { detail: 'mark' })}</span>
      <span class="nm">${n}</span>
      <span class="ar" dir="rtl">${exNameAr(n) || ''}</span>
    </div>`).join('')}
  </div>`;

// ── the appendix: one movement in full ───────────────────────────────────────
const pairBlock = (name, skinId) => {
  const p = FIGURES[name];
  return `<div class="skin" style="${skinVars(skinId)}">
    <div class="sheet-tag">${skinId}</div>
    <div class="pair">
      <figure><div class="art">${figureSvg(p.correct)}</div><figcaption>correct</figcaption></figure>
      <figure><div class="art">${figureSvg(p.fault)}</div><figcaption class="bad">${FAULT[name] || 'the fault'}</figcaption></figure>
    </div>
    ${p.extra ? `<figure class="wide"><div class="art">${figureSvg(p.extra.pose)}</div>
      <figcaption class="bad">from above &mdash; elbows square to the body</figcaption></figure>` : ''}
  </div>`;
};

const markRow = (name) => {
  const p = FIGURES[name];
  const one = (pose, px) => `<span class="mk" style="width:${px}px;height:${px}px">${figureSvg(pose, { detail: 'mark' })}</span>`;
  return `<div class="marks" style="${skinVars('midnight')}">
    <span class="mk-row"><b>correct</b>${[16, 24, 32, 48].map(px => one(p.correct, px)).join('')}</span>
    <span class="mk-row"><b>fault</b>${[16, 24, 32, 48].map(px => one(p.fault, px)).join('')}</span>
  </div>`;
};

const movement = (name) => {
  const t = figureText(name, 'en', FIGURES[name].archetype);
  const ar = figureText(name, 'ar', FIGURES[name].archetype);
  return `<section class="mv">
    <header><h2>${name}</h2></header>
    ${pairBlock(name, 'midnight')}
    ${markRow(name)}
    <div class="txt">
      <p><b>The fault</b> ${t.flaw}</p>
      <p><b>What it does</b> ${t.injury}</p>
      <p class="cue"><b>The cue</b> ${t.cue}</p>
      ${t.extra ? `<p><b>From above</b> ${t.extra}</p>` : ''}
      <p class="arline" dir="rtl" lang="ar">${ar.cue}</p>
    </div>
  </section>`;
};

const KEY = [
  ['accent', 'the posture line, held'],
  ['warn', 'the posture line, at fault'],
  ['muscle', 'prime movers'],
  ['muscle-2', 'supporting muscles'],
  ['anatomy', 'the joint that takes the stress'],
];

// 🔴 CHARSET FIRST. The Arabic in this page is real UTF-8, and a server that
//    does not send a charset header (a plain local static server, for instance)
//    makes a browser guess — and it guesses latin-1, turning every Arabic cue
//    into mojibake. One tag, and the page is correct wherever it is opened.
const html = `<meta charset="utf-8">
<title>One Library Or 340 Drawings</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700&family=Saira:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* The page is deliberately quiet: the CONTENT is two coloured grounds being
     compared, and a page with its own opinions would corrupt the comparison.
     Type is the app's own pairing — Saira Condensed over Saira — because the
     question here is whether the figures belong to that app. */
  :root {
    --page: #F3F4F6; --panel: #FFFFFF; --ink: #14181F; --ink-dim: #5C6472;
    --hair: #DCE0E6; --flag: #C24312;
    --display: 'Saira Condensed', 'Arial Narrow', system-ui, sans-serif;
    --body: 'Saira', system-ui, -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --page: #0C0E12; --panel: #14171D; --ink: #E7EAEF; --ink-dim: #949CAA;
      --hair: #262B33; --flag: #F2622C;
    }
  }
  :root[data-theme="dark"] {
    --page: #0C0E12; --panel: #14171D; --ink: #E7EAEF; --ink-dim: #949CAA;
    --hair: #262B33; --flag: #F2622C;
  }

  body { background: var(--page); color: var(--ink); font-family: var(--body);
         margin: 0; padding: 24px 16px 72px; line-height: 1.55; }
  .wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; }

  h1 { font-family: var(--display); font-size: clamp(30px, 8vw, 50px); font-weight: 700;
       letter-spacing: 0.01em; margin: 0 0 8px; text-wrap: balance; }
  .sub { margin: 0 0 4px; max-width: 62ch; color: var(--ink-dim); }

  /* Each skin panel paints its own ground from the app's real token values —
     that is the comparison, so it must not inherit anything from this page. */
  .sheet, .mock, .skin, .marks, .key { background: var(--ground); border-radius: 10px;
                                       padding: 12px; color: var(--chalk); }
  .sheet { background: linear-gradient(180deg, var(--ground-lit), var(--ground)); }
  .sheet-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
               text-transform: uppercase; color: var(--chalk-dim); margin-bottom: 6px; }

  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  @media (max-width: 520px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  .grid figure { margin: 0; min-width: 0; }
  .art svg { width: 100%; max-width: 100%; height: auto; display: block; }
  .grid figcaption { font-family: var(--mono); font-size: 9px; text-align: center;
                     color: var(--chalk-dim); overflow-wrap: anywhere; }

  .row { display: flex; align-items: center; gap: 10px; padding: 10px 2px;
         border-bottom: 2px solid var(--bar); }
  .row:last-child { border-bottom: none; }
  .mk { display: inline-block; width: 22px; height: 22px; flex: none; }
  .mk svg { width: 100%; height: 100%; display: block; }
  .nm { font-weight: 600; font-size: 15px; }
  .ar { color: var(--chalk-dim); font-size: 13px; margin-inline-start: auto; }

  .check { border: 2px solid var(--hair); border-radius: 10px; padding: 14px 16px; }
  .check h3 { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.1em;
              font-size: 14px; margin: 0 0 10px; }
  .check ol { margin: 0; padding-inline-start: 20px; }
  .check li { margin-bottom: 7px; color: var(--ink-dim); }
  .check li b { color: var(--ink); }
  .verdict { margin: 12px 0 0; font-weight: 600; color: var(--ink); }

  .key { display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .k { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--chalk-dim); }
  .k i { width: 10px; height: 10px; border-radius: 2px; display: block; }

  .rule { border: 0; border-top: 2px solid var(--hair); margin: 0; }
  .apx { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em;
         text-transform: uppercase; color: var(--ink-dim); margin: -18px 0 0; }

  .mv { display: flex; flex-direction: column; gap: 8px; }
  .mv header { border-bottom: 2px solid var(--ink); padding-bottom: 4px; }
  .mv h2 { font-family: var(--display); font-size: 22px; font-weight: 600; margin: 0;
           text-transform: uppercase; letter-spacing: 0.05em; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pair figure, .wide { margin: 0; min-width: 0; }
  .wide { margin-top: 8px; }
  .pair figcaption, .wide figcaption { font-family: var(--display); font-size: 10px;
      letter-spacing: 0.14em; text-transform: uppercase; text-align: center; color: var(--chalk-dim); }
  .bad { color: var(--anatomy); }
  .marks { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: flex-end; }
  .mk-row { display: flex; align-items: flex-end; gap: 10px; }
  .mk-row b { font-family: var(--mono); font-size: 10px; text-transform: uppercase;
              color: var(--chalk-dim); font-weight: 400; align-self: center; }
  .mk-row .mk { width: auto; height: auto; }

  .txt p { margin: 0 0 6px; max-width: 64ch; color: var(--ink-dim); }
  .txt b { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.08em;
           font-size: 12px; color: var(--ink); margin-inline-end: 6px; }
  .txt .cue { color: var(--ink); }
  .txt .arline { font-size: 15px; color: var(--ink); }

  /* the geometry flags — a working surface, so it is denser and plainer than
     the judging screens above it and deliberately does not compete with them */
  .flags { border: 2px solid var(--flag); border-radius: 10px; padding: 14px 16px; }
  .flags h3 { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.1em;
    font-size: 13px; margin: 0 0 6px; color: var(--flag); }
  .flags h3.quiet { color: var(--ink-dim); margin-top: 18px; }
  .flist { list-style: none; margin: 12px 0 0; padding: 12px 14px; border-radius: 8px;
    background: var(--ground); }
  .flist > li { margin-bottom: 12px; color: var(--chalk); font-size: 14px; }
  .flist > li:last-child { margin-bottom: 0; }
  .flist b { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.06em;
    font-size: 13px; }
  .flist ul { margin: 4px 0 0; padding-inline-start: 18px; }
  .flist ul li { color: var(--chalk-dim); font-size: 12.5px; line-height: 1.5;
    font-family: var(--mono, 'IBM Plex Mono', monospace); }
  .flist .kind { color: var(--anatomy); font-weight: 500; }
  .fmk { display: inline-block; width: 26px; height: 26px; vertical-align: -8px;
    margin-inline-end: 8px; }
  .fnm { color: var(--chalk-dim); font-size: 12.5px; }
  .fexp { margin: 8px 0 0; padding-inline-start: 20px; }
  .fexp li { color: var(--ink-dim); font-size: 13.5px; margin-bottom: 4px; }
  .fexp b { color: var(--ink); font-family: var(--display); text-transform: uppercase;
    letter-spacing: 0.05em; font-size: 12.5px; }
  /* a flagged figure on the contact sheet: found by eye, not by reading a list */
  .grid figure.flagged { outline: 2px solid var(--anatomy); outline-offset: 3px;
    border-radius: 4px; }
  .grid figure.flagged figcaption::after { content: ' ▲'; color: var(--anatomy); }
  .open { border-top: 2px solid var(--hair); padding-top: 14px; }
  .open h3 { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.08em;
             font-size: 14px; margin: 0 0 8px; }
  .open p { margin: 0 0 8px; max-width: 64ch; color: var(--ink-dim); }
  .open b { color: var(--ink); }
  .flag { color: var(--flag); font-weight: 600; }
</style>
<div class="wrap">
  <div>
    <h1>One library, or 340 drawings?</h1>
    <p class="sub">All 340 movements are drawn now, from 44 patterns. Here is one figure per pattern on
      one ground — if any of them does not look like it was drawn by the same hand as the rest,
      that is the finding.</p>
  </div>

  ${contact('midnight')}
  ${contact('steel')}

  ${flagPanel()}

  <p class="sub">And the second half of the question &mdash; do they belong to <em>this</em> app?
    These are real Movement-library rows at the size the mark will actually appear.</p>

  ${listMock('midnight')}
  ${listMock('steel')}

  <div class="check">
    <h3>What to check, and what to reply</h3>
    <ol>
      <li><b>One hand.</b> Same proportions, same weight of line, same amount of equipment across all 44?</li>
      <li><b>The 22px mark.</b> In the rows above &mdash; can you tell the movements apart, or are they grey smudges?</li>
      <li><b>Both skins.</b> Does anything that reads on midnight stop reading on steel?</li>
      <li><b>The pair.</b> In the appendix, is the fault obvious <em>without</em> reading the sentence under it?</li>
    </ol>
    <p class="verdict">Reply with the pattern that breaks it. The weakest three are already named below.</p>
  </div>

  <div class="key" style="${skinVars('midnight')}">
    ${KEY.map(([tok, label]) => `<span class="k"><i style="background:var(--${tok})"></i>${label}</span>`).join('')}
  </div>

  <div class="open">
    <h3>What is still open</h3>
    <p><b>The anatomy pass landed (v2.44).</b> A knee that bent backwards and a pelvis wider than
      the ribcage were the two structural errors; both are fixed, and the end caps now sweep outward
      so the dark discs at the hips are gone. The gate passes: 340 movements over 44 patterns,
      44 text entries, canon intact.</p>
    <p><b>Bird-dog is the one known break.</b> Its support arm passes through the floor, and the
      cause is structural rather than a typo &mdash; the arm is longer than the thigh, so a level
      trunk cannot put both a hand and a knee on the ground. It needs a re-authored trunk slope.
      The flags panel above shows it, along with the other five poses with a joint under the
      baseline.</p>
    <p><b>The Leg Press fault may be the wrong one.</b> It currently draws the knee snapped into
      lockout &mdash; which the gate also flags as past straight. A biomechanics review argues the
      more common and more serious error is going too deep: the pelvis peeling off the seat pad and
      the lower back rounding under the sled. Changing it is one pose; your call, and Elie's.</p>
    <p><b>The coaching text is not reviewed.</b> Every entry ships flagged
      <span class="flag">not yet reviewed by Elie</span>, and the app says so on screen. An
      adversarial review already forced a rewrite: the first version named a diagnosis per movement
      and one of them was factually backwards. Injury text now says what the position <em>does</em>,
      never what it <em>causes</em>, and the build fails on any entry that slips back.</p>
  </div>

  <hr class="rule">
  <p class="apx">Appendix &mdash; every movement in full</p>

  ${NAMES.map(movement).join('')}
</div>`;

fs.writeFileSync(out, html, 'utf8');
console.log(out, fs.statSync(out).size + ' bytes');
