// Sanity: RLS matrix — proves the identity tree isolates trees from each other.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §11–§12.
// Schema under test: supabase/migrations/0001_app_users.sql
//
// 🔴 WHY THIS FILE EXISTS, and why it is not optional:
//    A missing RLS policy has NO SYMPTOM. The app works, the data looks right,
//    and the only observable difference is that someone can read rows they
//    should not. There is no crash, no log line, no user complaint — until
//    there is, and by then a coach has seen another coach's clients.
//    Every other defence in this project is a code review. This is the only
//    one that is a test.
//
// 🔴 AND WHY IT ASSERTS NEGATIVES:
//    "Elie can read his own clients" passing proves nothing about isolation —
//    a table with RLS switched off passes it too. The load-bearing assertions
//    here are the ones that require a request to be REFUSED.
//
// Run: node scripts/sanity/sanity-rls-matrix.mjs
//
// Exit codes — deliberately three, not two:
//   0  every assertion passed (static + live)
//   1  an assertion FAILED, or the static pass found a hole -> DO NOT DEPLOY
//   2  live pass SKIPPED because no instance is configured. This is NOT a pass.
//      The full suite loop (`for f in scripts/sanity/*.mjs`) treats it as a
//      failure, which is correct: shipping auth without having run the live
//      matrix is exactly the thing this file exists to prevent.
//
// To run the live pass, from a shell that is NOT recorded anywhere:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_ANON_KEY=<anon> \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role> \
//   node scripts/sanity/sanity-rls-matrix.mjs
//
// 🔴 The service_role key is read from the environment and MUST NOT be written
//    into this repo, into .env, or into any file — pih-dev/PTApp is PUBLIC.
//    It is used here only to build and tear down the synthetic tree; every
//    assertion is made with a normal user's token through the anon endpoint,
//    which is the only path the app itself will ever use.

import { readFileSync } from 'node:fs';

const MIGRATION = new URL('../../supabase/migrations/0001_app_users.sql', import.meta.url);

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg); return true; }
  console.error('  ✗', msg);
  failures++;
  return false;
}

// =====================================================================
// PASS 1 — static. Runs with no network, no instance, no credentials.
// Catches the class of mistake that is invisible at runtime: a table
// created without RLS, a grant to anon, the search_path='' trap.
// =====================================================================

console.log('\n[static] supabase/migrations/0001_app_users.sql');

const sql = readFileSync(MIGRATION, 'utf8');
// Strip line comments so prose about a rule cannot satisfy a check for it.
const code = sql.replace(/--.*$/gm, '');

const createdTables = [...code.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)]
  .map(m => m[1]);

assert(createdTables.length > 0, `migration creates tables (${createdTables.join(', ') || 'none'})`);

for (const t of createdTables) {
  // Both are needed. ENABLE alone leaves the table owner exempt, so a policy
  // bug can hide behind an owner-context migration and the matrix would pass
  // for the wrong reason.
  assert(new RegExp(`alter table public\\.${t} enable row level security`, 'i').test(code),
    `${t}: RLS enabled`);
  assert(new RegExp(`alter table public\\.${t} force row level security`, 'i').test(code),
    `${t}: RLS FORCEd (owner is not exempt)`);
  assert(new RegExp(`create policy \\w+\\s+on public\\.${t}`, 'i').test(code),
    `${t}: has at least one policy (a table with RLS and no policy is unreadable)`);
}

// anon is the key that ships inside the bundle of a PUBLIC repo. It must not
// be able to touch application tables at all.
const anonGrants = [...code.matchAll(/grant\s+[^;]*?\s+to\s+([^;]*)/gi)]
  .filter(m => /\banon\b/.test(m[1]));
assert(anonGrants.length === 0,
  `no GRANT to anon (found ${anonGrants.length})`);

// The ltree trap: Supabase installs extensions into the `extensions` schema,
// so a function using ltree with search_path='' fails at runtime with a bare
// "operator does not exist". See docs/traps.md.
const ltreeFnsWithEmptyPath = [...code.matchAll(/create (?:or replace )?function[\s\S]*?\$fn\$[\s\S]*?\$fn\$/gi)]
  .filter(fn => /ltree|<@|nlevel|subpath/i.test(fn[0]) && /set search_path\s*=\s*''/i.test(fn[0]));
assert(ltreeFnsWithEmptyPath.length === 0,
  `no ltree function uses search_path='' (found ${ltreeFnsWithEmptyPath.length})`);

// The initPlan trap (docs/traps.md): a policy predicate must not call a
// function with a row column as an argument — that is a correlated SubPlan,
// evaluated once per row. The hoisted form takes no arguments.
const policyBodies = [...code.matchAll(/create policy[\s\S]*?;/gi)].map(m => m[0]);
const rowDependentCalls = policyBodies.filter(p =>
  /\(\s*select\s+private\.\w+\s*\(\s*[a-z_]\w*\s*\)/i.test(p));
assert(rowDependentCalls.length === 0,
  `no policy calls a private.* function with a row column (found ${rowDependentCalls.length})`);

// Any write policy on app_users would also permit editing `role` and
// `parent_pt_id`, because RLS cannot restrict columns — i.e. self-promotion
// to prime. Writes belong to service_role only (§11.1).
const writePolicies = policyBodies.filter(p =>
  /on public\.app_users/i.test(p) && /for\s+(insert|update|delete|all)\b/i.test(p));
assert(writePolicies.length === 0,
  `app_users has no write policy for authenticated (found ${writePolicies.length})`);

if (failures > 0) {
  console.error(`\n✗ STATIC PASS FAILED (${failures}) — DO NOT DEPLOY\n`);
  process.exit(1);
}
console.log('[static] ok');

// =====================================================================
// PASS 2 — live. Builds a real tree in a real instance and asserts what
// each real signed-in user can and cannot read.
// =====================================================================

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON || !SERVICE) {
  console.error(`
[live] SKIPPED — no instance configured.

  Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run it.

🔴 This is NOT a pass. The static pass only reads the migration text; it cannot
   tell you whether Postgres actually refuses a cross-tree read. Auth must not
   ship until this exits 0.
`);
  process.exit(2);
}

const api = (path, { token, key, method = 'GET', body, prefer } = {}) =>
  fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key ?? ANON,
      Authorization: `Bearer ${token ?? key ?? ANON}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

// Unique per run so a crashed previous run cannot collide with this one, and
// so teardown can find exactly its own rows.
const RUN = `rls${Date.now().toString(36)}`;
const email = n => `${RUN}.${n}@sanity.invalid`;
const PASSWORD = `${RUN}-Aa1!longenough`;

const made = [];   // auth user ids, for teardown

async function createUser(n) {
  const r = await api('/auth/v1/admin/users', {
    key: SERVICE, method: 'POST',
    body: { email: email(n), password: PASSWORD, email_confirm: true },
  });
  if (!r.ok) throw new Error(`create user ${n}: ${r.status} ${await r.text()}`);
  const u = await r.json();
  made.push(u.id);
  return u.id;
}

async function provision(id, role, parent, name) {
  // service_role bypasses RLS. `path` is omitted on purpose — the BEFORE
  // INSERT trigger stamps it, and a hand-passed path is exactly the bug the
  // trigger exists to prevent.
  const r = await api('/rest/v1/app_users', {
    key: SERVICE, method: 'POST', prefer: 'return=representation',
    body: { id, role, parent_pt_id: parent, name },
  });
  if (!r.ok) throw new Error(`provision ${name}: ${r.status} ${await r.text()}`);
  return (await r.json())[0];
}

async function signIn(n) {
  const r = await api('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email: email(n), password: PASSWORD },
  });
  if (!r.ok) throw new Error(`sign in ${n}: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

// What this user can actually SELECT from app_users, as a set of ids.
async function visibleTo(token) {
  const r = await api('/rest/v1/app_users?select=id', { token });
  if (!r.ok) throw new Error(`select as user: ${r.status} ${await r.text()}`);
  return new Set((await r.json()).map(x => x.id));
}

async function teardown() {
  for (const id of made) {
    // ON DELETE CASCADE from auth.users removes the app_users row with it.
    await api(`/auth/v1/admin/users/${id}`, { key: SERVICE, method: 'DELETE' })
      .catch(e => console.error('  ! teardown', id, e.message));
  }
}

console.log(`\n[live] ${URL_} (run ${RUN})`);

try {
  // The tree, chosen to make every §11 rule falsifiable:
  //
  //   A (prime pt)                 D (peer prime pt)      X (no app_users row)
  //   ├── B (sub-pt)               └── F (client of D)
  //   │   └── E (client of B)
  //   └── C (client of A)
  //
  // A must see A,B,C,E and NOT D,F.  B must see B,E and NOT A,C,D,F.
  const ids = {};
  for (const n of ['A', 'B', 'C', 'D', 'E', 'F', 'X']) ids[n] = await createUser(n);

  await provision(ids.A, 'pt', null, 'A prime');
  await provision(ids.B, 'pt', ids.A, 'B sub-pt');
  await provision(ids.C, 'client', ids.A, 'C client of A');
  await provision(ids.E, 'client', ids.B, 'E client of B');
  await provision(ids.D, 'pt', null, 'D peer prime');
  await provision(ids.F, 'client', ids.D, 'F client of D');
  // X is deliberately NOT provisioned: a signed-in user with no row must see
  // nothing (my_path() returns NULL, `path <@ NULL` is NULL, not true).

  const set = (...names) => new Set(names.map(n => ids[n]));
  const same = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
  const label = s => [...s].map(id => Object.keys(ids).find(k => ids[k] === id)).sort().join(',') || '∅';

  const cases = [
    ['A', set('A', 'B', 'C', 'E'), 'prime pt sees their whole tree'],
    ['B', set('B', 'E'),           'sub-pt sees only their own subtree — NOT the parent, NOT a sibling branch'],
    ['C', set('C'),                'client sees only themselves'],
    ['D', set('D', 'F'),           'peer prime sees their own tree'],
    ['F', set('F'),                "client of the peer tree sees only themselves"],
    ['X', set(),                   'signed-in user with no app_users row sees NOTHING (fails closed)'],
  ];

  for (const [who, expected, why] of cases) {
    const got = await visibleTo(await signIn(who));
    assert(same(got, expected), `${who}: ${why}  [expected ${label(expected)}, got ${label(got)}]`);
  }

  // ---- The load-bearing negatives, asserted directly rather than inferred
  // from a set comparison, so a failure names the exact leak. ----
  console.log('  -- explicit refusals --');

  const tokenB = await signIn('B');
  const tokenD = await signIn('D');
  const tokenC = await signIn('C');

  const reads = async (token, targetName) => {
    const r = await api(`/rest/v1/app_users?select=id&id=eq.${ids[targetName]}`, { token });
    if (!r.ok) throw new Error(`targeted read: ${r.status} ${await r.text()}`);
    return (await r.json()).length > 0;
  };

  assert(!(await reads(tokenB, 'A')), 'B cannot read UPWARD to their parent A');
  assert(!(await reads(tokenB, 'C')), "B cannot read SIDEWAYS into A's other branch (client C)");
  assert(!(await reads(tokenD, 'A')), '🔴 PEER ISOLATION: prime D cannot read prime A');
  assert(!(await reads(tokenB, 'D')), 'B cannot read into the peer tree at all');
  assert(!(await reads(tokenC, 'A')), 'a client cannot read their own coach');

  // A write path would let a pt edit `role`/`parent_pt_id` — self-promotion to
  // prime. There must be no write policy at all for `authenticated` (§11.1).
  const wrote = await api(`/rest/v1/app_users?id=eq.${ids.B}`, {
    token: tokenB, method: 'PATCH', body: { role: 'pt', parent_pt_id: null },
  });
  assert(!wrote.ok || (await wrote.json()).length === 0,
    '🔴 B cannot promote themselves to prime (no write policy for authenticated)');

  // anon is the key that ships in the bundle of a public repo.
  const anonRead = await api('/rest/v1/app_users?select=id');
  assert(!anonRead.ok || (await anonRead.json()).length === 0,
    '🔴 the anon key reads NOTHING from app_users');

} catch (e) {
  console.error('  ✗ harness error:', e.message);
  failures++;
} finally {
  await teardown();
}

if (failures > 0) {
  console.error(`\n✗ RLS MATRIX FAILED (${failures}) — DO NOT DEPLOY\n`);
  process.exit(1);
}
console.log('\n✓ RLS matrix: static + live, all assertions passed\n');
