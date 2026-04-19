# PTApp Instructions — v2.7

v2.7 is a **single-feature release** focused on the home screen. Nothing else changed — sync, clients, scheduling, WhatsApp, themes, and language all work exactly the same as v2.6.

For the full feature walkthrough, see [`instructions-v2.5.md`](instructions-v2.5.md). For the v2.6 sync reliability changes, see [`instructions-v2.6.md`](instructions-v2.6.md).

---

## What Changed in v2.7

**The home screen now shows "Upcoming Sessions" instead of "Today's Sessions".**

Before v2.7, the main list on the home screen only showed sessions dated today. If you booked a client for tomorrow morning, that session wasn't visible at all until midnight crossed. The day-ahead planning window was blind.

v2.7 replaces that list with **all upcoming sessions**, sorted with the closest one at the top, in both expanded and compact views.

**What this means day-to-day:**
- **Tomorrow's sessions are visible tonight.** At 8pm on Monday you can see Tuesday 7am on the home screen — no need to open the Schedule tab.
- **The list keeps going.** If you have sessions booked for next week or next month, they all show up in order. The closest is always at the top.
- **Each card shows its date.** Today's cards say "Today" under the time/type row. Future cards show the date (e.g. "Apr 20"). Quick glance tells you what day a card belongs to.
- **Today's completed sessions still show.** If you mark a session complete at 10am, it stays in the list until end-of-day so you can see your progress ("3 done, 2 to go"). Past days' completed sessions don't clutter the list — they roll off automatically at midnight.

**What stays the same:**
- The three stat cards at the top (Clients, Today, This Week) are unchanged. "Today" still counts only today's sessions.
- The Compact/Expanded toggle still works the same way — Expanded shows full controls per card (complete, remind, edit, focus tags, notes), Compact is a short list where tapping a card opens the action sheet.
- The in-progress amber glow still appears on sessions that are currently running.
- The Schedule and Sessions tabs are unchanged — they already did their own thing.

**What goes away:**
- The "Today's Sessions" label is gone. The section is now titled "📅 Upcoming Sessions (N)" with the count visible in both views.
- The Compact view's old limit of 5 sessions is gone — it now shows everything, same as Expanded.

---

## One small note

If you have a lot of sessions booked far into the future, the Expanded view will be long. Switch to **Compact** if you want a quick scroll without the per-card controls. Both views show the same sessions in the same order.

---

## Technical details

Single-file change — `src/components/Dashboard.jsx`. One new i18n key (`today`) added for the date line. No data migration, no sync impact, no CSS changes. Version bumped to v2.7 in the debug panel.

Spec: [`docs/superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md`](superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md)
Plan: [`docs/superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md`](superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md)
