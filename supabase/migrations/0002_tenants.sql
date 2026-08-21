-- =====================================================================
-- 0002_tenants.sql — where a coach's data actually lives.
--
-- Design record: docs/2026-08-21-multi-user-accounts-decision.md §4 (the blob
-- survives byte-identical), §11.3 ("mine" is the default scope), §12.2-.3 (the
-- hoisted ancestry predicate and the denormalized owner_path).
-- Depends on 0001_app_users.sql. Apply after it.
--
-- 🔴 THE ONE IDEA: one blob per coach. A coach is not a row inside Elie's
--    dataset — each coach gets their own `data.json`-shaped blob in their own
--    row. There is no query that could return another coach's client, because
--    the data was never in the same document. The v2.6 merge kernel keeps
--    working verbatim: within a tenant the writer set is still 1-3 devices,
--    which is exactly what it was built for.
--
-- 🔴 DATA_VERSION STAYS 6 AND NO migrateData RUNS. Identity lives outside the
--    blob. `data` is today's data.json, unchanged, byte for byte. The single
--    largest risk-reducer in this whole plan is that the most dangerous
--    operation in this codebase simply is not performed during the dangerous
--    release.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. tenants — one row per coach
-- ---------------------------------------------------------------------

create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),

  -- The owning coach. One tenant per coach, enforced by the unique constraint.
  -- ON DELETE RESTRICT, like app_users.parent_pt_id: deleting a coach who still
  -- holds a blob would destroy real business records with no in-app way back.
  -- Delete the tenant deliberately, or don't delete the coach.
  coach_id      uuid not null unique references public.app_users(id) on delete restrict,

  -- 🔴 Denormalized from app_users.path, maintained by trigger, NEVER by hand.
  --    This is the hoist described in §12.2: it lets the read policy compare
  --    two values instead of calling a function with a row column, which is
  --    what makes `(select private.my_path())` a real initPlan — evaluated
  --    once per statement rather than once per row.
  owner_path    extensions.ltree not null,

  -- Today's data.json, verbatim. Not shredded into relational tables — see §7:
  -- a 152 KB blob is nothing to Postgres, and shredding it means rewriting the
  -- merge kernel, the reducer and every screen at the same time as changing
  -- the authentication model. Do it later, additively, blob retained until
  -- row-parity is proven.
  data          jsonb not null default '{}'::jsonb,

  -- Mirrors the blob's own _dataVersion so a server-side reader never has to
  -- parse the blob to know how to interpret it.
  data_version  int not null default 6,

  -- Optimistic concurrency. This is the direct replacement for the GitHub
  -- Contents API's `sha`: `update … where version = $n` returning zero rows is
  -- exactly the 409 that sync.js already knows how to handle by re-reading and
  -- merging. Incremented by trigger so no caller can forget.
  version       int not null default 1,

  updated_at    timestamptz not null default now(),

  -- Same backstop as app_users.path: the denormalized path must end in the
  -- owner's own id. If the stamp trigger is ever dropped or bypassed, a row
  -- with a foreign or dummy path would widen who can read this blob, and there
  -- would be no symptom. Fail at write time instead.
  constraint tenants_owner_path_ends_in_owner
    check (extensions.subpath(owner_path, -1)::text = replace(coach_id::text, '-', ''))
);

create index if not exists tenants_owner_path_gist
  on public.tenants using gist (owner_path extensions.gist_ltree_ops);
create index if not exists tenants_coach_idx on public.tenants (coach_id);


-- ---------------------------------------------------------------------
-- 2. tenant_snapshots — the undo history
-- ---------------------------------------------------------------------
-- Every write to `data` files the PREVIOUS value here first. This is the
-- database-side equivalent of the _archive snapshots CLAUDE.md already
-- mandates before any data-touching operation, and it exists because of the
-- Apr 13 and Apr 19 losses: by the time anyone noticed, the old bytes were
-- gone. Cheap insurance — a 152 KB blob, a handful of writes a day.
--
-- 🔴 Growth is real and unbounded. Before this carries months of traffic it
--    needs a retention rule (keep all of the last 7 days, then dailies). Not
--    built here on purpose: a pruning job written before there is anything to
--    prune is a pruning job written against imaginary data.
create table if not exists public.tenant_snapshots (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,

  -- Denormalized for the same reason as tenants.owner_path: so the read policy
  -- is a containment test against an indexed column, with no join and no
  -- per-row function call.
  owner_path  extensions.ltree not null,

  data        jsonb not null,
  bytes       int not null,
  reason      text not null default 'update',
  created_at  timestamptz not null default now()
);

create index if not exists tenant_snapshots_tenant_idx
  on public.tenant_snapshots (tenant_id, created_at desc);
create index if not exists tenant_snapshots_owner_path_gist
  on public.tenant_snapshots using gist (owner_path extensions.gist_ltree_ops);


-- ---------------------------------------------------------------------
-- 3. Keeping owner_path true
-- ---------------------------------------------------------------------

-- On insert, and on any change of coach_id, copy the owner's current path.
create or replace function public.tenants_stamp_owner_path()
returns trigger
language plpgsql
security definer
set search_path = 'extensions', 'public'
as $fn$
declare
  p extensions.ltree;
begin
  select path into p from public.app_users where id = new.coach_id;
  if p is null then
    raise exception 'tenants: coach % has no app_users row', new.coach_id;
  end if;
  new.owner_path := p;
  return new;
end;
$fn$;

drop trigger if exists tenants_stamp_owner_path_ins on public.tenants;
create trigger tenants_stamp_owner_path_ins
  before insert on public.tenants
  for each row execute function public.tenants_stamp_owner_path();

drop trigger if exists tenants_stamp_owner_path_upd on public.tenants;
create trigger tenants_stamp_owner_path_upd
  before update of coach_id on public.tenants
  for each row
  when (new.coach_id is distinct from old.coach_id)
  execute function public.tenants_stamp_owner_path();

-- 🔴 THE IMPORTANT ONE. Re-parenting a PT moves their whole subtree, and every
--    tenant hanging off that subtree must move with it IN THE SAME
--    TRANSACTION. §12.3 says this restamp belongs inside the app_users stamp
--    function and not in a second one, because derived data updated somewhere
--    else eventually stops being updated. So 0001's function is REPLACED here
--    rather than supplemented — same body, plus the tenants half.
--
--    If this is ever missed, the symptom is silent and severe: a re-parented
--    coach's blob keeps the OLD path, so their previous parent can still read
--    it and the new one cannot. Nothing errors. Nothing looks wrong.
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
    new.path := private.uuid_label(new.id)::extensions.ltree;
  else
    select path, role into parent_path, parent_role
      from public.app_users where id = new.parent_pt_id;

    if parent_path is null then
      raise exception 'app_users: parent % does not exist', new.parent_pt_id;
    end if;

    if parent_role <> 'pt' then
      raise exception 'app_users: parent % is a client and cannot have members', new.parent_pt_id;
    end if;

    if tg_op = 'UPDATE' and parent_path <@ old.path then
      raise exception 'app_users: re-parenting % under % would create a cycle', new.id, new.parent_pt_id;
    end if;

    new.path := parent_path || private.uuid_label(new.id)::extensions.ltree;
  end if;

  if tg_op = 'UPDATE' and new.path is distinct from old.path then
    -- Count first, then verify the update touched exactly that many rows.
    -- `force row level security` removes the owner exemption, so this UPDATE is
    -- itself subject to RLS and could match ZERO rows and return success,
    -- stranding every descendant on its old path. See 0001 for the full note.
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

    -- NEW IN 0002: the tenants and snapshots hanging off that subtree.
    -- Same count-then-verify discipline, same reason.
    select count(*) into expected_rows
      from public.tenants t where t.owner_path <@ old.path;

    -- 🔴 The CASE is not decoration. `<@` is "descendant OR EQUAL", so this
    --    set includes the moving coach's OWN tenant, whose owner_path is
    --    exactly old.path. subpath(old.path, nlevel(old.path)) asks for the
    --    part after the last label — there isn't one — and Postgres raises
    --    22023 "invalid positions", failing the whole re-parent. The app_users
    --    restamp above dodges this by excluding `d.id <> new.id`; there is no
    --    equivalent row to exclude here, so the equal case is handled instead.
    update public.tenants t
       set owner_path = case
             when t.owner_path = old.path then new.path
             else new.path || subpath(t.owner_path, nlevel(old.path))
           end
     where t.owner_path <@ old.path;

    get diagnostics moved_rows = row_count;
    if moved_rows <> expected_rows then
      raise exception
        'tenants: subtree restamp of % moved %/% tenants — aborting', new.id, moved_rows, expected_rows;
    end if;

    select count(*) into expected_rows
      from public.tenant_snapshots s where s.owner_path <@ old.path;

    update public.tenant_snapshots s
       set owner_path = case
             when s.owner_path = old.path then new.path
             else new.path || subpath(s.owner_path, nlevel(old.path))
           end
     where s.owner_path <@ old.path;

    get diagnostics moved_rows = row_count;
    if moved_rows <> expected_rows then
      raise exception
        'tenant_snapshots: subtree restamp of % moved %/% rows — aborting', new.id, moved_rows, expected_rows;
    end if;
  end if;

  return new;
end;
$fn$;


-- ---------------------------------------------------------------------
-- 4. Version bump + snapshot on every write
-- ---------------------------------------------------------------------

create or replace function public.tenants_before_update()
returns trigger
language plpgsql
security definer
set search_path = 'extensions', 'public'
as $fn$
begin
  -- The caller does not get to choose the version. sync.js compares the value
  -- it last read; letting a client set it would make the concurrency check
  -- decorative.
  new.version := old.version + 1;
  new.updated_at := now();

  -- File the OLD bytes before they are replaced. Only when `data` actually
  -- changed — a version-only touch is not worth a 152 KB copy.
  if new.data is distinct from old.data then
    insert into public.tenant_snapshots (tenant_id, owner_path, data, bytes, reason)
    values (old.id, old.owner_path, old.data, octet_length(old.data::text), 'update');
  end if;

  return new;
end;
$fn$;

drop trigger if exists tenants_before_update_trg on public.tenants;
create trigger tenants_before_update_trg
  before update on public.tenants
  for each row execute function public.tenants_before_update();


-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenants force row level security;
alter table public.tenant_snapshots enable row level security;
alter table public.tenant_snapshots force row level security;

-- 🔴 EXPLICIT GRANTS, because "expose new tables automatically" is OFF on this
--    project (chosen at creation, §11). Nothing is granted by default here.
--    Miss these and the policies below are perfectly correct while every
--    request returns 403 — and BYPASSRLS does not help service_role either,
--    since it exempts a role from POLICIES, not from table privileges. That
--    exact mistake cost the first live run of the RLS matrix.
revoke all on public.tenants, public.tenant_snapshots from anon, authenticated;
grant select, insert, update on public.tenants to authenticated;
grant select on public.tenant_snapshots to authenticated;
grant select, insert, update, delete on public.tenants to service_role;
grant select, insert, update, delete on public.tenant_snapshots to service_role;

-- READ: the same single predicate as app_users — own row, plus anything below
-- you, and nothing at all across a peer tree.
drop policy if exists tenants_read_subtree on public.tenants;
create policy tenants_read_subtree
  on public.tenants for select to authenticated
  using ( owner_path <@ (select private.my_path()) );

drop policy if exists tenant_snapshots_read_subtree on public.tenant_snapshots;
create policy tenant_snapshots_read_subtree
  on public.tenant_snapshots for select to authenticated
  using ( owner_path <@ (select private.my_path()) );

-- WRITE: your OWN tenant only. Not your descendants'.
--
-- 🔴 This is §12.4's deferred question, and it starts CLOSED on purpose.
--    Widening a policy later is safe; narrowing one after Elie has come to
--    rely on it is not. A parent PT can READ a descendant's blob today (which
--    is what "intervene" in §11.3 needs for the drill-in view); making the
--    drill-in writable is a separate, deliberate decision.
drop policy if exists tenants_write_own on public.tenants;
create policy tenants_write_own
  on public.tenants for update to authenticated
  using ( coach_id = (select auth.uid()) )
  with check ( coach_id = (select auth.uid()) );

-- INSERT: a coach may create their OWN tenant, once (the unique constraint on
-- coach_id enforces the "once"). This is what lets a freshly provisioned coach
-- bootstrap on first sync without an admin round-trip.
drop policy if exists tenants_insert_own on public.tenants;
create policy tenants_insert_own
  on public.tenants for insert to authenticated
  with check ( coach_id = (select auth.uid()) );

-- No DELETE policy, for anyone. Deleting a tenant destroys a coach's entire
-- business record; it happens from the SQL console, deliberately, after a
-- snapshot. Same reasoning as the absent write policies in 0001.
--
-- No INSERT/UPDATE/DELETE policy on tenant_snapshots either: rows appear only
-- via the SECURITY DEFINER trigger above. A client that could write its own
-- history could also rewrite it.


-- ---------------------------------------------------------------------
-- 6. What is deliberately NOT here
-- ---------------------------------------------------------------------
-- * client_views / client_requests (Phase 5). Clients still have no read path
--   to a coach blob, and that is correct: RLS cannot restrict columns, so a
--   client with SELECT on `tenants` would see every other client's notes.
-- * Snapshot retention/pruning — see the note on the table above.
-- * Any write path for a parent PT into a descendant's tenant (§12.4).
