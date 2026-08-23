# v2.39 — Swipe to Change Week

**Date:** 2026-08-23 · **Thread:** design (HANDOFF-design.md) · **Asked by:** agreed in principle
with Pierre during the v2.37 round; built this session.

## What changed

The Schedule week strip now changes week with a horizontal swipe — swipe the **week**, not the
days. Swipe left goes forward a week, swipe right goes back (mirrored in RTL, where forward in
time is a swipe to the right). The ‹ › buttons in the week nav still work and share the same
`changeWeek()` path.

## How it works (for future sessions)

- **Pointer events on `.week-strip`** (`Schedule.jsx`): `pointerdown` records the touch point,
  `pointerup` measures the delta. One code path for finger, mouse and pen.
- **Thresholds:** ≥48px of horizontal travel AND horizontal ≥ 2× vertical. A sloppy day tap or a
  vertical scroll never turns the week. A real swipe also exceeds a day chip's 44px width, so the
  browser's synthesized click lands on the strip (common ancestor of down/up targets), not on a
  chip — no accidental day selection.
- 🔴 **No `setPointerCapture`** — capturing on the strip would retarget `pointerup` away from the
  day-chip buttons and kill their tap. This is the opposite of the Figure gesture, which captures
  on purpose; the difference is the strip has tappable children.
- **CSS `touch-action: pan-y`** on the strip hands horizontal pans to the handlers while vertical
  page scroll stays native — never a non-passive `preventDefault` (TRAPS). Accepted trade-off:
  touch-driven horizontal *scroll* of the strip is gone; the strip's content is 320px
  (7×44 + gaps), which fits every phone this app targets, and swipe now IS the horizontal
  navigation.
- **Slide animation:** the strip is keyed on its Monday, so a week change remounts it and a
  0.18s slide-in replays from the side the new week came from (`weekSlide` state picks
  `.slide-next` / `.slide-prev`). RTL mirrors the animation names; `prefers-reduced-motion`
  disables it. Haptic tick on a successful swipe, same as other gestures.

## Files

`src/components/Schedule.jsx` (gesture + `changeWeek()` + keyed strip) ·
`src/styles.css` (`touch-action`, slide keyframes, RTL mirror, reduced-motion).
