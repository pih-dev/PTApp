import React, { useState } from 'react';
import { formatDate, SESSION_TYPES, STATUS_MAP } from '../utils';

export default function Sessions({ state }) {
  const [filter, setFilter] = useState('all');
  const sorted = [...state.sessions]
    .filter(s => filter === 'all' || s.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const getClientName = (id) => state.clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <div className="section-title" style={{ marginTop: 16 }}>📋 All Sessions ({sorted.length})</div>
      <div className="filter-row">
        {['all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : STATUS_MAP[f]?.label}
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
          return (
            <div key={session.id} className="card" style={{ borderLeft: `3px solid ${st.color}`, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getClientName(session.clientId)}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {formatDate(session.date)} · {session.time} · {session.duration}min · {st.emoji} {session.type}
                  </div>
                </div>
                <span className="badge" style={{ color: status.color, background: status.bg }}>{status.label}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
