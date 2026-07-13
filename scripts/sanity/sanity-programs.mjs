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

// === part 2: rules ===
const rulesUrl = new URL('../../src/programRules.js', import.meta.url).href;
const { TIERS, METHODS, DEFAULT_SEQUENCE, FAT_THRESHOLD, PROGRAM_RULES_VERSION,
        rankGroups, majorQuotas, minorQuota, dayOrder } = await import(rulesUrl);

assert(PROGRAM_RULES_VERSION === 1, 'PROGRAM_RULES_VERSION is 1');
assert(JSON.stringify(TIERS.intA) === '[14,17]' && JSON.stringify(TIERS.pro) === '[21,24]', 'tier table matches spec §3');
assert(DEFAULT_SEQUENCE.join() === 'progLoad,descPyramid,fiveOfFive,doOrDie,statoDynamic,endurance', 'default block sequence = Client X');
assert(FAT_THRESHOLD.male === 18 && FAT_THRESHOLD.female === 25, 'fat-loss thresholds 18/25');
assert(METHODS.progLoad.setPcts.join() === '55,60,70,80' && METHODS.progLoad.repsPerSet[3] === '8-10',
  'progressive load: within-session 55→80, top set 8-10 (Elie correction)');
assert(METHODS.descPyramid.setPcts[0] === 85 && METHODS.descPyramid.repsPerSet.join() === '8,12,15,18',
  'descending pyramid: heavy first set');
assert(METHODS.fiveOfFive.objective === 'strength' && METHODS.fiveOfFive.setsPerExercise === 5, '5of5 strength 5 sets');
assert(METHODS.doOrDie.pctText === '30%' && METHODS.doOrDie.restSec === 40, 'do-or-die 30% short rest');
assert(METHODS.endurance.objective === 'fatLoss', 'endurance objective');

// tie-break: equal scores ⇒ legs weakest, then pull, then bench-side strongest (Elie-confirmed)
assert(JSON.stringify(rankGroups({ bench: 3, squat: 3, deadlift: 3 })) ===
  JSON.stringify({ weak: 'legs', mid: 'pull', strong: 'push' }), 'tie-break legs > pull > push');
assert(rankGroups({ bench: 5, squat: 2, deadlift: 4 }).weak === 'legs', 'low squat ⇒ weak legs');
assert(rankGroups({ bench: 1, squat: 5, deadlift: 5 }).weak === 'push', 'low bench ⇒ weak push');

// strategy 'top' (odd blocks): weak=hi, mid=midpoint, strong=lo — intA [14,17]
const r = { weak: 'legs', mid: 'pull', strong: 'push' };
assert(JSON.stringify(majorQuotas('intA', 'top', r, false)) === JSON.stringify({ push: 14, pull: 16, legs: 17 }),
  'top strategy intA → legs 17 / pull 16 / push 14');
// strategy 'steal' (even blocks): weak=hi+2, strong=lo−2
assert(JSON.stringify(majorQuotas('intA', 'steal', r, false)) === JSON.stringify({ push: 12, pull: 16, legs: 19 }),
  'steal strategy intA → legs 19 / push 12');
// strength blocks ×¾ (Elie-approved; 16-19 → 12-14 precedent)
assert(majorQuotas('intA', 'top', r, true).legs === 13, 'strength block: 17 × ¾ → 13');
// minors ride their day's major at half (couples day emphasis automatically)
assert(minorQuota(17) === 9 && minorQuota(14) === 7, 'minor = round(major/2)');
// day order: 'top' leads with weak day; 'steal' keeps standard order
assert(dayOrder('top', r).join() === 'legs,pull,push', 'top: weak day leads');
assert(dayOrder('steal', r).join() === 'push,pull,legs', 'steal: standard order');
console.log('rules OK');
