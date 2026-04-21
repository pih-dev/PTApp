import React, { useState, useReducer, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Schedule from './components/Schedule';
import Sessions from './components/Sessions';
import TokenSetup from './components/TokenSetup';
import General from './components/General';
import { reducer, loadData, saveData, today, timeToMinutes, haptic, initElasticScroll, mergeData, dataEquals } from './utils';
import { getToken, fetchRemoteData, pushRemoteData } from './sync';
import { t } from './i18n';

// Debounce timer for GitHub sync — prevents burst of API calls when multiple
// dispatches fire in quick succession (e.g. auto-completing several sessions).
// Status callback surfaces sync state to the UI instead of swallowing errors.
let syncTimer = null;
const debouncedSync = (token, data, onStatus) => {
  clearTimeout(syncTimer);
  if (onStatus) onStatus('syncing');
  syncTimer = setTimeout(() => {
    pushRemoteData(token, data)
      .then(() => { if (onStatus) onStatus('synced'); })
      .catch((err) => {
        console.error('Sync push failed:', err.message);
        if (onStatus) onStatus('failed');
      });
  }, 1000);
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadData);
  const [tab, setTab] = useState('home');
  const [showGeneral, setShowGeneral] = useState(false);
  const [connected, setConnected] = useState(!!getToken());
  const [initialLoad, setInitialLoad] = useState(!!getToken());
  const [lang, setLang] = useState(() => localStorage.getItem('ptapp-lang') || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('ptapp-theme') || 'dark');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [showDebug, setShowDebug] = useState(false);
  const skipSync = useRef(true);
  // syncReady: true only after a successful remote fetch. Prevents stale localStorage
  // from being pushed to GitHub when the initial fetch fails (see data loss incident Apr 13).
  const syncReady = useRef(false);
  const contentRef = useRef(null);
  // Stable ref for current state — avoids stale closure in async callbacks
  const stateRef = useRef(state);
  stateRef.current = state;
  // Long-press timer for debug panel
  const longPressTimer = useRef(null);

  // Reconcile local ↔ remote via per-record last-write-wins merge.
  // Called at app startup and from the retry button. Bulletproof design:
  //   - fetch remote first → if it fails, syncReady stays false (no push will fire)
  //   - merge records by id using their `_modified` timestamps (PT's fresh edits win)
  //   - only dispatch REPLACE_ALL if merged differs from local (avoids wasted re-render)
  //   - only push if merged differs from remote (avoids wasted API call)
  //   - setSyncStatus('synced') ONLY after the push promise resolves — never prematurely
  //   - on any error: setSyncStatus('failed'), red dot, user can tap to retry
  // This replaces four silent `.catch(() => {})` paths that caused the Apr 19 Hala
  // Mouzanar data loss (stale device overwrote remote, newer session vanished).
  const reconcile = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const remote = await fetchRemoteData(token);
      syncReady.current = true;
      if (!remote) {
        // First-ever sync — just push local
        await pushRemoteData(token, stateRef.current);
        setSyncStatus('synced');
        return;
      }
      const merged = mergeData(stateRef.current, remote);
      const localDiffers = !dataEquals(merged, stateRef.current);
      const remoteDiffers = !dataEquals(merged, remote);
      if (localDiffers) {
        skipSync.current = true;
        dispatch({ type: 'REPLACE_ALL', payload: merged });
      }
      if (remoteDiffers) {
        await pushRemoteData(token, merged);
      }
      setSyncStatus('synced');
    } catch (err) {
      // Fetch OR push failed. If fetch failed, syncReady stays false (Apr 13 guard).
      // Data safe in localStorage, red dot shown, tap to retry.
      console.error('Sync reconcile failed:', err.message);
      setSyncStatus('failed');
    }
  };

  // On first load with token, reconcile with remote.
  // CRITICAL: syncReady stays false until fetch succeeds — this prevents stale
  // localStorage from being pushed to GitHub if the fetch fails (Apr 13 incident).
  useEffect(() => {
    const token = getToken();
    if (!token) { setInitialLoad(false); return; }
    setSyncStatus('syncing');
    reconcile().finally(() => {
      setInitialLoad(false);
      setTimeout(() => { skipSync.current = false; }, 500);
    });
  }, [connected]);

  // Auto-complete lapsed sessions — batch into a single dispatch to avoid N re-renders + N API pushes
  useEffect(() => {
    if (initialLoad) return;
    const now = new Date();
    const todayStr = today();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const lapsedIds = state.sessions
      .filter(s =>
        (s.status === 'scheduled' || s.status === 'confirmed') &&
        (s.date < todayStr || (s.date === todayStr && nowMin >= timeToMinutes(s.time) + (s.duration || 45) + 60))
      )
      .map(s => s.id);
    if (lapsedIds.length > 0) {
      dispatch({ type: 'BATCH_COMPLETE', payload: lapsedIds });
    }
  }, [state.sessions, initialLoad]);

  // Save to localStorage + debounced sync to GitHub on every state change.
  // THREE guards prevent stale pushes (Apr 13 incident fix):
  //   1. initialLoad — blocks during startup fetch
  //   2. syncReady — blocks if initial fetch FAILED (stays false)
  //   3. skipSync — blocks the REPLACE_ALL echo (one-time skip)
  useEffect(() => {
    saveData(state);
    if (initialLoad || !syncReady.current || skipSync.current) {
      skipSync.current = false;
      return;
    }
    const token = getToken();
    if (token) {
      debouncedSync(token, state, setSyncStatus);
    }
  }, [state, initialLoad]);

  // Rubber-band overscroll on the main content area
  useEffect(() => initElasticScroll(contentRef.current), []);

  // Retry sync — called when user taps the failed indicator.
  // Uses the same reconcile() path as initial load — merge not overwrite.
  const handleRetrySync = () => {
    if (!getToken()) return;
    setSyncStatus('syncing');
    reconcile();
  };

  // Long-press on version badge → debug panel
  const onVersionTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowDebug(d => !d), 600);
  };
  const onVersionTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  if (!connected) {
    return <TokenSetup onConnected={() => setConnected(true)} lang={lang} />;
  }

  if (initialLoad) {
    return (
      <div className="setup-container">
        <div className="setup-card" style={{ textAlign: 'center' }}>
          <div className="setup-spinner" />
          <p style={{ marginTop: 16, color: 'var(--t4)' }}>{t(lang, 'syncing')}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: t(lang, 'home'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: 'clients', label: t(lang, 'clients'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'schedule', label: t(lang, 'schedule'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id: 'sessions', label: t(lang, 'sessions'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
  ];

  return (
    <div className={`app-container${theme === 'light' ? ' theme-light' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="12" x2="18" y2="12"/>
              <rect x="3.5" y="7.5" width="3" height="9" rx="1.2"/>
              <rect x="17.5" y="7.5" width="3" height="9" rx="1.2"/>
              <rect x="1" y="9" width="2.5" height="6" rx="1"/>
              <rect x="20.5" y="9" width="2.5" height="6" rx="1"/>
            </svg>
          </div>
          <div>
            <div className="logo-text">PTApp</div>
            <div className="logo-sub">{t(lang, 'personalTrainer')}</div>
          </div>
          {/* Right side: sync dot + menu button. Version removed from header (lives in debug panel + General). */}
          <div className="header-right">
            {syncStatus !== 'idle' && (
              <button className={`sync-btn ${syncStatus}`}
                onClick={syncStatus === 'failed' ? handleRetrySync : undefined}>
                <span className={`sync-dot ${syncStatus}`} />
              </button>
            )}
            <button className="header-menu-btn"
              onClick={() => setShowGeneral(true)}
              onTouchStart={onVersionTouchStart}
              onTouchEnd={onVersionTouchEnd}
              onTouchCancel={onVersionTouchEnd}
              onMouseDown={onVersionTouchStart}
              onMouseUp={onVersionTouchEnd}
              onMouseLeave={onVersionTouchEnd}>
              <span className="header-dots">⋮</span>
            </button>
          </div>
        </div>
      </div>

      <div className="content" ref={contentRef}>
        {tab === 'home' && <Dashboard state={state} dispatch={dispatch} setTab={setTab} lang={lang} />}
        {tab === 'clients' && <Clients state={state} dispatch={dispatch} lang={lang} />}
        {tab === 'schedule' && <Schedule state={state} dispatch={dispatch} lang={lang} />}
        {tab === 'sessions' && <Sessions state={state} dispatch={dispatch} lang={lang} />}
      </div>

      {showGeneral && <General state={state} dispatch={dispatch} onClose={() => setShowGeneral(false)}
          lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />}

      {/* Debug panel — long-press version badge to toggle */}
      {showDebug && (
        <div className="debug-panel">
          <button className="debug-close" onClick={() => setShowDebug(false)}>×</button>
          <div><strong>Version:</strong> v2.9.1</div>
          <div><strong>Sync:</strong> {syncStatus}</div>
          <div><strong>Ready:</strong> {syncReady.current ? 'yes' : 'no'}</div>
          <div><strong>Sessions:</strong> {state.sessions?.length || 0}</div>
          <div><strong>Clients:</strong> {state.clients?.length || 0}</div>
          <div><strong>Modified:</strong> {state._lastModified ? new Date(state._lastModified).toLocaleString() : 'none'}</div>
          <div><strong>Token:</strong> {getToken() ? `${getToken().slice(0,4)}...${getToken().slice(-4)}` : 'none'}</div>
        </div>
      )}

      <div className="nav">
        {tabs.map(tb => (
          <button key={tb.id} className={`nav-btn${tab === tb.id ? ' active' : ''}`} onClick={() => { haptic(); setTab(tb.id); }}>
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>
    </div>
  );
}
