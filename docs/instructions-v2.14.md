# PTApp v2.14 — Multi-Day Split (Trainer-Selectable Training Days)

## What changed for the PT

- **Program generation is no longer locked to 3 days a week.** The setup
  sheet now lets the trainer pick **3, 4, 5, or 6 training days** for the
  whole 6-month plan. A pick is suggested from the client's Level (Beginner
  A/B → 3 · Intermediate A → 4 · Intermediate B → 5 · Pro → 5), and the
  trainer can tap any other chip to override — 6 is never suggested
  automatically, it's manual-only.
- **When more than 3 days are picked, the extra days duplicate a Push/Pull/
  Legs day** rather than inventing a new split. The setup sheet shows a
  second chip row (Push · Pull · Legs) pre-ticked from the client's weakest
  lift (weak point gets the first extra day, then the middle one, strongest
  last) — the trainer can re-tick any combination. **Generate stays disabled**
  until exactly the right number of slots are picked (a red picked/required
  counter shows why).
- **A duplicated day is not a copy** — it trains the same muscle groups with
  **different exercises** than the first day of that slot, so the client
  never repeats the identical workout twice in the same week. The known-kg
  main lift (bench/squat/deadlift) only ever appears on the first of the two
  days; the second day is %1RM/reps only, same as every accessory exercise.
- **Weekly set totals for the major muscle are unchanged by adding a day** —
  they're just spread across the two days of that slot (an odd total gives
  the first day one extra set). Everything else in the program (minor
  muscles, weak-point emphasis, fat-loss block) keeps working exactly as
  before, just repeated across however many days the trainer picked.
- **Viewer**: a duplicated day's header shows the slot name with a small "2"
  (e.g. "Push 2") so it's obvious at a glance which day is the repeat.
- **Nothing about existing programs changes.** Every program generated
  before this release stays exactly as it was — it simply doesn't carry the
  new day-count fields, and the viewer treats a missing field as "3-day,
  first (only) instance of each day," which is exactly what those programs
  already are.

## Setup-sheet walkthrough

1. **Level** — pick the client's class (suggested from their eval, tap
   another chip to override). Unchanged from v2.13.3.
2. **Days** — pick 3–6 training days a week. Pre-selected from the Level
   chip; follows Level changes until the trainer taps a day chip himself,
   then his pick sticks.
3. **Extra days** (only shown above 3 days) — pick which of Push/Pull/Legs
   repeats. Pre-ticked from the weak-point ranking (weakest muscle's day
   duplicates first). The counter must read "picked = required" (days − 3)
   before **Generate** enables.
4. **Generate** — same as before: body-fat %, six block methods, start date,
   one tap.

## Volume rules — majors split, minors full, anchor once

| Rule | Behavior |
|---|---|
| **Majors split** | The slot's unchanged weekly quota is divided across its two days. Even totals split evenly (14 → 7+7); an odd remainder goes to the first (anchor) day (15 → 8+7). |
| **Minors full on both days** | Minor muscles do NOT split — each day of a duplicated slot gets the FULL minor quota (`minorQuota(weeklyMajorSets)`), so their total weekly volume grows with the extra day. This was the trainer's explicit pick over splitting minors too. |
| **Anchor appears once** | The kg-bearing main lift (Flat Barbell Press / Back Squat / Deadlift) is placed only on the slot's first day, always at the method's %1RM — never a fresh 1RM attempt. The second day fills its major/minor buckets with different exercises, no anchor. |
| **Different exercises on day two** | The second day's exercise pool excludes every name already used on the first day of that slot (majors and minors both), so the two days are never identical. If a small bucket runs out of alternatives under that exclusion, the exclusion is dropped for that bucket only so the set quota still gets filled (variety is best-effort, volume is guaranteed). |
| **Day order** | The base Push/Pull/Legs round always comes first, then the repeated days in the same relative order (e.g. 5 days with Pull+Legs duplicated: Push · Pull · Legs · Pull 2 · Legs 2) — maximizes rest before a muscle group repeats. The trainer cannot reorder days. |
| **Fat-loss/endurance block** | The circuit weeks (1 & 3 of that block) now run one circuit day per training day picked, instead of always 3; the straight-set weeks (2 & 4) use the same N-day split as every other block. |

## Suggestion defaults (day count)

| Level | Suggested days |
|---|---|
| Beginner A | 3 |
| Beginner B | 3 |
| Intermediate A | 4 |
| Intermediate B | 5 |
| Pro | 5 |

6 days is never auto-suggested — the trainer must pick it manually.

## Backward compatibility

- **No schema change, no migration.** Programs generated before this release
  simply don't have the new fields (`daysPerWeek`, `duplicatedSlots`, each
  day's `rep`). The viewer and every reader treat a record without these
  fields as 3-day, single-instance-of-each-day — exactly what those records
  already contain, so old programs render byte-identical to before.
- **3-day generation today is unchanged.** Picking 3 days (the default)
  produces the same training content — same days, same exercises, same
  sets, same kg — as v2.13; only the new bookkeeping fields
  (`daysPerWeek: 3`, `duplicatedSlots: []`, `rep: 1`, `rulesVersion: 3`) are
  new, and none of them affect what the client sees on the page.

## Spec

Full design decisions (D1–D10) and rationale:
`docs/superpowers/specs/2026-07-14-multi-day-split-design.md`.
