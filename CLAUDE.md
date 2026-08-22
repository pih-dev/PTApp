# PTApp — Personal Trainer Client Management App

> 🚨 **RESUMING? READ `HANDOFF.md` FIRST — AND ONLY THAT.**
> Reply with its §0 in ≤5 lines, ask the one question it names, then stop. Do not read this file
> end-to-end, do not explore, do not start work unprompted.

## Session Startup
- **After every commit: push to master AND deploy to gh-pages** (deploy section below). Do not ask.
(Remote control, commit discipline, memory and session management: global `~/.claude/CLAUDE.md`)

## What This Project Is
A mobile-first app for a personal trainer managing his gym clients. The PT uses it on his iPhone; Pierre develops and tests on Android.
- **Developer:** Pierre (pierreishere@gmail.com / GitHub pih-dev).
- **End user:** Elie, the PT — has standing authority to drive changes (see Governance).

## Topic Router
PTApp's depth lives in `docs/`. **A `UserPromptSubmit` hook injects the matching file into the turn**
on these keywords — don't open them yourself, and never answer from recollection when one arrives.

| Keywords | Read (relative to `C:/projects/PTApp/`) |
|---|---|
| architecture, file tree, project structure, tech stack, reducer, dispatch, roadmap | `docs/architecture.md` |
| trap, traps, gotcha, why did this break, edge case | `docs/traps.md` — truncates at 8 KB; the TRAPS index below is the complete list |
| colour, color, palette, theme, skin, skins, typography, look and feel | `docs/design-system.md`, `docs/design/2026-08-21-design-differentiation-brief.md` |
| data size, ceiling, pruning, overhead, performance budget, how big | `docs/app-health.md` |
| sync, syncing, offline, service worker, localStorage, stale device | `docs/sync-and-offline-review.md`, `docs/superpowers/specs/2026-04-13-sync-fix-design.md`, `docs/instructions-v2.6.md` |
| figures, silhouette, drawing, anatomy, movement figure, pose, canon | `HANDOFF-figures.md` (state + what is deferred), `docs/instructions-v2.22.md` (how the engine works). Code: `src/figures/` — **the pose files are the record; a figure is angles, never coordinates** |
| Elie, the PT, next visit, standing authority, governance, snapshot | `docs/elie-next-visit.md` |
| health check, sanity suite, live diff, spent gate, MEMORY.md size | `docs/health-check-2026-08-03.md` |
| deploy, gh-pages, pages build, release hygiene, review discipline | `docs/release-hygiene.md` — the 7-step pipeline, the Jun 11 Pages race, the spent gates |
| review findings, P3, P6, SessionCard, refactor backlog | `docs/reviews/2026-06-10-fable5-codebase-review.md`, `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md` |
| app name, store, publish, capacitor, native app, stage 2 | `docs/2026-07-14-app-name-research.md`, `docs/stage2-publishing-guide.md` |
| changelog, what changed in, release notes | `docs/changelog-summary.md` — every version in plain English, newest first |
| program, exercise bank, volume, weak point, generation rules | `docs/superpowers/specs/2026-07-13-program-generation-design.md`, `docs/instructions-v2.13.md` |
| 1RM, one rep max, norms, standards, evaluate, evaluation | `docs/superpowers/specs/2026-07-06-1rm-battery-replaces-mass-design.md`, `docs/instructions-v2.12.md` |
| arabic, translation, i18n, RTL, transliteration | `docs/superpowers/specs/2026-07-17-exercise-names-arabic-design.md`, `docs/instructions-v2.14.2.md` |
| split, training days, mass battery, eval timer, measurement console, observe and grade, booking time, free slot, recurring, repeat sessions, override, session count, backfill, contract, package, renewal, billing period, renew, upcoming, home screen, roll off, whatsapp, confirm link, calendar link, multi-client, group booking, visual polish, light redesign, focus tags, tag split, error boundary, white screen, ordinal, counting kernel, fork hygiene, screenshot, which doc, where is it documented | `docs/README.md` — the index of every doc, spec and per-release write-up. **It names the file; you still open it.** |

The long tail routes through `docs/README.md`: a row costs bytes in *every* session, the index only
on a match. Unrouted on purpose: `docs/superpowers/plans/*` (the **spec** is the design record) and
`docs/changelog-technical.md`.

**Adding a row?** Keywords match how Pierre *speaks*, not the doc's title; keys of ≤4 chars need a
word boundary (`trap` misses `traps` — list both). The rule a session can act on alone stays inline;
only the evidence routes.

## Current Version: v2.23.0
**The exercise figures, ALL 340 (B2).** Every movement opens with a FORM panel: the pair, the posture line, colour-coded muscles, a key, and three sentences EN+AR. Cost 37 KB. Detail: `docs/instructions-v2.22.md`…`-v2.23.md`; thread: `HANDOFF-figures.md`.
- 🔴 **A MOVEMENT IS NOT THE UNIT OF DRAWING — A PATTERN IS.** 44 archetypes (`figures/archetypes.js`) own the pose and the fault; the movement contributes its **muscles from the bank** and its **equipment from its NAME**. `classify.js` maps all 340, first-match-wins, **and 100% coverage is a build gate** — an unclassified movement silently shows nothing. 🔴 Its ORDER is the logic: "external rotation" must beat "rotation".
- 🔴 **A FIGURE IS ANGLES, NEVER COORDINATES** — `canon.js` owns every bone length and the only FK function, so §7.13 (*the wrong figure reuses the same bone lengths*) holds **by construction across all 340**. `fs` (projection) is the one escape hatch and must be IDENTICAL across a pair; `sanity-figures` asserts it, plus no colour literal, no NaN path, hip at half standing height.
- 🔴 **SAY WHAT THE POSITION DOES, NEVER WHAT IT CAUSES.** `figureText.js` is keyed by PATTERN (44 entries — that is what makes Elie's review possible at all). **No named pathology, no evidence-grade adverb**; the build FAILS on either. **The Arabic may never be stronger than the English.** 🔴 **A REVIEW FLAG NOTHING RENDERS IS NOT A REVIEW PROCESS** — every entry is `reviewed: false` and the panel prints it.
- 🔴 **THE FIGURE HAS FOUR MEANINGS AND ALL FOUR ARE DERIVED.** Posture line = `--accent` held / `--warn` at fault (derived from whether the pose marks a fault); muscle bands = `--muscle` prime / `--muscle-2` supporting; **`--anatomy` is the fault marker and nothing else**. All figure-internal and UI-forbidden; `sanity-skins` asserts all 20 tokens per skin. A figure carrying four meanings **ships its key**.
- **A THIRD FIGURE (`extraId`) IS FOR A FAULT OUTSIDE THE PAIR'S PLANE** — a second camera with its own marker and sentence. 🔴 **NEVER fake it with per-figure foreshortening**: that is a bone-length change disguised as perspective.
- **Bilingual search folds through `normaliseSearch` (`utils.js`) on BOTH sides** — typed Arabic differs from written Arabic invisibly and `includes()` fails on it. `muscleLabel`/`MUSCLE_AR` own muscle names; **`t()` returns the KEY on a miss, so never use it for data**.
- **Sub-section scale: `.subbar` · `.lrow` · `.num`.** 🔴 **`.card` IS A ROW** — transparent, a 2px `--bar` shaft under it; **a real container is `.panel`**.
- 🔴 **SELECTION IS CHALK · LOAD IS THE ACCENT · RED IS DESTRUCTIVE ONLY** · 🔴 **NO EMOJI IN THE INTERFACE** (WhatsApp templates keep theirs).
- 🔴 **A SKIN IS VALUES, NOTHING ELSE** — ONLY in `src/skins.js` + the token block; **never a per-element override**.
- **`TOKEN_KEY`/`DEMO_TOKEN`/`isDemo` in `utils.js`** (import cycle). 🔴 **`DEMO` is a review credential** — seeded local data, sync off, **seeds ONLY onto an empty store**.
- **Sign-in is DARK**; **`sync.js` is `src/backend/`**. State: `HANDOFF-multi-user-build.md`, `HANDOFF-spotset-publishing.md`.

## Governance — Elie's Standing Authority (granted 2026-07-18)
Elie may drive app changes in-session on Pierre's conditions (*"since we're using github we can roll back, make sure data backups are done at every juncture"*). Routes on `Elie`.
- **Everything goes through git** — commit + push every change, so anything Elie drives can be rolled back.
- **Live-data snapshot at every juncture (MANDATORY):** before any deploy, schema change, migration or data-touching operation, run `node scripts/snapshot-live.mjs <desc>` — it archives `data.json` and byte-verifies it against the API.
- **Provenance discipline** — specs, commits and changelogs record who asked for what, so Pierre can audit post-hoc. He can revoke or re-scope by editing this section.

---

## Version History
**One line per release, 8 max**; older drops to `docs/changelog-summary.md`, detail to `docs/instructions-v*.md`. Rules in force live in TRAPS / CONVENTIONS, never here.

- **v2.17–v2.20.1** (08-21/22) — THE DESIGN PASS, five stages: skins, Dashboard, shell, deep screens, press affordance. → `v2.17`…`v2.20.1`
- **v2.21–v2.22.2** (08-22) — the movement library; then the figures pilot: the pair, the posture line, the muscle code, the claims rewrite. → `v2.21`…`v2.22.2`
- **v2.15 and earlier** — see `changelog-summary.md`. v3→v4 rollback tag: `snapshot-pre-v2.9.5`.

---

## Data Preservation Rules (CRITICAL)
- **NEVER delete or lose user data.** The PT's clients and sessions are real business records.
- **Backward compatible always.** Schema change ⇒ bump `DATA_VERSION` and write a `migrateData` step in `utils.js`. Never make the user re-enter anything; `_dataVersion` tracks the schema per blob.
- **Preserve history.** A removed feature keeps its data — archive it, never drop it.
- **Every top-level collection follows the `sessions[]` pattern** in `mergeData`, `mergeBackup` and `REPLACE_ALL`; `DELETE_CLIENT` cascades to that client's sessions, evaluations and programs. Never orphan a record; never let an explicit key list drop a collection.
- **Test migrations against live data.** Synthetic fixtures are not sufficient — run the live-diff gate against the PT's real exported data before deploying a schema change.

---

## TRAPS
Full write-ups in **`docs/traps.md`** — read the relevant one first. Index:

**Dates & JS** — `toISOString()` is UTC: use `today`/`localDateStr`/`localMonthStr` · never shadow `t` in a `.map`/`.find` callback · `defaultValue` inputs need a `key` tied to state · `fn(...arr)` throws past ~65K elements on iOS, chunk with `.apply` · hardcoded date stamps in fixtures rot.

**iOS / mobile** — safe-area insets, modal z-index 200+, sticky `modal-footer`, visualViewport resize · tap targets in the bottom 60% · never start a textarea `readOnly` and clear it in `onFocus` · swipe-to-dismiss only when `scrollTop === 0` at touchstart · PWA standalone needs BOTH the meta tag AND `manifest.json` `"display":"standalone"`.

**RTL / i18n** — `marginInlineStart`/`borderInlineStart`, never `marginLeft`/`borderLeft` · **`letter-spacing` DESTROYS Arabic** (a joined script) — kill tracking and uppercase under `[dir="rtl"]` in the same block that adds them · a closed `<select>` prints its option's own text (emoji included).

**Data & sync** — never hand out a credential that reaches live data; review/demo access must be fabricated data on a path that cannot reach the real store · never `.catch(() => {})` (the Hala Mouzanar data loss) · `initialLoad`+`syncReady`+`skipSync` must ALL pass before a push · never dispatch in a loop · `state.X` read right after `dispatch(ADD_X)` is stale (Session #0) · merge paths must `migrateData` the FOREIGN blob by its own `_dataVersion`, on a clone · `mergeData`'s key list drops collections a stale bundle doesn't know — after a deploy adding one, confirm BOTH phones show the new version first · a 401 must look different from a network blip and route to the replacement UI · **demo/fixture data must not carry a routable phone number, and demo mode must not address one** (real strangers were messaged).

**Identity (`src/auth.js`)** — key is `ptapp-data:<userId>` once signed in, NO fallback to the bare key (a bare write pushes one coach's dataset into another's tenant, and RLS authorises it) · gate on identity, **never** token validity — expired ⇒ banner, never a login wall · **no social login, EVER** (Google forces Sign in with Apple, 4.8) · sign-out clears the session only.

**Git** — 🔴 **never `git checkout -- <file>` to undo a test mutation**: it reverts to HEAD and takes any uncommitted work in that file with it (v2.21, the i18n strings). Revert the exact mutation, or stash first.

**Refactoring** — a string only reachable BEFORE login is invisible to a rename sweep (the v2.15.0 token screen) — grep all of `src/`, not the screens you can open · **reusing a control class inherits the size its ORIGINAL content needed** (`.lang-toggle`'s 36px cells overlapped the skin names for two releases) — new content shape ⇒ modifier class, and OPEN the screen · grep EVERY read and write when moving a storage location · a renamed catalog key silently kills `|| CATALOG.oldKey` fallbacks (property refs don't match string greps) · re-read a helper's fallback contract before guarding its return; "did the world change" checks read LIVE state and compare stable IDs · `parseSessionCountOverride` returns `{ type, value }`, not `.mode` · legacy `periodLength` was the billing master switch, not `periodStart`.

**Correctness across screens** — a pre-action badge and a post-action badge in one flow must use the same helper (the "(0) → #1" confusion) · synthetic fixtures model what you designed, live data holds what shipped: diff counting/date-resolution/migration changes against the archived snapshot first, and re-read the OLD code exactly when writing a migration.

**Figures (`src/figures/`)** — a front view foreshortens the femur, which re-creates the **infant ratio** §7.13 bans: draw a front pose at the shallowest depth that still shows the fault · **choose the moment or the pose is unreadable** — a deadlift at the floor puts torso and femur at the same angle and folds into a wedge; past the knee the hinge is obvious · the lateral offset rotates with the spine **only in a front view** (in profile it is depth, out of the page — rotating it hangs a stray arm off every hinge) · subdivide each bone at its midpoint before splining, or the limb bows into a noodle.

**Figures at scale (v2.23)** — a supine/prone figure needs its centre line one torso-depth off the floor and a plank needs its **shoulders higher than its heels**, or it reads as someone lying down · an ORDERED classifier fails SILENTLY when misordered — it just draws the wrong movement.

**Device-only bugs** — 🔴 **never style a scrollbar in a touch app**: a styled webkit scrollbar opts out of the platform's auto-hide, so it becomes a permanent bright rule down the screen (v2.20.1, invisible in a desktop browser).

**Tooling** — 🔴 a python heredoc writing `\b` into a JS regex writes a **BACKSPACE (0x08)**, not a word boundary: the regex parses, runs, and silently stops matching (`cat -A` shows `^H`). Bit twice in one session — use `chr(92)+'b'`, a raw string, or the Edit tool · 🔴 the Android build needs **JDK 21** (`JAVA_HOME='/c/Program Files/Microsoft/jdk-21.0.12.8-hotspot'`); PATH java here is Temurin 8, and **`gradlew` exits 0 on a FAILED build**, leaving the previous AAB in `outputs/` — a stale bundle then uploads and Play rejects it as "version code already used". Verify the versionName INSIDE the .aab, never the exit code · `fixForFileProtocol` must use *function* replacement (a string breaks React's minified `$&`) · **PS 5.1 `Get-Content`/`Set-Content` mangles UTF-8** (ANSI default corrupts em-dashes, emoji and all Arabic) — use the **Edit tool**, never round-trip source through a PowerShell pipeline.

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
- **`normCharts.js` owns ALL chart data + scoring.** Never inline a threshold. **Bump `CHARTS_VERSION` on any table change** — old records keep frozen scores, new evaluations use the new table, no migration. Currently **3** (Elie's age-banded 1RM numbers, v2.13.2).
- **`EvalTimer.jsx` is retained but unrendered** — 1RM attempts aren't timed. **Do not delete it**; a rep-based battery could reuse it.

### Program generation
- **Frozen at generation.** `PROGRAM_RULES_VERSION` (`programRules.js`) + `EXERCISE_BANK_VERSION` (`exerciseBank.js`) are stamped per record; later changes never rewrite stored programs. **Bump either on ANY change** to volume tiers, method catalog, fat-loss thresholds, or the bank. **`exerciseBank.js` is GENERATED** — rebuild via `scripts/build_exercise_bank.py`, never hand-edit.
- **Blocks store `days` (+ `daysAlt` for the endurance/fat-loss block only), NOT 4 duplicated weeks** — every other method is identical week-to-week within a block, so 4 copies would be dead weight in `data.json`. Deliberate deviation from the spec's "weeks" framing.
- **The Deadlift anchor counts toward Back, not its bank primary (Quads).** Spec §6 maps Deadlift to the Pull day, so `fillBucket` force-overrides the anchor's `bucket` to the day's major — without it, Back runs an exercise short every block.

### Arabic / i18n
- **Transliteration rule (Elie, standing):** when a literal Arabic translation wouldn't be understood in the gym, use the **English term in Arabic letters** (Block → بلوك, not مرحلة). Every future Arabic entry; also in `src/exerciseNamesAr.js`'s header.
- Use `getStatus(status, lang, t)` for translated status labels.

### Colour, type & badges — everything paints from tokens
🔴 **NEVER hardcode a colour: a literal belongs to ONE skin** (`sanity-skins.mjs` enforces it). **The full 18-token inventory and the type roles live in `docs/design-system.md`** (routed on colour/palette/skin/typography).
- 🔴 **THE ACCENT (arc `#35B7E8`) NEVER TOUCHES CHROME** — no tab, button, link or focus ring. Load, urgency, the live session. **Never `#2563EB`** in new work; `#EF4444` = destructive only.
- 🔴 **`--chalk-faint` is DECORATION ONLY** (no text under 13px) and **`--anatomy` is for figures, never the UI**.
- 🔴 **Bundled type, never fetched** — `src/fonts.css` is GENERATED by `scripts/build_fonts.mjs`. 🔴 **Under `[dir="rtl"]` uppercase AND letter-spacing are OFF** — Arabic has no case, spacing breaks its joins; hierarchy is weight.
- 🔴 **OUTLINE MEANS "OFF", FILL MEANS "PRESS ME"** — a tappable control gets a surface; two states of one control differ by **fill and text colour**, never border width. An all-outline screen is coherent and inert.
- **Status badges use a CSS class, NEVER inline `style={{color,background}}`.**

### Sync (v2.6+)
Debounced 1s; localStorage saves immediately, the push waits. `pushRemoteData` retries 3× on 409 and **merges, never blind-overwrites**; per-record `_modified` + union-by-ID means a freshly-edited record beats a stale device's. **Every failure surfaces via `syncStatus` — never `.catch(() => {})` on a sync path.**

### Reducer actions
**Full table: `docs/architecture.md` → Reducer actions** — read it before dispatching an unfamiliar action. Non-negotiables:
- **`EDIT_CURRENT_PACKAGE { clientId, pkg }` owns ALL replace-last-package writes** — reads the live client by id, stamps `_modified`, audits via `buildPackageAuditEntries`. Never hand-roll `packages.slice(0,-1)` at a call site.
- **`EDIT_EVALUATION` / `EDIT_PROGRAM` are full-record** — partial patches forbidden; frozen fields must be re-computed by the kernel at the call site before dispatch.
- **`ADD_PROGRAM` records come only from `generateProgram()`.** **`DELETE_CLIENT` cascades** to sessions, evaluations, programs. **Batch with `ADD_SESSIONS` / `BATCH_COMPLETE`** — never dispatch in a loop.

---

## KNOWN ISSUES / OBLIGATIONS
- 🔴 **SYNC TOKEN EXPIRES 2027-07-06 — RENEW JUNE 2027.** `PTApp-sync-2026` on makdissi-dev. Replace via General → Backup → "Update sync token".
- **Program pruning (v2.15)** — before `data.json` nears 1 MB. 🔴 **Snapshot first** — cloud deletes are irreversible.
- **Review finding P3 — DECIDED 2026-08-05, NOT BUILT.** SessionCard scope B (Dashboard-expanded + Schedule); kills the `focus: []` bug at `Schedule.jsx:201`. **Do it with the Schedule layout pass.**
- **App name = SpotSet**; `com.spotset.app` is PERMANENT.
- 🔴 **THE SUPABASE SOAK IS PHASE 1, SO THE DAILY JOB IS `node scripts/soak-day.mjs` — MIRROR THEN VERIFY.** `mirror-to-supabase.mjs` is a MANUAL one-way script; the app does NOT dual-write, so Postgres is stale the moment anyone touches the phone and `sanity-live-supabase-diff` alone can never be clean (0/7 across 34 runs). That gate is unchanged and becomes the REAL soak the day dual-write lands. Detail: `HANDOFF-multi-user-build.md` §0.
- 🔴 **NEXT ON FIGURES: rotatable / multi-angle figures** (Pierre, 08-22) — the pair stays, each half becomes draggable. Options and costs: `docs/2026-08-22-figures-3d-options.md`.
- 🔴 **TODO — FRESH EYES ON DESIGN, THE STRIPPED-STRUCTURE WAY (Pierre, 2026-08-22).** Before a design is called done, hand it to a subagent that has never seen it — **Fable 5, max effort — with ALL FORMATTING STRIPPED**, so it receives structure and words only and cannot be anchored by the treatment already chosen. Brief it to argue the **opposite side**: what is missing, what earns nothing, is the order wrong. First run: v2.22 figures review page.

---

## REVIEW DISCIPLINE
After **3+ feature changes** or ~2 h of coding, pause: did the fix land everywhere the pattern exists? · every read AND write migrated on a storage refactor? · callbacks shadowing `t`/`d`? · inline `marginLeft`/`borderLeft` or hardcoded colours? · strings missing from `i18n.js`? · anything that deletes/overwrites/fails to migrate? · new `.catch(() => {})` or loop dispatches? (`docs/release-hygiene.md` §3.)

After every commit: **bug fix** → root cause + pattern into `docs/traps.md`, then grep elsewhere · **feature** → `docs/instructions-v{X}.md` + both changelogs · **design decision** → CONVENTIONS · **incident** → memory.

---

## How to Build, Verify, and Deploy
Dev: `npm install && npm run dev`. Every change goes through this pipeline — **never skip steps**:
```bash
# 1. Build
npm run build

# 2. Verify the bundle parses — catches the blank-page corruption bug
node scripts/verify-bundle.mjs

# 3. Bump the version in the App.jsx debug panel; rebuild if changed. Feature
#    releases: also bump DOCS.instructions in General.jsx (it served v2.9 docs
#    for two releases unnoticed).

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
- Run the whole suite before every deploy — **check exit codes, don't eyeball output**: `for f in scripts/sanity/*.mjs; do node "$f" || echo "FAIL $f"; done`. The 3 live-diff gates above are SPENT by design; `sanity-rls-matrix` exits **2** = live RLS pass skipped. **Exit 2 is not a pass.** 🔴 **`sanity-live-supabase-diff` run BARE is EXPECTED to fail in Phase 1** — the app does not dual-write, so it compares GitHub against a mirror that is stale the moment anyone touches a phone. The daily job is **`node scripts/soak-day.mjs`** (mirror, then verify); only runs it drives count toward the streak. Do not 'fix' the bare failure.

### 🔒 Release hygiene — the five rules (added 2026-08-03)
CLAUDE.md was slimmed to 19.5 KB at v2.9.2 and back to 42 KB in five months: every release appended, none collapsed. **Never skip these "just this once" — that is how it regrew.** Why: `docs/release-hygiene.md` §1.

```bash
wc -c CLAUDE.md                              # RULE 1: must be < 24000 before committing
git log --all --oneline | grep -i "Deploy v" # RULE 3: each resolves to a changelog line AND an instructions file
ls docs/instructions-v*.md
```

1. **Under 24 KB** (`.context-budget`; 20→22 funded the Topic Router, 22→24 the v2.18 design law). Over budget ⇒ collapse the oldest version section before committing. ⚠️ `memory/MEMORY.md` loads every session too — keep it under ~12 KB.
2. **Only ONE full version section — `## Current Version`.** The outgoing one collapses to a `## Version History` line **in the same commit** that promotes the new one; History is capped at 8, the 9th drops to `docs/changelog-summary.md`.
3. **No version ships without a changelog line AND an instructions file.** `.0` → `instructions-vX.Y.md`, patch → `instructions-vX.Y.Z.md` (`v2.10.0.md` is a legacy exception).
4. **A durable rule NEVER lives only in a version/changelog entry** — a kernel claim, a "never do Y at call sites", a platform trap goes into `TRAPS` / `docs/traps.md` / CONVENTIONS **when written**. Version sections record what shipped; rule sections record what is true.
5. **Completed instructions get rewritten as settled fact.** A resolved "placeholder / awaiting / TBD / parked" item is rewritten in place — a future session cannot tell a live instruction from a finished one, and will act on it.
6. **New docs get a router row or a `docs/README.md` line** in the same commit. An unreachable doc is a doc that does not exist.
