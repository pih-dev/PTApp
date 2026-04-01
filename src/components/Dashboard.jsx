import React, { useState } from 'react';
import Modal from './Modal';
import { today, formatDate, formatDateLong, SESSION_TYPES, STATUS_MAP, TIMES, DURATIONS, sendReminderWhatsApp, getMonthlySessionCount } from '../utils';

export default function Dashboard({ state, dispatch, setTab }) {
  const [activeSession, setActiveSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);
  const [form, setForm] = useState({ clientId: '', type: 'Strength', date: today(), time: '09:00', duration: 45 });

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

  const openActions = (session) => {
    setActiveSession(session);
  };

  const openEdit = () => {
    const session = activeSession;
    setForm({ clientId: session.clientId, type: session.type, date: session.date, time: session.time, duration: session.duration });
    setEditingSession(session);
    setActiveSession(null);
  };

  const saveSession = () => {
    if (!form.clientId || !editingSession) return;
    dispatch({ type: 'UPDATE_SESSION', payload: { id: editingSession.id, ...form } });
    setEditingSession(null);
  };

  const updateStatus = (id, status) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id, status } });
    setActiveSession(null);
  };

  const cancelSession = (session) => {
    setActiveSession(null);
    setCancelPrompt(session);
  };
  const confirmCancel = (counted) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id: cancelPrompt.id, status: 'cancelled', cancelCounted: counted } });
    setCancelPrompt(null);
  };

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
          const monthCount = getMonthlySessionCount(state.sessions, session.clientId, session.date.slice(0, 7));
          return (
            <div key={session.id} className="card card-tap" style={{ borderLeft: `3px solid ${st.color}`, cursor: 'pointer' }}
              onClick={() => openActions(session)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>#{monthCount}</span></div>
                  <div className="meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {session.time} · {session.duration}min · {st.emoji} {session.type}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{formatDate(session.date)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ color: status.color, background: status.bg }}>{status.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Action Sheet Modal */}
      {activeSession && (() => {
        const session = activeSession;
        const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
        const status = STATUS_MAP[session.status];
        const client = state.clients.find(c => c.id === session.clientId);
        return (
          <Modal title={getClientName(session.clientId)} onClose={() => setActiveSession(null)}
            action={
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15, color: '#E8453C' }}
                onClick={() => cancelSession(session)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Cancel Session
              </button>
            }>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <span className="badge" style={{ color: status.color, background: status.bg, fontSize: 14, padding: '6px 14px' }}>{status.label}</span>
              <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
                {st.emoji} {session.type} · {session.duration}min
              </div>
              <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
                {formatDateLong(session.date)} at {session.time}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {session.status === 'scheduled' && (
                <button className="btn-confirm" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                  onClick={() => updateStatus(session.id, 'confirmed')}>
                  ✓ Confirm
                </button>
              )}
              {(session.status === 'scheduled' || session.status === 'confirmed') && (
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                  onClick={() => updateStatus(session.id, 'completed')}>
                  ✅ Complete
                </button>
              )}
              {client && (
                <button className="btn-whatsapp" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                  onClick={() => { sendReminderWhatsApp(client, session); setActiveSession(null); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Send Reminder
                </button>
              )}
              <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                onClick={openEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Session
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Edit Modal */}
      {editingSession && (
        <Modal title="Edit Session" onClose={() => setEditingSession(null)}
          action={<button className="btn-primary" onClick={saveSession}>Save Changes</button>}>
          <div className="field">
            <label className="field-label">Client</label>
            <select className="select" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
              <option value="">Select a client...</option>
              {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Session Type</label>
            <div className="flex-row">
              {SESSION_TYPES.map(t => (
                <button key={t.label}
                  className={`type-btn${form.type === t.label ? ' selected' : ''}`}
                  style={form.type === t.label ? { borderColor: t.color, background: `${t.color}20`, color: t.color } : {}}
                  onClick={() => setForm(p => ({ ...p, type: t.label }))}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Time</label>
              <select className="select" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Duration</label>
              <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Prompt — Count or Forgive */}
      {cancelPrompt && (
        <Modal title="Cancel Session" onClose={() => setCancelPrompt(null)}
          action={
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => setCancelPrompt(null)}>
              Keep Session
            </button>
          }>
          <div className="success-center">
            <div className="success-icon" style={{ fontSize: 40 }}>❌</div>
            <div className="success-name">{getClientName(cancelPrompt.clientId)}</div>
            <div className="success-detail">{formatDate(cancelPrompt.date)} at {cancelPrompt.time}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
              onClick={() => confirmCancel(true)}>
              Count (No-show / Late cancel)
            </button>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => confirmCancel(false)}>
              Forgive (Legitimate cancel)
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
