// ─── Norm charts + scoring for the evaluation system (v2.11) ───
// Source of truth: the PT's own 30-second charts (allcharts for FA.docx, 2026-06-10,
// archived at _archive/PTApp/evaluation-system/) + YMCA sit-and-reach published norms.
// Normalization decisions (gaps, overlaps, the 40-49 female push-up typo, the 6→5 level
// collapse) are documented per-chart below and in the design spec:
// docs/superpowers/specs/2026-06-10-evaluation-v2-mass-battery-design.md
//
// STANDALONE MODULE — no imports from utils.js, so sanity scripts can test it in
// isolation and chart edits can never tangle with app logic. Components own the
// glue (age computation lives in utils.ageAtDate).
//
// Bump CHARTS_VERSION on ANY chart data change — frozen eval records carry the
// version they were scored with, so history stays auditable.
// v2: added 1RM battery tables (bench1rm/squat1rm/deadlift1rm).
// v3: 1RM tables age-banded (Elie 2026-07-14) — placeholder flat band replaced.
export const CHARTS_VERSION = 3;

// Canonical 5 levels. Score 1..5 ↔ levelKey; run is the 4-level exception (verdict only,
// never part of the muscle average) and uses 'poor' instead of 'weak'/'belowAvg'.
export const LEVEL_KEYS = ['weak', 'belowAvg', 'average', 'good', 'excellent'];

// Rep/cm charts: t = [min2, min3, min4, min5] — the MINIMUM raw value to reach
// levels 2..5; below t[0] → level 1. Values in a source gap inherit the LOWER level
// (we never award a level the PT's chart doesn't grant).
// Run charts: t = [excMax, goodMax, avgMax] in SECONDS — faster than excMax → excellent,
// ≤ goodMax → good, ≤ avgMax → average, slower → poor.
// Band edges: first band minAge 0 and last band maxAge 999 — clients outside the
// source's age range use the nearest band (flagged to the PT in the review xlsx).
export const CHARTS = {
  pushup: {
    male: [   // source bands 17-29 / 30-49 / 50+, no adjustments
      { minAge: 0, maxAge: 29, t: [9, 15, 21, 28] },
      { minAge: 30, maxAge: 49, t: [6, 11, 17, 24] },
      { minAge: 50, maxAge: 999, t: [4, 8, 13, 19] },
    ],
    female: [ // modified (knees); source has 6 levels — Good+Above Av merged into level 4.
              // 40-49 source "Good 5-31" read as 25-31 (typo; consistent with neighbors).
      { minAge: 0, maxAge: 19, t: [6, 11, 21, 36] },
      { minAge: 20, maxAge: 29, t: [7, 12, 23, 37] },
      { minAge: 30, maxAge: 39, t: [5, 10, 22, 38] },
      { minAge: 40, maxAge: 49, t: [4, 8, 18, 32] },
      { minAge: 50, maxAge: 59, t: [3, 7, 15, 26] },
      { minAge: 60, maxAge: 999, t: [2, 5, 13, 24] },
    ],
  },
  pullup: { // source is a single 18-45 band; applied flat to ALL ages (PT to confirm)
    male: [{ minAge: 0, maxAge: 999, t: [3, 6, 11, 15] }],
    female: [{ minAge: 0, maxAge: 999, t: [1, 2, 4, 6] }],
  },
  invertedRow: { // the PT's stated equivalent when pull-ups are unachievable
    male: [
      { minAge: 0, maxAge: 35, t: [8, 14, 20, 26] },
      { minAge: 36, maxAge: 50, t: [6, 11, 16, 22] },
      { minAge: 51, maxAge: 999, t: [4, 8, 13, 18] },
    ],
    female: [
      { minAge: 0, maxAge: 35, t: [5, 10, 15, 20] },
      { minAge: 36, maxAge: 50, t: [4, 8, 12, 17] },
      { minAge: 51, maxAge: 999, t: [3, 6, 10, 14] },
    ],
  },
  squat: {
    male: [ // messiest source: every band had gaps; 36-45 + 46-55 had boundary overlaps
            // (resolved upward: min5 = Above-band upper + 1); "65" in two bands → 56-65 / 66+.
      { minAge: 0, maxAge: 25, t: [25, 35, 39, 44] },
      { minAge: 26, maxAge: 35, t: [22, 31, 35, 40] },
      { minAge: 36, maxAge: 45, t: [17, 27, 30, 35] },
      { minAge: 46, maxAge: 55, t: [13, 22, 25, 29] },
      { minAge: 56, maxAge: 65, t: [9, 17, 21, 25] },
      { minAge: 66, maxAge: 999, t: [7, 15, 19, 24] },
    ],
    female: [ // source labels "Not great"/"Bad" = levels 2/1
      { minAge: 0, maxAge: 29, t: [16, 21, 26, 31] },
      { minAge: 30, maxAge: 39, t: [15, 20, 25, 30] },
      { minAge: 40, maxAge: 49, t: [13, 18, 23, 28] },
      { minAge: 50, maxAge: 999, t: [6, 9, 14, 18] },
    ],
  },
  run: { // 1-mile, seconds; 4 levels — verdict only, excluded from the muscle average
    male: [
      { minAge: 0, maxAge: 29, t: [345, 420, 540] },
      { minAge: 30, maxAge: 39, t: [350, 430, 570] },
      { minAge: 40, maxAge: 49, t: [365, 450, 600] },
      { minAge: 50, maxAge: 999, t: [395, 480, 645] },
    ],
    female: [
      { minAge: 0, maxAge: 29, t: [420, 510, 660] },
      { minAge: 30, maxAge: 39, t: [435, 540, 690] },
      { minAge: 40, maxAge: 49, t: [465, 570, 720] },
      { minAge: 50, maxAge: 999, t: [510, 615, 780] },
    ],
  },
  sitReach: {
    // YMCA Trunk Flexion norms (Morrow et al. 2015, p.222) — the placeholder until the
    // PT sends his own chart (then bump CHARTS_VERSION). Source is inches on a ruler
    // whose 15" mark sits at the feet; the app records CM PAST TOES (negative = short
    // of toes), so thresholds are pre-converted: cm = (inches − 15) × 2.54, 1 decimal.
    // 7 source levels collapsed to 5: lvl1 = Very poor+Poor, lvl4 = Above average+Good.
    male: [
      { minAge: 0, maxAge: 25, t: [-2.5, 2.5, 7.6, 17.8] },
      { minAge: 26, maxAge: 35, t: [-5.1, 0, 5.1, 15.2] },
      { minAge: 36, maxAge: 45, t: [-5.1, 0, 2.5, 15.2] },
      { minAge: 46, maxAge: 55, t: [-12.7, -7.6, -2.5, 10.2] },
      { minAge: 56, maxAge: 65, t: [-15.2, -10.2, -5.1, 5.1] },
      { minAge: 66, maxAge: 999, t: [-17.8, -12.7, -7.6, 5.1] },
    ],
    female: [
      { minAge: 0, maxAge: 25, t: [5.1, 10.2, 12.7, 22.9] },
      { minAge: 26, maxAge: 35, t: [2.5, 7.6, 12.7, 20.3] },
      { minAge: 36, maxAge: 45, t: [0, 5.1, 7.6, 17.8] },
      { minAge: 46, maxAge: 55, t: [-2.5, 2.5, 5.1, 15.2] },
      { minAge: 56, maxAge: 65, t: [-5.1, 0, 2.5, 12.7] },
      { minAge: 66, maxAge: 999, t: [-5.1, 0, 5.1, 12.7] },
    ],
  },
  // ─── 1RM battery (v2.12, age-banded v2.13.2) ───
  // Thresholds are 1RM-to-BODYWEIGHT RATIOS (1RM kg ÷ bodyweight kg), per gender.
  // 18-39 rows = the levels Elie approved 2026-07-14 ("the numbers are good").
  // Older bands = those levels scaled by the per-lift/per-gender decline factors
  // from Elie's age-range tables (screenshots, 2026-07-14) — his chosen method:
  // "keep the 18-39 thresholds, lower them by the same percentage for older ages".
  // Factors are each band's benchmark ÷ the 18-39 benchmark; results rounded to
  // 2 decimals. Derivation script inline in the v2.13.2 session/commit.
  // Same t = [min2, min3, min4, min5] contract as the rep charts (lookupScore
  // is reused unchanged; it compares the ratio against these minimums).
  bench1rm: {
    male: [
      { minAge: 0, maxAge: 39, t: [0.75, 1.0, 1.35, 1.65] },   // baseline (Elie 18-39)
      { minAge: 40, maxAge: 49, t: [0.69, 0.92, 1.24, 1.51] }, // ×(1.10/1.20)
      { minAge: 50, maxAge: 59, t: [0.63, 0.83, 1.13, 1.38] }, // ×(1.00/1.20)
      { minAge: 60, maxAge: 69, t: [0.53, 0.71, 0.96, 1.17] }, // ×(0.85/1.20)
      { minAge: 70, maxAge: 999, t: [0.44, 0.58, 0.79, 0.96] }, // ×(0.70/1.20)
    ],
    female: [
      { minAge: 0, maxAge: 39, t: [0.5, 0.7, 0.9, 1.1] },      // baseline (Elie 18-39)
      { minAge: 40, maxAge: 49, t: [0.45, 0.63, 0.82, 1.0] },  // ×(0.68/0.75)
      { minAge: 50, maxAge: 59, t: [0.4, 0.56, 0.72, 0.88] },  // ×(0.60/0.75)
      { minAge: 60, maxAge: 69, t: [0.35, 0.49, 0.62, 0.76] }, // ×(0.52/0.75)
      { minAge: 70, maxAge: 999, t: [0.28, 0.39, 0.5, 0.62] }, // ×(0.42/0.75)
    ],
  },
  squat1rm: {
    male: [
      { minAge: 0, maxAge: 39, t: [1.25, 1.5, 2.0, 2.5] },     // baseline (Elie 18-39)
      { minAge: 40, maxAge: 49, t: [1.13, 1.35, 1.8, 2.25] },  // ×(1.35/1.50)
      { minAge: 50, maxAge: 59, t: [1.0, 1.2, 1.6, 2.0] },     // ×(1.20/1.50)
      { minAge: 60, maxAge: 69, t: [0.88, 1.05, 1.4, 1.75] },  // ×(1.05/1.50)
      { minAge: 70, maxAge: 999, t: [0.71, 0.85, 1.13, 1.42] }, // ×(0.85/1.50)
    ],
    female: [
      { minAge: 0, maxAge: 39, t: [0.75, 1.0, 1.5, 1.85] },    // baseline (Elie 18-39)
      { minAge: 40, maxAge: 49, t: [0.68, 0.9, 1.35, 1.67] },  // ×(0.90/1.00)
      { minAge: 50, maxAge: 59, t: [0.6, 0.8, 1.2, 1.48] },    // ×(0.80/1.00)
      { minAge: 60, maxAge: 69, t: [0.52, 0.7, 1.05, 1.3] },   // ×(0.70/1.00)
      { minAge: 70, maxAge: 999, t: [0.41, 0.55, 0.83, 1.02] }, // ×(0.55/1.00)
    ],
  },
  deadlift1rm: {
    male: [
      { minAge: 0, maxAge: 39, t: [1.5, 2.0, 2.5, 3.0] },      // baseline (Elie 18-39)
      { minAge: 40, maxAge: 49, t: [1.37, 1.83, 2.29, 2.74] }, // ×(1.60/1.75)
      { minAge: 50, maxAge: 59, t: [1.24, 1.66, 2.07, 2.49] }, // ×(1.45/1.75)
      { minAge: 60, maxAge: 69, t: [1.07, 1.43, 1.79, 2.14] }, // ×(1.25/1.75)
      { minAge: 70, maxAge: 999, t: [0.9, 1.2, 1.5, 1.8] },    // ×(1.05/1.75)
    ],
    female: [
      { minAge: 0, maxAge: 39, t: [1.0, 1.25, 1.75, 2.25] },   // baseline (Elie 18-39)
      { minAge: 40, maxAge: 49, t: [0.92, 1.15, 1.61, 2.07] }, // ×(1.15/1.25)
      { minAge: 50, maxAge: 59, t: [0.8, 1.0, 1.4, 1.8] },     // ×(1.00/1.25)
      { minAge: 60, maxAge: 69, t: [0.7, 0.88, 1.23, 1.58] },  // ×(0.88/1.25)
      { minAge: 70, maxAge: 999, t: [0.58, 0.72, 1.01, 1.3] }, // ×(0.72/1.25)
    ],
  },
};

const RUN_LEVELS = ['excellent', 'good', 'average', 'poor'];

const findBand = (bands, age) =>
  bands.find(b => age >= b.minAge && age <= b.maxAge) || bands[bands.length - 1];

// The ONE scoring entry point. Returns { score, levelKey }.
// Rep/cm tests: score 1..5 + matching LEVEL_KEYS entry.
// Run: score null + levelKey 'excellent'|'good'|'average'|'poor'.
export function lookupScore(testId, gender, age, rawValue) {
  const byGender = CHARTS[testId];
  if (!byGender || rawValue == null || !Number.isFinite(rawValue)) return { score: null, levelKey: null };
  const bands = byGender[gender];
  if (!bands) return { score: null, levelKey: null };
  const { t } = findBand(bands, age);
  if (testId === 'run') {
    // strictly-faster-than for excellent (source says "< 5:45"), ≤ for the rest
    if (rawValue < t[0]) return { score: null, levelKey: 'excellent' };
    if (rawValue <= t[1]) return { score: null, levelKey: 'good' };
    if (rawValue <= t[2]) return { score: null, levelKey: 'average' };
    return { score: null, levelKey: 'poor' };
  }
  let score = 1;
  for (let i = 0; i < 4; i++) if (rawValue >= t[i]) score = i + 2;
  return { score, levelKey: LEVEL_KEYS[score - 1] };
}

// PT's classification bands over the EXACT 3-muscle-test average (Q2 answer, 2026-06-10):
// 1-1.9 BegA · 2-2.9 BegB · 3-3.9 IntA · 4 IntB · 4.1-5 Pro. Averages are thirds, so
// "<" boundaries are exact; never call this with a rounded value.
export function classify(muscleAvg) {
  if (muscleAvg < 2) return 'begA';
  if (muscleAvg < 3) return 'begB';
  if (muscleAvg < 4) return 'intA';
  if (muscleAvg === 4) return 'intB';
  return 'pro';
}

// The ONE freeze kernel — the eval form's live chips AND the save path both call this,
// so the preview can never disagree with what gets stored (the v2.9.6 "same number,
// two semantics" trap class). raw = { pushup, pull, squat, runSec|null, sitReachCm|null }.
// pullVariant routes the pull raw to the right chart.
export function computeEvalFrozen(gender, age, pullVariant, raw) {
  const pushup = lookupScore('pushup', gender, age, raw.pushup).score;
  const pull = lookupScore(pullVariant, gender, age, raw.pull).score;
  const squat = lookupScore('squat', gender, age, raw.squat).score;
  const run = raw.runSec == null ? null : lookupScore('run', gender, age, raw.runSec).levelKey;
  const sitReach = raw.sitReachCm == null ? null : lookupScore('sitReach', gender, age, raw.sitReachCm).score;

  // A null muscle score (unknown chart key / gender drift) must surface as a visibly
  // incomplete record — null+null arithmetic would otherwise coerce to 0 and freeze a
  // plausible-but-wrong classification. Also keeps NaN out of classify().
  if (pushup == null || pull == null || squat == null) {
    return {
      age, gender,
      scores: { pushup, pull, squat, run, sitReach },
      muscleAvg: null, classification: null,
      chartsVersion: CHARTS_VERSION,
    };
  }

  const exact = (pushup + pull + squat) / 3;
  return {
    age, gender,
    scores: { pushup, pull, squat, run, sitReach },
    muscleAvg: Math.round(exact * 100) / 100,  // display value; classification uses exact
    classification: classify(exact),
    chartsVersion: CHARTS_VERSION,
  };
}

// ─── The 1RM freeze kernel (v2.12) ───
// Mirrors computeEvalFrozen exactly: the eval form's live chips AND the save path
// both call this, so the preview can never disagree with the stored record (the
// v2.9.6 "same number, two semantics" trap class). Do NOT reimplement the ratio
// math or the 1-5 lookup anywhere else.
// raw = { bodyweightKg, benchKg, squatKg, deadliftKg } — all positive kg numbers.
export function compute1RMFrozen(gender, age, raw) {
  // Ratio is null (not 0, not Infinity) on any bad input — a null score must
  // surface as a visibly incomplete record, same rule as the mass kernel.
  const ratio = (kg) =>
    Number.isFinite(kg) && kg > 0 && Number.isFinite(raw.bodyweightKg) && raw.bodyweightKg > 0
      ? kg / raw.bodyweightKg : null;
  const bench = lookupScore('bench1rm', gender, age, ratio(raw.benchKg)).score;
  const squat = lookupScore('squat1rm', gender, age, ratio(raw.squatKg)).score;
  const deadlift = lookupScore('deadlift1rm', gender, age, ratio(raw.deadliftKg)).score;

  if (bench == null || squat == null || deadlift == null) {
    return {
      age, gender,
      scores: { bench, squat, deadlift },
      liftAvg: null, classification: null,
      chartsVersion: CHARTS_VERSION,
    };
  }

  const exact = (bench + squat + deadlift) / 3;
  return {
    age, gender,
    scores: { bench, squat, deadlift },
    liftAvg: Math.round(exact * 100) / 100,  // display value; classification uses exact
    classification: classify(exact),
    chartsVersion: CHARTS_VERSION,
  };
}

// ── 1-mile time helpers (shared by EvalForm input and NormChartsView display) ──
export function parseRunTime(str) {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec((str || '').trim());
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
export function formatRunTime(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
