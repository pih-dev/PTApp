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
| Owner sees coaches' clients | Zero coaches today. ⚠️ Not free later — every screen takes one `state` object, so a cross-coach Dashboard is a real refactor, not "one RLS clause." Budget it when it arrives. |
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
