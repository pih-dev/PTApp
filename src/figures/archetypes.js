// ─── The 42 archetypes ───────────────────────────────────────────────────────
//
// One entry per movement PATTERN. `classify.js` maps all 340 bank movements
// onto these; `poses.js` assembles a figure from an archetype plus the
// movement's own muscles and its own equipment.
//
// A pose is ANGLES ONLY (canon.js). Degrees, and the conventions never change:
//   spine [lumbar, thorax, neck] — from straight UP, cumulative, + leans toward +x
//   legs  [thigh, shin, foot]    — from straight DOWN, cumulative, + toward +x
//   arms  [upper, fore, hand]    — same as legs
// A side-view figure faces +x. In a front view "near" is the figure's right, and
// the mirror is (−a) upright / (180 − a) when the body is quarter-turned.
//
// 🔴 EVERY ARCHETYPE SHIPS A PAIR. The fault figure reuses the same bone lengths
//    — a pose can only supply angles, so that holds by construction — and marks
//    the joint that takes the load. An archetype with no fault teaches nothing
//    and `sanity-figures.mjs` fails the build on it.
//
// 🔴 MOST FAULTS ARE LUMBAR, AND THAT IS NOT LAZINESS. In a real gym the lower
//    back is where load ends up when a pattern breaks down — a sagging plank, a
//    heaved curl, a leaned-back press and a rounded row are all the same
//    failure wearing different equipment. The figures say so because it is true.

import { FLOOR } from './canon.js';

const G = { joint: 'ankleN', y: FLOOR - 43 };   // feet on the floor

// ── shared bodies ────────────────────────────────────────────────────────────
// A standing figure, upright, feet under the hips. Every standing archetype
// starts here and changes only what its movement changes.
const STAND = {
  view: 'side', root: { x: 0, y: 375 }, ground: G,
  spine: [2, -2, 2], head: -2,
  legs: { near: [2, -3, 88], far: [-3, 4, 88] },
};
const STAND_FRONT = {
  view: 'front', root: { x: 0, y: 375 }, ground: G,
  spine: [0, 0, 0], head: 0,
  legs: { near: [2, -2, 118], far: [-2, 2, -118] },
};
// Lying on the back on the floor: the trunk runs along −x, head at the far end,
// the centre line one torso-depth above the floor. Knees up, feet flat.
const SUPINE = {
  view: 'side', root: { x: 150, y: 700 },
  spine: [-90, 2, -2], head: 6,
  legs: { near: [127, -138, 100], far: [124, -134, 100] },
};
// Face down on the elbows or the hands, head at −x. The shoulders sit HIGHER
// than the heels, because the arms are propping the front end up — a plank
// drawn dead level reads as a person lying on the floor.
const PRONE = {
  view: 'side', root: { x: 170, y: 640 },
  spine: [-71, 2, -2], head: 4,
  legs: { near: [79, -2, -39], far: [76, 1, -39] },
};
// On all fours, head at −x: trunk level, the supporting knee and hand down.
// Grounded on the FAR knee, because the near limbs are the ones that move.
const QUAD = {
  view: 'side', root: { x: 140, y: 560 }, ground: { joint: 'kneeF', y: FLOOR - 16 },
  spine: [-86, 2, -2], head: 4,
  legs: { near: [100, 0, 80], far: [4, -96, 88] },
  arms: { near: [-100, 0, -6], far: [0, 4, 6] },
};
// Seated on a bench or a machine: hips low, knees forward, feet down.
const SEATED = {
  view: 'side', root: { x: 0, y: 500 }, ground: G,
  spine: [-6, 2, 3], head: 4,
  legs: { near: [78, -86, 96], far: [74, -82, 96] },
};
// Hinged at the hip, torso ~50° forward — rows, hinges, back extensions.
const HINGED = {
  view: 'side', root: { x: -171, y: 430 }, ground: G,
  spine: [55, -4, -4], head: -6,
  legs: { near: [25, -10, 75], far: [22, -7, 75] },
};

const arms = (near, far) => ({ near, far });
const mirrorArms = (a) => ({ near: a, far: a.map((v, i) => (i === 2 ? -v : -v)) });

// A front-view figure's far side is the negation of the near side.
const front = (a) => ({ near: a, far: a.map(v => -v) });

// ── the library ──────────────────────────────────────────────────────────────
// Each entry: { correct, fault, guide, faultJoint, anchor, view }
//   anchor — where this pattern's equipment is held: 'hands' | 'shoulders'
//            | 'feet' | 'none'. poses.js draws the right object there.
export const ARCHETYPES = {

  // ══ LOWER ══════════════════════════════════════════════════════════════════

  squat: {
    base: {
      view: 'front', root: { x: 0, y: 455 }, ground: G, spine: [0, 0, 0], head: 0,
      fs: { thigh: 0.75, shin: 0.95, foot: 0.45, upperArm: 0.83, forearm: 0.77, hand: 0.7 },
      arms: front([42, 135, 6]),
    },
    correct: { legs: front([22, -27, 120]) },
    fault: { legs: front([-2, 21, 120]) },
    guide: { joints: ['hipN', 'kneeN', 'ankleN'], mirror: true },
    faultJoint: { joints: ['kneeN', 'kneeF'], r: 40 },
    anchor: 'shoulders',
  },

  'squat-machine': {
    // Back against a pad on rails: the knee cannot cave the way a free squat's
    // does, so the fault this one teaches is the pelvis tucking at depth.
    // Back against a rail-mounted pad, torso near-upright, knees deep.
    base: { view: 'side', root: { x: -20, y: 520 }, ground: G, spine: [-14, 3, 3], head: 4, arms: arms([-24, 34, 8], [-20, 30, 8]) },
    correct: { legs: { near: [62, -72, 100], far: [58, -68, 100] } },
    fault: { root: { x: -20, y: 574 }, spine: [-2, 20, 6], legs: { near: [76, -86, 100], far: [72, -82, 100] } },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -26, y: 10 } },
    anchor: 'machine-rails',
  },

  lunge: {
    base: { ...STAND, root: { x: -30, y: 470 }, spine: [6, -4, 2], head: -4 },
    // Front leg forward and bent, back leg trailing with the knee low.
    correct: {
      legs: { near: [34, -36, 92], far: [-40, 74, 44] },
      arms: arms([4, 2, 6], [2, 4, 6]),
    },
    fault: {
      // The front knee has run forward past the foot and the heel has lifted.
      legs: { near: [50, -58, 74], far: [-40, 74, 44] },
      arms: arms([6, 2, 6], [4, 4, 6]),
    },
    guide: { joints: ['hipN', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['kneeN'], r: 40 },
    anchor: 'hands',
  },

  hinge: {
    base: { ...HINGED },
    correct: { spine: [55, -4, -4], head: -6, arms: arms([2, 1, 6], [0, 3, 6]) },
    fault: { spine: [46, 10, 10], head: -12, arms: arms([0, 4, 8], [-2, 6, 8]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 48, offset: { x: -30, y: 18 } },
    // Pierre's own case (brief §5): "when I'm doing deadlift, if I don't have
    // the right posture, my arms would tire" — the round back hangs the load on
    // the erectors and the grip, not the glutes the movement was meant to train.
    faultMuscles: { primary: ['erectors'], secondary: ['forearms'] },
    anchor: 'hands',
  },

  'hip-bridge': {
    // Supine, hips driven up: shoulders and feet down, a straight line between.
    base: {
      view: 'side', root: { x: 130, y: 590 },
      arms: arms([-95, 4, 6], [-98, 6, 6]),
      legs: { near: [99, -107, 98], far: [96, -104, 98] },
    },
    // Shoulders down, feet down, hips driven up into a line between the two.
    correct: { spine: [-115, 3, -3], head: 6 },
    // Driven past the top: the last inch comes from arching the lower back.
    fault: { root: { x: 130, y: 556 }, spine: [-126, -10, 6], head: 14 },
    guide: { joints: ['kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -6, y: 34 } },
    anchor: 'hips',
  },

  'knee-extension': {
    base: { ...SEATED, arms: arms([-16, 40, 8], [-12, 36, 8]) },
    correct: { legs: { near: [64, -50, 92], far: [60, -46, 92] } },
    fault: { legs: { near: [60, -66, 92], far: [56, -62, 92] } },
    guide: { joints: ['hipN', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['kneeN'], r: 38 },
    anchor: 'feet',
  },

  'knee-flexion': {
    // Face down, heel curled toward the glute.
    // Face down on a pad, heel curling toward the glute.
    base: { view: 'side', root: { x: 150, y: 700 }, spine: [-90, 2, -2], head: 4, arms: arms([-100, 8, 6], [-103, 10, 6]) },
    correct: { legs: { near: [92, -152, 88], far: [89, -149, 88] } },
    // The hips have lifted off the pad to help the heel come up.
    fault: { root: { x: 150, y: 666 }, spine: [-78, -12, 4], legs: { near: [86, -168, 88], far: [83, -165, 88] } },
    guide: { joints: ['thorax', 'pelvis', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['lumbar'], r: 40, offset: { x: 0, y: -26 } },
    anchor: 'feet',
  },

  'calf-raise': {
    base: { ...STAND, arms: arms([4, 2, 6], [2, 4, 6]) },
    // Up on the toes: the whole body rises, the ankle is fully extended.
    correct: { root: { x: 0, y: 340 }, ground: { joint: 'toeN', y: FLOOR }, legs: { near: [2, -2, 40], far: [-2, 2, 40] } },
    // A short, bounced rep: the heel barely leaves the floor and the knee bends.
    fault: { root: { x: 0, y: 368 }, ground: { joint: 'toeN', y: FLOOR }, legs: { near: [4, -12, 72], far: [0, -8, 72] } },
    guide: { joints: ['kneeN', 'ankleN', 'toeN'] },
    faultJoint: { joints: ['ankleN'], r: 34 },
    anchor: 'hands',
  },

  'hip-abduction': {
    base: { ...STAND_FRONT, arms: front([8, 6, 4]) },
    correct: { legs: { near: [28, -6, 118], far: [-3, 3, -118] } },
    // The trunk has leaned away to throw the leg out instead of the hip lifting it.
    fault: { spine: [-16, 4, 4], legs: { near: [40, -8, 118], far: [-4, 4, -118] } },
    guide: { joints: ['neckBase', 'pelvis', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'feet',
  },

  'hip-adduction': {
    base: { ...STAND_FRONT, arms: front([8, 6, 4]) },
    correct: { legs: { near: [-16, 6, 118], far: [-3, 3, -118] } },
    fault: { spine: [14, -4, -4], legs: { near: [-30, 10, 118], far: [-4, 4, -118] } },
    guide: { joints: ['neckBase', 'pelvis', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'feet',
  },

  'back-extension': {
    // Face down over a pad, rising to horizontal — no further.
    base: { view: 'side', root: { x: -60, y: 500 }, arms: arms([-150, 20, 6], [-146, 24, 6]), legs: { near: [12, -6, 84], far: [9, -3, 84] }, ground: G },
    correct: { spine: [64, -6, -6], head: -8 },
    // Driven past straight into hyperextension at the top.
    fault: { spine: [96, -10, -8], head: -18 },
    guide: { joints: ['kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -20, y: 6 } },
    anchor: 'hands',
  },

  'hip-extension': {
    // Standing, driving one leg back against a cable or a machine pad.
    base: { ...STAND, root: { x: -20, y: 400 }, arms: arms([10, 20, 6], [8, 22, 6]) },
    correct: { spine: [18, -6, -6], head: -6, legs: { near: [-34, 12, 84], far: [8, -6, 88] } },
    // The leg goes higher only because the lower back has arched to send it.
    fault: { spine: [34, -14, -10], head: -12, legs: { near: [-52, 16, 84], far: [10, -8, 88] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis', 'kneeN'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -24, y: 6 } },
    // The extra height came from the arch, so the lower back is doing the
    // lifting the glutes were supposed to do.
    faultMuscles: { primary: ['erectors'], secondary: ['hamstrings'] },
    anchor: 'feet',
  },

  'leg-press': {
    base: {
      view: 'side', root: { x: 0, y: 560 }, spine: [-50, 4, -6], head: 8,
      arms: arms([-38, 62, 10], [-34, 58, 10]),
    },
    correct: { legs: { near: [133, -15, 88], far: [129, -12, 88] } },
    fault: { legs: { near: [136, 7, 88], far: [133, 9, 88] } },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'lumbar', 'thorax'] },
    faultJoint: { joints: ['kneeN'], r: 40 },
    anchor: 'machine-sled',
  },

  // ══ PUSH ═══════════════════════════════════════════════════════════════════

  'bench-press': {
    base: {
      view: 'side', root: { x: 140, y: 516 }, head: 8, fs: { upperArm: 0.72 },
      arms: arms([66, 133, 0], [62, 137, 0]),
    },
    correct: { spine: [-86, 10, -22], legs: { near: [76, -84, 98], far: [72, -80, 98] } },
    fault: { root: { x: 140, y: 470 }, spine: [-78, 20, -30], legs: { near: [84, -92, 98], far: [80, -88, 98] } },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: 10, y: 40 } },
    // Hips off the pad: the "extra strength" is a lumbar arch and leg drive,
    // and the chest's range is what got cut.
    faultMuscles: { primary: ['erectors'], secondary: ['chest'] },
    anchor: 'bench',
    // The second camera: elbow flare is abduction and a profile view cannot show
    // it. See HANDOFF-figures §11 and poses.js.
    extraId: 'bench-above',
  },

  'chest-press': {
    base: { ...SEATED, spine: [-8, 2, 3], head: 4 },
    correct: { arms: arms([-81, 161, -10], [-77, 157, -10]) },
    fault: { arms: arms([-110, 180, -12], [-106, 176, -12]) },
    guide: { joints: ['lumbar', 'thorax', 'shoulderN', 'elbowN', 'wristN'] },
    faultJoint: { joints: ['shoulderN'], r: 40 },
    anchor: 'machine-press',
  },

  'push-up': {
    base: { ...PRONE, root: { x: 170, y: 600 }, ground: { joint: 'toeN', y: FLOOR } },
    correct: { spine: [-71, 2, -2], head: 4, arms: arms([-16, -58, -10], [-19, -55, -10]) },
    // The hips have dropped: the body is a sag, not a plank.
    fault: { root: { x: 170, y: 648 }, spine: [-58, -16, -6], head: 10, arms: arms([-16, -58, -10], [-19, -55, -10]) },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: 0, y: 30 } },
    // A sagging push-up hangs on the lumbar spine — the core that should carry
    // the line has let go, and the chest is no longer doing the pressing work.
    faultMuscles: { primary: ['erectors'], secondary: ['chest'] },
    anchor: 'none',
  },

  dip: {
    base: { view: 'side', root: { x: 0, y: 430 }, spine: [8, -4, -2], head: -4, legs: { near: [-28, -46, 92], far: [-24, -50, 92] } },
    correct: { arms: arms([174, 34, 4], [170, 38, 4]) },
    // Dropped too deep — the shoulder is now below the elbow.
    fault: { root: { x: 0, y: 490 }, arms: arms([166, 56, 6], [162, 60, 6]) },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'] },
    faultJoint: { joints: ['shoulderN'], r: 38 },
    anchor: 'bars',
  },

  fly: {
    base: { ...STAND_FRONT, spine: [0, 0, 0] },
    correct: { arms: front([104, 14, 6]) },
    // Opened too far with straight arms: the whole stretch is on the joint.
    fault: { arms: front([120, 2, 4]) },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'], mirror: true },
    faultJoint: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    anchor: 'hands',
  },

  'overhead-press': {
    base: { ...STAND },
    correct: { spine: [2, -2, 2], head: -2, arms: arms([172, 10, 4], [168, 12, 4]) },
    // Leaned back under the bar — the press comes from the lower back.
    fault: { spine: [-22, 6, 8], head: 10, arms: arms([158, 16, 6], [154, 18, 6]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -26, y: 6 } },
    // Pierre's other case (brief §5): leaned back, the press is an incline —
    // "I could be moving more of my chest muscles rather than my shoulders",
    // and the arch hangs the rest on the lower back.
    faultMuscles: { primary: ['chest'], secondary: ['erectors'] },
    anchor: 'hands',
  },

  'triceps-pushdown': {
    base: { ...STAND, spine: [8, -4, -2], head: -4 },
    correct: { arms: arms([6, 8, 8], [4, 10, 8]) },
    // The elbows have travelled forward and the body leans into the weight.
    fault: { spine: [24, -8, -6], arms: arms([32, -20, 10], [30, -18, 10]) },
    guide: { joints: ['shoulderN', 'elbowN', 'wristN'] },
    faultJoint: { joints: ['elbowN'], r: 34 },
    // Elbows forward + body leaning on the cable: the weight moves from
    // bodyweight and shoulders, and the triceps' isolation is gone.
    faultMuscles: { primary: ['delts'], secondary: ['triceps'] },
    anchor: 'cable-high',
  },

  'triceps-overhead': {
    base: { ...STAND },
    correct: { spine: [2, -2, 2], arms: arms([176, -52, -8], [172, -48, -8]) },
    // The ribs flare and the back arches to get the elbow overhead.
    fault: { spine: [-20, 6, 8], head: 8, arms: arms([164, -70, -10], [160, -66, -10]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -26, y: 6 } },
    // The arch that gets the elbow overhead is held by the lower back, not the
    // triceps the movement is for.
    faultMuscles: { primary: ['erectors'], secondary: ['triceps'] },
    anchor: 'hands',
  },

  shrug: {
    base: { ...STAND_FRONT },
    // The rig cannot shrug — the shoulder is fixed to the neck — so the fault
    // this pattern teaches is the one that actually changes the shape: bending
    // the elbows and turning a shrug into a bad upright row.
    correct: { arms: front([6, 2, 4]) },
    fault: { arms: front([16, 34, 8]) },
    guide: { joints: ['shoulderN', 'elbowN', 'wristN'], mirror: true },
    faultJoint: { joints: ['elbowN', 'elbowF'], r: 34 },
    anchor: 'hands',
  },

  'external-rotation': {
    base: { ...STAND, spine: [2, -2, 2] },
    correct: { arms: arms([8, 84, 6], [6, 86, 6]) },
    // The elbow has come off the ribs and the shoulder is doing the rotating.
    fault: { arms: arms([46, 60, 8], [44, 62, 8]) },
    guide: { joints: ['shoulderN', 'elbowN', 'wristN'] },
    faultJoint: { joints: ['shoulderN'], r: 36 },
    anchor: 'cable-mid',
  },

  'front-raise': {
    base: { ...STAND },
    correct: { arms: arms([84, 4, 4], [80, 6, 4]) },
    // Swung up with a backward lean instead of lifted.
    fault: { spine: [-18, 6, 6], head: 8, arms: arms([104, 6, 6], [100, 8, 6]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -26, y: 6 } },
    anchor: 'hands',
  },

  'lateral-raise': {
    base: { ...STAND_FRONT },
    correct: { arms: front([86, 8, 4]) },
    // Taken well above the shoulder line, where the joint has nothing left.
    fault: { arms: front([124, 8, 4]) },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'], mirror: true },
    faultJoint: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    anchor: 'hands',
  },

  // ══ PULL ═══════════════════════════════════════════════════════════════════

  'vertical-pull': {
    base: {
      view: 'front', root: { x: 0, y: 500 }, ground: { joint: 'wristN', x: 118, y: 62 },
      legs: { near: [-30, -70, 100], far: [-26, -74, 100] },
    },
    correct: { spine: [-1, 1, -1], head: 0, arms: front([152, 34, 4]) },
    fault: {
      spine: [-14, 6, -10], head: -14,
      legs: { near: [-48, -56, 100], far: [-44, -60, 100] },
      arms: front([136, 46, 8]),
    },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'], mirror: true },
    faultJoint: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    anchor: 'overhead-bar',
  },

  row: {
    base: { ...HINGED, root: { x: -120, y: 440 } },
    correct: { spine: [52, -4, -4], head: -6, arms: arms([16, 66, 8], [14, 68, 8]) },
    // The back has rounded and the rep is being jerked with the trunk.
    fault: { spine: [40, 12, 12], head: -14, arms: arms([8, 40, 8], [6, 42, 8]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -30, y: 16 } },
    anchor: 'hands',
  },

  'upright-row': {
    base: { ...STAND_FRONT },
    correct: { arms: front([28, 108, 10]) },
    // Pulled up to the collarbone, which is where the shoulder runs out of room.
    fault: { arms: front([62, 116, 12]) },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'], mirror: true },
    faultJoint: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    anchor: 'hands',
  },

  pullover: {
    base: { ...SUPINE, root: { x: 120, y: 610 } },
    correct: { spine: [-88, 2, -2], head: 6, arms: arms([-146, 12, 4], [-142, 14, 4]) },
    // The ribs have flared and the back has come off the bench to reach further.
    fault: { root: { x: 120, y: 590 }, spine: [-76, -12, 6], head: 12, arms: arms([-162, 14, 4], [-158, 16, 4]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 10, y: 34 } },
    anchor: 'hands',
  },

  curl: {
    base: { ...STAND, root: { x: 0, y: 375 } },
    correct: { spine: [2, -2, 2], head: -4, arms: arms([5, 115, 12], [2, 118, 12]) },
    fault: { spine: [-18, 6, 8], head: 12, legs: { near: [5, -8, 88], far: [0, -3, 88] }, arms: arms([28, 98, 14], [25, 101, 14]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -26, y: 6 } },
    anchor: 'hands',
  },

  'wrist-curl': {
    base: { ...SEATED, spine: [16, -6, -4], head: -8 },
    correct: { arms: arms([54, 34, -46], [50, 38, -46]) },
    // The whole arm is moving, so the forearm never does the work.
    fault: { arms: arms([34, 44, -10], [30, 48, -10]) },
    guide: { joints: ['elbowN', 'wristN', 'handN'] },
    faultJoint: { joints: ['elbowN'], r: 32 },
    anchor: 'hands',
  },

  carry: {
    base: { ...STAND_FRONT },
    correct: { arms: front([6, 4, 4]) },
    // Leaning away from the load instead of bracing against it.
    fault: { spine: [-18, 4, 6], arms: { near: [8, 4, 4], far: [-4, -4, -4] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'hands',
  },

  // ══ CORE ═══════════════════════════════════════════════════════════════════

  plank: {
    base: { ...PRONE, ground: { joint: 'toeN', y: FLOOR } },
    correct: { spine: [-71, 2, -2], head: 4, arms: arms([0, -90, -8], [-3, -87, -8]) },
    // The hips have dropped: the body is a sag, not a line.
    fault: { root: { x: 170, y: 686 }, spine: [-58, -16, -6], head: 10, arms: arms([0, -90, -8], [-3, -87, -8]) },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: 0, y: 30 } },
    anchor: 'none',
  },

  'side-plank': {
    // Drawn front-on: the body lies along −x and the fault is the hip dropping,
    // which is a change in the line of the trunk seen from the side of the mat.
    base: {
      view: 'front', root: { x: 90, y: 560 },
      fs: { thigh: 0.9, shin: 0.9, foot: 0.5 },
      legs: { near: [96, 2, 84], far: [92, 6, 84] },
    },
    correct: { spine: [-92, 2, -2], head: 4, arms: arms([-4, 4, 6], [176, 8, 4]) },
    fault: { root: { x: 90, y: 604 }, spine: [-78, 14, 6], head: 10, arms: arms([-6, 6, 6], [172, 10, 4]) },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'none',
  },

  'reverse-plank': {
    base: { view: 'side', root: { x: 120, y: 560 }, arms: arms([-152, 8, 6], [-149, 10, 6]), legs: { near: [96, -4, 96], far: [93, -1, 96] }, ground: { joint: 'toeN', y: FLOOR - 6 } },
    correct: { spine: [-104, 3, -3], head: 6 },
    fault: { root: { x: 120, y: 606 }, spine: [-88, -12, 6], head: 14 },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 0, y: 30 } },
    anchor: 'none',
  },

  crunch: {
    base: { ...SUPINE },
    // The trunk curls: going up the chain each segment lifts a little further
    // off the floor. That IS a crunch — the ribs travel toward the pelvis.
    correct: { spine: [-90, 25, 15], head: 8, arms: arms([-150, 40, 8], [-146, 44, 8]) },
    // Hauled up by the neck and the hip flexors: the trunk is nearly sitting
    // and the head has been dragged forward onto the chest.
    fault: { spine: [-90, 40, 40], head: 30, arms: arms([-140, 66, 12], [-136, 70, 12]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['neckBase'], r: 34 },
    anchor: 'none',
  },

  'leg-raise': {
    base: { ...SUPINE, arms: arms([-95, 6, 6], [-98, 8, 6]) },
    correct: { spine: [-90, 2, -2], head: 4, legs: { near: [175, 4, 88], far: [172, 6, 88] } },
    // Lowered past what the trunk can hold: the lower back peels off the floor.
    fault: { root: { x: 150, y: 686 }, spine: [-78, -12, 4], head: 8, legs: { near: [128, 6, 88], far: [125, 8, 88] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis', 'kneeN'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 10, y: 32 } },
    // The back peeling off the floor means the abs have let go and the lumbar
    // spine plus the hip flexors are holding the legs.
    faultMuscles: { primary: ['erectors'], secondary: ['quads'] },
    anchor: 'none',
  },

  'knee-tuck': {
    base: { ...PRONE, arms: arms([0, -90, -8], [-3, -87, -8]), ground: { joint: 'handN', y: FLOOR } },
    correct: { spine: [-71, 2, -2], head: 4, legs: { near: [46, 54, -40], far: [76, 1, -39] } },
    // The hips have piked up and the trunk has stopped holding anything.
    fault: { root: { x: 170, y: 596 }, spine: [-94, 8, 4], head: 6, legs: { near: [40, 60, -40], far: [74, 2, -39] } },
    guide: { joints: ['ankleF', 'kneeF', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 0, y: -26 } },
    anchor: 'none',
  },

  rollout: {
    // Kneeling, arms reaching away along the floor.
    base: { view: 'side', root: { x: -40, y: 500 }, legs: { near: [-14, -92, 84], far: [-17, -89, 84] }, ground: { joint: 'kneeN', y: FLOOR - 18 } },
    correct: { spine: [58, -4, -6], head: -10, arms: arms([44, 26, 8], [40, 30, 8]) },
    // Reached past what the trunk can hold: the hips drop and the back sags.
    fault: { spine: [76, -14, -12], head: -18, arms: arms([62, 22, 8], [58, 26, 8]) },
    guide: { joints: ['kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -14, y: 22 } },
    anchor: 'hands',
  },

  'anti-rotation': {
    base: { ...STAND_FRONT },
    correct: { arms: front([104, 62, 6]), spine: [0, 0, 0] },
    // The whole point of the drill is not to turn — and the trunk has turned.
    fault: { arms: { near: [122, 50, 8], far: [-86, -70, -6] }, spine: [-12, 4, 4] },
    guide: { joints: ['neckBase', 'thorax', 'pelvis'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'cable-mid',
  },

  rotation: {
    base: { ...STAND_FRONT },
    correct: { arms: { near: [128, 34, 6], far: [-58, -40, -6] }, legs: { near: [14, -8, 118], far: [-10, 6, -118] } },
    // Turned from the lower back with the feet planted, instead of from the hips.
    fault: { spine: [-16, 6, 6], arms: { near: [148, 26, 8], far: [-40, -34, -6] }, legs: { near: [4, -2, 118], far: [-4, 2, -118] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis', 'kneeN'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'hands',
  },

  'side-bend': {
    base: { ...STAND_FRONT },
    correct: { spine: [-14, 2, 2], arms: { near: [8, 4, 4], far: [-6, -4, -4] } },
    // Bent past the point where the trunk is controlling it.
    fault: { spine: [-34, 6, 6], arms: { near: [10, 4, 4], far: [-8, -6, -4] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'hands',
  },

  'bird-dog': {
    base: { ...QUAD },
    correct: { spine: [-86, 2, -2], head: 4, legs: { near: [100, 0, 80], far: [4, -96, 88] }, arms: arms([-100, 0, -6], [0, 4, 6]) },
    // The back has sagged and the leg has gone higher than the trunk can hold.
    fault: { spine: [-74, -12, -6], head: 12, legs: { near: [118, -4, 80], far: [4, -96, 88] }, arms: arms([-116, -4, -6], [0, 4, 6]) },
    guide: { joints: ['kneeF', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 0, y: 26 } },
    anchor: 'none',
  },

  sled: {
    base: { ...STAND, root: { x: -60, y: 430 } },
    correct: { spine: [34, -4, -4], head: -6, legs: { near: [26, -16, 78], far: [-16, 10, 88] }, arms: arms([46, 10, 6], [42, 14, 6]) },
    fault: { spine: [22, 16, 12], head: -14, legs: { near: [24, -14, 78], far: [-14, 8, 88] }, arms: arms([42, 12, 6], [38, 16, 6]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -24, y: 12 } },
    anchor: 'sled',
  },
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
export { mirrorArms };
