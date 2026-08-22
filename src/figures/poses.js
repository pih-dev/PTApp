// ─── Assembling a figure for any of the 340 movements ────────────────────────
//
// A figure is THREE things composed, and each comes from the place that knows it:
//   · the POSE comes from the archetype (`archetypes.js`) — the pattern owns the
//     shape and the fault, because a Front Squat and a Box Squat are one drawing;
//   · the MUSCLES come from the bank (`exerciseBank.js`) — per movement, so a
//     Close Grip Bench and a Dumbbell Fly wash differently even where the pose
//     is shared;
//   · the EQUIPMENT comes from the NAME — the one place that reliably says
//     barbell, dumbbell, cable, machine or nothing.
//
// 🔴 EQUIPMENT IS A FUNCTION OF THE SKELETON, never a fixed coordinate. The bar
//    is drawn where the HANDS are. Change a pose and the bar follows; there is
//    no second place to keep in sync and a bar can never float free of the grip
//    that is supposed to be holding it.
//
// 🔴 NOTHING HERE MAY HAND OUT A COORDINATE FOR A JOINT. Poses are angles only,
//    which is what makes brief §7.13 — the wrong figure reuses the same bone
//    lengths — hold by construction across all 340 rather than by discipline at
//    340 call sites.

import { FLOOR } from './canon.js';
import { ARCHETYPES } from './archetypes.js';
import { archetypeFor } from './classify.js';
import { EXERCISES } from '../exerciseBank.js';

const PLATE = 90;
const CELL_TOP = -40;

const bar = (a, b, w = 9) => ({ k: 'bar', a, b, w });
const disc = (x, y, r = PLATE) => ({ k: 'circle', x, y, r });
const quad = (pts) => ({ k: 'quad', pts });
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function pad(from, to, thickness, offset) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const P = (t, n) => ({ x: from.x + ux * t + nx * n, y: from.y + uy * t + ny * n });
  return quad([P(0, offset), P(L, offset), P(L, offset + thickness), P(0, offset + thickness)]);
}

// ── the bank's muscle names → the anchors the renderer knows ─────────────────
// 🔴 QUADS AND HAMSTRINGS SHARE THE HIP→KNEE BAND. Listing both paints two hues
//    over each other on one thigh and produces a muddy third colour exactly
//    where the posture line runs, so only the primary one survives. Same for
//    biceps/triceps and abs/erectors.
const MUSCLE_MAP = {
  Abs: 'abs', Quads: 'quads', Glutes: 'glutes', Chest: 'chest', Shoulders: 'delts',
  Traps: 'traps', Triceps: 'triceps', Lats: 'lats', Biceps: 'biceps',
  Forearms: 'forearms', Hamstrings: 'hamstrings', Back: 'lats', Calves: 'calves',
  'Rear Delts': 'delts', Abductors: 'glutes', 'Rotator Cuffs': 'delts',
  'Spinal Erectors': 'erectors', Adductors: 'quads', Psoas: 'abs',
  'Middle Back': 'lats',
};
const COLLIDES = [['quads', 'hamstrings'], ['biceps', 'triceps'], ['abs', 'erectors']];

function musclesFor(ex) {
  const primary = MUSCLE_MAP[ex.primary];
  const seen = new Set(primary ? [primary] : []);
  const secondary = [];
  for (const m of ex.muscles || []) {
    const k = MUSCLE_MAP[m];
    if (!k || seen.has(k)) continue;
    if (COLLIDES.some(pair => pair.includes(k) && pair.some(o => seen.has(o)))) continue;
    seen.add(k);
    secondary.push(k);
    if (secondary.length === 2) break;   // three hues on one body is a chart, not a figure
  }
  return { primary: primary ? [primary] : [], secondary };
}

// ── the name → what is in the hands ─────────────────────────────────────────
// Ordered, first match wins: "Barbell Ab Rollout" is a barbell before it is a
// wheel, and "Kettlebell Suitcase Deadlift" is a kettlebell before it is a bar.
const GEAR = [
  [/landmine/i, 'landmine'],
  [/kettlebell/i, 'kettlebell'],
  [/barbell|smith|olympic|\bbar\b/i, 'barbell'],
  [/dumbbell|dumbell/i, 'dumbbell'],
  [/\btrx\b|suspension/i, 'trx'],
  [/medicine ball|sandbag|tornado|swiss ball|stability ball|\bball\b/i, 'ball'],
  [/cable|pulley|pec-deck|crossover/i, 'cable'],
  [/resistance band|\bband\b|rip trainer|battling rope|\brope\b/i, 'band'],
  [/\bsled\b/i, 'sled'],
  [/machine|hack/i, 'machine'],
  [/broomstick|valslide|slide board|proprioception|roman chair|ab wheel|\bwheel\b|\bdisk\b/i, 'simple'],
  // v2.25 (Pierre, phone review: "the equipment do not show"): 145 of 340 drew
  // nothing because the movement's name implies its equipment without saying
  // it. These are the IMPLICIT rules and they must stay LAST — an explicit
  // word ("Kettlebell Sumo Deadlift") wins first, exactly as documented above.
  // A movement that is genuinely equipment-free (push-up, plank, bodyweight
  // squat, stretch) still falls through to 'none', which is correct.
  [/deadlift|rack pull|good morning|push press|power rack|box squat|front squat|back squat|power shrug|upright row|preacher curl|bent[- ]?over row|pendlay|clean|snatch|hip thrust/i, 'barbell'],
  [/pushdown|pull[- ]?down|pallof|pulley|face pull|triceps extension/i, 'cable'],
  [/hammer curl|kickback|lateral raise|front raise|rear delt|shrug|concentration curl|zottman|arnold|renegade|farmer/i, 'dumbbell'],
];
const gearFor = (name) => {
  for (const [re, k] of GEAR) if (re.test(name)) return k;
  return 'none';
};

// ── drawing the equipment at the archetype's anchor ──────────────────────────
//
// Deliberately a small vocabulary. The reference read set the test: draw the
// equipment to the level where the MOVEMENT is identifiable and no further —
// the bar, the plates, the frame's silhouette, never the knurling.
function equipment(sk, anchor, gear, view) {
  const out = [];
  const g = midpoint(sk.wristN, sk.handN);
  const gF = midpoint(sk.wristF, sk.handF);
  const centre = midpoint(g, gF);
  const across = view === 'front';

  const handHeld = () => {
    switch (gear) {
      case 'barbell':
        if (across) {
          const half = Math.max(Math.abs(g.x - centre.x), 150) + 130;
          out.push(bar({ x: centre.x - half, y: centre.y }, { x: centre.x + half, y: centre.y }, 10));
          out.push(disc(centre.x - half + PLATE * 0.4, centre.y), disc(centre.x + half - PLATE * 0.4, centre.y));
        } else {
          out.push(disc(g.x, g.y, PLATE));
        }
        break;
      case 'dumbbell':
        for (const p of [g, gF]) {
          out.push(bar({ x: p.x - 32, y: p.y }, { x: p.x + 32, y: p.y }, 7));
          out.push(disc(p.x - 28, p.y, 22), disc(p.x + 28, p.y, 22));
        }
        break;
      case 'kettlebell':
        for (const p of [g, gF]) {
          out.push(disc(p.x, p.y + 36, 34));
          out.push(bar({ x: p.x, y: p.y }, { x: p.x, y: p.y + 16 }, 8));
        }
        break;
      case 'ball':
        out.push(disc(centre.x, centre.y, 46));
        break;
      case 'cable': {
        // The stack is off to the side and a line runs to the hand: that LINE is
        // what says "cable" rather than "holding something".
        const stackY = anchor === 'cable-high' ? 90 : anchor === 'cable-mid' ? 300 : FLOOR - 90;
        out.push(quad([{ x: 380, y: stackY }, { x: 448, y: stackY }, { x: 448, y: FLOOR }, { x: 380, y: FLOOR }]));
        out.push(bar({ x: g.x, y: g.y }, { x: 384, y: stackY + 16 }, 4));
        break;
      }
      case 'band':
        out.push(bar({ x: g.x, y: g.y }, { x: 400, y: FLOOR - 40 }, 4));
        break;
      case 'trx':
        out.push(bar({ x: g.x, y: g.y }, { x: g.x - 30, y: CELL_TOP }, 4));
        out.push(bar({ x: gF.x, y: gF.y }, { x: gF.x - 30, y: CELL_TOP }, 4));
        break;
      case 'landmine':
        out.push(bar({ x: g.x, y: g.y }, { x: -400, y: FLOOR }, 9));
        out.push(disc(g.x, g.y, 34));
        break;
      case 'machine':
        out.push(disc(g.x, g.y, 24));
        out.push(bar({ x: g.x, y: g.y }, { x: g.x + 170, y: g.y - 46 }, 12));
        out.push(bar({ x: g.x + 170, y: g.y - 46 }, { x: g.x + 170, y: FLOOR - 10 }, 14));
        break;
      case 'sled':
        out.push(quad([{ x: -320, y: FLOOR - 130 }, { x: -190, y: FLOOR - 130 },
          { x: -190, y: FLOOR }, { x: -320, y: FLOOR }]));
        out.push(bar({ x: g.x, y: g.y }, { x: -190, y: FLOOR - 110 }, 5));
        break;
      case 'simple':
        out.push(disc(g.x, g.y, 26));
        break;
      default: break;
    }
  };

  switch (anchor) {
    case 'shoulders': {
      if (gear === 'dumbbell' || gear === 'kettlebell' || gear === 'none') { handHeld(); break; }
      const c = { x: sk.neckBase.x, y: sk.neckBase.y + 26 };
      out.push(bar({ x: c.x - 330, y: c.y }, { x: c.x + 330, y: c.y }, 10));
      out.push(disc(c.x - 330 + PLATE * 0.4, c.y), disc(c.x + 330 - PLATE * 0.4, c.y));
      break;
    }
    case 'hands':
    case 'cable-high':
    case 'cable-mid':
    case 'sled':
      handHeld();
      break;
    case 'feet': {
      // A pad or a strap on the shin, plus the machine's column behind it.
      const p = midpoint(sk.ankleN, sk.toeN);
      out.push(disc(p.x, p.y - 20, 26));
      out.push(bar({ x: p.x, y: p.y - 20 }, { x: p.x + 60, y: FLOOR }, 10));
      break;
    }
    case 'hips':
      if (gear !== 'none') out.push(disc(sk.pelvis.x, sk.pelvis.y - 44, 44));
      break;
    case 'bench':
      out.push(pad({ x: -230, y: 556 }, { x: 250, y: 556 }, 34, 0));
      out.push(bar({ x: 60, y: 590 }, { x: 60, y: FLOOR }, 16));
      handHeld();
      break;
    case 'bars':
      out.push(bar({ x: g.x - 190, y: g.y }, { x: g.x + 190, y: g.y }, 11));
      out.push(bar({ x: g.x - 170, y: g.y }, { x: g.x - 170, y: FLOOR }, 10));
      out.push(bar({ x: g.x + 170, y: g.y }, { x: g.x + 170, y: FLOOR }, 10));
      break;
    case 'overhead-bar': {
      const y = (sk.wristN.y + sk.wristF.y) / 2;
      out.push(bar({ x: -430, y }, { x: 430, y }, 12));
      out.push(bar({ x: -400, y }, { x: -400, y: FLOOR }, 9));
      out.push(bar({ x: 400, y }, { x: 400, y: FLOOR }, 9));
      break;
    }
    case 'machine-press':
      out.push(pad(sk.pelvis, { x: sk.neckBase.x, y: sk.neckBase.y - 40 }, 40, -86));
      out.push(pad({ x: sk.pelvis.x - 70, y: sk.pelvis.y + 46 }, { x: sk.pelvis.x + 140, y: sk.pelvis.y + 46 }, 34, 0));
      out.push(disc(g.x, g.y, 24));
      out.push(bar({ x: g.x, y: g.y }, { x: g.x + 170, y: g.y - 46 }, 12));
      out.push(bar({ x: g.x + 170, y: g.y - 46 }, { x: g.x + 170, y: FLOOR - 10 }, 14));
      break;
    case 'machine-rails': {
      // A hack squat: a back pad on two rails and a platform under the feet.
      const foot = midpoint(sk.ankleN, sk.toeN);
      out.push(pad(sk.pelvis, sk.neckBase, 44, -96));
      out.push(quad([{ x: foot.x - 150, y: FLOOR - 24 }, { x: foot.x + 150, y: FLOOR - 24 },
        { x: foot.x + 150, y: FLOOR }, { x: foot.x - 150, y: FLOOR }]));
      out.push(bar({ x: sk.neckBase.x - 150, y: 60 }, { x: sk.neckBase.x - 60, y: FLOOR }, 12));
      break;
    }
    case 'machine-sled': {
      const foot = midpoint(sk.ankleN, sk.toeN);
      const ax = sk.ankleN.x - sk.hipN.x, ay = sk.ankleN.y - sk.hipN.y;
      const L = Math.hypot(ax, ay) || 1;
      const ux = ax / L, uy = ay / L, px = -uy, py = ux;
      const P = (t, n) => ({ x: foot.x + px * t + ux * n, y: foot.y + py * t + uy * n });
      out.push(pad(sk.pelvis, sk.neckBase, 44, -96));
      out.push(quad([P(-160, 14), P(160, 14), P(160, 52), P(-160, 52)]));
      out.push(bar(P(-150, 52), P(-150, 320), 11));
      out.push(bar(P(150, 52), P(150, 320), 11));
      break;
    }
    default: break;
  }
  return out.filter(Boolean);
}

// ── assembly ─────────────────────────────────────────────────────────────────
const BY_NAME = new Map(EXERCISES.map(e => [e.name, e]));

function build(name, kind) {
  const id = archetypeFor(name);
  const a = ARCHETYPES[id];
  if (!a) return null;
  const ex = BY_NAME.get(name);
  const gear = gearFor(name);
  const variant = kind === 'fault' ? a.fault : a.correct;
  const view = variant.view || a.base.view;

  // 🔴 THE FAULT FIGURE MAY LOAD DIFFERENT MUSCLES (brief §5 — Pierre: "if it's
  //    a different posture, it's probably a different muscle"). A rounded
  //    deadlift tires the erectors and forearms, not the glutes it was meant to
  //    train — washing the bank's muscles over the fault half is a lie. An
  //    archetype OPTS IN with `faultMuscles`; without it both halves keep the
  //    bank's list, because a wrong claim is worse than a shared one. This
  //    reframes the pair: this-trains-X versus that-loads-Y, not right-vs-wrong.
  const muscles = (kind === 'fault' && a.faultMuscles)
    ? a.faultMuscles
    : (ex ? musclesFor(ex) : { primary: [], secondary: [] });

  return {
    ...a.base,
    ...variant,
    muscles,
    guide: a.guide,
    fault: kind === 'fault' ? a.faultJoint : undefined,
    equip: (sk) => equipment(sk, a.anchor, gear, view),
  };
}

// The view from above for the bench press — the one fault a profile camera
// physically cannot show, because flare is abduction. HANDOFF-figures §11.
const BENCH_ABOVE = {
  view: 'front', root: { x: 210, y: 415 }, spine: [-90, 2, -2], head: 0,
  fs: { forearm: 0.45, hand: 0.4, thigh: 0.6, shin: 0.55, foot: 0.4 },
  // 🔴 In a quarter-turned front view the mirror is (180 − a), not (−a).
  legs: { near: [50, 58, 60], far: [130, -58, -60] },
  arms: { near: [180, 12, 0], far: [0, -12, 0] },
  muscles: { primary: ['chest'], secondary: ['delts'] },
  guide: { joints: ['shoulderN', 'elbowN', 'wristN'], mirror: true },
  fault: { joints: ['shoulderN', 'shoulderF'], r: 38 },
  equip: (sk) => {
    const g = midpoint(sk.wristN, sk.handN);
    const gF = midpoint(sk.wristF, sk.handF);
    const mid = (g.y + gF.y) / 2;
    const span = Math.abs(g.y - gF.y) / 2 + 95;
    return [
      pad({ x: -270, y: mid - 62 }, { x: 230, y: mid - 62 }, 124, 0),
      bar({ x: g.x, y: mid - span }, { x: g.x, y: mid + span }, 10),
      disc(g.x, mid - span + 30, 68),
      disc(g.x, mid + span - 30, 68),
    ];
  },
};

// The tucked half of the view from above. BENCH_ABOVE is the flared one; a pair
// that rotates needs both, because the drag turns each half of the pair toward
// the SAME camera and a correct figure must stay correct all the way round.
const BENCH_ABOVE_OK = {
  ...BENCH_ABOVE,
  arms: { near: [145, 45, 0], far: [35, -45, 0] },
  fault: undefined,
};

// 🔴 WHICH PATTERNS ROTATE, AND WHY IT IS NOT ALL OF THEM. A second camera is
//    two more authored poses that have to be judged by eye, and it only earns
//    its place where the fault is OUT OF THE PAIR'S PLANE. The bench press is
//    the case that forced the feature: elbow flare is abduction and a profile
//    camera looks straight down it. Patterns whose fault is fully visible in one
//    view gain nothing from turning, and a drag handle that does nothing is
//    worse than no drag handle.
const ROTATES = {
  'bench-press': { correct: () => BENCH_ABOVE_OK, fault: () => BENCH_ABOVE },
};

// 🔴 `figureFor(name)` IS THE ONLY WAY A SCREEN GETS A FIGURE. It returns null
//    for a name no archetype covers, so a frozen program naming a dropped
//    exercise degrades to the v2.21 sheet instead of crashing.
export function figureFor(name) {
  const id = archetypeFor(name);
  const a = ARCHETYPES[id];
  if (!a) return null;
  const pair = { correct: build(name, 'correct'), fault: build(name, 'fault'), archetype: id };
  const gear = gearFor(name);

  // A rotatable pattern hangs its second camera off each half as `alt`; the
  // renderer tweens between them and the sheet grows a drag handle. When a
  // pattern rotates, the standing third figure is redundant — the same view is
  // now a finger-drag away — so it is dropped rather than shown twice.
  // Round 4 (v2.29): the JUDGED patterns turn continuously — Pierre approved
  // curl, hinge and the bench on the prototype sheet, frame by frame. The
  // gate is deliberate and narrow: side-authored pose (no baked `fs`), a
  // gear the 3D equipment vocabulary can draw (barbell, or nothing), and a
  // pattern a human has judged through the turn. Everything else keeps its
  // authored view until its own judging round — a control that renders an
  // unjudged angle is worse than no control.
  const SPINS = new Set(['curl', 'hinge', 'bench-press']);
  const fsBaked = !!(a.base.fs || a.correct.fs || a.fault.fs);
  if (SPINS.has(id) && !fsBaked && (gear === 'barbell' || gear === 'none')) {
    pair.spin = { gear, anchor: a.anchor };
    pair.rotatable = true;
    return pair;   // spin supersedes the two-camera tween AND the extra view
  }

  const rot = ROTATES[id];
  if (rot) {
    pair.correct.alt = rot.correct();
    pair.fault.alt = rot.fault();
    pair.rotatable = true;
  } else if (a.extraId === 'bench-above') {
    pair.extra = { pose: BENCH_ABOVE, labelKey: 'figureFromAbove', caption: 'fault' };
  }
  return pair;
}

export const hasFigureFor = (name) => !!ARCHETYPES[archetypeFor(name)];

// Every movement in the bank. Used by the preview harness and the sanity gate,
// never by a screen — a screen asks for one movement at a time.
export const ALL_FIGURES = () => {
  const out = {};
  for (const e of EXERCISES) {
    const f = figureFor(e.name);
    if (f) out[e.name] = f;
  }
  return out;
};

// One representative movement per pattern, for the preview sheet: 340 figures
// on one page cannot be judged, and 44 patterns is the thing being judged.
export const PATTERN_SAMPLES = () => {
  const seen = new Set(), out = {};
  for (const e of EXERCISES) {
    const id = archetypeFor(e.name);
    if (!id || seen.has(id)) continue;
    const f = figureFor(e.name);
    if (!f) continue;
    seen.add(id);
    out[e.name] = f;
  }
  return out;
};

// Kept for the pilot preview and the app's own smoke checks.
export const FIGURES = PATTERN_SAMPLES();
