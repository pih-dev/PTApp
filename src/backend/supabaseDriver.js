// The Supabase driver — written now, DORMANT until Phase 3.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §5, §18.
//
// 🔴 WHY IT IS DORMANT, AND WHY THAT IS THE POINT
//    It has no credential of its own and never will. Every request below is
//    made with the SIGNED-IN USER'S access token, obtained from auth.js. With
//    nobody signed in there is no token, so `isAvailable()` is false and
//    `src/backend/index.js` never routes to it.
//
//    The rejected alternative was Design C's Phase-2 dual-write: ship a service
//    session in the app so it can mirror without a login. §4 cut that, and §18
//    restates why — `pih-dev/PTApp` is a PUBLIC repository and the bundle is a
//    single `index.html`. A credential that can write Elie's tenant, shipped in
//    that file, is the `DEMO`-token problem again with a database behind it,
//    and RLS does not save you: a credential scoped to Elie's tenant is
//    *correctly* authorised to overwrite Elie's tenant. During Phase 2 the
//    mirror runs from Pierre's laptop instead
//    (`scripts/mirror-to-supabase.mjs`, hourly).
//
// 🔴 AND WHY IT IS WRITTEN NOW RATHER THAN AT PHASE 3
//    So that Phase 3 is a flag flip against code that has already been read and
//    reviewed, instead of a rewrite performed on the day the storage layer
//    changes underneath the PT's live records. One variable per release.
//
// ── The contract, mapped one-for-one onto the GitHub driver ─────────────────
//
//   GitHub                                   Supabase
//   ──────────────────────────────────────── ──────────────────────────────────
//   GET /contents/data.json, cache `sha`     select data, version from tenants
//   PUT with `sha`; 409 ⇒ refetch, merge,    update … where version = $v;
//     retry ×3                                 0 rows ⇒ refetch, merge, retry ×3
//   401 ⇒ TOKEN_EXPIRED                      401/refresh failure ⇒ TOKEN_EXPIRED
//
// The 409-merge loop maps exactly onto optimistic concurrency on `version`, so
// `mergeData`, per-record `_modified` and union-by-ID all survive untouched.
// `DATA_VERSION` stays 6 and no `migrateData` step runs during the cutover —
// the highest-risk operation in this codebase simply is not performed.

import { mergeData } from '../utils.js';
import {
  SUPABASE_URL, SUPABASE_ANON_KEY, isAuthConfigured,
  getAccessToken, getUserId, isSignedIn, AUTH_OFFLINE, AUTH_EXPIRED,
} from '../auth.js';

// The optimistic-concurrency token, and the direct analogue of the GitHub
// driver's module-level `currentSha`.
//
// 🔴 IT MUST BE RESET WHENEVER THE DRIVER OR THE IDENTITY CHANGES (§4).
//    A stale cached version at the moment of a rollback is a blind overwrite —
//    the write says "I am replacing version 7" when the row has moved on, and
//    on a driver flip that is precisely when the cache is stale.
let currentVersion = null;
let currentTenantId = null;

export const resetConcurrencyToken = () => { currentVersion = null; currentTenantId = null; };

// The only gate. No session ⇒ this driver does not exist.
export const isAvailable = () => isAuthConfigured() && isSignedIn();

async function rest(path, { method = 'GET', body, prefer } = {}) {
  let token;
  try {
    token = await getAccessToken();
  } catch (e) {
    // Preserve the distinction the whole auth module is built around: a dead
    // session routes to re-entry, an unreachable one retries later. Collapsing
    // them is the Jun-30 stranded-token incident.
    if (e.code === AUTH_OFFLINE) throw new Error('Sync failed (offline)');
    throw new Error('TOKEN_EXPIRED');
  }
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    throw new Error(`Sync failed (network: ${e.message})`);
  }
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Read this coach's blob. Returns null when no tenant row exists yet, which is
// the same shape the GitHub driver returns for a 404 — so App.jsx's
// "first-ever sync, just push local" branch works unchanged.
export async function fetchRemoteData() {
  const uid = getUserId();
  if (!uid) throw new Error('TOKEN_EXPIRED');
  const rows = await rest(`/rest/v1/tenants?select=id,data,data_version,version&coach_id=eq.${encodeURIComponent(uid)}`);
  if (!rows?.length) {
    resetConcurrencyToken();
    return null;
  }
  currentTenantId = rows[0].id;
  currentVersion = rows[0].version;
  return rows[0].data;
}

// 🔴 MERGE, NEVER BLIND-OVERWRITE — the same contract as the GitHub driver's
//    409 path, and for the same reason. `update … where version = $v` returning
//    zero rows means another device wrote between our read and our write; we
//    re-read, merge per record by `_modified`, and retry. Three attempts, then
//    surface. Never a bare overwrite, never a silent catch.
export async function pushRemoteData(_token, data, _retries = 0) {
  const uid = getUserId();
  if (!uid) throw new Error('TOKEN_EXPIRED');

  if (currentTenantId === null || currentVersion === null) {
    // No cached token means we have not read this session. Read first: pushing
    // without a version to compare against is the blind overwrite itself.
    await fetchRemoteData();
  }

  if (currentTenantId === null) {
    const created = await rest('/rest/v1/tenants', {
      method: 'POST', prefer: 'return=representation',
      body: { coach_id: uid, data, data_version: data._dataVersion },
    });
    currentTenantId = created[0].id;
    currentVersion = created[0].version;
    return;
  }

  const updated = await rest(
    `/rest/v1/tenants?id=eq.${currentTenantId}&version=eq.${currentVersion}`,
    { method: 'PATCH', prefer: 'return=representation', body: { data, data_version: data._dataVersion } },
  );

  if (!updated || updated.length === 0) {
    if (_retries >= 3) throw new Error('Sync conflict persists after 3 retries');
    const remote = await fetchRemoteData();
    const merged = remote ? mergeData(data, remote) : data;
    return pushRemoteData(_token, merged, _retries + 1);
  }

  currentVersion = updated[0].version;
}

// Phase 3 keeps GitHub as the shadow, so the _archive/snapshot surface the
// General screen offers still routes through the GitHub driver. The database
// files its own copy on every write (`tenant_snapshots`, trigger-driven, and
// after 0003 those rows outlive the tenant), so there is deliberately no
// snapshot API here to keep in step with a second one.
export const supportsSnapshots = false;
