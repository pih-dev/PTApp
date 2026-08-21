import React, { useState } from 'react';
import { validateToken, saveToken, DEMO_TOKEN } from '../sync';
import { anyLocalDataExists, saveData } from '../utils';
import { buildDemoData } from '../demoData';
import { isAuthConfigured, signIn, AUTH_OFFLINE, AUTH_BAD_CREDENTIALS } from '../auth';
import { t } from '../i18n';

// The entry screen. Two ways in, and they sit BESIDE each other — the sign-in
// form does NOT replace the token/DEMO field (Pierre, 2026-08-21).
//
// 🔴 A tester who already typed `DEMO` keeps working exactly as they do now.
//    `DEMO` survives through Phase 4 regardless: it is what a store reviewer is
//    given, and it is the only path that works in Airplane Mode (the documented
//    4.2 white-screen trap). The hint line at the bottom exists because without
//    it a tester facing a login form has no way to know `DEMO` is even an
//    option — it is one i18n string, and it is deleted in the SAME commit that
//    removes `DEMO`, so it cannot rot into a stale instruction.
//
// The sign-in half only renders when the build carries VITE_SUPABASE_* — until
// then this screen is byte-identical to the one that shipped in v2.15.1.
export default function TokenSetup({ onConnected, lang }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Reload rather than calling onConnected(): the store is read once at mount,
  // and signing in changes WHICH store is truth (`ptapp-data:<userId>`). A fresh
  // boot is the only thing that guarantees the reducer never holds the previous
  // identity's state. Same reasoning as the DEMO seed below.
  // Blur first: reloading with the keyboard up can leave iOS standalone
  // repainting against a stale visualViewport offset.
  const boot = () => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.location.reload();
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await signIn(email, password);
      boot();
    } catch (err) {
      // 🔴 Offline and "wrong password" are different answers and must read
      //    differently — telling a coach in a basement that their password is
      //    wrong is how you get a password reset nobody needed.
      if (err.code === AUTH_OFFLINE) setAuthError(t(lang, 'signInOffline'));
      else if (err.code === AUTH_BAD_CREDENTIALS) setAuthError(t(lang, 'signInBad'));
      else setAuthError(t(lang, 'signInFailed'));
      setAuthLoading(false);
    }
  };

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
      // 🔴 Checks EVERY store on the device, not just the current identity's.
      //    loadData() reads only `ptapp-data:<signed-in user>`; a phone whose real
      //    records sit under another key would sail through the gate, and
      //    saveToken(DEMO) is global — so every sync path short-circuits for the
      //    real identity too. Same failure this gate was written to prevent.
      if (anyLocalDataExists()) {
        setError(t(lang, 'tokenInvalid'));
        return;
      }
      setLoading(true);
      saveToken(DEMO_TOKEN);
      saveData(buildDemoData());
      boot();
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

  const showSignIn = isAuthConfigured();

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
        <p className="setup-sub">{showSignIn ? t(lang, 'signInSubtitle') : t(lang, 'tokenSubtitle')}</p>

        {showSignIn && (
          <>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t(lang, 'signInEmail')}
              className="input"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              inputMode="email"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t(lang, 'signInPassword')}
              className="input"
              style={{ marginTop: 10 }}
              autoComplete="current-password"
              // Enter submits — the keyboard's own button is the nearest tap
              // target when it is covering the bottom half of the screen.
              onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }}
            />
            {authError && <p className="setup-error">{authError}</p>}
            <button
              onClick={handleSignIn}
              disabled={authLoading || !email.trim() || !password}
              className="btn-primary"
              style={{ marginTop: 12, opacity: authLoading || !email.trim() || !password ? 0.5 : 1 }}
            >
              {authLoading ? t(lang, 'signInWorking') : t(lang, 'signIn')}
            </button>

            {/* Divider. Theme-aware vars in inline styles, never hardcoded rgba. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--sep)' }} />
              <span style={{ fontSize: 12, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t(lang, 'or')}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--sep)' }} />
            </div>
          </>
        )}

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

        {/* 🔴 Deleted in the SAME commit that removes DEMO at Phase 4. */}
        {showSignIn && (
          <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.5, color: 'var(--t4)', textAlign: 'center' }}>
            {t(lang, 'entryHint')}
          </p>
        )}
      </div>
    </div>
  );
}
