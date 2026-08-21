# SpotSet — The Design Pass (Task B) HANDOFF

**Last updated:** 2026-08-22 ~01:4x, Beirut.
**To resume:** Pierre types `continue` or `design`. **Read §0 back to him and stop.**
Do not investigate, do not re-derive, do not ask follow-up questions.

🔴 **STANDING INSTRUCTION FOR THIS SUBJECT: keep this file current AS YOU GO.** Update §0 and commit
at each milestone, on the assumption that a restart could end the session at any moment. `/wrap` is
the safety net, never the trigger.

> 📌 Three other threads exist and are NOT this one: `HANDOFF.md` (the queued-task overview),
> `HANDOFF-multi-user-build.md` (Supabase / Task A — waiting out a soak), and
> `HANDOFF-spotset-publishing.md` (Play + Apple).

---

## 0. Status — read this out

- ✅ **v2.18.0 IS LIVE** (Pages build verified `built`, `v2.18.0` served). **Stage 2 of the design
  pass: the Dashboard rebuilt in the plate and the bar.** The card is deleted, the week is seven
  loaded columns, a package is plates, type is Saira Condensed / Saira / IBM Plex Mono (bundled).
  `DATA_VERSION` stays 6, presentation only. Detail: `docs/instructions-v2.18.md`.
- **NEXT ACTION: pick the next screen and give it its own pass** — Schedule is the natural one
  (it shares the session row and still renders `.card`). 🔴 **Never a big-bang restyle**, and
  `[data-skin="steel"]`'s per-element overrides retire as each screen is rebuilt.
- 🔴 **Contrast is measured against BOTH ends of the ground gradient, never eyeballed.** The first
  stage-2 pass shipped a steel ramp at 1.4–2.7:1 — invisible, and only for the users who picked
  steel. The steel ground was lightened to a daylight value and both ramps re-derived.
  **`--chalk-faint` is decoration only: no text under 13px.**
- **Still outstanding from stage 1's list:** review finding P3 (SessionCard, scope B) was NOT folded
  in — the Dashboard row was rebuilt in place instead, and Schedule still has its own copy plus the
  `focus: []` bug at `Schedule.jsx:201`. **Do P3 with the Schedule pass**, where both copies are on
  the table at once.
- **The anchor is THE PLATE AND THE BAR.** Plates = the package (filled used / hollow left /
  all-accent spent and due), the bar = every divider. 🔴 **The card is deleted** — no outline, no
  hairline, no shadow. That one move breaks four of the six generated-look traits.
- **Palette shipped: "midnight & arc"** — ground `#0A1524` lit to `#0F2A52`, chalk `#E9EEF3`, dim
  `#9DAABB`, faint `#6E7D95`, accent **arc `#35B7E8`**, bar `#5A78A8`, ok `#4FC08D`, warn `#E0A32B`,
  anatomy `#F2622C`. Steel is the same eleven names at daylight values (`src/styles.css`).
  🔴 **THE ACCENT NEVER TOUCHES CHROME** — not tabs, buttons, links or focus rings. Load and urgency
  only. And **never `#2563EB`**, which is the exact value in the evidence table.
- 🔴 **PIERRE'S STANDING OVERRIDE (2026-08-21): build the best version, measure afterwards.**
  *"Go with the best and worry about performance later, most have flagship phones — this goes for
  anything else where you mention performance."* The old "cut anything that can't hold 60fps" rule
  is **struck**. Condensed uppercase names **stay**. `prefers-reduced-motion` is NOT covered by the
  override — that is accessibility.
- **Themes are USER-FACING and ship to the testers** — 2–4 named skins, not an OS mode. He reversed
  an earlier one-theme decision the same evening; both sides are recorded in the brief §7.7/§7.10 so
  nobody re-inverts it. His reasoning: fourteen close long-term clients are the cheapest feedback
  this product will ever get.
- **Three features came out of this session and each needs its own spec, in this order:**
  **(1) the movement library** — every exercise name in a session or program becomes tappable, plus
  a searchable screen (EN + AR). 🔴 **Probed, not assumed: `exerciseBank.js` already holds 340 of
  Elie's movements and `exerciseNamesAr.js` has Arabic for all of them.** The gap is that a name is
  currently a dead end. **(2) the exercise figures.** **(3) the logo** — never designed; the current
  icon is a Play-listing placeholder, and the mark must carry *spot*, not just a dumbbell.
- **Figure rules, learned the hard way this session:** curves not hinges, for **every** movement;
  the wrong figure **marks the injury on the joint that takes it**; a 7.5-head canon with the **hip
  at half of standing height**; the wrong figure reuses the **same bone lengths** as the correct one;
  and draw **the moment in the lift where the error lives**.
- **Line-drawn is the foundation, not the ceiling** — and 🔴 **the offline argument for it was WRONG
  and Pierre corrected it.** This is a native app: it downloads once, assets ship inside, and
  Lebanese 4G is good. The surviving reasons are download size and production cost (we can draw ~340
  movements; we cannot shoot them).
- **Gym photography is accepted as a GROUND, never a surface** — empty states, the complete moment,
  login. Never behind a list.

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
