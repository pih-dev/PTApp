# Multi-Client Session Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow selecting multiple clients when booking a session, creating one independent session per client.

**Architecture:** UI-only change in Schedule.jsx. The booking form's client dropdown becomes an "add to list" picker — select a client, they appear as a removable chip, dropdown resets. On save, loop and dispatch ADD_SESSION for each client. WhatsApp confirmations cycle one-by-one. No data model or migration changes.

**Tech Stack:** React 18 (hooks), pure CSS, Vite single-file build

**Note:** This project has no test framework. Verification is manual + build pipeline (npm run build → node --check bundle). Each task includes manual verification steps.

**Spec:** `docs/superpowers/specs/2026-04-01-multi-client-booking-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/styles.css` | Modify | Add `.client-chips` container and `.client-chip` styles |
| `src/components/Schedule.jsx` | Modify | Multi-select form state, chip rendering, save loop, WhatsApp cycling |

---

### Task 1: Add Client Chip CSS

**Files:**
- Modify: `src/styles.css` (after line 317, after `.type-btn.selected`)

- [ ] **Step 1: Add chip styles to styles.css**

Insert after the `.type-btn.selected` block (line 317):

```css
/* ─── Client Chips (multi-select booking) ─── */
.client-chips {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 8px;
}
.client-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px 6px 12px;
  border-radius: 10px;
  background: rgba(232,69,60,0.15);
  border: 1px solid rgba(232,69,60,0.3);
  color: #FF6B6B;
  font-size: 13px; font-weight: 600;
}
.client-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
  font-size: 14px; line-height: 1;
  cursor: pointer;
}
.client-chip-x:hover {
  background: rgba(255,255,255,0.2);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: Build succeeds, bundle check passes.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "Add client chip styles for multi-client booking"
git push origin master
```

---

### Task 2: Change Form State to Support Multiple Clients

**Files:**
- Modify: `src/components/Schedule.jsx:9,16-19,23-24`

This task changes the form state and the open/edit functions. It does NOT change the UI yet — that's Task 3.

- [ ] **Step 1: Change form initial state**

In Schedule.jsx line 9, change the form's initial state from `clientId` to `clientIds` (array):

```jsx
// Before:
const [form, setForm] = useState({ clientId: '', type: 'Strength', date: today(), time: '09:00', duration: 60 });

// After:
const [form, setForm] = useState({ clientIds: [], type: 'Strength', date: today(), time: '09:00', duration: 60 });
```

- [ ] **Step 2: Update openBooking to use clientIds array**

In Schedule.jsx lines 16-19, change `openBooking`:

```jsx
// Before:
const openBooking = () => {
  setEditingSession(null);
  setForm({ clientId: state.clients[0]?.id || '', type: 'Strength', date: selectedDate, time: '09:00', duration: 60 });
  setShowForm(true);
};

// After:
const openBooking = () => {
  setEditingSession(null);
  setForm({ clientIds: [], type: 'Strength', date: selectedDate, time: '09:00', duration: 60 });
  setShowForm(true);
};
```

- [ ] **Step 3: Update openEdit to keep single clientId for edit mode**

In Schedule.jsx lines 22-25, change `openEdit` to set `clientIds` as a single-element array (edit mode always edits one session):

```jsx
// Before:
const openEdit = (session) => {
  setEditingSession(session);
  setForm({ clientId: session.clientId, type: session.type, date: session.date, time: session.time, duration: session.duration });
  setShowForm(true);
};

// After:
const openEdit = (session) => {
  setEditingSession(session);
  setForm({ clientIds: [session.clientId], type: session.type, date: session.date, time: session.time, duration: session.duration });
  setShowForm(true);
};
```

- [ ] **Step 4: Verify build**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: Build succeeds. App will be temporarily broken (form references `clientId` in JSX but state is `clientIds`) — that's fixed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "Change booking form state from clientId to clientIds array"
git push origin master
```

---

### Task 3: Multi-Select Client UI in Booking Form

**Files:**
- Modify: `src/components/Schedule.jsx:168-174` (the Client field in the booking modal)

- [ ] **Step 1: Replace client dropdown with add-to-list picker and chips**

Replace the Client field block in the booking modal (lines 168-174):

```jsx
// Before:
<div className="field">
  <label className="field-label">Client</label>
  <select className="select" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
    <option value="">Select a client...</option>
    {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
</div>

// After:
<div className="field">
  <label className="field-label">Client{!editingSession && 's'}</label>
  {/* Chips for selected clients */}
  {form.clientIds.length > 0 && (
    <div className="client-chips">
      {form.clientIds.map(id => {
        const c = state.clients.find(cl => cl.id === id);
        return c ? (
          <span key={id} className="client-chip">
            {c.name}
            {/* Only show remove button when creating (not editing) */}
            {!editingSession && (
              <span className="client-chip-x" onClick={() => setForm(p => ({ ...p, clientIds: p.clientIds.filter(cid => cid !== id) }))}>×</span>
            )}
          </span>
        ) : null;
      })}
    </div>
  )}
  {/* Dropdown — hidden in edit mode since client is fixed, shown in create mode to add more */}
  {!editingSession && (
    <select className="select" style={{ marginTop: form.clientIds.length > 0 ? 8 : 0 }} value="" onChange={e => {
      if (e.target.value) setForm(p => ({ ...p, clientIds: [...p.clientIds, e.target.value] }));
    }}>
      <option value="">Select a client...</option>
      {state.clients.filter(c => !form.clientIds.includes(c.id)).map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )}
</div>
```

Key behaviors:
- Dropdown always resets to empty ("Select a client...") after picking
- Already-selected clients are filtered out of the dropdown
- Edit mode shows the client as a chip (no X, no dropdown) — the client is fixed
- Create mode allows adding/removing clients via chips + dropdown

- [ ] **Step 2: Update the Book button label to show client count**

Replace the modal's action button (line 167):

```jsx
// Before:
action={<button className="btn-primary" onClick={saveSession}>{editingSession ? 'Save Changes' : '📅 Book Session'}</button>}

// After:
action={<button className="btn-primary" onClick={saveSession}>{editingSession ? 'Save Changes' : `📅 Book Session${form.clientIds.length > 1 ? ` (${form.clientIds.length} clients)` : ''}`}</button>}
```

- [ ] **Step 3: Verify build and test manually**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Manual check with `npm run dev`:
- Open booking form → dropdown works, selecting a client shows a chip
- Select a second client → second chip appears, first client gone from dropdown
- Click X on a chip → chip removed, client reappears in dropdown
- Edit an existing session → shows client chip with no X, no dropdown

- [ ] **Step 4: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "Add multi-client selection UI with chips in booking form"
git push origin master
```

---

### Task 4: Save Loop — Create N Independent Sessions

**Files:**
- Modify: `src/components/Schedule.jsx:28-39` (the `saveSession` function)

- [ ] **Step 1: Update saveSession to loop over clientIds**

Replace the `saveSession` function:

```jsx
// Before:
const saveSession = () => {
  if (!form.clientId) return;
  if (editingSession) {
    dispatch({ type: 'UPDATE_SESSION', payload: { id: editingSession.id, ...form } });
    setShowForm(false);
  } else {
    const session = { id: genId(), ...form, status: 'scheduled', createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_SESSION', payload: session });
    setShowForm(false);
    const client = state.clients.find(c => c.id === form.clientId);
    if (client) setConfirmMsg({ client, session });
  }
};

// After:
const saveSession = () => {
  if (form.clientIds.length === 0) return;
  if (editingSession) {
    // Edit mode: update the single session (clientId stays from clientIds[0])
    const { clientIds, ...rest } = form;
    dispatch({ type: 'UPDATE_SESSION', payload: { id: editingSession.id, clientId: clientIds[0], ...rest } });
    setShowForm(false);
  } else {
    // Create mode: one session per selected client
    const created = form.clientIds.map(clientId => {
      const { clientIds, ...rest } = form;
      const session = { id: genId(), clientId, ...rest, status: 'scheduled', createdAt: new Date().toISOString() };
      dispatch({ type: 'ADD_SESSION', payload: session });
      return { client: state.clients.find(c => c.id === clientId), session };
    }).filter(c => c.client); // Only include clients that still exist
    setShowForm(false);
    if (created.length > 0) {
      // Pass all created client/session pairs for WhatsApp cycling
      setConfirmMsg({ items: created, index: 0 });
    }
  }
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: Build succeeds. The confirmMsg modal will be broken (expects old shape) — fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "Create independent sessions for each selected client on save"
git push origin master
```

---

### Task 5: WhatsApp Confirmation Cycling

**Files:**
- Modify: `src/components/Schedule.jsx:209-229` (the Success/WhatsApp modal)

The `confirmMsg` state now holds `{ items: [{client, session}, ...], index: 0 }`. The modal shows one client at a time, advancing through the list.

- [ ] **Step 1: Replace the success modal with cycling version**

Replace the entire `{/* Success + WhatsApp Prompt */}` block (lines 209-229):

```jsx
{/* Success + WhatsApp Prompt (cycles through clients) */}
{confirmMsg && (() => {
  const { items, index } = confirmMsg;
  const { client, session } = items[index];
  const total = items.length;
  const isLast = index === total - 1;
  const advance = () => {
    if (isLast) {
      setConfirmMsg(null);
    } else {
      setConfirmMsg({ items, index: index + 1 });
    }
  };
  return (
    <Modal title={total > 1 ? `Session Booked! 🎉 (${index + 1}/${total})` : 'Session Booked! 🎉'} onClose={() => setConfirmMsg(null)}
      action={<>
        <button className="btn-whatsapp-lg mb-10" onClick={() => {
          sendBookingWhatsApp(client, session);
          advance();
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Send Confirmation via WhatsApp
        </button>
        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
          onClick={advance}>{isLast ? 'Done' : 'Skip'}</button>
      </>}>
      <div className="success-center">
        <div className="success-icon">✅</div>
        <div className="success-name">{client.name}</div>
        <div className="success-detail">{formatDate(session.date)} at {session.time}</div>
      </div>
    </Modal>
  );
})()}
```

Key behaviors:
- Title shows "(1/3)" counter only when multiple clients
- "Send via WhatsApp" sends for the current client, then advances to next
- "Skip" advances without sending
- "Done" (on last client) closes the modal
- Closing the modal (X button) skips all remaining

- [ ] **Step 2: Verify build**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

- [ ] **Step 3: Manual verification with `npm run dev`**

Test these scenarios:
1. **Single client booking**: Select 1 client → Book → success modal shows as before (no counter) → Send/Skip → done
2. **Multi-client booking**: Select 3 clients → Book → success shows "Session Booked! 🎉 (1/3)" → Send → "(2/3)" → Skip → "(3/3)" → Done
3. **Edit existing session**: Tap Edit on a session → client shown as chip, no dropdown, no multi-select → Save → updates that one session
4. **Close modal early**: Book 3 clients → close modal on (2/3) → all 3 sessions still created, just skipped remaining WhatsApp prompts

- [ ] **Step 4: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "Add WhatsApp confirmation cycling for multi-client bookings"
git push origin master
```

---

### Task 6: Build, Deploy, and Version Bump

**Files:**
- Modify: `src/App.jsx` (version number in header)

- [ ] **Step 1: Bump version in App.jsx**

Find the current version string in the header and increment it (e.g., `v1.X` → `v1.X+1`).

- [ ] **Step 2: Full build and verify**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

- [ ] **Step 3: Commit version bump, push, and deploy**

```bash
git add src/App.jsx
git commit -m "Bump version for multi-client booking feature"
git push origin master

# Deploy to gh-pages
cp dist/index.html /tmp/ptapp-deploy.html
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
git add index.html
git commit -m "Deploy vX.Y: multi-client session booking"
git push origin gh-pages
git checkout master
```

- [ ] **Step 4: Report version to Pierre**

State the new version number so he can verify on his phone.
