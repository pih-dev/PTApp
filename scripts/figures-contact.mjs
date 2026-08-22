// A contact sheet of all 42 patterns — the fast judging surface while the
// archetypes are being authored. Correct beside fault, one ground, no prose.
//
//   node scripts/figures-contact.mjs [tmp/contact.html]

import fs from 'node:fs';
import { PATTERN_SAMPLES } from '../src/figures/poses.js';
import { figureSvg } from '../src/figures/svg.js';
import { archetypeFor } from '../src/figures/classify.js';

const out = process.argv[2] || 'tmp/contact.html';
const S = PATTERN_SAMPLES();

const vars = '--ground:#0A1524;--ground-lit:#0F2A52;--chalk:#E9EEF3;--chalk-dim:#9DAABB;'
  + '--bar:#5A78A8;--anatomy:#F2622C;--accent:#35B7E8;--warn:#E0A32B;--muscle:#D8436A;--muscle-2:#9A7BC8';

const cell = (name, p) => `<div class="c">
  <div class="t">${archetypeFor(name)} <span>${name}</span></div>
  <div class="p">
    <div>${figureSvg(p.correct)}</div>
    <div>${figureSvg(p.fault)}</div>
    ${p.extra ? `<div>${figureSvg(p.extra.pose)}</div>` : ''}
  </div>
</div>`;

fs.mkdirSync('tmp', { recursive: true });
fs.writeFileSync(out, `<meta charset="utf-8"><title>42 patterns</title>
<style>
  body{margin:0;background:#0A1524;font:12px/1.3 system-ui,sans-serif;${vars}}
  .g{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
  .c{background:linear-gradient(180deg,var(--ground-lit),var(--ground));padding:6px;color:var(--chalk)}
  .t{font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--chalk-dim);margin-bottom:2px}
  .t span{opacity:.6;text-transform:none;letter-spacing:0}
  .p{display:flex;gap:2px}
  .p>div{flex:1;min-width:0}
  svg{width:100%;height:auto;display:block}
</style>
<div class="g">${Object.entries(S).map(([n, p]) => cell(n, p)).join('')}</div>`, 'utf8');
console.log(out, Object.keys(S).length + ' patterns');
