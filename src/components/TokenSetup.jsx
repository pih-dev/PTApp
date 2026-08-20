import React, { useState } from 'react';
import { validateToken, saveToken, DEMO_TOKEN } from '../sync';
import { loadData, saveData } from '../utils';
import { buildDemoData } from '../demoData';
import { t } from '../i18n';

export default function TokenSetup({ onConnected, lang }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;

    // v2.15.1 review credential — see DEMO_TOKEN in sync.js. Seeds sample data and
    // enters the app with no network call at all.
    if (trimmed.toUpperCase() === DEMO_TOKEN) {
      // 🔴 REFUSE, don't silently skip the seed. An earlier draft wrote the DEMO token
      // first and merely declined to overwrite existing records — which parked a phone
      // holding REAL clients into permanent demo mode: every sync path short-circuits,
      // the dot reads idle rather than red, and the trainer keeps booking sessions that
      // never leave the device. Refusing outright means demo is only ever reachable on
      // a device with nothing to lose.
      const existing = loadData();
      if ((existing.clients && existing.clients.length) || (existing.sessions && existing.sessions.length)) {
        setError(t(lang, 'tokenInvalid'));
        return;
      }
      setLoading(true);
      saveToken(DEMO_TOKEN);
      saveData(buildDemoData());
      // Blur first: reloading with the keyboard up can leave iOS standalone repainting
      // against a stale visualViewport offset.
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      // Reload rather than plumbing a seed through the reducer: the store was read
      // once at mount, so a fresh boot is the only way it picks the seed up.
      window.location.reload();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const valid = await validateToken(trimmed);
      if (valid) {
        saveToken(trimmed);
        onConnected();
      } else {
        setError(t(lang, 'tokenInvalid'));
      }
    } catch {
      setError(t(lang, 'tokenFailed'));
    }
    setLoading(false);
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="logo-icon setup-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11"/>
            <rect x="2" y="5" width="4.5" height="14" rx="1.5"/>
            <rect x="17.5" y="5" width="4.5" height="14" rx="1.5"/>
            <line x1="4.25" y1="12" x2="19.75" y2="12"/>
          </svg>
        </div>
        <h2 className="setup-title">SpotSet</h2>
        <p className="setup-sub">{t(lang, 'tokenSubtitle')}</p>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder={t(lang, 'tokenPlaceholder')}
          className="input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
        />
        {error && <p className="setup-error">{error}</p>}
        <button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          className="btn-primary"
          style={{ marginTop: 12, opacity: loading || !token.trim() ? 0.5 : 1 }}
        >
          {loading ? t(lang, 'tokenConnecting') : t(lang, 'tokenConnect')}
        </button>
      </div>
    </div>
  );
}
