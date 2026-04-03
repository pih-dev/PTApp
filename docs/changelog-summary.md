# PTApp — What Changed and Why

A plain English summary of each version for anyone who wants the big picture without the code details.

---

## v2.3.1 — Bug Fix Round + Code Review (Apr 3, 2026)

**Timezone bug (toISOString → local helpers):** The app was using `toISOString()` to format dates in several places. This converts to UTC, so midnight in Beirut (UTC+3) becomes 9 PM the previous day. Result: the Clients month navigator jumped by 2 months instead of 1, the Schedule week strip could show wrong dates, and the "This Week" dashboard stat miscounted sessions. The `today()` function had already been fixed in an earlier version, but the same bug existed in 8 other places. All fixed now using new `localDateStr()` and `localMonthStr()` helpers.

**Code review — 11 fixes in one pass:** After the timezone fix, a comprehensive review of the entire codebase caught:
- Infinite recursion in GitHub sync on persistent 409 conflicts (now capped at 3 retries)
- Auto-complete firing N separate dispatches for N lapsed sessions (now batched into one)
- Status badges showing English labels even in Arabic mode (now uses i18n)
- Variable `t` (translation function) shadowed in .map()/.find() callbacks across every component
- GitHub sync firing on every tiny action (now debounced 1 second)
- RTL layout broken by inline `marginLeft` (changed to `marginInlineStart`)
- WhatsApp template "Reset to Defaults" not updating the visible textareas
- Unused imports removed

---

## v2.3 — Blue Accent, Warm Light Theme, Todo Checkboxes (Apr 3, 2026)

**Blue accent everywhere:** The entire app now uses a blue accent color in both dark and light themes. The old red accent is gone — buttons, toggles, selections, focus tags, nav highlights, and active states are all blue. Session type indicators use distinct colors (indigo for Strength, blue for Cardio, purple for Flexibility, etc.) but the UI chrome is consistently blue.

**Warm light theme:** The light theme background was toned down from harsh white to a warm cream/stone palette. Cards blend gently instead of popping with stark white-on-grey contrast. Much easier on the eyes in bright environments.

**Unified logo:** The dumbbell logo icon is the same blue in both themes for a consistent brand look.

**Header layout improved:** The Ar/En and Lit/Drk toggles are stacked vertically instead of side by side, giving the logo and app title more room. Both toggle rows have fixed-width buttons for clean alignment.

**Todo checkboxes:** The To Do list in the General panel now has checkboxes. Tap to mark an item as done — it turns green with a strikethrough. Done items stay visible until deleted. Tap the text to edit, tap the x to delete. Much easier than manually typing "Done" at the end of each item.

---

## v2.2 — Arabic, Light Theme, Editable WhatsApp Messages (Apr 3, 2026)

**Full Arabic support:** The Ar/En toggle in the header now switches the entire UI to Arabic — all labels, buttons, section titles, dates, and empty states. The layout flips to right-to-left (RTL). Session types and focus tags stay in English (the PT knows them that way). Dates use Arabic-Lebanon locale when in Arabic mode.

**Arabic WhatsApp messages:** Default booking and reminder message templates are now available in Arabic. When the language is set to Arabic, the default templates switch automatically. Custom templates (edited in General panel) override the defaults regardless of language.

**Editable WhatsApp templates:** Both the booking confirmation and reminder messages can now be customized from the General panel (⋮ menu → WhatsApp Messages). The PT can rewrite the messages however he wants using placeholders: `{name}`, `{type}`, `{emoji}`, `{date}`, `{time}`, `{duration}`. A "Reset to Defaults" button restores the originals.

**Light theme:** A Lit/Drk toggle in the header switches between the dark theme (default) and a new light theme — white background with blue accent color replacing red. Both theme and language preferences persist across sessions.

---

## v2.1 — Streamlined Workflow, Readability, Language Toggle (Apr 3, 2026)

**Confirmation removed:** The "Confirm" button and "Confirmed" status have been hidden everywhere — sessions go straight from Scheduled to Completed. The Confirmed stat card is gone from the Dashboard. The PT never used confirmation, so it was just clutter.

**Auto-complete lapsed sessions:** When a scheduled session's end time passes, it's automatically marked as completed. No more forgotten sessions stuck on "Scheduled" from yesterday. If a session needs cancelling, the Cancel option is still there.

**Completed sessions are editable:** In the Sessions tab, completed sessions now have tappable focus tags and an editable notes field — same as the Schedule and Dashboard views. Previously these were read-only after completion.

**Better readability:** All secondary text (labels, meta info, notes, placeholders) has been brightened for better visibility on the dark background. The app was hard to read in bright environments.

**Language toggle (Ar/En):** A small Ar/En pill toggle in the header, between the title and the ⋮ button. Defaults to English, persists across sessions. Arabic translations will be wired up in a future version.

**Editable todo list:** Todo items in the General panel can now be tapped to edit inline. Previously they could only be added or deleted.

---

## v2.0 — Nicknames, General Panel, Backup & Docs (Apr 2, 2026)

**Nicknames:** Clients now have a nickname field that auto-fills with their first name. The nickname is used in WhatsApp messages instead of the full name — "Hi Ahmad!" instead of "Hi Ahmad Khalil!". Existing client names were auto-capitalized and nicknames populated during migration.

**General panel (⋮ button):** The backup/restore section was moved out of the Clients tab and into its own panel, accessible from the ⋮ button in the header. The panel also includes links to the app's documentation (instructions and changelog) on GitHub.

**Backup improvements:** Four options now available — local Backup, Cloud Backup (GitHub snapshots), local Restore, and Cloud Restore. Restore always merges by ID: adds missing records without overwriting existing ones.

**Data schema v2:** Migration auto-capitalizes all existing client names and populates the nickname field with the first name.

---

## v1.9.2 — Restore Cancelled Sessions, Sessions Default to Scheduled (Apr 2, 2026)

Two fixes driven by real use:

**Restore cancelled sessions:** The PT accidentally cancelled Pierre's completed session that had notes and focus tags. Before, cancellation was permanent — data was preserved but there was no way back. Now cancelled sessions show a "↩ Restore" button (back to Scheduled) and a "✅ Complete" button (mark done directly). Available on both the Schedule tab and the Sessions tab. Notes and tags are never lost.

**Sessions tab defaults to Scheduled:** The Sessions tab now opens showing only scheduled sessions — what's coming up. Cancelled sessions are out of view by default. Tap "Cancelled" or "All" to see them.

---

## v1.9.1 — Offline Mode, Smarter Highlights, Client History (Apr 2, 2026)

A batch of quality-of-life improvements:

**Offline support:** The app now works without internet. A service worker caches the page after the first load, so the PT can open it even with no connection (common in Beirut). Google Fonts load non-blocking — if they don't load, the app uses system fonts and still looks fine.

**Current session glow:** The session card for whatever's happening right now gets a visible red glow — tinted background, red border, soft shadow. If multiple sessions run at the same time (group training), they all glow. The old 1px nearly-invisible border is gone.

**Sequential session numbers:** The #N on cards now means "this is the client's Nth session this month" — #1 for the first, #2 for the second, etc. Before, it showed the same total on every card which wasn't useful.

**Client session history:** Tap a client card on the Clients tab to expand it. Shows their sessions for the current month with a summary (total, completed, cancelled). Browse other months with < > arrows.

**Sessions tab cleanup:** Defaults to "Active" view (hides cancelled sessions). New "Active" filter button added alongside All, Scheduled, etc.

**Focus tags persist:** Switching a session type (Strength → Cardio → Strength) no longer wipes the focus tags. They're hidden when viewing a different type but come back when you switch back.

---

## v1.9 — Tap to Change Session Type (Apr 2, 2026)

Sometimes the PT books a session as "Strength" but switches to cardio or HIIT during the actual workout. Before, he'd have to open the Edit modal just to change the type.

Now the session type on each card is tappable — tap it, pick a new type from the dropdown, done. Focus tags automatically reset to match the new type (old tags like "Chest" don't make sense for a "Cardio" session). Notes stay untouched.

Works on both the Schedule tab and the Home tab (expanded view). One tap, everything adjusts.

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
