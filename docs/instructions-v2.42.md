# v2.42 — 21 skins (7 families × light/optimal/dark), Flint, tighter boxes, the type sweep

**Date:** 2026-08-23 · **Thread:** design · **Asked by:** Pierre, on a cropped screenshot of the
session-card buttons.

## 1. Box heights + spacing

The shared button rule (`.btn-primary…-whatsapp`) drops from `min-height: 42px / padding 9px` to
**40px / 7px** — the labels sat in dead vertical space. `.srow-actions` gap 8→10px, margin-top
12→14px: rows breathe more, buttons hug their text.

## 2. The skin system triples: 7 families × 3 variants = 21

Pierre's structure: *"an optimal for a specific theme might be neither light nor dark — if we
constrain ourselves to light/dark we will always be building light and dark."* So every family
keeps its hand-designed skin as **Optimal** and gains derived **Light** and **Dark** flanks.

- **`scripts/gen-skin-variants.mjs`** derives the 14 flanks from the current optimals — same-
  polarity flanks push the ground ramp further out; cross-polarity flanks are hue-preserving
  inversions — then **auto-adjusts every value until the sanity-contrast pairings pass**, and
  writes static CSS between the `GENERATED SKIN VARIANTS` markers in `styles.css`. Re-run it
  whenever an optimal changes; never hand-edit the generated blocks.
- **Ids:** optimal = bare family id (`lume`), flanks = `lume-light` / `lume-dark`, so every stored
  pick keeps working. `skins.js` exports `FAMILIES` / `VARIANTS` / `skinId` / `splitSkin`; `SKINS`
  is derived.
- **Picker (Display):** 7 family cards + a Light/Optimal/Dark segmented row — picking a family
  keeps your variant, picking a variant keeps your family. A 21-card grid was rejected as
  unusable on a phone.
- **Pebble → Flint** (*"similar to steel, but I like it — more contrast"*): the pill-testbed name
  retired with the pills; the palette stays as the seventh family. `loadSkin()` migrates a stored
  `pebble` to `flint` once. Arabic: فلينت; variants فاتح / الأمثل / داكن.

## 3. Type coherence sweep

*"With all the changes we now have detached sizes — a sweep restores coherence."* Strays snapped
to the scale: 9px → 10px (`.time-slot-name`, `.mv-badge`), 12.5px → 13px (`.srow-meta`),
`.client-name` 18 → 19px (same role as `.srow-name`). The 10px micro-label tier and the display
numerals (20–44px) were already coherent and stand.

## 4. The logo

- **Larger** (his ask): `.logo-icon` 40→46px, mark 26→31, `.logo-text` 24→26px.
- **Regenerated from the corrected figures:** `node scripts/logo-candidates.mjs --freeze
  pair-off-colour --freeze-bg pair-off-lines` was re-run after the figures session's v2.38
  corrections. **Result: byte-identical** — the pair poses the mark draws from were not among the
  corrected ones, so the logo already reflects the current library. Launcher icons re-generated,
  also unchanged. The showcase's small figures render live from the library and picked up the
  corrections automatically.

## 5. The Dial

The Type Lab artifact is "the Dial": opened in Chrome, and a Desktop shortcut ships outside the
repo — `C:\Users\pierr\Desktop\The Dial - SpotSet Type Lab.url` →
https://claude.ai/code/artifact/e24337c3-e6e5-401f-b0e7-daba49066674. Two open copies fight over
the same stored dials — keep one.

## Files

`src/styles.css` (buttons, spacing, type sweep, flint rename, 14 generated blocks) ·
`scripts/gen-skin-variants.mjs` (NEW) · `src/skins.js` (families/variants, pebble→flint
migration) · `src/components/Display.jsx` (family+variant picker) · `src/i18n.js` ·
`scripts/sanity/sanity-skins.mjs` (derived-SKINS assertion).
