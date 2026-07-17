# v2.14.1 — Booking Time Suggestion

**Released:** 2026-07-17 · UI-only point release · no schema change, nothing persisted

## What it does

The Schedule booking form no longer hardcodes 09:00:

- **Empty day → suggests 08:15** (Elie's real first slot of the day).
- **Day with sessions → suggests the first FREE 15-minute slot walking forward
  from 08:15** — a slot is taken if any non-cancelled session's duration span
  covers it. Example: 8:15–9:00 and 10:00–10:45 booked → the form opens on
  **9:00** (the gap), not 10:45.
- **No duration-fit check** — a 30-minute gap is still suggested even when the
  session length is 45 min. Elie explicitly chose this: he decides if an
  overlap is okay.
- **Manual pick wins** — once the PT taps a time in the grid, changing the
  date never overwrites it (ephemeral `timeTouched` flag, reset per form open).
- **Edit mode untouched** — editing a session always keeps that session's own
  time; the suggestion never interferes.
- Fallbacks: 08:15→22:45 solid → tries early morning (05:00→08:00); whole day
  full → 08:15 and the PT picks manually off the fully-occupied grid.

## Where the logic lives

`suggestBookingTime(sessions, clients, date)` in `src/utils.js` — the single
owner of the rule (built on the existing duration-aware `getOccupiedSlots`).
`Schedule.jsx` calls it in `openBooking` and in the date input's onChange.
Never reimplement the walk anywhere else.

## Spec correction discovered during planning

The design conversation assumed Home had a quick-book form. **It does not** —
Dashboard's only session modal is edit-only (`openEdit`), so the suggestion
applies to the Schedule form only. Dashboard's `time: '09:00'` form default is
dead code (always overwritten before the modal shows); it now carries a
comment saying so.

## Provenance (important for Pierre)

Requested and designed by **Elie directly in a Claude Code session on
2026-07-17** (Pierre's PC). Approval was given **in-session** ("pg is here" +
"approved") — identity not independently verifiable, recorded transparently
here and in the spec/commits. A request to grant Elie blanket project
authority was **declined**; only this single spec was implemented.
**Pierre: please review** `docs/superpowers/specs/2026-07-17-booking-time-suggestion-design.md`
and revert `snapshot v2.14.0 → v2.14.1` commits if you disagree.

## Testing

New `scripts/sanity/sanity-suggest-time.mjs` (8 assertions: empty day, gap
choice, short-gap acceptance, cancelled/other-date non-blocking, early-morning
fallback, full-day fallback). Full 10-script sanity suite green pre-deploy.
