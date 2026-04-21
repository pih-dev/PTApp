# PTApp — Traps & Hard-Won Lessons

These are patterns that have caused real bugs. Read these before writing any code that touches the relevant area. CLAUDE.md keeps a one-line index pointing here.

---

## TRAP: `toISOString()` for dates (UTC conversion bug)
**What happened:** `toISOString()` converts to UTC. Midnight in Beirut (UTC+3) becomes 21:00 the previous day in UTC. Month navigation in Clients jumped Apr→Feb→Dec→Oct. The same bug also existed in Schedule week navigation, the "This Week" dashboard stat, and `createdAt` timestamps — it wasn't caught because the initial fix was only applied in one place.

**Rule:** NEVER use `toISOString()` to format dates for display or comparison. Always use the local helpers:
- `today()` → `YYYY-MM-DD` local date
- `localDateStr(d)` → `YYYY-MM-DD` from a Date object, local time
- `localMonthStr(d)` → `YYYY-MM` from a Date object, local time
- `currentMonth()` → `YYYY-MM` current month, local time

**Where it bit us:** `Clients.jsx` month navigation (3 places), `Schedule.jsx` week navigation (3 places), `Dashboard.jsx` "This Week" stat, `Schedule.jsx` `createdAt` field, `utils.js` `currentMonth()`.

**When fixing a bug, audit EVERY file for the same pattern.** The `today()` function was already fixed in a prior session but nobody checked the other 8 places that used `toISOString()`.

## TRAP: Variable shadowing of `t` (i18n function)
The `t()` function from `i18n.js` is used everywhere for translations. Callbacks must never use `t` as a parameter name — it silently shadows the i18n function. Fixed in v2.4 review — all instances renamed across utils.js and all components.

**Rule:** Never use `t` as a callback parameter. Use `stype` for session types, `tm` for times, `f` for focus tags, `tb` for tabs, `todo` for todo items.

## TRAP: `defaultValue` on uncontrolled inputs
Textareas using `defaultValue` won't re-render when state changes externally (e.g., cloud sync, template reset). The textarea keeps its internal DOM state until the component unmounts.

**Fix pattern:** Add a `key` prop tied to the state value to force remount when the underlying data changes. See General.jsx WhatsApp template textareas for the pattern.

## TRAP: Vite bundle corruption with string replacement
The `fixForFileProtocol` plugin in `vite.config.js` uses a function replacement (`() =>`). Never change this to a string replacement — `$&` in React's minified code will corrupt the bundle.

## TRAP: iPhone safe areas
Bottom elements need `env(safe-area-inset-bottom)`. Nav bar is z-index 100, modals must be 200+. Modal action buttons go in `modal-footer` (sticky), never in scrollable body. iOS keyboard shrinks `visualViewport` — modals handle this via resize listener.

## TRAP: iPhone reachability for top-of-screen controls
**What happened:** Ar/En and Lit/Drk toggles were in the top-right of the header. Worked fine on Pierre's Android but the PT (iPhone) couldn't reach them one-handed. Same problem with the × button on tall modals — unreachable at the top of a 90vh bottom sheet.

**Rule:** Anything tappable that should be reachable with a thumb must live in the bottom 60% of the screen. Move settings/toggles into the General panel (bottom sheet). For modals, provide swipe-down-to-dismiss AND a drag handle as a visual cue — the × button stays as a fallback but isn't the primary close method.

**Test on actual iPhone ergonomics, not just Android.** iPhones (especially Pro Max) are taller; top-corner controls that feel fine on a Samsung are out of reach. Pierre's dev phone is not the target device.

## TRAP: iOS Safari and `readOnly` textareas (keyboard won't show)
**What happened:** Session notes textareas were set `readOnly` by default, with an `onFocus` handler that set `e.target.readOnly = false` to make them editable on tap. Worked perfectly on Android. On iPhone, tapping notes never brought up the keyboard. The PT had this bug for an unknown period — discovered Apr 7, likely broken since notes were first added.

**Rule:** Never start a textarea/input as `readOnly` and try to remove it in `onFocus`. On iOS Safari, tapping a readonly field makes iOS decide "no keyboard" BEFORE the focus event fires. Setting `readOnly=false` in `onFocus` is too late — iOS has already decided. Focus fires, the field becomes editable in the DOM, but the keyboard never appears.

**Where it bit us:** `Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx` — all four files had the same copy-paste pattern for `.focus-notes` textareas. Fix: remove `readOnly` attribute and the readOnly manipulation in focus/blur handlers. Collapse/expand behavior is handled entirely by the `.editing` CSS class toggle, which still works without readOnly.

**Lesson:** "It works on my Android" is not a test for iOS-specific behavior. The PT is on iPhone and this was broken in his primary workflow (recording session notes). Always test form interactions on an actual iPhone before shipping, especially anything involving `readOnly`, `disabled`, `inputmode`, or touch events near form fields.

## TRAP: Swipe-to-dismiss vs content scrolling
**What happened:** Adding a swipe-down-to-close gesture to `Modal.jsx` initially conflicted with scrolling the modal body — swiping up to scroll then down would accidentally dismiss, and swipe-down-while-scrolled-mid-content was ambiguous.

**Rule:** Only initiate the dismiss drag when `modalBodyRef.current.scrollTop === 0`. Check at `touchstart`, not `touchmove`. This is the iOS bottom-sheet convention — user must scroll to the very top before swipe-down dismisses.

**Implementation details** (Modal.jsx):
- Use refs for drag state, never useState — gesture tracking at 60fps must not trigger React re-renders
- Use `transform: translateY()` not `top` — GPU-accelerated, smooth
- Resistance factor (0.7x) makes the drag feel natural, not 1:1 rubber
- Downward-only: clamp negative dy to 0
- Dismiss threshold: 80px, then animate to `translateY(100%)` before calling `onClose`
- Snap-back uses the same spring curve as the modal's open animation for consistency

## TRAP: Inline styles and RTL
Inline `marginLeft: 'auto'` doesn't flip in RTL mode. Use `marginInlineStart: 'auto'` instead. Similarly, use `borderInlineStart` not `borderLeft` for session card left borders. CSS class rules with `.theme-light` or `[dir="rtl"]` selectors DO flip correctly.

## TRAP: Using `state.sessions` from a closure right after `dispatch(ADD_SESSION)` — "Session #0" bug
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

## TRAP: v2→v3 migration dropped active overrides for calendar-month clients (Apr 21 2026)
**What happened:** Task 2 of v2.9 migrated every v2 client into a synthetic v3 package. The migration re-derived the "current legacy period start" to decide whether each client's v2 `overridePeriodStart` stamp was still active. But the re-derivation used `c.periodStart || today()` as the anchor and fed it to `computeSlidingWindow` — which is correct for the two "custom period" branches of v2 `getClientPeriod`, but WRONG for the default branch. v2's default (when both `periodStart` and `periodLength` are empty) returned calendar-month (1st to last), hardcoded, not sliding. For clients on the default, the override stamp was `YYYY-MM-01` while the migration computed `today()`-anchored day-of-month as the current-period start. They never matched. Every override on a calendar-month client was silently dropped.

**How it was caught:** Pre-deploy live-migration diff (`scripts/sanity/sanity-live-migration.mjs`) ran PT's real v2 export through `migrateData` and reported "pre: 2 active overrides, post: 0". Two real overrides (Pierre Ghorra delta:+1, Elie Jabbour delta:-4) were about to be lost on deploy.

**Why the unit tests missed it:** `scripts/sanity/sanity-migration.mjs` had four synthetic clients. A, C had explicit `periodStart`. D had `periodLength` but no `periodStart` (testing the today()-anchor branch). **None tested the v2 default — no periodStart, no periodLength, with an override.** 100% of the PT's real overrides were in that untested branch. Added Client E to cover it.

**Rule:** When migrating data from an old schema, re-read the OLD code exactly — don't trust design docs or memory. v2's `getClientPeriod` had three branches; the migration only faithfully reproduced two. Every branch of legacy logic needs a synthetic test fixture before deploy.

**Additional rule:** Before any migration deploys, run it against a live data export and diff active-state counts. Unit tests on synthetic fixtures are necessary but not sufficient — real data has shapes synthetic data doesn't cover.

**Pre-deploy migration gate:** `scripts/sanity/sanity-live-migration.mjs` is the permanent gate — **do not delete it** when cleaning up other sanity scripts. (Moved out of wipe-able `tmp/` in v2.9.3.) Workflow:
1. PT exports backup via General → Export backup
2. Pierre saves the export locally (do NOT commit — it contains real client data)
3. Copy it to `scripts/sanity/live-snapshot-vX.Y.json` (gitignored via `scripts/sanity/live-snapshot-*.json`)
4. Run `node scripts/sanity/sanity-live-migration.mjs` — script exits 1 on anomalies
5. After deploy, move the snapshot to `C:\projects\_archive\PTApp\migrations\YYYY-MM-DD-vX-to-vY-live-snapshot.json` for future forensic reference

**Where it bit us:** `src/utils.js` `migrateData` v2→v3 block. Fix: branch pkgStart computation to match v2's three cases exactly (periodStart → anchor at periodStart, periodLength-only → today(), neither → 1st of earliest session's month so calendar-month periods align). Override check then uses the same pkgStart → windows match v2 exactly.

## TRAP: Billing period gate field
**What happened:** The legacy `getClientPeriod` originally checked `!client.periodStart` to decide whether to use calendar month. But `periodStart` is a date input — hard to clear on mobile once set. When the PT changed the dropdown back to "Default (calendar month)", `periodLength` became `""` but `periodStart` still had a value, so the function treated it as a custom period.

**Rule (legacy v2 era):** `periodLength` is the master switch (not `periodStart`). When `periodLength` is falsy, return calendar month regardless of `periodStart`. **Note:** v2.9 removed the legacy gate entirely — periods now live inside `packages[]`. This trap stays documented in case any v2-era reasoning resurfaces during migration debugging.

## TRAP: iOS PWA standalone mode requires manifest + meta tag
**What happened:** Pierre's mother added the app to her iPhone Home Screen. Every time she opened it, Safari showed its URL bar at the bottom and the app asked for the token again — localStorage wasn't persisting between opens.

**Root cause:** The `index.html` lacked `<meta name="apple-mobile-web-app-capable" content="yes">` and a `manifest.json` with `"display": "standalone"`. Without these, iOS "Add to Home Screen" creates a Safari bookmark, not a standalone app. Each open is a new Safari context.

**Rule:** Any PWA targeting iOS must have BOTH:
1. `<meta name="apple-mobile-web-app-capable" content="yes">` in HTML head
2. A `manifest.json` with `"display": "standalone"` linked via `<link rel="manifest">`

**Deploy process:** `manifest.json` lives in `public/` (Vite copies to dist), and must be copied to gh-pages alongside index.html and sw.js.

**After deploying a manifest change:** Users must delete the old Home Screen icon and re-add from Safari for the new manifest to take effect. The PT's phone worked because he set up when standalone mode was cached; new setups need the manifest.

## TRAP: Silent `.catch(() => {})` in sync paths — "Hala Mouzanar" data loss (Apr 19 2026)
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

## TRAP: Single dispatches in loops
Auto-complete used to dispatch N separate `UPDATE_SESSION` actions for N lapsed sessions. Each dispatch triggers a re-render + a sync push. Now uses `BATCH_COMPLETE` to mark all in one dispatch. Apply the same pattern whenever you need to update multiple records.

## TRAP: Stale device overwriting remote sync data (DATA LOSS — Apr 13 2026)
**What happened:** Pierre's Android had localStorage frozen at an Apr 11 state (35 sessions). When he opened the app at the gym, `fetchRemoteData` may have failed silently. The sync effect's `[state]` dependency fired on first render, consuming the `skipSync.current = true` flag. Auto-complete then changed state, which triggered `debouncedSync` — pushing the stale 35-session data to GitHub, overwriting 40 sessions (5 sessions lost). PT's focus tags and notes were also never in remote (his pushes failed silently too). When PT reopened his PWA, `REPLACE_ALL` loaded the corrupted remote data and wiped his local data.

**Rule:** THREE guards must ALL pass before any push to GitHub (App.jsx sync effect):
1. `initialLoad` must be false (startup fetch is complete)
2. `syncReady.current` must be true (initial fetch SUCCEEDED — stays false on failure)
3. `skipSync.current` must be false (one-time skip for REPLACE_ALL echo)

**Never use `.catch(() => {})` on sync operations.** The debouncedSync status callback now surfaces errors to the UI via `syncStatus` state (green/blue/red indicator dot).

**`_lastModified` timestamp** is set by the reducer wrapper on every local change (not REPLACE_ALL). On startup, if local is newer than remote, local pushes up. If remote is newer, REPLACE_ALL replaces local. This prevents both stale-push AND stale-replace scenarios.

**Where it bit us:** App.jsx sync effect, debouncedSync `.catch(() => {})`, initial load REPLACE_ALL flow. All three had to be fixed together. See `docs/superpowers/specs/2026-04-13-sync-fix-design.md` for full forensic analysis.

## TRAP: Parser contract — `.type` not `.mode` (v2.8)
`parseSessionCountOverride` returns `{ type, value }`. Consumers MUST read `.type`, not `.mode`. The first v2.8 implementation pass used `.mode` and silently mis-read saved deltas — caught during static review.

## TRAP: Per-feature author-site drift — v2.9 inline override (Apr 21 2026, post-deploy review)
**What happened:** v2.9 moved override storage from the client root (`client.sessionCountOverride`) into the current package (`pkg.sessionCountOverride`), and the v2→v3 migration deletes the legacy root fields. The Clients-tab edit form was migrated correctly, but the **booking-confirm popup's inline pencil-editor in `Schedule.jsx`** was not — it kept reading and writing the legacy root fields. On every v3 client (which is every client now) the input opened blank and edits silently no-op'd. Same root pattern as the v2.8 `.mode/.type` bug — feature implemented across multiple author sites, only one updated.

**Rule:** When refactoring storage location, grep for EVERY read AND write of the old field name across the entire codebase. Don't trust the file you most recently touched. The fix is a one-character extra search before declaring a refactor complete.

**Where it bit us:** `Schedule.jsx:394-417` (commitOverride + openOverrideEdit). Fixed in v2.9.2 to mirror `Clients.jsx:71-101` — mutate current package, dispatch new packages[]. Sanity-reducer regression test added.

## TRAP: Architected behavior not propagated to every author site + missing from changelog (v2.9.4, 2026-04-21)
**What happened:** On 2026-04-02 (commit `eb29798`, "Preserve focus tags when switching session type") Pierre made a conscious product decision: switching a session's type (Strength→Cardio→Strength) must NOT wipe focus tags, because a single session can mix subcategories across types — the tags from other types just stay hidden until you switch back. The commit updated `Dashboard.jsx` and added a file-level comment explaining the intent. But Schedule's inline type-selector was written earlier with `focus: []` on type change, and nobody checked whether the same author site existed elsewhere. The decision was also **not recorded in `changelog-summary.md` / `changelog-technical.md`** — it survived only as a file comment and a commit message.

Three weeks later, during the v2.9.4 SessionCard-refactor brainstorm (2026-04-21), the divergence surfaced as "Schedule clears focus, Dashboard preserves them — looks like a bug or a pre-decision inconsistency." Pierre recognized it immediately as an architected-and-approved behavior that had simply missed Schedule and missed the changelog, so nothing in durable project memory could have reminded a reviewer that it was intentional-but-incomplete.

**Rule (two-part):**

1. **When committing an architected behavior decision, propagate it to every author site in the same commit.** Same pattern as the v2.8 `.mode/.type` trap and the v2.9.2 inline-override trap — this is the third instance of "one author site updated, others missed." The fix is a pre-commit grep for the old behavior/field/dispatch shape; don't trust the file you most recently touched.
2. **Every architected behavior decision lands in `changelog-summary.md` AND `changelog-technical.md`, not just a file comment.** File comments are easy to miss during review and can be mistaken for personal preference. The changelog is the durable record; if a behavior isn't in the changelog, a future reviewer (or Claude session) has no way to distinguish "intentional, approved" from "inconsistency / bug." Add a one-line entry at minimum.

**Where it bit us:** `Schedule.jsx:199-204` (focus-clearing dispatch). Fixed in v2.9.4 by removing `focus: []` from the dispatch payload and matching Dashboard's comment. The original 2026-04-02 decision is now recorded in `changelog-summary.md` + `changelog-technical.md` under v2.9.4.
