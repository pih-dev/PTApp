import React, { useState } from 'react';
import Modal from './Modal';
import { genId, haptic } from '../utils';
import { t } from '../i18n';
import { DEFAULT_SEQUENCE, METHODS, FAT_THRESHOLD } from '../programRules';
import { generateProgram } from '../programKernel';

const methodLabel = (lang, id) => t(lang, 'method' + id.charAt(0).toUpperCase() + id.slice(1));
const classLabel = (lang, id) => t(lang, 'class' + id.charAt(0).toUpperCase() + id.slice(1));
const CLASS_IDS = ['begA', 'begB', 'intA', 'intB', 'pro'];

// Next Monday from today — programs start on a fresh week (spec §7).
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Setup sheet (spec §7): derived class/weak point, BF% with threshold pre-tick,
// six method dropdowns, start date, ONE Generate tap. All math lives in the
// kernel — this component only collects args.
export default function ProgramSetup({ client, evalRecord, dispatch, lang, onClose }) {
  const [fatPct, setFatPct] = useState('');
  const [fatTouched, setFatTouched] = useState(false);       // trainer's manual tick beats the threshold
  const [includeFat, setIncludeFat] = useState(false);
  const [methods, setMethods] = useState(DEFAULT_SEQUENCE);
  const [startDate, setStartDate] = useState(nextMonday());
  // Level = volume tier. Eval's classification is only the pre-selected SUGGESTION —
  // the trainer taps another chip to override (Elie's Option 1 pick, 2026-07-14:
  // strength ratios ≠ training experience). Kernel stamps auto/manual on the record.
  const [classification, setClassification] = useState(evalRecord.frozen.classification);

  const threshold = FAT_THRESHOLD[client.gender] ?? FAT_THRESHOLD.male;
  const fatNum = parseFloat(fatPct);
  const suggested = Number.isFinite(fatNum) && fatNum >= threshold;
  const fatOn = fatTouched ? includeFat : suggested;         // auto-tick until the trainer takes over

  const onFatPct = (e) => { setFatPct(e.target.value); if (!fatTouched) setIncludeFat(false); };
  const setMethodAt = (i) => (e) => setMethods(methods.map((m, j) => j === i ? e.target.value : m));

  const save = () => {
    haptic();
    // fat-loss OFF ⇒ any endurance slot falls back to fiveOfFive (spec §5)
    const effective = methods.map(m => (!fatOn && m === 'endurance') ? 'fiveOfFive' : m);
    const record = generateProgram({
      id: genId(), client, evalRecord, classification,
      fatPct: Number.isFinite(fatNum) ? fatNum : null, includeFatLoss: fatOn,
      methods: effective, startDate, createdAt: new Date().toISOString(),
    });
    dispatch({ type: 'ADD_PROGRAM', payload: record });
    onClose();
  };

  const scores = evalRecord.frozen.scores;
  return (
    <Modal title={t(lang, 'programSetupTitle')} onClose={onClose}
      action={<button className="btn-primary" style={{ width: '100%' }} onClick={save}>{t(lang, 'generateProgram')}</button>}>
      {/* weak-point context — read-only */}
      <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 10 }}>
        {t(lang, 'weakPointLabel')}: B{scores.bench} · S{scores.squat} · D{scores.deadlift}
      </div>

      {/* level chips — pre-selected from the eval, tappable override (weekday-chip reuse) */}
      <div className="field-label">{t(lang, 'levelLabel')}</div>
      <div className="weekday-row">
        {CLASS_IDS.map(id => (
          <button key={id} type="button"
            className={`weekday-chip${classification === id ? ' selected' : ''}`}
            onClick={() => { haptic(); setClassification(id); }}>
            {classLabel(lang, id)}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t4)', margin: '-6px 0 10px' }}>
        {t(lang, 'levelSuggested')}: {classLabel(lang, evalRecord.frozen.classification)}
      </div>

      <div className="field-label">{t(lang, 'bodyFatPct')}</div>
      <input className="input" inputMode="decimal" value={fatPct} onChange={onFatPct} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', fontSize: 14 }}>
        <input type="checkbox" checked={fatOn}
          onChange={(e) => { setFatTouched(true); setIncludeFat(e.target.checked); }} />
        {t(lang, 'includeFatLossBlock')}
        {suggested && !fatTouched && <span style={{ fontSize: 11, color: 'var(--t4)' }}>{t(lang, 'fatLossSuggested')}</span>}
      </label>

      <div className="field-label">{t(lang, 'startDateLabel')}</div>
      <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      {methods.map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--t4)', minWidth: 64 }}>{t(lang, 'blockLabel')} {i + 1}</span>
          <select className="input" style={{ flex: 1 }} value={m} onChange={setMethodAt(i)}>
            {Object.keys(METHODS).map(id => (
              <option key={id} value={id} disabled={id === 'endurance' && !fatOn}>
                {methodLabel(lang, id)} — {t(lang, 'obj' + METHODS[id].objective.charAt(0).toUpperCase() + METHODS[id].objective.slice(1))}
              </option>
            ))}
          </select>
        </div>
      ))}
    </Modal>
  );
}
