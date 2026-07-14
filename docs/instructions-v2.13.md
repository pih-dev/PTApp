# PTApp v2.13 — Program Generation from 1RM Evaluation

## What changed for the PT
- A client with a completed 1RM evaluation now gets a **Generate program**
  button on their card: a full **6-month training plan** (six 4-week blocks,
  3-day Push/Pull/Legs weeks), built automatically from that evaluation.
- **Volume is set by the client's class** (Beginner A → Pro) from the eval,
  and **weak points get extra emphasis** — the lift that scored lowest
  (bench/squat/deadlift) drives extra sets for its muscle group, alternating
  between two strategies block to block so the emphasis doesn't just inflate
  total volume.
- **Setup sheet** before generating: shows the class + the three lift scores
  with the weak one flagged, a body-fat % field (auto-ticks the fat-loss
  block at 18% for men / 25% for women — trainer can always override), six
  method dropdowns (one per block, pre-filled with a sensible default
  sequence), and a start date (defaults to next Monday).
- **Viewer**: block cards → weeks → days → exercises, each with sets × reps,
  %1RM, rest time. The three "anchor" lifts (Flat Barbell Press, Back Squat,
  Deadlift) also show a real **kg** number computed from the eval's 1RM —
  every other exercise shows %1RM/reps only, and the trainer sets the load
  by feel.
- **Swap** any exercise for a same-muscle, same-type alternative. **Sets and
  reps are not editable** — deliberate, per Elie: the trainer adjusts load
  and effort by how the client performs on the day, not by editing the plan.
- **Regenerate** anytime — the old program stays in the client's history,
  never deleted. The viewer always shows the latest.
- Generation requires a 1RM evaluation with **all three lifts scored**
  (bench, squat, deadlift) plus gender + age on file. If any lift is blank,
  the button explains why it's disabled instead of guessing.

## Technical

### Schema: v5 → v6 (purely additive)
- New top-level `state.programs: Array<Program>`. Migration just seeds
  `programs: []` if absent — nothing else changes, no data touched.
- `DATA_VERSION` bumped 5 → 6. Live-diff gate:
  `scripts/sanity/sanity-live-v6-diff.mjs` (replaces the v5 gate).
- Program record: `{ id, clientId, evalId, createdAt, startDate, fatPct,
  rulesVersion, bankVersion, classification, ranks: {weak, mid, strong},
  blocks: [...] }`. **Frozen at generation** — later changes to the volume
  rules or the exercise bank never rewrite a stored program (same
  "freeze the scoring, not the chart" philosophy as `compute1RMFrozen` /
  `computeEvalFrozen`). `PROGRAM_RULES_VERSION` (`programRules.js`) and
  `EXERCISE_BANK_VERSION` (`exerciseBank.js`) are stamped on every record and
  must be bumped on ANY change to the rules or the bank.

### The one kernel
- **`generateProgram({ id, client, evalRecord, fatPct, includeFatLoss,
  methods, startDate, createdAt })` in `src/programKernel.js` is THE single
  generation kernel.** `ProgramSetup.jsx`'s live preview and the actual save
  path call this exact function with the exact same arguments — by
  construction the preview can never disagree with what gets stored (same
  rule as `compute1RMFrozen`/`computeEvalFrozen`: never reimplement the
  volume math, weak-point ranking, or exercise-fill logic anywhere else).
- Supporting pure-data modules: `src/programRules.js` (tiers, method
  catalog, fat-loss thresholds, weak-point ranking/tie-break, quota math —
  no React, no state) and `src/exerciseBank.js` (generated bank + muscle
  taxonomy — **generated file, do not hand-edit**; regenerate via
  `scripts/build_exercise_bank.py` from the source xlsx archived at
  `_archive/PTApp/program-source/`, and bump `EXERCISE_BANK_VERSION` only
  when Elie ships a new bank).

### Volume model (spec §3)
- Weekly set tiers per MAJOR muscle (Chest/Back/Legs), by class: begA 9–11 ·
  begB 11–13 · intA 14–17 · intB 18–21 · pro 21–24.
- **Minors ride their day's major at HALF volume**: `minorQuota(majorSets) =
  round(majorSets / 2)`. One rule implements both of Elie's requirements at
  once — every minor sits at half its major's tier, AND on the weak-day
  (odd blocks) the minors automatically land at the top of their half-tier
  because the major itself is at the top of its tier that day. No second
  bookkeeping path needed.
- **Strength blocks (5 of 5 method) scale everything ×¾** (matches Elie's
  Client X worked example: 16–19 tier → 12–14 sets/session).
- **Weak-point strategy alternates by block position:**
  - Odd blocks (1st/3rd/5th) — "top of range + day emphasis": weak major at
    the tier's TOP, middle at midpoint, strong at BOTTOM; the weak group's
    day also LEADS the week.
  - Even blocks (2nd/4th/6th) — "steal from the strong": weak major = tier
    max + 2, strong major = tier min − 2, middle at midpoint; standard
    Push/Pull/Legs day order.
  - Both strategies keep total weekly volume in the same envelope — they
    redistribute sets, never inflate them.
- **Tie-break when lift scores tie:** squat > deadlift > bench (legs weakest
  wins the tie) — confirmed by Elie 2026-07-13.

### Method catalog (`programRules.js` → `METHODS`)
| Method | Objective | Scheme | %1RM | Rest | Sets/ex |
|---|---|---|---|---|---|
| Progressive load | Hypertrophy | 4×10, load climbs set to set (top set 8–10 reps) | 55→60→70→80% | 90s | 4 |
| Descending pyramid | Hypertrophy | heavy first set, then lighter/higher reps (8/12/15/18) | 85→70→60→50% | 90s | 4 |
| 5 of 5 | Strength | 5×5 | 80–85% | 2–3 min | 5 |
| Do or die | Hypertrophy | 4×20+ to failure | 30% | 30–45s | 4 |
| Stato-dynamic | Hypertrophy | 4×12, mid-rep pauses | 25–30% | 60s | 4 |
| Endurance (fat-loss) | Fat loss | weeks 1&3 circuits (4 rounds × 7 exercises × 15–20 reps); weeks 2&4 straight 3×20–25 | 30–40% | see scheme | 4 circuit / 3 |

- Default 6-block sequence: Progressive load → Descending pyramid → 5 of 5 →
  Do or die → Stato-dynamic → Endurance. Every slot is a dropdown; the
  trainer can pick any method for any block.
- **Fat-loss block is opt-in**, auto-ticked when body-fat % ≥ 18 (men) / 25
  (women) — trainer can always tick/untick. When excluded, slot 6 falls back
  to **5 of 5** to preserve the hypertrophy/strength alternation.

### Exercise selection (spec §6)
- Day/muscle map: **Push** = Chest (major) + Shoulders, Triceps (minors) ·
  **Pull** = Back (major) + Rear Delts, Biceps, Forearms (minors) · **Legs**
  = Legs (major) + Calves, Abs (minors). Muscles outside this map
  (Rotator Cuffs, Psoas, Serratus…) aren't auto-programmed in v1.
- **Set counting credits the PRIMARY muscle only** — no shared credit across
  a multi-muscle exercise.
- **Anchors** (kg-bearing, every block): Flat Barbell Press → Push,
  Back Squat → Legs, Deadlift → Pull. kg = %1RM × the eval's 1RM, rounded to
  the nearest 2.5 kg plate. All other exercises show %1RM + reps only.
  - **Deviation worth knowing:** Deadlift's bank record has **Quads** as its
    primary muscle (bucket `Legs`), but as the Pull-day anchor its sets are
    credited to **Back** per the day/muscle map above (spec §6 puts Deadlift
    on Pull) — `programKernel.js`'s `fillBucket` explicitly overrides the
    anchor's bucket to the day's major rather than the bank's primary-muscle
    bucket. Without this override the Back major would run short by a full
    exercise's worth of sets in every block.
- **Variant rotation:** each block prefers exercises unused in earlier
  blocks (anchors exempt) — rotation offset advances by block index.
- **Beginner filter:** begA/begB prefer machine/dumbbell variants over
  high-skill barbell lifts when the bank offers an alternative (anchors
  exempt).
- **Determinism:** generation is a pure function of (client id, eval id,
  block index, method, bank version) — regenerating with identical inputs
  reproduces a byte-identical program. No `Date.now()`/`Math.random()`
  inside the kernel; the caller supplies id + timestamps.

### Deviation from the spec worth flagging
- **Blocks store `days` (+ `daysAlt` for the endurance block's circuit
  weeks), not four duplicated weeks.** The spec's plain-English description
  ("six 4-week blocks... weeks") reads as if each block stores 4 nearly-
  identical week objects; the implementation instead stores ONE materialized
  day-set per block (`block.days`), plus a second day-set (`block.daysAlt`)
  only for the endurance/fat-loss block, since that's the only method whose
  scheme actually differs week to week (circuit on weeks 1&3, straight sets
  on weeks 2&4). Every other method is identical week to week within a
  block, so storing 4 copies would be pure redundant weight in `data.json`
  with zero information gain — this is the single biggest lever behind the
  growth number staying inside budget (see below).

### Reducer + merge
- `ADD_PROGRAM` (append, stamp `_modified`, audit `program_generated`),
  `EDIT_PROGRAM` (**full-record contract** — same shape as
  `EDIT_EVALUATION`; a swap-exercise edit re-dispatches the entire record,
  never a partial patch), `DELETE_PROGRAM` (audit-logged
  `program_deleted`, confirm-guarded at UI layer).
- `DELETE_CLIENT` cascades to `programs` (same rule as `evaluations`).
- `programs[]` follows the `evaluations[]` pattern in every merge path —
  `mergeData`, `mergeBackup` (fills-missing-only, doesn't overwrite), and
  `REPLACE_ALL`. Never orphaned, never dropped.

### New sanity: `scripts/sanity/sanity-programs.mjs`
Volume math for all 5 classes (majors/minors/strength ¾ scale), weak-point
strategy alternation (odd/even blocks), tie-break order, fat-loss threshold
boundaries (17.9/18/25/25.1), slot-6 fallback when fat-loss is excluded,
exercise-count arithmetic per method, anchor presence in every block,
rotation/determinism (identical inputs ⇒ byte-identical program), beginner
filter, and reducer/merge coexistence for `programs[]`.

- Spec: `docs/superpowers/specs/2026-07-13-program-generation-design.md`.

---

## v2.13.1 – v2.13.3 — Elie's domain-review answers applied (2026-07-14)

Elie (the PT) answered the release-review questions directly in-session at
Pierre's terminal. Three point releases shipped same day:

### v2.13.1 — Deadlift pull-only + English day headers
- **Deadlift is ONLY ever the Pull-day 1RM anchor** (Elie: "deadlift only in
  back"). Its bank record's bucket is `Legs` (primary Quads), so it was also
  eligible as a legs-day accessory and a circuit station = programmed twice a
  week. `candidates()` in `programKernel.js` now excludes `ANCHORS.pull.name`
  from every pool. `PROGRAM_RULES_VERSION` 1 → 2 (stored programs keep their
  frozen version). Sanity: full sweep asserting Deadlift appears only as
  pull-day exercise #0 across all blocks/days/daysAlt, standard + beginner.
- **Day headers stay English (Push/Pull/Legs) in the Arabic app** — Lebanese
  gym convention, Elie's explicit pick over دفع/سحب/أرجل.
- Confirmed as-is (no change): Upright Row under Shoulders; "Do or die" stays
  'حتى الإجهاد'; % sign (not ٪); 'تدريب دائري'.

### v2.13.2 — Age-banded 1RM standards (CHARTS_VERSION 2 → 3)
- The v2.12 placeholder flat-band ratio tables are gone. 18–39 keeps the
  levels Elie approved; 40–49 / 50–59 / 60–69 / 70+ scale them by the decline
  factors from his age tables (band benchmark ÷ 18–39 benchmark, per lift per
  gender, rounded to 2 decimals) — method explicitly approved by Elie.
- Frozen evaluations keep their v2 scores; only new evaluations use the bands.
- As-implemented workbook regenerated:
  `docs/superpowers/artifacts/2026-07-06-1rm-battery/PT-1RM-Standards-As-Implemented.xlsx`.

### v2.13.3 — Trainer level override at generation (Elie "Option 1")
- **Problem (Elie):** deriving the volume tier from lift-score averages is
  wrong — strength ratios ≠ training experience; a naturally strong novice
  must not get Intermediate volume.
- **Fix:** the eval-derived classification is now only a pre-selected
  SUGGESTION. `ProgramSetup.jsx` shows a 5-chip Level row (`weekday-chip`
  reuse); the trainer taps to override before generating. The kernel takes an
  optional `classification` arg (omitted = eval's level, so all old call
  sites/fixtures stay valid) and stamps `classificationSource: 'auto'|'manual'`
  on the frozen record. Preview/save one-kernel invariant preserved — both
  paths pass the same state. New i18n keys `levelLabel`/`levelSuggested`.
- `PROGRAM_RULES_VERSION` stays 2 — tier tables untouched, only which tier
  applies became selectable.

### Still open after this session
- Rear-delt reclassification (4 exercises → Pull day): Elie's confirmation
  still ambiguous — re-ask before regenerating the bank.
- "Rehab button" idea (Elie): prehab exercises stay out of auto-programs for
  now; possible future feature, parked.
