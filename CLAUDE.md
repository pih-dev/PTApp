# PTApp — Personal Trainer Client Management App

## Session Startup
- Always push to master AND deploy to gh-pages after every commit (see deploy section)
- Auto-push to GitHub after every commit — do not ask, just push
(Remote control, commit discipline, memory, and session management are in the global ~/.claude/CLAUDE.md)

## What This Project Is
A mobile-first web app for a personal trainer (the end user) to manage his gym clients. Developed by Pierre (pih-dev on GitHub). The PT uses the app on his iPhone; Pierre tests on his Android.

## Roles
- **Developer**: Pierre (pierreishere@gmail.com / GitHub: pih-dev). Builds and maintains the app.
- **End User**: Pierre's personal trainer. Uses the app daily to manage clients, schedule sessions, and send WhatsApp messages.

## Current Version: v2.6
- Bulletproof multi-device sync (Apr 19 Hala Mouzanar data loss fix)
  - Per-record `_modified` timestamps stamped by reducer on every add/edit
  - `mergeData()` union-by-ID merge: PT's fresher edits always win over stale devices
  - `pushRemoteData` merges on 409 conflict instead of blind-overwriting
  - All four silent `.catch(() => {})` in App.jsx replaced with proper error surfacing
  - Single `reconcile()` function for initial load + retry handler
- Debug panel shows v2.6

## Previous Version: v2.5
- Blue accent color (both themes)
- Light theme redesigned: deep steel blue background (#94A8C8→#788DB4), opaque white-blue cards, glossy frosted glass header/nav (rgba(30,64,175,0.15) + blur 28px + saturate 1.4), blue-tinted modals
- Dark theme: blue-tinted header/nav glass, nav buttons 0.75 opacity (readable), active tab #3B82F6, micro-polished with transitions, button press feel, spring modals
- Solid status badges (blue/green/red on white)
- Solid blue active filter tabs with smooth transitions
- Red delete buttons (solid, white icon)
- Card shadows for depth, cards push down on tap
- Nav active indicator dot (blue pill under active tab)
- Session notes blue hue (on focus + when has content)
- Haptic feedback on Android (vibrate on taps)
- Horizontal dumbbell logo (was vertical water-jug shape)
- Auto-complete 1hr after session end (was immediate)
- i18n (English + Arabic)
- Todo list with checkboxes in General panel
- Language/theme toggles live in General panel (moved from header Apr 7 for iPhone reachability)
- All modals have drag handle + swipe-down-to-dismiss gesture (Apr 7, standard bottom-sheet pattern)
- Sync status indicator (green dot = synced, blue pulse = syncing, red pulse = failed — tap to retry)
- Three-guard stale-push prevention with `_lastModified` timestamps (Apr 13 data loss fix)
- Debug panel (long-press ⋮): version, sync state, session/client count, token snippet
- PWA manifest + apple-mobile-web-app-capable for iOS standalone mode
- See `docs/design-system.md` for comprehensive visual design documentation

## Roadmap

### Stage 1 — Web app with cloud sync (CURRENT)
- Hosted on GitHub Pages: https://pih-dev.github.io/PTApp/
- Data synced to GitHub repo (makdissi-dev/ptapp-data) via GitHub API
- Both PT and Pierre see the same data
- PT bookmarks the URL on his iPhone, Pierre on Android

### Stage 2 — Native app (FUTURE)
- Wrap web app with Capacitor for iOS/Android native builds
- Publish to Apple App Store ($99/yr individual) and Google Play ($25 one-time)
- No company registration needed — individual developer accounts work
- Requires a final app name (not "PTApp")
- See `docs/stage2-publishing-guide.md` for full details (costs, liability, prerequisites)

## Core Features
- **Client Management**: Add/edit/delete clients with name, nickname, phone (with country code), gender, birthdate, and notes
- **Session Scheduling**: Book training sessions with type, date, time, duration. Multi-client booking supported.
- **Session Tracking**: Scheduled -> auto-completes when time passes (or manual Complete). Cancel with count/forgive.
- **Focus Tags & Notes**: Per-session muscle group tags + free-text notes for recording what was done
- **WhatsApp Messaging**: Booking confirmations and reminders via wa.me links. Templates editable by PT.
- **Dashboard**: Overview stats (clients, today, this week). Expanded view with full inline controls. Compact view for quick glance.
- **i18n**: Full Arabic/English toggle. RTL layout support. Arabic WhatsApp message templates.
- **Themes**: Dark (default) and light theme toggle. Blue accent, warm stone light palette.
- **Cloud Sync**: GitHub API sync to makdissi-dev/ptapp-data. Debounced (1s) pushes. Snapshots for backup.
- **Offline**: Service worker caches the app for offline use.
- **Todo List**: Shared todo in General panel with checkboxes (done/delete/edit).

## Tech Stack
- React 18 (with hooks: useState, useReducer, useEffect)
- Vite for dev server and build
- Pure CSS (no framework) — dark/light themes, mobile-first
- Google Fonts: DM Sans
- Service worker for offline support (network-first caching)
- No backend — all data in browser localStorage + GitHub API cloud sync

## Project Structure
```
PTApp/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite config
├── .gitattributes      # LF line ending normalization
├── CLAUDE.md           # This file
├── public/
│   ├── sw.js           # Service worker for offline support
│   └── manifest.json   # PWA manifest (standalone mode, icon, theme)
├── src/
│   ├── main.jsx        # React mount point + SW registration
│   ├── App.jsx         # Main app with routing/tabs, sync, auto-complete
│   ├── sync.js         # GitHub API sync (makdissi-dev/ptapp-data)
│   ├── i18n.js         # Translations (en/ar) + t() lookup + dateLocale()
│   ├── styles.css      # All styles (dark + light themes, ~710 lines)
│   ├── utils.js        # Helpers, constants, storage, reducer, date helpers
│   └── components/
│       ├── Dashboard.jsx    # Home tab: stats, today's sessions, expanded/compact
│       ├── Clients.jsx      # Client list, search, add/edit/delete, month history
│       ├── Schedule.jsx     # Week view, booking flow, day sessions
│       ├── Sessions.jsx     # All sessions log with filters
│       ├── General.jsx      # Backup, todos, WhatsApp templates, docs
│       ├── Modal.jsx        # Bottom-sheet modal wrapper
│       ├── Icons.jsx        # Shared SVG icon components (WhatsApp, Edit, Trash, etc.)
│       ├── CancelPrompt.jsx # Cancel session modal (count/forgive)
│       └── TokenSetup.jsx   # GitHub token setup (first-run)
└── docs/               # Versioned instructions, changelogs, guides
```

## Data Preservation Rules (CRITICAL)
- **NEVER delete or lose user data.** The PT's clients and sessions are real business records.
- **Backward compatible always.** When the data schema changes, write a migration in `utils.js` (`migrateData`) that upgrades old data to the new format. Never require the user to re-enter anything.
- **Version the data.** The `_dataVersion` field in the data tracks the schema version. Increment `DATA_VERSION` and add a migration step for each schema change.
- **Preserve history.** Even if a feature is removed, keep the data that was collected. Archive it under a different key if needed, but never drop it.
- **Test migrations.** Before deploying a schema change, verify that existing data (from the PT's live app) loads correctly in the new version.

---

## TRAPS & HARD-WON LESSONS

These are patterns that have caused real bugs. Read these before writing any code.

### TRAP: `toISOString()` for dates (UTC conversion bug)
**What happened:** `toISOString()` converts to UTC. Midnight in Beirut (UTC+3) becomes 21:00 the previous day in UTC. Month navigation in Clients jumped Apr→Feb→Dec→Oct. The same bug also existed in Schedule week navigation, the "This Week" dashboard stat, and `createdAt` timestamps — it wasn't caught because the initial fix was only applied in one place.

**Rule:** NEVER use `toISOString()` to format dates for display or comparison. Always use the local helpers:
- `today()` → `YYYY-MM-DD` local date
- `localDateStr(d)` → `YYYY-MM-DD` from a Date object, local time
- `localMonthStr(d)` → `YYYY-MM` from a Date object, local time
- `currentMonth()` → `YYYY-MM` current month, local time

**Where it bit us:** `Clients.jsx` month navigation (3 places), `Schedule.jsx` week navigation (3 places), `Dashboard.jsx` "This Week" stat, `Schedule.jsx` `createdAt` field, `utils.js` `currentMonth()`.

**When fixing a bug, audit EVERY file for the same pattern.** The `today()` function was already fixed in a prior session but nobody checked the other 8 places that used `toISOString()`.

### TRAP: Variable shadowing of `t` (i18n function)
The `t()` function from `i18n.js` is used everywhere for translations. Callbacks must never use `t` as a parameter name — it silently shadows the i18n function. **Fixed in v2.4 review** — all instances renamed across utils.js and all components.

**Rule:** Never use `t` as a callback parameter. Use `stype` for session types, `tm` for times, `f` for focus tags, `tb` for tabs, `todo` for todo items.

### TRAP: `defaultValue` on uncontrolled inputs
Textareas using `defaultValue` won't re-render when state changes externally (e.g., cloud sync, template reset). The textarea keeps its internal DOM state until the component unmounts.

**Fix pattern:** Add a `key` prop tied to the state value to force remount when the underlying data changes. See General.jsx WhatsApp template textareas for the pattern.

### TRAP: Vite bundle corruption with string replacement
The `fixForFileProtocol` plugin in `vite.config.js` uses a function replacement (`() =>`). Never change this to a string replacement — `$&` in React's minified code will corrupt the bundle.

### TRAP: iPhone safe areas
Bottom elements need `env(safe-area-inset-bottom)`. Nav bar is z-index 100, modals must be 200+. Modal action buttons go in `modal-footer` (sticky), never in scrollable body. iOS keyboard shrinks `visualViewport` — modals handle this via resize listener.

### TRAP: iPhone reachability for top-of-screen controls
**What happened:** Ar/En and Lit/Drk toggles were in the top-right of the header. Worked fine on Pierre's Android but the PT (iPhone) couldn't reach them one-handed. Same problem with the × button on tall modals — unreachable at the top of a 90vh bottom sheet.

**Rule:** Anything tappable that should be reachable with a thumb must live in the bottom 60% of the screen. Move settings/toggles into the General panel (bottom sheet). For modals, provide swipe-down-to-dismiss AND a drag handle as a visual cue — the × button stays as a fallback but isn't the primary close method.

**Test on actual iPhone ergonomics, not just Android.** iPhones (especially Pro Max) are taller; top-corner controls that feel fine on a Samsung are out of reach. Pierre's dev phone is not the target device.

### TRAP: iOS Safari and `readOnly` textareas (keyboard won't show)
**What happened:** Session notes textareas were set `readOnly` by default, with an `onFocus` handler that set `e.target.readOnly = false` to make them editable on tap. Worked perfectly on Android. On iPhone, tapping notes never brought up the keyboard. The PT had this bug for an unknown period — discovered Apr 7, likely broken since notes were first added.

**Rule:** Never start a textarea/input as `readOnly` and try to remove it in `onFocus`. On iOS Safari, tapping a readonly field makes iOS decide "no keyboard" BEFORE the focus event fires. Setting `readOnly=false` in `onFocus` is too late — iOS has already decided. Focus fires, the field becomes editable in the DOM, but the keyboard never appears.

**Where it bit us:** `Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx` — all four files had the same copy-paste pattern for `.focus-notes` textareas. Fix: remove `readOnly` attribute and the readOnly manipulation in focus/blur handlers. Collapse/expand behavior is handled entirely by the `.editing` CSS class toggle, which still works without readOnly.

**Lesson:** "It works on my Android" is not a test for iOS-specific behavior. The PT is on iPhone and this was broken in his primary workflow (recording session notes). Always test form interactions on an actual iPhone before shipping, especially anything involving `readOnly`, `disabled`, `inputmode`, or touch events near form fields.

### TRAP: Swipe-to-dismiss vs content scrolling
**What happened:** Adding a swipe-down-to-close gesture to `Modal.jsx` initially conflicted with scrolling the modal body — swiping up to scroll then down would accidentally dismiss, and swipe-down-while-scrolled-mid-content was ambiguous.

**Rule:** Only initiate the dismiss drag when `modalBodyRef.current.scrollTop === 0`. Check at `touchstart`, not `touchmove`. This is the iOS bottom-sheet convention — user must scroll to the very top before swipe-down dismisses.

**Implementation details** (Modal.jsx):
- Use refs for drag state, never useState — gesture tracking at 60fps must not trigger React re-renders
- Use `transform: translateY()` not `top` — GPU-accelerated, smooth
- Resistance factor (0.7x) makes the drag feel natural, not 1:1 rubber
- Downward-only: clamp negative dy to 0
- Dismiss threshold: 80px, then animate to `translateY(100%)` before calling `onClose`
- Snap-back uses the same spring curve as the modal's open animation for consistency

### TRAP: Inline styles and RTL
Inline `marginLeft: 'auto'` doesn't flip in RTL mode. Use `marginInlineStart: 'auto'` instead. Similarly, use `borderInlineStart` not `borderLeft` for session card left borders. CSS class rules with `.theme-light` or `[dir="rtl"]` selectors DO flip correctly.

### TRAP: Using `state.sessions` from a closure right after `dispatch(ADD_SESSION)` — "Session #0" bug
**What happened (Apr 19):** The PT booked a brand-new client's first-ever session. The confirmation modal's "Send WhatsApp" button fired `sendBookingWhatsApp(..., state.sessions)`. The message template rendered `Session #0` instead of `#1`. For the developer's own account, a cancelled-but-forgiven session caused a separate off-by-one in the PT's perception — that one was working as designed (the app counts sessions in the billing period, forgiven cancellations don't count).

**Root cause of the #0:** Schedule.jsx `saveSession` dispatches `ADD_SESSION` then immediately `setConfirmMsg`. React 18 batching normally makes `state.sessions` fresh by the time the modal's onClick runs — but real-world timing (StrictMode, fast taps, device variations) can produce a render where `confirmMsg` is set but the ADD hasn't reached the closure yet. `getSessionOrdinal` then calls `findIndex` on a stale array, returns `-1`, and `-1 + 1 = 0`.

**Rule:** Never rely on React's re-render to include a freshly-dispatched item in an array that's passed to a callback in the SAME event cycle. If you need the new item guaranteed present, merge it into a local copy at the call site:
```jsx
const sessions = state.sessions.some(s => s.id === session.id)
  ? state.sessions
  : [...state.sessions, session];
sendBookingWhatsApp(client, session, ..., sessions);
```

**Defense in depth:** `getSessionOrdinal` now returns `length + 1` (not `-1 + 1 = 0`) when the session isn't found in the filtered list. Future callers can't leak `#0` into user-facing text even if they forget the call-site merge.

**Where it bit us:** `Schedule.jsx:325-334` (booking modal onClick) and `utils.js:246-255` (`getSessionOrdinal` fallback). Reminder-path calls (Dashboard.jsx, Schedule.jsx reminder button) don't have this issue because they fire on sessions that already exist in state.

**Not platform-specific.** Works the same on iOS Safari, Android Chrome, and desktop. The timing window is small but reliably triggered by fast tapping during booking.

### TRAP: Billing period gate field
**What happened:** `getClientPeriod` originally checked `!client.periodStart` to decide whether to use calendar month. But `periodStart` is a date input — hard to clear on mobile once set. When the PT changed the dropdown back to "Default (calendar month)", `periodLength` became `""` but `periodStart` still had a value, so the function treated it as a custom period.

**Rule:** `periodLength` is the master switch. Gate on `!client.periodLength`, never on `periodStart`. When `periodLength` is falsy, return calendar month regardless of `periodStart`. The Clients.jsx form also auto-clears `periodStart` when the dropdown resets, but the function must not depend on that.

### TRAP: iOS PWA standalone mode requires manifest + meta tag
**What happened:** Pierre's mother added the app to her iPhone Home Screen. Every time she opened it, Safari showed its URL bar at the bottom and the app asked for the token again — localStorage wasn't persisting between opens.

**Root cause:** The `index.html` lacked `<meta name="apple-mobile-web-app-capable" content="yes">` and a `manifest.json` with `"display": "standalone"`. Without these, iOS "Add to Home Screen" creates a Safari bookmark, not a standalone app. Each open is a new Safari context.

**Rule:** Any PWA targeting iOS must have BOTH:
1. `<meta name="apple-mobile-web-app-capable" content="yes">` in HTML head
2. A `manifest.json` with `"display": "standalone"` linked via `<link rel="manifest">`

**Deploy process:** `manifest.json` lives in `public/` (Vite copies to dist), and must be copied to gh-pages alongside index.html and sw.js.

**After deploying a manifest change:** Users must delete the old Home Screen icon and re-add from Safari for the new manifest to take effect. The PT's phone worked because he set up when standalone mode was cached; new setups need the manifest.

### TRAP: Silent `.catch(() => {})` in sync paths — "Hala Mouzanar" data loss (Apr 19 2026)
**What happened:** PT booked Hala Mouzanar for Apr 17 at 10:00 on his iPhone. WhatsApp confirmation sent with "Session #3". Next morning the session was gone — not in the client's history, not in remote, not in any GitHub snapshot going back weeks. Same root pattern as the Apr 13 incident: a push silently failed, then another device's push overwrote remote without Hala, then REPLACE_ALL wiped the PT's local copy on next open.

**Root cause:** The Apr 13 fix only patched `debouncedSync`. Four more `.catch(() => {})` patterns were left alive in App.jsx:
- initial-load effect when local is newer than remote
- initial-load effect when remote is null
- handleRetrySync when local is newer
- handleRetrySync when remote is null

All four prematurely set `syncStatus = 'synced'` BEFORE the push promise resolved, then silently swallowed errors. Plus a second hazard: `pushRemoteData` on HTTP 409 blindly retried with local data, which can overwrite newer remote data that just arrived from another device.

**Rule:** Every path that calls `pushRemoteData` or `fetchRemoteData` must surface failures via `setSyncStatus('failed')`. NEVER set `'synced'` before the promise resolves. Use a single `reconcile()` function with a real try/catch, not scattered `.catch(() => {})`.

**Bulletproof sync (v2.6):** Replaced "timestamp wins" whole-state comparison with **per-record last-write-wins merge** by `_modified` timestamp. Reducer stamps `_modified` on every ADD_*/EDIT_*/UPDATE_*/TOGGLE_*/BATCH_COMPLETE. On initial load and 409 conflict, `mergeData(local, remote)` does union-by-ID — no record is ever blindly discarded. PT's freshly-edited record wins over a stale device's version because his `_modified` is newer.

**Why this bulletproofs the 3-device setup (PT iPhone, Pierre Android, mother iPhone):** Unstable Beirut internet means pushes fail often. A stale mother's phone that opens weeks late can't overwrite PT's data because (a) on open it merges-not-replaces, (b) any record PT has edited since has a newer `_modified` and wins.

**Deletes don't use tombstones.** If mother's phone has a client that PT deleted, the client resurrects on next sync. This is intentional — aligns with "NEVER lose user data". Rare, graceful failure mode; if it becomes a problem we can add tombstones later.

**Where it bit us:** `src/App.jsx` sync effect + retry handler (both rewritten to use `reconcile()`), `src/sync.js` `pushRemoteData` 409 handler (now merges instead of blind-retry), `src/utils.js` reducer (stamps `_modified`) + new `mergeData`/`dataEquals` helpers.

### TRAP: Single dispatches in loops
Auto-complete used to dispatch N separate `UPDATE_SESSION` actions for N lapsed sessions. Each dispatch triggers a re-render + a sync push. Now uses `BATCH_COMPLETE` to mark all in one dispatch. Apply the same pattern whenever you need to update multiple records.

### TRAP: Stale device overwriting remote sync data (DATA LOSS — Apr 13 2026)
**What happened:** Pierre's Android had localStorage frozen at an Apr 11 state (35 sessions). When he opened the app at the gym, `fetchRemoteData` may have failed silently. The sync effect's `[state]` dependency fired on first render, consuming the `skipSync.current = true` flag. Auto-complete then changed state, which triggered `debouncedSync` — pushing the stale 35-session data to GitHub, overwriting 40 sessions (5 sessions lost). PT's focus tags and notes were also never in remote (his pushes failed silently too). When PT reopened his PWA, `REPLACE_ALL` loaded the corrupted remote data and wiped his local data.

**Rule:** THREE guards must ALL pass before any push to GitHub (App.jsx sync effect):
1. `initialLoad` must be false (startup fetch is complete)
2. `syncReady.current` must be true (initial fetch SUCCEEDED — stays false on failure)
3. `skipSync.current` must be false (one-time skip for REPLACE_ALL echo)

**Never use `.catch(() => {})` on sync operations.** The debouncedSync status callback now surfaces errors to the UI via `syncStatus` state (green/blue/red indicator dot).

**`_lastModified` timestamp** is set by the reducer wrapper on every local change (not REPLACE_ALL). On startup, if local is newer than remote, local pushes up. If remote is newer, REPLACE_ALL replaces local. This prevents both stale-push AND stale-replace scenarios.

**Where it bit us:** App.jsx sync effect, debouncedSync `.catch(() => {})`, initial load REPLACE_ALL flow. All three had to be fixed together. See `docs/superpowers/specs/2026-04-13-sync-fix-design.md` for full forensic analysis.

---

## CODING CONVENTIONS

### Color system
- **Accent color**: `#2563EB` (blue) / `#60A5FA` (light blue). Used in both themes.
- **Error/danger**: `#EF4444` (red). Delete buttons are solid red with white icon. Cancel badge is red.
- **Success**: `#10B981` (green). Confirmed status badge, todo checkmarks.
- **Active session glow**: Amber `#F59E0B`. Sessions currently in progress get an amber tint, border, and glow (`card-now` class). Distinct from blue accent to signal "happening now" vs "selected."
- **Session type colors**: Indigo `#6366F1` (Strength), Blue `#3B82F6` (Cardio), Purple `#8B5CF6` (Flexibility), Amber `#F59E0B` (HIIT), Green `#10B981` (Recovery), Grey `#6B7280` (Custom).
- **Status badges**: Use CSS classes `badge-scheduled` (blue), `badge-completed` (blue), `badge-confirmed` (green), `badge-cancelled` (red). All solid fill with white text. Do NOT use inline `style={{ color, background }}` on badges — use `className={`badge badge-${status}`}`.
- **Filter tabs**: Active filter is solid blue `#2563EB` with white text. Inactive is subtle outline.
- **Light theme canvas**: Deep steel blue gradient `#94A8C8 → #788DB4`. Cards are opaque white-blue `rgba(210,228,255,0.55)`. Header/nav: glossy frosted glass `rgba(30,64,175,0.15)` with `blur(28px) saturate(1.4)`. Not bright — just lighter than dark.
- **Light theme text**: Indigo-tinted `#1E1B4B` (indigo-950) as base color. CSS vars use `rgba(30,27,75,...)` instead of `rgba(0,0,0,...)`. Logo gradient: `#1E1B4B` → `#3730A3`.
- **Dark theme nav**: Inactive buttons at `rgba(255,255,255,0.75)`, active tab `#3B82F6` (blue-500). Active dot matches.
- **Theme-aware CSS vars**: `--t1` to `--t5` for text opacity levels, `--sep` for separators. Dark theme uses `rgba(255,255,255,...)`, light theme uses `rgba(30,27,75,...)`. Use these in inline styles — never hardcode raw rgba values.
- **Card depth**: Cards have `box-shadow` in both themes. Light theme nav has top shadow.

### Status labels (i18n)
Use `getStatus(status, lang, t)` to get a translated status object with `label` for display text. Badge colors are handled by CSS classes (`badge-scheduled`, `badge-completed`, etc.) — don't use inline color/bg styles on badges. Components render: `<span className={`badge badge-${session.status}`}>{status.label}</span>`. The `STATUS_MAP` export still exists for backward compatibility but is not used in components.

### Sync
- Sync is debounced (1s) via `debouncedSync()` in App.jsx. Every state change saves to localStorage immediately but GitHub push waits 1s for more changes.
- `pushRemoteData` retries on 409 conflict up to 3 times. No infinite recursion.
- Sync errors are silently caught (`.catch(() => {})`). There is no sync status indicator yet.

### Reducer actions
| Action | Payload | Notes |
|--------|---------|-------|
| `ADD_CLIENT` | `{id, name, ...}` | |
| `EDIT_CLIENT` | `{id, ...fields}` | |
| `DELETE_CLIENT` | `clientId` | Also deletes all their sessions |
| `ADD_SESSION` | `{id, clientId, ...}` | |
| `UPDATE_SESSION` | `{id, ...fields}` | Merges fields |
| `BATCH_COMPLETE` | `[id, id, ...]` | Marks all as completed in one dispatch |
| `DELETE_SESSION` | `sessionId` | Not wired to any UI button yet |
| `ADD_TODO` | `{id, text, done}` | Always include `done: false` |
| `EDIT_TODO` | `{id, text}` | |
| `TOGGLE_TODO` | `todoId` | Flips done boolean |
| `DELETE_TODO` | `todoId` | |
| `SET_TEMPLATES` | `{booking?, reminder?}` | |
| `REPLACE_ALL` | `{clients, sessions, ...}` | Used by cloud sync |

---

## KNOWN ISSUES / TECH DEBT

These are identified but not yet fixed. Check before starting related work.

### Should fix soon
- **No error boundary** — If any component throws (e.g., corrupted localStorage), the entire app crashes to a white screen. A top-level error boundary would let the user access backup/export.

### Fixed in v2.5
- ~~No sync status indicator~~ — Green/blue/red dot in header. Failed state is tappable to retry. Errors surfaced to UI.
- ~~Silent sync errors~~ — `.catch(() => {})` replaced with status callbacks.
- ~~Stale device overwriting remote~~ — Three-guard sync protection + `_lastModified` timestamps.
- ~~iOS PWA not standalone~~ — Added `apple-mobile-web-app-capable` meta tag + `manifest.json`.

### Fixed in v2.4 review
- ~~`confirm()` for client delete~~ — Replaced with in-app modal (Clients.jsx `deletePrompt` state)
- ~~Hardcoded English strings~~ — TokenSetup.jsx fully i18n'd, `alert()` → notification state in General.jsx, "at" connector translated
- ~~Inline SVG duplication~~ — Extracted to shared `Icons.jsx` (WhatsAppIcon, EditIcon, TrashIcon, ClockIcon, PhoneIcon, ChevronIcon, CloseIcon)
- ~~Duplicated cancel prompt~~ — Extracted to shared `CancelPrompt.jsx` component
- ~~Variable shadowing of `t`~~ — All instances renamed across utils.js and all components

### Structural debt (address in a larger session)
- **Duplicated session card rendering** — Dashboard, Schedule, Sessions all render session cards independently (~50-80 lines each). A shared `SessionCard` component would eliminate this.
- ~~Stale closure in initial sync~~ — Fixed with `stateRef` (useRef tracking current state).

---

## REVIEW DISCIPLINE

### When to trigger a code review
After accumulating **3+ feature changes** or **any session longer than ~2 hours of coding**, pause and run a comprehensive review before continuing. The review should check:
1. **Pattern consistency** — Did a bug fix get applied everywhere the pattern exists? (The UTC bug was in 8 places but was only fixed in 1.)
2. **Variable shadowing** — Any new `.map()` or `.find()` callbacks using `t`, `d`, or other commonly imported names?
3. **Theme/RTL** — Any new inline styles that use `marginLeft`, `borderLeft`, or hardcoded colors?
4. **i18n** — Any new user-facing strings that aren't in `i18n.js`?
5. **Data safety** — Any new code that deletes, overwrites, or fails to migrate data?
6. **Sync impact** — Any new dispatches in loops that should be batched?

### Documentation after every change
Every commit should be followed by appropriate documentation:
- **Bug fixes**: Document the root cause, where it manifested, and the fix pattern in the TRAPS section above. Check if the same pattern exists elsewhere.
- **New features**: Update `docs/instructions-v{X}.md`, `docs/changelog-summary.md`, `docs/changelog-technical.md`.
- **Design decisions**: Add to Key Design Decisions or Coding Conventions above.
- **Incidents/lessons**: Save to memory for cross-session persistence.

---

## App Name
- "PTApp" is a working title, NOT the final name.
- A unique name is needed before publishing to Apple App Store / Google Play Store.
- The name must not be already taken or trademarked in the fitness/trainer app space.
- TODO: brainstorm and research a final name before the native app stage.

## Key Design Decisions
- Single-page app with bottom tab navigation (Home, Clients, Schedule, Sessions)
- WhatsApp integration uses `https://wa.me/{phone}?text={message}` — no API needed
- Phone numbers must include country code (e.g. +961 for Lebanon)
- Session types: Strength, Cardio, Flexibility, HIIT, Recovery, Custom
- Session statuses: Scheduled -> auto-completes -> Completed (or Cancelled with count/forgive)
- Blue accent color (`#2563EB`). Dark theme default. Warm stone light theme.
- Auto-complete: lapsed sessions are batch-marked completed on app load
- Sync: debounced 1s, retry up to 3 on conflict, errors silently caught
- UX simplicity is the priority — the PT adopted the app because it's simple. Don't add friction.
- Billing periods: `periodLength` is the master switch (not `periodStart`). When empty, calendar month is used regardless of any `periodStart` value. This ensures the dropdown "Default (calendar month)" is the single control needed to reset.

## How to Run (Development)
```bash
npm install
npm run dev
```

## How to Build, Verify, and Deploy
Every code change must go through this full pipeline — **never skip steps**:
```bash
# 1. Build
npm run build

# 2. Verify the bundle isn't corrupted (catches blank-page bugs)
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js

# 3. Bump version in App.jsx header (e.g. v2.3 → v2.4), rebuild if changed

# 4. Commit and push source to master
git add <files> && git commit -m "message" && git push origin master

# 5. Deploy built files to gh-pages (THIS IS WHAT MAKES IT LIVE)
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy vX.Y: description" && git push origin gh-pages
git checkout master

# 6. Tell Pierre the version number so he can verify on his phone
```

**Critical notes:**
- Pushing to `master` alone does NOT deploy. The live site serves from `gh-pages`.
- The `fixForFileProtocol` plugin in vite.config.js uses a function replacement (`() =>`). Never change this to a string replacement — `$&` in React's minified code will corrupt the bundle.
- The `vite-plugin-singlefile` plugin inlines all JS and CSS into one HTML file.
- Google Fonts (DM Sans) still loads from the internet — device needs connectivity.

## Sibling Projects

PTApp is the most mature web app in Pierre's project ecosystem. Its UI/UX patterns serve as reference for other projects:

- **Alerts** (`C:/projects/Alerts`) — Safety alert dashboard. References PTApp's design system (dark theme, mobile-first, RTL, vanilla JS, card layouts) but uses its own zone-colored design language for urgency.
- **HomeLab** (`C:/projects/HomeLab`) — Infrastructure/HA project. Has its own ticker overlay (HTML+JS on TV). No PTApp dependency.
- **Career** (`C:/projects/Career`) — Resume and job search. No PTApp dependency.
- **CCHealth** (`C:/projects/CCHealth`) — Meta/advisory project that monitors all projects including this one.
