# v2.12 — 1RM Battery Replaces Mass Battery (Design)

**Date:** 2026-07-06
**Status:** Approved by Pierre (brainstorming session 2026-07-06)
**Supersedes:** the Mass battery as the *active* evaluation form
(`2026-06-10-evaluation-v2-mass-battery-design.md`). Mass records and their
scoring history are preserved forever; only the authoring path changes.

## Decision summary

Pierre's calls during brainstorming (each answered explicitly):

1. **Scope — replace the whole Mass battery.** Every new evaluation is a 1RM
   test of bench press, squat, and deadlift. The reps-in-30s battery
   (push-up / pull / squat + optional run + sit-&-reach) is no longer
   authorable. Existing saved evaluations stay untouched.
2. **Scoring — bodyweight-ratio standards.** Each lift scored 1–5 against
   gender-specific BW-ratio thresholds; overall classification kept.
3. **Bodyweight — entered per evaluation** and frozen into the record
   (weight changes over time; matches freeze-at-save architecture; no client
   profile schema change). This resolves one of the three questions that had
   parked the v2.12 Pro/Elite branch.
4. **Timer — removed from the form.** 1RM attempts aren't timed.
   `EvalTimer.jsx` stays in the repo (git history + possible future rest-timer
   use) but is no longer rendered.
5. **Approach A** (of A/B/C): full swap with branch-aware history. Old mass
   records become **view-only** (Delete stays, Edit hidden) — the mass form no
   longer exists to edit them. Rejected: B (keep mass form alive purely for
   editing history — permanent dead weight for a rare action) and C (both
   branches live — the parked v2.12 plan; explicitly not what was asked).

This reverses the v2.11.0 "Mass battery is the evaluation" product decision —
Pierre's call, 2026-07-06 (same session-note pattern as the v2.11.1 timer
reversal).

## 1. Data model (additive — no migration, DATA_VERSION stays 5)

New record shape, following the existing evaluations[] conventions:

```js
{
  id, clientId, date,
  branch: '1rm',                       // old records: 'mass'
  raw: {
    bodyweightKg,                      // required, > 0, decimals allowed
    benchKg, squatKg, deadliftKg,      // required, > 0, decimals allowed (2.5 kg plates)
  },
  frozen: {                            // produced by compute1RMFrozen at save time
    age, gender,
    scores: { bench, squat, deadlift },// each 1..5 (or null on lookup failure)
    liftAvg,                           // rounded-2dp display value; classify() uses exact
    classification,                    // same catalog: begA|begB|intA|intB|pro (or null)
    chartsVersion,
  },
  _modified,
}
```

- **Ratios are NOT frozen.** `liftKg / bodyweightKg` is derivable from `raw`
  deterministically; `frozen` holds only chart-dependent values. Display
  computes ratios live.
- **All three lifts + bodyweight required** — classification is the exact
  3-lift average, mirroring the mass battery's 3-muscle-test contract. No
  optional lifts in v2.12 (YAGNI; revisit only if the PT asks).
- **`EDIT_EVALUATION` full-record contract unchanged** — editing a 1RM record
  re-freezes via `compute1RMFrozen` at the call site before dispatch. Partial
  patches remain forbidden.
- **No migration**: the change is purely additive to record shapes. Verified
  during design: a stale cached app (v2.11.x) rendering a `branch: '1rm'`
  record degrades ugly-but-non-crashing (`undefined` text, empty chips), so no
  forced-upgrade mechanism is needed.
- Merge paths (`mergeData`, `mergeBackup`, `REPLACE_ALL`) and `DELETE_CLIENT`
  cascade already treat evaluations generically by ID — no changes needed.

## 2. Scoring (`normCharts.js`)

- **Three new chart keys: `bench1rm`, `squat1rm`, `deadlift1rm`.** The existing
  `squat` rep-chart key is untouched — never rename or reuse catalog keys
  (renamed-catalog-key trap, Jun 10).
- Thresholds are **BW-ratio minimums** in the existing band format:
  `t = [min2, min3, min4, min5]` on the ratio value, per gender, **one flat age
  band** (`minAge: 0, maxAge: 999`) — same precedent as the pull-up chart
  ("applied flat to ALL ages, PT to confirm").
- **Placeholder values from published strength standards** until the PT
  confirms or supplies his own table — sit-&-reach YMCA precedent. Source and
  normalization decisions get documented in-file per existing convention, and
  the as-implemented table goes to the PT for confirmation (xlsx, like
  PT-Norms-As-Implemented.xlsx). When his numbers arrive: edit the tables, bump
  `CHARTS_VERSION`, no migration.
- **New kernel `compute1RMFrozen(gender, age, raw)`** mirroring
  `computeEvalFrozen` exactly:
  - per-lift score via the existing `lookupScore(testId, gender, age, ratio)`
    where `ratio = liftKg / raw.bodyweightKg`;
  - `liftAvg` = exact average of the three scores, `Math.round(x*100)/100` for
    display, `classify(exact)` for classification — same BegA…Pro bands;
  - same null-guard: any null lift score ⇒ `liftAvg: null,
    classification: null` (never coerce null into arithmetic);
  - stamps `chartsVersion`.
  It is THE single scoring kernel for 1RM records — form live chips and the
  save path both call it (v2.9.6 "same number, two semantics" trap class). Do
  not reimplement the lookup anywhere else.
- **`CHARTS_VERSION` 1 → 2** (chart set changed). Old frozen records keep
  their stored scores and version — history stays auditable.
- Module stays standalone (no utils.js imports) so sanity scripts keep testing
  it in isolation.

## 3. UI

### EvalForm.jsx (rewritten)
- Fields: date · bodyweight (kg) · bench · squat · deadlift.
- Each lift row: input + live 1–5 verdict chip + ratio hint ("1.43× BW"),
  chips fed by the SAME `compute1RMFrozen` result the save path freezes.
- Classification footer (liftAvg + class badge) once all four numbers are valid.
- `inputMode="decimal"` on all four inputs (iOS decimal pad has the dot;
  values in kg).
- Branch picker row **removed** (no branches left to pick).
- `EvalTimer` no longer imported/rendered; `EvalTimer.jsx` file stays.
- Edit mode only ever receives `branch: '1rm'` records (see EvalSection).
- `scoreLabel` / `scoreChipClass` exports stay — all surfaces keep sharing them.

### EvalSection.jsx (branch-aware)
- History rows render per `ev.branch`:
  - `'1rm'`: header shows liftAvg + class badge; detail rows show
    "Bench: 80 kg (1.14× BW)" + chip per lift, plus bodyweight.
  - `'mass'` (legacy): renders exactly as today (muscleAvg, per-test rows).
- **Edit button only for `branch === '1rm'`**; mass records are view-only.
  Delete stays for both (confirm-guarded, audit-logged — unchanged).

### NormChartsView.jsx
- Shows the 1RM standards table (per-gender ratio thresholds) instead of the
  mass charts. Mass charts remain in `CHARTS` (frozen-record audit trail +
  in-file documentation) but are no longer displayed.

### i18n.js
- New EN+AR strings: bench press, deadlift, bodyweight, kg/ratio hints,
  any reworded form labels. No hardcoded user-facing strings.

## 4. Testing & release

- **Sanity:** new assertions (new script or extend `sanity-evaluations.mjs`):
  ratio boundary exactness at each threshold, null-guard behavior, decimals,
  classification bands, and a **mixed-shape history fixture** (mass + 1rm
  records side by side) exercising the branch-aware render logic.
- **Live-data check:** no migration, so no live-diff gate — but assert the
  archived live snapshot's evaluation records pass through the app's
  load/merge path byte-identical.
- **Release: v2.12.0.** Full pipeline: build → bundle check → version bump in
  App.jsx debug panel → **`DOCS.instructions` bump in General.jsx to
  instructions-v2.12.md** (the v2.11 trap) → commit/push master → gh-pages
  deploy → verify Pages build reaches `built`.
- **Docs:** `instructions-v2.12.md`, both changelogs, CLAUDE.md current-version
  section (and note the reversal of the v2.11 mass-battery decision).
- **Follow-up for the PT:** send the as-implemented 1RM standards table for
  confirmation; on his reply, update tables + bump `CHARTS_VERSION`.

## Out of scope

- Rest timer between max attempts (EvalTimer repurpose) — rejected for now,
  UX-simplicity priority.
- Optional/partial lift entry, age-adjusted 1RM bands, estimated-1RM
  (rep-max formula) entry — none requested; revisit only on PT feedback.
- Any change to client profile schema (bodyweight lives per evaluation).
