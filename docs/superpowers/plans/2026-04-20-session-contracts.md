# Session Contracts & Package History — Implementation Plan (v2.9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v2.9 — per-client session contracts (default 10) with elastic billing periods that extend past the time window until contract is met; explicit "Renew" + auto-advance-on-next-booking rollover paths; first-class `client.packages[]` history + append-only `state.auditLog[]` for forensics and future accounting.

**Architecture:** New data model — every client has `packages[]` (at least one entry), the last with `end: null` is the *current* package. The root-level `periodStart` / `periodLength` / `sessionCountOverride` / `overridePeriodStart` fields are removed from clients and moved inside the current package. All period and count math reads from `getCurrentPackage(client)`. Renewal closes the current package (stamps `end`, `closedAt`, `closedBy`) and appends a fresh one. Every package lifecycle event (create, renew, edit, override set/clear) appends one entry to `state.auditLog[]`. Migration v2→v3 synthesizes one initial package per existing client, preserving all counts.

**Tech Stack:** React 18 hooks, Vite, pure CSS. No test framework (confirmed — only `dev`/`build`/`preview` scripts in package.json). Verification is via sanity Node scripts for pure functions + manual browser testing for UI, matching project convention.

**Spec:** `docs/superpowers/specs/2026-04-20-session-contracts-design.md`

**Branching:** This feature is large enough that mid-feature commits on master would break the live PWA between pushes. Work on a feature branch `feature/v2.9-contracts`, merge to master only when Task 12 (verification + deploy) passes. **Do NOT deploy to gh-pages until all tasks complete.**

---

## File Structure

**Modified files:**
- `src/utils.js` — large. New pure helpers, rewritten counting functions, migration v2→v3, new reducer action, auditLog append helper, `fillTemplate` updates for `{packageProgress}`.
- `src/components/Clients.jsx` — edit form billing section rewrite; red card state; Renew button; wire to RenewalModal.
- `src/components/Schedule.jsx` — auto-advance check before `ADD_SESSION` dispatch in `saveSession`; booking confirm banner for red clients; wire to toast/notification surface.
- `src/components/Dashboard.jsx` — new "Due for renewal" section above Upcoming Sessions; renders RenewalModal.
- `src/App.jsx` — version string bump v2.8 → v2.9 in debug panel; wire toast notification render (if not already present).
- `src/components/General.jsx` — update instructions URL to `instructions-v2.9.md`.
- `src/i18n.js` — new keys in `en` and `ar`.
- `src/styles.css` — `.card-renewal-due`, `.dashboard-renewal-section`, `.booking-renewal-banner`, `.renewal-toast`.
- `CLAUDE.md` — promote v2.9 as Current Version; demote v2.8 to Previous; add link to `docs/app-health.md`.
- `docs/changelog-summary.md` — append v2.9 section.
- `docs/changelog-technical.md` — append v2.9 section.

**New files:**
- `src/components/RenewalModal.jsx` — shared renewal dialog used from Clients + Dashboard.
- `docs/app-health.md` — Feature Overhead Register.
- `docs/instructions-v2.9.md` — version doc.

**Data migration:** v2 → v3. Adds `packages[]` to every client, initializes `state.auditLog`, deletes deprecated root fields. Idempotent. Non-destructive — all session data untouched.

**Sync impact:** `state.auditLog[]` is a new top-level array; merges via `mergeById` exactly like `clients`/`sessions`/`todos`. Append-only semantics make the merge especially safe. `packages[]` rides on the client record through per-record `_modified` + `mergeById`.

---

### Task 1: Create feature branch + add pure period helpers to `src/utils.js`

**Files:**
- Modify: `src/utils.js` (add after `getSessionOrdinal` around line ~256)

**Rationale:** Non-breaking addition. New pure functions (`computeSlidingWindow`, `parseLegacyPeriodLength`, `getCurrentPackage`, `getEffectivePeriod`) that the rest of the feature depends on. They're pure — testable with a Node sanity script without any React/Vite plumbing. No existing code uses them yet.

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feature/v2.9-contracts
git push -u origin feature/v2.9-contracts
```

- [ ] **Step 2: Add `computeSlidingWindow` helper to `src/utils.js`**

In `src/utils.js`, after `getSessionOrdinal` (around line 256), add:

```js
// ─── Sliding window math (v2.9) ───
// Generalized anchored-period calculator. Replaces the inline month/week/day logic
// in the old getClientPeriod. Returns {start, end} for the window containing refDate,
// anchored at anchorDateStr and stepped by `value` units.
//
// Month: anchored day-of-month, day clamped for short months (Jan 31 anchor in Feb → Feb 28/29).
// Week : fixed 7 × value days from anchor.
// Day  : fixed value days from anchor.
export const computeSlidingWindow = (anchorDateStr, unit, value, refDate) => {
  const anchor = new Date(anchorDateStr + 'T00:00:00');
  const ref = refDate instanceof Date ? refDate : new Date(refDate + 'T00:00:00');

  if (unit === 'month') {
    const day = anchor.getDate();
    const clamp = (y, m) => Math.min(day, new Date(y, m + 1, 0).getDate());
    // Find monthsDiff from anchor to ref
    const monthsDiff = (ref.getFullYear() - anchor.getFullYear()) * 12
                     + (ref.getMonth() - anchor.getMonth());
    // Number of full N-month steps elapsed since anchor
    let steps = Math.floor(monthsDiff / value);
    // Candidate start: anchor + steps*value months, clamped day.
    // Build by day-1-of-month + setDate — never mutate month on a clamped date,
    // because setMonth on day 31 → Feb rolls over into March (Date overflow gotcha).
    const buildStart = (s) => {
      const d = new Date(
        anchor.getFullYear(),
        anchor.getMonth() + s * value,
        1
      );
      d.setDate(clamp(d.getFullYear(), d.getMonth()));
      return d;
    };
    let candStart = buildStart(steps);
    // If ref is before candidate start within its month, we're actually in the previous step
    if (ref < candStart) {
      steps -= 1;
      candStart = buildStart(steps);
    }
    const nextStart = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + (steps + 1) * value,
      1
    );
    nextStart.setDate(clamp(nextStart.getFullYear(), nextStart.getMonth()));
    const windowEnd = new Date(nextStart.getTime() - 86400000);
    return { start: localDateStr(candStart), end: localDateStr(windowEnd) };
  }

  // 'week' or 'day' — fixed-length windows in days
  const days = unit === 'week' ? value * 7 : value;
  const diffMs = ref.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const idx = Math.floor(diffDays / days);
  const start = new Date(anchor.getTime() + idx * days * 86400000);
  const end = new Date(start.getTime() + (days - 1) * 86400000);
  return { start: localDateStr(start), end: localDateStr(end) };
};
```

- [ ] **Step 3: Add `parseLegacyPeriodLength` helper**

Immediately after `computeSlidingWindow`, add:

```js
// Maps v2 periodLength enum to v3 {unit, value} pair. Used by migration only.
export const parseLegacyPeriodLength = (legacyValue) => {
  switch (legacyValue) {
    case '1month':  return { unit: 'month', value: 1 };
    case '4weeks':  return { unit: 'week',  value: 4 };
    case '2weeks':  return { unit: 'week',  value: 2 };
    case '1week':   return { unit: 'week',  value: 1 };
    default:        return { unit: 'month', value: 1 };  // '' or undefined → calendar month
  }
};
```

- [ ] **Step 4: Add `getCurrentPackage` helper**

After `parseLegacyPeriodLength`, add:

```js
// Returns the current open package (last with end: null) or a synthetic default.
// Defensive — if called on an un-migrated client (packages missing/empty), returns
// a default-shape package so downstream math doesn't crash. Migration (v2→v3) runs
// at loadData, so in practice this fallback is only hit for literal edge cases.
export const getCurrentPackage = (client) => {
  const pkgs = client && client.packages;
  if (pkgs && pkgs.length > 0) {
    const last = pkgs[pkgs.length - 1];
    if (last && last.end == null) return last;
  }
  return {
    id: null,
    start: today(),
    end: null,
    periodUnit: 'month',
    periodValue: 1,
    contractSize: null,
    sessionCountOverride: null,
    notes: '',
    closedAt: null,
    closedBy: null,
  };
};
```

- [ ] **Step 5: Add `getEffectivePeriod` helper**

After `getCurrentPackage`, add:

```js
// Returns {start, end} window used for session counting/display.
//   Contract package    → { start: pkg.start, end: null }  (open-ended until renewal)
//   No-contract package → sliding time window anchored at pkg.start, stepped by unit*value
export const getEffectivePeriod = (pkg, refDateStr = today()) => {
  if (!pkg) return { start: refDateStr, end: null };
  if (pkg.contractSize != null) {
    return { start: pkg.start, end: null };
  }
  return computeSlidingWindow(pkg.start, pkg.periodUnit, pkg.periodValue, refDateStr);
};
```

- [ ] **Step 6: Run sanity script — verify computeSlidingWindow with real cases**

Create `tmp/sanity-slidingwindow.mjs`:

```js
// Sanity script: asserts computeSlidingWindow output against known cases.
// Run: node tmp/sanity-slidingwindow.mjs
// Delete after v2.9 ships.
import { computeSlidingWindow } from '../src/utils.js';

const cases = [
  // Month N — anchored day-of-month
  { anchor: '2026-03-02', unit: 'month', value: 1, ref: '2026-04-20',
    expected: { start: '2026-04-02', end: '2026-05-01' }, label: 'Month/1 anchor Mar 2, ref Apr 20' },
  { anchor: '2026-03-02', unit: 'month', value: 1, ref: '2026-03-02',
    expected: { start: '2026-03-02', end: '2026-04-01' }, label: 'Month/1 anchor Mar 2, ref Mar 2 (exact anchor)' },
  { anchor: '2026-01-31', unit: 'month', value: 1, ref: '2026-02-15',
    expected: { start: '2026-01-31', end: '2026-02-27' }, label: 'Month/1 anchor Jan 31, ref Feb 15 (still in Jan 31 window)' },
  { anchor: '2026-01-31', unit: 'month', value: 1, ref: '2026-03-01',
    expected: { start: '2026-02-28', end: '2026-03-30' }, label: 'Month/1 anchor Jan 31, ref Mar 1 (clamped Feb 28 window)' },
  { anchor: '2026-03-02', unit: 'month', value: 2, ref: '2026-04-15',
    expected: { start: '2026-03-02', end: '2026-05-01' }, label: 'Month/2 anchor Mar 2, ref Apr 15' },
  { anchor: '2026-03-02', unit: 'month', value: 2, ref: '2026-05-10',
    expected: { start: '2026-05-02', end: '2026-07-01' }, label: 'Month/2 anchor Mar 2, ref May 10' },

  // Week N
  { anchor: '2026-04-01', unit: 'week', value: 1, ref: '2026-04-10',
    expected: { start: '2026-04-08', end: '2026-04-14' }, label: 'Week/1 anchor Apr 1, ref Apr 10' },
  { anchor: '2026-04-01', unit: 'week', value: 2, ref: '2026-04-10',
    expected: { start: '2026-04-01', end: '2026-04-14' }, label: 'Week/2 anchor Apr 1, ref Apr 10' },

  // Day N
  { anchor: '2026-04-01', unit: 'day', value: 15, ref: '2026-04-20',
    expected: { start: '2026-04-16', end: '2026-04-30' }, label: 'Day/15 anchor Apr 1, ref Apr 20' },
];

let passed = 0, failed = 0;
for (const c of cases) {
  const got = computeSlidingWindow(c.anchor, c.unit, c.value, c.ref);
  const ok = got.start === c.expected.start && got.end === c.expected.end;
  if (ok) { passed++; console.log('✓', c.label); }
  else { failed++; console.error('✗', c.label, '\n  expected', c.expected, '\n  got', got); }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

Run:
```bash
mkdir -p tmp && node tmp/sanity-slidingwindow.mjs
```

Expected: all cases pass, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/utils.js tmp/sanity-slidingwindow.mjs
git commit -m "feat(v2.9): add package period helpers and sliding window math

Pure additions to utils.js — no existing code changed yet.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 2: Add migration v2 → v3 + auditLog initialization

**Files:**
- Modify: `src/utils.js` (line ~363 `DATA_VERSION`, line ~369 `migrateData`, line ~398 `loadData` is fine as-is)

**Rationale:** Transform existing v2 client data into v3 package-shape on load. Non-destructive — session data is never touched, root fields are converted into a synthesized first package, override (if any and active) is migrated inside. Auditlog seeded with one `package_created` entry per client so forensics can see "where did this initial package come from".

- [ ] **Step 1: Bump DATA_VERSION**

In `src/utils.js`, change line 363:

```js
const DATA_VERSION = 3;
```

- [ ] **Step 2: Add migration block v2→v3 to `migrateData`**

In `src/utils.js`, inside `migrateData` (around line 369), after the existing v1→v2 block, add:

```js
  // v2 → v3: Add packages[] to every client; move periodStart/periodLength/sessionCountOverride/overridePeriodStart
  // into a synthesized first package. Initialize state.auditLog. Non-destructive: no session data touched.
  // See docs/superpowers/specs/2026-04-20-session-contracts-design.md §7 for rationale.
  if (v < 3) {
    const sessions = data.sessions || [];
    data.auditLog = data.auditLog || [];

    (data.clients || []).forEach(c => {
      if (c.packages && c.packages.length > 0) return;  // idempotent — already migrated

      // Earliest session date for this client (anchor fallback if no periodStart set)
      const clientSessions = sessions
        .filter(s => s.clientId === c.id)
        .map(s => s.date)
        .sort();
      const firstSessionDate = clientSessions[0];

      const pkgStart = c.periodStart || firstSessionDate || today();
      const { unit, value } = parseLegacyPeriodLength(c.periodLength);

      // Preserve override only if it was ACTIVE for legacy current period.
      // Stale overrides (from prior period) were inert in v2 and stay so in v3.
      let override = null;
      if (c.sessionCountOverride && c.overridePeriodStart) {
        // Compute what legacy getClientPeriod would have returned for today — using the unit/value
        // we just derived. If legacyCurrentPeriodStart === c.overridePeriodStart, override was live.
        const legacyCurrent = computeSlidingWindow(pkgStart, unit, value, today());
        if (c.overridePeriodStart === legacyCurrent.start) {
          override = { ...c.sessionCountOverride, periodStart: legacyCurrent.start };
        }
      }

      const pkg = {
        id: 'pkg_' + genId(),
        start: pkgStart,
        end: null,
        periodUnit: unit,
        periodValue: value,
        contractSize: null,
        sessionCountOverride: override,
        notes: '',
        closedAt: null,
        closedBy: null,
      };
      c.packages = [pkg];

      // Remove deprecated root fields
      delete c.periodStart;
      delete c.periodLength;
      delete c.sessionCountOverride;
      delete c.overridePeriodStart;

      // Seed audit log with a creation entry
      data.auditLog.push({
        id: 'log_' + genId(),
        ts: new Date().toISOString(),
        clientId: c.id,
        clientName: c.name,
        event: 'package_created',
        packageId: pkg.id,
        newPackageId: pkg.id,
        before: null,
        after: pkg,
        trigger: { reason: 'migration v2→v3' },
      });
    });

    v = 3;
  }
```

- [ ] **Step 3: Ensure `auditLog` is defaulted in migrateData tail**

In `src/utils.js`, in the tail of `migrateData` (currently sets `data.clients = data.clients || []; ...`), add one line:

```js
  data.auditLog = data.auditLog || [];
```

Alongside the existing defaulters, before `data._lastModified = data._lastModified || new Date().toISOString();`.

- [ ] **Step 4: Update `mergeData` to include auditLog**

In `src/utils.js`, in `mergeData` (line ~429), add `auditLog` to the merged output:

```js
export function mergeData(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const localTs = local._lastModified || '';
  const remoteTs = remote._lastModified || '';
  const preferLocal = localTs > remoteTs;
  return {
    clients: mergeById(local.clients, remote.clients),
    sessions: mergeById(local.sessions, remote.sessions),
    todos: mergeById(local.todos, remote.todos),
    auditLog: mergeById(local.auditLog, remote.auditLog),
    messageTemplates: preferLocal
      ? (local.messageTemplates || remote.messageTemplates || {})
      : (remote.messageTemplates || local.messageTemplates || {}),
    _dataVersion: Math.max(local._dataVersion || 0, remote._dataVersion || 0),
    _lastModified: preferLocal ? localTs : remoteTs,
  };
}
```

- [ ] **Step 5: Update `REPLACE_ALL` in reducer to default auditLog**

In `src/utils.js`, `baseReducer` case `REPLACE_ALL` (line ~505), change:

```js
    case 'REPLACE_ALL': {
      const replaced = { todos: [], auditLog: [], messageTemplates: {}, ...action.payload };
      replaced._lastModified = replaced._lastModified || new Date().toISOString();
      return replaced;
    }
```

- [ ] **Step 6: Run sanity script — migration correctness**

Create `tmp/sanity-migration.mjs`:

```js
// Sanity: feed migrateData a synthetic v2 state, assert v3 shape is correct
// and session counts are preserved.
// Run: node tmp/sanity-migration.mjs
// Delete after v2.9 ships.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Vite-style import — utils.js uses ES modules
const utilsUrl = pathToFileURL(new URL('../src/utils.js', import.meta.url).pathname).href;
const { loadData } = await import(utilsUrl);

// Craft a v2 blob in localStorage-like shape
const v2Blob = {
  _dataVersion: 2,
  clients: [
    // Client A: periodStart+periodLength set, active override
    {
      id: 'cA', name: 'Alice', nickname: 'Al', phone: '96170000001',
      periodStart: '2026-03-02', periodLength: '1month',
      sessionCountOverride: { type: 'delta', value: 2 },
      overridePeriodStart: '2026-04-02',
      _modified: '2026-04-15T10:00:00Z',
    },
    // Client B: no period config, no override, has sessions
    {
      id: 'cB', name: 'Bob', nickname: 'Bo', phone: '96170000002',
      _modified: '2026-04-10T10:00:00Z',
    },
    // Client C: stale override (should NOT be migrated into package)
    {
      id: 'cC', name: 'Cara', nickname: 'Ca', phone: '96170000003',
      periodStart: '2026-03-02', periodLength: '1month',
      sessionCountOverride: { type: 'absolute', value: 99 },
      overridePeriodStart: '2026-02-02',   // stale — doesn't match current period (Apr 2)
      _modified: '2026-04-01T10:00:00Z',
    },
  ],
  sessions: [
    { id: 's1', clientId: 'cA', date: '2026-04-05', time: '10:00', type: 'Strength', status: 'completed' },
    { id: 's2', clientId: 'cA', date: '2026-04-12', time: '10:00', type: 'Strength', status: 'completed' },
    { id: 's3', clientId: 'cB', date: '2026-03-20', time: '10:00', type: 'Strength', status: 'completed' },
  ],
  todos: [],
  messageTemplates: {},
  _lastModified: '2026-04-15T10:00:00Z',
};

// Simulate localStorage for this run
global.localStorage = {
  _data: { 'ptapp-data': JSON.stringify(v2Blob) },
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
};

const migrated = loadData();

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

assert(migrated._dataVersion === 3, 'dataVersion bumped to 3');
assert(Array.isArray(migrated.auditLog), 'auditLog is an array');
assert(migrated.auditLog.length === 3, 'three package_created audit entries');

const A = migrated.clients.find(c => c.id === 'cA');
assert(A.packages && A.packages.length === 1, 'Alice has one package');
assert(A.packages[0].start === '2026-03-02', 'Alice package start matches periodStart');
assert(A.packages[0].periodUnit === 'month' && A.packages[0].periodValue === 1, 'Alice unit/value');
assert(A.packages[0].sessionCountOverride && A.packages[0].sessionCountOverride.value === 2, 'Alice active override migrated');
assert(A.packages[0].sessionCountOverride.periodStart === '2026-04-02', 'Alice override stamped with current period start');
assert(A.periodStart === undefined, 'Alice root periodStart removed');
assert(A.periodLength === undefined, 'Alice root periodLength removed');
assert(A.sessionCountOverride === undefined, 'Alice root override removed');
assert(A.overridePeriodStart === undefined, 'Alice root overridePeriodStart removed');

const B = migrated.clients.find(c => c.id === 'cB');
assert(B.packages[0].start === '2026-03-20', 'Bob package anchored at earliest session date');
assert(B.packages[0].periodUnit === 'month', 'Bob default unit=month');
assert(B.packages[0].sessionCountOverride === null, 'Bob no override');

const C = migrated.clients.find(c => c.id === 'cC');
assert(C.packages[0].sessionCountOverride === null, 'Cara stale override NOT migrated');

console.log('\nMigration sanity: PASS');
```

Run:
```bash
node tmp/sanity-migration.mjs
```

Expected: all assertions pass, "Migration sanity: PASS", exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/utils.js tmp/sanity-migration.mjs
git commit -m "feat(v2.9): migrate v2 clients to packages[] shape + init auditLog

Non-destructive migration: sessions untouched, root period/override fields
moved into a synthesized first package per client. Stale v2 overrides
dropped (were inert in v2 anyway). auditLog seeded with package_created
entries for forensics.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 3: Rewrite counting functions to read from packages

**Files:**
- Modify: `src/utils.js` (replace `getEffectiveSessionCount`, `getEffectiveClientCount`, `getSessionOrdinal`; add `isRenewalDue`; update `getPeriodSessionCount` usage; update `fillTemplate` for `{packageProgress}`)

**Rationale:** Swap the data source from old root fields (`client.periodStart`, `client.sessionCountOverride`) to `getCurrentPackage(client)`. Preserve return shape `{ auto, effective, override }` so call sites don't need to change their destructuring. Add `isRenewalDue` for UI surfaces.

- [ ] **Step 1: Replace `getEffectiveSessionCount`**

In `src/utils.js`, replace the existing `getEffectiveSessionCount` (around line 298) with:

```js
// Compute auto + effective count for a specific session within its client's current package.
// "Active override" = override.periodStart matches the current package's effective period start
// (same semantic as v2.8 — works for both sliding-window and contract packages).
// Returns { auto, effective, override } — preserved shape for backward compat.
export const getEffectiveSessionCount = (client, session, sessions) => {
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, session.date);
  const auto = getSessionOrdinal(sessions, session.id, session.clientId, period.start, period.end);

  const override = pkg.sessionCountOverride;
  if (!override || override.periodStart !== period.start) {
    return { auto, effective: auto, override: null };
  }

  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};
```

- [ ] **Step 2: Replace `getEffectiveClientCount`**

Replace `getEffectiveClientCount` (around line 320) with:

```js
// Compute auto + effective count for a client (not anchored to a specific session) as of refDate.
// Used by client-scoped displays like booking chips and renewal-due detection.
export const getEffectiveClientCount = (client, sessions, refDateStr = today()) => {
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, refDateStr);
  const auto = getPeriodSessionCount(sessions, client.id, period.start, period.end || '9999-12-31');

  const override = pkg.sessionCountOverride;
  if (!override || override.periodStart !== period.start) {
    return { auto, effective: auto, override: null };
  }

  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};
```

- [ ] **Step 3: Update `getPeriodSessionCount` to support null period end**

Replace `getPeriodSessionCount` (around line 237) with:

```js
// Count sessions for a client within a date range (billing period).
// periodEnd can be null for open-ended contract packages — treat as "no upper bound".
export const getPeriodSessionCount = (sessions, clientId, periodStart, periodEnd) => {
  return sessions.filter(s =>
    s.clientId === clientId &&
    s.date >= periodStart &&
    (periodEnd == null || s.date <= periodEnd) &&
    (s.status !== 'cancelled' || s.cancelCounted)
  ).length;
};
```

- [ ] **Step 4: Update `getSessionOrdinal` to support null period end**

Replace `getSessionOrdinal` (around line 250) with:

```js
// Sequential position of a session within its client's billing period (1st, 2nd, 3rd...).
// periodEnd can be null for open-ended contract packages. Defensive fallback: if the session
// isn't found in the filtered list (stale array during ADD_SESSION), return length + 1 to
// prevent "Session #0" from leaking into WhatsApp messages.
export const getSessionOrdinal = (sessions, sessionId, clientId, periodStart, periodEnd) => {
  const periodSessions = sessions
    .filter(s =>
      s.clientId === clientId &&
      s.date >= periodStart &&
      (periodEnd == null || s.date <= periodEnd) &&
      (s.status !== 'cancelled' || s.cancelCounted))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const idx = periodSessions.findIndex(s => s.id === sessionId);
  return idx === -1 ? periodSessions.length + 1 : idx + 1;
};
```

- [ ] **Step 5: Add `isRenewalDue`**

After `getEffectiveClientCount`, add:

```js
// True when the client's current package has a contract and the effective count has reached it.
// Used by UI surfaces (Clients card, Dashboard section, booking confirm banner) to apply red state.
export const isRenewalDue = (client, sessions) => {
  const pkg = getCurrentPackage(client);
  if (!pkg || pkg.contractSize == null) return false;
  const { effective } = getEffectiveClientCount(client, sessions);
  return effective >= pkg.contractSize;
};
```

- [ ] **Step 6: Delete old `getClientPeriod` and replace usages (compat wrapper)**

`getClientPeriod` (line ~182) is no longer the source of truth. Keep the export name as a thin compat wrapper so any lingering caller still works, and mark it deprecated:

Replace the old `getClientPeriod` (line ~182 through ~224) with:

```js
// DEPRECATED in v2.9 — kept as a thin compat wrapper. New code should use
// getCurrentPackage + getEffectivePeriod. Returns the current effective period
// for a client as of dateStr, derived from the current package.
export const getClientPeriod = (client, dateStr) => {
  const pkg = getCurrentPackage(client);
  const { start, end } = getEffectivePeriod(pkg, dateStr);
  // Old callers expect non-null end. For open-ended contract packages, return today as end
  // (caller was computing "current period end for display" which is moot for contract packages).
  return { start, end: end || today() };
};
```

- [ ] **Step 7: Update `fillTemplate` to support `{packageProgress}` placeholder**

Replace `fillTemplate` (around line 549) with:

```js
// Replace placeholders in a template with actual session values.
// Uses client's current package for {number} and {periodEnd} (unchanged semantics).
// v2.9: adds {packageProgress} — "N/M" for contract packages, empty string otherwise.
const fillTemplate = (template, client, session, sessions) => {
  const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, session.date);
  const { effective } = sessions
    ? getEffectiveSessionCount(client, session, sessions)
    : { effective: '' };
  const packageProgress = (pkg.contractSize != null && sessions)
    ? `${effective}/${pkg.contractSize}`
    : '';
  // {periodEnd} for contract packages: fall back to sliding window end computed from unit/value
  // (meaningful for messaging even though the package extends past it).
  const periodEndDisplay = period.end
    || computeSlidingWindow(pkg.start, pkg.periodUnit, pkg.periodValue, session.date).end;
  return template
    .replace(/\{name\}/g, friendly(client))
    .replace(/\{type\}/g, session.type)
    .replace(/\{emoji\}/g, st.emoji)
    .replace(/\{date\}/g, formatDateLong(session.date))
    .replace(/\{time\}/g, session.time)
    .replace(/\{duration\}/g, String(session.duration || 45))
    .replace(/\{number\}/g, String(effective))
    .replace(/\{periodEnd\}/g, formatDateLong(periodEndDisplay))
    .replace(/\{packageProgress\}/g, packageProgress);
};
```

- [ ] **Step 8: Run sanity script — counting + renewal detection**

Create `tmp/sanity-counting.mjs`:

```js
// Sanity: verify counting and renewal detection on synthetic v3 clients.
// Run: node tmp/sanity-counting.mjs
import { pathToFileURL } from 'node:url';
const utilsUrl = pathToFileURL(new URL('../src/utils.js', import.meta.url).pathname).href;
const utils = await import(utilsUrl);

const { getEffectiveClientCount, isRenewalDue, getCurrentPackage, getEffectivePeriod } = utils;

// Synthetic data — today is 2026-04-20
const today = '2026-04-20';

const clientNoContract = {
  id: 'c1', name: 'NoContract',
  packages: [{
    id: 'pkg1', start: '2026-04-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: null, sessionCountOverride: null,
    closedAt: null, closedBy: null, notes: '',
  }],
};

const clientWithContract = {
  id: 'c2', name: 'WithContract',
  packages: [{
    id: 'pkg2', start: '2026-03-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: 10, sessionCountOverride: null,
    closedAt: null, closedBy: null, notes: '',
  }],
};

const clientOverride = {
  id: 'c3', name: 'OverrideActive',
  packages: [{
    id: 'pkg3', start: '2026-03-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: 10,
    sessionCountOverride: { type: 'delta', value: 2, periodStart: '2026-03-01' },
    closedAt: null, closedBy: null, notes: '',
  }],
};

// Sessions — some past, some future-dated (scheduled)
const makeSessions = (clientId, count, startDate) => {
  const arr = [];
  const d = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `s_${clientId}_${i}`, clientId,
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      time: '10:00', type: 'Strength', status: i < count - 2 ? 'completed' : 'scheduled',
    });
    d.setDate(d.getDate() + 2);
  }
  return arr;
};

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// 1. No-contract client: 3 sessions in current sliding window (Apr 1-30 if anchor Apr 1)
const nc = getEffectiveClientCount(clientNoContract, makeSessions('c1', 3, '2026-04-03'), today);
assert(nc.effective === 3, `no-contract auto count = 3 (got ${nc.effective})`);
assert(!isRenewalDue(clientNoContract, makeSessions('c1', 3, '2026-04-03')), 'no-contract never renewal-due');

// 2. Contract client: 8 of 10 → NOT due
const contractSessions8 = makeSessions('c2', 8, '2026-03-05');
const c2_8 = getEffectiveClientCount(clientWithContract, contractSessions8, today);
assert(c2_8.effective === 8, `contract 8/10 auto = 8 (got ${c2_8.effective})`);
assert(!isRenewalDue(clientWithContract, contractSessions8), 'contract 8/10 NOT due');

// 3. Contract client: 10 of 10 → DUE
const contractSessions10 = makeSessions('c2', 10, '2026-03-05');
assert(isRenewalDue(clientWithContract, contractSessions10), 'contract 10/10 IS due');

// 4. Contract client: 11 of 10 (overshoot) → DUE
const contractSessions11 = makeSessions('c2', 11, '2026-03-05');
assert(isRenewalDue(clientWithContract, contractSessions11), 'contract 11/10 IS due');

// 5. Override: 8 auto + override +2 = 10 effective → DUE
const overrideSessions = makeSessions('c3', 8, '2026-03-05');
const ovResult = getEffectiveClientCount(clientOverride, overrideSessions, today);
assert(ovResult.effective === 10, `override 8+2 = 10 (got ${ovResult.effective})`);
assert(isRenewalDue(clientOverride, overrideSessions), 'override-induced threshold IS due');

// 6. Future-dated sessions DO count (no today() capping)
const futureSession = { id: 'sf', clientId: 'c2', date: '2026-05-15', time: '10:00', type: 'Strength', status: 'scheduled' };
const contractWithFuture = [...makeSessions('c2', 9, '2026-03-05'), futureSession];
const withFuture = getEffectiveClientCount(clientWithContract, contractWithFuture, today);
assert(withFuture.effective === 10, `contract 9 past + 1 future = 10 (got ${withFuture.effective})`);
assert(isRenewalDue(clientWithContract, contractWithFuture), 'future session triggers renewal-due');

console.log('\nCounting sanity: PASS');
```

Run:
```bash
node tmp/sanity-counting.mjs
```

Expected: all assertions pass, exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/utils.js tmp/sanity-counting.mjs
git commit -m "feat(v2.9): rewrite counting + add isRenewalDue on packages model

getEffectiveSessionCount/ClientCount now read from client.packages[last].
fillTemplate supports new {packageProgress} placeholder.
getClientPeriod kept as thin compat wrapper to minimize call-site churn.
Override active-check moved from client.overridePeriodStart matching to
override.periodStart inside the package — same semantic, cleaner home.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 4: Add `RENEW_PACKAGE` reducer action + `EDIT_CLIENT` auditLog stamping

**Files:**
- Modify: `src/utils.js` (`baseReducer` — add new case, enhance `EDIT_CLIENT`)

**Rationale:** Renewal is an atomic operation — close old package AND append new package AND append one auditLog entry in a single dispatch (so sync fires once, not three times). `EDIT_CLIENT` also needs to detect package-field edits and append `package_edited` / `override_set` / `override_cleared` entries.

- [ ] **Step 1: Enhance `EDIT_CLIENT` case to log package edits**

In `src/utils.js`, replace the existing `case 'EDIT_CLIENT':` (around line 475) with:

```js
    case 'EDIT_CLIENT': {
      const stamp = now();
      const oldClient = state.clients.find(c => c.id === action.payload.id);
      const newClient = { ...action.payload, _modified: stamp };
      const logEntries = [];

      const oldPkg = oldClient && oldClient.packages && oldClient.packages[oldClient.packages.length - 1];
      const newPkg = newClient.packages && newClient.packages[newClient.packages.length - 1];
      if (oldPkg && newPkg && oldPkg.id === newPkg.id) {
        // Detect tracked package field changes → package_edited
        const tracked = ['start', 'periodUnit', 'periodValue', 'contractSize'];
        const changed = tracked.some(f => oldPkg[f] !== newPkg[f]);
        if (changed) {
          logEntries.push({
            id: 'log_' + genId(),
            ts: stamp,
            clientId: newClient.id,
            clientName: newClient.name,
            event: 'package_edited',
            packageId: newPkg.id,
            newPackageId: null,
            before: oldPkg,
            after: newPkg,
            trigger: null,
          });
        }
        // Detect override change → override_set or override_cleared
        const oldOv = oldPkg.sessionCountOverride;
        const newOv = newPkg.sessionCountOverride;
        if (JSON.stringify(oldOv) !== JSON.stringify(newOv)) {
          logEntries.push({
            id: 'log_' + genId(),
            ts: stamp,
            clientId: newClient.id,
            clientName: newClient.name,
            event: newOv ? 'override_set' : 'override_cleared',
            packageId: newPkg.id,
            newPackageId: null,
            before: { sessionCountOverride: oldOv },
            after: { sessionCountOverride: newOv },
            trigger: null,
          });
        }
      }

      return {
        ...state,
        clients: state.clients.map(c => c.id === newClient.id ? newClient : c),
        auditLog: logEntries.length
          ? [...(state.auditLog || []), ...logEntries]
          : (state.auditLog || []),
      };
    }
```

- [ ] **Step 2: Add `RENEW_PACKAGE` case**

In `src/utils.js`, inside `baseReducer` before the `REPLACE_ALL` case, add:

```js
    case 'RENEW_PACKAGE': {
      // Atomic: close current package, append new, log one renewal entry.
      // Payload: { clientId, newPackageStart, newContractSize, newPeriodUnit, newPeriodValue,
      //            newNotes, closedBy: 'manual'|'auto', trigger }
      const stamp = now();
      const {
        clientId, newPackageStart,
        newContractSize, newPeriodUnit, newPeriodValue, newNotes,
        closedBy, trigger,
      } = action.payload;
      const client = state.clients.find(c => c.id === clientId);
      if (!client || !client.packages || client.packages.length === 0) return state;
      const oldPkg = client.packages[client.packages.length - 1];
      if (oldPkg.end != null) return state;  // already closed; shouldn't happen but defensive

      // Compute day before new period start (in local time)
      const d = new Date(newPackageStart + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      const oldEnd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      const closedOld = { ...oldPkg, end: oldEnd, closedAt: stamp, closedBy };
      const newPkg = {
        id: 'pkg_' + genId(),
        start: newPackageStart,
        end: null,
        periodUnit: newPeriodUnit,
        periodValue: newPeriodValue,
        contractSize: newContractSize,
        sessionCountOverride: null,
        notes: newNotes || '',
        closedAt: null,
        closedBy: null,
      };

      const updatedClient = {
        ...client,
        packages: [...client.packages.slice(0, -1), closedOld, newPkg],
        _modified: stamp,
      };

      const logEntry = {
        id: 'log_' + genId(),
        ts: stamp,
        clientId,
        clientName: client.name,
        event: closedBy === 'auto' ? 'package_renewed_auto' : 'package_renewed_manual',
        packageId: oldPkg.id,
        newPackageId: newPkg.id,
        before: oldPkg,
        after: closedOld,
        trigger: trigger || null,
      };

      return {
        ...state,
        clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
        auditLog: [...(state.auditLog || []), logEntry],
      };
    }
```

- [ ] **Step 3: Ensure `now()` helper is accessible**

At the top of `baseReducer` (line ~471), `const now = () => new Date().toISOString();` is already defined. Verify it's there; if not, add it.

- [ ] **Step 4: Run dev server to confirm no syntax errors**

```bash
npm run dev
```

Expected: server starts, no compile errors. Open http://localhost:5173 in browser, app loads (with migration running), no console errors. Kill the server (Ctrl-C) after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js
git commit -m "feat(v2.9): RENEW_PACKAGE action + EDIT_CLIENT package audit logging

RENEW_PACKAGE atomically closes current package + appends new + logs one
entry. EDIT_CLIENT detects changes to current package fields (start,
unit, value, contractSize, override) and appends package_edited /
override_set / override_cleared entries in the same dispatch.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 5: Rewrite Clients.jsx edit form billing section

**Files:**
- Modify: `src/components/Clients.jsx` (lines 1–70 imports + state; lines ~275–~390 form JSX)

**Rationale:** The edit form now reads/writes the current package's fields instead of client root. Adds unit+value split and contractSize field. Adds read-only status line at top of billing section.

- [ ] **Step 1: Update imports**

In `src/components/Clients.jsx` at line 4, replace the import with:

```jsx
import { genId, formatPhone, phoneMatchesQuery, getDefaultCountryCode, setDefaultCountryCode, SESSION_TYPES, FOCUS_TAGS, getMonthlySessionCount, formatDate, capitalizeName, localMonthStr, getStatus, haptic, parseSessionCountOverride, getCurrentPackage, getEffectivePeriod, getPeriodSessionCount, getEffectiveClientCount, isRenewalDue, today } from '../utils';
```

Note: `PERIOD_OPTIONS` is removed (no longer used); `getClientPeriod` replaced by `getCurrentPackage` + `getEffectivePeriod`; new imports `getEffectiveClientCount`, `isRenewalDue` for red-state + status line.

- [ ] **Step 2: Update `form` state shape**

Replace the initial `form` state (line 12) and the `openAdd` reset (line 22–26) to use new fields:

```jsx
  const [form, setForm] = useState({
    name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '',
    periodStart: '', periodUnit: 'month', periodValue: 1, contractSize: '',
    sessionOverride: '',
  });

  // ... and replace openAdd:
  const openAdd = () => {
    setForm({
      name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '',
      periodStart: '', periodUnit: 'month', periodValue: 1, contractSize: '',
      sessionOverride: '',
    });
    setEditingClient(null);
    setShowForm(true);
  };
```

- [ ] **Step 3: Update `openEdit` to read from current package**

Replace `openEdit` (lines 28–48) with:

```jsx
  const openEdit = (c) => {
    const pkg = getCurrentPackage(c);
    const period = getEffectivePeriod(pkg, today());
    const ov = pkg.sessionCountOverride;
    const overrideIsCurrent = ov && ov.periodStart === period.start;
    const overrideStr = overrideIsCurrent
      ? (ov.type === 'delta'
          ? (ov.value >= 0 ? '+' : '') + ov.value
          : String(ov.value))
      : '';
    setForm({
      name: c.name, nickname: c.nickname || '', phone: c.phone, gender: c.gender || '',
      birthdate: c.birthdate || '', notes: c.notes || '',
      periodStart: pkg.start || '',
      periodUnit: pkg.periodUnit || 'month',
      periodValue: pkg.periodValue || 1,
      contractSize: pkg.contractSize == null ? '' : String(pkg.contractSize),
      sessionOverride: overrideStr,
    });
    setEditingClient(c);
    setShowForm(true);
  };
```

- [ ] **Step 4: Update `save` to write current package**

Replace the existing `save` (lines 50–70) with:

```jsx
  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return;

    // Parse contract and override
    const contractNum = form.contractSize.trim();
    const contractSize = contractNum === '' ? null : (Number.isInteger(+contractNum) && +contractNum >= 1 ? +contractNum : null);

    const parsedOverride = parseSessionCountOverride(form.sessionOverride);

    // Build the current package (edit or create)
    const existingPkg = editingClient ? getCurrentPackage(editingClient) : null;
    const newPkgStart = form.periodStart || (existingPkg ? existingPkg.start : today());
    const pkgShell = {
      id: existingPkg && existingPkg.id ? existingPkg.id : 'pkg_' + genId(),
      start: newPkgStart,
      end: null,
      periodUnit: form.periodUnit || 'month',
      periodValue: +form.periodValue || 1,
      contractSize,
      notes: existingPkg ? existingPkg.notes || '' : '',
      closedAt: null,
      closedBy: null,
    };

    // Override gets stamped with the effective period start computed against the NEW pkg settings
    const probePeriod = getEffectivePeriod(pkgShell, today());
    pkgShell.sessionCountOverride = parsedOverride
      ? { ...parsedOverride, periodStart: probePeriod.start }
      : null;

    // Compose client
    const { sessionOverride, periodStart, periodUnit, periodValue, contractSize: _cs, ...restForm } = form;
    if (editingClient) {
      // Replace the last package in the packages array
      const pkgs = editingClient.packages && editingClient.packages.length
        ? [...editingClient.packages.slice(0, -1), pkgShell]
        : [pkgShell];
      dispatch({
        type: 'EDIT_CLIENT',
        payload: { ...editingClient, ...restForm, packages: pkgs },
      });
    } else {
      dispatch({
        type: 'ADD_CLIENT',
        payload: { id: genId(), ...restForm, packages: [pkgShell] },
      });
    }
    setShowForm(false);
  };
```

- [ ] **Step 5: Rewrite the billing section JSX**

In `Clients.jsx`, replace lines ~328–389 (the `Billing period` comment block and everything through the override row closing `{()})()`) with:

```jsx
          {/* Billing — period + contract. Edits the current open package. */}
          <div className="field" style={{ borderTop: '1px solid var(--sep)', paddingTop: 12, marginTop: 4 }}>
            {/* Status line — read-only, shows package position */}
            {editingClient && (() => {
              const pkg = getCurrentPackage(editingClient);
              const pkgCount = (editingClient.packages || []).length;
              const { effective } = getEffectiveClientCount(editingClient, state.sessions);
              const labelNum = pkg.contractSize != null
                ? `${effective} / ${pkg.contractSize}`
                : `${effective} ${t(lang, 'sessionWord')}`;
              return (
                <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 8 }}>
                  {t(lang, 'packageNumber')} #{pkgCount} · {t(lang, 'session')} {labelNum}
                </div>
              );
            })()}
          </div>
          <div className="field">
            <label className="field-label">
              {t(lang, 'periodStart')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'periodOptional')}</span>
            </label>
            <input type="date" className="input" value={form.periodStart}
              onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))} />
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'periodLengthValue')}</label>
              <input type="number" min="1" className="input" value={form.periodValue}
                onChange={e => setForm(p => ({ ...p, periodValue: +e.target.value || 1 }))} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'periodLengthUnit')}</label>
              <select className="select" value={form.periodUnit}
                onChange={e => setForm(p => ({ ...p, periodUnit: e.target.value }))}>
                <option value="day">{t(lang, 'unitDay')}</option>
                <option value="week">{t(lang, 'unitWeek')}</option>
                <option value="month">{t(lang, 'unitMonth')}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">
              {t(lang, 'contractSize')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'contractOptional')}</span>
            </label>
            <input type="number" min="1" className="input" placeholder={t(lang, 'contractPlaceholder')}
              value={form.contractSize}
              onChange={e => setForm(p => ({ ...p, contractSize: e.target.value.replace(/[^0-9]/g, '') }))} />
          </div>
          {/* Override row — unchanged from v2.8, now preview reads from current package shape */}
          {(() => {
            const pkgForPeriod = {
              id: 'preview', start: form.periodStart || today(),
              end: null,
              periodUnit: form.periodUnit, periodValue: +form.periodValue || 1,
              contractSize: form.contractSize === '' ? null : +form.contractSize,
              sessionCountOverride: null, notes: '', closedAt: null, closedBy: null,
            };
            const period = getEffectivePeriod(pkgForPeriod, today());
            const auto = editingClient
              ? getPeriodSessionCount(state.sessions, editingClient.id, period.start, period.end || '9999-12-31')
              : 0;
            const parsed = parseSessionCountOverride(form.sessionOverride);
            const effective = parsed
              ? (parsed.type === 'absolute' ? parsed.value : Math.max(0, auto + parsed.value))
              : auto;
            return (
              <div className="field period-override-row">
                <label className="field-label">{t(lang, 'countAuto')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="period-count-preview" style={{ flex: '0 0 auto', minWidth: 72 }}>
                    <SessionCountPair auto={auto} effective={effective} override={parsed} prefix="" />
                  </div>
                  <input
                    className="input override-input"
                    style={{ flex: 1 }}
                    placeholder={t(lang, 'overridePlaceholder')}
                    value={form.sessionOverride}
                    inputMode="text"
                    onChange={e => setForm(p => ({ ...p, sessionOverride: e.target.value }))}
                    onTouchStart={startOverrideHold}
                    onTouchEnd={cancelOverrideHold}
                    onTouchMove={cancelOverrideHold}
                    onTouchCancel={cancelOverrideHold}
                    onMouseDown={startOverrideHold}
                    onMouseUp={cancelOverrideHold}
                    onMouseLeave={cancelOverrideHold}
                    onContextMenu={e => { e.preventDefault(); setOverrideHelp(true); }}
                  />
                </div>
              </div>
            );
          })()}
```

- [ ] **Step 6: Dev server manual check**

```bash
npm run dev
```

Open http://localhost:5173, navigate to Clients tab, tap an existing client's Edit button. Verify:
- Billing status line reads "Package #1 · Session X / Y" or "Package #1 · Session X sessions"
- Period start (date), Period value (number, default 1), Period unit (dropdown: Day/Week/Month), Contract size (empty) all render
- Override row still shows auto→effective preview
- Save with no changes → app doesn't crash, client unchanged
- Save with contract size = 10 → client reloads, next Edit shows "Session X/10"

Kill dev server (Ctrl-C).

- [ ] **Step 7: Commit**

```bash
git add src/components/Clients.jsx
git commit -m "feat(v2.9): Clients edit form reads/writes current package

Billing section now has: status line, period start (date), period length
(value + unit split), contract size (optional), override (unchanged).
All fields edit the current open package in client.packages[last].

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 6: Clients.jsx red card state + Renew button stub

**Files:**
- Modify: `src/components/Clients.jsx` (line ~148 `filteredClients.map` block — card render)

**Rationale:** Visual red state + inline Renew button. Button is a stub that `alert`s until Task 8 wires it to the modal. This keeps the task committable and testable on its own.

- [ ] **Step 1: Add red state detection + button to client card**

In `src/components/Clients.jsx`, locate the `filteredClients.map(c => {` block (around line 148) and modify the card rendering. Find the card wrapper line:

```jsx
          <div key={c.id} className="card" style={{ cursor: 'pointer' }}>
```

Replace with:

```jsx
          <div key={c.id} className={`card${isRenewalDue(c, state.sessions) ? ' card-renewal-due' : ''}`} style={{ cursor: 'pointer' }}>
```

- [ ] **Step 2: Add red pill below client name (inside expanded card div)**

Within the client card's main info column (around line 158, the `<div style={{ flex: 1 }}>` containing name/phone/etc.), immediately after the `client-phone` div, add:

```jsx
                {isRenewalDue(c, state.sessions) && (() => {
                  const pkg = getCurrentPackage(c);
                  const { effective } = getEffectiveClientCount(c, state.sessions);
                  return (
                    <div className="renewal-pill">
                      {t(lang, 'renewalDue')} · {t(lang, 'session')} {effective}/{pkg.contractSize}
                    </div>
                  );
                })()}
```

- [ ] **Step 3: Add Renew button inline with existing action buttons**

Inside the action buttons flex-row div (around line 182), before the WhatsApp button, add:

```jsx
                {isRenewalDue(c, state.sessions) && (
                  <button className="btn-renew" onClick={() => alert('Renew modal coming in Task 8')}>
                    {t(lang, 'renewContract')}
                  </button>
                )}
```

- [ ] **Step 4: Dev server manual check**

```bash
npm run dev
```

For a test, edit a client in the app and set contractSize=1. Save. The client card should now have the `card-renewal-due` class applied (you'll see red only after Task 11 adds the CSS, but you can verify in DevTools that the class is applied and the `renewal-pill` div is rendered, Renew button shows).

Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Clients.jsx
git commit -m "feat(v2.9): red renewal-due state + Renew button stub on client card

Card gets .card-renewal-due class, red pill below name, Renew button
next to action icons when isRenewalDue() fires. Button is a stub — it
will wire to RenewalModal in Task 8.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 7: Create RenewalModal.jsx component

**Files:**
- Create: `src/components/RenewalModal.jsx`

**Rationale:** Shared modal used from Clients tab card and Dashboard section. Single implementation, open/close controlled by parent via `show`/`onClose`. Dispatches `RENEW_PACKAGE` on confirm.

- [ ] **Step 1: Create `src/components/RenewalModal.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { t } from '../i18n';
import { getCurrentPackage, today, localDateStr } from '../utils';

// Renewal modal — closes the client's current package and opens a new one.
// Called from Clients tab card Renew button + Dashboard "Due for renewal" section rows.
export default function RenewalModal({ show, client, sessions, onClose, dispatch, lang }) {
  const [contractSize, setContractSize] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodUnit, setPeriodUnit] = useState('month');
  const [periodValue, setPeriodValue] = useState(1);
  const [notes, setNotes] = useState('');

  // Initialize defaults on open — derived from client's current package + latest session
  useEffect(() => {
    if (!show || !client) return;
    const pkg = getCurrentPackage(client);

    // Default new period start: day after last session date for this client
    const clientSessions = (sessions || [])
      .filter(s => s.clientId === client.id && (s.status !== 'cancelled' || s.cancelCounted))
      .map(s => s.date)
      .sort();
    const lastSessionDate = clientSessions[clientSessions.length - 1];
    let defaultStart = today();
    if (lastSessionDate) {
      const d = new Date(lastSessionDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      defaultStart = localDateStr(d);
    }

    setContractSize(pkg.contractSize != null ? String(pkg.contractSize) : '10');
    setPeriodStart(defaultStart);
    setPeriodUnit(pkg.periodUnit || 'month');
    setPeriodValue(pkg.periodValue || 1);
    setNotes('');
  }, [show, client, sessions]);

  if (!show || !client) return null;

  const confirm = () => {
    const cs = contractSize.trim();
    const contractNum = cs === '' ? null : (Number.isInteger(+cs) && +cs >= 1 ? +cs : null);
    if (!periodStart) return;
    dispatch({
      type: 'RENEW_PACKAGE',
      payload: {
        clientId: client.id,
        newPackageStart: periodStart,
        newContractSize: contractNum,
        newPeriodUnit: periodUnit,
        newPeriodValue: +periodValue || 1,
        newNotes: notes,
        closedBy: 'manual',
        trigger: null,
      },
    });
    onClose();
  };

  return (
    <Modal
      title={`${t(lang, 'renewContract')} — ${client.name}`}
      onClose={onClose}
      action={<button className="btn-primary" onClick={confirm}>{t(lang, 'confirmRenewal')}</button>}
    >
      <div className="field">
        <label className="field-label">{t(lang, 'contractSize')}</label>
        <input type="number" min="1" className="input" value={contractSize}
          onChange={e => setContractSize(e.target.value.replace(/[^0-9]/g, ''))} />
      </div>
      <div className="field">
        <label className="field-label">{t(lang, 'newPeriodStart')}</label>
        <input type="date" className="input" value={periodStart}
          onChange={e => setPeriodStart(e.target.value)} />
      </div>
      <div className="flex-row-12">
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">{t(lang, 'periodLengthValue')}</label>
          <input type="number" min="1" className="input" value={periodValue}
            onChange={e => setPeriodValue(+e.target.value || 1)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">{t(lang, 'periodLengthUnit')}</label>
          <select className="select" value={periodUnit}
            onChange={e => setPeriodUnit(e.target.value)}>
            <option value="day">{t(lang, 'unitDay')}</option>
            <option value="week">{t(lang, 'unitWeek')}</option>
            <option value="month">{t(lang, 'unitMonth')}</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label">{t(lang, 'renewalNotesOptional')}</label>
        <input className="input" placeholder={t(lang, 'renewalNotesPlaceholder')} value={notes}
          onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RenewalModal.jsx
git commit -m "feat(v2.9): RenewalModal — shared dialog for manual renewal

Defaults: contract size = previous size (or 10), period start = day after
last session, unit/value = previous. Dispatches RENEW_PACKAGE with
closedBy='manual'. Not wired anywhere yet — Clients wires in Task 8,
Dashboard wires in Task 10.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 8: Wire Clients.jsx Renew button to RenewalModal

**Files:**
- Modify: `src/components/Clients.jsx`

**Rationale:** Replace the alert() stub from Task 6 with real modal open/close state + RenewalModal render.

- [ ] **Step 1: Add import + state**

In `src/components/Clients.jsx`, at the top add import:

```jsx
import RenewalModal from './RenewalModal';
```

Then add state next to other state hooks in the component (around line 21):

```jsx
  const [renewClient, setRenewClient] = useState(null);  // client pending renewal, null = modal hidden
```

- [ ] **Step 2: Replace the alert stub**

Find the Renew button added in Task 6:

```jsx
                {isRenewalDue(c, state.sessions) && (
                  <button className="btn-renew" onClick={() => alert('Renew modal coming in Task 8')}>
                    {t(lang, 'renewContract')}
                  </button>
                )}
```

Replace with:

```jsx
                {isRenewalDue(c, state.sessions) && (
                  <button className="btn-renew" onClick={(e) => { e.stopPropagation(); haptic(); setRenewClient(c); }}>
                    {t(lang, 'renewContract')}
                  </button>
                )}
```

- [ ] **Step 3: Render RenewalModal at the end of the component (next to other modals)**

In `src/components/Clients.jsx`, just before the closing `</div>` of the component (right before `{/* Delete confirmation modal */}` or after it), add:

```jsx
      <RenewalModal
        show={!!renewClient}
        client={renewClient}
        sessions={state.sessions}
        onClose={() => setRenewClient(null)}
        dispatch={dispatch}
        lang={lang}
      />
```

- [ ] **Step 4: Dev server check**

```bash
npm run dev
```

Set a client's contract = 1 in Edit Client, save. They should now be red with a Renew button. Tap Renew → modal opens with defaults. Tap Cancel → modal closes. Tap Confirm renewal → old package gets an `end`, new package appears, red state clears.

Check the data state via the Debug panel (long-press ⋮): verify `auditLog` now contains a `package_renewed_manual` entry.

Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Clients.jsx
git commit -m "feat(v2.9): wire Renew button on Clients card to RenewalModal

Tapping Renew opens RenewalModal with defaults from the current package.
Confirm dispatches RENEW_PACKAGE, red state clears.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 9: Schedule.jsx auto-advance on booking + confirm banner

**Files:**
- Modify: `src/components/Schedule.jsx` (`saveSession` function + booking confirm popup JSX)

**Rationale:** Before `ADD_SESSION` dispatches, check if the client is renewal-due. If yes, dispatch `RENEW_PACKAGE` with `closedBy: 'auto'` first, then add the session (which falls into the new package). Also show a banner in the booking confirm popup when the selected client is red-flagged, to inform PT that booking will auto-renew.

- [ ] **Step 1: Update imports**

In `src/components/Schedule.jsx`, find the imports from utils and add `getCurrentPackage`, `isRenewalDue`:

```jsx
import { /* existing imports */, getCurrentPackage, isRenewalDue } from '../utils';
```

- [ ] **Step 2: Add auto-advance logic to saveSession**

Locate the `saveSession` function in `Schedule.jsx`. Before the `dispatch({ type: 'ADD_SESSION', ... })` call (and also before any setConfirmMsg call), insert the auto-advance check:

```jsx
    // v2.9 auto-advance: if the selected client is renewal-due, close current package
    // and open a new one BEFORE adding the new session. The new session's date becomes
    // the new package start, so it naturally falls into the new package.
    for (const clientId of selectedClientIds) {
      const c = state.clients.find(x => x.id === clientId);
      if (!c) continue;
      if (isRenewalDue(c, state.sessions)) {
        const pkg = getCurrentPackage(c);
        dispatch({
          type: 'RENEW_PACKAGE',
          payload: {
            clientId,
            newPackageStart: date,   // the booking date
            newContractSize: pkg.contractSize,
            newPeriodUnit: pkg.periodUnit,
            newPeriodValue: pkg.periodValue,
            newNotes: '',
            closedBy: 'auto',
            trigger: { reason: 'auto-advance on booking', bookingDate: date, bookingTime: time },
          },
        });
      }
    }
    // Now dispatch ADD_SESSION (existing code unchanged)
```

Note: adapt variable names (`selectedClientIds`, `date`, `time`) to match what `saveSession` actually uses. If Schedule.jsx only books one client at a time, simplify to a single-client check instead of a loop.

- [ ] **Step 3: Add renewal-due banner to booking confirm popup**

Locate the booking confirm popup JSX (where the WhatsApp Send buttons appear after booking). Before the WhatsApp button row, add:

```jsx
                  {selectedClientIds.some(cid => {
                    const c = state.clients.find(x => x.id === cid);
                    return c && isRenewalDue(c, state.sessions);
                  }) && (
                    <div className="booking-renewal-banner">
                      ⚠️ {t(lang, 'packageLimitHit')} — {t(lang, 'willAutoRenew')}
                    </div>
                  )}
```

- [ ] **Step 4: Dev server manual check**

```bash
npm run dev
```

Test flow:
- Client at contract limit (contractSize=2, 2 sessions booked).
- Book session #3 for them via Schedule.
- BEFORE dispatching ADD_SESSION, the Confirm popup should show the banner "Package limit hit — booking will auto-renew".
- Save. Check the data: old package has end+closedAt+closedBy='auto'; new package exists with start = booking date. AuditLog has `package_renewed_auto` entry with trigger.reason = 'auto-advance on booking'.

Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "feat(v2.9): auto-advance package on booking + confirm banner

Before ADD_SESSION dispatch, check each selected client for renewal-due
state; if so, dispatch RENEW_PACKAGE(closedBy='auto') first. Booking
confirm popup shows a warning banner informing PT that booking will
auto-renew the package.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 10: Dashboard.jsx "Due for renewal" section + RenewalModal wiring

**Files:**
- Modify: `src/components/Dashboard.jsx`

**Rationale:** New section above Upcoming Sessions showing all red-flagged clients. Each row has a Renew button that opens RenewalModal (same shared component from Task 7).

- [ ] **Step 1: Update imports**

In `src/components/Dashboard.jsx`, add imports:

```jsx
import RenewalModal from './RenewalModal';
import { /* existing */, isRenewalDue, getCurrentPackage, getEffectiveClientCount } from '../utils';
```

- [ ] **Step 2: Add state + derived list**

Inside the Dashboard component, add:

```jsx
  const [renewClient, setRenewClient] = useState(null);

  const renewalDueClients = state.clients.filter(c => isRenewalDue(c, state.sessions));
```

- [ ] **Step 3: Render the section (both Expanded and Compact views)**

Above the "Upcoming Sessions" section in the render output, add:

```jsx
      {renewalDueClients.length > 0 && (
        <div className="dashboard-renewal-section">
          <div className="section-title" style={{ marginTop: 12 }}>
            📋 {t(lang, 'dueForRenewal')} ({renewalDueClients.length})
          </div>
          {renewalDueClients.map(c => {
            const pkg = getCurrentPackage(c);
            const { effective } = getEffectiveClientCount(c, state.sessions);
            return (
              <div key={c.id} className="renewal-row card">
                <div style={{ flex: 1 }}>
                  <div className="client-name">{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t4)' }}>
                    {t(lang, 'session')} {effective}/{pkg.contractSize}
                  </div>
                </div>
                <button className="btn-renew" onClick={() => { haptic(); setRenewClient(c); }}>
                  {t(lang, 'renewContract')}
                </button>
              </div>
            );
          })}
        </div>
      )}
```

Make sure this block appears in both the Expanded and Compact view returns (if Dashboard has separate branches for each). If Dashboard renders one JSX tree that handles both, one insertion is enough.

- [ ] **Step 4: Render RenewalModal**

Before the closing tag of the Dashboard component, add:

```jsx
      <RenewalModal
        show={!!renewClient}
        client={renewClient}
        sessions={state.sessions}
        onClose={() => setRenewClient(null)}
        dispatch={dispatch}
        lang={lang}
      />
```

- [ ] **Step 5: Dev server check**

```bash
npm run dev
```

With one red-flagged client: Home/Dashboard should show "📋 Due for renewal (1)" above Upcoming Sessions. The row shows the client name + session count. Tapping Renew opens RenewalModal. Confirm → section count drops.

Kill dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.jsx
git commit -m "feat(v2.9): Dashboard Due for renewal section + RenewalModal

New section above Upcoming Sessions listing all clients with renewal due.
Renew buttons open the shared RenewalModal.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 11: CSS classes + i18n keys + app-health.md

**Files:**
- Modify: `src/styles.css`, `src/i18n.js`
- Create: `docs/app-health.md`

**Rationale:** Styling for all red-state surfaces + the new form fields. All i18n keys in both en and ar. App Health umbrella doc with the Feature Overhead Register.

- [ ] **Step 1: Add CSS classes to styles.css**

Append to `src/styles.css`:

```css
/* ─── v2.9 Session Contracts — red renewal-due state ─── */
.card-renewal-due {
  border-inline-start: 3px solid #EF4444;
  background: color-mix(in srgb, var(--card-bg, white) 92%, #EF4444);
}

.renewal-pill {
  display: inline-block;
  background: #EF4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 4px;
}

.btn-renew {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-renew:active { transform: translateY(1px); }

.dashboard-renewal-section {
  margin-top: 12px;
}

.renewal-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-inline-start: 3px solid #EF4444;
  background: color-mix(in srgb, var(--card-bg, white) 92%, #EF4444);
  margin-bottom: 8px;
}

.booking-renewal-banner {
  background: rgba(239, 68, 68, 0.12);
  border-inline-start: 3px solid #EF4444;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--t2, inherit);
  margin-bottom: 12px;
}
```

- [ ] **Step 2: Add i18n keys (en + ar) to i18n.js**

In `src/i18n.js`, inside the `en` object, add:

```js
  // v2.9 keys
  periodLengthValue: 'Length',
  periodLengthUnit: 'Unit',
  unitDay: 'Day',
  unitWeek: 'Week',
  unitMonth: 'Month',
  contractSize: 'Contract size',
  contractOptional: '(blank = no contract)',
  contractPlaceholder: 'e.g. 10',
  packageNumber: 'Package',
  session: 'Session',
  renewContract: 'Renew',
  renewalDue: 'Renewal due',
  dueForRenewal: 'Due for renewal',
  confirmRenewal: 'Confirm renewal',
  newPeriodStart: 'New period start',
  renewalNotesOptional: 'Notes (optional)',
  renewalNotesPlaceholder: 'e.g. paid $500 cash',
  packageLimitHit: 'Package limit hit',
  willAutoRenew: 'booking this session will auto-renew',
```

And mirror in the `ar` object:

```js
  // v2.9 keys (Arabic)
  periodLengthValue: 'المدة',
  periodLengthUnit: 'الوحدة',
  unitDay: 'يوم',
  unitWeek: 'أسبوع',
  unitMonth: 'شهر',
  contractSize: 'عدد الجلسات المتعاقد عليها',
  contractOptional: '(فارغ = بدون عقد)',
  contractPlaceholder: 'مثلاً 10',
  packageNumber: 'الباقة',
  session: 'الجلسة',
  renewContract: 'تجديد',
  renewalDue: 'مطلوب تجديد',
  dueForRenewal: 'مطلوب تجديدها',
  confirmRenewal: 'تأكيد التجديد',
  newPeriodStart: 'تاريخ بدء الفترة الجديدة',
  renewalNotesOptional: 'ملاحظات (اختياري)',
  renewalNotesPlaceholder: 'مثلاً دفع ٥٠٠$ نقداً',
  packageLimitHit: 'تم الوصول إلى حد الباقة',
  willAutoRenew: 'حجز هذه الجلسة سيجدد الباقة تلقائياً',
```

- [ ] **Step 3: Create docs/app-health.md**

```bash
cat > docs/app-health.md <<'EOF'
# PTApp App Health

Umbrella doc for forward-looking maintenance concerns — dials we can turn when
data blob, reducer time, sync payload, or UI density start feeling heavy.

Not a list of past incidents (those live in `CLAUDE.md` TRAPS). Not a known-bug
list (those live in `CLAUDE.md` KNOWN ISSUES). This file tracks **knobs we
deliberately introduced** so we don't forget they exist.

---

## Feature Overhead Register

Features with cost/granularity knobs. Revisit at each major version, or when
a listed trigger fires. When a trigger fires, turn the knob to the "lighter"
option and document the change in the changelog.

### Audit log (v2.9+)

- **Path:** medium
- **Current knob:** package-level events only — `package_created`,
  `package_renewed_manual`, `package_renewed_auto`, `package_edited`,
  `override_set`, `override_cleared`. No session-level events.
- **Heavier option:** add session-level events (add/edit/cancel). Estimated
  +5–10× entries.
- **Lighter option:** drop `package_edited` and override events, keep only
  renewals and creations. Estimated −60% entries.
- **Retention:** forever. No trim.
- **Revisit trigger:**
  - `state.auditLog.length > 10_000`
  - OR data blob > 2 MB
  - OR sync push > 3s on Pierre's Android

### Accounting (future — v3.x?)

- **Path:** medium (projected)
- **Current knob:** TBD at design time.
- **Heavier option:** full double-entry ledger per session (debit/credit per
  package sold, session delivered).
- **Lighter option:** monthly revenue rollup + per-client balance summary.
- **Revisit trigger:** design it lighter from day one unless reporting
  requirements explicitly demand more.

### (add future medium/heavy-path features here)

---

## Data Size Budget

Placeholder — seed if we ever hit sync or localStorage limits.

Rough targets:
- localStorage: under 5 MB (most browsers cap at 5–10 MB)
- Sync push payload: under 1 MB for reliable Beirut-internet pushes
- Single reducer dispatch: under 50 ms on Pierre's Android

---

## Performance Budget

Placeholder.

---

## Sync Health Notes

Current sync model is per-record `_modified` + `mergeById` union (v2.6+). See
`CLAUDE.md` TRAPS for the two data-loss incidents that shaped it. Any future
change to sync mechanics should be evaluated against both incidents.
EOF
```

- [ ] **Step 4: Dev server check**

```bash
npm run dev
```

Navigate the app end-to-end:
- Clients tab: edit a client, set contract=3, save. Red state appears if sessions ≥ 3.
- Dashboard: Due for renewal section appears above Upcoming Sessions.
- Schedule: booking a session for a red-flagged client → banner visible in confirm popup.
- Renewal modal: opens from both surfaces with matching styling.

Inspect the rendered HTML — CSS classes `card-renewal-due`, `renewal-pill`, `btn-renew`, `dashboard-renewal-section`, `renewal-row`, `booking-renewal-banner` should all apply and render visibly in red.

Toggle Arabic language via General panel → verify i18n strings render correctly in RTL (red borders flip from left to right via `border-inline-start`).

Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/i18n.js docs/app-health.md
git commit -m "feat(v2.9): CSS + i18n for renewal UI + app-health.md umbrella

All red-state classes theme-aware (use color-mix + var(--card-bg)). RTL
handled via border-inline-start. Full en+ar i18n for all new strings.
app-health.md seeded with Feature Overhead Register covering audit log
and future accounting.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

---

### Task 12: Version bump, docs, pre-deploy verification, merge, deploy

**Files:**
- Modify: `src/App.jsx` (version string), `src/components/General.jsx` (instructions URL), `CLAUDE.md`, `docs/changelog-summary.md`, `docs/changelog-technical.md`
- Create: `docs/instructions-v2.9.md`

**Rationale:** Final task wraps up version metadata, updates the instruction URL used from the General panel, documents the release in all three docs, runs pre-deploy verification (migration snapshot diff), merges to master, and deploys to gh-pages.

- [ ] **Step 1: Bump version in App.jsx**

In `src/App.jsx`, find the version string (likely in the debug panel text around `v2.8`) and update to `v2.9`.

- [ ] **Step 2: Update instructions URL in General.jsx**

In `src/components/General.jsx` line ~9, update the URL to point to `instructions-v2.9.md`.

- [ ] **Step 3: Create docs/instructions-v2.9.md**

```bash
cat > docs/instructions-v2.9.md <<'EOF'
# PTApp v2.9 — Session Contracts & Package History

## What's new

### Per-client session contracts
- Optional **contract size** on every client (default blank — no change for clients who pay monthly).
- When set (e.g. 10), the period **extends** until all 10 sessions are done — it no longer resets at month-end.
- When the 10th session is hit (including scheduled-future ones): **red renewal indicator**.

### New period model
- Replaces the old 4-option dropdown (1 month / 4 weeks / etc.) with a **value + unit** pair: "Month 1", "Days 15", "Week 2" — any combination.

### Two ways to renew
- **Explicit Renew button** — appears on red-flagged clients. Opens a modal where PT sets the new contract size, new period start, length.
- **Auto-advance on booking** — if PT books another session for a limit-hit client, the app automatically closes the current package and starts a new one with the booking as session 1.

### Visibility
- **Clients tab** — red card + Renew button.
- **Dashboard** — "Due for renewal (N)" section at the top when any client is flagged.
- **Booking confirm popup** — warning banner if the booked client is at limit.

### Package history
- Every client carries a full `packages[]` history — past packages stay in the record (start, end, size, closed-when, closed-how). Foundation for future accounting.

### Audit log
- New `state.auditLog[]` captures every package lifecycle event (create, renew_manual, renew_auto, edit, override_set/cleared). Visible in exported backup JSON. Forensic safety net.

## Data model
- Every client has `packages: Array<Package>` (at least one entry).
- Current open package is `packages[packages.length - 1]` with `end: null`.
- Root fields `periodStart` / `periodLength` / `sessionCountOverride` / `overridePeriodStart` are **removed** — all live inside the current package now.

## Migration (v2 → v3)
- Automatic on first load of v2.9. No user action required.
- Synthesizes one initial package per existing client, preserving all session counts and any active overrides.
- Non-destructive: no session data changed, only transformed.

## WhatsApp placeholders
- `{number}`, `{periodEnd}` — unchanged, work as before.
- **`{packageProgress}`** — NEW, opt-in. Renders as `"7/10"` for contract packages, empty otherwise.
EOF
```

- [ ] **Step 4: Append to changelog-summary.md**

```bash
cat >> docs/changelog-summary.md <<'EOF'

## v2.9 — Session Contracts & Package History

**Core:** Optional per-client contract size (default 10 when filled in); billing period extends past time window until contract is met; red "Renewal due" flag fires when hit; renewal via explicit button or auto-advance on next booking.

**Data model:** Every client now has `packages[]` — first-class history of past + current packages. Root `periodStart` / `periodLength` / override fields moved inside the current package. DATA_VERSION bumped 2→3, migration automatic and non-destructive.

**UI:** Edit form billing section rewrites period as unit+value, adds contract field, status line "Package #N · Session X/Y". Red state on Clients cards + Dashboard "Due for renewal" section + booking confirm banner. Shared RenewalModal used from both Clients and Dashboard.

**Forensics:** `state.auditLog[]` captures every package lifecycle event. Append-only, syncs via mergeById union. Inspect via exported backup.

**New doc:** `docs/app-health.md` — Feature Overhead Register tracks knobs on medium/heavy-path features (audit log, future accounting).
EOF
```

- [ ] **Step 5: Append to changelog-technical.md**

```bash
cat >> docs/changelog-technical.md <<'EOF'

## v2.9 — Technical changelog

### Data model
- `DATA_VERSION` 2 → 3.
- New field on every client: `packages: Array<Package>`.
- Package shape: `{ id, start, end, periodUnit, periodValue, contractSize, sessionCountOverride, notes, closedAt, closedBy }`.
- Removed from client root: `periodStart`, `periodLength`, `sessionCountOverride`, `overridePeriodStart`.
- New top-level array: `state.auditLog: Array<LogEntry>`.
- Log entry shape: `{ id, ts, clientId, clientName, event, packageId, newPackageId, before, after, trigger }`.

### New exports from utils.js
- `computeSlidingWindow(anchor, unit, value, refDate)` — generalized anchored-period math.
- `parseLegacyPeriodLength(legacyValue)` — v2→v3 migration helper.
- `getCurrentPackage(client)` — last open package, with safe default.
- `getEffectivePeriod(pkg, refDate)` — returns `{start, end}`; contract packages return `{start, null}`.
- `isRenewalDue(client, sessions)` — high-level predicate for UI red-state detection.

### Rewritten
- `getEffectiveSessionCount`, `getEffectiveClientCount` — now read from current package.
- `getSessionOrdinal`, `getPeriodSessionCount` — support null period end for open-ended contract packages.
- `fillTemplate` — handles new `{packageProgress}` placeholder; `{periodEnd}` falls back to sliding window end when the current package has no fixed end.
- `getClientPeriod` — now a thin compat wrapper around `getCurrentPackage` + `getEffectivePeriod`.

### New reducer action
- `RENEW_PACKAGE` — atomic close-and-open of current package + one auditLog append. Payload: `{ clientId, newPackageStart, newContractSize, newPeriodUnit, newPeriodValue, newNotes, closedBy, trigger }`.

### Enhanced reducer action
- `EDIT_CLIENT` — detects current-package field changes and appends `package_edited` / `override_set` / `override_cleared` entries to auditLog atomically.

### Migration v2 → v3 (in migrateData)
- Synthesizes one initial package per client from legacy fields. Anchors at `periodStart` ?? earliest session date ?? today.
- Active v2 overrides (with matching `overridePeriodStart`) migrated inside the package.
- Stale v2 overrides dropped (were inert in v2 anyway).
- Seeds `state.auditLog[]`; appends one `package_created` entry per migrated client.

### Sync impact
- `mergeData` now also merges `auditLog` via `mergeById`. Append-only semantics make concurrent-device additions safe.

### UI
- New component `RenewalModal.jsx` — shared between Clients and Dashboard.
- `Clients.jsx` — edit form billing section rewritten (value+unit split, contractSize field, status line); card red state + inline Renew button.
- `Dashboard.jsx` — "Due for renewal (N)" section above Upcoming Sessions.
- `Schedule.jsx` — pre-dispatch renewal check in `saveSession`; confirm popup banner.
- `styles.css` — `.card-renewal-due`, `.renewal-pill`, `.btn-renew`, `.dashboard-renewal-section`, `.renewal-row`, `.booking-renewal-banner`.
- `i18n.js` — ~16 new keys (en + ar).

### New docs
- `docs/app-health.md` — Feature Overhead Register (audit log, future accounting).
- `docs/instructions-v2.9.md` — version user doc.

### Non-automated verification
- `tmp/sanity-slidingwindow.mjs` — computeSlidingWindow cases.
- `tmp/sanity-migration.mjs` — v2→v3 transformation.
- `tmp/sanity-counting.mjs` — counting + renewal-due detection.
- Delete `tmp/` directory after release.
EOF
```

- [ ] **Step 6: Update CLAUDE.md Current Version + Previous Version + link to app-health.md**

Update `CLAUDE.md`:
- Replace "Current Version: v2.8" with "Current Version: v2.9" and rewrite the bullet list describing the feature.
- Move the previous v2.8 section under "Previous Version: v2.8".
- In Project Structure or near the docs list, add: `docs/app-health.md — Feature Overhead Register, performance/size budgets`.

Since this edit is hand-crafted per file content, do it via Read/Edit in the implementation session rather than a scripted block.

- [ ] **Step 7: Run all sanity scripts one more time**

```bash
node tmp/sanity-slidingwindow.mjs && node tmp/sanity-migration.mjs && node tmp/sanity-counting.mjs
```

Expected: all three scripts exit 0 with "PASS" output.

- [ ] **Step 8: Pre-deploy snapshot diff on live data**

Export current data from the live PTApp (via General panel → Export backup). Save as `tmp/live-snapshot-v2.8.json`.

Create `tmp/sanity-live-migration.mjs`:

```js
// Load live data, run migration, verify every client's effective count is preserved.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const utilsUrl = pathToFileURL(new URL('../src/utils.js', import.meta.url).pathname).href;
const utils = await import(utilsUrl);

const liveV2 = JSON.parse(fs.readFileSync('tmp/live-snapshot-v2.8.json', 'utf8'));

// Compute v2-style counts BEFORE migration for comparison
// (use current month as period; matches pre-migration semantics for clients without custom period)
const preCountsByClient = {};
for (const c of liveV2.clients) {
  const period = utils.getClientPeriod(c, utils.today());
  preCountsByClient[c.id] = utils.getPeriodSessionCount(liveV2.sessions, c.id, period.start, period.end);
}

// Simulate localStorage and run migration
global.localStorage = {
  _data: { 'ptapp-data': JSON.stringify(liveV2) },
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
};
const migrated = utils.loadData();

// Compute v3 effective counts
let allMatch = true;
for (const c of migrated.clients) {
  const { effective } = utils.getEffectiveClientCount(c, migrated.sessions);
  const pre = preCountsByClient[c.id];
  if (effective !== pre) {
    console.error(`MISMATCH for ${c.name} (${c.id}): pre=${pre}, post=${effective}`);
    allMatch = false;
  } else {
    console.log(`✓ ${c.name}: ${effective}`);
  }
}
console.log(allMatch ? '\nAll counts preserved.' : '\n⚠ Some counts mismatched.');
process.exit(allMatch ? 0 : 1);
```

Run:
```bash
node tmp/sanity-live-migration.mjs
```

Expected: exit 0, all clients' counts preserved. If any mismatch → **investigate before deploying**. Compare the v2 period vs synthesized v3 package; most likely a client had an unusual period config that needs manual migration adjustment.

- [ ] **Step 9: Build and verify bundle**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: no syntax errors. test-bundle.js passes node --check, deleted cleanly.

- [ ] **Step 10: Commit version bump and docs**

```bash
git add src/App.jsx src/components/General.jsx CLAUDE.md docs/instructions-v2.9.md docs/changelog-summary.md docs/changelog-technical.md
git commit -m "docs(v2.9): promote to current version + instructions + changelogs

Bumps version in App.jsx debug panel + General panel instructions URL.
CLAUDE.md current = v2.9, previous = v2.8. New docs/instructions-v2.9.md
for end-user-facing version notes. Both changelogs updated.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push
```

- [ ] **Step 11: Merge feature branch to master**

```bash
git checkout master
git pull origin master
git merge --no-ff feature/v2.9-contracts -m "Merge feature/v2.9-contracts: session contracts + package history"
git push origin master
```

- [ ] **Step 12: Deploy to gh-pages**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json
git commit -m "Deploy v2.9: session contracts + package history"
git push origin gh-pages
git checkout master
```

- [ ] **Step 13: Clean up sanity scripts**

```bash
rm -rf tmp/
git add -A
git commit -m "chore(v2.9): remove post-release sanity scripts"
git push origin master
```

- [ ] **Step 14: Delete feature branch**

```bash
git branch -d feature/v2.9-contracts
git push origin --delete feature/v2.9-contracts
```

- [ ] **Step 15: Announce to Pierre in chat**

Tell Pierre:
- **v2.9 deployed**. Live at https://pih-dev.github.io/PTApp/.
- Migration v2→v3 runs automatically on first load — no action needed from PT or Pierre.
- New things to test on device:
  - Set a contract on a test client → book sessions → see red flag at N.
  - Renew flow on red-flagged client (both auto-advance on booking AND the Renew button).
  - Arabic mode: verify border-inline-start flips, all new strings translated.
  - iPhone standalone: confirm migration runs on first reopen after install.

---

## Self-Review Summary

**Spec coverage:** every section of the spec has a corresponding task.

| Spec section | Task(s) |
|---|---|
| §3 Data Model | Task 2 (migration), Task 4 (reducer) |
| §4 Counting | Tasks 1, 3 |
| §5.1 Edit form | Task 5 |
| §5.2 Card red state | Task 6 |
| §5.3 Renewal modal | Tasks 7, 8 |
| §5.4 Auto-advance | Task 9 |
| §5.5 Dashboard section | Task 10 |
| §5.6 Booking banner | Task 9 |
| §6 Audit log | Tasks 2, 4 |
| §7 Migration | Task 2 |
| §8 Red highlight detection | Task 3 (`isRenewalDue`) |
| §9 Templates | Task 3 (`fillTemplate` with `{packageProgress}`) |
| §10 Edge cases | Spread across Tasks 3, 4, 9 (handled by reducer + counting logic) |
| §11 Files touched | Tasks 5–11 |
| §12 Testing strategy | Sanity scripts in Tasks 1, 2, 3; manual checks in every task; snapshot diff in Task 12 |
| §13 Rollout | Task 12 |

**Placeholder scan:** no TBDs in implementation steps; only in the docs' explicit "future work" sections.

**Type consistency:** `Package`, `LogEntry`, reducer payloads all match across tasks. `closedBy` is consistently `'manual' | 'auto' | 'migration'`. Override has `periodStart` inside everywhere.

**Frequent commits:** every task ends with a commit + push, 12+ commits total across implementation.
