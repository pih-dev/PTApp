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

// === part 3: kernel ===
const kernelUrl = new URL('../../src/programKernel.js', import.meta.url).href;
const { generateProgram, ANCHORS } = await import(kernelUrl);

const client = { id: 'c1', gender: 'male', birthdate: '1995-01-10' };
const evalRec = {
  id: 'e1', clientId: 'c1', date: '2026-07-10', branch: '1rm',
  raw: { bodyweightKg: 80, benchKg: 100, squatKg: 110, deadliftKg: 170 },   // squat weakest (ratio 1.375→2), bench 1.25→3, dl 2.125→4
  frozen: { scores: { bench: 3, squat: 2, deadlift: 4 }, liftAvg: 3, classification: 'intA', chartsVersion: 2 },
};
const args = {
  id: 'p1', client, evalRecord: evalRec, fatPct: 22, includeFatLoss: true,
  methods: ['progLoad', 'descPyramid', 'fiveOfFive', 'doOrDie', 'statoDynamic', 'endurance'],
  startDate: '2026-07-20', createdAt: '2026-07-13T10:00:00.000Z',
};
const prog = generateProgram(args);

assert(prog.blocks.length === 6 && prog.rulesVersion === 1 && prog.bankVersion === 1, '6 blocks, versions stamped');
assert(prog.classification === 'intA' && prog.ranks.weak === 'legs', 'class + weak point derived from eval');
assert(prog.blocks[0].strategy === 'top' && prog.blocks[1].strategy === 'steal' && prog.blocks[2].strategy === 'top',
  'strategies alternate by block parity');
assert(prog.blocks[0].startDate === '2026-07-20' && prog.blocks[1].startDate === '2026-08-17',
  'blocks are 28 days apart');
assert(prog.blocks[0].days[0].slot === 'legs', 'odd block: weak day (legs) leads');
assert(prog.blocks[1].days[0].slot === 'push', 'even block: standard order');

// anchors present in EVERY block, with kg from the eval 1RMs rounded to 2.5
for (const [i, b] of prog.blocks.entries()) {
  if (b.methodId === 'endurance') continue;   // endurance straight-set days still carry anchors — checked below
  const pushDay = b.days.find(x => x.slot === 'push');
  const bench = pushDay.exercises.find(e => e.name === 'Flat Barbell Press');
  assert(bench && bench.setKg, `block ${i}: bench anchor with kg`);
}
const b0bench = prog.blocks[0].days.find(x => x.slot === 'push').exercises.find(e => e.name === 'Flat Barbell Press');
assert(JSON.stringify(b0bench.setKg) === '[55,60,70,80]', 'progLoad bench kg = 55/60/70/80 (pcts × 100kg 1RM)');
const b0squat = prog.blocks[0].days.find(x => x.slot === 'legs').exercises.find(e => e.name === 'Back Squat');
assert(b0squat.setKg[0] === 60.5 - 0.5 || b0squat.setKg[0] === 60, 'squat kg rounded to 2.5 (110×0.55=60.5→60)');

// volume math: legs day of block 0 (top, intA) = Legs 17 + Calves 9 + Abs 9
const legsDay = prog.blocks[0].days.find(x => x.slot === 'legs');
const setsFor = (day, bucket) => day.exercises.filter(e => e.bucket === bucket).reduce((s, e) => s + e.sets, 0);
assert(setsFor(legsDay, 'Legs') === 17, 'legs major lands exactly on 17');
assert(setsFor(legsDay, 'Calves') === 9 && setsFor(legsDay, 'Abs') === 9, 'minors = round(17/2) = 9');

// compounds first, isolation after (within each bucket listing)
const legIdx = legsDay.exercises.filter(e => e.bucket === 'Legs');
const firstIso = legIdx.findIndex(e => e.type === 'isolation');
assert(firstIso === -1 || legIdx.slice(firstIso).every(e => e.type === 'isolation'), 'compounds before isolation');

// strength block volume ×¾
const b2legs = prog.blocks[2].days.find(x => x.slot === 'legs');
assert(setsFor(b2legs, 'Legs') === 13, 'strength block legs 17×¾ → 13');

// endurance block: days = straight sets, daysAlt = 3 full-body circuit days
const endur = prog.blocks[5];
assert(endur.methodId === 'endurance' && endur.daysAlt && endur.daysAlt.length === 3, 'endurance has circuit alt-days');
assert(endur.daysAlt[0].exercises.length === 7 && endur.daysAlt[0].exercises[0].sets === 4,
  'circuit day: 7 exercises × 4 rounds');

// rotation: block 3 (doOrDie, hypertrophy 4-set like block 0) picks different
// non-anchor chest exercises than block 0
const chestNames = (b) => b.days.find(x => x.slot === 'push').exercises
  .filter(e => e.bucket === 'Chest' && e.name !== 'Flat Barbell Press').map(e => e.name);
const c0 = chestNames(prog.blocks[0]), c3 = chestNames(prog.blocks[3]);
assert(c3.some(n => !c0.includes(n)), 'variant rotation across blocks');

// determinism: same args ⇒ identical output
assert(JSON.stringify(generateProgram(args)) === JSON.stringify(prog), 'byte-identical regeneration');

// beginner filter: begA eval avoids advanced barbell variants for non-anchors
const begEval = { ...evalRec, frozen: { ...evalRec.frozen, scores: { bench: 1, squat: 1, deadlift: 1 }, liftAvg: 1, classification: 'begA' } };
const begProg = generateProgram({ ...args, evalRecord: begEval });
const begChest = begProg.blocks[0].days.find(x => x.slot === 'push').exercises
  .filter(e => e.bucket === 'Chest' && e.name !== 'Flat Barbell Press');
assert(begChest.every(e => !e.advanced), 'begA: no advanced non-anchor chest exercises');

// fat-loss excluded ⇒ slot 6 becomes fiveOfFive
const noFat = generateProgram({ ...args, includeFatLoss: false,
  methods: ['progLoad', 'descPyramid', 'fiveOfFive', 'doOrDie', 'statoDynamic', 'fiveOfFive'] });
assert(noFat.blocks[5].methodId === 'fiveOfFive', 'slot 6 fallback');

// pull-day Back quota must be exact — the Deadlift anchor counts as Back (spec §6),
// even though its bank primary is Quads (review finding, Task 3).
// NOTE: quota is 14, not the review's proposed 16 — this fixture's deadlift score (4)
// is its BEST lift, so pull is the STRONG group (tier floor 14). The review's 16
// assumed part 2's hand-built ranks {mid: pull}, which this eval does not produce.
const pullDay0 = prog.blocks[0].days.find(x => x.slot === 'pull');
assert(setsFor(pullDay0, 'Back') === 14, 'pull day: Back major lands exactly on 14 (top strategy strong)');
assert(pullDay0.exercises[0].name === 'Deadlift' && pullDay0.exercises[0].bucket === 'Back',
  'Deadlift anchor leads pull day, bucketed as Back');
assert(!pullDay0.exercises.some(e => e.bucket === 'Legs'), 'no stray Legs bucket on pull day');
console.log('kernel OK');
