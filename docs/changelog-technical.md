# PTApp Changelog

Version history with context, decisions, and the reasoning behind each change.

---

## v2.2 — Arabic, Light Theme, Editable WhatsApp Messages (2026-04-03)

**What changed:**
- New `src/i18n.js` — ~100 translation keys in English and Arabic, `t(lang, key)` lookup function, `dateLocale(lang)` helper
- All components accept `lang` prop and use `t()` for all user-facing strings
- `dir="rtl"` applied to app container when Arabic selected
- `formatDate` and `formatDateLong` accept optional `lang` param for locale-aware dates (ar-LB / en-US)
- `DEFAULT_TEMPLATES` restructured to `{ en: { booking, reminder }, ar: { booking, reminder } }`
- `sendBookingWhatsApp` / `sendReminderWhatsApp` accept `lang` param to pick correct default template
- New `SET_TEMPLATES` reducer case + `messageTemplates` field in state (synced, backed up, merged)
- General.jsx: new "WhatsApp Messages" section with editable textareas for booking/reminder templates
- `borderLeft` replaced with `borderInlineStart` across all session card inline styles for RTL
- RTL CSS overrides: logo stays LTR (brand name), inputs/notes right-aligned, lang toggle margin flipped
- Light theme: `.theme-light` class on app-container, ~70 CSS overrides swapping dark→white bg and red→blue (#2563EB) accent
- Lit/Drk toggle in header, persisted to localStorage (`ptapp-theme`)

**Why — Full i18n:**
The PT's clients speak Arabic. WhatsApp messages in English feel out of place. Pierre requested Arabic notifications as a future item — the Ar/En toggle was already in place, so wiring translations was the natural next step. The `t()` function falls back to English if a key is missing, so adding Arabic can't break the English UI.

**Why — Editable templates:**
The WhatsApp messages were hardcoded by the developer. The PT should own his client communication — tone, emoji, wording. Storing templates in state means they sync between devices (PT's iPhone and Pierre's Android see the same messages).

**Why — Light theme:**
Some users prefer light themes, especially outdoors in bright light. The blue accent distinguishes it visually from the dark theme's red. Both preferences persist independently via localStorage.

**Files changed:** `src/i18n.js` (new), `src/App.jsx`, `src/utils.js`, `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.1 — Streamlined Workflow, Readability, Language Toggle (2026-04-03)

**What changed:**
- Removed "✓ Confirm" button from Schedule.jsx, Dashboard.jsx (expanded + action sheet)
- Removed "Confirmed" stat card from Dashboard overview (now 3 cards: Clients, Today, This Week)
- Removed `confirmed` from Sessions.jsx filter row
- Auto-complete: new `useEffect` in App.jsx marks scheduled/confirmed sessions as completed when their end time (start + duration) has passed
- Sessions.jsx: completed sessions now show `EditableFocus` component (tappable tags + notes textarea) instead of read-only display
- All text opacity bumped across CSS and inline JSX — values like 0.25→0.4, 0.3→0.5, 0.35→0.5, 0.4→0.55, 0.5→0.65
- Ar/En language toggle in App.jsx header — `lang` state persisted to localStorage (`ptapp-lang`)
- New `EDIT_TODO` reducer case in utils.js
- Todo items in General.jsx now editable inline (tap to switch to input, blur/Enter to save)

**Why — Remove confirmation:**
The PT never uses the Confirm step. Sessions go scheduled→completed in practice. Hiding it removes a button that adds friction without value. The `confirmed` status still exists in STATUS_MAP for backward compatibility with existing data.

**Why — Auto-complete:**
The PT doesn't bother tapping "Complete" after each session — he's busy training. Sessions from yesterday or earlier today were stuck on "Scheduled" indefinitely. Auto-completing when the session's end time passes makes the workflow organic. If a session needs cancelling, that option remains available.

**Why — Readability bump:**
The dark theme's secondary text was too faint (0.25–0.35 opacity) to read in bright environments like a gym. Systematic bump of all text opacity values while maintaining visual hierarchy.

**Files changed:** `src/App.jsx`, `src/utils.js`, `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.0 — Nicknames, General Panel, Backup & Docs (2026-04-02)

**What changed:**
- New `nickname` field on clients — auto-populated with first name, used in WhatsApp messages (`friendly(client)` helper)
- `capitalizeName()` utility capitalizes each word in a name
- Data schema v2: migration capitalizes existing names and populates nicknames
- New `General.jsx` component — modal panel with backup/restore and documentation links
- ⋮ button added to app header (next to version label) to open General panel
- Backup section removed from Clients.jsx — moved to General panel
- Documentation links point to versioned instructions and changelog on GitHub

**Why — Nicknames:**
WhatsApp messages used the client's full name ("Hi Ahmad Khalil!") which felt impersonal. The PT knows clients by first name. Auto-populating the nickname with the first name means zero extra work for the PT, but he can customize it if a client goes by something else.

**Why — General panel:**
The backup section in Clients felt out of place — it's not client-specific, it's app-wide. Moving it behind a ⋮ menu keeps Clients focused on client management. The panel also houses documentation links so the PT can find instructions without Pierre.

**Why — Name capitalization:**
The PT typed names inconsistently (some lowercase, some mixed). Auto-capitalizing on blur and migrating existing names ensures everything looks clean.

**Files changed:** `src/components/General.jsx` (new), `src/App.jsx`, `src/components/Clients.jsx`, `src/utils.js`

---

## v1.9.2 — Restore Cancelled Sessions (2026-04-02)

**What changed:**
- Cancelled sessions on Schedule tab now show "↩ Restore" button (sets status back to `scheduled`)
- Cancelled sessions on Sessions tab show both "↩ Restore" and "✅ Complete" buttons
- Sessions tab default filter changed from `active` to `scheduled`
- Sessions component now accepts `dispatch` prop (was read-only before)

**Why:**
The PT accidentally cancelled Pierre's session that was already completed with notes and focus tags. The data was preserved (cancellation doesn't delete anything) but there was no UI to undo it. Status changes were one-way: you could cancel but never un-cancel.

**Design decision:**
- Restore sets status to `scheduled` (not back to whatever it was before) — simplest approach, and the PT can then Confirm/Complete as normal
- "Complete" button offered directly on cancelled cards in Sessions tab — saves a step for the common case of "I cancelled this but it actually happened"
- Dashboard expanded view still filters out cancelled sessions (correct — they're not active today)
- Notes, focus tags, and all session data are fully preserved through cancel→restore

**Why default to Scheduled:**
Pierre requested it — the Sessions tab should show what's coming up, not everything. Cancelled sessions cluttering the default view was annoying.

---

## v1.9.1 — Offline Support, Session Highlight, Client History (2026-04-02)

**What changed:**
- Service worker (`public/sw.js`) caches the app for offline use. Network-first for HTML, caches fonts too.
- Google Fonts `<link>` made non-blocking with `media="print" onload="this.media='all'"` — app renders instantly without internet.
- Current session highlight upgraded from invisible 1px box-shadow to visible red tint + border + glow. Now highlights ALL concurrent sessions, not just the first (`findIndex` → `isNowSession` function).
- `#N` on session cards changed from total monthly count to sequential ordinal (1st, 2nd, 3rd session that month). New `getSessionOrdinal()` in utils.js.
- Focus tags no longer cleared on session type change — hidden when viewing different type, restored when switching back.
- Sessions tab defaults to "Active" filter (everything except cancelled). New "Active" button added.
- Client cards on Clients tab are expandable — tap to see monthly session history with month navigator, summary counts, and session list.
- `.gitattributes` added to normalize line endings to LF (silences CRLF warnings on Windows).

**Why — Offline:**
Internet connectivity in Beirut is unreliable. The PT needs the app to work when his connection drops. Service worker with network-first strategy means: online = fresh version, offline = cached version. Google Fonts degrade gracefully to system fonts.

**Why — Highlight:**
Pierre couldn't see the old highlight (1px at 30% opacity). Cranked it to `rgba(232,69,60,0.15)` background, `0.5` border, `20px` glow. Also fixed: `findIndex` only highlighted the first session at a given time, but group sessions mean multiple sessions run simultaneously.

**Why — Sequential #N:**
Showing "#3" on all three of a client's sessions was confusing. Now they show #1, #2, #3 in chronological order within the month. The booking chip still shows total count (context for "how many sessions so far").

**Why — Focus tag persistence:**
If the PT switches Strength → Cardio to try a tag, then switches back, the Strength tags were wiped. Data loss. Now tags are preserved — different type's tags are just hidden (the `focus` array isn't cleared on type change).

**Why — Client history:**
The PT wanted to see a client's sessions at a glance without switching to the Sessions tab and filtering. Tap the card, see the month, browse history.

**Files changed:** `public/sw.js` (new), `src/main.jsx`, `index.html`, `src/components/Dashboard.jsx`, `src/components/Clients.jsx`, `src/components/Sessions.jsx`, `src/components/Schedule.jsx`, `src/utils.js`, `src/styles.css`, `.gitattributes` (new)

---

## v1.9 — Inline Session Type Selector (2026-04-02)

**What changed:**
- Session type on cards (Schedule + Dashboard expanded view) is now a tappable `<select>` dropdown instead of static text
- Changing the type dispatches `UPDATE_SESSION` with the new type and `focus: []` (clears tags)
- Session notes (`sessionNotes`) are left untouched on type change
- New `.inline-type-select` CSS class makes the dropdown blend with the meta text line

**Why:**
The PT's next session was booked as "Strength" but he might switch to something else during the workout. Before this, changing the type required opening the Edit modal — unnecessary friction for a single-field change. Pierre proposed: tap the type, pick a new one, tags reset, notes stay. Flummox agreed ("one field, three behaviors").

**Implementation:**
- Replaced `{st.emoji} {session.type}` in the meta line with an inline `<select>` in both Schedule.jsx and Dashboard.jsx (expanded view)
- The `onChange` handler dispatches `UPDATE_SESSION` with `{ type: newValue, focus: [] }` — same auto-save pattern as focus tags
- Compact view and Sessions tab remain read-only (display contexts, not working contexts)
- No schema change — `type` is an existing field, `focus` is already an optional array

**No edge cases:** The `st` variable (session type lookup for color/emoji) re-derives from `session.type` on every render, so the card border color and emoji in the dropdown update instantly.

---

## v1.8 — Dashboard Expanded View (2026-04-02)

**What changed:**
- Home tab now defaults to "Expanded" view showing today's sessions with full inline controls: action buttons, focus tags, session notes
- Toggle button switches between Expanded (today's sessions, full cards) and Compact (upcoming 5, tap for action sheet)
- Current/next session gets a subtle red highlight border
- Auto-scroll was added then removed (see below)

**Why:**
Flummox raised a valid point: focus tags were only available on the Schedule tab. If the PT is mid-session on the Home tab and wants to tag what muscle group he's working, he'd have to navigate to Schedule — a dead end in his flow. Pierre agreed and proposed a toggle: expanded (full functionality) as default, compact (overview) as the alternative.

**The auto-scroll saga (Flummox vs. pragmatism):**
Initially added auto-scroll to center the current/next session on screen. Flummox hammered on it:
1. "What if sessions change? Scroll won't re-trigger" — True, but the dependency was `[expanded]` only
2. "New session drops in, highlight jumps, you're scrolled to the old one" — Technically correct
3. "Stale lock! Ticking bomb!" — Dramatic but the scenario requires sessions appearing while the PT stares at Home, which can't happen (single user, local storage)

Pierre's resolution: "Maybe just the highlight is enough?" — Correct. With 5-8 sessions per day, a glowing border is easy to spot. Auto-scroll removed. Less code, zero edge cases.

**Lesson:** Don't build solutions for problems that can't occur. The highlight alone does the job.

---

## v1.7 — Session Focus Tags & Notes (2026-04-02)

**What changed:**
- Tappable focus tags on each session card in Schedule (and now Dashboard expanded)
- Tags vary by session type:
  - Strength: Chest, Back, Shoulders, Arms, Legs, Core, Glutes, Full Body
  - Cardio: Running, Cycling, Rowing, Swimming, Jump Rope, Stairs
  - Flexibility: Stretching, Yoga, Mobility, Foam Rolling
  - HIIT: Upper Body, Lower Body, Full Body, Core, Tabata, Circuit
  - Recovery: Foam Rolling, Stretching, Ice Bath, Light Cardio, Massage
- Free text session notes field (saves on blur)
- Tags and notes show read-only in Sessions tab history

**Why:**
The PT needed to record what was done during sessions. "Strength" alone doesn't tell you if it was chest day or leg day. Pierre asked for subcategories — tappable for speed, varying by session type.

**Design decisions:**
- Tags auto-save on tap — no modal, no save button. One tap = saved. This aligns with the UX principle established in this session: the PT adopted the app because it's frictionless. Any extra step risks losing him.
- Notes field designed for future expansion — the PT can write "Bench press 3x10 80kg" and later we can parse it for detailed weight/rep tracking.
- Flummox worried about accidental taps without confirmation. Pierre's response: a mistap costs one tap to undo. A confirmation dialog costs every user every time. Simplicity wins.

---

## v1.6 — Time Grid, Monthly Count, Cancel Count/Forgive, Client Fields (2026-04-01)

**What changed:**
- Default session duration changed from 60 to 45 minutes
- Time picker replaced with a visual 4-column grid (was a `<select>` dropdown)
  - Occupied slots show red with client name
  - Still allows booking on occupied slots (group sessions, overlaps are the PT's call)
- Monthly session count (#N) shown on session cards and booking chips
- Cancel flow changed from delete to "Count or Forgive" prompt
- Gender and birthdate fields added to client profiles (optional)

**Why — Time grid:**
Pierre wanted conflict awareness when booking. Flummox flagged that iOS Safari ignores `<option>` styling — you can't color individual dropdown options on iPhone. Solution: replace the `<select>` with a tappable button grid. Same data, full styling control.

**Why — Monthly count:**
The PT gets paid a lump sum per month for a set number of sessions (typically 10). The counter tracks how many sessions each client has used. Shows on every session card so the PT always knows the tally.

**Why — Cancel count/forgive:**
Before v1.6, cancelling deleted the session entirely. Problem: if a client no-shows, the PT still needs that session to count against their monthly quota. Now cancelling keeps the record and asks:
- "Count" — no-show or late cancel, counts toward monthly total
- "Forgive" — legitimate cancel with proper notice, doesn't count

**Why — Default 45min:**
Pierre's PT does 45-minute sessions by default, not 60.

**Status workflow decision:**
Pierre raised a key question: what if the PT never taps Confirm or Complete? Sessions just sit at "Scheduled" forever. Decision: everything counts regardless of status. The only thing that reduces the count is a forgiven cancellation. Confirm/Complete are optional — may be simplified or removed later.

---

## v1.5 — Multi-Client Session Booking (2026-04-01)

**What changed:**
- Booking form now supports selecting multiple clients
- Client dropdown uses "add to list" pattern: pick a client, chip appears, dropdown resets
- Each chip has an X to remove; already-selected clients hidden from dropdown
- Book button shows count: "Book Session (3 clients)"
- Creates N independent sessions (one per client) — identical to booking separately
- WhatsApp confirmation cycles through clients one by one: (1/3), (2/3), (3/3)
- Edit mode stays single-client (each session is independent)

**Why:**
The PT sometimes trains multiple clients at the same time slot. Before this, he had to create each session individually with the same date/time/type — repetitive and slow. This is purely a workflow shortcut; the end result is identical to manual booking.

**Design decision — approach:**
Three approaches were considered:
1. **Multi-select in form (chosen)** — Single change point, zero schema changes
2. **"Book for another client" button after booking** — More taps, doesn't feel like one action
3. **Duplicate session action** — Useful but doesn't solve the original ask

**Design decision — UI:**
Pierre rejected the initial proposal of checkboxes/chips with a search filter. His feedback: "the current way works well, click button, add client. In multi, click the button again add another client." Keeping the existing dropdown and just adding chips was simpler and consistent with what the PT already knows.

**Data model:**
No schema change. Each session still has a single `clientId`. The multi-select is purely a UI convenience that dispatches `ADD_SESSION` N times.

---

## Pre-v1.5 — Foundation

The app existed before this changelog. Key facts:
- Single-page React app, Vite build, pure CSS dark theme
- GitHub Pages deployment (single HTML file via vite-plugin-singlefile)
- localStorage for data, WhatsApp via wa.me links
- Bottom tab navigation: Home, Clients, Schedule, Sessions
- The PT adopted the app immediately and booked all his clients through it from day one

---

## Principles Established

These emerged from the development process and guide future decisions:

1. **UX simplicity is the priority.** The PT adopted the app because it's simple and inviting. Every feature must pass the "does this add friction?" test. Auto-save, single-tap actions, minimal steps.

2. **Don't build for scenarios that can't happen.** Single user, local storage, single device. Don't add complexity for multi-user edge cases that don't exist yet.

3. **Ship and observe.** When unsure about a feature's placement or behavior, ship the simplest version and watch how the PT actually uses it. Real usage beats assumptions.

4. **Flummox is useful.** The octopus catches real issues (iOS dropdown styling, scroll edge cases) mixed with overthinking. Filter accordingly.

5. **Everything counts.** Sessions count toward the monthly total regardless of status. Only forgiven cancellations reduce the count. The PT won't consistently tap Confirm/Complete — don't depend on it.
