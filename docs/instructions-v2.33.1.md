# v2.33.1 — One view on Home, chosen by the person who uses it

**Released:** 2026-08-22 · UI-only · no schema change, nothing persisted, `DATA_VERSION` stays 6.

## What changed

**The compact / expanded toggle on Home is gone. The detailed view is the only view.**

That is the whole release.

## Why, and why it took asking

The fresh-eyes navigation review ranked this **last** of its five proposals, at low confidence, with
an explicit instruction: *"If the two forms serve two real moments — glance versus act — removing it
forces one to suffer. Verify usage before killing."* That was the right call, and it is the reason
the change is safe now: **Elie was asked, and he answered.**

Asked with a picture card (`_archive/PTApp/elie-questions/3-compact-or-expanded.png`), two labelled
options: *"I use both"* / *"I only ever use one."* He chose the second. Asked which,
**he said keep the detailed one and remove the compact.**

## 🔴 The thing found while chasing his answer

Trying to work out which view he used, we looked for a stored preference. There wasn't one:

```js
const [expanded, setExpanded] = useState(true);   // Dashboard.jsx, before this release
```

**The toggle was never persisted** — not in state, not in localStorage, nowhere. It reset to
*expanded* on every mount, and the Dashboard remounts on every tab entry.

That reframes the feature. A switch whose position is thrown away every time you leave the screen is
not a preference: it is a **tax on whoever wanted the other option**, paid once per visit, forever.
If Elie had been the compact user, he would have been re-tapping it several times a day since v2.7.
He wasn't — he is the default user, which is exactly why it never surfaced as a complaint.

**The general shape, worth keeping:** an unpersisted toggle is only ever discovered by the person it
inconveniences. Silence from the user is not evidence that a toggle works; it may only mean the
default happens to be right for them. Either persist a preference or do not offer one.

## What was removed

| File | Change |
|---|---|
| `src/components/Dashboard.jsx` | The toggle button, the `expanded` state, and the entire compact branch. The detailed list (the shared `SessionCard`) is rendered unconditionally. |
| `src/components/Dashboard.jsx` | Imports pruned: `ChevronIcon` and `SessionCountPair` were used **only** by the compact rows. |
| `src/i18n.js` | `compact`, `expanded` and `bookFirst` deleted in **both** languages — `bookFirst` was the compact branch's empty state and had no other caller. |

Bundle went from 776.8 KB to 775.4 KB.

**Nothing else moved.** The renewal section, the week strip, the overview bar and every session
action are untouched. `SessionCard` is shared with Schedule and was not modified, so the two lists
still cannot drift.

## Also settled in this round, with no code change

- **The session-count edit stays in the booking screen.** The review called it a defect (package
  accounting belongs to the client); Elie chose to keep it. The "how many left?" conversation happens
  at booking with the client in front of him, and that is where he fixes the number.
  🔴 **Do not re-propose this.**
- **The "plate calculator" finding is void — there was never such a feature.** `Plates.jsx` is the
  package-progress disc row. See `docs/design/2026-08-22-fresh-eyes-navigation-review.md` §8c and the
  trap in `docs/traps.md`.

## Testing

Build + `verify-bundle.mjs` clean. Full sanity suite green except the four documented expected
failures (`live-v5-diff`, `live-v6-diff`, `live-migration` — SPENT by design; `live-supabase-diff` —
expected bare in Phase 1). No new failures.

## Provenance

Requested by **Elie**, in his own words, 2026-08-22: keep the detailed view, remove the compact one.
Relayed by Pierre in-session. Under Elie's standing authority (`CLAUDE.md` → Governance): committed
and pushed, and a live-data snapshot was taken before the v2.33 deploy that precedes this one.
