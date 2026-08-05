# PTApp — Personal Trainer Client Management App

> 🚨 **RESUMING? READ `HANDOFF.md` FIRST — AND ONLY THAT.**
> Reply with its §0 in ≤5 lines, ask the one question it names, then stop. Do not read this file
> end-to-end, do not explore, do not start work unprompted.

## Session Startup
- Always push to master AND deploy to gh-pages after every commit (see the deploy section)
- Auto-push to GitHub after every commit — do not ask, just push
(Remote control, commit discipline, memory, and session management are in the global ~/.claude/CLAUDE.md)

## What This Project Is
A mobile-first web app for a personal trainer to manage his gym clients. The PT uses it on his iPhone; Pierre develops and tests on Android.
- **Developer:** Pierre (pierreishere@gmail.com / GitHub pih-dev).
- **End user:** Elie, the PT — holds standing authority to drive changes (see Governance).

## Topic Router
PTApp's depth lives in `docs/`. **A `UserPromptSubmit` hook injects the matching file into the turn**
on these keywords — don't open them yourself, and never answer from recollection when one arrives.

| Keywords | Read (relative to `C:/projects/PTApp/`) |
|---|---|
| architecture, file tree, project structure, tech stack, reducer, dispatch, roadmap | `docs/architecture.md` |
| trap, traps, gotcha, why did this break, edge case | `docs/traps.md` — 40 KB, injection truncates at 8 KB; the TRAPS index below stays the complete list |
| colour, color, palette, theme, dark mode, light theme, typography, look and feel | `docs/design-system.md` |
| data size, ceiling, pruning, overhead, performance budget, how big | `docs/app-health.md` |
| sync, syncing, offline, service worker, localStorage, stale device | `docs/sync-and-offline-review.md`, `docs/superpowers/specs/2026-04-13-sync-fix-design.md`, `docs/instructions-v2.6.md` |
| Elie, the PT, next visit, standing authority, governance, snapshot | `docs/elie-next-visit.md` |
| health check, sanity suite, live diff, spent gate, MEMORY.md size | `docs/health-check-2026-08-03.md` |
| deploy, gh-pages, pages build, release hygiene, review discipline | `docs/release-hygiene.md` — full 7-step pipeline, the Jun 11 Pages race, why the gates are spent |
| review findings, P3, P6, SessionCard, refactor backlog | `docs/reviews/2026-06-10-fable5-codebase-review.md`, `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md` |
| app name, store, publish, capacitor, native app, stage 2 | `docs/2026-07-14-app-name-research.md`, `docs/stage2-publishing-guide.md` |
| changelog, what changed in, release notes | `docs/changelog-summary.md` — every version in plain English, newest first |
| program, exercise bank, volume, weak point, generation rules | `docs/superpowers/specs/2026-07-13-program-generation-design.md`, `docs/instructions-v2.13.md` |
| 1RM, one rep max, norms, standards, evaluate, evaluation | `docs/superpowers/specs/2026-07-06-1rm-battery-replaces-mass-design.md`, `docs/instructions-v2.12.md` |
| arabic, translation, i18n, RTL, transliteration | `docs/superpowers/specs/2026-07-17-exercise-names-arabic-design.md`, `docs/instructions-v2.14.2.md` |
| split, training days, mass battery, eval timer, measurement console, observe and grade, booking time, free slot, recurring, repeat sessions, override, session count, backfill, contract, package, renewal, billing period, renew, upcoming, home screen, roll off, whatsapp, confirm link, calendar link, multi-client, group booking, visual polish, light redesign, focus tags, tag split, error boundary, white screen, ordinal, counting kernel, fork hygiene, screenshot, which doc, where is it documented | `docs/README.md` — the index of every doc, spec and per-release write-up. **It names the file; you still open it.** |

The long tail routes through `docs/README.md` rather than 20 more rows, because a row costs bytes in
*every* session while the index costs them only on a match. Unrouted on purpose:
`docs/superpowers/plans/*` (14 build logs, 10–90 KB — they truncate at the 8 KB budget and their
first 8 KB is scaffold; the **spec** is the design record) and `docs/changelog-technical.md` (163 KB).

**Adding a row?** Keywords must match how Pierre *speaks*, not how the doc is titled; keys of ≤4
characters need a word boundary, so `trap` does not match `traps` — list both. The rule a session can
act on alone stays inline here; only the evidence and the procedure route.

## Current Version: v2.14.3
Three same-day point releases (2026-07-17), all driven by **Elie in-session** (Pierre absent). UI-only; `DATA_VERSION` stays 6, `EXERCISE_BANK_VERSION` untouched. Detail routes on `booking time` / `arabic`, or read `docs/instructions-v2.14.{1,2,3}.md`.
- **v2.14.1 — booking time suggestion.** `suggestBookingTime(sessions, clients, date)` in `utils.js` OWNS the rule (first free 15-min slot from 08:15; **no duration-fit check** — Elie's explicit choice). `Schedule.jsx` re-suggests on date change behind an ephemeral `timeTouched` flag: a manual tap always wins, edit mode never re-suggests. **Dashboard has NO quick-book form** — its `time:'09:00'` default is dead code.
- **v2.14.2 — Arabic exercise names.** `src/exerciseNamesAr.js` — handwritten, NOT generated, NOT in `i18n.js`; all 340 bank movements keyed by the exact English `name` frozen in program records, so old programs show Arabic automatically. **Swap keys and `doSwap` stay on English names** (the storage key); day headers stay English (Elie, reconfirmed).
- **v2.14.3 — transliteration rule.** Elie's standing rule for all future Arabic — see CONVENTIONS → Arabic/i18n.
- **PROVENANCE:** requested by Elie at Pierre's keyboard, per-spec approvals accepted on trust; **Pierre confirmed them and granted standing authority 2026-07-18** (below). Revert paths: `docs/instructions-v2.14.{1,2}.md`, `docs/elie-next-visit.md`.

## Governance — Elie's Standing Authority (granted 2026-07-18)
Elie may drive app changes in-session, on Pierre's conditions (*"since we're using github we can roll back, make sure data backups are done at every juncture"*). Full context routes on `Elie` / `standing authority`.
- **Everything goes through git** — commit + push every change, so anything Elie drives can be rolled back. No un-committed experimentation on live-facing branches.
- **Live-data snapshot at every juncture (MANDATORY):** before any deploy, schema change, migration or data-touching operation, save `data.json` from makdissi-dev/ptapp-data to `_archive/PTApp/data-snapshots/YYYY-MM-DD-<desc>.json` and verify its byte count against the API's reported size. Baseline: `2026-07-18-elie-authority-baseline.json`.
- **Provenance discipline continues** — specs, commits and changelogs record who asked for what, so Pierre can audit post-hoc. The grant was accepted on trust (identity is unverifiable in-terminal); Pierre can revoke or re-scope it by editing this section.

---

## Version History
**Last 6 releases, one line each**; the 7th drops off to `docs/changelog-summary.md`. Detail lives in `docs/instructions-v*.md`. Rules still in force do NOT live here — they live in TRAPS / CODING CONVENTIONS.

- **v2.14.0** (07-14) — Multi-day split program generation, 3–6 days; `PROGRAM_RULES_VERSION` 2→3. → `v2.14.md`
- **v2.13.1–.3** (07-14) — Elie domain-review fix run: Deadlift pull-anchor-only, English day headers in AR, age-banded 1RM standards (`CHARTS_VERSION` 2→3), trainer level override. → `v2.13.md`
- **v2.13.0** (07-13) — Program generation from a 1RM evaluation (PT feature #3). Schema v5→v6, additive `programs[]`. → `v2.13.md`
- **v2.12.1** (07-07) — Token-expiry surfacing + `TokenUpdateModal.jsx`; replacement never touches local data. → `v2.12.1.md`
- **v2.12.0** (07-06) — 1RM battery replaces the mass battery; additive `branch:'1rm'`, DATA_VERSION stays 5; mass records view-only. → `v2.12.md`
- **v2.11.1** (06-13) — Eval measurement console/timer (ephemeral); Evaluate moved to the top of the client card. → `v2.11.1.md`
- **v2.11.0 and earlier** — routed `changelog-summary.md`. Rollback tag for the v3→v4 tag split: `snapshot-pre-v2.9.5`.

---

## Data Preservation Rules (CRITICAL)
- **NEVER delete or lose user data.** The PT's clients and sessions are real business records.
- **Backward compatible always.** Schema change ⇒ increment `DATA_VERSION` and write a `migrateData` step in `utils.js`. Never make the user re-enter anything. `_dataVersion` tracks the schema per blob.
- **Preserve history.** Even if a feature is removed, keep its data — archive under another key if needed, never drop it.
- **Every top-level collection follows the `sessions[]` pattern** in `mergeData`, `mergeBackup` and `REPLACE_ALL`; `DELETE_CLIENT` cascades to that client's sessions, evaluations and programs. Never orphan a record; never let an explicit key list drop a collection.
- **Test migrations against live data.** Synthetic fixtures are necessary but not sufficient — run the current live-diff gate against the PT's real exported data before deploying a schema change.

---

## TRAPS
Full write-ups in **`docs/traps.md`** — read the relevant one before touching that area. Index:

**Dates & JS** — `toISOString()` is UTC: use `today`/`localDateStr`/`localMonthStr`/`currentMonth` · never shadow `t` in a `.map`/`.find` callback · `defaultValue` inputs need a `key` tied to state · `fn(...arr)` throws past ~65K elements on iOS, chunk with `.apply` · hardcoded date stamps in fixtures rot, compute them at runtime.

**iOS / mobile** — safe-area insets, modal z-index 200+, sticky `modal-footer`, visualViewport resize · tap targets in the bottom 60%, settings in General not the header · never start a textarea `readOnly` and clear it in `onFocus` · swipe-to-dismiss only when `scrollTop === 0` at touchstart · PWA standalone needs BOTH the meta tag AND `manifest.json` `"display":"standalone"`.

**RTL / i18n** — `marginInlineStart`/`borderInlineStart`, never `marginLeft`/`borderLeft`.

**Data & sync** — never `.catch(() => {})` (the Hala Mouzanar data loss) · `initialLoad`+`syncReady`+`skipSync` must ALL pass before a push · never dispatch in a loop · `state.X` read right after `dispatch(ADD_X)` is stale (Session #0) · merge paths must `migrateData` the FOREIGN blob by its own `_dataVersion`, on a clone · `mergeData`'s key list drops collections a stale bundle doesn't know — after a deploy adding one, confirm BOTH phones show the new version first · a 401 must look different from a network blip and route to the replacement UI.

**Refactoring** — grep EVERY read and write when moving a storage location · a renamed catalog key silently kills `|| CATALOG.oldKey` fallbacks (property refs don't match string greps) · re-read a helper's fallback contract before guarding its return; "did the world change" checks read LIVE state and compare stable IDs · `parseSessionCountOverride` returns `{ type, value }`, not `.mode` · legacy `periodLength` was the billing master switch, not `periodStart`.

**Correctness across screens** — a pre-action badge and a post-action badge in one flow must use the same helper (the "(0) → #1" confusion) · synthetic fixtures model what you designed, live data holds what shipped: diff counting/date-resolution/migration changes against the archived snapshot first, and re-read the OLD code exactly when writing a migration.

**Tooling** — `fixForFileProtocol` must use *function* replacement (a string breaks React's minified `$&`) · **PS 5.1 `Get-Content`/`Set-Content` mangles UTF-8** (ANSI default corrupts em-dashes, emoji and all Arabic) — use the **Edit tool**, never round-trip source through a PowerShell pipeline.

---

## CODING CONVENTIONS

### Single-source kernels — never reimplement these
One function owns the computation, and **both the live preview and the save path call it**, so they cannot disagree by construction.

| Kernel | Owns | In |
|---|---|---|
| `compute1RMFrozen(gender, age, raw)` | 1RM ratio lookup + classification (`computeEvalFrozen` = mass-battery predecessor, historical re-freezing only) | `normCharts.js` |
| `generateProgram(...)` | ALL volume math, weak-point ranking, exercise fill | `programKernel.js` |
| `suggestBookingTime(sessions, clients, date)` | The next-free-slot booking rule | `utils.js` |
| `getRenewalDueMap(clients, sessions)` | Renewal-due for all three tabs (rule stays in `isRenewalDue`) | `utils.js` |
| `getClientCountedSessions(sessions, clientId)` | Per-client counted-session index (WeakMap-cached) | `utils.js` |
| `buildSession(clientId, date, time)` | The only constructor for a new session from the booking form | `Schedule.jsx` |

Also single-source, from v2.10.1 — **never re-inline what they own:** `applyOverride`, `formatOverrideDraft`, `getFocusTags`, `getSessionType`, `openWhatsApp`, `friendly`, `makeTemplateSender`.
- **`normCharts.js` owns ALL chart data + scoring.** Never inline a threshold in a component. **Bump `CHARTS_VERSION` on any table change** — old records keep their frozen scores, new evaluations use the new table, no migration needed. Currently **3** (Elie's age-banded 1RM numbers, v2.13.2).
- **`EvalTimer.jsx` is retained but unrendered** — 1RM attempts aren't timed. **Do not delete it**; a future rep-based battery could reuse it.

### Program generation
- **Frozen at generation.** `PROGRAM_RULES_VERSION` (`programRules.js`) + `EXERCISE_BANK_VERSION` (`exerciseBank.js`) are stamped per record; later changes never rewrite stored programs. **Bump either on ANY change** to volume tiers, method catalog, fat-loss thresholds, or the bank. **`exerciseBank.js` is GENERATED** — rebuild via `scripts/build_exercise_bank.py`, never hand-edit.
- **Blocks store `days` (+ `daysAlt` for the endurance/fat-loss block only), NOT 4 duplicated weeks** — every other method is identical week-to-week within a block, so 4 copies would be dead weight in `data.json`. Deliberate deviation from the spec's "weeks" framing.
- **The Deadlift anchor counts toward Back, not its bank primary (Quads).** Spec §6 maps Deadlift to the Pull day, so `fillBucket` force-overrides the anchor's `bucket` to the day's major — without it, Back runs an exercise short every block.

### Arabic / i18n
- **Transliteration rule (Elie, standing):** when a literal Arabic translation wouldn't be understood in the gym, use the **English term written in Arabic letters** (Block → بلوك, not مرحلة). Applies to every future Arabic entry; also in the header comment of `src/exerciseNamesAr.js`.
- Use `getStatus(status, lang, t)` for translated status labels.

### Colour & badges
Accent `#2563EB` / `#60A5FA` · danger `#EF4444` · success `#10B981` · active-session amber `#F59E0B` (`card-now`). **Status badges use a CSS class, NEVER inline `style={{color, background}}`** — ``className={`badge badge-${status}`}``. **Theme-aware vars `--t1`..`--t5` and `--sep` in inline styles; never hardcode rgba.**

### Sync (v2.6+)
Debounced 1s; localStorage saves immediately, the GitHub push waits. `pushRemoteData` retries 3× on 409 and **merges, never blind-overwrites**. Per-record `_modified` + union-by-ID means a freshly-edited record beats a stale device's copy. **Every failure must surface via `syncStatus` — never `.catch(() => {})` on a sync path.**

### Reducer actions
**Full table: `docs/architecture.md` → Reducer actions.** Read it before adding or dispatching an unfamiliar action. Non-negotiables:
- **`EDIT_CURRENT_PACKAGE { clientId, pkg }` owns ALL replace-last-package writes** — reads the live client by id, stamps `_modified`, audits via `buildPackageAuditEntries`. Never hand-roll `packages.slice(0,-1)` at a call site.
- **`EDIT_EVALUATION` / `EDIT_PROGRAM` are full-record** — partial patches forbidden; frozen fields must be re-computed by the kernel at the call site before dispatch.
- **`ADD_PROGRAM` records come only from `generateProgram()`.** **`DELETE_CLIENT` cascades** to sessions, evaluations, programs. **Batch with `ADD_SESSIONS` / `BATCH_COMPLETE`** — never dispatch in a loop.

---

## KNOWN ISSUES / OBLIGATIONS
- 🔴 **SYNC TOKEN EXPIRES 2027-07-06 — RENEW JUNE 2027.** `PTApp-sync-2026` on makdissi-dev, scoped ptapp-data Contents R/W only. Replacement UI: General → Backup → "Update sync token".
- **Program pruning (v2.15)** — do it before `data.json` approaches the 1 MB ceiling. Deferred from v2.14.
- **Open review findings P3 + P6** — `docs/reviews/2026-06-10-fable5-codebase-review.md` is the standing work order (P1/P2/P8 → v2.10.2, P4/P5 → v2.10.3, P7 → v2.10.4). **P3** SessionCard refactor, parked on Pierre's scope decision. **P6** ordinal at booking time, needs a freeze-vs-live design call first (the confirm popup must reflect override edits live).
- **App name** — "PTApp" is a working title; a unique, untrademarked name is needed before store submission.

---

## REVIEW DISCIPLINE
After **3+ feature changes** or ~2 hours of coding, pause and check: did the fix land everywhere the pattern exists? · every read AND write migrated on a storage refactor? · callbacks shadowing `t`/`d`? · inline `marginLeft`/`borderLeft` or hardcoded colours? · strings missing from `i18n.js`? · anything that deletes/overwrites/fails to migrate? · new `.catch(() => {})` or dispatches in loops? (The incident behind each check: `docs/release-hygiene.md` §3.)

After every commit: **bug fix** → root cause + pattern into `docs/traps.md`, then grep for it elsewhere · **feature** → `docs/instructions-v{X}.md` + both changelogs · **design decision** → CONVENTIONS or `docs/architecture.md`, not just the commit message · **incident** → memory.

---

## How to Run (Development)
```bash
npm install
npm run dev
```

## How to Build, Verify, and Deploy
Every code change goes through this full pipeline — **never skip steps**:
```bash
# 1. Build
npm run build

# 2. Verify the bundle parses — catches the blank-page corruption bug
node scripts/verify-bundle.mjs

# 3. Bump the version in the App.jsx debug panel; rebuild if changed.
#    Feature releases: also bump DOCS.instructions in General.jsx to the new
#    docs/instructions-vX.Y.md (it served v2.9 docs for two releases unnoticed).

# 4. Release hygiene gate — the five rules below. Run BEFORE committing.

# 5. Commit and push source to master
git add <files> && git commit -m "message" && git push origin master

# 6. Deploy built files to gh-pages (THIS IS WHAT MAKES IT LIVE)
cp dist/index.html /tmp/ptapp-deploy.html && cp dist/sw.js /tmp/ptapp-deploy-sw.js && cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html && cp /tmp/ptapp-deploy-sw.js sw.js && cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy vX.Y: description" && git push origin gh-pages
git checkout master

# 7. Tell Pierre the version number so he can verify on his phone
```

**Critical notes** (the incidents behind these: `docs/release-hygiene.md`):
- Pushing to `master` does NOT deploy, and pushing to `gh-pages` does not guarantee it either — **verify `gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status` reaches `built`.** Stuck on `building`? `gh api -X POST repos/pih-dev/PTApp/pages/builds`, then re-verify. Never push `gh-pages` twice in quick succession.
- **A schema change needs a live-data byte-diff gate, and all three existing ones are SPENT by design** (`live-v6-diff`, `live-v5-diff`, `live-migration` — each asserts a snapshot the archive has moved past, so each prints "DO NOT DEPLOY"). **A v6→v7 change needs a NEW `sanity-live-v7-diff.mjs`, copied from the v6 one.**
- Run the whole suite before every deploy: `for f in scripts/sanity/*.mjs; do node "$f"; done` — 13 of 16 pass, the 3 above are the spent gates.

### 🔒 Release hygiene — the five rules (added 2026-08-03)
CLAUDE.md was slimmed to 19.5 KB at v2.9.2 and drifted back to 42 KB in five months, because every release appended a section and none ever collapsed one. **Do not skip these "just this once" — that is exactly how it regrew.** Why each exists: `docs/release-hygiene.md` §1.

```bash
wc -c CLAUDE.md                              # RULE 1: must be < 22000 before committing
git log --all --oneline | grep -i "Deploy v" # RULE 3: each resolves to a changelog line AND an instructions file
ls docs/instructions-v*.md
```

1. **Under 22 KB** (raised from 20 KB on 2026-08-05 to fund the ~3.4 KB Topic Router, which buys keyword reach into all 83 docs). Over budget ⇒ collapse the oldest version section before committing. ⚠️ `memory/MEMORY.md` loads every session too — keep it under ~12 KB and report **both** numbers when either moves.
2. **Only ONE full version section — `## Current Version`.** The outgoing one collapses to a `## Version History` line **in the same commit** that promotes the new one; History is capped at 8, the 9th drops to `docs/changelog-summary.md`.
3. **No version ships without a changelog line AND an instructions file.** `.0` → `instructions-vX.Y.md`, patch → `instructions-vX.Y.Z.md` (`v2.10.0.md` is a legacy exception).
4. **A durable rule NEVER lives only in a version/changelog entry** — a kernel claim, a "never do Y at call sites", a platform trap goes into `TRAPS` / `docs/traps.md` / CONVENTIONS **when written**. Version sections record what shipped; rule sections record what is true.
5. **Completed instructions get rewritten as settled fact.** A resolved "placeholder / awaiting / TBD / parked" item is rewritten in place — a future session cannot tell a live instruction from a finished one, and will act on it.
6. **New docs get a router row or a `docs/README.md` line** in the same commit. An unreachable doc is a doc that does not exist.
