# Session Contracts & Package History — Design Spec

**Version target:** v2.9
**Date:** 2026-04-20
**Status:** Approved — ready for implementation plan

---

## 1. Problem

The PT started using PTApp on 2026-04-02, but many of his clients buy *packages* (typically 10 sessions paid upfront) rather than paying per calendar month. The current model resets the session count at the end of every calendar month, which doesn't reflect how packages actually work:

- A client who's done 8 of 10 sessions by Apr 30 should **not** reset to 0 on May 1 — the package continues until all 10 are delivered.
- A client who completes all 10 sessions before the calendar month ends should be flagged as *due for renewal* immediately, not at end-of-month.
- The end-of-package moment is when payment changes hands — the app needs to surface it so the PT doesn't miss a sale.

Additionally, the current `periodLength` enum (`1month / 4weeks / 2weeks / 1week`) is too coarse. The PT may want arbitrary periods like "Day 15" or "Week 3".

And finally: Pierre has stated that **accounting is coming** in a future version. Whatever data model we choose for packages must be the foundation that accounting reads from. Refactoring later is expensive.

## 2. Scope

**In scope (v2.9):**
- Replace `periodLength` enum with unit + value (Day/Week/Month × integer).
- Add optional `contractSize` per client (default blank = current time-based behavior).
- When contract is set: period extends past the time window until N sessions complete ("elastic period"), then flags as due for renewal.
- Renewal flow: explicit "Renew" button + auto-advance on next booking (both paths supported).
- Store complete package history (`client.packages[]`) as first-class data.
- Red "due for renewal" indicator on three surfaces: Clients tab, Dashboard (dedicated section), booking confirm popup.
- Append-only audit log of package lifecycle events (`state.auditLog[]`).
- New meta doc: `docs/app-health.md` (Feature Overhead Register).

**Out of scope (future):**
- Accounting / revenue reporting UI.
- Past-package history surfaced in client expanded card UI (data is stored, not displayed in v2.9).
- "Close package early" button for mid-contract changes.
- Forcing renewal from a non-red client.
- Per-session event logging in auditLog (only package-level events logged in v2.9).

## 3. Data Model

### 3.1 Package object

Lives in `client.packages[]`:

```js
{
  id: 'pkg_abc123',              // genId()
  start: '2026-03-01',           // first day of this package (YYYY-MM-DD, local time)
  end: null,                     // iso date when closed; null = current/open
  periodUnit: 'month',           // 'day' | 'week' | 'month'
  periodValue: 1,                // integer ≥ 1
  contractSize: 10,              // null = no contract (time-based); integer ≥ 1 = count-based
  sessionCountOverride: null,    // { type: 'absolute'|'delta', value, periodStart } or null
  notes: '',                     // optional free-text captured at renewal (e.g. "paid $500 cash")
  closedAt: null,                // ISO timestamp when renewal happened
  closedBy: null,                // 'manual' | 'auto' | 'migration' | null
}
```

### 3.2 Client schema changes

**Removed from client root (moved inside the current package):**
- `periodStart` → `packages[last].start`
- `periodLength` → `packages[last].periodUnit` + `packages[last].periodValue`
- `sessionCountOverride` → `packages[last].sessionCountOverride`
- `overridePeriodStart` → `packages[last].sessionCountOverride.periodStart`

**Added to client root:**
- `packages: Array<Package>` — always populated after migration (at least one entry).

**Unchanged:**
- `id`, `name`, `nickname`, `phone`, `gender`, `birthdate`, `notes`, `_modified`.

### 3.3 State shape additions

```js
state = {
  clients: [...],    // as above
  sessions: [...],   // unchanged
  todos: [...],      // unchanged
  messageTemplates: {...},  // unchanged
  auditLog: [...],   // NEW — see §6
  _dataVersion: 3,   // bumped from 2
  _lastModified: '...',
}
```

### 3.4 Invariants

- Every client has at least one entry in `packages[]` (guaranteed by migration and by every code path that creates/edits packages).
- The last entry of `packages[]` always has `end: null` — it's the *current* open package.
- All entries except the last have `end !== null` — they're closed.
- Package ids are unique within a client's packages[] (globally unique in practice via `genId`).
- A session's package is derived at read time (not stored): `packages.find(p => s.date >= p.start && (p.end === null || s.date <= p.end))`. Sessions before any package's start are orphaned (rare, acceptable).

## 4. Period & Counting Logic

### 4.1 Three core functions (`src/utils.js`)

```js
getCurrentPackage(client)
getEffectivePeriod(pkg, refDate)
getEffectiveClientCount(client, sessions, refDate = today())
isRenewalDue(client, sessions)
```

### 4.2 `getEffectivePeriod` behavior

- **Contract package (`contractSize != null`):** returns `{ start: pkg.start, end: null }`. Open-ended until renewal.
- **No-contract package (`contractSize == null`):** returns a sliding time window anchored at `pkg.start`, stepped by `pkg.periodUnit × pkg.periodValue`.
  - **Month N**: anchored day-of-month, steps by N months. Day clamped for short months (Jan 31 anchor in Feb → Feb 28/29). Generalizes current `'1month'` logic.
  - **Week N**: fixed 7×N days from anchor.
  - **Day N**: fixed N days from anchor.

### 4.3 Session count

```
period = getEffectivePeriod(pkg)

auto   = count of sessions where clientId matches
          AND date >= period.start
          AND (period.end === null OR date <= period.end)
          AND (status !== 'cancelled' OR cancelCounted)

effective = apply override if active:
              active := override.periodStart === period.start
              if active && type=='absolute': effective = override.value
              if active && type=='delta':    effective = max(0, auto + override.value)
              else:                          effective = auto
```

**Note on future-dated sessions:** `auto` intentionally does not cap at `today()`. A session scheduled for next week still counts toward the contract — the PT has booked it, the client has implicitly agreed, and it must be counted for renewal detection. This matches current v2.8 `getPeriodSessionCount` behavior and the PT's mental model ("I've sold 8 sessions this package" includes scheduled-but-not-yet-done).

### 4.4 Renewal detection

```js
isRenewalDue(client, sessions) =
  pkg.contractSize != null && getEffectiveClientCount(...).effective >= pkg.contractSize
```

## 5. UI Changes

### 5.1 Clients tab — edit form billing section

Replaces lines 328–346 of `src/components/Clients.jsx`. New layout:

```
┌─ Billing ──────────────────────────────────────┐
│  Package #3 · Session 5 / 10       ← status line (read-only, if current pkg exists)
│
│  Period start (optional)  [ 2026-03-01 ]        ← date input
│
│  Period length           [ 1 ] [ Month ▾ ]     ← flex row: value + unit dropdown
│                              Day / Week / Month
│
│  Contract size (optional) [ ___ ]               ← number, placeholder "e.g. 10"
│
│  [Auto count: 3→5]  [override input]            ← unchanged v2.8 block
└─────────────────────────────────────────────────┘
```

**Save behavior:**
- All four fields edit the *current open package* (not the client root).
- For a new client with no packages yet, Save creates the first package from these fields. Defaults if all blank: `{ unit: 'month', value: 1, contractSize: null, start: today }`.
- Changing `contractSize` mid-package is an edit (not a renewal).
- If new `contractSize < effective`, client flips red immediately.

### 5.2 Clients tab — card (red state)

When `isRenewalDue(client, sessions) === true`:

- `.card-renewal-due` class applied:
  - `border-inline-start: 3px solid #EF4444`
  - Subtle red wash `rgba(239,68,68,0.08)` on card background
- Red pill below client name: *"Renewal due · Session {effective}/{contractSize}"*
- Inline **Renew** button appears next to existing Edit/WhatsApp/Delete icons (blue-white styling, not destructive red).

### 5.3 Renewal modal

Opens from the Renew button. Fields:

```
Renew {client.name}'s package
─────────────────────
  Contract size:    [ 10 ]            ← defaults to previous pkg's size
  New period start: [ 2026-05-16 ]    ← defaults to (last session's date + 1 day)
  Period length:    [ 1 ] [ Month ▾ ] ← defaults to previous unit/value
  Notes (optional): [ ______ ]        ← stored on new package for reporting

  [ Cancel ]  [ Confirm renewal ]
```

**Confirm does (atomic, one dispatch):**
1. Close current package: `end = (new start) - 1 day`, `closedAt = now()`, `closedBy = 'manual'`.
2. Append new package with PT-entered values; `sessionCountOverride = null`, `end = null`.
3. Append audit entry: `event: 'package_renewed_manual'`.

### 5.4 Auto-advance on next booking

Inside `Schedule.jsx`'s `saveSession`, before dispatching `ADD_SESSION`:

```js
const pkg = getCurrentPackage(client)
if (pkg.contractSize != null && effectiveCount(client, sessions) >= pkg.contractSize) {
  // Close old package: end = newSessionDate - 1 day, closedAt = now, closedBy = 'auto'
  // Append new package: start = newSessionDate, same unit/value/contractSize, override null
  // Append audit entry: event 'package_renewed_auto', trigger { sessionId }
  // Fire toast: "{client}'s package renewed — new package started {date}. Tap to review."
}
// Then dispatch ADD_SESSION as usual — it falls into the new package naturally
```

The toast deep-links to the Edit Client form so PT can adjust start date / contract size if wanted.

### 5.5 Dashboard — "Due for renewal" section

New section above "Upcoming Sessions", rendered only when any client is red-flagged:

```
📋 Due for renewal (2)
─────────────────────
  Hala Mouzanar       · Session 10/10       [ Renew ]
  Rami Saab           · Session 12/10 (+2)  [ Renew ]
```

Tapping a row navigates to Clients tab, pre-expanded on that client.

### 5.6 Booking confirm popup — warning banner

When the selected client has `isRenewalDue === true`, show above the WhatsApp buttons:

> ⚠️ **Package limit hit** — booking this session will auto-renew the package.

Informational only, not blocking. Color: soft red (`rgba(239,68,68,0.12)` background, `#EF4444` border-inline-start).

### 5.7 NOT adding red highlights to (trimmed from scope)

- Dashboard Upcoming Sessions cards (redundant with dedicated section).
- Schedule booking picker chips (redundant with confirm banner).
- Sessions tab cards (retrospective view, not actionable).

If these feel missing after release, cheap retrofit.

## 6. Audit Log

### 6.1 Entry shape

```js
state.auditLog = [
  {
    id: 'log_xyz',
    ts: '2026-04-20T14:30:15.000Z',
    clientId: 'abc',
    clientName: 'Hala Mouzanar',       // denormalized, survives client deletion
    event: 'package_renewed_auto',     // see §6.2
    packageId: 'pkg_123',              // package affected (old one on renewals)
    newPackageId: 'pkg_456',           // new package on renewals; null otherwise
    before: { /* full package snapshot, or null for 'package_created' */ },
    after:  { /* full package snapshot */ },
    trigger: { sessionId, reason },    // context for auto-renew; null if manual
  },
]
```

### 6.2 Events logged

- `package_created` — first package for a client (from migration or new client creation) OR new package from a renewal.
- `package_renewed_manual` — Renew button path.
- `package_renewed_auto` — 11th booking auto-advance.
- `package_edited` — PT changed contractSize, periodStart, periodUnit, or periodValue on the current open package without renewing.
- `override_set` — override applied or changed.
- `override_cleared` — override removed.
- `package_closed_manual` — reserved event slot for future "close early" feature.

### 6.3 Integration with reducer

Every action that touches `client.packages[]` (`EDIT_CLIENT`, `ADD_CLIENT`, or new `RENEW_PACKAGE` action) also appends one entry to `state.auditLog[]` in the same reducer step. Single dispatch = single `_lastModified` stamp = single sync push.

### 6.4 Sync & merge

`state.auditLog[]` flows through `mergeById` like `clients` / `sessions` / `todos`. Entries are append-only (no edits, no deletes), so `mergeById` union semantics are especially safe — two devices adding concurrent entries both survive.

### 6.5 Retention

No trimming in v1. Estimated ~100 entries/client/year × 50 clients ≈ 5K entries/year ≈ ~1MB JSON. Fine for GitHub API sync.

**Revisit trigger** (documented in `docs/app-health.md`):
- `auditLog.length > 10_000`
- OR data blob > 2 MB
- OR sync push > 3 seconds on Pierre's Android

### 6.6 UI access

**v1:** no primary UI. Log is inspected via:
- Exported backup JSON (readable by Pierre).
- Optional future addition to the debug panel (long-press ⋮ → "Audit log").

This is a Pierre-side forensic/recovery tool, not part of the PT's workflow.

## 7. Migration (v2 → v3)

### 7.1 Steps per client (inside `migrateData`)

```js
if (client.packages exists) skip  // idempotent

const firstSessionDate = earliestSessionDateForClient(client, sessions)
const pkgStart = client.periodStart || firstSessionDate || today()

const { unit, value } = parseLegacyPeriodLength(client.periodLength)
  // '1month'→{month,1}, '4weeks'→{week,4}, '2weeks'→{week,2}, '1week'→{week,1}
  // '' or undef → {month,1}

const legacyPeriod = computeLegacyPeriod(client, today())
const override = (client.sessionCountOverride && client.overridePeriodStart === legacyPeriod.start)
  ? { ...client.sessionCountOverride, periodStart: legacyPeriod.start }
  : null

client.packages = [{
  id: genId('pkg_'),
  start: pkgStart,
  end: null,
  periodUnit: unit,
  periodValue: value,
  contractSize: null,
  sessionCountOverride: override,
  closedAt: null,
  closedBy: null,
}]

delete client.periodStart
delete client.periodLength
delete client.sessionCountOverride
delete client.overridePeriodStart

state.auditLog.push({
  id: genId('log_'),
  ts: now(),
  clientId, clientName,
  event: 'package_created',
  packageId: client.packages[0].id,
  newPackageId: client.packages[0].id,
  before: null,
  after: client.packages[0],
  trigger: { reason: 'migration v2→v3' },
})
```

Also at top level: `state.auditLog = state.auditLog || []`.

### 7.2 Safety properties

- **Session data untouched** — `state.sessions` never modified.
- **Count preservation** — for every client, `newGetEffectiveClientCount() === oldGetEffectiveClientCount()` post-migration. Verified by a migration-time assert (non-fatal warning logged if mismatch).
- **Idempotent** — re-running the migration is a no-op.
- **Reversible via backup** — standard data export before first v2.9 load is Pierre's rollback.

### 7.3 Pre-deploy verification

Added to the v2.9 deploy pipeline (this release only):
1. Export current live data as JSON.
2. Run migration in a dev build.
3. For each client, assert `newEffectiveCount === oldEffectiveCount`.
4. Spot-check 3-5 clients visually in the UI.
5. Only deploy after all assertions pass and UI matches.

## 8. Red Highlight Detection

Shared helper in `utils.js`:

```js
export const isRenewalDue = (client, sessions) => {
  const pkg = getCurrentPackage(client)
  if (!pkg || pkg.contractSize == null) return false
  return getEffectiveClientCount(client, sessions).effective >= pkg.contractSize
}
```

Called from:
- `Clients.jsx` — per-card render
- `Dashboard.jsx` — derive "Due for renewal" list + count
- `Schedule.jsx` booking confirm modal — derive banner visibility

Cost: one `filter` + one array length per call. For ~50 clients × ~1000 sessions, each call is sub-millisecond. No memoization needed in v1.

## 9. WhatsApp Template Integration

### 9.1 Placeholders

- `{number}` — unchanged. Session ordinal within effective period, with override applied (via `getEffectiveSessionCount`).
- `{periodEnd}` — **unchanged semantics**. Always renders the sliding time window end (not contract end, which is unknowable). For contract packages, still meaningful ("until May 2" = anchored-month window end).
- `{packageProgress}` — **NEW, opt-in.** Renders as `"{thisSessionOrdinal}/{contractSize}"` for contract packages, empty string for no-contract. Uses the same `getEffectiveSessionCount().effective` value as `{number}` for the numerator — so for session #8 of a 10-pack, renders `"8/10"`. Final session of the package renders `"10/10"`. PT can splice into custom templates. Default templates unchanged.

### 9.2 Default templates

Unchanged in v2.9. PT can edit custom templates to add `{packageProgress}` if desired:

```
Session {number} of {packageProgress} — see you at {time} 💪
```

## 10. Edge Cases

| Case | Behavior |
|------|----------|
| Contract toggled OFF (10→blank) on active package | `contractSize = null`; package continues as time-based sliding window, red clears. Audit: `package_edited`. |
| Contract lowered below current count (10→5, 7 done) | Red flag fires immediately. PT adjusts contract or renews. |
| Override pushes effective over contract | Red fires (working-as-designed). |
| Client has packages, zero sessions | Shows `0/N`, not red. |
| Session backdated before `pkg.start` | Orphaned, counts for no package, still in calendar month view. |
| Deleting Nth session after auto-advance | Renewal stays. Closed package shows "9/10" — acceptable inconsistency. |
| Two devices race on renewal | `mergeById` picks later `_modified`; one packages[] survives, **both auditLog entries survive** (append-only union). Log enables reconstruction. |
| Client deleted with packages + audit entries | Audit entries stay (denormalized clientName). Packages deleted with client. |
| Package.start in the future | Sessions before don't count. Shows `0/N` until first qualifying session. |
| Renew button on non-red client | Not rendered. No "force renew" path in v1. |
| Many red clients (~10) | No cap on Dashboard section. Realistic max ~2-3. |
| Auto-advance fires offline | Local reducer + log; sync pushes when online. |

## 11. Files Touched

| File | Change |
|------|--------|
| `src/utils.js` | Add `getCurrentPackage`, `getEffectivePeriod`, `isRenewalDue`, `computeSlidingWindow`. Rewrite `getEffectiveSessionCount` / `getEffectiveClientCount` to read from packages. Migration v2→v3. New reducer cases for renewal + audit logging. |
| `src/components/Clients.jsx` | Edit form billing section (unit/value + contract). Renew button on red cards. Red CSS class application. |
| `src/components/Schedule.jsx` | Auto-advance before `ADD_SESSION` dispatch. Booking confirm banner for red clients. |
| `src/components/Dashboard.jsx` | "Due for renewal" section above Upcoming Sessions. |
| `src/components/RenewalModal.jsx` | **NEW** — shared renewal dialog. |
| `src/i18n.js` | ~8 new keys: `periodLengthValue`, `unitDay`, `unitWeek`, `unitMonth`, `contractSize`, `contractOptional`, `packageNumber`, `sessionsOf`, `renewContract`, `renewalDue`, `packageLimitHit`, `willAutoRenew`. |
| `src/styles.css` | `.card-renewal-due`, `.dashboard-renewal-section`, `.booking-renewal-banner`. |
| `docs/app-health.md` | **NEW** — Feature Overhead Register. |
| `docs/instructions-v2.9.md` | **NEW** — version notes for session. |
| `docs/changelog-summary.md` | v2.9 entry. |
| `docs/changelog-technical.md` | v2.9 entry. |
| `CLAUDE.md` | Update Current Version section; add link to app-health.md; add new TRAPs if any discovered during impl. |

## 12. Testing Strategy

No automated test suite exists (confirmed — no package.json test script). Verification is manual and pre-deploy:

1. **Migration assertion** — built into migrateData; logs warnings on count mismatch per client.
2. **Pre-deploy snapshot diff** — as described in §7.3.
3. **Manual test script** (in impl plan):
   - Create new client with no contract → verify time-based sliding behavior unchanged.
   - Create new client with contract=10 → add 10 sessions → verify red flag, Renew button, Dashboard section.
   - Auto-advance: book 11th session → verify toast, new package, session in new package.
   - Manual renewal: tap Renew → adjust date → verify old package closed, new package started.
   - Override in contract package → verify it counts toward renewal trigger.
   - Migration on live data snapshot → verify all counts match pre-migration.
4. **Device testing** — deploy to gh-pages, PT tests on iPhone, Pierre tests on Android, multi-device sync race scenarios.

## 13. Rollout

Standard release process:
1. Implement on master, commit incrementally.
2. Bump version 2.8 → 2.9 in App.jsx header.
3. Build, verify bundle, deploy to gh-pages (per CLAUDE.md deploy pipeline).
4. Migration runs automatically on next app-load for PT + Pierre.
5. Announce version in chat with the verify-step checklist.

No feature flag — the migration is safe and the old model has no benefits to preserve.

## 14. Future Work (not v2.9)

- **Accounting layer** — reads `client.packages[]` + `state.sessions` to compute revenue, client LTV, velocity. See `docs/app-health.md` for overhead considerations at design time.
- **Past-package history UI** in Clients expanded card — list packages with start/end/size/session count.
- **Audit log viewer** in debug panel — readable UI for `state.auditLog[]`.
- **"Close package early"** button for mid-contract changes.
- **Package notes UI** — surfacing the optional `notes` field set during renewal.

---

**Approvals:** Pierre (brainstorm session 2026-04-20, this doc).
**Next step:** writing-plans skill → implementation plan.
