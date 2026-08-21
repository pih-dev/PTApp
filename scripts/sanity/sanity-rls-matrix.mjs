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

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 🔴 Every migration, discovered — never a hardcoded filename. 0001 already
//    promises 0002 (tenants, tenant_snapshots, client_views). A matrix pinned
//    to 0001 would print all-green while the tables that actually hold Elie's
//    data had no RLS at all. The gate must widen by itself as the schema grows.
const MIGRATIONS_DIR = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));

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

// 🔴 The static pass reads the migration FILES, not the database. It cannot
//    tell you what was actually applied — `create table if not exists` means an
//    edited migration re-applied against an existing table silently skips every
//    column and constraint change, so the file can promise something the
//    instance does not have. Treat it as a lint that catches whole classes of
//    hole cheaply and offline; the live pass below is the actual proof.
const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql'))
  .sort();

console.log(`\n[static] ${files.length} migration(s): ${files.join(', ')}`);
assert(files.length > 0, 'migrations directory is not empty');

const sql = files.map(f => readFileSync(MIGRATIONS_DIR + f, 'utf8')).join('\n');
// Strip line comments so prose about a rule cannot satisfy a check for it.
const code = sql.replace(/--.*$/gm, '');

const createdTables = [...code.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)]
  .map(m => m[1]);

assert(createdTables.length > 0, `migrations create tables (${createdTables.join(', ') || 'none'})`);

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
//
// 🔴 A policy with NO `for` clause defaults to FOR ALL — it is a write policy.
//    Matching only on an explicit for-insert/update/delete/all would classify
//    `create policy p on public.app_users to authenticated using (true);`
//    as harmless, which is precisely backwards: that policy permits editing
//    `role` and `parent_pt_id`, i.e. self-promotion to prime. Absence of the
//    clause is the dangerous case, so absence must be treated as ALL.
const writePolicies = policyBodies.filter(p => {
  if (!/on public\.app_users/i.test(p)) return false;
  const forClause = p.match(/\bfor\s+(all|select|insert|update|delete)\b/i);
  return !forClause || forClause[1].toLowerCase() !== 'select';
});
assert(writePolicies.length === 0,
  `app_users has no write policy for authenticated — a policy with no FOR clause counts as one (found ${writePolicies.length})`);

// Postgres grants EXECUTE on new functions to PUBLIC by default, and `public`
// is the schema PostgREST exposes. A `security definer` function there is an
// anon-callable RPC that runs as its owner. Today's two are trigger functions,
// which cannot be called over RPC — so this is inert, and that is exactly the
// problem: nothing establishes the habit, and the first non-trigger SECDEF
// function added to `public` inherits the hole silently.
const publicSecdef = [...code.matchAll(
  /create (?:or replace )?function public\.(\w+)[\s\S]*?\$fn\$[\s\S]*?\$fn\$/gi)]
  .filter(m => /security definer/i.test(m[0]))
  .map(m => m[1]);
const revokedOrDefaultRevoked = /alter default privileges in schema public[\s\S]*?revoke execute on functions from[^;]*public/i.test(code);
assert(revokedOrDefaultRevoked || publicSecdef.length === 0,
  `EXECUTE on public functions is revoked from PUBLIC by default privileges (public security definer fns: ${publicSecdef.join(', ') || 'none'})`);

// 🔴 Idempotency. `create policy` and `create trigger` have no IF NOT EXISTS,
//    so on a re-apply they ABORT — and everything after them in the file never
//    runs. That is worse than a clean failure: the migration half-applies, the
//    editor shows one red line that is easy to scroll past, and the database
//    is left with the old function bodies while the file on disk says
//    otherwise. It cost a debugging round here: a fixed restamp function was
//    "applied" three times and never actually reached the database, because an
//    already-exists policy error aborted the script before it got there.
const missingDrops = [];
for (const kind of ['policy', 'trigger']) {
  const re = new RegExp(`create ${kind} (\\w+)`, 'gi');
  for (const m of code.matchAll(re)) {
    if (!new RegExp(`drop ${kind} if exists ${m[1]}\\b`, 'i').test(code)) missingDrops.push(`${kind} ${m[1]}`);
  }
}
assert(missingDrops.length === 0,
  `every create policy/trigger has a matching "drop … if exists" (missing: ${missingDrops.join(', ') || 'none'})`);

if (failures > 0) {
  console.error(`\n✗ STATIC PASS FAILED (${failures}) — DO NOT DEPLOY\n`);
  process.exit(1);
}
console.log('[static] ok');

// =====================================================================
// PASS 2 — live. Builds a real tree in a real instance and asserts what
// each real signed-in user can and cannot read.
// =====================================================================

// Credentials come from the environment, or from a key file OUTSIDE the repo.
//
// 🔴 The file lives in _archive, never in the working tree. pih-dev/PTApp is
//    public, and a service_role key committed there is a total compromise of
//    Elie's records — it bypasses RLS entirely by design. _archive is never
//    committed to anything, which is why it is the right home for this.
//    The env vars still win if set, so CI can inject them instead.
const KEYFILE = 'C:/projects/_archive/PTApp/supabase-spotset.env';

function loadKeyFile() {
  try {
    const txt = readFileSync(KEYFILE, 'utf8');
    const out = {};
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}
const file = loadKeyFile();

const URL_ = process.env.SUPABASE_URL || file.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || file.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || file.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON || !SERVICE) {
  // The message deliberately carries the same "DO NOT DEPLOY" string the three
  // spent live-diff gates print, because that is the string a human scanning
  // the suite output is looking for. A skip that reads like a pass is the whole
  // failure mode this file exists to avoid.
  console.error(`
[live] SKIPPED — no instance configured. DO NOT DEPLOY AUTH.

  Create ${KEYFILE} containing three lines, then re-run this script:

    SUPABASE_URL=https://<project-ref>.supabase.co
    SUPABASE_ANON_KEY=<the publishable / anon key>
    SUPABASE_SERVICE_ROLE_KEY=<the secret / service_role key>

  All three are on: Supabase dashboard -> your project -> Project Settings ->
  API Keys. That path is outside the repo on purpose; never put these in git.

🔴 This is NOT a pass. The static pass only reads the migration text; it cannot
   tell you whether Postgres actually refuses a cross-tree read — nor even
   whether the migration on file is the one that was applied ('create table if
   not exists' skips changes silently). Auth must not ship until this exits 0.
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

const made = [];       // auth user ids, in creation order — teardown reverses it
const tenantIds = [];  // tenant ids, deleted BEFORE their coaches (see teardown)

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
  // 🔴 LEAF-FIRST, and the order is load-bearing. Deleting an auth.users row
  //    cascades to its app_users row — but app_users.parent_pt_id is ON DELETE
  //    RESTRICT, so deleting a parent whose children still exist FAILS. In
  //    creation order the very first delete (prime A) is refused and every
  //    later one leaves its parent behind. `made` is in creation order, so
  //    reversing it puts children before parents for any tree built top-down.
  //
  //    The first version of this swallowed the error and reported success.
  //    Three synthetic users survived a "passing" run — a fake prime with a
  //    real subtree sitting in the database, which nothing in the app would
  //    ever flag. A test that litters is a test that will one day litter into
  //    Elie's live tree.
  let failed = 0;

  // 🔴 Tenants FIRST. tenants.coach_id is ON DELETE RESTRICT, so a coach who
  //    still owns a blob cannot be deleted — same trap as the parent/child one
  //    below, one table over. Snapshots cascade from tenants, so they need no
  //    pass of their own.
  for (const tid of tenantIds) {
    const r = await api(`/rest/v1/tenants?id=eq.${tid}`, { key: SERVICE, method: 'DELETE' });
    if (!r.ok) { failed++; console.error(`  ! teardown tenant ${tid}: ${r.status} ${await r.text()}`); }
  }

  // 🔴 Deepest-first, computed from the LIVE tree — not from creation order.
  //    Creation order reversed is leaf-first only for a tree that never moved,
  //    and this run deliberately re-parents B under D partway through. After
  //    that move, deleting in reverse creation order hits D while B still
  //    hangs off it, ON DELETE RESTRICT refuses, and the strays are back.
  //    Ask the database what the tree looks like now.
  let order = [...made].reverse();
  try {
    const r = await api('/rest/v1/app_users?select=id,parent_pt_id', { key: SERVICE });
    if (r.ok) {
      const rows = await r.json();
      const mine = rows.filter(x => made.includes(x.id));
      const byId = Object.fromEntries(mine.map(x => [x.id, x]));
      const depth = (x) => { let d = 0, c = x; while (c?.parent_pt_id && byId[c.parent_pt_id]) { d++; c = byId[c.parent_pt_id]; } return d; };
      order = mine.sort((a, b) => depth(b) - depth(a)).map(x => x.id)
        .concat(made.filter(id => !byId[id]));   // users with no app_users row
    }
  } catch { /* fall back to reverse creation order */ }

  for (const id of order) {
    try {
      const r = await api(`/auth/v1/admin/users/${id}`, { key: SERVICE, method: 'DELETE' });
      if (!r.ok) { failed++; console.error(`  ! teardown ${id}: ${r.status} ${await r.text()}`); }
    } catch (e) {
      failed++;
      console.error('  ! teardown', id, e.message);
    }
  }

  // Verify, don't assume. This is the whole lesson of the paragraph above.
  //
  // 🔴 COUNT THIS RUN'S ROWS, NOT THE TABLE.
  //    The original version asserted the three tables were globally empty,
  //    which was true only while this database held nothing but synthetic
  //    rows. From 2026-08-21 the Phase-1 mirror keeps a real coach and a real
  //    tenant holding the PT's blob (§15), so a global count would fail every
  //    run from now on — and a gate that always fails gets ignored, which is
  //    the same outcome as not having one. Scope to `made`, the ids this run
  //    created; anything of ours left behind is still a hard failure.
  const leftover = async (table, col) => {
    if (!made.length) return 0;
    const r = await api(`/rest/v1/${table}?select=id&${col}=in.(${made.join(',')})`, { key: SERVICE });
    if (!r.ok) return r.status === 404 ? 0 : 'UNKNOWN';
    const rows = await r.json().catch(() => null);
    return Array.isArray(rows) ? rows.length : 'UNKNOWN';
  };
  const nUsers = await leftover('app_users', 'id');
  const nTenants = await leftover('tenants', 'coach_id');
  // Snapshots hang off tenants, which are gone by now; count by this run's
  // tenant ids rather than by coach.
  const nSnaps = tenantIds.length
    ? await (async () => {
        const r = await api(`/rest/v1/tenant_snapshots?select=id&tenant_id=in.(${tenantIds.join(',')})`, { key: SERVICE });
        if (!r.ok) return r.status === 404 ? 0 : 'UNKNOWN';
        const rows = await r.json().catch(() => null);
        return Array.isArray(rows) ? rows.length : 'UNKNOWN';
      })()
    : 0;

  if (failed || nUsers !== 0 || nTenants !== 0 || nSnaps !== 0) {
    failures++;
    console.error(`  ✗ 🔴 TEARDOWN INCOMPLETE — ${failed} delete(s) failed; left ${nUsers} app_users, ${nTenants} tenants, ${nSnaps} tenant_snapshots OF THIS RUN'S OWN. Clean up before trusting this database.`);
  } else {
    console.log('  ✓ teardown clean — 0 rows in app_users, tenants, tenant_snapshots');
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
  //
  // 🔴 `Prefer: return=representation` is not cosmetic here. Without it a
  //    successful PATCH returns 204 with an EMPTY BODY: `wrote.ok` is true and
  //    `wrote.json()` then THROWS on the empty body. That throw would be caught
  //    by the outer handler as a "harness error" and abort the rest of this
  //    block — so the anon assertion below would never run, and the run would
  //    still be counted as one failure rather than as isolation unproven.
  //    A test that cannot tell "refused" from "succeeded" is worse than none.
  const wrote = await api(`/rest/v1/app_users?id=eq.${ids.B}`, {
    token: tokenB, method: 'PATCH',
    prefer: 'return=representation',
    body: { role: 'pt', parent_pt_id: null },
  });
  const wroteRows = wrote.ok ? await wrote.json().catch(() => null) : [];
  assert(!wrote.ok || (Array.isArray(wroteRows) && wroteRows.length === 0),
    `🔴 B cannot promote themselves to prime — no write policy for authenticated (status ${wrote.status}, rows ${Array.isArray(wroteRows) ? wroteRows.length : 'UNKNOWN'})`);

  // Belt and braces: read B back with service_role and confirm nothing moved.
  // The assertion above trusts PostgREST's response; this one trusts the table.
  const afterRes = await api(`/rest/v1/app_users?select=role,parent_pt_id&id=eq.${ids.B}`, { key: SERVICE });
  const after = (await afterRes.json())[0];
  assert(after && after.role === 'pt' && after.parent_pt_id === ids.A,
    "🔴 B's row is unchanged in the table after the attempted self-promotion");

  // anon is the key that ships in the bundle of a public repo.
  const anonRead = await api('/rest/v1/app_users?select=id');
  const anonRows = anonRead.ok ? await anonRead.json().catch(() => null) : [];
  assert(!anonRead.ok || (Array.isArray(anonRows) && anonRows.length === 0),
    `🔴 the anon key reads NOTHING from app_users (status ${anonRead.status})`);

  // =================================================================
  // tenants / tenant_snapshots (0002) — only if the migration is applied.
  // =================================================================
  const probe = await api('/rest/v1/tenants?select=id&limit=1', { key: SERVICE });
  if (!probe.ok && probe.status === 404) {
    console.log('  -- tenants: 0002 not applied to this instance, skipping --');
  } else {
    console.log('  -- tenants (0002) --');

    const mkTenant = async (who) => {
      const r = await api('/rest/v1/tenants', {
        key: SERVICE, method: 'POST', prefer: 'return=representation',
        // owner_path is omitted deliberately — the trigger stamps it. Passing
        // one by hand is the bug the check constraint exists to catch.
        body: { coach_id: ids[who], data: { marker: who } },
      });
      if (!r.ok) throw new Error(`tenant ${who}: ${r.status} ${await r.text()}`);
      return (await r.json())[0];
    };
    const tA = await mkTenant('A');
    const tB = await mkTenant('B');
    const tD = await mkTenant('D');
    tenantIds.push(tA.id, tB.id, tD.id);

    const seesTenants = async (token) => {
      const r = await api('/rest/v1/tenants?select=coach_id', { token });
      if (!r.ok) throw new Error(`tenants read: ${r.status} ${await r.text()}`);
      return new Set((await r.json()).map(x => x.coach_id));
    };
    const nameSet = s => [...s].map(id => Object.keys(ids).find(k => ids[k] === id)).sort().join(',') || '∅';

    let seen = await seesTenants(await signIn('A'));
    assert(same(seen, set('A', 'B')),
      `A (prime) reads their OWN blob and their sub-pt's, and no other tree's  [got ${nameSet(seen)}]`);

    seen = await seesTenants(tokenB);
    assert(same(seen, set('B')),
      `B (sub-pt) reads ONLY their own blob — not the parent's  [got ${nameSet(seen)}]`);

    seen = await seesTenants(tokenD);
    assert(same(seen, set('D')),
      `🔴 PEER ISOLATION on the data itself: D reads only D's blob  [got ${nameSet(seen)}]`);

    seen = await seesTenants(tokenC);
    assert(same(seen, set()),
      `🔴 a client reads NO coach blob at all — RLS cannot restrict columns, so any client read here would expose every other client's notes  [got ${nameSet(seen)}]`);

    // Write: own only. A parent may READ a descendant's blob (the §11.3
    // drill-in) but must not WRITE it — §12.4 starts closed.
    const writeForeign = await api(`/rest/v1/tenants?id=eq.${tB.id}`, {
      token: await signIn('A'), method: 'PATCH', prefer: 'return=representation',
      body: { data: { marker: 'A-overwrote-B' } },
    });
    const wfRows = writeForeign.ok ? await writeForeign.json().catch(() => null) : [];
    assert(!writeForeign.ok || (Array.isArray(wfRows) && wfRows.length === 0),
      `🔴 A cannot WRITE their descendant B's blob, only read it (status ${writeForeign.status})`);

    // Own write works, bumps version, and files a snapshot of the old bytes.
    const ownWrite = await api(`/rest/v1/tenants?id=eq.${tB.id}`, {
      token: tokenB, method: 'PATCH', prefer: 'return=representation',
      body: { data: { marker: 'B', edited: true } },
    });
    const owRows = ownWrite.ok ? await ownWrite.json() : [];
    assert(ownWrite.ok && owRows.length === 1 && owRows[0].version === tB.version + 1,
      `B CAN write their own blob and version auto-increments ${tB.version} -> ${owRows[0]?.version}`);

    const snaps = await api(`/rest/v1/tenant_snapshots?select=bytes&tenant_id=eq.${tB.id}`, { key: SERVICE });
    const snapRows = await snaps.json();
    assert(Array.isArray(snapRows) && snapRows.length === 1,
      `🔴 the PREVIOUS bytes were filed to tenant_snapshots before being replaced (${snapRows.length} snapshot)`);

    // ---- The re-parent restamp. This is the highest-value assertion here:
    // move B from under A to under D, and B's BLOB must follow. If owner_path
    // is not restamped in the same transaction, A keeps reading B's data and D
    // never can — silently, with nothing logged and nothing to see. ----
    const moved = await api(`/rest/v1/app_users?id=eq.${ids.B}`, {
      key: SERVICE, method: 'PATCH', prefer: 'return=representation',
      body: { parent_pt_id: ids.D },
    });
    assert(moved.ok, `re-parent B from A to D succeeded (status ${moved.status})`);

    seen = await seesTenants(await signIn('A'));
    assert(same(seen, set('A')),
      `🔴 after re-parenting, A can NO LONGER read B's blob  [got ${nameSet(seen)}]`);

    seen = await seesTenants(await signIn('D'));
    assert(same(seen, set('B', 'D')),
      `🔴 after re-parenting, D CAN now read B's blob — the tenant path followed the subtree  [got ${nameSet(seen)}]`);

    // E is B's client, so it moved too — two levels down from D now.
    const eSees = await visibleTo(await signIn('D'));
    assert(eSees.has(ids.E),
      "🔴 B's own client E moved with the subtree — the restamp is recursive, not one level");

    // ---- 0003: a snapshot must OUTLIVE the tenant it documents.
    //
    // 🔴 This is the highest-consequence assertion in the file after isolation.
    //    tenant_snapshots exists because of Apr 13 and Apr 19 — "by the time
    //    anyone noticed, the old bytes were gone". 0002 gave it ON DELETE
    //    CASCADE, so one `delete from tenants` in the SQL console — the NORMAL
    //    administrative route, since §11.1 gives us no in-app admin — would
    //    take the entire undo history with it, silently. 0003 changes the FK to
    //    ON DELETE SET NULL so the history survives, orphaned but intact and
    //    still RLS-readable via its own denormalized owner_path.
    //
    //    This asserts the DATABASE, not the file. `create table if not exists`
    //    skips silently, so a migration sitting in the repo unapplied looks
    //    exactly like one that ran. Until 0003 is applied in the SQL console,
    //    this FAILS — which is the point.
    const tSnapTarget = tenantIds[tenantIds.length - 1];
    // Force one snapshot to exist by changing the blob.
    await api(`/rest/v1/tenants?id=eq.${tSnapTarget}`, {
      key: SERVICE, method: 'PATCH', body: { data: { probe: 'pre-delete' } },
    });
    const before = await (await api(
      `/rest/v1/tenant_snapshots?select=id,tenant_id&tenant_id=eq.${tSnapTarget}`, { key: SERVICE })).json();
    assert(Array.isArray(before) && before.length > 0,
      `a write to a tenant files a snapshot (${before.length ?? 0} row(s))`);

    const delRes = await api(`/rest/v1/tenants?id=eq.${tSnapTarget}`, { key: SERVICE, method: 'DELETE' });
    if (delRes.ok) {
      tenantIds.splice(tenantIds.indexOf(tSnapTarget), 1); // teardown must not retry it
      const survivors = await (await api(
        `/rest/v1/tenant_snapshots?select=id,tenant_id,reason&id=in.(${before.map(r => r.id).join(',')})`,
        { key: SERVICE })).json();
      assert(survivors.length === before.length,
        `🔴 snapshots SURVIVE their tenant's deletion (${survivors.length}/${before.length} kept — 0 means 0003 is not applied)`);
      // `.every()` on an empty array is true — a vacuous pass right underneath a
      // real failure is exactly the kind of green line that gets quoted.
      assert(survivors.length > 0 && survivors.every(r => r.tenant_id === null),
        'orphaned snapshots have tenant_id set to null, not a dangling id');
      // Clean up ours — they are synthetic, and nothing else will collect them
      // now that the cascade no longer does.
      for (const r of survivors) await api(`/rest/v1/tenant_snapshots?id=eq.${r.id}`, { key: SERVICE, method: 'DELETE' });
    } else {
      assert(false, `delete tenant for the snapshot-survival check: ${delRes.status} ${await delRes.text()}`);
    }
  }

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
