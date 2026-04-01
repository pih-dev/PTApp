import React, { useState, useReducer, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Schedule from './components/Schedule';
import Sessions from './components/Sessions';
import TokenSetup from './components/TokenSetup';
import { reducer, loadData, saveData } from './utils';
import { getToken, fetchRemoteData, pushRemoteData } from './sync';

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadData);
  const [tab, setTab] = useState('home');
  const [connected, setConnected] = useState(!!getToken());
  const [initialLoad, setInitialLoad] = useState(!!getToken());
  const skipSync = useRef(true);

  // On first load with token, fetch remote data
  useEffect(() => {
    const token = getToken();
    if (!token) { setInitialLoad(false); return; }

    fetchRemoteData(token)
      .then(remoteData => {
        if (remoteData) {
          skipSync.current = true;
          dispatch({ type: 'REPLACE_ALL', payload: remoteData });
        } else {
          // No remote data yet — push local data up
          pushRemoteData(token, state).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        setInitialLoad(false);
        // Allow syncing after initial load settles
        setTimeout(() => { skipSync.current = false; }, 500);
      });
  }, [connected]);

  // Save to localStorage + sync to GitHub on every state change
  useEffect(() => {
    saveData(state);
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    const token = getToken();
    if (token) {
      pushRemoteData(token, state).catch(() => {});
    }
  }, [state]);

  if (!connected) {
    return <TokenSetup onConnected={() => setConnected(true)} />;
  }

  if (initialLoad) {
    return (
      <div className="setup-container">
        <div className="setup-card" style={{ textAlign: 'center' }}>
          <div className="setup-spinner" />
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.5)' }}>Syncing...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: 'Home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: 'clients', label: 'Clients', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'schedule', label: 'Schedule', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id: 'sessions', label: 'Sessions', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
  ];

  return (
    <div className="app-container">
      <div className="header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5h11M6.5 17.5h11"/>
              <rect x="2" y="5" width="4.5" height="14" rx="1.5"/>
              <rect x="17.5" y="5" width="4.5" height="14" rx="1.5"/>
              <line x1="4.25" y1="12" x2="19.75" y2="12"/>
            </svg>
          </div>
          <div>
            <div className="logo-text">PTApp</div>
            <div className="logo-sub">Personal Trainer</div>
          </div>
          <div className="app-version">v1.6</div>
        </div>
      </div>

      <div className="content">
        {tab === 'home' && <Dashboard state={state} dispatch={dispatch} setTab={setTab} />}
        {tab === 'clients' && <Clients state={state} dispatch={dispatch} />}
        {tab === 'schedule' && <Schedule state={state} dispatch={dispatch} />}
        {tab === 'sessions' && <Sessions state={state} dispatch={dispatch} />}
      </div>

      <div className="nav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
