# v2.18.0 — The Dashboard, rebuilt in the plate and the bar

**Date:** 2026-08-21 · **Stage 2 of the design pass** ·
**Spec:** `docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md` (§2, §4, §6) ·
**Brief:** `docs/design/2026-08-21-design-differentiation-brief.md` ·
**Stage 1 (the skin system, no visual change):** `docs/instructions-v2.17.md`

---

## What changed, in one line

The home screen no longer looks like something an LLM produced: the card is gone, the week is drawn
as load on a rack, a package is drawn as plates on a bar, and the app has its own type.

## What you will see on the phone

- **No cards.** Session rows sit directly on a lit ground and are separated by a **bar shaft** — a
  2 px divider, not a hairline box. Nothing floats, nothing has an outline, nothing has a shadow.
- **The three coloured stat tiles are gone.** In their place, the week reads as **seven loaded
  columns** — one segment per session, one column per day, today's column on the accent. The exact
  total sits beside it in mono.
- **A package is plates.** Filled = used, hollow = remaining, **all accent = spent and due to
  renew**. Contracts larger than 16 sessions draw a loaded shaft instead of a countable disc row.
- **Type.** Names and labels are **Saira Condensed uppercase**; body is **Saira**; every digit is
  **IBM Plex Mono** with tabular figures, so times and counts stop jittering between renders.
- **The session-type colour left the row.** The inline-start bar now means exactly one thing: the
  session happening right now. The type is a small mono mark instead.
- **Emoji are gone from this screen** — the 📊 in "Overview", the 📋 and 📅 section titles, the 🏋️
  empty state (now a drawn bar), and the emoji inside the inline type selector, which a `<select>`
  would otherwise print back onto the surface.
- **Movement.** Rows rise in on first paint, plates load upward, a row presses to 0.99 on tap. All of
  it is disabled under `prefers-reduced-motion: reduce`.

## What did NOT change — and this is the point

🔴 **This release changes presentation and nothing else.** Every handler, every dispatch, every
kernel call is byte-for-byte the behaviour of v2.17: `getRenewalDueMap`, `getEffectiveSessionCount`,
`getFocusTags`, `getStatus`, `sendReminderWhatsApp`, `buildSession`, the focus tags, the notes
textarea, the 2-hour completed-session rolloff, the action sheet, the edit modal, the cancel prompt.
`DATA_VERSION` stays **6**. There is no migration and no new live-diff gate, because nothing about
the stored shape moved.

The rule from the spec, kept: *if a kernel call or a reducer action has to change, the slice has
grown out of scope and it stops.* That is how a restyle becomes a data incident.

The same discipline decided one small thing worth recording: the plate rows read `contractSize` and
the effective count from **`getRenewalDueMap`** — the map the renewal banner already consumed — so
the plates and the renewal list cannot disagree about how full a package is. No new counting path
was written to feed the new visual.

## Files

| File | Change |
|---|---|
| `src/components/Dashboard.jsx` | rebuilt presentation; `Bar`, `Plates`, `LoadWeek` are local components; handlers untouched |
| `src/styles.css` | the `midnight & arc` palette as tokens in **both** skins; the ground painted on `.app-container`; the `THE PLATE AND THE BAR` section; the three `.stat-*` rules **deleted** (grepped — Dashboard was the only consumer) |
| `src/fonts.css` | **new, generated** — Saira Condensed / Saira / IBM Plex Mono, latin subsets, base64 |
| `scripts/build_fonts.mjs` | **new** — regenerates the above; fonts are bundled, never fetched |
| `src/components/Icons.jsx` | `BarMark` — the drawn loaded bar for the empty state |
| `src/i18n.js` | the 📊 dropped from `overview`, EN + AR |
| `scripts/sanity/sanity-skins.mjs` | the eleven new tokens added to the token contract |
| `src/App.jsx`, `src/components/General.jsx` | version + docs link bumped to v2.18 |

## The palette, and the rule that outlives it

```
ground #0A1524 · lit #123262 · raised #111F33
chalk  #E9EEF3 · dim #8D9BAC · faint #55637A
accent #35B7E8 (arc) · bar #26374E · ok #4FC08D · warn #E0A32B · anatomy #F2622C
```

🔴 **The accent never touches chrome** — not a tab, not a button, not a link, not a focus ring. It
marks load, urgency and the live session. `steel` carries the same eleven names at daylight values
(the arc deepened to `#0E6E95` so it still reads on a light ground). **Every skin defines every
token**, and `sanity-skins.mjs` fails the build if one is missing — proven by deleting `--accent`
from `steel`, watching the gate name it, and putting it back.

## Verified

- `npm run build` + `node scripts/verify-bundle.mjs` — the bundle parses (622 KB, up from 405 KB;
  the fonts are 221 KB of that, and per Pierre's standing override that is a measurement to take
  later, not a reason to design smaller).
- The whole sanity suite by exit code. The only failures are the ones that were already failing:
  the three spent live-diff gates, plus `sanity-live-supabase-diff` — **that one belongs to the
  multi-user soak thread, not to this release**, and it is reporting a real divergence in two
  session records that `HANDOFF-multi-user-build.md` owns.
- In a real browser against the **built** bundle, on the DEMO credential: midnight, steel, English
  and **Arabic** — RTL mirrors the bars, the plates fill from the right, and the week strip carries
  Arabic day letters from `Intl`, with no uppercase and **no letter-spacing** (spacing Arabic breaks
  its joins), hierarchy carried by weight instead.

## Known, and deliberate

- **Two idioms coexist.** Clients, Schedule, Sessions and General still render `.card` in the old
  look. Each gets its own pass; doing them in parallel is how four screens break at once.
- **The header and nav bar are still the old blue chrome**, including `#2563EB`. They belong to the
  app-shell pass, not to this slice.
- **`steel`'s per-element overrides survive** for the screens that still use them. They retire screen
  by screen; the Dashboard added none.
- **Arabic is not bundled.** Saira has no Arabic coverage, so the Arabic build uses the platform
  face. Bundling IBM Plex Sans Arabic is a follow-on, not a blocker.
