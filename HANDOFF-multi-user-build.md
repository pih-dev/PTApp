# SpotSet — Multi-User Build (Task A) HANDOFF

**Last updated:** 2026-08-21 ~13:05, Beirut.
**To resume:** Pierre types `continue` or `multi-user`. **Read §0 back to him and stop.**
Do not investigate, do not re-derive, do not ask follow-up questions.

> 📌 Two other threads exist and are NOT this one: `HANDOFF.md` (the queued-tasks overview,
> which points here) and `HANDOFF-spotset-publishing.md` (Play Store). Design differentiation
> (Task B) has not started.

---

## 0. Status — read this out

- **Phase 1 schema is written, reviewed and committed. Nothing is deployed and nothing in `src/`
  touches it.** The app is exactly as it was; this is additive, off to one side.
- **Two files are the work so far:** `supabase/migrations/0001_app_users.sql` (+ its `_down`) and
  `scripts/sanity/sanity-rls-matrix.mjs`.
- **The static half of the RLS matrix passes today** — run `node scripts/sanity/sanity-rls-matrix.mjs`.
  It exits **2**, not 0, because no Supabase instance exists to run the live half against.
  🔴 **Exit 2 is not a pass.** Auth must not ship until it exits 0.
- **🔴 THE NEXT ACTION IS PIERRE'S, NOT MINE: create the Supabase project.** Everything else is
  blocked behind it. Free tier is fine for this — §8 of the decision doc says Pro ($25/mo) is needed
  only from Phase 3, when Elie's real data lands. Once it exists, apply `0001` and run the matrix
  with the three env vars named at the top of the matrix file.
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
