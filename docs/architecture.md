# PTApp — Architecture Reference

Moved out of `CLAUDE.md` on 2026-08-03 to keep session-start context under budget. This is the
*stable* reference material — what the app is made of and why. Nothing here changes per release.

> **CLAUDE.md keeps only what a session must not miss** (current version, governance, traps index,
> conventions, data-safety rules, the deploy pipeline). Everything below is looked up on demand.

---

## Core Features

- **Client Management** — add/edit/delete clients with name, nickname, phone (with country code),
  gender, birthdate, notes.
- **Session Scheduling** — book training sessions with type, date, time, duration. Multi-client
  booking supported. Recurring generator (v2.10.0).
- **Session Tracking** — `Scheduled` → auto-completes when the time passes (or manual Complete).
  Cancel with count/forgive.
- **Focus Tags & Notes** — per-session muscle-group tags + free-text notes recording what was done.
- **WhatsApp Messaging** — booking confirmations and reminders via `wa.me` links. Templates editable
  by the PT.
- **Dashboard** — overview stats (clients, today, this week). Expanded view with full inline
  controls; Compact view for a quick glance.
- **Evaluations** — 1RM strength battery (v2.12) scored against age-banded bodyweight-ratio charts;
  older mass-population records kept view-only.
- **Program generation** — 6-month training programs generated from a 1RM evaluation (v2.13),
  multi-day splits 3–6 days (v2.14), Arabic exercise names (v2.14.2).
- **i18n** — full Arabic/English toggle, RTL layout, Arabic WhatsApp templates.
- **Themes** — dark (default) and light. Blue accent, warm stone light palette.
- **Cloud Sync** — GitHub API sync to `makdissi-dev/ptapp-data`. Debounced (1s) pushes. Snapshots
  for backup. Per-record `_modified` merge.
- **Offline** — service worker caches the app for offline use.
- **Todo List** — shared todo in the General panel with checkboxes (done/delete/edit).

---

## Tech Stack

- **React 18** (hooks: `useState`, `useReducer`, `useEffect`, `useMemo`)
- **Vite** for dev server and build — `vite-plugin-singlefile` inlines all JS/CSS into one HTML file
- **Pure CSS**, no framework — dark/light themes, mobile-first
- **Google Fonts: DM Sans** (loads from the internet — the device needs connectivity)
- **Service worker** for offline support (network-first caching)
- **No backend** — all data in browser `localStorage` + GitHub API cloud sync

---

## Project Structure

```
PTApp/
├── index.html, package.json, vite.config.js, .gitattributes
├── CLAUDE.md                  # session context (keep < 20 KB — see the deploy checklist)
├── HANDOFF.md                 # subject-scoped resume/work-order doc
├── public/                    # sw.js, manifest.json (Vite copies to dist)
├── src/
│   ├── main.jsx               # React mount point + SW registration
│   ├── App.jsx                # Routing/tabs, sync, auto-complete, token expiry, debug panel
│   ├── sync.js                # GitHub API sync (makdissi-dev/ptapp-data)
│   ├── i18n.js                # Translations (en/ar) + t() lookup + dateLocale()
│   ├── styles.css             # All styles (dark + light themes)
│   ├── utils.js               # Helpers, constants, storage, reducer, date helpers
│   ├── normCharts.js          # ALL evaluation chart data + scoring kernels (CHARTS_VERSION)
│   ├── programKernel.js       # generateProgram() — THE single program generation kernel
│   ├── programRules.js        # Volume tiers, method catalog (PROGRAM_RULES_VERSION)
│   ├── exerciseBank.js        # GENERATED — rebuild via scripts/build_exercise_bank.py
│   ├── exerciseNamesAr.js     # Handwritten EN→AR exercise names (NOT in i18n.js)
│   └── components/
│       ├── Dashboard.jsx, Clients.jsx, Schedule.jsx, Sessions.jsx, General.jsx
│       ├── Modal.jsx          # Bottom-sheet modal wrapper
│       ├── Icons.jsx          # Shared SVG icons
│       ├── ErrorBoundary.jsx  # Top-level boundary (Backup / Try again / Reset)
│       ├── CancelPrompt.jsx   # Cancel session modal
│       ├── TokenSetup.jsx     # GitHub token first-run
│       ├── TokenUpdateModal.jsx # Replace an expired sync token (v2.12.1)
│       ├── RenewalModal.jsx   # Shared renewal dialog (Clients + Dashboard)
│       ├── EvalForm.jsx, EvalSection.jsx, EvalTimer.jsx, NormChartsView.jsx
│       ├── ProgramSetup.jsx, ProgramViewer.jsx
│       └── SessionCountPair.jsx, OverrideHelpPopup.jsx
├── scripts/sanity/            # *.mjs gates — see CLAUDE.md deploy checklist
└── docs/
    ├── architecture.md        # this file
    ├── traps.md               # hard-won lessons / TRAPS (indexed from CLAUDE.md)
    ├── app-health.md          # Feature Overhead Register
    ├── design-system.md       # Visual design reference
    ├── elie-next-visit.md     # Standing agenda + rules for Elie-driven sessions
    ├── instructions-v*.md     # Per-version feature notes (one per shipped version)
    ├── changelog-summary.md   # Plain-English, per version
    ├── changelog-technical.md # Technical, per version
    ├── reviews/               # Whole-codebase review reports (= work orders)
    └── superpowers/           # Plans + specs from feature work
```

---

## Key Design Decisions

- **Single-page app** with bottom tab navigation (Home, Clients, Schedule, Sessions).
- **WhatsApp via `https://wa.me/{phone}?text={message}`** — no API needed. Phone numbers must
  include the country code (e.g. `+961` for Lebanon).
- **Session types:** Strength, Cardio, Flexibility, HIIT, Recovery, Endurance (renamed from Custom
  in v2.9.5).
- **Session statuses:** Scheduled → auto-completes → Completed (or Cancelled with count/forgive).
- **Auto-complete** — lapsed sessions are batch-marked completed continuously. The effect re-runs on
  every session mutation; that is **deliberate** — it is what completes sessions across midnight in
  an open PWA (see W2 in the v2.10.1 review).
- **UX simplicity is the priority.** The PT adopted the app because it is simple. Don't add friction.
- **Billing periods (v2.9+)** live inside `client.packages[]`. Each package has `periodUnit`
  (`'day' | 'week' | 'month'`) + `periodValue` (number). An optional `contractSize` extends the
  period until the contract is met (no month-end reset).
- **Frozen-at-generation records** — evaluations freeze their scores + `CHARTS_VERSION`; programs
  freeze `PROGRAM_RULES_VERSION` + `EXERCISE_BANK_VERSION`. Later rule changes never rewrite stored
  records.

---

## Roadmap

### Stage 1 — Web app with cloud sync (CURRENT)
- Hosted on GitHub Pages: https://pih-dev.github.io/PTApp/
- Data synced to a GitHub repo (`makdissi-dev/ptapp-data`) via the GitHub API
- Both the PT and Pierre see the same data
- The PT bookmarks the URL on his iPhone, Pierre on Android

### Stage 2 — Native app (FUTURE)
- Wrap the web app with Capacitor for iOS/Android native builds
- Publish to the Apple App Store ($99/yr individual) and Google Play ($25 one-time)
- **Requires a final app name** — "PTApp" is a working title and must be unique / untrademarked in
  the fitness-trainer space
- Full details: `docs/stage2-publishing-guide.md`

---

## Reducer actions

Full table. **The non-negotiable contracts are repeated in `CLAUDE.md` → CODING CONVENTIONS** — read
this table before adding a new action or dispatching an unfamiliar one.

| Action | Payload | Notes |
|--------|---------|-------|
| `ADD_CLIENT` | `{id, name, packages: [pkg], ...}` | New clients seeded with one open package |
| `EDIT_CLIENT` | `{id, ...fields}` | Detects current-package field changes → `package_edited` / `override_set` / `override_cleared` audit entries |
| `EDIT_CURRENT_PACKAGE` | `{clientId, pkg}` | **THE owner of replace-last-package writes** (v2.10.4). Reads the LIVE client by id — no stale-snapshot clobbering — stamps `_modified`, and shares `buildPackageAuditEntries` with `EDIT_CLIENT`. **Never hand-roll `packages.slice(0,-1)` at a call site** |
| `DELETE_CLIENT` | `clientId` | Cascades to that client's sessions, evaluations and programs |
| `ADD_SESSION` | `{id, clientId, ...}` | |
| `ADD_SESSIONS` | `[{id, clientId, ...}, ...]` | Batch-append in ONE dispatch (each stamped `_modified`). Used by the recurring generator AND the multi-client booking path. Never renews packages |
| `UPDATE_SESSION` | `{id, ...fields}` | Merges fields |
| `BATCH_COMPLETE` | `[id, id, ...]` | Marks all completed in one dispatch |
| `DELETE_SESSION` | `sessionId` | |
| `RENEW_PACKAGE` | `{clientId, newPackageStart, newContractSize, newPeriodUnit, newPeriodValue, newNotes, closedBy: 'manual'\|'auto', trigger}` | Atomic close-and-open of the current package + audit append. Idempotent (returns state unchanged if the current package is already closed) |
| `ADD_EVALUATION` | full record | Appends to `state.evaluations`, stamps `_modified` |
| `EDIT_EVALUATION` | full record | **Full-record contract** — partial patches forbidden; `scores` + `classification` must be re-frozen by `compute1RMFrozen` / `computeEvalFrozen` at the call site before dispatch |
| `DELETE_EVALUATION` | `evalId` | Audit-logged (`evaluation_deleted`), confirm-guarded at the UI layer |
| `ADD_PROGRAM` | full record | Appends to `state.programs`, stamps `_modified`, audits `program_generated`. Built by the ONE kernel `generateProgram()` — never construct a program record anywhere else |
| `EDIT_PROGRAM` | full record | **Full-record contract** (same shape as `EDIT_EVALUATION`) — a swap-exercise edit re-dispatches the whole record |
| `DELETE_PROGRAM` | `programId` | Audit-logged (`program_deleted`), confirm-guarded at the UI layer |
| `ADD_TODO` / `EDIT_TODO` / `TOGGLE_TODO` / `DELETE_TODO` | varies | |
| `SET_TEMPLATES` | `{booking?, reminder?}` | |
| `REPLACE_ALL` | full state | Used by cloud sync; bypasses the `_lastModified` stamp |

---

## Sibling Projects

PTApp is the most mature web app in Pierre's project ecosystem; its UI/UX patterns serve as
reference for the others.

| Project | Path | Relationship |
|---|---|---|
| **Alerts** | `C:/projects/Alerts` | Safety alert dashboard. References PTApp's design system but uses zone-colored design language for urgency. |
| **HomeLab** | `C:/projects/HomeLab` | Infrastructure / Home Assistant. Independent. |
| **Career** | `C:/projects/Career` | Resume and job search. Independent. |
| **CCHealth** | `C:/projects/CCHealth` | Meta/advisory project that monitors all projects. |
