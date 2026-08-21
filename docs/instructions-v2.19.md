# v2.19.0 — the whole app in the plate and the bar

**Date:** 2026-08-22 · **Stage 3 of the design pass** ·
**Trigger:** Pierre, on seeing v2.18 — *"the landing page is very designed, but the rest are still
the same."* ·
**Spec:** `docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md` ·
**Stage 2 (the Dashboard):** `docs/instructions-v2.18.md`

---

## What changed, in one line

Every screen now speaks the language the Dashboard learned in v2.18 — because the *shared*
primitives moved onto the tokens, not because five screens were rebuilt one at a time.

## Why this was not the "big-bang restyle" the spec forbids

The spec's rule was *one screen per pass*, and it was written to stop a rebuild of five screens'
**markup and layout** landing at once. What shipped here is narrower and safer: **values and type
on classes that already exist.** No component's structure changed except two small, deliberate
edits (below). That is why it could be walked screen by screen in a browser instead of reasoned
about — and the coexistence cost had become the bigger problem, which is the thing the rule was
protecting against in the first place.

## What you will see

- **The shell.** The blue glass on the header and the tab bar is gone — both sit on the ground and
  are separated by a **bar shaft**. The active tab is **chalk, not a colour**: 🔴 the accent still
  never touches chrome, and a highlighted tab is the first place that rule usually breaks.
- **`.card` is a row now.** No fill, no outline, no shadow — a bar underneath. Every list on every
  screen inherits it. Anything that genuinely needs a container has a new `.panel` class.
- **Buttons.** Flat, condensed uppercase. The `#2563EB → #60A5FA` gradient that filled every primary
  button — one of the six traits the brief named — is gone. Primary is chalk-on-ground; secondary is
  an outlined shaft; WhatsApp keeps its own green because it is a third party's identity.
- **Statuses** read as mono instrument labels everywhere, not coloured pills. The Dashboard's badge
  treatment was promoted to `.badge` itself, so the four scoped overrides it used could be deleted.
- **Selection is chalk; load is the accent.** The selected day, the selected time slot, an active
  filter — all chrome, all chalk-on-bar. The dot under a day that *has* sessions is load, so it
  keeps the accent. Renewal-due went from a red-tinted box to the accent: red now means
  **destructive only** (cancel, delete).
- **Emoji left the interface.** 📊 Overview, 👥 My Clients, 📋 All Sessions, 💾/📝/💬/📖 in General,
  ✅ Complete, 📝 Edit, the 🏋️/📭/👤/🔍 empty states and the type emoji on rows and in `<option>`
  lists. 🔴 **WhatsApp message templates keep theirs** — that is text a client receives, not chrome.
- **The token screen** got the same treatment. It is reachable *before* login, which is exactly the
  surface a sweep of "the screens you can open" misses (the v2.15.0 trap).

## The two markup edits, and why they were allowed

1. **`Sessions.jsx`** — the row lost its inline `borderInlineStart: 3px solid <session-type colour>`
   and its type emoji, and picked up the Dashboard's row classes. The inline-start bar means
   *happening now* and nothing else; six type colours painting a list edge is the decoration the
   pass exists to remove.
2. **`General.jsx`** — the skin picker was given `.seg-toggle`. It had inherited `.lang-toggle`'s
   hard-coded 36px cells, sized for "Ar"/"En", so **"Midnight" and "Steel" overlapped each other**.
   Caught in the browser, not in review.

Everything else in this release is CSS. No reducer action, no kernel call, no dispatch changed;
`DATA_VERSION` stays **6**.

## 70 steel overrides retired

`[data-skin="steel"]` is now **the token block and nothing else** — the ~70 per-element overrides
inherited from the dark/light era are gone. They had to go in the same commit: written against the
old hardcoded rules, they would have fought every rule this pass rewrote. This is the retirement
v2.17 promised, arriving when the thing that justified it (everything painting from tokens) became
true.

## Verified

- `npm run build` + `verify-bundle`, and the full sanity suite by exit code — only the three spent
  live-diff gates fail, by design. `sanity-live-supabase-diff` (Task A's soak) **now passes**; the
  divergence reported during v2.18 has cleared.
- Walked in a browser against the **built** bundle on the DEMO credential: Dashboard, Clients,
  Schedule, Sessions, General and the token screen, in **midnight and steel**, and the Arabic build
  in RTL. Arabic keeps no uppercase and no letter-spacing; the condensed face is Latin-only, so RTL
  falls back to the body stack by design.

## Known, and deliberate

- **The exercise-figure and program screens were not opened in this pass.** They inherit the
  primitives like everything else, but their own layouts have not been judged. First thing to check
  when programs are next touched.
- **`--t1..--t5` / `--sep` survive** for inline styles in components. They are still the correct
  thing to use there; the palette tokens are for CSS.
- **The classification scale keeps its own hues** (Beg A → Pro) — an ordered scale is information,
  and flattening it to chalk would delete the meaning.
