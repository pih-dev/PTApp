# Evaluation UX — Measurement Console + Timer (v2.11.1) — Design Spec

**Date:** 2026-06-13 · **Status:** Approved (Pierre, 2026-06-13) · **Type:** UI only, no schema change
**Builds on:** v2.11.0 evaluation system — `docs/superpowers/specs/2026-06-10-evaluation-v2-mass-battery-design.md`.

## What Pierre asked for (verbatim intent)

1. **Move the Evaluate button/section** to the top of the expanded client card (under the client info), instead of at the very bottom below the sessions.
2. **Select the activity during evaluation** — the eval starts on push-ups and moves through the tests; at any step the PT can change which test is current (his example: while on pull-ups he decides to do squats instead, so he switches the current test to squats).
3. **In-app timer with stop, and editable time/value** — a timer to run the tests, with the result fully editable. For the 1-mile run specifically: it's sometimes unsupervised, so the PT must be able to *either* use a stopwatch *or* just type the time the client reported. "Probably both."

This **reverses the Jun-9 "no in-app timer" decision** — deliberately, at Pierre's request.

## Decisions (approved 2026-06-13)

| # | Decision |
|---|----------|
| Approach | **Measurement console at the top of the eval form** + the existing 5 test rows kept below as the editable record. (Not a full stepper — keeps the at-a-glance overview + live classification.) |
| Beep at 0 | **Yes** — short beep (Web Audio) + `haptic()` vibrate + visual flash when the countdown ends. |
| Auto-advance | **Yes** — see the precise rule under "Active-test selection" (stopwatch auto-advances; rep tests advance on Next/chip-tap, never mid-typing). |
| Version | **v2.11.1** (UI only). v2.12 stays reserved for the Pro/Elite 1RM battery. |
| Schema | **No change, no migration.** The timer and test order are not stored — the console only writes into the same `raw` fields v2.11.0 already saves. |

## Layout (inside the New/Edit Evaluation modal)

```
 Battery: [Standard ✓] [Pro/Elite — soon]
 Date: [2026-06-13]
 ┌─ MEASURE ──────────────────────────────────────┐
 │ Now doing:                                      │
 │ [Push-ups] [Pull/Row] [Squats] [Run] [Sit&reach]│  ← tap any chip to switch
 │                                                 │
 │              ⏱  00:30                           │  ← countdown (rep tests)
 │     [ −5 ] [ Start ] [ Reset ] [ +5 ]           │     duration editable, default 30s
 │     at 0 → beep + vibrate + flash, focus reps   │
 │                                  [ Next → ]     │
 └─────────────────────────────────────────────────┘
 Push-ups    [ 18 ]  reps in 30s        🟢 Average    ← rows: written by the console
 Pull-ups▸Row [   ]  reps in 30s                       AND hand-editable, always
 Squats      [   ]  reps in 30s
 1-mile run  [ 7:42 ] mm:ss (optional)               ← stopwatch fills it, or type it
 Sit & reach [   ]  cm (optional)
 ─────────────────────────────────────────────────
 Muscle average: 3.0              [ Intermediate A ]
```

## Components

### `src/components/EvalTimer.jsx` (NEW) — the measurement console

Self-contained timer UI. Owns only timer state; never owns the eval values.

**Props:**
- `activeTest` — `'pushup' | 'pull' | 'squat' | 'run' | 'sitReach'`
- `lang`
- `onCountdownEnd()` — called when a rep-test countdown reaches 0 (EvalForm uses it to **flash/highlight** that row — NOT programmatic focus: a timer callback isn't a user gesture, so `focus()` won't open the iOS keyboard reliably; the PT taps the highlighted row to type)
- `onStopwatchStop(seconds)` — called when the run stopwatch is stopped (EvalForm writes `formatRunTime(seconds)` into the run field, then advances)
- `onNext()` — called by the "Next →" button (EvalForm advances to the next unfilled test)

**Mode derived from `activeTest`:**
- `pushup | pull | squat` → **countdown**. Default 30s, adjustable via −5/+5 (clamp 5–300s). Start → ticks down → at 0: stop, `beep()` + `haptic()` + flash, fire `onCountdownEnd()`.
- `run` → **stopwatch** (count-up, display `mm:ss`). Start / Stop. On Stop → `onStopwatchStop(elapsedSeconds)`.
- `sitReach` → **no timer**; console shows "enter cm" prompt only.

**Internal state:** `running`, `remaining`/`elapsed`, `duration` (countdown). One `setInterval` held in a `useRef`, ticked every 1000ms. **Cleanup:** clear the interval on unmount AND whenever `activeTest` changes (switching tests resets the timer to that test's fresh state — no orphan interval, no carried-over count). A `useEffect([activeTest])` resets state + clears the interval.

**Beep:** lazily create one `AudioContext` on the first Start tap (a user gesture, so iOS allows audio), `resume()` if suspended, and on countdown-0 play a ~200ms 880Hz tone (oscillator + gain, no asset). Wrap in `try/catch` — a missing/blocked AudioContext must never break the timer. The vibrate (`haptic()`) and visual flash fire regardless, so a silent iPhone still signals.

### `src/components/EvalForm.jsx` (MODIFY)

- New state: `activeTest` (default `'pushup'`).
- Render `<EvalTimer>` above the existing test rows, below the date field.
- `onStopwatchStop(sec)` → `setForm(p => ({...p, run: formatRunTime(sec)}))` then advance.
- `onCountdownEnd()` → apply a transient highlight (`eval-row-flash`) to the active rep row for ~1.5s so the eye lands on it; the PT taps it to type. (No programmatic `focus()` — see the iOS note on the prop above.)
- `onNext()` / chip tap → set `activeTest` to the chosen test.
- **Auto-advance rule (precise):** advancing to "the next unfilled test" happens (a) automatically right after the run stopwatch fills the run field, and (b) when the PT taps **Next →** or any chip. It does **NOT** fire while typing reps (would yank focus mid-entry). "Next unfilled" = first test in standard order (`pushup, pull, squat, run, sitReach`) whose field is still empty; if all filled, Next is a no-op / disabled.
- The five rows stay exactly as today (live verdict chips, classification, full manual editing). The console writes into the same `form` fields — single source of truth, no parallel value store.
- Pull row keeps its existing pullup/inverted-row variant toggle; the console's "Pull/Row" chip just makes that row active.

### `src/components/Clients.jsx` (MODIFY) — the move

Move the `<EvalSection client={c} ... />` from the bottom of the expanded block (currently after the session list, ~line 342) to the **top of the expanded block** — immediately after the `borderTop` wrapper opens, **before** the month navigator. Sessions follow below. Single relocation; no logic change to EvalSection itself.

## i18n (EN + AR) — new keys

`measureHeading` ("Measure"), `nowDoing` ("Now doing"), `timerStart` ("Start"), `timerStop` ("Stop"), `timerReset` ("Reset"), `nextTest` ("Next →"), `enterCountPrompt` ("Enter the count ↓"), `enterCmPrompt` ("Enter cm"), `runTimerHint` ("Time it, or type the reported time"), `secondsAbbrev` ("s"). Test chip labels reuse existing `testPushup/testPullup/testInvertedRow/testSquat/testRun/testSitReach`. English source of truth; AR keys must match (value-level parity check — see the v2.11.0 i18n trap).

## CSS (`src/styles.css`)

`.eval-console` (bordered container, uses `--sep`/`--t*`), `.eval-timer-display` (large tabular-nums time), timer buttons (reuse `btn-secondary`/`filter-tab` where possible), `.eval-row-flash` keyframe (brief highlight when a countdown ends), active chip via existing `filter-tab.active`. Logical properties only (RTL); theme vars only — no hardcoded rgba.

## Out of scope / non-goals

- No change to scoring, classification, freeze-at-save, or the stored record shape.
- Timer state, countdown duration, and test order are **not persisted**.
- Sit-and-reach gets no timer (it's a distance, not timed).
- Pro/Elite battery untouched (v2.12).

## Testing

No new sanity script (no logic in normCharts/utils changes). Verify by build + manual smoke on device:
- Countdown counts to 0, beeps/vibrates, flashes the active rep row; duration −5/+5 clamps (5–300s).
- Switching the active test mid-countdown resets cleanly (no double-speed timer = no orphan interval).
- Run stopwatch fills `mm:ss` and auto-advances; the run field still accepts a typed time.
- All values remain hand-editable; classification still live; save unchanged.
- Build pipeline + **verify the gh-pages Pages build reaches `built`** (Jun 11 deploy-race lesson).
