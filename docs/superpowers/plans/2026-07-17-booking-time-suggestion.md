# Booking Time Suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Schedule booking form suggests 08:15 as the starting time and auto-jumps to the first free 15-minute slot on days that already have sessions, without ever overwriting a time the PT tapped manually.

**Architecture:** One pure helper `suggestBookingTime(sessions, clients, date)` in `utils.js` (single-owner rule, like `getFocusTags`). `Schedule.jsx` calls it in `openBooking` and on date change, gated by an ephemeral `timeTouched` flag. Dashboard needs NO behavior change — its modal is edit-only (see spec correction).

**Tech Stack:** React 18, plain JS, node `.mjs` sanity scripts (no test framework).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-17-booking-time-suggestion-design.md` (incl. the Dashboard correction section)
- UI-only: no `DATA_VERSION` change, nothing persisted, no new i18n strings
- Approval provenance: designed with Elie in-session 2026-07-17; "approved" given in-session — commit messages must say so for Pierre's audit trail
- Version bump: v2.14.0 → **v2.14.1** in App.jsx debug panel
- Never use `toISOString()`; dates are `YYYY-MM-DD` strings, times `HH:MM`
- Full pipeline after code: build → bundle `node --check` verify → commit+push master → deploy gh-pages → verify Pages build reaches `built`

---

### Task 1: `suggestBookingTime` helper + sanity script

**Files:**
- Modify: `src/utils.js` (insert after `getOccupiedSlots`, ~line 189)
- Test: `scripts/sanity/sanity-suggest-time.mjs` (new)

**Interfaces:**
- Consumes: existing `getOccupiedSlots(sessions, clients, date)` and `TIMES` (both already in utils.js)
- Produces: `export const suggestBookingTime = (sessions, clients, date) => string` — returns an `HH:MM` slot from `TIMES`

- [ ] **Step 1: Write the failing sanity script**

Create `scripts/sanity/sanity-suggest-time.mjs`:

```js
// Sanity: suggestBookingTime — booking-form slot suggestion (v2.14.1).
// Rule (spec 2026-07-17): first free slot walking forward from 08:15;
// "free" = start-time not covered by any non-cancelled session's span
// (duration-aware via getOccupiedSlots); the NEW session's own duration is
// deliberately NOT checked (Elie's choice — any free start time qualifies).
// Run: node scripts/sanity/sanity-suggest-time.mjs
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { suggestBookingTime, TIMES } = await import(utilsUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

const D = '2026-07-20';
const clients = [{ id: 'c1', name: 'Test Client' }];
const mk = (time, duration = 45, status = 'scheduled', date = D) =>
  ({ id: `s-${date}-${time}`, clientId: 'c1', date, time, duration, status });

// Empty day → 08:15
assert(suggestBookingTime([], clients, D) === '08:15', 'empty day → 08:15');

// 08:15–09:00 booked → 09:00 (session END slot is free; duration-aware skip)
assert(suggestBookingTime([mk('08:15')], clients, D) === '09:00',
  '08:15 x45min booked → 09:00');

// Gap is chosen over "after last": 08:15–09:00 and 10:00–10:45 → 09:00
assert(suggestBookingTime([mk('08:15'), mk('10:00')], clients, D) === '09:00',
  'gap day → 09:00 (first gap, not 10:45)');

// Short gap still qualifies (no duration-fit check): 08:15–09:00 and 09:30 → 09:00
assert(suggestBookingTime([mk('08:15'), mk('09:30')], clients, D) === '09:00',
  '30min gap → 09:00 even though default duration is 45');

// Cancelled sessions don't block: cancelled 08:15 → 08:15
assert(suggestBookingTime([mk('08:15', 45, 'cancelled')], clients, D) === '08:15',
  'cancelled at 08:15 does not block');

// Other days don't block: session on another date → 08:15
assert(suggestBookingTime([mk('08:15', 45, 'scheduled', '2026-07-21')], clients, D) === '08:15',
  'other-date session does not block');

// Contiguous 08:15 → past 22:45 → falls back to early morning (05:00)
const startIdx = TIMES.indexOf('08:15');
const fullPM = TIMES.slice(startIdx).map(tm => mk(tm, 15));
assert(suggestBookingTime(fullPM, clients, D) === '05:00',
  'afternoon full → early-morning fallback 05:00');

// Entire day full → 08:15 (grid shows fully occupied; PT picks manually)
const fullDay = TIMES.map(tm => mk(tm, 15));
assert(suggestBookingTime(fullDay, clients, D) === '08:15',
  'whole day full → 08:15 fallback');

console.log('\nAll suggestBookingTime checks passed.');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/sanity/sanity-suggest-time.mjs`
Expected: FAIL — `suggestBookingTime is not a function` (not exported yet).

- [ ] **Step 3: Implement the helper in `src/utils.js`**

Insert directly after the closing `};` of `getOccupiedSlots` (~line 189):

```js
// ─── Booking time suggestion (v2.14.1) ───
// Elie's request 2026-07-17: the booking form should propose 08:15 (his real
// first slot of the day) and, on a day that already has sessions, jump to the
// first FREE slot — so booking a second session never lands on a taken time.
// Spec: docs/superpowers/specs/2026-07-17-booking-time-suggestion-design.md
//   - Walks TIMES forward from 08:15; a slot is taken if any non-cancelled
//     session's span covers it (getOccupiedSlots is duration-aware).
//   - Deliberately does NOT check that the NEW session's duration fits the
//     gap — Elie chose "any free start time"; he decides if an overlap is ok.
//   - If 08:15→22:45 is solid, tries the early-morning slots (05:00→08:00);
//     a completely full day returns '08:15' and the PT picks manually.
export const suggestBookingTime = (sessions, clients, date) => {
  const occupied = getOccupiedSlots(sessions, clients, date);
  const startIdx = TIMES.indexOf('08:15');
  for (let i = startIdx; i < TIMES.length; i++) {
    if (!occupied[TIMES[i]]) return TIMES[i];
  }
  for (let i = 0; i < startIdx; i++) {
    if (!occupied[TIMES[i]]) return TIMES[i];
  }
  return '08:15';
};
```

- [ ] **Step 4: Run the sanity script — all pass**

Run: `node scripts/sanity/sanity-suggest-time.mjs`
Expected: 8 ✓ lines + "All suggestBookingTime checks passed."

- [ ] **Step 5: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-suggest-time.mjs
git commit -m "feat(schedule): suggestBookingTime helper — 08:15 start, first-free-slot walk (Elie request, in-session approval)"
git push origin master
```

---

### Task 2: Wire the suggestion into Schedule.jsx

**Files:**
- Modify: `src/components/Schedule.jsx` (import line 5; state ~line 32; `openBooking` ~line 85; date input ~line 542; time-grid onClick ~line 570)
- Modify: `src/components/Dashboard.jsx:15` (comment only — dead default)

**Interfaces:**
- Consumes: `suggestBookingTime(sessions, clients, date)` from Task 1

- [ ] **Step 1: Import the helper**

In `src/components/Schedule.jsx` line 5, add `suggestBookingTime` to the existing `../utils` import list (alphabetical placement not required; append after `hasClientSlotConflict`).

- [ ] **Step 2: Add the `timeTouched` flag**

After the `cancelPrompt` state (~line 32):

```js
  // v2.14.1: true once the PT taps a time slot in THIS form instance — a manual
  // pick must survive date changes (spec: "re-suggest unless I picked a time").
  // Ephemeral by design: reset on every openBooking, never persisted.
  const [timeTouched, setTimeTouched] = useState(false);
```

- [ ] **Step 3: Suggest on form open**

Replace the `openBooking` body (~lines 85-90):

```js
  const openBooking = () => {
    setEditingSession(null);
    // v2.14.1: suggest the first free slot of the selected day (08:15 on an
    // empty day) instead of a hardcoded 09:00 — Elie books back-to-back and
    // was retapping the grid on every second booking of a day.
    setForm({ clientIds: [], type: 'Strength', date: selectedDate, time: suggestBookingTime(state.sessions, state.clients, selectedDate), duration: 45 });
    setTimeTouched(false);
    resetRepeat(); // toggling repeat on a prior booking must not leak into this one
    setShowForm(true);
  };
```

- [ ] **Step 4: Re-suggest on date change (unless touched / editing)**

Replace the date input's onChange (~line 542):

```jsx
                <input type="date" className="input" value={form.date} onChange={e => {
                  const date = e.target.value;
                  // v2.14.1: a new date gets that day's suggestion — but never
                  // overwrite a manually tapped time, and edit mode always keeps
                  // the session's own time (no suggestion interference).
                  setForm(p => (editingSession || timeTouched)
                    ? { ...p, date }
                    : { ...p, date, time: suggestBookingTime(state.sessions, state.clients, date) });
                }} />
```

- [ ] **Step 5: Mark manual picks**

In the time-grid slot button (~line 570), extend the onClick:

```jsx
                      <button key={tm} className={cls} onClick={() => { setTimeTouched(true); setForm(p => ({ ...p, time: tm })); }}>
```

- [ ] **Step 6: Dashboard dead-default comment**

In `src/components/Dashboard.jsx` line 15, append a trailing comment to the form state line:

```js
  const [form, setForm] = useState({ clientId: '', type: 'Strength', date: today(), time: '09:00', duration: 45 }); // defaults are dead: openEdit always overwrites before the (edit-only) modal shows — see 2026-07-17 spec correction
```

- [ ] **Step 7: Run all sanity scripts (regression)**

Run: `for f in scripts/sanity/sanity-reducer.mjs scripts/sanity/sanity-counting.mjs scripts/sanity/sanity-slidingwindow.mjs scripts/sanity/sanity-migration.mjs scripts/sanity/sanity-recurring.mjs scripts/sanity/sanity-historical-ordinals.mjs scripts/sanity/sanity-evaluations.mjs scripts/sanity/sanity-1rm.mjs scripts/sanity/sanity-programs.mjs scripts/sanity/sanity-suggest-time.mjs; do node "$f" || exit 1; done`
Expected: every script exits 0 (skip the two stale live-diff gates — no schema change).

- [ ] **Step 8: Commit**

```bash
git add src/components/Schedule.jsx src/components/Dashboard.jsx
git commit -m "feat(schedule): booking form suggests 08:15 / next free slot; manual pick survives date change (Elie request, in-session approval)"
git push origin master
```

---

### Task 3: Version bump, docs, build, deploy

**Files:**
- Modify: `src/App.jsx` (debug-panel version string v2.14.0 → v2.14.1)
- Modify: `docs/changelog-summary.md`, `docs/changelog-technical.md` (new v2.14.1 entries)
- Create: `docs/instructions-v2.14.1.md`

**Interfaces:** none — release mechanics.

- [ ] **Step 1: Bump version**

In `src/App.jsx`, find the debug-panel version string `v2.14.0` and change it to `v2.14.1`. (Point release → do NOT touch `DOCS.instructions` in General.jsx; that pointer moves on feature releases only, and v2.14.1 gets its own instructions file regardless.)

- [ ] **Step 2: Write docs**

`docs/instructions-v2.14.1.md` — short: what the suggestion does (8:15 start, first-free-gap, manual-pick precedence), the Dashboard edit-only correction, provenance note (designed + approved with Elie in-session 2026-07-17, Pierre to review post-hoc). Add matching one-paragraph entries to both changelogs, including the provenance note (changelog-discipline memory).

- [ ] **Step 3: Build and verify bundle**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```
Expected: build succeeds; `node --check` prints nothing (exit 0).

- [ ] **Step 4: Commit + push master**

```bash
git add src/App.jsx docs/instructions-v2.14.1.md docs/changelog-summary.md docs/changelog-technical.md
git commit -m "release: v2.14.1 booking time suggestion (8:15 / next free slot)"
git push origin master
```

- [ ] **Step 5: Deploy to gh-pages and verify Pages build**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy v2.14.1: booking time suggestion (8:15 / next free slot)"
git push origin gh-pages
git checkout master
gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status
```
Expected: final command reaches `built` (re-poll a few times if `building`; if stuck, `gh api -X POST repos/pih-dev/PTApp/pages/builds` then re-verify — Jun 11 trap).

- [ ] **Step 6: Tell Elie the version number** so he can hard-refresh and verify on his iPhone (empty future day → 8:15; day with sessions → first gap; manual tap then date change → tap survives).
