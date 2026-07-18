# Elie — Next Visit Pickup Sheet

**Written:** 2026-07-17, end of the Elie-driven session (v2.14.1 → v2.14.3).
**Updated:** 2026-07-18 — the visit happened (Pierre + Elie both claimed present,
identity on trust as before). Outcomes below; unresolved items remain.
**Purpose:** everything Elie should check/decide next time he's physically here,
plus what Pierre needs to see first. Read this file at session start when
either of them mentions the July 17 work.

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

## For Elie to do in-app

1. **Booking suggestion smoke test** (Schedule tab): empty future day → 8:15;
   a day with sessions → first gap; tap a time then change the date → your tap
   survives; edit an existing session → its time untouched.
2. **Arabic phrasing review** (the main job): switch to Arabic, open programs,
   read the movement names. The small English text identifies each movement.
   Report corrections as **"English name → better Arabic"** — each is a
   one-line edit in `src/exerciseNamesAr.js`, deployable in minutes. The
   transliteration rule (voice note) is already the default for new entries.
3. **Older open items from v2.13: ALL CLOSED.** 1RM-standards and
   deadlift-2×/week were stale (already resolved in v2.13.1/v2.13.2,
   reconfirmed 2026-07-18). Exercise-bank export DECLINED by Elie 2026-07-18
   ("as long as they are in the app") — its sign-off purpose was already
   served in person on July 14; no reference file wanted. The build script
   stays at `docs/superpowers/artifacts/2026-07-13-program-generation/` if
   this ever changes.

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
