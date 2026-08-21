# SpotSet — The Exercise Figures (B2) HANDOFF

**Created:** 2026-08-22, Beirut · **Owner thread:** the figures, and only the figures.
**To resume:** Pierre types `figures`. **Read §0 back to him and stop.** Do not start drawing.

🔴 **STANDING INSTRUCTION FOR THIS SUBJECT: keep this file current AS YOU GO.** Update §0 and commit
at each milestone. A restart could end the session at any moment.

> 📌 Other threads that are NOT this one: `HANDOFF-design.md` (the visual-language pass, stages 1–5,
> **finished**), `HANDOFF-multi-user-build.md` (Supabase / Task A), `HANDOFF-spotset-publishing.md`
> (Play + Apple), `HANDOFF.md` (the queued-task overview).

---

## 0. Status — read this out

- **Nothing is built yet. This is a brief, not a build.** The app is at **v2.21.1** and the movement
  sheet (`src/components/MovementSheet.jsx`) is the place a figure will land — deliberately not
  stubbed, so nothing looks broken while this is pending.
- 🔴 **PIERRE HAS IDEAS AND WANTS TO TALK BEFORE ANYONE DRAWS.** His words, 2026-08-22:
  *"Let's do the figures… I have some ideas."* **Do not open a generator, do not pick a style, do
  not produce 340 of anything until that conversation happens.**
- **Route chosen: GENERATE**, with his caveat — *"we don't want stiffness."* That caveat is the
  entire technical problem (§3).
- **Line drawings are OUT.** *"The line draw is probably out. Those silhouettes are amazing."*
  The reference read (§2) already pointed the same way: solid silhouettes hold up at small size,
  outlines do not.
- **He supplied a prompt template** built with an expert-biomechanist framing (§4, verbatim). It is
  good, and two parts of it need a decision before use: the injury text (§5, a real liability
  question) and the "no colour references" instruction (§6, which our token system contradicts).
- **The three questions that gate the spec** are in §7. Two of them are Pierre's to answer.

---

## 1. What is already decided, and where it is written

| Decision | Where |
|---|---|
| Curves not hinges · the correct/wrong pair · the injury marked on **the joint that takes it** · a 7.5-head canon with the hip at half standing height · the wrong figure reuses the **same bone lengths** · draw **the moment in the lift where the error lives** | `docs/design/2026-08-21-design-differentiation-brief.md` §7.9, §7.12, §7.13 |
| The reference read — six sheets, sheet by sheet, and the figure-vs-mark split | `docs/design/2026-08-22-figure-references.md` |
| `--anatomy` (`#F2622C`) is reserved **for inside the figures** and never for the UI | `CLAUDE.md` CONVENTIONS; `src/styles.css` token block |
| Where a figure will be shown | `src/components/MovementSheet.jsx` (hot path: a movement name in a program; cold path: the library) |
| The data spine: 340 movements, `name / muscles / primary / type / slot / advanced`, Arabic for all | `src/exerciseBank.js`, `src/exerciseNamesAr.js` |

## 2. The three artifacts, not one

From the reference read, and it is the decision that keeps 340 movements looking like one library:

1. **The figure** — the form-teaching drawing. Solid silhouette, one tone, equipment legible, the
   fault marked on the joint. Lives in the movement sheet.
2. **The wrong figure** — same skeleton, same bone lengths, one specific mechanical error, the
   stressed joint marked in `--anatomy`.
3. **The mark** — a 16–24px reduction of the same pose, one flat shape, for list rows and tabs.
   **Drawn from the figure, not separately.**

🔴 **The acceptance test is legibility at the size it will actually be used, and again at half that.**
A figure that only works large is not finished.

## 3. "Without stiffness" — the actual engineering problem

A generated figure defaults to **straight bones and hinge joints**, which is exactly what the brief's
*curves not hinges* rule was written against. Whatever the production route, the output must show:

- **Curves through the whole chain** — the spine is an S, not a segment; the limbs carry arcs.
- **Weight shift** — the centre of mass sits over the loaded foot/feet, not centred by default.
- **Counter-rotation** — shoulders and hips do not stay parallel through a lift.
- **The moment, not the pose** — the instant where the error lives (bottom of the squat, lockout of
  the deadlift), not a neutral standing figure holding a prop.
- **One canon** — same head height, same bone lengths, same weight, every movement, both genders.

**A generated figure that fails these is not "close enough to fix later" — it is the generic look
arriving through a different door.** Judge each pose against a real photograph before it ships.

## 4. Pierre's prompt template (verbatim, 2026-08-22)

He researched this separately and asked that it be used **together with** what we decided above. His
note on the model: *"which model is best for generating these figures… Opus 5 with xhigh effort,
because it concerns drawing anatomically correct stuff."*

> You are an expert biomechanist, sports medicine physician, and digital asset designer. Your task is
> to generate the precise technical data and visual asset blueprints for a specific movement entry in
> my existing gym move library.
>
> Target Movement: [INSERT MOVEMENT NAME HERE]
>
> Please output the exact text and image generation parameters using the structure below:
>
> ### 1. Visual Asset Prompts (Anatomically Correct Silhouettes)
> Generate two distinct, hyper-specific image prompts optimized for an AI image generator. The prompt
> styling must remain perfectly uniform across my library. Do not include specific color references or
> background descriptions.
>
> * **Silhouette 1 (Correct Posture & Muscle Engagement):**
>   "A clean, minimal vector silhouette of a human figure executing a [INSERT MOVEMENT NAME] with
>   perfect form. The figure must show immaculate anatomical alignment ([Insert specific alignment
>   cues]). Overlay a distinct contrast layer directly onto the silhouette's musculature to highlight
>   the primary muscles being triggered: [Insert targeted muscles]. Use an ultra-clean, clinical
>   infographic style with sharp anatomical boundaries."
>
> * **Silhouette 2 (Pathology / What to Avoid):**
>   "A clean, minimal vector silhouette of a human figure executing a [INSERT MOVEMENT NAME] with
>   critically flawed mechanics. The silhouette must distinctly illustrate the specific mechanical
>   error: [Insert specific technical flaw]. Highlight the exact joint or tissue stress zone under
>   high risk with a distinct, localized contrast overlay to indicate the point of failure. Clinical
>   infographic style."
>
> ### 2. Clinical Risk Analysis
> * **Targeted Muscle Groups:** [List the primary muscles highlighted in Silhouette 1]
> * **Mechanical Flaw to Avoid:** [Detail the precise physical compensation shown in Silhouette 2]
> * **Potential Clinical Injury:** [State the specific medical pathology resulting from the flaw]
> * **Safety Coaching Cue:** [Provide a short, 1-sentence coaching cue to keep the lifter safe]

**What is good about it:** it forces the pair, it forces the fault to be *specific*, it marks the
stressed joint, and it insists on uniform styling across the library — which is our single hardest
constraint. It also produces the *text* we would otherwise have to invent per movement.

## 5. 🔴 The one thing to settle before any of that text ships

Part 2 of the template produces **"Potential Clinical Injury" — a medical claim**, and a
**"Safety Coaching Cue" — coaching instruction**, for 340 movements.

`MovementSheet.jsx` currently carries a deliberate rule: *the sheet shows only what the bank knows;
coaching content needs an owner, a language pair and a review process, and that owner is Elie.*
Generated clinical text has none of those. Shipping it would mean a fitness app telling a real
trainer's real clients which injury a movement causes — in two languages, unreviewed.

**Three defensible options, Pierre's call:**

1. **Generate it, hold it, ship none of it** until Elie has reviewed each line. The text lives in a
   data file with a `reviewed: false` flag and the sheet renders only reviewed entries.
2. **Ship the coaching cue only**, drop the pathology naming. A cue is instruction; a diagnosis is a
   claim. Elie still reviews, but the risk profile is completely different.
3. **Use the clinical analysis as INPUT to the drawing and never display it** — it tells the artist
   which joint to mark and which error to draw, and no medical text ever reaches a client.

**Recommendation: (3) for the first release, then (2) once Elie has reviewed.** It gets the value —
correct, specific figures — with no medical claims on screen, and it does not block on a review cycle
that has not been scheduled.

## 6. Where the template conflicts with the app, and what wins

- **"Do not include specific color references"** — correct for the *generator*, wrong for the *asset*.
  Our figures must be **skin-agnostic**: a single-colour silhouette that inherits `currentColor`, with
  the fault zone in `--anatomy`. So: generate colourless, then re-express as two-tone SVG against our
  tokens. 🔴 A baked-in colour would belong to one skin and break the other, which is the rule the
  whole design pass is built on.
- **"Clinical infographic style"** vs the reference sheets Pierre liked (solid, confident, gym-poster
  silhouettes). These pull in different directions. **The reference sheets win** — they are what he
  actually pointed at — but "sharp anatomical boundaries" from the template is worth keeping.
- **Raster vs vector.** An AI image generator returns raster. 340×2 rasters at retina size is a
  download-size problem in a single-file bundle (the app is already 614 KB with fonts). **Vector or
  vectorised is the target**; measure before committing to raster.

## 7. The questions that gate the spec

1. **Pierre's ideas** (§0) — unknown until he says them. Everything else waits.
2. **The clinical-text decision** (§5) — his call; recommendation on record.
3. **Do all 340 get a wrong-figure pair, or only the ~40 where a fault is common?**
   340×2 is a different project from 340×1 + 40 pairs. This is the cost driver.

Secondary, decidable by whoever builds: raster vs vector, one gender or both per movement, and
whether the mark is generated or reduced from the figure (the reference read says **reduced**).

## 8. What NOT to do

- ❌ Do not stub an empty figure box in `MovementSheet` "so it's ready". A placeholder that looks
  broken is worse than a sheet that is complete for what it knows.
- ❌ Do not ship a partial library — 40 movements with figures and 300 without reads as broken, not
  as progress. Ship a complete *category* (e.g. all Legs compounds) or nothing.
- ❌ Do not bake a palette colour into an asset.
- ❌ Do not let generated medical text reach a screen before §5 is settled.
- ❌ Do not start with the logo (B3) instead — it comes after the figures, so the mark is drawn into
  a system that exists.
