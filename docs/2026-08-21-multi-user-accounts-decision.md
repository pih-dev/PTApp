# SpotSet — Multi-User Accounts & Roles: Decision Document

**Date:** 2026-08-21 · **Status:** proposal — nothing approved · **Decide:** §8

---

## 1. Verdict

- **Build:** Supabase (Postgres + email/password auth), Phase 1 keeps today's JSON blob verbatim in one row per coach; **Postgres RLS is the only authorization point**. Roles come later, additively.
- **Cost:** $25/mo Supabase Pro from cutover day + ~$14/yr `spotset.app`. First recurring cost in this project.
- **Time:** ~10 weeks calendar to an Apple submission, part-time. (All three designs quoted "days"; every judge said multiply by 2.5–3×. This number already has that applied.)
- **Consequence:** **it delays the Apple submission by roughly 6–10 weeks** — but it replaces the credential Apple can reject with the one Apple expects.
- **Do this week, before any of it:** roll out v2.15.1 the moment Google approves and send the 14 testers their opt-in link. That clock is worth more than the architecture.

---

## 2. Your actual question, answered

> *"If we'd planned it right we'd have avoided the DEMO credential."*

**Half true — and the half that's true is the important half.**

| Claim | Verdict |
|---|---|
| DEMO exists because there are no accounts | **True.** One credential exists, it has write access to everything, so it could not be handed to a reviewer. With accounts, a reviewer gets a real account in a seeded org and the database refuses it Elie's data. No guards, no `isDemo()` in five places. |
| Planning would have avoided it | **Partly.** A backend on day one was the wrong call for a one-trainer app. DEMO is a reasonable patch on a correct earlier decision, not a mistake. |
| DEMO is the symptom of a real defect | **True.** The defect is "the only credential in the system is all-powerful." That's worth fixing regardless of stores. |

> **Does doing it now make Apple easier — or does it delay it?**

**It delays it. Say six to ten weeks.** No softening.

What it buys, against a real Apple risk:

| | With DEMO (today) | With accounts |
|---|---|---|
| Guideline 2.1(a) | Built-in demo mode — allowed **only with Apple's prior approval**. You'd be asking for an exception. | Real populated account on a live backend. **The default Apple expects.** No exception to argue. |
| Reviewer sees | Seeded local data, network paths off | A real org, real sync |
| Risk | Unknown; could cost a review cycle or several | Low, well-trodden |

**The honest middle path, and it's why the delay is survivable:** iOS work is not blocked while you build. Apple activation lands within ~2 business days. **Push v2.15.1 to TestFlight *internal* testing immediately — internal TestFlight skips App Review entirely.** That debugs Codemagic, certificates, provisioning and `cap add ios`-on-a-hosted-Mac on a build you already trust, months before it's load-bearing. The largest unpriced risk in the whole Apple path gets retired in week 1, at zero review exposure.

So: the *submission* waits. The *pipeline* doesn't.

---

## 3. The Google Play countdown

**No, changing the app does not reset it. The clock tracks testers, not builds.**

| Question | Answer |
|---|---|
| New versionCode resets the 14 days? | **No** |
| Functionality / App Access change resets it? | **No** |
| What must stay continuous? | Each tester's **opt-in state**, over the 14 days immediately preceding your production-access application. Rolling window. |
| Is the clock running now? | **No.** It starts only when you roll out AND 12 testers opt in. Google emails testers nothing — you distribute the link. |

**Source:** [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) — *"a minimum of 12 testers who have been opted in continuously for at least 14 days."* Nothing in the criterion mentions a release, a build, or a versionCode. Google actively expects mid-test changes (*"respond to tester feedback and resolve identified bugs"*). ⚠️ This is an argument from silence in the official text plus three consistent secondary sources; Google has never published the words "a build does not reset the clock."

**The real hazard is not the clock — it's a rejected release.** If the declared App Access credential doesn't work against the uploaded build, that *release* is blocked (exactly the "Missing sign in details" rejection that killed versionCode 2). Testers stay opted in; you just lose days.

### Recommended sequencing against the countdown

| When | Do |
|---|---|
| **On Google's approval (days)** | Roll out. Send all 14 testers the opt-in link yourself. **Clock starts.** |
| **Day 1–14** | Do Phases 0–2 (§6). Every one is invisible to both stores. Keep a buffer above 12 testers — sources disagree on what a dropout does, so don't sit at exactly 12. |
| **Day 14** | **Apply for production access on v2.15.1 with `DEMO`.** Do not wait for the auth work. |
| **Later** | Ship the auth build to the same closed track as a normal update. |

The countdown and the architecture are on separate tracks. Don't couple them.

---

## 4. Recommended architecture

**Backend:** Supabase — Postgres, GoTrue auth, Row-Level Security. **Pro ($25/mo) from the day Elie's real data lands.** The free tier has zero backups and pauses after 7 idle days: disqualifying for a live business.

**Rejected on migration risk, not features:** Firestore's per-document last-write-wins *is* the mechanism of the Apr-13 and Apr-19 data losses — adopting it means deleting your fix and trusting a vendor to reimplement the bug. Rest in §9.

**Auth:** your own **email + password, invite-only, no self-signup, no OAuth ever.**

| Why | |
|---|---|
| Own email/password is not a "third-party login service" | **Guideline 4.8 never fires — Sign in with Apple is not required.** The day anyone adds "Sign in with Google," SIWA becomes mandatory. **This goes into TRAPS today.** |
| No OAuth ⇒ no deep links, no PKCE | The documented Supabase iOS "PKCE verifier lost across the deep link" trap never applies |
| Invite-only | Matches the product; kills the signup abuse surface; strengthens the 5.1.1(v) position — but ship in-app deletion anyway (§5 collision resolved below) |

**Phase 1 data model — the blob survives, byte-identical:**

| Entity | Fields | Owner key | Read | Write |
|---|---|---|---|---|
| `orgs` | id, name, owner_id | `owner_id` | members of the org | owner |
| `memberships` | org_id, user_id, role (`owner`/`coach`/`client`), client_ref | `(org_id,user_id)` | self; owner/coach see the org's | owner/coach |
| **`tenants`** | id, org_id, coach_id, **`data jsonb`** (= today's `data.json`), data_version, `version` (concurrency), updated_at | **`(org_id, coach_id)`** | own coach; org owner | own coach; org owner |
| `tenant_snapshots` | tenant_id, data, bytes, reason, created_at | via tenant | own coach; owner | server only (trigger + nightly) |
| `client_views` *(Phase 5)* | org_id, client_ref, data (that client's slice only) | `client_ref` | the mapped client; owner/coach | **server trigger only** |
| `client_requests` *(Phase 5)* | org_id, client_ref, session_id, kind, payload, status | `client_ref` | owner/coach; own client | **insert-only by the client** |

**Where authorization is enforced: in Postgres, by RLS. Nowhere else.** Everything in `src/` is presentation; the role map in React is allowed to be wrong.

- `force row level security` on every table + `revoke all on schema public from anon`, so a forgotten policy fails **closed** (locked-out app) rather than open (leaked roster).
- **Only the anon key ships in the bundle.** Never a service-role key, never a shared account with data access. Both C's Phase-2 mirror credential and any embedded service login are cut — the mirror runs from your laptop / CI. This is the standing TRAPS rule: *never hand out a credential that reaches live data.*
- Clients never get INSERT/UPDATE policies — RLS cannot restrict *columns*, so a client would be able to rewrite `session_notes` or flip `status:'completed'`. Client writes go through **`client_requests` (insert-only), drained and applied by the coach's app through the existing reducer actions**, so `buildSession` stays the only session constructor.
- **`scripts/sanity/sanity-rls-matrix.mjs` is written and failing before the policies exist.** Five synthetic users; for every table × role a **positive and a negative** assertion. Runs in the deploy gate — a new table without a policy fails the build. This is the only defence against the silent "forgot to enable RLS" failure, which has no symptom.

**Offline model: unchanged, line for line. This is the headline safety property.** localStorage stays truth, the network stays the slow path, `mergeData` / per-record `_modified` / union-by-ID / migrate-the-foreign-blob all survive. The HTTP-409-retry-merge loop maps one-for-one onto `update … where version = $n` returning zero rows. `DATA_VERSION` stays 6. **No `migrateData` step is performed during the dangerous release** — the single highest-risk operation in this codebase simply isn't run.

**Four things that must change in `src/`, and they are not optional:**

| Change | Why |
|---|---|
| 🔴 `STORAGE_KEY` → `ptapp-data:<userId>` | The unnamespaced key is a landmine the moment a second identity exists on one device. Coach signs in on Elie's phone → app boots offline-first from localStorage → finds a populated store → pushes **Elie's whole dataset into the coach's tenant**. RLS authorises it: correctly scoped to the wrong person. That's Apr-13 with a new cause. *(Only Design B caught this.)* |
| Auth gate = `hasSession \|\| hasLocalData` | Never token validity. An expired session shows a banner; it must **never** be a login wall. If a lapsed token black-holes Elie's schedule in a gym with no signal, multi-user is over. Also what Apple tests in Airplane Mode (4.2). |
| Reset the cached concurrency token on driver flip | `sync.js` holds a module-level `currentSha`. A stale cached version at the moment of a rollback is a blind overwrite. |
| `CACHE_NAME` versioned off the build id | See Phase 0. |

---

## 5. Migrating Elie's live data

Two independently readable copies at every moment. **The gate before each step; the rollback after it.**

| # | Step | Gate before | Rollback | Elie experiences |
|---|---|---|---|---|
| 0 | Version `CACHE_NAME`; write `scripts/snapshot-live.mjs` (archives `data.json`, **asserts byte count vs the API's reported size, exits 1 on mismatch**) | sanity suite 13/16 | trivial, no data path touched | nothing |
| 1 | Supabase project + schema + RLS; **laptop-run** mirror script copies `data.json` → `tenants` | snapshot archived + byte-verified | delete the project | nothing |
| 2 | **Dual-write, GitHub still authoritative.** Every GitHub push followed by a Supabase write. Mirror leg **runs off the commit stream, not from the bundle** — no credential ships. | — | flip one build flag, redeploy (~10 min) | nothing |
| 2s | **7-day soak.** Daily byte-diff of both stores. 🔴 **Any unexplained divergence halts the plan** until understood — not worked around. | 7 consecutive clean days | as above | nothing |
| 3 | **Cutover: login ships, Supabase authoritative, GitHub becomes the shadow.** PWA only — no Play upload, no TestFlight. Supabase Pro on the day before. | snapshot + `tenant_snapshots(reason='pre-migration')` + 7 clean days + **both phones confirmed on the new build** (stale-bundle trap) | redeploy previous `index.html`/`sw.js`, Elie re-pastes the PAT. **Under 15 min, zero data reconstruction** — the reverse mirror kept GitHub current. **PAT not revoked for 30 days.** | **one sign-in screen, once — rehearsed with him beforehand, not on a busy day** |
| 4 | Native catches up: Play versionCode 4, then iOS. | credential verified against **that exact artifact**; versionName read **inside the .aab** | halt rollout (blocks distribution, does not recall) | nothing |
| 5 | Nightly export back to `ptapp-data` forever | — | — | nothing |

**Ideal outcome: Elie notices exactly one thing, once — a login screen.** Everything else is invisible to him.

`DATA_VERSION` stays 6 through step 4. `utils.js` is otherwise unchanged. No schema migration means no migration bug.

**Account deletion vs "NEVER delete user data" — resolved, not fudged:**
> A **client record** is the trainer's business record and is never deleted. A **client account** is the person's, and is deleted on request. Deletion removes the `auth.users` row, the membership and the projection. Sessions, evaluations and programs survive, attached to a client record with no account — exactly the state of every client Elie has today.

That sentence goes in the privacy policy, in the confirm screen (EN + AR), and in CLAUDE.md. It satisfies Apple 5.1.1(v) and the data rule without either bending. **Elie should sign it off** — it's his customer relationship and it goes public.

---

## 6. Phased plan

Effort is **calendar at ~8–10 h/week**, with the 2.5–3× correction every judge demanded applied.

| Phase | Ships | Effort | Elie keeps working | Rollback |
|---|---|---|---|---|
| **0 — Make rollback real** | Versioned `CACHE_NAME`; `snapshot-live.mjs`; **TestFlight internal on v2.15.1**; supersede the "single user, don't add multi-user complexity" principle in writing | **1 wk** | yes, unaffected | trivial |
| **1 — Schema + one-way mirror** | Supabase project, schema, RLS, `sanity-rls-matrix.mjs` (failing first), laptop mirror. **No app code, no deploy.** | **1–2 wks** | yes, unaffected | delete project |
| **2 — Dual-write + 7-day soak** | Driver split, GitHub authoritative, daily byte-diff, stop-the-line rule. Apr-13/Apr-19 traces replayed as deploy-gate tests. | **2 wks + 7-day wait** | yes, unaffected | one flag, 10 min |
| **3 — Login, Supabase primary** 🔴 | `AuthGate`, Elie's account, reverse mirror to GitHub, Pro on. **PWA only.** | **2–3 wks** | yes — one sign-in, rehearsed | redeploy + paste PAT, <15 min |
| **4a — Play** | versionCode 4, App Access credential swap (**`DEMO` stays in the code**), Data Safety updated | **1 wk** | yes | halt rollout |
| **4b — iOS** | Codemagic → TestFlight external → App Store, two real reviewer accounts | **1–2 wks** | yes | halt |
| **5a — Coaches** | Invites, Team screen, coach #2 (starts **empty** — blast radius zero) | **2–3 wks** | yes | additive; redeploy |
| **5b — Clients** | `client_views` trigger (**+ server-side periodic rebuild**), `client_requests`, `ClientApp` over existing components, account deletion | **3–4 wks** | yes | additive; redeploy |
| **6 — Shred to rows** | Only if scale demands it. Blob column retained until row-parity proven. | later, maybe never | — | — |

**~10 weeks to the Apple submission (end of 4b).** Phases 5a/5b are post-launch.

**Where the judges disagreed, and the call:**

| Disagreement | Call | Why |
|---|---|---|
| Shred the blob into tables now (B) vs keep the blob (A, C) | **Keep the blob.** | The live blob is 152 KB. Nothing about three roles needs relational tables — tenants don't share rows. B's own risk #1 is *"replacing a merge you have hardened over four months with one you wrote last week."* The answer to that sentence is don't do it, not write more tests. |
| Delta sync + outbox (B) | **Rejected.** | It arbitrates conflicts on a **client clock** permanently, where today a whole-blob push self-corrects on the next edit. And the outbox becomes the only record a change needs pushing — in localStorage, which B itself says WKWebView evicts. That's a booked session existing on one device forever, silently. |
| Client projection written by the coach's device (A) vs by a DB trigger (C) | **Trigger, plus a scheduled server-side rebuild.** | A's version contains `renewalDue` / `remaining` — **time-dependent values that change with the calendar, not with an edit.** A coach who edits nothing for two weeks can never refresh them, and A's own UI then greys the screen out with "your trainer hasn't synced recently" — on the account it tells Apple to test. |
| C's anti-shrink DB trigger | **Cut it.** | It fires on the legitimate `DELETE_CLIENT` path, training you to reach for the `allow_shrink` switch that disables the guard. It also only watches `clients` while `sessions`/`programs`/`auditLog` — where the losses actually happened — go unguarded. The merge loop is the real defence. Keep `tenant_snapshots` + the nightly export. |
| C's Phase-2 mirror credential in the bundle | **Cut it.** | `pih-dev/PTApp` is public. Run the mirror from your laptop. |
| Delete `DEMO` when auth ships | **Keep it through Phase 4.** | Removing it and changing the auth path in one release is two failures in one build — and it's the only path that survives an Airplane-Mode reviewer (the documented 4.2 white-screen trap). |
| B's `genId` collision flag 🔴 | **Downgrade, but do it.** | 36⁷ ≈ 7.8×10¹⁰; ~0.06% at 10,000 records. Move new ids to `crypto.randomUUID()`, leave legacy ids untouched. Not urgent. |

---

## 7. What this does NOT include

| Deferred | Safe because |
|---|---|
| Relational tables (shredding the blob) | 152 KB blob; Postgres has no 1 MB row problem. Do it when it earns its place, additively, blob retained until row-parity proven. |
| ~~Owner sees coaches' clients~~ **— NO LONGER DEFERRED, see §11.3** | 🔴 **This row is superseded.** §10/§11 made a parent PT reading down the tree an explicit requirement, so it is in scope. The warning it carried is still correct, and is the reason §11.3 is shaped the way it is: every screen takes **one** `state` object, so a Dashboard that *merges* a coach's clients with a descendant's is a real client-side refactor, not "one RLS clause." §11.3 therefore never merges — drill-in **swaps** which coach's blob is loaded, leaving the one-`state` shape intact. Keep this warning alive against any future request for a combined view. |
| Client write access beyond confirm/decline/request | `client_requests` is insert-only; no new merge surface at all. |
| Client self-signup | Provisioned-only bounds the user set and strengthens the 5.1.1(v) position. |
| Sign in with Apple / Google sign-in | Adding Google *forces* SIWA. Pure cost for an invite-provisioned professional app. |
| IndexedDB, program pruning, PowerSync | Unrelated to identity. The 1 MB GitHub ceiling — and the program-pruning deadline in KNOWN ISSUES — **stops existing at Phase 3.** Mark it resolved in that commit; a stale obligation gets acted on. |
| P3 / P6 review backlog | 🔴 **No refactor rides along.** One variable per release. |

**Also marked superseded, in writing:** `docs/changelog-technical.md:2152` ("single user… don't add complexity for multi-user edge cases") — correct until 2026-08-20, now retired, or a future session will cite it to kill this work. And the paused WhatsApp/confirm-page spec: `client_requests` replaces the Cloudflare Worker, the HMAC link signing and the second server-side credential entirely.

---

## 8. Open questions — yours to decide

1. **Money.** Supabase Pro **$25/mo from Phase 3**, forever. First recurring cost in this project. Free tier is not an option — no backups, pauses after 7 idle days.
2. **Timeline.** ~10 weeks to the Apple submission, and Apple waits that long. Alternative: submit iOS now on `DEMO` with a prior-approval request in Review Notes and accept an unknown rejection risk. **My recommendation is to wait** — but it's your call, not mine.
3. **Do clients get write access at all?** Recommended: **confirm / decline / request only**, via an insert-only queue the coach's app applies. Never direct writes. Confirm you want even that much.
4. **Sign in with Apple: no, permanently.** Own email/password keeps 4.8 dormant. The moment anyone adds Google sign-in, SIWA is mandatory. Confirm you accept "no social login, ever" — this goes in TRAPS.
5. **Elie's sign-off**, under his standing-authority terms: his live records change hosts, and the account-deletion wording (§5) goes into a public privacy policy.
6. ~~**Buy `spotset.app` now**~~ — **DECIDED 2026-08-21: NOT buying it.** Pierre: *"I dont care of someone bought .app, its not .com"*. The reviewer-account requirement (a domain you control) is met by **`review@calnorm.com`**, live on Zoho since this session. If deep links are ever needed, use `spotset.calnorm.com`. Original reasoning kept for the record: (~$14.20/yr). Not blocking for password login, but it *is* blocking for reviewer-account email and for Phase 5b deep links. ⚠️ Reviewer accounts on a domain nobody owns, on Supabase's rate-limited built-in SMTP, is a 2.1(a) failure with a one-line cause.

---

## 9. Rejected alternatives

| Rejected | Reason |
|---|---|
| **Firestore** | Per-document last-write-wins *is* the Apr-13 / Apr-19 data-loss mechanism. Adopting it means deleting your fix and trusting a vendor to reimplement the bug. |
| **PocketBase / any VPS** | Makes a solo part-time developer in Beirut the on-call sysadmin for someone else's payroll data. Failure mode: Elie can't work and you're asleep. |
| **Cloudflare D1 + Workers + Access** | Access is corporate ZTNA at $7/user/mo — wrong shape and expensive at scale. Real RBAC means hand-writing auth, sessions, reset and an authz check at every endpoint. Every one is a place to get scoping wrong. |
| **Neon + custom API** | Great database, no auth, no authz. You'd build the whole tier or bolt on a new vendor. |
| **Stay on GitHub, per-user repos** | Cannot express "this trainer sees only their clients" at any layer; every trainer needs a GitHub account or an embedded token that reaches everyone's data. ~500 content-writes/hour secondary limit fails semi-silently — the exact class that already cost data twice. |
| **Design B in full (16-week proper rewrite)** | Best destination, worst journey. Realistically 300–400 hours, changes four things in `utils.js` inside the same release as auth and transport, and is the design most likely to be abandoned at 60% with Elie's business half-migrated. |
| **Design A's device-written client projections** | Stale by construction: renewal state changes with the calendar, not with an edit, so a quiet coach means a permanently-wrong client screen — and A tells Apple to test that account. |
| **Ship roles on the current blob without a backend** | Every authorization decision becomes a React `if`. The first one you forget is a coach reading another coach's client list, with no symptom. |

---

**Nothing here is committed. Redirect anything in §8 and the rest re-plans around it.**
---

## 10. New requirement — role hierarchy (Pierre, 2026-08-21 ~10:40)

Stated verbatim in effect: *"the app allows two kinds of users, either PTs or clients. And the PTs
might have PTs under them or clients. Elie is the prime PT because there's no PT above him… the user
can control it, it's not set up [hardcoded]."*

**What this changes versus Design A (one blob per coach):**

- **Two roles only** — `pt` and `client`. No third "admin" role: *prime* is not a role, it is simply
  a PT whose `parent_pt_id IS NULL`. That keeps the enum at two and makes the hierarchy data, not
  configuration.
- **A PT's subordinates can be PTs or clients** — i.e. `parent_pt_id` lives on both, so the tree is
  arbitrary-depth. Elie's position is emergent, not stamped.
- **Consequence for the blob model:** one blob per coach still holds, but a parent PT must be able to
  read (and possibly write) descendants' tenants. That is a recursive RLS predicate
  (`WITH RECURSIVE` ancestry check), which Design A deliberately avoided. **This is the one place
  where the new requirement adds real cost** — price it before committing.
- **Deferred, not decided:** whether a parent PT can *edit* a descendant's clients or only view them,
  and whether a client can be shared between two PTs. Both are Phase-2 questions.

**Not affected:** `DATA_VERSION` stays 6, the merge kernel is untouched, and the Google closed test
keeps running — the tester clock counts testers, not builds.

---

## 11. Scoping and administration — decided (Pierre, 2026-08-21 ~12:00)

Three questions were open after §10. All three are now answered, and the answers **supersede §4's
`orgs` / `memberships` shape wherever they conflict** — §4 was written before the hierarchy
requirement existed and still carries a three-value role enum (`owner`/`coach`/`client`).

### 11.1 No admin role. Administration happens outside the app.

Pierre asked whether the prime PT should also be an admin, or whether administration can be external.
**External.** The decision:

- The role enum stays exactly **`pt` | `client`**, as §10 fixed it.
- The only genuinely administrative operations are **re-parenting a PT**, **recovering an orphaned
  account**, and **hard-deleting a tree**. All three are rare, irreversible, and cross-tenant.
- They are performed in the **Supabase SQL console with the `service_role` key**, from Pierre's
  laptop. That key already exists, already bypasses RLS by design, and — per §4 — **never ships in
  the bundle**.

**Why not an in-app admin:** an admin role is a login that must exist on a phone, be authenticated,
be recoverable, and be RLS-modelled — and its whole reason for existing is to bypass the isolation
the rest of the design is built to guarantee. It would be the second all-powerful credential in a
project whose stated defect (§2) is *"the only credential in the system is all-powerful."* The cost
of not having it is that Pierre runs three SQL statements a handful of times a year.

🔴 **Consequence to hold onto:** there is no in-app path to fix a mis-parented PT. Getting
`parent_pt_id` right at invite time matters, and the invite flow must show the parent it is about to
stamp, in words, before it sends.

### 11.2 Peer PTs are fully isolated — and that is the default, not a setting

Elie, after migration, is a PT with `parent_pt_id IS NULL` (prime) with his existing clients under
him. When he adds another PT he chooses one of two placements, and the placement is the entire
authorization story:

| Placement | `parent_pt_id` | What each sees |
|---|---|---|
| **Peer** (another prime) | `NULL` | **Nothing shared, in either direction.** Two disjoint trees in one database. Elie cannot see their clients; they cannot see his. |
| **Subordinate** | Elie's user id | Elie sees that PT, that PT's clients, and anything further down. The sub-PT sees **only its own subtree** — not Elie's clients, and not a peer sub-PT's. |

Both directions fall out of one predicate — *"is the requesting user an ancestor of this row's
owner?"* — so peer isolation costs nothing extra to implement. Pierre expects the peer case to be
rare but requires it to be available.

### 11.3 "Mine" is the default scope everywhere. The downline is a drill-in.

🔴 **This is a product rule, not a permissions rule, and it is the one most likely to be lost.**

Elie's daily routine is his own schedule and his own clients. A parent PT's normal screens —
Dashboard, Schedule, Clients, renewals, counts, everything — show **only rows whose owner is the
signed-in PT**. Descendants' clients and sessions are *never* merged into those lists, not sorted
in, not badged, not counted in totals.

Reaching the downline is a **deliberate, separate act**: pick a sub-PT, and the app switches into
that PT's view — clearly marked as someone else's data — where the parent can look and, when needed,
intervene. Leaving returns to his own workflow.

Two consequences that must survive into implementation:

- **RLS grants access; the query decides the default.** Every list query filters on
  `owner_id = auth.uid()` unless the user has explicitly drilled in. A policy that *permits* reading
  the subtree must never be mistaken for a screen that *should* show it.
- **`getClientCountedSessions`, `getRenewalDueMap` and every other kernel keep operating on one
  coach's dataset at a time.** Drill-in swaps which dataset is loaded; it does not widen it. Nothing
  in the counting or renewal logic becomes hierarchy-aware.

**Still deferred** (unchanged from §10): whether the parent may *write* in a descendant's view or
only read, and whether a client can be shared between two PTs. §11.3 assumes read-plus-intervene,
which is what Pierre described; the write policy is priced in §12.

---
## 12. Pricing the recursive RLS — the §10 blocker, resolved

§10 named one real new cost: *"a parent PT reading down the tree… a recursive RLS predicate
(`WITH RECURSIVE` ancestry check) — price it before committing."* Priced below. **Verdict: build it.**
Two conditions, and the second is the one a first attempt gets wrong.

1. **Do not recurse at query time.** Materialize the ancestry.
2. **Do not let the policy call a function that takes row data as an argument.** That is the trap
   §12.1 exists to name.

### 12.1 The two ways to get this wrong

**Wrong #1 — recurse per row.** `using ( exists (with recursive ancestors as (…) select 1 …) )` is
evaluated against each candidate row and cannot be hoisted, because the CTE depends on the row. One
graph walk per row scanned.

🔴 **Wrong #2 — assume `(select fn(row_column))` fixes it. It does not.** Supabase's RLS-performance
guidance says to wrap function calls in `select` so the planner runs them once as an **initPlan** —
but that applies *only where the result does not depend on the row*. A `security definer` function
taking a row column as a parameter becomes a **correlated SubPlan**, which runs **once per candidate
row**, and `security definer` SQL functions are never inlined, so every row pays a real function
call. A predicate shaped `(select private.can_reach(coach_id))` therefore buys nothing: it is the
shape that *looks* optimized and isn't. **The fix is not to wrap the row-dependent call — it is to
split the predicate so the expensive half takes no row input.**

### 12.2 The design — materialized path, with the row-independent half hoisted

Store ancestry **on the row**, maintained on write, so the read test is an indexable containment
match; and pass the *caller's* path in, never the row's id.

```sql
create extension if not exists ltree with schema extensions;
create schema if not exists private;

-- app_users: one row per human. Two roles, per §10. Prime = parent_pt_id is null.
-- 'path' is the materialized ancestry: '<root>.<child>.<self>'.
-- ⚠️ ltree labels accept hyphens only from Postgres 16 (the change was made for
--    UUID/base64 ids). CONFIRM the Supabase instance's server_version at build
--    time: on PG 16+ store the uuid as-is; on 15 or older strip the hyphens.
create table public.app_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('pt','client')),
  parent_pt_id  uuid references public.app_users(id),
  path          extensions.ltree not null,
  created_at    timestamptz not null default now()
);
create index app_users_path_gist on public.app_users
  using gist (path extensions.gist_ltree_ops);
create index app_users_parent_idx on public.app_users (parent_pt_id);

-- Row-INDEPENDENT: the caller's own path. No arguments, so a policy calling it as
-- (select private.my_path()) is a genuine initPlan — evaluated once per statement.
-- ⚠️ search_path is 'extensions', NOT '' — Supabase installs ltree there, and with
--    an empty search_path neither the type nor the <@ operator resolves.
create function private.my_path()
returns extensions.ltree
language sql stable security definer set search_path = 'extensions', 'public' as $fn$
  select path from public.app_users where id = auth.uid();
$fn$;
```

Denormalize the owner's path onto every tenant row (stamped by trigger from `app_users`), so the
policy compares two values and can use an index:

```sql
alter table public.tenants add column owner_path extensions.ltree not null;
create index tenants_owner_path_gist on public.tenants
  using gist (owner_path extensions.gist_ltree_ops);

alter table public.tenants enable row level security;
alter table public.tenants force row level security;

-- "this row's owner is at or below me". <@ is "is a descendant of, or equal to",
-- so ONE predicate covers own-data, downline and peer isolation:
--   equal paths     -> own data
--   contained path  -> a descendant
--   disjoint roots  -> two primes, neither contains the other -> isolated (§11.2)
create policy tenants_read_pt on public.tenants for select to authenticated
  using ( owner_path <@ (select private.my_path()) );

-- Write: own tenant only, to start. Widening a policy later is safe; narrowing one
-- after Elie has relied on it is not. INSERT and DELETE need their own policies —
-- a FOR UPDATE policy alone leaves both closed, which is the correct default but
-- must be a decision, not an oversight.
create policy tenants_write on public.tenants for update to authenticated
  using ( coach_id = (select auth.uid()) )
  with check ( coach_id = (select auth.uid()) );
```

🔴 **The `client` role needs its own predicate — the path rule does NOT cover it.** A client sits
*below* their PT, so the PT's tenant row is not contained in the client's path and
`tenants_read_pt` correctly returns **nothing** for a signed-in client. That is not a bug to patch
here: clients were never meant to read the coach blob (§4 — RLS cannot restrict *columns*, so a
client reading `tenants` would see every other client's notes). Client reads go through
`client_views` in Phase 5, matched on `client_ref`, with its own policy. **Recorded because §11.2's
table reasons only about PTs and reads as if it were complete.**

### 12.3 The cost, itemised

| Cost | Verdict |
|---|---|
| Read-path performance | **Low, and now honestly stated.** `private.my_path()` is row-independent, so `(select …)` makes it a true initPlan — one call per statement. What remains per row is one `ltree` containment comparison, index-assisted. Materially cheaper than the `can_reach(coach_id)` shape, which would have been a per-row function call. |
| Recursion at query time | **None.** It moved to write time. |
| Path maintenance | A `before insert` trigger stamping `parent.path \|\| self`, a trigger denormalizing `owner_path` onto `tenants`, and **one** `WITH RECURSIVE` update to restamp a subtree on re-parent — which per §11.1 runs from the SQL console a few times a year. |
| Denormalized `owner_path` | The price of the hoist. It is derived data, so it can go stale; the restamp must update `tenants` in the same transaction as `app_users`. |
| Extra table | One (`app_users`). It also replaces §4's `memberships` — role and parent link now live in one row. |
| `ltree` extension | Available on hosted Supabase. Installed into `extensions`, hence the `search_path` note above. |
| Correctness risk | **The real one.** A wrong `path` silently grants cross-tree reads and has no symptom. Mitigation: `sanity-rls-matrix.mjs` (§4) grows a **peer-isolation pair** — prime A must read A's tenant and must be **refused** B's — in the deploy gate. |

**The §10 requirement is not a reason to change the architecture.** The line that matters is the last
row: the negative assertion, not the positive one, is what proves isolation.

### 12.4 Open, and deliberately not decided here

- **Parent write access** to a descendant's tenant (§11.3). Starting closed.
- **INSERT / DELETE policies on `tenants`** — closed by default above; decide explicitly at build.
- **A client shared between two PTs** — breaks the single-path assumption and needs a second grant
  table. Not needed for Elie; do not build it speculatively.

### 12.5 Verified

§11–§12 were fact-checked against the current Postgres and Supabase docs (2026-08-21). Three claims
in the first draft were wrong and are corrected above: the `initPlan` reasoning was **inverted**
(§12.1), the ltree hyphen restriction was **outdated** (relaxed in PG 16), and the `search_path = ''`
idiom **breaks `ltree` on Supabase**. A fourth was a gap rather than an error: the `client` role has
no read path under the ancestry predicate (§12.2).

---

## 13. The auth module, as built (2026-08-21)

`src/auth.js` exists. It is inert until `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are supplied
at build time (`.env.example`), so this commit changes nothing Elie can observe. No login screen yet
— that is the next piece, and it sits **beside** `DEMO`, never replacing it.

### What it is

~250 lines of `fetch` over four GoTrue endpoints. **Not `@supabase/supabase-js`**, for three
reasons that are all specific to this app:

- The bundle is inlined into ONE `index.html` by `vite-plugin-singlefile`; every dependency byte
  lands in the file Elie downloads over Beirut internet.
- supabase-js runs its own refresh timer and its own session writer. Both misbehave in exactly the
  situation that matters here — offline — and a background refresh that fails on a dead network must
  never be able to clear the session.
- We already speak this protocol: `scripts/sanity/sanity-rls-matrix.mjs` drives the same endpoints
  with the same shapes.

Exports: `signIn`, `signOut`, `refreshSession`, `getAccessToken`, `changePassword`, `fetchProfile`,
`getSession` / `getUserId` / `getUserEmail`, `isSignedIn` / `isSessionExpired`, `onAuthChange`,
`isAuthConfigured`, and the `AUTH_*` error codes. **There is no `signUp`, and there must never be
one** (§11.1: accounts are provisioned in the console).

### The four properties it is built to hold

1. **The gate is identity, never token validity.** `isSignedIn()` is true for an expired session.
   Expired ⇒ a banner, never a login wall — the gym-basement case and Apple 4.2.
2. **A 401 does not look like a network blip.** Typed errors: `AUTH_OFFLINE` keeps the session and
   retries later, `AUTH_EXPIRED` keeps the session and routes to re-entry. Never collapsed into one
   "sync failed" (the Jun-30 incident).
3. **Signing out clears the session and nothing else.** The blob stays at its namespaced key.
4. **No OAuth, no magic links, no OTP** — a static assertion in `sanity-auth.mjs` enforces it, so
   Guideline 4.8 stays dormant in two years' time as well as today.

### Storage, in `utils.js`

`storageKey()` → `ptapp-data:<userId>` when signed in, the bare `ptapp-data` when not.
**There is no fallback from the namespaced key to the bare one** — a new identity opens an empty
app rather than inheriting whatever the phone was holding.

- `saveData` **refuses to write when identity changed since `loadData` ran**. That window is the
  cross-tenant landmine arriving by the back door: sign out, sign in as someone else, make one edit,
  and the first user's dataset lands in the second user's store and then their tenant. Self-healing
  — `loadData()` restamps the key, and App must call it on every identity change (`onAuthChange`).
- `claimLegacyStore(expectedUserId)` is the one-time cutover (§5 step 3). **The owner id is a
  required argument**: "is my namespace empty" would let *any* first-time signer-in on that device
  claim Elie's clients. It **moves** rather than copies — the blob is parked at
  `ptapp-data-preauth-backup`, a key nothing loads from, because a live unauthenticated copy of
  Elie's records is otherwise one sign-out away from being on screen.
- `anyLocalDataExists()` backs the `DEMO` gate. `loadData()` sees one namespace; `DEMO` is a global
  switch, so a phone holding real records under *any* key must refuse it.

### What review caught, and it is worth remembering

Three of these were real defects in the first draft, none had a symptom, and all three were found by
reading rather than by running:

- `ErrorBoundary.jsx` still held two hardcoded `'ptapp-data'` references. The crash screen would have
  handed the user someone else's blob and "reset" a store nobody was using. It cannot import
  `utils.js` by design, so the resolution is inlined there — and `sanity-auth.mjs` now sweeps **all
  of `src/`** with a two-file allowlist, which is what would have caught it.
- `refreshSession` captured the session *before* its `await` and wrote it back *after*. Sign out
  mid-flight and the rejection **resurrected** the signed-out session, storage key and all; two
  concurrent refreshes against GoTrue's **rotating** refresh tokens and the loser's 400 overwrote
  the good session with a stale one marked expired — a healthy network, and the user stranded on the
  expired banner. Fixed with a single-flight promise plus re-reading the session inside the catch and
  only acting if the rejected refresh token is still the stored one.
- `claimLegacyStore` originally took no argument. See above.

And two from the mobile pass, both on the crash screen and the review credential:

- `anyLocalDataExists()` enumerated localStorage with only the `JSON.parse` guarded. `.length`,
  `.key()` and `.getItem()` all **throw `SecurityError`** on iOS Safari with "Block All Cookies", and
  it runs inside an async click handler where React's error boundary cannot catch it — the `DEMO`
  button would have been a silent dead tap for a store reviewer. The whole loop is guarded now.
- `ErrorBoundary` resolved one key. A corrupt `spotset-auth` is a plausible *cause* of the crash it
  is rendering, so it would have fallen back to a key that no longer exists post-cutover: "Download
  backup" hands over a 2-byte `{}` that looks like a success, and "Reset" removes nothing and reloads
  into the same crash. It now backs up the largest `ptapp-data*` blob and resets **all** of them —
  which is what its own confirm text always promised.

### Gate

`node scripts/sanity/sanity-auth.mjs` — static + behavioural, no network, no credentials, always
runs. 46 assertions across: the source-level bans, the namespaced key, two identities on one device,
the cutover claim and its refusals, the identity-not-validity gate, offline-vs-rejected, sign-out
preserving data, and the two refresh races. Exit 0 or do not deploy.


---

## 14. The entry screen, as built (2026-08-21)

`TokenSetup.jsx` now offers **two ways in, side by side** — sign-in does not replace `DEMO`.

Top to bottom: email, password, **Sign in** · an `or` divider · the existing token/`DEMO` field and
**Connect** · the hint line *"Type DEMO to try the app, or sign in with your email and password."*

- **The sign-in half renders only when `isAuthConfigured()`** — i.e. when the build carries
  `VITE_SUPABASE_*`. An unconfigured build is byte-identical to v2.15.1, which is why this can sit on
  master without shipping anything.
- **Offline and wrong-password read differently on the screen**, not just in the module. Telling a
  coach in a basement that their password is wrong is how you get a password reset nobody needed.
- **Signing in reloads** rather than calling `onConnected()`. The store is read once at mount and
  signing in changes *which* store is truth, so a fresh boot is the only thing that cannot leave the
  previous identity's state in the reducer. Same reasoning as the `DEMO` seed.
- **The hint dies with `DEMO`**, in the same commit, at Phase 4.

### The gate

`App.jsx`: `useState(!!getToken() || isSignedIn())`. **Identity or local data — never token
validity.** `isSignedIn()` is deliberately true for an expired session, so an expired user gets in
and sees `.auth-banner` (amber, under the header, full-width, 44px, tapping opens General). Nothing
is broken and no data is at risk when it shows; only syncing is paused.

`onAuthChange` reloads the app whenever the user id changes — which is the wiring `saveData`'s
cross-identity refusal exists to catch. General gains **Sign out** (confirm text says the data stays
on the device, because "sign out" reads as "erase" to someone whose business is in the app) and a
*Signed in as …* line.

### Verified live, in a browser, against the real project

Not inferred from the code — driven in Chrome at 430px against `trflnwrusbbbihelovkh`:

1. The screen renders with both halves and the hint.
2. A wrong password returns a real 400 from GoTrue and shows **"Wrong email or password"**.
3. A real provisioned account signs in, the session persists, and the app **boots past the gate**
   into an empty Dashboard.
4. The storage key is `ptapp-data:<userId>` — read back from the live `localStorage`.
5. Backdating `expires_at` leaves the user **signed in with the amber banner showing**, app fully
   usable. That is the Airplane-Mode / gym-basement property, observed rather than asserted.
6. General shows *Signed in as …* and the **Sign out** button.

The throwaway account was deleted afterwards; `auth.users` is back to **0 rows**.

### Still not wired

**Nothing reads or writes `tenants` yet.** A signed-in user gets an empty local app with no sync —
that is Phase 2 (dual-write) and Phase 3 (cutover), deliberately not built here. Elie's path today is
unchanged: paste the PAT, sync to GitHub.

---

## 15. Phase 1 — the mirror is running (2026-08-21)

Three scripts, none of them app code, none of them deployed. GitHub is still authoritative and
nothing in this section writes to it.

| Script | Does |
|---|---|
| `scripts/snapshot-live.mjs <desc>` | Archives live `data.json` to `_archive/PTApp/data-snapshots/` and **asserts the byte count against the API's reported size**, refuses to overwrite an existing snapshot, and parses before writing. A truncated download is silent — valid-looking JSON up to the cut, worthless as a rollback. |
| `scripts/mirror-to-supabase.mjs --email <coach>` | Reads `data.json`, finds-or-provisions the coach (`auth.users` + `app_users`, role `pt`, no parent ⇒ prime), inserts-or-updates their `tenants` row, then **reads the blob back out of Postgres and asserts equality**. Idempotent: built to be re-run daily for a week without creating a second anything. |
| `scripts/sanity/sanity-live-supabase-diff.mjs` | The **Phase-2 soak gate**. Compares the two stores daily. Exit 0 agree · 1 diverge · 2 not configured (**not a pass**). On divergence it names the collection and the record ids, because "two 173 KB strings differ" is not actionable on day 5. |
| `scripts/lib/normalize.mjs` | The ONE deterministic serializer both sides go through. |

### The first run, and the state it left

- Snapshot: `_archive/PTApp/data-snapshots/2026-08-21-pre-supabase-mirror.json`,
  **173,567 bytes on disk == 173,567 reported by the API** · `_dataVersion` 6 · 21 clients ·
  514 sessions · 1 program.
- Mirror target: `pierreghorra@gmail.com` — **Pierre's own address, and no password is set**, so
  the account cannot be signed into. The mirror target must not become a live login by accident, and
  Phase 3 is where a real sign-in is rehearsed with Elie. Re-pointing the tenant at Elie's account
  later is safe: `0002` restamps `owner_path` in the same transaction as a `coach_id` change.
- One tenant, holding a verified copy. The gate is green: `_dataVersion` 6, and
  21/514/2/1/15/91 across clients, sessions, evaluations, programs, todos, auditLog.

### 🔴 The gate was wrong on the first run, and it reported green

`norm()` was `JSON.stringify(o, Object.keys(o).sort())` — which reads as "stringify with sorted
keys" and is not. **An array in the second argument is a replacer ALLOWLIST applied at every
depth**, so it kept the six top-level key names and discarded every nested field. It compared a
173 KB blob against a **2,092-character skeleton** and printed *"byte-identical"*.

The lesson is not "be careful with `JSON.stringify`". It is that **a gate nobody has seen fail is
not evidence**, because its output gets quoted as though it were. Two things came out of it:

1. `assertRealSize()` — the normalised form must be ≥100 KB or the run stops and says *the
   normaliser is broken, not the data*. Those are different emergencies.
2. **The gate was deliberately made to fail before it was trusted.** One session was dropped from
   the Postgres copy; the gate went red, named `sessions: only in GitHub → nq70to9`, and exited 1.
   The mirror then restored it and the gate went green again.

`tenant_snapshots` recorded exactly what it should through that: **two rows, not five.** The trigger
files the previous bytes only when `data` actually changed, so the two identical re-runs cost
nothing, the corruption filed the last good copy (190,348 bytes) and the restore filed the corrupt
one (190,140). Every mirror run leaves a recoverable trail without paying 190 KB for a no-op.

One Windows detail worth keeping: `process.exit(1)` inside these scripts trips a libuv assertion
while a `fetch` socket is closing and the shell sees **127**, not 1. They set `process.exitCode`
and let the loop drain instead — a gate whose failure code is unreliable is a gate the suite loop
can misreport.

### What Phase 2 still needs

The driver split in `src/` (`githubDriver` / `supabaseDriver` behind one build flag), so the app
itself dual-writes rather than a laptop script doing it once a day. Then seven consecutive clean
days of the gate above. **Any unexplained divergence halts the plan** — it is never worked around.

### 🔴 CORRECTION, 2026-08-22 — the soak clock had not actually started

`sanity-live-supabase-diff` had failed on **every one of its 34 runs across two days: 0 clean days
out of 7.** Nothing was broken and no record was ever lost. The gate was being asked a question
**Phase 1 cannot answer** — `mirror-to-supabase.mjs` is a MANUAL laptop script, the app does not
dual-write yet, and GitHub moves whenever anyone touches the phone. So Postgres is stale within
minutes of any edit and the gate correctly reports a difference that means only *"the mirror has not
run since the last edit"*.

The last failure, diffed field by field, was exactly that: one session (`sessions:5tghmqu`), two
fields — `_modified`, and a `focus: []` that review finding **P3** writes into live records. Every
collection count matched on both sides.

**So the Phase-1 daily job is `node scripts/soak-day.mjs` — mirror, THEN verify, as one operation.**
The mirror's own byte-identical read-back is the only honest Phase-1 claim, because a soak proves
that two *independent writers* agree and in Phase 1 there is only one writer. The gate above is
**unchanged and stays exactly as strict**; it becomes the real soak the day the driver split lands,
and it is still what must be green before cutover. First clean day under the corrected routine:
2026-08-22.


---

## 16. What the data-integrity review changed (2026-08-21)

Six real defects in the Phase-1 scripts, none of which had a symptom. Worth reading as a set,
because four of them are the same shape: **a check that could not fail.**

- 🔴 **`assertRealSize` ignored its own argument.** It compared against a hardcoded 100 KB floor,
  which only catches TOTAL collapse. A normaliser bug that dropped every nested `packages[]` and
  `blocks[]` would leave ~120 KB, clear the floor, and print "byte-identical" — and it would clear
  the equality check too, because a normaliser defect collapses **both sides identically**, and
  `counts()` reads the raw objects rather than the normalised string. Now proportional: the
  normalised form must be ≥90% of the source, which scales and does not falsely trip on a smaller
  second coach.
- 🔴 **Length was treated as content.** The metadata and the body are two separate API calls, and
  the PT's phone can push between them — a status flip or one changed digit gives a **same-length**
  revision. The archive would then hold revision B under revision A's logged sha. Both scripts now
  compute the **git blob sha1** of the body and compare it to the API's, which also separates *"it
  moved under me, re-run"* from *"it was truncated, stop"*.
- 🔴 **Read skew was being reported as divergence.** The gate reads GitHub, then Postgres. A push in
  that window is a real content difference — and escalating it to *"STOP THE LINE, do not re-run"*
  would fire on a benign race, repeatedly, on Lebanese internet with a live phone. Two failures
  follow: the rule forbids the one action that settles it, and an operator who learns the gate cries
  wolf starts explaining real divergences as timing. The gate now re-reads the sha afterwards and
  exits **2 — did not run**, never 1.
- **The coach lookup was page-one-only and case-sensitive.** GoTrue pages at 50 and lowercases
  emails, so `--email Elie@Example.com` would miss yesterday's row, fall through to create, and
  hard-fail on the 422 — breaking the "re-run daily for a week" contract on about day 3.
- **The PATCH never checked it hit a row.** PostgREST answers `200 []` when the filter matches
  nothing, and the script logged success regardless. It was caught downstream by a crash, not by a
  gate, after the log line had already claimed the write happened.
- **`data._dataVersion ?? 6`** invented a schema version for a blob that had none. It refuses now.

Also derived: `COLLECTIONS` is no longer a hardcoded key list but the union of array keys on both
blobs — the `mergeData` key-list trap in CLAUDE.md wearing a different hat. A collection added in
v2.16 would otherwise have been invisible to the count check and the per-record diagnostic on the
day it shipped.

### ✅ `0003` — snapshots outlive the tenant they document (APPLIED AND VERIFIED LIVE, 2026-08-21)

`0002` gave `tenant_snapshots` **`on delete cascade`**. That table exists for exactly one reason,
written in its own header: after Apr 13 and Apr 19, *"by the time anyone noticed, the old bytes were
gone."* With a cascade, one `delete from tenants where …` in the SQL console — **the normal
administrative route, because §11.1 deliberately gives us no in-app admin** — destroys the entire
undo history in the same statement. No error, irreversible, and it is precisely the moment you would
want that history.

`restrict` would only make the tenant undeletable and push people to delete the snapshots first —
the same loss by a longer route. `on delete set null` is the answer: the tenant goes, the history
stays, orphaned but intact and still RLS-readable through its own denormalized `owner_path`. `0003`
also files a final `reason='delete'` snapshot on the way out, and records
`tenant_version` / `tenant_data_version` so a restore knows which generation it is putting back.

**Applied by Pierre in the SQL editor on 2026-08-21** — it could not be applied from the terminal
(no `psql`, no Supabase CLI, no database password or management token on that machine), same as
`0001` and `0002`.

**`sanity-rls-matrix.mjs` asserts the behaviour against the LIVE DATABASE**, not against the file:
it writes a tenant, confirms a snapshot exists, deletes the tenant, and requires the snapshot to
survive with `tenant_id` null. It failed before the migration (`0/1 kept`) and passes after
(`1/1 kept`) — which is the only reason the pass means anything. `create table if not exists` skips
silently, so a migration sitting unapplied in the repo looks exactly like one that ran; asserting
the database is the only way to tell the difference.

Full matrix, live, after: **all assertions passed, exit 0.**


---

## 17. The soak is a routine, not a habit (2026-08-21)

Pierre's question, and it is the right one: *who runs the daily check?* If the answer is "whoever is
in the terminal", the answer is nobody — he clears context several times a day, and
**"seven consecutive clean days" is a claim about history that a transcript cannot support.**

The general pattern, worth reusing for anything that has to be true over time:

1. **The check writes its own evidence to a file, on every run, pass or fail.**
   `sanity-live-supabase-diff.mjs` appends one JSON line to
   `C:/projects/_archive/PTApp/soak-log.jsonl` — outside the repo, because `pih-dev/PTApp` is public
   and the counts are the PT's business data. A log containing only successes cannot show a broken
   streak, which is the one thing it exists to show.
2. **A separate reader answers the question in one command.** `node scripts/soak-status.mjs` prints
   the last ten days, the consecutive-clean count, and whether today is covered. A day counts as
   clean only if **every** run that day was clean — re-running until it passes is forbidden by the
   gate's own header — and "consecutive" means consecutive **calendar** days, because a day the
   check did not run is not a day of exposure to real traffic.
3. **A scheduler runs it, not a person.** Windows scheduled task **`SpotSet soak gate`**, hourly,
   `scripts/soak-daily.cmd`. Remove with `schtasks /Delete /TN "SpotSet soak gate" /F`.
4. **The handoff points at the reader, never at a remembered number.**

### 🔴 The first version of that task was wrong, and would have gone red every morning

It ran the gate **without** running the mirror. In Phase 2 the mirror runs from Pierre's laptop off
the commit stream, so the gate is only meaningful once the mirror has caught up — gating alone goes
red the moment Elie edits anything, which is **the PT working correctly, not a divergence.** A gate
that red-flags normal use is a gate that gets ignored inside a week.

`soak-daily.cmd` now mirrors first, then gates. `mirror-to-supabase.mjs --if-changed` makes the
mirror a cheap no-op when the blob has not moved, which is what makes hourly affordable: without it
every run would bump `version` (the BEFORE UPDATE trigger bumps on every update, data change or
not) and destroy the loose "how many real writes" meaning of that column.

## 18. Phase 2 is NOT app dual-write. The two documents disagree; this one wins.

The appendix's Phase 2 (Design C's version) has the **app** write to Supabase after every GitHub
push, "with an anon session belonging to a service account Pierre owns". **§4 of this document
explicitly cut that**, in the same paragraph that cut the embedded mirror credential:

> Both C's Phase-2 mirror credential and any embedded service login are cut — the mirror runs from
> your laptop / CI. This is the standing TRAPS rule: *never hand out a credential that reaches live
> data.*

`pih-dev/PTApp` is a **public repository** and the bundle is a single `index.html`. Any credential
that can write Elie's tenant, shipped in that file, is the `DEMO`-token problem again with a
database behind it. RLS does not save you: a credential scoped to Elie's tenant is *correctly*
authorised to overwrite Elie's tenant.

**So Phase 2, as decided, is:**

| | |
|---|---|
| **The mirror leg** | Runs from Pierre's laptop off the commit stream — the hourly task above. Already live. |
| **The driver split** | `sync.js` → `githubDriver` + `supabaseDriver` behind one build flag, `BACKEND_MODE='github-primary'`. The Supabase driver is **written and DORMANT**: it has no credential to use until a real user session exists, which is Phase 3. Writing it now is what makes Phase 3 a flag flip rather than a rewrite. |
| **The soak** | Seven consecutive clean days of the hourly gate, measured by `soak-status.mjs`, not by memory. |

The appendix already carries a DO-NOT-IMPLEMENT banner for its schema; this is the second place it
would have led a future session to build the wrong thing, and the reason that banner is worth its
bytes.


---

## 19. The driver split (2026-08-21)

```
src/sync.js                     3 lines: export * from './backend/index.js'
src/backend/index.js            the facade — BACKEND_MODE, activeDriver()
src/backend/githubDriver.js     the old sync.js, MOVED
src/backend/supabaseDriver.js   written, DORMANT until Phase 3
```

**Zero call sites changed.** `App.jsx`, `General.jsx`, `TokenSetup.jsx` and `TokenUpdateModal.jsx`
still `import … from '../sync'`. That was a requirement, not a convenience: `sync.js` is the one file
here that has already lost the PT's data twice, and touching the sync path and its call sites in the
same commit is two variables in one release.

**`githubDriver.js` was moved, not rewritten** — `git mv`, then a header, the `../utils.js` path, and
one new export. `sanity-backend-split.mjs` proves it by diffing the file against the **pinned blob
sha** of the pre-split `sync.js` (`031da2b`), comments and the import path normalised away. Pinned to
the blob rather than to `HEAD:src/sync.js`, because from the next commit that ref is the three-line
shim and the comparison would quietly start passing against nothing.

**The Supabase driver has no credential and never will.** Every request carries the *signed-in
user's* access token from `auth.js`; `isAvailable()` is false with nobody signed in, so the facade
never routes to it. §18 is why. It is written now so Phase 3 is a flag flip against reviewed code
rather than a rewrite performed on the day the storage layer moves under live records.

**The contract maps one-for-one.** `update … where version = $v` returning zero rows *is* the 409:
re-read, `mergeData` per record by `_modified`, retry ×3, then surface. `DATA_VERSION` stays 6 and no
`migrateData` runs during the cutover.

🔴 **Both drivers cache a concurrency token and both now expose a reset** — GitHub a `sha`, Supabase a
`version`. §4 called this out and it is the subtle one: a stale token at the moment of a driver flip
or an identity change is a **blind overwrite**, a write claiming to replace a revision the store has
already moved past. `App.jsx` clears both before reloading on an identity change, and the gate
asserts that call still exists.

**Rollback is one constant.** Flip `BACKEND_MODE`, rebuild, redeploy gh-pages: under 15 minutes, no
data reconstruction — but only while *both* legs keep running, which is what the hourly mirror and
the soak gate are for.


---

## 20. The blind overwrite the split nearly shipped (2026-08-21)

The Supabase driver's **cold-cache** path fetched the remote row only to harvest `currentVersion`,
**discarded the `data` it had just read**, and PATCHed local straight over it. That PATCH *succeeds* —
the version matches, we read it a millisecond ago — so everything the remote held and local lacked
was destroyed with no conflict, no merge, no error. **That is the Apr-13 stale-device loss with a new
cause**, in the file written specifically to avoid repeating it.

The GitHub driver cannot make this mistake, and the asymmetry is the lesson: with no cached `sha` it
**omits** it, GitHub answers 409, and the retry path refetches and merges. Safety there is
*structural* — "I have no concurrency token" is a **rejected** state. The Supabase driver had turned
the same state into an **authorised** one, which is exactly backwards.

Reachable, not theoretical: `activeDriver()` resolves at call time, so signing in mid-session under
`supabase-primary` routes the next debounced push to a driver whose cache is empty while `syncReady`
is already true from the GitHub fetch. App.jsx's reload narrows that window; **a timing mitigation is
not an invariant.**

Fixed by merging what was just read. Three smaller things went with it:

- **The create branch had no conflict handling.** `tenants.coach_id` is unique, so losing a race with
  the laptop mirror raised a bare `Sync failed (409)` — the retry contract stopping at the create
  boundary. It now re-enters the same refetch-and-merge loop.
- **An empty insert representation** would have left `currentVersion` null *after* the row was
  written, feeding the cold-cache path on the very next push. It throws instead.
- **A driver flip reset nothing.** `resetConcurrencyTokens()` claimed "any driver or identity
  change", but only the identity half had a caller — `activeDriver()` changing its answer fired
  nothing. The reset now happens inside `activeDriver()` on the flip itself.

### 🔴 The gate asserted the wrong invariant, and that is the durable lesson

`sanity-backend-split.mjs` asserted *"merges on a concurrency miss"* — true, and useless. **The miss
path was always the safe one.** The dangerous path is the one that never misses. When you write a
test for a merge, test the branch where **nothing forces you to merge**; the branch where the store
pushes back was never going to be where the data goes.

### Left for Phase 3, deliberately

`App.jsx` still gates every sync path on `getToken()` — the GitHub PAT. Under `supabase-primary` a
signed-in coach with no PAT would take the early `return` and never sync at all. `BACKEND_MODE` is
therefore the switch for **rollback** (supabase→github), not yet for **cutover**. Phase 3 must widen
that gate to identity-or-token, and it is the first thing to do in that phase.
