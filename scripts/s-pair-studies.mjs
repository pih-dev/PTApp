// ─── B3: the S built FROM the pair (Pierre, 2026-08-23) ──────────────────────
//
// "The current logo is two silhouettes. If you arrange them properly, they
// will form an S. Draw the S with those — I like the animations on those —
// and take the fresh one from the deadlift so we don't end up with the black
// spots." So: no letterforms. Two fresh-renderer deadlift figures, arranged
// until their combined silhouette reads as an S.
//
// The structural insight the studies lean on: an S has 2-fold ROTATIONAL
// symmetry — its bottom bowl is its top bowl turned 180°. A hinged deadlift is
// one bowl; its 180° twin is the other. The upright alternatives (both figures
// standing, one mirrored, stacked diagonally) are studied beside it because an
// upside-down lifter is a real objection Pierre may raise.
//
// READ-ONLY use of src/figures (ownership handover: CCHealth owns those files;
// importing is fine, editing is not). The pm-line/pm-ring animation hooks from
// the shipped mark are kept on every study, so whichever wins animates on
// launch exactly like the current logo.
//
// Output: _archive/PTApp/branding/2026-08-23-spotset-s-pair-gallery.html
// (the folder the localhost:8734 server already serves).
import { writeFileSync } from 'node:fs';
import { figureFor } from '../src/figures/poses.js';
import { buildFigure } from '../src/figures/render.js';

const rr = (v) => Math.round(v * 10) / 10;
let uid = 0;

// One figure as raw markup: solid body (currentColor), posture guide with the
// animation hooks, fault ring when the pose has one. Equipment optional — the
// bar/ball mostly fights the letter silhouette, so default off.
function layer(pose, { role, equipment = false }) {
  const f = buildFigure(pose, 0);
  const id = `sps${++uid}`;
  const body = f.body.map(d => `<path d="${d}"/>`).join('')
    + f.deltoids.map(c => `<circle cx="${rr(c.cx)}" cy="${rr(c.cy)}" r="${rr(c.r)}"/>`).join('')
    + `<ellipse cx="${rr(f.head.cx)}" cy="${rr(f.head.cy)}" rx="${rr(f.head.rx)}" ry="${rr(f.head.ry)}" transform="rotate(${rr(f.head.rot)} ${rr(f.head.cx)} ${rr(f.head.cy)})"/>`;
  const stroke = role === 'fault' ? 'var(--warn)' : 'var(--ok)';
  const guide = f.guide
    ? [f.guide.d, f.guide.mirror].filter(Boolean).map(d =>
        `<path d="${d}" fill="none" stroke="var(--ground)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`
        + `<path class="pm-line" pathLength="100" d="${d}" fill="none" stroke="${stroke}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
    : '';
  const ring = (role === 'fault' && f.fault.length)
    ? `<g class="pm-ring" fill="none" stroke="var(--anatomy)" stroke-width="8">${f.fault.map(m => `<circle cx="${rr(m.x)}" cy="${rr(m.y)}" r="${rr(m.r + 10)}"/>`).join('')}</g>`
    : '';
  const equip = equipment
    ? `<g fill="var(--equipment)" opacity="0.9">${f.equip.map(e => e.k === 'circle' ? `<circle cx="${rr(e.x)}" cy="${rr(e.y)}" r="${rr(e.r)}"/>` : '').join('')}</g>`
    : '';
  return { markup: `${equip}<g fill="currentColor">${body}</g>${guide}${ring}`, id };
}

function boundsOf(markup, margin = 30) {
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const take = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const dm of markup.matchAll(/ d="([^"]*)"/g))
    for (const m of dm[1].matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) take(+m[1], +m[2]);
  for (const m of markup.matchAll(/c[xy]="(-?[\d.]+)" c[xy]="(-?[\d.]+)" r[xy]?="(-?[\d.]+)"/g)) {
    take(+m[1] - +m[3], +m[2] - +m[3]); take(+m[1] + +m[3], +m[2] + +m[3]);
  }
  return { x: minX - margin, y: minY - margin, w: maxX - minX + margin * 2, h: maxY - minY + margin * 2 };
}

// Compose two placed copies into one square-ish viewBox.
// Each placement: { markup, bounds, mirror, invert, dx, dy, rot } — dx/dy in
// fractions of the figure's own width/height; rot degrees about its centre.
function compose(placements, pad = 40) {
  const parts = [];
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of placements) {
    const b = p.bounds;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const tx = (p.dx || 0) * b.w, ty = (p.dy || 0) * b.h;
    const flips = `${p.mirror ? `translate(${rr(2 * cx)} 0) scale(-1 1)` : ''} ${p.invert ? `translate(0 ${rr(2 * cy)}) scale(1 -1)` : ''}`;
    const t = `translate(${rr(tx)} ${rr(ty)}) ${p.rot ? `rotate(${p.rot} ${rr(cx)} ${rr(cy)})` : ''} ${flips}`;
    parts.push(`<g class="${p.cls || ''}" transform="${t}">${p.markup}</g>`);
    // conservative post-transform bounds: the figure's own box shifted by tx/ty,
    // inflated when rotated. Good enough for a judging sheet.
    const inflate = p.rot ? Math.max(b.w, b.h) * 0.12 : 0;
    minX = Math.min(minX, b.x + tx - inflate); maxX = Math.max(maxX, b.x + b.w + tx + inflate);
    minY = Math.min(minY, b.y + ty - inflate); maxY = Math.max(maxY, b.y + b.h + ty + inflate);
  }
  const vb = `${rr(minX - pad)} ${rr(minY - pad)} ${rr(maxX - minX + pad * 2)} ${rr(maxY - minY + pad * 2)}`;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

const fig = figureFor('Deadlift');
const ok = layer(fig.correct, { role: 'correct' });
const fa = layer(fig.fault, { role: 'fault' });
const okB = boundsOf(ok.markup), faB = boundsOf(fa.markup);

const A = (over = {}) => ({ markup: ok.markup, bounds: okB, cls: 'pm-half pm-ok', ...over });
const F = (over = {}) => ({ markup: fa.markup, bounds: faB, cls: 'pm-half pm-fault', ...over });

// The studies. dx/dy tuned by eye against the hinge silhouette: the top figure
// sits high-right, its 180° twin (mirror+invert = rotate 180) low-left.
const STUDIES = [
  { id: 's-rot-sym', title: 'Rotational S — two correct', note: 'The pure S trick: the bottom figure IS the top one turned 180°. Both correct.',
    svg: compose([A({ dx: 0.22, dy: 0 }), A({ mirror: true, invert: true, dx: -0.22, dy: 0.62 })]) },
  { id: 's-rot-thesis', title: 'Rotational S — correct over fault', note: 'Same turn, but the lower bowl is the FAULT half: the injury ring sits in the S\u2019s tail.',
    svg: compose([A({ dx: 0.22, dy: 0 }), F({ mirror: true, invert: true, dx: -0.22, dy: 0.62 })]) },
  { id: 's-rot-tight', title: 'Rotational S — interlocked', note: 'The twins pulled together until hips overlap \u2014 densest read, most letter-like.',
    svg: compose([A({ dx: 0.12, dy: 0 }), A({ mirror: true, invert: true, dx: -0.12, dy: 0.45 })]) },
  { id: 's-stack-mirror', title: 'Upright stack — mirrored', note: 'No inversion: both figures stand, the top one mirrored, stacked on the S diagonal.',
    svg: compose([A({ mirror: true, dx: 0.3, dy: -0.42 }), A({ dx: -0.3, dy: 0.42 })]) },
  { id: 's-stack-thesis', title: 'Upright stack — correct high, fault low', note: 'The upright stack carrying the thesis: form held above, form lost below.',
    svg: compose([A({ mirror: true, dx: 0.3, dy: -0.42 }), F({ dx: -0.3, dy: 0.42 })]) },
  { id: 's-rot-lean', title: 'Rotational S — leaning', note: 'The rotational pair tilted 12\u00B0 \u2014 the italic S, more motion.',
    svg: compose([A({ dx: 0.22, dy: 0, rot: -12 }), A({ mirror: true, invert: true, dx: -0.22, dy: 0.62, rot: -12 })]) },
  { id: 's-rot-ball', title: 'Rotational S — with the equipment', note: 'The tight rotational pair, equipment kept: two counterweighted dots, like the S\u2019s terminals.',
    svg: compose([
      { ...A({ dx: 0.12, dy: 0 }), markup: layer(fig.correct, { role: 'correct', equipment: true }).markup },
      { ...A({ mirror: true, invert: true, dx: -0.12, dy: 0.45 }), markup: layer(fig.correct, { role: 'correct', equipment: true }).markup },
    ]) },
  { id: 's-rot-loose', title: 'Rotational S — open', note: 'The twins barely touching \u2014 airiest read, closest to the current logo\u2019s spacing.',
    svg: compose([A({ dx: 0.34, dy: 0 }), A({ mirror: true, invert: true, dx: -0.34, dy: 0.78 })]) },
];

// An S and its mirror are different letters (one is a Z-read). Every rotational
// study gets a flipped twin so both chiralities sit on the sheet — cheaper than
// arguing about which way the hinge hooks "should" open.
const flip = (svg) => {
  const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  const [x, , w] = [+m[1], +m[2], +m[3]];
  return svg.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)$/,
    (_, a, inner, z) => `${a}<g transform="translate(${rr(2 * x + w)} 0) scale(-1 1)">${inner}</g>${z}`);
};
for (const s of [...STUDIES]) {
  if (s.id.startsWith('s-rot') && !s.id.endsWith('-flip')) {
    STUDIES.push({ id: `${s.id}-flip`, title: `${s.title} (mirrored)`, note: 'The same study, opposite chirality.', svg: flip(s.svg) });
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tile = (c) => `
  <div class="cand">
    <div class="row">
      <div class="sw dark">${c.svg}</div>
      <div class="sw light">${c.svg}</div>
      <div class="sw dark tiny">${c.svg}</div>
      <div class="sw appicon">${c.svg}</div>
    </div>
    <div class="meta"><strong>${esc(c.title)}</strong> <code>${c.id}</code><p>${esc(c.note)}</p></div>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SpotSet — the S from the pair</title>
<style>
  :root { --ground:#171511; --chalk:#EDE4CE; --dim:#B4AB93;
          --ok:#74B36A; --warn:#E2B93B; --anatomy:#D2434B; --equipment:#8493A9; }
  body { background:var(--ground); color:var(--chalk); font-family:'Segoe UI',system-ui,sans-serif;
         margin:0; padding:32px 20px 80px; max-width:1100px; margin-inline:auto; }
  h1 { font-size:28px; } .sub { color:var(--dim); }
  .cand { display:flex; gap:24px; align-items:center; padding:18px 0; border-bottom:1px solid #2b2820; flex-wrap:wrap; }
  .row { display:flex; gap:14px; align-items:center; }
  .sw { display:flex; align-items:center; justify-content:center; border-radius:12px; }
  .sw svg { width:84px; height:84px; }
  .sw.dark { background:#100e0b; color:var(--chalk); width:116px; height:116px; }
  .sw.light { background:#E8E6E1; color:#26231D; width:116px; height:116px;
              --ground:#E8E6E1; --ok:#3E7A34; --warn:#8F6B00; --anatomy:#B02E37; --equipment:#5A6B85; }
  .sw.tiny svg { width:26px; height:26px; } .sw.tiny { width:50px; height:50px; }
  .sw.appicon { background:#0A1524; color:#E9EEF3; width:116px; height:116px; border-radius:26px; border:2px solid #35B7E8;
                --ground:#0A1524; }
  .meta { max-width:340px; } .meta code { color:var(--dim); font-size:12px; margin-inline-start:8px; }
  .meta p { color:var(--dim); font-size:14px; line-height:1.5; }
</style></head><body>
<h1>SpotSet — the S built from the pair</h1>
<p class="sub">Two fresh-renderer deadlift silhouettes arranged into an S. Every study keeps the
pm-line / pm-ring animation hooks, so the winner animates on launch exactly like today's logo.
Dark tile · daylight tile · 24px · launcher tile.</p>
${STUDIES.map(tile).join('')}
</body></html>`;

const out = 'C:/projects/_archive/PTApp/branding/2026-08-23-spotset-s-pair-gallery.html';
writeFileSync(out, html);
console.log(`wrote ${out} (${STUDIES.length} studies)`);
