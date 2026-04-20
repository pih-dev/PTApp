# Manual Session Count Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the PT set a per-client session-count override (absolute `10` or delta `+1`/`-1`) that applies everywhere the period count surfaces in the app and in every WhatsApp template placeholder, and clears automatically when the billing period rolls over.

**Architecture:** Two new optional fields on each client (`sessionCountOverride`, `overridePeriodStart`) stamped with the period at save time. Two new utility helpers (`parseSessionCountOverride`, `getEffectiveSessionCount`, `getEffectiveClientCount`) encapsulate the logic. Every session-card render site switches from `#{monthCount}` to a `12 → 13` pair component. The client edit form and the booking confirm popup gain a compact input; long-press on the input shows a shared help popup. The outgoing WhatsApp message body still contains a single number (the effective value).

**Tech Stack:** React 18 hooks, Vite, pure CSS. No test framework — verification is manual (dev server + build bundle check), matching project convention documented in `CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-04-20-manual-session-count-override-design.md`

---

## File Structure

**Modified files:**
- `src/utils.js` — add parser, add two effective-count helpers, update `fillTemplate` to use effective value
- `src/i18n.js` — new keys in `en` and `ar` (`countAuto`, `overrideHelpTitle`, `overrideHelpBody`, `overrideClear`, `overridePlaceholder`)
- `src/styles.css` — new classes for count pair + override input + help popup; bump `.session-count` visibility
- `src/components/Dashboard.jsx` — replace `#{monthCount}` inline render with pair render (2 sites: expanded + compact)
- `src/components/Schedule.jsx` — replace `#{monthCount}` inline render on session cards (1 site) and client-chip count (1 site); add override UI + pencil toggle in booking confirm popup
- `src/components/Sessions.jsx` — replace `#{monthCount}` inline render (1 site)
- `src/components/Clients.jsx` — add override row + live preview in the client edit form; pipe `OverrideHelpPopup`
- `src/App.jsx` — version string bump v2.7 → v2.8 in debug panel
- `src/components/General.jsx:9` — update instructions URL to `instructions-v2.8.md`
- `CLAUDE.md` — "Current Version: v2.8" section + demote v2.7 to previous
- `docs/instructions-v2.8.md` — new version doc (create)
- `docs/changelog-summary.md` — append v2.8 section
- `docs/changelog-technical.md` — append v2.8 section

**New files:**
- `src/components/SessionCountPair.jsx` — shared component that renders `12` (solo) or `12 → 13` (with override), with theme-aware accent styling
- `src/components/OverrideHelpPopup.jsx` — shared help modal (triggered by long-press or right-click)
- `docs/instructions-v2.8.md`

**No data migration.** Both new client fields are optional, `DATA_VERSION` stays at 2.

**No sync impact beyond normal `EDIT_CLIENT` flow.** Fields ride the existing v2.6 per-record merge.

---

### Task 1: Add parser + effective-count helpers to `src/utils.js`

**Files:**
- Modify: `src/utils.js` (add after `getSessionOrdinal` at line ~256; modify `fillTemplate` at line 471)

**Rationale:** These are the pure-logic foundations of the feature. Everything else depends on them. Keep them in `utils.js` next to `getSessionOrdinal` and `getClientPeriod` so the period/count primitives live together.

- [ ] **Step 1: Add `parseSessionCountOverride`**

In `src/utils.js`, immediately after the `getSessionOrdinal` function (which ends around line 256), add:

```js
// Parse the PT's raw input from the override field.
// Returns null for empty/invalid/no-op inputs so the caller can clear the override.
//   ""           → null
//   "10"         → { type: 'absolute', value: 10 }
//   "0"          → { type: 'absolute', value: 0 }
//   "+1" / "-3"  → { type: 'delta', value: ±N }
//   "+0" / "-0"  → null  (no-op)
//   "1.5" / junk → null  (caller keeps previous valid value)
export const parseSessionCountOverride = (raw) => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  const delta = /^([+-])(\d+)$/.exec(s);
  if (delta) {
    const value = (delta[1] === '-' ? -1 : 1) * Number(delta[2]);
    if (value === 0) return null;
    return { type: 'delta', value };
  }

  const abs = /^(\d+)$/.exec(s);
  if (abs) return { type: 'absolute', value: Number(abs[1]) };

  return null;
};
```

- [ ] **Step 2: Add `getEffectiveSessionCount`**

Immediately after `parseSessionCountOverride`, add:

```js
// Compute auto + effective count for a specific session, applying an active override.
// "Active" means the stored overridePeriodStart matches the current period's start.
// Returns { auto, effective, override } — override is the raw override object (or null).
export const getEffectiveSessionCount = (client, session, sessions) => {
  const period = getClientPeriod(client, session.date);
  const auto = getSessionOrdinal(sessions, session.id, session.clientId, period.start, period.end);

  const override = client && client.sessionCountOverride;
  const overridePeriod = client && client.overridePeriodStart;
  if (!override || overridePeriod !== period.start) {
    return { auto, effective: auto, override: null };
  }

  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};
```

- [ ] **Step 3: Add `getEffectiveClientCount`**

Immediately after `getEffectiveSessionCount`, add:

```js
// Compute auto + effective count for a client (no specific session) as of today.
// Used by UI that shows client-scoped period counts, e.g. booking-flow client chips.
export const getEffectiveClientCount = (client, sessions) => {
  const period = getClientPeriod(client, today());
  const auto = getPeriodSessionCount(sessions, client.id, period.start, period.end);
  const override = client && client.sessionCountOverride;
  const overridePeriod = client && client.overridePeriodStart;
  if (!override || overridePeriod !== period.start) {
    return { auto, effective: auto, override: null };
  }
  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};
```

- [ ] **Step 4: Update `fillTemplate` to use the effective count**

In `src/utils.js`, the current `fillTemplate` (line ~471) uses `getSessionOrdinal` directly. Replace the body:

```js
const fillTemplate = (template, client, session, sessions) => {
  const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
  const period = getClientPeriod(client, session.date);
  const number = sessions ? getSessionOrdinal(sessions, session.id, session.clientId, period.start, period.end) : '';
  return template
    .replace(/\{name\}/g, friendly(client))
    .replace(/\{type\}/g, session.type)
    .replace(/\{emoji\}/g, st.emoji)
    .replace(/\{date\}/g, formatDateLong(session.date))
    .replace(/\{time\}/g, session.time)
    .replace(/\{duration\}/g, String(session.duration || 45))
    .replace(/\{number\}/g, String(number))
    .replace(/\{periodEnd\}/g, formatDateLong(period.end));
};
```

becomes:

```js
const fillTemplate = (template, client, session, sessions) => {
  const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
  const period = getClientPeriod(client, session.date);
  // Use effective count (honours per-client override). Fall back to '' if sessions not supplied
  // (matches previous behaviour for callers that only want a partial preview).
  const number = sessions
    ? getEffectiveSessionCount(client, session, sessions).effective
    : '';
  return template
    .replace(/\{name\}/g, friendly(client))
    .replace(/\{type\}/g, session.type)
    .replace(/\{emoji\}/g, st.emoji)
    .replace(/\{date\}/g, formatDateLong(session.date))
    .replace(/\{time\}/g, session.time)
    .replace(/\{duration\}/g, String(session.duration || 45))
    .replace(/\{number\}/g, String(number))
    .replace(/\{periodEnd\}/g, formatDateLong(period.end));
};
```

- [ ] **Step 5: Quick browser console sanity check**

Run dev server: `npm run dev` (in a separate terminal if not already running).

Open the app in a browser, then in the devtools console run:

```js
// Load helpers
const utils = await import('/src/utils.js');
utils.parseSessionCountOverride('')        // null
utils.parseSessionCountOverride('10')      // { type: 'absolute', value: 10 }
utils.parseSessionCountOverride('+1')      // { type: 'delta', value: 1 }
utils.parseSessionCountOverride('-3')      // { type: 'delta', value: -3 }
utils.parseSessionCountOverride('+0')      // null
utils.parseSessionCountOverride('1.5')     // null
utils.parseSessionCountOverride('abc')     // null
```

Expected: each line returns the value shown in the comment.

- [ ] **Step 6: Commit**

```bash
git add src/utils.js
git commit -m "feat(utils): add session-count override parser + effective helpers"
```

---

### Task 2: Add i18n keys

**Files:**
- Modify: `src/i18n.js` — add keys in both `en` block (near the billing-period keys around line 143) and `ar` block (around line 297)

**Rationale:** All user-facing strings must be i18n'd per project convention. Adding keys first makes the later UI tasks straightforward.

- [ ] **Step 1: Add English keys**

In `src/i18n.js`, find the English billing-period block (around line 143-146):

```js
    periodStart: 'Period Start',
    periodLength: 'Period Length',
    periodDefault: 'Default (calendar month)',
    periodOptional: 'optional — defaults to 1st of month',
```

After the `periodOptional` line, add:

```js
    countAuto: 'Auto',
    overridePlaceholder: '±',
    overrideHelpTitle: 'Manual count override',
    overrideHelpBody: 'Type a whole number (like 10) to set the count directly for this period.\nType +1 or -1 (or any +N / -N) to adjust the automatic count.\nLeave empty to use the automatic count.\nThe override clears when the next billing period starts.',
    overrideClear: 'Clear override',
```

- [ ] **Step 2: Add Arabic keys**

In `src/i18n.js`, find the Arabic billing-period block (around line 297-300):

```js
    periodStart: 'بداية الفترة',
    periodLength: 'مدة الفترة',
    periodDefault: 'افتراضي (شهر تقويمي)',
    periodOptional: 'اختياري — الافتراضي أول الشهر',
```

After the `periodOptional` line, add:

```js
    countAuto: 'تلقائي',
    overridePlaceholder: '±',
    overrideHelpTitle: 'تعديل يدوي للعدد',
    overrideHelpBody: 'اكتب رقمًا صحيحًا (مثل 10) لتحديد العدد مباشرة لهذه الفترة.\nاكتب +1 أو -1 (أو أي +N / -N) لتعديل العدد التلقائي.\nاتركه فارغًا لاستخدام العدد التلقائي.\nيتم مسح التعديل اليدوي تلقائيًا عند بدء فترة جديدة.',
    overrideClear: 'مسح التعديل',
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n.js
git commit -m "feat(i18n): add session-count override keys (en + ar)"
```

---

### Task 3: Add CSS for count pair + override input + help popup

**Files:**
- Modify: `src/styles.css` — add new classes; bump `.session-count` color to `--t2` equivalent

**Rationale:** Before touching components, have the styling ready so component JSX can reference stable class names.

- [ ] **Step 1: Bump visibility of the existing client-card `.session-count`**

Currently at `src/styles.css:435`:

```css
.session-count { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 6px; }
```

And at `src/styles.css:753`:

```css
.theme-light .session-count { color: rgba(30,27,75,0.5); }
```

Pierre's feedback: the current default count is too dim. Change both to `0.72` (roughly equivalent to `--t2`):

```css
.session-count { font-size: 12px; color: rgba(255,255,255,0.72); margin-top: 6px; }
```

and

```css
.theme-light .session-count { color: rgba(30,27,75,0.72); }
```

- [ ] **Step 2: Add count-pair classes**

After the existing `.session-count` rule (line ~435), add:

```css
/* ─── Session count pair (auto → effective) ─── */
/* Used inline next to the client name on session cards, and in the period summary
   of the client edit form. When no override is set, only .count-auto-solo renders.
   When an override is active, both numbers show with an arrow. */
.count-pair {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 12px;
  font-weight: 500;
}
.count-auto {
  color: rgba(255,255,255,0.72);
}
.count-arrow {
  color: #60A5FA;
  font-size: 11px;
  padding: 0 2px;
}
.count-effective {
  color: #60A5FA;
  font-weight: 700;
  font-size: 13px;
  background: rgba(96,165,250,0.14);
  padding: 0 5px;
  border-radius: 5px;
}
.count-auto-solo {
  color: rgba(255,255,255,0.72);
  font-size: 12px;
  font-weight: 500;
}
/* Light theme — indigo tint instead of white alpha */
.theme-light .count-auto,
.theme-light .count-auto-solo {
  color: rgba(30,27,75,0.78);
}
.theme-light .count-arrow {
  color: #2563EB;
}
.theme-light .count-effective {
  color: #1E40AF;
  background: rgba(37,99,235,0.14);
}
```

- [ ] **Step 3: Add override input + row styles**

After the count-pair block, add:

```css
/* ─── Override input (client edit form + booking popup) ─── */
.period-override-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.period-count-preview {
  font-size: 13px;
  color: var(--t3);
}
.period-count-preview strong {
  color: var(--t1);
  font-weight: 700;
}
.period-count-preview strong.accent {
  color: #60A5FA;
}
.theme-light .period-count-preview strong.accent {
  color: #1E40AF;
}
.override-input {
  width: 64px;
  padding: 8px 10px;
  border: 1px solid var(--sep);
  border-radius: 8px;
  background: transparent;
  color: var(--t1);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  -webkit-user-select: text;
  user-select: text;
}
.override-input:focus {
  outline: none;
  border-color: #60A5FA;
  box-shadow: 0 0 0 3px rgba(96,165,250,0.15);
}
.theme-light .override-input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
.override-edit-btn {
  background: transparent;
  border: none;
  padding: 6px 8px;
  color: var(--t3);
  cursor: pointer;
  font-size: 15px;
}
.override-edit-btn:active { transform: scale(0.95); }

/* Help popup body — preformatted multi-line text */
.override-help-body {
  font-size: 14px;
  color: var(--t2);
  line-height: 1.5;
  white-space: pre-wrap;
  margin-bottom: 16px;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): session-count pair + override input + help popup styles"
```

---

### Task 4: Create `SessionCountPair` shared component

**Files:**
- Create: `src/components/SessionCountPair.jsx`

**Rationale:** Three session-list files and the booking-confirm popup all need the same render logic for the count. Extracting prevents drift (the "pattern applied in one place" trap in `CLAUDE.md`).

- [ ] **Step 1: Create the component**

Create `src/components/SessionCountPair.jsx` with the following content:

```jsx
import React from 'react';

// Render "#12" (no override) or "#12 → 13" (override active).
// When `prefix="#"` (default), the hash only prefixes the effective/solo value
// so the output reads as a session ordinal. Pass prefix="" for pure count displays
// (like the client chip in the booking flow) where "#" would be misleading.
export default function SessionCountPair({ auto, effective, override, prefix = '#' }) {
  if (!override || auto === effective) {
    return <span className="count-auto-solo">{prefix}{auto}</span>;
  }
  return (
    <span className="count-pair">
      <span className="count-auto">{prefix}{auto}</span>
      <span className="count-arrow">→</span>
      <span className="count-effective">{effective}</span>
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionCountPair.jsx
git commit -m "feat(components): shared SessionCountPair renderer"
```

---

### Task 5: Create `OverrideHelpPopup` shared component

**Files:**
- Create: `src/components/OverrideHelpPopup.jsx`

**Rationale:** Long-press on the override input in both the client form and the booking confirm popup should show the same help content. Shared component prevents copy-paste drift.

- [ ] **Step 1: Create the component**

Create `src/components/OverrideHelpPopup.jsx`:

```jsx
import React from 'react';
import Modal from './Modal';
import { t } from '../i18n';

// Shown when the PT long-presses the override input, to explain the syntax.
// Also offers a one-tap Clear button that clears the override without needing
// to empty the input manually.
export default function OverrideHelpPopup({ show, onClose, onClear, lang }) {
  if (!show) return null;
  return (
    <Modal title={t(lang, 'overrideHelpTitle')} onClose={onClose}
      action={
        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
          onClick={onClose}>
          {t(lang, 'done')}
        </button>
      }>
      <div className="override-help-body">{t(lang, 'overrideHelpBody')}</div>
      {onClear && (
        <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', width: '100%' }}
          onClick={() => { onClear(); onClose(); }}>
          {t(lang, 'overrideClear')}
        </button>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OverrideHelpPopup.jsx
git commit -m "feat(components): shared OverrideHelpPopup (long-press help)"
```

---

### Task 6: Update `Dashboard.jsx` — session card count (expanded + compact)

**Files:**
- Modify: `src/components/Dashboard.jsx:5` (import), `:112`, `:125`, `:208`, `:214`

**Rationale:** Dashboard has two render sites for session cards (expanded view and compact view). Both show `#{monthCount}` today; both switch to the pair component.

- [ ] **Step 1: Update imports**

At `src/components/Dashboard.jsx:5`, change the import line from:

```jsx
import { today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendReminderWhatsApp, getSessionOrdinal, getClientPeriod, timeToMinutes, localDateStr, getStatus, haptic } from '../utils';
```

to:

```jsx
import { today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendReminderWhatsApp, getEffectiveSessionCount, getClientPeriod, timeToMinutes, localDateStr, getStatus, haptic } from '../utils';
import SessionCountPair from './SessionCountPair';
```

(Remove `getSessionOrdinal` from the named imports — no longer used here. Add `getEffectiveSessionCount` and the `SessionCountPair` default import.)

- [ ] **Step 2: Replace the expanded-view count calc (around line 111-112)**

Current:

```jsx
            const period = getClientPeriod(client, session.date);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, period.start, period.end);
```

Replace with:

```jsx
            const { auto: monthAuto, effective: monthCount, override: monthOverride } = getEffectiveSessionCount(client, session, state.sessions);
```

(The `period` variable was only used to compute `monthCount`; it's no longer needed. If any other code in the block uses `period`, leave the `getClientPeriod` line in — double-check with search.)

- [ ] **Step 3: Replace the expanded-view render (around line 125)**

Current:

```jsx
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
```

Replace with:

```jsx
                    <div className="client-name">
                      {getClientName(session.clientId)}{' '}
                      <SessionCountPair auto={monthAuto} effective={monthCount} override={monthOverride} />
                    </div>
```

- [ ] **Step 4: Repeat for the compact-view block (around line 207-214)**

Mirror the same two changes:

1. At line ~207-208, replace:

```jsx
            const period = getClientPeriod(client, session.date);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, period.start, period.end);
```

with:

```jsx
            const { auto: monthAuto, effective: monthCount, override: monthOverride } = getEffectiveSessionCount(client, session, state.sessions);
```

2. At line ~214, replace:

```jsx
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
```

with:

```jsx
                    <div className="client-name">
                      {getClientName(session.clientId)}{' '}
                      <SessionCountPair auto={monthAuto} effective={monthCount} override={monthOverride} />
                    </div>
```

- [ ] **Step 5: Verify on dev server**

Run `npm run dev` if not running. Open the Home tab. Confirm today's session cards render `#12` (or whatever the current count is) using the new styles (slightly more visible than before).

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.jsx
git commit -m "feat(dashboard): render session count via SessionCountPair"
```

---

### Task 7: Update `Schedule.jsx` — day-view session card + client chip

**Files:**
- Modify: `src/components/Schedule.jsx:5` (import), `:134-135` (session card count), `:140` (session card render), `:227-231` (client chip)

**Rationale:** Schedule has two places showing per-period counts: the session card in the day view (ordinal — `getSessionOrdinal`), and the client-picker chips during booking (period total — `getPeriodSessionCount`). Both should reflect the override.

- [ ] **Step 1: Update imports**

At `src/components/Schedule.jsx:5`, change the import from:

```jsx
import { genId, today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendBookingWhatsApp, sendReminderWhatsApp, getOccupiedSlots, getPeriodSessionCount, getSessionOrdinal, getClientPeriod, currentMonth, localDateStr, getStatus, haptic } from '../utils';
```

to:

```jsx
import { genId, today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendBookingWhatsApp, sendReminderWhatsApp, getOccupiedSlots, getEffectiveSessionCount, getEffectiveClientCount, getClientPeriod, currentMonth, localDateStr, getStatus, haptic, parseSessionCountOverride } from '../utils';
import SessionCountPair from './SessionCountPair';
import OverrideHelpPopup from './OverrideHelpPopup';
```

(Remove `getPeriodSessionCount` and `getSessionOrdinal` — replaced by the effective helpers. Add `getEffectiveSessionCount`, `getEffectiveClientCount`, `parseSessionCountOverride`. Also adds the two shared components. The booking-popup override UI — coming in Task 10 — uses all of these.)

- [ ] **Step 2: Replace the day-view session card count calc (around line 134-135)**

Current:

```jsx
          const period = getClientPeriod(client, session.date);
          const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, period.start, period.end);
```

Replace with:

```jsx
          const { auto: monthAuto, effective: monthCount, override: monthOverride } = getEffectiveSessionCount(client, session, state.sessions);
```

(If `period` is used elsewhere in this block, leave `getClientPeriod(client, session.date)` as a separate assignment above.)

- [ ] **Step 3: Replace the session card render (around line 140)**

Current:

```jsx
                  <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t5)' }}>#{monthCount}</span></div>
```

Replace with:

```jsx
                  <div className="client-name">
                    {getClientName(session.clientId)}{' '}
                    <SessionCountPair auto={monthAuto} effective={monthCount} override={monthOverride} />
                  </div>
```

- [ ] **Step 4: Replace the client chip count (around line 227-231)**

Current (the block around line 224-232):

```jsx
                  const chipPeriod = getClientPeriod(c, today());
                  const monthCount = getPeriodSessionCount(state.sessions, id, chipPeriod.start, chipPeriod.end);
                  return (
                    <button key={id} className={`chip${isSelected ? ' active' : ''}`}
                      onClick={() => toggleClient(id)}>
                      {c.name} <span style={{ opacity: 0.6, fontSize: 11 }}>({monthCount})</span>
                    </button>
                  );
```

Replace with:

```jsx
                  const { auto: chipAuto, effective: chipEffective, override: chipOverride } = getEffectiveClientCount(c, state.sessions);
                  return (
                    <button key={id} className={`chip${isSelected ? ' active' : ''}`}
                      onClick={() => toggleClient(id)}>
                      {c.name}{' '}
                      {chipOverride
                        ? <span style={{ opacity: 0.85, fontSize: 11 }}>({chipAuto}→{chipEffective})</span>
                        : <span style={{ opacity: 0.6, fontSize: 11 }}>({chipAuto})</span>}
                    </button>
                  );
```

(The chip is tight on space, so inline `(12→13)` reads better than a styled pill. The opacity bump when an override is active signals "look at this one".)

- [ ] **Step 5: Verify on dev server**

Open the Schedule tab. Confirm session cards in the day view render `#12` via the pair component. Open the booking flow, verify client chips show `(12)` as before.

- [ ] **Step 6: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "feat(schedule): render session count + client chip count via override-aware helpers"
```

---

### Task 8: Update `Sessions.jsx` — session list row

**Files:**
- Modify: `src/components/Sessions.jsx:3` (import), `:79-80`, `:85`

**Rationale:** The all-sessions log also shows `#{monthCount}` per row. Same treatment.

- [ ] **Step 1: Update imports**

At `src/components/Sessions.jsx:3`, change the import line from:

```jsx
import { formatDate, SESSION_TYPES, getSessionOrdinal, getClientPeriod, FOCUS_TAGS, DURATIONS, TIMES, getStatus, haptic } from '../utils';
```

to:

```jsx
import { formatDate, SESSION_TYPES, getEffectiveSessionCount, getClientPeriod, FOCUS_TAGS, DURATIONS, TIMES, getStatus, haptic } from '../utils';
import SessionCountPair from './SessionCountPair';
```

- [ ] **Step 2: Replace the count calc (around line 79-80)**

Current:

```jsx
          const period = getClientPeriod(client, session.date);
          const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, period.start, period.end);
```

Replace with:

```jsx
          const { auto: monthAuto, effective: monthCount, override: monthOverride } = getEffectiveSessionCount(client, session, state.sessions);
```

- [ ] **Step 3: Replace the render (around line 85)**

Current:

```jsx
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
```

Replace with:

```jsx
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {getClientName(session.clientId)}{' '}
                    <SessionCountPair auto={monthAuto} effective={monthCount} override={monthOverride} />
                  </div>
```

- [ ] **Step 4: Verify + commit**

Open the Sessions tab. Confirm session rows render `#12` via the pair. Commit:

```bash
git add src/components/Sessions.jsx
git commit -m "feat(sessions): render session count via SessionCountPair"
```

---

### Task 9: Update `Clients.jsx` — client edit form with override input

**Files:**
- Modify: `src/components/Clients.jsx:4` (imports), `:7-15` (component state), `:10` (form state default), `:24` (openEdit), `:29-37` (save), and the edit modal JSX around `:285-303` (billing period block)

**Rationale:** The PT authors and clears the override on the client edit form. Needs the draft-input pattern, a live preview, and a wiring to EDIT_CLIENT that stamps `overridePeriodStart` with today's period. Also integrates the `OverrideHelpPopup` for long-press help.

- [ ] **Step 1: Update imports**

At `src/components/Clients.jsx:4-5`, change:

```jsx
import { genId, formatPhone, phoneMatchesQuery, getDefaultCountryCode, setDefaultCountryCode, SESSION_TYPES, FOCUS_TAGS, PERIOD_OPTIONS, getMonthlySessionCount, formatDate, capitalizeName, localMonthStr, getStatus, haptic } from '../utils';
import { t, dateLocale } from '../i18n';
```

to:

```jsx
import { genId, formatPhone, phoneMatchesQuery, getDefaultCountryCode, setDefaultCountryCode, SESSION_TYPES, FOCUS_TAGS, PERIOD_OPTIONS, getMonthlySessionCount, formatDate, capitalizeName, localMonthStr, getStatus, haptic, parseSessionCountOverride, getEffectiveClientCount, getClientPeriod, today } from '../utils';
import { t, dateLocale } from '../i18n';
import OverrideHelpPopup from './OverrideHelpPopup';
```

- [ ] **Step 2: Add `overrideDraft` to form state + help popup flag**

At the top of the `Clients` component, around line 10, change the form useState line:

```jsx
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '', periodStart: '', periodLength: '' });
```

to:

```jsx
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '', periodStart: '', periodLength: '', overrideDraft: '' });
  const [overrideHelp, setOverrideHelp] = useState(false);
  const overrideLongPress = React.useRef(null);
```

- [ ] **Step 3: Initialize `overrideDraft` in `openAdd` and `openEdit`**

Change `openAdd` (line ~17) to include the new field:

```jsx
  const openAdd = () => {
    setForm({ name: '', nickname: '', phone: '', gender: '', birthdate: '', notes: '', periodStart: '', periodLength: '', overrideDraft: '' });
    setEditingClient(null);
    setShowForm(true);
  };
```

Change `openEdit` (line ~23) to derive the draft string from the stored override:

```jsx
  const openEdit = (c) => {
    // Only show the override draft if it belongs to the current period.
    // Stale overrides (from a past period) are inert and should not populate the field.
    const currentPeriod = getClientPeriod(c, today());
    const overrideActive = c.sessionCountOverride && c.overridePeriodStart === currentPeriod.start;
    const draft = overrideActive
      ? (c.sessionCountOverride.type === 'delta'
          ? (c.sessionCountOverride.value >= 0 ? `+${c.sessionCountOverride.value}` : `${c.sessionCountOverride.value}`)
          : String(c.sessionCountOverride.value))
      : '';
    setForm({
      name: c.name, nickname: c.nickname || '', phone: c.phone,
      gender: c.gender || '', birthdate: c.birthdate || '',
      notes: c.notes || '', periodStart: c.periodStart || '', periodLength: c.periodLength || '',
      overrideDraft: draft,
    });
    setEditingClient(c);
    setShowForm(true);
  };
```

- [ ] **Step 4: Update `save` to parse and persist the override**

Change `save` (line ~29) to parse and persist (or clear) the override fields:

```jsx
  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    const parsed = parseSessionCountOverride(form.overrideDraft);
    // Strip overrideDraft (UI-only state) before dispatching
    const { overrideDraft: _draft, ...persist } = form;
    // Build override fields: if parsed is null, clear both; if parsed is an object,
    // stamp overridePeriodStart with today's current period.
    const clientShape = editingClient || { id: genId() };
    const refClient = { ...clientShape, ...persist };
    const currentPeriod = getClientPeriod(refClient, today());
    persist.sessionCountOverride = parsed;
    persist.overridePeriodStart = parsed ? currentPeriod.start : null;

    if (editingClient) {
      dispatch({ type: 'EDIT_CLIENT', payload: { ...editingClient, ...persist } });
    } else {
      dispatch({ type: 'ADD_CLIENT', payload: { id: clientShape.id, ...persist } });
    }
    setShowForm(false);
  };
```

- [ ] **Step 5: Add the override row to the edit modal**

Locate the billing-period block in the modal (around line 285-303, the `{/* Billing period — optional... */}` comment through to the closing `</div>` of that `flex-row-12`). Immediately after the closing `</div>` of the billing-period flex row, insert:

```jsx
          {/* Session count override — editable only when editing an existing client */}
          {editingClient && (() => {
            const previewClient = { ...editingClient, ...form,
              sessionCountOverride: parseSessionCountOverride(form.overrideDraft),
              overridePeriodStart: getClientPeriod({ ...editingClient, ...form }, today()).start,
            };
            const { auto, effective, override } = getEffectiveClientCount(previewClient, state.sessions);
            const startLongPress = () => {
              overrideLongPress.current = setTimeout(() => { haptic(); setOverrideHelp(true); }, 500);
            };
            const cancelLongPress = () => {
              clearTimeout(overrideLongPress.current);
            };
            return (
              <div className="field">
                <label className="field-label">{t(lang, 'overrideHelpTitle')}</label>
                <div className="period-override-row">
                  <span className="period-count-preview">
                    {t(lang, 'countAuto')} <strong>{auto}</strong>
                    {override && <> → <strong className="accent">{effective}</strong></>}
                  </span>
                  <input
                    type="text"
                    inputMode="text"
                    className="override-input"
                    placeholder={t(lang, 'overridePlaceholder')}
                    value={form.overrideDraft}
                    onChange={e => setForm(p => ({ ...p, overrideDraft: e.target.value }))}
                    onTouchStart={startLongPress}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={e => { e.preventDefault(); setOverrideHelp(true); }}
                  />
                </div>
              </div>
            );
          })()}
```

And just before the closing `</Modal>` tag of the edit modal, nothing to add — the popup renders outside the Modal. But right after the outer `{showForm && (...)}` block (before the `{deletePrompt && ...}` block at line ~307), add:

```jsx
      <OverrideHelpPopup
        show={overrideHelp}
        onClose={() => setOverrideHelp(false)}
        onClear={() => setForm(p => ({ ...p, overrideDraft: '' }))}
        lang={lang}
      />
```

- [ ] **Step 6: Verify on dev server**

- Open a client, tap edit. Scroll to the bottom of the modal. Confirm the new row appears with `Auto 12` (or the client's current count).
- Type `+1`. The preview should update live to `Auto 12 → 13`.
- Type `abc`. On tap-out (blur via tapping elsewhere) + save, the junk value should not be persisted — the draft stays in the form until save, but `parseSessionCountOverride('abc')` returns null so save clears the override. That's acceptable.
- Long-press the input (hold 500ms). The help popup should appear.
- Tap Clear in the popup. The draft clears.
- Save with a valid override. Re-open the same client. The draft populates from the stored value.
- Switch a client to a different custom period (or manipulate clock) and re-open. The draft should be empty because the stored override belongs to a different period.

- [ ] **Step 7: Commit**

```bash
git add src/components/Clients.jsx
git commit -m "feat(clients): session-count override input on client edit form"
```

---

### Task 10: Update `Schedule.jsx` — booking confirm popup with inline override edit

**Files:**
- Modify: `src/components/Schedule.jsx:310-349` (the `{confirmMsg && ...}` block)

**Rationale:** After saving a new session, the confirmation popup must show `Auto N → M` and let the PT edit the override inline before sending WhatsApp. Saving the edit writes back to `state.clients` via EDIT_CLIENT, so the WhatsApp message uses the new effective value immediately.

- [ ] **Step 1: Add popup-local state for the override draft + edit mode + help**

In `Schedule.jsx`, near the top of the component where other `useState` calls live (look around the existing `confirmMsg` state), add:

```jsx
  const [confirmOverrideEdit, setConfirmOverrideEdit] = useState(false);
  const [confirmOverrideHelp, setConfirmOverrideHelp] = useState(false);
  const confirmOverrideLongPress = React.useRef(null);
```

Also add a draft string that initializes when `confirmMsg` opens. The existing popup structure reconstructs state per render, so compute `draft` inside the `(() => { ... })()` IIFE that builds the popup.

- [ ] **Step 2: Rewrite the confirm-popup IIFE to include the count preview + override controls**

Around line 310, replace the current `{confirmMsg && (() => { ... })()}` block with:

```jsx
      {confirmMsg && (() => {
        const { items, index } = confirmMsg;
        const { client: clientRef, session } = items[index];
        // Always re-read the latest client from state (the PT may have just edited the override inline).
        const client = state.clients.find(c => c.id === clientRef.id) || clientRef;
        const total = items.length;
        const isLast = index === total - 1;

        // Guarantee the just-booked session is in the list used for counts + WhatsApp.
        // Without this, React state-update timing could leave state.sessions stale at
        // click time → findIndex=-1 → "Session #0" in the message.
        const sessions = state.sessions.some(s => s.id === session.id)
          ? state.sessions
          : [...state.sessions, session];

        const { auto, effective, override } = getEffectiveSessionCount(client, session, sessions);

        // Derive a display draft from the stored override (for edit mode)
        const currentPeriod = getClientPeriod(client, session.date);
        const overrideActive = client.sessionCountOverride && client.overridePeriodStart === currentPeriod.start;
        const storedDraft = overrideActive
          ? (client.sessionCountOverride.type === 'delta'
              ? (client.sessionCountOverride.value >= 0 ? `+${client.sessionCountOverride.value}` : `${client.sessionCountOverride.value}`)
              : String(client.sessionCountOverride.value))
          : '';

        const advance = () => {
          if (isLast) setConfirmMsg(null);
          else setConfirmMsg({ items, index: index + 1 });
          setConfirmOverrideEdit(false);
        };

        const commitOverride = (raw) => {
          const parsed = parseSessionCountOverride(raw);
          dispatch({
            type: 'EDIT_CLIENT',
            payload: {
              ...client,
              sessionCountOverride: parsed,
              overridePeriodStart: parsed ? currentPeriod.start : null,
            },
          });
        };

        const startLongPress = () => {
          confirmOverrideLongPress.current = setTimeout(() => { haptic(); setConfirmOverrideHelp(true); }, 500);
        };
        const cancelLongPress = () => clearTimeout(confirmOverrideLongPress.current);

        return (
          <Modal title={total > 1 ? `${t(lang, 'sessionBooked')} (${index + 1}/${total})` : t(lang, 'sessionBooked')} onClose={() => { setConfirmMsg(null); setConfirmOverrideEdit(false); }}
            action={<>
              <button className="btn-whatsapp-lg mb-10" onClick={() => {
                sendBookingWhatsApp(client, session, state.messageTemplates, lang, sessions);
                advance();
              }}>
                <WhatsAppIcon size={20} />
                {t(lang, 'sendConfirmWA')}
              </button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
                onClick={advance}>{isLast ? t(lang, 'done') : t(lang, 'skip')}</button>
            </>}>
            <div className="success-center">
              <div className="success-icon">✅</div>
              <div className="success-name">{client.name}</div>
              <div className="success-detail">{formatDate(session.date, lang)} {t(lang, 'at')} {session.time}</div>
              <div className="period-override-row" style={{ justifyContent: 'center', marginTop: 12 }}>
                <span className="period-count-preview">
                  {t(lang, 'countAuto')} <strong>{auto}</strong>
                  {override && <> → <strong className="accent">{effective}</strong></>}
                </span>
                {confirmOverrideEdit ? (
                  <input
                    type="text"
                    inputMode="text"
                    className="override-input"
                    placeholder={t(lang, 'overridePlaceholder')}
                    defaultValue={storedDraft}
                    autoFocus
                    onBlur={e => commitOverride(e.target.value)}
                    onTouchStart={startLongPress}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={e => { e.preventDefault(); setConfirmOverrideHelp(true); }}
                  />
                ) : (
                  <button className="override-edit-btn" onClick={() => setConfirmOverrideEdit(true)} aria-label="Edit override">✎</button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
      <OverrideHelpPopup
        show={confirmOverrideHelp}
        onClose={() => setConfirmOverrideHelp(false)}
        onClear={() => {
          const idx = confirmMsg ? confirmMsg.index : 0;
          const clientRef = confirmMsg ? confirmMsg.items[idx].client : null;
          if (clientRef) {
            const client = state.clients.find(c => c.id === clientRef.id) || clientRef;
            dispatch({
              type: 'EDIT_CLIENT',
              payload: { ...client, sessionCountOverride: null, overridePeriodStart: null },
            });
          }
        }}
        lang={lang}
      />
```

**Notes:**
- The `clientRef` in `confirmMsg.items` may be stale after an EDIT_CLIENT; always re-read from `state.clients` for live data.
- `onBlur` persists the override, so typing + tapping anywhere else commits. The pencil button toggles the edit state on and off per click — tapping pencil again hides the input (but the value is already saved on blur).
- `defaultValue` (uncontrolled) prevents re-render churn while typing. The commit happens on blur.
- The `stored draft` re-derives from `client` every render, so if another device pushes an override in, this popup reflects it on next render.

- [ ] **Step 3: Verify on dev server**

- Book a new session for a client.
- Confirm popup shows `Auto 3` (or whatever the ordinal is) + pencil button.
- Tap pencil. Input appears. Type `+1`. Tap outside. The count line updates to `Auto 3 → 4`.
- Tap Send WhatsApp. The message body should read `#4` (or equivalent based on the template).
- Re-open the client edit form. The override field should show `+1`.
- Book another session for the same client. Popup shows `Auto 4 → 5` (auto bumped, delta still applied).
- Long-press the input → help popup with Clear button.
- Tap Clear. Override field empties; count line collapses to `Auto 4`.

- [ ] **Step 4: Commit**

```bash
git add src/components/Schedule.jsx
git commit -m "feat(schedule): inline session-count override edit in booking confirm popup"
```

---

### Task 11: Bump version + update instructions URL

**Files:**
- Modify: `src/App.jsx:232` — version string in debug panel
- Modify: `src/components/General.jsx:9` — instructions URL

- [ ] **Step 1: Bump App.jsx version badge**

In `src/App.jsx:232`, change:

```jsx
          <div><strong>Version:</strong> v2.7</div>
```

to:

```jsx
          <div><strong>Version:</strong> v2.8</div>
```

- [ ] **Step 2: Update instructions URL in General.jsx**

In `src/components/General.jsx:9`, change:

```jsx
  instructions: 'https://raw.githubusercontent.com/pih-dev/PTApp/master/docs/instructions-v2.4.md',
```

to:

```jsx
  instructions: 'https://raw.githubusercontent.com/pih-dev/PTApp/master/docs/instructions-v2.8.md',
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components/General.jsx
git commit -m "chore: bump version to v2.8 + point instructions URL to v2.8"
```

---

### Task 12: Full manual verification matrix

**Files:** none — verification only.

**Rationale:** Before documenting and deploying, run through the full 17-scenario test matrix from the spec. If a scenario fails, fix the implementation, then re-run the affected scenarios.

- [ ] **Step 1: Start dev server + open app**

```bash
npm run dev
```

Open `http://localhost:5173/PTApp/` in a browser. Open DevTools console to spot any errors.

- [ ] **Step 2: Run through the spec's 17 test scenarios**

From `docs/superpowers/specs/2026-04-20-manual-session-count-override-design.md` Testing section:

1. **Absolute override, same period** — a client with 12 auto sessions, edit → set `10`, save. Client's session cards show `#12 → 10`. Book a new session, WhatsApp should render `#10`.
2. **Positive delta** — same client, set `+1`. Cards show `#12 → 13`. WhatsApp `#13`.
3. **Negative delta** — set `-2`. Cards show `#12 → 10`. WhatsApp `#10`.
4. **Delta exceeding auto** — find (or create) a client with auto=1. Set `-5`. Display `#1 → 0`. WhatsApp `#0`.
5. **Zero absolute** — set `0`. Display `#12 → 0`. WhatsApp `#0`.
6. **`+0` / `-0`** — type `+0`, save. Parser returns null → override clears. Cards show `#12` solo.
7. **Empty field saved** — clear the override field, save. Override field in localStorage becomes `null`, `overridePeriodStart` becomes `null`.
8. **Junk input** — type `abc`, save. Parser returns null → override clears. (No in-place revert during typing — the parse happens on save/commit.)
9. **Period rollover** — open devtools → Application → localStorage → `ptapp-data`. Find a client with an override. Manually change their `overridePeriodStart` to `2025-01-01`. Refresh the app. The override should be treated as inactive (count displays as `#12` solo, WhatsApp uses auto).
10. **Custom billing period** — pick a client, set `periodLength: 4weeks`, `periodStart: 2026-04-01`. Set override `+2`. Fast-forward by editing `overridePeriodStart` to match the current 4-week period's start. Verify the override applies. Then change it back to `2026-03-01` (an earlier period) and verify it no longer applies.
11. **Booking popup inline edit** — create a new session, tap pencil, type `+1`, tap outside, tap Send WhatsApp. Message renders with the new effective.
12. **Long-press on override input (client form)** — hold 500ms. Help popup appears, haptic fires (on Android; iPhone has no `navigator.vibrate`). Tap Clear — draft clears. Tap Done/backdrop — popup closes.
13. **Desktop right-click** — on the override input in the client form, right-click → help popup appears.
14. **RTL (Arabic)** — switch language to Arabic. Open a client, confirm the override label + preview render RTL. The arrow `→` stays as `→` (it's a character, not direction-sensitive). Test reads right-to-left.
15. **Light + dark theme** — toggle theme. In both themes, confirm: `Auto` is readable (not dim); `12 → 13` is legible; effective pill has correct contrast.
16. **Sync conflict** — on two browser tabs with the same token, set different overrides on the same client within seconds. The later `_modified` should win. (This is the v2.6 merge contract; smoke-test only.)
17. **Cross-device stale push** — simulate: open the app on tab A, set override `+1`, wait for sync. Open tab B, set override `-2`, wait for sync. Wait for tab A to sync. Both tabs should reconcile to the same value. No blank screens or lost clients.

- [ ] **Step 3: Fix any regressions**

If any scenario fails, go back to the relevant Task (1-10), fix, and re-run that scenario. Record any real fix in a separate commit before moving on.

- [ ] **Step 4: No commit — this task is verification-only**

---

### Task 13: Documentation

**Files:**
- Create: `docs/instructions-v2.8.md`
- Modify: `docs/changelog-summary.md` — append v2.8
- Modify: `docs/changelog-technical.md` — append v2.8
- Modify: `CLAUDE.md` — promote v2.7 to Previous Version, add v2.8 as Current Version

**Rationale:** Per Pierre's explicit instruction ("document everything especially the changelog") and per project convention. Each of these files has a specific purpose — don't combine them.

- [ ] **Step 1: Create `docs/instructions-v2.8.md`**

Write the following to `docs/instructions-v2.8.md`:

```markdown
# PTApp Instructions — v2.8

v2.8 is a **single-feature release** focused on the session count. Nothing else changed — sync, clients, scheduling, WhatsApp, themes, and language all work exactly the same as v2.7.

For the full feature walkthrough, see [`instructions-v2.5.md`](instructions-v2.5.md). For v2.6 (sync reliability) and v2.7 (upcoming sessions), see their respective docs.

---

## What Changed in v2.8

**You can now manually override the session count for a client within the current billing period.**

Before v2.8, the session count was computed automatically from the scheduled/completed sessions in each period. If you disagreed with the count — a session was entered twice, a paper record said otherwise, the client insisted it was different — your only options were to book a retroactive session (polluting history with a fake entry) or cancel-without-count an existing one (polluting history with a fake cancellation).

v2.8 introduces a clean, non-destructive override.

**How to use it:**

1. Open a client in the Clients tab. Tap Edit.
2. Scroll to the **Manual count override** section at the bottom of the edit modal.
3. In the small input field, type:
   - A whole number like `10` to **set the count directly** (overrides everything).
   - `+1` or `-1` (or any `+N` / `-N`) to **adjust the automatic count**.
   - Leave it empty to use the automatic count.
4. Tap Save.

The preview line next to the field updates as you type: `Auto 12 → 13`.

**You can also edit the override from the booking popup.** Right after booking a session, the confirmation popup shows `Auto N → M` with a pencil (`✎`) button next to it. Tap the pencil to change the override on the spot, then tap Send WhatsApp — the message will use the new value.

**Long-press the override field** (hold for half a second) to bring up a help popup explaining the syntax, with a one-tap **Clear override** button.

**Where the override shows up:**
- On every session card in the Home tab (`#12 → 13` next to the client name).
- On every session card in the Schedule tab.
- On every row in the Sessions tab.
- On the client's chip during the booking flow (a bit compact: `(12→13)`).
- In every WhatsApp message whose template uses the `{number}` placeholder — booking confirmations AND reminders. The message body itself has a single number (the effective one); the `12 → 13` style is only inside the app.

**What does NOT change:**
- The client list card still shows the **lifetime** session count (not per-period). The override is period-scoped, so it doesn't affect that number.
- The `Auto` count itself is unchanged — sessions are still counted the same way, the override just layers on top.
- The Today stat, weekly stat, focus tags, cancel flow, and sync architecture are all untouched.

**What you should know about the automatic clear:**

The override is **tied to the billing period it was set in**. When a new period starts (next calendar month for default clients, or the next 4-week / 2-week / 1-week boundary for custom periods), the override stops applying — the UI goes back to showing just the auto count, and WhatsApp messages go back to the auto value.

This is intentional: most overrides exist to correct a one-time discrepancy for *this* period. Carrying a `+1` across months would silently inflate the next month's count.

If you want the override to persist into the new period, just open the client and re-enter it — takes a second.

**Visibility improvement (small but noticeable):**

The session count on the client list card was hard to read in both themes — dim against the background. v2.8 bumps its visibility so you don't need to squint. The pattern applies everywhere `Auto N` appears in the app.

---

## Tips

- **Negative deltas are clamped at zero.** If the auto count is 1 and your delta is `-5`, the display and the WhatsApp message show `0`, not a negative number.
- **`+0` and `-0`** are treated as no-op and clear the override.
- **Non-numeric input** (letters, decimals) is rejected — the field stays at the previous valid value or clears.
- **Data is preserved.** Old overrides from expired periods sit inert in storage — they're just not applied. Clearing the field on any save sweeps the stale data out if you want.

---

## Previous Versions

- v2.7 — Upcoming Sessions on Dashboard (shows tomorrow's sessions tonight)
- v2.6 — Bulletproof sync (Hala Mouzanar data-loss fix)
- v2.5 — Visual polish, light theme redesign, i18n, todos
```

- [ ] **Step 2: Append v2.8 section to `docs/changelog-summary.md`**

Read `docs/changelog-summary.md` to find where v2.7 ends, then insert above it (reverse-chronological):

```markdown
## v2.8 — Manual Session Count Override

**What it does:** Per-client session count override for the current billing period. Set an absolute number (`10`) or a delta (`+1`, `-1`) on the client edit form or the booking popup. Shows `Auto 12 → 13` everywhere the period count appears in the app, and applies to every WhatsApp template with the `{number}` placeholder. Clears automatically when the billing period rolls over.

**Why:** The PT sometimes disagrees with the auto count — a missed entry, a double booking, a paper record. Previously his only workarounds polluted history (fake retroactive session or fake cancellation). The override is clean, non-destructive, and period-scoped so it can't silently inflate next month.

**UX notes:** Long-press the override input for a help popup + one-tap Clear. The booking popup gets a pencil (`✎`) for on-the-fly edits right before sending WhatsApp. The existing `.session-count` on client list cards was also bumped up a notch in readability — it was too dim in both themes.

**Data:** Two optional client fields (`sessionCountOverride`, `overridePeriodStart`). No migration; `DATA_VERSION` stays at 2. Rides the existing v2.6 per-record merge for sync.
```

- [ ] **Step 3: Append v2.8 section to `docs/changelog-technical.md`**

Read `docs/changelog-technical.md` to match its style and insert a matching technical entry:

```markdown
## v2.8 — Manual Session Count Override

### Data model
- `client.sessionCountOverride: { type: 'absolute' | 'delta', value: number } | null` — new optional field.
- `client.overridePeriodStart: 'YYYY-MM-DD' | null` — the `period.start` at the time the override was saved. Used to gate whether the override is "active" (matches current period).
- No migration. `DATA_VERSION` stays at 2. Pre-v2.8 client records load with both fields absent → treated as null.

### New utilities (`src/utils.js`)
- `parseSessionCountOverride(raw)` — parses user input into `{ type, value }` or null. Handles `"10"` (absolute), `"+1"`/`"-1"` (delta), `""` / `"+0"` / `"-0"` / junk (null).
- `getEffectiveSessionCount(client, session, sessions) → { auto, effective, override }` — per-session effective count.
- `getEffectiveClientCount(client, sessions) → { auto, effective, override }` — client-scoped (as of today).
- `fillTemplate` now calls `getEffectiveSessionCount` instead of `getSessionOrdinal` for the `{number}` placeholder.

### New components
- `SessionCountPair` — shared renderer. Renders `#N` solo (no override) or `#N → M` (override active). Reused on Dashboard (2 sites), Schedule session card, Sessions list.
- `OverrideHelpPopup` — shared long-press help modal. Reused in client edit form and booking confirm popup.

### Modified components
- `Clients.jsx` — client edit form gains override input + live preview. Draft string stored in form state. On save, `parseSessionCountOverride` converts to the object shape and `overridePeriodStart` is stamped with the current period.
- `Schedule.jsx` — session card uses `SessionCountPair`; client chip switches to `getEffectiveClientCount`; booking confirm popup adds pencil (`✎`) → inline input → `EDIT_CLIENT` dispatch.
- `Dashboard.jsx` — two session-card render sites (expanded + compact) use `SessionCountPair`.
- `Sessions.jsx` — session-row render uses `SessionCountPair`.

### Styles (`src/styles.css`)
- New: `.count-pair`, `.count-auto`, `.count-arrow`, `.count-effective`, `.count-auto-solo`, `.period-override-row`, `.period-count-preview`, `.override-input`, `.override-edit-btn`, `.override-help-body`.
- Theme-specific overrides under `.theme-light`.
- Existing `.session-count` bumped from 0.5 → 0.72 alpha (both themes) for readability.

### i18n keys (en + ar)
- `countAuto`, `overridePlaceholder`, `overrideHelpTitle`, `overrideHelpBody`, `overrideClear`.

### Sync impact
- Both new fields ride the existing `EDIT_CLIENT` path → reducer stamps `_modified` → v2.6 per-record merge preserves the later write. No changes to `sync.js` or `reconcile()`.

### Version bumps
- `src/App.jsx` debug badge: v2.7 → v2.8.
- `src/components/General.jsx` instructions URL: v2.4 → v2.8 (the URL had drifted — corrected now).

### Manual verification
- 17-scenario matrix in the design spec, all pass.

### Known trade-offs
- If mother's phone pushes a stale override from an expired period, the field sits inert in storage until overwritten. The effective-count logic ignores it (period mismatch). Acceptable; aligns with "never lose data" — deleting the stale field would be silently destructive.
- The client list card shows lifetime count (unchanged), not period count. The override doesn't apply there because it's period-scoped. Documented in instructions-v2.8.md.
```

- [ ] **Step 4: Update `CLAUDE.md` — promote v2.7, add v2.8 as Current**

In `CLAUDE.md`, find the "Current Version: v2.7" section. Replace the `## Current Version: v2.7` block and the `## Previous Version: v2.6` block with:

```markdown
## Current Version: v2.8
- Per-client manual session count override for the current billing period
  - Absolute (`10`) or delta (`+1`, `-1`) values. Empty / `+0` / `-0` / junk → null.
  - Authored on the client edit form AND inline in the booking confirm popup (pencil toggle).
  - Clears automatically on billing period rollover — no cleanup job; display logic just ignores stale `overridePeriodStart`.
  - Displayed as `#12 → 13` on every session card (Dashboard expanded+compact, Schedule day view, Sessions list) and `(12→13)` on booking client chips.
  - Applied to every WhatsApp template with the `{number}` placeholder via `fillTemplate`.
  - New fields: `sessionCountOverride`, `overridePeriodStart` — both optional, no migration.
  - Long-press the override input → help popup with Clear.
  - Existing `.session-count` class on client list cards bumped from 0.5 → 0.72 alpha for readability.
- New utils: `parseSessionCountOverride`, `getEffectiveSessionCount`, `getEffectiveClientCount`
- New shared components: `SessionCountPair`, `OverrideHelpPopup`
- Debug panel shows v2.8

## Previous Version: v2.7
- Dashboard home screen shows "Upcoming Sessions" instead of "Today's Sessions"
  - Single `upcoming` filter: `status !== 'cancelled' && date >= today()`, sorted date+time asc
  - Both Expanded and Compact views iterate the same array — Compact's 5-session cap is gone
  - Section title: "📅 Upcoming Sessions (N)" with count in both views
  - Expanded cards gain a date line ("Today" or formatted date like "Apr 20") so cards are distinguishable across days
  - Today's completed sessions stay visible (day-progress useful); roll off at midnight
  - Stat card "Today" unchanged (workload-density metric, not an action queue)
- New i18n key `today` (en: "Today", ar: "اليوم")

## Older Version: v2.6
```

(Leave the v2.6 section and everything below it as-is.)

- [ ] **Step 5: Commit all docs together**

```bash
git add docs/instructions-v2.8.md docs/changelog-summary.md docs/changelog-technical.md CLAUDE.md
git commit -m "docs(v2.8): instructions, changelogs, CLAUDE.md version promotion"
```

---

### Task 14: Build, verify, deploy to gh-pages

**Files:**
- Modify: `index.html`, `sw.js`, `manifest.json` on the `gh-pages` branch (copied from `dist/`)

**Rationale:** Pushing to master alone does NOT deploy. The live site serves from `gh-pages`. Per CLAUDE.md "Session Startup" section and `feedback_deploy_process.md` memory.

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: `dist/index.html`, `dist/sw.js`, `dist/manifest.json` written. No errors.

- [ ] **Step 2: Verify bundle integrity**

```bash
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: no syntax errors. If this fails, the build is corrupted — do NOT deploy. Investigate `vite.config.js`.

- [ ] **Step 3: Stage deploy files**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
```

- [ ] **Step 4: Switch to gh-pages, copy files, commit, push**

```bash
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json
git commit -m "Deploy v2.8: manual session count override"
git push origin gh-pages
git checkout master
```

- [ ] **Step 5: Confirm live deployment**

Open `https://pih-dev.github.io/PTApp/` in an incognito window. Long-press the version pill at the top-right. Confirm it reads `Version: v2.8`. Open a client, scroll to the edit modal's bottom — confirm the Manual count override section is there.

- [ ] **Step 6: Tell Pierre the version is live**

Tell Pierre: "v2.8 deployed — https://pih-dev.github.io/PTApp/. Manual session count override live on both the client edit form and the booking confirm popup."

---

## Self-Review Notes

**Spec coverage check:**
- Data model (Task 1, Task 9) ✓
- Parser (Task 1) ✓
- Effective-count helpers (Task 1) ✓
- Period rollover semantics (Task 1, Task 9 — gated on `overridePeriodStart === period.start`) ✓
- WhatsApp rendering via `{number}` (Task 1 — `fillTemplate`) ✓
- UI format `12 → 13` (Task 3, Task 4, Tasks 6-8) ✓
- Auto count readability bump (Task 3 — `.session-count` + new `.count-auto`) ✓
- Client edit form input (Task 9) ✓
- Booking popup inline edit (Task 10) ✓
- Long-press help popup (Task 5 + integration in Task 9 / Task 10) ✓
- i18n keys (Task 2) ✓
- Reducer `EDIT_CLIENT` dispatch stamps `_modified` automatically (no new action needed — Task 9 / Task 10 use existing dispatch) ✓
- "Client list card all-time count NOT touched" explicitly not in scope ✓
- Documentation per Pierre's request — changelog summary + technical, instructions-v2.8, CLAUDE.md (Task 13) ✓
- Deploy (Task 14) ✓

**No placeholder check:** No `TODO` / `TBD` / "handle edge cases" / "appropriate validation" present. Every step has concrete code or commands.

**Type consistency check:**
- `sessionCountOverride` shape: `{ type: 'absolute' | 'delta', value: number } | null` — consistent across Tasks 1, 9, 10.
- `overridePeriodStart` shape: `'YYYY-MM-DD' | null` — consistent.
- `getEffectiveSessionCount` return: `{ auto, effective, override }` — consistent across Dashboard, Schedule, Sessions, booking popup (Tasks 6-10).
- `SessionCountPair` props: `{ auto, effective, override, prefix? }` — consistent (Task 4 defined, Tasks 6-8 consume).
- `OverrideHelpPopup` props: `{ show, onClose, onClear?, lang }` — consistent (Task 5 defined, Task 9 and Task 10 consume).
- CSS class names (`.count-auto`, `.count-arrow`, `.count-effective`, `.count-auto-solo`, `.count-pair`, `.period-override-row`, `.period-count-preview`, `.override-input`, `.override-edit-btn`, `.override-help-body`) — consistent between Task 3 definitions and consumer tasks.
- i18n keys (`countAuto`, `overrideHelpTitle`, `overrideHelpBody`, `overrideClear`, `overridePlaceholder`) — consistent between Task 2 definitions and consumer tasks.

All checks pass.
