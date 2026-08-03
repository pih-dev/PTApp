# v2.11.1 — Evaluation measurement console + timer (2026-06-13)

UI-only point release on the evaluation system. **No schema change, nothing persisted.**

**Trigger:** Pierre, 2026-06-13 — move the Evaluate button up, select the activity during an
evaluation, add a timer. **Reverses the Jun-9 "no in-app timer" decision.**
Spec: `docs/superpowers/specs/2026-06-13-eval-ux-timer-design.md` ·
Plan: `docs/superpowers/plans/2026-06-13-eval-ux-timer.md`

> Written 2026-08-03 as part of the CLAUDE.md slim-down: this version shipped without its own
> instructions file, so its CLAUDE.md section was moved here **verbatim** (bottom of this file)
> before being collapsed to a one-liner. Nothing was reworded.

---

## What changed for the PT

**The Evaluate button is now at the top of a client's card.** Open any client and it's right there
under their info — no more scrolling past every session to reach it.

**A built-in timer for running the tests.** During an evaluation you pick the test you're doing, then
run a 30-second countdown for the rep tests (push-ups, pull-ups/row, squats) — it beeps and vibrates
when time's up — or a count-up stopwatch for the 1-mile run. You can adjust the countdown length on
the fly (−5 / +5 seconds).

**Still fully manual when you need it.** Every number stays editable by hand, so when the 1-mile run
was done without you, just type the time the client reported. After the run timer stops it jumps to
the next test automatically.

---

## Technical

### New component — `src/components/EvalTimer.jsx`

- Active-test chips (push / pull / squat / run / sit-reach). **30s countdown** for rep tests
  (±5s, clamp 5–300) with a Web-Audio beep + `haptic()` + a row-flash at 0; **count-up stopwatch**
  for the run (fills `mm:ss`); **none** for sit-reach.
- **Effect-driven tick:** a self-rescheduling `setTimeout` keyed on
  `[running, remaining, elapsed, mode]` — *not* a `setInterval` held in a ref, and **no side effects
  inside a state updater** (avoids the StrictMode double-fire anti-pattern). Countdown-end is its own
  `useEffect` watching `remaining === 0 && running`, so beep/vibrate/callback fire exactly once.
- **AudioContext is created/resumed on the Start tap** (a user gesture) so the later programmatic
  beep is allowed on iOS. All audio is wrapped in try/catch — audio failure never breaks the timer.
- Switching the active test resets the timer via `useEffect([activeTest])`.

### `EvalForm.jsx`

- `activeTest` state (default `pushup`); `<EvalTimer>` renders above the five rows. **The console
  writes into the same `form` fields the rows use — single source of truth, no parallel store.**
- `onStopwatchStop(sec)` → `form.run = formatRunTime(sec)` + auto-advance to the next unfilled test
  (`order = [pushup, pull, squat, run, sitReach]`).
- `onCountdownEnd()` → transient `eval-row-flash` on the active row — **NOT** a programmatic
  `focus()`. A timer callback isn't a user gesture, so iOS wouldn't open the keyboard anyway; the PT
  taps to type. Rep tests advance via Next/chip, never mid-typing.
- All rows stay hand-editable; verdict chips + classification unchanged.

### `Clients.jsx`

- `<EvalSection>` relocated from the bottom of the expanded card to the **top** (before the month
  navigator).

### Scope

No reducer / normCharts / utils / schema change. **Timer state is ephemeral** — duration, remaining,
and test order are NOT stored. No new sanity script; UI-only.

> **Still in force (v2.12+):** `EvalTimer.jsx` is retained in the repo but **unrendered** — the 1RM
> battery that replaced this one doesn't time attempts. **Do not delete the file**; a future
> rep-based battery could reuse it.

---

## Verbatim from CLAUDE.md (moved here 2026-08-03, unchanged)

> ## Previous Version: v2.11.1
> UI-only point release on the evaluation system. No schema change, nothing persisted. Spec/plan: `docs/superpowers/{specs,plans}/2026-06-13-eval-ux-timer*`.
> - **`src/components/EvalTimer.jsx`** — in-form measurement console: active-test chips, 30s countdown for rep tests (±5s, clamp 5–300; Web-Audio beep + `haptic()` + row-flash at 0), count-up stopwatch for the run (fills mm:ss), none for sit-reach. **Timer state is ephemeral** — duration, remaining, and test order are NOT stored; the console only writes into the same `form` fields the rows use (single source of truth).
> - **Effect-driven tick** (self-rescheduling `setTimeout`, not a `setInterval` ref, no side effects in a state updater). Switching the active test resets the timer via `useEffect([activeTest])`. AudioContext unlocked on the Start gesture (iOS audio rule).
> - **No programmatic `focus()` from the countdown-end callback** — a timer tick isn't a user gesture, so iOS won't open the keyboard; flash the row instead, the PT taps to type. Stopwatch-stop fills run + auto-advances to the next unfilled test; rep tests advance via Next/chip (never mid-typing).
> - **Evaluate section moved to the TOP of the expanded client card** (was below the session list).
> - Reversed the Jun-9 "no in-app timer" decision — Pierre's call 2026-06-13.

---

## Source

- `docs/changelog-summary.md` → "v2.11.1 — Evaluation timer & quicker access"
- `docs/changelog-technical.md` → "v2.11.1 — Eval measurement console"
- Deploy commit: `c16e9ac` — *Deploy v2.11.1: eval measurement console + timer*
