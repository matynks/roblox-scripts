-- Privileges, RLS and function exposure.
-- Proves that clients can only read what they should and can write nothing directly.

-- 1. Anonymous clients: no table access, only the username check RPC.
do $$
declare
  v_table text;
begin
  perform tests.anonymous();
  foreach v_table in array array[
    'profiles', 'user_roles', 'wallets', 'transactions', 'items', 'marketplace_listings', 'inventory',
    'avatars', 'experiences', 'game_passes', 'game_pass_ownership', 'game_sessions', 'game_progress',
    'follows', 'profile_stats', 'profile_visits', 'dev_audit_log', 'app_meta'
  ] loop
    perform tests.assert_throws(format('select * from public.%I', v_table), 'permission denied',
      format('anon must not read %s', v_table));
  end loop;

  perform tests.assert_eq(public.is_username_available('free_name'), true, 'anon can check username availability');
  perform tests.assert_throws('select public.claim_daily_reward()', 'permission denied', 'anon cannot claim rewards');
  perform tests.assert_throws('select public.dev_whoami()', 'permission denied', 'anon cannot reach dev tools');
end $$;

-- 2. Function exposure allowlists (catches any function accidentally left callable).
do $$
declare
  v_unexpected text;
  v_missing text;
  v_allowed_authenticated text[] := array[
    'is_username_available', 'set_username', 'update_profile', 'update_avatar',
    'get_daily_reward_status', 'claim_daily_reward', 'level_for_xp', 'xp_for_level',
    'purchase_item', 'equip_item', 'unequip_item', 'purchase_game_pass', 'set_game_pass_enabled',
    'start_game_session', 'submit_game_result', 'get_leaderboard',
    'follow_user', 'unfollow_user', 'get_profile_summary', 'list_connections', 'search_players',
    'record_profile_visit',
    'dev_whoami', 'dev_find_users', 'dev_set_balance', 'dev_adjust_balance', 'dev_set_stats',
    'dev_grant_item', 'dev_revoke_item', 'dev_grant_pass', 'dev_revoke_pass', 'dev_reset_user',
    'dev_diagnostics', 'dev_list_transactions', 'dev_list_audit_log'
  ];
begin
  select string_agg(p.proname, ', ') into v_unexpected
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.proname <> all (v_allowed_authenticated);
  perform tests.assert(v_unexpected is null, 'unexpected functions executable by authenticated: ' || coalesce(v_unexpected, ''));

  select string_agg(a, ', ') into v_missing
  from unnest(v_allowed_authenticated) a
  where not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = a and has_function_privilege('authenticated', p.oid, 'execute')
  );
  perform tests.assert(v_missing is null, 'functions missing for authenticated: ' || coalesce(v_missing, ''));

  select string_agg(p.proname, ', ') into v_unexpected
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname <> 'is_username_available';
  perform tests.assert(v_unexpected is null, 'unexpected functions executable by anon: ' || coalesce(v_unexpected, ''));

  -- Every SECURITY DEFINER function must pin search_path.
  select string_agg(p.proname, ', ') into v_unexpected
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  perform tests.assert(v_unexpected is null, 'security definer functions without search_path: ' || coalesce(v_unexpected, ''));

  -- RLS must be on for every public table.
  select string_agg(c.relname, ', ') into v_unexpected
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  perform tests.assert(v_unexpected is null, 'tables without RLS: ' || coalesce(v_unexpected, ''));
end $$;

-- 3. Authenticated clients cannot write any table directly.
do $$
declare
  v_alice uuid := tests.create_user('alice');
  v_bob uuid := tests.create_user('bob');
  v_item uuid := (select id from public.items where slug = 'crown-royal');
  v_pass uuid := (select id from public.game_passes where slug = 'box-stack-double-coins');
begin
  perform tests.authenticate(v_alice);

  perform tests.assert_throws(format('update public.wallets set balance = 999999 where user_id = %L', v_alice),
    'permission denied', 'cannot update own wallet');
  perform tests.assert_throws(format($q$insert into public.transactions (user_id, amount, balance_after, kind, description)
    values (%L, 1000, 1500, 'daily_reward', 'fake')$q$, v_alice), 'permission denied', 'cannot insert ledger rows');
  perform tests.assert_throws(format($q$insert into public.inventory (user_id, item_id, slot, acquired_via)
    values (%L, %L, 'hat', 'purchase')$q$, v_alice, v_item), 'permission denied', 'cannot insert inventory');
  perform tests.assert_throws(format($q$insert into public.game_pass_ownership (user_id, pass_id, acquired_via)
    values (%L, %L, 'purchase')$q$, v_alice, v_pass), 'permission denied', 'cannot grant self a pass');
  perform tests.assert_throws(format($q$insert into public.user_roles (user_id, role) values (%L, 'developer')$q$, v_alice),
    'permission denied', 'cannot grant self developer role');
  perform tests.assert_throws(format($q$update public.profiles set username = 'hacked' where id = %L$q$, v_alice),
    'permission denied', 'cannot update profile directly');
  perform tests.assert_throws(format($q$update public.profile_stats set simulated_followers = 1000000 where user_id = %L$q$, v_alice),
    'permission denied', 'cannot inflate own stats');
  perform tests.assert_throws(format($q$delete from public.transactions where user_id = %L$q$, v_alice),
    'permission denied', 'cannot delete ledger rows');
  perform tests.assert_throws(format($q$insert into public.follows (follower_id, followee_id) values (%L, %L)$q$, v_bob, v_alice),
    'permission denied', 'cannot forge follows');
  perform tests.assert_throws('update public.marketplace_listings set price = 1', 'permission denied', 'cannot change prices');
  perform tests.assert_throws('select * from public.user_roles', 'permission denied', 'cannot read roles');
  perform tests.assert_throws('select * from public.dev_audit_log', 'permission denied', 'cannot read audit log');

  -- Internal functions are not callable.
  perform tests.assert_throws(format($q$select public._apply_wallet_change(%L, 100000, 'daily_reward', 'x')$q$, v_alice),
    'permission denied', 'cannot call ledger internals');
  perform tests.assert_throws(format($q$select public._provision_starter_state(%L, 'welcome_bonus')$q$, v_alice),
    'permission denied', 'cannot re-provision starter state');
  perform tests.assert_throws('select public.is_developer()', 'permission denied', 'is_developer is internal');
end $$;

-- 4. Row level security isolates private data.
do $$
declare
  v_carol uuid := tests.create_user('carol');
  v_dave uuid := tests.create_user('dave');
  v_count integer;
begin
  perform tests.authenticate(v_carol);

  select count(*) into v_count from public.wallets;
  perform tests.assert_eq(v_count, 1, 'only own wallet visible');
  select count(*) into v_count from public.wallets where user_id = v_dave;
  perform tests.assert_eq(v_count, 0, 'other wallets hidden');
  select count(*) into v_count from public.transactions where user_id = v_dave;
  perform tests.assert_eq(v_count, 0, 'other transactions hidden');

  -- Public data is visible.
  select count(*) into v_count from public.profiles where id = v_dave;
  perform tests.assert_eq(v_count, 1, 'other profiles visible');
  select count(*) into v_count from public.inventory where user_id = v_dave;
  perform tests.assert_eq(v_count, 3, 'other players equipped starter items visible');
  select count(*) into v_count from public.items;
  perform tests.assert(v_count > 20, 'catalog visible');

  -- Unequipped items of others are hidden.
  perform tests.as_owner();
  update public.inventory set equipped = false where user_id = v_dave;
  perform tests.authenticate(v_carol);
  select count(*) into v_count from public.inventory where user_id = v_dave;
  perform tests.assert_eq(v_count, 0, 'other players unequipped items hidden');
end $$;
