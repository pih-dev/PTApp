# SpotSet — The Music (the opening suite) HANDOFF

**Created:** 2026-08-24, Beirut · **Last updated:** 2026-08-24 ~08:55 Beirut, at the `/wrap`.
**Owner thread:** the music, and only the music — the opening/showcase cues and the engine that
renders them. Not the app's audio playback, not the opening animation.
**To resume:** Pierre types `music`. **Read §0 back to him and stop.**

> 📌 Other threads that are NOT this one: `HANDOFF-figures.md` (the figures, owned by the **CCHealth
> session**), `HANDOFF-design.md`, `HANDOFF-multi-user-build.md` (Supabase),
> `HANDOFF-spotset-publishing.md` (Play + Apple), `HANDOFF.md` (the queued-task overview).

---

## 0. Status — read this out

- 🔴 **SHELVED, on Pierre's instruction (2026-08-24): _"just shelf them, we'll get back to the music
  later."_ Nothing here is waiting on anyone.** Do not restart it unprompted.
- 🟢 **The app is untouched and stays untouched.** The five v2.31 synthetic cues still ship, and
  Pierre rates them above everything built since: *"the five that are in the app are really good
  actually, compared to this."* Their `m4a` files in `public/` were never overwritten — verified
  md5-identical, and everything shipped is preserved with checksums in
  `_archive/PTApp/branding/2026-08-24-suite1-preserved/`.
- 🔴 **THREE ATTEMPTS, ALL REJECTED.** In order: `scripts/suite2/` seven acoustic chamber pieces
  (*"very bad"* — a flute or guitar led every one); `scripts/suite3/` seven orchestral showcase
  pieces (*"none of them are enjoyable… there's no harmony… I felt bleakness"*, only `engine`
  tolerable: *"it's okay, it's fine, it's not good, it's not great"*); and the re-voicing of the
  shipped five (*"certain bits are good, but there are things that are majorly wrong. Not usable."*).
- 🔴 **THE SYNTHESIS IS NOT THE PROBLEM — THE MUSIC IS.** He confirmed the orchestral set *"sound
  more realistic than synthesized"*, which was the original brief, and rejected it anyway on musical
  grounds. **Do not open this thread by writing new compositions.** Two rounds of new music were
  rejected and the pieces he rates highest already ship.
- **The one live lead, if he reopens it:** round three (the shipped five re-voiced) is the only
  attempt where he heard *specific* things wrong rather than disliking it wholesale. **Nobody has
  found out which things.** The first move is to ask him for one concrete example — a piece and a
  moment — not to re-do the pass on a guess.
- **What is worth keeping regardless of the music:** `scripts/lib/orchestra.mjs` (29 modelled
  voices, all gated), `scripts/check-orchestra.mjs`, `scripts/check-mix.mjs`,
  `scripts/check-arrangement.mjs`, and the frozen-score arrangement in `scripts/lib/suite1-score.mjs`
  that makes *"only the instruments changed"* a verifiable claim rather than a promise.
- 🔴 **Dolby, settled and verified against this ffmpeg build — do not re-investigate:** `ac3`,
  `eac3` and `truehd` all **stop at 5.1**, and **Atmos cannot be produced at all** (it needs JOC
  metadata only Dolby's licensed encoder emits). True 7.1 is available as 8-channel AAC with no
  Dolby badge. Pierre's standing call: **5.1 only**, and stereo for the app *"if I like them"*.
- **The question to ask on resume:** *"Round three — the five re-voiced — which piece, and which
  moment in it, was majorly wrong?"*

---

## 1. Where everything is

| | |
|---|---|
| The score (all eight v2.31 compositions, one copy) | `scripts/lib/suite1-score.mjs` |
| Synthetic renderer — **ships the app's audio** | `scripts/make-opening-suite.mjs` |
| Real-instrument renderer (round three) | `scripts/make-suite1-real.mjs` + `scripts/lib/voices-real.mjs` |
| The instrument engine | `scripts/lib/orchestra.mjs` |
| Round one pieces / round two pieces | `scripts/suite2/` · `scripts/suite3/` (each with a composer `README.md`) |
| Runner for rounds one and two | `scripts/make-suite.mjs --set=suite2\|suite3` |
| Audition page generator | `scripts/make-suite-page.mjs --set=…` |
| Gates | `check-orchestra.mjs` (voices) · `check-mix.mjs` (surround) · `check-arrangement.mjs` (did the re-voicing move the music) |
| Rendered output | `_archive/PTApp/branding/2026-08-23-suite2/`, `-2026-08-24-suite3/`, `-2026-08-24-suite1-real/` |
| **The shipped five, preserved with checksums** | `_archive/PTApp/branding/2026-08-24-suite1-preserved/` |

Full write-up, including why the v2.31 suite sounded synthesized and what each substitution was:
`docs/2026-08-24-music-engine-and-suites.md`.

## 2. Traps this thread produced (all in `docs/traps.md`)

- Two outputs kept in step by hand will drift — **derive one from the other**.
- A codec name does not tell you its channel layouts — **ask the encoder**.
- **Peak-normalising a set of tracks does not make them equally loud** — match on RMS.
- A diffuse reverb tail is only symmetric if you **make** it symmetric.
- **An absolute range cannot catch a gate's own subject — assert the CLAIM** comparatively.
- **Check the metric before blaming the model** — half the first gate run's "failures" were the
  measurement, not the music.

## 3. Verifying the app's audio is still what it always was

```bash
OUT_DIR=tmp/verify node scripts/make-opening-suite.mjs
md5sum public/opening-*.m4a tmp/verify/opening-*.m4a    # the five must match
```
`OUT_DIR` exists precisely so this check cannot overwrite the assets it is checking.
