# Fresh-Eyes Structure Review — first run (2026-08-22, v2.25)

**The rule that produced this** (CLAUDE.md KNOWN ISSUES, Pierre 2026-08-22): before a design is
called done, hand it to a subagent that has never seen it — Fable 5, max effort — **with all
formatting stripped**, so it receives structure and words only and argues the opposite side.
First run: the whole app's information architecture, during the v2.25 design refinement round.

**Method:** every screen was transcribed as plain text (element order + words, zero visual
treatment) and handed to a fresh Fable 5 agent briefed to attack: what is missing, what earns
nothing, is the order wrong. Its 12 findings, verbatim in substance, with the triage.

---

## Shipped in v2.25

1. **Home does not lead with the thumb's question** — "who is next, right now" sat fourth, under
   Overview, the week figure and renewals. *Shipped, softened:* renewals moved below the upcoming
   list; the week figure stays as the compact hero (it is the identity piece and ~100px tall). The
   reviewer's stronger version — sessions above the week figure — is Pierre's call if the softened
   cut isn't enough.
9. **Two week views, two grammars, and Home's navigates nowhere** — *shipped:* each Home column is
   now a button opening Schedule on that day.
5. **The booking sheet leads with the rare case** — Repeat first, and it mutates the client picker.
   *Shipped:* Repeat moved to sit beside the weekday config it unlocks; client picker is first.
12. **General mixes the user's tools with the developer's** — *shipped:* order is now Reference →
   Backup → WhatsApp templates → To-do (dev channel last). The cloud-backup **status line as a
   fact** ("last snapshot: date") is NOT built — it needs a stored timestamp; queued below.

## Parked — Pierre's call (each is a feature or a re-litigation, not a refinement)

2. **Money is missing entirely.** Packages have sizes and renewals but no price, no payment, no
   amount owed, no month income. "Who owes me / what did I earn in July" is unanswerable in his own
   business system. *Biggest finding of the round. New feature spec if wanted.*
4. **The Sessions tab earns its slot least** — Home re-sorted, with an Active/All/Scheduled filter
   overlap; suggests folding it into Schedule and spending the 4th tab on renewals + money.
3. **The package position is spoken in four vocabularies** — used/total, session N/M, running
   count, auto→effective. One phrase and one number everywhere is a wording+i18n pass (EN+AR).
10. **"Contract / package / period" name one thing** — same wording pass as #3.
6. **Every session row carries editors it rarely needs** (type selector, tags, notes on every
   expanded row; bare delete is a mis-tap risk). Changes Elie's mid-session workflow — his call
   as much as Pierre's.
7. **"What did we do last time?" is 3+ taps away** — wants last-session notes atop the expanded
   client, evals below history. *Conflicts with the deliberate v2.11.1 decision that moved evals
   up; re-litigate only with Pierre.*
8. **Confirmation is a one-way street** — the "confirmed" status has no inbound path and will rot.
   Already tracked: the confirm-page link is deferred to Stage 2 (memory:
   project_confirm_page_deferred).
11. **"Cancel session" sits where dismiss lives** on the action sheet. Wording/position pass with
   #3/#10.
- **Also flagged:** no body measurements / progress photos — a PT sells visible progress; the 1RM
  battery is the only progress artifact. Feature territory.

---

*The stripped-structure method worked: 4 findings shipped same-day, and the two biggest things it
surfaced (money, the Sessions tab) are invisible from inside the code because they are absences.*
