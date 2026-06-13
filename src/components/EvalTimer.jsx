import React, { useState, useRef, useEffect } from 'react';
import { haptic } from '../utils';
import { formatRunTime } from '../normCharts';
import { t } from '../i18n';

// The five tests in standard order. Rep tests use a 30s countdown; the run uses a
// count-up stopwatch; sit-reach has no timer (it's a distance). Chip labels reuse the
// v2.11 keys; 'pull' shows a combined label since the pullup/row variant lives in the
// form row below, not here.
const TESTS = [
  { key: 'pushup', labelKey: 'testPushup', mode: 'countdown' },
  { key: 'pull', labelKey: 'testPullup', mode: 'countdown', altLabelKey: 'testInvertedRow' },
  { key: 'squat', labelKey: 'testSquat', mode: 'countdown' },
  { key: 'run', labelKey: 'testRun', mode: 'stopwatch' },
  { key: 'sitReach', labelKey: 'testSitReach', mode: 'none' },
];
const modeOf = (key) => (TESTS.find(x => x.key === key) || {}).mode || 'none';

// One short beep via Web Audio — no asset. The AudioContext is created on a user-gesture
// tap (Start) and reused, so iOS allows the later programmatic beep at 0. An audio failure
// (older/locked-down browser) must never break the timer — swallow everything.
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

// Measurement console (v2.11.1). Owns ONLY timer state — never the eval values.
// Props:
//   activeTest       — 'pushup'|'pull'|'squat'|'run'|'sitReach'
//   onSelect(key)    — chip tapped: parent sets activeTest
//   onCountdownEnd() — rep-test countdown hit 0 (parent flashes the row; no focus() — a
//                      timer callback isn't a user gesture, so iOS won't open the keyboard)
//   onStopwatchStop(seconds) — run stopwatch stopped (parent writes mm:ss + advances)
//   onNext()         — "Next →" tapped (parent advances to next unfilled test)
//   lang
export default function EvalTimer({ activeTest, onSelect, onCountdownEnd, onStopwatchStop, onNext, lang }) {
  const mode = modeOf(activeTest);
  const [duration, setDuration] = useState(30);   // countdown length, seconds
  const [remaining, setRemaining] = useState(30); // countdown ticks down
  const [elapsed, setElapsed] = useState(0);      // stopwatch ticks up
  const [running, setRunning] = useState(false);
  const beeperRef = useRef(null);
  if (!beeperRef.current) beeperRef.current = makeBeeper();

  // Switching the active test resets the timer — no count carried from the previous test,
  // no timer left running. (running=false stops the tick effect from rescheduling.)
  useEffect(() => {
    setRunning(false);
    setRemaining(duration);
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTest]);

  // Keep the idle countdown display synced when the PT changes the duration (not running).
  useEffect(() => { if (!running && mode === 'countdown') setRemaining(duration); }, [duration, running, mode]);

  // Tick: while running, advance once per second via a self-rescheduling timeout. Re-runs
  // on every remaining/elapsed change (classic React timer), cleans up its pending timeout
  // when running stops or on unmount. No setInterval ref, no side effects in a state updater.
  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => {
      if (mode === 'countdown') setRemaining(r => Math.max(0, r - 1));
      else if (mode === 'stopwatch') setElapsed(e => e + 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [running, remaining, elapsed, mode]);

  // Countdown reached 0 → stop + beep + vibrate + tell the parent (fires exactly once: the
  // moment running flips false the condition no longer holds).
  useEffect(() => {
    if (mode === 'countdown' && running && remaining === 0) {
      setRunning(false);
      beeperRef.current.beep();
      haptic();
      if (onCountdownEnd) onCountdownEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, mode]);

  const start = () => {
    beeperRef.current.unlock();   // user gesture — unlock audio for the later beep
    haptic();
    if (mode === 'countdown' && remaining <= 0) setRemaining(duration);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    if (mode === 'stopwatch') { haptic(); if (onStopwatchStop) onStopwatchStop(elapsed); }
  };
  const reset = () => { setRunning(false); setRemaining(duration); setElapsed(0); };
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
            {/* formatRunTime (mm:ss) for both — the countdown duration is adjustable up
                to 300s, so a hardcoded "0:NN" would render "0:120" at 2 minutes. */}
            {formatRunTime(mode === 'countdown' ? remaining : elapsed)}
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
          onClick={() => { haptic(); if (onNext) onNext(); }}>{t(lang, 'nextTest')}</button>
      </div>
    </div>
  );
}
