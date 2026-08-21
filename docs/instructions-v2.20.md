# v2.20.0 — the screens under the client card (A5)

**Date:** 2026-08-22 · **Stage 4 of the design pass** · Chosen by Pierre from
`docs/design/2026-08-22-what-is-left.md` (A5).

---

## What this finishes

Evaluations, programs, the program viewer and the norm charts inherited the *tokens* in v2.19 but
not the *language*: they were built with ad-hoc inline headings (`fontSize: 14, fontWeight: 600`)
and 1px `--sep` hairlines — a hairline being one of the six traits the pass exists to remove. With
this release **no screen in the app is still in the old idiom.**

## New primitives

| Class | What it is |
|---|---|
| `.subbar` | the bar at sub-section scale — inside a card or a modal. Evaluations, Programs, the day headers, the month navigator |
| `.lrow` | the row it separates (2px `--bar`, no border on the last one) |
| `.num` | mono + tabular figures for numbers that live inside a sentence |
| `.exrow` / `.exrow-rx` / `.exrow-swap` | the program viewer's exercise row |
| `.blockhead` | a program block's header, meta allowed to wrap instead of clipping |

## The program viewer, rebuilt

It was the worst screen in the app and it is the one the PT reads *while coaching*. The exercise row
was a single wrapping line — name, sets, percentages, weights, rest — with a two-word **SWAP
EXERCISE** button eating the right third, so both the prescription and the button wrapped and the
movement name stopped being findable.

Now: **the name on its own line, the prescription in mono underneath, and a one-word swap target.**
Four percentages and four weights line up down the column instead of jittering. The block header
became a bar whose meta wraps rather than running off a narrow phone.

## Also

- **The last emoji in the interface is gone** — the ⚠️ in the delete-evaluation confirm is a drawn
  mark in danger red.
- **Destructive buttons lost their gradient** (`linear-gradient(135deg,#EF4444,#DC2626)` → flat
  `#EF4444`) in all four places that had one.
- **The double divider** under an expanded client card — the row's own bar plus the panel's top
  border, two parallel shafts with a gap — is gone.
- **Month summary counts** use `--ok` / `--warn` instead of literal green and red, and the month
  label is mono.
- **An RTL bug:** the English gloss beside an Arabic exercise name sat flush against it.
  `marginInlineStart` only spaces ONE side, and a bidi-isolated run has nothing on the other —
  `marginInline` spaces both.

## New string

`swap` (EN "Swap" / AR "تبديل") for the in-row control. `swapExercise` stays as the picker's title —
inside a row that is already about one exercise, the noun was redundant and it cost the layout.

## Verified

Built, `verify-bundle`, full suite by exit code (only the three spent live-diff gates fail, by
design). Driven in a browser on the DEMO credential: a real 1RM evaluation entered and saved, a real
6-block program generated from it, and the viewer opened in **English and Arabic** — which is how
the gloss bug was found. No kernel, reducer or dispatch change; `DATA_VERSION` stays 6.
