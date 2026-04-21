# PTApp v2.9 — Session Contracts & Package History

## What's new

### Per-client session contracts
- Optional **contract size** on every client (default blank — no change for clients who pay monthly).
- When set (e.g. 10), the period **extends** until all 10 sessions are done — it no longer resets at month-end.
- When the 10th session is hit (including scheduled-future ones): **red renewal indicator**.

### New period model
- Replaces the old 4-option dropdown (1 month / 4 weeks / etc.) with a **value + unit** pair: "Month 1", "Days 15", "Week 2" — any combination.

### Two ways to renew
- **Explicit Renew button** — appears on red-flagged clients. Opens a modal where PT sets the new contract size, new period start, length.
- **Auto-advance on booking** — if PT books another session for a limit-hit client, the app automatically closes the current package and starts a new one with the booking as session 1.

### Visibility
- **Clients tab** — red card + Renew button.
- **Dashboard** — "Due for renewal (N)" section at the top when any client is flagged.
- **Booking confirm popup** — warning banner if the booked client is at limit.

### Package history
- Every client carries a full `packages[]` history — past packages stay in the record (start, end, size, closed-when, closed-how). Foundation for future accounting.

### Audit log
- New `state.auditLog[]` captures every package lifecycle event (create, renew_manual, renew_auto, edit, override_set/cleared). Visible in exported backup JSON. Forensic safety net.

## Data model
- Every client has `packages: Array<Package>` (at least one entry).
- Current open package is `packages[packages.length - 1]` with `end: null`.
- Root fields `periodStart` / `periodLength` / `sessionCountOverride` / `overridePeriodStart` are **removed** — all live inside the current package now.

## Migration (v2 → v3)
- Automatic on first load of v2.9. No user action required.
- Synthesizes one initial package per existing client, preserving all session counts and any active overrides.
- Non-destructive: no session data changed, only transformed.

## WhatsApp placeholders
- `{number}`, `{periodEnd}` — unchanged, work as before.
- **`{packageProgress}`** — NEW, opt-in. Renders as `"7/10"` for contract packages, empty otherwise.
