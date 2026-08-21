-- 0003 — snapshots must outlive the tenant they document.
--
-- Design record: docs/2026-08-21-multi-user-accounts-decision.md §15.
--
-- 🔴 THE DEFECT THIS FIXES
--    `0002` gave tenant_snapshots `on delete cascade`. That table exists for
--    one reason, written in its own header: after Apr 13 and Apr 19, "by the
--    time anyone noticed, the old bytes were gone." With a cascade, a single
--    `delete from tenants where …` in the SQL console — which §11.1 names as
--    the NORMAL way an administrative removal happens, because there is no
--    in-app admin — silently destroys every snapshot in the same statement.
--    The one artifact you would want after a mistaken delete is the one the
--    delete erases. No error, no warning, irreversible.
--
--    `restrict` is not the answer either: it would make the tenant undeletable
--    for as long as any snapshot exists, which is forever, and the workaround
--    would be "delete the snapshots first" — the same loss by a longer route.
--
--    `on delete set null` is: the tenant goes, the history stays, orphaned but
--    intact and still readable. `owner_path` is already denormalized onto the
--    snapshot, so RLS keeps working on a row whose tenant no longer exists —
--    that column was put there for query cost, and it pays a second time here.
--
-- Safe to re-run. No data is moved and nothing is dropped.

begin;

-- 1. tenant_id becomes nullable, and the FK nulls instead of cascading.
alter table public.tenant_snapshots
  alter column tenant_id drop not null;

alter table public.tenant_snapshots
  drop constraint if exists tenant_snapshots_tenant_id_fkey;

alter table public.tenant_snapshots
  add constraint tenant_snapshots_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete set null;

-- 2. A snapshot should carry the version it was taken FROM. `_dataVersion`
--    inside the blob makes it recoverable either way, so this is not a
--    correctness fix — but the columns are free, and a restore wants to know
--    which optimistic-concurrency generation it is putting back.
alter table public.tenant_snapshots
  add column if not exists tenant_version int,
  add column if not exists tenant_data_version int;

-- 3. A final snapshot on the way out. Deleting a tenant is exactly the moment
--    the last good copy becomes precious, and it is the one moment the UPDATE
--    trigger never fires.
create or replace function public.tenants_before_delete()
returns trigger
language plpgsql
security definer
set search_path = 'extensions', 'public'
as $fn$
begin
  insert into public.tenant_snapshots (tenant_id, owner_path, data, bytes, reason, tenant_version, tenant_data_version)
  values (old.id, old.owner_path, old.data, octet_length(old.data::text), 'delete', old.version, old.data_version);
  return old;
end;
$fn$;

drop trigger if exists tenants_before_delete_trg on public.tenants;
create trigger tenants_before_delete_trg
  before delete on public.tenants
  for each row execute function public.tenants_before_delete();

-- 4. The UPDATE trigger records the same two columns from now on.
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
  -- changed — a version-only touch is not worth a 152 KB copy, and the
  -- idempotent daily mirror re-run relies on that being free.
  if new.data is distinct from old.data then
    insert into public.tenant_snapshots (tenant_id, owner_path, data, bytes, reason, tenant_version, tenant_data_version)
    values (old.id, old.owner_path, old.data, octet_length(old.data::text), 'update', old.version, old.data_version);
  end if;

  return new;
end;
$fn$;

-- 5. The read policy compares owner_path, which orphaned rows still carry, so
--    it needs no change. Restated here only so the next reader does not have to
--    go and check: an orphaned snapshot remains visible to exactly the same
--    people it was visible to before its tenant was deleted.

commit;
