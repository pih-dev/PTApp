// Sanity: feed migrateData a synthetic v3 state with mixed Arms / Custom data,
// assert v4 produces correct per-client alternating Bi/Tri history (counting
// cancelled sessions) and renames Custom→Endurance on session.type.
//
// Run: node scripts/sanity/sanity-arms-migration.mjs
//
// Catches:
//   - Alternation off-by-one (must START with Bi, not Tri)
//   - Cancelled sessions accidentally skipped (Pierre revised the rule on 2026-05-02:
//     cancelled sessions DO count toward the alternation order)
//   - Mixed-tag sessions losing the non-Arms tags
//   - Per-client cross-contamination (alternation must reset per client)
//   - Idempotency (re-run must not flip Bi↔Tri the second time)

const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { loadData } = await import(utilsUrl);

// Stage a v3 blob in localStorage. loadData() reads from localStorage and runs migrateData.
const STORAGE_KEY = 'ptapp-data';

// Mock localStorage for Node — same trick the other sanity scripts use.
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
};

const v3Blob = {
  _dataVersion: 3,
  clients: [
    { id: 'cA', name: 'Alice', nickname: 'Al', phone: '96170000001', packages: [{ id: 'pkgA', start: '2026-01-01', end: null, periodUnit: 'month', periodValue: 1, contractSize: null, sessionCountOverride: null, notes: '', closedAt: null, closedBy: null }] },
    { id: 'cB', name: 'Bob',   nickname: 'Bo', phone: '96170000002', packages: [{ id: 'pkgB', start: '2026-01-01', end: null, periodUnit: 'month', periodValue: 1, contractSize: null, sessionCountOverride: null, notes: '', closedAt: null, closedBy: null }] },
    { id: 'cC', name: 'Cara',  nickname: 'Ca', phone: '96170000003', packages: [{ id: 'pkgC', start: '2026-01-01', end: null, periodUnit: 'month', periodValue: 1, contractSize: null, sessionCountOverride: null, notes: '', closedAt: null, closedBy: null }] },
  ],
  sessions: [
    // Alice: 4 Arms sessions in date order — expect Bi, Tri, Bi, Tri.
    // s2 is cancelled to verify cancelled sessions still count toward alternation.
    { id: 's1', clientId: 'cA', date: '2026-02-01', time: '10:00', type: 'Strength', status: 'completed', focus: ['Arms'] },
    { id: 's2', clientId: 'cA', date: '2026-02-08', time: '10:00', type: 'Strength', status: 'cancelled', focus: ['Arms', 'Chest'] },
    { id: 's3', clientId: 'cA', date: '2026-02-15', time: '10:00', type: 'Strength', status: 'completed', focus: ['Chest', 'Arms'] },
    { id: 's4', clientId: 'cA', date: '2026-02-22', time: '10:00', type: 'Strength', status: 'completed', focus: ['Arms', 'Core'] },
    // Bob: alternation independent from Alice's — first Arms must be Bi.
    { id: 's5', clientId: 'cB', date: '2026-03-01', time: '09:00', type: 'Custom', status: 'completed', focus: ['Arms'] },
    { id: 's6', clientId: 'cB', date: '2026-03-08', time: '09:00', type: 'Custom', status: 'completed', focus: ['Arms'] },
    // Cara: no Arms sessions — focus untouched, but type 'Custom' must rename.
    { id: 's7', clientId: 'cC', date: '2026-03-05', time: '11:00', type: 'Custom', status: 'completed', focus: ['Legs'] },
    // Out-of-order insertion: s8 is dated BEFORE s9 but appears later in array.
    // Sort must reorder them — Alice's 5th Arms session by date is s8 (Bi-position 4 → Tri).
    { id: 's9', clientId: 'cA', date: '2026-03-08', time: '10:00', type: 'Strength', status: 'completed', focus: ['Arms'] },
    { id: 's8', clientId: 'cA', date: '2026-03-01', time: '10:00', type: 'Strength', status: 'completed', focus: ['Arms'] },
  ],
  todos: [],
  messageTemplates: {},
  auditLog: [],
};

localStorage.setItem(STORAGE_KEY, JSON.stringify(v3Blob));

const result = loadData();

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? '✓' : '✗'} ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  if (ok) pass++; else fail++;
}

// Sanity that v3→v4 ran
check('DATA_VERSION is 4', result._dataVersion, 4);

// Find sessions by id (post-migration order may have changed)
const byId = Object.fromEntries(result.sessions.map(s => [s.id, s]));

// Alice chronological order: s1 (Feb 01), s2 (Feb 08, cancelled), s3 (Feb 15),
// s4 (Feb 22), s8 (Mar 01), s9 (Mar 08). Six Arms sessions.
// Alternation Bi/Tri/Bi/Tri/Bi/Tri starting Bi.
check('s1 (Alice #1, Feb 01)', byId.s1.focus, ['Bi']);
check('s2 (Alice #2, Feb 08 cancelled — counts!)', byId.s2.focus, ['Tri', 'Chest']);
check('s3 (Alice #3, Feb 15 mixed)', byId.s3.focus, ['Chest', 'Bi']);
check('s4 (Alice #4, Feb 22 mixed)', byId.s4.focus, ['Tri', 'Core']);
check('s8 (Alice #5, Mar 01 — out-of-order in source)', byId.s8.focus, ['Bi']);
check('s9 (Alice #6, Mar 08 — out-of-order in source)', byId.s9.focus, ['Tri']);

// Bob — independent alternation
check('s5 (Bob #1)', byId.s5.focus, ['Bi']);
check('s6 (Bob #2)', byId.s6.focus, ['Tri']);

// Cara — no Arms, focus unchanged
check('s7 (Cara, no Arms)', byId.s7.focus, ['Legs']);

// Type rename — every Custom session
check('s5 type renamed', byId.s5.type, 'Endurance');
check('s6 type renamed', byId.s6.type, 'Endurance');
check('s7 type renamed', byId.s7.type, 'Endurance');
check('s1 type unchanged (was Strength)', byId.s1.type, 'Strength');

// Idempotency — re-run migration on the migrated data, results must be identical
localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
const result2 = loadData();
const byId2 = Object.fromEntries(result2.sessions.map(s => [s.id, s]));
check('idempotent: s1 still Bi', byId2.s1.focus, ['Bi']);
check('idempotent: s2 still Tri+Chest', byId2.s2.focus, ['Tri', 'Chest']);
check('idempotent: s5 still Endurance', byId2.s5.type, 'Endurance');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
