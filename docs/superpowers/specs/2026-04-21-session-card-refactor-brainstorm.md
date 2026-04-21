---
status: WIP — brainstorm paused, awaiting Pierre's visual inspection + flow review
date: 2026-04-21
topic: SessionCard component refactor (tech debt item #4 from v2.9.3 backlog)
---

# SessionCard Refactor — Brainstorm (WIP)

## Goal
Extract the ~50–80 lines of duplicated session card JSX currently inlined in `Dashboard.jsx`, `Schedule.jsx`, and `Sessions.jsx` into a shared component. Pixel-identical visual output is the target — this is a mechanical refactor, not a redesign.

## What the exploration found

### Per-file map (line ranges)
- **`Dashboard.jsx`** — Expanded cards `165–236`, Compact cards `251–279`.
- **`Schedule.jsx`** — `182–267`.
- **`Sessions.jsx`** — `76–120`.

### Structural overlap: ~65–75%
All three share:
- Client name + `<SessionCountPair>` title block
- `ClockIcon` + time + duration + inline type-selector `<select>`
- Status badge (`badge badge-${status}` — identical class convention)
- Card wrapper with `borderInlineStart` colored by session type
- Same shared helpers: `getStatus`, `SESSION_TYPES`, `FOCUS_TAGS`, `getEffectiveSessionCount`, `formatDate`, `t()`, `haptic()`, `sendReminderWhatsApp`
- Same icons: `ClockIcon`, `EditIcon`, `TrashIcon`, `WhatsAppIcon`, `ChevronIcon`

### Divergences (the hard part — "prop-shape unification")

| Concern | Dashboard expanded | Schedule | Sessions |
|---|---|---|---|
| **WhatsApp Remind button** | Shown | Shown | **Never shown** |
| **Notes + focus visibility** | Always visible + editable | Always visible + editable | **Only when `status === 'completed'`** (via `EditableFocus` sub-component) |
| **Type-change behavior** | Preserves focus tags | **Clears focus tags** (`focus: []`) | N/A (type not editable) |
| **"Now" amber glow** | `card-now` class when current | N/A | N/A |
| **Edit button target** | Action-sheet modal | Booking-form modal | Date/time/duration modal |
| **Complete dispatch** | Helper `updateStatus(id, 'completed')` | Helper `updateStatus(id, 'completed')` | **Inline `dispatch({ type: 'UPDATE_SESSION', ... })`** |
| **Cancelled state** | Trash button | Restore/Trash | Restore + Complete |

Compact cards (Dashboard only, `251–279`) are a stripped variant — client name + time + status badge + chevron, no notes, no actions. Semantically a different thing.

### Subtle risks already logged in `docs/traps.md`
- **iOS Safari `readOnly` textarea** — Dashboard `221–224` and Schedule `250` both carry a comment warning not to use `readOnly`. Must be preserved.
- **Defensive `key` on textarea** (`key={session.sessionNotes || ''}`) — forces remount on external state change. Must be preserved.
- **`badge-${status}` CSS coupling** — fragile, but currently safe (status enum is fixed).
- **Long-press override gesture** in Schedule booking confirm is a *sibling* feature, NOT part of the card. Out of scope.

### Modal ownership
Each parent owns its own modals (action sheet, booking form, edit form). `SessionCard` must stay a pure leaf — all actions surface up as callbacks. No modals inside it.

## The open decision: scope of the first cut

Sessions.jsx is the outlier (no WA, conditional notes editing, uses `EditableFocus` wrapper). Including it forces a much wider prop surface.

- **A.** All three at once — Dashboard (expanded + compact) + Schedule + Sessions. Resolves the whole debt in one PR. Risk: accommodating every divergence inflates the API.
- **B.** **Dashboard-expanded + Schedule only** *(my recommendation)*. These two are near-twins. Smallest API, lowest risk. Compact + Sessions picked up in a follow-up once the real shape is known.
- **C.** Dashboard (both variants) + Schedule — unify the Dashboard pair with Schedule, leave Sessions alone (rarely touched, most different).

### Why I leaned toward B
Building the component against two near-identical sites first tends to produce a cleaner API than designing upfront for three. The third consumer usually reveals what's generalizable vs. what was coincidence.

## What Pierre is doing before resuming
- Visually inspect the three screens on a running dev server
- Revisit the actual logic/flow differences between Dashboard expanded / Schedule / Sessions
- Then come back with the scope decision (A / B / C — or a different framing)

## Where we are in the brainstorming skill
Checklist position: **step 3 (clarifying questions), first question open.** Design has not been drafted. No code written.

Next brainstorm questions that will follow the scope decision (for future reference):
1. API shape — discriminator union prop (`variant="dashboard-expanded"` etc.) vs. fine-grained feature flags (`showRemind`, `notesEditableOnly`, etc.) vs. render-prop/composition for the action row
2. File layout — single `SessionCard.jsx` or folder `SessionCard/`
3. Migration order — big-bang vs. one-at-a-time
4. Notes-editing behavior normalization — unify or preserve the Sessions difference
