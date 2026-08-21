# The exercise figures — reading Pierre's references

**Date:** 2026-08-22 · **Source:** six reference sheets Pierre sent in-session, with the note that
*"each one of them I like something about it"* · **Feeds:** the figures spec (spec §10 item 2), which
is still to be written · **Related:** `docs/design/2026-08-21-design-differentiation-brief.md`
§7.9/§7.12/§7.13 (curves not hinges, the correct/wrong pair, the 7.5-head canon).

🔴 **This file is a READ of the references, not the spec.** It records what to take from each and
what not to, so the spec can be written against evidence instead of memory. The images themselves
are not in the repo (stock sheets); the observations are what survives.

---

## What he actually asked for, in his words

- Silhouettes that **keep the spirit of these drawings**.
- **You can see what is wrong and what is right** — the form is legible, not just the pose.
- **You can identify the equipment** — the bar, the dumbbells, the machine.
- Some in **colour**, some **outline**; both were shown deliberately.
- 🔴 **"These all look coherent in terms of ratio"** — the set reads as one family.
- 🔴 **"Most portray the form better even when they are smaller"** — legibility at small size is the
  test, and it is the test we would otherwise fail last, after everything else looked good.

## Sheet by sheet — what each one contributes

| Sheet | What it does well | What to take |
|---|---|---|
| **1 — black gym-equipment set** (dumbbells, treadmill, spin bike, rower, rack, cable crossover, machine) | The **equipment is the subject** and is unmistakable at a glance: you read "rack" and "rower" before you read the body. Heavy solid black, dramatic angles. | The equipment vocabulary — how much machine to draw so the movement is identifiable. Bar/plate/frame proportion. |
| **2 — grey set, mixed strength** (barbell squat, boxing, pull-up, lunge, sit-up, deadlift, push-up, battle ropes, box jump, air bike) | **One weight, one grey, one ratio across twelve figures.** Body reads clearly at thumbnail size; equipment is present but subordinate. | The **coherence model** for our set: same fill, same weight, same head-to-body ratio, no outlines. This is closest to what a 340-movement library needs. |
| **3 — grey female set on a grid** (overhead press, jump rope, hang, front/back squat, kettlebell, medicine ball) | Same discipline as sheet 2, **female figures**, and a visible **grid** — each figure occupies the same cell and is drawn to the same eye height. | The **grid/canon**: a fixed cell, a fixed baseline, and the movement scaled inside it. Also: the library must not be all-male. |
| **4 — light-grey dumbbell set** (running, curls, lunges, presses) | Repetition of ONE piece of equipment across ten poses without the set becoming monotonous. Lighter grey — reads softer, more approachable. | Proof the **same equipment can carry a whole family**; a tonal option lighter than sheet 2. |
| **5 — multicolour gradient gymnasts** | **Colour as a wash across the whole body**, not as clothing or props. Cool→warm gradient. Energetic, and it does not fight the silhouette. | The **colour treatment** if we go colour: one gradient across the figure, never local colour. Note it costs contrast — it must be tested on both skins. |
| **6 — flat blue pictogram athletes** | Extreme simplification, a **detached round head**, one flat colour. Reads at 16px. | The **icon end** of the range: what a movement mark looks like when it has to be tiny (a tab bar, a list glyph). NOT what a form-teaching figure looks like — this one cannot show a fault. |

## The tension in the set, named

Sheets 2/3/4 (solid, coherent, silhouette) and sheet 6 (pictogram) sit at opposite ends of the same
axis: **how much detail survives shrinking**. Sheet 6 wins at 16px and can never teach form; sheets
2/3 teach form and would blur at 16px. Sheet 5 is a treatment, not a level of detail.

**The resolution is that we need two things, not one, and they are drawn from the same skeleton:**

1. **The figure** — the form-teaching drawing. Solid fill, one tone, equipment legible, the joint
   that takes the fault marked. Used in the movement library, the program viewer, the session row's
   detail sheet. This is where the brief's curves-not-hinges rule lives.
2. **The mark** — a 16–24px reduction of the same pose, one flat shape, for lists and tabs.

Drawing the mark **from** the figure (same pose, same proportions, fewer parts) is what keeps 340
movements looking like one family instead of two libraries.

## Rules this adds to the brief

- 🔴 **Legibility at small size is the acceptance test.** A figure that only works large is not
  finished. Judge every figure at the size it will actually be used, and again at half of it.
- 🔴 **Equipment is drawn to the level where the movement is identifiable, and no further.** The
  bar, the plates, the frame's silhouette — not the knurling, not the machine's branding.
- 🔴 **One fill, one weight, one canon across the whole library.** Mixed outline-and-solid inside one
  set is the fastest way to lose the family, however good each drawing is alone.
- **Colour is a whole-body wash or nothing** (sheet 5). No local colour, no coloured clothing —
  local colour would re-introduce exactly the arbitrary-hue decoration the design pass removed.
- **Both genders in the library**, and drawn to the same canon (sheet 3).
- 🔴 **`--anatomy` (`#F2622C`) is still reserved for INSIDE the figures** and never for the UI. The
  fault marker is its first real use.

## Open questions for the spec

1. **Solid silhouette or outline?** Sheets 2/3/4 say solid. Outline reads lighter on a dark ground
   and might carry the fault marker better. **Test: draw the same movement both ways, judge at
   list size on both skins.**
2. **Do we draw the wrong version for every movement, or only where a fault is common?** 340×2 is a
   different project from 340×1 plus ~40 pairs.
3. **Who draws them?** ~340 movements is not a hand-drawing job for one person — the spec has to
   settle the production route before the style is locked, because the route constrains the style.
