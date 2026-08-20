# SpotSet — Store Publishing HANDOFF

**Last updated:** 2026-08-20, Beirut — after the verification-cleared session (app record created).
**To resume:** Pierre types `spotset`, `publish`, `illume` or `continue`. **Read §0 back to him
and stop.** Do not investigate, do not draft, do not ask follow-up questions beyond the one §0 names.

🔴 **He will type `/clear` and then `continue` with NOTHING in between.** Do not assume any step
below advanced in the gap — nothing did. The state in §0 is the state you will find.

**Raw session dump (uncontaminated, written before this handoff):**
`C:\projects\_archive\PTApp\claude-incidents6-08-20-play-developer-account-FULL-SESSION.txt`
— 581 messages, 464 KB.

> Subject-scoped. The general PTApp handoff (`HANDOFF.md`, app features, P3/P6) is a *different*
> thread — do not merge them.

---

## 0. Status — read this out

- **The app is named SpotSet.** Decided 2026-08-20 after four screening rounds. "PTApp" is now
  only the repo/project name. Reasoning + every rejected candidate:
  `docs/2026-08-20-app-name-brainstorm.md`.
- **Application ID is `com.spotset.app`** — Pierre's choice, replacing the auto-generated
  `com.pih.ptapp` (which embedded an old GitHub handle and the old app name). ✅ **It is now
  PERMANENT** — locked in at app-record creation, 2026-08-20.
- **A signed Android AAB exists and builds reproducibly.** Capacitor 8.5.0, JDK 21, Android SDK
  at `C:\Android\Sdk`. Build command and all paths: `docs/stage2-publishing-guide.md`.
- 🔴 **`spotset.com` IS TAKEN** — corrected 2026-08-20 by Verisign RDAP (authoritative). Registered
  since **2009**, renewed Apr 2026, parked on DNSLNK nameservers, `clientTransferProhibited`. An
  investor holds it. **The earlier "free" reading came from an NS-absence check and was wrong.**
  `setspot.com` is taken too, so this does not reopen the name choice.
- **The name still stands. Buy `spotset.app` instead** — confirmed AVAILABLE by RDAP, along with
  `.io`, `.co`, `.fit`, and `getspotset.com` / `spotsetapp.com` / `usespotset.com`. `.app` is
  Google-run, forces HTTPS, and matches the product.
- ✅ **The Google Play developer account EXISTS** — created 2026-08-20, $25 paid, receipt to
  pierreghorra@gmail.com. Developer name **Illume**, account ID **5311121347785758505**. Details in §5.
- ✅ **BLOCK CLEARED, same day.** Identity verification came back **within minutes** of submitting
  the ID photos — console notification *"Your identity has been verified successfully"*, 2026-08-20.
  Contact phone **+9613193619 verified** by SMS in the same session. The account setup banner is
  gone; **Create app** is live. (The "may take a few days" wording is worst-case, not typical.)
- ✅ **The SpotSet app record EXISTS in Play Console** — created 2026-08-20.
  **App ID `4972021344864095549`**, package **`com.spotset.app`** (now PERMANENT — accepted at
  creation), display name **SpotSet**, type **App**, price **Free** (free→paid is impossible after
  publish), default language en-US. All three declarations accepted with Pierre's explicit `go`:
  Developer Program Policies, **Play App Signing ToS**, US export laws.
  Dashboard: `https://play.google.com/console/u/1/developers/5311121347785758505/app/4972021344864095549/app-dashboard`
  🔴 **Console is on `/u/1/` — `pierreghorra@gmail.com`. `/u/0/` is `pierreishere@` and offers to
  create a SECOND developer account. Always use the `/u/1/` URL.**
- **Next in the console:** upload the signed AAB to a **closed testing** track — that is what starts
  the 14-day clock, and it needs the 12 testers opted in.
- 🔴 **Still Pierre's to do:** register **`spotset.app`** (Cloudflare quotes **$14.20/yr**, at cost,
  renews the same — confirmed in the dash 2026-08-20). Not a blocker for Play, but the name is
  unprotected until bought.
- **Pierre now has a Cloudflare account** (signed in 2026-08-20 with his primary Gmail). He
  declined connecting any AI agent to it — that decision stands, see §4.
- 🔴 **The upload keystore is unrecoverable** — `C:\projects\_archive\PTApp\keystore\`.
  ✅ **Backed up 2026-08-20** to a USB (Ventoy) as `E:\SpotSet-keystore.7z` — 7z/AES-256, encrypted
  filenames, 5,039 B; Pierre ran 7-Zip *Test archive* and it reported 2 files, no errors, and the
  plaintext copies were deleted from the stick. **One copy is not a backup — a second, off-site
  copy is still owed.**
- **The 14-day closed-test clock has NOT started.** It starts only when the AAB is released to a
  closed track *and* 12 testers have opted in — not at signup, not at upload.
- **Apple is untouched, and is now explicitly on the to-do list** (Pierre, 2026-08-20 — he expects
  it to be harder than Google). No account; 🔴 **needs a Mac** to build and sign. No 14-day gate,
  so it is not on the critical path. §3 item 8.
- **Everything else that can move without Google:** buy `spotset.app`, recruit the 12 testers,
  app icon, privacy-policy URL, Apple. Listed in order in §3.
- **The question to ask him:** *"Google is fully unblocked and the app record exists. Upload the AAB
  to closed testing now, or do the domain / testers / icon / privacy policy first?"*

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

**Done 2026-08-20 (nothing in the console is blocked any more):**

1. ✅ **Contact phone number verified** — +9613193619, SMS code.
2. ✅ **App record created** — SpotSet / `com.spotset.app` / App / Free, app ID `4972021344864095549`.
3. ▶️ **Upload the AAB to a closed testing track** — THE NEXT CONSOLE STEP, and the one that starts
   the 14-day clock. Needs the 12 testers (item 5) to opt in for the clock to run.

**Can be done NOW, in parallel, none of them gated on Google:**

4. **Register `spotset.app`** — Pierre, ~$14.20/yr at Cloudflare (§4). The name is unprotected
   until then.
5. **Recruit 12 testers** (Elie's clients cover it) and brief them: *opting out resets the 14-day
   counter*. The clock has not started and does not start at signup or upload.
6. **App icon + branding assets** — none exist yet.
7. **Privacy policy** — required by both stores. A GitHub Pages page under the PTApp repo is
   sufficient and costs nothing.
8. **Apple — Pierre asked for this on the to-do list, 2026-08-20, expecting it to be worse than
   Google.** $99/yr, and 🔴 **it needs a Mac** for building and signing — Pierre develops on
   Windows, so that is a real gap, not a formality. The App Store Connect name reservation is the
   authoritative test of whether "SpotSet" is accepted there, and `docs/2026-07-14-app-name-research.md`
   already flags a confusable-name risk against the live "PT Assist". **Not started, nothing owed
   this week** — Apple has no 14-day gate, so it does not sit on the critical path.

**Then:** wait 14 continuous days on the closed track, and apply for production access.

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
