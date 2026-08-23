// Sanity: the exercise figures (B2), now covering all 340 movements.
//
// Judging the drawing is a human job and the contact sheet exists for it. What
// this file protects is the set of rules that fail SILENTLY — a movement no
// archetype covers (a sheet that simply shows nothing), a pair whose halves no
// longer share bone lengths (the §7.13 rule that makes the pair mean anything),
// a colour literal smuggled into an asset, a path full of NaN (which renders as
// nothing and looks like "no figure yet"), or an injury line that has drifted
// back into naming a diagnosis.
//
//   node scripts/sanity/sanity-figures.mjs   → exit 0 pass, 1 fail

import { EXERCISES } from '../../src/exerciseBank.js';
import { ARCHETYPES } from '../../src/figures/archetypes.js';
import { archetypeFor } from '../../src/figures/classify.js';
import { figureFor, ALL_FIGURES } from '../../src/figures/poses.js';
import { FIGURE_TEXT_PATTERNS, figureText } from '../../src/figureText.js';
import { figureSvg } from '../../src/figures/svg.js';
import { skeleton, BONES, FLOOR } from '../../src/figures/canon.js';

let fail = 0;
const bad = (m) => { console.error('FAIL: ' + m); fail++; };
const ids = Object.keys(ARCHETYPES);

// 1. 🔴 EVERY MOVEMENT IN THE BANK IS COVERED. A library with holes reads as
//    broken rather than as progress (HANDOFF-figures §8), and an unclassified
//    movement fails silently — the sheet just shows no figure.
const uncovered = EXERCISES.filter(e => !ARCHETYPES[archetypeFor(e.name)]).map(e => e.name);
if (uncovered.length) bad(`${uncovered.length} movement(s) have no archetype: ${uncovered.slice(0, 6).join(', ')}`);

// 2. Every archetype ships a pair, only the fault half marks a joint, and every
//    archetype has text. An archetype with no fault teaches nothing.
for (const id of ids) {
  const a = ARCHETYPES[id];
  if (!a.correct || !a.fault) bad(`archetype "${id}" is missing half of its pair`);
  if (a.correct && a.correct.fault) bad(`archetype "${id}" marks an injury on the CORRECT figure`);
  if (!a.faultJoint || !a.faultJoint.joints || !a.faultJoint.joints.length) bad(`archetype "${id}" marks no joint on its fault figure`);
  if (!a.guide || !a.guide.joints || !a.guide.joints.length) bad(`archetype "${id}" has no posture line`);
  if (!FIGURE_TEXT_PATTERNS.includes(id)) bad(`archetype "${id}" has no text`);
}
for (const p of FIGURE_TEXT_PATTERNS) {
  if (!ARCHETYPES[p]) bad(`figureText has an entry for "${p}", which is not an archetype`);
}

// 3. 🔴 THE PAIR RULE (brief §7.13): the two figures of one movement must share
//    bone lengths exactly. Poses can only supply angles, so the only way to
//    break it is a mismatched `fs` — which is what this checks.
for (const id of ids) {
  const a = ARCHETYPES[id];
  const cfs = { ...(a.base.fs || {}), ...(a.correct.fs || {}) };
  const ffs = { ...(a.base.fs || {}), ...(a.fault.fs || {}) };
  for (const k of new Set([...Object.keys(cfs), ...Object.keys(ffs)])) {
    const x = cfs[k] === undefined ? 1 : cfs[k];
    const y = ffs[k] === undefined ? 1 : ffs[k];
    if (x !== y) bad(`"${id}" foreshortens ${k} differently between correct (${x}) and fault (${y}) — a bone-length change in disguise`);
  }
  const cv = a.correct.view || a.base.view, fv = a.fault.view || a.base.view;
  if (cv !== fv) bad(`"${id}" draws its pair from two different cameras`);
}

// 4. Every one of the 340 renders: joints finite, no NaN in the path data, and
//    🔴 NO COLOUR LITERAL — a hex value belongs to ONE skin and breaks the other.
const all = ALL_FIGURES();
let rendered = 0;
for (const [name, pair] of Object.entries(all)) {
  for (const kind of ['correct', 'fault', 'extra']) {
    const pose = kind === 'extra' ? (pair.extra && pair.extra.pose) : pair[kind];
    if (!pose) continue;
    const sk = skeleton(pose);
    for (const [k, v] of Object.entries(sk)) {
      if (v && typeof v === 'object' && typeof v.x === 'number' && (!isFinite(v.x) || !isFinite(v.y))) {
        bad(`"${name}" ${kind}: joint ${k} is not a finite point`);
      }
    }
    const svg = figureSvg(pose);
    if (/NaN|Infinity|undefined/.test(svg)) bad(`"${name}" ${kind}: the SVG contains NaN/undefined`);
    if (svg.length < 800) bad(`"${name}" ${kind}: SVG suspiciously short (${svg.length} bytes) — a limb probably failed`);
    const literals = svg.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g);
    if (literals) bad(`"${name}" ${kind}: hardcoded colour(s) ${literals.join(', ')}`);
  }
  rendered++;
}
if (rendered !== EXERCISES.length) bad(`only ${rendered} of ${EXERCISES.length} movements produced a figure`);

// 5. 🔴 THE INJURY LINE SAYS WHAT THE POSITION DOES, NEVER WHAT IT CAUSES.
//    Added after an adversarial review found eight different strength-of-evidence
//    phrasings across seven entries, none checkable and several wrong. A named
//    pathology invites a member to self-diagnose; an evidence-grade adverb makes
//    a claim about a population this file has no source for. Both are build
//    failures, so the next 44 patterns cannot quietly reintroduce them.
const BANNED_GRADE = /\b(documented|classic|long-established|well-established|proven|clinically)\b/i;
const BANNED_PATHOLOGY = /\b(ACL|MCL|labrum|labral|meniscus|meniscal|impingement|herniat\w*|tendinopathy|tendinitis|bursitis|spondylo\w*)\b/i;
for (const p of FIGURE_TEXT_PATTERNS) {
  for (const lang of ['en', 'ar']) {
    const t = figureText('', lang, p);
    for (const field of ['flaw', 'injury', 'cue', 'extra']) {
      const v = t[field];
      if (field !== 'extra' && !v) { bad(`figureText "${p}" (${lang}) is missing ${field}`); continue; }
      if (!v) continue;
      if (v.length > 260) bad(`figureText "${p}" (${lang}) ${field} is ${v.length} chars — one sentence, not a paragraph`);
      if (lang !== 'en') continue;
      const g = v.match(BANNED_GRADE);
      if (g) bad(`figureText "${p}" ${field}: "${g[0]}" asserts an evidence grade this file cannot source`);
      const path = v.match(BANNED_PATHOLOGY);
      if (path) bad(`figureText "${p}" ${field}: names the pathology "${path[0]}" — say what the position DOES`);
    }
  }
}

// 5b. 🔴 FAULT MUSCLES (brief §5): an archetype that declares them must name
//     only anchors the renderer knows — a typo paints NOTHING, silently, and
//     the fault half falls back to looking exactly like the bug this feature
//     fixes. And a declaration identical to nothing (empty) is a lie of its own.
import { MUSCLE_ANCHORS } from '../../src/figures/canon.js';
for (const id of ids) {
  const fm = ARCHETYPES[id].faultMuscles;
  if (!fm) continue;
  const keys = [...(fm.primary || []), ...(fm.secondary || [])];
  if (!keys.length) bad(`"${id}" declares empty faultMuscles — drop the field instead`);
  for (const k of keys) {
    if (!MUSCLE_ANCHORS[k]) bad(`"${id}" faultMuscles names "${k}", which is not a muscle anchor`);
  }
  // The declaration must actually CHANGE the fault half for at least one
  // movement of the pattern, or it is dead weight.
  const ex = EXERCISES.find(e => archetypeFor(e.name) === id);
  if (ex) {
    const pair = figureFor(ex.name);
    if (pair && figureSvg(pair.correct).replace(/fg\d+/g, 'fg') === figureSvg(pair.fault).replace(/fg\d+/g, 'fg')) {
      bad(`"${id}" declares faultMuscles but its halves still render identically`);
    }
  }
}

// 5c. JOINT RANGE OF MOTION — warn-first (CCHealth audit 2026-08-22). Poses are
//     cumulative per-segment degrees, so each entry IS the relative joint angle.
//     Bounds are generous drawing tolerances, not physiotherapy: the job is to
//     catch an elbow bending backwards or a spine folded double, not to referee
//     flexibility. 🔴 WARN, NOT FAIL, until Pierre reviews the current warnings:
//     the shipped art contains values a strict gate would reject (chest-press
//     fault elbow = 180°), and blocking the build on shipped art helps nobody.
//     Front-view lateral angles are judged on magnitude only (the far side is a
//     mirrored negation by convention).
const ROM = { lumbar: [-130, 105], thoraxRel: [-50, 50], neckRel: [-50, 50], knee: [-175, 30], elbow: [-25, 185] };
const inR = (v, [lo, hi]) => v >= lo && v <= hi;
let romWarn = 0;
for (const id of ids) {
  const a = ARCHETYPES[id];
  for (const kind of ['correct', 'fault']) {
    const p = { ...a.base, ...a[kind] };
    const front = (p.view || 'side') === 'front';
    if (p.spine) {
      if (!inR(p.spine[0], ROM.lumbar)) { console.warn(`ROM: "${id}" ${kind} lumbar ${p.spine[0]}°`); romWarn++; }
      if (!inR(p.spine[1], ROM.thoraxRel)) { console.warn(`ROM: "${id}" ${kind} thorax ${p.spine[1]}°`); romWarn++; }
      if (!inR(p.spine[2], ROM.neckRel)) { console.warn(`ROM: "${id}" ${kind} neck ${p.spine[2]}°`); romWarn++; }
    }
    for (const [limb, key, range] of [['legs', 1, ROM.knee], ['arms', 1, ROM.elbow]]) {
      // 🔴 A FRONT VIEW CARRIES NO KNEE ANGLE. legs[1] there is a LATERAL angle
      //    — the mirrored pair that brings a splayed shin back under the body —
      //    so measuring it against a sagittal knee range is meaningless. It was
      //    doing exactly that via Math.abs and generating half the warnings in
      //    this list, which is how the ONE real violation (lunge, +74°) sat in
      //    the noise from the day the gate was written until Pierre spotted the
      //    backward knee himself on 2026-08-23.
      if (front && limb === 'legs') continue;
      for (const side of ['near', 'far']) {
        const seg = p[limb] && p[limb][side];
        if (!seg) continue;
        const v = front ? Math.abs(seg[key]) : seg[key];
        if (!inR(v, range)) { console.warn(`ROM: "${id}" ${kind} ${limb}.${side}[${key}] = ${seg[key]}°`); romWarn++; }
      }
    }
  }
}
if (romWarn) console.warn(`ROM: ${romWarn} warning(s) — human judging, not build failures (yet)`);

// 5d. 🔴 THE KNEE BENDS ONE WAY. Pierre, 2026-08-23, on the showcase wall: "it
//     bends the opposite [of] what a human being would bend his knee." The
//     lunge's rear leg had shipped at shin +74° — the shin swung ANTERIORLY,
//     which is the one thing a knee cannot do.
//
//     Scoped to UPRIGHT SIDE VIEWS on purpose, and the limit is honest rather
//     than convenient: the pose format carries no "which way is the belly
//     facing" flag, and the prone/supine patterns are authored by flipping limb
//     signs, so posterior cannot be derived from the spine for them. Where the
//     trunk is within 60° of upright the convention is unambiguous — flexion is
//     negative — and that covers every standing, hinged and seated pattern,
//     which is where the defect lived. Lying patterns stay a human judgement.
const UPRIGHT = 60;      // |lumbar| beyond this and the sign convention flips
const KNEE_SOFT = 6;     // a drawn leg may sit a couple of degrees past straight
const KNEE_HARD = 20;    // nothing anatomical needs this much hyperextension
let kneeWarn = 0;
for (const id of ids) {
  const a = ARCHETYPES[id];
  for (const kind of ['correct', 'fault']) {
    const p = { ...a.base, ...a[kind] };
    if ((p.view || 'side') === 'front' || !p.legs) continue;
    if (Math.abs((p.spine && p.spine[0]) || 0) > UPRIGHT) continue;
    for (const side of ['near', 'far']) {
      const shin = p.legs[side] && p.legs[side][1];
      if (shin == null || shin <= KNEE_SOFT) continue;
      const where = `"${id}" ${kind} legs.${side} shin +${shin}°`;
      if (shin >= KNEE_HARD) bad(`${where} — the knee bends BACKWARD (flexion is negative in an upright side view)`);
      else { console.warn(`KNEE: ${where} — past straight; judge it`); kneeWarn++; }
    }
  }
}
if (kneeWarn) console.warn(`KNEE: ${kneeWarn} leg(s) slightly past straight`);

// 5e. 🔴 A FIGURE STANDS ON THE FLOOR, IT DOES NOT SINK THROUGH IT. A pose names
//     ONE grounded joint and the whole figure is translated to put it there — so
//     if that joint belongs to a limb that is in the AIR, every other contact
//     point lands wherever the arithmetic drops it. hip-extension anchored the
//     KICKING foot and its support leg finished 40 units under the baseline
//     (found 2026-08-23 by scanning, never by looking). Warn-only: several
//     shipped patterns are drawn on a pad or a bench and are owed a framing
//     round anyway (HANDOFF-figures §0, the 10 edge-clippers).
const CONTACT = ['toeN', 'toeF', 'ankleN', 'ankleF', 'kneeN', 'kneeF', 'handN', 'handF',
  'wristN', 'wristF', 'elbowN', 'elbowF', 'pelvis', 'thorax', 'neckBase'];
const SINK = 12;
let sunk = 0;
for (const id of ids) {
  const a = ARCHETYPES[id];
  for (const kind of ['correct', 'fault']) {
    const sk = skeleton({ ...a.base, ...a[kind] });
    const below = CONTACT.filter(j => sk[j] && sk[j].y > FLOOR + SINK)
      .map(j => `${j} ${Math.round(sk[j].y - FLOOR)}`);
    if (below.length) { console.warn(`FLOOR: "${id}" ${kind} below the baseline — ${below.join(', ')}`); sunk++; }
  }
}
if (sunk) console.warn(`FLOOR: ${sunk} pose(s) with a joint under the baseline`);

// 6. The canon is the canon: the hip at half standing height is the ratio that
//    was wrong first time round and the one a careless edit would break again.
const stand = skeleton({ view: 'side', spine: [0, 0, 0], legs: { near: [0, 0, 90], far: [0, 0, 90] } });
if (Math.abs(stand.pelvis.y - 375) > 1) bad(`the hip is at ${stand.pelvis.y}, not half of standing height — the infant ratio is back`);
if (Math.abs((BONES.lumbar + BONES.thorax + BONES.neck) - 240) > 1) bad('the torso is no longer 2.4 heads');

// 7. A spot check that composition actually varies per movement: two movements
//    sharing a pattern must still differ, or the whole "compose, do not
//    duplicate" design has quietly collapsed into one drawing repeated 340 times.
const bb = figureFor('Barbell Curl'), db = figureFor('Seated Dumbbell Curl');
if (bb && db && figureSvg(bb.correct) === figureSvg(db.correct)) {
  bad('Barbell Curl and Seated Dumbbell Curl render identically — equipment is not composing');
}

console.log(fail === 0
  ? `PASS: ${EXERCISES.length} movements over ${ids.length} patterns, ${FIGURE_TEXT_PATTERNS.length} text entries, canon intact`
  : `${fail} failure(s)`);
process.exit(fail === 0 ? 0 : 1);
