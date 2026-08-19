# Stage 2 — Native App & Publishing Guide

## Building the Native App
- **Recommended approach**: Wrap the existing web app with **Capacitor** (Ionic's tool) to produce a real iOS/Android app with minimal code changes.
- This unlocks: Siri Shortcuts, push notifications, offline mode, home screen icon as a proper app.
- A full native rewrite (Swift/Kotlin) is overkill for the current feature set.

## Apple App Store
- **Apple Developer Account**: $99/year — re-verified 2026-08-19 by fetching
  <https://developer.apple.com/support/compare-memberships/>, which reads "99 USD (or in local
  currency where available)". Personal ID only — no company needed.
- Individual account allows selling apps. Apple handles payment processing and tax.
- Review process: typically 1–3 days, first submission may take longer.
- Requires a Mac for building/signing (Xcode).

## Google Play Store
- **Google Play Developer Account**: $25 one-time fee.
- Faster review, usually under a day.
- Can build from any OS.

### 🔴 Closed-testing gate — the real schedule cost (verified 2026-08-19)
Google's fee is trivial; its **time** cost is not. A **personal** developer account created after
**2023-11-13** cannot get production access until it has run a closed test with a **minimum of 12
testers, opted in continuously for at least 14 days**. Testers who opt out and back in **reset the
counter**, and testers who test for fewer than 14 days do not count at all. You also answer
questions about the testing process when applying for production access.

Source, fetched 2026-08-19:
<https://support.google.com/googleplay/android-developer/answer/14151465>

**Consequences for planning:**
- Budget **≥2 weeks** between "the build is ready" and "it is on Play" — this is a waiting period,
  not a review queue, and no amount of polish shortens it.
- You need **12 real Google accounts** that stay opted in. Elie's client roster covers this, but
  they must be recruited and told *not* to leave the test.
- The rule is written as applying to **personal** accounts. Whether an **Organization** account
  escapes it was **NOT verified** — do not plan around that until someone reads Google's page for
  organization accounts. An org account needs a legal entity anyway, which cuts against the
  "no company needed" conclusion below.
- Start the closed test **early** — it can run while the app name, icon and privacy policy are
  still being finalised.

## Do You Need a Company?
- **No** — both stores allow individual developers to publish and sell apps.
- A Lebanese company (or LLC) only matters for:
  - Business bank account for app revenue
  - Liability protection
  - B2B invoicing
- Many indie devs publish under their personal name for years before incorporating.
- **When to incorporate**: if the app earns meaningful revenue or you want professional branding.

## Prerequisites Before Publishing
- [ ] Final app name (not "PTApp") — must be unique and not trademarked in fitness/trainer space
- [ ] App icon and branding assets
- [ ] Privacy policy (required by both stores)
- [ ] Capacitor setup and tested builds on both platforms
- [ ] Apple Developer account ($99/yr)
- [ ] Google Play Developer account ($25 one-time)
- [ ] **12 closed testers recruited and opted in for 14 continuous days** (Play only — start this
      early, it runs in parallel with everything else above)
- [ ] A Mac with Xcode for the iOS build/signing — Pierre develops on Windows, so this is a real
      gap, not a formality

## Liability & Legal

**Risk level: Low.** A simple trainer scheduling tool sold by an individual developer.

### What you're liable for
- **Privacy policy** — required by both stores. The app stores client names and phone numbers, so you must disclose that. GDPR applies if any user is in the EU. Free generators exist online.
- **App functionality** — if someone pays and it doesn't work, they can request a refund (Apple/Google handle this).
- **Content** — you're responsible for what the app does. Trainer management is low-risk (no payments processing, no health/medical data, no minors).

### What you're NOT liable for
- No lawyer needed to publish a free or paid app as an individual.
- Apple and Google act as merchant of record — they handle payment disputes, tax collection (in most countries), and refunds.

### Lebanon-specific
- No specific app store regulations or data protection law currently.
- You're mostly governed by the store's terms + the user's country laws.
- Tax: app store income is technically taxable in Lebanon, but enforcement on small indie dev revenue is effectively zero.

### When liability increases (not applicable now)
- If the app handles **payments** (charging clients directly) — financial compliance required.
- If it stores **health/medical data** — stricter rules (HIPAA in US, etc.).
- If you **sell it as a SaaS to other trainers** — terms of service and liability matter more.

### Bottom line
No lawyer, no company needed. Write a privacy policy (free generators online), publish as individual. Revisit if the app grows into a business.

## Notes
- Created 2026-04-02 based on research discussion.
- **Updated 2026-08-19** — fees re-checked and the Play closed-testing gate added, because the
  original guide priced the stores but not the *calendar*, and the 14-day tester window is the
  longest single lead time in the whole Stage 2 plan. Apple's $99 and Google's closed-testing rule
  were read off the vendors' own pages that day; **Google's $25 figure came from a search-result
  summary of the Play Console help page, not a page fetch** — re-read
  <https://support.google.com/googleplay/android-developer/answer/6112435> before relying on it.
- Siri integration requires native app — web apps can only be opened via Siri Shortcuts workaround.
