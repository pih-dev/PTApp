import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import CancelPrompt from './CancelPrompt';
import { WhatsAppIcon, EditIcon, TrashIcon, ChevronIcon, BarMark } from './Icons';
import { today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, sendReminderWhatsApp, getEffectiveSessionCount, localDateStr, getStatus, haptic, getRenewalDueMap, isSessionNow } from '../utils';
import SessionCountPair from './SessionCountPair';
import RenewalModal from './RenewalModal';
import Bar from './Bar';
import Plates from './Plates';
import SessionCard from './SessionCard';
import { t } from '../i18n';

// ─── The plate and the bar (v2.18, design pass stage 2) ──────────────────────
//
// 🔴 THIS FILE IS PRESENTATION ONLY. Every handler, dispatch and kernel call is
//    exactly what it was in v2.17 — getRenewalDueMap, getEffectiveSessionCount,
//    getFocusTags, getStatus, sendReminderWhatsApp, the notes textarea, all of
//    it. The rule from the spec (§6): if a kernel call or a reducer action has
//    to change, the slice has grown out of scope and it stops. That is how a
//    restyle turns into a data incident, and it is not happening here.
//
// What DID change is the visual language. The card is deleted: rows sit on the
// lit ground and a bar shaft separates them. The three tinted stat tiles became
// the week read as loaded columns. The package stopped being a bare "12/20" and
// became plates — filled = used, hollow = remaining, all-accent = due. The
// session-type colour left the row edge entirely, because six arbitrary hues
// decorating a list is precisely the generated look the brief documented; the
// inline-start bar now means one thing only, the session happening right now.
//
// Design record: docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md

// The week as load on a rack: one column per day, one segment per session,
// today's column on the accent. Eight segments is the visual cap — the headline
// number carries the exact total, so a ten-session day does not stretch the row.
// v2.25 (fresh-eyes review #9): each column is a BUTTON through to that day in
// Schedule — the figure showed seven days and navigated nowhere.
const SEG_CAP = 8;
function LoadWeek({ days, total, lang, onOpenDay }) {
  return (
    <div className="load">
      <div className="load-figure">
        <div className="load-num">{total}</div>
        <div className="load-cap">{t(lang, 'statWeek')}</div>
      </div>
      <div className="load-cols">
        {days.map(d => (
          <button key={d.date} type="button" className={`load-col${d.isToday ? ' is-today' : ''}`}
            aria-label={formatDate(d.date, lang)}
            onClick={() => { haptic(); onOpenDay(d.date); }}>
            <div className="load-stack">
              {Array.from({ length: Math.min(d.count, SEG_CAP) }, (_, i) => (
                <span key={i} className="load-seg" style={{ animationDelay: `${i * 35}ms` }} />
              ))}
            </div>
            <div className="load-base" />
            <div className="load-day">{d.letter}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ state, dispatch, setTab, lang, onOpenDay }) {
  const [activeSession, setActiveSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);
  const [expanded, setExpanded] = useState(true); // true = full rows, false = compact list
  const [form, setForm] = useState({ clientId: '', type: 'Strength', date: today(), time: '09:00', duration: 45 }); // defaults are dead: openEdit always overwrites before the (edit-only) modal shows — see 2026-07-17 spec correction
  const [renewClient, setRenewClient] = useState(null);

  // v2.10.1: the derivations below are useMemo'd. They previously recomputed on
  // EVERY render — including each keystroke in the edit modal and every focus-tag
  // tap — with per-session Date allocations inside the filter callbacks. Memo deps
  // are the state slices they read; `now`-dependent values are captured at memo
  // time, which is fine because every data change re-renders via a dispatch anyway
  // and none of these are precise deadlines.
  const todayStr = today();

  // Upcoming Sessions: future + today's sessions that aren't cancelled.
  // Extra rule (v2.9.1, 2026-04-21): once a session is `completed` AND its
  // end time is 2+ hours in the past, hide it. Pierre reported scrolling past
  // today's finished sessions in the evening to reach tomorrow's — 2h gives
  // a short "still visible right after it ended" window, then the list clears
  // out. No-shows left as `scheduled` stay visible (the PT still needs to act
  // on them). The `date < todayStr` guard stays as a stale-scheduled safeguard.
  const upcoming = useMemo(() => {
    const nowMs = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    return state.sessions
      .filter(s => {
        if (s.status === 'cancelled') return false;
        if (s.date < todayStr) return false;
        if (s.status === 'completed') {
          // Missing/empty time would yield Invalid Date → NaN → comparison always false →
          // the session would stay in Upcoming forever. The booking form requires a time so
          // this is only a defensive guard for legacy/imported data, but cheap to add.
          // DST note: in a spring-forward / fall-back hour the wall-clock end can drift ±1h
          // against the 2h window. Acceptable — the rolloff isn't a precise deadline.
          if (!s.time) return false;
          const endMs = new Date(`${s.date}T${s.time}`).getTime() + (s.duration || 45) * 60000;
          if (nowMs - endMs >= TWO_HOURS_MS) return false;
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [state.sessions, todayStr]);

  // Clients whose current contract is exhausted or expired — shown in the renewal banner.
  // v2.10.3 (review P5): read from the shared selector (memoized in utils on the
  // (clients, sessions) array pair) — Schedule and Clients consume the SAME map, so the
  // renewal rule can't drift between tabs anymore.
  // v2.18: the SAME map now also supplies the plate rows on every session row —
  // contractSize and the effective count come from one place, so the plates and
  // the renewal banner can never disagree about how full a package is.
  const renewalDue = getRenewalDueMap(state.clients, state.sessions);
  const renewalDueClients = state.clients.filter(c => renewalDue.get(c.id)?.due);

  // "This Week": today + the next 6 days (7 calendar days total).
  // v2.10.1: was `+ 7 days` with inclusive <=, silently counting 8 days.
  // Compare date strings to avoid fractional day math errors near midnight.
  // v2.18: the same pass also buckets by day, because the week is now drawn as
  // seven loaded columns rather than a single tile. The total is unchanged —
  // it is the sum of the buckets by construction, not a second count.
  const week = useMemo(() => {
    const locale = lang === 'ar' ? 'ar-LB' : 'en-US';
    const days = [];
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayStr + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const date = localDateStr(d);
      const count = state.sessions.filter(s => s.date === date && s.status !== 'cancelled').length;
      total += count;
      // Narrow weekday from the platform: correct in Arabic without a second
      // hardcoded list to keep in sync (and no toISOString anywhere near it).
      days.push({ date, count, isToday: i === 0, letter: d.toLocaleDateString(locale, { weekday: 'narrow' }) });
    }
    return { days, total };
  }, [state.sessions, todayStr, lang]);

  const getClientName = (id) => state.clients.find(c => c.id === id)?.name || t(lang, 'unknown');

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

  // The empty state, shared by both views. A drawn bar, never an emoji.
  const emptyState = (labelKey, ctaKey) => (
    <div className="empty">
      <div className="empty-mark"><BarMark /></div>
      <div className="empty-line">{t(lang, labelKey)}</div>
      <button onClick={() => setTab('schedule')} className="btn-primary mt-16" style={{ width: 'auto', display: 'inline-flex' }}>
        {t(lang, ctaKey)}
      </button>
    </div>
  );

  return (
    <div>
      <Bar label={t(lang, 'overview')} count={`${state.clients.length} ${t(lang, 'statClients')}`} />
      <LoadWeek days={week.days} total={week.total} lang={lang} onOpenDay={onOpenDay} />

      <Bar label={t(lang, 'upcomingSessions')} count={upcoming.length}>
        {/* Tapped often, and it sits at the top of the screen — the padding is the
            minimum decency for a thumb, not a style choice. */}
        <button className="btn-secondary" style={{ fontSize: 12, padding: '11px 14px' }}
          onClick={() => { haptic(); setExpanded(e => !e); }}>
          {expanded ? t(lang, 'compact') : t(lang, 'expanded')}
        </button>
      </Bar>

      {/* Expanded view: upcoming sessions with full inline functionality.
          v2.25: the row is the shared SessionCard (review P3, scope B) —
          Schedule renders the SAME component, so the two lists cannot drift. */}
      {expanded ? (
        upcoming.length === 0 ? emptyState('noUpcoming', 'bookSession') : (
          <div className="srows">
            {upcoming.map((session, idx) => {
              const client = state.clients.find(c => c.id === session.clientId);
              return (
                <SessionCard key={session.id}
                  session={session} client={client} lang={lang} dispatch={dispatch}
                  countPair={getEffectiveSessionCount(client, session, state.sessions)}
                  pkg={client ? renewalDue.get(client.id) : undefined} // undefined for sliding (non-contract) clients
                  isNow={isSessionNow(session)}
                  index={idx}
                  dateLabel={session.date === todayStr ? t(lang, 'today') : formatDate(session.date, lang)}
                  onRemind={(s, c) => sendReminderWhatsApp(c, s, state.messageTemplates, lang, state.sessions)}
                  onEdit={(s) => setActiveSession(s)}
                  onCancel={cancelSession}
                />
              );
            })}
          </div>
        )
      ) : (
        /* Compact view: all upcoming, tap for the action sheet */
        upcoming.length === 0 ? emptyState('noUpcoming', 'bookFirst') : (
          <div className="srows">
            {upcoming.map((session, idx) => {
              const status = getStatus(session.status, lang, t);
              const client = state.clients.find(c => c.id === session.clientId);
              // v2.8: effective count honours the PT's manual override for this period
              const { auto: monthAuto, effective: monthCount, override: monthOverride } = getEffectiveSessionCount(client, session, state.sessions);
              const pkg = client ? renewalDue.get(client.id) : undefined;
              const isNext = isSessionNow(session);
              return (
                <div key={session.id} className={`srow srow-tap${isNext ? ' is-now' : ''}`}
                  style={{ '--i': Math.min(idx, 8) }}
                  onClick={() => { haptic(); setActiveSession(session); }}>
                  <div className="srow-head">
                    <span className="srow-name">
                      {getClientName(session.clientId)}
                      <SessionCountPair auto={monthAuto} effective={monthCount} override={monthOverride} />
                    </span>
                    <span className="srow-time">{session.time}</span>
                  </div>
                  <div className="srow-meta">
                    <span className="srow-mark">{session.type}</span>
                    <span className="srow-date">{formatDate(session.date, lang)}</span>
                    <span className={`badge badge-${session.status}`}>{status.label}</span>
                    <span className="srow-chevron" style={{ marginInlineStart: 'auto', display: 'flex' }}>
                      <ChevronIcon size={16} />
                    </span>
                  </div>
                  {pkg && (
                    <div className="srow-load">
                      <Plates used={pkg.effective} size={pkg.contractSize} due={pkg.due} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Due for renewal — BELOW the upcoming list since v2.25 (fresh-eyes
          review #1): the thumb's question between sets is "who is next, right
          now", and a renewal block above the list cost that glance a scroll.
          Renewal is urgent but not more frequent than the next session. */}
      {renewalDueClients.length > 0 && (
        <div className="dashboard-renewal-section">
          <Bar label={t(lang, 'dueForRenewal')} count={renewalDueClients.length} />
          {renewalDueClients.map(c => {
            const { effective, contractSize } = renewalDue.get(c.id);
            return (
              <div key={c.id} className="rrow">
                <div className="rrow-main">
                  <div className="rrow-name">{c.name}</div>
                  {/* 🔴 Every plate on the accent: this package is spent. The accent
                      means load and urgency and nothing else — never chrome. */}
                  <div className="rrow-load">
                    <Plates used={effective} size={contractSize} due />
                    <span className="plate-count">{effective}/{contractSize}</span>
                  </div>
                </div>
                <button className="btn-renew" onClick={() => { haptic(); setRenewClient(c); }}>
                  {t(lang, 'renewContract')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Sheet Modal */}
      {activeSession && (() => {
        const session = activeSession;
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
                {session.type} · {session.duration}{t(lang, 'min')}
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
                  {/* The swatch replaces the emoji (v2.25): the per-type colour is a
                      legend the picker keeps — the drawn dot carries it, no emoji. */}
                  <span className="type-dot" style={{ background: stype.color }} />
                  {stype.label}
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

      {/* Renewal Modal — triggered from the Due for Renewal banner */}
      <RenewalModal
        show={!!renewClient}
        client={renewClient}
        clients={state.clients}
        sessions={state.sessions}
        onClose={() => setRenewClient(null)}
        dispatch={dispatch}
        lang={lang}
      />
    </div>
  );
}
