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
  // v2.46 (review S1): tracks whether this call folded remote records into `data`
  // (cold-cache pre-merge below, or arriving via a conflict retry). Only then is
  // the blob returned for the caller to fold into state — see the GitHub driver.
  let didMerge = _retries > 0;

  if (currentTenantId === null || currentVersion === null) {
    // 🔴 A COLD CACHE IS THE DANGEROUS STATE, NOT THE SAFE ONE — AND THE FIX IS
    //    TO MERGE WHAT WE JUST READ, NOT MERELY TO READ IT.
    //    The first version of this fetched only to harvest `currentVersion` and
    //    then PATCHed local `data` straight over the row. That PATCH *succeeds*
    //    — the version matches, we had just read it — so everything the remote
    //    held and local lacked was destroyed with no conflict, no merge and no
    //    error. That is the Apr-13 stale-device loss exactly.
    //
    //    The GitHub driver cannot make this mistake: with no cached `sha` it
    //    omits it, GitHub answers 409, and the retry path refetches and merges.
    //    Safety there is structural. Here, "I have no concurrency token" would
    //    otherwise turn from *rejected* into *authorised* — which is precisely
    //    backwards. Reachable in practice: `activeDriver()` resolves at call
    //    time, so signing in mid-session under `supabase-primary` routes the
    //    next debounced push to a driver whose cache is empty while `syncReady`
    //    is already true from the GitHub fetch. App.jsx's reload narrows that
    //    window; it does not close it, and a timing mitigation is not an
    //    invariant.
    const remote = await fetchRemoteData();
    if (remote) { data = mergeData(data, remote); didMerge = true; }
  }

  if (currentTenantId === null) {
    let created;
    try {
      created = await rest('/rest/v1/tenants', {
        method: 'POST', prefer: 'return=representation',
        body: { coach_id: uid, data, data_version: data._dataVersion },
      });
    } catch (e) {
      // `tenants.coach_id` is UNIQUE (0002), so losing a race with the laptop
      // mirror raises a unique violation. That is a concurrency miss like any
      // other and belongs in the same refetch-and-merge loop — stopping the
      // retry contract at the create boundary would surface as a bare
      // "Sync failed (409)" and leave the first write unmerged.
      if (/\(409\)/.test(e.message) && _retries < 3) {
        const remote = await fetchRemoteData();
        return pushRemoteData(_token, remote ? mergeData(data, remote) : data, _retries + 1);
      }
      throw e;
    }
    // No representation body would leave currentVersion null AFTER the row was
    // written, feeding the cold-cache path above on the very next push.
    if (!created?.length) throw new Error('Sync failed (insert returned no row)');
    currentTenantId = created[0].id;
    currentVersion = created[0].version;
    // v2.46 (review S1): same contract as the GitHub driver — resolve with the
    // blob ONLY when it actually merged remote records, so the caller can fold
    // it into app state; a plain success returns null (no tombstones in
    // mergeById — folding every blob would resurrect in-flight local deletes).
    return didMerge ? data : null;
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
  return didMerge ? data : null;  // v2.46 (review S1): see the create branch above
}

// Phase 3 keeps GitHub as the shadow, so the _archive/snapshot surface the
// General screen offers still routes through the GitHub driver. The database
// files its own copy on every write (`tenant_snapshots`, trigger-driven, and
// after 0003 those rows outlive the tenant), so there is deliberately no
// snapshot API here to keep in step with a second one.
export const supportsSnapshots = false;
