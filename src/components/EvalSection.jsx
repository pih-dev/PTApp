import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, haptic } from '../utils';
import { formatRunTime } from '../normCharts';
import EvalForm, { scoreLabel, scoreChipClass } from './EvalForm';
import ProgramSetup from './ProgramSetup';
import ProgramViewer from './ProgramViewer';
import { t } from '../i18n';

// classification can legitimately be null (computeEvalFrozen emits it when a muscle
// score can't be resolved) — render '—' rather than crashing on our own value domain.
const classLabel = (lang, c) => c ? t(lang, 'class' + c.charAt(0).toUpperCase() + c.slice(1)) : '—';

// Evaluations block inside the expanded client card: Evaluate button (gated on
// gender+birthdate — the chart lookup needs both), newest-first history with
// expandable per-test detail, Edit + Delete per record.
export default function EvalSection({ client, state, dispatch, lang }) {
  const [formTarget, setFormTarget] = useState(null);     // null | 'new' | evalRecord
  const [openEvalId, setOpenEvalId] = useState(null);     // expanded history row
  const [deleteTarget, setDeleteTarget] = useState(null); // eval pending delete confirm

  const evals = (state.evaluations || [])
    .filter(ev => ev.clientId === client.id)
    .sort((a, b) => b.date.localeCompare(a.date) || (b._modified || '').localeCompare(a._modified || ''));
  const profileReady = !!(client.gender && client.birthdate);

  // Per-test display rows for an expanded record: [labelKey, rawText, score, levelKey].
  // Branch-aware: '1rm' records (v2.12+) show kg + live-derived BW ratio; legacy
  // 'mass' records (v2.11) render exactly as before — preserved forever, view-only.
  const ratioTxt = (kg, bw) => `${kg} ${t(lang, 'kgHint')} (${(kg / bw).toFixed(2)}${t(lang, 'bwRatio')})`;
  const detailRows = (ev) => ev.branch === '1rm' ? [
    ['bodyweightLabel', `${ev.raw.bodyweightKg} ${t(lang, 'kgHint')}`, null, null],
    ['testBench', ratioTxt(ev.raw.benchKg, ev.raw.bodyweightKg), ev.frozen.scores.bench, null],
    ['testSquat1rm', ratioTxt(ev.raw.squatKg, ev.raw.bodyweightKg), ev.frozen.scores.squat, null],
    ['testDeadlift', ratioTxt(ev.raw.deadliftKg, ev.raw.bodyweightKg), ev.frozen.scores.deadlift, null],
  ] : [
    ['testPushup', `${ev.raw.pushup}`, ev.frozen.scores.pushup, null],
    [ev.pullVariant === 'pullup' ? 'testPullup' : 'testInvertedRow', `${ev.raw.pull}`, ev.frozen.scores.pull, null],
    ['testSquat', `${ev.raw.squat}`, ev.frozen.scores.squat, null],
    ...(ev.raw.runSec != null ? [['testRun', formatRunTime(ev.raw.runSec), null, ev.frozen.scores.run]] : []),
    ...(ev.raw.sitReachCm != null ? [['testSitReach', `${ev.raw.sitReachCm} cm`, ev.frozen.scores.sitReach, null]] : []),
  ];

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--sep)', paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t(lang, 'evaluations')}</div>
        <button className="btn-sm" disabled={!profileReady}
          onClick={() => { haptic(); setFormTarget('new'); }}>
          {t(lang, 'evaluate')}
        </button>
      </div>
      {!profileReady && (
        <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 6 }}>
          {t(lang, 'completeProfileFirst')}
        </div>
      )}

      {evals.length === 0 ? (
        profileReady && <div style={{ fontSize: 13, color: 'var(--t4)', padding: '4px 0' }}>{t(lang, 'noEvals')}</div>
      ) : evals.map(ev => (
        <div key={ev.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--sep)', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setOpenEvalId(openEvalId === ev.id ? null : ev.id)}>
            <div style={{ color: 'var(--t2)' }}>
              {formatDate(ev.date, lang)}
              <span style={{ color: 'var(--t5)', marginInlineStart: 8 }}>
                {ev.branch === '1rm'
                  ? <>{t(lang, 'liftAvg')} {ev.frozen.liftAvg ?? '—'}</>
                  : <>{t(lang, 'muscleAvg')} {ev.frozen.muscleAvg ?? '—'}</>}
              </span>
            </div>
            <span className={`badge badge-class-${ev.frozen.classification}`}>
              {classLabel(lang, ev.frozen.classification)}
            </span>
          </div>
          {openEvalId === ev.id && (
            <div style={{ marginTop: 6 }}>
              {detailRows(ev).map(([labelKey, rawText, score, levelKey]) => (
                <div key={labelKey} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '3px 0', fontSize: 12, color: 'var(--t3)' }}>
                  <span>{t(lang, labelKey)}: <strong style={{ color: 'var(--t2)' }}>{rawText}</strong></span>
                  {/* unscored rows (e.g. 1rm bodyweight) get no chip — a bare eval-chip
                      span would render invisible padded whitespace */}
                  {(score != null || levelKey != null) && (
                    <span className={scoreChipClass(score, levelKey)}>{scoreLabel(lang, score, levelKey)}</span>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {/* Legacy mass records are VIEW-ONLY (spec §3): the mass form no
                    longer exists to edit them. Delete stays for both branches. */}
                {ev.branch === '1rm' && (
                  <button className="btn-ghost" style={{ fontSize: 12 }}
                    onClick={() => setFormTarget(ev)}>{t(lang, 'edit')}</button>
                )}
                <button className="btn-ghost" style={{ fontSize: 12, color: '#EF4444' }}
                  onClick={() => { haptic(); setDeleteTarget(ev); }}>{t(lang, 'delete')}</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ─── v2.13: programs (spec §7). Gate: latest eval is 1RM with all lifts scored ─── */}
      <ProgramBlock client={client} state={state} dispatch={dispatch} lang={lang} evals={evals} />

      {formTarget && (
        <EvalForm client={client} evalRecord={formTarget === 'new' ? null : formTarget}
          dispatch={dispatch} lang={lang} onClose={() => setFormTarget(null)} />
      )}

      {/* Delete confirm — same pattern as the client delete modal */}
      {deleteTarget && (
        <Modal title={t(lang, 'deleteEval')} onClose={() => setDeleteTarget(null)}
          action={
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => setDeleteTarget(null)}>
              {t(lang, 'cancel')}
            </button>
          }>
          <div className="success-center">
            <div className="success-icon" style={{ fontSize: 40 }}>⚠️</div>
            <div className="success-name">{formatDate(deleteTarget.date, lang)} · {classLabel(lang, deleteTarget.frozen.classification)}</div>
            <div className="success-detail">{t(lang, 'deleteEvalMsg')}</div>
          </div>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', marginBottom: 8, width: '100%' }}
            onClick={() => {
              dispatch({ type: 'DELETE_EVALUATION', payload: deleteTarget.id });
              setDeleteTarget(null);
            }}>
            {t(lang, 'confirmDelete')}
          </button>
        </Modal>
      )}
    </div>
  );
}

function ProgramBlock({ client, state, dispatch, lang, evals }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const latest1rm = evals.find(ev => ev.branch === '1rm'
    && ev.frozen.scores.bench != null && ev.frozen.scores.squat != null && ev.frozen.scores.deadlift != null);
  const progs = (state.programs || [])
    .filter(p => p.clientId === client.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const latest = progs[0];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t(lang, 'programs')}</div>
        <button className="btn-sm" disabled={!latest1rm}
          onClick={() => { haptic(); setSetupOpen(true); }}>{t(lang, 'generateProgram')}</button>
      </div>
      {!latest1rm && <div style={{ fontSize: 12, color: 'var(--t4)' }}>{t(lang, 'needs1rmEval')}</div>}
      {latest ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0' }}>
          <span style={{ color: 'var(--t3)' }}>{formatDate(latest.startDate, lang)} · {latest.blocks.length} {t(lang, 'blockLabel')}</span>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setViewerOpen(true)}>{t(lang, 'viewProgram')}</button>
        </div>
      ) : latest1rm && <div style={{ fontSize: 13, color: 'var(--t4)', padding: '4px 0' }}>{t(lang, 'noPrograms')}</div>}
      {setupOpen && latest1rm && (
        <ProgramSetup client={client} evalRecord={latest1rm} dispatch={dispatch} lang={lang} onClose={() => setSetupOpen(false)} />
      )}
      {viewerOpen && latest && (
        <ProgramViewer program={latest} dispatch={dispatch} lang={lang} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
