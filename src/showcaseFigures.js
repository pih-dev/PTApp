// ─── The wall for the showcase (v2.31; randomized v2.32) ─────────────────────
//
// Pierre, v2.32: "randomize from all moves, just try not to have duplicates on
// the screen at any point." So the wall is drawn fresh per cycle from the
// WHOLE bank: 24 distinct movements every time, a global Set guaranteeing no
// movement appears twice on screen — including across the slow crossfades,
// which release their old name and claim an unused one.
//
// Rotatable picks get precomputed frame sets (capped — generating figure svg
// per animation frame would eat the frame budget; the cap keeps the mount
// build ~100 small marks). READ-ONLY consumer of src/figures/.
import { EXERCISES } from './exerciseBank.js';
import { figureFor } from './figures/poses.js';
import { figureSvg } from './figures/svg.js';

export const ROT_FRAMES = 12;   // per half-turn; cells ping-pong 0..11..0
export const CELL_COUNT = 24;   // 6 across × 4 rows — his numbers
const MAX_ROT = 8;              // frame-precompute cap per wall

let POOL = null;
function pool() {
  if (POOL) return POOL;
  const rot = [], stat = [];
  for (const e of EXERCISES) {
    try {
      const f = figureFor(e.name);
      if (!f) continue;
      (f.rotatable ? rot : stat).push(e.name);
    } catch { /* a broken pose never breaks the show */ }
  }
  POOL = { rot, stat };
  return POOL;
}

const markOf = (name, mix) =>
  figureSvg(figureFor(name).correct, mix == null ? { detail: 'mark' } : { detail: 'mark', mix });

// Build one wall. Returns { cells, swapStatic } — swapStatic(cell) hands back
// a replacement movement no other cell is currently showing.
export function createWall(rand = Math.random) {
  const { rot, stat } = pool();
  const used = new Set();
  const pick = (list) => {
    for (let tries = 0; tries < 60; tries++) {
      const n = list[Math.floor(rand() * list.length)];
      if (!used.has(n)) { used.add(n); return n; }
    }
    return null;
  };
  const rotC = [], statC = [];
  for (let i = 0; i < Math.min(MAX_ROT, rot.length); i++) {
    const name = pick(rot);
    if (!name) break;
    try {
      const frames = [];
      for (let k = 0; k < ROT_FRAMES; k++) frames.push(markOf(name, k / (ROT_FRAMES - 1)));
      rotC.push({ kind: 'rot', name, frames });
    } catch { used.delete(name); }
  }
  while (rotC.length + statC.length < CELL_COUNT) {
    const name = pick(stat);
    if (!name) break;
    try { statC.push({ kind: 'static', name, svg: markOf(name) }); } catch { used.delete(name); }
  }
  // Spread the turning cells across the wall instead of clustering them.
  const cells = [];
  for (let i = 0; rotC.length || statC.length; i++) {
    cells.push((i % 3 === 1 && rotC.length) ? rotC.shift() : (statC.shift() || rotC.shift()));
  }
  return {
    cells,
    swapStatic(cell) {
      const name = pick(stat);
      if (!name) return null;
      used.delete(cell.name);
      try { return { kind: 'static', name, svg: markOf(name) }; } catch { used.delete(name); return null; }
    },
  };
}

// Ping-pong a tick into a frame index: 0..11..1 and around again.
export const pingpong = (t) => {
  const m = t % (2 * ROT_FRAMES - 2);
  return m < ROT_FRAMES ? m : 2 * ROT_FRAMES - 2 - m;
};
