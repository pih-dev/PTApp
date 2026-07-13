import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, haptic } from '../utils';
import { t } from '../i18n';
import { bankForBucket } from '../exerciseBank';

const methodLabel = (lang, id) => t(lang, 'method' + id.charAt(0).toUpperCase() + id.slice(1));
const objLabel = (lang, o) => t(lang, 'obj' + o.charAt(0).toUpperCase() + o.slice(1));
const restText = (sec) => sec >= 120 ? `${Math.round(sec / 60)} min` : `${sec}s`;

// Drill-down viewer (spec §7): blocks → days → exercises. Swap is the ONLY edit;
// it re-dispatches the FULL record (EDIT_PROGRAM contract). No sets/reps editing
// by design — the trainer improvises by performance (Elie).
export default function ProgramViewer({ program, dispatch, lang, onClose }) {
  const [openBlock, setOpenBlock] = useState(0);
  const [swap, setSwap] = useState(null);   // { blockIdx, dayKey:'days'|'daysAlt', dayIdx, exIdx }

  const doSwap = (replacementName) => {
    const bank = { ...swap };
    const blocks = program.blocks.map((b, bi) => {
      if (bi !== bank.blockIdx) return b;
      const list = b[bank.dayKey].map((d, di) => {
        if (di !== bank.dayIdx) return d;
        const exercises = d.exercises.map((e, ei) => {
          if (ei !== bank.exIdx) return e;
          const repl = bankForBucket(e.bucket).find(x => x.name === replacementName);
          // keep sets/reps/pct/rest/kg — the slot's prescription is unchanged, only the movement swaps
          return { ...e, name: repl.name, type: repl.type, advanced: repl.advanced };
        });
        return { ...d, exercises };
      });
      return { ...b, [bank.dayKey]: list };
    });
    dispatch({ type: 'EDIT_PROGRAM', payload: { ...program, blocks } });
    setSwap(null);
  };

  const swapTarget = swap && program.blocks[swap.blockIdx][swap.dayKey][swap.dayIdx].exercises[swap.exIdx];
  const dayRows = (b, bi, dayKey) => (b[dayKey] || []).map((day, di) => (
    <div key={dayKey + di} style={{ marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
        {day.slot === 'circuit' ? `${t(lang, 'roundsLabel')} ×4` : day.slot.toUpperCase()}
      </div>
      {day.exercises.map((e, ei) => (
        <div key={ei} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 0', fontSize: 12, borderBottom: '1px solid var(--sep)' }}>
          <span style={{ color: 'var(--t2)' }}>
            {e.name}
            <span style={{ color: 'var(--t5)', marginInlineStart: 6 }}>
              {e.sets}×{e.repsText} · {e.pctText}{e.setKg ? ` · ${e.setKg.join('/')} kg` : ''} · {restText(e.restSec)}
            </span>
          </span>
          <button className="btn-ghost" style={{ fontSize: 11 }}
            onClick={() => { haptic(); setSwap({ blockIdx: bi, dayKey, dayIdx: di, exIdx: ei }); }}>
            {t(lang, 'swapExercise')}
          </button>
        </div>
      ))}
    </div>
  ));

  return (
    <Modal title={`${t(lang, 'programs')} · ${formatDate(program.startDate, lang)}`} onClose={onClose}>
      {program.blocks.map((b, bi) => (
        <div key={bi} style={{ padding: '8px 0', borderBottom: '1px solid var(--sep)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontSize: 14 }}
            onClick={() => setOpenBlock(openBlock === bi ? null : bi)}>
            <span style={{ fontWeight: 600 }}>{t(lang, 'blockLabel')} {bi + 1} · {methodLabel(lang, b.methodId)}</span>
            <span style={{ color: 'var(--t4)', fontSize: 12 }}>{objLabel(lang, b.objective)} · {formatDate(b.startDate, lang)}</span>
          </div>
          {openBlock === bi && (
            <div>
              {b.daysAlt && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>{t(lang, 'circuitWeeksNote')}</div>}
              {dayRows(b, bi, 'days')}
              {b.daysAlt && dayRows(b, bi, 'daysAlt')}
            </div>
          )}
        </div>
      ))}

      {swap && swapTarget && (
        <Modal title={t(lang, 'swapExercise')} onClose={() => setSwap(null)}>
          {bankForBucket(swapTarget.bucket)
            .filter(x => x.type === swapTarget.type && x.name !== swapTarget.name)
            .map(x => (
              <button key={x.name} className="btn-ghost" style={{ display: 'block', width: '100%', textAlign: 'start', padding: '10px 4px', fontSize: 13 }}
                onClick={() => doSwap(x.name)}>{x.name}</button>
            ))}
        </Modal>
      )}
    </Modal>
  );
}
