# PTApp Changelog

Version history with context, decisions, and the reasoning behind each change.

---

## v1.8 — Dashboard Expanded View (2026-04-02)

**What changed:**
- Home tab now defaults to "Expanded" view showing today's sessions with full inline controls: action buttons, focus tags, session notes
- Toggle button switches between Expanded (today's sessions, full cards) and Compact (upcoming 5, tap for action sheet)
- Current/next session gets a subtle red highlight border
- Auto-scroll was added then removed (see below)

**Why:**
Flummox raised a valid point: focus tags were only available on the Schedule tab. If the PT is mid-session on the Home tab and wants to tag what muscle group he's working, he'd have to navigate to Schedule — a dead end in his flow. Pierre agreed and proposed a toggle: expanded (full functionality) as default, compact (overview) as the alternative.

**The auto-scroll saga (Flummox vs. pragmatism):**
Initially added auto-scroll to center the current/next session on screen. Flummox hammered on it:
1. "What if sessions change? Scroll won't re-trigger" — True, but the dependency was `[expanded]` only
2. "New session drops in, highlight jumps, you're scrolled to the old one" — Technically correct
3. "Stale lock! Ticking bomb!" — Dramatic but the scenario requires sessions appearing while the PT stares at Home, which can't happen (single user, local storage)

Pierre's resolution: "Maybe just the highlight is enough?" — Correct. With 5-8 sessions per day, a glowing border is easy to spot. Auto-scroll removed. Less code, zero edge cases.

**Lesson:** Don't build solutions for problems that can't occur. The highlight alone does the job.

---

## v1.7 — Session Focus Tags & Notes (2026-04-02)

**What changed:**
- Tappable focus tags on each session card in Schedule (and now Dashboard expanded)
- Tags vary by session type:
  - Strength: Chest, Back, Shoulders, Arms, Legs, Core, Glutes, Full Body
  - Cardio: Running, Cycling, Rowing, Swimming, Jump Rope, Stairs
  - Flexibility: Stretching, Yoga, Mobility, Foam Rolling
  - HIIT: Upper Body, Lower Body, Full Body, Core, Tabata, Circuit
  - Recovery: Foam Rolling, Stretching, Ice Bath, Light Cardio, Massage
- Free text session notes field (saves on blur)
- Tags and notes show read-only in Sessions tab history

**Why:**
The PT needed to record what was done during sessions. "Strength" alone doesn't tell you if it was chest day or leg day. Pierre asked for subcategories — tappable for speed, varying by session type.

**Design decisions:**
- Tags auto-save on tap — no modal, no save button. One tap = saved. This aligns with the UX principle established in this session: the PT adopted the app because it's frictionless. Any extra step risks losing him.
- Notes field designed for future expansion — the PT can write "Bench press 3x10 80kg" and later we can parse it for detailed weight/rep tracking.
- Flummox worried about accidental taps without confirmation. Pierre's response: a mistap costs one tap to undo. A confirmation dialog costs every user every time. Simplicity wins.

---

## v1.6 — Time Grid, Monthly Count, Cancel Count/Forgive, Client Fields (2026-04-01)

**What changed:**
- Default session duration changed from 60 to 45 minutes
- Time picker replaced with a visual 4-column grid (was a `<select>` dropdown)
  - Occupied slots show red with client name
  - Still allows booking on occupied slots (group sessions, overlaps are the PT's call)
- Monthly session count (#N) shown on session cards and booking chips
- Cancel flow changed from delete to "Count or Forgive" prompt
- Gender and birthdate fields added to client profiles (optional)

**Why — Time grid:**
Pierre wanted conflict awareness when booking. Flummox flagged that iOS Safari ignores `<option>` styling — you can't color individual dropdown options on iPhone. Solution: replace the `<select>` with a tappable button grid. Same data, full styling control.

**Why — Monthly count:**
The PT gets paid a lump sum per month for a set number of sessions (typically 10). The counter tracks how many sessions each client has used. Shows on every session card so the PT always knows the tally.

**Why — Cancel count/forgive:**
Before v1.6, cancelling deleted the session entirely. Problem: if a client no-shows, the PT still needs that session to count against their monthly quota. Now cancelling keeps the record and asks:
- "Count" — no-show or late cancel, counts toward monthly total
- "Forgive" — legitimate cancel with proper notice, doesn't count

**Why — Default 45min:**
Pierre's PT does 45-minute sessions by default, not 60.

**Status workflow decision:**
Pierre raised a key question: what if the PT never taps Confirm or Complete? Sessions just sit at "Scheduled" forever. Decision: everything counts regardless of status. The only thing that reduces the count is a forgiven cancellation. Confirm/Complete are optional — may be simplified or removed later.

---

## v1.5 — Multi-Client Session Booking (2026-04-01)

**What changed:**
- Booking form now supports selecting multiple clients
- Client dropdown uses "add to list" pattern: pick a client, chip appears, dropdown resets
- Each chip has an X to remove; already-selected clients hidden from dropdown
- Book button shows count: "Book Session (3 clients)"
- Creates N independent sessions (one per client) — identical to booking separately
- WhatsApp confirmation cycles through clients one by one: (1/3), (2/3), (3/3)
- Edit mode stays single-client (each session is independent)

**Why:**
The PT sometimes trains multiple clients at the same time slot. Before this, he had to create each session individually with the same date/time/type — repetitive and slow. This is purely a workflow shortcut; the end result is identical to manual booking.

**Design decision — approach:**
Three approaches were considered:
1. **Multi-select in form (chosen)** — Single change point, zero schema changes
2. **"Book for another client" button after booking** — More taps, doesn't feel like one action
3. **Duplicate session action** — Useful but doesn't solve the original ask

**Design decision — UI:**
Pierre rejected the initial proposal of checkboxes/chips with a search filter. His feedback: "the current way works well, click button, add client. In multi, click the button again add another client." Keeping the existing dropdown and just adding chips was simpler and consistent with what the PT already knows.

**Data model:**
No schema change. Each session still has a single `clientId`. The multi-select is purely a UI convenience that dispatches `ADD_SESSION` N times.

---

## Pre-v1.5 — Foundation

The app existed before this changelog. Key facts:
- Single-page React app, Vite build, pure CSS dark theme
- GitHub Pages deployment (single HTML file via vite-plugin-singlefile)
- localStorage for data, WhatsApp via wa.me links
- Bottom tab navigation: Home, Clients, Schedule, Sessions
- The PT adopted the app immediately and booked all his clients through it from day one

---

## Principles Established

These emerged from the development process and guide future decisions:

1. **UX simplicity is the priority.** The PT adopted the app because it's simple and inviting. Every feature must pass the "does this add friction?" test. Auto-save, single-tap actions, minimal steps.

2. **Don't build for scenarios that can't happen.** Single user, local storage, single device. Don't add complexity for multi-user edge cases that don't exist yet.

3. **Ship and observe.** When unsure about a feature's placement or behavior, ship the simplest version and watch how the PT actually uses it. Real usage beats assumptions.

4. **Flummox is useful.** The octopus catches real issues (iOS dropdown styling, scroll edge cases) mixed with overthinking. Filter accordingly.

5. **Everything counts.** Sessions count toward the monthly total regardless of status. Only forgiven cancellations reduce the count. The PT won't consistently tap Confirm/Complete — don't depend on it.
