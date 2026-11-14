"""Regenerates supabase/checks/verify.sql from a database where ALL migrations are applied.

Usage: python3 scripts/generate-verify-sql.py <postgres-url-of-migrated-db> supabase/checks/verify.sql
(e.g. the local stack from `npx supabase start`: postgresql://postgres:postgres@127.0.0.1:54322/postgres)
"""
import subprocess, sys
DB = sys.argv[1]; OUT = sys.argv[2]
TABLES = ['profiles','user_roles','wallets','transactions','items','marketplace_listings','inventory','avatars',
          'experiences','game_passes','game_pass_ownership','game_sessions','game_progress','follows',
          'profile_stats','profile_visits','dev_audit_log','app_meta']
tl = ",".join(f"'{t}'" for t in TABLES)

def q(sql):
    out = subprocess.run(['psql', DB, '-AtF', '\t', '-c', sql], check=True, capture_output=True, text=True).stdout
    return [line.split('\t') for line in out.strip().split('\n') if line]

def lit(s): return "'" + s.replace("'", "''") + "'"

columns = q(f"""select table_name, column_name, data_type, is_nullable from information_schema.columns
               where table_schema='public' and table_name in ({tl}) order by table_name, ordinal_position""")
constraints = q(f"""select r.relname, c.conname, c.contype from pg_constraint c join pg_class r on r.oid = c.conrelid
                   where c.connamespace='public'::regnamespace and r.relname in ({tl})
                   order by 1, 2""")
# conrelid::regclass prints without schema when public is on search_path; normalise below
indexes = q(f"""select tablename, indexname from pg_indexes where schemaname='public' and tablename in ({tl}) order by 1,2""")
functions = q("""select p.oid::regprocedure::text, p.prosecdef::text from pg_proc p
                 where p.pronamespace='public'::regnamespace order by 1""")
policies = q(f"""select tablename, policyname, cmd, array_to_string(roles, ',') from pg_policies
                where schemaname='public' and tablename in ({tl}) order by 1,2""")
auth_select = q(f"""select c.relname from pg_class c where c.relnamespace='public'::regnamespace and c.relname in ({tl})
                   and has_table_privilege('authenticated', c.oid, 'select') order by 1""")
anon_exec = q("""select p.oid::regprocedure::text from pg_proc p where p.pronamespace='public'::regnamespace
                 and has_function_privilege('anon', p.oid, 'execute') order by 1""")
auth_exec = q("""select p.oid::regprocedure::text from pg_proc p where p.pronamespace='public'::regnamespace
                 and has_function_privilege('authenticated', p.oid, 'execute') order by 1""")

if len(constraints) == 0:
    raise SystemExit('no constraints found')

def values(rows):
    return ",\n    ".join("(" + ", ".join(lit(v) for v in r) + ")" for r in rows)

sql = f"""-- BloxyBox POST-MIGRATION VERIFICATION (read-only).
--
-- Run after applying the migrations:
--   npx supabase db query --remote --read-only -f supabase/checks/verify.sql
-- or paste into Dashboard -> SQL Editor and click Run.
--
-- It changes nothing. Every row should say PASS (migration history may say WARN
-- if you applied the files through the SQL editor instead of the CLI).
--
-- GENERATED from a database built by migrations 20261114000100..800 by
-- scripts/generate-verify-sql.py. Regenerate it whenever a migration is added.

with
expected_tables(name) as (values
    {values([[t] for t in TABLES])}
),
expected_columns(tbl, col, typ, nullable) as (values
    {values(columns)}
),
expected_constraints(tbl, name, kind) as (values
    {values([[r[0].replace('public.', ''), r[1], r[2]] for r in constraints])}
),
expected_indexes(tbl, name) as (values
    {values(indexes)}
),
expected_functions(sig, secdef) as (values
    {values(functions)}
),
expected_policies(tbl, name, cmd, roles) as (values
    {values(policies)}
),
expected_auth_select(tbl) as (values
    {values(auth_select)}
),
expected_anon_exec(sig) as (values
    {values(anon_exec)}
),
expected_auth_exec(sig) as (values
    {values(auth_exec)}
),
expected_versions(v) as (values
    ('20261114000100'), ('20261114000200'), ('20261114000300'), ('20261114000400'),
    ('20261114000500'), ('20261114000600'), ('20261114000700'), ('20261114000800')
),
present_functions as (
  select p.oid, p.oid::regprocedure::text as sig, p.prosecdef, p.proconfig
  from pg_proc p where p.pronamespace = 'public'::regnamespace
),
history as (
  select case when to_regclass('supabase_migrations.schema_migrations') is null then null
    else string_to_array(coalesce((xpath('/row/v/text()', query_to_xml(
      $q$select string_agg(version::text, ',') as v from supabase_migrations.schema_migrations$q$,
      false, true, '')))[1]::text, ''), ',') end as versions
),
meta as (
  select case when to_regclass('public.app_meta') is null then null
    else (xpath('/row/v/text()', query_to_xml(
      $q$select value as v from public.app_meta where key = 'schema_version'$q$, false, true, '')))[1]::text end as schema_version
),
checks(category, checked, problems) as (
  select '01 tables exist', (select count(*) from expected_tables),
    array(select e.name from expected_tables e where to_regclass('public.' || e.name) is null)
  union all
  select '02 row level security enabled', (select count(*) from expected_tables),
    array(select e.name from expected_tables e join pg_class c on c.relname = e.name and c.relnamespace = 'public'::regnamespace
          where not c.relrowsecurity)
  union all
  select '03 columns and types', (select count(*) from expected_columns),
    array(select e.tbl || '.' || e.col || ' (' || e.typ || coalesce(', got ' || ic.data_type, ', missing') || ')'
          from expected_columns e
          left join information_schema.columns ic on ic.table_schema = 'public' and ic.table_name = e.tbl and ic.column_name = e.col
          where ic.column_name is null or ic.data_type <> e.typ or ic.is_nullable <> e.nullable)
  union all
  select '04 constraints (PK, FK, unique, check)', (select count(*) from expected_constraints),
    array(select e.tbl || '.' || e.name from expected_constraints e
          where not exists (select 1 from pg_constraint c where c.connamespace = 'public'::regnamespace
                            and c.conname = e.name and c.contype::text = e.kind
                            and c.conrelid = to_regclass('public.' || e.tbl)))
  union all
  select '05 indexes', (select count(*) from expected_indexes),
    array(select e.tbl || '.' || e.name from expected_indexes e
          where not exists (select 1 from pg_indexes i where i.schemaname = 'public' and i.tablename = e.tbl and i.indexname = e.name))
  union all
  select '06 functions (signature + security definer)', (select count(*) from expected_functions),
    array(select e.sig || case when f.oid is null then ' missing' else ' wrong security mode' end
          from expected_functions e left join present_functions f on f.sig = e.sig
          where f.oid is null or f.prosecdef::text <> e.secdef)
  union all
  select '07 security definer functions pin search_path', (select count(*) from expected_functions where secdef = 'true'),
    array(select f.sig from expected_functions e join present_functions f on f.sig = e.sig
          where f.prosecdef and not exists (select 1 from unnest(coalesce(f.proconfig, '{{}}')) c where c like 'search_path=%'))
  union all
  select '08 sign-up trigger on auth.users', 1,
    array(select 'on_auth_user_created missing, disabled or not calling public.handle_new_user()'
          where not exists (select 1 from pg_trigger t where t.tgrelid = to_regclass('auth.users')
                            and t.tgname = 'on_auth_user_created' and t.tgenabled <> 'D'
                            and t.tgfoid = to_regprocedure('public.handle_new_user()')))
  union all
  select '09 RLS policies', (select count(*) from expected_policies),
    array(select e.tbl || '.' || e.name from expected_policies e
          where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = e.tbl
                            and p.policyname = e.name and p.cmd = e.cmd and array_to_string(p.roles, ',') = e.roles))
  union all
  select '10 table privileges (clients read-only)', (select count(*) * 6 from expected_tables),
    array(
      select 'anon can ' || priv || ' ' || e.name from expected_tables e
      cross join unnest(array['select', 'insert', 'update', 'delete']) priv
      where to_regclass('public.' || e.name) is not null and has_table_privilege('anon', to_regclass('public.' || e.name), priv)
      union all
      select 'authenticated can ' || priv || ' ' || e.name from expected_tables e
      cross join unnest(array['insert', 'update', 'delete', 'truncate']) priv
      where to_regclass('public.' || e.name) is not null and has_table_privilege('authenticated', to_regclass('public.' || e.name), priv)
      union all
      select 'authenticated cannot select ' || s.tbl from expected_auth_select s
      where to_regclass('public.' || s.tbl) is null or not has_table_privilege('authenticated', to_regclass('public.' || s.tbl), 'select')
      union all
      select 'authenticated can select private table ' || e.name from expected_tables e
      where e.name not in (select tbl from expected_auth_select) and to_regclass('public.' || e.name) is not null
        and has_table_privilege('authenticated', to_regclass('public.' || e.name), 'select'))
  union all
  select '11 function privileges (exact allow-lists)', (select count(*) from expected_functions) * 2,
    array(
      select 'anon cannot execute ' || e.sig from expected_anon_exec e
      where to_regprocedure(e.sig) is null or not has_function_privilege('anon', to_regprocedure(e.sig), 'execute')
      union all
      select 'anon can execute ' || f.sig from expected_functions f join present_functions p on p.sig = f.sig
      where has_function_privilege('anon', p.oid, 'execute') and f.sig not in (select sig from expected_anon_exec)
      union all
      select 'authenticated cannot execute ' || e.sig from expected_auth_exec e
      where to_regprocedure(e.sig) is null or not has_function_privilege('authenticated', to_regprocedure(e.sig), 'execute')
      union all
      select 'authenticated can execute internal ' || f.sig from expected_functions f join present_functions p on p.sig = f.sig
      where has_function_privilege('authenticated', p.oid, 'execute') and f.sig not in (select sig from expected_auth_exec))
  union all
  select '12 catalog data', 4,
    array(select x from (values
      (case when to_regclass('public.items') is null or (xpath('/row/c/text()', query_to_xml($q$select count(*) as c from public.items$q$, false, true, '')))[1]::text::int < 32 then 'items: expected at least 32' end),
      (case when to_regclass('public.marketplace_listings') is null or (xpath('/row/c/text()', query_to_xml($q$select count(*) as c from public.marketplace_listings where is_active$q$, false, true, '')))[1]::text::int < 29 then 'active listings: expected at least 29' end),
      (case when to_regclass('public.experiences') is null or (xpath('/row/c/text()', query_to_xml($q$select count(*) as c from public.experiences where status = 'playable'$q$, false, true, '')))[1]::text::int < 2 then 'playable experiences: expected 2' end),
      (case when to_regclass('public.game_passes') is null or (xpath('/row/c/text()', query_to_xml($q$select count(*) as c from public.game_passes where is_active$q$, false, true, '')))[1]::text::int < 6 then 'game passes: expected at least 6' end)
    ) v(x) where x is not null)
  union all
  select '13 every account has a BloxyBox profile', 1,
    array(select 'accounts without a profile: ' || n from (
      select case when to_regclass('public.profiles') is null then (select count(*) from auth.users)::text
        else (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)$q$, false, true, '')))[1]::text end as n) s
      where n <> '0')
  union all
  select '14 schema version', 1,
    array(select 'app_meta.schema_version = ' || coalesce(m.schema_version, 'missing') || ', expected 20261114000800'
          from meta m where m.schema_version is distinct from '20261114000800')
)
select category,
       case when cardinality(problems) = 0 then 'PASS' else 'FAIL' end as status,
       checked,
       case when cardinality(problems) = 0 then '' else array_to_string(problems, '; ') end as problems
from checks
union all
select '15 migration history (CLI)',
       case when h.versions is null then 'WARN'
            when (select bool_and(v = any(h.versions)) from expected_versions) then 'PASS'
            else 'FAIL' end,
       8,
       case when h.versions is null then 'no CLI history table (fine if you used the SQL editor)'
            else coalesce((select string_agg(v, ', ') from expected_versions where not v = any(h.versions)), '') end
from history h
order by 1;
"""
open(OUT, 'w').write(sql)
print(f'columns={len(columns)} constraints={len(constraints)} indexes={len(indexes)} functions={len(functions)} '
      f'policies={len(policies)} auth_select={len(auth_select)} anon_exec={len(anon_exec)} auth_exec={len(auth_exec)}')
