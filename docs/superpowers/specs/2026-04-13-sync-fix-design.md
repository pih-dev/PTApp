# Sync Architecture Fix — Design Spec

**Date:** 2026-04-13
**Trigger:** Data loss incident — PT lost all Apr 13 sessions, focus tags, and notes
**Root cause:** See `memory/incident_data_loss_20260413.md` for full forensic analysis

## Problem Statement

The current sync architecture has two critical flaws that combined to cause real data loss:

1. **Stale push race condition (App.jsx):** The sync effect `[state]` runs on first render, consuming the `skipSync.current = true` flag. When `fetchRemoteData` fails or is still pending, auto-complete (or any user interaction) pushes stale localStorage to GitHub, overwriting fresh remote data.

2. **Silent failure + last-write-wins:** `debouncedSync` swallows errors with `.catch(() => {})`. No merge logic exists — each push is a full overwrite. Neither the PT nor Pierre have any indication when sync fails.

### Forensic Evidence

- Pierre's Android localStorage was frozen at Apr 11 state (35 sessions, commit `edb63aa`)
- At 10:12 Beirut Apr 13, remote data.json was overwritten with the Apr 11 state + 4 auto-completed sessions
- PT's focus tags and notes were NEVER in remote — his pushes also failed silently
- Session ID comparison between `edb63aa` (Apr 11) and `ca763e7` (Apr 13 10:12) = exact match

## Approaches Considered

### Approach A — Minimal (guard only)
- Add `initialLoad` check to sync effect — block pushes until fetch completes
- Prevents the exact stale-push scenario
- **Pros:** Simplest change, minimal risk of new bugs
- **Cons:** PT still won't know if pushes are failing. Silent failures persist.
- **Verdict:** Insufficient. Addresses symptom, not the trust problem.

### Approach B — Moderate (guard + indicator + pre-push check) ✅ SELECTED
- Guard sync effect with `initialLoad`
- Add `_lastModified` timestamp to data payload
- Before pushing, compare local vs remote `_lastModified` — refuse to overwrite newer data
- Show sync status indicator (synced / syncing / failed)
- On failure, show visible warning
- **Pros:** Directly addresses both flaws. Moderate complexity. User gets feedback.
- **Cons:** Doesn't handle true merge (if both devices edit different sessions simultaneously). But this is very rare for a 2-user app.
- **Verdict:** Right balance of safety and simplicity.

### Approach C — Full merge architecture
- All of B, plus `updatedAt` on every session
- On startup, merge remote + local by session ID (keep newest version of each)
- **Pros:** Most robust. Handles simultaneous edits gracefully.
- **Cons:** Complex merge logic. Conflict resolution edge cases. Risk of introducing new bugs. Over-engineering for a 2-user app where one user (Pierre) rarely edits data.
- **Verdict:** Deferred. Can be added later if B proves insufficient.

## Selected Design: Approach B

### 1. Data Schema Change

Add `_lastModified` (ISO timestamp) to the top-level data object:

```json
{
  "_dataVersion": 3,
  "_lastModified": "2026-04-13T07:22:16.000Z",
  "clients": [...],
  "sessions": [...],
  "templates": {...},
  "todos": [...]
}
```

**Migration:** In `migrateData()` (utils.js), if `_lastModified` is missing, set it to `new Date().toISOString()`. No version bump needed — this is additive.

### 2. Sync Effect Guard (App.jsx)

**Current bug:** The sync effect runs on first render, consuming the `skipSync` flag.

**Fix:** Add `initialLoad` to the sync effect's guard:

```jsx
useEffect(() => {
  saveData(state);
  // Don't push to GitHub until initial fetch completes
  if (initialLoad || skipSync.current) {
    skipSync.current = false;
    return;
  }
  const token = getToken();
  if (token) {
    debouncedSync(token, state);
  }
}, [state]);
```

This ensures no push can happen before the app has fetched and reconciled with remote data.

### 3. Pre-Push Timestamp Check (sync.js)

Before pushing, fetch the remote's `_lastModified`. If remote is newer than local, **do not push**. Instead, fetch the fresh remote data and `REPLACE_ALL`.

```
pushRemoteData(token, data):
  1. If currentSha exists (not first push):
     - Fetch remote data
     - Compare remote._lastModified vs data._lastModified
     - If remote is newer: return { conflict: true, remoteData }
     - If local is newer or equal: proceed with push
  2. Push data with updated _lastModified = now()
  3. Return { conflict: false }
```

The caller (App.jsx `debouncedSync`) handles the conflict by dispatching `REPLACE_ALL` with the fresher remote data.

**Important:** This check adds one extra API call per push when `currentSha` is stale. Since pushes are debounced to 1s, this is acceptable.

### 4. Sync Status Indicator (UI)

A small status indicator visible in the header or near the version badge:

- **Synced** (green dot or checkmark) — last push succeeded, data matches remote
- **Syncing** (blue spinner) — push in progress
- **Failed** (red dot + "Sync failed" text) — last push failed, tap to retry

**Location:** Next to the version badge in the header (always visible, not buried in General panel). Small and unobtrusive but noticeable when red.

**State management:** Add `syncStatus` state to App.jsx: `'idle' | 'syncing' | 'synced' | 'failed'`

### 5. Error Surfacing (sync.js + App.jsx)

**Current:** `.catch(() => {})` swallows all errors.

**Fix:**
- `debouncedSync` returns a Promise (or calls a status callback)
- On success: set `syncStatus = 'synced'`
- On failure: set `syncStatus = 'failed'`
- On push start: set `syncStatus = 'syncing'`
- Token expiry (401): set `syncStatus = 'failed'` + show "Token expired" message

### 6. Initial Load Conflict Handling (App.jsx)

On app startup, after `fetchRemoteData`:

**Current:** Unconditional `REPLACE_ALL` with remote data.

**Fix:** Compare remote `_lastModified` vs local `_lastModified`:
- If remote is newer: `REPLACE_ALL` with remote (current behavior, correct)
- If local is newer: Push local to remote (local has unsync'd changes)
- If equal: No action needed (already in sync)
- If remote has no `_lastModified`: Treat as older (legacy data), push local

This prevents the "reopen app and lose local changes" scenario that hit the PT.

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils.js` | Add `_lastModified` to `initialData`, update `saveData`, add to `migrateData` |
| `src/sync.js` | Add pre-push timestamp check, return conflict info, add `fetchRemoteTimestamp` helper |
| `src/App.jsx` | Guard sync effect with `initialLoad`, add `syncStatus` state, handle conflicts, render indicator |
| `src/i18n.js` | Add translations for sync status strings |
| `src/styles.css` | Styles for sync indicator |

## What This Does NOT Fix

- **True merge conflicts** — If both devices edit the same session simultaneously, last-write-wins still applies at the whole-data level. Approach C (per-session merge) is deferred.
- **Offline queue** — If the device is offline for extended periods, changes accumulate but only the final state pushes. No offline queue with individual operations.
- **Real-time sync** — Still poll-on-open, not websocket/SSE. Adequate for 2-user app.

## Data Migration

- `_lastModified` is additive — no `_dataVersion` bump needed
- Old data without `_lastModified` gets it set to `now()` on first load
- Remote data without `_lastModified` is treated as "older" to avoid overwriting local

## Testing Plan

1. **Stale device scenario** (the exact incident): Open on device A, wait, open on device B with old localStorage, verify B fetches and doesn't push stale data
2. **Failed fetch scenario**: Simulate network failure on startup, verify no push happens
3. **Sync indicator**: Verify green/blue/red states show correctly
4. **Token expiry**: Use expired token, verify user sees error
5. **Normal flow**: Add session on device A, open device B, verify data appears
