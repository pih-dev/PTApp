// Sanity: P1 — historical session ordinals must resolve the package CONTAINING the
// session's date (not always the current package), and P2 — the per-client counted-session
// index must be memoized per sessions-array and equivalent to the unmemoized math.
// Run: node scripts/sanity/sanity-historical-ordinals.mjs
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const utils = await import(utilsUrl);

const {
  getEffectiveSessionCount, getPackageForDate, getEffectivePeriod,
  getClientCountedSessions, getSessionOrdinal, getPeriodSessionCount,
  resolvePackagePeriod,
} = utils;

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

const S = (id, clientId, date, extra = {}) =>
  ({ id, clientId, date, time: '10:00', type: 'Strength', status: 'completed', ...extra });

// ── Fixture: contract client renewed once. March package (closed, contract 10),
//    April package (open, contract 10). RENEW_PACKAGE semantics: old.end = newStart - 1.
const renewedContract = {
  id: 'c1', name: 'RenewedContract',
  packages: [
    { id: 'pkgA', start: '2026-03-01', end: '2026-03-31', periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: '2026-04-01T08:00:00Z', closedBy: 'manual', notes: '' },
    { id: 'pkgB', start: '2026-04-01', end: null, periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: null, closedBy: null, notes: '' },
  ],
};
const renewedSessions = [
  S('m1', 'c1', '2026-03-05'),
  S('m2', 'c1', '2026-03-10'),
  S('m3', 'c1', '2026-03-15'),
  S('a1', 'c1', '2026-04-02'),
  S('a2', 'c1', '2026-04-09'),
];

// 1. P1 core: pre-renewal sessions get their own 1..N ordinals, not (current count + 1)
assert(getEffectiveSessionCount(renewedContract, renewedSessions[0], renewedSessions).effective === 1,
  `March session #1 ordinal = 1 (got ${getEffectiveSessionCount(renewedContract, renewedSessions[0], renewedSessions).effective})`);
assert(getEffectiveSessionCount(renewedContract, renewedSessions[1], renewedSessions).effective === 2,
  `March session #2 ordinal = 2 (got ${getEffectiveSessionCount(renewedContract, renewedSessions[1], renewedSessions).effective})`);
assert(getEffectiveSessionCount(renewedContract, renewedSessions[2], renewedSessions).effective === 3,
  `March session #3 ordinal = 3 (got ${getEffectiveSessionCount(renewedContract, renewedSessions[2], renewedSessions).effective})`);

// 2. Current-package sessions still count within their own package only
assert(getEffectiveSessionCount(renewedContract, renewedSessions[3], renewedSessions).effective === 1,
  `April session #1 ordinal = 1 (got ${getEffectiveSessionCount(renewedContract, renewedSessions[3], renewedSessions).effective})`);
assert(getEffectiveSessionCount(renewedContract, renewedSessions[4], renewedSessions).effective === 2,
  `April session #2 ordinal = 2 (got ${getEffectiveSessionCount(renewedContract, renewedSessions[4], renewedSessions).effective})`);

// 3. getPackageForDate resolution
assert(getPackageForDate(renewedContract, '2026-03-15').id === 'pkgA', 'date inside closed package → that package');
assert(getPackageForDate(renewedContract, '2026-04-15').id === 'pkgB', 'date inside open package → current package');
assert(getPackageForDate(renewedContract, '2026-02-10').id === 'pkgA', 'date before first package → first package (backward extrapolation)');
assert(getPackageForDate(renewedContract, '2026-03-31').id === 'pkgA', 'boundary: closed package end day → closed package');
assert(getPackageForDate(renewedContract, '2026-04-01').id === 'pkgB', 'boundary: new package start day → new package');

// 4. Closed contract package period is capped at pkg.end (not open-ended)
const closedPeriod = getEffectivePeriod(renewedContract.packages[0], '2026-03-15');
assert(closedPeriod.start === '2026-03-01' && closedPeriod.end === '2026-03-31',
  `closed contract period = Mar 1..Mar 31 (got ${closedPeriod.start}..${closedPeriod.end})`);
const openPeriod = getEffectivePeriod(renewedContract.packages[1], '2026-04-15');
assert(openPeriod.start === '2026-04-01' && openPeriod.end === null,
  'open contract period stays open-ended (end: null)');

// 5. Override scoping: the CLOSED package's override applies to its own sessions only
const renewedWithOldOverride = {
  ...renewedContract,
  packages: [
    { ...renewedContract.packages[0], sessionCountOverride: { type: 'delta', value: 2, periodStart: '2026-03-01' } },
    renewedContract.packages[1],
  ],
};
assert(getEffectiveSessionCount(renewedWithOldOverride, renewedSessions[2], renewedSessions).effective === 5,
  `closed-package delta override applies to its sessions: 3+2 = 5 (got ${getEffectiveSessionCount(renewedWithOldOverride, renewedSessions[2], renewedSessions).effective})`);
assert(getEffectiveSessionCount(renewedWithOldOverride, renewedSessions[3], renewedSessions).effective === 1,
  'closed-package override does NOT leak onto current-package sessions');

// 6. Override scoping: the CURRENT package's override does not touch historical sessions
const renewedWithNewOverride = {
  ...renewedContract,
  packages: [
    renewedContract.packages[0],
    { ...renewedContract.packages[1], sessionCountOverride: { type: 'delta', value: 4, periodStart: '2026-04-01' } },
  ],
};
assert(getEffectiveSessionCount(renewedWithNewOverride, renewedSessions[0], renewedSessions).effective === 1,
  'current-package override does NOT leak onto historical sessions');
assert(getEffectiveSessionCount(renewedWithNewOverride, renewedSessions[3], renewedSessions).effective === 5,
  `current-package override applies to current sessions: 1+4 = 5 (got ${getEffectiveSessionCount(renewedWithNewOverride, renewedSessions[3], renewedSessions).effective})`);

// 7. Sliding-window client renewed mid-window: closed package's window is capped at pkg.end
//    so next-package sessions never bleed into the old count. Anchor Mar 1 monthly,
//    renewed Apr 15 → closed end Apr 14. Session Apr 10 sits in window Apr 1..Apr 30,
//    which must cap to Apr 1..Apr 14.
const renewedSliding = {
  id: 'c2', name: 'RenewedSliding',
  packages: [
    { id: 'pkgS1', start: '2026-03-01', end: '2026-04-14', periodUnit: 'month', periodValue: 1,
      contractSize: null, sessionCountOverride: null, closedAt: '2026-04-15T08:00:00Z', closedBy: 'manual', notes: '' },
    { id: 'pkgS2', start: '2026-04-15', end: null, periodUnit: 'month', periodValue: 1,
      contractSize: null, sessionCountOverride: null, closedAt: null, closedBy: null, notes: '' },
  ],
};
const slidingSessions = [
  S('w1', 'c2', '2026-04-02'),
  S('w2', 'c2', '2026-04-10'),
  S('w3', 'c2', '2026-04-16'), // belongs to pkgS2
];
const cappedWindow = getEffectivePeriod(renewedSliding.packages[0], '2026-04-10');
assert(cappedWindow.end === '2026-04-14',
  `closed sliding window capped at pkg.end (got ${cappedWindow.end})`);
assert(getEffectiveSessionCount(renewedSliding, slidingSessions[1], slidingSessions).effective === 2,
  `closed-window ordinal counts only own-package sessions: 2 (got ${getEffectiveSessionCount(renewedSliding, slidingSessions[1], slidingSessions).effective})`);
assert(getEffectiveSessionCount(renewedSliding, slidingSessions[2], slidingSessions).effective === 1,
  `next sliding package restarts at 1 (got ${getEffectiveSessionCount(renewedSliding, slidingSessions[2], slidingSessions).effective})`);

// 8. Single-package sliding client: pre-anchor session still backward-extrapolates (regression guard)
const singleSliding = {
  id: 'c3', name: 'SingleSliding',
  packages: [{ id: 'pkgO', start: '2026-04-01', end: null, periodUnit: 'month', periodValue: 1,
    contractSize: null, sessionCountOverride: null, closedAt: null, closedBy: null, notes: '' }],
};
const preAnchor = [S('p1', 'c3', '2026-03-20'), S('p2', 'c3', '2026-03-25')];
assert(getEffectiveSessionCount(singleSliding, preAnchor[1], preAnchor).effective === 2,
  `pre-anchor sliding session extrapolates backward: 2 (got ${getEffectiveSessionCount(singleSliding, preAnchor[1], preAnchor).effective})`);

// ── Messy real-world package shapes (modeled on live client Elie Jabbour) ──
// Zero-day artifacts (end = start − 1, covering NO dates), duplicate starts, overlapping
// closed packages, and sessions that predate every package. The resolver must skip
// zero-coverage packages, prefer containment (newest wins on overlap), and bucket
// pre-package contract-era sessions into a synthetic pre-era period.
const messy = {
  id: 'c4', name: 'MessyRenewals',
  packages: [
    // zero-day artifact WITH an active override — must never win resolution nor leak its override
    { id: 'pkgZ1', start: '2026-04-16', end: '2026-04-15', periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: { type: 'delta', value: 6, periodStart: '2026-04-16' },
      closedAt: '2026-05-06T16:00:00Z', closedBy: 'manual', notes: '' },
    // real closed contract package, overlapped by the next one
    { id: 'pkgR1', start: '2026-04-16', end: '2026-05-07', periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: '2026-05-07T17:00:00Z', closedBy: 'auto', notes: '' },
    { id: 'pkgZ2', start: '2026-04-16', end: '2026-04-15', periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: '2026-05-07T17:09:00Z', closedBy: 'manual', notes: '' },
    // overlapping re-do of pkgR1 (newest containment must win)
    { id: 'pkgR2', start: '2026-04-16', end: '2026-05-08', periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: '2026-05-11T09:41:00Z', closedBy: 'manual', notes: '' },
    // current open sliding package, starting after a gap (May 9..May 15 uncovered)
    { id: 'pkgCur', start: '2026-05-16', end: null, periodUnit: 'month', periodValue: 1,
      contractSize: null, sessionCountOverride: null, closedAt: null, closedBy: null, notes: '' },
  ],
};
const messySessions = [
  S('e1', 'c4', '2026-04-02', { status: 'cancelled' }),          // pre-era, uncounted
  S('e2', 'c4', '2026-04-07', { status: 'cancelled', cancelCounted: true }),
  S('e3', 'c4', '2026-04-09'),
  S('e4', 'c4', '2026-04-14'),
  S('e5', 'c4', '2026-04-16'),
  S('e6', 'c4', '2026-04-20'),
  S('e7', 'c4', '2026-05-08'),
  S('e8', 'c4', '2026-05-20'),
];

// 13. Zero-day packages never win; overlapping containment resolves to the NEWEST package
assert(getPackageForDate(messy, '2026-04-20').id === 'pkgR2',
  `overlap resolves to newest containing package (got ${getPackageForDate(messy, '2026-04-20').id})`);
assert(getPackageForDate(messy, '2026-05-20').id === 'pkgCur', 'open package contains its dates');

// 14. Pre-package contract era: synthetic bucket [-inf .. first start − 1], zero-day override ignored
assert(getEffectiveSessionCount(messy, messySessions[1], messySessions).effective === 1,
  `pre-era counted-cancel = #1 (got ${getEffectiveSessionCount(messy, messySessions[1], messySessions).effective})`);
assert(getEffectiveSessionCount(messy, messySessions[2], messySessions).effective === 2,
  `pre-era session = #2 (got ${getEffectiveSessionCount(messy, messySessions[2], messySessions).effective})`);
assert(getEffectiveSessionCount(messy, messySessions[3], messySessions).effective === 3,
  `pre-era session = #3 (got ${getEffectiveSessionCount(messy, messySessions[3], messySessions).effective})`);
const preEra = resolvePackagePeriod(messy, '2026-04-09');
assert(preEra.period.end === '2026-04-15',
  `pre-era bucket ends the day before the first real package starts (got ${preEra.period.end})`);

// 15. In-package sessions count within the (newest) containing package's full range
assert(getEffectiveSessionCount(messy, messySessions[4], messySessions).effective === 1,
  `Apr 16 session = #1 of its package (got ${getEffectiveSessionCount(messy, messySessions[4], messySessions).effective})`);
assert(getEffectiveSessionCount(messy, messySessions[6], messySessions).effective === 3,
  `May 8 session = #3 of its package (got ${getEffectiveSessionCount(messy, messySessions[6], messySessions).effective})`);

// 16. Gap date before a SLIDING package: backward-extrapolated window (lead-in era)
const gapResolved = resolvePackagePeriod(messy, '2026-05-12');
assert(gapResolved.pkg.id === 'pkgCur', `gap date leads into the next package (got ${gapResolved.pkg.id})`);
assert(gapResolved.period.start === '2026-04-16' && gapResolved.period.end === '2026-05-15',
  `gap date gets the backward sliding window Apr 16..May 15 (got ${gapResolved.period.start}..${gapResolved.period.end})`);

// 17. Current open sliding package unaffected
assert(getEffectiveSessionCount(messy, messySessions[7], messySessions).effective === 1,
  `current-window session = #1 (got ${getEffectiveSessionCount(messy, messySessions[7], messySessions).effective})`);

// 18. Gap date before a CONTRACT package: bucket spans [prev valid end + 1 .. start − 1]
const gapContract = {
  id: 'c5', name: 'GapContract',
  packages: [
    { id: 'pkgG1', start: '2026-03-01', end: '2026-03-31', periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: '2026-04-01T08:00:00Z', closedBy: 'manual', notes: '' },
    { id: 'pkgG2', start: '2026-05-01', end: null, periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null, closedAt: null, closedBy: null, notes: '' },
  ],
};
const gapSessions = [S('g1', 'c5', '2026-04-10'), S('g2', 'c5', '2026-04-20')];
const gapPeriod = resolvePackagePeriod(gapContract, '2026-04-10');
assert(gapPeriod.pkg.id === 'pkgG2' && gapPeriod.period.start === '2026-04-01' && gapPeriod.period.end === '2026-04-30',
  `contract gap bucket = Apr 1..Apr 30 (got ${gapPeriod.pkg.id} ${gapPeriod.period.start}..${gapPeriod.period.end})`);
assert(getEffectiveSessionCount(gapContract, gapSessions[1], gapSessions).effective === 2,
  `gap session ordinal = 2 within gap bucket (got ${getEffectiveSessionCount(gapContract, gapSessions[1], gapSessions).effective})`);

// ── P2: memoized per-client counted-session index ──

// 9. Identity: same sessions array → same cached array instance (this is the memoization)
const idxA = getClientCountedSessions(renewedSessions, 'c1');
const idxB = getClientCountedSessions(renewedSessions, 'c1');
assert(idxA === idxB, 'getClientCountedSessions returns the SAME array instance for the same sessions array');

// 10. New array (immutable reducer update) → fresh index
const renewedSessions2 = [...renewedSessions, S('a3', 'c1', '2026-04-20')];
const idxC = getClientCountedSessions(renewedSessions2, 'c1');
assert(idxC !== idxA && idxC.length === idxA.length + 1, 'new sessions array → recomputed index');

// 11. Filtering + ordering semantics preserved: cancelled-uncounted excluded,
//     cancelled-counted included, sorted by date then time
const mixed = [
  S('x3', 'c9', '2026-05-03'),
  S('x1', 'c9', '2026-05-01', { status: 'cancelled' }),                       // excluded
  S('x2', 'c9', '2026-05-02', { status: 'cancelled', cancelCounted: true }),  // included
  S('x0', 'c9', '2026-05-03', { time: '08:00' }),                             // same date, earlier time
  S('y1', 'other', '2026-05-01'),                                             // other client
];
const counted = getClientCountedSessions(mixed, 'c9');
assert(counted.map(s => s.id).join(',') === 'x2,x0,x3',
  `counted index = x2,x0,x3 (got ${counted.map(s => s.id).join(',')})`);

// 12. Equivalence: getSessionOrdinal / getPeriodSessionCount agree with brute-force math
const brute = (sessions, clientId, start, end) => sessions
  .filter(s => s.clientId === clientId && s.date >= start && (end == null || s.date <= end) &&
    (s.status !== 'cancelled' || s.cancelCounted))
  .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
const bruteList = brute(mixed, 'c9', '2026-05-01', null);
assert(getPeriodSessionCount(mixed, 'c9', '2026-05-01', null) === bruteList.length,
  'getPeriodSessionCount matches brute force');
assert(getSessionOrdinal(mixed, mixed.find(s => s.id === 'x3'), '2026-05-01', null) === bruteList.findIndex(s => s.id === 'x3') + 1,
  'getSessionOrdinal matches brute force');

// 13. P6 — the kernel PROJECTS a session that is not in the array yet.
//
// 🔴 This replaces the old `length + 1` fallback, which was not just a guard but
//    a WRONG ANSWER. React batching means the just-dispatched session is often
//    absent (the 2026-04-19 "Session #0" WhatsApp message), and every call site
//    had grown its own workaround. `length + 1` assumes the missing session
//    sorts LAST — true for a booking made today, false for one booked into a
//    past date inside the current period, where it overstated the number AND
//    left every later session showing a number it now shares.
const bruteAt = (sess) => brute([...mixed, sess], 'c9', '2026-05-01', null)
  .findIndex(s => s.id === sess.id) + 1;

const futureBooking = S('new-late', 'c9', '2026-05-20', { time: '10:00' });
assert(getSessionOrdinal(mixed, futureBooking, '2026-05-01', null) === bruteAt(futureBooking),
  `a not-yet-dispatched LATER session is projected to its true position (${bruteAt(futureBooking)})`);

// The case the old fallback got wrong. x2/x0/x3 are 2026-05-01, 05-03 08:00, 05-03 09:00,
// so a booking on 05-02 must be #2, not #4.
const pastBooking = S('new-early', 'c9', '2026-05-02', { time: '11:00' });
assert(getSessionOrdinal(mixed, pastBooking, '2026-05-01', null) === 2,
  `🔴 a session booked into a PAST date slots in by date, not at the end (got ${getSessionOrdinal(mixed, pastBooking, '2026-05-01', null)}, old code said ${bruteList.length + 1})`);
assert(getSessionOrdinal(mixed, pastBooking, '2026-05-01', null) === bruteAt(pastBooking),
  'and it agrees with brute force');

// The guard the fallback was there for still holds: never 0, ever.
assert(getSessionOrdinal([], S('solo', 'c9', '2026-05-05'), '2026-05-01', null) === 1,
  'the first session of an empty period is #1, never #0');

// 14. A FORGIVEN CANCEL HAS NO ORDINAL.
//
// 🔴 getClientCountedSessions deliberately excludes a cancelled session the PT
//    forgave — it consumes none of the client's paid sessions. The old code
//    still printed a number for it: findIndex missed and `length + 1` produced
//    whatever the NEXT session's number would be. The archived live snapshot had
//    44 of these, e.g. "#11" on a session that counts for zero. Projecting it
//    positionally would be a different wrong answer; null is the right one, and
//    SessionCountPair renders nothing for it.
const forgiven = S('cx', 'c9', '2026-05-02', { status: 'cancelled' });
assert(getSessionOrdinal([...mixed, forgiven], forgiven, '2026-05-01', null) === null,
  'a forgiven cancel has NO ordinal (null, not a number)');

// A cancel the PT decided still counts is an ordinary counted session.
const chargedCancel = S('cy', 'c9', '2026-05-02', { status: 'cancelled', cancelCounted: true });
assert(getSessionOrdinal([...mixed, chargedCancel], chargedCancel, '2026-05-01', null) === 2,
  'a cancel marked cancelCounted DOES get its ordinal (it consumed a session)');

console.log('\nHistorical-ordinals sanity: PASS');
