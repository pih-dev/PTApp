import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, SESSION_TYPES, STATUS_MAP, getSessionOrdinal, FOCUS_TAGS, DURATIONS, TIMES } from '../utils';

// Editable focus tags + notes for completed sessions
function EditableFocus({ session, dispatch }) {
  const tags = FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom;
  const focus = session.focus || [];
  const toggleFocus = (tag) => {
    const updated = focus.includes(tag) ? focus.filter(t => t !== tag) : [...focus, tag];
    dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, focus: updated } });
  };
  return (
    <div style={{ marginTop: 6 }}>
      <div className="focus-row">
        {tags.map(tag => (
          <button key={tag} className={`focus-tag${focus.includes(tag) ? ' active' : ''}`}
            onClick={() => toggleFocus(tag)}>{tag}</button>
        ))}
      </div>
      <textarea className="focus-notes" rows="1" placeholder="Notes..."
        defaultValue={session.sessionNotes || ''}
        onBlur={e => {
          if (e.target.value !== (session.sessionNotes || '')) {
            dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
          }
        }}
      />
    </div>
  );
}

export default function Sessions({ state, dispatch }) {
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
      <div className="section-title" style={{ marginTop: 16 }}>📋 All Sessions ({sorted.length})</div>
      <div className="filter-row">
        {['active', 'all', 'scheduled', 'completed', 'cancelled'].map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'active' ? 'Active' : f === 'all' ? 'All' : STATUS_MAP[f]?.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div>No sessions found</div>
        </div>
      ) : (
        sorted.map(session => {
          const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
          const status = STATUS_MAP[session.status];
          const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, session.date.slice(0, 7));
          return (
            <div key={session.id} className="card" style={{ borderLeft: `3px solid ${st.color}`, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>#{monthCount}</span></div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {formatDate(session.date)} · {session.time} · {session.duration}min · {st.emoji} {session.type}
                  </div>
                </div>
                <span className="badge" style={{ color: status.color, background: status.bg }}>{status.label}</span>
              </div>
              {/* Actions for scheduled/confirmed sessions */}
              {(session.status === 'scheduled' || session.status === 'confirmed') && (
                <div className="flex-row" style={{ marginTop: 6 }}>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'completed' } })}>✅ Complete</button>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => openEdit(session)}>📝 Edit</button>
                </div>
              )}
              {/* Restore cancelled sessions */}
              {session.status === 'cancelled' && (
                <div className="flex-row" style={{ marginTop: 6 }}>
                  <button className="btn-confirm" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'scheduled' } })}>↩ Restore</button>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, status: 'completed' } })}>✅ Complete</button>
                </div>
              )}
              {/* Editable focus tags + notes for completed sessions */}
              {session.status === 'completed' && (
                <EditableFocus session={session} dispatch={dispatch} />
              )}
            </div>
          );
        })
      )}
      {/* Edit modal — change date, time, duration, type */}
      {editingSession && (
        <Modal title={`Edit — ${getClientName(editingSession.clientId)}`} onClose={() => setEditingSession(null)}
          action={<button className="btn-primary" onClick={saveEdit}>Save Changes</button>}>
          <div className="field">
            <label className="field-label">Session Type</label>
            <select className="select" value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
              {SESSION_TYPES.map(t => <option key={t.label} value={t.label}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Date</label>
            <input type="date" className="input" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Time</label>
              <select className="select" value={editForm.time} onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Duration</label>
              <select className="select" value={editForm.duration} onChange={e => setEditForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
