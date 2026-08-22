// Sanity: the exercise figures (B2).
//
// These are the assertions that cannot be made by looking. Judging the drawing
// is a human job and the preview sheet exists for it; what this file protects is
// the set of rules that would fail SILENTLY — a figure keyed to a movement that
// is not in the bank (nobody can ever reach it), a pair whose two halves no
// longer share bone lengths (the §7.13 rule that makes the pair mean anything),
// a colour literal smuggled into an asset, or a path full of NaN, which renders
// as nothing at all and looks like "no figure yet".
//
//   node scripts/sanity/sanity-figures.mjs   → exit 0 pass, 1 fail

import { EXERCISES } from '../../src/exerciseBank.js';
import { FIGURES } from '../../src/figures/poses.js';
import { FIGURE_TEXT_NAMES, figureText } from '../../src/figureText.js';
import { figureSvg } from '../../src/figures/svg.js';
import { skeleton, BONES } from '../../src/figures/canon.js';

let fail = 0;
const bad = (m) => { console.error('FAIL: ' + m); fail++; };
const names = Object.keys(FIGURES);

// 1. Every figure key is a real bank entry.
const bank = new Set(EXERCISES.map(e => e.name));
for (const n of names) if (!bank.has(n)) bad(`"${n}" is not in the exercise bank — the figure is unreachable`);

// 2. Every figure has both halves of the pair, and only the fault half marks a joint.
for (const n of names) {
  const p = FIGURES[n];
  if (!p.correct || !p.fault) bad(`"${n}" is missing half of its pair`);
  if (p.correct.fault) bad(`"${n}" marks an injury on the CORRECT figure`);
  // A third figure is an EXTRA CAMERA ON A SECOND FAULT, not a decorative
  // angle: if it marks nothing it is teaching nothing and should not exist.
  if (p.extra && !p.extra.pose?.fault?.joints?.length) bad(`"${n}" has an extra figure that marks no joint`);
  if (p.extra && !p.extra.labelKey) bad(`"${n}" has an extra figure with no caption key`);
  if (!p.fault.fault || !p.fault.fault.joints?.length) bad(`"${n}" has a fault figure with nothing marked — the pair teaches nothing`);
}

// 3. 🔴 THE PAIR RULE (brief §7.13): the two figures of one movement must share
//    bone lengths exactly. Poses can only supply angles, so the only way to
//    break it is a mismatched `fs`, which is what this checks.
for (const n of names) {
  const { correct, fault } = FIGURES[n];
  const keys = new Set([...Object.keys(correct.fs || {}), ...Object.keys(fault.fs || {})]);
  for (const k of keys) {
    const a = correct.fs?.[k] ?? 1, b = fault.fs?.[k] ?? 1;
    if (a !== b) bad(`"${n}" foreshortens ${k} differently between correct (${a}) and fault (${b}) — that is a bone-length change in disguise`);
  }
  if (correct.view !== fault.view) bad(`"${n}" draws its pair from two different cameras`);
}

// 4. Every joint resolves and no coordinate is NaN. A NaN slips into the path
//    string, the browser drops the whole path, and the figure silently vanishes.
for (const n of names) {
  for (const kind of ['correct', 'fault', 'extra']) {
    if (kind === 'extra' && !FIGURES[n].extra) continue;
    const pose = kind === 'extra' ? FIGURES[n].extra.pose : FIGURES[n][kind];
    const sk = skeleton(pose);
    for (const [k, v] of Object.entries(sk)) {
      if (v && typeof v === 'object' && typeof v.x === 'number' && (!isFinite(v.x) || !isFinite(v.y))) {
        bad(`"${n}" ${kind}: joint ${k} is not a finite point`);
      }
    }
    const svg = figureSvg(pose);
    if (/NaN|Infinity|undefined/.test(svg)) bad(`"${n}" ${kind}: the SVG contains NaN/undefined`);
    if (svg.length < 800) bad(`"${n}" ${kind}: the SVG is suspiciously short (${svg.length} bytes) — a limb probably failed to build`);

    // 5. 🔴 NO COLOUR LITERAL IN AN ASSET. A hex value belongs to ONE skin and
    //    breaks the other; the figures paint from currentColor and --anatomy.
    const literals = svg.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g);
    if (literals) bad(`"${n}" ${kind}: hardcoded colour(s) ${literals.join(', ')} in the SVG`);
  }
}

// 5b. 🔴 THE INJURY LINE SAYS WHAT THE POSITION DOES, NEVER WHAT IT CAUSES.
//     Added 2026-08-22 after an adversarial review found eight different
//     strength-of-evidence phrasings across seven entries, none checkable and
//     several wrong. A named pathology invites a member to self-diagnose; an
//     evidence-grade adverb makes a claim about a population that this file has
//     no source for. Both are now build failures, so the next 333 entries
//     cannot quietly reintroduce them.
const BANNED_GRADE = /\b(documented|classic|long-established|well-established|proven|clinically)\b/i;
const BANNED_PATHOLOGY = /\b(ACL|MCL|labrum|labral|meniscus|meniscal|impingement|herniat\w*|tendinopathy|tendinitis|bursitis|spondylo\w*)\b/i;
for (const n of FIGURE_TEXT_NAMES) {
  const t = figureText(n, 'en');
  for (const field of ['flaw', 'injury', 'cue', 'extra']) {
    const v = t[field];
    if (!v) continue;
    const g = v.match(BANNED_GRADE);
    if (g) bad(`figureText "${n}" ${field}: "${g[0]}" asserts an evidence grade this file cannot source`);
    const path = v.match(BANNED_PATHOLOGY);
    if (path) bad(`figureText "${n}" ${field}: names the pathology "${path[0]}" — say what the position DOES, not what it causes`);
  }
}

// 6. The clinical text is keyed to figures that exist, carries both languages,
//    and stays one sentence. Long text is not a style problem: nobody reads a
//    paragraph between sets, so a cue that needs one is a cue that failed.
for (const n of FIGURE_TEXT_NAMES) {
  if (!FIGURES[n]) bad(`figureText has an entry for "${n}", which has no figure`);
  for (const lang of ['en', 'ar']) {
    const t = figureText(n, lang);
    for (const field of ['flaw', 'injury', 'cue']) {
      if (!t[field]) bad(`figureText "${n}" (${lang}) is missing ${field}`);
      else if (t[field].length > 200) bad(`figureText "${n}" (${lang}) ${field} is ${t[field].length} chars — one sentence, not a paragraph`);
    }
  }
}

// 7. The canon is the canon: the hip at half standing height is the ratio that
//    was wrong first time round and the one a careless edit would break again.
const stand = skeleton({ view: 'side', spine: [0, 0, 0], legs: { near: [0, 0, 90], far: [0, 0, 90] } });
const standingHeight = 750;
if (Math.abs(stand.pelvis.y - standingHeight / 2) > 1) bad(`the hip is at ${stand.pelvis.y}, not half of standing height (375) — the infant ratio is back`);
if (Math.abs((BONES.lumbar + BONES.thorax + BONES.neck) - 240) > 1) bad('the torso is no longer 2.4 heads');

console.log(fail === 0
  ? `PASS: ${names.length} figure pairs, ${FIGURE_TEXT_NAMES.length} text entries, canon intact`
  : `${fail} failure(s)`);
process.exit(fail === 0 ? 0 : 1);
