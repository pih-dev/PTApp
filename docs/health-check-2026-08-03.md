# PTApp health check — 2026-08-03

Part C of the HANDOFF work order. A drift sweep, not a refactor: **no code, schema or behaviour
changed.** Two people have been driving this project's docs for months (Pierre, plus Elie in-session
under the standing authority granted 2026-07-18), and this is the check for what that left behind.

**Headline: nothing is broken.** One genuine risk was found and closed (live client data sitting
un-ignored in a public repo), and one documented "current" tooling claim turned out to be false.

---

## 1. Stale instruction — 1RM standards — FIXED

CLAUDE.md said the 1RM tables were *"placeholder standards until the PT confirms… when his numbers
arrive: edit the three tables in `normCharts.js` and bump `CHARTS_VERSION` to 3."*

That work was **already done**. `src/normCharts.js:16` reads `export const CHARTS_VERSION = 3;`, and
`docs/elie-next-visit.md` records Elie confirming his real age-banded numbers in v2.13.2 and
explicitly choosing to keep the live tables (a proposed flat-9% rewrite was declined).

A session reading CLAUDE.md today would have acted on a completed instruction. It survived three
releases. Now rewritten as settled fact in CODING CONVENTIONS:

> Bump `CHARTS_VERSION` on any table change… Currently **3** (Elie's real age-banded 1RM numbers,
> confirmed v2.13.2).

This is exactly the failure that **Part D rule 5** now exists to prevent.

---

## 2. Sweep for more pending language — 2 more found, both fixed

Grepped CLAUDE.md for `placeholder | awaiting | until X confirms | TBD | parked | slipped to |
pending | for now`, then checked each hit against source and `docs/elie-next-visit.md`.

**CLAUDE.md is now clean.** Two hits remain and both are correct: the P3/P6 review findings (genuinely
open) and the text of Part D rule 5 itself.

`docs/elie-next-visit.md` had the same disease in two whole sections, both closed on 2026-07-18 but
still written as to-do lists:

| Section | Was | Now |
|---|---|---|
| "For Elie to do in-app" | Two jobs written as pending | "In-app checks — DONE (2026-07-18)": smoke test passed, Arabic review done with zero corrections |
| "For Pierre FIRST (governance)" | "Decide whether Elie gets standing authority… until then, per-spec approval remains the rule" | "Governance — SETTLED (2026-07-18)": authority granted, conditions in CLAUDE.md, revocable there |

The governance one mattered most — it instructed a future session to treat per-spec approval as the
live rule, three weeks after Pierre replaced it with standing authority.

---

## 3. Sanity suite — 13 of 16 pass; the other 3 are spent by design

```
PASS  1rm · arms-migration · counting · evaluations · exercise-names-ar ·
      historical-ordinals · merge-migration · migration · programs ·
      recurring · reducer · slidingwindow · suggest-time
FAIL  live-v6-diff · live-v5-diff · live-migration
```

**None of the three failures is a defect.** Each is a one-shot pre-release gate whose first assertion
is *"the archived snapshot is still at the OLD schema version"* — and the archive has since moved
past it:

- `sanity-live-v6-diff.mjs` picks the **newest** file in `_archive/PTApp/data-snapshots/`. That is now
  `2026-07-18-elie-authority-baseline.json`, which is already `_dataVersion=6`. Its check
  `before._dataVersion === 5` therefore fails. **Every other assertion in it still passes** —
  byte-identical clients, sessions, todos, auditLog, messageTemplates, evaluations, no spurious
  `_lastModified` stamp.
- `sanity-live-v5-diff.mjs` reads a v4 snapshot correctly, then fails `result._dataVersion === 5`
  because `migrateData` now carries v4 straight through to v6. Correct behaviour, expired assertion.
- `sanity-live-migration.mjs` needs `scripts/sanity/live-snapshot-v2.8.json`, which does not exist and
  is gitignored. It cannot run at all. Genuinely dead — keep for archaeology only.

> ⚠️ **The real finding: CLAUDE.md named `sanity-live-v6-diff.mjs` as the CURRENT gate, and it can no
> longer function as one.** Anyone attempting a v6→v7 schema change would have run it, seen
> "── FAIL: DO NOT DEPLOY ──", and either been falsely blocked or learned to dismiss the gate as
> noisy. Both outcomes are worse than having no gate.
>
> **A gate keyed to "the newest file in a directory" expires the moment a newer file is archived.**
> CLAUDE.md now says all three are spent, and that a v6→v7 change needs a fresh
> `sanity-live-v7-diff.mjs` copied from the v6 one. Writing that script is a job for whoever does the
> next schema change — deliberately not done here, since this work order is a tidy-up.

---

## 4. `data.json` vs the 1 MB ceiling — comfortable, but the growth rate jumped 6.6×

Live blob, read from the API (`repos/makdissi-dev/ptapp-data/contents/data.json`):

```
151,686 B  =  14.5% of 1,048,576        headroom: 896,890 B
```

Growth from the archived snapshots:

| Date | Bytes | Note |
|---|---|---|
| 2026-05-11 | 85,896 | v4, 13 clients / 132 sessions |
| 2026-06-10 | 110,864 | pre-Fable-5 review |
| 2026-07-06 | 96,247 | *smaller* — v2.10.1's compact uploads |
| 2026-07-13 | 108,118 | pre-v2.13 |
| 2026-07-18 | 114,189 | Elie authority baseline |
| **2026-08-03** | **151,686** | live now |

- **Before programs shipped** (May 11 → Jul 13): ~353 B/day.
- **After** (Jul 18 → Aug 3): **~2,344 B/day — 6.6× faster.** +37 KB in 16 days.

At the post-programs rate the ceiling is roughly **383 days away (~Aug 2027)**. That is not urgent,
but the rate is not the point — **program records are lumpy**, and a burst of generation eats headroom
far faster than a linear projection suggests. The v2.15 pruning deferral still looks like the right
call; this is the number to re-measure before deciding it can wait again.

For context, the June 10 near-outage was a *different* limit (the ~65K-argument iOS spread crash at
110 KB), already fixed by chunked `toBase64`.

---

## 5. Sync token expiry — recorded in four places, but nothing fires on its own

**`PTApp-sync-2026`, makdissi-dev, ptapp-data Contents R/W only, expires 2027-07-06.**

Recorded in: `CLAUDE.md` → KNOWN ISSUES / OBLIGATIONS (loads every session) · `docs/traps.md` ·
the new `docs/instructions-v2.12.1.md` · memory `incident_token_expiry_20260630.md`.

That is solid coverage for anyone *working on the project*. But every one of those channels requires
a session to happen. The June 2027 renewal window is ten months out, and the 2026 expiry was missed
precisely because nothing announced itself. **A calendar reminder for June 2027 is the only channel
that fires without Pierre opening a terminal** — recommended, not done here (outside the work order).

---

## 6. Open review findings — no drift

`docs/reviews/2026-06-10-fable5-codebase-review.md` and CLAUDE.md agree exactly:

| | Status |
|---|---|
| P1, P2, P8 | FIXED in v2.10.2 |
| P4, P5 | FIXED in v2.10.3 |
| P7 | FIXED in v2.10.4 |
| **P3** | Open — SessionCard refactor, blocked on Pierre's scope decision |
| **P6** | Open — ordinal at booking time, needs a freeze-vs-live design call first |

Nothing to correct.

---

## 7. Untracked `tmp/` — the one real risk, now closed

**`tmp/` held the PT's real client data, was not gitignored, and this repo is PUBLIC.**

```
tmp/post-recovery.json          101,649 B   full live export (post token-recovery)
tmp/ptapp-live-20260511.json     85,896 B   full live export (v4, 13 clients / 132 sessions)
tmp/pt-feedback-ingested.txt     17,632 B   PT feedback text
```

The existing `.gitignore` covered `tmp/live-snapshot-*.json` and `tmp/*-snapshot.json` — **neither
pattern matches either filename.** A single `git add -A` or `git add tmp/` would have published real
client names and phone numbers to a public GitHub repo.

**Actions taken:**

1. **Preserved the one file with no archive copy.** `tmp/post-recovery.json` is byte-identical
   (md5 `b1e9b279…`) to `_archive/PTApp/incidents/2026-07-07-post-token-recovery-data.json`, so it was
   already safe. `tmp/ptapp-live-20260511.json` had **no copy anywhere** — it is now
   `_archive/PTApp/data-snapshots/2026-05-11-live-data-v4.json`, md5-verified identical. (It sorts
   before the July 18 baseline, so the snapshot-picking sanity script is unaffected.)
2. **`tmp/` is now gitignored wholesale.** A narrow pattern list can always be out-run by a new
   filename; `tmp/` is wipeable scratch by convention, so nothing in it should ever be committed.
   The `scripts/sanity/` patterns are kept and extended — that directory *is* tracked.
3. **Files left in place, not deleted.** Nothing forced a deletion, and the call is Pierre's. They are
   now both preserved and un-committable.

---

## Also fixed while sweeping (outside the listed items)

- **Three more missing instruction files than the work order knew about.** Diffing every `Deploy v`
  commit against `ls docs/instructions-v*.md` found `v2.12.1`, `v2.14.3` and `v2.9.1` missing on top
  of the named `v2.11.1`, `v2.10.3`, `v2.10.4`. All six now exist.
- **The Project Structure tree in CLAUDE.md was 8 files out of date** — missing `normCharts.js`,
  `programKernel.js`, `programRules.js`, `exerciseBank.js`, `exerciseNamesAr.js`, `EvalForm.jsx`,
  `ProgramSetup.jsx`, `ProgramViewer.jsx`, `TokenUpdateModal.jsx`, `ErrorBoundary.jsx`. Refreshed and
  moved to `docs/architecture.md`.
- **Pre-docs-era versions v1.4–v1.7 have no instructions file.** They predate the convention; left
  alone deliberately, noted here so a future gap check doesn't re-flag them.

---

## Judgment calls made during execution — flagged, not hidden

Two places where the work order said one thing and the result is slightly different. Both were
deliberate; Pierre can reverse either.

1. **`## Current Version: v2.14.3` was trimmed, not kept verbatim.** Part B said keep it "in full".
   It was 2,554 B, and most of that was implementation prose already duplicated word-for-word in
   `docs/instructions-v2.14.{1,2,3}.md`. Keeping it whole made the **<20,000 B gate in Part D
   unreachable** — and Part D's gate is the binding constraint, since it's the rule that stops the
   regrowth. **Every rule in it survived** (`suggestBookingTime` owns the booking rule, no
   duration-fit check, Dashboard has no quick-book form, `EXERCISE_NAMES_AR` keyed by frozen English
   names, swap keys stay English, day headers stay English, the full provenance note). What went is
   restated prose. `## Governance` was kept in full, untouched.
2. **`## Version History` is capped at 6 entries, which the work order didn't ask for.** An
   uncapped list is just the old problem at a smaller scale — it grows by one line every release,
   forever. Capping it makes the section bounded by construction, and everything older is one grep
   away in `docs/changelog-summary.md`. Two facts from dropped entries that were still load-bearing
   (the v2.10.1 shared utils, and the `snapshot-pre-v2.9.5` rollback tag) were kept in the tail line
   rather than lost. The cap is written into Part D rule 2.

---

## Context budget after this work order

| | Before | After | Budget |
|---|---|---|---|
| `CLAUDE.md` | 41,964 B | **19,941 B** | < 20,000 ✅ |
| `memory/MEMORY.md` | 15,151 B | 15,151 B | < 12,000 ❌ |

CLAUDE.md is inside its new hard gate. **`MEMORY.md` is ~3 KB over** — it loads on every session too,
so PTApp still costs roughly 8,800 tokens before Pierre types anything (down from ~14,200). Slimming
it means splitting hot/cold entries; that is a separate job and was not part of this work order.
