# v2.41 — Rounded rectangles everywhere, the trench, and the all-skins contrast gate

**Date:** 2026-08-23 · **Thread:** design · **Asked by:** Pierre, reviewing Pebble on his phone.

## 1. The Pebble verdict: rounded rectangles, all skins

*"Instead of pebble — a rectangle with round corners. Corners that can be noticed, not something
too large to be portrayed as a pebble. Apply it to all themes."* The `:root` radius defaults ARE
the geometry now: `--r-xs 7 · --r-sm 10 · --r-lg 12 · --r-panel 14 · --r-sheet 20 · --r-tall 12`.
Pebble's pill overrides are deleted — it survives as a palette like any other skin. The per-skin
radius mechanism stays (a future skin may still override).

## 2. The trench — separators stop being flat lines

*"These plain lines… a line, but as a trench."* The monotone came from every separator being the
same flat `--bar` shaft. New derived tokens in `:root`:

```css
--trench-dark: color-mix(in srgb, var(--ground) 72%, black);
--trench-lip:  color-mix(in srgb, var(--ground) 45%, white);
--trench:      linear-gradient(to bottom, dark 0 66%, lip 66% 100%);
```

An engraved groove: a channel darker than the skin's own ground with a light lower lip — derived
from tokens, so it works in all seven skins with no per-skin values. 🔴 `black`/`white` here are
darken/lighten **operators**, not colours — the "a literal belongs to ONE skin" rule targets
absolute colours. Applied to: `.card`'s bottom rule (as a background strip — gradients can't live
in `border-color`), `.srow::after`, `.rrow::after`, `.bar-shaft` (all 3px, capsule ends).

**Round everything** (his words): capsule ends (`999px`) on `.load-seg` (the count dashes that
were bare squares), `.size-meter span`, `.bar-collar`, `.week-day::after`, `.load-base`,
`.fig-drag-bar`.

## 3. The contrast gate — his process ruling, made permanent

*"When I share a screen and observe something, you don't change only the screen I shared — you
change everywhere that thing applies, within that theme and within the other themes."* The v2.40
`--on-bar` fix did go into all seven skins, but nobody re-measured the OTHER pairings. Now
`scripts/sanity/sanity-contrast.mjs` measures every meaningful token pairing in every skin, every
run of the suite. It found and v2.41 fixed:

| Skin | Token | Was | Now | Why |
|---|---|---|---|---|
| midnight | `--bar` | #5A78A8 (on-bar text 3.84:1) | #4A6791 (~4.9) | same bug class as steel, milder |
| chalkline | `--ok` | #2E7D4F (4.23) | #2A7348 (~4.8) | badge text |
| enamel | `--ok` | #3E7A34 (4.17) | #35682C (~5.3) | badge text |
| enamel | `--warn` | #8F6B00 (3.94) | #7A5B00 (~5.1) | the CANCELLED class of bug |

Deliberately NOT "fixed": lume/enamel's quiet shafts and faint decoration — v2.34's soot-on-soot
is a ruled design, so decorative pairings gate at "perceivable" (≥1.4 / ≥1.8), text at hard 4.5.
The gate exits 1 and prints DO NOT DEPLOY on any failure.

## Container height note

Pierre flagged containers "too high" with two Display sheets open in two tabs — the text-size
dial (`--ts`) at a high stop scales text, and rows grow with it. Closing the duplicate tabs and
re-setting the dial in one Display sheet is the reset; no code defect found.

## Files

`src/styles.css` (radii, trench, capsules, 5 skin values) · `scripts/sanity/sanity-contrast.mjs`
(NEW gate) · version bumps.
