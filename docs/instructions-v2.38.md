# SpotSet v2.38 — the Judging Bench lands: 44/44 fault muscles, 75 movements turn

**Date:** 2026-08-23 · Figures session (CCHealth/Fable). Everything in this release was judged by
Pierre on the interactive Judging Bench artifact (51 items) plus his photo reports.

**Fault muscles — all 44 archetypes declared.** 33 proposals accepted as-is, squat restored to
quads/glutes after a mis-tap, lunge and reverse-plank applied after their geometry fixes (below) —
re-judge those two in-app. The fault half of every figure now washes the muscles the ERROR loads,
not the movement's training targets.

**Five more patterns spin** (row, overhead-press, hip-bridge, lunge, knee-tuck) with three new 3D
vocabulary pieces: `ball` gear (sphere riding its grip), and racked-bar anchors (`shoulders` for
split squats, `hips` for hip thrusts). **75 movements turn, up from 29**, all true spins — the old
two-camera bench tween is fully retired. Judged at full size, correct + fault, through yaw and
pitch. Rotation, lateral-raise and anti-rotation wait with the squat family: they are
front-authored, and skeleton3 reads a pose as sagittal — their turn opens after the side+depth
re-author (OPEN item 4), not because the ruling is in doubt.

**Geometry fixes from his photos:**
- **Reverse-plank re-authored** — the old spine angle (−104°) computed the whole body below the
  cell; the shipped card showed a limb sliver. Ground pin moved to the ankle (heels carry a reverse
  plank; the toes point up).
- **Lunge** — trunk lean 6°→14° (the vertical trunk made the side view read as a front view, so the
  fault's forward shin read as a sideways knee), and the barbell now racks on the shoulders instead
  of drawing as a ball at the thigh (`anchor: 'shoulders'`, drawn as a disc in side view).
- **Overhead press re-authored to the mid-press moment** — the lockout pose put the bar 125 units
  above the frame: the shipped card was a headless column with no arms. Same defect class as the
  reverse plank.
- **Rollout fault ball clamped inside the cell** (his Bench call).

**Known, logged, not in this release:** the frame audit found 10 more archetypes with joints past
the cell edge (worst: rotation top 78, push-up/plank right 92, triceps-overhead 51, dip 43) — one
framing round owed. Sequences (step strip, each step keeps its pair — his Bench answers) start with
the overhead press as the pilot, next round.
