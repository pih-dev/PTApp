import React from 'react';
import Modal from './Modal';
import { formatDate } from '../utils';
import { t } from '../i18n';

// Shared cancel-session prompt — used by Dashboard and Schedule.
// Shows Count (no-show) / Forgive (legitimate cancel) / Keep options.
export default function CancelPrompt({ session, clientName, lang, onConfirm, onClose }) {
  return (
    <Modal title={t(lang, 'cancelSession')} onClose={onClose}
      action={
        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
          onClick={onClose}>
          {t(lang, 'keepSession')}
        </button>
      }>
      <div className="success-center">
        <div className="success-icon" style={{ fontSize: 40 }}>❌</div>
        <div className="success-name">{clientName}</div>
        <div className="success-detail">{formatDate(session.date, lang)} {t(lang, 'at')} {session.time}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
          onClick={() => onConfirm(true)}>
          {t(lang, 'countNoShow')}
        </button>
        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
          onClick={() => onConfirm(false)}>
          {t(lang, 'forgive')}
        </button>
      </div>
    </Modal>
  );
}
