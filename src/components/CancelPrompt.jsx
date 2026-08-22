import React from 'react';
import Modal from './Modal';
import { CloseIcon } from './Icons';
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
        {/* Drawn X on --warn — cancelled's colour, never an emoji (v2.25). */}
        <div className="modal-mark" style={{ color: 'var(--warn)' }}><CloseIcon size={40} /></div>
        <div className="success-name">{clientName}</div>
        <div className="success-detail">{formatDate(session.date, lang)} {t(lang, 'at')} {session.time}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        <button className="btn-primary" style={{ background: '#EF4444', color: '#fff' }}
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
