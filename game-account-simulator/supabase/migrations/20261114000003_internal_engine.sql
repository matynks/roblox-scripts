-- Blockora — internal engine (schema `private`, never exposed through the API)
--
-- Error convention: functions raise SQLSTATE P0001 with MESSAGE = machine code
-- (e.g. INSUFFICIENT_FUNDS) and HINT = human-readable text. The app maps codes
-- to friendly messages.

create function private.fail(p_code text, p_hint text default null) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_code using errcode = 'P0001', hint = coalesce(p_hint, p_code);
end $$;

create function private.today() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'utc')::date $$;

-- ---------------------------------------------------------------------------
-- Rule tables (mirrored in src/domain/rules.ts; equality is tested)
-- ---------------------------------------------------------------------------
create function private.level_for_xp(p_xp bigint) returns int
language sql immutable set search_path = '' as $$
  select least(100, greatest(1, floor((1 + sqrt(1 + 0.08 * greatest(p_xp, 0))) / 2)::int));
$$;

create function private.xp_for_level(p_level int) returns bigint
language sql immutable set search_path = '' as $$ select (50 * p_level * (p_level - 1))::bigint $$;

create function private.level_reward(p_level int) returns int
language sql immutable set search_path = '' as $$ select 25 * p_level $$;

create function private.daily_reward_for_streak(p_streak int) returns int
language sql immutable set search_path = '' as $$
  select (array[50, 75, 100, 125, 150, 200, 400])[((greatest(p_streak, 1) - 1) % 7) + 1]
         + least(300, 50 * ((greatest(p_streak, 1) - 1) / 7));
$$;

create function private.season_for_date(p_day date) returns text
language sql immutable set search_path = '' as $$
  select case
           when extract(month from p_day) in (12, 1, 2) then 'frostbyte'
           when extract(month from p_day) in (3, 4, 5) then 'bloom'
           when extract(month from p_day) in (6, 7, 8) then 'solar'
           else 'neon_harvest'
         end;
$$;

create function private.current_season() returns text
language sql stable set search_path = '' as $$ select private.season_for_date(private.today()) $$;

-- Exclusive end of the season containing p_day (first day after it)
create function private.season_end(p_day date) returns date
language sql immutable set search_path = '' as $$
  select (date_trunc('month', p_day)
          + make_interval(months => case extract(month from p_day)::int
                                      when 12 then 3 when 1 then 2 when 2 then 1
                                      when 3 then 3 when 4 then 2 when 5 then 1
                                      when 6 then 3 when 7 then 2 when 8 then 1
                                      when 9 then 3 when 10 then 2 else 1 end))::date;
$$;

-- Three quests per UTC day, rotating deterministically through the pool.
create function private.active_quest_keys(p_day date) returns text[]
language sql stable set search_path = '' as $$
  with q as (
    select key, (row_number() over (order by sort_order, key) - 1)::int as idx, count(*) over ()::int as n
    from public.quests
  ), d as (select (p_day - date '2026-01-01') as day_index)
  select coalesce(array_agg(q.key order by q.idx), '{}')
  from q, d
  where q.idx in ((((d.day_index * 3) % q.n) + q.n) % q.n,
                  ((((d.day_index * 3) + 1) % q.n + q.n) % q.n),
                  ((((d.day_index * 3) + 2) % q.n + q.n) % q.n));
$$;

-- ---------------------------------------------------------------------------
-- Session guards
-- ---------------------------------------------------------------------------
create function private.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_status public.account_status;
begin
  if v_uid is null then perform private.fail('NOT_AUTHENTICATED', 'Please sign in again.'); end if;
  select account_status into v_status from public.profiles where id = v_uid;
  if v_status is null then perform private.fail('PROFILE_NOT_FOUND', 'Your player profile was not found.'); end if;
  if v_status = 'suspended' then perform private.fail('ACCOUNT_SUSPENDED', 'This account is suspended.'); end if;
  return v_uid;
end $$;

create function private.require_developer() returns public.developer_role
language plpgsql stable security definer set search_path = '' as $$
declare v_role public.developer_role;
begin
  perform private.require_user();
  select role into v_role from public.developer_roles where user_id = auth.uid();
  if v_role is null then perform private.fail('FORBIDDEN', 'Developer access is required.'); end if;
  return v_role;
end $$;

create function private.rate_limit(p_action text, p_max int, p_window_seconds int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limit_buckets as b (user_id, action, window_start, count)
  values (v_uid, p_action, v_window, 1)
  on conflict (user_id, action, window_start) do update set count = b.count + 1
  returning count into v_count;
  if v_count > p_max then
    perform private.fail('RATE_LIMITED', 'You are doing that too often. Please wait a moment.');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Ledger: the only code path that changes a balance
-- ---------------------------------------------------------------------------
create function private.apply_currency(
  p_user uuid,
  p_amount bigint,
  p_kind public.txn_kind,
  p_description text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_idem text default null,
  p_actor uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_balance bigint;
  v_new bigint;
  v_existing record;
  v_txn uuid;
begin
  if p_amount = 0 then
    select balance into v_balance from public.wallets where user_id = p_user;
    return jsonb_build_object('transaction_id', null, 'balance', v_balance, 'duplicate', false);
  end if;

  -- Lock first: every currency operation for a player is serialized here.
  select balance into v_balance from public.wallets where user_id = p_user for update;
  if v_balance is null then perform private.fail('WALLET_NOT_FOUND', 'Wallet not found.'); end if;

  if p_idem is not null then
    select id, balance_after into v_existing
      from public.currency_transactions where user_id = p_user and idempotency_key = p_idem;
    if found then
      return jsonb_build_object('transaction_id', v_existing.id, 'balance', v_balance, 'duplicate', true);
    end if;
  end if;

  v_new := v_balance + p_amount;
  if v_new < 0 then
    perform private.fail('INSUFFICIENT_FUNDS',
      format('You need %s more Orbs.', to_char(-v_new, 'FM999,999,999,999')));
  end if;
  if v_new > 1000000000 then
    perform private.fail('BALANCE_LIMIT', 'Balance cannot exceed 1,000,000,000 Orbs.');
  end if;

  update public.wallets
     set balance = v_new,
         lifetime_earned = lifetime_earned + greatest(p_amount, 0),
         lifetime_spent = lifetime_spent + greatest(-p_amount, 0),
         updated_at = now()
   where user_id = p_user;

  insert into public.currency_transactions
    (user_id, amount, balance_after, kind, description, reference_type, reference_id, idempotency_key, actor_id, metadata)
  values
    (p_user, p_amount, v_new, p_kind, left(p_description, 200), p_ref_type, p_ref_id, p_idem, p_actor, coalesce(p_meta, '{}'::jsonb))
  returning id into v_txn;

  return jsonb_build_object('transaction_id', v_txn, 'balance', v_new, 'duplicate', false);
end $$;

-- ---------------------------------------------------------------------------
-- Notifications, activity, audit
-- ---------------------------------------------------------------------------
create function private.notify(p_user uuid, p_kind public.notification_kind, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_npc boolean; v_social boolean; v_rewards boolean;
begin
  select is_npc into v_npc from public.profiles where id = p_user;
  if v_npc is distinct from false then return; end if;
  select notify_social, notify_rewards into v_social, v_rewards from public.user_settings where user_id = p_user;
  if p_kind in ('new_follower') and v_social is false then return; end if;
  if p_kind in ('reward', 'quest') and v_rewards is false then return; end if;
  insert into public.notifications (user_id, kind, title, body, data)
  values (p_user, p_kind, left(p_title, 120), left(coalesce(p_body, ''), 300), coalesce(p_data, '{}'::jsonb));
end $$;

create function private.log_activity(p_user uuid, p_kind text, p_data jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity_events (user_id, kind, data) values (p_user, p_kind, coalesce(p_data, '{}'::jsonb));
$$;

create function private.audit(p_action text, p_target_user uuid, p_target_type text, p_target_id text,
                              p_reason text, p_before jsonb, p_after jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, target_user_id, target_type, target_id, reason, before, after)
  values (auth.uid(), p_action, p_target_user, p_target_type, p_target_id, coalesce(p_reason, ''), p_before, p_after);
$$;

-- ---------------------------------------------------------------------------
-- Progression
-- ---------------------------------------------------------------------------
create function private.add_xp(p_user uuid, p_amount int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_xp bigint;
  v_old int;
  v_new int;
  v_reward int := 0;
  l int;
begin
  if p_amount <= 0 then
    select xp, level into v_xp, v_old from public.profiles where id = p_user;
    return jsonb_build_object('xp', v_xp, 'level', v_old, 'leveled_up', false, 'level_reward', 0);
  end if;
  update public.profiles set xp = least(xp + p_amount, 10000000)
   where id = p_user returning xp, level into v_xp, v_old;
  v_new := private.level_for_xp(v_xp);
  if v_new > v_old then
    update public.profiles set level = v_new where id = p_user;
    for l in (v_old + 1)..v_new loop
      v_reward := v_reward + private.level_reward(l);
      perform private.apply_currency(p_user, private.level_reward(l), 'level_reward',
        format('Reached level %s', l), 'level', l::text, 'level:' || l);
    end loop;
    perform private.notify(p_user, 'level_up', format('Level %s reached!', v_new),
      format('You earned %s Orbs for leveling up.', v_reward), jsonb_build_object('level', v_new));
    perform private.log_activity(p_user, 'level_up', jsonb_build_object('level', v_new));
  end if;
  return jsonb_build_object('xp', v_xp, 'level', greatest(v_new, v_old), 'leveled_up', v_new > v_old,
                            'level_reward', v_reward);
end $$;

create function private.bump_quests(p_user uuid, p_goal text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := private.today();
  q record;
  v_progress int;
  v_was_complete boolean;
begin
  if p_amount <= 0 then return; end if;
  for q in select * from public.quests
            where goal_type = p_goal and key = any (private.active_quest_keys(v_day)) loop
    select progress >= q.target into v_was_complete
      from public.quest_progress where user_id = p_user and quest_day = v_day and quest_key = q.key;
    insert into public.quest_progress as qp (user_id, quest_day, quest_key, progress, completed_at)
    values (p_user, v_day, q.key, least(p_amount, q.target), case when p_amount >= q.target then now() end)
    on conflict (user_id, quest_day, quest_key) do update
      set progress = least(qp.progress + p_amount, q.target),
          completed_at = coalesce(qp.completed_at, case when qp.progress + p_amount >= q.target then now() end)
    returning progress into v_progress;
    if v_progress >= q.target and v_was_complete is not true then
      perform private.notify(p_user, 'quest', 'Quest complete: ' || q.title,
        format('Claim %s Orbs in Rewards.', q.reward_orbs), jsonb_build_object('quest_key', q.key));
    end if;
  end loop;
end $$;

create function private.player_metrics(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'joined', 1,
    -- collection achievements count collected items; the starter kit does not count
    'items_owned', (select count(distinct item_id) from public.inventory_items
                     where user_id = p_user and acquired_via <> 'starter'),
    'limited_owned', (select count(*) from public.inventory_items i join public.catalog_items c on c.id = i.item_id
                       where i.user_id = p_user and c.is_limited),
    'outfits_saved', (select count(*) from public.outfits where user_id = p_user),
    'games_played', (select coalesce(sum(plays), 0) from public.player_game_stats where user_id = p_user),
    'distinct_games', (select count(*) from public.player_game_stats where user_id = p_user and plays > 0),
    'friends', (select count(*) from public.friendships where user_id = p_user),
    'followers', (select count(*) from public.follows where followee_id = p_user),
    'following', (select count(*) from public.follows where follower_id = p_user),
    'streak', (select coalesce(longest_streak, 0) from public.daily_streaks where user_id = p_user),
    'level', (select level from public.profiles where id = p_user),
    'balance', (select balance from public.wallets where user_id = p_user),
    'sets_completed', (select count(*) from public.collection_claims where user_id = p_user),
    'passes_owned', (select count(*) from public.game_pass_ownership where user_id = p_user),
    'purchases', (select count(*) from public.currency_transactions where user_id = p_user
                   and kind in ('purchase', 'gamepass_purchase'))
  );
$$;

-- Unlocks every achievement whose target is met; returns the newly unlocked ones.
create function private.evaluate_achievements(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_unlocked jsonb := '[]'::jsonb;
  v_metrics jsonb;
  v_value numeric;
  v_new int;
  a record;
  pass int := 0;
begin
  if exists (select 1 from public.profiles where id = p_user and is_npc) then return v_unlocked; end if;
  loop
    pass := pass + 1;
    v_new := 0;
    v_metrics := private.player_metrics(p_user);
    for a in select * from public.achievements ach
              where not exists (select 1 from public.user_achievements ua
                                 where ua.user_id = p_user and ua.achievement_key = ach.key)
              order by sort_order loop
      if a.metric = 'best_score_engine' then
        select coalesce(max(s.best_score), 0) into v_value
          from public.player_game_stats s join public.games g on g.id = s.game_id
         where s.user_id = p_user and g.engine = a.engine;
      else
        v_value := coalesce((v_metrics ->> a.metric)::numeric, 0);
      end if;
      if v_value >= a.target then
        insert into public.user_achievements (user_id, achievement_key) values (p_user, a.key)
          on conflict do nothing;
        if found then
          v_new := v_new + 1;
          if a.reward_orbs > 0 then
            perform private.apply_currency(p_user, a.reward_orbs, 'achievement_reward',
              'Achievement: ' || a.name, 'achievement', a.key, 'ach:' || a.key);
          end if;
          perform private.add_xp(p_user, a.reward_xp);
          perform private.notify(p_user, 'achievement', 'Achievement unlocked: ' || a.name,
            case when a.reward_orbs > 0 then format('+%s Orbs', a.reward_orbs) else a.description end,
            jsonb_build_object('achievement_key', a.key));
          perform private.log_activity(p_user, 'achievement', jsonb_build_object('key', a.key, 'name', a.name));
          v_unlocked := v_unlocked || jsonb_build_object('key', a.key, 'name', a.name, 'icon', a.icon,
                                                         'reward_orbs', a.reward_orbs);
        end if;
      end if;
    end loop;
    exit when v_new = 0 or pass >= 4;
  end loop;
  return v_unlocked;
end $$;

-- Common tail for every rewarding action: returns the fresh economy state.
create function private.player_state(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'balance', (select balance from public.wallets where user_id = p_user),
    'level', p.level,
    'total_xp', p.xp
  ) from public.profiles p where p.id = p_user;
$$;

-- Avatar configuration validation shared by save_avatar / outfits / admin tools.
-- Raises if any equipped item is not owned by p_user or is in the wrong slot.
create function private.validate_avatar_config(p_user uuid, p_config jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_equipped jsonb := coalesce(p_config -> 'equipped', '{}'::jsonb);
  k text;
  v text;
  v_slot public.item_slot;
  v_skin text := coalesce(p_config ->> 'skin_tone', '#F2C9A0');
  v_body text := coalesce(p_config ->> 'body_type', 'classic');
  v_height numeric := coalesce((p_config ->> 'height_scale')::numeric, 1);
  v_head numeric := coalesce((p_config ->> 'head_scale')::numeric, 1);
begin
  if jsonb_typeof(v_equipped) <> 'object' then perform private.fail('INVALID_AVATAR', 'Invalid avatar.'); end if;
  if v_skin !~ '^#[0-9A-Fa-f]{6}$' then perform private.fail('INVALID_AVATAR', 'Invalid skin tone.'); end if;
  if v_body not in ('classic', 'slim', 'broad') then perform private.fail('INVALID_AVATAR', 'Invalid body type.'); end if;
  if v_height < 0.9 or v_height > 1.1 or v_head < 0.9 or v_head > 1.1 then
    perform private.fail('INVALID_AVATAR', 'Body scale out of range.');
  end if;
  for k, v in select key, value #>> '{}' from jsonb_each(v_equipped) loop
    if v is null then continue; end if;
    select slot into v_slot from public.catalog_items where id = v;
    if v_slot is null then perform private.fail('ITEM_NOT_FOUND', 'An equipped item does not exist.'); end if;
    if v_slot::text <> k then perform private.fail('WRONG_SLOT', 'An item is equipped in the wrong slot.'); end if;
    if not exists (select 1 from public.inventory_items where user_id = p_user and item_id = v) then
      perform private.fail('NOT_OWNED', 'You can only wear items you own.');
    end if;
  end loop;
  return jsonb_build_object(
    'skin_tone', upper(v_skin), 'body_type', v_body,
    'height_scale', round(v_height, 2), 'head_scale', round(v_head, 2),
    'equipped', coalesce((select jsonb_object_agg(key, value) from jsonb_each(v_equipped)
                           where jsonb_typeof(value) = 'string'), '{}'::jsonb));
end $$;

-- Grants every completed, unclaimed item set (called after inventory grows)
create function private.check_sets(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  v_done jsonb := '[]'::jsonb;
begin
  for s in
    select st.* from public.item_sets st
     where not exists (select 1 from public.collection_claims cc where cc.user_id = p_user and cc.set_key = st.key)
       and exists (select 1 from public.catalog_items c where c.set_key = st.key)
       and not exists (select 1 from public.catalog_items c
                        where c.set_key = st.key
                          and not exists (select 1 from public.inventory_items i
                                           where i.user_id = p_user and i.item_id = c.id))
  loop
    insert into public.collection_claims (user_id, set_key) values (p_user, s.key) on conflict do nothing;
    if s.reward_orbs > 0 then
      perform private.apply_currency(p_user, s.reward_orbs, 'collection_reward', 'Set complete: ' || s.name,
        'item_set', s.key, 'set:' || s.key);
    end if;
    perform private.notify(p_user, 'reward', 'Set complete: ' || s.name,
      format('You collected every item. +%s Orbs', s.reward_orbs), jsonb_build_object('set_key', s.key));
    perform private.log_activity(p_user, 'set_complete', jsonb_build_object('set_key', s.key, 'name', s.name));
    v_done := v_done || jsonb_build_object('key', s.key, 'name', s.name, 'reward_orbs', s.reward_orbs);
  end loop;
  return v_done;
end $$;

-- Simulated presence for NPC players: about a third are "online" each hour.
create function private.npc_online(p_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select abs(hashtext(p_id::text || to_char(now() at time zone 'utc', 'YYYYMMDDHH24'))) % 3 = 0;
$$;

-- Compact public card for a player (used by lists, feed, leaderboards)
create function private.player_card(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'level', p.level,
    'is_npc', p.is_npc, 'profile_theme', p.profile_theme,
    'is_online', case when p.is_npc then private.npc_online(p.id)
                      when coalesce(s.show_online_status, true) then p.last_seen_at > now() - interval '5 minutes'
                      else null end,
    'avatar', (select jsonb_build_object('skin_tone', a.skin_tone, 'body_type', a.body_type,
                                         'height_scale', a.height_scale, 'head_scale', a.head_scale,
                                         'equipped', a.equipped)
                 from public.avatars a where a.user_id = p.id)
  )
  from public.profiles p left join public.user_settings s on s.user_id = p.id
  where p.id = p_user;
$$;

revoke all on all functions in schema private from public;
grant execute on function private.can_view(uuid, text) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.are_friends(uuid, uuid) to authenticated;
