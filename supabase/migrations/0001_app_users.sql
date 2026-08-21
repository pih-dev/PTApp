-- =====================================================================
-- 0001_app_users.sql — the identity tree for SpotSet multi-tenant auth.
--
-- Design record: docs/2026-08-21-multi-user-accounts-decision.md §10-§12.
-- Nothing in src/ depends on this yet. This migration is standalone and
-- creates NO tenant/data tables — those land in a later migration once
-- this one's isolation is proven by scripts/sanity/sanity-rls-matrix.mjs.
--
-- The three rules this file exists to enforce, all from §11:
--   1. Exactly two roles: 'pt' and 'client'. "Prime" is NOT a role — it is
--      a pt with parent_pt_id IS NULL. Elie's position is data, never code.
--   2. Peer primes are fully isolated from each other, in both directions.
--   3. A parent pt can reach its whole subtree; nobody can reach upward or
--      sideways.
--
-- 🔴 All three fall out of ONE predicate: path <@ my_path().
--    <@ is ltree's "is a descendant of, or equal to", so:
--      equal paths    -> yourself
--      contained path -> a descendant
--      disjoint roots -> two primes; neither contains the other -> isolated
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions and schemas
-- ---------------------------------------------------------------------

-- Supabase installs extensions into the `extensions` schema, NOT public.
-- 🔴 This is why every function below sets search_path = 'extensions', 'public'
--    and NOT the usual hardening value ''. With an empty search_path neither
--    the ltree type nor the <@ operator resolves, and the policy fails at
--    runtime with a bare "operator does not exist". (docs/traps.md)
create extension if not exists ltree with schema extensions;

-- `private` holds helper functions that policies call. Nothing in it is ever
-- exposed through PostgREST — PostgREST only serves `public` (and whatever
-- schemas are explicitly exposed), so a function here is unreachable from the
-- anon key by construction.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- 🔴 …but `authenticated` must get USAGE back, and this is not a loosening.
--    A policy expression is evaluated with the INVOKER's privileges — SECURITY
--    DEFINER applies only *inside* the function body, not to the act of
--    resolving and calling it. Without USAGE, every authenticated SELECT on
--    app_users fails with "permission denied for schema private", i.e. the
--    whole app is locked out while the policy itself is perfectly correct.
--    EXECUTE grants alone are inert without schema USAGE.
--    `anon` still gets nothing — it is the key that ships in a PUBLIC repo.
grant usage on schema private to authenticated;

-- 🔴 Postgres grants EXECUTE on every new function to PUBLIC by default, and
--    `public` is the schema PostgREST exposes. That means any function created
--    in `public` is, by default, callable over HTTP — and a SECURITY DEFINER
--    one runs as its owner. The two SECDEF functions this file puts in `public`
--    are trigger functions, which cannot be invoked as RPC, so today this is
--    inert. It is set here precisely BECAUSE it is inert today: the first
--    ordinary SECDEF helper someone adds to `public` would otherwise inherit an
--    anon-callable hole with nothing to warn them.
--    Scoped to functions created from here on, deliberately: a blanket
--    `revoke execute on all functions in schema public` would also strip
--    Supabase's own helpers and break the project in ways unrelated to this
--    change. Future RPCs get an explicit grant, which is the point — the grant
--    becomes a decision instead of a default.
alter default privileges in schema public revoke execute on functions from public, anon;


-- ---------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------

create table if not exists public.app_users (
  id            uuid primary key references auth.users(id) on delete cascade,

  -- §10: exactly two roles, forever. A third role is a schema change and a
  -- decision, not a config value.
  role          text not null check (role in ('pt', 'client')),

  -- Parent link. NULL = prime (a pt with nobody above them).
  -- ON DELETE RESTRICT, deliberately: deleting a pt who still has people under
  -- them would orphan a whole subtree with no in-app way to repair it (§11.1 —
  -- there is no admin UI). Re-parent the children first, from the SQL console.
  parent_pt_id  uuid references public.app_users(id) on delete restrict,

  -- Materialized ancestry: '<root>.<child>.<self>'. Maintained by trigger,
  -- never written by hand. See §12.2 — this is what turns a recursive
  -- ancestry walk into an indexable containment test.
  path          extensions.ltree not null,

  -- Display name, so the invite/drill-in UI has something to show without
  -- reaching into auth.users (which is not readable by the anon key).
  name          text,

  created_at    timestamptz not null default now(),

  -- A client must hang off a pt. Only a pt may be prime.
  constraint app_users_client_needs_parent
    check (role = 'pt' or parent_pt_id is not null),

  -- Nobody is their own parent. (Deeper cycles are blocked by trigger below —
  -- a CHECK constraint cannot see other rows.)
  constraint app_users_no_self_parent
    check (parent_pt_id is null or parent_pt_id <> id),

  -- 🔴 A path must END in its own id. This is the backstop for the one failure
  --    that would be catastrophic and invisible: if the stamp trigger is ever
  --    dropped, disabled, or bypassed, rows get whatever path was passed in —
  --    and several rows sharing one path means several primes reading each
  --    other's trees. A CHECK cannot see other rows, but it can see this one,
  --    and "the last label is my id" is enough to make a hand-written or
  --    unstamped path fail loudly at write time instead of leaking at read
  --    time. It also rejects any attempt to hand-edit a path, which no trigger
  --    currently covers (the stamp trigger fires only on parent_pt_id).
  constraint app_users_path_ends_in_self
    check (extensions.subpath(path, -1)::text = replace(id::text, '-', ''))
);

-- The index the read policy actually uses: a GiST index over the ltree path
-- serves the <@ containment operator. Without it every policy evaluation is a
-- sequential scan; with it, containment is index-assisted.
create index if not exists app_users_path_gist
  on public.app_users using gist (path extensions.gist_ltree_ops);

create index if not exists app_users_parent_idx
  on public.app_users (parent_pt_id);


-- ---------------------------------------------------------------------
-- 2. Path maintenance
-- ---------------------------------------------------------------------

-- A UUID is not a legal ltree label as-is: labels are alphanumerics,
-- underscores and (only since Postgres 16) hyphens.
-- 🔴 We strip the hyphens unconditionally rather than branching on
--    server_version. It works identically on every version, it is one
--    replace(), and a version-dependent id format is a landmine for anyone
--    who later restores this database somewhere older. The cost is that a
--    path label is not a copy-pasteable UUID — accept it; nothing reads paths
--    by eye except during debugging, and 3. below gives a helper for that.
create or replace function private.uuid_label(u uuid)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select replace(u::text, '-', '');
$fn$;

-- Stamp path on insert, and on any change of parent.
-- SECURITY DEFINER because it must read the parent row, which the *caller*
-- may not be permitted to see (a client being provisioned cannot read their
-- own coach's row). Without this, provisioning would fail closed.
create or replace function public.app_users_stamp_path()
returns trigger
language plpgsql
security definer
set search_path = 'extensions', 'public'
as $fn$
declare
  parent_path   extensions.ltree;
  parent_role   text;
  expected_rows bigint;
  moved_rows    bigint;
begin
  if new.parent_pt_id is null then
    -- Prime: the path is just this user.
    new.path := private.uuid_label(new.id)::extensions.ltree;
  else
    select path, role into parent_path, parent_role
      from public.app_users where id = new.parent_pt_id;

    if parent_path is null then
      raise exception 'app_users: parent % does not exist', new.parent_pt_id;
    end if;

    -- §10: PTs may have PTs or clients under them. A client may have nobody.
    if parent_role <> 'pt' then
      raise exception 'app_users: parent % is a client and cannot have members', new.parent_pt_id;
    end if;

    -- Cycle guard. A CHECK constraint cannot look at other rows, so the only
    -- place this can be enforced is here: the proposed parent must not already
    -- be sitting inside this user's own subtree.
    if tg_op = 'UPDATE' and parent_path <@ old.path then
      raise exception 'app_users: re-parenting % under % would create a cycle', new.id, new.parent_pt_id;
    end if;

    new.path := parent_path || private.uuid_label(new.id)::extensions.ltree;
  end if;

  -- Re-parenting moves an ENTIRE SUBTREE, so every descendant's path must be
  -- restamped in the same transaction. This is the one WITH RECURSIVE-shaped
  -- write in the design (§12.3), and it runs here — at write time, a handful
  -- of times a year from the SQL console — never on a read path.
  --
  -- 🔴 It lives inside this BEFORE trigger, not in a separate AFTER trigger on
  --    `path`, and that is deliberate. An AFTER-UPDATE-OF-path trigger would
  --    fire again for every descendant this statement updates, re-walking the
  --    same subtree once per level: quadratic at best, and it re-enters with
  --    stale `old.path` values. Doing it here is safe because these UPDATEs
  --    touch only `path`, while the stamp trigger fires only on a change of
  --    `parent_pt_id` — so nothing re-enters.
  --
  --    subpath(d.path, nlevel(old.path)) is the part of the descendant's path
  --    BELOW the moved node; prefixing new.path rebases the whole branch.
  if tg_op = 'UPDATE' and new.path is distinct from old.path then
    -- 🔴 Count FIRST, then verify the update touched exactly that many rows.
    --    `force row level security` removes the table-owner exemption, so this
    --    UPDATE is itself subject to RLS — and there is no UPDATE policy. Today
    --    it works only because Supabase's `postgres` role happens to hold
    --    BYPASSRLS; after a restore, or an ownership change, the same statement
    --    would match ZERO rows and return success. Every descendant would keep
    --    its old path: the old parent goes on seeing them, the new parent never
    --    does, and nothing anywhere reports a problem. Silent, and permissions-
    --    shaped — exactly the failure this schema exists to make impossible.
    select count(*) into expected_rows
      from public.app_users d
     where d.path <@ old.path and d.id <> new.id;

    update public.app_users d
       set path = new.path || subpath(d.path, nlevel(old.path))
     where d.path <@ old.path
       and d.id <> new.id;

    get diagnostics moved_rows = row_count;

    if moved_rows <> expected_rows then
      raise exception
        'app_users: subtree restamp of % moved %/% descendants — aborting (RLS or privilege problem, NOT a data problem)',
        new.id, moved_rows, expected_rows;
    end if;
  end if;

  return new;
end;
$fn$;

-- `drop … if exists` before each create: everything else in this file is
-- idempotent (`create table if not exists`, `create or replace function`), and
-- a bare `create trigger` alone would abort the whole migration on a re-apply.
-- A migration that cannot be safely re-run is a migration that gets applied by
-- hand in pieces the one time it matters.
drop trigger if exists app_users_stamp_path_ins on public.app_users;
create trigger app_users_stamp_path_ins
  before insert on public.app_users
  for each row execute function public.app_users_stamp_path();

drop trigger if exists app_users_stamp_path_upd on public.app_users;
create trigger app_users_stamp_path_upd
  before update of parent_pt_id on public.app_users
  for each row
  when (new.parent_pt_id is distinct from old.parent_pt_id)
  execute function public.app_users_stamp_path();

-- A pt with people under them must not be demoted to 'client'. Nothing else
-- catches it: the stamp trigger fires only on a change of parent_pt_id, and
-- app_users_client_needs_parent only inspects the row itself. The result would
-- be a client with children — an invariant the whole <@ model assumes away,
-- and one that would show up as a client mysteriously able to read other
-- people's rows.
create or replace function public.app_users_guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = 'extensions', 'public'
as $fn$
begin
  if old.role = 'pt' and new.role = 'client'
     and exists (select 1 from public.app_users where parent_pt_id = new.id) then
    raise exception 'app_users: % is a pt with members and cannot become a client', new.id;
  end if;
  return new;
end;
$fn$;

drop trigger if exists app_users_guard_role_change_upd on public.app_users;
create trigger app_users_guard_role_change_upd
  before update of role on public.app_users
  for each row
  when (new.role is distinct from old.role)
  execute function public.app_users_guard_role_change();

-- 🔴 `path` must only ever be written by the stamp function.
--    The stamp trigger fires on a change of `parent_pt_id`, so a direct
--    `UPDATE app_users SET path = …` fires nothing at all. The tail CHECK
--    catches the worst case — a forged prefix can never make you an *ancestor*
--    of a foreign row, because containment requires prefix-hood and that row's
--    path still ends in its own id — but it does NOT stop the opposite move:
--    injecting yourself DOWNWARD into a stranger's tree, which would hand that
--    stranger's prime a client they never had. Only service_role can reach
--    this today (there is no write policy), so this is defence in depth against
--    a future write path, not a live hole.
create or replace function public.app_users_guard_path_write()
returns trigger
language plpgsql
set search_path = 'extensions', 'public'
as $fn$
begin
  -- Depth is checked in the BODY, not the WHEN clause. Inside a top-level
  -- trigger pg_trigger_depth() is already 1, so a WHEN clause testing for 0
  -- would never be true and this guard would silently never fire — the exact
  -- shape of bug it exists to prevent. The one legitimate writer of `path` is
  -- the subtree restamp inside app_users_stamp_path(), which reaches here at
  -- depth 2.
  if pg_trigger_depth() <= 1 then
    raise exception
      'app_users: path is maintained by trigger and must never be written directly (row %). Change parent_pt_id instead.',
      new.id;
  end if;
  return new;
end;
$fn$;

drop trigger if exists app_users_guard_path_write_upd on public.app_users;
create trigger app_users_guard_path_write_upd
  before update of path on public.app_users
  for each row
  when (new.path is distinct from old.path)
  execute function public.app_users_guard_path_write();

-- 🔴 The subtree restamp lives INSIDE app_users_stamp_path above, not in a
--    separate trigger. When the tenant tables arrive and denormalize
--    owner_path, their restamp belongs in that same function too — derived
--    data that is updated somewhere else eventually stops being updated.


-- ---------------------------------------------------------------------
-- 3. The caller's own path — the hoisted, row-INDEPENDENT half
-- ---------------------------------------------------------------------

-- 🔴 This function takes NO arguments, and that is the entire point.
--    A policy calling `(select private.my_path())` gets a genuine initPlan:
--    evaluated ONCE per statement. A function taking a row column instead —
--    `(select private.can_reach(some_row_id))` — is a correlated SubPlan and
--    runs once PER ROW, which is the trap recorded in docs/traps.md.
--
-- SECURITY DEFINER also breaks what would otherwise be infinite RLS recursion:
-- the policy on app_users needs to read app_users to find the caller's path.
create or replace function private.my_path()
returns extensions.ltree
language sql
stable
security definer
set search_path = 'extensions', 'public'
as $fn$
  select path from public.app_users where id = auth.uid();
$fn$;

-- Convenience for the app: "what am I?" without exposing the whole tree.
create or replace function private.my_role()
returns text
language sql
stable
security definer
set search_path = 'extensions', 'public'
as $fn$
  select role from public.app_users where id = auth.uid();
$fn$;

grant execute on function private.my_path() to authenticated;
grant execute on function private.my_role() to authenticated;


-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------

alter table public.app_users enable row level security;
-- FORCE so that even the table owner is subject to policies. Without it, a
-- migration or a function running as owner silently bypasses everything and
-- the sanity matrix passes for the wrong reason.
alter table public.app_users force row level security;

-- Fail closed: no blanket grants. anon gets nothing at all.
revoke all on public.app_users from anon, authenticated;
grant select on public.app_users to authenticated;

-- 🔴 THE predicate. Read your subtree, including yourself.
--   - a prime pt sees their whole tree
--   - a sub-pt sees their own subtree and NOT their parent's other branches
--   - a peer prime sees nothing of the other tree (disjoint roots)
--   - a client sees only themselves (nothing hangs below a client)
--   - a signed-in user with no app_users row gets NULL from my_path(),
--     `path <@ NULL` is NULL, and NULL is not true -> zero rows. Fail closed.
create policy app_users_read_subtree
  on public.app_users
  for select
  to authenticated
  using ( path <@ (select private.my_path()) );

-- No INSERT / UPDATE / DELETE policies for `authenticated`, on purpose.
--
-- With RLS enabled and no policy for a command, that command is denied for
-- everyone except service_role (which bypasses RLS). That is exactly §11.1:
-- provisioning, re-parenting and deletion happen from the Supabase SQL console
-- with service_role, from Pierre's laptop. There is no in-app admin, so there
-- is no in-app write path to this table.
--
-- 🔴 Do not "temporarily" add an UPDATE policy here to make an invite screen
--    work. RLS cannot restrict COLUMNS: any UPDATE policy that lets a pt edit
--    a row also lets them edit `role` and `parent_pt_id` — i.e. promote
--    themselves to prime, or re-parent someone else's client under themselves.
--    An invite flow gets a SECURITY DEFINER rpc with a narrow signature.


-- ---------------------------------------------------------------------
-- 5. Provisioning helper (service_role only)
-- ---------------------------------------------------------------------

-- Not granted to anyone. It exists so that provisioning is one call with the
-- checks in one place, rather than an INSERT re-typed correctly each time.
create or replace function private.provision_user(
  p_id           uuid,
  p_role         text,
  p_parent_pt_id uuid,
  p_name         text default null
)
returns public.app_users
language plpgsql
security definer
set search_path = 'extensions', 'public'
as $fn$
declare
  rec public.app_users;
begin
  -- `path` is omitted: the BEFORE INSERT trigger stamps it, and BEFORE
  -- triggers run before the NOT NULL check, so the column is satisfied by
  -- the time constraints are evaluated. Never pass a path in by hand.
  insert into public.app_users (id, role, parent_pt_id, name)
  values (p_id, p_role, p_parent_pt_id, p_name)
  returning * into rec;
  return rec;
end;
$fn$;

revoke all on function private.provision_user(uuid, text, uuid, text) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 6. What is deliberately NOT here
-- ---------------------------------------------------------------------
-- * tenants / tenant_snapshots / client_views / client_requests — later
--   migration, once sanity-rls-matrix.mjs proves this tree in isolation.
-- * Any write path for `authenticated` (§11.1, and the column note in 4).
-- * A read path for the `client` role beyond their own row. Clients must
--   never read the coach blob: RLS cannot restrict columns, so a client with
--   SELECT on a coach's data would see every other client's notes. Client
--   reads go through client_views in Phase 5. (§12.2)
