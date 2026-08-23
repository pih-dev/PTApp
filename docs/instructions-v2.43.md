# v2.43 — The login goes live (email + guest), before the Play submission

**Date:** 2026-08-23 · **Thread:** design/publishing · **Asked by:** Pierre, from his phone:
after exiting demo the app only offered the token field — *"we need to have a login function…
they can either log in as a guest or with their email. With that, we can do without the token."*

## What was actually missing

Everything was already built and shipped dark: `src/auth.js` (email+password over GoTrue,
provisioned accounts, no self-signup — the Apple 4.8 rule), the sign-in form in
`TokenSetup.jsx` (renders only when `isAuthConfigured()`), Sign out + "signed in as" in General,
identity-keyed storage (`ptapp-data:<userId>`), the App gate `getToken() || isSignedIn()`.
**The build had simply never carried `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`** — so the
login half never rendered on his phone.

## What v2.43 does

1. **`.env` created** (git-ignored, verified with `git check-ignore`) with the URL + **anon key
   only**, copied from `_archive/PTApp/supabase-spotset.env`. The anon key is bundle-safe because
   `force row level security` is on every table; the service_role key was NOT copied and the built
   bundle was grepped to confirm (1 hit for the project URL, 0 for service_role).
   🔴 **`.env` is now a BUILD INPUT: a machine without it builds a token-only app.** The values
   live in `_archive/PTApp/supabase-spotset.env`.
2. **"Continue as guest" button** on the entry screen — the existing DEMO path with a button on
   it: same seed, same 🔴 refusal gate (`anyLocalDataExists()` — guest only onto an empty device),
   new `guestBlocked` message instead of the misleading "invalid token". Typing `DEMO` still works.
3. **Verified live before shipping:** `sanity-rls-matrix` ran its LIVE pass against the real
   project — static + live, all assertions passed.

## What login gives a tester (and what it does not)

A tester signing in with their email gets an identity and their **own empty workspace** under
`ptapp-data:<their-userId>` — they never see Elie's data (RLS: own subtree only; live sync still
rides the GitHub token they don't have). Guest = seeded demo data, offline, sync off.

🔴 **Operational step, not code: tester accounts must be PROVISIONED by Pierre in the Supabase
console** (Authentication → Users → Add user, email + password). No self-signup exists, by rule.
The token path stays until the parallel run ends, then retires per the multi-user plan.

## Files

`.env` (NEW, untracked) · `src/components/TokenSetup.jsx` (guest button) · `src/i18n.js`
(`continueAsGuest`, `guestBlocked` EN/AR) · version bumps.
