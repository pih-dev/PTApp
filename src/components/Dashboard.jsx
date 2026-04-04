import React, { useState } from 'react';
import Modal from './Modal';
import CancelPrompt from './CancelPrompt';
import { WhatsAppIcon, EditIcon, TrashIcon, ClockIcon, ChevronIcon } from './Icons';
import { today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendReminderWhatsApp, getSessionOrdinal, timeToMinutes, localDateStr, getStatus, haptic } from '../utils';
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

  return (
    <div>
      <div className="section-title" style={{ marginTop: 16 }}>{t(lang, 'overview')}</div>
      <div className="stat-row">
        <div className="stat-card stat-clients">
          <div className="stat-num">{state.clients.length}</div>
          <div className="stat-label">{t(lang, 'statClients')}</div>
        </div>
        <div className="stat-card stat-today">
          <div className="stat-num">{todaySessions.length}</div>
          <div className="stat-label">{t(lang, 'statToday')}</div>
        </div>
        <div className="stat-card stat-week">
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
            const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
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
                className={`card${isNext ? ' card-now' : ''}`} style={{ borderInlineStart: `3px solid ${isNext ? '#F59E0B' : st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                    <div className="meta">
                      <ClockIcon />
                      {session.time} · {session.duration}{t(lang, 'min')} ·{' '}
                      {/* Inline type selector — keep focus tags so switching back preserves selections */}
                      <select className="inline-type-select" value={session.type} onChange={e => {
                        dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
                      }}>
                        {SESSION_TYPES.map(stype => <option key={stype.label} value={stype.label}>{stype.emoji} {stype.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <span className={`badge badge-${session.status}`}>{status.label}</span>
                </div>
                <div className="flex-row">
                  {(session.status === 'scheduled' || session.status === 'confirmed') && (
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => { haptic(); updateStatus(session.id, 'completed'); }}>{t(lang, 'complete')}</button>
                  )}
                  {client && (
                    <button className="btn-whatsapp" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => sendReminderWhatsApp(client, session, state.messageTemplates, lang, state.sessions)}>
                      <WhatsAppIcon size={14} />
                      {t(lang, 'remind')}
                    </button>
                  )}
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => { setActiveSession(session); }}>
                    <EditIcon size={14} />
                    {t(lang, 'edit')}
                  </button>
                  {session.status !== 'cancelled' && (
                    <button className="btn-danger-sm" onClick={() => { haptic(); cancelSession(session); }}>
                      <TrashIcon />
                    </button>
                  )}
                </div>
                {/* Focus tags — tappable, auto-save */}
                <div className="focus-row" style={{ marginTop: 8 }}>
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
            const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
            const status = getStatus(session.status, lang, t);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, session.date.slice(0, 7));
            return (
              <div key={session.id} className="card card-tap" style={{ borderInlineStart: `3px solid ${st.color}`, cursor: 'pointer' }}
                onClick={() => setActiveSession(session)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                    <div className="meta">
                      <ClockIcon />
                      {session.time} · {session.duration}{t(lang, 'min')} · {st.emoji} {session.type}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>{formatDate(session.date, lang)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${session.status}`}>{status.label}</span>
                    <ChevronIcon size={16} style={{ color: 'var(--t4)' }} />
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
        const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
        const status = getStatus(session.status, lang, t);
        const client = state.clients.find(c => c.id === session.clientId);
        return (
          <Modal title={getClientName(session.clientId)} onClose={() => setActiveSession(null)}
            action={
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15, color: '#EF4444' }}
                onClick={() => cancelSession(session)}>
                <TrashIcon />
                {t(lang, 'cancelSession')}
              </button>
            }>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <span className={`badge badge-${session.status}`} style={{ fontSize: 14, padding: '6px 14px' }}>{status.label}</span>
              <div style={{ marginTop: 12, color: 'var(--t3)', fontSize: 15 }}>
                {st.emoji} {session.type} · {session.duration}{t(lang, 'min')}
              </div>
              <div style={{ marginTop: 4, color: 'var(--t3)', fontSize: 15 }}>
                {formatDateLong(session.date, lang)} {t(lang, 'at')} {session.time}
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
                  onClick={() => { sendReminderWhatsApp(client, session, state.messageTemplates, lang, state.sessions); setActiveSession(null); }}>
                  <WhatsAppIcon />
                  {t(lang, 'remind')}
                </button>
              )}
              <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                onClick={openEdit}>
                <EditIcon />
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
              {SESSION_TYPES.map(stype => (
                <button key={stype.label}
                  className={`type-btn${form.type === stype.label ? ' selected' : ''}`}
                  style={form.type === stype.label ? { borderColor: stype.color, background: `${stype.color}20`, color: stype.color } : {}}
                  onClick={() => setForm(p => ({ ...p, type: stype.label }))}>
                  {stype.emoji} {stype.label}
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
        <CancelPrompt
          session={cancelPrompt}
          clientName={getClientName(cancelPrompt.clientId)}
          lang={lang}
          onConfirm={(counted) => {
            dispatch({ type: 'UPDATE_SESSION', payload: { id: cancelPrompt.id, status: 'cancelled', cancelCounted: counted } });
            setCancelPrompt(null);
          }}
          onClose={() => setCancelPrompt(null)}
        />
      )}
    </div>
  );
}
