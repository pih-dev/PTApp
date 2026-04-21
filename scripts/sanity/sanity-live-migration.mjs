// Live-data migration diff: feed the PT's real v2 backup through migrateData,
// assert no data is lost and every client ends up with a well-formed package.
// Run: node scripts/sanity/sanity-live-migration.mjs
//
// Input: scripts/sanity/live-snapshot-v2.8.json — exported via General panel → Export backup.
//        (Gitignored — never commit; contains real PT client data.)
// Output: prints before/after summary + any field drops to stderr. Exits 1 on anomalies.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, 'live-snapshot-v2.8.json');

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.error(`✗ Missing ${SNAPSHOT_PATH}`);
  console.error('  Export live data via General → Export backup, save as live-snapshot-v2.8.json in scripts/sanity/');
  process.exit(1);
}

const rawJson = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
const live = JSON.parse(rawJson);

// Capture pre-migration state for diff
const preCounts = {
  version: live._dataVersion,
  clients: (live.clients || []).length,
  sessions: (live.sessions || []).length,
  todos: (live.todos || []).length,
  clientsWithOverride: (live.clients || []).filter(c => c.sessionCountOverride).length,
  clientsWithPeriodStart: (live.clients || []).filter(c => c.periodStart).length,
  clientsWithPeriodLength: (live.clients || []).filter(c => c.periodLength).length,
};

console.log('── PRE-MIGRATION ─────────────────────────────');
console.log(`  _dataVersion:             ${preCounts.version}`);
console.log(`  clients:                  ${preCounts.clients}`);
console.log(`  sessions:                 ${preCounts.sessions}`);
console.log(`  todos:                    ${preCounts.todos}`);
console.log(`  clients w/ override:      ${preCounts.clientsWithOverride}`);
console.log(`  clients w/ periodStart:   ${preCounts.clientsWithPeriodStart}`);
console.log(`  clients w/ periodLength:  ${preCounts.clientsWithPeriodLength}`);

// Simulate localStorage so loadData can migrate it
global.localStorage = {
  _data: { 'ptapp-data': rawJson },
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
};

const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { loadData } = await import(utilsUrl);

const migrated = loadData();

const postCounts = {
  version: migrated._dataVersion,
  clients: migrated.clients.length,
  sessions: migrated.sessions.length,
  todos: (migrated.todos || []).length,
  auditEntries: (migrated.auditLog || []).length,
  clientsWithPackages: migrated.clients.filter(c => Array.isArray(c.packages) && c.packages.length > 0).length,
  clientsWithActiveOverride: migrated.clients.filter(c => {
    const pkg = c.packages && c.packages[c.packages.length - 1];
    return pkg && pkg.sessionCountOverride != null;
  }).length,
  clientsWithoutPackages: migrated.clients.filter(c => !Array.isArray(c.packages) || c.packages.length === 0).length,
  clientsWithLegacyFields: migrated.clients.filter(c =>
    c.periodStart !== undefined || c.periodLength !== undefined ||
    c.sessionCountOverride !== undefined || c.overridePeriodStart !== undefined
  ).length,
};

console.log('\n── POST-MIGRATION ────────────────────────────');
console.log(`  _dataVersion:                 ${postCounts.version}`);
console.log(`  clients:                      ${postCounts.clients}`);
console.log(`  sessions:                     ${postCounts.sessions}`);
console.log(`  todos:                        ${postCounts.todos}`);
console.log(`  auditLog entries:             ${postCounts.auditEntries}`);
console.log(`  clients w/ packages[]:        ${postCounts.clientsWithPackages}`);
console.log(`  clients w/ active override:   ${postCounts.clientsWithActiveOverride}`);

let failed = false;

function check(cond, msg) {
  if (!cond) { console.error(`✗ ${msg}`); failed = true; }
  else       { console.log(`✓ ${msg}`); }
}

console.log('\n── INVARIANTS ────────────────────────────────');
check(postCounts.version === 3, 'dataVersion bumped to 3');
check(postCounts.clients === preCounts.clients, 'no clients lost');
check(postCounts.sessions === preCounts.sessions, 'no sessions lost');
check(postCounts.todos === preCounts.todos, 'no todos lost');
check(postCounts.clientsWithPackages === preCounts.clients, 'every client has packages[]');
check(postCounts.clientsWithoutPackages === 0, 'no client left without a package');
check(postCounts.clientsWithLegacyFields === 0, 'no client has leftover legacy root fields');
check(postCounts.auditEntries === preCounts.clients, `auditLog has ${preCounts.clients} package_created entries (one per client)`);

// Active overrides: v2 had N active overrides, v3 should carry them forward as long as the
// stamp matches the current period. Stale overrides are intentionally dropped. So post ≤ pre.
check(
  postCounts.clientsWithActiveOverride <= preCounts.clientsWithOverride,
  `active overrides preserved or fewer (pre: ${preCounts.clientsWithOverride}, post: ${postCounts.clientsWithActiveOverride})`
);

// Spot-check: every package has required fields
const malformed = migrated.clients.filter(c => {
  const pkg = c.packages[c.packages.length - 1];
  return !pkg || !pkg.id || !pkg.start || !pkg.periodUnit || !pkg.periodValue;
});
check(malformed.length === 0, `all current packages have {id, start, periodUnit, periodValue} (${malformed.length} malformed)`);
if (malformed.length > 0) {
  console.error('  Malformed clients:', malformed.map(c => c.name || c.id));
}

// Spot-check: session counts preserved — every session still maps to a valid clientId
const orphanSessions = migrated.sessions.filter(s => !migrated.clients.find(c => c.id === s.clientId));
check(orphanSessions.length === 0, `no orphan sessions (${orphanSessions.length} with missing clientId)`);

console.log('');
if (failed) {
  console.error('── FAIL: live migration has anomalies — DO NOT DEPLOY ──');
  process.exit(1);
}
console.log('── PASS: live migration safe to deploy ──');
