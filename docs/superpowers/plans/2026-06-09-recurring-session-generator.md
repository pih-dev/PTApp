# Recurring Session Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the PT generate a whole recurring protocol for one client (weekdays + one time + a session count) in a single pass, with a confirm/deselect preview, instead of booking each session by hand.

**Architecture:** Pure helpers in `utils.js` compute the dates and detect per-client slot conflicts; a new `ADD_SESSIONS` batch reducer action commits them in one dispatch; `Schedule.jsx` gains a "Repeat" mode on the existing booking form plus a preview list. Calendar-only — no package/contract change, no schema change, no migration.

**Tech Stack:** React 18 (hooks), Vite single-file build, plain CSS, node-based sanity scripts (no test framework — assert + `process.exit`). Spec: `docs/superpowers/specs/2026-06-09-recurring-session-generator-design.md`.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/utils.js` | `generateRecurringDates()`, `hasClientSlotConflict()`, `ADD_SESSIONS` reducer case | Modify |
| `scripts/sanity/sanity-recurring.mjs` | Sanity coverage for the two helpers + the reducer | Create |
| `src/i18n.js` | New EN/AR strings | Modify |
| `src/components/Schedule.jsx` | Repeat toggle, weekday chips, count input, preview list, batched create | Modify |
| `src/styles.css` | Weekday chips + preview list styling | Modify |
| `src/App.jsx` | Version label bump in debug panel | Modify |

**Conventions to follow (already in this codebase):**
- Reducer is exported as `baseReducer`; sanity scripts import it via `await import(new URL('../../src/utils.js', import.meta.url).href)`.
- `_modified: now()` is stamped on every session write (`now()` already exists in `utils.js`).
- Local-date helper `localDateStr(dateObj)` returns `'YYYY-MM-DD'` in **local** time. **Never** use `toISOString()` for dates (UTC drift trap — see `docs/traps.md`).
- Weekday short labels are derived from `toLocaleDateString(dateLocale(lang), { weekday: 'short' })` (same as the week strip at `Schedule.jsx:142`) — so we do **not** add i18n keys for day names.

---

## Task 1: `generateRecurringDates` helper

**Files:**
- Modify: `src/utils.js` (add export near the other date helpers, e.g. after `getOccupiedSlots`)
- Test: `scripts/sanity/sanity-recurring.mjs` (create)

- [ ] **Step 1: Write the failing test**

Create `scripts/sanity/sanity-recurring.mjs`:

```js
// Sanity: recurring-session generator helpers + ADD_SESSIONS reducer.
// Run: node scripts/sanity/sanity-recurring.mjs
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { generateRecurringDates, hasClientSlotConflict, baseReducer } = await import(utilsUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
// 2026-06-08 is a Monday. Use it as a stable anchor.

// === generateRecurringDates ===
// Mon/Wed/Fri starting Mon 2026-06-08, count 10 → 10 dates spanning ~3.3 weeks.
const mwf = generateRecurringDates('2026-06-08', [1, 3, 5], 10);
assert(mwf.length === 10, 'MWF x10 → exactly 10 dates');
assert(mwf[0] === '2026-06-08', 'first date is the start date (a selected weekday)');
assert(mwf[1] === '2026-06-10', 'second date is Wed of week 1');
assert(mwf[2] === '2026-06-12', 'third date is Fri of week 1');
assert(mwf[3] === '2026-06-15', 'fourth date is Mon of week 2');
assert(mwf[9] === '2026-06-29', 'tenth date is Mon of week 4');

// Start date NOT on a selected weekday → first result is the next matching day.
// 2026-06-09 is a Tuesday; ask for Mon only.
const monOnly = generateRecurringDates('2026-06-09', [1], 3);
assert(monOnly[0] === '2026-06-15', 'Tue start, Mon-only → first is next Monday');
assert(monOnly.length === 3 && monOnly[2] === '2026-06-29', 'Mon-only x3 spans 3 weeks');

// All 7 days selected → consecutive calendar days.
const everyDay = generateRecurringDates('2026-06-08', [0, 1, 2, 3, 4, 5, 6], 4);
assert(everyDay.join(',') === '2026-06-08,2026-06-09,2026-06-10,2026-06-11', 'all-days → consecutive');

// Empty weekday set → empty result (safety-capped, no infinite loop).
assert(generateRecurringDates('2026-06-08', [], 10).length === 0, 'no weekdays → empty');
// count <= 0 → empty.
assert(generateRecurringDates('2026-06-08', [1], 0).length === 0, 'count 0 → empty');

console.log('generateRecurringDates: all passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/sanity/sanity-recurring.mjs`
Expected: FAIL — `generateRecurringDates is not a function` (TypeError) because it isn't exported yet.

- [ ] **Step 3: Write minimal implementation**

In `src/utils.js`, add after the `getOccupiedSlots` block (~line 175):

```js
// ─── Recurring session generation (v2.10) ───
// Walk forward day-by-day from startDate (inclusive); collect each date whose
// weekday is in `weekdays` (0=Sun..6=Sat, JS Date.getDay()) until `count` dates
// are gathered. Pure + local-time only (never toISOString — UTC drift trap).
// Safety cap of 730 iterations: an empty weekday set or an unreachable count can
// never loop forever — it just returns whatever it gathered.
export const generateRecurringDates = (startDate, weekdays, count) => {
  const days = new Set(weekdays);
  const out = [];
  if (days.size === 0 || count <= 0) return out;
  const d = new Date(startDate + 'T00:00:00'); // local midnight, not UTC
  let guard = 0;
  while (out.length < count && guard < 730) {
    if (days.has(d.getDay())) out.push(localDateStr(d));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/sanity/sanity-recurring.mjs`
Expected: PASS through the `generateRecurringDates: all passed` line.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-recurring.mjs
git commit -m "feat(recurring): generateRecurringDates helper + sanity"
```

---

## Task 2: `hasClientSlotConflict` helper

**Files:**
- Modify: `src/utils.js` (add export right after `generateRecurringDates`)
- Test: `scripts/sanity/sanity-recurring.mjs` (extend)

- [ ] **Step 1: Write the failing test**

Append to `scripts/sanity/sanity-recurring.mjs` before the final `console.log` (or add a new section after it):

```js
// === hasClientSlotConflict ===
const sessions = [
  { id: 's1', clientId: 'c1', date: '2026-06-08', time: '08:15', status: 'scheduled' },
  { id: 's2', clientId: 'c2', date: '2026-06-08', time: '08:15', status: 'scheduled' },
  { id: 's3', clientId: 'c1', date: '2026-06-10', time: '08:15', status: 'cancelled' },
];
assert(hasClientSlotConflict(sessions, 'c1', '2026-06-08', '08:15') === true,
  'same client + same date+time → conflict');
assert(hasClientSlotConflict(sessions, 'c1', '2026-06-08', '09:00') === false,
  'same client, different time → no conflict');
assert(hasClientSlotConflict(sessions, 'c3', '2026-06-08', '08:15') === false,
  'different client, same slot → no conflict (group training is allowed)');
assert(hasClientSlotConflict(sessions, 'c1', '2026-06-10', '08:15') === false,
  'cancelled session at slot → no conflict');
console.log('hasClientSlotConflict: all passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/sanity/sanity-recurring.mjs`
Expected: FAIL — `hasClientSlotConflict is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/utils.js`, immediately after `generateRecurringDates`:

```js
// True if `clientId` already has a non-cancelled session at this exact date+time.
// Two different clients sharing a slot is intentional (group training) and is NOT
// a conflict — only a same-client duplicate at the same slot counts.
export const hasClientSlotConflict = (sessions, clientId, date, time) =>
  sessions.some(s => s.clientId === clientId && s.date === date && s.time === time && s.status !== 'cancelled');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/sanity/sanity-recurring.mjs`
Expected: PASS through `hasClientSlotConflict: all passed`.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-recurring.mjs
git commit -m "feat(recurring): hasClientSlotConflict helper + sanity"
```

---

## Task 3: `ADD_SESSIONS` batch reducer action

**Files:**
- Modify: `src/utils.js` (add a `case` next to `ADD_SESSION`, ~line 795)
- Test: `scripts/sanity/sanity-recurring.mjs` (extend)

- [ ] **Step 1: Write the failing test**

Append to `scripts/sanity/sanity-recurring.mjs`:

```js
// === ADD_SESSIONS reducer ===
const startState = {
  _dataVersion: 4,
  clients: [], sessions: [{ id: 'old', clientId: 'c1', date: '2026-06-01', time: '09:00', status: 'completed' }],
  todos: [], messageTemplates: {}, auditLog: [], _lastModified: '2026-06-01T00:00:00Z',
};
const payload = [
  { id: 'n1', clientId: 'c1', type: 'Strength', date: '2026-06-08', time: '08:15', duration: 45, status: 'scheduled', createdAt: '2026-06-08' },
  { id: 'n2', clientId: 'c1', type: 'Strength', date: '2026-06-10', time: '08:15', duration: 45, status: 'scheduled', createdAt: '2026-06-08' },
];
const after = baseReducer(startState, { type: 'ADD_SESSIONS', payload });
assert(after.sessions.length === 3, 'ADD_SESSIONS appends all new sessions in one dispatch');
assert(after.sessions[0].id === 'old', 'existing sessions preserved and kept first');
assert(after.sessions[1].id === 'n1' && after.sessions[2].id === 'n2', 'new sessions appended in order');
assert(typeof after.sessions[1]._modified === 'string' && after.sessions[1]._modified.length > 0,
  'each new session stamped with _modified');
console.log('ADD_SESSIONS: all passed');
console.log('\nALL RECURRING SANITY CHECKS PASSED');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/sanity/sanity-recurring.mjs`
Expected: FAIL — `after.sessions.length === 3` is false (the unknown action returns state unchanged, length stays 1).

- [ ] **Step 3: Write minimal implementation**

In `src/utils.js`, directly after the `case 'ADD_SESSION':` return (line ~796), add:

```js
    case 'ADD_SESSIONS':
      // Batch-append N new sessions in a single dispatch (recurring generator).
      // One reducer pass → one re-render → one debounced sync push, instead of
      // N dispatches in a loop. See the "single dispatches in loops" trap.
      return { ...state, sessions: [...state.sessions, ...action.payload.map(s => ({ ...s, _modified: now() }))] };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/sanity/sanity-recurring.mjs`
Expected: PASS — ends with `ALL RECURRING SANITY CHECKS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-recurring.mjs
git commit -m "feat(recurring): ADD_SESSIONS batch reducer action + sanity"
```

---

## Task 4: i18n strings (EN + AR)

**Files:**
- Modify: `src/i18n.js`

**Note:** Open `src/i18n.js` first and confirm the object shape (it has an `en` block and an `ar` block keyed by string id). Add each key to **both** blocks. Do not add weekday-name keys — those come from `toLocaleDateString`.

- [ ] **Step 1: Add the new keys**

Add to the `en` block:

```js
  repeatSessions: 'Repeat',
  recurringWeekdays: 'Repeat on',
  recurringCount: 'Number of sessions',
  recurringPreview: 'Preview',
  recurringAlreadyBooked: 'Already booked',
  recurringCreate: 'Create',          // used as `${t('recurringCreate')} ${n} ${t('sessionsLower')}`
  sessionsLower: 'sessions',
  recurringBack: 'Back',
```

Add the matching Arabic to the `ar` block:

```js
  repeatSessions: 'تكرار',
  recurringWeekdays: 'يتكرر في',
  recurringCount: 'عدد الجلسات',
  recurringPreview: 'معاينة',
  recurringAlreadyBooked: 'محجوز مسبقاً',
  recurringCreate: 'إنشاء',
  sessionsLower: 'جلسات',
  recurringBack: 'رجوع',
```

- [ ] **Step 2: Verify the file still parses**

Run: `node -e "import('./src/i18n.js').then(()=>console.log('i18n OK'))"`
Expected: `i18n OK` (no syntax error). If it prints nothing/errors, fix the trailing-comma or quoting.

- [ ] **Step 3: Commit**

```bash
git add src/i18n.js
git commit -m "feat(recurring): EN/AR strings for recurring booking"
```

---

## Task 5: Schedule.jsx — Repeat toggle + recurring form fields

**Files:**
- Modify: `src/components/Schedule.jsx`

This task adds the UI inputs only (toggle, weekday chips, count). The preview/create logic is Task 6. After this task the form renders the new controls but the primary button still books normally when Repeat is OFF.

- [ ] **Step 1: Add recurring state next to the existing form state**

After the `form` state declaration (`Schedule.jsx:14`), add:

```jsx
  // v2.10 recurring booking. Active only when `repeat` is true and not editing.
  //   repeat   — Repeat mode toggle
  //   weekdays — Set of JS getDay() numbers (0=Sun..6=Sat) the protocol repeats on
  //   count    — how many sessions to generate (the stop criterion)
  //   preview  — null = form view; array of { date, time, conflict, keep } = preview view
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState(new Set());
  const [count, setCount] = useState(10);
  const [preview, setPreview] = useState(null);
```

- [ ] **Step 2: Reset recurring state whenever the booking form opens**

In `openBooking` (`Schedule.jsx:49-53`), after `setForm({...})`, add:

```jsx
    setRepeat(false);
    setWeekdays(new Set());
    setCount(10);
    setPreview(null);
```

Also add the same four resets inside `openEdit` (so editing never shows recurring controls), plus the modal `onClose` handler — set `setPreview(null)` there too. (Edit mode also keys off `editingSession`, which already gates everything below.)

- [ ] **Step 3: Build a localized Mon-first weekday list (module-scope, above the component)**

Near the top of the file, after the imports, add:

```jsx
// Mon-first display order, mapped to JS getDay() numbers (0=Sun..6=Sat).
// 2024-01-01 is a Monday, so offset i from it gives the right weekday for labels.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabel = (jsDay, lang) => {
  // jsDay 1..6,0 → days since Mon 2024-01-01
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  return new Date(2024, 0, 1 + offset).toLocaleDateString(dateLocale(lang), { weekday: 'short' });
};
```

- [ ] **Step 4: Add the Repeat toggle + weekday chips + count input to the booking form**

Inside the booking `<Modal>` (opens at `Schedule.jsx:274`), and **only when not editing**, render the Repeat toggle just above the client selector, then the recurring fields when `repeat` is on. Wrap the existing client-selector block so it stays single-client in repeat mode (in repeat mode, the multi-client chip list is hidden — show a plain single `<select>` bound to `form.clientIds[0]`).

Add right after the modal's opening content, before the renewal-due banner (`Schedule.jsx:281`):

```jsx
          {!editingSession && (
            <label className="repeat-toggle">
              <input type="checkbox" checked={repeat} onChange={e => {
                const on = e.target.checked;
                setRepeat(on);
                setPreview(null);
                // Repeat is single-client: collapse any multi-selection to the first.
                if (on) setForm(p => ({ ...p, clientIds: p.clientIds.slice(0, 1) }));
              }} />
              <span>{t(lang, 'repeatSessions')}</span>
            </label>
          )}
```

Then, where the client multi-select chip block renders (`Schedule.jsx:289-345`), gate it: render the existing chip UI only when `!repeat`. When `repeat` is true, render a single select instead:

```jsx
          {repeat && !editingSession && (
            <select className="select" value={form.clientIds[0] || ''} onChange={e =>
              setForm(p => ({ ...p, clientIds: e.target.value ? [e.target.value] : [] }))}>
              <option value="">{t(lang, 'selectClient')}</option>
              {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
```

(Confirm the existing "select a client" key name while editing — reuse whatever the current placeholder option uses; `selectClient` is a placeholder here, adjust to the real key.)

Then add the weekday chips + count input, shown only in repeat mode. Place them after the time picker block (after `Schedule.jsx:~400`, wherever the time selector ends):

```jsx
          {repeat && !editingSession && (
            <>
              <div className="field-label">{t(lang, 'recurringWeekdays')}</div>
              <div className="weekday-row">
                {WEEKDAY_ORDER.map(jsDay => (
                  <button
                    key={jsDay}
                    type="button"
                    className={`weekday-chip${weekdays.has(jsDay) ? ' selected' : ''}`}
                    onClick={() => setWeekdays(prev => {
                      const next = new Set(prev);
                      next.has(jsDay) ? next.delete(jsDay) : next.add(jsDay);
                      return next;
                    })}>
                    {weekdayLabel(jsDay, lang)}
                  </button>
                ))}
              </div>
              <div className="field-label">{t(lang, 'recurringCount')}</div>
              <input
                className="input"
                type="number"
                min="1"
                max="60"
                value={count}
                onChange={e => setCount(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))} />
            </>
          )}
```

- [ ] **Step 5: Manual verification (dev server)**

Run: `npm run dev`, open the app, go to Schedule → tap Book.
Expected:
- "Repeat" checkbox shows at the top of the form.
- Toggling it ON hides the multi-client chip list, shows a single client dropdown, and reveals 7 weekday chips (Mon-first, localized) + a number input defaulting to 10.
- Weekday chips toggle selected/unselected on tap.
- Count clamps to 1–60.
- Toggling Repeat OFF restores the normal booking form. Switch language to Arabic → weekday labels and field labels are Arabic, layout is RTL-correct.

- [ ] **Step 6: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "feat(recurring): Repeat toggle, weekday chips, count input in booking form"
```

---

## Task 6: Schedule.jsx — Preview step + batched create

**Files:**
- Modify: `src/components/Schedule.jsx`

- [ ] **Step 1: Import the new helpers**

In the `utils` import at `Schedule.jsx:5`, add `generateRecurringDates` and `hasClientSlotConflict` to the destructured list.

- [ ] **Step 2: Add a `buildPreview` handler**

Add inside the component (near `saveSession`):

```jsx
  // Compute the recurring preview rows from the current form + weekday/count state.
  // Each row: { date, time, conflict, keep }. Conflict rows start unchecked.
  const buildPreview = () => {
    const clientId = form.clientIds[0];
    if (!clientId || weekdays.size === 0 || count < 1) return;
    const dates = generateRecurringDates(form.date, [...weekdays], count);
    const rows = dates.map(date => {
      const conflict = hasClientSlotConflict(state.sessions, clientId, date, form.time);
      return { date, time: form.time, conflict, keep: !conflict };
    });
    setPreview(rows);
  };
```

- [ ] **Step 3: Add the `createRecurring` handler (batched dispatch)**

```jsx
  // Commit the ticked preview rows as one ADD_SESSIONS dispatch. Calendar-only:
  // no RENEW_PACKAGE, contracts untouched by design (see spec D1).
  const createRecurring = () => {
    const clientId = form.clientIds[0];
    const kept = (preview || []).filter(r => r.keep);
    if (!clientId || kept.length === 0) return;
    const created = localDateStr(new Date());
    const payload = kept.map(r => ({
      id: genId(), clientId, type: form.type, date: r.date, time: r.time,
      duration: form.duration, status: 'scheduled', createdAt: created,
    }));
    dispatch({ type: 'ADD_SESSIONS', payload });
    haptic();
    setShowForm(false);
    setPreview(null);
    setRepeat(false);
    setSelectedDate(kept[0].date); // jump the week strip to the first generated session
  };
```

- [ ] **Step 4: Render the preview view + wire the primary button**

Inside the booking `<Modal>`, render the preview list when `preview` is non-null **instead of** the form fields. Wrap the existing form body in `{!preview && ( ... )}` and add the preview block:

```jsx
          {preview && (
            <div className="recurring-preview">
              {preview.map((r, i) => {
                const dt = new Date(r.date + 'T00:00:00');
                const label = dt.toLocaleDateString(dateLocale(lang), { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <label key={r.date} className={`preview-row${r.conflict ? ' conflict' : ''}`}>
                    <input type="checkbox" checked={r.keep} onChange={() =>
                      setPreview(prev => prev.map((row, j) => j === i ? { ...row, keep: !row.keep } : row))} />
                    <span className="preview-date">{label} · {r.time}</span>
                    {r.conflict && <span className="preview-flag">{t(lang, 'recurringAlreadyBooked')}</span>}
                  </label>
                );
              })}
            </div>
          )}
```

Now make the modal's `action` button context-aware. Replace the existing single-button `action` prop (`Schedule.jsx:276`) so that:
- **Editing** → unchanged ("Save changes").
- **Repeat ON, no preview yet** → button label = `t(lang,'recurringPreview')`, disabled unless `form.clientIds[0] && weekdays.size > 0 && count >= 1`, onClick = `buildPreview`.
- **Repeat ON, preview shown** → render TWO buttons: a `recurringBack` ghost button (`onClick={() => setPreview(null)}`) and a primary `${t('recurringCreate')} ${preview.filter(r=>r.keep).length} ${t('sessionsLower')}` button, disabled when zero kept, onClick = `createRecurring`.
- **Repeat OFF** → unchanged single/multi booking button calling `saveSession`.

Concretely, build the action node before the `return`:

```jsx
  const bookingAction = editingSession ? (
    <button className="btn-primary" onClick={saveSession}>{t(lang, 'saveChanges')}</button>
  ) : repeat ? (
    preview ? (
      <div className="flex-row">
        <button className="btn-ghost" onClick={() => setPreview(null)}>{t(lang, 'recurringBack')}</button>
        <button className="btn-primary" disabled={preview.filter(r => r.keep).length === 0} onClick={createRecurring}>
          {t(lang, 'recurringCreate')} {preview.filter(r => r.keep).length} {t(lang, 'sessionsLower')}
        </button>
      </div>
    ) : (
      <button className="btn-primary"
        disabled={!form.clientIds[0] || weekdays.size === 0 || count < 1}
        onClick={buildPreview}>{t(lang, 'recurringPreview')}</button>
    )
  ) : (
    <button className="btn-primary" onClick={saveSession}>
      {`📅 ${t(lang, 'bookSessionBtn')}${form.clientIds.length > 1 ? ` (${form.clientIds.length} ${t(lang, 'client')})` : ''}`}
    </button>
  );
```

Then pass `action={bookingAction}` to the booking `<Modal>`.

- [ ] **Step 5: Manual verification (dev server)**

Run: `npm run dev`. Schedule → Book → toggle Repeat → pick a client, pick Mon/Wed/Fri, set count 10 → tap Preview.
Expected:
- Preview lists 10 dates (`Mon · Jun 8 · 08:15` …), each ticked.
- If the client already has a session at one of those exact slots, that row shows "Already booked" and starts unticked.
- Unticking rows updates the "Create N sessions" count.
- "Back" returns to the form with inputs intact.
- "Create N sessions" closes the modal, the week strip jumps to the first generated date, and all kept sessions appear on their days (verify a couple by navigating the week strip).
- Re-open the same pattern → now every row is flagged "Already booked" (conflict detection works against the freshly created sessions).
- Confirm in the debug panel / sync dot that only **one** sync push fired (batched dispatch).

- [ ] **Step 6: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "feat(recurring): preview/deselect step + batched create"
```

---

## Task 7: styles.css — weekday chips + preview list

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add styles**

Append to `src/styles.css` (use theme CSS vars — `--t1..--t5`, `--sep`, accent `#2563EB` — never hardcoded rgba; use logical properties for RTL):

```css
/* ─── Recurring booking (v2.10) ─── */
.repeat-toggle { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; }
.repeat-toggle input { width: 18px; height: 18px; }

.weekday-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 12px; }
.weekday-chip {
  flex: 1 1 auto; min-width: 40px; padding: 8px 4px; border-radius: 8px;
  border: 1px solid var(--sep); background: transparent; color: var(--t2);
  font-size: 13px; cursor: pointer;
}
.weekday-chip.selected { background: #2563EB; border-color: #2563EB; color: #fff; }

.recurring-preview { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow-y: auto; }
.preview-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid var(--sep); border-radius: 8px; font-size: 14px;
}
.preview-row input { width: 18px; height: 18px; flex-shrink: 0; }
.preview-date { flex: 1; }
.preview-row.conflict { border-color: #F59E0B; }
.preview-flag { font-size: 12px; color: #F59E0B; }
```

- [ ] **Step 2: Manual verification**

Reload the dev app, repeat the Task 6 flow, switch dark/light themes and EN/AR.
Expected: chips and preview rows are legible and aligned in both themes; selected weekday chip is solid blue; conflict rows have an amber border + amber "Already booked"; RTL mirrors correctly (no clipped text, checkbox on the start side).

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "style(recurring): weekday chips + preview list styling"
```

---

## Task 8: Version bump, build, verify, deploy

**Files:**
- Modify: `src/App.jsx` (version label in debug panel)

- [ ] **Step 1: Bump the version label**

Find the current version string in `src/App.jsx` (grep `v2.9.6`). Change it to `v2.10.0`.

```bash
grep -n "2\.9\.6" src/App.jsx
```

Edit that label to `v2.10.0`.

- [ ] **Step 2: Re-run all sanity scripts**

```bash
node scripts/sanity/sanity-recurring.mjs
node scripts/sanity/sanity-reducer.mjs
node scripts/sanity/sanity-counting.mjs
```
Expected: each prints its pass lines and exits 0. (The recurring suite ends with `ALL RECURRING SANITY CHECKS PASSED`.)

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: build completes, `dist/index.html` written.

- [ ] **Step 4: Verify the bundle isn't corrupted**

```bash
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```
Expected: no output = valid (a syntax error would print here).

- [ ] **Step 5: Commit source + push master**

```bash
git add src/App.jsx
git commit -m "v2.10.0: recurring session generator (calendar-only)"
git push origin master
```

- [ ] **Step 6: Deploy to gh-pages** (this is what makes it live — see CLAUDE.md pipeline)

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json
git commit -m "Deploy v2.10.0: recurring session generator"
git push origin gh-pages
git checkout master
```

- [ ] **Step 7: Tell Pierre** the version (v2.10.0) so he can verify on his phone, and note the PT smoke-test path: Schedule → Book → Repeat → client + Mon/Wed/Fri + count → Preview → Create.

---

## Post-Implementation Docs (after deploy)

These are required by CLAUDE.md's review discipline — do them before declaring the feature done:

- [ ] Write `docs/instructions-v2.10.0.md` (feature notes, the 6 locked decisions, the new helpers/action).
- [ ] Update `docs/changelog-summary.md` and `docs/changelog-technical.md`.
- [ ] Update the "Current Version" section + reducer-actions table (`ADD_SESSIONS`) in `CLAUDE.md`.
- [ ] Save a `project_v2_10_0_shipped.md` memory + update the TODO memory (recurring done; next = feature #2 evaluation).
- [ ] No new trap unless something bit during implementation.

---

## Self-Review (completed by plan author)

**Spec coverage:** D1 calendar-only → Task 3/6 (no RENEW_PACKAGE in `createRecurring`). D2 one time → single `form.time` used for all rows (Task 6). D3 preview+deselect → Task 6. D4 no WhatsApp → `createRecurring` sends none. D5 per-client → single select in repeat mode (Task 5). D6 no series object → plain session records (Task 6). All six decisions covered. Generation helper, conflict helper, batch reducer, i18n, styles, testing, deploy — all present.

**Placeholder scan:** No TBD/TODO. One explicit "confirm the real key name" note for the client-select placeholder (`selectClient`) and the version-string grep — both are lookups the implementer resolves in-file, not deferred logic.

**Type consistency:** `generateRecurringDates(startDate, weekdays, count)`, `hasClientSlotConflict(sessions, clientId, date, time)`, and `ADD_SESSIONS` payload shape are identical across the helper definitions (Tasks 1–3) and their call sites in `buildPreview`/`createRecurring` (Task 6). Preview row shape `{ date, time, conflict, keep }` is consistent between `buildPreview`, the render, and `createRecurring`. Weekday numbers are JS `getDay()` (0=Sun) everywhere.
