// `sync.js` is now a re-export of the backend facade.
//
// It stays here, with this exact name, on purpose: App.jsx, General.jsx,
// TokenSetup.jsx and TokenUpdateModal.jsx all import from '../sync', and the
// Phase-2 driver split was required to change ZERO call sites. A refactor that
// touches the sync path and the call sites in the same commit is two variables
// in one release, on the one file in this codebase that has already lost the
// PT's data twice.
//
// Where things actually live now:
//   src/backend/index.js           chooses the driver (BACKEND_MODE)
//   src/backend/githubDriver.js    today's code, moved verbatim, still authoritative
//   src/backend/supabaseDriver.js  written and DORMANT until Phase 3 (§18)
export * from './backend/index.js';
