// ─── The figure renderer: curves, not hinges ─────────────────────────────────
//
// 🔴 THE RULE THIS FILE EXISTS TO ENFORCE (brief §7.9): "every figure is
//    continuous curves — no visible joints, no corners. A body, not a skeleton
//    diagram. Thigh flows through the knee; neck flows into the head." And the
//    functional reason, which is the part that matters: a hinged stick figure
//    PHYSICALLY CANNOT show a spine holding its arch versus rounding over.
//    Straight segments have no arch to lose. Every fault this library teaches
//    is a curvature, so curvature has to be the primitive.
//
// HOW IT WORKS, in one paragraph. A limb is not two tapered boxes meeting at an
// angle; it is ONE variable-width ribbon swept along a smooth spline that runs
// through the whole joint chain (shoulder → elbow → wrist). We sample that
// spline, offset each sample by its half-width along the normal to get a left
// and a right edge, cap both ends with a semicircle, and emit the whole outline
// as one closed bezier path. Overlapping ribbons are never unioned
// geometrically — they are simply painted into the same fill, which reads as
// one seamless body and costs nothing.
//
// WHY THE BONES ARE SUBDIVIDED. A raw spline through three joints bows away
// from the bones and gives a noodle. Inserting a midpoint on each bone pins the
// curve to the bone line and concentrates the curvature where it belongs — at
// the joint. That single trick is the difference between "anatomical" and
// "inflatable".

import { skeleton, GIRTH, MUSCLE_ANCHORS, MUSCLE_SIDES, HEAD_W, HEAD_H } from './canon.js';

const SAMPLES_PER_SEG = 5;   // enough to smooth; few enough to keep paths small
const CAP_STEPS = 7;

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
// Round 4: girth between the side and front tables, per key. A quarter-turned
// body is genuinely between "deep" and "broad" — snapping tables mid-turn
// would make every limb pop a size.
const blendGirth = (a, b, t) => {
  const o = {};
  for (const k of Object.keys(a)) o[k] = lerp(a[k], b[k], t);
  return o;
};

// Centripetal Catmull-Rom. Centripetal (alpha = 0.5) rather than uniform
// because a deep squat bends the knee past 140°, and a uniform spline
// overshoots into a cusp exactly there — on the joint we most need to read.
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

// Put a control point at the middle of every bone (see the header note).
function densify(pts, widths) {
  const P = [], W = [];
  for (let i = 0; i < pts.length - 1; i++) {
    P.push(pts[i]); W.push(widths[i]);
    P.push({ x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 });
    W.push((widths[i] + widths[i + 1]) / 2);
  }
  P.push(pts[pts.length - 1]); W.push(widths[widths.length - 1]);
  return [P, W];
}

function sampleSpline(pts, widths) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const last = i === n - 2;
    const steps = SAMPLES_PER_SEG + (last ? 1 : 0);
    for (let s = 0; s < steps; s++) {
      const t = s / SAMPLES_PER_SEG;
      const p = catmull(p0, p1, p2, p3, t);
      p.w = lerp(widths[i], widths[i + 1], t);
      out.push(p);
    }
  }
  // Degenerate chains (two coincident joints) would produce zero-length
  // tangents and NaN normals — drop the duplicates rather than emit "NaN" into
  // the path data, which silently blanks the whole figure.
  return out.filter((p, i, a) => i === 0 || dist(p, a[i - 1]) > 0.01);
}

// Catmull-Rom → cubic bezier, so the OUTLINE of the silhouette is itself curved
// rather than a dense polygon. It is what keeps the edge clean when the figure
// is scaled up, and it is why the same asset works at 16px and at 400px.
function closedPath(pts) {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M${r(pts[0].x)} ${r(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${r(c1.x)} ${r(c1.y)},${r(c2.x)} ${r(c2.y)},${r(p2.x)} ${r(p2.y)}`;
  }
  return d + 'Z';
}

// Whole units. The cell is 900 wide, so one unit is ~0.2px at the size a
// figure is actually shown — a decimal place buys nothing visible and costs
// ~30% of the path data, which at 340 movements is the difference between a
// library that fits in the bundle and one that does not.
const r = (v) => Math.round(v);

// One limb: a tapered, capped ribbon along the joint chain.
// `keepSide` (round 4): enforce normal continuity — see the note at the flip.
// 🔴 OPT-IN, NOT DEFAULT: byte-compared over all 680 authored figures, the
//    flip also fires on 24 of them (the leg-curl family's folded knees) and
//    changes judged art. Spun figures need it; authored ones keep their exact
//    shipped bytes until those 24 are re-judged with it on.
export function ribbon(joints, widths, keepSide = false) {
  const [P, W] = densify(joints, widths);
  const s = sampleSpline(P, W);
  if (s.length < 2) return '';

  const left = [], right = [];
  let pnx = null, pny = null;
  for (let i = 0; i < s.length; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    let nx = -ty / L, ny = tx / L;
    // 🔴 NORMAL CONTINUITY (round 4, Pierre's frame-by-frame catalogue): when a
    //    spun limb folds toward the camera its projected tangent REVERSES, the
    //    normal swaps sides, the left and right edges cross, and the nonzero
    //    fill rule punches a cap-sized HOLE in the body — the black circles he
    //    logged at hips, crotch, feet and armpit across three exercises. Keep
    //    each normal on the same side as the one before it and the outline can
    //    no longer cross itself at a fold. Unspun figures never reverse a
    //    tangent, so this is a no-op for the authored views by construction.
    if (keepSide && pnx !== null && nx * pnx + ny * pny < 0) { nx = -nx; ny = -ny; }
    pnx = nx; pny = ny;
    left.push({ x: s[i].x + nx * s[i].w, y: s[i].y + ny * s[i].w });
    right.push({ x: s[i].x - nx * s[i].w, y: s[i].y - ny * s[i].w });
  }

  // Round caps as explicit points rather than an SVG arc: an arc needs a sweep
  // flag whose sign depends on the chain's direction, and getting it wrong
  // turns a fingertip inside out. Points cannot be wrong.
  const cap = (centre, from, to, w) => {
    const a0 = Math.atan2(from.y - centre.y, from.x - centre.x);
    let a1 = Math.atan2(to.y - centre.y, to.x - centre.x);
    // Always take the short way round the far side of the tip.
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const pts = [];
    for (let k = 1; k < CAP_STEPS; k++) {
      const a = a0 + d * (k / CAP_STEPS);
      pts.push({ x: centre.x + Math.cos(a) * w, y: centre.y + Math.sin(a) * w });
    }
    return pts;
  };

  const end = s[s.length - 1], start = s[0];
  const poly = [
    ...left,
    ...cap(end, left[left.length - 1], right[right.length - 1], end.w),
    ...right.slice().reverse(),
    ...cap(start, right[0], left[0], start.w),
  ];
  return closedPath(poly);
}

// The head: an ellipse rotated with the neck, so a figure looking down at the
// bar reads as looking down instead of as a tilted balloon.
function headPath(sk) {
  const a = sk.headAngle;
  return { cx: sk.head.x, cy: sk.head.y, rx: HEAD_W / 2, ry: HEAD_H / 2, rot: a };
}

// ── Assemble one figure ──────────────────────────────────────────────────────
//
// Returns plain data (path strings + circles), not JSX, so the same geometry
// can be rendered into the app, into a test harness, or exported to a file
// without dragging React along. `parts.body` is everything that paints in
// currentColor; `parts.muscles` and `parts.fault` paint INSIDE it via a clip.
// 🔴 ROTATION IS A TWEEN BETWEEN TWO AUTHORED CAMERAS, NOT A 3D RIG — and that
//    is a deliberate choice, not a shortcut. Pierre, 2026-08-22: "I need
//    different angles… they drag them." A true 3D rig needs a body-fixed frame
//    per segment (a supine figure's left-right axis is not the world's), which
//    is a rewrite of every one of the 44 patterns' numbers. A tween needs two
//    drawings that were each checked by eye, and every frame between them is
//    bounded by two known-good shapes — so it can never rotate into an
//    illegible blob, which is the failure mode the options doc flagged.
//
//    Bone lengths vary across the tween. That is CORRECT, not drift: a bone
//    turning toward the camera really is drawn shorter, and the two endpoints
//    are exactly its true length at each camera. The pair rule is unaffected —
//    both halves of a pair tween between the same two cameras.
function lerpSkeleton(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) {
    const v = a[k], w = b[k];
    if (v && typeof v === 'object' && typeof v.x === 'number' && w) {
      out[k] = { x: v.x + (w.x - v.x) * t, y: v.y + (w.y - v.y) * t };
    } else if (k === 'headAngle') {
      out[k] = a[k] + (b[k] - a[k]) * t;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function buildFigure(pose, mix, skIn) {
  // `pose.alt` is the same movement from a second camera. `mix` 0 = the authored
  // pose, 1 = the alternate, anything between is the turn.
  // `skIn` (round-4 prototype, spin.js): a pre-computed skeleton — the caller
  // has already rotated the joints and everything downstream just draws them.
  const sk = skIn || ((pose.alt && mix > 0)
    ? lerpSkeleton(skeleton(pose), skeleton(pose.alt), Math.min(1, mix))
    : skeleton(pose));
  // Round 4: a spun skeleton (spin.js) carries its turn angle. Two things
  // blend with it that a fixed view cannot supply — the girth (a body is
  // wider than it is deep, so a quarter-turned figure is between the two
  // tables), and the paint order (below).
  const spun = typeof sk.theta === 'number';
  const across = spun ? Math.abs(Math.sin(sk.theta * Math.PI / 180)) : 0;
  const g = spun ? blendGirth(GIRTH.side, GIRTH.front, across) : GIRTH[sk.view];

  const leg = (S) => ribbon(
    [sk['hip' + S], sk['knee' + S], sk['ankle' + S]],
    [g.hip, g.knee, g.ankle], spun,
  );
  const foot = (S) => ribbon([sk['ankle' + S], sk['toe' + S]], [g.ankle, g.toe], spun);
  const arm = (S) => ribbon(
    [sk['shoulder' + S], sk['elbow' + S], sk['wrist' + S], sk['hand' + S]],
    [g.shoulder, g.elbow, g.wrist, g.handEnd], spun,
  );

  // Far side first: it is behind the torso, so painting it first lets the torso
  // and near limbs sit over it and the overlap reads as depth rather than as a
  // seam. Same fill throughout — one fill, one weight (the reference read).
  // 🔴 On a SPUN figure "far" is not a constant — a limb that started far
  //    swings toward the camera mid-turn — so each part carries its mean depth
  //    and the list is depth-sorted, farthest painted first. Unspun figures
  //    keep the authored order exactly.
  const zOf = (names) => names.reduce((s, n) => s + ((sk[n] && sk[n].z) || 0), 0) / names.length;
  const parts = [
    { d: leg('F'), z: zOf(['hipF', 'kneeF', 'ankleF']) },
    { d: foot('F'), z: zOf(['ankleF', 'toeF']) },
    { d: arm('F'), z: zOf(['shoulderF', 'elbowF', 'wristF']) },
    // The torso is one ribbon through the spine chain. THIS is the line that
    // carries the arch: pelvis → lumbar → thorax → neck, four points whose
    // angles the pose sets, so "neutral" and "rounded" are the same path with
    // different numbers rather than two drawings.
    {
      d: ribbon([sk.pelvis, sk.lumbar, sk.thorax, sk.neckBase],
        [g.pelvis, g.lumbar, g.thorax, g.neckBase], spun),
      z: zOf(['pelvis', 'lumbar', 'thorax', 'neckBase']),
    },
    { d: leg('N'), z: zOf(['hipN', 'kneeN', 'ankleN']) },
    { d: foot('N'), z: zOf(['ankleN', 'toeN']) },
    { d: arm('N'), z: zOf(['shoulderN', 'elbowN', 'wristN']) },
  ];
  if (spun) parts.sort((a, b) => a.z - b.z);
  const body = parts.map(p => p.d);

  // Deltoid caps: the shoulder is a ball, and a torso ribbon alone ends in a
  // slab. These are what give the figure its 2-head-wide shoulder line.
  const deltoids = [
    { cx: sk.shoulderN.x, cy: sk.shoulderN.y, r: g.deltoid },
    { cx: sk.shoulderF.x, cy: sk.shoulderF.y, r: g.deltoid },
  ];

  // Muscles are now CODED, not just washed (Pierre, 2026-08-22 — "you also
  // highlighted the muscles that are engaged with a colour code"). Primary
  // movers and supporting muscles paint from two different tokens, so the
  // figure answers "what does this train" and not merely "something happens
  // here". An array is still accepted and means primary-only.
  const ms = Array.isArray(pose.muscles) ? { primary: pose.muscles, secondary: [] } : (pose.muscles || {});
  // Past a quarter turn both limbs are visible, so both wash — the same rule
  // MUSCLE_SIDES applies to an authored front view.
  const sides = (spun && across > 0.5) ? ['N', 'F'] : MUSCLE_SIDES(sk.view);
  const anchor = (list) => (list || [])
    .flatMap(k => (MUSCLE_ANCHORS[k] ? sides.map(S => MUSCLE_ANCHORS[k](sk, S)) : []))
    .filter(Boolean)
    .map(m => ribbon(m.pts, m.pts.map(() => m.w), spun));
  const muscles = { primary: anchor(ms.primary), secondary: anchor(ms.secondary) };

  // 🔴 THE POSTURE LINE — brief §7.9: "the spine is the hero line, drawn in the
  //    accent when held and in the warn hue when lost." Generalised past the
  //    spine, because the line that decides a rep is not always the back: for a
  //    squat it is the leg (hip → knee → ankle), for a press it is the arm.
  //    It rides ON the silhouette rather than replacing it — the body says what
  //    the movement is, the line says what to look at.
  //    Drawn from the SAME joints the body is built from, so it can never
  //    disagree with the figure it is annotating.
  const guideChain = pose.guide && pose.guide.joints;
  const guide = guideChain
    ? { d: polyline(guideChain.map(j => jointAt(sk, j))), mirror: pose.guide.mirror
        ? polyline(guideChain.map(j => jointAt(sk, mirrorJoint(j)))) : null }
    : null;

  // The fault marker sits ON the joint that takes the load (brief §7.12) — never
  // a red outline around the whole body, because "where" is the entire message.
  // A list, because some faults are bilateral: both knees cave, both shoulders
  // flare. Marking one of a symmetrical pair reads as a drawing error.
  // `offset` nudges the marker off the joint CENTRE onto the tissue that
  // actually takes the load — a lumbar disc is at the BACK of the trunk, not on
  // its axis, and a ring drawn on the navel teaches the wrong place.
  const off = (pose.fault && pose.fault.offset) || { x: 0, y: 0 };
  const fault = (pose.fault ? pose.fault.joints : [])
    .map(j => {
      const p = jointAt(sk, j);
      return { x: p.x + (off.x || 0), y: p.y + (off.y || 0), r: pose.fault.r || 46 };
    });

  // 🔴 THE EQUIPMENT SWAPS AT THE HALFWAY POINT RATHER THAN TWEENING. A bench
  //    seen from the side and the same bench seen from above are not the same
  //    shape with different numbers — one is a slab and a post, the other is a
  //    pad and a bar across it. Interpolating between them produces a third
  //    object that exists in neither view. A swap is visible for one frame; a
  //    morphing bench is wrong in every frame.
  const equipPose = (pose.alt && mix > 0.5) ? pose.alt : pose;
  const equip = typeof equipPose.equip === 'function' ? equipPose.equip(sk).filter(Boolean) : [];

  return { sk, body: body.filter(Boolean), deltoids, head: headPath(sk), muscles, guide, fault, equip, view: sk.view };
}

// A bilateral fault (both knees, both shoulders) needs the line on both sides,
// and a pose should not have to spell the mirror out — one typo there would
// draw two different chains and read as a drawing error rather than a fault.
const mirrorJoint = (j) => (j.endsWith('N') ? j.slice(0, -1) + 'F' : j);

// The guide as an open, smoothed path. Same Catmull-Rom the silhouette uses, so
// the line follows the curve of the limb it sits on instead of cutting the
// corner off every joint.
function polyline(pts) {
  // Round 4: a spun figure can point a limb AT the camera, projecting two
  // guide joints almost onto each other — the line hairpins, and its 15-wide
  // ground-colour halo rounds the fold into a dark disc (the 180° "black
  // ball" found in review). Collapse near-coincident points; the guide just
  // ends where the limb leaves the picture plane, which is what an eye
  // expects. A hand-authored pose never puts guide joints 18 units apart, so
  // unspun figures are untouched by construction.
  const dedup = pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 18);
  const [P] = densify(dedup, dedup.map(() => 0));
  const s = sampleSpline(P, P.map(() => 0));
  if (s.length < 2) return '';
  return `M${r(s[0].x)} ${r(s[0].y)}` + s.slice(1).map(p => `L${r(p.x)} ${r(p.y)}`).join('');
}

// Resolve a joint name from a pose ('kneeN', 'lumbar', …) with a readable
// failure: a typo here would otherwise mark the origin of the cell, which looks
// deliberate and would ship.
function jointAt(sk, name) {
  const p = sk[name];
  if (!p) {
    console.error(`Figure: unknown joint "${name}" — the fault marker has nowhere to go.`);
    return { x: sk.pelvis.x, y: sk.pelvis.y };
  }
  return { x: p.x, y: p.y };
}

// ── The zoom anchor (next-round brief §1) ────────────────────────────────────
//
// Where the pair zooms ABOUT, in cell coordinates. Zooming about the cell's
// centre put the hips in the middle and threw a shoulder movement's teaching
// out of frame; the point that matters is the one the figure already marks:
// the fault joint (that is by definition what is being taught), falling back
// to the midpoint of the posture line for a pose with no marker.
//
// 🔴 Call this with the FAULT pose for both halves of the pair — the brief's
//    rule: "both halves must zoom about the SAME anchor, or the pair stops
//    being a comparison." The correct pose carries no fault marker, so it
//    cannot answer the question itself.
//
// `mix` matters because a rotatable pair can be zoomed mid-turn, and the
// joint has moved with the camera tween by then.
export function zoomAnchor(pose, mix = 0) {
  const sk = (pose.alt && mix > 0)
    ? lerpSkeleton(skeleton(pose), skeleton(pose.alt), Math.min(1, mix))
    : skeleton(pose);
  const chain = (pose.fault && pose.fault.joints) || (pose.guide && pose.guide.joints);
  if (!chain || !chain.length) return null;
  const pts = chain.map(j => jointAt(sk, j));
  // The marker's `offset` nudge is part of the teaching point (a lumbar disc
  // is at the BACK of the trunk) — the anchor follows it for the same reason.
  const off = (pose.fault && pose.fault.offset) || { x: 0, y: 0 };
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length + (off.x || 0),
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length + (off.y || 0),
  };
}
