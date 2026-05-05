# WhatsApp Automation Exploration + Calendar-Link-In-Booking-Message — PAUSED

**Date:** 2026-05-04
**Status:** PAUSED before any design or code. Two topics, both shelved.
**Reason for pause:** Pierre paused mid-brainstorm to clear context and pick up later.

This document captures (1) the analysis of how to automate confirm/decline in WhatsApp so future sessions don't redo it, and (2) the pause point of the calendar-link brainstorm so it can resume cleanly.

---

## A. WhatsApp confirm/decline automation — three paths analyzed

PT was sitting with Pierre 2026-05-04. Pierre asked: can we make the client's tap on Confirm or Decline in WhatsApp reflect in PTApp automatically? And if accepted, add it to the client's calendar?

### Path 1 — WhatsApp Business app (free, on phone)
**Rejected for automation.** The Business app is just a different consumer app on the same number — it adds business profile, quick replies, labels, away messages, catalog. None of that exposes a programmatic API. Messages sent through the Business app are not readable by code.

Worth knowing: switching the PT's number from regular WhatsApp to the Business app is free, low risk, same number — but Pierre declined to do it during this session because it isn't a precondition for the chosen path. Standalone perks (profile / labels / quick replies) weren't compelling enough to switch on their own.

### Path 2 — WhatsApp Business Cloud API (Meta)
**Rejected.** This is what would technically enable interactive button replies → webhook → PTApp update. It is, however, a dealbreaker for Pierre's setup:

- **Number lock-in.** A phone number registered with the WhatsApp Business Cloud API can no longer be used with regular WhatsApp on the phone. PT would either lose his personal WhatsApp on his number, or need a separate dedicated number.
- **Backend required.** PTApp is a static PWA (localStorage + GitHub data sync). Cloud API needs a server to receive webhooks.
- **Meta business verification.** Account approval, pre-approved message templates, per-conversation costs.

The architecture is real and works, but the cost (PT giving up personal WhatsApp on his number, or buying/maintaining a second number purely for this app) is too high relative to the benefit.

### Path 3 — Confirm-page link in WhatsApp message (CHOSEN direction)
**Sketch:**
1. Booking WhatsApp message includes a link unique to that session (e.g. `https://pih-dev.github.io/ptapp-confirm/?sid=<id>&token=<short-lived>`).
2. Client taps the link → tiny static page on GitHub Pages.
3. Page presents Confirm / Decline (or Reschedule) buttons.
4. On tap, the page calls a small backend proxy (Cloudflare Worker, free tier) that holds a server-side GitHub token and writes the confirm/decline back to the `makdissi-dev/ptapp-data` repo (same data store PTApp syncs against).
5. PT's PTApp picks up the change via existing sync on next reconcile.

**Why this is right:**
- Works on PT's existing personal WhatsApp number — no lock-in.
- No Meta business verification, no per-message costs.
- Lighter than Cloud API (one tiny static page + one Worker, both free tiers).
- The same surface can host the "add to calendar on confirm" flow as a follow-on.
- This IS the same idea already captured in `memory/project_confirm_page_deferred.md` — that memory's "deferred to Stage 2" framing predates this exploration; the new framing is "this is the chosen direction when we automate confirm/decline, regardless of Stage 2 timing."

**Open design questions when this resumes:**
- Token / signing strategy for the link (HMAC of session id with a server-side secret; expiry; one-shot).
- Worker endpoint shape (single `/respond` endpoint or split per action).
- Failure modes: what if PT's data repo is mid-merge when the Worker writes? (Reuse the same `mergeData` semantics — per-record `_modified` wins.)
- UI: client-side page in EN+AR matching PT's selected language for that client's messages.
- Whether Reschedule needs structured input or is just a free-text WhatsApp reply.
- Whether Decline triggers a notification surface in PTApp beyond the status flip.

**What does NOT need to be redone:**
- Number choice — stays on PT's existing personal number.
- App switch — Business app is not needed; do not propose switching as a prerequisite.

---

## B. Calendar-link in booking message — brainstorm paused at Q1

Pierre wants the booking WhatsApp message to include a link the client can tap to add the session to their calendar. Brainstorm was invoked, got as far as Q1, then shelved.

### Code context already gathered
Saves re-discovery on resume:

- `DEFAULT_TEMPLATES` lives at `src/utils.js:912` with `en` + `ar` for `booking` + `reminder`.
- Existing placeholders: `{name} {type} {emoji} {date} {time} {duration} {number} {periodEnd} {packageProgress}`.
- `fillTemplate` (`src/utils.js:926`) does plain string-replace.
- `sendBookingWhatsApp` (`src/utils.js:952`) URL-encodes the entire message into a `wa.me` link.
- Embedding a Google Calendar URL inside the message body works fine because the outer `encodeURIComponent` correctly encodes inner `?`/`&` once; WhatsApp's URL detector then sees the decoded URL in the rendered message and makes it tappable.
- PT can edit the booking template freely from the General panel; default template lives in `DEFAULT_TEMPLATES`.

### Q1 (unanswered) — scope of today's calendar link
- **A) Manual tap.** Link appears in the booking message; client taps it themselves to add the session. Independent of any confirm flow. Ships standalone.
- **B) Auto-add only after confirmation.** Link surfaces only after the client confirms via the Path 3 confirm page. Requires Path 3 to exist first.
- **C) Both eventually.** Ship A now, layer B on top once the confirm page exists.

### Likely follow-up questions (rough order)
1. Calendar URL format. Google Calendar event-add URL works universally (web everywhere, opens Google Calendar app on Android, opens browser on iOS). `.ics` is friendlier for Apple Calendar but needs a tiny static page to host. Mixed-mode (link to a small JS page that picks per platform) is the most universal.
2. Placeholder name. `{calendarLink}`? `{addToCalendar}`?
3. Default template wording — both EN and AR. PT input on Arabic phrasing matters.
4. Event title/details. "Strength session with [PT name]"? Localized?
5. Timezone. Beirut (`Asia/Beirut`) hardcoded vs derived from device.
6. Duration. Already on the booking — straight passthrough.
7. PT-positionable in template, or always appended?

### Resumption protocol
1. Re-read this section.
2. Ask Q1 — confirm A vs B vs C (probably A given Path 3 hasn't been built yet).
3. Continue brainstorm from likely-follow-up #1.
4. The brainstorming-skill TaskCreate tasks won't survive `/clear`; recreate them.

---

## Pause-point summary
- No code touched.
- No version bump.
- Master at `9b664c0` (v2.9.6) at session start. Session-end commit is docs-only.
- Both topics ready to resume from this document plus the pointer memories `project_whatsapp_automation_exploration.md` and `project_calendar_link_brainstorm_paused.md`.
