import React, { useState } from 'react';
import Modal from './Modal';
import { validateToken, saveToken } from '../sync';
import { t } from '../i18n';

// v2.12.1 — replace the stored GitHub sync token WITHOUT touching local data.
// Born from the Jun-30 incident: the fine-grained PAT expired, every device went
// permanently red, and there was NO UI to enter a new token (TokenSetup only
// renders when no token exists at all). Opened from the red sync dot when the
// failure is TOKEN_EXPIRED, and any time from General → Update sync token.
// Same validate-then-save flow as TokenSetup; local data is never cleared.
export default function TokenUpdateModal({ lang, onClose, onSaved }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const valid = await validateToken(trimmed);
      if (valid) {
        saveToken(trimmed);
        onSaved(); // owner clears its token-expired flag and retries the sync
      } else {
        setError(t(lang, 'tokenInvalid'));
      }
    } catch {
      setError(t(lang, 'tokenFailed'));
    }
    setLoading(false);
  };

  return (
    <Modal title={t(lang, 'updateToken')} onClose={onClose}
      action={
        <button className="btn-primary" disabled={loading || !token.trim()}
          style={{ opacity: loading || !token.trim() ? 0.5 : 1 }}
          onClick={handleSave}>
          {loading ? t(lang, 'tokenConnecting') : t(lang, 'tokenConnect')}
        </button>
      }>
      <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 0 }}>
        {t(lang, 'tokenExpiredMsg')}
      </p>
      <input
        type="text"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder={t(lang, 'tokenPlaceholder')}
        className="input"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {error && <p className="setup-error">{error}</p>}
    </Modal>
  );
}
