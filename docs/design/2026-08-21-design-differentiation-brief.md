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
