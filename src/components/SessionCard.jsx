import React from 'react';
import { WhatsAppIcon, EditIcon, TrashIcon } from './Icons';
import { SESSION_TYPES, getStatus, getFocusTags, haptic } from '../utils';
import SessionCountPair from './SessionCountPair';
import Plates from './Plates';
import { t } from '../i18n';

// ─── The session row, shared (v2.25 — review finding P3, scope B) ────────────
//
// One card for the Dashboard's expanded list and the Schedule day list, which
// were ~70-line near-twins drifting apart (the `focus: []` type-change bug
// lived in exactly one of the copies). Scope B on purpose: Dashboard-compact
// and Sessions.jsx stay out until this API has proven its shape.
//
// 🔴 A PURE LEAF. No modals in here — edit/cancel/restore/remind surface as
//    callbacks and the PARENT owns its own sheets, because the two parents
//    open different ones (action sheet vs booking form). The three writes that
//    are identical at both sites (type change, focus toggle, notes commit)
//    dispatch directly, so they cannot diverge again.
//
// 🔴 TYPE CHANGE PRESERVES FOCUS TAGS (Pierre, 2026-04-21): a session may mix
//    subcategories across types, so switching Strength → Cardio → Strength must
//    keep Back selected. Never add `focus: []` to the type dispatch.
export default function SessionCard({
  session, client, lang, dispatch,
  countPair,          // { auto, effective, override } from getEffectiveSessionCount
  pkg,                // optional { effective, contractSize, due } — renders the plates
  isNow,              // the accent inline-start bar — the live session and nothing else
  index = 0,          // stagger for the riseIn reveal
  dateLabel,          // optional string ("Today" / formatted date) — Dashboard shows it, Schedule's day is already selected
  onRemind, onEdit, onCancel, onRestore,
}) {
  const status = getStatus(session.status, lang, t);
  const tags = getFocusTags(session.type);
  const focus = session.focus || [];
  const toggleFocus = (tag) => {
    const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
    dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, focus: updated } });
  };
  const complete = () => {
    haptic();
    dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'completed' } });
  };

  return (
    // --i staggers the reveal; capped so row 40 doesn't wait 1.2s
    <div className={`srow${isNow ? ' is-now' : ''}`} style={{ '--i': Math.min(index, 8) }}>
      <div className="srow-head">
        <span className="srow-name">
          {client?.name || 'Unknown'}
          <SessionCountPair auto={countPair.auto} effective={countPair.effective} override={countPair.override} />
        </span>
        <span className="srow-time">{session.time}</span>
      </div>
      <div className="srow-meta">
        <span className="srow-mark">{session.duration}{t(lang, 'min')}</span>
        {/* Inline type selector — the option label carries NO emoji on purpose:
            a closed <select> prints its option's own text on the surface. */}
        <select className="inline-type-select" value={session.type} onChange={e => {
          dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
        }}>
          {SESSION_TYPES.map(stype => <option key={stype.label} value={stype.label}>{stype.label}</option>)}
        </select>
        {dateLabel && <span className="srow-date">{dateLabel}</span>}
        <span className={`badge badge-${session.status}`}>{status.label}</span>
      </div>
      {/* The package, as load. Sliding clients have no contract and get no
          plates — an empty rack would imply a package that does not exist. */}
      {pkg && (
        <div className="srow-load">
          <Plates used={pkg.effective} size={pkg.contractSize} due={pkg.due} />
          <span className="plate-count">{pkg.effective}/{pkg.contractSize}</span>
        </div>
      )}
      <div className="srow-actions">
        {(session.status === 'scheduled' || session.status === 'confirmed') && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={complete}>{t(lang, 'complete')}</button>
        )}
        {client && onRemind && (
          <button className="btn-whatsapp" style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => onRemind(session, client)}>
            <WhatsAppIcon size={14} />
            {t(lang, 'remind')}
          </button>
        )}
        {onEdit && (
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => onEdit(session)}>
            <EditIcon size={14} />
            {t(lang, 'edit')}
          </button>
        )}
        {session.status === 'cancelled'
          ? (onRestore && (
              <button className="btn-confirm" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => onRestore(session)}>{t(lang, 'restore')}</button>
            ))
          : (onCancel && (
              <button className="btn-danger-sm" onClick={() => { haptic(); onCancel(session); }}>
                <TrashIcon />
              </button>
            ))}
      </div>
      {/* Focus tags — tappable, auto-save */}
      <div className="focus-row" style={{ marginTop: 8 }}>
        {tags.map(tag => (
          <button key={tag} className={`focus-tag${focus.includes(tag) ? ' active' : ''}`}
            onClick={() => { haptic(); toggleFocus(tag); }}>{tag}</button>
        ))}
      </div>
      {/* NOTE: Do NOT add `readOnly` here. On iOS Safari, tapping a readonly
          textarea decides "no keyboard" before onFocus can run — even if onFocus
          sets readOnly=false. The collapsed/expanded behavior is handled entirely
          by the .editing CSS class, not by readOnly. The `key` forces a remount
          when a synced remote edit lands, dropping the stale DOM value. */}
      <textarea key={session.sessionNotes || ''} className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
        defaultValue={session.sessionNotes || ''}
        onFocus={e => { e.target.classList.add('editing'); }}
        onBlur={e => {
          e.target.classList.remove('editing');
          e.target.classList.toggle('has-content', e.target.value.trim() !== '');
          if (e.target.value !== (session.sessionNotes || '')) {
            dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
          }
        }}
      />
    </div>
  );
}
