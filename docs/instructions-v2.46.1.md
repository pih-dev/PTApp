# SpotSet v2.46.1 — the injury ring survives the turn, muscles light the section (2026-09-01)

Both from Elie, via WhatsApp screenshots of the Hammer Curl sheet, judged against
the reference app he sent (MyFitCoach).

## 1. The fault ring stayed glued to the screen while the body turned

A fault marker's `offset` ("the disc is at the BACK of the trunk", `x: -26`) is
authored in the θ=0 side camera's screen space. On a spun pair the joints ride
the turntable but the raw screen nudge did not — so at 90° the ring slid off the
spine onto the oblique, and at 180° it sat on the **belly**. Exactly what Elie's
screenshots show.

**Fix (renderer, so it covers all 340 movements):** `spinOffset()` in
`src/figures/render.js` treats the offset's x as a vector in the body's sagittal
plane and rotates it through the same yaw + pitch the joints get
(`spunSkeleton` now carries `pitchDeg` alongside `theta`). The zoom anchor
follows the same rotation, so pinch-zoom mid-turn centres on the true tissue.
Unspun/authored figures pass through untouched — `theta` is absent, byte-for-byte
identical output.

Verified numerically: ring-to-lumbar distance tracks `off.x · cos θ` at
0/45/90/135/180°, ~0 at 90° (on the spine axis), mirrored at 180°.

## 2. The muscle wash fills the body section, not a floating band

Elie: "check the animation or design to represent the muscle in action."
Pierre's read of the difference: the reference highlights **the sections of the
body where the muscles are** — ours drew fixed-width sausages inside the limb.

**Change:** each `MUSCLE_ANCHORS` band now names the GIRTH keys of its two ends
(`gks`, with a `fill` factor), and the renderer draws the wash at the limb's own
drawn width, tapering end to end. `g` is already view- and turn-blended, so the
lit region agrees with the silhouette at every camera and every spin angle by
construction. Trunk muscles sit slightly inside the outline (fill 0.8–0.9) so
the chalk edge survives. Still clipped to the body, still `--muscle`/`--muscle-2`
tokens — no colour or gesture changes.

## Not done, on purpose

The reference app's fully-shaded 3D body is the standing destination
(`docs/2026-08-22-figures-3d-options.md`); this release closes the gap Elie
actually named. Judged on `tmp/figures-preview.html` (regenerate with
`node scripts/figures-preview.mjs`).
