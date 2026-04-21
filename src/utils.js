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
export const SESSION_TYPES = [
  { label: 'Strength', color: '#6366F1', emoji: '💪' },
  { label: 'Cardio', color: '#3B82F6', emoji: '🏃' },
  { label: 'Flexibility', color: '#8B5CF6', emoji: '🧘' },
  { label: 'HIIT', color: '#F59E0B', emoji: '⚡' },
  { label: 'Recovery', color: '#10B981', emoji: '🧊' },
  { label: 'Custom', color: '#6B7280', emoji: '🎯' },
];

// ─── Focus Tags (per session type) ───
// Tappable tags for recording what was done during a session.
// Notes field handles anything not covered here; parseable later for weights/reps.
export const FOCUS_TAGS = {
  Strength:    ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'],
  Cardio:      ['Running', 'Cycling', 'Rowing', 'Swimming', 'Jump Rope', 'Stairs'],
  Flexibility: ['Stretching', 'Yoga', 'Mobility', 'Foam Rolling'],
  HIIT:        ['Upper Body', 'Lower Body', 'Full Body', 'Core', 'Tabata', 'Circuit'],
  Recovery:    ['Foam Rolling', 'Stretching', 'Ice Bath', 'Light Cardio', 'Massage'],
  Custom:      ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'],
};

// ─── Session Statuses ───
// Colors/backgrounds are theme-independent; labels come from i18n when lang is provided
const STATUS_STYLES = {
  scheduled: { color: '#3B82F6', bg: '#EFF6FF' },
  confirmed: { color: '#10B981', bg: '#ECFDF5' },
  completed: { color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2' },
};
const STATUS_FALLBACK = { scheduled: 'Scheduled', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
// STATUS_MAP kept as default English export for backward compatibility
export const STATUS_MAP = Object.fromEntries(
  Object.entries(STATUS_STYLES).map(([k, v]) => [k, { ...v, label: STATUS_FALLBACK[k] }])
);
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

// ─── Monthly session count ───
// ─── Billing Period ───
// Each client can have a custom billing period (periodStart + periodLength).
// Default (no fields set): calendar month (1st to last day of month).
// periodLength options: '1month', '4weeks', '2weeks', '1week', or number of days.
export const PERIOD_OPTIONS = [
  { value: '1month', label: '1 Month' },
  { value: '4weeks', label: '4 Weeks' },
  { value: '2weeks', label: '2 Weeks' },
  { value: '1week', label: '1 Week' },
];

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
export const getPeriodSessionCount = (sessions, clientId, periodStart, periodEnd) => {
  return sessions.filter(s =>
    s.clientId === clientId &&
    s.date >= periodStart &&
    (periodEnd == null || s.date <= periodEnd) &&
    (s.status !== 'cancelled' || s.cancelCounted)
  ).length;
};

// Sequential position of a session within its client's billing period (1st, 2nd, 3rd...).
// periodEnd can be null for open-ended contract packages. Defensive fallback: if the session
// isn't found in the filtered list (stale array during ADD_SESSION), return length + 1 to
// prevent "Session #0" from leaking into WhatsApp messages.
export const getSessionOrdinal = (sessions, sessionId, clientId, periodStart, periodEnd) => {
  const periodSessions = sessions
    .filter(s =>
      s.clientId === clientId &&
      s.date >= periodStart &&
      (periodEnd == null || s.date <= periodEnd) &&
      (s.status !== 'cancelled' || s.cancelCounted))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
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

// Returns {start, end} window used for session counting/display.
//   Contract package    → { start: pkg.start, end: null }  (open-ended until renewal)
//   No-contract package → sliding time window anchored at pkg.start, stepped by unit*value
export const getEffectivePeriod = (pkg, refDateStr = today()) => {
  if (!pkg) return { start: refDateStr, end: null };
  if (pkg.contractSize != null) {
    return { start: pkg.start, end: null };
  }
  return computeSlidingWindow(pkg.start, pkg.periodUnit, pkg.periodValue, refDateStr);
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

// Compute auto + effective count for a specific session within its client's current package.
// "Active override" = override.periodStart matches the current package's effective period start
// (same semantic as v2.8 — works for both sliding-window and contract packages).
// Returns { auto, effective, override } — preserved shape for backward compat.
export const getEffectiveSessionCount = (client, session, sessions) => {
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, session.date);
  const auto = getSessionOrdinal(sessions, session.id, session.clientId, period.start, period.end);

  const override = pkg.sessionCountOverride;
  if (!override || override.periodStart !== period.start) {
    return { auto, effective: auto, override: null };
  }

  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};

// Compute auto + effective count for a client (not anchored to a specific session) as of refDate.
// Used by client-scoped displays like booking chips and renewal-due detection.
export const getEffectiveClientCount = (client, sessions, refDateStr = today()) => {
  const pkg = getCurrentPackage(client);
  const period = getEffectivePeriod(pkg, refDateStr);
  const auto = getPeriodSessionCount(sessions, client.id, period.start, period.end);

  const override = pkg.sessionCountOverride;
  if (!override || override.periodStart !== period.start) {
    return { auto, effective: auto, override: null };
  }

  const effective = override.type === 'absolute'
    ? override.value
    : Math.max(0, auto + override.value);
  return { auto, effective, override };
};

// True when the client's current package has a contract and the effective count has reached it.
// Used by UI surfaces (Clients card, Dashboard section, booking confirm banner) to apply red state.
export const isRenewalDue = (client, sessions) => {
  const pkg = getCurrentPackage(client);
  if (!pkg || pkg.contractSize == null) return false;
  const { effective } = getEffectiveClientCount(client, sessions);
  return effective >= pkg.contractSize;
};

// ─── Date helpers ───
// NEVER use toISOString() for display dates — it converts to UTC, so midnight in
// Beirut (UTC+3) becomes the previous day. All date→string must use local time.
export const today = () => localDateStr(new Date());
export const currentMonth = () => localMonthStr(new Date());

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

// ─── Data versioning & migration ───
// Increment DATA_VERSION when the schema changes. Add a migration function
// for each version bump. Existing data is NEVER discarded — only migrated forward.
const DATA_VERSION = 3;

// Capitalize each word: "pierre ghorra" → "Pierre Ghorra"
export const capitalizeName = (name) =>
  name.replace(/\b\w/g, c => c.toUpperCase());

function migrateData(data) {
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

  data.clients = data.clients || [];
  data.sessions = data.sessions || [];
  data.todos = data.todos || [];
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
  const localTs = local._lastModified || '';
  const remoteTs = remote._lastModified || '';
  const preferLocal = localTs > remoteTs;
  return {
    clients: mergeById(local.clients, remote.clients),
    sessions: mergeById(local.sessions, remote.sessions),
    todos: mergeById(local.todos, remote.todos),
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
// Per-record `_modified` timestamps are stamped by each case that adds/edits
// a record — enables last-write-wins merge across multiple devices (Apr 19
// bulletproofing after the Hala Mouzanar session was lost to a sync race).
// Exported for unit testing (sanity scripts in tmp/).
export function baseReducer(state, action) {
  const now = () => new Date().toISOString();
  switch (action.type) {
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, { ...action.payload, _modified: now() }] };
    case 'EDIT_CLIENT': {
      const stamp = now();
      const oldClient = state.clients.find(c => c.id === action.payload.id);
      const newClient = { ...action.payload, _modified: stamp };
      const logEntries = [];

      // Detect changes to the current (last) package and append audit log entries.
      // Only runs when old and new clients share the same last package ID (edit, not renewal).
      const oldPkg = oldClient && oldClient.packages && oldClient.packages[oldClient.packages.length - 1];
      const newPkg = newClient.packages && newClient.packages[newClient.packages.length - 1];
      if (oldPkg && newPkg && oldPkg.id === newPkg.id) {
        // Detect tracked package field changes → package_edited
        const tracked = ['start', 'periodUnit', 'periodValue', 'contractSize'];
        const changed = tracked.some(f => oldPkg[f] !== newPkg[f]);
        if (changed) {
          logEntries.push({
            id: 'log_' + genId(),
            ts: stamp,
            clientId: newClient.id,
            clientName: newClient.name,
            event: 'package_edited',
            packageId: newPkg.id,
            newPackageId: null,
            before: oldPkg,
            after: newPkg,
            trigger: null,
          });
        }
        // Detect override change → override_set or override_cleared
        const oldOv = oldPkg.sessionCountOverride;
        const newOv = newPkg.sessionCountOverride;
        // Explicit field comparison (key-order independent — the JSON.stringify approach was
        // fragile because override writers across the codebase constructed the shape in
        // different orders, e.g. spread-then-append in one site vs literal in another).
        const ovEqual =
          (oldOv == null && newOv == null) ||
          (oldOv != null && newOv != null
            && oldOv.type === newOv.type
            && oldOv.value === newOv.value
            && oldOv.periodStart === newOv.periodStart);
        if (!ovEqual) {
          logEntries.push({
            id: 'log_' + genId(),
            ts: stamp,
            clientId: newClient.id,
            clientName: newClient.name,
            event: newOv ? 'override_set' : 'override_cleared',
            packageId: newPkg.id,
            newPackageId: null,
            before: { sessionCountOverride: oldOv },
            after: { sessionCountOverride: newOv },
            trigger: null,
          });
        }
      }

      return {
        ...state,
        clients: state.clients.map(c => c.id === newClient.id ? newClient : c),
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
      };
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, { ...action.payload, _modified: now() }] };
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
    case 'REPLACE_ALL': {
      // Ensure all fields exist after replacing state (remote data may lack new fields).
      // Preserves remote's _lastModified if it exists; sets it if remote is legacy data
      // without timestamps (prevents "Modified: none" in debug panel).
      const replaced = { todos: [], auditLog: [], messageTemplates: {}, ...action.payload };
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
// Use nickname for friendly messages, fall back to full name
const friendly = (client) => client.nickname || client.name.split(' ')[0];

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
const fillTemplate = (template, client, session, sessions) => {
  const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
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
    .replace(/\{date\}/g, formatDateLong(session.date))
    .replace(/\{time\}/g, session.time)
    .replace(/\{duration\}/g, String(session.duration || 45))
    .replace(/\{number\}/g, String(effective))
    .replace(/\{periodEnd\}/g, formatDateLong(periodEndDisplay))
    .replace(/\{packageProgress\}/g, packageProgress);
};

export const sendBookingWhatsApp = (client, session, templates, lang = 'en', sessions = []) => {
  const phone = formatPhone(client.phone);
  const tpl = (templates && templates.booking) || DEFAULT_TEMPLATES[lang].booking;
  const msg = fillTemplate(tpl, client, session, sessions);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

export const sendReminderWhatsApp = (client, session, templates, lang = 'en', sessions = []) => {
  const phone = formatPhone(client.phone);
  const tpl = (templates && templates.reminder) || DEFAULT_TEMPLATES[lang].reminder;
  const msg = fillTemplate(tpl, client, session, sessions);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

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
  // Merge auditLog by ID — append-only forensic log; keep all entries from both sides
  const liveAuditIds = new Set((live.auditLog || []).map(e => e.id));
  const restoredAudit = (backup.auditLog || []).filter(e => !liveAuditIds.has(e.id));
  merged.auditLog = [...(live.auditLog || []), ...restoredAudit];
  // Keep whichever has custom templates (live wins if both have them)
  merged.messageTemplates = live.messageTemplates || backup.messageTemplates || {};
  return migrateData(merged);
};
