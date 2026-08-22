# v2.37 — Big Steps, six skins, and the Display sheet

**Released:** 2026-08-23 · CSS + one new component · no schema change, `DATA_VERSION` stays 6.

## What you get

1. **Big Steps typography** — Pierre's pick from the type lab.
2. **Six skins**, in three pairs: Lume/Enamel (soot), Midnight/Steel (blue), **Rally/Chalkline** (new, vibrant).
3. **A Display button in the header** — theme, text size, and CAPITALS on/off, one tap from any screen.
4. **Buttons that look pressable**, not parked.

## 1. Big Steps, and why "monotone" was the real diagnosis

Pierre after v2.35: *"this looks monotone and difficult to read… the initial one was easy to read,
**easy to spot things**."* Both halves are true and they are the same fact.

The original design marked **rank** with uppercase, tracking and a condensed face: a label looked
nothing like a name, so the eye sorted the screen before reading a word. v2.35 removed all three
*everywhere* — reading improved and **sorting died**. Everything became equally readable and equally
undifferentiated.

**So rank comes back as size and weight, which cost nothing to read**, and caps + tracking return only
to small structural labels — never to a name, never to body text:

| | before (v2.35) | now |
|---|---|---|
| client name | 17px / 600, sentence | **22px / 700**, sentence, never cased |
| labels, chips, nav | 13px, no tracking, sentence | 12.5px, `0.06em`, cased by the user |
| buttons | 13.5px | 13px / 600 |
| line-height | 1.5 | 1.45 |

A 22px name against a 12.5px label is the hierarchy, and **that gap survives at any font size** —
which matters, because the size is now the user's to set.

## 2. The Display sheet — why case and size are settings, not decisions

Pierre asked for them at the top of the screen, and he was right twice over. They are the settings
you reach for **while squinting**, which is the worst moment to go hunting through General. And there
is no static type choice that fits every pair of eyes — this app's own developer could not read the
default comfortably.

- **Theme** — six swatches, each painting that skin's ground with its accent as the disc.
- **Text size** — five stops, 0.9× to 1.3×, shown as a filled meter rather than a number ("1.1×"
  means nothing to the person turning it). 🔴 **A ladder, not a free slider**: a slider invites 1.37,
  which nobody will ever re-test.
- **Labels: CAPITALS / Normal** — his words: *"I can click and everything becomes capital letter. I
  can see the check."*

Both write a custom property on `<html>` and a key in localStorage. **On `<html>`, not the app
container**, for the same reason `data-skin` is: `Modal` portals to `<body>` (v2.33), so a property
scoped to the container would never reach an open sheet.

🔴 **Every localStorage access is guarded** — `getItem`/`setItem` throw `SecurityError` on iOS with
"Block All Cookies". A display preference degrades to the default; it never breaks the first paint.

🔴 **Arabic never sees capitals whatever the toggle says.** The `[dir="rtl"]` rules are `(0,2,0)` and
still force `text-transform: none`. That is not a bug to fix — Arabic has no case.

## 3. Rally and Chalkline

Sourced from the **second room** in his gym photos, not the machine floor: wood, glass, daylight, and
a rack of rubber kettlebells in pink, orange, green and blue. The loudest honest colour there is the
pink on the dumbbell rack — **a hue no other skin uses**, so it can never be confused with midnight's
cyan or lume's orange. In Rally the muscles go cyan (free, since the accent is pink) and the fault
stays orange, so every figure pair is a different hue family.

🔴 **Vibrant is a value, not a licence:** the accent still means load and urgency and still never
touches chrome.

## 4. Boxes that read as buttons

Pierre: *"don't make the height too high so that there are spaces above and below the word — having
them appropriately sized will portray that these are buttons rather than just a container."*

A tall box around small text reads as a **cell**. The same text with the padding tightened around it
reads as a **control**. Chips and tags went to `6px 10px` with `line-height: 1.15`; buttons to
`9px 13px`.

**The tap target is kept honestly**, and this is the tension worth naming: `min-height` stays on
everything a thumb must hit (38px on chips, 42px on buttons, 50px on the big WhatsApp action), so the
box is tight *in proportion* without becoming small *in fact*. Raising the text size raises the box
with it, so the proportion holds at every stop.

## Files

| File | Change |
|---|---|
| `src/components/Display.jsx` | **New.** The sheet, plus `loadDisplay` / `saveDisplay` / `applyDisplay`. |
| `src/App.jsx` | Display state, the `<html>` effect, the header button, the sheet. |
| `src/styles.css` | The Big Steps block (replacing v2.35's sizing), `rally` + `chalkline` token blocks, the Display styles. |
| `src/skins.js` | Six skins, three pairs, dark-first. |
| `src/i18n.js` | Display strings + two skin names, EN and AR. |

## Testing

`sanity-skins` green — all 20 tokens defined in **both** new skins, no escapes, accent still off
chrome. Full suite green except the four documented expected failures. Bundle verified.

**Not covered by a gate:** the size ladder changes layout at 1.3×. Worth one pass on the phone at the
top stop, in both scripts, before this is called done.
