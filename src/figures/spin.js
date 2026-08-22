// ─── ROUND 4 PROTOTYPE — continuous rotation about the body's own long axis ──
//
// 🔴 PROTOTYPE. Not imported by any screen. It exists to answer ONE question
//    (figures-3d-options.md, route B): can the existing angle-authored poses
//    turn continuously without re-authoring all 44 patterns — and without the
//    failure that killed the first 3D attempt, where a WORLD-fixed lateral
//    axis tore every supine figure apart?
//
// The answer this file bets on: the rotation axis is the FIGURE'S OWN trunk
// line (pelvis → up the spine), not the world's vertical. A standing figure
// spins about the vertical, a supine one about the horizontal line of its own
// body — same code path, no special case. That is the "body-fixed frame"
// render.js's comment says round 4 needs, applied at the whole-figure level
// first; per-segment frames come later if this proves out.
//
// HOW: rebuild the chains in true 3D. The maths is skeleton()'s exactly —
// same bone lengths, same cumulative angles, sagittal plane in the picture —
// plus a real z: each limb sits at its true half-width (LATERAL.front, the
// breadth a front view shows) on its side of the sagittal plane, tapering
// distally. No screen nudge — depth is depth now, not a cue. Then every
// joint rotates about the trunk axis by θ and drops its z on projection.
//
// At θ=0 the figure is the authored side view with the limbs fractionally
// separated (true depth instead of the 0.5/0.35 nudge); at θ=90° it faces
// the camera and the sagittal detail forshortens away — real perspective,
// not an authored `fs` table.

import { BONES, LATERAL, FLOOR } from './canon.js';

const RAD = Math.PI / 180;
const down = (a) => ({ x: Math.sin(a * RAD), y: Math.cos(a * RAD) });
const up = (a) => ({ x: Math.sin(a * RAD), y: -Math.cos(a * RAD) });
const step3 = (p, dir, len) => ({ x: p.x + dir.x * len, y: p.y + dir.y * len, z: p.z });

// Distal taper of a limb's lateral offset: knees ride closer than hips, wrists
// drift no wider than shoulders. Fractions of the root joint's half-width.
const TAPER = { knee: 0.72, ankle: 0.55, toe: 0.5, elbow: 1.0, wrist: 0.95, hand: 0.95 };

// True-3D skeleton from a SIDE-authored pose (front-authored poses carry a
// baked `fs` table, which is exactly what this replaces — they re-author later).
export function skeleton3(pose) {
  const root = pose.root || { x: 0, y: 375 };
  const [aLum = 0, aTho = 0, aNck = 0] = pose.spine || [];
  const B = BONES;

  const pelvis = { x: root.x, y: root.y, z: 0 };
  const lumbar = step3(pelvis, up(aLum), B.lumbar);
  const thorax = step3(lumbar, up(aLum + aTho), B.thorax);
  const neckBase = step3(thorax, up(aLum + aTho + aNck), B.neck);
  const headAngle = aLum + aTho + aNck + (pose.head || 0);
  const head = step3(neckBase, up(headAngle), B.head);

  const spineTop = aLum + aTho + aNck;
  const out = { pelvis, lumbar, thorax, neckBase, head, headAngle, view: 'side', pose };

  for (const side of ['near', 'far']) {
    const s = side === 'near' ? 1 : -1;
    const S = side === 'near' ? 'N' : 'F';
    const wHip = LATERAL.front.hip, wSh = LATERAL.front.shoulder;

    const hip = { x: pelvis.x, y: pelvis.y, z: wHip * s };
    const [aThigh = 0, aShin = 0, aFoot = 90] = (pose.legs && pose.legs[side]) || [];
    const knee = { ...step3(hip, down(aThigh), B.thigh), z: wHip * TAPER.knee * s };
    const ankle = { ...step3(knee, down(aThigh + aShin), B.shin), z: wHip * TAPER.ankle * s };
    const toe = { ...step3(ankle, down(aThigh + aShin + aFoot), B.foot), z: wHip * TAPER.toe * s };

    // Same 12-unit drop down the spine as skeleton() — the joint is under the
    // trapezius, and the two rigs must agree at θ=0 or the turn "jumps".
    const dropX = Math.sin(spineTop * RAD) * 12, dropY = -Math.cos(spineTop * RAD) * -12;
    const shoulder = { x: neckBase.x + dropX, y: neckBase.y + dropY, z: wSh * s };
    const [aUp = 0, aFore = 0, aHand = 0] = (pose.arms && pose.arms[side]) || [];
    const elbow = { ...step3(shoulder, down(aUp), B.upperArm), z: wSh * TAPER.elbow * s };
    const wrist = { ...step3(elbow, down(aUp + aFore), B.forearm), z: wSh * TAPER.wrist * s };
    const hand = { ...step3(wrist, down(aUp + aFore + aHand), B.hand), z: wSh * TAPER.hand * s };

    Object.assign(out, {
      ['hip' + S]: hip, ['knee' + S]: knee, ['ankle' + S]: ankle, ['toe' + S]: toe,
      ['shoulder' + S]: shoulder, ['elbow' + S]: elbow, ['wrist' + S]: wrist, ['hand' + S]: hand,
    });
  }
  return out;
}

// Rotate the whole SCENE about the world VERTICAL through the pelvis — a
// turntable — then project (drop z, keep it for depth sorting).
//
// 🔴 TWO AXES, TWO LESSONS, BOTH EARNED:
//   · The LATERAL axis (which way the limbs separate) must be BODY-fixed —
//     skeleton3 does that, and it is what the reverted first attempt got wrong.
//   · The VIEWING axis must be the WORLD's vertical — a turntable. The first
//     cut of THIS file rotated about the trunk line instead, and Pierre's
//     preview showed why that is wrong: a hinged deadlift's trunk leans 55°,
//     so spinning about it hoisted the legs off the floor and the figure came
//     apart. A viewer walks AROUND a lifter; the lifter does not cartwheel.
//   Pierre's bench ruling fits the same model: the bench is on the turntable
//   too — "he's not turning around in his bed while the bed is fixed."
export function spin(sk3, theta) {
  const t = theta * RAD;
  const P = sk3.pelvis;
  const out = { headAngle: sk3.headAngle, view: sk3.view, pose: sk3.pose };
  for (const [k, v] of Object.entries(sk3)) {
    if (!v || typeof v !== 'object' || typeof v.x !== 'number') { if (!(k in out)) out[k] = v; continue; }
    out[k] = rot3(v, P, t);
  }
  return out;
}

// Turntable-rotate one 3D point about the vertical line through P.
const rot3 = (v, P, t) => {
  const vx = v.x - P.x, vz = v.z || 0;
  return { x: P.x + vx * Math.cos(t) - vz * Math.sin(t), y: v.y, z: vx * Math.sin(t) + vz * Math.cos(t) };
};

// ── Equipment on the turntable ───────────────────────────────────────────────
//
// The 2D equipment closures pick a shape per authored view (a bar seen end-on
// IS a disc), which is exactly what cannot survive a continuous turn — the
// disc Pierre called "a ball" just sat there at every angle. Here the barbell
// and the bench are 3D objects rotated by the SAME transform as the joints:
// the bar runs along the body's z through the grip, the plates ride its ends
// and flatten as they turn edge-on, the bench is a slab under the trunk.
// Prototype vocabulary: barbell + bench only — the rest keep their 2D shapes
// until this is approved.
export function spinEquip(pose, theta, gear, anchor, pitchDeg = 0) {
  const t = theta * RAD;
  const tp = pitchDeg * RAD;
  const sk = skeleton3(pose);
  const P = sk.pelvis;
  const out = [];
  // The equipment rides the SAME two rotations as the joints — yaw then
  // pitch — AND the same ground re-anchor, or the bar detaches from the hands
  // the moment the scene tilts (under yaw alone the re-anchor shift was
  // near-zero, which is why this never showed before pitch existed).
  const raw = (p) => {
    const r1 = rot3(p, P, t);
    if (!tp) return r1;
    const vy = r1.y - P.y, vz = r1.z || 0;
    return { x: r1.x, y: P.y + vy * Math.cos(tp) - vz * Math.sin(tp), z: vy * Math.sin(tp) + vz * Math.cos(tp) };
  };
  let gdx = 0, gdy = 0;
  if (pose.ground && sk[pose.ground.joint]) {
    const g0 = raw(sk[pose.ground.joint]);
    gdx = pose.ground.x != null ? pose.ground.x - g0.x : 0;
    gdy = (pose.ground.y != null ? pose.ground.y : FLOOR) - g0.y;
  }
  const pr = (p) => { const q = raw(p); return { x: q.x + gdx, y: q.y + gdy, z: q.z }; };

  if (gear === 'barbell') {
    const grip = {
      x: (sk.wristN.x + sk.handN.x) / 2, y: (sk.wristN.y + sk.handN.y) / 2, z: 0,
    };
    // Pierre's model of the object (voice note, 08-22): "it's a bar — an axis,
    // and there are bells at the ends, like SPHERES." A sphere projects to a
    // circle from every angle, which solves two judged defects at once: the
    // 90° bar no longer loses its ends, and the 0° view stops pretending to
    // be a flat plate. r stays constant through the whole turn.
    const HALF = 230, BELL_R = 62;
    const a = pr({ ...grip, z: -HALF }), b = pr({ ...grip, z: +HALF });
    const endOn = Math.hypot(b.x - a.x, b.y - a.y) <= 8;
    if (!endOn) out.push({ k: 'bar', a, b, w: 10, z: (a.z + b.z) / 2 });
    const bells = [-(HALF - 30), HALF - 30].map(zz => {
      const c = pr({ ...grip, z: zz });
      // Each bell carries its own depth so the renderer can paint the near one
      // OVER the hand — judged defect: "it looks like the sphere is transparent".
      return { k: 'circle', x: c.x, y: c.y, r: BELL_R, z: c.z };
    });
    // End-on, the far bell is fully eclipsed by the near one — drawing it
    // anyway showed through the body's translucent fill as a dark hole
    // (the 180° artifact). One bell is what the eye would see.
    out.push(...(endOn ? [bells.reduce((m, x) => (x.z > m.z ? x : m))] : bells));
  }

  if (anchor === 'bench') {
    // The slab rides under the trunk, body-fixed, and turns with it.
    const u = unit(sk.neckBase, sk.pelvis);          // down the trunk, in-picture
    const n = u.x >= 0 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x }; // toward the floor
    const seat = (along, side) => pr({
      x: P.x + u.x * along + n.x * 46, y: P.y + u.y * along + n.y * 46, z: side,
    });
    const c = [seat(-80, -64), seat(-80, 64), seat(300, 64), seat(300, -64)];
    out.push({ k: 'quad', pts: c });
  }
  return out;
}

const unit = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy) || 1;
  return { x: dx / L, y: dy / L };
};

// Ground re-anchor after the spin — the same contract skeleton() honours: the
// pose names the joint that stands on the floor and the figure translates to
// put it there, so a turned figure cannot float or sink.
export function reground(sk, pose) {
  if (!pose.ground) return sk;
  const anchor = sk[pose.ground.joint];
  if (!anchor) return sk;
  const dy = (pose.ground.y != null ? pose.ground.y : FLOOR) - anchor.y;
  const dx = pose.ground.x != null ? pose.ground.x - anchor.x : 0;
  for (const v of Object.values(sk)) {
    if (v && typeof v === 'object' && typeof v.x === 'number') { v.x += dx; v.y += dy; }
  }
  return sk;
}

// v2.30.1 (Pierre: "turning a 3D object in any direction you move"): a second
// axis. After the yaw turntable, PITCH tilts the whole scene about the
// horizontal screen axis through the pelvis — drag up peeks from above, drag
// down from below. Clamped by the CALLER (±75°) so a figure never hangs
// upside down mid-lesson.
export function pitch3(sk, deg) {
  if (!deg) return sk;
  const t = deg * RAD;
  const P = sk.pelvis;
  for (const v of Object.values(sk)) {
    if (!v || typeof v !== 'object' || typeof v.x !== 'number') continue;
    const vy = v.y - P.y, vz = v.z || 0;
    v.y = P.y + vy * Math.cos(t) - vz * Math.sin(t);
    v.z = vy * Math.sin(t) + vz * Math.cos(t);
  }
  return sk;
}

export const spunSkeleton = (pose, theta, pitch = 0) => {
  const sk = reground(pitch3(spin(skeleton3(pose), theta), pitch), pose);
  // The renderer needs the turn angle for two blends it cannot infer from
  // joints alone: girth (a body is wider than it is deep) and muscle sides.
  sk.theta = theta;
  return sk;
};
