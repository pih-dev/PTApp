# PTApp v2.10.1 — Fable 5 Review Fix Pack (2026-06-10)

Maintenance release. No new features, no schema change, no migration (DATA_VERSION stays 4).
Source: a whole-codebase review run with fresh eyes on the new Fable 5 model — 7 finder
angles, ~30 verified findings. The full review report (including everything deliberately
NOT fixed) lives at **`docs/reviews/2026-06-10-fable5-codebase-review.md`** — that file is
the work order for the next session.

A live data snapshot was taken before any change:
`C:\projects\_archive\PTApp\data-snapshots\2026-06-10-pre-fable5-review-data.json`.

## Critical fixes

1. **Sync near-outage averted (`sync.js`).** `toBase64` spread the whole payload as
   function arguments; iOS Safari caps argument counts (~65K) and the live data.json was
   already 110KB pretty-printed. Now chunk-encoded (32K chunks) and uploads compact JSON
   (no pretty-print → roughly half the bytes per push).
2. **Merged-in records are now migrated (`utils.js`).** `mergeData` migrates the remote
   blob by its own `_dataVersion` (on a clone — the caller's reference must stay pristine
   for reconcile's push decision) and `mergeBackup` migrates the backup file before
   merging. Previously an old device or old backup could inject pre-v3/v4 records that
   would stay broken forever. New `scripts/sanity/sanity-merge-migration.mjs` (17 checks,
   runs against the real snapshot when present).
3. **White-screen fallback fixed (4 files).** `FOCUS_TAGS[type] || FOCUS_TAGS.Custom` was
   dead since v2.9.5 renamed the key to Endurance — any unmapped session type crashed the
   tab. New `getFocusTags(type)` helper owns the `|| []` fallback; same treatment for the
   7 positional `|| SESSION_TYPES[5]` copies via `getSessionType(label)`.
4. **Cross-device double-renewal guard now works (`RenewalModal.jsx`).** The v2.9.2
   pre-check was unreachable (stale prop + a condition `getCurrentPackage` can never
   satisfy). Now compares the live client's last-package id against the snapshot taken at
   modal open; a mismatch shows the "already renewed" banner instead of stacking a
   duplicate renewal.

## Medium fixes (UX / correctness)

- Arabic WhatsApp messages now format `{date}`/`{periodEnd}` in Arabic (`fillTemplate` takes `lang`).
- Dashboard: future sessions no longer glow amber "now" (date check added); "This Week"
  stat now counts 7 days, not 8.
- Repeat-mode booking banner no longer promises an auto-renewal that won't happen — it
  now says recurring booking does NOT auto-renew (new i18n keys EN+AR).
- Client form placeholders translated (4 strings); quick-WhatsApp greeting translated and
  routed through the shared `openWhatsApp`/`friendly` helpers.
- Todo edit input remounts on synced text change (`key={todo.text}`) — a mid-edit sync
  can no longer be silently reverted on blur.
- Doc viewer lists use `paddingInlineStart` (RTL); in-app "App Instructions" URL bumped
  from v2.9 (two versions stale) to v2.10.0 — bumping it is now a deploy-checklist step.
- ErrorBoundary backup filename uses local time (UTC trap).
- Multi-client booking commits via ONE `ADD_SESSIONS` dispatch (was N×`ADD_SESSION` in a
  loop). Side effect: a session for a just-deleted client is no longer created at all.

## Cleanup / perf

- New shared kernels in `utils.js`: `applyOverride` (override math existed in 3 copies),
  `formatOverrideDraft` (inverse of `parseSessionCountOverride`, existed in 2 copies),
  `makeTemplateSender` (booking/reminder senders were byte-identical), `openWhatsApp`,
  exported `friendly`.
- Dashboard derivations (`upcoming`, `weekSessions`, `renewalDueClients`, `todaySessions`)
  and Schedule's `occupiedSlots`/`daySessions` are `useMemo`'d — they recomputed with
  per-session Date allocations on every keystroke/tap.
- Deleted dead exports: `STATUS_MAP`, `PERIOD_OPTIONS`, `currentMonth`.
- Recurring preview row labels use `formatDate` (was an inline duplicate).
- `t` → `tag` callback rename inside the v3→v4 migration (shadowing trap, latent).

## Deliberate non-fixes (documented in the review report)

- `saveData` still writes localStorage on every dispatch (crash durability > perf — W1).
- Auto-complete sweep still runs on every session mutation (it's the only thing that
  completes sessions across midnight in an open PWA — W2; comment added in App.jsx).
- Dashboard memos freeze `Date.now()` between dispatches — the 2h roll-off and renewal
  banner can lag in an idle open app until the next interaction. Accepted; not deadlines.
- Preserved for a future session (P1–P8 in the review report): historical-ordinal bug for
  contract clients, O(n²) ordinal computation, EditableFocus/SessionCard extraction,
  repeat-mode fork hygiene, shared renewal-due selector, Session-#0 altitude fix,
  `EDIT_CURRENT_PACKAGE` reducer action, edit-mode chip semantics.
