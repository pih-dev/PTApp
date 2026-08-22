# SpotSet v2.22.1 — the lines, the muscle code, and the bench press gets a third camera

**Date:** 2026-08-22 · **Asked for by Pierre**, on seeing the pilot six · **Thread:** `HANDOFF-figures.md`

---

## Three things changed on every figure

### 1. The posture line is back

*"When it was a line draw, you threw a line for the posture, the wrong posture, to highlight what
would there be wrong. You also threw a line of the correct posture."*

Every figure now carries a stroked line over the silhouette showing the one chain of joints that
decides whether the rep is safe. **Blue (the accent) when the shape is held, amber (warn) when it is
lost.** The line is not always the spine — that was only the first example:

| Movement | The line |
|---|---|
| Back Squat · Leg Press | hip → knee → ankle (the knee is what caves; the back is fine) |
| Deadlift · Barbell Curl · Flat Barbell Press | pelvis → lumbar → thorax → neck (the spine) |
| Chest Press Machine · Pull-Up | shoulder → elbow → wrist |

It is built from the **same joints as the body**, so it can never disagree with the figure it is
drawn on, and which colour it takes is derived from whether the pose marks a fault — so the two can
never be set inconsistently.

### 2. The muscles are colour-coded

Two new colours answering two different questions: **crimson = the prime movers** (what this
movement is *for*) and **violet = the supporting muscles** (what else is working). Both are
figure-internal, like the orange fault marker, and both are defined per skin so they hold on
midnight and steel alike.

A muscle is drawn as a **band along the bone** it runs on, clipped to the silhouette — the first
version used circles and the figures came back covered in spots. In a front view a limb muscle is
painted on **both** sides; one crimson thigh on a squat reads as a bug, not as anatomy.

### 3. There is now a key

Four colours carry meaning inside a figure, and an unlabelled chart is a guessing game. The panel
carries a five-chip legend: form held · form lost · prime movers · supporting · takes the stress.

---

## The bench press: three figures, not two

**Pierre approved the fix:** *"instead of two pictures, you want to insert three pictures? If that's
all, yeah, sure."*

The flat barbell bench press has **two faults worth teaching and they live in different planes**, so
two figures genuinely could not carry it:

1. **The profile pair** shows what profile can show — the arch pushed past control, the hips coming
   off the bench, the lower back holding the position instead of the upper back.
2. **The third figure is a second camera, from above**, carrying what profile physically cannot: the
   elbows flared square to the body. Abduction happens in the plane a side-on camera looks down; no
   amount of redrawing makes it visible from the side.

The third figure has **its own fault marker and its own sentence**. It is not a decorative extra
angle, and `sanity-figures.mjs` now fails the build on an `extra` figure that marks nothing.

🔴 **What was deliberately not done:** faking the flare in profile by foreshortening the upper arm
differently in the two figures. That is a bone-length change wearing perspective as a disguise, it
breaks the rule that makes the pair mean anything, and the build gate rejects it. A second camera is
honest; a fudged bone is not.

**The pilot is now seven movements**, and the horizontal-press bucket has both a barbell entry and a
machine entry.

---

## Two silent failures worth knowing about

- **No `<g>` inside a `clipPath`.** Only shapes, text and `<use>` are legal children. A group is
  silently ignored, the clip resolves to **empty**, and every clipped layer vanishes — which looks
  exactly like "that feature isn't built yet".
- **In a quarter-turned front view the mirror is (180 − a), not (−a).** Mirroring reflects across the
  body's long axis; lying down that axis is horizontal, and negating maps 180° to 180° — so both arms
  ended up on the same side of the body and the bar floated above the figure instead of across it.

Both are written up in `docs/traps.md`.
