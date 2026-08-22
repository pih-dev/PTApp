# PTApp — Documentation Index

Every `.md` under `docs/`, keyed by what you would be looking for. **This file is injected into a
turn by the router hook; the files it names are not.** Open the one you need by name.

`CLAUDE.md`'s Topic Router injects the highest-traffic docs directly (architecture, traps, design
system, sync, Elie, release hygiene, health check, review findings, program generation, 1RM, Arabic).
This index exists for everything else — the long tail that would have cost 4 KB of permanent
session-start weight to list as router rows.

---

## Standing reference — the docs that describe how the app IS

| File | What it answers |
|---|---|
| `architecture.md` | Feature list, tech stack, file tree, key design decisions, the **full reducer-action table**, roadmap, sibling projects |
| `traps.md` | Every trap in full, ~25 write-ups. `CLAUDE.md`'s TRAPS index is the complete list of *which* traps exist; this is the *why* and the fix |
| `design-system.md` | Palette, dark + light themes, session-type colours, filter tabs, micro-interactions, typography |
| `app-health.md` | Feature overhead register, `data.json` size budget vs the 1 MB ceiling, performance budget, sync health |
| `sync-and-offline-review.md` | Sync + service worker + localStorage architecture, risks, prioritised recommendations, decision log |
| `release-hygiene.md` | The full 7-step deploy pipeline, the five release-hygiene rules with their history, the Jun 11 Pages race, why all three live-diff gates are spent, review-discipline rationale |
| `changelog-summary.md` | Every version in plain English, newest first — the fastest way to answer "when did X change?" |
| `changelog-technical.md` | The same history with code detail (163 KB — grep it, don't read it whole) |
| `elie-next-visit.md` | Elie's pickup sheet, the 2026-07-18 standing-authority grant, rules for Elie-driven sessions |
| `health-check-2026-08-03.md` | Latest workspace health check: stale instructions found, sanity-suite state, `data.json` growth rate, the un-gitignored `tmp/` risk |
| `reviews/2026-06-10-fable5-codebase-review.md` | The standing work order. C1–C4 and M1–M16 are shipped; **P3 (SessionCard refactor) and P6 (ordinal at booking time) are still open** |
| `screenshots/CATALOG.md` | Dated visual history, v1.x → v2.9, with the device each shot came from |
| `2026-07-14-app-name-research.md` | Store-name screening round 1. "PTApp" is weak, "PTAssist" is dead; PT-prefixed candidates ranked |
| `2026-08-20-app-name-brainstorm.md` | Round 2 — PT prefix dropped. **Also the current product definition**: the owner→coach→client three-role platform, the evaluation→norms→program pipeline as the real value, the future AI direction, and who Elie actually is. Name candidates re-ranked and screened; **DECIDED: Elie chose PTAssyst** (Play is fine, Apple confusable-name risk vs the live "PT Assist" is unresolved) |
| `2026-08-21-backend-platform-decision.md` | **DECIDED 2026-08-21:** Supabase free-tier Postgres now, self-hosted VPS Postgres later. Why Postgres RLS beat Cloudflare D1, why the free tier is enough, and the standing build constraint — **auth stays behind one thin module** so the exit is a weekend, not a rewrite. Supersedes the platform half of `2026-08-21-multi-user-accounts-decision.md` |
| `2026-08-21-multi-user-accounts-decision.md` | The multi-tenant design record. §10 the two-role hierarchy (`pt`/`client`, prime = no parent), §11 no admin role + peer isolation + **"mine" is the default scope on every screen**, §12 the priced RLS: don't recurse at query time, and why `(select fn(row_column))` is *not* an initPlan. **Build state is not here** — that is `HANDOFF-multi-user-build.md` |
| ⟶ *code*: `supabase/migrations/0001_app_users.sql` (+ `_down`) | The identity tree itself: table, ltree path triggers, `private.my_path()`, the single `path <@ my_path()` read policy, and no write policy at all. Tested by `scripts/sanity/sanity-rls-matrix.mjs` — **static pass runs offline; exit 2 means the live pass was skipped, which is not a pass** |
| `apple-testflight-checklist.md` | The forward Apple list: what `codemagic.yaml` already does, what is blocked on the enrolment, and the App Store listing / privacy / review-notes answers, drafted |
| `stage2-publishing-guide.md` | Capacitor build, App Store / Play Store requirements, whether a company is needed, liability |
| `marketing-deck.md` | Elie's client-facing PPTX (EN + AR, lives in `_archive`, never committed here) and the **puppeteer screenshot harness** that regenerates it — incl. the invalid-token rule that stops a capture run pushing to live data |

---

## Design specs — `docs/superpowers/specs/`

The design record for each feature: what was decided, what was rejected, and why. Written before the
code. **The matching `docs/superpowers/plans/*.md` is the build log** — much longer, and rarely what
you want; the spec is.

| Topic you're asking about | Spec |
|---|---|
| Booking several clients into one slot | `2026-04-01-multi-client-booking-design.md` |
| The v2.4 light-theme redesign, glass header | `2026-04-03-visual-polish-light-redesign.md` |
| Per-record merge sync, `_modified`, union-by-ID (after the Apr 13 data loss) | `2026-04-13-sync-fix-design.md` |
| The Upcoming list on the Dashboard | `2026-04-19-upcoming-sessions-dashboard-design.md` |
| Manual session-count override, backfilling pre-app sessions | `2026-04-20-manual-session-count-override-design.md` |
| Session contracts, packages, package history | `2026-04-20-session-contracts-design.md` |
| The original evaluation exploration (superseded, kept for the reasoning) | `2026-04-21-evaluation-system-brainstorm.md` |
| SessionCard refactor — **paused at step 3, awaiting Pierre's scope call (P3)** | `2026-04-21-session-card-refactor-brainstorm.md` |
| Completed sessions rolling off Upcoming 2h past end | `2026-04-21-upcoming-rolloff-completed-design.md` |
| WhatsApp automation + the client-facing confirm/calendar link — **paused at Q1** | `2026-05-04-whatsapp-automation-and-calendar-link-paused.md` |
| Recurring / repeating session generator | `2026-06-09-recurring-session-generator-design.md` |
| The mass battery (predecessor to 1RM) | `2026-06-10-evaluation-v2-mass-battery-design.md` |
| Eval measurement console + timer | `2026-06-13-eval-ux-timer-design.md` |
| 1RM battery replacing the mass battery | `2026-07-06-1rm-battery-replaces-mass-design.md` |
| Program generation from a 1RM evaluation | `2026-07-13-program-generation-design.md` |
| Multi-day splits, 3–6 days | `2026-07-14-multi-day-split-design.md` |
| The visual language (plate & bar, skins) and the Dashboard slice | `2026-08-21-visual-language-dashboard-design.md` |
| Booking-time suggestion | `2026-07-17-booking-time-suggestion-design.md` |
| Arabic exercise names | `2026-07-17-exercise-names-arabic-design.md` |

Evaluation research artifacts: `docs/superpowers/artifacts/2026-06-09-evaluation-v2/` holds
`norms-research-findings.md` (the sources behind the standards, **and their caveats**) and
`2026-06-10-PT-feedback-ingested.md`.

---

## Per-release write-ups — `docs/instructions-v*.md`

One file per release. `CLAUDE.md` → Version History names the file for the last six; older ones are
listed here. `.0` releases are `instructions-vX.Y.md`, patches `instructions-vX.Y.Z.md`
(`v2.10.0.md` is a legacy exception).

| Release | Subject |
|---|---|
| `v2.15.0` | The app is renamed SpotSet in the UI; launcher icon; versionCode 2 for the Play upload |
| `v2.14.3` / `v2.14.2` / `v2.14.1` | Transliteration rule · Arabic exercise names · booking-time suggestion |
| `v2.14` | Multi-day split generation, 3–6 days |
| `v2.13` | Program generation (covers v2.13.0 through v2.13.3, incl. the Elie domain-review fixes) |
| `v2.12.1` / `v2.12` | Token-expiry surfacing + `TokenUpdateModal` · 1RM battery replaces mass |
| `v2.11.1` / `v2.11` | Eval timer + measurement console · mass battery ships |
| `v2.10.4` / `v2.10.3` / `v2.10.2` / `v2.10.1` / `v2.10.0` | `EDIT_CURRENT_PACKAGE` · fork hygiene + renewal selector · counting kernel · the Fable 5 review fix pack · recurring generator |
| `v2.9.6` | Booking-chip ordinal — three screens made to agree by construction |
| `v2.9.5` | Arms → Bi/Tri tag split, Custom → Endurance rename, v3→v4 migration |
| `v2.9.4` | Focus tags preserved on session-type change |
| `v2.9.3` | Top-level error boundary + backup-on-crash |
| `v2.9.2` | Post-deploy review fixes — incl. the silent override-drop bug in `Schedule.jsx` |
| `v2.9.1` / `v2.9` | Upcoming filter roll-off · session contracts ship |
| `v2.8` | Manual session-count override |
| `v2.7` | Upcoming sessions on the home screen |
| `v2.6` | Bulletproof multi-device sync (the per-record merge) |
| `v2.5` … `v1.8` | Pre-contracts era — UI history, largely superseded. `changelog-summary.md` covers these in prose and is usually the better read |

---

## Deliberately not routed

- **`docs/superpowers/plans/*.md`** — 14 build logs, 10–90 KB each. They would truncate at the
  router's 8 KB per-file budget, and the first 8 KB is scaffold. The spec above is the design record;
  open a plan only when the build sequence itself is the question.
- **`docs/changelog-technical.md`** — 163 KB. Grep it.
- [The figures — what Pierre asked for next](2026-08-22-figures-next-round-brief.md) — 🔴 the specified, unstarted round: zoom anchoring, direct-manipulation gestures, rotating + blue equipment, **different muscles on the fault figure**, multi-position sequences, the design round, the logo
- [Rotatable figures — the options](2026-08-22-figures-3d-options.md) — Pierre's multi-angle / 3D ask: four routes, what each costs, why 2.5D on the existing skeleton wins. 🔴 Read before building it
- [Design differentiation brief](design/2026-08-21-design-differentiation-brief.md) — why the app reads as generic, measured against the Agribond page; the opening questions for the design session
- [Fresh-eyes structure review, first run](design/2026-08-22-fresh-eyes-structure-review.md) — the stripped-structure attack on the whole app's IA (v2.25): 4 findings shipped, the parked ones — 🔴 money tracking above all — await Pierre
- [taste-skill evaluation](design/2026-08-22-taste-skill-evaluation.md) — Leonxlnx/taste-skill reviewed for SpotSet: NOT installed (its own scope bars product UI, and we already do most of it); harvest its AI-Tells list for the landing page / store listing / deck, plus `text-wrap`, the em-dash pass and skeleton states
- [Fresh-eyes navigation review, second run](design/2026-08-22-fresh-eyes-navigation-review.md) - the stripped-structure attack on the BOTTOM BAR and IA: keep the bar, replace the Sessions tab with the Library, and stop leaving the plate calculator in the middle ground. Two calls await Pierre
- [Roles and the dev surface](design/2026-08-22-roles-and-the-dev-surface-brainstorm.md) - BRAINSTORM, nothing decided: General is three audiences (product / tester / dev) stacked in one drawer; the honest split is at build time, not a hidden menu item. Elie's hierarchy is already in Postgres via owner_path but nothing reads it yet
- [The showcase suite brief](2026-08-22-showcase-suite-brief.md) — 🔴 SPECIFIED, NOT BUILT (v2.31): the 25s logo-tap title sequence — hero to top-left, a wall of turning/crossfading figures, the music prolonged; engineering facts probed (no ffmpeg, precomputed frames)
