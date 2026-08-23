# SpotSet — The Design & Typography Thread HANDOFF

**Last updated:** 2026-08-23 ~03:10, Beirut.
**To resume:** Pierre types `design`, `theme`, `typography`, `skin`, `buttons` — or `continue` right
after clearing this session. **Read §0 back to him and stop.** Do not investigate, do not draft, do
not ask follow-up questions beyond the one §0 names.

> 📌 Sibling threads, all separate: figures → `HANDOFF-figures.md` (a SECOND SESSION owns it and is
> active in this tree) · Play/Apple → `HANDOFF-spotset-publishing.md` · Supabase →
> `HANDOFF-multi-user-build.md` · mark/opening/showcase → `HANDOFF-showcase.md`.

---

## 0. Status — read this out

- 🟢 **v2.37 IS THE SHIPPED STATE OF THIS THREAD** — web (gh-pages, Pages reached `built`) and an
  APK vc15 delivered in-chat. It carries: Big Steps typography, six skins, the Display sheet, and
  the button-proportion pass.
- 🔴 **TWO SESSIONS SHARE THIS TREE AND WE COLLIDED. CHECK THE VERSION BEFORE BUMPING — ALWAYS.**
  The figures session shipped v2.35.1, v2.35.2, v2.36 and vc14 while this thread worked. **Both
  sessions numbered a release v2.35.1**, and this one overwrote the other's
  `docs/instructions-v2.35.1.md` (restored from `fb08cd4`; ours is now an addendum on
  `instructions-v2.35.md`). Probe `git log --oneline -3 origin/master` and the version string in
  `src/App.jsx` before any bump — the string had already moved, so a blind `replace()` matched
  nothing and failed silently.
- 🔴 **THE DESIGN RULING THAT MUST NOT BE RE-LITIGATED: RANK IS SIZE AND WEIGHT, NOT CASE.**
  v2.35 stripped uppercase + tracking + the condensed face from everything; reading improved and
  **sorting died** — Pierre's word was *"monotone"*. v2.37 restores rank as a 22px/700 name against
  a 12.5px label, with caps + `0.06em` on small structural labels ONLY. Never a name, never body.
- 🔴 **CASE AND TEXT SIZE ARE USER SETTINGS, NOT DESIGN DECISIONS** (`Display.jsx` → `--tt`, `--ts`
  on `<html>`). No static type choice fits every pair of eyes, and Pierre cannot read the default
  comfortably. Do not "fix" the default by removing the dials.
- **Skins are six, in three pairs:** Lume · Midnight · Rally (dark) / Enamel · Steel · Chalkline
  (daylight). `DEFAULT_SKIN = 'lume'`; a stored pick always wins, so nothing repaints itself.
- 🔴 **STILL UNRATIFIED AND IT IS ELIE'S CALL: the figures went crimson-fault + TEAL muscles** in
  Lume/Enamel (and cyan muscles in Rally). Every anatomy chart he teaches from paints working muscle
  **red**. **Show him a movement figure and ask.** If he refuses, move the ACCENT, not the
  convention — the convention is older than this app.
- **Elie's two rulings, do not re-propose:** the compact Home view is gone (detailed only), and the
  session-count edit **stays** in the booking screen.
- 🟢 **v2.43.2 SHIPPED (2026-08-23): THE SPOT IS IN THE MARK** — from Pierre's own launcher-icon
  mock: a `var(--accent)` dot above the pair, between the heads ("the circle is the SPOT, the pair
  is the SET"), with `pm-spot`/`pmSpot` so it wanders in and settles before the lines draw.
  🔴 **THE ICON PIPELINE FLATTENS COLOURS THROUGH A LITERAL MAP in `logo-candidates.mjs --export`
  — a NEW token must be added there or every store/launcher asset renders it unresolved-black.**
  `--accent` added; launcher + PWA icons regenerated and pixel-verified. Pages `built`, APK vc23
  verified inside + delivered.
- ⏸️ **THE "S" EXPLORATION IS PARKED, NOT DEAD** (his call: *"not going anywhere with this, just
  archive them, we can get to them later"*). Four sheets in `_archive/PTApp/branding/`:
  `2026-08-23-spotset-s-gallery.html` (letterforms) · `…-s-pair-gallery.html` (the pair as an S) ·
  `…-s-pair-round2.html` (correct/fault + tilt + Spot, five hinge movements) · `…-round3/4.html`
  (10° tilt, Spot at 20/20, brush band, angled link). Generators: `scripts/s-pair-studies.mjs`,
  `scripts/s-pair-round2.mjs` — both read `src/figures` and edit nothing there. **His geometry
  finding, worth keeping: the ~90° hinge (Barbell Row) makes a rounder S than the deadlift's ~130°.**
  Serve any sheet with `python -m http.server 8734` in that folder.
- 🟢 **v2.43.1 SHIPPED (2026-08-23): the logo re-frozen from CCHealth's cap-sweep renderer fix**
  — dark spots at hips/feet/fingers gone; launcher icons regenerated; Pages `built`, APK vc22
  verified inside + delivered. 🔴 **OPEN, HIS PICK: the S gallery** — 19 candidates in three sets,
  `_archive/PTApp/branding/2026-08-23-spotset-s-gallery.html` (was served on localhost:8734 in his
  Chrome; re-serve with `python -m http.server 8734` in that folder). Final, build-on, or drop.
- 🟢 **v2.43 SHIPPED + SUBMITTED TO PLAY (2026-08-23): THE LOGIN IS LIVE.** The whole auth stack
  existed dark; **`.env` (anon key only, from `_archive/PTApp/supabase-spotset.env`) is now a BUILD
  INPUT** — without it a build is token-only. Email sign-in (accounts PROVISIONED, no self-signup) ·
  "Continue as guest" button (the DEMO path + refusal gate) · token until the parallel run ends.
  Live RLS matrix passed pre-ship; security review clean. **vc21 (2.43) submitted to the Alpha
  track 08-23 ~09:00 — probe the console before quoting its state.** vc9 (2.32) published Aug 22.
  🔴 **OPERATIONAL, WAITING ON PIERRE: provision tester emails in Supabase console** (Auth → Users
  → Add user) — without a row, email login = "wrong credentials".
  🔴 **vc21 trap re-earned: `gradlew` without `npx cap sync` shipped the PREVIOUS web bundle inside
  a correctly-numbered APK** — caught by grepping the version INSIDE `assets/public/index.html`.
- 🟢 **v2.42 SHIPPED (2026-08-23): 21 SKINS — 7 families × Light/Optimal/Dark.** 🔴 **The optimal
  is hand-designed; the flanks are GENERATED (`scripts/gen-skin-variants.mjs`) and auto-corrected
  against `sanity-contrast` — never hand-edit a generated block, re-run the script.** Pebble →
  **FLINT** (palette kept, stored picks migrate). Buttons 40px/7px; type strays snapped; logo
  46px/26px — re-freezing the mark from the corrected library was BYTE-IDENTICAL (its poses were
  not among the v2.38 fixes). The Dial (Type Lab artifact) has a Desktop shortcut. Pages `built`,
  APK vc20 verified + delivered.
- 🟢 **v2.41 SHIPPED (2026-08-23): Pierre's Pebble verdict applied** — rounded RECTANGLES (never
  pills) in ALL skins via the :root radii; separators are TRENCHES (`--trench`, derived from each
  skin's ground); thin marks got capsule ends. 🔴 **HIS PROCESS RULING, now a gate:** a finding on
  one screenshot is audited everywhere it applies, in every skin — `sanity-contrast.mjs` measures
  every token pairing per skin (text hard 4.5; decorative gates at "perceivable" because
  lume/enamel's quiet shafts are ruled design). It caught 4 more unreadable pairings on day one.
  Pages `built`, APK vc19 verified + delivered. Pebble stays as a palette.
- 🟢 **v2.40 SHIPPED (2026-08-23): PEBBLE (the rounded skin) + `--on-bar` + radius tokens** —
  Pierre's "smooth out the boxiness / pills" ask, built as the seventh skin so he can compare.
  🔴 **His geometry ruling amends "only hue changes": radius may vary per skin ONLY via the six
  `--r-*` tokens** (`--r-tall` exists because pills ate tall boxes — i18n review). 🔴 **Bar-filled
  surfaces paint text from `--on-bar`, never `--chalk`** — the Steel dark-on-dark screenshot fix,
  applied in all seven skins and gated. APK vc18 verified and delivered. **OPEN: Pierre judges
  Pebble on his phone — win ⇒ pill radii graduate to :root, lose ⇒ delete the block.**
- 🟢 **v2.39 SHIPPED (2026-08-23): swipe-to-change-week** — pointer events on `.week-strip`,
  48px/2:1 thresholds, NO setPointerCapture (tappable children), `touch-action: pan-y`,
  direction-aware slide keyed on Monday, RTL-mirrored, reduced-motion off, <360px chip-fit guard
  (mobile-UX review finding). Pages `built`; APK vc17 verified inside and delivered.
  Detail: `docs/instructions-v2.39.md`.
- **Open and not started:** the full `.btn-*` sizing/fill rationalisation beyond the proportion
  pass · the "S" logo idea · the roles/dev-surface split (brainstorm only, nothing decided).
  Sibling debt noted: v2.38 (figures) has no `changelog-technical.md` entry — a pointer line went
  in with v2.39's.
- **The one question to ask on resume:** *"Did the v2.37 type land, and did Elie rule on the teal
  muscles?"*

---

## 1. Where the reasoning lives

| Subject | File |
|---|---|
| Why Needle beat The Platform | `docs/instructions-v2.34.md` |
| The legibility pass + why it over-corrected | `docs/instructions-v2.35.md` (incl. the addendum) |
| Big Steps, the Display sheet, button proportion | `docs/instructions-v2.37.md` |
| The nav review that produced the Library tab | `docs/design/2026-08-22-fresh-eyes-navigation-review.md` |
| taste-skill: read, not installed, and what was harvested | `docs/design/2026-08-22-taste-skill-evaluation.md` |
| Roles / dev-surface split (BRAINSTORM, nothing decided) | `docs/design/2026-08-22-roles-and-the-dev-surface-brainstorm.md` |
| The token contract and type roles | `docs/design-system.md` |

**Artifacts Pierre reads (in `/artifacts`):** *The Fourth Tab* (nav verdict, with its correction),
*The Platform and the Needle* (the two directions), *The Type Lab* (the live tuner he picked Big
Steps from).

## 2. Two traps this thread earned, both now in `docs/traps.md` / CCHealth

- **A filename is not a feature.** A fresh-eyes brief said "a barbell plate calculator" because
  nobody opened `Plates.jsx` — it is the package-progress disc row. The reviewer is blind by design,
  so the brief is the only thing between a wrong premise and a confident finding. **Build the brief
  from opened files; write anything unreadable as *unknown*, never as a guess.**
- **Harvesting selectors from an existing rule set misses every COMPOUND one.** The v2.35 list was
  harvested from the `[dir="rtl"]` rules — complete for simple selectors, and it silently skipped
  `.srow .inline-type-select` at (0,2,0). Sweep for compound rules separately.

## 3. The build recipe this thread uses

Standard pipeline (`CLAUDE.md`), plus: **an APK with every version** — `assembleRelease` under
JDK 21, versionName verified **inside** the `.apk` (gradlew exits 0 on a failed build), archived to
`_archive/PTApp/releases/`, then sent in chat. 🔴 Stage explicit paths only; never `git add -A`.
