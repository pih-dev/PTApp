# Evaluation System v2 — Mass-Population Battery (v2.11) — Design Spec

**Date:** 2026-06-10 · **Status:** Approved approach (B — staged), spec pending Pierre's review
**Provenance:** PT feedback ingested 2026-06-10 — see `docs/superpowers/artifacts/2026-06-09-evaluation-v2/2026-06-10-PT-feedback-ingested.md`. Originals in `_archive/PTApp/evaluation-system/2026-06-10-*`.

## Decisions log (approved by Pierre 2026-06-10)

| Decision | Choice |
|---|---|
| Approach | **B — Staged.** v2.11 = Mass battery + classification + history + chart reference. v2.12 = Pro/Elite 1RM branch. |
| Sit-and-reach norms | **YMCA published norms meanwhile**, clearly labeled; swap when the PT sends his chart. |
| Score semantics | **Freeze at save** — computed scores, classification, and the age/sex used are stored in the record. Raw values also stored. |
| Eval entry point | **Client card in Clients tab** ("Evaluate" action). |
| Mistake handling | **Editable evals** — edit form recomputes frozen scores on save (plus delete with confirm). |
| Pro branch in v2.11 | **Visible but disabled** in the branch picker. |

## Scope

**In (v2.11):** Mass-population battery — 5 tests, raw-value input, 1–5 scoring via bundled norm charts, Beg A → Pro classification, per-client eval history, app-wide chart reference view, EN+AR i18n.

**Out (later):** Pro/Elite 1RM branch (v2.12 — blocked on PT answers: Elite-vs-Pro boundary, 1RM verdict semantics, bodyweight capture). Feature #3 program proposal (consumes the per-level volume prescriptions the PT gave in Q4).

## The PT's rules (source of truth)

- Trainer manually picks the branch (Mass vs Pro/Elite). v2.11 implements Mass only.
- 5 tests, PT measures with his own equipment, types **raw values**: push-ups (reps/30s), pull-ups **or** inverted row (reps/30s; row is the stated equivalent when pull-up is unachievable), bodyweight squat (reps/30s), 1-mile run (time), sit-and-reach (cm).
- Each test scored **1–5**: 1 Weak/Poor · 2 Below Average · 3 Average · 4 Good/Above Average · 5 Excellent/Elite.
- **Classification = average of the 3 muscle-test scores** (push, pull-variant, squat): 1–1.9 Beginner A · 2–2.9 Beginner B · 3–3.9 Intermediate A · 4 Intermediate B · 4.1–5 Pro. (Averages of three integers are thirds, so the bands are exhaustive: `<2 → BegA`, `<3 → BegB`, `<4 → IntA`, `=4 → IntB`, `>4 → Pro`.)
- Run and sit-and-reach get verdicts but are **excluded from the muscle average**.
- Re-eval every ~8 weeks → history **appends**, never overwrites.
- Norm-chart reference reachable from anywhere in the app.

## Data model (schema v4 → v5)

New top-level `state.evaluations: Array<Evaluation>` — the sessions pattern: per-record `_modified`, union-by-ID in `mergeData`, deleted with their client in `DELETE_CLIENT`.

```js
{
  id,                  // uid()
  clientId,
  date,                // local YYYY-MM-DD (eval day; editable)
  branch: 'mass',      // 'pro' arrives in v2.12
  // raw inputs (what the PT typed)
  pullVariant: 'pullup' | 'invertedRow',
  raw: { pushup: Number, pull: Number, squat: Number,
         runSec: Number|null, sitReachCm: Number|null },   // run + sit-reach optional
  // frozen at save / re-frozen on edit
  frozen: {
    age: Number, gender: 'male'|'female',   // inputs used for the lookup
    scores: { pushup: 1-5, pull: 1-5, squat: 1-5,
              run: levelKey|null, sitReach: 1-5|null },
    muscleAvg: Number,                       // stored rounded to 2 decimals for display;
                                             // classify() runs on the EXACT sum/3, never the rounded value
    classification: 'begA'|'begB'|'intA'|'intB'|'pro',
    chartsVersion: 1                         // bundled-chart revision used
  },
  _modified
}
```

- **Required to save:** the 3 muscle tests. Run and sit-and-reach are optional (they don't feed the classification; the PT may not always run the mile).
- **Freeze rationale:** an eval is a point-in-time assessment. Later chart fixes or client birthdays must not silently rewrite history. `chartsVersion` records which bundled revision scored it. Editing a record re-runs the lookup with the (possibly edited) date and the client's current birthdate/gender, and re-freezes.
- **Age at eval:** computed from `client.birthdate` and the eval `date` (not "today").
- **Profile gate:** chart lookup needs gender + birthdate. The Evaluate action prompts to complete the profile first if either is missing.
- **Migration v4→v5:** add `evaluations: []`, bump `DATA_VERSION` to 5. No client/session changes. Run `sanity-live-migration.mjs` against the PT's real export before deploy (per `docs/traps.md`).

## Norm charts — `src/normCharts.js` (bundled static data)

One module owns the charts and the lookup. **Never inline thresholds in components.**

```js
lookupScore(testId, gender, age, rawValue) -> { score, levelKey }
classify(muscleAvg) -> 'begA'|...|'pro'
CHARTS_VERSION = 1
```

Representation: per test × gender, ordered age bands `{ minAge, maxAge, thresholds: [min2, min3, min4, min5] }` — the minimum raw value to reach each level; below `min2` → level 1. Run uses descending time thresholds (faster = better) with 4 levels. Band edges: a client younger than the lowest band uses the lowest; older than the highest uses the highest (documented per chart below).

### Normalization rules applied to the PT's charts

The PT's docx tables contain gaps, overlaps, and one typo. Normalization rule: **thresholds = the stated lower bound of each level's range**; values falling in a gap inherit the level *below* (honest to the source — we never award a level the chart doesn't grant). Every adjustment is listed here and goes back to the PT in a cleaned review-xlsx for validation.

**Push-up, male** (bands 17–29 / 30–49 / 50+): `[9,15,21,28]` / `[6,11,17,24]` / `[4,8,13,19]`. No adjustments.

**Push-up, female — from knees** (17–19 / 20–29 / 30–39 / 40–49 / 50–59 / 60–65→open-ended): source has **6 levels**; collapsed to 5 by merging "Above Av" + "Good" into level 4 (lower bound = Above Av's), "Excellent" = level 5. Typo fixed: 40–49 Good "5–31" read as 25–31 (consistent with neighbors). Result: `[6,11,21,36]` / `[7,12,23,37]` / `[5,10,22,38]` / `[4,8,18,32]` / `[3,7,15,26]` / `[2,5,13,24]`.

**Pull-up** (single band 18–45, applied flat to **all ages** — flagged to PT): male `[3,6,11,15]`, female `[1,2,4,6]`. No age bands in the source.

**Inverted row** (18–35 / 36–50 / 51+): male `[8,14,20,26]` / `[6,11,16,22]` / `[4,8,13,18]`; female `[5,10,15,20]` / `[4,8,12,17]` / `[3,6,10,14]`. No adjustments. Pull-up and inverted-row scores are interchangeable per the PT ("the equivalent").

**Squat, male** (18–25 / 26–35 / 36–45 / 46–55 / 56–65 / 66+): the messiest source — every band has gaps and two have boundary overlaps. Lower-bound rule applied: `[25,35,39,44]` / `[22,31,35,40]` / `[17,27,30,35]` / `[13,22,25,29]` / `[9,17,21,25]` / `[7,15,19,24]`. Adjustments: gap values (e.g. 31–34 in 18–25) inherit the lower level; 36–45 "Excellent >33" vs "Above 30–34" overlap resolved to min5=35; 46–55 "Poor <9" vs "Below 13–17" → below 13 is level 1; "65" appearing in two bands resolved to 56–65 / 66+.

**Squat, female** (20–29 / 30–39 / 40–49 / 50+; source labels "Not great"/"Bad" = levels 2/1): `[16,21,26,31]` / `[15,20,25,30]` / `[13,18,23,28]` / `[6,9,14,18]`. Single-value boundary gaps (e.g. exactly 15 or 31 in 20–29) inherit the lower level. Under-20 females use the 20–29 band (flagged to PT).

**1-mile run** (18–29 / 30–39 / 40–49 / 50+; **4 levels**: Excellent / Good / Average / Poor — verdict only, never in the muscle average). Male upper-time cutoffs (mm:ss): Exc <5:45/5:50/6:05/6:35 · Good ≤7:00/7:10/7:30/8:00 · Avg ≤9:00/9:30/10:00/10:45 · slower = Poor. Female: Exc <7:00/7:15/7:45/8:30 · Good ≤8:30/9:00/9:30/10:15 · Avg ≤11:00/11:30/12:00/13:00 · slower = Poor.

**Sit-and-reach:** YMCA published norms from `_archive/PTApp/evaluation-system/2026-06-09-PUBLISHED-NORMS-Reference.xlsx` (the one test with solid published data), converted to cm if the source is inches. UI labels the verdict "YMCA norms" until the PT's own chart replaces it (then `CHARTS_VERSION` bumps).

## UI

Three surfaces, all bottom-sheet/mobile-first, EN+AR, RTL-safe (`marginInlineStart` etc.), controls in the bottom 60%.

1. **Eval form** (from "Evaluate" on a client in Clients tab): branch picker at top — Mass active, **Pro/Elite visible but disabled** ("coming soon"). Date (defaults today), pull-variant toggle (Pull-ups / Inverted row), then five labeled raw inputs with unit hints (reps ×3, mm:ss, cm). Per-test verdict chips compute live as he types (same `lookupScore` the save path uses — one source of truth, per the v2.9.6 same-number-two-semantics trap). Muscle average + classification badge render once the 3 muscle inputs are filled. Save dispatches `ADD_EVALUATION`.
2. **Eval history** (client detail in Clients tab): newest-first list — date, classification badge, muscle average; tap to expand per-test raw + verdict. Row actions: Edit (reopens the form pre-filled; save re-freezes via `EDIT_EVALUATION`) and Delete (confirm; `DELETE_EVALUATION`). Client card shows the latest classification as a small badge.
3. **Norm-chart reference** (entry in General panel + link from the eval form): read-only, gender toggle, one collapsible table per test, rendered **from `normCharts.js`** so the reference can never drift from the scoring. Sit-and-reach table carries the "YMCA norms" source label.

Classification badge colors follow the existing badge system (CSS classes, no inline colors); exact palette decided at implementation within `docs/design-system.md` constraints.

## Reducer, sync, audit

| Action | Payload | Notes |
|---|---|---|
| `ADD_EVALUATION` | full record | Appends; stamps `_modified`. |
| `EDIT_EVALUATION` | `{id, ...fields}` | Replaces raws/date/variant, **re-freezes** scores; stamps `_modified`; appends an `evaluation_edited` audit entry (before/after raws). |
| `DELETE_EVALUATION` | `evalId` | Confirm-guarded in UI; appends an `evaluation_deleted` audit entry carrying the deleted record (forensics — preserve-history rule). |

- `mergeData`: union `evaluations` by ID, `_modified` wins — same as sessions. Foreign blobs migrate by their own `_dataVersion` first (v2.10.1 trap; covered by `sanity-merge-migration.mjs` extension).
- `DELETE_CLIENT`: also removes the client's evaluations (consistent with sessions).
- Sync: evaluations ride the existing debounced push; no new sync code.

## Testing

New `scripts/sanity/sanity-evaluations.mjs`:
- `lookupScore` at **every band boundary** of every chart × gender (incl. gap values landing on the lower level, the female push-up collapse, run time thresholds, band-edge ages).
- `classify` edges: 1.67→BegA, 2.0→BegB, 3.67→IntA, 4.0→IntB, 4.33→Pro.
- Reducer: ADD/EDIT (re-freeze correctness)/DELETE + audit entries; DELETE_CLIENT cascade.
- Migration v4→v5 on a synthetic fixture **and** the archived live snapshot (synthetic-vs-live trap); merge of a foreign v4 blob.

Pre-deploy: `sanity-live-migration.mjs` against the PT's real export; full build-verify-deploy pipeline per CLAUDE.md.

## Deliverable back to the PT

A cleaned **review xlsx** of the normalized tables (every adjustment marked) so he can validate the gap/typo resolutions — generated during implementation, sent with the v2.11 release note.

## Open questions (parked for v2.12 / PT)

1. Sit-and-reach: his own chart to replace YMCA?
2. Pull-up chart has no age bands (18–45) — confirm flat application or supply bands.
3. Validate the squat gap/overlap resolutions (review xlsx).
4. Elite vs Pro boundary — what promotes a high-level athlete to Elite?
5. 1RM verdict semantics — pass/fail vs benchmark multiples, or graded? Bodyweight captured per eval.
