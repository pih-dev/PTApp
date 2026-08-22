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

// The pair lockup for LARGE sizes (Play icon, splash): correct solid, fault
// ghosted behind it — the app's thesis in one picture. Built from the same two
// library poses; the fault half sits offset and translucent.
function pairLockup() {
  const fig = figureFor('Deadlift');
  const ok = cropSvg(figureSvg(fig.correct, { detail: 'mark' }));
  const bad = cropSvg(figureSvg(fig.fault, { detail: 'mark' }));
  const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const vb = ok.match(/viewBox="([^"]*)"/)[1].split(' ').map(Number);
  const [x, y, w, h] = vb;
  return `<svg viewBox="${x - w * 0.12} ${y - h * 0.10} ${w * 1.24} ${h * 1.18}" xmlns="http://www.w3.org/2000/svg">`
    + `<g opacity="0.28" transform="translate(${w * 0.10} ${-h * 0.06})"><svg viewBox="${vb.join(' ')}" width="${w}" height="${h}" x="${x}" y="${y}">${inner(bad)}</svg></g>`
    + `<svg viewBox="${vb.join(' ')}" width="${w}" height="${h}" x="${x}" y="${y}">${inner(ok)}</svg>`
    + `</svg>`;
}
marks.pair = { id: 'pair', movement: 'Deadlift pair', note: 'correct solid + fault ghost — the thesis, for LARGE sizes only', svg: pairLockup() };

const SIZES = [220, 96, 48, 24, 16];
const skinVars = {
  midnight: '--ground:#0A1524;--ground-lit:#0F2A52;--raised:#16263C;--chalk:#E9EEF3;--chalk-dim:#9DAABB;--bar:#5A78A8;',
  steel: '--ground:#A9BAD2;--ground-lit:#D3DEEC;--raised:rgba(255,255,255,0.55);--chalk:#141C33;--chalk-dim:#3A4767;--bar:#475A80;',
};

const cell = (m, size) => `
  <div class="cell">
    <div class="box" style="width:${size + 16}px;height:${size + 16}px"><span style="width:${size}px;height:${size}px">${m.svg}</span></div>
    <div class="cap">${size}</div>
  </div>`;

const RECOMMENDED = 'hinge';

const section = (skin) => `
  <section style="${skinVars[skin]}background:var(--ground);color:var(--chalk)">
    <h2>${skin}</h2>
    ${Object.values(marks).map(m => `
      <div class="row">
        <div class="label">
          <strong>${m.id}${m.id === RECOMMENDED ? ' <span class="pick">live now</span>' : ''}</strong>
          <small>${m.movement}</small>
          <em>${m.note}</em>
        </div>
        <div class="cells">
          ${SIZES.map(s => cell(m, s)).join('')}
          <div class="cell"><div class="box framed" style="width:56px;height:56px"><span style="width:34px;height:34px">${m.svg}</span></div><div class="cap">header</div></div>
        </div>
      </div>`).join('')}
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
  <p>Every candidate is a real pose from the app's own figure library — the mark is drawn from the
  system it fronts. Judge at 24 and 16: that is where it will live. The pair lockup is for the
  store icon only.</p>
  <p class="how">To switch: say the name — <b>hinge · squat · press · row · pair</b>. One command re-freezes it.</p>
</header>
${section('midnight')}
${section('steel')}
</body></html>`;

mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/logo-candidates.html', html);
console.log('wrote tmp/logo-candidates.html');

// --freeze <id>: write the chosen mark into src/spotsetMark.js as a FROZEN
// string. The logo must not move when a pose is later tuned, so the app never
// renders it live from the library — regeneration is an explicit act, here.
const freezeArg = process.argv.indexOf('--freeze');
if (freezeArg !== -1) {
  const id = process.argv[freezeArg + 1] || 'hinge';
  const m = marks[id];
  const clean = m.svg
    .replace(' class="fig "', '')
    .replace(' role="img" aria-hidden="true"', ' aria-hidden="true"')
    .replace('<svg ', '<svg width="100%" height="100%" ');
  const out = `// ─── The SpotSet mark (B3) — GENERATED, then FROZEN ──────────────────────────
//
// Drawn FROM the figure library (Pierre's brief, 2026-08-22): this is the
// library's own '${id}' mark (${m.movement}, detail 'mark'), cropped tight.
// 🔴 FROZEN ON PURPOSE. The app does not render the logo live from the
//    library, because a logo must not move when a pose is tuned. Regenerate
//    only deliberately: node scripts/logo-candidates.mjs --freeze ${id}
// It paints from currentColor, so it belongs to every skin by doing nothing.
export const SPOTSET_MARK_SVG = ${JSON.stringify(clean)};
`;
  writeFileSync('src/spotsetMark.js', out);
  console.log(`froze '${id}' into src/spotsetMark.js (${clean.length} bytes)`);
}
