// scripts/sanity/sanity-programs.mjs — program generation invariants.
// Run: node scripts/sanity/sanity-programs.mjs
const bankUrl = new URL('../../src/exerciseBank.js', import.meta.url).href;
const { EXERCISES, EXERCISE_BANK_VERSION, MUSCLE_GROUPS, bankForBucket } = await import(bankUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// === bank integrity ===
assert(EXERCISE_BANK_VERSION === 1, 'EXERCISE_BANK_VERSION is 1');
const names = EXERCISES.map(e => e.name.toLowerCase());
assert(new Set(names).size === names.length, 'no duplicate exercise names');
assert(!names.some(n => n.includes('hmastring')), 'typos cleaned (Hmastrings)');
for (const anchor of ['Flat Barbell Press', 'Back Squat', 'Deadlift'])
  assert(EXERCISES.some(e => e.name === anchor), `anchor present: ${anchor}`);
// every scheduled bucket has enough exercises for the largest quota (pro major
// 24 sets / 4 per exercise = 6 exercises; minors need 12/4 = 3)
for (const [slot, g] of Object.entries(MUSCLE_GROUPS)) {
  assert(bankForBucket(g.major).length >= 6, `${slot} major '${g.major}' has ≥6 exercises`);
  for (const m of g.minors)
    assert(bankForBucket(m).length >= 3, `${slot} minor '${m}' has ≥3 exercises`);
}
assert(EXERCISES.every(e => e.slot === null || ['push','pull','legs'].includes(e.slot)), 'slots are push/pull/legs/null');
console.log('bank OK');
