import { mergeData } from './utils.js';

const REPO_OWNER = 'makdissi-dev';
const REPO_NAME = 'ptapp-data';
const DATA_FILE = 'data.json';
const TOKEN_KEY = 'ptapp-sync-token';

let currentSha = null;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function toBase64(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

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
    content: toBase64(JSON.stringify(data, null, 2)),
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
    content: toBase64(JSON.stringify(data, null, 2)),
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
