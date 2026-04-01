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

export async function pushRemoteData(token, data) {
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
    // SHA conflict — fetch latest SHA and retry once
    await fetchRemoteData(token);
    return pushRemoteData(token, data);
  }
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);

  const json = await res.json();
  currentSha = json.content.sha;
}
