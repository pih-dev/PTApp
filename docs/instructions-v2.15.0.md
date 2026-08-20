# v2.15.0 — the app is called SpotSet

**Shipped 2026-08-20.** Driven by the Play Store listing work, not by a feature request.
UI/branding only: **no schema change, `DATA_VERSION` stays 6**, no kernel touched, no migration.

## Why

The store listing was created as **SpotSet** (decided 2026-08-20,
`docs/2026-08-20-app-name-brainstorm.md`) while every screen in the app still read **PTApp**. That
mismatch was caught while reviewing the store screenshots as images: a tester installing "SpotSet"
would have opened an app called something else, and Google flags branding that disagrees with the
listing. "PTApp" is now only the repo and project name.

## What changed

| File | Change |
|---|---|
| `src/App.jsx` | header wordmark `PTApp` → `SpotSet`; debug-panel version → v2.15.0 |
| `index.html` | `<title>` and `apple-mobile-web-app-title` → SpotSet |
| `public/manifest.json` | `name` → "SpotSet — Personal Trainer", `short_name` → "SpotSet" |
| `android/app/src/main/res/mipmap-*` | launcher icons replaced with the SpotSet mark |
| `android/app/src/main/res/values/ic_launcher_background.xml` | `#FFFFFF` → `#2563EB` |
| `android/app/build.gradle` | `versionCode 1 → 2`, `versionName "1.0" → "2.15.0"` |

The subtitle under the wordmark still comes from `t(lang, 'personalTrainer')` and is unchanged, so
it remains translated in Arabic.

## The icon

White barbell glyph on the app's own accent gradient (`#2563EB → #60A5FA`). Generated, not drawn by
hand — the script is archived at `_archive/PTApp/branding/make_icon.py` and re-running it
reproduces the 512×512 store icon, the 1024×500 feature graphic and every launcher density.

🔴 **The adaptive-icon foreground is padded to the 66% safe zone.** Android crops 25% off each edge
of an adaptive foreground; the first attempt was full-bleed and clipped the outer plates. If the
icon is ever regenerated, keep the glyph at ~0.62 scale on a transparent canvas and let
`ic_launcher_background` supply the colour.

## What this release does NOT change

No data, no reducer action, no chart, no exercise-bank content, no sync behaviour. A device that
updates from v2.14.3 sees a different name and icon and nothing else.

## Deliberately NOT changed

`DOCS.instructions` in `General.jsx` still points at `instructions-v2.14.md`. The release-hygiene
rule bumps that pointer on **feature** releases; this one ships no feature, and the in-app
"App instructions" link is a user guide — pointing a trainer at a rename note would be a downgrade.
Bump it on the next release that actually changes what the app does.

## Related

- Store-publishing state, every declaration filed with Google, and the traps hit while filing them:
  `HANDOFF-spotset-publishing.md` §6 and §7.
- Privacy policy and data-deletion pages (published on gh-pages, required by both stores):
  `privacy.html`, `delete-data.html` on the `gh-pages` branch.
