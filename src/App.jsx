import React, { useState, useReducer, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import MovementLibrary from './components/MovementLibrary';
import Clients from './components/Clients';
import Schedule from './components/Schedule';
import Sessions from './components/Sessions';
import TokenSetup from './components/TokenSetup';
import TokenUpdateModal from './components/TokenUpdateModal';
import { SpotSetMark, SpotSetBackdrop } from './components/Icons';
import Splash from './components/Splash';
import General from './components/General';
import { reducer, loadData, saveData, today, timeToMinutes, haptic, initElasticScroll, mergeData, dataEquals } from './utils';
import { getToken, fetchRemoteData, pushRemoteData, isDemo, resetConcurrencyTokens } from './sync';
import { isSignedIn, isSessionExpired, getUserId, onAuthChange } from './auth';
import { t } from './i18n';
import { loadSkin, saveSkin } from './skins';

// Debounce timer for GitHub sync — prevents burst of API calls when multiple
// dispatches fire in quick succession (e.g. auto-completing several sessions).
// Status callback surfaces sync state to the UI instead of swallowing errors.
let syncTimer = null;
const debouncedSync = (token, data, onStatus, onTokenExpired) => {
  clearTimeout(syncTimer);
  if (onStatus) onStatus('syncing');
  syncTimer = setTimeout(() => {
    pushRemoteData(token, data)
      .then(() => { if (onStatus) onStatus('synced'); })
      .catch((err) => {
        console.error('Sync push failed:', err.message);
        if (onStatus) onStatus('failed');
        // v2.12.1: a 401 means the PAT expired/was revoked — retrying is pointless.
        // Surface it so the red-dot tap routes to token re-entry, not retry.
        if (err.message === 'TOKEN_EXPIRED' && onTokenExpired) onTokenExpired();
      });
  }, 1000);
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadData);
  const [tab, setTab] = useState('home');
  // v2.25: a Dashboard week column deep-links to its day in Schedule. The date
  // is an INITIAL value only (Schedule remounts per tab entry); tapping the nav
  // clears it so a later manual visit opens on today, not a stale deep link.
  const [scheduleDate, setScheduleDate] = useState(null);
  const openScheduleDay = (date) => { setScheduleDate(date); setTab('schedule'); };
  // v2.27: the opening. Reduced-motion users never see it — the guard is here,
  // not in the component, so their launch pays zero mount cost.
  const [showSplash, setShowSplash] = useState(() => {
    try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return true; }
  });
  // v2.30.1: the on-demand showcase, opened from the header mark.
  const [showShowcase, setShowShowcase] = useState(false);
  const [showGeneral, setShowGeneral] = useState(false);
  // 🔴 THE WORD OPENS THE LIBRARY (v2.30.1 split; the mark replays the show).
  //    The library shortcut lives in the header because it is the screen a PT
  //    reaches for most between sets. The General entry stays — a shortcut,
  //    not a move.
  const [showLibrary, setShowLibrary] = useState(false);
  // 🔴 THE GATE IS IDENTITY OR LOCAL DATA — NEVER TOKEN VALIDITY (§4).
  //    An expired session still gets in and sees a banner; it must never be a
  //    login wall. A lapsed token black-holing the PT's schedule in a gym with
  //    no signal ends multi-user, and it is also exactly what Apple tests in
  //    Airplane Mode (4.2). `isSignedIn()` is deliberately true when expired.
  const [connected, setConnected] = useState(!!getToken() || isSignedIn());
  // Demo sessions never fetch, so there is no startup fetch to wait on — starting
  // this true would park the reviewer on the spinner forever.
  const [initialLoad, setInitialLoad] = useState(!!getToken() && !isDemo());
  const [lang, setLang] = useState(() => localStorage.getItem('ptapp-lang') || 'en');
  // v2.17: skins replace the dark/light pair. loadSkin() also performs the
  // one-time ptapp-theme → ptapp-skin migration, guarded against the iOS
  // "Block All Cookies" SecurityError — see src/skins.js.
  const [skin, setSkinState] = useState(loadSkin);
  // Persist and apply in one call, so no call site can change the skin without
  // saving it (or save one it did not apply). saveSkin returns the value it
  // actually stored, which is the default if an unknown id was passed.
  const setSkin = (id) => setSkinState(saveSkin(id));
  // v2.18: the attribute goes on <html>, not on the app container. The tokens
  // live on :root, and <body> plus the area outside the 480px container have to
  // paint the SAME ground — otherwise a steel (daylight) user gets a near-black
  // strip wherever iOS collapses the URL bar. theme-color rides along so the
  // iOS status bar and the Android task switcher match the chosen skin.
  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin);
    const ground = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && ground) meta.setAttribute('content', ground);
  }, [skin]);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [showDebug, setShowDebug] = useState(false);
  // v2.12.1 (Jun-30 token-expiry incident): when sync fails with a 401 the token is
  // dead — tapping the red dot must open token re-entry instead of a doomed retry.
  const [tokenExpired, setTokenExpired] = useState(false);
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);
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
    // isDemo() before the token check is the single choke point for the review
    // credential: no fetch, no push, syncReady stays false, so the save effect
    // below can never reach GitHub either.
    if (!token || isDemo()) return;
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
      if (err.message === 'TOKEN_EXPIRED') setTokenExpired(true);
    }
  };

  // On first load with token, reconcile with remote.
  // CRITICAL: syncReady stays false until fetch succeeds — this prevents stale
  // localStorage from being pushed to GitHub if the fetch fails (Apr 13 incident).
  useEffect(() => {
    const token = getToken();
    // Demo takes the same exit as "no token" — the app runs purely on localStorage,
    // and the sync dot stays idle instead of hanging on 'syncing' forever.
    if (!token || isDemo()) { setInitialLoad(false); return; }
    setSyncStatus('syncing');
    reconcile().finally(() => {
      setInitialLoad(false);
      setTimeout(() => { skipSync.current = false; }, 500);
    });
  }, [connected]);

  // Auto-complete lapsed sessions — batch into a single dispatch to avoid N re-renders + N API pushes.
  // DELIBERATE (v2.10.1 review, W2): deps include state.sessions, so this sweep runs on
  // every session mutation, not only at app load. That continuous re-run is the ONLY
  // mechanism that completes sessions lapsing while the app stays open (e.g. across
  // midnight in a PWA that's never reloaded) — do not narrow the deps to [initialLoad].
  // Side effect accepted: a session booked retroactively for a past slot completes
  // immediately (it IS lapsed).
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
    // Belt to syncReady's braces: demo data must never leave the device even if a
    // future change lets syncReady flip true on a path that skipped reconcile().
    if (token && !isDemo()) {
      debouncedSync(token, state, setSyncStatus, () => setTokenExpired(true));
    }
  }, [state, initialLoad]);

  // Rubber-band overscroll on the main content area
  useEffect(() => initElasticScroll(contentRef.current), []);

  // 🔴 Identity changes swap WHICH localStorage blob is truth
  //    (`ptapp-data:<userId>`), so the state held in this reducer belongs to the
  //    previous user the instant it changes. Reload rather than patching state
  //    in place: the store is read once at mount, and a fresh boot is the only
  //    thing that cannot leave one user's records in another user's session.
  //    `saveData` refuses to write across an identity change precisely to catch
  //    this wiring going missing — if that console error ever appears, this
  //    effect is what stopped working.
  useEffect(() => {
    const bootId = getUserId();
    return onAuthChange((session) => {
      if ((session?.user?.id || null) === bootId) return;
      // 🔴 Clear the cached concurrency tokens BEFORE the reload (§4). Both
      //    drivers cache one — GitHub a `sha`, Supabase a `version` — and a
      //    stale one carried across an identity change is a blind overwrite:
      //    the write claims to be replacing a revision that belongs to someone
      //    else's store. Cheap, and the failure it prevents is silent.
      resetConcurrencyTokens();
      window.location.reload();
    });
  }, []);

  // Retry sync — called when user taps the failed indicator.
  // Uses the same reconcile() path as initial load — merge not overwrite.
  const handleRetrySync = () => {
    // isDemo() too: 'DEMO' is a truthy token, so without this the dot latches on
    // 'syncing' forever the moment a reviewer taps it.
    if (!getToken() || isDemo()) return;
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
      // 🔴 `dir` lives on `.app-container`, which these pre-login screens never
      //    render inside — so every Arabic string before login was laid out LTR.
      //    Invisible while this screen held one word; not once it holds a form.
      <div className="setup-container" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
    <div className="app-container" data-skin={skin} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* First child on purpose: every later sibling paints over it. */}
      <SpotSetBackdrop />
      {showSplash && <Splash lang={lang} onDone={() => setShowSplash(false)} />}
      {/* v2.30.1: the header MARK replays the opening on demand — looping, with
          Replay/Close — while the WORD keeps opening the library (Pierre's
          split). The tap is a user gesture, so the sound plays on web too. */}
      {showShowcase && <Splash lang={lang} mode="showcase" onDone={() => setShowShowcase(false)} />}
      <div className="header">
        <div className="logo">
          {/* v2.30.1, Pierre's split: the MARK replays the opening (showcase),
              the WORD opens the movement library. Two targets, two jobs —
              before this, both were one button to the library. */}
          <button
            type="button"
            className="logo-btn logo-btn-mark"
            onClick={() => setShowShowcase(true)}
            aria-label={t(lang, 'replay')}
          >
            <div className="logo-icon">
              <SpotSetMark size={26} />
            </div>
          </button>
          <button
            type="button"
            className="logo-btn"
            onClick={() => setShowLibrary(true)}
            aria-label={t(lang, 'movementLibrary')}
          >
            <div>
              <div className="logo-text">SpotSet</div>
              <div className="logo-sub">{t(lang, 'personalTrainer')}</div>
            </div>
          </button>
          {/* Right side: sync dot + menu button. Version removed from header (lives in debug panel + General). */}
          <div className="header-right">
            {syncStatus !== 'idle' && (
              <button className={`sync-btn ${syncStatus}`}
                onClick={syncStatus === 'failed'
                  ? (tokenExpired ? () => setShowTokenUpdate(true) : handleRetrySync)
                  : undefined}>
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

      {/* 🔴 A banner, NOT a wall. The user keeps full offline use of their own
          records; only syncing needs a live session. Tapping opens General,
          where Sign out → sign back in is the fix. */}
      {isSessionExpired() && (
        <button className="auth-banner" onClick={() => setShowGeneral(true)}>
          {t(lang, 'sessionExpired')}
        </button>
      )}

      <div className="content" ref={contentRef}>
        {tab === 'home' && <Dashboard state={state} dispatch={dispatch} setTab={setTab} lang={lang} onOpenDay={openScheduleDay} />}
        {tab === 'clients' && <Clients state={state} dispatch={dispatch} lang={lang} />}
        {tab === 'schedule' && <Schedule state={state} dispatch={dispatch} lang={lang} initialDate={scheduleDate} />}
        {tab === 'sessions' && <Sessions state={state} dispatch={dispatch} lang={lang} />}
      </div>

      {showLibrary && <MovementLibrary lang={lang} onClose={() => setShowLibrary(false)} />}
      {showGeneral && <General state={state} dispatch={dispatch} onClose={() => setShowGeneral(false)}
          lang={lang} setLang={setLang} skin={skin} setSkin={setSkin}
          onUpdateToken={() => setShowTokenUpdate(true)} />}

      {/* v2.12.1: token re-entry — reachable from the red dot (when 401) and from
          General. onSaved retries via reconcile(), the merge-not-overwrite path, so
          a week of stranded local records lands in the cloud without data loss. */}
      {showTokenUpdate && (
        <TokenUpdateModal lang={lang}
          onClose={() => setShowTokenUpdate(false)}
          onSaved={() => {
            setTokenExpired(false);
            setShowTokenUpdate(false);
            handleRetrySync();
          }} />
      )}

      {/* Debug panel — long-press version badge to toggle */}
      {showDebug && (
        <div className="debug-panel">
          <button className="debug-close" onClick={() => setShowDebug(false)}>×</button>
          <div><strong>Version:</strong> v2.31</div>
          <div><strong>Sync:</strong> {syncStatus}{tokenExpired ? ' (token expired)' : ''}</div>
          <div><strong>Ready:</strong> {syncReady.current ? 'yes' : 'no'}</div>
          <div><strong>Sessions:</strong> {state.sessions?.length || 0}</div>
          <div><strong>Clients:</strong> {state.clients?.length || 0}</div>
          {/* v2.9.2: surface auditLog growth so the 10k revisit-trigger from
              docs/app-health.md is observable in production. */}
          <div><strong>Audit log:</strong> {state.auditLog?.length || 0}</div>
          <div><strong>Modified:</strong> {state._lastModified ? new Date(state._lastModified).toLocaleString() : 'none'}</div>
          <div><strong>Token:</strong> {getToken() ? `${getToken().slice(0,4)}...${getToken().slice(-4)}` : 'none'}</div>
        </div>
      )}

      <div className="nav">
        {tabs.map(tb => (
          <button key={tb.id} className={`nav-btn${tab === tb.id ? ' active' : ''}`} onClick={() => { haptic(); setScheduleDate(null); setTab(tb.id); }}>
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>
    </div>
  );
}
