import React, { useState } from 'react';
import Modal from './Modal';
import EvalTimer from './EvalTimer';
import { genId, today, ageAtDate, haptic } from '../utils';
import { computeEvalFrozen, parseRunTime, formatRunTime } from '../normCharts';
import { t } from '../i18n';

// Maps a 1-5 score (or run levelKey) to its i18n label + chip class.
// Exported — EvalSection and NormChartsView reuse it so a label/color change
// can never desync across surfaces.
export const scoreLabel = (lang, score, levelKey) => {
  if (score != null) return t(lang, `level${score}`);
  if (levelKey === 'poor') return t(lang, 'runPoor');
  if (levelKey === 'average') return t(lang, 'level3');
  if (levelKey === 'good') return t(lang, 'level4');
  if (levelKey === 'excellent') return t(lang, 'level5');
  return '';
};
export const scoreChipClass = (score, levelKey) => {
  const n = score != null ? score
    : { poor: 1, average: 3, good: 4, excellent: 5 }[levelKey] || 0;
  return n ? `eval-chip eval-chip-${n}` : 'eval-chip';
};

// evalRecord = null → new eval; otherwise edit mode (pre-filled, re-freezes on save).
export default function EvalForm({ client, evalRecord, dispatch, lang, onClose }) {
  const [form, setForm] = useState(() => evalRecord ? {
    date: evalRecord.date,
    pullVariant: evalRecord.pullVariant,
    pushup: String(evalRecord.raw.pushup),
    pull: String(evalRecord.raw.pull),
    squat: String(evalRecord.raw.squat),
    run: evalRecord.raw.runSec == null ? '' : formatRunTime(evalRecord.raw.runSec),
    sitReach: evalRecord.raw.sitReachCm == null ? '' : String(evalRecord.raw.sitReachCm),
  } : {
    date: today(), pullVariant: 'pullup',
    pushup: '', pull: '', squat: '', run: '', sitReach: '',
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Measurement console (v2.11.1). activeTest = which test the timer is driving.
  const [activeTest, setActiveTest] = useState('pushup');
  const [flashTest, setFlashTest] = useState(null); // brief row highlight when a countdown ends

  const orderOf = ['pushup', 'pull', 'squat', 'run', 'sitReach'];
  const isFilled = (testKey) => String(form[testKey] ?? '').trim() !== '';
  const advance = () => {
    const next = orderOf.find(k => !isFilled(k));
    if (next) setActiveTest(next);
  };
  // Countdown ended → flash the active rep row for ~1.5s (no focus(): a timer callback
  // isn't a user gesture, so iOS won't open the keyboard; the PT taps the row to type).
  const onCountdownEnd = () => {
    const which = activeTest;
    setFlashTest(which);
    setTimeout(() => setFlashTest(f => (f === which ? null : f)), 1500);
  };
  const onStopwatchStop = (sec) => {
    setForm(p => ({ ...p, run: formatRunTime(sec) }));
    advance();
  };

  // Parse the draft. Muscle raws: non-negative integers, required.
  // Run: mm:ss, optional. Sit-and-reach: cm past toes, may be negative, optional.
  const toReps = (s) => /^\d+$/.test(s.trim()) ? +s.trim() : null;
  const raw = {
    pushup: toReps(form.pushup),
    pull: toReps(form.pull),
    squat: toReps(form.squat),
    runSec: form.run.trim() === '' ? null : parseRunTime(form.run),
    sitReachCm: form.sitReach.trim() === '' ? null
      : (/^-?\d+(\.\d+)?$/.test(form.sitReach.trim()) ? +form.sitReach.trim() : undefined),
  };
  const musclesValid = raw.pushup != null && raw.pull != null && raw.squat != null;
  const runInvalid = form.run.trim() !== '' && raw.runSec == null;
  const sitInvalid = raw.sitReachCm === undefined;
  const canSave = musclesValid && !runInvalid && !sitInvalid && !!form.date;

  // Live preview = the SAME kernel the save path uses (v2.9.6 trap: a preview that
  // re-implements the math will eventually disagree with the stored record).
  const age = ageAtDate(client.birthdate, form.date || today());
  const frozen = musclesValid
    ? computeEvalFrozen(client.gender, age, form.pullVariant,
        { ...raw, sitReachCm: sitInvalid ? null : raw.sitReachCm })
    : null;

  const save = () => {
    if (!canSave) return;
    const record = {
      id: evalRecord ? evalRecord.id : genId(),
      clientId: client.id,
      date: form.date,
      branch: 'mass',
      pullVariant: form.pullVariant,
      raw,
      frozen,   // freeze-at-save: this exact object was just previewed on screen
    };
    dispatch({ type: evalRecord ? 'EDIT_EVALUATION' : 'ADD_EVALUATION', payload: record });
    onClose();
  };

  // One labeled raw-value row with its live verdict chip
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
  const chipFor = (key) => frozen && frozen.scores[key] != null ? (
    <span className={scoreChipClass(
      key === 'run' ? null : frozen.scores[key],
      key === 'run' ? frozen.scores.run : null)}>
      {scoreLabel(lang,
        key === 'run' ? null : frozen.scores[key],
        key === 'run' ? frozen.scores.run : null)}
    </span>
  ) : null;

  return (
    <Modal title={evalRecord ? t(lang, 'editEval') : t(lang, 'newEval')} onClose={onClose}
      action={<button className="btn-primary" disabled={!canSave} onClick={save}>{t(lang, 'saveEval')}</button>}>

      {/* Branch picker — Pro/Elite ships in v2.12, shown disabled to set the roadmap
          expectation (Pierre's call, 2026-06-10) */}
      <div className="field">
        <label className="field-label">{t(lang, 'batteryLabel')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="filter-tab active" style={{ flex: 1 }}>{t(lang, 'branchMass')}</button>
          <button className="filter-tab" style={{ flex: 1, opacity: 0.45 }} disabled>
            {t(lang, 'branchPro')} · {t(lang, 'comingSoon')}
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">{t(lang, 'evalDate')}</label>
        <input type="date" className="input" value={form.date} onChange={set('date')} />
      </div>

      <EvalTimer
        activeTest={activeTest}
        onSelect={setActiveTest}
        onCountdownEnd={onCountdownEnd}
        onStopwatchStop={onStopwatchStop}
        onNext={advance}
        lang={lang}
      />

      {testRow('testPushup', 'repsIn30s', 'pushup', chipFor('pushup'))}

      {/* Pull variant toggle — inverted row is the PT's stated equivalent */}
      <div className={`field${flashTest === 'pull' ? ' eval-row-flash' : ''}`}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          {['pullup', 'invertedRow'].map(v => (
            <button key={v} className={`filter-tab${form.pullVariant === v ? ' active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => { haptic(); setForm(p => ({ ...p, pullVariant: v })); }}>
              {t(lang, v === 'pullup' ? 'testPullup' : 'testInvertedRow')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="input" style={{ flex: 1 }} inputMode="numeric"
            value={form.pull} onChange={set('pull')} />
          {chipFor('pull')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t5)', marginTop: 4 }}>{t(lang, 'repsIn30s')}</div>
      </div>

      {testRow('testSquat', 'repsIn30s', 'squat', chipFor('squat'))}
      {testRow('testRun', 'runHint', 'run', chipFor('run'), ' ' + t(lang, 'optionalField'))}
      {testRow('testSitReach', 'sitReachHint', 'sitReach', chipFor('sitReach'), ' ' + t(lang, 'optionalField'))}

      {/* Classification — appears once the 3 muscle tests are in */}
      {frozen && (
        <div className="field" style={{ borderTop: '1px solid var(--sep)', paddingTop: 12, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {t(lang, 'muscleAvg')}: <strong style={{ color: 'var(--t1)' }}>{frozen.muscleAvg}</strong>
          </span>
          <span className={`badge badge-class-${frozen.classification}`}>
            {t(lang, 'class' + frozen.classification.charAt(0).toUpperCase() + frozen.classification.slice(1))}
          </span>
        </div>
      )}
    </Modal>
  );
}
