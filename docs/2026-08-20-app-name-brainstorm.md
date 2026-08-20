# App Name Brainstorm — rounds 2–4

> ## ✅ DECIDED 2026-08-20: the app is **SpotSet**
>
> Chosen by Pierre after four screening rounds. *Spot* = the assist and the standard (a spotter
> supports the lift and holds the form); *set* = the unit this app schedules, prescribes and counts.
> Clear on the App Store and Play, and **`spotset.com`, `.app`, `.io` and `.fit` all appeared
> unregistered** — the only candidate in this document with the .com free, which is what settled it
> against the otherwise-equal `SetSpot` (`setspot.com` is taken).
>
> **The permanent package ID stays `com.pih.ptapp`** — it can never change after the first Play
> upload, and it does not need to match the display name. Only `app_name` /
> `title_activity_main` / `capacitor.config.json` carry "SpotSet".
>
> 🔴 **Register `spotset.com` before publicising the name.** The availability check here was
> NS-absence, which suggests but does not prove the domain is free.
>
> Rejected at the final step: **PTAssyst** (Elie's pick — one letter from the live "PT Assist" in
> the identical category, exactly what Apple rejects), **PTSpot** (the PT prefix mislabels a
> platform run by a PhD sports specialist), **SetSpot** (.com taken, and it parses as a *venue*).


**Date:** 2026-08-20 · **Asked by:** Pierre · **Status:** candidates proposed, NONE screened yet.
Supersedes nothing — `docs/2026-07-14-app-name-research.md` still holds the round-1 screening
(PTAssist dead, PTDesk/PTRoster/Sessionly clear). This round drops the "must start with PT"
constraint at Pierre's instruction.

## First, a correction to the record

Pierre asked whether Elie had proposed a name "starting with PT, with one i replaced by a y".
**Searched exhaustively 2026-08-20** — all 37 PTApp session transcripts, all 12 other projects'
transcripts, `_archive/PTApp/memory-snapshots/`, the session log, and every doc. **No such name
exists in any record.** The only naming turn on file is Pierre's, 2026-07-14: *"name availability,
PTApp or PTAssist, if not available/possible then propose some available names inline with our
work."* Elie's recorded sessions (Jul 17–18) covered booking-time, Arabic exercise names and the
1RM tables — never a name.

Two candidates offered in that session, **PTAssyst** and **PTFyt**, were inference and invention
respectively, not recall. PTAssyst at least has a rationale (it revives the name Pierre liked
before the collision killed it); PTFyt had none and should not be treated as a lead.

## The landscape — what the category is named

Searched 2026-08-20. Direct competitors: **Trainerize, My PT Hub, PT Distinction, TrueCoach,
Everfit, FitBudd, FitFloww, Vagaro, Wodify, 1Fit, Tolodora, PT Mate, CoachDesk, PT Assist.**

The pattern is brutal and worth staring at: almost every one is `{Fit|Train|Coach|PT} + {suffix}`.
They describe the function, which means **they all describe the same function**, which means none
of them is findable. A trainer searching the store sees ten names that blur together. Round 1
already hit this — every "obvious" name was taken.

## The landscape — what the *winners* are named

Top global apps, 2026: **ChatGPT, TikTok, WhatsApp, Instagram, Temu, Telegram, CapCut, Snapchat,
Roblox, Gemini, DeepSeek.**

Not one of them describes what it does. Not one would survive a "does the name explain the
product?" review. They are short, mostly two or three syllables, and several are invented words.
Meaning flowed *to* the name after adoption, never before it.

**And the verb test Pierre raised is the real one.** "WhatsApp me", "I'll Venmo you", "just Google
it", "CapCut it". A name becomes a verb when it is short, ends in a soft consonant or vowel, and
is not already a common English word competing for the slot.

## What this app actually is — Pierre's definition, 2026-08-20

🔴 **This supersedes the "trainer's register" framing above and everything in round 1.** The
product is not a personal-trainer admin tool. It is a **three-role platform for propagating a
methodology**:

| Role | What their account does |
|---|---|
| **Owner** (Elie) | Manages coaches and clients. Issues instructions down to coaches. |
| **Coach** | Receives Elie's instructions; runs their own workflow; manages their own clients. |
| **Client** | Confirms sessions the coach assigns, books from open calendar slots, views their own program, history and progress. |

**The value is the evaluation → program pipeline, and its authority.** A client is evaluated
(currently the 1RM battery), scored against **established academic norms and published standards**,
and a program is generated from that score plus the domain expertise of sports specialists. The
selling point is not convenience — it is that the output is **defensible**.

That authority is personal: **Elie is not a personal trainer.** He is a sports specialist with a
PhD who teaches at a university. (This independently corroborates the LinkedIn snippet flagged as
unverified on 2026-08-19 — Lebanese University, Dept. of Physical Education and Sport, confirmed
as an author affiliation on the 2022 *Human Movement* handgrip paper.) He trains coaches, and
wants those coaches running **his** flow rather than improvising.

**Future direction:** the generation and analysis engine is deliberately standalone for now, but is
expected to call an AI API for program formulation and data analysis once that is affordable.

### Is there anything like it?

Searched 2026-08-20. The pieces exist separately; the combination does not surface:
- **[Lenus](https://www.trainerize.com/blog/online-education-platforms/)** — closest on structure:
  a coaching platform with an accredited **Academy** for coach education (EREPS/EuropeActive/NASM),
  built explicitly for the quality gap when a methodology scales past one person.
- **[CoachRx](https://www.coachrx.app/)** — closest on the pipeline: assessment → insight →
  personalised prescription that evolves.
- **[Spurfit](https://www.spur.fit/)** — AI program generation and staff management.

None found combining a **norm-referenced academic evaluation engine**, an **owner→coach→client
credential hierarchy**, and **Arabic-first delivery**. Treat that as "not found in a single search
pass", not as proof of novelty.

### What this does to the naming brief

The register/ledger metaphor is now too small — it names the admin layer, which is the *least*
valuable part. The name should carry **standard, measure, norm, calibration** — the thing that
makes the program defensible — and must work for three different audiences, including clients who
never see the coaching side.

## Candidates — NONE screened, all need the round-1 verification steps

### A. Arabic-rooted — names the *standard*, which is the actual product

Re-ranked 2026-08-20 against the three-role definition above.

| Name | Root | Why |
|---|---|---|
| **Miyar** / **Meyar** | معيار — **standard, norm, criterion** | Names the exact thing the app sells: the norm a client is measured against. Two syllables, clean in Latin script, meaningful to every Arabic-speaking coach and client, invisible in the English `Fit*` space. **Recommended #1.** |
| **Qyas** | قياس — **measurement, to measure** | Names the evaluation itself. "Qyas" is verbable in both languages, and the y-spelling of the more common transliteration *Qiyas* dodges collisions. Sharp and short. **#2.** |
| **Kadr** | كادر — cadre, staff, roster | Was the weakest candidate under the register framing; is now much stronger, because the app's distinguishing structure IS a cadre of coaches under one owner. Names the hierarchy rather than the science. |
| **Daftar** | دفتر — notebook, register | Still good, but now names the admin layer — the least valuable part of the product. Demoted from #1. |
| **Sijil** | سجل — register, "sajjil" = record it | Same demotion, same reason. |

### B. Short, invented, verb-shaped, no fitness cliché

| Name | Why |
|---|---|
| **Sesh** | "Book a sesh" is already how people speak. Maximum verb-fit of anything here. Almost certainly contested — screen first. |
| **Repza** | Rep + a hard ending. Nonsense word, so trademark-clean odds are good; says "gym" without saying "fit". |
| **Setlog** | Descriptive but not in the `Fit*` family. Lower brand ceiling, higher clarity. |
| **Roster** (bare) | Says the core object plainly. Common English word — weak trademark, poor searchability. Listed for completeness, not recommended. |

### C. Round-1 survivors, still valid

**PTDesk**, **PTRoster**, **Sessionly** — screened clear on 2026-07-14, still unverified for
trademark and domain. **PTAssyst** — no store collision found 2026-08-20, but "Assyst" is an
established enterprise-software brand (IFS assyst) and it sits one letter from the live "PT Assist"
in the identical category, which is exactly the confusable-name case Apple rejects.

## Recommendation

**Miyar** (معيار — the standard), with **Qyas** (قياس — the measurement) as the alternate.

The reasoning follows from the product definition, not from taste: the app's defensibility comes
from norm-referenced scoring against academic standards, so the name should say *standard*, not
*fitness* and not *diary*. Both work unchanged for all three roles — a client hears "the standard
I'm measured against", a coach hears "the standard I deliver", Elie hears "the standard I set".
Both are outside the dead `Fit/Train/Coach` namespace, both are two syllables, and both are native
to the language half the users speak.

⚠️ **Neither is screened.** Latin-script spelling must be fixed before screening (Miyar/Meyar/Me3yar;
Qyas/Qiyas) because the store and trademark searches are spelling-specific.

### Scope warning, recorded while it is cheap

The three-role platform described above is **not** what is built. Today's app is single-user with
one shared data blob synced from one private GitHub repo. Owner/coach/client accounts mean real
authentication, per-role authorisation, and server-side data separation — that is a different
backend, not a feature. **Nothing about the name decision requires building it**, and the Play
closed test can run on today's single-user app under the placeholder name. Keep the two decisions
apart.

## SCREENING RESULTS — run 2026-08-20

Method: Apple via the **iTunes Search API** (`entity=software`, exact and prefix title matches) —
authoritative. Google Play via HTML search scrape **plus** cross-checking web search — the scrape
alone produced only one hit across eight names, which is implausible, so **treat "clear on Play" as
low-confidence**; Play HTML is JS-rendered and the scrape yields false negatives. Domains via RDAP
(`.com`) and NS lookups (`.app/.io/.fit`) — NS present proves registration, NS absent only suggests
availability.

| Name | Apple App Store | Google Play | Domains | Verdict |
|---|---|---|---|---|
| **Metron** | ❌ **Metron Fitness** — exact category | not found (low conf.) | .com/.app/.io/.fit all taken | **DEAD** — a fitness app already owns it |
| **Calibra** | ⚠️ Calibra Pro Tools, Calibra Color Camera, Calibra Pneus | ❌ **Calibra – Science Weight Track** (`com.calibra.app`), plus **Caliber Strength Training** | all taken | **DEAD** — a fitness/weight app on Play, and Caliber is a major fitness brand |
| **Norma** | ⚠️ NORMA connect, Norma Focus, Norma Colombia | not found (low conf.) | all taken | Weak — crowded, and reads as a personal name |
| **Cadre** | ❌ two apps titled exactly **Cadre** | not found (low conf.) | all taken | **DEAD** on Apple's uniqueness rule |
| **Praxis** | ❌ **Praxis**, **Praxis Sports**, Praxis Core Exam Prep | not found (low conf.) | .io possibly free | **DEAD** — exact match + the US Praxis certification exams |
| **Rubric** | ❌ **Rubric**, Rubric Scorer | ❌ **Rubric** | all taken | **DEAD** |
| **Miyar** | ⚠️ Miyar Capital, معيار المالية — **finance, not our category** | not found (low conf.) | .com/.app/.io taken; .fit possibly free | **BEST SURVIVOR** |
| **Qyas** | ✅ no matches at all | ⚠️ `com.alho00ot.qyas` (قياس القدرات), QAYA, Qiyas ERP | .com/.app taken; .io/.fit possibly free | ⚠️ see the institutional problem below |

### 🔴 The Qyas problem — found during screening, not obvious beforehand

**Qiyas (قياس) is the Saudi National Center for Assessment**, the state body that runs the
country's aptitude and achievement testing. Naming an **assessment product** for Arabic speakers
"Qyas" borrows a national testing authority's name in that authority's own domain. The store
screen is clean; the institutional collision is not. This is exactly the class of risk a
store-search-only screen misses, and it is why round 1's doc insisted screening ≠ guarantee.

**Miyar** does not have this problem — معيار is an ordinary word for *standard*, not an
institution.

## DECISION — Elie chose **PTAssyst** (2026-08-20)

Relayed by Pierre. This is the name Elie had in mind all along; the inference earlier in this doc
(that a "PT + i→y" name would be a respelling of the collided PTAssist) was correct.

**What is verified:**
- **No app named "PTAssyst" or "PT Assyst" exists on either store** — searched 2026-08-20; results
  were only the known `PT Assist`, `PTassistance`, and unrelated enterprise "Assyst" products.
- **Google Play has no name-uniqueness rule.** PTAssyst is usable there immediately.

**What is NOT verified, and is the real risk:**
- **Apple.** "PT Assist" is live in the identical category (personal-trainer business management,
  `id6502348152`). Apple enforces store-wide uniqueness at app-record creation and rejects
  confusably-similar names; one letter apart in the same category is squarely that case. This
  cannot be settled by searching — only by attempting the reservation in App Store Connect, which
  needs the $99 account.
- **Trademark.** `assyst` is IFS's ITSM product (originally Axios Systems, acquired by IFS in 2021),
  almost certainly registered in classes 9 and 42. **I could not retrieve the actual registration
  records** — the USPTO search API returned 404 and web search surfaced no filing numbers. So the
  risk is *unquantified*, not cleared. Different field (ITSM vs fitness) usually helps, but the
  classes overlap.
- **Discoverability.** PTAssyst re-enters the `PT*` namespace this document argued is unfindable.
  That is a marketing cost, not a blocker, and it is Elie's product to name.

**Practical consequence — nothing is blocked.** The package ID `com.pih.ptapp` is neutral and
permanent; the Play display name is editable at any time. So the closed test can start under
PTAssyst now, and if Apple later refuses the name, only the display name changes.

**Next check when the Apple account exists:** attempt the App Store Connect name reservation early
— it is the authoritative test, and a reserved name is held.

## Round 3 — keep Elie's shape, drop the collision (2026-08-20)

Elie's actual preference is **"PT Assist"**; the y-spelling was a workaround because the name was
taken, not a thing he wanted. So the brief is: keep `PT + word`, keep the *meaning* of assist, and
lose the one-letter-from-a-live-competitor problem — while carrying the standards/authority half
this session established.

### The key screening finding

Screened 16 `PT*` names on the iTunes Search API, 2026-08-20: **PTSpot, PTAide, PTAnchor, PTSecond,
PTCorner, PTNorm, PTGrade, PTIndex, PTMark, PTScale, PTMetric, PTProof, PTBase, PTGauge, PTTier,
PTMerit — all sixteen CLEAR.** The `PT*` namespace is not actually crowded on Apple; what is
crowded is the *word* space (`Assist`, `Mate`, `Desk`, `Coach*`). **PTAssyst's risk was never
uniqueness — it is confusability with the live "PT Assist" specifically.** Change the second word
and that risk disappears completely, while Elie keeps the name shape he wanted.

Screened and rejected in the same pass (all have fitness apps sitting on them):
**Spottr** (Spottr Fitness, Spottr: Workout Form Coach), **Belay** (Belay: Strength Tracker),
**Spotta**, **Spotly**, **Cornerman**, **Aegis**, **Assistly**, **Adjutant** — all taken.

### Recommended

| Name | Why it fits both halves | Domains |
|---|---|---|
| **PTSpot** | 🔴 **The best match to what Elie actually likes.** A *spotter* is literally the person who assists a lift, watches the form and enforces the standard — it is "assist" in gym language, and the app's own evaluation battery (bench/squat/deadlift 1RM) is exactly where spotting happens. It scales up the hierarchy too: coaches spot clients, Elie spots coaches. "Spot me" is already a verb in every gym on earth. | .com taken; **.app/.io look free** |
| **PTGauge** | The standards half — to gauge is to measure *and* to assess. Names the norm-referenced engine rather than the help. | **.com/.app/.io all look free** |
| **PTMerit** | Evaluation plus worth; slightly formal. | **.com/.app/.io all look free** |

Both PTSpot and PTGauge are clear on Apple, show nothing on Play, and avoid the PT Assist
confusion entirely. **PTSpot is the recommendation** — it preserves Elie's intent most faithfully.

⚠️ Domain "free" here is NS-absence, which suggests but does not prove availability; confirm at a
registrar. Play results remain low-confidence for the reason stated above.

## Should the name carry "PT" at all? (2026-08-20)

**Recommendation: no.** Four reasons, in order of weight:

1. 🔴 **Elie is not a personal trainer.** He is a PhD sports specialist who teaches at a university
   and trains coaches. "PT" labels the product as precisely the category he is *above*. The product's
   whole claim is that its programs are academically defensible — "PT" says "trainer's helper".
2. **"PT" reads as physical therapy** to a large share of English speakers — `PTassistance`, one of
   the collisions found in round 1, is a physiotherapy app. The prefix is ambiguous in the exact
   market where the store search happens.
3. **It is a category label, not a brand, and it cannot become a verb.** "PTSpot" is spelled out in
   the head — *pee-tee-spot*, three syllables — so it never becomes "spot me on it". Every name that
   won its category (per the top-20 list above) is pronounceable as a word.
4. **It caps the product.** The roadmap has client accounts and a coach hierarchy. A client
   downloading "PT-something" is being handed her trainer's admin tool, not her own app.

The case *for* PT is real but smaller: instant category recognition in store search, and it is the
shape Elie already likes. **It is his product to name** — this is a recommendation, not a veto.

### Spot-family names WITHOUT the prefix — screened 2026-08-20

The bare word is gone: **Spotter** (incl. *Spotter: Find Your Swolemate*), **Spotr: Strength
Training**, **Spottr Fitness**, **Spotta**, **Spotly**, **Spott**, **Onspot**, **Spotmark**,
**Spotix**, **Spotus**, **Spotia**, **Spoteo**, **Spotivo**, **SpotRep**, **Spotwork** — all taken,
several by fitness apps. That is why the PT prefix rescued the idea in round 3.

**Clear on Apple:** `Spotset`, `Setspot`, `Spotiq`, `Spotgrade`, `Spotbase`, `Spotan`, `Spotara`,
`Spotiva`, `Spotera`.

| Name | Why | Domains |
|---|---|---|
| 🔴 **Spotset** | **The best no-PT option.** Both halves are gym-native: *spot* = assist and hold the standard, *set* = the unit of training the app actually schedules and prescribes. One word, two syllables, pronounceable, no category label, works for a client as easily as for a coach. | **.com / .app / .io all appear free** |
| **Spotgrade** | Names the assist *and* the scoring explicitly. Blunter, less brandable. | .com taken; .app/.io free |
| **Spotiq** | Short, modern. "IQ" is a tired suffix and implies AI that does not exist yet. | .com/.app/.io all taken |

**Spotset over PTSpot** on every axis except Elie's familiarity — and it is the only candidate in
this entire document with all three major domains apparently free.

## Before ANY name is committed — unchanged from round 1

1. Store screening on both stores (this doc has NOT done it for section A or B).
2. Trademark: USPTO, EUIPO, WIPO Global Brand DB — Nice classes 9, 41, 42.
3. Domain + social handles, same day.
4. App Store Connect reservation is the authoritative uniqueness test, and needs the $99 account.

**None of this blocks Play.** The package ID `com.pih.ptapp` is already permanent and neutral, and
the Play display name is editable at any time — so the closed test can start under "PTApp" while
this decision takes as long as it needs.
