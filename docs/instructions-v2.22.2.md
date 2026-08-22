# SpotSet v2.22.2 — the coaching text stops naming injuries

**Date:** 2026-08-22 · **Trigger:** an adversarial review of the v2.22 clinical text, run as part of
the figures workflow · **Thread:** `HANDOFF-figures.md`

---

## What changed, and why it mattered

The v2.22 coaching text named a diagnosis per movement — ACL, labrum, disc, meniscus, impingement —
and attached a confidence to each: *the classic*, *the long-established mechanism*, *a documented
cause*. **Eight different strength-of-evidence phrasings across seven entries, none of them
sourceable, and several of them wrong:**

- **Leg Press was factually backwards.** It said locking out loads the meniscus. Meniscal loading
  peaks in deep flexion under compression, not at full extension.
- **Chest Press and the bench press's third figure** both leaned on the subacromial-impingement
  model, which is the specific thing shoulder medicine has moved away from.
- **Back Squat** imported an ACL claim from the landing-and-cutting literature into a slow,
  bilateral, closed-chain lift.
- **Pull-Up** named the labrum — a structure identified by examination and imaging, not by watching
  someone swing on a bar.
- **The Arabic was stronger than the English**, translating "mechanism" as **سبب** (cause) and
  quietly upgrading every hedge for half the audience.

## The rule now

> **Say what the position does, not what it causes.**

Mechanics are observable and uncontested — where the load goes, which tissue is at the end of its
range, what stops doing the work. Causation is a claim about a population; it needs a citation this
file cannot carry, and a member who reads the name of a structure that can tear will map his own
aches onto it.

**`sanity-figures.mjs` now fails the build** on any figure text containing an evidence-grade word
(*documented, classic, long-established, well-established, proven, clinically*) or a named pathology
(*ACL, MCL, labrum, meniscus, impingement, herniation, tendinopathy…*). All seven entries were
rewritten; `FIGURE_TEXT_VERSION` is 2.

## And the review flag is now on screen

Every entry ships `reviewed: false` until Elie has read it. Until v2.22.1 that flag was returned by
`figureText()` and used by nobody — **a safety process that existed only in a code comment.** The
panel now prints *"Coaching text — not yet reviewed by Elie"* under the cue, in both languages. It
also gives Elie a visible to-do the moment he opens any movement.

## The Arabic pass

A native-Levantine review caught, and this release fixes: **بيرفع → بيطلع** (the hips lift
*themselves*), **ضهر → ظهر** throughout, **رجل → إجر** for foot, the MSA imperative **ادفع ركبتيك**
replaced with the way it is actually said, **تقوّس** disambiguated between rounding and arching, and
the 45° cue corrected from "bring them back *by* 45°" to "bring them *to* 45°".

## Also in this release

The seven figures picked up refinements from six parallel biomechanics reviews: the posture chain on
the chest press now starts in the **trunk** (an elbow riding high only means something against the
torso it hangs from), the pull-up chain reads **from the bar down into the body**, the leg press
chain runs **foot to trunk**, and the deadlift's muscle split was corrected — the **hips** are the
prime movers, the erectors hold a shape.

**Still open, and it is Pierre's and Elie's call:** the review argues the Leg Press should draw
*going too deep* — the pelvis peeling off the seat pad and the back rounding — rather than snapping
into lockout. That is one pose to change, and it is recorded in `HANDOFF-figures.md`.
