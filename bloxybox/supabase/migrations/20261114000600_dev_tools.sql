-- BloxyBox developer tools (Modify Menu backend).
--
-- Authorization is enforced HERE, not in the app: every dev_* function checks
-- public.user_roles for the caller and writes public.dev_audit_log in the same
-- transaction as the change. The developer role cannot be granted through any
-- RPC; the project owner grants it with SQL (see README).
-- These functions only change BloxyBox's own simulated data.

create function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'developer'
  );
$$;

create function public._require_developer()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
begin
  if not public.is_developer() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create function public._audit(p_action text, p_target uuid, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.dev_audit_log (actor_id, action, target_user_id, details)
  values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

create function public._require_target(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- Gate for the hidden menu. Denied attempts are logged.
create function public.dev_whoami()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_is_dev boolean := public.is_developer();
begin
  perform public._audit(case when v_is_dev then 'menu_opened' else 'access_denied' end, null, '{}'::jsonb);
  return jsonb_build_object('is_developer', v_is_dev, 'user_id', v_uid);
end;
$$;

create function public.dev_find_users(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
begin
  perform public._require_developer();
  v_pattern := '%' || replace(replace(replace(left(v_query, 30), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return coalesce((
    select jsonb_agg(row_to_json(r) order by r.username)
    from (
      select p.id, p.username, p.display_name, w.balance, s.level, s.simulated_followers
      from public.profiles p
      left join public.wallets w on w.user_id = p.id
      left join public.profile_stats s on s.user_id = p.id
      where v_query = '' or p.username ilike v_pattern or p.display_name ilike v_pattern
      order by p.username
      limit 25
    ) r
  ), '[]'::jsonb);
end;
$$;

create function public.dev_set_balance(p_user_id uuid, p_balance bigint, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current bigint;
  v_tx public.transactions;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);
  if p_balance is null or p_balance < 0 or p_balance > 1000000000000 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;

  select balance into v_current from public.wallets where user_id = p_user_id for update;

  if p_balance <> v_current then
    v_tx := public._apply_wallet_change(
      p_user_id, p_balance - v_current, 'dev_set_balance',
      'Developer set balance' || coalesce(': ' || nullif(btrim(p_reason), ''), ''),
      null, null, jsonb_build_object('previous', v_current, 'target', p_balance)
    );
  end if;

  perform public._audit('set_balance', p_user_id,
    jsonb_build_object('previous', v_current, 'new', p_balance, 'reason', p_reason, 'transaction_id', v_tx.id));

  return jsonb_build_object('balance', p_balance, 'previous', v_current, 'transaction_id', v_tx.id);
end;
$$;

create function public.dev_adjust_balance(p_user_id uuid, p_delta bigint, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.transactions;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000000000 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;

  v_tx := public._apply_wallet_change(
    p_user_id, p_delta, 'dev_adjustment',
    'Developer adjustment' || coalesce(': ' || nullif(btrim(p_reason), ''), ''),
    null, null, jsonb_build_object('reason', p_reason)
  );

  perform public._audit('adjust_balance', p_user_id,
    jsonb_build_object('delta', p_delta, 'new', v_tx.balance_after, 'reason', p_reason, 'transaction_id', v_tx.id));

  return jsonb_build_object('balance', v_tx.balance_after, 'transaction_id', v_tx.id);
end;
$$;

create function public.dev_set_stats(
  p_user_id uuid,
  p_simulated_followers bigint default null,
  p_xp bigint default null,
  p_profile_visits bigint default null,
  p_games_played bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.profile_stats;
  v_after public.profile_stats;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);
  if coalesce(p_simulated_followers, 0) < 0 or coalesce(p_xp, 0) < 0
     or coalesce(p_profile_visits, 0) < 0 or coalesce(p_games_played, 0) < 0
     or greatest(coalesce(p_simulated_followers, 0), coalesce(p_xp, 0), coalesce(p_profile_visits, 0), coalesce(p_games_played, 0)) > 1000000000000 then
    raise exception 'INVALID_VALUE' using errcode = '22023';
  end if;

  select * into v_before from public.profile_stats where user_id = p_user_id for update;

  update public.profile_stats
  set simulated_followers = coalesce(p_simulated_followers, simulated_followers),
      xp = coalesce(p_xp, xp),
      level = public.level_for_xp(coalesce(p_xp, xp)),
      profile_visits = coalesce(p_profile_visits, profile_visits),
      games_played = coalesce(p_games_played, games_played),
      updated_at = now()
  where user_id = p_user_id
  returning * into v_after;

  perform public._audit('set_stats', p_user_id, jsonb_build_object(
    'before', jsonb_build_object('simulated_followers', v_before.simulated_followers, 'xp', v_before.xp,
                                 'profile_visits', v_before.profile_visits, 'games_played', v_before.games_played),
    'after', jsonb_build_object('simulated_followers', v_after.simulated_followers, 'xp', v_after.xp,
                                'profile_visits', v_after.profile_visits, 'games_played', v_after.games_played)));

  return to_jsonb(v_after);
end;
$$;

create function public.dev_grant_item(p_user_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);
  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.inventory (user_id, item_id, slot, equipped, acquired_via, price_paid)
  values (p_user_id, v_item.id, v_item.slot, false, 'dev_grant', 0)
  on conflict (user_id, item_id) do nothing;

  if not found then
    raise exception 'ALREADY_OWNED' using errcode = 'P0001';
  end if;

  perform public._audit('grant_item', p_user_id, jsonb_build_object('item_id', v_item.id, 'item', v_item.slug));
  return jsonb_build_object('item_id', v_item.id, 'granted', true);
end;
$$;

create function public.dev_revoke_item(p_user_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.inventory;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);

  delete from public.inventory where user_id = p_user_id and item_id = p_item_id returning * into v_row;
  if not found then
    raise exception 'NOT_OWNED' using errcode = 'P0001';
  end if;

  perform public._audit('revoke_item', p_user_id,
    jsonb_build_object('item_id', p_item_id, 'acquired_via', v_row.acquired_via, 'price_paid', v_row.price_paid));
  return jsonb_build_object('item_id', p_item_id, 'revoked', true);
end;
$$;

create function public.dev_grant_pass(p_user_id uuid, p_pass_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pass public.game_passes;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);
  select * into v_pass from public.game_passes where id = p_pass_id;
  if not found then
    raise exception 'PASS_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.game_pass_ownership (user_id, pass_id, enabled, acquired_via, price_paid)
  values (p_user_id, v_pass.id, true, 'dev_grant', 0)
  on conflict (user_id, pass_id) do nothing;

  if not found then
    raise exception 'ALREADY_OWNED' using errcode = 'P0001';
  end if;

  perform public._audit('grant_pass', p_user_id, jsonb_build_object('pass_id', v_pass.id, 'pass', v_pass.slug));
  return jsonb_build_object('pass_id', v_pass.id, 'granted', true);
end;
$$;

create function public.dev_revoke_pass(p_user_id uuid, p_pass_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.game_pass_ownership;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);

  delete from public.game_pass_ownership where user_id = p_user_id and pass_id = p_pass_id returning * into v_row;
  if not found then
    raise exception 'NOT_OWNED' using errcode = 'P0001';
  end if;

  perform public._audit('revoke_pass', p_user_id,
    jsonb_build_object('pass_id', p_pass_id, 'acquired_via', v_row.acquired_via, 'price_paid', v_row.price_paid));
  return jsonb_build_object('pass_id', p_pass_id, 'revoked', true);
end;
$$;

-- Wipes a user's simulated data and restores the starter state.
create function public.dev_reset_user(p_user_id uuid, p_include_social boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counts jsonb;
  v_balance bigint;
begin
  perform public._require_developer();
  perform public._require_target(p_user_id);

  -- Serialise with any purchase in flight for this user.
  select balance into v_balance from public.wallets where user_id = p_user_id for update;

  v_counts := jsonb_build_object(
    'transactions', (select count(*) from public.transactions where user_id = p_user_id),
    'inventory', (select count(*) from public.inventory where user_id = p_user_id),
    'passes', (select count(*) from public.game_pass_ownership where user_id = p_user_id),
    'sessions', (select count(*) from public.game_sessions where user_id = p_user_id),
    'previous_balance', v_balance
  );

  delete from public.inventory where user_id = p_user_id;
  delete from public.game_pass_ownership where user_id = p_user_id;
  delete from public.game_sessions where user_id = p_user_id;
  delete from public.game_progress where user_id = p_user_id;
  delete from public.transactions where user_id = p_user_id;
  delete from public.profile_visits where visited_id = p_user_id;

  if coalesce(p_include_social, false) then
    delete from public.follows where follower_id = p_user_id or followee_id = p_user_id;
  end if;

  update public.wallets set balance = 0, lifetime_earned = 0, lifetime_spent = 0, updated_at = now()
  where user_id = p_user_id;
  update public.profile_stats
  set xp = 0, level = 1, simulated_followers = 0, profile_visits = 0, games_played = 0,
      daily_streak = 0, last_daily_claim = null, updated_at = now()
  where user_id = p_user_id;
  update public.avatars set skin_color = '#FFD86B', head_shape = 'cube', updated_at = now()
  where user_id = p_user_id;

  perform public._provision_starter_state(p_user_id, 'dev_reset');

  perform public._audit('reset_user', p_user_id, v_counts || jsonb_build_object('include_social', coalesce(p_include_social, false)));

  return jsonb_build_object('reset', true, 'removed', v_counts,
    'balance', (select balance from public.wallets where user_id = p_user_id));
end;
$$;

create function public.dev_diagnostics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balances numeric;
  v_ledger numeric;
begin
  perform public._require_developer();
  select coalesce(sum(balance), 0) into v_balances from public.wallets;
  select coalesce(sum(amount), 0) into v_ledger from public.transactions;

  return jsonb_build_object(
    'server_time', now(),
    'database_version', current_setting('server_version'),
    'schema_version', (select value from public.app_meta where key = 'schema_version'),
    'counts', jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'transactions', (select count(*) from public.transactions),
      'inventory_rows', (select count(*) from public.inventory),
      'pass_ownership_rows', (select count(*) from public.game_pass_ownership),
      'active_sessions', (select count(*) from public.game_sessions where status = 'active'),
      'completed_sessions', (select count(*) from public.game_sessions where status = 'completed'),
      'rejected_sessions', (select count(*) from public.game_sessions where status = 'rejected'),
      'items', (select count(*) from public.items),
      'active_listings', (select count(*) from public.marketplace_listings where is_active),
      'experiences', (select count(*) from public.experiences),
      'game_passes', (select count(*) from public.game_passes),
      'audit_entries', (select count(*) from public.dev_audit_log)
    ),
    'economy', jsonb_build_object(
      'boxcoins_in_circulation', v_balances,
      'ledger_total', v_ledger,
      'ledger_consistent', v_balances = v_ledger
    )
  );
end;
$$;

create function public.dev_list_transactions(p_user_id uuid default null, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._require_developer();

  return coalesce((
    select jsonb_agg(row_to_json(r) order by r.created_at desc, r.id desc)
    from (
      select t.id, t.user_id, p.username, t.amount, t.balance_after, t.kind, t.description,
             t.reference_type, t.reference_id, t.metadata, t.created_at
      from public.transactions t
      join public.profiles p on p.id = t.user_id
      where p_user_id is null or t.user_id = p_user_id
      order by t.created_at desc, t.id desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200)
    ) r
  ), '[]'::jsonb);
end;
$$;

create function public.dev_list_audit_log(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._require_developer();

  return coalesce((
    select jsonb_agg(row_to_json(r) order by r.created_at desc, r.id desc)
    from (
      select l.id, l.action, l.details, l.created_at,
             l.actor_id, a.username as actor_username,
             l.target_user_id, t.username as target_username
      from public.dev_audit_log l
      left join public.profiles a on a.id = l.actor_id
      left join public.profiles t on t.id = l.target_user_id
      order by l.created_at desc, l.id desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200)
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.is_developer() from public, anon, authenticated;
revoke all on function public._require_developer() from public, anon, authenticated;
revoke all on function public._audit(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public._require_target(uuid) from public, anon, authenticated;
revoke all on function public.dev_whoami() from public, anon, authenticated;
revoke all on function public.dev_find_users(text) from public, anon, authenticated;
revoke all on function public.dev_set_balance(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.dev_adjust_balance(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.dev_set_stats(uuid, bigint, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.dev_grant_item(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dev_revoke_item(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dev_grant_pass(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dev_revoke_pass(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dev_reset_user(uuid, boolean) from public, anon, authenticated;
revoke all on function public.dev_diagnostics() from public, anon, authenticated;
revoke all on function public.dev_list_transactions(uuid, integer) from public, anon, authenticated;
revoke all on function public.dev_list_audit_log(integer) from public, anon, authenticated;

-- Callable by any signed-in user; each one rejects non-developers itself.
grant execute on function public.dev_whoami() to authenticated;
grant execute on function public.dev_find_users(text) to authenticated;
grant execute on function public.dev_set_balance(uuid, bigint, text) to authenticated;
grant execute on function public.dev_adjust_balance(uuid, bigint, text) to authenticated;
grant execute on function public.dev_set_stats(uuid, bigint, bigint, bigint, bigint) to authenticated;
grant execute on function public.dev_grant_item(uuid, uuid) to authenticated;
grant execute on function public.dev_revoke_item(uuid, uuid) to authenticated;
grant execute on function public.dev_grant_pass(uuid, uuid) to authenticated;
grant execute on function public.dev_revoke_pass(uuid, uuid) to authenticated;
grant execute on function public.dev_reset_user(uuid, boolean) to authenticated;
grant execute on function public.dev_diagnostics() to authenticated;
grant execute on function public.dev_list_transactions(uuid, integer) to authenticated;
grant execute on function public.dev_list_audit_log(integer) to authenticated;
