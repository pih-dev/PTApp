# SpotSet — Design Differentiation Brief

**Written:** 2026-08-21, at Pierre's request, so a later session can start the design work cold.
**Status:** BRIEF ONLY — nothing designed, nothing decided. The design session opens with §5.
**Prerequisite:** this is a *post-Capacitor* workstream. It assumes the native shell (Android live,
iOS in build) because most of the affordances in §4 do not exist in the browser.

---

## 1. Pierre's brief, in his own framing (2026-08-21)

> *"As it is right now, it's great. It looks great, and it performs great. It's very snappy.
> However, now on the apps, Android and Apple, we have more options… I understood from you early on
> that the haptic feedback is more refined on the apps. You have more to work with design wise.
> So it looks great, but it's generic, because Claude generates web pages like this. They all look
> the same. So we need to differentiate it, humanise it… We need a premium looking, well performing,
> sophisticated, original, nice looking app, and user experience."*

**The complaint is not "it's ugly."** It is that the app has no identity of its own — it looks like
the output of a generator, and he can prove it, which is §2.

---

## 2. The evidence — his test case, measured

Pierre asked an unrelated project (`C:/projects/General`, awareness training) for a session-grouping
web page. It came out looking like SpotSet. Both files were measured on 2026-08-21:

| | SpotSet (`src/styles.css`) | Agribond grouping (`PG-Agribond-Session-Grouping-Rev15-20-08-26.html`) |
|---|---|---|
| CSS variable names | `--t1..--t5`, `--sep`, `--card-bg` | `--bg --panel --panel2 --line --ink --dim --dim2 --accent --shadow` |
| Accent | `#2563EB` (Tailwind blue-600) | `#4338ca` (Tailwind indigo-700) |
| Danger / warn / ok | `#EF4444` / `#F59E0B` / `#10B981` | `#c62828`/`#ef4444` · `#f5a623` · `#22a06b` |
| Radius ladder | 8px ×13, 10px ×10, 12px ×5, 16px ×2 | 8px ×9, 12px ×4, 20px ×6, 6–9px ×9 |
| Card idiom | translucent panel + 1px hairline + soft shadow | identical: `--panel` + `--line` + `--shadow` |
| Theme | dark default, light override, same var names swapped | dark default, light override, same var names swapped |

**The finding:** two projects, different domains, different sessions, months apart — and they share
a palette family, a radius ladder, a variable vocabulary and a card idiom. Nothing here is *wrong*;
it is the Tailwind-default aesthetic that every LLM converges on. That convergence is the defect.

**Named, so it can be attacked:** the house style is *Tailwind palette + 8/12px radius ladder +
translucent card on a dark panel + hairline border + soft ambient shadow + system/Google sans*.
Any design pass that keeps all six changes nothing.

### 2b. Third data point — a stranger's transactional email (2026-08-21)

Pierre cancelled an order at **ayoubcomputers.com** (a Lebanese retailer, nothing to do with this
project or with him) and the cancellation email arrived looking like both files above. Observed from
his screenshot:

- Tinted status banner (rose wash) with a circular icon and a **pill status badge** — the same
  `badge badge-<status>` idiom SpotSet uses.
- A **left-accent bar** on the section header ("Order Summary"), and again on each fulfilment card —
  the same 3–4px coloured `border-inline-start` device, one hue per category.
- A **dark panel block** holding light-on-dark cards, inside an otherwise light document.
- A **feature/trust strip** of small emoji + two-line labels across the top.
- Label/value rows with the value right-aligned, hairline separators, 8–12px radii throughout.

**Why this matters more than §2:** the Agribond page came out of the same tooling as SpotSet, so
shared DNA was arguable. This email did not. A third party, a different country's vendor, a
different medium — and the same visual grammar. It confirms the house style is an **industry-wide
LLM default**, not a quirk of one workspace. Escaping it is therefore a differentiation problem, not
a cleanup problem, and copying "what good apps do" will land right back in it.

**Added to the traits list in §2:** pill status badges · coloured left-accent bars · emoji feature
strips · dark-panel-inside-light-document. Any of these surviving the design pass is a warning sign.

---

---

## 3. What must NOT be broken

- **Speed.** He volunteered "very snappy" as praise. A design pass that costs frame rate has failed.
- **Simplicity.** The PT adopted SpotSet *because* it is simple (memory: `feedback_ux_simplicity`).
  Decoration that adds a tap is a regression.
- **The reachability and safe-area rules** in CLAUDE.md TRAPS — bottom-60% tap targets, insets,
  modal z-index, sticky footers. These are accessibility facts, not style.
- **Arabic / RTL.** Every visual idea must survive `marginInlineStart` and a right-to-left mirror.
- **`--t1..--t5` / `--sep`.** Theme-aware vars stay; hardcoded rgba never comes back.

---

## 4. What native buys that the browser did not (the reason this waits for Capacitor)

To be verified against current plugin docs in the design session — listed as candidates, not facts:

- **Haptics** — `@capacitor/haptics`: impact/notification/selection styles. Meaningful on set
  completion, rest-timer end, session confirm. iOS has the richer engine.
- **Real spring physics and 120Hz** — native scroll/transition curves instead of CSS easing.
- **Platform materials** — iOS blur/vibrancy layers, Android Material You dynamic colour.
- **Presentation** — true sheets with detents, large-title navigation, swipe-back edge gesture.
- **System integration** — home-screen widgets, live activity for an in-progress session,
  notification styling, app-icon variants.

---

## 5. The design session's opening questions (do not answer here)

1. **What is SpotSet's one visual idea?** A gym app for a Beirut PT — what is the anchor: the
   plate/dumbbell geometry already in the icon, typography, a signature motion, a colour nobody
   else uses? One idea, not a mood board.
2. **Which of the six house-style traits do we deliberately break**, and what replaces each?
3. **Typography first or colour first?** (Type is the cheapest route out of generic; the app
   currently ships DM Sans.)
4. **How far does the identity go into motion** — is there a signature transition, and what is its
   budget in ms and in frames?
5. **Elie's role.** He holds standing authority and is the daily user. Does he review directions,
   or only the final?
6. **Scope and staging** — one screen as a vertical slice (Dashboard? Session detail?), then roll
   out; never a big-bang restyle.

---

## 6. Where to start reading

- `docs/design-system.md` — the current system, and why each choice was made.
- `docs/project_web_vs_native_visual` equivalent in memory: *CSS ceiling hit at v2.4; ambitious
  visual work waits for Capacitor.* That wait is now over.
- `src/styles.css` — 6 tokens, ~24 gradients, 7 backdrop-filters. The measured surface area.
- The comparison file: `C:/projects/General/awareness-program/grouping/PG-Agribond-Session-Grouping-Rev15-20-08-26.html`

---

## 7. Session 1 decisions (2026-08-21) and what it opened

**Decided in the design session:**
- **Anchor: the plate and the bar.** Plates = the package (filled used / hollow left / all-red spent),
  the bar = every divider. Structure comes from load, so **the card is gone** — no outline, no
  hairline, no ambient shadow. Mockup: the `Plate & Bar` artifact.
- **Vertical slice: the Dashboard**, fully, before any other screen.
- **Material: steel & chalk** — graphite ground, warm chalk text, condensed caps for names, mono
  tabular digits. 🔴 **Accent hue is NOT settled — see §7.1.**
- **Motion: everywhere, but cheap.** Pierre chose breadth over a single signature. Hard constraint
  written into the design: transform/opacity only, ≤200ms, no layout thrash, and **anything that
  cannot hold 60fps on Elie's iPhone is cut, not tuned.** "Very snappy" outranks any transition.
- **Elie: not involved until it ships.** His standing authority is unchanged; this is a
  developer-side quality pass and he receives it as a release.

### 7.1 OPEN — the palette is not the mockup's

🔴 **The mockup's plate red (`#D6382B`) is a placeholder, not a decision.** Pierre is supplying
**two palette references** and leans **blue rather than the orange/red family** — explicitly
*"instead of the orange, which screams Claude"*. That instinct is right and it is the same finding
as §2: warm-accent-on-near-black is itself part of the generated house style.

**What must survive whichever blue is chosen** (these are the reasons the accent worked at all, and
they are hue-independent):
- **The accent is used for load and urgency ONLY, never for chrome.** The moment it decorates a
  button or a header it stops meaning anything.
- **Semantic ok/warn stay separate from the accent.** Three hues doing three jobs.
- 🔴 **Not `#2563EB`.** Returning to Tailwind blue-600 lands straight back in §2's evidence table.
  A blue direction has to be a *specific* blue with a reason — not the framework default.

**Task:** ingest the two references, extract 4–6 named values each, and test both against the
Dashboard mockup before choosing. Reference images land in `_archive/PTApp/design-references/`.

### 7.2 OPEN — 🔴 THE LOGO IS NOT DECIDED, AND THE CURRENT ONE IS A PLACEHOLDER

Pierre's correction, and it matters: **the icon the plate-and-bar anchor was read off is a TEMP
logo.** It was made for the Play listing under time pressure (v2.15.0, white barbell glyph on the
blue gradient, `_archive/PTApp/branding/make_icon.py`), and **no logo has ever been designed.**

- **The anchor survives the correction.** Plate-and-bar is gym geometry — load on a bar is what the
  app is *about*. It does not depend on the temp icon having been good. But the reasoning must be
  restated that way in the spec, because "derived from the logo" is now false.
- **The logo is its own piece of work, and it inherits the design language rather than seeding it.**
  Order: language first (this pass), logo second, so the mark is drawn in a system that exists.
- **New input the earlier icon never had: the name is settled — SpotSet.** A *spot* is the act of
  standing over someone's lift so they do not get hurt; a *set* is the unit of work. The mark should
  carry that, not just be a dumbbell. This connects directly to §7.3 — spotting is the product's
  actual value proposition, in Pierre's own words.
- **Deliverables when it runs:** the mark itself, the Play adaptive icon (foreground inside the 66%
  safe zone — the v2.15.1 trap), the iOS icon set, the in-app wordmark, and the favicon.

### 7.3 OPEN — exercise form visuals, and why they are a FEATURE, not decoration

Pierre asked for images of the movements, and gave the reason in the first person:

> *"Why would I pay for a PT? Because I don't want to get injured… even the most common moves, if I
> do them on my own and I'm doing something wrong, I would get injured — if my elbow is in the wrong
> position. I need somebody to look at me. Even the professionals need a spot."*

**That is the product thesis, and it is the app's name.** Form visuals are not illustration; they
are the app doing the spotting when the coach is not in the room.

**Requirement, as stated:**
- Silhouettes of each movement, in the app's own visual language — *"tasteful… sophisticated,
  premium."* Not stock clip-art, not a photo library.
- **One default view per exercise, chosen as the most demonstrative.**
- **More angles on demand.** Preference order he gave: drag-to-rotate 360° with a finger if it is
  affordable; otherwise **a fixed set of view angles per exercise — some need one, some two, some
  six or seven.** The count is per-movement, not a global constant.

**Constraints this immediately collides with, to be answered in its own design session:**
- 🔴 **`data.json` is at ~14.5% of a 1 MB ceiling and the app ships as ONE `index.html`.** Binary
  assets for ~100+ exercises cannot live in the bundle or in the data blob. This needs its own
  delivery decision (bundled sprite vs on-demand fetch vs generated geometry) and it is the single
  biggest open question in the whole feature.
- **Offline-first is not negotiable** — Beirut internet, and the gym has poor signal. A form visual
  that needs a network round-trip is useless at the moment it is wanted.
- **`exerciseBank.js` is GENERATED** (`scripts/build_exercise_bank.py`) and already carries the
  exercise identity every asset must key to. Arabic names exist (`exerciseNamesAr.js`).
- **RTL and both themes** apply to the visuals exactly as to everything else.

**Sequencing:** this is a separate spec after the Dashboard slice — it is a feature with a storage
and delivery problem, not a styling task, and folding it into the visual pass would sink both.

### 7.4 The palette references, read (2026-08-21) — and the accent, decided

Pierre supplied three references: the **iFIT app icon**, the **iFIT logo**, and a **three-phone
screenshot of iFIT's exercise detail screen**. Read as follows, in the artifact
`Plate & Bar` (two palettes shown on one grammar).

**Taken:**
- 🔴 **A navy ground with light IN it.** The iFIT icon works because a gradient does the lifting —
  depth comes from the surface, not from stacked panels. That is precisely what makes deleting the
  card viable: a flat ground needs a card to create hierarchy, a lit one does not.
- **The discipline of one cold accent** against a lot of neutral.
- **From the exercise screens: the target muscle burning hot against a neutral body.** The clearest
  idea in the set — colour that means *"this is what you are working"*, not colour that decorates.

**Deliberately NOT taken:**
- **Their chrome.** The exercise screens are a white card stack with a generic blue on tabs, links,
  chart lines and pills — accent-as-decoration, which is §2's house style at a different hex. Their
  blue is approximately the value we are running from.

**Decided — palette B, "midnight & arc":**
| Token | Value | Job |
|---|---|---|
| midnight | `#0A1524` (ground, lit corner `#123262`) | the ground, navy, never flat black |
| raised | `#111F33` | the rare raised surface |
| chalk / chalk-dim | `#E9EEF3` / `#8D9BAC` | text, faintly blue-warm, never `#FFF` |
| **arc** | **`#35B7E8`** | **THE accent — load, urgency, the live session** |
| bar | `#26374E` | structure |
| anatomy | `#F2622C` | 🔴 **inside exercise figures ONLY** |
| ok / warn | `#4FC08D` / `#E0A32B` | semantics, separate from the accent |

- 🔴 **THE ACCENT NEVER TOUCHES CHROME.** Not tab bars, not buttons, not links. When it appears it
  means something. This rule is hue-independent and survives any later palette change.
- **The warm hue survives, in one place only.** Pierre rejected an orange/red accent as reading
  generated — correctly. `#F2622C` therefore lives *inside the figure*, marking anatomy, and nowhere
  else in the app. It is anatomy, not identity.

### 7.5 Form visuals — the delivery answer, sketched

Shown in the artifact as a working panel, not described: neutral figure, target muscle in the hot
hue, per-exercise angle chips, default view chosen per movement.

🔴 **Line-drawn vector, not photography and not a 3D render.** This answers §7.3's biggest open
question: the app ships as ONE `index.html`, offline-first, on Beirut internet. A hundred exercises
of photography cannot live in that bundle, and a visual needing a network round-trip is useless in
the moment it is wanted. Vector weighs almost nothing, scales, mirrors for RTL, and recolours with
the theme instead of fighting it. **Drag-to-rotate remains on the table but is a delivery question,
and it gets its own spec.**

### 7.6 Real gym photography — accepted, with one rule

Pierre raised shooting Elie's actual gym (or generating) for backgrounds.

🔴 **A photograph is a GROUND, never a surface.** Shot in Elie's gym, pushed dark and desaturated
toward midnight, it belongs in places with no data to read: an empty state, the session-complete
moment, the login screen. **It never sits behind a list** — text over a photograph is the fastest
way to lose the legibility this whole direction is built on.

**Why it is worth the trip:** it is a differentiator no generator can produce — nobody else has
Elie's gym at 7am. Budget it as a shoot, not an asset download. Practical: shoot dark, shoot wide,
leave room at the edges to crop for both phone aspect ratios.

### 7.7 🔴 ONE THEME, NOT TWO (Pierre, 2026-08-21)

**The dark/light pair is abandoned.** SpotSet gets **one considered theme**, aimed at the sweet spot
for everyone who opens it, and the effort that went into keeping two in sync goes into making that
one excellent. This supersedes the whole light-theme history in `docs/design-system.md` (v2.3–v2.4,
six rounds of iteration) — that record stays as *why* each choice was made, not as a live contract.

- **Variants are alternatives, never modes.** More than one hue treatment may be developed; **at
  most one ships**, or two only if both turn out genuinely as good. The user is never handed a
  toggle and asked to pick.
- **`--t1..--t5` and `--sep` survive.** They stop being a theme-swap mechanism and become the
  opacity ladder of the single theme. Nothing about "never hardcode rgba" changes.

### 7.8 The audience widened — and the app has to INVITE

Pierre named three users, and the third is new to this brief:

1. **The owner** — running a business in it.
2. **The coach** — organising days, sending invites.
3. 🔴 **The member** — browsing their own work: upcoming sessions, effort daily, weekly, yearly,
   ever. **A screen a member scrolls on the sofa is judged differently from one a coach taps between
   sets**, and the member-facing views (history, streaks, a yearly view) are places to spend real
   design rather than render a table.

**The emotional requirement, in his words:** *"I hate the gym, so I chose stuff to encourage me —
one is picking a gym close to home. A thoughtfully built app could be another reason."*

🔴 **Test for every screen in this system: would someone who dislikes training open this on
purpose?** That is a higher bar than "is it legible", and it is the reason the single theme has to
be worth looking at rather than merely correct.

### 7.9 Figures are drawn in CURVES — and that is a functional rule

Pierre on the first figure: *"less of a hangman feel — probably use curves instead of intersections
and angles."* He then named exactly why it matters: *"veering away from lines and angles opens up
the true value — we could portray an arched back instead of a straight one."*

🔴 **A hinged stick figure physically cannot show a spine holding its arch versus rounding over.**
Straight segments have no arch to lose. So:

- **Every figure is continuous curves — no visible joints, no corners.** A body, not a skeleton
  diagram. Thigh flows through the knee; neck flows into the head.
- **The spine is the hero line**, drawn in the accent when held and in the warn hue when lost. The
  artifact now shows the same row twice: *neutral, arch held* and *rounded — this is the injury*.
  That pairing IS the feature; a single "correct" figure teaches half as much.
- **Full renders stay on the table for later.** Line-drawn is what ships now, not the ceiling.

### 7.10 🔴 §7.7 REVERSED THE SAME EVENING — themes stay user-facing

**Both states, recorded, so nobody re-inverts this** (the mid-conversation-revision rule).

| | Written §7.7, ~22:50 | Chosen §7.10, ~23:10 |
|---|---|---|
| Themes | ONE theme, no user choice | **2–4 named themes, the USER picks** |
| Reasoning | effort spent on two goes into making one excellent | *"if we're not gonna do it now, when it becomes public?"* |

**What did NOT change:** the dark/light *pair* is still dead. This is not a mode inherited from the
OS — it is a short curated list where every entry was designed on purpose and any of them is a good
answer. **What changed** is that the list is shipped to users rather than picked internally.

**Pierre's reasoning, which is the durable part:** the closed test is *"a limited number of close,
long-term clients"* — precisely the audience whose preference is worth learning, and the only time
it can be learned cheaply. Deferring theme choice to public launch means guessing now and finding
out expensively later.

- **Ship the variants to the closed testers and collect which they use.**
- Every theme carries the same layout, geometry and type. **Only hue changes** — that is the test
  that keeps it a language rather than four moods.
- **`--t1..--t5` / `--sep` become the shared opacity ladder** across all themes; "never hardcode
  rgba" is unchanged and now matters more.

### 7.11 🔴 THE OFFLINE JUSTIFICATION WAS WRONG — corrected by Pierre

§7.5 argued line-drawn figures on the grounds that *"the app ships as ONE index.html, offline-first,
on Beirut internet"*. **Pierre corrected it: we are building the native app now.** It downloads
once, assets ship inside the binary, and **Lebanese 4G is good** — the bandwidth argument does not
apply, and stating it as the reason was reasoning from a stale constraint. The rule this belongs to
is *probe before you assert*: the delivery model changed at Capacitor and the brief had not caught up.

**The real reasons line-drawn is right FOR NOW** (both survive the correction):
1. **Download size** — a vector figure is a few KB against a photo's hundreds. It is what lets us
   cover the **whole exercise bank** instead of a beautiful dozen.
2. **Production cost** — we can draw ~100 movements in this style; we cannot shoot or render 100.

🔴 **Line-drawn is the FOUNDATION, not the ceiling.** Richer graphics — renders, real photography,
drag-to-rotate — can replace any individual figure later without touching the system around it, and
that is the point of settling the language first.

### 7.12 Figures, generalised — it was never about backs

Pierre: *"it's not the back exclusively — any movement. The curves could be deployed for any
movement… if I'm doing shoulder — I injured my shoulder and it took me six months to get lightly
back on track — you would mark on the wrong one where it would cause an injury."*

**The rules, generalised:**
- **Curves apply to every movement.** A curve is what makes any joint's position readable; the back
  was only the first example.
- 🔴 **The wrong figure MARKS THE INJURY SITE, on the joint that takes it.** A ringed shoulder for a
  flared press, a marked lumbar for a rounded row. **Not a red outline around the whole body** — the
  point is *where*, and a whole-body warning says nothing a person can act on.
- **Counts are per movement, not a global constant.** One figure where one suffices. **Two whenever
  there is a way to get it wrong** — that pair carries the value. More angles only when a view
  genuinely hides something.
- The artifact now shows two movements for exactly this reason: a **row** (the spine is what you
  lose) and an **overhead press** (the shoulder is). Same system, different joint.

### 7.13 Figure proportions are a CANON, not an eyeball

Pierre, on the first two figures: *"these look like baby ratios… on the back one, the legs are too
short and the back too long. On the shoulder ones, this looks like an obese person with attached
feet."* Both correct, and both the same failure: the figures were drawn to fill a box rather than to
a human canon, which reads as a cartoon and destroys the credibility a form reference needs.

**The canon every figure is now built on (7.5 heads):**
- **Head = 1/7.5 of standing height.** At a 130-unit figure, the head is ~17 tall, ~13 wide.
- 🔴 **The hip joint sits at HALF of standing height.** This is the one that was most wrong — a long
  torso on stub legs is exactly the infant ratio, because in a baby the hip really is low.
- **Knee at the midpoint of hip-to-floor**; thigh ≈ shin ≈ 1.9 heads.
- **Torso hip→shoulder ≈ 2.4 heads.** Shoulders ≈ 2 head-widths across, hips narrower.
- **Upper arm ≈ 1.4 heads, forearm ≈ 1.2** — elbow lands at the waist, wrist at the hip.
- 🔴 **The wrong-form figure must reuse the SAME bone lengths as the correct one.** Only the joint
  angles change. If the limbs also change length, the reader cannot tell which difference is the
  fault — the whole point of the pair collapses.

**Also fixed in the same pass:** the overhead press is now drawn at the **bottom** of the rep, which
is where elbow position actually decides whether the shoulder is safe. A figure at lockout cannot
show the fault it is there to teach — **choose the moment in the lift where the error lives.**

### 7.14 Scale — 600–650 movements, and we already hold 340

Pierre (via Ali): the recognised bodies register **~600–650 movements**; cover the most common
100–200 first and grow.

🔴 **PROBED, not assumed:** `src/exerciseBank.js` already carries **340 exercises** — Elie's own
list, generated from his spreadsheet by `scripts/build_exercise_bank.py` — and
`src/exerciseNamesAr.js` carries **Arabic for all of them**. So the data spine exists; the drawing
is what is missing. Order of work: **the movements `generateProgram()` actually emits first** (those
are the ones a member will meet), then the rest of the 340, then whatever the 600 adds.

🔴 **A movement with no figure is still listed** — name, muscles, type. Nothing waits on a complete
set, and no screen may assume a figure exists.

### 7.15 NEW FEATURE — the movement library, and tappable names

**Pierre's correction of my assumption:** he said the app never names specific moves *yet*. It
already does — `generateProgram()` fills each block with named exercises from the bank. **The real
gap is that a name in a program is a dead end: nothing to tap, nowhere to look it up.**

**Two ways in, and the first is the point:**
1. 🔴 **Every exercise name in a session or a program is TAPPABLE**, opening the figure in context,
   mid-workout. This is the one that matters — the member is already reading the name.
2. **A searchable library screen**, for when someone was told a name in the gym and wants it cold
   (*"if it tells me something like front arm row, I can search for it and see it"*). Search must be
   forgiving: partial words, and Arabic as well as English.

**A movement may carry its own risk flag** — an upright row is a shoulder problem for many people,
and the library is where that belongs rather than buried inside a generated program.

**Sequencing:** this is its own spec — it is a new screen, a new navigation entry and a search
contract, not a styling task. It follows the Dashboard slice.
