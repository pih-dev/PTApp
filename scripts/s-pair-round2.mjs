// ─── B3 round 2: the Spot and the Set (Pierre, 2026-08-23) ───────────────────
//
// His spec, distilled: rotational pair with the equipment "might work", but
// (1) one figure CORRECT, one FAULT — the S is "the set of wrong and right
//     posture";
// (2) the whole S tilted counter-clockwise ~10–15°;
// (3) A DOT: "the circle is the SPOT, the S is the SET" — SpotSet in one mark.
//     Animatable later: the dot roams, then settles where it can observe.
// (4) The deadlift hinge is wide (~130°) so its S is narrow — try figures that
//     bend nearer 90° with arms further off the torso (his call: a better S).
//
// Read-only on src/figures, same as round 1.
import { writeFileSync } from 'node:fs';
import { figureFor } from '../src/figures/poses.js';
import { buildFigure } from '../src/figures/render.js';

const rr = (v) => Math.round(v * 10) / 10;
let uid = 0;

function layer(pose, { role, equipment = true }) {
  const f = buildFigure(pose, 0);
  uid++;
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
  return `${equip}<g fill="currentColor">${body}</g>${guide}${ring}`;
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

// The rotational S: top = correct, bottom = the same box rotated 180° holding
// the FAULT half. tilt = whole-mark rotation (negative = counter-clockwise).
// dot = {pos} adds the Spot: 'center' | 'high' (upper-right vantage) |
// 'stop' (a full-stop after the S's tail).
function sMark(movement, { dx = 0.12, dy = 0.5, tilt = 0, dot = null, mirrorAll = false } = {}) {
  const fig = figureFor(movement);
  if (!fig) return null;
  const ok = layer(fig.correct, { role: 'correct' });
  const fa = layer(fig.fault, { role: 'fault' });
  const okB = boundsOf(ok), faB = boundsOf(fa);
  const place = (markup, b, { rot180 = false, ddx = 0, ddy = 0, cls }) => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const t = `translate(${rr(ddx * b.w)} ${rr(ddy * b.h)})${rot180 ? ` rotate(180 ${rr(cx)} ${rr(cy)})` : ''}`;
    return { part: `<g class="${cls}" transform="${t}">${markup}</g>`, box: { x: b.x + ddx * b.w, y: b.y + ddy * b.h, w: b.w, h: b.h } };
  };
  const top = place(ok, okB, { ddx: dx, ddy: 0, cls: 'pm-half pm-ok' });
  const bot = place(fa, faB, { rot180: true, ddx: -dx, ddy: dy, cls: 'pm-half pm-fault' });
  let minX = Math.min(top.box.x, bot.box.x), minY = Math.min(top.box.y, bot.box.y);
  let maxX = Math.max(top.box.x + top.box.w, bot.box.x + bot.box.w);
  let maxY = Math.max(top.box.y + top.box.h, bot.box.y + bot.box.h);
  const w0 = maxX - minX, h0 = maxY - minY;
  // room for the tilt and the dot
  const pad = Math.max(w0, h0) * 0.16 + 40;
  const vbX = minX - pad, vbY = minY - pad, vbW = w0 + pad * 2, vbH = h0 + pad * 2;
  const ccx = minX + w0 / 2, ccy = minY + h0 / 2;
  let inner = top.part + bot.part;
  if (mirrorAll) inner = `<g transform="translate(${rr(2 * ccx)} 0) scale(-1 1)">${inner}</g>`;
  if (tilt) inner = `<g transform="rotate(${tilt} ${rr(ccx)} ${rr(ccy)})">${inner}</g>`;
  if (dot) {
    const r = w0 * 0.09;
    const at = {
      center: [ccx, ccy],
      high: [maxX + r * 0.4, minY - r * 0.2],
      stop: [maxX + r * 1.2, maxY - r * 0.6],
    }[dot.pos];
    // The Spot. pm-spot is the animation hook: launch can wander it, then
    // settle it here — the vantage from which the set is observed.
    inner += `<circle class="pm-spot" cx="${rr(at[0])}" cy="${rr(at[1])}" r="${rr(r)}" fill="var(--accent)"/>`;
  }
  return `<svg viewBox="${rr(vbX)} ${rr(vbY)} ${rr(vbW)} ${rr(vbH)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// Movements to try, wide→square hinge. Names guarded — a missing one is skipped.
const MOVES = ['Deadlift', 'Romanian Deadlift', 'Barbell Row', 'Good Morning', 'Kettlebell Swing'];

const STUDIES = [];
for (const m of MOVES) {
  const base = sMark(m, { tilt: -12, dot: { pos: 'center' } });
  if (!base) { console.error(`no figure for ${m} — skipped`); continue; }
  STUDIES.push({ id: `${m.toLowerCase().replace(/ /g, '-')}-s`, title: `${m} — the Spot and the Set`, note: 'Correct over fault (rotated 180°), tilted 12° CCW, the Spot at centre.', svg: base });
}
// Variations on the deadlift (the incumbent), per his spec:
STUDIES.push(
  { id: 'deadlift-s-10', title: 'Deadlift — 10° tilt', note: 'The lighter tilt of his 10–15 range.', svg: sMark('Deadlift', { tilt: -10, dot: { pos: 'center' } }) },
  { id: 'deadlift-s-15', title: 'Deadlift — 15° tilt', note: 'The stronger tilt.', svg: sMark('Deadlift', { tilt: -15, dot: { pos: 'center' } }) },
  { id: 'deadlift-s-high-dot', title: 'Deadlift — the Spot above', note: 'The dot as the observer\u2019s vantage: high and to the side, watching the set.', svg: sMark('Deadlift', { tilt: -12, dot: { pos: 'high' } }) },
  { id: 'deadlift-s-stop-dot', title: 'Deadlift — the Spot as full stop', note: 'The dot after the S\u2019s tail, like the period in \u201CS.\u201D', svg: sMark('Deadlift', { tilt: -12, dot: { pos: 'stop' } }) },
  { id: 'deadlift-s-mirror', title: 'Deadlift — mirrored chirality', note: 'The same mark, flipped, Spot at centre.', svg: sMark('Deadlift', { tilt: -12, dot: { pos: 'center' }, mirrorAll: true }) },
  { id: 'deadlift-s-tight', title: 'Deadlift — tighter interlock', note: 'Hips pulled into overlap before the tilt.', svg: sMark('Deadlift', { dx: 0.06, dy: 0.42, tilt: -12, dot: { pos: 'center' } }) },
);

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
<title>SpotSet — the Spot and the Set, round 2</title>
<style>
  :root { --ground:#171511; --chalk:#EDE4CE; --dim:#B4AB93; --accent:#E07B39;
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
              --ground:#E8E6E1; --accent:#BD5E1E; --ok:#3E7A34; --warn:#8F6B00; --anatomy:#B02E37; --equipment:#5A6B85; }
  .sw.tiny svg { width:26px; height:26px; } .sw.tiny { width:50px; height:50px; }
  .sw.appicon { background:#0A1524; color:#E9EEF3; width:116px; height:116px; border-radius:26px; border:2px solid #35B7E8;
                --ground:#0A1524; --accent:#35B7E8; }
  .meta { max-width:340px; } .meta code { color:var(--dim); font-size:12px; margin-inline-start:8px; }
  .meta p { color:var(--dim); font-size:14px; line-height:1.5; }
</style></head><body>
<h1>SpotSet — the Spot and the Set</h1>
<p class="sub">Round 2 of the pair-S: correct over fault (the S is the SET of right and wrong),
tilted counter-clockwise, and the circle is the SPOT — the vantage that watches the set. The dot
carries a pm-spot hook so launch can wander it and settle it, alongside the pm-line draw you
already like. First rows: five hinge movements compared — the squarer the hinge, the rounder the S.</p>
${STUDIES.filter(s => s.svg).map(tile).join('')}
</body></html>`;

const out = 'C:/projects/_archive/PTApp/branding/2026-08-23-spotset-s-pair-round2.html';
writeFileSync(out, html);
console.log(`wrote ${out} (${STUDIES.filter(s => s.svg).length} studies)`);
