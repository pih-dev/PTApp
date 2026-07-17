# v2.14.2 — Arabic Exercise Names

**Released:** 2026-07-17 · UI-only point release · no schema change, no bank regeneration, nothing persisted

## What it does

In Arabic mode, the program viewer and the swap-exercise list show every
movement's **Arabic name first, with the English original in small faded
text** beside it. English mode is byte-identical to before. Old (frozen)
program records get Arabic automatically — translation happens at display
time, keyed by the English name the records already store.

**Fallback rule:** a movement missing from the map renders its English name
exactly as before — never blank. A new exercise-bank version may therefore
ship before its translations.

Day headers (Push / Pull / Legs) deliberately stay English — Elie reconfirmed
his v2.13 decision E3.

## Where the logic lives

- `src/exerciseNamesAr.js` — handwritten 340-entry map + `exNameAr(name)`.
  NOT generated, NOT part of the bank; `EXERCISE_BANK_VERSION` untouched.
- `ProgramViewer.jsx` — `exLabel(lang, name)` helper used by both the exercise
  rows and the swap-modal buttons. The English snippet carries the same
  `ltr + isolate` bidi treatment as the prescription numbers (I3).

## Elie's phrasing-review workflow

The translations were drafted by Claude (standard Lebanese-gym terminology;
loanwords kept where they ARE the vocabulary: بنش برس، سكوات، ديدلفت، كيرل).
Elie reviews **in-app**: the small English text identifies each movement; he
sends corrections as "English name → better Arabic" and each lands as a
one-line edit to `exerciseNamesAr.js` (coverage sanity keeps the map honest).

## Testing

`scripts/sanity/sanity-exercise-names-ar.mjs`: all 340 bank names covered,
no stray keys (renamed-catalog-key trap class), every value contains Arabic
script, helper contract (`null` for unknown). Full 11-script suite green
pre-deploy.

## Provenance (for Pierre)

Same governance as v2.14.1 (`docs/instructions-v2.14.1.md`): requested and
designed by Elie in-session 2026-07-17; per-spec "approved" typed in-session,
identity taken on trust and recorded; blanket authority remains declined.
Revert path if you disagree: master `ff5feda..` (map), `a9dfa9e` (viewer),
this release commit; plus the gh-pages deploy commit.
