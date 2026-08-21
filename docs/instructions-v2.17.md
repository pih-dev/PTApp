# v2.17.0 — skins replace the dark/light pair (stage 1 of the design pass)

**Released:** 2026-08-21 · **`DATA_VERSION` unchanged (6), no migration of app data.**
**Spec:** `docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md` §3.

## What changes for the user

**Nothing looks different.** That is deliberate, and it is the whole point of this release.

The Drk/Lit toggle in General is now a **skin picker** — today it lists **Midnight** (what was the
dark theme) and **Steel** (what was the light theme), and it grows to three or four names as more
are designed. Whichever you were on, you stay on it: the old preference is migrated the first time
the new build launches.

**Why it ships alone.** Stage 2 rebuilds the Dashboard in the new visual language. If the switching
mechanism and the repaint shipped together and something looked wrong, there would be no way to tell
which half did it. So the mechanism ships first, invisible, and stage 2 changes only paint.

## What changed underneath

- **`src/skins.js` is new and owns the skin list, the default, and the migration.** Adding a skin is
  one entry there plus one token block in `styles.css`. There is no third place, on purpose.
- 🔴 **A skin is a block of custom-property VALUES and nothing else.** Every skin carries identical
  layout, geometry and type — only hue changes. If a skin needs its own rule to work, it is a second
  design, not a skin, and it does not ship.
- **`.theme-light` became `[data-skin="steel"]`** — a mechanical rename of 79 selectors, values
  untouched. Those per-element overrides are inherited debt from the dark/light era; they retire
  screen by screen as each screen is rebuilt on the tokens, starting with the Dashboard.
- **`App.jsx` writes `data-skin` on the app container** and persists through one setter, so no call
  site can apply a skin without saving it, or save one it did not apply.
- **Preference migration, not data migration:** `ptapp-theme === 'light'` → `steel`, anything else →
  `midnight`, then the old key is removed. It never lived in `data.json`, so `DATA_VERSION` is
  untouched, there is no `migrateData` step and no live-diff gate is needed.
- **Arabic skin names use the standing transliteration rule** — ميدنايت / ستيل, the English term in
  Arabic letters, because a literal translation of a colour name would not be what anyone says.

## Gates

**`scripts/sanity/sanity-skins.mjs` is new**, and it is structural plus behavioural:

- 🔴 **Every skin defines every token.** This is the assertion the file exists for: custom properties
  cascade, so a skin that omits one silently inherits the previous skin's value. Nothing errors, the
  skin you are working in looks right, and the bug appears only for the user who picked the other
  one. **Made to fail on purpose before being trusted** — one token deleted from `steel`, gate red
  naming it, token restored, green.
- **No component paints an rgba white/black literal** — the "never hardcode rgba" rule, finally
  enforced instead of remembered. `ErrorBoundary.jsx` is exempt and the gate says why: it renders
  after the app has crashed, so it imports nothing, and the gate re-asserts that it still imports
  nothing rather than letting the exemption rot into a blanket pass.
- **The skin list has one home** — no file outside `skins.js` names a skin id or reads the retired
  `ptapp-theme` key.
- **The migration runs for real** under a fake `localStorage`, in six cases including an explicit
  skin beating a stale legacy theme, an unknown stored id, and 🔴 **storage that throws** — the iOS
  "Block All Cookies" trap. A preference must degrade to the default look, never take down first paint.

**Verified in a browser against the built bundle, not inferred:** a seeded legacy light user migrated
to `steel` with the old values intact (`--t1: rgba(30,27,75,.92)`, the same canvas gradient); the
picker flipped to `midnight`, persisted, and re-rendered; and both names render correctly in Arabic
with `dir="rtl"`.

Full suite: 18 of 21 pass. The 3 failures are the spent live-diff gates that fail by design.
