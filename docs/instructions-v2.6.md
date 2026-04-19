# PTApp Instructions — v2.6

v2.6 is a **pure reliability release** — no new screens, no visual changes, no new buttons. Everything from v2.5 still works exactly the same way. If you're already comfortable with v2.5, you don't have to learn anything new.

For the full feature walkthrough (every screen, every workflow), see [`instructions-v2.5.md`](instructions-v2.5.md). The changes below are the only differences.

---

## What Changed in v2.6

**Multi-device sync is now bulletproof against data loss.**

The app runs on three devices that share data: the PT's iPhone, Pierre's Android, and Pierre's mother's iPhone. With Lebanon's unstable internet and devices opening the app at different times (sometimes weeks apart), sync conflicts used to be able to silently wipe sessions — like Hala Mouzanar's Apr 17 session in the Apr 19 incident.

v2.6 replaces the old sync strategy with a **per-record merge**: every session, client, and todo now carries its own timestamp, and when two devices meet on GitHub, the app picks the newer version of each record individually instead of picking one whole state over the other.

**What this means for you day-to-day:**
- **You can't lose a session to another device anymore.** If you book a client on your iPhone and Pierre's phone is offline, or mother's phone opens two weeks later with old data, your booking is still there. Their devices merge with your changes instead of overwriting them.
- **Failed syncs are visible.** The red dot now reliably appears whenever sync fails — no more silent failures pretending everything's fine.
- **Your latest edit always wins.** If you edit a session's notes on your iPhone and another device has an older version of the same session, your edit wins on the next sync because your timestamp is newer.

**What stays the same:**
- The green/blue/red sync dot still works the same way — tap red to retry.
- Offline works the same — app keeps working, pushes sync when back online.
- All tabs, buttons, and flows are identical to v2.5.

**One trade-off to be aware of:**
- **Deletes can come back if a stale device syncs.** If you delete a client on your iPhone and then mother's phone opens the app with an old copy that still has the client, the client will come back. This is by design — the app prefers to *keep* data rather than *lose* it. If it happens, just delete the client again. If this becomes a real problem, we can add proper deletion tracking (called "tombstones") in a future version.

---

## Under the Hood (for reference)

For anyone curious about what's happening when you sync:

1. **Local change** (you add/edit/cancel a session): the app stamps that record with the current timestamp and saves to your phone's storage.
2. **1 second later**, the app tries to push to GitHub.
3. **If another device pushed in the meantime** (HTTP 409 conflict): the app fetches the latest remote data, merges it with yours record-by-record (newer timestamp wins per record), then pushes the merged result.
4. **If the push fails** (no internet, token issue, etc.): red dot appears. Your data is safe locally. Tap red to retry, or it retries automatically next time you open the app.
5. **When you open the app**: it fetches remote, merges with your local data, and displays the merged result. Any records you have that remote didn't get pushed up. Any records remote has that you didn't get merged in.

No record is ever discarded — only upgraded to its newest version.

---

## Technical details

See `docs/changelog-summary.md` for the plain-English story of the Hala Mouzanar incident that triggered this redesign, and `docs/changelog-technical.md` for the full forensics and code changes.

The main files changed:
- `src/utils.js` — reducer now stamps `_modified` per record; added `mergeData()` and `dataEquals()` helpers.
- `src/sync.js` — `pushRemoteData` on HTTP 409 now merges instead of blind-overwrite.
- `src/App.jsx` — one `reconcile()` function replaces four places that had silent `.catch(() => {})` error swallowing.
