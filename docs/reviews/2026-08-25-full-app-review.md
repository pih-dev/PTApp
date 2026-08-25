# Full-app review — 2026-08-25 (ultracode: 6 dimension finders × adversarial verify, 18 agents)

**Scope:** the live codebase (not a diff) — data preservation, sync/parallel-run, auth/multi-tenant,
kernels, UI/platform, i18n/RTL. Every candidate below the line was verified by an independent
adversarial agent against the real code; **12 verified findings survived, 0 were refuted.**
18 lower-severity candidates fell below the verification cap and are listed unverified at the end.

**Highlights for Pierre:** three kernel findings (K1–K3) are the mechanism behind **Elie's
2026-08-24 report** (duplicate exercises + missing major compounds — `docs/elie-next-visit.md`
OPEN item 1). Two sync findings (S1–S2) are real multi-device data-loss paths in the layer that
has already lost data twice.

**OUTCOME (same day, v2.46):** 11 of 12 confirmed findings FIXED and shipped — see
`docs/instructions-v2.46.md` for how each fix is shaped (including the three reviewer-subagent
blockers folded in: delete-resurrection via the S1 fold, cloud-snapshot buttons missing the A1
gate, reset-templates vs {}-is-absence). **D4 (packages client-granularity LWW) is DEFERRED** —
needs per-package `_modified` stamps, a schema design. The 18 unverified candidates below remain
untriaged except: supabaseDriver S1-twin (fixed with S1), General update-token + cloud buttons
(fixed with A1), MUSCLE_AR 'Legs' (fixed), DOCS.instructions pin (fixed), swap-picker empty state
(fixed).

---

## CONFIRMED — HIGH

### D1 · `src/utils.js:1099` — a fresh device wipes the PT's WhatsApp templates
`mergeData` resolves `messageTemplates` by whole-blob `_lastModified`, and `{}` is truthy. A
new/reset phone stamps its EMPTY state `_lastModified = now` (utils.js:924) — always newer than
remote. Paste the sync token → `reconcile()` → `preferLocal` → `{}` wins (utils.js:1099-1100) →
the wiped blob is pushed (App.jsx:162-163) → the PT's iPhone's next reconcile REPLACE_ALLs his
copy away too. Deterministic, zero user action. Templates are the ONE collection without
per-record `_modified`. **Fix:** prefer the non-empty side on the preferLocal branch, or give
templates per-record stamps.

### S1 · `src/backend/githubDriver.js:116` — the push AFTER a 409-merge blind-overwrites
The 409 retry merges the other device's records into the PUSHED blob only; `merged` never reaches
app state (App.jsx:26 discards it) and the merged commit's sha is cached — so the next debounced
push sends local state (still missing record X) with a VALID sha and strips X back out of remote.
Scenario: mother's phone adds session X; Elie edits Y → 409 → driver pushes {S,Y,X}; Elie books Z
minutes later → push {S,Y,Z} succeeds → X gone, alive only on the stale device (lost forever if it
never syncs again). The 2026-04-13 spec (line 105) had the caller dispatch the conflict merge into
state; the v2.6 driver-side rewrite dropped that half. **Fix:** return the merge result and
dispatch REPLACE_ALL with it. Same defect is already sitting in `supabaseDriver.js:177` (see U2),
live the day BACKEND_MODE flips.

### A1 · `src/App.jsx:227` — sync gates on the PAT alone, never on identity
The PAT (`ptapp-sync-token`) is device-global while data keys are identity-namespaced. Any
signed-in identity on a device holding the PAT reconciles its namespaced store against the PT's
live `data.json`: a provisioned tester signs in → empty `ptapp-data:<uid>` → reconcile unions the
FULL live dataset in (the "empty workspace, never live data" invariant breaks) and the tester's
edits push back into live and onto Elie's iPhone. Also: neither `signOut()` nor `claimLegacyStore`
clears TOKEN_KEY, so a signed-out boot re-downloads live data into the bare key — undoing what
`sanity-auth` PASS 4 asserts. Post-cutover, a contaminated namespace pushes into the wrong tenant
and RLS *authorises* it. **Fix:** bind the PAT-sync path to the PT's identity (or clear TOKEN_KEY
on sign-in/out of any other identity).

### K1 · `src/components/ProgramViewer.jsx:128` — swap picker creates duplicates and re-admits Deadlift
Filter is only `type === swapTarget.type && name !== swapTarget.name`: it offers exercises already
placed in that day (one tap → the same exercise twice with two different prescriptions) and, for
Legs compounds, offers Deadlift — violating the rules-v2 "Deadlift is Pull-day anchor only" ruling.
**The most direct mechanism for Elie's duplicates — he is the swap user.**

### K2 · `src/programKernel.js:99` — rep-2 day repeats rep-1's minor exercises in the same week
`minorQuota` takes the FULL weekly minor quota per day while minor pools are tiny (Rear Delts 4,
Calves 5, Forearms 6, Biceps 7), so the day-2 exclusion pool exhausts by construction and the
fallback refills with day-1's exact exercises. Kernel executed live: pro 5-day → same-week
duplicates in 5 of 6 blocks; the endurance block repeats 7 pull exercises across both pull days.

### K3 · `src/programKernel.js:91` — remainder absorption breaks prescriptions and starves the main day
`sets = remaining >= per*2 ? per : remaining` gives the last exercise up to `per*2-1` sets while
`exerciseEntry` always stamps reps/pct for exactly `per` — e.g. "7×10/10/10/8-10 · 55/60/70/80%"
(7 sets, a 4-step pyramid). On halved-quota rep-1 days the major collapses to anchor + ONE
oversized exercise: intB 5-day legs rep-1 = Back Squat + 7-set Dumbbell Squat, no Leg Press/Hack/
Front Squat on the MAIN legs day. **This is Elie's "missing major compounds".**

### U1 · `src/figures/classify.js:112` — Arnold Press draws the bench-press figure
"Arnold Dumbbell Press" matches the bench-press rule (`/dumbbell press/`) before the overhead
rule's dedicated `arnold` keyword (line 116, dead code) — verified by running `archetypeFor` over
the shipped bank. The FORM panel shows a supine bench pair for a seated overhead movement;
`sanity-figures` gates coverage, not correctness, so nothing catches it. The exact silent-misorder
failure the file header warns about.

### U2 · `src/components/Modal.jsx:66` — a figure gesture can dismiss the movement sheet
Swipe-down-to-dismiss's touchstart exclusion list (input/textarea/select/button/a) doesn't cover
`.fig-interactive`. Figure at top → modal-body scrollTop 0 → a vertical tilt/pan/pinch drag
bubbles to `.modal-content`, the sheet tracks the finger and closes past 80px — mid-gesture.

### I1 · `src/components/Clients.jsx:243` — null classification crashes the whole Clients tab
`'class' + latest.frozen.classification.charAt(0)` unguarded, but both kernels legitimately emit
`classification: null` (normCharts.js:231, :266) and EvalSection guards it via `classLabel`. One
merged/stale record with null → TypeError → ErrorBoundary takes down the tab that would let you
delete the record.

## CONFIRMED — MEDIUM

### D2 · `src/utils.js:1614` — mergeBackup can never restore templates
`live.messageTemplates || backup.messageTemplates` is a dead branch — live's is always at least
`{}` (truthy). The canonical restore-onto-fresh-device path silently drops customized templates
(same for the cloud-snapshot restore, General.jsx:383). Pairs with D1.

### D3 · `src/utils.js:984` — a corrupt local blob is destroyed on the next render
`loadData` catches a JSON.parse failure and returns empty state; App's mount save-effect
immediately overwrites the original bytes. On a token-less or DEMO device that blob was the only
copy — total loss. One line parks the raw string under `ptapp-data-corrupt-<ts>` first.

### D4 · `src/utils.js:1089` — packages[] gets client-granularity LWW
A profile edit on a stale device reverts a renewal made on another (client record wins wholesale by
`_modified`); the union-merged auditLog then names a package id no `packages[]` contains, and
`buildPackageAuditEntries` logs nothing. RenewalModal guards this race class; the edit-form path
doesn't.

## Unverified candidates (below the 12-slot verify cap — triage before trusting)

- [med] `App.jsx:145` — reconcile gates on PAT+`isDemo()` only, never identity (A1's twin surface).
- [med] `supabaseDriver.js:177` — S1's defect class, pre-installed for the cutover.
- [med] `scripts/soak-day.mjs:114` — mirror-then-verify masks divergence once dual-write lands; nothing refuses that mode.
- [med] `General.jsx:294` — "Update sync token" renders for any signed-in non-demo user: the one-tap door welding an identity to the PAT store.
- [med] `ErrorBoundary.jsx:61` — crash-screen backup serves ANY `ptapp-data*` key, other identities included, unauthenticated.
- [med] `programKernel.js:61` — rotation advances 2/block while days consume 2–8 picks: consecutive blocks share most exercises (measured: 4/5 pull intB).
- [med] `Schedule.jsx:729` — override help "Clear" first blurs the input, whose onBlur commits the pre-Clear draft: Clear re-commits instead of clearing.
- [med] `MovementSheet.jsx:88` — MUSCLE_AR has no 'Legs' entry: Arabic sheet prints English "Legs" on every legs movement; the gate checks EXERCISES only.
- [med] `Clients.jsx:159` — client search folds case only, not `normaliseSearch`, violating the both-sides rule the library obeys.
- [med] `styles.css:735` — `.eval-chip` + `.renewal-pill` carry letter-spacing with no `[dir="rtl"]` reset over Arabic content.
- [med] `sanity-figures.mjs:101` — the pathology gate skips Arabic entirely; the recorded incident WAS on the Arabic side.
- [low] `utils.js:1084` — mergeData re-synthesizes migration audit entries with fresh ids per merge; mergeBackup filters them, mergeData doesn't.
- [low] `scripts/lib/normalize.mjs:41` — UTF-16-vs-UTF-8 size check false-trips on >~20% Arabic content, hard-failing mirror + soak.
- [low] `sanity-live-supabase-diff.mjs:107` — non-OK tenants response: `res.text()` then `res.json()` throws "Body is unusable" before the STOP handler registers.
- [low] `programKernel.js:141` — buildCircuitDay claims first-UNUSED but tracks nothing; uniqueness holds by numeric accident.
- [low] `General.jsx:15` — DOCS.instructions pinned to v2.43 while the app is v2.45 — the in-app instructions button serves stale docs (the v2.10.1 regression again).
- [low] `Dashboard.jsx:243` — session action sheet renders a stale snapshot while sync/auto-complete mutate the session under it.
- [low] `TokenSetup.jsx:183` — inline uppercase+tracking wraps Arabic 'أو' on the sign-in screen, outside the stylesheet resets.

## Same-day context (separate scope, closed or awaiting Pierre)

- Settings-file leak fixed: `.claude/settings.local.json` untracked (`cbdef60`), wip branch deleted
  from origin. Detail: `C:\projects\_archive\PTApp\reviews\2026-08-25-settings-review-findings.md`.
- Full-history gitleaks: clean EXCEPT the four v2.15.1 demo phone numbers (2–3 real strangers'
  lines) recoverable in public history (`5a39ea6`/`ed68e02`); the 650-clone bot wave (233 uniques)
  was exactly that window — assume scraped. **Surgical history rewrite offered, NOT yet approved.**
- Model/effort settings: Pierre is experimenting — do not touch or re-propose.
- Workflow journal (full agent returns): session `fb80056f…`, run `wf_5ba51870-269`, `journal.jsonl`.
