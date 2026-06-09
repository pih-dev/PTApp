# v2.10.0 — Recurring Session Generator

**Date:** 2026-06-09
**Type:** New feature. Calendar-only — no schema change, no migration.
**Spec:** `docs/superpowers/specs/2026-06-09-recurring-session-generator-design.md`
**Plan:** `docs/superpowers/plans/2026-06-09-recurring-session-generator.md`

## What it does

The PT can now book a whole recurring protocol in one pass instead of one session at a time. In the New Booking form there's a **Repeat** toggle. Turn it on and the form becomes:

- **Client** — single-select (recurring is per-client).
- **Repeat on** — seven weekday chips (Mon-first, localized), multi-select.
- **Time** — one time for all chosen days (sessions can be edited individually afterward).
- **Type / Duration** — the existing fields.
- **Number of sessions** — a count (1–60). This is the stop criterion: Mon/Wed/Fri × 10 spans ~3.3 weeks automatically.

Tapping **Preview** shows the exact list of dates that will be created, each pre-ticked. Any slot where that **same client** already has a session at that date+time is flagged **"Already booked"** and pre-unticked. The PT can untick holidays / unavailable dates. **Create N sessions** commits them.

## The six locked decisions (from brainstorming)

| # | Decision | Why |
|---|----------|-----|
| D1 | Calendar-only — does NOT touch packages / `contractSize` / renewal | No schema change, no migration, avoids the package/renewal edge cases (zero-day-artifact packages). Existing contract logic keeps counting these like any other session. |
| D2 | One fixed time across all days | Matches the PT's example; individual sessions editable later (YAGNI on per-day times). |
| D3 | Preview + deselect before creating | Bulk creation is hard to undo; catch a wrong count/start date and untick conflicts up front. |
| D4 | No WhatsApp at generation time | App has no backend — it can't auto-send the day before. Day-before reminders are a separate follow-up feature. |
| D5 | Per-client (single-client in repeat mode) | A recurring pattern belongs to one client; the multi-client chip list stays for one-off group bookings. |
| D6 | No linked "series" object — generated sessions are ordinary independent records | Consistent with multi-client booking; edit/cancel per session; no new schema. |

## Implementation

**`src/utils.js`**
- `generateRecurringDates(startDate, weekdays, count)` → array of `'YYYY-MM-DD'`. Walks forward from `startDate` (inclusive), collects each date whose `getDay()` is in `weekdays` (0=Sun..6=Sat) until `count` gathered. Local-time only (never `toISOString` — UTC drift trap). Safety cap of 730 iterations so an empty weekday set or unreachable count can't loop forever.
- `hasClientSlotConflict(sessions, clientId, date, time)` → bool. True only for a **same-client** non-cancelled session at the exact slot. Two different clients sharing a slot is intentional group training, not a conflict.
- `ADD_SESSIONS` reducer case — batch-appends all generated sessions in one dispatch (one re-render, one debounced sync push), each stamped `_modified: now()`. Honors the "single dispatches in loops" trap; mirrors the `BATCH_COMPLETE` precedent.

**`src/components/Schedule.jsx`**
- New state: `repeat`, `weekdays` (Set), `count` (default 10), `preview` (null | rows).
- Module-scope `WEEKDAY_ORDER = [1,2,3,4,5,6,0]` + `weekdayLabel(jsDay, lang)` (Mon-anchored on 2024-01-01, localized via `toLocaleDateString`).
- Repeat toggle + single-client select + weekday chips + count input, all gated `!editingSession`. The existing multi-client chip block is gated `!repeat` (preserved verbatim, including the v2.9.6 ordinal simulation).
- `buildPreview()` computes the rows; `createRecurring()` filters kept rows → one `ADD_SESSIONS` dispatch, then closes the form and jumps the week strip to the first generated date. No `RENEW_PACKAGE`.
- Context-aware `bookingAction`: editing → Save; repeat+preview → Back + "Create N sessions" (disabled at 0 kept); repeat+no-preview → Preview (disabled until client + ≥1 weekday + count≥1); normal → the unchanged "📅 Book Session" button.

**`src/i18n.js`** — EN/AR keys: `repeatSessions`, `recurringWeekdays`, `recurringCount`, `recurringPreview`, `recurringAlreadyBooked`, `recurringCreate`, `sessionsLower`, `recurringBack`.

**`src/styles.css`** — `.repeat-toggle`, `.weekday-row`/`.weekday-chip`, `.recurring-preview`/`.preview-row`/`.preview-flag`/`.preview-date`. Theme-aware (`--t*`, `--sep`), conflict rows amber, RTL-safe.

## Testing

`scripts/sanity/sanity-recurring.mjs` — 21 assertions: date generation (count honored, start-on-matching-day, multi-week span, single weekday, all-7-days, empty/zero guards), conflict detection (same-client hit, different-time miss, different-client miss, cancelled miss), and the `ADD_SESSIONS` reducer (batch append, order preserved, `_modified` stamped). All pass alongside the existing reducer/counting/slidingwindow suites.

## Not done (deferred)

- "Tomorrow's reminders" surface (one-tap day-before WhatsApp) — separate follow-up.
- This is **feature #1 of 3** the PT requested. #2 = evaluation protocol (timed/chart-normed tests — note this conflicts with the paused Apr 21 "observe & grade 1–5" eval spec and must be reconciled). #3 = auto program proposal (depends on #2).
