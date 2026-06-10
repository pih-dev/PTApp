# Whole-Codebase Review — 2026-06-10 (Fable 5 fresh-eyes pass)

Full review of `src/` at v2.10.0 (commit `b4d6eec`). 7 finder angles (correctness ×3, reuse,
simplification, efficiency, altitude) → 42 candidates → deduped to ~30 → all verified
CONFIRMED by independent verifier agents or direct grep.

Live data snapshot taken before any change:
`C:\projects\_archive\PTApp\data-snapshots\2026-06-10-pre-fable5-review-data.json`
(v4 schema, 15 clients, 204 sessions, 15 todos, 53 audit entries, **110,864 bytes pretty-printed**).

Legend: **[FIX-NOW]** = fixed in v2.10.1 (this session) · **[PRESERVED]** = documented for a
future session (design-level / large effort) · **[WONT-FIX]** = deliberate decision, documented.

---

## CRITICAL

### C1. `toBase64` spread crashes at ~65K bytes — sync outage imminent [FIX-NOW]
`sync.js:14` — `String.fromCharCode(...new TextEncoder().encode(str))` spreads the whole
payload as function arguments. iOS Safari (JSC) caps argument count around 65,536; live
data.json is already 110,864 bytes pretty-printed. When the limit is hit, every push throws
RangeError → permanent `syncStatus: 'failed'` on the PT's iPhone.
Additionally `pushRemoteData` and `saveSnapshot` stringify with `null, 2`, doubling upload
size on every debounced push (machine-read file; pretty-print serves nobody).
**Fix:** chunked encoding (0x8000-byte chunks) + drop pretty-print.

### C2. Merged-in records are never migrated (`mergeData` / `mergeBackup`) [FIX-NOW]
`utils.js` — `mergeData` stamps `_dataVersion: Math.max(local, remote)` without running
`migrateData` on union-merged records; the reconcile/REPLACE_ALL path skips migration too.
`mergeBackup` spreads `{...live}` so the merged blob inherits `_dataVersion: 4` and the
trailing `migrateData(merged)` no-ops. Consequence: records from a stale-bundle device or an
old backup (clients without `packages[]`, `Arms` tags, `Custom` type) enter live state
permanently un-migrated — and can crash renders (see C3).
**Fix:** migrate the *foreign* blob by its own `_dataVersion` before merging
(`mergeData(local, migrateData(remote))`, `mergeBackup(live, migrateData(backup))`).

### C3. `FOCUS_TAGS.Custom` dead fallback ×4 — white-screen on unknown type [FIX-NOW]
`Dashboard.jsx:158`, `Schedule.jsx:318`, `Clients.jsx:277`, `Sessions.jsx:9` —
`FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom`. v2.9.5 renamed the key `Custom → Endurance`,
so the fallback is `undefined` and `tags.map` throws (ErrorBoundary screen) for any session
with an unmapped type (exactly what C2 can let in). Found independently by 4 of 7 finders.
This is the "per-feature author-site drift" trap, third occurrence.
**Fix:** one `getFocusTags(type)` helper in utils.js owning the `|| []` fallback; all 4 sites call it.

### C4. RenewalModal cross-device pre-check is dead code → silent double renewal [FIX-NOW]
`RenewalModal.jsx:63` — the v2.9.2 "already renewed on another device" guard is doubly broken:
(a) reads the stale `client` prop captured at modal open, never live state; (b) compares
`getCurrentPackage(...).end != null`, but `getCurrentPackage` *by contract* never returns a
closed package. The reducer idempotence guard doesn't help (after a remote renewal the last
package is the NEW open one). Result: the exact race v2.9.2 set out to surface instead closes
the fresh package and stacks a duplicate renewal.
**Fix:** pass live `clients` into the modal; at confirm, compare the live client's last
package id against the snapshot's — id mismatch (or client gone) ⇒ show `renewalAlreadyClosed`.

---

## MEDIUM (all fixed in v2.10.1)

### M1. Arabic WhatsApp messages embed English dates [FIX-NOW]
`utils.js` `fillTemplate` calls `formatDateLong(...)` without `lang` (defaults `en`), so
`{date}` / `{periodEnd}` render en-US inside Arabic templates. `lang` is already at every
call site — thread it through.

### M2. Future sessions glow amber "now" [FIX-NOW]
`Dashboard.jsx:25` `isNowSession` compares time-of-day only; applied to `upcoming` (future
dates included since v2.7), so tomorrow's 18:00 card glows during today's 18:00 hour.
**Fix:** require `s.date === today()`.

### M3. "This Week" stat counts 8 days [FIX-NOW]
`Dashboard.jsx:59-63` — `weekEnd = today + 7 days` with inclusive `<=` ⇒ days 0..7 = 8
calendar dates. **Fix:** +6 days.

### M4. Repeat-mode banner promises an auto-renewal that never happens [FIX-NOW]
`Schedule.jsx:376` — the renewal-due "will auto-renew" banner isn't gated on `!repeat`, but
`createRecurring` is calendar-only by design (D1) and never dispatches RENEW_PACKAGE.
**Fix:** in repeat mode show an accurate warning instead (new i18n keys EN+AR: recurring
booking does NOT auto-renew; renew from the client's page).

### M5. Todo edit input — `defaultValue` trap, mid-edit sync race [FIX-NOW]
`General.jsx:342` — `defaultValue={todo.text}` with no key tied to the text; a synced remote
edit landing while the input is open is reverted on blur (stale DOM wins, gets newer
`_modified`). Documented trap, fix pattern: `key` tied to the value.

### M6. Hardcoded English placeholders in the client form [FIX-NOW]
`Clients.jsx` — 4 `e.g. …` placeholders not in i18n.js while sibling fields are translated.
Half-English form for an Arabic-first end user. **Fix:** i18n keys EN+AR.

### M7. RTL: `paddingLeft` on doc-viewer lists [FIX-NOW]
`General.jsx:100,115` — inline `paddingLeft: 20` on `<ol>`/`<ul>` violates the logical-
properties trap; double-indents in Arabic RTL. **Fix:** `paddingInlineStart`.

### M8. In-app "App Instructions" serves v2.9 docs [FIX-NOW]
`General.jsx:9` — `DOCS.instructions` hardcodes `instructions-v2.9.md`; stale since v2.9.1
shipped (two release cycles unnoticed). **Fix:** point at v2.10.0 + add the doc-pointer bump
to the deploy checklist in CLAUDE.md.

### M9. ErrorBoundary backup filename uses UTC [FIX-NOW]
`ErrorBoundary.jsx:28` — `toISOString()` filename; a 00:30 Beirut crash produces yesterday's
date on the forensic backup. Documented UTC trap. **Fix:** inline local-time stamp (file is
import-free by design; 3 lines).

### M10. Multi-client booking loops N×ADD_SESSION dispatches [FIX-NOW]
`Schedule.jsx:113-118` — `.map` dispatching ADD_SESSION per client while ADD_SESSIONS (v2.10)
exists. Verifier note: React 18 batches these into one render/save, so real cost is low —
fixed for convention consistency (one ADD_SESSIONS dispatch; RENEW_PACKAGE loop stays, it's
per-client by nature and capped by due clients).

### M11. Override math/format duplicated across 4 sites [FIX-NOW]
The absolute/delta effective-count math exists 3× (`getEffectiveSessionCount`,
`getEffectiveClientCount`, Clients form preview) and the inverse serialization
(override → draft string) 2× (`Clients.jsx openEdit`, `Schedule.jsx openOverrideEdit`).
This is the v2.8 `.type/.mode` drift class. **Fix:** `applyOverride(auto, override, periodStart)`
+ `formatOverrideDraft(pkg, period)` in utils.js, consumed everywhere.

### M12. WhatsApp sender duplication + inline third copy [FIX-NOW]
`sendBookingWhatsApp`/`sendReminderWhatsApp` byte-identical except template key; plus
`Clients.jsx:239` quick-WhatsApp builds wa.me inline, re-implements `friendly()`, hardcodes an
English greeting. **Fix:** shared `openWhatsApp` core, export `friendly`, i18n the greeting.

### M13. Recurring preview re-implements `formatDate` [FIX-NOW]
`Schedule.jsx:386` — inline `toLocaleDateString` output-identical to `formatDate`. Call the helper.

### M14. Perf: unmemoized hot-path derivations [FIX-NOW]
- `Dashboard.jsx` — `upcoming`/`weekSessions`/`renewalDueClients` recomputed with per-session
  Date allocations on every render (incl. every keystroke). Hoist `todayStr`/`weekEnd`, wrap in
  `useMemo`.
- `Schedule.jsx:503` — `getOccupiedSlots` IIFE re-filters all sessions on every form tap.
  `useMemo` on `[state.sessions, state.clients, form.date]`.

### M15. Dead exports [FIX-NOW]
`utils.js` — `PERIOD_OPTIONS` (v2 enum UI, gone in v2.9), `STATUS_MAP` ("kept for backward
compat", zero importers), `currentMonth` (unused). Grep-verified no consumers. Deleted.
(`parseLegacyPeriodLength` stays — migration uses it.)

### M16. `t` as callback param inside v3→v4 migration [FIX-NOW]
`utils.js:641` — banned name (shadowing trap); latent-only (utils.js has no imports) but the
trap exists because the failure is silent. Renamed.

---

## PRESERVED for a future session (large / design-level)

### P1. Historical session ordinals wrong for contract clients — FIXED in v2.10.2
`Sessions.jsx:81` + `utils.js getEffectivePeriod` — sessions dated before the current
package's start are excluded from their own ordinal list → findIndex −1 → **every**
pre-renewal session of a contract client renders the same `#(current count + 1)`.
Sliding-window clients are immune (window extrapolates backward). Real fix: resolve the
*package containing the session's date* (walk `client.packages` by date range) instead of
always using the current package. Touches `getEffectivePeriod`/`getEffectiveSessionCount`
contracts + sanity-counting fixtures. Design carefully — this is the counting kernel.

### P2. Sessions/Dashboard ordinal computation is O(n²) — FIXED in v2.10.2
`getEffectiveSessionCount` per rendered card does a full filter+sort of `state.sessions`.
At a few thousand career sessions this is multi-second jank on iPhone. Fix direction: one
memoized `Map<clientId, sortedPeriodSessions>` per `state.sessions` change; cards read by
index. Natural to do together with P1 and the SessionCard refactor (parked brainstorm at
step 3 — `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md`).

### P3. EditableFocus / session-card markup ×4
The focus-tag row + auto-saving notes textarea is inlined in Dashboard, Schedule, Clients and
exists as `EditableFocus` in Sessions.jsx. Fold into the SessionCard refactor (P2).

### P4. Repeat-mode fork hygiene in Schedule.jsx — FIXED in v2.10.3
Session objects built independently in `saveSession` and `createRecurring`; modal JSX branches
on three free booleans in four places; the 4-setter repeat-reset is duplicated in 4 spots.
Fix direction: shared `buildSession(form, clientId, date)` + one derived
`mode = 'edit'|'single'|'repeatConfig'|'repeatPreview'` + one `resetRepeat()`.
Do this BEFORE feature #2/#3 add session fields, or recurring series will silently lack them.

### P5. Renewal-due computed three ways in three tabs — FIXED in v2.10.3
Schedule (memoized Set), Dashboard (filter — now memoized in v2.10.1), Clients (per-card).
Fix direction: one shared memoized selector/hook returning `Map<clientId, {due, effective,
contractSize}>`. Becomes urgent the moment the renewal rule changes (e.g. "due soon at N−1").

### P6. Session #0 ordinal band-aids (altitude)
The post-dispatch-stale-state fix lives at call sites (hand-merged arrays, `__preview__`
session, threaded `sessions` params, `length+1` guess fallback in `getSessionOrdinal`).
Fix direction: compute the ordinal once at booking time and store/pass it explicitly.
The next post-dispatch surface (recurring confirmation, day-before reminders, eval feature #2)
will hit the trap otherwise.

### P7. `EDIT_CURRENT_PACKAGE` reducer action — FIXED in v2.10.4
Replace-last-package writes are hand-rolled at 2+ author sites (Clients save, Schedule
commitOverride) — the v2.9.2 incident class. Fix direction: one reducer action owning
replace-last, override stamping, `_modified`, audit diffing.

### P8. Edit-mode booking chip count semantics — FIXED in v2.10.2
`Schedule.jsx:435-437` edit branch shows today's-window count regardless of `form.date`
(explicit v2.9.6 carve-out comment "existing behavior"). Revisit when touching P1 —
same counting-kernel surface.

---

## WONT-FIX (deliberate, with reasons)

### W1. `saveData` (localStorage write) on every dispatch
Flagged as perf (synchronous ~110KB stringify+write per tap). Kept as-is deliberately:
per-dispatch persistence is the app's crash-durability guarantee, and this project's #1 rule
is never lose data. Revisit only if profiling shows real jank (then: debounce + flush on
`visibilitychange`/`pagehide`).

### W2. Auto-complete sweep runs on every session mutation (not just app load)
`App.jsx:105-119` deps `[state.sessions, initialLoad]`. Verifier confirmed the continuous
sweep is the ONLY mechanism that completes sessions lapsing while the app stays open
(across midnight); narrowing deps to `[initialLoad]` would regress that. The instant
auto-complete of retroactively-booked past sessions is acceptable (they ARE lapsed).
CLAUDE.md's "on app load" wording corrected; clarifying comment added in code.

### W3. `_modified`/audit timestamps use `toISOString()`
Correct usage — those are absolute machine timestamps for merge ordering, not display.
The UTC trap applies to display/comparison only.
