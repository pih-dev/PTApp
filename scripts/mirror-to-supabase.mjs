// Phase 1 — the one-way mirror. Copies the live data.json into `tenants.data`.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §5 step 1, §6.
//
// 🔴 THIS RUNS FROM PIERRE'S LAPTOP AND NOWHERE ELSE.
//    It holds the service_role key, which bypasses RLS by design. It is NOT
//    part of the app, is never imported by anything under src/, and no
//    credential it uses ever reaches the bundle. The rejected alternative — a
//    mirror credential shipped in the app so the mirror could run from the
//    phone — was cut for exactly this reason: pih-dev/PTApp is public.
//
// 🔴 ONE-WAY, AND GITHUB REMAINS AUTHORITATIVE.
//    Nothing here writes to GitHub. If this script is wrong, the blast radius
//    is a wrong copy in a database nobody reads yet. That is the entire point
//    of doing it before any app code changes.
//
// Run:
//   node scripts/mirror-to-supabase.mjs --email <coach@example.com> [--name "Elie"] [--dry-run]
//
// It will, in order:
//   1. read data.json from makdissi-dev/ptapp-data (via the gh CLI's token),
//   2. find or provision the coach: an auth.users row and an app_users row
//      (role 'pt', no parent ⇒ a prime PT),
//   3. insert or update that coach's `tenants` row,
//   4. read the blob BACK out of Postgres and assert it is byte-identical.
//
// Step 4 is not decoration. `data jsonb` does not preserve key order or
// whitespace, so "the same JSON" and "the same bytes" are different claims —
// and the gate this feeds (sanity-live-supabase-diff.mjs) compares NORMALISED
// bytes for that reason. If the normalised forms ever differ, something ate a
// record, and the 7-day soak exists to catch that before cutover.
//
// Exit 0 = mirrored and verified. Exit 1 = DO NOT PROCEED.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { normalize, assertRealSize, counts, collectionsOf, gitBlobSha } from './lib/normalize.mjs';

const KEYFILE = 'C:/projects/_archive/PTApp/supabase-spotset.env';
const REPO = 'makdissi-dev/ptapp-data';

function loadKeyFile() {
  try {
    const out = {};
    for (const line of readFileSync(KEYFILE, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch { return {}; }
}
const file = loadKeyFile();
const URL_ = process.env.SUPABASE_URL || file.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || file.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !SERVICE) {
  console.error(`✗ No instance configured. Create ${KEYFILE} with SUPABASE_URL and
  SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Project Settings → API Keys).
  That path is outside the repo on purpose; never put these in git.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const EMAIL = arg('--email');
const NAME = arg('--name') || 'PT';
const DRY = args.includes('--dry-run');
// --if-changed: skip the write when Postgres already holds this exact blob.
// The BEFORE UPDATE trigger bumps `version` on EVERY update, data change or
// not, so an hourly unconditional mirror would inflate the optimistic-
// concurrency counter for nothing and make `version` useless as a rough
// "how many real writes" signal.
const IF_CHANGED = args.includes('--if-changed');

if (!EMAIL) {
  console.error('✗ --email <coach@example.com> is required. It names WHO the mirrored blob belongs to.');
  process.exit(1);
}

const api = (path, { method = 'GET', body, prefer } = {}) =>
  fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

// 🔴 `process.exitCode` + throw, NEVER `process.exit()` after a fetch. Calling
//    exit() while a keep-alive socket is closing trips a libuv assertion on
//    Windows and the shell sees 127 instead of 1 — so the "DO NOT PROCEED"
//    paths that matter most would surface with an exit code nothing recognises.
//    The throw unwinds to the top-level handler, which lets the loop drain.
class Stop extends Error {}
const stop = (msg) => { console.error(`✗ ${msg}`); throw new Stop(msg); };
process.on('uncaughtException', (e) => {
  // '__done__' is an early, SUCCESSFUL exit (--if-changed found nothing to do),
  // not a failure — a top-level throw is the only way out of module scope.
  if (e instanceof Stop && e.message === '__done__') return;
  if (!(e instanceof Stop)) console.error(e);
  process.exitCode = 1;
});

const must = async (res, what) => {
  if (!res.ok) stop(`${what}: ${res.status} ${await res.text()}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
};

// ── 1. The live blob ────────────────────────────────────────────────────────
const gh = (a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const meta = JSON.parse(gh(['api', `repos/${REPO}/contents/data.json`, '--jq', '{size:.size,sha:.sha}']));
const raw = gh(['api', `repos/${REPO}/contents/data.json`, '-H', 'Accept: application/vnd.github.raw']);
if (Buffer.byteLength(raw, 'utf8') !== meta.size) {
  console.error(`✗ Truncated read: got ${Buffer.byteLength(raw, 'utf8')} bytes, API says ${meta.size}.`);
  process.exit(1);
}
// Content, not length — see scripts/lib/normalize.mjs `gitBlobSha`. The PT's
// phone can push between the metadata call and the body call and produce a
// same-length revision; mirroring that under the logged sha makes the record of
// what was copied a lie.
const shaNow = await gitBlobSha(raw);
if (shaNow !== meta.sha) {
  console.error(`✗ data.json changed between the two reads (${meta.sha.slice(0,8)} → ${shaNow.slice(0,8)}). Nothing is broken — re-run.`);
  process.exit(1);
}
const data = JSON.parse(raw);
if (typeof data._dataVersion !== 'number') {
  // Never invent one. `?? 6` would stamp a wrong data_version on a blob whose
  // schema nobody has established, and the gate would then compare against it.
  console.error(`✗ data.json has no numeric _dataVersion. Refusing to guess.`);
  process.exit(1);
}
console.log(`GitHub: ${meta.size} bytes, sha ${meta.sha.slice(0, 8)} — _dataVersion ${data._dataVersion}, ` +
  `${data.clients?.length ?? 0} clients, ${data.sessions?.length ?? 0} sessions`);

if (DRY) { console.log('--dry-run: stopping before any write.'); process.exit(0); }

// ── 2. The coach ────────────────────────────────────────────────────────────
// Provision is idempotent: this script is meant to be re-run daily during the
// soak, and the second run must not create a second anything.
// 🔴 PAGINATE, and compare lowercased. The admin list is paged (50 by default)
//    and GoTrue stores emails lowercased — searching page one for an exact-case
//    match would miss yesterday's row, fall through to the create below, and
//    hard-fail on the 422. That breaks the "re-run daily for a week" contract
//    this script is built around. It cannot attach the blob to the wrong owner
//    either way (unique email, unique tenants.coach_id), but a soak that stops
//    on day 3 is a soak that has to start again.
const wanted = EMAIL.trim().toLowerCase();
let uid = null;
for (let page = 1; page <= 50 && !uid; page++) {
  const batch = await must(await api(`/auth/v1/admin/users?page=${page}&per_page=200`), 'list users');
  const list = batch.users || [];
  uid = list.find(u => (u.email || '').toLowerCase() === wanted)?.id || null;
  if (list.length < 200) break;
}
if (uid) {
  console.log(`Coach: existing auth user ${uid}`);
} else {
  // No password is set. The account cannot be signed into until Pierre sets one
  // in the console — the mirror target must not become a live login by accident,
  // and Phase 3 is where a real sign-in is rehearsed with Elie.
  const u = await must(await api('/auth/v1/admin/users', {
    method: 'POST', body: { email: EMAIL, email_confirm: true },
  }), 'create user');
  uid = u.id;
  console.log(`Coach: created auth user ${uid} (NO PASSWORD — cannot sign in yet, by design)`);
}

const existing = await must(await api(`/rest/v1/app_users?select=id,role,path&id=eq.${uid}`), 'read app_users');
if (existing.length) {
  console.log(`Coach: app_users row present, role ${existing[0].role}, path ${existing[0].path}`);
} else {
  // `path` is omitted deliberately — the BEFORE INSERT trigger stamps it, and a
  // hand-passed path is exactly the bug that trigger exists to prevent.
  const row = await must(await api('/rest/v1/app_users', {
    method: 'POST', prefer: 'return=representation',
    body: { id: uid, role: 'pt', parent_pt_id: null, name: NAME },
  }), 'provision app_users');
  console.log(`Coach: provisioned prime PT, path ${row[0].path}`);
}

// ── 3. The tenant ───────────────────────────────────────────────────────────
const tenants = await must(await api(`/rest/v1/tenants?select=id,version&coach_id=eq.${uid}`), 'read tenants');
let tenantId;
if (tenants.length && IF_CHANGED) {
  const cur = await must(await api(`/rest/v1/tenants?select=data&id=eq.${tenants[0].id}`), 'read current blob');
  if (cur.length && normalize(cur[0].data) === normalize(data)) {
    console.log(`Tenant: already holds this exact blob (version ${tenants[0].version}) — nothing to do.`);
    console.log('✓ Mirror up to date.');
    process.exitCode = 0;
    // Nothing below applies; the read-back assertions would only re-prove what
    // the comparison above just proved.
    throw new Stop('__done__');
  }
}
if (tenants.length) {
  tenantId = tenants[0].id;
  // The BEFORE UPDATE trigger bumps `version` and files the previous bytes to
  // tenant_snapshots — so every mirror run leaves a recoverable trail, and a
  // no-change run costs no snapshot because the trigger compares the jsonb.
  const updated = await must(await api(`/rest/v1/tenants?id=eq.${tenantId}`, {
    method: 'PATCH', prefer: 'return=representation',
    body: { data, data_version: data._dataVersion },
  }), 'update tenant');
  // PostgREST answers 200 with [] when the filter matched nothing. Without this
  // the line below would claim success for a write that never happened, and the
  // only thing that noticed would be a crash three steps later.
  if (updated.length !== 1) stop(`update affected ${updated.length} rows, expected 1`);
  console.log(`Tenant: updated ${tenantId} (was version ${tenants[0].version})`);
} else {
  // owner_path omitted — trigger stamps it from app_users.path. Same rule as above.
  const row = await must(await api('/rest/v1/tenants', {
    method: 'POST', prefer: 'return=representation',
    body: { coach_id: uid, data, data_version: data._dataVersion },
  }), 'insert tenant');
  if (row.length !== 1) stop(`insert returned ${row.length} rows, expected 1`);
  tenantId = row[0].id;
  console.log(`Tenant: created ${tenantId}`);
}

// ── 4. Read back and prove it ───────────────────────────────────────────────
const back = await must(await api(`/rest/v1/tenants?select=data,data_version,version&id=eq.${tenantId}`), 'read back');

// The shared normaliser — see scripts/lib/normalize.mjs for why it is shared
// and why it is hand-rolled. Both sides of every GitHub↔Postgres comparison in
// this project go through that one function.
const mine = normalize(data);
const theirs = normalize(back[0].data);
assertRealSize(mine, meta.size, 'local blob');

const keys = collectionsOf(data, back[0].data);
const [ca, cb] = [counts(data, keys), counts(back[0].data, keys)];
for (const k of keys) {
  if (ca[k] !== cb[k]) stop(`${k}: GitHub has ${ca[k]}, Postgres has ${cb[k]}. DO NOT PROCEED.`);
}
if (mine !== theirs) stop(`Normalised blobs differ (${mine.length} vs ${theirs.length} chars). DO NOT PROCEED.`);

console.log(`✓ Read back byte-identical after normalisation (${theirs.length} chars, tenant version ${back[0].version})`);
console.log(`✓ Mirror complete. GitHub remains authoritative — nothing was written to it.`);
