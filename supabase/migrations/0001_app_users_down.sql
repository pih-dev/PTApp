-- =====================================================================
-- 0001_app_users_down.sql — reverse of 0001_app_users.sql.
--
-- WHY THIS EXISTS: 0001 creates a schema, a table, four functions and three
-- triggers. If it fails partway (a typo, a missing extension, a permissions
-- surprise on a new project), what is left behind is a half-built `private`
-- schema and possibly some of the triggers — and the next attempt to apply
-- 0001 then trips over whichever objects survived. Without this file the
-- recovery is a session spent hand-dropping objects in the SQL console,
-- which is precisely when things get dropped that shouldn't be.
--
-- 🔴 DESTRUCTIVE. It drops public.app_users and everything in it.
--    Run it only against an instance that holds no real identities. Once
--    Elie's account exists, this file is for a rebuild-from-scratch and
--    nothing else — take the snapshot first, per CLAUDE.md → Governance.
--
-- Order matters: triggers before their functions, policies with the table,
-- and the schema last.
-- =====================================================================

drop trigger if exists app_users_stamp_path_ins        on public.app_users;
drop trigger if exists app_users_guard_path_write_upd  on public.app_users;
drop trigger if exists app_users_stamp_path_upd        on public.app_users;
drop trigger if exists app_users_guard_role_change_upd on public.app_users;

drop policy if exists app_users_read_subtree on public.app_users;

drop table if exists public.app_users;

drop function if exists public.app_users_stamp_path();
drop function if exists public.app_users_guard_role_change();
drop function if exists public.app_users_guard_path_write();
drop function if exists private.my_path();
drop function if exists private.my_role();
drop function if exists private.uuid_label(uuid);
drop function if exists private.provision_user(uuid, text, uuid, text);

-- Not CASCADE: if anything unexpected still lives in `private`, this fails and
-- tells you, rather than quietly deleting whatever a later migration put there.
drop schema if exists private;

-- 🔴 `ltree` is deliberately NOT dropped. Extensions are shared across the
--    whole database, so dropping it here would break any other feature that
--    later adopts it. It is harmless to leave installed.

-- 0002 objects, dropped here too so a single down run leaves nothing behind.
-- (tenant_snapshots cascades from tenants, but is named explicitly so a partial
-- state where tenants is already gone still cleans up.)
drop trigger if exists tenants_stamp_owner_path_ins on public.tenants;
drop trigger if exists tenants_stamp_owner_path_upd on public.tenants;
drop trigger if exists tenants_before_update_trg    on public.tenants;
drop policy  if exists tenants_read_subtree           on public.tenants;
drop policy  if exists tenants_write_own              on public.tenants;
drop policy  if exists tenants_insert_own             on public.tenants;
drop policy  if exists tenant_snapshots_read_subtree  on public.tenant_snapshots;
drop table   if exists public.tenant_snapshots;
drop table   if exists public.tenants;
drop function if exists public.tenants_stamp_owner_path();
drop function if exists public.tenants_before_update();
