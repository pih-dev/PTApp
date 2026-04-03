import React, { useState } from 'react';
import Modal from './Modal';
import { exportBackup, mergeBackup } from '../utils';
import { getToken, saveSnapshot, listSnapshots, fetchSnapshot } from '../sync';

export default function General({ state, dispatch, onClose }) {
  const [snapshots, setSnapshots] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');

  return (
    <Modal title="General" onClose={onClose}>
      {/* Backup section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'rgba(255,255,255,0.7)' }}>💾 Clients/Sessions Backup</div>

        <div className="flex-row" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }}
            onClick={() => exportBackup(state)}>
            Backup
          </button>
          {getToken() && (
            <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }}
              disabled={snapshotLoading}
              onClick={async () => {
                setSnapshotLoading(true);
                setSnapshotMsg('');
                try {
                  const ts = await saveSnapshot(getToken(), state);
                  setSnapshotMsg(`Saved: ${ts}`);
                  setSnapshots(null);
                } catch (e) { setSnapshotMsg('Failed: ' + e.message); }
                setSnapshotLoading(false);
              }}>
              Cloud Backup
            </button>
          )}
        </div>

        <div className="flex-row" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const backup = JSON.parse(ev.target.result);
                    if (!backup.clients || !backup.sessions) { alert('Invalid backup file'); return; }
                    const merged = mergeBackup(state, backup);
                    const added = merged.clients.length - state.clients.length;
                    const restored = merged.sessions.length - state.sessions.length;
                    dispatch({ type: 'REPLACE_ALL', payload: merged });
                    alert(`Restored: +${added} client(s), +${restored} session(s)`);
                  } catch { alert('Could not read backup file'); }
                };
                reader.readAsText(file);
              };
              input.click();
            }}>
            Restore
          </button>
          {getToken() && (
            <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }}
              disabled={snapshotLoading}
              onClick={async () => {
                setSnapshotLoading(true);
                setSnapshotMsg('');
                try {
                  const list = await listSnapshots(getToken());
                  setSnapshots(list);
                  if (list.length === 0) setSnapshotMsg('No snapshots found');
                } catch (e) { setSnapshotMsg('Failed: ' + e.message); }
                setSnapshotLoading(false);
              }}>
              Cloud Restore
            </button>
          )}
        </div>

        {snapshotMsg && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{snapshotMsg}</div>}

        {snapshots && snapshots.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {snapshots.map(s => (
              <div key={s.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13
              }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{s.name}</span>
                <button className="btn-confirm" style={{ fontSize: 11, padding: '4px 10px' }}
                  disabled={snapshotLoading}
                  onClick={async () => {
                    setSnapshotLoading(true);
                    try {
                      const backup = await fetchSnapshot(getToken(), s.path);
                      const merged = mergeBackup(state, backup);
                      const added = merged.clients.length - state.clients.length;
                      const restored = merged.sessions.length - state.sessions.length;
                      dispatch({ type: 'REPLACE_ALL', payload: merged });
                      setSnapshotMsg(`Restored from ${s.name}: +${added} client(s), +${restored} session(s)`);
                      setSnapshots(null);
                    } catch (e) { setSnapshotMsg('Failed: ' + e.message); }
                    setSnapshotLoading(false);
                  }}>
                  Merge
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
          Restore merges data — adds missing records without replacing existing ones.
        </div>
      </div>

      {/* Documentation links */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'rgba(255,255,255,0.7)' }}>📖 Documentation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="https://github.com/pih-dev/PTApp/blob/master/docs/instructions-v1.9.2.md" target="_blank" rel="noopener noreferrer"
            className="btn-secondary" style={{ fontSize: 13, padding: '10px 14px', textDecoration: 'none', textAlign: 'center' }}>
            App Instructions
          </a>
          <a href="https://github.com/pih-dev/PTApp/blob/master/docs/changelog-summary.md" target="_blank" rel="noopener noreferrer"
            className="btn-secondary" style={{ fontSize: 13, padding: '10px 14px', textDecoration: 'none', textAlign: 'center' }}>
            What Changed (Changelog)
          </a>
        </div>
      </div>
    </Modal>
  );
}
