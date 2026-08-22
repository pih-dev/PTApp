# v2.34 — Needle: two new skins, and why the other direction lost

**Released:** 2026-08-22 · values only, no layout change · no schema change, `DATA_VERSION` stays 6.

## What you do

**General → the skin picker → Lume.** (Or **Enamel** for daylight.)

Midnight and Steel are still there, unchanged. 🔴 **Your phone keeps whatever it already had** —
`loadSkin()` returns the stored value, so nothing repainted itself behind your back. New installs
open on Lume. Reverting is picking Midnight again; there is nothing to undo.

## The decision, and what actually decided it

Two directions were developed independently, each given one lens, the full anti-slop ban list, and
the same three-metre constraint. Both are written up in the two-directions artifact.

- **The Platform** — take the accent from the 15 kg competition plate and the hazard tape. Its
  argument: *this room already assigned yellow a meaning; cyan came from nowhere.*
- **Needle** — take it from the split-second stopwatch. Warm soot face, aged-lume numerals, one
  signal-orange needle. Its argument: *that instrument family solved "read it in a glance,
  mid-effort, by someone who cannot stop" a century ago.*

**Needle wins, on two things, one of which is Pierre's own observation.**

1. 🔴 **There is no ONE room.** Pierre, sending the photos: *"this shouldn't be relevant because this
   application is gonna be used by tens, hundreds of users at different setups."* That sentence is
   fatal to The Platform specifically, because its whole premise is *take the colour from the room*.
   His gym's yellow is a mural on one wall of one gym. Needle derives from a **class of object**,
   not a place, and that travels to any gym on earth.
2. 🔴 **The photos show the current palette is camouflage.** Black tile floor, charcoal ceiling,
   bright white LED strips — and Precor machines in **grey, silver and cyan**. Midnight-and-arc is
   the palette of the equipment it sits next to. The app disappears into the machine. Warm soot with
   an orange needle is the one thing in those photographs that would stand out on a bench across the
   room, which is exactly the three-metre goal.

Also confirmed by the photos and acted on: **these gyms are BRIGHT** — glass on two or three sides,
daylight, white LED. Enamel is not an afterthought skin, and it is grey-leaning enamel rather than
cream on purpose, or it lands straight in the warm-craft palette every generated "premium" design
already uses.

## The two skins

Values only. **Every skin carries identical layout, geometry and type** — if a look needs a layout
change it is not a skin, and it does not ship as one.

| | **Lume** (low gym light) | **Enamel** (daylight) |
|---|---|---|
| ground / lit / raised | `#171511` `#24211A` `#2E2A22` | `#E8E6E1` `#F1EFEA` `#DBD8D1` |
| chalk / dim / faint | `#EDE4CE` `#B4AB93` `#5C5647` | `#26231D` `#5B564B` `#A9A498` |
| bar | `#3A3529` | `#C6C2B8` |
| accent (load + urgency) | `#E07B39` | `#BD5E1E` |
| ok / warn | `#74B36A` `#E2B93B` | `#3E7A34` `#8F6B00` |
| anatomy / muscle / muscle-2 / equipment | `#D2434B` `#4DB8A8` `#2F7A70` `#8493A9` | `#B02E37` `#176158` `#45877E` `#5A6B85` |

Contrast, as computed by the author of the direction: **Lume** chalk ~14.2:1 on ground and ~12.7:1
on the lit end, dim ~7.9 / ~7.0. **Enamel** chalk ~12.2 / ~13.2, dim ~5.9 / ~6.4. Both clear text at
4.5:1 and graphics at 3:1 against **both ends** of the ground gradient, which is the rule that
matters — the lit end is brighter and it is exactly where the top strip sits.

🔴 **Two values it flagged about itself rather than asserting:** Enamel's `--muscle-2` may drop to
about 3.0:1 against the lit ground, and `--warn` at ~4.0:1 passes for graphics but would fail if any
skin ever set small text in it. Both are worth checking on a real screen.

## 🔴 The one part that is Elie's call, not ours — ask him 2026-08-23

**The figures move from red muscle to teal muscle.** With an orange accent, an *orange* fault marker
cannot read as "fault", so the fault takes crimson (the redline) and the muscles take teal — major
and minor tick of one hue, which is how a dial separates prime from supporting.

The cost is real and it is his: **every anatomy chart he has ever taught from paints working muscle
red.** The direction's own author named this as the thing most likely to sink it and said to test it
on him before shipping. It is shipping ahead of that only because it is behind a skin the user picks
and reverting is four hex values in one commit.

**Show him a movement figure in Lume first thing.** If he says muscle must stay red, the fix is to
move the accent off orange rather than to fight him — the anatomy convention is older than this app.

## Why both old skins stay

Nothing was removed. A skin is a preference, and silently repainting someone's app is a surprise, not
a design decision. Midnight remains the palette Elie has used for months and the one every figure was
reviewed under.

## Files

| File | Change |
|---|---|
| `src/styles.css` | Two new `[data-skin]` token blocks, `lume` and `enamel`. No new rules — values only. |
| `src/skins.js` | Both registered; picker order is dark-first because the gym is the dark case. `DEFAULT_SKIN` is now `lume` (new installs only). |
| `src/i18n.js` | `skinLume`, `skinEnamel` — EN and AR. |

## Testing

`sanity-skins.mjs` green: every one of the 20 tokens defined in **both** new skins, no component
escaping into a literal, the accent still never touching chrome, and the legacy theme migration still
correct. Full suite green except the four documented expected failures. Bundle verified.

## Provenance

Direction chosen by Claude on Pierre's explicit delegation, 2026-08-22: *"I'll leave it to you…
if you changed everything to whatever you see fit based on the pictures of the gym."* Decided against
The Platform using Pierre's own point about hundreds of users at different setups. Reversible by
choosing another skin, and in git by reverting this commit.
