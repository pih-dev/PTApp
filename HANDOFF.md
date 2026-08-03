# PTApp — HANDOFF

**Last updated:** 2026-08-03, ~09:30 Beirut.
**To resume:** Pierre types `continue`. **Read §0 back to him and stop.** Do not start work, do not
investigate, do not ask follow-up questions beyond the single one in §0.

---

## 0. Status — read this out

- App is at **v2.14.3**, deployed, working. **Nothing is broken. Nothing is urgent.**
- **The 4-part tidy-up work order is DONE and pushed** (2026-08-03). CLAUDE.md 41,964 → **19,941 B**,
  8 missing instruction files written, release-hygiene rules added so it can't regrow.
- **One real risk was found and closed:** `tmp/` held the PT's real client data (names, phones) and
  was NOT gitignored — in a public repo. Now ignored wholesale; the one unarchived export preserved
  to `_archive`.
- **Two things left open, neither urgent:** `memory/MEMORY.md` is 15.1 KB against a 12 KB budget,
  and the next schema change needs a fresh `sanity-live-v7-diff.mjs` (all three existing live-diff
  gates are spent).
- Full report: `docs/health-check-2026-08-03.md`. Nothing needs re-deriving.

**Ask him:** *"Work order's done. Next: slim MEMORY.md to budget, or leave it and pick up P3/P6?"*
Then stop.

---

## 1. What was done (2026-08-03) — for reference, don't re-read unless asked

Detail lives in `docs/health-check-2026-08-03.md` and the two commit messages. One line each:

- **Part A — backfill.** Wrote `docs/instructions-v{2.9.1,2.10.3,2.10.4,2.11.1,2.12.1,2.14.3}.md`.
  Three were named in the work order; three more gaps were found by diffing every `Deploy v` commit
  against `ls docs/instructions-v*.md`. Each carries the CLAUDE.md text it replaces verbatim, so the
  move is provably lossless. v2.13.1/.2/.3 were already covered by `instructions-v2.13.md`.
- **Part B — slim.** Nine full version sections collapsed into `## Version History` (capped at 6
  entries). Stable reference moved to the new `docs/architecture.md`. Six rules that lived ONLY in a
  version section were lifted first — most importantly the **PS 5.1 `Get-Content` UTF-8 trap**, which
  had no second home and would have been deleted by a blind collapse; it is now a full write-up in
  `docs/traps.md`.
- **Part C — health check.** Report: `docs/health-check-2026-08-03.md`. Findings in §0 above.
- **Part D — discipline.** Five release-hygiene rules now sit inside CLAUDE.md's build/deploy
  checklist: <20 KB gate, one full version section at a time, no version without both a changelog
  line and an instructions file, durable rules never live only in a changelog entry, resolved
  "placeholder/TBD" items get rewritten as settled fact. Mirrored into `docs/elie-next-visit.md`,
  since Elie-driven sessions are where the drift enters.

## 2. Open items, in the order they'd matter

1. **`memory/MEMORY.md` is 15,151 B against a ~12 KB budget.** It loads on every session, so PTApp
   still costs ~8,800 tokens before Pierre types anything (down from ~14,200). Fixing it means
   splitting hot/cold entries — a separate job, deliberately not done inside the work order.
2. **The next schema change needs a new gate.** All three live-diff scripts are spent: each asserts
   the archived snapshot is still at the pre-release version, and the archive has moved past it.
   A v6→v7 change needs `sanity-live-v7-diff.mjs`, copied from the v6 one. See health check §3 —
   the underlying trap is that a gate keyed to "newest file in a directory" expires by itself.
3. **`data.json` growth rate jumped 6.6×** once program generation shipped: ~353 B/day before,
   ~2,344 B/day after. Now 151,686 B = 14.5% of the 1 MB ceiling, ~383 days of headroom at that rate.
   v2.15 pruning can still wait, but re-measure before deferring it again.
4. **Calendar reminder for June 2027** — the sync token expires 2027-07-06. It's recorded in four
   places, but all four need a session to happen; the 2026 expiry was missed for exactly that reason.
5. **Review findings P3 and P6** are still open and still blocked on decisions, not on work.
   P3 = SessionCard refactor (needs Pierre's scope call). P6 = ordinal at booking time (needs a
   freeze-vs-live design call — the confirm popup must reflect override edits live).

## 3. Guardrails — unchanged

- **Live-data snapshot before anything that touches data** (mandatory under Elie's standing
  authority): save `data.json` to `_archive/PTApp/data-snapshots/YYYY-MM-DD-<desc>.json` and verify
  the byte count against the API's reported size.
- **Everything goes through git**, commit + push, so anything can be rolled back.
- **Never delete or lose user data.** The PT's clients and sessions are real business records.
- **Nothing in `tmp/` is committable, and nothing in it is safe** — it can be wiped without warning.
  Anything that must survive goes to `C:\projects\_archive\PTApp\`.
- **Keep responses to Pierre short** — he has an eyesight problem and cannot read long output.
  Detail goes in files. One line first, then stop.
