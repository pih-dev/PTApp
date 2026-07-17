# Booking Time Suggestion — Design Spec

**Date:** 2026-07-17
**Requested by:** Elie (the PT, end user) — directly in a Claude Code session on Pierre's PC
**Status:** Awaiting Pierre's review before implementation
**Scope:** UI-only, no schema change, nothing persisted

## What Elie asked for (verbatim intent)

> "When reserving a time for a session start proposing or highlighting 8:15 not 9, and when a second session is being reserved on that day move automatically to the next available slot for a suggestion, bypass if a session is reserved already and skip to the next nearest free session."

## Decisions made with Elie (2026-07-17)

| Question | Elie's choice |
|---|---|
| Which slot to suggest on a day with existing sessions? | **First free gap walking forward from 08:15** (not "after the last session"). Example: 8:15–9:00 and 10:00–10:45 booked → suggest **9:00**. |
| Must the suggested gap fit the full session duration? | **No** — any free *start* time qualifies, even if the gap is shorter than the session length. The PT decides if an overlap is okay. |
| Which forms get the suggestion? | **Both** — Schedule tab booking form AND Home dashboard quick-book form. |
| Date change while the form is open? | **Re-suggest for the new date, unless the PT already tapped a time manually** — a manual pick is never overwritten. |

## Design

### New helper: `suggestBookingTime(sessions, clients, date)` in `utils.js`

The single owner of the suggestion rule (project convention: logic lives in one
helper, never duplicated per screen — same discipline as `getFocusTags`,
`getRenewalDueMap`).

Algorithm:
1. Build the occupied map for `date` via the existing `getOccupiedSlots(sessions, clients, date)`
   (duration-aware; cancelled sessions do not block slots).
2. Walk `TIMES` forward starting at `08:15`; return the first slot **not present**
   in the occupied map. (Start-time freedom only — do NOT check whether the new
   session's duration fits, per Elie's choice.)
3. If every slot from 08:15 → 22:45 is occupied, walk the early-morning slots
   05:00 → 08:00 and return the first free one.
4. If the entire day is full, return `'08:15'` (the PT will see the grid fully
   occupied and pick manually).

### Schedule.jsx

- `startBooking` (the `setForm` reset, currently hardcodes `time: '09:00'`)
  calls `suggestBookingTime(state.sessions, state.clients, selectedDate)`.
- New ephemeral flag `timeTouched` (component state, NOT stored): set `true`
  when the PT taps a slot in the time grid; reset to `false` when a fresh
  booking form opens.
- On `form.date` change: if `!timeTouched`, recompute the suggestion for the
  new date. If `timeTouched`, leave `form.time` alone.
- **Edit mode unchanged** — editing an existing session still loads that
  session's own time; no suggestion, no touched-flag interference.
- **Repeat/recurring mode**: the suggestion applies to the base `form.time`
  exactly as in single mode (the recurring generator already copies
  `form.time` per row); no per-row re-suggestion — out of scope.
- The existing auto-scroll-to-selected-time behavior in the time grid means
  the suggested slot is scrolled into view automatically; no new scroll code.

### Dashboard.jsx (Home quick-book)

- Same helper, same rule: initial `form.time` and date-change re-suggestion
  with a local `timeTouched` flag. The quick-book form defaults to `today()`,
  so opening it suggests today's next free slot.

### Not doing (YAGNI)

- No visual "suggested" badge/styling on the slot — selection + auto-scroll is
  the suggestion.
- No duration-fit checking (explicitly declined by Elie).
- No per-row suggestion inside the recurring preview.
- No persistence of any suggestion state — everything ephemeral.

### Testing

- Extend `scripts/sanity/sanity-reducer.mjs` era conventions with a small
  dedicated script `scripts/sanity/sanity-suggest-time.mjs`:
  - empty day → `08:15`
  - 8:15–9:00 booked (45 min) → `09:00`
  - 8:15–9:00 and 10:00–10:45 booked → `09:00` (gap chosen, not 10:45)
  - contiguous bookings 08:15 → 22:45 → falls back to early morning (05:00)
  - fully booked day → `08:15`
  - cancelled session at 08:15 → still `08:15` (cancelled doesn't block)
- Manual flow check on phone: open booking form, change date back and forth,
  tap a time then change date (pick must survive), edit an existing session
  (time untouched).

### Version / deploy

- Point release (v2.14.x or v2.15.0 per Pierre's call), no `DATA_VERSION`
  change, standard build → verify bundle → deploy pipeline.
