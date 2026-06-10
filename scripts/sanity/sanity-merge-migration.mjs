// Sanity: mergeData/mergeBackup must migrate FOREIGN blobs before merging (v2.10.1, review C2).
// A device on an old cached bundle (or an old backup file) can hand us pre-v3/v4 records;
// if they're union-merged raw and the blob is stamped with Math.max(_dataVersion), loadData's
// migrateData never touches them again — packageless clients / 'Arms' tags / 'Custom' type
// would be frozen broken forever. These checks prove old records are normalized on the way in.
//
// Uses the PT's real live snapshot when present (path below, see _archive convention);
// falls back to a synthetic live blob so the structural checks always run.
import { readFileSync, existsSync } from 'fs';
import { mergeData, mergeBackup } from '../../src/utils.js';

const SNAPSHOT = 'C:/projects/_archive/PTApp/data-snapshots/2026-06-10-pre-fable5-review-data.json';
const live = existsSync(SNAPSHOT)
  ? JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
  : {
      _dataVersion: 4,
      _lastModified: '2026-06-10T00:00:00.000Z',
      clients: [{ id: 'c1', name: 'Live Client', phone: '70000000', packages: [{ id: 'pkg_live1', start: '2026-06-01', end: null, periodUnit: 'month', periodValue: 1, contractSize: null, sessionCountOverride: null, notes: '', closedAt: null, closedBy: null }], _modified: '2026-06-01T00:00:00.000Z' }],
      sessions: [{ id: 's1', clientId: 'c1', date: '2026-06-05', time: '10:00', duration: 45, type: 'Strength', status: 'completed', _modified: '2026-06-05T00:00:00.000Z' }],
      todos: [],
      auditLog: [],
      messageTemplates: {},
    };
if (!existsSync(SNAPSHOT)) console.log('(live snapshot not found — running against synthetic fixture)');

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? '✓ ' : '✗ ') + name); };

// 1. Self-merge: nothing lost, nothing duplicated
const self = mergeData(structuredClone(live), structuredClone(live));
check('self-merge keeps client count', self.clients.length === live.clients.length);
check('self-merge keeps session count', self.sessions.length === live.sessions.length);
check('self-merge keeps todos', (self.todos || []).length === (live.todos || []).length);
check('self-merge keeps auditLog', (self.auditLog || []).length === (live.auditLog || []).length);

// 2. Old-device remote: pre-v3 client (root fields, no packages) + 'Arms'/'Custom' session
const remoteOld = {
  _dataVersion: 2,
  _lastModified: '2026-06-01T00:00:00.000Z',
  clients: [{ id: 'old_c1', name: 'legacy client', phone: '70123456', periodStart: '2026-05-01', periodLength: '1month', _modified: '2026-06-01T00:00:00.000Z' }],
  sessions: [{ id: 'old_s1', clientId: 'old_c1', date: '2026-05-10', time: '10:00', duration: 45, type: 'Custom', focus: ['Arms', 'Chest'], status: 'completed', _modified: '2026-06-01T00:00:00.000Z' }],
  todos: [],
};
const remoteRef = structuredClone(remoteOld);
const merged = mergeData(structuredClone(live), remoteOld);
const mc = merged.clients.find(c => c.id === 'old_c1');
const ms = merged.sessions.find(s => s.id === 'old_s1');
check('old client admitted', !!mc);
check('old client got packages[] via migration', Array.isArray(mc.packages) && mc.packages.length === 1);
check('old client root periodStart removed', mc.periodStart === undefined);
check('old session type Custom→Endurance', ms.type === 'Endurance');
check('old session Arms tag rewritten', !ms.focus.includes('Arms') && ms.focus.includes('Bi'));
check('live records untouched', merged.clients.length === live.clients.length + 1 && merged.sessions.length === live.sessions.length + 1);
check('merged _dataVersion is 4', merged._dataVersion === 4);
// mergeData must NOT mutate the caller's remote — reconcile() compares merged against
// it to decide whether to push the upgraded blob back to the server.
check('caller remote object NOT mutated', remoteOld.clients[0].periodStart === remoteRef.clients[0].periodStart && remoteOld._dataVersion === 2);

// 3. mergeBackup with an old-format backup
const backupOld = structuredClone(remoteRef);
const restored = mergeBackup(structuredClone(live), backupOld);
const rc = restored.clients.find(c => c.id === 'old_c1');
const rs = restored.sessions.find(s => s.id === 'old_s1');
check('backup client restored with packages[]', !!rc && Array.isArray(rc.packages) && rc.packages.length === 1);
check('backup session migrated (Endurance, no Arms)', rs.type === 'Endurance' && !rs.focus.includes('Arms'));
check('backup restore keeps all live records', restored.clients.length === live.clients.length + 1 && restored.sessions.length === live.sessions.length + 1);
// Migration-synthesized audit entries for clients ALREADY in live must not import
// (their synthesized packages were discarded; the entries would be forensic orphans).
const liveIds = new Set(live.clients.map(c => c.id));
const orphanAudit = (restored.auditLog || []).filter(e =>
  e.trigger && e.trigger.reason === 'migration v2→v3' && liveIds.has(e.clientId) &&
  !(live.auditLog || []).some(le => le.id === e.id));
check('no orphan migration audit entries imported', orphanAudit.length === 0);

// 4. Malformed backup (missing arrays) must not crash
let crashed = false;
try { mergeBackup(structuredClone(live), { _dataVersion: 1 }); } catch (e) { crashed = true; }
check('malformed backup (no arrays) handled', !crashed);

console.log(`\nMerge-migration sanity: ${fail ? 'FAIL' : 'PASS'} (${pass} passed, ${fail} failed)`);
process.exit(fail ? 1 : 0);
