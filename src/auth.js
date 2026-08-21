// SpotSet — the auth module. ONE file owns identity; nothing else talks to GoTrue.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §4, §11.
// Schema this signs into: supabase/migrations/0001_app_users.sql, 0002_tenants.sql.
//
// ── What this is, and what it deliberately is NOT ────────────────────────────
//
// It is a ~200-line wrapper over four GoTrue REST endpoints, using plain
// `fetch`. It is NOT @supabase/supabase-js, and that is a decision, not a
// shortcut:
//   * the bundle is inlined into ONE index.html by vite-plugin-singlefile —
//     every dependency byte lands in the file Elie downloads over Beirut
//     internet;
//   * supabase-js runs its own refresh timer and its own localStorage session
//     writer. Both are things this app must control, because both misbehave in
//     exactly the situation that matters: offline. A background refresh that
//     fails on a dead network must NEVER be able to clear the session;
//   * we already speak this protocol — scripts/sanity/sanity-rls-matrix.mjs
//     drives the same endpoints with the same shapes.
//
// ── The three rules this file exists to enforce ──────────────────────────────
//
// 🔴 1. THE AUTH GATE IS IDENTITY, NEVER TOKEN VALIDITY. (§4)
//       `isSignedIn()` is true for an expired session. An expired token shows a
//       banner; it must never be a login wall. If a lapsed token black-holes
//       Elie's schedule in a gym basement with no signal, multi-user is over —
//       and it is also precisely what Apple tests in Airplane Mode (4.2).
//
// 🔴 2. A 401 MUST NOT LOOK LIKE A NETWORK BLIP. (TRAPS, the Jun-30 incident)
//       Every failure below is a typed error. `AUTH_OFFLINE` keeps the session
//       and retries later; `AUTH_EXPIRED` keeps the session and routes to
//       re-entry. They are never collapsed into one "sync failed".
//
// 🔴 3. SIGNING OUT NEVER DELETES LOCAL DATA.
//       signOut() clears the session and nothing else. The user's blob stays at
//       its namespaced key (see utils.js `storageKey`) so signing back in finds
//       it intact. "NEVER delete or lose user data" outranks tidiness.
//
// No self-signup, no OAuth, no magic links, no password reset by email —
// accounts are provisioned by Pierre in the Supabase console (§11.1), and
// adding "Sign in with Google" would force Sign in with Apple (Guideline 4.8).
// That is why there is no `signUp` export here and there must never be one.

// Vite replaces the whole `import.meta.env` object at build time; under plain
// node (the sanity scripts) it is undefined, hence the guard rather than
// `import.meta.env?.X`, which vite would not substitute.
// `process.env` is the fallback so node can drive this module — the sanity test
// does, and the laptop-run mirror script (§5 step 1) will. Guarded because vite
// leaves `process` undefined in the browser bundle.
const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const nodeEnv = (typeof process !== 'undefined' && process.env) || {};
const env = { ...nodeEnv, ...viteEnv };

// 🔴 Only the anon/publishable key ever reaches the bundle (§4). It is safe
//    there ONLY because `force row level security` is on every table — the key
//    identifies the project, it does not authorise anything. The service_role
//    key must never appear in this repo; pih-dev/PTApp is public.
export const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

// Until the env vars are supplied at build time this module is inert and the
// app behaves exactly as it does today. That is the Phase-1 state on purpose:
// the module ships dark, gets wired to a screen later, and goes live at Phase 3.
export const isAuthConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const SESSION_KEY = 'spotset-auth';

// Refresh this far ahead of expiry. Generous because the alternative — a token
// that dies mid-request on a slow connection — costs a whole sync cycle.
const REFRESH_MARGIN_SEC = 120;

// ─── Typed failures ──────────────────────────────────────────────────────────
// Rule 2 above. Call sites branch on `.code`, never on message text.
export const AUTH_NOT_CONFIGURED = 'AUTH_NOT_CONFIGURED'; // no URL/key in this build
export const AUTH_BAD_CREDENTIALS = 'AUTH_BAD_CREDENTIALS'; // wrong email/password
export const AUTH_OFFLINE = 'AUTH_OFFLINE';               // network unreachable — retry later
export const AUTH_EXPIRED = 'AUTH_EXPIRED';               // refresh token rejected — re-enter password
export const AUTH_FAILED = 'AUTH_FAILED';                 // anything else, with .status

export class AuthError extends Error {
  constructor(code, message, status) {
    super(message || code);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

// ─── Session storage ─────────────────────────────────────────────────────────
// Shape: { access_token, refresh_token, expires_at (epoch seconds), user:{id,email}, expired }
// `expired` is sticky: set when the refresh token is REJECTED (not when it merely
// could not be reached), cleared on the next successful sign-in or refresh.

let cached; // avoids a JSON.parse on every getUserId() — storageKey() calls it on every save

function readSession() {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    cached = raw ? JSON.parse(raw) : null;
  } catch {
    // A corrupt session is not user data — dropping it costs a sign-in, and
    // keeping it would wedge the app on every read.
    cached = null;
  }
  return cached;
}

function writeSession(session) {
  cached = session;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to persist auth session:', e);
  }
  for (const fn of listeners) { try { fn(session); } catch (e) { console.error(e); } }
}

const listeners = new Set();

// Identity changes swap which localStorage blob is truth (utils.js `storageKey`),
// so App must rebuild state rather than keep the previous user's in memory.
// Returns an unsubscribe function.
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSession = () => readSession();
export const getUserId = () => readSession()?.user?.id || null;
export const getUserEmail = () => readSession()?.user?.email || null;

// 🔴 Rule 1. True for an expired session, by design. Never gate the UI on
//    getAccessToken() succeeding.
export const isSignedIn = () => !!readSession();

export function isSessionExpired() {
  const s = readSession();
  if (!s) return false;
  if (s.expired) return true;
  return !!s.expires_at && s.expires_at * 1000 <= Date.now();
}

// ─── Transport ───────────────────────────────────────────────────────────────

async function call(path, { method = 'GET', body, token } = {}) {
  if (!isAuthConfigured()) throw new AuthError(AUTH_NOT_CONFIGURED, 'No Supabase project configured in this build');
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    // fetch only rejects on a transport failure — DNS, no route, TLS, abort.
    // This is the Beirut case, and it must be survivable and silent-ish.
    throw new AuthError(AUTH_OFFLINE, e.message);
  }
  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  if (!res.ok) {
    const msg = json?.error_description || json?.msg || json?.message || text || `HTTP ${res.status}`;
    throw new AuthError(res.status === 400 || res.status === 401 ? AUTH_BAD_CREDENTIALS : AUTH_FAILED, msg, res.status);
  }
  return json;
}

const toSession = (payload) => ({
  access_token: payload.access_token,
  refresh_token: payload.refresh_token,
  // GoTrue returns expires_in (seconds) and usually expires_at (epoch seconds).
  // Compute the fallback rather than trusting either alone.
  expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + (payload.expires_in || 3600),
  user: { id: payload.user?.id, email: payload.user?.email },
  expired: false,
});

// ─── The four operations ─────────────────────────────────────────────────────

// Email + password only. Throws AuthError; never returns a falsy "failed".
export async function signIn(email, password) {
  const payload = await call('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: String(email || '').trim(), password: String(password || '') },
  });
  if (!payload?.access_token || !payload?.user?.id) {
    throw new AuthError(AUTH_FAILED, 'Sign-in response had no session');
  }
  writeSession(toSession(payload));
  return getSession();
}

// 🔴 Rule 3: clears the session ONLY. The signed-out user's data stays at
//    `ptapp-data:<userId>` and is waiting for them when they sign back in.
//    Best-effort server revoke — an offline sign-out must still work locally.
export async function signOut() {
  const s = readSession();
  writeSession(null);
  if (s?.access_token && isAuthConfigured()) {
    try { await call('/auth/v1/logout', { method: 'POST', token: s.access_token }); }
    catch { /* revoke is a courtesy; the local session is already gone */ }
  }
}

// Exchange the refresh token. Distinguishes "could not reach the server" from
// "the server said no" — rule 2, and the whole reason this is not a boolean.
//
// 🔴 SINGLE-FLIGHT, and every write re-reads the session AFTER the await.
//    Two races made this necessary, both proven rather than theorised:
//    1. GoTrue ROTATES refresh tokens. Two concurrent getAccessToken() calls
//       therefore mean one wins with rt2 and the loser gets a 400 for the now-
//       spent rt1 — and a naive `writeSession({...s, expired:true})` would
//       overwrite the freshly valid session with a stale one marked dead. A
//       healthy network, and the user is stuck re-entering a password: the
//       Jun-30 stranded-token outage with a brand-new cause.
//    2. Sign out while a refresh is in flight, and the same stale write
//       RESURRECTS the signed-out session — identity comes back, and with it
//       the storage key, so the next save lands in the previous user's store.
//    The `pending` promise collapses (1); re-reading inside the catch and
//    comparing the refresh token that was actually rejected fixes both.
let pending = null;

export function refreshSession() {
  if (pending) return pending;
  const s = readSession();
  if (!s?.refresh_token) return Promise.reject(new AuthError(AUTH_EXPIRED, 'No refresh token'));
  const usedToken = s.refresh_token;
  pending = (async () => {
    let payload;
    try {
      payload = await call('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: usedToken },
      });
    } catch (e) {
      if (e.code === AUTH_OFFLINE) throw e; // keep the session, try again later
      // The server rejected it. Only mark expired if the session on disk is
      // STILL the one we tried — otherwise it was signed out or already
      // refreshed underneath us, and that newer state must win.
      const now = readSession();
      if (now && now.refresh_token === usedToken) writeSession({ ...now, expired: true });
      throw new AuthError(AUTH_EXPIRED, e.message, e.status);
    }
    // Same check on the success path: a sign-out that happened mid-flight must
    // not be undone by a token arriving late.
    const now = readSession();
    if (!now || now.refresh_token !== usedToken) throw new AuthError(AUTH_EXPIRED, 'Session changed during refresh');
    writeSession(toSession(payload));
    return getSession();
  })().finally(() => { pending = null; });
  return pending;
}

// The only way any other module should obtain a bearer token.
// Returns a valid access token, refreshing first if it is close to expiry.
// Throws AUTH_OFFLINE (transient) or AUTH_EXPIRED (needs the password again).
export async function getAccessToken() {
  const s = readSession();
  if (!s) throw new AuthError(AUTH_EXPIRED, 'Not signed in');
  const stale = s.expired || !s.expires_at || s.expires_at - REFRESH_MARGIN_SEC <= Date.now() / 1000;
  if (!stale) return s.access_token;
  return (await refreshSession()).access_token;
}

// Lets a provisioned user change the password Pierre handed them (§11.1).
export async function changePassword(newPassword) {
  const token = await getAccessToken();
  await call('/auth/v1/user', { method: 'PUT', token, body: { password: newPassword } });
}

// ─── Profile ─────────────────────────────────────────────────────────────────
// The app_users row for the signed-in user: role, parent, display name. RLS
// guarantees this can only ever return that user's own subtree, so selecting by
// id here is a query convenience, not the security boundary (§11.3: the policy
// permits the subtree; the query decides the default, and the default is mine).
export async function fetchProfile() {
  const token = await getAccessToken();
  const uid = getUserId();
  // A session with no user id is not a provisioning problem, and must not be
  // reported as one — `id=eq.null` returns zero rows and the message below would
  // send Pierre hunting for a row that was never the issue.
  if (!uid) throw new AuthError(AUTH_EXPIRED, 'Session has no user id');
  const rows = await call(
    `/rest/v1/app_users?select=id,role,parent_pt_id,name&id=eq.${encodeURIComponent(uid)}`,
    { token },
  );
  // 🔴 A signed-in user with no app_users row sees nothing at all — proven in
  //    the RLS matrix. That is a provisioning error, and it must be loud rather
  //    than an empty app that looks like data loss.
  if (!rows?.length) throw new AuthError(AUTH_FAILED, 'Signed in, but this account has no profile row. Ask Pierre to provision it.');
  return rows[0];
}
