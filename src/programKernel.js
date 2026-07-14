// THE program-generation kernel (spec §6). ONE entry point, pure + deterministic:
// the setup sheet's preview and the save path call the SAME function with the
// SAME args (compute1RMFrozen precedent — preview can never disagree with what
// gets stored). No Date.now()/Math.random(): caller supplies id + timestamps.
//
// Program record shape (frozen at generation, schema v6):
// { id, clientId, evalId, createdAt, startDate, fatPct, rulesVersion, bankVersion,
//   classification, ranks: {weak,mid,strong},
//   blocks: [{ index, methodId, objective, strategy, startDate,
//              days: [{ slot, exercises: [{ name, bucket, type, advanced, sets,
//                        repsText, pctText, setKg|null, restSec }] }],
//              daysAlt: circuit days (endurance blocks only) }] }
import { EXERCISES, EXERCISE_BANK_VERSION, MUSCLE_GROUPS, bankForBucket } from './exerciseBank.js';
import { PROGRAM_RULES_VERSION, METHODS, rankGroups, majorQuotas, minorQuota, dayOrder } from './programRules.js';

// The three lifts with known 1RMs — the only exercises that show kg (spec §6).
export const ANCHORS = {
  push: { name: 'Flat Barbell Press', rawKey: 'benchKg' },
  legs: { name: 'Back Squat', rawKey: 'squatKg' },
  pull: { name: 'Deadlift', rawKey: 'deadliftKg' },
};

// Shared empty exclusion set — Task 3 (variant exclusion) populates real sets;
// a single frozen instance keeps generateProgram deterministic and allocation-free.
const NO_EXCLUDE = new Set();

const roundPlate = (kg) => Math.round(kg / 2.5) * 2.5;      // 2.5 kg plate rounding
// pctText is a display string like '80-85%' or '30%' (uniform-intensity methods
// with no setPcts array — fiveOfFive, doOrDie, statoDynamic, endurance). The
// anchor still needs a real kg load, so average the range and apply it to every
// set (deviation from the brief: brief's `method.setPcts ? ... : null` left the
// anchor's setKg null for these methods, failing "anchor with kg in EVERY
// non-endurance block" for blocks 2/3/4 — see task-3-report.md).
const avgPct = (pctText) => {
  const nums = pctText.match(/\d+(\.\d+)?/g).map(Number);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');                     // noon guard: no UTC date-shift (toISOString trap)
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Deterministic candidate list for a bucket: compounds first then isolations
// (stable bank order inside each), beginner filter applied, anchor excluded
// (it is placed explicitly), rotated by blockIndex so consecutive blocks pick
// different variants. Rotation offset only advances through blocks that USE
// this bucket, which every block does — blockIndex is a valid clock.
function candidates(bucket, blockIndex, isBeginner, anchorName, exclude = NO_EXCLUDE) {
  // Deadlift is ONLY ever the Pull-day anchor (Elie's call, 2026-07-14): its bank
  // bucket is 'Legs' (primary Quads), so without this filter it leaked into the
  // Legs-day accessory pool and circuit stations — programming it twice a week.
  let pool = bankForBucket(bucket).filter(e =>
    e.name !== anchorName && e.name !== ANCHORS.pull.name && !exclude.has(e.name));
  if (isBeginner) {
    const safe = pool.filter(e => !e.advanced);
    if (safe.length >= 3) pool = safe;                       // only filter when alternatives exist (spec §6)
  }
  const comp = pool.filter(e => e.type === 'compound');
  const iso = pool.filter(e => e.type === 'isolation');
  const rot = (arr) => arr.length ? arr.map((_, i) => arr[(i + blockIndex * 2) % arr.length]) : arr;
  return [...rot(comp), ...rot(iso)];
}

// Materialize one bucket's exercises for a day: exact `target` total sets,
// `per` sets per exercise, anchor (if any) first with per-set kg.
function fillBucket({ bucket, target, method, blockIndex, isBeginner, anchor, anchorKg, exclude = NO_EXCLUDE }) {
  const per = method.setsPerExercise;
  const out = [];
  let remaining = target;
  if (anchor && remaining > 0) {
    // ALWAYS place the anchor when the day has one — "anchors in every block" is a
    // spec invariant (§6) and must not silently depend on the quota being ≥ per
    // (review finding, Task 3). If the quota is tighter than `per`, the anchor takes
    // what's left (kg pyramid sliced to match) rather than vanishing.
    const sets = Math.min(per, remaining);
    const anchorSetKg = method.setPcts
      ? method.setPcts.slice(0, sets).map(p => roundPlate(anchorKg * p / 100))
      : Array(sets).fill(roundPlate(anchorKg * avgPct(method.pctText) / 100));
    const entry = exerciseEntry(anchorStub(anchor, bucket), sets, method, anchorSetKg);
    // Anchor bucket is the DAY'S MAJOR by definition (spec §6), not the bank record's
    // primary-muscle bucket: Deadlift's bank primary is Quads (bucket 'Legs'), but as
    // the Pull-day anchor its sets count toward Back (§3 maps deadlift→Pull). Without
    // this override the Back major runs `per` sets short in every block (review finding).
    entry.bucket = bucket;
    out.push(entry);
    remaining -= sets;
  }
  const pool = candidates(bucket, blockIndex, isBeginner, anchor ? anchor.name : null, exclude);
  for (let i = 0; remaining > 0 && i < pool.length; i++) {
    const sets = remaining >= per * 2 ? per : remaining;     // last exercise absorbs the remainder exactly
    out.push(exerciseEntry(pool[i], Math.min(sets, remaining), method, null));
    remaining -= Math.min(sets, remaining);
  }
  return out;
}
const anchorStub = (anchor, bucket) =>
  EXERCISES.find(e => e.name === anchor.name) || { name: anchor.name, bucket, type: 'compound', advanced: true };
const exerciseEntry = (ex, sets, method, setKg) => ({
  name: ex.name, bucket: ex.bucket, type: ex.type, advanced: !!ex.advanced,
  sets,
  repsText: method.repsPerSet ? method.repsPerSet.join('/') : method.repsText,
  pctText: method.setPcts ? method.setPcts.map(p => p + '%').join('/') : method.pctText,
  setKg, restSec: method.restSec,
});

// One PPL day. majorTarget = this day's share of the weekly major quota (full
// quota when the slot isn't duplicated); weeklyMajorSets = the untouched weekly
// number — minors always take minorQuota(weekly) PER DAY (spec D5: minors don't
// split, their volume grows with the extra day — Elie's explicit pick).
function buildDay({ slot, rep, majorTarget, weeklyMajorSets, method, blockIndex, isBeginner, raw, exclude }) {
  const group = MUSCLE_GROUPS[slot];
  // Anchor on the rep-1 day only (spec D3): the kg lift appears once a week.
  const anchor = rep === 1 ? ANCHORS[slot] : null;
  const exercises = fillBucket({
    bucket: group.major, target: majorTarget, method, blockIndex, isBeginner,
    anchor, anchorKg: anchor ? raw[anchor.rawKey] : 0, exclude,
  });
  for (const minor of group.minors)
    exercises.push(...fillBucket({ bucket: minor, target: minorQuota(weeklyMajorSets), method, blockIndex, isBeginner, anchor: null, exclude }));
  return { slot, rep, exercises };
}

// Endurance circuit day: 7 stations × 4 rounds, one per bucket spread across the
// whole body (spec §4) — deterministic pick = first unused candidate per bucket.
function buildCircuitDay(blockIndex, dayIdx, isBeginner) {
  const c = METHODS.endurance.circuit;
  const stations = ['Chest', 'Back', 'Legs', 'Shoulders', 'Legs', 'Abs', 'Biceps'];
  const exercises = stations.map((bucket, i) => {
    const pool = candidates(bucket, blockIndex + dayIdx + i, isBeginner, null);
    const ex = pool[0];
    return { name: ex.name, bucket: ex.bucket, type: ex.type, advanced: !!ex.advanced,
      sets: c.rounds, repsText: c.repsText, pctText: METHODS.endurance.pctText,
      setKg: null, restSec: c.restBetweenExSec };
  });
  return { slot: 'circuit', exercises };
}

export function generateProgram({ id, client, evalRecord, fatPct, includeFatLoss, methods, startDate, createdAt,
  classification: classificationArg, daysPerWeek = 3, duplicatedSlots = [] }) {
  // Multi-day split (spec 2026-07-14): the UI enforces this pairing; the throw
  // guards non-UI callers — a silently wrong week would freeze into the record.
  if (!Array.isArray(duplicatedSlots) || duplicatedSlots.length !== daysPerWeek - 3
      || new Set(duplicatedSlots).size !== duplicatedSlots.length)
    throw new Error('duplicatedSlots must be exactly daysPerWeek - 3 unique slots');
  // Trainer's level override (Elie's Option 1 pick, 2026-07-14): the eval-derived
  // level is only a SUGGESTION — strength ratios ≠ training experience (a naturally
  // strong novice must not get Intermediate volume), so the setup sheet lets the
  // trainer pick the level at generation time. Omitted arg = eval's level, which
  // keeps every pre-override call site and sanity fixture valid.
  const classification = classificationArg || evalRecord.frozen.classification;
  const ranks = rankGroups(evalRecord.frozen.scores);
  const isBeginner = classification === 'begA' || classification === 'begB';
  const blocks = methods.map((methodId, index) => {
    const method = METHODS[methodId];
    const strategy = index % 2 === 0 ? 'top' : 'steal';
    const majors = majorQuotas(classification, strategy, ranks, method.objective === 'strength');
    const blockStart = addDays(startDate, index * 28);       // six 4-week blocks (spec §5)
    const order = dayOrder(strategy, ranks);
    const dupSet = new Set(duplicatedSlots);
    // Base round first (rep 1, full or ceil-half major quota), then the duplicated
    // slots in the SAME relative order as rep-2 days (spec D7: whole body covered
    // before any muscle repeats — max rest). Odd split favors the anchor day (D4).
    const baseDays = order.map(slot => buildDay({
      slot, rep: 1,
      majorTarget: dupSet.has(slot) ? Math.ceil(majors[slot] / 2) : majors[slot],
      weeklyMajorSets: majors[slot],
      method, blockIndex: index, isBeginner, raw: evalRecord.raw, exclude: NO_EXCLUDE,
    }));
    const repDays = order.filter(s => dupSet.has(s)).map(slot => buildDay({
      slot, rep: 2,
      majorTarget: Math.floor(majors[slot] / 2),
      weeklyMajorSets: majors[slot],
      method, blockIndex: index, isBeginner, raw: evalRecord.raw, exclude: NO_EXCLUDE,
    }));
    const days = [...baseDays, ...repDays];
    const block = { index, methodId, objective: method.objective, strategy, startDate: blockStart, days };
    if (methodId === 'endurance')                            // weeks 1&3 run daysAlt (circuits), 2&4 run days
      block.daysAlt = Array.from({ length: daysPerWeek }, (_, d) => buildCircuitDay(index, d, isBeginner));
    return block;
  });
  return {
    id, clientId: client.id, evalId: evalRecord.id, createdAt, startDate,
    fatPct: fatPct ?? null, includeFatLoss: !!includeFatLoss,
    daysPerWeek, duplicatedSlots,
    rulesVersion: PROGRAM_RULES_VERSION, bankVersion: EXERCISE_BANK_VERSION,
    classification,
    // 'manual' = trainer overrode the eval's suggestion — kept on the frozen record
    // so a later reader knows the volume tier was a coaching call, not the scores'.
    classificationSource: classification === evalRecord.frozen.classification ? 'auto' : 'manual',
    ranks, blocks,
  };
}
