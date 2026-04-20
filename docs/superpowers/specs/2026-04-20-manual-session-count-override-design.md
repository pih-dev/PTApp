# Manual Session Count Override — Design

**Date:** 2026-04-20
**Status:** Approved, ready for implementation plan
**Target version:** v2.8
**Scope:** `src/utils.js` (parser, effective-count helpers, template render), `src/components/Clients.jsx` (edit form: override input + period preview), `src/components/Schedule.jsx` (booking confirm popup + day/session count display), `src/components/Dashboard.jsx` (session-card count display), `src/components/Sessions.jsx` (session-card count display), `src/i18n.js` (new keys), `src/styles.css` (count-display treatment + long-press popup). The all-time count on the client list card (`Clients.jsx:137`) is not touched — the override is period-scoped.

## Problem

The PT sometimes disagrees with the app's automatic session count for a client within the current billing period. Causes include:

- A past session wasn't entered (count is too low).
- A session was entered twice or entered in error (count is too high).
- Paper records or the client's memory differs from what the app computed.

Today the only workarounds are indirect: book a retroactive session (pollutes history with a fake entry), or cancel-without-count an existing one (pollutes history with a fake cancellation). Both leave permanent wrong data in the record.

The PT wants a clean, non-destructive way to tell the app "for this period, the real count is N" or "for this period, adjust the automatic count by ±N". The override only needs to live for the current period — the next period resets automatically, because last period's discrepancy is no longer relevant.

## Goal

Let the PT set a per-client manual override that:

1. Is authored on the client profile **or** on the booking confirm popup.
2. Accepts either an **absolute** value (`10`) or a **delta** (`+1`, `-1`).
3. Is **applied uniformly** everywhere the session count surfaces in the UI and in every WhatsApp template placeholder that renders the count.
4. **Clears automatically** when the client's billing period rolls over.

## Design

### Data model

Add two optional fields to each client record:

```js
// on client object
sessionCountOverride: { type: 'absolute' | 'delta', value: number } | null
overridePeriodStart: 'YYYY-MM-DD' | null  // period.start at the time the override was set
```

- `sessionCountOverride` null or missing → no override is active.
- `overridePeriodStart` records which billing period the override belongs to. It stores `period.start` from `getClientPeriod(client, today())` at the moment the PT saves the override.

**No migration needed.** Both fields are new and optional. `DATA_VERSION` stays at 2. Pre-existing clients load with both fields absent, which is treated identically to null.

### Parser

Central helper in `utils.js`:

```js
// Parse the PT's raw input (what he typed in the override field)
// Returns null for empty/invalid/no-op inputs so the caller can clear the override.
export const parseSessionCountOverride = (raw) => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  // Delta: explicit sign + digits
  const delta = /^([+-])(\d+)$/.exec(s);
  if (delta) {
    const value = (delta[1] === '-' ? -1 : 1) * Number(delta[2]);
    if (value === 0) return null;  // +0 / -0 is a no-op
    return { type: 'delta', value };
  }

  // Absolute: digits only, non-negative integer
  const abs = /^(\d+)$/.exec(s);
  if (abs) {
    return { type: 'absolute', value: Number(abs[1]) };
  }

  return null;  // junk → reject, caller keeps previous valid value
};
```

Rules covered:
- `""`, whitespace → `null`
- `"10"` → `{ type: 'absolute', value: 10 }`
- `"0"` → `{ type: 'absolute', value: 0 }` (valid — PT can say "zero")
- `"+1"` / `"-1"` / `"+14"` → delta
- `"+0"` / `"-0"` → `null` (no-op)
- `"-5"` by itself → delta -5 (there is no "negative absolute" concept — that's fine, it's meaningless for a count)
- `"1.5"`, `"abc"`, `"1a"` → `null` (rejected)

### Effective-count helper

Also in `utils.js`:

```js
// Compute the session count to display/send, taking any active override into account.
// Returns the override if its period matches the session's period; otherwise the auto count.
export const getEffectiveSessionCount = (client, session, sessions) => {
  const period = getClientPeriod(client, session.date);
  const auto = getSessionOrdinal(sessions, session.id, session.clientId, period.start, period.end);

  const override = client && client.sessionCountOverride;
  const overridePeriod = client && client.overridePeriodStart;
  if (!override || overridePeriod !== period.start) return { auto, effective: auto, override: null };

  const effective = override.type === 'absolute' ? override.value : Math.max(0, auto + override.value);
  return { auto, effective, override };
};
```

- Returns both `auto` and `effective` so UI can render `12 → 13`.
- Guards against negative effective values (`Math.max(0, …)`) in case auto count is 1 and delta is -5.
- Also returns the raw `override` object so UI can style differently when an override is active.

For *client-scoped* displays (client card, period summary) where there's no specific session yet, a sibling helper computes the count as of today:

```js
export const getEffectiveClientCount = (client, sessions) => {
  const period = getClientPeriod(client, today());
  const auto = getPeriodSessionCount(sessions, client.id, period.start, period.end);
  const override = client && client.sessionCountOverride;
  const overridePeriod = client && client.overridePeriodStart;
  if (!override || overridePeriod !== period.start) return { auto, effective: auto, override: null };
  const effective = override.type === 'absolute' ? override.value : Math.max(0, auto + override.value);
  return { auto, effective, override };
};
```

### Period rollover

No migration, no cleanup job. When the period rolls over, `period.start` changes and no longer matches the stored `overridePeriodStart`. The display logic treats the override as inactive. The stale data sits in localStorage harmlessly. If the PT re-opens the override field, it renders as empty; saving a new value simply overwrites. Clearing the field writes `null` and removes `overridePeriodStart`.

Rationale: the PT decided overrides are period-scoped. Carrying `+1` across months would silently inflate the next month's count. Absolute values are even more dangerous across periods. Per-period auto-expiry is the safe default.

### WhatsApp rendering

In `utils.js`, `fillTemplate` switches from `getSessionOrdinal(...)` to `getEffectiveSessionCount(client, session, sessions).effective`:

```js
const fillTemplate = (template, client, session, sessions) => {
  const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
  const period = getClientPeriod(client, session.date);
  const { effective } = sessions
    ? getEffectiveSessionCount(client, session, sessions)
    : { effective: '' };
  return template
    .replace(/\{name\}/g, friendly(client))
    // ... other placeholders unchanged
    .replace(/\{number\}/g, String(effective))
    .replace(/\{periodEnd\}/g, formatDateLong(period.end));
};
```

The `{number}` placeholder is the only one affected. This applies to:
- Booking confirmation (en + ar templates, both default and user-customized)
- Reminder (en + ar templates, both default and user-customized)
- Any future template that uses `{number}`

The message body itself contains a single number (the effective one). No `12 → 13` in the WhatsApp text — the dual display is strictly an in-app UI pattern.

### UI — display format (everywhere the period count appears)

The override is period-scoped, so it applies only to UI that shows the **current-period** count — NOT the all-time count on the client list card (`Clients.jsx:41,137`, which filters by `clientId` only and is unrelated to billing periods). That all-time number stays as-is.

Locations that currently render a per-period session count:
- `Dashboard.jsx:112`, `:208` — session card in expanded and compact view (per-session ordinal via `getSessionOrdinal`)
- `Schedule.jsx:135` — session card in day view
- `Sessions.jsx:80` — session list row
- `Clients.jsx` client edit form — period summary (auto count for the current period)
- Booking confirm popup (new, via this spec)

At each session-card site, replace the single-number render with:

```jsx
// pseudocode — exact JSX per component
{override
  ? <span className="session-count-pair">
      <span className="count-auto">{auto}</span>
      <span className="count-arrow">→</span>
      <span className="count-effective">{effective}</span>
    </span>
  : <span className="count-auto-solo">{auto}</span>
}
```

Styling (in `styles.css`):

- `.count-auto` — base color `var(--t2)` (bumped up from today's `--t3`-ish dimness; the PT said the current default is too dim to read). Medium weight.
- `.count-arrow` — accent blue `#2563EB` (light) / `#60A5FA` (dark), small size, 0.5em horizontal margin.
- `.count-effective` — accent blue, bold, slightly larger (1.05em). Optional subtle pill background (`background: rgba(37,99,235,0.12); padding: 0 6px; border-radius: 6px`) for extra emphasis.
- `.count-auto-solo` — same visibility bump as `.count-auto` (base `var(--t2)`). This applies to every client card whether or not they have an override, so the whole app's count readability improves.

**Always show both numbers.** No dot-marker fallback in tight spaces. When the container is narrow, font size scales down but both values stay visible (`font-size: 0.85em` for compact views).

### UI — client profile edit form

Inside the existing client edit modal (`Clients.jsx`), add a single `<input>` in the billing-period section, placed inline next to the existing count summary:

```jsx
<div className="field-row period-override-row">
  <span className="period-count-preview">
    {override
      ? <>Auto <strong>{auto}</strong> → <strong className="accent">{effective}</strong></>
      : <>Auto <strong>{auto}</strong></>
    }
  </span>
  <input
    type="text"
    inputMode="text"
    className="override-input"
    placeholder="±"
    value={draftOverride}
    onChange={e => setDraftOverride(e.target.value)}
    onBlur={commitOverride}
    onTouchStart={startLongPress}
    onTouchEnd={cancelLongPress}
    onContextMenu={e => { e.preventDefault(); showOverrideHelp(); }}
  />
</div>
```

- No label row, no hint text below the field (per Pierre's simplification — the input plus the live preview is enough).
- Long-press the input (500ms hold) → shows a small modal with parsing rules: "Type a number like `10` to set the count directly. Type `+1` or `-1` to adjust. Leave empty to use the automatic count."
- Desktop equivalent: right-click (contextmenu) also opens the help popup.
- On blur (and on modal save), parse the draft. If parse result is null AND field is non-empty, revert the field to the previous valid value (prevent typo wipeouts). If parse result is null AND field IS empty, clear both `sessionCountOverride` and `overridePeriodStart`. Otherwise store the parsed object + current `period.start`.

### UI — booking confirm popup

The confirm popup that appears after saving a session (`Schedule.jsx:~329`, the modal triggered by `setConfirmMsg`) gets the same preview + input combo:

```
Session saved. Confirm details:
  [session summary already there]

  Count:  Auto 12 → 13   [±input]   ✎
  [Send WhatsApp]  [Close]
```

- The `✎` (edit pencil) toggles the input between read-only display and editable state. Tap to edit inline.
- Editing here writes back to the client record exactly like the client-profile form does. Same `sessionCountOverride` + `overridePeriodStart` fields. No separate "per-booking override" concept.
- "Send WhatsApp" always uses the current effective value (re-reads from state so last-second edits are respected).
- Long-press on the input shows the same help popup.

### Long-press help popup

Shared component (reuses the existing `Modal.jsx` or a lightweight inline tooltip — implementation chooses). Content (i18n'd):

- **en:**
  > **Manual count override**
  > Type a whole number (`10`) to set the count directly for this period.
  > Type `+1` or `-1` (or any `+N` / `-N`) to adjust the automatic count.
  > Leave empty to use the automatic count.
  > The override clears when the next billing period starts.

- **ar:** translated equivalent.

Long-press detection: `touchstart` starts a 500ms timer; `touchend` / `touchmove` cancels. On trigger, show the popup and fire `haptic()` for feedback (consistent with the debug-panel long-press pattern).

### Reducer actions

Use the existing `EDIT_CLIENT` action — it already merges partial fields. No new action needed. Both `sessionCountOverride` and `overridePeriodStart` are updated together in a single dispatch:

```js
dispatch({
  type: 'EDIT_CLIENT',
  payload: { id: client.id, sessionCountOverride: parsed, overridePeriodStart: parsed ? period.start : null }
});
```

The reducer wrapper stamps `_modified` on the client record, which makes the v2.6 per-record merge preserve the override correctly across devices.

### i18n keys

Add to `src/i18n.js` (both `en` and `ar`):

- `overrideHelp.title` → "Manual count override" / "تعديل يدوي للعدد"
- `overrideHelp.body` → the multi-line text above
- `overrideClear` → "Clear" / "مسح" (button inside the long-press popup for one-tap clear)
- `countAuto` → "Auto" / "تلقائي" (prefix in the preview)
- Any other user-facing strings introduced by the feature

### What does NOT change

- Auto count logic (`getSessionOrdinal`, `getPeriodSessionCount`) — the override layers on top; the computed value stays exact.
- Billing period logic (`getClientPeriod`) — unchanged.
- Cancel-with-count / cancel-with-forgive — still work; they're orthogonal to the override.
- Sync architecture — the new fields are part of the client record and ride the existing per-record merge.
- The "Today" stat card, the session focus tags, notes, cancel prompt, action sheet.
- The `getSessionOrdinal` defensive `length + 1` fallback — stays as belt-and-braces.

## Data model

Two optional client fields. No migration. `DATA_VERSION` stays at 2.

## Sync impact

Low risk. The override fields are scalar data attached to the client record. Every write goes through `EDIT_CLIENT`, which stamps `_modified`, so the v2.6 per-record merge correctly preserves the most-recent device's override. On unstable internet, a stale push of an older override is outvoted by the PT's fresher edit.

One watch-out for QA: if mother's phone is offline for weeks, it could push an override from a stale period back to the cloud. The effective-count logic treats it as inactive (period mismatch) so it won't affect the PT's WhatsApp messages, but it would sit in storage until overwritten. Acceptable.

## Testing

Manual verification on dev server (Pierre's Android + PT's iPhone):

1. **Absolute override, same period** — client has 12 auto, set `10`, display shows `12 → 10`, booking WhatsApp says "#10".
2. **Positive delta** — set `+1`, display shows `12 → 13`, WhatsApp says "#13".
3. **Negative delta** — set `-2`, display shows `12 → 10`, WhatsApp "#10".
4. **Delta exceeding auto** — auto is 1, delta `-5`, display shows `1 → 0` (clamped), WhatsApp "#0".
5. **Zero absolute** — set `0`, display shows `12 → 0`, WhatsApp "#0".
6. **`+0` / `-0`** — field clears on save, treated as no override.
7. **Empty field saved** — override cleared, `overridePeriodStart` cleared too.
8. **Junk input** (`abc`, `1.5`) on blur — field reverts to previous valid value.
9. **Period rollover** — manually advance the clock (or wait for month boundary): override that was valid yesterday now displays as inactive; client card shows single auto value again. Stored data is inert.
10. **Custom billing period** (`periodLength: '4weeks'`, `periodStart: 2026-04-01`) — rollover at the 28-day boundary auto-expires the override correctly.
11. **Booking popup inline edit** — create a new session, tap pencil, change override, tap Send WhatsApp → message uses the new value without closing+reopening.
12. **Long-press on override input** — help popup appears after 500ms hold, haptic fires, tapping backdrop dismisses.
13. **Desktop right-click** — same help popup.
14. **RTL (Arabic)** — `12 → 13` renders with arrow direction appropriate for RTL (arrow points logically from auto to effective; use `→` but let `dir="rtl"` flip it to `←` visually, or hard-code the RTL arrow).
15. **Light + dark theme** — accent blue legible in both, auto count readable (the key complaint that prompted the visibility bump).
16. **Sync conflict** — two devices set different overrides within seconds; per-record merge keeps the later `_modified`.
17. **Cross-device stale push** — mother's phone offline for a week pushes an old override after the period rolled over; verify it doesn't affect the PT's effective count.

## Size

Moderate. Rough estimate: ~40 lines of new code in `utils.js` (parser + two helpers + template update), ~15 lines per component that displays the count (4 components × ~15 = 60), ~50 lines for the new input UI in client profile form, ~40 lines for the popup override UI in booking confirm, ~30 lines for long-press help popup + i18n, ~30 lines CSS. Total ~260 lines new + modest touch-ups.

Version bump to v2.8.

## Out of scope

- Per-session override (different override for each session of the same client) — unnecessary; period-level is enough.
- Override history / audit log — the override is transient per-period; no need to remember past overrides.
- Override on cancel-count toggle — orthogonal, unrelated.
- Bulk override (apply same delta to all clients) — not needed.
- Override expiry warning ("your override expires in 3 days") — the rollover is silent and immediate; warning would add noise.
- Showing the override value in the Clients search / filter chips — count still displays with the same `12 → 13` pattern; no new chip needed.
- Localizing numerals (Arabic-Indic digits) — all numbers stay in Western digits for consistency with the existing app.
