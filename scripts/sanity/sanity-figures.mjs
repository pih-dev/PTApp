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
import { skeleton, BONES } from '../../src/figures/canon.js';

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
