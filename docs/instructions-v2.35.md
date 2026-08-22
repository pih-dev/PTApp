# v2.35 — The legibility pass

**Released:** 2026-08-22 · CSS only · no schema change, no data touched.

## What changed

**Uppercase, letter-spacing and the condensed face are off everywhere except three places.**

Every button, badge, tag, status, client name, nav label and field label now renders in **Saira,
sentence case, no tracking, and a few points larger**. The condensed-caps treatment survives only on
`.logo-text` (the wordmark), `.splash-word` (the opening) and `.bar-label` (the section head, which
is the plate-and-bar signature).

Also: **Restore is no longer green.** It was `--ok` filled, sitting ten pixels from WhatsApp's filled
`#128C7E` — two different greens, both solid, side by side. It now wears the same neutral fill as
Complete. Green stays for *status*.

And: **the week strip no longer changes height.** The session dot is always rendered, transparent
when a day is empty, so paging to a week with no bookings does not shrink every column by 10px.

## Why

Pierre, on his phone: *"the font is really difficult to read in all themes."* He first suspected the
new palette, then corrected himself: *"I don't think it has anything to do with the color… maybe the
fonts are condensed."* **He was right, and the colour was never the problem.**

We were charging three legibility taxes at once, on every string:

- **UPPERCASE** destroys word-shape, which is what fluent readers actually match on.
- **LETTER-SPACING** breaks a word into loose glyphs the eye has to reassemble.
- **A CONDENSED FACE** narrows the counters and the strokes that tell letters apart.

Any one is a style choice. All three, at 10–12px, on every control, is a wall — and this is the
developer's stated accessibility requirement, not a preference.

## 🔴 The fix was already in the file

Arabic has no case, and letter-spacing breaks its joins. So **every one of these classes already had
a `[dir="rtl"]` rule turning all three off and carrying hierarchy by weight instead** — shipped,
reviewed, live for months. This release promotes that treatment to the default for everyone.

**The selector list was harvested from those rules, not hand-written** — which is why it is complete.
Specificity does the rest on purpose: the new rules are `(0,1,0)` and sit last in the file, so they
beat the original declarations; the Arabic rules are `(0,2,0)` and still win, so **RTL renders
byte-identically to before**.

## Files

| File | Change |
|---|---|
| `src/styles.css` | The legibility block (36 selectors + size bumps) appended at end of file. `.btn-confirm` off `--ok`. `.week-day-dot.is-empty`. |
| `src/components/Schedule.jsx` | The week dot is always rendered; `is-empty` hides the ink, keeps the room. |

## Still open after this

- **Six themes + the header theme button** — Pierre asked for a vibrant pair and a picker in the
  header rather than buried in General. Not in this release.
- **The full button sweep.** This fixed the collision he pointed at; the sizing/fill system across
  all `.btn-*` has not been rationalised, and several are still under the 44pt tap target.
- **Swipe to change week** — agreed in principle (swipe the *week*, not the days; all seven are
  already visible). Pointer events + `touch-action: pan-y`, never a non-passive preventDefault.
- 🔴 **The backdrop may be the next legibility item.** In his screenshots the giant figure sits
  directly under the session rows on the pale skins. Not touched: it is a design decision he made
  and approved (v2.26), and it should be his call, not a silent change.

## Testing

Build + `verify-bundle.mjs` clean, `sanity-skins` green, full suite green except the four documented
expected failures. **Not covered by a gate:** this is a visual change on every screen — worth one
pass on the phone, in both an LTR and an Arabic session, before it is called done.
