# Multi-Client Session Booking

**Date:** 2026-04-01
**Status:** Approved
**Scope:** UI-only change in Schedule.jsx booking form

## Problem

The PT sometimes trains multiple clients at the same time slot. Currently he must create each session individually — same type, date, time, duration — just picking a different client each time. This is repetitive and slow.

## Solution

Allow selecting multiple clients when booking a new session. Each selected client produces an independent session record. The end result is identical to booking N sessions manually — this is purely a workflow shortcut.

## Design

### Booking Form Changes (Schedule.jsx — new bookings only)

**Client selection — "add to list" pattern:**
1. The existing client `<select>` dropdown stays as-is
2. When the PT picks a client, the client appears as a chip/tag below the dropdown
3. The dropdown resets to "Select a client..." — ready for the next pick
4. Already-selected clients are hidden from the dropdown to prevent double-picking
5. Each chip has an X button to remove a client from the selection
6. At least 1 client must be selected to enable the "Book Session" button

**Form state change:**
- Replace `form.clientId` (string) with `form.clientIds` (array of strings) for new bookings
- Edit mode continues using a single `clientId` since each session is independent

**Book button label:**
- 1 client selected: "Book Session" (same as today)
- 2+ clients: "Book Session (N clients)"

### Session Creation

On save, loop through `form.clientIds` and dispatch `ADD_SESSION` for each:
```js
form.clientIds.forEach(clientId => {
  const session = { id: genId(), clientId, type: form.type, date: form.date,
                    time: form.time, duration: form.duration,
                    status: 'scheduled', createdAt: new Date().toISOString() };
  dispatch({ type: 'ADD_SESSION', payload: session });
});
```

Each session gets its own `id`, `status`, and `createdAt`. They are fully independent.

### WhatsApp Confirmation Flow

After booking multiple clients:
1. The success modal shows confirmations one at a time
2. Header shows progress: "Client 1 of 3"
3. PT taps "Send via WhatsApp" or "Skip" to advance to the next client
4. After the last client, the modal closes

For single-client bookings, the flow is identical to today — no visible change.

## What Does NOT Change

- **Data model**: Each session still has a single `clientId`. No schema change.
- **No migration needed**: DATA_VERSION stays at 1.
- **Edit flow**: Editing a session works on a single session with one client (as today).
- **Dashboard.jsx**: Already renders per-session — no changes needed.
- **Sessions.jsx**: Already renders per-session — no changes needed.
- **Reducer (utils.js)**: All actions stay the same — ADD_SESSION is called N times.
- **WhatsApp helpers**: `sendBookingWhatsApp` and `sendReminderWhatsApp` are unchanged.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/Schedule.jsx` | Booking form: multi-select UI, save loop, WhatsApp confirmation cycling |
| `src/styles.css` | Chip/tag styles for selected clients |

## Edge Cases

- **Only 1 client exists**: Works exactly as today (select the one client, book).
- **PT removes all chips**: Book button disabled, same as empty clientId today.
- **PT selects 1 client**: Identical to current single-client flow.
