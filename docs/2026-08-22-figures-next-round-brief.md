# The figures — what Pierre asked for next (2026-08-22, before the clear)

**Captured verbatim-where-it-matters, because the next session runs at Opus 5 / xhigh effort and
starts from this file.** Nothing here is built. Read this before touching `src/figures/`.

Related: `docs/2026-08-22-figures-3d-options.md` (the staged path to 3D),
`HANDOFF-figures.md` §0 (state), `docs/design/2026-08-21-design-differentiation-brief.md` (the
visual law the figures obey).

---

## 1. Zoom lands in the wrong place

> *"It zooms in to where the section where it's important. But some, it's a fixed zoom… for example
> a shoulder exercise, the important stuff are towards the top third of the image. When I click
> zoom, it zooms to the center, and most of the important stuff are out of the picture."*

**What is true today:** `transformOrigin: 'center center'` — every figure zooms about the geometric
centre of the cell, which is roughly the hips.

**What it should do:** zoom about the part of the figure that matters for THAT movement. The app
already knows where that is and does not need a new field to guess it:

- the **fault marker** joint (`faultJoint.joints`) — that is by definition the point being taught;
- failing that, the midpoint of the **posture line** (`guide.joints`);
- for the correct figure, the same anchor as its fault twin, so the pair stays comparable.

🔴 **Both halves must zoom about the SAME anchor**, or the pair stops being a comparison — the same
rule that makes the rotation drag turn both figures together.

## 2. The gestures are inverted

> *"I don't understand what's the issue with dragging… you don't want the finger gesture to be
> instantly, like, for example, moving the finger will move the model around and then pinching in
> and out will zoom. And when it's zoomed, also you can rotate around."*

He wants **direct manipulation**, not a mode:

| Gesture | Should do |
|---|---|
| one finger drag | turn the model — immediately, no double-tap first |
| pinch | zoom in / out — continuous, not a 1× / 2.2× toggle |
| one finger drag **while zoomed** | still turns; panning is secondary, not the whole meaning |

**And he answered the objection that produced the current design.** I argued pinch needs
`touch-action: none` and the bottom sheet must keep its vertical scroll. His reply:

> *"That's not an issue because that card, whichever move is clicked, that card doesn't need to
> scroll. All the information is there. If it's not, we need to do something about it… It should
> work. I mean, I've seen it."*

🔴 **So the constraint is removed by decision: the movement sheet should FIT.** The next round makes
the sheet fit its viewport — or gives the figure block its own non-scrolling surface — and then the
figure can take `touch-action: none` and own its gestures properly. Do not re-argue this; he has
ruled, and he is right that it is achievable.

## 3. The equipment should rotate, not swap

> *"When you zoom the bench press, the board has two positions, side view and top view, but it could
> rotate."*

**What is true today:** equipment swaps at `mix > 0.5` (`render.js`) because a bench from the side
and a bench from above are different shapes, and interpolating them produces a third object.

**What he wants:** the bench turns with the figure. That needs the equipment to be described with
enough structure to rotate — a slab with a length, a width and a height rather than a 2D quad. This
is the same problem as the figure's own depth, and it is round 4 territory (`figures-3d-options.md`).

## 4. Colour the equipment blue

> *"So the equipment, colour them in blue."*

Currently equipment paints in `currentColor` at 0.42 opacity — deliberately subordinate. He wants it
to read as its own thing.

🔴 **It must be a TOKEN, per skin, like every other colour** — a new figure-internal token beside
`--muscle`, `--muscle-2` and `--anatomy`. **Never `#2563EB`** (the retired generated blue) and it
must not be confusable with `--accent`, which means load and urgency and never touches chrome.
`sanity-skins.mjs` asserts every skin defines every token; adding one means updating that list.

## 5. 🔴 THE FAULT FIGURE SHOULD HIGHLIGHT DIFFERENT MUSCLES — this is the big one

> *"The right posture has the muscles highlighted. While the wrong posture highlights the same
> muscles. Sometimes if I'm doing chest or shoulders, if I do a different posture, different muscles
> move… It might not be the wrong posture. If it's a different posture, it's probably a different
> muscle. Like if I'm doing shoulders, if for example my back is inclined, I could be moving more of
> my chest muscles rather than my shoulders… I know from myself when I'm doing deadlift, if I don't
> have the right posture, my arms would tire rather than doing the correct."*

**What is true today:** `poses.js → musclesFor(ex)` reads the movement's muscles from the bank and
uses the SAME list for both halves of the pair. The fault figure's wash is therefore a lie: it shows
what the movement *should* train, on a figure that is not doing it.

**What it should be:** an archetype's `fault` may declare its own muscles — what the body is actually
using in that position. Examples he gave:

| Pattern | Correct | The faulty version actually loads |
|---|---|---|
| overhead press with the torso inclined | delts | chest |
| deadlift with a rounded back | glutes / hamstrings | erectors, and the **arms/forearms** ("my arms would tire") |

🔴 **This is not decoration — it is the strongest teaching device in the whole feature**, because it
answers "why isn't this working" and not merely "you're doing it wrong". And it reframes the pair:
**not right-versus-wrong, but this-trains-X versus that-trains-Y.** Consider whether the captions
should change with it.

🔴 **It also falls under the claims rule** (`figureText.js` header): say what the position does, not
what it causes. "The chest takes over" is mechanics. Keep it there.

## 6. Some movements need a SEQUENCE, not a pair

> *"The military press, for example, needs more than one picture. So a sequence of pictures — the
> first position, and then when you lift it, and then flip the bar up, and then before you move up,
> and then finally the up position. So certain moves need several positions."*

**What is true today:** a pattern has `correct`, `fault`, and optionally one `extra` (a second
camera). There is no concept of a sequence of MOMENTS in one lift.

**What it needs:** an ordered list of positions for the movements where the path matters, not just
the endpoints. Open questions for the next session to settle with him:

1. Does the sequence replace the pair, or does each STEP get its own correct/fault pair? (The pair is
   the feature; my instinct is each step keeps its pair, and a step with no common fault shows one
   figure.)
2. How is it navigated — the same drag, a step strip, or auto-advance? 🔴 **Auto-advance would be
   motion and must honour `prefers-reduced-motion`.**
3. Which movements need it? Certainly the Olympic-ish and multi-phase lifts. Almost certainly NOT
   the 44 patterns wholesale — this is per-movement, and the first honest answer is a short list.

---

## And two things queued that are NOT figures

### The design refinement round — at xhigh

> *"In the to-do, after we're done with our current tasks, we need to do a round on the extra high
> of the design refinements. The app — okay, we changed the overall design, but it's not where I
> want it to be. It can be much, much, much better."*

The v2.17–v2.20.1 design pass shipped the language (skins, tokens, the plate and the bar). This is a
second pass on top of it, at xhigh, on quality rather than mechanism. 🔴 **Use the fresh-eyes rule
already in KNOWN ISSUES:** strip all formatting, hand structure and words to a subagent that has
never seen it, brief it to argue the opposite side.

### The logo

> *"We need to work on the logo. By the logo I mean the logo itself and the name. Maybe the name is
> fine, but the logo itself. We can work on the colours, and also the logo could be two silhouettes
> to represent this amazing thing — the right posture, wrong posture. Can choose one of them, one of
> the silhouettes."*

- **The name SpotSet stays** (`com.spotset.app` is permanent regardless).
- **The mark is open.** His idea, and it is a good one: the logo is drawn FROM the figure library —
  two silhouettes, or one, carrying the correct/fault idea that is the app's actual thesis.
- 🔴 This is B3 in the original plan, and the plan said it comes AFTER the figures **so that the mark
  is drawn into a system that exists**. That system now exists: 44 patterns, one canon, a token
  palette. The logo can finally be drawn from it rather than beside it.
