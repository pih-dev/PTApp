// Sanity: v2.11 evaluation system — norm-chart lookups, classification, freeze helper.
// Run: node scripts/sanity/sanity-evaluations.mjs
// Part 2 (reducer + migration assertions) is appended by a later task.
const chartsUrl = new URL('../../src/normCharts.js', import.meta.url).href;
const {
  lookupScore, classify, computeEvalFrozen,
  parseRunTime, formatRunTime, CHARTS_VERSION, CHARTS,
} = await import(chartsUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// === lookupScore — push-up male (bands 17-29 / 30-49 / 50+) ===
assert(lookupScore('pushup', 'male', 25, 8).score === 1, 'pushup M25 8 reps → 1 (below min2=9)');
assert(lookupScore('pushup', 'male', 25, 14).score === 2, 'pushup M25 14 → 2');
assert(lookupScore('pushup', 'male', 25, 15).score === 3, 'pushup M25 15 → 3 (min3 boundary)');
assert(lookupScore('pushup', 'male', 25, 27).score === 4, 'pushup M25 27 → 4');
assert(lookupScore('pushup', 'male', 25, 28).score === 5, 'pushup M25 28 → 5 (min5 boundary)');
assert(lookupScore('pushup', 'male', 49, 17).score === 4, 'pushup M49 uses 30-49 band');
assert(lookupScore('pushup', 'male', 50, 13).score === 4, 'pushup M50 uses 50+ band');
assert(lookupScore('pushup', 'male', 16, 9).score === 2, 'pushup M16 → lowest band extends down');

// === push-up female — 6-level source collapsed to 5; typo 40-49 fixed ===
assert(lookupScore('pushup', 'female', 22, 11).score === 2, 'pushup F22 11 → 2');
assert(lookupScore('pushup', 'female', 22, 12).score === 3, 'pushup F22 12 → 3');
assert(lookupScore('pushup', 'female', 22, 23).score === 4, 'pushup F22 23 → 4 (Above Av lower bound)');
assert(lookupScore('pushup', 'female', 22, 37).score === 5, 'pushup F22 37 → 5');
assert(lookupScore('pushup', 'female', 45, 18).score === 4, 'pushup F45 18 → 4 (typo band sane)');
assert(lookupScore('pushup', 'female', 70, 13).score === 4, 'pushup F70 → top band extends up');

// === pull-up — single flat band, all ages ===
assert(lookupScore('pullup', 'male', 60, 11).score === 4, 'pullup M is age-flat');
assert(lookupScore('pullup', 'female', 30, 0).score === 1, 'pullup F 0 reps → 1');
assert(lookupScore('pullup', 'female', 30, 6).score === 5, 'pullup F 6 → 5');

// === inverted row ===
assert(lookupScore('invertedRow', 'male', 30, 19).score === 3, 'row M30 19 → 3');
assert(lookupScore('invertedRow', 'male', 40, 19).score === 4, 'row M40 19 → 4 (36-50 band)');
assert(lookupScore('invertedRow', 'female', 55, 10).score === 4, 'row F55 10 → 4 (51+ band)');

// === squat male — gap values inherit the LOWER level (spec normalization rule) ===
assert(lookupScore('squat', 'male', 20, 33).score === 2, 'squat M20 33 → 2 (31-34 gap → lower)');
assert(lookupScore('squat', 'male', 20, 35).score === 3, 'squat M20 35 → 3');
assert(lookupScore('squat', 'male', 40, 34).score === 4, 'squat M40 34 → 4 (overlap resolved: min5=35)');
assert(lookupScore('squat', 'male', 40, 35).score === 5, 'squat M40 35 → 5');
assert(lookupScore('squat', 'male', 50, 12).score === 1, 'squat M50 12 → 1 (below min2=13)');

// === squat female ===
assert(lookupScore('squat', 'female', 25, 15).score === 1, 'squat F25 15 → 1 (boundary gap → lower)');
assert(lookupScore('squat', 'female', 25, 31).score === 5, 'squat F25 31 → 5');
assert(lookupScore('squat', 'female', 19, 22).score === 3, 'squat F19 → 20-29 band extends down');

// === run — time-based, 4 levels, score is null, levelKey carries the verdict ===
const run1 = lookupScore('run', 'male', 25, 330);
assert(run1.score === null && run1.levelKey === 'excellent', 'run M25 5:30 → excellent');
assert(lookupScore('run', 'male', 25, 345).levelKey === 'good', 'run M25 5:45 exact → good (excellent is strictly faster)');
assert(lookupScore('run', 'male', 25, 420).levelKey === 'good', 'run M25 7:00 → good (≤ cutoff)');
assert(lookupScore('run', 'male', 25, 520).levelKey === 'average', 'run M25 8:40 → average');
assert(lookupScore('run', 'male', 25, 541).levelKey === 'poor', 'run M25 9:01 → poor');
assert(lookupScore('run', 'female', 35, 600).levelKey === 'average', 'run F35 10:00 → average');

// === sit-and-reach — YMCA, cm past toes (negative = before toes) ===
assert(lookupScore('sitReach', 'male', 25, -3).score === 1, 'sitReach M25 -3cm → 1');
assert(lookupScore('sitReach', 'male', 25, 3).score === 3, 'sitReach M25 3cm → 3');
assert(lookupScore('sitReach', 'male', 25, 18).score === 5, 'sitReach M25 18cm → 5');
assert(lookupScore('sitReach', 'female', 25, 11).score === 3, 'sitReach F25 11cm → 3');

// === guard paths — unknown keys / bad raws return null, never a fake score ===
assert(lookupScore('unknownTest', 'male', 25, 10).score === null, 'unknown testId → null');
assert(lookupScore('pushup', 'nonbinary', 25, 10).score === null, 'unknown gender → null');
assert(lookupScore('pushup', 'male', 25, NaN).score === null, 'NaN raw → null');
assert(lookupScore('pushup', 'male', 25, null).score === null, 'null raw → null');
const frozenBadVariant = computeEvalFrozen('male', 25, 'unknownVariant',
  { pushup: 18, pull: 7, squat: 36, runSec: null, sitReachCm: null });
assert(frozenBadVariant.muscleAvg === null && frozenBadVariant.classification === null,
  'null pull score → frozen muscleAvg/classification null (not coerced to 0)');

// === classify — PT bands; thirds arithmetic ===
assert(classify(5 / 3) === 'begA', 'avg 1.67 → begA');
assert(classify(2) === 'begB', 'avg 2.0 → begB (2-2.9)');
assert(classify(11 / 3) === 'intA', 'avg 3.67 → intA');
assert(classify(4) === 'intB', 'avg exactly 4 → intB');
assert(classify(13 / 3) === 'pro', 'avg 4.33 → pro');
assert(classify(5) === 'pro', 'avg 5 → pro');
assert(classify(1) === 'begA', 'avg 1 → begA');

// === computeEvalFrozen — the ONE freeze kernel (form chips + save share it) ===
const frozen = computeEvalFrozen('male', 25, 'pullup',
  { pushup: 18, pull: 7, squat: 36, runSec: 520, sitReachCm: 3 });
assert(frozen.scores.pushup === 3 && frozen.scores.pull === 3 && frozen.scores.squat === 3,
  'frozen muscle scores 3/3/3');
assert(frozen.muscleAvg === 3 && frozen.classification === 'intA', 'avg 3.0 → intA');
assert(frozen.scores.run === 'average' && frozen.scores.sitReach === 3, 'optional tests scored');
assert(frozen.age === 25 && frozen.gender === 'male', 'lookup inputs recorded');
assert(frozen.chartsVersion === CHARTS_VERSION, 'chartsVersion stamped');

const frozen2 = computeEvalFrozen('female', 30, 'invertedRow',
  { pushup: 30, pull: 15, squat: 31, runSec: null, sitReachCm: null });
assert(frozen2.scores.pull === 4, 'pull variant routes to invertedRow chart (F30 15 → 4)');
assert(frozen2.scores.run === null && frozen2.scores.sitReach === null, 'missing optionals → null');
// pushup F30 30 → 4 (≥22), pull row F30 15 → 4 (≥15), squat F30 31 → 5 (≥30): sum 13
assert(frozen2.muscleAvg === 4.33 && frozen2.classification === 'pro',
  'avg 13/3 → stored rounded 4.33, classified on exact value → pro');

// === run time parsing ===
assert(parseRunTime('8:30') === 510, 'parseRunTime 8:30 → 510s');
assert(parseRunTime('12:05') === 725, 'parseRunTime 12:05 → 725s');
assert(parseRunTime('blah') === null && parseRunTime('') === null, 'invalid → null');
assert(formatRunTime(510) === '8:30' && formatRunTime(725) === '12:05', 'formatRunTime round-trips');

// === chart data integrity — every band has 4 ascending thresholds (3 for run, descending) ===
for (const [testId, byGender] of Object.entries(CHARTS)) {
  for (const [gender, bands] of Object.entries(byGender)) {
    for (const band of bands) {
      const n = testId === 'run' ? 3 : 4;
      assert(band.t.length === n, `${testId}/${gender} band ${band.minAge}-${band.maxAge}: ${n} thresholds`);
      const sorted = [...band.t].sort((a, b) => a - b);
      assert(JSON.stringify(sorted) === JSON.stringify(band.t),
        `${testId}/${gender} band ${band.minAge}-${band.maxAge}: thresholds ascending`);
    }
  }
}

console.log('\nAll normCharts assertions passed.');

// === Part 2a: schema v5 — migration + merge (appended after the normCharts block) ===
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { mergeData, baseReducer } = await import(utilsUrl);

// migrateData is private — exercise it through mergeData(local, remote), which migrates
// the remote blob by its OWN version (v2.10.1 behavior, already covered by
// sanity-merge-migration.mjs for v<4 shapes).
const v4blob = {
  _dataVersion: 4, _lastModified: '2026-06-01T00:00:00.000Z',
  clients: [{ id: 'c1', name: 'Test One', nickname: 'Test', phone: '+961 1', packages: [
    { id: 'pkg_x', start: '2026-06-01', end: null, periodUnit: 'month', periodValue: 1,
      contractSize: null, sessionCountOverride: null, notes: '', closedAt: null, closedBy: null }],
    _modified: '2026-06-01T00:00:00.000Z' }],
  sessions: [], todos: [], auditLog: [], messageTemplates: {},
};
const localV5 = {
  _dataVersion: 5, _lastModified: '2026-06-10T00:00:00.000Z',
  clients: [], sessions: [], todos: [], auditLog: [], messageTemplates: {},
  evaluations: [{ id: 'e1', clientId: 'c9', date: '2026-06-10', branch: 'mass',
    pullVariant: 'pullup', raw: { pushup: 10, pull: 3, squat: 20, runSec: null, sitReachCm: null },
    frozen: { age: 30, gender: 'male', scores: { pushup: 2, pull: 2, squat: 2, run: null, sitReach: null },
      muscleAvg: 2, classification: 'begB', chartsVersion: 1 },
    _modified: '2026-06-10T00:00:00.000Z' }],
};
const merged = mergeData(localV5, v4blob);
assert(Array.isArray(merged.evaluations) && merged.evaluations.length === 1,
  'merge v5-local + v4-remote: local evaluations survive');
assert(merged._dataVersion === 5, 'merged blob is v5');
assert(merged.clients.length === 1, 'remote client unions in');

// Two devices each holding different evals → union, newer _modified wins on collision
const remoteV5 = JSON.parse(JSON.stringify(localV5));
remoteV5.evaluations = [
  { ...localV5.evaluations[0], _modified: '2026-06-11T00:00:00.000Z',
    raw: { ...localV5.evaluations[0].raw, pushup: 11 } },
  { ...localV5.evaluations[0], id: 'e2', _modified: '2026-06-09T00:00:00.000Z' },
];
const merged2 = mergeData(localV5, remoteV5);
assert(merged2.evaluations.length === 2, 'eval union by ID');
assert(merged2.evaluations.find(ev => ev.id === 'e1').raw.pushup === 11,
  'newer _modified wins per record');

console.log('\nAll migration/merge assertions passed.');
