# Stage 2 — Native App & Publishing Guide

## Building the Native App
- **Recommended approach**: Wrap the existing web app with **Capacitor** (Ionic's tool) to produce a real iOS/Android app with minimal code changes.
- This unlocks: Siri Shortcuts, push notifications, offline mode, home screen icon as a proper app.
- A full native rewrite (Swift/Kotlin) is overkill for the current feature set.

## Apple App Store
- **Apple Developer Account**: $99/year. Personal ID only — no company needed.
- Individual account allows selling apps. Apple handles payment processing and tax.
- Review process: typically 1–3 days, first submission may take longer.
- Requires a Mac for building/signing (Xcode).

## Google Play Store
- **Google Play Developer Account**: $25 one-time fee.
- Faster review, usually under a day.
- Can build from any OS.

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
- Siri integration requires native app — web apps can only be opened via Siri Shortcuts workaround.
