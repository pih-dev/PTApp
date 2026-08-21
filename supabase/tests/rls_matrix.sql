-- =====================================================================
-- rls_matrix.sql — the isolation matrix, run entirely inside Postgres.
--
-- Paste into the Supabase SQL editor and Run. It builds a synthetic tree,
-- impersonates each user, checks what they can see, and ROLLS BACK. No row
-- survives it. Verified against project `spotset` (eu-central-1) 2026-08-21:
-- 6 of 6 PASS on PostgreSQL 17.6.
--
-- WHY THIS EXISTS ALONGSIDE scripts/sanity/sanity-rls-matrix.mjs:
--   The .mjs version is the real gate — it goes through PostgREST with real
--   JWTs, which is the path the app actually uses, and it can assert things
--   only HTTP can show (the anon key, a refused PATCH). But it needs the
--   service_role key in the environment. THIS file needs no credentials at
--   all, so it can be run by anyone with SQL-editor access in about ten
--   seconds — which means it actually gets run.
--
-- 🔴 It proves the POLICY. It cannot prove the API surface: `set role
--    authenticated` skips PostgREST entirely, so a table wrongly exposed to
--    the Data API, or a grant to `anon`, would still pass here. Never treat a
--    green run of this file as permission to ship auth.
--
-- The impersonation is exactly what PostgREST does per request:
--   set local role authenticated;
--   set request.jwt.claims = '{"sub":"<user id>"}';
-- auth.uid() reads `sub` out of that setting, so private.my_path() resolves
-- for the impersonated user and the policy is evaluated for real.
-- =====================================================================

begin;

-- auth.users rows are required by app_users.id's FK. The rollback removes them.
insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@t.invalid'),
  ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@t.invalid'),
  ('cccccccc-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@t.invalid'),
  ('dddddddd-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d@t.invalid'),
  ('eeeeeeee-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e@t.invalid'),
  ('ffffffff-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f@t.invalid'),
  ('99999999-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','x@t.invalid');

-- The tree, chosen so every §11 rule is falsifiable:
--
--   A prime pt            D peer prime        X = signed in, no app_users row
--   ├── B sub-pt          └── F client
--   │   └── E client
--   └── C client
--
-- A must see A,B,C,E and NOT D,F.   B must see B,E and NOT A,C,D,F.
insert into public.app_users (id, role, parent_pt_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','pt',    null,                                   'A prime'),
  ('bbbbbbbb-0000-0000-0000-000000000002','pt',    'aaaaaaaa-0000-0000-0000-000000000001', 'B sub-pt'),
  ('cccccccc-0000-0000-0000-000000000003','client','aaaaaaaa-0000-0000-0000-000000000001', 'C client of A'),
  ('eeeeeeee-0000-0000-0000-000000000005','client','bbbbbbbb-0000-0000-0000-000000000002', 'E client of B'),
  ('dddddddd-0000-0000-0000-000000000004','pt',    null,                                   'D peer prime'),
  ('ffffffff-0000-0000-0000-000000000006','client','dddddddd-0000-0000-0000-000000000004', 'F client of D');

create temp table results(who text, expected text, got text, verdict text);

do $do$
declare
  -- 🔴 The load-bearing rows are the SHORT ones. "A sees their whole tree"
  --    passes even with RLS switched off; "D sees only D and F" does not.
  cases text[][] := array[
    ['aaaaaaaa-0000-0000-0000-000000000001','A prime',      'A prime,B sub-pt,C client of A,E client of B'],
    ['bbbbbbbb-0000-0000-0000-000000000002','B sub-pt',     'B sub-pt,E client of B'],
    ['cccccccc-0000-0000-0000-000000000003','C client of A','C client of A'],
    ['dddddddd-0000-0000-0000-000000000004','D peer prime', 'D peer prime,F client of D'],
    ['ffffffff-0000-0000-0000-000000000006','F client of D','F client of D'],
    -- my_path() returns NULL, `path <@ NULL` is NULL, NULL is not true -> nothing.
    ['99999999-0000-0000-0000-000000000009','X no row',     '']
  ];
  i int; seen text;
begin
  for i in 1 .. array_length(cases,1) loop
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', cases[i][1])::text, true);
    select coalesce(string_agg(name, ',' order by name),'') into seen from public.app_users;
    reset role;
    insert into results values (cases[i][2], cases[i][3], seen,
      case when seen = cases[i][3] then 'PASS' else 'FAIL' end);
  end loop;
end $do$;

select * from results order by who;

-- 🔴 ROLLBACK, not commit. Nothing this file creates may outlive it — a
--    forgotten synthetic 'A prime' in a live tree is a real account with a
--    real subtree, and nothing in the app would flag it.
rollback;
