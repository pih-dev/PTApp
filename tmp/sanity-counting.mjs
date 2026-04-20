// Sanity: verify counting and renewal detection on synthetic v3 clients.
// Run: node tmp/sanity-counting.mjs
// Delete after v2.9 ships.
const utilsUrl = new URL('../src/utils.js', import.meta.url).href;
const utils = await import(utilsUrl);

const { getEffectiveClientCount, isRenewalDue } = utils;

const today = '2026-04-20';

const clientNoContract = {
  id: 'c1', name: 'NoContract',
  packages: [{
    id: 'pkg1', start: '2026-04-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: null, sessionCountOverride: null,
    closedAt: null, closedBy: null, notes: '',
  }],
};

const clientWithContract = {
  id: 'c2', name: 'WithContract',
  packages: [{
    id: 'pkg2', start: '2026-03-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: 10, sessionCountOverride: null,
    closedAt: null, closedBy: null, notes: '',
  }],
};

const clientOverride = {
  id: 'c3', name: 'OverrideActive',
  packages: [{
    id: 'pkg3', start: '2026-03-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: 10,
    sessionCountOverride: { type: 'delta', value: 2, periodStart: '2026-03-01' },
    closedAt: null, closedBy: null, notes: '',
  }],
};

const makeSessions = (clientId, count, startDate) => {
  const arr = [];
  const d = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `s_${clientId}_${i}`, clientId,
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      time: '10:00', type: 'Strength', status: i < count - 2 ? 'completed' : 'scheduled',
    });
    d.setDate(d.getDate() + 2);
  }
  return arr;
};

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// 1. No-contract client: 3 sessions in current sliding window
const nc = getEffectiveClientCount(clientNoContract, makeSessions('c1', 3, '2026-04-03'), today);
assert(nc.effective === 3, `no-contract auto count = 3 (got ${nc.effective})`);
assert(!isRenewalDue(clientNoContract, makeSessions('c1', 3, '2026-04-03')), 'no-contract never renewal-due');

// 2. Contract client: 8 of 10 → NOT due
const contractSessions8 = makeSessions('c2', 8, '2026-03-05');
const c2_8 = getEffectiveClientCount(clientWithContract, contractSessions8, today);
assert(c2_8.effective === 8, `contract 8/10 auto = 8 (got ${c2_8.effective})`);
assert(!isRenewalDue(clientWithContract, contractSessions8), 'contract 8/10 NOT due');

// 3. Contract client: 10 of 10 → DUE
const contractSessions10 = makeSessions('c2', 10, '2026-03-05');
assert(isRenewalDue(clientWithContract, contractSessions10), 'contract 10/10 IS due');

// 4. Contract client: 11 of 10 (overshoot) → DUE
const contractSessions11 = makeSessions('c2', 11, '2026-03-05');
assert(isRenewalDue(clientWithContract, contractSessions11), 'contract 11/10 IS due');

// 5. Override: 8 auto + override +2 = 10 effective → DUE
const overrideSessions = makeSessions('c3', 8, '2026-03-05');
const ovResult = getEffectiveClientCount(clientOverride, overrideSessions, today);
assert(ovResult.effective === 10, `override 8+2 = 10 (got ${ovResult.effective})`);
assert(isRenewalDue(clientOverride, overrideSessions), 'override-induced threshold IS due');

// 5b. Sliding-window client: active override (periodStart matches current window)
//     contractSize: null → sliding. Anchor Apr 1 → current window (ref Apr 20) is Apr 1..Apr 30.
//     override.periodStart = '2026-04-01' matches → override applies.
const clientSlidingActive = {
  id: 'cs1', name: 'SlidingActive',
  packages: [{
    id: 'pkgs1', start: '2026-04-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: null,
    sessionCountOverride: { type: 'delta', value: 3, periodStart: '2026-04-01' },
    closedAt: null, closedBy: null, notes: '',
  }],
};
const slidingActiveRes = getEffectiveClientCount(clientSlidingActive, makeSessions('cs1', 2, '2026-04-03'), today);
assert(slidingActiveRes.effective === 5, `sliding active override 2+3 = 5 (got ${slidingActiveRes.effective})`);
assert(slidingActiveRes.override !== null, 'sliding active override is attached to result');

// 5c. Sliding-window client: stale override from a previous window is ignored
//     Anchor Mar 1, monthly → window for ref Apr 20 is Apr 1..Apr 30.
//     override.periodStart = '2026-03-01' (last month's start) → stale → ignored.
const clientSlidingStale = {
  id: 'cs2', name: 'SlidingStale',
  packages: [{
    id: 'pkgs2', start: '2026-03-01', end: null,
    periodUnit: 'month', periodValue: 1,
    contractSize: null,
    sessionCountOverride: { type: 'delta', value: 5, periodStart: '2026-03-01' },
    closedAt: null, closedBy: null, notes: '',
  }],
};
// Sessions in Apr only (current window). Override is stale (March).
const slidingStaleRes = getEffectiveClientCount(clientSlidingStale, makeSessions('cs2', 2, '2026-04-03'), today);
assert(slidingStaleRes.effective === 2, `sliding stale override ignored → effective = auto = 2 (got ${slidingStaleRes.effective})`);
assert(slidingStaleRes.override === null, 'sliding stale override returned as null (dropped)');

// 6. Future-dated sessions DO count (no today() capping)
const futureSession = { id: 'sf', clientId: 'c2', date: '2026-05-15', time: '10:00', type: 'Strength', status: 'scheduled' };
const contractWithFuture = [...makeSessions('c2', 9, '2026-03-05'), futureSession];
const withFuture = getEffectiveClientCount(clientWithContract, contractWithFuture, today);
assert(withFuture.effective === 10, `contract 9 past + 1 future = 10 (got ${withFuture.effective})`);
assert(isRenewalDue(clientWithContract, contractWithFuture), 'future session triggers renewal-due');

console.log('\nCounting sanity: PASS');
