# v2.21.1 — the purple line, and General in the order he uses it

**Date:** 2026-08-22 · **Trigger:** Pierre, on his phone, with a screenshot of the Schedule tab.

---

## The purple line down the left

`Schedule.jsx` still painted `borderInlineStart: 3px solid <session-type colour>` on every session
row — the last survivor of the six-hue decoration the pass removed from the Dashboard (v2.18) and
Sessions (v2.19). Strength is `#6366F1`, hence purple, and with two adjacent rows it read as one
continuous rule down the screen.

🔴 **The inline-start bar means "happening now" and nothing else.** The Schedule row now uses the
same idiom as the other two: name and time on one line, a mono meta line under it, the type as a
mark rather than a colour. The type emoji went with it.

## General, reordered

Pierre's order, top to bottom: **the toggles → what he opens often → housekeeping.**

1. **Language + skin** (unchanged, at the top)
2. **Reference** — Movement library **first** (it is the one opened mid-session), then Norm charts,
   App instructions, Changelog
3. **Backup**
4. **To-do**
5. **WhatsApp messages**

Reference used to be dead last, under backup, the to-do list and the message templates — everything
he touches rarely sat above the thing he now opens during a session. The section heading is
**Reference** rather than "Documentation", because it is no longer only docs. Reference buttons also
got a taller tap target (12px padding).

## Verified

Built, `verify-bundle`, walked in a browser: the Schedule row with the line gone, and General in the
new order. Presentation only; `DATA_VERSION` stays 6.
