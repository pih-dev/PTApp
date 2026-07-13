# PTApp App Health

Umbrella doc for forward-looking maintenance concerns — dials we can turn when
data blob, reducer time, sync payload, or UI density start feeling heavy.

Not a list of past incidents (those live in `CLAUDE.md` TRAPS). Not a known-bug
list (those live in `CLAUDE.md` KNOWN ISSUES). This file tracks **knobs we
deliberately introduced** so we don't forget they exist.

---

## Feature Overhead Register

Features with cost/granularity knobs. Revisit at each major version, or when
a listed trigger fires. When a trigger fires, turn the knob to the "lighter"
option and document the change in the changelog.

### Audit log (v2.9+)

- **Path:** medium
- **Current knob:** package-level events only — `package_created`,
  `package_renewed_manual`, `package_renewed_auto`, `package_edited`,
  `override_set`, `override_cleared`. No session-level events.
- **Heavier option:** add session-level events (add/edit/cancel). Estimated
  +5–10× entries.
- **Lighter option:** drop `package_edited` and override events, keep only
  renewals and creations. Estimated −60% entries.
- **Retention:** forever. No trim.
- **Revisit trigger:**
  - `state.auditLog.length > 10_000`
  - OR data blob > 2 MB
  - OR sync push > 3s on Pierre's Android

### Accounting (future — v3.x?)

- **Path:** medium (projected)
- **Current knob:** TBD at design time.
- **Heavier option:** full double-entry ledger per session (debit/credit per
  package sold, session delivered).
- **Lighter option:** monthly revenue rollup + per-client balance summary.
- **Revisit trigger:** design it lighter from day one unless reporting
  requirements explicitly demand more.

### Program generation (v2.13+)

- **Path:** heavy
- **Current knob:** new surfaces `ProgramSetup.jsx` / `ProgramViewer.jsx`; new
  data collection `state.programs[]`, append-only (regeneration ADDS, never
  overwrites — viewer shows newest). Each record ~27–38KB frozen at generation
  (blocks/days/exercises fully expanded, no lazy re-derivation). That puts the
  budget at roughly 25–30 programs total before data.json alone would approach
  the GitHub contents API's 1MB no-inline ceiling (before clients/sessions/
  evaluations/auditLog are even counted).
- **Overhead:**
  - Exercise bank regeneration whenever Elie revises exercise selection/
    prescriptions — full re-review of `exerciseBank.js` content, not a
    mechanical bump.
  - Version discipline: `PROGRAM_RULES_VERSION` (`programRules.js`) and
    `EXERCISE_BANK_VERSION` (`exerciseBank.js`) must bump on ANY change to
    their respective tables — frozen program records carry the version they
    were generated under, so old records keep their frozen output.
  - No `DELETE_PROGRAM` UI yet, though the reducer action + full audit-trail
    forensic copy exist. The i18n keys tied to a delete affordance are
    deliberately unused for now, not dead-code drift.
- **Heavier option:** per-block lazy exercise expansion (store method + params,
  re-derive exercise list from the bank at render time) — cuts record size
  significantly but breaks the "frozen forever" guarantee if the bank changes
  underneath an old program.
- **Lighter option:** cap history — keep only the N most recent programs per
  client, archive older ones out of the synced blob.
- **Retention:** forever, append-only. No trim yet.
- **Revisit trigger:**
  - `state.programs.length` approaching the ~25–30 budget above
  - OR data blob > 1MB (contents API inlining ceiling)
  - OR Elie asks for a bank/rules change more than once a quarter (regeneration
    overhead starts to dominate maintenance time)
- **PRUNING PRECONDITION (Pierre's standing rule, 2026-07-13):** before any
  program-pruning implementation runs against live data, download data.json
  from makdissi-dev/ptapp-data to the PC first — archive as
  `C:\projects\_archive\PTApp\data-snapshots\YYYY-MM-DD-pre-prune-data.json`.
  Pruning deletes are irreversible in the cloud; the local archive is the
  recovery copy (same mechanism as pre-deploy snapshots).

### (add future medium/heavy-path features here)

---

## Data Size Budget

Placeholder — seed if we ever hit sync or localStorage limits.

Rough targets:
- localStorage: under 5 MB (most browsers cap at 5–10 MB)
- Sync push payload: under 1 MB for reliable Beirut-internet pushes
- Single reducer dispatch: under 50 ms on Pierre's Android

---

## Performance Budget

Placeholder.

---

## Sync Health Notes

Current sync model is per-record `_modified` + `mergeById` union (v2.6+). See
`CLAUDE.md` TRAPS for the two data-loss incidents that shaped it. Any future
change to sync mechanics should be evaluated against both incidents.
