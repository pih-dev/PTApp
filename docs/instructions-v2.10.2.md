# PTApp v2.10.2 — Historical Session Numbers Fixed (June 10, 2026)

## What changed for you (the PT)

**Session numbers on old sessions are now correct after a renewal.**
Before this fix, when a client on a contract renewed their package, every session from
*before* the renewal displayed the same wrong number (the current count plus one). Now each
old session shows the number it actually had inside its own package: the third session of
March shows #3, even after you've renewed the client twice since.

- Numbers inside the current package don't change.
- A manual count override only affects the package it was set in — it can't rewrite
  history, and an old package's override can't touch current numbers.

**The session-count chip when editing a booking is now honest.**
When you edit an existing session and change its date, the little count next to the client's
name now shows the number that session *will have* at its new date — same as when you create
a booking. It used to show today's count no matter what date you picked.

**The app stays fast as history grows.**
The way session numbers were computed re-scanned every session in the app for every card on
screen. With a year or two of history that would have made the Sessions and Dashboard tabs
visibly sluggish on your iPhone. The computation is now done once and reused.

## What did NOT change
- No data format change. No migration. Nothing to re-enter.
- Booking, renewal, WhatsApp messages, repeat bookings — all unchanged.
- Current package counts, renewal-due detection, and the red renewal state are unchanged.

## After the June 9–10 sync incident
This release follows v2.10.1, which fixed the bug that silently stopped your iPhone from
uploading data (sessions you booked after June 3 never reached the cloud). Make sure you are
on **v2.10.2** (long-press the version badge in General to check): fully close the app and
reopen it while on Wi-Fi. If the sync dot is red, tap it to retry — and tell Pierre if it
stays red.
