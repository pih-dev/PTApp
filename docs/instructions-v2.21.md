# v2.21.0 — the movement library (feature B1)

**Date:** 2026-08-22 · **The first new capability since v2.14** — everything between was the design
pass. Chosen by Pierre from `docs/design/2026-08-22-what-is-left.md` (B1).
**Spec origin:** the visual-language spec §10 item 1.

---

## The gap it closes

**340 movements have been in `exerciseBank.js` since v2.13, with a handwritten Arabic name for every
one of them — and a movement name was a dead end.** The PT could read "Reverse-Grip Barbell Curl" in
a generated program and had nowhere to tap. The data was already there; the door was missing.

## Two paths, one sheet

- **Hot path** — every exercise name in the program viewer is now tappable and opens the movement
  sheet. This is the one that matters: it is used mid-session, with a client waiting.
- **Cold path** — **General → Movement library**: search and browse all 340. It sits with the norm
  charts because it is the same kind of thing — reference the PT *consults*, not something he
  operates. (A fifth nav tab was rejected: the tab bar is a working tool, and A6 will revisit what
  the four tabs are before anything is added to them.)

## The sheet shows only what the bank knows

Name (both scripts), the muscles with **the primary one marked**, compound vs isolation, the
training day it belongs to and that day's major muscle, and an **Advanced** flag where the bank sets
one — the same flag that decides whether the generator may hand the movement to a beginner.

🔴 **No cues, no rep advice, no "tips".** Coaching content needs an owner, a language pair and a
review process, and Elie is that owner — not this component. 🔴 **The figure goes here later** and is
deliberately not stubbed: a placeholder that looks broken is worse than a sheet that is complete for
what it currently knows.

## Search works in both scripts, from one box

The PT types Arabic on an Arabic keyboard and English on an English one and should not have to tell
the app which. Every entry is indexed on its English name, its Arabic name, its primary muscle and
all its muscles — so **"biceps" and "كيرل" and "curl" all find things**.

🔴 **Typed Arabic is not written Arabic**, and the differences are invisible on screen but fatal to
`includes()`: harakat, tatweel (ـ), and the alef / ya / ta-marbuta variants. `normaliseSearch` in
`utils.js` folds them on both sides of the comparison. Without it, searching `كيرل` misses `كيرْل`
and the feature looks broken to exactly the half of the audience it was built for.

**It lives in `utils.js`, not inside the component**, so the gate can exercise it for real — a fold
that only exists inside a JSX component is a fold nobody can prove.

## `sanity-movement-library.mjs` (new)

- every `primary` is one of the movement's own muscles; every `type` is compound/isolation; every
  non-null `slot` resolves a muscle group — i.e. **every entry is renderable by the sheet**;
- 🔴 **all 23 muscles have an Arabic label and all 340 movements have an Arabic name.** One missing
  muscle shows as a single English word in a row of Arabic ones, on a screen an English-reading
  developer never opens in Arabic;
- the fold, run on the six string classes that actually break `includes()`;
- an end-to-end search over the same index the screen builds.

**Made to fail on purpose before being trusted** (the standard set in the v2.17 session): deleting
one Arabic muscle turned it red and named `Quads`; removing the harakat fold turned three assertions
red. Both restored.

## Files

`MovementSheet.jsx`, `MovementLibrary.jsx` (new) · `utils.js` (`normaliseSearch`) · `i18n.js`
(strings EN+AR, and a `MUSCLE_AR` map with `muscleLabel`) · `ProgramViewer.jsx` (the name is a
control) · `General.jsx` (the entry point) · `styles.css` (`.mv-*`) ·
`scripts/sanity/sanity-movement-library.mjs` (new).

**No schema change. `DATA_VERSION` stays 6** — the library reads the frozen bank, writes nothing.

## Verified

Built, `verify-bundle`, full suite by exit code (only the three spent live-diff gates fail, by
design). Driven in a browser on the DEMO credential: the library opened from General, an **Arabic
query typed into the box returned 8 movements**, a sheet opened from a library row, and a sheet
opened from a movement name inside a real generated program — three modals deep, which is why that
last one was worth checking rather than assuming.

## A near-miss worth recording

Mid-session I ran `git checkout -- src/i18n.js` to undo a deliberate gate mutation. That reverts to
**HEAD**, which also threw away this release's uncommitted strings. Nothing was lost permanently
(they were rewritten from the same patch), but the rule is now in TRAPS: **never `git checkout --`
a file that holds uncommitted work — revert the mutation you made, or stash first.**
