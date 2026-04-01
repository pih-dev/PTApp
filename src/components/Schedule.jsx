import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { genId, today, formatDate, formatDateLong, SESSION_TYPES, STATUS_MAP, TIMES, DURATIONS, sendBookingWhatsApp, sendReminderWhatsApp, getOccupiedSlots, getMonthlySessionCount, currentMonth } from '../utils';

export default function Schedule({ state, dispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState({ clientIds: [], type: 'Strength', date: today(), time: '09:00', duration: 45 });
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null); // session to cancel

  const daySessions = state.sessions
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const openBooking = () => {
    setEditingSession(null);
    setForm({ clientIds: [], type: 'Strength', date: selectedDate, time: '09:00', duration: 45 });
    setShowForm(true);
  };

  const openEdit = (session) => {
    setEditingSession(session);
    setForm({ clientIds: [session.clientId], type: session.type, date: session.date, time: session.time, duration: session.duration });
    setShowForm(true);
  };

  const saveSession = () => {
    if (form.clientIds.length === 0) return;
    if (editingSession) {
      // Edit mode: update the single session (clientId from clientIds[0])
      const { clientIds, ...rest } = form;
      dispatch({ type: 'UPDATE_SESSION', payload: { id: editingSession.id, clientId: clientIds[0], ...rest } });
      setShowForm(false);
    } else {
      // Create mode: one independent session per selected client
      const created = form.clientIds.map(clientId => {
        const { clientIds, ...rest } = form;
        const session = { id: genId(), clientId, ...rest, status: 'scheduled', createdAt: new Date().toISOString() };
        dispatch({ type: 'ADD_SESSION', payload: session });
        return { client: state.clients.find(c => c.id === clientId), session };
      }).filter(c => c.client);
      setShowForm(false);
      if (created.length > 0) {
        setConfirmMsg({ items: created, index: 0 });
      }
    }
  };

  const updateStatus = (id, status) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id, status } });
  };

  // Cancel flow: show prompt to count or forgive (keeps the session record)
  const cancelSession = (session) => {
    setCancelPrompt(session);
  };
  const confirmCancel = (counted) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id: cancelPrompt.id, status: 'cancelled', cancelCounted: counted } });
    setCancelPrompt(null);
  };

  // Generate week dates
  const weekDates = [];
  const start = new Date(selectedDate + 'T00:00:00');
  const dayOfWeek = start.getDay();
  const monday = new Date(start);
  monday.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const getClientName = (id) => state.clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      {/* Week Strip */}
      <div className="week-strip">
        {weekDates.map(d => {
          const dt = new Date(d + 'T00:00:00');
          const isToday = d === today();
          const isSelected = d === selectedDate;
          const hasSession = state.sessions.some(s => s.date === d && s.status !== 'cancelled');
          let cls = 'week-day';
          if (isSelected) cls += ' selected';
          else if (isToday) cls += ' is-today';
          return (
            <button key={d} onClick={() => setSelectedDate(d)} className={cls}>
              <div className="week-day-label">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="week-day-num">{dt.getDate()}</div>
              {hasSession && <div className="week-day-dot" />}
            </button>
          );
        })}
      </div>

      {/* Week Nav */}
      <div className="week-nav">
        <button className="btn-secondary" onClick={() => {
          const d = new Date(selectedDate + 'T00:00:00');
          d.setDate(d.getDate() - 7);
          setSelectedDate(d.toISOString().split('T')[0]);
        }}>← Prev</button>
        <span className="week-nav-label">{formatDateLong(selectedDate)}</span>
        <button className="btn-secondary" onClick={() => {
          const d = new Date(selectedDate + 'T00:00:00');
          d.setDate(d.getDate() + 7);
          setSelectedDate(d.toISOString().split('T')[0]);
        }}>Next →</button>
      </div>

      {/* Day Sessions */}
      <div className="section-title section-header">
        <span>Sessions ({daySessions.length})</span>
        <button className="btn-sm" onClick={openBooking} disabled={state.clients.length === 0}>+ Book</button>
      </div>

      {state.clients.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👤</div>
          <div>Add a client first before booking sessions</div>
        </div>
      ) : daySessions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div>No sessions on this day</div>
        </div>
      ) : (
        daySessions.map(session => {
          const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
          const status = STATUS_MAP[session.status];
          const client = state.clients.find(c => c.id === session.clientId);
          const monthCount = getMonthlySessionCount(state.sessions, session.clientId, session.date.slice(0, 7));
          return (
            <div key={session.id} className="card" style={{ borderLeft: `3px solid ${st.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>#{monthCount}</span></div>
                  <div className="meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {session.time} · {session.duration}min · {st.emoji} {session.type}
                  </div>
                </div>
                <span className="badge" style={{ color: status.color, background: status.bg }}>{status.label}</span>
              </div>
              <div className="flex-row">
                {session.status === 'scheduled' && (
                  <button className="btn-confirm" onClick={() => updateStatus(session.id, 'confirmed')}>✓ Confirm</button>
                )}
                {(session.status === 'scheduled' || session.status === 'confirmed') && (
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => updateStatus(session.id, 'completed')}>✅ Complete</button>
                )}
                {client && (
                  <button className="btn-whatsapp" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => sendReminderWhatsApp(client, session)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Remind
                  </button>
                )}
                <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => openEdit(session)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                {session.status !== 'cancelled' && (
                  <button className="btn-icon" onClick={() => cancelSession(session)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Booking Modal */}
      {showForm && (
        <Modal title={editingSession ? 'Edit Session' : 'Book Session'} onClose={() => setShowForm(false)}
          action={<button className="btn-primary" onClick={saveSession}>{editingSession ? 'Save Changes' : `📅 Book Session${form.clientIds.length > 1 ? ` (${form.clientIds.length} clients)` : ''}`}</button>}>
          <div className="field">
            <label className="field-label">Client{!editingSession && 's'}</label>
            {/* Chips showing selected clients */}
            {form.clientIds.length > 0 && (
              <div className="client-chips">
                {form.clientIds.map(id => {
                  const c = state.clients.find(cl => cl.id === id);
                  if (!c) return null;
                  const monthCount = getMonthlySessionCount(state.sessions, id, currentMonth());
                  return (
                    <span key={id} className="client-chip">
                      {c.name} <span style={{ opacity: 0.6, fontSize: 11 }}>({monthCount})</span>
                      {!editingSession && (
                        <span className="client-chip-x" onClick={() => setForm(p => ({ ...p, clientIds: p.clientIds.filter(cid => cid !== id) }))}>×</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
            {/* Dropdown to add clients — hidden in edit mode */}
            {!editingSession && (
              <select className="select" style={{ marginTop: form.clientIds.length > 0 ? 8 : 0 }} value="" onChange={e => {
                if (e.target.value) setForm(p => ({ ...p, clientIds: [...p.clientIds, e.target.value] }));
              }}>
                <option value="">Select a client...</option>
                {state.clients.filter(c => !form.clientIds.includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
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
          <div className="field">
            <label className="field-label">Duration</label>
            <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}>
              {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Time</label>
            {(() => {
              const occupied = getOccupiedSlots(state.sessions, state.clients, form.date);
              return (
                <div className="time-grid" ref={el => {
                  // Auto-scroll to selected time when grid mounts
                  if (el && !el.dataset.scrolled) {
                    const idx = TIMES.indexOf(form.time);
                    const row = Math.floor(idx / 4);
                    el.scrollTop = Math.max(0, row * 42 - 60);
                    el.dataset.scrolled = '1';
                  }
                }}>
                  {TIMES.map(t => {
                    const isSelected = form.time === t;
                    const occ = occupied[t];
                    let cls = 'time-slot';
                    if (isSelected) cls += ' selected';
                    if (occ) cls += ' occupied';
                    return (
                      <button key={t} className={cls} onClick={() => setForm(p => ({ ...p, time: t }))}>
                        <span>{t}</span>
                        {occ && <span className="time-slot-name">{occ[0].clientName}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Success + WhatsApp Prompt (cycles through clients) */}
      {confirmMsg && (() => {
        const { items, index } = confirmMsg;
        const { client, session } = items[index];
        const total = items.length;
        const isLast = index === total - 1;
        const advance = () => {
          if (isLast) {
            setConfirmMsg(null);
          } else {
            setConfirmMsg({ items, index: index + 1 });
          }
        };
        return (
          <Modal title={total > 1 ? `Session Booked! 🎉 (${index + 1}/${total})` : 'Session Booked! 🎉'} onClose={() => setConfirmMsg(null)}
            action={<>
              <button className="btn-whatsapp-lg mb-10" onClick={() => {
                sendBookingWhatsApp(client, session);
                advance();
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send Confirmation via WhatsApp
              </button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                onClick={advance}>{isLast ? 'Done' : 'Skip'}</button>
            </>}>
            <div className="success-center">
              <div className="success-icon">✅</div>
              <div className="success-name">{client.name}</div>
              <div className="success-detail">{formatDate(session.date)} at {session.time}</div>
            </div>
          </Modal>
        );
      })()}

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
