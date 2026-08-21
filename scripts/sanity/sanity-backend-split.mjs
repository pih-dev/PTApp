// Sanity: the Phase-2 driver split changed WHERE code lives and nothing else.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §18.
// Under test: src/backend/{index,githubDriver,supabaseDriver}.js, src/sync.js.
//
// 🔴 WHAT THIS FILE IS DEFENDING
//    `sync.js` is the one file in this codebase that has already lost the PT's
//    data twice (Apr 13, Apr 19). The split had exactly two rules: the GitHub
//    code MOVES rather than changes, and no call site changes. Both are the
//    kind of rule that is true on the day it is written and quietly false three
//    commits later, so both are asserted here.
//
//    And the third rule, the one with the worst failure mode: **the Supabase
//    driver must never acquire a credential of its own.** §4 cut the in-bundle
//    service session because `pih-dev/PTApp` is PUBLIC and the bundle is a
//    single `index.html`. RLS does not save you — a credential scoped to the
//    PT's tenant is *correctly* authorised to overwrite the PT's tenant.
//
// Run: node scripts/sanity/sanity-backend-split.mjs   (static, no network)
// Exit 0 all passed · 1 FAILED -> DO NOT DEPLOY.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) { console.log('  ✓', msg); return true; }
  console.error('  ✗', msg); failures++; return false;
};

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const read = (f) => readFileSync(SRC + f, 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const gh = read('backend/githubDriver.js');
const sb = read('backend/supabaseDriver.js');
const idx = read('backend/index.js');
const shim = read('sync.js');

console.log('\n[shape] the split');

assert(/export \* from '\.\/backend\/index\.js'/.test(shim),
  'src/sync.js is a re-export of the backend facade');

// Every existing import path still resolves. A call site that had to change is
// a second variable in a release that already changes the storage layer.
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(`${dir}${e.name}/`, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(`${dir}${e.name}`);
  }
  return out;
};
const callSites = walk(SRC).filter(f => /from '\.{1,2}\/sync'/.test(readFileSync(f, 'utf8')));
assert(callSites.length >= 4, `call sites still import from '../sync' (${callSites.length} files)`);
assert(!walk(SRC).some(f => !f.includes('backend/') && /from '.*backend\/(github|supabase)Driver/.test(readFileSync(f, 'utf8'))),
  'nothing outside src/backend/ imports a driver directly');

// The facade must re-export everything the old sync.js did, or a call site
// breaks at runtime rather than at build time.
for (const name of ['DEMO_TOKEN', 'isDemo', 'getToken', 'saveToken', 'clearToken', 'validateToken',
                    'fetchRemoteData', 'pushRemoteData', 'saveSnapshot', 'listSnapshots', 'fetchSnapshot']) {
  assert(new RegExp(`\\b${name}\\b`).test(idx), `facade exposes ${name}`);
}

console.log('\n[moved, not rewritten] the GitHub driver');

// 🔴 The hardened bits, asserted by name. Each one is a fix that came out of a
//    real incident; a split that quietly dropped one would look fine and fail
//    months later on the PT's phone.
assert(/_retries >= 3/.test(gh) && /mergeData\(data, remote\)/.test(gh),
  '409 retry-merge loop intact (never a blind overwrite)');
assert(/CHUNK = 0x8000/.test(gh),
  'chunked base64 intact (iOS RangeError past ~65K args)');
assert(/TOKEN_EXPIRED/.test(gh), '401 still surfaces as TOKEN_EXPIRED');
assert(!/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(stripComments(gh)),
  'no silent .catch(() => {}) — the Hala Mouzanar loss');

// The moved file must be byte-identical to what git has, apart from the header
// and the import path fix. Anything else is a rewrite wearing a move's clothes.
// 🔴 PINNED to the blob, not to a moving ref. `HEAD:src/sync.js` is the shim
//    from the next commit onward, so a ref-relative comparison would silently
//    start comparing the driver against three lines of re-export and pass. This
//    sha is the pre-split sync.js as it stood at commit b0c91ff, and it is the
//    only thing that keeps "moved, not rewritten" true a year from now.
const PRE_SPLIT_SYNC_BLOB = '031da2b40f9314874482812629c4b072c4bc1fc3';
try {
  const old = execFileSync('git', ['cat-file', '-p', PRE_SPLIT_SYNC_BLOB], { encoding: 'utf8', cwd: SRC + '..' });
  // v2.16.1 — the token trio (TOKEN_KEY / DEMO_TOKEN / isDemo) MOVED to utils.js so
  // that openWhatsApp can ask "are we in demo mode?" without utils importing the
  // driver that already imports utils — an import cycle. That is a genuine change to
  // this file, so it is normalised away HERE and re-asserted BELOW as its own
  // property. 🔴 Never loosen this comparison without adding back what it stops
  // covering: the whole point is that a rewrite cannot wear a move's clothes.
  const norm = (s) => stripComments(s).replace(/from '\.{1,2}\/utils\.js'/, "from 'UTILS'")
    .replace(/import \{[^}]*\} from 'UTILS';/, "import { UTILS } from 'UTILS';")
    .replace(/export const resetConcurrencyToken[^\n]*\n/, '')
    .replace(/const TOKEN_KEY = 'ptapp-sync-token';\n/, '')
    .replace(/export const DEMO_TOKEN = 'DEMO';\n/, '')
    .replace(/export const isDemo = \(\)[^\n]*\n/, '')
    .replace(/export \{ DEMO_TOKEN, isDemo \};\n/, '')
    .replace(/\s+/g, ' ').trim();
  assert(norm(gh) === norm(old),
    'githubDriver.js is byte-identical to the previous sync.js (comments and the utils path aside)');
} catch (e) {
  console.error('  ✗ could not read the pinned pre-split sync.js blob: ' + e.message);
  failures++;
}

console.log('\n[moved trio] the token key, the DEMO credential, and who may address a number');

// 🔴 The demo credential is the store reviewers' only way in. If it stopped being
//    defined in exactly one place, two copies could drift and `isDemo()` could
//    answer false on the one path that must never touch the network.
const utils = readFileSync(SRC + 'utils.js', 'utf8');
assert(/export const TOKEN_KEY = 'ptapp-sync-token';/.test(utils)
    && /export const DEMO_TOKEN = 'DEMO';/.test(utils),
  'the sync-token key and the DEMO credential are defined in utils.js');
assert(!/'ptapp-sync-token'/.test(gh) && !/'DEMO'/.test(stripComments(gh)),
  'the driver holds no second copy of either string');
assert(/export \{ DEMO_TOKEN, isDemo \};/.test(gh),
  'the driver still re-exports them, so the facade and every call site are unchanged');

// 🔴 DEMO MUST NOT ADDRESS A REAL NUMBER. The seeded demo clients used live Lebanese
//    mobile prefixes, and on 2026-08-21 a tester's tap reached actual strangers.
//    openWhatsApp is the ONE place that builds a wa.me URL, which is the only reason
//    this can be guaranteed here — for reviewers and screenshot runs too, not just
//    for the fourteen closed testers.
assert(/isDemo\(\)/.test(utils) && /https:\/\/wa\.me\/\?text=/.test(utils),
  'openWhatsApp addresses NOBODY while isDemo() is true');
assert(!/\+9617011|\+9617133|\+9617655|\+9610377/.test(readFileSync(SRC + 'demoData.js', 'utf8')),
  'the old plausible demo numbers are gone from demoData.js');

console.log('\n[dormant] the Supabase driver');

// 🔴 THE ONE THAT MATTERS MOST.
assert(!/eyJ[A-Za-z0-9_-]{20,}/.test(sb), 'no literal key in the Supabase driver');
assert(!/service_role|SERVICE_ROLE/.test(stripComments(sb)), 'no service_role reference');
assert(/getAccessToken\(\)/.test(stripComments(sb)),
  'every request uses the SIGNED-IN USER\'s token, obtained from auth.js');
assert(!/SUPABASE_ANON_KEY\s*,\s*\n?\s*Authorization: `Bearer \$\{SUPABASE_ANON_KEY\}/.test(sb),
  'never authorises with the anon key alone (that would be a shared credential)');
assert(/isSignedIn\(\)/.test(stripComments(sb)) && /export const isAvailable/.test(sb),
  'isAvailable() gates on a real session');

// Default mode, and the rollback property.
assert(/'github-primary'/.test(idx), "BACKEND_MODE defaults to 'github-primary'");
assert(/supabase-primary' && supabase\.isAvailable\(\)/.test(idx),
  'supabase-primary still falls back to GitHub when nobody is signed in (identity degrades sync, never bricks the app)');

// The merge contract must exist on BOTH drivers or the cutover silently drops it.
assert(/_retries >= 3/.test(sb) && /mergeData\(data, remote\)/.test(sb),
  'Supabase driver merges on a concurrency miss, never blind-overwrites');
assert(/version=eq\.\$\{currentVersion\}/.test(sb),
  'writes are conditional on the version read (optimistic concurrency, the sha analogue)');

// 🔴 THE INVARIANT THE FIRST VERSION OF THIS GATE GOT WRONG.
//    Asserting "merges on a concurrency miss" is true and insufficient: the
//    miss path was always safe. The dangerous path is the one that never
//    misses — a COLD cache fetching only to harvest the version, then writing
//    local straight over the row it just read. That PATCH succeeds, and
//    everything remote held and local lacked is gone. Apr-13, by a new route.
const coldCache = sb.slice(sb.indexOf('currentTenantId === null || currentVersion === null'),
                           sb.indexOf('if (currentTenantId === null) {'));
assert(/mergeData\(data, remote\)/.test(coldCache),
  '🔴 a COLD cache merges what it read — it never writes local over an unread row');
assert(/\(409\)/.test(sb),
  'the create branch routes a unique-violation race back into refetch-and-merge');
assert(/insert returned no row/.test(sb),
  'an empty insert representation throws rather than leaving the cache cold after a write');

console.log('\n[concurrency tokens] cleared on a driver or identity change');

assert(/export const resetConcurrencyToken/.test(gh) && /export const resetConcurrencyToken/.test(sb),
  'both drivers expose a reset');
assert(/resetConcurrencyTokens/.test(idx), 'the facade exposes a combined reset');
assert(/d !== lastDriver\) resetConcurrencyTokens\(\)/.test(idx),
  '🔴 a DRIVER flip resets them too — activeDriver() changing its answer silently fired nothing before');
assert(/resetConcurrencyTokens\(\)/.test(stripComments(read('App.jsx'))),
  '🔴 App clears them on identity change — a stale sha/version across a flip is a blind overwrite');

console.log('');
if (failures) {
  console.error(`✗ ${failures} assertion(s) FAILED — DO NOT DEPLOY.`);
  process.exit(1);
}
console.log('✓ backend split: moved, not rewritten; Supabase driver dormant and credential-free.');
