// ─── The 44 archetypes ───────────────────────────────────────────────────────
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
// On all fours, head at −x. Grounded on the FAR knee, because the near limbs
// are the ones that move.
// 🔴 RE-AUTHORED 2026-08-23 (OPEN item 1c + the mirrored-sign sweep). Three
//    defects lived here, all found by scanning, none by looking:
//    · The trunk was LEVEL (−86), but the arm (300) is longer than the thigh
//      (187) — a level trunk cannot put a hand and a knee on the same floor,
//      so the support hand passed 76 units THROUGH it. On real all-fours the
//      shoulders sit higher than the hips for exactly this reason: the trunk
//      now slopes up toward the head (−70) and the hand lands flat.
//    · A head-at-−x prone body is a MIRRORED figure (see knee-flexion), so the
//      kneeling shin was folded UNDER the belly (−96, the upright sign) and
//      its toe stabbed the floor. Flexion is positive here: +86 lays the shin
//      flat behind the knee, foot −8 trails it flat.
//    · The raised leg's foot pointed at the sky (+80); −18 is the mirrored
//      pointed foot, same value hip-extension uses upright as +18.
const QUAD = {
  view: 'side', root: { x: 44, y: 560 }, ground: { joint: 'kneeF', y: FLOOR - 16 },
  spine: [-73, 2, -2], head: 4,
  legs: { near: [100, 0, -18], far: [4, 86, -8] },
  arms: { near: [-100, 0, -6], far: [0, 4, -86] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['quads'], secondary: ['glutes'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['glutes'] },
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
    // Proposal applied 2026-08-23 after the geometry fix - the Bench card
    // could not be judged while the figure was wrong. Re-judge in-app.
    faultMuscles: { primary: ['quads'], secondary: ['calves'] },
    // Trunk lean raised 6° → 14° (Pierre's Judging Bench photo, 2026-08-23):
    // with a vertical trunk and hanging arms the side view read as a FRONT
    // view, which made the fault's forward shin read as a knee bending
    // sideways. A split squat carries a slight forward lean anyway.
    // 🔴 THE REAR KNEE BENT BACKWARDS UNTIL 2026-08-23 (Pierre circled it on the
    //    showcase wall). far was [-40, +74, 44]: a POSITIVE relative shin in an
    //    upright side view swings the shin ANTERIORLY, which put the rear ankle
    //    81 units off the floor and 81 units IN FRONT of the rear knee — the one
    //    joint in the body that cannot do that. Knee flexion is negative here by
    //    construction (see the sign note at the top of this file), and
    //    `tmp/probe-pose.mjs` prints the sign per leg so it cannot recur unseen.
    //    The pair was re-authored to a real split squat in the same pass: the
    //    front leg now drops to a 60° thigh (was 34° — barely a bend), the rear
    //    knee hovers ~117 above the floor with the heel raised and the TOE ON
    //    THE FLOOR, which the old rear foot never touched.
    base: { ...STAND, root: { x: -40, y: 461 }, spine: [16, 0, 2], head: -6 },
    // Front leg forward and bent, back leg trailing with the knee low.
    correct: {
      legs: { near: [60, -60, 88], far: [-18, -46, 88] },
      arms: arms([4, 2, 6], [2, 4, 6]),
    },
    fault: {
      // The front knee has run forward past the foot and the heel has lifted:
      // the shin leans past vertical so the knee sits ~40 ahead of the ankle,
      // and the toe drops below the heel. The rear leg re-solves for the lower
      // pelvis so its toe still reaches the floor rather than sinking through it.
      legs: { near: [70, -86, 74], far: [-18, -61, 103] },
      arms: arms([6, 2, 6], [4, 4, 6]),
    },
    guide: { joints: ['hipN', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['kneeN'], r: 40 },
    // 'hands', until the Judging Bench photo: a hand-held barbell in side
    // view is a disc at the GRIP, which put a ball on the thigh of every
    // barbell lunge. The bar is racked on the shoulders in these lifts.
    anchor: 'shoulders',
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['glutes'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['quads'], secondary: ['hamstrings'] },
    base: { ...SEATED, arms: arms([-16, 40, 8], [-12, 36, 8]) },
    correct: { legs: { near: [64, -50, 92], far: [60, -46, 92] } },
    fault: { legs: { near: [60, -66, 92], far: [56, -62, 92] } },
    guide: { joints: ['hipN', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['kneeN'], r: 38 },
    anchor: 'feet',
  },

  'knee-flexion': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['glutes'] },
    // Face down, heel curled toward the glute.
    // Face down on a pad, heel curling toward the glute.
    // 🔴 THE HEEL CURLED INTO THE FLOOR until 2026-08-23. The shin read −152,
    //    which swings it DOWN and forward from a face-down thigh — the ankle
    //    finished 22 units under the baseline and the toe 76 under, and the
    //    whole pattern printed as an unreadable smear on the showcase wall. A
    //    prone body inverts the sign convention (its posterior faces the sky),
    //    so flexion here is POSITIVE: +129 lifts the heel toward the glute,
    //    which is the movement. The `FLOOR:` gate in sanity-figures.mjs exists
    //    because this was found by scanning coordinates, never by looking.
    // 🔴 AND THE FOOT INVERTS TOO (2026-08-23, Pierre's report relayed via the
    //    PTApp session: "the feet are pointing towards the head — anatomically
    //    impossible"). The 08-23 fix flipped the shin but left the foot at the
    //    upright +88, which hooked the toes back DOWN toward the head — a
    //    head-at-−x prone body is a MIRRORED figure, so every relative joint
    //    sign flips, the ankle included. −88 is the same neutral ankle.
    base: { view: 'side', root: { x: 150, y: 700 }, spine: [-90, 2, -2], head: 4, arms: arms([-100, 8, 6], [-103, 10, 6]) },
    correct: { legs: { near: [92, 129, -88], far: [89, 126, -88] } },
    // The hips have lifted off the pad to help the heel come up.
    fault: { root: { x: 150, y: 666 }, spine: [-78, -12, 4], legs: { near: [86, 145, -88], far: [83, 142, -88] } },
    guide: { joints: ['thorax', 'pelvis', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['lumbar'], r: 40, offset: { x: 0, y: -26 } },
    anchor: 'feet',
  },

  'calf-raise': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['calves'], secondary: ['quads'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    // 🔴 Grounded on the SUPPORT leg (the hip-extension rule, applied 2026-08-23):
    //    STAND_FRONT's default pins the NEAR ankle — the lifted one — so the
    //    fault's higher lift pushed the standing leg 43 units through the floor.
    base: { ...STAND_FRONT, ground: { joint: 'ankleF', y: FLOOR - 43 }, arms: front([8, 6, 4]) },
    correct: { legs: { near: [28, -6, 118], far: [-3, 3, -118] } },
    // The trunk has leaned away to throw the leg out instead of the hip lifting it.
    fault: { spine: [-16, 4, 4], legs: { near: [40, -8, 118], far: [-4, 4, -118] } },
    guide: { joints: ['neckBase', 'pelvis', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'feet',
  },

  'hip-adduction': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    // Same grounding rule as hip-abduction: the near leg is the working one.
    base: { ...STAND_FRONT, ground: { joint: 'ankleF', y: FLOOR - 43 }, arms: front([8, 6, 4]) },
    correct: { legs: { near: [-16, 6, 118], far: [-3, 3, -118] } },
    fault: { spine: [14, -4, -4], legs: { near: [-30, 10, 118], far: [-4, 4, -118] } },
    guide: { joints: ['neckBase', 'pelvis', 'kneeN', 'ankleN'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'feet',
  },

  'back-extension': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['glutes'] },
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
    // 🔴 GROUNDED ON THE STANDING LEG, not the working one (2026-08-23). With
    //    STAND's default `ankleN` anchor the KICKING foot was pinned to the
    //    floor and the support leg hung off it — 16 units short of the ground in
    //    the correct pose and 40 units THROUGH it in the fault. The rule is
    //    general: `ground` names the limb that bears weight, and a pattern whose
    //    near limb is the one that moves has to say so.
    //    The near shin also read +12/+16 — the knee bowing backwards, the same
    //    defect Pierre circled on the lunge. A kicked-back leg is straight.
    base: {
      ...STAND, root: { x: -20, y: 400 },
      ground: { joint: 'ankleF', y: FLOOR - 43 },
      arms: arms([10, 20, 6], [8, 22, 6]),
    },
    correct: { spine: [18, -6, -6], head: -6, legs: { near: [-34, -4, 18], far: [4, -4, 88] } },
    // The leg goes higher only because the lower back has arched to send it.
    // The standing leg is unchanged, so hip height is identical between the
    // two and the arch is the ONLY difference the reader has to find.
    fault: { spine: [34, -14, -10], head: -12, legs: { near: [-52, -4, 18], far: [4, -4, 88] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis', 'kneeN'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -24, y: 6 } },
    // The extra height came from the arch, so the lower back is doing the
    // lifting the glutes were supposed to do.
    faultMuscles: { primary: ['erectors'], secondary: ['hamstrings'] },
    anchor: 'feet',
  },

  'leg-press': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['quads'], secondary: ['hamstrings'] },
    base: {
      view: 'side', root: { x: 0, y: 560 }, spine: [-50, 4, -6], head: 8,
      arms: arms([-38, 62, 10], [-34, 58, 10]),
    },
    correct: { legs: { near: [133, -15, 88], far: [129, -12, 88] } },
    // 🔴 THE +7/+9 IS THE FAULT, NOT A DEFECT. Snapping the knees past straight
    // at the top of a press is what this pattern teaches; the knee gate warns
    // on it deliberately (`KNEE:` in sanity-figures.mjs) and it must stay.
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['delts'], secondary: ['chest'] },
    base: { ...SEATED, spine: [-8, 2, 3], head: 4 },
    correct: { arms: arms([-81, 161, -10], [-77, 157, -10]) },
    fault: { arms: arms([-110, 180, -12], [-106, 176, -12]) },
    guide: { joints: ['lumbar', 'thorax', 'shoulderN', 'elbowN', 'wristN'] },
    faultJoint: { joints: ['shoulderN'], r: 40 },
    anchor: 'machine-press',
  },

  'push-up': {
    // root.x 170 → 65 (framing round, 2026-08-23): the trailing toes sat 92
    // units past the cell's right edge — a full plank body is ~800 wide, so it
    // only fits the 900 cell when actually centred.
    base: { ...PRONE, root: { x: 65, y: 600 }, ground: { joint: 'toeN', y: FLOOR } },
    correct: { spine: [-71, 2, -2], head: 4, arms: arms([-16, -58, -10], [-19, -55, -10]) },
    // The hips have dropped: the body is a sag, not a plank.
    fault: { root: { x: 65, y: 648 }, spine: [-58, -16, -6], head: 10, arms: arms([-16, -58, -10], [-19, -55, -10]) },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: 0, y: 30 } },
    // A sagging push-up hangs on the lumbar spine — the core that should carry
    // the line has let go, and the chest is no longer doing the pressing work.
    faultMuscles: { primary: ['erectors'], secondary: ['chest'] },
    anchor: 'none',
  },

  dip: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['delts'], secondary: ['chest'] },
    // 🔴 RE-AUTHORED 2026-08-23 (the frame audit): the arms were [174, 34] —
    //    upper arm pointing straight UP, hands 43 units above the cell's top
    //    edge, clipped out of every render. A dip's upper arm points down and
    //    BACK (shoulder extension), forearm down to the bar at hip height —
    //    which also brings the drawn bars down to where dip bars are.
    base: { view: 'side', root: { x: 0, y: 430 }, spine: [8, -4, -2], head: -4, legs: { near: [-28, -46, 92], far: [-24, -50, 92] } },
    correct: { arms: arms([-35, 45, 0], [-38, 48, 0]) },
    // Dropped too deep — the shoulder is now below the elbow, which has flared
    // up behind the back. The feet tuck a little further so they clear the floor.
    fault: { root: { x: 0, y: 490 }, arms: arms([-108, 118, 0], [-111, 121, 0]), legs: { near: [-28, -54, 92], far: [-24, -58, 92] } },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'] },
    faultJoint: { joints: ['shoulderN'], r: 38 },
    anchor: 'bars',
  },

  fly: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['chest'], secondary: ['biceps'] },
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
    // Mid-press, bar just above the forehead (2026-08-23): the lockout the
    // pose used to draw put the bar 125 units above the frame - the shipped
    // card was a headless column with no arms. The lean-back fault lives in
    // the press-out anyway, so this is also the truer teaching moment.
    correct: { spine: [2, -2, 2], head: -2, arms: arms([95, 105, 4], [91, 107, 4]) },
    // Leaned back under the bar — the press comes from the lower back.
    fault: { spine: [-22, 6, 8], head: 10, arms: arms([95, 90, 6], [91, 92, 6]) },
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
    // 🔴 RE-AUTHORED 2026-08-23 (the frame audit): the forearm was −52 — from
    //    an overhead upper arm that is 52° of hyperextension, an elbow no human
    //    has, and it put the hands 51 units above the cell's top edge. The
    //    honest moment is the deep stretch: elbow overhead, forearm FOLDED
    //    behind the head (+134 is elbow flexion, the same sign as a curl).
    correct: { spine: [2, -2, 2], arms: arms([176, 134, -8], [172, 130, -8]) },
    // The ribs flare and the back arches to get the elbow overhead.
    fault: { spine: [-20, 6, 8], head: 8, arms: arms([164, 140, -10], [160, 136, -10]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -26, y: 6 } },
    // The arch that gets the elbow overhead is held by the lower back, not the
    // triceps the movement is for.
    faultMuscles: { primary: ['erectors'], secondary: ['triceps'] },
    anchor: 'hands',
  },

  shrug: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['traps'], secondary: ['biceps'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['delts'], secondary: ['traps'] },
    base: { ...STAND, spine: [2, -2, 2] },
    correct: { arms: arms([8, 84, 6], [6, 86, 6]) },
    // The elbow has come off the ribs and the shoulder is doing the rotating.
    fault: { arms: arms([46, 60, 8], [44, 62, 8]) },
    guide: { joints: ['shoulderN', 'elbowN', 'wristN'] },
    faultJoint: { joints: ['shoulderN'], r: 36 },
    anchor: 'cable-mid',
  },

  'front-raise': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['delts'] },
    base: { ...STAND },
    correct: { arms: arms([84, 4, 4], [80, 6, 4]) },
    // Swung up with a backward lean instead of lifted.
    fault: { spine: [-18, 6, 6], head: 8, arms: arms([104, 6, 6], [100, 8, 6]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -26, y: 6 } },
    anchor: 'hands',
  },

  'lateral-raise': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['traps'], secondary: ['delts'] },
    base: { ...STAND_FRONT },
    correct: { arms: front([86, 8, 4]) },
    // Taken well above the shoulder line, where the joint has nothing left.
    // (124 → 118, framing round 2026-08-23: the hands kissed the cell's top edge.)
    fault: { arms: front([118, 8, 4]) },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'], mirror: true },
    faultJoint: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    anchor: 'hands',
  },

  // ══ PULL ═══════════════════════════════════════════════════════════════════

  'vertical-pull': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['delts'], secondary: ['biceps'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['lats'] },
    base: { ...HINGED, root: { x: -120, y: 440 } },
    correct: { spine: [52, -4, -4], head: -6, arms: arms([16, 66, 8], [14, 68, 8]) },
    // The back has rounded and the rep is being jerked with the trunk.
    fault: { spine: [40, 12, 12], head: -14, arms: arms([8, 40, 8], [6, 42, 8]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -30, y: 16 } },
    anchor: 'hands',
  },

  'upright-row': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['delts'], secondary: ['traps'] },
    base: { ...STAND_FRONT },
    correct: { arms: front([28, 108, 10]) },
    // Pulled up to the collarbone, which is where the shoulder runs out of room.
    fault: { arms: front([62, 116, 12]) },
    guide: { joints: ['wristN', 'elbowN', 'shoulderN', 'thorax'], mirror: true },
    faultJoint: { joints: ['shoulderN', 'shoulderF'], r: 36 },
    anchor: 'hands',
  },

  pullover: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['delts'] },
    base: { ...SUPINE, root: { x: 120, y: 610 } },
    correct: { spine: [-88, 2, -2], head: 6, arms: arms([-146, 12, 4], [-142, 14, 4]) },
    // The ribs have flared and the back has come off the bench to reach further.
    fault: { root: { x: 120, y: 590 }, spine: [-76, -12, 6], head: 12, arms: arms([-162, 14, 4], [-158, 16, 4]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 10, y: 34 } },
    anchor: 'hands',
  },

  curl: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['delts'] },
    base: { ...STAND, root: { x: 0, y: 375 } },
    correct: { spine: [2, -2, 2], head: -4, arms: arms([5, 115, 12], [2, 118, 12]) },
    fault: { spine: [-18, 6, 8], head: 12, legs: { near: [5, -8, 88], far: [0, -3, 88] }, arms: arms([28, 98, 14], [25, 101, 14]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 46, offset: { x: -26, y: 6 } },
    anchor: 'hands',
  },

  'wrist-curl': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['biceps'], secondary: ['forearms'] },
    base: { ...SEATED, spine: [16, -6, -4], head: -8 },
    correct: { arms: arms([54, 34, -46], [50, 38, -46]) },
    // The whole arm is moving, so the forearm never does the work.
    fault: { arms: arms([34, 44, -10], [30, 48, -10]) },
    guide: { joints: ['elbowN', 'wristN', 'handN'] },
    faultJoint: { joints: ['elbowN'], r: 32 },
    anchor: 'hands',
  },

  carry: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    // root.x 170 → 65: same framing shift as push-up, same reason.
    base: { ...PRONE, root: { x: 65, y: 640 }, ground: { joint: 'toeN', y: FLOOR } },
    correct: { spine: [-71, 2, -2], head: 4, arms: arms([0, -90, -8], [-3, -87, -8]) },
    // The hips have dropped: the body is a sag, not a line.
    fault: { root: { x: 65, y: 686 }, spine: [-58, -16, -6], head: 10, arms: arms([0, -90, -8], [-3, -87, -8]) },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: 0, y: 30 } },
    anchor: 'none',
  },

  'side-plank': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['delts'] },
    // Drawn front-on: the body lies along −x and the fault is the hip dropping,
    // which is a change in the line of the trunk seen from the side of the mat.
    base: {
      view: 'front', root: { x: 90, y: 560 },
      fs: { thigh: 0.9, shin: 0.9, foot: 0.5 },
      legs: { near: [96, 2, 84], far: [92, 6, 84] },
    },
    // Support hand FLAT (6 → −86, floor pass 2026-08-23): the hand segment
    // used to continue straight down and its fingers ran 38 units into the
    // floor. The wrist was already at floor height — only the palm turns.
    correct: { spine: [-92, 2, -2], head: 4, arms: arms([-4, 4, -86], [176, 8, 4]) },
    fault: { root: { x: 90, y: 604 }, spine: [-78, 14, 6], head: 10, arms: arms([-6, 6, -84], [172, 10, 4]) },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'none',
  },

  'reverse-plank': {
    // Proposal applied 2026-08-23 after the re-author - the Bench card was
    // out of frame and could not be judged. Re-judge in-app.
    faultMuscles: { primary: ['delts'], secondary: ['erectors'] },
    // Re-authored 2026-08-23: the original spine (-104°) tipped the trunk
    // PAST horizontal, and with the toe pinned to the floor line the whole
    // body computed below the cell — Pierre's Judging Bench photo shows
    // just a limb sliver in the corner. Nobody had ever seen this pair.
    base: { view: 'side', root: { x: 40, y: 600 }, arms: arms([-4, -86, 0], [-1, -84, 0]), legs: { near: [76, -2, 92], far: [73, 1, 92] }, ground: { joint: 'ankleN', y: FLOOR - 6 } },
    correct: { spine: [-76, 2, 6], head: 22 },
    fault: { spine: [-66, -6, 10], head: 28, legs: { near: [82, -2, 92], far: [79, 1, 92] } },
    guide: { joints: ['ankleN', 'kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 0, y: 30 } },
    anchor: 'none',
  },

  crunch: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['traps'], secondary: ['quads'] },
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
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['delts'], secondary: ['abs'] },
    // Framing + floor pass 2026-08-23: root.x 170 → 90 (trailing toes were 70
    // past the right edge), and the tucked thigh raised 46 → 78 — at 46 the
    // drawn knee finished 71 units UNDER the floor, drawn as a smear. A tucked
    // knee drives toward the chest, above the floor, not through it.
    base: { ...PRONE, root: { x: 86, y: 640 }, arms: arms([0, -90, -8], [-3, -87, -8]), ground: { joint: 'handN', y: FLOOR } },
    // The trailing thigh runs at 84, not PRONE's 76: this pattern grounds on
    // the HAND, and from there the old angles overshot the floor — the
    // trailing toe finished 52 units under it.
    correct: { spine: [-71, 2, -2], head: 4, legs: { near: [78, 54, -50], far: [84, 1, -39] } },
    // The hips have piked up and the trunk has stopped holding anything.
    fault: { root: { x: 86, y: 596 }, spine: [-94, 8, 4], head: 6, legs: { near: [72, 60, -50], far: [74, 2, -39] } },
    guide: { joints: ['ankleF', 'kneeF', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 0, y: -26 } },
    anchor: 'none',
  },

  rollout: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    // Kneeling, arms reaching away along the floor. root.x −40 → −60
    // (framing round, 2026-08-23): the fault's reaching hand left the cell.
    base: { view: 'side', root: { x: -60, y: 500 }, legs: { near: [-14, -92, 84], far: [-17, -89, 84] }, ground: { joint: 'kneeN', y: FLOOR - 18 } },
    correct: { spine: [58, -4, -6], head: -10, arms: arms([44, 26, 8], [40, 30, 8]) },
    // Reached past what the trunk can hold: the hips drop and the back sags.
    fault: { spine: [76, -14, -12], head: -18, arms: arms([62, 22, 8], [58, 26, 8]) },
    guide: { joints: ['kneeN', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -14, y: 22 } },
    anchor: 'hands',
  },

  'anti-rotation': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    base: { ...STAND_FRONT },
    // Press-out trimmed 104/122 → 100/102 (framing round, 2026-08-23): the
    // fault's hand was 40 units above the cell's top edge.
    correct: { arms: front([100, 52, 6]), spine: [0, 0, 0] },
    // The whole point of the drill is not to turn — and the trunk has turned.
    fault: { arms: { near: [102, 44, 8], far: [-86, -70, -6] }, spine: [-12, 4, 4] },
    guide: { joints: ['neckBase', 'thorax', 'pelvis'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'cable-mid',
  },

  rotation: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    base: { ...STAND_FRONT },
    // Arm swing trimmed 128/148 → 110/116 (framing round, 2026-08-23): the
    // fault's raised hand was 80 units above the cell's top edge. The pair
    // still reads high-to-low across the body; the fault's marker is the
    // trunk lean with planted feet, not extra arm height nobody could see.
    correct: { arms: { near: [110, 28, 6], far: [-58, -40, -6] }, legs: { near: [14, -8, 118], far: [-10, 6, -118] } },
    // Turned from the lower back with the feet planted, instead of from the hips.
    fault: { spine: [-16, 6, 6], arms: { near: [116, 20, 8], far: [-40, -34, -6] }, legs: { near: [4, -2, 118], far: [-4, 2, -118] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis', 'kneeN'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'hands',
  },

  'side-bend': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['abs'] },
    base: { ...STAND_FRONT },
    correct: { spine: [-14, 2, 2], arms: { near: [8, 4, 4], far: [-6, -4, -4] } },
    // Bent past the point where the trunk is controlling it.
    fault: { spine: [-34, 6, 6], arms: { near: [10, 4, 4], far: [-8, -6, -4] } },
    guide: { joints: ['neckBase', 'thorax', 'pelvis'] },
    faultJoint: { joints: ['lumbar'], r: 42 },
    anchor: 'hands',
  },

  'bird-dog': {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['glutes'] },
    base: { ...QUAD },
    // The reaching arm continues the trunk's own line (spine −73 ⇒ arm −107).
    correct: { spine: [-73, 2, -2], head: 4, legs: { near: [100, 0, -18], far: [4, 86, -8] }, arms: arms([-107, 0, -6], [0, 4, -86]) },
    // The back has hollowed to send the leg higher than the trunk can hold:
    // the lumbar segment drops toward horizontal and the thorax folds back up,
    // so BOTH ends stay planted and the swayback is the difference. (A sag
    // authored as a whole-trunk tilt lifted the support hand off the floor —
    // and a lumbar shallower than −60 walks into the KNEE gate's upright
    // scope, where the kneeling shin's mirrored +86 reads as a backward knee.)
    // The support limbs are IDENTICAL between the halves (the hip-extension
    // rule), so the hollow and the over-raised leg are the only differences.
    fault: { spine: [-80, 14, -6], head: 12, legs: { near: [118, 4, -18], far: [4, 86, -8] }, arms: arms([-116, -4, -6], [0, 4, -86]) },
    guide: { joints: ['kneeF', 'pelvis', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 42, offset: { x: 0, y: 26 } },
    anchor: 'none',
  },

  sled: {
    // Judged by Pierre on the Judging Bench, 2026-08-23.
    faultMuscles: { primary: ['erectors'], secondary: ['quads'] },
    base: { ...STAND, root: { x: -60, y: 430 } },
    // The trailing leg drives straight, so its shin is 0 relative — it read +10
    // / +8 (a knee slightly past straight) until the 2026-08-23 anatomy pass.
    correct: { spine: [34, -4, -4], head: -6, legs: { near: [26, -16, 78], far: [-16, 0, 88] }, arms: arms([46, 10, 6], [42, 14, 6]) },
    fault: { spine: [22, 16, 12], head: -14, legs: { near: [24, -14, 78], far: [-14, 0, 88] }, arms: arms([42, 12, 6], [38, 16, 6]) },
    guide: { joints: ['pelvis', 'lumbar', 'thorax', 'neckBase'] },
    faultJoint: { joints: ['lumbar'], r: 44, offset: { x: -24, y: 12 } },
    anchor: 'sled',
  },
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
export { mirrorArms };
