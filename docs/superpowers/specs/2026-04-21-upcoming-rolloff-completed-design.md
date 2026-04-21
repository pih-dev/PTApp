# Upcoming Sessions — Roll off completed sessions after 2h

**Date:** 2026-04-21
**Status:** Approved — ready to plan
**Type:** UX tweak (no schema change, no i18n change, no CSS change)

## Problem

v2.7 replaced "Today's Sessions" with "Upcoming Sessions" on the Dashboard. The current filter is:

```js
const upcoming = state.sessions
  .filter(s => s.status !== 'cancelled' && s.date >= today())
  .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

Completed sessions stay visible until midnight local time. This gives morning-to-afternoon "day-in-review" value, but by evening the list is long and Pierre has to scroll past all of today's finished sessions to reach tomorrow's.

**Reported by:** Pierre, 2026-04-21. He opened the app in the evening to look at tomorrow's schedule and had to scroll past the day's completed sessions.

## Goal

When a session is `completed` and 2 or more hours past its end time, it should disappear from the Upcoming Sessions list. Anything else unfinished (scheduled, no-shows, manually completed within the last 2h) stays visible.

## Non-goals

- No change to Schedule tab day view.
- No change to Sessions log (full history is still useful there).
- No change to stat cards (Today / This Week).
- No live tick / auto-refresh. The list is recomputed on every render, which is enough — opening the app is the main trigger.
- No change to cancelled-session behavior (still hidden).
- No change to the `date < today()` stale guard.

## Design

### Filter change (Dashboard.jsx, ~line 34)

```js
const now = Date.now();
const upcoming = state.sessions
  .filter(s => {
    if (s.status === 'cancelled') return false;
    if (s.date < todayStr) return false;
    if (s.status === 'completed') {
      const endMs = new Date(`${s.date}T${s.time}`).getTime() + (s.duration || 45) * 60000;
      if (now - endMs >= 2 * 60 * 60 * 1000) return false;
    }
    return true;
  })
  .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

### Behavior table

| Scenario | Current v2.7 | After change |
|---|---|---|
| Session at 17:00–18:00, it's 18:30, status=completed | Shown | Shown (<2h past end) |
| Session at 17:00–18:00, it's 20:15, status=completed | Shown | Hidden |
| Session at 17:00–18:00, it's 20:15, status=scheduled (no-show, not marked) | Shown | Shown |
| Session at 17:00–18:00, it's 20:15, status=cancelled | Hidden | Hidden |
| Tomorrow 09:00 session, status=scheduled | Shown | Shown |

### Interaction with auto-complete

Auto-complete already flips `scheduled → completed` 1 hour after end time (v2.5). So a 17:00–18:00 session:
- 18:00: ends, still `scheduled`
- 19:00: auto-completed
- 20:00: 2h past end → rolls off ✓

Sessions the PT marks complete early (e.g., at 17:45) still roll off based on end time (20:00), not tap time. This matches the mental model "the session was until 18:00."

### Views affected

Both the Expanded and Compact views on Dashboard use the same `upcoming` array (per v2.7). A single filter change covers both.

### Why `date >= today()` stays

The `date < todayStr` guard still matters for any stale scheduled session that was somehow never completed from a prior day. Without it, an unfinished `scheduled` session from yesterday would linger forever. Completed-rolloff only handles today's completed; the existing stale-guard handles everything older.

## Implementation notes

- One change site: `src/components/Dashboard.jsx`, the `upcoming` filter (~line 34).
- `Date.now()` is captured once at filter time — don't call inside the predicate per iteration.
- Respect the UTC trap: use `new Date(\`${date}T${time}\`)` (local construction), not string math with `toISOString()`.
- `s.duration` can be missing on very old records; fall back to `45` to match the existing `isNowSession` helper convention.
- Add a brief comment at the filter explaining why 2h was chosen (Pierre's evening-scroll report, 2026-04-21) so a future reader knows it wasn't arbitrary.

## Testing

- [ ] Create a test session ending in the past at minute-level granularity; confirm it stays visible at 1h59m past end, disappears at 2h00m+.
- [ ] Confirm tomorrow's and future sessions are unaffected.
- [ ] Confirm no-show (scheduled, past end time) stays visible — the filter only rolls off `completed`.
- [ ] Confirm Schedule tab day view still shows the completed session after 2h (nothing in Schedule.jsx should change).
- [ ] Confirm both Expanded and Compact Dashboard views behave the same.
- [ ] Confirm dark + light themes + RTL still render correctly (no UI change expected, but a visual sanity pass).

## Version

Ship as v2.9.1 (patch on v2.9 — no schema change, no i18n change, purely a filter tweak).
