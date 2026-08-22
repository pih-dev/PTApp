// ─── B3: logo candidates, drawn FROM the figure library ──────────────────────
//
// Pierre's brief (2026-08-22): the name SpotSet stays; the MARK is open, and
// his idea is that it comes from the figure library — silhouettes carrying the
// correct/fault thesis. This script takes real library poses (figureFor, the
// same call every screen makes) and emits their 'mark' rendering — one solid
// currentColor silhouette — tightly cropped, as logo candidates.
//
// Output: tmp/logo-candidates.html (the judging sheet, both skins, five sizes)
// and per-candidate path data on stdout for pasting into Icons.jsx once chosen.
// The chosen mark is then FROZEN as static markup — a logo must not move when
// a pose is later tuned, so it deliberately does not import the library at
// runtime.
import { writeFileSync, mkdirSync } from 'node:fs';
import { figureFor } from '../src/figures/poses.js';
import { figureSvg } from '../src/figures/svg.js';
import { buildFigure } from '../src/figures/render.js';

const CANDIDATES = [
  { id: 'hinge', movement: 'Deadlift', half: 'correct', note: 'the hinge — the gym\'s defining silhouette, wide, fits a square box' },
  { id: 'squat', movement: 'Back Squat', half: 'correct', note: 'front-on squat — symmetric, icon-friendly' },
  { id: 'press', movement: 'Standing Barbell Shoulder Press', half: 'correct', note: 'overhead press — tall, the "spot" moment' },
  { id: 'row', movement: 'Barbell Row', half: 'correct', note: 'row — a second hinge family read' },
];

// Crude-but-honest tight crop: scan every number pair in the emitted paths.
// Bezier control points pad the box a little; the margin hides it.
function cropSvg(svg, margin = 30) {
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const take = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  // Only scan inside d="..." — scanning the whole markup once swallowed the
  // original viewBox numbers as a coordinate pair and the crop was a no-op.
  for (const dm of svg.matchAll(/ d="([^"]*)"/g)) {
    for (const m of dm[1].matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) take(+m[1], +m[2]);
  }
  for (const m of svg.matchAll(/cx="(-?\d+(?:\.\d+)?)" cy="(-?\d+(?:\.\d+)?)" rx?="(-?\d+(?:\.\d+)?)"/g)) {
    const cx = +m[1], cy = +m[2], r = +m[3];
    take(cx - r, cy - r); take(cx + r, cy + r);
  }
  const x = minX - margin, y = minY - margin, w = maxX - minX + margin * 2, h = maxY - minY + margin * 2;
  return svg.replace(/viewBox="[^"]*"/, `viewBox="${x.toFixed(0)} ${y.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}"`);
}

const marks = {};
for (const c of CANDIDATES) {
  const fig = figureFor(c.movement);
  if (!fig) { console.error(`NO FIGURE for ${c.movement}`); continue; }
  const svg = figureSvg(fig[c.half], { detail: 'mark' });
  marks[c.id] = { ...c, svg: cropSvg(svg) };
}

// ─── Round 2 (Pierre, from his own compile): THE FACING PAIR ─────────────────
// His direction, verbatim where it matters: correct and fault face each other
// so they read like "greater-than and less-than"; accentuate the difference;
// keep it coloured or simplify — and play with left-smaller-lower /
// right-smaller-higher until it "seems right". These studies do exactly that.
const rr = (v) => Math.round(v * 10) / 10;
let pairUid = 0;

function boundsOf(markup, margin = 40) {
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const take = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const dm of markup.matchAll(/ d="([^"]*)"/g))
    for (const m of dm[1].matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) take(+m[1], +m[2]);
  for (const m of markup.matchAll(/cx="(-?\d+(?:\.\d+)?)" cy="(-?\d+(?:\.\d+)?)" rx?="(-?\d+(?:\.\d+)?)"/g)) {
    take(+m[1] - +m[3], +m[2] - +m[3]); take(+m[1] + +m[3], +m[2] + +m[3]);
  }
  for (const m of markup.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    take(+m[1], +m[2]); take(+m[1] + +m[3], +m[2] + +m[4]);
  }
  return { x: minX - margin, y: minY - margin, w: maxX - minX + margin * 2, h: maxY - minY + margin * 2 };
}

// Rebuild svg.js's equipment shapes (it does not export the helper).
const equipShapes = (equip) => equip.map((e) => {
  if (e.k === 'circle') return `<circle cx="${rr(e.x)}" cy="${rr(e.y)}" r="${rr(e.r)}"/>`;
  if (e.k === 'bar') {
    const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, L = Math.hypot(dx, dy);
    if (L < 0.5) return '';
    return `<rect x="${rr(e.a.x - e.w)}" y="${rr(e.a.y - e.w)}" width="${rr(L + e.w * 2)}" height="${rr(e.w * 2)}" rx="${rr(e.w)}" transform="rotate(${rr(Math.atan2(dy, dx) * 180 / Math.PI)} ${rr(e.a.x)} ${rr(e.a.y)})"/>`;
  }
  if (e.k === 'quad') return `<path d="M${e.pts.map(p => `${rr(p.x)} ${rr(p.y)}`).join('L')}Z"/>`;
  return '';
}).join('');

// One half of the pair as raw markup. treatment:
//   'colour' — the app's full look on a SOLID body: equipment, muscle wash,
//              posture line, fault ring (Pierre's compile, cleaned up).
//   'lines'  — body + posture line only: the difference IS the line. The
//              logo-simplified read that survives any size and any ground.
function pairLayer(pose, { role, treatment }) {
  const f = buildFigure(pose, 0);
  const id = `plg${++pairUid}`;
  const bodyPaths = f.body.map(d => `<path d="${d}"/>`).join('')
    + f.deltoids.map(c => `<circle cx="${rr(c.cx)}" cy="${rr(c.cy)}" r="${rr(c.r)}"/>`).join('')
    + `<ellipse cx="${rr(f.head.cx)}" cy="${rr(f.head.cy)}" rx="${rr(f.head.rx)}" ry="${rr(f.head.ry)}" transform="rotate(${rr(f.head.rot)} ${rr(f.head.cx)} ${rr(f.head.cy)})"/>`;
  const stroke = role === 'fault' ? 'var(--warn)' : 'var(--ok)';
  const guide = f.guide
    ? [f.guide.d, f.guide.mirror].filter(Boolean).map(d =>
        `<path d="${d}" fill="none" stroke="var(--ground)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`
        + `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
    : '';
  if (treatment === 'lines') {
    const ring = (role === 'fault' && f.fault.length)
      ? `<g fill="none" stroke="var(--anatomy)" stroke-width="8">${f.fault.map(m => `<circle cx="${rr(m.x)}" cy="${rr(m.y)}" r="${rr(m.r + 10)}"/>`).join('')}</g>`
      : '';
    return `<g fill="currentColor">${bodyPaths}</g>${guide}${ring}`;
  }
  const washes = (list, colour, op) => (list && list.length
    ? `<g clip-path="url(#${id})" fill="${colour}" opacity="${op}">${list.map(d => `<path d="${d}"/>`).join('')}</g>` : '');
  const ring = f.fault.length
    ? `<g clip-path="url(#${id})" fill="var(--anatomy)" opacity="0.8">${f.fault.map(m => `<circle cx="${rr(m.x)}" cy="${rr(m.y)}" r="${rr(m.r)}"/>`).join('')}</g>`
      + `<g fill="none" stroke="var(--anatomy)" stroke-width="8">${f.fault.map(m => `<circle cx="${rr(m.x)}" cy="${rr(m.y)}" r="${rr(m.r + 12)}"/>`).join('')}</g>`
    : '';
  return `<g fill="var(--equipment)" opacity="0.95">${equipShapes(f.equip)}</g>`
    + `<clipPath id="${id}">${bodyPaths}</clipPath>`
    + `<g fill="currentColor">${bodyPaths}</g>`
    + washes(f.muscles.secondary, 'var(--muscle-2)', 0.5)
    + washes(f.muscles.primary, 'var(--muscle)', 0.78)
    + guide + ring;
}

// Compose the facing pair. Pierre's compile: the CORRECT half is mirrored to
// face left, the fault half keeps the library's facing — hips meet in the
// middle, "> <". layout:
//   sym  — same size, same baseline, a small gap.
//   off  — his asked-for play: both slightly smaller, left nudged down,
//          right nudged up, pulled together so the hips overlap.
//   lock — the same, tighter, for the interlocked read.
function pairSvg(treatment, layout) {
  const fig = figureFor('Deadlift');
  const okL = pairLayer(fig.correct, { role: 'correct', treatment });
  const faR = pairLayer(fig.fault, { role: 'fault', treatment });
  const vbA = boundsOf(okL), vbB = boundsOf(faR);
  const x = Math.min(vbA.x, vbB.x), y = Math.min(vbA.y, vbB.y);
  const w = Math.max(vbA.x + vbA.w, vbB.x + vbB.w) - x, h = Math.max(vbA.y + vbA.h, vbB.y + vbB.h) - y;
  const vb = `${x.toFixed(0)} ${y.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`;
  const mirror = (inner) => `<g transform="translate(${rr(2 * x + w)} 0) scale(-1 1)">${inner}</g>`;
  const half = (inner, px, py, s) =>
    `<svg viewBox="${vb}" width="${rr(w * s)}" height="${rr(h * s)}" x="${rr(px)}" y="${rr(py)}">${inner}</svg>`;
  const L = { sym: { s: 1, lx: 0, ly: 0, rx: w * 1.04, ry: 0, W: w * 2.04, H: h },
              off: { s: 0.94, lx: 0, ly: h * 0.09, rx: w * 0.80, ry: 0, W: w * 0.80 + w * 0.94, H: h * 0.94 + h * 0.09 },
              lock: { s: 0.94, lx: 0, ly: h * 0.09, rx: w * 0.64, ry: 0, W: w * 0.64 + w * 0.94, H: h * 0.94 + h * 0.09 } }[layout];
  return `<svg viewBox="0 0 ${rr(L.W)} ${rr(L.H)}" xmlns="http://www.w3.org/2000/svg">`
    + half(mirror(okL), L.lx, L.ly, L.s)
    + half(faR, L.rx, L.ry, L.s)
    + `</svg>`;
}

const PAIR_STUDIES = [
  { id: 'pair-sym-colour', layout: 'sym', treatment: 'colour', note: 'his compile, cleaned: symmetric, full colour' },
  { id: 'pair-off-colour', layout: 'off', treatment: 'colour', note: 'left down, right up, pulled together — coloured' },
  { id: 'pair-sym-lines', layout: 'sym', treatment: 'lines', note: 'symmetric, mono body — the posture lines carry the whole difference' },
  { id: 'pair-off-lines', layout: 'off', treatment: 'lines', note: 'the "> <" read, mono + lines' },
  { id: 'pair-lock-lines', layout: 'lock', treatment: 'lines', note: 'tighter interlock, mono + lines' },
];
const pairs = {};
for (const p of PAIR_STUDIES) {
  pairs[p.id] = { ...p, movement: 'Deadlift pair, facing', svg: pairSvg(p.treatment, p.layout) };
  marks[p.id] = pairs[p.id]; // reachable by --freeze once Pierre picks
}

const SIZES = [220, 96, 48, 24, 16];
// Live token values from src/styles.css (v2.25.1) — the figure hues so the
// coloured studies preview EXACTLY what the app would paint, per skin.
const skinVars = {
  midnight: '--ground:#0A1524;--ground-lit:#0F2A52;--raised:#16263C;--chalk:#E9EEF3;--chalk-dim:#9DAABB;--bar:#5A78A8;'
    + '--ok:#4FC08D;--warn:#E0A32B;--anatomy:#F2622C;--muscle:#F03A68;--muscle-2:#9A7BC8;--equipment:#4AA0F0;',
  steel: '--ground:#A9BAD2;--ground-lit:#D3DEEC;--raised:rgba(255,255,255,0.55);--chalk:#141C33;--chalk-dim:#3A4767;--bar:#475A80;'
    + '--ok:#0E5238;--warn:#583E04;--anatomy:#9C3A12;--muscle:#C41A4F;--muscle-2:#5A4C9E;--equipment:#2D66C4;',
};

const cell = (m, size) => `
  <div class="cell">
    <div class="box" style="width:${size + 16}px;height:${size + 16}px"><span style="width:${size}px;height:${size}px">${m.svg}</span></div>
    <div class="cap">${size}</div>
  </div>`;

const RECOMMENDED = 'pair-off-lines';
const LIVE = 'hinge';

const rows = (list) => list.map(m => `
      <div class="row">
        <div class="label">
          <strong>${m.id}${m.id === RECOMMENDED ? ' <span class="pick">recommended</span>' : ''}${m.id === LIVE ? ' <span class="pick">live now</span>' : ''}</strong>
          <small>${m.movement}</small>
          <em>${m.note}</em>
        </div>
        <div class="cells">
          ${SIZES.map(s => cell(m, s)).join('')}
          <div class="cell"><div class="box framed" style="width:56px;height:56px"><span style="width:${m.id.startsWith('pair') ? 44 : 34}px;height:${m.id.startsWith('pair') ? 30 : 34}px">${m.svg}</span></div><div class="cap">header</div></div>
        </div>
      </div>`).join('');

const section = (skin) => `
  <section style="${skinVars[skin]}background:var(--ground);color:var(--chalk)">
    <h2>${skin} — the facing pair (round 2)</h2>
    ${rows(Object.values(pairs))}
    <h2>${skin} — single figures (round 1)</h2>
    ${rows(Object.values(marks).filter(m => !m.id.startsWith('pair')))}
  </section>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The SpotSet Mark</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700&family=Saira:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
  :root{--ground:#0A1524;--lit:#0F2A52;--chalk:#E9EEF3;--dim:#9DAABB;--shaft:#5A78A8;--arc:#35B7E8}
  *{box-sizing:border-box;margin:0}
  body{background:var(--ground);color:var(--chalk);font-family:'Saira',system-ui,sans-serif}
  header{padding:26px 20px 18px;background:radial-gradient(130% 90% at 50% 0%,var(--lit) 0%,var(--ground) 70%)}
  h1{font-family:'Saira Condensed',sans-serif;font-weight:700;font-size:28px;letter-spacing:.06em;text-transform:uppercase}
  header p{color:var(--dim);font-size:14px;max-width:34em;margin-top:6px;line-height:1.5}
  header .how{margin-top:10px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--dim)}
  header .how b{color:var(--chalk);font-weight:500}
  section{padding:16px 20px 8px}
  h2{font-family:'Saira Condensed',sans-serif;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.14em;color:var(--chalk-dim,inherit);display:flex;align-items:center;gap:10px}
  h2::after{content:'';flex:1;height:3px;border-radius:2px;background:var(--bar)}
  .row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;padding:16px 0;border-bottom:2px solid var(--bar)}
  .row:last-child{border-bottom:none}
  .label{width:190px;font-size:12px;color:var(--chalk-dim);display:flex;flex-direction:column;gap:2px}
  .label strong{color:var(--chalk);font-family:'Saira Condensed',sans-serif;font-size:16px;letter-spacing:.06em;text-transform:uppercase}
  .label em{font-style:normal;line-height:1.4}
  .pick{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;color:#35B7E8;border:1px solid #35B7E8;border-radius:3px;padding:1px 5px;vertical-align:2px;text-transform:uppercase}
  .cells{display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px}
  .cell{text-align:center}
  .box{display:inline-flex;align-items:center;justify-content:center}
  .box span{display:inline-block;color:var(--chalk)} .box svg{width:100%;height:100%;display:block}
  .box.framed{background:var(--raised);border:2px solid var(--bar);border-radius:6px}
  .cap{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--chalk-dim);margin-top:4px;font-variant-numeric:tabular-nums}
</style></head><body>
<header>
  <h1>The SpotSet Mark</h1>
  <p>Round 2, from your compile: correct and fault FACE each other — the "&gt; &lt;" read. Five
  studies: symmetric vs offset-and-pulled-together, full colour vs mono-with-lines. Everything is
  drawn live from the figure library. Judge the pairs at 96 and 48 (store icon / splash); the
  header cell shows the honest 24px truth.</p>
  <p class="how">To pick: say the name — <b>pair-sym-colour · pair-off-colour · pair-sym-lines ·
  pair-off-lines · pair-lock-lines</b> (or a round-1 single). Sizing nudges are one number each —
  say "left lower" / "tighter" and I re-cut.</p>
</header>
${section('midnight')}
${section('steel')}
</body></html>`;

mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/logo-candidates.html', html);
console.log('wrote tmp/logo-candidates.html');

// --freeze <id> [--freeze-bg <id>]: write the chosen mark (and optionally the
// backdrop counterpart) into src/spotsetMark.js as FROZEN strings. The logo
// must not move when a pose is later tuned, so the app never renders it live
// from the library — regeneration is an explicit act, here.
const clean = (svg) => svg
  .replace(' class="fig "', '')
  .replace(' role="img" aria-hidden="true"', ' aria-hidden="true"')
  .replace('<svg ', '<svg width="100%" height="100%" ');
// height/width from the viewBox, so a component can keep the aspect without
// parsing SVG at runtime.
const ratioOf = (svg) => {
  const [, , w, h] = svg.match(/viewBox="([^"]*)"/)[1].split(' ').map(Number);
  return Math.round((h / w) * 1000) / 1000;
};
const freezeArg = process.argv.indexOf('--freeze');
if (freezeArg !== -1) {
  const id = process.argv[freezeArg + 1] || 'hinge';
  const bgArg = process.argv.indexOf('--freeze-bg');
  const bgId = bgArg !== -1 ? process.argv[bgArg + 1] : null;
  const m = clean(marks[id].svg);
  const bg = bgId ? clean(marks[bgId].svg) : null;
  const out = `// ─── The SpotSet mark (B3) — GENERATED, then FROZEN ──────────────────────────
//
// Drawn FROM the figure library (Pierre's brief, 2026-08-22; his pick from the
// round-2 sheet, 2026-08-22): the mark is '${id}', the backdrop is
// ${bgId ? `'${bgId}' — the mono counterpart he asked to sit huge and faint behind the app` : 'not frozen'}.
// 🔴 FROZEN ON PURPOSE. The app does not render the logo live from the
//    library, because a logo must not move when a pose is tuned. Regenerate
//    only deliberately:
//    node scripts/logo-candidates.mjs --freeze ${id}${bgId ? ` --freeze-bg ${bgId}` : ''}
// Colours are TOKENS (--ok/--warn/--muscle/--equipment/--anatomy + currentColor),
// so both belong to every skin by doing nothing. The figure-token-in-UI rule
// has exactly one sanctioned exception: this mark, because it IS a figure and
// its colours mean here what they mean on every movement sheet.
export const SPOTSET_MARK_SVG = ${JSON.stringify(m)};
export const SPOTSET_MARK_RATIO = ${ratioOf(m)}; // height / width
${bgId ? `export const SPOTSET_BG_SVG = ${JSON.stringify(bg)};
export const SPOTSET_BG_RATIO = ${ratioOf(bg)};` : ''}
`;
  writeFileSync('src/spotsetMark.js', out);
  console.log(`froze mark '${id}'${bgId ? ` + backdrop '${bgId}'` : ''} into src/spotsetMark.js (${m.length}${bg ? ` + ${bg.length}` : ''} bytes)`);
}
