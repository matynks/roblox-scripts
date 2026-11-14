-- Developer Modify Menu backend: authorization, effects and audit logging.

-- 1. A normal user is rejected by every developer function, nothing changes,
--    and the denied menu probe is logged.
do $$
declare
  v_user uuid := tests.create_user('regular');
  v_item uuid := (select id from public.items where slug = 'crown-royal');
  v_pass uuid := (select id from public.game_passes where slug = 'lane-dash-coin-magnet');
  v_call text;
begin
  perform tests.authenticate(v_user);

  perform tests.assert_eq((public.dev_whoami() ->> 'is_developer')::boolean, false, 'whoami says no');

  foreach v_call in array array[
    format('select public.dev_find_users(%L)', ''),
    format('select public.dev_get_user(%L)', v_user),
    format('select public.dev_set_balance(%L, 999999)', v_user),
    format('select public.dev_adjust_balance(%L, 999999)', v_user),
    format('select public.dev_set_stats(%L, 1000000)', v_user),
    format('select public.dev_grant_item(%L, %L)', v_user, v_item),
    format('select public.dev_revoke_item(%L, %L)', v_user, v_item),
    format('select public.dev_grant_pass(%L, %L)', v_user, v_pass),
    format('select public.dev_revoke_pass(%L, %L)', v_user, v_pass),
    format('select public.dev_reset_user(%L)', v_user),
    'select public.dev_diagnostics()',
    'select public.dev_list_transactions()',
    'select public.dev_list_audit_log()'
  ] loop
    perform tests.assert_throws(v_call, 'FORBIDDEN', 'non-developer rejected: ' || v_call);
  end loop;

  perform tests.as_owner();
  perform tests.assert_eq((select balance from public.wallets where user_id = v_user), 500::bigint, 'balance untouched');
  perform tests.assert_eq((select count(*)::integer from public.inventory where user_id = v_user), 3, 'inventory untouched');
  perform tests.assert_eq((select count(*)::integer from public.game_pass_ownership where user_id = v_user), 0, 'no passes granted');
  perform tests.assert_eq((select simulated_followers from public.profile_stats where user_id = v_user), 0::bigint, 'stats untouched');
  perform tests.assert_eq((select count(*)::integer from public.dev_audit_log where actor_id = v_user and action = 'access_denied'), 1, 'denied probe logged');
  perform tests.assert_eq((select count(*)::integer from public.dev_audit_log where action <> 'access_denied'), 0, 'no other audit rows');
end $$;

-- 2. A developer can modify simulated data; every change is ledgered and audited.
do $$
declare
  v_dev uuid := tests.create_user('devlead');
  v_target uuid := tests.create_user('tester');
  v_item uuid := (select id from public.items where slug = 'back-wings');
  v_pass uuid := (select id from public.game_passes where slug = 'lane-dash-second-wind');
  v_result jsonb;
  v_session uuid;
begin
  perform tests.as_owner();
  insert into public.user_roles (user_id, role, note) values (v_dev, 'developer', 'test');

  perform tests.authenticate(v_dev);
  perform tests.assert_eq((public.dev_whoami() ->> 'is_developer')::boolean, true, 'whoami says yes');
  perform tests.assert_eq(jsonb_array_length(public.dev_find_users('test')), 1, 'find users');
  v_result := public.dev_get_user(v_target);
  perform tests.assert_eq((v_result -> 'wallet' ->> 'balance')::bigint, 500::bigint, 'snapshot balance');
  perform tests.assert_eq(jsonb_array_length(v_result -> 'item_ids'), 3, 'snapshot items');
  perform tests.assert_eq((v_result ->> 'is_developer')::boolean, false, 'target is not a developer');

  -- Balance
  v_result := public.dev_set_balance(v_target, 25000, 'QA');
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 25000::bigint, 'balance set');
  v_result := public.dev_adjust_balance(v_target, -5000, 'QA');
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 20000::bigint, 'balance adjusted');
  perform tests.assert_throws(format('select public.dev_adjust_balance(%L, -999999)', v_target), 'INSUFFICIENT_FUNDS', 'cannot go negative');
  perform tests.assert_throws(format('select public.dev_set_balance(%L, -1)', v_target), 'INVALID_AMOUNT', 'negative target rejected');
  perform tests.assert_throws(format('select public.dev_set_balance(%L, 1)', gen_random_uuid()), 'USER_NOT_FOUND', 'unknown target');
  v_result := public.dev_set_balance(v_target, 20000);
  perform tests.assert(v_result ->> 'transaction_id' is null, 'no-op set writes no ledger row');

  -- Stats
  v_result := public.dev_set_stats(v_target, 5000, 900);
  perform tests.assert_eq((v_result ->> 'simulated_followers')::bigint, 5000::bigint, 'followers set');
  perform tests.assert_eq((v_result ->> 'level')::integer, 4, 'level recomputed from xp');
  perform tests.assert_throws(format('select public.dev_set_stats(%L, -5)', v_target), 'INVALID_VALUE', 'negative stat rejected');

  -- Items and passes
  perform public.dev_grant_item(v_target, v_item);
  perform tests.assert_throws(format('select public.dev_grant_item(%L, %L)', v_target, v_item), 'ALREADY_OWNED', 'no duplicate grant');
  perform public.dev_revoke_item(v_target, v_item);
  perform tests.assert_throws(format('select public.dev_revoke_item(%L, %L)', v_target, v_item), 'NOT_OWNED', 'cannot revoke twice');
  perform public.dev_grant_pass(v_target, v_pass);
  perform public.dev_revoke_pass(v_target, v_pass);
  perform public.dev_grant_pass(v_target, v_pass);

  -- Diagnostics and logs
  v_result := public.dev_diagnostics();
  perform tests.assert_eq((v_result -> 'economy' ->> 'ledger_consistent')::boolean, true, 'ledger consistent');
  perform tests.assert_eq(v_result ->> 'schema_version', '20261114000700', 'schema version reported');
  perform tests.assert(jsonb_array_length(public.dev_list_transactions(v_target)) >= 3, 'transactions listed');
  perform tests.assert(jsonb_array_length(public.dev_list_audit_log(200)) >= 9, 'audit log listed');

  perform tests.as_owner();
  perform tests.assert_eq((select count(*)::integer from public.dev_audit_log where actor_id = v_dev and action = 'set_balance'), 2, 'set_balance audited');
  perform tests.assert_eq((select count(*)::integer from public.dev_audit_log where actor_id = v_dev and action = 'adjust_balance'), 1, 'adjust audited');
  perform tests.assert_eq((select count(*)::integer from public.dev_audit_log where actor_id = v_dev and action in ('grant_item', 'revoke_item', 'grant_pass', 'revoke_pass')), 5, 'grants audited');
  perform tests.assert_eq((select count(*)::integer from public.transactions where user_id = v_target and kind in ('dev_set_balance', 'dev_adjustment')), 2, 'dev changes ledgered');
  perform tests.assert_ledger_consistent();

  -- Reset restores the starter state
  perform tests.authenticate(v_target);
  v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
  perform tests.authenticate(v_dev);
  v_result := public.dev_reset_user(v_target);
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 500::bigint, 'starting balance restored');

  perform tests.as_owner();
  perform tests.assert_eq((select count(*)::integer from public.transactions where user_id = v_target), 1, 'ledger restarted');
  perform tests.assert_eq((select kind from public.transactions where user_id = v_target), 'dev_reset', 'reset ledger entry');
  perform tests.assert_eq((select count(*)::integer from public.inventory where user_id = v_target), 3, 'starter items only');
  perform tests.assert_eq((select count(*)::integer from public.game_pass_ownership where user_id = v_target), 0, 'passes removed');
  perform tests.assert_eq((select count(*)::integer from public.game_sessions where user_id = v_target), 0, 'sessions removed');
  perform tests.assert_eq((select simulated_followers from public.profile_stats where user_id = v_target), 0::bigint, 'stats reset');
  perform tests.assert_eq((select count(*)::integer from public.dev_audit_log where action = 'reset_user' and target_user_id = v_target), 1, 'reset audited');
  perform tests.assert_ledger_consistent();

  -- Removing the role removes access immediately
  delete from public.user_roles where user_id = v_dev;
  perform tests.authenticate(v_dev);
  perform tests.assert_throws('select public.dev_diagnostics()', 'FORBIDDEN', 'revoked developer rejected');
end $$;
