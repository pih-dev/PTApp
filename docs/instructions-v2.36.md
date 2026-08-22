# SpotSet v2.36 — dumbbells join the 3D vocabulary

**Date:** 2026-08-23 · Figures session (CCHealth/Fable). OPEN item 2 from `HANDOFF-figures.md`:
the spin vocabulary stopped at barbell + bench.

**What shipped:** `spinEquip` draws a dumbbell as one bell-bar per HAND — the approved barbell
model at quarter scale (axis along the body's z through that hand's true 3D grip, sphere bells,
constant radius through the turn, near bell eclipsing end-on). `SPIN_GEAR` adds `dumbbell`, so
**8 more movements turn**: Seated Dumbbell Curl, Hammer Curl (curl); Dumbbell Deadlift, Dumbbell
Romanian Deadlift, Dumbbell Suitcase Deadlift (hinge); Arnold Dumbbell Press, Flat Dumbbell Press,
Single Arm Dumbbell Chest Press (bench-press — these three upgrade from the two-camera tween to
the true spin). Library 360° stamp count, measured both sides of the change: **24 → 29**.

**Judged before shipping** on the compact grid (`tmp/db-check.mjs`): curl / press / RDL at yaw
0–180 and pitch ±40, both halves. First cut used a 62-unit half-axis and the two dumbbells strung
into a bead-chain at oblique yaw — compacted to ±40 to match the 2D closure's proportions.

**Correction to v2.35.1's notes:** its changelog line said the bench spin fix raised the stamp
count "24 → 30" — wrong: the bench family was already stamped as turning via the tween, so that
fix changed HOW they turn, not the count. The count stayed 24 until this release.

**Still out of the vocabulary, deliberately:** cable, machine, landmine (gear anchored to WORLD
objects — a stack, a frame, a floor pivot — its own modelling round), kettlebell (could ride the
dumbbell model later; excluded until judged).
