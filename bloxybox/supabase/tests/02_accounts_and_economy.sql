-- Sign-up provisioning, profile RPCs, daily reward and ledger integrity.

-- Sign-up provisioning
do $$
declare
  v_uid uuid := tests.create_user('Nova_Star', 'Nova');
  v_profile public.profiles;
  v_count integer;
begin
  select * into v_profile from public.profiles where id = v_uid;
  perform tests.assert_eq(v_profile.username, 'nova_star', 'username is lower-cased');
  perform tests.assert_eq(v_profile.display_name, 'Nova', 'display name from metadata');
  perform tests.assert_eq((select balance from public.wallets where user_id = v_uid), 500::bigint, 'welcome balance');
  perform tests.assert_eq((select kind from public.transactions where user_id = v_uid), 'welcome_bonus', 'welcome ledger row');
  select count(*) into v_count from public.inventory where user_id = v_uid and equipped and acquired_via = 'starter';
  perform tests.assert_eq(v_count, 3, 'three starter items equipped');
  perform tests.assert_eq((select level from public.profile_stats where user_id = v_uid), 1, 'stats provisioned');
  perform tests.assert_eq((select head_shape from public.avatars where user_id = v_uid), 'cube', 'avatar provisioned');
end $$;

-- Taken or invalid usernames fall back to a generated one instead of failing sign-up.
do $$
declare
  v_first uuid := tests.create_user('duplicate');
  v_second uuid := tests.create_user('duplicate');
  v_bad uuid;
begin
  insert into auth.users (email, raw_user_meta_data) values ('bad@test.local', '{"username": "no spaces!"}')
  returning id into v_bad;

  perform tests.assert_eq((select username from public.profiles where id = v_first), 'duplicate', 'first keeps name');
  perform tests.assert((select username from public.profiles where id = v_second) ~ '^player_[0-9a-f]{8}$', 'second gets fallback');
  perform tests.assert((select username from public.profiles where id = v_bad) ~ '^player_[0-9a-f]{8}$', 'invalid gets fallback');
end $$;

-- Profile RPCs
do $$
declare
  v_uid uuid := tests.create_user('editor');
  v_other uuid := tests.create_user('taken_name');
  v_result jsonb;
begin
  perform tests.authenticate(v_uid);

  perform tests.assert_eq(public.is_username_available('taken_name'), false, 'taken name unavailable');
  perform tests.assert_eq(public.is_username_available('TAKEN_NAME'), false, 'case-insensitive');
  perform tests.assert_eq(public.is_username_available('ab'), false, 'too short');
  perform tests.assert_eq(public.is_username_available('brand_new'), true, 'free name available');

  v_result := public.update_profile('  Edited Name ', 'Hello there', 'cyan');
  perform tests.assert_eq(v_result ->> 'display_name', 'Edited Name', 'display name trimmed and saved');
  perform tests.assert_eq(v_result ->> 'accent', 'cyan', 'accent saved');
  perform tests.assert_throws($q$select public.update_profile('', 'x', 'cyan')$q$, 'INVALID_DISPLAY_NAME', 'empty display name rejected');
  perform tests.assert_throws($q$select public.update_profile('ok', repeat('x', 201), 'cyan')$q$, 'INVALID_BIO', 'long bio rejected');
  perform tests.assert_throws($q$select public.update_profile('ok', '', 'gold')$q$, 'INVALID_ACCENT', 'unknown accent rejected');

  perform tests.assert_eq(public.set_username('New_Handle') ->> 'username', 'new_handle', 'username changed');
  perform tests.assert_throws($q$select public.set_username('taken_name')$q$, 'USERNAME_TAKEN', 'duplicate username rejected');
  perform tests.assert_throws($q$select public.set_username('x!')$q$, 'INVALID_USERNAME', 'bad username rejected');

  perform tests.assert_eq(public.update_avatar('#9DB8FF', 'round') ->> 'head_shape', 'round', 'avatar updated');
  perform tests.assert_throws($q$select public.update_avatar('#123456', 'round')$q$, 'INVALID_AVATAR', 'off-palette colour rejected');
  perform tests.assert_throws($q$select public.update_avatar('#9DB8FF', null)$q$, 'INVALID_AVATAR', 'null shape rejected');

  -- RPCs only ever touch the caller's own row.
  perform tests.as_owner();
  perform tests.assert_eq((select display_name from public.profiles where id = v_other), 'taken_name', 'other profile untouched');
end $$;

-- Daily reward: once per UTC day, streak grows, amount follows the schedule.
do $$
declare
  v_uid uuid := tests.create_user('daily');
  v_result jsonb;
  v_status jsonb;
begin
  perform tests.authenticate(v_uid);
  v_status := public.get_daily_reward_status();
  perform tests.assert_eq((v_status ->> 'available')::boolean, true, 'reward available on day one');
  perform tests.assert_eq((v_status ->> 'next_amount')::integer, 100, 'day one amount');
  perform tests.assert_eq((v_status ->> 'next_streak')::integer, 1, 'next streak on day one');

  v_result := public.claim_daily_reward();
  perform tests.assert_eq((v_result ->> 'amount')::integer, 100, 'first claim pays 100');
  perform tests.assert_eq((v_result ->> 'streak')::integer, 1, 'streak 1');
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 600::bigint, 'balance after claim');
  perform tests.assert_throws('select public.claim_daily_reward()', 'DAILY_ALREADY_CLAIMED', 'second claim same day rejected');
  perform tests.assert_eq((public.get_daily_reward_status() ->> 'available')::boolean, false, 'not available after claim');

  -- Simulate the claim having happened yesterday: streak continues.
  perform tests.as_owner();
  update public.profile_stats set last_daily_claim = (now() at time zone 'utc')::date - 1, daily_streak = 6 where user_id = v_uid;
  perform tests.authenticate(v_uid);
  v_result := public.claim_daily_reward();
  perform tests.assert_eq((v_result ->> 'streak')::integer, 7, 'streak continues');
  perform tests.assert_eq((v_result ->> 'amount')::integer, 220, 'day seven amount');

  -- A missed day: status already reports the reset streak before claiming.
  perform tests.as_owner();
  update public.profile_stats set last_daily_claim = (now() at time zone 'utc')::date - 2 where user_id = v_uid;
  perform tests.authenticate(v_uid);
  v_status := public.get_daily_reward_status();
  perform tests.assert_eq((v_status ->> 'next_streak')::integer, 1, 'status shows streak will reset');
  perform tests.assert_eq((v_status ->> 'streak')::integer, 7, 'stored streak still reported');

  -- A gap resets the streak.
  perform tests.as_owner();
  update public.profile_stats set last_daily_claim = (now() at time zone 'utc')::date - 3, daily_streak = 9 where user_id = v_uid;
  perform tests.authenticate(v_uid);
  perform tests.assert_eq((public.claim_daily_reward() ->> 'streak')::integer, 1, 'gap resets streak');

  perform tests.as_owner();
  perform tests.assert_ledger_consistent();
end $$;

-- Ledger internals reject overdrafts and zero amounts.
do $$
declare
  v_uid uuid := tests.create_user('ledger');
begin
  perform tests.assert_throws(format($q$select public._apply_wallet_change(%L, -501, 'dev_adjustment', 'x')$q$, v_uid),
    'INSUFFICIENT_FUNDS', 'overdraft rejected');
  perform tests.assert_throws(format($q$select public._apply_wallet_change(%L, 0, 'dev_adjustment', 'x')$q$, v_uid),
    'INVALID_AMOUNT', 'zero amount rejected');
  perform tests.assert_throws(format($q$update public.wallets set balance = -1 where user_id = %L$q$, v_uid),
    'wallets_balance_non_negative', 'constraint blocks negative balance even for the owner role');
  perform tests.assert_eq((select balance from public.wallets where user_id = v_uid), 500::bigint, 'balance unchanged');
  perform tests.assert_ledger_consistent();
end $$;
