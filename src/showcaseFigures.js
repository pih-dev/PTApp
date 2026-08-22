// ─── The wall for the showcase (v2.31) ───────────────────────────────────────
//
// Pierre: "there are a lot of 360° frames in the movements… populate the
// screen." 24 cells (6 across × 4 rows): the ten most distinct ROTATABLE
// movements turn continuously (precomputed mark frames — generating svg per
// animation frame at runtime would eat the frame budget), and the rest
// crossfade through the wider library, so the wall IS the library showing off.
//
// READ-ONLY consumer of src/figures/ — same import surface every screen uses;
// the figures-session ownership rule bans EDITING those files, not using them.
import { EXERCISES } from './exerciseBank.js';
import { figureFor } from './figures/poses.js';
import { figureSvg } from './figures/svg.js';

// Ten rotatable picks, chosen for silhouette variety (the 24 rotatable
// movements cluster into curl/bench/hinge families — ten distinct reads).
const ROT_PICKS = [
  'Barbell Curl', 'Arnold Dumbbell Press', 'Flat Barbell Press', 'Deadlift',
  'Good Morning', 'Sumo Deadlift', 'Incline Barbell Press', 'Rack Pull',
  'Single Leg Romanian Deadlift', 'Decline Barbell Press',
];
export const ROT_FRAMES = 12;        // per half-turn; cells ping-pong 0..11..0
export const CELL_COUNT = 24;        // 6 across × 4 rows — his numbers

// Build every cell's art. ~180 mark-mode svg builds — run it once, AFTER first
// paint (the caller defers it behind the hero phase), never per frame.
export function buildShowcaseCells() {
  const cells = [];
  for (const name of ROT_PICKS) {
    try {
      const fig = figureFor(name);
      if (!fig || !fig.rotatable) continue;
      const frames = [];
      for (let k = 0; k < ROT_FRAMES; k++) {
        frames.push(figureSvg(fig.correct, { detail: 'mark', mix: k / (ROT_FRAMES - 1) }));
      }
      cells.push({ kind: 'rot', frames });
    } catch { /* a broken pose never breaks the show */ }
  }
  // Static pool: a deterministic spread across the whole bank, 4 marks per
  // remaining cell so each crossfades through its own little set.
  const statics = [];
  for (let i = 0; i < EXERCISES.length && statics.length < (CELL_COUNT - cells.length) * 4; i += 7) {
    try {
      const fig = figureFor(EXERCISES[i].name);
      if (!fig || fig.rotatable) continue;
      statics.push(figureSvg(fig.correct, { detail: 'mark' }));
    } catch { /* skip */ }
  }
  let s = 0;
  while (cells.length < CELL_COUNT && statics.length) {
    const pool = [];
    for (let k = 0; k < 4 && statics.length; k++) pool.push(statics[s++ % statics.length]);
    cells.push({ kind: 'static', pool });
  }
  // Interleave so the turning cells spread across the wall instead of
  // clustering in the first two rows.
  const rot = cells.filter(c => c.kind === 'rot'), st = cells.filter(c => c.kind === 'static');
  const out = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    out.push((i % 2 === 0 && rot.length) ? rot.shift() : (st.shift() || rot.shift()));
  }
  return out.filter(Boolean);
}

// Ping-pong a tick into a frame index: 0..11..1 and around again.
export const pingpong = (t) => {
  const m = t % (2 * ROT_FRAMES - 2);
  return m < ROT_FRAMES ? m : 2 * ROT_FRAMES - 2 - m;
};
