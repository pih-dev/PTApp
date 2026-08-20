# SpotSet — Store Publishing HANDOFF

**Last updated:** 2026-08-20 ~14:30, Beirut — the submission session (Android side complete).
**To resume:** Pierre types `spotset`, `publish`, `illume` or `continue`. **Read §0 back to him
and stop.** Do not investigate, do not draft, do not ask follow-up questions beyond the one §0 names.

🔴 **He will type `/clear` and then `continue` with NOTHING in between.** Do not assume any step
below advanced in the gap — nothing did. The state in §0 is the state you will find.

**Raw session dumps (uncontaminated, each written before its handoff), in
`C:/projects/_archive/PTApp/claude-incidents/`:**
- `2026-08-20-play-developer-account-FULL-SESSION.txt` — the account-creation session,
  581 messages, 464 KB.
- `2026-08-20-spotset-play-console-listing-FULL-SESSION.txt` — this session (verification cleared
  to store listing complete), 1,036 messages, 350 KB.

> Subject-scoped. The general PTApp handoff (`HANDOFF.md`, app features, P3/P6) is a *different*
> thread — do not merge them.

---

## 0. Status — read this out

- 🟢 **THE ANDROID SIDE IS DONE AND SUBMITTED.** SpotSet **v2.15.1 / versionCode 3** plus 13 other
  changes went to Google on **2026-08-20 ~14:10** and sit in **"Changes in review"**. Nothing is
  left for Pierre to do on the submission itself. Reviews are "typically within 7 days".
- **Next action is Google's, not ours.** When it clears, the console shows the opt-in link on the
  closed-testing Testers tab. Only then does anything else happen.
- **14 testers on the list** (`SpotSet Alpha Testers`) — above the 12 minimum, list closed.
- 🔴 **The 14-day clock has NOT started.** It starts when the release is rolled out AND 12 testers
  have **opted in**; opting out resets it.
- 🔴 **Google emails testers nothing.** The opt-in link appears in the console after publishing and
  Pierre sends it himself. There is no invitation email. (Answers the question he asked this session.)
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

### Why "Illume", and not the company name

The Play developer name is **globally unique across every developer on the store**, which turns the
signup form into a free, instant availability oracle. Tested live: **Sila ❌ · Sila Labs ❌ ·
Lumen ❌ · Lumen Labs ❌ · Lumos ❌ · Lumine ❌ · Numen ❌**; free: **Illume ✅ · Lumen Systems ✅ ·
Sila Systems ✅**. Every bare Latin light-word is gone; survivors are coinages or word+descriptor.

**This does not decide the company name** — the developer name is changeable later. The company
shortlist and Pierre's brief for another round (shorter, Latin/Harry-Potter, light, letters
l m e n p, *luminescent* in the pool, **Labs** preferred over Systems) live in
`C:/projects/General/awareness-program/internal/company-registration-and-name.md` §2.

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
