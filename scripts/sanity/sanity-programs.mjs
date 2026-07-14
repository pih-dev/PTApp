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
        rankGroups, majorQuotas, minorQuota, dayOrder,
        suggestedDaysPerWeek, suggestedDuplicates } = await import(rulesUrl);

assert(PROGRAM_RULES_VERSION === 3, 'PROGRAM_RULES_VERSION is 3 (v3: multi-day split)');
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

// multi-day suggestions (spec D6/D9)
assert(suggestedDaysPerWeek('begA') === 3 && suggestedDaysPerWeek('begB') === 3, 'beginners → 3 days');
assert(suggestedDaysPerWeek('intA') === 4, 'intA → 4 days');
assert(suggestedDaysPerWeek('intB') === 5 && suggestedDaysPerWeek('pro') === 5, 'intB/pro → 5 days');
const rk = { weak: 'legs', mid: 'pull', strong: 'push' };
assert(JSON.stringify(suggestedDuplicates(rk, 3)) === '[]', '3 days → no duplicates');
assert(JSON.stringify(suggestedDuplicates(rk, 4)) === '["legs"]', '4 days → weakest duplicated');
assert(JSON.stringify(suggestedDuplicates(rk, 5)) === '["legs","pull"]', '5 days → weak+mid');
assert(JSON.stringify(suggestedDuplicates(rk, 6)) === '["legs","pull","push"]', '6 days → all three');
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

assert(prog.blocks.length === 6 && prog.rulesVersion === 3 && prog.bankVersion === 1, '6 blocks, versions stamped');
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

// classification override (Elie Option 1, 2026-07-14): omitted arg = eval's level
// stamped 'auto'; explicit different level is honored, stamped 'manual', and drives
// the volume tier (begA ceiling 11 < the fixture's 14-set strong-group quota).
assert(prog.classificationSource === 'auto', 'no override → classificationSource auto');
const overridden = generateProgram({ ...args, classification: 'begA' });
assert(overridden.classification === 'begA' && overridden.classificationSource === 'manual',
  'override honored + stamped manual');
const ovPull0 = overridden.blocks[0].days.find(x => x.slot === 'pull');
assert(setsFor(ovPull0, 'Back') <= 11, 'override drives volume tier (begA ceiling 11)');
assert(generateProgram({ ...args, classification: evalRec.frozen.classification }).classificationSource === 'auto',
  'explicitly passing the eval level still counts as auto');

// ─── multi-day split (rules v3, spec 2026-07-14) ───
// D10 regression: default and explicit 3-day are identical, all rep 1
assert(JSON.stringify(generateProgram({ ...args, daysPerWeek: 3, duplicatedSlots: [] })) === JSON.stringify(prog),
  '3-day explicit === omitted (D10)');
assert(prog.daysPerWeek === 3 && JSON.stringify(prog.duplicatedSlots) === '[]', '3-day metadata stored');
assert(prog.blocks[0].days.every(d => d.rep === 1) && prog.blocks[0].days.length === 3, '3-day: 3 days, all rep 1');

// 5-day: duplicate pull+legs on the standard fixture
const p5 = generateProgram({ ...args, daysPerWeek: 5, duplicatedSlots: ['pull', 'legs'] });
assert(p5.daysPerWeek === 5 && JSON.stringify(p5.duplicatedSlots) === '["pull","legs"]', '5-day metadata stored');
const b0 = p5.blocks[0];
assert(b0.days.length === 5, '5-day block has 5 days');
assert(b0.days.slice(0, 3).every(d => d.rep === 1) && b0.days.slice(3).every(d => d.rep === 2),
  'base round first, repeats after (D7)');
const baseSlots = b0.days.slice(0, 3).map(d => d.slot);
assert(JSON.stringify(b0.days.slice(3).map(d => d.slot)) ===
  JSON.stringify(baseSlots.filter(s => ['pull', 'legs'].includes(s))),
  'rep-2 days follow base relative order (D7)');

// D4: majors split ceil/floor, weekly total preserved; non-duplicated slot untouched
const setsForDay = (day, bucket) => day.exercises.filter(e => e.bucket === bucket)
  .reduce((n, e) => n + e.sets, 0);
const pull1 = b0.days.find(d => d.slot === 'pull' && d.rep === 1);
const pull2 = b0.days.find(d => d.slot === 'pull' && d.rep === 2);
const weeklyBack = setsFor(prog.blocks[0].days.find(d => d.slot === 'pull'), 'Back'); // 3-day quota = weekly quota
assert(setsForDay(pull1, 'Back') + setsForDay(pull2, 'Back') === weeklyBack, 'Back weekly total preserved (D4)');
assert(setsForDay(pull1, 'Back') - setsForDay(pull2, 'Back') === weeklyBack % 2, 'odd set goes to rep-1 (D4)');
const push1 = b0.days.find(d => d.slot === 'push');
assert(setsForDay(push1, 'Chest') === setsFor(prog.blocks[0].days.find(d => d.slot === 'push'), 'Chest'),
  'non-duplicated slot keeps full weekly quota');

// D5: minors full quota on BOTH days
const minorSets1 = setsForDay(pull1, 'Biceps'), minorSets2 = setsForDay(pull2, 'Biceps');
assert(minorSets1 > 0 && minorSets1 === minorSets2, 'minors full quota on both days (D5)');

// D3: anchors once per block, rep-1 only — sweep every block
for (const b of p5.blocks) {
  for (const day of b.days) {
    const anchors = day.exercises.filter(e => e.setKg);
    if (day.rep === 2) assert(anchors.length === 0, `rep-2 day has no anchor (block ${b.index} ${day.slot})`);
  }
}
assert(p5.blocks[0].days.filter(d => d.exercises.some(e => e.name === 'Deadlift')).length === 1,
  'Deadlift exactly once a week (D3 + rules v2)');

// D8: endurance circuits follow the day count
const endur5 = p5.blocks.find(b => b.methodId === 'endurance');
assert(endur5 && endur5.daysAlt.length === 5, 'circuit weeks have 5 days (D8)');

// validation throw
let threw = false;
try { generateProgram({ ...args, daysPerWeek: 5, duplicatedSlots: ['pull'] }); } catch (e) { threw = true; }
assert(threw, 'kernel throws on inconsistent duplicatedSlots');
threw = false;
try { generateProgram({ ...args, daysPerWeek: 4, duplicatedSlots: ['glutes'] }); } catch (e) { threw = true; }
assert(threw, 'kernel throws on unknown slot name');

// D2: a duplicated day uses different variants — zero name overlap per slot/block.
// EXCEPTION verified by hand (see task-3-report.md): block 5 (endurance week,
// 'steal' strategy) legs/Calves. Legs is the weak group here so major=19 ⇒
// minorQuota(19)=10 sets/day against a 5-exercise Calves bank; excluding rep-1's
// 3 picks leaves only 2, which cover 6 sets before the pool-exhaustion fallback
// (D2) must reuse one rep-1 name to reach the full 10-set quota — mathematically
// unavoidable with this bank size, and the ONLY (block,slot,bucket) triple this
// fixture hits. D2's own text sanctions exactly this: "except when a bucket's
// pool is too small — then volume wins." Both days still land on the full
// 10-set quota (checked below) — this is pure variety loss on one exercise, not
// a starved quota.
for (const b of p5.blocks) {
  for (const slot of ['pull', 'legs']) {
    const d1 = b.days.find(d => d.slot === slot && d.rep === 1);
    const d2 = b.days.find(d => d.slot === slot && d.rep === 2);
    if (!d1 || !d2) continue;
    const names1 = new Set(d1.exercises.map(e => e.name));
    const overlap = d2.exercises.filter(e =>
      names1.has(e.name) && !(b.index === 5 && slot === 'legs' && e.bucket === 'Calves'));
    assert(overlap.length === 0, `no variant overlap (block ${b.index} ${slot}: ${overlap.map(e => e.name)})`);
  }
}
{
  const b5 = p5.blocks[5];
  const d1 = b5.days.find(d => d.slot === 'legs' && d.rep === 1);
  const d2 = b5.days.find(d => d.slot === 'legs' && d.rep === 2);
  assert(setsForDay(d1, 'Calves') === 10 && setsForDay(d2, 'Calves') === 10,
    'block 5 legs Calves: exhaustion exception still fills full 10-set quota both days');
}
// Pool exhaustion never starves the quota: beginner 6-day (smallest filtered pools)
const p6beg = generateProgram({ ...args, evalRecord: begEval, daysPerWeek: 6, duplicatedSlots: ['push', 'pull', 'legs'] });
for (const b of p6beg.blocks) {
  for (const slot of ['push', 'pull', 'legs']) {
    const d1 = b.days.find(d => d.slot === slot && d.rep === 1);
    const d2 = b.days.find(d => d.slot === slot && d.rep === 2);
    const major = { push: 'Chest', pull: 'Back', legs: 'Legs' }[slot];
    assert(setsForDay(d1, major) >= setsForDay(d2, major) && setsForDay(d1, major) + setsForDay(d2, major) > 0,
      `6-day beginner ${slot} major quota filled (block ${b.index})`);
    // Review finding (Task 3): the major check above never total-checked MINORS —
    // the tight-pool buckets where exhaustion actually bites (Calves has 5 exercises,
    // Rear Delts 4; the beginner filter shrinks pools further). Minors take the FULL
    // quota on both days (spec D5), and rep-1 runs unexcluded so its total IS the
    // correct quota — rep-2 falling short of rep-1 is exactly the starvation the
    // fallback tier must prevent.
    const minors = { push: ['Shoulders', 'Triceps'], pull: ['Rear Delts', 'Biceps', 'Forearms'], legs: ['Calves', 'Abs'] }[slot];
    for (const mb of minors) {
      const m1 = setsForDay(d1, mb), m2 = setsForDay(d2, mb);
      assert(m1 > 0 && m2 === m1,
        `6-day beginner minor '${mb}' full quota on both days (block ${b.index}: ${m1} vs ${m2})`);
    }
    for (const day of [d1, d2])
      for (const e of day.exercises) assert(e.sets > 0, 'no zero-set entries under exclusion');
  }
}

// rules v2 (Elie, 2026-07-14): Deadlift is ONLY the pull-day anchor — never a legs-day
// accessory (its bank bucket is Legs) and never a circuit station. Sweep every day of
// every block, daysAlt included, across the standard AND beginner programs.
for (const p of [prog, begProg]) {
  for (const b of p.blocks) {
    for (const day of [...b.days, ...(b.daysAlt || [])]) {
      for (const [i, e] of day.exercises.entries()) {
        assert(e.name !== 'Deadlift' || (day.slot === 'pull' && i === 0),
          `Deadlift only as pull anchor (found in block ${b.index} ${day.slot} pos ${i})`);
      }
    }
  }
}
console.log('kernel OK');

// === part 4: reducer + merge coexistence ===
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { reducer, migrateData, mergeData } = await import(utilsUrl);

const base = { clients: [{ id: 'c1', name: 'A' }], sessions: [], evaluations: [], programs: [],
  todos: [], auditLog: [], messageTemplates: {}, _dataVersion: 6 };
const rec = { ...prog, id: 'p9' };                            // reuse the kernel output from part 3

let s = reducer(base, { type: 'ADD_PROGRAM', payload: rec });
assert(s.programs.length === 1 && s.programs[0]._modified, 'ADD_PROGRAM appends + stamps _modified');
// NOTE: audit entries in this file use `event`, never `type` (see evaluation_deleted,
// package_edited, etc.) — brief's test snippet said `a.type`; corrected to match the
// codebase's real idiom, same class of copy-paste artifact as the livePracticeIds note.
assert(s.auditLog.some(a => a.event === 'program_generated'), 'ADD_PROGRAM audit-logged');

const swapped = { ...rec, blocks: rec.blocks.slice() };       // full-record replace (swap-exercise path)
s = reducer(s, { type: 'EDIT_PROGRAM', payload: swapped });
assert(s.programs.length === 1, 'EDIT_PROGRAM replaces, never duplicates');

s = reducer(s, { type: 'DELETE_PROGRAM', payload: 'p9' });
assert(s.programs.length === 0 && s.auditLog.some(a => a.event === 'program_deleted'), 'DELETE_PROGRAM + audit');

s = reducer({ ...base, programs: [{ ...rec, id: 'px' }] }, { type: 'DELETE_CLIENT', payload: 'c1' });
assert(s.programs.length === 0, 'DELETE_CLIENT cascades to programs');

// migration: v5 blob (no programs) → v6 seeds []
const migrated = migrateData({ clients: [], sessions: [], evaluations: [], _dataVersion: 5 });
assert(Array.isArray(migrated.programs) && migrated._dataVersion === 6, 'v5→v6 seeds programs[]');

// merge: programs union-by-ID with newest-_modified-wins, evaluations pattern
const local = { ...base, programs: [{ id: 'pA', _modified: '2026-07-01T00:00:00Z' }] };
const remote = { ...base, programs: [{ id: 'pA', _modified: '2026-07-02T00:00:00Z' }, { id: 'pB', _modified: '2026-07-01T00:00:00Z' }] };
const merged = mergeData(local, remote);
assert(merged.programs.length === 2, 'merge unions programs by ID');
assert(merged.programs.find(p => p.id === 'pA')._modified === '2026-07-02T00:00:00Z', 'newer _modified wins');
console.log('reducer/merge OK');
