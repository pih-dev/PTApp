# PTApp Instructions — v2.0

A guide for the personal trainer using the app. Covers every screen, feature, and workflow.

---

## Getting Started

Open the app in your phone's browser and bookmark it to your home screen for quick access. The app saves all data on your device — no account or login needed.

The app works **offline** — once loaded, it caches itself so you can use it even without internet. Data saves locally and syncs to the cloud when connected.

The app has four tabs at the bottom: **Home**, **Clients**, **Schedule**, and **Sessions**.

---

## Tab 1: Home (Dashboard)

Your daily overview. Shows four stats at the top:

| Stat | What it means |
|------|--------------|
| **Clients** | Total number of registered clients |
| **Today** | Sessions scheduled for today (all statuses) |
| **Confirmed** | Upcoming sessions with "Confirmed" status |
| **This Week** | Non-cancelled sessions in the next 7 days |

Below the stats, the Home tab has two views controlled by a toggle button:

### Expanded View (Default)

Shows **today's sessions** with full inline controls — everything you need without leaving Home:

- Client name with **#N** (this session's position in the month — 1st, 2nd, 3rd...)
- Time, duration, session type
- Status badge
- Action buttons: Confirm, Complete, Remind (WhatsApp), Edit, Cancel
- Focus tags (tappable — see "Recording What Was Done")
- Session notes field

**Sessions currently in progress have a red glow** — a tinted background, red border, and soft glow so you can instantly see what's happening now. All sessions running at the same time get the glow.

**Note:** Cancelled sessions are hidden from the expanded view. To restore a cancelled session, use the Schedule or Sessions tab.

### Compact View

Tap **"Compact"** to switch to a simple overview: the next 5 upcoming sessions across all dates. Tap a session card to open an action sheet with:

- **Confirm** — mark as confirmed (available when Scheduled)
- **Complete** — mark as completed (available when Scheduled or Confirmed)
- **Send Reminder** — opens WhatsApp with a reminder message
- **Edit Session** — change client, type, date, time, or duration
- **Cancel Session** — see "Cancelling a Session" below

Tap **"Expanded"** to switch back.

---

## Tab 2: Clients

Manage your client list. Shows all clients with a search bar.

### Adding a Client

1. Tap **+ Add**
2. Fill in:
   - **Full Name** (required) — auto-capitalizes on blur
   - **Nickname** (auto-populated) — defaults to the first name. Used in WhatsApp messages. You can change it to whatever the client prefers.
   - **Phone** (required) — the country code defaults to +961 (Lebanon). Change it if needed. The phone number is used for WhatsApp messaging.
   - **Gender** (optional) — Male or Female
   - **Birthdate** (optional)
   - **Notes** (optional) — e.g. "Bad knee", "Prefers mornings"
3. Tap **Add Client**

### Client Card — Tap to Expand

Tap any client card to expand it and see their session history:

- **Month navigator** — browse through months with the < > arrows
- **Monthly summary** — total sessions, completed, and cancelled counts for the selected month
- **Session list** — every session that month showing date, time, type, focus tags, notes, and status

Tap the card again to collapse it. The arrow icon rotates to show expanded/collapsed state.

### Editing a Client

Tap the pencil icon on the client card. All fields can be updated.

### Deleting a Client

Tap the red trash icon. This deletes the client **and all their sessions**. Use with caution.

### Searching

Type in the search bar to filter by name or phone number. Partial matches work — typing "71" will match any client whose phone contains "71".

### WhatsApp Quick Message

Tap the green WhatsApp icon on any client card to open a WhatsApp chat with them.

### Client Card Info

Each client card shows:
- Name (with expand/collapse arrow)
- Phone number
- Gender and birthdate (if provided)
- Notes (if any)
- Total session count (all time)

---

## Tab 3: Schedule

The main booking screen. Shows a week view with day-by-day session management.

### Navigating Dates

- **Week strip** at the top shows Mon–Sun. Tap any day to see its sessions.
- Days with active sessions have a red dot.
- Today is highlighted.
- Use **Prev/Next** buttons to move between weeks.

### Session Cards

Each session on the selected day shows:
- Client name with **#N** (session's position in the month — 1st, 2nd, 3rd...)
- Time, duration, **session type** (tappable — see below)
- Status badge
- Action buttons: Confirm, Complete, Remind (WhatsApp), Edit, Cancel
- **Focus tags** — tappable tags for what was done (see below)
- **Session notes** — free text field

### Changing the Session Type

The session type shown on each card (e.g. "Strength") is tappable. Tap it to open a dropdown and switch to a different type (Cardio, HIIT, etc.).

When you change the type:
- **Focus tags are preserved** — if you switch away and back, your selected tags are still there. Tags from a different type are simply hidden (not deleted).
- **Notes stay** — anything typed in the notes field is kept as-is.

This works on both the **Schedule** tab and the **Home** tab (expanded view). No need to open the Edit modal just to change the type.

### Recording What Was Done (Focus Tags)

Each session card has a row of tappable tags below the action buttons. Tags change based on the session type:

| Session Type | Tags |
|-------------|------|
| **Strength** | Chest, Back, Shoulders, Arms, Legs, Core, Glutes, Full Body |
| **Cardio** | Running, Cycling, Rowing, Swimming, Jump Rope, Stairs |
| **Flexibility** | Stretching, Yoga, Mobility, Foam Rolling |
| **HIIT** | Upper Body, Lower Body, Full Body, Core, Tabata, Circuit |
| **Recovery** | Foam Rolling, Stretching, Ice Bath, Light Cardio, Massage |
| **Custom** | Same as Strength |

**How to use:**
1. Tap any tag to activate it (turns red). Tap again to deactivate.
2. Select as many tags as apply — e.g. "Chest" + "Arms" for a chest-and-arms day.
3. Changes save instantly — no save button needed.

**Session notes:** Below the tags, there's a text field for anything the tags don't cover. Type details like "Bench press 3x10 80kg" or "Client felt dizzy, stopped early." Notes save when you tap away from the field.

Focus tags and notes appear in the **Sessions** tab history as a read-only record of what was done.

### Restoring a Cancelled Session

If a session was cancelled by mistake, the **↩ Restore** button appears on cancelled session cards in the Schedule tab. Tapping it sets the session back to "Scheduled" — all notes and focus tags are preserved.

### Booking a Session

1. Tap **+ Book**
2. **Select clients**: Pick a client from the dropdown. They appear as a chip below. Pick more clients to book the same session for multiple people.
   - Each chip shows **(N)** — the client's session count for the current month (before this new booking)
   - Tap the **x** on a chip to remove a client
   - Already-selected clients are hidden from the dropdown
3. **Choose session type**: Strength, Cardio, Flexibility, HIIT, Recovery, or Custom
4. **Set the date**
5. **Choose duration**: 30, 45 (default), 60, 75, 90, or 120 minutes
6. **Pick a time** from the visual grid:
   - The grid shows 15-minute slots from 05:00 to 22:00
   - **Red slots** are already occupied — they show the client's name so you know who's booked
   - A slot is marked occupied if any existing session overlaps with that 15-minute window
   - You **can** still book an occupied slot (for group sessions or back-to-back bookings) — the red is a visual warning, not a block
7. Tap **Book Session** (the button shows the client count if more than one: "Book Session (3 clients)")

### After Booking

A confirmation screen appears for each client:
- If you booked multiple clients, it cycles through them one by one: **(1/3)**, **(2/3)**, **(3/3)**
- For each client, choose:
  - **Send Confirmation via WhatsApp** — opens WhatsApp with a pre-written booking message
  - **Skip** / **Done** — move to the next client or close

### Editing a Session

Tap **Edit** on a session card. You can change the type, date, time, and duration. The client is fixed (shown as a chip, not editable). To change the client, cancel this session and book a new one.

---

## Tab 4: Sessions

A complete log of all sessions, past and present. Sessions are sorted newest first.

### Filtering

Filter buttons at the top: **Scheduled** (default), **Active**, **All**, **Confirmed**, **Completed**, **Cancelled**.

The app defaults to "Scheduled" to show what's coming up. Tap other filters to narrow the view.

### Restoring Cancelled Sessions

When viewing cancelled sessions, each card shows two buttons:
- **↩ Restore** — sets the session back to "Scheduled"
- **✅ Complete** — marks it as completed directly

All notes and focus tags are preserved when restoring.

### Session Info

Each card shows:
- Client name with **#N** (session's position in that month)
- Date, time, duration, type
- Status badge
- Focus tags and notes (read-only, if recorded)

---

## Key Workflows

### Typical Daily Workflow

1. Open **Home** to see today's overview — the current session glows red
2. **Confirm** sessions as clients acknowledge their bookings
3. **Send reminders** via WhatsApp for upcoming sessions
4. **Complete** sessions after they happen
5. Tag what was done using **focus tags** and **notes**
6. **Cancel** any no-shows or late cancellations (choose Count or Forgive)

### Checking a Client's History

1. Go to **Clients** tab
2. Tap the client's card — it expands to show their sessions
3. Use the **< >** arrows to browse different months
4. See their total sessions, completed, and cancelled counts at a glance

### Restoring an Accidental Cancellation

If a session was cancelled by mistake:
1. Go to **Schedule** tab → find the day → tap **↩ Restore** on the cancelled card
2. Or go to **Sessions** tab → filter by "Cancelled" → tap **↩ Restore** or **✅ Complete**
3. All notes, focus tags, and session data are preserved

### Booking a Group Session

When multiple clients train at the same time:

1. Go to **Schedule**, tap **+ Book**
2. Select Client A from the dropdown (chip appears)
3. Select Client B from the dropdown (second chip appears)
4. Set the session type, date, time, and duration (same for everyone)
5. Tap **Book Session (2 clients)**
6. Send WhatsApp confirmations to each client

This creates **separate, independent sessions** for each client. They show as individual cards and can be confirmed, completed, or cancelled independently.

### Cancelling a Session

When you cancel a session, the app asks how to handle it:

- **Count (No-show / Late cancel)** — The session is marked cancelled but **still counts** toward the client's monthly session total. Use this for no-shows or cancellations that were too late.
- **Forgive (Legitimate cancel)** — The session is marked cancelled and **does not count** toward the monthly total. Use this when the client cancelled with proper notice.
- **Keep Session** — Don't cancel, go back.

Cancelled sessions stay in the system (visible in the Sessions tab with a "Cancelled" badge). They are never deleted and can be restored.

---

## Session Number (#N)

The **#N** number shown next to client names on session cards shows this session's **position** in the client's month — their 1st session, 2nd session, 3rd session, etc.

**What counts:**
- Scheduled sessions
- Confirmed sessions
- Completed sessions
- Cancelled sessions marked as **Count** (no-shows)

**What doesn't count:**
- Cancelled sessions marked as **Forgive** (legitimate cancellations)

**Where it appears:**
- On session cards in Schedule, Sessions, and Home tabs
- On client chips when booking (shows current month total before the new booking)

**Monthly reset:** The counter resets to #1 at the start of each new month. This is by design — the PT tracks monthly quotas. If a client had 12 sessions in April, their first May session shows #1.

**No data is lost:** All past sessions are permanently stored. To view previous months:
- **Clients tab** — tap the client card, use < > arrows to browse any month
- **Sessions tab** — shows all sessions ever, sorted newest first
- **Schedule tab** — navigate to any past week

**Why it matters:** The PT is typically paid a lump sum per month for a set number of sessions (e.g. 10). This counter lets you track how many sessions each client has used, including no-shows that should still count against their quota.

---

## WhatsApp Integration

The app can send pre-written messages via WhatsApp at two points:

### Booking Confirmation
Sent right after booking. Message includes:
- Session type with emoji
- Date (full format)
- Time and duration
- "Like this message to confirm / Reply to cancel"

### Reminder
Sent from session cards (Remind button). Message includes:
- Client's name
- Session type, date, and time

Both messages open WhatsApp with the text pre-filled. You review and tap send — the app never sends messages automatically.

**Note:** Phone numbers must include the country code for WhatsApp links to work correctly. The app prepends the default country code (+961) if the number doesn't already include one.

---

## Session Statuses

| Status | Meaning | What can happen next |
|--------|---------|---------------------|
| **Scheduled** | Session is booked but not yet confirmed | Confirm, Complete, or Cancel |
| **Confirmed** | Client has acknowledged the booking | Complete or Cancel |
| **Completed** | Session took place | (Final state) |
| **Cancelled** | Session was cancelled | Restore to Scheduled, or mark Complete |

---

## General Panel (⋮ Menu)

Tap the **⋮** button in the top-right corner of the header (next to the version number) to open the General panel.

### Backup & Restore

Four options for backing up and restoring your data:

| Button | What it does |
|--------|-------------|
| **Backup** | Downloads a JSON file to your device with all clients and sessions |
| **Cloud Backup** | Saves a timestamped snapshot to the cloud (GitHub) |
| **Restore** | Loads a JSON file from your device and merges it with current data |
| **Cloud Restore** | Lists all cloud snapshots — tap **Merge** on any to restore it |

**Restore always merges** — it adds missing records without replacing existing ones. No data is overwritten.

### Documentation

Two links to the app's documentation on GitHub:
- **App Instructions** — this guide
- **What Changed (Changelog)** — version history and what was added/fixed

---

## Data & Storage

- All data is stored locally on your device's browser
- The app **works offline** — once loaded, it caches itself for use without internet
- Data persists between sessions — closing and reopening the browser keeps everything
- Data syncs to the cloud when connected (backup)
- **Clearing browser data will erase local app data** — cloud backup can restore it
