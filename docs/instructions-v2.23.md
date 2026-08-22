# SpotSet v2.23 — every movement in the bank has a figure

**Date:** 2026-08-22 · **Thread:** `HANDOFF-figures.md` (B2) · **Scope:** all **340** movements,
not seven. Pierre, on seeing the pilot: *"Very promising. Go ahead. Continue to do for all of them."*

---

## What you will see

Open **any** movement — tap a name in a program, or find it in General → Movement library — and it
opens with a FORM panel: the pair, the posture line, the colour-coded muscles, the key, and three
sentences in English or Arabic. There are no longer any movements without one.

---

## How 340 figures got drawn without drawing 340 figures

**Nobody hand-draws 340 movements and keeps them looking like one library — and nobody should,
because a Front Squat, a Box Squat, a Smith Machine Squat and a Sumo Squat are one drawing with a
different bar in it.**

So a movement is now composed from three sources, each owning what it actually knows:

| | Comes from | Why there |
|---|---|---|
| **The pose and the fault** | one of **44 patterns** (`src/figures/archetypes.js`) | The pattern is what the fault belongs to. A rounded back is a rounded back on all sixteen deadlift variants. |
| **The muscles** | the exercise bank, per movement | So a Close Grip Bench and a Dumbbell Fly wash differently even where the pose is shared. |
| **The equipment** | the movement's **name** | The one place that reliably says barbell, dumbbell, kettlebell, cable, band, TRX, machine, sled, landmine or nothing. |

`src/figures/classify.js` maps every bank movement onto a pattern with an ordered rule list plus an
explicit override table. **100% coverage is a build gate** — an unclassified movement would show no
figure, silently, and a library with holes reads as broken rather than as progress.

**The whole thing cost 37 KB** (652 → 690 KB). 340 pairs of raster images would have been tens of
megabytes; this is the argument for the parametric route, and it got stronger the further it scaled.

## The 44 patterns

Lower: squat · machine squat · lunge · hinge · hip bridge · knee extension · knee flexion · calf
raise · hip abduction · hip adduction · back extension · hip extension · leg press
Push: bench press · machine chest press · push-up · dip · fly · overhead press · triceps pushdown ·
overhead triceps · shrug · external rotation · front raise · lateral raise
Pull: vertical pull · row · upright row · pullover · curl · wrist curl · carry
Core: plank · side plank · reverse plank · crunch · leg raise · knee tuck · rollout · anti-rotation ·
rotation · side bend · bird dog · sled

**Most faults are lumbar, and that is not laziness.** In a real gym the lower back is where load ends
up when a pattern breaks down — a sagging plank, a heaved curl, a leaned-back press and a rounded row
are the same failure wearing different equipment. The figures say so because it is true.

## The text scaled the same way, and that is what makes it reviewable

The coaching text is now keyed by **pattern**, not by movement. Writing "the back rounds" out sixteen
times would be sixteen places to correct it and sixteen chances to disagree with itself.

**It also fixes the review economics that make this shippable at all: Elie reads 44 patterns, not
340 entries.** Every entry still ships flagged **Not reviewed**, and the panel prints that under the
cue until he has been through them.

The v2.22.2 claims rule is unchanged and still a build gate: **say what the position does, never what
it causes.** No named pathology, no evidence-grade adverb, and the Arabic may never be stronger than
the English.

## Known rough edges

Judged on the contact sheet (`node scripts/figures-contact.mjs`), these patterns read least well and
are the first place to spend time: **leg raise** (the legs read flatter than they are), **wrist
curl** (the plate is drawn at barbell scale), and **rotation** (a twist is hard to show without a
second camera). Everything else reads correctly at full size and at list size.

**Still open, and it is Pierre's and Elie's call:** whether the Leg Press should draw *going too
deep* instead of snapping into lockout — see `HANDOFF-figures.md`.
