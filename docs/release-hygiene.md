# PTApp — Release Hygiene, Deploy Hazards & Review Discipline

`CLAUDE.md` keeps the **rules** — the one-liners a session can act on without opening anything.
This file keeps the **evidence**: why each rule exists, which release broke it, and what it cost.
Routed into a turn by the `UserPromptSubmit` hook on `release hygiene, deploy, gh-pages, sanity
suite, live diff, review discipline`.

The split is deliberate. A rule that only lives here would be invisible on a prompt that never
mentions the keyword — so nothing load-bearing was moved out of `CLAUDE.md`, only the reasoning.

---

## 0. The deploy pipeline (mirror of `CLAUDE.md` — never skip a step)

```bash
npm run build                      # 1. build
node scripts/verify-bundle.mjs     # 2. bundle must parse — catches the blank-page corruption
                                   # 3. bump the version in the App.jsx debug panel; rebuild if changed.
                                   #    Feature release ⇒ also bump DOCS.instructions in General.jsx
                                   # 4. release-hygiene gate (§1) — BEFORE committing
git add <files> && git commit -m "…" && git push origin master   # 5. source

# 6. gh-pages is what makes it live
cp dist/index.html /tmp/ptapp-deploy.html && cp dist/sw.js /tmp/ptapp-deploy-sw.js && cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html && cp /tmp/ptapp-deploy-sw.js sw.js && cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy vX.Y: description" && git push origin gh-pages
git checkout master

gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status       # 7. must reach: built
```

Then tell Pierre the version number, so he can verify on his phone.

---

## 1. The release-hygiene rules — where they came from

Added 2026-08-03, after `CLAUDE.md` was measured at **41,964 B**. It had been slimmed to 19.5 KB at
v2.9.2 (2026-04-21) and grew back to 42 KB in roughly five months. Nothing dramatic caused it:
**every release appended a full section, and no release ever collapsed one.** Nine full version
sections had accumulated by the time it was measured.

The failure mode is not laziness, it is that each individual append looks harmless. That is exactly
why the rules are phrased as gates rather than as advice — *"do not skip these just this once"* is
the sentence that would have prevented all five months of drift.

### Rule 1 — under 22,000 B (raised from 20,000 on 2026-08-05)

≈5,500 tokens at every session start, paid before Pierre types anything. Over budget ⇒ collapse the
oldest version section **before** committing, not later.

**Why it was raised.** The Topic Router table costs ~3.4 KB of permanent session-start weight and
cannot be made much smaller — its cost is dominated by literal file paths, which the injection hook
must be able to resolve verbatim. Landing it under 20,000 would have meant deleting rules: the TRAPS
index, the single-source kernel table, or the deploy pipeline. Those are the parts of the file that
have actually prevented incidents, so the budget moved instead of the safety net.

What kept the increase to 3.4 KB rather than ~6 KB: the long tail of docs routes through one row
pointing at `docs/README.md`, an index that is itself only loaded on a keyword match. Roughly
40 would-be router rows became index lines that cost nothing per session.

⚠️ `CLAUDE.md` is only half the load. `memory/MEMORY.md` loads every session too. Report **both**
numbers to Pierre whenever either moves.

### Rule 2 — only one full version section

`## Current Version` is the only place a release gets a full write-up. The outgoing one collapses to
a single `## Version History` line **in the same commit** that promotes the new one — not in a
follow-up commit, because the follow-up commit is the one that never happens. Version History is
itself capped; the entry that falls off the end goes to `docs/changelog-summary.md`.

### Rule 3 — no version ships without a changelog line AND an instructions file

Naming: a `.0` release is `instructions-vX.Y.md`, patch releases `instructions-vX.Y.Z.md`
(`v2.10.0.md` is a legacy exception, left alone deliberately).

Eight releases broke this, each differently, and all eight were backfilled on 2026-08-03:
**v2.9.1, v2.10.3, v2.10.4, v2.11.1, v2.12.1, v2.13.1, v2.13.2, v2.14.3.** Three were named in the
original work order; the other five were found by diffing every `Deploy v` commit message against
`ls docs/instructions-v*.md` — which is the check to run, not a memory of which ones are missing:

```bash
git log --all --oneline | grep -i "Deploy v"
ls docs/instructions-v*.md
```

### Rule 4 — a durable rule never lives only in a version or changelog entry

"X is THE single kernel", "never do Y at call sites", a platform trap → it belongs in `TRAPS`,
`docs/traps.md` or CODING CONVENTIONS **at the moment it is written**. Version sections record
*what shipped*; rule sections record *what is true*.

The case that proved it: the **PS 5.1 `Get-Content`/`Set-Content` UTF-8 trap** existed in exactly one
changelog entry and nowhere else. A routine collapse of that version section would have deleted a
trap that silently corrupts every em-dash, emoji and Arabic character in the source. It is now a full
write-up in `docs/traps.md`.

### Rule 5 — completed instructions get rewritten as settled fact

When a "placeholder / awaiting / until X confirms / TBD / parked" item resolves, rewrite it in place.
A future session cannot distinguish a live instruction from a finished one, and will act on it.

The case: the `CHARTS_VERSION` bump survived **three releases** as a pending instruction after it had
already been done.

### Rule 6 — a new doc gets a router row or a `docs/README.md` line in the same commit

Added 2026-08-05 with the Topic Router. Before it existed, **81 of PTApp's 83 docs could not be
reached by any keyword** — the largest unrouted pile in the workspace. Every one of them was written
by a session that believed writing it was the whole job.

An unreachable doc is worse than no doc: it costs the effort of writing, and it creates the false
belief that the fact is "written down somewhere" while the next session answers from recollection.
Route it, or accept that it is an archive nobody will open.

---

## 2. Deploy hazards

### `gh-pages` push ≠ deployment

Pushing to `master` does not deploy — the live site serves from `gh-pages`. **And pushing to
`gh-pages` does not guarantee deployment either.**

**2026-06-11 incident:** two pushes five minutes apart hit a GitHub artifact race. The deploy step
failed, and the stale record showed `building` for 24 hours — long enough for the app to look shipped
while serving the old bundle. Fix:

```bash
gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status   # must reach: built
gh api -X POST repos/pih-dev/PTApp/pages/builds                # force a rebuild, then re-verify
```

Avoid rapid back-to-back `gh-pages` pushes. Batch the change instead.

### All three live-data diff gates are SPENT — and that is by design

`scripts/sanity/` holds `live-v6-diff`, `live-v5-diff` and `live-migration`. Each one asserts that
the archived snapshot is still at its pre-release schema version. The archive has moved past all
three, so each now prints **"DO NOT DEPLOY"** every time it runs. Nothing is broken.

The underlying trap is worth naming, because it will recur: **a gate keyed to "the newest file in a
directory" expires the moment a newer file is archived.** It cannot be fixed once and left alone.

A v6→v7 schema change therefore needs a **new** `scripts/sanity/sanity-live-v7-diff.mjs`, copied from
the v6 one and re-pointed. Do not deploy a schema change without it — the v2.9 near-miss
(2026-04-21) was caught by exactly this gate, two active overrides about to be lost.

### The sanity suite

```bash
for f in scripts/sanity/*.mjs; do node "$f"; done
```

13 of 16 pass on demand. The 3 failures are the spent live-diff gates above.

---

## 3. Review discipline — the long form

`CLAUDE.md` carries the trigger and the checklist. The reasoning:

**Why "3+ changes or ~2 hours"** — not a productivity ritual. Every bug in `docs/traps.md` that was
found *late* was found late for the same reason: the fix landed at one author site and the pattern
existed at four. The pause exists to ask "where else does this shape appear", while the shape is
still fresh enough to recognise.

The checks, and the incident behind each:

| Check | Where it came from |
|---|---|
| Did the fix land everywhere the pattern exists? | v2.9.2 — `Schedule.jsx` still wrote legacy v2 root fields the migration deletes ("per-feature author-site drift") |
| Every read AND write migrated on a storage refactor? | The v2→v3 override drop, caught only by the live-data diff |
| Callbacks shadowing `t` / `d`? | The i18n shadowing trap, hit more than once |
| Inline `marginLeft` / `borderLeft`, or hardcoded colours? | RTL breakage + theme drift; `--t1`..`--t5` exist for this |
| Strings missing from `i18n.js`? | Hardcoded English placeholders shipped in the client form (M6) |
| Anything that deletes, overwrites, or fails to migrate? | Two data-loss incidents, April 13 and April 19 |
| New `.catch(() => {})` or dispatches in loops? | The Hala Mouzanar data loss — four silent catches survived the first fix |

**After every commit:** bug fix → root cause + pattern into `docs/traps.md`, then grep for it
elsewhere · feature → `docs/instructions-v{X}.md` + both changelogs · design decision → CONVENTIONS
or `docs/architecture.md`, never only the commit message · incident → memory.
