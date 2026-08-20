# v2.15.1 — the DEMO review credential, and the last "PTApp" string

**Date:** 2026-08-20 · **Schema:** DATA_VERSION stays **6** (no migration) ·
**Driver:** Google Play's pre-submission check blocked the closed-testing rollout.

---

## Why this release exists

The v2.15.0 rollout was one click from being submitted when Play Console's automated
quick-check returned **"Missing sign in details"** and attached its evidence: a
screenshot of SpotSet's first screen, showing **"PTApp"** and a box demanding a sync
token.

Two separate defects in one screenshot.

### 1. The rename missed a screen

v2.15.0 renamed the header, the PWA manifest, the page title and the iOS web-app
title — but `src/components/TokenSetup.jsx:40` hardcoded `PTApp` as the setup-card
heading. It is the **first** screen a new install shows, and the only screen a user
sees before authenticating, so it was simultaneously the most visible string in the
app and the one no existing device ever rendered again after its first launch. That
is exactly why it survived the rename: on Pierre's phone and on Elie's, the token is
already stored, so the screen never appears.

`General.jsx:13` was also still serving `instructions-v2.14.md` — the same class of
drift the release checklist's step 3 exists to catch.

### 2. The token screen is a hard authentication gate

`App.jsx` returns `<TokenSetup>` whenever no token is stored. There is no skip, no
read-only mode, no sample state. **No token means no app** — which is correct for a
product holding one trainer's live client records, and fatal for a store review.

Google's reviewers must be able to reach every screen. The obvious fix — hand them a
working token — was rejected outright: the only working token is a PAT with
**write** access to `makdissi-dev/ptapp-data`, the repo holding Elie's real clients,
sessions, evaluations and programs. Handing that to an external reviewer is
indistinguishable from handing it to anyone.

A second idea, a separate demo data repo with its own token, died on a fact from the
code: `src/sync.js:3-4` hardcodes `REPO_OWNER`/`REPO_NAME`. The app cannot be pointed
at another repo without a code change, so *any* token that works is a token that
reaches live data.

---

## What shipped: the DEMO credential

The literal string **`DEMO`** (case-insensitive) is accepted on the token screen in
place of a PAT. It opens the full app on a seeded local dataset with **every network
path disabled**.

```
sync.js          DEMO_TOKEN = 'DEMO'; isDemo() reads the stored token
TokenSetup.jsx   DEMO short-circuits before validateToken() — no fetch at all
demoData.js      buildDemoData(): 4 invented clients, 14 sessions
App.jsx          isDemo() gates initialLoad, reconcile() and the push effect
General.jsx      cloud backup/restore buttons hidden (DEMO is not a real PAT)
```

**Why a credential rather than a visible "Skip" button.** A skip button changes the
product for Elie: it offers, on the very first screen, a way to run the app
untethered and quietly accumulate records that never sync. The failure mode is a
month of sessions living only on one phone. A credential nobody discovers by accident
gives reviewers exactly the access they need and leaves the trainer's screen
byte-identical to what it was.

### The four guards, and why each one is there

1. **`isDemo()` in `reconcile()`** — the single choke point. Returning early means
   `syncReady.current` never flips true, and the Apr-13 guard chain in the save effect
   then blocks every push on its own. Demo mode is safe *by the existing architecture*,
   not by a new special case.
2. **`isDemo()` in the push effect** — redundant today, deliberately. It is belt to
   `syncReady`'s braces: if a future change ever lets `syncReady` become true on a path
   that skipped `reconcile()`, the demo data still cannot leave the device.
3. **`isDemo()` in `initialLoad`'s initial state** — without it the app boots straight
   into the "Syncing…" spinner and waits for a fetch that will never be issued.
4. **DEMO is REFUSED outright on a device holding records** — `TokenSetup` calls
   `loadData()` first and rejects the credential (same error as a bad token) if any
   client or session exists. The first draft merely declined to overwrite them, which
   was worse than it sounds: the token was still written, so a phone holding Elie's
   real clients would sit in permanent demo mode with every sync path short-circuited,
   the dot reading `idle` rather than red, and sessions accumulating that never leave
   the device. Demo is only ever reachable on a device with nothing to lose.
5. **Demo exits by being discarded, never upgraded** — in demo, General's "Update sync
   token" button is replaced by **Exit demo** (clears the token, empties the store,
   reloads). Leaving the original button reachable was a live-data corruption path:
   pasting a real PAT overwrites `'DEMO'` in place, so `isDemo()` goes false while the
   reducer still holds seeded records, and the retry that follows merges them into the
   real `data.json`. Union-by-ID means the `demo_*` IDs match nothing remote, so all 18
   fabricated records get pushed and replicate to the PT's iPhone.

**If demo records ever do reach the live blob**, every one of them carries a `demo_`
ID prefix — `grep '"id": "demo_'` against a snapshot in
`_archive/PTApp/data-snapshots/` isolates them for removal.

### The dates are computed, never written down

`demoData.js` builds every date from `dayOffset(n)` at call time, using
`localDateStr` (never `toISOString()` — that is UTC and lands on the wrong day either
side of midnight in Beirut). A fixture with hardcoded stamps would read as ancient
history within weeks, and the lapsed-session sweep in `App.jsx` would auto-complete
the entire demo schedule on first launch — a reviewer would open the app to a dead
calendar.

The seed spans −14 to +4 days: nine completed sessions so Sessions and the counting
badges have history, five upcoming so Home and Schedule are populated on arrival. The
blob is stamped `_dataVersion: DATA_VERSION` and carries the empty `todos`,
`evaluations`, `programs` and `auditLog` collections a real device holds — unstamped,
`migrateData` reads version 0 and runs the whole v1→v6 legacy chain over a blob that
is already current.

### Two fixes the review pass pulled in with it

- **`.setup-container` could not scroll** (`styles.css`). `html/body/#root` are
  `overflow: hidden` and `100dvh` does not shrink for the iOS keyboard, so focusing the
  token input pushed **Connect** under the keyboard with no way to reach it. Latent
  since the screen was written — nobody hits it because the screen appears once per
  install — and it became urgent the moment a Play reviewer had to complete this exact
  form on an iPhone.
- **`autoCapitalize` was not disabled on the token input.** iOS was capitalising the
  first character; harmless for `DEMO` (it is upper-cased anyway) but it silently
  mangles a pasted-then-edited `ghp_…` PAT.

---

## Store submission

The App access declaration is filled in as **sign-in required**, with the credential
`DEMO` and instructions to type it into the box on the first screen. That is the
truthful declaration: the app *is* gated, and the reviewer *is* being given the way
in.

Build: **versionCode 3 / versionName 2.15.1**.

---

## Rules this release adds

Both are now in CLAUDE.md's TRAPS section, because a rule that lives only here is a
rule the next session will not read:

- **A string only reachable before login is invisible to a rename sweep.** Grep the
  whole of `src/` for the old product name, not the screens you can open.
- **Never hand out a credential that reaches live data.** If review or demo access is
  needed, the access must be to fabricated data on a path that cannot reach the real
  store.
