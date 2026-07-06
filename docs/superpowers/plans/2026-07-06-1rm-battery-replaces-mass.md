# v2.12 — 1RM Battery Replaces Mass Battery: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Mass evaluation battery with 1RM tests (bench press, squat, deadlift) scored against bodyweight-ratio strength standards; legacy mass records stay preserved and viewable.

**Architecture:** Additive record shape `branch: '1rm'` beside legacy `branch: 'mass'` records — no migration, `DATA_VERSION` stays 5. Scoring reuses the existing `lookupScore`/`classify` machinery in `normCharts.js` via three new chart keys and a new freeze kernel `compute1RMFrozen`, which is THE single scoring path for both the form's live chips and the save path. UI: `EvalForm.jsx` rewritten for the four kg inputs, `EvalSection.jsx` renders per-branch (mass records view-only), `NormChartsView.jsx` shows the 1RM standards.

**Tech Stack:** React 18, Vite (single-file build), plain-node sanity scripts (`.mjs`), no test framework.

**Spec:** `docs/superpowers/specs/2026-07-06-1rm-battery-replaces-mass-design.md` — read it first.

## Global Constraints

- **Never delete or mutate existing chart keys** in `CHARTS` (`pushup`, `pullup`, `invertedRow`, `squat`, `run`, `sitReach`) — legacy key reuse is the renamed-catalog-key trap. New keys are `bench1rm`, `squat1rm`, `deadlift1rm`.
- **`CHARTS_VERSION` goes 1 → 2** exactly once (Task 1).
- **`DATA_VERSION` stays 5.** No migration, no schema bump.
- **`normCharts.js` stays standalone** — no imports from `utils.js`.
- **`i18n.js` gets targeted Edit-tool insertions only** — never rewrite the file wholesale (subagent-file-safety incident, 2026-06-11). Same caution for `styles.css` if touched.
- **Every user-facing string** goes through `t(lang, key)` with both EN and AR entries.
- **Inline styles:** use `marginInlineStart`/RTL-safe properties and `--t1..--t5`/`--sep` CSS vars — never hardcoded rgba or `marginLeft`.
- **Placeholder threshold values** (ratios) are deliberate: simplified from published adult strength standards (ExRx.net / Kraemer & Fleck-style tables, ratio-normalized), flagged in-file, PT to confirm. Do not "improve" them mid-implementation.
- **Commit after every task**, push to master (project rule). The gh-pages deploy happens once, in the release task.
- Run any sanity script with `node scripts/sanity/<name>.mjs` from the repo root (`C:\projects\PTApp`).

---

### Task 1: 1RM charts + `compute1RMFrozen` kernel in `normCharts.js`

**Files:**
- Modify: `src/normCharts.js` (CHARTS_VERSION at line 14; CHARTS object closes at line 114; kernel functions after `computeEvalFrozen`)
- Test: `scripts/sanity/sanity-1rm.mjs` (create)

**Interfaces:**
- Consumes: existing `lookupScore(testId, gender, age, rawValue)`, `classify(exactAvg)`, `findBand` machinery — unchanged.
- Produces: `CHARTS.bench1rm/squat1rm/deadlift1rm` (band format `{ minAge, maxAge, t: [min2,min3,min4,min5] }` where `t` holds **ratios**); `compute1RMFrozen(gender, age, raw)` with `raw = { bodyweightKg, benchKg, squatKg, deadliftKg }` returning `{ age, gender, scores: { bench, squat, deadlift }, liftAvg, classification, chartsVersion }`. Tasks 3–5 rely on these exact names.

- [ ] **Step 1: Write the failing sanity script**

Create `scripts/sanity/sanity-1rm.mjs`:

```js
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
assert(lookupScore('deadlift1rm', 'male', 30, 2.0).score === 3, 'deadlift M ratio 2.0 → 3 (gap inherits lower)');
assert(lookupScore('deadlift1rm', 'female', 30, 0.99).score === 1, 'deadlift F ratio 0.99 → 1');

// === compute1RMFrozen — all-intermediate male ===
const f1 = compute1RMFrozen('male', 25, { bodyweightKg: 80, benchKg: 80, squatKg: 120, deadliftKg: 148 });
assert(f1.scores.bench === 3 && f1.scores.squat === 3 && f1.scores.deadlift === 3, '80kg M: 80/120/148 → 3/3/3');
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/sanity/sanity-1rm.mjs`
Expected: FAIL — `CHARTS_VERSION === 2` assertion prints `✗` (still 1), exit 1. (`compute1RMFrozen` imports as `undefined` — the version assertion fails first.)

- [ ] **Step 3: Implement in `src/normCharts.js`**

3a. Line 14: `export const CHARTS_VERSION = 1;` → `export const CHARTS_VERSION = 2;` and extend the comment above it with `// v2: added 1RM battery tables (bench1rm/squat1rm/deadlift1rm).`

3b. Inside the `CHARTS` object, after the `sitReach` entry (before the closing `};` at line 114), add:

```js
  // ─── 1RM battery (v2.12) ───
  // Thresholds are 1RM-to-BODYWEIGHT RATIOS (1RM kg ÷ bodyweight kg), per gender,
  // ONE flat age band — same precedent as the pull-up chart (PT to confirm age handling).
  // PLACEHOLDER values simplified from published adult strength standards
  // (ExRx.net / Kraemer & Fleck-style tables, ratio-normalized) until the PT
  // confirms or supplies his own chart — the sit-and-reach YMCA precedent.
  // Same t = [min2, min3, min4, min5] contract as the rep charts (lookupScore
  // is reused unchanged; it compares the ratio against these minimums).
  bench1rm: {
    male: [{ minAge: 0, maxAge: 999, t: [0.75, 1.0, 1.35, 1.65] }],
    female: [{ minAge: 0, maxAge: 999, t: [0.5, 0.7, 0.9, 1.1] }],
  },
  squat1rm: {
    male: [{ minAge: 0, maxAge: 999, t: [1.25, 1.5, 2.0, 2.5] }],
    female: [{ minAge: 0, maxAge: 999, t: [0.75, 1.0, 1.5, 1.85] }],
  },
  deadlift1rm: {
    male: [{ minAge: 0, maxAge: 999, t: [1.5, 2.0, 2.5, 3.0] }],
    female: [{ minAge: 0, maxAge: 999, t: [1.0, 1.25, 1.75, 2.25] }],
  },
```

3c. After `computeEvalFrozen` (line 184), before the run-time helpers, add:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/sanity/sanity-1rm.mjs`
Expected: all `✓`, ends `sanity-1rm part 1: ALL PASS`.

Then run the existing suite (the mass kernel must be untouched except `chartsVersion: 2` — `sanity-evaluations.mjs` asserts scores/levels, not the version constant; if it DOES assert `CHARTS_VERSION === 1`, update that one assertion to `2` and nothing else):

Run: `node scripts/sanity/sanity-evaluations.mjs`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add src/normCharts.js scripts/sanity/sanity-1rm.mjs
git commit -m "feat(eval): 1RM charts (bench/squat/deadlift BW-ratio) + compute1RMFrozen kernel; CHARTS_VERSION 2"
git push origin master
```

---

### Task 2: i18n strings (EN + AR)

**Files:**
- Modify: `src/i18n.js` — EN eval block ends at line 259 (`secondsAbbrev: 's',`), AR eval block ends at line 514 (`secondsAbbrev: 'ث',`). **Targeted Edit insertions only — never rewrite this file.**

**Interfaces:**
- Produces i18n keys consumed by Tasks 3–5: `testBench`, `testSquat1rm`, `testDeadlift`, `bodyweightLabel`, `kgHint`, `oneRmHint`, `liftAvg`, `bwRatio`, `oneRmStandardsLabel`.

- [ ] **Step 1: Insert the EN block**

After line 259 (`    secondsAbbrev: 's',`), insert:

```js
    // 1RM battery (v2.12)
    testBench: 'Bench press',
    testSquat1rm: 'Squat',
    testDeadlift: 'Deadlift',
    bodyweightLabel: 'Bodyweight',
    kgHint: 'kg',
    oneRmHint: '1RM in kg',
    liftAvg: 'Lift average',
    bwRatio: '× BW',
    oneRmStandardsLabel: 'Strength standards (until coach chart arrives)',
```

- [ ] **Step 2: Insert the AR block**

After line 514 (`    secondsAbbrev: 'ث',` — line number before the EN insertion shifts it; find it by content), insert:

```js
    // 1RM battery (v2.12)
    testBench: 'ضغط الصدر (بنش)',
    testSquat1rm: 'سكوات',
    testDeadlift: 'الرفعة الميتة',
    bodyweightLabel: 'وزن الجسم',
    kgHint: 'كغ',
    oneRmHint: '1RM بالكغ',
    liftAvg: 'معدّل الرفعات',
    bwRatio: '× وزن الجسم',
    oneRmStandardsLabel: 'معايير القوة (حتى وصول جدول المدرّب)',
```

- [ ] **Step 3: Verify both locales resolve every new key**

Run:
```bash
node -e "import('file://' + process.cwd().replace(/\\\\/g,'/') + '/src/i18n.js').then(m => { const keys=['testBench','testSquat1rm','testDeadlift','bodyweightLabel','kgHint','oneRmHint','liftAvg','bwRatio','oneRmStandardsLabel']; for (const lang of ['en','ar']) for (const k of keys) { const v=m.t(lang,k); if (!v || v===k) { console.error('MISSING', lang, k); process.exit(1);} } console.log('i18n keys OK'); })"
```
Expected: `i18n keys OK`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n.js
git commit -m "feat(eval): EN+AR strings for the 1RM battery"
git push origin master
```

---

### Task 3: Rewrite `EvalForm.jsx` as the 1RM form

**Files:**
- Modify: `src/components/EvalForm.jsx` (full rewrite — replace the entire file with the content below)

**Interfaces:**
- Consumes: `compute1RMFrozen` (Task 1), i18n keys (Task 2), existing `genId/today/ageAtDate` from utils, `Modal`.
- Produces: `scoreLabel(lang, score, levelKey)` and `scoreChipClass(score, levelKey)` **must keep their exact current signatures and behavior** (including the levelKey path) — `EvalSection.jsx` and legacy mass history rendering depend on them. Saved record shape: `{ id, clientId, date, branch: '1rm', raw: { bodyweightKg, benchKg, squatKg, deadliftKg }, frozen }`.

- [ ] **Step 1: Replace the file content**

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { genId, today, ageAtDate } from '../utils';
import { compute1RMFrozen } from '../normCharts';
import { t } from '../i18n';

// Maps a 1-5 score (or run levelKey) to its i18n label + chip class.
// Exported — EvalSection and NormChartsView reuse it so a label/color change
// can never desync across surfaces. The levelKey path is kept for LEGACY mass
// records (their frozen run verdicts still render in history).
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

// v2.12: the 1RM battery form (bench / squat / deadlift vs bodyweight-ratio
// standards) — replaced the Mass battery (Pierre's call 2026-07-06, spec
// 2026-07-06-1rm-battery-replaces-mass-design.md). evalRecord = null → new eval;
// otherwise edit mode. Only branch '1rm' records are editable — EvalSection
// hides Edit on legacy mass records, so this form never sees a mass shape.
export default function EvalForm({ client, evalRecord, dispatch, lang, onClose }) {
  const [form, setForm] = useState(() => evalRecord ? {
    date: evalRecord.date,
    bodyweight: String(evalRecord.raw.bodyweightKg),
    bench: String(evalRecord.raw.benchKg),
    squat: String(evalRecord.raw.squatKg),
    deadlift: String(evalRecord.raw.deadliftKg),
  } : { date: today(), bodyweight: '', bench: '', squat: '', deadlift: '' });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Positive kg numbers, decimals allowed (2.5 kg plates). null = empty/invalid.
  const toKg = (s) => /^\d+(\.\d+)?$/.test(s.trim()) && +s.trim() > 0 ? +s.trim() : null;
  const raw = {
    bodyweightKg: toKg(form.bodyweight),
    benchKg: toKg(form.bench),
    squatKg: toKg(form.squat),
    deadliftKg: toKg(form.deadlift),
  };
  // All four values required — classification is the exact 3-lift average
  // (mirrors the mass battery's 3-required-tests contract; spec §1).
  const allValid = raw.bodyweightKg != null && raw.benchKg != null
    && raw.squatKg != null && raw.deadliftKg != null;
  const canSave = allValid && !!form.date;

  // Live preview = the SAME kernel the save path uses (v2.9.6 trap: a preview
  // that re-implements the math will eventually disagree with the stored record).
  const age = ageAtDate(client.birthdate, form.date || today());
  const frozen = allValid ? compute1RMFrozen(client.gender, age, raw) : null;

  const save = () => {
    if (!canSave) return;
    const record = {
      id: evalRecord ? evalRecord.id : genId(),
      clientId: client.id,
      date: form.date,
      branch: '1rm',
      raw,
      frozen,   // freeze-at-save: this exact object was just previewed on screen
    };
    dispatch({ type: evalRecord ? 'EDIT_EVALUATION' : 'ADD_EVALUATION', payload: record });
    onClose();
  };

  // "1.43× BW" hint — display-only, derived live from raw (ratios are NOT frozen;
  // they're deterministic from raw, spec §1).
  const ratioText = (kg) => kg != null && raw.bodyweightKg != null
    ? `${(kg / raw.bodyweightKg).toFixed(2)}${t(lang, 'bwRatio')}` : '';

  // One lift row: kg input + live ratio hint + live verdict chip
  const liftRow = (labelKey, field, scoreKey) => (
    <div className="field">
      <label className="field-label">
        {t(lang, labelKey)} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'oneRmHint')}</span>
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* decimal pad: kg values need the dot key (2.5 kg plates) */}
        <input className="input" style={{ flex: 1 }} inputMode="decimal"
          value={form[field]} onChange={set(field)} />
        <span style={{ fontSize: 12, color: 'var(--t4)', minWidth: 62, textAlign: 'center' }}>
          {ratioText(raw[field + 'Kg'])}
        </span>
        {frozen && frozen.scores[scoreKey] != null && (
          <span className={scoreChipClass(frozen.scores[scoreKey], null)}>
            {scoreLabel(lang, frozen.scores[scoreKey], null)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Modal title={evalRecord ? t(lang, 'editEval') : t(lang, 'newEval')} onClose={onClose}
      action={<button className="btn-primary" disabled={!canSave} onClick={save}>{t(lang, 'saveEval')}</button>}>

      <div className="field">
        <label className="field-label">{t(lang, 'evalDate')}</label>
        <input type="date" className="input" value={form.date} onChange={set('date')} />
      </div>

      <div className="field">
        <label className="field-label">
          {t(lang, 'bodyweightLabel')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'kgHint')}</span>
        </label>
        <input className="input" inputMode="decimal"
          value={form.bodyweight} onChange={set('bodyweight')} />
      </div>

      {liftRow('testBench', 'bench', 'bench')}
      {liftRow('testSquat1rm', 'squat', 'squat')}
      {liftRow('testDeadlift', 'deadlift', 'deadlift')}

      {/* Classification — appears once all four numbers are valid */}
      {frozen && (
        <div className="field" style={{ borderTop: '1px solid var(--sep)', paddingTop: 12, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {t(lang, 'liftAvg')}: <strong style={{ color: 'var(--t1)' }}>{frozen.liftAvg}</strong>
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

Notes for the implementer:
- The branch-picker row, `EvalTimer` import/render, pull-variant toggle, and all mass-battery parse logic are GONE — that is the point. `src/components/EvalTimer.jsx` is NOT deleted; it just loses its only consumer.
- `frozen.classification` can be null (unknown gender) while `frozen` itself is non-null — but the footer renders only when `frozen` exists AND save is possible; with null classification the badge would read `badge-class-null`. Guard the footer with `frozen && frozen.classification` instead of bare `frozen` if you prefer — but keep the `canSave` gate as written (a null classification is still a saveable, visibly-incomplete record per the kernel contract? **No** — for the FORM, all four inputs valid but null classification means gender drift; the record would freeze incomplete. Render the footer only when `frozen.classification` is non-null: change the guard to `{frozen && frozen.classification && (` — this is the required implementation).

- [ ] **Step 2: Build + bundle check**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```
Expected: build succeeds; `node --check` silent (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/components/EvalForm.jsx
git commit -m "feat(eval): EvalForm rewritten as 1RM form (bodyweight + bench/squat/deadlift, live ratio + chips)"
git push origin master
```

---

### Task 4: Branch-aware `EvalSection.jsx` (legacy mass records view-only)

**Files:**
- Modify: `src/components/EvalSection.jsx`

**Interfaces:**
- Consumes: `scoreLabel`/`scoreChipClass` from EvalForm (unchanged signatures), i18n keys from Task 2, `formatRunTime` from normCharts (still needed for legacy run rows).
- Produces: no new exports. Behavior contract: `branch === '1rm'` records get Edit + Delete; anything else (legacy `'mass'`) gets Delete only.

- [ ] **Step 1: Make `detailRows` branch-aware**

Replace the current `detailRows` function (lines 25–32) with:

```jsx
  // Per-test display rows for an expanded record: [labelKey, rawText, score, levelKey].
  // Branch-aware: '1rm' records (v2.12+) show kg + live-derived BW ratio; legacy
  // 'mass' records (v2.11) render exactly as before — preserved forever, view-only.
  const ratioTxt = (kg, bw) => `${kg} ${t(lang, 'kgHint')} (${(kg / bw).toFixed(2)}${t(lang, 'bwRatio')})`;
  const detailRows = (ev) => ev.branch === '1rm' ? [
    ['bodyweightLabel', `${ev.raw.bodyweightKg} ${t(lang, 'kgHint')}`, null, null],
    ['testBench', ratioTxt(ev.raw.benchKg, ev.raw.bodyweightKg), ev.frozen.scores.bench, null],
    ['testSquat1rm', ratioTxt(ev.raw.squatKg, ev.raw.bodyweightKg), ev.frozen.scores.squat, null],
    ['testDeadlift', ratioTxt(ev.raw.deadliftKg, ev.raw.bodyweightKg), ev.frozen.scores.deadlift, null],
  ] : [
    ['testPushup', `${ev.raw.pushup}`, ev.frozen.scores.pushup, null],
    [ev.pullVariant === 'pullup' ? 'testPullup' : 'testInvertedRow', `${ev.raw.pull}`, ev.frozen.scores.pull, null],
    ['testSquat', `${ev.raw.squat}`, ev.frozen.scores.squat, null],
    ...(ev.raw.runSec != null ? [['testRun', formatRunTime(ev.raw.runSec), null, ev.frozen.scores.run]] : []),
    ...(ev.raw.sitReachCm != null ? [['testSitReach', `${ev.raw.sitReachCm} cm`, ev.frozen.scores.sitReach, null]] : []),
  ];
```

- [ ] **Step 2: Branch-aware history header**

Replace the average span (currently lines 57–59):

```jsx
              <span style={{ color: 'var(--t5)', marginInlineStart: 8 }}>
                {ev.branch === '1rm'
                  ? <>{t(lang, 'liftAvg')} {ev.frozen.liftAvg ?? '—'}</>
                  : <>{t(lang, 'muscleAvg')} {ev.frozen.muscleAvg ?? '—'}</>}
              </span>
```

- [ ] **Step 3: Gate the Edit button to 1RM records**

Replace the Edit button (lines 75–76) with:

```jsx
                {/* Legacy mass records are VIEW-ONLY (spec §3): the mass form no
                    longer exists to edit them. Delete stays for both branches. */}
                {ev.branch === '1rm' && (
                  <button className="btn-ghost" style={{ fontSize: 12 }}
                    onClick={() => setFormTarget(ev)}>{t(lang, 'edit')}</button>
                )}
```

- [ ] **Step 4: Build + bundle check**

Same two commands as Task 3 Step 2. Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/EvalSection.jsx
git commit -m "feat(eval): branch-aware eval history - 1RM records editable, legacy mass records view-only"
git push origin master
```

---

### Task 5: `NormChartsView.jsx` shows the 1RM standards

**Files:**
- Modify: `src/components/NormChartsView.jsx` (full rewrite — replace the entire file with the content below)

**Interfaces:**
- Consumes: `CHARTS` (with the Task 1 keys), i18n keys from Task 2.
- Produces: no exports consumed elsewhere.

- [ ] **Step 1: Replace the file content**

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { CHARTS } from '../normCharts';
import { t } from '../i18n';

// v2.12: the reference shows the ACTIVE battery only — the 1RM strength
// standards. Mass charts remain in CHARTS (frozen-record audit trail + in-file
// documentation) but are no longer displayed. Rendered FROM the CHARTS data the
// scoring engine uses, so the reference can never drift from what the app
// actually scores (v2.9.6 two-sources trap).
const ONE_RM_TESTS = ['bench1rm', 'squat1rm', 'deadlift1rm'];
const TEST_LABELS = { bench1rm: 'testBench', squat1rm: 'testSquat1rm', deadlift1rm: 'testDeadlift' };

export default function NormChartsView({ lang, onClose }) {
  const [gender, setGender] = useState('male');

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

      <div style={{ fontSize: 11, color: 'var(--t5)', marginBottom: 10 }}>
        {t(lang, 'oneRmStandardsLabel')}
      </div>

      {/* One row per lift: threshold ratios to REACH levels 2..5 (below min2 = level 1).
          Values are 1RM ÷ bodyweight — flat for all ages (pull-up chart precedent). */}
      <div style={{ display: 'flex', fontSize: 11, fontWeight: 600, color: 'var(--t3)',
        borderBottom: '1px solid var(--sep)', padding: '4px 0' }}>
        <div style={{ flex: 1.4 }} />
        {[2, 3, 4, 5].map(n => (
          <div key={n} style={{ flex: 1, textAlign: 'center' }}>{t(lang, `level${n}`)}</div>
        ))}
      </div>
      {ONE_RM_TESTS.map(testId => (
        <div key={testId} style={{ display: 'flex', fontSize: 12, color: 'var(--t2)',
          borderBottom: '1px solid var(--sep)', padding: '6px 0' }}>
          <div style={{ flex: 1.4, color: 'var(--t4)' }}>{t(lang, TEST_LABELS[testId])}</div>
          {CHARTS[testId][gender][0].t.map((min, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>≥{min}{t(lang, 'bwRatio')}</div>
          ))}
        </div>
      ))}
    </Modal>
  );
}
```

- [ ] **Step 2: Build + bundle check**

Same two commands as Task 3 Step 2. Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/NormChartsView.jsx
git commit -m "feat(eval): NormChartsView shows 1RM BW-ratio standards (active battery only)"
git push origin master
```

---

### Task 6: Reducer-coexistence sanity (part 2) + full suite run

**Files:**
- Modify: `scripts/sanity/sanity-1rm.mjs` (append part 2)

**Interfaces:**
- Consumes: `baseReducer` from `src/utils.js` (same import pattern as `sanity-reducer.mjs`), `compute1RMFrozen` from Task 1.

- [ ] **Step 1: Append part 2 to `sanity-1rm.mjs`**

Replace the final `console.log('sanity-1rm part 1: ALL PASS');` line with:

```js
console.log('sanity-1rm part 1: ALL PASS');

// ═══ Part 2: reducer coexistence — 1rm and mass records live side by side ═══
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { baseReducer } = await import(utilsUrl);

const massRec = {  // legacy v2.11 shape — must survive every path untouched
  id: 'ev-mass', clientId: 'c1', date: '2026-06-12', branch: 'mass', pullVariant: 'pullup',
  raw: { pushup: 18, pull: 7, squat: 36, runSec: null, sitReachCm: null },
  frozen: { age: 30, gender: 'male', scores: { pushup: 3, pull: 4, squat: 4, run: null, sitReach: null },
    muscleAvg: 3.67, classification: 'intA', chartsVersion: 1 },
  _modified: '2026-06-12T10:00:00Z',
};
const rmFrozen = compute1RMFrozen('male', 30, { bodyweightKg: 80, benchKg: 80, squatKg: 120, deadliftKg: 160 });
const rmRec = {
  id: 'ev-1rm', clientId: 'c1', date: '2026-07-06', branch: '1rm',
  raw: { bodyweightKg: 80, benchKg: 80, squatKg: 120, deadliftKg: 160 },
  frozen: rmFrozen,
};

const state0 = {
  _dataVersion: 5,
  clients: [{ id: 'c1', name: 'Test', packages: [], _modified: '2026-01-01T00:00:00Z' }],
  sessions: [], evaluations: [massRec], todos: [], messageTemplates: {}, auditLog: [],
  _lastModified: '2026-01-01T00:00:00Z',
};

const s1 = baseReducer(state0, { type: 'ADD_EVALUATION', payload: rmRec });
assert(s1.evaluations.length === 2, 'ADD_EVALUATION appends the 1rm record beside the mass record');
assert(JSON.stringify(s1.evaluations[0]) === JSON.stringify(massRec), 'legacy mass record byte-identical after add');
assert(!!s1.evaluations[1]._modified, '1rm record stamped _modified');

const edited = { ...rmRec, raw: { ...rmRec.raw, benchKg: 85 },
  frozen: compute1RMFrozen('male', 30, { bodyweightKg: 80, benchKg: 85, squatKg: 120, deadliftKg: 160 }) };
const s2 = baseReducer(s1, { type: 'EDIT_EVALUATION', payload: edited });
assert(s2.evaluations.find(e => e.id === 'ev-1rm').raw.benchKg === 85, 'EDIT_EVALUATION full-record replace works on 1rm shape');
assert(JSON.stringify(s2.evaluations.find(e => e.id === 'ev-mass')) === JSON.stringify(massRec), 'mass record untouched by 1rm edit');

const s3 = baseReducer(s2, { type: 'DELETE_CLIENT', payload: 'c1' });
assert(s3.evaluations.length === 0, 'DELETE_CLIENT cascades BOTH record shapes (no orphans)');

console.log('sanity-1rm part 2: ALL PASS');
```

- [ ] **Step 2: Run it**

Run: `node scripts/sanity/sanity-1rm.mjs`
Expected: parts 1 and 2 both ALL PASS. If `EDIT_EVALUATION` in `utils.js` stamps `_modified` on the payload (check the reducer), the byte-identical comparison for the EDITED record may need to ignore `_modified` — but the two **mass**-record assertions must hold exactly as written; if they fail, the reducer is mutating records it shouldn't and that is a real bug to investigate (systematic-debugging), not an assertion to weaken.

- [ ] **Step 3: Run the full sanity suite**

```bash
node scripts/sanity/sanity-reducer.mjs
node scripts/sanity/sanity-counting.mjs
node scripts/sanity/sanity-slidingwindow.mjs
node scripts/sanity/sanity-migration.mjs
node scripts/sanity/sanity-evaluations.mjs
node scripts/sanity/sanity-historical-ordinals.mjs
node scripts/sanity/sanity-recurring.mjs
node scripts/sanity/sanity-merge-migration.mjs
node scripts/sanity/sanity-1rm.mjs
node scripts/sanity/sanity-live-v5-diff.mjs
```
Expected: every script ALL PASS. (`sanity-live-migration.mjs` is deliberately excluded — stale v2→v3-era script, per CLAUDE.md. `sanity-live-v5-diff.mjs` doubles as the live-snapshot byte-identity check: no schema change ⇒ migrateData is identity on v5 data, evaluations pass through untouched.)

- [ ] **Step 4: Commit**

```bash
git add scripts/sanity/sanity-1rm.mjs
git commit -m "test(eval): 1rm/mass reducer coexistence assertions (sanity-1rm part 2)"
git push origin master
```

---

### Task 7: Version bump, docs, build, deploy

**Files:**
- Modify: `src/App.jsx:238` (version string), `src/components/General.jsx:13` (DOCS.instructions URL)
- Create: `docs/instructions-v2.12.md`
- Modify: `docs/changelog-summary.md`, `docs/changelog-technical.md`, `CLAUDE.md`
- Deploy: gh-pages (`index.html`, `sw.js`, `manifest.json`)

- [ ] **Step 1: Version + docs-pointer bumps**

- `src/App.jsx` line 238: `v2.11.1` → `v2.12.0`.
- `src/components/General.jsx` line 13: `instructions-v2.11.md` → `instructions-v2.12.md` (the v2.10.1 trap — this URL went stale for two releases once).

- [ ] **Step 2: Write `docs/instructions-v2.12.md`**

```markdown
# PTApp v2.12 — 1RM Battery (replaces the Mass battery)

## What changed for the PT
- "Evaluate" now records a **1RM strength test**: bodyweight + max single-rep
  bench press, squat, and deadlift (all in kg, decimals fine — 2.5 kg plates).
- Each lift gets a live verdict (Weak … Excellent) based on the lift-to-
  bodyweight ratio, plus the same overall classification (Beginner A … Pro).
- The old 30-second evaluations are still in each client's history — you can
  view and delete them, but not edit them (the old form is gone).
- Norm Charts (General panel) now shows the strength-standard ratios.
- The standards are published general values until the coach sends his own
  table — same as the sit-&-reach chart before.

## Technical
- New records: `branch: '1rm'`, `raw: { bodyweightKg, benchKg, squatKg,
  deadliftKg }`, frozen `scores: { bench, squat, deadlift }` + `liftAvg` +
  `classification`. No migration; DATA_VERSION stays 5.
- `compute1RMFrozen` in `normCharts.js` is THE scoring kernel (form chips +
  save path). Chart keys `bench1rm/squat1rm/deadlift1rm`; `CHARTS_VERSION` = 2.
- Ratios are never frozen — always derived from `raw` at display time.
- Timer console removed from the form (1RM attempts aren't timed);
  `EvalTimer.jsx` retained in repo, unrendered.
- Spec: `docs/superpowers/specs/2026-07-06-1rm-battery-replaces-mass-design.md`.
```

- [ ] **Step 3: Changelog entries**

`docs/changelog-summary.md` — prepend (match the file's existing entry format):

```markdown
## v2.12.0 — 2026-07-06
Evaluations switched from the 30-second battery to 1RM strength tests (bench
press, squat, deadlift vs bodyweight). Old evaluations stay in history,
view-only. Norm Charts shows the new strength standards.
```

`docs/changelog-technical.md` — prepend (match format):

```markdown
## v2.12.0 — 2026-07-06
- 1RM battery replaces Mass battery (spec 2026-07-06). branch:'1rm' records,
  additive shape, no migration (DATA_VERSION 5).
- normCharts.js: bench1rm/squat1rm/deadlift1rm BW-ratio charts (placeholder
  published standards, PT to confirm), compute1RMFrozen kernel, CHARTS_VERSION 2.
- EvalForm.jsx rewritten (bodyweight + 3 lifts, decimal pads, live ratio +
  chips, EvalTimer + branch picker removed). EvalSection branch-aware; mass
  records view-only (Edit hidden, Delete kept). NormChartsView shows 1RM table.
- scripts/sanity/sanity-1rm.mjs (kernel boundaries, null guards, reducer
  coexistence). Reverses the v2.11 "Mass battery is the evaluation" decision —
  Pierre's call 2026-07-06.
```

- [ ] **Step 4: Update `CLAUDE.md`**

Add a new "Current Version: v2.12.0" section above the v2.11.1 one (demote that heading to "Previous Version"), summarizing: 1RM battery replaces mass (Pierre's call 2026-07-06), `compute1RMFrozen` kernel rule (never reimplement), `bench1rm/squat1rm/deadlift1rm` chart keys, CHARTS_VERSION 2, placeholder-standards-until-PT-confirms, mass records view-only, EvalTimer unrendered-but-retained, no schema change. Also update the "Sit & reach = YMCA placeholder" bullet's context if needed (mass battery no longer authorable) and add `sanity-1rm.mjs` to the sanity-scripts list in the deploy section.

- [ ] **Step 5: Build, verify, commit, push master**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
git add src/App.jsx src/components/General.jsx docs/instructions-v2.12.md docs/changelog-summary.md docs/changelog-technical.md CLAUDE.md
git commit -m "docs(eval): v2.12.0 - version bump, changelogs, instructions, CLAUDE.md"
git push origin master
```

- [ ] **Step 6: Deploy to gh-pages and VERIFY the Pages build**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json
git commit -m "Deploy v2.12.0: 1RM battery replaces Mass battery"
git push origin gh-pages
git checkout master
gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status
```
Expected: final command reaches `built` (poll a few times if `building`; if stuck, `gh api -X POST repos/pih-dev/PTApp/pages/builds` and re-verify — Jun 11 artifact-race incident).

- [ ] **Step 7: Tell Pierre**

Report: version v2.12.0 live, and the follow-up — **send the PT an as-implemented 1RM standards table** (xlsx, like PT-Norms-As-Implemented.xlsx) for confirmation; when his numbers arrive, edit the three tables and bump `CHARTS_VERSION` to 3 (no migration).

---

## Self-review notes (done at write time)

- **Spec coverage:** §1 data model → Tasks 1/3/6; §2 scoring → Task 1; §3 EvalForm/EvalSection/NormChartsView/i18n → Tasks 3/4/5/2; §4 testing → Tasks 1/6, release → Task 7. Out-of-scope items have no tasks (correct).
- **Type consistency:** `raw` keys `bodyweightKg/benchKg/squatKg/deadliftKg` and `frozen.scores` keys `bench/squat/deadlift` are identical across Tasks 1, 3, 4, 6. i18n keys in Tasks 3/4/5 all defined in Task 2. `scoreLabel/scoreChipClass` signatures unchanged (Task 3) as consumed by Task 4.
- **Known judgment call encoded:** classification footer renders only when `frozen.classification` is non-null (Task 3 note).
