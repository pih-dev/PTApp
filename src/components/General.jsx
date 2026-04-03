import React, { useState } from 'react';
import Modal from './Modal';
import { exportBackup, mergeBackup, genId } from '../utils';
import { getToken, saveSnapshot, listSnapshots, fetchSnapshot } from '../sync';

// Raw GitHub URLs for docs — fetched at runtime, not bundled
const DOCS = {
  instructions: 'https://raw.githubusercontent.com/pih-dev/PTApp/master/docs/instructions-v2.0.md',
  changelog: 'https://raw.githubusercontent.com/pih-dev/PTApp/master/docs/changelog-summary.md',
};

// Lightweight markdown→React renderer for our docs (no library needed)
// Handles: headings, bold, tables, lists, horizontal rules, paragraphs
function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  // Inline formatting: **bold** and `code`
  const inline = (str) => {
    const parts = [];
    let lastIdx = 0;
    // Match **bold** and `code` spans
    str.replace(/(\*\*(.+?)\*\*)|(`(.+?)`)/g, (match, boldFull, boldText, codeFull, codeText, offset) => {
      if (offset > lastIdx) parts.push(str.slice(lastIdx, offset));
      if (boldText) parts.push(<strong key={offset} style={{ color: 'rgba(255,255,255,0.95)' }}>{boldText}</strong>);
      if (codeText) parts.push(<code key={offset} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3, fontSize: '0.9em' }}>{codeText}</code>);
      lastIdx = offset + match.length;
    });
    if (lastIdx < str.length) parts.push(str.slice(lastIdx));
    return parts.length ? parts : str;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Skip the top-level title (# Title) — already shown in modal header
    if (i === 0 && line.startsWith('# ')) { i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />);
      i++; continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<div key={key++} style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginTop: 14, marginBottom: 6 }}>{inline(line.slice(4))}</div>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<div key={key++} style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginTop: 18, marginBottom: 8 }}>{inline(line.slice(3))}</div>);
      i++; continue;
    }

    // Table — collect all | rows, render as a styled grid
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        // Skip separator rows (|---|---|)
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          rows.push(row.split('|').filter(Boolean).map(c => c.trim()));
        }
        i++;
      }
      elements.push(
        <div key={key++} style={{ fontSize: 12, marginBottom: 10, overflowX: 'auto' }}>
          {rows.map((row, ri) => (
            <div key={ri} style={{
              display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '6px 0', fontWeight: ri === 0 ? 600 : 400,
              color: ri === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)'
            }}>
              {row.map((cell, ci) => (
                <div key={ci} style={{ flex: 1, padding: '0 4px', minWidth: 0 }}>{inline(cell)}</div>
              ))}
            </div>
          ))}
        </div>
      );
      continue;
    }

    // Ordered list item (1. item)
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
        // Collect continuation lines (indented sub-items like "   - detail")
        while (i < lines.length && /^\s{2,}-\s/.test(lines[i])) {
          items[items.length - 1] += '\n' + lines[i].trim();
          i++;
        }
      }
      elements.push(
        <ol key={key++} style={{ margin: '6px 0', paddingLeft: 20, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
          {items.map((item, idx) => <li key={idx}>{inline(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Unordered list item (- item)
    if (/^-\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} style={{ margin: '6px 0', paddingLeft: 20, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
          {items.map((item, idx) => <li key={idx}>{inline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Empty line — skip
    if (!line.trim()) { i++; continue; }

    // Paragraph — collect consecutive non-empty, non-special lines
    const para = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('|') && !/^---+$/.test(lines[i].trim()) && !/^-\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    elements.push(<p key={key++} style={{ margin: '6px 0', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{inline(para.join(' '))}</p>);
  }

  return elements;
}

export default function General({ state, dispatch, onClose }) {
  const [snapshots, setSnapshots] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [docContent, setDocContent] = useState(null); // { title, text }
  const [docLoading, setDocLoading] = useState(false);
  const [newTodo, setNewTodo] = useState('');

  // Fetch and display a markdown doc in-app
  const openDoc = async (url, title) => {
    setDocLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const text = await res.text();
      setDocContent({ title, text });
    } catch {
      alert('Could not load document. Check your connection.');
    }
    setDocLoading(false);
  };

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

      {/* To-do list — shared between PT and developer */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'rgba(255,255,255,0.7)' }}>📝 To Do</div>

        {(state.todos || []).length === 0 && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>No items yet</div>
        )}

        {(state.todos || []).map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{t.text}</div>
            <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: t.id })}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 16, padding: '0 4px', cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="input" style={{ flex: 1, fontSize: 13 }}
            placeholder="Add something..."
            value={newTodo}
            onChange={e => setNewTodo(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newTodo.trim()) {
                dispatch({ type: 'ADD_TODO', payload: { id: genId(), text: newTodo.trim() } });
                setNewTodo('');
              }
            }} />
          <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px', flexShrink: 0 }}
            onClick={() => {
              if (!newTodo.trim()) return;
              dispatch({ type: 'ADD_TODO', payload: { id: genId(), text: newTodo.trim() } });
              setNewTodo('');
            }}>
            Add
          </button>
        </div>
      </div>

      {/* Documentation — opens in-app */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'rgba(255,255,255,0.7)' }}>📖 Documentation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 13, padding: '10px 14px' }}
            disabled={docLoading}
            onClick={() => openDoc(DOCS.instructions, 'App Instructions')}>
            App Instructions
          </button>
          <button className="btn-secondary" style={{ fontSize: 13, padding: '10px 14px' }}
            disabled={docLoading}
            onClick={() => openDoc(DOCS.changelog, 'What Changed')}>
            What Changed (Changelog)
          </button>
        </div>
      </div>

      {/* In-app document viewer — renders markdown natively */}
      {docContent && (
        <Modal title={docContent.title} onClose={() => setDocContent(null)}>
          {renderMarkdown(docContent.text)}
        </Modal>
      )}
    </Modal>
  );
}
