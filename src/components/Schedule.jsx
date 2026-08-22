import React, { useState, useRef, useMemo } from 'react';
import Modal from './Modal';
import CancelPrompt from './CancelPrompt';
import { WhatsAppIcon, EditIcon, BarMark, OkIcon } from './Icons';
import { genId, today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, sendBookingWhatsApp, sendReminderWhatsApp, getOccupiedSlots, getEffectiveSessionCount, localDateStr, haptic, parseSessionCountOverride, formatOverrideDraft, getRenewalDueMap, getCurrentPackage, getEffectivePeriod, generateRecurringDates, hasClientSlotConflict, suggestBookingTime, isSessionNow } from '../utils';
import SessionCountPair from './SessionCountPair';
import OverrideHelpPopup from './OverrideHelpPopup';
import Bar from './Bar';
import SessionCard from './SessionCard';
import { t, dateLocale } from '../i18n';

// v2.10 recurring booking helpers (module-scope, no re-creation per render).
// Mon-first display order for weekday chips, mapped to JS getDay() numbers (0=Sun..6=Sat).
// 2024-01-01 is a Monday, so adding (jsDay-1) days from it yields the correct locale label.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabel = (jsDay, lang) => {
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  return new Date(2024, 0, 1 + offset).toLocaleDateString(dateLocale(lang), { weekday: 'short' });
};

export default function Schedule({ state, dispatch, lang, initialDate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  // v2.25: a Dashboard week column can open Schedule ON that day (fresh-eyes
  // review #9). The prop is an initial value only — the tab remounts on every
  // entry, and App clears it when the user navigates by the nav bar instead.
  const [selectedDate, setSelectedDate] = useState(initialDate || today());
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
  // v2.14.1: true once the PT taps a time slot in THIS form instance — a manual
  // pick must survive date changes (spec: "re-suggest unless I picked a time").
  // Ephemeral by design: reset on every openBooking, never persisted.
  const [timeTouched, setTimeTouched] = useState(false);
  // v2.8: inline override edit inside the booking confirm popup.
  //   editingOverride — true when the pencil is pressed and the input is shown in place of the pair
  //   overrideDraft   — the in-flight string being typed (committed on blur)
  //   overrideHelp    — help popup visibility (triggered by long-press / right-click on the input)
  const [editingOverride, setEditingOverride] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState('');
  const [overrideHelp, setOverrideHelp] = useState(false);
  const overrideHoldRef = useRef(null);

  // v2.10.3 (review P5): shared renewal selector — memoized inside utils on the
  // (clients, sessions) array pair, so no useMemo needed here. The same map feeds
  // the banner AND the auto-advance loop in saveSession() so booking and the banner
  // can't disagree (the v2.9.2 requirement), and now also Dashboard + Clients.
  const renewalDue = getRenewalDueMap(state.clients, state.sessions);
  const isDue = (clientId) => renewalDue.get(clientId)?.due === true;

  // v2.10.3 (review P4): ONE derived mode instead of three free booleans branched in
  // four JSX places. The booleans allowed impossible combinations to be expressed and
  // forced every branch to re-derive which screen it was on. Order matters: edit wins
  // (openEdit resets repeat state), then repeat splits on whether the preview is built.
  const mode = editingSession ? 'edit' : repeat ? (preview ? 'repeatPreview' : 'repeatConfig') : 'single';

  // v2.10.3 (review P4): the 4-setter repeat reset existed in 4 spots, two of them
  // PARTIAL (modal close and createRecurring left weekdays/count dirty). One owner.
  const resetRepeat = () => {
    setRepeat(false);
    setWeekdays(new Set());
    setCount(10);
    setPreview(null);
  };

  // Long-press (500ms) opens the help popup. Same pattern as the debug panel + Clients form.
  const startOverrideHold = () => {
    if (overrideHoldRef.current) clearTimeout(overrideHoldRef.current);
    overrideHoldRef.current = setTimeout(() => { haptic(); setOverrideHelp(true); }, 500);
  };
  const cancelOverrideHold = () => {
    if (overrideHoldRef.current) { clearTimeout(overrideHoldRef.current); overrideHoldRef.current = null; }
  };

  const daySessions = useMemo(() => state.sessions
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time)), [state.sessions, selectedDate]);

  // v2.10.1: memoized — this was an IIFE inside the time-picker JSX, re-filtering the
  // ENTIRE sessions array on every form interaction (each chip toggle, type tap,
  // weekday tap) even though the slot map only depends on the chosen date.
  const occupiedSlots = useMemo(
    () => getOccupiedSlots(state.sessions, state.clients, form.date),
    [state.sessions, state.clients, form.date]
  );

  const openBooking = () => {
    setEditingSession(null);
    // v2.14.1: suggest the first free slot of the selected day (08:15 on an
    // empty day) instead of a hardcoded 09:00 — Elie books back-to-back and
    // was retapping the grid on every second booking of a day.
    setForm({ clientIds: [], type: 'Strength', date: selectedDate, time: suggestBookingTime(state.sessions, state.clients, selectedDate), duration: 45 });
    setTimeTouched(false);
    resetRepeat(); // toggling repeat on a prior booking must not leak into this one
    setShowForm(true);
  };

  const openEdit = (session) => {
    setEditingSession(session);
    setForm({ clientIds: [session.clientId], type: session.type, date: session.date, time: session.time, duration: session.duration });
    resetRepeat(); // edit mode never enters the recurring flow
    setShowForm(true);
  };

  // v2.10.3 (review P4): the ONLY place a new session object is born from the form.
  // Both the single/multi booking path and the recurring generator call this, so a
  // form field added here reaches both. Before, createRecurring picked fields by
  // hand — any session field a future feature adds (e.g. the eval protocol) would
  // have silently vanished from recurring series. `date`/`time` come AFTER the form
  // spread so recurring rows can override them per occurrence.
  const buildSession = (clientId, date, time) => {
    const { clientIds, ...fields } = form;
    return {
      id: genId(), clientId, ...fields, date, time,
      status: 'scheduled', createdAt: localDateStr(new Date()),
    };
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
        if (isDue(clientId)) {
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
      // Create mode: one independent session per selected client.
      // v2.10.1: committed as ONE ADD_SESSIONS dispatch (the batch action added for the
      // recurring generator) instead of N ADD_SESSION dispatches in the .map — the
      // "single dispatches in loops" convention. The RENEW_PACKAGE loop above stays:
      // each renewal is a distinct per-client state transition with its own audit entry.
      const created = form.clientIds
        .map(clientId => ({
          client: state.clients.find(c => c.id === clientId),
          session: buildSession(clientId, form.date, form.time),
        }))
        .filter(c => c.client);
      if (created.length > 0) {
        dispatch({ type: 'ADD_SESSIONS', payload: created.map(c => c.session) });
      }
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
    // Same constructor as the single-booking path (P4) — only date/time vary per row.
    const payload = kept.map(r => buildSession(clientId, r.date, r.time));
    dispatch({ type: 'ADD_SESSIONS', payload });
    haptic();
    setShowForm(false);
    resetRepeat();
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

  // v2.10: context-aware primary action for the booking modal, keyed on `mode` (P4).
  //   • edit          → "Save Changes" (unchanged)
  //   • repeatPreview → Back (ghost) + "Create N sessions" (primary)
  //   • repeatConfig  → "Preview" (disabled until client+weekday+count set)
  //   • single        → the original "📅 Book" button
  const bookingAction = {
    edit: (
      <button className="btn-primary" onClick={saveSession}>{t(lang, 'saveChanges')}</button>
    ),
    repeatPreview: preview && (
      <div className="flex-row">
        <button className="btn-ghost" onClick={() => setPreview(null)}>{t(lang, 'recurringBack')}</button>
        <button className="btn-primary" disabled={preview.filter(r => r.keep).length === 0} onClick={createRecurring}>
          {t(lang, 'recurringCreate')} {preview.filter(r => r.keep).length} {t(lang, 'sessionsLower')}
        </button>
      </div>
    ),
    repeatConfig: (
      <button className="btn-primary"
        disabled={!form.clientIds[0] || weekdays.size === 0 || count < 1}
        onClick={buildPreview}>{t(lang, 'recurringPreview')}</button>
    ),
    single: (
      <button className="btn-primary" onClick={saveSession}>
        {`${t(lang, 'bookSessionBtn')}${form.clientIds.length > 1 ? ` (${form.clientIds.length} ${t(lang, 'client')})` : ''}`}
      </button>
    ),
  }[mode];

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

      {/* Day Sessions — the head graduated from `.section-title` to the bar,
          and the rows are the shared SessionCard (v2.25, review P3 scope B). */}
      <Bar label={t(lang, 'sessionsCount')} count={daySessions.length}>
        <button className="btn-sm" onClick={openBooking} disabled={state.clients.length === 0}>{t(lang, 'book')}</button>
      </Bar>

      {state.clients.length === 0 ? (
        <div className="empty">
          <div className="empty-mark"><BarMark /></div>
          <div>{t(lang, 'addClientFirst')}</div>
        </div>
      ) : daySessions.length === 0 ? (
        <div className="empty">
          <div className="empty-mark"><BarMark /></div>
          <div>{t(lang, 'noSessionsDay')}</div>
        </div>
      ) : (
        <div className="srows">
          {daySessions.map((session, idx) => {
            const client = state.clients.find(c => c.id === session.clientId);
            return (
              <SessionCard key={session.id}
                session={session} client={client} lang={lang} dispatch={dispatch}
                countPair={getEffectiveSessionCount(client, session, state.sessions)}
                isNow={isSessionNow(session)}
                index={idx}
                onRemind={(s, c) => sendReminderWhatsApp(c, s, state.messageTemplates, lang, state.sessions)}
                onEdit={openEdit}
                onCancel={cancelSession}
                onRestore={(s) => updateStatus(s.id, 'scheduled')}
              />
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {showForm && (
        <Modal title={mode === 'edit' ? t(lang, 'editSession') : t(lang, 'bookSessionBtn')}
          onClose={() => { setShowForm(false); resetRepeat(); }}
          action={bookingAction}>
          {/* v2.9: banner shown when any selected client is renewal-due — informs PT that
              booking will auto-advance their package. Placed BEFORE the book button fires
              so it appears while PT is reviewing the selection. After booking the renewal
              already happened so isRenewalDue returns false and the banner vanishes.
              Hidden during preview step (no new input needed, action is just confirm/back).
              v2.10.1: repeat mode gets DIFFERENT text — createRecurring is calendar-only
              and never dispatches RENEW_PACKAGE, so the "will auto-renew" promise was
              false there. The PT is told to renew explicitly instead. */}
          {mode !== 'repeatPreview' && form.clientIds.some(cid => isDue(cid)) && (
            <div className="booking-renewal-banner">
              {t(lang, 'packageLimitHit')} — {t(lang, mode === 'repeatConfig' ? 'repeatNoAutoRenew' : 'willAutoRenew')}
            </div>
          )}
          {/* ── Preview step: hide all input fields, show checkable date rows ── */}
          {mode === 'repeatPreview' && preview ? (
            <div className="recurring-preview">
              {preview.map((r, i) => {
                // v2.10.1: formatDate IS this exact format — the inline toLocaleDateString
                // copy would silently diverge from every other screen on the next change.
                const label = formatDate(r.date, lang);
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
                {mode === 'repeatConfig' ? (
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
                          //   Edit mode      → simulate the session at its NEW form.date/form.time
                          //                    and show the ordinal it WILL have after saving
                          //                    (v2.10.2, review P8 — was today's-window count
                          //                    regardless of form.date, a v2.9.6 carve-out that
                          //                    broke the "one number, one semantic" rule when
                          //                    rescheduling across period boundaries).
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
                            const moved = {
                              ...editingSession,
                              date: form.date || editingSession.date,
                              time: form.time || editingSession.time,
                            };
                            const simSessions = state.sessions.map(s => s.id === editingSession.id ? moved : s);
                            ({ auto: chipAuto, effective: chipEffective, override: chipOverride } =
                              getEffectiveSessionCount(c, moved, simSessions));
                          } else if (isDue(c.id)) {
                            chipAuto = 1; chipEffective = 1; chipOverride = null;
                          } else {
                            // P6: no synthetic id and no hand-merged array. getSessionOrdinal
                            // PROJECTS — it positions a session that is not in the array by
                            // (date, time), which is exactly what a preview is. The old
                            // `__preview__` sentinel existed only to make findIndex succeed.
                            ({ auto: chipAuto, effective: chipEffective, override: chipOverride } =
                              getEffectiveSessionCount(c, { clientId: c.id, date: form.date, time: form.time, status: 'scheduled' }, state.sessions));
                          }
                          return (
                            <span key={id} className="client-chip">
                              {c.name}{' '}
                              {chipOverride
                                ? <span style={{ opacity: 0.85, fontSize: 11 }}>({chipAuto}→{chipEffective})</span>
                                : <span style={{ opacity: 0.6, fontSize: 11 }}>({chipAuto})</span>}
                              {mode !== 'edit' && (
                                <span className="client-chip-x" onClick={() => setForm(p => ({ ...p, clientIds: p.clientIds.filter(cid => cid !== id) }))}>×</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* Dropdown to add clients — hidden in edit mode */}
                    {mode !== 'edit' && (
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
                      {/* The swatch replaces the emoji (v2.25) — the per-type colour
                          is a legend the picker keeps, drawn instead of typed. */}
                      <span className="type-dot" style={{ background: stype.color }} />
                      {stype.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* ── Date ── */}
              <div className="field">
                <label className="field-label">{t(lang, 'date')}</label>
                <input type="date" className="input" value={form.date} onChange={e => {
                  const date = e.target.value;
                  // v2.14.1: a new date gets that day's suggestion — but never
                  // overwrite a manually tapped time, and edit mode always keeps
                  // the session's own time (no suggestion interference).
                  setForm(p => (editingSession || timeTouched)
                    ? { ...p, date }
                    : { ...p, date, time: suggestBookingTime(state.sessions, state.clients, date) });
                }} />
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
                    const occ = occupiedSlots[tm];
                    let cls = 'time-slot';
                    if (isSelected) cls += ' selected';
                    if (occ) cls += ' occupied';
                    return (
                      <button key={tm} className={cls} onClick={() => { setTimeTouched(true); setForm(p => ({ ...p, time: tm })); }}>
                        <span>{tm}</span>
                        {occ && <span className="time-slot-name">{occ[0].clientName}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* v2.10: Repeat toggle — create mode only; switches the client selector
                  to single-select and unlocks the weekday chips + count below.
                  v2.25 (fresh-eyes review #5): moved from the TOP of the form to
                  here, beside the config it unlocks — the most common booking
                  (one client, one slot) no longer walks past a mode switch it
                  never uses, and the client picker is the first control again. */}
              {mode !== 'edit' && (
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
              {/* ── v2.10: Weekday chips + count — only in repeat mode ── */}
              {mode === 'repeatConfig' && (
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
        // P6: state.sessions plainly. React batching can still leave the just-booked
        // session absent here, and that is now the kernel's problem rather than this
        // call site's — getSessionOrdinal projects it into position either way. The
        // hand-merged array this replaced also missed the WeakMap cache on every
        // render, rebuilding the whole per-client index for one number.
        const { auto: cAuto, effective: cEffective, override: cOverride } =
          getEffectiveSessionCount(client, session, state.sessions);
        const advance = () => {
          setEditingOverride(false);
          if (isLast) {
            setConfirmMsg(null);
          } else {
            setConfirmMsg({ items, index: index + 1 });
          }
        };
        // v2.9.2: Commit the typed override into the client's CURRENT package
        // (v2.9 moved override into packages[] — root-level fields are deleted by the
        // v2→v3 migration). v2.10.4 (review P7): dispatches EDIT_CURRENT_PACKAGE — the
        // reducer owns the replace-last write + audit (override_set / override_cleared),
        // and reads the LIVE client by id, so this no longer spreads a possibly-stale
        // client snapshot over profile fields edited on another device mid-popup.
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
          dispatch({ type: 'EDIT_CURRENT_PACKAGE', payload: { clientId: client.id, pkg: newPkg } });
          setEditingOverride(false);
        };
        // Initialize the input from the current package's override (only if its
        // periodStart matches the current effective period — stale stamps render blank).
        // v2.10.1: serialization shared with Clients.jsx via formatOverrideDraft.
        const openOverrideEdit = () => {
          const pkg = getCurrentPackage(client);
          const period = getEffectivePeriod(pkg, session.date);
          setOverrideDraft(formatOverrideDraft(pkg, period));
          setEditingOverride(true);
        };
        return (
          <Modal title={total > 1 ? `${t(lang, 'sessionBooked')} (${index + 1}/${total})` : t(lang, 'sessionBooked')} onClose={() => { setEditingOverride(false); setConfirmMsg(null); }}
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
              {/* A drawn check on --ok, never an emoji (v2.25). */}
              <div className="modal-mark" style={{ color: 'var(--ok)' }}><OkIcon /></div>
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
