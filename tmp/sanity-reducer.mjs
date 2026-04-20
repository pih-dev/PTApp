// Sanity: verify EDIT_CLIENT logs package edits and RENEW_PACKAGE atomically renews.
// Run: node tmp/sanity-reducer.mjs
// Delete after v2.9 ships.
const utilsUrl = new URL('../src/utils.js', import.meta.url).href;
const { baseReducer } = await import(utilsUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// Initial state: one client with one open contract package, empty auditLog
const initialState = {
  _dataVersion: 3,
  clients: [{
    id: 'c1', name: 'Alice', nickname: 'Al', phone: '96170000001',
    packages: [{
      id: 'pkg1', start: '2026-03-01', end: null,
      periodUnit: 'month', periodValue: 1,
      contractSize: 10, sessionCountOverride: null,
      notes: '', closedAt: null, closedBy: null,
    }],
    _modified: '2026-03-01T00:00:00Z',
  }],
  sessions: [],
  todos: [],
  messageTemplates: {},
  auditLog: [],
  _lastModified: '2026-03-01T00:00:00Z',
};

// === EDIT_CLIENT — no package changes → no log entries ===
const noPkgChange = baseReducer(initialState, {
  type: 'EDIT_CLIENT',
  payload: { ...initialState.clients[0], nickname: 'Allie' },
});
assert(noPkgChange.auditLog.length === 0, 'EDIT_CLIENT without package change → no log');
assert(noPkgChange.clients[0].nickname === 'Allie', 'non-package field updated');
assert(noPkgChange.clients[0]._modified !== initialState.clients[0]._modified, '_modified bumped');

// === EDIT_CLIENT — package field change → package_edited entry ===
const editedPkg = baseReducer(initialState, {
  type: 'EDIT_CLIENT',
  payload: {
    ...initialState.clients[0],
    packages: [{
      ...initialState.clients[0].packages[0],
      contractSize: 15,  // changed
    }],
  },
});
assert(editedPkg.auditLog.length === 1, 'EDIT_CLIENT pkg change → one log entry');
assert(editedPkg.auditLog[0].event === 'package_edited', 'event = package_edited');
assert(editedPkg.auditLog[0].before.contractSize === 10, 'before captured old contractSize');
assert(editedPkg.auditLog[0].after.contractSize === 15, 'after captured new contractSize');

// === EDIT_CLIENT — override set → override_set entry ===
const overrideSet = baseReducer(initialState, {
  type: 'EDIT_CLIENT',
  payload: {
    ...initialState.clients[0],
    packages: [{
      ...initialState.clients[0].packages[0],
      sessionCountOverride: { type: 'delta', value: 2, periodStart: '2026-03-01' },
    }],
  },
});
assert(overrideSet.auditLog.length === 1, 'EDIT_CLIENT override set → one entry');
assert(overrideSet.auditLog[0].event === 'override_set', 'event = override_set');
assert(overrideSet.auditLog[0].before.sessionCountOverride === null, 'before captured null override');

// === EDIT_CLIENT — override cleared → override_cleared entry ===
const withOverride = {
  ...initialState,
  clients: [{
    ...initialState.clients[0],
    packages: [{
      ...initialState.clients[0].packages[0],
      sessionCountOverride: { type: 'delta', value: 2, periodStart: '2026-03-01' },
    }],
  }],
};
const overrideCleared = baseReducer(withOverride, {
  type: 'EDIT_CLIENT',
  payload: {
    ...withOverride.clients[0],
    packages: [{
      ...withOverride.clients[0].packages[0],
      sessionCountOverride: null,
    }],
  },
});
assert(overrideCleared.auditLog.length === 1, 'EDIT_CLIENT override cleared → one entry');
assert(overrideCleared.auditLog[0].event === 'override_cleared', 'event = override_cleared');

// === EDIT_CLIENT — pkg change + override change → two entries ===
const bothChange = baseReducer(initialState, {
  type: 'EDIT_CLIENT',
  payload: {
    ...initialState.clients[0],
    packages: [{
      ...initialState.clients[0].packages[0],
      contractSize: 20,
      sessionCountOverride: { type: 'absolute', value: 5, periodStart: '2026-03-01' },
    }],
  },
});
assert(bothChange.auditLog.length === 2, 'pkg + override change → 2 entries');
assert(bothChange.auditLog[0].event === 'package_edited', 'first = package_edited');
assert(bothChange.auditLog[1].event === 'override_set', 'second = override_set');

// === Append-only: two successive EDIT_CLIENT dispatches → 2 accumulated entries ===
const after1 = baseReducer(initialState, {
  type: 'EDIT_CLIENT',
  payload: { ...initialState.clients[0], packages: [{ ...initialState.clients[0].packages[0], contractSize: 12 }] },
});
const after2 = baseReducer(after1, {
  type: 'EDIT_CLIENT',
  payload: { ...after1.clients[0], packages: [{ ...after1.clients[0].packages[0], contractSize: 14 }] },
});
assert(after2.auditLog.length === 2, 'two EDIT_CLIENT dispatches → 2 accumulated log entries');
assert(after2.auditLog[0].after.contractSize === 12, 'first entry preserved after second dispatch');
assert(after2.auditLog[1].after.contractSize === 14, 'second entry appended on top');

// === RENEW_PACKAGE — happy path ===
const renewed = baseReducer(initialState, {
  type: 'RENEW_PACKAGE',
  payload: {
    clientId: 'c1',
    newPackageStart: '2026-04-15',
    newContractSize: 10,
    newPeriodUnit: 'month',
    newPeriodValue: 1,
    newNotes: 'renewed after full contract',
    closedBy: 'manual',
    trigger: { reason: 'test — manual renewal' },
  },
});
assert(renewed.clients[0].packages.length === 2, 'renew appended new package');
const [oldP, newP] = renewed.clients[0].packages;
assert(oldP.id === 'pkg1', 'old package id preserved');
assert(oldP.end === '2026-04-14', 'old package end = day before new start');
assert(oldP.closedAt != null, 'old package closedAt stamped');
assert(oldP.closedBy === 'manual', 'closedBy recorded');
assert(newP.start === '2026-04-15', 'new package starts at newPackageStart');
assert(newP.end === null, 'new package is open-ended');
assert(newP.contractSize === 10, 'new contractSize');
assert(newP.sessionCountOverride === null, 'new package has no override');
assert(renewed.auditLog.length === 1, 'renewal logged once');
assert(renewed.auditLog[0].event === 'package_renewed_manual', 'event = package_renewed_manual');
assert(renewed.auditLog[0].newPackageId === newP.id, 'log references new package id');
assert(renewed.clients[0]._modified !== initialState.clients[0]._modified, '_modified bumped on renew');

// === RENEW_PACKAGE — closedBy: 'auto' → package_renewed_auto event ===
const autoRenewed = baseReducer(initialState, {
  type: 'RENEW_PACKAGE',
  payload: {
    clientId: 'c1',
    newPackageStart: '2026-04-15',
    newContractSize: null,
    newPeriodUnit: 'month',
    newPeriodValue: 1,
    newNotes: '',
    closedBy: 'auto',
    trigger: { reason: 'auto at booking' },
  },
});
assert(autoRenewed.auditLog[0].event === 'package_renewed_auto', 'auto event recorded');

// === RENEW_PACKAGE — defensive: nonexistent client → state unchanged ===
const noop1 = baseReducer(initialState, {
  type: 'RENEW_PACKAGE',
  payload: { clientId: 'nonexistent', newPackageStart: '2026-04-15', closedBy: 'manual' },
});
assert(noop1 === initialState, 'nonexistent client → state unchanged');

// === RENEW_PACKAGE — defensive: already closed package → state unchanged ===
const closedState = {
  ...initialState,
  clients: [{
    ...initialState.clients[0],
    packages: [{ ...initialState.clients[0].packages[0], end: '2026-04-14' }],
  }],
};
const noop2 = baseReducer(closedState, {
  type: 'RENEW_PACKAGE',
  payload: { clientId: 'c1', newPackageStart: '2026-04-15', closedBy: 'manual' },
});
assert(noop2 === closedState, 'already-closed current package → state unchanged');

// === RENEW_PACKAGE — defensive: invalid newPackageStart → state unchanged ===
const noop3 = baseReducer(initialState, {
  type: 'RENEW_PACKAGE',
  payload: { clientId: 'c1', newPackageStart: 'not-a-date', closedBy: 'manual' },
});
assert(noop3 === initialState, 'malformed newPackageStart → state unchanged');
const noop4 = baseReducer(initialState, {
  type: 'RENEW_PACKAGE',
  payload: { clientId: 'c1', newPackageStart: null, closedBy: 'manual' },
});
assert(noop4 === initialState, 'null newPackageStart → state unchanged');

console.log('\nReducer sanity: PASS');
