# Multi-Day Split — Trainer-Selectable Days per Week (Program Generation)

**Date:** 2026-07-14 · **Requested by:** Elie (in-session, same day as the v2.13.1–.3 fix run)
**Design approved by:** Elie (parts 1+2, in-session) · **Spec review:** pending Pierre
**Approach:** A — extend the existing generator (free week composer rejected as overkill)

## Problem

`generateProgram` hardcodes a 3-day Push/Pull/Legs week. Elie: 3 days/week is wrong for
Intermediate-and-above clients. The trainer must choose the number of training days, choose
which days duplicate, and the weekly set totals must be implemented across those days.

## Decisions (all Elie's answers, 2026-07-14)

| # | Decision |
|---|---|
| D1 | Day range **3–6**; each of push/pull/legs appears at most **twice** a week. |
| D2 | A duplicated day trains the **same muscle groups with different exercise variants** — an exercise never appears twice in the same week (per block). |
| D3 | The known-kg anchor lift (Flat Barbell Press / Deadlift / Back Squat) appears on the **rep-1 day only**. Rep-2 day is variants with % text only. (Clarified for Elie: the anchor is "the exercise we can print kg for" — always at the method's %, never a 1RM attempt.) |
| D4 | **Majors split** the unchanged weekly tier quota across the slot's two days; **odd remainder goes to the rep-1 (anchor) day** (14→7+7, 15→8+7). |
| D5 | **Minors do NOT split** — full `minorQuota(weeklyMajorSets)` on **each** day of the slot (their weekly volume grows with the extra day; Elie's explicit pick over splitting). |
| D6 | Which slots duplicate is **pre-suggested from the eval weak-point ranking** (weakest first, then mid; 6 days = all three); trainer overrides by tapping. |
| D7 | Day order: **base round first, then repeats** — e.g. 5 days (pull+legs dup): push · pull · legs · pull(2) · legs(2). Max rest before a muscle repeats. No trainer reordering. |
| D8 | Fat-loss/endurance block: **circuit weeks (1&3) follow the day count** — N circuit days; weeks 2&4 use the N-day split. |
| D9 | **Day count itself is pre-suggested from classification**: begA/begB → 3, intA → 4, intB → 5, pro → 5. 6 is never suggested (manual only). Trainer overrides. |
| D10 | 3-day programs must generate the **same training content as today** — identical days/exercises/sets/kg; only the new metadata fields (`daysPerWeek: 3`, `duplicatedSlots: []`, `rep: 1`, `rulesVersion: 3`) may differ (regression invariant). |

## UI — ProgramSetup.jsx

Two new rows directly under the Level chips (same `weekday-chip` visual/tap pattern):

1. **Days per week** — chips `3 · 4 · 5 · 6`. Pre-selected per D9 from the *currently selected*
   Level chip. Follows Level changes until the trainer touches the days row, then his pick
   sticks (the `fatTouched` pattern — a `daysTouched` flag).
2. **Extra days** — visible only when days > 3. Chips `Push · Pull · Legs`, multi-select,
   exactly `days − 3` required. Pre-selected per D6 from `ranks` (weak → mid → strong).
   Pre-selection re-derives on day-count change until the trainer touches the row.
   **Generate is disabled** (visually + guarded in `save()`) while picks ≠ `days − 3`.

i18n: new keys `daysPerWeekLabel`, `extraDaysLabel`, `repDayTag` (viewer "2" suffix — see
Viewer). Slot chip labels reuse `slotPush/slotPull/slotLegs` (English in both languages,
Elie's E3 decision).

## Kernel — programKernel.js (still THE one function; preview = save by construction)

New args: `daysPerWeek` (default 3) and `duplicatedSlots` (default `[]`). Validation: kernel
throws on `duplicatedSlots.length !== daysPerWeek - 3` or duplicate entries (UI prevents it;
the throw guards non-UI callers).

Per block:
- **Day list:** `dayOrder(strategy, ranks)` gives the base round; duplicated slots are appended
  in the same relative order with `rep: 2` (D7).
- **Majors:** weekly quota `q` from `majorQuotas(...)` unchanged. Non-duplicated slot: `q` on
  its one day. Duplicated slot: `ceil(q/2)` on rep-1, `floor(q/2)` on rep-2 (D4).
- **Anchor:** placed on rep-1 only (existing `fillBucket` anchor path, unchanged bucket
  override to the day's major). Rep-2 calls `fillBucket` with `anchor: null` (D3).
- **Variant exclusion (D2):** rep-2's candidate pool excludes every exercise name already
  placed on rep-1 of the same slot in the same block (all buckets — majors AND minors).
  Implementation: build rep-1 day first, pass its name-set as a new `exclude` param through
  `buildDay` → `fillBucket` → `candidates`. Deadlift stays excluded from all pools
  (rules-v2 invariant).
- **Minors:** each day of the slot gets the full `minorQuota(weeklyMajorSets)` (D5), rep-2
  drawing from the exclusion-filtered pool so variants differ.
- **Pool-exhaustion rule:** if a bucket's pool runs out under exclusion (small minor buckets),
  the exclusion is dropped for that bucket only and rep-1's picks may repeat — volume is
  guaranteed, variety is best-effort. (Rear Delts has exactly 4 exercises; two days need up
  to 2 each — fits, but begB-filtered pools may not.)
- **Endurance block (D8):** `daysAlt` gets `daysPerWeek` circuit days (`buildCircuitDay`
  already takes a day index); `days` gets the N-day split like every other block.

## Record shape (frozen, additive — schema stays v6, NO migration)

- Top level: `daysPerWeek`, `duplicatedSlots` (stored as chosen, even when 3/[]).
- Each day entry: `rep: 1 | 2`.
- Old records lack all three fields → readers treat as 3-day/rep-1. Never rewritten.
- `PROGRAM_RULES_VERSION` 2 → 3.

## Viewer — ProgramViewer.jsx

- Day header: rep-2 days render the slot label + "2" (`Push 2`); rep-1 unchanged.
- Old records (no `rep`) render exactly as today.
- Swap-exercise: unchanged (`EDIT_PROGRAM` full-record contract). The swap picker's
  alternatives list must apply the same-week exclusion? **No** — keep the picker as-is
  (bucket-mates minus already-shown), consistent with current behavior; the trainer owns
  manual swaps.

## Out of scope (deliberate)

Per-block day counts · trainer day reordering · a slot ×3 · non-PPL splits (Upper/Lower etc.)
· suggestion-source stamping for days (unlike `classificationSource`, the chosen values are
stored verbatim, which is enough for audit).

## Testing (sanity-programs.mjs, new multi-day section)

1. D10 regression: `daysPerWeek: 3` (and omitted) output deep-equals today's output after
   stripping the new metadata fields (`daysPerWeek`, `duplicatedSlots`, `rep`, version stamp).
2. Split arithmetic: even (14→7/7) and odd (15→8/7) on a duplicated major; non-duplicated
   slots keep full quota.
3. Anchor sweep: anchors appear exactly once per block, always on rep-1, Deadlift pull-only.
4. Minors: full quota present on BOTH days of a duplicated slot.
5. D2: zero exercise-name overlap between rep-1 and rep-2 of the same slot/block (standard
   fixture); pool-exhaustion fallback still fills the quota.
6. D7 order: base round then repeats, strategy order preserved.
7. D8: endurance `daysAlt.length === daysPerWeek`.
8. D9/D6 suggestion helpers (pure functions in programRules.js): all five classes → expected
   day count; ranks → expected duplicate pre-picks.
9. Kernel throws on inconsistent `duplicatedSlots` length.
10. Reducer/merge coexistence: a 5-day record merges beside 3-day records (evaluations[]
    pattern untouched).

## Release notes plan

Version v2.14.0 (feature release — program pruning moves to v2.15). Bump
`DOCS.instructions` if a new instructions file is cut. Phone-pass: chip rows in AR/RTL,
disabled-Generate affordance, viewer "Push 2" headers both languages.
