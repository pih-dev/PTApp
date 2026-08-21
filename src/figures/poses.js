// ─── The pilot six (B2 step 1) ───────────────────────────────────────────────
//
// One movement per bucket — a squat, a hinge, a horizontal press, a vertical
// pull, a single-joint arm movement, a machine movement — as the handoff's step
// 1 specifies. These six exist to be JUDGED: if they do not look like one
// library and like this app, the route changes and nothing is scaled.
//
// A pose is ANGLES ONLY (see canon.js). Every number below is degrees:
//   spine  [lumbar, thorax, neck]  — measured from straight up, cumulative,
//                                    positive = leaning forward (+x)
//   legs   [thigh, shin, foot]     — from straight down, cumulative, positive = +x
//   arms   [upper, fore, hand]     — same convention as legs
// A side-view figure faces +x. In a front view "near" is the figure's right.
//
// 🔴 THE MOMENT, NOT THE POSE (brief §7.13). Each pair is drawn at the instant
//    in the lift where the error actually lives — the drive out of the hole,
//    the bar breaking the floor, the bottom of the press. A figure at lockout
//    cannot show the fault it is there to teach.
//
// 🔴 EQUIPMENT IS A FUNCTION OF THE SKELETON, not a set of fixed coordinates.
//    The bar is drawn where the HANDS are. Change a pose and the bar follows;
//    there is no second place to keep in sync, and a bar can never float free
//    of the grip that is supposed to be holding it.
//
// 🔴 AND THE FIGURE MUST NOT GO SHORT-LEGGED. Foreshortening a femur in a front
//    view shortens the leg against a torso that did not change — which is the
//    infant ratio §7.13 was written against, arriving through the back door. So
//    a front-view pose is drawn at the shallowest depth that still shows the
//    fault, not at the deepest depth the lift reaches. (v1 of this file drew the
//    squat at fs.thigh 0.53 and the figure read as a toddler.)

import { FLOOR } from './canon.js';

// Olympic plate: 450mm against a 1750mm figure over 750 units → r ≈ 90.
const PLATE = 90;
const CURL_PLATE = 60;   // a 10–15kg plate — what a curl actually carries

// ── shared equipment builders ────────────────────────────────────────────────
const bar = (a, b, w = 9) => ({ k: 'bar', a, b, w });
const disc = (x, y, r = PLATE) => ({ k: 'circle', x, y, r });
const quad = (pts) => ({ k: 'quad', pts });
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// A barbell seen end-on (a side view): the plate IS the barbell from here.
const barbellEndOn = (p, r = PLATE) => [disc(p.x, p.y, r)];

// A barbell seen across (a front view): the shaft plus a plate at each end.
const barbellAcross = (p, half, r = PLATE) => [
  bar({ x: p.x - half, y: p.y }, { x: p.x + half, y: p.y }, 10),
  disc(p.x - half + r * 0.4, p.y, r),
  disc(p.x + half - r * 0.4, p.y, r),
];

// A slab of upholstery — a bench pad, a seat back — laid along a direction.
// Machines are mostly pads and rails, so this is most of the equipment
// vocabulary the library will ever need.
function pad(from, to, thickness, offset) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const nx = -uy, ny = ux;
  const P = (t, n) => ({ x: from.x + ux * t + nx * n, y: from.y + uy * t + ny * n });
  return quad([P(0, offset), P(L, offset), P(L, offset + thickness), P(0, offset + thickness)]);
}

// ── 1. BACK SQUAT — front view, the drive out of the bottom ──────────────────
//
// FRONT view on purpose: the fault this movement is famous for is the knee
// caving inward (valgus), and valgus happens in the frontal plane — a profile
// figure literally cannot show it. Drawn just above parallel, which is both
// where the knee actually caves on the way up and shallow enough to keep the
// femur's foreshortening off the leg-length ratio.
const squatBase = {
  view: 'front',
  root: { x: 0, y: 455 },
  ground: { joint: 'ankleN', y: FLOOR - 43 },
  spine: [0, 0, 0],
  head: 0,
  fs: { thigh: 0.75, shin: 0.95, foot: 0.45, upperArm: 0.83, forearm: 0.77, hand: 0.7 },
  arms: { near: [42, 135, 6], far: [-42, -135, -6] },
  muscles: ['quads', 'glutes'],
  equip: (sk) => barbellAcross({ x: sk.neckBase.x, y: sk.neckBase.y + 26 }, 330, PLATE),
};

// ── 2. DEADLIFT — side view, the instant the bar breaks the floor ────────────
//
// The spine chain is the whole point here: neutral is a gently DECREASING lean
// going up the back (concave, the arch held); rounding is an INCREASING lean
// (the C-shape). Same four points, same bone lengths — different numbers. A
// hinged figure could not tell those two apart, which is §7.9's argument in one
// movement.
//
// 🔴 DRAWN AT THE BAR PASSING THE KNEE, NOT AT THE FLOOR — and that is the
//    §7.13 "choose the moment" rule doing real work. At the floor the torso and
//    the femur are both near-horizontal, the figure folds into a wedge, and a
//    reader cannot tell a hinge from a crouch (the pilot's first attempt did
//    exactly this). Past the knee the torso is ~51° and the femur ~25°, the
//    hinge is unmistakable — and it is also the point in the pull where a back
//    actually rounds under load.
const deadliftBase = {
  view: 'side',
  root: { x: -171, y: 430 },
  ground: { joint: 'ankleN', y: FLOOR - 43 },
  legs: { near: [25, -10, 75], far: [22, -7, 75] },
  muscles: ['erectors', 'glutes', 'hamstrings'],
  equip: (sk) => barbellEndOn(midpoint(sk.wristN, sk.handN)),
};

// ── 3. CHEST PRESS MACHINE — side view, the bottom of the press ──────────────
//
// 🔴 THIS IS THE BUCKET'S SUBSTITUTE, AND THE SWAP IS A FINDING, NOT A DODGE.
//    The obvious pick was the flat barbell bench press. Its defining fault is
//    elbow FLARE, which is abduction — it happens in the plane a profile camera
//    is looking down. Drawn from the side, a 45° tuck and a 90° flare project to
//    nearly the same picture, so the pair would teach nothing; drawn from above
//    they are unmistakable, but the legs then run away from the camera and the
//    figure stops belonging to the set (both were tried — see HANDOFF-figures
//    §11). The honest fix is per-pose out-of-plane foreshortening, which would
//    differ between the two figures of one pair and therefore breaks §7.13. So
//    the bench press waits for that decision, and the horizontal-press bucket is
//    carried by a machine press, whose fault — the elbow riding ABOVE the
//    shoulder line — is sagittal and reads perfectly in profile.
const chestPressBase = {
  view: 'side',
  root: { x: 0, y: 500 },
  ground: { joint: 'ankleN', y: FLOOR - 43 },
  spine: [-8, 2, 3],
  head: 4,
  legs: { near: [78, -86, 96], far: [74, -82, 96] },
  muscles: ['chest', 'delts', 'triceps'],
  equip: (sk) => {
    const h = midpoint(sk.wristN, sk.handN);
    return [
      pad(sk.pelvis, { x: sk.neckBase.x, y: sk.neckBase.y - 40 }, 40, -86),
      pad({ x: sk.pelvis.x - 70, y: sk.pelvis.y + 46 }, { x: sk.pelvis.x + 140, y: sk.pelvis.y + 46 }, 34, 0),
      // The handle and the arm it swings on: enough machine to read "machine".
      disc(h.x, h.y, 24),
      bar({ x: h.x, y: h.y }, { x: h.x + 170, y: h.y - 46 }, 12),
      bar({ x: h.x + 170, y: h.y - 46 }, { x: h.x + 170, y: FLOOR - 10 }, 14),
    ];
  },
};

// ── 4. PULL-UP — front view, the top of the rep ──────────────────────────────
//
// 🔴 GROUNDED TO THE BAR, not to the floor. For a pull-up the fixed object in
//    the world is the bar; the body hangs from it. So the pose anchors the
//    WRIST, and the faulty version — which hangs back and lower because the
//    elbows have flared and the hips have swung — arrives at the same bar by
//    construction instead of by hand-tuned coordinates.
const pullupBase = {
  view: 'front',
  root: { x: 0, y: 500 },
  ground: { joint: 'wristN', x: 118, y: 62 },
  legs: { near: [-30, -70, 100], far: [-26, -74, 100] },
  muscles: ['lats', 'biceps', 'forearms'],
  equip: (sk) => {
    const y = (sk.wristN.y + sk.wristF.y) / 2;
    return [
      bar({ x: -430, y }, { x: 430, y }, 12),
      // The uprights: enough frame to read "bar", and no more (the reference
      // read — equipment to the level where the movement is identifiable).
      bar({ x: -400, y }, { x: -400, y: FLOOR }, 9),
      bar({ x: 400, y }, { x: 400, y: FLOOR }, 9),
    ];
  },
};

// ── 5. BARBELL CURL — side view, mid-curl ────────────────────────────────────
//
// The single-joint entry, and the one that shows the OTHER lumbar failure:
// the deadlift ROUNDS the back, the swung curl hyper-EXTENDS it. Two opposite
// curvatures of the same four-point chain — the clearest evidence in the pilot
// that the spine is being drawn and not assembled.
const curlBase = {
  view: 'side',
  root: { x: 0, y: 375 },
  ground: { joint: 'ankleN', y: FLOOR - 43 },
  muscles: ['biceps', 'forearms'],
  equip: (sk) => barbellEndOn(midpoint(sk.wristN, sk.handN), CURL_PLATE),
};

// ── 6. LEG PRESS — side view, near lockout ───────────────────────────────────
//
// The machine entry. The sled is a back pad, a platform and two rails: the
// movement is unreadable without them, and how much to draw is exactly the test
// the reference read set — the frame's silhouette, not its branding.
const legPressBase = {
  view: 'side',
  root: { x: 0, y: 560 },
  spine: [-50, 4, -6],
  head: 8,
  arms: { near: [-38, 62, 10], far: [-34, 58, 10] },
  muscles: ['quads', 'glutes'],
  equip: (sk) => {
    const foot = midpoint(sk.ankleN, sk.toeN);
    // The platform is perpendicular to the press axis, and the press axis is
    // the line the foot travels along — hip to ankle. Derived, so a change to
    // the recline angle carries the whole machine with it.
    const ax = sk.ankleN.x - sk.hipN.x, ay = sk.ankleN.y - sk.hipN.y;
    const L = Math.hypot(ax, ay) || 1;
    const ux = ax / L, uy = ay / L;
    const px = -uy, py = ux;
    const P = (t, n) => ({ x: foot.x + px * t + ux * n, y: foot.y + py * t + uy * n });
    return [
      pad(sk.pelvis, sk.neckBase, 44, -96),
      quad([P(-160, 14), P(160, 14), P(160, 52), P(-160, 52)]),
      bar(P(-150, 52), P(-150, 320), 11),
      bar(P(150, 52), P(150, 320), 11),
    ];
  },
};

// ── The library ──────────────────────────────────────────────────────────────
//
// Keyed by the EXACT bank name (src/exerciseBank.js). A key that does not match
// a bank entry is a figure nobody can ever reach, so sanity-figures.mjs checks
// every key against the bank.
export const FIGURES = {
  'Back Squat': {
    correct: {
      ...squatBase,
      // The knee tracks out over the foot.
      legs: { near: [22, -27, 120], far: [-22, 27, -120] },
    },
    fault: {
      ...squatBase,
      // Same femur, same tibia — the knee has simply travelled inside the foot.
      legs: { near: [-2, 21, 120], far: [2, -21, -120] },
      fault: { joints: ['kneeN', 'kneeF'], r: 40 },
    },
  },

  'Deadlift': {
    correct: {
      ...deadliftBase,
      spine: [55, -4, -4],
      head: -6,
      arms: { near: [2, 1, 6], far: [0, 3, 6] },
    },
    fault: {
      ...deadliftBase,
      spine: [46, 10, 10],
      head: -12,
      // The rounded back drops the shoulder, so the arm bends a little to keep
      // the hand on a bar that has not moved. That is what actually happens.
      arms: { near: [0, 4, 8], far: [-2, 6, 8] },
      fault: { joints: ['lumbar'], r: 48, offset: { x: -30, y: 18 } },
    },
  },

  'Chest Press Machine': {
    correct: {
      ...chestPressBase,
      // Elbow behind and level with the shoulder: the joint is inside its safe
      // arc and the chest, not the capsule, is taking the load.
      arms: { near: [-81, 161, -10], far: [-77, 157, -10] },
    },
    fault: {
      ...chestPressBase,
      // Elbow riding above the shoulder line at the bottom.
      arms: { near: [-110, 180, -12], far: [-106, 176, -12] },
      fault: { joints: ['shoulderN'], r: 40 },
    },
  },

  'Pull-Up': {
    correct: {
      ...pullupBase,
      spine: [-1, 1, -1],
      head: 0,
      // The top of the rep: elbows bent and driven down, chest toward the bar.
      arms: { near: [152, 34, 4], far: [-152, -34, -4] },
    },
    fault: {
      ...pullupBase,
      // The heave: the elbows flare wide, the hips swing forward, the ribs open
      // and the chin cranes. The hand still finishes on the bar because the pose
      // is anchored there.
      spine: [-14, 6, -10],
      head: -14,
      legs: { near: [-48, -56, 100], far: [-44, -60, 100] },
      arms: { near: [136, 46, 8], far: [-136, -46, -8] },
      fault: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    },
  },

  'Barbell Curl': {
    correct: {
      ...curlBase,
      spine: [2, -2, 2],
      head: -4,
      legs: { near: [2, -3, 88], far: [-3, 4, 88] },
      arms: { near: [5, 115, 12], far: [2, 118, 12] },
    },
    fault: {
      ...curlBase,
      // The heave: the lifter leans back and drives the bar with the lower back
      // while the elbows travel forward off the ribs.
      spine: [-18, 6, 8],
      head: 12,
      legs: { near: [5, -8, 88], far: [0, -3, 88] },
      arms: { near: [28, 98, 14], far: [25, 101, 14] },
      fault: { joints: ['lumbar'], r: 46, offset: { x: -26, y: 6 } },
    },
  },

  'Leg Press': {
    correct: {
      ...legPressBase,
      // Stopping short of lockout: the knee still carries a soft bend, which is
      // the whole coaching cue for this machine.
      legs: { near: [133, -15, 88], far: [129, -12, 88] },
    },
    fault: {
      ...legPressBase,
      // Snapped straight and pushed past straight — the joint, not the muscle,
      // is now holding the sled.
      legs: { near: [136, 7, 88], far: [133, 9, 88] },
      fault: { joints: ['kneeN'], r: 40 },
    },
  },
};

export const FIGURE_NAMES = Object.keys(FIGURES);
