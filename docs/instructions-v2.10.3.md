# v2.10.3 — Repeat-mode fork hygiene + shared renewal selector (2026-06-10)

Pure refactor — review findings **P4 + P5** from
`docs/reviews/2026-06-10-fable5-codebase-review.md`. No schema change, no user-visible change,
`DATA_VERSION` untouched.

**Trigger:** continuation of the v2.10.1 review work order. (P3 awaits Pierre's SessionCard scope
decision; P6/P7 were left for a dedicated session — P7 shipped as v2.10.4 the same day.)

> Written 2026-08-03 as part of the CLAUDE.md slim-down: this version shipped without its own
> instructions file, so its CLAUDE.md section was moved here **verbatim** (bottom of this file)
> before being collapsed to a one-liner. Nothing was reworded.

---

## What changed for the PT

Nothing visible. Two structural cleanups: the repeat-booking feature now builds its sessions through
the exact same code as a normal booking (so a field a future feature adds can't reach one path and
silently miss the other), and the "due for renewal" calculation — previously written three slightly
different ways in three tabs — is computed once and shared, so the renewal rule can no longer drift
between screens.

---

## Technical

### P4 — repeat-mode fork hygiene (`Schedule.jsx`)

- **`buildSession(clientId, date, time)`** — the ONLY place a session object is born from the
  booking form. `saveSession` (single/multi) and `createRecurring` both call it. Previously
  `createRecurring` picked fields by hand, so any session field a future feature adds (e.g. the
  eval protocol) would have silently vanished from recurring series. `date`/`time` come **after**
  the form spread so recurring rows override per occurrence.
- **One derived `mode`** = `'edit' | 'single' | 'repeatConfig' | 'repeatPreview'` replaces branching
  on three free booleans (`editingSession` / `repeat` / `preview`) across ~9 JSX sites: action
  button, modal title, repeat toggle, banner, body fork, client selector, dropdown gate, chip ×, and
  the weekday section. `bookingAction` became a keyed object lookup.
- **`resetRepeat()`** owns the 4-setter reset. The modal-close and `createRecurring` sites previously
  reset only 2 of 4 states — weekdays and count stayed dirty.

### P5 — shared renewal-due selector (`utils.js` + 3 tabs)

- **`getRenewalDueMap(clients, sessions)`** → `Map<clientId, {due, auto, effective, override,
  contractSize, pkg}>`; only contract clients appear. Memoized on the (clients, sessions) array
  **pair** via nested WeakMaps — the same array-identity pattern as P2's counted-session index, so
  components call it directly with no `useMemo`.
- **The rule itself stays in `isRenewalDue`** (the map calls it). A rule change like "due soon at
  N−1" now lands in exactly one place.
- Consumers: Schedule (`isDue()` feeds banner + auto-advance loop + chip), Dashboard (renewal section
  reads `effective`/`contractSize` from the entry), Clients (per-card `due`/`pkg`/`effective` — was
  3 helper passes per card per render).

### Process note — the PS5.1 encoding trap

A PowerShell `-replace` pipeline (used for a 3-site rename) read `Schedule.jsx` as ANSI and re-wrote
it as UTF-8, baking mojibake into every em-dash and emoji. Caught immediately with an `â€` scan,
reverted via git, re-applied with the Edit tool.

**Rule:** never round-trip source files through PS5.1 `Get-Content`/`Set-Content` without explicit
`-Encoding UTF8` on BOTH ends — or just use the Edit tool. Now also recorded in `docs/traps.md`.

---

## Verbatim from CLAUDE.md (moved here 2026-08-03, unchanged)

> ## Previous Version: v2.10.3
> Pure refactor — review findings P4 + P5. No schema change, no user-visible change.
> - **P4 — repeat-mode fork hygiene (Schedule.jsx).** `buildSession(clientId, date, time)` is THE single constructor for new sessions from the booking form — `saveSession` AND `createRecurring` both call it (new session fields now reach recurring series automatically). One derived `mode` (`'edit'|'single'|'repeatConfig'|'repeatPreview'`) replaces three free booleans across ~9 JSX sites; `resetRepeat()` owns the 4-setter reset (2 sites were partial).
> - **P5 — shared renewal selector.** `getRenewalDueMap(clients, sessions)` in utils.js → `Map<clientId, {due, auto, effective, override, contractSize, pkg}>`, memoized on the array pair (nested WeakMaps, same pattern as P2). All three tabs read it; the RULE stays in `isRenewalDue` — change it there only.
> - **Process trap:** never round-trip source files through PS5.1 `Get-Content`/`Set-Content` (ANSI default mangles UTF-8 — mojibake was caught and reverted same session). Use the Edit tool for in-file renames.

---

## Source

- `docs/changelog-summary.md` → "v2.10.3 — Internal cleanup, nothing visible"
- `docs/changelog-technical.md` → "v2.10.3 — Repeat-mode fork hygiene + shared renewal selector"
- Deploy commit: `6325249` — *Deploy v2.10.3: repeat-mode fork hygiene (P4) + shared renewal selector (P5)*
