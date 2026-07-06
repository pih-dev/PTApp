# PTApp v2.12 — 1RM Battery (replaces the Mass battery)

## What changed for the PT
- "Evaluate" now records a **1RM strength test**: bodyweight + max single-rep
  bench press, squat, and deadlift (all in kg, decimals fine — 2.5 kg plates).
- Each lift gets a live verdict (Weak … Excellent) based on the lift-to-
  bodyweight ratio, plus the same overall classification (Beginner A … Pro).
- The old 30-second evaluations are still in each client's history — you can
  view and delete them, but not edit them (the old form is gone).
- Norm Charts (General panel) now shows the strength-standard ratios.
- The standards are published general values until the coach sends his own
  table — same as the sit-&-reach chart before.

## Technical
- New records: `branch: '1rm'`, `raw: { bodyweightKg, benchKg, squatKg,
  deadliftKg }`, frozen `scores: { bench, squat, deadlift }` + `liftAvg` +
  `classification`. No migration; DATA_VERSION stays 5.
- `compute1RMFrozen` in `normCharts.js` is THE scoring kernel (form chips +
  save path). Chart keys `bench1rm/squat1rm/deadlift1rm`; `CHARTS_VERSION` = 2.
- Ratios are never frozen — always derived from `raw` at display time.
- Timer console removed from the form (1RM attempts aren't timed);
  `EvalTimer.jsx` retained in repo, unrendered.
- Spec: `docs/superpowers/specs/2026-07-06-1rm-battery-replaces-mass-design.md`.
