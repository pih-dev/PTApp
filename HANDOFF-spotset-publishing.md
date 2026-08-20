# SpotSet — Store Publishing HANDOFF

**Last updated:** 2026-08-20, Beirut.
**To resume:** Pierre types `spotset` or `publish`. **Read §0 back to him and stop.**
Do not investigate, do not draft, do not ask follow-up questions beyond the one §0 names.

> Subject-scoped. The general PTApp handoff (`HANDOFF.md`, app features, P3/P6) is a *different*
> thread — do not merge them.

---

## 0. Status — read this out

- **The app is named SpotSet.** Decided 2026-08-20 after four screening rounds. "PTApp" is now
  only the repo/project name. Reasoning + every rejected candidate:
  `docs/2026-08-20-app-name-brainstorm.md`.
- **Application ID is `com.spotset.app`** — Pierre's choice, replacing the auto-generated
  `com.pih.ptapp` (which embedded an old GitHub handle and the old app name). **It becomes
  permanent at the first Play upload and not before.**
- **A signed Android AAB exists and builds reproducibly.** Capacitor 8.5.0, JDK 21, Android SDK
  at `C:\Android\Sdk`. Build command and all paths: `docs/stage2-publishing-guide.md`.
- 🔴 **`spotset.com` IS TAKEN** — corrected 2026-08-20 by Verisign RDAP (authoritative). Registered
  since **2009**, renewed Apr 2026, parked on DNSLNK nameservers, `clientTransferProhibited`. An
  investor holds it. **The earlier "free" reading came from an NS-absence check and was wrong.**
  `setspot.com` is taken too, so this does not reopen the name choice.
- **The name still stands. Buy `spotset.app` instead** — confirmed AVAILABLE by RDAP, along with
  `.io`, `.co`, `.fit`, and `getspotset.com` / `spotsetapp.com` / `usespotset.com`. `.app` is
  Google-run, forces HTTPS, and matches the product.
- 🔴 **Two things are Pierre's to do and block everything else:** register **`spotset.app`**, and
  complete the **Google Play signup** ($25 + ID/address verification, which takes days on
  Google's side).
- 🔴 **The upload keystore is unrecoverable.** `C:\projects\_archive\PTApp\keystore\` — must be
  backed up off this laptop. Losing it means never updating the app again.
- **The 14-day closed-test clock has NOT started.** It starts only when the AAB is released to a
  closed track *and* 12 testers have opted in — not at signup, not at upload.
- **Apple is untouched.** No account, and it needs a Mac for building/signing.
- **The question to ask him:** has `spotset.app` been registered, and has the Play account cleared
  verification? Everything downstream waits on those two.

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

1. **Register `spotset.app`** — Pierre. NOT the .com: `spotset.com` has been held since 2009 and
   is parked (see §0). Registrar recommendation: §4.
2. **Google Play signup** — Pierre. $25, card in his legal name (**prepaid cards are rejected** —
   the likeliest failure point from Lebanon), government ID, address, and a device check via the
   Play Console app on the S25 Ultra. Field-by-field sheet:
   `_archive/PTApp/2026-08-20-play-console-signup-fields.xlsx`.
3. **Create the app record** in Play Console under the display name SpotSet.
4. **Upload the AAB to a closed testing track.**
5. **Recruit 12 testers** (Elie's clients cover it) and get them opted in. Tell them explicitly not
   to leave the test — opting out resets the 14-day counter.
6. **Wait 14 continuous days**, then apply for production access.
7. **Apple, separately** — $99/yr, needs a Mac, and the App Store Connect name reservation is the
   authoritative test of whether "SpotSet" is accepted there.

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

## 6. Open, not blocking

- **Trademark screen never run** for SpotSet — USPTO / EUIPO / WIPO, Nice classes 9, 41, 42.
  Store screening is not a trademark clearance.
- **The three-role platform does not exist.** Owner → coach → client accounts (see the product
  definition in the brainstorm doc) need real authentication and server-side data separation. Today's
  app is single-user with one shared data blob. Do not let that scope entangle the store work.
- **Repo is still named PTApp.** Renaming it on GitHub is safe (redirects) but touches every
  documented URL — a deliberate task, not a side effect.
