# Recurring Session Generator

**Date:** 2026-06-09
**Status:** Approved (design)
**Scope:** Schedule.jsx booking form + one new batch reducer action + a date-generation helper. Calendar-only — no schema change, no migration.

## Problem

Many of the PT's clients train on a fixed weekly pattern — e.g. every Mon/Wed/Fri at 8:15. Today the PT books each of those sessions one at a time (pick client, type, date, time, duration → repeat). For a 10-session protocol that's 10 manual bookings. He wants to enter the pattern once — **which client, which weekdays, what time, how many sessions** — and have the app populate the calendar.

Originally framed around a fixed "10 sessions"; refined during brainstorming so the **session count is a free input** (not hardcoded). The count is the stop criterion: the protocol spans however many weeks the weekday cadence implies (Mon/Wed/Fri × 10 ≈ 3.3 weeks).

## Decisions (locked during brainstorming 2026-06-09)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Calendar-only.** Generating sessions does NOT touch the client's package / `contractSize` / renewal state. | No schema change, no migration, and avoids the package/renewal edge cases (zero-day-artifact packages, Elie Jabbour May 11). Existing contract logic keeps counting these like any other session. |
| D2 | **One fixed time** across all chosen weekdays. | Matches the PT's example exactly. Individual sessions can be edited afterward, so per-day times are unnecessary (YAGNI). |
| D3 | **Preview + deselect** before creation. | Bulk creation is hard to undo; a preview lets the PT catch a wrong count/start date and untick holidays or conflicts before committing. |
| D4 | **No WhatsApp at generation time.** | The app has no backend and cannot auto-send the day before. Day-before reminders are a *separate* follow-up feature (a "tomorrow's reminders" surface). The generator stays purely about calendar population. |
| D5 | **Per client** — recurring mode is single-client. | A recurring pattern belongs to one client; the multi-client chip list is for one-off group bookings. |
| D6 | **No linked "series" object.** Generated sessions are ordinary independent records. | Consistent with the existing multi-client booking precedent. Edit/cancel happen per session. Avoids new schema + series-lifecycle complexity. |

## Design

### 1. Entry point & form (Schedule.jsx — new bookings only)

A **"Repeat"** toggle at the top of the New Booking form. Default OFF (form behaves exactly as today). When ON, the form switches to recurring mode:

- **Client** — single-select only. The multi-client "add to list" chip UI is hidden in repeat mode (D5).
- **Weekdays** — a row of 7 day-toggle chips (Mon–Sun), multi-select. At least one required.
- **Time** — the existing single time picker (`TIMES`), one value for all chosen days (D2).
- **Type / Duration** — the existing `SESSION_TYPES` / `DURATIONS` fields, unchanged.
- **Number of sessions** — numeric input, validated to **1–60** (clamp; empty/invalid disables Preview).
- **Start date** — the form's current date (`selectedDate`). Generation runs forward from this date inclusive.
- Primary button is **Preview** (not instant Book).

Edit mode is unaffected — editing an existing session is always single-session and never shows the Repeat toggle.

### 2. Date generation (new helper in utils.js)

```js
// Walk forward from startDate; collect each date whose weekday is selected,
// until `count` dates are gathered. weekdays = Set/array of 0..6 (Sun..Sat, JS getDay()).
generateRecurringDates(startDate, weekdays, count) -> string[]  // ['YYYY-MM-DD', ...]
```

- Pure function. Uses **local date helpers only** (`localDateStr` / local `Date` math) — never `toISOString` (UTC trap, see `docs/traps.md`).
- Iterates day-by-day; includes the start date itself if its weekday is selected.
- **Safety cap** on the walk (e.g. max 730 iterations) so an empty `weekdays` set or an unreachable count can never loop forever — returns whatever it gathered.

### 3. Preview + deselect

After Preview, render the computed list. Each row: weekday + formatted date + time (`Mon · Jun 9 · 8:15`), with a checkbox **ticked by default**.

- **Conflict flag:** a row where the *same client* already has a non-cancelled session at that **date + time** is marked "already booked" and **unticked by default**. (Reuse the spirit of `getOccupiedSlots`, but scoped to this client + exact slot — a same-client duplicate is a true conflict, whereas different clients sharing a slot is intentional group training.)
- Footer button: **Create N sessions**, where N = currently ticked rows. Disabled if N = 0.
- The PT can untick any row (holiday, client unavailable) before confirming.

### 4. Create (batched)

New reducer action **`ADD_SESSIONS`** (array payload) in `utils.js`:

```js
case 'ADD_SESSIONS':
  return { ...state, sessions: [...state.sessions,
    ...action.payload.map(s => ({ ...s, _modified: now() })) ] };
```

- One dispatch for all ticked dates → one re-render, one debounced sync push. Honors the **"single dispatches in loops"** trap (precedent: `BATCH_COMPLETE`).
- Each session is a normal independent record: `{ id: genId(), clientId, type, date, time, duration, status: 'scheduled', createdAt: localDateStr(new Date()) }`.
- **No `RENEW_PACKAGE`** — contracts untouched by design (D1). (Note: this intentionally differs from single-booking, which auto-renews a renewal-due client. Recurring generation never renews.)

### 5. WhatsApp

Nothing is sent at creation time (D4). Day-before reminders remain the existing per-session reminder button, with a dedicated "tomorrow's reminders" surface scoped as a separate follow-up.

## Files to modify

| File | Change |
|------|--------|
| `src/components/Schedule.jsx` | Repeat toggle, weekday chip selector, count input, Preview step with conflict-flagged deselectable list, create handler dispatching `ADD_SESSIONS` |
| `src/utils.js` | `generateRecurringDates()` helper; `ADD_SESSIONS` reducer case |
| `src/styles.css` | Weekday toggle chips, preview list rows, conflict styling |
| `src/i18n.js` | New EN/AR strings: Repeat, weekday labels (if not present), session-count label, Preview, "already booked", "Create N sessions" |

## Testing

`scripts/sanity/sanity-recurring.mjs`:
- `generateRecurringDates`: count honored exactly; start date included when its weekday matches; correct span across multiple weeks; single-weekday pattern; all-7-days pattern; empty weekdays → safety-capped empty/partial result.
- Conflict detection: same client + same date + time flagged; different client same slot NOT flagged; cancelled session at slot NOT flagged.
- `ADD_SESSIONS` reducer: N sessions appended in one dispatch, each stamped `_modified`, existing sessions preserved.

## Edge cases

- **No weekdays selected** → Preview disabled.
- **Count out of range** → clamp to 1–60; invalid input disables Preview.
- **Start date weekday selected** → counts as the first generated session.
- **All rows unticked in preview** → Create disabled.
- **DST / month/year rollover** → handled by local date helpers, not UTC.

## Not doing (YAGNI)

- No linked series object (D6) — generated sessions are independent.
- No per-day times (D2).
- No contract/package coupling (D1).
- No WhatsApp at generate time (D4).
- The "tomorrow's reminders" surface is a separate, later feature — out of scope here.
