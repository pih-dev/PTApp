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

## TRAP: Hardcoded date stamps in test fixtures rot silently (2026-05-02)
**What happened:** `scripts/sanity/sanity-migration.mjs` "Alice active override migrated" assertion passed when authored on 2026-04-21 and silently broke on 2026-05-02. Alice's fixture used `periodStart: '2026-03-02'` (anchor) + `periodLength: '1month'` + `overridePeriodStart: '2026-04-02'` (hardcoded). The migration's active-override check is `c.overridePeriodStart === computeSlidingWindow(pkgStart, unit, value, today()).start` — on 2026-04-21 the current sliding window started Apr 2 → match → override migrated → test passed. On 2026-05-02 the window rolled to May 2 → hardcoded Apr 2 stamp now stale → migration correctly drops it → test fails. The migration is right; the fixture rotted.

This wasn't caught immediately because the v2.9.5 release session ran on 2026-05-02, and the assertion failed during routine sanity, masquerading as a possible migration bug. Pierre recognized the symptom and confirmed root cause via the date math.

**Rule:** Test fixtures MUST NOT hardcode date stamps that have to match a value computed from `today()`. If the assertion involves "is this stamp still in the current window," compute the stamp at runtime from the same logic the production code uses. Otherwise, the test is a time bomb — it will pass for ~one period and break the moment the calendar advances, and the failure looks like a real bug rather than fixture rot.

The same pattern was already applied to Clients D and E in this file (lines 65-90 use `today()` + window arithmetic). Alice was the holdout because her assertion was authored at a time when the hardcoded stamp happened to match the current window.

**Where it bit us:** `scripts/sanity/sanity-migration.mjs:19, 107` (Alice fixture + assertion). Fixed by importing `computeSlidingWindow`, computing `aliceWindow.start` at runtime from the same anchor + unit + value the migration uses, and asserting against that value. Cara's stale stamp (line 36) is left hardcoded as `'2026-02-02'` because it just needs to be "not the current window" — fine as long as today is past Mar 2 of any year, which is the reality of a 2026-launched app.

**General principle:** When you need a "current period stamp" in a test, derive it from the same function the code under test will derive it from. When you need a "stale stamp," any sufficiently old hardcoded date is fine — but document why it'll never become "current" again.

## TRAP: Same number, two semantics, two adjacent screens — "Nayla (0) → #1" booking-chip confusion (2026-05-04)
**What happened:** The booking-form chip showed `Nayla Sfeir (0)` for a brand-new client. PT tapped Book Session, the confirmation popup said `#1`, the WhatsApp said "session 1". Three screens shown back-to-back, two different numbers next to the same name. The PT screenshotted the confusion three separate times over two weeks before Pierre debugged it; reading "(0)" he kept thinking "this booking is session zero" rather than "this client has zero sessions so far."

**Root cause:** Two helpers, two semantics:
- Booking-form chip used `getEffectiveClientCount(c, state.sessions)` → client's CURRENT period count (pre-action snapshot).
- Post-booking popup used `getEffectiveSessionCount(client, session, sessions)` with `sessions` augmented to include the just-created session → the new session's ORDINAL in its package (post-action result).

Both correct in isolation — they answer different questions. But the user can't see the question, only the parenthetical, so the same surface (a number next to a client's name) suddenly changing from 0 to 1 with no explanation reads as a glitch.

**Rule:** When a number, badge, or parenthetical appears on screen A (pre-action) and again on screen B (post-action) of the same flow, both surfaces MUST use the same semantics. Pre-action snapshot vs post-action ordinal are different things and must never share a visual slot. The cleanest fix is: use the post-action helper on the pre-action screen too, with a SIMULATED event (e.g. a preview session appended to a render-local array). The two screens are then identical by construction — no possibility of drift.

**Where it bit us:** `Schedule.jsx:295` (booking-form chip) shipped Apr 21 (v2.9.2) using the snapshot helper, while the popup at `:393` used the ordinal helper. Fixed in v2.9.6 by switching the chip to the ordinal helper with a preview session, plus a renewal-due short-circuit that mirrors `RENEW_PACKAGE`'s "fresh package, no override" outcome.

**Why this kept slipping past review:** Each helper read correctly when audited alone. The bug lives in the *transition* between screens — only visible when the two are stacked in the actual user flow. Lesson: when reviewing a flow, mentally screenshot every intermediate state and read the labels as the user would read them, with no helper-name knowledge.

## TRAP: Spread-into-arguments breaks at engine argument limits — toBase64 sync near-outage (2026-06-10)
**What happened:** `sync.js` encoded uploads with `btoa(String.fromCharCode(...new TextEncoder().encode(str)))`. The spread passes EVERY byte as a separate function argument. JS engines cap argument counts (iOS Safari/JSC ≈65,536; V8 fails somewhere past ~150K with a stack overflow). The PT's live data.json was already 110,864 bytes pretty-printed — one growth spurt away from every push throwing RangeError, i.e. a permanent sync outage on his iPhone, on the app's most critical path.

**Root cause:** `fn(...arr)` is O(arr.length) ARGUMENTS, not a stream. It works in tests with small fixtures and fails only in production once real data grows past an invisible, engine-specific threshold. Nothing in code review screams "size limit" — the line looks idiomatic.

**Rule:** Never spread an unbounded array into function arguments (`String.fromCharCode(...bytes)`, `Math.max(...hugeArr)`, `arr.push(...hugeArr)`). Chunk it (`for (i; i += 0x8000) String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))`) or loop/reduce. Audit every `...` whose operand scales with user data.

**Bonus from the same review:** the upload was pretty-printed (`JSON.stringify(data, null, 2)`) — machine-read files should be compact; the indent doubled every push over Beirut internet.

## TRAP: Renaming a catalog key silently kills every `|| CATALOG.oldKey` fallback (2026-06-10)
**What happened:** v2.9.5 renamed `FOCUS_TAGS.Custom` → `FOCUS_TAGS.Endurance`. Four components carried the copy-pasted fallback `FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom`. After the rename, `FOCUS_TAGS.Custom` was `undefined` — so the fallback that existed precisely to protect against unmapped types now GUARANTEED a `tags.map is not a function` white-screen for any unmapped type. The safety net became the crash. Latent for 5 weeks; found by 4 of 7 review angles independently.

**Root cause:** A fallback referencing a catalog key by name is invisible to the rename. Grepping for `'Custom'` during v2.9.5 found the catalog and the migration, but `FOCUS_TAGS.Custom` (property access, no quotes) didn't match the string search. Same class: 7 copies of `|| SESSION_TYPES[5]` — a POSITIONAL fallback that silently changes meaning if the array is ever reordered.

**Rule:** Fallbacks for catalog lookups live in ONE exported helper next to the catalog (`getFocusTags(type)` → `|| []`, `getSessionType(label)` → last entry), never inline at call sites. When renaming any exported key/constant, grep for the bare property access (`\.OldName\b`) in addition to the quoted string.

## TRAP: Merge paths must migrate foreign blobs — `_dataVersion` is per-BLOB, records travel (2026-06-10)
**What happened:** `mergeData` union-merged remote records and stamped the result `Math.max(local._dataVersion, remote._dataVersion)`; `mergeBackup` spread `{...live}` (inheriting `_dataVersion: 4`) and only migrated the MERGED result — a no-op. Consequence: records arriving from a device running an old cached bundle, or restored from an old backup file, entered live state in their OLD shape (clients without `packages[]`, `Arms` tags, `Custom` type) and — because the blob was already stamped v4 — `loadData`'s `migrateData` never touched them again. Frozen broken forever, including shapes that crash renders.

**Root cause:** `migrateData` is version-GATED (`if (v < 3) ...`) and `_dataVersion` describes the blob, not the records inside it. Any path that imports records from OUTSIDE the local blob (sync merge, 409 retry, backup restore, future import features) bypasses the only gate.

**Rule:** Every entry point where foreign records join local state must run `migrateData` on the FOREIGN blob by its OWN `_dataVersion` BEFORE merging. Migrate a clone if the caller still compares against the original reference afterward (reconcile() uses `dataEquals(merged, remote)` to decide whether to push — mutating `remote` in place would skip the push that upgrades the server). Covered by `scripts/sanity/sanity-merge-migration.mjs`.

## TRAP: A guard that can never fire — check the helper's contract at the call site (2026-06-10)
**What happened:** v2.9.2 added a pre-check to RenewalModal: `if (getCurrentPackage(client).end != null) showError(...)` to surface "another device already renewed while this modal was open." It was dead code twice over: (a) `getCurrentPackage` BY CONTRACT never returns a closed package (it returns a synthetic open default instead), so `.end != null` is unreachable on ANY input; (b) `client` was the prop snapshot captured at modal open — sync updates `state.clients`, never that snapshot. The guard shipped, was documented in the changelog as protection, and protected nothing for 7 weeks; the race it targeted would instead silently stack a duplicate renewal.

**Rule:** When writing a guard around a helper's return value, re-read the helper's full contract INCLUDING its fallback branches — a defensive helper that "never returns bad shapes" also never returns the bad shape your guard tests for. And in React, any "did the world change while this dialog was open" check must read LIVE state (pass `state.clients` down), never the props captured at open. Detect cross-device changes by comparing stable IDs (package id at open vs now), not by testing for states the data model normalizes away.


## TRAP: Synthetic fixtures model the data you DESIGNED; live data contains the data you SHIPPED (2026-06-10)
**What happened:** The v2.10.2 P1 fix (resolve the package containing a session's date) passed 26 synthetic assertions modeling clean renewals — closed package Mar 1–31, open package Apr 1+. Run against the archived live snapshot, it turned 4 of Elie Jabbour's sessions into `#7` nonsense: his real package array contains SIX packages sharing one start date, several "zero-day artifacts" (`end` = `start` − 1, from RENEW_PACKAGE accepting `start <= oldStart` — a known trap Pierre chose to leave in the data), overlapping closed ranges, an unreached gap week, AND an active override on one of the zero-day artifacts. The naive "first package with start <= date" resolver picked a zero-coverage package whose empty period triggered the `length+1` fallback, then the artifact's `+6` override inflated it.

**Root cause:** Fixtures are written from the schema's INTENDED shapes. Live data accumulates every shape the reducer ever ALLOWED, including ones produced by abandoned experiments and known-but-tolerated bugs. Date-resolution logic is exactly the kind of code whose edge cases are defined by the weirdest record in production, not by the schema.

**Rule:** Any change to the counting kernel, package/date resolution, or migration must be DIFFED against the archived live snapshot before commit (`_archive/PTApp/data-snapshots/`, `_archive/PTApp/incidents/`): compute the user-visible value (ordinals, counts, renewal flags) for every record under old and new code and explain every difference. Then encode the live data's pathological shapes as a permanent fixture (see the `messy` client in `sanity-historical-ordinals.mjs`). This extends the v2.9 "live-data diff before migration deploy" rule to DISPLAY logic: no schema change needed to corrupt what the user sees.

## TRAP: PowerShell 5.1 `Get-Content`/`Set-Content` round-trips mangle UTF-8 source files (2026-06-10, v2.10.3)
**What happened:** A PowerShell `-replace` pipeline was used during the v2.10.3 refactor to rename a symbol at 3 sites in `Schedule.jsx`. PS 5.1 read the file as **ANSI** (the system codepage — its default when no `-Encoding` is given) and re-wrote it as UTF-8, baking mojibake into every em-dash and emoji in the file. Caught immediately with an `â€` scan, reverted via git, re-applied with the Edit tool.

**Root cause:** Windows PowerShell 5.1 defaults to the ANSI codepage for BOTH `Get-Content` and `Set-Content`. A file that is valid UTF-8 on disk is therefore decoded wrong on read, and the wrong characters are then faithfully re-encoded on write — the corruption is silent, syntactically valid, and only visible in non-ASCII characters. PTApp source is full of them: em-dashes in comments, emoji in UI strings, and the entire Arabic half of `i18n.js` / `exerciseNamesAr.js`.

**Rule:** **Never round-trip a source file through PS5.1 `Get-Content`/`Set-Content`** — not for renames, not for "quick" bulk edits. Use the **Edit tool** for in-file changes. If a PowerShell pipeline is genuinely unavoidable, pass `-Encoding UTF8` explicitly on BOTH ends, and scan the result for `â€` / `Ã` before committing. Note the blast radius is worst on `i18n.js`, `exerciseNamesAr.js`, and anything containing Arabic — see also the subagent file-safety rule (value-level diffs for rich-content files).

## TRAP: The sync credential is infrastructure with an expiry date — and a generic error state hides its death (2026-07-07)
**What happened:** The GitHub fine-grained PAT that every device uses for cloud sync expired Jun 30 (created with a ~90-day default lifetime; nobody recorded the date). Every push/pull started returning 401. `sync.js` correctly threw `TOKEN_EXPIRED`, but `App.jsx` folded EVERY sync error into the same generic red dot, so an expired credential looked identical to bad hotel wifi — the PT lived with a red dot for a week and kept booking. Worse: there was NO UI to enter a new token. `TokenSetup` only renders when no token exists at all; `clearToken` was exported and never called. Even with a fresh token in hand, the only paths were "wipe site data" (destroys the stranded local records) or shipping a new app version mid-incident (what we did — v2.12.1). One week of bookings (+22 sessions, +1 client) sat stranded on one iPhone; recovered via v2.12.1's Update-token UI + the v2.6 per-record merge.

**Root cause (three layers):** (1) an external credential with a finite lifetime had no recorded expiry and no renewal reminder; (2) a semantically distinct, permanently-fatal error (401) was rendered identically to transient network errors, destroying the signal; (3) the credential-entry UI only existed for the empty-state, not the replacement-state — rotation was never designed for.

**Rule:** Every external credential gets its expiry recorded (CLAUDE.md + memory) the day it's created, with a renewal task well before the date. Errors that retrying can never fix (401/403) must surface differently from errors that retrying can fix — and must route the user to the remedy, not to a doomed retry. Every credential the app stores must have a replacement UI from day one; "re-setup" flows that require wiping state are data-loss traps in disguise. Current token: makdissi-dev "PTApp-sync-2026", expires **2027-07-06** — renew it in June 2027.

## TRAP: `mergeData`'s explicit key list silently drops unknown top-level collections (2026-07-13)
**What happened:** v2.12's `mergeData` builds its return value as an object literal naming each known collection (`clients`, `sessions`, `todos`, `evaluations`, `programs`, `auditLog`, `messageTemplates`, ...). That's correct for every device already running the code that lists the new key — but a device that has NOT reloaded past a schema-adding deploy is still executing the OLD cached bundle's OLD `mergeData`, whose object literal simply never mentions the new collection at all. If that stale device merges and pushes, its merged result has no `programs` key (or whatever collection was added) — the push stamps `_lastModified` newer and the field vanishes from remote, not because any line of the CURRENT code is wrong, but because the stale device isn't running current code.

**Why it self-heals (usually):** the next device that pushes while running the NEW bundle rebuilds `programs` via `mergeById(local.programs, remote.programs)` — remote is missing the key (`undefined`), local still has its records, so the union recovers everything local knows about. The exposure window is only "remote is stripped until a v2.13+ device pushes again."

**The actual danger:** if the ONLY device holding the new collection's records is also the one that goes stale-and-dies (crashes, gets reset, loses local storage) before a second v2.13+ push happens, there is no surviving copy to heal FROM — remote stays stripped permanently. This is the same shape as the Jun 10 stranded-sync incident, one layer up: that incident was a broken push path; this is a broken MERGE contract across app versions.

**Rule:** After any deploy that adds a new top-level collection, verify BOTH phones show the new version number in the debug panel before creating any record of the new type. Take a pre-deploy snapshot (`_archive/PTApp/data-snapshots/`) as a recovery point regardless — same precedent as the Jun 10 stranded-sync incident. Don't treat "the merge code looks right" as sufficient; the risk lives in devices that haven't loaded that code yet.

---

## Postgres RLS: `(select fn(row_column))` is NOT an initPlan — it runs per row

**Found:** 2026-08-21, while pricing the multi-tenant ancestry policy (decision doc
`docs/2026-08-21-multi-user-accounts-decision.md` §12). Caught by a verifier before any code existed
— nothing shipped with it, which is the only reason this is a trap entry and not an incident.

**The trap.** Supabase's RLS-performance guidance says to wrap function calls in `select` inside a
policy — `using ( (select private.can_reach(coach_id)) )` — so the planner runs them once as an
**initPlan** instead of once per row. It is easy to read that as "wrapping in `select` makes any
policy function cheap." It does not. The optimization applies **only when the result does not depend
on the row.**

- A function taking a **row column** as an argument becomes a **correlated SubPlan**: evaluated once
  per candidate row, exactly what the wrap was supposed to avoid.
- `security definer` SQL functions are **never inlined**, so each row pays a real function call plus
  whatever the function itself reads.
- The predicate looks optimized. There is no error, no warning, and at small row counts no visible
  slowness — it only shows up when the table grows.

**The rule.** Split the predicate so the expensive half takes no row input. Hoist the caller-side
value into an argument-less `stable security definer` function and compare it against a plain column
on the row:

```sql
-- per row: one function call        -> WRONG shape
using ( (select private.can_reach(coach_id)) )

-- per statement: one function call  -> RIGHT shape
using ( owner_path <@ (select private.my_path()) )
```

That usually means **denormalizing the owner-side key onto the row** (here, `owner_path` stamped on
`tenants` by trigger). The cost of the hoist is derived data that can go stale — so the write that
changes the source must update the denormalized copy **in the same transaction**.

**Two adjacent Supabase specifics found in the same check, both of which break silently:**

- 🔴 **`set search_path = ''` breaks any extension type or operator.** Supabase installs extensions
  into the `extensions` schema, so with an empty `search_path` neither `ltree` nor its `<@` operator
  resolves. Use `set search_path = 'extensions', 'public'`, or schema-qualify everything.
- **`ltree` labels accept hyphens only from Postgres 16** (relaxed specifically for UUID and base64
  ids). On PG 15 or older a UUID must have its hyphens stripped before it can be a label. **Check
  `server_version` on the actual instance** — do not assume either way from a doc page.

**The general shape, which is why this is worth remembering outside Postgres:** an optimization with
a precondition, quoted without its precondition, produces code that looks careful and performs like
code that wasn't. The tell is that the "fix" was applied without checking whether the condition it
requires — here, row-independence — actually held.

---

## Identity and the namespaced storage key (2026-08-21, `src/auth.js`)

**The trap:** `localStorage['ptapp-data']` was a single global store, which is correct for exactly
one identity and catastrophic for two. A second coach signs in on Elie's phone → the app boots
offline-first from localStorage → finds a populated store → and pushes **Elie's entire dataset into
the coach's tenant**. RLS authorises it happily: the data is correctly scoped to the wrong person.
Nothing crashes, nothing logs, and the first person to notice is Elie. That is the Apr-13 data loss
again with a brand-new cause.

**The rule:** signed in ⇒ the key is `ptapp-data:<userId>`, and **there is no fallback to the bare
key**. A new identity opens an empty app rather than inheriting whatever the phone was holding.
`saveData` refuses to write when identity changed since `loadData` ran (sign out → sign in as someone
else → one edit is the whole bug). Adopting the legacy store is `claimLegacyStore(expectedUserId)` —
the owner id is a **required argument**, because "is my namespace empty" is passed by every
first-time signer-in on the device. It *moves* the blob to `ptapp-data-preauth-backup`, which nothing
loads from: a live unauthenticated copy of Elie's records is otherwise one sign-out away from being
on screen.

**What it costs to get half-right:** `ErrorBoundary.jsx` kept two hardcoded `'ptapp-data'` strings
through the first draft — it cannot import `utils.js` by design, so a rename sweep of the storage
layer simply misses it. The crash screen would have handed the user someone else's blob and "reset" a
store nobody was using. This is the standing *grep EVERY read and write when moving a storage
location* rule, and `scripts/sanity/sanity-auth.mjs` now sweeps all of `src/` with a two-file
allowlist so the next person cannot repeat it.

## The auth gate is identity, never token validity

An expired session is **still signed in** — it shows a banner, never a login wall. A lapsed token
black-holing Elie's schedule in a gym with no signal ends multi-user, and it is also exactly what
Apple tests in Airplane Mode (4.2). `isSignedIn()` is deliberately true for `expired: true` sessions.

Two consequences that are easy to break:

- **`AUTH_OFFLINE` and `AUTH_EXPIRED` are different outcomes.** Unreachable server ⇒ keep the session
  untouched and retry later. Server *rejects* the refresh token ⇒ keep the session, mark it expired,
  route to password re-entry. Collapsing them is the Jun-30 stranded-token incident.
- **Sign-out clears the session and nothing else.** The blob stays at its namespaced key.

## GoTrue rotates refresh tokens — refresh must be single-flight

`refreshSession` originally captured the session before its `await` and wrote it back after. Two real
failures, both silent:

- **Sign out mid-flight** and the rejection **resurrects** the signed-out session — identity returns,
  and with it the storage key, so the next save lands in the previous user's store.
- **Two concurrent `getAccessToken()` calls**: refresh tokens rotate, so the loser presents a spent
  token, gets a 400, and overwrites the freshly valid session with a stale one marked expired. A
  perfectly healthy network, and the user is stuck re-entering a password.

Fix, and the pattern for anything else that writes shared state across an `await`: one module-level
in-flight promise, and **re-read the state inside the catch** — only act if what is stored is still
what you acted on.

## No social login, EVER (Guideline 4.8)

Own email/password is not a "third-party login service", so Sign in with Apple is never required.
The day anyone adds "Sign in with Google", SIWA becomes **mandatory** — and with OAuth come deep
links and the PKCE-verifier-lost-across-the-deep-link trap. There is no `signUp` export either;
accounts are provisioned in the Supabase console. `sanity-auth.mjs` asserts all of this statically,
because a grep is what will still be enforcing it in two years.


---

## The ordinal is live, and a forgiven cancel has none (P6, 2026-08-21)

**The band-aids.** React batches, so `state.X` read straight after `dispatch(ADD_X)` is stale — the
2026-04-19 bug that sent a client a WhatsApp message saying *"Session #0"*. The fix landed at four
call sites instead of one: a synthetic `__preview__` session id, hand-merged `[...state.sessions,
session]` arrays in two places, a threaded `sessions` parameter, and a `length + 1` guess inside
`getSessionOrdinal` for when `findIndex` returned −1. Four dressings on one wound, and every new
post-dispatch surface had to remember to apply its own.

**The guess was a wrong answer, not just inelegant.** `length + 1` assumes the missing session sorts
LAST. A session booked into a **past date inside the current period** does not — it belongs where
(date, time) puts it. The old code called it #4 where it was #2, and left every later session
showing a number it now shared.

**The rule:** `getSessionOrdinal(sessions, session, periodStart, periodEnd)` takes the **session
object**, not an id, and **projects** — it positions a session that is not in the array yet using the
same comparator `getClientCountedSessions` sorts by. Call sites pass `state.sessions` plainly. No
synthetic ids, no hand-merged arrays (which also missed the WeakMap cache and rebuilt the whole
per-client index for one number).

🔴 **And a forgiven cancel has NO ordinal — it returns `null`, and `SessionCountPair` renders
nothing.** `getClientCountedSessions` excludes a cancelled session the PT forgave, because it
consumes none of the client's paid sessions; the old fallback still printed a number for it,
whatever the next session's would be. **The archived live snapshot had 44 such badges** — e.g. "#11"
on a session that counts for zero. Projecting it positionally would have been a different wrong
answer. A cancel marked `cancelCounted` is an ordinary counted session and keeps its number.

**The live-diff is why this is known.** Synthetic fixtures model what you designed; live data holds
what shipped. The diff against `2026-08-21-pre-supabase-mirror.json` showed 44 changed ordinals and
**zero on a counted session** — that second number is the one that made the change safe to ship.
Script kept at `_archive/PTApp/migrations/2026-08-21-p6-ordinal-livediff.mjs`.

---

## TRAP: "Invented" test data can still reach real people (2026-08-21, v2.16.1)

**Symptom.** A closed-test tester opened SpotSet with the `DEMO` credential, tapped the WhatsApp
button on the seeded sample clients, and **landed in chats with real strangers.** Two or three of
the four demo numbers were somebody's actual line.

**Cause.** The demo phones were invented — by us. They were not *unassigned*. They used live
Lebanese mobile prefixes (`70`, `71`, `76`, `03`) with plausible bodies, which is exactly what a
real number looks like, because that is what makes fixture data feel real. The two properties are
in direct tension and nobody had separated them.

**Why it was worse than a one-off.** There is exactly ONE demo dataset, and it is shared by every
closed tester, Google's reviewer, Apple's reviewer, and every marketing-screenshot run. A defect in
it is aimed at all of them simultaneously, and at third parties who never opted into anything.

**The fix, and the fix that was rejected.** `openWhatsApp` now builds `https://wa.me/?text=…` — no
phone number at all — whenever `isDemo()` is true. WhatsApp opens, shows the fully composed message,
and asks the user to pick a recipient.

The obvious alternative was to seed **one real number** (the trainer's, or the developer's) into
every demo client, so a stray tap lands somewhere harmless. Rejected on two counts: it sends stray
messages to a working trainer mid-session from every curious tester, and — decisively — it
**hardcodes a personal mobile number into a PUBLIC repo, permanently.** `pih-dev/PTApp` is public
and the app ships as a single `index.html`; anything in the demo data is published, forever, to
anyone who views source.

**The rules this leaves behind.**
1. 🔴 **Fixture and demo data must not contain a routable contact of any kind** — phone, email,
   address. Not a real one, and not a plausible fake one, which is the same thing to a dialler.
2. 🔴 **A demo/review mode must not just be harmless to OUR data — it must be harmless to
   OUTSIDERS.** Every existing DEMO guard asked "can this reach Elie's records?" The answer was no,
   correctly, and the mode still reached strangers, because outbound contact was never on the list.
   When adding a mode, enumerate what it can *send*, not only what it can *read and write*.
3. **Never seed a real personal number to make a demo feel complete.** In a public repo it is
   published; in a private one it is still shared with everyone who installs the build.
4. **One choke point is what made this a one-line fix.** `openWhatsApp` had been the single place
   that builds a `wa.me` URL since v2.10.1 (three inline copies were collapsed into it). Had the
   three copies survived, this would have been three fixes and a fourth one missed.

**Gates.** `scripts/sanity/sanity-demo-whatsapp.mjs` runs the real `openWhatsApp` under a fake DOM
in three states and asserts each URL; it was made to fail on purpose before being trusted.
`sanity-backend-split.mjs` carries the structural half.

**Related move.** `TOKEN_KEY` / `DEMO_TOKEN` / `isDemo` had to move from `src/backend/githubDriver.js`
to `src/utils.js`: `openWhatsApp` lives in utils and needs demo-awareness, and the driver already
imports utils, so importing the driver back into utils would close an **import cycle**. utils is the
leaf both sides can share. 🔴 The driver re-exports both names — moving a storage key means grepping
every read and write of it, and leaving a second copy behind is how two definitions drift apart.

---

## TRAP: `letter-spacing` on Arabic destroys the word (2026-08-21, v2.18)

**What happened.** The design pass leans on condensed uppercase with `letter-spacing: .05–.18em`
for every label and name — the single strongest move away from the generated look. Applied
globally, that rule reaches the Arabic build too.

**Why it breaks.** Arabic is a *joined* script: letters connect to their neighbours, and the shape
of a letter depends on whether it is joining left, right, both or neither. Adding tracking pushes
those connected forms apart, so a word stops being a word and becomes a row of disconnected
glyphs. `text-transform: uppercase` is merely a no-op on Arabic — this one is actively destructive,
and it is invisible to anyone reviewing only the English screenshots.

**The rule.** Every rule that tracks or uppercases Latin is neutralised under `[dir="rtl"]`, in the
same block that introduces it, and the Arabic build carries the same hierarchy through **weight and
size**. See the `[dir="rtl"]` block at the end of the `THE PLATE AND THE BAR` section in
`src/styles.css`. A display face is also usually Latin-only (Saira has no Arabic), so RTL falls back
to `--font-body` there too — state it, do not let it happen by accident.

**Generalises to:** any future screen pass, and any bundled display face.

---

## TRAP: A `<select>` prints its chosen option's text onto your screen (2026-08-21, v2.18)

**What happened.** The Dashboard rebuild removed every emoji from the surface — and the inline
session-type selector still rendered `{stype.emoji} {stype.label}` in its `<option>`s. A closed
`<select>` displays the *selected option's text*, so the emoji the pass had just removed was drawn
straight back onto the screen by the control.

**The rule.** What an `<option>` contains is not "list content" — it is the control's own label
whenever the list is closed. Style and content decisions about a screen apply to option text.

**Where it bit:** `Dashboard.jsx` only; `Schedule.jsx` keeps the emoji deliberately, because that
screen has not had its pass yet.
