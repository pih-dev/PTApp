// The GitHub driver — today's sync path, moved here unchanged.
//
// 🔴 NOTHING IN THIS FILE WAS REWRITTEN IN THE PHASE-2 SPLIT.
//    This is the code that has carried the PT's real records since v2.6,
//    through the Apr-13 and Apr-19 data losses and the fixes that came out of
//    them: the three push guards, the 409-retry-merge loop, per-record
//    `_modified`, union-by-ID, and the chunked base64 that stopped iOS
//    throwing RangeError past ~65K bytes. It was MOVED, not touched. Rewriting
//    a merge you have hardened over four months, at the same time as changing
//    where the bytes live, is the single failure the phased plan exists to
//    avoid — and it is exactly why the blob survives into Postgres verbatim
//    instead of being shredded into tables.
//
//    Callers do not import this directly. `src/backend/index.js` chooses the
//    driver; `src/sync.js` re-exports that so no call site changed.

import { mergeData, TOKEN_KEY, DEMO_TOKEN, isDemo } from '../utils.js';

const REPO_OWNER = 'makdissi-dev';
const REPO_NAME = 'ptapp-data';
const DATA_FILE = 'data.json';
// TOKEN_KEY / DEMO_TOKEN / isDemo now live in utils.js — see the note there.
// utils cannot import this file (it already imports utils), and openWhatsApp needs
// to know about demo mode. Re-exported below so every existing call site is unchanged.

let currentSha = null;

// 🔴 The cached concurrency token, and it must be cleared on any driver or
//    identity change (§4). A stale `sha` at the moment of a flip or a rollback
//    is a blind overwrite: the PUT claims to be replacing a revision the repo
//    has already moved past, and GitHub's own 409 protection is what that sha
//    exists to trigger. Cleared via `resetConcurrencyTokens()` in backend/index.js.
export const resetConcurrencyToken = () => { currentSha = null; };

// v2.15.1 — Google Play review credential. The token screen is a hard gate, and the
// only real token is a PAT with write access to the PT's live client data. DEMO is
// accepted in its place: it unlocks the UI on a seeded local dataset and every sync
// path below is skipped, so a reviewer can never read or write the real repo.
export { DEMO_TOKEN, isDemo };

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function toBase64(str) {
  // v2.10.1 CRITICAL: encode in chunks. The old one-liner spread the ENTIRE byte
  // array as function arguments (`String.fromCharCode(...bytes)`); JS engines cap
  // argument counts (~65K on iOS Safari/JSC) and throw RangeError past that. The
  // live data.json is already >110KB — every push from the PT's iPhone was one
  // growth spurt away from a permanent "sync failed" outage.
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const CHUNK = 0x8000; // 32K — safely under every engine's argument limit
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Serialize state for upload. Compact (no pretty-print) — data.json is machine-read
// only (fromBase64 → JSON.parse), and the `null, 2` indent was roughly doubling the
// bytes uploaded on every debounced push over the PT's unstable Beirut connection.
const serialize = (data) => JSON.stringify(data);

function fromBase64(b64) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0))
  );
}

export async function validateToken(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  return res.ok;
}

export async function fetchRemoteData(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (res.status === 404) {
    currentSha = null;
    return null;
  }
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);
  const json = await res.json();
  currentSha = json.sha;
  return JSON.parse(fromBase64(json.content));
}

export async function pushRemoteData(token, data, _retries = 0) {
  const body = {
    message: 'Update app data',
    content: toBase64(serialize(data)),
  };
  if (currentSha) body.sha = currentSha;

  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    if (_retries >= 3) throw new Error('Sync conflict persists after 3 retries');
    // Another device pushed between our fetch and push. Merge records (last-write-wins
    // per record by `_modified`) so we never blind-overwrite their additions.
    // This is the bulletproofing for the unstable-connectivity 3-device setup.
    const remote = await fetchRemoteData(token);
    const merged = remote ? mergeData(data, remote) : data;
    return pushRemoteData(token, merged, _retries + 1);
  }
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);

  const json = await res.json();
  currentSha = json.content.sha;
}

// ─── Snapshots ───
const SNAPSHOT_DIR = 'snapshots';

// Save a timestamped snapshot to GitHub
export async function saveSnapshot(token, data) {
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const filename = `${SNAPSHOT_DIR}/${ts}.json`;
  const body = {
    message: `Snapshot ${ts}`,
    content: toBase64(serialize(data)),
  };
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Snapshot failed (${res.status})`);
  return ts;
}

// List available snapshots from GitHub
export async function listSnapshots(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SNAPSHOT_DIR}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (res.status === 404) return []; // no snapshots yet
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  const files = await res.json();
  return files
    .filter(f => f.name.endsWith('.json'))
    .map(f => ({ name: f.name.replace('.json', ''), path: f.path }))
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first
}

// Fetch a specific snapshot from GitHub
export async function fetchSnapshot(token, path) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const json = await res.json();
  return JSON.parse(fromBase64(json.content));
}
