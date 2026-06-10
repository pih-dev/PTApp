# Evaluation System v2.11 — Mass-Population Battery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Client fitness evaluations — 5 raw-value tests scored 1–5 against the PT's bundled norm charts, classified Beginner A → Pro, with per-client history and an app-wide chart reference.

**Architecture:** New standalone `src/normCharts.js` owns all chart data + scoring (no utils dependency, sanity-testable). Schema v4→v5 adds top-level `state.evaluations` (sessions pattern: per-record `_modified`, union-by-ID merge). Scores are FROZEN into each record at save (re-frozen on edit) via one shared `computeEvalFrozen` used by both the live form chips and the save path. Three new components: `EvalForm`, `EvalSection` (inside the expanded client card), `NormChartsView` (from General).

**Tech Stack:** React 18, Vite single-file build, plain CSS, no test framework — sanity scripts in `scripts/sanity/` are the test harness (`node scripts/sanity/<name>.mjs`, exit 1 on failure).

**Spec:** `docs/superpowers/specs/2026-06-10-evaluation-v2-mass-battery-design.md` (approved). Read it first — the normalized chart tables there are the source of truth for Task 1's data.

**Conventions that apply to every task** (from CLAUDE.md / docs/traps.md):
- Never use `toISOString()` for display/comparison dates — use `today()`, `localDateStr`.
- Never name a `.map`/`.find` callback param `t` (shadows the i18n `t`).
- Inline styles: `marginInlineStart`/`paddingInlineStart`, never `marginLeft` (RTL).
- Theme colors in inline styles: CSS vars `--t1..--t5`, `--sep` — never raw rgba.
- All user-facing strings through `t(lang, key)` in `src/i18n.js`, EN + AR.
- Commit after every task; push to master after every commit.

---

### Task 1: `src/normCharts.js` — chart data, lookupScore, classify, computeEvalFrozen

**Files:**
- Create: `src/normCharts.js`
- Test: `scripts/sanity/sanity-evaluations.mjs` (part 1)

- [ ] **Step 1: Write the failing test**

Create `scripts/sanity/sanity-evaluations.mjs`:

```js
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
assert(lookupScore('run', 'male', 25, 420).levelKey === 'good', 'run M25 7:00 → good (≤ cutoff)');
assert(lookupScore('run', 'male', 25, 520).levelKey === 'average', 'run M25 8:40 → average');
assert(lookupScore('run', 'male', 25, 541).levelKey === 'poor', 'run M25 9:01 → poor');
assert(lookupScore('run', 'female', 35, 600).levelKey === 'average', 'run F35 10:00 → average');

// === sit-and-reach — YMCA, cm past toes (negative = before toes) ===
assert(lookupScore('sitReach', 'male', 25, -3).score === 1, 'sitReach M25 -3cm → 1');
assert(lookupScore('sitReach', 'male', 25, 3).score === 3, 'sitReach M25 3cm → 3');
assert(lookupScore('sitReach', 'male', 25, 18).score === 5, 'sitReach M25 18cm → 5');
assert(lookupScore('sitReach', 'female', 25, 11).score === 3, 'sitReach F25 11cm → 3');

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/sanity/sanity-evaluations.mjs`
Expected: FAIL — `Cannot find module ... normCharts.js`

- [ ] **Step 3: Create `src/normCharts.js`**

```js
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
export const CHARTS_VERSION = 1;

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
  const exact = (pushup + pull + squat) / 3;
  return {
    age, gender,
    scores: { pushup, pull, squat, run, sitReach },
    muscleAvg: Math.round(exact * 100) / 100,  // display value; classification uses exact
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/sanity/sanity-evaluations.mjs`
Expected: all ✓, ends with `All normCharts assertions passed.`

- [ ] **Step 5: Commit**

```bash
git add src/normCharts.js scripts/sanity/sanity-evaluations.mjs
git commit -m "feat(eval): normCharts module - PT charts + YMCA sit-and-reach, lookup/classify/freeze kernel"
git push origin master
```

---

### Task 2: Schema v5 — migration, merge, defaults

**Files:**
- Modify: `src/utils.js` (DATA_VERSION ~line 616, migrateData defaults ~line 783, mergeData ~line 846, mergeBackup ~line 1194, REPLACE_ALL ~line 1088)
- Test: `scripts/sanity/sanity-evaluations.mjs` (append part 2a)

- [ ] **Step 1: Append failing migration/merge assertions to `scripts/sanity/sanity-evaluations.mjs`**

```js
// === Part 2a: schema v5 — migration + merge (appended after the normCharts block) ===
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { mergeData, baseReducer } = await import(utilsUrl);

// migrateData is private — exercise it through mergeData(local, remote), which migrates
// the remote blob by its own version (v2.10.1 behavior, already covered by
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/sanity/sanity-evaluations.mjs`
Expected: FAIL at `local evaluations survive` (mergeData has no `evaluations` key → undefined).

- [ ] **Step 3: Implement schema v5 in `src/utils.js`**

3a. Bump the version (line ~616): `const DATA_VERSION = 4;` → `const DATA_VERSION = 5;`

3b. In `migrateData`, after the `if (v < 4) {...}` block (line ~781) add:

```js
  // v4 → v5: evaluation system (v2.11). Adds top-level evaluations[] — per-client
  // fitness eval records (sessions pattern: per-record _modified, union-by-ID merge).
  // Purely additive: no client/session reshaping, nothing to rewrite.
  if (v < 5) {
    data.evaluations = data.evaluations || [];
    v = 5;
  }
```

3c. In the defaults block right below (after `data.todos = data.todos || [];`) add:

```js
  data.evaluations = data.evaluations || [];
```

3d. In `mergeData`'s return object (line ~846), after the `todos` line add:

```js
    // evaluations merge exactly like sessions — per-record _modified, union by ID
    evaluations: mergeById(local.evaluations, remote.evaluations),
```

3e. In `mergeBackup` (line ~1194), after the todos merge block add:

```js
  // Merge evaluations by ID — backup fills missing, doesn't overwrite existing
  const liveEvalIds = new Set((live.evaluations || []).map(ev => ev.id));
  const restoredEvals = (backup.evaluations || []).filter(ev => !liveEvalIds.has(ev.id));
  merged.evaluations = [...(live.evaluations || []), ...restoredEvals];
```

3f. In `baseReducer`'s `REPLACE_ALL` case (line ~1088), add `evaluations: []` to the defaults spread:

```js
      const replaced = { todos: [], auditLog: [], messageTemplates: {}, evaluations: [], ...action.payload };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/sanity/sanity-evaluations.mjs` → all ✓.
Also run the existing guards (migration + merge behavior must not regress):
`node scripts/sanity/sanity-migration.mjs && node scripts/sanity/sanity-merge-migration.mjs && node scripts/sanity/sanity-reducer.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-evaluations.mjs
git commit -m "feat(eval): schema v5 - top-level evaluations[], migration + merge + backup support"
git push origin master
```

---

### Task 3: Reducer actions + ageAtDate

**Files:**
- Modify: `src/utils.js` (baseReducer; date helpers near `formatDate` ~line 601)
- Test: `scripts/sanity/sanity-evaluations.mjs` (append part 2b)

- [ ] **Step 1: Append failing reducer assertions**

```js
// === Part 2b: reducer actions + ageAtDate ===
const { ageAtDate } = await import(utilsUrl);

assert(ageAtDate('2000-06-15', '2026-06-10') === 25, 'ageAtDate: birthday not yet reached');
assert(ageAtDate('2000-06-10', '2026-06-10') === 26, 'ageAtDate: birthday today counts');
assert(ageAtDate('2000-06-01', '2026-06-10') === 26, 'ageAtDate: birthday passed');

const evalRec = {
  id: 'ev1', clientId: 'c1', date: '2026-06-10', branch: 'mass', pullVariant: 'pullup',
  raw: { pushup: 18, pull: 7, squat: 36, runSec: 520, sitReachCm: 3 },
  frozen: { age: 25, gender: 'male', scores: { pushup: 3, pull: 3, squat: 3, run: 'average', sitReach: 3 },
    muscleAvg: 3, classification: 'intA', chartsVersion: 1 },
};
const s0 = { clients: [{ id: 'c1', name: 'Test One', packages: [] }], sessions: [],
  todos: [], auditLog: [], messageTemplates: {}, evaluations: [] };

const s1 = baseReducer(s0, { type: 'ADD_EVALUATION', payload: evalRec });
assert(s1.evaluations.length === 1 && s1.evaluations[0]._modified, 'ADD_EVALUATION appends + stamps');
assert(s1.auditLog.length === 0, 'ADD writes no audit entry (the record IS the evidence)');

const s2 = baseReducer(s1, { type: 'EDIT_EVALUATION', payload: {
  ...evalRec, raw: { ...evalRec.raw, pushup: 22 },
  frozen: { ...evalRec.frozen, scores: { ...evalRec.frozen.scores, pushup: 4 },
    muscleAvg: 3.33, classification: 'intA' } } });
assert(s2.evaluations[0].raw.pushup === 22, 'EDIT_EVALUATION replaces fields');
assert(s2.evaluations[0].frozen.scores.pushup === 4, 'EDIT re-freeze travels in payload');
assert(s2.auditLog.length === 1 && s2.auditLog[0].event === 'evaluation_edited',
  'EDIT appends evaluation_edited audit entry');
assert(s2.auditLog[0].before.raw.pushup === 18 && s2.auditLog[0].after.raw.pushup === 22,
  'audit entry carries before/after');

const s3 = baseReducer(s2, { type: 'DELETE_EVALUATION', payload: 'ev1' });
assert(s3.evaluations.length === 0, 'DELETE_EVALUATION removes');
assert(s3.auditLog.length === 2 && s3.auditLog[1].event === 'evaluation_deleted'
  && s3.auditLog[1].before.id === 'ev1', 'DELETE appends forensic audit entry with the record');

const s4 = baseReducer(s1, { type: 'DELETE_CLIENT', payload: 'c1' });
assert(s4.evaluations.length === 0, 'DELETE_CLIENT cascades to evaluations');

const sNoop = baseReducer(s1, { type: 'EDIT_EVALUATION', payload: { ...evalRec, id: 'missing' } });
assert(sNoop === s1, 'EDIT of unknown id is a no-op (returns same state)');

console.log('\nAll reducer assertions passed.');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/sanity/sanity-evaluations.mjs`
Expected: FAIL — `ageAtDate` not exported / ADD_EVALUATION falls through to default.

- [ ] **Step 3: Implement**

3a. Add `ageAtDate` next to the date helpers in `src/utils.js` (after `formatDateLong`, ~line 611):

```js
// Age in whole years on a given local date (both args YYYY-MM-DD). Used by the
// evaluation system — norm-chart lookups need age AT THE EVAL DATE, not today,
// so editing an old eval re-scores against the age the client was back then.
export const ageAtDate = (birthdate, onDate) => {
  const b = new Date(birthdate + 'T00:00:00');
  const d = new Date(onDate + 'T00:00:00');
  let age = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--;
  return age;
};
```

3b. In `baseReducer`, extend `DELETE_CLIENT` (line ~985):

```js
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== action.payload),
        sessions: state.sessions.filter(s => s.clientId !== action.payload),
        // v2.11: a client's evaluations go with them (same rule as sessions)
        evaluations: (state.evaluations || []).filter(ev => ev.clientId !== action.payload),
      };
```

3c. Add the three eval cases before `case 'REPLACE_ALL'` (line ~1084). Freezing is the
COMPONENT's job (computeEvalFrozen — single author site, EvalForm); the reducer owns
stamps + audit only:

```js
    case 'ADD_EVALUATION':
      // v2.11: append-only eval history (PT re-evaluates every ~8 weeks). The frozen
      // scores arrive in the payload — computed by computeEvalFrozen in the form, the
      // same kernel that rendered the live preview chips.
      return { ...state, evaluations: [...(state.evaluations || []), { ...action.payload, _modified: now() }] };
    case 'EDIT_EVALUATION': {
      // Full-record replacement (the form re-froze scores for the edited raws/date).
      // Audited: evals are business records — silent edits would be invisible forensics.
      const stamp = now();
      const oldEval = (state.evaluations || []).find(ev => ev.id === action.payload.id);
      if (!oldEval) return state;
      const newEval = { ...oldEval, ...action.payload, _modified: stamp };
      const client = state.clients.find(c => c.id === newEval.clientId);
      return {
        ...state,
        evaluations: state.evaluations.map(ev => ev.id === newEval.id ? newEval : ev),
        auditLog: [...(state.auditLog || []), {
          id: 'log_' + genId(), ts: stamp,
          clientId: newEval.clientId, clientName: client ? client.name : '',
          event: 'evaluation_edited', packageId: null, newPackageId: null,
          before: oldEval, after: newEval, trigger: null,
        }],
      };
    }
    case 'DELETE_EVALUATION': {
      // Confirm-guarded in the UI. The deleted record rides in the audit entry —
      // "preserve history" means a delete is recoverable forensically.
      const stamp = now();
      const oldEval = (state.evaluations || []).find(ev => ev.id === action.payload);
      if (!oldEval) return state;
      const client = state.clients.find(c => c.id === oldEval.clientId);
      return {
        ...state,
        evaluations: state.evaluations.filter(ev => ev.id !== action.payload),
        auditLog: [...(state.auditLog || []), {
          id: 'log_' + genId(), ts: stamp,
          clientId: oldEval.clientId, clientName: client ? client.name : '',
          event: 'evaluation_deleted', packageId: null, newPackageId: null,
          before: oldEval, after: null, trigger: null,
        }],
      };
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/sanity/sanity-evaluations.mjs && node scripts/sanity/sanity-reducer.mjs`
Expected: all ✓.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-evaluations.mjs
git commit -m "feat(eval): ADD/EDIT/DELETE_EVALUATION reducer actions, DELETE_CLIENT cascade, ageAtDate"
git push origin master
```

---

### Task 4: i18n keys (EN + AR)

**Files:**
- Modify: `src/i18n.js` (add a block to BOTH `en:` and `ar:` — English is source of truth, Arabic keys must match)

- [ ] **Step 1: Add the keys**

In `en:` (append before the closing brace of the en object):

```js
    // Evaluation system (v2.11)
    evaluations: 'Evaluations',
    evaluate: 'Evaluate',
    newEval: 'New Evaluation',
    editEval: 'Edit Evaluation',
    evalDate: 'Evaluation date',
    batteryLabel: 'Battery',
    branchMass: 'Standard (30s tests)',
    branchPro: 'Pro / Elite (1RM)',
    comingSoon: 'coming soon',
    testPushup: 'Push-ups',
    testPullup: 'Pull-ups',
    testInvertedRow: 'Inverted row',
    testSquat: 'Bodyweight squats',
    testRun: '1-mile run',
    testSitReach: 'Sit & reach',
    repsIn30s: 'reps in 30s',
    runHint: 'mm:ss',
    sitReachHint: 'cm past toes (− = before toes)',
    optionalField: '(optional)',
    muscleAvg: 'Muscle average',
    saveEval: 'Save Evaluation',
    deleteEval: 'Delete Evaluation',
    deleteEvalMsg: 'This evaluation will be permanently deleted.',
    completeProfileFirst: 'Add gender & birthdate to this client first',
    noEvals: 'No evaluations yet',
    normCharts: 'Norm Charts',
    ymcaLabel: 'YMCA published norms (until coach chart arrives)',
    ageHeader: 'Age',
    men: 'Men',
    women: 'Women',
    level1: 'Weak',
    level2: 'Below Average',
    level3: 'Average',
    level4: 'Good',
    level5: 'Excellent',
    runPoor: 'Poor',
    classBegA: 'Beginner A',
    classBegB: 'Beginner B',
    classIntA: 'Intermediate A',
    classIntB: 'Intermediate B',
    classPro: 'Pro',
```

In `ar:` (same keys, same order):

```js
    // Evaluation system (v2.11)
    evaluations: 'التقييمات',
    evaluate: 'تقييم',
    newEval: 'تقييم جديد',
    editEval: 'تعديل التقييم',
    evalDate: 'تاريخ التقييم',
    batteryLabel: 'المجموعة',
    branchMass: 'عادي (اختبارات ٣٠ ثانية)',
    branchPro: 'محترف / نخبة (1RM)',
    comingSoon: 'قريباً',
    testPushup: 'تمرين الضغط',
    testPullup: 'العقلة',
    testInvertedRow: 'التجديف المقلوب',
    testSquat: 'سكوات بوزن الجسم',
    testRun: 'جري ١ ميل',
    testSitReach: 'الجلوس ومدّ اليدين',
    repsIn30s: 'عدّة في ٣٠ ثانية',
    runHint: 'دقيقة:ثانية',
    sitReachHint: 'سم بعد أصابع القدم (− = قبلها)',
    optionalField: '(اختياري)',
    muscleAvg: 'معدّل العضلات',
    saveEval: 'حفظ التقييم',
    deleteEval: 'حذف التقييم',
    deleteEvalMsg: 'سيتم حذف هذا التقييم نهائياً.',
    completeProfileFirst: 'أضف الجنس وتاريخ الميلاد لهذا العميل أولاً',
    noEvals: 'لا توجد تقييمات بعد',
    normCharts: 'جداول المعايير',
    ymcaLabel: 'معايير YMCA المنشورة (حتى وصول جدول المدرّب)',
    ageHeader: 'العمر',
    men: 'رجال',
    women: 'نساء',
    level1: 'ضعيف',
    level2: 'دون المتوسط',
    level3: 'متوسط',
    level4: 'جيد',
    level5: 'ممتاز',
    runPoor: 'ضعيف',
    classBegA: 'مبتدئ أ',
    classBegB: 'مبتدئ ب',
    classIntA: 'متوسط أ',
    classIntB: 'متوسط ب',
    classPro: 'محترف',
```

- [ ] **Step 2: Verify key parity**

Run: `node -e "import('./src/i18n.js').then(()=>console.log('i18n loads'))"` — if i18n.js has side-effect-free exports this confirms syntax. Then verify parity:

```bash
node -e "
const m = await import('./src/i18n.js');
" --input-type=module 2>nul || node --experimental-vm-modules -e ""
```

Simpler reliable check — the file exports `T` indirectly via `t()`; do a source-level parity grep instead:

```powershell
$src = Get-Content src/i18n.js -Raw
$en = [regex]::Matches($src, "(?s)en:\s*\{(.+?)\n  \},").Groups[1].Value
$ar = [regex]::Matches($src, "(?s)ar:\s*\{(.+?)\n  \},").Groups[1].Value
$enKeys = [regex]::Matches($en, "^\s{4}(\w+):", "Multiline") | ForEach-Object { $_.Groups[1].Value }
$arKeys = [regex]::Matches($ar, "^\s{4}(\w+):", "Multiline") | ForEach-Object { $_.Groups[1].Value }
Compare-Object $enKeys $arKeys
```

Expected: no output (keys match). (If the existing file structure makes the regex brittle, eyeball-diff the two new blocks instead — they were written to be identical key lists.)

- [ ] **Step 3: Commit**

```bash
git add src/i18n.js
git commit -m "feat(eval): i18n keys for evaluation system, EN + AR"
git push origin master
```

---

### Task 5: `src/components/EvalForm.jsx`

**Files:**
- Create: `src/components/EvalForm.jsx`

The form modal for both ADD and EDIT. Freezing happens HERE (single author site) via `computeEvalFrozen` — the same call renders the live chips and builds the saved record.

- [ ] **Step 1: Create the component**

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { genId, today, ageAtDate, haptic } from '../utils';
import { computeEvalFrozen, parseRunTime, formatRunTime } from '../normCharts';
import { t } from '../i18n';

// Maps a 1-5 score (or run levelKey) to its i18n label + chip class.
// Exported — EvalSection and NormChartsView reuse it so a label/color change
// can never desync across surfaces.
export const scoreLabel = (lang, score, levelKey) => {
  if (score != null) return t(lang, `level${score}`);
  if (levelKey === 'poor') return t(lang, 'runPoor');
  if (levelKey === 'average') return t(lang, 'level3');
  if (levelKey === 'good') return t(lang, 'level4');
  if (levelKey === 'excellent') return t(lang, 'level5');
  return '';
};
export const scoreChipClass = (score, levelKey) => {
  const n = score != null ? score
    : { poor: 1, average: 3, good: 4, excellent: 5 }[levelKey] || 0;
  return n ? `eval-chip eval-chip-${n}` : 'eval-chip';
};

// evalRecord = null → new eval; otherwise edit mode (pre-filled, re-freezes on save).
export default function EvalForm({ client, evalRecord, dispatch, lang, onClose }) {
  const [form, setForm] = useState(() => evalRecord ? {
    date: evalRecord.date,
    pullVariant: evalRecord.pullVariant,
    pushup: String(evalRecord.raw.pushup),
    pull: String(evalRecord.raw.pull),
    squat: String(evalRecord.raw.squat),
    run: evalRecord.raw.runSec == null ? '' : formatRunTime(evalRecord.raw.runSec),
    sitReach: evalRecord.raw.sitReachCm == null ? '' : String(evalRecord.raw.sitReachCm),
  } : {
    date: today(), pullVariant: 'pullup',
    pushup: '', pull: '', squat: '', run: '', sitReach: '',
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Parse the draft. Muscle raws: non-negative integers, required.
  // Run: mm:ss, optional. Sit-and-reach: cm past toes, may be negative, optional.
  const toReps = (s) => /^\d+$/.test(s.trim()) ? +s.trim() : null;
  const raw = {
    pushup: toReps(form.pushup),
    pull: toReps(form.pull),
    squat: toReps(form.squat),
    runSec: form.run.trim() === '' ? null : parseRunTime(form.run),
    sitReachCm: form.sitReach.trim() === '' ? null
      : (/^-?\d+(\.\d+)?$/.test(form.sitReach.trim()) ? +form.sitReach.trim() : undefined),
  };
  const musclesValid = raw.pushup != null && raw.pull != null && raw.squat != null;
  const runInvalid = form.run.trim() !== '' && raw.runSec == null;
  const sitInvalid = raw.sitReachCm === undefined;
  const canSave = musclesValid && !runInvalid && !sitInvalid && !!form.date;

  // Live preview = the SAME kernel the save path uses (v2.9.6 trap: a preview that
  // re-implements the math will eventually disagree with the stored record).
  const age = ageAtDate(client.birthdate, form.date || today());
  const frozen = musclesValid
    ? computeEvalFrozen(client.gender, age, form.pullVariant,
        { ...raw, sitReachCm: sitInvalid ? null : raw.sitReachCm })
    : null;

  const save = () => {
    if (!canSave) return;
    const record = {
      id: evalRecord ? evalRecord.id : genId(),
      clientId: client.id,
      date: form.date,
      branch: 'mass',
      pullVariant: form.pullVariant,
      raw,
      frozen,   // freeze-at-save: this exact object was just previewed on screen
    };
    dispatch({ type: evalRecord ? 'EDIT_EVALUATION' : 'ADD_EVALUATION', payload: record });
    onClose();
  };

  // One labeled raw-value row with its live verdict chip
  const testRow = (labelKey, hintKey, field, chip, extra) => (
    <div className="field">
      <label className="field-label">
        {t(lang, labelKey)} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, hintKey)}{extra || ''}</span>
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* sitReach can be NEGATIVE (short of toes) — iOS numeric/decimal pads have no
            minus key, so it gets the full keyboard. Reps stay on the numeric pad. */}
        <input className="input" style={{ flex: 1 }}
          inputMode={field === 'sitReach' ? 'text' : 'numeric'}
          placeholder={field === 'run' ? t(lang, 'runHint') : ''}
          value={form[field]} onChange={set(field)} />
        {chip}
      </div>
    </div>
  );
  const chipFor = (key) => frozen && frozen.scores[key] != null ? (
    <span className={scoreChipClass(
      key === 'run' ? null : frozen.scores[key],
      key === 'run' ? frozen.scores.run : null)}>
      {scoreLabel(lang,
        key === 'run' ? null : frozen.scores[key],
        key === 'run' ? frozen.scores.run : null)}
    </span>
  ) : null;

  return (
    <Modal title={evalRecord ? t(lang, 'editEval') : t(lang, 'newEval')} onClose={onClose}
      action={<button className="btn-primary" disabled={!canSave} onClick={save}>{t(lang, 'saveEval')}</button>}>

      {/* Branch picker — Pro/Elite ships in v2.12, shown disabled to set the roadmap
          expectation (Pierre's call, 2026-06-10) */}
      <div className="field">
        <label className="field-label">{t(lang, 'batteryLabel')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="filter-tab active" style={{ flex: 1 }}>{t(lang, 'branchMass')}</button>
          <button className="filter-tab" style={{ flex: 1, opacity: 0.45 }} disabled>
            {t(lang, 'branchPro')} · {t(lang, 'comingSoon')}
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">{t(lang, 'evalDate')}</label>
        <input type="date" className="input" value={form.date} onChange={set('date')} />
      </div>

      {testRow('testPushup', 'repsIn30s', 'pushup', chipFor('pushup'))}

      {/* Pull variant toggle — inverted row is the PT's stated equivalent */}
      <div className="field">
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          {['pullup', 'invertedRow'].map(v => (
            <button key={v} className={`filter-tab${form.pullVariant === v ? ' active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => { haptic(); setForm(p => ({ ...p, pullVariant: v })); }}>
              {t(lang, v === 'pullup' ? 'testPullup' : 'testInvertedRow')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="input" style={{ flex: 1 }} inputMode="numeric"
            value={form.pull} onChange={set('pull')} />
          {chipFor('pull')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t5)', marginTop: 4 }}>{t(lang, 'repsIn30s')}</div>
      </div>

      {testRow('testSquat', 'repsIn30s', 'squat', chipFor('squat'))}
      {testRow('testRun', 'runHint', 'run', chipFor('run'), ' ' + t(lang, 'optionalField'))}
      {testRow('testSitReach', 'sitReachHint', 'sitReach', chipFor('sitReach'), ' ' + t(lang, 'optionalField'))}

      {/* Classification — appears once the 3 muscle tests are in */}
      {frozen && (
        <div className="field" style={{ borderTop: '1px solid var(--sep)', paddingTop: 12, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {t(lang, 'muscleAvg')}: <strong style={{ color: 'var(--t1)' }}>{frozen.muscleAvg}</strong>
          </span>
          <span className={`badge badge-class-${frozen.classification}`}>
            {t(lang, 'class' + frozen.classification.charAt(0).toUpperCase() + frozen.classification.slice(1))}
          </span>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (component not yet mounted anywhere — that's Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/components/EvalForm.jsx
git commit -m "feat(eval): EvalForm - raw-value inputs, live verdict chips, freeze-at-save"
git push origin master
```

---

### Task 6: `src/components/EvalSection.jsx` + Clients.jsx integration

**Files:**
- Create: `src/components/EvalSection.jsx`
- Modify: `src/components/Clients.jsx` (imports line ~4; expanded card after the session list ~line 327; collapsed card badge ~line 233)

- [ ] **Step 1: Create EvalSection**

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, haptic } from '../utils';
import { formatRunTime } from '../normCharts';
import EvalForm, { scoreLabel, scoreChipClass } from './EvalForm';
import { t } from '../i18n';

const classLabel = (lang, c) => t(lang, 'class' + c.charAt(0).toUpperCase() + c.slice(1));

// Evaluations block inside the expanded client card: Evaluate button (gated on
// gender+birthdate — the chart lookup needs both), newest-first history with
// expandable per-test detail, Edit + Delete per record.
export default function EvalSection({ client, state, dispatch, lang }) {
  const [formTarget, setFormTarget] = useState(null);     // null | 'new' | evalRecord
  const [openEvalId, setOpenEvalId] = useState(null);     // expanded history row
  const [deleteTarget, setDeleteTarget] = useState(null); // eval pending delete confirm

  const evals = (state.evaluations || [])
    .filter(ev => ev.clientId === client.id)
    .sort((a, b) => b.date.localeCompare(a.date) || (b._modified || '').localeCompare(a._modified || ''));
  const profileReady = !!(client.gender && client.birthdate);

  // Per-test display rows for an expanded record: [labelKey, rawText, score, levelKey]
  const detailRows = (ev) => [
    ['testPushup', `${ev.raw.pushup}`, ev.frozen.scores.pushup, null],
    [ev.pullVariant === 'pullup' ? 'testPullup' : 'testInvertedRow', `${ev.raw.pull}`, ev.frozen.scores.pull, null],
    ['testSquat', `${ev.raw.squat}`, ev.frozen.scores.squat, null],
    ...(ev.raw.runSec != null ? [['testRun', formatRunTime(ev.raw.runSec), null, ev.frozen.scores.run]] : []),
    ...(ev.raw.sitReachCm != null ? [['testSitReach', `${ev.raw.sitReachCm} cm`, ev.frozen.scores.sitReach, null]] : []),
  ];

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--sep)', paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t(lang, 'evaluations')}</div>
        <button className="btn-sm" disabled={!profileReady}
          onClick={() => { haptic(); setFormTarget('new'); }}>
          {t(lang, 'evaluate')}
        </button>
      </div>
      {!profileReady && (
        <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 6 }}>
          {t(lang, 'completeProfileFirst')}
        </div>
      )}

      {evals.length === 0 ? (
        profileReady && <div style={{ fontSize: 13, color: 'var(--t4)', padding: '4px 0' }}>{t(lang, 'noEvals')}</div>
      ) : evals.map(ev => (
        <div key={ev.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--sep)', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setOpenEvalId(openEvalId === ev.id ? null : ev.id)}>
            <div style={{ color: 'var(--t2)' }}>
              {formatDate(ev.date, lang)}
              <span style={{ color: 'var(--t5)', marginInlineStart: 8 }}>
                {t(lang, 'muscleAvg')} {ev.frozen.muscleAvg}
              </span>
            </div>
            <span className={`badge badge-class-${ev.frozen.classification}`}>
              {classLabel(lang, ev.frozen.classification)}
            </span>
          </div>
          {openEvalId === ev.id && (
            <div style={{ marginTop: 6 }}>
              {detailRows(ev).map(([labelKey, rawText, score, levelKey]) => (
                <div key={labelKey} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '3px 0', fontSize: 12, color: 'var(--t3)' }}>
                  <span>{t(lang, labelKey)}: <strong style={{ color: 'var(--t2)' }}>{rawText}</strong></span>
                  <span className={scoreChipClass(score, levelKey)}>{scoreLabel(lang, score, levelKey)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="btn-ghost" style={{ fontSize: 12 }}
                  onClick={() => setFormTarget(ev)}>{t(lang, 'edit')}</button>
                <button className="btn-ghost" style={{ fontSize: 12, color: '#EF4444' }}
                  onClick={() => { haptic(); setDeleteTarget(ev); }}>{t(lang, 'delete')}</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {formTarget && (
        <EvalForm client={client} evalRecord={formTarget === 'new' ? null : formTarget}
          dispatch={dispatch} lang={lang} onClose={() => setFormTarget(null)} />
      )}

      {/* Delete confirm — same pattern as the client delete modal */}
      {deleteTarget && (
        <Modal title={t(lang, 'deleteEval')} onClose={() => setDeleteTarget(null)}
          action={
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => setDeleteTarget(null)}>
              {t(lang, 'cancel')}
            </button>
          }>
          <div className="success-center">
            <div className="success-icon" style={{ fontSize: 40 }}>⚠️</div>
            <div className="success-name">{formatDate(deleteTarget.date, lang)} · {classLabel(lang, deleteTarget.frozen.classification)}</div>
            <div className="success-detail">{t(lang, 'deleteEvalMsg')}</div>
          </div>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', marginBottom: 8, width: '100%' }}
            onClick={() => {
              dispatch({ type: 'DELETE_EVALUATION', payload: deleteTarget.id });
              setDeleteTarget(null);
            }}>
            {t(lang, 'confirmDelete')}
          </button>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into Clients.jsx**

2a. Add the import (after the `SessionCountPair` import, line ~7):

```js
import EvalSection from './EvalSection';
```

2b. In the expanded card, AFTER the session-list closing (the `)}` that closes `{monthSessions.length === 0 ? ... : ...}`, line ~327, still inside the `isExpanded &&` block) add:

```jsx
                {/* v2.11: evaluations — history + Evaluate action */}
                <EvalSection client={c} state={state} dispatch={dispatch} lang={lang} />
```

2c. Latest-classification badge on the collapsed card. After the gender/birthdate line's closing `)}` (line ~233), add:

```jsx
                {(() => {
                  // Latest eval classification at a glance (newest by date)
                  const latest = (state.evaluations || [])
                    .filter(ev => ev.clientId === c.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  return latest ? (
                    <span className={`badge badge-class-${latest.frozen.classification}`}
                      style={{ fontSize: 10, marginBottom: 2, display: 'inline-block' }}>
                      {t(lang, 'class' + latest.frozen.classification.charAt(0).toUpperCase() + latest.frozen.classification.slice(1))}
                    </span>
                  ) : null;
                })()}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/EvalSection.jsx src/components/Clients.jsx
git commit -m "feat(eval): EvalSection in expanded client card - history, edit/delete, latest badge"
git push origin master
```

---

### Task 7: `src/components/NormChartsView.jsx` + General.jsx entry

**Files:**
- Create: `src/components/NormChartsView.jsx`
- Modify: `src/components/General.jsx` (imports ~line 5; Documentation block ~line 437)

- [ ] **Step 1: Create the reference view**

Rendered FROM `CHARTS` so the reference can never drift from the scoring engine.

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { CHARTS, formatRunTime } from '../normCharts';
import { t } from '../i18n';

const TEST_LABELS = {
  pushup: 'testPushup', pullup: 'testPullup', invertedRow: 'testInvertedRow',
  squat: 'testSquat', run: 'testRun', sitReach: 'testSitReach',
};

const bandLabel = (b) => {
  if (b.minAge === 0 && b.maxAge === 999) return '—';
  if (b.maxAge === 999) return `${b.minAge}+`;
  if (b.minAge === 0) return `≤${b.maxAge}`;
  return `${b.minAge}–${b.maxAge}`;
};

// App-wide read-only norm-chart reference (opened from General).
// Rep/cm tests: columns = "reach level N at ≥ threshold". Run: max times per verdict.
export default function NormChartsView({ lang, onClose }) {
  const [gender, setGender] = useState('male');
  const [openTest, setOpenTest] = useState('pushup');

  const headerRow = (cols) => (
    <div style={{ display: 'flex', fontSize: 11, fontWeight: 600, color: 'var(--t3)',
      borderBottom: '1px solid var(--sep)', padding: '4px 0' }}>
      <div style={{ flex: 1 }}>{t(lang, 'ageHeader')}</div>
      {cols.map(c => <div key={c} style={{ flex: 1, textAlign: 'center' }}>{c}</div>)}
    </div>
  );

  return (
    <Modal title={t(lang, 'normCharts')} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['male', 'female'].map(g => (
          <button key={g} className={`filter-tab${gender === g ? ' active' : ''}`} style={{ flex: 1 }}
            onClick={() => setGender(g)}>
            {t(lang, g === 'male' ? 'men' : 'women')}
          </button>
        ))}
      </div>

      {Object.keys(CHARTS).map(testId => (
        <div key={testId} style={{ marginBottom: 10 }}>
          <button className="btn-secondary" style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
            onClick={() => setOpenTest(openTest === testId ? null : testId)}>
            {t(lang, TEST_LABELS[testId])}
            {testId === 'sitReach' ? ` · ${t(lang, 'ymcaLabel')}` : ''}
          </button>
          {openTest === testId && (
            <div style={{ padding: '8px 4px' }}>
              {testId === 'run'
                ? headerRow([t(lang, 'level5'), t(lang, 'level4'), t(lang, 'level3'), t(lang, 'runPoor')])
                : headerRow([t(lang, 'level2'), t(lang, 'level3'), t(lang, 'level4'), t(lang, 'level5')])}
              {CHARTS[testId][gender].map(band => (
                <div key={band.minAge} style={{ display: 'flex', fontSize: 12, color: 'var(--t2)',
                  borderBottom: '1px solid var(--sep)', padding: '5px 0' }}>
                  <div style={{ flex: 1, color: 'var(--t4)' }}>{bandLabel(band)}</div>
                  {testId === 'run' ? (
                    <>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'<' + formatRunTime(band.t[0])}</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'≤' + formatRunTime(band.t[1])}</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'≤' + formatRunTime(band.t[2])}</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'>' + formatRunTime(band.t[2])}</div>
                    </>
                  ) : band.t.map((min, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>≥{min}</div>
                  ))}
                </div>
              ))}
              {testId === 'sitReach' && (
                <div style={{ fontSize: 11, color: 'var(--t5)', marginTop: 6 }}>
                  {t(lang, 'sitReachHint')}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </Modal>
  );
}
```

- [ ] **Step 2: Wire into General.jsx**

2a. Import (after the existing component imports, ~line 5): `import NormChartsView from './NormChartsView';`

2b. Add state next to the other `useState` calls at the top of the General component: `const [showCharts, setShowCharts] = useState(false);`

2c. In the Documentation block (line ~437), add a third button after the `whatChanged` button:

```jsx
          <button className="btn-secondary" style={{ fontSize: 13, padding: '10px 14px' }}
            onClick={() => setShowCharts(true)}>
            {t(lang, 'normCharts')}
          </button>
```

2d. Next to the doc viewer modal (line ~452), add:

```jsx
      {showCharts && <NormChartsView lang={lang} onClose={() => setShowCharts(false)} />}
```

(Check General's component signature — it receives `lang`; it does, it calls `t(lang, ...)` throughout.)

- [ ] **Step 3: Verify**

Run: `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/NormChartsView.jsx src/components/General.jsx
git commit -m "feat(eval): app-wide norm-chart reference view, opened from General"
git push origin master
```

---

### Task 8: Styles — classification badges + verdict chips

**Files:**
- Modify: `src/styles.css` (append after the existing `.badge-*` rules — search for `badge-cancelled`)

- [ ] **Step 1: Add CSS**

Palette: progression grey → blue → indigo → purple → amber, consistent with the badge system (solid fill, white text, no inline colors).

```css
/* ─── Evaluation system (v2.11) ─── */
/* Classification badges — Beg A → Pro progression */
.badge-class-begA { background: #6B7280; color: #fff; }
.badge-class-begB { background: #60A5FA; color: #fff; }
.badge-class-intA { background: #2563EB; color: #fff; }
.badge-class-intB { background: #7C3AED; color: #fff; }
.badge-class-pro  { background: #F59E0B; color: #fff; }

/* Per-test verdict chips (1 weak → 5 excellent; run maps poor→1, avg→3, good→4, exc→5) */
.eval-chip {
  flex: 0 0 auto; padding: 3px 10px; border-radius: 10px;
  font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap;
}
.eval-chip-1 { background: #EF4444; }
.eval-chip-2 { background: #F59E0B; }
.eval-chip-3 { background: #6B7280; }
.eval-chip-4 { background: #10B981; }
.eval-chip-5 { background: #059669; }
```

- [ ] **Step 2: Verify + commit**

Run: `npm run build` → succeeds.

```bash
git add src/styles.css
git commit -m "feat(eval): classification badge + verdict chip styles"
git push origin master
```

---

### Task 9: Review xlsx for the PT (normalized-chart validation)

**Files:**
- Create: `docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-norms-review-xlsx.mjs`
- Output: `docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx` + copy to `C:/projects/_archive/PTApp/evaluation-system/2026-06-10-PT-norms-as-implemented.xlsx`

- [ ] **Step 1: Write the generator** (exceljs is in node_modules; re-runnable whenever charts change)

```js
// Generates the "as implemented" norms workbook the PT validates — one sheet per test,
// rows = age bands, columns = levels with their thresholds, adjustment notes inline.
// Run: node docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-norms-review-xlsx.mjs
import ExcelJS from 'exceljs';
const chartsUrl = new URL('../../../../src/normCharts.js', import.meta.url).href;
const { CHARTS, formatRunTime, CHARTS_VERSION } = await import(chartsUrl);

const NOTES = {
  pushup: 'Female chart: your 6 levels merged to 5 (Good + Above Average = "Good"). 40-49 "5-31" read as 25-31 (typo?). Please confirm.',
  pullup: 'Your chart has no age bands (18-45). Applied to ALL ages. OK? If not, send banded values.',
  invertedRow: 'As provided. Used when pull-up is unachievable (your rule).',
  squat: 'Your male chart had gaps (e.g. 18-25: nothing between 30 and 35) — values in a gap score the LOWER level. Two overlaps resolved (36-45, 46-55 Excellent starts just above Above-Average top). Please confirm.',
  run: 'As provided. 4 levels, verdict only — not in the muscle average.',
  sitReach: 'YOUR CHART IS MISSING — these are YMCA published norms (Morrow 2015), converted to cm past toes. Send yours and we swap them in.',
};
const LEVELS = ['Weak (1)', 'Below Avg (2)', 'Average (3)', 'Good (4)', 'Excellent (5)'];

const wb = new ExcelJS.Workbook();
const readme = wb.addWorksheet('Read Me');
readme.getCell('A1').value = `Norms as implemented in the app (charts version ${CHARTS_VERSION}) — generated ${new Date().toISOString().slice(0, 10)}`;
readme.getCell('A3').value = 'One sheet per test. "≥ N" = minimum value to earn that level. Check each sheet\'s note; reply with corrections and we update the app.';

for (const [testId, byGender] of Object.entries(CHARTS)) {
  const ws = wb.addWorksheet(testId);
  ws.getCell('A1').value = NOTES[testId];
  ws.getRow(1).font = { italic: true };
  let r = 3;
  for (const [gender, bands] of Object.entries(byGender)) {
    ws.getCell(r, 1).value = gender.toUpperCase();
    ws.getRow(r).font = { bold: true };
    r++;
    const header = testId === 'run'
      ? ['Age', 'Excellent (faster than)', 'Good (up to)', 'Average (up to)', 'Poor (slower)']
      : ['Age', ...LEVELS];
    header.forEach((h, i) => { ws.getCell(r, i + 1).value = h; });
    r++;
    for (const band of bands) {
      const ageLabel = band.maxAge === 999 ? `${band.minAge}+` : `${band.minAge}-${band.maxAge}`;
      if (testId === 'run') {
        ws.getCell(r, 1).value = ageLabel;
        ws.getCell(r, 2).value = formatRunTime(band.t[0]);
        ws.getCell(r, 3).value = formatRunTime(band.t[1]);
        ws.getCell(r, 4).value = formatRunTime(band.t[2]);
        ws.getCell(r, 5).value = '> ' + formatRunTime(band.t[2]);
      } else {
        ws.getCell(r, 1).value = ageLabel;
        ws.getCell(r, 2).value = `< ${band.t[0]}`;
        band.t.forEach((min, i) => { ws.getCell(r, i + 3).value = `≥ ${min}`; });
      }
      r++;
    }
    r++;
  }
  ws.columns.forEach(c => { c.width = 18; });
}

const out = new URL('./PT-Norms-As-Implemented.xlsx', import.meta.url);
await wb.xlsx.writeFile(out.pathname.replace(/^\/([A-Z]:)/, '$1'));
console.log('Written:', out.pathname);
```

- [ ] **Step 2: Run it, archive the output**

```powershell
node docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-norms-review-xlsx.mjs
Copy-Item docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx C:\projects\_archive\PTApp\evaluation-system\2026-06-10-PT-norms-as-implemented.xlsx
```

Expected: file written; open-check optional. (If the `writeFile` path mangles on Windows, replace the last two lines with a plain relative path: `await wb.xlsx.writeFile('docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx')`.)

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-norms-review-xlsx.mjs docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx
git commit -m "feat(eval): PT review workbook - norms as implemented, adjustment notes per chart"
git push origin master
```

---

### Task 10: Live-data verification

**Files:**
- Run only — no edits expected. Live snapshot: `C:/projects/_archive/PTApp/data-snapshots/2026-06-10-pre-fable5-review-data.json` (fallback: ask Pierre for a fresh export if the script wants a newer one).

- [ ] **Step 1: Run the live migration check**

Run: `node scripts/sanity/sanity-live-migration.mjs`
Expected: PASS. The v4→v5 step only adds `evaluations: []` — zero client/session diffs. If the script reports ANY changed client/session record, STOP and investigate before deploying (this gate has caught real data loss twice — Apr 21, Jun 10).

- [ ] **Step 2: Run the full sanity suite**

```bash
node scripts/sanity/sanity-evaluations.mjs && node scripts/sanity/sanity-reducer.mjs && node scripts/sanity/sanity-migration.mjs && node scripts/sanity/sanity-merge-migration.mjs && node scripts/sanity/sanity-counting.mjs && node scripts/sanity/sanity-historical-ordinals.mjs && node scripts/sanity/sanity-recurring.mjs && node scripts/sanity/sanity-slidingwindow.mjs && node scripts/sanity/sanity-arms-migration.mjs
```

Expected: every script exits 0.

- [ ] **Step 3: Commit (only if fixes were needed)** — otherwise proceed.

---

### Task 11: Docs + version bump

**Files:**
- Modify: `src/App.jsx` (debug panel version, line ~238): `v2.10.4` → `v2.11.0`
- Modify: `src/components/General.jsx` (line ~12): `DOCS.instructions` → `.../docs/instructions-v2.11.md`
- Create: `docs/instructions-v2.11.md`
- Modify: `docs/changelog-summary.md`, `docs/changelog-technical.md` (prepend v2.11 entries following each file's existing format)
- Modify: `CLAUDE.md` ("Current Version" section → v2.11.0 summary, push v2.10.4 into the one-line pointers; add the three eval reducer actions to the actions table; KNOWN ISSUES: note Pro/Elite branch parked for v2.12)

- [ ] **Step 1: Write `docs/instructions-v2.11.md`** — PT-facing, both languages' tone simple. Cover: what an evaluation is, the 5 tests + units + 30s protocol, pull-up vs inverted-row toggle, why gender+birthdate are required, the 1–5 verdicts, the Beginner A→Pro classification (muscle average bands), 8-week re-eval (history kept), how to edit/delete, the Norm Charts view in General, sit-and-reach = YMCA until his chart arrives, Pro/Elite = coming in v2.12.

- [ ] **Step 2: Update changelogs + CLAUDE.md** per the files' existing formats.

- [ ] **Step 3: Bump versions** (App.jsx + General.jsx DOCS.instructions — BOTH; the DOCS URL went stale for two releases once).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/General.jsx docs/instructions-v2.11.md docs/changelog-summary.md docs/changelog-technical.md CLAUDE.md
git commit -m "docs(eval): v2.11.0 - instructions, changelogs, version bump"
git push origin master
```

---

### Task 12: Build, verify, deploy

- [ ] **Step 1: Full pipeline** (CLAUDE.md "How to Build, Verify, and Deploy" — never skip steps)

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: build OK, `node --check` silent (exit 0).

- [ ] **Step 2: Deploy to gh-pages**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy v2.11.0: evaluation system - mass battery" && git push origin gh-pages
git checkout master
```

- [ ] **Step 3: Tell Pierre** the version (v2.11.0) for phone verification, and remind him to send `PT-Norms-As-Implemented.xlsx` to the PT for chart validation.

---

## Post-implementation notes

- **Parked for v2.12 (Pro/Elite):** branch field already in schema (`branch: 'mass'`); open PT questions — Elite-vs-Pro boundary, 1RM verdict semantics, bodyweight per eval. Do NOT start without those answers.
- **When the PT's sit-and-reach chart arrives:** replace `CHARTS.sitReach`, bump `CHARTS_VERSION` to 2, update the sanity assertions' expected values, drop the `ymcaLabel` from NormChartsView/sanity, regenerate the review xlsx.
- **Trap to record in docs/traps.md if encountered:** none anticipated; if the live-migration diff in Task 10 surprises, document it.
