# SpotSet Multi-User — Supporting Material (workflow wf_98af171b-e80, 2026-08-21)

Three competing designs and three adversarial judge verdicts behind docs/2026-08-21-multi-user-accounts-decision.md.

---

## Design A — minimal

# SpotSet Multi-User — Minimum Viable Correctness

**Angle:** smallest change that yields real sign-in, a real role claim, and a legitimate reviewer account, without rewriting `mergeData`, `_modified`, or the reducer. Target: Apple submission in weeks.

---

## 0. The one idea the whole design rests on

**One blob per coach.** A coach is not a row inside Elie's dataset — a coach gets their *own* `data.json`-shaped blob in their own tenant. That single choice deletes the entire per-record authorization problem: there is no query that could return another coach's client, because the data was never in the same document. The existing merge kernel keeps working verbatim, because within a tenant the writer set is still 1–3 devices, exactly what v2.6 was built for.

Clients don't read the blob at all. The coach's device writes a **per-client projection row** on each sync push; the client reads only their own row. Read-only by construction (RLS grants `select` only) — not by UI politeness.

Consequence: **`DATA_VERSION` stays 6 and there is no `migrateData` step in Phase 1.** Identity lives outside the blob. That is the single largest risk-reducer in this document.

---

## 1. Chosen backend: Supabase

Agrees with the research. Reasons that matter *for this angle*:

- Auth is a solved product (email/password, sessions, refresh) — zero server code to write.
- Row-level security is enforced **in Postgres**, not in eight places in `App.jsx`. Pierre gets authorization he cannot forget to apply.
- Phase 1 is a `jsonb` column, so `sync.js` swaps one HTTP client for another and nothing above it changes.
- Starts at $0, bills via Stripe (already proven: Google + Apple cleared this month).

Rejected, briefly: Firestore's per-document last-write-wins **is the Apr 13 / Apr 19 data-loss bug promoted to vendor policy**. PocketBase makes Pierre a sysadmin for Elie's live records over Beirut internet. Staying on GitHub cannot express "this coach sees only their clients" at all, and hits the 500 content-writes/hour wall.

🔴 **Free tier is not an acceptable home for Elie's live records** (no backups, pauses after 7 idle days). Go **Pro ($25/mo) the day real data moves.** Budget it as a business cost of publishing, not an optimization.

---

## 2. Auth mechanism

**Own email + password, via Supabase Auth. No third-party/social login.**

That choice is load-bearing against Apple:

- Guideline **4.8** fires only on third-party/social login. Own email+password ⇒ **Sign in with Apple is not required.** Adding "Sign in with Google" later makes SIWA mandatory — treat it as a v3.x decision with a cost, not a freebie.
- No OAuth ⇒ no deep links, no PKCE, no `@capgo/*` plugin, no native redirect handling. The documented iOS PKCE-across-deep-link gotcha never applies to us.

**No self-signup.** Accounts are provisioned: the owner invites a coach, a coach invites a client. The invite is a short code redeemed on the login screen (`Have an invite code?`), which calls a Supabase Edge Function that creates the user and the membership row. Provisioned-only supports the 5.1.1(v) argument — but that argument is forum-grade, so **we ship in-app account deletion anyway** (§7).

**Offline boot is mandatory and is the inverse of today's behaviour.** Today `validateToken()` makes a network call before the app opens. That becomes a lockout under Beirut internet. New rule:

> If a persisted session exists in local storage, **boot the app immediately from localStorage** and refresh the session in the background. A failed refresh degrades `syncStatus`, it never blocks the UI. Only a device with *no* session at all sees the login screen.

---

## 3. Data model

Five tables. Everything else is deferred.

```sql
-- Postgres, Supabase project "spotset"

create table tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,              -- "Elie Makdessi", "Coach Rami"
  owner_id     uuid not null references auth.users,
  data         jsonb not null default '{}'::jsonb,   -- THE EXISTING BLOB, byte-identical shape
  data_version int  not null default 6,    -- mirrors _dataVersion for cheap server-side sanity
  version      bigint not null default 1,  -- optimistic concurrency; replaces the GitHub sha
  updated_at   timestamptz not null default now(),
  is_demo      boolean not null default false
);

create table memberships (
  user_id   uuid not null references auth.users on delete cascade,
  tenant_id uuid not null references tenants on delete cascade,
  role      text not null check (role in ('owner','coach','client')),
  client_id text,                          -- set ONLY for role='client'; the id inside data.clients[]
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- Per-client read-only projection, written by the coach's device on every push.
create table client_views (
  tenant_id  uuid not null references tenants on delete cascade,
  client_id  text not null,
  user_id    uuid references auth.users on delete set null,  -- null until the invite is redeemed
  payload    jsonb not null,
  proj_version int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, client_id)
);

create table invites (
  code       text primary key,             -- 8 chars, crockford base32, case-insensitive
  tenant_id  uuid not null references tenants on delete cascade,
  role       text not null check (role in ('coach','client')),
  client_id  text,
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users
);

-- Phase 3 only, listed here so the shape is agreed now.
create table client_actions (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants on delete cascade,
  client_id  text not null,
  user_id    uuid not null references auth.users,
  kind       text not null check (kind in ('confirm','decline','request_reschedule')),
  session_id text not null,
  note       text,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
```

**Ownership / tenant key:** `tenants.id`. Every other table carries `tenant_id`. `memberships` is the only join between a human and a tenant.

**Blob shape:** unchanged. `clients / sessions / todos / evaluations / programs / auditLog / messageTemplates / _dataVersion / _lastModified` all sit in `tenants.data` exactly as they sit in `data.json` today.

### The projection payload

```js
// src/projection.js — a single-source kernel, like generateProgram or suggestBookingTime.
// Both the push path and the sanity test call it. Nothing else builds a client payload.
buildClientProjection(state, clientId) => {
  clientId,
  name, nickname,                     // no phone, no notes — notes are the coach's, not the client's
  package: { start, end, contractSize, remaining, renewalDue },   // via getRenewalDueMap
  sessionsCounted: <int>,             // via getClientCountedSessions — SAME kernel, never re-derived
  upcoming: [ { id, date, time, duration, type, status, focus } ],   // next 10
  history:  [ { id, date, status } ],                                // last 30
  latestEvaluation: <evaluation record or null>,
  currentProgram:   <program record or null>,                        // rendered by existing ProgramViewer
  generatedAt: <ISO>
}
```

The payload is **derived, never authoritative**. Losing every `client_views` row costs nothing — the next push rebuilds them.

---

## 4. Where authorization is enforced

**In Postgres, by RLS. Nowhere else is authoritative.** The client-side role check exists only to pick which screen to render.

```sql
alter table tenants      enable row level security;
alter table memberships  enable row level security;
alter table client_views enable row level security;
alter table invites      enable row level security;

-- helper, avoids RLS recursion
create function public.my_tenant_role(t uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from memberships where user_id = auth.uid() and tenant_id = t limit 1
$$;

-- A tenant blob is readable/writable ONLY by its owner or a coach member.
-- Clients are deliberately absent: they can never touch the blob.
create policy tenant_rw on tenants for all
  using      ( my_tenant_role(id) in ('owner','coach') )
  with check ( my_tenant_role(id) in ('owner','coach') );

-- You see your own memberships. Owners/coaches see their tenant's.
create policy mem_read on memberships for select
  using ( user_id = auth.uid() or my_tenant_role(tenant_id) in ('owner','coach') );

-- Coaches write projections for their tenant; a client reads exactly their own row.
create policy cv_write on client_views for all
  using      ( my_tenant_role(tenant_id) in ('owner','coach') )
  with check ( my_tenant_role(tenant_id) in ('owner','coach') );
create policy cv_read_own on client_views for select
  using ( user_id = auth.uid() );

create policy inv_manage on invites for all
  using ( my_tenant_role(tenant_id) in ('owner','coach') );
```

Read that stack once: **there is no policy under which a client's `select` returns a `tenants` row.** A compromised client app, a modified APK, a curl with a stolen JWT — all get zero rows. That is the property the GitHub PAT could never have, and it is the actual answer to "the DEMO credential was a symptom".

Note what is *deliberately absent*: no owner→coach cross-tenant read. Elie cannot see Rami's clients in Phase 1 (§8).

---

## 5. Offline sync and conflict merge

**Unchanged in shape.** localStorage stays the source of truth; the network stays the slow path.

`fetchRemoteData` / `pushRemoteData` keep their names and their contract. Only the transport changes:

| Today (GitHub) | After |
|---|---|
| `GET /contents/data.json`, cache `sha` | `select data, version from tenants where id = $tenant` |
| `PUT` with `sha`; **409** ⇒ refetch, `mergeData`, retry ×3 | `update tenants set data=$d, version=version+1 where id=$t and version=$v`; **0 rows updated** ⇒ refetch, `mergeData`, retry ×3 |
| `401` ⇒ `TOKEN_EXPIRED` ⇒ `TokenUpdateModal` | `401`/refresh failure ⇒ `SESSION_EXPIRED` ⇒ re-login modal (same red-dot routing) |

The 409-merge loop maps one-for-one onto optimistic concurrency on `version`. `mergeData`, per-record `_modified`, union-by-ID, "migrate the FOREIGN blob by its own `_dataVersion` on a clone" — all survive **byte-for-byte**. Nothing in `utils.js` is touched.

**Multi-user conflicts:** none exist in Phase 1/2, because writers are partitioned by tenant and clients cannot write. Concurrency within a tenant is the same 1–3-device problem v2.6 already solved.

**Projection writes** ride the same debounced push: after a successful blob update, upsert the projection rows whose payload hash changed. A projection write failure surfaces via `syncStatus` like any other — **never `.catch(() => {})`**, per the standing rule.

**Client-side offline:** the client app caches its projection row in localStorage and renders it with a visible "as of <time>" stamp. Offline = stale, labelled, never blank.

---

## 6. Migrating Elie's live data

Zero-downtime, reversible, and the blob never changes shape.

1. **Snapshot first.** `data.json` → `_archive/PTApp/data-snapshots/2026-MM-DD-pre-supabase.json`; verify byte count against the API's reported size. Mandatory per the Governance rule.
2. **Create** the `elie` tenant server-side, `owner_id` = Elie's new auth user, `data` = the snapshot, `data_version` = 6.
3. **Byte-diff gate.** New `scripts/sanity/sanity-supabase-parity.mjs`: fetch the tenant blob, fetch `data.json`, assert deep-equality and identical serialized byte length. This is the existing live-diff discipline applied to a *transport* move instead of a schema bump. It must print PASS before step 4.
4. **Shadow-write for 30 days.** `sync/index.js` pushes to Supabase **and** to GitHub. GitHub stays the rollback, the archive discipline keeps running, and a Supabase outage or free-tier pause costs nothing. Rollback = flip one flag in `sync/index.js` and redeploy.
5. **Elie's device:** he logs in once with email + password. The app detects a non-empty local store, matching `_lastModified` against the tenant row, and adopts the tenant rather than seeding. He notices nothing but a new login screen.
6. **Retire** the GitHub write after 30 clean days; keep the PAT and repo as a cold archive. Delete `snapshots/` writes only after Supabase Pro backups are confirmed running.

**No `DATA_VERSION` bump. No `migrateData` step. No data-shape risk.**

---

## 7. UI surface

### Coach / owner (Elie today) — near-zero change
- Token screen → **login screen**: email, password, `Sign in`, plus `Have an invite code?`. Same card, same layout.
- The four tabs, every kernel, every screen: **untouched.**
- `General` → Account: `Signed in as <email>`, `Sign out`, `Manage access` (invite a client / invite a coach, list + revoke), and — for a coach account only — `Delete my account`.
- Sync dot semantics unchanged; expired session routes to a re-login modal instead of `TokenUpdateModal`.

### Client — one new screen, read-only
A single scrolling view, no tabs: **Next session** (date, time, focus tags) · **Package** (sessions used / remaining, renewal due badge) · **My program** (rendered by the existing `ProgramViewer`) · **My last evaluation** (existing `NormChartsView`) · **History** (last 30). Footer: `Updated <time>` + `Sign out` + `Delete my account`.

No booking, no confirm, no edit. Deferred (§8).

### Account deletion — the collision, resolved deliberately
Apple 5.1.1(v) demands in-app deletion. CLAUDE.md demands never deleting user data. **These are about different objects, and the design says so out loud:**

> Deleting your account removes your **login** and your personal copy of your records. Your trainer's business records of your sessions and payments remain with your trainer, who is their controller.

Mechanically: delete the `auth.users` row + the `memberships` row, and null `client_views.user_id` (cascade deletes the row's owner link; the projection is regenerated or dropped). `tenants.data` is **never** touched. Privacy policy on gh-pages must carry that sentence. A coach deleting their account detaches the login; their tenant blob is retained and transferred to the owner.

### Reviewer access
- **Primary (both stores): a real, populated account.** `review@spotset.app` / fixed password → a real `tenants` row with `is_demo = true`, seeded from `buildDemoData()` (4 clients, 14 sessions) plus one evaluation and one generated program so the reviewer sees the whole pipeline. Coach role, so every screen is reachable. Never expires, never rate-limited, survives resubmission. This is the default Apple expects under 2.1(a) — no "prior approval" request needed.
- **Secondary: keep the `DEMO` string exactly as written.** It is already built, already declared to Google, already guarded four ways, and it is the only thing that survives a reviewer testing in Airplane Mode (a documented 4.2 trap). Declare it in Apple Review Notes as "offline fallback". Do not delete working, shipped, guarded code to satisfy tidiness.
- A **second reviewer account** `review-client@spotset.app` in the same demo tenant, so the client role is demonstrable. Note both, with a one-paragraph role explanation, in App Review Information.

**Store declarations that must change the same day** (both stores): App access credentials → the new email/password; Data safety / Privacy nutrition → **email address collected, account creation = yes**; add in-app account deletion; update the gh-pages privacy policy. Target audience stays 18+.

---

## 8. Explicitly deferred — and why deferring is safe

| Deferred | Why it's safe to defer |
|---|---|
| **Owner sees coaches' clients** (cross-tenant oversight) | Elie has zero coaches today. Adding the policy later is one `using` clause plus a tenant switcher; no data moves. Shipping it now is authorization surface with no user. |
| **Shredding the blob into `clients`/`sessions` tables** | The blob is 152 KB against a 1 MB *GitHub* ceiling that Supabase does not have. Shredding buys query power nobody needs and costs the merge kernel. Do it when coach #3 is real, additively, with the blob column retained until row-parity is proven. |
| **Client writes: confirm / decline / book** | The whole point of a read-only Phase 2 is that it introduces **no new conflict surface**. Phase 3's `client_actions` append-only inbox handles it with no merge semantics at all (append + drain), and supersedes the paused Cloudflare-Worker confirm-page design. |
| **Client self-signup** | Provisioned-only keeps the user set bounded, kills spam accounts, and strengthens the 5.1.1(v)/4.8 position. Elie's clients are handed a code in person or by WhatsApp — the channel already in use. |
| **Sign in with Apple / Google sign-in** | Adding Google *forces* SIWA. Neither is needed for an invite-provisioned professional app. Pure cost today. |
| **Per-record RLS** | Tenant partitioning makes it unnecessary. Per-record policies are where RLS gets slow and wrong. |
| **IndexedDB, program pruning, PowerSync** | Unrelated to identity; the ceiling is ~Aug 2027 and Supabase removes the 1 MB wall entirely, pushing it further out. |
| **Client sees phone/notes/audit** | Not in the projection. Least-privilege by omission is the cheapest correctness there is. |

---

## 9. File-level impact in `src/`

| File | Change | ~LOC |
|---|---|---|
| `src/sync.js` → `src/sync/github.js` | moved verbatim, becomes the shadow-write backend | 0 net |
| `src/sync/supabase.js` | **new** — `fetchRemoteData` / `pushRemoteData` / `saveSnapshot` over Supabase; version-based concurrency; `SESSION_EXPIRED` | ~160 |
| `src/sync/index.js` | **new** — facade re-exporting today's exact names (`getToken`, `isDemo`, `fetchRemoteData`, …) so `App.jsx` imports don't move; holds the shadow-write flag | ~60 |
| `src/auth.js` | **new** — `signIn`, `signOut`, `getCachedSession`, `redeemInvite`, `currentTenant()`, `currentRole()`, `deleteAccount()` | ~140 |
| `src/projection.js` | **new** — `buildClientProjection` kernel + the pre-write assertion | ~90 |
| `src/components/TokenSetup.jsx` → `LoginScreen.jsx` | email/password + invite-code path; **keep the `DEMO` branch and its comment block byte-for-byte** | +90 |
| `src/App.jsx` | `connected` → `session`; **offline-first boot** from cached session; role fork: `role === 'client'` renders `<ClientView>` instead of the four tabs; projection upsert added to the existing push effect | +50 |
| `src/components/ClientView.jsx` | **new** — the read-only client screen, reusing `ProgramViewer` + `NormChartsView` | ~200 |
| `src/components/AccessManager.jsx` | **new** — invite create/list/revoke, reached from General | ~150 |
| `src/components/General.jsx` | Account block: signed-in-as, sign out, Manage access, Delete my account; `isDemo()` guards stay | +60 |
| `src/components/TokenUpdateModal.jsx` | repurposed as the re-login modal (same red-dot route) | +30 |
| `src/i18n.js` | ~35 new EN/AR strings — **Edit tool only, never a PowerShell round-trip** | +70 |
| `src/utils.js` | 🔴 **untouched.** `DATA_VERSION` stays 6. Every kernel intact. | 0 |
| `scripts/sanity/sanity-supabase-parity.mjs` | **new** — the migration byte-diff gate | ~80 |
| `scripts/sanity/sanity-projection.mjs` | **new** — asserts a payload contains exactly one `clientId` and no other client's ids, names or phones | ~70 |

Net: roughly **+1,100 lines, ~0 lines of business logic rewritten.** Under 10% of the hand-written codebase.

---

## 10. Capacitor build changes

Small, and deliberately so.

- **No new native plugins.** `supabase-js` is `fetch` + WebSocket; email/password auth needs no deep link, no custom URL scheme, no PKCE handling. The `ios/` folder is still generated plugin-free as a Codemagic CI step — the thing that would have hurt most on a Windows-only dev box never happens.
- `capacitor.config.json`: add the Supabase project host to `server.allowNavigation` only if a redirect is ever used (it isn't in this design). Keep `webDir: dist`.
- **Session persistence:** Supabase persists to `localStorage`, which is WebView storage. iOS WKWebView can evict it under storage pressure and Android auto-backup can restore a stale copy. Mitigation is one line of policy: **a lost session means re-login, never data loss** — the blob is in localStorage under `ptapp-data` and, worst case, in the tenant row. If eviction proves real in TestFlight, move the session (not the data) to `@capacitor/preferences`; that is a 20-line change, deferred until observed.
- `public/sw.js`: network-first already; add nothing, but 🔴 **finally version `CACHE_NAME`** off the build version — an auth change shipped behind a stale `'ptapp-v1'` cache is a login screen that talks to old code. This is the release where that long-flagged issue must be fixed.
- Android: rebuild with **JDK 21**, `versionCode 4 / versionName 2.16.0`; verify the versionName **inside the .aab** (`gradlew` exits 0 on a failed build). Re-apply the signing block after any `npx cap add`.
- Play: shipping mid-countdown is safe — the 14-day clock tracks *tester opt-in*, not builds. The only real risk is review rejection, so **verify the declared App Access credential against the actual uploaded build before uploading.**

---

## 11. Phases and effort (solo, part-time)

| Phase | Content | Gate to pass | Effort |
|---|---|---|---|
| **0 — Prep** | Supabase project, Pro plan, schema + RLS applied, RLS tested with three JWTs via `curl`, live snapshot archived | A client JWT returns **0 rows** from `tenants` | 0.5 day |
| **1 — Auth + transport swap** | `auth.js`, `sync/*`, login screen, offline-first boot, Elie's tenant seeded, shadow-write on | `sanity-supabase-parity.mjs` PASS; full 16-script suite; Elie's phone round-trips an edit | 3–4 days |
| **2 — Roles + client read-only** | `memberships` role fork, `ClientView`, `projection.js`, `AccessManager`, account deletion, i18n, review accounts seeded | `sanity-projection.mjs` PASS; a real invited client sees only their own data on a real phone | 3–4 days |
| **→ SHIP** | v2.16.0: Play `versionCode 4`, then Apple/TestFlight via Codemagic; store declarations updated | Reviewer credentials verified against the uploaded binary | 1–2 days |
| **3 — Client actions** | `client_actions` inbox: confirm / decline / request reschedule, drained into `sessions` by the coach's device | append-only, no merge semantics | 2–3 days, post-launch |
| **4 — Owner oversight** | Cross-tenant read for `owner`, tenant switcher in General | one RLS clause | 1–2 days, when coach #2 exists |
| **5 — Shred blob to rows** | Only when coaches ≥ 3 or the blob is painful. Additive; blob retained until row-parity proven | — | later, probably never |

**Apple submission lands after Phase 2 — realistically 2–3 weeks of part-time evenings**, and Apple enrolment (2 business days) plus the Codemagic pipeline runs in parallel with Phase 1.

---

## 12. The three biggest risks *in this design*, and what kills each

**1. Supabase becomes a single point of failure for Elie's live business records.** Free tier has no backups and pauses after 7 idle days; even Pro is one vendor between a trainer and his income, over Beirut internet.
**Kills it:** Pro from day one of real data — non-negotiable, $25/mo. **30 days of shadow-writing to GitHub**, so rollback is a one-flag redeploy and the existing snapshot archive keeps filling. A scheduled weekly export to `_archive/PTApp/data-snapshots/` — a cron, not a hope. And localStorage remains the source of truth, so a total Supabase outage degrades Elie to exactly the app he had in v2.5: fully usable, just not synced.

**2. The projection leaks or goes stale.** `client_views` is built on the coach's device. A bug in `buildClientProjection` could put client A's sessions into client B's payload — RLS won't catch it, because the row is correctly scoped to the wrong person's data. And a coach offline for a week means clients read week-old truth.
**Kills it:** the projection is a **single-source kernel with a hard pre-write assertion** — before every upsert, verify the payload references exactly one `clientId` and contains no other client's id, name or phone; a violation throws and surfaces via `syncStatus`, never silently. `sanity-projection.mjs` runs the same assertion against the live blob in the pre-deploy suite. Staleness is handled by *labelling*, not hiding: `Updated <time>` is always on screen, and anything older than 48h renders muted with "your trainer's app hasn't synced recently".

**3. The login gate becomes a lockout — the exact failure mode this design is supposed to remove.** Today's `validateToken()` blocks the app on a network call. If auth inherits that, one bad Beirut connection at 6 a.m. means Elie cannot open his schedule in front of a paying client. That single incident would end multi-user.
**Kills it:** **boot from the cached session, always.** No network call is permitted on the render path. A session exists ⇒ the app opens on localStorage; refresh happens in the background; failure degrades the sync dot and offers re-login, never a blank gate. Refresh tokens set long (30 days), and this is the *first* thing tested in TestFlight — airplane mode, cold start, must reach the dashboard. It is also what Apple reviewers test (4.2: a white screen in airplane mode reads as a web wrapper).

---

## 13. Contradictions in the source material, flagged

- The research recommends **re-thinking `DEMO`** once auth ships; this design **keeps it** as a declared offline fallback alongside a real reviewer account. Deliberate: it is shipped, guarded, and it is the only thing that survives an airplane-mode review. Removing working code to satisfy a clean-slate instinct is the more expensive choice.
- `docs/changelog-technical.md:2152` states the standing counter-principle *"Single user… don't add complexity for multi-user edge cases that don't exist yet."* That principle is now **superseded by Pierre's 2026-08-20 three-role product definition** and should be marked as such in the same commit that ships Phase 1 — otherwise a future session will read it as live guidance.
- The brainstorm doc's warning that three roles mean "a different backend, not a feature" is **correct and this design agrees with it** — it just buys the backend in one 4-day slice (Phase 1) instead of a rewrite, by keeping the blob.
- The paused Cloudflare-Worker confirm-page design (`2026-05-04-...-paused.md`) is **superseded by Phase 3**: `client_actions` does the same job with no Worker, no HMAC link-signing, and no second vendor. Mark it superseded rather than leaving it live.

---

## Design B — proper

# SpotSet — Multi-Tenant Architecture Design (v3.x)

**Author:** design pass, 2026-08-21 · **Status:** proposal, needs Pierre's go/no-go on §11 sequencing
**Supersedes:** `docs/changelog-technical.md:2152` ("Single user, local storage, single device. Don't add complexity for multi-user edge cases that don't exist yet") — that principle was correct until 2026-08-20 and is now retired. Per release-hygiene rule 5 it must be **rewritten in place**, not left standing.

---

## 0. Read this first

Four decisions, everything else follows:

1. **Backend: Supabase** (Postgres + GoTrue + RLS). Pro tier ($25/mo) from the day Elie's real records land — the free tier has no backups and pauses after 7 days idle, which is disqualifying for live business records.
2. **Auth: your own email + password.** No Google/Facebook sign-in, ever, unless you accept Sign in with Apple as a hard dependency (guideline 4.8). Accounts are **provisioned by invitation**, self-signup disabled.
3. **Authorization is enforced in Postgres, by RLS policies**, not in React. The client-side role map is cosmetic and is allowed to be wrong.
4. **The GitHub blob does not survive.** It becomes a nightly export target — an archive, not a transport.

**One correction to the research brief.** It recommends "Phase 1 keeps the blob" — one `jsonb` row per tenant with RLS by `owner_id`. That is a good *bridge*, but it **cannot deliver the product**: a coach with their own roster and a client seeing only their own records are row-level facts, and a blob has no rows. If Phase 1 stopped there you would have moved the credential problem and solved nothing else. So the blob phase is scoped here as a **transport-and-identity cutover for Elie alone**, explicitly time-boxed, and the shredding to real tables in Phase 2 is where the product actually appears. Do not let Phase 1 become the destination.

---

## 1. The tenancy model

**Tenant = organisation = a training business.** Elie's business is org #1. This is not over-engineering for one user: the same shape lets an unrelated PT sign up in 2027 without a schema change, and it is the only shape where "Elie sees all coaches' clients, coach B sees only their own" is expressible.

```
auth.users (Supabase)
   └─ profiles (1:1)
        └─ org_members (org_id, user_id, role)          ← the authorization edge
             ├─ role 'owner'  : Elie. Sees and writes everything in the org.
             ├─ role 'coach'  : sees/writes only clients where coach_user_id = self.
             └─ role 'client' : sees only the client row where linked_user_id = self,
                                plus that client's sessions/evals/programs. Writes
                                nothing directly — only through 3 RPCs.
```

Deliberate choices, and why:

- **A person can hold memberships in several orgs.** Costs nothing now (composite key), and it is the difference between "Elie's app" and "a product". A coach who leaves Elie and starts their own org keeps their login and gets a second membership.
- **Clients are a `clients` row first, an account second.** `clients.linked_user_id` is nullable. Every client Elie has today stays exactly as they are — a record with no account. An account is *attached* later, by invitation. **A client who never signs in must lose nothing and notice nothing.**
- **Role is read live from `org_members`, never from the JWT.** Baking role/org into JWT `app_metadata` is faster but means a revoked coach keeps access until their token expires. For an app that holds a business's client list, revocation must be immediate.
- **Ownership key on every record is `org_id`; the authorization key is `coach_user_id` / `linked_user_id`.** Both are stored, both are indexed, and `org_id` is checked on every policy even when `coach_user_id` alone would suffice — belt and braces at the boundary is the one place this codebase's "no defensive code" rule does not apply.

---

## 2. Schema (Phase 2 target — the real one)

Written to preserve every existing record verbatim. Two decisions that make that possible:

**Record ids stay `text`, not `uuid`.** `genId()` returns `Math.random().toString(36).slice(2,9)` — 7 chars. Every existing id, every `clientId` foreign reference, every `packageId` in `auditLog.before/after`, every `evalId` on a program survives with **no remapping anywhere in `src/`**. An id remap is exactly the kind of migration that loses data quietly.

🔴 **But `genId()` must change for new records.** 7 chars of `Math.random()` is ~78 B of space and is not collision-safe once dozens of offline devices mint ids independently — and a colliding id in a union-by-ID merge is a *silent overwrite*, the Apr-19 failure mode with a new cause. New records get `crypto.randomUUID()`; legacy ids are kept as-is. `utils.js:2`.

```sql
-- ── identity ──────────────────────────────────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        citext not null,
  display_name text,
  locale       text default 'en',
  created_at   timestamptz default now(),
  deleted_at   timestamptz            -- soft: account gone, org records stay
);

create table orgs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_user_id uuid not null references profiles(id),
  data_version  int  not null default 6,     -- mirrors DATA_VERSION
  created_at    timestamptz default now()
);

create type member_role as enum ('owner','coach','client');
create type member_status as enum ('active','invited','revoked');

create table org_members (
  org_id     uuid not null references orgs(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       member_role   not null,
  status     member_status not null default 'active',
  invited_by uuid references profiles(id),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);
create index on org_members (user_id) where status = 'active';

-- ── domain ────────────────────────────────────────────────────────────────
create table clients (
  id             text not null,
  org_id         uuid not null references orgs(id),
  coach_user_id  uuid not null references profiles(id),   -- who owns this roster entry
  linked_user_id uuid references profiles(id),            -- the client's own account, nullable
  name text not null, nickname text, phone text,
  gender text, birthdate date, notes text,
  packages   jsonb not null default '[]'::jsonb,  -- append-only array, last = current
  _modified  timestamptz,                          -- CLIENT clock — decides who WINS
  server_seq bigint not null,                      -- SERVER seq  — decides what SHIPS
  deleted_at timestamptz,                          -- tombstone, never a hard delete
  primary key (org_id, id)
);

create table sessions (
  id text not null, org_id uuid not null references orgs(id),
  client_id     text not null,
  coach_user_id uuid not null references profiles(id),
  date date not null, time text not null, duration int not null default 45,
  type text, status text not null default 'scheduled',   -- scheduled|confirmed|completed|cancelled
  focus jsonb default '[]'::jsonb, session_notes text,
  created_at text,                                        -- legacy localDateStr, keep verbatim
  _modified timestamptz, server_seq bigint not null, deleted_at timestamptz,
  primary key (org_id, id),
  foreign key (org_id, client_id) references clients(org_id, id)
);
create index on sessions (org_id, coach_user_id, date);
create index on sessions (org_id, client_id);

create table evaluations (
  id text not null, org_id uuid not null references orgs(id),
  client_id text not null, coach_user_id uuid not null references profiles(id),
  date date not null,
  branch text,                    -- '1rm' | null (legacy mass battery, view-only)
  raw jsonb, frozen jsonb,        -- frozen output of compute1RMFrozen — NEVER recomputed
  _modified timestamptz, server_seq bigint not null, deleted_at timestamptz,
  primary key (org_id, id),
  foreign key (org_id, client_id) references clients(org_id, id)
);

create table programs (
  id text not null, org_id uuid not null references orgs(id),
  client_id text not null, coach_user_id uuid not null references profiles(id),
  eval_id text, created_at text, start_date date,
  fat_pct numeric, include_fat_loss bool, days_per_week int, duplicated_slots jsonb,
  rules_version int not null, bank_version int not null,
  classification text, classification_source text, ranks jsonb,
  blocks jsonb not null,          -- ~27–38 KB. Stays jsonb: frozen, opaque, never queried into.
  _modified timestamptz, server_seq bigint not null, deleted_at timestamptz,
  primary key (org_id, id),
  foreign key (org_id, client_id) references clients(org_id, id)
);

create table todos (
  id text not null, org_id uuid not null references orgs(id),
  coach_user_id uuid not null references profiles(id),
  text_ text, done bool default false,
  _modified timestamptz, server_seq bigint not null, deleted_at timestamptz,
  primary key (org_id, id)
);

create table audit_log (                 -- append-only. No update policy, no delete policy.
  id text not null, org_id uuid not null references orgs(id),
  ts timestamptz not null,
  actor_user_id uuid references profiles(id),      -- NEW: closedBy stops being a free string
  client_id text, client_name text, event text,
  package_id text, new_package_id text,
  before jsonb, after jsonb, trigger_ jsonb,
  server_seq bigint not null,
  primary key (org_id, id)
);

create table message_templates (         -- was an unkeyed object with no _modified
  org_id uuid not null references orgs(id),
  coach_user_id uuid not null references profiles(id),
  kind text not null,                    -- 'booking' | 'reminder'
  lang text not null,                    -- 'en' | 'ar'
  body text not null,
  _modified timestamptz, server_seq bigint not null,
  primary key (org_id, coach_user_id, kind, lang)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  email citext not null, role member_role not null,
  client_id text,                        -- set when inviting an existing client record
  token_hash text not null,              -- sha256; the plaintext token is never stored
  expires_at timestamptz not null, accepted_at timestamptz,
  created_by uuid not null references profiles(id)
);
create unique index on invitations (org_id, email) where accepted_at is null;
```

**Two clocks, and this is load-bearing.** `_modified` is the *device's* clock and decides **who wins a conflict** — unchanged from today, so `mergeData`'s semantics survive. `server_seq` is a per-org monotonic sequence stamped by a trigger and decides **what a device still needs to pull**. Using `_modified` as the pull cursor is the bug that a device with a skewed clock turns into permanently-missed records. Today's whole-blob sync hides this; delta sync exposes it.

**`message_templates` gains a real key.** Today it is one object merged by whole-blob `_lastModified` — the one collection with no per-record stamps, and therefore the one that can lose an edit. Splitting it to rows removes that hole for free.

---

## 3. Where authorization is enforced

**In Postgres. Not in React. React's role checks exist only so a coach isn't shown a button that would 403.**

```sql
alter table clients enable row level security;
alter table clients force  row level security;   -- applies to the table owner too
-- …repeat for every domain table. Default is deny; no policy = no access.

revoke all on schema public from anon;           -- anon key reaches auth endpoints only
```

Role lookup is a `security definer` function so policies on `clients` can read `org_members` without recursing into `org_members`' own policies:

```sql
create or replace function public.org_role(p_org uuid)
returns member_role
language sql stable security definer set search_path = public as $$
  select role from public.org_members
   where org_id = p_org and user_id = (select auth.uid()) and status = 'active'
$$;
revoke execute on function public.org_role(uuid) from public, anon;
grant   execute on function public.org_role(uuid) to authenticated;
```

`(select auth.uid())` rather than bare `auth.uid()` is deliberate — it lets Postgres hoist the call to an InitPlan and evaluate it once per statement instead of once per row. On a 5,000-session pull that is the difference between 8 ms and 400 ms.

```sql
-- SELECT: three disjoint visibility rules, one policy.
create policy clients_select on clients for select to authenticated using (
      org_role(org_id) = 'owner'
  or (org_role(org_id) = 'coach'  and coach_user_id  = (select auth.uid()))
  or (org_role(org_id) = 'client' and linked_user_id = (select auth.uid()))
);

-- WRITE: owner and coach only, and a coach cannot hand a client to someone else.
create policy clients_write on clients for all to authenticated
using (
      org_role(org_id) = 'owner'
  or (org_role(org_id) = 'coach' and coach_user_id = (select auth.uid()))
)
with check (
      org_role(org_id) = 'owner'
  or (org_role(org_id) = 'coach' and coach_user_id = (select auth.uid()))
);

-- Sessions: reachable through the client the caller can already see.
create policy sessions_select on sessions for select to authenticated using (
  exists (select 1 from clients c
           where c.org_id = sessions.org_id and c.id = sessions.client_id)
);   -- clients' own RLS filters this exists() — visibility composes, no duplicated rule
```

**The `with check` clause is the tenant boundary.** A malicious or buggy client can `POST` a row with `org_id` = someone else's org; `with check` rejects it at the database. This is why `sync_push` must be `SECURITY INVOKER` (the default) — a `security definer` push function would run as its owner and bypass every policy above. Write that in a comment on the function.

**Clients never get INSERT or UPDATE policies.** RLS cannot restrict *which columns* a statement changes, so an `UPDATE` policy on `sessions` for the client role would let a client rewrite `session_notes` or `status:'completed'`. Instead, client writes go through exactly three `security definer` RPCs with hand-written checks:

```sql
create function client_respond_to_session(p_org uuid, p_session text, p_action text)
-- p_action ∈ 'confirm' | 'decline'. Asserts org_role(p_org)='client', asserts the
-- session's client.linked_user_id = auth.uid(), asserts current status='scheduled'.
-- Writes ONLY status and _modified. Appends an audit_log row with actor_user_id.

create function client_request_booking(p_org uuid, p_date date, p_time text)
-- Inserts a session with status 'requested' into the coach's calendar. The coach's
-- app shows it as pending; suggestBookingTime is NOT consulted (the client picked).

create function client_delete_account()
-- §7. Nulls linked_user_id, revokes membership, soft-deletes the profile, deletes
-- the auth.users row. Touches no session, evaluation or program.
```

`status` gains a fourth value, `'requested'`, which is additive and needs no migration (existing rows are never `'requested'`).

**This is where the DEMO credential problem dies.** It existed because the only credential in the system had write access to everything. Now a reviewer account is a real account with a real role in a real seeded org, and the database refuses it access to Elie's org. Nothing has to be disabled in the client to make that safe.

**And the RLS must be tested, not reasoned about.** `scripts/sanity/sanity-rls-matrix.mjs` signs in as five synthetic users — owner, coach A, coach B, client-of-A, orphan — and asserts, for every table, both a positive (`n` rows visible) and a negative (`0` rows visible, and a write returns 42501). It runs in the deploy gate alongside the existing 16. A policy you have not tried to break is a policy you have not written.

---

## 4. Offline and conflict merge under multi-user

**The invariant that must not change: localStorage (later IndexedDB) is the source of truth on device; the network is the slow path.** This app is already offline-first by construction. Nothing below weakens that.

### 4.1 Local cache, namespaced

🔴 `STORAGE_KEY = 'ptapp-data'` becomes `ptapp-data:<userId>`. Today's key is a landmine the moment two people use one phone — Elie hands his phone to a coach, the coach signs in, and inherits Elie's entire dataset as "local truth", which the merge then pushes upward. `utils.js:851`, `loadData`, `saveData`, and the migration that copies the legacy unkeyed blob into Elie's namespaced key exactly once.

### 4.2 Pull

```
sync_pull(p_org uuid, p_since bigint) → jsonb
  { cursor: <max server_seq>,
    clients:[…], sessions:[…], evaluations:[…], programs:[…],
    todos:[…], auditLog:[…], messageTemplates:[…] }
```
`SECURITY INVOKER`, so every row it returns has already passed RLS. Each table filtered `where org_id = p_org and server_seq > p_since`, capped at ~2,000 rows per table with a `has_more` flag so a first sync on a slow Beirut connection resumes instead of timing out. Tombstones (`deleted_at not null`) ship like any other change — that is how a delete propagates without a hard delete ever happening.

### 4.3 Merge, client-side

**`mergeData` survives, with its semantics intact and its shape changed.** Today it takes two whole blobs; it becomes `mergeDelta(local, delta)` calling the same `mergeById` — union by id, higher `_modified` wins — per collection. The two hard-won rules stay:

- The Apr-19 rule (**never `.catch(() => {})`**): every pull/push failure surfaces via `syncStatus`. Non-negotiable.
- The v2.10.1 rule (**migrate the foreign blob by its own `_dataVersion`, on a clone**): now a *per-record* concern. Each row carries the org's `data_version`; a record from a device running an older bundle is passed through `migrateData` on a clone before merging. `migrateData` currently takes a whole blob — it needs a per-collection entry point, or the delta gets wrapped into a blob-shaped object first. The second is less code and less risk; do that.

The trap in `CLAUDE.md` — *"`mergeData`'s key list drops collections a stale bundle doesn't know"* — gets **worse** with delta sync, because a stale bundle now silently discards a whole table's delta instead of a whole blob's key. Mitigation: `sync_pull` returns a `schema_version`; a client whose `DATA_VERSION` is lower **refuses to push** and shows "update required". That converts a silent data loss into a visible nag.

### 4.4 Push

An **outbox**: `ptapp-outbox:<userId>` in localStorage, a list of `{table, id}` dirty markers stamped by the reducer wrapper that already stamps `_lastModified` (`utils.js:938`). The 1-second debounce stays. On flush, `sync_push(p_changes jsonb)` upserts:

```sql
insert into sessions (…) values (…)
on conflict (org_id, id) do update
   set … where excluded._modified > sessions._modified;
```

**That `where` clause is `mergeById` expressed in SQL, and it is the single most important line in this design.** The merge rule now lives in exactly two places — the client (for the local cache) and the database (authoritative). Write a test that replays the **Apr 13** and **Apr 19** incident traces against `sync_push` and asserts the fresh record survives. If those two tests do not exist, this phase is not done.

`initialLoad` + `syncReady` + `skipSync` all still gate the first push, unchanged.

### 4.5 Working while signed out of the network

🔴 A Supabase access token lives one hour. **The UI must never gate on token validity.** `connected` becomes:

```
hasCachedSession && hasLocalDataset   // → render the app, syncStatus='offline'
```

Refresh is attempted opportunistically; failure downgrades to `offline`, never to the sign-in screen. Only an explicit sign-out, or a *server-confirmed* 401 `invalid_grant` after the refresh token's 30-day life, returns the user to sign-in — and even then, the local cache is preserved so signing back in does not re-download 150 KB over a bad line. This also happens to be what Apple's reviewer sees when they test in Airplane Mode.

### 4.6 What the ceilings become

The **1 MB GitHub Contents ceiling disappears**, and with it the `docs/app-health.md` "~25–30 programs total" budget and the standing program-pruning obligation in `CLAUDE.md → KNOWN ISSUES`. So does the 500-content-writes/hour GitHub secondary rate limit, which was a hard wall at a dozen coaches. **Mark both resolved in the same commit that cuts over** — a stale obligation gets acted on.

What replaces them: localStorage's ~5 MB per origin, now holding one org's full cache. Elie is at 151 KB; an org with four coaches and 40 program records is ~1.5 MB. Comfortable, but **move the cache to IndexedDB in Phase 2** (the 2026-04-02 sync review already listed this as a Stage-2 item) rather than discovering the quota on a coach's phone.

---

## 5. Migrating Elie's data.json — zero loss

Five gates. Any one fails, the migration stops.

**G0 — snapshot.** `_archive/PTApp/data-snapshots/2026-XX-XX-pre-supabase.json`, byte count verified against the API-reported size. Mandatory under Elie's standing-authority terms; also the artefact every later gate diffs against.

**G1 — normalise.** `scripts/migrate-to-supabase.mjs` imports `migrateData` **from `src/utils.js`** — it does not reimplement it — runs the snapshot through it, and asserts `_dataVersion === 6`. Reimplementing the migration in the migration script is how the v2.9 override-drop near-miss almost shipped.

**G2 — load.** Insert in FK order: `profiles(Elie)` → `orgs` → `org_members(owner)` → `clients` → `sessions` → `evaluations` → `programs` → `todos` → `audit_log` → `message_templates`. Every `id` preserved verbatim. `coach_user_id` = Elie for every row. `linked_user_id` = null for every client. `_modified` copied where present, defaulted to `_lastModified` where absent. `server_seq` assigned by the trigger. **Run inside one transaction.** Executed with the `service_role` key from Pierre's machine — that key never enters the bundle and never enters git.

**G3 — round-trip byte diff.** `scripts/sanity/sanity-live-supabase-diff.mjs`: pull everything back through `sync_pull` **as Elie, through RLS**, reassemble the blob shape, canonicalise key order, and `JSON.stringify`-compare against G0. Any diff prints **DO NOT DEPLOY**. This is the existing live-diff gate pattern applied to a transport move instead of a schema bump — same discipline, new target. Note the three existing gates (`live-v6-diff`, `live-v5-diff`, `live-migration`) stay spent; this is a fourth, and it is *live*, not spent, until the cutover completes.

**G4 — dual-write window, 3 weeks.** After cutover the app writes Supabase (authoritative) **and** keeps pushing the assembled blob to `makdissi-dev/ptapp-data` on a slow debounce. GitHub becomes a write-only mirror. Rollback during this window is: revert the bundle to v2.15.1, re-enter the PAT, and the app is exactly as it was, with three weeks of data intact. **This is the only real rollback that exists** — after it closes, rollback means restoring from an export.

**G5 — permanent export.** A scheduled job (GitHub Action, nightly) calls `sync_pull` with a service key, assembles `data.json`, commits it to `ptapp-data`. The archive discipline continues unchanged and, critically, **neutralises the Supabase backup question independently of tier**. Pro tier is still bought — PITR and a nightly git commit answer different failures — but the app is never one vendor's retention policy away from Elie's business.

---

## 6. UI surface

### PT / owner (Elie) — mostly unchanged, deliberately
The brief's first constraint is that the app stays as Elie uses it. Four tabs, same screens, same gestures. What changes:

- Token screen → **Sign in** screen. Email, password, "forgot password".
- General gains an **Account** section: who you are, sign out, change password, delete account.
- General's **Backup** section is rewritten: "Cloud backup"/"Restore from snapshot" (GitHub snapshots) become "Export data" / server-side restore points. "Update sync token" disappears entirely, as does `TokenUpdateModal`.
- New **People** screen (owner only): coaches list, invite a coach, revoke a coach, reassign a client between coaches. Reachable from General, not a fifth tab — the four-tab bottom bar is the product's shape and adding to it is a real cost.
- Sessions with `status='requested'` surface on the Dashboard as a pending-approval row. This is the one genuinely new thing in Elie's daily flow.

### Coach — the same app, a smaller world
Identical UI. RLS returns fewer rows. No People screen. **This is the payoff of enforcing server-side: there is no "coach build".**

### Client — a separate, small shell
Four screens, not four tabs: **Upcoming** (confirm/decline), **Book** (open slots), **My Program** (read-only `ProgramViewer`), **My Progress** (evaluation history, 1RM classifications). Reuses `ProgramViewer.jsx`, `NormChartsView.jsx`, the i18n layer and the whole design system. It is a different `App` branch on `role === 'client'`, not a different app.

**This obsoletes the paused Cloudflare-Worker confirm-page spec** (`docs/superpowers/specs/2026-05-04-whatsapp-automation-and-calendar-link-paused.md`): signed one-shot links, HMAC, expiry, a Worker holding a server-side GitHub token — all of it is replaced by "the client has an account". Mark that spec superseded, and keep only the WhatsApp *message* as the invitation delivery channel.

### File-level impact in `src/`

| File | Change | Rough |
|---|---|---|
| `sync.js` (144) | **Deleted.** Replaced by `api.js` (Supabase client, `syncPull`/`syncPush`/RPCs) + `auth.js` (session, storage adapter, sign-in/out/refresh). | −144, +~350 |
| `TokenSetup.jsx` (94) | **Deleted** → `SignIn.jsx` + `AcceptInvite.jsx`. | −94, +~220 |
| `TokenUpdateModal.jsx` (61) | **Deleted** → `SessionExpiredModal.jsx` (rarer, different copy). | ~±0 |
| `App.jsx` (297) | Heaviest edit. Gate rewritten; `reconcile()` → delta pull/merge/push; role-based screen selection; `isDemo()` choke points removed at all five sites. | ~+120 |
| `utils.js` (1397) | `STORAGE_KEY` namespacing; `genId` → `crypto.randomUUID` for new ids; `mergeData` → `mergeDelta` (same `mergeById`); outbox stamping in the reducer wrapper; `migrateData` per-collection entry. **Every kernel below untouched.** | ~+180 |
| `General.jsx` (494) | Backup section rewritten, Account section added, demo branches removed. | ~+80/−60 |
| `Schedule.jsx` (752) | `buildSession` gains `coachUserId`; `'requested'` status rendering. **Also fix the `focus: []` bug at line 201** — it is in the same function and review finding P3 already scoped it. | ~+60 |
| `Clients.jsx` (550) | `coach_user_id` on create; owner-only "assign to coach"; "invite to app" per client. | ~+70 |
| `Dashboard.jsx` / `Sessions.jsx` | Pending-request row; no filtering logic (RLS did it). | ~+40 |
| `demoData.js` (105) | **Deleted** — replaced by a seeded demo org on the server. | −105 |
| **New** | `auth.js`, `api.js`, `roles.js` (cosmetic capability map), `SignIn.jsx`, `AcceptInvite.jsx`, `People.jsx`, `ClientShell.jsx` + 4 client screens. | ~+1,100 |
| **Untouched — say it out loud** | `normCharts.js`, `programKernel.js`, `programRules.js`, `exerciseBank.js`, `exerciseNamesAr.js`, `i18n.js` (+strings), `EvalForm`, `EvalSection`, `ProgramSetup`, `ProgramViewer`, `RenewalModal`, `Modal`, `Icons`, `ErrorBoundary`. Kernels `compute1RMFrozen`, `generateProgram`, `suggestBookingTime`, `getRenewalDueMap`, `getClientCountedSessions`, `applyOverride`, `getFocusTags`, `openWhatsApp` — **zero changes**. | 0 |

Net: roughly **+1,500 / −450** lines against ~7,500 hand-written. The kernels being untouched is not luck — it is because the tenancy key was added *around* the records rather than inside the computations.

---

## 7. Store and review consequences

**Google Play — safe to ship mid-test.** The 14-day clock tracks testers' continuous opt-in, not builds; a new versionCode does not reset it. Two things must happen **before** uploading the auth build, not after:

1. **App Access declaration updated to the real reviewer account** — email + password of a seeded owner-role account in a demo org. If the declared `DEMO` string stops working against the new build, that *release* is rejected. Testers stay opted in, the window keeps accruing, but you lose days.
2. **Data safety updated**: add *Email address* and *User IDs*; flip account creation to Yes; login-with-outside-accounts stays No. Target audience stays 18+.

**Apple — this design is the thing that makes Apple straightforward, which is why Pierre is right to want it first.**
- **2.1(a):** a real, populated, live account is the default expectation. Provide two: `review.owner@…` (an org with 4 clients, ~14 sessions, one evaluation, one generated program) and `review.client@…` (the client view). No prior-approval request needed, no built-in demo mode, no exception to argue.
- **4.8:** own email/password is not a third-party login service, so **Sign in with Apple is not required**. 🔴 The day anyone adds "Sign in with Google", it becomes mandatory. Put that in `CLAUDE.md → TRAPS`.
- **4.2:** the reviewer must not land in an empty invited-client shell. The seeded org is populated, and Airplane Mode must render the cached app rather than a white screen (see §4.5).
- **5.1.1(v):** self-signup is disabled, which is a *forum-grade* argument that account deletion doesn't apply — do not rely on it. **Ship in-app deletion anyway.**

**And that collides head-on with "NEVER delete user data". Resolve it explicitly, in `CLAUDE.md`:**

> A **client record** is the trainer's business record and is never deleted. A **client account** is the person's, and is deleted on request. `client_delete_account()` nulls `linked_user_id`, revokes the membership, soft-deletes the profile, and deletes the `auth.users` row. Sessions, evaluations, programs and audit entries survive, now attached to a client record with no account — exactly the state of every client Elie has today. The deletion screen says this in one sentence, in EN and AR, before confirming.

That satisfies Apple ("delete the entire account record along with associated personal data" — the account record *is* the profile + membership + email) and the data rule, without either bending.

---

## 8. Capacitor / build changes

- 🔴 **`spotset.app` registration stops being optional and becomes blocking.** Invitation links and password reset need a real domain, and deep links need `https://spotset.app/.well-known/assetlinks.json` (Android App Links) and `apple-app-site-association` (iOS Universal Links). Buy it in week 1. ~$14.20/yr.
- **Deep-link handlers**: Android `intent-filter` on `spotset.app/auth/*`; iOS Associated Domains entitlement. The known Supabase iOS gotcha — the PKCE code verifier being lost across the deep-link hop — is avoided entirely because email/password does not use PKCE. If OAuth is ever added, that trap returns.
- **Token storage**: a custom Supabase storage adapter backed by `@capacitor/preferences` on native (Keychain / EncryptedSharedPreferences), `localStorage` on web. A WebView's `localStorage` can be evicted by the OS under storage pressure, and evicting the refresh token signs the trainer out mid-session on a bad line.
- **Network**: `server.androidScheme = 'https'`, cleartext off, Supabase origin allowed. Add the origin to the CSP if one is set.
- **Service worker**: `CACHE_NAME` is hardcoded `'ptapp-v1'` and has never been versioned — flagged High in the 2026-04-02 review and still unresolved. **Fix it in this release.** A cutover that changes the auth model while a stale SW serves the old bundle is the "stale bundle drops a collection" trap with the whole app at stake.
- **Android re-apply trap unchanged**: `npx cap add android` wipes the signing block in `android/app/build.gradle` and the `*.jks` lines in `android/.gitignore`. JDK 21. `gradlew` exits 0 on a failed build — verify the versionName *inside* the `.aab`.
- **iOS**: `npx cap add ios` still cannot run on Windows; `ios/` is generated as a Codemagic step, never committed.

---

## 9. Phased plan

Assumes ~8–10 h/week, solo, part-time.

| Phase | Version | Scope | Effort | Done when |
|---|---|---|---|---|
| **0 — Spec & schema** | — | Migrations written, RLS policies written, `sanity-rls-matrix.mjs` written and **failing** (no tables yet), Supabase project + Pro, domain bought. No app code. | **1 wk** | The RLS matrix test exists before the policies it tests. |
| **1 — Transport & identity cutover** | v3.0 | Elie only, single org. Auth, sign-in screen, `api.js`, delta sync, outbox, namespaced cache, migration G0–G4, dual-write on. Feature set identical to v2.15.1. | **3 wks** | Elie uses it for a week and notices only the sign-in screen. |
| **2 — Real authorization + hardening** | v3.1 | Shredded tables live and verified byte-for-byte (G3), IndexedDB cache, SW versioning, RLS matrix green, Apr-13/Apr-19 replay tests green, dual-write closed, G5 nightly export running. **Still one user.** | **4 wks** | The database refuses a cross-tenant read in an automated test. |
| **3 — Coaches** | v3.2 | `org_members`, invitations Edge Function, People screen, client reassignment, per-coach `message_templates`. Coach #1 onboarded. | **3 wks** | A coach signs in and sees only their roster, with no client-side filtering code. |
| **4 — Clients** | v3.3 | Client shell, the three RPCs, `'requested'` status, account deletion, invite-by-WhatsApp. | **4 wks** | A real client confirms a real session from their phone. |
| **5 — Store** | v3.3 | Play declarations updated + upload; App Store Connect record, listing, privacy answers, reviewer accounts, submission. | **1 wk** | Both stores hold a build with a real login. |

**~16 weeks calendar.** That is the honest cost of "properly once", and it is worth it: the alternative — bolting roles onto the blob — produces an app where every authorization decision is a React `if`, and the first one you forget is a coach reading another coach's client list.

**Sequencing against Apple, concretely.** Apple activation lands within ~2 business days. Do not wait 16 weeks to touch it:
- **Now:** stand up Codemagic and push **v2.15.1 to TestFlight *internal* testing**. Internal TestFlight does not go through App Review, so the whole iOS pipeline — certs, provisioning, `cap add ios` on the hosted Mac, upload — is proven and debugged on a build you already trust, months before it matters.
- **After Phase 2 (~week 8):** external TestFlight, which does need review, with real reviewer accounts.
- **After Phase 4:** the App Store submission itself.
That gets the Apple risk retired early without submitting an app whose auth model you are about to replace.

---

## 10. The three biggest risks in this design

**1. Delta sync is where data loss lives, and this app has lost data twice at exactly this layer.**
Replacing whole-blob push with per-record delta replaces a merge you have hardened over four months with one you wrote last week. A missed tombstone, a clock-skewed cursor, an id collision — each is silent, and each looks like "a session I booked isn't there".
*What kills it:* the LWW rule implemented **once**, in SQL, as `where excluded._modified > t._modified`, with the Apr-13 and Apr-19 traces replayed against it as tests that must pass in the deploy gate. Dual-write for three weeks so rollback is real. The nightly `data.json` export (G5) forever, so any loss is recoverable from a git history you already trust. `sync_pull` cursor on `server_seq`, never on a client clock. And the standing rule holds without exception: **no `.catch(() => {})` on any sync path**.

**2. An RLS policy that is subtly wrong, or a table where you forgot to enable it.**
A missing `enable row level security` is a table where every authenticated user reads every row — and there is no symptom. It works perfectly. This is worse than the GitHub PAT it replaces, because the PAT was *obviously* all-or-nothing and this looks secure.
*What kills it:* `force row level security` on every table plus `revoke all on schema public from anon`, so the failure mode is a locked-out app rather than a leaked roster. `sanity-rls-matrix.mjs` asserting a **negative** for every table × every role, run in the deploy gate — a migration that adds a table without a policy fails the gate. The `service_role` key never in the bundle, never in git, only in the migration script on Pierre's machine. And client writes through three RPCs rather than column-restricted UPDATE policies, because RLS cannot express column restrictions and pretending otherwise is how a client edits their own session notes.

**3. Auth quietly converts an offline-first app into an online-gated one.**
This is the one that will actually bite in Beirut. A one-hour JWT, a refresh that needs network, a sign-in screen that appears because `getSession()` returned null — and Elie is standing in a gym with no signal, unable to see today's bookings. The app becomes *worse* than the version it replaced, at the exact moment it matters, and the trainer stops trusting it.
*What kills it:* the gate is `hasCachedSession && hasLocalDataset`, never token validity. A 30-day refresh-token life with a documented offline grace during which the app is fully usable read **and** write, queueing into the outbox. An explicit "signed in · offline" state in the sync dot, distinct from "failed", so the user knows the difference between "no signal" and "something is broken" — the same distinction the 401-vs-blip trap already demands. And an **Airplane Mode test in the pre-release checklist**, which doubles as the Apple 4.2 white-screen mitigation.

*Runners-up, managed rather than solved:* Supabase free tier pauses after 7 days idle and has no backups — buy Pro on cutover day, and G5 makes even Pro non-load-bearing. `spotset.app` is now a blocking dependency for deep links. The Play App Access declaration must be updated **before** the upload, not after.

---

## 11. What needs Pierre's decision

1. **Go/no-go on ~16 weeks**, and on Phase 1 shipping to the Play closed track mid-countdown (research says the clock is safe; the App Access declaration is the thing to get right).
2. **Supabase Pro ($25/mo) from cutover day** — recurring cost, first in this project.
3. **Elie's sign-off** under the standing-authority terms: his live records move hosts. Snapshot G0 is mandatory; the dual-write window is his rollback.
4. **Account-deletion policy wording** (§7) — client record survives, client account does not. This edits a 🔴 rule in `CLAUDE.md`, so it should be his call, not mine.

---

## Design C — risk-first

# SpotSet Multi-User Architecture — Risk-and-Migration-First Design

**Author:** design pass, 2026-08-21 · **Status:** proposal, awaiting Pierre's go/no-go
**Governing constraint:** Elie is running a live business on this app today. Every decision below is made to protect that, and the architecture is chosen because it makes the *sequencing* safe — not the other way round.

---

## 0. The one-paragraph answer

Move the storage tier from "GitHub Contents API + a shared PAT" to **Supabase (Postgres + Supabase Auth), Phase 1 holding the existing JSON blob verbatim in one row per tenant**, with **Postgres Row-Level Security** as the single enforcement point. Auth is **Supabase email+password, invite-only, no third-party OAuth** (which keeps Sign in with Apple out of scope under Guideline 4.8). The existing offline model — localStorage is the source of truth, `mergeData` per-record `_modified` union-by-ID, `migrateData`-the-foreign-blob — survives **unchanged, line for line**. Then the sequencing: five releases, each independently reversible, with GitHub remaining the authoritative store through two of them via **dual-write**, and Elie's cutover happening on the **PWA** (instant gh-pages rollback) — never first on a native binary, which cannot be rolled back.

**Nothing in this plan blocks the Apple submission**, and nothing in it touches the Play closed-testing clock, which counts testers, not builds.

---

## 1. Contradictions in the input, resolved up front

| Tension | Resolution |
|---|---|
| `docs/changelog-technical.md:2152` — *"Single user, local storage, single device. Don't add complexity for multi-user edge cases that don't exist yet."* vs Pierre's 2026-08-20 three-role definition | The counter-principle is **superseded, explicitly and in writing**, not quietly ignored. It should be edited in the same commit as Phase 0 with a dated pointer to this doc, or a future session will cite it to kill the work. Its *spirit* survives: we build the tenant boundary now and the roles later, when trainer #2 is real. |
| `HANDOFF-spotset-publishing.md:337` + `docs/2026-08-20-app-name-brainstorm.md:176` — *"three-role platform is not what is built… that is a different backend, not a feature"* | Correct and still true. This doc is that different backend. It does not contradict the warning; it answers it. |
| `sync.js:26` comment says live data is ">110KB"; `docs/health-check-2026-08-03.md` measures **151,686 B** | The comment is stale, not wrong-in-kind. Irrelevant to this design (Postgres has no 1 MB row problem), but it does mean **the GitHub 1 MB ceiling stops being the binding constraint the day Phase 3 completes** — the program-pruning obligation in CLAUDE.md's KNOWN ISSUES can be downgraded from "before Aug 2027" to "size hygiene". Say so in the docs; don't leave a dead deadline live. |
| Apple 2.1(a): a `DEMO`-style local seed needs **prior Apple approval**; Google accepted it as-is | Apple gets a **real, populated trainer account** on the live backend. The local `DEMO` mode stays in the code as the Android answer and as a fallback, but it is not what we declare to Apple. This is a *reason to do the auth work before Apple submission*, exactly as Pierre suspected — the real account is strictly easier to defend than asking Apple for an exception. |

---

## 2. Chosen backend and why the alternatives lose *on migration risk*, not on features

**Supabase.** The comparison research already argues the feature case; here is the risk case, which is the one that matters:

- **Firestore is disqualified by history, not by taste.** Per-document last-write-wins is the precise mechanism of the 2026-04-13 and 2026-04-19 data-loss incidents. Adopting it means deleting `mergeById` and trusting a vendor to reimplement the bug that cost this app five sessions and a client's record. Non-starter.
- **PocketBase / any VPS** makes a solo part-time developer in Beirut the on-call sysadmin for someone else's payroll data, on unreliable internet. The failure mode is "Elie can't work and Pierre is asleep."
- **Cloudflare D1 + Workers** means hand-writing auth, sessions, password reset, and an authz check at every endpoint. Every one of those is a place to get row scoping wrong. RLS is the only option here where the *database refuses*, so a forgotten `.eq('trainer_id', …)` in a component is inert instead of catastrophic.
- **Staying on GitHub** cannot express "this trainer sees only their clients" at any layer, and the ~500 content-writes/hour secondary limit is a wall that fails semi-silently — the exact failure class that already cost data twice.

**The Supabase free tier is not acceptable for Elie's records** (zero backups, pauses after 7 days idle). Budget **Pro, $25/mo, from the day real data lands** — i.e. from Phase 3, not before. Phases 0–2 run on free because they carry only copies.

---

## 3. Auth mechanism

**Supabase Auth, email + password, invite-only. No OAuth providers enabled — not now, not later without re-reading Guideline 4.8.**

| Decision | Reason |
|---|---|
| Email + password of our own | Not a "third-party or social login service", so **Guideline 4.8 does not fire** and Sign in with Apple is not required. The moment anyone enables Google sign-in "for convenience", SIWA becomes mandatory on iOS. Put that in TRAPS. |
| **No public self-signup.** Signup disabled in the Supabase dashboard; accounts created only by an `invite_user_by_email` call from an Edge Function, gated on the caller being an org owner/coach | (a) It matches the product: Elie invites coaches, coaches invite clients. (b) It removes the abuse surface entirely — no rate-limited signup endpoint, no email-verification spam. (c) It gives a defensible position on 5.1.1(v). |
| **Ship in-app account deletion anyway** | The forum position that provisioned-only apps are exempt is forum-grade, not guideline text. Building it costs one Edge Function and one screen; a rejection costs a review cycle. See §7 for how it coexists with "NEVER delete user data". |
| Magic link as a secondary path for **clients only** | Clients are gym members, not developers; a password reset flow over bad Beirut internet is friction. Magic link is Supabase-native, not third-party, so 4.8 is still clear. Deferred to Phase 5 — not on the critical path. |
| Session persistence | `persistSession: true`, refresh token in **Capacitor Preferences** (native) / localStorage (web). A refresh token lasts long enough that Elie is not re-authenticating on a dead connection. **Critical: an expired session must never block reading local data — see §6.** |

**What replaces the PAT:** nothing, for Elie, until Phase 3. The PAT stays exactly where it is and keeps working while the new path is proven beside it.

---

## 4. Data model

### 4.1 Phase 1–3 (the shape that ships first)

The whole point is that the blob does not change. `data.json` becomes a `jsonb` column.

```sql
-- Identity comes from auth.users (Supabase-managed: id, email, encrypted_password…)

create table orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                    -- 'Elie Makdessi Training'
  owner_id    uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table memberships (
  org_id      uuid not null references orgs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','coach','client')),
  -- for role='client' ONLY: which client record in the blob this login maps to.
  -- Text, because the app's ids are 'c_xxx' strings generated by genId(), not uuids.
  client_ref  text,
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- THE tenant blob. One row per coach-scoped dataset.
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete restrict,
  coach_id      uuid not null references auth.users(id),   -- whose portfolio this is
  data          jsonb not null,          -- byte-equivalent to today's data.json
  data_version  int  not null,           -- mirrors _dataVersion; queryable without parsing
  version       bigint not null default 1,  -- optimistic concurrency counter
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id),
  unique (org_id, coach_id)
);

-- Server-side snapshots. Replaces snapshots/*.json in the GitHub repo.
create table tenant_snapshots (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  data        jsonb not null,
  bytes       int not null,
  reason      text,                       -- 'manual' | 'pre-migration' | 'nightly' | 'pre-prune'
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
```

**The tenant key is `(org_id, coach_id)`.** Elie's existing dataset becomes exactly one row: `org = Elie's org`, `coach_id = Elie`. Trainer #2 gets a second row, empty. **No trainer ever reads another trainer's row** — enforced below, not in JS.

`version` replaces GitHub's `sha`. The existing 409-retry-merge loop maps onto it one-for-one: `update … where id = $1 and version = $2` returning zero rows ⇒ the same "someone else pushed" branch that today's HTTP 409 takes. `pushRemoteData`'s three-retry structure is preserved verbatim.

### 4.2 Client-role read access, Phase 5

A client must see *their own* records without receiving the coach's whole blob. Two options; **take the second**:

- ❌ *Give clients the blob and filter in JS.* Their device now holds every other client's phone number and payment history. Unacceptable, and it is exactly the trap already in CLAUDE.md ("never hand out a credential that reaches live data").
- ✅ **A projection table, written by a trigger on `tenants`.** The coach's app remains blob-based; the database derives a per-client slice.

```sql
create table client_views (
  org_id      uuid not null references orgs(id) on delete cascade,
  client_ref  text not null,             -- the 'c_xxx' id inside the blob
  coach_id    uuid not null,
  data        jsonb not null,            -- { client, sessions[], evaluations[], programs[] } for THIS client only
  updated_at  timestamptz not null default now(),
  primary key (org_id, client_ref)
);
```

Populated by an `after insert or update on tenants` trigger (a plpgsql function that shreds `new.data` into one row per client). Cost: one function, ~60 lines of SQL, no application code, and — decisively — **the coach app is unaware it exists**, so the client feature cannot break the trainer app. Clients get read access to their own `client_views` row plus an insert-only `client_requests` table:

```sql
create table client_requests (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  client_ref text not null,
  session_id text,                        -- the 's_xxx' id being acted on, or null for a new booking request
  kind       text not null check (kind in ('confirm','decline','reschedule','book')),
  payload    jsonb not null default '{}', -- { date, time } for book/reschedule
  status     text not null default 'pending' check (status in ('pending','applied','rejected')),
  created_at timestamptz not null default now()
);
```

**Clients never write to the coach's blob.** They append a request; the coach's app drains the queue on reconcile and applies it through the existing reducer actions (`UPDATE_SESSION`, `ADD_SESSIONS`). This preserves the single-source kernels absolutely — `buildSession` remains the only constructor for a session — and it subsumes the paused Path-3 confirm-page design (`docs/superpowers/specs/2026-05-04-…`) without a Cloudflare Worker, without HMAC link signing, and without a second server-side credential. **That paused spec should be marked superseded by this table.**

---

## 5. Where authorization is enforced

**In Postgres. Only in Postgres.** Everything in `src/` is presentation.

```sql
alter table orgs, memberships, tenants, tenant_snapshots, client_views, client_requests
  enable row level security;

-- Helper, security definer, so policies don't recurse through memberships' own RLS.
create or replace function auth_role_in(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from memberships where org_id = p_org and user_id = (select auth.uid())
$$;

-- A coach reads and writes their own tenant row. An owner reads every row in their org.
create policy tenant_rw_own on tenants for all
  using (
    coach_id = (select auth.uid())
    or auth_role_in(org_id) = 'owner'
  )
  with check (
    coach_id = (select auth.uid())
    or auth_role_in(org_id) = 'owner'
  );

-- A client reads exactly one row and writes nothing here.
create policy client_view_read on client_views for select
  using (
    exists (select 1 from memberships m
            where m.org_id = client_views.org_id
              and m.user_id = (select auth.uid())
              and m.role = 'client'
              and m.client_ref = client_views.client_ref)
    or auth_role_in(client_views.org_id) in ('owner','coach')
  );

create policy client_request_insert on client_requests for insert
  with check (
    exists (select 1 from memberships m
            where m.org_id = client_requests.org_id
              and m.user_id = (select auth.uid())
              and m.role = 'client'
              and m.client_ref = client_requests.client_ref)
  );
```

Three properties worth stating explicitly, because they are the reason this backend was chosen:

1. **A bug in a React component cannot leak another trainer's clients.** The worst a wrong query does is return zero rows.
2. **Owner-reads-coach is a policy line, not a feature branch in the app.** Elie's oversight view is `select * from tenants where org_id = …` — the app renders someone else's blob through the same components, read-only.
3. **There is no service-role key in the client bundle, ever.** Only the anon key, which is public by design and useless without a session. Put this in TRAPS next to the PAT rule.

---

## 6. Offline and conflict merge under multi-user

**Nothing about the offline model changes, and that is the single most important risk control in this document.**

Today: localStorage is truth; the network is the slow path; `mergeData` reconciles. That stays. The only thing replaced is the transport inside `sync.js`.

| Concern | Today | After |
|---|---|---|
| Source of truth on device | `localStorage['ptapp-data']` | unchanged |
| Push trigger | debounced 1 s | unchanged |
| Conflict detection | HTTP 409 on `sha` mismatch | `update … where version = $n` affects 0 rows |
| Conflict resolution | fetch remote → `mergeData` → retry, ×3 | **identical code path**, ×3 |
| Foreign-blob migration | `migrateData(clone(remote))` | unchanged — the jsonb comes back as the same object shape |
| Guard rails | `initialLoad` + `syncReady` + `skipSync` | unchanged, all three |
| Failure surfacing | `syncStatus`, never `.catch(()=>{})` | unchanged, plus a new terminal state (below) |

**Multi-user does not create new merge cases, because tenants do not share rows.** Two devices editing one coach's data is the case already solved. Two coaches never touch the same row. The one genuinely new write path is `client_requests`, and it is insert-only from the client and drain-then-apply on the coach — no merge required.

Four offline behaviours that must be built deliberately:

1. **Expired session ≠ locked app.** `TOKEN_EXPIRED` today routes to `TokenUpdateModal`. The equivalent, `AUTH_EXPIRED`, must render the app **fully, on local data, read-write**, with a persistent banner. If a lapsed refresh token ever black-holes Elie's client list mid-session, that is a worse outage than any data bug. The auth gate must be `hasLocalData || hasSession`, never `hasSession` alone.
2. **Offline-first login is impossible; offline-first *re-*login must not be needed.** Set the refresh window long (Supabase default 30 days rolling is fine and it refreshes on every successful sync).
3. **The reconcile drain is idempotent.** Applying `client_requests` marks rows `applied` server-side *after* the coach's blob push succeeds, not before — otherwise a failed push silently eats a client's confirmation.
4. **Airplane-mode cold start must render.** Apple reviewers test this; a white screen reads as a web wrapper under 4.2. Today the app passes because localStorage. Keep it passing — that is a test in the sanity suite, not a hope.

---

## 7. Data preservation vs. account deletion

Apple 5.1.1(v) requires deleting the account record and associated personal data. CLAUDE.md requires never deleting client data. Both can be satisfied because **they are about different records**:

- Deleting a **client's account** deletes: the `auth.users` row, the `memberships` row, and the `client_views` projection. It does **not** touch the coach's blob.
- The client record inside the coach's blob is **the trainer's business record** — the trainer's own commercial data about a service he performed, retained under the trainer's lawful basis, not the client's account data.
- The privacy policy must say this in one plain sentence, and the deletion confirmation screen must say it too: *"Your login is deleted. Your trainer keeps his own record of sessions you attended."*
- Deleting a **coach's** account archives their `tenants` row into `tenant_snapshots` with `reason='account-deleted'` and nulls the login. Nothing is dropped.

This also needs a `docs/privacy.md` + gh-pages page update **in the same release**, and the Play Data Safety declaration updated to include **email address** and **account creation = yes**.

---

## 8. UI surface

### 8.1 PT-facing (Elie and coaches) — deliberately almost nothing changes

- `TokenSetup.jsx` (94 lines) → **`AuthGate.jsx`**: email, password, "Sign in". No signup link. Keeps the `DEMO` escape hatch during the transition (§10, Phase 4).
- `TokenUpdateModal.jsx` (61 lines) → **`SessionExpiredModal.jsx`**: re-enter password, resume. Same red-dot routing.
- `General.jsx`: "Update sync token" → "Account" (email, sign out, delete account). Cloud backup/restore now hit `tenant_snapshots` instead of `snapshots/*.json` — **same two buttons, same UX**.
- **New, Phase 5:** a "Team" screen visible only to `role='owner'` — list coaches, invite by email, open a coach's dataset read-only. One new component, ~200 lines. Elie's existing four tabs are untouched.
- **New, Phase 5:** a "Requests" badge on Schedule when `client_requests` are pending.

The four tabs, the reducer, every kernel in the CONVENTIONS table, and `Schedule.jsx`'s 752 lines: **not touched by this work at all.** That is the design goal, not a happy accident.

### 8.2 Client-facing — a separate, minimal surface in the same binary

Same app, different root: on sign-in, `role='client'` renders `<ClientApp>` instead of the four tabs. Three screens, read-only plus a confirm button:

1. **My sessions** — upcoming and past, Confirm / Decline / Request reschedule (writes `client_requests`).
2. **My program** — reuses `ProgramViewer.jsx` (125 lines) verbatim, fed from `client_views.data`.
3. **My progress** — evaluations + 1RM classification, reusing `EvalSection.jsx` / `NormChartsView.jsx`.

Reuse is the point: three existing components, one new shell, no new domain logic, no second kernel. Open booking from free slots calls **`suggestBookingTime`** for validation — the same kernel, so the client app cannot invent a booking rule.

---

## 9. Capacitor / native build impact

| Item | Change |
|---|---|
| Deep links | Only needed for magic link and password-reset emails. **Phase 5.** Android: `assetlinks.json` on gh-pages + intent filter. iOS: associated domains + `apple-app-site-association`. Both need `spotset.app` registered — this promotes "buy the domain" from a nice-to-have to a **Phase 5 dependency**. Password-based sign-in needs none of it, which is another reason it goes first. |
| Token storage | `@capacitor/preferences` for the refresh token on native; localStorage on web. Supabase's `createClient({ auth: { storage: … } })` takes a custom adapter — ~15 lines. |
| Network permission | Already granted (the app talks to GitHub today). New host `*.supabase.co` — no manifest change on Android; iOS ATS is satisfied (TLS). |
| Service worker | `public/sw.js` `CACHE_NAME` is still hardcoded `'ptapp-v1'` and never versioned — flagged High in the 2026-04-02 review, **still unresolved**. Shipping an auth change behind a never-invalidated cache is how a device gets stuck on a build that talks to the wrong backend. **Fix this in Phase 0**, before anything else: `CACHE_NAME = 'spotset-' + __BUILD_ID__`. It is a two-line fix and it is a prerequisite for every rollback in §10. |
| iOS platform | Unchanged plan — `ios/` generated on Codemagic, never committed. |
| Play declarations | App access: replace `DEMO` with real reviewer credentials **only after the account exists and has been tested against that exact versionCode**. Data safety: add email, account creation. |
| Apple declarations | Real trainer demo account in App Review Information. Populated: ≥4 clients, ~14 sessions, ≥1 evaluation, ≥1 generated program. A second client-role account once Phase 5 ships. |

---

## 10. The sequencing — this is the actual deliverable

Design principles for the order, in priority sequence:

1. **Elie's data lives in two places, independently readable, at every moment.**
2. **Elie's cutover happens on the PWA**, where rollback is a `git checkout gh-pages` and a redeploy. **Native binaries can only be halted, never recalled** — so no native release carries a change Elie depends on until the web has run it for a week.
3. **Every phase is a separate deploy with its own rollback**, and no phase both changes the write path and changes the read path.
4. **A snapshot gate before every data-touching step**, per the standing rule, with a byte-count verification, not a hope.

---

### Phase 0 — Make rollback real (½ day, no user-visible change)

| | |
|---|---|
| **Ships** | Versioned `CACHE_NAME` in `public/sw.js`. A `scripts/sanity/live-supabase-diff.mjs` skeleton. `scripts/snapshot-live.mjs` — pulls `data.json` to `_archive/PTApp/data-snapshots/YYYY-MM-DD-<desc>.json` and **asserts byte count against the API's reported size**, exit 1 on mismatch. Supersede the `changelog-technical.md:2152` counter-principle in writing. |
| **Why first** | Every rollback below assumes a stale service worker cannot strand a device on the old bundle. Today it can. |
| **Rollback** | Trivial — no data path touched. |
| **Gate** | Sanity suite still 13/16. |

### Phase 1 — Supabase project + schema + a one-way mirror (2 days)

| | |
|---|---|
| **Ships** | Supabase project (free tier — it holds only copies). Schema and RLS from §4/§5 applied via `supabase/migrations/*.sql`, **committed to the repo**. `src/backend/supabase.js` (new, ~120 lines). A **Node script**, `scripts/mirror-to-supabase.mjs`, run manually from Pierre's laptop, that reads live `data.json` and upserts it into `tenants`. **No app code changes. No deploy.** |
| **Elie's experience** | Nothing. He is not told, because nothing changed. |
| **Rollback** | Delete the Supabase project. |
| **Gate** | `select octet_length(data::text) from tenants` equals the byte count of the archived snapshot, ±0 after `JSON.stringify` normalisation; `dataEquals(pullFromSupabase(), pullFromGitHub())` returns true. This is the existing live-diff discipline pointed at a storage move instead of a schema bump. |

### Phase 2 — Dual-write, GitHub still authoritative (2–3 days) 🔒 *the safety phase*

| | |
|---|---|
| **Ships** | `src/sync.js` refactored into `src/backend/index.js` with two drivers: `githubDriver` (today's code, moved) and `supabaseDriver`. A build-time flag `BACKEND_MODE = 'github-primary'`. Every successful GitHub push is followed by a **best-effort, non-blocking** Supabase write. Failures of the Supabase leg set a *separate*, non-alarming status — they must never turn Elie's dot red and must never block the GitHub push. Supabase is written with an **anon session belonging to a service account Pierre owns**, not Elie's login (no login exists yet). |
| **Elie's experience** | Nothing. Same screens, same token, same red dot semantics. |
| **Rollback** | Flip `BACKEND_MODE`, rebuild, redeploy gh-pages. ~10 minutes. The GitHub path is untouched code. |
| **Gate** | Run for **7 days minimum**. Daily: `node scripts/sanity/live-supabase-diff.mjs` must report the two stores byte-identical after normalisation. Any divergence stops the plan until explained — a divergence here is exactly the class of bug that would eat records in Phase 3. |
| **Risk killed** | By the time we cut over, Supabase has independently reproduced a week of Elie's real writes, including his real conflict patterns from three devices on bad internet. |

### Phase 3 — Login for Elie, Supabase primary, GitHub as the shadow (3–4 days) 🔴 *the dangerous one*

| | |
|---|---|
| **Ships** | Supabase **Pro ($25/mo) turned on the day before** — free tier has no backups and pauses after 7 idle days, which is disqualifying for live records. `AuthGate.jsx` replaces `TokenSetup.jsx`. Elie's account created by invite, `orgs`/`memberships` rows seeded, `tenants.coach_id` = Elie. `BACKEND_MODE = 'supabase-primary'` — reads and writes go to Postgres, **and every successful push is still mirrored to GitHub**, now in the reverse direction. `DATA_VERSION` stays **6**; there is no schema change, so there is no migration and no migration bug. |
| **Deploy target** | **PWA only.** No Play upload, no TestFlight. Elie is on the web app; that is where a mistake is reversible. |
| **Elie's experience** | One-time: "sign in with your email". The PAT screen is gone. Everything else identical. **Rehearsed with him beforehand, not sprung on him**, and not on a day he has clients back-to-back. |
| **Rollback** | Redeploy the previous `index.html`/`sw.js` to gh-pages (Phase 0 made this actually take effect). Elie re-pastes the PAT — which still works, because the GitHub token is not revoked and `data.json` is still current via the reverse mirror. **Recovery time: under 15 minutes, and zero data reconstruction**, because the shadow write kept GitHub live. |
| **Gates, in order** | (1) Snapshot to `_archive/PTApp/data-snapshots/2026-XX-XX-pre-supabase-cutover.json`, byte-verified. (2) `tenant_snapshots` row written with `reason='pre-migration'`. (3) Phase-2 diff clean for 7 consecutive days. (4) Pierre signs in on Android **and** confirms Elie's iPhone shows the new build (the stale-bundle trap: a device on an old bundle must not be writing through the old path while the new path is authoritative). (5) The PAT is **not** revoked for 30 days. |
| **Explicit non-goal** | No roles, no client access, no UI beyond the login screen. One variable changes: where bytes live. |

### Phase 4 — Native catches up; store declarations updated (2 days)

| | |
|---|---|
| **Ships** | Android `versionCode 4 / versionName 3.0.0` to the **same closed-testing track**. A **real seeded demo account** (`review@spotset.app`) in its own org with fabricated data — this is what Apple gets, and it also retires the awkwardness of `DEMO`. **The local `DEMO` mode stays in the code**, because removing it and changing the auth path in one release is two failures in one build. Play App-access credential updated to the real account **after** verifying it signs into that exact build. Data-safety updated (email, account creation). Then iOS: Codemagic pipeline, TestFlight, App Store submission with the real reviewer account. |
| **Play clock** | Unaffected — the 14-day requirement counts *tester opt-in continuity*, not builds. Shipping mid-window is expected by Google ("respond to tester feedback and resolve identified bugs"). The only real hazard is a **review rejection of the release**, which does not touch the clock, and it is defused by testing the declared credential against the uploaded artifact before submitting. |
| **Rollback** | Halt the Play rollout (blocks further distribution; does not recall installs). **This is why Phase 3 was web-only** — by now the code has run on Elie's live data for a week. |
| **Gate** | Verify the versionName **inside the .aab**, never `gradlew`'s exit code (it exits 0 on failure and leaves the previous bundle in `outputs/`). JDK 21. Re-apply the signing block after any `npx cap add android`. |

### Phase 5 — Coaches, then clients (5–8 days, split into two releases)

| | |
|---|---|
| **5a — Coaches** | Invite Edge Function, "Team" screen for `role='owner'`, a second `tenants` row for coach #2. **Elie's row is never read or written by this work** — a new coach starts empty, so the blast radius of a bug is a dataset with nothing in it. Owner read-only view of a coach's data. |
| **5b — Clients** | `client_views` trigger, `client_requests` table, `<ClientApp>` shell over the three existing components, the drain-and-apply step in `reconcile()`, account deletion, magic-link + deep links (needs `spotset.app`). Target audience stays 18+. |
| **Rollback** | Both are additive: new tables, new components, `role`-gated rendering. Reverting is a redeploy; no coach data and no client data flows into Elie's blob except through the drain step, which is behind one `if`. |
| **Gate** | Before 5b, an RLS test suite: sign in as coach #2 and assert every query against Elie's org returns zero rows. Automate it in `scripts/sanity/`. |

### Phase 6 — Only when it earns its place

Shred the blob into `clients`/`sessions`/`evaluations`/`programs` rows with `trainer_id`, **keeping the `data jsonb` column populated in parallel until the row tables verify byte-for-byte against it**. Not needed for correctness, only for scale and for server-side queries. There is no deadline; the 1 MB GitHub ceiling that used to force this stops existing at Phase 3.

**Total: roughly 15–20 focused working days**, spread over part-time weeks, with two hard waits (the 7-day dual-write soak, the 30-day PAT retention).

---

## 11. File-level impact in `src/`

| File | Lines now | Change |
|---|---|---|
| `src/sync.js` | 144 | **Split.** Becomes `src/backend/index.js` (driver selection, ~40) + `src/backend/githubDriver.js` (today's code moved verbatim, 144) + `src/backend/supabaseDriver.js` (~130). `toBase64` chunking and `serialize` go with the GitHub driver and die with it. |
| `src/App.jsx` | 297 | `getToken()` → `getSession()`; `!!getToken()` gate → `hasSession() \|\| hasLocalData()`; `TOKEN_EXPIRED` → `AUTH_EXPIRED` with a **non-blocking** banner. `reconcile()` keeps its exact structure — fetch, `mergeData`, `dataEquals` ×2, conditional push, `catch` sets `failed`. **The three guards (`initialLoad`/`syncReady`/`skipSync`) are not touched.** Phase 5 adds a role branch at the render root and a `client_requests` drain inside `reconcile()`. ~60 lines changed. |
| `src/components/TokenSetup.jsx` | 94 | → `AuthGate.jsx`, rewritten (~140). |
| `src/components/TokenUpdateModal.jsx` | 61 | → `SessionExpiredModal.jsx` (~70). |
| `src/components/General.jsx` | 494 | Backup/restore repointed at `tenant_snapshots`; "Update sync token" → "Account"; `isDemo()` guards retained through Phase 4. ~50 lines. |
| `src/utils.js` | 1397 | **Zero changes through Phase 4.** `mergeData`, `mergeById`, `migrateData`, `DATA_VERSION`, `loadData`, `saveData`, `dataEquals`, every kernel — untouched. This is the headline safety property. Phase 5 adds an `applyClientRequests(state, requests)` helper. |
| `src/components/{Dashboard,Clients,Schedule,Sessions}.jsx` | 1882 | **Zero changes.** |
| `src/{normCharts,programKernel,programRules,exerciseBank}.js` | 4796 | **Zero changes.** |
| `src/i18n.js` | 635 | New strings: sign in, password, wrong password, session expired, invite, team, delete account, my program, confirm session. EN + AR. **Edit tool only — never round-trip through PowerShell `Get-Content`/`Set-Content`, which mangles UTF-8 and destroys all Arabic.** |
| `src/demoData.js` | 105 | Retained. Becomes the seed script for the real `review@spotset.app` org as well — one source, two destinations. |
| **New** | — | `src/backend/*` (~300), `src/auth.js` (~90), `src/components/AuthGate.jsx`, `SessionExpiredModal.jsx`, `TeamScreen.jsx` (~200, Phase 5a), `ClientApp.jsx` (~250, Phase 5b), `supabase/migrations/*.sql`. |

Net: roughly **900 new lines, ~250 modified, ~7,500 lines of domain logic untouched.**

---

## 12. The three biggest risks in *this* design, and what kills each

### Risk 1 — The Phase 3 cutover strands Elie mid-week with an app that will not sign in
Beirut internet drops during the first sign-in; or the refresh token expires while he is offline at a gym; or a stale service worker keeps his iPhone on the old bundle writing to GitHub while Postgres is authoritative, and the two silently diverge until someone notices a missing session. **This is the failure I actually expect**, and it is a re-run of the April incidents in new clothes.

**What kills it:** (a) The auth gate is `hasSession || hasLocalData` — an expired session shows a banner, never a login wall, and never blocks reading or writing locally. (b) The reverse GitHub mirror runs through Phase 3, so the rollback is a 15-minute redeploy with **zero data reconstruction**, and the PAT is deliberately not revoked for 30 days. (c) Phase 0's versioned `CACHE_NAME` makes that redeploy actually reach both phones. (d) The stale-bundle gate: before flipping the flag, confirm **both** devices report the new version in the debug panel — the same rule CLAUDE.md already carries for adding a collection to `mergeData`. (e) Cut over on a low-session day, rehearsed, with Pierre watching.

### Risk 2 — The blob is the tenant boundary, so a bug that writes the wrong `tenants` row overwrites an entire trainer's business in one PUT
RLS prevents cross-tenant *access*; it does not prevent a same-tenant blind overwrite by a device holding stale state. This is the Apr 13/19 mechanism, and the blob makes its blast radius the whole dataset rather than one record.

**What kills it:** (a) `mergeData` is preserved verbatim and the optimistic-concurrency retry loop is a structural copy of the 409 loop — a stale writer is *forced* through a merge, exactly as today. (b) A **`before update` trigger on `tenants`** rejects any update where `jsonb_array_length(new.data->'clients') < jsonb_array_length(old.data->'clients')` unless an explicit `allow_shrink` flag is set — a database-level tripwire against the one shape of catastrophe that matters. Deletions go through it deliberately; accidents do not. (c) `tenant_snapshots` written automatically on every update where the byte delta exceeds a threshold, plus nightly — server-side, so it survives Pierre's laptop. (d) Supabase **Pro from day one of real data**; the free tier's zero-backup, 7-day-pause behaviour is flatly incompatible with the data-preservation rule. (e) The `_archive/PTApp/data-snapshots/` discipline keeps running as a scheduled export *against Supabase* — a third copy, off-platform.

### Risk 3 — Scope creep turns a storage swap into a platform rewrite and it lands half-finished on a live business
Six phases, three roles, an invite system, a client app, deep links, a domain purchase. The realistic failure is Phase 5 arriving while Phase 3 is still settling — or worse, a "while I'm in there" refactor of `Schedule.jsx` riding along with the auth change, so that when something breaks nobody can tell which change did it.

**What kills it:** (a) **`DATA_VERSION` stays 6 through Phase 4.** No schema change means no `migrateData` step, which means the single highest-risk operation in this codebase is *not performed at all* during the dangerous phase. (b) One variable per release: Phase 2 changes only the write fan-out; Phase 3 changes only which store is authoritative; Phase 4 changes only the packaging. No release changes two. (c) Phases 5a/5b are additive tables and role-gated components — coach #2 starts with an empty dataset, so a bug there cannot reach Elie. (d) Hard rule for the whole programme: **no refactor rides along.** P3/P6 from the review backlog wait. (e) Stop-the-line condition, stated now so it is not negotiated later: **any unexplained byte divergence in the Phase 2 daily diff halts the plan** until it is understood — not worked around.

---

## 13. What to decide before any code is written

1. **$25/mo Supabase Pro from Phase 3** — the free tier is not an acceptable home for Elie's records. This is the only recurring cost the design adds.
2. **No OAuth, ever, without re-reading Guideline 4.8** — the moment "Sign in with Google" is added, Sign in with Apple becomes mandatory. This belongs in TRAPS today.
3. **Confirm the client-record deletion position** in §7 with Elie, since it is his business record and his customer relationship, and it goes into the public privacy policy.
4. **Buy `spotset.app` now** — it is a Phase 5 blocker (deep links) and it costs ~$14.20/yr.
5. **Mark superseded, in the same commit as Phase 0:** `changelog-technical.md:2152`'s single-user principle, and the paused WhatsApp/confirm-page spec (`client_requests` replaces the Cloudflare Worker design).

**Answer to the question Pierre actually asked:** yes, settle it before the Apple submission — but settle it *on paper*, ship Phases 0–2 (which are invisible to Elie and to both stores), and let Apple's submission go in on Phase 4's real demo account rather than on `DEMO`. The Play clock does not care, and Apple's 2.1(a) is easier to satisfy with a real account than with a local seed mode requiring their prior approval.

---

## Judge — data safety

## DATA-SAFETY VERDICT — three designs, one lens

**Scores: A = 7/10 · B = 5/10 · C = 8/10. C wins.**

Grounding probe (run this session, not from docs): `src/utils.js:2` `genId = Math.random().toString(36).slice(2,9)`; `src/utils.js:851` `STORAGE_KEY = 'ptapp-data'` — unnamespaced; `mergeData` (884–918) is whole-blob, union-by-id, `preferLocal = localTs > remoteTs` on a **device clock**; `messageTemplates` has no per-record stamp and is taken wholesale from the preferred side; `sync.js` keeps a module-level `currentSha`.

---

### A — Minimal (blob per coach + projection) — **7/10**

Genuinely strong: `DATA_VERSION` stays 6, **no `migrateData` step at all**, blob shape byte-identical, 30-day shadow-write to GitHub as a one-flag rollback, a parity gate copied from the live-diff discipline. The single largest source of loss in this codebase (a migration) is simply not performed. That earns the 7.

**Worst defect — it never namespaces `STORAGE_KEY`, and that voids its own founding premise.** A's whole safety argument is "tenants can't collide because the data was never in the same document." But local truth still lives at the unnamespaced `ptapp-data`, and A adds three new ways to change identity on one device: sign-out/sign-in, invite redemption, and the retained `DEMO` mode. Sequence: Elie hands his phone to coach Rami, or Rami installs the PWA on a device that once held Elie's blob, or a reviewer types `DEMO` and then a real account signs in. The app boots "offline-first from localStorage" (A §2, mandatory, no network check), finds a populated store, and A §6.5's own rule — *"detects a non-empty local store… adopts the tenant rather than seeding"* — pushes that store into the **new** tenant row. RLS authorises it: the write is correctly scoped to the wrong person's tenant. That is Apr-13 stale-device-overwrite with a fresh cause, plus a cross-tenant leak, in the design that claims per-record authorization was deleted as a problem. A's §12 risk list does not contain it. Its `sanity-projection.mjs` checks the projection payload, not the local store's provenance.

Secondary: A retains all four `isDemo()` guards but removes the condition that made them sufficient — that only one credential ever existed. "Seeds only onto an empty store" does nothing when the demo data *is* the store and a subsequent real login adopts it.

**Keep:** the no-migration property (§0, §6) — this is the correct headline. `buildClientProjection` as a single-source kernel with a hard pre-write assertion + `sanity-projection.mjs`. Projections declared **derived, never authoritative** ("losing every row costs nothing"). Keeping `DEMO` as the airplane-mode fallback rather than deleting shipped, guarded code in the same release that changes auth.

---

### B — Proper (shredded tables, delta sync) — **5/10**

Best *destination*, worst *journey*, and it is the only one that spots three real existing holes: unnamespaced `STORAGE_KEY` (§4.1 — correct and load-bearing), `message_templates` having no per-record stamp (the one collection that can silently lose an edit — confirmed at `utils.js:911-914`), and `genId()`'s 7 chars of `Math.random()` being collision-unsafe once devices mint ids independently. It also mandates replaying the Apr-13/Apr-19 traces as deploy-gate tests. All of that is real work no one else did.

**Worst defect — it moves last-write-wins from a self-correcting whole-blob merge into an authoritative per-row SQL predicate, and removes the redundancy that has been masking a device-clock bug for four months.** `on conflict … do update … where excluded._modified > t._modified` (§4.4, which B calls "the single most important line in this design") arbitrates on the **client's** clock. B correctly refuses to use `_modified` as the *pull cursor* because of clock skew — then uses that same skewed value as the *winner rule* and does not flag it. Today a phone with a clock set a day forward corrupts a record and is one edit away from being corrected, because every push re-asserts the entire dataset over the wire. After B, that record wins permanently, and the good copy is never re-transmitted: delta pull ships only `server_seq > cursor`, and the correct row's seq is already behind the cursor. `>` rather than `>=` also silently drops same-millisecond writes.

Compounding it: the outbox. `ptapp-outbox:<userId>` in localStorage is now the *only* record that a change needs pushing — B itself warns (§8) that WKWebView evicts localStorage under pressure, applies that warning to the refresh token, and not to the outbox. Lose the outbox and a booked session exists on exactly one device forever, with no error. Today that failure mode does not exist.

And the transition is 16 weeks with the blob→relational shred (Phase 2) happening *after* dual-write closes, with only the nightly git export as recourse — the thing B itself calls "not a real rollback." A retains-the-jsonb-column parallel run is exactly what C and A specify and B omits.

**Keep:** `STORAGE_KEY` namespacing (mandatory in *any* design that adds a second identity — A and C both miss it). `message_templates` split to keyed rows. `crypto.randomUUID()` for new ids, legacy ids untouched. `server_seq` as the pull cursor, never a client clock. `force row level security` + `revoke all on schema public from anon` so the failure mode is lockout, not leak. `sanity-rls-matrix.mjs` asserting a **negative** per table × per role, written *before* the policies. Apr-13/Apr-19 replay tests in the deploy gate. `sync_push` must be `SECURITY INVOKER`. Client writes through three RPCs because RLS cannot restrict columns — correct and non-obvious. The account-deletion resolution (business record survives, account record dies).

---

### C — Risk-first — **8/10**

C is the only author who treats **reversibility as the deliverable**. Phase 0 versions `CACHE_NAME` *first*, on the explicit ground that every later rollback is fiction while a stale service worker can strand a phone on the old bundle — that is the correct read of the still-open High-severity finding from 2026-04-02, and neither A nor B makes it a prerequisite. Phase 1 is a mirror with zero app changes. Phase 2 is dual-write with GitHub still authoritative and a **daily byte-diff soak for 7 days with a stated stop-the-line rule** — Supabase independently reproduces a week of Elie's real three-device conflict traffic before anything depends on it. Phase 3 cuts over **on the PWA only** ("native binaries can only be halted, never recalled"), keeps a reverse mirror to GitHub, and deliberately does not revoke the PAT for 30 days: rollback is a redeploy plus a paste, with **zero data reconstruction**. `DATA_VERSION` frozen at 6 through Phase 4. It carries the stale-bundle gate (both phones must report the new version before the flag flips) — the trap CLAUDE.md already records for `mergeData` key lists, which A does not mention at all. One variable per release, no refactor rides along.

**Worst defect — Phase 2 puts a shared, live-data-writing credential inside a public bundle, and C's own §5 forbids exactly that.** §10 Phase 2: *"Supabase is written with an anon session belonging to a service account Pierre owns, not Elie's login (no login exists yet)."* That account's email and password must ship in `dist/index.html`, which is deployed to gh-pages from the **public** `pih-dev/PTApp` repo. Under C's own `tenant_rw_own` policy (`coach_id = auth.uid()`), that service account *is* the owner of Elie's tenant row — so anyone who opens DevTools gets full read/write on the entire live business dataset, unauthenticated-by-invitation and unrevoked. That is strictly worse than the PAT, which at least never entered the bundle, and it directly violates C's stated rule *"there is no service-role key in the client bundle, ever"* and the standing TRAPS line *"never hand out a credential that reaches live data."* Fixable — make Phase 2's mirror a server-side/CI or laptop-run job keyed off the GitHub commit stream rather than an in-app fan-out — but as written it is a live-data breach for the duration of the safety phase.

Secondary: the `before update` shrink tripwire only compares `jsonb_array_length(data->'clients')`; a push that drops every session, evaluation and program passes it. Extend to all six collections and to a byte-delta floor. And the `client_views` trigger re-shreds the whole blob on every 1-second-debounced push — write amplification, not loss, but it will be felt.

**Keep:** Phase 0 (`CACHE_NAME` versioning as a rollback prerequisite) — adopt this regardless of which design wins; it is the highest-value half-day in all three documents. The 7-day dual-write soak with a daily byte-diff and an explicit halt condition. PWA-first cutover with the PAT retained 30 days. The stale-bundle two-device gate. `DATA_VERSION` frozen through the dangerous phase, stated as a deliberate risk control. `tenant_snapshots` server-side on byte-delta + nightly (survives Pierre's laptop). The `before update` anti-shrink tripwire (widened). `client_requests` as insert-only + drain-and-apply through the existing reducer, so `buildSession` stays the only session constructor. `scripts/snapshot-live.mjs` asserting byte count and **exiting 1** on mismatch, instead of a manual verification nobody performs.

---

### Cross-cutting, missed or half-missed by all three

1. **Only B namespaces `STORAGE_KEY`.** A and C both introduce multiple identities on one device while leaving local truth at a shared key. This is the single most likely way Elie's records get pushed into the wrong tenant. Non-negotiable in whichever design ships.
2. **No one addresses `messageTemplates` losing an edit** except B — it is the one collection with no per-record stamp today, and every design that keeps the blob keeps that hole.
3. **`sync.js`'s module-level `currentSha`** survives untouched in A and C's driver split; A and C both map 409→`version` cleanly, but neither says what resets the cached version on a driver flip. A stale cached concurrency token at the exact moment of a rollback is a blind overwrite.
4. **All three defer the shred behind "keep the blob column until row-parity is proven" — except B**, which is the one that actually performs it.

### Ruling

**C.** On this lens the question is not which architecture is most correct at rest — B is — but which sequence can be undone at every moment while Elie is running a business on it. C is the only design where rollback is *verified reachable* (SW cache first), *soaked against real traffic* (7-day diff with a halt rule), *tested on the surface that can be recalled* (PWA before native), and *free of reconstruction* (reverse mirror + unrevoked PAT). A is a close second and simpler, and its no-migration property is the correct core; adopt A's shape inside C's sequence. B's end state is the destination, but its delta/outbox layer trades a self-correcting merge for a per-row LWW arbitrated by a client clock — that is a regression in loss-resistance, in a codebase that has already lost data twice at precisely that layer.

Two conditions on the win: kill C's Phase-2 in-bundle service credential (move the mirror server-side), and import B's `STORAGE_KEY` namespacing and RLS negative-matrix test wholesale.

---

## Judge — store reality

## LENS: STORE REALITY — verdict

### DESIGN A (minimal) — **7/10**

**What it gets right on this lens:** own email+password ⇒ 4.8 never fires (correct). A *real, populated, live* reviewer account as the primary Apple answer ⇒ 2.1(a) default path, no prior-approval request needed. Ships in-app deletion despite the forum exemption. Verifies the declared credential against the uploaded binary. Fastest to an Apple submission (2–3 weeks), which is the only design that plausibly submits before the Play production-access application comes due.

**Single worst defect — the client reviewer account is guaranteed to look broken.** A's `client_views` rows are written *by the coach's device on push*. The demo tenant has no coach device pushing. A's own §12 says anything older than 48h renders muted with *"your trainer's app hasn't synced recently."* So `review-client@spotset.app` — an account A explicitly tells Apple to test — lands on a greyed-out read-only list carrying a staleness warning, permanently. That is a 2.1 "incomplete" / 4.2 "minimum functionality" read on a screen A volunteered to the reviewer. A never noticed because it thinks of staleness as a UX nicety, not as the state a reviewer will always be in.

**Second flaw:** A keeps the `DEMO` magic string and tells Apple about it in Review Notes as an "offline fallback." A built-in demo mode is 2.1(a)-legal *only with prior approval*. Mentioning it unapproved is either noise or an invitation to ask why a login field has an undocumented bypass (2.3.1 hidden functionality). A treats "declare it and it's fine" as settled; it isn't.

**Also glossed:** `review@spotset.app` — A does not buy the domain (it lists it nowhere as blocking, unlike B and C). Supabase's built-in SMTP is rate-limited and non-production; a reviewer account on a domain you don't control, with confirmation email on by default, is a credential that can fail to exist on submission day. A's own rule is "must survive the whole review."

---

### DESIGN B (proper) — **6/10**

**What it gets right:** the sharpest single store insight in all three documents — **push v2.15.1 to internal TestFlight now**, because internal TestFlight skips App Review entirely, so the whole Windows-hosted-Mac-Codemagic-certs-provisioning pipeline gets debugged months before it matters, on a build you already trust. That retires the largest unpriced risk in the Apple path and neither A nor C thought of it. Its account-deletion wording (§7) is the best of the three, EN+AR, and correctly separates *client record* (trainer's, retained) from *client account* (person's, deleted).

**Single worst defect — it puts every store surface last, at week 16, all at once.** Phase 5 is "store" and it fires after auth, RBAC, delta sync, coach invites, client shell, account deletion, deep links, Universal Links and Android App Links have all landed. That is the maximum number of simultaneous first-time rejection surfaces on the most-churned codebase, submitted at the moment Pierre has the least remaining patience. Store review is not a phase you append; it is a gate you want to cross early on a small diff.

**And B contradicts itself on the one thing that already got rejected once.** §7 says the Play App Access declaration must be updated *before* uploading. But §9 ships **v3.0 to the closed track at Phase 1 (week 4)** while putting all declaration work in Phase 5 (week 16). Meanwhile Phase 1 **deletes `demoData.js` and rips out all five `isDemo()` choke points**. So the uploaded v3.0 has no working `DEMO`, and the console still declares `DEMO`. That is *exactly* the automated check that killed versionCode 2 on 2026-08-20 ("Missing sign in details"). B re-creates its own known rejection and doesn't see it.

**Also glossed:** B makes `spotset.app` + Universal Links **blocking** (§8, "week 1"). Serving `apple-app-site-association` from GitHub Pages — extensionless file, content-type, no-redirect requirement, Apple's CDN fetch — is an unverified dependency B asserts rather than checks, and it is now on the critical path for password reset and invitations. Adding a hard external dependency to a store submission is a cost B books as $14.20/yr.

---

### DESIGN C (risk-first) — **8/10**

**What it gets right — it is the only design whose *sequencing* is store-shaped rather than engineering-shaped.** Phases 0–2 are invisible to both stores. Phase 3 (the dangerous cutover) is **PWA-only: no Play upload, no TestFlight** — so the auth change proves itself on real data on a surface with a 15-minute rollback, before any binary that cannot be recalled carries it. Phase 4 is the only release that touches store metadata, and it changes packaging only.

Three store judgements no other design makes explicitly:
- **It keeps the local `DEMO` mode in the build through Phase 4** — "removing it and changing the auth path in one release is two failures in one build." That means the Play declaration and the code path can be swapped in either order without a window where the declared credential doesn't work. This directly defuses the versionCode-2 rejection class.
- It answers the Apple 2.1(a) question the right way round: **a real account is strictly easier to defend than asking Apple to approve a demo mode** — and correctly identifies that as *the reason to do the auth work before Apple submission*, which is the question actually asked.
- It gates on verifying the credential against **that exact uploaded artifact**, plus verifying versionName inside the `.aab` (not `gradlew`'s lying exit code).

**Single worst defect — Phase 4 is still one release carrying four first-time store events**: new auth in a binary, App Access credential swap, Data Safety rewrite, and the entire first-ever iOS submission. C spent five phases decomposing *data* risk and then left *store* risk as one undifferentiated block. It should split: Play versionCode 4 with the credential swap first, verified green, and iOS separately behind it. C also never proves the iOS pipeline works before the submission that depends on it — B's internal-TestFlight-now move belongs here.

**Second flaw:** C's realistic path to an Apple submission is 4–6 weeks (15–20 focused days + a mandatory 7-day soak + a 30-day PAT retention it treats as concurrent). It presents this as the safe middle; it is safe, but it is not fast, and C doesn't state the calendar number anywhere the reader can hold it.

---

### Defect all three share, and it is the most expensive one

**None of them says what happens to the Play closed test between now and their Phase 1.** The build submitted 2026-08-20 is in "Changes in review." The 14-day continuous-opt-in clock **has not started** and will not start until Pierre rolls the release out *and distributes the opt-in link himself* — Google emails testers nothing. That clock is the only store thing actually running today, it costs zero engineering, and it gates production access. Every one of these designs is a 3-to-16-week program that quietly assumes it. Whichever wins, the first action is not architectural: **roll out on approval, send the 14 testers the opt-in link, keep a buffer above 12, and apply for production access at day 14 on v2.15.1/`DEMO`** — before any auth change ships.

Second shared gap: all three declare reviewer accounts at `@spotset.app`, a domain nobody owns yet, on Supabase's non-production built-in SMTP. A reviewer account that cannot receive a confirmation or reset mail is a 2.1(a) failure with a one-line cause.

---

### Worth keeping from each

- **From A:** the two-reviewer-account pattern (owner-role + client-role, both populated with 4 clients / 14 sessions / 1 evaluation / 1 program) — that is the correct 2.1(a)+4.2 shape. And its reasoning for *retaining* `DEMO` as the airplane-mode-survivable path, which is the documented 4.2 white-screen trap.
- **From B:** **internal TestFlight on v2.15.1, this week.** No App Review, proves Codemagic/certs/`cap add ios`-on-a-hosted-Mac months early. Plus its account-deletion wording verbatim, and the TRAPS entry "adding Google sign-in makes Sign in with Apple mandatory."
- **From C:** the whole sequencing spine — PWA-first cutover, `DEMO` retained across the auth change, declarations updated only in a packaging-only release, credential verified against the exact uploaded artifact, and versioning `CACHE_NAME` in Phase 0 (a stale service worker means a store rollback that never reaches the device).

---

### Winner on this lens: **DESIGN C**

It is the only one that treats store review as a *gate crossed on the smallest possible diff*, and the only one that structurally prevents re-running the "Missing sign in details" rejection Pierre already ate. A is faster but hands Apple a reviewer account that is designed to display a staleness warning. B is the most correct per-guideline and has the single best Apple idea, but sequences all store work into one 16-weeks-out block and contradicts itself on when the Play declaration changes.

**C plus two grafts:** take B's internal-TestFlight-now into C's Phase 0, and split C's Phase 4 into 4a (Play, credential swap, verified) and 4b (iOS submission).

---

## Judge — buildability

## Verdict on BUILDABILITY

Grounded probes (this session): `genId` is 7 chars of `Math.random()` (`src/utils.js:2`), `STORAGE_KEY = 'ptapp-data'` unkeyed (`utils.js:851`), 12 `isDemo()` references across `src/`, 16 sanity scripts, `App.jsx` 297 lines / `sync.js` 144.

---

### DESIGN A (minimal) — **7/10**

**Reasoning.** Correct core instinct: one blob per coach, `DATA_VERSION` stays 6, `utils.js` untouched, no `migrateData` step. That single property removes the highest-risk operation in this codebase from the highest-risk release. Shadow-write for 30 days with a one-flag rollback is cheap and real. Keeping `DEMO` rather than deleting shipped, guarded code is the right call and the only one of the three that argues it properly.

**Effort estimate is dishonest by ~3x.** §11 totals 8–11 *days* of focused work, then §11's closing line converts that to "2–3 weeks of part-time evenings." At the 8–10 h/week Design B assumes, 8–11 days = 64–88 hours = **7–9 weeks calendar**. A never applies the part-time divisor. Everything downstream (Apple submission timing, "Phase 1 runs in parallel with enrolment") is built on that error.

**Single worst defect: the device-written per-client projection is stale by construction and has no rebuild path.** `client_views` is upserted "after a successful blob update … whose payload hash changed." But the payload contains `renewalDue`, `remaining` and `sessionsCounted` — **time-dependent values that change with the calendar, not with an edit.** A coach who edits nothing for two weeks pushes nothing, so no projection is rewritten, so the client sees a renewal state that expired days ago and can never refresh. A's own mitigation ("losing every row costs nothing, the next push rebuilds them") is false for the same reason: there is no next push without an edit. This needs a forced periodic full rebuild that the design does not specify, does not budget, and which reintroduces exactly the "coach's device is the server" coupling it was meant to avoid.

**Second flaw, glossed:** A defers owner→coach oversight and calls un-deferring it "one `using` clause plus a tenant switcher; no data moves." That is wrong at the app layer. Every screen takes one `state` object; a Dashboard spanning three coaches' blobs means loading N blobs and merging views across them — a real refactor of the four tabs, not an RLS edit. A has deferred the actual product definition (Owner manages coaches *and* clients) while understating the cost of undeferring it.

**Worth keeping:** the blob-per-tenant Phase 1; `utils.js` zero-diff; the 30-day shadow-write; keeping `DEMO` as the airplane-mode fallback alongside a real reviewer account; the offline-boot rule stated as an inversion of today's `validateToken()` behaviour.

---

### DESIGN B (proper) — **4/10**

**Reasoning.** Best *engineering* document of the three by a wide margin — the `(select auth.uid())` InitPlan point, `force row level security`, `revoke all on schema public from anon`, client writes through three RPCs because RLS cannot express column restrictions, the two-clocks argument (`_modified` for who wins, `server_seq` for what ships). Whoever wrote this knows Postgres. It is also the design least likely to ship.

**16 weeks is understated by 2–3x.** At 8–10 h/week that budget covers: auth, delta sync with an outbox, a `server_seq` cursor, eight shredded tables with RLS, three security-definer RPCs, an invitations Edge Function, an RLS matrix harness, a five-gate migration, an IndexedDB port, a four-screen client shell, a People screen, and two store submissions. Phase 1 alone — "auth, sign-in screen, api.js, delta sync, outbox, namespaced cache, migration G0–G4, dual-write" — is budgeted **3 weeks / ~27 hours**. That is a fantasy. Realistic total is 300–400 hours.

**Single worst defect: it deletes the one subsystem that has already lost data twice, and replaces it with a hand-rolled one, to solve a scale problem that does not exist.** The live blob is 152 KB. Nothing in the three-role product requires delta sync — tenants don't share rows, so a whole-blob-per-tenant push is fine at 100x current size, especially once the 1 MB GitHub ceiling is gone (which B itself points out). B introduces outbox stamping, a server sequence, tombstone propagation, per-collection `migrateData`, and a "stale bundle refuses to push" nag — and then names delta sync as its own risk #1: *"replacing a merge you have hardened over four months with one you wrote last week."* Correct. The answer to that sentence is not "write good tests"; it is **don't do it.**

**Compounding:** B changes four things in `utils.js` simultaneously (`STORAGE_KEY` namespacing, `genId`→`randomUUID`, `mergeData`→`mergeDelta`, per-collection `migrateData`) inside the same release that changes auth and transport. A and C both hold "one variable per release"; B never states it and violates it in Phase 1.

**Overstated:** the `genId` collision argument. 36⁷ ≈ 7.8×10¹⁰; at 10,000 records the birthday probability is ~0.06%. Worth fixing eventually, not the 🔴 B paints. Also `sessions_select` composing through `clients`' RLS via a correlated `exists` is clever but is a per-row subquery on the exact table B warns about for scan cost — it asserts composition rather than proving it, and the matrix test doesn't check performance.

**Worth keeping — and these are the best individual ideas in the whole set:**
1. **`sanity-rls-matrix.mjs` written and failing before the policies exist.** Five synthetic users, positive *and* negative assertion per table × role, in the deploy gate so a new table without a policy fails the build. Nothing else in any design catches the silent "forgot `enable row level security`" failure.
2. **Replay the Apr-13 and Apr-19 incident traces as tests** against whatever the new write path is.
3. **Push v2.15.1 to TestFlight *internal* now** — internal skips App Review, so the entire Codemagic/certs/`cap add ios`-on-a-hosted-Mac pipeline gets debugged on a build already trusted, months before it's load-bearing. Zero risk, retires the largest unknown. Neither A nor C proposes this.
4. The account-deletion wording (client *record* is the trainer's; client *account* is the person's) — B's phrasing is the crispest.
5. `force row level security` + `revoke all from anon` + service_role key never in the bundle.

---

### DESIGN C (risk-first) — **8/10**

**Reasoning.** Same low-risk core as A (blob in a jsonb column, `DATA_VERSION` stays 6, `utils.js` zero changes through Phase 4, the 409 loop maps to a `version` counter) plus the only sequencing in the set that a solo developer can actually survive.

Three sequencing insights the others miss:
- **Phase 0 fixes `CACHE_NAME` first, alone, because every later rollback depends on it.** A and B both mention the unversioned service worker; both schedule it *inside* the big release. C identifies it correctly as a **precondition for rollback existing at all** — a stale SW means the redeploy you're counting on never reaches the phone.
- **Phase 2 dual-write with a 7-day byte-identical soak on Elie's real writes**, with an explicit stop-the-line on any unexplained divergence. This buys empirical proof that Supabase reproduces his actual three-devices-on-bad-internet conflict patterns *before* anything depends on it. A's shadow-write runs *after* cutover; C's runs *before*. That ordering is the difference between a test and a hope.
- **Cut over on the PWA, never first on a native binary.** "Native can be halted, never recalled" is true and is the cheapest insurance in the document.

Effort (15–20 focused days + two hard waits) carries the same part-time understatement as A, but C is the only one that names calendar-blocking waits as first-class items, so the shape of the schedule is honest even where the number isn't.

**Single worst defect: the `before update` trigger rejecting a shrinking `clients` array.** It fires on the *legitimate* case — `DELETE_CLIENT` — which forces an `allow_shrink` escape hatch that the app must set, and every real deletion trains Pierre to reach for the switch that disables the guard. It protects one array while `sessions`, `programs` and `auditLog` (far likelier to shrink accidentally, and where the Apr-13/19 losses actually happened) are unguarded. And its failure mode is a Postgres trigger throwing mid-sync, surfacing as a red dot Pierre has to debug from his phone. It is theatre: the optimistic-concurrency merge loop already forces a stale writer through `mergeData`, which is the actual defence. **Cut it and keep `tenant_snapshots` + the nightly export**, which are the parts that work.

**Second flaw, unaddressed:** Phase 2's dual-write leg writes to Supabase "with an anon session belonging to a service account Pierre owns." That account's credentials must live in the deployed bundle — and **`pih-dev/PTApp` is a public repo**. RLS confines it to one row, so the blast radius is bounded, but a design whose founding trap is *"never hand out a credential that reaches live data"* cannot leave this in a table cell unexamined. Fix: run the mirror leg from Pierre's laptop on a schedule for the soak, not from the client bundle.

**Third:** the Phase 5 `client_views` plpgsql trigger shredding nested jsonb is not ~60 lines, and Pierre writes zero SQL today. C sells "the coach app is unaware it exists" as a virtue; it's an invisible coupling that breaks silently every time the blob shape changes. Still the lesser evil versus A's device-written projection (which has the staleness bug), and it's Phase 5, so it's deferrable.

**Worth keeping:** Phase 0 as a standalone rollback-enablement release; the pre-cutover dual-write soak with a stop-the-line; PWA-first cutover; PAT not revoked for 30 days; the stale-bundle gate (both phones show the new version before flipping the flag) reused from the existing `mergeData` trap; `client_requests` as an insert-only queue drained through the existing reducer actions so `buildSession` stays the only session constructor; "no refactor rides along — P3/P6 wait."

---

## Winner on buildability: **DESIGN C**

C ships the same minimal architecture A does, but with the ordering that makes each step reversible on a live business — and reversibility, not elegance, is what a part-time solo developer in Beirut actually needs. A is a close second and has the better Phase-1 scope discipline; B is the design most likely to be abandoned at 60% with Elie's business half-migrated.

**What I'd actually build:** C's phase sequence, with A's device-light Phase 1 scope, plus three transplants from B — `sanity-rls-matrix.mjs` written before the policies, the Apr-13/Apr-19 replay tests, and TestFlight *internal* with v2.15.1 starting this week. Delete C's shrink trigger, move the Phase-2 mirror leg off the public bundle onto Pierre's laptop, and specify a forced projection rebuild (cron, server-side) before any client-facing phase.

**The flaw all three share:** every one budgets in "focused days" and reports in "weeks" without applying the part-time divisor. Multiply all three estimates by 2.5–3 before Pierre commits to anything.
