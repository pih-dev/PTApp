# Fresh-eyes review, second run — the navigation and IA

**Date:** 2026-08-22 · **Trigger:** Pierre, on the bottom bar: *"I think there are redundancies…
you can access from the client what you can access from the others. It's a major revisiting."*
**Reviewer:** Fable 5, max effort, structure stripped of all colour / type / branding / names, no
codebase access. Standing rule: `CLAUDE.md` → KNOWN ISSUES, FRESH EYES.
**Artifact (the version Pierre reads):** the SpotSet nav verdict page, published 2026-08-22.
**First run, different subject:** `2026-08-22-fresh-eyes-structure-review.md` (whole-app IA at v2.25).

---

## 0. The one-line verdict

**The bar is right. Two of its four tenants are not.** Replace the Sessions tab with the movement
library, and stop leaving the plate calculator in the middle ground.

## 1. The jobs, as the reviewer names them

1. **Run today** — who is coming, mark done, nudge, who is about to run out. Time-critical, one-handed.
2. **Deal with one person** — package, renewal, history, evaluations, programs, a message.
3. **Book the future** — calendar, single and recurring booking, confirmation.
4. **Coach the movement** — show a client the form figure, check a norm chart. 🔴 **The current bar
   does not represent this job at all** — it is behind a tap on a word in the logo.

Browsing every session ever recorded is **not a job**. Its real uses (restore a cancelled session,
note a past one, audit a count) are always *about a client* or *about a day*, and both pivots exist.

So: four destinations, but **Today · Clients · Calendar · Library**.

## 2. Pierre's suspicion, adjudicated

Half right, and the half that is wrong matters:

- ✅ **Sessions does not earn its tab.** Confirmed, independently.
- ❌ **"Everything is also reachable from inside a client" is NOT a defect.** The tabs are *moment*
  pivots; the client is the *person* pivot. **Duplication across two orthogonal pivots is structure,
  not redundancy.** A calendar app that did not duplicate across those pivots would be broken.
- ❌ **"The rest may not earn their place" is wrong.** Clients and Schedule both earn theirs.

## 3. Overlap: defect vs correct

| Overlap | Verdict | Why |
|---|---|---|
| Session actions on Home **and** Schedule | **Correct** | "Act on what's next" vs "act while looking at a day" are different postures. Forcing a tab change to complete a session is the friction that loses the app. |
| The same actions on **Sessions** | **Defect** | Serves no moment the other two don't. Exists because the tab exists. |
| Renewal on Home **and** the client | **Correct** | Home is push (before I forget); client is pull (they're asking now). |
| Three messages: reminder, confirmation, greeting | **Correct** | Three messages, three moments, each already right. "The app at its best." |
| Counted-sessions override edit in Clients **and** Schedule | **Defect** | Package accounting belongs to the client. Its presence in Schedule is an accident of *when the conversation happens*, not of where the data lives. |
| Movement library from the logo word **and** from settings | **Defect** | *"When you build a fallback entrance for your own front door, the front door is wrong."* The settings copy exists because someone already knew the logo tap was undiscoverable. |
| Week count on Home vs month count on client | **Correct** | Different questions. |

## 4. Wrong place

- 🔴 **The plate calculator.** The only tool used *mid-set with a loaded bar in front of him* — the
  most time-critical thing in the app — sits at the bottom of one tab under a renewal list. It pays
  for prime real estate and delivers no speed. **Either it is reachable from anywhere, or it comes
  off Home as a novelty. The middle it currently occupies is indefensible.**
- **The flat all-sessions list** is "a database inspector wearing a tab". Demote to per-client
  history + a ledger behind the calendar's overflow.
- **The movement library** — 340 movements with figures, plausibly the most-built asset in the
  product — is *"not an entrance, it is an easter egg."* Promote to the bar.
- **The settings sheet is a junk drawer**: content (library, norm charts), configuration (templates,
  token), plumbing (backup, sign out), plus the manual and a to-do list. **Norm charts belong one tap
  from evaluations, where they are used.** The rest is genuinely settings; leave it.
- **The logo mark replaying the opening is harmless vanity, and harmless is the correct standard.**

## 5. The bar itself — argued both ways

**Against:** one user, one context. Four tabs is store convention imported without need, and three of
them show session cards, so every action starts with a memory test ("which tab was that on?") — the
exact decision cost a mid-session one-handed user cannot pay.

**For:** he adopted the app *because* it was simple. Zero learning, pure muscle memory, thumb-
reachable, every job one tap from every other with **no back-stack to manage** — which matters
enormously when a client interrupts mid-task. A drill-down home trades wrong-tab errors for
where-am-I-in-the-stack errors, **which are worse one-handed.**

**Verdict: keep the bar.** Fix the tenants, not the building.

**Also argued and rejected: merging Today into Calendar.** Close enough to tempt, but the merge would
serve booking at the cost of the mid-session glance, which is the app's whole reason for existing.

## 6. Proposed tree

```
TODAY (default)
├─ clients total · sessions this week
├─ today + upcoming agenda (complete / cancel / edit / reminder)
├─ renewals due → renew
└─ plate calculator → persistent header tool, one tap from every tab
CLIENTS
└─ search → client
   ├─ identity, phone, notes · greeting
   ├─ package: size, period, remaining · override edit ONLY here
   ├─ renewal + renew · month count
   ├─ history: this client's sessions incl. cancelled → restore, notes
   ├─ evaluations (1RM) → norm charts one tap away
   └─ programs: builder + viewer
CALENDAR
├─ day view, prev / next / today
├─ book + confirmation · recurring (weekdays, count, preview)
└─ overflow: the full ledger (active/all) — demoted, not deleted
LIBRARY  ← promoted out of the logo tap
└─ 340 movements, figures, search
SETTINGS (gear): templates · backup · token · sign out · instructions · to-do
```

Nothing deleted. Two demoted, one promoted, one made ubiquitous, one de-duplicated.

## 7. Ranked by value / risk (risk = breaking a habit he already has)

| # | Change | How it hurts | Worth it |
|---|---|---|---|
| 1 | Sessions tab → Library | Thumb goes to slot 4 for the ledger, finds movements. One bad week; audit two taps away. | High |
| 2 | Plate calculator → header tool | A week of fumbling *mid-set*, the worst place to fumble. **Announce it, don't just move it.** | High |
| 3 | Norm charts next to evaluations | Almost nothing; the settings copy can stay. | High |
| 4 | Override edit leaves Schedule | Breaks the real booking-time *"how many left?"* conversation. Mitigate: read-only count at booking + link into the client. | Medium |
| 5 | Kill compact/expanded toggle | If the two forms serve glance vs act, one gets worse. **Verify with Elie before touching.** | Low |

## 8. What defended itself

- **Home as the default action feed** — Pierre's own read, confirmed independently.
- **The client page as a person-hub that duplicates on purpose.**
- **The four-tab bar.** *"The structure's sins are two tenants and one buried treasure, not the
  architecture."*

## 8b. Elie's answers — 2026-08-22 evening, via WhatsApp

Asked with three picture cards (`_archive/PTApp/elie-questions/`), two labelled options each.

- **Q2, the session count at booking → he chose 1: KEEP EDITING IT THERE. Finding #4 is OVERRULED
  and CLOSED. No code change.** 🔴 Do not re-propose this. The reviewer called it a defect because
  package accounting belongs to the client and its presence in Schedule is "an accident of when the
  conversation happens". Elie's answer says the accident *is* the workflow: the "how many left?"
  conversation happens at booking, with the client in front of him, and that is where he fixes the
  number. **This is the whole reason the question was asked rather than acted on** — the review was
  reasoning from structure, and the user was reasoning from his actual day. The user wins.
- **Q3, the two views on Home → he chose 2: "I only ever use one."** He did not say which, and the
  card asked him to. **Still open**, and it cannot be guessed: dropping the wrong view makes the
  screen worse for the only person using it.
  - 🔴 **A fact found while chasing it, worth its own line:** the toggle is
    `useState(true)` in `Dashboard.jsx:68` — **not persisted anywhere**, not in state, not in
    localStorage. It resets to *expanded* on every mount. So there is no stored preference to read,
    and more importantly: **if he uses compact, he has been re-tapping it every single visit for
    months.** Whichever view survives, the fix is the same shape — make it the default and remove
    the switch.
- **Q1, the plate calculator — no answer yet.**

## 9. Open — Pierre's calls

1. ✅ **Slot four: Sessions out, Library in — DONE.** Approved by Pierre 2026-08-22 and shipped as
   v2.33 the same evening. The ledger lives behind "All" on the Schedule day bar.
2. 🔴 **The plate calculator: header tool, or off Home entirely?** Pick one; the middle is the
   finding. Elie has the card and has not answered this one.
3. ✅ **Finding #4 (the override edit) — CLOSED by Elie, no change.** See §8b.
4. 🔴 **Finding #5 (the two views) — Elie uses only one but did not say which.** One word from him
   finishes it; the toggle is unpersisted either way (§8b).
