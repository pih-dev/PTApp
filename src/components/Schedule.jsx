import React, { useState, useRef, useMemo } from 'react';
import Modal from './Modal';
import CancelPrompt from './CancelPrompt';
import { WhatsAppIcon, EditIcon, TrashIcon, ClockIcon } from './Icons';
import { genId, today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendBookingWhatsApp, sendReminderWhatsApp, getOccupiedSlots, getEffectiveSessionCount, getEffectiveClientCount, localDateStr, getStatus, haptic, parseSessionCountOverride, isRenewalDue, getCurrentPackage, getEffectivePeriod, generateRecurringDates, hasClientSlotConflict } from '../utils';
import SessionCountPair from './SessionCountPair';
import OverrideHelpPopup from './OverrideHelpPopup';
import { t, dateLocale } from '../i18n';

// v2.10 recurring booking helpers (module-scope, no re-creation per render).
// Mon-first display order for weekday chips, mapped to JS getDay() numbers (0=Sun..6=Sat).
// 2024-01-01 is a Monday, so adding (jsDay-1) days from it yields the correct locale label.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabel = (jsDay, lang) => {
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  return new Date(2024, 0, 1 + offset).toLocaleDateString(dateLocale(lang), { weekday: 'short' });
};

export default function Schedule({ state, dispatch, lang }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState({ clientIds: [], type: 'Strength', date: today(), time: '09:00', duration: 45 });
  // v2.10 recurring booking. Active only when `repeat` is true and not editing.
  //   weekdays — Set of JS getDay() numbers (0=Sun..6=Sat) the protocol repeats on
  //   preview  — null = form view; array of { date, time, conflict, keep } = preview view
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState(new Set());
  const [count, setCount] = useState(10);
  const [preview, setPreview] = useState(null);
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);
  // v2.8: inline override edit inside the booking confirm popup.
  //   editingOverride — true when the pencil is pressed and the input is shown in place of the pair
  //   overrideDraft   — the in-flight string being typed (committed on blur)
  //   overrideHelp    — help popup visibility (triggered by long-press / right-click on the input)
  const [editingOverride, setEditingOverride] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState('');
  const [overrideHelp, setOverrideHelp] = useState(false);
  const overrideHoldRef = useRef(null);

  // v2.9.2: precompute the set of renewal-due client IDs once per render.
  // isRenewalDue is O(sessions) per call — without memoization the booking-form
  // banner re-evaluates it for every selected client on every keystroke (form state
  // change → re-render → fresh map). Same Set is consumed by the auto-advance loop
  // in saveSession() so booking and the banner can't disagree.
  const renewalDueIds = useMemo(
    () => new Set(state.clients.filter(c => isRenewalDue(c, state.sessions)).map(c => c.id)),
    [state.clients, state.sessions]
  );

  // Long-press (500ms) opens the help popup. Same pattern as the debug panel + Clients form.
  const startOverrideHold = () => {
    if (overrideHoldRef.current) clearTimeout(overrideHoldRef.current);
    overrideHoldRef.current = setTimeout(() => { haptic(); setOverrideHelp(true); }, 500);
  };
  const cancelOverrideHold = () => {
    if (overrideHoldRef.current) { clearTimeout(overrideHoldRef.current); overrideHoldRef.current = null; }
  };

  const daySessions = state.sessions
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const openBooking = () => {
    setEditingSession(null);
    setForm({ clientIds: [], type: 'Strength', date: selectedDate, time: '09:00', duration: 45 });
    // v2.10: reset recurring state so toggling repeat on a prior booking doesn't leak
    setRepeat(false); setWeekdays(new Set()); setCount(10); setPreview(null);
    setShowForm(true);
  };

  const openEdit = (session) => {
    setEditingSession(session);
    setForm({ clientIds: [session.clientId], type: session.type, date: session.date, time: session.time, duration: session.duration });
    // Edit mode never enters recurring flow — reset so state is clean
    setRepeat(false); setWeekdays(new Set()); setCount(10); setPreview(null);
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
      // v2.9 auto-advance: if any selected client is renewal-due, close their current
      // package and open a new one BEFORE adding the new session. The new session's
      // date becomes the new package start so it naturally falls into the new package.
      for (const clientId of form.clientIds) {
        const c = state.clients.find(x => x.id === clientId);
        if (!c) continue;
        if (renewalDueIds.has(clientId)) {
          const pkg = getCurrentPackage(c);
          dispatch({
            type: 'RENEW_PACKAGE',
            payload: {
              clientId,
              newPackageStart: form.date,
              newContractSize: pkg.contractSize,
              newPeriodUnit: pkg.periodUnit,
              newPeriodValue: pkg.periodValue,
              newNotes: '',
              closedBy: 'auto',
              trigger: { reason: 'auto-advance on booking', bookingDate: form.date, bookingTime: form.time },
            },
          });
        }
      }
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

  // v2.10: build an array of { date, time, conflict, keep } rows from the recurring config.
  // Only reads state — no dispatches. Called by the "Preview" action button.
  const buildPreview = () => {
    const clientId = form.clientIds[0];
    if (!clientId || weekdays.size === 0 || count < 1) return;
    const dates = generateRecurringDates(form.date, [...weekdays], count);
    const rows = dates.map(date => {
      const conflict = hasClientSlotConflict(state.sessions, clientId, date, form.time);
      return { date, time: form.time, conflict, keep: !conflict };
    });
    setPreview(rows);
  };

  // Commit ticked preview rows as ONE ADD_SESSIONS dispatch. Calendar-only:
  // no RENEW_PACKAGE, contracts untouched by design (recurring series doesn't
  // auto-advance packages — the PT reviews each renewal explicitly).
  const createRecurring = () => {
    const clientId = form.clientIds[0];
    const kept = (preview || []).filter(r => r.keep);
    if (!clientId || kept.length === 0) return;
    const created = localDateStr(new Date());
    const payload = kept.map(r => ({
      id: genId(), clientId, type: form.type, date: r.date, time: r.time,
      duration: form.duration, status: 'scheduled', createdAt: created,
    }));
    dispatch({ type: 'ADD_SESSIONS', payload });
    haptic();
    setShowForm(false);
    setPreview(null);
    setRepeat(false);
    setSelectedDate(kept[0].date);
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

  // v2.10: context-aware primary action for the booking modal.
  //   • Edit mode → "Save Changes" (unchanged)
  //   • Repeat + preview visible → Back (ghost) + "Create N sessions" (primary)
  //   • Repeat + no preview yet → "Preview" (disabled until client+weekday+count set)
  //   • Normal booking → the original "📅 Book" button
  const bookingAction = editingSession ? (
    <button className="btn-primary" onClick={saveSession}>{t(lang, 'saveChanges')}</button>
  ) : repeat ? (
    preview ? (
      <div className="flex-row">
        <button className="btn-ghost" onClick={() => setPreview(null)}>{t(lang, 'recurringBack')}</button>
        <button className="btn-primary" disabled={preview.filter(r => r.keep).length === 0} onClick={createRecurring}>
          {t(lang, 'recurringCreate')} {preview.filter(r => r.keep).length} {t(lang, 'sessionsLower')}
        </button>
      </div>
    ) : (
      <button className="btn-primary"
        disabled={!form.clientIds[0] || weekdays.size === 0 || count < 1}
        onClick={buildPreview}>{t(lang, 'recurringPreview')}</button>
    )
  ) : (
    <button className="btn-primary" onClick={saveSession}>
      {`📅 ${t(lang, 'bookSessionBtn')}${form.clientIds.length > 1 ? ` (${form.clientIds.length} ${t(lang, 'client')})` : ''}`}
    </button>
  );

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
          // v2.8: effective count honours the PT's manual override for this period
          const { auto: monthAuto, effective: monthCount, override: monthOverride } = getEffectiveSessionCount(client, session, state.sessions);
          return (
            <div key={session.id} className="card" style={{ borderInlineStart: `3px solid ${st.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div className="client-name">
                    {getClientName(session.clientId)}{' '}
                    <SessionCountPair auto={monthAuto} effective={monthCount} override={monthOverride} />
                  </div>
                  <div className="meta">
                    <ClockIcon />
                    {session.time} · {session.duration}{t(lang, 'min')} ·{' '}
                    {/* Inline type selector — keep focus tags so switching back preserves selections.
                         Tags from other types stay hidden (not deleted) so a mixed-subcategory session
                         can accumulate work across types without losing prior selections.
                         Matches Dashboard behavior (decided 2026-04-02, commit eb29798). */}
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
                    {/* See Dashboard.jsx comment — no readOnly, iOS Safari bug */}
                    <textarea key={session.sessionNotes || ''} className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
                      defaultValue={session.sessionNotes || ''}
                      onFocus={e => { e.target.classList.add('editing'); }}
                      onBlur={e => {
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
        <Modal title={editingSession ? t(lang, 'editSession') : t(lang, 'bookSessionBtn')}
          onClose={() => { setShowForm(false); setPreview(null); setRepeat(false); }}
          action={bookingAction}>
          {/* v2.10: Repeat toggle — only visible in create mode; switches client selector
              to single-select and unlocks weekday chips + count input below time picker. */}
          {!editingSession && (
            <label className="repeat-toggle">
              <input type="checkbox" checked={repeat} onChange={e => {
                const on = e.target.checked;
                setRepeat(on);
                setPreview(null);
                // Recurring is single-client only — drop extras when enabling
                if (on) setForm(p => ({ ...p, clientIds: p.clientIds.slice(0, 1) }));
              }} />
              <span>{t(lang, 'repeatSessions')}</span>
            </label>
          )}
          {/* v2.9: banner shown when any selected client is renewal-due — informs PT that
              booking will auto-advance their package. Placed BEFORE the book button fires
              so it appears while PT is reviewing the selection. After booking the renewal
              already happened so isRenewalDue returns false and the banner vanishes.
              Hidden during preview step (no new input needed, action is just confirm/back). */}
          {!preview && form.clientIds.some(cid => renewalDueIds.has(cid)) && (
            <div className="booking-renewal-banner">
              ⚠️ {t(lang, 'packageLimitHit')} — {t(lang, 'willAutoRenew')}
            </div>
          )}
          {/* ── Preview step: hide all input fields, show checkable date rows ── */}
          {preview ? (
            <div className="recurring-preview">
              {preview.map((r, i) => {
                const dt = new Date(r.date + 'T00:00:00');
                const label = dt.toLocaleDateString(dateLocale(lang), { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <label key={r.date} className={`preview-row${r.conflict ? ' conflict' : ''}`}>
                    <input type="checkbox" checked={r.keep} onChange={() =>
                      setPreview(prev => prev.map((row, j) => j === i ? { ...row, keep: !row.keep } : row))} />
                    <span className="preview-date">{label} · {r.time}</span>
                    {r.conflict && <span className="preview-flag">{t(lang, 'recurringAlreadyBooked')}</span>}
                  </label>
                );
              })}
            </div>
          ) : (
            <>
              {/* ── Client selector ── */}
              <div className="field">
                <label className="field-label">{t(lang, 'client')}</label>
                {/* Repeat mode: single-client select (no chips, no multi-select) */}
                {repeat ? (
                  <select className="select" value={form.clientIds[0] || ''} onChange={e =>
                    setForm(p => ({ ...p, clientIds: e.target.value ? [e.target.value] : [] }))}>
                    <option value="">{t(lang, 'selectClient')}</option>
                    {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <>
                    {/* Normal mode: chips + multi-select dropdown */}
                    {/* Chips showing selected clients */}
                    {form.clientIds.length > 0 && (
                      <div className="client-chips">
                        {form.clientIds.map(id => {
                          const c = state.clients.find(cl => cl.id === id);
                          if (!c) return null;
                          // v2.9.6: chip shows the ordinal this booking WILL produce, not the
                          // pre-booking count. Mirrors the post-booking confirmation popup
                          // (line ~393) and the WhatsApp #N — so PT sees the same number in
                          // all three places. Why this matters: PT was repeatedly confused
                          // by the chip reading "(0)" for a brand-new client, then seeing
                          // "#1" on the next screen. Two semantics for the same idea.
                          //   Edit mode      → existing behavior (current period count of the
                          //                    client whose session is being edited).
                          //   Renewal-due    → saveSession dispatches RENEW_PACKAGE first; new
                          //                    package starts fresh (sessionCountOverride: null
                          //                    in the reducer), so this session is #1.
                          //   Otherwise      → simulate by appending a preview session at
                          //                    form.date/form.time and asking
                          //                    getEffectiveSessionCount for its ordinal — same
                          //                    helper the success popup uses, so the numbers
                          //                    are identical by construction.
                          let chipAuto, chipEffective, chipOverride;
                          if (editingSession) {
                            ({ auto: chipAuto, effective: chipEffective, override: chipOverride } =
                              getEffectiveClientCount(c, state.sessions));
                          } else if (renewalDueIds.has(c.id)) {
                            chipAuto = 1; chipEffective = 1; chipOverride = null;
                          } else {
                            const previewSession = { id: '__preview__', clientId: c.id, date: form.date, time: form.time, status: 'scheduled' };
                            ({ auto: chipAuto, effective: chipEffective, override: chipOverride } =
                              getEffectiveSessionCount(c, previewSession, [...state.sessions, previewSession]));
                          }
                          return (
                            <span key={id} className="client-chip">
                              {c.name}{' '}
                              {chipOverride
                                ? <span style={{ opacity: 0.85, fontSize: 11 }}>({chipAuto}→{chipEffective})</span>
                                : <span style={{ opacity: 0.6, fontSize: 11 }}>({chipAuto})</span>}
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
                  </>
                )}
              </div>
              {/* ── Session type ── */}
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
              {/* ── Date ── */}
              <div className="field">
                <label className="field-label">{t(lang, 'date')}</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              {/* ── Duration ── */}
              <div className="field">
                <label className="field-label">{t(lang, 'duration')}</label>
                <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                  {DURATIONS.map(d => <option key={d} value={d}>{d} {t(lang, 'min')}</option>)}
                </select>
              </div>
              {/* ── Time picker ── */}
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
              {/* ── v2.10: Weekday chips + count — only in repeat mode ── */}
              {repeat && !editingSession && (
                <>
                  <div className="field">
                    <label className="field-label">{t(lang, 'recurringWeekdays')}</label>
                    <div className="weekday-row">
                      {WEEKDAY_ORDER.map(jsDay => (
                        <button key={jsDay} type="button"
                          className={`weekday-chip${weekdays.has(jsDay) ? ' selected' : ''}`}
                          onClick={() => setWeekdays(prev => {
                            const next = new Set(prev);
                            next.has(jsDay) ? next.delete(jsDay) : next.add(jsDay);
                            return next;
                          })}>
                          {weekdayLabel(jsDay, lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">{t(lang, 'recurringCount')}</label>
                    <input className="input" type="number" min="1" max="60" value={count}
                      onChange={e => setCount(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))} />
                  </div>
                </>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Success + WhatsApp Prompt (cycles through clients) */}
      {confirmMsg && (() => {
        const { items, index } = confirmMsg;
        const { session } = items[index];
        // Re-read client from state on every render — state.clients has the FRESHEST override
        // after an inline edit-then-commit. Reading items[index].client would show stale data.
        const client = state.clients.find(c => c.id === items[index].client.id) || items[index].client;
        const total = items.length;
        const isLast = index === total - 1;
        // v2.8: guarantee the just-booked session is visible to the count helpers. Same reason
        // as the sendBookingWhatsApp site — React batching can leave state.sessions stale here.
        const sessions = state.sessions.some(s => s.id === session.id)
          ? state.sessions
          : [...state.sessions, session];
        const { auto: cAuto, effective: cEffective, override: cOverride } = getEffectiveSessionCount(client, session, sessions);
        const advance = () => {
          setEditingOverride(false);
          if (isLast) {
            setConfirmMsg(null);
          } else {
            setConfirmMsg({ items, index: index + 1 });
          }
        };
        // v2.9.2: Commit the typed override into the client's CURRENT package.
        // v2.9 moved override into packages[] (root-level fields are deleted by the
        // v2→v3 migration), so this writes to pkg.sessionCountOverride and dispatches
        // a new packages[]. Mirrors Clients.jsx save() so audit logging picks it up
        // via EDIT_CLIENT's package-diff detection (override_set / override_cleared).
        const commitOverride = () => {
          const parsed = parseSessionCountOverride(overrideDraft);
          const pkg = getCurrentPackage(client);
          const probePeriod = getEffectivePeriod(pkg, session.date);
          const newPkg = {
            ...pkg,
            sessionCountOverride: parsed
              ? { ...parsed, periodStart: probePeriod.start }
              : null,
          };
          const pkgs = client.packages && client.packages.length
            ? [...client.packages.slice(0, -1), newPkg]
            : [newPkg];
          dispatch({ type: 'EDIT_CLIENT', payload: { ...client, packages: pkgs } });
          setEditingOverride(false);
        };
        // Initialize the input from the current package's override (only if its
        // periodStart matches the current effective period — stale stamps render blank).
        const openOverrideEdit = () => {
          const pkg = getCurrentPackage(client);
          const period = getEffectivePeriod(pkg, session.date);
          const ov = pkg.sessionCountOverride;
          const isCurrent = ov && ov.periodStart === period.start;
          const draft = isCurrent
            ? (ov.type === 'delta'
                ? (ov.value >= 0 ? '+' : '') + ov.value
                : String(ov.value))
            : '';
          setOverrideDraft(draft);
          setEditingOverride(true);
        };
        return (
          <Modal title={total > 1 ? `${t(lang, 'sessionBooked')} (${index + 1}/${total})` : t(lang, 'sessionBooked')} onClose={() => { setEditingOverride(false); setConfirmMsg(null); }}
            action={<>
              <button className="btn-whatsapp-lg mb-10" onClick={() => {
                sendBookingWhatsApp(client, session, state.messageTemplates, lang, sessions);
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
              {/* v2.8: inline override edit. Default view shows the pair + pencil; pencil toggles
                  the input which commits on blur. Long-press / right-click opens help. */}
              <div className="period-override-row" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {editingOverride ? (
                  <input
                    className="input override-input"
                    style={{ maxWidth: 180, textAlign: 'center' }}
                    autoFocus
                    placeholder={t(lang, 'overridePlaceholder')}
                    value={overrideDraft}
                    onChange={e => setOverrideDraft(e.target.value)}
                    onBlur={commitOverride}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    onTouchStart={startOverrideHold}
                    onTouchEnd={cancelOverrideHold}
                    onTouchMove={cancelOverrideHold}
                    onTouchCancel={cancelOverrideHold}
                    onMouseDown={startOverrideHold}
                    onMouseUp={cancelOverrideHold}
                    onMouseLeave={cancelOverrideHold}
                    onContextMenu={e => { e.preventDefault(); setOverrideHelp(true); }}
                  />
                ) : (
                  <>
                    <SessionCountPair auto={cAuto} effective={cEffective} override={cOverride} />
                    <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={openOverrideEdit} aria-label={t(lang, 'editCount')}>
                      <EditIcon size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* v2.8: help popup for the override input (shared between confirm popup + any future site) */}
      <OverrideHelpPopup
        show={overrideHelp}
        onClose={() => setOverrideHelp(false)}
        onClear={() => setOverrideDraft('')}
        lang={lang}
      />

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
