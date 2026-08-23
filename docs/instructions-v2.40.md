# v2.40 — Pebble (the rounded skin) + the `--on-bar` contrast fix

**Date:** 2026-08-23 · **Thread:** design · **Asked by:** Pierre, on a Steel screenshot from his
phone: *"everything is rectangles with corners — smooth them out, make them round, I like the
pills idea… some text cannot be read… create a seventh theme where we can see it."*

## 1. The contrast bug his screenshot showed (fixed in ALL skins)

Steel is a daylight skin with a **dark** `--bar` (#475A80). Eight controls paint text on a
bar-filled surface — `.btn-secondary` (PREV/NEXT, Restore, Complete), `.btn-confirm`,
`.lang-toggle .lang-active`, `.count-effective`, `.period-count-preview strong.accent`,
`.client-chip`, `.time-slot.selected`, `.weekday-chip.selected` — and all of them used
`--chalk`, which in Steel is dark ink: **~2.4:1, unreadable.** In the dark skins the same pairing
is fine, which is why it survived: the bug existed only for the users of one skin.

**Fix: a new token `--on-bar`** — "text on a bar-filled control". Dark skins set it to their
chalk; Enamel/Chalkline (light bars) to their ink; Steel to a light `#EFF3FA` (~9.8:1). It is in
`sanity-skins`' TOKENS list, so no future skin can omit it. 🔴 **Rule: a bar-filled surface
paints its text from `--on-bar`, never `--chalk`.**

## 2. Radius tokens — geometry joins the token contract (Pierre's ruling)

The v2.17 skin rule said "ONLY hue changes". **Amended 2026-08-23 by Pierre:** corner geometry may
vary per skin, but ONLY through five radius tokens; layout, sizes and type stay identical.

| Token | Default | Used by | Pebble |
|---|---|---|---|
| `--r-xs` | 4px | small tags, lang-toggle cells | 999px |
| `--r-sm` | 6px | chips, small buttons, week days, time slots | 999px |
| `--r-lg` | 8px | primary buttons, inputs, weekday chips | 999px |
| `--r-panel` | 10px | panels | 16px |
| `--r-sheet` | 14px | the modal sheet's top corners | 24px |
| `--r-tall` | 8px | tall boxes: textareas, `.focus-notes`, `.week-day`, `.notice`, `.fig-view` | 16px |

Defaults are the shipped values — the six existing skins render near-identical (`--r-tall` sits
within 2px of the five elements' old radii; accepted drift). The radius tokens are deliberately
NOT in `sanity-skins`' per-skin list: omitting them inherits the correct :root geometry.
**Why `--r-tall` exists (i18n/RTL review findings):** a 999px radius eats a text well's first
line, curves into the day chips' labels (worst in Arabic, where the short weekday is a full word
at the cell edge) and clips the figure viewport's art — `.fig-view` has `overflow: hidden`, so a
pill there physically cuts wide poses. The same review converted `.client-chip`'s physical
padding to logical (`padding-inline: 12px 10px`) so the narrow side lands against the X in RTL
too.

## 3. Pebble — the seventh skin

The testbed for the pill look, last in the picker. Same daylight blue-grey family as the Steel
screenshot he was holding, with the contrast lesson applied from the start (lighter ground than
Steel's, `--on-bar` light on a dark slate bar). Every control that was a rectangle is now a pill;
panels and the sheet round to 16/24px. Swatch: #CBD4DF ground, #3D5170 dot.

**If the pills win:** move the pill radii to `:root` and every skin inherits them (Pebble then
collapses back to a palette). **If they lose:** delete the Pebble block and the SKINS entry; the
token plumbing stays, costing nothing.

## Files

`src/styles.css` (tokens, sweep of ~40 border-radius literals, `--on-bar` on 8 controls, the
PEBBLE block, swatch) · `src/skins.js` (SKINS entry + the amended geometry rule) · `src/i18n.js`
(`skinPebble` EN/AR — بيبل, transliteration rule) · `scripts/sanity/sanity-skins.mjs`
(`--on-bar` in TOKENS).
