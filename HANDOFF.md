# PTApp — HANDOFF / WORK ORDER

**Last updated:** 2026-08-03, ~08:00 Beirut (written from the CCHealth terminal — findings below
were verified against source and git, not assumed).
**To resume:** Pierre types `continue`. **Read §0 back to him and stop.** Do not start work, do not
investigate, do not ask follow-up questions beyond the single one in §0.

---

## 0. Status — read this out

- App is at **v2.14.3**, deployed, working. **No code is broken. Nothing here is urgent.**
- There is a **4-part tidy-up work order queued** (§1): CLAUDE.md is 41 KB and slow to load,
  two shipped versions are missing from the changelog, and one instruction in it is stale.
  **Part D stops it happening again** — that's the part that matters most.
- **Uncommitted:** `tmp/` is untracked. Nothing else.
- Everything below was verified 2026-08-03 — evidence is in §2, so don't re-derive it.

**Ask him:** *"Work order has 4 parts — changelog backfill, CLAUDE.md slim, health check, and the
discipline rules that stop the regrowth. All four in order?"* Then stop.

---

## 1. The work order

### Part A — Backfill the changelog gaps (DO THIS FIRST)

Part B deletes text from `CLAUDE.md`. Anything not preserved first is gone. Order matters.

1. **`v2.13.1` and `v2.13.2` are missing from `CLAUDE.md` entirely** — it jumps v2.13.0 → v2.14.0.
   Both shipped and deployed. Recover from git and add them:
   ```
   git show 7b87ada   # v2.13.1 Deadlift pull-anchor-only + English day headers in AR
   git show 5b0131b   # v2.13.2 age-banded 1RM standards (Elie confirmed)
   git show 9b0243a   # docs: v2.13.1-3 changelogs + instructions — check for a v2.13.3 too
   ```
   Check whether `docs/instructions-v2.13.md` already covers .1/.2/.3. If it does, a one-line
   pointer in CLAUDE.md is enough. If not, write the missing detail into it.

2. **Three versions have no `docs/instructions-v*.md` to fall back on** — `v2.11.1`, `v2.10.3`,
   `v2.10.4`. Before collapsing their CLAUDE.md sections, copy each one **verbatim** into
   `docs/instructions-v<ver>.md`. Do not reword; the point is a lossless move.

3. **`CLAUDE.md` line ~29 cites `docs/instructions-v2.14.0.md`, which does not exist.** The real
   file is `docs/instructions-v2.14.md`. Fix the reference (or rename the file — pick one and be
   consistent with the rest of the folder).

**Acceptance:** every version named in CLAUDE.md resolves to a real file, and
`ls docs/instructions-v*.md` has no gaps against `git log --oneline | grep -i "^.* Deploy v"`.

---

### Part B — Slim CLAUDE.md (41 KB → target ~22 KB)

It was slimmed once before (41k → 19.5k at v2.9.2 — it says so in its own changelog) and has
**regrown to 41,564 bytes**. Nine full per-version sections re-accumulated, lines 28–94, worth
**13,006 bytes**. That is the single biggest chunk of session-start context in the whole workspace.

**The trap:** those sections are not pure history. Several carry rules that are still in force —
"THE single kernel", "never reimplement", "never author package-array surgery at call sites".
**Do not collapse them blind.**

**Good news, already checked:** most of those rules are *already* duplicated elsewhere in the file
and survive collapsing untouched —

| Rule | Already lives at |
|---|---|
| `EDIT_CURRENT_PACKAGE` owns replace-last-package writes | Reducer actions table, `EDIT_CURRENT_PACKAGE` row |
| `generateProgram()` is the one kernel | Reducer actions table, `ADD_PROGRAM` row |
| `EDIT_PROGRAM` / `EDIT_EVALUATION` full-record contract | Reducer actions table |
| v2.10.1 spread-limit, catalog-key, merge-migration, dead-guard traps | `TRAPS` index |
| v2.10.2 synthetic-fixtures-vs-live-data trap | `TRAPS` index |

**Lift these into `TRAPS` / `CODING CONVENTIONS` BEFORE collapsing — they exist nowhere else:**

- **v2.10.3 — the PS5.1 trap.** *"Never round-trip source files through PowerShell 5.1
  `Get-Content`/`Set-Content` — the ANSI default mangles UTF-8. Use the Edit tool for in-file
  renames."* **Verified: this string is in `CLAUDE.md` but NOT in `docs/traps.md`.** It is the one
  that would actually be lost. Add it to `docs/traps.md` and the TRAPS index.
- **v2.12 — `compute1RMFrozen(gender, age, raw)` in `normCharts.js` is THE single 1RM scoring
  kernel.** Both the EvalForm live chips and the save path call it. Never reimplement the ratio
  lookup or classify logic.
- **v2.11 — `src/normCharts.js` owns ALL chart data + scoring.** Never inline thresholds in
  components. Bump `CHARTS_VERSION` on any table change; old records keep frozen scores.
- **v2.13 — blocks store `days` (+`daysAlt` for endurance/fat-loss only), not 4 duplicated weeks.**
  Deliberate deviation from the spec's "weeks" framing, to keep `data.json` small.
- **v2.13 — the Deadlift anchor counts toward Back, not its bank primary (Quads).** `fillBucket`
  force-overrides the anchor's bucket to the day's major; without it Back runs an exercise short
  every block.
- **v2.12 — `EvalTimer.jsx` is retained but unrendered. Do not delete it** — a future rep-based
  battery could reuse it.

Then collapse v2.14.0 → v2.10.1 into the existing
`## Older Versions (one-line pointers — full details in docs/instructions-v*.md)` list, matching the
one-line style already used there. **Keep `## Current Version: v2.14.3` and `## Governance` in
full.**

**Acceptance:** `wc -c CLAUDE.md` ≈ 22,000 or less; every bullet in the table above findable in
TRAPS/CONVENTIONS/traps.md; `git diff` shows no rule text deleted without a new home.

---

### Part C — General health check

Pierre does the heavy lifting, but **Elie gives instructions in-session at Pierre's keyboard** under
the standing authority granted 2026-07-18. Two people driving one file over months leaves drift.
This is a drift sweep, not a rewrite.

1. **Stale instruction — CONFIRMED, fix it.** `CLAUDE.md` line ~45 still says the 1RM standards are
   *"Placeholder standards until the PT confirms… when his numbers arrive: edit the three tables in
   `normCharts.js` and bump `CHARTS_VERSION` to 3."* **This is already done.**
   `src/normCharts.js:16` reads `export const CHARTS_VERSION = 3;` and `docs/elie-next-visit.md`
   records Elie confirming his real age-banded numbers in v2.13.2 and explicitly choosing to keep
   the live tables. A session reading CLAUDE.md today would act on a completed instruction. Rewrite
   it as settled fact.
2. **Sweep for more of the same** — any "placeholder", "until X confirms", "awaiting", "parked",
   "TBD", "slipped to" in CLAUDE.md, checked against source and against `docs/elie-next-visit.md`.
   That file has already caught one stale framing; assume it caught others.
3. **Run the gates:** `node scripts/sanity/*.mjs` (or whatever the current runner is) — all of them.
   Report which pass, which fail, which no longer apply.
4. **`data.json` size vs the 1 MB ceiling.** Program pruning was deferred to v2.15 with the note
   *"do it before the 1MB data.json ceiling"*. Measure the live blob now and say how much headroom
   is left. This is the failure mode that already caused a real sync outage once (June 10).
5. **Sync token expiry: 2027-07-06** (`PTApp-sync-2026`, makdissi-dev, ptapp-data Contents R/W).
   Renewal due June 2027. Confirm it is still recorded somewhere that will actually be seen in time.
6. **Open review findings:** P3 (blocked on Pierre's SessionCard scope decision), P6
   (ordinal-at-booking-time), P7 — confirm current state against
   `docs/reviews/2026-06-10-fable5-codebase-review.md`.
7. **Untracked `tmp/`** — decide: gitignore it or clean it.

**Acceptance:** a short written report — what's stale, what's drifted, what's actually broken (if
anything). Detail in a file, summary to Pierre in ≤5 lines.

---

### Part D — The discipline that stops it regrowing (DO NOT SKIP)

Parts A–C are a one-time cleanup. **Without this part it all comes back.** It already did once:
the file was slimmed to 19.5 KB at v2.9.2, then every release appended a full section and nothing
ever collapsed them, so it drifted back to 41 KB over about five months. Nobody did anything wrong —
there was simply no rule saying where a changelog entry stops living in CLAUDE.md.

Add the following to `CLAUDE.md`, inside **`## How to Build, Verify, and Deploy`** so it sits in the
release checklist a session actually follows — not in a section that only gets read on purpose.

**1. Size budget — CLAUDE.md stays under 20 KB.**

Pierre's number, and it's a sound one: ~20 KB ≈ 5,000 tokens of session-start context. It was never
an enforced rule before, only where the last slim happened to land. Make it a real gate:

```bash
# Run at release time, before committing:
wc -c CLAUDE.md          # must be < 20000
```

Over budget ⇒ collapse the oldest full version section into `## Older Versions` before committing.
Do not "just this once" past it — that is precisely how 19.5 KB became 41 KB.

> ⚠️ **CLAUDE.md is only half the load.** `memory/MEMORY.md` is another 15 KB and loads on every
> session too, so PTApp currently costs ~14,200 tokens before Pierre types anything. Keep MEMORY.md
> under ~12 KB by the same logic. Report both numbers to Pierre when either moves.

**2. Only ONE full version section may exist — `## Current Version`.**

On every release: the outgoing Current Version collapses to a one-liner in `## Older Versions` in
the *same commit* that promotes the new one. Never leave two full sections standing. Nine had
accumulated by 2026-08-03.

**3. No version ships without both a changelog line and an instructions file.**

Every shipped version needs a one-liner in `## Older Versions` **and** a
`docs/instructions-v<ver>.md`. v2.13.1, v2.13.2, v2.11.1, v2.10.3 and v2.10.4 each broke this rule
in a different way. Add to the release checklist:

```bash
git log --oneline | grep -i "Deploy v" | head -20   # every one must resolve to both
ls docs/instructions-v*.md
```

**4. A durable rule NEVER lives only in a changelog entry.**

If a change establishes something permanent — "X is THE single kernel", "never do Y at call sites",
a platform trap — it goes into `TRAPS` / `docs/traps.md` / `CODING CONVENTIONS` / the reducer table
**at the time it is written**, not into the version section. The version section records *what
shipped*; the rule sections record *what is true*. The PS5.1 `Get-Content` trap is what happens when
this is skipped: it lived in a changelog entry alone and a routine slim would have deleted it.

**5. Completed instructions get rewritten as settled fact.**

When a "placeholder / awaiting / until X confirms / TBD" item is resolved, rewrite it in place as
what is now true. Do not leave pending language behind — a future session cannot tell a live
instruction from a finished one, and will act on it. The `CHARTS_VERSION` bump in Part C is exactly
this failure, and it survived three releases.

**Acceptance:** the five rules above are in CLAUDE.md's build/deploy section; `wc -c CLAUDE.md`
is under 20000; and a note goes in `docs/elie-next-visit.md` so Elie-driven sessions follow the same
discipline — he drives changes at Pierre's keyboard and his sessions are where the drift enters.

---

## 2. Evidence (verified 2026-08-03 — don't re-derive)

```
CLAUDE.md                        41,564 B   (~10,400 tokens of session-start context)
  lines 28-94, version sections  13,006 B   <- the regrowth
memory MEMORY.md                 15,151 B
                                            => ~14,200 tokens before a single prompt

v2.13.1 / v2.13.2 in CLAUDE.md   0 matches, but both shipped:
  7b87ada Deploy v2.13.1: Deadlift pull-anchor-only + English day headers in AR
  5b0131b Deploy v2.13.2: age-banded 1RM standards (Elie confirmed)
  9b0243a docs: v2.13.1-3 changelogs + instructions - Elie domain-review fix run

src/normCharts.js:16             export const CHARTS_VERSION = 3;   <- CLAUDE.md says "bump to 3"
grep -c "Get-Content" docs/traps.md  => 0    <- the v2.10.3 trap has no second home
docs/instructions-v2.14.0.md     does not exist (CLAUDE.md cites it; real file is v2.14.md)
missing instructions files:      v2.11.1, v2.10.3, v2.10.4
```

---

## 3. Guardrails — do not skip

- **Live-data snapshot before anything that touches data** (mandatory under Elie's standing
  authority): save `data.json` from makdissi-dev/ptapp-data to
  `_archive/PTApp/data-snapshots/YYYY-MM-DD-<desc>.json` and verify the byte count against the
  API's reported size. **Parts A and B are docs-only and do not need this. Part C step 4 reads the
  blob — read-only is fine.**
- **Everything goes through git**, commit + push, so anything can be rolled back.
- **Never delete or lose user data.** The PT's clients and sessions are real business records.
- **This is a tidy-up, not a refactor.** No behaviour changes, no schema changes, no deploy. If a
  real bug surfaces, write it down and tell Pierre — don't fix it inside this work order.
- **Keep responses to Pierre short** — he has an eyesight problem and cannot read long output.
  Detail goes in files. One line first, then stop.
