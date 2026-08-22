# v2.35.1 — The one string the legibility pass missed

**Released:** 2026-08-23 · one CSS rule · no schema change.

## What changed

The **session type chip** ("Strength", "Cardio"…) on every session row now matches the rest of the
app: body face, sentence case, no tracking, 13px. In v2.35 it was the only string left in condensed
tracked caps, sitting between a fixed "45min" and a fixed "Cancelled".

## Why it survived, which is the useful part

Two independent reasons, and both are worth knowing before the next sweep of this kind:

1. **It is a descendant selector.** `.srow .inline-type-select` is specificity `(0,2,0)`; the v2.35
   legibility block is `(0,1,0)`. Later-in-file does not beat higher specificity, so the block never
   applied to it.
2. **It escaped the harvest.** The v2.35 selector list was harvested from the `[dir="rtl"]` rules
   rather than hand-written — which is exactly why it was otherwise complete. But this one's Arabic
   counterpart is `[dir="rtl"] .srow .inline-type-select`, and the harvester's regex captured the
   **ancestor** (`.srow`), not the target. `.srow` was then dropped as "a container".

🔴 **The lesson: harvesting selectors from an existing rule set catches every simple selector and
silently misses every compound one.** Harvesting was still the right call — it found 36 classes that
hand-writing would have missed — but it needs a second sweep for compound rules. That sweep was run
this time: this was **the only** compound uppercase rule in the file, checked rather than assumed.

Found by Pierre's before/after screenshots, not by a gate. Nothing automated would have caught it —
the app was self-consistent apart from one chip.

## Files

`src/styles.css` — one rule at matching specificity, in the legibility block, with the reason kept
next to it.

## Testing

Build + `verify-bundle.mjs` clean, `sanity-skins` green.
