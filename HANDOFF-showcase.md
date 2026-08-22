# SpotSet — The Mark, the Opening & the Showcase (B3) HANDOFF

**Last updated:** 2026-08-22 ~19:30, Beirut — end of the v2.25→v2.32 marathon (this session).
**To resume:** Pierre types `showcase`, `logo`, `suite`, `sound` — or `continue` right after
clearing this session. **Read §0 back to him and stop.** Do not investigate, do not draft, do not
ask follow-up questions.

> 📌 Sibling threads: figures → `HANDOFF-figures.md` (CCHealth session's, wrapped) · Play/Apple →
> `HANDOFF-spotset-publishing.md` · Supabase → `HANDOFF-multi-user-build.md`.

---

## 0. Status — read this out

- 🟢 **v2.32 IS THE SHIPPED STATE** — web (gh-pages, Pages `built`) and Pierre's phone (sideload
  APK vc9, delivered in-chat). It closes B3 except the two OPEN items below.
- **The suite is FINAL, Pierre's picks: anthem · engine · pulse · orbit · cascade.** Fixed engine
  (metallic disc ticks, no noise hats) and pulse (clean tonal riser) after his "sandpaper" review;
  arena/droplet/maqam retired. 🔴 **Any suite edit goes to BOTH scripts** —
  `scripts/make-opening-suite.mjs` (app AAC) and `-51.mjs` (TV 5.1) — kept in step BY HAND.
- **The showcase (logo tap): five pieces shuffle per cycle; the wall deals 24 DISTINCT random
  movements from all 340 each loop** (`src/showcaseFigures.js` `createWall()` — the used-Set is
  the no-duplicates guarantee). 🔴 **Never generate figure svg per animation frame** — frames are
  precomputed, crossfades are one build per swap.
- **The launch opening (3s) is APPROVED AND FROZEN in behaviour** — don't touch without Pierre.
  Sound: launch native-only (autoplay policy), showcase everywhere (the tap is the gesture).
- **The mark + backdrop are FROZEN** in `src/spotsetMark.js` (`pair-off-colour` + `pair-off-lines`;
  regenerate ONLY via `scripts/logo-candidates.mjs --freeze … --freeze-bg …`). Checked against the
  figures session's spun-path fixes: **byte-identical, verified** — the mark uses the flat
  projection those fixes don't touch.
- **Icon pipeline is complete**: `--export` (flattened SVGs + sharp PNGs → `_archive/PTApp/
  branding/2026-08-22-pair-mark/`) + `scripts/make-android-icons.mjs` (launcher mipmaps, in APKs
  since vc5). PWA icons in `public/`; store uploads use the archive set.
- 🔴 **OPEN #1 — Pierre's "S" idea:** arrange the facing pair to read as the S of SpotSet ("there
  will be blanks on the corners — we'll sort it out"). Next logo round; candidates sheet artifact
  exists (`/artifacts` → "The SpotSet Mark").
- 🔴 **OPEN #2 — Play upload of the current build** waits on the vc4 review (see
  `HANDOFF-spotset-publishing.md` §0 — probe the console before quoting status). Latest archived
  release: `_archive/PTApp/releases/2026-08-22-spotset-v2.32-vc9.apk`. Next numbers: v2.32.1+/vc10+
  (agreed with the figures session).
- **5.1 TV files** (Pierre's soundbar demos): `_archive/PTApp/branding/2026-08-22-suite-5.1/` —
  final five; arena renders only with `ALL_51=1` (his private THX homage, never ships).
- **Parked, his word:** money tracking DEFERRED (no in-app payments; Elie paid directly). Fresh-eyes
  leftovers: `docs/design/2026-08-22-fresh-eyes-structure-review.md`.

## 1. The build/ship recipe this thread uses

- Web: standard pipeline (CLAUDE.md) — deploy via the STANDING WORKTREE `C:/projects/PTApp-ghpages`,
  never checkout; core five files + the audio set (`opening.wav` + `opening-*.m4a`).
- APK: `npx cap sync android` → gradlew with **JDK 21** (`JAVA_HOME='/c/Program Files/Microsoft/
  jdk-21.0.12.8-hotspot'`) → 🔴 verify versionName INSIDE the artifact (`aapt2 dump badging`) and
  `apksigner verify` — never the exit code. Archive every release to `_archive/PTApp/releases/`.
- Audio: ffmpeg is on the PC (winget `Gyan.FFmpeg`, path under
  `%LOCALAPPDATA%/Microsoft/WinGet/Packages/Gyan.FFmpeg…/bin`). Suite audition: `WAV_ONLY=1 node
  scripts/make-opening-suite.mjs` (wavs to `tmp/suite/`, public untouched).

## 2. Timing couplings (change one ⇒ change all)

Opening hits 0.35s/0.85s (`make-opening-suite*.mjs` shared kernel) = the two figures landing
(`.pm-*` delays, styles.css) · showcase `LOOP_MS` 25400 ≈ piece length 25.2s · the wall stagger is
CSS `animation-delay` off the cycle remount (per-cell `arrived` flag for crossfade swaps).
