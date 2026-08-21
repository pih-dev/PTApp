# v2.20.1 — the line down the right edge

**Date:** 2026-08-22 · **Trigger:** Pierre, on his phone — *"there is a line around with the missing
left side. Something weird."*

---

## What it actually was

Three separate things reading as one badly-drawn box:

1. the header's `border-bottom: 2px solid var(--bar)` — the top edge,
2. the nav's `border-top` — the bottom edge,
3. 🔴 **a styled webkit scrollbar** — `::-webkit-scrollbar-thumb { background: var(--bar) }`, 4px
   wide, running the full height of a long list. That was the right edge.

The left edge was "missing" because nothing draws one. 1 and 2 are the design. **3 was a bug**, and
it only shows up on a real device: a *styled* webkit scrollbar does not auto-hide the way the
platform's overlay scrollbar does, so on a phone it is a permanent bright rule down the screen. It
looked fine in a desktop browser because a desktop scrollbar is expected.

**Fix:** `::-webkit-scrollbar { width: 0 }`. The platform's own overlay scrollbar comes back.

**The rule:** don't style a scrollbar in a touch app. Styling it opts out of the platform's
auto-hide, and what you get is a border you did not design.

## Also

- **The week tower got shorter.** Nine sessions in one day built a ~200px column that dominated the
  first screen — the plates are 7px with a 2px gap now (was 9/3), so a full 8-segment day is ~70px.
  Same information, same cap, less shouting.

## Verified

Built, `verify-bundle`, `sanity-skins` clean. Presentation only; `DATA_VERSION` stays 6.
