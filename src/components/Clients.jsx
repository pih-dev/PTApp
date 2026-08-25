import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { WhatsAppIcon, EditIcon, TrashIcon, PhoneIcon, ChevronIcon, BarMark } from './Icons';
import { genId, phoneMatchesQuery, getDefaultCountryCode, setDefaultCountryCode, getSessionType, getFocusTags, getMonthlySessionCount, formatDate, capitalizeName, localMonthStr, getStatus, haptic, parseSessionCountOverride, formatOverrideDraft, applyOverride, getRenewalDueMap, getCurrentPackage, getEffectivePeriod, getPeriodSessionCount, getEffectiveClientCount, today, friendly, openWhatsApp } from '../utils';
import OverrideHelpPopup from './OverrideHelpPopup';
import RenewalModal from './RenewalModal';
import SessionCountPair from './SessionCountPair';
import Bar from './Bar';
import EvalSection from './EvalSection';
import { t, dateLocale } from '../i18n';

export default function Clients({ state, dispatch, lang }) {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({
    name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '',
    periodStart: '', periodUnit: 'month', periodValue: '1', contractSize: '',
    sessionOverride: '',
  });
  const [search, setSearch] = useState('');
  const [countryCode, setCountryCode] = useState(getDefaultCountryCode);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => localMonthStr(new Date()));
  const [deletePrompt, setDeletePrompt] = useState(null); // client to confirm delete
  const [overrideHelp, setOverrideHelp] = useState(false); // long-press or right-click on override input
  const [renewClient, setRenewClient] = useState(null); // client pending renewal, null = modal hidden
  // long-press timer ref — 500ms hold opens the help popup (same pattern as debug panel)
  const overrideHoldRef = useRef(null);

  // v2.10.3 (review P5): shared renewal selector — same map Schedule and Dashboard read,
  // memoized in utils on the (clients, sessions) array pair. One rule, three tabs.
  const renewalDueMap = getRenewalDueMap(state.clients, state.sessions);

  const openAdd = () => {
    setForm({
      name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '',
      periodStart: '', periodUnit: 'month', periodValue: '1', contractSize: '',
      sessionOverride: '',
    });
    setEditingClient(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    const pkg = getCurrentPackage(c);
    const period = getEffectivePeriod(pkg, today());
    // v2.10.1: serialization shared with Schedule.jsx via formatOverrideDraft
    const overrideStr = formatOverrideDraft(pkg, period);
    setForm({
      name: c.name, nickname: c.nickname || '', phone: c.phone, gender: c.gender || '',
      birthdate: c.birthdate || '', notes: c.notes || '',
      periodStart: pkg.start || '',
      periodUnit: pkg.periodUnit || 'month',
      periodValue: String(pkg.periodValue || 1),
      contractSize: pkg.contractSize == null ? '' : String(pkg.contractSize),
      sessionOverride: overrideStr,
    });
    setEditingClient(c);
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return;

    // Parse contract and override
    const contractNum = form.contractSize.trim();
    const contractSize = contractNum === '' ? null : (Number.isInteger(+contractNum) && +contractNum >= 1 ? +contractNum : null);

    const parsedOverride = parseSessionCountOverride(form.sessionOverride);

    // Build the current package (edit or create)
    const existingPkg = editingClient ? getCurrentPackage(editingClient) : null;
    const newPkgStart = form.periodStart || (existingPkg ? existingPkg.start : today());
    const pkgShell = {
      id: existingPkg && existingPkg.id ? existingPkg.id : 'pkg_' + genId(),
      start: newPkgStart,
      end: null,
      periodUnit: form.periodUnit || 'month',
      periodValue: +form.periodValue || 1,
      contractSize,
      notes: existingPkg ? existingPkg.notes || '' : '',
      closedAt: null,
      closedBy: null,
    };

    // Override gets stamped with the effective period start computed against the NEW pkg settings
    const probePeriod = getEffectivePeriod(pkgShell, today());
    pkgShell.sessionCountOverride = parsedOverride
      ? { ...parsedOverride, periodStart: probePeriod.start }
      : null;

    // Compose client — strip form-only fields
    const { sessionOverride, periodStart, periodUnit, periodValue, contractSize: _cs, ...restForm } = form;
    if (editingClient) {
      // v2.10.4 (review P7): profile fields and the package travel in separate actions.
      // EDIT_CLIENT carries the form's profile fields (snapshot packages ride along
      // unchanged — no hand-rolled array surgery here anymore); EDIT_CURRENT_PACKAGE
      // owns the replace-last write + audit diffing (package_edited / override_set /
      // override_cleared). React 18 batches both dispatches into one render+save.
      dispatch({
        type: 'EDIT_CLIENT',
        payload: { ...editingClient, ...restForm },
      });
      dispatch({
        type: 'EDIT_CURRENT_PACKAGE',
        payload: { clientId: editingClient.id, pkg: pkgShell },
      });
    } else {
      dispatch({
        type: 'ADD_CLIENT',
        payload: { id: genId(), ...restForm, packages: [pkgShell] },
      });
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
      <Bar label={t(lang, 'myClients')} count={state.clients.length}>
        <button className="btn-sm" onClick={openAdd}>{'+ ' + t(lang, 'add')}</button>
      </Bar>

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
          <div className="empty-mark"><BarMark /></div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t(lang, 'noClients')}</div>
          <div>{t(lang, 'tapAdd')}</div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="empty">
          <div className="empty-mark"><BarMark /></div>
          <div>{t(lang, 'noMatch')} "{search}"</div>
        </div>
      ) : (
        filteredClients.map(c => {
          const isExpanded = expandedId === c.id;
          const monthSessions = isExpanded ? getClientMonthSessions(c.id, viewMonth) : [];
          const monthTotal = isExpanded ? getMonthlySessionCount(state.sessions, c.id, viewMonth) : 0;
          const completedCount = isExpanded ? monthSessions.filter(s => s.status === 'completed').length : 0;
          const cancelledCount = isExpanded ? monthSessions.filter(s => s.status === 'cancelled').length : 0;
          // v2.10.3 (review P5): one map read per card (gate wrapper class, pill, Renew
          // button) — the per-card isRenewalDue + getCurrentPackage + getEffectiveClientCount
          // passes now happen once per data change inside getRenewalDueMap.
          const renewalEntry = renewalDueMap.get(c.id);
          const renewalDue = renewalEntry?.due === true;
          const renewalPkg = renewalDue ? renewalEntry.pkg : null;
          const renewalEffective = renewalDue ? renewalEntry.effective : 0;
          return (
          <div key={c.id} className={`card${renewalDue ? ' card-renewal-due' : ''}`} style={{ cursor: 'pointer' }}>
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
                {renewalDue && (
                  <div className="renewal-pill">
                    {t(lang, 'renewalDue')} · {t(lang, 'session')} {renewalEffective}/{renewalPkg.contractSize}
                  </div>
                )}
                {(c.gender || c.birthdate) && (
                  <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 2 }}>
                    {c.gender === 'male' ? 'M' : c.gender === 'female' ? 'F' : ''}
                    {c.gender && c.birthdate ? ' · ' : ''}
                    {c.birthdate || ''}
                  </div>
                )}
                {(() => {
                  // Latest eval classification at a glance (newest by date)
                  const latest = (state.evaluations || [])
                    .filter(ev => ev.clientId === c.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  // v2.46 (review I1): classification can legitimately be null —
                  // both kernels emit it when a chart key fails to resolve, and
                  // EvalSection guards it. Unguarded .charAt(0) here threw on one
                  // such record and took the whole Clients tab down with it.
                  return latest && latest.frozen.classification ? (
                    <span className={`badge badge-class-${latest.frozen.classification}`}
                      style={{ fontSize: 10, marginBottom: 2, display: 'inline-block' }}>
                      {t(lang, 'class' + latest.frozen.classification.charAt(0).toUpperCase() + latest.frozen.classification.slice(1))}
                    </span>
                  ) : null;
                })()}
                {c.notes && <div className="client-notes">{c.notes}</div>}
                <div className="session-count">{sessionCount(c.id)} {t(lang, 'sessionWord')}</div>
              </div>
              <div className="flex-row" onClick={e => e.stopPropagation()}>
                {renewalDue && (
                  <button className="btn-renew" onClick={(e) => { e.stopPropagation(); haptic(); setRenewClient(c); }}>
                    {t(lang, 'renewContract')}
                  </button>
                )}
                {/* v2.10.1: greeting via i18n (was hardcoded English in Arabic mode) and
                    wa.me URL via the shared openWhatsApp helper (was a third inline copy). */}
                <button className="btn-whatsapp" style={{ padding: '8px 10px' }}
                  onClick={() => openWhatsApp(c, t(lang, 'quickGreeting').replace('{name}', friendly(c)))}>
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
              <div style={{ marginTop: 4 }}>
                {/* v2.11.1: evaluations moved to the TOP of the expanded card (was below sessions) */}
                <EvalSection client={c} state={state} dispatch={dispatch} lang={lang} />
                {/* Month navigator */}
                <div className="subbar" style={{ marginTop: 14 }}>
                  <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 18 }} onClick={() => shiftMonth(-1)}>‹</button>
                  <span className="num">{monthLabel(viewMonth)}</span>
                  <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 18 }} onClick={() => shiftMonth(1)}>›</button>
                </div>

                {/* Month summary */}
                <div className="num" style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12, color: 'var(--chalk-dim)' }}>
                  <span>{monthTotal} {t(lang, 'sessionWord')}</span>
                  {completedCount > 0 && <span style={{ color: 'var(--ok)' }}>{completedCount} {t(lang, 'completed')}</span>}
                  {cancelledCount > 0 && <span style={{ color: 'var(--warn)' }}>{cancelledCount} {t(lang, 'cancelled')}</span>}
                </div>

                {/* Session list */}
                {monthSessions.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--t4)', textAlign: 'center', padding: '8px 0' }}>
                    {t(lang, 'noSessionsMonth')}
                  </div>
                ) : (
                  monthSessions.map(s => {
                    const st = getSessionType(s.type);
                    const status = getStatus(s.status, lang, t);
                    const tags = getFocusTags(s.type);
                    const focus = s.focus || [];
                    const toggleFocus = (tag) => {
                      const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
                      dispatch({ type: 'UPDATE_SESSION', payload: { id: s.id, focus: updated } });
                    };
                    return (
                      <div key={s.id} style={{
                        padding: '10px 0', borderBottom: '2px solid var(--bar)', fontSize: 13
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: 'var(--t2)' }}>
                              {formatDate(s.date, lang)} · {s.time} · {s.duration}{t(lang, 'min')}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--t5)', marginTop: 2 }}>
                              {s.type}
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
            <input className="input" placeholder={t(lang, 'namePlaceholder')} value={form.name}
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
            <input className="input" placeholder={t(lang, 'nicknamePlaceholder')} value={form.nickname}
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
              <input className="input" style={{ flex: 1 }} placeholder={t(lang, 'phonePlaceholder')} value={form.phone}
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
            <input className="input" placeholder={t(lang, 'clientNotesPlaceholder')} value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          {/* Billing — period + contract. Edits the current open package. */}
          <div className="field" style={{ borderTop: '2px solid var(--bar)', paddingTop: 12, marginTop: 4 }}>
            {/* Status line — read-only, shows package position */}
            {editingClient && (() => {
              const pkg = getCurrentPackage(editingClient);
              const pkgCount = (editingClient.packages || []).length;
              const { effective } = getEffectiveClientCount(editingClient, state.sessions);
              const labelNum = pkg.contractSize != null
                ? `${effective} / ${pkg.contractSize}`
                : `${effective} ${t(lang, 'sessionWord')}`;
              return (
                <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 8 }}>
                  {t(lang, 'packageNumber')} #{pkgCount} · {t(lang, 'session')} {labelNum}
                </div>
              );
            })()}
          </div>
          <div className="field">
            <label className="field-label">
              {t(lang, 'periodStart')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'periodOptional')}</span>
            </label>
            <input type="date" className="input" value={form.periodStart}
              onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))} />
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'periodLengthValue')}</label>
              <input type="number" min="1" className="input" value={form.periodValue}
                onChange={e => setForm(p => ({ ...p, periodValue: e.target.value.replace(/[^0-9]/g, '') }))}
                onBlur={e => { if (!e.target.value || +e.target.value < 1) setForm(p => ({ ...p, periodValue: '1' })); }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t(lang, 'periodLengthUnit')}</label>
              <select className="select" value={form.periodUnit}
                onChange={e => setForm(p => ({ ...p, periodUnit: e.target.value }))}>
                <option value="day">{t(lang, 'unitDay')}</option>
                <option value="week">{t(lang, 'unitWeek')}</option>
                <option value="month">{t(lang, 'unitMonth')}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">
              {t(lang, 'contractSize')} <span style={{ fontWeight: 400, color: 'var(--t4)' }}>{t(lang, 'contractOptional')}</span>
            </label>
            <input type="number" min="1" className="input" placeholder={t(lang, 'contractPlaceholder')}
              value={form.contractSize}
              onChange={e => setForm(p => ({ ...p, contractSize: e.target.value.replace(/[^0-9]/g, '') }))} />
          </div>
          {/* Override row — live preview of auto → effective using current form state */}
          {(() => {
            const pkgForPeriod = {
              id: 'preview', start: form.periodStart || today(),
              end: null,
              periodUnit: form.periodUnit, periodValue: +form.periodValue || 1,
              contractSize: form.contractSize === '' ? null : +form.contractSize,
              sessionCountOverride: null, notes: '', closedAt: null, closedBy: null,
            };
            const period = getEffectivePeriod(pkgForPeriod, today());
            const auto = editingClient
              ? getPeriodSessionCount(state.sessions, editingClient.id, period.start, period.end)
              : 0;
            const parsed = parseSessionCountOverride(form.sessionOverride);
            // v2.10.1: same kernel as the count helpers (applyOverride) — this preview
            // previously re-implemented the absolute/delta math inline, so a semantics
            // change in utils would have left the form showing a different number than
            // every card (the v2.9.6 "two semantics" trap). Stamp the draft override
            // with the preview period start so applyOverride treats it as active.
            const { effective } = applyOverride(
              auto,
              parsed ? { ...parsed, periodStart: period.start } : null,
              period.start
            );
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
      <RenewalModal
        show={!!renewClient}
        client={renewClient}
        clients={state.clients}
        sessions={state.sessions}
        onClose={() => setRenewClient(null)}
        dispatch={dispatch}
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
            {/* Drawn, not an emoji (v2.25). Red is legal here: this IS the
                destructive act the colour is reserved for. */}
            <div className="modal-mark" style={{ color: '#EF4444' }}><TrashIcon size={40} /></div>
            <div className="success-name">{deletePrompt.name}</div>
            <div className="success-detail">{t(lang, 'deleteConfirmMsg')}</div>
          </div>
          <button className="btn-primary" style={{ background: '#EF4444', color: '#fff', marginBottom: 8, width: '100%' }}
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
