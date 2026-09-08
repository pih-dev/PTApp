# SpotSet v2.46.2 — a muscle has a face, and the tilted camera re-aims (2026-09-08)

Pierre's round-two ask on the spun figures (2026-09-08): "when Elie moves the
model, the focus on the tension area shifts from the spine to the side."
Audited by rendering every turning pattern's pair at 5 yaws × 3 pitches
(`tmp/spin-audit.mjs` → `tmp/spin-audit/*.png`) and LOOKING, not by reasoning
about the maths. Two defects survived v2.46.1's offset fix.

## 1. A back muscle painted the belly once the belly faced the camera

The muscle wash is a band down the trunk's axis, clipped to the silhouette. In
profile that reads as "the erectors"; turn the body to 90° and the same band
covers the whole front of the trunk — a deadlift lit the abs, a curl's
heaved-back fault lit the stomach. That is the "tension area shifting to the
side/front".

**Fix:** `MUSCLE_FACE` (canon.js) says which FACE of which segment each muscle
lives on — erectors/lats/glutes/traps on the back of the trunk, abs/chest on its
front, hamstrings/calves/triceps on the back of their limb, quads/biceps on the
front; delts and forearms have no readable face and paint as before. The
renderer computes the face's outward normal from the spun 3D joints (the
bone × the body's lateral axis, after the same yaw + pitch) and fades the wash
by how much of that normal points at the camera: profile keeps the full band,
turned fully away it is gone, square-rooted so a quarter turn still shows
tissue. A hinged trunk seen from the front keeps ~⅔ of its back wash, because
the back really is tilted toward the viewer.

The fault marker's FILL follows the same rule through the nudge that placed it
("the disc is at the back of the trunk" ⇒ hidden from the front), floored at
0.25 so the ring always finds a centre. The RING never fades — it is the
teaching point.

## 2. A tilted lying figure fell out of the cell

`reground` pins the floor joint to the floor line — right on the turntable, but
under pitch the floor is no longer the bottom of the picture. A plank tilted
40° from below pushed its whole body under the cell's bottom edge; a bridge
from above ran off the top.

**Fix:** `pitchFit()` (spin.js) slides the spun skeleton toward the cell's
vertical centre by a weight that grows with the tilt — exactly 0 at pitch 0
(the turntable keeps its bytes), full by 30°. `spinEquip` reads the same shift
so the bar cannot stay on the floor while the lifter rises.

## Verified

- 680 authored (unspun) figures byte-identical before/after (`tmp/hash-all.mjs`).
- `sanity-figures`, `sanity-skins`, `sanity-movement-library` pass.
- Sheets re-rendered and judged for curl, hinge, bench, bridge, lunge, knee-tuck.

## Not done, on purpose

Limb muscles still take the whole-body sagittal convention for "front/back";
an arm folded behind the head is a case the rule reads approximately. The
reference app's shaded 3D body remains the destination
(`docs/2026-08-22-figures-3d-options.md`; Codex brief
`docs/2026-09-08-codex-figure-library-brief.md`).
