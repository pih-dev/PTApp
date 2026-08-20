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
