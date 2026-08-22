# SpotSet v2.24 — the figure obeys the finger, and every colour now means one thing

**Date:** 2026-08-22 · **Asked for by Pierre**, item by item from the figures brief, tested live on
his phone the same day.

---

## Pinch to zoom, drag to turn — no modes

The old design made you double-tap first. Now the figure is direct: **pinch zooms** continuously
(up to 3×), **one finger always turns** a rotatable pair — zoomed or not — and a vertical drag pans
while zoomed. Double-tap still toggles zoom, kept for mouse users and as the accessible path.

This was possible because Pierre ruled the constraint away: the movement card does not need to
scroll from on top of the art, so the figure block now owns its gestures outright
(`touch-action: none` on the pair, the sheet scrolls from everything below it).

## The zoom lands where the teaching is

Zoom used to scale about the centre of the cell — the hips — and a shoulder movement's teaching
fell out of the top of the frame. It now anchors on the **fault joint** (the marked one), and both
halves share the anchor so the pair stays a comparison.

## One colour, one meaning

| Colour | Means |
|---|---|
| **Green** posture line | form held — this is the right shape |
| **Orange** posture line + ring | form lost, and where the stress lands |
| **Blue** | the equipment — bar, bench, cable, machine |
| **Crimson / violet** wash | prime movers / supporting muscles |

Blue used to be both the "held" line and (nearly) the accent; Pierre's call: green for correct,
blue for the gear.

## The wrong posture trains the wrong muscles — and now the figure says so

On eight patterns so far (deadlift-family, overhead press, triceps pushdown and overhead, push-up,
bench press, hip extension, leg raise), the fault figure highlights **the muscles that position
actually loads** — a rounded deadlift lights up the erectors and forearms, not the glutes. Not
right-versus-wrong: *this trains X, that loads Y*. The remaining patterns keep the shared wash
until each is judged — a wrong claim would be worse.

## Where this is going

Unchanged: round 3 authors second cameras for the out-of-plane faults; round 4 gives the skeleton
real depth (and lets the bench turn with the figure — today it still swaps at the halfway point);
round 5 is pinch on a true 3D rig. Staged path: `docs/2026-08-22-figures-3d-options.md`.
