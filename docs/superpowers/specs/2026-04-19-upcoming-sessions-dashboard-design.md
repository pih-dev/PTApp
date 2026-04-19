# Upcoming Sessions on Dashboard — Design

**Date:** 2026-04-19
**Status:** Approved, ready for implementation plan
**Scope:** `src/components/Dashboard.jsx` + one-line addition to `src/i18n.js` (new `today` key in en + ar)

## Problem

The Dashboard's main session section currently shows "Today's Sessions" in expanded view. At 20:00 on April 19, a session scheduled for April 20 at 07:00 is not visible until midnight crosses. The PT's day-ahead planning window is blind.

The compact view already shows upcoming sessions, but limited to 5 and only in the secondary view most users don't switch to.

## Goal

Rename the section to "Upcoming Sessions" and show all future scheduled sessions in both expanded and compact views, sorted by closest first.

## Design

### Single source of truth for the list

Replace the two separate arrays (`todaySessions` and `upcomingSessions.slice(0,5)`) with one `upcoming` array used by both views:

```js
const todayStr = today();
const upcoming = state.sessions
  .filter(s => {
    if (s.status === 'cancelled') return false;
    // Hide completed sessions from past days; keep today's completed visible
    // so the PT sees the day's progress ("3 done today, 2 to go")
    if (s.status === 'completed' && s.date < todayStr) return false;
    // Hide anything older than today that slipped through (e.g. stale scheduled)
    if (s.date < todayStr) return false;
    return true;
  })
  .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

**Filter rules:**
- `cancelled` → always hidden
- `completed` AND `date < today` → hidden
- `completed` AND `date === today` → **shown** (today's progress visible)
- `scheduled`/`confirmed` AND `date >= today` → shown
- Any status AND `date < today` → hidden (stale guard)

**Sort:** date ascending, then time ascending. Closest session at the top.

**No limit.** All matching sessions are shown.

### Section title

Replace the conditional title:

```jsx
// BEFORE
<span>{expanded ? `📅 ${t(lang, 'todaySessions')} (${todaySessions.length})` : '📅 ' + t(lang, 'upcomingSessions')}</span>

// AFTER
<span>{`📅 ${t(lang, 'upcomingSessions')} (${upcoming.length})`}</span>
```

Count shown regardless of view.

### Expanded view

Iterate `upcoming` instead of `todaySessions`. All existing functionality preserved (complete, remind, edit, focus tags, notes, cancel, in-progress amber glow).

**One display tweak:** each card must show its date — currently the expanded view omits date because "today" was implicit. Add a date line under the time meta row:

```jsx
<div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>
  {session.date === todayStr ? t(lang, 'today') : formatDate(session.date, lang)}
</div>
```

Today's sessions show "Today", others show formatted date (e.g., "Apr 20"). This requires adding a new i18n key `today` to `src/i18n.js` (en: "Today", ar: "اليوم").

### Compact view

Iterate `upcoming` instead of `upcomingSessions.slice(0, 5)`. No other changes — compact cards already show the date.

### Empty state

Both views use `t(lang, 'noUpcoming')` and the existing "book" CTA. The `noSessionsToday` i18n key is no longer used in Dashboard but stays in `i18n.js` for compatibility.

### What does NOT change

- **Stat card "Today"** (middle of the stat row) — still shows count of today's sessions. Different purpose from the list: the stat is a quick glance at workload density, the list is the action queue.
- **`todaySessions` calc** — kept only to feed the "Today" stat card.
- **`weekSessions` calc** — unchanged.
- **`isNowSession` / `card-now` amber glow** — still fires for in-progress sessions based on time, works on any date.
- All action buttons, focus tags, notes textarea, edit modal, cancel prompt, action sheet modal.
- i18n: one new key (`today`) added in both en and ar. `upcomingSessions` and `noUpcoming` already exist and are reused.
- CSS: no changes.

## Data model

No schema changes. No migration needed.

## Sync impact

None. Read-only change to how existing sessions are filtered for display.

## Testing

Manual verification on dev server:
1. **Today has sessions** → list starts with today's, ordered by time
2. **Today's completed still visible** → green badge, not hidden
3. **Yesterday's scheduled (shouldn't exist but defensive)** → hidden
4. **Tomorrow-only scenario** (the trigger case) → tomorrow's sessions visible even before midnight
5. **Cancelled sessions** → hidden in both views
6. **No sessions anywhere** → empty state with "Book session" CTA
7. **In-progress session (during an actual session time)** → amber glow still appears
8. **Compact view** → same list, no 5-session cap
9. **RTL (Arabic)** → date line renders with RTL layout
10. **Light + dark theme** → date line uses `var(--t5)`, theme-aware

## Size

~20 line diff, single file. Version bump to v2.7.

## Out of scope

- Virtualized/paginated list (not needed; session counts are small)
- Collapsing past days into a "completed today" summary (current solution shows them inline, which is simpler)
- Removing the Compact/Expanded toggle (the distinction — tap for action sheet vs inline controls — still serves different use cases)
- Changing the Schedule or Sessions tabs
