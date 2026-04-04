import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, SESSION_TYPES, getSessionOrdinal, FOCUS_TAGS, DURATIONS, TIMES, getStatus, haptic } from '../utils';
import { t } from '../i18n';

// Editable focus tags + notes for completed sessions
function EditableFocus({ session, dispatch, lang }) {
  const tags = FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom;
  const focus = session.focus || [];
  const toggleFocus = (tag) => {
    const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
    dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, focus: updated } });
  };
  return (
    <div style={{ marginTop: 6 }}>
      <div className="focus-row">
        {tags.map(tag => (
          <button key={tag} className={`focus-tag${focus.includes(tag) ? ' active' : ''}`}
            onClick={() => { haptic(); toggleFocus(tag); }}>{tag}</button>
        ))}
      </div>
      <textarea key={session.sessionNotes || ''} className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
        defaultValue={session.sessionNotes || ''}
        readOnly
        onFocus={e => { e.target.readOnly = false; e.target.classList.add('editing'); }}
        onBlur={e => {
          e.target.readOnly = true;
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

export default function Sessions({ state, dispatch, lang }) {
  const [filter, setFilter] = useState('scheduled');
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({ type: '', date: '', time: '', duration: 45 });
  const sorted = [...state.sessions]
    .filter(s => filter === 'all' ? true : filter === 'active' ? s.status !== 'cancelled' : s.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const getClientName = (id) => state.clients.find(c => c.id === id)?.name || 'Unknown';

  const openEdit = (session) => {
    setEditingSession(session);
    setEditForm({ type: session.type, date: session.date, time: session.time, duration: session.duration });
  };

  const saveEdit = () => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id: editingSession.id, ...editForm } });
    setEditingSession(null);
  };

  return (
    <div>
      <div className="section-title" style={{ marginTop: 16 }}>{t(lang, 'allSessions')} ({sorted.length})</div>
      <div className="filter-row">
        {['active', 'all', 'scheduled', 'completed', 'cancelled'].map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => { haptic(); setFilter(f); }}>
            {f === 'active' ? t(lang, 'active') : f === 'all' ? t(lang, 'all') : t(lang, f)}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div>{t(lang, 'noSessionsFound')}</div>
        </div>
      ) : (
        sorted.map(session => {
          const stype = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
          const status = getStatus(session.status, lang, t);
          const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, session.date.slice(0, 7));
          return (
            <div key={session.id} className="card" style={{ borderInlineStart: `3px solid ${stype.color}`, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--t5)', marginTop: 2 }}>
                    {formatDate(session.date, lang)} · {session.time} · {session.duration}{t(lang, 'min')} · {stype.emoji} {session.type}
                  </div>
                </div>
                <span className={`badge badge-${session.status}`}>{status.label}</span>
              </div>
              {/* Actions for scheduled/confirmed sessions */}
              {(session.status === 'scheduled' || session.status === 'confirmed') && (
                <div className="flex-row" style={{ marginTop: 6 }}>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'completed' } })}>{t(lang, 'complete')}</button>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => openEdit(session)}>{'📝 ' + t(lang, 'edit')}</button>
                </div>
              )}
              {/* Restore cancelled sessions */}
              {session.status === 'cancelled' && (
                <div className="flex-row" style={{ marginTop: 6 }}>
                  <button className="btn-confirm" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'scheduled' } })}>{t(lang, 'restore')}</button>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'completed' } })}>{t(lang, 'complete')}</button>
                </div>
              )}
              {/* Editable focus tags + notes for completed sessions */}
              {session.status === 'completed' && (
                <EditableFocus session={session} dispatch={dispatch} lang={lang} />
              )}
            </div>
          );
        })
      )}
      {/* Edit modal — change date, time, duration, type */}
      {editingSession && (
        <Modal title={t(lang, 'edit') + ' — ' + getClientName(editingSession.clientId)} onClose={() => setEditingSession(null)}
          action={<button className="btn-primary" onClick={saveEdit}>{t(lang, 'saveChanges')}</button>}>
          <div className="field">
            <label className="field-label">{t(lang, 'sessionType')}</label>
            <select className="select" value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
              {SESSION_TYPES.map(stype => <option key={stype.label} value={stype.label}>{stype.emoji} {stype.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'date')}</label>
            <input type="date" className="input" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'time')}</label>
              <select className="select" value={editForm.time} onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))}>
                {TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'duration')}</label>
              <select className="select" value={editForm.duration} onChange={e => setEditForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} {t(lang, 'min')}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
