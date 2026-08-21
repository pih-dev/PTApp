import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import MovementSheet from './MovementSheet';
import { EXERCISES } from '../exerciseBank';
import { exNameAr } from '../exerciseNamesAr';
import { haptic, normaliseSearch } from '../utils';
import { t, muscleLabel } from '../i18n';

// ─── The movement library (v2.21, feature B1) ────────────────────────────────
//
// The COLD path: browse or search all 340 movements. The hot path is a movement
// name inside a program, which opens the same `MovementSheet` directly.
//
// 🔴 SEARCH MUST WORK IN BOTH SCRIPTS FROM ONE BOX. The PT types Arabic on an
//    Arabic keyboard and English on an English one, and he should not have to
//    tell the app which. So every entry is indexed on BOTH its English name and
//    its Arabic name, plus its muscles, and the query is normalised the same way
//    as the index.
//
// 🔴 ARABIC NORMALISATION IS NOT OPTIONAL. Typed Arabic differs from written
//    Arabic in ways that are invisible on screen and fatal to `includes()`:
//    diacritics, tatweel (ـ), and the alef/ya/ta-marbuta variants. Without
//    folding them, searching "كيرل" misses "كيرْل" and the feature looks broken
//    for the half of the audience it was built for.
// The fold itself lives in utils as `normaliseSearch` so `sanity-movement-library`
// can exercise it for real — see the 🔴 note there.
const normalise = normaliseSearch;

// Built once at module load: 340 entries × a few string ops is not worth
// recomputing on every keystroke, and the bank is frozen at build time.
const INDEX = EXERCISES.map(e => {
  const ar = exNameAr(e.name);
  return {
    ex: e,
    ar,
    hay: normalise([e.name, ar, e.primary, ...e.muscles].filter(Boolean).join(' ')),
  };
});

const SLOTS = ['all', 'push', 'pull', 'legs'];

export default function MovementLibrary({ lang, onClose }) {
  const [q, setQ] = useState('');
  const [slot, setSlot] = useState('all');
  const [open, setOpen] = useState(null);   // the movement name whose sheet is open
  const isAr = lang === 'ar';

  const rows = useMemo(() => {
    const nq = normalise(q);
    return INDEX.filter(r =>
      (slot === 'all' || r.ex.slot === slot) &&
      (!nq || r.hay.includes(nq)));
  }, [q, slot]);

  return (
    <Modal title={t(lang, 'movementLibrary')} onClose={onClose}>
      <input className="input" value={q} onChange={e => setQ(e.target.value)}
        placeholder={t(lang, 'searchMovements')} />

      <div className="filter-row" style={{ marginTop: 12 }}>
        {SLOTS.map(s => (
          <button key={s} className={`filter-btn${slot === s ? ' active' : ''}`}
            onClick={() => { haptic(); setSlot(s); }}>
            {s === 'all' ? t(lang, 'filterAll') : t(lang, 'slot' + s.charAt(0).toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>

      <div className="subbar">
        <span>{t(lang, 'movementsCount')}</span>
        <span className="num">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty" style={{ padding: '32px 8px' }}>
          <div className="empty-line">{t(lang, 'noMovementsFound')}</div>
        </div>
      ) : rows.map(({ ex, ar }) => (
        <button key={ex.name} className="mv-row" onClick={() => { haptic(); setOpen(ex.name); }}>
          <span className="mv-row-name">
            {isAr && ar ? ar : ex.name}
            {/* The other script, small — the same treatment the program viewer
                uses, and the reason Elie can spot a translation to correct. */}
            {(isAr ? ex.name : ar) && (
              <span className="mv-row-alt" style={{ direction: isAr ? 'ltr' : 'rtl', unicodeBidi: 'isolate' }}>
                {isAr ? ex.name : ar}
              </span>
            )}
          </span>
          <span className="mv-row-muscle">{muscleLabel(lang, ex.primary)}</span>
        </button>
      ))}

      {open && <MovementSheet name={open} lang={lang} onClose={() => setOpen(null)} />}
    </Modal>
  );
}
