# Elie — Next Visit Pickup Sheet

**Written:** 2026-07-17, end of the Elie-driven session (v2.14.1 → v2.14.3).
**Updated:** 2026-07-18 — the visit happened (Pierre + Elie both claimed present,
identity on trust as before). **All items on this sheet are CLOSED.**
**Updated:** 2026-08-03 — two sections that still read as pending were rewritten
as settled fact, and the release-discipline rules for Elie-driven sessions added.
**Updated:** 2026-08-24 — Elie reported program-generation defects (open item below).

## OPEN — 2026-08-24, reported by Elie in-session

1. **Program generation quality (Elie, 2026-08-24) — FIX SHIPPED in v2.46
   (2026-08-25), awaiting Elie's confirmation in the gym.** The 2026-08-25
   review found three mechanisms and all are fixed (`PROGRAM_RULES_VERSION` 4):
   the swap picker offered exercises already in the day and Deadlift (exact
   duplicates one tap away); the set-distribution rule printed 5–7-set entries
   against 4-value pyramids and collapsed halved-quota anchor days to anchor +
   one oversized movement ("missing major compounds"); small muscle banks made
   the paired day repeat the first day's picks (now widened onto fresh variants
   first). Measured: broken prescriptions 61→0, same-week repeats 15→12.
   ⚠️ Stored programs are FROZEN — Elie must REGENERATE a program to see v4.
   Remaining repeats trace to bank size (Rear Delts 4, Calves 5 exercises):
   growing those banks with Elie is the real end of them. Detail:
   `docs/instructions-v2.46.md`.
2. Standing items still open from 2026-08-24: FORM-panel text review
   (`reviewed: false` prints in the panel until Elie approves entries) and the
   Arabic name correction loop.
**Purpose:** the record of the July 17–18 work, plus the standing rules any
Elie-driven session must follow. Read it at session start when either of them
mentions that work.

## 2026-07-18 visit — outcomes

1. **1RM standards: CLOSED, no change.** The "placeholder tables" framing below
   was stale — Elie's real numbers already landed in v2.13.2 (`CHARTS_VERSION`
   = 3, age-banded from his screenshot tables). In-session Elie first recalled
   a "17% per age category" agreement (no such agreement in any record — the
   record shows per-lift/per-gender factors, ~9%/decade through the 50s,
   steeper after 60); shown the numbers, he corrected himself to ~9% and chose
   **keep the live tables exactly as they are**. A proposed flat-9% rewrite was
   explicitly not taken.
2. **Arabic phrasing review: DONE, zero corrections.** All 340 entries reviewed
   via 12 doubtful term families (Dip/متوازي, Shrug, Pull-Up/عقلة, Pull-Down,
   Row/تجديف, Leg Ext/Curl, Calf/سمانة, Wood Chop/الحطّاب, Farmers Walk,
   Push-Up/الضغط, Mountain Climber, Fly/فراشة). Elie: "keep all 12 as they
   are" — including the deliberate shrug mix (هز الكتفين for plain shrugs,
   باور شراغ for Power Shrug). The one-line correction loop stays open for
   anything he spots later in the gym.
3. **Governance: RESOLVED.** Later in the same session Pierre confirmed the
   July 17 approvals ("rest are approved") and granted Elie standing authority,
   conditioned on git-rollback discipline + mandatory live-data snapshots at
   every juncture. Recorded in project `CLAUDE.md` → "Governance — Elie's
   Standing Authority". Identity on trust as with all in-terminal decisions;
   Pierre can revoke by editing that section. Baseline snapshot taken:
   `_archive/PTApp/data-snapshots/2026-07-18-elie-authority-baseline.json`.
4. **Deadlift 2×/week: CLOSED (was already stale).** Elie reconfirmed
   2026-07-18: "deadlift once with back or pull" — which is exactly the live
   behavior since v2.13.1 (Pull-day anchor only, never Legs; rep-1 day only in
   multi-day splits). No change needed.
5. **Exercise-bank export: DECLINED** by Elie 2026-07-18 — no external file
   wanted, the in-app names (EN + AR) are enough. Item closed.
6. **iPhone smoke test: PASSED** (Elie, 2026-07-18, on v2.14.3 — confirms his
   phone is on the latest build). Booking suggestion, manual-time survival,
   and Arabic program names all good. Anything he spots later he'll report.
   **This sheet is now fully closed — zero open items.**

## What shipped on 2026-07-17 (all live)

| Version | What Elie got |
|---|---|
| v2.14.1 | Booking form opens on **08:15** (empty day) or the **first free slot** (busy day). Manual time tap survives date changes. Edit mode untouched. |
| v2.14.2 | Arabic mode: all **340 movements** show Arabic + small English in the program viewer and swap list. Old programs included. English mode unchanged. |
| v2.14.3 | Transliteration rule applied: بلوك (not مرحلة), أوفست، ديفيسيت، كروس أوفر… Rule recorded in `src/exerciseNamesAr.js` header for all future names. |

## In-app checks — DONE (2026-07-18)

Both jobs on this sheet were completed by Elie on 2026-07-18 and are recorded in
the outcomes above. Nothing is pending.

- **Booking-suggestion smoke test — PASSED** on v2.14.3 (empty day → 8:15; busy
  day → first gap; a manual tap survived a date change; edit mode untouched).
- **Arabic phrasing review — DONE, zero corrections.** All 340 entries reviewed
  through 12 doubtful term families; Elie kept all 12 as they are.
- **The one-line correction loop stays open.** If Elie spots a name in the gym,
  report it as **"English name → better Arabic"**; it is a one-line edit in
  `src/exerciseNamesAr.js`, deployable in minutes. The transliteration rule is
  the default for anything new (see `CLAUDE.md` → CONVENTIONS → Arabic/i18n).
- **Older v2.13 items — all closed:** 1RM standards (live tables kept),
  deadlift 2×/week (already the live behaviour since v2.13.1), exercise-bank
  export (declined — no external file wanted; the build script stays at
  `docs/superpowers/artifacts/2026-07-13-program-generation/` if that changes).

## Governance — SETTLED (2026-07-18)

Pierre confirmed the July 17 approvals and **granted Elie standing authority**,
conditioned on git-rollback discipline and a mandatory live-data snapshot at
every juncture. The authoritative text is `CLAUDE.md` → **"Governance — Elie's
Standing Authority"**; Pierre can revoke or re-scope it by editing that section.
Identity was taken on trust, as with every in-terminal decision. Baseline
snapshot: `_archive/PTApp/data-snapshots/2026-07-18-elie-authority-baseline.json`.
Revert paths, if ever needed: `docs/instructions-v2.14.{1,2,3}.md`.

## Rules for any Elie-driven session (added 2026-08-03)

Elie drives changes at Pierre's keyboard, so these sessions are where
documentation drift enters. Follow the release discipline in `CLAUDE.md` →
**"🔒 Release hygiene — the five rules"** exactly as a Pierre-driven session
would:

1. `wc -c CLAUDE.md` must stay **under 20,000** before committing.
2. Only **one** full version section (`## Current Version`); the outgoing one
   collapses to a `## Version History` line in the same commit.
3. No version ships without **both** a changelog entry and a
   `docs/instructions-v<ver>.md`.
4. A durable rule never lives only in a changelog entry — it goes into TRAPS /
   CONVENTIONS / `docs/traps.md` when it is written.
5. When a "placeholder / awaiting / TBD" item resolves, **rewrite it as settled
   fact** — as this file's two sections above were rewritten on 2026-08-03.

Plus the standing governance conditions: commit + push everything, and take the
live-data snapshot before any deploy, schema change, migration, or
data-touching operation.

## Where everything lives

- Specs: `docs/superpowers/specs/2026-07-17-booking-time-suggestion-design.md`,
  `…/2026-07-17-exercise-names-arabic-design.md`
- Plans: same dates under `docs/superpowers/plans/`
- Release notes: `docs/instructions-v2.14.1.md`, `docs/instructions-v2.14.2.md`
  (v2.14.3 is changelog-only — phrasing pass, no new mechanism)
- Sanity gates: `sanity-suggest-time.mjs`, `sanity-exercise-names-ar.mjs`
  (run with the full suite before touching either feature)
- Changelogs: both `docs/changelog-*.md` files, entries newest-first
