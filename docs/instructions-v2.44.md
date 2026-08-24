# v2.44 — The Anatomy Pass (2026-08-23)

*(Backfilled 2026-08-24 by the publishing session — v2.44 shipped from the figures thread
without this file; release-hygiene rule 3. Full record: commit `4b5ea25`, `HANDOFF-figures.md`.)*

Pierre circled figures on the showcase wall: a knee bending the wrong way, hips wider than a
human ribcage. Both were real, found by instrumenting the coordinates rather than staring at
40px silhouettes.

## What changed
- **The knee** — lunge's rear shin (+74) swung anteriorly: the ankle sat in *front* of the knee.
  Re-authored as a real split squat (front thigh 60, rear knee 46, heel raised, toe touching).
  The fault still teaches the front knee past the toe.
- **The pelvis** — `front.hip 48` + 30-wide flanks printed 156-wide hips against a 110 ribcage
  over a 78 waist: a 2:1 cartoon pear. Proportions re-cut (chosen by rendering four candidate
  sets side by side); side-view depths fixed the same complaint in profile.
- **Same class, found by scanning:** hip-extension grounded on the kicking foot (support leg 40
  under the baseline) — now grounds on the standing leg; knee-flexion curled the heel into the
  floor (prone flips the sign); **the head is now joined by a neck** (15 units of gap had been
  hidden by the deltoids upright, wide open in side poses); sled's trailing knee un-hyperextended.
- **Three new gates:** KNEE (build fails above +20 hyperextension in upright side views, warns
  +6 — prone stays human judgement), FLOOR (warns on contact joints under the baseline), and the
  ROM gate stops judging front-view lateral leg angles against a sagittal range.

## Blast radius
All 680 authored figures — the girths are global. Sanity figures / movement-library / skins pass.

## Known, deliberately not fixed here
Bird-dog's support arm passed through the floor (arm 300 > thigh 187 — a level trunk cannot
ground both). Caught by the FLOOR gate, closed in v2.45.
