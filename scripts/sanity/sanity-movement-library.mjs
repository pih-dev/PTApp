#!/usr/bin/env node
// sanity-movement-library — the library can actually be searched, in both scripts.
//
// Two halves, because they are two different claims:
//   • STRUCTURAL — every bank entry is renderable by the sheet (primary is one
//     of its own muscles, type is known, Arabic exists), and every muscle the
//     bank uses has an Arabic label, so the Arabic build never silently prints
//     an English muscle name next to Arabic ones.
//   • BEHAVIOURAL — the search fold, run for real on the strings that actually
//     break `includes()`.
//
// Design record: docs/instructions-v2.21.md (feature B1).

import { EXERCISES, MUSCLE_GROUPS } from '../../src/exerciseBank.js';
import { EXERCISE_NAMES_AR } from '../../src/exerciseNamesAr.js';
import { normaliseSearch } from '../../src/utils.js';
import { muscleLabel } from '../../src/i18n.js';

let failures = 0;
const assert = (ok, label, detail) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok || detail === undefined ? '' : ` → ${detail}`}`);
  if (!ok) failures++;
};

console.log('\n[structure] every movement can be rendered by the sheet');
const badPrimary = EXERCISES.filter(e => !e.muscles.includes(e.primary));
assert(badPrimary.length === 0,
  'every primary muscle is one of the movement\'s own muscles',
  badPrimary.slice(0, 3).map(e => e.name).join(', '));

const badType = EXERCISES.filter(e => !['compound', 'isolation'].includes(e.type));
assert(badType.length === 0, 'every type is compound or isolation',
  badType.slice(0, 3).map(e => `${e.name}:${e.type}`).join(', '));

const badSlot = EXERCISES.filter(e => e.slot && !MUSCLE_GROUPS[e.slot]);
assert(badSlot.length === 0, 'every non-null slot resolves a muscle group',
  badSlot.slice(0, 3).map(e => `${e.name}:${e.slot}`).join(', '));

console.log('\n[i18n] the Arabic build never falls back mid-list');
// 🔴 A MISSING ARABIC MUSCLE IS INVISIBLE IN ENGLISH. It shows as one English
//    word sitting in a row of Arabic ones, on a screen the English-reading
//    developer never opens in Arabic.
const muscles = [...new Set(EXERCISES.flatMap(e => e.muscles))].sort();
const untranslated = muscles.filter(m => muscleLabel('ar', m) === m);
assert(untranslated.length === 0,
  `all ${muscles.length} muscles have an Arabic label`, untranslated.join(', '));

const missingAr = EXERCISES.filter(e => !EXERCISE_NAMES_AR[e.name]);
assert(missingAr.length === 0,
  `all ${EXERCISES.length} movements have an Arabic name`,
  missingAr.slice(0, 3).map(e => e.name).join(', '));

console.log('\n[search] the fold, run on the strings that actually break includes()');
const cases = [
  ['harakat are folded', 'كِيرْل', 'كيرل'],
  ['tatweel is folded', 'ـكيرلـ', 'كيرل'],
  ['alef variants fold together', 'أرجل', 'ارجل'],
  ['ya variants fold together', 'رفعى', 'رفعي'],
  ['ta marbuta folds to ha', 'رفعة', 'رفعه'],
  ['latin case is folded', 'HAMMER Curl', 'hammer curl'],
];
for (const [label, a, b] of cases) {
  assert(normaliseSearch(a) === normaliseSearch(b), label,
    `${normaliseSearch(a)} !== ${normaliseSearch(b)}`);
}

// The claim that matters end to end: an Arabic query finds Arabic entries, and
// an English query finds them too, out of the SAME index the screen builds.
const index = EXERCISES.map(e => ({
  name: e.name,
  hay: normaliseSearch([e.name, EXERCISE_NAMES_AR[e.name], e.primary, ...e.muscles].join(' ')),
}));
const find = (q) => index.filter(r => r.hay.includes(normaliseSearch(q)));
assert(find('كيرل').length > 0, 'an Arabic query returns movements', String(find('كيرل').length));
assert(find('curl').length > 0, 'an English query returns movements', String(find('curl').length));
assert(find('squat').some(r => r.name === 'Back Squat'), 'searching "squat" finds Back Squat');
assert(find('biceps').length > 0, 'searching a MUSCLE returns movements', String(find('biceps').length));
assert(find('zzzznothing').length === 0, 'a nonsense query returns nothing');

console.log(failures
  ? `\n✗ ${failures} assertion(s) FAILED — DO NOT DEPLOY.`
  : '\n✓ movement library: renderable, translated, and searchable in both scripts.');
process.exit(failures ? 1 : 0);
