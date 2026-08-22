// ─── Figure → SVG markup ─────────────────────────────────────────────────────
//
// ONE serialiser, used by the app AND by the preview harness. The whole point
// of the pilot is judging what will actually ship, so the harness must not
// build its own SVG — if it did, we would be judging a drawing the app never
// makes. Everything downstream of `buildFigure` lives here and only here.
//
// 🔴 NOT ONE COLOUR IS BAKED IN. The body paints in `currentColor`, so a figure
//    takes the colour of whatever text it sits in and works on every skin
//    including ones not yet designed. The named tokens are figure-internal
//    (`--anatomy`, `--muscle`, `--muscle-2`, `--equipment`), each of which
//    exists for exactly this and is forbidden in the UI. A hardcoded
//    literal here would belong to one skin and break the other — the rule the
//    entire design pass is built on.

import { buildFigure } from './render.js';
import { FLOOR } from './canon.js';

// The fixed cell (the reference read, sheet 3: "each figure occupies the same
// cell and is drawn to the same eye height"). Width is generous because a
// loaded barbell is genuinely wider than a person; HEIGHT and the baseline are
// what must never vary, because they are what set the figure's apparent size.
export const CELL = { x: -450, y: -40, w: 900, h: 830 };
export const VIEWBOX = `${CELL.x} ${CELL.y} ${CELL.w} ${CELL.h}`;

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function equipMarkup(equip) {
  return equip.map((e) => {
    if (e.k === 'circle') {
      return `<circle cx="${r(e.x)}" cy="${r(e.y)}" r="${r(e.r)}"/>`;
    }
    if (e.k === 'bar') {
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const L = Math.hypot(dx, dy);
      if (L < 0.5) return '';
      return `<rect x="${r(e.a.x - e.w)}" y="${r(e.a.y - e.w)}" width="${r(L + e.w * 2)}" height="${r(e.w * 2)}" rx="${r(e.w)}" transform="rotate(${r(Math.atan2(dy, dx) * 180 / Math.PI)} ${r(e.a.x)} ${r(e.a.y)})"/>`;
    }
    if (e.k === 'quad') {
      return `<path d="M${e.pts.map(p => `${r(p.x)} ${r(p.y)}`).join('L')}Z"/>`;
    }
    return '';
  }).join('');
}

const r = (v) => Math.round(v * 10) / 10;

const washes = (list, colour, opacity, id) => (list && list.length
  ? `<g clip-path="url(#${id})" fill="${colour}" opacity="${opacity}">${list.map(d => `<path d="${d}"/>`).join('')}</g>`
  : '');

let uid = 0;

// detail:
//   'full' — the movement sheet. Body, muscle wash, equipment, fault marker.
//   'mark' — the 16–24px reduction for list rows and tabs. THE SAME POSE with
//            fewer parts (the reference read: the mark is drawn FROM the figure,
//            never separately — that is what keeps 340 movements one family).
export function figureSvg(pose, { detail = 'full', title = '', className = '', mix = 0 } = {}) {
  const f = buildFigure(pose, mix);
  const mark = detail === 'mark';
  const id = `fg${++uid}`;
  // Held versus lost, and the hue carries it: --accent is this app's "under
  // load, pay attention" colour and --warn is its "this is going wrong" one.
  // The pose says which by whether it marks a fault, so the two can never be
  // set inconsistently from a pose file.
  const guideStroke = f.fault.length ? 'var(--warn)' : 'var(--accent)';

  const bodyPaths = f.body.map(d => `<path d="${d}"/>`).join('')
    + f.deltoids.map(c => `<circle cx="${r(c.cx)}" cy="${r(c.cy)}" r="${r(c.r)}"/>`).join('')
    + `<ellipse cx="${r(f.head.cx)}" cy="${r(f.head.cy)}" rx="${r(f.head.rx)}" ry="${r(f.head.ry)}" transform="rotate(${r(f.head.rot)} ${r(f.head.cx)} ${r(f.head.cy)})"/>`;

  // At mark size the wash and the marker are sub-pixel noise that only muddies
  // the shape — the mark's whole job is to be ONE readable silhouette.
  const inner = mark
    ? `<g fill="currentColor">${bodyPaths}${equipMarkup(f.equip.filter(e => e.k !== 'quad'))}</g>`
    : [
      // v2.24: equipment paints from its OWN token (Pierre: "colour them in
      // blue") — currentColor at 0.42 made a bench read as part of the body.
      // Still translucent so a limb crossing the bar keeps its depth cue.
      `<g fill="var(--equipment)" opacity="0.6">${equipMarkup(f.equip)}</g>`,
      // 🔴 NO <g> INSIDE A clipPath. Only shapes, text and <use> are legal
      //    children; a group is silently ignored, the clip resolves to EMPTY,
      //    and everything clipped by it — the whole muscle code and the filled
      //    half of the fault marker — disappears. It fails silently and it
      //    looks exactly like "the wash isn't implemented yet".
      `<clipPath id="${id}">${bodyPaths}</clipPath>`,
      `<g fill="currentColor" opacity="0.78">${bodyPaths}</g>`,
      // The muscle wash, COLOUR-CODED: primary movers in --muscle, supporting
      // work in --muscle-2. Clipped, so it can only ever paint on the body — a
      // wash that spills outside the silhouette reads as a bug, not as anatomy.
      washes(f.muscles.secondary, 'var(--muscle-2)', 0.5, id),
      washes(f.muscles.primary, 'var(--muscle)', 0.62, id),
      // 🔴 THE POSTURE LINE, over everything the body paints and under the fault
      //    marker. The halo is not decoration: an accent stroke laid straight on
      //    a silhouette of similar value disappears at list size, and this line
      //    is the one thing a reader is meant to compare between the two figures.
      f.guide
        ? [f.guide.d, f.guide.mirror].filter(Boolean).map(d =>
            `<path d="${d}" fill="none" stroke="var(--ground)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`
            + `<path d="${d}" fill="none" stroke="${guideStroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        : '',
      // The fault marker: filled INSIDE the body so it reads as tissue under
      // load, plus a ring outside it so the eye finds it at a glance. On the
      // joint that takes the stress — never an outline round the whole figure.
      f.fault.length
        ? `<g clip-path="url(#${id})" fill="var(--anatomy)" opacity="0.8">${f.fault.map(m => `<circle cx="${r(m.x)}" cy="${r(m.y)}" r="${r(m.r)}"/>`).join('')}</g>`
          + `<g fill="none" stroke="var(--anatomy)" stroke-width="7" opacity="0.85">${f.fault.map(m => `<circle cx="${r(m.x)}" cy="${r(m.y)}" r="${r(m.r + 12)}"/>`).join('')}</g>`
        : '',
    ].join('');

  const t = title ? `<title>${esc(title)}</title>` : '';
  return `<svg class="fig ${className}" viewBox="${VIEWBOX}" role="img" aria-hidden="${title ? 'false' : 'true'}" xmlns="http://www.w3.org/2000/svg">${t}${inner}</svg>`;
}

export { FLOOR };
