# Codex brief — a better exercise-figure library for SpotSet (2026-09-08)

**Why this exists.** Pierre, 2026-09-08: *"If you are not capable of giving me an acceptable
result with these movements… give me a prompt to give to Codex so that I can get a good library,
visually and anatomically correct — visually better than what you've done, because you've used
vector graphics. There are probably external tools that can be connected to generate these images
without breaking the bank."*

The current library (`src/figures/`) is a parametric SVG rig: 44 pose archetypes authored as joint
angles, 340 movements classified onto them, a correct/fault pair per movement, muscle washes, a
fault marker, a turntable rotation. It is anatomically disciplined but it looks like a symbol, not
a body. Elie's reference is MyFitCoach: a shaded 3D body with the working muscles lit.

**How to use this file.** Open the Codex app in `C:\projects\PTApp` and paste everything below the
line as the first message. It is self-contained. Do not paraphrase it — the constraints are the
point.

---

## PASTE FROM HERE

You are working in the repository `PTApp` (SpotSet), a mobile-first React + Vite app for a personal
trainer, deployed as a PWA on GitHub Pages and wrapped with Capacitor for Google Play and the App
Store. Your task is to **design, prototype, cost, and then build a replacement exercise-figure
library** — one that is anatomically correct and visually far better than the current vector
figures — using whatever image-generation or 3D tooling gives the best result per dollar. I
(Pierre) have an OpenAI subscription; you may use OpenAI image generation, open-source 3D assets,
Blender, three.js, or any combination. Research the options first; do not assume.

### 1. What exists today — read these before anything else

- `src/figures/archetypes.js` — 44 movement PATTERNS as joint ANGLES (degrees, cumulative; spine
  from straight up, limbs from straight down, + toward the direction the figure faces). Each has a
  `correct` and a `fault` pose, a `guide` (the posture line), a `faultJoint` (which joint takes the
  load, with an `offset` onto the tissue), `faultMuscles`, and an equipment `anchor`.
- `src/figures/canon.js` — the ONE set of bone lengths (7.5-head canon), girths, the forward-
  kinematics function, `MUSCLE_ANCHORS` / `MUSCLE_FACE`.
- `src/figures/classify.js` — maps all 340 movements to the 44 patterns (ordered regexes).
- `src/figures/poses.js` — assembles a movement's figure: pattern pose + muscles from the exercise
  bank + equipment inferred from the movement NAME; `ROTATES`/`SPINS` say which patterns turn.
- `src/figures/spin.js`, `render.js`, `svg.js` — the 3D turntable, the ribbon renderer, the SVG.
- `src/exerciseBank.js` — the 340 movements: name, primary muscle, muscle list, Arabic names in
  `src/exerciseNamesAr.js`.
- `src/figureText.js` — the per-pattern teaching text (what the position DOES, never what it
  causes; no named pathology). Keep it; it is reviewed by the trainer.
- `src/components/Figure.jsx`, `src/components/MovementSheet.jsx` — where the pair renders: drag
  turns both halves together, double-tap zooms about the fault joint, the sheet must NOT scroll.
- `src/skins.js` + the token block in `src/styles.css` — 21 skins; figures paint ONLY from the
  tokens `--chalk` (body), `--muscle` / `--muscle-2` (primary / supporting muscles), `--anatomy`
  (the fault marker and nothing else), `--ok` / `--warn` (posture line held / lost),
  `--equipment`. Hard-coded colours fail the build (`scripts/sanity/sanity-skins.mjs`).
- `docs/2026-08-22-figures-3d-options.md` — the routes already weighed; the stated destination
  is "3D that rotates and zooms, a round at a time".
- `scripts/sanity/sanity-figures.mjs`, `sanity-movement-library.mjs` — the gates the current
  library passes; whatever replaces it needs equivalent gates.

Run `npm run dev`, open the Library → any movement → Form to see the current output. Run
`node tmp/spin-audit.mjs` (needs `sharp`, already installed) to rasterise every turning pattern.

### 2. What the trainer needs from a figure (non-negotiable)

1. **A pair per movement**: the correct position beside the most common fault, same body, same
   bone lengths, same camera. The difference between the two IS the lesson.
2. **The fault is marked on the tissue that takes the load** (a lumbar disc at the BACK of the
   trunk, a knee cave on the medial knee), and the mark stays on that tissue from every angle.
3. **The working muscles are visibly lit** — primary in one hue, supporting in another — on the
   body section they occupy, and a muscle on the back of the body must not light the front when
   the body turns to face the viewer.
4. **The viewer can turn the figure with a finger** (yaw at least 0–180°, ideally full 360° plus a
   tilt) and zoom on the fault. Both halves of the pair turn together.
5. **Equipment is drawn**: barbell, dumbbell, kettlebell, cable, machine, bench, ball, band — read
   from the movement name (see `poses.js` `gearFor`).
6. **Anatomical plausibility is a build gate, not a review note**: joint ranges within human
   limits, feet on the floor for standing patterns, a plank's shoulders above its heels, a supine
   body one torso-depth off the floor, nothing outside the frame.
7. **It fits the movement card without scrolling** on an iPhone, and it works OFFLINE with no
   runtime fetch: every asset ships inside the app bundle.

### 3. Constraints that decide the architecture

- **Bundle size.** Today the whole app is a few MB. A budget of **≤ 25 MB added** for the entire
  library is acceptable for the native builds; the PWA can lazy-load per movement from the same
  origin (GitHub Pages) but must still cache for offline. State the size of what you propose
  before generating at scale.
- **Consistency across 340 × 2 (× N angles).** One body, one style, one lighting, one camera
  height, one scale. A library where the deadlift is a different person than the curl is a
  failure. This is the reason pure per-image generation is risky; say how you defeat it.
- **Cost.** Quote the API cost of every generation route from CURRENT pricing before running it,
  and give me the number for the full library. Prototype on 3 movements first (Deadlift, Hammer
  Curl, Flat Barbell Press — a hinge, a curl, a supine press). I approve scale-up after seeing
  the prototype and the number.
- **Licensing.** Any 3D base body, rig, or texture must be usable in a commercial app without
  attribution in the UI (CC0 or an equivalent licence). Record the licence and source URL of every
  asset in `docs/figure-assets-licences.md`.
- **Skins.** The body must recolour from the tokens above. For raster routes that means a
  neutral (grey-white) body with muscle and fault regions delivered as SEPARATE masks/layers that
  the app tints — not baked colours. For 3D routes, material colours come from the tokens.
- **Reproducibility.** Every generated asset comes from a committed script (`scripts/figures-gen/`)
  that can rebuild it from the pose data, so a corrected pose regenerates its images; no hand-
  edited images.
- **Arabic / RTL** does not affect the figures, but nothing in a figure may be text.
- **No emoji, no red except the fault marker's token, no colour literals.**

### 4. Routes to evaluate (research current tooling; do not trust your training data on prices,
model names, or library APIs — check the docs)

**A. Rigged 3D body in the app (three.js / react-three-fiber).**
A CC0 humanoid mesh with an anatomical muscle-region UV map, driven by OUR existing joint angles
(the archetypes are already a pose spec in degrees). Real rotation and zoom, one asset for all 340
movements, muscles lit by material groups, the fault marker as a decal on the mesh. Evaluate:
mesh + rig sources (MakeHuman/MPFB exports, Quaternius, Mixamo licence terms, Ready Player Me
terms, any CC0 anatomical muscle body), Draco/meshopt compression, size on disk, frame rate on a
mid-range Android phone, and how the equipment gets modelled. This is the route the project's own
notes call the destination.

**B. Pre-rendered turntable frames from Blender (headless), per movement.**
Same rigged body posed from our angles by a Blender Python script, rendered to N frames of yaw
(e.g. 24) as WebP/AVIF sprite sheets, with muscle and fault masks as separate layers. Drag scrubs
frames. Evaluate: total size for 340 × 2 × N, render time, and whether the masks tint cleanly.

**C. AI image generation (OpenAI image model or similar) with a locked reference character.**
Generate the pair per movement from a reference sheet of ONE character, using the current SVG
figure as the pose/composition control (image-to-image or edit endpoints) so the anatomy comes
from our angles and the rendering from the model. Evaluate: consistency across movements, ability
to output masks for muscles/fault, cost at 1360+ images, and whether rotation is achievable at
all (multi-angle consistency is the known weakness — be honest if it is not).

**D. Hybrid.** A or B for the body and rotation; C only for a one-off polish pass or for
equipment it is cheaper to generate. Or: keep the current SVG rig as the pose SOURCE and use it
purely as a control input for B or C.

For each route give: what it looks like (produce the 3 prototype movements), what it costs to
build and to run, the shipped size, the offline story, the licensing story, and the failure mode.
Then recommend one and say why the others lose. Then stop and wait for my go.

### 5. Deliverables, in order

1. `docs/figures-next/00-research.md` — routes evaluated with sources, prices, sizes, and the
   three prototype images/scenes per route. Include a table I can read on a phone.
2. The prototype for the recommended route wired into `MovementSheet.jsx` behind a feature flag
   (`figuresV3`) for exactly the 3 movements, so I can compare old vs new on my phone via
   `npm run dev`. Do not remove or alter `src/figures/` — the old rig stays as fallback.
3. After my approval: generation scripts, gates, licence file, the full library, and the size and
   cost actually incurred. Commit in small steps with messages that say WHY. Never `git add -A`
   (this tree is shared by another session); stage explicit paths.
4. A review sheet the trainer can judge: one HTML page with all 44 patterns, pair side by side,
   at three angles, plus a "reviewed" checkbox per pattern that persists to a JSON file.

### 6. Things that will get the work rejected

- A figure whose two halves have different body proportions.
- A muscle lit on the wrong side of a limb, or a fault marker floating off the body.
- Any colour that is not a token; any asset fetched at runtime; any asset with an unknown
  licence; any generated image kept without the script that made it.
- A total size or a cost I did not approve first.
- A body with a face, hair, clothing detail, or gender cues that would distract from the joint —
  the reference app uses a neutral, smooth, sexless anatomical body. Match that.

Start with §1, then §4's research. Ask me only the questions whose answers change the
architecture; decide everything else yourself and tell me what you decided.

## PASTE ENDS HERE
