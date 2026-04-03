import React, { useState } from 'react';
import Modal from './Modal';
import { today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendReminderWhatsApp, getSessionOrdinal, timeToMinutes, localDateStr, getStatus } from '../utils';
import { t } from '../i18n';

export default function Dashboard({ state, dispatch, setTab, lang }) {
  const [activeSession, setActiveSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);
  const [expanded, setExpanded] = useState(true); // true = full cards, false = compact list
  const [form, setForm] = useState({ clientId: '', type: 'Strength', date: today(), time: '09:00', duration: 45 });

  const todaySessions = state.sessions
    .filter(s => s.date === today() && s.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  // Highlight all sessions currently in progress (started but not yet ended)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isNowSession = (s) => {
    const start = timeToMinutes(s.time);
    return nowMinutes >= start && nowMinutes < start + (s.duration || 45);
  };
  const upcomingSessions = state.sessions
    .filter(s => s.date >= today() && s.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);
  // Compare date strings to avoid fractional day math errors near midnight
  const weekSessions = state.sessions.filter(s => {
    const todayStr = today();
    const weekEnd = new Date(new Date(todayStr + 'T00:00:00').getTime() + 7 * 86400000);
    return s.date >= todayStr && s.date <= localDateStr(weekEnd) && s.status !== 'cancelled';
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
    if (activeSession) setActiveSession(null);
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
      <div className="section-title" style={{ marginTop: 16 }}>{t(lang, 'overview')}</div>
      <div className="stat-row">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366F115, #6366F108)', border: '1px solid #6366F125' }}>
          <div className="stat-num">{state.clients.length}</div>
          <div className="stat-label">{t(lang, 'statClients')}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3B82F615, #3B82F608)', border: '1px solid #3B82F625' }}>
          <div className="stat-num">{todaySessions.length}</div>
          <div className="stat-label">{t(lang, 'statToday')}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8B5CF615, #8B5CF608)', border: '1px solid #8B5CF625' }}>
          <div className="stat-num">{weekSessions.length}</div>
          <div className="stat-label">{t(lang, 'statWeek')}</div>
        </div>
      </div>

      <div className="section-title section-header">
        <span>{expanded ? `📅 ${t(lang, 'todaySessions')} (${todaySessions.length})` : '📅 ' + t(lang, 'upcomingSessions')}</span>
        <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}
          onClick={() => setExpanded(e => !e)}>
          {expanded ? t(lang, 'compact') : t(lang, 'expanded')}
        </button>
      </div>

      {/* Expanded view: today's sessions with full functionality */}
      {expanded ? (
        todaySessions.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏋️</div>
            <div>{t(lang, 'noSessionsToday')}</div>
            <button onClick={() => setTab('schedule')} className="btn-primary mt-16" style={{ width: 'auto', display: 'inline-flex' }}>
              {t(lang, 'bookSession')}
            </button>
          </div>
        ) : (
          todaySessions.map((session, idx) => {
            const st = SESSION_TYPES.find(st => st.label === session.type) || SESSION_TYPES[5];
            const status = getStatus(session.status, lang, t);
            const client = state.clients.find(c => c.id === session.clientId);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, session.date.slice(0, 7));
            const tags = FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom;
            const focus = session.focus || [];
            const isNext = isNowSession(session);
            const toggleFocus = (tag) => {
              const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
              dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, focus: updated } });
            };
            return (
              <div key={session.id}
                className={`card${isNext ? ' card-now' : ''}`} style={{ borderInlineStart: `3px solid ${isNext ? '#2563EB' : st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                    <div className="meta">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {session.time} · {session.duration}{t(lang, 'min')} ·{' '}
                      {/* Inline type selector — keep focus tags so switching back preserves selections */}
                      <select className="inline-type-select" value={session.type} onChange={e => {
                        dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
                      }}>
                        {SESSION_TYPES.map(st => <option key={st.label} value={st.label}>{st.emoji} {st.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <span className={`badge badge-${session.status}`}>{status.label}</span>
                </div>
                <div className="flex-row">
                  {(session.status === 'scheduled' || session.status === 'confirmed') && (
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => updateStatus(session.id, 'completed')}>{t(lang, 'complete')}</button>
                  )}
                  {client && (
                    <button className="btn-whatsapp" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => sendReminderWhatsApp(client, session, state.messageTemplates, lang)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      {t(lang, 'remind')}
                    </button>
                  )}
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => { setActiveSession(session); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {t(lang, 'edit')}
                  </button>
                  {session.status !== 'cancelled' && (
                    <button className="btn-danger-sm" onClick={() => cancelSession(session)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
                {/* Focus tags — tappable, auto-save */}
                <div className="focus-row" style={{ marginTop: 8 }}>
                  {tags.map(tag => (
                    <button key={tag} className={`focus-tag${focus.includes(tag) ? ' active' : ''}`}
                      onClick={() => toggleFocus(tag)}>{tag}</button>
                  ))}
                </div>
                <textarea className="focus-notes" rows="1" placeholder={t(lang, 'notesPlaceholder')}
                  defaultValue={session.sessionNotes || ''}
                  onBlur={e => {
                    if (e.target.value !== (session.sessionNotes || '')) {
                      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
                    }
                  }}
                />
              </div>
            );
          })
        )
      ) : (
        /* Compact view: upcoming sessions, tap for action sheet */
        upcomingSessions.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏋️</div>
            <div>{t(lang, 'noUpcoming')}</div>
            <button onClick={() => setTab('schedule')} className="btn-primary mt-16" style={{ width: 'auto', display: 'inline-flex' }}>
              {t(lang, 'bookFirst')}
            </button>
          </div>
        ) : (
          upcomingSessions.map(session => {
            const st = SESSION_TYPES.find(st => st.label === session.type) || SESSION_TYPES[5];
            const status = getStatus(session.status, lang, t);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, session.date.slice(0, 7));
            return (
              <div key={session.id} className="card card-tap" style={{ borderInlineStart: `3px solid ${st.color}`, cursor: 'pointer' }}
                onClick={() => openActions(session)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                    <div className="meta">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {session.time} · {session.duration}{t(lang, 'min')} · {st.emoji} {session.type}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>{formatDate(session.date, lang)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${session.status}`}>{status.label}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t4)' }}><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            );
          })
        )
      )}

      {/* Action Sheet Modal */}
      {activeSession && (() => {
        const session = activeSession;
        const st = SESSION_TYPES.find(st => st.label === session.type) || SESSION_TYPES[5];
        const status = getStatus(session.status, lang, t);
        const client = state.clients.find(c => c.id === session.clientId);
        return (
          <Modal title={getClientName(session.clientId)} onClose={() => setActiveSession(null)}
            action={
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15, color: '#EF4444' }}
                onClick={() => cancelSession(session)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {t(lang, 'cancelSession')}
              </button>
            }>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <span className={`badge badge-${session.status}`} style={{ fontSize: 14, padding: '6px 14px' }}>{status.label}</span>
              <div style={{ marginTop: 12, color: 'var(--t3)', fontSize: 15 }}>
                {st.emoji} {session.type} · {session.duration}{t(lang, 'min')}
              </div>
              <div style={{ marginTop: 4, color: 'var(--t3)', fontSize: 15 }}>
                {formatDateLong(session.date, lang)} at {session.time}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(session.status === 'scheduled' || session.status === 'confirmed') && (
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                  onClick={() => updateStatus(session.id, 'completed')}>
                  {t(lang, 'complete')}
                </button>
              )}
              {client && (
                <button className="btn-whatsapp" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                  onClick={() => { sendReminderWhatsApp(client, session, state.messageTemplates, lang); setActiveSession(null); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {t(lang, 'remind')}
                </button>
              )}
              <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                onClick={openEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                {t(lang, 'editSession')}
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Edit Modal */}
      {editingSession && (
        <Modal title={t(lang, 'editSession')} onClose={() => setEditingSession(null)}
          action={<button className="btn-primary" onClick={saveSession}>{t(lang, 'saveChanges')}</button>}>
          <div className="field">
            <label className="field-label">{t(lang, 'client')}</label>
            <select className="select" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
              <option value="">{t(lang, 'selectClient')}</option>
              {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'sessionType')}</label>
            <div className="flex-row">
              {SESSION_TYPES.map(st => (
                <button key={st.label}
                  className={`type-btn${form.type === st.label ? ' selected' : ''}`}
                  style={form.type === st.label ? { borderColor: st.color, background: `${st.color}20`, color: st.color } : {}}
                  onClick={() => setForm(p => ({ ...p, type: st.label }))}>
                  {st.emoji} {st.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'date')}</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'time')}</label>
              <select className="select" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}>
                {TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'duration')}</label>
              <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} {t(lang, 'min')}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Prompt — Count or Forgive */}
      {cancelPrompt && (
        <Modal title={t(lang, 'cancelSession')} onClose={() => setCancelPrompt(null)}
          action={
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => setCancelPrompt(null)}>
              {t(lang, 'keepSession')}
            </button>
          }>
          <div className="success-center">
            <div className="success-icon" style={{ fontSize: 40 }}>❌</div>
            <div className="success-name">{getClientName(cancelPrompt.clientId)}</div>
            <div className="success-detail">{formatDate(cancelPrompt.date, lang)} at {cancelPrompt.time}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
              onClick={() => confirmCancel(true)}>
              {t(lang, 'countNoShow')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => confirmCancel(false)}>
              {t(lang, 'forgive')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
