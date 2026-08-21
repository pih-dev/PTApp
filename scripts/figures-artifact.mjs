// Build the judging sheet Pierre reads on his phone.
//
// Same serialiser as the app (src/figures/svg.js), so what he judges is what
// ships. Writes a self-contained HTML page for publishing as an Artifact.
//
//   node scripts/figures-artifact.mjs <out.html>

import fs from 'node:fs';
import { FIGURES } from '../src/figures/poses.js';
import { figureSvg } from '../src/figures/svg.js';
import { figureText } from '../src/figureText.js';

const out = process.argv[2] || 'figures-review.html';

// The two shipped skins, as VALUES — exactly how styles.css carries them.
const SKINS = {
  midnight: { ground: '#0A1524', lit: '#0F2A52', chalk: '#E9EEF3', dim: '#9DAABB', bar: '#5A78A8' },
  steel: { ground: '#A9BAD2', lit: '#D3DEEC', chalk: '#141C33', dim: '#3A4767', bar: '#4A5D80' },
};
const ANATOMY = '#F2622C';

const BUCKET = {
  'Back Squat': 'squat · front view · knee',
  'Deadlift': 'hinge · profile · lumbar',
  'Chest Press Machine': 'horizontal press · profile · shoulder',
  'Pull-Up': 'vertical pull · front view · shoulder',
  'Barbell Curl': 'single joint · profile · lumbar',
  'Leg Press': 'machine · profile · knee',
};

const skinVars = (s) =>
  `--ground:${s.ground};--ground-lit:${s.lit};--chalk:${s.chalk};--chalk-dim:${s.dim};--bar:${s.bar};--anatomy:${ANATOMY}`;

const pairBlock = (name, skinId) => {
  const s = SKINS[skinId];
  const p = FIGURES[name];
  return `<div class="skin" style="${skinVars(s)}">
    <div class="skin-tag">${skinId}</div>
    <div class="pair">
      <figure><div class="art">${figureSvg(p.correct)}</div><figcaption>correct</figcaption></figure>
      <figure><div class="art">${figureSvg(p.fault)}</div><figcaption class="bad">this is the injury</figcaption></figure>
    </div>
  </div>`;
};

const markRow = (name) => {
  const p = FIGURES[name];
  const s = SKINS.midnight;
  const one = (pose, px) => `<span class="mk" style="width:${px}px;height:${px}px">${figureSvg(pose, { detail: 'mark' })}</span>`;
  return `<div class="marks" style="${skinVars(s)}">
    <span class="mk-label">the mark, drawn from the same pose</span>
    <span class="mk-row">${[16, 24, 32, 48].map(px => one(p.correct, px)).join('')}</span>
    <span class="mk-row">${[16, 24, 32, 48].map(px => one(p.fault, px)).join('')}</span>
  </div>`;
};

const movement = (name) => {
  const t = figureText(name, 'en');
  const ar = figureText(name, 'ar');
  return `<section class="mv">
    <header>
      <h2>${name}</h2>
      <p class="bucket">${BUCKET[name] || ''}</p>
    </header>
    ${pairBlock(name, 'midnight')}
    ${pairBlock(name, 'steel')}
    ${markRow(name)}
    <div class="txt">
      <p><b>The fault</b> ${t.flaw}</p>
      <p><b>The risk</b> ${t.injury}</p>
      <p class="cue"><b>The cue</b> ${t.cue}</p>
      <p class="ar" dir="rtl" lang="ar">${ar.cue}</p>
    </div>
  </section>`;
};

const html = `<title>The Pilot Six</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700&family=Saira:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* The page is deliberately quiet: the CONTENT is two coloured grounds being
     compared, and a page with its own opinions would corrupt that comparison.
     Type is the app's own pairing — Saira Condensed over Saira — because the
     question on this page is whether the figures belong to that app. */
  :root {
    --page: #F3F4F6;
    --panel: #FFFFFF;
    --ink: #14181F;
    --ink-dim: #5C6472;
    --hair: #DCE0E6;
    --anatomy: #C24312;
    --display: 'Saira Condensed', 'Arial Narrow', system-ui, sans-serif;
    --body: 'Saira', system-ui, -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --page: #0C0E12; --panel: #14171D; --ink: #E7EAEF; --ink-dim: #949CAA;
      --hair: #262B33; --anatomy: #F2622C;
    }
  }
  :root[data-theme="dark"] {
    --page: #0C0E12; --panel: #14171D; --ink: #E7EAEF; --ink-dim: #949CAA;
    --hair: #262B33; --anatomy: #F2622C;
  }

  body { background: var(--page); color: var(--ink); font-family: var(--body);
         margin: 0; padding: 28px 16px 72px; line-height: 1.55; }
  .wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; }

  .lede h1 { font-family: var(--display); font-size: clamp(30px, 7vw, 46px); font-weight: 700;
             letter-spacing: 0.01em; margin: 0 0 6px; text-wrap: balance; }
  .lede p { margin: 0 0 10px; max-width: 62ch; color: var(--ink-dim); }
  .lede .ask { color: var(--ink); font-weight: 500; }
  .meta { font-family: var(--mono); font-size: 12px; color: var(--ink-dim);
          border-top: 1px solid var(--hair); padding-top: 10px; margin-top: 14px; }

  .mv { display: flex; flex-direction: column; gap: 10px; }
  .mv header { border-bottom: 2px solid var(--ink); padding-bottom: 4px; }
  .mv h2 { font-family: var(--display); font-size: 24px; font-weight: 600; margin: 0;
           text-transform: uppercase; letter-spacing: 0.05em; }
  .bucket { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); margin: 2px 0 0; }

  /* Each skin panel paints its own ground from the app's real token values —
     that is the comparison, so it must not inherit anything from this page. */
  .skin { background: linear-gradient(180deg, var(--ground-lit), var(--ground));
          color: var(--chalk); border-radius: 10px; padding: 12px 12px 8px; position: relative; }
  .skin-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
              text-transform: uppercase; color: var(--chalk-dim); margin-bottom: 4px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pair figure { margin: 0; }
  .art svg { width: 100%; height: auto; display: block; }
  .pair figcaption { font-family: var(--display); font-size: 10px; letter-spacing: 0.14em;
                     text-transform: uppercase; text-align: center; color: var(--chalk-dim); }
  .pair .bad { color: var(--anatomy); }

  .marks { background: var(--ground); border-radius: 10px; padding: 10px 12px;
           color: var(--chalk); display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 18px; }
  .mk-label { font-family: var(--mono); font-size: 10px; color: var(--chalk-dim);
              flex: 1 1 100%; letter-spacing: 0.1em; text-transform: uppercase; }
  .mk-row { display: flex; align-items: flex-end; gap: 10px; }
  .mk { display: inline-block; }
  .mk svg { width: 100%; height: 100%; display: block; }

  .txt p { margin: 0 0 6px; max-width: 64ch; color: var(--ink-dim); }
  .txt b { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.08em;
           font-size: 12px; color: var(--ink); margin-inline-end: 6px; }
  .txt .cue { color: var(--ink); }
  .txt .ar { font-size: 15px; color: var(--ink); }

  .close { border-top: 1px solid var(--hair); padding-top: 16px; }
  .close h3 { font-family: var(--display); text-transform: uppercase; letter-spacing: 0.08em;
              font-size: 15px; margin: 0 0 8px; }
  .close p { margin: 0 0 8px; max-width: 64ch; color: var(--ink-dim); }
  .close b { color: var(--ink); }
</style>
<div class="wrap">
  <div class="lede">
    <h1>Six movements, and one question</h1>
    <p class="ask">Do these look like they belong to one library, and to SpotSet? That is the whole
      test. If the answer is no, nothing scales — the route changes instead.</p>
    <p>Each movement below is shown twice — once on <b>midnight</b>, once on <b>steel</b> — because a
      figure that only works on one skin is not finished. Under each pair is the same pose reduced to
      a list-row mark at 16, 24, 32 and 48px, which is the second half of the acceptance test:
      legibility at the size it will actually be used, and again at half that.</p>
    <p>Nothing here is an image file. A figure is a list of joint angles against one shared skeleton,
      so every movement in the eventual 340 will carry the same proportions and the same weight of
      line whether anyone is watching or not.</p>
    <div class="meta">SpotSet v2.22.0 · live on gh-pages · General → Movement library</div>
  </div>

  ${Object.keys(FIGURES).map(movement).join('')}

  <div class="close">
    <h3>The one thing that is missing, and why</h3>
    <p>The flat barbell bench press is <b>not here on purpose</b>. Its defining fault is the elbows
      flaring, and flare happens in the plane a side-on camera is looking down — drawn in profile,
      good form and bad form come out as nearly the same picture. Drawn from above they are
      unmistakable, but the legs run away from the camera and the figure stops belonging to this set.
      Both were built and both were thrown away.</p>
    <p>The honest fix is to let a pose foreshorten a bone that points at the camera — which would
      mean the two halves of one pair no longer share drawn bone lengths, and that is the rule that
      makes the pair mean anything in the first place. <b>That is a decision, not a task.</b> Three
      ways out are written up in <span style="font-family:var(--mono);font-size:12px">HANDOFF-figures.md §11</span>.
      Meanwhile the machine chest press carries the horizontal-press slot, and everything else can be
      drawn today.</p>
  </div>
</div>`;

fs.writeFileSync(out, html, 'utf8');
console.log(out, fs.statSync(out).size + ' bytes');
