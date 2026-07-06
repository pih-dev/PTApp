// Sanity: v2.12 1RM battery — ratio-threshold lookups + compute1RMFrozen kernel.
// Run: node scripts/sanity/sanity-1rm.mjs
// Part 2 (reducer coexistence assertions) is appended by a later task.
const chartsUrl = new URL('../../src/normCharts.js', import.meta.url).href;
const { lookupScore, compute1RMFrozen, CHARTS, CHARTS_VERSION } = await import(chartsUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// === chart-set version bumped for the new tables ===
assert(CHARTS_VERSION === 2, 'CHARTS_VERSION bumped to 2');

// === legacy keys untouched (renamed-catalog-key trap) ===
for (const k of ['pushup', 'pullup', 'invertedRow', 'squat', 'run', 'sitReach'])
  assert(!!CHARTS[k], `legacy chart key '${k}' still present`);

// === bench1rm male — ratio boundaries (t = [0.75, 1.0, 1.35, 1.65]) ===
assert(lookupScore('bench1rm', 'male', 30, 0.74).score === 1, 'bench M ratio 0.74 → 1');
assert(lookupScore('bench1rm', 'male', 30, 0.75).score === 2, 'bench M ratio 0.75 → 2 (min2 boundary)');
assert(lookupScore('bench1rm', 'male', 30, 1.0).score === 3, 'bench M ratio 1.0 → 3');
assert(lookupScore('bench1rm', 'male', 30, 1.35).score === 4, 'bench M ratio 1.35 → 4');
assert(lookupScore('bench1rm', 'male', 30, 1.65).score === 5, 'bench M ratio 1.65 → 5');
assert(lookupScore('bench1rm', 'male', 70, 1.0).score === 3, 'bench chart is age-flat (70 same as 30)');

// === female tables + other lifts — spot checks ===
assert(lookupScore('bench1rm', 'female', 30, 0.7).score === 3, 'bench F ratio 0.7 → 3');
assert(lookupScore('squat1rm', 'male', 30, 1.5).score === 3, 'squat1rm M ratio 1.5 → 3');
assert(lookupScore('squat1rm', 'female', 30, 1.85).score === 5, 'squat1rm F ratio 1.85 → 5');
assert(lookupScore('deadlift1rm', 'male', 30, 2.0).score === 3, 'deadlift M ratio 2.0 → 3 (min3 boundary)');
assert(lookupScore('deadlift1rm', 'female', 30, 0.99).score === 1, 'deadlift F ratio 0.99 → 1');

// === compute1RMFrozen — all-intermediate male ===
const f1 = compute1RMFrozen('male', 25, { bodyweightKg: 80, benchKg: 80, squatKg: 120, deadliftKg: 160 });
assert(f1.scores.bench === 3 && f1.scores.squat === 3 && f1.scores.deadlift === 3, '80kg M: 80/120/160 → 3/3/3 (ratios 1.0/1.5/2.0)');
assert(f1.liftAvg === 3 && f1.classification === 'intA', 'liftAvg 3 → intA');
assert(f1.chartsVersion === 2, 'frozen stamps chartsVersion 2');

// === decimals (2.5 kg plates) + exact classify boundary ===
const f2 = compute1RMFrozen('male', 25, { bodyweightKg: 80, benchKg: 108, squatKg: 160, deadliftKg: 200 });
assert(f2.scores.bench === 4 && f2.scores.squat === 4 && f2.scores.deadlift === 4, 'ratios 1.35/2.0/2.5 → 4/4/4');
assert(f2.liftAvg === 4 && f2.classification === 'intB', 'liftAvg exactly 4 → intB (not pro)');
const f3 = compute1RMFrozen('male', 25, { bodyweightKg: 80, benchKg: 82.5, squatKg: 120, deadliftKg: 148 });
assert(f3.scores.bench === 3, 'decimal kg accepted (82.5/80 = 1.03 → 3)');

// === null guards — never coerce null into arithmetic ===
const g1 = compute1RMFrozen('male', 25, { bodyweightKg: 0, benchKg: 80, squatKg: 120, deadliftKg: 148 });
assert(g1.scores.bench === null && g1.liftAvg === null && g1.classification === null,
  'bodyweight 0 → null scores, null classification (no divide-by-zero score)');
const g2 = compute1RMFrozen('nonbinary', 25, { bodyweightKg: 80, benchKg: 80, squatKg: 120, deadliftKg: 148 });
assert(g2.classification === null, 'unknown gender → null classification');
const g3 = compute1RMFrozen('female', 25, { bodyweightKg: 60, benchKg: null, squatKg: 70, deadliftKg: 80 });
assert(g3.scores.bench === null && g3.classification === null, 'null lift → visibly incomplete record');

console.log('sanity-1rm part 1: ALL PASS');
