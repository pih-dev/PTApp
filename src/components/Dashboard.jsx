import React from 'react';
import { today, formatDate, SESSION_TYPES, STATUS_MAP } from '../utils';

export default function Dashboard({ state, setTab }) {
  const todaySessions = state.sessions.filter(s => s.date === today());
  const upcomingSessions = state.sessions
    .filter(s => s.date >= today() && s.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);
  const confirmedCount = state.sessions.filter(s => s.status === 'confirmed' && s.date >= today()).length;
  const weekSessions = state.sessions.filter(s => {
    const d = new Date(s.date + 'T00:00:00');
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7 && s.status !== 'cancelled';
  });

  const getClientName = (id) => state.clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <div className="section-title" style={{ marginTop: 16 }}>📊 Overview</div>
      <div className="stat-row">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #E8453C15, #E8453C08)', border: '1px solid #E8453C25' }}>
          <div className="stat-num">{state.clients.length}</div>
          <div className="stat-label">Clients</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3B82F615, #3B82F608)', border: '1px solid #3B82F625' }}>
          <div className="stat-num">{todaySessions.length}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B98115, #10B98108)', border: '1px solid #10B98125' }}>
          <div className="stat-num">{confirmedCount}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8B5CF615, #8B5CF608)', border: '1px solid #8B5CF625' }}>
          <div className="stat-num">{weekSessions.length}</div>
          <div className="stat-label">This Week</div>
        </div>
      </div>

      <div className="section-title">📅 Upcoming Sessions</div>
      {upcomingSessions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🏋️</div>
          <div>No upcoming sessions</div>
          <button onClick={() => setTab('schedule')} className="btn-primary mt-16" style={{ width: 'auto', display: 'inline-flex' }}>
            + Book First Session
          </button>
        </div>
      ) : (
        upcomingSessions.map(session => {
          const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
          const status = STATUS_MAP[session.status];
          return (
            <div key={session.id} className="card" style={{ borderLeft: `3px solid ${st.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="client-name">{getClientName(session.clientId)}</div>
                  <div className="meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {session.time} · {session.duration}min · {st.emoji} {session.type}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{formatDate(session.date)}</div>
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
