// The backend facade. ONE place decides where the bytes go.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §5, §18.
//
// Call sites do not import a driver. They import `src/sync.js`, which
// re-exports this — so the Phase-2 split changed zero call sites, and the
// Phase-3 cutover changes one constant rather than a call graph.
//
// ── The modes ───────────────────────────────────────────────────────────────
//
//   'github-primary'    TODAY. GitHub is authoritative. The Supabase copy is
//                       kept up to date by `scripts/mirror-to-supabase.mjs`
//                       running hourly from Pierre's laptop — NOT by this app.
//                       §18: no credential that can write the PT's tenant may
//                       ship in a public repo's single-file bundle.
//
//   'supabase-primary'  PHASE 3. Reads and writes go to Postgres under the
//                       signed-in user's own token, and GitHub becomes the
//                       shadow (reverse mirror). Not reachable until a real
//                       session exists.
//
// 🔴 THE ROLLBACK IS THIS CONSTANT. Flip it, rebuild, redeploy gh-pages: under
//    15 minutes, no data reconstruction, because the other store was being kept
//    current the whole time. That property is the reason for the whole phased
//    plan, and it only holds while BOTH legs keep running.

import * as github from './githubDriver.js';
import * as supabase from './supabaseDriver.js';

const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const nodeEnv = (typeof process !== 'undefined' && process.env) || {};

export const BACKEND_MODE = viteEnv.VITE_BACKEND_MODE || nodeEnv.VITE_BACKEND_MODE || 'github-primary';

// 🔴 `isAvailable()` is checked at CALL TIME, not at module load. A build set to
//    'supabase-primary' whose user is signed out must fall back to GitHub
//    rather than throw — that is the Airplane-Mode / expired-session property
//    again: an identity problem degrades sync, it never bricks the app.
// 🔴 THE FLIP ITSELF RESETS THE CACHES, and it has to happen HERE rather than
//    at a call site. The comment on resetConcurrencyTokens() promised "any
//    driver or identity change", but only the identity half had a caller —
//    `activeDriver()` silently changing its return value fired nothing. That is
//    the exact moment a cached token is stale: the outgoing driver's `sha` or
//    `version` describes a revision the incoming store has never heard of, and
//    carrying it across is a write claiming to replace something that does not
//    exist. Cheap, and the failure it prevents is silent.
let lastDriver = null;
export const activeDriver = () => {
  const d = (BACKEND_MODE === 'supabase-primary' && supabase.isAvailable()) ? supabase : github;
  if (lastDriver !== null && d !== lastDriver) resetConcurrencyTokens();
  lastDriver = d;
  return d;
};

export const isSupabasePrimary = () => activeDriver() === supabase;

// ── Token helpers: always GitHub's ──────────────────────────────────────────
// The PAT and the `DEMO` sentinel are GitHub-side concepts and stay that way
// through Phase 4. `DEMO` in particular must keep working exactly as it does
// today no matter what the backend flag says — it is the store reviewer's
// credential and the only path that survives Airplane Mode.
export const {
  DEMO_TOKEN, isDemo, getToken, saveToken, clearToken, validateToken,
  saveSnapshot, listSnapshots, fetchSnapshot,
} = github;

// ── The data path: whichever driver is active ───────────────────────────────
export const fetchRemoteData = (token) => activeDriver().fetchRemoteData(token);
export const pushRemoteData = (token, data) => activeDriver().pushRemoteData(token, data);

// 🔴 Reset the cached concurrency token on any driver or identity change (§4).
//    Both drivers cache one — GitHub a `sha`, Supabase a `version` — and a
//    stale one at the moment of a flip is a blind overwrite: the write claims
//    to be replacing a revision the store has already moved past. App.jsx calls
//    this from its `onAuthChange` path before it reloads.
export const resetConcurrencyTokens = () => {
  github.resetConcurrencyToken?.();
  supabase.resetConcurrencyToken?.();
};
