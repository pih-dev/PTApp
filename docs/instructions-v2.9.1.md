# v2.9.1 — Upcoming rolls off completed sessions 2h past end (2026-04-21)

One filter change in `src/components/Dashboard.jsx`. No schema change, no migration, no new setting.

> Written 2026-08-03 during the CLAUDE.md slim-down — v2.9.1 shipped with changelog entries but no
> instructions file. This closes that gap.

---

## What changed for the PT

**The evening view got crowded.** After v2.7 made the home screen show "Upcoming Sessions" (today's +
future, no cancellations), the list worked well all day — but at night, opening the app to peek at
tomorrow's first session meant scrolling past everything already finished that day. Day-progress
value in the morning, scroll-fatigue by dinnertime.

**Now a completed session disappears from Upcoming 2 hours after it ends.** A 17:00–18:00 session
stays visible through 20:00, then drops off. The Sessions tab still keeps the full history — only the
home-screen glance is trimmed.

**No-shows stay visible.** A session past its end time still marked `scheduled` needs a decision
(complete, cancel, or follow up), so it is deliberately *not* rolled off.

---

## Technical

`src/components/Dashboard.jsx` — the `upcoming` filter (`status !== 'cancelled' && date >= today()`)
gained a completed-rolloff predicate:

```jsx
if (s.status === 'completed') {
  const endMs = new Date(`${s.date}T${s.time}`).getTime() + (s.duration || 45) * 60000;
  if (nowMs - endMs >= TWO_HOURS_MS) return false;
}
```

Both the Expanded and Compact home-screen views iterate the **same** array, so one change covers
both — and it behaves identically in dark, light, and RTL.

---

## Source

- `docs/changelog-summary.md` → "v2.9.1 — Evening Dashboard Cleanup"
- `docs/changelog-technical.md` → "v2.9.1 — Upcoming rolls off completed 2h past end"
- Deploy commit: `45df6a0` — *Deploy v2.9.1: roll off completed sessions 2h past end*
