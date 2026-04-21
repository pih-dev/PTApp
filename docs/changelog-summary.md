# PTApp — What Changed and Why

A plain English summary of each version for anyone who wants the big picture without the code details.

---

## v2.9.2 — Post-Deploy Review Fixes (Apr 21, 2026)

**v2.9 had a silent bug nobody noticed.** Right after v2.9 (contracts) and v2.9.1 (evening rolloff) shipped, Pierre ran a comprehensive code review — the kind he does after 3+ feature changes per the project rules. The reviewer flagged a critical bug: the booking-confirm pencil-editor (the small `✎` next to the session count in the booking success popup) was writing the override into the **old v2 storage location** that the v2→v3 migration deletes. Result: every time the PT typed a quick override from the booking popup, it got erased on the next app load. Silently. The Clients tab edit form path worked fine — only the booking popup was broken. Caught only because the review re-read both code paths side-by-side.

**Fixed by mirroring the working path** — the booking popup now writes the override into the package, same as Clients.jsx. Added a regression test so this can't come back.

**A second, smaller bug:** if two devices opened the renewal dialog at the same time and one confirmed first, the second device's Confirm tap silently did nothing — the dialog just closed. Now it shows an inline "already renewed by another device" warning and keeps the dialog open so the PT understands what happened.

**Performance smoothing:** the booking form was recomputing "is this client at their contract limit?" on every keystroke for every client × session combination. Now it's computed once per render and reused. Imperceptible on small data, but it scales with the PT's growing client list.

**Cleanup of small things that bug Pierre:**
- Removed an unused legacy helper (`getClientPeriod`) that was kept "for compatibility" — nothing was using it anymore.
- Replaced a brittle string-comparison for change detection with an explicit field check.
- Added a defensive guard for sessions that lack a time (legacy/imported records).
- Removed two `'9999-12-31'` sentinel values that were no longer needed (the underlying helper accepts `null` for "no upper bound").
- Made the audit log size visible in the debug panel so it can be observed approaching the 10k entry threshold.
- Translated the pencil button's accessibility label.

**CLAUDE.md slim-down.** Session-startup printed a warning: `⚠ Large CLAUDE.md will impact performance (40.8k chars > 40.0k)`. Pierre extracted the TRAPS section (the hard-won lessons list) into its own file (`docs/traps.md`) and collapsed older version histories into one-line pointers to their respective instruction docs. CLAUDE.md is now 19.5k characters — under the warning threshold, more focused on what's currently relevant. Two new TRAPS entries added: this incident's lesson ("when refactoring a storage location, grep EVERY read AND write across the whole codebase, not just the file you're in") and a parser-contract note from v2.8.

**No data migration. No new features. No schema change.** Pure cleanup and a critical bug fix that nobody had noticed.

---

## v2.9.1 — Evening Dashboard Cleanup (Apr 21, 2026)

**The evening view got crowded.** After v2.7 made the home screen show "Upcoming Sessions" (today's + future, no cancellations), the list worked great all day. But at night, when Pierre or the PT opens the app to peek at tomorrow's first session, they had to scroll past every session the PT already finished that day. Day-progress value in the morning, scroll-fatigue by dinnertime.

**v2.9.1 rolls off completed sessions 2 hours after their end time.** A session at 17:00–18:00 stays visible through 20:00; at 20:00+ it disappears from the Upcoming list. The Sessions tab still keeps the full history — only the home screen glance is trimmed. No-shows (sessions past their end time that are still marked `scheduled`) stay visible because they still need a decision (mark complete, cancel, or follow up).

**One filter change, nothing else.** No new settings, no data migration, no UI redesign. Both Expanded and Compact views on the home screen share the same list, so both benefit from the one change. Works on dark, light, and RTL the same way.

---

## v2.8 — Manual Session Count Override (Apr 20, 2026)

**The auto count was the only voice in the room.** The session count for each billing period was computed by looking at all scheduled + completed sessions dated inside the period. That's usually right — but when it's wrong, there was no clean way to correct it. If the PT's paper records said the client was on session 10 but the app said 12, his only options were destructive: book a retroactive fake session (pollutes history) or cancel-without-count an existing one (pollutes history). Both leave permanent record-keeping garbage.

**v2.8 adds a per-client manual override for the current billing period.** On the Clients tab → Edit, there's a new small field at the bottom of the form. Type a whole number (`10`) to set the count directly, or a signed number (`+1`, `-1`) to adjust the auto count. A live preview next to the field shows the result: `Auto 12 → 13`. Tap Save.

**You can also edit it right before sending a WhatsApp confirmation.** The booking success popup now shows the pair `#12 → 13` with a pencil (`✎`) next to it. Tap the pencil to change the override on the spot, then tap Send WhatsApp — the outgoing message uses the new value. No need to bounce to the Clients tab mid-booking.

**The override shows up everywhere the period count is shown.** Home tab session cards, Schedule day view, Sessions tab rows — all render `#12 → 13` instead of just `#12` when an override is active. Client chips in the booking popup show `(12→13)`. Every WhatsApp template with the `{number}` placeholder uses the effective value. The only place unchanged is the client list card itself, which shows the lifetime count (not period-scoped) — overrides don't apply there by design.

**It clears itself when the billing period rolls over.** The override is stamped with the period it was set in. When that period ends, the app just stops applying it — no cleanup job, no alert, no migration. The stored value sits inert in storage until the next save sweeps it out, so nothing is lost and there's no ceremony for the PT. If he wants the override to persist into the new period, he just re-enters it (takes a second).

**Small visibility polish alongside.** The session count text on client list cards was too dim in both themes — you had to squint. v2.8 bumps it up a notch so it's readable at a glance.

**Long-press the override field** (hold for 500ms) or right-click on desktop → a help popup appears explaining the syntax with a one-tap Clear button. Input validation handles `+0`/`-0` (null, no-op), non-numeric junk (null), and clamps negative results to zero.

**Two new optional client fields** (`sessionCountOverride`, `overridePeriodStart`). No data migration needed — pre-v2.8 clients load with both fields absent, which reads as "no override", which is the status quo. The fields ride the existing v2.6 per-record merge for sync, so overrides set on one device propagate cleanly without clobbering other edits.

---

## v2.7 — Upcoming Sessions on Home Screen (Apr 20, 2026)

**The home screen went blind at night.** The main section was labeled "Today's Sessions" and only showed sessions dated today. So at 8pm on Apr 19, a session booked for Apr 20 at 7am wasn't visible at all until midnight crossed. The PT couldn't glance at his home screen to see what tomorrow's morning looked like — he had to open the Schedule tab. Uncomfortable for a day-ahead workflow.

**Replaced with "Upcoming Sessions" — all future non-cancelled sessions, closest first.** The section title now shows "📅 Upcoming Sessions (N)" with the count in both Expanded and Compact views. Tomorrow's 7am session appears tonight, below today's remaining sessions. Sessions booked further out (next week, next month) appear below those. Today's completed sessions stay visible so the PT still sees his day-progress ("3 done, 2 to go"), but they roll off at midnight when they become "past". Cancelled sessions are hidden in both views.

**Each card shows its date.** Today's cards say "Today" under the time/type meta row. Future cards show the formatted date (e.g. "Apr 20"). A quick glance tells the PT which day a card belongs to without mental math.

**Compact view's old 5-session limit is gone.** Compact and Expanded now show the same list — the only difference is interaction style (Compact = tap for action sheet, Expanded = inline controls).

**What stays unchanged:** the three stat cards (Clients, Today, This Week) — "Today" still counts only today's sessions because that's a workload-density metric, not an action queue. The in-progress amber glow still fires on sessions currently running. The Compact/Expanded toggle still works. The Schedule and Sessions tabs are untouched.

**Small change, big day-to-day improvement.** ~20-line diff in `Dashboard.jsx` plus one new i18n key (`today` in en + ar). No data migration, no sync impact, no visual redesign.

---

## v2.6 — Bulletproof Multi-Device Sync (Apr 19, 2026)

**Second data loss — "Hala Mouzanar" session vanished.** The PT booked a new client, Hala Mouzanar, for a session on Apr 17 at 10:00. The WhatsApp confirmation went out (saying "Session #3"). The next day, the session was gone — not under her client history, not in remote on GitHub, not in any snapshot going back weeks. Same pattern as the Apr 13 incident: a push silently failed on one device, then another device pushed stale state that didn't include the session, and REPLACE_ALL wiped the original local copy on next open.

**Root cause was four more silent `.catch(() => {})` patterns** in App.jsx that the Apr 13 fix missed. Only `debouncedSync` was hardened then. The initial-load path and the retry-button handler still had the same "pretend it worked, swallow the error" pattern in four separate places. They also set the sync indicator to green (`synced`) BEFORE the push promise actually resolved — lying to the user.

**The real problem with "timestamp wins".** The Apr 13 fix used one `_lastModified` timestamp for the whole state. If mother's phone had an old state and then made any change, her timestamp became "newest" and she'd overwrite everyone's work — even records she had never seen. That's still a data-loss hazard.

**New approach: per-record last-write-wins merge.** Every session, client, and todo now carries its own `_modified` timestamp, stamped by the reducer on every add or edit. On sync, the app unions records by ID — if both sides have the same record, the one with the newer `_modified` wins. **No record is ever discarded** — the worst case is a "tie" where both sides keep their copy of a brand-new record. The PT's fresh edit on his iPhone will always win over mother's stale device because his timestamp is newer. This works even if pushes keep failing for hours — once any push gets through, all three devices converge on the same data.

**Why this is bulletproof for the 3-device setup** (PT iPhone, Pierre Android, mother iPhone, unstable Beirut internet): (1) mother's phone opening after weeks merges-not-replaces, so her stale data can't clobber PT's; (2) PT's fresh session from his iPhone is preserved through any combination of failed pushes, 409 conflicts, or cross-device races; (3) 409 conflicts in `pushRemoteData` now fetch remote, merge, and push merged — no more blind-overwrite of newer remote data; (4) every sync error is visible (red dot) — no more silent swallowing.

**Deletes trade safety for simplicity.** If mother's phone has a client PT deleted, the client will resurrect on next sync. Intentional — this aligns with the project's "never lose user data" rule. The PT can re-delete in a few taps; the alternative (blind deletion winning) could lose real business records.

**Hala's Apr 17 session was NOT auto-restored** by this fix — the data is gone from every snapshot. Pierre re-booked it manually.

---

## v2.5 — Sync Safety, Status Indicator, PWA Fix (Apr 13, 2026)

**Session #0 in WhatsApp fixed.** (Apr 19) The PT reported that booking a brand-new client's first session sent a WhatsApp message saying "Session #0" instead of "#1". Root cause: at the moment the user tapped "Send WhatsApp" right after booking, the React state hadn't finished updating to include the newly-dispatched session. `getSessionOrdinal` then called `findIndex` on a sessions array that didn't contain the new session yet, which returned `-1`, plus the `+1` gave `0`. Fixed in two places for safety: (1) the booking modal in Schedule.jsx now explicitly includes the new session in the list it passes to `sendBookingWhatsApp`, and (2) `getSessionOrdinal` itself falls back to `length + 1` when the session isn't found — treating it as if being appended. Either fix alone would solve it; both make it impossible to leak "#0" into a message. Not platform-specific — the timing quirk can happen on Android, iOS, or desktop.

**Data loss incident fixed.** On Apr 13, the PT lost all of today's sessions, focus tags, and notes. Root cause: Pierre's Android had stale localStorage from Apr 11. When he opened the app at the gym, the initial fetch to GitHub may have failed — but the failure was silently swallowed (`.catch(() => {})`). The auto-complete effect triggered a state change, which pushed the stale 35-session data to GitHub, overwriting the correct 40-session remote. When the PT reopened his PWA, it loaded the corrupted remote data via REPLACE_ALL, wiping his local data too.

**Three guards prevent stale pushes.** The sync effect now requires ALL three conditions before pushing to GitHub: (1) `initialLoad` must be complete, (2) `syncReady` ref must be true (only set when the initial fetch succeeds — stays false on failure), (3) `skipSync` ref must be false (one-time skip for the REPLACE_ALL echo). If the initial fetch fails, no push can happen — the data is safe in localStorage and the user sees a red indicator.

**Timestamp-based conflict resolution.** Every local change stamps `_lastModified` on the data (via a reducer wrapper). On startup, if local is newer than remote, local pushes up. If remote is newer, remote replaces local. This prevents both stale-push (Pierre's device) and stale-replace (PT's device) scenarios.

**Sync status indicator.** A colored dot in the header shows sync state: green = synced, blue pulse = syncing, red pulse = failed. Tapping the red dot retries. All silent `.catch(() => {})` on sync operations have been replaced with visible error handling.

**Debug panel.** Long-press the ⋮ menu button to toggle a diagnostic overlay showing: version, sync state, syncReady flag, session count, client count, last modified timestamp, and token snippet. Useful for troubleshooting without browser DevTools.

**Header simplified.** The version label was removed from the header — it was crammed against the ⋮ dots and barely visible on the PT's iPhone. Now the header right side shows just the sync dot and the ⋮ button, well-spaced. Version lives in the debug panel and the General panel.

**PWA standalone mode fixed.** The app was missing `apple-mobile-web-app-capable` meta tag and a `manifest.json`. Without these, iOS "Add to Home Screen" creates a Safari bookmark instead of a standalone app — the token doesn't persist between opens, and Safari's URL bar shows at the bottom. Pierre's mother hit this setting up the app on her iPhone. Fixed by adding the meta tag, a manifest with `display: standalone`, and an SVG dumbbell icon. The deploy process now copies `manifest.json` to gh-pages alongside `index.html` and `sw.js`.

---

## v2.4 — Visual Polish, Light Theme Redesign, Haptic Feedback (Apr 3–7, 2026)

**Client session count excludes cancelled.** (Apr 7) On the Clients tab, each card showed a total session count that included cancelled sessions — so it could say "5 sessions" while the expanded month view broke it down as "4 + 1 cancelled". Confusing. Now the header count excludes cancelled sessions, matching the PT's mental model (cancelled = "didn't happen") and matching the expanded breakdown.

**iOS keyboard not appearing on session notes.** (Apr 7) The PT (iPhone) reported tapping any session notes field didn't bring up the keyboard. Worked fine on Android. Two-layer bug: (1) the `Modal` component's new swipe-to-dismiss was using React's synthetic touch events at the document root, which interfered with iOS focus events near form fields, and (2) the `.focus-notes` textareas were starting as `readOnly` and removing it in `onFocus` — on iOS Safari, the keyboard decision is made BEFORE focus fires, so this pattern silently breaks the keyboard. Fix: switched Modal to native passive touch listeners with a tap-target dead zone, and removed `readOnly` from all four files (Dashboard, Schedule, Sessions, Clients). The collapse/expand styling still works via the `.editing` CSS class.

**iPhone reachability fix — toggles and modal close.** (Apr 7) On tall iPhones, the Ar/En and Lit/Drk toggles in the top-right of the header were impossible to reach one-handed, and the × button on the General panel was out of reach too. Fixed by moving both toggles into the General panel (top of the sheet, easy thumb reach) and adding a swipe-down-to-dismiss gesture with a visible drag handle to every modal. The header is now cleaner — just logo and the v2.4 ⋮ button. Swipe only activates when the modal content is scrolled to the top, so normal scrolling still works.

**Per-client billing periods.** (Apr 4) Session counts (#1, #2, #3...) and WhatsApp messages now follow each client's billing period instead of always resetting on the 1st of the month. By default nothing changes — it's still calendar month. But the PT can set a custom start date and period length (1 month, 4 weeks, 2 weeks, 1 week) per client. WhatsApp messages include `{number}` (session count) and `{periodEnd}` (period end date) placeholders. Switching the dropdown back to "Default" resets everything cleanly — even if the start date field still has a value, the app ignores it.

**Client session history is editable.** (Apr 4) In the Clients tab, expanding a client's session history now shows focus tags and notes — same as the Sessions tab. The PT can edit past sessions directly from the client view instead of hunting through the full session log.

**Active sessions glow amber now.** (Apr 4) Sessions currently in progress used to have a blue glow — same blue as everything else. Now they glow amber/yellow, which makes "happening right now" visually distinct from "selected" or "active UI element." Works in both dark and light themes.

**Glossier glass, punchier colors, readable text.** (Apr 4) The nav bar and header glass went more transparent with stronger blur — they feel frosted now instead of painted on. The three stat cards (Clients, Today, This Week) have more solid accent fills so the indigo/blue/green actually reads as color. All the small gray text across the app — "PERSONAL TRAINER," phone numbers, session counts, meta info, notes placeholders — got noticeably darker so nothing washes out on the blue canvas. The Ar/En and Lit/Drk toggle buttons have a visible background and border now, with darker inactive text so you can actually read both options.

**Code cleaned up under the hood.** (Apr 4) A comprehensive review caught and fixed: duplicate SVG icons extracted into a shared Icons module (7 icons, ~20 copies eliminated). The cancel session modal (count/forgive) was copy-pasted in two files — now it's one shared component. Native browser `confirm()` and `alert()` dialogs (which were English-only, ugly, and blocked the iOS thread) replaced with themed in-app modals and notification banners. The token setup screen was entirely English — now fully translated. The "at" connector between date and time was hardcoded English — now uses i18n. A variable shadowing bug (callback params named `t` silently hiding the translation function) was fixed in 8 places across 3 files. One RTL layout bug fixed (margin that didn't flip). Stat card colors that broke in light theme fixed by moving from inline styles to CSS classes. None of this changes how the app looks or behaves — it prevents future bugs and makes the code maintainable.

**Light theme feels like its own app now.** The background is a blue-toned gradient (the old beige clashed), cards are **soft blue** (not white — white was too harsh) with shadows that make them float, the header and nav bar are **stronger blue frosted glass** that frames the content, and modals are clean white overlays. Everything has clear visual layers — background (blue-grey) < cards (soft blue) < header/nav strips (stronger blue) < modals (white).

**Everything moves smoothly.** Cards, focus tags, filter buttons, badges, and week day pills all transition between states instead of snapping. The modal slides up with a spring bounce (slight overshoot that settles). Buttons darken and push inward on press. Tappable cards push down 1px. Small things, but the whole app feels more alive.

**Session notes glow blue.** When you tap into a notes field, it gets a blue tint (you're recording). When you type something and tap away, the blue stays — a visual signal that "this session has notes." Empty fields return to normal.

**You can feel the taps.** On Android, tapping nav tabs, focus tags, complete/cancel buttons, filters, delete buttons, and todo checkboxes triggers a 10ms vibration. Subtle tactile feedback that makes the app feel physical. iOS doesn't support this (Safari limitation), but the PT can try it on Pierre's phone.

**The logo is a dumbbell now.** The old icon (two tall rectangles connected by a bar) looked like a water jug. Replaced with a proper horizontal dumbbell — center bar with stacked weight plates on each side. Recognizable at any size.

**Sessions auto-complete 1 hour later.** Previously, sessions were marked completed the moment their end time passed. Now there's a 1-hour buffer — gives the PT time to cancel a no-show before the system marks it done. Sessions from previous days still complete immediately on app load.

**Dark theme header has a blue tint.** The header and nav bar both use a subtle blue-tinted glass instead of being transparent/near-black. They match each other and connect to the blue accent system. Previously they were indistinguishable from the dark background.

**Stat cards have a glow.** The three stat cards on the dashboard now have colored gradient tints (indigo for Clients, blue for Today, green for This Week) instead of being flat.

**Active tab dot.** A small blue dot appears under the active nav tab icon — an extra "you are here" signal beyond the color change.

**Pages bounce like rubber.** Scrolling past the top or bottom of any page triggers an elastic rubber-band effect — the content stretches slightly and springs back. Feels physical and premium, like a native app.

**Light theme deepened into a "blue theme."** (Apr 4) The background shifted from light blue-grey to a deeper steel blue gradient. Cards became opaque white-blue so they separate clearly from the canvas. Header and nav bars use darker blue glass that's more see-through. The theme no longer needs to be bright — just lighter than dark. Switching between themes doesn't hurt the eyes.

**Dark theme nav buttons are readable now.** (Apr 4) Inactive nav labels went from grey (0.55 opacity) to near-white (0.75). The active tab uses mid-blue #3B82F6 instead of the too-pale #60A5FA — strong enough to stand out against the page.

**Notes expand when you tap them.** Session notes show as a single collapsed line by default — the page scrolls freely over them. Tap a notes field and it smoothly expands downward (the session card and tags stay visible above), becomes scrollable for editing. Tap outside to collapse it back. No more accidentally scrolling notes when you meant to scroll the page.

---

## v2.3.2 — Visual Polish: Solid Badges, Indigo Light Theme, Depth (Apr 3, 2026)

**Light theme no longer bland:** The light theme got a personality upgrade. All text now has an indigo tint instead of plain black — headings, labels, meta text all carry a subtle purple-blue warmth. The logo gradient matches. Cards have soft shadows for a layered "3D" feel similar to the dark theme. The nav bar has a top shadow for visual separation.

**Status badges pop:** Scheduled and Completed badges are now solid blue with white text (both themes). Confirmed is solid green, Cancelled is solid red. The old "colored text on pastel background" approach washed out in light theme — these solid fills are visible everywhere.

**Filter tabs are clickable-looking:** The active filter tab (Active, All, Scheduled, etc.) is now solid blue with white text instead of a subtle blue outline. Makes it obvious which filter is selected.

**Delete buttons are unmistakable:** All trash/delete buttons across the app (Clients, Dashboard, Schedule) are now solid red with a white icon. Previously they were faint red outlines that blended into the background.

**Cards have depth:** Both themes now have subtle box-shadows on cards. The dark theme gets a deeper shadow, the light theme gets a softer one. Combined with the slightly more opaque card backgrounds in light theme, this creates the layered look that makes the dark theme feel "3D."

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

## v2.9 — Session Contracts & Package History

**Core:** Optional per-client contract size (default 10 when filled in); billing period extends past time window until contract is met; red "Renewal due" flag fires when hit; renewal via explicit button or auto-advance on next booking.

**Data model:** Every client now has `packages[]` — first-class history of past + current packages. Root `periodStart` / `periodLength` / override fields moved inside the current package. DATA_VERSION bumped 2→3, migration automatic and non-destructive.

**UI:** Edit form billing section rewrites period as unit+value, adds contract field, status line "Package #N · Session X/Y". Red state on Clients cards + Dashboard "Due for renewal" section + booking confirm banner. Shared RenewalModal used from both Clients and Dashboard.

**Forensics:** `state.auditLog[]` captures every package lifecycle event. Append-only, syncs via mergeById union. Inspect via exported backup.

**New doc:** `docs/app-health.md` — Feature Overhead Register tracks knobs on medium/heavy-path features (audit log, future accounting).
