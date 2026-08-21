# Backend platform decision — Supabase now, VPS later

**Decided 2026-08-21, in conversation with Pierre.** Supersedes the platform half of
`docs/2026-08-21-multi-user-accounts-decision.md`, which was written before Pierre reframed
Calnorm as a real business with SpotSet as product #1.

---

## 0. The decision, in one line

**Managed Postgres on Supabase's free tier now; migrate to a self-hosted Postgres on a small VPS
if and when a free-tier limit actually bites.** Do not pre-buy the paid tier.

---

## 1. What was actually being replaced

Not the hosting. GitHub Pages serving a static bundle is free, fast and fine, and stays.

The thing that cannot survive multi-user is **the data store**: `data.json` in the private repo
`makdissi-dev/ptapp-data`, written through the GitHub contents API with a PAT. It has no concept of
users, no per-row access control, a hard ~1 MB inlining ceiling (see `docs/app-health.md`), and the
only credential that can write it has full write access to every client record Elie owns.

## 2. Why Postgres and not Cloudflare D1

Cloudflare D1 was the cheaper candidate — $5/mo on the Workers Paid plan, and Pierre already owns
the Cloudflare account (calnorm.com's DNS lives there). It lost on two points, both of which Pierre
identified himself:

- **Access.** Postgres speaks the standard wire protocol, so Pierre can open the database in
  pgAdmin/DBeaver, query it, and dump it. D1 is reachable only through Cloudflare's CLI and
  dashboard console — no ordinary SQL client.
- **Enforcement.** Postgres row-level security puts *"coach A sees only coach A's clients"* inside
  the database. D1 has no RLS: every one of those checks would be code in a Worker, and a bug in
  that code is a data leak. Pierre already knows Postgres; he does not want tenant isolation riding
  on hand-written application code.

Performance was explicitly **not** a deciding factor. At this scale — one gym, tens of users — both
are far inside the budget from Beirut. Do not re-open this on performance grounds.

## 3. Why the free tier, not the paid one

Supabase's free tier carries an app of this size comfortably. Projects pause only after roughly a
week of *zero* activity, which a live app in daily use never reaches. The paid tier (~$25/mo, a
figure not re-verified on 2026-08-21) buys headroom that does not exist as a problem yet.

## 4. The exit, and the one thing that constrains the build

Supabase is real Postgres, so the exit is `pg_dump` / `pg_restore` — schema, data **and** RLS
policies all move to a €4–6/mo VPS (Hetzner, DigitalOcean) intact.

**What does not move is Supabase Auth** (GoTrue): sign-in, tokens, password reset. On a VPS that
service has to be replaced.

🔴 **Therefore, a standing build constraint:** keep auth behind a thin internal layer in the app.
Do not scatter `supabase.auth.*` SDK calls across components the way `sync.js` calls are scattered
today. One module owns sign-in, session and token refresh; everything else calls that module. This
is what keeps the migration a weekend instead of a rewrite.

## 5. Explicitly rejected

- **AWS RDS / Google Cloud SQL** — smallest managed Postgres lands near VPS money with far more
  moving parts, and the bills surprise people.
- **Shared hosting + MySQL** — costs more than $5, performs worse from Lebanon, and Pierre would
  own the patching.
- **Cloudflare D1** — see §2. Revisit only if the RLS requirement disappears, which it will not.

## 6. Status

Nothing built. Nothing bought. No Supabase project exists as of 2026-08-21. This document records
the decision so it survives a `/clear`; the schema, the migration from `data.json`, and the auth
layer are all still unwritten.

Related: `HANDOFF-spotset-publishing.md` (store state),
`docs/2026-08-21-multi-user-accounts-decision.md` + `-appendix.md` (the superseded 12-agent run —
its per-design store-review analysis is still worth reading, its platform recommendation is not).
