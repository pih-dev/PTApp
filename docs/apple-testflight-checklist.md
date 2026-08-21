# Apple / TestFlight — the ordered checklist

**Written:** 2026-08-21. **Owner:** Pierre. **Companion to** `HANDOFF-spotset-publishing.md` §8,
which records how the enrolment was done and every trap it hit. This file is the *forward* list:
what to do, in what order, once Apple approves.

## 0. Where this stands

- **Enrolment `696HYTRB7F` is PAID and PROCESSING** (ordered 2026-08-21 ~01:55 Beirut, Individual,
  $99). Apple quotes up to 48 h. As of 2026-08-21 ~22:30 the inbox `pierreishere@gmail.com` has
  **no mail from Apple** — searched, not assumed.
- 🔴 **Everything in §2 below is blocked on that approval.** Bundle IDs, App Store Connect records
  and API keys all live behind the developer portal, and the portal is closed until the enrolment
  clears. There is no way to pre-register any of it.
- **What is already done, here, without Apple:** `codemagic.yaml` (the whole iOS pipeline),
  `@capacitor/ios` in `package.json`, `ios/` git-ignored, and the listing/privacy answers in §3–§5.

## 1. Done in the repo (2026-08-21)

- `codemagic.yaml` — one workflow, `ios-testflight`, triggered **only by a tag matching `ios-v*`**.
  A plain push builds nothing; the tag is also the marketing version (`ios-v2.16.0` → `2.16.0`), so
  there is no second place to bump and forget. Deliberate contrast with Android, where a stale
  `versionName` in `build.gradle` is exactly how a rejected AAB happens.
- 🔴 **`ios/` is generated on the Mac at build time and is git-ignored.** `npx cap add ios` cannot
  run on Windows. `capacitor.config.json` therefore stays the only source of appId/appName.
- **The build number is queried from App Store Connect**, not counted locally —
  `app-store-connect get-latest-app-store-build-number`, `|| echo 0` for the first-ever build.
  TestFlight refuses a build number it has already seen, and a local counter drifts the moment a
  build is deleted or re-run.
- **`verify-bundle.mjs` runs inside the pipeline.** A corrupted single-file bundle is a blank page;
  inside a signed `.ipa` that costs a whole review cycle to discover.
- **`submit_to_app_store: false`.** TestFlight only, until the first review has actually passed.

## 2. Blocked on the approval email — do these in this order

1. **Register the bundle ID** `com.spotset.app` (Certificates, IDs & Profiles → Identifiers).
   Same string as Play, permanent. No capabilities needed: no push, no sign-in-with-Apple,
   no iCloud — the app is offline-first and its only network leg is the user's own GitHub repo.
2. **Create the App Store Connect record** — name **SpotSet**, primary language English (U.S.),
   bundle ID above, SKU `spotset-ios-001`. 🔴 Apple enforces app-name uniqueness at this moment;
   if "SpotSet" is taken, stop and decide the name before anything else is built.
3. **Create an App Store Connect API key** (Users and Access → Integrations → App Store Connect
   API), role **App Manager**. The `.p8` downloads **once** — file it to
   `C:/projects/_archive/PTApp/apple-asc-api-key/`, never the repo.
4. **Codemagic**: sign up with GitHub, add `pih-dev/PTApp`, create the App Store Connect
   integration named exactly **`SpotSet ASC`** (the name `codemagic.yaml` refers to), and a
   variable group **`spotset`** holding `APP_STORE_APPLE_ID` = the numeric App ID from step 2.
5. **First build:** `git tag ios-v2.16.0 && git push origin ios-v2.16.0`.
   🔴 Read the version **out of the built `.ipa`** in the artifacts, never off a green tick —
   the Android lesson (`gradlew` exits 0 on a failed build) is a discipline, not a Gradle bug.
6. **TestFlight internal testing** — Pierre and Elie first, on their own iPhones. External testers
   need a Beta App Review, which is a lighter pass than App Review but is still a review.

## 3. App Store listing copy (drafted here, filed in step 2)

Apple's fields differ from Play's; this is adapted from the filed Play copy, not re-invented.

- **Name (30 max):** `SpotSet` — 7.
- **Subtitle (30 max):** `Coaching, clients, programs` — 27.
- **Promotional text (170 max, editable without a new build):**
  `Built with a working personal trainer, in the gym, on a phone. Everything works offline.`
- **Keywords (100 max, comma-separated, no spaces, never repeat words already in the name):**
  `personal,trainer,coach,gym,client,session,workout,program,fitness,1RM,schedule,booking`
- **Description:** the Play full description, unchanged in substance — what it does (clients,
  schedule, session counting, packages and renewals, 1RM evaluations, generated programs, WhatsApp
  reminders, English and Arabic) then how it works (offline-first, the data stays the user's, one
  handed, no ads, no subscription). 🔴 **Do not mention Android, Google Play, or a web version** —
  Guideline 2.3.10 rejects references to other platforms.
- **Support URL:** required and must resolve. Use `https://pih-dev.github.io/PTApp/` until
  calnorm.com carries a support page.
- **Category:** Health & Fitness, secondary Business.
- **Age rating:** 4+. Nothing user-generated is shared, no ads, no web view of arbitrary content.

## 4. Privacy answers (App Privacy — the nutrition label)

Answer these exactly as Play was answered, for the same reason: the opt-in GitHub sync transmits
the coach's data off the device, to the coach's own private repository, and we never receive a copy.
Claiming "no data collected" would be the convenient answer and the wrong one.

- **Data collected:** Contact Info (name, phone — the coach's clients), Health & Fitness
  (training sessions, 1RM evaluations), User Content.
- **Linked to the user:** yes. **Used for tracking:** **no** — no ad network, no third-party
  analytics, no IDFA, so **App Tracking Transparency is not required** and must not be claimed.
- **Purpose:** App Functionality only.
- 🔴 A **privacy policy URL is mandatory** for every App Store app, including free ones. The Play
  policy URL already exists — reuse the same document.

## 5. Review notes (the App Review Information box)

App Review hits the same hard auth gate Google's did. File the same answer:

- **Sign-in required:** Yes.
- **Credential:** username `DEMO` (the token screen), no password.
- **Notes:** *"Type DEMO into the access-token field on the first screen. This opens the app on
  seeded local sample data with all network sync disabled — no account, no server, and it works in
  Airplane Mode. Sign-in with an email and password also exists for real coaches; accounts are
  provisioned by us and there is no self-signup."*
- 🔴 **`DEMO` must survive until the first Apple approval**, whatever happens to it on the Android
  side. It is the only path that works with no network at all — the documented Guideline 4.2
  white-screen trap.

## 6. Not decided, and deliberately so

- **iPad.** Declaring iPhone-only is one checkbox and avoids a whole extra screenshot set plus
  layout review. Recommend iPhone-only for the first submission.
- **Whether Elie's iPhone is a TestFlight internal tester or waits for the App Store.** Internal
  is faster, but it puts a second install path on the phone that holds the live data.
