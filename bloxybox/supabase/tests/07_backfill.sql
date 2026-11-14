-- Backfill of accounts that existed before BloxyBox was installed (migration 800).

do $$
declare
  v_old uuid;
  v_blank uuid;
  v_existing uuid;
  v_count integer;
begin
  -- Simulate accounts created before the BloxyBox trigger existed.
  alter table auth.users disable trigger on_auth_user_created;
  insert into auth.users (email, raw_user_meta_data)
  values ('old.timer@test.local', '{"username": "OldTimer", "full_name": "Old Timer"}') returning id into v_old;
  insert into auth.users (email, raw_user_meta_data) values ('blank@test.local', '{}') returning id into v_blank;
  alter table auth.users enable trigger on_auth_user_created;

  -- A normal BloxyBox player with progress that must not be touched.
  v_existing := tests.create_user('already_here');
  update public.profiles set bio = 'keep me' where id = v_existing;
  perform public._apply_wallet_change(v_existing, 1234, 'dev_adjustment', 'progress');

  v_count := public._backfill_existing_users();
  perform tests.assert_eq(v_count, 2, 'only the two pre-existing accounts are provisioned');

  perform tests.assert_eq((select username from public.profiles where id = v_old), 'oldtimer', 'requested username reused');
  perform tests.assert_eq((select display_name from public.profiles where id = v_old), 'Old Timer', 'full_name used as display name');
  perform tests.assert((select username from public.profiles where id = v_blank) ~ '^player_[0-9a-f]{8}$', 'fallback username');
  perform tests.assert_eq((select balance from public.wallets where user_id = v_old), 500::bigint, 'welcome balance');
  perform tests.assert_eq((select count(*)::integer from public.inventory where user_id = v_blank and equipped), 3, 'starter items equipped');
  perform tests.assert_eq((select level from public.profile_stats where user_id = v_blank), 1, 'stats provisioned');
  perform tests.assert_eq((select head_shape from public.avatars where user_id = v_old), 'cube', 'avatar provisioned');

  -- Idempotent and non-destructive.
  perform tests.assert_eq(public._backfill_existing_users(), 0, 'second run is a no-op');
  perform tests.assert_eq((select bio from public.profiles where id = v_existing), 'keep me', 'existing profile untouched');
  perform tests.assert_eq((select balance from public.wallets where user_id = v_existing), 1734::bigint, 'existing balance untouched');
  perform tests.assert_eq((select count(*)::integer from public.transactions where user_id = v_existing), 2, 'existing ledger untouched');
  perform tests.assert_eq((select count(*)::integer from auth.users), 3, 'auth.users unchanged');
  perform tests.assert_ledger_consistent();

  -- Clients can never call it.
  perform tests.authenticate(v_existing);
  perform tests.assert_throws('select public._backfill_existing_users()', 'permission denied', 'not callable by clients');
end $$;
