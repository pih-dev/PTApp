// Sanity: Arabic exercise-name map coverage (v2.14.2).
// The map is display-only content keyed by the EXACT English bank name — the
// same string frozen into program records. Three guarantees:
//   1. every bank movement has a non-empty Arabic entry (no silent English rows),
//   2. every map key matches a bank name (renamed-catalog-key trap class),
//   3. every value contains Arabic script (catches paste errors).
// Run: node scripts/sanity/sanity-exercise-names-ar.mjs
const bankUrl = new URL('../../src/exerciseBank.js', import.meta.url).href;
const mapUrl = new URL('../../src/exerciseNamesAr.js', import.meta.url).href;
const { EXERCISES } = await import(bankUrl);
const { EXERCISE_NAMES_AR, exNameAr } = await import(mapUrl);

let failed = false;
const fail = (msg) => { console.error('✗', msg); failed = true; };

const bankNames = new Set(EXERCISES.map(e => e.name));
const mapKeys = Object.keys(EXERCISE_NAMES_AR);
const arabicRe = /[؀-ۿ]/;

for (const name of bankNames) {
  const ar = EXERCISE_NAMES_AR[name];
  if (!ar || !ar.trim()) fail(`missing/empty Arabic for bank name: "${name}"`);
  else if (!arabicRe.test(ar)) fail(`no Arabic script in value for "${name}": "${ar}"`);
}
for (const key of mapKeys) {
  if (!bankNames.has(key)) fail(`stray map key (not in bank): "${key}"`);
}
if (mapKeys.length !== bankNames.size)
  fail(`map has ${mapKeys.length} keys, bank has ${bankNames.size} names`);

// helper contract
if (exNameAr('__nope__') !== null) fail('exNameAr(unknown) must return null');
if (bankNames.size && exNameAr(EXERCISES[0].name) !== EXERCISE_NAMES_AR[EXERCISES[0].name])
  fail('exNameAr(known) must return the map value');

if (failed) process.exit(1);
console.log(`✓ all ${bankNames.size} bank movements have Arabic names`);
console.log('✓ no stray keys, all values contain Arabic script, helper contract holds');
console.log('\nAll exercise-name-AR checks passed.');
