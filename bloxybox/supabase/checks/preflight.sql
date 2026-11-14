-- BloxyBox PREFLIGHT CHECK (read-only).
--
-- Run this BEFORE applying the migrations to an existing Supabase project:
--   npx supabase db query --remote --read-only -f supabase/checks/preflight.sql
-- or paste it into Dashboard -> SQL Editor and click Run.
--
-- It changes nothing. It lists objects that already exist in your project with
-- the same names BloxyBox creates. Any row with status CONFLICT means the
-- migrations would stop with an "already exists" error: do NOT drop anything
-- to "fix" it; decide what to do with that existing data first.
-- A project where every row says OK is ready for a first push. On a project
-- where BloxyBox is already installed, its own objects show as INSTALLED (not
-- CONFLICT) and `db push` will only apply newer migrations.

with expected_tables(name) as (
  values ('profiles'), ('user_roles'), ('wallets'), ('transactions'), ('items'),
         ('marketplace_listings'), ('inventory'), ('avatars'), ('experiences'),
         ('game_passes'), ('game_pass_ownership'), ('game_sessions'), ('game_progress'),
         ('follows'), ('profile_stats'), ('profile_visits'), ('dev_audit_log'), ('app_meta')
),
expected_functions(name) as (
  values ('_require_user'), ('level_for_xp'), ('xp_for_level'), ('_apply_wallet_change'),
         ('_provision_starter_state'), ('handle_new_user'), ('is_username_available'),
         ('set_username'), ('update_profile'), ('update_avatar'), ('daily_reward_amount'),
         ('get_daily_reward_status'), ('claim_daily_reward'), ('purchase_item'), ('equip_item'),
         ('unequip_item'), ('purchase_game_pass'), ('set_game_pass_enabled'),
         ('start_game_session'), ('submit_game_result'), ('get_leaderboard'), ('_avatar_json'),
         ('_player_card'), ('follow_user'), ('unfollow_user'), ('get_profile_summary'),
         ('list_connections'), ('search_players'), ('record_profile_visit'), ('is_developer'),
         ('_require_developer'), ('_audit'), ('_require_target'), ('dev_whoami'),
         ('dev_find_users'), ('dev_get_user'), ('dev_set_balance'), ('dev_adjust_balance'),
         ('dev_set_stats'), ('dev_grant_item'), ('dev_revoke_item'), ('dev_grant_pass'),
         ('dev_revoke_pass'), ('dev_reset_user'), ('dev_diagnostics'),
         ('dev_list_transactions'), ('dev_list_audit_log'), ('_backfill_existing_users')
),
history as (
  -- Migration history written by `supabase db push`. Read dynamically so this
  -- query also works on projects where that table doesn't exist yet.
  select case
    when to_regclass('supabase_migrations.schema_migrations') is null then '{}'::text[]
    else coalesce(string_to_array(nullif((xpath('/row/v/text()', query_to_xml(
      $q$select string_agg(version::text, ',' order by version) as v
         from supabase_migrations.schema_migrations
         where version::text between '20261114000100' and '20261114000899'$q$,
      false, true, '')))[1]::text, ''), ','), '{}'::text[])
  end as applied
),
installed as (
  select case when to_regclass('public.app_meta') is null then null
    else (xpath('/row/v/text()', query_to_xml(
      $q$select value as v from public.app_meta where key = 'schema_version'$q$, false, true, '')))[1]::text
  end as schema_version
),
rows as (
  select 'migration history' as category,
         'BloxyBox migrations already recorded' as object,
         case cardinality(h.applied)
           when 0 then 'OK'
           when 8 then 'ALREADY_APPLIED'
           else 'PARTIAL'
         end as status,
         case cardinality(h.applied)
           when 0 then 'none recorded; db push will apply all migrations'
           else array_to_string(h.applied, ', ')
         end as detail
  from history h

  union all
  select 'bloxybox', 'installed schema version',
         case when i.schema_version is null then 'OK' else 'INSTALLED' end,
         coalesce(i.schema_version, 'not installed')
  from installed i

  union all
  select 'table', 'public.' || e.name,
         case when c.oid is null then 'OK'
              when (select schema_version from installed) is not null then 'INSTALLED'
              else 'CONFLICT' end,
         case when c.oid is null then 'does not exist yet'
              else 'already exists (estimated rows: ' || greatest(c.reltuples, 0)::bigint || ')' end
  from expected_tables e
  left join pg_class c on c.relname = e.name and c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')

  union all
  select 'function', 'public.' || e.name || '()',
         case when count(p.oid) = 0 then 'OK'
              when (select schema_version from installed) is not null then 'INSTALLED'
              else 'CONFLICT' end,
         case when count(p.oid) = 0 then 'does not exist yet'
              else 'already exists: ' || string_agg(p.oid::regprocedure::text, '; ') end
  from expected_functions e
  left join pg_proc p on p.proname = e.name and p.pronamespace = 'public'::regnamespace
  group by e.name

  union all
  select 'trigger', 'auth.users / on_auth_user_created',
         case when count(t.oid) = 0 then 'OK'
              when (select schema_version from installed) is not null then 'INSTALLED'
              else 'CONFLICT' end,
         case when count(t.oid) = 0 then 'does not exist yet'
              else 'already exists, calls ' || string_agg(t.tgfoid::regprocedure::text, '; ') end
  from (select 1) one
  left join pg_trigger t on t.tgname = 'on_auth_user_created' and t.tgrelid = 'auth.users'::regclass

  union all
  select 'environment', 'PostgreSQL version', 'INFO', current_setting('server_version')
  union all
  select 'environment', 'auth.users present', case when to_regclass('auth.users') is null then 'CONFLICT' else 'OK' end,
         case when to_regclass('auth.users') is null then 'not a Supabase database?' else 'Supabase Auth schema found' end
)
select category, object, status, detail
from rows
order by case status when 'CONFLICT' then 0 when 'PARTIAL' then 1 when 'ALREADY_APPLIED' then 2 when 'INSTALLED' then 3 when 'INFO' then 5 else 4 end,
         category, object;
