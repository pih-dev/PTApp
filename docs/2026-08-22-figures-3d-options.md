# Rotatable figures — the options, and what each one really costs

**Asked for by Pierre, 2026-08-22:** *"I need different angles where possible. Either that or 3D.
They drag them… So there will be two pictures. For example, one is the posture — both regarding the
correct and the most common mistake. Draggable by finger for 3D, for people to see."*

**Status:** not started. This is the write-up to read before choosing, and the choice is Pierre's.

---

## What the ask actually solves

The pair stays — correct beside the most common mistake. What changes is that a figure stops being a
fixed camera.

**This is not a nice-to-have, and the bench press already proved it.** Elbow flare is *abduction*: it
happens in the plane a profile camera looks straight down, so a side view cannot show it at all. The
answer shipped in v2.22.1 was a **third figure from above** — a second static camera bolted on. The
same problem is queued behind the squat (knee valgus is frontal), every row (scapular position),
every rotation pattern, and any single-arm movement.

A rotatable figure **retires that whole class of workaround** instead of adding a fourth and fifth
static camera per movement, forever.

---

## The four routes

### A. More static cameras — cheapest, and it does not scale
Add a second or third `extra` per pattern, as the bench press already has. Zero new technology, and
each one is ~10 numbers.
- **Cost:** roughly 20 patterns × 1 extra camera = 20 more poses to author and judge.
- **Why it is not the answer:** it answers "show me the elbows" but never "let me look". Pierre asked
  for the second thing.

### B. 2.5D — rotate the existing skeleton about the vertical axis
The current rig is 2D: `canon.js` holds bone LENGTHS and a pose holds ANGLES. Give every joint a
**third coordinate (depth)**, keep the same bone lengths, and project through a single rotation angle
θ that a drag gesture controls.
- **What has to change:** poses gain a `z` per joint or a per-limb out-of-plane angle;
  `skeleton()` returns 3D points; the renderer projects them before it sweeps its ribbons; the
  near/far depth fudge in `LATERAL` becomes real depth and stops being a fudge.
- **What does NOT change:** the canon, the ribbon renderer, the posture line, the muscle bands, the
  fault marker, the clipping, the 44 patterns' angles — all of it survives, because a projection is
  applied *before* any of that runs.
- **Cost:** the engine work is real but bounded — one afternoon for the projection, then a pass over
  44 patterns to add depth to the limbs that have any. Bundle cost: near zero, still angles.
- **The catch:** a silhouette rotated to face the camera loses its outline. At θ ≈ 0° a profile
  figure becomes a front figure and the ribbons overlap into a blob. Solvable — depth-sort the
  ribbons and paint far-to-near, which the renderer already half does — but it is the part to
  prototype first, because it decides whether the route works.
- **🔴 It also breaks a rule we would have to re-decide:** `fs` (projection scale) exists precisely
  because the rig is 2D, and the pair rule is enforced by `fs` being identical across a pair. In a
  real 3D rig `fs` disappears and the rule becomes "same bone lengths in 3D", which is *stronger* and
  easier to assert. That is an improvement, not a loss — but `sanity-figures.mjs` changes with it.

### C. True 3D with a mesh — rejected before it is proposed
A rigged humanoid mesh, a WebGL renderer, a skinned skeleton.
- **Cost:** a 3D library (three.js is ~600 KB before a model), a mesh someone has to model or
  license, a skinning rig, and lighting that has to work on both skins.
- **Why not:** the whole library currently costs **37 KB**. This would multiply the bundle by an
  order of magnitude to render the same 44 patterns, and it re-opens every decision the design pass
  settled — silhouette, one fill, one weight, tokens only.

### D. Pre-rendered rotation frames
Render each figure at, say, 12 angles at build time; the drag scrubs through frames.
- **Cost:** 340 movements × 2 figures × 12 frames = **8,160 SVGs**. Even at 8 KB each that is 65 MB.
- **Why not:** it is route B's maths with route C's file size, and it cannot interpolate.

---

## 🔴 THE DESTINATION, STATED BY PIERRE 2026-08-22

> *"Eventually 3D models that can be rotated and zoomed in/out, after a few rounds."*

So this is not a choice between the routes below — it is an **order**. Route B is not the
destination, it is the road to it, and "after a few rounds" is the instruction that matters: each
round has to ship something usable on its own.

| Round | What ships | State |
|---|---|---|
| 1 | Rotation on **one** pattern, tweened between two authored cameras | ✅ v2.23.1 |
| 2 | **Zoom on every pair** (double-tap + pan), and the logo opens the library | ✅ v2.23.2 |
| 3 | Rotation on the patterns whose fault is genuinely out-of-plane — **each needs its second camera authored and judged**, not just switched on | next |
| 4 | Depth on the skeleton: a body-fixed frame per segment, so a figure turns continuously instead of tweening between two stops | |
| 5 | Pinch-zoom, once the figure has a surface of its own — pinch needs `touch-action: none`, which a scrolling bottom sheet cannot give up | |

**Round 3 is the one to resist rushing.** A drag handle on a pattern whose fault is fully visible
from one camera does nothing, and a control that does nothing is worse than no control. The bench
press earned it because flare is abduction; most patterns have not.

## Recommendation

**Route B, prototyped on ONE pattern before anything scales** — exactly how the pilot seven were
handled, and for the same reason. Take the bench press, because it is the movement that already
needed a second camera: if a drag can turn the profile figure until the elbows are visible, the third
static camera deletes itself and the route has proven its own value. If the silhouette falls apart
under rotation, we have learned that for the cost of one pattern.

**Then, and only then,** decide whether all 44 get depth or only the ones with an out-of-plane fault.

## Open questions for Pierre

1. **Does the pair stay two drawings, or does one rotatable figure carry both?** My reading is the
   pair stays — comparing correct against wrong side by side is the whole feature, and you cannot
   compare two things by rotating one of them. Confirm.
2. **Does the drag need to persist**, or is it a look-and-release? Persisting means storing a
   per-movement default angle, which is a small data question, not a rendering one.
3. **Reduced motion:** the app honours `prefers-reduced-motion`. A drag is user-driven so it is
   fine, but any auto-spin on open would not be.
