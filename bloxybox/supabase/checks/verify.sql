-- BloxyBox POST-MIGRATION VERIFICATION (read-only).
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
    ('profiles'),
    ('user_roles'),
    ('wallets'),
    ('transactions'),
    ('items'),
    ('marketplace_listings'),
    ('inventory'),
    ('avatars'),
    ('experiences'),
    ('game_passes'),
    ('game_pass_ownership'),
    ('game_sessions'),
    ('game_progress'),
    ('follows'),
    ('profile_stats'),
    ('profile_visits'),
    ('dev_audit_log'),
    ('app_meta')
),
expected_columns(tbl, col, typ, nullable) as (values
    ('app_meta', 'key', 'text', 'NO'),
    ('app_meta', 'value', 'text', 'NO'),
    ('avatars', 'user_id', 'uuid', 'NO'),
    ('avatars', 'skin_color', 'text', 'NO'),
    ('avatars', 'head_shape', 'text', 'NO'),
    ('avatars', 'updated_at', 'timestamp with time zone', 'NO'),
    ('dev_audit_log', 'id', 'bigint', 'NO'),
    ('dev_audit_log', 'actor_id', 'uuid', 'YES'),
    ('dev_audit_log', 'action', 'text', 'NO'),
    ('dev_audit_log', 'target_user_id', 'uuid', 'YES'),
    ('dev_audit_log', 'details', 'jsonb', 'NO'),
    ('dev_audit_log', 'created_at', 'timestamp with time zone', 'NO'),
    ('experiences', 'id', 'uuid', 'NO'),
    ('experiences', 'slug', 'text', 'NO'),
    ('experiences', 'title', 'text', 'NO'),
    ('experiences', 'tagline', 'text', 'NO'),
    ('experiences', 'description', 'text', 'NO'),
    ('experiences', 'how_to_play', 'text', 'NO'),
    ('experiences', 'category', 'text', 'NO'),
    ('experiences', 'status', 'text', 'NO'),
    ('experiences', 'is_featured', 'boolean', 'NO'),
    ('experiences', 'sort_order', 'integer', 'NO'),
    ('experiences', 'accent_color', 'text', 'NO'),
    ('experiences', 'score_label', 'text', 'NO'),
    ('experiences', 'released_at', 'date', 'YES'),
    ('experiences', 'coins_per_point', 'numeric', 'NO'),
    ('experiences', 'win_bonus', 'integer', 'NO'),
    ('experiences', 'max_reward_per_run', 'integer', 'NO'),
    ('experiences', 'daily_reward_cap', 'integer', 'NO'),
    ('experiences', 'xp_per_point', 'numeric', 'NO'),
    ('experiences', 'max_xp_per_run', 'integer', 'NO'),
    ('experiences', 'max_points_per_second', 'numeric', 'NO'),
    ('experiences', 'win_score', 'integer', 'NO'),
    ('experiences', 'min_win_seconds', 'integer', 'NO'),
    ('experiences', 'max_session_minutes', 'integer', 'NO'),
    ('experiences', 'play_count', 'bigint', 'NO'),
    ('experiences', 'created_at', 'timestamp with time zone', 'NO'),
    ('follows', 'follower_id', 'uuid', 'NO'),
    ('follows', 'followee_id', 'uuid', 'NO'),
    ('follows', 'created_at', 'timestamp with time zone', 'NO'),
    ('game_pass_ownership', 'user_id', 'uuid', 'NO'),
    ('game_pass_ownership', 'pass_id', 'uuid', 'NO'),
    ('game_pass_ownership', 'enabled', 'boolean', 'NO'),
    ('game_pass_ownership', 'acquired_via', 'text', 'NO'),
    ('game_pass_ownership', 'price_paid', 'bigint', 'NO'),
    ('game_pass_ownership', 'acquired_at', 'timestamp with time zone', 'NO'),
    ('game_passes', 'id', 'uuid', 'NO'),
    ('game_passes', 'slug', 'text', 'NO'),
    ('game_passes', 'experience_id', 'uuid', 'NO'),
    ('game_passes', 'name', 'text', 'NO'),
    ('game_passes', 'description', 'text', 'NO'),
    ('game_passes', 'price', 'bigint', 'NO'),
    ('game_passes', 'perk', 'text', 'NO'),
    ('game_passes', 'is_active', 'boolean', 'NO'),
    ('game_passes', 'sort_order', 'integer', 'NO'),
    ('game_passes', 'created_at', 'timestamp with time zone', 'NO'),
    ('game_progress', 'user_id', 'uuid', 'NO'),
    ('game_progress', 'experience_id', 'uuid', 'NO'),
    ('game_progress', 'best_score', 'integer', 'NO'),
    ('game_progress', 'total_plays', 'integer', 'NO'),
    ('game_progress', 'wins', 'integer', 'NO'),
    ('game_progress', 'total_coins_earned', 'bigint', 'NO'),
    ('game_progress', 'last_played_at', 'timestamp with time zone', 'YES'),
    ('game_sessions', 'id', 'uuid', 'NO'),
    ('game_sessions', 'user_id', 'uuid', 'NO'),
    ('game_sessions', 'experience_id', 'uuid', 'NO'),
    ('game_sessions', 'status', 'text', 'NO'),
    ('game_sessions', 'started_at', 'timestamp with time zone', 'NO'),
    ('game_sessions', 'ended_at', 'timestamp with time zone', 'YES'),
    ('game_sessions', 'score', 'integer', 'YES'),
    ('game_sessions', 'outcome', 'text', 'YES'),
    ('game_sessions', 'reward', 'bigint', 'NO'),
    ('game_sessions', 'xp_gained', 'integer', 'NO'),
    ('game_sessions', 'perks', 'ARRAY', 'NO'),
    ('game_sessions', 'client_duration_ms', 'integer', 'YES'),
    ('game_sessions', 'rejection_reason', 'text', 'YES'),
    ('inventory', 'id', 'uuid', 'NO'),
    ('inventory', 'user_id', 'uuid', 'NO'),
    ('inventory', 'item_id', 'uuid', 'NO'),
    ('inventory', 'slot', 'text', 'NO'),
    ('inventory', 'equipped', 'boolean', 'NO'),
    ('inventory', 'acquired_via', 'text', 'NO'),
    ('inventory', 'price_paid', 'bigint', 'NO'),
    ('inventory', 'acquired_at', 'timestamp with time zone', 'NO'),
    ('items', 'id', 'uuid', 'NO'),
    ('items', 'slug', 'text', 'NO'),
    ('items', 'name', 'text', 'NO'),
    ('items', 'description', 'text', 'NO'),
    ('items', 'slot', 'text', 'NO'),
    ('items', 'rarity', 'text', 'NO'),
    ('items', 'asset_key', 'text', 'NO'),
    ('items', 'primary_color', 'text', 'NO'),
    ('items', 'secondary_color', 'text', 'NO'),
    ('items', 'is_starter', 'boolean', 'NO'),
    ('items', 'created_at', 'timestamp with time zone', 'NO'),
    ('marketplace_listings', 'id', 'uuid', 'NO'),
    ('marketplace_listings', 'item_id', 'uuid', 'NO'),
    ('marketplace_listings', 'price', 'bigint', 'NO'),
    ('marketplace_listings', 'is_active', 'boolean', 'NO'),
    ('marketplace_listings', 'is_featured', 'boolean', 'NO'),
    ('marketplace_listings', 'listed_at', 'timestamp with time zone', 'NO'),
    ('profile_stats', 'user_id', 'uuid', 'NO'),
    ('profile_stats', 'xp', 'bigint', 'NO'),
    ('profile_stats', 'level', 'integer', 'NO'),
    ('profile_stats', 'simulated_followers', 'bigint', 'NO'),
    ('profile_stats', 'profile_visits', 'bigint', 'NO'),
    ('profile_stats', 'games_played', 'bigint', 'NO'),
    ('profile_stats', 'daily_streak', 'integer', 'NO'),
    ('profile_stats', 'last_daily_claim', 'date', 'YES'),
    ('profile_stats', 'updated_at', 'timestamp with time zone', 'NO'),
    ('profile_visits', 'visitor_id', 'uuid', 'NO'),
    ('profile_visits', 'visited_id', 'uuid', 'NO'),
    ('profile_visits', 'visit_day', 'date', 'NO'),
    ('profiles', 'id', 'uuid', 'NO'),
    ('profiles', 'username', 'text', 'NO'),
    ('profiles', 'display_name', 'text', 'NO'),
    ('profiles', 'bio', 'text', 'NO'),
    ('profiles', 'accent', 'text', 'NO'),
    ('profiles', 'created_at', 'timestamp with time zone', 'NO'),
    ('profiles', 'updated_at', 'timestamp with time zone', 'NO'),
    ('transactions', 'id', 'bigint', 'NO'),
    ('transactions', 'user_id', 'uuid', 'NO'),
    ('transactions', 'amount', 'bigint', 'NO'),
    ('transactions', 'balance_after', 'bigint', 'NO'),
    ('transactions', 'kind', 'text', 'NO'),
    ('transactions', 'description', 'text', 'NO'),
    ('transactions', 'reference_type', 'text', 'YES'),
    ('transactions', 'reference_id', 'text', 'YES'),
    ('transactions', 'metadata', 'jsonb', 'NO'),
    ('transactions', 'created_at', 'timestamp with time zone', 'NO'),
    ('user_roles', 'user_id', 'uuid', 'NO'),
    ('user_roles', 'role', 'text', 'NO'),
    ('user_roles', 'granted_at', 'timestamp with time zone', 'NO'),
    ('user_roles', 'note', 'text', 'YES'),
    ('wallets', 'user_id', 'uuid', 'NO'),
    ('wallets', 'balance', 'bigint', 'NO'),
    ('wallets', 'lifetime_earned', 'bigint', 'NO'),
    ('wallets', 'lifetime_spent', 'bigint', 'NO'),
    ('wallets', 'updated_at', 'timestamp with time zone', 'NO')
),
expected_constraints(tbl, name, kind) as (values
    ('app_meta', 'app_meta_pkey', 'p'),
    ('avatars', 'avatars_head_shape_valid', 'c'),
    ('avatars', 'avatars_pkey', 'p'),
    ('avatars', 'avatars_skin_color_valid', 'c'),
    ('avatars', 'avatars_user_id_fkey', 'f'),
    ('dev_audit_log', 'dev_audit_log_actor_id_fkey', 'f'),
    ('dev_audit_log', 'dev_audit_log_pkey', 'p'),
    ('dev_audit_log', 'dev_audit_log_target_user_id_fkey', 'f'),
    ('experiences', 'experiences_accent_hex', 'c'),
    ('experiences', 'experiences_category_valid', 'c'),
    ('experiences', 'experiences_coins_per_point_non_negative', 'c'),
    ('experiences', 'experiences_daily_cap_non_negative', 'c'),
    ('experiences', 'experiences_max_reward_non_negative', 'c'),
    ('experiences', 'experiences_max_xp_non_negative', 'c'),
    ('experiences', 'experiences_min_win_non_negative', 'c'),
    ('experiences', 'experiences_pkey', 'p'),
    ('experiences', 'experiences_play_count_non_negative', 'c'),
    ('experiences', 'experiences_playable_has_rules', 'c'),
    ('experiences', 'experiences_rate_non_negative', 'c'),
    ('experiences', 'experiences_session_minutes_positive', 'c'),
    ('experiences', 'experiences_slug_format', 'c'),
    ('experiences', 'experiences_slug_key', 'u'),
    ('experiences', 'experiences_status_valid', 'c'),
    ('experiences', 'experiences_win_bonus_non_negative', 'c'),
    ('experiences', 'experiences_win_score_non_negative', 'c'),
    ('experiences', 'experiences_xp_per_point_non_negative', 'c'),
    ('follows', 'follows_followee_id_fkey', 'f'),
    ('follows', 'follows_follower_id_fkey', 'f'),
    ('follows', 'follows_no_self_follow', 'c'),
    ('follows', 'follows_pkey', 'p'),
    ('game_pass_ownership', 'game_pass_ownership_acquired_via_valid', 'c'),
    ('game_pass_ownership', 'game_pass_ownership_pass_id_fkey', 'f'),
    ('game_pass_ownership', 'game_pass_ownership_pkey', 'p'),
    ('game_pass_ownership', 'game_pass_ownership_price_non_negative', 'c'),
    ('game_pass_ownership', 'game_pass_ownership_user_id_fkey', 'f'),
    ('game_passes', 'game_passes_experience_id_fkey', 'f'),
    ('game_passes', 'game_passes_one_perk_per_experience', 'u'),
    ('game_passes', 'game_passes_perk_valid', 'c'),
    ('game_passes', 'game_passes_pkey', 'p'),
    ('game_passes', 'game_passes_price_positive', 'c'),
    ('game_passes', 'game_passes_slug_format', 'c'),
    ('game_passes', 'game_passes_slug_key', 'u'),
    ('game_progress', 'game_progress_best_non_negative', 'c'),
    ('game_progress', 'game_progress_coins_non_negative', 'c'),
    ('game_progress', 'game_progress_experience_id_fkey', 'f'),
    ('game_progress', 'game_progress_pkey', 'p'),
    ('game_progress', 'game_progress_plays_non_negative', 'c'),
    ('game_progress', 'game_progress_user_id_fkey', 'f'),
    ('game_progress', 'game_progress_wins_non_negative', 'c'),
    ('game_sessions', 'game_sessions_experience_id_fkey', 'f'),
    ('game_sessions', 'game_sessions_outcome_valid', 'c'),
    ('game_sessions', 'game_sessions_pkey', 'p'),
    ('game_sessions', 'game_sessions_reward_non_negative', 'c'),
    ('game_sessions', 'game_sessions_score_non_negative', 'c'),
    ('game_sessions', 'game_sessions_status_valid', 'c'),
    ('game_sessions', 'game_sessions_user_id_fkey', 'f'),
    ('game_sessions', 'game_sessions_xp_non_negative', 'c'),
    ('inventory', 'inventory_acquired_via_valid', 'c'),
    ('inventory', 'inventory_item_id_fkey', 'f'),
    ('inventory', 'inventory_pkey', 'p'),
    ('inventory', 'inventory_price_paid_non_negative', 'c'),
    ('inventory', 'inventory_slot_valid', 'c'),
    ('inventory', 'inventory_user_id_fkey', 'f'),
    ('inventory', 'inventory_user_item_unique', 'u'),
    ('items', 'items_pkey', 'p'),
    ('items', 'items_primary_color_hex', 'c'),
    ('items', 'items_rarity_valid', 'c'),
    ('items', 'items_secondary_color_hex', 'c'),
    ('items', 'items_slot_valid', 'c'),
    ('items', 'items_slug_format', 'c'),
    ('items', 'items_slug_key', 'u'),
    ('marketplace_listings', 'marketplace_listings_item_id_fkey', 'f'),
    ('marketplace_listings', 'marketplace_listings_item_id_key', 'u'),
    ('marketplace_listings', 'marketplace_listings_pkey', 'p'),
    ('marketplace_listings', 'marketplace_listings_price_positive', 'c'),
    ('profile_stats', 'profile_stats_games_non_negative', 'c'),
    ('profile_stats', 'profile_stats_level_positive', 'c'),
    ('profile_stats', 'profile_stats_pkey', 'p'),
    ('profile_stats', 'profile_stats_sim_followers_non_negative', 'c'),
    ('profile_stats', 'profile_stats_streak_non_negative', 'c'),
    ('profile_stats', 'profile_stats_user_id_fkey', 'f'),
    ('profile_stats', 'profile_stats_visits_non_negative', 'c'),
    ('profile_stats', 'profile_stats_xp_non_negative', 'c'),
    ('profile_visits', 'profile_visits_pkey', 'p'),
    ('profile_visits', 'profile_visits_visited_id_fkey', 'f'),
    ('profile_visits', 'profile_visits_visitor_id_fkey', 'f'),
    ('profiles', 'profiles_accent_valid', 'c'),
    ('profiles', 'profiles_bio_length', 'c'),
    ('profiles', 'profiles_display_name_length', 'c'),
    ('profiles', 'profiles_id_fkey', 'f'),
    ('profiles', 'profiles_pkey', 'p'),
    ('profiles', 'profiles_username_format', 'c'),
    ('profiles', 'profiles_username_key', 'u'),
    ('transactions', 'transactions_amount_non_zero', 'c'),
    ('transactions', 'transactions_balance_after_non_negative', 'c'),
    ('transactions', 'transactions_kind_valid', 'c'),
    ('transactions', 'transactions_pkey', 'p'),
    ('transactions', 'transactions_reference_type_valid', 'c'),
    ('transactions', 'transactions_user_id_fkey', 'f'),
    ('user_roles', 'user_roles_pkey', 'p'),
    ('user_roles', 'user_roles_role_valid', 'c'),
    ('user_roles', 'user_roles_user_id_fkey', 'f'),
    ('wallets', 'wallets_balance_limit', 'c'),
    ('wallets', 'wallets_balance_non_negative', 'c'),
    ('wallets', 'wallets_lifetime_earned_non_negative', 'c'),
    ('wallets', 'wallets_lifetime_spent_non_negative', 'c'),
    ('wallets', 'wallets_pkey', 'p'),
    ('wallets', 'wallets_user_id_fkey', 'f')
),
expected_indexes(tbl, name) as (values
    ('app_meta', 'app_meta_pkey'),
    ('avatars', 'avatars_pkey'),
    ('dev_audit_log', 'dev_audit_log_created_idx'),
    ('dev_audit_log', 'dev_audit_log_pkey'),
    ('experiences', 'experiences_pkey'),
    ('experiences', 'experiences_slug_key'),
    ('follows', 'follows_followee_idx'),
    ('follows', 'follows_pkey'),
    ('game_pass_ownership', 'game_pass_ownership_pass_idx'),
    ('game_pass_ownership', 'game_pass_ownership_pkey'),
    ('game_passes', 'game_passes_one_perk_per_experience'),
    ('game_passes', 'game_passes_pkey'),
    ('game_passes', 'game_passes_slug_key'),
    ('game_progress', 'game_progress_leaderboard_idx'),
    ('game_progress', 'game_progress_pkey'),
    ('game_sessions', 'game_sessions_active_idx'),
    ('game_sessions', 'game_sessions_pkey'),
    ('game_sessions', 'game_sessions_reward_day_idx'),
    ('game_sessions', 'game_sessions_user_started_idx'),
    ('inventory', 'inventory_item_idx'),
    ('inventory', 'inventory_one_equipped_per_slot'),
    ('inventory', 'inventory_pkey'),
    ('inventory', 'inventory_user_item_unique'),
    ('items', 'items_pkey'),
    ('items', 'items_slot_idx'),
    ('items', 'items_slug_key'),
    ('marketplace_listings', 'marketplace_listings_active_idx'),
    ('marketplace_listings', 'marketplace_listings_item_id_key'),
    ('marketplace_listings', 'marketplace_listings_pkey'),
    ('profile_stats', 'profile_stats_pkey'),
    ('profile_visits', 'profile_visits_pkey'),
    ('profiles', 'profiles_pkey'),
    ('profiles', 'profiles_username_key'),
    ('transactions', 'transactions_pkey'),
    ('transactions', 'transactions_user_created_idx'),
    ('user_roles', 'user_roles_pkey'),
    ('wallets', 'wallets_pkey')
),
expected_functions(sig, secdef) as (values
    ('_apply_wallet_change(uuid,bigint,text,text,text,text,jsonb)', 'true'),
    ('_audit(text,uuid,jsonb)', 'true'),
    ('_avatar_json(uuid)', 'true'),
    ('_backfill_existing_users()', 'true'),
    ('_player_card(uuid)', 'true'),
    ('_provision_starter_state(uuid,text)', 'true'),
    ('_require_developer()', 'true'),
    ('_require_target(uuid)', 'true'),
    ('_require_user()', 'false'),
    ('claim_daily_reward()', 'true'),
    ('daily_reward_amount(integer)', 'false'),
    ('dev_adjust_balance(uuid,bigint,text)', 'true'),
    ('dev_diagnostics()', 'true'),
    ('dev_find_users(text)', 'true'),
    ('dev_get_user(uuid)', 'true'),
    ('dev_grant_item(uuid,uuid)', 'true'),
    ('dev_grant_pass(uuid,uuid)', 'true'),
    ('dev_list_audit_log(integer)', 'true'),
    ('dev_list_transactions(uuid,integer)', 'true'),
    ('dev_reset_user(uuid,boolean)', 'true'),
    ('dev_revoke_item(uuid,uuid)', 'true'),
    ('dev_revoke_pass(uuid,uuid)', 'true'),
    ('dev_set_balance(uuid,bigint,text)', 'true'),
    ('dev_set_stats(uuid,bigint,bigint,bigint,bigint)', 'true'),
    ('dev_whoami()', 'true'),
    ('equip_item(uuid)', 'true'),
    ('follow_user(uuid)', 'true'),
    ('get_daily_reward_status()', 'true'),
    ('get_leaderboard(text,integer)', 'true'),
    ('get_profile_summary(uuid)', 'true'),
    ('handle_new_user()', 'true'),
    ('is_developer()', 'true'),
    ('is_username_available(text)', 'true'),
    ('level_for_xp(bigint)', 'false'),
    ('list_connections(uuid,text,integer,integer)', 'true'),
    ('purchase_game_pass(uuid)', 'true'),
    ('purchase_item(uuid)', 'true'),
    ('record_profile_visit(uuid)', 'true'),
    ('search_players(text,integer)', 'true'),
    ('set_game_pass_enabled(uuid,boolean)', 'true'),
    ('set_username(text)', 'true'),
    ('start_game_session(text)', 'true'),
    ('submit_game_result(uuid,integer,text,integer)', 'true'),
    ('unequip_item(uuid)', 'true'),
    ('unfollow_user(uuid)', 'true'),
    ('update_avatar(text,text)', 'true'),
    ('update_profile(text,text,text)', 'true'),
    ('xp_for_level(integer)', 'false')
),
expected_policies(tbl, name, cmd, roles) as (values
    ('avatars', 'avatars_read', 'SELECT', 'authenticated'),
    ('experiences', 'experiences_read', 'SELECT', 'authenticated'),
    ('follows', 'follows_read', 'SELECT', 'authenticated'),
    ('game_pass_ownership', 'game_pass_ownership_read_own', 'SELECT', 'authenticated'),
    ('game_passes', 'game_passes_read', 'SELECT', 'authenticated'),
    ('game_progress', 'game_progress_read', 'SELECT', 'authenticated'),
    ('game_sessions', 'game_sessions_read_own', 'SELECT', 'authenticated'),
    ('inventory', 'inventory_read', 'SELECT', 'authenticated'),
    ('items', 'items_read', 'SELECT', 'authenticated'),
    ('marketplace_listings', 'marketplace_listings_read', 'SELECT', 'authenticated'),
    ('profile_stats', 'profile_stats_read', 'SELECT', 'authenticated'),
    ('profiles', 'profiles_read', 'SELECT', 'authenticated'),
    ('transactions', 'transactions_read_own', 'SELECT', 'authenticated'),
    ('wallets', 'wallets_read_own', 'SELECT', 'authenticated')
),
expected_auth_select(tbl) as (values
    ('avatars'),
    ('experiences'),
    ('follows'),
    ('game_pass_ownership'),
    ('game_passes'),
    ('game_progress'),
    ('game_sessions'),
    ('inventory'),
    ('items'),
    ('marketplace_listings'),
    ('profile_stats'),
    ('profiles'),
    ('transactions'),
    ('wallets')
),
expected_anon_exec(sig) as (values
    ('is_username_available(text)')
),
expected_auth_exec(sig) as (values
    ('claim_daily_reward()'),
    ('dev_adjust_balance(uuid,bigint,text)'),
    ('dev_diagnostics()'),
    ('dev_find_users(text)'),
    ('dev_get_user(uuid)'),
    ('dev_grant_item(uuid,uuid)'),
    ('dev_grant_pass(uuid,uuid)'),
    ('dev_list_audit_log(integer)'),
    ('dev_list_transactions(uuid,integer)'),
    ('dev_reset_user(uuid,boolean)'),
    ('dev_revoke_item(uuid,uuid)'),
    ('dev_revoke_pass(uuid,uuid)'),
    ('dev_set_balance(uuid,bigint,text)'),
    ('dev_set_stats(uuid,bigint,bigint,bigint,bigint)'),
    ('dev_whoami()'),
    ('equip_item(uuid)'),
    ('follow_user(uuid)'),
    ('get_daily_reward_status()'),
    ('get_leaderboard(text,integer)'),
    ('get_profile_summary(uuid)'),
    ('is_username_available(text)'),
    ('level_for_xp(bigint)'),
    ('list_connections(uuid,text,integer,integer)'),
    ('purchase_game_pass(uuid)'),
    ('purchase_item(uuid)'),
    ('record_profile_visit(uuid)'),
    ('search_players(text,integer)'),
    ('set_game_pass_enabled(uuid,boolean)'),
    ('set_username(text)'),
    ('start_game_session(text)'),
    ('submit_game_result(uuid,integer,text,integer)'),
    ('unequip_item(uuid)'),
    ('unfollow_user(uuid)'),
    ('update_avatar(text,text)'),
    ('update_profile(text,text,text)'),
    ('xp_for_level(integer)')
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
          where f.prosecdef and not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%'))
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
