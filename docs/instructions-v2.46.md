# v2.46 — The review fixes: sync that keeps every phone's records, programs without duplicates

**Date:** 2026-08-25 · **Origin:** the 2026-08-25 full-app review (`docs/reviews/2026-08-25-full-app-review.md`), 12 confirmed findings, plus Elie's 2026-08-24 program-generation defect report. Pierre approved fixing everything; model/effort settings were explicitly excluded.

## What changed for the PT

1. **Program generation (rules v4).** No more 5–7-set entries carrying a 4-value pyramid — every
   exercise now takes at most its method's sets (+1 to absorb a lone orphan set), and a shorter
   entry slices its reps/%1RM pyramid to its real set count. A halved-quota anchor day gets its
   compounds back (anchor + several movements, not anchor + one 7-set monster). When a small
   muscle bank runs dry on a duplicated day, extra sets first widen that day's own fresh picks
   (up to 2·per−1, pyramid extended) before any movement from the paired day is repeated.
   Measured across intB/pro/intA profiles: broken prescriptions 61 → 0, oversized entries with
   wrong text 127 → 0, same-week repeats 15 → 12. Stored programs are frozen and unchanged;
   only new generations use v4.
2. **Swap picker.** No longer offers exercises already in the day (one tap used to create an exact
   duplicate) and never offers Deadlift (Pull-day anchor only — rules v2). An exhausted bucket now
   says so instead of showing an empty sheet. EN + AR.
3. **Movement figures.** Arnold Dumbbell Press now draws the overhead-press pair (it drew the
   bench-press pair — classifier order bug). Verified: exactly 1 of 340 classifications changed.
   A tilt/pan/zoom gesture on the figure no longer drags the movement sheet closed.
4. **Arabic.** The day-major row shows «الأرجل» instead of English "Legs" on every legs movement.

## What changed underneath (sync + data safety)

5. **The 409-merge is no longer undone (S1).** When a push conflicts because another phone wrote
   first, the driver merges and pushes the union — and now hands that union back to the app,
   which folds it into state. Before, the app never learned about the merge, so its next push
   (armed with the fresh concurrency token) silently stripped the other phone's record out of
   remote — the three-device session-loss path. Applied to BOTH drivers (GitHub live, Supabase
   pre-installed for the cutover). A plain success deliberately returns nothing: folding every
   pushed blob would resurrect records deleted while the push was in flight (no tombstones).
6. **A fresh device can no longer wipe the WhatsApp templates (D1/D2).** An empty template set is
   treated as absence, not as newer data — the non-empty side wins in every merge and in backup
   restore. The "reset templates" button writes a timestamped sentinel instead of an empty set so
   a deliberate reset still propagates.
7. **Identity now gates the PAT paths (A1).** A signed-in account (tester or otherwise) on a
   device holding the sync token can no longer reconcile, push, retry, update the token, or use
   cloud backup/restore against the PT's live data — the token path belongs to the signed-out
   legacy store only, until cutover. Empty workspace stays empty, live data stays the PT's.
8. **A corrupt local store is quarantined (D3)** under `<key>-corrupt-<ts>` (older parks pruned)
   before the app falls back to empty state, instead of being overwritten on the next render.
9. **Clients tab crash guard (I1).** A legitimately-null evaluation classification no longer
   throws and takes the whole tab down.
10. **In-app instructions unstuck** — the button was pinned to v2.43; now v2.46 (this file).

## Deferred, recorded

- **D4** (packages[] client-granularity LWW — an edit on a stale device can revert a renewal) needs
  per-package stamps = schema design; in the review backlog, not fixed here.
- The review's 18 unverified candidates: `docs/reviews/2026-08-25-full-app-review.md`.
- Growing the small muscle banks (Rear Delts 4, Calves 5) is the real end of same-week repeats —
  a content task for Elie.

## Verification

Full sanity suite green (rls-matrix exit 2 = live RLS skipped, as documented). Kernel measured
old-vs-new on three client profiles; classification diffed across all 340 movements (1 intended
change). Three reviewer subagents (data-integrity, mobile-UX, i18n/RTL) ran over the diff; their
blockers (delete-resurrection via the S1 fold, the cloud-snapshot buttons missing the A1 gate,
the reset-templates sentinel) are fixed above. `PROGRAM_RULES_VERSION` 3 → 4.
