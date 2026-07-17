# Arabic Exercise Names — Design Spec

**Date:** 2026-07-17
**Requested by:** Elie (the PT, end user) — directly in-session, same session as the v2.14.1 booking-time-suggestion work
**Status:** Design approved by Elie in-session; implementation approval per project governance (see Provenance)
**Scope:** UI-only, no schema change, nothing persisted, no bank regeneration

## What Elie asked for

> "In Arabic the moves are in English — translate the moves to Arabic as well."

Arabic mode shows program exercise names ("Hammer Curl", "Incline Bench Press", …) in English because `ProgramViewer.jsx` prints the frozen `e.name` raw and the swap list prints bank names raw.

## Decisions made with Elie (2026-07-17)

| Question | Elie's choice |
|---|---|
| Source of the Arabic names? | **Claude drafts standard gym Arabic for all movements; Elie corrects phrasing afterwards** (he's the authority; corrections are one-line edits). |
| Display format in Arabic mode? | **Arabic name + the original English in small faded text** — Lebanese gyms know many moves by English names, and it lets Elie spot bad phrasing instantly. |
| Day headers (Push/Pull/Legs)? | **Stay English** — reconfirmed Elie's v2.13 decision E3. |

## Design

### New file: `src/exerciseNamesAr.js`

- `export const EXERCISE_NAMES_AR = { 'Hammer Curl': '…', … }` — one entry for
  **all 340** bank movements (335 have a bucket and can appear in programs/swap
  lists; the 5 bucketless ones are translated too — costs nothing, future-proofs).
- `export const exNameAr = (name) => EXERCISE_NAMES_AR[name] || null;`
- Handwritten domain content — NOT generated, NOT part of the exercise bank.
  `EXERCISE_BANK_VERSION` is untouched (generation math is byte-identical; this
  is display-only). Keyed by the exact English `name` string — the same key the
  frozen program records store, so **old programs get Arabic automatically**.
- Deliberately not in `i18n.js`: that file is for UI labels; 340 domain entries
  belong in their own module next to the bank.

### Display (Arabic mode only; English mode byte-identical)

- `ProgramViewer.jsx` exercise rows: when `lang === 'ar'` and `exNameAr(e.name)`
  exists → render the Arabic name, then the English original in small faded text
  (`fontSize` ~10, `color: var(--t5)`) wrapped in the same
  `direction:ltr; unicodeBidi:isolate` treatment the prescription span already
  uses (I3), so the Latin text doesn't reorder inside the RTL row.
- Swap modal buttons: same treatment — Arabic first, small English after.
- **Fallback:** name missing from the map → English exactly as today, never
  blank. New bank versions can ship before their translations do.

### Testing

- New sanity `scripts/sanity/sanity-exercise-names-ar.mjs`:
  1. Every one of the 340 bank names has a non-empty `EXERCISE_NAMES_AR` entry.
  2. Every map key matches a bank name exactly (no stray/renamed keys — the
     "renamed catalog key kills fallbacks" trap class).
  3. Every value contains Arabic script (`/[؀-ۿ]/`) — catches paste
     errors where an English string lands in the Arabic column.
- Elie's phrasing review happens in-app after deploy (the small-English display
  is the review aid); corrections are single-line map edits in follow-up commits.

### Not doing (YAGNI)

- No Arabic for day headers / slot words (Elie: keep English, decision E3).
- No Arabic in the exercise bank file or the build script.
- No per-record storage of translated names — display-time lookup only.
- No transliteration column, no settings toggle.

### Version / deploy

- Point release v2.14.2, standard pipeline (build → bundle verify → master →
  gh-pages → Pages build `built` → live diff).

## Provenance

Same governance as v2.14.1 (see `docs/instructions-v2.14.1.md`): designed with
Elie in-session; identity of approvals taken on trust and recorded; Pierre
reviews post-hoc. Blanket authority for Elie remains declined — this spec is
individually approved.
