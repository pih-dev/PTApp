# Eval Measurement Console + Timer (v2.11.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-form measurement console to the evaluation flow — pick the current test, run a 30s countdown (rep tests) or count-up stopwatch (run) with beep+vibrate, all values stay hand-editable — and move the Evaluate section to the top of the expanded client card.

**Architecture:** New self-contained `EvalTimer.jsx` owns only timer state (one `setInterval` in a ref, reset on test switch). `EvalForm.jsx` gains an `activeTest` state, renders the console above the existing 5 rows, and the console writes into the same `form` fields the rows already use — one source of truth, no parallel value store. `Clients.jsx` relocates `<EvalSection>` from bottom to top of the expanded block. No schema change, no migration, no new stored data.

**Tech Stack:** React 18, Vite single-file build, plain CSS, i18n via `t(lang, key)`. No test framework — the change is UI-only with no logic in `normCharts.js`/`utils.js`, so verification is `npm run build` + on-device smoke (no new sanity script).

**Spec:** `docs/superpowers/specs/2026-06-13-eval-ux-timer-design.md` (approved). Read it first.

**Conventions (CLAUDE.md / docs/traps.md):**
- i18n: every user-facing string through `t(lang, key)`, EN + AR, value-level parity (the v2.11.0 i18n trap: an agent silently flattened typography on a wholesale rewrite — APPEND keys, never rewrite the file, never normalize existing strings).
- RTL: logical properties (`marginInlineStart`, never `marginLeft`); theme CSS vars (`--t1..--t5`, `--sep`), no hardcoded rgba except sanctioned accent/danger hexes.
- iOS: do NOT rely on programmatic `focus()` from a timer callback to open the keyboard (not a user gesture) — flash/highlight the row instead; AudioContext must be created on a user-gesture tap (Start) so the beep is allowed.
- Edit tool only on existing files; NEVER PowerShell `Get-Content`/`Set-Content` (encoding-mangling trap). Commit + push to master after each task.
- After gh-pages deploy, verify the Pages build reaches `built` (Jun 11 deploy-race lesson).

---

### Task 1: i18n keys for the measurement console (EN + AR)

**Files:**
- Modify: `src/i18n.js` (APPEND to both the `en:` and `ar:` blocks — do not touch any existing key)

- [ ] **Step 1: Add the keys to the `en:` block**

Find the `// Evaluation system (v2.11)` block inside `en:` and, immediately after its last key (`classPro: 'Pro',`), append:

```js
    // Evaluation measurement console (v2.11.1)
    measureHeading: 'Measure',
    nowDoing: 'Now doing',
    timerStart: 'Start',
    timerStop: 'Stop',
    timerReset: 'Reset',
    nextTest: 'Next →',
    enterCountPrompt: 'Time up — enter the count',
    enterCmPrompt: 'Enter cm (no timer)',
    runTimerHint: 'Time it, or just type the reported time',
    secondsAbbrev: 's',
```

- [ ] **Step 2: Add the matching keys to the `ar:` block**

Find the `// Evaluation system (v2.11)` block inside `ar:` and, immediately after its last key (`classPro: 'محترف',`), append:

```js
    // Evaluation measurement console (v2.11.1)
    measureHeading: 'القياس',
    nowDoing: 'التمرين الحالي',
    timerStart: 'ابدأ',
    timerStop: 'إيقاف',
    timerReset: 'تصفير',
    nextTest: 'التالي →',
    enterCountPrompt: 'انتهى الوقت — أدخل العدد',
    enterCmPrompt: 'أدخل السم (بدون مؤقّت)',
    runTimerHint: 'استخدم المؤقّت، أو اكتب الوقت المُبلّغ',
    secondsAbbrev: 'ث',
```

- [ ] **Step 3: Verify the file still parses and keys resolve**

Run:
```bash
node -e "import('file:///C:/projects/PTApp/src/i18n.js').then(m=>{const ks=['measureHeading','nowDoing','timerStart','timerStop','timerReset','nextTest','enterCountPrompt','enterCmPrompt','runTimerHint','secondsAbbrev'];let bad=0;for(const k of ks)for(const l of ['en','ar']){const v=m.t(l,k);if(!v||v===k){console.log('MISSING',l,k);bad++}}console.log(bad?bad+' missing':'all 10 keys present in en+ar')})"
```
Expected: `all 10 keys present in en+ar`

- [ ] **Step 4: Confirm no existing string changed**

Write the prior committed version into the repo `tmp/` dir (Windows-safe `file:///` import), then compare every pre-existing key value:
```bash
git show HEAD:src/i18n.js > tmp/i18n-prev.js
node -e "Promise.all([import('file:///C:/projects/PTApp/src/i18n.js'),import('file:///C:/projects/PTApp/tmp/i18n-prev.js')]).then(([cur,prev])=>{const src=require('fs').readFileSync('tmp/i18n-prev.js','utf8');const keys=[...new Set([...src.matchAll(/^\s{4}(\w+):/gm)].map(m=>m[1]))];let d=0;for(const k of keys)for(const l of ['en','ar']){if(cur.t(l,k)!==prev.t(l,k)){console.log('CHANGED',l,k);d++}}console.log(d?d+' changed':'all pre-existing values identical')})"
rm tmp/i18n-prev.js
```
Expected: `all pre-existing values identical`. If any line prints `CHANGED`, you rewrote/normalized an existing string — revert that and re-add only the new keys (the v2.11.0 i18n trap).

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js
git commit -m "feat(eval): i18n keys for measurement console, EN + AR"
git push origin master
```

---

### Task 2: `EvalTimer.jsx` — the measurement console component

**Files:**
- Create: `src/components/EvalTimer.jsx`

This is a self-contained component. It is not mounted yet (Task 3 wires it in) — Task 2 only creates it and verifies it builds.

- [ ] **Step 1: Create the component**

Create `src/components/EvalTimer.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { haptic } from '../utils';
import { formatRunTime } from '../normCharts';
import { t } from '../i18n';

// The five tests in standard order. Rep tests use a countdown; run uses a count-up
// stopwatch; sit-reach has no timer (it's a distance). Chip labels reuse the v2.11 keys;
// 'pull' shows a combined label since the pullup/row variant lives in the form row.
const TESTS = [
  { key: 'pushup', labelKey: 'testPushup', mode: 'countdown' },
  { key: 'pull', labelKey: 'testPullup', mode: 'countdown', altLabelKey: 'testInvertedRow' },
  { key: 'squat', labelKey: 'testSquat', mode: 'countdown' },
  { key: 'run', labelKey: 'testRun', mode: 'stopwatch' },
  { key: 'sitReach', labelKey: 'testSitReach', mode: 'none' },
];
const modeOf = (key) => (TESTS.find(x => x.key === key) || {}).mode || 'none';

// One short beep via Web Audio — no asset. The AudioContext is created on a user-gesture
// tap (Start) and reused, so iOS allows the later programmatic beep at 0. Never let an
// audio failure break the timer (older/locked-down browsers): swallow everything.
function makeBeeper() {
  let ctx = null;
  return {
    unlock() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {} },
    beep() {
      try {
        if (!ctx) return;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.value = 0.15;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {}
    },
  };
}

// Props:
//   activeTest      — 'pushup'|'pull'|'squat'|'run'|'sitReach'
//   onSelect(key)   — chip tapped: parent sets activeTest
//   onCountdownEnd()— rep-test countdown hit 0 (parent flashes the row)
//   onStopwatchStop(seconds) — run stopwatch stopped (parent writes mm:ss + advances)
//   onNext()        — "Next →" tapped (parent advances to next unfilled test)
//   lang
export default function EvalTimer({ activeTest, onSelect, onCountdownEnd, onStopwatchStop, onNext, lang }) {
  const mode = modeOf(activeTest);
  const [duration, setDuration] = useState(30);   // countdown length, seconds
  const [remaining, setRemaining] = useState(30); // countdown ticks down
  const [elapsed, setElapsed] = useState(0);      // stopwatch ticks up
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const beeperRef = useRef(null);
  if (!beeperRef.current) beeperRef.current = makeBeeper();

  const clear = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };

  // Switching the active test (or unmounting) must reset the timer — no orphan interval,
  // no count carried from the previous test.
  useEffect(() => {
    clear();
    setRunning(false);
    setRemaining(duration);
    setElapsed(0);
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTest]);

  // Keep the idle countdown display in sync when the PT changes the duration (not running).
  useEffect(() => { if (!running && mode === 'countdown') setRemaining(duration); }, [duration, running, mode]);

  const start = () => {
    beeperRef.current.unlock();   // user gesture — unlock audio for the later beep
    haptic();
    if (running) return;
    setRunning(true);
    if (mode === 'countdown') {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clear(); setRunning(false); beeperRef.current.beep(); haptic(); onCountdownEnd && onCountdownEnd(); return 0; }
          return r - 1;
        });
      }, 1000);
    } else if (mode === 'stopwatch') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  };

  const stop = () => {
    clear();
    setRunning(false);
    if (mode === 'stopwatch') { haptic(); onStopwatchStop && onStopwatchStop(elapsed); }
  };

  const reset = () => { clear(); setRunning(false); setRemaining(duration); setElapsed(0); };
  const adjust = (delta) => setDuration(d => Math.max(5, Math.min(300, d + delta)));

  const chip = (test) => {
    const label = test.key === 'pull'
      ? `${t(lang, test.labelKey)}/${t(lang, test.altLabelKey)}`
      : t(lang, test.labelKey);
    return (
      <button key={test.key} type="button"
        className={`filter-tab${activeTest === test.key ? ' active' : ''}`}
        style={{ flex: '1 1 auto', fontSize: 12, padding: '6px 8px' }}
        onClick={() => { haptic(); onSelect(test.key); }}>
        {label}
      </button>
    );
  };

  return (
    <div className="eval-console">
      <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 6 }}>{t(lang, 'nowDoing')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {TESTS.map(chip)}
      </div>

      {mode === 'none' ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--t4)', padding: '8px 0' }}>
          {t(lang, 'enterCmPrompt')}
        </div>
      ) : (
        <>
          <div className="eval-timer-display">
            {mode === 'countdown'
              ? `0:${String(remaining).padStart(2, '0')}`
              : formatRunTime(elapsed)}
          </div>
          {mode === 'stopwatch' && (
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--t5)', marginBottom: 8 }}>
              {t(lang, 'runTimerHint')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            {mode === 'countdown' && (
              <button type="button" className="btn-secondary" style={{ padding: '8px 12px' }}
                onClick={() => adjust(-5)} disabled={running}>−5{t(lang, 'secondsAbbrev')}</button>
            )}
            {!running ? (
              <button type="button" className="btn-primary" style={{ padding: '8px 20px' }}
                onClick={start}>{t(lang, 'timerStart')}</button>
            ) : (
              <button type="button" className="btn-primary" style={{ padding: '8px 20px' }}
                onClick={stop}>{t(lang, 'timerStop')}</button>
            )}
            <button type="button" className="btn-secondary" style={{ padding: '8px 12px' }}
              onClick={reset}>{t(lang, 'timerReset')}</button>
            {mode === 'countdown' && (
              <button type="button" className="btn-secondary" style={{ padding: '8px 12px' }}
                onClick={() => adjust(5)} disabled={running}>+5{t(lang, 'secondsAbbrev')}</button>
            )}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button type="button" className="btn-ghost" style={{ fontSize: 12 }}
          onClick={() => { haptic(); onNext && onNext(); }}>{t(lang, 'nextTest')}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (component compiles though not yet mounted).

- [ ] **Step 3: Commit**

```bash
git add src/components/EvalTimer.jsx
git commit -m "feat(eval): EvalTimer console - active-test chips, countdown/stopwatch, beep+vibrate"
git push origin master
```

---

### Task 3: Wire EvalTimer into EvalForm (active test, console, auto-advance, row flash)

**Files:**
- Modify: `src/components/EvalForm.jsx`

The console writes into the existing `form` fields and `pullVariant`. Add `activeTest` state, a flash mechanism, the advance helper, and render `<EvalTimer>` between the date field and the push-up row.

- [ ] **Step 1: Add the import**

After the existing imports in `EvalForm.jsx`, the import line for normCharts already pulls `formatRunTime`. Add the EvalTimer import below the `Modal` import:

```js
import EvalTimer from './EvalTimer';
```

- [ ] **Step 2: Add activeTest + flash state and the helpers**

Inside the component, right after the existing `const set = (k) => ...` line, add:

```js
  // Measurement console (v2.11.1). activeTest = which test the timer is driving.
  const [activeTest, setActiveTest] = useState('pushup');
  const [flashTest, setFlashTest] = useState(null); // brief highlight when a countdown ends

  // Field name per test (pull maps to the single 'pull' raw field regardless of variant).
  const fieldOf = { pushup: 'pushup', pull: 'pull', squat: 'squat', run: 'run', sitReach: 'sitReach' };
  const orderOf = ['pushup', 'pull', 'squat', 'run', 'sitReach'];
  const isFilled = (testKey) => String(form[fieldOf[testKey]] ?? '').trim() !== '';
  const advance = () => {
    const next = orderOf.find(k => !isFilled(k));
    if (next) setActiveTest(next);
  };
  // Countdown ended → flash the active rep row for ~1.5s (no focus(): iOS won't open the
  // keyboard from a timer callback; the PT taps the highlighted row to type).
  const onCountdownEnd = () => {
    setFlashTest(activeTest);
    setTimeout(() => setFlashTest(f => (f === activeTest ? null : f)), 1500);
  };
  const onStopwatchStop = (sec) => {
    setForm(p => ({ ...p, run: formatRunTime(sec) }));
    advance();
  };
```

- [ ] **Step 3: Render the console above the test rows**

Find the date field block:

```jsx
      <div className="field">
        <label className="field-label">{t(lang, 'evalDate')}</label>
        <input type="date" className="input" value={form.date} onChange={set('date')} />
      </div>

      {testRow('testPushup', 'repsIn30s', 'pushup', chipFor('pushup'))}
```

Insert the console between the date field's closing `</div>` and the `{testRow('testPushup', ...)}` line:

```jsx
      <EvalTimer
        activeTest={activeTest}
        onSelect={setActiveTest}
        onCountdownEnd={onCountdownEnd}
        onStopwatchStop={onStopwatchStop}
        onNext={advance}
        lang={lang}
      />
```

- [ ] **Step 4: Apply the flash highlight to the active row's field wrapper**

The `testRow` helper renders each row. Add an optional flash by wrapping the row in a class when it's the flashing test. Change the `testRow` definition so the outer `<div className="field">` becomes:

```jsx
  const testRow = (labelKey, hintKey, field, chip, extra) => (
    <div className={`field${flashTest === field ? ' eval-row-flash' : ''}`}>
      <label className="field-label">
        {t(lang, labelKey)} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, hintKey)}{extra || ''}</span>
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* sitReach can be NEGATIVE (short of toes) and run needs a COLON (mm:ss) —
            the iOS numeric/decimal pads have neither key, so both get the full
            keyboard. Reps stay on the numeric pad. */}
        <input className="input" style={{ flex: 1 }}
          inputMode={field === 'sitReach' || field === 'run' ? 'text' : 'numeric'}
          placeholder={field === 'run' ? t(lang, 'runHint') : ''}
          value={form[field]} onChange={set(field)} />
        {chip}
      </div>
    </div>
  );
```

(The pull row is rendered inline, not via `testRow`. Add the same flash to its wrapper.) Find:

```jsx
      {/* Pull variant toggle — inverted row is the PT's stated equivalent */}
      <div className="field">
```

Change that opening to:

```jsx
      {/* Pull variant toggle — inverted row is the PT's stated equivalent */}
      <div className={`field${flashTest === 'pull' ? ' eval-row-flash' : ''}`}>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/components/EvalForm.jsx
git commit -m "feat(eval): wire EvalTimer into form - active test, stopwatch fills run, countdown flash, auto-advance"
git push origin master
```

---

### Task 4: CSS for the console, timer display, and row flash

**Files:**
- Modify: `src/styles.css` (append after the v2.11 eval block — search for `.eval-chip-5`)

- [ ] **Step 1: Append the styles**

After the `.eval-chip-5 { background: #059669; }` line, append:

```css
/* ─── Evaluation measurement console (v2.11.1) ─── */
.eval-console {
  border: 1px solid var(--sep);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 14px;
  background: var(--sep);
}
.eval-timer-display {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  color: var(--t1);
  margin: 6px 0 10px;
}
/* Brief highlight on a test row when its countdown ends — draws the eye so the PT
   taps it to type the rep count (no programmatic focus on iOS). */
@keyframes evalRowFlash {
  0% { background: rgba(245, 158, 11, 0.35); }
  100% { background: transparent; }
}
.eval-row-flash {
  animation: evalRowFlash 1.5s ease-out;
  border-radius: 8px;
}
```

(The amber `rgba(245,158,11,…)` matches the app's active-glow accent `#F59E0B`; it's a transient animation tint, not a themed surface color, so a literal rgba is acceptable here — same pattern as the existing `card-now` glow.)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(eval): styles for measurement console, timer display, row flash"
git push origin master
```

---

### Task 5: Move the Evaluate section to the top of the expanded client card

**Files:**
- Modify: `src/components/Clients.jsx`

Relocate `<EvalSection>` from the bottom of the expanded block to the top (before the month navigator). One move; no logic change.

- [ ] **Step 1: Remove the current bottom placement**

Find and DELETE these two lines (currently just before the expanded block's closing `</div>`, ~line 341–342):

```jsx
                {/* v2.11: evaluations — history + Evaluate action */}
                <EvalSection client={c} state={state} dispatch={dispatch} lang={lang} />
```

- [ ] **Step 2: Insert at the top of the expanded block**

Find the opening of the expanded block:

```jsx
            {/* Expanded: month navigator + session list */}
            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--sep)', paddingTop: 12 }}>
                {/* Month navigator */}
```

Insert the EvalSection between the wrapper `<div>` and the `{/* Month navigator */}` comment:

```jsx
            {/* Expanded: month navigator + session list */}
            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--sep)', paddingTop: 12 }}>
                {/* v2.11.1: evaluations moved to the TOP of the expanded card (was below sessions) */}
                <EvalSection client={c} state={state} dispatch={dispatch} lang={lang} />
                {/* Month navigator */}
```

- [ ] **Step 3: Verify build + that EvalSection appears exactly once**

Run:
```bash
npm run build
node -e "const s=require('fs').readFileSync('src/components/Clients.jsx','utf8');const n=(s.match(/<EvalSection/g)||[]).length;console.log('EvalSection mounts:',n)"
```
Expected: build succeeds; `EvalSection mounts: 1`.

- [ ] **Step 4: Commit**

```bash
git add src/components/Clients.jsx
git commit -m "feat(eval): move Evaluate section to top of expanded client card (was below sessions)"
git push origin master
```

---

### Task 6: Version bump, changelogs, docs

**Files:**
- Modify: `src/App.jsx` (debug-panel version line)
- Modify: `docs/changelog-summary.md`, `docs/changelog-technical.md` (prepend a v2.11.1 entry each)
- Modify: `CLAUDE.md` (Current Version → v2.11.1; demote v2.11.0 to a one-line pointer)

Note: `General.jsx` `DOCS.instructions` stays at `instructions-v2.11.md` — this is a point release of the same feature, no new instructions doc needed; the v2.11 doc already describes evaluations.

- [ ] **Step 1: Bump the version**

In `src/App.jsx`, find `<div><strong>Version:</strong> v2.11.0</div>` and change to `v2.11.1`.

- [ ] **Step 2: Prepend a v2.11.1 entry to `docs/changelog-summary.md`**

Read the file's existing top entry for format, then prepend (PT-facing tone):

```markdown
## v2.11.1 — Evaluation timer & quicker access

- The **Evaluate** button now sits at the top of a client's card (open a client to see it) — no more scrolling past all their sessions.
- During an evaluation there's now a **built-in timer**: pick the test you're doing, run a 30-second countdown for the rep tests (it beeps and vibrates when time's up), or a stopwatch for the 1-mile run. You can still type any result by hand — handy when the run was done without you.
- After the run timer stops it jumps to the next test automatically. Every number stays editable before you save.
```

- [ ] **Step 3: Prepend a v2.11.1 entry to `docs/changelog-technical.md`**

Read the file's existing top entry for format, then prepend (developer tone):

```markdown
## v2.11.1 — Eval measurement console (UI only, no schema change)

- New `src/components/EvalTimer.jsx`: self-contained console — active-test chips, 30s countdown (rep tests, ±5s, clamp 5–300) with Web-Audio beep + `haptic()` + row flash at 0, count-up stopwatch for the run (fills `mm:ss`), none for sit-reach. One `setInterval` in a ref, reset on `activeTest` change via `useEffect` (no orphan interval). AudioContext unlocked on the Start gesture for iOS.
- `EvalForm.jsx`: `activeTest` state; console rendered above the 5 rows; console writes into the same `form` fields (single source of truth); stopwatch-stop fills run + auto-advances to next unfilled test; countdown-end flashes the row (no programmatic `focus()` — iOS keyboard gesture rule). Order `[pushup, pull, squat, run, sitReach]`.
- `Clients.jsx`: `<EvalSection>` moved from bottom of the expanded card to the top.
- No reducer/normCharts/utils/schema change; nothing new persisted (timer, duration, test order are ephemeral). No new sanity script.
- Spec: `docs/superpowers/specs/2026-06-13-eval-ux-timer-design.md`. Plan: `docs/superpowers/plans/2026-06-13-eval-ux-timer.md`.
```

- [ ] **Step 4: Update `CLAUDE.md`**

a. Change the `## Current Version: v2.11.0` heading + summary to `## Current Version: v2.11.1` with a tight block:

```markdown
## Current Version: v2.11.1
UI-only point release on the evaluation system — review/spec/plan in `docs/superpowers/{specs,plans}/2026-06-13-eval-ux-timer*`.
- **`EvalTimer.jsx`** — in-form measurement console: active-test chips, 30s countdown (rep tests, beep+vibrate+row-flash at 0), count-up stopwatch (run, fills mm:ss), none for sit-reach. Timer state is ephemeral — **nothing persisted, no schema change**. One interval in a ref, reset on test switch.
- **EvalForm** writes the console's results into the same `form` fields the rows use (single source of truth); all values stay hand-editable; stopwatch auto-advances, countdown flashes (never programmatic `focus()` — iOS keyboard gesture rule).
- **Evaluate section moved to the TOP of the expanded client card** (was below sessions).
```

b. Demote the existing v2.11.0 block: move it to the "## Older Versions" one-line pointer list as a single line matching that list's style (e.g. `- **v2.11.0** — Evaluation system (Mass battery): normCharts.js charts+scoring, schema v5 evaluations[], freeze-at-save, EvalForm/EvalSection/NormChartsView. See docs/instructions-v2.11.md.`).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: success, and the bundle shows `v2.11.1` (visible in the debug panel at runtime).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx docs/changelog-summary.md docs/changelog-technical.md CLAUDE.md
git commit -m "docs(eval): v2.11.1 - version bump, changelogs, CLAUDE.md"
git push origin master
```

---

### Task 7: Build, verify, deploy, confirm Pages build

**Files:** none (deploy only). Follow CLAUDE.md "How to Build, Verify, and Deploy".

- [ ] **Step 1: Build + bundle integrity check**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js && echo "BUNDLE OK"
```
Expected: build succeeds, `BUNDLE OK`.

- [ ] **Step 2: Deploy to gh-pages**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy v2.11.1: eval measurement console + timer" && git push origin gh-pages
git checkout master
```

- [ ] **Step 3: Confirm the deploy actually landed (Jun 11 deploy-race lesson)**

Wait for the Pages build to leave `building`, then confirm `built` and that the live site serves v2.11.1:
```bash
gh api repos/pih-dev/PTApp/pages/builds/latest --jq '{status: .status, error: .error.message}'
```
Expected: `status: built`, `error: null`. If it shows `errored` or stays `building` with no run in the Actions list, POST a fresh build: `gh api -X POST repos/pih-dev/PTApp/pages/builds`, then re-check. Optionally diff live HTML vs `dist/index.html` for certainty.

- [ ] **Step 4: Tell Pierre** the version (v2.11.1) is live for phone verification, and what to check (Evaluate at the top of a client card; the timer console during an evaluation).

---

## Notes for the executor

- This is UI-only. If at any point you find yourself editing `normCharts.js`, `utils.js`, the reducer, or a migration, STOP — you've left the plan's scope.
- Keep the five test rows behaving exactly as v2.11.0 (live verdict chips, classification, manual editing). The console is additive.
- `haptic` and `formatRunTime` already exist (`utils.js` / `normCharts.js`) — import, don't reimplement.
