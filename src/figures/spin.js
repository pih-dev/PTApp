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

// Rotate every joint about the figure's own trunk axis by theta degrees, then
// project (drop z, keep it for depth sorting). The axis runs through the
// pelvis along the lumbar direction — the body's long axis, wherever the pose
// has put it. This is the line the first 3D attempt got wrong by using the
// world's.
export function spin(sk3, theta) {
  const t = theta * RAD;
  const [aLum = 0] = (sk3.pose && sk3.pose.spine) || [];
  const a = up(aLum);                          // trunk axis, unit, in-picture
  const e1 = { x: -a.y, y: a.x };              // in-picture perpendicular
  const P = sk3.pelvis;
  const out = { headAngle: sk3.headAngle, view: sk3.view, pose: sk3.pose };
  for (const [k, v] of Object.entries(sk3)) {
    if (!v || typeof v !== 'object' || typeof v.x !== 'number') { if (!(k in out)) out[k] = v; continue; }
    const vx = v.x - P.x, vy = v.y - P.y, vz = v.z || 0;
    const par = vx * a.x + vy * a.y;           // along the axis — unchanged
    const c1 = vx * e1.x + vy * e1.y;          // perpendicular, in picture
    const c1r = c1 * Math.cos(t) - vz * Math.sin(t);
    const zr = c1 * Math.sin(t) + vz * Math.cos(t);
    out[k] = { x: P.x + a.x * par + e1.x * c1r, y: P.y + a.y * par + e1.y * c1r, z: zr };
  }
  return out;
}

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

export const spunSkeleton = (pose, theta) => reground(spin(skeleton3(pose), theta), pose);
