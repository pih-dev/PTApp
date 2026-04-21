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

## Current Version: v2.9.2
Post-deploy review fixes for the v2.9 contracts work. No schema change; bug + ergonomic fixes only.
- **Critical fix — `Schedule.jsx` inline override:** Booking-confirm pencil-editor was still writing the legacy v2 root fields (`client.sessionCountOverride` / `overridePeriodStart`) which the v2→v3 migration deletes. Override silently no-op'd on every v3 client. Now reads/writes `pkg.sessionCountOverride` like `Clients.jsx`. Sanity-reducer regression test added (`tmp/sanity-reducer.mjs`). Cause logged in `docs/traps.md` under "Per-feature author-site drift".
- **RenewalModal:** silently-no-op cross-device race surfaced — if the current package was already closed (e.g. another device renewed during the modal session), Confirm now shows an inline error and keeps the modal open.
- **Schedule renewal-due useMemo:** `isRenewalDue` was O(clients × sessions) per keystroke while the booking form was open. Now precomputed once per render into a Set; consumed by both the auto-advance loop and the renewal banner.
- **Sentinel `'9999-12-31'` removed:** `getPeriodSessionCount` already accepted `null` for "no upper bound"; both call sites now pass `null`.
- **JSON.stringify equality on overrides replaced** with explicit field comparator in `EDIT_CLIENT` audit logging — key-order independent.
- **Deprecated `getClientPeriod` shim deleted from `utils.js`** (no remaining callers in `src/`).
- **Dashboard Upcoming filter** gained a `!s.time` defensive guard + DST/edge-case comment.
- **Debug panel** now shows `auditLog.length` so the 10k revisit-trigger from `docs/app-health.md` is observable.
- **i18n:** new keys `editCount` and `renewalAlreadyClosed` (en + ar).
- **CLAUDE.md slim-down:** TRAPS extracted to `docs/traps.md`; older-version blocks reduced to one-line pointers.

## Previous Version: v2.9.1
Dashboard "Upcoming Sessions" filter rolls off completed sessions 2h past their end time. No-shows (past end, still `scheduled`) stay visible. One filter change in `Dashboard.jsx`. See `docs/instructions-v2.9.md` (combined v2.9 + v2.9.1 notes).

## Older Versions (one-line pointers — full details in `docs/instructions-v*.md`)
- **v2.9** — Per-client session contracts. `client.packages: Array<Package>`, current open package = `packages[packages.length - 1]` with `end: null`. Optional `contractSize` triggers red renewal-due state + Dashboard "Due for renewal (N)" section. Two renewal paths: explicit (`RenewalModal.jsx`) + auto-advance on booking (`RENEW_PACKAGE` dispatched before `ADD_SESSION`). New top-level `state.auditLog` (append-only forensic log). Migration v2→v3 in `migrateData`. New utils: `computeSlidingWindow`, `getCurrentPackage`, `getEffectivePeriod`, `isRenewalDue`. WhatsApp placeholder `{packageProgress}` ("7/10" for contract packages).
- **v2.8** — Per-client manual session count override (absolute or delta) authored in Clients edit form + booking-confirm pencil. Stored in package via v2.9. Long-press / right-click opens help popup. Parser contract: `parseSessionCountOverride` returns `{ type, value }`.
- **v2.7** — Dashboard renamed "Today's Sessions" → "Upcoming Sessions". Single filter, both Expanded + Compact iterate the same array.
- **v2.6** — Bulletproof multi-device sync. Per-record `_modified` timestamps; `mergeData` union-by-ID; `pushRemoteData` merges on 409 instead of blind-overwriting; `reconcile()` for initial load + retry handler. Apr 19 Hala Mouzanar data loss fix.
- **v2.5** — Blue accent color, redesigned light theme, sync status indicator, three-guard stale-push prevention, iOS PWA standalone (`apple-mobile-web-app-capable` + `manifest.json`), debug panel. Apr 13 data loss fix. See `docs/design-system.md` for visual design.
- **v2.4** — i18n + RTL, dark/light themes, todo list, swipe-to-dismiss modals, language/theme toggles moved to General panel for iPhone reachability.

## Roadmap

### Stage 1 — Web app with cloud sync (CURRENT)
- Hosted on GitHub Pages: https://pih-dev.github.io/PTApp/
- Data synced to GitHub repo (makdissi-dev/ptapp-data) via GitHub API
- Both PT and Pierre see the same data
- PT bookmarks the URL on his iPhone, Pierre on Android

### Stage 2 — Native app (FUTURE)
- Wrap web app with Capacitor for iOS/Android native builds
- Publish to Apple App Store ($99/yr individual) and Google Play ($25 one-time)
- Requires a final app name (not "PTApp")
- See `docs/stage2-publishing-guide.md` for full details

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
- React 18 (with hooks: useState, useReducer, useEffect, useMemo)
- Vite for dev server and build (vite-plugin-singlefile inlines all JS/CSS into one HTML file)
- Pure CSS (no framework) — dark/light themes, mobile-first
- Google Fonts: DM Sans (loads from internet — device needs connectivity)
- Service worker for offline support (network-first caching)
- No backend — all data in browser localStorage + GitHub API cloud sync

## Project Structure
```
PTApp/
├── index.html, package.json, vite.config.js, .gitattributes, CLAUDE.md
├── public/                   # sw.js, manifest.json (Vite copies to dist)
├── src/
│   ├── main.jsx              # React mount point + SW registration
│   ├── App.jsx               # Routing/tabs, sync, auto-complete, debug panel
│   ├── sync.js               # GitHub API sync (makdissi-dev/ptapp-data)
│   ├── i18n.js               # Translations (en/ar) + t() lookup + dateLocale()
│   ├── styles.css            # All styles (dark + light themes)
│   ├── utils.js              # Helpers, constants, storage, reducer, date helpers
│   └── components/
│       ├── Dashboard.jsx, Clients.jsx, Schedule.jsx, Sessions.jsx, General.jsx
│       ├── Modal.jsx         # Bottom-sheet modal wrapper
│       ├── Icons.jsx         # Shared SVG icons
│       ├── CancelPrompt.jsx  # Cancel session modal
│       ├── TokenSetup.jsx    # GitHub token first-run
│       ├── RenewalModal.jsx  # Shared renewal dialog (Clients + Dashboard)
│       ├── SessionCountPair.jsx, OverrideHelpPopup.jsx
└── docs/
    ├── traps.md              # Hard-won lessons / TRAPS (extracted from CLAUDE.md)
    ├── app-health.md         # Feature Overhead Register
    ├── design-system.md      # Visual design reference
    ├── instructions-v*.md    # Per-version feature notes
    ├── changelog-summary.md, changelog-technical.md
    └── superpowers/          # Plans + specs from feature work
```

## Data Preservation Rules (CRITICAL)
- **NEVER delete or lose user data.** The PT's clients and sessions are real business records.
- **Backward compatible always.** When the data schema changes, write a migration in `utils.js` (`migrateData`) that upgrades old data to the new format. Never require the user to re-enter anything.
- **Version the data.** The `_dataVersion` field in the data tracks the schema version. Increment `DATA_VERSION` and add a migration step for each schema change.
- **Preserve history.** Even if a feature is removed, keep the data that was collected. Archive it under a different key if needed, but never drop it.
- **Test migrations.** Before deploying a schema change, run `tmp/sanity-live-migration.mjs` against the PT's real exported data — synthetic fixtures are necessary but not sufficient. (See `docs/traps.md` "v2→v3 migration dropped active overrides".)

---

## TRAPS

Full hard-won lessons live in **`docs/traps.md`** — read before touching the relevant area. One-line index:

- **`toISOString()` UTC bug** — never use for display/comparison; use local helpers (`today`, `localDateStr`, `localMonthStr`, `currentMonth`).
- **Variable shadowing of `t`** — never use `t` as a `.map`/`.find` callback param.
- **`defaultValue` on uncontrolled inputs** — add `key` prop tied to state value to force remount on external changes.
- **Vite bundle corruption** — `fixForFileProtocol` plugin must use function replacement; string replacement breaks React's minified `$&`.
- **iPhone safe areas** — `env(safe-area-inset-bottom)`; modal z-index 200+; sticky `modal-footer`; visualViewport resize.
- **iPhone reachability** — tap targets in bottom 60%; settings live in General panel, not header. Test iPhone ergonomics, not Android.
- **iOS Safari `readOnly` textareas** — never start `readOnly` and remove in `onFocus`; keyboard never appears.
- **Swipe-to-dismiss vs scrolling** — only initiate dismiss drag when `scrollTop === 0` at touchstart.
- **Inline styles + RTL** — use `marginInlineStart`/`borderInlineStart`, never `marginLeft`/`borderLeft`.
- **`state.X` after `dispatch(ADD_X)` in same handler** — Session #0 bug; merge new item into local copy at call site.
- **v2→v3 migration override-drop (Apr 21)** — re-read OLD code exactly when migrating; live-data diff before every migration deploy.
- **Billing period gate field (legacy v2)** — `periodLength` was the master switch (not `periodStart`). v2.9 removed the gate; trap retained for migration debugging.
- **iOS PWA standalone** — needs both `apple-mobile-web-app-capable` meta tag AND `manifest.json` with `"display": "standalone"`. Old icons need re-add.
- **Silent `.catch(() => {})` in sync** — Hala Mouzanar data loss; every sync path must surface failures via `setSyncStatus('failed')`.
- **Single dispatches in loops** — use `BATCH_COMPLETE` pattern; one dispatch per N records, not N dispatches.
- **Stale device overwriting remote (Apr 13)** — three guards (`initialLoad`, `syncReady`, `skipSync`) must all pass before push.
- **Parser contract `.type` not `.mode`** — `parseSessionCountOverride` returns `{ type, value }`.
- **Per-feature author-site drift (Apr 21 v2.9.2)** — when refactoring storage location, grep EVERY read+write of old field across the whole codebase, not just the file you're in.

---

## CODING CONVENTIONS

### Color system
- **Accent**: `#2563EB` (blue) / `#60A5FA` (light blue). Both themes.
- **Error/danger**: `#EF4444` (red). Solid red delete buttons. Cancelled badge red.
- **Success**: `#10B981` (green). Confirmed badge, todo checkmarks.
- **Active session glow**: Amber `#F59E0B` (`card-now` class).
- **Session type colors**: Indigo (Strength), Blue (Cardio), Purple (Flexibility), Amber (HIIT), Green (Recovery), Grey (Custom).
- **Status badges**: CSS classes `badge-scheduled` (blue), `badge-completed` (blue), `badge-confirmed` (green), `badge-cancelled` (red). Solid fill, white text. NEVER inline `style={{ color, background }}` — use `className={`badge badge-${status}`}`.
- **Filter tabs**: Active = solid blue `#2563EB` + white text. Inactive = subtle outline.
- **Theme-aware CSS vars**: `--t1`..`--t5` for text opacity, `--sep` for separators. Dark uses `rgba(255,255,255,...)`, light uses `rgba(30,27,75,...)`. Use these in inline styles — never hardcode raw rgba.
- **Light theme** detail in `docs/design-system.md`.

### Status labels (i18n)
Use `getStatus(status, lang, t)` for translated label. Badge colors via CSS class, not inline. Components render `<span className={`badge badge-${session.status}`}>{status.label}</span>`.

### Sync (v2.6+)
- Debounced 1s via `debouncedSync()` in App.jsx; localStorage saves immediately, GitHub push waits for more changes.
- `pushRemoteData` retries up to 3 on 409 — merges instead of blind-overwriting.
- **Errors surface to UI** via `syncStatus` (green/blue/red dot, tap red to retry). Never use `.catch(() => {})` on sync paths.
- Per-record `_modified` timestamps; `mergeData` union-by-ID. PT's freshly-edited record always wins over a stale device's version.

### Reducer actions
| Action | Payload | Notes |
|--------|---------|-------|
| `ADD_CLIENT` | `{id, name, packages: [pkg], ...}` | New clients seeded with one open package |
| `EDIT_CLIENT` | `{id, ...fields}` | Detects current-package field changes → `package_edited` / `override_set` / `override_cleared` audit entries |
| `DELETE_CLIENT` | `clientId` | Also deletes their sessions |
| `ADD_SESSION` | `{id, clientId, ...}` | |
| `UPDATE_SESSION` | `{id, ...fields}` | Merges fields |
| `BATCH_COMPLETE` | `[id, id, ...]` | Marks all completed in one dispatch |
| `DELETE_SESSION` | `sessionId` | |
| `RENEW_PACKAGE` | `{clientId, newPackageStart, newContractSize, newPeriodUnit, newPeriodValue, newNotes, closedBy: 'manual'\|'auto', trigger}` | Atomic close-and-open of current package + audit append. Idempotent (returns state unchanged if current pkg already closed). |
| `ADD_TODO` / `EDIT_TODO` / `TOGGLE_TODO` / `DELETE_TODO` | varies | |
| `SET_TEMPLATES` | `{booking?, reminder?}` | |
| `REPLACE_ALL` | full state | Used by cloud sync; bypasses `_lastModified` stamp |

---

## KNOWN ISSUES / TECH DEBT

### Should fix soon
- **No error boundary** — corrupted localStorage crashes the app to a white screen. A top-level boundary would let the user access backup/export.
- **Duplicated session card rendering** — Dashboard, Schedule, Sessions render their own session cards (~50-80 lines each). A shared `SessionCard` component would eliminate this.

### App name
- "PTApp" is a working title. Need a unique name (not trademarked in fitness/trainer space) before App Store / Play Store submission.

---

## REVIEW DISCIPLINE

After accumulating **3+ feature changes** or **any session longer than ~2 hours of coding**, pause and run a comprehensive review before continuing. Check:
1. **Pattern consistency** — Did a bug fix get applied everywhere the pattern exists? (UTC bug was in 8 places, fix landed in 1.)
2. **Storage refactors** — Did EVERY read AND write of the old field name get migrated? (v2.8 `.mode/.type`, v2.9.2 inline override.)
3. **Variable shadowing** — Any new `.map()`/`.find()` callbacks using `t`, `d`, or other commonly imported names?
4. **Theme/RTL** — New inline `marginLeft`, `borderLeft`, hardcoded colors?
5. **i18n** — New user-facing strings not in `i18n.js`?
6. **Data safety** — New code that deletes, overwrites, or fails to migrate data?
7. **Sync impact** — New `.catch(() => {})`? New dispatches in loops?

After every commit:
- **Bug fixes** → document root cause + fix pattern in `docs/traps.md`. Grep for the same pattern elsewhere.
- **New features** → update `docs/instructions-v{X}.md`, `docs/changelog-summary.md`, `docs/changelog-technical.md`.
- **Design decisions** → add to Coding Conventions or Key Design Decisions.
- **Incidents/lessons** → save to memory for cross-session persistence.

---

## Key Design Decisions
- Single-page app with bottom tab navigation (Home, Clients, Schedule, Sessions)
- WhatsApp via `https://wa.me/{phone}?text={message}` — no API needed
- Phone numbers must include country code (e.g. +961 for Lebanon)
- Session types: Strength, Cardio, Flexibility, HIIT, Recovery, Custom
- Session statuses: Scheduled → auto-completes → Completed (or Cancelled with count/forgive)
- Auto-complete: lapsed sessions batch-marked completed on app load
- UX simplicity is the priority — the PT adopted the app because it's simple. Don't add friction.
- Billing periods (v2.9+): live inside `client.packages[]`. Each package has `periodUnit` ('day'/'week'/'month') + `periodValue` (number). Optional `contractSize` extends the period until contract met (no month-end reset).

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

# 3. Bump version in App.jsx debug panel (e.g. v2.9.1 → v2.9.2), rebuild if changed

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
- For schema changes, run `tmp/sanity-live-migration.mjs` against PT's real export BEFORE deploying.
- Sanity scripts: `tmp/sanity-reducer.mjs`, `sanity-counting.mjs`, `sanity-slidingwindow.mjs`, `sanity-migration.mjs`, `sanity-live-migration.mjs`.

## Sibling Projects
PTApp is the most mature web app in Pierre's project ecosystem. Its UI/UX patterns serve as reference for other projects:
- **Alerts** (`C:/projects/Alerts`) — Safety alert dashboard. References PTApp's design system but uses zone-colored design language for urgency.
- **HomeLab** (`C:/projects/HomeLab`) — Infrastructure/HA project. Independent.
- **Career** (`C:/projects/Career`) — Resume and job search. Independent.
- **CCHealth** (`C:/projects/CCHealth`) — Meta/advisory project that monitors all projects.
