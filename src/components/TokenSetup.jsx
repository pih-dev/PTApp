import React, { useState } from 'react';
import { validateToken, saveToken } from '../sync';

export default function TokenSetup({ onConnected }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    setError('');
    try {
      const valid = await validateToken(t);
      if (valid) {
        saveToken(t);
        onConnected();
      } else {
        setError('Invalid token — check and try again');
      }
    } catch {
      setError('Connection failed — check your internet');
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
        <h2 className="setup-title">PTApp</h2>
        <p className="setup-sub">Enter your sync token to connect to the cloud</p>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste your sync token here"
          className="input"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {error && <p className="setup-error">{error}</p>}
        <button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          className="btn-primary"
          style={{ marginTop: 12, opacity: loading || !token.trim() ? 0.5 : 1 }}
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
