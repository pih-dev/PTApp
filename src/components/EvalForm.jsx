import React, { useState } from 'react';
import Modal from './Modal';
import { genId, today, ageAtDate } from '../utils';
import { compute1RMFrozen } from '../normCharts';
import { t } from '../i18n';

// Maps a 1-5 score (or run levelKey) to its i18n label + chip class.
// Exported — EvalSection and NormChartsView reuse it so a label/color change
// can never desync across surfaces. The levelKey path is kept for LEGACY mass
// records (their frozen run verdicts still render in history).
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

// v2.12: the 1RM battery form (bench / squat / deadlift vs bodyweight-ratio
// standards) — replaced the Mass battery (Pierre's call 2026-07-06, spec
// 2026-07-06-1rm-battery-replaces-mass-design.md). evalRecord = null → new eval;
// otherwise edit mode. Only branch '1rm' records are editable — EvalSection
// hides Edit on legacy mass records, so this form never sees a mass shape.
export default function EvalForm({ client, evalRecord, dispatch, lang, onClose }) {
  const [form, setForm] = useState(() => evalRecord ? {
    date: evalRecord.date,
    bodyweight: String(evalRecord.raw.bodyweightKg),
    bench: String(evalRecord.raw.benchKg),
    squat: String(evalRecord.raw.squatKg),
    deadlift: String(evalRecord.raw.deadliftKg),
  } : { date: today(), bodyweight: '', bench: '', squat: '', deadlift: '' });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Positive kg numbers, decimals allowed (2.5 kg plates). null = empty/invalid.
  const toKg = (s) => /^\d+(\.\d+)?$/.test(s.trim()) && +s.trim() > 0 ? +s.trim() : null;
  const raw = {
    bodyweightKg: toKg(form.bodyweight),
    benchKg: toKg(form.bench),
    squatKg: toKg(form.squat),
    deadliftKg: toKg(form.deadlift),
  };
  // All four values required — classification is the exact 3-lift average
  // (mirrors the mass battery's 3-required-tests contract; spec §1).
  const allValid = raw.bodyweightKg != null && raw.benchKg != null
    && raw.squatKg != null && raw.deadliftKg != null;
  const canSave = allValid && !!form.date;

  // Live preview = the SAME kernel the save path uses (v2.9.6 trap: a preview
  // that re-implements the math will eventually disagree with the stored record).
  const age = ageAtDate(client.birthdate, form.date || today());
  const frozen = allValid ? compute1RMFrozen(client.gender, age, raw) : null;

  const save = () => {
    if (!canSave) return;
    const record = {
      id: evalRecord ? evalRecord.id : genId(),
      clientId: client.id,
      date: form.date,
      branch: '1rm',
      raw,
      frozen,   // freeze-at-save: this exact object was just previewed on screen
    };
    dispatch({ type: evalRecord ? 'EDIT_EVALUATION' : 'ADD_EVALUATION', payload: record });
    onClose();
  };

  // "1.43× BW" hint — display-only, derived live from raw (ratios are NOT frozen;
  // they're deterministic from raw, spec §1).
  const ratioText = (kg) => kg != null && raw.bodyweightKg != null
    ? `${(kg / raw.bodyweightKg).toFixed(2)}${t(lang, 'bwRatio')}` : '';

  // One lift row: kg input + live ratio hint + live verdict chip
  const liftRow = (labelKey, field, scoreKey) => (
    <div className="field">
      <label className="field-label">
        {t(lang, labelKey)} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'oneRmHint')}</span>
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* decimal pad: kg values need the dot key (2.5 kg plates) */}
        <input className="input" style={{ flex: 1 }} inputMode="decimal"
          value={form[field]} onChange={set(field)} />
        <span style={{ fontSize: 12, color: 'var(--t4)', minWidth: 62, textAlign: 'center' }}>
          {ratioText(raw[field + 'Kg'])}
        </span>
        {frozen && frozen.scores[scoreKey] != null && (
          <span className={scoreChipClass(frozen.scores[scoreKey], null)}>
            {scoreLabel(lang, frozen.scores[scoreKey], null)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Modal title={evalRecord ? t(lang, 'editEval') : t(lang, 'newEval')} onClose={onClose}
      action={<button className="btn-primary" disabled={!canSave} onClick={save}>{t(lang, 'saveEval')}</button>}>

      <div className="field">
        <label className="field-label">{t(lang, 'evalDate')}</label>
        <input type="date" className="input" value={form.date} onChange={set('date')} />
      </div>

      <div className="field">
        <label className="field-label">
          {t(lang, 'bodyweightLabel')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'kgHint')}</span>
        </label>
        <input className="input" inputMode="decimal"
          value={form.bodyweight} onChange={set('bodyweight')} />
      </div>

      {liftRow('testBench', 'bench', 'bench')}
      {liftRow('testSquat1rm', 'squat', 'squat')}
      {liftRow('testDeadlift', 'deadlift', 'deadlift')}

      {/* Classification — appears once all four numbers are valid AND the kernel
          resolved a classification (null = gender drift → visibly incomplete) */}
      {frozen && frozen.classification && (
        <div className="field" style={{ borderTop: '1px solid var(--sep)', paddingTop: 12, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {t(lang, 'liftAvg')}: <strong style={{ color: 'var(--t1)' }}>{frozen.liftAvg}</strong>
          </span>
          <span className={`badge badge-class-${frozen.classification}`}>
            {t(lang, 'class' + frozen.classification.charAt(0).toUpperCase() + frozen.classification.slice(1))}
          </span>
        </div>
      )}
    </Modal>
  );
}
