import React from 'react';
import Modal from './Modal';
import { EXERCISES, MUSCLE_GROUPS } from '../exerciseBank';
import { exNameAr } from '../exerciseNamesAr';
import { t, muscleLabel } from '../i18n';
import Figure from './Figure';

// ─── The movement sheet (v2.21, feature B1) ──────────────────────────────────
//
// WHY THIS EXISTS. 340 movements have been sitting in `exerciseBank.js` since
// v2.13 with Arabic names for every one of them, and a movement name in a
// program was a DEAD END — the PT could read "Reverse-Grip Barbell Curl" and had
// nowhere to tap. This is the sheet a name opens: what it works, what kind of
// movement it is, which day it belongs to.
//
// 🔴 IT SHOWS ONLY WHAT THE BANK KNOWS. No invented cues, no rep advice, no
//    "tips" — the data is name / muscles / primary / type / slot / advanced, and
//    everything on this sheet comes from one of those fields. The moment it
//    starts carrying coaching text, that text needs an owner, a language pair
//    and a review process, and none of those exist. Elie is the source of
//    coaching content, not this component.
//
// 🔴 THE FIGURE ARRIVED IN v2.22 (B2) and it is the ONE exception to the rule
//    above — because it is not invented. `<Figure>` renders only for the six
//    movements in src/figures/poses.js and returns null for the other 334, so a
//    sheet without one is exactly the sheet that shipped in v2.21. The cues it
//    carries come from src/figureText.js, which is versioned, per-movement and
//    flagged `reviewed: false` until Elie has read it — an owner and a review
//    process, which is precisely what the rule above was waiting for.

// The bank stores the raw English name; Arabic is a lookup that can miss (a new
// bank version may ship before its translations). Show BOTH when they differ,
// with the English small — that is also how Elie spots entries to correct.
export default function MovementSheet({ name, lang, onClose }) {
  const ex = EXERCISES.find(e => e.name === name);
  const ar = exNameAr(name);
  const isAr = lang === 'ar';
  // The sheet opens from a name, and a name always comes from the bank — but a
  // frozen program record can carry a name a LATER bank version dropped, so a
  // miss is possible and must not crash the sheet the PT tapped mid-session.
  const title = isAr && ar ? ar : name;
  const sub = isAr && ar ? name : (ar || null);

  return (
    <Modal title={title} onClose={onClose}>
      {sub && (
        <div className="mv-sub" style={{ direction: isAr ? 'ltr' : 'rtl', unicodeBidi: 'isolate' }}>
          {sub}
        </div>
      )}

      {!ex ? (
        // Not in the current bank — say so plainly rather than rendering an
        // empty sheet the PT would read as a bug.
        <div className="empty" style={{ padding: '32px 8px' }}>
          <div className="empty-line">{t(lang, 'movementNotInBank')}</div>
        </div>
      ) : (
        <>
          {/* The figure leads: a lifter reading a movement mid-session wants
              to see the shape before they read its classification. */}
          <Figure name={ex.name} lang={lang} />

          <div className="subbar">{t(lang, 'muscles')}</div>
          <div className="mv-muscles">
            {/* The primary muscle leads and is marked — it is what the movement
                is FOR; the rest are what it also touches. */}
            <span className="focus-tag active">{muscleLabel(lang, ex.primary)}</span>
            {ex.muscles.filter(m => m !== ex.primary).map(m => (
              <span key={m} className="focus-tag">{muscleLabel(lang, m)}</span>
            ))}
          </div>

          <div className="subbar">{t(lang, 'movementFacts')}</div>
          <div className="lrow">
            <span className="mv-key">{t(lang, 'movementType')}</span>
            <span className="mv-val">{t(lang, ex.type === 'compound' ? 'typeCompound' : 'typeIsolation')}</span>
          </div>
          {ex.slot && (
            <div className="lrow">
              <span className="mv-key">{t(lang, 'daySlot')}</span>
              <span className="mv-val">{t(lang, 'slot' + ex.slot.charAt(0).toUpperCase() + ex.slot.slice(1))}</span>
            </div>
          )}
          {ex.slot && MUSCLE_GROUPS[ex.slot] && (
            <div className="lrow">
              <span className="mv-key">{t(lang, 'dayMajor')}</span>
              <span className="mv-val">{muscleLabel(lang, MUSCLE_GROUPS[ex.slot].major)}</span>
            </div>
          )}
          {ex.advanced && (
            <div className="lrow">
              <span className="mv-key">{t(lang, 'level')}</span>
              {/* Advanced is a WARNING, not a badge of honour: it is the flag
                  that decides whether the generator may hand this to a beginner. */}
              <span className="mv-val" style={{ color: 'var(--warn)' }}>{t(lang, 'advancedMovement')}</span>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
