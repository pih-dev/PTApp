# v2.12.1 — Token-expiry surfacing + Update sync token UI (2026-07-07)

No schema change, no migration. Sync/credential handling only.

**Trigger:** the Jun-30 incident — the makdissi-dev fine-grained PAT expired; every device 401'd into
a generic red dot for a week with no UI to replace a stored token. A week of the coach's bookings sat
stranded on his phone. Full trap write-up in `docs/traps.md`
("The sync credential is infrastructure with an expiry date").

> Written 2026-08-03 during the CLAUDE.md slim-down — v2.12.1 shipped with a changelog entry and a
> one-line CLAUDE.md pointer, but no instructions file. This closes that gap.

---

## What changed for the PT

**The red sync dot got smarter.** When the cloud sync key has expired, tapping the red dot opens an
**Update sync token** dialog (also always available under General → Backup). Paste the new key, tap
Connect, and everything the phone was holding syncs up — **nothing on the phone is ever touched or
lost.** The stranded week (22 sessions and a new client) was recovered the same day.

---

## Technical

- **`App.jsx`** — new `tokenExpired` state, set from all three sync failure paths: the `reconcile`
  catch, the `debouncedSync` catch (via a new 4th argument), and the retry handler (which reuses
  `reconcile`). A red-dot tap routes to `TokenUpdateModal` when `tokenExpired`; the doomed-retry
  behaviour is otherwise unchanged. The debug panel shows `(token expired)`.
- **New `TokenUpdateModal.jsx`** — validate-then-save, the same flow as `TokenSetup`. **It never
  touches local data.** `onSaved` clears the flag and retries via `reconcile()` — the
  merge-not-overwrite path, which is exactly what recovered the stranded week (+22 sessions,
  +1 client) with zero loss.
- **`General.jsx`** — always-available **Update sync token** button in the Backup row, opening App's
  modal through a new `onUpdateToken` prop.
- **i18n** — `updateToken`, `tokenExpiredMsg` (EN + AR).

---

## Ops — the bit that matters later

> 🔴 **Token `PTApp-sync-2026` (makdissi-dev, ptapp-data → Contents R/W only) EXPIRES 2027-07-06.**
> **Renew June 2027.** This is recorded in three places on purpose: here, in CLAUDE.md's Older
> Versions pointer, and in `docs/traps.md`.

Incident snapshots:
- `_archive/PTApp/incidents/2026-07-07-post-token-recovery-data.json`
- `_archive/PTApp/data-snapshots/2026-07-06-pre-v2.12-data.json`

---

## Source

- `docs/changelog-summary.md` → "v2.12.1 — Sync token can now be replaced in the app"
- `docs/changelog-technical.md` → "v2.12.1 — Token-expiry surfacing + Update sync token UI"
- Deploy commit: `ac1c1d1` — *Deploy v2.12.1: token expiry surfacing + Update sync token*
- Memory: `incident_token_expiry_20260630.md`
