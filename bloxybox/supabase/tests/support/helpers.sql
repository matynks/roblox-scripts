-- Test helpers for the BloxyBox SQL suite (local runner only).
create schema tests;
grant usage on schema tests to anon, authenticated;

-- Creates an auth user (fires the real sign-up trigger) and returns its id.
create function tests.create_user(p_username text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into auth.users (email, raw_user_meta_data)
  values (
    p_username || '.' || substr(md5(random()::text), 1, 8) || '@test.local',
    jsonb_strip_nulls(jsonb_build_object('username', p_username, 'display_name', p_display_name))
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Switches the current transaction to an authenticated request for p_user.
create function tests.authenticate(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role authenticated';
end;
$$;

create function tests.anonymous()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end;
$$;

-- Back to the superuser (test setup / inspection).
create function tests.as_owner()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

create function tests.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is distinct from true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

create function tests.assert_eq(p_actual anyelement, p_expected anyelement, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_message, p_expected, p_actual;
  end if;
end;
$$;

-- Runs p_sql and asserts that it fails with a message containing p_expected.
create function tests.assert_throws(p_sql text, p_expected text, p_message text)
returns void
language plpgsql
as $$
declare
  v_failed boolean := false;
  v_error text;
begin
  begin
    execute p_sql;
  exception when others then
    v_failed := true;
    v_error := sqlerrm;
  end;

  if not v_failed then
    raise exception 'ASSERTION FAILED: % (statement succeeded but should fail): %', p_message, p_sql;
  end if;
  if position(lower(p_expected) in lower(v_error)) = 0 then
    raise exception 'ASSERTION FAILED: % (expected error containing "%", got "%")', p_message, p_expected, v_error;
  end if;
end;
$$;

-- Ledger invariant: balance = sum(amounts) = last balance_after, for every wallet.
create function tests.assert_ledger_consistent()
returns void
language plpgsql
as $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.wallets w
  where w.balance <> coalesce((select sum(amount) from public.transactions t where t.user_id = w.user_id), 0)
     or w.balance <> coalesce((select t.balance_after from public.transactions t where t.user_id = w.user_id
                               order by t.id desc limit 1), 0);
  perform tests.assert_eq(v_bad, 0, 'every wallet balance equals the sum of its ledger and its last balance_after');
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;
