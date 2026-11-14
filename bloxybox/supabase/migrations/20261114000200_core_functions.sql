-- BloxyBox core functions: helpers, ledger, sign-up provisioning, profile RPCs, daily reward.
--
-- Conventions
--   * Every function that writes data is SECURITY DEFINER with search_path = ''
--     and schema-qualified names (prevents search_path hijacking).
--   * Errors are raised with stable, upper-case codes in the message
--     (e.g. INSUFFICIENT_FUNDS). The app maps them to friendly text.
--   * EXECUTE is revoked from PUBLIC/anon/authenticated for every function and
--     granted explicitly only where the client is meant to call it.

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------
create function public._require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

create function public.level_for_xp(p_xp bigint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (floor(sqrt(greatest(p_xp, 0)::numeric / 100)) + 1)::integer;
$$;

create function public.xp_for_level(p_level integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select (100 * power(greatest(p_level, 1) - 1, 2))::bigint;
$$;

-- The ONLY code path that changes a wallet balance. Locks the wallet row,
-- rejects negative results and writes the ledger entry in the same transaction.
create function public._apply_wallet_change(
  p_user_id uuid,
  p_amount bigint,
  p_kind text,
  p_description text,
  p_reference_type text default null,
  p_reference_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
  v_new_balance bigint;
  v_tx public.transactions;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;

  select balance into v_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_new_balance := v_balance + p_amount;

  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_FUNDS'
      using errcode = 'P0001',
            detail = json_build_object('balance', v_balance, 'required', -p_amount)::text;
  end if;

  if v_new_balance > 1000000000000 then
    raise exception 'BALANCE_LIMIT' using errcode = 'P0001';
  end if;

  update public.wallets
  set balance = v_new_balance,
      lifetime_earned = lifetime_earned + greatest(p_amount, 0),
      lifetime_spent = lifetime_spent + greatest(-p_amount, 0),
      updated_at = now()
  where user_id = p_user_id;

  insert into public.transactions (user_id, amount, balance_after, kind, description, reference_type, reference_id, metadata)
  values (p_user_id, p_amount, v_new_balance, p_kind, p_description, p_reference_type, p_reference_id, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Starter state for a profile (used by sign-up and by developer reset)
create function public._provision_starter_state(p_user_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wallets (user_id) values (p_user_id) on conflict (user_id) do nothing;
  insert into public.avatars (user_id) values (p_user_id) on conflict (user_id) do nothing;
  insert into public.profile_stats (user_id) values (p_user_id) on conflict (user_id) do nothing;

  perform public._apply_wallet_change(
    p_user_id, 500, p_kind,
    case when p_kind = 'welcome_bonus' then 'Welcome bonus' else 'Test data reset: starting balance' end
  );

  insert into public.inventory (user_id, item_id, slot, equipped, acquired_via, price_paid)
  select p_user_id, i.id, i.slot, true, 'starter', 0
  from public.items i
  where i.is_starter
  on conflict (user_id, item_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sign-up provisioning (trigger on auth.users)
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_username text;
  v_display text;
  v_attempt integer := 0;
begin
  v_username := v_requested;

  loop
    if v_username !~ '^[a-z0-9_]{3,20}$' or v_attempt > 0 then
      v_username := 'player_' || substr(md5(new.id::text || v_attempt::text), 1, 8);
    end if;

    v_display := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), v_requested, v_username), 30);
    if char_length(btrim(v_display)) = 0 then
      v_display := v_username;
    end if;

    begin
      insert into public.profiles (id, username, display_name)
      values (new.id, v_username, v_display);
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 5 then
        raise;
      end if;
    end;
  end loop;

  perform public._provision_starter_state(new.id, 'welcome_bonus');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Profile RPCs
-- ---------------------------------------------------------------------------
create function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(coalesce(p_username, ''))) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = lower(btrim(p_username)));
$$;

create function public.set_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_username text := lower(btrim(coalesce(p_username, '')));
begin
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'INVALID_USERNAME' using errcode = '22023';
  end if;

  begin
    update public.profiles set username = v_username, updated_at = now() where id = v_uid;
  exception when unique_violation then
    raise exception 'USERNAME_TAKEN' using errcode = '23505';
  end;

  return jsonb_build_object('username', v_username);
end;
$$;

create function public.update_profile(p_display_name text, p_bio text, p_accent text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_display text := btrim(coalesce(p_display_name, ''));
  v_bio text := btrim(coalesce(p_bio, ''));
  v_profile public.profiles;
begin
  if char_length(v_display) not between 1 and 30 then
    raise exception 'INVALID_DISPLAY_NAME' using errcode = '22023';
  end if;
  if char_length(v_bio) > 200 then
    raise exception 'INVALID_BIO' using errcode = '22023';
  end if;
  if p_accent not in ('violet', 'cyan', 'lime', 'amber', 'rose', 'sky') then
    raise exception 'INVALID_ACCENT' using errcode = '22023';
  end if;

  update public.profiles
  set display_name = v_display, bio = v_bio, accent = p_accent, updated_at = now()
  where id = v_uid
  returning * into v_profile;

  return to_jsonb(v_profile);
end;
$$;

create function public.update_avatar(p_skin_color text, p_head_shape text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_avatar public.avatars;
begin
  if p_skin_color is null or p_head_shape is null then
    raise exception 'INVALID_AVATAR' using errcode = '22023';
  end if;

  begin
    update public.avatars
    set skin_color = p_skin_color, head_shape = p_head_shape, updated_at = now()
    where user_id = v_uid
    returning * into v_avatar;
  exception when check_violation then
    raise exception 'INVALID_AVATAR' using errcode = '22023';
  end;

  return to_jsonb(v_avatar);
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily reward
-- ---------------------------------------------------------------------------
create function public.daily_reward_amount(p_streak integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 100 + 20 * (least(greatest(p_streak, 1), 7) - 1);
$$;

create function public.get_daily_reward_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_today date := (now() at time zone 'utc')::date;
  v_stats public.profile_stats;
  v_next_streak integer;
begin
  select * into v_stats from public.profile_stats where user_id = v_uid;

  v_next_streak := case
    when v_stats.last_daily_claim = v_today - 1 then v_stats.daily_streak + 1
    when v_stats.last_daily_claim = v_today then v_stats.daily_streak
    else 1
  end;

  return jsonb_build_object(
    'available', v_stats.last_daily_claim is distinct from v_today,
    'streak', coalesce(v_stats.daily_streak, 0),
    'next_streak', v_next_streak,
    'next_amount', public.daily_reward_amount(v_next_streak),
    'next_claim_at', ((v_today + 1)::timestamp at time zone 'utc'),
    'server_time', now()
  );
end;
$$;

create function public.claim_daily_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_today date := (now() at time zone 'utc')::date;
  v_stats public.profile_stats;
  v_streak integer;
  v_amount integer;
  v_tx public.transactions;
begin
  select * into v_stats from public.profile_stats where user_id = v_uid for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_stats.last_daily_claim = v_today then
    raise exception 'DAILY_ALREADY_CLAIMED'
      using errcode = 'P0001',
            detail = json_build_object('next_claim_at', ((v_today + 1)::timestamp at time zone 'utc'))::text;
  end if;

  v_streak := case when v_stats.last_daily_claim = v_today - 1 then v_stats.daily_streak + 1 else 1 end;
  v_amount := public.daily_reward_amount(v_streak);

  update public.profile_stats
  set daily_streak = v_streak,
      last_daily_claim = v_today,
      simulated_followers = simulated_followers + 3 * least(v_streak, 7),
      updated_at = now()
  where user_id = v_uid;

  v_tx := public._apply_wallet_change(
    v_uid, v_amount, 'daily_reward', 'Daily reward (day ' || v_streak || ')',
    'daily_reward', v_today::text, jsonb_build_object('streak', v_streak)
  );

  return jsonb_build_object(
    'amount', v_amount,
    'streak', v_streak,
    'balance', v_tx.balance_after,
    'transaction_id', v_tx.id,
    'next_claim_at', ((v_today + 1)::timestamp at time zone 'utc')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on function public._require_user() from public, anon, authenticated;
revoke all on function public._apply_wallet_change(uuid, bigint, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public._provision_starter_state(uuid, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.level_for_xp(bigint) from public, anon, authenticated;
revoke all on function public.xp_for_level(integer) from public, anon, authenticated;
revoke all on function public.daily_reward_amount(integer) from public, anon, authenticated;
revoke all on function public.is_username_available(text) from public, anon, authenticated;
revoke all on function public.set_username(text) from public, anon, authenticated;
revoke all on function public.update_profile(text, text, text) from public, anon, authenticated;
revoke all on function public.update_avatar(text, text) from public, anon, authenticated;
revoke all on function public.get_daily_reward_status() from public, anon, authenticated;
revoke all on function public.claim_daily_reward() from public, anon, authenticated;

grant execute on function public.is_username_available(text) to anon, authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.update_profile(text, text, text) to authenticated;
grant execute on function public.update_avatar(text, text) to authenticated;
grant execute on function public.get_daily_reward_status() to authenticated;
grant execute on function public.claim_daily_reward() to authenticated;
grant execute on function public.level_for_xp(bigint) to authenticated;
grant execute on function public.xp_for_level(integer) to authenticated;
