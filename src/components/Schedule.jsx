import React, { useState } from 'react';
import Modal from './Modal';
import CancelPrompt from './CancelPrompt';
import { WhatsAppIcon, EditIcon, TrashIcon, ClockIcon } from './Icons';
import { genId, today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendBookingWhatsApp, sendReminderWhatsApp, getOccupiedSlots, getMonthlySessionCount, getSessionOrdinal, currentMonth, localDateStr, getStatus, haptic } from '../utils';
import { t, dateLocale } from '../i18n';

export default function Schedule({ state, dispatch, lang }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState({ clientIds: [], type: 'Strength', date: today(), time: '09:00', duration: 45 });
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);

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
        const session = { id: genId(), clientId, ...rest, status: 'scheduled', createdAt: localDateStr(new Date()) };
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

  const cancelSession = (session) => {
    setCancelPrompt(session);
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
    weekDates.push(localDateStr(d));
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
              <div className="week-day-label">{dt.toLocaleDateString(dateLocale(lang), { weekday: 'short' })}</div>
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
          setSelectedDate(localDateStr(d));
        }}>{t(lang, 'prev')}</button>
        <span className="week-nav-label">{formatDateLong(selectedDate, lang)}</span>
        <button className="btn-secondary" onClick={() => {
          const d = new Date(selectedDate + 'T00:00:00');
          d.setDate(d.getDate() + 7);
          setSelectedDate(localDateStr(d));
        }}>{t(lang, 'next')}</button>
      </div>

      {/* Day Sessions */}
      <div className="section-title section-header">
        <span>{t(lang, 'sessionsCount')} ({daySessions.length})</span>
        <button className="btn-sm" onClick={openBooking} disabled={state.clients.length === 0}>{t(lang, 'book')}</button>
      </div>

      {state.clients.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👤</div>
          <div>{t(lang, 'addClientFirst')}</div>
        </div>
      ) : daySessions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div>{t(lang, 'noSessionsDay')}</div>
        </div>
      ) : (
        daySessions.map(session => {
          const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
          const status = getStatus(session.status, lang, t);
          const client = state.clients.find(c => c.id === session.clientId);
          const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, session.date.slice(0, 7));
          return (
            <div key={session.id} className="card" style={{ borderInlineStart: `3px solid ${st.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t5)' }}>#{monthCount}</span></div>
                  <div className="meta">
                    <ClockIcon />
                    {session.time} · {session.duration}{t(lang, 'min')} ·{' '}
                    {/* Inline type selector — change type, auto-clear focus tags */}
                    <select className="inline-type-select" value={session.type} onChange={e => {
                      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value, focus: [] } });
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
                <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => openEdit(session)}>
                  <EditIcon size={14} />
                  {t(lang, 'edit')}
                </button>
                {session.status === 'cancelled' ? (
                  <button className="btn-confirm" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => updateStatus(session.id, 'scheduled')}>{t(lang, 'restore')}</button>
                ) : (
                  <button className="btn-danger-sm" onClick={() => { haptic(); cancelSession(session); }}>
                    <TrashIcon />
                  </button>
                )}
              </div>
              {/* Focus tags — tappable, auto-save */}
              {(() => {
                const tags = FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom;
                const focus = session.focus || [];
                const toggleFocus = (tag) => {
                  const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
                  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, focus: updated } });
                };
                return (
                  <div>
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
              })()}
            </div>
          );
        })
      )}

      {/* Booking Modal */}
      {showForm && (
        <Modal title={editingSession ? t(lang, 'editSession') : t(lang, 'bookSessionBtn')} onClose={() => setShowForm(false)}
          action={<button className="btn-primary" onClick={saveSession}>{editingSession ? t(lang, 'saveChanges') : `📅 ${t(lang, 'bookSessionBtn')}${form.clientIds.length > 1 ? ` (${form.clientIds.length} ${t(lang, 'client')})` : ''}`}</button>}>
          <div className="field">
            <label className="field-label">{t(lang, 'client')}</label>
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
                <option value="">{t(lang, 'selectClient')}</option>
                {state.clients.filter(c => !form.clientIds.includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
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
          <div className="field">
            <label className="field-label">{t(lang, 'duration')}</label>
            <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}>
              {DURATIONS.map(d => <option key={d} value={d}>{d} {t(lang, 'min')}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'time')}</label>
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
                  {TIMES.map(tm => {
                    const isSelected = form.time === tm;
                    const occ = occupied[tm];
                    let cls = 'time-slot';
                    if (isSelected) cls += ' selected';
                    if (occ) cls += ' occupied';
                    return (
                      <button key={tm} className={cls} onClick={() => setForm(p => ({ ...p, time: tm }))}>
                        <span>{tm}</span>
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
          <Modal title={total > 1 ? `${t(lang, 'sessionBooked')} (${index + 1}/${total})` : t(lang, 'sessionBooked')} onClose={() => setConfirmMsg(null)}
            action={<>
              <button className="btn-whatsapp-lg mb-10" onClick={() => {
                sendBookingWhatsApp(client, session, state.messageTemplates, lang, state.sessions);
                advance();
              }}>
                <WhatsAppIcon size={20} />
                {t(lang, 'sendConfirmWA')}
              </button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                onClick={advance}>{isLast ? t(lang, 'done') : t(lang, 'skip')}</button>
            </>}>
            <div className="success-center">
              <div className="success-icon">✅</div>
              <div className="success-name">{client.name}</div>
              <div className="success-detail">{formatDate(session.date, lang)} {t(lang, 'at')} {session.time}</div>
            </div>
          </Modal>
        );
      })()}

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
