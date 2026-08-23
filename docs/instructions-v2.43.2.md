# v2.43.2 — The Spot joins the mark

**Date:** 2026-08-23 · **Thread:** design (B3) · **Asked by:** Pierre, from his own launcher-icon
mock: the S-arrangement rounds are PARKED (sheets + generators archived, below); the shipped logo
keeps the clean facing pair and gains **the Spot** — a dot above, between the heads. *"The circle
is the spot, and the S/pair is the set."*

- **The dot:** `var(--accent)` (his call: theme-handy over fixed red — red-orange in Lume anyway),
  r ≈ 10.5% of the mark's height at (46%, 10%), slightly larger than his mock as asked. Only the
  MARK carries it; the faint backdrop stays figures-only. Frozen via the standard
  `logo-candidates.mjs --freeze pair-off-colour --freeze-bg pair-off-lines`; `pair-off-colour`
  now carries `spot: true`.
- **Animation:** `pm-spot` hook + `pmSpot` keyframes in `styles.css` — the dot wanders in and
  settles at its vantage (0.7s–1.8s), landing before the posture lines draw, so the observer is
  in place when the story plays. `prefers-reduced-motion` disables it.
- **Launcher icons regenerated** (they now carry the Spot).
- **Parked, retrievable:** the S-from-the-pair studies —
  `_archive/PTApp/branding/2026-08-23-spotset-s-gallery.html` (letterforms),
  `…-s-pair-gallery.html`, `…-s-pair-round2/3/4.html` (the pair arrangements);
  generators `scripts/s-pair-studies.mjs`, `scripts/s-pair-round2.mjs`.
