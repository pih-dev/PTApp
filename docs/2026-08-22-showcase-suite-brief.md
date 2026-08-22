# The Showcase Suite — Pierre's ask, specified before building (2026-08-22)

**Status: SPECIFIED, NOT BUILT.** Captured right after he played v2.30.1 on the TV ("amazing…
I have a soundbar"). Next session builds THIS, as v2.31. The launch opening (3s) is UNCHANGED —
only the logo-tap showcase grows.

## His words, the load-bearing parts
- "On a press of the logo, prolong it — prolong the music. Be creative, same quality, same good
  stuff. Like Atmos. It plays well and surround. I have a soundbar."
- "There are a lot of 360° frames in the movements. Play the original one, then move it to the
  up-left, and next to it another one, populate the screen — three across or four across, then
  another four below."
- "How long — reasonable, like twenty, twenty-five seconds."

## The piece (~25s, loops until Close; Replay restarts)
1. **0–3.0s** — the approved opening exactly as shipped (hero pair + two hits + word).
2. **~2.8s** — the hero wrapper transitions (transform only) to the TOP-LEFT cell of a grid.
3. **3.5–13s** — the wall fills: 7 more cells stagger in (~1.3s apart), 4 across × 2 rows
   (3 across on narrow screens via CSS grid auto-fit).
4. **13–24s** — the wall lives: rotatable pairs TURN (mix ping-pong), the rest CROSSFADE through
   different movements' marks (340 to draw from — the library is the show).
5. **24–25s** — resolve, fade, loop (cycle++ restarts grid + audio).

## The music (~25.2s, one file, deterministic synthesis like the opening)
0–3s the shipped opening verbatim → 3–19s slow A-minor journey (roots A1→F1→C2→G1, ~4s each:
deep detuned pads, a soft sub pulse every 2s, breathing shimmer, sparse bell pings) → 18.5–22s
riser build → 22s the biggest DUM + held bloom → decay to a loop-clean tail. Same missing-
fundamental harmonic stacking so it lands on phone speakers AND digs deep on the soundbar.

## Engineering facts probed 2026-08-22 (re-probe before trusting)
- 🔴 **No ffmpeg on this machine** (`where ffmpeg` empty). A 25s stereo 44.1k WAV is ~4.4 MB.
  Options in order: (a) install ffmpeg → ~600 KB m4a; (b) ship 22.05 kHz WAV (~2.2 MB, shimmer
  capped ~10 kHz); (c) ship the 4.4 MB WAV (APK ~8 MB total — fine for closed testing; web
  fetches it only on the tap). Decide at build time; (a) preferred.
- **PATTERN_SAMPLES has only 2 rotatable entries** (Arnold Dumbbell Press, Deadlift) — the 24
  rotatable MOVEMENTS need a per-movement scan (`figureFor(name).rotatable` over EXERCISES).
- **Per-frame svg generation is too hot for 60fps** (8 cells × 30fps × FK+ribbon ≈ 36% CPU).
  Plan: precompute ~12 mark-mode frames per rotatable cell at showcase mount (behind phase 1),
  cycle at ~10fps ping-pong, staggered offsets; crossfade cells swap whole marks at ~0.25s fades.
  New module `src/showcaseFigures.js` (this session's file) IMPORTING figures read-only —
  the figures-session ownership ban is on EDITING `src/figures/*`, not importing it.
- **Versioning:** v2.31, android vc8/"2.31". The suite file joins the gh-pages deploy list
  (SEVEN files) — update the CLAUDE.md pipeline line and the release docs in the same commit.
- Splash showcase mode already has the right skeleton (cycle remount, Replay/Close, backdrop
  close, audio ref); LOOP_MS becomes ~25500 and the phase timeline drives classes.
