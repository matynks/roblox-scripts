-- Blockora — player account, economy, avatar and progression RPCs

-- ---------------------------------------------------------------------------
-- Account initialisation (runs inside the GoTrue sign-up transaction)
-- ---------------------------------------------------------------------------
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username text := btrim(coalesce(v_meta ->> 'username', ''));
  v_display text := btrim(coalesce(v_meta ->> 'display_name', ''));
  v_equipped jsonb := '{}'::jsonb;
  v_slot record;
begin
  if coalesce(v_meta ->> 'terms_accepted', 'false') <> 'true' then
    perform private.fail('TERMS_REQUIRED', 'You must accept the terms to create an account.');
  end if;
  if not (v_username ~ '^[A-Za-z0-9_]{3,20}$' and v_username !~ '^_' and v_username !~ '_$'
          and char_length(v_username) - char_length(replace(v_username, '_', '')) <= 1) then
    perform private.fail('INVALID_USERNAME', 'Usernames are 3-20 letters, numbers and at most one underscore.');
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
    perform private.fail('USERNAME_TAKEN', 'That username is already taken.');
  end if;
  if not (v_display ~ '^[A-Za-z0-9_][A-Za-z0-9_ ]{1,18}[A-Za-z0-9_]$' and v_display !~ '  ') then
    v_display := v_username;
  end if;

  insert into public.profiles (id, username, display_name, terms_accepted_at)
  values (new.id, v_username, v_display, now());
  insert into public.user_settings (user_id) values (new.id);
  insert into public.wallets (user_id, balance) values (new.id, 0);
  insert into public.daily_streaks (user_id) values (new.id);

  perform private.apply_currency(new.id, 750, 'signup_bonus', 'Welcome bonus', 'account', new.id::text, 'signup');

  insert into public.inventory_items (user_id, item_id, acquired_via)
  select new.id, id, 'starter' from public.catalog_items where is_starter;

  -- Each new player starts with a slightly different look drawn from the starter items.
  for v_slot in
    select slot, array_agg(id order by id) as ids from public.catalog_items where is_starter group by slot
  loop
    v_equipped := v_equipped || jsonb_build_object(
      v_slot.slot::text,
      v_slot.ids[1 + abs(hashtext(new.id::text || v_slot.slot::text)) % array_length(v_slot.ids, 1)]);
  end loop;
  insert into public.avatars (user_id, skin_tone, equipped)
  values (new.id,
          (array['#F2C9A0', '#E0AC69', '#C68642', '#8D5524', '#FFDBB4', '#A86B3C'])[1 + abs(hashtext(new.id::text)) % 6],
          v_equipped);

  perform private.notify(new.id, 'system', 'Welcome to Blockora!',
    'You received 750 Orbs to get started. Orbs are simulated and have no real-world value.', '{}'::jsonb);
  perform private.log_activity(new.id, 'joined', '{}'::jsonb);
  perform private.evaluate_achievements(new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create function public.check_username_available(p_username text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v text := btrim(coalesce(p_username, ''));
begin
  if not (v ~ '^[A-Za-z0-9_]{3,20}$' and v !~ '^_' and v !~ '_$'
          and char_length(v) - char_length(replace(v, '_', '')) <= 1) then
    return jsonb_build_object('available', false, 'reason', 'INVALID_USERNAME');
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v)) then
    return jsonb_build_object('available', false, 'reason', 'USERNAME_TAKEN');
  end if;
  return jsonb_build_object('available', true, 'reason', null);
end $$;

create function public.touch_presence() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set last_seen_at = now()
   where id = auth.uid() and last_seen_at < now() - interval '1 minute';
end $$;

create function public.get_me() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_today date := private.today();
  v_streak record;
  v_next_streak int;
begin
  update public.profiles set last_seen_at = now() where id = v_uid and last_seen_at < now() - interval '1 minute';
  select * into v_streak from public.daily_streaks where user_id = v_uid;
  v_next_streak := case when v_streak.last_claim_date = v_today - 1 then v_streak.current_streak + 1
                        when v_streak.last_claim_date = v_today then v_streak.current_streak
                        else 1 end;
  return jsonb_build_object(
    'profile', (select jsonb_build_object(
        'id', p.id, 'username', p.username, 'display_name', p.display_name, 'bio', p.bio,
        'status_text', p.status_text, 'profile_theme', p.profile_theme, 'level', p.level, 'xp', p.xp,
        'xp_for_level', private.xp_for_level(p.level), 'xp_for_next', private.xp_for_level(least(p.level + 1, 100)),
        'reputation', p.reputation, 'is_test_account', p.is_test_account, 'created_at', p.created_at,
        'username_changed_at', p.username_changed_at, 'display_name_changed_at', p.display_name_changed_at)
      from public.profiles p where p.id = v_uid),
    'wallet', (select jsonb_build_object('balance', balance, 'lifetime_earned', lifetime_earned,
                                         'lifetime_spent', lifetime_spent)
                 from public.wallets where user_id = v_uid),
    'settings', (select to_jsonb(s) - 'user_id' - 'updated_at' from public.user_settings s where s.user_id = v_uid),
    'avatar', (select jsonb_build_object('skin_tone', skin_tone, 'body_type', body_type, 'height_scale', height_scale,
                                         'head_scale', head_scale, 'equipped', equipped)
                 from public.avatars where user_id = v_uid),
    'daily', jsonb_build_object(
        'current_streak', coalesce(v_streak.current_streak, 0),
        'longest_streak', coalesce(v_streak.longest_streak, 0),
        'can_claim', v_streak.last_claim_date is distinct from v_today,
        'next_reward', private.daily_reward_for_streak(v_next_streak),
        'next_streak', v_next_streak,
        'next_claim_at', case when v_streak.last_claim_date = v_today
                              then ((v_today + 1)::timestamp at time zone 'utc') end,
        'cycle', (select jsonb_agg(private.daily_reward_for_streak(d)) from generate_series(1, 7) d)),
    'access', jsonb_build_object(
        'is_developer', exists (select 1 from public.developer_roles where user_id = v_uid),
        'role', (select role from public.developer_roles where user_id = v_uid)),
    'counts', jsonb_build_object(
        'unread_notifications', (select count(*) from public.notifications where user_id = v_uid and read_at is null),
        'pending_friend_requests', (select count(*) from public.friend_requests
                                     where receiver_id = v_uid and status = 'pending'),
        'friends', (select count(*) from public.friendships where user_id = v_uid),
        'followers', (select count(*) from public.follows where followee_id = v_uid),
        'following', (select count(*) from public.follows where follower_id = v_uid)),
    'season', jsonb_build_object('key', private.current_season(),
                                 'ends_at', (private.season_end(v_today)::timestamp at time zone 'utc'))
  );
end $$;

create function public.update_profile(p_display_name text, p_bio text, p_status_text text, p_profile_theme text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  p record;
  v_display text := btrim(coalesce(p_display_name, ''));
  v_bio text := regexp_replace(coalesce(p_bio, ''), '[[:cntrl:]&&[^\n]]', '', 'g');
  v_status text := btrim(regexp_replace(coalesce(p_status_text, ''), '[[:cntrl:]]', '', 'g'));
  v_theme text := coalesce(p_profile_theme, 'default');
  v_required int;
begin
  perform private.rate_limit('update_profile', 30, 3600);
  select * into p from public.profiles where id = v_uid for update;
  if not (v_display ~ '^[A-Za-z0-9_][A-Za-z0-9_ ]{1,18}[A-Za-z0-9_]$' and v_display !~ '  ') then
    perform private.fail('INVALID_DISPLAY_NAME', 'Display names are 3-20 letters, numbers, spaces or underscores.');
  end if;
  if v_display <> p.display_name and p.display_name_changed_at > now() - interval '7 days' then
    perform private.fail('DISPLAY_NAME_COOLDOWN',
      'You can change your display name again on ' ||
      to_char((p.display_name_changed_at + interval '7 days') at time zone 'utc', 'Mon DD') || '.');
  end if;
  if char_length(v_bio) > 500 then perform private.fail('BIO_TOO_LONG', 'Bios can be up to 500 characters.'); end if;
  if char_length(v_status) > 60 then perform private.fail('STATUS_TOO_LONG', 'Status can be up to 60 characters.'); end if;
  v_required := case v_theme when 'default' then 1 when 'midnight' then 1 when 'sunset' then 3 when 'ocean' then 5
                             when 'forest' then 8 when 'neon' then 12 when 'galaxy' then 20 when 'gold' then 30 end;
  if v_required is null then perform private.fail('INVALID_THEME', 'Unknown profile theme.'); end if;
  if p.level < v_required then
    perform private.fail('THEME_LOCKED', format('This theme unlocks at level %s.', v_required));
  end if;

  update public.profiles
     set display_name = v_display,
         display_name_changed_at = case when v_display <> p.display_name then now() else display_name_changed_at end,
         bio = v_bio, status_text = v_status, profile_theme = v_theme
   where id = v_uid;
  return public.get_me() -> 'profile';
end $$;

create function public.change_username(p_new_username text, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_new text := btrim(coalesce(p_new_username, ''));
  v_old text;
  v_cost int := 1000;
  v_avail jsonb;
  v_res jsonb;
begin
  perform private.rate_limit('change_username', 5, 86400);
  select username into v_old from public.profiles where id = v_uid for update;
  if v_new = v_old then perform private.fail('SAME_USERNAME', 'That is already your username.'); end if;
  if lower(v_new) = lower(v_old) then
    v_cost := 0;  -- changing capitalisation only is free
    if not (v_new ~ '^[A-Za-z0-9_]{3,20}$') then perform private.fail('INVALID_USERNAME'); end if;
  else
    v_avail := public.check_username_available(v_new);
    if not (v_avail ->> 'available')::boolean then
      perform private.fail(v_avail ->> 'reason',
        case v_avail ->> 'reason' when 'USERNAME_TAKEN' then 'That username is already taken.'
             else 'Usernames are 3-20 letters, numbers and at most one underscore.' end);
    end if;
  end if;
  if v_cost > 0 then
    v_res := private.apply_currency(v_uid, -v_cost, 'username_change', 'Username change to @' || v_new,
      'profile', v_uid::text, 'username:' || coalesce(p_idempotency_key, lower(v_new)));
    if (v_res ->> 'duplicate')::boolean then
      return jsonb_build_object('username', (select username from public.profiles where id = v_uid),
                                'cost', v_cost, 'duplicate', true) || private.player_state(v_uid);
    end if;
  end if;
  update public.profiles set username = v_new, username_changed_at = now() where id = v_uid;
  return jsonb_build_object('username', v_new, 'cost', v_cost, 'duplicate', false) || private.player_state(v_uid);
end $$;

-- ---------------------------------------------------------------------------
-- Daily reward streak
-- ---------------------------------------------------------------------------
create function public.claim_daily_reward() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_today date := private.today();
  s record;
  v_streak int;
  v_reward int;
  v_xp jsonb;
  v_unlocked jsonb;
begin
  select * into s from public.daily_streaks where user_id = v_uid for update;
  if not found then
    insert into public.daily_streaks (user_id) values (v_uid) returning * into s;
  end if;
  if s.last_claim_date = v_today then
    perform private.fail('ALREADY_CLAIMED', 'You already claimed today''s reward. Come back tomorrow!');
  end if;
  v_streak := case when s.last_claim_date = v_today - 1 then s.current_streak + 1 else 1 end;
  v_reward := private.daily_reward_for_streak(v_streak);
  perform private.apply_currency(v_uid, v_reward, 'daily_reward', format('Daily reward (day %s)', v_streak),
    'daily', v_today::text, 'daily:' || v_today);
  update public.daily_streaks
     set current_streak = v_streak, longest_streak = greatest(longest_streak, v_streak),
         last_claim_date = v_today, total_claims = total_claims + 1
   where user_id = v_uid;
  v_xp := private.add_xp(v_uid, 15);
  perform private.bump_quests(v_uid, 'daily_claimed', 1);
  v_unlocked := private.evaluate_achievements(v_uid);
  return jsonb_build_object('reward', v_reward, 'streak', v_streak,
                            'next_reward', private.daily_reward_for_streak(v_streak + 1),
                            'leveled_up', (v_xp ->> 'leveled_up')::boolean, 'unlocked', v_unlocked)
         || private.player_state(v_uid);
end $$;

-- ---------------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------------
create function public.purchase_item(p_item_id text, p_expected_price int, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_item record;
  v_existing record;
  v_serial int;
  v_inv uuid;
  v_copies int;
  v_xp jsonb;
  v_unlocked jsonb;
  v_sets jsonb;
  v_idem text;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 80 then
    perform private.fail('INVALID_REQUEST', 'Missing purchase token.');
  end if;
  v_idem := 'purchase:' || p_idempotency_key;
  perform private.rate_limit('purchase', 60, 3600);

  -- Serialise this player's economy and replay a finished purchase on retry.
  perform 1 from public.wallets where user_id = v_uid for update;
  select t.reference_id, t.metadata into v_existing
    from public.currency_transactions t where t.user_id = v_uid and t.idempotency_key = v_idem;
  if found then
    return jsonb_build_object('status', 'duplicate', 'item_id', p_item_id,
                              'inventory_item_id', v_existing.metadata ->> 'inventory_item_id',
                              'serial_number', (v_existing.metadata ->> 'serial_number')::int,
                              'unlocked', '[]'::jsonb, 'sets_completed', '[]'::jsonb)
           || private.player_state(v_uid);
  end if;

  select * into v_item from public.catalog_items where id = p_item_id for update;
  if not found then perform private.fail('ITEM_NOT_FOUND', 'This item no longer exists.'); end if;
  if not v_item.is_for_sale then perform private.fail('NOT_FOR_SALE', 'This item is not for sale.'); end if;
  if v_item.season_key is not null and v_item.season_key <> private.current_season() then
    perform private.fail('OFF_SEASON', 'This seasonal item is not available right now.');
  end if;
  if p_expected_price is not null and p_expected_price <> v_item.price then
    perform private.fail('PRICE_CHANGED', format('The price changed to %s Orbs. Please review and try again.', v_item.price));
  end if;
  if v_item.is_limited then
    if v_item.stock_remaining <= 0 then perform private.fail('SOLD_OUT', 'This limited item is sold out.'); end if;
    select count(*) into v_copies from public.inventory_items where user_id = v_uid and item_id = v_item.id;
    if v_copies >= 3 then perform private.fail('COPY_LIMIT', 'You can own up to 3 copies of a limited item.'); end if;
  elsif exists (select 1 from public.inventory_items where user_id = v_uid and item_id = v_item.id) then
    perform private.fail('ALREADY_OWNED', 'You already own this item.');
  end if;

  if v_item.is_limited then
    update public.catalog_items set stock_remaining = stock_remaining - 1
     where id = v_item.id returning stock_total - stock_remaining into v_serial;
  end if;
  insert into public.inventory_items (user_id, item_id, serial_number, acquired_via, price_paid)
  values (v_uid, v_item.id, v_serial, 'purchase', v_item.price) returning id into v_inv;

  if v_item.price > 0 then
    perform private.apply_currency(v_uid, -v_item.price, 'purchase', 'Purchased ' || v_item.name,
      'catalog_item', v_item.id, v_idem, null,
      jsonb_build_object('inventory_item_id', v_inv, 'serial_number', v_serial));
  end if;

  update public.catalog_items set sales_count = sales_count + 1 where id = v_item.id;
  insert into public.item_price_points as pp (item_id, day, avg_price, volume)
  values (v_item.id, private.today(), v_item.price, 1)
  on conflict (item_id, day) do update
    set avg_price = ((pp.avg_price::bigint * pp.volume + v_item.price) / (pp.volume + 1))::int,
        volume = pp.volume + 1;

  perform private.log_activity(v_uid, 'purchase', jsonb_build_object('item_id', v_item.id, 'name', v_item.name,
                                                                     'rarity', v_item.rarity));
  v_xp := private.add_xp(v_uid, least(50, 5 + v_item.price / 100));
  perform private.bump_quests(v_uid, 'items_bought', 1);
  v_sets := private.check_sets(v_uid);
  v_unlocked := private.evaluate_achievements(v_uid);
  return jsonb_build_object('status', 'ok', 'item_id', v_item.id, 'inventory_item_id', v_inv,
                            'serial_number', v_serial, 'price', v_item.price,
                            'leveled_up', (v_xp ->> 'leveled_up')::boolean,
                            'unlocked', v_unlocked, 'sets_completed', v_sets)
         || private.player_state(v_uid);
end $$;

create function public.toggle_item_favorite(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_fav boolean;
  v_count int;
begin
  perform private.rate_limit('favorite', 120, 3600);
  if not exists (select 1 from public.catalog_items where id = p_item_id) then
    perform private.fail('ITEM_NOT_FOUND', 'This item no longer exists.');
  end if;
  delete from public.item_favorites where user_id = v_uid and item_id = p_item_id;
  if found then
    v_fav := false;
    update public.catalog_items set favorites_count = greatest(favorites_count - 1, 0)
     where id = p_item_id returning favorites_count into v_count;
  else
    insert into public.item_favorites (user_id, item_id) values (v_uid, p_item_id);
    v_fav := true;
    update public.catalog_items set favorites_count = favorites_count + 1
     where id = p_item_id returning favorites_count into v_count;
  end if;
  return jsonb_build_object('favorited', v_fav, 'favorites_count', v_count);
end $$;

-- ---------------------------------------------------------------------------
-- Avatar & outfits
-- ---------------------------------------------------------------------------
create function public.save_avatar(p_config jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v jsonb;
begin
  perform private.rate_limit('save_avatar', 120, 3600);
  v := private.validate_avatar_config(v_uid, p_config);
  insert into public.avatars as a (user_id, skin_tone, body_type, height_scale, head_scale, equipped, updated_at)
  values (v_uid, v ->> 'skin_tone', v ->> 'body_type', (v ->> 'height_scale')::numeric,
          (v ->> 'head_scale')::numeric, v -> 'equipped', now())
  on conflict (user_id) do update
    set skin_tone = excluded.skin_tone, body_type = excluded.body_type, height_scale = excluded.height_scale,
        head_scale = excluded.head_scale, equipped = excluded.equipped, updated_at = now();
  return v;
end $$;

create function public.save_outfit(p_name text, p_config jsonb, p_is_public boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v jsonb;
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  perform private.rate_limit('save_outfit', 60, 3600);
  if char_length(v_name) not between 1 and 30 then
    perform private.fail('INVALID_NAME', 'Outfit names are 1-30 characters.');
  end if;
  if (select count(*) from public.outfits where user_id = v_uid) >= 50 then
    perform private.fail('OUTFIT_LIMIT', 'You can save up to 50 outfits.');
  end if;
  v := private.validate_avatar_config(v_uid, p_config);
  insert into public.outfits (user_id, name, skin_tone, body_type, height_scale, head_scale, equipped, is_public)
  values (v_uid, v_name, v ->> 'skin_tone', v ->> 'body_type', (v ->> 'height_scale')::numeric,
          (v ->> 'head_scale')::numeric, v -> 'equipped', coalesce(p_is_public, false))
  returning id into v_id;
  if coalesce(p_is_public, false) then
    perform private.log_activity(v_uid, 'outfit_shared', jsonb_build_object('outfit_id', v_id, 'name', v_name));
  end if;
  perform private.bump_quests(v_uid, 'outfit_actions', 1);
  return jsonb_build_object('id', v_id, 'unlocked', private.evaluate_achievements(v_uid));
end $$;

create function public.update_outfit(p_outfit_id uuid, p_name text, p_is_public boolean, p_config jsonb default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  o record;
  v jsonb;
  v_name text := btrim(coalesce(p_name, ''));
begin
  select * into o from public.outfits where id = p_outfit_id and user_id = v_uid for update;
  if not found then perform private.fail('OUTFIT_NOT_FOUND', 'Outfit not found.'); end if;
  if char_length(v_name) not between 1 and 30 then
    perform private.fail('INVALID_NAME', 'Outfit names are 1-30 characters.');
  end if;
  if p_config is not null then
    v := private.validate_avatar_config(v_uid, p_config);
    update public.outfits set skin_tone = v ->> 'skin_tone', body_type = v ->> 'body_type',
           height_scale = (v ->> 'height_scale')::numeric, head_scale = (v ->> 'head_scale')::numeric,
           equipped = v -> 'equipped'
     where id = p_outfit_id;
  end if;
  update public.outfits set name = v_name, is_public = coalesce(p_is_public, is_public), updated_at = now()
   where id = p_outfit_id;
  if coalesce(p_is_public, false) and not o.is_public then
    perform private.log_activity(v_uid, 'outfit_shared', jsonb_build_object('outfit_id', p_outfit_id, 'name', v_name));
  end if;
end $$;

create function public.delete_outfit(p_outfit_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  delete from public.outfits where id = p_outfit_id and user_id = v_uid;
  if not found then perform private.fail('OUTFIT_NOT_FOUND', 'Outfit not found.'); end if;
end $$;

-- Wear one of your outfits, or try on someone's public outfit. Items you do not
-- own are reported back instead of silently dropped.
create function public.wear_outfit(p_outfit_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  o record;
  v_missing jsonb;
begin
  select * into o from public.outfits where id = p_outfit_id;
  if not found or (o.user_id <> v_uid and (not o.is_public or private.is_blocked_between(o.user_id, v_uid))) then
    perform private.fail('OUTFIT_NOT_FOUND', 'Outfit not found.');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', c.id, 'name', c.name, 'price', c.price)), '[]'::jsonb)
    into v_missing
    from jsonb_each_text(o.equipped) e join public.catalog_items c on c.id = e.value
   where not exists (select 1 from public.inventory_items i where i.user_id = v_uid and i.item_id = e.value);
  if jsonb_array_length(v_missing) > 0 then
    return jsonb_build_object('status', 'missing_items', 'missing', v_missing);
  end if;
  perform public.save_avatar(jsonb_build_object('skin_tone', o.skin_tone, 'body_type', o.body_type,
    'height_scale', o.height_scale, 'head_scale', o.head_scale, 'equipped', o.equipped));
  perform private.bump_quests(v_uid, 'outfit_actions', 1);
  return jsonb_build_object('status', 'ok', 'missing', '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Daily quests
-- ---------------------------------------------------------------------------
create function public.get_daily_quests() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_day date := private.today();
begin
  return jsonb_build_object(
    'day', v_day,
    'resets_at', ((v_day + 1)::timestamp at time zone 'utc'),
    'quests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'key', q.key, 'title', q.title, 'description', q.description, 'goal_type', q.goal_type,
               'target', q.target, 'reward_orbs', q.reward_orbs, 'reward_xp', q.reward_xp,
               'progress', coalesce(qp.progress, 0),
               'completed', coalesce(qp.progress, 0) >= q.target,
               'claimed', qp.claimed_at is not null) order by q.sort_order)
        from public.quests q
        left join public.quest_progress qp on qp.user_id = v_uid and qp.quest_day = v_day and qp.quest_key = q.key
       where q.key = any (private.active_quest_keys(v_day))), '[]'::jsonb));
end $$;

create function public.claim_quest(p_quest_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_day date := private.today();
  q record;
  qp record;
  v_unlocked jsonb;
begin
  select * into q from public.quests where key = p_quest_key;
  if not found or not (p_quest_key = any (private.active_quest_keys(v_day))) then
    perform private.fail('QUEST_NOT_ACTIVE', 'This quest is not active today.');
  end if;
  select * into qp from public.quest_progress
   where user_id = v_uid and quest_day = v_day and quest_key = p_quest_key for update;
  if not found or qp.progress < q.target then
    perform private.fail('QUEST_INCOMPLETE', 'Finish the quest before claiming.');
  end if;
  if qp.claimed_at is not null then perform private.fail('ALREADY_CLAIMED', 'Reward already claimed.'); end if;
  update public.quest_progress set claimed_at = now()
   where user_id = v_uid and quest_day = v_day and quest_key = p_quest_key;
  perform private.apply_currency(v_uid, q.reward_orbs, 'quest_reward', 'Quest: ' || q.title, 'quest', q.key,
    'quest:' || v_day || ':' || q.key);
  perform private.add_xp(v_uid, q.reward_xp);
  v_unlocked := private.evaluate_achievements(v_uid);
  return jsonb_build_object('reward', q.reward_orbs, 'unlocked', v_unlocked) || private.player_state(v_uid);
end $$;

-- ---------------------------------------------------------------------------
-- Account analytics (own account only)
-- ---------------------------------------------------------------------------
create function public.get_account_analytics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  return jsonb_build_object(
    'earned_by_kind', coalesce((select jsonb_object_agg(kind, total) from (
        select kind::text, sum(amount) as total from public.currency_transactions
         where user_id = v_uid and amount > 0 group by kind) x), '{}'::jsonb),
    'spent_by_kind', coalesce((select jsonb_object_agg(kind, total) from (
        select kind::text, -sum(amount) as total from public.currency_transactions
         where user_id = v_uid and amount < 0 group by kind) x), '{}'::jsonb),
    'last_7_days', (select jsonb_agg(jsonb_build_object('day', d::date,
        'earned', coalesce((select sum(amount) from public.currency_transactions
                             where user_id = v_uid and amount > 0
                               and (created_at at time zone 'utc')::date = d::date), 0),
        'spent', coalesce((select -sum(amount) from public.currency_transactions
                            where user_id = v_uid and amount < 0
                              and (created_at at time zone 'utc')::date = d::date), 0)) order by d)
        from generate_series(private.today() - 6, private.today(), interval '1 day') d),
    'favorite_genre', (select g.genre from public.player_game_stats s join public.games g on g.id = s.game_id
                        where s.user_id = v_uid group by g.genre order by sum(s.plays) desc limit 1),
    'total_plays', (select coalesce(sum(plays), 0) from public.player_game_stats where user_id = v_uid),
    'play_time_ms', (select coalesce(sum(least(duration_ms, 3600000)), 0) from public.game_sessions
                      where user_id = v_uid and status = 'completed'),
    'items_owned', (select count(*) from public.inventory_items where user_id = v_uid),
    'collection_value', (select coalesce(sum(c.price), 0) from public.inventory_items i
                          join public.catalog_items c on c.id = i.item_id where i.user_id = v_uid),
    'achievements_unlocked', (select count(*) from public.user_achievements where user_id = v_uid),
    'achievements_total', (select count(*) from public.achievements),
    'member_days', (select (private.today() - (created_at at time zone 'utc')::date) from public.profiles where id = v_uid)
  );
end $$;
