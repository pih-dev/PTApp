# taste-skill (GitHub: Leonxlnx) — evaluation for SpotSet

**Date:** 2026-08-22 · **Asked by:** Pierre · **Verdict:** do not install as a session skill. Harvest
Section 9 as a checklist for the marketing surfaces, and take three small fixes into the app.

Repo: <https://github.com/Leonxlnx/taste-skill> (MIT, ~3.3 MB, 12 skills + a laziness research folder).
Clone used for this review lives in the session scratchpad, not committed.

---

## 1. What it actually is

A very large (87 KB) prompt-as-skill whose thesis is that LLMs have one house style and that the fix
is a long list of banned signatures. It is structured as: read the brief → set three numeric dials
(`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`) → pick a real design system → apply bias
corrections → run a ~60-box pre-flight checklist. Siblings in the repo: `redesign-skill`
(audit-then-fix an existing codebase), `minimalist-skill`, `brutalist-skill`, `soft-skill`,
`brandkit`, `image-to-code-skill`, plus two image-generation skills.

## 2. Why it is NOT a fit for SpotSet's app UI

**Its own Section 13 rules us out, in writing:**

> This skill is NOT for: dashboards / dense product UI / admin panels · data tables · multi-step
> forms / wizards · native mobile (use Apple HIG / Material directly).

SpotSet is all four of those at once. Almost every hard rule in the document is scoped to a scrolling
marketing page and would be actively wrong here: hero-fits-the-viewport, eyebrow rationing per
*section*, zigzag alternation caps, bento cell counts, logo walls, marquees, "cards omitted in favour
of spacing", scroll-driven GSAP skeletons. Loading it into a PTApp session would spend context on
rules that do not apply and invite changes that break a phone app.

**And a large part of what it prescribes, SpotSet already does** — verified against the tree
this session, not assumed:

| Its rule | SpotSet today |
|---|---|
| One accent, locked, saturation < 80% | **Law already**: the arc `#35B7E8` never touches chrome; a literal belongs to one skin, enforced by `sanity-skins.mjs` |
| No pure `#000000`, one grey family | Skins are token sets; no colour literal survives the gate |
| Tabular figures in data-heavy UI | `font-variant-numeric: tabular-nums` at `styles.css:618`, `:688`, `:797`, `:802` |
| More weights than 400/700 | 500 / 600 / 700 in use (31 / 23 / 10 declarations) |
| `min-height: 100dvh`, never `100vh` | `styles.css:1190` and `:129` both declare `100vh` then `100dvh` (correct progressive pattern) |
| Tactile `:active` feedback | `button:active { transform: scale(0.97) }` plus 7 more specific press states |
| Icons not hand-rolled | n/a in the good sense: the figures are the product, drawn from a canon, not decoration |
| Page theme lock | A skin is values only; there is no section that flips theme |

That table is the real finding. The design round already landed most of this skill's substance
independently, which is a decent external confirmation of the v2.17-v2.25 work.

## 3. What IS worth taking

### 3.1 Section 9 as a checklist for the MARKETING surfaces (the real value)

Section 9 ("AI Tells") is a catalogue of exactly the failure named in
`project_design_generic_finding` — three independent artifacts sharing one LLM house style. That
finding was about the deck, the landing material and the app reading the same. Section 9 is the
best-organised list of those tells I have seen, and its natural target is precisely the surfaces we
have not built yet:

- the SpotSet landing / store page,
- the Play Store listing copy and screenshots,
- Elie's marketing deck (`project_marketing_deck`).

Specific bans that would have caught real slop on those surfaces: section-number eyebrows
(`001 · Capabilities`), "Quietly trusted by", decorative status dots, locale/time strips, fake
div-built product screenshots in a hero, "Stage 1 / Stage 2 / Stage 3" step labels, filler verbs
(Elevate / Seamless / Unleash / Next-Gen), fake-perfect numbers, generic names (Jane Doe / Acme),
photo-credit captions as decoration, decorative hairline grids, three-equal-feature-cards.

**Action:** when the landing page or the store listing gets written, run its copy and layout past
that list. Do not import the skill; use the list.

### 3.2 Three small things to take into the app

1. **`text-wrap: balance` / `pretty` is absent from the whole tree** (0 hits in `src/`). Cheap,
   no-risk: `balance` on headings and `pretty` on body kills orphaned single words. This is a real
   gap, not a style opinion.
2. **The em-dash question.** 26 user-facing strings in `src/i18n.js` use `—`
   (`'Sync failed — tap to retry'`, `'Invalid token — check and try again'`, `'Offline — changes
   saved locally'`). The skill bans it outright as the #1 LLM tell. That is a marketing-page
   argument and overstated for a UI, **but the pattern here is uniform**: every one is
   `<problem> — <what to do>`, which is a template, and a template is what reads as machine-written.
   Worth a deliberate pass, not a blind sweep. A colon or a full stop reads more like a product.
   🔴 Any such pass must touch the Arabic in the same edit and use the Edit tool, never a PowerShell
   round-trip (encoding trap), and `—` inside code comments is irrelevant.
3. **Loading and empty states as a first-class review item.** The skill's 4.5 asks for skeletons
   shaped like the final layout, composed empty states, inline errors. SpotSet has `noClients` and
   surfaces sync failures, but there is no skeleton anywhere in `src/`. Not a bug; a candidate for
   the next polish round, and it fits the "premium density" philosophy already recorded.

### 3.3 One idea worth stealing outright: the dials

Naming three numeric dials and *stating their values before designing* is a good discipline
independent of the rule set, because it makes a design argument falsifiable. SpotSet's own reading
would be roughly `VARIANCE 4 / MOTION 5 / DENSITY 7` — a dense, calm product surface with one
theatrical moment (the opening and the showcase). Writing that down gives the fresh-eyes reviewer
something concrete to argue against.

## 4. What to be careful of

- **It is a prompt, not a system.** Nothing in it is enforced; there is no linter. SpotSet's own
  gates (`sanity-skins`, `sanity-figures`, the build failing on a named pathology) are strictly
  stronger, because they run.
- **Some rules contradict SpotSet's law.** It wants generous whitespace, cards omitted, big display
  type and real photography; SpotSet is a one-hand phone app whose law says the movement card FITS
  and never scrolls, `.card` IS a row, and selection is chalk. Where they conflict, SpotSet wins.
- **It is opinionated about stack** (Tailwind v4, shadcn, Motion, GSAP, Phosphor icons). SpotSet is
  vanilla CSS with bundled fonts and generated SVG. Ignore all of that.
- **Recency:** repo last pushed 2026-08-22, so it is live and moving. Anything harvested should be
  copied into our own docs, not referenced by URL.

## 5. Recommendation

1. **Do not install.** No router row, no skill deployment.
2. **Keep this file as the record**, and reach for §3.1 when the landing page / store listing / deck
   copy gets written.
3. **Take `text-wrap` now** in the next patch; put the em-dash pass and the skeleton states in front
   of Pierre as design decisions, not silent edits.
4. **Adopt the dial notation** in the next design brief so the fresh-eyes reviewer has a stated
   position to attack.
