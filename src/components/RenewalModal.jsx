import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { t } from '../i18n';
import { getCurrentPackage, today, localDateStr } from '../utils';

// Renewal modal — closes the client's current package and opens a new one.
// Called from Clients tab card Renew button + Dashboard "Due for renewal" section rows.
export default function RenewalModal({ show, client, sessions, onClose, dispatch, lang }) {
  const [contractSize, setContractSize] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodUnit, setPeriodUnit] = useState('month');
  const [periodValue, setPeriodValue] = useState('1');
  const [notes, setNotes] = useState('');
  // v2.9.2: surface the case where another device already renewed while this modal was open.
  // The reducer silently no-ops if the current package is already closed (utils.js:769) — without
  // this UI cue the PT would tap Confirm, the modal would close, and nothing would have happened.
  const [error, setError] = useState('');

  // Initialize defaults on open — derived from client's current package + latest session
  useEffect(() => {
    if (!show || !client) return;
    const pkg = getCurrentPackage(client);

    // Default new period start: day after last session date for this client
    const clientSessions = (sessions || [])
      .filter(s => s.clientId === client.id && (s.status !== 'cancelled' || s.cancelCounted))
      .map(s => s.date)
      .sort();
    const lastSessionDate = clientSessions[clientSessions.length - 1];
    let defaultStart = today();
    if (lastSessionDate) {
      const d = new Date(lastSessionDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      defaultStart = localDateStr(d);
    }

    // Default to the previous contract size when renewing one. For brand-new contracts
    // (PT enabling contracts on a previously open-ended client), default to 10 — the PT's
    // typical pre-paid package. PT can always edit before confirming.
    setContractSize(pkg.contractSize != null ? String(pkg.contractSize) : '10');
    setPeriodStart(defaultStart);
    setPeriodUnit(pkg.periodUnit || 'month');
    setPeriodValue(String(pkg.periodValue || 1));
    setNotes('');
    setError('');
    // `sessions` is intentionally excluded from deps. It's the full app-state array —
    // every debounced sync (every ~1s on unstable Beirut internet) creates a new
    // reference, which would re-run this effect and clobber the PT's in-progress
    // edits. We only need to seed defaults when the modal OPENS (show flips false→true)
    // or the target client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, client]);

  if (!show || !client) return null;

  const confirm = () => {
    const cs = contractSize.trim();
    const contractNum = cs === '' ? null : (Number.isInteger(+cs) && +cs >= 1 ? +cs : null);
    if (!periodStart) return;
    // Pre-check the reducer's silent-noop condition: if the current package was already
    // closed (e.g. another device renewed during the modal session), surface that and
    // keep the modal open so the PT understands nothing happened.
    const livePkg = getCurrentPackage(client);
    if (livePkg && livePkg.end != null) {
      setError(t(lang, 'renewalAlreadyClosed'));
      return;
    }
    dispatch({
      type: 'RENEW_PACKAGE',
      payload: {
        clientId: client.id,
        newPackageStart: periodStart,
        newContractSize: contractNum,
        newPeriodUnit: periodUnit,
        newPeriodValue: +periodValue >= 1 ? +periodValue : 1,
        newNotes: notes,
        closedBy: 'manual',
        trigger: null,
      },
    });
    onClose();
  };

  return (
    <Modal
      title={`${t(lang, 'renewContract')} — ${client.name}`}
      onClose={onClose}
      action={<button className="btn-primary" onClick={confirm}>{t(lang, 'confirmRenewal')}</button>}
    >
      {error && (
        <div className="booking-renewal-banner" style={{ marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}
      <div className="field">
        <label className="field-label">{t(lang, 'contractSize')}</label>
        <input type="number" min="1" className="input" value={contractSize}
          onChange={e => setContractSize(e.target.value.replace(/[^0-9]/g, ''))} />
      </div>
      <div className="field">
        <label className="field-label">{t(lang, 'newPeriodStart')}</label>
        <input type="date" required className="input" value={periodStart}
          onChange={e => setPeriodStart(e.target.value)} />
      </div>
      <div className="flex-row-12">
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">{t(lang, 'periodLengthValue')}</label>
          <input type="number" min="1" className="input" value={periodValue}
            onChange={e => setPeriodValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={e => { if (!e.target.value || +e.target.value < 1) setPeriodValue('1'); }} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">{t(lang, 'periodLengthUnit')}</label>
          <select className="select" value={periodUnit}
            onChange={e => setPeriodUnit(e.target.value)}>
            <option value="day">{t(lang, 'unitDay')}</option>
            <option value="week">{t(lang, 'unitWeek')}</option>
            <option value="month">{t(lang, 'unitMonth')}</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label">{t(lang, 'renewalNotesOptional')}</label>
        <input className="input" placeholder={t(lang, 'renewalNotesPlaceholder')} value={notes}
          onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
