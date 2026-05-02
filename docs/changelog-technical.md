# PTApp Changelog

Version history with context, decisions, and the reasoning behind each change.

---

## v2.9.5 — Arms→Bi/Tri tag split + Custom→Endurance type rename + v3→v4 migration (2026-05-02)

**Trigger:** PT requested finer-grained arm tracking. Single 'Arms' tag couldn't distinguish biceps-focused vs triceps-focused sessions. PT also reframed the misnamed 'Custom' session type as 'Endurance' (specifically "Strength Endurance" per his words).

### Decisions (Pierre, 2026-05-02 brainstorm round)

**D1 — Tag split shape:** 'Arms' deleted from FOCUS_TAGS catalog. 'Bi' and 'Tri' added as two independent tags (not a combined 'Bi/Tri' or a sub-hierarchy). Sessions can carry one or both depending on what was actually trained. Applied to both `Strength` and `Endurance` (formerly `Custom`) since both used the same anatomical tag list.

**D2 — Type rename, not delete:** 'Custom' renamed in place to 'Endurance'. SESSION_TYPES.length stays at 6 — the `SESSION_TYPES[5]` fallback at `src/utils.js:860` continues to resolve to a valid type. Color (`#6B7280`) and emoji (`🎯`) preserved so the visual signature in session cards is unchanged.

**D3 — History migration semantics (per Pierre 2026-05-02):**
1. **Per-client alternation, chronological by `${date} ${time} ${id}`**, starting with **Bi**, then Tri, then Bi… Each client has their own independent counter (no global ordering).
2. **Cancelled sessions COUNT.** Pierre revised an earlier "skip cancelled" answer mid-conversation: counting them keeps the sequence predictable when the PT eyeballs his history in date order — a cancelled session still occupies a calendar slot the PT remembers.
3. **Mixed-tag sessions** (e.g. `['Chest','Arms']`): only the 'Arms' slot is replaced; other tags are preserved. Result: `['Chest','Bi']` (or Tri depending on alternation position).
4. **Free-text `notes` field untouched.** Migration only walks the structured `focus` array.
5. **`session.type === 'Custom'` rewritten to 'Endurance'** on every session regardless of status.

### Code change — `src/utils.js`

**SESSION_TYPES (line 89-103):**
```js
// BEFORE
{ label: 'Custom', color: '#6B7280', emoji: '🎯' }

// AFTER
{ label: 'Endurance', color: '#6B7280', emoji: '🎯' }
```

**FOCUS_TAGS (line 105-118):**
```js
// BEFORE
Strength: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'],
Custom:   ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'],

// AFTER
Strength:  ['Chest', 'Back', 'Shoulders', 'Bi', 'Tri', 'Legs', 'Core', 'Glutes', 'Full Body'],
Endurance: ['Chest', 'Back', 'Shoulders', 'Bi', 'Tri', 'Legs', 'Core', 'Glutes', 'Full Body'],
```

**migrateData v3→v4 (new step):**
- Group sessions by `clientId` (orphans bucketed under `__orphan__`).
- Per group: stable sort by `${date} ${time} ${id}`, walk in order, keep an `armsCount` counter, replace each occurrence of `'Arms'` in `s.focus` with `armsCount % 2 === 0 ? 'Bi' : 'Tri'`.
- Separate pass: rewrite `s.type === 'Custom'` to `'Endurance'` on every session.
- Idempotent: a re-run finds no 'Arms' tags and no 'Custom' types, so nothing flips.
- `DATA_VERSION` bumped 3 → 4.

**App.jsx version label** bumped to `v2.9.5`.

### Propagation surface

`grep -rn "'Arms'" src/` returned only `src/utils.js:102, 107` — both updated. No hardcoded `'Custom'` literal anywhere outside the SESSION_TYPES definition (verified `grep -rn "'Custom'\|\"Custom\"" src/`). All component-side reads go through `FOCUS_TAGS[session.type]` lookup, which automatically returns the new lists post-rename.

### Tests

**New: `scripts/sanity/sanity-arms-migration.mjs`** — 17 assertions covering:
- DATA_VERSION reaches 4
- 6-session per-client alternation Bi/Tri/Bi/Tri/Bi/Tri (Alice)
- Cancelled session counted at position 2 (Tri)
- Out-of-order session inserts: chronological sort overrides array order
- Mixed `[Chest,Arms]` → `[Chest,Bi]`, `[Arms,Core]` → `[Tri,Core]` (Arms slot replaced in place)
- Per-client independence (Bob's first Arms is Bi, not Tri)
- No-Arms client (Cara): `focus` untouched
- `type === 'Custom'` → `'Endurance'` on every session, `'Strength'` unchanged
- Idempotency: re-running migration on already-migrated data is a no-op

All 17 pass.

**Updated: `scripts/sanity/sanity-migration.mjs`** — `dataVersion === 3` assertion bumped to `=== 4` since `migrateData` now runs both v2→v3 and v3→v4 steps in one pass.

**Pre-existing failure flagged + root cause confirmed by Pierre 2026-05-02:** `sanity-migration.mjs` "Alice active override migrated" check fails. The test fixture hardcodes `overridePeriodStart: '2026-04-02'` against monthly periods anchored at `2026-03-02`. Assertion was authored 2026-04-21 when the current sliding window was `2026-04-02 → 2026-05-01`, so `2026-04-02` matched and the override survived migration. Today is **2026-05-02** — the calendar rolled to the next window (`2026-05-02 → 2026-06-01`), so `2026-04-02` is now stale, the v2→v3 migration correctly drops the stale override, and the assertion fails. The migration code is correct; the test fixture is rotting. Out of scope for v2.9.5 — flagged for follow-up. Side note: my own session-context "today" was reported as 2026-04-29 (stale by 3 days), which masked this root cause until Pierre corrected it. Lesson: when a date-dependent test fails, run `date` first instead of trusting the session context's `currentDate`.

**Post-release fix (2026-05-02, this commit):** Alice's fixture stamp now computed at runtime via `computeSlidingWindow('2026-03-02', 'month', 1, todayStr).start`, mirroring the same call the migration makes. The assertion `A.packages[0].sessionCountOverride.periodStart === aliceWindow.start` checks against that computed value. Pattern matches what was already in place for Clients D and E (lines 65-90 of the test). Cara's stale-stamp fixture (`'2026-02-02'`) intentionally left hardcoded — it just needs to be "not the current window," which is permanently true for any 2026-anchored test as long as today is past Mar 2. New trap entry: "Hardcoded date stamps in test fixtures rot silently" (`docs/traps.md`).

### What this v2.9.5 release deliberately did NOT do

- **Did not add an Endurance-specific tag list.** Pierre confirmed Endurance keeps the same anatomical tags as Strength because the PT frames it as "Strength Endurance".
- **Did not strip 'Arms' from cancelled sessions and leave them with a smaller tag list.** Cancelled sessions go through the same alternation rewrite so no orphan 'Arms' tag survives in any session, anywhere.
- **Did not rewrite or re-emit audit log entries.** The v3→v4 migration is purely tag-and-type rewriting; no audit-log mutation.

### TRAP avoided

The `_archive` of trap-prone migration patterns (`docs/traps.md` "v2→v3 migration override-drop") was followed:
- Live-data diff: no Pierre-side export available pre-deploy on this run, so the sanity script's idempotency + per-client alternation tests stand in. Pierre will run `sanity-live-migration.mjs` against the PT's exported data on his next sync window before declaring the migration safe in production.
- Per-feature author-site drift: `grep` confirmed only one author site (`utils.js`) for both 'Arms' and `'Custom'` literals.

---

## v2.9.4 — Schedule focus-tag preserve (retroactive fix + documentation) (2026-04-21)

**Trigger:** SessionCard-refactor brainstorm (2026-04-21, `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md`) flagged that `Dashboard.jsx` preserves focus tags across inline type changes while `Schedule.jsx` clears them. Pierre immediately identified this as an **architected-and-approved** behavior that had been applied only to Dashboard back on 2026-04-02 (commit `eb29798`, "Preserve focus tags when switching session type") and never propagated to Schedule — nor recorded in either changelog. The behavior survived only as a file-level comment in Dashboard and as the commit message.

### The original (2026-04-02) decision, now in the record

> Switching a session's type (Strength → Cardio → Strength) must NOT wipe the selected focus tags. Tags from other types stay hidden (not deleted); they reappear when the PT switches back. This lets a single training session accumulate mixed-subcategory work across types — e.g., a Strength session records Back work, flips to Cardio for a segment, returns to Strength with Back still selected.

### Code fix

**`src/components/Schedule.jsx:199-204`** — remove `focus: []` from the inline type-selector dispatch:

```jsx
// BEFORE
{/* Inline type selector — change type, auto-clear focus tags */}
<select className="inline-type-select" value={session.type} onChange={e => {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value, focus: [] } });
}}>

// AFTER — mirrors Dashboard.jsx:177-179 exactly
{/* Inline type selector — keep focus tags so switching back preserves selections.
     Tags from other types stay hidden (not deleted) so a mixed-subcategory session
     can accumulate work across types without losing prior selections.
     Matches Dashboard behavior (decided 2026-04-02, commit eb29798). */}
<select className="inline-type-select" value={session.type} onChange={e => {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
}}>
```

No other consumers of the old behavior found:
```
$ grep -rn "focus: \[" src/
(no matches)
```

### Process lesson (the actual lasting deliverable)

Third instance of "architected-behavior-only-partially-propagated" in the v2.8 → v2.9.x window:

| Version | Behavior | Missed sites |
|---------|----------|--------------|
| v2.8 → v2.8 fix | `parseSessionCountOverride` returns `.type`, not `.mode` | First implementation pass mis-read as `.mode` |
| v2.9 → v2.9.2 | Override storage moved client-root → `pkg.sessionCountOverride` | `Schedule.jsx` booking-pencil kept writing legacy root fields |
| v2.9.1 → v2.9.4 | Preserve focus tags across type changes (Apr 02 decision) | `Schedule.jsx` inline type-selector kept `focus: []` |

New TRAP added to `docs/traps.md` — two-part rule:
1. **Propagate in the same commit.** When committing an architected behavior decision, grep the codebase for the old behavior/field/dispatch shape BEFORE the commit. Do not trust the file you most recently touched.
2. **Record in the changelog.** Every architected behavior decision lands in `docs/changelog-summary.md` + `docs/changelog-technical.md`, not only in a file comment or commit message. File comments are easy to miss in review and indistinguishable from personal preference three weeks later. The changelog is the durable, searchable project record.

### Verification

- `grep -rn "focus: \[" src/` → 0 matches.
- Manual (pre-fix, Dashboard): Strength session → select Back → switch to Cardio → back to Strength → Back still selected ✓ (matches intended behavior).
- Manual (post-fix, Schedule): same flow in weekly view → tags preserved across type changes. Pending PT iPhone smoke test.
- Sanity scripts: unaffected (behavior lives in call-site dispatch shape, not in reducer logic). All four runnable sanity scripts still pass at their `scripts/sanity/` paths.
- Build + bundle syntax check pass.

### Files touched

| File | Change |
|------|--------|
| `src/components/Schedule.jsx` | Remove `focus: []` from inline type-selector dispatch; rewrite comment to mirror Dashboard |
| `src/App.jsx` | Version bump v2.9.3 → v2.9.4 in debug panel |
| `docs/traps.md` | New TRAP — architected-behavior-not-propagated + missing-from-changelog |
| `docs/changelog-summary.md` | Prepend v2.9.4 section |
| `docs/changelog-technical.md` | Prepend v2.9.4 section (this section) |
| `docs/instructions-v2.9.4.md` | NEW |
| `CLAUDE.md` | Current-version block promoted v2.9.3 → v2.9.4 |

### What v2.9.4 explicitly does NOT do

- **Not** the SessionCard refactor. Brainstorm is paused at step 3 of `superpowers:brainstorming` awaiting Pierre's scope answer (A/B/C). See `memory/project_sessioncard_brainstorm_paused.md`.
- **Not** a unification of the other Dashboard ↔ Schedule ↔ Sessions divergences (WhatsApp remind presence, notes-editing conditionality on Sessions, modal-target differences, cancelled-state action sets). Those belong to the SessionCard work.
- **Not** a normalization of the compact Dashboard card — that's its own decision inside the SessionCard brainstorm.

---

## v2.9.3 — Error boundary + sanity-script promotion (2026-04-21)

**Trigger:** post-v2.9.2 backlog cleanup (`memory/project_todo_after_v292.md`). Two of the items rated highest-value-per-effort: top-level React error boundary (#3 in the backlog) and promoting the sanity scripts out of wipe-able `tmp/` (#8). No schema change, no migration, no new user feature.

### 1 — Top-level React error boundary

**Problem.** A render-time crash inside `<App />` (corrupted localStorage producing invalid state, future migration throwing, etc.) leaves the user with a blank white screen. Data is still in `localStorage['ptapp-data']`, but there's no UI path to it.

**Fix.** New `src/components/ErrorBoundary.jsx` — class component (React requires class for `getDerivedStateFromError` / `componentDidCatch`). `main.jsx` wraps `<App />`:

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

Recovery UI exposes three actions:
- **Download backup** — `localStorage.getItem('ptapp-data')` → `Blob` → `URL.createObjectURL` → invisible `<a download>` click. Filename `ptapp-backup-YYYY-MM-DDTHH-MM-SS.json`.
- **Try again** — `window.location.reload()`.
- **Reset (erase local data)** — `localStorage.removeItem('ptapp-data')` + reload, gated by a `window.confirm()` with bilingual EN+AR copy.

`componentDidCatch` logs the error to `console.error('[ErrorBoundary] App crashed:', error, info)` and stashes `info` in state for the collapsible `<details>` block at the bottom of the recovery UI.

**Deliberate isolation from app modules.** The boundary cannot depend on anything that might itself be the source of crash:
- No `i18n` import — copy is hardcoded EN+AR strings.
- No reliance on `styles.css` or CSS variables — all styling inline (`s` object), safe dark palette (`#0f172a` bg, `#f1f5f9` text, `#2563EB` primary, `#EF4444` danger).
- No shared components.

`env(safe-area-inset-top/bottom)` honored; max-width 480px prevents stretch on desktop; 14px button vertical padding for thumb-friendly tap targets.

### 2 — Sanity scripts moved `tmp/` → `scripts/sanity/`

**Problem.** Per `~/.claude/CLAUDE.md`, `tmp/` is documented wipe-able dev scratch. The five sanity scripts are first-class regression assets — `sanity-reducer.mjs` was extended in v2.9.2 with the inline-confirm regression block specifically to catch the Schedule.jsx bug class. Leaving them in a wipe-able folder was a latent risk.

**Move (git mv preserves history):**

```
tmp/sanity-counting.mjs        → scripts/sanity/sanity-counting.mjs
tmp/sanity-live-migration.mjs  → scripts/sanity/sanity-live-migration.mjs
tmp/sanity-migration.mjs       → scripts/sanity/sanity-migration.mjs
tmp/sanity-reducer.mjs         → scripts/sanity/sanity-reducer.mjs
tmp/sanity-slidingwindow.mjs   → scripts/sanity/sanity-slidingwindow.mjs
```

**Per-file edits:**

| Edit | Pattern |
|------|---------|
| Run header | `// Run: node tmp/X.mjs` → `// Run: node scripts/sanity/X.mjs` |
| utils import | `new URL('../src/utils.js', import.meta.url)` → `'../../src/utils.js'` |
| Stale comments | Removed `// Delete after v2.9 ships.` lines (proven long-lived) |
| Snapshot helper text (`sanity-live-migration.mjs`) | "save in tmp/" → "save in scripts/sanity/" |

**`.gitignore`** — added the new snapshot patterns alongside the old ones (kept both until the historical `tmp/` workflow is fully retired):

```
tmp/live-snapshot-*.json
tmp/*-snapshot.json
scripts/sanity/live-snapshot-*.json
scripts/sanity/*-snapshot.json
```

**Doc references updated:**
- `CLAUDE.md` — Data Preservation rule (line 108), deploy section (lines 252–253), all updated to `scripts/sanity/`.
- `docs/traps.md` — v2→v3 migration TRAP — three path mentions in the migration-gate workflow updated.

**Doc references intentionally left alone:**
- `docs/changelog-technical.md` v2.9.2 section, `docs/instructions-v2.9.2.md`, `docs/superpowers/plans/2026-04-20-session-contracts.md` — these are historical records; their `tmp/` references were accurate at write-time. Updating them retroactively would obscure history.

### Verification

```
node scripts/sanity/sanity-slidingwindow.mjs   → 13 passed, 0 failed
node scripts/sanity/sanity-migration.mjs       → all assertions pass (5 audit entries, A/B/C/D/E migration cases incl. Apr 21 calendar-month regression)
node scripts/sanity/sanity-counting.mjs        → all assertions pass (sliding window + override + future-session)
node scripts/sanity/sanity-reducer.mjs         → all assertions pass (incl. v2.9.2 inline-confirm regression block + RENEW_PACKAGE happy/auto/no-op paths)
```

`sanity-live-migration.mjs` not run — needs PT's local snapshot which is gitignored. To verify post-deploy, drop the latest export at `scripts/sanity/live-snapshot-v2.8.json` and run `node scripts/sanity/sanity-live-migration.mjs`.

Bundle build + Node syntax check on extracted JS: PASS. Error boundary inert until React throws (by design — can't unit-test "blank screen recovery" without injecting a synthetic crash).

### Files touched

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.jsx` | NEW (~140 lines) |
| `src/main.jsx` | +5 / −1 (wrap App, comment) |
| `src/App.jsx` | +1 / −1 (version bump) |
| `scripts/sanity/sanity-counting.mjs` | renamed + path bump |
| `scripts/sanity/sanity-live-migration.mjs` | renamed + path bump + helper text |
| `scripts/sanity/sanity-migration.mjs` | renamed + path bump |
| `scripts/sanity/sanity-reducer.mjs` | renamed + path bump |
| `scripts/sanity/sanity-slidingwindow.mjs` | renamed + path bump |
| `.gitignore` | +4 lines (new snapshot patterns + comment) |
| `CLAUDE.md` | path updates (3 locations) |
| `docs/traps.md` | path updates (4 locations in v2→v3 migration TRAP) |
| `docs/instructions-v2.9.3.md` | NEW |
| `docs/changelog-summary.md` | prepended v2.9.3 section |
| `docs/changelog-technical.md` | prepended this section |

### Lessons / process notes

**Why this version is small.** Per `feedback_review_after_changes.md`, after the v2.9.2 hot patch ran the codebase through the post-deploy review wringer, the next session deliberately picked **two small wins** rather than a larger refactor (item #4 — shared `<SessionCard>`). The bigger refactor needs brainstorming on prop-shape unification before touching code; the boundary + script-move are mechanical and de-risk future work without introducing churn.

**`tmp/` policy reaffirmed.** This move underscored the wider rule from `~/.claude/CLAUDE.md`: anything that must outlive cleanup goes outside `tmp/`. Live data snapshots → `_archive/`; durable dev tooling → `scripts/`.

---

## v2.9.2 — Post-deploy review fixes (2026-04-21)

**Trigger:** comprehensive code review run after v2.9 + v2.9.1 ship (per CLAUDE.md "review after 3+ feature changes" rule), plus a session-startup warning that CLAUDE.md had crossed the 40k char performance threshold (40.8k > 40.0k).

### Critical: Schedule.jsx booking-confirm inline override wrote legacy v2 root fields

**Bug:** the pencil-editor (`✎`) next to the session count in the booking confirm popup was dispatching `EDIT_CLIENT` with `client.sessionCountOverride` and `client.overridePeriodStart` at the **root** of the client object — the legacy v2 storage location that the v2→v3 migration explicitly deletes (`migrateData` strips both fields on load). Every override the PT typed from the booking popup was silently dropped on the next app load.

**Why nobody noticed:** the parallel `Clients.jsx` edit-form path was correct (writes into `pkg.sessionCountOverride`). Only the booking-popup quick-edit path was broken. Both paths visually look identical when the override is "just set" — the bug only manifested on next reload.

**Fix:** mirrored the `Clients.jsx:71-101` pattern in `Schedule.jsx`:

```jsx
const commitOverride = () => {
  const parsed = parseSessionCountOverride(overrideDraft);
  const pkg = getCurrentPackage(client);
  const probePeriod = getEffectivePeriod(pkg, session.date);
  const newPkg = {
    ...pkg,
    sessionCountOverride: parsed
      ? { ...parsed, periodStart: probePeriod.start }
      : null,
  };
  const pkgs = client.packages && client.packages.length
    ? [...client.packages.slice(0, -1), newPkg]
    : [newPkg];
  dispatch({ type: 'EDIT_CLIENT', payload: { ...client, packages: pkgs } });
  setEditingOverride(false);
};
```

`openOverrideEdit` reworked similarly to read from `pkg.sessionCountOverride` instead of the legacy root fields when prefilling the input.

**Regression test:** new "inline-confirm" block in `tmp/sanity-reducer.mjs` simulates the Schedule.jsx commit path end-to-end: builds a v3 client → dispatches the new payload shape → asserts (1) legacy root fields stay null, (2) override lives inside `packages[0].sessionCountOverride`, (3) `getEffectiveSessionCount` reads it correctly, (4) `EDIT_CLIENT` writes an `override_set` audit entry.

**Lesson logged:** new TRAP "Per-feature author-site drift — v2.9 inline override (Apr 21 2026)" added to `docs/traps.md`. The fix pattern: when refactoring a storage location, grep EVERY read AND write of the old field across the whole codebase, not just the file you're in. The original v2.9 work touched `Clients.jsx` thoroughly but missed the parallel quick-edit affordance in `Schedule.jsx`.

### Important: RenewalModal silent cross-device race

**Bug:** if two devices had `RenewalModal` open simultaneously and Device A confirmed first, Device B's Confirm tap dispatched `RENEW_PACKAGE` against an already-closed package. The reducer correctly no-op'd (idempotency guard from v2.9), but the modal closed without feedback — PT thought renewal happened on B; nothing did.

**Fix in `RenewalModal.jsx`:**
```jsx
const livePkg = getCurrentPackage(client);
if (livePkg && livePkg.end != null) {
  setError(t(lang, 'renewalAlreadyClosed'));
  return;
}
```
Pre-checks current package state before dispatch. On race detection, renders an inline error banner and keeps the modal open. New `error` useState added; cleared in the open-init effect.

**i18n:** new key `renewalAlreadyClosed` (en + ar).

### Important: Schedule.jsx O(N×M) renewal-due lookup memoized

**Problem:** with the booking form open, `isRenewalDue(c, state.sessions)` was called per render in two places — the auto-advance loop in `saveSession` (per selected client) and the renewal-due banner check (filter over all selected clients). On every keystroke in any form field, both ran. The function itself iterates the client's sessions to compute `getEffectiveSessionCount`. Cost: O(clients × sessions) per render.

**Fix:**
```jsx
const renewalDueIds = useMemo(
  () => new Set(state.clients.filter(c => isRenewalDue(c, state.sessions)).map(c => c.id)),
  [state.clients, state.sessions]
);
```
Both consumers now do `renewalDueIds.has(clientId)`. Added `useMemo` to React imports.

### Important: deprecated `getClientPeriod` removed

The v2.9 migration deprecated this helper but left the export in place "for backwards compatibility." Grep confirmed zero callers in `src/`. Deleted (lines 184-190 of `utils.js`). Defensive code that protects nothing is dead code — flagged in CLAUDE.md "no defensive code" rule.

### Important: explicit override-equality in EDIT_CLIENT audit logging

**Was:**
```js
if (JSON.stringify(oldOv) !== JSON.stringify(newOv)) { /* log */ }
```

**Issue:** key order sensitive. If a render produced `{value, type, periodStart}` instead of `{type, value, periodStart}`, the comparison would falsely report a change and emit a spurious `override_set` audit entry. Hadn't bitten yet but was a ticking bug.

**Now:**
```js
const ovEqual =
  (oldOv == null && newOv == null) ||
  (oldOv != null && newOv != null
    && oldOv.type === newOv.type
    && oldOv.value === newOv.value
    && oldOv.periodStart === newOv.periodStart);
if (!ovEqual) { /* log */ }
```

### Minor: `'9999-12-31'` sentinel removed from two call sites

`getPeriodSessionCount(client, sessions, periodStart, periodEnd)` already handled `null` for "no upper bound." Both call sites (`getEffectiveClientCount` in `utils.js`, `Clients.jsx:443`) were passing `period.end || '9999-12-31'`. Now they pass `period.end` directly. The fallback was a hangover from before the helper was nullable.

### Minor: Dashboard upcoming filter `!s.time` guard

Defensive guard for sessions imported from external data or pre-time-field legacy records that might lack `s.time`. Without it, `new Date(\`${date}T${undefined}\`).getTime()` returns NaN and the comparison silently misbehaves. Plus DST-edge-case comment on the local-time end-of-session calculation (matches the v2.9.1 convention).

### Minor: Audit log size visible in debug panel

`docs/app-health.md` flags audit log >10k entries as a revisit trigger. Without UI surface, there was no way to observe approach. Added one line to App.jsx debug panel: `Audit log: {state.auditLog?.length || 0}`.

### Minor: i18n + comments

- `aria-label="edit count"` (Schedule pencil button) → `t(lang, 'editCount')`. New i18n key.
- RenewalModal: comment explaining why brand-new contracts default to '10' (PT's typical pre-paid package size).

### Docs: CLAUDE.md slim-down (41.2k → 19.5k chars)

**Trigger:** session-startup warning `⚠ Large CLAUDE.md will impact performance (40.8k chars > 40.0k)`.

**Approach:**
- Extracted entire TRAPS section verbatim into new file `docs/traps.md` (19.6k chars).
- Replaced TRAPS section in CLAUDE.md with a one-line index — each trap is one bullet pointing into the new file.
- Collapsed older-version sections (v2.5–v2.8) to one-line pointers to their `instructions-v*.md`.
- Updated Reducer actions table to include `RENEW_PACKAGE`.
- Removed outdated text about silent sync errors (already fixed in v2.5/v2.6).
- Added new "Current Version: v2.9.2" section.
- Two new TRAPS entries added during the slim-down: "Per-feature author-site drift" (this incident) and "Parser contract `.type` not `.mode`" (promoted from inline mention in v2.8 prose).

**Result:** CLAUDE.md = 19,461 chars; docs/traps.md = 19,651 chars. Combined 39,112 — but only CLAUDE.md is loaded into every Claude session, and traps.md is read on-demand when the relevant area is touched.

### What didn't change

- No schema change. `_dataVersion` stays at 3. No migration step.
- No CSS changes.
- No sync behavior changes.
- No new features.
- `Clients.jsx` override-write path was already correct (uses `pkg.sessionCountOverride`) — untouched.

### Verification

All 4 sanity scripts pass after each batch:
- `tmp/sanity-reducer.mjs` (with new "inline-confirm" regression block) — PASS
- `tmp/sanity-counting.mjs` — PASS
- `tmp/sanity-slidingwindow.mjs` — PASS
- `tmp/sanity-migration.mjs` — PASS

Bundle integrity verified: `node --check` on extracted JS bundle from `dist/index.html` — clean.

### Ship size

| File | Δ |
|------|---|
| `src/components/Schedule.jsx` | +33 / −18 (Critical fix + memo) |
| `src/components/RenewalModal.jsx` | +21 / −0 |
| `src/components/Dashboard.jsx` | +6 / −0 |
| `src/components/Clients.jsx` | +1 / −1 |
| `src/utils.js` | +12 / −14 |
| `src/i18n.js` | +4 / −0 |
| `src/App.jsx` | +4 / −1 |
| `tmp/sanity-reducer.mjs` | +28 / −2 |
| `CLAUDE.md` | +98 / −355 (slim-down) |
| `docs/traps.md` | NEW (+458) |

Commits: `388138b` (master) / `baa95bb` (gh-pages). Deployed Apr 21, 2026.

---

## v2.9.1 — Upcoming rolls off completed 2h past end (2026-04-21)

**Problem:** v2.7's `upcoming` filter kept `status !== 'cancelled' && date >= today()`. Today's completed sessions stayed visible until midnight — useful for day-progress awareness, but by evening the list was dominated by done-already cards while tomorrow's sessions sat at the bottom. Pierre reported scroll fatigue on 2026-04-21.

### Change

`src/components/Dashboard.jsx` — filter extended with a completed-rolloff predicate:

```jsx
if (s.status === 'completed') {
  const endMs = new Date(`${s.date}T${s.time}`).getTime() + (s.duration || 45) * 60000;
  if (nowMs - endMs >= TWO_HOURS_MS) return false;
}
```

- `nowMs = Date.now()` captured once above the filter (not per-iteration).
- `TWO_HOURS_MS = 2 * 60 * 60 * 1000`.
- End time computed with local-time `new Date(\`${s.date}T${s.time}\`)` — no `Z` suffix, so no UTC conversion (avoids the documented `toISOString` trap).
- `s.duration || 45` matches the `isNowSession` convention above — old records may lack the field.
- The pre-existing `s.date < todayStr` guard stays as a defensive stale-scheduled safeguard.

### Why threshold lives on end time, not on when the user tapped Complete

Auto-complete (v2.5) already flips `scheduled → completed` 1h after end time. Tying rolloff to end time means a 17:00–18:00 session:
- 18:00 — ends, `scheduled`
- 19:00 — auto-completed
- 20:00 — 2h past end, rolls off ✓

If the PT taps Complete early (e.g., at 17:45), the session still rolls off at 20:00, not 19:45 — matches the mental model "the session was until 18:00."

### What didn't change

- `src/components/Schedule.jsx` day view — still shows every session for the selected day.
- `src/components/Sessions.jsx` — full history unchanged.
- Dashboard stat cards (Today, This Week) — unchanged.
- No-shows (past end time, still `status === 'scheduled'`) stay in Upcoming by design — the PT still needs to act on them.
- No i18n, no CSS, no schema, no sync behavior.

### Views covered

Both Expanded and Compact Dashboard views share the `upcoming` array (per v2.7), so the single filter change covers both.

### Ship size

13 lines added / 4 removed in Dashboard.jsx. Version bump v2.9 → v2.9.1 in App.jsx debug panel.

---

## v2.8 — Manual Session Count Override (2026-04-20)

**Problem:** The period session count was computed purely from session records (scheduled + completed in the current billing period). When the app's count disagreed with the PT's paper records, his only recovery options were destructive: add a fake retroactive session or cancel-without-count an existing one. Both pollute history permanently and compound over time.

### Data model
- `client.sessionCountOverride: { type: 'absolute' | 'delta', value: number } | null` — new optional field.
- `client.overridePeriodStart: 'YYYY-MM-DD' | null` — the `period.start` at the time the override was saved. Used to gate whether the override is "active" (matches current period).
- No migration. `DATA_VERSION` stays at 2. Pre-v2.8 client records load with both fields absent → treated as null.

### New utilities (`src/utils.js`)
- `parseSessionCountOverride(raw)` — parses user input into `{ type, value }` or null. Handles `"10"` (absolute), `"+1"`/`"-1"` (delta), `""` / `"+0"` / `"-0"` / junk (null).
- `getEffectiveSessionCount(client, session, sessions) → { auto, effective, override }` — per-session effective count. Gates override on `overridePeriodStart === period.start`; falls through to auto when expired.
- `getEffectiveClientCount(client, sessions) → { auto, effective, override }` — client-scoped (as of today). Uses `getPeriodSessionCount` instead of `getSessionOrdinal` since there's no session anchor.
- `fillTemplate` now calls `getEffectiveSessionCount` instead of `getSessionOrdinal` for the `{number}` placeholder in WhatsApp templates.

### New components
- `SessionCountPair` (`src/components/SessionCountPair.jsx`) — shared renderer. Solo `#N` when no override active; pair `#N → M` when override active. Reused on Dashboard (expanded + compact), Schedule day view, Sessions list, and as the preview in the Clients form + Schedule booking confirm popup. Prefix defaulted to `#` for session sites, set to `""` for the chip/preview contexts.
- `OverrideHelpPopup` (`src/components/OverrideHelpPopup.jsx`) — shared long-press help modal. Explains parsing rules (absolute vs delta vs empty) with a conditional Clear button (only rendered when `onClear` prop is provided). Reused in Clients form and Schedule booking confirm popup.

### Modified components
- `Clients.jsx` — edit form gains override input + live preview + long-press help. Draft string stored in form state (`sessionOverride`), parsed on save via `parseSessionCountOverride`. `overridePeriodStart` stamped with `getClientPeriod(rest, today()).start` at commit time. Stale overrides (`overridePeriodStart !== currentPeriod.start`) are not prefilled on edit, so the PT sees a blank field in a new period.
- `Schedule.jsx` — day-view session card uses `SessionCountPair` via `getEffectiveSessionCount`. Client chip in the booking form uses `getEffectiveClientCount` (renders `(12)` solo or `(12→13)` paired). Booking confirm popup adds a pencil button that toggles an inline input; onBlur dispatches `EDIT_CLIENT` with the parsed override + stamped period. Fresh-session merge pattern (same as the v2.5 Session #0 fix) ensures the just-booked session is visible to the count helpers even if `state.sessions` hasn't updated yet in the closure.
- `Dashboard.jsx` — both session-card render sites (expanded lines 107+, compact lines 207+) use `SessionCountPair` via `getEffectiveSessionCount`. Replaced the previous `getSessionOrdinal` inline span.
- `Sessions.jsx` — session-row render uses `SessionCountPair` via `getEffectiveSessionCount`. Replaced the previous `getSessionOrdinal` inline span.

### Styles (`src/styles.css`)
- New classes: `.count-pair`, `.count-auto`, `.count-arrow`, `.count-effective`, `.count-auto-solo`, `.period-override-row`, `.period-count-preview`, `.override-input`, `.override-edit-btn`, `.override-help-body`.
- Theme-specific overrides under `.theme-light` keep the arrow and effective pill legible against the steel-blue canvas.
- Existing `.session-count` bumped from 0.5 → 0.72 alpha in both themes (the client list card readability fix the PT explicitly asked for).

### i18n keys (en + ar)
- `countAuto` (en: "Auto", ar: "تلقائي")
- `overridePlaceholder` (hint shown in the input field)
- `overrideHelpTitle` (popup title)
- `overrideHelpBody` (popup body explaining syntax)
- `overrideClear` (button label on the help popup)

### UX decisions
- **Long-press instead of hint text.** The initial design had a second row with syntax examples. Pierre pushed back — too much visual weight for a rarely-used feature. Long-press (500ms) on the input opens the help popup on mobile; right-click (onContextMenu) does the same on desktop. 500ms matches the existing debug-panel long-press in App.jsx.
- **Pencil toggle in booking popup.** The confirm popup's job is "confirm this thing, then dispatch a WhatsApp message". Adding a permanent input would crowd the success-center visual. A pencil button that swaps the SessionCountPair for an input is a compromise between discoverability and restraint.
- **Live preview computed inline in the Clients form.** An IIFE that reads form state + sessions + computes effective. Not ideal architecturally — a custom hook would be cleaner — but scoped tightly enough that the duplication with Schedule.jsx isn't worth abstracting yet.
- **`.type` not `.mode`.** Parser contract is `{ type, value }`. During implementation, the first draft of Clients.jsx and Schedule.jsx consumer code read `.mode` instead of `.type` — would have silently misread saved deltas as absolutes. Caught during static verification (Task 12) before deploy.

### Sync impact
- Both new fields ride the existing `EDIT_CLIENT` path → reducer stamps `_modified` → v2.6 per-record merge preserves the later write. No changes to `sync.js` or `reconcile()`.
- On initial load, if two devices set different overrides on the same client within seconds, the later `_modified` wins. If mother's phone pushes a stale override from an expired period, the field sits inert in storage (period mismatch → not applied). Acceptable trade-off per "never lose user data" — deleting the stale field would be silently destructive.

### Version bumps
- `src/App.jsx` debug badge: v2.7 → v2.8.
- `src/components/General.jsx` instructions URL: corrected from the long-drifted `instructions-v2.4.md` to `instructions-v2.8.md`.

### Known trade-offs
- The client list card shows lifetime count (unchanged), not period count. The override doesn't apply there because it's period-scoped. Documented in instructions-v2.8.md.
- Negative delta results clamp at 0 via `Math.max(0, auto + value)`. Negative session counts aren't meaningful and would look wrong in WhatsApp messages.
- Non-numeric input is silently cleared on save rather than showing a validation error. The live preview reflects this (reverts to solo auto when input doesn't parse), so the PT gets immediate visual feedback without a formal error state.

---

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
- `i18n.js` — ~19 new keys (en + ar).

### New docs
- `docs/app-health.md` — Feature Overhead Register (audit log, future accounting).
- `docs/instructions-v2.9.md` — version user doc.

### Non-automated verification
- `tmp/sanity-slidingwindow.mjs` — computeSlidingWindow cases.
- `tmp/sanity-migration.mjs` — v2→v3 transformation.
- `tmp/sanity-counting.mjs` — counting + renewal-due detection.
- Delete `tmp/` directory after release.

---

## v2.7 — Upcoming Sessions on Dashboard (2026-04-20)

**Problem:** The Dashboard's main section was labeled "Today's Sessions" and filtered on `s.date === today()`. At 8pm on Apr 19, a session scheduled for Apr 20 07:00 was not visible on the home screen until midnight crossed. The PT's day-ahead planning window was blind. The Compact view already showed upcoming sessions (filtered `s.date >= today()`, limited to 5) but it was the secondary view most users don't switch to.

**Design:** Single unified `upcoming` array consumed by both views:

```js
const todayStr = today();
const upcoming = state.sessions
  .filter(s => {
    if (s.status === 'cancelled') return false;
    if (s.date < todayStr) return false;
    return true;
  })
  .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

Filter rules:
- `cancelled` → hidden always
- `date < today` → hidden always (covers stale scheduled AND past completed)
- Everything else (scheduled, confirmed, today's completed, today's cancelled-but-not-yet-counted) → shown

String comparison on `YYYY-MM-DD` gives correct lexicographic ordering — no `new Date()` parsing needed. Sort by date ascending then time ascending puts the closest session at the top.

**Changes in `src/components/Dashboard.jsx`:**

1. Kept `todaySessions` calc (still feeds the "Today" stat card — different concept from the list).
2. Kept `isNowSession` + `nowMinutes` helpers (still drives the amber `card-now` glow on in-progress sessions).
3. Removed `upcomingSessions` variable (its filter + slice was obsolete).
4. Added `upcoming` array and `todayStr` constant.
5. Replaced conditional section title (`todaySessions` count in expanded / no-count label in compact) with unified `📅 Upcoming Sessions (${upcoming.length})` shown in both views.
6. Expanded branch now iterates `upcoming` instead of `todaySessions`. Empty state uses `noUpcoming` instead of `noSessionsToday`.
7. Added a date line inside each expanded card's left column, below the time/type meta:
   ```jsx
   <div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>
     {session.date === todayStr ? t(lang, 'today') : formatDate(session.date, lang)}
   </div>
   ```
   Today's cards show "Today"; others show formatted date. `var(--t5)` is the theme-aware low-emphasis text color so it works in dark + light without hardcoding.
8. Compact branch now iterates `upcoming` instead of `upcomingSessions.slice(0,5)` — cap removed. Compact cards already rendered a date line so no additional change there.

**New i18n key:** `today: 'Today'` (en) / `today: 'اليوم'` (ar), added to the Dashboard section in both blocks of `src/i18n.js`. `statToday` already existed but is semantically a stat label — keeping them separate lets translators differentiate if needed. The Arabic string happens to match `statToday` by coincidence of language.

**Preserved:** `noSessionsToday` i18n key stays in both blocks for forward compatibility even though it's no longer referenced. `todaySessions` i18n key stays for the same reason.

**Version string:** `src/App.jsx:232` bumped from `v2.6` to `v2.7` in the debug panel. Only on-screen version display.

**Why the "Today" stat card stays:** it's a count, not a list. The stat gives the PT a workload-density glance ("heavy today vs light today"). The list is his action queue. Combining them would mean either the stat becomes "N upcoming" (misleading — he might have 20 scheduled next month) or the list becomes "only today" again (reverts the feature). Different purposes, keep separate.

**Deploy:**
- Source: `src/i18n.js`, `src/components/Dashboard.jsx`, `src/App.jsx` → master commit `b9fe047`.
- Built: `dist/index.html` → gh-pages commit `7168304`.
- Bundle syntax-checked with `node --check` on the inlined script before deploy. Clean.

**Verification:** Manual on dev server per project convention (no test framework). Scenarios in `docs/superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md` Task 4. Deployed for on-device verification.

**Spec:** [`docs/superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md`](superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md)
**Plan:** [`docs/superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md`](superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md)

---

## v2.6 — Bulletproof Multi-Device Sync (2026-04-19)

**Hala Mouzanar data loss — second sync incident:**

*Symptom:* The PT booked a new client (Hala Mouzanar) for Apr 17 at 10:00. WhatsApp confirmation went out with "Session #3". Next day the session was absent from Hala's client history, absent from remote `data.json`, absent from every GitHub snapshot (2026-04-10 through 2026-04-19-2009). Four other sessions for Hala exist (Apr 2, 9, 15, 20) with consistent IDs. The Apr 17 session's ID has vanished entirely — not renamed, not mis-clientId'd, just gone.

*Investigation:*
1. Pulled remote via `gh api repos/makdissi-dev/ptapp-data/contents/data.json` — 66 sessions, no Hala Apr 17.
2. Pulled snapshot `2026-04-19-2009.json` — 62 sessions, no Hala Apr 17.
3. Pulled older snapshots back to Apr 10 — all had Hala the client but no Apr 17 session.
4. Checked for duplicate "Hala" clients — only one: `d28tvs3`.
5. Grepped `.catch(() => {})` in `src/` — found FOUR still alive in `App.jsx` beyond the Apr 13 fix in `debouncedSync`.

*Root cause — combination of two pre-existing hazards:*

**Hazard A — four silent catches in App.jsx:**
```js
// Line 68 (initial load, local newer than remote):
pushRemoteData(token, stateRef.current).catch(() => {});
setSyncStatus('synced');   // ← LIES about success before promise resolves

// Line 78 (initial load, remote null):
pushRemoteData(token, stateRef.current).catch(() => {});
setSyncStatus('synced');

// Line 143, 149 (handleRetrySync): same pattern
```
These four paths had the exact `.catch(() => {})` + premature `'synced'` pattern that caused the Apr 13 incident. The Apr 13 fix only patched `debouncedSync`. A push failure here (network blip, 401, 409-retry-exhausted) becomes invisible.

**Hazard B — blind-overwrite on 409 in `pushRemoteData`:**
```js
// Original — sync.js:60-64
if (res.status === 409) {
  if (_retries >= 3) throw new Error('Sync conflict persists after 3 retries');
  await fetchRemoteData(token);   // refresh SHA
  return pushRemoteData(token, data, _retries + 1);   // retry with SAME local data
}
```
On 409 (remote changed since our last fetch), this fetches the new remote only to get a fresh SHA — then pushes local data on top, overwriting any records the other device added. For the PT's iPhone pushing Hala while Pierre's Android is also pushing, this means whichever loses the race silently loses their records.

*Most likely sequence for Hala:*
1. PT books Hala at Apr 17 10:00 on his iPhone. Local state stamped with new session. WhatsApp fires.
2. `debouncedSync` sets a 1s timer, fires, hits 409 (another device pushed in parallel).
3. 409 handler fetches remote, retries push with local data → succeeds → remote now has Hala. OR the retry also fails and the session never reaches remote.
4. Either way, a subsequent push from another device (which never saw Hala's session) overwrites remote without her.
5. PT reopens → REPLACE_ALL with remote → Hala's local copy wiped.

*Fix — three layers:*

**Layer 1 — per-record `_modified` timestamps in `baseReducer` (`utils.js`):**
Every case that adds or edits a record now stamps `_modified: new Date().toISOString()` on the record itself. Covers `ADD_CLIENT`, `EDIT_CLIENT`, `ADD_SESSION`, `UPDATE_SESSION`, `BATCH_COMPLETE`, `ADD_TODO`, `EDIT_TODO`, `TOGGLE_TODO`. Deletes don't stamp (records vanish). Template changes rely on the whole-state `_lastModified` that the reducer wrapper still stamps.

**Layer 2 — `mergeData(local, remote)` in `utils.js`:**
```js
const mergeById = (localArr, remoteArr) => {
  const map = new Map();
  for (const r of (remoteArr || [])) map.set(r.id, r);
  for (const l of (localArr || [])) {
    const existing = map.get(l.id);
    if (!existing) { map.set(l.id, l); continue; }
    const lMod = l._modified || '';
    const eMod = existing._modified || '';
    if (lMod >= eMod) map.set(l.id, l);
  }
  return Array.from(map.values());
};
```
Union by ID. When both sides have a record with the same ID, pick the one with the newer `_modified`. ISO-8601 strings sort lexicographically. Legacy records without `_modified` default to `''` (treated as oldest), so the stamped side wins. **No record is ever discarded.** PT's fresh edit on his iPhone always wins over mother's stale device because his `_modified` is newer. Tested with 5 scenarios (Hala addition, edit conflict, tie, reducer stamping, legacy record handling) — all pass.

**Layer 3 — merge instead of blind-retry on 409 in `pushRemoteData` (`sync.js`):**
```js
if (res.status === 409) {
  if (_retries >= 3) throw new Error('Sync conflict persists after 3 retries');
  const remote = await fetchRemoteData(token);
  const merged = remote ? mergeData(data, remote) : data;
  return pushRemoteData(token, merged, _retries + 1);
}
```
Now a concurrent push from another device gets merged into ours before we push again. Neither side loses records.

**Layer 4 — `reconcile()` function in `App.jsx`:**
Consolidates the initial-load effect and `handleRetrySync` into a single async function with one real try/catch:
```js
const reconcile = async () => {
  const token = getToken();
  if (!token) return;
  try {
    const remote = await fetchRemoteData(token);
    syncReady.current = true;
    if (!remote) {
      await pushRemoteData(token, stateRef.current);
      setSyncStatus('synced');
      return;
    }
    const merged = mergeData(stateRef.current, remote);
    if (!dataEquals(merged, stateRef.current)) {
      skipSync.current = true;
      dispatch({ type: 'REPLACE_ALL', payload: merged });
    }
    if (!dataEquals(merged, remote)) {
      await pushRemoteData(token, merged);
    }
    setSyncStatus('synced');   // only after push actually resolves
  } catch (err) {
    console.error('Sync reconcile failed:', err.message);
    setSyncStatus('failed');
  }
};
```
Eliminates all four `.catch(() => {})` paths. Never sets `'synced'` before the promise resolves. `syncReady.current` stays false if the fetch throws (Apr 13 guard preserved).

*Why this bulletproofs the 3-device setup:*
- **Mother's stale iPhone** opens after weeks: merges with remote (doesn't replace) → her device updates to current remote + any records she still has locally → pushes merged → no data loss.
- **PT edits Hala's notes** while Pierre is viewing the same session on Android: PT's edit has newer `_modified` → wins the merge on Pierre's next fetch → Pierre's screen updates on next open.
- **Two devices book simultaneously:** both dispatch ADD_SESSION with different IDs → both sessions survive the merge → no lost session.
- **Unstable Beirut internet:** failed pushes stay visible (red dot) until retry. When one succeeds, merge logic means nothing is clobbered.

*Trade-off — deletes don't use tombstones:*
If a device has a stale copy of a client the PT deleted, the merge will resurrect the client on next sync. This is intentional for data safety (aligns with CLAUDE.md's "NEVER lose user data" rule). Adding tombstones later is straightforward if it becomes a problem: `DELETE_CLIENT` would set `{ _deleted: true, _modified: now() }` on the record, the merge logic would respect the tombstone by timestamp, and a filter in consumers would hide `_deleted: true` records.

*Where it bit us:* `src/App.jsx` (initial-load effect and retry handler rewritten), `src/sync.js` (409 handler), `src/utils.js` (reducer cases + new `mergeData`/`dataEquals` helpers). Test coverage: 5 unit scenarios validated via Node script.

*Hala's Apr 17 session is not recoverable from any snapshot.* Pierre re-booked her manually.

---

## v2.5 — Sync Safety, Status Indicator, PWA Fix (2026-04-13)

**WhatsApp "Session #0" bug (Apr 19):**

*Symptom:* PT booked a brand-new client's first session. Tapped "Send WhatsApp" in the booking confirmation modal. The message template's `{number}` placeholder rendered as `0` instead of `1`.

*Reproduction path — Schedule.jsx booking flow:*
1. `saveSession()` creates `session = { id: genId(), ... }`, dispatches `ADD_SESSION`, pushes `{ client, session }` into `created`, then calls `setConfirmMsg({ items: created, index: 0 })`.
2. React re-renders; the confirmation modal mounts.
3. User taps WhatsApp → `onClick` closure runs `sendBookingWhatsApp(client, session, state.messageTemplates, lang, state.sessions)`.
4. `fillTemplate` calls `getSessionOrdinal(state.sessions, session.id, ...)`.
5. In the failure case, `state.sessions` at click time does NOT contain the new session → `findIndex` returns `-1` → `-1 + 1 = 0`.

*Why `state.sessions` could be stale:* React 18 auto-batching normally merges the `dispatch` + `setConfirmMsg` into a single re-render with the new session present. But real-world timing (StrictMode double-invocation in dev, slow devices, Safari event-loop quirks, concurrent state updates) can produce a render where confirmMsg is set but the ADD_SESSION hasn't yet been applied to the closure visible to this component. The symptom only appears if the user taps *very fast*, which the PT does while onboarding a client live.

*Fix — belt and braces, in two layers:*
1. **Call site (`Schedule.jsx:325-334`):** Before passing `state.sessions` to `sendBookingWhatsApp`, check whether the new session is present. If not, append it to a local copy. This guarantees the array is complete regardless of React's timing.
   ```jsx
   const sessions = state.sessions.some(s => s.id === session.id)
     ? state.sessions
     : [...state.sessions, session];
   sendBookingWhatsApp(client, session, state.messageTemplates, lang, sessions);
   ```
2. **Function body (`utils.js:246-255`):** `getSessionOrdinal` now returns `periodSessions.length + 1` when `findIndex` returns `-1`, treating an absent `sessionId` as "being appended." This is defensive in depth — any other caller that hits the same stale-array problem also gets a sensible answer.
   ```javascript
   const idx = periodSessions.findIndex(s => s.id === sessionId);
   return idx === -1 ? periodSessions.length + 1 : idx + 1;
   ```

*Verified:* Node test reproduces the bug pre-fix (returns `0` with empty sessions) and passes post-fix (returns `1`).

*Why not just one fix?* The call-site guard handles the known booking path. The function-level defense handles any future caller or unknown code path that might pass a stale array — including someone reusing `getSessionOrdinal` elsewhere without remembering to pre-merge the session. Cheap to add, eliminates the class of bug.

*Not platform-specific.* The PT hit it on iOS Safari but the root cause is React state-update timing, which applies to any browser. The fix is universal.

**Critical: stale device overwriting remote data (DATA LOSS — Apr 13):**

*Incident:* PT lost all Apr 13 sessions + focus tags + notes. Forensic analysis of makdissi-dev/ptapp-data git history showed: 40 sessions at 09:57 → 35 sessions at 10:12 (exact match to Apr 11 state + 4 auto-completed). Pierre's Android had stale localStorage.

*Root cause — TWO interlinked flaws:*
1. **skipSync race condition** — The sync effect `[state]` dependency fires on first render, consuming the `skipSync.current = true` flag. When `fetchRemoteData` failed silently, auto-complete changed state, triggering `debouncedSync` which pushed stale data.
2. **Silent failure** — `.catch(() => {})` on debouncedSync swallowed all push errors. No indicator told anyone sync was broken.

*Fix — three-guard system in App.jsx:*
- `syncReady` ref (new): stays false until initial fetch SUCCEEDS. Blocks ALL pushes if fetch fails.
- `initialLoad` state: blocks during startup fetch.
- `skipSync` ref: one-time skip for REPLACE_ALL echo (was already there but consumed by first-render).
- `stateRef` ref (new): tracks current state to avoid stale closures in async callbacks.

*Reducer wrapper in utils.js:*
```javascript
export function reducer(state, action) {
  const newState = baseReducer(state, action);
  if (action.type !== 'REPLACE_ALL' && newState !== state) {
    return { ...newState, _lastModified: new Date().toISOString() };
  }
  return newState;
}
```
REPLACE_ALL preserves remote's `_lastModified` (with fallback if absent). All other actions stamp a new timestamp. On startup, timestamps are compared: local-newer → push up, remote-newer → replace local.

*debouncedSync rewritten (App.jsx module-level):*
- Accepts `onStatus` callback instead of swallowing errors
- Status surfaces to UI via `setSyncStatus` state
- Green dot (synced), blue pulse (syncing), red pulse (failed — tap to retry)

*Files changed:* `App.jsx` (sync logic, UI), `utils.js` (reducer wrapper, migrateData fallback), `i18n.js` (sync status translations), `styles.css` (sync-dot, debug-panel, header-right).

*Design spec:* `docs/superpowers/specs/2026-04-13-sync-fix-design.md`

---

**Header UX — version removed, sync indicator added:**

*Problem:* On PT's iPhone, the version label ("v2.4") was crammed next to the ⋮ dots in the header. Three iterations of increasing spacing weren't enough — the small space between the logo and the right side of a 480px-max container didn't leave room.

*Fix:* Removed version text from header entirely. Header right side now contains only:
- Sync status dot (10px colored circle, 36px tap target wrapper)
- ⋮ menu button (32px, 0.75 opacity, 700 weight)
- 8px gap between elements

Version relocated to debug panel (long-press ⋮) and General panel.

*CSS:* `.header-right` with `margin-inline-start: auto`, `.header-menu-btn` with padding 10px 8px for tap target, `.header-dots` at 32px font-size.

---

**Debug panel (long-press ⋮ button):**

*Implementation:* `longPressTimer` ref in App.jsx. `onTouchStart`/`onMouseDown` sets 600ms timeout → toggles `showDebug` state. `onTouchEnd`/`onMouseUp`/`onTouchCancel`/`onMouseLeave` clears timeout.

*Panel shows:* Version, syncStatus, syncReady.current, sessions count, clients count, `_lastModified` formatted, token first/last 4 chars.

*CSS:* Fixed position, top 60px, z-index 300, dark glass background, monospace font. RTL: `right: auto; left: 12px`. Light theme: white bg with blue accents.

---

**PWA manifest + apple-mobile-web-app-capable:**

*Problem:* Pierre's mother added app to Home Screen on her iPhone. Token didn't persist between opens. Safari URL bar visible at bottom = not standalone mode.

*Root cause:* `index.html` lacked:
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<link rel="manifest" href="/manifest.json">`

Without these, iOS "Add to Home Screen" creates a Safari bookmark, not a standalone app. Each open = new Safari context = localStorage not shared reliably.

*Fix:* Added all three tags to `index.html`. Created `public/manifest.json` with `display: standalone`, app name, theme colors, and inline SVG dumbbell icon. Deploy process updated to copy `manifest.json` to gh-pages.

*PT's phone unaffected:* His setup was cached from a previous version. New setups (mother's phone) needed the manifest.

*After deploying:* Users must delete old Home Screen icon and re-add from Safari for the new manifest to take effect.

---

## v2.4 — Visual Polish, Light Theme Redesign, Haptic Feedback (2026-04-03/07)

**Client list session count excludes cancelled (Apr 7):**

*Problem:* The Clients tab card showed `state.sessions.filter(s => s.clientId === clientId).length` — total count including cancelled. The expanded month view showed e.g. "5 sessions, 4 completed, 1 cancelled" — so the same card displayed "5" in the header AND "4 + 1 cancelled" in the breakdown, which is confusing math.

*Fix in `Clients.jsx:39`:* Added `&& s.status !== 'cancelled'` to the filter. The header now matches the PT's mental model (cancelled = "didn't happen") and is internally consistent with the expanded breakdown.

*Why not surface cancelled separately on the card header?* The expanded view already does that. The card header is a glance-value — it should show the number that matters operationally. Cancelled sessions are still in the data and visible when expanded.

*No data changes, no migration.* Pure display fix.

---

**iOS keyboard not appearing on session notes — two-layer fix (Apr 7):**

*Problem:* PT (iPhone) couldn't get the keyboard to appear when tapping session notes anywhere in the app. Pierre tested on Android — worked fine. Worked on iPhone after the fix below — but the bug had two independent layers and required two separate fixes deployed across two iterations.

*Layer 1 — React synthetic touch event interference (caused by Modal swipe gesture):*
- The new `Modal.jsx` swipe-to-dismiss handlers used React's `onTouchStart/Move/End` props, which attach via React's synthetic event delegation at the document root.
- On iOS, when a textarea is inside a modal that has root-level touch listeners, the touch sequence sometimes triggers a synthetic click that fights with the focus event. Focus fires, the textarea is technically focused, but the keyboard never appears.
- *Fix:* Switched `Modal.jsx` to native `addEventListener` with `{ passive: true }` inside a `useEffect`. Bound directly to the modal content element, not via React. Added a tap-target dead zone — `onTouchStart` checks `e.target.closest('input, textarea, select, button, a, [contenteditable]')` and bails out without setting `dragging = true` if the touch began on a form element. Also added a 10px finger-jitter dead zone before any drag movement is registered.

*Layer 2 — readOnly + onFocus pattern (pre-existing bug, unknown duration):*
- All four files with session-notes textareas (`Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx`) used the same copy-pasted pattern: `<textarea readOnly onFocus={e => e.target.readOnly = false} onBlur={e => e.target.readOnly = true}>`. The intent was to prevent accidental edits while the PT scrolls past the textarea — only enable editing on tap.
- On iOS Safari, when you tap a `readOnly` field, iOS decides "no keyboard" BEFORE the focus event fires. By the time `onFocus` runs and removes the readOnly attribute, iOS has already committed to not showing the keyboard. Focus completes, the field becomes editable in the DOM, but the keyboard stays hidden. There is no recovery — the field is now broken until the user navigates away and back.
- Android has no such restriction, which is why this pattern lived in the codebase undetected.
- *Fix:* Removed `readOnly` from all four textareas entirely. Removed the readOnly manipulation from `onFocus`/`onBlur`. The collapse/expand visual behavior is handled entirely by the `.editing` CSS class toggle, which still works perfectly without readOnly. Added a comment in each file referencing the iOS bug to prevent regression.
- *Files changed:* `Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx` — same surgical change in each.

*Lesson saved to memory:* `feedback_ios_readonly_bug.md`. Added to CLAUDE.md TRAPS section. The PT's primary daily workflow is recording session notes — anything that breaks notes on iPhone is a P0 bug.

*Why both fixes were necessary:* Layer 1 alone wouldn't have fixed it (readOnly would still block the keyboard even with native listeners). Layer 2 alone wouldn't have fixed it (the synthetic event interference would still race with focus even on a non-readOnly field, in some sequences). Both layers had to be removed.

---

**iPhone reachability — toggles relocated + swipe-to-dismiss modals (Apr 7):**

*Problem:* On tall iPhones, the Ar/En and Lit/Drk stacked toggles in the header top-right were unreachable one-handed. Same for the × button on the General modal when the sheet filled the screen. Android screens are shorter so Pierre hadn't hit it in testing.

*Fix A — Toggles moved from header to General panel:*
- `App.jsx`: removed the vertical toggle stack (old lines 127-144), header now shows just logo + version/⋮ button. `setShowGeneral` button gets `marginInlineStart: 'auto'` directly instead of inheriting from the toggle container.
- `General.jsx`: added `setLang`, `theme`, `setTheme` props. New toggle strip rendered as the first child of the modal body (above notification banner and backup section). Same `.lang-toggle` CSS, just relocated.
- `App.jsx`: passes `setLang`/`theme`/`setTheme` through to `<General>`.

*Fix B — Swipe-down-to-dismiss + drag handle on all modals:*
- `Modal.jsx`: added `bodyRef` on the scrollable `.modal-body` and a `dragState` ref (no useState — avoids re-renders during the gesture).
- `onTouchStart`: only initiates drag if `bodyRef.current.scrollTop === 0`. This is the key to not conflicting with normal content scrolling — if the user is mid-scroll, we never hijack the gesture.
- `onTouchMove`: translates `.modal-content` downward with `transform: translateY(Nx * 0.7)` (0.7x resistance for feel). Downward-only — negative dy is clamped to 0. `transition: none` during drag so it tracks the finger 1:1.
- `onTouchEnd`: if `currentY > 80`, slide fully off with a 200ms ease-out then call `onClose()`. Otherwise spring back with the same `cubic-bezier(0.34, 1.56, 0.64, 1)` curve the modal uses to slide up (visual consistency with the open animation).
- Handlers bound via `useCallback` to keep them stable across re-renders.
- Drag handle: new `<div className="modal-handle" />` rendered above `.modal-header`. Pure visual — the gesture works on the whole modal content, not just the handle.

*CSS additions in `styles.css`:*
- `.modal-handle`: 36x4px pill, `rgba(255,255,255,0.25)`, `border-radius: 2px`, `margin: 10px auto 0`. Sits above the header inside the modal content.
- `.modal-header` top padding reduced `24px → 16px` to compensate for the handle's 10px margin (visual balance).
- `.theme-light .modal-handle`: `rgba(30,27,75,0.2)` (indigo-tinted for light theme consistency).

*Why scrollTop gate matters:* Without it, swiping down on a scrolled modal body would fight the native scroll — you'd either dismiss the modal when trying to scroll back up, or scrolling would feel sluggish because the transform was fighting the scroll position. Checking `scrollTop === 0` at touch-start is the standard iOS bottom-sheet pattern.

*Affects every modal:* General, booking/edit session, edit client, delete confirm, cancel prompt, token setup, doc viewer (nested modal inside General). All get the handle and swipe behavior automatically since it lives in the shared `Modal` component.

**Per-client billing periods (Apr 4):**

*New fields on client: `periodStart` (date), `periodLength` (enum):*
- `PERIOD_OPTIONS` in utils.js: `1month`, `4weeks`, `2weeks`, `1week`
- `getClientPeriod(client, dateStr)` returns `{start, end}` for the period containing `dateStr`
- `periodLength` is the master switch — when empty/falsy, function returns calendar month regardless of `periodStart`
- If `periodLength` set but `periodStart` empty, anchors to today (fallback for PT forgetting to set start date)
- `1month` periods: anchored to day-of-month from `periodStart`, with day clamping (e.g. 31st → 28th in Feb)
- Fixed-day periods: `4weeks`=28d, `2weeks`=14d, `1week`=7d — repeating windows from anchor
- `getSessionOrdinal` signature changed: `(sessions, id, clientId, month)` → `(sessions, id, clientId, periodStart, periodEnd)` — now filters by date range instead of month prefix
- New `getPeriodSessionCount(sessions, clientId, periodStart, periodEnd)` — replaces month-based counting in Schedule booking chips
- `getMonthlySessionCount` kept for backward compatibility (Clients.jsx month view)
- Clients.jsx: form includes `periodStart` (date input) + `periodLength` (select dropdown)
- Clients.jsx: changing dropdown to "Default" auto-clears `periodStart` for clean data
- WhatsApp `fillTemplate`: `{number}` placeholder → session ordinal in billing period, `{periodEnd}` → formatted period end date
- Default templates updated: includes `#️⃣ Session #{number} (until {periodEnd})`
- i18n: added `periodStart`, `periodLength`, `periodDefault`, `periodOptional` keys (en + ar)
- All consumers updated: Dashboard, Schedule, Sessions, Clients all use `getClientPeriod` for ordinals
- Bug fix: `getClientPeriod` originally gated on `!client.periodStart` — meant PT couldn't reset to default by dropdown alone (date input hard to clear on mobile). Fixed to gate on `!client.periodLength`.
- Bug fix: redundant ternary `diffDays >= 0 ? Math.floor(x) : Math.floor(x)` simplified to `Math.floor(x)`

*Client session history now editable (Apr 4):*
- Clients.jsx expanded view: added `EditableFocus` component (imported from Sessions.jsx pattern)
- Focus tags and session notes visible and editable in client month history
- Imports added: `FOCUS_TAGS` from utils.js

**Active session glow: blue to amber (Apr 4):**

*card-now hue changed from blue to amber/yellow:*
- Dark: `background: rgba(37,99,235,0.15)` -> `rgba(245,158,11,0.12)`, border `rgba(37,99,235,0.5)` -> `rgba(245,158,11,0.45)`, `box-shadow` blue -> amber
- Light: `background: rgba(37,99,235,0.25)` -> `rgba(245,158,11,0.18)`, border/shadow same amber treatment
- Dashboard.jsx: `borderInlineStart` active color `#2563EB` -> `#F59E0B`
- **Why:** Pierre requested yellow for active sessions. Amber (#F59E0B) distinguishes "happening now" from the blue accent system used everywhere else -- blue means "selected/active UI element," amber means "this session is in progress right now."

**Light theme contrast + glossy nav (Apr 4):**

*Nav/header glass - glossier, more transparent:*
- `.theme-light .header` / `.nav`: `rgba(30,64,175,0.25)` -> `rgba(30,64,175,0.15)` (more transparent)
- `backdrop-filter: blur(20px)` -> `blur(28px) saturate(1.4)` (stronger frosted glass effect)
- Border alpha reduced `0.15` -> `0.12` to match lighter glass

*Stat cards - more solid accent fills:*
- `.stat-clients`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- `.stat-today`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- `.stat-week`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- Base `.stat-card` also boosted `0.5/0.3` -> `0.6/0.4`
- `.stat-label` color `0.55` -> `0.65`

*Muted text - stronger contrast across the board:*
- CSS vars: `--t4` `0.4` -> `0.5`, `--t5` `0.3` -> `0.42`, `--sep` `0.06` -> `0.08`
- `.logo-sub` `0.55` -> `0.65`
- `.app-version` `0.35` -> `0.45`
- `.nav-btn` `0.6` -> `0.7`
- `.meta` `0.5` -> `0.6`
- `.client-phone` `0.45` -> `0.55`
- `.client-notes` `0.4` -> `0.5`
- `.session-count` `0.4` -> `0.5`
- `.empty` `0.4` -> `0.5`
- `.success-detail` `0.5` -> `0.6`
- `.setup-sub` `0.45` -> `0.55`
- `.field-label` `0.55` -> `0.65`
- `.focus-notes::placeholder` `0.25` -> `0.35`
- `.modal-close` `0.4` -> `0.5`
- `.week-nav-label` `0.65` -> `0.7`

*Toggle buttons (Ar/En, Lit/Drk) - more visible:*
- Background: `rgba(255,255,255,0.15)` -> `rgba(255,255,255,0.25)` + added `border: 1px solid rgba(30,27,75,0.08)`
- Inactive text: `rgba(30,27,75,0.35)` -> `rgba(30,27,75,0.55)`
- Active: `color: #2563EB` -> `color: #1D4ED8` (deeper), `background: rgba(37,99,235,0.15)` -> `0.2`

**Code review cleanup (Apr 4):**

*Shared components extracted:*
- New `Icons.jsx`: 7 shared SVG icons (WhatsApp, Edit, Trash, Clock, Phone, Chevron, Close) — eliminates 20+ inline SVG duplications across Dashboard, Schedule, Clients, Modal
- New `CancelPrompt.jsx`: shared cancel session modal (count/forgive) — removes identical copy-paste from Dashboard.jsx and Schedule.jsx
- Modal.jsx: inline close SVG → `<CloseIcon />` import

*Native dialogs replaced with themed UI:*
- Clients.jsx: `confirm('Delete this client...')` → in-app modal with `deletePrompt` state, translated strings, styled danger button
- General.jsx: all 5 `alert()` calls → `notification` state with auto-dismiss banner (4s timeout), success (green) / error (red) styling
- `restoredInfo` i18n key now includes `{clients}` and `{sessions}` placeholders for dynamic restore counts

*i18n gaps closed:*
- TokenSetup.jsx: fully i18n'd (was entirely English) — added `tokenSubtitle`, `tokenPlaceholder`, `tokenConnect`, `tokenConnecting`, `tokenInvalid`, `tokenFailed` keys
- "at" date-time connector: hardcoded English "at" → `t(lang, 'at')` in Dashboard and Schedule action sheet modals
- App.jsx: passes `lang` prop to TokenSetup

*Variable shadowing fixed (documented trap):*
- utils.js: 5 instances of `.map(t =>` / `.filter(t =>` / `.find(t =>` renamed to `todo` / `stype`
- Sessions.jsx: 3 instances of `SESSION_TYPES.find(st =>` and `.map(st =>` renamed to `stype`
- All components now use `stype` for session types, `todo` for todo items, `tm` for times, `tb` for tabs

*RTL and theme fixes:*
- Clients.jsx chevron icon: `marginLeft: 6` → `marginInlineStart: 6` (fixes RTL)
- Dashboard.jsx stat cards: removed inline `style={{ background, border }}`, added CSS classes (`stat-clients`, `stat-today`, `stat-week`) so light theme overrides work
- styles.css: added `.stat-clients`, `.stat-today`, `.stat-week` with per-card accent colors + `.theme-light` overrides

*Docs:*
- instructions-v2.4.md: fixed "v2.3 button" → "v2.4 button"
- CLAUDE.md: marked 5 fixed issues, added Icons.jsx + CancelPrompt.jsx to project structure, updated variable shadowing trap description

**Post-deploy refinement (Apr 3, 3 rounds + Apr 4, 3 rounds):**

*Round 1 — visual feedback fixes:*
- Light theme cards: `rgba(255,255,255,0.72)` white → `rgba(219,234,254,0.55)` soft blue (white hurt eyes)
- Light theme card border: `rgba(30,27,75,0.07)` → `rgba(37,99,235,0.08)` blue tint
- Light theme inputs: `rgba(255,255,255,0.7)` → `rgba(237,244,254,0.6)` blue-tinted
- Notes focus hue: `0.08` → `0.15` background, `0.25` → `0.35` border, added `color: #60A5FA`
- Notes has-content hue: `0.06` → `0.12` background, `0.15` → `0.25` border, added `color: #60A5FA`
- Light theme notes: added explicit `.focus-notes:focus` and `.focus-notes.has-content` overrides with `color: #2563EB`
- Stat cards: gradient opacity ~3x (hex `15/08` → `30/18`), borders `25` → `35`
- "This Week" stat: changed from purple `#8B5CF6` to green `#10B981` for color variety

*Round 2 — header/nav strips:*
- Light theme header: added `background: rgba(191,219,254,0.65)` + `backdrop-filter: blur(20px)` (was transparent/white, clashed with blue cards)
- Light theme nav: `rgba(255,255,255,0.82)` white glass → `rgba(191,219,254,0.65)` blue glass (matched header)
- Dark theme header: added `background: rgba(37,99,235,0.06)` + `backdrop-filter: blur(20px)` (was transparent, indistinguishable from nav)

*Round 3 — blue background and coherence:*
- Light theme background: `#E2E0DB → #CDCAC4` beige gradient → `#C7D2E4 → #ADBDD4` blue-toned gradient
- Light theme header/nav: strengthened from `rgba(191,219,254,0.65)` → `rgba(171,205,252,0.7)` (differentiate from new blue bg)
- Light theme header/nav border: `rgba(37,99,235,0.1)` → `rgba(37,99,235,0.12)`
- Dark theme nav: `rgba(15,15,15,0.97)` near-black → `rgba(37,99,235,0.06)` blue glass (matched header)
- Stat cards: opacity boosted again (hex `30/18` → `50/30`, borders `35` → `55`) to stand out on blue canvas

*Round 4 — deep blue canvas (Apr 4):*
- Light theme background: `#C7D2E4 → #ADBDD4` → `#8B9FC0 → #6F87AC` deep steel blue
- Light theme header/nav: `rgba(171,205,252,0.7)` → `rgba(30,64,175,0.3)` darker blue, more transparent glass
- Light theme cards: `rgba(219,234,254,0.55)` → `rgba(96,165,250,0.3)` #60A5FA-based blue
- All light theme elements adjusted for darker canvas (inputs, tags, filters use white+blue glass)
- Modal: white → blue-tinted `rgba(220,232,250,0.97)`

*Round 5 — contrast fix (Apr 4):*
- Light theme background: `#8B9FC0 → #6F87AC` → `#94A8C8 → #788DB4` (slightly lighter to break monotone)
- Light theme cards: `rgba(96,165,250,0.3)` → `rgba(210,228,255,0.55)` opaque white-blue (breaks monotone)
- Light theme stat cards: matched card treatment
- Light theme nav buttons: boosted from `0.45` → `0.6` opacity
- Light theme nav active: `#2563EB` → `#1D4ED8` (deeper for light canvas)
- Dark theme nav inactive: `0.55` → `0.75` opacity (much more readable)
- Dark theme nav active: `#2563EB` → `#60A5FA` (brighter on dark)

*Round 6 — dark nav active strength (Apr 4):*
- Dark theme nav active: `#60A5FA` → `#3B82F6` (blue-500, not pale, not invisible — just right)
- Active dot matches `#3B82F6`

**What changed:**

*Light theme redesign — layer separation:*
- Background: `#E8E6E1 → #D8D4CD` warm beige changed to `#E2E0DB → #CDCAC4` cooler grey
- Cards: `rgba(255,255,255,0.4)` → `rgba(255,255,255,0.72)` near-opaque white
- Card shadows: `rgba(30,27,75,0.06)` → `rgba(30,27,75,0.1)` real depth
- Nav: `rgba(232,230,225,0.97)` opaque beige → `rgba(255,255,255,0.82)` white glass with `backdrop-filter: blur(20px)`
- Nav shadow: `0 -2px 8px rgba(0,0,0,0.05)` → `0 -2px 12px rgba(30,27,75,0.08)`
- Modals: `#E8E6E1 → #DEDBD5` beige → `rgba(255,255,255,0.95) → rgba(248,247,245,0.97)` white
- Inputs: `rgba(255,255,255,0.4)` → `rgba(255,255,255,0.7)` clean white
- Focus notes: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.6)`
- Setup card: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.7)`
- Card-now glow shadow: `0.15` → `0.2` opacity
- Card press: `background` change → `translateY(1px)` + shadow reduction
- Button press: added `rgba(30,27,75,0.08)` override for secondary/ghost
- Stat cards: added `linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.01))`

*Micro-polish — transitions (both themes):*
- `.card`: `transition: background 0.2s` → `background 0.2s, box-shadow 0.2s, transform 0.2s`
- `.focus-tag`: added `transition: all 0.15s ease`
- `.badge`: added `transition: background 0.2s, color 0.2s`
- `.filter-btn`: added `transition: all 0.15s ease`
- `.week-day`: added `transition: all 0.15s ease`

*Micro-polish — button/card press (both themes):*
- `.btn-primary:active` etc: added `box-shadow: 0 1px 4px`, `filter: brightness(0.92)`
- `.btn-secondary:active`, `.btn-ghost:active`: added `background: rgba(255,255,255,0.12)`
- `.card.card-tap:active`: `background` change → `translateY(1px)` + `box-shadow: 0 1px 4px`

*Nav active indicator:*
- `.nav-btn.active::after`: 4px blue dot below active tab label

*Modal spring:*
- `animation: slideUp 0.3s ease` → `slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`

*Stat cards:*
- Added `background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))` + border

*Session notes blue hue:*
- New CSS: `.focus-notes:focus` blue tint, `.focus-notes.has-content` blue persists
- Dashboard.jsx, Schedule.jsx, Sessions.jsx: `className` includes conditional `has-content`
- `onBlur` handler toggles `.has-content` class via `classList.toggle()`

*Elastic overscroll:*
- `initElasticScroll()` in utils.js: passive touch event handlers on `.content` div
- Pull curve: `sqrt(absDistance) * 4`, capped at 120px — stronger initial response than linear
- Bounce-back: `0.5s cubic-bezier(0.34, 1.56, 0.64, 1)` — same spring as modal, visible overshoot
- Wired in App.jsx via `useEffect` + `useRef` on the content container
- **Reverted:** non-passive `touchmove` + `preventDefault()` + `overscroll-behavior: none` broke the effect on Android Chrome. Passive listeners with browser native overscroll intact are the working approach.
- Notes textareas also have `key={session.sessionNotes}` to fix the `defaultValue` stale DOM trap on external sync updates

*Session notes expand/collapse:*
- All `.focus-notes` textareas: `readOnly` + `max-height: 32px` + `overflow: hidden` by default
- `onFocus`: removes `readOnly`, adds `.editing` class → `min-height: 80px` + `max-height: 120px` + `overflow-y: auto`
- `onBlur`: restores `readOnly`, removes `.editing` → collapses back to single line
- Transition: `max-height 0.25s ease` for smooth expand/collapse
- Applied in Dashboard.jsx, Schedule.jsx, Sessions.jsx

*Haptic feedback:*
- New `haptic()` helper in utils.js: `navigator.vibrate?.(ms)` with try/catch
- Wired into: App.jsx (nav tabs), Dashboard.jsx (complete, cancel, focus tags), Schedule.jsx (complete, cancel, focus tags), Sessions.jsx (focus tags, filter tabs), Clients.jsx (delete), General.jsx (todo checkbox)

*Dumbbell logo:*
- App.jsx SVG: replaced tall vertical rectangles with horizontal bar + stacked plates
- `strokeWidth` 2.5 → 2 for cleaner look

*Auto-complete delay:*
- App.jsx line ~62: `timeToMinutes(s.time) + (s.duration || 45)` → `+ 60` added
- Today's sessions get 1hr buffer; previous days still complete immediately

*Version:*
- v2.3 → v2.4 in header label

**Why — Light theme redesign:**
Pierre found the light theme "inferior to the dark." Diagnosis: everything blended — cards, nav, modals, and background were all warm beige at similar opacity. The fix creates clear visual layers: cooler background provides contrast canvas, near-opaque white cards float with real shadows, nav gets iOS-style white glass with blur, modals are white overlays distinct from the page. The dark theme works because light on dark is inherently contrasty; the light theme now achieves contrast through white-on-grey layering + shadows.

**Why — Micro-polish:**
Pierre's goal: "maximum sophistication... Apple achieved superiority in UX." The individual changes are small (transitions, press effects, a dot, a spring curve) but they compound. When every interaction responds fluidly instead of snapping, the app feels crafted rather than assembled. Performance cost is near zero — all CSS transitions, no JS animation loops.

**Why — Session notes blue hue:**
Pierre's idea. Focus tags already go blue when active — notes should match. The persistent blue hue on non-empty notes provides an information signal: scanning session cards, you can instantly see which ones have notes recorded without reading the content.

**Why — Haptic feedback:**
Pierre's idea. `navigator.vibrate()` works on Android only (iOS Safari doesn't support it). The PT uses iPhone so he won't feel it, but Pierre tests on Android and can demo it. Zero cost on unsupported devices — the helper is a one-liner with optional chaining.

**Why — Dumbbell logo:**
Pierre: "I thought it was a gallon of water." The old SVG's proportions (tall narrow rectangles) didn't read as a dumbbell at 24px. The new design uses the classic horizontal silhouette that's recognizable at any size.

**Why — Auto-complete delay:**
Pierre's idea. The PT sometimes needs to cancel a no-show, but if the session auto-completes the moment it ends, the PT has to undo the completion. A 1-hour buffer gives time to mark the cancellation naturally. Previous days still auto-complete immediately on app load (no stale scheduled sessions from yesterday).

**Files changed:** `src/styles.css`, `src/App.jsx`, `src/utils.js`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.3.2 — Visual Polish: Solid Badges, Indigo Light Theme, Depth (2026-04-03)

**What changed:**

*Status badges — CSS classes replace inline styles:*
- New CSS classes: `.badge-scheduled` (blue), `.badge-completed` (blue), `.badge-confirmed` (green), `.badge-cancelled` (red) — all solid fill, white text
- All 6 badge instances across Dashboard.jsx, Sessions.jsx, Clients.jsx, Schedule.jsx changed from `style={{ color: status.color, background: status.bg }}` to `className={`badge badge-${session.status}`}`
- `getStatus()` still used for translated label text, but its color/bg fields are no longer used in rendering

*Filter tabs:*
- `.filter-btn.active` changed from blue outline + tinted bg to solid `#2563EB` bg + white text (both themes)

*Delete buttons:*
- `.btn-danger-sm` changed from faint red tint (`rgba(239,68,68,0.1)` bg, red border, red icon) to solid `#EF4444` bg + white icon
- Dashboard.jsx and Schedule.jsx trash icons changed from `btn-icon` to `btn-danger-sm` (matches Clients.jsx)

*Light theme — indigo text:*
- Base text color: `#1A1A2E` → `#1E1B4B` (Tailwind indigo-950)
- All `rgba(0,0,0,...)` in `.theme-light` rules → `rgba(30,27,75,...)` for indigo tint (except `.modal-bg` which stays black for overlay effect)
- CSS vars: `--t1` through `--t5` and `--sep` all use indigo base
- Logo gradient: `#1A1A2E, #444` → `#1E1B4B, #3730A3` (indigo gradient)

*Card depth:*
- Base `.card` gets `box-shadow: 0 2px 8px rgba(0,0,0,0.15)` (dark theme)
- `.theme-light .card` gets `box-shadow: 0 2px 8px rgba(30,27,75,0.06)` (light theme)
- `.theme-light .card.card-now` shadow updated to `0 2px 12px rgba(37,99,235,0.15)`
- `.theme-light .nav` gets `box-shadow: 0 -2px 8px rgba(0,0,0,0.05)` for top shadow
- Light theme card bg: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.4)` (slightly more opaque)
- Light theme card border: `rgba(0,0,0,0.06)` → `rgba(30,27,75,0.07)` (slightly stronger)

**Why — Solid badges:**
The old "colored text on pastel background" badges (e.g., grey `#6B7280` on `#F3F4F6` for Completed) washed out completely in the warm stone light theme. The pastel backgrounds were nearly invisible against the warm grey app background. Solid fills with white text provide consistent contrast in both themes. CSS classes rather than inline styles allow theme-specific overrides without passing theme to utility functions.

**Why — Indigo text:**
Pierre found the light theme "bland" compared to the dark theme which has good contrast and character. Pure black text on warm stone is flat. The indigo tint (`#1E1B4B` / `rgba(30,27,75,...)`) adds a subtle blue-purple warmth that complements the warm stone background and creates visual identity. The effect is most noticeable on headings and bold text; body text at lower opacity reads as a warm grey.

**Why — Card shadows:**
The dark theme naturally has depth because lighter cards float on a dark background. The light theme lacked this — cards blended into the background. Adding `box-shadow` creates the layered "3D" effect Pierre wanted. Dark theme gets a stronger shadow (higher opacity) since it's on a dark bg; light theme gets a softer one using the indigo base for color consistency.

**Files changed:** `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/Schedule.jsx`

---

## v2.3.1 — Bug Fix Round + Code Review (2026-04-03)

**What changed:**

*Timezone / date handling:*
- New `localDateStr(d)` and `localMonthStr(d)` helpers in utils.js — format Date objects using local time
- `today()` and `currentMonth()` now use these helpers
- Clients.jsx: `viewMonth` init, `shiftMonth()`, and `toggleExpand()` all switched from `toISOString().slice()` to `localMonthStr()`
- Schedule.jsx: `weekDates` generation and week navigation switched from `toISOString().split('T')[0]` to `localDateStr()`
- Schedule.jsx: `createdAt` on new sessions switched from `toISOString()` to `localDateStr()`
- Dashboard.jsx: "This Week" stat switched from fractional day math `(d - now) / 86400000` to date string comparison `s.date >= todayStr && s.date <= localDateStr(weekEnd)`

*Sync reliability:*
- `pushRemoteData()` in sync.js now accepts `_retries` param, capped at 3 (was infinite recursion on 409)
- App.jsx: `pushRemoteData` replaced with `debouncedSync()` (1 second debounce via `setTimeout`)

*Auto-complete batching:*
- New `BATCH_COMPLETE` reducer case in utils.js — takes array of IDs, marks all completed in one pass
- App.jsx: auto-complete effect collects lapsed IDs then dispatches one `BATCH_COMPLETE` instead of N `UPDATE_SESSION`s

*i18n:*
- New `getStatus(status, lang, tFn)` helper in utils.js — returns `{color, bg, label}` with translated label
- All components (Dashboard, Schedule, Sessions, Clients) switched from `STATUS_MAP[status]` to `getStatus(status, lang, t)`
- Status badge labels ("Scheduled", "Completed", etc.) now show in Arabic when language is set to Arabic

*Variable shadowing cleanup (all components):*
- `.find(t =>` → `.find(st =>` for SESSION_TYPES lookups
- `.map(t =>` → `.map(st =>` for SESSION_TYPES dropdowns, `.map(tm =>` for TIMES
- `.filter(t =>` → `.filter(f =>` for focus tag filtering
- `tabs.map(t =>` → `tabs.map(tb =>` in App.jsx nav

*RTL:*
- App.jsx: toggle container inline style `marginLeft: 'auto'` → `marginInlineStart: 'auto'`

*Other:*
- Schedule.jsx: removed unused `useRef`, `useEffect` imports
- General.jsx: new todos initialize with explicit `done: false`
- General.jsx: WhatsApp template textareas get `key` prop tied to state value, forcing remount on reset
- `STATUS_MAP` export retained for backward compat but components use `getStatus()`

**Why — Timezone:**
`toISOString()` converts to UTC. Midnight in Beirut (UTC+3) = 21:00 previous day UTC. When the result is sliced to `YYYY-MM`, the month is wrong. The `today()` function was already fixed in a prior session but the same pattern existed in 8 other locations — Clients month nav, Schedule week nav, Dashboard week stat, and session createdAt. The fix was applied in one place without auditing the rest of the codebase. This incident established the review discipline: when fixing a pattern bug, audit every file.

**Why — Debounced sync:**
Every `dispatch()` triggers a state change, which triggers `pushRemoteData`. Tapping 3 focus tags + typing notes = 4+ API calls in seconds. The 1s debounce coalesces these into a single push. localStorage save remains immediate (no data loss risk if the tab closes).

**Why — Batch auto-complete:**
N lapsed sessions = N dispatches = N state changes = N debounced syncs = N re-renders. With `BATCH_COMPLETE`, it's 1 dispatch = 1 re-render = 1 sync push.

---

## v2.3 — Blue Accent, Warm Light Theme, Todo Checkboxes (2026-04-03)

**What changed:**
- All `#E8453C` (red) and `#FF6B6B` (light red) accent references in CSS replaced with `#2563EB` / `#60A5FA` (blue)
- All `rgba(232,69,60,...)` replaced with `rgba(37,99,235,...)`
- `.setup-error` kept as `#EF4444` (error red, not accent)
- Strength session type color changed from `#E8453C` to `#6366F1` (indigo) in `SESSION_TYPES`
- Light theme background: `#E8E6E1` → `#D8D4CD` warm stone gradient (was harsh `#F8F9FA` white)
- Light theme cards: `rgba(255,255,255,0.35)` subtle frosted (was `rgba(0,0,0,0.03)` transparent)
- Light theme nav: warm `rgba(232,230,225,0.97)` matching background
- Light theme modal: warm `#E8E6E1` → `#DEDBD5` gradient
- Light theme inputs/textareas: `rgba(255,255,255,0.4)` warm frosted
- Removed `.theme-light .logo-icon` override — base logo is now blue, same both themes
- Header: lang/theme toggles wrapped in `flex-direction: column` container
- Toggle spans: `width: 36px; text-align: center` for fixed-width alignment
- Dashboard stat card "Clients" changed from `#E8453C` to `#6366F1` (indigo)
- Dashboard `isNowSession` border changed from `#E8453C` to `#2563EB`
- Cancel button color changed from `#E8453C` to `#EF4444` (standard danger red)
- New `TOGGLE_TODO` reducer case: flips `done` boolean on todo items
- General.jsx: added checkbox SVG button before each todo item with done/undone toggle
- Done items render with `text-decoration: line-through; opacity: 0.5`

**Why — Blue accent:**
The PT and Pierre both found the red accent too aggressive. Blue is calmer and works better in both dark and light themes. The light theme was already blue (v2.2 shipped with blue light theme), so aligning the dark theme creates visual consistency. Session type colors (indigo, blue, purple, amber, green, grey) remain distinct for differentiation.

**Why — Warm light theme:**
The v2.2 light theme used near-white backgrounds (#F8F9FA) which was painful in bright environments. The warm stone palette (#E8E6E1 area) reduces glare while maintaining readability. Subtle frosted cards (`rgba(255,255,255,0.35)`) blend with the background rather than creating jarring white rectangles.

**Why — Todo checkboxes:**
The PT was manually typing "Done" at the end of todo items because there was no way to mark them complete. The `done` boolean field is backward-compatible — existing todos without it default to `false` via the `!t.done` toggle.

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
