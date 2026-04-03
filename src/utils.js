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
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && dy < 0;

    if (atTop || atBottom) {
      // Prevent browser's native overscroll from doubling up
      e.preventDefault();
      // Diminishing pull — sqrt curve feels like stretching rubber
      const absDy = Math.abs(dy);
      const pull = Math.sign(dy) * Math.min(Math.sqrt(absDy) * 4, 120);
      el.style.transform = `translateY(${pull}px)`;
      pulling = true;
    } else if (pulling) {
      // User scrolled back into normal range mid-pull — snap back
      el.style.transform = '';
      pulling = false;
    }
  };

  const onTouchEnd = () => {
    if (pulling) {
      // Bounce back with overshoot — same spring curve as the modal
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = 'translateY(0)';
      const cleanup = () => { el.style.transition = ''; };
      el.addEventListener('transitionend', cleanup, { once: true });
      pulling = false;
    }
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  // Non-passive so we can preventDefault during overscroll — prevents
  // browser's native glow/stretch from doubling with our rubber band
  el.addEventListener('touchmove', onTouchMove, { passive: false });
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
// Count sessions for a client in a given month (YYYY-MM)
// Includes: scheduled, confirmed, completed, and cancelled-but-counted sessions
export const getMonthlySessionCount = (sessions, clientId, month) => {
  return sessions.filter(s =>
    s.clientId === clientId &&
    s.date.startsWith(month) &&
    (s.status !== 'cancelled' || s.cancelCounted)
  ).length;
};

// Sequential position of a session within the client's month (1st, 2nd, 3rd...)
export const getSessionOrdinal = (sessions, sessionId, clientId, month) => {
  const monthSessions = sessions
    .filter(s => s.clientId === clientId && s.date.startsWith(month) && (s.status !== 'cancelled' || s.cancelCounted))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return monthSessions.findIndex(s => s.id === sessionId) + 1;
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
const DATA_VERSION = 2;

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

  data.clients = data.clients || [];
  data.sessions = data.sessions || [];
  data.todos = data.todos || [];
  data.messageTemplates = data.messageTemplates || {};
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

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
};

// ─── Reducer ───
export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'EDIT_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== action.payload),
        sessions: state.sessions.filter(s => s.clientId !== action.payload),
      };
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload] };
    case 'UPDATE_SESSION':
      return { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'BATCH_COMPLETE': {
      // Mark multiple sessions as completed in a single dispatch (avoids N re-renders)
      const ids = new Set(action.payload);
      return { ...state, sessions: state.sessions.map(s => ids.has(s.id) ? { ...s, status: 'completed' } : s) };
    }
    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) };
    case 'ADD_TODO':
      return { ...state, todos: [...(state.todos || []), action.payload] };
    case 'SET_TEMPLATES':
      return { ...state, messageTemplates: action.payload };
    case 'EDIT_TODO':
      return { ...state, todos: (state.todos || []).map(t => t.id === action.payload.id ? { ...t, text: action.payload.text } : t) };
    case 'TOGGLE_TODO':
      return { ...state, todos: (state.todos || []).map(t => t.id === action.payload ? { ...t, done: !t.done } : t) };
    case 'DELETE_TODO':
      return { ...state, todos: (state.todos || []).filter(t => t.id !== action.payload) };
    case 'REPLACE_ALL':
      // Ensure all fields exist after replacing state (remote data may lack new fields)
      return { todos: [], messageTemplates: {}, ...action.payload };
    default:
      return state;
  }
}

// ─── WhatsApp helpers ───
// Use nickname for friendly messages, fall back to full name
const friendly = (client) => client.nickname || client.name.split(' ')[0];

// Default message templates — editable by PT in General panel
// Placeholders: {name} {type} {emoji} {date} {time} {duration}
export const DEFAULT_TEMPLATES = {
  en: {
    booking: `Hi {name}! 👋\n\n{emoji} Your *{type}* session is booked:\n📅 {date}\n⏰ {time} ({duration} min)\n\n👍 Like this message to confirm\n❌ Reply to cancel/reschedule\n\nSee you at the gym! 💪`,
    reminder: `Reminder! 🔔\n\nHey {name}, just a reminder about your session:\n{emoji} {type}\n📅 {date}\n⏰ {time}\n\nSee you soon! 💪`,
  },
  ar: {
    booking: `مرحبا {name}! 👋\n\n{emoji} تمّ حجز جلسة *{type}*:\n📅 {date}\n⏰ {time} ({duration} دقيقة)\n\n👍 أعجبني للتأكيد\n❌ ردّ للإلغاء أو تغيير الموعد\n\nمنشوفك بالنادي! 💪`,
    reminder: `تذكير! 🔔\n\nمرحبا {name}، تذكير بجلستك:\n{emoji} {type}\n📅 {date}\n⏰ {time}\n\nمنشوفك قريباً! 💪`,
  },
};

// Replace placeholders in a template with actual session values
const fillTemplate = (template, client, session) => {
  const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
  return template
    .replace(/\{name\}/g, friendly(client))
    .replace(/\{type\}/g, session.type)
    .replace(/\{emoji\}/g, st.emoji)
    .replace(/\{date\}/g, formatDateLong(session.date))
    .replace(/\{time\}/g, session.time)
    .replace(/\{duration\}/g, String(session.duration || 45));
};

export const sendBookingWhatsApp = (client, session, templates, lang = 'en') => {
  const phone = formatPhone(client.phone);
  const tpl = (templates && templates.booking) || DEFAULT_TEMPLATES[lang].booking;
  const msg = fillTemplate(tpl, client, session);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

export const sendReminderWhatsApp = (client, session, templates, lang = 'en') => {
  const phone = formatPhone(client.phone);
  const tpl = (templates && templates.reminder) || DEFAULT_TEMPLATES[lang].reminder;
  const msg = fillTemplate(tpl, client, session);
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
  const liveTodoIds = new Set((live.todos || []).map(t => t.id));
  const restoredTodos = (backup.todos || []).filter(t => !liveTodoIds.has(t.id));
  merged.todos = [...(live.todos || []), ...restoredTodos];
  // Keep whichever has custom templates (live wins if both have them)
  merged.messageTemplates = live.messageTemplates || backup.messageTemplates || {};
  return migrateData(merged);
};
