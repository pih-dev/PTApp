// ─── The figure canon (B2, the exercise figures) ─────────────────────────────
//
// WHY THIS FILE EXISTS. 340 movements have to look like ONE library. The only
// way to guarantee that — rather than hope for it 680 times — is to give every
// figure the same skeleton and let a pose be nothing but a list of joint
// angles. Bone lengths live here and NOWHERE else.
//
// 🔴 THE WRONG-FORM FIGURE REUSES THESE EXACT LENGTHS (brief §7.13). Only the
//    angles change between the correct and the faulty pose. If a limb also
//    changed length the reader could not tell which difference is the fault,
//    and the whole point of the pair collapses. Because a pose can only supply
//    ANGLES, that rule is enforced by construction here — not by discipline at
//    340 call sites.
//
// THE CANON (7.5 heads), from docs/design/2026-08-21-design-differentiation-brief.md §7.13:
//   head = 1/7.5 of standing height · 🔴 the hip sits at HALF standing height
//   (the ratio that was most wrong first time — a low hip is an INFANT ratio)
//   knee at the midpoint of hip-to-floor · torso hip→shoulder ≈ 2.4 heads
//   shoulders ≈ 2 head-widths across, hips narrower · upper arm 1.4 heads,
//   forearm 1.2 — so the elbow lands at the waist and the wrist at the hip.
//
// Coordinates: SVG units, y DOWN, x=0 is the cell centre, the floor is y=750
// and the top of a standing head is y=0. Every figure is drawn into the same
// cell against the same baseline (the reference sheets' grid, sheet 3).

export const FLOOR = 750;         // standing height, and the baseline of the cell
export const HEAD_H = 100;        // 750 / 7.5
export const HEAD_W = 76;

// Bone lengths. Derived from the canon above, then checked against a standing
// figure: pelvis 375 above the floor, knee 187 above it, neck base at 2.4 heads
// over the pelvis, head top landing exactly on y=0.
export const BONES = {
  lumbar: 90,      // pelvis → lumbar joint      ┐
  thorax: 90,      // lumbar → thorax             ├ 240 total = 2.4 heads
  neck: 60,        // thorax → neck base         ┘
  head: 85,        // neck base → head CENTRE (35 of neck + half a head)
  upperArm: 140,   // 1.4 heads — elbow at the waist
  forearm: 120,    // 1.2 heads — wrist at the hip
  hand: 40,
  thigh: 187,      // hip 375 above the floor, knee at 187 — the half-height rule
  shin: 145,       // the femur IS longer than the tibia; this is anatomy, not drift
  foot: 60,        // ankle → toe
};

// Half-widths across the body, per view. A side view is narrower than a front
// view because it is showing the body's DEPTH, not its breadth — using one set
// of widths for both is what makes a profile figure look inflated.
// 🔴 THE HIP OFFSET IS THE PELVIS, NOT THE STANCE (2026-08-23, Pierre's
//    screenshot of the showcase wall: "the hip and the ass cheek seem to be
//    larger than a normal human being anatomy"). At front.hip = 48 the two leg
//    ribbons started 96 apart and each carried a 30-wide flank, so the hips
//    printed 156 across against a 110-wide ribcage — the pelvis was WIDER than
//    the chest, and because the leg ribbon reaches full girth at its first
//    joint that width arrived as a flat horizontal SHELF at pelvis height. Read
//    at wall size it is a cartoon pear. A stance is set by the thigh ANGLES; the
//    offset only has to separate the two femoral heads — 38 puts them ~10% of
//    standing height apart, which is what a pelvis actually measures. spin.js
//    reads this same value as the hips' true DEPTH, so the 3D rig was carrying
//    the same error and is corrected by the same number.
export const LATERAL = {
  front: { hip: 38, shoulder: 76 },
  // Side-view offsets are DEPTH, not breadth — but they still have to be big
  // enough that the near and far leg do not print as one column. At 12 they did
  // (v1 of the pilot): a profile figure read as a single thick tube.
  side: { hip: 20, shoulder: 24 },
};

// Half-widths of the drawn flesh at each joint, per view. These are what turn a
// stick chain into a body; they taper distally exactly as a limb does.
//
// 🔴 READ THESE AS A SILHOUETTE, NOT AS A LIST. What the eye judges is the
//    chest-to-waist-to-hip PROFILE, so the numbers are chosen against the head
//    width (76) rather than against each other: ribcage ≈ 1.5 heads, waist ≈
//    1.1, hips ≈ 1.55, and the hips must never out-measure the ribcage. The
//    2026-08-23 pass moved front waist 39→50 and ribcage 55→62 for the same
//    reason the hip offset came in: a 78-wide waist under a 156-wide pelvis is
//    a 2:1 flare no human has, and it was reading as a NARROW TORSO rather than
//    as wide hips — which is exactly how Pierre described it ("a black stripe
//    or empty stripe… makes it seem like the torso is narrow"). The stripe was
//    the white channel the pinched waist opened between the trunk and the
//    hanging arms. Chosen by rendering four candidate sets side by side
//    (`tmp/anat-variants.mjs`) rather than by picking numbers, because the
//    defect is a ratio no single value reveals.
export const GIRTH = {
  front: {
    pelvis: 48, lumbar: 50, thorax: 62, neckBase: 21,
    hip: 29, knee: 21, ankle: 12, toe: 8,
    shoulder: 21, elbow: 15, wrist: 9, handEnd: 11,
    deltoid: 27,
  },
  // Side values are DEPTH. The shipped set made the pelvis deeper (106) than
  // the ribcage (94), which is what read as an oversized backside in profile —
  // his second report. A chest is deeper than a hip; these now say so.
  side: {
    pelvis: 43, lumbar: 44, thorax: 53, neckBase: 20,
    hip: 31, knee: 23, ankle: 12, toe: 8,
    shoulder: 22, elbow: 16, wrist: 9, handEnd: 11,
    deltoid: 26,
  },
};

const RAD = Math.PI / 180;

// A limb angle is measured from STRAIGHT DOWN, positive rotating toward +x
// (screen right, which is the direction a side-view figure faces). A spine
// angle is measured from STRAIGHT UP with the same sign, so "lean forward" is
// positive everywhere and a pose reads without a decoder ring.
const down = (a) => ({ x: Math.sin(a * RAD), y: Math.cos(a * RAD) });
const up = (a) => ({ x: Math.sin(a * RAD), y: -Math.cos(a * RAD) });
const step = (p, dir, len) => ({ x: p.x + dir.x * len, y: p.y + dir.y * len });

// Projection scales. A FRONT view of a squat shows the femur pointing partly
// AT the viewer, so its drawn length is shorter than its true length — that is
// perspective, not drift. `pose.fs` scales a bone's drawn length for exactly
// that reason.
//
// 🔴 THE PAIR RULE STILL HOLDS: `fs` must be IDENTICAL between the correct and
//    the faulty pose of one movement (sanity-figures.mjs asserts it). Two poses
//    of the same lift are seen from the same camera, so they foreshorten the
//    same way; a pair that differs here is smuggling a bone-length change in
//    through the back door, which is the one thing §7.13 forbids.
const fsOf = (pose, bone) => (pose.fs && pose.fs[bone] != null ? pose.fs[bone] : 1);

// Build the full joint set from a pose. THIS IS THE ONLY PLACE POSITIONS ARE
// COMPUTED — a pose file may not hand in a coordinate for a joint, because a
// coordinate is a bone length in disguise and would break the pair rule above.
//
// pose.legs / pose.arms carry `near` and `far` chains; in a front view "near"
// is the figure's right-hand side and "far" its left, which is why one word
// covers both.
export function skeleton(pose) {
  const view = pose.view === 'front' ? 'front' : 'side';
  const lat = LATERAL[view];
  const B = BONES;
  const root = pose.root || { x: 0, y: 375 };
  const [aLum = 0, aTho = 0, aNck = 0] = pose.spine || [];
  const L = (bone) => B[bone] * fsOf(pose, bone);

  const pelvis = { ...root };
  const lumbar = step(pelvis, up(aLum), L('lumbar'));
  const thorax = step(lumbar, up(aLum + aTho), L('thorax'));
  const neckBase = step(thorax, up(aLum + aTho + aNck), L('neck'));
  const headAngle = aLum + aTho + aNck + (pose.head || 0);
  const head = step(neckBase, up(headAngle), L('head'));

  // 🔴 THE LATERAL OFFSET IS PERPENDICULAR TO THE SPINE, not to the world.
  //    A bench press is an upright figure rotated onto its back: with a world-x
  //    offset its shoulders would separate along the body's LENGTH and the
  //    figure would come apart. Perpendicular-to-local-spine is the same value
  //    for a standing figure (perp of straight-up is straight-out) and the
  //    correct one for every rotated pose, so there is no special case.
  // 🔴 ONLY A FRONT VIEW ROTATES ITS LATERAL OFFSET. In a front view the
  //    left-right axis lies IN the picture, so it must turn with the spine (a
  //    supine figure seen from above is the whole reason). In a SIDE view that
  //    axis points out of the page: the small offset we draw is a depth cue, not
  //    anatomy, so it stays a fixed screen nudge. Rotating it there swung the
  //    far arm backwards along the lean and hung a stray flipper off the hip of
  //    every hinge in the pilot.
  const perp = (a) => (view === 'front'
    ? { x: Math.cos(a * RAD), y: Math.sin(a * RAD) }
    : { x: 0.5, y: 0.35 });
  const spineTop = aLum + aTho + aNck;
  const sign = { near: 1, far: -1 };
  const out = { pelvis, lumbar, thorax, neckBase, head, headAngle, view, pose };

  for (const side of ['near', 'far']) {
    const s = sign[side];
    const S = side === 'near' ? 'N' : 'F';

    const hipDir = perp(aLum);
    const hip = { x: pelvis.x + hipDir.x * lat.hip * s, y: pelvis.y + hipDir.y * lat.hip * s };
    const [aThigh = 0, aShin = 0, aFoot = 90] = (pose.legs && pose.legs[side]) || [];
    const knee = step(hip, down(aThigh), L('thigh'));
    const ankle = step(knee, down(aThigh + aShin), L('shin'));
    const toe = step(ankle, down(aThigh + aShin + aFoot), L('foot'));

    // The shoulder sits 12 units DOWN THE SPINE from the neck base — the joint
    // is under the trapezius, not level with it, and drawing them level is what
    // gives a figure no neck.
    const sDir = perp(spineTop);
    const dropX = -Math.sin(spineTop * RAD) * -12, dropY = Math.cos(spineTop * RAD) * -12;
    const shoulder = {
      x: neckBase.x + sDir.x * lat.shoulder * s - dropX,
      y: neckBase.y + sDir.y * lat.shoulder * s - dropY,
    };
    const [aUp = 0, aFore = 0, aHand = 0] = (pose.arms && pose.arms[side]) || [];
    const elbow = step(shoulder, down(aUp), L('upperArm'));
    const wrist = step(elbow, down(aUp + aFore), L('forearm'));
    const hand = step(wrist, down(aUp + aFore + aHand), L('hand'));

    Object.assign(out, {
      ['hip' + S]: hip, ['knee' + S]: knee, ['ankle' + S]: ankle, ['toe' + S]: toe,
      ['shoulder' + S]: shoulder, ['elbow' + S]: elbow, ['wrist' + S]: wrist, ['hand' + S]: hand,
    });
  }

  // Ground the figure. Every figure in the library shares one baseline (the
  // reference read, sheet 3: "a fixed cell, a fixed baseline") — so a pose says
  // WHICH point stands on the floor and the whole figure is translated to put
  // it there, instead of the author hand-tuning a root y per movement and
  // getting a library that floats.
  if (pose.ground) {
    const anchor = out[pose.ground.joint];
    if (anchor) {
      const dy = (pose.ground.y != null ? pose.ground.y : FLOOR) - anchor.y;
      const dx = pose.ground.x != null ? pose.ground.x - anchor.x : 0;
      for (const k of Object.keys(out)) {
        const v = out[k];
        if (v && typeof v === 'object' && typeof v.x === 'number') { v.x += dx; v.y += dy; }
      }
    }
  }
  return out;
}

// Where a muscle sits ON the skeleton, so a pose names muscles rather than
// coordinates.
//
// 🔴 A MUSCLE IS A SEGMENT, NOT A DOT. The first version painted circles and
//    the figures came back covered in spots — a muscle group runs ALONG a bone,
//    so it is drawn as a band down that bone, clipped to the silhouette. That
//    single change is the difference between "highlighted anatomy" and
//    "measles". Each entry returns the two ends of the band and its width.
// v2.46.1 (Elie's reference app, 2026-09-01): a lit muscle fills the SECTION
// of the body it lives in — the whole visible thigh, the whole upper arm — not
// a fixed-width sausage floating inside the limb. Each band therefore names
// the GIRTH keys of its two ends (`gks`) and the renderer draws it at the
// limb's own drawn width (× `fill`), so the wash and the silhouette agree at
// every view and every spin angle by construction. Trunk muscles sit a little
// inside the outline (fill < 1) so the chalk edge survives and the region
// still reads as tissue, not as a recoloured torso.
export const MUSCLE_ANCHORS = {
  quads: (s, S) => band(s['hip' + S], s['knee' + S], 0.12, 0.94, 26, ['hip', 'knee']),
  hamstrings: (s, S) => band(s['hip' + S], s['knee' + S], 0.14, 0.9, 24, ['hip', 'knee'], 0.92),
  glutes: (s, S) => band(s.lumbar, s['hip' + S], 0.55, 1.1, 30, ['pelvis', 'hip']),
  calves: (s, S) => band(s['knee' + S], s['ankle' + S], 0.12, 0.75, 18, ['knee', 'ankle']),
  erectors: (s) => band(s.pelvis, s.thorax, 0.1, 0.95, 22, ['lumbar', 'thorax'], 0.8),
  lats: (s) => band(s.thorax, s.lumbar, 0.05, 0.8, 27, ['thorax', 'lumbar'], 0.88),
  chest: (s, S) => band(s['shoulder' + S], s.thorax, 0.15, 0.85, 28, ['deltoid', 'thorax'], 0.88),
  delts: (s, S) => band(s['shoulder' + S], s['elbow' + S], -0.14, 0.28, 24, ['deltoid', 'elbow']),
  triceps: (s, S) => band(s['shoulder' + S], s['elbow' + S], 0.26, 0.94, 20, ['shoulder', 'elbow']),
  biceps: (s, S) => band(s['shoulder' + S], s['elbow' + S], 0.26, 0.94, 20, ['shoulder', 'elbow']),
  forearms: (s, S) => band(s['elbow' + S], s['wrist' + S], 0.14, 0.88, 15, ['elbow', 'wrist']),
  abs: (s) => band(s.pelvis, s.lumbar, 0.05, 1.0, 26, ['pelvis', 'lumbar'], 0.8),
  traps: (s, S) => band(s.neckBase, s['shoulder' + S], -0.1, 0.85, 21, ['neckBase', 'deltoid']),
};

// 🔴 A LIMB MUSCLE IS PAINTED ON BOTH SIDES IN A FRONT VIEW. A squat with one
//    crimson thigh reads as a rendering bug, not as anatomy — the viewer sees
//    both legs, so both legs work. In profile the far limb is hidden behind the
//    near one and painting it twice buys nothing, so the near side alone.
//    The trunk muscles ignore the side letter entirely; that is why they take
//    one argument.
export const MUSCLE_SIDES = (view) => (view === 'front' ? ['N', 'F'] : ['N']);

// `w` survives as the fallback width for a band with no girth keys; `gks`
// names [startJoint, endJoint] in the GIRTH table and `fill` scales inside it.
function band(a, b, t0, t1, w, gks, fill = 1) {
  const at = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  return { pts: [at(t0), at((t0 + t1) / 2), at(t1)], w, gks, fill };
}
