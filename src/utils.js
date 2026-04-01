// ─── ID Generator ───
export const genId = () => Math.random().toString(36).slice(2, 9);

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
  { label: 'Strength', color: '#E8453C', emoji: '💪' },
  { label: 'Cardio', color: '#3B82F6', emoji: '🏃' },
  { label: 'Flexibility', color: '#8B5CF6', emoji: '🧘' },
  { label: 'HIIT', color: '#F59E0B', emoji: '⚡' },
  { label: 'Recovery', color: '#10B981', emoji: '🧊' },
  { label: 'Custom', color: '#6B7280', emoji: '🎯' },
];

// ─── Session Statuses ───
export const STATUS_MAP = {
  scheduled: { label: 'Scheduled', color: '#3B82F6', bg: '#EFF6FF' },
  confirmed: { label: 'Confirmed', color: '#10B981', bg: '#ECFDF5' },
  completed: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2' },
};

// ─── Time slots ───
export const TIMES = [];
for (let h = 5; h <= 22; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

// ─── Duration options ───
export const DURATIONS = [30, 45, 60, 75, 90, 120];

// ─── Date helpers ───
export const today = () => new Date().toISOString().split('T')[0];

export const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const formatDateLong = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

// ─── Data versioning & migration ───
// Increment DATA_VERSION when the schema changes. Add a migration function
// for each version bump. Existing data is NEVER discarded — only migrated forward.
const DATA_VERSION = 1;

function migrateData(data) {
  // No version field means v0 (original format: { clients, sessions })
  let v = data._dataVersion || 0;

  // Migration chain: each step moves data forward one version
  // Example for future:
  // if (v === 1) { data.messages = data.messages || []; v = 2; }

  if (v < DATA_VERSION) {
    data._dataVersion = DATA_VERSION;
  }
  // Ensure required fields always exist
  data.clients = data.clients || [];
  data.sessions = data.sessions || [];
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
    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) };
    case 'REPLACE_ALL':
      return action.payload;
    default:
      return state;
  }
}

// ─── WhatsApp helpers ───
export const sendBookingWhatsApp = (client, session) => {
  const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
  const phone = formatPhone(client.phone);
  const msg = `Hi ${client.name}! 👋\n\n${st.emoji} Your *${session.type}* session is booked:\n📅 ${formatDateLong(session.date)}\n⏰ ${session.time} (${session.duration} min)\n\nPlease confirm by replying ✅\n\nSee you at the gym! 💪`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

export const sendReminderWhatsApp = (client, session) => {
  const st = SESSION_TYPES.find(t => t.label === session.type) || SESSION_TYPES[5];
  const phone = formatPhone(client.phone);
  const msg = `Reminder! 🔔\n\nHey ${client.name}, just a reminder about your session:\n${st.emoji} ${session.type}\n📅 ${formatDateLong(session.date)}\n⏰ ${session.time}\n\nSee you soon! 💪`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};
