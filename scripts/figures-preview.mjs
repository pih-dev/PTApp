// Build a judging sheet for the exercise figures.
//
// WHY THIS EXISTS. The handoff's acceptance test is visual and it is specific:
// every pair, on BOTH skins, at full size and again at 16px. That cannot be
// checked by reading pose numbers, and it must be checked against the SAME
// serialiser the app uses — so this file imports src/figures/svg.js rather than
// drawing anything itself.
//
//   node scripts/figures-preview.mjs   →  tmp/figures-preview.html
//
// tmp/ on purpose: this is a working file, not a deliverable (the _archive rule).

import fs from 'node:fs';
import path from 'node:path';
import { FIGURES } from '../src/figures/poses.js';
import { figureSvg } from '../src/figures/svg.js';

const skins = [
  { id: 'midnight', ground: '#0A1524', groundLit: '#0F2A52', chalk: '#E9EEF3', dim: '#9DAABB', bar: '#5A78A8',
    accent: '#35B7E8', warn: '#E0A32B', anatomy: '#F2622C', muscle: '#D8436A', muscle2: '#9A7BC8' },
  { id: 'steel', ground: '#A9BAD2', groundLit: '#D3DEEC', chalk: '#141C33', dim: '#3A4767', bar: '#4A5D80',
    accent: '#06465F', warn: '#8A5A00', anatomy: '#F2622C', muscle: '#A81F45', muscle2: '#5A4C9E' },
];

const cell = (name, kind, pose) => `
  <div class="cell">
    <div class="cap">${name} · ${kind}</div>
    <div class="big">${figureSvg(pose, { title: `${name} ${kind}` })}</div>
    <div class="marks">
      <span class="m16">${figureSvg(pose, { detail: 'mark' })}</span>
      <span class="m24">${figureSvg(pose, { detail: 'mark' })}</span>
      <span class="m48">${figureSvg(pose, { detail: 'mark' })}</span>
    </div>
  </div>`;

const board = (s) => `
<section class="skin" style="--ground:${s.ground};--ground-lit:${s.groundLit};--chalk:${s.chalk};--chalk-dim:${s.dim};--bar:${s.bar};--accent:${s.accent};--warn:${s.warn};--anatomy:${s.anatomy};--muscle:${s.muscle};--muscle-2:${s.muscle2}">
  <h2>${s.id}</h2>
  ${Object.entries(FIGURES).map(([name, pair]) => `
    <div class="pair">
      ${cell(name, 'correct', pair.correct)}
      ${cell(name, 'fault', pair.fault)}
      ${pair.extra ? cell(name, 'from above', pair.extra.pose) : ''}
    </div>`).join('')}
</section>`;

const html = `<!doctype html><meta charset="utf-8"><title>SpotSet figures — pilot six</title>
<style>
  body { margin:0; font:13px/1.4 system-ui, sans-serif; background:#111; }
  .skin { background:linear-gradient(180deg,var(--ground-lit),var(--ground)); color:var(--chalk); padding:16px 12px 28px; }
  h2 { font:600 12px/1 system-ui; letter-spacing:.16em; text-transform:uppercase; color:var(--chalk-dim); margin:0 0 12px; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;
          border-bottom:2px solid var(--bar); padding-bottom:10px; }
  .cap { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--chalk-dim); margin-bottom:2px; }
  .big svg { width:100%; height:auto; display:block; }
  .marks { display:flex; align-items:flex-end; gap:10px; margin-top:4px; }
  .m16 svg { width:16px; height:16px; } .m24 svg { width:24px; height:24px; } .m48 svg { width:48px; height:48px; }
</style>
${skins.map(board).join('')}`;

const out = path.join(process.cwd(), 'tmp', 'figures-preview.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, 'utf8');
console.log(out);
