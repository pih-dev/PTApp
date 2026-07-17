// ─── ID Generator ───
export const genId = () => Math.random().toString(36).slice(2, 9);

// ─── Haptic Feedback ───
/** Trigger haptic feedback — silent no-op on devices that don't support it (iOS) */
export const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch(e) {} };

// ─── Elastic Overscroll ───
/** Attach rubber-band overscroll to a scrollable element. Returns cleanup function. */
export const initElasticScroll = (el) => {
  if (!el) return () => {};
  let startY = 0;
  let pulling = false;

  const onTouchStart = (e) => {
    startY = e.touches[0].clientY;
    pulling = false;
    // Kill any in-progress bounce so a new pull starts cleanly
    el.style.transition = '';
  };

  const onTouchMove = (e) => {
    const dy = e.touches[0].clientY - startY;
    const atTop = el.scrollTop <= 0 && dy > 0;
    // -1 accounts for subpixel rounding — without it, bottom bounce never triggers on some devices
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && dy < 0;

    if (atTop || atBottom) {
      const absDy = Math.abs(dy);
      const pull = Math.sign(dy) * Math.min(Math.sqrt(absDy) * 4, 120);
      el.style.transform = `translateY(${pull}px)`;
      pulling = true;
    }
  };

  const onTouchEnd = () => {
    if (pulling) {
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = 'translateY(0)';
      const cleanup = () => { el.style.transition = ''; };
      el.addEventListener('transitionend', cleanup, { once: true });
      pulling = false;
    }
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  };
};

// ─── Default country code ───
const DEFAULT_COUNTRY_CODE_KEY = 'ptapp-country-code';
export const getDefaultCountryCode = () => localStorage.getItem(DEFAULT_COUNTRY_CODE_KEY) || '961';
export const setDefaultCountryCode = (code) => localStorage.setItem(DEFAULT_COUNTRY_CODE_KEY, code.replace(/[^0-9]/g, ''));

// ─── Phone formatting ───
// Normalize phone for wa.me links: full international number, digits only
export const formatPhone = (phone) => {
  let digits = phone.replace(/[^0-9+]/g, '');
  // Remove leading +
  if (digits.startsWith('+')) digits = digits.slice(1);
  // Remove leading 00 (international dialing prefix)
  else if (digits.startsWith('00')) digits = digits.slice(2);
  // If number doesn't start with country code, prepend default
  const cc = getDefaultCountryCode();
  if (!digits.startsWith(cc)) digits = cc + digits;
  return digits;
};

// Strip to digits only (no +, no leading zeros from country code prefix "00")
const stripToDigits = (phone) => phone.replace(/[^0-9]/g, '');

// Check if two phone numbers match regardless of format
// Handles: +96170000000, 0096170000000, 70000000
export const phoneMatchesQuery = (storedPhone, query) => {
  const stored = stripToDigits(storedPhone);
  const q = stripToDigits(query);
  if (!q) return false;
  return stored.endsWith(q) || q.endsWith(stored);
};

// ─── Session Types ───
// v2.9.5 (2026-05-02): Custom renamed to Endurance per PT — he frames the slot as
// "Strength Endurance", a complement to Strength rather than a generic catch-all. The
// type's color/emoji and tag list (anatomical: Chest, Back, Shoulders, Bi, Tri, Legs,
// Core, Glutes, Full Body) intentionally mirror Strength so the same body parts can be
// logged under either modality. Unknown-type fallback lives in getSessionType below
// (v2.10.1 — replaced the old positional `|| SESSION_TYPES[5]` copies).
export const SESSION_TYPES = [
  { label: 'Strength', color: '#6366F1', emoji: '💪' },
  { label: 'Cardio', color: '#3B82F6', emoji: '🏃' },
  { label: 'Flexibility', color: '#8B5CF6', emoji: '🧘' },
  { label: 'HIIT', color: '#F59E0B', emoji: '⚡' },
  { label: 'Recovery', color: '#10B981', emoji: '🧊' },
  { label: 'Endurance', color: '#6B7280', emoji: '🎯' },
];

// Resolve a session's type entry with ONE owned fallback (last entry = Endurance,
// the former catch-all). v2.10.1: replaces seven copy-pasted `|| SESSION_TYPES[5]`
// call sites — positional fallbacks silently shift meaning when the array changes
// (the "per-feature author-site drift" trap).
export const getSessionType = (label) =>
  SESSION_TYPES.find(s => s.label === label) || SESSION_TYPES[SESSION_TYPES.length - 1];

// ─── Focus Tags (per session type) ───
// Tappable tags for recording what was done during a session.
// Notes field handles anything not covered here; parseable later for weights/reps.
//
// v2.9.5 (2026-05-02): 'Arms' split into 'Bi' (biceps) and 'Tri' (triceps). PT wanted
// finer granularity — most sessions train one head, not both. The two new tags are
// independent (a session that genuinely trains both adds both). History migration in
// migrateData v3→v4 alternates Bi/Tri per-client chronologically (cancelled sessions
// counted, per Pierre's 2026-05-02 instruction).
export const FOCUS_TAGS = {
  Strength:    ['Chest', 'Back', 'Shoulders', 'Bi', 'Tri', 'Legs', 'Core', 'Glutes', 'Full Body'],
  Cardio:      ['Running', 'Cycling', 'Rowing', 'Swimming', 'Jump Rope', 'Stairs'],
  Flexibility: ['Stretching', 'Yoga', 'Mobility', 'Foam Rolling'],
  HIIT:        ['Upper Body', 'Lower Body', 'Full Body', 'Core', 'Tabata', 'Circuit'],
  Recovery:    ['Foam Rolling', 'Stretching', 'Ice Bath', 'Light Cardio', 'Massage'],
  Endurance:   ['Chest', 'Back', 'Shoulders', 'Bi', 'Tri', 'Legs', 'Core', 'Glutes', 'Full Body'],
};

// Resolve a session type's focus-tag list. v2.10.1: the four inline call sites used
// `FOCUS_TAGS[type] || FOCUS_TAGS.Custom`, but the 'Custom' key was renamed 'Endurance'
// in v2.9.5 — the fallback had been `undefined` ever since, so any unmapped type
// (e.g. a record merged in from an old device) made `tags.map(...)` white-screen the
// tab. One helper owns the fallback now; an unknown type just renders zero tags.
export const getFocusTags = (type) => FOCUS_TAGS[type] || [];

// ─── Session Statuses ───
// Colors/backgrounds are theme-independent; labels come from i18n when lang is provided
const STATUS_STYLES = {
  scheduled: { color: '#3B82F6', bg: '#EFF6FF' },
  confirmed: { color: '#10B981', bg: '#ECFDF5' },
  completed: { color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2' },
};
const STATUS_FALLBACK = { scheduled: 'Scheduled', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
// Use this to get translated status labels — pass lang from component
export const getStatus = (status, lang, tFn) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.scheduled;
  return { ...s, label: tFn ? tFn(lang, status) : STATUS_FALLBACK[status] };
};

// ─── Time slots ───
export const TIMES = [];
for (let h = 5; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

// ─── Duration options ───
export const DURATIONS = [30, 45, 60, 75, 90, 120];

// ─── Time conflict helpers ───
// Convert "HH:MM" to minutes since midnight
export const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Build a map of time slot → occupying sessions for a given date
// Returns { "09:30": [{ clientName, type }], "09:45": [...], ... }
export const getOccupiedSlots = (sessions, clients, date) => {
  const occupied = {};
  sessions
    .filter(s => s.date === date && s.status !== 'cancelled')
    .forEach(s => {
      const startMin = timeToMinutes(s.time);
      const endMin = startMin + (s.duration || 45);
      const clientName = clients.find(c => c.id === s.clientId)?.name || 'Unknown';
      // Mark each 15-min slot this session spans
      for (let m = startMin; m < endMin; m += 15) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const slot = `${hh}:${mm}`;
        if (!occupied[slot]) occupied[slot] = [];
        occupied[slot].push({ clientName, type: s.type });
      }
    });
  return occupied;
};

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

// True if `clientId` already has a non-cancelled session at this exact date+time.
// Two different clients sharing a slot is intentional (group training) and is NOT
// a conflict — only a same-client duplicate at the same slot counts.
export const hasClientSlotConflict = (sessions, clientId, date, time) =>
  sessions.some(s => s.clientId === clientId && s.date === date && s.time === time && s.status !== 'cancelled');

// ─── Session counting ───
// Count sessions for a client in a given month (YYYY-MM) — used for calendar month views
// Includes: scheduled, confirmed, completed, and cancelled-but-counted sessions
export const getMonthlySessionCount = (sessions, clientId, month) => {
  return sessions.filter(s =>
    s.clientId === clientId &&
    s.date.startsWith(month) &&
    (s.status !== 'cancelled' || s.cancelCounted)
  ).length;
};

// Count sessions for a client within a date range (billing period).
// periodEnd can be null for open-ended contract packages — treat as "no upper bound".
// ─── Per-client counted-session index (v2.10.2, P2) ───
// Every rendered card used to filter+sort ALL of state.sessions to compute one ordinal —
// O(n²) across a list render, multi-second jank territory at a few thousand career sessions.
// Instead: group + sort counted sessions per client ONCE per sessions array. The cache is
// keyed on the array reference itself (WeakMap), which is safe because the reducer is
// immutable — any session mutation produces a new array. Hand-built arrays at call sites
// (e.g. `[...state.sessions, preview]`) simply miss the cache and pay one rebuild, which
// is the pre-v2.10.2 cost for a single card.
const countedSessionsCache = new WeakMap();
export const getClientCountedSessions = (sessions, clientId) => {
  let byClient = countedSessionsCache.get(sessions);
  if (!byClient) {
    byClient = new Map();
    for (const s of sessions) {
      if (s.status === 'cancelled' && !s.cancelCounted) continue; // forgiven cancels don't count
      let arr = byClient.get(s.clientId);
      if (!arr) byClient.set(s.clientId, (arr = []));
      arr.push(s);
    }
    for (const arr of byClient.values()) {
      arr.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    }
    countedSessionsCache.set(sessions, byClient);
  }
  return byClient.get(clientId) || [];
};

export const getPeriodSessionCount = (sessions, clientId, periodStart, periodEnd) => {
  return getClientCountedSessions(sessions, clientId).filter(s =>
    s.date >= periodStart &&
    (periodEnd == null || s.date <= periodEnd)
  ).length;
};

// Sequential position of a session within its client's billing period (1st, 2nd, 3rd...).
// periodEnd can be null for open-ended contract packages. Defensive fallback: if the session
// isn't found in the filtered list (stale array during ADD_SESSION), return length + 1 to
// prevent "Session #0" from leaking into WhatsApp messages.
export const getSessionOrdinal = (sessions, sessionId, clientId, periodStart, periodEnd) => {
  const periodSessions = getClientCountedSessions(sessions, clientId).filter(s =>
    s.date >= periodStart &&
    (periodEnd == null || s.date <= periodEnd));
  const idx = periodSessions.findIndex(s => s.id === sessionId);
  return idx === -1 ? periodSessions.length + 1 : idx + 1;
};

// ─── Sliding window math (v2.9) ───
// Generalized anchored-period calculator. Replaces the inline month/week/day logic
// in the old getClientPeriod. Returns {start, end} for the window containing refDate,
// anchored at anchorDateStr and stepped by `value` units.
//
// Month: anchored day-of-month, day clamped for short months (Jan 31 anchor in Feb → Feb 28/29).
// Week : fixed 7 × value days from anchor.
// Day  : fixed value days from anchor.
export const computeSlidingWindow = (anchorDateStr, unit, value, refDate) => {
  const anchor = new Date(anchorDateStr + 'T00:00:00');
  const ref = refDate instanceof Date ? refDate : new Date(refDate + 'T00:00:00');

  if (unit === 'month') {
    const day = anchor.getDate();
    const clamp = (y, m) => Math.min(day, new Date(y, m + 1, 0).getDate());
    // Find monthsDiff from anchor to ref
    const monthsDiff = (ref.getFullYear() - anchor.getFullYear()) * 12
                     + (ref.getMonth() - anchor.getMonth());
    // Number of full N-month steps elapsed since anchor
    let steps = Math.floor(monthsDiff / value);
    // Candidate start: anchor + steps*value months, clamped day.
    // Build by day-1-of-month + setDate — never mutate month on a clamped date,
    // because setMonth on day 31 → Feb rolls over into March (Date overflow gotcha).
    const buildStart = (s) => {
      const d = new Date(
        anchor.getFullYear(),
        anchor.getMonth() + s * value,
        1
      );
      d.setDate(clamp(d.getFullYear(), d.getMonth()));
      return d;
    };
    let candStart = buildStart(steps);
    // If ref is before candidate start within its month, we're actually in the previous step
    if (ref < candStart) {
      steps -= 1;
      candStart = buildStart(steps);
    }
    const nextStart = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + (steps + 1) * value,
      1
    );
    nextStart.setDate(clamp(nextStart.getFullYear(), nextStart.getMonth()));
    // Use calendar-day subtraction (not ms) so Beirut DST fall-back doesn't land
    // the prior midnight at 23:00 of two days earlier.
    const windowEnd = new Date(
      nextStart.getFullYear(),
      nextStart.getMonth(),
      nextStart.getDate() - 1
    );
    return { start: localDateStr(candStart), end: localDateStr(windowEnd) };
  }

  // 'week' or 'day' — fixed-length windows in days.
  // Use Date.UTC for day-index math so DST transitions (Beirut spring-forward
  // in late March, fall-back in late October) don't skew the floor() by one day.
  const days = unit === 'week' ? value * 7 : value;
  const anchorEpoch = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const refEpoch    = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const diffDays = Math.floor((refEpoch - anchorEpoch) / 86400000);
  const idx = Math.floor(diffDays / days);
  // Build start/end as calendar-day offsets, not ms offsets, for the same reason.
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + idx * days
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + days - 1
  );
  return { start: localDateStr(start), end: localDateStr(end) };
};

// Maps v2 periodLength enum to v3 {unit, value} pair. Used by migration only.
export const parseLegacyPeriodLength = (legacyValue) => {
  switch (legacyValue) {
    case '1month':  return { unit: 'month', value: 1 };
    case '4weeks':  return { unit: 'week',  value: 4 };
    case '2weeks':  return { unit: 'week',  value: 2 };
    case '1week':   return { unit: 'week',  value: 1 };
    default:        return { unit: 'month', value: 1 };  // '' or undefined → calendar month
  }
};

// Returns the current open package (last with end: null) or a synthetic default.
// Defensive — if called on an un-migrated client (packages missing/empty), returns
// a default-shape package so downstream math doesn't crash. Migration (v2→v3) runs
// at loadData, so in practice this fallback is only hit for literal edge cases.
export const getCurrentPackage = (client) => {
  const pkgs = client && client.packages;
  if (pkgs && pkgs.length > 0) {
    const last = pkgs[pkgs.length - 1];
    if (last && last.end == null) return last;
  }
  return {
    id: null,
    start: today(),
    end: null,
    periodUnit: 'month',
    periodValue: 1,
    contractSize: null,
    sessionCountOverride: null,
    notes: '',
    closedAt: null,
    closedBy: null,
  };
};

// Packages that cover at least one calendar day. Live data contains "zero-day artifacts"
// (end = start − 1) from RENEW_PACKAGE accepting start <= oldStart (May 11 decision:
// renewal flow left as-is) — those must never win date resolution or leak their overrides.
const validPackages = (client) =>
  ((client && client.packages) || []).filter(p => p.end == null || p.end >= p.start);

// Day arithmetic on YYYY-MM-DD strings in LOCAL time (never toISOString — UTC trap).
const addDaysStr = (dateStr, delta) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
};

// Resolve the package whose date range contains `dateStr` (v2.10.2, P1).
// Containment first, walking newest → oldest so the newest package wins when closed
// ranges overlap (live data has re-done renewals sharing the same start). A date no
// package contains (pre-adoption sessions, renewal gaps) attaches to the package whose
// era it LEADS INTO (oldest package starting after it); dates after every package
// fall back to the last package.
export const getPackageForDate = (client, dateStr) => {
  const pkgs = validPackages(client);
  if (pkgs.length === 0) return getCurrentPackage(client); // un-migrated edge case → synthetic default
  for (let i = pkgs.length - 1; i >= 0; i--) {
    const p = pkgs[i];
    if (dateStr >= p.start && (p.end == null || dateStr <= p.end)) return p;
  }
  return pkgs.find(p => p.start > dateStr) || pkgs[pkgs.length - 1];
};

// {pkg, period} for counting a session dated `dateStr`. For dates inside the resolved
// package this is just getEffectivePeriod. For dates BEFORE the resolved package's start:
//   sliding  → backward-extrapolated window (pre-v2.9 behavior, computeSlidingWindow
//              handles refDate < anchor natively)
//   contract → synthetic "pre-era" bucket [prev valid package end + 1 .. start − 1]
//              (floored at the epoch when no previous package exists). Contract periods
//              are fixed ranges — there is nothing to extrapolate, and reusing the
//              package's own range would exclude the session and resurrect the
//              findIndex −1 fallback this fix removes.
// The synthetic bucket's start never matches an override's periodStart, so overrides
// can't leak into the pre-era — applyOverride goes inactive by construction.
export const resolvePackagePeriod = (client, dateStr) => {
  const pkg = getPackageForDate(client, dateStr);
  if (dateStr >= pkg.start || pkg.contractSize == null) {
    return { pkg, period: getEffectivePeriod(pkg, dateStr) };
  }
  const pkgs = validPackages(client);
  const idx = pkgs.indexOf(pkg);
  const prev = idx > 0 ? pkgs[idx - 1] : null;
  return {
    pkg,
    period: {
      start: prev && prev.end != null ? addDaysStr(prev.end, 1) : '0000-01-01',
      end: addDaysStr(pkg.start, -1),
    },
  };
};

// Returns {start, end} window used for session counting/display.
//   Open contract package   → { start: pkg.start, end: null }      (open-ended until renewal)
//   Closed contract package → { start: pkg.start, end: pkg.end }   (capped at renewal)
//   No-contract package     → sliding time window anchored at pkg.start, stepped by unit*value;
//                             capped at pkg.end for closed packages so a window straddling a
//                             renewal can't swallow the next package's sessions.
export const getEffectivePeriod = (pkg, refDateStr = today()) => {
  if (!pkg) return { start: refDateStr, end: null };
  if (pkg.contractSize != null) {
    return { start: pkg.start, end: pkg.end != null ? pkg.end : null };
  }
  const win = computeSlidingWindow(pkg.start, pkg.periodUnit, pkg.periodValue, refDateStr);
  if (pkg.end != null && win.end > pkg.end) win.end = pkg.end;
  return win;
};

// ─── Session count override (v2.8) ───
// PT can manually override the session count per client for the current billing period.
// Motivation: when the app's auto count disagrees with his paper records or the client's
// memory, the only pre-v2.8 workaround was to book a fake retroactive session or cancel
// one "without counting" — both pollute history. The override is clean and period-scoped
// so it can't silently inflate next period's count.

// Parse the raw input from the override text field.
// Returns null for empty/invalid/no-op inputs so the caller can clear the override.
//   ""           → null
//   "10"         → { type: 'absolute', value: 10 }    (exact number to report)
//   "0"          → { type: 'absolute', value: 0 }
//   "+1" / "-3"  → { type: 'delta', value: ±N }        (adjust auto count by ±N)
//   "+0" / "-0"  → null                                 (no-op)
//   "1.5" / junk → null                                 (rejected)
export const parseSessionCountOverride = (raw) => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  // Delta: explicit sign + digits (e.g. "+1", "-3", "+14")
  const delta = /^([+-])(\d+)$/.exec(s);
  if (delta) {
    const value = (delta[1] === '-' ? -1 : 1) * Number(delta[2]);
    if (value === 0) return null;
    return { type: 'delta', value };
  }

  // Absolute: digits only, non-negative integer (e.g. "0", "10", "14")
  const abs = /^(\d+)$/.exec(s);
  if (abs) return { type: 'absolute', value: Number(abs[1]) };

  return null;
};

// The single source of truth for override math. "Active override" = override.periodStart
// matches the given period start (same semantic as v2.8 — works for both sliding-window
// and contract packages). Returns { auto, effective, override }.
// v2.10.1: extracted — this expression previously existed in THREE copies (both count
// helpers below + the Clients form live preview), the exact drift class behind the
// v2.9.6 "same number, two semantics" trap.
export const applyOverride = (auto, override, periodStart) => {
  if (!override || override.periodStart !== periodStart) {
    return { auto, effective: auto, override: null };
  }
  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};

// Inverse of parseSessionCountOverride for pre-filling the override input: active
// override → "10" / "+2" / "-1"; stale or absent → "". v2.10.1: extracted from two
// character-identical copies in Clients.jsx openEdit and Schedule.jsx openOverrideEdit
// (parse and format are an inverse pair — they must live next to each other).
export const formatOverrideDraft = (pkg, period) => {
  const ov = pkg.sessionCountOverride;
  if (!ov || ov.periodStart !== period.start) return '';
  return ov.type === 'delta'
    ? (ov.value >= 0 ? '+' : '') + ov.value
    : String(ov.value);
};

// Compute auto + effective count for a specific session within the package CONTAINING the
// session's date (v2.10.2, P1 — was getCurrentPackage, which gave every pre-renewal session
// of a contract client the same "current count + 1" ordinal via the findIndex −1 fallback).
// The resolved package's own sessionCountOverride applies — overrides are period-scoped,
// so a current-package override can never rewrite history and vice versa.
// Returns { auto, effective, override } — preserved shape for backward compat.
export const getEffectiveSessionCount = (client, session, sessions) => {
  const { pkg, period } = resolvePackagePeriod(client, session.date);
  const auto = getSessionOrdinal(sessions, session.id, session.clientId, period.start, period.end);
  return applyOverride(auto, pkg.sessionCountOverride, period.start);
};

// Compute auto + effective count for a client (not anchored to a specific session) as of refDate.
// Used by client-scoped displays like booking chips and renewal-due detection.
export const getEffectiveClientCount = (client, sessions, refDateStr = today()) => {
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, refDateStr);
  const auto = getPeriodSessionCount(sessions, client.id, period.start, period.end);
  return applyOverride(auto, pkg.sessionCountOverride, period.start);
};

// True when the client's current package has a contract and the effective count has reached it.
// THE renewal-due rule — every UI surface reads it via getRenewalDueMap below; if the rule
// ever changes (e.g. "due soon at N−1"), this is the only place to touch.
export const isRenewalDue = (client, sessions) => {
  const pkg = getCurrentPackage(client);
  if (!pkg || pkg.contractSize == null) return false;
  const { effective } = getEffectiveClientCount(client, sessions);
  return effective >= pkg.contractSize;
};

// ─── Renewal-due selector (v2.10.3, P5) ───
// One source of truth for renewal state across tabs. Previously computed three ways in
// three places (Schedule memoized Set, Dashboard filter, Clients per-card) — the drift
// class where a rule change lands in one tab and silently not the others.
// Map<clientId, { due, effective, auto, override, contractSize, pkg }> — only contract
// clients appear (sliding clients are never due; map.get() returns undefined for them).
// Memoized on the (clients, sessions) array pair, same WeakMap-on-reference pattern as
// getClientCountedSessions: the reducer is immutable, so array identity = data identity.
const renewalMapCache = new WeakMap();
export const getRenewalDueMap = (clients, sessions) => {
  let bySessions = renewalMapCache.get(clients);
  if (!bySessions) {
    bySessions = new WeakMap();
    renewalMapCache.set(clients, bySessions);
  }
  let map = bySessions.get(sessions);
  if (!map) {
    map = new Map();
    for (const c of clients) {
      const pkg = getCurrentPackage(c);
      if (pkg.contractSize == null) continue;
      const { auto, effective, override } = getEffectiveClientCount(c, sessions);
      map.set(c.id, {
        due: isRenewalDue(c, sessions), // the rule lives in isRenewalDue, not here
        auto, effective, override,
        contractSize: pkg.contractSize,
        pkg,
      });
    }
    bySessions.set(sessions, map);
  }
  return map;
};

// ─── Date helpers ───
// NEVER use toISOString() for display dates — it converts to UTC, so midnight in
// Beirut (UTC+3) becomes the previous day. All date→string must use local time.
export const today = () => localDateStr(new Date());

// Convert a Date object to YYYY-MM-DD using LOCAL time (not UTC)
export const localDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Convert a Date object to YYYY-MM using LOCAL time
export const localMonthStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const formatDate = (dateStr, lang = 'en') => {
  const d = new Date(dateStr + 'T00:00:00');
  const locale = lang === 'ar' ? 'ar-LB' : 'en-US';
  return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
};

export const formatDateLong = (dateStr, lang = 'en') => {
  const d = new Date(dateStr + 'T00:00:00');
  const locale = lang === 'ar' ? 'ar-LB' : 'en-US';
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

// Age in whole years on a given local date (both args YYYY-MM-DD). Used by the
// evaluation system — norm-chart lookups need age AT THE EVAL DATE, not today,
// so editing an old eval re-scores against the age the client was back then.
export const ageAtDate = (birthdate, onDate) => {
  const b = new Date(birthdate + 'T00:00:00');
  const d = new Date(onDate + 'T00:00:00');
  let age = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--;
  return age;
};

// ─── Data versioning & migration ───
// Increment DATA_VERSION when the schema changes. Add a migration function
// for each version bump. Existing data is NEVER discarded — only migrated forward.
const DATA_VERSION = 6;

// Capitalize each word: "pierre ghorra" → "Pierre Ghorra"
export const capitalizeName = (name) =>
  name.replace(/\b\w/g, c => c.toUpperCase());

// v2.13: exported (was module-private) so sanity-programs.mjs part 4 can assert the
// v5→v6 seeding step directly, same import style as reducer/mergeData/mergeBackup below.
// No behavior change — visibility only.
export function migrateData(data) {
  let v = data._dataVersion || 0;

  // v1 → v2: Add nickname field (first name), capitalize existing names
  if (v < 2) {
    (data.clients || []).forEach(c => {
      // Capitalize name: "pierre ghorra" → "Pierre Ghorra"
      c.name = capitalizeName(c.name);
      // Set nickname to first name if not already set
      if (!c.nickname) {
        c.nickname = c.name.split(' ')[0];
      }
    });
    v = 2;
  }

  // v2 → v3: Add packages[] to every client; move periodStart/periodLength/sessionCountOverride/overridePeriodStart
  // into a synthesized first package. Initialize state.auditLog. Non-destructive: no session data touched.
  // See docs/superpowers/specs/2026-04-20-session-contracts-design.md §7 for rationale.
  if (v < 3) {
    const sessions = data.sessions || [];
    data.auditLog = data.auditLog || [];

    (data.clients || []).forEach(c => {
      if (c.packages && c.packages.length > 0) return;  // idempotent — already migrated

      // Earliest session date for this client (anchor fallback if no periodStart set)
      const clientSessions = sessions
        .filter(s => s.clientId === c.id)
        .map(s => s.date)
        .sort();
      const firstSessionDate = clientSessions[0];

      // Pick pkgStart so computeSlidingWindow reproduces v2's current-period start exactly.
      // v2 had three branches in getClientPeriod (pre-v2.9 utils.js:182-220):
      //   1. periodStart set  → anchor at periodStart
      //   2. periodLength set, no periodStart  → anchor at today() (PT forgot to pick a date)
      //   3. neither set  → CALENDAR MONTH (1st to last), not sliding — special case
      // Branch 3 is the default (most live clients). Anchoring at firstSessionDate is wrong:
      // it produces a sliding window offset by the first-session day-of-month, so current-period
      // start on 2026-04-21 becomes e.g. 2026-04-02 instead of v2's 2026-04-01. Any override
      // stamped with v2's 2026-04-01 anchor then fails the match and is silently dropped
      // (observed Apr 21 on live data — Pierre + Elie's active deltas lost).
      // Fix: for branch 3, anchor at 1st of earliest session's month (or 1st of current month
      // if no sessions). computeSlidingWindow with day-of-month=1 produces calendar-month
      // periods going both directions, matching v2 exactly.
      const { unit, value } = parseLegacyPeriodLength(c.periodLength);
      let pkgStart;
      if (c.periodStart) {
        pkgStart = c.periodStart;
      } else if (c.periodLength) {
        pkgStart = today();
      } else {
        const earliest = new Date((firstSessionDate || today()) + 'T00:00:00');
        pkgStart = localDateStr(new Date(earliest.getFullYear(), earliest.getMonth(), 1));
      }

      // Override is active iff its stamp equals the v2 current-period start. With the correct
      // pkgStart above, the v2 current-period start == computeSlidingWindow(pkgStart, ..., today()).start
      // for all three branches. Stale overrides fail this check and are dropped (were inert in v2 too).
      let override = null;
      if (c.sessionCountOverride && c.overridePeriodStart) {
        const currentWindow = computeSlidingWindow(pkgStart, unit, value, today());
        if (c.overridePeriodStart === currentWindow.start) {
          override = { ...c.sessionCountOverride, periodStart: currentWindow.start };
        }
      }

      const pkg = {
        id: 'pkg_' + genId(),
        start: pkgStart,
        end: null,
        periodUnit: unit,
        periodValue: value,
        contractSize: null,
        sessionCountOverride: override,
        notes: '',
        closedAt: null,
        closedBy: null,
      };
      c.packages = [pkg];

      // Remove deprecated root fields
      delete c.periodStart;
      delete c.periodLength;
      delete c.sessionCountOverride;
      delete c.overridePeriodStart;

      // Seed audit log with a creation entry
      data.auditLog.push({
        id: 'log_' + genId(),
        ts: new Date().toISOString(),
        clientId: c.id,
        clientName: c.name,
        event: 'package_created',
        packageId: pkg.id,
        newPackageId: pkg.id,
        before: null,
        after: pkg,
        trigger: { reason: 'migration v2→v3' },
      });
    });

    v = 3;
  }

  // v3 → v4: Tag library refactor + session-type rename (2026-05-02, v2.9.5).
  //   1) FOCUS_TAGS: 'Arms' replaced by 'Bi' and 'Tri' under Strength + Endurance (formerly Custom).
  //   2) SESSION_TYPES: 'Custom' renamed to 'Endurance'.
  // History rewrite rules (per Pierre 2026-05-02):
  //   - Per-client, chronological by date+time, alternate Bi/Tri starting with Bi.
  //   - Cancelled sessions ARE counted in the alternation order (Pierre revised earlier
  //     "skip cancelled" → "count cancelled" so the sequence stays predictable to the PT
  //     even if a session falls through). This matters because alternating order matches
  //     what the PT will see if he eyeballs his old sessions in date order.
  //   - Mixed-tag sessions ('Chest','Arms' → 'Chest','Bi') replace just the 'Arms' slot.
  //   - Cancelled sessions still get their 'Arms' tag rewritten so no orphan 'Arms' tag
  //     survives in any session — the catalog no longer contains it.
  //   - session.type === 'Custom' rewritten to 'Endurance' on every session regardless of status.
  // Defensive choices:
  //   - Sort by `${date} ${time} ${id}` so same-day sessions are stable across runs.
  //   - Idempotent: running twice produces the same result (Bi/Tri don't match 'Arms', so
  //     a re-migration finds no 'Arms' tags to replace; same for 'Custom' types).
  if (v < 4) {
    const sessions = data.sessions || [];

    // Group session refs by clientId. We mutate session.focus in place — these refs are
    // shared with data.sessions, so the result propagates without reassignment.
    const byClient = {};
    for (const s of sessions) {
      const cid = s.clientId || '__orphan__';
      (byClient[cid] = byClient[cid] || []).push(s);
    }

    for (const cid in byClient) {
      // Stable chronological sort. Falsy date/time push to the end via empty-string compare.
      const clientSessions = byClient[cid].slice().sort((a, b) => {
        const aKey = `${a.date || ''} ${a.time || ''} ${a.id || ''}`;
        const bKey = `${b.date || ''} ${b.time || ''} ${b.id || ''}`;
        return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
      });

      let armsCount = 0;
      for (const s of clientSessions) {
        if (Array.isArray(s.focus) && s.focus.includes('Arms')) {
          const replacement = armsCount % 2 === 0 ? 'Bi' : 'Tri';
          s.focus = s.focus.map(tag => tag === 'Arms' ? replacement : tag);
          armsCount++;
        }
      }
    }

    // Rename session type (every session, regardless of status — type is a category label,
    // not history-sensitive like the focus tag alternation).
    for (const s of sessions) {
      if (s.type === 'Custom') s.type = 'Endurance';
    }

    v = 4;
  }

  // v4 → v5: evaluation system (v2.11). Adds top-level evaluations[] — per-client
  // fitness eval records (sessions pattern: per-record _modified, union-by-ID merge).
  // Purely additive: no client/session reshaping, nothing to rewrite.
  if (v < 5) {
    data.evaluations = data.evaluations || [];
    v = 5;
  }

  // v5 → v6: program generation (v2.13). Adds top-level programs[] — frozen
  // 6-month training plans (sessions/evaluations pattern: per-record _modified,
  // union-by-ID merge). Purely additive: nothing existing is reshaped.
  if (v < 6) {
    data.programs = data.programs || [];
    v = 6;
  }

  data.clients = data.clients || [];
  data.sessions = data.sessions || [];
  data.todos = data.todos || [];
  data.evaluations = data.evaluations || [];
  data.programs = data.programs || [];
  data.messageTemplates = data.messageTemplates || {};
  // auditLog may be absent on fresh state or data fetched from remote before v3
  data.auditLog = data.auditLog || [];
  // Ensure _lastModified exists — used for stale-push prevention (see sync fix, Apr 13 2026)
  data._lastModified = data._lastModified || new Date().toISOString();
  data._dataVersion = DATA_VERSION;
  return data;
}

// ─── localStorage persistence ───
const STORAGE_KEY = 'ptapp-data';

export const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateData(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return migrateData({ clients: [], sessions: [] });
};

// ─── Merge (sync conflict resolution) ───
// Last-write-wins merge, per-record by `_modified` timestamp. Union by ID.
// Ran after every 409 and at initial load so no record is ever blindly discarded
// by a stale-device push — bulletproofs the 3-device setup (PT iPhone, Pierre
// Android, mother iPhone) against the unstable Beirut internet. Apr 19 incident:
// Hala Mouzanar's Apr 17 session lost because a stale device overwrote remote.
const mergeById = (localArr, remoteArr) => {
  const map = new Map();
  for (const r of (remoteArr || [])) map.set(r.id, r);
  for (const l of (localArr || [])) {
    const existing = map.get(l.id);
    if (!existing) { map.set(l.id, l); continue; }
    // Prefer record with newer `_modified`. Missing timestamp = legacy record
    // = treat as "oldest" so the stamped side wins. ISO-8601 strings sort lexicographically.
    const lMod = l._modified || '';
    const eMod = existing._modified || '';
    if (lMod >= eMod) map.set(l.id, l);
  }
  return Array.from(map.values());
};

export function mergeData(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  // v2.10.1: migrate the remote blob by its OWN _dataVersion before union-merging.
  // Without this, records pushed by a device running an older cached bundle (clients
  // without packages[], 'Arms' tags, 'Custom' type) were merged in raw, then stamped
  // with Math.max(_dataVersion) below — so loadData's migrateData never touched them
  // again and they stayed broken forever. Local is always migrated already (it comes
  // from loadData or reducer state). No-op when remote is current (version gates).
  // Migrate a CLONE, not the caller's object: reconcile() in App.jsx compares the
  // merged result against its `remote` reference to decide whether to push — mutating
  // it in place would make merged look identical to "what the server has" and skip
  // the push that would upgrade the server's old-format blob.
  remote = migrateData(JSON.parse(JSON.stringify(remote)));
  const localTs = local._lastModified || '';
  const remoteTs = remote._lastModified || '';
  const preferLocal = localTs > remoteTs;
  return {
    clients: mergeById(local.clients, remote.clients),
    sessions: mergeById(local.sessions, remote.sessions),
    todos: mergeById(local.todos, remote.todos),
    // evaluations merge exactly like sessions — per-record _modified, union by ID
    evaluations: mergeById(local.evaluations, remote.evaluations),
    // programs merge exactly like evaluations — per-record _modified, union by ID
    programs: mergeById(local.programs, remote.programs),
    // auditLog entries are append-only and have IDs — union-merge like sessions/todos
    auditLog: mergeById(local.auditLog, remote.auditLog),
    // Templates don't have per-record timestamps — prefer side with newer _lastModified
    messageTemplates: preferLocal
      ? (local.messageTemplates || remote.messageTemplates || {})
      : (remote.messageTemplates || local.messageTemplates || {}),
    _dataVersion: Math.max(local._dataVersion || 0, remote._dataVersion || 0),
    _lastModified: preferLocal ? localTs : remoteTs,
  };
}

// Decides if two data blobs are equivalent enough to skip a push/replace.
// JSON compare is ~O(n) on size — fine for hundreds of records.
export function dataEquals(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
};

// ─── Reducer ───
// Base reducer handles all state transitions. Wrapped by reducer() which
// stamps _lastModified on local changes (not REPLACE_ALL from remote sync).

// Audit-log entries for an edit to a client's CURRENT package (v2.10.4, P7 — extracted
// from EDIT_CLIENT so EDIT_CURRENT_PACKAGE shares the exact same diffing; two copies of
// this logic would be the v2.9.6 drift class). Only diffs when old and new share the same
// package id (an edit, not a renewal — RENEW_PACKAGE logs its own renewal events).
// Returns [] when nothing tracked changed.
const buildPackageAuditEntries = (oldPkg, newPkg, client, stamp) => {
  const entries = [];
  if (!(oldPkg && newPkg && oldPkg.id === newPkg.id)) return entries;
  // Tracked package field changes → package_edited
  const tracked = ['start', 'periodUnit', 'periodValue', 'contractSize'];
  if (tracked.some(f => oldPkg[f] !== newPkg[f])) {
    entries.push({
      id: 'log_' + genId(),
      ts: stamp,
      clientId: client.id,
      clientName: client.name,
      event: 'package_edited',
      packageId: newPkg.id,
      newPackageId: null,
      before: oldPkg,
      after: newPkg,
      trigger: null,
    });
  }
  // Override change → override_set or override_cleared. Explicit field comparison
  // (key-order independent — JSON.stringify was fragile because override writers across
  // the codebase constructed the shape in different orders).
  const oldOv = oldPkg.sessionCountOverride;
  const newOv = newPkg.sessionCountOverride;
  const ovEqual =
    (oldOv == null && newOv == null) ||
    (oldOv != null && newOv != null
      && oldOv.type === newOv.type
      && oldOv.value === newOv.value
      && oldOv.periodStart === newOv.periodStart);
  if (!ovEqual) {
    entries.push({
      id: 'log_' + genId(),
      ts: stamp,
      clientId: client.id,
      clientName: client.name,
      event: newOv ? 'override_set' : 'override_cleared',
      packageId: newPkg.id,
      newPackageId: null,
      before: { sessionCountOverride: oldOv },
      after: { sessionCountOverride: newOv },
      trigger: null,
    });
  }
  return entries;
};

// Per-record `_modified` timestamps are stamped by each case that adds/edits
// a record — enables last-write-wins merge across multiple devices (Apr 19
// bulletproofing after the Hala Mouzanar session was lost to a sync race).
// Exported for unit testing (sanity scripts in scripts/sanity/).
export function baseReducer(state, action) {
  const now = () => new Date().toISOString();
  switch (action.type) {
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, { ...action.payload, _modified: now() }] };
    case 'EDIT_CLIENT': {
      const stamp = now();
      const oldClient = state.clients.find(c => c.id === action.payload.id);
      const newClient = { ...action.payload, _modified: stamp };
      // Audit changes to the current (last) package — only when old and new clients
      // share the same last package ID (edit, not renewal).
      const oldPkg = oldClient && oldClient.packages && oldClient.packages[oldClient.packages.length - 1];
      const newPkg = newClient.packages && newClient.packages[newClient.packages.length - 1];
      const logEntries = buildPackageAuditEntries(oldPkg, newPkg, newClient, stamp);

      return {
        ...state,
        clients: state.clients.map(c => c.id === newClient.id ? newClient : c),
        auditLog: logEntries.length
          ? [...(state.auditLog || []), ...logEntries]
          : (state.auditLog || []),
      };
    }
    case 'EDIT_CURRENT_PACKAGE': {
      // v2.10.4 (review P7): THE owner of replace-last-package writes.
      // Payload: { clientId, pkg } — pkg is the full replacement for the CURRENT (last)
      // package. Author sites used to hand-roll `[...packages.slice(0, -1), newPkg]`
      // (Clients save + Schedule commitOverride) — the v2.9.2 incident class, where one
      // site wrote the override to a location the migration deletes. The reducer reads
      // the LIVE client from state (callers pass only the id), so a stale client snapshot
      // held by an open modal can never clobber profile fields edited on another device.
      const stamp = now();
      const { clientId, pkg } = action.payload;
      const client = state.clients.find(c => c.id === clientId);
      if (!client || !pkg) return state;
      const oldPkgs = client.packages || [];
      const oldPkg = oldPkgs.length ? oldPkgs[oldPkgs.length - 1] : null;
      const packages = oldPkgs.length ? [...oldPkgs.slice(0, -1), pkg] : [pkg];
      const newClient = { ...client, packages, _modified: stamp };
      const logEntries = buildPackageAuditEntries(oldPkg, pkg, newClient, stamp);
      return {
        ...state,
        clients: state.clients.map(c => c.id === clientId ? newClient : c),
        auditLog: logEntries.length
          ? [...(state.auditLog || []), ...logEntries]
          : (state.auditLog || []),
      };
    }
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== action.payload),
        sessions: state.sessions.filter(s => s.clientId !== action.payload),
        // v2.11: a client's evaluations go with them (same rule as sessions)
        evaluations: (state.evaluations || []).filter(ev => ev.clientId !== action.payload),
        // v2.13: a client's generated programs go with them (same rule as evaluations)
        programs: (state.programs || []).filter(p => p.clientId !== action.payload),
      };
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, { ...action.payload, _modified: now() }] };
    case 'ADD_SESSIONS':
      // Batch-append N new sessions in a single dispatch (recurring generator).
      // One reducer pass → one re-render → one debounced sync push, instead of
      // N dispatches in a loop. See the "single dispatches in loops" trap.
      return { ...state, sessions: [...state.sessions, ...action.payload.map(s => ({ ...s, _modified: now() }))] };
    case 'UPDATE_SESSION':
      return { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? { ...s, ...action.payload, _modified: now() } : s) };
    case 'BATCH_COMPLETE': {
      // Mark multiple sessions as completed in a single dispatch (avoids N re-renders)
      const ids = new Set(action.payload);
      const stamp = now();
      return { ...state, sessions: state.sessions.map(s => ids.has(s.id) ? { ...s, status: 'completed', _modified: stamp } : s) };
    }
    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) };
    case 'ADD_TODO':
      return { ...state, todos: [...(state.todos || []), { ...action.payload, _modified: now() }] };
    case 'SET_TEMPLATES':
      return { ...state, messageTemplates: action.payload };
    case 'EDIT_TODO':
      return { ...state, todos: (state.todos || []).map(todo => todo.id === action.payload.id ? { ...todo, text: action.payload.text, _modified: now() } : todo) };
    case 'TOGGLE_TODO':
      return { ...state, todos: (state.todos || []).map(todo => todo.id === action.payload ? { ...todo, done: !todo.done, _modified: now() } : todo) };
    case 'DELETE_TODO':
      return { ...state, todos: (state.todos || []).filter(todo => todo.id !== action.payload) };
    case 'RENEW_PACKAGE': {
      // Atomic: close current package, append new, log one renewal entry.
      // Payload: { clientId, newPackageStart, newContractSize, newPeriodUnit, newPeriodValue,
      //            newNotes, closedBy: 'manual'|'auto', trigger }
      // The reducer only enforces: can't renew when current package is already closed.
      // It's the UI's responsibility to determine when renewal is appropriate.
      const stamp = now();
      const {
        clientId, newPackageStart,
        newContractSize, newPeriodUnit, newPeriodValue, newNotes,
        closedBy, trigger,
      } = action.payload;
      const client = state.clients.find(c => c.id === clientId);
      if (!client || !client.packages || client.packages.length === 0) return state;
      const oldPkg = client.packages[client.packages.length - 1];
      if (oldPkg.end != null) return state;  // already closed — also blocks accidental double-dispatch

      // Guard against malformed newPackageStart (callers must pass YYYY-MM-DD).
      // An invalid string would produce oldEnd='NaN-NaN-NaN', silently corrupting the closed package.
      if (!newPackageStart || !/^\d{4}-\d{2}-\d{2}$/.test(newPackageStart)) return state;

      // Compute day before new period start using local time to avoid UTC/DST bugs.
      // e.g. newPackageStart '2026-04-15' → oldEnd '2026-04-14'
      const d = new Date(newPackageStart + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      const oldEnd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      const closedOld = { ...oldPkg, end: oldEnd, closedAt: stamp, closedBy };
      const newPkg = {
        id: 'pkg_' + genId(),
        start: newPackageStart,
        end: null,
        periodUnit: newPeriodUnit,
        periodValue: newPeriodValue,
        contractSize: newContractSize,
        sessionCountOverride: null,  // fresh period = no carry-over override
        notes: newNotes || '',
        closedAt: null,
        closedBy: null,
      };

      const updatedClient = {
        ...client,
        packages: [...client.packages.slice(0, -1), closedOld, newPkg],
        _modified: stamp,
      };

      const logEntry = {
        id: 'log_' + genId(),
        ts: stamp,
        clientId,
        clientName: client.name,
        event: closedBy === 'auto' ? 'package_renewed_auto' : 'package_renewed_manual',
        packageId: oldPkg.id,
        newPackageId: newPkg.id,
        before: oldPkg,
        after: closedOld,
        trigger: trigger || null,
      };

      return {
        ...state,
        clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
        auditLog: [...(state.auditLog || []), logEntry],
      };
    }
    case 'ADD_EVALUATION':
      // v2.11: append-only eval history (PT re-evaluates every ~8 weeks). The frozen
      // scores arrive in the payload — computed by the branch's freeze kernel in the
      // form (compute1RMFrozen since v2.12; computeEvalFrozen for legacy mass records),
      // the same kernel that rendered the live preview chips.
      return { ...state, evaluations: [...(state.evaluations || []), { ...action.payload, _modified: now() }] };
    case 'EDIT_EVALUATION': {
      // CONTRACT: callers MUST pass the FULL record (raw + re-frozen scores together).
      // The spread below would let a partial payload keep stale frozen scores next to
      // edited raws — never author a partial-patch caller against this action.
      // Audited: evals are business records — silent edits would be invisible forensics.
      const stamp = now();
      const oldEval = (state.evaluations || []).find(ev => ev.id === action.payload.id);
      if (!oldEval) return state;
      const newEval = { ...oldEval, ...action.payload, _modified: stamp };
      const client = state.clients.find(c => c.id === newEval.clientId);
      return {
        ...state,
        evaluations: state.evaluations.map(ev => ev.id === newEval.id ? newEval : ev),
        auditLog: [...(state.auditLog || []), {
          id: 'log_' + genId(), ts: stamp,
          clientId: newEval.clientId, clientName: client ? client.name : '',
          event: 'evaluation_edited', packageId: null, newPackageId: null,
          before: oldEval, after: newEval, trigger: null,
        }],
      };
    }
    case 'DELETE_EVALUATION': {
      // Confirm-guarded in the UI. The deleted record rides in the audit entry —
      // "preserve history" means a delete is recoverable forensically.
      const stamp = now();
      const oldEval = (state.evaluations || []).find(ev => ev.id === action.payload);
      if (!oldEval) return state;
      const client = state.clients.find(c => c.id === oldEval.clientId);
      return {
        ...state,
        evaluations: state.evaluations.filter(ev => ev.id !== action.payload),
        auditLog: [...(state.auditLog || []), {
          id: 'log_' + genId(), ts: stamp,
          clientId: oldEval.clientId, clientName: client ? client.name : '',
          event: 'evaluation_deleted', packageId: null, newPackageId: null,
          before: oldEval, after: null, trigger: null,
        }],
      };
    }
    case 'ADD_PROGRAM': {
      // v2.13: append-only program history (regeneration ADDS, viewer shows newest —
      // spec §8). The payload is the complete, already-frozen kernel output; nothing
      // here recomputes it. Audited like evaluations — a generated program is a
      // business record the PT acts on for 6 months.
      const stamp = now();
      const newProg = { ...action.payload, _modified: stamp };
      const client = state.clients.find(c => c.id === newProg.clientId);
      // WHY a summary, not the full record: embedding the full ~38KB program in
      // auditLog doubled data.json burn on every generation. auditLog is
      // append-only and union-merged forever (mergeById never drops entries), so
      // that cost compounds across every future push. The GitHub contents API
      // stops inlining content past 1MB — this is what would tip us over and turn
      // sync permanently red. The full record still lives in state.programs (and,
      // if deleted, in DELETE_PROGRAM's audit `before` — that copy is deliberate).
      const auditSummary = {
        id: newProg.id, clientId: newProg.clientId, evalId: newProg.evalId,
        startDate: newProg.startDate, classification: newProg.classification,
        rulesVersion: newProg.rulesVersion, bankVersion: newProg.bankVersion,
        methods: (newProg.blocks || []).map(b => b.methodId),
      };
      return {
        ...state,
        programs: [...(state.programs || []), newProg],
        auditLog: [...(state.auditLog || []), {
          id: 'log_' + genId(), ts: stamp,
          clientId: newProg.clientId, clientName: client ? client.name : '',
          event: 'program_generated', packageId: null, newPackageId: null,
          before: null, after: auditSummary, trigger: null,
        }],
      };
    }
    case 'EDIT_PROGRAM': {
      // FULL-RECORD contract (EDIT_EVALUATION precedent): swap-exercise re-dispatches
      // the whole record — partial patches forbidden, blocks stay internally consistent.
      // Unknown-id no-op guard (EDIT_EVALUATION precedent): a stale/already-deleted
      // id must not stamp _lastModified or flip merge preference for a write that
      // changes nothing.
      if (!(state.programs || []).some(p => p.id === action.payload.id)) return state;
      const newProg = { ...action.payload, _modified: now() };
      return { ...state, programs: (state.programs || []).map(p => p.id === newProg.id ? newProg : p) };
    }
    case 'DELETE_PROGRAM': {
      // Confirm-guarded in the UI. The deleted record rides in the audit entry —
      // "preserve history" means a delete is recoverable forensically.
      const stamp = now();
      const oldProg = (state.programs || []).find(p => p.id === action.payload);
      if (!oldProg) return state;
      const client = state.clients.find(c => c.id === oldProg.clientId);
      return {
        ...state,
        programs: (state.programs || []).filter(p => p.id !== action.payload),
        auditLog: [...(state.auditLog || []), {
          id: 'log_' + genId(), ts: stamp,
          clientId: oldProg.clientId, clientName: client ? client.name : '',
          event: 'program_deleted', packageId: null, newPackageId: null,
          before: oldProg, after: null, trigger: null,
        }],
      };
    }
    case 'REPLACE_ALL': {
      // Ensure all fields exist after replacing state (remote data may lack new fields).
      // Preserves remote's _lastModified if it exists; sets it if remote is legacy data
      // without timestamps (prevents "Modified: none" in debug panel).
      const replaced = { todos: [], auditLog: [], messageTemplates: {}, evaluations: [], programs: [], ...action.payload };
      replaced._lastModified = replaced._lastModified || new Date().toISOString();
      return replaced;
    }
    default:
      return state;
  }
}

// Wrapper: stamps _lastModified on every LOCAL change so we can detect
// stale data before pushing. REPLACE_ALL and no-op (default) are excluded.
export function reducer(state, action) {
  const newState = baseReducer(state, action);
  if (action.type !== 'REPLACE_ALL' && newState !== state) {
    return { ...newState, _lastModified: new Date().toISOString() };
  }
  return newState;
}

// ─── WhatsApp helpers ───
// Use nickname for friendly messages, fall back to full name.
// v2.10.1: exported — Clients.jsx quick-message re-implemented this inline.
export const friendly = (client) => client.nickname || client.name.split(' ')[0];

// Open WhatsApp with a prefilled message. The ONE place that builds wa.me URLs —
// phone-normalization changes (deferred revisit) must only ever land here.
export const openWhatsApp = (client, msg) => {
  window.open(`https://wa.me/${formatPhone(client.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
};

// Default message templates — editable by PT in General panel
// Placeholders: {name} {type} {emoji} {date} {time} {duration} {number} {periodEnd}
export const DEFAULT_TEMPLATES = {
  en: {
    booking: `Hi {name}! 👋\n\n{emoji} Your *{type}* session is booked:\n📅 {date}\n⏰ {time} ({duration} min)\n#️⃣ Session #{number} (until {periodEnd})\n\n👍 Like this message to confirm\n❌ Reply to cancel/reschedule\n\nSee you at the gym! 💪`,
    reminder: `Reminder! 🔔\n\nHey {name}, just a reminder about your session:\n{emoji} {type}\n📅 {date}\n⏰ {time}\n#️⃣ Session #{number} (until {periodEnd})\n\nSee you soon! 💪`,
  },
  ar: {
    booking: `مرحبا {name}! 👋\n\n{emoji} تمّ حجز جلسة *{type}*:\n📅 {date}\n⏰ {time} ({duration} دقيقة)\n#️⃣ الجلسة #{number} (حتى {periodEnd})\n\n👍 أعجبني للتأكيد\n❌ ردّ للإلغاء أو تغيير الموعد\n\nمنشوفك بالنادي! 💪`,
    reminder: `تذكير! 🔔\n\nمرحبا {name}، تذكير بجلستك:\n{emoji} {type}\n📅 {date}\n⏰ {time}\n#️⃣ الجلسة #{number} (حتى {periodEnd})\n\nمنشوفك قريباً! 💪`,
  },
};

// Replace placeholders in a template with actual session values.
// Uses client's current package for {number} and {periodEnd} (unchanged semantics).
// v2.9: adds {packageProgress} — "N/M" for contract packages, empty string otherwise.
// v2.10.1: takes lang and threads it into formatDateLong — Arabic templates were
// shipping with en-US dates ("Wednesday, June 10, 2026" inside an Arabic message)
// because the lang default was silently used here.
const fillTemplate = (template, client, session, sessions, lang = 'en') => {
  const st = getSessionType(session.type);
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, session.date);
  const { effective } = sessions
    ? getEffectiveSessionCount(client, session, sessions)
    : { effective: '' };
  const packageProgress = (pkg.contractSize != null && sessions)
    ? `${effective}/${pkg.contractSize}`
    : '';
  // {periodEnd} for contract packages: fall back to sliding window end computed from unit/value
  // (meaningful for messaging even though the package extends past it).
  const periodEndDisplay = period.end
    || computeSlidingWindow(pkg.start, pkg.periodUnit, pkg.periodValue, session.date).end;
  return template
    .replace(/\{name\}/g, friendly(client))
    .replace(/\{type\}/g, session.type)
    .replace(/\{emoji\}/g, st.emoji)
    .replace(/\{date\}/g, formatDateLong(session.date, lang))
    .replace(/\{time\}/g, session.time)
    .replace(/\{duration\}/g, String(session.duration || 45))
    .replace(/\{number\}/g, String(effective))
    .replace(/\{periodEnd\}/g, formatDateLong(periodEndDisplay, lang))
    .replace(/\{packageProgress\}/g, packageProgress);
};

// v2.10.1: booking/reminder senders were byte-identical apart from the template key —
// collapsed into one factory so a fix to one can never miss the other (the v2.9.6
// "two semantics" drift class).
const makeTemplateSender = (kind) => (client, session, templates, lang = 'en', sessions = []) => {
  const tpl = (templates && templates[kind]) || DEFAULT_TEMPLATES[lang][kind];
  openWhatsApp(client, fillTemplate(tpl, client, session, sessions, lang));
};

export const sendBookingWhatsApp = makeTemplateSender('booking');
export const sendReminderWhatsApp = makeTemplateSender('reminder');

// ─── Backup export/import with merge ───
export const exportBackup = (state) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ptapp-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Merge backup into live data: fills gaps, doesn't replace existing
export const mergeBackup = (live, backup) => {
  // v2.10.1: migrate the backup by its OWN _dataVersion before merging. The previous
  // code only migrated the MERGED blob — which inherits live's _dataVersion (4) via
  // the spread below, so migrateData no-oped and records restored from an old backup
  // (pre-v3 clients without packages[], 'Arms'/'Custom' sessions) entered live state
  // permanently un-migrated. Migrating the backup first also guards malformed files
  // (missing clients/sessions arrays) before the .filter calls below.
  backup = migrateData(backup);
  const merged = { ...live };
  // Merge clients by ID — backup fills missing, doesn't overwrite existing
  const liveClientIds = new Set(live.clients.map(c => c.id));
  const restoredClients = backup.clients.filter(c => !liveClientIds.has(c.id));
  merged.clients = [...live.clients, ...restoredClients];
  // Merge sessions by ID — same logic
  const liveSessionIds = new Set(live.sessions.map(s => s.id));
  const restoredSessions = backup.sessions.filter(s => !liveSessionIds.has(s.id));
  merged.sessions = [...live.sessions, ...restoredSessions];
  // Merge todos by ID
  const liveTodoIds = new Set((live.todos || []).map(todo => todo.id));
  const restoredTodos = (backup.todos || []).filter(todo => !liveTodoIds.has(todo.id));
  merged.todos = [...(live.todos || []), ...restoredTodos];
  // Merge auditLog by ID — append-only forensic log; keep all entries from both sides.
  // v2.10.1: the migrateData(backup) call above synthesizes 'migration v2→v3'
  // package_created entries for EVERY client in an old backup — including clients
  // that already exist live (whose synthesized packages were just discarded by the
  // restoredClients filter). Drop those orphan entries; keep migration entries only
  // for clients actually being restored.
  const liveAuditIds = new Set((live.auditLog || []).map(e => e.id));
  const restoredAudit = (backup.auditLog || []).filter(e =>
    !liveAuditIds.has(e.id) &&
    !(e.trigger && e.trigger.reason === 'migration v2→v3' && liveClientIds.has(e.clientId)));
  merged.auditLog = [...(live.auditLog || []), ...restoredAudit];
  // Merge evaluations by ID — backup fills missing, doesn't overwrite existing
  const liveEvalIds = new Set((live.evaluations || []).map(ev => ev.id));
  const restoredEvals = (backup.evaluations || []).filter(ev => !liveEvalIds.has(ev.id));
  merged.evaluations = [...(live.evaluations || []), ...restoredEvals];
  // Merge programs by ID — backup fills missing, doesn't overwrite existing (evaluations pattern)
  const liveProgramIds = new Set((live.programs || []).map(p => p.id));
  const restoredPrograms = (backup.programs || []).filter(p => !liveProgramIds.has(p.id));
  merged.programs = [...(live.programs || []), ...restoredPrograms];
  // Keep whichever has custom templates (live wins if both have them)
  merged.messageTemplates = live.messageTemplates || backup.messageTemplates || {};
  return migrateData(merged);
};
