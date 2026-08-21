# SpotSet — what is actually left, in order

**Date:** 2026-08-22 · Written because Pierre asked *"can we go down the list? Can you list what we
have to do?"* · **Kept current from `HANDOFF-design.md` §0.**

Three tracks run in parallel and only one of them is the design pass. Nothing below is blocked on
anyone but us, except where it says so.

---

## Track A — the design pass (in progress, v2.19.1 live)

| # | Item | State |
|---|---|---|
| A1 | Skins replace dark/light | ✅ v2.17 |
| A2 | The Dashboard in the plate and the bar | ✅ v2.18 |
| A3 | The shell + shared primitives | ✅ v2.19 |
| A4 | Press affordance — fill means press | ✅ v2.19.1 |
| **A5** | **The screens nobody opened: program setup, program viewer, evaluations, norm charts** | **next** |
| A6 | The chrome question — is a bottom tab bar still the right nav? | open, see below |
| A7 | Measure on both phones, both skins, both languages; fix what actually stutters | after A5 |

**A6, stated honestly:** a bottom tab bar is not mandatory, but for this app it is right — the PT
uses it one-handed, mid-session, standing up, and every target sits in the reachable third of the
screen. The alternatives (a top tab bar, a hamburger, a floating action bar) all move the most-used
controls *away* from the thumb. What is worth revisiting is **what the four tabs are** and whether
the header earns its height, not whether the bar is at the bottom. Park it until A5 is done — it is
a layout question and it wants the screens finished first.

## Track B — the three features the design pass deferred (each needs its own spec)

| # | Item | Notes |
|---|---|---|
| **B1** | **The movement library** | Every exercise name in a session or program becomes tappable; a searchable screen, EN + AR. 🔴 The data spine already exists — 340 movements in `exerciseBank.js`, Arabic for all of them. The gap is that a name is a dead end today. |
| **B2** | **The exercise figures** | Pierre's references read in `docs/design/2026-08-22-figure-references.md`. Style, canon, and the figure/mark split are settled enough to spec; **production route is the open question**, and it constrains the style. |
| B3 | The logo | After the language, so the mark is drawn into a system that exists. It must carry *spot*, not just a dumbbell. |
| B4 | Gym photography | A ground, never a surface: empty states, the completed moment, login. |

**Order matters:** B1 gives the figures somewhere to live. Building figures first means 340 drawings
with no screen to put them on.

## Track C — everything not about design

| # | Item | State |
|---|---|---|
| C1 | Multi-user / Supabase (Task A) | Soak running. `HANDOFF-multi-user-build.md`. Sign-in is dark in this build. |
| C2 | Play Store publishing | Blocked on Google's ID verification of the Illume developer account. `HANDOFF-spotset-publishing.md`. |
| C3 | Apple / iOS | Account ordered 2026-08-21; build route is Codemagic (no Mac). |
| C4 | Review finding P3 — SessionCard scope B | Not done. Do it with the Schedule layout pass; it also kills the `focus: []` bug at `Schedule.jsx:201`. |
| C5 | Program pruning before `data.json` nears 1 MB | 14.5% on 2026-08-03. 🔴 Snapshot before any pruning run — cloud deletes are irreversible. |
| C6 | 🔴 Sync token expires **2027-07-06** | Renew June 2027. |

## The recommendation, if we do one thing next

**A5, then B1.** A5 is small and finishes the visual argument — four screens still carrying the old
look is exactly the complaint that produced v2.19. B1 is the first thing in months that adds a
capability rather than repainting one, and it is the screen the figures need.
