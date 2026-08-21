# SpotSet v2.16.0 — what changed

**2026-08-21.** `DATA_VERSION` stays **6**. No migration, nothing to re-enter, nothing to do on your
phone beyond opening the app once.

---

## What you will actually notice

**One thing, and only if you look for it: cancelled sessions you forgave no longer show a session
number.**

When you cancel a session and don't charge for it, that session doesn't use up one of the client's
paid sessions — that has always been true. But the card still printed a number next to it, and the
number was meaningless: it showed whatever the *next* session's number would be. On your real data
there were **44 of these**, some showing things like "#11" on a session that counts for nothing.

They now show no number at all, which is the honest answer. A cancelled session you **did** charge
for still shows its number, because it did consume a session.

**Nothing else on your screens changed.** Your clients, sessions, counts, programs and evaluations
are exactly as they were.

---

## What changed underneath (invisible, but worth knowing)

### The session number is now computed one way, in one place

The "#7" badge is worked out live, every time it's drawn — never stored. Storing it would go stale
the moment a session is cancelled, deleted or overridden.

There was also a genuine bug in the old maths: a session **booked into a past date** inside the
current period was numbered as though it came last. Book on the 2nd when you already have sessions
on the 1st and 3rd, and it said "#4" instead of "#2" — and the session that really was #2 kept its
number too, so two rows showed the same one. Fixed, and there is now a test for exactly that case.

### Sign-in exists, but is switched off

There is a login screen behind the scenes for the multi-coach version being built. **It does not
appear in this build** and changes nothing about how you connect — the sync token works exactly as
before. It is here so the next release is a small step rather than a big one.

### The sync code was reorganised, not rewritten

`sync.js` was split so a second storage backend can be added later. The GitHub code that carries
your data was **moved, not changed** — verified by comparing it byte for byte against the previous
version. Your data still lives in the same place, reaches it the same way, and merges the same way.

### Arabic fixes on the connect screen

The screen you see before connecting was laid out left-to-right even in Arabic. Fixed.

### The crash screen was reading the wrong place

If the app ever crashed, "Download backup" and "Reset data" could have looked at the wrong storage
location. Both fixed; "Reset" now really does clear everything, which is what its warning always
promised.

---

## For the record

- Verified against your real exported data before shipping: of 514 sessions, **44 numbers changed
  and none of them belonged to a session that counts.**
- 17 of 20 automated checks pass; the 3 failures are deliberate expired gates from older releases.
- Rollback: redeploy the previous `index.html` to gh-pages. No data conversion, nothing to undo.
