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
