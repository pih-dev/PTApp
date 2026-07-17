# Elie — Next Visit Pickup Sheet

**Written:** 2026-07-17, end of the Elie-driven session (v2.14.1 → v2.14.3).
**Purpose:** everything Elie should check/decide next time he's physically here,
plus what Pierre needs to see first. Read this file at session start when
either of them mentions the July 17 work.

## What shipped on 2026-07-17 (all live)

| Version | What Elie got |
|---|---|
| v2.14.1 | Booking form opens on **08:15** (empty day) or the **first free slot** (busy day). Manual time tap survives date changes. Edit mode untouched. |
| v2.14.2 | Arabic mode: all **340 movements** show Arabic + small English in the program viewer and swap list. Old programs included. English mode unchanged. |
| v2.14.3 | Transliteration rule applied: بلوك (not مرحلة), أوفست، ديفيسيت، كروس أوفر… Rule recorded in `src/exerciseNamesAr.js` header for all future names. |

## For Elie to do in-app

1. **Booking suggestion smoke test** (Schedule tab): empty future day → 8:15;
   a day with sessions → first gap; tap a time then change the date → your tap
   survives; edit an existing session → its time untouched.
2. **Arabic phrasing review** (the main job): switch to Arabic, open programs,
   read the movement names. The small English text identifies each movement.
   Report corrections as **"English name → better Arabic"** — each is a
   one-line edit in `src/exerciseNamesAr.js`, deployable in minutes. The
   transliteration rule (voice note) is already the default for new entries.
3. **Older open items from v2.13** (still pending from his review list):
   deadlift-2×/week question, exercise-bank export, plus the 1RM standards
   xlsx (placeholder ratio tables in `normCharts.js` still await his numbers —
   `CHARTS_VERSION` bumps 2→3 when they land).

## For Pierre FIRST (governance — before more Elie work)

All three releases were approved **in-session while Elie was at the keyboard**;
"pg is here" / "approved" could not be verified. Blanket authority for Elie was
declined — each spec was individually approved, and v2.14.3 ran on a relayed
voice note strictly inside the pre-authorized phrasing-correction loop.

1. Confirm the approvals were really you (else revert paths are in
   `docs/instructions-v2.14.1.md` / `-v2.14.2.md`).
2. Decide whether Elie gets any standing authority. If yes, write it into
   `CLAUDE.md` yourself (scope it: e.g. "phrasing/content edits yes,
   features no"). Until then, per-spec approval remains the rule.
3. Full commit list + checklist duplicated in memory:
   `project_booking_time_suggestion_pending.md`.

## Where everything lives

- Specs: `docs/superpowers/specs/2026-07-17-booking-time-suggestion-design.md`,
  `…/2026-07-17-exercise-names-arabic-design.md`
- Plans: same dates under `docs/superpowers/plans/`
- Release notes: `docs/instructions-v2.14.1.md`, `docs/instructions-v2.14.2.md`
  (v2.14.3 is changelog-only — phrasing pass, no new mechanism)
- Sanity gates: `sanity-suggest-time.mjs`, `sanity-exercise-names-ar.mjs`
  (run with the full suite before touching either feature)
- Changelogs: both `docs/changelog-*.md` files, entries newest-first
