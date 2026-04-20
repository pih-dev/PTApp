// Sanity: feed migrateData a synthetic v2 state, assert v3 shape is correct
// and session counts are preserved.
// Run: node tmp/sanity-migration.mjs
// Delete after v2.9 ships.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Vite-style import — utils.js uses ES modules
// Use import.meta.url directly — new URL('../src/utils.js', import.meta.url) already
// produces a file:// URL with the correct path; no need to re-wrap in pathToFileURL.
const utilsUrl = new URL('../src/utils.js', import.meta.url).href;
const { loadData } = await import(utilsUrl);

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
assert(migrated.auditLog.length === 3, 'three package_created audit entries');

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

console.log('\nMigration sanity: PASS');
