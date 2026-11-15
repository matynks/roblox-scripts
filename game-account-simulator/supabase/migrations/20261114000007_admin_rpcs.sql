-- Blockora — developer Modify Menu RPCs
--
-- Every function: (1) verifies the caller's developer role server-side,
-- (2) validates input, (3) applies the change transactionally, (4) writes an
-- audit_logs row with actor, target, reason and before/after state.
-- Only simulated Blockora data can be touched. Nothing here talks to any
-- external platform.

create function private.require_reason(p_reason text) returns text
language plpgsql set search_path = '' as $$
declare v text := btrim(coalesce(p_reason, ''));
begin
  if char_length(v) < 3 or char_length(v) > 200 then
    perform private.fail('REASON_REQUIRED', 'Enter a reason (3-200 characters). It is recorded in the audit log.');
  end if;
  return v;
end $$;

-- Developers may edit anyone except owners (unless they are an owner or editing themselves).
create function private.assert_can_modify(p_target uuid) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.developer_role := private.require_developer();
  t public.profiles;
begin
  select * into t from public.profiles where id = p_target;
  if not found then perform private.fail('USER_NOT_FOUND', 'Account not found.'); end if;
  if p_target <> auth.uid() and v_role <> 'owner'
     and exists (select 1 from public.developer_roles where user_id = p_target and role = 'owner') then
    perform private.fail('FORBIDDEN', 'Only an owner can modify an owner account.');
  end if;
  return t;
end $$;

create function private.mask_email(p_email text) returns text
language sql immutable set search_path = '' as $$
  select case when p_email is null then null
              else regexp_replace(p_email, '^(.{1,2})[^@]*(@.*)$', '\1***\2') end;
$$;

create function private.account_row(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'level', p.level, 'xp', p.xp,
    'reputation', p.reputation, 'is_npc', p.is_npc, 'is_test_account', p.is_test_account,
    'account_status', p.account_status, 'created_at', p.created_at, 'last_seen_at', p.last_seen_at,
    'balance', w.balance, 'role', r.role,
    'email', private.mask_email((select u.email from auth.users u where u.id = p.id)))
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  left join public.developer_roles r on r.user_id = p.id
  where p.id = p_user;
$$;

-- ---------------------------------------------------------------------------
-- Access check (used by the client to decide whether to render the entry)
-- ---------------------------------------------------------------------------
create function public.get_my_access() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_role public.developer_role;
begin
  perform private.require_user();
  select role into v_role from public.developer_roles where user_id = auth.uid();
  return jsonb_build_object('is_developer', v_role is not null, 'role', v_role);
end $$;

-- ---------------------------------------------------------------------------
-- Account inspection
-- ---------------------------------------------------------------------------
-- p_filter: all | players | npc | test | suspended | developers
create function public.admin_search_accounts(p_query text, p_filter text default 'all',
                                             p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_pattern text;
begin
  perform private.require_developer();
  v_pattern := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return jsonb_build_object(
    'total', (select count(*) from public.profiles p
               where (v_q = '' or lower(p.username) like v_pattern or lower(p.display_name) like v_pattern
                      or p.id::text = v_q)
                 and case coalesce(p_filter, 'all')
                       when 'players' then not p.is_npc
                       when 'npc' then p.is_npc
                       when 'test' then p.is_test_account
                       when 'suspended' then p.account_status = 'suspended'
                       when 'developers' then exists (select 1 from public.developer_roles r where r.user_id = p.id)
                       else true end),
    'accounts', coalesce((select jsonb_agg(private.account_row(x.id) order by x.ord, x.created_at desc) from (
        select p.id, p.created_at, case when lower(p.username) = v_q then 0 else 1 end as ord
          from public.profiles p
         where (v_q = '' or lower(p.username) like v_pattern or lower(p.display_name) like v_pattern
                or p.id::text = v_q)
           and case coalesce(p_filter, 'all')
                 when 'players' then not p.is_npc
                 when 'npc' then p.is_npc
                 when 'test' then p.is_test_account
                 when 'suspended' then p.account_status = 'suspended'
                 when 'developers' then exists (select 1 from public.developer_roles r where r.user_id = p.id)
                 else true end
         order by ord, p.created_at desc
         limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0)) x), '[]'::jsonb));
end $$;

create function public.admin_get_account(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform private.require_developer();
  if not exists (select 1 from public.profiles where id = p_user_id) then
    perform private.fail('USER_NOT_FOUND', 'Account not found.');
  end if;
  v := jsonb_build_object(
    'account', private.account_row(p_user_id),
    'profile', (select jsonb_build_object('bio', bio, 'status_text', status_text, 'profile_theme', profile_theme,
                                          'terms_accepted_at', terms_accepted_at, 'username_changed_at', username_changed_at)
                  from public.profiles where id = p_user_id),
    'wallet', (select to_jsonb(w) - 'user_id' from public.wallets w where w.user_id = p_user_id),
    'metrics', private.player_metrics(p_user_id),
    'settings', (select to_jsonb(s) - 'user_id' from public.user_settings s where s.user_id = p_user_id),
    'streak', (select to_jsonb(d) - 'user_id' from public.daily_streaks d where d.user_id = p_user_id),
    'avatar', (select to_jsonb(a) - 'user_id' from public.avatars a where a.user_id = p_user_id),
    'game_stats', coalesce((select jsonb_agg(jsonb_build_object('game_id', s.game_id, 'title', g.title, 'plays', s.plays,
                                   'best_score', s.best_score, 'total_orbs', s.total_orbs, 'last_played_at', s.last_played_at)
                                   order by s.last_played_at desc)
                              from public.player_game_stats s join public.games g on g.id = s.game_id
                             where s.user_id = p_user_id), '[]'::jsonb),
    'passes', coalesce((select jsonb_agg(jsonb_build_object('pass_id', o.pass_id, 'name', gp.name, 'acquired_via', o.acquired_via,
                               'acquired_at', o.acquired_at))
                          from public.game_pass_ownership o join public.game_passes gp on gp.id = o.pass_id
                         where o.user_id = p_user_id), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(achievement_key) from public.user_achievements where user_id = p_user_id), '[]'::jsonb),
    'rejected_sessions', (select count(*) from public.game_sessions where user_id = p_user_id and status = 'rejected'),
    'reports_against', (select count(*) from public.reports where target_id = p_user_id));
  perform private.audit('view_account', p_user_id, 'profile', p_user_id::text, 'Viewed account details', null, null);
  return v;
end $$;

create function public.admin_list_inventory(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_developer();
  return coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'item_id', i.item_id, 'name', c.name, 'slot', c.slot,
                                    'rarity', c.rarity, 'serial_number', i.serial_number, 'acquired_via', i.acquired_via,
                                    'price_paid', i.price_paid, 'acquired_at', i.acquired_at, 'asset', c.asset)
                                    order by i.acquired_at desc)
                     from public.inventory_items i join public.catalog_items c on c.id = i.item_id
                    where i.user_id = p_user_id), '[]'::jsonb);
end $$;

-- p_user_id null => platform-wide ledger
create function public.admin_list_transactions(p_user_id uuid default null, p_kind text default null,
                                               p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_developer();
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'user_id', t.user_id, 'username', p.username,
                                    'amount', t.amount, 'balance_after', t.balance_after, 'kind', t.kind,
                                    'description', t.description, 'reference_type', t.reference_type,
                                    'reference_id', t.reference_id, 'actor_id', t.actor_id,
                                    'actor_username', a.username, 'metadata', t.metadata, 'created_at', t.created_at)
                                    order by t.created_at desc)
                     from (select * from public.currency_transactions
                            where (p_user_id is null or user_id = p_user_id)
                              and (p_kind is null or kind::text = p_kind)
                            order by created_at desc
                            limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)) t
                     join public.profiles p on p.id = t.user_id
                     left join public.profiles a on a.id = t.actor_id), '[]'::jsonb);
end $$;

create function public.admin_list_activity(p_user_id uuid, p_limit int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_developer();
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'data', e.data, 'created_at', e.created_at)
                                    order by e.created_at desc)
                     from (select * from public.activity_events where user_id = p_user_id
                            order by created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)) e), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Currency management
-- ---------------------------------------------------------------------------
create function public.admin_adjust_balance(p_user_id uuid, p_delta bigint, p_reason text, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  v_before bigint;
  v_res jsonb;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000000 then
    perform private.fail('INVALID_AMOUNT', 'Enter a non-zero amount up to 100,000,000.');
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 80 then
    perform private.fail('INVALID_REQUEST', 'Missing request token.');
  end if;
  select balance into v_before from public.wallets where user_id = p_user_id;
  v_res := private.apply_currency(p_user_id, p_delta, 'admin_adjustment',
    case when p_delta > 0 then 'Developer credit' else 'Developer debit' end || ': ' || v_reason,
    'admin', auth.uid()::text, 'admin:' || p_idempotency_key, auth.uid(), jsonb_build_object('reason', v_reason));
  if not (v_res ->> 'duplicate')::boolean then
    perform private.audit('adjust_balance', p_user_id, 'wallet', p_user_id::text, v_reason,
      jsonb_build_object('balance', v_before), jsonb_build_object('balance', (v_res ->> 'balance')::bigint, 'delta', p_delta));
    perform private.notify(p_user_id, 'admin', 'Your Orbs balance was adjusted',
      format('%s%s Orbs — %s', case when p_delta > 0 then '+' else '' end, p_delta, v_reason), '{}'::jsonb);
  end if;
  return v_res;
end $$;

create function public.admin_set_balance(p_user_id uuid, p_balance bigint, p_reason text, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  v_before bigint;
  v_res jsonb;
begin
  if p_balance is null or p_balance < 0 or p_balance > 1000000000 then
    perform private.fail('INVALID_AMOUNT', 'Balance must be between 0 and 1,000,000,000.');
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 80 then
    perform private.fail('INVALID_REQUEST', 'Missing request token.');
  end if;
  select balance into v_before from public.wallets where user_id = p_user_id for update;
  if v_before = p_balance then
    return jsonb_build_object('transaction_id', null, 'balance', v_before, 'duplicate', false);
  end if;
  v_res := private.apply_currency(p_user_id, p_balance - v_before, 'admin_adjustment', 'Developer set balance: ' || v_reason,
    'admin', auth.uid()::text, 'admin:' || p_idempotency_key, auth.uid(),
    jsonb_build_object('reason', v_reason, 'set_to', p_balance));
  if not (v_res ->> 'duplicate')::boolean then
    perform private.audit('set_balance', p_user_id, 'wallet', p_user_id::text, v_reason,
      jsonb_build_object('balance', v_before), jsonb_build_object('balance', p_balance));
    perform private.notify(p_user_id, 'admin', 'Your Orbs balance was updated',
      format('New balance: %s Orbs — %s', p_balance, v_reason), '{}'::jsonb);
  end if;
  return v_res;
end $$;

-- ---------------------------------------------------------------------------
-- Profile & statistics management
-- ---------------------------------------------------------------------------
create function public.admin_update_profile(p_user_id uuid, p_username text, p_display_name text, p_bio text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  v_username text := btrim(coalesce(p_username, t.username));
  v_display text := btrim(coalesce(p_display_name, t.display_name));
  v_bio text := coalesce(p_bio, t.bio);
begin
  if lower(v_username) <> lower(t.username)
     and exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
    perform private.fail('USERNAME_TAKEN', 'That username is already taken.');
  end if;
  begin
    update public.profiles
       set username = v_username, display_name = v_display, bio = left(v_bio, 500),
           username_changed_at = case when v_username <> t.username then now() else username_changed_at end
     where id = p_user_id;
  exception when check_violation then
    perform private.fail('INVALID_PROFILE', 'Username or display name does not meet the format rules.');
  end;
  perform private.audit('update_profile', p_user_id, 'profile', p_user_id::text, v_reason,
    jsonb_build_object('username', t.username, 'display_name', t.display_name, 'bio', t.bio),
    jsonb_build_object('username', v_username, 'display_name', v_display, 'bio', left(v_bio, 500)));
  return private.account_row(p_user_id);
end $$;

create function public.admin_set_stats(p_user_id uuid, p_level int, p_xp bigint, p_reputation int, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  v_xp bigint;
  v_level int;
begin
  if p_level is not null and (p_level < 1 or p_level > 100) then
    perform private.fail('INVALID_AMOUNT', 'Level must be 1-100.');
  end if;
  if p_xp is not null and (p_xp < 0 or p_xp > 10000000) then
    perform private.fail('INVALID_AMOUNT', 'XP must be 0-10,000,000.');
  end if;
  if p_reputation is not null and (p_reputation < -1000 or p_reputation > 100000) then
    perform private.fail('INVALID_AMOUNT', 'Reputation must be -1,000 to 100,000.');
  end if;
  -- XP and level stay consistent: setting a level moves XP to that level's threshold.
  v_xp := coalesce(p_xp, case when p_level is not null then private.xp_for_level(p_level) end, t.xp);
  v_level := private.level_for_xp(v_xp);
  update public.profiles set xp = v_xp, level = v_level, reputation = coalesce(p_reputation, reputation)
   where id = p_user_id;
  perform private.audit('set_stats', p_user_id, 'profile', p_user_id::text, v_reason,
    jsonb_build_object('level', t.level, 'xp', t.xp, 'reputation', t.reputation),
    jsonb_build_object('level', v_level, 'xp', v_xp, 'reputation', coalesce(p_reputation, t.reputation)));
  return private.account_row(p_user_id);
end $$;

create function public.admin_set_account_flags(p_user_id uuid, p_is_test_account boolean, p_account_status text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
begin
  if p_account_status is not null and p_account_status not in ('active', 'suspended') then
    perform private.fail('INVALID_STATUS', 'Status must be active or suspended.');
  end if;
  if p_user_id = auth.uid() and p_account_status = 'suspended' then
    perform private.fail('INVALID_TARGET', 'You cannot suspend your own account.');
  end if;
  update public.profiles
     set is_test_account = coalesce(p_is_test_account, is_test_account),
         account_status = coalesce(p_account_status::public.account_status, account_status)
   where id = p_user_id;
  perform private.audit('set_account_flags', p_user_id, 'profile', p_user_id::text, v_reason,
    jsonb_build_object('is_test_account', t.is_test_account, 'account_status', t.account_status),
    jsonb_build_object('is_test_account', coalesce(p_is_test_account, t.is_test_account),
                       'account_status', coalesce(p_account_status, t.account_status::text)));
  return private.account_row(p_user_id);
end $$;

-- Adds real follow rows from simulated (NPC) players. Counts are never typed in.
create function public.admin_add_npc_followers(p_user_id uuid, p_count int, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  v_added int;
begin
  if p_count is null or p_count < 1 or p_count > 500 then
    perform private.fail('INVALID_AMOUNT', 'Choose between 1 and 500 followers.');
  end if;
  insert into public.follows (follower_id, followee_id)
  select p.id, p_user_id from public.profiles p
   where p.is_npc and p.id <> p_user_id
     and not exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = p_user_id)
   order by random() limit p_count;
  get diagnostics v_added = row_count;
  perform private.audit('add_npc_followers', p_user_id, 'follows', p_user_id::text, v_reason,
    null, jsonb_build_object('requested', p_count, 'added', v_added));
  perform private.evaluate_achievements(p_user_id);
  return jsonb_build_object('added', v_added,
                            'followers', (select count(*) from public.follows where followee_id = p_user_id));
end $$;

-- ---------------------------------------------------------------------------
-- Inventory management
-- ---------------------------------------------------------------------------
create function private.grant_item(p_user uuid, p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.catalog_items;
  v_serial int;
  v_id uuid;
begin
  select * into c from public.catalog_items where id = p_item for update;
  if not found then perform private.fail('ITEM_NOT_FOUND', 'Item not found.'); end if;
  if not c.is_limited and exists (select 1 from public.inventory_items where user_id = p_user and item_id = p_item) then
    return jsonb_build_object('item_id', p_item, 'status', 'already_owned');
  end if;
  if c.is_limited then
    if c.stock_remaining <= 0 then perform private.fail('SOLD_OUT', 'No stock left to grant.'); end if;
    update public.catalog_items set stock_remaining = stock_remaining - 1
     where id = p_item returning stock_total - stock_remaining into v_serial;
  end if;
  insert into public.inventory_items (user_id, item_id, serial_number, acquired_via)
  values (p_user, p_item, v_serial, 'admin_grant') returning id into v_id;
  return jsonb_build_object('item_id', p_item, 'status', 'granted', 'inventory_item_id', v_id, 'serial_number', v_serial);
end $$;

create function public.admin_grant_item(p_user_id uuid, p_item_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  v jsonb;
begin
  v := private.grant_item(p_user_id, p_item_id);
  if v ->> 'status' = 'already_owned' then
    perform private.fail('ALREADY_OWNED', 'This account already owns that item.');
  end if;
  perform private.audit('grant_item', p_user_id, 'catalog_item', p_item_id, v_reason, null, v);
  perform private.notify(p_user_id, 'admin', 'You received an item',
    (select name from public.catalog_items where id = p_item_id) || ' — ' || v_reason, jsonb_build_object('item_id', p_item_id));
  perform private.check_sets(p_user_id);
  perform private.evaluate_achievements(p_user_id);
  return v;
end $$;

create function public.admin_grant_set(p_user_id uuid, p_set_key text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
  c record;
  v_granted jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.item_sets where key = p_set_key) then
    perform private.fail('SET_NOT_FOUND', 'Item set not found.');
  end if;
  for c in select id from public.catalog_items where set_key = p_set_key order by id loop
    if not exists (select 1 from public.inventory_items where user_id = p_user_id and item_id = c.id) then
      v_granted := v_granted || private.grant_item(p_user_id, c.id);
    end if;
  end loop;
  perform private.audit('grant_set', p_user_id, 'item_set', p_set_key, v_reason, null,
    jsonb_build_object('granted', v_granted));
  perform private.check_sets(p_user_id);
  perform private.evaluate_achievements(p_user_id);
  return jsonb_build_object('granted', jsonb_array_length(v_granted), 'items', v_granted);
end $$;

-- Revoking never restores limited stock: the copy is retired so serial numbers stay unique.
create function public.admin_revoke_item(p_inventory_item_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  i public.inventory_items;
  t public.profiles;
  v_reason text;
begin
  perform private.require_developer();
  v_reason := private.require_reason(p_reason);
  select * into i from public.inventory_items where id = p_inventory_item_id for update;
  if not found then perform private.fail('ITEM_NOT_FOUND', 'Inventory item not found.'); end if;
  t := private.assert_can_modify(i.user_id);
  delete from public.inventory_items where id = p_inventory_item_id;
  if not exists (select 1 from public.inventory_items where user_id = i.user_id and item_id = i.item_id) then
    update public.avatars a
       set equipped = (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
                         from jsonb_each(a.equipped) where value #>> '{}' <> i.item_id),
           updated_at = now()
     where a.user_id = i.user_id;
    delete from public.item_favorites where user_id = i.user_id and item_id = i.item_id;
  end if;
  perform private.audit('revoke_item', i.user_id, 'inventory_item', p_inventory_item_id::text, v_reason,
    to_jsonb(i), null);
  return jsonb_build_object('revoked', true, 'item_id', i.item_id);
end $$;

create function public.admin_grant_pass(p_user_id uuid, p_pass_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
begin
  if not exists (select 1 from public.game_passes where id = p_pass_id) then
    perform private.fail('PASS_NOT_FOUND', 'Game pass not found.');
  end if;
  insert into public.game_pass_ownership (user_id, pass_id, acquired_via) values (p_user_id, p_pass_id, 'admin_grant');
  perform private.audit('grant_pass', p_user_id, 'game_pass', p_pass_id, v_reason, null, null);
  perform private.evaluate_achievements(p_user_id);
  return jsonb_build_object('granted', true);
exception when unique_violation then
  perform private.fail('ALREADY_OWNED', 'This account already owns that pass.');
end $$;

create function public.admin_revoke_pass(p_user_id uuid, p_pass_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.profiles := private.assert_can_modify(p_user_id);
  v_reason text := private.require_reason(p_reason);
begin
  delete from public.game_pass_ownership where user_id = p_user_id and pass_id = p_pass_id;
  if not found then perform private.fail('NOT_OWNED', 'This account does not own that pass.'); end if;
  perform private.audit('revoke_pass', p_user_id, 'game_pass', p_pass_id, v_reason, null, null);
  return jsonb_build_object('revoked', true);
end $$;

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------
create function public.admin_list_reports(p_status text default 'open', p_limit int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_developer();
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'details', r.details,
                                    'status', r.status, 'created_at', r.created_at,
                                    'reporter', private.account_row(r.reporter_id),
                                    'target', private.account_row(r.target_id)) order by r.created_at desc)
                     from (select * from public.reports where p_status is null or status = p_status
                            order by created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)) r), '[]'::jsonb);
end $$;

create function public.admin_resolve_report(p_report_id uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text;
  r public.reports;
begin
  perform private.require_developer();
  v_reason := private.require_reason(p_reason);
  if p_status not in ('reviewed', 'dismissed') then perform private.fail('INVALID_STATUS', 'Invalid status.'); end if;
  update public.reports set status = p_status where id = p_report_id returning * into r;
  if not found then perform private.fail('REPORT_NOT_FOUND', 'Report not found.'); end if;
  perform private.audit('resolve_report', r.target_id, 'report', p_report_id::text, v_reason,
    null, jsonb_build_object('status', p_status));
end $$;

-- ---------------------------------------------------------------------------
-- Developer role management (owners only)
-- ---------------------------------------------------------------------------
create function public.admin_set_developer_role(p_user_id uuid, p_role text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.developer_role := private.require_developer();
  v_reason text := private.require_reason(p_reason);
  v_before public.developer_role;
begin
  if v_role <> 'owner' then perform private.fail('FORBIDDEN', 'Only owners can manage developer roles.'); end if;
  if p_user_id = auth.uid() then perform private.fail('INVALID_TARGET', 'You cannot change your own role.'); end if;
  if exists (select 1 from public.profiles where id = p_user_id and is_npc) then
    perform private.fail('INVALID_TARGET', 'Simulated players cannot be developers.');
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    perform private.fail('USER_NOT_FOUND', 'Account not found.');
  end if;
  select role into v_before from public.developer_roles where user_id = p_user_id;
  if p_role is null then
    delete from public.developer_roles where user_id = p_user_id;
  elsif p_role in ('developer', 'owner') then
    insert into public.developer_roles (user_id, role, granted_by, note)
    values (p_user_id, p_role::public.developer_role, auth.uid(), v_reason)
    on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by,
                                        note = excluded.note, granted_at = now();
  else
    perform private.fail('INVALID_ROLE', 'Role must be developer, owner or none.');
  end if;
  perform private.audit('set_developer_role', p_user_id, 'developer_role', p_user_id::text, v_reason,
    jsonb_build_object('role', v_before), jsonb_build_object('role', p_role));
  return private.account_row(p_user_id);
end $$;

-- ---------------------------------------------------------------------------
-- System tools
-- ---------------------------------------------------------------------------
create function public.admin_list_audit_logs(p_limit int default 50, p_offset int default 0,
                                             p_target_user uuid default null, p_action text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_developer();
  return coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'action', l.action, 'reason', l.reason,
                                    'target_type', l.target_type, 'target_id', l.target_id,
                                    'before', l.before, 'after', l.after, 'created_at', l.created_at,
                                    'actor_id', l.actor_id, 'actor_username', a.username,
                                    'target_user_id', l.target_user_id, 'target_username', t.username)
                                    order by l.id desc)
                     from (select * from public.audit_logs
                            where (p_target_user is null or target_user_id = p_target_user)
                              and (p_action is null or action = p_action)
                            order by id desc
                            limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)) l
                     left join public.profiles a on a.id = l.actor_id
                     left join public.profiles t on t.id = l.target_user_id), '[]'::jsonb);
end $$;

create function public.admin_system_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_today timestamptz := (private.today()::timestamp at time zone 'utc');
begin
  perform private.require_developer();
  return jsonb_build_object(
    'server_time', now(),
    'schema_version', (select value from public.app_meta where key = 'schema_version'),
    'season', private.current_season(),
    'database_size_mb', round(pg_database_size(current_database()) / 1048576.0, 1),
    'accounts', jsonb_build_object(
       'players', (select count(*) from public.profiles where not is_npc),
       'npcs', (select count(*) from public.profiles where is_npc),
       'test', (select count(*) from public.profiles where is_test_account),
       'suspended', (select count(*) from public.profiles where account_status = 'suspended'),
       'developers', (select count(*) from public.developer_roles),
       'new_today', (select count(*) from public.profiles where not is_npc and created_at >= v_today),
       'active_today', (select count(*) from public.profiles where not is_npc and last_seen_at >= v_today)),
    'economy', jsonb_build_object(
       'orbs_in_circulation', (select coalesce(sum(balance), 0) from public.wallets),
       'transactions_today', (select count(*) from public.currency_transactions where created_at >= v_today),
       'orbs_earned_today', (select coalesce(sum(amount), 0) from public.currency_transactions
                              where created_at >= v_today and amount > 0),
       'orbs_spent_today', (select coalesce(-sum(amount), 0) from public.currency_transactions
                             where created_at >= v_today and amount < 0),
       'items_sold_today', (select count(*) from public.inventory_items where acquired_via = 'purchase' and acquired_at >= v_today)),
    'games', jsonb_build_object(
       'sessions_today', (select count(*) from public.game_sessions where started_at >= v_today),
       'rejected_today', (select count(*) from public.game_sessions where started_at >= v_today and status = 'rejected'),
       'active_now', (select count(*) from public.game_sessions where status = 'active' and started_at > now() - interval '10 minutes')),
    'content', jsonb_build_object(
       'catalog_items', (select count(*) from public.catalog_items),
       'games', (select count(*) from public.games),
       'game_passes', (select count(*) from public.game_passes),
       'achievements', (select count(*) from public.achievements)),
    'moderation', jsonb_build_object('open_reports', (select count(*) from public.reports where status = 'open')),
    'audit', jsonb_build_object('entries_today', (select count(*) from public.audit_logs where created_at >= v_today)));
end $$;

-- Read-only integrity checks. Never modifies data.
create function public.admin_run_diagnostics() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_checks jsonb := '[]'::jsonb;
  n bigint;
  v_detail text;
begin
  perform private.require_developer();

  select count(*) into n from public.wallets w
   where w.balance <> coalesce((select sum(amount) from public.currency_transactions t where t.user_id = w.user_id), 0);
  v_checks := v_checks || jsonb_build_object('key', 'ledger_integrity', 'label', 'Wallet balances equal ledger sums',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', format('%s mismatched wallets', n));

  select count(*) into n from public.profiles p where not exists (select 1 from public.wallets w where w.user_id = p.id);
  v_checks := v_checks || jsonb_build_object('key', 'wallet_coverage', 'label', 'Every account has a wallet',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', format('%s accounts without wallet', n));

  select count(*) into n from public.catalog_items c
   where c.is_limited and ((select count(*) from public.inventory_items i where i.item_id = c.id) > c.stock_total - c.stock_remaining
                           or coalesce((select max(serial_number) from public.inventory_items i where i.item_id = c.id), 0)
                              > c.stock_total - c.stock_remaining);
  v_checks := v_checks || jsonb_build_object('key', 'limited_stock', 'label', 'Limited copies never exceed copies sold',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', format('%s inconsistent limited items', n));

  select count(*) into n from (
    select i.user_id, i.item_id from public.inventory_items i join public.catalog_items c on c.id = i.item_id
     where not c.is_limited group by 1, 2 having count(*) > 1) d;
  v_checks := v_checks || jsonb_build_object('key', 'duplicate_ownership', 'label', 'Non-limited items owned at most once',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', format('%s duplicate holdings', n));

  select count(*) into n from public.avatars a, jsonb_each_text(a.equipped) e
   where not exists (select 1 from public.inventory_items i where i.user_id = a.user_id and i.item_id = e.value);
  v_checks := v_checks || jsonb_build_object('key', 'equipped_owned', 'label', 'Equipped items are owned',
    'status', case when n = 0 then 'pass' else 'warn' end, 'detail', format('%s equipped items not owned', n));

  select count(*) into n from public.friendships f
   where not exists (select 1 from public.friendships r where r.user_id = f.friend_id and r.friend_id = f.user_id);
  v_checks := v_checks || jsonb_build_object('key', 'friend_symmetry', 'label', 'Friendships are mutual',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', format('%s one-sided rows', n));

  select count(*) into n from pg_tables where schemaname = 'public' and not rowsecurity;
  v_checks := v_checks || jsonb_build_object('key', 'rls_enabled', 'label', 'Row Level Security on every table',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', format('%s tables without RLS', n));

  select count(*), string_agg(p.proname, ', ') into n, v_detail from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prosecdef
     and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false);
  v_checks := v_checks || jsonb_build_object('key', 'definer_search_path', 'label', 'Definer functions pin search_path',
    'status', case when n = 0 then 'pass' else 'fail' end, 'detail', coalesce(v_detail, 'all pinned'));

  select count(*) into n from public.game_sessions where status = 'active' and started_at < now() - interval '3 hours';
  v_checks := v_checks || jsonb_build_object('key', 'stale_sessions', 'label', 'No stale game sessions',
    'status', case when n = 0 then 'pass' else 'warn' end, 'detail', format('%s sessions older than 3h', n));

  select count(*) into n from public.game_sessions where status = 'rejected' and started_at > now() - interval '24 hours';
  v_checks := v_checks || jsonb_build_object('key', 'rejected_scores', 'label', 'Implausible scores (24h)',
    'status', case when n = 0 then 'pass' else 'warn' end, 'detail', format('%s rejected submissions', n));

  perform private.audit('run_diagnostics', null, 'system', null, 'Ran diagnostics', null,
    jsonb_build_object('failed', (select count(*) from jsonb_array_elements(v_checks) c where c ->> 'status' = 'fail')));
  return jsonb_build_object('ran_at', now(), 'checks', v_checks);
end $$;

create function public.admin_catalog_lookup(p_query text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_q text := '%' || lower(btrim(coalesce(p_query, ''))) || '%';
begin
  perform private.require_developer();
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slot', slot, 'rarity', rarity,
                                         'price', price, 'is_limited', is_limited, 'stock_remaining', stock_remaining,
                                         'asset', asset) order by name)
                         from (select * from public.catalog_items where lower(name) like v_q or id like v_q
                                order by name limit 40) c), '[]'::jsonb),
    'sets', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'name', name)) from public.item_sets), '[]'::jsonb),
    'passes', coalesce((select jsonb_agg(jsonb_build_object('id', gp.id, 'name', gp.name, 'game_title', g.title))
                          from public.game_passes gp join public.games g on g.id = gp.game_id), '[]'::jsonb));
end $$;
