// v2.13 deploy gate: feed the archived LIVE snapshot (v5) through loadData and prove
// the v5→v6 migration changes NOTHING except _dataVersion and the new programs[].
// (sanity-live-migration.mjs is v2→v3-era and asserts version===3 — stale; sanity-live-v5-diff.mjs
// is the v2.11 historical gate, kept untouched; this is the precise gate for THIS release.)
import fs from 'fs';

const SNAP = 'C:/projects/_archive/PTApp/data-snapshots/2026-07-06-pre-v2.12-data.json';
const rawJson = fs.readFileSync(SNAP, 'utf8');
const before = JSON.parse(rawJson);

global.localStorage = {
  _data: { 'ptapp-data': rawJson },
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
};
const { loadData } = await import(new URL('../../src/utils.js', import.meta.url).href);
const after = loadData();

let failed = false;
const check = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed = true; };

console.log(`snapshot: _dataVersion=${before._dataVersion}, clients=${(before.clients||[]).length}, sessions=${(before.sessions||[]).length}, evaluations=${(before.evaluations||[]).length}, audit=${(before.auditLog||[]).length}`);

check(before._dataVersion === 5, 'snapshot is v5 (the live schema before this release)');
check(after._dataVersion === 6, 'migrated to v6');
check(Array.isArray(after.programs) && after.programs.length === 0, 'programs[] added, empty');

// Byte-level: every pre-existing collection must be IDENTICAL after migration.
for (const key of ['clients', 'sessions', 'todos', 'auditLog', 'messageTemplates', 'evaluations']) {
  const a = JSON.stringify(before[key] ?? (key === 'messageTemplates' ? {} : []));
  const b = JSON.stringify(after[key]);
  check(a === b, `${key}: byte-identical after migration`);
  if (a !== b) {
    // locate first differing record for forensics
    const A = before[key] || [], B = after[key] || [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (JSON.stringify(A[i]) !== JSON.stringify(B[i])) {
        console.error(`  first diff at index ${i}:`);
        console.error('  before:', JSON.stringify(A[i])?.slice(0, 300));
        console.error('  after: ', JSON.stringify(B[i])?.slice(0, 300));
        break;
      }
    }
  }
}
check(after._lastModified === before._lastModified, '_lastModified untouched (no spurious stamp)');

console.log('');
console.log(failed ? '── FAIL: DO NOT DEPLOY ──' : 'live diff clean: only _dataVersion + programs[] added');
process.exit(failed ? 1 : 0);
