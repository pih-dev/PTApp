import React, { useState } from 'react';
import { t } from '../i18n';

/**
 * Interactive checklist for session notes.
 * Each line in sessionNotes is an item. Lines starting with "[x] " are marked done.
 * The PT can toggle done (checkbox), delete items, or add new ones.
 * Data stays as a plain string (newline-separated) — no schema change needed.
 */
export default function SessionNotes({ session, dispatch, lang }) {
  const notes = session.sessionNotes || '';
  const lines = notes ? notes.split('\n').filter(l => l.trim()) : [];
  const [newNote, setNewNote] = useState('');

  const updateNotes = (newLines) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: newLines.join('\n') } });
  };

  const toggleDone = (idx) => {
    const updated = [...lines];
    if (updated[idx].startsWith('[x] ')) {
      updated[idx] = updated[idx].slice(4);
    } else {
      updated[idx] = '[x] ' + updated[idx];
    }
    updateNotes(updated);
  };

  const deleteLine = (idx) => {
    updateNotes(lines.filter((_, i) => i !== idx));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    updateNotes([...lines, newNote.trim()]);
    setNewNote('');
  };

  return (
    <div style={{ marginTop: 6 }}>
      {lines.map((line, idx) => {
        const done = line.startsWith('[x] ');
        const text = done ? line.slice(4) : line;
        return (
          <div key={idx} className="note-item">
            <button className="note-check" onClick={() => toggleDone(idx)}
              style={{ color: done ? '#10B981' : 'var(--t4)' }}>
              {done ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.15"/>
                  <polyline points="9 12 11.5 14.5 15.5 9.5"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                </svg>
              )}
            </button>
            <span className="note-text" style={{
              textDecoration: done ? 'line-through' : 'none',
              opacity: done ? 0.45 : 0.8,
            }}>{text}</span>
            <button className="note-delete" onClick={() => deleteLine(idx)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        );
      })}
      {/* Add new note — input with enter-to-add */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
        <input className="focus-notes" style={{ flex: 1, margin: 0, padding: '6px 10px' }}
          placeholder={t(lang, 'notesPlaceholder')}
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
        />
        {newNote.trim() && (
          <button className="note-add-btn" onClick={addNote}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
