# SpotSet v2.23.1 — the bench press turns under your finger

**Date:** 2026-08-22 · **Asked for by Pierre:** *"I need different angles where possible. Either that
or 3D. They drag them… So there will be two pictures… Draggable by finger for people to see."*

---

## What you will see

Open **Flat Barbell Press** and the pair has a **DRAG TO TURN** bar under it. Put a finger on the
figures and slide sideways: **both halves turn together**, from the profile view to the view from
above, and the elbows become visible.

That is the whole point. Elbow flare is *abduction* — it happens in the plane a side-on drawing
looks straight down, so no amount of redrawing shows it from the side. Until now the answer was a
third static figure bolted underneath. Now it is a finger.

## Why both halves turn together

The pair exists so a lifter can compare correct against wrong. Turning one and not the other would
compare **two different cameras** and teach the wrong difference. One gesture, one angle, both
figures.

## What this is, honestly

**It is a tween between two authored cameras, not a 3D rig**, and that was a deliberate choice.

A true 3D rig needs a body-fixed frame per segment — a lying figure's left-right axis is not the
world's — which is a rewrite of all 44 patterns' numbers. It was tried first and reverted: 298 of the
340 figures changed and the supine patterns came apart.

A tween needs **two drawings that were each checked by eye**, and every frame in between is bounded
by two known-good shapes. It cannot rotate into an illegible blob, which is the failure mode the
options write-up flagged as the risk of the 3D route.

Two consequences worth knowing:
- **Bone lengths vary across the turn — and that is correct.** A bone turning toward the camera
  really is drawn shorter, and both endpoints are its true length at that camera.
- **The equipment swaps at the halfway point rather than tweening.** A bench from the side and the
  same bench from above are not one shape with different numbers — one is a slab and a post, the
  other is a pad with a bar across it. Interpolating produces a third object that exists in neither
  view. The swap is visible for one frame; a morphing bench would be wrong in every frame.

## Only one pattern rotates, on purpose

A second camera is two more poses that have to be judged by eye, and it earns its place **only where
the fault is out of the pair's plane**. The bench press is the case that forced the feature.
Patterns whose fault is fully visible in one view gain nothing from turning, and a drag handle that
does nothing is worse than no drag handle.

**Next candidates, in order:** the squat (knee valgus is frontal, the pair is already drawn front-on
— it would gain the profile), rows (scapular position), and the rotation patterns.

## The gesture

`touch-action: pan-y` in CSS, not a `preventDefault` in JS — the sheet still has to scroll
vertically under the same finger, and a non-passive `preventDefault` is what broke elastic overscroll
the last time. Pointer events, so finger, mouse and pen are one code path, with pointer capture so
the gesture survives the finger leaving the small SVG box. The travel is scaled to the element's own
width: half a width is a full turn on any screen.
