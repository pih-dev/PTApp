# v2.33 — The Library takes slot four

**Released:** 2026-08-22 · navigation change + one platform bug fixed app-wide · no schema change,
no data touched, `DATA_VERSION` unchanged at 6.

## What changed, for the person using it

**The fourth tab is now the movement library.** It used to be *Sessions*, a flat list of every
session ever recorded — 514 of them today. The library is 340 movements, each with its figure,
searchable in Arabic and English from one box.

**Nothing was deleted.** The all-sessions list moved to **"All" on the Schedule day bar**, next to
Book. Restoring a cancelled session, adding a note to a past one and auditing a count all still work,
one tap further away.

**Two other doors to the library closed**, because there are now three ways into one room:
- The **General sheet's "Movement library" button is gone.**
- The **logo word still goes to the library**, but it now *selects the tab* instead of opening a
  second copy in a sheet. Same gesture Pierre designed in v2.30.1; one destination.

## Why

`docs/design/2026-08-22-fresh-eyes-navigation-review.md` — a reviewer that had never seen the app,
given the structure stripped of all colour, type and naming, and told to argue it is wrong until it
defends itself. Pierre approved the change the same evening.

Two findings drove this release:

1. **"Browse every session ever recorded" is not a moment in anyone's day.** The real uses of that
   list — restore, note, audit — are always *about a client* or *about a day*, and both of those
   pivots already exist in the app. The tab represented a table, not a job.
2. **The library had no entrance.** 340 movements with figures, the most-built asset in the product,
   reachable only by tapping a word in the logo. The reviewer's line: *"not an entrance, it is an
   easter egg."* And on the General duplicate: *"when you build a fallback entrance for your own
   front door, the front door is wrong."*

**What the review did NOT change, and defended:** the four-tab bar itself, Home as the default action
feed, and the client page as a person-hub that duplicates capabilities on purpose. Duplication across
the *moment* pivot (tabs) and the *person* pivot (the client) is structure, not redundancy.

## 🔴 The bug this release fixes for the whole app

The mobile review of this change found a **pre-existing platform bug** that was never about the
library. It applied to the booking sheet and the client sheets too, and had been latent for months.

**Every modal now portals to `<body>` (`Modal.jsx`, `createPortal`).** Rendered where they were
declared — inside `.content` — two independent things broke:

1. **`initElasticScroll` (`utils.js`) leaves an inline `transform` on `.content`.** The overscroll
   bounce settles on `translateY(0)`, which is still a transform, and the `transitionend` cleanup
   only clears `transition`. **A transformed ancestor becomes the containing block for
   `position: fixed` descendants** — so after the PT's first bounce, an open sheet stopped being
   viewport-fixed, re-anchored to `.content` and was clipped by its overflow. Worse mid-gesture:
   `.fig-interactive` is `touch-action: none`, so a figure-rotation drag still bubbles `touchmove`
   to `.content`, and the sheet jumped while the finger was on the figure.
2. **`.content` is `position: relative; z-index: 1`** — a stacking context. A `z-index: 200` overlay
   opened inside it painted **under** the `z-index: 100` nav: the bottom bar stayed undimmed and
   tappable over the sheet, and a tab tap unmounted the screen, dismissing the sheet with no close
   gesture.

**And the fix needed a second half.** `dir` was written only on `.app-container`; a portalled modal
lands on `<body>`, outside it. Left alone, **every sheet would have rendered left-to-right for Arabic
users while the screen behind it stayed right-to-left.** `dir` is now stamped on `<html>` as well
(`App.jsx`), so every `[dir="rtl"]` rule in `styles.css` reaches the portal by descent. The container
keeps its own `dir`: same value, no change in flow, and still correct if the portal target moves.

Also from the same review: `.bar > button { min-height: 44px }` — the new "All" button resolved to
~33px, a sub-44pt target ten pixels from another sub-44pt target, on a screen used with sweaty hands.

## Files

| File | Change |
|---|---|
| `src/components/MovementLibrary.jsx` | New `embedded` prop: drops the `Modal` wrapper, adds a `<Bar>` head. **One component, two renderings** — a change to the library cannot land in one place and miss the other. |
| `src/App.jsx` | Tabs array: `sessions` → `library`. Logo word selects the tab. Library sheet + its state deleted. `Sessions` import dropped. `dir` stamped on `<html>`. |
| `src/components/Schedule.jsx` | `showAll` state, the "All" button on the day bar, `<Sessions>` inside a `Modal`. |
| `src/components/General.jsx` | Library button, its sheet, its state and its import removed. |
| `src/components/Modal.jsx` | `createPortal(..., document.body)`. |
| `src/styles.css` | `.bar > button { min-height: 44px }`. |
| `src/i18n.js` | `library` — EN "Library", AR "المكتبة". |

## Testing

Full sanity suite run before deploy: green except the four documented expected failures
(`live-v5-diff`, `live-v6-diff`, `live-migration` — all SPENT by design; `live-supabase-diff` —
expected to fail bare in Phase 1, the daily job is `soak-day.mjs`). Bundle verified with
`verify-bundle.mjs`. No new failures introduced.

**Not covered by an automated gate:** the portal change touches every modal in the app, and the
failure modes it fixes are physical — an overscroll bounce, then open a sheet. Worth one pass on a
real phone over the booking sheet, a client sheet, and a movement figure.

## Provenance

Navigation change: proposed by the fresh-eyes review, **approved by Pierre in-session 2026-08-22**
("session out, movement library in at the bottom bar"). The platform bug fix was not asked for — it
was found by the mobile-UX review of this diff and fixed in the same release because it was already
shipping to Elie's phone.
