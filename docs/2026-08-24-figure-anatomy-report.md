# Figure anatomy report — handed to the CCHealth session, 2026-08-24

Pierre, after reading the rebuilt judging sheet:

> "Report them to CC Health, let him deal with it. Ask him to do a pass, check for anomalies…
> One of them, laying face down, bending the knee backwards so the feet are above the body. But the
> feet are pointing towards the head instead of reverse. So this is anatomically impossible. And let
> it check for anatomically incorrect stuff in the figures. And what you mentioned regarding parts of
> the body are outside the frame also."

**Ownership: the CCHealth session runs the figures thread** (`HANDOFF-figures.md`, handover
2026-08-22). This document is the PTApp session's *report* — measurements and a diagnosis, nothing
edited. `src/figures/*` was not touched. Sent as a cross-session message; kept here because a
message dies with a session and a measurement should not.

Measured on master `0869e54`, live version v2.44.

---

## 1. The defect Pierre named — `knee-flexion` / "Lying Leg Curl"

A prone figure whose foot hooks back toward the head. Joint positions:

| joint | x | y |
|---|---|---|
| head | −175 | 691 |
| pelvis | 150 | 700 |
| kneeN | 347 | 700 |
| ankleN | 252 | 591 |
| toeN | 205 | 629 |

- **shin** (knee→ankle) `dx −95, dy −109` — lifts up and back toward the glute. **Correct.**
- **foot** (ankle→toe) `dx −47, dy +38` — hooks back **down and toward the head.** Not correct.

So the shin is right and the foot is not — which matters, because `archetypes.js` records that the
shin was *already* fixed for exactly this reason on 2026-08-23: *"a prone body inverts the sign
convention… so flexion here is POSITIVE: +129 lifts the heel toward the glute."* **The inversion
appears never to have been applied to the third leg value, the foot.**

### The evidence that it is the convention, not a one-off

Signed rotation from the shin vector to the foot vector, correct pose, per pattern:

| pattern | ankle turn | posture |
|---|---:|---|
| squat | −120° | upright |
| lunge | −88° | upright |
| calf-raise | −40° | upright |
| plank | **+39°** | prone |
| push-up | **+39°** | prone |
| knee-tuck | **+40°** | prone |
| `knee-flexion` | **−88°** | **prone — carries the upright sign** |
| `bird-dog` | **−80°** | **prone — same** |

Prone poses cluster near +40. Two carry the upright sign, and one of them is `bird-dog`, already
open as item 1c (support arm through the floor) — possibly a second defect in the same pose.

```bash
node -e "Promise.all([import('./src/figures/poses.js'),import('./src/figures/canon.js')]).then(([P,C])=>{const j=C.skeleton(P.PATTERN_SAMPLES()['Lying Leg Curl'].correct);console.log(j.kneeN,j.ankleN,j.toeN,j.head)})"
```

---

## 2. Parts of the body outside the frame

🔴 **There is no gate for this.** `sanity-figures.mjs` has a `FLOOR:` check for joints under the
baseline, but nothing checks the **viewBox** — which is `-450 -40 900 830`. Seventeen poses across
eleven patterns put a **joint centre** outside it, and the real overflow is worse because limbs have
girth.

| pattern | overflow (px past the edge) |
|---|---|
| `push-up` | correct R+92 · fault R+92 |
| `plank` | correct R+92 · fault R+92 |
| `knee-tuck` | correct R+70 B+36 · fault R+67 |
| `rotation` | correct T+46 · fault T+80 |
| `triceps-overhead` | correct T+51 |
| `dip` | correct T+43 |
| `anti-rotation` | correct T+3 · fault T+40 |
| `bird-dog` | correct R+27 B+36 · fault B+26 |
| `rollout` | fault R+8 |
| `hip-abduction` | fault B+3 |
| `lateral-raise` | fault T+0 |

**Suggested (the figures thread's call): a `FRAME:` check in `sanity-figures.mjs` beside `FLOOR:`.**
Same shape, and it would have found all seventeen without anyone looking — which is the point, since
the FLOOR gate itself exists because the last pose of this kind was found by scanning coordinates
and never by eye.

---

## 3. What the existing gate flags today

**Five worth a human eye:** `leg-press` (both shins past straight, +7°/+9°), `hip-abduction`,
`side-plank`, `knee-tuck`, `bird-dog` — the last four all with joints under the baseline.

**Five it reports that are not defects.** The ROM check measures a quantity that does not apply to a
support pose, and these are noise in the list:

| pattern | why the reading is correct |
|---|---|
| `plank`, `reverse-plank` | a straight support arm reads −90° by definition |
| `push-up` | the arm is loaded and straight at the top — that is the position |
| `knee-flexion` | a leg curl **is** a 126–145° knee bend |
| `triceps-overhead` | the elbow is fully overhead — the range is the exercise |

Teaching the gate to exempt support poses would keep the list readable. The judging sheet already
splits them (§4) so Pierre's eye is not spent on them.

---

## 4. The judging sheet

Rebuilt on v2.44, with the gate's flags **joined to the drawings** — flagged patterns are outlined
on both contact sheets and listed with their figures beside them. It runs `sanity-figures` rather
than copying its rules, so it cannot disagree with the build about what is wrong.

`node scripts/figures-artifact.mjs tmp/figures/judging-sheet.html` →
<https://claude.ai/code/artifact/98f057e0-9ba3-41eb-8576-70d5a7359149>
