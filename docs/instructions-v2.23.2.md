# SpotSet v2.23.2 — zoom on every figure, and the logo opens the library

**Date:** 2026-08-22 · **Asked for by Pierre:** *"Eventually 3D models that can be rotated and zoomed
in/out, after a few rounds. Have the library open when the logo or SpotSet word is pressed."*

---

## The logo opens the movement library

Tap **SpotSet** or its icon in the header and the library opens — all 340 movements, searchable.
It was the one thing on the header that did nothing, and the library is what a PT reaches for most
between sets; three taps through General was three too many.

**The General entry stays.** This is a shortcut, not a move — removing the documented path would
strand anyone who learned it.

## Every figure zooms

Double-tap the pair and both figures scale to 2.2×; drag to pan around; **Reset** or another
double-tap goes back. It works on every one of the 340, not only the rotatable one.

**Why double-tap and not pinch, and it is a real constraint rather than a preference:** pinch needs
`touch-action: none`, and that would take the vertical scroll away from a bottom sheet that has to
scroll. Double-tap asks the browser for nothing, works with a mouse for free, and leaves the sheet's
own gestures alone. **Pinch arrives with the 3D rig**, when the figure gets a surface of its own.

**One gesture, two jobs, decided by state:** zoomed out, a horizontal drag turns a rotatable figure.
Zoomed in, it pans — because that is the only thing it can usefully mean when the figure is bigger
than its box. A drag doing both at once would do neither well.

The zoom is a CSS transform on the art, never a new `viewBox`: the figure is already vector so it
stays sharp, and the geometry is untouched — the canon, the posture line and the fault marker cannot
drift because somebody zoomed.

## Where this is going

Pierre's destination is 3D models that rotate and zoom, reached **a round at a time**. The staged
path is written up in `docs/2026-08-22-figures-3d-options.md`:

1. ✅ rotation on one pattern (v2.23.1) · 2. ✅ zoom everywhere (this release) ·
3. rotation on the patterns whose fault is genuinely out-of-plane — each needs its second camera
authored and judged · 4. depth on the skeleton, a body-fixed frame per segment · 5. pinch.

🔴 **Round 3 is the one to resist rushing.** A drag handle on a pattern whose fault is fully visible
from one camera does nothing, and a control that does nothing is worse than no control.
