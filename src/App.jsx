import React, { useState, useReducer, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import MovementLibrary from './components/MovementLibrary';
import Clients from './components/Clients';
import Schedule from './components/Schedule';
import TokenSetup from './components/TokenSetup';
import TokenUpdateModal from './components/TokenUpdateModal';
import { SpotSetMark, SpotSetBackdrop } from './components/Icons';
import Splash from './components/Splash';
import General from './components/General';
import Display, { loadDisplay, saveDisplay, applyDisplay } from './components/Display';
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
  // v2.37: the Display sheet — theme, text size, label case. Pierre asked for
  // these at the TOP, not inside General: they are the settings you reach for
  // while squinting at the screen, which is the worst moment to go hunting.
  const [showDisplay, setShowDisplay] = useState(false);
  const [display, setDisplayState] = useState(loadDisplay);
  const setDisplay = (patch) => setDisplayState(prev => {
    const next = { ...prev, ...patch };
    saveDisplay(next);
    return next;
  });
  // Written to <html> for the same reason data-skin is: Modal portals to <body>
  // (v2.33), so a property scoped to the app container never reaches a sheet.
  useEffect(() => { applyDisplay(display); }, [display]);
  // 🔴 THE WORD GOES TO THE LIBRARY (v2.30.1 split; the mark replays the show).
  //    v2.33: the library is now a TAB, so the word SELECTS it rather than
  //    opening a sheet, and the General entry is gone. One room, one door plus
  //    the header shortcut — not three.
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
  // 🔴 `dir` GOES ON <html> TOO, NOT ONLY ON THE CONTAINER (v2.33).
  //    Modal.jsx now portals every sheet to <body>, which is OUTSIDE
  //    .app-container — so a dir written only on the container would leave
  //    every modal rendering left-to-right for Arabic users while the screen
  //    behind it stayed right-to-left. Every `[dir="rtl"]` rule in styles.css
  //    matches on descent, so stamping <html> makes them apply to the portal
  //    as well. The container keeps its own dir: same value, no behaviour
  //    change in flow, and it stays correct if the portal target ever moves.
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

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
    // v2.33 — slot four is the LIBRARY, not the flat session ledger. The
    // fresh-eyes structural review (docs/design/2026-08-22-fresh-eyes-navigation-
    // review.md, Pierre's call the same evening) found that "browse every session
    // ever recorded" is not a moment in anyone's day: its real uses — restore a
    // cancelled one, note a past one, audit a count — are always ABOUT A CLIENT
    // or ABOUT A DAY, and both of those pivots already exist. Meanwhile 340
    // movements with figures had no entrance at all beyond a tap on the logo
    // word. 🔴 The ledger is DEMOTED, NOT DELETED: it lives behind "All" on the
    // Schedule bar, so the audit view is two taps away instead of one.
    // The icon is the figure itself — the only tab whose subject can be drawn.
    { id: 'library', label: t(lang, 'library'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4.2" r="2"/><path d="M12 6.2v6"/><path d="M12 7.4L8.6 10M12 7.4l3.4 2.6"/><path d="M12 12.2l-2.4 4M12 12.2l2.4 4"/><path d="M9.6 16.2l-.7 3.6M14.4 16.2l.7 3.6"/></svg> },
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
              {/* v2.42: box 40→46, mark up with it. */}
              <SpotSetMark size={31} />
            </div>
          </button>
          <button
            type="button"
            className="logo-btn"
            /* v2.33: the gesture Pierre designed in v2.30.1 is unchanged — the
               WORD still goes to the library. What changed is the destination:
               it now SELECTS THE TAB instead of opening a second copy of the
               same component in a sheet. One library, one place, and the
               scroll position the tab holds is the one he comes back to. */
            onClick={() => { haptic(); setTab('library'); }}
            aria-label={t(lang, 'movementLibrary')}
          >
            <div>
              <div className="logo-text">SpotSet</div>
              <div className="logo-sub">{t(lang, 'personalTrainer')}</div>
            </div>
          </button>
          {/* Right side: sync dot + menu button. Version removed from header (lives in debug panel + General). */}
          <div className="header-right">
            {/* v2.37: theme + text size + caps, one tap from every screen. */}
            <button className="display-btn" onClick={() => { haptic(); setShowDisplay(true); }}
              aria-label={t(lang, 'display')}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>
              </svg>
            </button>
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
        {/* Embedded, not the sheet: same component, Modal wrapper dropped. */}
        {tab === 'library' && <MovementLibrary lang={lang} embedded />}
      </div>

      {showDisplay && (
        <Display lang={lang} skin={skin} setSkin={setSkin}
          caps={display.caps} setCaps={(caps) => setDisplay({ caps })}
          scale={display.scale} setScale={(scale) => setDisplay({ scale })}
          onClose={() => setShowDisplay(false)} />
      )}

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
          <div><strong>Version:</strong> v2.44</div>
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
