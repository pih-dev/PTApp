import React, { useState } from 'react';
import { formatDate, SESSION_TYPES, STATUS_MAP, getSessionOrdinal, FOCUS_TAGS } from '../utils';

export default function Sessions({ state }) {
  const [filter, setFilter] = useState('scheduled');
  const sorted = [...state.sessions]
    .filter(s => filter === 'all' ? true : filter === 'active' ? s.status !== 'cancelled' : s.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const getClientName = (id) => state.clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <div className="section-title" style={{ marginTop: 16 }}>📋 All Sessions ({sorted.length})</div>
      <div className="filter-row">
        {['active', 'all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map(f => (
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
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>#{monthCount}</span></div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {formatDate(session.date)} · {session.time} · {session.duration}min · {st.emoji} {session.type}
                  </div>
                </div>
                <span className="badge" style={{ color: status.color, background: status.bg }}>{status.label}</span>
              </div>
              {/* Show focus tags and notes (read-only) */}
              {((session.focus && session.focus.length > 0) || session.sessionNotes) && (
                <div style={{ marginTop: 6 }}>
                  {session.focus && session.focus.length > 0 && (
                    <div className="focus-row">
                      {session.focus.map(tag => (
                        <span key={tag} className="focus-tag active readonly">{tag}</span>
                      ))}
                    </div>
                  )}
                  {session.sessionNotes && <div className="focus-display">{session.sessionNotes}</div>}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
