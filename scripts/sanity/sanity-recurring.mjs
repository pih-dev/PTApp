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
const mwf = generateRecurringDates('2026-06-08', [1, 3, 5], 10);
assert(mwf.length === 10, 'MWF x10 → exactly 10 dates');
assert(mwf[0] === '2026-06-08', 'first date is the start date (a selected weekday)');
assert(mwf[1] === '2026-06-10', 'second date is Wed of week 1');
assert(mwf[2] === '2026-06-12', 'third date is Fri of week 1');
assert(mwf[3] === '2026-06-15', 'fourth date is Mon of week 2');
assert(mwf[9] === '2026-06-29', 'tenth date is Mon of week 4');

const monOnly = generateRecurringDates('2026-06-09', [1], 3);
assert(monOnly[0] === '2026-06-15', 'Tue start, Mon-only → first is next Monday');
assert(monOnly.length === 3 && monOnly[2] === '2026-06-29', 'Mon-only x3 spans 3 weeks');

const everyDay = generateRecurringDates('2026-06-08', [0, 1, 2, 3, 4, 5, 6], 4);
assert(everyDay.join(',') === '2026-06-08,2026-06-09,2026-06-10,2026-06-11', 'all-days → consecutive');

assert(generateRecurringDates('2026-06-08', [], 10).length === 0, 'no weekdays → empty');
assert(generateRecurringDates('2026-06-08', [1], 0).length === 0, 'count 0 → empty');

console.log('generateRecurringDates: all passed');

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
