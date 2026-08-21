// ─── Demo dataset (v2.15.1) ───
// Why this file exists: the token screen is a hard gate — no token, no app. Google
// Play's review needs to reach every screen, but the only working token is a real
// PAT on the PT's private data repo, so handing reviewers a live one would give
// them write access to Elie's actual client records. Instead the literal credential
// DEMO opens the app on this seeded, entirely local dataset with the network path
// never touched (see isDemo() in sync.js).
//
// 🔴 Every date is computed at runtime. Hardcoded stamps rot: a fixture written
// today reads as "all sessions are ancient history" three months from now, and the
// lapsed-session sweep would auto-complete the whole demo schedule on first launch.

import { localDateStr, DATA_VERSION } from './utils';

// Days from today → 'YYYY-MM-DD' in LOCAL time (never toISOString — that's UTC and
// shifts the date by one either side of midnight in Beirut).
const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

const pkg = (id, startOffset, contractSize) => ({
  id,
  start: dayOffset(startOffset),
  end: null,
  periodUnit: 'month',
  periodValue: 1,
  contractSize,
  notes: '',
  closedAt: null,
  closedBy: null,
  sessionCountOverride: null,
});

// Names are invented. Nothing here corresponds to a real client.
// 🔴 So are the numbers — and they did not used to be safe. The first set used live
// Lebanese mobile prefixes (70/71/76/03) with plausible bodies, and a tester tapping
// WhatsApp on 2026-08-21 reached real strangers. These are now an obvious dummy run
// (…0000001-4). Belt AND braces: `openWhatsApp` also refuses to address a number at
// all while `isDemo()` is true, so nothing here is ever dialled. Do not "improve"
// these into realistic-looking numbers.
const clients = [
  {
    id: 'demo_c1', name: 'Sami Haddad', nickname: 'Sami', phone: '+96170000001',
    gender: 'male', birthdate: '1992-03-14', notes: 'Wants upper-body focus.',
    packages: [pkg('pkg_demo_1', -20, 12)],
  },
  {
    id: 'demo_c2', name: 'Nour Khoury', nickname: 'Nour', phone: '+96170000002',
    gender: 'female', birthdate: '1996-11-02', notes: 'Returning after a knee injury.',
    packages: [pkg('pkg_demo_2', -12, 8)],
  },
  {
    id: 'demo_c3', name: 'Karim Aoun', nickname: '', phone: '+96170000003',
    gender: 'male', birthdate: '1985-07-21', notes: '',
    packages: [pkg('pkg_demo_3', -5, 16)],
  },
  {
    id: 'demo_c4', name: 'Rita Semaan', nickname: 'Rita', phone: '+96170000004',
    gender: 'female', birthdate: '2000-01-09', notes: 'Fat-loss goal.',
    packages: [pkg('pkg_demo_4', -2, 10)],
  },
];

// A mix of completed history and upcoming bookings, so Home, Schedule and Sessions
// all have something to show the moment the reviewer lands.
const SEED = [
  ['demo_c1', -14, '09:00', 'Strength', 'completed'],
  ['demo_c2', -13, '10:00', 'Strength', 'completed'],
  ['demo_c1', -11, '09:00', 'Strength', 'completed'],
  ['demo_c3', -9, '18:00', 'Cardio', 'completed'],
  ['demo_c2', -8, '10:00', 'Strength', 'completed'],
  ['demo_c1', -7, '09:00', 'Strength', 'completed'],
  ['demo_c4', -4, '17:00', 'Strength', 'completed'],
  ['demo_c3', -3, '18:00', 'Cardio', 'completed'],
  ['demo_c2', -2, '10:00', 'Strength', 'completed'],
  ['demo_c1', 1, '09:00', 'Strength', 'scheduled'],
  ['demo_c4', 1, '17:00', 'Strength', 'scheduled'],
  ['demo_c3', 2, '18:00', 'Cardio', 'confirmed'],
  ['demo_c2', 3, '10:00', 'Strength', 'scheduled'],
  ['demo_c1', 4, '09:00', 'Strength', 'scheduled'],
];

const sessions = SEED.map(([clientId, off, time, type, status], i) => ({
  id: `demo_s${i + 1}`,
  clientId,
  type,
  duration: 45,
  date: dayOffset(off),
  time,
  status,
  createdAt: dayOffset(off - 1),
}));

// Returns a fresh blob each call — callers must not share array references with
// the reducer, and the dates must reflect the day the demo was actually entered.
export const buildDemoData = () => ({
  clients: JSON.parse(JSON.stringify(clients)),
  sessions: sessions.map(s => ({ ...s })),
  // Boot the same shape a real device carries. Without _dataVersion, migrateData reads
  // 0 and runs the entire v1→v6 legacy chain over a blob that is already current — it
  // survives today only by luck (the v2→v3 step happens to be idempotent here, though
  // it does overwrite Karim's deliberately-empty nickname), and the next migration step
  // added would silently rewrite the fixture.
  todos: [],
  evaluations: [],
  programs: [],
  auditLog: [],
  _dataVersion: DATA_VERSION,
});
