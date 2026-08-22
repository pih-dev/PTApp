# SpotSet — The Exercise Figures (B2) HANDOFF

**Created:** 2026-08-22, Beirut · **Last updated:** 2026-08-22, before a `/clear`.
**Owner thread:** the figures, and only the figures.
**To resume:** Pierre types `figures`. **Read §0 back to him and stop**, then start §9's step 1.

> 🔴 **OWNERSHIP HANDOVER 2026-08-22 (Pierre's instruction): the CCHealth session (Fable 5) now
> RUNS the figures thread** — the six queued items and the spatial rounds. The PTApp session keeps
> the **UI redesign and the logo/name (B3) only**. PTApp session: do NOT touch `src/figures/*`,
> `src/components/Figure.jsx`, `src/components/MovementSheet.jsx` or `src/figureText.js` while
> this stands — pull before editing anything, both sessions commit+push at every milestone.
> **Known collision point: the skins/token files** — figures item 4 adds an equipment token there
> while the redesign edits the same files. Whoever edits skins pulls first.
> 🔴 **Learned the hard way (v2.24.1 deploy): while two sessions share this repo, NEVER `git add
> -A` / `-.` (it commits the other session's WIP) and NEVER `git checkout gh-pages` in the main
> tree (it aborts or strands files on master). Stage explicit paths only; deploy from a gh-pages
> WORKTREE. And a node_modules junction inside a worktree must be `rmdir`-ed (link only) BEFORE
> `git worktree remove --force`, which follows it and deletes the real packages.**

🔴 **STANDING INSTRUCTION FOR THIS SUBJECT: keep this file current AS YOU GO.** Update §0 and commit
at each milestone. A restart could end the session at any moment.

> 📌 Other threads that are NOT this one: `HANDOFF-design.md` (the visual-language pass, stages 1–5,
> **finished**), `HANDOFF-multi-user-build.md` (Supabase / Task A), `HANDOFF-spotset-publishing.md`
> (Play + Apple), `HANDOFF.md` (the queued-task overview).

---

## 0. Status — read this out

- 🟢 **SHIPPED AND LIVE — v2.23.2. All 340 movements have figures.** Composed from 44 patterns; the
  pattern owns the pose and the fault, the movement contributes its muscles (bank) and its equipment
  (its name). The bench press turns under a finger; every pair double-taps to zoom. The header logo
  opens the movement library.
- 🔴 **THE NEXT ROUND IS SPECIFIED AND NOT STARTED — READ
  `docs/2026-08-22-figures-next-round-brief.md` FIRST.** Six figure items and two others, captured
  in Pierre's own words on 2026-08-22 before he cleared. In his priority order as he said them:
  1. ✅ **DONE 2026-08-22 (CCHealth session)** — zoom now anchors on the fault joint
     (`zoomAnchor()` in `render.js`, shared origin for both halves; falls back to the posture
     line's midpoint). Sanity + build clean, all 340 anchors finite.
  2. ✅ **DONE 2026-08-22 (CCHealth session)** — direct manipulation per his ruling: pinch zooms
     continuously (1–3×), one-finger drag always turns (vertical pans while zoomed; pan-only for
     non-rotatable pairs), double-tap kept as the mouse/accessibility path. `touch-action: none`
     on the figure block — it is its own non-scrolling surface; the sheet scrolls from the text
     below. Also fixed from mobile-UX review: cancelled pointers no longer count as taps, and pan
     is clamped so the art can never leave the box. **Needs his thumb on a real phone.**
  3. **The equipment should ROTATE with the figure, not swap** at the halfway point. *(Re-confirmed
     live by Pierre on v2.24 day — still round-4 territory, same as free 360° rotation.)*
  3b. 🔴 **COLOUR RULING (Pierre, live, 2026-08-22 evening): GREEN = correct posture line (--ok),
     BLUE = equipment only, ORANGE = stress/fault.** Shipped in v2.24. Orange on the fault half
     means "wrong AND loads the joint"; different muscles alone mean "different movement, not
     necessarily dangerous". Keep the three roles distinct in every future change.
  4. ✅ **DONE 2026-08-22 (CCHealth session)** — `--equipment` token added to both skins
     (midnight `#6E9BD8`, steel `#33598F`), equipment paints from it at 0.6 opacity, token
     added to `sanity-skins.mjs`. Marks (list-size) stay currentColor silhouettes.
  5. 🟡 **MECHANISM DONE 2026-08-22 (CCHealth session), CONTENT PARTIAL** — an archetype opts in
     with `faultMuscles: {primary, secondary}` (poses.js `build()`); the sanity gate validates the
     anchors and that the halves actually differ. **8 of 44 declared** (hinge, overhead-press,
     triceps-pushdown, triceps-overhead, push-up, bench-press, hip-extension, leg-raise), each
     justified against its fault pose's own comment. **The other 36 are a judging job for Pierre**
     — declaring a wrong muscle is worse than sharing the bank's, so they stayed opt-out. Captions
     unchanged (figureText is Elie's review pipeline).
  6. **Some movements need a SEQUENCE of positions, not a pair** — his example is the military press:
     start, lift, flip the bar, before the drive, lockout. Three open questions in the brief.
- 🔴 **TWO NON-FIGURE ITEMS QUEUED IN THE SAME BREATH**, both in the brief and in CLAUDE.md's
  KNOWN ISSUES: a **design refinement round at xhigh** ("we changed the overall design but it's not
  where I want it to be — it can be much, much better"), and **the logo** — the name SpotSet stays,
  the mark is open, and his idea is to draw it FROM the figure library: two silhouettes carrying the
  correct/fault thesis. That is B3, and the plan always said it comes after the figures so the mark
  is drawn into a system that exists. It exists now.
- **He is switching to Opus 5 at xhigh effort for that work.** Session dump for this whole thread:
  `_archive/PTApp/claude-sessions/2026-08-22-figures-b2-FULL-SESSION.txt`.
- 🔴 **MODEL POLICY (Pierre's ruling, 2026-08-22 — best result FIRST, quota second, enforce):**
  - **The three flagship tasks — the UI redesign, the logo/name (B3), and the figures thread
    (including spatial/3D/rotate/zoom) — run on Fable 5 at xhigh.** Pierre explicitly accepts
    exceeding the 50% weekly Fable allowance; do not economise him back to Opus.
  - **Gate at session start AND before any of those tasks:** run `/model`; if Fable 5 is not
    active, STOP and tell Pierre to switch (`/model` → Fable → press `s`), then continue.
    True 3D already failed once on a lesser model (world-fixed axis broke supine poses).
  - **Session boundaries, his procedure (high-stakes rule):** no `/wrap` — the session does a
    detailed RAW DUMP first, then updates this handoff, then tells him and waits; HE runs the
    clear/continue and switches models between them. The session's job is to SAY when the next
    round needs Fable before he clears.
  - **Ultracode/workflows:** reserve for judged fan-out sweeps — e.g. reviewing all 44 archetype
    poses in parallel, or the anatomy audit of every fault pose. Pierre triggers it by putting
    "ultracode" in the prompt. Never for sequential design/build rounds.
  - Mechanical subtasks (renames, reruns, JSON edits) → Sonnet/Haiku subagents, per global rule.
  - Full audit behind this: `CCHealth/docs/sessions/2026-08-22-ptapp-figures-audit.md`.
- **Weakest three patterns, unchanged:** `leg-raise`, `wrist-curl`, `rotation`.
  `node scripts/figures-contact.mjs` builds the judging sheet.
- 🟡 **ROM check added to `sanity-figures.mjs` (§5c), WARN-ONLY — 24 warnings, most look like
  sign-convention artifacts** (elbow flexion sign flips when the arm loads overhead/prone: push-up,
  plank, triceps-overhead, knee-tuck). Before it may FAIL builds it must compute joint angles from
  the skeleton geometry, not the raw pose numbers. Until then the warning list is a judging aid.

- 🔴 **ROUND 3 SKIPPED BY PIERRE'S RULING (08-22 evening): "let's go straight to round four."**
  The round-3 audit found only Push-Up qualified for a second static camera anyway; its authored
  poses are parked at `_archive/PTApp/figures/2026-08-22-pushup-above-poses-round3-parked.diff`.
- 🟢 **ROUND 4 PROTOTYPE APPROVED BY PIERRE ("you sorted them out, all of them") — through v4
  (9ee48be).** What works: turntable rotation about the world vertical (NOT the trunk line — that
  hoisted a hinged deadlift's legs), body-fixed lateral depth, sphere bells that survive every
  angle, near-bell-over-hand depth split, bench swivels WITH the lifter, depth-sorted ribbons,
  girth blending, both-sides muscle wash past a quarter turn. Still prototype-only — no screen
  imports spin.js.
- 🟡 **ROUND 4 OPEN ITEMS:** (1) at mirror angles the far arm ducks behind the torso and the
  enclosed background reads as a dark ball — honest occlusion, needs a visual answer (fill the
  arm-torso gap? dim far limbs?); (2) wire the drag to θ in Figure.jsx (replaces the two-camera
  tween; ROTATES and BENCH/PUSHUP_ABOVE then delete themselves); (3) extend spinEquip past
  barbell+bench (dumbbell, cable, machine); (4) front-authored poses (squat family) carry a baked
  `fs` and need re-authoring as side+depth before they can spin; (5) sanity gate: pair rule
  becomes "same 3D bone lengths".
- 🔴 **THE DESTINATION, IN PIERRE'S WORDS (08-22): "eventually 3D models that can be rotated and
  zoomed in/out, after a few rounds."** That is an instruction about ORDER — each round ships
  something usable on its own. The staged path and where it stands live in
  `docs/2026-08-22-figures-3d-options.md`; read it before picking up the next round.
- 🟢 **ROUND 2 SHIPPED — v2.23.2: zoom on every pair, and the logo opens the library.** Double-tap
  scales both halves to 2.2× with drag-to-pan; works on all 340. **Double-tap, not pinch** — pinch
  needs `touch-action: none` and the bottom sheet has to keep its vertical scroll. **One gesture,
  two jobs:** zoomed out it turns, zoomed in it pans.
- 🟢 **ROUND 1 SHIPPED — v2.23.1.** Flat Barbell Press has a DRAG TO TURN bar; both
  halves of the pair turn together from profile to the view from above, and the elbows become
  visible. **It is a TWEEN between two authored cameras, not a 3D rig** — true 3D was built and
  reverted (a world-fixed lateral axis breaks every supine pose; it needs a body-fixed frame per
  segment, i.e. a rewrite of all 44 patterns' numbers). Every tween frame is bounded by two
  hand-judged shapes, so it cannot turn into a blob.
- 🔴 **NEXT ROTATION CANDIDATES, in order:** the **squat** (knee valgus is frontal and the pair is
  already drawn front-on, so it gains the profile), **rows** (scapular position), the **rotation**
  patterns. Each is two more authored poses in `ROTATES` (`figures/poses.js`) — and a pattern whose
  fault is fully visible from one camera must NOT get a drag handle that does nothing.
- **Superseded — the original ask, kept for the wording:**
  His words: *"I need different angles where possible. Either that or 3D. They drag them… So there
  will be two pictures. For example, one is the posture — both regarding the correct and the most
  common mistake. Draggable by finger for 3D, for people to see."*
  **The shape of the ask, as I read it:** the PAIR STAYS (correct + most common mistake). What
  changes is that each half becomes rotatable rather than a fixed camera — drag with a finger and
  the figure turns, so a fault that is invisible from one side (elbow flare, knee valgus) can be
  seen without a second drawing. **Confirm that reading before building.** The full options write-up
  is `docs/2026-08-22-figures-3d-options.md` — read it before choosing.
- **Why this is the right next move and not a nice-to-have:** the bench press already needed a third
  camera because flare is out-of-plane (§11), and the same problem is queued behind at least the
  squat, the row and every rotation pattern. A rotatable figure retires that whole class of
  workaround instead of adding a fourth and fifth static camera per movement.

- 🟢 **ALL 340 MOVEMENTS HAVE FIGURES — v2.23.0.** Composed from **44 patterns**: the pattern owns
  the pose and the fault, the movement contributes its muscles (from the bank) and its equipment
  (from its name). 100% bank coverage is a build gate. Cost 37 KB for the whole library.
  **Text is keyed by pattern too — Elie reviews 44, not 340**, and every entry prints "Not reviewed"
  until he has.
- 🔴 **WEAKEST THREE PATTERNS, judged on the contact sheet:** `leg-raise`, `wrist-curl`, `rotation`.
  Not broken, just weaker than the other 41 — the first place to spend time.
  `node scripts/figures-contact.mjs` builds that sheet.
- 🟢 **v2.22.0, the pilot seven (superseded by the above).** Back Squat · Deadlift · Chest Press Machine ·
  Pull-Up · Barbell Curl · Leg Press. Each has the pair (correct + one fault, ringed on the joint
  that takes it) and three sentences — the fault, the risk, the cue — in English and Arabic.
  Live on gh-pages. The other 334 movements are untouched: no figure, no placeholder.
- **Route A won and is proven.** A figure is a list of joint ANGLES against one skeleton
  (`src/figures/`), so the canon and the pair rule hold by construction rather than by discipline.
  **Cost: ~32 KB for the engine, six pairs and all the bilingual text** — the size argument for
  route A turned out to be even stronger than the handoff estimated.
- 🔴 **THE NEXT MOVE IS PIERRE'S JUDGEMENT, NOT MORE DRAWING.** §9 step 1 said: build six, then
  judge. They are built. **Nothing scales until he has looked.** `node scripts/figures-preview.mjs`
  → `tmp/figures-preview.html` shows all six pairs on both skins at full size and at 16/24/48px.
- **The flat barbell bench press is DEFERRED, deliberately, and §11 records why** — elbow flare is
  out-of-plane for a profile camera. It is the one open design question the pilot produced.
- **The 16px mark renders but nothing uses it yet.** It goes in with the Schedule layout pass, where
  list rows are already being touched (that pass also owns review finding P3).
- **The clinical text is IN and every entry is `reviewed: false`.** `src/figureText.js`, keyed by
  movement. Elie and Pierre go through them; a correction is a one-line edit. §5 is unchanged.
- 🔴 **OPEN DECISION #2 — THE LEG PRESS FAULT.** A biomechanics review argues the drawn fault
  (snapping into lockout) is the wrong one: the more common and more injurious error is going too
  deep, the pelvis peeling off the seat pad and the lumbar spine flexing under the sled. It is one
  pose to change. **Pierre's and Elie's call**, not mine.
- 🔴 **THE CLAIMS RULE IS NOW LAW AND A BUILD GATE (v2.22.2).** Figure text says what the position
  DOES, never what it CAUSES — no named pathology, no evidence-grade adverb, and the Arabic may
  never be stronger than the English. The first version named a diagnosis per movement and the Leg
  Press one was factually backwards. `sanity-figures.mjs` fails the build on either.
- **The traps this pilot produced are written up** — `docs/traps.md` → *Figures — the four geometric
  traps*, and indexed in CLAUDE.md's TRAPS block. Read them before drawing movement seven.

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

---

## 11. The bench press, and the one open design question

**The problem, stated exactly.** The flat barbell bench press's defining fault is elbow FLARE.
Flare is abduction: it happens in the frontal plane, which a profile camera is looking down. Drawn
from the side, a 45° tuck and a 90° flare project to nearly the same picture — so the pair would
teach nothing, which is the only thing a pair exists to do.

**Both alternatives were built and both were rejected:**

| Attempt | Why it failed |
|---|---|
| **Side view, arm angles adjusted** | The fault is invisible. Worse, reaching a bar that sits *above* the shoulder at the bottom of the press is geometrically impossible in-plane with a 2.6-head arm — the elbow has to leave the page, which is the same problem wearing a different hat |
| **View from above** (a front-view skeleton rotated a quarter turn — the rig handles it) | The flare reads perfectly. But the legs run away from the camera and need heavy foreshortening, the bench becomes a slab across the middle of the cell, and the figure stops belonging to a set of five upright ones. Coherence is the library's hardest constraint and this spends it |

**The honest fix, and why it is a DECISION and not a task:** give the pose per-bone out-of-plane
foreshortening — the humerus at 45° of abduction projects to ~0.75 of its length, at 90° to ~0.3.
That draws both figures correctly in profile. **But it means the two halves of one pair have
different `fs`, which is exactly what §7.13 forbids and what `sanity-figures.mjs` currently fails
the build on.** The rule as written protects against a bone-length change smuggled in as art
direction; this would be a bone-length change smuggled in as honest perspective. The two are
indistinguishable to the sanity check and, more importantly, possibly indistinguishable to a reader.

**Three ways out, in the order I would try them:**
1. **Allow it, narrowly.** Permit differing `fs` only when the pose declares `outOfPlane: true` with
   the abduction angle it is modelling, and have the sanity script assert the 3D length instead of
   the 2D one. Honest, checkable, ~30 lines. The risk is that "the fault changed the projection" is
   a door that will be pushed open for faults that did not.
2. **Draw the bench press from above and accept it as its own family.** Every supine press would use
   the top view — bench, incline, dumbbell, machine — so it reads as a deliberate convention rather
   than one odd figure. Costs the most drawing.
3. **Leave it deferred.** `Chest Press Machine` covers the bucket; the barbell bench press keeps a
   sheet with no figure, exactly like the other 334. Costs nothing and loses the gym's most-used
   movement from the library.

**No decision is needed to keep going** — every other pressing movement with a sagittal fault can be
drawn today. This blocks the bench press and nothing else.
