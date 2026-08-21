// Sanity: the auth module and the identity-namespaced localStorage key.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §4, §11.
// Under test: src/auth.js, and `storageKey` / `loadData` / `saveData` /
// `claimLegacyStore` in src/utils.js.
//
// 🔴 WHY THIS FILE EXISTS:
//    The bug it guards has no symptom either. A second coach signs in on a
//    phone that already holds Elie's blob; the app boots offline-first, finds a
//    populated store, and pushes Elie's entire dataset into the coach's tenant.
//    RLS authorises it — the data is correctly scoped to the wrong person.
//    Nothing crashes, nothing logs, and the first person to notice is Elie.
//    Every assertion below that involves two identities is that scenario.
//
//    The second half is the Airplane-Mode rule (§4, Apple 4.2): the auth gate is
//    IDENTITY, never token validity. An expired session must still be signed in.
//
// Run: node scripts/sanity/sanity-auth.mjs      (no network, no credentials)
//
// Exit codes: 0 all passed · 1 an assertion FAILED -> DO NOT DEPLOY.
// Unlike sanity-rls-matrix.mjs there is no live pass and no skip: everything
// here is deterministic against a stubbed fetch, so it must always run.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg); return true; }
  console.error('  ✗', msg);
  failures++;
  return false;
}

// ── Stub the two browser globals the module needs ───────────────────────────
const store = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
    key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  },
});

// A configured project, so `call()` gets past isAuthConfigured(). No request
// ever leaves this process — fetch is replaced below.
process.env.VITE_SUPABASE_URL = 'https://sanity.invalid';
process.env.VITE_SUPABASE_ANON_KEY = 'anon-sanity-key';

let nextFetch = null; // set per test: () => Response | throw
globalThis.fetch = async (...args) => {
  if (!nextFetch) throw new Error(`unexpected fetch: ${args[0]}`);
  const fn = nextFetch;
  nextFetch = null;
  return fn(...args);
};
const respond = (status, body) => () => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body ?? {}),
});
const offline = () => () => { throw new TypeError('Failed to fetch'); };

const auth = await import(new URL('../../src/auth.js', import.meta.url).href);
const utils = await import(new URL('../../src/utils.js', import.meta.url).href);

const UID_A = '11111111-1111-4111-8111-111111111111';
const UID_B = '22222222-2222-4222-8222-222222222222';
const UID_C_ID = '33333333-3333-4333-8333-333333333333';
const session = (uid, over = {}) => ({
  access_token: `at-${uid}`,
  refresh_token: `rt-${uid}`,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: uid, email: `${uid}@sanity.invalid` },
  expired: false,
  ...over,
});
// Sign in through the module rather than poking localStorage, so the cached
// session inside auth.js and the stored one can never drift apart in the test.
const signInAs = async (uid, over = {}) => {
  const s = session(uid, over);
  nextFetch = respond(200, { ...s, expires_in: 3600, user: s.user });
  await auth.signIn(s.user.email, 'password');
  if (Object.keys(over).length) {
    // Re-stamp fields the token response cannot express (e.g. a past expiry).
    nextFetch = null;
    store.set('spotset-auth', JSON.stringify({ ...JSON.parse(store.get('spotset-auth')), ...over }));
    // Force auth.js to re-read: signOut/signIn are the only cache invalidators,
    // so exercise the same door the app does.
    const raw = store.get('spotset-auth');
    store.set('spotset-auth', raw);
  }
};

// =====================================================================
// PASS 1 — static. What the file must NOT contain.
// =====================================================================
console.log('\n[static] source-level guarantees');

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const authSrc = readFileSync(SRC + 'auth.js', 'utf8');
const utilsSrc = readFileSync(SRC + 'utils.js', 'utf8');
const stripComments = (src) => src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const code = stripComments(authSrc);

// 🔴 Guideline 4.8: the day anyone adds Google sign-in, Sign in with Apple
//    becomes mandatory. §4 and §8.4 decided "no social login, ever". A grep is
//    the only thing that will still be enforcing that in two years.
assert(!/signInWithOAuth|grant_type=id_token|\bprovider\b|magiclink|otp/i.test(code),
  'no OAuth / magic-link / OTP path exists (Guideline 4.8 stays dormant)');
assert(!/export\s+(async\s+)?function\s+signUp|export\s+const\s+signUp/.test(code),
  'no signUp export — accounts are provisioned in the console (§11.1)');

// 🔴 pih-dev/PTApp is PUBLIC. Only the anon key may be referenced here.
assert(!/service_role|SERVICE_ROLE/.test(code), 'no service_role reference in the bundle path');
assert(!/eyJ[A-Za-z0-9_-]{20,}/.test(authSrc), 'no literal JWT / key committed in auth.js');

// A cycle here would be a load-order bug that only shows up in the built
// bundle, which is the worst place to find one.
assert(!/from\s+['"]\.\/utils/.test(code), 'auth.js imports nothing from utils.js (no cycle)');
assert(/from\s+['"]\.\/auth\.js['"]/.test(utilsSrc), 'utils.js sources identity from auth.js');

// The landmine guard, asserted on the source as well as behaviourally below:
// a future edit that reintroduces a bare `ptapp-data` write is the whole bug.
// `STORAGE_KEY` is the bare, unnamespaced legacy constant. It may be READ (the
// legacy load path and claimLegacyStore both need it) but it must never again be
// the target of a write — that write IS the bug.
assert(!/localStorage\.setItem\(\s*STORAGE_KEY/.test(utilsSrc),
  'nothing writes to the bare unnamespaced key any more');
assert(/localStorage\.setItem\(\s*key\s*,\s*JSON\.stringify\(data\)/.test(utilsSrc),
  'saveData writes through storageKey()');

// 🔴 SWEEP ALL OF src/, not just utils.js. The first version of this assertion
//    read utils.js alone, and ErrorBoundary.jsx sailed through it holding two
//    hardcoded 'ptapp-data' references — a crash screen that would have handed
//    the user someone else's blob and reset a store nobody was using. That is
//    the standing TRAPS rule: grep EVERY read and write when a storage location
//    moves. The allowlist is deliberately tiny and named.
const ALLOWED_BARE = new Set([
  'utils.js',          // owns the constant, the legacy load path and the cutover claim
  'components/ErrorBoundary.jsx', // cannot import utils by design; resolves the key inline
]);
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(`${dir}${e.name}/`, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(`${dir}${e.name}`);
  }
  return out;
};
const offenders = walk(SRC)
  .filter(f => !ALLOWED_BARE.has(f.slice(SRC.length)))
  // Only localStorage uses count — `ptapp-data` is also the name of the GitHub
  // data repo in sync.js, which has nothing to do with the storage key.
  // Comments are stripped first: several files legitimately NAME the key while
  // explaining the rule. Only real code counts.
  .filter(f => /localStorage\.\w+Item\(\s*['"`]ptapp-data|['"`]ptapp-data:/.test(stripComments(readFileSync(f, 'utf8'))))
  .map(f => f.slice(SRC.length));
assert(offenders.length === 0,
  `no file outside the allowlist hardcodes 'ptapp-data' (found: ${offenders.join(', ') || 'none'})`);

// ErrorBoundary's inlined copy must resolve identity the same way auth.js stores
// it. If auth.js ever renames the session key, this assertion is what catches the
// crash screen still looking for the old one.
const ebSrc = readFileSync(SRC + 'components/ErrorBoundary.jsx', 'utf8');
assert(/spotset-auth/.test(ebSrc) && /ptapp-data:\$\{uid\}/.test(ebSrc),
  'ErrorBoundary resolves the namespaced key from the same session key auth.js writes');

// =====================================================================
// PASS 2 — the storage key follows identity.
// =====================================================================
console.log('\n[storage] the key is namespaced by identity');

store.clear();
await auth.signOut();
assert(utils.storageKey() === 'ptapp-data', 'signed out → the legacy key, unchanged');

// Today's world / DEMO: legacy data loads exactly as it always has.
store.set('ptapp-data', JSON.stringify({ clients: [{ id: 'legacy1', name: 'Elie client' }], sessions: [] }));
assert(utils.loadData().clients[0]?.id === 'legacy1', 'signed out → legacy blob still loads (DEMO and today are untouched)');

await signInAs(UID_A);
assert(utils.storageKey() === `ptapp-data:${UID_A}`, 'signed in → ptapp-data:<userId>');

// 🔴 THE ASSERTION THAT MATTERS: a new identity gets an EMPTY app, not whatever
//    the phone was holding. No fallback, ever.
const fresh = utils.loadData();
assert(fresh.clients.length === 0 && fresh.sessions.length === 0,
  'a newly signed-in user does NOT inherit the legacy store (no fallback)');

// =====================================================================
// PASS 3 — two identities on one device cannot contaminate each other.
// =====================================================================
console.log('\n[isolation] two users, one phone');

utils.saveData({ clients: [{ id: 'a1' }], sessions: [], _dataVersion: 6 });
assert(JSON.parse(store.get(`ptapp-data:${UID_A}`)).clients[0].id === 'a1', 'A writes to A\'s key');
assert(JSON.parse(store.get('ptapp-data')).clients[0].id === 'legacy1', 'A\'s write did not touch the legacy store');

await auth.signOut();
await signInAs(UID_B);
// State in memory still belongs to A. One edit at this moment is the entire bug.
utils.saveData({ clients: [{ id: 'a1' }], sessions: [], _dataVersion: 6 });
assert(store.get(`ptapp-data:${UID_B}`) === undefined || store.get(`ptapp-data:${UID_B}`) === null,
  'a save carrying A\'s state after switching to B is REFUSED (cross-tenant landmine)');

utils.loadData(); // the reload App performs on every identity change — self-heals
utils.saveData({ clients: [{ id: 'b1' }], sessions: [], _dataVersion: 6 });
assert(JSON.parse(store.get(`ptapp-data:${UID_B}`)).clients[0].id === 'b1', 'after reloading as B, B\'s own save lands');
assert(JSON.parse(store.get(`ptapp-data:${UID_A}`)).clients[0].id === 'a1', 'A\'s data is still intact and untouched');

// =====================================================================
// PASS 4 — claimLegacyStore: the one-time cutover, and its refusals.
// =====================================================================
console.log('\n[cutover] claimLegacyStore');

// 🔴 The owner id is REQUIRED and must match. Without that, every first-time
//    signer-in on the device claims whatever legacy blob is sitting there — the
//    cross-tenant landmine arriving through the legacy key instead of the
//    namespaced one.
assert(utils.claimLegacyStore(UID_C_ID) === false, 'refuses when the signed-in user is not the named owner');
assert(utils.claimLegacyStore() === false, 'refuses with no owner id at all (no accidental claim)');
assert(utils.claimLegacyStore(UID_A) === false, 'refuses when that identity already has a store (never overwrites)');

await auth.signOut();
assert(utils.claimLegacyStore(UID_C_ID) === false, 'refuses when signed out');

await signInAs(UID_C_ID);
assert(utils.claimLegacyStore(UID_C_ID) === true, 'claims the legacy store for the named cutover user');
assert(JSON.parse(store.get(`ptapp-data:${UID_C_ID}`)).clients[0].id === 'legacy1', 'the claimed blob is the legacy one');
assert(JSON.parse(store.get(utils.PREAUTH_BACKUP_KEY)).clients[0].id === 'legacy1',
  'the pre-auth copy is parked for rollback');
assert(store.get('ptapp-data') === undefined,
  '🔴 the bare key is GONE — otherwise signing out would boot the app straight into the PT\'s clients with no auth');
assert(utils.claimLegacyStore(UID_C_ID) === false, 'a second claim is a no-op');
// The DEMO gate must refuse a device holding real records under ANY key —
// including the parked pre-auth backup, which is exactly Elie's phone after
// cutover. DEMO is a global switch; seeding it there parks the phone.
assert(utils.anyLocalDataExists() === true, 'records under any ptapp-data* key (backup included) still refuse DEMO');

// =====================================================================
// PASS 5 — the auth gate is identity, never token validity.
// =====================================================================
console.log('\n[gate] an expired session is still signed in');

store.clear();
await signInAs(UID_A);
assert(auth.isSignedIn() === true && auth.isSessionExpired() === false, 'fresh session: signed in, not expired');

// Expire it the way time does.
await auth.signOut();
store.clear();
await signInAs(UID_A);
const stored = JSON.parse(store.get('spotset-auth'));
store.set('spotset-auth', JSON.stringify({ ...stored, expires_at: Math.floor(Date.now() / 1000) - 10 }));
// auth.js caches the session in memory; re-import fresh to read what a cold
// app start would read.
const auth2 = await import(new URL('../../src/auth.js?expired', import.meta.url).href);
assert(auth2.isSignedIn() === true, '🔴 expired token → STILL SIGNED IN (never a login wall — Apple 4.2 / gym basement)');
assert(auth2.isSessionExpired() === true, 'expired token → reported as expired (so the UI can show a banner)');
assert(auth2.getUserId() === UID_A, 'the identity — and therefore the storage key — survives expiry');

// =====================================================================
// PASS 6 — a 401 must not look like a network blip.
// =====================================================================
console.log('\n[failures] offline vs rejected are different outcomes');

nextFetch = offline();
let err = await auth2.refreshSession().then(() => null, e => e);
assert(err?.code === auth.AUTH_OFFLINE, 'unreachable server → AUTH_OFFLINE');
assert(JSON.parse(store.get('spotset-auth')).expired !== true,
  '🔴 an offline refresh does NOT mark the session expired (it would wall a user with no signal)');
assert(auth2.isSignedIn() === true, 'and the session is kept');

nextFetch = respond(400, { error: 'invalid_grant', error_description: 'refresh token not found' });
err = await auth2.refreshSession().then(() => null, e => e);
assert(err?.code === auth.AUTH_EXPIRED, 'server rejects the refresh token → AUTH_EXPIRED (not OFFLINE, not FAILED)');
assert(JSON.parse(store.get('spotset-auth')).expired === true, 'the rejected session is marked expired');
assert(auth2.isSignedIn() === true, '🔴 …and STILL signed in — re-entry is a prompt, never a wipe');

nextFetch = respond(400, { error_description: 'Invalid login credentials' });
err = await auth2.signIn('nobody@sanity.invalid', 'wrong').then(() => null, e => e);
assert(err?.code === auth.AUTH_BAD_CREDENTIALS, 'wrong password → AUTH_BAD_CREDENTIALS');

// =====================================================================
// PASS 7 — signing out never deletes data.
// =====================================================================
console.log('\n[signOut] clears the session and nothing else');

store.clear();
await signInAs(UID_A);
utils.loadData();
utils.saveData({ clients: [{ id: 'keepme' }], sessions: [], _dataVersion: 6 });
nextFetch = respond(204, {});
await auth.signOut();
assert(store.get('spotset-auth') === undefined, 'the session is gone');
assert(JSON.parse(store.get(`ptapp-data:${UID_A}`)).clients[0].id === 'keepme',
  '🔴 the signed-out user\'s data is UNTOUCHED (NEVER delete or lose user data)');
assert(auth.isSignedIn() === false && auth.getUserId() === null, 'and the app is signed out');

// An offline sign-out must still work locally — the revoke is a courtesy.
await signInAs(UID_B);
nextFetch = offline();
await auth.signOut();
assert(auth.isSignedIn() === false, 'sign-out works with no network (revoke failure is swallowed, locally it is done)');

// =====================================================================
// PASS 8 — the two refresh races. Both were real, both were found by review
// rather than by symptom, and both end in the same place: a user stuck on an
// expired banner, or a signed-out identity coming back to life and taking the
// storage key with it.
// =====================================================================
console.log('\n[races] concurrent refresh, and sign-out mid-flight');

// A fetch stub that hands back a lever, so the test can decide when the
// in-flight request resolves.
let release;
const deferred = (result) => () => new Promise(res => { release = () => res(result()); });

store.clear();
await signInAs(UID_A);
nextFetch = deferred(respond(400, { error: 'invalid_grant' }));
let p1 = auth.refreshSession().then(() => null, e => e);
await auth.signOut();          // user signs out while the refresh is in flight
release();
await p1;
assert(auth.isSignedIn() === false,
  '🔴 a refresh rejected AFTER sign-out does not resurrect the session (it would restore the previous user\'s storage key)');
assert(auth.getUserId() === null, 'and the identity stays gone');

// GoTrue ROTATES refresh tokens, so two concurrent refreshes mean the loser
// presents a spent token and gets a 400. Single-flight means there is only ever
// one request — asserted by the stub, which throws on an unexpected second fetch.
store.clear();
await signInAs(UID_B);
nextFetch = deferred(respond(200, {
  access_token: 'at-rotated', refresh_token: 'rt-rotated', expires_in: 3600,
  user: { id: UID_B, email: `${UID_B}@sanity.invalid` },
}));
const both = Promise.all([auth.refreshSession(), auth.refreshSession()]);
release();
await both;
assert(JSON.parse(store.get('spotset-auth')).access_token === 'at-rotated',
  'two concurrent refreshes collapse into ONE request and leave the rotated token in place');
assert(JSON.parse(store.get('spotset-auth')).expired === false,
  '🔴 the loser of a rotation race does not overwrite the good session with an expired one');

console.log('');
if (failures) {
  console.error(`✗ ${failures} assertion(s) FAILED — DO NOT DEPLOY AUTH.`);
  process.exit(1);
}
console.log('✓ auth module + identity-namespaced storage: all assertions passed.');
