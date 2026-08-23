# SpotSet — Store Publishing HANDOFF

**Last updated:** 2026-08-23 ~09:05, Beirut — vc21 (v2.43) submitted to Play review.
**To resume:** Pierre types `spotset`, `publish`, `illume` or `continue`. **Read §0 back to him
and stop.** Do not investigate, do not draft, do not ask follow-up questions beyond the one §0 names.

🔴 **He will type `/clear` and then `continue` with NOTHING in between.** Do not assume any step
below advanced in the gap — nothing did. The state in §0 is the state you will find.

**Raw session dumps (uncontaminated, each written before its handoff), in
`C:/projects/_archive/PTApp/claude-incidents/`:**
- `2026-08-20-play-developer-account-FULL-SESSION.txt` — the account-creation session,
  581 messages, 464 KB.
- `2026-08-20-spotset-play-console-listing-FULL-SESSION.txt` — verification cleared to store
  listing complete, 1,036 messages, 350 KB.
- `2026-08-21-apple-developer-enrollment-FULL-SESSION.txt` — this session (Apple Developer Program
  enrolment, order placed), 456 messages, 178 KB.

> Subject-scoped. The general PTApp handoff (`HANDOFF.md`, app features, P3/P6) is a *different*
> thread — do not merge them.

---

## 0. Status — read this out

- 🚀 **vc21 (v2.43) SUBMITTED TO PLAY REVIEW 2026-08-23 ~09:00** — Closed testing – Alpha, full
  rollout on approval; notes lead with the login + 21 themes. Sent via Publishing overview after
  Google's quick checks; **probe the console (u/1, account "Calnorm") before quoting its state.**
  The vc20 (v2.42) draft was deliberately discarded UNSENT — v2.43 superseded it before submission
  (Pierre held the submit to land the login first). AAB+APK archived:
  `_archive/PTApp/releases/2026-08-23-spotset-v2.43-vc21.{aab,apk}`.
- ✅ **vc9 (v2.32) CLEARED REVIEW AND PUBLISHED Aug 22** (console notification, seen 08-23:
  "App update published"). Review turnaround for updates has been same-evening in practice;
  Google's stated window is up to 7 days.
- 🔴 **WAITING ON PIERRE: provision tester emails in Supabase console** (Authentication → Users →
  Add user, email+password) — v2.43's email login answers "wrong credentials" for any email
  without a row. No self-signup by rule (Apple 4.8). Guest button covers everyone else.
- 📝 The account name in the console reads **Calnorm** (was Illume in memory — the console wins).
- 🟢 **THE 12 OPT-INS ARE DONE AND THE 14-DAY CLOCK IS RUNNING** (observed live in the console
  2026-08-22 ~14:45: production checklist shows ✅ closed release · ✅ 12 testers opted in ·
  ⭕ run the test 14 days). The opt-in link stays `https://play.google.com/apps/testing/com.spotset.app`
  for any late tester. The remaining production gate is TIME + the "apply for production" questions.
- ✅ **versionCode 4 (v2.28) WAS APPROVED AND IS LIVE** — console 2026-08-22 ~19:30: Closed
  testing – Alpha, "Available to testers on Google Play", full rollout, released Aug 22 2:46 PM.
  AAB archived: `_archive/PTApp/releases/2026-08-22-spotset-v2.28-vc4.aab`.
- 🚀 **versionCode 9 (v2.32) SUBMITTED FOR REVIEW 2026-08-22 ~19:35** — uploaded to Closed
  testing – Alpha (full rollout on approval), release notes: *"Opening animation and sound, the
  movement showcase, a new app icon, and design refinements throughout."* Console shows
  **Changes in review** (quick checks run first, then Google review; typically <7 days).
  AAB built fresh via `bundleRelease` (JDK 21), **versionName `2.32` verified INSIDE the bundle**,
  archived: `_archive/PTApp/releases/2026-08-22-spotset-v2.32-vc9.aab`. Live-data snapshot taken
  first per governance: `_archive/PTApp/data-snapshots/2026-08-22-pre-play-vc9-upload.json`
  (21 clients / 514 sessions, byte-matched). Two upload warnings are BENIGN and expected: larger
  download (the audio suite) and no deobfuscation file (`minifyEnabled false`).
  🔴 **Probe the console before quoting the result.** Next numbers: v2.32.1+/vc10+.
- **Sideloads vc4→vc9 went to Pierre directly in-chat** (signature = upload key, so a Play-installed
  copy must be uninstalled before sideloading; his data re-syncs).
- ⚠️ **"Item not found" on the store page right after opting in is normal** — a newly-published
  closed test takes a few hours to become installable. It does NOT affect the opt-in or the clock.
- ✅ **Play developer name is now Calnorm.** Submitted and approved 2026-08-21; the console header
  and Developer account → Developer name both read **Calnorm**. Nothing further to do.
- ✅ **THE CALNORM EMAIL/IDENTITY PASS IS FINISHED (2026-08-21).** All four fields changed off the
  old `getillume@gmail.com` and confirmed on screen:
  - Store listing → Store settings → **contact email = `support@calnorm.com`** (public; "Change published")
  - Store listing → **Website = `https://spotset.calnorm.com`** (public; "Change published")
  - Developer account → **public developer profile email = `dev@calnorm.com`**, verified + saved
    (Pierre did the verification click on his phone — Google did not self-verify)
  - Developer account → **Google-only contact email stays `pierreghorra@gmail.com`** — deliberate,
    changing it triggers re-verification and it is Google's channel to him.
  - New Zoho alias **`dev@calnorm.com`** ("Calnorm Developer"), alongside `review@` and `support@`.
- 🔴 **PRODUCT-LEVEL EMAIL IS NOT POSSIBLE ON THE CURRENT PLAN — tried and blocked 2026-08-21.**
  `support@spotset.calnorm.com` needs spotset.calnorm.com added as a **second domain**; Zoho
  returned *"You have reached the maximum number of domains allowed. Please upgrade to a paid plan."*
  Settled: stay on `support@`/`dev@calnorm.com`. If product-level addressing is ever wanted on the
  free plan it must be `spotset-support@calnorm.com` style aliases, not sub-domain mailboxes.
  Revisit only at the next hosting/plan change. **Do not re-propose this unprompted.**
- ✅ **`spotset.calnorm.com` EXISTS AND RESOLVES.** Cloudflare: proxied A record `spotset` →
  192.0.2.1 (dummy origin), plus Redirect Rule *"spotset subdomain to app"*,
  `https://spotset.calnorm.com/*` → `https://pih-dev.github.io/PTApp/`, **302 not 301** — chosen
  deliberately so browsers do not permanently cache the hop when real hosting lands there.
  🔴 **GitHub Pages itself was NOT repointed** — doing so would break the PWA already installed on
  Elie's iPhone mid-test. Verify with `curl -sI https://spotset.calnorm.com/`.
- 🆕 **EMAIL ON calnorm.com IS LIVE** — Zoho Mail **Forever Free** (1 domain, 5 users, 5 GB each,
  **no IMAP/POP/ActiveSync**, so the Zoho app is the only client). Mailbox `pierre@calnorm.com`
  (super-admin; Zoho login is pierreghorra@gmail.com). Aliases `review@calnorm.com` and
  `support@calnorm.com` land in the same inbox and can be used as From. DNS in Cloudflare
  (zone under pierreghorra@): MX mx/mx2/mx3.zoho.com, SPF, DKIM `zmail._domainkey`, plus a DMARC
  `p=none` I added. **All verified by Zoho.** Upgrade path if he ever wants it inside the Gmail app:
  **Mail Lite $0.70/user/mo billed annually** adds IMAP+SMTP.
- 🆕 **`review@calnorm.com` REPLACES the reason to buy `spotset.app`** for Apple reviewer accounts —
  Apple needs a domain you control, and calnorm.com is one. **Pierre decided NOT to buy spotset.app**
  (*"I dont care of someone bought .app, its not .com"*). If deep links are ever needed, use
  `spotset.calnorm.com`. Strike the "buy spotset.app" line wherever it still appears.
- ✅ **BACKEND PLATFORM IS DECIDED (2026-08-21): Supabase free-tier Postgres now, self-hosted VPS
  Postgres later.** Full reasoning, and the one build constraint that keeps the exit cheap, in
  **`docs/2026-08-21-backend-platform-decision.md`**. Cloudflare D1 lost on two axes Pierre named
  himself: he cannot open D1 in a normal SQL client, and D1 has no RLS so tenant isolation would be
  code I write. **Performance was explicitly ruled out as a factor — do not re-open it on those
  grounds.** Nothing built, nothing bought, no Supabase project exists.
  🔴 **The load-bearing constraint: auth lives behind ONE thin module.** `pg_dump` carries schema,
  data and RLS to a VPS; it cannot carry Supabase Auth. Scattering `supabase.auth.*` calls the way
  `sync.js` calls are scattered today turns a weekend migration into a rewrite.
  ⚠️ This **supersedes the platform half** of `docs/2026-08-21-multi-user-accounts-decision.md`
  (+ `-appendix.md`, the 12-agent ultracode run). Its per-design **store-review** analysis is still
  worth reading; its platform recommendation is not. The re-run that was offered is now moot.
- 🆕 **CALNORM IS BEING REGISTERED AS A REAL LEBANESE COMPANY.** Pierre's lawyer is initiating it and
  asked for the business description in Arabic. A deliberately broad objects clause (غرض الشركة) was
  drafted and given to him 2026-08-21 — IT services, software/platform development, consulting,
  training, networks + data centres, import/export and trade of IT hardware, hosting/cloud, plus the
  standard catch-all — archived at
  `C:/projects/_archive/Calnorm/2026-08-21-company-objects-clause-ar.md`.
  🔴 **Rule behind it: list every future activity NOW.** In Lebanon the objects clause sits in the
  statutes; adding one later needs amended articles + an extraordinary general assembly + notary +
  commercial-register filing. Listing an activity does not oblige him to do it. Fees and MoET/customs
  requirements were **not** verified — the lawyer is the authority.


- 🔴 **THE PLAY BUILD IS STILL v2.15.1 AND CARRIES THE LEAKY DEMO NUMBERS.** A tester tapped
  WhatsApp on the DEMO sample clients and reached **real strangers** — the invented numbers used
  live Lebanese mobile prefixes. Fixed in **v2.16.1**, which is **live on the PWA**
  (`pih-dev.github.io/PTApp/`, Pages build verified `built`, `v2.16.1` served) but **NOT on Play**:
  the closed testers are on `versionCode 3` / `2.15.1`. **Shipping a new AAB (versionCode 4) is the
  only way the fix reaches them** — Pierre's call, not done. Detail: `docs/instructions-v2.16.1.md`.
- **Interim mitigation, free:** the PWA link already carries the fix, and it is the same link Syria
  testers were given.
- 🍎 **APPLE: THE $99 ORDER IS PLACED.** Apple Developer Program, **Individual**, enrolment ID
  **696HYTRB7F**, Mastercard ···6915, ordered **2026-08-21 ~01:55 Beirut**. Apple says up to
  **2 business days** to process, then an activation email to pierreishere@gmail.com. **Next
  action is Apple's.** Check the inbox before assuming it is still pending.
- ✅ **THE iOS PIPELINE IS WRITTEN AND COMMITTED (2026-08-21 ~22:30) — the Apple-side work that
  does NOT need the portal is done.** `codemagic.yaml`, `@capacitor/ios` in `package.json`, `ios/`
  git-ignored, and `docs/apple-testflight-checklist.md` carrying the ordered post-approval list,
  the App Store listing copy, the privacy-label answers and the review notes. Commit `54db3bd`.
  **No app code changed, nothing deployed.**
- **The pipeline is tag-triggered only (`ios-v*`) and the tag IS the marketing version**, so the
  Android trap — a stale `versionName` shipping because `gradlew` exits 0 on a failed build — has
  no place to happen on iOS. Build numbers are queried from App Store Connect, never counted
  locally. `verify-bundle.mjs` runs inside the build.
- 🔴 **Inbox probed 2026-08-21 ~22:25: NO mail from Apple yet** (`from:apple.com newer_than:3d`
  and `Apple Developer newer_than:5d` both empty). Everything left — bundle ID, the App Store
  Connect record, the API key, the Codemagic integration — is behind the portal and cannot be
  pre-registered. **Probe the inbox again before assuming; never quote this line as current.**
- **When it activates, the order is:** App Store Connect app record for SpotSet
  (`com.spotset.app`, name must be unique App-Store-wide) → App Store Connect **API key** →
  Codemagic pipeline → TestFlight. Detail in §8.
- 🔴 **There is still no Mac and none is needed** — the decided build path is **Codemagic**
  (hosted macOS, free 500 min/mo, signs via the API key, `npx cap add ios` runs as a CI step
  because it cannot run on Windows). **Ionic Appflow is being wound down — never start there.**
- 🟢 **THE ANDROID SIDE IS LIVE.** SpotSet **v2.15.1 / versionCode 3** went to Google 2026-08-20
  ~14:10 and **PUBLISHED the same day**. Track `Closed testing - Alpha` is Active, latest release
  **3 (2.15.1)**, 177 countries/regions, email list `SpotSet Alpha Testers` ticked.
  *(Tester-list size and opted-in count are readings — see §0a, and probe before quoting.)*
- 🔴 **THE BLOCKER IS THE OPT-INS, NOT GOOGLE.** Dashboard production checklist: ✅ Publish a closed
  testing release · ⭕ Have at least 12 testers opted-in · ⭕ Run the test 14 days.
  **Being on the email list is NOT opting in.** Google sends the testers nothing. Pierre sends the
  link himself and each tester presses *Become a tester*. **Day 1 is the day the 12th accepts.**
- **The opt-in links (verified in the console, 2026-08-21):**
  - Web (the one to send — it carries the *Become a tester* button):
    `https://play.google.com/apps/testing/com.spotset.app`
  - Android store page (only works after opting in): `https://play.google.com/store/apps/details?id=com.spotset.app`
- ⚠️ **A session claimed on 2026-08-21 that the release was still "in review". It was not.** The
  console is the record; this file was stale for a day. Re-read the console before asserting store
  state.
- 🔴 **The 14-day clock has NOT started.** It starts when the release is rolled out AND 12 testers
  have **opted in**; opting out resets it.
- 🔴 **Google emails testers nothing.** The opt-in link appears in the console after publishing and
  Pierre sends it himself. There is no invitation email. (Answers the question he asked this session.)
- 🆕 **The company name is decided and the domain is bought: `calnorm.com`, registered 2026-08-21,
  verified via RDAP.** Pierre wants the Play developer name changed from **Illume** (not "Elumi")
  to **Calnorm** — **not done, and must wait until the Android review clears.** Three checks first:
  Play developer names are globally unique, the public `getillume@gmail.com` would no longer match,
  and Apple is unaffected. See **§5a**.
- **Android only.** iPhone owners cannot take part — that needs Apple/TestFlight and a Mac.
- ✅ **Why v2.15.1 exists.** The first submit was blocked by Google's check — *"Missing sign in
  details"* — with a screenshot showing the token screen still saying **"PTApp"**. Two real defects,
  both fixed: the rename had missed `TokenSetup.jsx` (the one screen a set-up device never shows
  again), and the app is a hard auth gate no reviewer could pass. **The literal `DEMO` is now
  accepted in place of a token**, opening the app on seeded local data with all sync off. Design and
  the two live-data leaks the review pass caught: `docs/instructions-v2.15.1.md`.
- ✅ **Sign in details** declared *restricted = Yes*, credential `DEMO`, with reviewer instructions.
  It had previously been declared "No", which is what tripped the check.
- 🔴 **BUILD TRAP — read before ever building the AAB again.** `gradlew` needs **JDK 21**; PATH java
  on this machine is Temurin 8, and **the wrapper exits 0 on a FAILED build**, leaving the previous
  AAB in `outputs/`. That is how a stale 2.15.0 bundle got uploaded and rejected as "version code 2
  has already been used". Always:
  `JAVA_HOME='/c/Program Files/Microsoft/jdk-21.0.12.8-hotspot' ./gradlew bundleRelease`
  then verify the versionName **inside** the .aab. Never trust the exit code.
- **Not done, deliberately deferred by Pierre (2026-08-20): the website/domain.** Do not raise it.
- **Offered, not built:** Google Play Developer API (service account) for headless uploads, tracks,
  testers and rollouts. Policy declarations would still need the console.

---

## 0a. Readings — TRUE ONLY AT THE STAMP, re-probe before quoting

- **2026-08-21 ~09:1x Beirut** — Play Console → SpotSet → Dashboard: **"7 testers currently
  opted-in"** (was 5 at ~07:0x). **5 more needed.** Probed live in Chrome (console is under the
  `pierreghorra@` profile = `/u/1/`, not `/u/0/`).
- **2026-08-21 ~07:0x Beirut** — Play Console → SpotSet → Dashboard: **"5 testers currently
  opted-in"** (was 1 at ~06:0x the same morning; four arrived while Pierre worked, after he
  messaged Elie). **7 more needed.**
- **2026-08-21 ~07:0x Beirut** — email list `SpotSet Alpha Testers`: **16 users**. Two added this
  session at Pierre's dictation: `atmehdunia@gmail.com`, then `Alibdor.1996alibdor@gmail.com`.
  *(Second one was dictated by voice and looks doubled — confirm the spelling with Pierre if a
  tester reports the link not working.)*
- **2026-08-21 ~06:5x Beirut** — `curl -sI https://spotset.calnorm.com/` → `HTTP/1.1 302 Found`,
  `Location: https://pih-dev.github.io/PTApp/`.

**Probe commands:** opt-ins → the Dashboard line above · redirect → the `curl` above ·
tester list → Test and release → Testing → Closed testing → Alpha → Testers.

---

**Raw dump of the submission session (uncontaminated, written before this handoff):**
`C:/projects/_archive/PTApp/claude-incidents/2026-08-20-spotset-v2151-demo-credential-submission-FULL-SESSION.txt`
— 1,664 messages, 1.5 MB.

---

## 1. What was decided this session, and why

### The name: SpotSet
*Spot* = the assist and the standard (a spotter supports the lift and holds the form). *Set* = the
unit this app schedules, prescribes and counts. Two syllables, pronounceable, no category label,
works for a client as naturally as for a coach.

**Rejected, with the reason each time** — so none of these gets re-proposed:
- **PTAssyst** — *Elie's own pick*. One letter from the live "PT Assist" in the identical App Store
  category, which is exactly what Apple refuses at record creation. If Elie reopens it, that is the
  reason, not taste.
- **The PT prefix generally** — Elie is a PhD sports specialist who trains coaches, so "PT" labels
  the product as the category he is above; it also reads as *physical therapy* to much of the
  market, and a spelled-out prefix can never become a verb.
- **SetSpot** — `setspot.com` is taken, and it parses as a venue ("a spot for sets").
- **Metron, Calibra, Cadre, Praxis, Rubric, Norma** — all screened, all have collisions; Metron and
  Calibra sit under existing *fitness* apps.
- **Qyas** — screens perfectly clean on both stores and is still wrong: *Qiyas* is the Saudi
  National Center for Assessment. A store search cannot surface that.
- **Miyar** (معيار, "standard") — the best survivor of the Arabic round; superseded, not disproven.

### The application ID: com.spotset.app
Tied to the product domain, so it survives incorporation or a business rename. Pierre's initials
were considered (`com.pg.spotset`) and rejected here because `pg.com` is Procter & Gamble's —
legal on Play, poor reverse-DNS practice.

**Facts established while deciding it:**
- An application ID is Android's globally unique key for ONE app. Users never see it. It is not
  tied to an email, an account or a business.
- **Each future app needs its own ID** — only a prefix would ever be shared.
- **Apps CAN be transferred to a business account later**, and the package name does not change in
  a transfer. So registering personally now costs nothing later.
  Source: <https://support.google.com/googleplay/android-developer/answer/6230247>

---

## 2. Build state — verified 2026-08-20

| Thing | Value |
|---|---|
| Display name | **SpotSet** (`app_name`, `title_activity_main`, `capacitor.config.json`) |
| Application ID | **com.spotset.app** |
| Capacitor | 8.5.0, `webDir: dist` |
| JDK | Microsoft OpenJDK 21.0.12, `C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot` |
| Android SDK | `C:\Android\Sdk` — platform 36, build-tools 36.0.0, licences accepted |
| Upload key | `C:\projects\_archive\PTApp\keystore\ptapp-upload.jks` (+ credentials .txt) |
| Output | `android/app/build/outputs/bundle/release/app-release.aab`, ~3.1 MB, signed |

```bash
npm run build && npx cap sync android
cd android && JAVA_HOME="/c/Program Files/Microsoft/jdk-21.0.12.8-hotspot" \
  ANDROID_HOME="C:/Android/Sdk" ./gradlew bundleRelease
```

⚠️ **`npx cap add android` wipes the signing block** in `android/app/build.gradle` and the
uncommented `*.jks` lines in `android/.gitignore`. Both were re-applied by hand after the ID
change. If the platform is ever regenerated again, re-apply them *before* building — an unsigned
release builds fine and only fails at Play upload.

---

## 3. What is left, in order

**Done 2026-08-20 — the whole console is green except the tester list:**

1. ✅ Contact phone verified (+9613193619, SMS).
2. ✅ App record created — SpotSet / `com.spotset.app` / App / Free / en-US.
3. ✅ Closed-testing track **Alpha** exists, targeting **177 countries** (all of them).
4. ✅ AAB uploaded to the track and **saved as a draft release** — versionCode 2, versionName
   2.15.0. **Deliberately NOT sent for review**: a release cannot be rolled out to nobody, and the
   tester list is the missing piece.
5. ✅ All nine App-content declarations answered (§6 lists every answer, so an audit does not need
   the console).
6. ✅ Store listing complete — name, short and full description, icon, feature graphic, four phone
   screenshots, category **Health & Fitness**, contact email `getillume@gmail.com`.
7. ✅ Privacy policy and data-deletion pages published on gh-pages.

**🔴 THE ONE BLOCKER — Pierre only:**

8. **Twelve tester email addresses.** They must be **Google accounts on Android**; iPhone owners
   cannot test on Play at all. Once the list exists: create the email list on the Alpha track,
   attach it, roll out the draft release, and Google reviews the build (hours to a couple of days
   for a closed track). Then send testers the opt-in link. **The 14-day clock starts only when
   12 are opted in, and opting out resets it.**

**Not gated on Google, still open:**

9. **Register `spotset.app`** — Cloudflare, ~$14.20/yr at cost (§4). The name is unprotected.
10. **Second, off-site copy of the upload keystore.** One USB copy is not a backup, and the key is
    unrecoverable.
11. **Apple / TestFlight** — needed for any iPhone tester and for the App Store at all. $99/yr and
    🔴 **requires a Mac** to build and sign; Pierre is on Windows, so that is a real gap. No 14-day
    gate, so it is off the critical path, but every iPhone-owning tester waits on it.
12. **Tablet screenshots** — the console marks 7-inch and 10-inch as required but let the listing
    save without them. Expect Google to ask before production; the screenshot harness can shoot a
    tablet viewport when it matters.

**Then:** 14 continuous days on the closed track → apply for production access.

---

## 4. Domain registrar — the recommendation

Verified 2026-08-20 from Cloudflare's own docs
(<https://developers.cloudflare.com/registrar/>):

- **Cloudflare Registrar** — sells **new** registrations (not transfers-only, which was the old
  limitation), **at cost with no markup**, and **WHOIS privacy is included by default**. Cloudflare
  DNS is promoted but not required. This is the cheapest honest option and has no renewal-price
  trap.
- The usual alternatives are **Porkbun** and **Namecheap** — both fine, both include WHOIS privacy,
  both accept international cards; they typically discount year one and charge more on renewal.
  **Not verified this session.**
- **Do NOT connect an AI agent / API token to the Cloudflare account** to do this. Buying a domain
  is a one-off card transaction only Pierre can complete, and a registrar/DNS token is broad
  standing access for no benefit. Decided 2026-08-20.
- ⚠️ **Avoid the low first-year/high-renewal pattern** generally, and never let a registrar hold
  the domain hostage with an expensive transfer-out fee.

### Which TLD, and what it costs

⚠️ **Cloudflare does not publish a price list** — `cloudflare.com/tld-policies` lists supported TLDs
and registry operators only, no prices (checked 2026-08-20). **The number shown in Cloudflare's own
search box is the at-cost price** — Pierre saw `spotset.uk` at **$5.30** that way. Read the figure
there; do not trust a price quoted from memory, including mine.

Guidance on the choice, independent of the exact figures:

| TLD | Take on it |
|---|---|
| **`.app`** | 🔴 **Recommended.** Google-run, HTTPS enforced by the registry (HSTS preload), and it says "this is an app" without saying "fitness". Mid-priced. |
| `.dev` | Same registry family and HTTPS rules, but reads as developer-facing, not product-facing. |
| `.uk` | Cheapest of the set, but it geo-signals Britain for a Lebanese product with global ambitions. Fine as a cheap defensive registration, wrong as the primary. |
| `.co` | Credible generic alternative, usually pricier than `.app`. |
| `.io` | ⚠️ Avoid for a long-term brand. Expensive, and the `.io` ccTLD's future has been under political question — **not re-verified today**, so treat as a flag to check rather than a fact. |
| `.fit` | Cheap and on-theme, but niche TLDs read as second-choice. |
| `getspotset.com` / `spotsetapp.com` | The way to hold a `.com` at normal price when the bare one is gone. Worth one of them if a `.com` matters to him. |

**What to buy:** `spotset.app`. The bare `.com` is unavailable (held since 2009, parked, transfer
locked); chasing it means approaching a domain investor, which is a separate and probably expensive
negotiation — not a blocker for launching. RDAP-confirmed AVAILABLE 2026-08-20 and worth considering
alongside it: `spotset.io`, `spotset.co`, `spotset.fit`, `getspotset.com`, `spotsetapp.com`,
`usespotset.com`.

⚠️ **Method note, learned the hard way this session.** Domain availability was first checked by
NS-absence (`nslookup -type=NS`), which reported `spotset.com` free. It is not — it has been
registered since 2009. **A parked domain often has no resolving nameservers.** Use RDAP, which is
authoritative: `curl -o /dev/null -w "%{http_code}" https://rdap.org/domain/<name>` — 404 means
available, 200 means registered.

---

## 4b. Storing secrets on the Cloudflare account — Pierre's question, 2026-08-20

**Yes, it can work, with one hard rule and one caveat.**

- **Cloudflare R2** is the right product — object storage, **10 GB/month free**, **no egress
  charges at all** (verified 2026-08-20, <https://developers.cloudflare.com/r2/pricing/>). The
  upload keystore is ~4 KB, so this is free forever in practice.
- It is **not** a consumer sync folder. It is S3-style object storage: upload via the dashboard for
  one-off files, or `rclone` for anything routine.
- 🔴 **Encrypt client-side, before upload. Cloudflare must never hold the plaintext.** A 7-Zip
  archive with AES-256 and a strong passphrase is enough; `age` is the cleaner tool if he wants one.
- ⚠️ **Caveat that matters for THIS file specifically:** the keystore is unrecoverable, and a
  Cloudflare account whose password reset lands in the same Gmail is not an independent second
  copy — one compromised or lost mailbox takes both. **Keep an offline copy on a USB stick as
  well.** Cloud + offline, not cloud alone.

Not decided yet: whether he actually wants to run backups through Cloudflare or keep using
`_archive` plus a USB. Ask before building anything.

## 6. Every answer given to Google, and why — audit this without opening the console

Recorded because a wrong declaration is a policy strike, and because **most of these must be
revisited the moment SpotSet gains trainer or client sign-in.** Pierre asked exactly that on
2026-08-20: *"later on we are gonna need this, right?"* — yes, and none of it is one-way.

| Declaration | Answer given | Revisit when |
|---|---|---|
| Ads | No ads | if advertising is ever added |
| Sign in details (was "App access") | **Not restricted** — no login exists; sync needs a token the user pastes, which is not an account | 🔴 **the day a trainer or client login ships** — reviewers must be given test credentials or the build is rejected |
| Government apps | No | never |
| Financial features | None | if billing/payments move in-app |
| Health apps | **Activity and fitness** | if body-measurement or medical claims are added |
| Advertising ID | Not used | if an analytics or ads SDK is added |
| Content rating (IARC) | All Other App Types; no ratings-relevant content, no user-to-user sharing, no dynamic content, no age-restricted goods, no location sharing, no digital purchases, not a browser, not news/education → rated **Everyone / 3+** | any of those answers changing |
| Target audience | **18 and over** only | if the audience widens to minors, which triggers Families policy |
| Data safety | Collects **Name**, **Phone number**, **Fitness info**; all three **optional** (user chooses, because sync is opt-in), **not** shared with third parties, **encrypted in transit**, **deletion offered** via the published page; no account creation; no login with outside accounts | 🔴 **email addresses, and anything a login stores, must be added here** |

**The reasoning behind the two non-obvious ones:**
- **Data safety says "collected" even though we run no server.** Google defines collection as
  *transmitted off the device* — the opt-in GitHub sync does exactly that, even though the
  destination is the user's own private repository and we never receive a copy. Declaring "no
  collection" would have been the convenient answer and the wrong one.
- **Health apps says "Activity and fitness".** The app records training sessions and 1RM
  evaluations. Claiming no health features for a gym app invites a mismatch finding.

### Store listing content, as filed
- **Short description (77/80):** "Clients, sessions and training programs for personal trainers.
  Works offline."
- **Full description:** ~1,900 characters — what it does (clients, schedule, session counting,
  packages/renewals, evaluations, program generation, WhatsApp reminders, EN/AR) then how it works
  (offline-first, data stays yours, one-handed, no ads/subscriptions). Full text is in the console
  and in the session dump.
- **Graphics:** 512×512 icon and 1024×500 feature graphic, generated with Pillow — white barbell
  glyph on the app's `#2563EB → #60A5FA` gradient. Script kept at
  `_archive/PTApp/branding/make_icon.py`.
- **Screenshots:** four, from the puppeteer harness (`docs/marketing-deck.md`), padded to exactly
  **2:1** (1230×2460) because Play rejects anything past 2:1 and the raw 1200×2460 shots are 2.05:1.

---

## 7. Traps hit this session — do not rediscover these

1. 🔴 **The console lives at `/u/1/`.** `/u/0/` is `pierreishere@` and cheerfully offers to
   create a **second** developer account. Always open
   `https://play.google.com/console/u/1/developers/5311121347785758505/...`.
2. 🔴 **The app called itself "PTApp" on every screen** while the store said SpotSet. Caught only
   because the store screenshots were reviewed as images. Fixed in v2.15.0.
3. **The demo data's date shift had rotted.** `make-demo-data.js` hardcoded `SHIFT_DAYS = 25`,
   tuned for the 2026-08-05 capture; by 08-20 the dashboard shot showed "0 Today" and an empty
   week. Now computed from the anchor date at runtime — the hardcoded-date-stamp trap, again.
4. **The adaptive launcher icon needs a padded foreground.** Android crops 25% off each edge; a
   full-bleed foreground clipped the outer plates. Foreground now sits inside the 66% safe zone and
   the background colour moved from white to `#2563EB`.
5. **Play's asset picker needs a tall window.** Its "Add" button sits in a bottom action bar that
   the page footer covers at 958×854; resizing the browser to 1400×1000 revealed it. Uploading a
   file and closing the panel does **not** attach the asset — you must select it and press **Add**.
6. **A screenshot in the marketing harness is safe to publish** — the demo blob is anonymised and
   the sync token is deliberately invalid, so no live client data can appear and no push can fire.

---

## 5. Where everything is

- Name reasoning, all screening results: `docs/2026-08-20-app-name-brainstorm.md`
- Build setup, fees, closed-testing gate, liability: `docs/stage2-publishing-guide.md`
- Round-1 name screening (historical): `docs/2026-07-14-app-name-research.md`
- Play signup field sheet: `_archive/PTApp/2026-08-20-play-console-signup-fields.xlsx`
- Upload key + password: `_archive/PTApp/keystore/`
- **Verbatim session dump:**
  `_archive/PTApp/claude-incidents/2026-08-20-spotset-naming-and-play-setup-FULL-SESSION.txt`
  (414 entries — the raw record this handoff was written from, so it can be checked against)

---

## 5b. Method rules earned this session — do not repeat these

1. **Domain availability = RDAP, never NS.**
   `curl -o /dev/null -w "%{http_code}" https://rdap.org/domain/<name>` → **404 available,
   200 registered**. An `nslookup -type=NS` reported `spotset.com` free; it has been registered
   since 2009 and merely parked. Parked domains routinely have no resolving nameservers.
2. **App-store availability = the iTunes Search API**
   (`itunes.apple.com/search?term=X&entity=software`), which is authoritative for Apple. The Google
   Play HTML scrape used this session produced one hit across eight names and is a
   **false-negative generator** — cross-check Play with a web search before calling a name clear.
3. **A clean store search is not clearance.** `Qyas` screened perfectly and was still wrong (Qiyas
   = the Saudi national assessment authority). Trademark and institutional collisions live outside
   the stores.
4. **`npx cap add android` destroys hand edits** — the signing block in `app/build.gradle` and the
   uncommented `*.jks` lines in `android/.gitignore`. Re-apply both before building.

## 6. Open, not blocking

- **Trademark screen never run** for SpotSet — USPTO / EUIPO / WIPO, Nice classes 9, 41, 42.
  Store screening is not a trademark clearance.
- **The three-role platform does not exist.** Owner → coach → client accounts (see the product
  definition in the brainstorm doc) need real authentication and server-side data separation. Today's
  app is single-user with one shared data blob. Do not let that scope entangle the store work.
- **Repo is still named PTApp.** Renaming it on GitHub is safe (redirects) but touches every
  documented URL — a deliberate task, not a side effect.


---

## 5. The Play developer account, as created (2026-08-20)

Filled in-session over Chrome; every value below was read off the live form, not planned.

| Field | Value | Why |
|---|---|---|
| Owner Google account | **pierreghorra@gmail.com** | 🔴 The first signup was begun on `pierreishere@` and **abandoned before Terms** precisely because the owner account is not a settings field — moving it later is a formal Google transfer. Nothing was charged on that attempt. |
| Account type | Yourself (individual) | `docs/stage2-publishing-guide.md` already ruled no company is needed. |
| Developer name (public) | **Illume** | Latin *illuminare*, "to light up". See below. |
| Developer email (public) | **getillume@gmail.com** | Purpose-made, verified by code. Kept off his primary because this address is published on every listing forever; an alias would not have helped — Gmail's `+tag` and dot forms still display the base address. |
| Legal name / country | Pierre Ghorra / Lebanon (LB) | From the payments profile. |
| Address | **Beirut (the card's billing address)** | Deliberate. The profile is verified against ID + card, so a Zahlé address he could not source exactly would risk the verification. Google's rule: personal accounts publish name/country/email, **but "if you decide to monetize… Google will display your full address"** — and monetization *is* ticked, so an invented street would eventually be published as real. Change it when the company is registered. |
| Website | `https://pih-dev.github.io/PTApp/` | Not shown publicly; it aids identity verification. Confirmed live (`gh api … /pages` → `built`). |
| Apps / 12 months | 2 – 5 | |
| Earning money | Yes → **Subscriptions + Paid apps**, no Ads | Money *inside the app* only. Elie's clients paying him for training is cash outside the app and irrelevant to Google. |
| Sensitive categories | None of the above | A trainer app is in none of them. |
| Other Google accounts | Yes → pierreishere@gmail.com | The abandoned attempt, declared honestly. |
| Contact (private) | Pierre Ghorra · pierreghorra@gmail.com · +961 3 193619 | |

### 5a. The company name now exists — `calnorm.com` is registered (2026-08-21)

**Career settled the company name and Pierre bought the domain the same night.** Verified against
Verisign RDAP, not assumed: `CALNORM.COM`, **registered 2026-08-21 01:28:44Z, expiring
2027-08-21**, on Cloudflare nameservers (`MEMPHIS`/`POLA.NS.CLOUDFLARE.COM`), USD 10.46/yr with
auto-renew on. The full decision record is `Career/Business_Registration_and_Naming.md` §12 —
**Career still owns the name and the domain; this file only records the consequence for the store
listings.**

**Wilumo is dead.** It held the decision for one day (2026-08-20) and was replaced by **Calnorm**,
built from two roots Pierre named himself: *cal* from **calibrate**, *norm* from **Normcore**, the
coffee tools he owns.

#### Pierre's ask: change the Play developer name from Illume to Calnorm

His words, 2026-08-21: *"perhaps we should change the developer from the apps on the Google Play
store from Elumi to Calnorm."* 🔴 **The developer name on the account is `Illume`, not "Elumi"** —
worth stating plainly because the two sound identical dictated, and the wrong one typed into a
Google form is a support ticket.

**Not done, and deliberately not done in that session.** What has to be checked first, in the
console, before anything is typed:

1. **Whether the name is free.** The Play developer name is **globally unique across every
   developer on the store** — that is what killed Sila, Lumen, Lumos, Lumine and Numen when Illume
   was chosen (§5). `calnorm.com` being free says **nothing** about the Play namespace. The signup
   form is the oracle; the account settings page will reject a taken name the same way.
2. **Whether it is still editable at this point.** §5 recorded it as changeable later, but that was
   before the app was **submitted and sitting in review**. Renaming the publisher while a review is
   in flight is exactly the kind of mid-review change that can bounce a submission. **The Android
   release went in 2026-08-20 ~14:10 and is still "Changes in review" — leave the name alone until
   it clears.**
3. **The published email does not follow the name.** `getillume@gmail.com` is public on every
   listing forever and was purpose-made to match *Illume*. Renaming the developer to Calnorm leaves
   a listing that says **Calnorm** with a contact address that says **illume**, which reads as
   either a typo or a sold account. If the name changes, a matching address (e.g. a Calnorm one)
   should change with it — and that is a second, separate change to a field that is also public
   forever.
4. **Apple is unaffected.** The Apple enrolment is **Individual** and publishes **"Pierre Ghorra"**,
   not Illume (§5, and the enrolment is still processing). Changing Google does not change Apple,
   and Apple's seller name on an Individual account is the legal person, not a brand.

**Recommended order, once the review clears:** test `Calnorm` for availability in the Play console →
if free, change the developer name → then decide the email. **Do not touch any of it while the
submission is in review.**

### Why "Illume", and not the company name

The Play developer name is **globally unique across every developer on the store**, which turns the
signup form into a free, instant availability oracle. Tested live: **Sila ❌ · Sila Labs ❌ ·
Lumen ❌ · Lumen Labs ❌ · Lumos ❌ · Lumine ❌ · Numen ❌**; free: **Illume ✅ · Lumen Systems ✅ ·
Sila Systems ✅**. Every bare Latin light-word is gone; survivors are coinages or word+descriptor.

**This does not decide the company name** — the developer name is changeable later. The company
shortlist and Pierre's brief for another round (shorter, Latin/Harry-Potter, light, letters
l m e n p, *luminescent* in the pool, **Labs** preferred over Systems) live in
`C:/projects/Career/Business_Registration_and_Naming.md` §2.
🔴 **Career owns the company naming and the domains** (moved there 2026-08-20). Play developer
name questions are still decided here — it is changeable and does not pre-commit the company —
but anything about the business name, the .com or the registration goes to Career.

### The address, and the document that had to match it

The verification wanted a document carrying **both the name and the address on file**. What was
available and why each failed: **CIM Banque** (Geneva) statements do carry the current address —
*Samir Youssef bldg, 3rd floor, City Rama, Metn, 1201 Dekwaneh* — but the three on the phone are
dated 03.12.2024, 19.03.2025 and 30.01.2026, all outside Google's **60-day** window, and the CIM
login was failing. An **IBKR Activity Statement** generated fresh on 2026-08-19 carries name and
account number but **no address at all** — IBKR statements do not print one.

So the address was moved to match the document he *did* hold. **The payments profile now reads
Maalaka · Zahle · 1801 · Lebanon** — the locality on his Lebanese national ID
(المحلة أو القرية: المعلقة – زحلة, register 48, Beqaa). 🔴 **A Lebanese ID carries no street
address**, so locality is the most a match can be made on; postal code 1801 is Zahlé's
(LibanPost 4-digit). This also quietly settles the earlier Beirut-vs-Zahlé question in Zahlé's
favour, which is where the future company would sit anyway.

**The ID images are preserved** at `C:\projects\_archive\PTApp\play-identity\` as
`2026-08-20-play-id-{front,back}.jpg` (rotated 180° and cropped from the phone originals; working
copies also in `D:\PG\docs\`). Never committed — `_archive` is outside every repo.

### What is now blocked on Google, not on us

ID verification runs on Google's side and takes days. The 14-day closed-test clock still has not
started — it starts when the AAB is on a closed track **and** 12 testers have opted in.

---

## 8. Apple — the enrolment, as done (2026-08-21)

**Everything below was done in Chrome, driven from the session, with Pierre at the keyboard for the
password, the 2FA and every card field. No Apple hardware was involved at any point.**

### The account
- **Apple Account:** pierreishere@gmail.com (alt on the account: pierreghorra@icloud.com),
  2FA on, legal name already correct as *Pierre Ghorra* — Apple refuses aliases at enrolment.
- **Entity type: Individual / Sole Proprietor.** Organization was rejected up front: it needs a
  D-U-N-S number, a work-domain email and a live public website, which is weeks of lead time and
  the domain is deliberately deferred. **Seller name on the App Store will therefore be
  "Pierre Ghorra", not Illume** — this differs from the Play account, on purpose.
- **Enrolment ID `696HYTRB7F`**, US$99 / 1 year, charged in USD to Mastercard ···6915.

### 🔴 The Apple Account region had to be changed first — UAE → Lebanon
The enrolment form's **Region field is read-only**; it mirrors the Apple Account and nothing on the
developer site can override it. It read **United Arab Emirates**. Changed at
`account.apple.com → Personal Information → Country/region`.

- Apple warned only about purchases (no subscriptions or balance to clear), then forced
  **Apple Media Services T&Cs**, then demanded a payment method for the new region.
- 🔴 **The card would not save against the Lebanon region.** Entered correctly three times
  (verified against the physical card); Apple **silently wiped the Card Number field** on each
  submit and printed only "Please enter your payment card number" — no BIN/region error.
  Most likely the UAE-issued Mastercard being refused for a Lebanon account.
- ✅ **`Payment Type = None` is offered and is enough.** The region change completed with None.
  The $99 purchase then went through fine on its **own** checkout, with the same card. So:
  *a card that Apple's account page refuses can still pay at the developer checkout.*
- **Switching Payment Type clears the whole billing-address block** — refill it every time.

### Address and format traps (both of these blocked a submit)
- 🔴 **Lebanese postcodes are 8 digits** (Apple's own example: `2038 3054`). `2705` alone is
  rejected. Used **`27050000`** — Dekweneh's area code plus four zeros, because the building
  number is unknown. **Typed without the space**: the field's maxlength eats the 9th character and
  silently stores `2705 000`.
- 🔴 **The purchase form's billing block must match the enrolment record exactly** (Apple's own FAQ:
  a mismatch delays enrolment and can trigger a government-ID request). Two fixes made before
  submitting: Address Line 1 `City Rama Street` → **`City Rama`**, and phone
  `+9613193619` → **`9613193619`** (digits only; these older Apple forms reject the `+`).
- **Filed address:** City Rama, Dekweneh, 27050000, Lebanon region, Lebanon. Phone `961` `3193619`.

### The web path exists — the "you need an iPhone" claim is half-true
`developer.apple.com/enroll` pushes the **Apple Developer app** (iPhone/iPad/Mac) hard, but the
page carries a **"Continue enrollment on the web ›"** link underneath, and that path completes
fully on Windows. Two Apple support pages contradict each other on this; the link is the truth.

### The Mac-less build path, decided (verified 2026-08-21, not yet built)
| Option | Verdict |
|---|---|
| **Codemagic** | ✅ **Chosen.** Hosted macOS M2/M4, free **500 min/mo**, then ~$0.095/min. Builds Capacitor iOS, generates certs + provisioning profiles from an **App Store Connect API key** in its web UI, publishes to TestFlight. No Mac step anywhere. |
| GitHub Actions macOS | Possible (PTApp repo is public ⇒ free minutes) but you hand-roll fastlane signing and upload. Private-repo macOS minutes bill at a 10× multiplier. |
| Ionic Appflow | ❌ **Closed to new customers, sunset 2027-12-31.** Do not start here. |
| Rented Mac (AWS EC2 mac / MacStadium) | ❌ Overkill — AWS is ~$792/mo with a 24-hour minimum tenancy. |

🔴 **`npx cap add ios` cannot run on Windows** — the `ios/` folder must be generated as a CI step on
the hosted Mac, not committed from here. Certs/profiles otherwise need no Mac: OpenSSL CSR on
Windows + the developer portal, or (preferred) the API key.

### What is NOT done on the Apple side
- No App Store Connect app record, no bundle ID registered, no API key, no Codemagic account,
  no `ios/` platform in the repo, no screenshots or App Store listing copy, no privacy answers.
- **The `DEMO` review credential applies to Apple too** — App Review is a hard auth gate exactly
  like Google's, and the same "Sign-in required / credential `DEMO`" answer is the one to file.

---

## 5b. The tester opt-in list (paste into WhatsApp)

Verified in the console 2026-08-21. List name `SpotSet Alpha Testers`, 14 entries, ticked on the
`Closed testing - Alpha` track. **Being on this list is not opting in.** Google emails nobody.

```
SpotSet — tester opt-in

LINK (each person opens it and taps "Become a tester"):
https://play.google.com/apps/testing/com.spotset.app

Then install:
https://play.google.com/store/apps/details?id=com.spotset.app

Android only. Must be signed into Play with the exact email below.

Fouadmerhej36@gmail.com
Khaldonadrees55@gmail.com
Romeo.nassif@gmail.com
anassarsar@gmail.com
cclendt@gmail.com
coach.shady88@gmail.com
fadi.yazigi@gmail.com
jeanpaulkahale@gmail.com
maya.18.tr@gmail.com
mbhangman@gmail.com
osama.sabea@gmail.com
roulasathaddad@gmail.com
tonyhax635241@gmail.com
zahraakarakeh95@gmail.com
```

`cclendt@gmail.com` is Pierre's alternate and is the one tester already opted in.

---

## 9. The 2026-08-21 lost day — what happened, and the fix that shipped

**What I did.** Asked whether the Play countdown had started, I answered from
`HANDOFF-spotset-publishing.md`, which said v2.15.1 was in *"Changes in review"*. It was not. It had
published on **2026-08-20**, and the real blocker was **`0 testers currently opted-in`** — something
only Pierre could clear, by sending a link he did not know existed. He had given me the 14 emails
the previous day and believed the clock was running. I had browser access to the console the entire
time and did not use it until he ordered me to.

**Cost.** One day of a 14-day clock, and his trust. His words: *"instead of yesterday… we could've
sent it to them. They could've opted in because it was fresh."*

**What did NOT fix it.** I first wrote a TRAPS paragraph into `CLAUDE.md`. He rejected it correctly
— *"When are we going to go to the console and do testers? Never. You just fucked up my markdowns.
That's not a solution."* An instance-shaped rule in a file costs bytes every session and changes
nothing. **It was reverted** (`git revert`, PTApp master).

**What DID ship.** `CCHealth/scripts/evidence_guard.py` — the Stop hook that already blocks
assertions with no observation behind them. Its `STATE_CLAIM_RE` covered *"stayed up / still
running"* but not *"still in review / hasn't started"*, which is why it stayed silent. Extended with
external-queue patterns (`still … in review|pending|queued`, `has not started|cleared|published`,
`nothing is counting`, `next action is`). Measured per that file's own rule, `--replay` on 3 real
PTApp transcripts: 0/31 → 0/31, **5/56 → 6/56** (the +1 is this exact failure), 0/8 → 0/8; plus 10
unit cases, 10 pass. Commit `c0f9d5b` in CCHealth.

**The standing rule, which already existed and which I broke:** store/build/ticket state comes from
the console, read this session — never from a doc, a handoff, or memory. The console path is
`play.google.com/console/u/1/...` — **u/1, because the Play account is pierreghorra@ while Chrome's
default profile is pierreishere@.** Reading u/0 lands on a "create a developer account" page and
looks like the account does not exist.

**Raw dump of this session, written before this handoff:**
`C:/projects/_archive/PTApp/claude-incidents/2026-08-21-spotset-multitenant-and-calnorm-email/`
(RAW 9.1 MB, READABLE 236 KB, MY-TURNS 12 KB).
