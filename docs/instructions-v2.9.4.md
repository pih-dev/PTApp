# PTApp v2.9.4 — Schedule focus-tag preserve (fix + retroactive documentation)

Single-file behavioral fix plus retroactive documentation of an architected decision that had been missing from the changelog. **No schema change, no migration, no new user feature.**

## Background

On 2026-04-02, commit `eb29798` ("Preserve focus tags when switching session type") made a deliberate product decision:

> Switching a session's type (Strength → Cardio → Strength) must NOT wipe the selected focus tags. Tags from other types stay hidden (not deleted), so when the PT switches back, the prior selections reappear. This lets a single training session accumulate mixed-subcategory work across types — e.g., a Strength session that records Back work, then flips to Cardio for a segment, then returns to Strength with Back still selected.

That commit only touched `Dashboard.jsx`. Schedule's inline type-selector had been written earlier with `focus: []` on type change (the pre-decision default), and was not updated in the same commit. The decision was also never captured in `docs/changelog-summary.md` or `docs/changelog-technical.md` — it survived only as a file-level comment in Dashboard and as the `eb29798` commit message.

## What surfaced it

During the v2.9.4 SessionCard-refactor brainstorm (2026-04-21, see `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md`), the divergence between Dashboard (preserves) and Schedule (clears) was flagged as a design question: "do we unify, and if so, which way?" Pierre immediately recognized it as an architected-and-approved behavior that had simply missed Schedule AND missed the changelog, so no durable project memory could remind a reviewer it was intentional-but-incomplete.

## The fix

**`Schedule.jsx:199-204` — remove `focus: []` from the inline type-selector dispatch.**

```jsx
// BEFORE (Schedule.jsx:199-201)
{/* Inline type selector — change type, auto-clear focus tags */}
<select className="inline-type-select" value={session.type} onChange={e => {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value, focus: [] } });
}}>

// AFTER
{/* Inline type selector — keep focus tags so switching back preserves selections.
     Tags from other types stay hidden (not deleted) so a mixed-subcategory session
     can accumulate work across types without losing prior selections.
     Matches Dashboard behavior (decided 2026-04-02, commit eb29798). */}
<select className="inline-type-select" value={session.type} onChange={e => {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
}}>
```

Schedule now matches Dashboard exactly: dispatches only `type`, leaves `focus` untouched. No other consumers of this behavior found — a `focus: \[` grep across `src/` returned zero other matches.

## The documentation layer (equally important)

1. **`docs/changelog-summary.md`** — v2.9.4 section added, recording both the fix AND the original 2026-04-02 behavior decision in plain language.
2. **`docs/changelog-technical.md`** — v2.9.4 section with code snippets, commit reference, and the process-lesson write-up.
3. **`docs/traps.md`** — new TRAP "Architected behavior not propagated to every author site + missing from changelog." Third instance of the "one author site updated, others missed" pattern (after v2.8 `.mode/.type` and v2.9.2 inline-override). The new guidance is two-part:
    - Propagate architected behaviors to every author site in the same commit (pre-commit grep).
    - Every architected behavior decision lands in both changelogs, not just a file comment.
4. **`CLAUDE.md`** — current-version block promoted v2.9.3 → v2.9.4.

## Why the paperwork is the real deliverable

The one-line code fix took seconds; the reason v2.9.4 ships as its own version (rather than being absorbed into the eventual SessionCard refactor) is that Pierre identified a **process gap**: architectural decisions that live only in commit messages + file comments are invisible to future reviewers, future Claude sessions, and even to Pierre himself three weeks later. The durable record must live in the changelog. Codifying that rule in `docs/traps.md` is the lasting value of this release.

## What v2.9.4 is NOT

- Not the SessionCard refactor. That brainstorm (step 3 of the superpowers:brainstorming skill) is explicitly paused awaiting Pierre's scope decision (A / B / C); see `memory/project_sessioncard_brainstorm_paused.md` and `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md`. Resume in a later session.
- Not a unification of the other Dashboard ↔ Schedule ↔ Sessions divergences (WhatsApp button presence, notes-editing conditionality, modal target, cancelled-state actions). Those are part of the SessionCard refactor scope, not this one.
- Not a redesign of the inline type-selector UX — it still looks and reads the same; only the side-effect of changing type is now consistent across the two screens that expose it.

## Verification

- `grep -rn "focus: \[" src/` → zero matches after the fix (was 1 before).
- Manual flow (Dashboard, verified during brainstorm): open a Strength session → select Back → switch to Cardio → switch back to Strength → Back is still selected. ✓
- Manual flow (Schedule, post-fix target): open a session in the weekly view → change type via inline `<select>` → switch back → tags preserved. (Requires post-deploy test on PT's iPhone for full confirmation.)
- Sanity scripts unchanged — this is not a reducer-level change, the behavior lived in call-site dispatch shape.

## Files touched

| File | Change |
|------|--------|
| `src/components/Schedule.jsx` | Remove `focus: []` from inline type-selector dispatch; update comment |
| `src/App.jsx` | Version bump v2.9.3 → v2.9.4 in debug panel |
| `docs/traps.md` | New TRAP — architected behavior not propagated / not in changelog |
| `docs/changelog-summary.md` | Prepend v2.9.4 section |
| `docs/changelog-technical.md` | Prepend v2.9.4 section |
| `CLAUDE.md` | Promote v2.9.3 → previous, add v2.9.4 as current |
| `docs/instructions-v2.9.4.md` | NEW (this doc) |

## Still in the backlog (unchanged from after v2.9.3)

- **#4 — Shared `<SessionCard>` extraction** (brainstorm paused at step 3; scope decision A/B/C open).
- PT smoke test of v2.9.2 Schedule pencil fix + v2.9.3 error boundary on real iPhone data (user action).
- Catalog screenshots for v2.9 / v2.9.1 / v2.9.2 / v2.9.3 / v2.9.4 (user action).
- App name finalization (Stage 2 blocker).
