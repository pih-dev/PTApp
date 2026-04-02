import React, { useState } from 'react';
import Modal from './Modal';
import { genId, formatPhone, phoneMatchesQuery, getDefaultCountryCode, setDefaultCountryCode, SESSION_TYPES, STATUS_MAP, getMonthlySessionCount, formatDate } from '../utils';

export default function Clients({ state, dispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', gender: '', birthdate: '', notes: '' });
  const [search, setSearch] = useState('');
  const [countryCode, setCountryCode] = useState(getDefaultCountryCode);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const openAdd = () => {
    setForm({ name: '', phone: '', gender: '', birthdate: '', notes: '' });
    setEditingClient(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setForm({ name: c.name, phone: c.phone, gender: c.gender || '', birthdate: c.birthdate || '', notes: c.notes || '' });
    setEditingClient(c);
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (editingClient) {
      dispatch({ type: 'EDIT_CLIENT', payload: { ...editingClient, ...form } });
    } else {
      dispatch({ type: 'ADD_CLIENT', payload: { id: genId(), ...form } });
    }
    setShowForm(false);
  };

  const deleteClient = (id) => {
    if (confirm('Delete this client and all their sessions?')) {
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    }
  };

  const sessionCount = (clientId) => state.sessions.filter(s => s.clientId === clientId).length;

  // Month navigation helpers
  const shiftMonth = (dir) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setViewMonth(d.toISOString().slice(0, 7));
  };
  const monthLabel = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get sessions for a client in a specific month
  const getClientMonthSessions = (clientId, month) =>
    state.sessions
      .filter(s => s.clientId === clientId && s.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const toggleExpand = (clientId) => {
    if (expandedId === clientId) {
      setExpandedId(null);
    } else {
      setExpandedId(clientId);
      setViewMonth(new Date().toISOString().slice(0, 7));
    }
  };

  const filteredClients = search.trim()
    ? state.clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        phoneMatchesQuery(c.phone, search)
      )
    : state.clients;

  return (
    <div>
      <div className="section-title section-header" style={{ marginTop: 16 }}>
        <span>👥 My Clients ({state.clients.length})</span>
        <button className="btn-sm" onClick={openAdd}>+ Add</button>
      </div>

      {state.clients.length > 0 && (
        <input
          className="input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
      )}

      {state.clients.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👤</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No clients yet</div>
          <div>Tap "Add" to register your first client</div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div>No clients match "{search}"</div>
        </div>
      ) : (
        filteredClients.map(c => {
          const isExpanded = expandedId === c.id;
          const monthSessions = isExpanded ? getClientMonthSessions(c.id, viewMonth) : [];
          const monthTotal = isExpanded ? getMonthlySessionCount(state.sessions, c.id, viewMonth) : 0;
          const completedCount = isExpanded ? monthSessions.filter(s => s.status === 'completed').length : 0;
          const cancelledCount = isExpanded ? monthSessions.filter(s => s.status === 'cancelled').length : 0;
          return (
          <div key={c.id} className="card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              onClick={() => toggleExpand(c.id)}>
              <div style={{ flex: 1 }}>
                <div className="client-name">
                  {c.name}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ marginLeft: 6, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <div className="client-phone">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {c.phone}
                </div>
                {(c.gender || c.birthdate) && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
                    {c.gender === 'male' ? 'M' : c.gender === 'female' ? 'F' : ''}
                    {c.gender && c.birthdate ? ' · ' : ''}
                    {c.birthdate || ''}
                  </div>
                )}
                {c.notes && <div className="client-notes">{c.notes}</div>}
                <div className="session-count">{sessionCount(c.id)} sessions</div>
              </div>
              <div className="flex-row" onClick={e => e.stopPropagation()}>
                <button className="btn-whatsapp" style={{ padding: '8px 10px' }}
                  onClick={() => window.open(`https://wa.me/${formatPhone(c.phone)}?text=${encodeURIComponent(`Hi ${c.name}! 💪`)}`, '_blank')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
                <button className="btn-ghost" onClick={() => openEdit(c)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="btn-danger-sm" onClick={() => deleteClient(c.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>

            {/* Expanded: month navigator + session list */}
            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                {/* Month navigator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 18 }} onClick={() => shiftMonth(-1)}>‹</button>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{monthLabel(viewMonth)}</div>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 18 }} onClick={() => shiftMonth(1)}>›</button>
                </div>

                {/* Month summary */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  <span>{monthTotal} session{monthTotal !== 1 ? 's' : ''}</span>
                  {completedCount > 0 && <span style={{ color: '#10B981' }}>{completedCount} completed</span>}
                  {cancelledCount > 0 && <span style={{ color: '#EF4444' }}>{cancelledCount} cancelled</span>}
                </div>

                {/* Session list */}
                {monthSessions.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
                    No sessions this month
                  </div>
                ) : (
                  monthSessions.map(s => {
                    const st = SESSION_TYPES.find(t => t.label === s.type) || SESSION_TYPES[5];
                    const status = STATUS_MAP[s.status];
                    return (
                      <div key={s.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13
                      }}>
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                            {formatDate(s.date)} · {s.time} · {s.duration}min
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            {st.emoji} {s.type}
                            {s.focus && s.focus.length > 0 && ` · ${s.focus.join(', ')}`}
                          </div>
                          {s.sessionNotes && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontStyle: 'italic' }}>
                              {s.sessionNotes}
                            </div>
                          )}
                        </div>
                        <span className="badge" style={{ color: status.color, background: status.bg, fontSize: 11 }}>{status.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          );
        })
      )}

      {showForm && (
        <Modal title={editingClient ? 'Edit Client' : 'New Client'} onClose={() => setShowForm(false)}
          action={<button className="btn-primary" onClick={save}>{editingClient ? 'Save Changes' : 'Add Client'}</button>}>
          <div className="field">
            <label className="field-label">Full Name</label>
            <input className="input" placeholder="e.g. Ahmad Khalil" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label">Phone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ width: 72, flexShrink: 0, textAlign: 'center' }}
                value={`+${countryCode}`}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCountryCode(val);
                  setDefaultCountryCode(val);
                }}
              />
              <input className="input" style={{ flex: 1 }} placeholder="e.g. 71 123 456" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex-row-12">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Gender</label>
              <select className="select" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Birthdate</label>
              <input type="date" className="input" value={form.birthdate}
                onChange={e => setForm(p => ({ ...p, birthdate: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes (optional)</label>
            <input className="input" placeholder="e.g. Bad knee, prefers mornings" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
