# v2.43.1 — The logo re-frozen from the fixed renderer

**Date:** 2026-08-23 · **Thread:** design (B3), on CCHealth's renderer fix (`483e8df`).

Pierre's screenshots showed dark spots on the logo pair — hips, feet, fingers — while the
library's full-detail Deadlift was clean. CCHealth found the root cause in `src/figures/render.js`:
`ribbon()`'s end-cap arc chose its sweep ambiguously at ~180° caps, so ~half of all caps swept
through the ribbon and nonzero winding cancelled the crossed region to a hole. Caps now bulge
outward along the chain tangent.

**This release is the design thread's half:** re-freeze the mark from the fixed generator —
`node scripts/logo-candidates.mjs --freeze pair-off-colour --freeze-bg pair-off-lines` (the mark's
bytes CHANGED this time, unlike the pre-fix re-freeze which was byte-identical) — plus
`make-android-icons.mjs` (all launcher densities regenerated) and the deploy pipeline. The header
logo, backdrop, showcase pair and launcher icons all draw clean now.

Files: `src/spotsetMark.js` (re-frozen) · `android/app/src/main/res/mipmap-*` (regenerated) ·
version bumps. The "S" exploration gallery from the same session is separate:
`_archive/PTApp/branding/2026-08-23-spotset-s-gallery.html` (19 candidates, awaiting Pierre's pick).
