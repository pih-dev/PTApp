import React from 'react';
import Modal from './Modal';
import { t } from '../i18n';

// Help popup triggered by long-pressing the override input (500ms hold) or
// right-clicking it on desktop. Shown in two places: the client edit form
// (Clients.jsx) and the booking confirm popup (Schedule.jsx).
//
// The content explains the parsing rules (absolute vs delta vs empty) and
// offers a one-tap Clear button so the PT doesn't have to select+delete the
// field contents manually on mobile.
//
// Props:
//   show    — boolean toggle
//   onClose — called when the popup is dismissed (backdrop tap, Done button)
//   onClear — optional. When present, a destructive-styled Clear button appears
//             that invokes onClear + onClose. Omit to hide the button (e.g. in
//             a read-only context).
//   lang    — current language, passed through to t()
export default function OverrideHelpPopup({ show, onClose, onClear, lang }) {
  if (!show) return null;
  return (
    <Modal title={t(lang, 'overrideHelpTitle')} onClose={onClose}
      action={
        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
          onClick={onClose}>
          {t(lang, 'done')}
        </button>
      }>
      <div className="override-help-body">{t(lang, 'overrideHelpBody')}</div>
      {onClear && (
        <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', width: '100%' }}
          onClick={() => { onClear(); onClose(); }}>
          {t(lang, 'overrideClear')}
        </button>
      )}
    </Modal>
  );
}
