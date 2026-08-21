# SpotSet — The Exercise Figures (B2) HANDOFF

**Created:** 2026-08-22, Beirut · **Owner thread:** the figures, and only the figures.
**To resume:** Pierre types `figures`. **Read §0 back to him and stop**, then start §9's step 1.

🔴 **STANDING INSTRUCTION FOR THIS SUBJECT: keep this file current AS YOU GO.** Update §0 and commit
at each milestone. A restart could end the session at any moment.

> 📌 Other threads that are NOT this one: `HANDOFF-design.md` (the visual-language pass, stages 1–5,
> **finished**), `HANDOFF-multi-user-build.md` (Supabase / Task A), `HANDOFF-spotset-publishing.md`
> (Play + Apple), `HANDOFF.md` (the queued-task overview).

---

## 0. Status — read this out

- **Nothing is built yet — this is the brief; the next session builds.** The app is at **v2.21.1** and the movement
  sheet (`src/components/MovementSheet.jsx`) is the place a figure will land — deliberately not
  stubbed, so nothing looks broken while this is pending.
- 🔴 **BUILD IT. Pierre cleared the way on 2026-08-22:** *"regarding start explicitly drawing, those
  are… don't worry about that. We are on the same page you and I… Let's go ahead with this."*
  **The next session starts the figures** — no further permission needed. His ideas will arrive as
  he has them; they refine the work, they do not gate it.
- **Route chosen: GENERATE**, with his caveat — *"we don't want stiffness."* That caveat is the
  entire technical problem (§3).
- **Line drawings are OUT.** *"The line draw is probably out. Those silhouettes are amazing."*
  The reference read (§2) already pointed the same way: solid silhouettes hold up at small size,
  outlines do not.
- **He supplied a prompt template** (§4, verbatim) as **a suggestion, not a spec** — his framing:
  *"that prompt is a suggestion I told you."* Use it as input alongside §1–§3.
- 🔴 **THE INJURY TEXT IS IN — RULING 2026-08-22, and my earlier caution is SUPERSEDED.** Pierre:
  *"I think you got freaked out by the medical term… you can check the potential clinical injury
  documented for those specific moves. Those are known moves… so we should build this library. Of
  course, later on I go through them."* **These are documented facts about well-known lifts, not
  invented diagnoses.** Draw them from established knowledge, keep them plain, and Elie/Pierre
  review the set afterwards. See §5 for the shape that keeps that review possible.
- ✅ **He endorsed the colour call** — the asset stays skin-agnostic (§6).
- **One open question left** (§7): all 340 get a wrong-figure pair, or only the movements where a
  fault is common. It is the cost driver — decide it early, but it does not block starting.
- **Model:** Opus 5 at **xhigh** for the biomechanics — which fault, which joint, which moment.
  See §9 for what that does and does not cover, and the honest answer on external services.

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

## 5. The clinical text — DECIDED 2026-08-22

**Pierre's ruling: include it.** *"You can check the potential clinical injury documented for those
specific moves. Those are known moves… we should build this library. Of course, later on I go
through them."*

He is right and the earlier caution was mis-aimed: the injury a rounded-back deadlift risks, or what
a knee-valgus squat does, is **documented, long-established, uncontroversial knowledge about
well-known lifts** — not a diagnosis this app is inventing about a person. Refusing to name it would
have made the figures decorative.

**What that means in practice, and these are the guardrails that keep it honest:**

- **Plain, established, movement-level.** "Rounding under load stresses the lumbar discs" — the
  known mechanism of a known error. Never a claim about a *client*, never a prescription, never a
  treatment.
- 🔴 **Every line is reviewable and versioned.** The text lives in a data file keyed by movement
  (like `exerciseNamesAr.js`), with a `reviewed` flag per entry. Pierre and Elie go through them
  afterwards — which is exactly what he said would happen — and a correction is a one-line edit.
  That workflow already exists and works: it is how the 340 Arabic names got reviewed.
- **Arabic from the start**, same as the names. A safety cue that exists only in English is a safety
  cue half the audience does not get.
- **The cue is short enough to read mid-set.** One sentence. If it needs a paragraph, the figure is
  not doing its job.
- **It is content, so it belongs to Elie in the end.** He is the PT; the app carries his voice. Ship
  it, flag it, and let him correct it — do not wait for a review cycle that has not been scheduled.

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

## 7. The open question

**Do all 340 movements get a wrong-figure pair, or only the ones where a specific fault is common?**
340×2 is a different project from 340×1 plus ~40 pairs, and it is the cost driver. Decide it early.
**Recommendation: pair the compounds and the movements the generator actually prescribes first** —
that is where a fault carries real injury risk — and single-figure the isolation work.

Secondary, decidable by whoever builds: one gender or both per movement, and whether the mark is
generated separately or reduced from the figure (the reference read says **reduced**).

## 8. What NOT to do

- ❌ Do not stub an empty figure box in `MovementSheet` "so it's ready". A placeholder that looks
  broken is worse than a sheet that is complete for what it knows.
- ❌ Do not ship a partial library — 40 movements with figures and 300 without reads as broken, not
  as progress. Ship a complete *category* (e.g. all Legs compounds) or nothing.
- ❌ Do not bake a palette colour into an asset.
- ❌ Do not write injury text about a PERSON, a prescription, or a treatment — movement-level
  mechanism only (§5).
- ❌ Do not start with the logo (B3) instead — it comes after the figures, so the mark is drawn into
  a system that exists.

---

## 9. Production — the honest answer, and the first step

**Pierre asked (2026-08-22):** *"You're going to use Opus 5 extra high, correct? If you have a better
suggestion, let me know. And if you want me to connect to a service that you think will give us the
optimal output, I'm open to suggestions."*

### What Opus 5 at xhigh is right for

**The biomechanics and the blueprint** — which fault is the common one for this movement, which joint
takes the stress, which moment in the lift to draw, which muscles to mark, what the cue says, and the
Arabic for all of it. That is analysis and judgement, it is where errors would be invisible and
expensive, and xhigh is the correct setting. **Confirmed: yes, Opus 5 at xhigh.**

### What it is NOT

🔴 **No Anthropic model draws pictures.** "Generate the figures" therefore has to mean one of three
things, and they are not equally good:

| Route | What it really gives | The catch |
|---|---|---|
| **A. Parametric SVG, authored in code** | One skeleton system — joints, curved spline limbs, a 7.5-head canon — and all 340 poses expressed as joint angles against it | The stiffness problem is *mine to beat*, in the curve maths. But it is beatable, and it is the only route where **consistency is guaranteed by construction** |
| **B. An external image generator** (would need connecting) | Photoreal-adjacent silhouettes, fast per image | 680 separate generations = 680 slightly different canons, heads, weights and line weights. **Consistency is the single hardest constraint in this library** and this route fights it. Plus raster in a single-file bundle, and colour baked into the asset |
| **C. Licensed stock, restyled** | Immediately coherent (it is what the reference sheets are) | Someone else chose the poses; no wrong-form pair; no fault markers; licensing per movement |

### The recommendation

**Route A, and prove it on six movements before scaling.** Reasons, in order:

1. **One canon by construction.** Same skeleton for all 340 — the thing that makes a library look
   like a library — instead of 680 attempts at the same style.
2. **The pair comes free.** The wrong figure is the same skeleton with two joint angles changed,
   which is *exactly* the brief's rule ("the wrong figure reuses the same bone lengths"). No other
   route gives that for nothing.
3. **The 16px mark comes free** — the same pose, fewer parts.
4. **Skin-agnostic and tiny.** SVG paths inherit `currentColor`, the fault zone takes `--anatomy`,
   and 340 poses cost kilobytes rather than megabytes in a single-file bundle already at 614 KB.
5. **Correctable.** A wrong elbow is a number to change, not a re-generation lottery.

### Where a service WOULD genuinely help — the honest version

Not for drawing. For **reference**: if the curves come out stiff, the fix is checking each pose
against real photographs of the lift, and a stock-photo or video-frame source makes that faster.
That is a nice-to-have, not a blocker, and it costs nothing to start without it. **Don't connect
anything yet.** If route A stalls on stiffness after the six-movement proof, that is the moment to
revisit — and the ask would then be a *vector* asset source, not an image generator.

### Step 1 for the next session

**Six movements, one per bucket** (a squat, a hinge, a horizontal press, a vertical pull, a
single-joint arm movement, a machine movement). For each: the blueprint at xhigh (fault, joint,
moment, muscles, cue, EN+AR) and both figures rendered in the movement sheet, on both skins, at full
size and at 16px. **Then judge.** If those six do not look like they belong to one library and to
this app, nothing is scaled — the route changes instead.
