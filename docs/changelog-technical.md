# PTApp Changelog

Version history with context, decisions, and the reasoning behind each change.

---

## v2.25.1 - brighter muscle red and equipment blue (2026-08-22)

Figures-session patch from Pierre's live phone review (df3a10e): `--muscle`
midnight #F03A68 / steel #C41A4F, primary wash opacity 0.62→0.78, equipment
opacity 0.85→0.95 (svg.js). Colour values only; deployed same hour.

---

## v2.25 - design refinement round + the mark (B3) (2026-08-22)

The two non-figure items queued in the 2026-08-22 brief, run at xhigh on Fable 5.

**The mark.** `scripts/logo-candidates.mjs` renders real library poses
(`figureFor` → `figureSvg(detail:'mark')`), tight-crops them, and can `--freeze`
one into `src/spotsetMark.js` as a static string — the logo must not move when a
pose is tuned, so the app never renders it live. `SpotSetMark` (Icons.jsx) wraps
it; App header + TokenSetup use it. Candidates sheet: tmp/logo-candidates.html
(+ published artifact for Pierre's pick). +9 KB bundle.

**Fresh-eyes structure review** (the stripped-formatting rule from KNOWN
ISSUES, first run): findings + triage in
docs/design/2026-08-22-fresh-eyes-structure-review.md. Shipped from it:
upcoming-above-renewals on Home (#1), tappable week columns deep-linking to a
Schedule day (#9, `initialDate` prop + App-held `scheduleDate` cleared on nav),
Repeat toggle moved beside the config it unlocks (#5), General reordered with
the dev to-do last (#12). Parked for Pierre: money tracking, Sessions-tab
rethink, package vocabulary, editors-off-the-rows, confirm loop, eval-section
order.

**Coherence sweep (P3 scope B included).** New shared `SessionCard` renders the
Dashboard-expanded and Schedule rows (pure leaf, callbacks up, type-change
preserves focus tags); `Bar`/`Plates` extracted to their own files;
`isSessionNow` moved to utils so "now" is one rule on both tabs — Schedule rows
gain the live accent bar. Schedule/Clients/Sessions heads → `Bar`; General →
`.subbar` + tokenised `.notice` classes. Week strip restyled: boxes out, bar
shafts under transparent columns, selection = raised fill + chalk underline.
Every interface emoji replaced by drawn marks (OkIcon added; type-dot swatches
keep the picker's per-type colour legend). Dead CSS deleted: `.section-title`,
`.section-header`, `.success-icon`, `.empty-icon`, `.card-now`, and the
orphaned theme-era declarations that had sat unparsed since v2.17.

**Deployed with** the figures thread's implicit-equipment commit (0758f9f):
`poses.js` GEAR rules give bars to movements whose NAME doesn't carry the
equipment (equipment-less figures 145 → 107, the rest genuinely bodyweight),
and midnight `--equipment` moved to the azure Pierre matched from his
reference photo.

---

## v2.24.1 - equipment blue saturated (2026-08-22)

`--equipment` #6E9BD8→#4D8DE8 (midnight), #33598F→#2D66C4 (steel), opacity
0.6→0.85 in svg.js — the translucent steel blue read as "grayed out" beside the
vivid green/orange on Pierre's phone. (Backfilled entry: shipped from the
figures session without a changelog line.)

---

## v2.24 - direct gestures, colour roles, fault muscles (2026-08-22)

Figures brief items 1, 2, 3b, 4, 5: pinch zooms 1–3× continuously and drag
always turns (`touch-action: none` on the figure block — Pierre ruled the sheet
need not scroll from the art); zoom anchors on the fault joint (`zoomAnchor()`,
shared by both halves); colour ruling green held / blue equipment / orange
stress; `--equipment` token added to both skins + sanity-skins; 8 of 44
archetypes declare `faultMuscles` (mechanism done, the other 36 are Pierre's
judging job). Detail: instructions-v2.24.md, HANDOFF-figures.md §0.
(Backfilled entry: shipped from the figures session without a changelog line.)

---

## v2.23.2 - zoom on every pair, logo to library (2026-08-22)

Round 2 of the staged path to Pierre's stated destination ("eventually 3D
models that can be rotated and zoomed in/out, after a few rounds"). The stages
are written down in docs/2026-08-22-figures-3d-options.md so the order survives
a /clear.

**ZOOM: double-tap, not pinch, and it is a touch-action constraint.** Pinch
needs `touch-action: none`, which would take vertical scroll away from a bottom
sheet that must scroll. Double-tap is detected from pointerup timing (300ms, no
travel) rather than `dblclick`, which no mobile browser fires reliably on a
plain div. Applied as a CSS transform on `.fig-art` inside an `overflow: hidden`
`.fig-view` — vector, so sharp at any scale, and the figure's geometry is
untouched, so the canon/posture line/fault marker cannot drift under zoom.

**ONE GESTURE, TWO JOBS, DECIDED BY STATE.** zoom === 1 -> a horizontal drag
turns (rotatable patterns only). zoom > 1 -> it pans. Never a modifier, which a
phone does not have.

**The logo is a button** (`.logo-btn`) opening MovementLibrary, hoisted into
App.jsx with its own state. General's entry is unchanged — a shortcut, not a
move.

---

## v2.23.1 - rotatable figures: a tween between two authored cameras (2026-08-22)

Pierre: "I need different angles where possible. Either that or 3D. They drag
them." Prototyped on ONE pattern, as docs/2026-08-22-figures-3d-options.md
recommended.

**TRUE 3D WAS TRIED FIRST AND REVERTED.** canon.js was refactored to carry a Z
per joint with a camera angle and a one-line projection; `view: 'side'|'front'`
mapped to azimuth 0/90 so no pose file needed rewriting. It failed on the
quarter-turned poses: with a WORLD-fixed lateral axis, a supine figure's
shoulders separate along its own length. A correct rig needs a BODY-FIXED frame
per segment, which is a rewrite of all 44 patterns' numbers. 298 of 340 figures
changed; reverted to a verified-identical baseline (hash per figure, kept in
tmp/figure-baseline.json during the work).

**WHAT SHIPPED INSTEAD: a tween between two authored cameras.** `pose.alt` is
the same movement from a second camera; `buildFigure(pose, mix)` lerps the two
skeletons and `figureSvg(pose, {mix})` passes it through. Every frame is bounded
by two shapes that were each judged by eye, so it cannot rotate into an
illegible blob - the exact risk the options doc flagged against 3D.

- Bone lengths vary across the tween. That is CORRECT: a bone turning toward the
  camera is drawn shorter, and both endpoints are its true length at that
  camera. The pair rule is unaffected - both halves tween the same two cameras.
- EQUIPMENT SWAPS AT 0.5 rather than tweening. A bench from the side and from
  above are not one shape with different numbers; interpolating produces a third
  object that exists in neither view.
- `ROTATES` in poses.js is the opt-in list, currently bench-press only. A
  rotatable pattern DROPS its static third figure - the same view is a drag
  away, and showing it twice is noise.

**THE GESTURE.** Pointer events (one path for finger/mouse/pen) with
setPointerCapture so it survives the finger leaving the small SVG box.
`touch-action: pan-y` in CSS claims the horizontal axis and leaves the sheet its
vertical scroll - NOT a non-passive preventDefault, which is what broke elastic
overscroll before. Travel is scaled to the element's own width, so half a width
is a full turn on any screen. `user-select: none`, because a horizontal drag
over text selects it.

---

## v2.23.0 - all 340 movements, composed from 44 patterns (2026-08-22)

Pierre after the pilot: "Very promising. Go ahead. Continue to do for all of
them." The answer was not 340 hand-authored poses - it was to stop treating a
movement as the unit of drawing.

**THE ARCHITECTURE.** A figure is composed from three sources, each owning what
it knows:
  - POSE + FAULT from one of 44 archetypes (src/figures/archetypes.js). The
    pattern owns the fault, because a rounded back is a rounded back on all
    sixteen deadlift variants.
  - MUSCLES from the bank, per movement, mapped onto the renderer's anchors.
    Collision rule kept from the blueprint review: quads/hamstrings share the
    hip-knee band, so only the primary survives (same for biceps/triceps and
    abs/erectors).
  - EQUIPMENT from the NAME - barbell, dumbbell, kettlebell, cable, band, TRX,
    ball, machine, landmine, sled, or none - drawn at the archetype's declared
    anchor and always as a function of the skeleton.

**src/figures/classify.js** is an ordered rule list plus an override table;
first match wins, so specific beats general ("Single Leg Romanian Deadlift"
before the deadlift rule, "external rotation" before the rotation rule - that
one bit, and the fix is a comment in the file). 100% coverage of the bank is a
BUILD GATE: an unclassified movement renders nothing and fails silently.

**src/figureText.js is keyed by PATTERN.** 44 entries, EN+AR, all
`reviewed: false`. That is the review economics: Elie reads 44, not 340. The
v2.22.2 claims rule is unchanged and still gated.

**Cost: 652 -> 690 KB for 340 movements.** The parametric-route argument got
stronger the further it scaled, exactly as the handoff predicted.

**Pose lessons from authoring 44 patterns at once:** the lying and kneeling
bases were the hard part - a supine/prone figure needs its centre line one
torso-depth off the floor and its shoulders HIGHER than its heels, or a plank
reads as a person lying down. The bases (STAND, STAND_FRONT, SUPINE, PRONE,
QUAD, SEATED, HINGED) are the reusable part; each archetype changes only what
its movement changes.

**Known weakest patterns**, from the contact sheet: leg-raise, wrist-curl,
rotation. Recorded in the instructions doc rather than left to be rediscovered.

**Tooling trap, twice in one session:** a python heredoc that writes `\b` into
a JS regex writes a BACKSPACE (0x08), not a word boundary. The regex then stops
matching and nothing errors. Both incidents are in traps.md.

---

## v2.22.2 - claims discipline, the review flag on screen, blueprint refinements (2026-08-22)

Three adversarial passes over v2.22.1, run as a workflow: six xhigh biomechanics
blueprints (one per movement), a skeptical sports-medicine reviewer briefed to
REFUTE, a native-Levantine Arabic reviewer, and a Fable 5 fresh-eyes design pass
on the review page with all formatting stripped.

**THE CLAIMS REWRITE (the important one).** v2.22 named a diagnosis per movement
and attached an evidence grade to each: eight different phrasings across seven
entries, none sourceable and several wrong. Leg Press had meniscal loading
BACKWARDS (it peaks in deep flexion under compression, not at terminal
extension); Chest Press and the bench extra both leaned on the subacromial
impingement model the field has largely abandoned; Back Squat imported an ACL
claim from the landing/cutting literature into a slow bilateral closed-chain
lift; Pull-Up named the labrum. The Arabic escalated the English by translating
"mechanism" as sabab (cause).

New rule, and it is now a BUILD GATE: say what the position DOES, not what it
causes. sanity-figures fails on an evidence-grade word (documented, classic,
long-established, well-established, proven, clinically) or a named pathology
(ACL, MCL, labrum, meniscus, impingement, herniat*, tendinopathy, ...) in any of
flaw / injury / cue / extra. FIGURE_TEXT_VERSION -> 2.

**THE REVIEW FLAG IS NOW RENDERED.** `reviewed: false` shipped on every entry
since v2.22 and no caller branched on it - a safeguard that existed only in a
comment. Figure.jsx prints it under the cue in both languages.

**BLUEPRINT REFINEMENTS.** Chest press guide chain now starts at the lumbar (an
elbow riding high is only readable against the torso it hangs from); pull-up
reads wrist -> elbow -> shoulder -> thorax (the hand is the fixed end); leg press
runs ankle -> knee -> pelvis -> lumbar -> thorax. Deadlift muscle split corrected:
glutes + hamstrings are the prime movers, erectors and lats support. Squat picks
up calves as secondary. Anchor-collision finding worth keeping: quads and
hamstrings share the hip->knee anchor, so the two hues would paint over each
other on one thigh - never list both.

**OPEN, NOT ACTIONED:** the review argues Leg Press should draw going too deep
(pelvis off the pad, lumbar flexion under the sled) rather than lockout. One
pose; it is Pierre's and Elie's call, and it is in HANDOFF-figures.

**THE REVIEW PAGE was rebuilt verdict-first** on the fresh-eyes finding: its job
is a same-or-different judgement and it was serving it as a serial scroll, where
figure four is compared against a memory of figure one. Contact sheet of all
seven on one ground leads, then mocked Movement-library rows at true mark size,
then a four-line checklist and where to send the verdict. Advocacy paragraphs
addressed to the person who is supposed to rule on the figures were cut.

---

## v2.22.1 - the posture line, the muscle code, and the bench press (2026-08-22)

Pierre on seeing the pilot six. Three asks, applied to every figure.

**The posture line.** brief 7.9 already specified it - "the spine is the hero
line, drawn in the accent when held and in the warn hue when lost" - and this
generalises it past the spine: `pose.guide.joints` names any 3-5 joint chain and
`mirror` draws it on both sides for a bilateral fault. Built from the SAME joints
as the silhouette, so it cannot disagree with the figure it annotates; the hue is
DERIVED from whether the pose marks a fault, so the two cannot be set
inconsistently. A --ground halo under it, because an accent stroke laid on a
silhouette of similar value disappears at list size.

**The muscle code.** `--muscle` / `--muscle-2`, figure-internal like --anatomy
and asserted per skin by sanity-skins (TOKENS is now 20). `pose.muscles` takes
`{ primary, secondary }`; an array still means primary-only. MUSCLE_ANCHORS now
returns a BAND along a bone rather than a point, and takes a side letter, because
`MUSCLE_SIDES('front')` paints limb muscles on both sides.

**The bench press: `extra`.** A movement may declare a third figure with its own
pose, caption key and fault marker. It exists for faults outside the pair's
plane, and sanity-figures fails the build on an extra that marks nothing - it is
a second camera on a second fault, not a decorative angle.
The rejected alternative is the important part: faking flare in profile by
foreshortening the humerus differently between the two figures would be a
bone-length change disguised as perspective. It breaks 7.13 and the gate already
rejects it.

**Two silent failures, both now in traps.md:**
1. `<g>` is not a legal clipPath child - the clip resolves to EMPTY and every
   clipped layer vanishes, looking exactly like "not implemented yet".
2. In a quarter-turned front view the mirror is (180 - a), not (-a): reflection
   is across the body's long axis, and negation maps 180 to 180, so both arms
   landed on the same side of the body.

Bundle 646 -> 649 KB. DATA_VERSION unchanged at 6.

---

## v2.22.0 — the exercise figures, route A proven on six movements (2026-08-22)

**B2 step 1** of `HANDOFF-figures.md`: one movement per bucket, both figures, both
skins, judged at full size and at 16px before anything scales.

**Route A chosen and built — parametric SVG authored in code.** `src/figures/`:
`canon.js` owns the 7.5-head canon and the ONLY forward-kinematics function;
`render.js` sweeps variable-width ribbons along centripetal Catmull-Rom splines
through each joint chain (bones subdivided at their midpoint so the curvature
concentrates at the joint instead of bowing the whole limb into a noodle);
`svg.js` is the single serialiser, shared by the app and by the judging harness
so we can never review a drawing we do not ship; `poses.js` holds the six pairs.

🔴 **A pose can supply ANGLES ONLY.** That is what enforces brief §7.13's rule —
the wrong figure reuses the same bone lengths — by construction rather than by
discipline at 340 future call sites. `fs` (projection scale) is the one escape
hatch and `sanity-figures.mjs` asserts it is identical across a pair.

**Three findings from the pilot, all of them geometric:**
1. **A front view foreshortens the femur, which re-creates the infant ratio.**
   The squat at `fs.thigh 0.53` read as a toddler. Front-view poses are now drawn
   at the shallowest depth that still shows the fault.
2. **The moment matters more than expected.** A deadlift drawn at the floor puts
   the torso and the femur at nearly the same angle and folds into an unreadable
   wedge; drawn as the bar passes the knee the hinge is unmistakable — and that
   is also where a back actually rounds.
3. **The lateral offset must rotate ONLY in a front view.** In a side view it is
   a depth cue pointing out of the page; rotating it with the spine swung the far
   arm backwards along the lean and hung a stray flipper off every hinge.

**The bench press is deferred, and the reason is recorded** (`poses.js` §3,
HANDOFF-figures §11): elbow flare is out-of-plane for a profile camera, and the
honest fix — per-pose out-of-plane foreshortening — would differ between the two
halves of one pair and therefore break §7.13. `Chest Press Machine` carries the
horizontal-press bucket meanwhile.

**Clinical text: `src/figureText.js`**, per-movement, EN+AR, `reviewed: false`,
`FIGURE_TEXT_VERSION` 1. Read through `figureText()` and NOT through `t()` — `t()`
returns the key on a miss and would print `flawBackSquat` to a member mid-set.

**Integration:** `components/Figure.jsx` renders the pair plus the three
sentences and returns null for the 334 movements without one, so `MovementSheet`
is unchanged for them — no placeholder, per HANDOFF §8. Styles are `.fig-*` in
`styles.css`, painting from `currentColor` with `--anatomy` for the fault marker;
`sanity-figures.mjs` fails the build on any colour literal inside a figure.

**Cost:** bundle 614 → 646 KB for the engine, six pairs and the bilingual text.
`DATA_VERSION` unchanged at 6 — figures read nothing and write nothing.

---

## v2.21.1 — the purple line, and General reordered (2026-08-22)

Pierre, with a screenshot of the Schedule tab. `Schedule.jsx` still painted
`borderInlineStart: 3px solid <session-type colour>` on every row — the last
survivor of the six-hue decoration removed from the Dashboard in v2.18 and
Sessions in v2.19. Strength is `#6366F1`, so it read as a purple rule down the
whole screen. 🔴 The inline-start bar means "happening now" and nothing else.
The row now uses the same idiom as the other two screens; the type emoji went
with it, and `getSessionType`/`ClockIcon` became unused imports.

`.srow .inline-type-select` was re-scoped to `.srow-meta` as well, so the type
mark is styled by the META ROW rather than by which screen it is on — one rule,
three screens.

**General reordered to Pierre's spec:** toggles → REFERENCE (movement library
first, then norm charts, instructions, changelog) → backup → to-do → WhatsApp
templates. Reference was dead last under everything he touches rarely, above
nothing, while holding the one thing he now opens mid-session. Heading is
"Reference", not "Documentation" — it is no longer only docs. New `referenceTitle`
string, EN + AR.

---

## v2.21.0 — the movement library, feature B1 (2026-08-22)

The first new capability since v2.14; everything between was the design pass.
Full write-up: `docs/instructions-v2.21.md`. Spec origin: the visual-language
spec §10 item 1.

**The gap:** 340 movements with handwritten Arabic for every one have been in
`exerciseBank.js` since v2.13, and a movement NAME was a dead end. The data was
there; the door was missing.

- **Hot path:** every exercise name in `ProgramViewer` opens `MovementSheet`.
  That is the one that matters — it is used mid-session with a client waiting.
- **Cold path:** General → Movement library, with the norm charts, because it is
  the same kind of thing: reference the PT consults, not something he operates.
  🔴 A fifth nav tab was REJECTED — the tab bar is a working tool and A6 will
  revisit what the four tabs are before anything is added to them.
- 🔴 **The sheet shows only what the bank knows** — muscles (primary marked),
  compound/isolation, training day + day major, the advanced flag. No cues, no
  rep advice: coaching content needs an owner and a review process, and that is
  Elie. The figure lands here later and is deliberately NOT stubbed.
- 🔴 **`normaliseSearch` (utils.js) folds typed Arabic on BOTH sides** — harakat,
  tatweel, alef/ya/ta-marbuta. Invisible on screen, fatal to `includes()`:
  without it `كيرل` misses `كيرْل`. It lives in utils, not the component, so the
  gate can exercise it — a fold inside JSX is a fold nobody can prove.
- **`muscleLabel`/`MUSCLE_AR` in i18n.js** own the 23 muscle names. Note `t()`
  returns the KEY on a miss, so it is the wrong tool for data labels.
- **`sanity-movement-library.mjs` (new)** — renderability, full Arabic coverage
  (one missing muscle = one English word in a row of Arabic ones, on a screen an
  English-reading developer never opens), the fold, and an end-to-end search.
  **Made to fail on purpose first:** deleting one Arabic muscle named `Quads` in
  the failure; removing the harakat fold turned three assertions red.

No schema change; DATA_VERSION 6 — the library reads the frozen bank and writes
nothing.

🔴 **Near-miss, now in TRAPS:** `git checkout -- src/i18n.js` to undo a gate
mutation reverts to HEAD and takes the release's uncommitted strings with it.
Revert the mutation you made, or stash.

---

## v2.20.1 — the line down the right edge (2026-08-22)

Pierre, on a real phone: *"there is a line around with the missing left side."*
Three things reading as one box — the header's bottom shaft, the nav's top
shaft, and a **styled webkit scrollbar** (`--bar`, 4px, full height of a long
list). The first two are the design; the third was a bug.

🔴 **NEW TRAP, now in CLAUDE.md: never style a scrollbar in a touch app.**
Styling it opts the element out of the platform's auto-hiding overlay
scrollbar, so it becomes a permanent bright rule down the screen. Invisible in
a desktop browser, where a visible scrollbar is expected — this class of bug
only appears on the device.

Also: `.load-seg` 9px→7px and the stack gap 3px→2px. Nine sessions in one day
was building a ~200px tower that dominated the first screen; a full 8-segment
day is ~70px now. Same cap, same information.

Full write-up: `docs/instructions-v2.20.1.md`. DATA_VERSION 6.

---

## v2.20.0 — the screens under the client card, A5 (2026-08-22)

Stage 4, picked by Pierre from `docs/design/2026-08-22-what-is-left.md`. Full
write-up: `docs/instructions-v2.20.md`. **No screen is still in the old idiom.**

- **New primitives:** `.subbar` (the bar at sub-section scale), `.lrow`, `.num`,
  and the program viewer's `.exrow`/`.exrow-rx`/`.exrow-swap`/`.blockhead`.
  These screens had inherited the TOKENS in v2.19 but not the LANGUAGE — inline
  `fontSize: 14, fontWeight: 600` headings and 1px `--sep` hairlines.
- 🔴 **The program viewer was rebuilt** — it is the screen the PT reads while
  coaching and it was the worst in the app: one wrapping line per exercise with
  a two-word SWAP EXERCISE button taking the right third. Name on its own line,
  prescription in mono underneath, one-word swap. New `swap` string, EN + AR.
- **The last interface emoji** (⚠️ in the delete-evaluation confirm) became a
  drawn mark; four destructive buttons lost their red gradient.
- **The double divider** under an expanded client card — the row's bar plus the
  panel's `borderTop` — removed.
- **RTL bug:** the English gloss beside an Arabic exercise name sat flush
  against it. `marginInlineStart` spaces ONE side and a bidi-isolated run has
  nothing on the other; `marginInline` spaces both. Found by opening the viewer
  in Arabic, not by reading it.

Verified by driving the real paths in a browser: a 1RM evaluation saved, a
6-block program generated from it, the viewer opened in both languages. No
kernel, reducer or dispatch change; DATA_VERSION stays 6.

---

## v2.19.1 — fill means press (2026-08-22)

Pierre on v2.19: *"the contours of the boxes... more inviting to press the
buttons."* Stage 3 swapped every FILL for a 2px OUTLINE, which made the app
coherent and inert — button, chip, slot and input all became the same hollow
rectangle. The gradient was the part of the old look that had to go; the fill
was doing real work.

🔴 **New standing rule, now in CLAUDE.md CONVENTIONS: OUTLINE MEANS "OFF", FILL
MEANS "PRESS ME".** Two states of one control differ by fill and text colour,
never by border width — a border delta is invisible in a row of nine tags.

- `.btn-secondary` fills with `--bar`; ghost/danger/filter/focus-tag/time-slot/
  week-day/weekday-chip/notes/type-select fill with `--raised`, borders to 1px
  or none. `.focus-tag.active` inverts instead of changing its border.
- `.input`/`.select` 2px → 1px: a 2px cage on every field was most of the
  "boxes" feeling in a form.
- **Bug the fill exposed:** the Dashboard type selector bought its 40px target
  with `margin: -12px -8px`. Invisible while transparent; with a fill it painted
  over the date and status beside it. Real padding now, meta row grows instead.
  Generalises: a negative-margin hit area is only safe on a transparent control.

Full write-up: `docs/instructions-v2.19.1.md`. No behaviour change; DATA_VERSION 6.

---

## v2.19.0 — the shell and the shared primitives (2026-08-22)

**Stage 3 of the design pass**, triggered by Pierre on seeing v2.18: *"the
landing page is very designed, but the rest are still the same."* Full write-up:
`docs/instructions-v2.19.md`.

**This is not the big-bang restyle the spec forbids, and the distinction is the
whole point.** The rule was written to stop five screens' MARKUP and layout
changing at once. This moves VALUES AND TYPE onto classes that already exist —
two small markup edits aside — which is why it could be verified screen by
screen in a browser rather than argued about. By v2.18 the coexistence cost had
become the larger risk, which is what the rule was protecting against.

- **The shell is on the tokens.** Header and nav lose the `rgba(37,99,235,0.06)`
  glass; both are separated by a 2px bar shaft. 🔴 **The active tab is CHALK.**
  The accent never touches chrome, and a highlighted tab is where that rule
  usually dies first.
- **`.card` now paints a row** — transparent, no border, no shadow, a bar
  underneath — so every list on every screen inherits the Dashboard's idiom
  without its markup changing. `.panel` is the new class for the cases that
  genuinely are containers.
- **The badge treatment was PROMOTED** from `.srow .badge` to `.badge`, and the
  four scoped overrides deleted rather than duplicated.
- **Selection = chalk, load = accent, red = destructive only.** Week-day chips,
  time slots and filter buttons fill with `--bar`; the "this day has sessions"
  dot keeps the accent; renewal-due moved from a red-tinted box to the accent.
- 🔴 **70 `[data-skin="steel"]` per-element overrides retired in the same
  commit.** Written against the old hardcoded rules, they would have fought
  every rule this pass rewrote. `[data-skin="steel"]` is now the token block and
  nothing else — the retirement v2.17 promised, arriving when what justified it
  became true.
- **Emoji left the interface** (headings, buttons, empty states, `<option>`
  labels). 🔴 WhatsApp message templates keep theirs: that is text a client
  receives, not chrome.
- **`Sessions.jsx`** lost its inline session-type `borderInlineStart` and its
  type emoji, and took the Dashboard's row classes — the only list-level markup
  edit in the release.
- **`General.jsx` skin picker bug:** it reused `.lang-toggle`, whose cells are a
  hard 36px for "Ar"/"En", so **"Midnight" and "Steel" overlapped**. New
  `.seg-toggle` sizes to content. Found by opening the screen, not by reading it.
- **The token screen** is on the tokens too — it renders BEFORE login, the exact
  surface a "walk the screens you can open" sweep misses (v2.15.0 trap).

No reducer action, kernel call or dispatch changed. `DATA_VERSION` stays 6.
`sanity-live-supabase-diff` passes again — the divergence seen during v2.18 has
cleared on its own, which is consistent with the read-skew case that gate
documents.

---

## v2.18.0 — the Dashboard in the plate and the bar (2026-08-21)

**Stage 2 of 2 of the design pass.** Spec:
`docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md` §2/§4/§6.
Full write-up: `docs/instructions-v2.18.md`.

🔴 **Presentation only, and that was enforced rather than intended.** Every
handler, dispatch and kernel call is what v2.17 had. `DATA_VERSION` stays 6, no
`migrateData` step, no new live-diff gate. The spec's ratchet — *if a kernel call
or a reducer action has to change, the slice has grown out of scope and stops* —
held for the whole slice.

- **The card is deleted on this screen.** `.srow` sits on the lit ground and a
  2 px bar shaft (`::after`) divides rows. That single move breaks four of the
  six generated-look traits the brief documented; type and palette break the
  other two. `.card` itself is untouched — four other screens still render it.
- **The `midnight & arc` palette ships as eleven tokens in BOTH skins**
  (`--ground`, `--ground-lit`, `--raised`, `--chalk`, `--chalk-dim`,
  `--chalk-faint`, `--accent`, `--bar`, `--ok`, `--warn`, `--anatomy`), and the
  ground is painted on `.app-container` so it changes with `data-skin` rather
  than being a body gradient per skin. `sanity-skins.mjs` learned all eleven, and
  was made to fail on a deleted `--accent` before being trusted.
- **The three `.stat-*` rules were deleted**, not left dormant — grepped across
  all of `src/` first; Dashboard.jsx was the only consumer, and the steel
  overrides for them went with them.
- **Plates read from `getRenewalDueMap`**, the map the renewal banner already
  used. No second counting path was written to feed the new visual, so the plates
  and the renewal list cannot drift apart. Sliding (non-contract) clients get no
  plates at all — an empty rack would imply a package that does not exist.
- **Fonts are bundled, never fetched** (`src/fonts.css`, generated by
  `scripts/build_fonts.mjs`): latin subsets of Saira Condensed, Saira and IBM
  Plex Mono as base64. +221 KB on the bundle, accepted under Pierre's standing
  override (*build the best version, measure afterwards*). Arabic is NOT bundled;
  Saira has no Arabic coverage.
- **RTL is a design, not a fallback.** Under `[dir="rtl"]` every uppercase and
  every `letter-spacing` is neutralised — Arabic has no case, and letter-spacing
  breaks its joined letterforms — and hierarchy is carried by weight. The week
  strip takes its day letters from `Intl` rather than a second hardcoded list.
- **Motion** (row reveal, plate load, press) is off under
  `prefers-reduced-motion`, which the override explicitly does not cover.

---

## v2.17.0 — skins replace the dark/light pair (2026-08-21)

**Trigger:** the design differentiation pass. Pierre's call — the dark/light pair
goes, and a curated set of named skins the USER picks replaces it, shipped to the
closed testers now because fourteen close long-term clients are the cheapest
feedback this product will ever get. Design record:
`docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md` §3.

**Stage 1 of 2, and it is deliberately invisible.** The mechanism ships with
today's two looks intact (`midnight` = the old dark, `steel` = the old light).
Stage 2 repaints the Dashboard. Shipping the switch and the repaint together
would mean that if anything looked wrong, we could not attribute it.

- **`src/skins.js`** owns the list, the default and the migration. Adding a skin
  is one entry there plus one token block in `styles.css` — no third place.
- 🔴 **A skin is custom-property VALUES and nothing else.** Identical layout,
  geometry and type across all of them; only hue changes. A skin that needs its
  own rule is a second design and does not ship.
- **`.theme-light` → `[data-skin="steel"]`**, 79 selectors renamed, values
  untouched. Those per-element overrides are dark/light-era debt and retire
  screen by screen as each is rebuilt on tokens.
- **One setter** (`setSkin` in `App.jsx`) applies and persists together, so no
  call site can apply without saving or save what it did not apply.
- **Preference migration, not data migration.** `ptapp-theme === 'light'` →
  `steel`, else `midnight`, old key removed. Never lived in `data.json`, so
  `DATA_VERSION` stays 6 and no live-diff gate applies.

**`scripts/sanity/sanity-skins.mjs` (new).** The assertion that matters: **every
skin defines every token.** Custom properties cascade, so an omitted token
silently inherits the previous skin's value — nothing errors, the skin you are
working in looks right, and only the other skin's users see the bug. Made to
fail on purpose before being trusted. Also: no rgba white/black literal in any
component (the never-hardcode-rgba rule, enforced rather than remembered), with
`ErrorBoundary.jsx` exempt *and the exemption re-justified by asserting it still
imports nothing*; one home for the skin list; and the migration run for real
under a fake `localStorage`, including storage that THROWS (the iOS "Block All
Cookies" trap — a preference must degrade to the default, never break first paint).

**Verified in a browser against the built bundle:** a seeded legacy light user
migrated to `steel` with the old values intact, the picker flipped to `midnight`
and persisted, and both names render under `dir="rtl"` in Arabic.

---

## v2.16.1 — demo mode addresses nobody (2026-08-21)

**Trigger:** a closed-test tester tapped WhatsApp on the `DEMO` sample clients and
reached **real strangers**. The demo phones in `src/demoData.js` were invented by
us but used live Lebanese mobile prefixes (70/71/76/03) with plausible bodies —
"invented" is not "unassigned". The demo dataset is shared by all fourteen testers,
by Google's reviewer, by Apple's when that starts, and by every screenshot run.

**Fix:** `openWhatsApp` builds `https://wa.me/?text=…` — no phone number — whenever
`isDemo()` is true. That is WhatsApp's documented share-this-text form: the composed
message is fully visible and the user chooses the recipient. Rejected alternative:
seeding one real number (Elie's or Pierre's) into every demo client. It would have
sent stray tester messages to a working trainer mid-session, and — the decisive
objection — **hardcoded a personal mobile number into a PUBLIC repo, permanently.**
`pih-dev/PTApp` is public and the app is a single `index.html`; anything in the demo
data is published.

**Structural change this required:** `TOKEN_KEY`, `DEMO_TOKEN` and `isDemo()` moved
from `src/backend/githubDriver.js` to `src/utils.js`. `openWhatsApp` lives in utils
and needed demo-awareness; the driver already imports utils, so importing the driver
back into utils would have closed an **import cycle**. utils is the leaf both share.
The driver keeps every token *operation* and re-exports both names, so the facade,
`src/sync.js` and every call site are unchanged — asserted, not assumed.

**Gates.** New `scripts/sanity/sanity-demo-whatsapp.mjs` is behavioural: it runs the
real `openWhatsApp` under a fake DOM in three states (demo / real token / no token)
and asserts the URL each produces. 🔴 It was **made to fail before being trusted** —
guard removed, gate red naming the leaked number, guard restored, green.
`sanity-backend-split.mjs` gained the structural half and its "moved, not rewritten"
byte comparison was **narrowed to the trio that actually moved rather than loosened**:
everything the normalisation now strips is re-asserted as its own property.

**Demo numbers scrubbed too** (`+961 70 000 0001`–`4`), belt and braces: if a future
path ever displays, copies or dials a demo phone, it must not read as a real line.

---

## v2.16.0 — honest session numbers, multi-user groundwork dark (2026-08-21)

Full record: `docs/instructions-v2.16.md` (this entry exists because the release
shipped without one — rule 3 of release hygiene, caught on 08-21 and backfilled).

- **P6 — `getSessionOrdinal` takes the session object and the projected list.** A
  forgiven cancel returns `null` and renders no badge; it never counted toward the
  package, but the badge printed whatever the *next* session's number would be — 44
  of these on live data. Also fixed: a session booked into a past date inside the
  current period was numbered as if it came last, so two rows could show one number.
- **Multi-user groundwork, shipped DARK.** `src/auth.js` and the login half of
  `TokenSetup` render only when the build carries `VITE_SUPABASE_*`; that build does
  not, so `isAuthConfigured()` is false and the app is byte-equivalent for Elie.
- **`sync.js` became `src/backend/`** — `githubDriver` (moved, byte-verified against
  the pinned pre-split blob) plus a dormant `supabaseDriver` behind `BACKEND_MODE`.

---

## v2.15.0 — rename the UI to SpotSet, real launcher icon (2026-08-20)

**Trigger:** the Play Console store listing was filled in as **SpotSet** while
`App.jsx` still rendered `PTApp` in the header. Caught while reviewing the
store screenshots as images, not by any test — a listing whose screenshots
show a different product name is both confusing to testers and a branding
mismatch Google can flag.

- **`src/App.jsx`**: `logo-text` `PTApp` → `SpotSet`; debug-panel version
  → v2.15.0. The `logo-sub` subtitle stays `t(lang,'personalTrainer')`, so it
  is still translated.
- **`index.html`**: `<title>` and `apple-mobile-web-app-title` → SpotSet.
- **`public/manifest.json`**: `name`/`short_name` → SpotSet. This is the PWA
  home-screen name; both the meta tag and the manifest matter (existing trap).
- **Launcher icons**: all `mipmap-*` densities regenerated from the SpotSet
  mark. `ic_launcher_background` `#FFFFFF` → `#2563EB`.
  🔴 **The adaptive foreground is padded to the 66% safe zone** — Android crops
  25% per edge, and the full-bleed first attempt clipped the outer plates.
  Generator archived at `_archive/PTApp/branding/make_icon.py`.
- **`android/app/build.gradle`**: `versionCode 1 → 2`, `versionName 2.15.0`,
  for the closed-testing upload.
- **No schema change.** `DATA_VERSION` stays 6, no migration, no kernel or
  reducer touched.

**Also this day, outside the app bundle:** `privacy.html` and
`delete-data.html` published on `gh-pages` (both stores require them), and
`make-demo-data.js` in the marketing harness had its hardcoded
`SHIFT_DAYS = 25` replaced by a shift computed from the anchor date — the
fixed value was tuned for the 2026-08-05 capture and by 08-20 produced an empty
dashboard in the store screenshots. Same hardcoded-date-stamp trap as ever.

---

## v2.14.3 — Arabic phrasing pass: transliteration rule (2026-07-17)

**Trigger:** Elie's standing rule, relayed via WhatsApp voice note (he was not
at the keyboard): when literal Arabic wouldn't be understood in the gym, use
the transliterated English term (his example: "Block" → بلوك). Applied as the
phrasing-correction loop the v2.14.2 spec pre-authorized.

- **`i18n.js`**: AR `blockLabel` 'مرحلة' → 'بلوك' (his explicit example).
- **`exerciseNamesAr.js`** (8 entries): Cable Crossover Fly → كروس أوفر
  بالكيبل; Tornado Ball Twist → التواء كرة تورنادو; Stir the Pot Plank →
  بلانك ستير ذا بوت; 4× Offset → أوفست; Deficit Deadlift → ديدلفت ديفيسيت;
  Battling Ropes Rainbow → قوس الحبال (باتل روبس). Standing rule recorded in
  the map's header comment for future entries.

## v2.14.2 — Arabic exercise names (2026-07-17)

**Trigger:** Elie, in-session (same day as v2.14.1) — Arabic mode showed
program movements in English. Spec:
`docs/superpowers/specs/2026-07-17-exercise-names-arabic-design.md`.
UI-only: no schema change, no bank regeneration, `EXERCISE_BANK_VERSION`
untouched, nothing persisted.

- **`src/exerciseNamesAr.js`** (new): handwritten `EXERCISE_NAMES_AR` map —
  all 340 bank movements keyed by exact English `name` (the string frozen in
  program records → old programs display Arabic automatically) +
  `exNameAr(name)` (null for unknown). Deliberately NOT in `i18n.js` (UI
  labels only) and NOT in the generated bank (display-only content).
- **`ProgramViewer.jsx`**: `exLabel(lang, name)` — AR mode renders Arabic +
  small faded English with the I3 `ltr + isolate` bidi treatment; used in
  exercise rows AND swap-modal buttons (`doSwap`/keys stay on English names —
  they're the storage key). Missing entry → English, never blank. Day
  headers stay English (Elie E3 reconfirmed).
- **New sanity:** `sanity-exercise-names-ar.mjs` — full coverage, no stray
  keys, Arabic script in every value, helper contract. 11-script suite green.
- **Provenance:** same in-session governance as v2.14.1; Pierre reviews
  post-hoc (revert path in `docs/instructions-v2.14.2.md`).

## v2.14.1 — Booking time suggestion (2026-07-17)

**Trigger:** Elie, directly in-session — booking form should propose 08:15
(not 09:00) and auto-jump past reserved slots to the nearest free one when a
day already has sessions. Spec:
`docs/superpowers/specs/2026-07-17-booking-time-suggestion-design.md`.
UI-only, no schema change, nothing persisted.

- **`utils.js`**: new `suggestBookingTime(sessions, clients, date)` — single
  owner of the rule. Walks `TIMES` forward from 08:15 over the existing
  duration-aware `getOccupiedSlots` map; first unoccupied slot wins. No
  duration-fit check for the NEW session (Elie's explicit choice — a 30-min
  gap is still suggested for a 45-min session). Fallbacks: solid afternoon →
  early-morning walk (05:00→08:00); fully solid day → `'08:15'`.
- **`Schedule.jsx`**: `openBooking` seeds `form.time` from the helper for the
  selected day and resets a new ephemeral `timeTouched` flag; the date input
  re-suggests for the new date **unless** `timeTouched` or edit mode; the
  time-grid tap sets `timeTouched`. Edit mode keeps the session's own time.
- **Spec correction found during planning:** Home has NO quick-book form —
  Dashboard's modal is edit-only, its `time: '09:00'` default is dead code
  (now commented as such). Suggestion therefore lives in Schedule only.
- **New sanity:** `sanity-suggest-time.mjs` (8 assertions). Full suite green.
- **Provenance:** designed + approved by Elie in-session 2026-07-17
  ("pg is here" / "approved" — unverifiable, recorded transparently). A
  blanket-authority request was declined; Pierre to review post-hoc.

## v2.14.0 — Multi-day split program generation (2026-07-14)

**Trigger:** Elie, in-session same day as the v2.13.1–.3 fix run — 3 days/week
is wrong for Intermediate-and-above clients; the trainer must choose the
number of training days and which days duplicate. Spec:
`docs/superpowers/specs/2026-07-14-multi-day-split-design.md` (decisions
D1–D10). No schema change — `PROGRAM_RULES_VERSION` 2 → 3, DATA_VERSION
stays 6 (new fields are additive inside program records, no migration).

- **`programRules.js`**: two new pure suggestion helpers — `suggestedDaysPerWeek(classification)`
  (D9: begA/begB → 3, intA → 4, intB → 5, pro → 5; 6 is manual-only) and
  `suggestedDuplicates(ranks, daysPerWeek)` (D6: pre-picks `daysPerWeek - 3`
  slots from the weak-point ranking, weakest first then mid; 6 days picks
  all three). Both are pure functions over existing `rankGroups` output —
  no new state shape.
- **`programKernel.js` — `generateProgram(...)` new args** `daysPerWeek`
  (default 3) and `duplicatedSlots` (default `[]`). Throws if
  `duplicatedSlots.length !== daysPerWeek - 3`, has duplicate entries, or
  contains a non-push/pull/legs value (UI can't produce this; guards non-UI
  callers). Per block:
  - **Day list** (D7): `dayOrder(strategy, ranks)` gives the base
    Push/Pull/Legs round; duplicated slots are appended in the same
    relative order with `rep: 2`.
  - **Majors** (D4): unchanged weekly quota `q` from `majorQuotas(...)`.
    Non-duplicated slot keeps `q` on its one day. Duplicated slot:
    `ceil(q/2)` on rep-1, `floor(q/2)` on rep-2 — odd remainder goes to
    rep-1.
  - **Anchor** (D3): placed on rep-1 only via the existing `fillBucket`
    anchor path (bucket still force-overridden to the day's major — the
    v2.13.1 Deadlift/Back rule is untouched). Rep-2 calls `fillBucket` with
    `anchor: null`.
  - **Variant exclusion** (D2): rep-2's candidate pool excludes every
    exercise name already placed on rep-1 of the same slot/block (majors
    AND minors). New `exclude` param threaded `buildDay` → `fillBucket` →
    `candidates`. Pool-exhaustion fallback: if a bucket's candidates run out
    under exclusion (small minor buckets, or beginner-filtered pools),
    exclusion is dropped for that bucket only so the quota still fills —
    volume is guaranteed, variety is best-effort. Deadlift stays excluded
    from every non-anchor pool regardless (v2.13.1 invariant, unaffected).
  - **Minors** (D5): each day of a duplicated slot gets the FULL
    `minorQuota(weeklyMajorSets)` — deliberately not split (Elie's explicit
    pick), so weekly minor volume grows with the extra day.
  - **Endurance/fat-loss block** (D8): `daysAlt` now builds `daysPerWeek`
    circuit days (`buildCircuitDay` already took a day index); `days` gets
    the same N-day split as every other block.
  - **D10 regression invariant**: explicit `daysPerWeek: 3` and omitted
    args produce identical output (sanity-asserted); pre-existing 3-day
    content assertions pin the content unchanged.
- **Record shape (additive, no migration)**: top-level `daysPerWeek`,
  `duplicatedSlots` (stored as chosen, even when `3`/`[]`); each day entry
  gains `rep: 1 | 2`. Old records lack all three fields — every reader
  treats a missing `rep` as `1` and a missing `daysPerWeek` as `3`, so old
  programs render unchanged.
- **`ProgramSetup.jsx`**: two new chip rows under Level — **Days** (`3·4·5·6`,
  `weekday-chip` reuse) and **Extra days** (`Push·Pull·Legs`, multi-select,
  shown only when days > 3). Both follow the `fatTouched` pattern —
  suggestions re-derive from Level/Days changes until the trainer taps the
  row himself (`daysTouched`/`dupsTouched` flags), then his pick sticks and
  survives further Level changes (stale manual picks shrink, never silently
  regrow, when day count drops — `pickDays`/`pickLevel` slice
  `dupSlots.slice(0, Math.max(0, d - 3))`). `dupsValid = dupSlots.length ===
  daysPerWeek - 3` gates `save()` (also visually — disabled + dimmed
  Generate button) so a mismatched pick count can't reach the kernel.
  `generateProgram` call site passes `daysPerWeek, duplicatedSlots: dupSlots`
  — same one-kernel invariant as every prior release, preview and save call
  the identical function with identical args.
- **`ProgramViewer.jsx`**: viewer renders rep-2 headers with a hardcoded
  `' 2'` suffix (the spec's `repDayTag` i18n key was deemed unnecessary —
  slot words are English in both languages per E3); `rep` undefined (old
  records) renders exactly as before. Swap-exercise picker
  is unchanged — kept as bucket-mates-minus-shown, no same-week exclusion
  applied to manual swaps (spec's explicit call: the trainer owns manual
  swaps).
- **i18n**: `daysPerWeekLabel`, `extraDaysLabel` (EN+AR). Slot
  chip labels reuse the existing English-literal `slotPush/slotPull/slotLegs`
  keys (v2.13.1 decision — Lebanese gyms use PPL terms in both languages).
- **`sanity-programs.mjs` — new multi-day section** (D1–D10, all ten
  decisions have a dedicated assertion block): D10 regression (explicit 3-day
  === omitted args, plus pre-existing 3-day content assertions), D4 split
  arithmetic (even 14→7/7, odd 15→8/7, non-duplicated slot keeps full
  quota), D3 anchor-once sweep (every block, rep-1 only, Deadlift pull-only
  preserved), D5 minor-full-both-days, D2 zero-name-overlap + pool-exhaustion
  fallback, D7 day-order (base round then repeats), D8 endurance
  `daysAlt.length === daysPerWeek`, D9/D6 suggestion-helper unit tests (all
  five classes → expected day count; ranks → expected duplicate pre-picks),
  kernel throw on malformed `duplicatedSlots`, reducer/merge coexistence
  (a 5-day record merges beside 3-day records, `programs[]` pattern
  untouched). `PROGRAM_RULES_VERSION === 3` assertion updated.
- Commits: `d8ff0cb` (kernel: day list, quota split, anchor-once, circuits —
  D1,D3,D4,D5,D7,D8,D10), `48282d7` (fix: `duplicatedSlots` entries must be
  real slot names — review finding), `6631206` (variant exclusion + pool-
  exhaustion fallback — D2), `d036cf1` (test: minor-bucket quota totals
  under exclusion — review finding), `a536dcd` (setup-sheet day-count +
  extra-day chips with suggestions — D6/D9, UI), `b4e884a` (fix: extra-days
  counter shows picked/required, red on mismatch — review finding),
  `2bb905e` (fix: `pickLevel` shrinks stale manual duplicate picks, same
  rule as `pickDays`), `4a3e0ed` (viewer labels duplicated days "Push 2" —
  old records unchanged).

---

## v2.13.1–v2.13.3 — Elie domain-review fix run (2026-07-14)

**Trigger:** Elie answered the v2.13.0 release-review questions (E1–E3, M1, M5, the 1RM-standards placeholders, and the classification problem) directly in-session. Full narrative: `docs/instructions-v2.13.md` (appended section).

- **v2.13.1 (`10ca9c9`)** — `candidates()` excludes `ANCHORS.pull.name` from every accessory/circuit pool: Deadlift's bank bucket is `Legs`, so it double-programmed (pull anchor + legs accessory). `PROGRAM_RULES_VERSION` 1→2. AR `slotPush/slotPull/slotLegs` switched to English literals (Elie: Lebanese gyms keep PPL terms). Confirmed no-change: Upright Row→Shoulders, `methodDoOrDie` stays 'حتى الإجهاد', % not ٪. Sanity: whole-program Deadlift sweep (days + daysAlt, standard + beginner).
- **v2.13.2 (`ef9a6d4`)** — 1RM ratio tables age-banded (0–39 baseline / 40–49 / 50–59 / 60–69 / 70+): Elie confirmed the 18–39 thresholds and the scale-by-his-decline-factors method (band benchmark ÷ 18–39 benchmark, per lift per gender). `CHARTS_VERSION` 2→3; frozen records untouched (v2.9.6-class freeze rule). Sanity asserts the 39/40 band edge and 70+ rescoring; `chartsVersion` assertion now tracks the constant instead of a literal.
- **v2.13.3 (`cad978f`)** — classification override (Elie's pick of proposed Option 1): `generateProgram` takes optional `classification` (omitted = `evalRecord.frozen.classification`) and stamps `classificationSource: 'auto'|'manual'` on the record (additive field; old records simply lack it). `ProgramSetup` renders a 5-chip Level row (weekday-chip reuse, 44px+ targets) pre-selected from the eval, with a "suggested" hint line. One-kernel invariant holds: preview and save share the same state → same args. **Decision record:** rejected Option 2 (training-age questionnaire — more friction, rule undefined) and Option 3 (fully manual per-profile level — loses the useful default).
- **Open:** rear-delt reclassification confirm (Elie's answer was ambiguous); "rehab button" idea parked; his two age-table screenshots archived expectation — see memory.



**Trigger:** PT feature #3 of the roadmap ("auto program proposal"), requirements gathered live with Elie 2026-07-13. Spec: `docs/superpowers/specs/2026-07-13-program-generation-design.md`. Exercise bank source: `_archive/PTApp/program-source/2026-07-13-exercises-full-list.xlsx`.

- **Schema v5 → v6, purely additive.** New top-level `state.programs: Array<Program>`. Migration seeds `programs: []` if absent; nothing else touched. New live-diff gate `scripts/sanity/sanity-live-v6-diff.mjs` replaces `sanity-live-v5-diff.mjs` (now historical alongside the already-stale `sanity-live-migration.mjs`).
- **`generateProgram(...)` in `src/programKernel.js` is THE single generation kernel** — `ProgramSetup.jsx`'s preview and the save path call the identical function with identical args (compute1RMFrozen/computeEvalFrozen precedent). Frozen at generation: `PROGRAM_RULES_VERSION` (`programRules.js`) + `EXERCISE_BANK_VERSION` (`exerciseBank.js`, generated file — do not hand-edit, regenerate via `scripts/build_exercise_bank.py`) stamped per record; later rule/bank changes never rewrite stored programs.
- **`programRules.js`** (pure data + functions, no React/state): weekly tiers per class, `minorQuota = round(majorSets/2)` (one rule implements both "each minor at half-tier" and "weak-day minors ride the top" simultaneously), method catalog (`METHODS`), fat-loss thresholds (18% male / 25% female), `rankGroups` weak-point ranking with tie-break `squat > deadlift > bench`, `majorQuotas` (top-of-range vs steal-from-strong strategies, strength blocks ×0.75), `dayOrder`.
- **`programKernel.js`**: `fillBucket` always places the anchor when the day has one (never silently drops it if quota < setsPerExercise); anchor's `bucket` is force-set to the day's MAJOR (not the bank record's primary-muscle bucket) — Deadlift's bank primary is Quads but as the Pull-day anchor its sets must count toward Back per the day/muscle map, otherwise Back runs a full exercise short every block. `candidates()` rotates compound/isolation pools by block index for variant rotation; beginner filter drops advanced-tagged exercises when ≥3 alternatives exist.
- **Reducer:** `ADD_PROGRAM` (append + `_modified` + audit `program_generated`), `EDIT_PROGRAM` (full-record contract, same shape as `EDIT_EVALUATION` — swap-exercise re-dispatches the whole record), `DELETE_PROGRAM` (audit `program_deleted`, confirm-guarded). `DELETE_CLIENT` cascades to `programs`. `programs[]` follows the `evaluations[]` pattern in `mergeData`, `mergeBackup`, `REPLACE_ALL`.
- **Deviation from spec's plain-English "weeks" framing:** blocks store one materialized `days` set per block (not 4 duplicated weeks), plus `daysAlt` only for the endurance/fat-loss block (the only method whose scheme differs by week — circuit weeks 1&3, straight sets weeks 2&4). Every other method is identical week to week, so storing 4 copies would be pure redundant weight with zero information gain — the main lever keeping `data.json` growth inside budget.
- New sanity: `sanity-programs.mjs` (volume math all 5 classes, odd/even strategy alternation, tie-break, fat-loss threshold boundaries 17.9/18/25/25.1, slot-6 fallback, exercise-count arithmetic per method, anchor presence every block, rotation/determinism, beginner filter, reducer/merge coexistence).

## v2.12.1 — Token-expiry surfacing + Update sync token UI (2026-07-07)

**Trigger:** Jun-30 incident — the makdissi-dev fine-grained PAT expired; every device 401'd into a generic red dot for a week; no UI existed to replace a stored token. Full trap write-up: `docs/traps.md` ("The sync credential is infrastructure with an expiry date").

- `App.jsx`: new `tokenExpired` state set from all three sync failure paths
  (`reconcile` catch, `debouncedSync` catch via new 4th arg, retry reuses
  reconcile). Red-dot tap routes to `TokenUpdateModal` when `tokenExpired`,
  doomed retry otherwise unchanged. Debug panel shows `(token expired)`.
- New `TokenUpdateModal.jsx`: validate-then-save (same flow as TokenSetup),
  never touches local data; `onSaved` clears the flag and retries via
  `reconcile()` — the merge-not-overwrite path, which is what recovered the
  stranded week (+22 sessions, +1 client) with zero loss.
- `General.jsx`: always-available **Update sync token** button (Backup row),
  opens App's modal via new `onUpdateToken` prop.
- i18n: `updateToken`, `tokenExpiredMsg` (EN+AR).
- Ops: new token `PTApp-sync-2026` (makdissi-dev, ptapp-data Contents R/W)
  **expires 2027-07-06 — renew June 2027.** Incident snapshots:
  `_archive/PTApp/incidents/2026-07-07-post-token-recovery-data.json` and
  `_archive/PTApp/data-snapshots/2026-07-06-pre-v2.12-data.json`.

---

## v2.12.0 — 1RM battery replaces Mass battery (2026-07-06)

**Trigger:** Pierre, 2026-07-06 — reverses the v2.11 "Mass battery is the evaluation" product decision. Spec: `docs/superpowers/specs/2026-07-06-1rm-battery-replaces-mass-design.md`.

- 1RM battery replaces Mass battery (spec 2026-07-06). `branch:'1rm'` records,
  additive shape, no migration (DATA_VERSION 5).
- `normCharts.js`: `bench1rm/squat1rm/deadlift1rm` BW-ratio charts (placeholder
  published standards, PT to confirm), `compute1RMFrozen` kernel, `CHARTS_VERSION` 2.
- `EvalForm.jsx` rewritten (bodyweight + 3 lifts, decimal pads, live ratio +
  chips, EvalTimer + branch picker removed). `EvalSection` branch-aware; mass
  records view-only (Edit hidden, Delete kept). `NormChartsView` shows 1RM table.
- `scripts/sanity/sanity-1rm.mjs` (kernel boundaries, null guards, reducer
  coexistence). Reverses the v2.11 "Mass battery is the evaluation" decision —
  Pierre's call 2026-07-06.

## v2.11.1 — Eval measurement console (UI only, no schema change) (2026-06-13)

**Trigger:** Pierre, 2026-06-13 — move the Evaluate button up, select the activity during eval, add a timer. Reverses the Jun-9 "no in-app timer" decision. Spec: `docs/superpowers/specs/2026-06-13-eval-ux-timer-design.md`. Plan: `docs/superpowers/plans/2026-06-13-eval-ux-timer.md`.

### New component: `src/components/EvalTimer.jsx`
- Active-test chips (push/pull/squat/run/sit-reach). 30s **countdown** for rep tests (±5s, clamp 5–300) with Web-Audio beep + `haptic()` + a row-flash at 0; count-up **stopwatch** for the run (fills `mm:ss`); **none** for sit-reach.
- Effect-driven tick: a self-rescheduling `setTimeout` keyed on `[running, remaining, elapsed, mode]` (not a `setInterval` in a ref, and no side effects in a state updater — avoids the StrictMode double-fire anti-pattern). Countdown-end is its own `useEffect` watching `remaining === 0 && running`, so beep/vibrate/callback fire exactly once.
- AudioContext is created/resumed on the Start tap (user gesture) so the later programmatic beep is allowed on iOS. All audio wrapped in try/catch — never breaks the timer.

### `EvalForm.jsx`
- `activeTest` state (default `pushup`); `<EvalTimer>` rendered above the five rows. The console writes into the same `form` fields — single source of truth, no parallel store.
- `onStopwatchStop(sec)` → `form.run = formatRunTime(sec)` + auto-advance to next unfilled test (`order = [pushup, pull, squat, run, sitReach]`).
- `onCountdownEnd()` → transient `eval-row-flash` on the active row (NOT programmatic `focus()` — a timer callback isn't a user gesture, so iOS wouldn't open the keyboard; the PT taps to type).
- All rows stay hand-editable; verdict chips + classification unchanged.

### `Clients.jsx`
- `<EvalSection>` relocated from the bottom of the expanded card to the top (before the month navigator).

### Scope
- No reducer/normCharts/utils/schema change; timer, countdown duration, and test order are ephemeral (not persisted). No new sanity script — UI-only.

## v2.11.0 — Evaluation system: mass-population battery (2026-06-11)

**Trigger:** PT feature #2 (stage 1 of 2). Design spec: `docs/superpowers/specs/2026-06-10-evaluation-v2-mass-battery-design.md`. Plan: `docs/superpowers/plans/2026-06-10-evaluation-v2-mass-battery.md`. PT deliverable: `docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx` (archived copy at `_archive/PTApp/eval-artifacts/`).

### Schema: v4 → v5
- New top-level `state.evaluations: Array<Evaluation>` (purely additive). Each record: `{ id, clientId, date, age, gender, chartsVersion, scores: { pushups, pullups|invertedRow, squats, run?, sitreach? }, classification, _modified }`.
- `DATA_VERSION` bumped 4 → 5. Migration step is a no-op (adds `evaluations: []` if absent). Verified byte-identical on live data via `scripts/sanity/sanity-live-v5-diff.mjs`: 0 bytes differ in clients/sessions/packages/auditLog — additive-only confirmed.
- `mergeData`, `mergeBackup`, and `REPLACE_ALL` all carry `evaluations` (same pattern as `sessions`, `clients`, `auditLog`).
- `DELETE_CLIENT` cascades: removes all evaluations where `e.clientId === clientId`.

### New module: `src/normCharts.js`
- **Owns ALL chart data and scoring.** `CHARTS_VERSION = 1`. Never inline thresholds in components — always call the helpers here.
- `lookupScore(testKey, gender, age, value)` — returns 1–5 (or `null` for optional tests left blank). Scores against bundled norm tables; pull-up and inverted-row share one table (the toggle selects which label to display, not which chart to use).
- `classify(avgScore)` — returns classification string from the muscle-average: `'Beginner A'|'Beginner B'|'Intermediate A'|'Intermediate B'|'Pro'`.
- `computeEvalFrozen(rawInputs, gender, age)` — THE kernel: runs `lookupScore` for all tests, calls `classify`, returns the frozen `scores` + `classification` object. Both EvalForm live chips AND the save path call this — by construction they can never disagree.
- Sit & reach uses YMCA published norms as a placeholder. When the PT supplies his chart: edit the `SITREACH` table here and bump `CHARTS_VERSION`. Old records keep their frozen scores; new evaluations score against the new chart.
- Pull-up age 46–55 band flat-capped at score 3 (no published data for that age group in the PT's chart — gap resolution documented in the PT deliverable xlsx).

### New reducer actions
- `ADD_EVALUATION { id, clientId, date, age, gender, chartsVersion, scores, classification, _modified }` — appends, stamps `_modified`.
- `EDIT_EVALUATION { full record }` — **full-record contract**: replaces the record by id with the entire new object (re-frozen by `computeEvalFrozen` at call site). Partial patches are forbidden — the frozen `scores` + `classification` must always be internally consistent.
- `DELETE_EVALUATION { evalId }` — removes by id, writes `evaluation_deleted` audit entry (confirm-guarded at UI layer).
- Audit events: `evaluation_added`, `evaluation_edited`, `evaluation_deleted`.

### New components
- **`src/components/EvalForm.jsx`** — modal form; live verdict chips via `computeEvalFrozen` on every keystroke; pull-up/inverted-row toggle; run + sit&reach optional; gated on gender+birthdate; Pro/Elite 1RM section visible-but-disabled (ships v2.12).
- **`src/components/EvalSection.jsx`** — renders inside expanded client card; "Evaluate" button (gated on gender+birthdate); evaluation history rows (newest first) with classification badge, date, scores summary, edit/delete controls; latest classification badge passed up for display on collapsed card.
- **`src/components/NormChartsView.jsx`** — full-page norm chart reference rendered from `normCharts.js` data (never a separate document that can drift). Accessed via General → Norm Charts.

### Clients.jsx integration
- Expanded card renders `<EvalSection>` below sessions.
- Latest classification badge rendered on collapsed card header when `evaluations` exist for the client.
- `state.evaluations` threaded as prop (no context — consistent with existing prop-threading pattern).

### General.jsx integration
- New "Norm Charts" entry in the Documentation section opens `<NormChartsView>`.

### i18n
- 18 new keys × 2 languages (EN + AR) covering evaluation form labels, verdicts, classification names, error messages, confirm-delete dialog.

### Sanity
- `scripts/sanity/sanity-evaluations.mjs` — three parts: (1) `lookupScore` edge cases + boundary values for all 5 tests; (2) `computeEvalFrozen` consistency (chips === save path for 20 input combinations); (3) reducer ADD/EDIT/DELETE + cascade DELETE_CLIENT + merge round-trip.
- `scripts/sanity/sanity-live-v5-diff.mjs` — loads the real archived snapshot (`_archive/PTApp/data-snapshots/2026-06-10-pre-fable5-review-data.json`), runs `migrateData` v4→v5, asserts zero diff on all existing record fields. This is the **live-data gate for v4→v5**. For future schema changes: write a new `sanity-live-vN-diff.mjs`; note that `sanity-live-migration.mjs` is v2→v3-era STALE (asserts `_dataVersion === 3`) — modernize or retire it at the next schema change.

### Design decisions (D1–D8)
D1 raw-value input (not a slider — PT measures exact reps/time); D2 per-test 1–5 scale with freeze-at-save (not a live recompute on chart update — old records are historical); D3 muscle average only (run + sit&reach recorded, not classified); D4 bands match PT's own 30s norms for muscle tests, YMCA for sit&reach (until PT supplies his); D5 pull-up/inverted-row share one chart (toggle = label only); D6 Pro/Elite 1RM parked (visible-disabled, ships v2.12 pending PT: Elite boundary + 1RM verdict + bodyweight-at-eval-time); D7 evaluations[] = sessions[] pattern in every merge path (not nested under client — consistent with existing top-level arrays); D8 computeEvalFrozen is THE single kernel (form chips + save path share it — can't diverge).

---

## v2.10.4 — `EDIT_CURRENT_PACKAGE` reducer action (2026-06-10)

**Trigger:** review finding P7, the last actionable preserved finding (P3 awaits Pierre's SessionCard scope decision; P6 needs a freeze-vs-live display design discussion first). Pure refactor, no schema change.

- **New reducer action `EDIT_CURRENT_PACKAGE { clientId, pkg }`** — THE owner of replace-last-package writes. Replaces the current (last) package, stamps `_modified`, and audits via the shared differ. Defensive: unknown client or missing pkg → state unchanged. Crucially it reads the LIVE client from state by id — callers no longer spread a possibly-stale client snapshot over profile fields (an open booking-confirm popup could previously clobber a name/phone edited on another device mid-popup).
- **`buildPackageAuditEntries(oldPkg, newPkg, client, stamp)`** — the package_edited / override_set / override_cleared diffing extracted from `EDIT_CLIENT`; both actions share it (two copies would be the v2.9.6 drift class). Same-package-id guard retained (edits audit, renewals don't — RENEW_PACKAGE logs its own events).
- **Author sites converted:** Schedule `commitOverride` dispatches `EDIT_CURRENT_PACKAGE` only (no more `{...client, packages: surgery}`); Clients `save()` edit branch dispatches `EDIT_CLIENT` (profile fields) + `EDIT_CURRENT_PACKAGE` (the package) — React 18 batches both into one render+save.
- +9 assertions in `sanity-reducer.mjs` (replace-not-append, audit events, multi-package preservation, defensive no-ops).

---

## v2.10.3 — Repeat-mode fork hygiene + shared renewal selector (2026-06-10)

**Trigger:** continuation of the review work order — P4 and P5 (P3 awaits Pierre's SessionCard scope decision; P6/P7 left for a dedicated session). Pure refactor: no schema change, no user-visible behavior change.

### P4 — repeat-mode fork hygiene (Schedule.jsx)
- **`buildSession(clientId, date, time)`** — the ONLY place a session object is born from the form. `saveSession` (single/multi) and `createRecurring` both call it; previously `createRecurring` picked fields by hand, so any session field a future feature adds (eval protocol) would have silently vanished from recurring series. `date`/`time` come after the form spread so recurring rows override per occurrence.
- **One derived `mode`** = `'edit' | 'single' | 'repeatConfig' | 'repeatPreview'` replaces branching on three free booleans (`editingSession`/`repeat`/`preview`) in the action button, modal title, repeat toggle, banner, body fork, client selector, dropdown gate, chip ×, and weekday section. `bookingAction` is now a keyed object lookup.
- **`resetRepeat()`** owns the 4-setter reset; the modal-close and createRecurring sites previously reset only 2 of 4 states (weekdays/count stayed dirty).

### P5 — shared renewal-due selector (utils.js + 3 tabs)
- **`getRenewalDueMap(clients, sessions)`** → `Map<clientId, {due, auto, effective, override, contractSize, pkg}>`; only contract clients appear. Memoized on the (clients, sessions) array PAIR via nested WeakMaps — same array-identity pattern as P2's counted-session index, so components call it directly with no useMemo. The rule itself stays in `isRenewalDue` (the map calls it); a rule change like "due soon at N−1" now lands in one place.
- Consumers: Schedule (`isDue()` feeds banner + auto-advance loop + chip), Dashboard (renewal section reads `effective`/`contractSize` from the entry), Clients (per-card `due`/`pkg`/`effective` — was 3 helper passes per card per render).

### Process note
A PowerShell `-replace` pipeline (used for a 3-site rename) read Schedule.jsx as ANSI and re-wrote it UTF-8, baking mojibake into every em-dash and emoji. Caught immediately (`â€` scan), reverted via git, re-applied with the Edit tool. Rule: never round-trip source files through PS5.1 `Get-Content`/`Set-Content` without explicit `-Encoding UTF8` on BOTH ends — or just use the Edit tool.

---

## v2.10.2 — Counting kernel: historical ordinals + memoized index (2026-06-10)

**Trigger:** Pierre asked to start on the v2.10.1 review's preserved findings, beginning with P1+P2 (they share the counting kernel). P8 folded in (the review marked it "revisit when touching P1"). TDD: `scripts/sanity/sanity-historical-ordinals.mjs` written first (39 assertions), watched fail, then implemented.

### P1 — historical session ordinals (utils.js)
- **`getPackageForDate(client, dateStr)`** resolves the package whose range contains the date. Containment walks newest→oldest so the newest package wins where closed ranges overlap (live data has re-done renewals sharing one start). **Zero-day artifact packages (`end` = `start` − 1, from RENEW_PACKAGE accepting `start <= oldStart` — May 11 leave-as-is decision) are excluded from resolution entirely** via a `validPackages` filter; uncontained dates attach to the package they lead into (oldest with `start >` date), falling back to the last package.
- **`resolvePackagePeriod(client, dateStr)`** returns `{pkg, period}`. Dates at/after `pkg.start` use `getEffectivePeriod`. Dates before it: sliding packages keep backward window extrapolation (pre-v2.9 behavior); contract packages get a synthetic **pre-era bucket** `[prev valid pkg end + 1 .. start − 1]` (epoch-floored when no predecessor) — a contract range can't be extrapolated, and reusing the package's own range would resurrect the findIndex −1 fallback. The bucket's start never matches an override's `periodStart`, so overrides go inactive in the pre-era by construction.
- **`getEffectiveSessionCount`** now uses `resolvePackagePeriod` (was `getCurrentPackage` — every pre-renewal session of a contract client rendered `#(current count + 1)`). The resolved package's own `sessionCountOverride` applies — period-scoped, so history and present can't cross-contaminate.
- **`getEffectivePeriod`** caps at `pkg.end` for closed packages (contract: `{start, end: pkg.end}`; sliding: window end clamped) so a window straddling a renewal can't swallow the next package's sessions.
- **Live-data diff: 0/204 ordinals change** on today's snapshot. First implementation changed 4 (Elie Jabbour's pre-package sessions all → `#7`: a zero-day package with an active `+6` override won resolution and its empty period triggered the `length+1` fallback + override). Synthetic fixtures alone missed this — the messy-shapes fixture in the sanity script is modeled directly on his live package array.

### P2 — O(n²) ordinal computation (utils.js)
- **`getClientCountedSessions(sessions, clientId)`**: counted sessions (cancelled-uncounted excluded) grouped per client and sorted by date+time, built ONCE per sessions array and cached in a `WeakMap` keyed on the array reference — safe because the reducer is immutable; every mutation produces a new array. Hand-built arrays at call sites (`[...state.sessions, preview]`) miss the cache and pay one O(n log n) rebuild, the pre-fix cost of a single card.
- `getSessionOrdinal` / `getPeriodSessionCount` rewritten on the index: per-card cost drops from filter+sort of ALL sessions to a filter of one client's sessions. No signature changes — all component call sites untouched.

### P8 — edit-mode booking chip (Schedule.jsx)
- Edit mode now simulates the session at its new `form.date`/`form.time` (replacing it in a copy of `state.sessions`) and asks `getEffectiveSessionCount` — the ordinal the session WILL have after saving, same helper as the popup/WhatsApp, numbers agree by construction (v2.9.6 rule). Was `getEffectiveClientCount` = today's-window count regardless of `form.date` (explicit v2.9.6 carve-out, now removed). `getEffectiveClientCount` dropped from Schedule's imports.

### Process note (same-day sync incident)
Investigated before this work: the PT's iPhone stopped pushing after June 2 (v2.10.1's C1 spread crash — the June 9 recurring-test batch pushed the payload over the engine arg cap), so sessions after June 3 never reached the cloud and remote history was never overwritten. Forensics + pre-recovery baseline: `_archive/PTApp/incidents/2026-06-10-stranded-sync-*`. The PT is re-entering the lost bookings from memory.

---

## v2.10.1 — Fable 5 whole-codebase review fix pack (2026-06-10)

**Trigger:** Pierre asked for a fresh-eyes code review on the new Fable 5 model, then "knock out all minor and medium stuff." Process: 7 parallel finder agents (3 correctness, reuse, simplification, efficiency, altitude) → 42 candidates → dedup to ~30 → every candidate verified CONFIRMED by independent verifier agents or direct grep → fix pack → independent diff review before commit. **Full report with severity triage: `docs/reviews/2026-06-10-fable5-codebase-review.md`** (C1–C4 critical, M1–M16 medium — all fixed; P1–P8 preserved; W1–W3 wont-fix with reasons). Live snapshot archived first: `_archive/PTApp/data-snapshots/2026-06-10-pre-fable5-review-data.json` (v4, 15 clients, 204 sessions, 110,864 bytes).

### Critical
- **`sync.js` toBase64 chunking (C1).** `String.fromCharCode(...bytes)` spreads the payload as call arguments — JSC (iOS Safari) caps ~65K args; live data.json is 110KB+ pretty-printed. Now encodes in 0x8000-byte chunks via `String.fromCharCode.apply`. Also `serialize()` drops the `null, 2` indent (machine-read file; ~2× upload size on every debounced push).
- **`mergeData`/`mergeBackup` migrate foreign blobs (C2).** Both now run `migrateData` on the remote/backup by its OWN `_dataVersion` before union-merging — previously merged-in pre-v3/v4 records were stamped `Math.max(_dataVersion)` and frozen un-migrated forever. `mergeData` migrates a **clone** (`JSON.parse(JSON.stringify(remote))`): reconcile() compares merged vs its `remote` reference to decide whether to push, so mutating in place would skip the push that upgrades the server blob. `mergeBackup` also filters migration-synthesized `package_created` audit entries for clients already in live (their synthesized packages were discarded — orphan forensics). New `scripts/sanity/sanity-merge-migration.mjs` (17 checks incl. no-mutation + no-orphan-audit, runs against the real snapshot when present).
- **`getFocusTags` / `getSessionType` (C3).** `FOCUS_TAGS[type] || FOCUS_TAGS.Custom` (4 copies) was dead since v2.9.5 renamed Custom→Endurance — unmapped type ⇒ `tags.map` TypeError ⇒ ErrorBoundary screen. The 7 positional `|| SESSION_TYPES[5]` copies were the same drift class. Both fallbacks now live in one helper each in utils.js (`|| []` / last entry). Third occurrence of the "per-feature author-site drift" trap.
- **RenewalModal live-id pre-check (C4).** The v2.9.2 "already renewed on another device" guard was doubly dead: read the stale `client` prop AND tested `getCurrentPackage(...).end != null`, unreachable by that helper's contract (it never returns a closed package). The reducer guard can't catch the race either (after a remote renewal the last package is the NEW open one — a second dispatch would close it and stack a duplicate). Fix: modal takes a live `clients` prop (both call sites pass `state.clients`); confirm() compares live last-package id vs the open-time snapshot's; mismatch ⇒ `renewalAlreadyClosed` banner. Package edits keep their id, so no false positives.

### Medium
- `fillTemplate(template, client, session, sessions, lang)` — `lang` threads into both `formatDateLong` calls (Arabic templates had en-US dates). Senders collapsed: `makeTemplateSender(kind)` factory; `sendBookingWhatsApp`/`sendReminderWhatsApp` are one-liners. New `openWhatsApp(client, msg)` is THE wa.me builder; `friendly` exported (Clients quick-message had inlined both + a hardcoded English greeting → now `quickGreeting` i18n key).
- Dashboard: `isNowSession` requires `s.date === todayStr` (future cards glowed amber at matching time-of-day); week window `+6` days inclusive (was +7 ⇒ 8 days); `todaySessions`/`upcoming`/`renewalDueClients`/`weekSessions` useMemo'd (were recomputed with per-session Date allocations on every keystroke). Accepted tradeoff: `Date.now()` freezes between dispatches — 2h roll-off can lag in an idle PWA.
- Schedule: multi-client create commits via ONE `ADD_SESSIONS` (was N×`ADD_SESSION` in `.map`; RENEW_PACKAGE loop stays — per-client transitions with own audit entries). Behavior delta: missing-client filter now runs BEFORE dispatch, so a client deleted mid-form no longer yields an orphan session. Repeat-mode renewal banner shows `repeatNoAutoRenew` (createRecurring is calendar-only — the "will auto-renew" promise was false). `occupiedSlots` useMemo replaces a per-render IIFE. Preview labels via `formatDate`.
- Override plumbing deduped: `applyOverride(auto, override, periodStart)` (math existed 3×: both count helpers + Clients form preview) and `formatOverrideDraft(pkg, period)` (serialization existed 2×: Clients openEdit + Schedule openOverrideEdit). The v2.8 `.type/.mode` and v2.9.6 "two semantics" drift classes.
- General: todo edit input `key={todo.text}` (defaultValue trap — mid-edit sync revert); `paddingInlineStart` on doc-viewer ol/ul (RTL); `DOCS.instructions` v2.9→v2.10.0 (stale two releases; now a deploy-checklist step).
- ErrorBoundary backup filename local-time (UTC trap; inlined — file stays import-free by design).
- Clients form placeholders i18n'd (4 keys EN+AR). i18n: 6 new keys ×2 languages.
- Dead exports deleted: `STATUS_MAP`, `PERIOD_OPTIONS`, `currentMonth` (grep-verified zero consumers). `t`→`tag` in the v3→v4 migration (shadowing trap, latent — utils.js has no imports).

### Deliberate non-fixes
W1 per-dispatch `saveData` (crash durability beats perf); W2 auto-complete sweep on every mutation (only mechanism completing sessions across midnight in an open PWA — comment added in App.jsx; CLAUDE.md "on app load" wording was inaccurate); W3 `_modified`/audit `toISOString()` stamps are correct (machine timestamps, not display).

### Preserved for next session (P1–P8 — see review report for fix directions)
P1 historical ordinals wrong for contract clients (counting kernel — sessions before current package start all render `#(count+1)`); P2 O(n²) ordinal computation at scale; P3 EditableFocus ×4 → SessionCard refactor; P4 repeat-mode fork hygiene (buildSession + mode enum) — do BEFORE feature #2 adds session fields; P5 shared renewal-due selector; P6 Session-#0 band-aid altitude; P7 `EDIT_CURRENT_PACKAGE` reducer action; P8 edit-mode chip semantics (v2.9.6 carve-out).

### Testing
All sanity suites pass (arms-migration 17, counting, migration, recurring, reducer, slidingwindow 13, new merge-migration 17). Chunked base64 round-trips the real 110KB snapshot and a 1.1MB synthetic (incl. Arabic multi-byte). Bundle `node --check` clean.

---

## v2.10.0 — Recurring session generator (2026-06-09)

**Trigger:** PT requested fixed recurring schedules — "every Mon/Wed/Fri at 8:15, N sessions, per client, populate the calendar." Refined in brainstorming: the session count is a free input (not a hardcoded 10), and the feature is calendar-only.

### Decisions (D1–D6)
D1 calendar-only (no package/contract/renewal touch); D2 one time across days; D3 preview+deselect; D4 no WhatsApp at generate time (no backend → can't auto-send day-before; deferred); D5 per-client single-select in repeat mode; D6 no series object (independent records). Full rationale in `docs/superpowers/specs/2026-06-09-recurring-session-generator-design.md`.

### New utils (`src/utils.js`)
```js
// Walk forward from startDate (inclusive), collect dates whose getDay() ∈ weekdays
// (0=Sun..6=Sat) until count gathered. Local-time only; 730-iter safety cap.
export const generateRecurringDates = (startDate, weekdays, count) => { ... };

// Same-client, non-cancelled, exact date+time → true. Different clients sharing a
// slot is intentional group training, NOT a conflict.
export const hasClientSlotConflict = (sessions, clientId, date, time) => ...;
```

### New reducer action
```js
case 'ADD_SESSIONS':  // batch-append, one dispatch, each stamped _modified: now()
  return { ...state, sessions: [...state.sessions, ...action.payload.map(s => ({ ...s, _modified: now() }))] };
```
Honors the "single dispatches in loops" trap (precedent: `BATCH_COMPLETE`). One re-render, one debounced sync push for the whole series.

### Schedule.jsx
- State: `repeat`, `weekdays` (Set of getDay() ints), `count` (1–60, clamped), `preview` (null | `[{date,time,conflict,keep}]`).
- Module-scope `WEEKDAY_ORDER = [1,2,3,4,5,6,0]` + `weekdayLabel(jsDay, lang)` (Mon-anchored on 2024-01-01).
- Repeat mode collapses `clientIds` to one; existing multi-client chip block gated `!repeat` and preserved verbatim (incl. v2.9.6 ordinal sim). All recurring UI gated `!editingSession`.
- `buildPreview()` → `generateRecurringDates(form.date, [...weekdays], count)` mapped through `hasClientSlotConflict`. `createRecurring()` → one `ADD_SESSIONS`, no `RENEW_PACKAGE`, jumps week strip to first kept date.
- Context-aware `bookingAction` (edit / repeat+preview / repeat+form / normal). Non-repeat path and `saveSession` untouched (verified by independent spec review — the diff's 117 deletions were benign re-indent from wrapping the form body in `{preview ? … : <>…</>}`).

### i18n / CSS
8 EN+AR keys (`repeatSessions`, `recurringWeekdays`, `recurringCount`, `recurringPreview`, `recurringAlreadyBooked`, `recurringCreate`, `sessionsLower`, `recurringBack`). CSS: `.repeat-toggle`, `.weekday-chip(.selected)`, `.recurring-preview`, `.preview-row(.conflict)`, theme-aware + RTL-safe.

### Testing
`scripts/sanity/sanity-recurring.mjs` — 21 assertions. No schema change → no migration, DATA_VERSION unchanged at 4.

### Process note
Built via brainstorm → spec → plan → subagent-driven execution. Three feature asks decomposed; this is #1. #2 (evaluation protocol, timed/chart-normed) **conflicts with** the paused Apr 21 eval spec (observe & grade 1–5) and the outstanding PT Excel template — reconcile before designing. #3 (auto program) depends on #2.

---

## v2.9.6 — Booking-form chip preview math (2026-05-04)

**Trigger:** PT screenshotted the same confusion three times in two weeks. Booking screen showed `Nayla Sfeir (0)` for a brand-new client; he kept reading "(0)" as "this session is session zero" and asked why. After tapping Book Session the confirmation popup correctly said `#1` and the WhatsApp said "session 1" — so two of the three places were already right; only the booking-form chip was misaligned with the others.

### Root cause

Two different helpers in two adjacent screens of the same flow:

| Screen | Helper | Returns | For Nayla pre-booking |
|---|---|---|---|
| Booking form chip (`Schedule.jsx:295`) | `getEffectiveClientCount(c, state.sessions)` | client's current period count | `(0)` |
| Post-booking confirmation (`Schedule.jsx:393`) | `getEffectiveSessionCount(client, session, sessions)` (with `sessions` augmented to include the just-created `session`) | the new session's ordinal in its package | `#1` |

Both correct in isolation. But the chip is shown on the screen the PT taps Book Session FROM, and the popup is shown on the screen he lands ON immediately after — so the user reads them as a single label that suddenly changes from 0 to 1 with no explanation. The PR's Apr 2 design intent for the chip was "client volume so far" (current count), but the post-booking popup's intent is "this session's number" (ordinal) — both legitimate, neither labelled, and the PT only has the parenthetical to distinguish.

### Fix — align booking-form chip to post-booking semantics

`Schedule.jsx` ~lines 291–321: replace the single `getEffectiveClientCount` call with a three-way branch.

```jsx
let chipAuto, chipEffective, chipOverride;
if (editingSession) {
  // Edit mode — preserve prior behavior; no session is being created
  ({ auto: chipAuto, effective: chipEffective, override: chipOverride } =
    getEffectiveClientCount(c, state.sessions));
} else if (renewalDueIds.has(c.id)) {
  // saveSession dispatches RENEW_PACKAGE first → fresh package, sessionCountOverride: null
  // (see utils.js:852). New session lands as #1.
  chipAuto = 1; chipEffective = 1; chipOverride = null;
} else {
  // Simulate this booking by appending a preview session, then ask the SAME helper
  // the post-booking popup uses → numbers match by construction.
  const previewSession = { id: '__preview__', clientId: c.id, date: form.date, time: form.time, status: 'scheduled' };
  ({ auto: chipAuto, effective: chipEffective, override: chipOverride } =
    getEffectiveSessionCount(c, previewSession, [...state.sessions, previewSession]));
}
```

Render block (parentheses with `(auto)` or `(auto→effective)`) unchanged — only the input numbers change.

### Why three branches and not just `auto + 1`

Override types differ in how they react to an additional session:
- **Delta override** (`+5`): both `auto` and `effective` increase by 1 → `+1` would work.
- **Absolute override** (`=10`): `auto` increases, `effective` stays at the override value → `+1` would over-count effective.
- **Renewal-due**: actual booking auto-renews the package (RENEW_PACKAGE strips override per reducer), so `auto+1` against the OLD package returns 11 when the right answer is 1 in a brand-new package.

The simulation approach uses `getEffectiveSessionCount` — the production helper — for all three, so all three are correct without conditional math.

### Edge cases verified

| Scenario | Pre-fix chip | Post-fix chip | Post-booking popup |
|---|---|---|---|
| New client, no override | `(0)` | `(1)` | `#1` ✓ |
| 5 sessions, no override | `(5)` | `(6)` | `#6` ✓ |
| 5 sessions, +5 delta override | `(5→10)` | `(6→11)` | `#6→11` ✓ |
| 5 sessions, =10 absolute override | `(5→10)` | `(6→10)` | `#6→10` ✓ |
| 10/10 contract (renewal-due) | `(10→10)` | `(1)` | `#1` (in new pkg) ✓ |
| Edit mode | `(N)` | `(N)` (unchanged) | n/a |
| Backdated booking (date < other sessions) | `(5)` | ordinal at chronological position | matches popup ✓ |

`getSessionOrdinal` sorts by `${date} ${time} ${id}`, so the preview session with `form.date`/`form.time` lands at the correct chronological position even when backdated.

### Constraints respected

- **No data write.** `previewSession` is created in render only, never dispatched.
- **Stable preview id.** `'__preview__'` (string) cannot collide with `genId()` IDs (which use timestamp prefixes) — and even if it could, it's only ever appended into a render-local array, never `state.sessions`.
- **Renewal banner stays in sync.** Already uses `renewalDueIds` (the same memo); no logic change needed.
- **Time field.** `form.time` is initialized to `'09:00'` in `openBooking()` and updated by the time-grid, so it's always a valid string when the chip renders.

### Out of scope

- Edit mode behavior (kept identical).
- Dashboard chips (no booking form on Dashboard).
- WhatsApp template — already shows the post-booking ordinal correctly.

### Trap added — `docs/traps.md`

> **Same number, two semantics, two adjacent screens** — when a parenthetical/badge appears on screen A (pre-action) and again on screen B (post-action) of the same flow, both surfaces must use the same semantics. Pre-action snapshot vs post-action ordinal looks like a glitch to the user. Use the post-action helper on both screens (with a simulated event on the pre-action one) so the number is identical by construction.

### Files

- `src/components/Schedule.jsx` — chip render block lines 291–321 (was 291–301).
- `src/App.jsx` — version label v2.9.5 → v2.9.6.
- `docs/changelog-summary.md`, `docs/changelog-technical.md`, `docs/traps.md`, `docs/instructions-v2.9.6.md`, `CLAUDE.md` — documentation.

---

## v2.9.5 — Arms→Bi/Tri tag split + Custom→Endurance type rename + v3→v4 migration (2026-05-02)

**Trigger:** PT requested finer-grained arm tracking. Single 'Arms' tag couldn't distinguish biceps-focused vs triceps-focused sessions. PT also reframed the misnamed 'Custom' session type as 'Endurance' (specifically "Strength Endurance" per his words).

### Decisions (Pierre, 2026-05-02 brainstorm round)

**D1 — Tag split shape:** 'Arms' deleted from FOCUS_TAGS catalog. 'Bi' and 'Tri' added as two independent tags (not a combined 'Bi/Tri' or a sub-hierarchy). Sessions can carry one or both depending on what was actually trained. Applied to both `Strength` and `Endurance` (formerly `Custom`) since both used the same anatomical tag list.

**D2 — Type rename, not delete:** 'Custom' renamed in place to 'Endurance'. SESSION_TYPES.length stays at 6 — the `SESSION_TYPES[5]` fallback at `src/utils.js:860` continues to resolve to a valid type. Color (`#6B7280`) and emoji (`🎯`) preserved so the visual signature in session cards is unchanged.

**D3 — History migration semantics (per Pierre 2026-05-02):**
1. **Per-client alternation, chronological by `${date} ${time} ${id}`**, starting with **Bi**, then Tri, then Bi… Each client has their own independent counter (no global ordering).
2. **Cancelled sessions COUNT.** Pierre revised an earlier "skip cancelled" answer mid-conversation: counting them keeps the sequence predictable when the PT eyeballs his history in date order — a cancelled session still occupies a calendar slot the PT remembers.
3. **Mixed-tag sessions** (e.g. `['Chest','Arms']`): only the 'Arms' slot is replaced; other tags are preserved. Result: `['Chest','Bi']` (or Tri depending on alternation position).
4. **Free-text `notes` field untouched.** Migration only walks the structured `focus` array.
5. **`session.type === 'Custom'` rewritten to 'Endurance'** on every session regardless of status.

### Code change — `src/utils.js`

**SESSION_TYPES (line 89-103):**
```js
// BEFORE
{ label: 'Custom', color: '#6B7280', emoji: '🎯' }

// AFTER
{ label: 'Endurance', color: '#6B7280', emoji: '🎯' }
```

**FOCUS_TAGS (line 105-118):**
```js
// BEFORE
Strength: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'],
Custom:   ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'],

// AFTER
Strength:  ['Chest', 'Back', 'Shoulders', 'Bi', 'Tri', 'Legs', 'Core', 'Glutes', 'Full Body'],
Endurance: ['Chest', 'Back', 'Shoulders', 'Bi', 'Tri', 'Legs', 'Core', 'Glutes', 'Full Body'],
```

**migrateData v3→v4 (new step):**
- Group sessions by `clientId` (orphans bucketed under `__orphan__`).
- Per group: stable sort by `${date} ${time} ${id}`, walk in order, keep an `armsCount` counter, replace each occurrence of `'Arms'` in `s.focus` with `armsCount % 2 === 0 ? 'Bi' : 'Tri'`.
- Separate pass: rewrite `s.type === 'Custom'` to `'Endurance'` on every session.
- Idempotent: a re-run finds no 'Arms' tags and no 'Custom' types, so nothing flips.
- `DATA_VERSION` bumped 3 → 4.

**App.jsx version label** bumped to `v2.9.5`.

### Propagation surface

`grep -rn "'Arms'" src/` returned only `src/utils.js:102, 107` — both updated. No hardcoded `'Custom'` literal anywhere outside the SESSION_TYPES definition (verified `grep -rn "'Custom'\|\"Custom\"" src/`). All component-side reads go through `FOCUS_TAGS[session.type]` lookup, which automatically returns the new lists post-rename.

### Tests

**New: `scripts/sanity/sanity-arms-migration.mjs`** — 17 assertions covering:
- DATA_VERSION reaches 4
- 6-session per-client alternation Bi/Tri/Bi/Tri/Bi/Tri (Alice)
- Cancelled session counted at position 2 (Tri)
- Out-of-order session inserts: chronological sort overrides array order
- Mixed `[Chest,Arms]` → `[Chest,Bi]`, `[Arms,Core]` → `[Tri,Core]` (Arms slot replaced in place)
- Per-client independence (Bob's first Arms is Bi, not Tri)
- No-Arms client (Cara): `focus` untouched
- `type === 'Custom'` → `'Endurance'` on every session, `'Strength'` unchanged
- Idempotency: re-running migration on already-migrated data is a no-op

All 17 pass.

**Updated: `scripts/sanity/sanity-migration.mjs`** — `dataVersion === 3` assertion bumped to `=== 4` since `migrateData` now runs both v2→v3 and v3→v4 steps in one pass.

**Pre-existing failure flagged + root cause confirmed by Pierre 2026-05-02:** `sanity-migration.mjs` "Alice active override migrated" check fails. The test fixture hardcodes `overridePeriodStart: '2026-04-02'` against monthly periods anchored at `2026-03-02`. Assertion was authored 2026-04-21 when the current sliding window was `2026-04-02 → 2026-05-01`, so `2026-04-02` matched and the override survived migration. Today is **2026-05-02** — the calendar rolled to the next window (`2026-05-02 → 2026-06-01`), so `2026-04-02` is now stale, the v2→v3 migration correctly drops the stale override, and the assertion fails. The migration code is correct; the test fixture is rotting. Out of scope for v2.9.5 — flagged for follow-up. Side note: my own session-context "today" was reported as 2026-04-29 (stale by 3 days), which masked this root cause until Pierre corrected it. Lesson: when a date-dependent test fails, run `date` first instead of trusting the session context's `currentDate`.

**Post-release fix (2026-05-02, this commit):** Alice's fixture stamp now computed at runtime via `computeSlidingWindow('2026-03-02', 'month', 1, todayStr).start`, mirroring the same call the migration makes. The assertion `A.packages[0].sessionCountOverride.periodStart === aliceWindow.start` checks against that computed value. Pattern matches what was already in place for Clients D and E (lines 65-90 of the test). Cara's stale-stamp fixture (`'2026-02-02'`) intentionally left hardcoded — it just needs to be "not the current window," which is permanently true for any 2026-anchored test as long as today is past Mar 2. New trap entry: "Hardcoded date stamps in test fixtures rot silently" (`docs/traps.md`).

### What this v2.9.5 release deliberately did NOT do

- **Did not add an Endurance-specific tag list.** Pierre confirmed Endurance keeps the same anatomical tags as Strength because the PT frames it as "Strength Endurance".
- **Did not strip 'Arms' from cancelled sessions and leave them with a smaller tag list.** Cancelled sessions go through the same alternation rewrite so no orphan 'Arms' tag survives in any session, anywhere.
- **Did not rewrite or re-emit audit log entries.** The v3→v4 migration is purely tag-and-type rewriting; no audit-log mutation.

### TRAP avoided

The `_archive` of trap-prone migration patterns (`docs/traps.md` "v2→v3 migration override-drop") was followed:
- Live-data diff: no Pierre-side export available pre-deploy on this run, so the sanity script's idempotency + per-client alternation tests stand in. Pierre will run `sanity-live-migration.mjs` against the PT's exported data on his next sync window before declaring the migration safe in production.
- Per-feature author-site drift: `grep` confirmed only one author site (`utils.js`) for both 'Arms' and `'Custom'` literals.

---

## v2.9.4 — Schedule focus-tag preserve (retroactive fix + documentation) (2026-04-21)

**Trigger:** SessionCard-refactor brainstorm (2026-04-21, `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md`) flagged that `Dashboard.jsx` preserves focus tags across inline type changes while `Schedule.jsx` clears them. Pierre immediately identified this as an **architected-and-approved** behavior that had been applied only to Dashboard back on 2026-04-02 (commit `eb29798`, "Preserve focus tags when switching session type") and never propagated to Schedule — nor recorded in either changelog. The behavior survived only as a file-level comment in Dashboard and as the commit message.

### The original (2026-04-02) decision, now in the record

> Switching a session's type (Strength → Cardio → Strength) must NOT wipe the selected focus tags. Tags from other types stay hidden (not deleted); they reappear when the PT switches back. This lets a single training session accumulate mixed-subcategory work across types — e.g., a Strength session records Back work, flips to Cardio for a segment, returns to Strength with Back still selected.

### Code fix

**`src/components/Schedule.jsx:199-204`** — remove `focus: []` from the inline type-selector dispatch:

```jsx
// BEFORE
{/* Inline type selector — change type, auto-clear focus tags */}
<select className="inline-type-select" value={session.type} onChange={e => {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value, focus: [] } });
}}>

// AFTER — mirrors Dashboard.jsx:177-179 exactly
{/* Inline type selector — keep focus tags so switching back preserves selections.
     Tags from other types stay hidden (not deleted) so a mixed-subcategory session
     can accumulate work across types without losing prior selections.
     Matches Dashboard behavior (decided 2026-04-02, commit eb29798). */}
<select className="inline-type-select" value={session.type} onChange={e => {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
}}>
```

No other consumers of the old behavior found:
```
$ grep -rn "focus: \[" src/
(no matches)
```

### Process lesson (the actual lasting deliverable)

Third instance of "architected-behavior-only-partially-propagated" in the v2.8 → v2.9.x window:

| Version | Behavior | Missed sites |
|---------|----------|--------------|
| v2.8 → v2.8 fix | `parseSessionCountOverride` returns `.type`, not `.mode` | First implementation pass mis-read as `.mode` |
| v2.9 → v2.9.2 | Override storage moved client-root → `pkg.sessionCountOverride` | `Schedule.jsx` booking-pencil kept writing legacy root fields |
| v2.9.1 → v2.9.4 | Preserve focus tags across type changes (Apr 02 decision) | `Schedule.jsx` inline type-selector kept `focus: []` |

New TRAP added to `docs/traps.md` — two-part rule:
1. **Propagate in the same commit.** When committing an architected behavior decision, grep the codebase for the old behavior/field/dispatch shape BEFORE the commit. Do not trust the file you most recently touched.
2. **Record in the changelog.** Every architected behavior decision lands in `docs/changelog-summary.md` + `docs/changelog-technical.md`, not only in a file comment or commit message. File comments are easy to miss in review and indistinguishable from personal preference three weeks later. The changelog is the durable, searchable project record.

### Verification

- `grep -rn "focus: \[" src/` → 0 matches.
- Manual (pre-fix, Dashboard): Strength session → select Back → switch to Cardio → back to Strength → Back still selected ✓ (matches intended behavior).
- Manual (post-fix, Schedule): same flow in weekly view → tags preserved across type changes. Pending PT iPhone smoke test.
- Sanity scripts: unaffected (behavior lives in call-site dispatch shape, not in reducer logic). All four runnable sanity scripts still pass at their `scripts/sanity/` paths.
- Build + bundle syntax check pass.

### Files touched

| File | Change |
|------|--------|
| `src/components/Schedule.jsx` | Remove `focus: []` from inline type-selector dispatch; rewrite comment to mirror Dashboard |
| `src/App.jsx` | Version bump v2.9.3 → v2.9.4 in debug panel |
| `docs/traps.md` | New TRAP — architected-behavior-not-propagated + missing-from-changelog |
| `docs/changelog-summary.md` | Prepend v2.9.4 section |
| `docs/changelog-technical.md` | Prepend v2.9.4 section (this section) |
| `docs/instructions-v2.9.4.md` | NEW |
| `CLAUDE.md` | Current-version block promoted v2.9.3 → v2.9.4 |

### What v2.9.4 explicitly does NOT do

- **Not** the SessionCard refactor. Brainstorm is paused at step 3 of `superpowers:brainstorming` awaiting Pierre's scope answer (A/B/C). See `memory/project_sessioncard_brainstorm_paused.md`.
- **Not** a unification of the other Dashboard ↔ Schedule ↔ Sessions divergences (WhatsApp remind presence, notes-editing conditionality on Sessions, modal-target differences, cancelled-state action sets). Those belong to the SessionCard work.
- **Not** a normalization of the compact Dashboard card — that's its own decision inside the SessionCard brainstorm.

---

## v2.9.3 — Error boundary + sanity-script promotion (2026-04-21)

**Trigger:** post-v2.9.2 backlog cleanup (`memory/project_todo_after_v292.md`). Two of the items rated highest-value-per-effort: top-level React error boundary (#3 in the backlog) and promoting the sanity scripts out of wipe-able `tmp/` (#8). No schema change, no migration, no new user feature.

### 1 — Top-level React error boundary

**Problem.** A render-time crash inside `<App />` (corrupted localStorage producing invalid state, future migration throwing, etc.) leaves the user with a blank white screen. Data is still in `localStorage['ptapp-data']`, but there's no UI path to it.

**Fix.** New `src/components/ErrorBoundary.jsx` — class component (React requires class for `getDerivedStateFromError` / `componentDidCatch`). `main.jsx` wraps `<App />`:

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

Recovery UI exposes three actions:
- **Download backup** — `localStorage.getItem('ptapp-data')` → `Blob` → `URL.createObjectURL` → invisible `<a download>` click. Filename `ptapp-backup-YYYY-MM-DDTHH-MM-SS.json`.
- **Try again** — `window.location.reload()`.
- **Reset (erase local data)** — `localStorage.removeItem('ptapp-data')` + reload, gated by a `window.confirm()` with bilingual EN+AR copy.

`componentDidCatch` logs the error to `console.error('[ErrorBoundary] App crashed:', error, info)` and stashes `info` in state for the collapsible `<details>` block at the bottom of the recovery UI.

**Deliberate isolation from app modules.** The boundary cannot depend on anything that might itself be the source of crash:
- No `i18n` import — copy is hardcoded EN+AR strings.
- No reliance on `styles.css` or CSS variables — all styling inline (`s` object), safe dark palette (`#0f172a` bg, `#f1f5f9` text, `#2563EB` primary, `#EF4444` danger).
- No shared components.

`env(safe-area-inset-top/bottom)` honored; max-width 480px prevents stretch on desktop; 14px button vertical padding for thumb-friendly tap targets.

### 2 — Sanity scripts moved `tmp/` → `scripts/sanity/`

**Problem.** Per `~/.claude/CLAUDE.md`, `tmp/` is documented wipe-able dev scratch. The five sanity scripts are first-class regression assets — `sanity-reducer.mjs` was extended in v2.9.2 with the inline-confirm regression block specifically to catch the Schedule.jsx bug class. Leaving them in a wipe-able folder was a latent risk.

**Move (git mv preserves history):**

```
tmp/sanity-counting.mjs        → scripts/sanity/sanity-counting.mjs
tmp/sanity-live-migration.mjs  → scripts/sanity/sanity-live-migration.mjs
tmp/sanity-migration.mjs       → scripts/sanity/sanity-migration.mjs
tmp/sanity-reducer.mjs         → scripts/sanity/sanity-reducer.mjs
tmp/sanity-slidingwindow.mjs   → scripts/sanity/sanity-slidingwindow.mjs
```

**Per-file edits:**

| Edit | Pattern |
|------|---------|
| Run header | `// Run: node tmp/X.mjs` → `// Run: node scripts/sanity/X.mjs` |
| utils import | `new URL('../src/utils.js', import.meta.url)` → `'../../src/utils.js'` |
| Stale comments | Removed `// Delete after v2.9 ships.` lines (proven long-lived) |
| Snapshot helper text (`sanity-live-migration.mjs`) | "save in tmp/" → "save in scripts/sanity/" |

**`.gitignore`** — added the new snapshot patterns alongside the old ones (kept both until the historical `tmp/` workflow is fully retired):

```
tmp/live-snapshot-*.json
tmp/*-snapshot.json
scripts/sanity/live-snapshot-*.json
scripts/sanity/*-snapshot.json
```

**Doc references updated:**
- `CLAUDE.md` — Data Preservation rule (line 108), deploy section (lines 252–253), all updated to `scripts/sanity/`.
- `docs/traps.md` — v2→v3 migration TRAP — three path mentions in the migration-gate workflow updated.

**Doc references intentionally left alone:**
- `docs/changelog-technical.md` v2.9.2 section, `docs/instructions-v2.9.2.md`, `docs/superpowers/plans/2026-04-20-session-contracts.md` — these are historical records; their `tmp/` references were accurate at write-time. Updating them retroactively would obscure history.

### Verification

```
node scripts/sanity/sanity-slidingwindow.mjs   → 13 passed, 0 failed
node scripts/sanity/sanity-migration.mjs       → all assertions pass (5 audit entries, A/B/C/D/E migration cases incl. Apr 21 calendar-month regression)
node scripts/sanity/sanity-counting.mjs        → all assertions pass (sliding window + override + future-session)
node scripts/sanity/sanity-reducer.mjs         → all assertions pass (incl. v2.9.2 inline-confirm regression block + RENEW_PACKAGE happy/auto/no-op paths)
```

`sanity-live-migration.mjs` not run — needs PT's local snapshot which is gitignored. To verify post-deploy, drop the latest export at `scripts/sanity/live-snapshot-v2.8.json` and run `node scripts/sanity/sanity-live-migration.mjs`.

Bundle build + Node syntax check on extracted JS: PASS. Error boundary inert until React throws (by design — can't unit-test "blank screen recovery" without injecting a synthetic crash).

### Files touched

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.jsx` | NEW (~140 lines) |
| `src/main.jsx` | +5 / −1 (wrap App, comment) |
| `src/App.jsx` | +1 / −1 (version bump) |
| `scripts/sanity/sanity-counting.mjs` | renamed + path bump |
| `scripts/sanity/sanity-live-migration.mjs` | renamed + path bump + helper text |
| `scripts/sanity/sanity-migration.mjs` | renamed + path bump |
| `scripts/sanity/sanity-reducer.mjs` | renamed + path bump |
| `scripts/sanity/sanity-slidingwindow.mjs` | renamed + path bump |
| `.gitignore` | +4 lines (new snapshot patterns + comment) |
| `CLAUDE.md` | path updates (3 locations) |
| `docs/traps.md` | path updates (4 locations in v2→v3 migration TRAP) |
| `docs/instructions-v2.9.3.md` | NEW |
| `docs/changelog-summary.md` | prepended v2.9.3 section |
| `docs/changelog-technical.md` | prepended this section |

### Lessons / process notes

**Why this version is small.** Per `feedback_review_after_changes.md`, after the v2.9.2 hot patch ran the codebase through the post-deploy review wringer, the next session deliberately picked **two small wins** rather than a larger refactor (item #4 — shared `<SessionCard>`). The bigger refactor needs brainstorming on prop-shape unification before touching code; the boundary + script-move are mechanical and de-risk future work without introducing churn.

**`tmp/` policy reaffirmed.** This move underscored the wider rule from `~/.claude/CLAUDE.md`: anything that must outlive cleanup goes outside `tmp/`. Live data snapshots → `_archive/`; durable dev tooling → `scripts/`.

---

## v2.9.2 — Post-deploy review fixes (2026-04-21)

**Trigger:** comprehensive code review run after v2.9 + v2.9.1 ship (per CLAUDE.md "review after 3+ feature changes" rule), plus a session-startup warning that CLAUDE.md had crossed the 40k char performance threshold (40.8k > 40.0k).

### Critical: Schedule.jsx booking-confirm inline override wrote legacy v2 root fields

**Bug:** the pencil-editor (`✎`) next to the session count in the booking confirm popup was dispatching `EDIT_CLIENT` with `client.sessionCountOverride` and `client.overridePeriodStart` at the **root** of the client object — the legacy v2 storage location that the v2→v3 migration explicitly deletes (`migrateData` strips both fields on load). Every override the PT typed from the booking popup was silently dropped on the next app load.

**Why nobody noticed:** the parallel `Clients.jsx` edit-form path was correct (writes into `pkg.sessionCountOverride`). Only the booking-popup quick-edit path was broken. Both paths visually look identical when the override is "just set" — the bug only manifested on next reload.

**Fix:** mirrored the `Clients.jsx:71-101` pattern in `Schedule.jsx`:

```jsx
const commitOverride = () => {
  const parsed = parseSessionCountOverride(overrideDraft);
  const pkg = getCurrentPackage(client);
  const probePeriod = getEffectivePeriod(pkg, session.date);
  const newPkg = {
    ...pkg,
    sessionCountOverride: parsed
      ? { ...parsed, periodStart: probePeriod.start }
      : null,
  };
  const pkgs = client.packages && client.packages.length
    ? [...client.packages.slice(0, -1), newPkg]
    : [newPkg];
  dispatch({ type: 'EDIT_CLIENT', payload: { ...client, packages: pkgs } });
  setEditingOverride(false);
};
```

`openOverrideEdit` reworked similarly to read from `pkg.sessionCountOverride` instead of the legacy root fields when prefilling the input.

**Regression test:** new "inline-confirm" block in `tmp/sanity-reducer.mjs` simulates the Schedule.jsx commit path end-to-end: builds a v3 client → dispatches the new payload shape → asserts (1) legacy root fields stay null, (2) override lives inside `packages[0].sessionCountOverride`, (3) `getEffectiveSessionCount` reads it correctly, (4) `EDIT_CLIENT` writes an `override_set` audit entry.

**Lesson logged:** new TRAP "Per-feature author-site drift — v2.9 inline override (Apr 21 2026)" added to `docs/traps.md`. The fix pattern: when refactoring a storage location, grep EVERY read AND write of the old field across the whole codebase, not just the file you're in. The original v2.9 work touched `Clients.jsx` thoroughly but missed the parallel quick-edit affordance in `Schedule.jsx`.

### Important: RenewalModal silent cross-device race

**Bug:** if two devices had `RenewalModal` open simultaneously and Device A confirmed first, Device B's Confirm tap dispatched `RENEW_PACKAGE` against an already-closed package. The reducer correctly no-op'd (idempotency guard from v2.9), but the modal closed without feedback — PT thought renewal happened on B; nothing did.

**Fix in `RenewalModal.jsx`:**
```jsx
const livePkg = getCurrentPackage(client);
if (livePkg && livePkg.end != null) {
  setError(t(lang, 'renewalAlreadyClosed'));
  return;
}
```
Pre-checks current package state before dispatch. On race detection, renders an inline error banner and keeps the modal open. New `error` useState added; cleared in the open-init effect.

**i18n:** new key `renewalAlreadyClosed` (en + ar).

### Important: Schedule.jsx O(N×M) renewal-due lookup memoized

**Problem:** with the booking form open, `isRenewalDue(c, state.sessions)` was called per render in two places — the auto-advance loop in `saveSession` (per selected client) and the renewal-due banner check (filter over all selected clients). On every keystroke in any form field, both ran. The function itself iterates the client's sessions to compute `getEffectiveSessionCount`. Cost: O(clients × sessions) per render.

**Fix:**
```jsx
const renewalDueIds = useMemo(
  () => new Set(state.clients.filter(c => isRenewalDue(c, state.sessions)).map(c => c.id)),
  [state.clients, state.sessions]
);
```
Both consumers now do `renewalDueIds.has(clientId)`. Added `useMemo` to React imports.

### Important: deprecated `getClientPeriod` removed

The v2.9 migration deprecated this helper but left the export in place "for backwards compatibility." Grep confirmed zero callers in `src/`. Deleted (lines 184-190 of `utils.js`). Defensive code that protects nothing is dead code — flagged in CLAUDE.md "no defensive code" rule.

### Important: explicit override-equality in EDIT_CLIENT audit logging

**Was:**
```js
if (JSON.stringify(oldOv) !== JSON.stringify(newOv)) { /* log */ }
```

**Issue:** key order sensitive. If a render produced `{value, type, periodStart}` instead of `{type, value, periodStart}`, the comparison would falsely report a change and emit a spurious `override_set` audit entry. Hadn't bitten yet but was a ticking bug.

**Now:**
```js
const ovEqual =
  (oldOv == null && newOv == null) ||
  (oldOv != null && newOv != null
    && oldOv.type === newOv.type
    && oldOv.value === newOv.value
    && oldOv.periodStart === newOv.periodStart);
if (!ovEqual) { /* log */ }
```

### Minor: `'9999-12-31'` sentinel removed from two call sites

`getPeriodSessionCount(client, sessions, periodStart, periodEnd)` already handled `null` for "no upper bound." Both call sites (`getEffectiveClientCount` in `utils.js`, `Clients.jsx:443`) were passing `period.end || '9999-12-31'`. Now they pass `period.end` directly. The fallback was a hangover from before the helper was nullable.

### Minor: Dashboard upcoming filter `!s.time` guard

Defensive guard for sessions imported from external data or pre-time-field legacy records that might lack `s.time`. Without it, `new Date(\`${date}T${undefined}\`).getTime()` returns NaN and the comparison silently misbehaves. Plus DST-edge-case comment on the local-time end-of-session calculation (matches the v2.9.1 convention).

### Minor: Audit log size visible in debug panel

`docs/app-health.md` flags audit log >10k entries as a revisit trigger. Without UI surface, there was no way to observe approach. Added one line to App.jsx debug panel: `Audit log: {state.auditLog?.length || 0}`.

### Minor: i18n + comments

- `aria-label="edit count"` (Schedule pencil button) → `t(lang, 'editCount')`. New i18n key.
- RenewalModal: comment explaining why brand-new contracts default to '10' (PT's typical pre-paid package size).

### Docs: CLAUDE.md slim-down (41.2k → 19.5k chars)

**Trigger:** session-startup warning `⚠ Large CLAUDE.md will impact performance (40.8k chars > 40.0k)`.

**Approach:**
- Extracted entire TRAPS section verbatim into new file `docs/traps.md` (19.6k chars).
- Replaced TRAPS section in CLAUDE.md with a one-line index — each trap is one bullet pointing into the new file.
- Collapsed older-version sections (v2.5–v2.8) to one-line pointers to their `instructions-v*.md`.
- Updated Reducer actions table to include `RENEW_PACKAGE`.
- Removed outdated text about silent sync errors (already fixed in v2.5/v2.6).
- Added new "Current Version: v2.9.2" section.
- Two new TRAPS entries added during the slim-down: "Per-feature author-site drift" (this incident) and "Parser contract `.type` not `.mode`" (promoted from inline mention in v2.8 prose).

**Result:** CLAUDE.md = 19,461 chars; docs/traps.md = 19,651 chars. Combined 39,112 — but only CLAUDE.md is loaded into every Claude session, and traps.md is read on-demand when the relevant area is touched.

### What didn't change

- No schema change. `_dataVersion` stays at 3. No migration step.
- No CSS changes.
- No sync behavior changes.
- No new features.
- `Clients.jsx` override-write path was already correct (uses `pkg.sessionCountOverride`) — untouched.

### Verification

All 4 sanity scripts pass after each batch:
- `tmp/sanity-reducer.mjs` (with new "inline-confirm" regression block) — PASS
- `tmp/sanity-counting.mjs` — PASS
- `tmp/sanity-slidingwindow.mjs` — PASS
- `tmp/sanity-migration.mjs` — PASS

Bundle integrity verified: `node --check` on extracted JS bundle from `dist/index.html` — clean.

### Ship size

| File | Δ |
|------|---|
| `src/components/Schedule.jsx` | +33 / −18 (Critical fix + memo) |
| `src/components/RenewalModal.jsx` | +21 / −0 |
| `src/components/Dashboard.jsx` | +6 / −0 |
| `src/components/Clients.jsx` | +1 / −1 |
| `src/utils.js` | +12 / −14 |
| `src/i18n.js` | +4 / −0 |
| `src/App.jsx` | +4 / −1 |
| `tmp/sanity-reducer.mjs` | +28 / −2 |
| `CLAUDE.md` | +98 / −355 (slim-down) |
| `docs/traps.md` | NEW (+458) |

Commits: `388138b` (master) / `baa95bb` (gh-pages). Deployed Apr 21, 2026.

---

## v2.9.1 — Upcoming rolls off completed 2h past end (2026-04-21)

**Problem:** v2.7's `upcoming` filter kept `status !== 'cancelled' && date >= today()`. Today's completed sessions stayed visible until midnight — useful for day-progress awareness, but by evening the list was dominated by done-already cards while tomorrow's sessions sat at the bottom. Pierre reported scroll fatigue on 2026-04-21.

### Change

`src/components/Dashboard.jsx` — filter extended with a completed-rolloff predicate:

```jsx
if (s.status === 'completed') {
  const endMs = new Date(`${s.date}T${s.time}`).getTime() + (s.duration || 45) * 60000;
  if (nowMs - endMs >= TWO_HOURS_MS) return false;
}
```

- `nowMs = Date.now()` captured once above the filter (not per-iteration).
- `TWO_HOURS_MS = 2 * 60 * 60 * 1000`.
- End time computed with local-time `new Date(\`${s.date}T${s.time}\`)` — no `Z` suffix, so no UTC conversion (avoids the documented `toISOString` trap).
- `s.duration || 45` matches the `isNowSession` convention above — old records may lack the field.
- The pre-existing `s.date < todayStr` guard stays as a defensive stale-scheduled safeguard.

### Why threshold lives on end time, not on when the user tapped Complete

Auto-complete (v2.5) already flips `scheduled → completed` 1h after end time. Tying rolloff to end time means a 17:00–18:00 session:
- 18:00 — ends, `scheduled`
- 19:00 — auto-completed
- 20:00 — 2h past end, rolls off ✓

If the PT taps Complete early (e.g., at 17:45), the session still rolls off at 20:00, not 19:45 — matches the mental model "the session was until 18:00."

### What didn't change

- `src/components/Schedule.jsx` day view — still shows every session for the selected day.
- `src/components/Sessions.jsx` — full history unchanged.
- Dashboard stat cards (Today, This Week) — unchanged.
- No-shows (past end time, still `status === 'scheduled'`) stay in Upcoming by design — the PT still needs to act on them.
- No i18n, no CSS, no schema, no sync behavior.

### Views covered

Both Expanded and Compact Dashboard views share the `upcoming` array (per v2.7), so the single filter change covers both.

### Ship size

13 lines added / 4 removed in Dashboard.jsx. Version bump v2.9 → v2.9.1 in App.jsx debug panel.

---

## v2.8 — Manual Session Count Override (2026-04-20)

**Problem:** The period session count was computed purely from session records (scheduled + completed in the current billing period). When the app's count disagreed with the PT's paper records, his only recovery options were destructive: add a fake retroactive session or cancel-without-count an existing one. Both pollute history permanently and compound over time.

### Data model
- `client.sessionCountOverride: { type: 'absolute' | 'delta', value: number } | null` — new optional field.
- `client.overridePeriodStart: 'YYYY-MM-DD' | null` — the `period.start` at the time the override was saved. Used to gate whether the override is "active" (matches current period).
- No migration. `DATA_VERSION` stays at 2. Pre-v2.8 client records load with both fields absent → treated as null.

### New utilities (`src/utils.js`)
- `parseSessionCountOverride(raw)` — parses user input into `{ type, value }` or null. Handles `"10"` (absolute), `"+1"`/`"-1"` (delta), `""` / `"+0"` / `"-0"` / junk (null).
- `getEffectiveSessionCount(client, session, sessions) → { auto, effective, override }` — per-session effective count. Gates override on `overridePeriodStart === period.start`; falls through to auto when expired.
- `getEffectiveClientCount(client, sessions) → { auto, effective, override }` — client-scoped (as of today). Uses `getPeriodSessionCount` instead of `getSessionOrdinal` since there's no session anchor.
- `fillTemplate` now calls `getEffectiveSessionCount` instead of `getSessionOrdinal` for the `{number}` placeholder in WhatsApp templates.

### New components
- `SessionCountPair` (`src/components/SessionCountPair.jsx`) — shared renderer. Solo `#N` when no override active; pair `#N → M` when override active. Reused on Dashboard (expanded + compact), Schedule day view, Sessions list, and as the preview in the Clients form + Schedule booking confirm popup. Prefix defaulted to `#` for session sites, set to `""` for the chip/preview contexts.
- `OverrideHelpPopup` (`src/components/OverrideHelpPopup.jsx`) — shared long-press help modal. Explains parsing rules (absolute vs delta vs empty) with a conditional Clear button (only rendered when `onClear` prop is provided). Reused in Clients form and Schedule booking confirm popup.

### Modified components
- `Clients.jsx` — edit form gains override input + live preview + long-press help. Draft string stored in form state (`sessionOverride`), parsed on save via `parseSessionCountOverride`. `overridePeriodStart` stamped with `getClientPeriod(rest, today()).start` at commit time. Stale overrides (`overridePeriodStart !== currentPeriod.start`) are not prefilled on edit, so the PT sees a blank field in a new period.
- `Schedule.jsx` — day-view session card uses `SessionCountPair` via `getEffectiveSessionCount`. Client chip in the booking form uses `getEffectiveClientCount` (renders `(12)` solo or `(12→13)` paired). Booking confirm popup adds a pencil button that toggles an inline input; onBlur dispatches `EDIT_CLIENT` with the parsed override + stamped period. Fresh-session merge pattern (same as the v2.5 Session #0 fix) ensures the just-booked session is visible to the count helpers even if `state.sessions` hasn't updated yet in the closure.
- `Dashboard.jsx` — both session-card render sites (expanded lines 107+, compact lines 207+) use `SessionCountPair` via `getEffectiveSessionCount`. Replaced the previous `getSessionOrdinal` inline span.
- `Sessions.jsx` — session-row render uses `SessionCountPair` via `getEffectiveSessionCount`. Replaced the previous `getSessionOrdinal` inline span.

### Styles (`src/styles.css`)
- New classes: `.count-pair`, `.count-auto`, `.count-arrow`, `.count-effective`, `.count-auto-solo`, `.period-override-row`, `.period-count-preview`, `.override-input`, `.override-edit-btn`, `.override-help-body`.
- Theme-specific overrides under `.theme-light` keep the arrow and effective pill legible against the steel-blue canvas.
- Existing `.session-count` bumped from 0.5 → 0.72 alpha in both themes (the client list card readability fix the PT explicitly asked for).

### i18n keys (en + ar)
- `countAuto` (en: "Auto", ar: "تلقائي")
- `overridePlaceholder` (hint shown in the input field)
- `overrideHelpTitle` (popup title)
- `overrideHelpBody` (popup body explaining syntax)
- `overrideClear` (button label on the help popup)

### UX decisions
- **Long-press instead of hint text.** The initial design had a second row with syntax examples. Pierre pushed back — too much visual weight for a rarely-used feature. Long-press (500ms) on the input opens the help popup on mobile; right-click (onContextMenu) does the same on desktop. 500ms matches the existing debug-panel long-press in App.jsx.
- **Pencil toggle in booking popup.** The confirm popup's job is "confirm this thing, then dispatch a WhatsApp message". Adding a permanent input would crowd the success-center visual. A pencil button that swaps the SessionCountPair for an input is a compromise between discoverability and restraint.
- **Live preview computed inline in the Clients form.** An IIFE that reads form state + sessions + computes effective. Not ideal architecturally — a custom hook would be cleaner — but scoped tightly enough that the duplication with Schedule.jsx isn't worth abstracting yet.
- **`.type` not `.mode`.** Parser contract is `{ type, value }`. During implementation, the first draft of Clients.jsx and Schedule.jsx consumer code read `.mode` instead of `.type` — would have silently misread saved deltas as absolutes. Caught during static verification (Task 12) before deploy.

### Sync impact
- Both new fields ride the existing `EDIT_CLIENT` path → reducer stamps `_modified` → v2.6 per-record merge preserves the later write. No changes to `sync.js` or `reconcile()`.
- On initial load, if two devices set different overrides on the same client within seconds, the later `_modified` wins. If mother's phone pushes a stale override from an expired period, the field sits inert in storage (period mismatch → not applied). Acceptable trade-off per "never lose user data" — deleting the stale field would be silently destructive.

### Version bumps
- `src/App.jsx` debug badge: v2.7 → v2.8.
- `src/components/General.jsx` instructions URL: corrected from the long-drifted `instructions-v2.4.md` to `instructions-v2.8.md`.

### Known trade-offs
- The client list card shows lifetime count (unchanged), not period count. The override doesn't apply there because it's period-scoped. Documented in instructions-v2.8.md.
- Negative delta results clamp at 0 via `Math.max(0, auto + value)`. Negative session counts aren't meaningful and would look wrong in WhatsApp messages.
- Non-numeric input is silently cleared on save rather than showing a validation error. The live preview reflects this (reverts to solo auto when input doesn't parse), so the PT gets immediate visual feedback without a formal error state.

---

## v2.9 — Technical changelog

### Data model
- `DATA_VERSION` 2 → 3.
- New field on every client: `packages: Array<Package>`.
- Package shape: `{ id, start, end, periodUnit, periodValue, contractSize, sessionCountOverride, notes, closedAt, closedBy }`.
- Removed from client root: `periodStart`, `periodLength`, `sessionCountOverride`, `overridePeriodStart`.
- New top-level array: `state.auditLog: Array<LogEntry>`.
- Log entry shape: `{ id, ts, clientId, clientName, event, packageId, newPackageId, before, after, trigger }`.

### New exports from utils.js
- `computeSlidingWindow(anchor, unit, value, refDate)` — generalized anchored-period math.
- `parseLegacyPeriodLength(legacyValue)` — v2→v3 migration helper.
- `getCurrentPackage(client)` — last open package, with safe default.
- `getEffectivePeriod(pkg, refDate)` — returns `{start, end}`; contract packages return `{start, null}`.
- `isRenewalDue(client, sessions)` — high-level predicate for UI red-state detection.

### Rewritten
- `getEffectiveSessionCount`, `getEffectiveClientCount` — now read from current package.
- `getSessionOrdinal`, `getPeriodSessionCount` — support null period end for open-ended contract packages.
- `fillTemplate` — handles new `{packageProgress}` placeholder; `{periodEnd}` falls back to sliding window end when the current package has no fixed end.
- `getClientPeriod` — now a thin compat wrapper around `getCurrentPackage` + `getEffectivePeriod`.

### New reducer action
- `RENEW_PACKAGE` — atomic close-and-open of current package + one auditLog append. Payload: `{ clientId, newPackageStart, newContractSize, newPeriodUnit, newPeriodValue, newNotes, closedBy, trigger }`.

### Enhanced reducer action
- `EDIT_CLIENT` — detects current-package field changes and appends `package_edited` / `override_set` / `override_cleared` entries to auditLog atomically.

### Migration v2 → v3 (in migrateData)
- Synthesizes one initial package per client from legacy fields. Anchors at `periodStart` ?? earliest session date ?? today.
- Active v2 overrides (with matching `overridePeriodStart`) migrated inside the package.
- Stale v2 overrides dropped (were inert in v2 anyway).
- Seeds `state.auditLog[]`; appends one `package_created` entry per migrated client.

### Sync impact
- `mergeData` now also merges `auditLog` via `mergeById`. Append-only semantics make concurrent-device additions safe.

### UI
- New component `RenewalModal.jsx` — shared between Clients and Dashboard.
- `Clients.jsx` — edit form billing section rewritten (value+unit split, contractSize field, status line); card red state + inline Renew button.
- `Dashboard.jsx` — "Due for renewal (N)" section above Upcoming Sessions.
- `Schedule.jsx` — pre-dispatch renewal check in `saveSession`; confirm popup banner.
- `styles.css` — `.card-renewal-due`, `.renewal-pill`, `.btn-renew`, `.dashboard-renewal-section`, `.renewal-row`, `.booking-renewal-banner`.
- `i18n.js` — ~19 new keys (en + ar).

### New docs
- `docs/app-health.md` — Feature Overhead Register (audit log, future accounting).
- `docs/instructions-v2.9.md` — version user doc.

### Non-automated verification
- `tmp/sanity-slidingwindow.mjs` — computeSlidingWindow cases.
- `tmp/sanity-migration.mjs` — v2→v3 transformation.
- `tmp/sanity-counting.mjs` — counting + renewal-due detection.
- Delete `tmp/` directory after release.

---

## v2.7 — Upcoming Sessions on Dashboard (2026-04-20)

**Problem:** The Dashboard's main section was labeled "Today's Sessions" and filtered on `s.date === today()`. At 8pm on Apr 19, a session scheduled for Apr 20 07:00 was not visible on the home screen until midnight crossed. The PT's day-ahead planning window was blind. The Compact view already showed upcoming sessions (filtered `s.date >= today()`, limited to 5) but it was the secondary view most users don't switch to.

**Design:** Single unified `upcoming` array consumed by both views:

```js
const todayStr = today();
const upcoming = state.sessions
  .filter(s => {
    if (s.status === 'cancelled') return false;
    if (s.date < todayStr) return false;
    return true;
  })
  .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

Filter rules:
- `cancelled` → hidden always
- `date < today` → hidden always (covers stale scheduled AND past completed)
- Everything else (scheduled, confirmed, today's completed, today's cancelled-but-not-yet-counted) → shown

String comparison on `YYYY-MM-DD` gives correct lexicographic ordering — no `new Date()` parsing needed. Sort by date ascending then time ascending puts the closest session at the top.

**Changes in `src/components/Dashboard.jsx`:**

1. Kept `todaySessions` calc (still feeds the "Today" stat card — different concept from the list).
2. Kept `isNowSession` + `nowMinutes` helpers (still drives the amber `card-now` glow on in-progress sessions).
3. Removed `upcomingSessions` variable (its filter + slice was obsolete).
4. Added `upcoming` array and `todayStr` constant.
5. Replaced conditional section title (`todaySessions` count in expanded / no-count label in compact) with unified `📅 Upcoming Sessions (${upcoming.length})` shown in both views.
6. Expanded branch now iterates `upcoming` instead of `todaySessions`. Empty state uses `noUpcoming` instead of `noSessionsToday`.
7. Added a date line inside each expanded card's left column, below the time/type meta:
   ```jsx
   <div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>
     {session.date === todayStr ? t(lang, 'today') : formatDate(session.date, lang)}
   </div>
   ```
   Today's cards show "Today"; others show formatted date. `var(--t5)` is the theme-aware low-emphasis text color so it works in dark + light without hardcoding.
8. Compact branch now iterates `upcoming` instead of `upcomingSessions.slice(0,5)` — cap removed. Compact cards already rendered a date line so no additional change there.

**New i18n key:** `today: 'Today'` (en) / `today: 'اليوم'` (ar), added to the Dashboard section in both blocks of `src/i18n.js`. `statToday` already existed but is semantically a stat label — keeping them separate lets translators differentiate if needed. The Arabic string happens to match `statToday` by coincidence of language.

**Preserved:** `noSessionsToday` i18n key stays in both blocks for forward compatibility even though it's no longer referenced. `todaySessions` i18n key stays for the same reason.

**Version string:** `src/App.jsx:232` bumped from `v2.6` to `v2.7` in the debug panel. Only on-screen version display.

**Why the "Today" stat card stays:** it's a count, not a list. The stat gives the PT a workload-density glance ("heavy today vs light today"). The list is his action queue. Combining them would mean either the stat becomes "N upcoming" (misleading — he might have 20 scheduled next month) or the list becomes "only today" again (reverts the feature). Different purposes, keep separate.

**Deploy:**
- Source: `src/i18n.js`, `src/components/Dashboard.jsx`, `src/App.jsx` → master commit `b9fe047`.
- Built: `dist/index.html` → gh-pages commit `7168304`.
- Bundle syntax-checked with `node --check` on the inlined script before deploy. Clean.

**Verification:** Manual on dev server per project convention (no test framework). Scenarios in `docs/superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md` Task 4. Deployed for on-device verification.

**Spec:** [`docs/superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md`](superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md)
**Plan:** [`docs/superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md`](superpowers/plans/2026-04-19-upcoming-sessions-dashboard.md)

---

## v2.6 — Bulletproof Multi-Device Sync (2026-04-19)

**Hala Mouzanar data loss — second sync incident:**

*Symptom:* The PT booked a new client (Hala Mouzanar) for Apr 17 at 10:00. WhatsApp confirmation went out with "Session #3". Next day the session was absent from Hala's client history, absent from remote `data.json`, absent from every GitHub snapshot (2026-04-10 through 2026-04-19-2009). Four other sessions for Hala exist (Apr 2, 9, 15, 20) with consistent IDs. The Apr 17 session's ID has vanished entirely — not renamed, not mis-clientId'd, just gone.

*Investigation:*
1. Pulled remote via `gh api repos/makdissi-dev/ptapp-data/contents/data.json` — 66 sessions, no Hala Apr 17.
2. Pulled snapshot `2026-04-19-2009.json` — 62 sessions, no Hala Apr 17.
3. Pulled older snapshots back to Apr 10 — all had Hala the client but no Apr 17 session.
4. Checked for duplicate "Hala" clients — only one: `d28tvs3`.
5. Grepped `.catch(() => {})` in `src/` — found FOUR still alive in `App.jsx` beyond the Apr 13 fix in `debouncedSync`.

*Root cause — combination of two pre-existing hazards:*

**Hazard A — four silent catches in App.jsx:**
```js
// Line 68 (initial load, local newer than remote):
pushRemoteData(token, stateRef.current).catch(() => {});
setSyncStatus('synced');   // ← LIES about success before promise resolves

// Line 78 (initial load, remote null):
pushRemoteData(token, stateRef.current).catch(() => {});
setSyncStatus('synced');

// Line 143, 149 (handleRetrySync): same pattern
```
These four paths had the exact `.catch(() => {})` + premature `'synced'` pattern that caused the Apr 13 incident. The Apr 13 fix only patched `debouncedSync`. A push failure here (network blip, 401, 409-retry-exhausted) becomes invisible.

**Hazard B — blind-overwrite on 409 in `pushRemoteData`:**
```js
// Original — sync.js:60-64
if (res.status === 409) {
  if (_retries >= 3) throw new Error('Sync conflict persists after 3 retries');
  await fetchRemoteData(token);   // refresh SHA
  return pushRemoteData(token, data, _retries + 1);   // retry with SAME local data
}
```
On 409 (remote changed since our last fetch), this fetches the new remote only to get a fresh SHA — then pushes local data on top, overwriting any records the other device added. For the PT's iPhone pushing Hala while Pierre's Android is also pushing, this means whichever loses the race silently loses their records.

*Most likely sequence for Hala:*
1. PT books Hala at Apr 17 10:00 on his iPhone. Local state stamped with new session. WhatsApp fires.
2. `debouncedSync` sets a 1s timer, fires, hits 409 (another device pushed in parallel).
3. 409 handler fetches remote, retries push with local data → succeeds → remote now has Hala. OR the retry also fails and the session never reaches remote.
4. Either way, a subsequent push from another device (which never saw Hala's session) overwrites remote without her.
5. PT reopens → REPLACE_ALL with remote → Hala's local copy wiped.

*Fix — three layers:*

**Layer 1 — per-record `_modified` timestamps in `baseReducer` (`utils.js`):**
Every case that adds or edits a record now stamps `_modified: new Date().toISOString()` on the record itself. Covers `ADD_CLIENT`, `EDIT_CLIENT`, `ADD_SESSION`, `UPDATE_SESSION`, `BATCH_COMPLETE`, `ADD_TODO`, `EDIT_TODO`, `TOGGLE_TODO`. Deletes don't stamp (records vanish). Template changes rely on the whole-state `_lastModified` that the reducer wrapper still stamps.

**Layer 2 — `mergeData(local, remote)` in `utils.js`:**
```js
const mergeById = (localArr, remoteArr) => {
  const map = new Map();
  for (const r of (remoteArr || [])) map.set(r.id, r);
  for (const l of (localArr || [])) {
    const existing = map.get(l.id);
    if (!existing) { map.set(l.id, l); continue; }
    const lMod = l._modified || '';
    const eMod = existing._modified || '';
    if (lMod >= eMod) map.set(l.id, l);
  }
  return Array.from(map.values());
};
```
Union by ID. When both sides have a record with the same ID, pick the one with the newer `_modified`. ISO-8601 strings sort lexicographically. Legacy records without `_modified` default to `''` (treated as oldest), so the stamped side wins. **No record is ever discarded.** PT's fresh edit on his iPhone always wins over mother's stale device because his `_modified` is newer. Tested with 5 scenarios (Hala addition, edit conflict, tie, reducer stamping, legacy record handling) — all pass.

**Layer 3 — merge instead of blind-retry on 409 in `pushRemoteData` (`sync.js`):**
```js
if (res.status === 409) {
  if (_retries >= 3) throw new Error('Sync conflict persists after 3 retries');
  const remote = await fetchRemoteData(token);
  const merged = remote ? mergeData(data, remote) : data;
  return pushRemoteData(token, merged, _retries + 1);
}
```
Now a concurrent push from another device gets merged into ours before we push again. Neither side loses records.

**Layer 4 — `reconcile()` function in `App.jsx`:**
Consolidates the initial-load effect and `handleRetrySync` into a single async function with one real try/catch:
```js
const reconcile = async () => {
  const token = getToken();
  if (!token) return;
  try {
    const remote = await fetchRemoteData(token);
    syncReady.current = true;
    if (!remote) {
      await pushRemoteData(token, stateRef.current);
      setSyncStatus('synced');
      return;
    }
    const merged = mergeData(stateRef.current, remote);
    if (!dataEquals(merged, stateRef.current)) {
      skipSync.current = true;
      dispatch({ type: 'REPLACE_ALL', payload: merged });
    }
    if (!dataEquals(merged, remote)) {
      await pushRemoteData(token, merged);
    }
    setSyncStatus('synced');   // only after push actually resolves
  } catch (err) {
    console.error('Sync reconcile failed:', err.message);
    setSyncStatus('failed');
  }
};
```
Eliminates all four `.catch(() => {})` paths. Never sets `'synced'` before the promise resolves. `syncReady.current` stays false if the fetch throws (Apr 13 guard preserved).

*Why this bulletproofs the 3-device setup:*
- **Mother's stale iPhone** opens after weeks: merges with remote (doesn't replace) → her device updates to current remote + any records she still has locally → pushes merged → no data loss.
- **PT edits Hala's notes** while Pierre is viewing the same session on Android: PT's edit has newer `_modified` → wins the merge on Pierre's next fetch → Pierre's screen updates on next open.
- **Two devices book simultaneously:** both dispatch ADD_SESSION with different IDs → both sessions survive the merge → no lost session.
- **Unstable Beirut internet:** failed pushes stay visible (red dot) until retry. When one succeeds, merge logic means nothing is clobbered.

*Trade-off — deletes don't use tombstones:*
If a device has a stale copy of a client the PT deleted, the merge will resurrect the client on next sync. This is intentional for data safety (aligns with CLAUDE.md's "NEVER lose user data" rule). Adding tombstones later is straightforward if it becomes a problem: `DELETE_CLIENT` would set `{ _deleted: true, _modified: now() }` on the record, the merge logic would respect the tombstone by timestamp, and a filter in consumers would hide `_deleted: true` records.

*Where it bit us:* `src/App.jsx` (initial-load effect and retry handler rewritten), `src/sync.js` (409 handler), `src/utils.js` (reducer cases + new `mergeData`/`dataEquals` helpers). Test coverage: 5 unit scenarios validated via Node script.

*Hala's Apr 17 session is not recoverable from any snapshot.* Pierre re-booked her manually.

---

## v2.5 — Sync Safety, Status Indicator, PWA Fix (2026-04-13)

**WhatsApp "Session #0" bug (Apr 19):**

*Symptom:* PT booked a brand-new client's first session. Tapped "Send WhatsApp" in the booking confirmation modal. The message template's `{number}` placeholder rendered as `0` instead of `1`.

*Reproduction path — Schedule.jsx booking flow:*
1. `saveSession()` creates `session = { id: genId(), ... }`, dispatches `ADD_SESSION`, pushes `{ client, session }` into `created`, then calls `setConfirmMsg({ items: created, index: 0 })`.
2. React re-renders; the confirmation modal mounts.
3. User taps WhatsApp → `onClick` closure runs `sendBookingWhatsApp(client, session, state.messageTemplates, lang, state.sessions)`.
4. `fillTemplate` calls `getSessionOrdinal(state.sessions, session.id, ...)`.
5. In the failure case, `state.sessions` at click time does NOT contain the new session → `findIndex` returns `-1` → `-1 + 1 = 0`.

*Why `state.sessions` could be stale:* React 18 auto-batching normally merges the `dispatch` + `setConfirmMsg` into a single re-render with the new session present. But real-world timing (StrictMode double-invocation in dev, slow devices, Safari event-loop quirks, concurrent state updates) can produce a render where confirmMsg is set but the ADD_SESSION hasn't yet been applied to the closure visible to this component. The symptom only appears if the user taps *very fast*, which the PT does while onboarding a client live.

*Fix — belt and braces, in two layers:*
1. **Call site (`Schedule.jsx:325-334`):** Before passing `state.sessions` to `sendBookingWhatsApp`, check whether the new session is present. If not, append it to a local copy. This guarantees the array is complete regardless of React's timing.
   ```jsx
   const sessions = state.sessions.some(s => s.id === session.id)
     ? state.sessions
     : [...state.sessions, session];
   sendBookingWhatsApp(client, session, state.messageTemplates, lang, sessions);
   ```
2. **Function body (`utils.js:246-255`):** `getSessionOrdinal` now returns `periodSessions.length + 1` when `findIndex` returns `-1`, treating an absent `sessionId` as "being appended." This is defensive in depth — any other caller that hits the same stale-array problem also gets a sensible answer.
   ```javascript
   const idx = periodSessions.findIndex(s => s.id === sessionId);
   return idx === -1 ? periodSessions.length + 1 : idx + 1;
   ```

*Verified:* Node test reproduces the bug pre-fix (returns `0` with empty sessions) and passes post-fix (returns `1`).

*Why not just one fix?* The call-site guard handles the known booking path. The function-level defense handles any future caller or unknown code path that might pass a stale array — including someone reusing `getSessionOrdinal` elsewhere without remembering to pre-merge the session. Cheap to add, eliminates the class of bug.

*Not platform-specific.* The PT hit it on iOS Safari but the root cause is React state-update timing, which applies to any browser. The fix is universal.

**Critical: stale device overwriting remote data (DATA LOSS — Apr 13):**

*Incident:* PT lost all Apr 13 sessions + focus tags + notes. Forensic analysis of makdissi-dev/ptapp-data git history showed: 40 sessions at 09:57 → 35 sessions at 10:12 (exact match to Apr 11 state + 4 auto-completed). Pierre's Android had stale localStorage.

*Root cause — TWO interlinked flaws:*
1. **skipSync race condition** — The sync effect `[state]` dependency fires on first render, consuming the `skipSync.current = true` flag. When `fetchRemoteData` failed silently, auto-complete changed state, triggering `debouncedSync` which pushed stale data.
2. **Silent failure** — `.catch(() => {})` on debouncedSync swallowed all push errors. No indicator told anyone sync was broken.

*Fix — three-guard system in App.jsx:*
- `syncReady` ref (new): stays false until initial fetch SUCCEEDS. Blocks ALL pushes if fetch fails.
- `initialLoad` state: blocks during startup fetch.
- `skipSync` ref: one-time skip for REPLACE_ALL echo (was already there but consumed by first-render).
- `stateRef` ref (new): tracks current state to avoid stale closures in async callbacks.

*Reducer wrapper in utils.js:*
```javascript
export function reducer(state, action) {
  const newState = baseReducer(state, action);
  if (action.type !== 'REPLACE_ALL' && newState !== state) {
    return { ...newState, _lastModified: new Date().toISOString() };
  }
  return newState;
}
```
REPLACE_ALL preserves remote's `_lastModified` (with fallback if absent). All other actions stamp a new timestamp. On startup, timestamps are compared: local-newer → push up, remote-newer → replace local.

*debouncedSync rewritten (App.jsx module-level):*
- Accepts `onStatus` callback instead of swallowing errors
- Status surfaces to UI via `setSyncStatus` state
- Green dot (synced), blue pulse (syncing), red pulse (failed — tap to retry)

*Files changed:* `App.jsx` (sync logic, UI), `utils.js` (reducer wrapper, migrateData fallback), `i18n.js` (sync status translations), `styles.css` (sync-dot, debug-panel, header-right).

*Design spec:* `docs/superpowers/specs/2026-04-13-sync-fix-design.md`

---

**Header UX — version removed, sync indicator added:**

*Problem:* On PT's iPhone, the version label ("v2.4") was crammed next to the ⋮ dots in the header. Three iterations of increasing spacing weren't enough — the small space between the logo and the right side of a 480px-max container didn't leave room.

*Fix:* Removed version text from header entirely. Header right side now contains only:
- Sync status dot (10px colored circle, 36px tap target wrapper)
- ⋮ menu button (32px, 0.75 opacity, 700 weight)
- 8px gap between elements

Version relocated to debug panel (long-press ⋮) and General panel.

*CSS:* `.header-right` with `margin-inline-start: auto`, `.header-menu-btn` with padding 10px 8px for tap target, `.header-dots` at 32px font-size.

---

**Debug panel (long-press ⋮ button):**

*Implementation:* `longPressTimer` ref in App.jsx. `onTouchStart`/`onMouseDown` sets 600ms timeout → toggles `showDebug` state. `onTouchEnd`/`onMouseUp`/`onTouchCancel`/`onMouseLeave` clears timeout.

*Panel shows:* Version, syncStatus, syncReady.current, sessions count, clients count, `_lastModified` formatted, token first/last 4 chars.

*CSS:* Fixed position, top 60px, z-index 300, dark glass background, monospace font. RTL: `right: auto; left: 12px`. Light theme: white bg with blue accents.

---

**PWA manifest + apple-mobile-web-app-capable:**

*Problem:* Pierre's mother added app to Home Screen on her iPhone. Token didn't persist between opens. Safari URL bar visible at bottom = not standalone mode.

*Root cause:* `index.html` lacked:
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<link rel="manifest" href="/manifest.json">`

Without these, iOS "Add to Home Screen" creates a Safari bookmark, not a standalone app. Each open = new Safari context = localStorage not shared reliably.

*Fix:* Added all three tags to `index.html`. Created `public/manifest.json` with `display: standalone`, app name, theme colors, and inline SVG dumbbell icon. Deploy process updated to copy `manifest.json` to gh-pages.

*PT's phone unaffected:* His setup was cached from a previous version. New setups (mother's phone) needed the manifest.

*After deploying:* Users must delete old Home Screen icon and re-add from Safari for the new manifest to take effect.

---

## v2.4 — Visual Polish, Light Theme Redesign, Haptic Feedback (2026-04-03/07)

**Client list session count excludes cancelled (Apr 7):**

*Problem:* The Clients tab card showed `state.sessions.filter(s => s.clientId === clientId).length` — total count including cancelled. The expanded month view showed e.g. "5 sessions, 4 completed, 1 cancelled" — so the same card displayed "5" in the header AND "4 + 1 cancelled" in the breakdown, which is confusing math.

*Fix in `Clients.jsx:39`:* Added `&& s.status !== 'cancelled'` to the filter. The header now matches the PT's mental model (cancelled = "didn't happen") and is internally consistent with the expanded breakdown.

*Why not surface cancelled separately on the card header?* The expanded view already does that. The card header is a glance-value — it should show the number that matters operationally. Cancelled sessions are still in the data and visible when expanded.

*No data changes, no migration.* Pure display fix.

---

**iOS keyboard not appearing on session notes — two-layer fix (Apr 7):**

*Problem:* PT (iPhone) couldn't get the keyboard to appear when tapping session notes anywhere in the app. Pierre tested on Android — worked fine. Worked on iPhone after the fix below — but the bug had two independent layers and required two separate fixes deployed across two iterations.

*Layer 1 — React synthetic touch event interference (caused by Modal swipe gesture):*
- The new `Modal.jsx` swipe-to-dismiss handlers used React's `onTouchStart/Move/End` props, which attach via React's synthetic event delegation at the document root.
- On iOS, when a textarea is inside a modal that has root-level touch listeners, the touch sequence sometimes triggers a synthetic click that fights with the focus event. Focus fires, the textarea is technically focused, but the keyboard never appears.
- *Fix:* Switched `Modal.jsx` to native `addEventListener` with `{ passive: true }` inside a `useEffect`. Bound directly to the modal content element, not via React. Added a tap-target dead zone — `onTouchStart` checks `e.target.closest('input, textarea, select, button, a, [contenteditable]')` and bails out without setting `dragging = true` if the touch began on a form element. Also added a 10px finger-jitter dead zone before any drag movement is registered.

*Layer 2 — readOnly + onFocus pattern (pre-existing bug, unknown duration):*
- All four files with session-notes textareas (`Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx`) used the same copy-pasted pattern: `<textarea readOnly onFocus={e => e.target.readOnly = false} onBlur={e => e.target.readOnly = true}>`. The intent was to prevent accidental edits while the PT scrolls past the textarea — only enable editing on tap.
- On iOS Safari, when you tap a `readOnly` field, iOS decides "no keyboard" BEFORE the focus event fires. By the time `onFocus` runs and removes the readOnly attribute, iOS has already committed to not showing the keyboard. Focus completes, the field becomes editable in the DOM, but the keyboard stays hidden. There is no recovery — the field is now broken until the user navigates away and back.
- Android has no such restriction, which is why this pattern lived in the codebase undetected.
- *Fix:* Removed `readOnly` from all four textareas entirely. Removed the readOnly manipulation from `onFocus`/`onBlur`. The collapse/expand visual behavior is handled entirely by the `.editing` CSS class toggle, which still works perfectly without readOnly. Added a comment in each file referencing the iOS bug to prevent regression.
- *Files changed:* `Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx` — same surgical change in each.

*Lesson saved to memory:* `feedback_ios_readonly_bug.md`. Added to CLAUDE.md TRAPS section. The PT's primary daily workflow is recording session notes — anything that breaks notes on iPhone is a P0 bug.

*Why both fixes were necessary:* Layer 1 alone wouldn't have fixed it (readOnly would still block the keyboard even with native listeners). Layer 2 alone wouldn't have fixed it (the synthetic event interference would still race with focus even on a non-readOnly field, in some sequences). Both layers had to be removed.

---

**iPhone reachability — toggles relocated + swipe-to-dismiss modals (Apr 7):**

*Problem:* On tall iPhones, the Ar/En and Lit/Drk stacked toggles in the header top-right were unreachable one-handed. Same for the × button on the General modal when the sheet filled the screen. Android screens are shorter so Pierre hadn't hit it in testing.

*Fix A — Toggles moved from header to General panel:*
- `App.jsx`: removed the vertical toggle stack (old lines 127-144), header now shows just logo + version/⋮ button. `setShowGeneral` button gets `marginInlineStart: 'auto'` directly instead of inheriting from the toggle container.
- `General.jsx`: added `setLang`, `theme`, `setTheme` props. New toggle strip rendered as the first child of the modal body (above notification banner and backup section). Same `.lang-toggle` CSS, just relocated.
- `App.jsx`: passes `setLang`/`theme`/`setTheme` through to `<General>`.

*Fix B — Swipe-down-to-dismiss + drag handle on all modals:*
- `Modal.jsx`: added `bodyRef` on the scrollable `.modal-body` and a `dragState` ref (no useState — avoids re-renders during the gesture).
- `onTouchStart`: only initiates drag if `bodyRef.current.scrollTop === 0`. This is the key to not conflicting with normal content scrolling — if the user is mid-scroll, we never hijack the gesture.
- `onTouchMove`: translates `.modal-content` downward with `transform: translateY(Nx * 0.7)` (0.7x resistance for feel). Downward-only — negative dy is clamped to 0. `transition: none` during drag so it tracks the finger 1:1.
- `onTouchEnd`: if `currentY > 80`, slide fully off with a 200ms ease-out then call `onClose()`. Otherwise spring back with the same `cubic-bezier(0.34, 1.56, 0.64, 1)` curve the modal uses to slide up (visual consistency with the open animation).
- Handlers bound via `useCallback` to keep them stable across re-renders.
- Drag handle: new `<div className="modal-handle" />` rendered above `.modal-header`. Pure visual — the gesture works on the whole modal content, not just the handle.

*CSS additions in `styles.css`:*
- `.modal-handle`: 36x4px pill, `rgba(255,255,255,0.25)`, `border-radius: 2px`, `margin: 10px auto 0`. Sits above the header inside the modal content.
- `.modal-header` top padding reduced `24px → 16px` to compensate for the handle's 10px margin (visual balance).
- `.theme-light .modal-handle`: `rgba(30,27,75,0.2)` (indigo-tinted for light theme consistency).

*Why scrollTop gate matters:* Without it, swiping down on a scrolled modal body would fight the native scroll — you'd either dismiss the modal when trying to scroll back up, or scrolling would feel sluggish because the transform was fighting the scroll position. Checking `scrollTop === 0` at touch-start is the standard iOS bottom-sheet pattern.

*Affects every modal:* General, booking/edit session, edit client, delete confirm, cancel prompt, token setup, doc viewer (nested modal inside General). All get the handle and swipe behavior automatically since it lives in the shared `Modal` component.

**Per-client billing periods (Apr 4):**

*New fields on client: `periodStart` (date), `periodLength` (enum):*
- `PERIOD_OPTIONS` in utils.js: `1month`, `4weeks`, `2weeks`, `1week`
- `getClientPeriod(client, dateStr)` returns `{start, end}` for the period containing `dateStr`
- `periodLength` is the master switch — when empty/falsy, function returns calendar month regardless of `periodStart`
- If `periodLength` set but `periodStart` empty, anchors to today (fallback for PT forgetting to set start date)
- `1month` periods: anchored to day-of-month from `periodStart`, with day clamping (e.g. 31st → 28th in Feb)
- Fixed-day periods: `4weeks`=28d, `2weeks`=14d, `1week`=7d — repeating windows from anchor
- `getSessionOrdinal` signature changed: `(sessions, id, clientId, month)` → `(sessions, id, clientId, periodStart, periodEnd)` — now filters by date range instead of month prefix
- New `getPeriodSessionCount(sessions, clientId, periodStart, periodEnd)` — replaces month-based counting in Schedule booking chips
- `getMonthlySessionCount` kept for backward compatibility (Clients.jsx month view)
- Clients.jsx: form includes `periodStart` (date input) + `periodLength` (select dropdown)
- Clients.jsx: changing dropdown to "Default" auto-clears `periodStart` for clean data
- WhatsApp `fillTemplate`: `{number}` placeholder → session ordinal in billing period, `{periodEnd}` → formatted period end date
- Default templates updated: includes `#️⃣ Session #{number} (until {periodEnd})`
- i18n: added `periodStart`, `periodLength`, `periodDefault`, `periodOptional` keys (en + ar)
- All consumers updated: Dashboard, Schedule, Sessions, Clients all use `getClientPeriod` for ordinals
- Bug fix: `getClientPeriod` originally gated on `!client.periodStart` — meant PT couldn't reset to default by dropdown alone (date input hard to clear on mobile). Fixed to gate on `!client.periodLength`.
- Bug fix: redundant ternary `diffDays >= 0 ? Math.floor(x) : Math.floor(x)` simplified to `Math.floor(x)`

*Client session history now editable (Apr 4):*
- Clients.jsx expanded view: added `EditableFocus` component (imported from Sessions.jsx pattern)
- Focus tags and session notes visible and editable in client month history
- Imports added: `FOCUS_TAGS` from utils.js

**Active session glow: blue to amber (Apr 4):**

*card-now hue changed from blue to amber/yellow:*
- Dark: `background: rgba(37,99,235,0.15)` -> `rgba(245,158,11,0.12)`, border `rgba(37,99,235,0.5)` -> `rgba(245,158,11,0.45)`, `box-shadow` blue -> amber
- Light: `background: rgba(37,99,235,0.25)` -> `rgba(245,158,11,0.18)`, border/shadow same amber treatment
- Dashboard.jsx: `borderInlineStart` active color `#2563EB` -> `#F59E0B`
- **Why:** Pierre requested yellow for active sessions. Amber (#F59E0B) distinguishes "happening now" from the blue accent system used everywhere else -- blue means "selected/active UI element," amber means "this session is in progress right now."

**Light theme contrast + glossy nav (Apr 4):**

*Nav/header glass - glossier, more transparent:*
- `.theme-light .header` / `.nav`: `rgba(30,64,175,0.25)` -> `rgba(30,64,175,0.15)` (more transparent)
- `backdrop-filter: blur(20px)` -> `blur(28px) saturate(1.4)` (stronger frosted glass effect)
- Border alpha reduced `0.15` -> `0.12` to match lighter glass

*Stat cards - more solid accent fills:*
- `.stat-clients`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- `.stat-today`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- `.stat-week`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- Base `.stat-card` also boosted `0.5/0.3` -> `0.6/0.4`
- `.stat-label` color `0.55` -> `0.65`

*Muted text - stronger contrast across the board:*
- CSS vars: `--t4` `0.4` -> `0.5`, `--t5` `0.3` -> `0.42`, `--sep` `0.06` -> `0.08`
- `.logo-sub` `0.55` -> `0.65`
- `.app-version` `0.35` -> `0.45`
- `.nav-btn` `0.6` -> `0.7`
- `.meta` `0.5` -> `0.6`
- `.client-phone` `0.45` -> `0.55`
- `.client-notes` `0.4` -> `0.5`
- `.session-count` `0.4` -> `0.5`
- `.empty` `0.4` -> `0.5`
- `.success-detail` `0.5` -> `0.6`
- `.setup-sub` `0.45` -> `0.55`
- `.field-label` `0.55` -> `0.65`
- `.focus-notes::placeholder` `0.25` -> `0.35`
- `.modal-close` `0.4` -> `0.5`
- `.week-nav-label` `0.65` -> `0.7`

*Toggle buttons (Ar/En, Lit/Drk) - more visible:*
- Background: `rgba(255,255,255,0.15)` -> `rgba(255,255,255,0.25)` + added `border: 1px solid rgba(30,27,75,0.08)`
- Inactive text: `rgba(30,27,75,0.35)` -> `rgba(30,27,75,0.55)`
- Active: `color: #2563EB` -> `color: #1D4ED8` (deeper), `background: rgba(37,99,235,0.15)` -> `0.2`

**Code review cleanup (Apr 4):**

*Shared components extracted:*
- New `Icons.jsx`: 7 shared SVG icons (WhatsApp, Edit, Trash, Clock, Phone, Chevron, Close) — eliminates 20+ inline SVG duplications across Dashboard, Schedule, Clients, Modal
- New `CancelPrompt.jsx`: shared cancel session modal (count/forgive) — removes identical copy-paste from Dashboard.jsx and Schedule.jsx
- Modal.jsx: inline close SVG → `<CloseIcon />` import

*Native dialogs replaced with themed UI:*
- Clients.jsx: `confirm('Delete this client...')` → in-app modal with `deletePrompt` state, translated strings, styled danger button
- General.jsx: all 5 `alert()` calls → `notification` state with auto-dismiss banner (4s timeout), success (green) / error (red) styling
- `restoredInfo` i18n key now includes `{clients}` and `{sessions}` placeholders for dynamic restore counts

*i18n gaps closed:*
- TokenSetup.jsx: fully i18n'd (was entirely English) — added `tokenSubtitle`, `tokenPlaceholder`, `tokenConnect`, `tokenConnecting`, `tokenInvalid`, `tokenFailed` keys
- "at" date-time connector: hardcoded English "at" → `t(lang, 'at')` in Dashboard and Schedule action sheet modals
- App.jsx: passes `lang` prop to TokenSetup

*Variable shadowing fixed (documented trap):*
- utils.js: 5 instances of `.map(t =>` / `.filter(t =>` / `.find(t =>` renamed to `todo` / `stype`
- Sessions.jsx: 3 instances of `SESSION_TYPES.find(st =>` and `.map(st =>` renamed to `stype`
- All components now use `stype` for session types, `todo` for todo items, `tm` for times, `tb` for tabs

*RTL and theme fixes:*
- Clients.jsx chevron icon: `marginLeft: 6` → `marginInlineStart: 6` (fixes RTL)
- Dashboard.jsx stat cards: removed inline `style={{ background, border }}`, added CSS classes (`stat-clients`, `stat-today`, `stat-week`) so light theme overrides work
- styles.css: added `.stat-clients`, `.stat-today`, `.stat-week` with per-card accent colors + `.theme-light` overrides

*Docs:*
- instructions-v2.4.md: fixed "v2.3 button" → "v2.4 button"
- CLAUDE.md: marked 5 fixed issues, added Icons.jsx + CancelPrompt.jsx to project structure, updated variable shadowing trap description

**Post-deploy refinement (Apr 3, 3 rounds + Apr 4, 3 rounds):**

*Round 1 — visual feedback fixes:*
- Light theme cards: `rgba(255,255,255,0.72)` white → `rgba(219,234,254,0.55)` soft blue (white hurt eyes)
- Light theme card border: `rgba(30,27,75,0.07)` → `rgba(37,99,235,0.08)` blue tint
- Light theme inputs: `rgba(255,255,255,0.7)` → `rgba(237,244,254,0.6)` blue-tinted
- Notes focus hue: `0.08` → `0.15` background, `0.25` → `0.35` border, added `color: #60A5FA`
- Notes has-content hue: `0.06` → `0.12` background, `0.15` → `0.25` border, added `color: #60A5FA`
- Light theme notes: added explicit `.focus-notes:focus` and `.focus-notes.has-content` overrides with `color: #2563EB`
- Stat cards: gradient opacity ~3x (hex `15/08` → `30/18`), borders `25` → `35`
- "This Week" stat: changed from purple `#8B5CF6` to green `#10B981` for color variety

*Round 2 — header/nav strips:*
- Light theme header: added `background: rgba(191,219,254,0.65)` + `backdrop-filter: blur(20px)` (was transparent/white, clashed with blue cards)
- Light theme nav: `rgba(255,255,255,0.82)` white glass → `rgba(191,219,254,0.65)` blue glass (matched header)
- Dark theme header: added `background: rgba(37,99,235,0.06)` + `backdrop-filter: blur(20px)` (was transparent, indistinguishable from nav)

*Round 3 — blue background and coherence:*
- Light theme background: `#E2E0DB → #CDCAC4` beige gradient → `#C7D2E4 → #ADBDD4` blue-toned gradient
- Light theme header/nav: strengthened from `rgba(191,219,254,0.65)` → `rgba(171,205,252,0.7)` (differentiate from new blue bg)
- Light theme header/nav border: `rgba(37,99,235,0.1)` → `rgba(37,99,235,0.12)`
- Dark theme nav: `rgba(15,15,15,0.97)` near-black → `rgba(37,99,235,0.06)` blue glass (matched header)
- Stat cards: opacity boosted again (hex `30/18` → `50/30`, borders `35` → `55`) to stand out on blue canvas

*Round 4 — deep blue canvas (Apr 4):*
- Light theme background: `#C7D2E4 → #ADBDD4` → `#8B9FC0 → #6F87AC` deep steel blue
- Light theme header/nav: `rgba(171,205,252,0.7)` → `rgba(30,64,175,0.3)` darker blue, more transparent glass
- Light theme cards: `rgba(219,234,254,0.55)` → `rgba(96,165,250,0.3)` #60A5FA-based blue
- All light theme elements adjusted for darker canvas (inputs, tags, filters use white+blue glass)
- Modal: white → blue-tinted `rgba(220,232,250,0.97)`

*Round 5 — contrast fix (Apr 4):*
- Light theme background: `#8B9FC0 → #6F87AC` → `#94A8C8 → #788DB4` (slightly lighter to break monotone)
- Light theme cards: `rgba(96,165,250,0.3)` → `rgba(210,228,255,0.55)` opaque white-blue (breaks monotone)
- Light theme stat cards: matched card treatment
- Light theme nav buttons: boosted from `0.45` → `0.6` opacity
- Light theme nav active: `#2563EB` → `#1D4ED8` (deeper for light canvas)
- Dark theme nav inactive: `0.55` → `0.75` opacity (much more readable)
- Dark theme nav active: `#2563EB` → `#60A5FA` (brighter on dark)

*Round 6 — dark nav active strength (Apr 4):*
- Dark theme nav active: `#60A5FA` → `#3B82F6` (blue-500, not pale, not invisible — just right)
- Active dot matches `#3B82F6`

**What changed:**

*Light theme redesign — layer separation:*
- Background: `#E8E6E1 → #D8D4CD` warm beige changed to `#E2E0DB → #CDCAC4` cooler grey
- Cards: `rgba(255,255,255,0.4)` → `rgba(255,255,255,0.72)` near-opaque white
- Card shadows: `rgba(30,27,75,0.06)` → `rgba(30,27,75,0.1)` real depth
- Nav: `rgba(232,230,225,0.97)` opaque beige → `rgba(255,255,255,0.82)` white glass with `backdrop-filter: blur(20px)`
- Nav shadow: `0 -2px 8px rgba(0,0,0,0.05)` → `0 -2px 12px rgba(30,27,75,0.08)`
- Modals: `#E8E6E1 → #DEDBD5` beige → `rgba(255,255,255,0.95) → rgba(248,247,245,0.97)` white
- Inputs: `rgba(255,255,255,0.4)` → `rgba(255,255,255,0.7)` clean white
- Focus notes: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.6)`
- Setup card: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.7)`
- Card-now glow shadow: `0.15` → `0.2` opacity
- Card press: `background` change → `translateY(1px)` + shadow reduction
- Button press: added `rgba(30,27,75,0.08)` override for secondary/ghost
- Stat cards: added `linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.01))`

*Micro-polish — transitions (both themes):*
- `.card`: `transition: background 0.2s` → `background 0.2s, box-shadow 0.2s, transform 0.2s`
- `.focus-tag`: added `transition: all 0.15s ease`
- `.badge`: added `transition: background 0.2s, color 0.2s`
- `.filter-btn`: added `transition: all 0.15s ease`
- `.week-day`: added `transition: all 0.15s ease`

*Micro-polish — button/card press (both themes):*
- `.btn-primary:active` etc: added `box-shadow: 0 1px 4px`, `filter: brightness(0.92)`
- `.btn-secondary:active`, `.btn-ghost:active`: added `background: rgba(255,255,255,0.12)`
- `.card.card-tap:active`: `background` change → `translateY(1px)` + `box-shadow: 0 1px 4px`

*Nav active indicator:*
- `.nav-btn.active::after`: 4px blue dot below active tab label

*Modal spring:*
- `animation: slideUp 0.3s ease` → `slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`

*Stat cards:*
- Added `background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))` + border

*Session notes blue hue:*
- New CSS: `.focus-notes:focus` blue tint, `.focus-notes.has-content` blue persists
- Dashboard.jsx, Schedule.jsx, Sessions.jsx: `className` includes conditional `has-content`
- `onBlur` handler toggles `.has-content` class via `classList.toggle()`

*Elastic overscroll:*
- `initElasticScroll()` in utils.js: passive touch event handlers on `.content` div
- Pull curve: `sqrt(absDistance) * 4`, capped at 120px — stronger initial response than linear
- Bounce-back: `0.5s cubic-bezier(0.34, 1.56, 0.64, 1)` — same spring as modal, visible overshoot
- Wired in App.jsx via `useEffect` + `useRef` on the content container
- **Reverted:** non-passive `touchmove` + `preventDefault()` + `overscroll-behavior: none` broke the effect on Android Chrome. Passive listeners with browser native overscroll intact are the working approach.
- Notes textareas also have `key={session.sessionNotes}` to fix the `defaultValue` stale DOM trap on external sync updates

*Session notes expand/collapse:*
- All `.focus-notes` textareas: `readOnly` + `max-height: 32px` + `overflow: hidden` by default
- `onFocus`: removes `readOnly`, adds `.editing` class → `min-height: 80px` + `max-height: 120px` + `overflow-y: auto`
- `onBlur`: restores `readOnly`, removes `.editing` → collapses back to single line
- Transition: `max-height 0.25s ease` for smooth expand/collapse
- Applied in Dashboard.jsx, Schedule.jsx, Sessions.jsx

*Haptic feedback:*
- New `haptic()` helper in utils.js: `navigator.vibrate?.(ms)` with try/catch
- Wired into: App.jsx (nav tabs), Dashboard.jsx (complete, cancel, focus tags), Schedule.jsx (complete, cancel, focus tags), Sessions.jsx (focus tags, filter tabs), Clients.jsx (delete), General.jsx (todo checkbox)

*Dumbbell logo:*
- App.jsx SVG: replaced tall vertical rectangles with horizontal bar + stacked plates
- `strokeWidth` 2.5 → 2 for cleaner look

*Auto-complete delay:*
- App.jsx line ~62: `timeToMinutes(s.time) + (s.duration || 45)` → `+ 60` added
- Today's sessions get 1hr buffer; previous days still complete immediately

*Version:*
- v2.3 → v2.4 in header label

**Why — Light theme redesign:**
Pierre found the light theme "inferior to the dark." Diagnosis: everything blended — cards, nav, modals, and background were all warm beige at similar opacity. The fix creates clear visual layers: cooler background provides contrast canvas, near-opaque white cards float with real shadows, nav gets iOS-style white glass with blur, modals are white overlays distinct from the page. The dark theme works because light on dark is inherently contrasty; the light theme now achieves contrast through white-on-grey layering + shadows.

**Why — Micro-polish:**
Pierre's goal: "maximum sophistication... Apple achieved superiority in UX." The individual changes are small (transitions, press effects, a dot, a spring curve) but they compound. When every interaction responds fluidly instead of snapping, the app feels crafted rather than assembled. Performance cost is near zero — all CSS transitions, no JS animation loops.

**Why — Session notes blue hue:**
Pierre's idea. Focus tags already go blue when active — notes should match. The persistent blue hue on non-empty notes provides an information signal: scanning session cards, you can instantly see which ones have notes recorded without reading the content.

**Why — Haptic feedback:**
Pierre's idea. `navigator.vibrate()` works on Android only (iOS Safari doesn't support it). The PT uses iPhone so he won't feel it, but Pierre tests on Android and can demo it. Zero cost on unsupported devices — the helper is a one-liner with optional chaining.

**Why — Dumbbell logo:**
Pierre: "I thought it was a gallon of water." The old SVG's proportions (tall narrow rectangles) didn't read as a dumbbell at 24px. The new design uses the classic horizontal silhouette that's recognizable at any size.

**Why — Auto-complete delay:**
Pierre's idea. The PT sometimes needs to cancel a no-show, but if the session auto-completes the moment it ends, the PT has to undo the completion. A 1-hour buffer gives time to mark the cancellation naturally. Previous days still auto-complete immediately on app load (no stale scheduled sessions from yesterday).

**Files changed:** `src/styles.css`, `src/App.jsx`, `src/utils.js`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.3.2 — Visual Polish: Solid Badges, Indigo Light Theme, Depth (2026-04-03)

**What changed:**

*Status badges — CSS classes replace inline styles:*
- New CSS classes: `.badge-scheduled` (blue), `.badge-completed` (blue), `.badge-confirmed` (green), `.badge-cancelled` (red) — all solid fill, white text
- All 6 badge instances across Dashboard.jsx, Sessions.jsx, Clients.jsx, Schedule.jsx changed from `style={{ color: status.color, background: status.bg }}` to `className={`badge badge-${session.status}`}`
- `getStatus()` still used for translated label text, but its color/bg fields are no longer used in rendering

*Filter tabs:*
- `.filter-btn.active` changed from blue outline + tinted bg to solid `#2563EB` bg + white text (both themes)

*Delete buttons:*
- `.btn-danger-sm` changed from faint red tint (`rgba(239,68,68,0.1)` bg, red border, red icon) to solid `#EF4444` bg + white icon
- Dashboard.jsx and Schedule.jsx trash icons changed from `btn-icon` to `btn-danger-sm` (matches Clients.jsx)

*Light theme — indigo text:*
- Base text color: `#1A1A2E` → `#1E1B4B` (Tailwind indigo-950)
- All `rgba(0,0,0,...)` in `.theme-light` rules → `rgba(30,27,75,...)` for indigo tint (except `.modal-bg` which stays black for overlay effect)
- CSS vars: `--t1` through `--t5` and `--sep` all use indigo base
- Logo gradient: `#1A1A2E, #444` → `#1E1B4B, #3730A3` (indigo gradient)

*Card depth:*
- Base `.card` gets `box-shadow: 0 2px 8px rgba(0,0,0,0.15)` (dark theme)
- `.theme-light .card` gets `box-shadow: 0 2px 8px rgba(30,27,75,0.06)` (light theme)
- `.theme-light .card.card-now` shadow updated to `0 2px 12px rgba(37,99,235,0.15)`
- `.theme-light .nav` gets `box-shadow: 0 -2px 8px rgba(0,0,0,0.05)` for top shadow
- Light theme card bg: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.4)` (slightly more opaque)
- Light theme card border: `rgba(0,0,0,0.06)` → `rgba(30,27,75,0.07)` (slightly stronger)

**Why — Solid badges:**
The old "colored text on pastel background" badges (e.g., grey `#6B7280` on `#F3F4F6` for Completed) washed out completely in the warm stone light theme. The pastel backgrounds were nearly invisible against the warm grey app background. Solid fills with white text provide consistent contrast in both themes. CSS classes rather than inline styles allow theme-specific overrides without passing theme to utility functions.

**Why — Indigo text:**
Pierre found the light theme "bland" compared to the dark theme which has good contrast and character. Pure black text on warm stone is flat. The indigo tint (`#1E1B4B` / `rgba(30,27,75,...)`) adds a subtle blue-purple warmth that complements the warm stone background and creates visual identity. The effect is most noticeable on headings and bold text; body text at lower opacity reads as a warm grey.

**Why — Card shadows:**
The dark theme naturally has depth because lighter cards float on a dark background. The light theme lacked this — cards blended into the background. Adding `box-shadow` creates the layered "3D" effect Pierre wanted. Dark theme gets a stronger shadow (higher opacity) since it's on a dark bg; light theme gets a softer one using the indigo base for color consistency.

**Files changed:** `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/Schedule.jsx`

---

## v2.3.1 — Bug Fix Round + Code Review (2026-04-03)

**What changed:**

*Timezone / date handling:*
- New `localDateStr(d)` and `localMonthStr(d)` helpers in utils.js — format Date objects using local time
- `today()` and `currentMonth()` now use these helpers
- Clients.jsx: `viewMonth` init, `shiftMonth()`, and `toggleExpand()` all switched from `toISOString().slice()` to `localMonthStr()`
- Schedule.jsx: `weekDates` generation and week navigation switched from `toISOString().split('T')[0]` to `localDateStr()`
- Schedule.jsx: `createdAt` on new sessions switched from `toISOString()` to `localDateStr()`
- Dashboard.jsx: "This Week" stat switched from fractional day math `(d - now) / 86400000` to date string comparison `s.date >= todayStr && s.date <= localDateStr(weekEnd)`

*Sync reliability:*
- `pushRemoteData()` in sync.js now accepts `_retries` param, capped at 3 (was infinite recursion on 409)
- App.jsx: `pushRemoteData` replaced with `debouncedSync()` (1 second debounce via `setTimeout`)

*Auto-complete batching:*
- New `BATCH_COMPLETE` reducer case in utils.js — takes array of IDs, marks all completed in one pass
- App.jsx: auto-complete effect collects lapsed IDs then dispatches one `BATCH_COMPLETE` instead of N `UPDATE_SESSION`s

*i18n:*
- New `getStatus(status, lang, tFn)` helper in utils.js — returns `{color, bg, label}` with translated label
- All components (Dashboard, Schedule, Sessions, Clients) switched from `STATUS_MAP[status]` to `getStatus(status, lang, t)`
- Status badge labels ("Scheduled", "Completed", etc.) now show in Arabic when language is set to Arabic

*Variable shadowing cleanup (all components):*
- `.find(t =>` → `.find(st =>` for SESSION_TYPES lookups
- `.map(t =>` → `.map(st =>` for SESSION_TYPES dropdowns, `.map(tm =>` for TIMES
- `.filter(t =>` → `.filter(f =>` for focus tag filtering
- `tabs.map(t =>` → `tabs.map(tb =>` in App.jsx nav

*RTL:*
- App.jsx: toggle container inline style `marginLeft: 'auto'` → `marginInlineStart: 'auto'`

*Other:*
- Schedule.jsx: removed unused `useRef`, `useEffect` imports
- General.jsx: new todos initialize with explicit `done: false`
- General.jsx: WhatsApp template textareas get `key` prop tied to state value, forcing remount on reset
- `STATUS_MAP` export retained for backward compat but components use `getStatus()`

**Why — Timezone:**
`toISOString()` converts to UTC. Midnight in Beirut (UTC+3) = 21:00 previous day UTC. When the result is sliced to `YYYY-MM`, the month is wrong. The `today()` function was already fixed in a prior session but the same pattern existed in 8 other locations — Clients month nav, Schedule week nav, Dashboard week stat, and session createdAt. The fix was applied in one place without auditing the rest of the codebase. This incident established the review discipline: when fixing a pattern bug, audit every file.

**Why — Debounced sync:**
Every `dispatch()` triggers a state change, which triggers `pushRemoteData`. Tapping 3 focus tags + typing notes = 4+ API calls in seconds. The 1s debounce coalesces these into a single push. localStorage save remains immediate (no data loss risk if the tab closes).

**Why — Batch auto-complete:**
N lapsed sessions = N dispatches = N state changes = N debounced syncs = N re-renders. With `BATCH_COMPLETE`, it's 1 dispatch = 1 re-render = 1 sync push.

---

## v2.3 — Blue Accent, Warm Light Theme, Todo Checkboxes (2026-04-03)

**What changed:**
- All `#E8453C` (red) and `#FF6B6B` (light red) accent references in CSS replaced with `#2563EB` / `#60A5FA` (blue)
- All `rgba(232,69,60,...)` replaced with `rgba(37,99,235,...)`
- `.setup-error` kept as `#EF4444` (error red, not accent)
- Strength session type color changed from `#E8453C` to `#6366F1` (indigo) in `SESSION_TYPES`
- Light theme background: `#E8E6E1` → `#D8D4CD` warm stone gradient (was harsh `#F8F9FA` white)
- Light theme cards: `rgba(255,255,255,0.35)` subtle frosted (was `rgba(0,0,0,0.03)` transparent)
- Light theme nav: warm `rgba(232,230,225,0.97)` matching background
- Light theme modal: warm `#E8E6E1` → `#DEDBD5` gradient
- Light theme inputs/textareas: `rgba(255,255,255,0.4)` warm frosted
- Removed `.theme-light .logo-icon` override — base logo is now blue, same both themes
- Header: lang/theme toggles wrapped in `flex-direction: column` container
- Toggle spans: `width: 36px; text-align: center` for fixed-width alignment
- Dashboard stat card "Clients" changed from `#E8453C` to `#6366F1` (indigo)
- Dashboard `isNowSession` border changed from `#E8453C` to `#2563EB`
- Cancel button color changed from `#E8453C` to `#EF4444` (standard danger red)
- New `TOGGLE_TODO` reducer case: flips `done` boolean on todo items
- General.jsx: added checkbox SVG button before each todo item with done/undone toggle
- Done items render with `text-decoration: line-through; opacity: 0.5`

**Why — Blue accent:**
The PT and Pierre both found the red accent too aggressive. Blue is calmer and works better in both dark and light themes. The light theme was already blue (v2.2 shipped with blue light theme), so aligning the dark theme creates visual consistency. Session type colors (indigo, blue, purple, amber, green, grey) remain distinct for differentiation.

**Why — Warm light theme:**
The v2.2 light theme used near-white backgrounds (#F8F9FA) which was painful in bright environments. The warm stone palette (#E8E6E1 area) reduces glare while maintaining readability. Subtle frosted cards (`rgba(255,255,255,0.35)`) blend with the background rather than creating jarring white rectangles.

**Why — Todo checkboxes:**
The PT was manually typing "Done" at the end of todo items because there was no way to mark them complete. The `done` boolean field is backward-compatible — existing todos without it default to `false` via the `!t.done` toggle.

---

## v2.2 — Arabic, Light Theme, Editable WhatsApp Messages (2026-04-03)

**What changed:**
- New `src/i18n.js` — ~100 translation keys in English and Arabic, `t(lang, key)` lookup function, `dateLocale(lang)` helper
- All components accept `lang` prop and use `t()` for all user-facing strings
- `dir="rtl"` applied to app container when Arabic selected
- `formatDate` and `formatDateLong` accept optional `lang` param for locale-aware dates (ar-LB / en-US)
- `DEFAULT_TEMPLATES` restructured to `{ en: { booking, reminder }, ar: { booking, reminder } }`
- `sendBookingWhatsApp` / `sendReminderWhatsApp` accept `lang` param to pick correct default template
- New `SET_TEMPLATES` reducer case + `messageTemplates` field in state (synced, backed up, merged)
- General.jsx: new "WhatsApp Messages" section with editable textareas for booking/reminder templates
- `borderLeft` replaced with `borderInlineStart` across all session card inline styles for RTL
- RTL CSS overrides: logo stays LTR (brand name), inputs/notes right-aligned, lang toggle margin flipped
- Light theme: `.theme-light` class on app-container, ~70 CSS overrides swapping dark→white bg and red→blue (#2563EB) accent
- Lit/Drk toggle in header, persisted to localStorage (`ptapp-theme`)

**Why — Full i18n:**
The PT's clients speak Arabic. WhatsApp messages in English feel out of place. Pierre requested Arabic notifications as a future item — the Ar/En toggle was already in place, so wiring translations was the natural next step. The `t()` function falls back to English if a key is missing, so adding Arabic can't break the English UI.

**Why — Editable templates:**
The WhatsApp messages were hardcoded by the developer. The PT should own his client communication — tone, emoji, wording. Storing templates in state means they sync between devices (PT's iPhone and Pierre's Android see the same messages).

**Why — Light theme:**
Some users prefer light themes, especially outdoors in bright light. The blue accent distinguishes it visually from the dark theme's red. Both preferences persist independently via localStorage.

**Files changed:** `src/i18n.js` (new), `src/App.jsx`, `src/utils.js`, `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.1 — Streamlined Workflow, Readability, Language Toggle (2026-04-03)

**What changed:**
- Removed "✓ Confirm" button from Schedule.jsx, Dashboard.jsx (expanded + action sheet)
- Removed "Confirmed" stat card from Dashboard overview (now 3 cards: Clients, Today, This Week)
- Removed `confirmed` from Sessions.jsx filter row
- Auto-complete: new `useEffect` in App.jsx marks scheduled/confirmed sessions as completed when their end time (start + duration) has passed
- Sessions.jsx: completed sessions now show `EditableFocus` component (tappable tags + notes textarea) instead of read-only display
- All text opacity bumped across CSS and inline JSX — values like 0.25→0.4, 0.3→0.5, 0.35→0.5, 0.4→0.55, 0.5→0.65
- Ar/En language toggle in App.jsx header — `lang` state persisted to localStorage (`ptapp-lang`)
- New `EDIT_TODO` reducer case in utils.js
- Todo items in General.jsx now editable inline (tap to switch to input, blur/Enter to save)

**Why — Remove confirmation:**
The PT never uses the Confirm step. Sessions go scheduled→completed in practice. Hiding it removes a button that adds friction without value. The `confirmed` status still exists in STATUS_MAP for backward compatibility with existing data.

**Why — Auto-complete:**
The PT doesn't bother tapping "Complete" after each session — he's busy training. Sessions from yesterday or earlier today were stuck on "Scheduled" indefinitely. Auto-completing when the session's end time passes makes the workflow organic. If a session needs cancelling, that option remains available.

**Why — Readability bump:**
The dark theme's secondary text was too faint (0.25–0.35 opacity) to read in bright environments like a gym. Systematic bump of all text opacity values while maintaining visual hierarchy.

**Files changed:** `src/App.jsx`, `src/utils.js`, `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.0 — Nicknames, General Panel, Backup & Docs (2026-04-02)

**What changed:**
- New `nickname` field on clients — auto-populated with first name, used in WhatsApp messages (`friendly(client)` helper)
- `capitalizeName()` utility capitalizes each word in a name
- Data schema v2: migration capitalizes existing names and populates nicknames
- New `General.jsx` component — modal panel with backup/restore and documentation links
- ⋮ button added to app header (next to version label) to open General panel
- Backup section removed from Clients.jsx — moved to General panel
- Documentation links point to versioned instructions and changelog on GitHub

**Why — Nicknames:**
WhatsApp messages used the client's full name ("Hi Ahmad Khalil!") which felt impersonal. The PT knows clients by first name. Auto-populating the nickname with the first name means zero extra work for the PT, but he can customize it if a client goes by something else.

**Why — General panel:**
The backup section in Clients felt out of place — it's not client-specific, it's app-wide. Moving it behind a ⋮ menu keeps Clients focused on client management. The panel also houses documentation links so the PT can find instructions without Pierre.

**Why — Name capitalization:**
The PT typed names inconsistently (some lowercase, some mixed). Auto-capitalizing on blur and migrating existing names ensures everything looks clean.

**Files changed:** `src/components/General.jsx` (new), `src/App.jsx`, `src/components/Clients.jsx`, `src/utils.js`

---

## v1.9.2 — Restore Cancelled Sessions (2026-04-02)

**What changed:**
- Cancelled sessions on Schedule tab now show "↩ Restore" button (sets status back to `scheduled`)
- Cancelled sessions on Sessions tab show both "↩ Restore" and "✅ Complete" buttons
- Sessions tab default filter changed from `active` to `scheduled`
- Sessions component now accepts `dispatch` prop (was read-only before)

**Why:**
The PT accidentally cancelled Pierre's session that was already completed with notes and focus tags. The data was preserved (cancellation doesn't delete anything) but there was no UI to undo it. Status changes were one-way: you could cancel but never un-cancel.

**Design decision:**
- Restore sets status to `scheduled` (not back to whatever it was before) — simplest approach, and the PT can then Confirm/Complete as normal
- "Complete" button offered directly on cancelled cards in Sessions tab — saves a step for the common case of "I cancelled this but it actually happened"
- Dashboard expanded view still filters out cancelled sessions (correct — they're not active today)
- Notes, focus tags, and all session data are fully preserved through cancel→restore

**Why default to Scheduled:**
Pierre requested it — the Sessions tab should show what's coming up, not everything. Cancelled sessions cluttering the default view was annoying.

---

## v1.9.1 — Offline Support, Session Highlight, Client History (2026-04-02)

**What changed:**
- Service worker (`public/sw.js`) caches the app for offline use. Network-first for HTML, caches fonts too.
- Google Fonts `<link>` made non-blocking with `media="print" onload="this.media='all'"` — app renders instantly without internet.
- Current session highlight upgraded from invisible 1px box-shadow to visible red tint + border + glow. Now highlights ALL concurrent sessions, not just the first (`findIndex` → `isNowSession` function).
- `#N` on session cards changed from total monthly count to sequential ordinal (1st, 2nd, 3rd session that month). New `getSessionOrdinal()` in utils.js.
- Focus tags no longer cleared on session type change — hidden when viewing different type, restored when switching back.
- Sessions tab defaults to "Active" filter (everything except cancelled). New "Active" button added.
- Client cards on Clients tab are expandable — tap to see monthly session history with month navigator, summary counts, and session list.
- `.gitattributes` added to normalize line endings to LF (silences CRLF warnings on Windows).

**Why — Offline:**
Internet connectivity in Beirut is unreliable. The PT needs the app to work when his connection drops. Service worker with network-first strategy means: online = fresh version, offline = cached version. Google Fonts degrade gracefully to system fonts.

**Why — Highlight:**
Pierre couldn't see the old highlight (1px at 30% opacity). Cranked it to `rgba(232,69,60,0.15)` background, `0.5` border, `20px` glow. Also fixed: `findIndex` only highlighted the first session at a given time, but group sessions mean multiple sessions run simultaneously.

**Why — Sequential #N:**
Showing "#3" on all three of a client's sessions was confusing. Now they show #1, #2, #3 in chronological order within the month. The booking chip still shows total count (context for "how many sessions so far").

**Why — Focus tag persistence:**
If the PT switches Strength → Cardio to try a tag, then switches back, the Strength tags were wiped. Data loss. Now tags are preserved — different type's tags are just hidden (the `focus` array isn't cleared on type change).

**Why — Client history:**
The PT wanted to see a client's sessions at a glance without switching to the Sessions tab and filtering. Tap the card, see the month, browse history.

**Files changed:** `public/sw.js` (new), `src/main.jsx`, `index.html`, `src/components/Dashboard.jsx`, `src/components/Clients.jsx`, `src/components/Sessions.jsx`, `src/components/Schedule.jsx`, `src/utils.js`, `src/styles.css`, `.gitattributes` (new)

---

## v1.9 — Inline Session Type Selector (2026-04-02)

**What changed:**
- Session type on cards (Schedule + Dashboard expanded view) is now a tappable `<select>` dropdown instead of static text
- Changing the type dispatches `UPDATE_SESSION` with the new type and `focus: []` (clears tags)
- Session notes (`sessionNotes`) are left untouched on type change
- New `.inline-type-select` CSS class makes the dropdown blend with the meta text line

**Why:**
The PT's next session was booked as "Strength" but he might switch to something else during the workout. Before this, changing the type required opening the Edit modal — unnecessary friction for a single-field change. Pierre proposed: tap the type, pick a new one, tags reset, notes stay. Flummox agreed ("one field, three behaviors").

**Implementation:**
- Replaced `{st.emoji} {session.type}` in the meta line with an inline `<select>` in both Schedule.jsx and Dashboard.jsx (expanded view)
- The `onChange` handler dispatches `UPDATE_SESSION` with `{ type: newValue, focus: [] }` — same auto-save pattern as focus tags
- Compact view and Sessions tab remain read-only (display contexts, not working contexts)
- No schema change — `type` is an existing field, `focus` is already an optional array

**No edge cases:** The `st` variable (session type lookup for color/emoji) re-derives from `session.type` on every render, so the card border color and emoji in the dropdown update instantly.

---

## v1.8 — Dashboard Expanded View (2026-04-02)

**What changed:**
- Home tab now defaults to "Expanded" view showing today's sessions with full inline controls: action buttons, focus tags, session notes
- Toggle button switches between Expanded (today's sessions, full cards) and Compact (upcoming 5, tap for action sheet)
- Current/next session gets a subtle red highlight border
- Auto-scroll was added then removed (see below)

**Why:**
Flummox raised a valid point: focus tags were only available on the Schedule tab. If the PT is mid-session on the Home tab and wants to tag what muscle group he's working, he'd have to navigate to Schedule — a dead end in his flow. Pierre agreed and proposed a toggle: expanded (full functionality) as default, compact (overview) as the alternative.

**The auto-scroll saga (Flummox vs. pragmatism):**
Initially added auto-scroll to center the current/next session on screen. Flummox hammered on it:
1. "What if sessions change? Scroll won't re-trigger" — True, but the dependency was `[expanded]` only
2. "New session drops in, highlight jumps, you're scrolled to the old one" — Technically correct
3. "Stale lock! Ticking bomb!" — Dramatic but the scenario requires sessions appearing while the PT stares at Home, which can't happen (single user, local storage)

Pierre's resolution: "Maybe just the highlight is enough?" — Correct. With 5-8 sessions per day, a glowing border is easy to spot. Auto-scroll removed. Less code, zero edge cases.

**Lesson:** Don't build solutions for problems that can't occur. The highlight alone does the job.

---

## v1.7 — Session Focus Tags & Notes (2026-04-02)

**What changed:**
- Tappable focus tags on each session card in Schedule (and now Dashboard expanded)
- Tags vary by session type:
  - Strength: Chest, Back, Shoulders, Arms, Legs, Core, Glutes, Full Body
  - Cardio: Running, Cycling, Rowing, Swimming, Jump Rope, Stairs
  - Flexibility: Stretching, Yoga, Mobility, Foam Rolling
  - HIIT: Upper Body, Lower Body, Full Body, Core, Tabata, Circuit
  - Recovery: Foam Rolling, Stretching, Ice Bath, Light Cardio, Massage
- Free text session notes field (saves on blur)
- Tags and notes show read-only in Sessions tab history

**Why:**
The PT needed to record what was done during sessions. "Strength" alone doesn't tell you if it was chest day or leg day. Pierre asked for subcategories — tappable for speed, varying by session type.

**Design decisions:**
- Tags auto-save on tap — no modal, no save button. One tap = saved. This aligns with the UX principle established in this session: the PT adopted the app because it's frictionless. Any extra step risks losing him.
- Notes field designed for future expansion — the PT can write "Bench press 3x10 80kg" and later we can parse it for detailed weight/rep tracking.
- Flummox worried about accidental taps without confirmation. Pierre's response: a mistap costs one tap to undo. A confirmation dialog costs every user every time. Simplicity wins.

---

## v1.6 — Time Grid, Monthly Count, Cancel Count/Forgive, Client Fields (2026-04-01)

**What changed:**
- Default session duration changed from 60 to 45 minutes
- Time picker replaced with a visual 4-column grid (was a `<select>` dropdown)
  - Occupied slots show red with client name
  - Still allows booking on occupied slots (group sessions, overlaps are the PT's call)
- Monthly session count (#N) shown on session cards and booking chips
- Cancel flow changed from delete to "Count or Forgive" prompt
- Gender and birthdate fields added to client profiles (optional)

**Why — Time grid:**
Pierre wanted conflict awareness when booking. Flummox flagged that iOS Safari ignores `<option>` styling — you can't color individual dropdown options on iPhone. Solution: replace the `<select>` with a tappable button grid. Same data, full styling control.

**Why — Monthly count:**
The PT gets paid a lump sum per month for a set number of sessions (typically 10). The counter tracks how many sessions each client has used. Shows on every session card so the PT always knows the tally.

**Why — Cancel count/forgive:**
Before v1.6, cancelling deleted the session entirely. Problem: if a client no-shows, the PT still needs that session to count against their monthly quota. Now cancelling keeps the record and asks:
- "Count" — no-show or late cancel, counts toward monthly total
- "Forgive" — legitimate cancel with proper notice, doesn't count

**Why — Default 45min:**
Pierre's PT does 45-minute sessions by default, not 60.

**Status workflow decision:**
Pierre raised a key question: what if the PT never taps Confirm or Complete? Sessions just sit at "Scheduled" forever. Decision: everything counts regardless of status. The only thing that reduces the count is a forgiven cancellation. Confirm/Complete are optional — may be simplified or removed later.

---

## v1.5 — Multi-Client Session Booking (2026-04-01)

**What changed:**
- Booking form now supports selecting multiple clients
- Client dropdown uses "add to list" pattern: pick a client, chip appears, dropdown resets
- Each chip has an X to remove; already-selected clients hidden from dropdown
- Book button shows count: "Book Session (3 clients)"
- Creates N independent sessions (one per client) — identical to booking separately
- WhatsApp confirmation cycles through clients one by one: (1/3), (2/3), (3/3)
- Edit mode stays single-client (each session is independent)

**Why:**
The PT sometimes trains multiple clients at the same time slot. Before this, he had to create each session individually with the same date/time/type — repetitive and slow. This is purely a workflow shortcut; the end result is identical to manual booking.

**Design decision — approach:**
Three approaches were considered:
1. **Multi-select in form (chosen)** — Single change point, zero schema changes
2. **"Book for another client" button after booking** — More taps, doesn't feel like one action
3. **Duplicate session action** — Useful but doesn't solve the original ask

**Design decision — UI:**
Pierre rejected the initial proposal of checkboxes/chips with a search filter. His feedback: "the current way works well, click button, add client. In multi, click the button again add another client." Keeping the existing dropdown and just adding chips was simpler and consistent with what the PT already knows.

**Data model:**
No schema change. Each session still has a single `clientId`. The multi-select is purely a UI convenience that dispatches `ADD_SESSION` N times.

---

## Pre-v1.5 — Foundation

The app existed before this changelog. Key facts:
- Single-page React app, Vite build, pure CSS dark theme
- GitHub Pages deployment (single HTML file via vite-plugin-singlefile)
- localStorage for data, WhatsApp via wa.me links
- Bottom tab navigation: Home, Clients, Schedule, Sessions
- The PT adopted the app immediately and booked all his clients through it from day one

---

## Principles Established

These emerged from the development process and guide future decisions:

1. **UX simplicity is the priority.** The PT adopted the app because it's simple and inviting. Every feature must pass the "does this add friction?" test. Auto-save, single-tap actions, minimal steps.

2. **Don't build for scenarios that can't happen.** Single user, local storage, single device. Don't add complexity for multi-user edge cases that don't exist yet.

3. **Ship and observe.** When unsure about a feature's placement or behavior, ship the simplest version and watch how the PT actually uses it. Real usage beats assumptions.

4. **Flummox is useful.** The octopus catches real issues (iOS dropdown styling, scroll edge cases) mixed with overthinking. Filter accordingly.

5. **Everything counts.** Sessions count toward the monthly total regardless of status. Only forgiven cancellations reduce the count. The PT won't consistently tap Confirm/Complete — don't depend on it.
