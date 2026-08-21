# v2.19.1 — fill means press

**Date:** 2026-08-22 · **Trigger:** Pierre, on v2.19 — *"Something doesn't feel right about it.
Maybe the contours of the boxes. The previous one was easier to read. More inviting to press the
buttons."*

---

## The diagnosis

Stage 3 replaced every **fill** with a 2px **outline**. It made the app coherent and it made it
inert: a button, a chip, a time slot and a text input all became the same hollow rectangle, so
nothing on the screen said *press me*. The gradients that came off in v2.19 were genuinely part of
the generated look — but the gradient was the wrong part. **The fill was doing real work.**

## The rule that comes out of it

🔴 **OUTLINE MEANS "OFF". FILL MEANS "PRESS ME".** A control that can be tapped gets a surface;
a state that is merely available gets no border at all. Two states of the same control must differ
by **fill and text colour**, never by border width — at row-of-nine-tags size, a border delta is
invisible.

## What changed

- `.btn-secondary` (Complete — the most-tapped button in the app) filled with `--bar`.
- `.btn-ghost`, `.btn-danger-sm`, `.filter-btn`, `.focus-tag`, `.time-slot`, `.week-day`,
  `.weekday-chip`, `.focus-notes`, `.inline-type-select` filled with `--raised`, borders dropped to
  1px or removed.
- `.focus-tag.active` now inverts — bright fill, dark text — instead of differing by border colour.
- `.input`/`.select` borders 2px → 1px: a 2px cage around every field was most of the "boxes"
  feeling in a form.
- **A real bug this exposed:** the Dashboard's inline type selector bought its 40px tap target with
  a negative margin. Harmless while transparent; once it had a fill it **painted over the date and
  status next to it**. The target is now real padding and the meta row grows a few pixels instead.

## Verified

Built, `verify-bundle`, full sanity suite by exit code (only the three spent live-diff gates fail,
by design), and walked in a browser on the DEMO credential: Dashboard and Schedule in midnight,
confirming both the affordance and the overlap fix. No behaviour, kernel or reducer change;
`DATA_VERSION` stays 6.
