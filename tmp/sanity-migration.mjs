// Sanity: feed migrateData a synthetic v2 state, assert v3 shape is correct
// and session counts are preserved.
// Run: node tmp/sanity-migration.mjs
// Delete after v2.9 ships.
// Vite-style import — utils.js uses ES modules.
// Use import.meta.url directly — new URL('../src/utils.js', import.meta.url) already
// produces a file:// URL with the correct path; no need to re-wrap in pathToFileURL.
const utilsUrl = new URL('../src/utils.js', import.meta.url).href;
const { loadData, mergeBackup } = await import(utilsUrl);

// Craft a v2 blob in localStorage-like shape
const v2Blob = {
  _dataVersion: 2,
  clients: [
    // Client A: periodStart+periodLength set, active override
    {
      id: 'cA', name: 'Alice', nickname: 'Al', phone: '96170000001',
      periodStart: '2026-03-02', periodLength: '1month',
      sessionCountOverride: { type: 'delta', value: 2 },
      overridePeriodStart: '2026-04-02',
      _modified: '2026-04-15T10:00:00Z',
    },
    // Client B: no period config, no override, has sessions
    {
      id: 'cB', name: 'Bob', nickname: 'Bo', phone: '96170000002',
      _modified: '2026-04-10T10:00:00Z',
    },
    // Client C: stale override (should NOT be migrated into package)
    {
      id: 'cC', name: 'Cara', nickname: 'Ca', phone: '96170000003',
      periodStart: '2026-03-02', periodLength: '1month',
      sessionCountOverride: { type: 'absolute', value: 99 },
      overridePeriodStart: '2026-02-02',   // stale — doesn't match current period (Apr 2)
      _modified: '2026-04-01T10:00:00Z',
    },
    // Client D: periodLength set but NO periodStart, active override stamped against
    // the legacy today()-anchored window. Must be preserved (regression guard for I1).
    {
      id: 'cD', name: 'Dana', nickname: 'Da', phone: '96170000004',
      periodLength: '1month',
      sessionCountOverride: { type: 'delta', value: 3 },
      overridePeriodStart: null,   // filled at runtime below
      _modified: '2026-04-18T10:00:00Z',
    },
  ],
  sessions: [
    { id: 's1', clientId: 'cA', date: '2026-04-05', time: '10:00', type: 'Strength', status: 'completed' },
    { id: 's2', clientId: 'cA', date: '2026-04-12', time: '10:00', type: 'Strength', status: 'completed' },
    { id: 's3', clientId: 'cB', date: '2026-03-20', time: '10:00', type: 'Strength', status: 'completed' },
  ],
  todos: [],
  messageTemplates: {},
  _lastModified: '2026-04-15T10:00:00Z',
};

// Client D's overridePeriodStart must match what legacy getClientPeriod would have produced
// when periodStart was absent (anchor = today()). Reconstruct it here using the same
// month-anchor-clamp rule so the test stays calendar-agnostic.
const todayStr = new Date().toISOString().slice(0, 10);
const [ty, tm, td] = todayStr.split('-').map(Number);
// Anchor day = today's day. This month's start = that day clamped to month length.
const thisMonthLen = new Date(ty, tm, 0).getDate();
const thisStartDay = Math.min(td, thisMonthLen);
const legacyCurStart = `${ty}-${String(tm).padStart(2, '0')}-${String(thisStartDay).padStart(2, '0')}`;
v2Blob.clients.find(c => c.id === 'cD').overridePeriodStart = legacyCurStart;

// Simulate localStorage for this run
global.localStorage = {
  _data: { 'ptapp-data': JSON.stringify(v2Blob) },
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
};

const migrated = loadData();

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

assert(migrated._dataVersion === 3, 'dataVersion bumped to 3');
assert(Array.isArray(migrated.auditLog), 'auditLog is an array');
assert(migrated.auditLog.length === 4, 'four package_created audit entries');

const A = migrated.clients.find(c => c.id === 'cA');
assert(A.packages && A.packages.length === 1, 'Alice has one package');
assert(A.packages[0].start === '2026-03-02', 'Alice package start matches periodStart');
assert(A.packages[0].periodUnit === 'month' && A.packages[0].periodValue === 1, 'Alice unit/value');
assert(A.packages[0].sessionCountOverride && A.packages[0].sessionCountOverride.value === 2, 'Alice active override migrated');
assert(A.packages[0].sessionCountOverride.periodStart === '2026-04-02', 'Alice override stamped with current period start');
assert(A.periodStart === undefined, 'Alice root periodStart removed');
assert(A.periodLength === undefined, 'Alice root periodLength removed');
assert(A.sessionCountOverride === undefined, 'Alice root override removed');
assert(A.overridePeriodStart === undefined, 'Alice root overridePeriodStart removed');

const B = migrated.clients.find(c => c.id === 'cB');
assert(B.packages[0].start === '2026-03-20', 'Bob package anchored at earliest session date');
assert(B.packages[0].periodUnit === 'month', 'Bob default unit=month');
assert(B.packages[0].sessionCountOverride === null, 'Bob no override');

const C = migrated.clients.find(c => c.id === 'cC');
assert(C.packages[0].sessionCountOverride === null, 'Cara stale override NOT migrated');

// I1 regression: Dana had periodLength but no periodStart; override was stamped
// against the legacy today()-anchored window. After migration, the override must survive.
const D = migrated.clients.find(c => c.id === 'cD');
assert(D.packages[0].sessionCountOverride !== null, 'Dana active override preserved (legacy today() anchor)');
assert(D.packages[0].sessionCountOverride.value === 3, 'Dana override value intact');
assert(D.packages[0].sessionCountOverride.periodStart === legacyCurStart, 'Dana override stamped with legacy anchor start');

// I2 regression: mergeBackup unions auditLog entries from the backup so forensic
// history survives a restore. The migrated state has 4 audit entries; a synthetic
// backup with one additional log entry should end up with 5.
const liveAfterMigration = migrated;
const backup = {
  _dataVersion: 3,
  clients: [], sessions: [], todos: [], messageTemplates: {},
  auditLog: [{
    id: 'log_backup_only',
    ts: '2026-04-01T00:00:00Z',
    clientId: 'cA', clientName: 'Alice',
    event: 'package_created',
    packageId: 'pkg_backup_only', newPackageId: 'pkg_backup_only',
    before: null, after: null,
    trigger: { reason: 'test — backup-only entry' },
  }],
  _lastModified: '2026-04-01T00:00:00Z',
};
const restored = mergeBackup(liveAfterMigration, backup);
assert(restored.auditLog.length === 5, 'mergeBackup unions auditLog (4 live + 1 backup-only)');
assert(restored.auditLog.some(e => e.id === 'log_backup_only'), 'backup audit entry restored');

console.log('\nMigration sanity: PASS');
