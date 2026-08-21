# SpotSet v2.22 — the exercise figures land (B2, the pilot six)

**Date:** 2026-08-22 · **Thread:** `HANDOFF-figures.md` (B2) · **Route:** parametric SVG, authored
in code (route A of the handoff's §9) · **Scope:** six movements, one per bucket. Nothing is scaled
until these six have been judged.

---

## What you will see

Open a movement — tap its name in a program, or find it in **General → Movement library** — and six
of them now open with a **FORM** panel at the top: two figures side by side, and three sentences.

| | |
|---|---|
| **The left figure** | Correct form, at the moment in the lift where the error lives |
| **The right figure** | The same body doing the same lift with ONE specific mechanical error, and an orange ring on the joint that takes the stress |
| **The fault** | What is going wrong, in one sentence |
| **The risk** | What that error is documented to load — movement-level, never about a person |
| **The cue** | The one thing to say to fix it |

Everything is in Arabic too, and in RTL the pair mirrors so the correct figure still reads first.

**The six:** Back Squat · Deadlift · Chest Press Machine · Pull-Up · Barbell Curl · Leg Press.
Every other movement's sheet is exactly what shipped in v2.21 — no empty box, no placeholder.

---

## How the figures are made, and why it matters

There is no image file anywhere. **A figure is a list of joint angles** against one shared skeleton
(`src/figures/canon.js`), drawn as smooth variable-width ribbons (`src/figures/render.js`). That
choice buys four things no other route gives:

1. **One canon by construction.** All 340 movements will use the same bone lengths, the same 7.5-head
   proportions, the same weight of line. A library looks like a library because it cannot do
   otherwise.
2. **The pair is free.** The wrong figure is the same skeleton with two angles changed — which is
   exactly the design rule ("the wrong figure reuses the same bone lengths"). A pose file can only
   supply angles, so it cannot break that rule even by accident.
3. **The size is nothing.** The whole engine, six pairs and their bilingual text cost **~32 KB** in
   the bundle (614 → 646 KB). Six raster images would have cost more than that on their own.
4. **It is correctable.** A wrong elbow is a number to change, not a re-generation lottery.

The figures also **paint from `currentColor`**, so they take whatever skin is active and will work
on skins that do not exist yet. The one named colour is `--anatomy`, which was reserved for exactly
this and is still forbidden everywhere else in the interface.

---

## The clinical text

Pierre's ruling, 2026-08-22: **include it.** These are documented, long-established facts about
well-known lifts — not a diagnosis this app is inventing about a person.

It lives in **`src/figureText.js`**, keyed by movement, with `reviewed: false` on every entry until
Elie has read it. A correction is a one-line edit. That is the same workflow that got the 340 Arabic
movement names reviewed, and it is why this could ship now instead of waiting for a review cycle
that has not been scheduled.

**Guardrails, enforced by `scripts/sanity/sanity-figures.mjs`:** movement-level mechanism only,
never a claim about a client, never a prescription or a treatment, one sentence per line, both
languages present.

---

## What is deliberately NOT here

- **The flat barbell bench press.** Its defining fault is elbow flare, which is abduction — it
  happens in the plane a profile camera looks down, so a side view cannot show it, and the view from
  above stops looking like the rest of the set. Both were built and both were rejected. The
  horizontal-press bucket is carried by the **Chest Press Machine**, whose fault (the elbow riding
  above the shoulder line) is sagittal and reads perfectly in profile. The bench press waits on a
  decision about out-of-plane foreshortening — `HANDOFF-figures.md` §11.
- **The 16px mark.** It renders (`figureSvg(pose, { detail: 'mark' })`) and it is legible from about
  24px up, but nothing in the app uses it yet. It goes in with the Schedule layout pass, where list
  rows are already being touched.
- **The other 334 movements.** Nothing scales until the six are judged.

---

## For the next session

`node scripts/figures-preview.mjs` writes `tmp/figures-preview.html`: all six pairs, both skins,
full size and again at 16/24/48px. That is the acceptance test — legibility at the size a figure is
actually used, and again at half of it. `node scripts/sanity/sanity-figures.mjs` is the gate that
protects the rules a screenshot cannot check.
