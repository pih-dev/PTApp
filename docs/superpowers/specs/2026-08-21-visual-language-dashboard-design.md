# SpotSet — Visual Language & the Dashboard Slice (Design)

**Date:** 2026-08-21 · **Status:** approved in brainstorming with Pierre, awaiting his review of this
file · **Brief:** `docs/design/2026-08-21-design-differentiation-brief.md` (§1–§7.15 — the evidence,
every decision, and both sides of the one reversal) · **Mockup:** the `Plate & Bar` artifact.

**Scope of THIS spec:** the visual language, the skin system that carries it, and **one screen —
the Dashboard — rebuilt in it.** Three things it deliberately does not cover, each named at the end
with its own follow-on spec: the movement library, the exercise figures, and the logo.

---

## 1. The problem, in one paragraph

SpotSet is fast and it is clean, and it looks like everything else an LLM produces: Tailwind palette,
an 8/12px radius ladder, a translucent card on a dark panel, a 1px hairline, a soft ambient shadow,
system sans. The brief proves it three ways — a sibling project in another domain converged on the
same six traits, and so did a Lebanese retailer's order-cancellation email that had nothing to do
with either. **The convergence is the defect.** A pass that keeps all six changes nothing.

## 2. The anchor: the plate and the bar

One visual idea, from what the app is about — **load on a bar.**

| Element | Means | Replaces |
|---|---|---|
| **Plates** (a row of discs) | the package: filled = used, hollow = remaining, all-accent = spent and due | the renewal badge, the "12/20" text carrying the weight alone |
| **The bar** (collar + shaft) | a section boundary | `.section-title` plus a hairline |
| **Loaded columns** | the week's volume | the three `stat-card` tiles |
| **The ground** | hierarchy itself — a lit gradient, so nothing needs to float | `.card` |

🔴 **The card is deleted.** No outline, no hairline box, no ambient shadow. This one decision breaks
four of the six traits; type and palette break the other two. Rows sit on the ground and the bar
separates them.

**The grammar test for any new element:** it must answer *"what does this weigh?"* If it cannot, it
is decoration and it does not ship.

## 3. Skins — a curated set, chosen by the user

**Not a dark/light pair.** A short list of named skins, each designed on purpose, any of which is a
good answer. Two ship at v1 (`midnight`, `steel`); the structure holds up to four.

🔴 **Every skin carries identical layout, geometry and type. Only hue changes.** If a skin needs a
layout tweak to work, it is not a skin — it is a second design, and it does not ship.

### 3.1 Mechanism

Today: `theme` state in `App.jsx:48` → `localStorage['ptapp-theme']` → a `.theme-light` class
toggling ~100 override rules in `styles.css:850+`.

**Replace with a data attribute and one token block per skin.**

```css
:root,
[data-skin="midnight"]{
  --ground: #0A1524;  --ground-lit: #123262;  --raised: #111F33;
  --chalk:  #E9EEF3;  --chalk-dim: #8D9BAC;   --chalk-faint: #55637A;
  --accent: #35B7E8;  --bar: #26374E;
  --ok: #4FC08D;      --warn: #E0A32B;        --anatomy: #F2622C;
}
[data-skin="steel"]{ /* same names, different values — never different rules */ }
```

- `App.jsx` writes `data-skin` on the app container (alongside the existing `dir`), and persists to
  `localStorage['ptapp-skin']`.
- 🔴 **`--t1..--t5` and `--sep` SURVIVE**, re-expressed per skin as the opacity ladder over
  `--chalk`. Every inline style in the codebase already uses them; **"never hardcode rgba" is
  unchanged and now matters more**, because a hardcoded value silently belongs to one skin.
- 🔴 **The `.theme-light` block is deleted, not left dormant.** ~100 dead override rules that
  still parse are a trap for the next session; the design history is preserved in
  `docs/design-system.md`, which is where it belongs.
- **Migration for the preference (not data):** on first run, `ptapp-theme === 'light'` → `steel`,
  anything else → `midnight`, then the old key is removed. `ptapp-theme` never lived in `data.json`,
  so `DATA_VERSION` is untouched and there is no `migrateData` step and no live-diff gate.

### 3.2 The accent rule, which outlives any palette

🔴 **THE ACCENT NEVER TOUCHES CHROME.** Not tab bars, not buttons, not links, not focus rings. It
marks load, urgency and the live session. The moment it decorates, it stops meaning anything — and
that is precisely the habit the iFIT reference screens demonstrate.

Three hues, three jobs, no overlap: **accent** = load/urgency · **ok/warn** = status ·
**anatomy** = inside exercise figures only, never in the UI.

## 4. Type

| Role | Face | Why |
|---|---|---|
| Names, labels, section heads | **Saira Condensed** 600/700, uppercase, `.02–.18em` | reads as an instrument label; the fastest exit from the generated look |
| Body, meta | **Saira** 400/500 | same family, no second personality |
| All digits | **IBM Plex Mono** 500/600, `tabular-nums` | times, counts and ratios line up in columns and stop jittering between renders |

🔴 **Fonts are bundled, never fetched.** The app is native and offline-first; a webfont link is a
blank first paint on a bad connection. Subset to Latin + Arabic where the face has it.

🔴 **Arabic never gets uppercase — it has no case.** The Arabic build carries the same hierarchy
through weight and letter-spacing, and it is judged on its own screenshots, not assumed to follow.

## 5. Motion

Pierre chose **motion everywhere, cheap**, over one signature moment. The constraint that makes that
safe is written into the spec, not left to taste:

1. 🔴 **`transform` and `opacity` only.** Nothing that triggers layout or paint.
2. 🔴 **≤200ms**, and no animation on a list that can hold 500 sessions.
3. **`prefers-reduced-motion: reduce` disables all of it.** Accessibility, not an option.
4. 🔴 **Anything that cannot hold 60fps on Elie's iPhone is CUT, not tuned.** "Very snappy" was
   volunteered as praise before any of this started; it outranks every transition here.

Where it goes: row press (scale 0.99), plate fill on completion, tab change, section reveal on first
paint. Haptics ride the same events via `@capacitor/haptics` — impact on completion, selection on
tab change — and are silently absent on the web build.

## 6. The Dashboard slice

`src/components/Dashboard.jsx` (426 lines) is the whole slice. Today it renders: a 3-tile stat row,
a renewals block, and an upcoming list of `.card`s with a `borderInlineStart` in the session-type
colour, a status badge, action buttons, focus tags and a notes textarea.

**Rebuilt as:**

| Today | Becomes |
|---|---|
| `.stat-row` — 3 tinted tiles | **the week as loaded columns** — one number, one caption, seven columns |
| `.section-title` + hairline | **the bar** — collar, label, shaft, count |
| `.card` + `borderInlineStart: st.color` | **a row on the ground.** Session type moves to a mono type-mark; the inline-start bar is reserved for *the live session only* |
| `.badge badge-<status>` pills | **plates + the ok/warn hues.** The badge CSS-class rule stands — restyled, never inlined |
| `.empty-icon` 🏋️ emoji | a drawn mark in the language (emoji strips are a named house-style trait) |
| renewal row + `.btn-renew` | a row whose plates are **all accent**; the button stays, restyled |

**Unchanged, deliberately:** every handler, every dispatch, `getRenewalDueMap`,
`getClientCountedSessions`, `getSessionOrdinal`, the focus tags, the notes textarea behaviour and
`buildSession`. 🔴 **This is a presentation change. If a kernel call or a reducer action changes,
the slice has grown out of scope and stops** — that is the ratchet, and it is how a restyle turns
into a data incident.

**Also unchanged:** tap targets stay in the bottom 60%, safe-area insets, modal z-index, sticky
footers. Accessibility facts, not style.

## 7. Files

| File | Change |
|---|---|
| `src/styles.css` | skin token blocks; delete `.theme-light` (~100 rules); new `.bar`, `.plates`, `.load-*`, row primitives; card rules retired **only where the Dashboard uses them** |
| `src/App.jsx` | `data-skin` attribute + `ptapp-skin` persistence + the one-time `ptapp-theme` migration |
| `src/components/General.jsx` | the Drk/Lit toggle (line ~189) becomes a **skin picker** listing the shipped skins by name |
| `src/components/Dashboard.jsx` | rebuilt presentation, handlers untouched |
| `src/i18n.js` | skin names, EN + AR |
| `scripts/sanity/sanity-skins.mjs` | **new** — see §8 |

🔴 **`styles.css` is shared.** Other screens still render `.card`. Retiring a rule the Dashboard
stopped using but `Clients.jsx` still needs is the obvious way to break four screens while reviewing
one — **every rule removed is grepped across all of `src/` first.**

## 8. Testing and gates

- **`sanity-skins.mjs` (new), static, always runs:**
  - every skin block defines **every** token name — a missing one inherits the previous skin's value
    and shows up only on that skin;
  - **no hardcoded `rgba(255,255,255,…)` / `rgba(0,0,0,…)` / `#RRGGBB` in `src/**/*.jsx`** outside
    the token block — this is the existing rule, finally enforced rather than remembered;
  - **no `marginLeft` / `marginRight` / `borderLeft` / `borderRight`** in changed files (RTL);
  - the accent value appears in no chrome rule (nav, header, button, link, focus);
  - the `ptapp-theme` → `ptapp-skin` migration maps `light`→`steel`, everything else→`midnight`,
    and removes the old key. **Behavioural, under a fake `localStorage`**, like
    `sanity-demo-whatsapp.mjs`.
- **Full suite before deploy, exit codes not eyeballs.** 17 of 20 pass today; the 3 spent live-diff
  gates fail by design and `sanity-rls-matrix` needs its env file.
- **No schema change ⇒ no new live-diff gate**, and `DATA_VERSION` stays 6. The one data-adjacent
  risk is the preference migration, which the gate above covers.
- **On device, both phones, before it is called done:** Android and the PT's iPhone, in Arabic and
  English, in every shipped skin. 🔴 A skin is not shipped until its Arabic screenshot has been
  looked at.

## 9. Staging

1. Skin tokens + `data-skin` + the picker + `sanity-skins.mjs` — **no visual change yet**, the
   existing look re-expressed as `midnight`. Ships alone, verifiable alone.
2. The Dashboard rebuild.
3. Both phones, both languages, all skins. Then release.
4. Testers get the skins and we collect which they actually use — the reason they ship now, while
   the audience is fourteen close long-term clients rather than the public.

**Never a big-bang restyle.** Other screens keep the current look until each gets its own pass, and
the two idioms coexisting for a release is the accepted cost of not breaking four screens at once.

## 10. Out of scope — each its own spec, in this order

1. **The movement library** (brief §7.15) — every exercise name in a session or program becomes
   tappable; a searchable library screen (EN + AR) as the cold path. New screen, new nav entry,
   search contract. The data spine already exists: **340 movements in `exerciseBank.js` with Arabic
   for all of them.**
2. **The exercise figures** (brief §7.9, §7.12, §7.13) — curves not hinges, the correct/wrong pair,
   the injury marked on the joint that takes it, the 7.5-head canon, per-movement view counts.
3. **The logo** (brief §7.2) — after the language, so the mark is drawn into a system that exists.
   It must carry *spot*, not just a dumbbell.
4. **Gym photography** (brief §7.6) — a ground, never a surface.

## 11. Risks

- 🔴 **Condensed uppercase names scan slower than sentence case**, and Arabic cannot use them at all.
  Fallback: sentence-case condensed, which keeps the geometry and drops the risk. Decided on the
  phone, not in the mockup.
- **Elie sees this as a shipped release** (his call). A daily user meeting a rebuilt home screen with
  no warning is the main adoption risk, and the mitigation is that the *information* does not move —
  same rows, same order, same actions.
- **Two idioms coexist between stage 2 and the later screens.** Accepted, and bounded by doing the
  screens in sequence rather than in parallel.
- **A lit gradient ground costs more to paint than a flat one.** One paint on a static background,
  so it should be free — but it gets measured on the phone rather than assumed.
