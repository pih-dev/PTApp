# SpotSet — The Design Pass (Task B) HANDOFF

**Last updated:** 2026-08-22 ~00:4x, Beirut. **THIS THREAD IS COMPLETE.**
**To resume:** Pierre types `continue` or `design`. **Read §0 back to him and stop.**
Do not investigate, do not re-derive, do not ask follow-up questions.

🔴 **STANDING INSTRUCTION FOR THIS SUBJECT: keep this file current AS YOU GO.** Update §0 and commit
at each milestone, on the assumption that a restart could end the session at any moment. `/wrap` is
the safety net, never the trigger.

> 📌 Other threads exist and are NOT this one: **`HANDOFF-figures.md`** (B2, the figures — trigger
> word `figures`), `HANDOFF.md` (the queued-task overview),
> `HANDOFF-multi-user-build.md` (Supabase / Task A — waiting out a soak), and
> `HANDOFF-spotset-publishing.md` (Play + Apple).

---

## 0. Status — read this out

- ✅ **THE DESIGN PASS IS FINISHED — v2.21.1 is live.** Five stages: skins (v2.17), the Dashboard
  (v2.18), the shell + shared primitives (v2.19), press affordance (v2.19.1), the deep screens
  (v2.20) and the last fixes (v2.20.1, v2.21.1). **No screen is still in the old idiom.**
- ✅ **B1, the movement library, shipped in v2.21.** A movement name is tappable in the program
  viewer; a searchable EN/AR library lives in General → Reference.
- ➡️ **THE LIVE THREAD IS NOW `HANDOFF-figures.md`** (trigger word `figures`). B2 is next and Pierre
  has cleared it to start.
- **The rules this pass produced are in `CLAUDE.md`** (CONVENTIONS + TRAPS), not here: paint from
  tokens · the accent never touches chrome · outline means off, fill means press · no emoji in the
  interface · `.card` is a row · one screen per pass · RTL kills uppercase AND letter-spacing ·
  never style a scrollbar in a touch app · contrast is measured against **both** ends of the ground.
- **What is left overall:** `docs/design/2026-08-22-what-is-left.md` — A6 (what the four tabs
  *are*, now that every screen is done), C4 (review finding P3 with a Schedule layout pass), and
  tracks B (figures, logo, photography) and C (Supabase, Play, Apple).
- 🔴 **Do not reopen a finished screen for polish without a reason from Pierre.** The pass ended
  because it was done, not because it ran out of ideas.

---

## 1. Where everything lives

| What | Where |
|---|---|
| The brief — evidence, every decision, both sides of the one reversal | `docs/design/2026-08-21-design-differentiation-brief.md` §1–§7.15 |
| The spec — approved, with the override applied | `docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md` |
| The mockup Pierre approved | Artifact **Plate & Bar**, `https://claude.ai/code/artifact/fc11283b-8402-46f5-8c14-e838bd51b432` |
| What shipped in stage 1 | `docs/instructions-v2.17.md` |
| The skin system | `src/skins.js` (list, default, migration) + token blocks in `src/styles.css` |
| Its gate | `scripts/sanity/sanity-skins.mjs` |
| Session transcript | `_archive/PTApp/claude-sessions/2026-08-21-design-pass-and-v2.17-FULL-SESSION.txt` |

## 2. What stage 1 actually changed

- `src/skins.js` **is new** and is the ONLY home for the skin list, the default and the migration.
  Adding a skin = one entry there + one token block in `styles.css`. There is no third place.
- 🔴 **A skin is custom-property VALUES and nothing else.** Identical layout, geometry and type in
  every skin; only hue changes. One that needs its own rule is a second design and does not ship.
- `.theme-light` → `[data-skin="steel"]`: **79 selectors renamed, values untouched.** Those
  per-element overrides are dark/light-era debt and retire screen by screen as each screen is
  rebuilt on tokens — **starting with the Dashboard in stage 2. Do not add more of them.**
- `App.jsx` writes `data-skin` on the app container; one setter applies and persists together.
- **Preference migration, not data migration.** `ptapp-theme === 'light'` → `steel`, else
  `midnight`, old key removed. It never lived in `data.json`.

## 3. What stage 2 must not do

- 🔴 **It is presentation only.** Every handler, dispatch and kernel call stays as it is —
  `getRenewalDueMap`, `getClientCountedSessions`, `getSessionOrdinal`, `buildSession`, the focus
  tags, the notes textarea. **If a kernel call or a reducer action has to change, the slice has
  grown out of scope and it stops.** That is how a restyle becomes a data incident.
- 🔴 **`styles.css` is shared.** Other screens still render `.card`. Grep every rule across all of
  `src/` before removing it, or the Dashboard pass silently breaks four other screens.
- **Both phones, both languages, every skin, before it is called done.** A skin is not shipped until
  its **Arabic** screenshot has been looked at — Arabic has no uppercase, so that build carries
  hierarchy through weight and letter-spacing and is judged on its own.

## 4. Verification standard set this session

Two gates were **made to fail on purpose before being trusted**, and that is now the expectation
here, not a flourish:

- `sanity-demo-whatsapp.mjs` — guard removed, gate went red naming the leaked number, guard restored.
- `sanity-skins.mjs` — one token deleted from `steel`, gate went red naming it, token restored.

And v2.17.0 was **verified in a browser against the built bundle**, not inferred from the source: a
seeded legacy light user migrated to `steel` with the old values intact, the picker flipped to
`midnight` and persisted, and both names rendered under `dir="rtl"`.

## 5. Commits this session (design thread)

`54db3bd` the Apple/iOS pipeline · `c38bff5` v2.16.1 demo WhatsApp fix · brief §7 → §7.15 across
five commits · spec written and then approved with the override · `3a6fb22` **v2.17.0**, deployed
and verified live.
