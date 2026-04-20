import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { WhatsAppIcon, EditIcon, TrashIcon, PhoneIcon, ChevronIcon } from './Icons';
import { genId, formatPhone, phoneMatchesQuery, getDefaultCountryCode, setDefaultCountryCode, SESSION_TYPES, FOCUS_TAGS, PERIOD_OPTIONS, getMonthlySessionCount, formatDate, capitalizeName, localMonthStr, getStatus, haptic, parseSessionCountOverride, getClientPeriod, getPeriodSessionCount, today } from '../utils';
import OverrideHelpPopup from './OverrideHelpPopup';
import SessionCountPair from './SessionCountPair';
import { t, dateLocale } from '../i18n';

export default function Clients({ state, dispatch, lang }) {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '', periodStart: '', periodLength: '', sessionOverride: '' });
  const [search, setSearch] = useState('');
  const [countryCode, setCountryCode] = useState(getDefaultCountryCode);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => localMonthStr(new Date()));
  const [deletePrompt, setDeletePrompt] = useState(null); // client to confirm delete
  const [overrideHelp, setOverrideHelp] = useState(false); // long-press or right-click on override input
  // long-press timer ref — 500ms hold opens the help popup (same pattern as debug panel)
  const overrideHoldRef = useRef(null);

  const openAdd = () => {
    setForm({ name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '', periodStart: '', periodLength: '', sessionOverride: '' });
    setEditingClient(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    // Only pre-fill sessionOverride if the stored override is for the CURRENT period.
    // Stale overrides (from a prior month/period) are ignored — they'll be overwritten
    // on save, or left inert if the PT doesn't touch the field. This mirrors read-side
    // behaviour in getEffectiveSessionCount.
    const nowPeriod = getClientPeriod(c, today());
    const overrideIsCurrent = c.sessionCountOverride && c.overridePeriodStart === nowPeriod.start;
    const overrideStr = overrideIsCurrent
      ? (c.sessionCountOverride.type === 'delta'
          ? (c.sessionCountOverride.value >= 0 ? '+' : '') + c.sessionCountOverride.value
          : String(c.sessionCountOverride.value))
      : '';
    setForm({
      name: c.name, nickname: c.nickname || '', phone: c.phone, gender: c.gender || '',
      birthdate: c.birthdate || '', notes: c.notes || '',
      periodStart: c.periodStart || '', periodLength: c.periodLength || '',
      sessionOverride: overrideStr,
    });
    setEditingClient(c);
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    // Parse override + stamp period so we can detect rollover on read.
    // Empty input → clear stored override fields (set to null, not undefined, so they
    // serialise through JSON.stringify and overwrite any remote stale value).
    const { sessionOverride, ...rest } = form;
    const parsed = parseSessionCountOverride(sessionOverride);
    let overrideFields;
    if (parsed) {
      const periodForStamp = getClientPeriod({ ...rest }, today());
      overrideFields = { sessionCountOverride: parsed, overridePeriodStart: periodForStamp.start };
    } else {
      overrideFields = { sessionCountOverride: null, overridePeriodStart: null };
    }
    if (editingClient) {
      dispatch({ type: 'EDIT_CLIENT', payload: { ...editingClient, ...rest, ...overrideFields } });
    } else {
      dispatch({ type: 'ADD_CLIENT', payload: { id: genId(), ...rest, ...overrideFields } });
    }
    setShowForm(false);
  };

  // Long-press / right-click handlers for the override input → open help popup.
  // touchmove/touchend cancel the timer so scrolling doesn't trigger it.
  const startOverrideHold = () => {
    if (overrideHoldRef.current) clearTimeout(overrideHoldRef.current);
    overrideHoldRef.current = setTimeout(() => { haptic(); setOverrideHelp(true); }, 500);
  };
  const cancelOverrideHold = () => {
    if (overrideHoldRef.current) { clearTimeout(overrideHoldRef.current); overrideHoldRef.current = null; }
  };

  // Excludes cancelled — matches the PT's mental model (cancelled = "didn't happen")
  // and avoids the confusing mismatch with the expanded view (which shows cancelled separately).
  const sessionCount = (clientId) => state.sessions.filter(s => s.clientId === clientId && s.status !== 'cancelled').length;

  // Month navigation helpers
  const shiftMonth = (dir) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setViewMonth(localMonthStr(d));
  };
  const monthLabel = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString(dateLocale(lang), { month: 'long', year: 'numeric' });
  };

  // Get sessions for a client in a specific month
  const getClientMonthSessions = (clientId, month) =>
    state.sessions
      .filter(s => s.clientId === clientId && s.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const toggleExpand = (clientId) => {
    if (expandedId === clientId) {
      setExpandedId(null);
    } else {
      setExpandedId(clientId);
      setViewMonth(localMonthStr(new Date()));
    }
  };

  const filteredClients = search.trim()
    ? state.clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        phoneMatchesQuery(c.phone, search)
      )
    : state.clients;

  return (
    <div>
      <div className="section-title section-header" style={{ marginTop: 16 }}>
        <span>{t(lang, 'myClients')} ({state.clients.length})</span>
        <button className="btn-sm" onClick={openAdd}>{'+ ' + t(lang, 'add')}</button>
      </div>

      {state.clients.length > 0 && (
        <input
          className="input"
          placeholder={t(lang, 'searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
      )}

      {state.clients.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👤</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t(lang, 'noClients')}</div>
          <div>{t(lang, 'tapAdd')}</div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div>{t(lang, 'noMatch')} "{search}"</div>
        </div>
      ) : (
        filteredClients.map(c => {
          const isExpanded = expandedId === c.id;
          const monthSessions = isExpanded ? getClientMonthSessions(c.id, viewMonth) : [];
          const monthTotal = isExpanded ? getMonthlySessionCount(state.sessions, c.id, viewMonth) : 0;
          const completedCount = isExpanded ? monthSessions.filter(s => s.status === 'completed').length : 0;
          const cancelledCount = isExpanded ? monthSessions.filter(s => s.status === 'cancelled').length : 0;
          return (
          <div key={c.id} className="card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              onClick={() => toggleExpand(c.id)}>
              <div style={{ flex: 1 }}>
                <div className="client-name">
                  {c.name}
                  <ChevronIcon size={14} style={{
                    marginInlineStart: 6,
                    color: 'var(--t4)',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />
                </div>
                <div className="client-phone">
                  <PhoneIcon />
                  {c.phone}
                </div>
                {(c.gender || c.birthdate) && (
                  <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 2 }}>
                    {c.gender === 'male' ? 'M' : c.gender === 'female' ? 'F' : ''}
                    {c.gender && c.birthdate ? ' · ' : ''}
                    {c.birthdate || ''}
                  </div>
                )}
                {c.notes && <div className="client-notes">{c.notes}</div>}
                <div className="session-count">{sessionCount(c.id)} {t(lang, 'sessionWord')}</div>
              </div>
              <div className="flex-row" onClick={e => e.stopPropagation()}>
                <button className="btn-whatsapp" style={{ padding: '8px 10px' }}
                  onClick={() => window.open(`https://wa.me/${formatPhone(c.phone)}?text=${encodeURIComponent(`Hi ${c.nickname || c.name.split(' ')[0]}! 💪`)}`, '_blank')}>
                  <WhatsAppIcon size={18} />
                </button>
                <button className="btn-ghost" onClick={() => openEdit(c)}>
                  <EditIcon />
                </button>
                <button className="btn-danger-sm" onClick={() => { haptic(); setDeletePrompt(c); }}>
                  <TrashIcon />
                </button>
              </div>
            </div>

            {/* Expanded: month navigator + session list */}
            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--sep)', paddingTop: 12 }}>
                {/* Month navigator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 18 }} onClick={() => shiftMonth(-1)}>‹</button>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{monthLabel(viewMonth)}</div>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 18 }} onClick={() => shiftMonth(1)}>›</button>
                </div>

                {/* Month summary */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12, color: 'var(--t4)' }}>
                  <span>{monthTotal} {t(lang, 'sessionWord')}</span>
                  {completedCount > 0 && <span style={{ color: '#10B981' }}>{completedCount} {t(lang, 'completed')}</span>}
                  {cancelledCount > 0 && <span style={{ color: '#EF4444' }}>{cancelledCount} {t(lang, 'cancelled')}</span>}
                </div>

                {/* Session list */}
                {monthSessions.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--t4)', textAlign: 'center', padding: '8px 0' }}>
                    {t(lang, 'noSessionsMonth')}
                  </div>
                ) : (
                  monthSessions.map(s => {
                    const st = SESSION_TYPES.find(stype => stype.label === s.type) || SESSION_TYPES[5];
                    const status = getStatus(s.status, lang, t);
                    const tags = FOCUS_TAGS[s.type] || FOCUS_TAGS.Custom;
                    const focus = s.focus || [];
                    const toggleFocus = (tag) => {
                      const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
                      dispatch({ type: 'UPDATE_SESSION', payload: { id: s.id, focus: updated } });
                    };
                    return (
                      <div key={s.id} style={{
                        padding: '10px 0', borderBottom: '1px solid var(--sep)', fontSize: 13
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: 'var(--t2)' }}>
                              {formatDate(s.date, lang)} · {s.time} · {s.duration}{t(lang, 'min')}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--t5)', marginTop: 2 }}>
                              {st.emoji} {s.type}
                            </div>
                          </div>
                          <span className={`badge badge-${s.status}`} style={{ fontSize: 11 }}>{status.label}</span>
                        </div>
                        {/* Editable focus tags */}
                        <div className="focus-row" style={{ marginTop: 6 }}>
                          {tags.map(tag => (
                            <button key={tag} className={`focus-tag${focus.includes(tag) ? ' active' : ''}`}
                              onClick={() => { haptic(); toggleFocus(tag); }}>{tag}</button>
                          ))}
                        </div>
                        {/* Editable session notes — see Dashboard.jsx comment, no readOnly (iOS bug) */}
                        <textarea key={s.sessionNotes || ''} className={`focus-notes${s.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
                          defaultValue={s.sessionNotes || ''}
                          onFocus={e => { e.target.classList.add('editing'); }}
                          onBlur={e => {
                            e.target.classList.remove('editing');
                            e.target.classList.toggle('has-content', e.target.value.trim() !== '');
                            if (e.target.value !== (s.sessionNotes || '')) {
                              dispatch({ type: 'UPDATE_SESSION', payload: { id: s.id, sessionNotes: e.target.value } });
                            }
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          );
        })
      )}

      {/* Client form modal — add or edit */}
      {showForm && (
        <Modal title={editingClient ? t(lang, 'editClient') : t(lang, 'newClient')} onClose={() => setShowForm(false)}
          action={<button className="btn-primary" onClick={save}>{editingClient ? t(lang, 'saveChanges') : t(lang, 'addClient')}</button>}>
          <div className="field">
            <label className="field-label">{t(lang, 'fullName')}</label>
            <input className="input" placeholder="e.g. Ahmad Khalil" value={form.name}
              onChange={e => {
                const name = e.target.value;
                const firstName = capitalizeName(name).split(' ')[0];
                // Auto-populate nickname with first name (only if nickname hasn't been manually edited)
                setForm(p => ({ ...p, name, nickname: p.nickname === '' || p.nickname === capitalizeName(p.name).split(' ')[0] ? firstName : p.nickname }));
              }}
              onBlur={e => setForm(p => ({ ...p, name: capitalizeName(p.name) }))} />
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'nickname')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'nickLabel')}</span></label>
            <input className="input" placeholder="e.g. Ahmad" value={form.nickname}
              onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'phone')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ width: 72, flexShrink: 0, textAlign: 'center' }}
                value={`+${countryCode}`}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCountryCode(val);
                  setDefaultCountryCode(val);
                }}
              />
              <input className="input" style={{ flex: 1 }} placeholder="e.g. 71 123 456" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'gender')}</label>
              <select className="select" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">{t(lang, 'male')}</option>
                <option value="female">{t(lang, 'female')}</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'birthdate')}</label>
              <input type="date" className="input" value={form.birthdate}
                onChange={e => setForm(p => ({ ...p, birthdate: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">{t(lang, 'notesOpt')}</label>
            <input className="input" placeholder="e.g. Bad knee, prefers mornings" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          {/* Billing period — optional, defaults to calendar month */}
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'periodStart')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'periodOptional')}</span></label>
              <input type="date" className="input" value={form.periodStart}
                onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'periodLength')}</label>
              <select className="select" value={form.periodLength} onChange={e => {
                const v = e.target.value;
                // Clearing periodLength (back to default) also clears periodStart for clean data
                setForm(p => v ? { ...p, periodLength: v } : { ...p, periodLength: '', periodStart: '' });
              }}>
                <option value="">{t(lang, 'periodDefault')}</option>
                {PERIOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          {/* v2.8 Manual session count override — long-press opens help, right-click on desktop.
              Live preview shows auto→effective so the PT sees the result before saving. */}
          {(() => {
            // Preview context: use today's period and auto count for the client-in-progress.
            // For a new client, sessions array is empty so auto is 0 — fine.
            const clientForPeriod = editingClient
              ? { ...editingClient, periodStart: form.periodStart, periodLength: form.periodLength }
              : { periodStart: form.periodStart, periodLength: form.periodLength };
            const period = getClientPeriod(clientForPeriod, today());
            const auto = editingClient
              ? getPeriodSessionCount(state.sessions, editingClient.id, period.start, period.end)
              : 0;
            const parsed = parseSessionCountOverride(form.sessionOverride);
            const effective = parsed
              ? (parsed.type === 'absolute' ? parsed.value : Math.max(0, auto + parsed.value))
              : auto;
            return (
              <div className="field period-override-row">
                <label className="field-label">{t(lang, 'countAuto')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="period-count-preview" style={{ flex: '0 0 auto', minWidth: 72 }}>
                    <SessionCountPair auto={auto} effective={effective} override={parsed} prefix="" />
                  </div>
                  <input
                    className="input override-input"
                    style={{ flex: 1 }}
                    placeholder={t(lang, 'overridePlaceholder')}
                    value={form.sessionOverride}
                    inputMode="text"
                    onChange={e => setForm(p => ({ ...p, sessionOverride: e.target.value }))}
                    onTouchStart={startOverrideHold}
                    onTouchEnd={cancelOverrideHold}
                    onTouchMove={cancelOverrideHold}
                    onTouchCancel={cancelOverrideHold}
                    onMouseDown={startOverrideHold}
                    onMouseUp={cancelOverrideHold}
                    onMouseLeave={cancelOverrideHold}
                    onContextMenu={e => { e.preventDefault(); setOverrideHelp(true); }}
                  />
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      <OverrideHelpPopup
        show={overrideHelp}
        onClose={() => setOverrideHelp(false)}
        onClear={() => setForm(p => ({ ...p, sessionOverride: '' }))}
        lang={lang}
      />


      {/* Delete confirmation modal — replaces native confirm() */}
      {deletePrompt && (
        <Modal title={t(lang, 'deleteClient')} onClose={() => setDeletePrompt(null)}
          action={
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
              onClick={() => setDeletePrompt(null)}>
              {t(lang, 'cancel')}
            </button>
          }>
          <div className="success-center">
            <div className="success-icon" style={{ fontSize: 40 }}>⚠️</div>
            <div className="success-name">{deletePrompt.name}</div>
            <div className="success-detail">{t(lang, 'deleteConfirmMsg')}</div>
          </div>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', marginBottom: 8, width: '100%' }}
            onClick={() => {
              dispatch({ type: 'DELETE_CLIENT', payload: deletePrompt.id });
              setDeletePrompt(null);
            }}>
            {t(lang, 'confirmDelete')}
          </button>
        </Modal>
      )}
    </div>
  );
}
