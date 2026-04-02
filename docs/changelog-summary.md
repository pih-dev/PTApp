# PTApp — What Changed and Why

A plain English summary of each version for anyone who wants the big picture without the code details.

---

## v1.8 — Work From Home Screen (Apr 2, 2026)

The Home screen used to just show a list of upcoming sessions. Tap one to see options. Simple but limited — the PT couldn't tag what he did during a session without switching to the Schedule tab.

Now Home defaults to a full working view: all of today's sessions with every button and feature right there. The current or next session has a subtle glow so the PT knows where he is in his day. A "Compact" toggle switches back to the old simple list for a quick overview.

We tried auto-scrolling to the current session but removed it — with only 5-8 sessions per day, the glow is enough and scrolling could be annoying if you're looking at something else.

---

## v1.7 — Record What Was Done (Apr 2, 2026)

After a session, the PT can now tap tags to record what they worked on. A "Strength" session might be tagged "Chest + Arms". A "Cardio" session might be "Running + Stairs".

Each session type has its own set of tags (muscle groups for Strength, activities for Cardio, etc.). Tap a tag to activate it, tap again to remove it. No save button — it saves instantly.

There's also a notes field for anything the tags don't cover. The PT can write things like "Bench press 3x10 80kg" — we can parse these later for detailed tracking.

The tags show up in the Sessions history so there's a record of every workout.

---

## v1.6 — Smarter Booking + Session Counting (Apr 1, 2026)

Four improvements in one update:

**Visual time picker:** The old time dropdown was replaced with a grid of buttons. Slots already taken show up in red with the client's name. The PT can see at a glance what's booked and what's free. He can still book on a red slot if he wants to (for group sessions or back-to-back).

**Monthly session counter:** Each client's session card now shows a number like "#3" — meaning this is their 3rd session this month. The PT gets paid per month for a set number of sessions (usually 10), so knowing the count at a glance matters.

**Cancel with accountability:** Cancelling a session used to just delete it. Now the PT chooses:
- "Count" — for no-shows or last-minute cancellations. The session counts toward the monthly total even though it didn't happen. The client used one of their sessions.
- "Forgive" — for legitimate cancellations with proper notice. Doesn't count against the client's monthly total.

**Client profiles:** Added optional gender and birthdate fields.

Also changed the default session length from 60 to 45 minutes.

---

## v1.5 — Book Multiple Clients at Once (Apr 1, 2026)

The PT sometimes trains two or three people at the same time. Before, he had to create each booking separately — same time, same type, different client. Tedious.

Now he picks multiple clients from the dropdown. Each one appears as a little tag. Hit "Book Session" and it creates separate appointments for each. Then WhatsApp confirmations cycle through the clients one by one.

The sessions are completely independent — the PT can confirm, complete, or cancel each one separately. It's just a faster way to create them.

---

## Before v1.5 — The Foundation

The app started as a simple mobile-first tool: manage clients, book sessions, send WhatsApp confirmations. Dark theme, works on any phone browser, all data stored on the device.

The PT bookmarked it on his iPhone and started using it immediately. All his clients on day one were booked through the app. That early adoption proved the UX was right and shaped every decision since: keep it simple, keep it fast, don't add friction.

---

## Guiding Principles

These rules emerged from building the app and watching how the PT actually uses it:

1. **Simple beats clever.** The PT adopted the app because it's easy. Extra confirmations, complex flows, and "just in case" features add friction. If a mistap takes one tap to undo, don't add a confirmation dialog.

2. **Watch first, build second.** When we're not sure about a feature, ship the simplest version and see what happens in real use. Assumptions about what the PT needs are usually wrong.

3. **Everything counts.** The PT won't consistently mark sessions as confirmed or completed — he's busy training. So every session counts toward the monthly total. Only cancelled-and-forgiven sessions don't count.

4. **Don't solve imaginary problems.** This is a single-user app on one phone. Edge cases that require multiple simultaneous users or real-time sync don't apply yet.
