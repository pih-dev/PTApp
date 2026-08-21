# SpotSet — Multi-User Build (Task A) HANDOFF

**Last updated:** 2026-08-21 ~19:50, Beirut.
**To resume:** Pierre types `continue` or `multi-user`. **Read §0 back to him and stop.**
Do not investigate, do not re-derive, do not ask follow-up questions.

🔴 **STANDING INSTRUCTION FOR WHOEVER WORKS THIS SUBJECT: keep this file current AS YOU GO, not at
session end.** Pierre's rule, and he should never have to ask for it: update §0 and commit at each
milestone, on the assumption that a Windows restart, a crash or an interruption could end the
session at any moment. A handoff written at the end is a handoff that does not exist when it is
actually needed. `/wrap` is the safety net, never the trigger. Every fact below was written the
moment it became true, and the working tree was clean and pushed at every point.

> 📌 Two other threads exist and are NOT this one: `HANDOFF.md` (the queued-tasks overview,
> which points here) and `HANDOFF-spotset-publishing.md` (Play Store). Design differentiation
> (Task B) has not started.

---

## 0. Status — read this out

- 🔴 **THE SUPABASE PROJECT EXISTS AND `0001` IS APPLIED AND VERIFIED LIVE.**
  Org **Calnorm** (free) → project **spotset**, ref `trflnwrusbbbihelovkh`, **eu-central-1
  (Frankfurt)**, PostgreSQL **17.6**. Account: **pierreghorra@gmail.com** — the same Google account
  as Play/Illume. Dashboard: `supabase.com/dashboard/project/trflnwrusbbbihelovkh`.
- **Isolation is PROVEN on the live database, not just designed.** `supabase/tests/rls_matrix.sql`
  built a synthetic tree, impersonated six users and rolled back: **6 of 6 PASS**, including a peer
  prime seeing nothing of the other tree and a signed-in user with no `app_users` row seeing nothing
  at all. Probed after: `app_users` 0 rows, `auth.users` 0 rows — the test left nothing behind.
- **Verified live, not read off the file:** RLS enabled AND forced, exactly one policy
  (`app_users_read_subtree`, SELECT only), 4 triggers, 7 constraints, `ltree` in the `extensions`
  schema, `authenticated` has USAGE on `private`, `anon` has neither USAGE nor SELECT.
- **Project settings chosen at creation:** *Automatically expose new tables* **OFF** and *Enable
  automatic RLS* **ON**. 🔴 The first means `0002` must carry its own explicit
  `grant select … to authenticated` for every table it creates — auto-expose will not supply it, and
  the failure mode is a silent 403 on a correct policy.
- **Nothing in `src/` touches any of this.** The app is exactly as it was; this is additive.
- **Two files are the work so far:** `supabase/migrations/0001_app_users.sql` (+ its `_down`) and
  `scripts/sanity/sanity-rls-matrix.mjs`.
- ✅ **`0002` (tenants + tenant_snapshots) IS APPLIED AND GREEN TOO.** One blob per coach in
  `tenants.data`, `DATA_VERSION` still 6, no `migrateData` anywhere. Writes are own-tenant-only; a
  parent PT can read a descendant's blob but not write it (§12.4 starts closed). Every write files
  the previous bytes to `tenant_snapshots` first. 🔴 Snapshot **retention is not built** — needed
  before this carries months of traffic.
- **The assertion that matters most passes:** re-parent a sub-PT and their **blob follows in the
  same transaction** — the old parent loses read access, the new one gains it, and the sub-PT's own
  client moves too. Had `owner_path` not been restamped, the old parent would have kept reading the
  data silently.
- ✅ **THE RLS MATRIX IS GREEN — `node scripts/sanity/sanity-rls-matrix.mjs` exits 0.** Static +
  live, against the real project over real HTTP: 6 visibility cases and 8 refusals, including peer
  isolation, a failed self-promotion (403, row confirmed unchanged in the table afterwards) and the
  anon key getting 401. Credentials come from
  `C:/projects/_archive/PTApp/supabase-spotset.env` — outside the repo, never in git.
- **Two defects the first live run exposed, both now fixed:** `service_role` had no table
  privileges (BYPASSRLS exempts a role from *policies*, not from ordinary table grants — and
  auto-expose is off, so every grant is ours to write); and teardown deleted users in creation
  order, hit `on delete restrict`, swallowed the error and **left three synthetic users behind in a
  run it reported as passing**. Teardown is now leaf-first and verifies the table is empty.
- **Superseded — ignore the line below if it still reads as outstanding:** `node scripts/sanity/sanity-rls-matrix.mjs` still exits **2**
  (static passes, live skipped) because it needs `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` in the environment, and those are Pierre's to supply — they must never
  be written into this repo, which is public. 🔴 **Exit 2 is not a pass.** The SQL test proves the
  *policy*; only the .mjs one proves the *API surface* (a wrongly exposed table, a grant to `anon`,
  a refused PATCH) — `set role authenticated` bypasses PostgREST entirely.
- 🔴 **DECIDED (Pierre, 2026-08-21 ~16:40) — the login screen sits BESIDE `DEMO`, it does not
  replace it.** A tester who already typed `DEMO` keeps working exactly as they do now; signing in
  is an *option* on the same screen, and exercising it is itself part of the closed test. `DEMO`
  survives through Phase 4 regardless (store reviewers, and it is the only path that works in
  Airplane Mode — the documented 4.2 white-screen trap).
- **How a tester signs in, answered:** with their **email address and a password** — including a
  Gmail address. **NOT "Sign in with Google."** There is no self-signup: Pierre provisions the
  account from the Supabase console (§11.1) and hands over the password; the user can change it
  in-app afterwards. 🔴 This is not a shortcut — adding Google sign-in *forces* Sign in with Apple
  (Guideline 4.8). Own email/password keeps 4.8 dormant permanently, which is why §4 says
  **no social login, ever.**
- **What DEMO mode actually is, verified in the code this session (`sync.js:15`, four gates in
  `App.jsx`, `General.jsx:218/244/291`):** it is the **real app on local seed data with every sync
  path switched off.** So — a tester **can** add, edit and delete freely, it all persists on their
  own phone, and **no other tester ever sees any of it.** Nothing leaves the device. They cannot see
  each other, and they cannot reach Elie's live records. That is the whole point of the credential.
- 🔴 **DECIDED — the login screen carries a one-line hint:** *"Type `DEMO` to try the app, or sign in
  with your email and password."* Pierre wondered whether it is worth it for a testing-only phase.
  **It is:** without it a tester facing a login form has no way to know `DEMO` exists, and you are
  relying on them remembering a WhatsApp message. It is one i18n string, and it is deleted in the
  **same commit** that removes `DEMO` at Phase 4 — so it cannot rot into a stale instruction.
- ✅ **THE AUTH MODULE IS BUILT AND GREEN — `src/auth.js`, plus the namespaced storage key.**
  `node scripts/sanity/sanity-auth.mjs` exits 0: 49 assertions, static + behavioural, no network and
  no credentials, so it always runs. Full record: `docs/2026-08-21-multi-user-accounts-decision.md` §13.
- **It is INERT.** Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build time
  (`.env.example`) `isAuthConfigured()` is false and every identity path stays dark — the app behaves
  exactly as it does today. **Nothing was deployed to gh-pages**: shipping this without the login
  screen buys nothing and puts an untested identity path on Elie's live phone. Master only.
- **~250 lines of `fetch` over four GoTrue endpoints — deliberately NOT `@supabase/supabase-js`**
  (single-file bundle; and supabase-js's own refresh timer + session writer misbehave offline, which
  is the one case that matters). No `signUp`, no OAuth, no magic links — asserted statically, so
  Guideline 4.8 stays dormant.
- 🔴 **`STORAGE_KEY` is now `ptapp-data:<userId>` when signed in, with NO fallback to the bare key.**
  `saveData` refuses to write when identity changed since `loadData` ran. `claimLegacyStore` takes a
  **required owner id** and MOVES the blob to `ptapp-data-preauth-backup`.
- **Two reviewers found five real defects in the first draft, all of them silent, none found by
  running the code** — the refresh-token races (sign-out mid-flight resurrecting a session; rotation
  losers overwriting a good session with an expired one), `ErrorBoundary` still holding two hardcoded
  `'ptapp-data'` strings, `claimLegacyStore` claimable by any first-time signer-in, and
  `anyLocalDataExists` throwing `SecurityError` on iOS with cookies blocked (a dead `DEMO` button for
  a store reviewer). **All five fixed, each with an assertion.** Detail: §13 and `docs/traps.md`.
- ✅ **THE LOGIN SCREEN IS BUILT, AND IT WAS VERIFIED IN A BROWSER AGAINST THE REAL PROJECT** —
  not inferred from the code. At 430px against `trflnwrusbbbihelovkh`: both halves render with the
  hint; a wrong password returns a real 400 and reads *"Wrong email or password"*; a provisioned
  account signs in and **boots past the gate**; the key is `ptapp-data:<userId>`, read back from the
  live `localStorage`; backdating `expires_at` leaves the user **signed in with the amber banner**,
  app fully usable. The throwaway account was deleted — `auth.users` is back to **0 rows**.
  Record: §14 of the decision doc.
- **Sign-in sits BESIDE `DEMO`, as decided** — email, password, Sign in · `or` · the token/`DEMO`
  field · the hint line. The sign-in half renders **only when the build carries `VITE_SUPABASE_*`**,
  so an unconfigured build is byte-identical to v2.15.1. The gate is
  `!!getToken() || isSignedIn()` — identity or local data, never token validity — and `onAuthChange`
  reloads on identity change. General gains Sign out + *Signed in as …*.
- 🔴 **NOTHING READS OR WRITES `tenants` YET.** A signed-in user gets an empty local app with no
  sync; that is Phase 2 (dual-write) and Phase 3 (cutover), deliberately not built. **Elie's path is
  unchanged** — paste the PAT, sync to GitHub.
- ✅ **PHASE 1 IS DONE — THE MIRROR IS RUNNING AND THE SOAK GATE IS GREEN.** Live `data.json`
  archived and byte-verified (`2026-08-21-pre-supabase-mirror.json`, **173,567 == 173,567**, 21
  clients / 514 sessions / 1 program), copied into `tenants`, and read back. Four new files, none of
  them app code, nothing deployed: `scripts/snapshot-live.mjs`, `scripts/mirror-to-supabase.mjs`,
  `scripts/lib/normalize.mjs`, `scripts/sanity/sanity-live-supabase-diff.mjs`. Record: §15.
- **Mirror target is `pierreghorra@gmail.com` — Pierre's own address, with NO PASSWORD SET**, so it
  cannot be signed into. Re-pointing the tenant at Elie's real account later is safe: `0002`
  restamps `owner_path` in the same transaction as a `coach_id` change.
- 🔴 **THE GATE WAS WRONG ON ITS FIRST RUN AND REPORTED GREEN.** `JSON.stringify(o, keys)` is a
  replacer ALLOWLIST at every depth, not a key sort — it compared a 173 KB blob against a
  2,092-char skeleton and said "byte-identical". Fixed, and then **the gate was deliberately made to
  fail before being trusted**: one session dropped from the Postgres copy, gate red, named
  `sessions: only in GitHub → nq70to9`, exit 1; restored, green again. `tenant_snapshots` filed 2
  rows, not 5 — the trigger only copies when `data` actually changed.
- 🔴 **ONE THING NEEDS PIERRE'S HANDS: apply `supabase/migrations/0003_snapshots_outlive_tenants.sql`
  in the Supabase SQL editor.** `0002` gave `tenant_snapshots` **`on delete cascade`**, so a single
  `delete from tenants` in the console — the normal admin route, since §11.1 gives no in-app admin —
  would destroy the entire undo history in the same statement, silently. `0003` switches the FK to
  `on delete set null` and files a final snapshot on the way out. It cannot be applied from the
  terminal (no psql, no Supabase CLI, no DB password or management token here), same as 0001/0002.
  **`sanity-rls-matrix.mjs` FAILS until it is applied** — by design, and it asserts the live
  database, not the file, because `create table if not exists` skips silently.
- **A data-integrity review found six more silent defects in the Phase-1 scripts, all fixed** — four
  of them the same shape, *a check that could not fail*: `assertRealSize` ignored its own argument
  (a fixed 100 KB floor passes a normaliser that drops every nested `packages[]`); length was
  treated as content (a same-length revision pushed mid-read would be archived under the wrong sha —
  both scripts now compare the **git blob sha1**); read skew was reported as divergence (now exit 2,
  *did not run*, so a benign mid-soak push cannot teach the operator to dismiss real ones); the
  coach lookup was page-one-only and case-sensitive; the PATCH never checked it hit a row; and
  `?? 6` invented a schema version. Detail: §16.
- **Next action: Phase 2 — the driver split in `src/`.** `sync.js` becomes `githubDriver` +
  `supabaseDriver` behind one build flag, GitHub still authoritative, the Supabase leg best-effort
  and non-blocking (a failing mirror must never turn Elie's dot red). Then **7 consecutive clean
  days** of `sanity-live-supabase-diff.mjs`, run daily. 🔴 **Any unexplained divergence halts the
  plan** — never worked around, never re-run until it passes.
- **Syria (2026-08-21, from Ali):** testers there needed a VPN for the Play link. Not fixable from
  the console — Syria's Google sanctions were lifted but Play is being restored IP-range by
  IP-range, and Syria is still absent from Play Console's country list. **Give them the PWA instead:
  `https://pih-dev.github.io/PTApp/`** — same app, no store, no VPN, Add to Home Screen.
- **The design is settled and should not be re-opened:** two roles (`pt`/`client`), prime = a `pt`
  with no parent, one `ltree` containment predicate covering own-data + downline + peer isolation,
  no admin role (service_role from the SQL console instead), and *"mine"* as the default scope on
  every screen with the downline as a deliberate drill-in. Record:
  `docs/2026-08-21-multi-user-accounts-decision.md` §10–§12.
- **Still open, and deliberately so:** whether a parent PT may *write* in a descendant's view
  (starting closed), INSERT/DELETE policies on tenant tables, and §8's questions 1–5 — money,
  timeline, client write access, no-social-login-ever, and Elie's sign-off.
- **Nothing is broken and nothing is urgent.** The Play closed test is unaffected — it counts
  testers, not builds.

---

## 1. What was built (2026-08-21, ~12:00–12:40)

### `supabase/migrations/0001_app_users.sql`

One table, `public.app_users`, plus the machinery that makes the hierarchy cheap to read.

| Piece | What it is for |
|---|---|
| `role` check `in ('pt','client')` | §10. Two roles, forever. A third is a schema change and a decision. |
| `parent_pt_id`, `on delete restrict` | Refuses to orphan a subtree. There is no admin UI to repair one. |
| `path extensions.ltree` + GiST index | Materialized ancestry. Turns "can this PT reach that row" into an indexable containment test rather than a per-row graph walk. |
| `app_users_stamp_path()` trigger | Stamps `path` on insert and on re-parent, validates the parent is a `pt`, blocks cycles, and restamps the whole subtree in the same transaction. |
| `private.my_path()` | **Takes no arguments, and that is the point** — a policy calling `(select private.my_path())` gets a real initPlan, once per statement. |
| `app_users_read_subtree` policy | The single predicate: `path <@ (select private.my_path())`. |
| No write policy at all | RLS cannot restrict columns, so any UPDATE policy also permits editing `role`/`parent_pt_id` — self-promotion to prime. Writes are service_role only (§11.1). |
| `0001_app_users_down.sql` | So a partial apply is not unpicked by hand in the console. |

### `scripts/sanity/sanity-rls-matrix.mjs`

- **Static pass** (no network): RLS enabled *and* forced, no grant to `anon`, no `ltree` function
  using `search_path=''`, no policy calling a `private.*` function with a row column, no write
  policy on `app_users`. **Passing.**
- **Live pass** (needs an instance): builds prime A → sub-pt B → client E, client C under A, peer
  prime D → client F, plus a signed-in user with no `app_users` row, and asserts what each can and
  cannot read. **The load-bearing assertions are the refusals.**

---

## 2. The four defects review caught before commit

Recorded because each is a mistake worth not making twice, and three of them fail *silently*.

1. **`authenticated` needs `usage` on schema `private`.** A policy expression runs with the
   **invoker's** privileges — `security definer` applies inside the body, not to calling it. Without
   the grant, every authenticated read fails with *"permission denied for schema private"* while the
   policy itself is perfectly correct. `execute` grants are inert without schema `usage`.
2. **The subtree restamp is itself subject to RLS** under `force row level security`, and there is no
   UPDATE policy — so it could match **zero rows and return success**, leaving every descendant on
   its old path (old parent still sees them, new parent never does). Now counts first and raises on
   a mismatch.
3. **A bare `create trigger` aborts a re-apply.** The rest of the file was idempotent; these were
   not. `drop … if exists` added.
4. **A `pt` with members could be demoted to `client`,** producing a client with children — which
   the containment model assumes cannot exist. Guarded by trigger.

Plus a `CHECK` that a path ends in its own id, so an unstamped or hand-edited path fails at write
time instead of leaking at read time.

---

## 2b. And three ways the TEST could have passed over a real hole

An adversarial review of the committed matrix found the weak part was the matrix, not the schema.
Worth keeping because all three produce a **green suite**:

1. **The static pass was pinned to `0001`.** `0002` (the tenant tables — the ones that will hold
   Elie's data) would have had zero RLS coverage while the suite printed all-green. Now globs.
2. **A policy with no `FOR` clause defaults to `FOR ALL`.** The write-policy check matched only an
   explicit `for update/insert/delete/all`, so a bare `using (true)` policy read as harmless — the
   exact policy that permits self-promotion to prime.
3. **The self-promotion assertion could not tell refused from succeeded.** A PostgREST `PATCH`
   without `Prefer: return=representation` returns **204 with an empty body**: `.ok` is true,
   `.json()` throws, the throw was swallowed as a "harness error", and **the anon-key assertion
   after it never ran.** Now reads the row back with `service_role` and trusts the table, not the
   HTTP response.

Two schema hardening changes from the same pass: `alter default privileges … revoke execute … from
public, anon` (a `security definer` function in `public` is an anon-callable RPC by default — inert
today, which is why it is set now), and a guard trigger on direct `path` writes.

🔴 **The one assumption the whole design rests on, named by the reviewer and not yet asserted:**
that the role owning these objects holds `BYPASSRLS`. `private.my_path()` must read `app_users`
unfiltered or the policy recurses. It is checked at *write* time (the restamp row-count guard) but
never at *read* time — and a restore or an ownership change is exactly what silently changes it.
**Add a read-time assertion to the live pass when the instance exists.**

---

## 3. Next steps, in order

1. **Pierre creates the Supabase project** (free tier). Blocking everything below.
2. Apply `0001_app_users.sql`; run the matrix with `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` set. 🔴 Those keys are read from the environment and must never be
   written into this repo — `pih-dev/PTApp` is **public**.
3. Fix whatever the live pass refuses to pass, then `0002` for the tenant tables
   (`tenants`, `tenant_snapshots`), including `owner_path` denormalized from `app_users` and
   restamped in the *same* function (§12.3).
4. Only then the thin auth module in `src/`. 🔴 `STORAGE_KEY` → `ptapp-data:<userId>` is not
   optional and is listed in §4 of the decision doc as the landmine it is: an unnamespaced key means
   a second identity signing in on Elie's phone boots offline-first from **Elie's** localStorage and
   pushes his whole dataset into their tenant. RLS would authorise it — correctly scoped to the
   wrong person.

---

## 4. Commits this session

`4f5ce4e` §11 decisions + first §12 · `4698b12` §12 corrected after verification + traps entry ·
`cb6e953` **bad — committed the decision doc as 0 bytes** · `3d18964` restored it ·
`250344d` the schema and the matrix · `54377a1` the matrix's own three test-defeating bugs, fixed.
