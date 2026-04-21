# PTApp v2.9.3 — Error boundary + sanity-script promotion

Two pieces of ongoing-maintenance work pulled from the post-v2.9.2 backlog (`memory/project_todo_after_v292.md`). **No schema change**, no migration, no new user-facing feature. Both are debt-reduction.

## 1 — Top-level React error boundary

**The problem.** The app reads from `localStorage['ptapp-data']` on every load and feeds it through `migrateData`. If that data is corrupted (manual edit, partial write during a crash, future-version blob from a downgraded device), or if a future migration throws, React renders nothing — the user sees a blank white screen with no escape hatch. The data is still in localStorage; the user just has no way to reach it.

**The fix.** New `src/components/ErrorBoundary.jsx` (class component — React requires class for `getDerivedStateFromError` / `componentDidCatch`). `main.jsx` wraps `<App />` inside `<ErrorBoundary>`. If anything throws during render, the boundary shows a recovery screen with three actions:

- **⬇ Download backup** — dumps `localStorage['ptapp-data']` raw to a JSON file with a timestamped name. Always offered first so the user can preserve data before doing anything destructive.
- **⟳ Try again** — `window.location.reload()`. Sometimes a transient state issue clears.
- **⨉ Reset (erase local data)** — `localStorage.removeItem('ptapp-data')` + reload. Confirmed via `window.confirm()` in EN+AR. Last resort.

Below the buttons, a collapsible "Error details" reveals the stack trace so Pierre can debug.

**Deliberate isolation.** The boundary does NOT use:
- **i18n** — the i18n module itself could be the source of crash; copy is hardcoded EN+AR.
- **CSS variables / styles.css** — stylesheet load may have failed; all styles inline with a safe dark palette.
- **Shared components** — any of those could be the crash source.

Result: even if everything else is broken, the recovery screen still renders.

**Touch:** safe-area insets honored (top + bottom), 14px button padding for thumb tap targets, max-width 480px so it doesn't stretch awkwardly on a desktop browser.

## 2 — Sanity scripts promoted out of `tmp/`

**The problem.** Per `~/.claude/CLAUDE.md`, `tmp/` is documented wipe-able dev scratch. The five sanity scripts (`sanity-reducer.mjs`, `sanity-counting.mjs`, `sanity-slidingwindow.mjs`, `sanity-migration.mjs`, `sanity-live-migration.mjs`) had become first-class assets — they caught the v2.9.2 inline-override regression specifically *because* they were extended with a regression block before deploy. Leaving them in a wipe-able folder was a latent risk.

**The fix.** All five scripts moved `tmp/` → `scripts/sanity/` via `git mv` (history preserved):

```
tmp/sanity-counting.mjs        → scripts/sanity/sanity-counting.mjs
tmp/sanity-live-migration.mjs  → scripts/sanity/sanity-live-migration.mjs
tmp/sanity-migration.mjs       → scripts/sanity/sanity-migration.mjs
tmp/sanity-reducer.mjs         → scripts/sanity/sanity-reducer.mjs
tmp/sanity-slidingwindow.mjs   → scripts/sanity/sanity-slidingwindow.mjs
```

Internal changes per file:
- `import` paths bumped one level deeper: `../src/utils.js` → `../../src/utils.js`
- `// Run:` header comments updated to the new path
- `sanity-live-migration.mjs` snapshot lookup is `__dirname`-relative, so it now reads from `scripts/sanity/live-snapshot-v2.8.json`
- Removed stale `// Delete after v2.9 ships.` comments — these scripts have proven their value as long-lived dev helpers

`.gitignore` updated to add the new snapshot patterns alongside the old ones (kept both until any historical workflow is fully retired):

```
tmp/live-snapshot-*.json
tmp/*-snapshot.json
scripts/sanity/live-snapshot-*.json
scripts/sanity/*-snapshot.json
```

Doc references updated in:
- `CLAUDE.md` — Data Preservation rule, deploy section, sanity-scripts list line
- `docs/traps.md` — v2→v3 migration TRAP (3 path mentions in the migration-gate workflow)

Historical docs (`docs/changelog-technical.md` v2.9.2 section, `docs/instructions-v2.9.2.md`, `docs/superpowers/plans/*`) intentionally left as-is — they accurately describe what was true at write-time.

## Verification

All four runnable sanity scripts pass at the new path (live-migration not run — needs PT's local snapshot):

```
node scripts/sanity/sanity-slidingwindow.mjs   → 13 passed, 0 failed
node scripts/sanity/sanity-migration.mjs       → all assertions pass
node scripts/sanity/sanity-counting.mjs        → all assertions pass
node scripts/sanity/sanity-reducer.mjs         → all assertions pass (incl. v2.9.2 inline-confirm regression block)
```

Build + bundle syntax check pass on Node. Error boundary hasn't been triggered in real use — by design it's inert until React throws.

## Files touched

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.jsx` | NEW — class boundary + recovery UI |
| `src/main.jsx` | Wrap `<App />` in `<ErrorBoundary>` |
| `src/App.jsx` | Version bump v2.9.2 → v2.9.3 in debug panel |
| `scripts/sanity/*.mjs` | Moved from `tmp/`, internal paths bumped |
| `.gitignore` | Add `scripts/sanity/` snapshot patterns |
| `CLAUDE.md` | Update sanity-script paths (3 places); current-version block |
| `docs/traps.md` | Update sanity-script paths in v2→v3 migration TRAP |
| `docs/changelog-summary.md` | Prepend v2.9.3 section |
| `docs/changelog-technical.md` | Prepend v2.9.3 section |
| `docs/instructions-v2.9.3.md` | NEW (this doc) |

## What's NOT in v2.9.3 (still in the post-v2.9.2 backlog)

- PT smoke test of the v2.9.2 Schedule.jsx pencil fix on real iPhone data (user action)
- Catalog screenshots for v2.9 / v2.9.1 / v2.9.2 (user action)
- Shared `<SessionCard>` extraction across Dashboard / Schedule / Sessions (item #4 — bigger refactor, deferred to its own session per the brainstorming requirement)
- App name finalization (Stage 2 blocker)
