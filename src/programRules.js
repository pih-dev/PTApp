// Program-generation rulebook (spec docs/superpowers/specs/2026-07-13-program-generation-design.md,
// every number Elie-approved 2026-07-13). Data + pure functions ONLY — no React, no state.
// Bump PROGRAM_RULES_VERSION on ANY change: stored programs are frozen and stamp
// the version they were generated with (CHARTS_VERSION precedent).
// v2: Deadlift excluded from all accessory/circuit pools — Pull-day anchor only (Elie, 2026-07-14).
export const PROGRAM_RULES_VERSION = 2;

// Sets per MAJOR muscle per week, by eval classification (spec §3).
export const TIERS = { begA: [9, 11], begB: [11, 13], intA: [14, 17], intB: [18, 21], pro: [21, 24] };

// Fat-loss block auto-tick thresholds, % body fat (spec §5).
export const FAT_THRESHOLD = { male: 18, female: 25 };

// Method catalog (spec §4). setPcts = per-set %1RM for within-session pyramids;
// pctText is the display fallback for uniform-intensity methods.
export const METHODS = {
  progLoad: {                    // load climbs, reps preserved; trainer adjusts load if top-set reps fall out of 8-10
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: [55, 60, 70, 80], repsPerSet: ['10', '10', '10', '8-10'], restSec: 90,
  },
  descPyramid: {                 // heavy first set to instigate fatigue, then lighter/higher reps
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: [85, 70, 60, 50], repsPerSet: ['8', '12', '15', '18'], restSec: 90,
  },
  fiveOfFive: {
    objective: 'strength', setsPerExercise: 5,
    setPcts: null, pctText: '80-85%', repsText: '5', restSec: 150,
  },
  doOrDie: {                     // 20+ = to failure
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: null, pctText: '30%', repsText: '20+', restSec: 40,
  },
  statoDynamic: {                // mid-rep pauses (stato-dynamic contraction)
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: null, pctText: '25-30%', repsText: '12', restSec: 60,
  },
  endurance: {                   // fat-loss block; weeks 1&3 circuits, 2&4 straight sets (kernel special-cases)
    objective: 'fatLoss', setsPerExercise: 3,
    setPcts: null, pctText: '30-40%', repsText: '20-25', restSec: 45,
    circuit: { rounds: 4, exercises: 7, repsText: '15-20', restBetweenExSec: 40, restBetweenRoundsSec: 120 },
  },
};

// Client X default block sequence (spec §5). Slot 6 swaps to fiveOfFive when
// the trainer excludes the fat-loss block (keeps hypertrophy/strength alternation).
export const DEFAULT_SEQUENCE = ['progLoad', 'descPyramid', 'fiveOfFive', 'doOrDie', 'statoDynamic', 'endurance'];

const GROUP_OF_LIFT = { bench: 'push', squat: 'legs', deadlift: 'pull' };
// Tie-break priority when scores tie: legs weakest first, then pull, then push
// ("squat low hence more work on legs" — Elie-confirmed 2026-07-13).
const TIE_ORDER = ['legs', 'pull', 'push'];

// scores = evalRecord.frozen.scores ({bench,squat,deadlift}, all non-null — the
// UI gates generation on a fully-scored eval). → { weak, mid, strong } groups.
export function rankGroups(scores) {
  const ranked = Object.entries(GROUP_OF_LIFT)
    .map(([lift, group]) => ({ group, score: scores[lift] }))
    .sort((a, b) => a.score - b.score || TIE_ORDER.indexOf(a.group) - TIE_ORDER.indexOf(b.group));
  return { weak: ranked[0].group, mid: ranked[1].group, strong: ranked[2].group };
}

// Weekly sets for the three MAJORS. strategy 'top' = position within the tier
// range; 'steal' = weak takes max+2, strong pays min−2 (spec §3). Strength
// blocks scale everything ×¾ (Elie-approved).
export function majorQuotas(classKey, strategy, ranks, isStrength) {
  const [lo, hi] = TIERS[classKey];
  const mid = Math.round((lo + hi) / 2);
  const base = strategy === 'steal'
    ? { [ranks.weak]: hi + 2, [ranks.mid]: mid, [ranks.strong]: lo - 2 }
    : { [ranks.weak]: hi, [ranks.mid]: mid, [ranks.strong]: lo };
  const scale = isStrength ? 0.75 : 1;
  return {
    push: Math.round(base.push * scale),
    pull: Math.round(base.pull * scale),
    legs: Math.round(base.legs * scale),
  };
}

// Each minor rides its day's major at half volume — this makes weak-day minors
// automatically train at the top of their half-tier (spec §3 odd-block rule)
// without a second bookkeeping path.
export const minorQuota = (majorSets) => Math.round(majorSets / 2);

// 'top' blocks lead the week with the weak group's day; 'steal' blocks keep
// the standard Push/Pull/Legs order (emphasis lives in the quotas).
export function dayOrder(strategy, ranks) {
  return strategy === 'top' ? [ranks.weak, ranks.mid, ranks.strong] : ['push', 'pull', 'legs'];
}
