import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, haptic } from '../utils';
import { t } from '../i18n';
import MovementSheet from './MovementSheet';
import { bankForBucket } from '../exerciseBank';
import { ANCHORS } from '../programKernel';
import { exNameAr } from '../exerciseNamesAr';

const methodLabel = (lang, id) => t(lang, 'method' + id.charAt(0).toUpperCase() + id.slice(1));
const objLabel = (lang, o) => t(lang, 'obj' + o.charAt(0).toUpperCase() + o.slice(1));
const restText = (sec) => sec >= 120 ? `${Math.round(sec / 60)} min` : `${sec}s`;

// v2.14.2 (Elie): Arabic mode shows the movement in Arabic with the English
// original in small faded text — Lebanese gyms know many moves by their
// English names, and the pairing lets Elie spot translations to correct.
// Missing map entry → English exactly as before, never blank. The English
// snippet needs the same ltr+isolate bidi treatment as the prescription
// numbers (I3) so Latin text doesn't reorder inside the RTL row.
const exLabel = (lang, name) => {
  const ar = lang === 'ar' ? exNameAr(name) : null;
  if (!ar) return name;
  return (
    <>
      {ar}
      <span style={{ fontSize: 10, color: 'var(--chalk-faint)', direction: 'ltr', unicodeBidi: 'isolate', marginInline: 6 }}>
        {name}
      </span>
    </>
  );
};

// Drill-down viewer (spec §7): blocks → days → exercises. Swap is the ONLY edit;
// it re-dispatches the FULL record (EDIT_PROGRAM contract). No sets/reps editing
// by design — the trainer improvises by performance (Elie).
export default function ProgramViewer({ program, dispatch, lang, onClose }) {
  const [openBlock, setOpenBlock] = useState(0);
  const [movement, setMovement] = useState(null);  // v2.21: the movement sheet, opened from a name
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
      <div className="subbar" style={{ margin: '12px 0 4px', fontSize: 11 }}>
        {/* I1: localized day headers (push/pull/legs) — raw .toUpperCase() showed English in AR mode.
            Multi-day (2026-07-14): rep-2 days render "Push 2" — old records lack `rep`, so they
            fall through unchanged. Slot words stay English in AR (Elie E3). */}
        {day.slot === 'circuit' ? `${t(lang, 'roundsLabel')} ×4`
          : t(lang, 'slot' + day.slot.charAt(0).toUpperCase() + day.slot.slice(1)) + (day.rep === 2 ? ' 2' : '')}
      </div>
      {day.exercises.map((e, ei) => (
        /* v2.20: the exercise row was a single wrapping line with a two-word SWAP
           EXERCISE button eating the right third — the prescription and the button
           both wrapped and the movement name stopped being findable. Name on its
           own line, prescription in mono under it, swap as a one-word target. */
        <div key={ei} className="exrow">
          <div className="exrow-head">
            {/* v2.21 (B1): the movement name is the way IN. It was a dead end —
                340 movements with Arabic for all of them sat behind it. */}
            <button className="exrow-name mv-tap" onClick={() => { haptic(); setMovement(e.name); }}>
              {exLabel(lang, e.name)}
            </button>
            {/* Anchors (bench/squat/deadlift) are un-swappable — their kg comes from the
                eval 1RM and a swap would carry deadlift kilos onto the replacement
                (spec §6: anchors appear in every block; setKg only exists on them). */}
            {!e.setKg && (
              <button className="btn-ghost exrow-swap"
                onClick={() => { haptic(); setSwap({ blockIdx: bi, dayKey, dayIdx: di, exIdx: ei }); }}>
                {t(lang, 'swap')}
              </button>
            )}
          </div>
          {/* I3: mixed digits/kg/min inside an RTL paragraph reorder without bidi
              isolation — force LTR + isolate so the prescription reads correctly in AR */}
          <div className="exrow-rx" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
            {e.sets}×{e.repsText} · {e.pctText}{e.setKg ? ` · ${e.setKg.join('/')} kg` : ''} · {restText(e.restSec)}
          </div>
        </div>
      ))}
    </div>
  ));

  return (
    <Modal title={`${t(lang, 'programs')} · ${formatDate(program.startDate, lang)}`} onClose={onClose}>
      {program.blocks.map((b, bi) => (
        <div key={bi} className="lrow" style={{ display: 'block' }}>
          {/* I2: 12px vertical padding keeps this tappable row ≥44px (iOS target size).
              The meta used to run off the right edge on a narrow phone — it wraps
              under the label now instead of being clipped. */}
          <div className="blockhead" onClick={() => setOpenBlock(openBlock === bi ? null : bi)}>
            <span className="blockhead-label">{t(lang, 'blockLabel')} {bi + 1} · {methodLabel(lang, b.methodId)}</span>
            <span className="blockhead-meta num">{objLabel(lang, b.objective)} · {formatDate(b.startDate, lang)}</span>
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

      {movement && <MovementSheet name={movement} lang={lang} onClose={() => setMovement(null)} />}

      {swap && swapTarget && (
        <Modal title={t(lang, 'swapExercise')} onClose={() => setSwap(null)}>
          {/* v2.46 (review K1): the picker must honor the kernel's own pool rules.
              (a) exclude every name ALREADY in this day — offering them created exact
              within-day duplicates one tap away (Elie's duplicate report, 2026-08-24);
              (b) exclude Deadlift — it is the Pull-day anchor ONLY (rules v2), and the
              Legs bucket offered it as an accessory, programming it twice a week. */}
          {(() => {
            const dayNames = new Set(
              program.blocks[swap.blockIdx][swap.dayKey][swap.dayIdx].exercises.map(e => e.name));
            const picks = bankForBucket(swapTarget.bucket)
              .filter(x => x.type === swapTarget.type && !dayNames.has(x.name)
                && x.name !== ANCHORS.pull.name);
            // Small buckets can filter down to nothing (Rear Delts has 4 same-type
            // entries and a day may hold 3) — an empty sheet reads as broken.
            if (picks.length === 0) {
              return <div style={{ color: 'var(--t4)', fontSize: 13, padding: '12px 4px' }}>
                {t(lang, 'noSwapAlternatives')}
              </div>;
            }
            return picks.map(x => (
              <button key={x.name} className="exrow-pick"
                onClick={() => doSwap(x.name)}>{exLabel(lang, x.name)}</button>
            ));
          })()}
        </Modal>
      )}
    </Modal>
  );
}
