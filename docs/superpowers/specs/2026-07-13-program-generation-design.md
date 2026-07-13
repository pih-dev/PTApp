# Program Generation from 1RM Evaluation — Design Spec

**Date:** 2026-07-13
**Status:** Approved by Elie (PT / end user, domain rules) — awaiting Pierre's review (developer, implementation gate)
**Feature:** PT ask #3 — "auto program proposal" (roadmap). Requirements gathered live with Elie in-session.
**Source documents:**
- Exercise bank: `Downloads/Telegram Desktop/EXERCISES full list.xlsx` (345 rows: name + muscle list) — a copy must be archived to `_archive/PTApp/program-source/` before implementation.
- Block template: `Desktop/IFBB/Client X(6monthsblocks).docx` (6-month block example + Nuzzo 1RM↔reps correlation table image).

## 1. What it does

For a client with a completed 1RM evaluation, the trainer taps **Generate program** and gets a
frozen, stored, 6-month training plan: six 4-week blocks, 3-day Push/Pull/Legs weeks, exercises
picked from the exercise bank with sets × reps, %1RM, real kg on the anchor lifts, and rest times.
Volume is set by the evaluation class; weak points (from per-lift scores) get extra emphasis.
The trainer controls: block methods (dropdown per slot), fat-loss block inclusion, body-fat %,
start date, and per-exercise swaps after generation. Sets/reps are NOT editable in-app —
the trainer improvises by client performance on the day (Elie's explicit call).

## 2. Inputs

| Input | Source |
|---|---|
| Class (begA/begB/intA/intB/pro) + per-lift scores (1–5) | latest 1RM evaluation record (frozen) |
| 1RM kg for bench / squat / deadlift | the eval's raw values (`raw.benchKg` etc.) |
| Gender | client profile (fat-loss threshold) |
| Body-fat % | typed by trainer on the setup sheet |
| Block methods, fat-loss include, start date | trainer on the setup sheet (defaults below) |

Generation REQUIRES all three lifts scored (weak-point ordering + kg anchors need them).
Mass-branch evals don't qualify; the UI explains a 1RM evaluation is needed.

## 3. Volume model (per week, from class)

Tiers (sets per muscle per week): begA 9–11 · begB 11–13 · intA 14–17 · intB 18–21 · pro 21–24.

- **Major muscles** — Chest, Back, Legs — get the full tier.
- **Minor muscles** — every other scheduled muscle — each gets HALF the tier (rounded to whole sets).
- **Strength blocks (5 of 5)**: all quotas × ¾ (matches Client X 16–19 → 12–14 sets/session).
- Frequency: 3 sessions/week, each muscle trained once (classic 3-day PPL).

### Weak-point emphasis — alternates by block position

Lift→group mapping: bench→Push(Chest) · squat→Legs · deadlift→Pull(Back).
Rank the three lift scores: weakest / middle / strongest (ties broken squat > deadlift > bench,
i.e. legs first — CONFIRMED by Elie 2026-07-13).

- **Odd blocks (1st, 3rd, 5th) — "top of range + day emphasis":** weak major trains at the
  tier's TOP, middle at midpoint, strong at BOTTOM. The weak group's day LEADS the week and
  that day's minors get the top of their half-tier.
- **Even blocks (2nd, 4th, 6th) — "steal from the strong":** weak major = tier max + 2,
  strong major = tier min − 2, middle at midpoint. Week keeps standard Push/Pull/Legs order.

Both strategies keep total weekly volume in the same envelope; they redistribute, never inflate.

**Worked example** — intA (14–17), squat weakest / bench strongest, Progressive-load block:
odd block ⇒ Legs day leads the week with Legs 17 sets (top), Calves 8 + Abs 8 (top of
half-tier); Pull day: Back 15 (mid), minors ~7 each; Push day last: Chest 14 (bottom),
Shoulders 7, Triceps 7. Even block ⇒ standard day order, Legs 19 (max+2), Chest 12 (min−2),
Back 15. At 4 sets/exercise: Legs 17 ≈ 4 exercises (16) — count rounds to land inside the
range nearest the target.

## 4. Method catalog (all Elie-approved)

Each block runs ONE method. `setsPerExercise` drives exercise-count arithmetic (§6).

| Method | Objective | Scheme (within-session) | %1RM | Rest | Sets/ex |
|---|---|---|---|---|---|
| Progressive load | Hypertrophy | 4 sets × 10 reps, load CLIMBS set to set; top set 8–10 reps; if client can't hold reps, trainer adjusts load | 55 → 60 → 70 → 80% | 90s | 4 |
| Descending pyramid | Hypertrophy | first set HEAVY to instigate fatigue, then lighter/higher reps: 8 / 12 / 15 / 18 | 80–85 / 70 / 60 / 50% | 90s | 4 |
| 5 of 5 | Strength | 5 × 5 | 80–85% | 2–3 min | 5 |
| Do or die | Hypertrophy | 4 × 20+ (to failure) | 30% | 30–45s | 4 |
| Stato-dynamic | Hypertrophy | 4 × 12 with mid-rep pauses (stato-dynamic contraction) | 25–30% | 60s | 4 |
| Endurance (fat-loss) | Fat loss | weeks 1 & 3: circuits — 3–4 rounds × 6–8 exercises × 15–20 reps, 30–45s between exercises, 2 min between rounds. Weeks 2 & 4: straight sets 3 × 20–25, 45s rest | 30–40% | see scheme | 4 (circuit slots) / 3 |

## 5. Plan structure

- 6 months = **six 4-week blocks**, objectives alternating hypertrophy/strength.
- **Default sequence** (Client X): 1 Progressive load · 2 Descending pyramid · 3 5-of-5 ·
  4 Do or die · 5 Stato-dynamic · 6 Endurance (fat-loss).
- **Fat-loss block is opt-in**, linked to body-fat %: auto-ticked when BF ≥ **18% (men)** /
  **25% (women)**; trainer can always tick/untick. When excluded, slot 6 defaults to
  **5 of 5 (strength)** — keeps the hypertrophy/strength alternation; trainer can change it.
- Every block slot is a dropdown over the method catalog.

## 6. Exercise selection

**Bank preparation (one-time, at implementation):** clean the xlsx (typos: "Hmastrings",
broken quotes, duplicate rows), normalize muscle names to a canonical taxonomy, tag each
exercise `compound | isolation` (curated by hand, reviewed by Elie via an as-implemented
export — same protocol as the norm-charts xlsx), map muscles to day slots:

| Day | Major | Minors |
|---|---|---|
| Push | Chest | Shoulders, Triceps |
| Pull | Back (Lats/Middle-Upper Back/Traps/Spinal Erectors) | Rear delts, Biceps, Forearms |
| Legs | Legs (Quads/Hamstrings/Glutes/Adductors/Abductors) | Calves, Abs (incl. Obliques/core) |

Muscles outside this map (Rotator Cuffs, Psoas, Serratus…) are prehab/accessory — not
auto-programmed in v1.

**Set counting: primary muscle only** (first muscle in the bank's list). No shared credit.

**Anchors, every block:** Flat Barbell (Bench) Press → Push · Back Squat → Legs ·
Deadlift → Pull. Anchors are the only exercises showing **kg** = %1RM × eval 1RM, rounded
to 2.5 kg. All other exercises show %1RM + reps; the trainer sets load (Nuzzo correlation
table available in-app as reference).

**Filling a day:** per muscle, exercise count = quota ÷ setsPerExercise, chosen so the total
lands on the muscle's target (top/mid/bottom of range per §3). Order: compounds first,
isolation after. **Variant rotation:** each block prefers exercises unused in earlier blocks
(anchors exempt). **Beginner filter:** begA/begB prefer machine/dumbbell variants over
high-skill barbell lifts when the bank offers an alternative (anchors exempt).
**Determinism:** selection is a pure function of (client id, eval id, block index, method,
bank version) — regenerating with identical inputs reproduces the identical program.

## 7. UI

- **Entry:** client card → latest 1RM eval → **Generate program** (disabled with explanation
  if no complete 1RM eval).
- **Setup sheet** (bottom-sheet modal): derived class + tier, three lift scores with weak point
  highlighted, BF% field (threshold pre-tick), six method dropdowns pre-filled, start date
  (default next Monday), Generate button.
- **Viewer:** 6 block cards (dates/objective/method) → week (PPL days) → day (ordered
  exercises: sets × reps, %1RM, kg on anchors, rest). **Swap** per exercise → same-muscle,
  same-type (compound/isolation) alternatives.
- **Regenerate** anytime; prior programs stay in history (data preservation rule). Viewer
  shows the latest.
- **No in-app sets/reps editing** — deliberate (Elie): trainer improvises by performance.
- **i18n:** UI chrome + method names EN/AR; exercise names English-only (gym convention).
- V1 has no WhatsApp/print export; candidate follow-up.

## 8. Data & sync (Pierre's domain — implementation contract)

- Schema **v5 → v6, purely additive**: `state.programs[]`. Migration seeds `programs: []`;
  nothing else changes. Update the live-diff gate for v6 (current `sanity-live-v5-diff.mjs`
  is v4→v5; `sanity-live-migration.mjs` remains STALE/retired — do not use).
- Program record: `{ id, clientId, evalId, createdAt, startDate, fatPct, rulesVersion,
  bankVersion, blocks: [ ...fully materialized weeks/days/exercises ], _modified }`.
  **Frozen at generation** — later rule/bank changes never rewrite stored programs (same
  philosophy as frozen eval scores). `PROGRAM_RULES_VERSION` + `EXERCISE_BANK_VERSION`
  constants, bumped on any change.
- New module (own file, e.g. `src/programKernel.js` + `src/exerciseBank.js`): the ONE
  generation kernel; UI preview and save path call the same function (computeEvalFrozen /
  compute1RMFrozen precedent — never two implementations).
- Reducer: `ADD_PROGRAM` (append, stamp `_modified`, audit `program_generated`),
  `EDIT_PROGRAM` (FULL-RECORD contract like EDIT_EVALUATION — swap-exercise re-dispatches the
  whole record), `DELETE_PROGRAM` (audit-logged, confirm-guarded). `DELETE_CLIENT` cascades to
  programs. `programs[]` follows the `evaluations[]` pattern in `mergeData`, `mergeBackup`,
  `REPLACE_ALL` — never orphaned, never dropped.
- Size note: a materialized 6-month program is a few hundred rows of small objects; with
  chunked base64 (v2.10.1) this is safe, but measure data.json growth during implementation.

## 9. Guardrails & testing

- Generate requires: 1RM eval with all three lifts scored + gender + age. Missing → disabled
  button with reason.
- New sanity script `scripts/sanity/sanity-programs.mjs`:
  volume math for all 5 classes (majors/minors/strength-¾), weak-point strategy alternation
  (odd/even blocks), tie-breaking, fat-loss thresholds (17.9/18/25/25.1 boundaries), slot-6
  fallback when fat-loss excluded, exercise-count arithmetic per method, anchor presence in
  every block, rotation/determinism (same inputs ⇒ byte-identical program), beginner filter,
  reducer + merge coexistence for `programs[]`.
- Bank cleaning gets its own check: no duplicate names, all muscles in taxonomy, every
  scheduled muscle has ≥ enough exercises for the largest class quota.

## 10. Open items for Pierre's review

1. ~~Weak-point tie-break order~~ — squat > deadlift > bench confirmed by Elie 2026-07-13.
2. `EDIT_PROGRAM` full-record vs a narrower `SWAP_EXERCISE` action — spec prefers full-record
   for consistency with EDIT_EVALUATION; Pierre may prefer the narrower audit trail.
3. Where old programs' history surfaces in UI (v1: nowhere, just retained in data).
4. data.json growth budget check during implementation (§8).
