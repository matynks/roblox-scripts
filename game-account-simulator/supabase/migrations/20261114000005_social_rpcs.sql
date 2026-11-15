-- Blockora — social graph RPCs

create function private.require_target(p_target uuid) returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare t public.profiles;
begin
  select * into t from public.profiles where id = p_target;
  if not found then perform private.fail('USER_NOT_FOUND', 'That player does not exist.'); end if;
  return t;
end $$;

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------
create function private.make_friends(a uuid, b uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.friendships (user_id, friend_id) values (a, b), (b, a) on conflict do nothing;
  perform private.log_activity(a, 'friend', jsonb_build_object('user_id', b));
  perform private.log_activity(b, 'friend', jsonb_build_object('user_id', a));
end $$;

create function public.send_friend_request(p_target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  t public.profiles;
  v_reverse uuid;
  v_req uuid;
  v_me record;
begin
  if p_target = v_uid then perform private.fail('INVALID_TARGET', 'You cannot friend yourself.'); end if;
  t := private.require_target(p_target);
  perform private.rate_limit('friend_request', 30, 3600);
  if private.is_blocked_between(v_uid, p_target) then
    perform private.fail('USER_UNAVAILABLE', 'You cannot interact with this player.');
  end if;
  if private.are_friends(v_uid, p_target) then perform private.fail('ALREADY_FRIENDS', 'You are already friends.'); end if;
  if (select count(*) from public.friendships where user_id = v_uid) >= 1000 then
    perform private.fail('FRIEND_LIMIT', 'You have reached the 1,000 friend limit.');
  end if;
  if (select count(*) from public.friendships where user_id = p_target) >= 1000 then
    perform private.fail('FRIEND_LIMIT', 'That player has reached the friend limit.');
  end if;
  select username, display_name into v_me from public.profiles where id = v_uid;

  -- If they already asked us, sending a request accepts theirs.
  select id into v_reverse from public.friend_requests
   where sender_id = p_target and receiver_id = v_uid and status = 'pending' for update;
  if v_reverse is not null then
    update public.friend_requests set status = 'accepted', responded_at = now() where id = v_reverse;
    perform private.make_friends(v_uid, p_target);
    perform private.notify(p_target, 'friend_accepted', v_me.display_name || ' accepted your friend request',
      '@' || v_me.username, jsonb_build_object('user_id', v_uid, 'username', v_me.username));
    perform private.bump_quests(v_uid, 'social_actions', 1);
    return jsonb_build_object('status', 'friends', 'unlocked', private.evaluate_achievements(v_uid));
  end if;

  if exists (select 1 from public.friend_requests where sender_id = v_uid and receiver_id = p_target and status = 'pending') then
    perform private.fail('REQUEST_PENDING', 'Your friend request is already pending.');
  end if;
  if not t.is_npc and not coalesce((select allow_friend_requests from public.user_settings where user_id = p_target), true) then
    perform private.fail('NOT_ACCEPTING', 'This player is not accepting friend requests.');
  end if;

  if t.is_npc then
    -- Simulated players accept immediately.
    insert into public.friend_requests (sender_id, receiver_id, status, responded_at)
    values (v_uid, p_target, 'accepted', now()) returning id into v_req;
    perform private.make_friends(v_uid, p_target);
    perform private.notify(v_uid, 'friend_accepted', t.display_name || ' accepted your friend request',
      '@' || t.username, jsonb_build_object('user_id', p_target, 'username', t.username));
    perform private.bump_quests(v_uid, 'social_actions', 1);
    return jsonb_build_object('status', 'friends', 'request_id', v_req, 'unlocked', private.evaluate_achievements(v_uid));
  end if;

  insert into public.friend_requests (sender_id, receiver_id) values (v_uid, p_target) returning id into v_req;
  perform private.notify(p_target, 'friend_request', v_me.display_name || ' sent you a friend request',
    '@' || v_me.username, jsonb_build_object('user_id', v_uid, 'username', v_me.username, 'request_id', v_req));
  perform private.bump_quests(v_uid, 'social_actions', 1);
  return jsonb_build_object('status', 'pending', 'request_id', v_req, 'unlocked', '[]'::jsonb);
end $$;

create function public.respond_friend_request(p_request_id uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  r record;
  v_me record;
begin
  select * into r from public.friend_requests where id = p_request_id and receiver_id = v_uid for update;
  if not found or r.status <> 'pending' then
    perform private.fail('REQUEST_NOT_FOUND', 'This friend request is no longer available.');
  end if;
  if not p_accept then
    update public.friend_requests set status = 'declined', responded_at = now() where id = p_request_id;
    return jsonb_build_object('status', 'declined', 'unlocked', '[]'::jsonb);
  end if;
  if private.is_blocked_between(v_uid, r.sender_id) then
    perform private.fail('USER_UNAVAILABLE', 'You cannot interact with this player.');
  end if;
  if (select count(*) from public.friendships where user_id = v_uid) >= 1000
     or (select count(*) from public.friendships where user_id = r.sender_id) >= 1000 then
    perform private.fail('FRIEND_LIMIT', 'The 1,000 friend limit has been reached.');
  end if;
  update public.friend_requests set status = 'accepted', responded_at = now() where id = p_request_id;
  perform private.make_friends(v_uid, r.sender_id);
  select username, display_name into v_me from public.profiles where id = v_uid;
  perform private.notify(r.sender_id, 'friend_accepted', v_me.display_name || ' accepted your friend request',
    '@' || v_me.username, jsonb_build_object('user_id', v_uid, 'username', v_me.username));
  perform private.evaluate_achievements(r.sender_id);
  return jsonb_build_object('status', 'friends', 'unlocked', private.evaluate_achievements(v_uid));
end $$;

create function public.cancel_friend_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  update public.friend_requests set status = 'cancelled', responded_at = now()
   where id = p_request_id and sender_id = v_uid and status = 'pending';
  if not found then perform private.fail('REQUEST_NOT_FOUND', 'This friend request is no longer pending.'); end if;
end $$;

create function public.remove_friend(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  delete from public.friendships
   where (user_id = v_uid and friend_id = p_target) or (user_id = p_target and friend_id = v_uid);
  if not found then perform private.fail('NOT_FRIENDS', 'You are not friends with this player.'); end if;
end $$;

-- ---------------------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------------------
create function public.follow_user(p_target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  t public.profiles;
  v_me record;
  v_followed_back boolean := false;
begin
  if p_target = v_uid then perform private.fail('INVALID_TARGET', 'You cannot follow yourself.'); end if;
  t := private.require_target(p_target);
  perform private.rate_limit('follow', 60, 3600);
  if private.is_blocked_between(v_uid, p_target) then
    perform private.fail('USER_UNAVAILABLE', 'You cannot interact with this player.');
  end if;
  insert into public.follows (follower_id, followee_id) values (v_uid, p_target) on conflict do nothing;
  if not found then return jsonb_build_object('status', 'following', 'followed_back', false, 'unlocked', '[]'::jsonb); end if;

  select username, display_name into v_me from public.profiles where id = v_uid;
  if t.is_npc then
    -- Simulated players follow back about half of the time (deterministically).
    if abs(hashtext(v_uid::text || p_target::text)) % 2 = 0 then
      insert into public.follows (follower_id, followee_id) values (p_target, v_uid) on conflict do nothing;
      if found then
        v_followed_back := true;
        perform private.notify(v_uid, 'new_follower', t.display_name || ' followed you back',
          '@' || t.username, jsonb_build_object('user_id', p_target, 'username', t.username));
      end if;
    end if;
  else
    perform private.notify(p_target, 'new_follower', v_me.display_name || ' started following you',
      '@' || v_me.username, jsonb_build_object('user_id', v_uid, 'username', v_me.username));
    perform private.evaluate_achievements(p_target);
  end if;
  perform private.bump_quests(v_uid, 'social_actions', 1);
  return jsonb_build_object('status', 'following', 'followed_back', v_followed_back,
                            'unlocked', private.evaluate_achievements(v_uid));
end $$;

create function public.unfollow_user(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  delete from public.follows where follower_id = v_uid and followee_id = p_target;
end $$;

-- ---------------------------------------------------------------------------
-- Blocking & reporting
-- ---------------------------------------------------------------------------
create function public.block_user(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if p_target = v_uid then perform private.fail('INVALID_TARGET', 'You cannot block yourself.'); end if;
  perform private.require_target(p_target);
  if (select count(*) from public.blocks where blocker_id = v_uid) >= 1000 then
    perform private.fail('BLOCK_LIMIT', 'You can block up to 1,000 players.');
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_target) on conflict do nothing;
  delete from public.friendships
   where (user_id = v_uid and friend_id = p_target) or (user_id = p_target and friend_id = v_uid);
  delete from public.follows
   where (follower_id = v_uid and followee_id = p_target) or (follower_id = p_target and followee_id = v_uid);
  update public.friend_requests set status = 'cancelled', responded_at = now()
   where status = 'pending'
     and ((sender_id = v_uid and receiver_id = p_target) or (sender_id = p_target and receiver_id = v_uid));
end $$;

create function public.unblock_user(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  delete from public.blocks where blocker_id = v_uid and blocked_id = p_target;
end $$;

create function public.report_user(p_target uuid, p_reason public.report_reason, p_details text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if p_target = v_uid then perform private.fail('INVALID_TARGET', 'You cannot report yourself.'); end if;
  perform private.require_target(p_target);
  perform private.rate_limit('report', 10, 86400);
  insert into public.reports (reporter_id, target_id, reason, details)
  values (v_uid, p_target, p_reason, left(coalesce(p_details, ''), 500));
end $$;

-- ---------------------------------------------------------------------------
-- Profiles, lists, search, feed
-- ---------------------------------------------------------------------------
create function public.get_profile(p_username text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  p record;
  v_inv boolean;
  v_friends boolean;
  v_activity boolean;
begin
  select * into p from public.profiles where lower(username) = lower(btrim(p_username));
  if not found then perform private.fail('USER_NOT_FOUND', 'That player does not exist.'); end if;
  if p.id <> v_uid and exists (select 1 from public.blocks where blocker_id = p.id and blocked_id = v_uid) then
    perform private.fail('USER_UNAVAILABLE', 'This profile is unavailable.');
  end if;
  v_inv := private.can_view(p.id, 'inventory');
  v_friends := private.can_view(p.id, 'friends');
  v_activity := private.can_view(p.id, 'activity');
  return jsonb_build_object(
    'card', private.player_card(p.id),
    'profile', jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name,
       'bio', p.bio, 'status_text', p.status_text, 'profile_theme', p.profile_theme, 'level', p.level,
       'xp', p.xp, 'reputation', p.reputation, 'is_npc', p.is_npc, 'created_at', p.created_at,
       'account_status', p.account_status),
    'counts', jsonb_build_object(
       'friends', (select count(*) from public.friendships where user_id = p.id),
       'followers', (select count(*) from public.follows where followee_id = p.id),
       'following', (select count(*) from public.follows where follower_id = p.id),
       'items', case when v_inv then (select count(*) from public.inventory_items where user_id = p.id) end,
       'games_played', (select coalesce(sum(plays), 0) from public.player_game_stats where user_id = p.id),
       'achievements', (select count(*) from public.user_achievements where user_id = p.id)),
    'relationship', jsonb_build_object(
       'is_self', p.id = v_uid,
       'is_friend', private.are_friends(v_uid, p.id),
       'is_following', exists (select 1 from public.follows where follower_id = v_uid and followee_id = p.id),
       'follows_you', exists (select 1 from public.follows where follower_id = p.id and followee_id = v_uid),
       'outgoing_request_id', (select id from public.friend_requests
                                where sender_id = v_uid and receiver_id = p.id and status = 'pending'),
       'incoming_request_id', (select id from public.friend_requests
                                where sender_id = p.id and receiver_id = v_uid and status = 'pending'),
       'is_blocked', exists (select 1 from public.blocks where blocker_id = v_uid and blocked_id = p.id)),
    'visibility', jsonb_build_object('inventory', v_inv, 'friends', v_friends, 'activity', v_activity),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('key', a.key, 'name', a.name, 'icon', a.icon,
                                                           'unlocked_at', ua.unlocked_at) order by ua.unlocked_at desc)
                          from public.user_achievements ua join public.achievements a on a.key = ua.achievement_key
                         where ua.user_id = p.id), '[]'::jsonb),
    'top_games', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('game_id', s.game_id, 'title', g.title, 'plays', s.plays, 'best_score', s.best_score,
                                  'thumbnail', g.thumbnail) as x
          from public.player_game_stats s join public.games g on g.id = s.game_id
         where s.user_id = p.id order by s.plays desc, s.best_score desc limit 6) t), '[]'::jsonb),
    'favorite_games', coalesce((select jsonb_agg(gf.game_id) from public.game_favorites gf where gf.user_id = p.id), '[]'::jsonb),
    'showcase', case when v_inv then coalesce((select jsonb_agg(t.item_id order by t.price desc) from (
        select distinct i.item_id, c.price from public.inventory_items i
          join public.catalog_items c on c.id = i.item_id
         where i.user_id = p.id
         order by c.price desc limit 12) t), '[]'::jsonb) end,
    'public_outfits', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'skin_tone', o.skin_tone,
                                  'body_type', o.body_type, 'height_scale', o.height_scale, 'head_scale', o.head_scale,
                                  'equipped', o.equipped) order by o.updated_at desc)
                                 from public.outfits o where o.user_id = p.id and o.is_public), '[]'::jsonb)
  );
end $$;

-- p_kind: 'friends' | 'followers' | 'following'
create function public.list_connections(p_user uuid, p_kind text, p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if not private.can_view(p_user, 'friends') then
    perform private.fail('PRIVATE_LIST', 'This player keeps their connections private.');
  end if;
  return coalesce((
    select jsonb_agg(private.player_card(x.other) || jsonb_build_object('since', x.since,
              'is_friend', private.are_friends(v_uid, x.other),
              'is_following', exists (select 1 from public.follows f where f.follower_id = v_uid and f.followee_id = x.other))
            order by x.since desc)
      from (
        select other, since from (
          select friend_id as other, created_at as since from public.friendships where user_id = p_user and p_kind = 'friends'
          union all
          select follower_id, created_at from public.follows where followee_id = p_user and p_kind = 'followers'
          union all
          select followee_id, created_at from public.follows where follower_id = p_user and p_kind = 'following'
        ) u
        where not private.is_blocked_between(v_uid, other)
        order by since desc limit v_limit offset v_offset
      ) x), '[]'::jsonb);
end $$;

create function public.list_friend_requests() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  return jsonb_build_object(
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at,
                                                             'user', private.player_card(r.sender_id)) order by r.created_at desc)
                            from public.friend_requests r where r.receiver_id = v_uid and r.status = 'pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at,
                                                             'user', private.player_card(r.receiver_id)) order by r.created_at desc)
                            from public.friend_requests r where r.sender_id = v_uid and r.status = 'pending'), '[]'::jsonb));
end $$;

create function public.list_blocked_users() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  return coalesce((select jsonb_agg(private.player_card(b.blocked_id) || jsonb_build_object('since', b.created_at)
                                    order by b.created_at desc)
                     from public.blocks b where b.blocker_id = v_uid), '[]'::jsonb);
end $$;

create function public.search_users(p_query text, p_limit int default 20, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_pattern text;
begin
  if char_length(v_q) < 2 then return '[]'::jsonb; end if;
  v_pattern := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(private.player_card(p.id) || jsonb_build_object(
             'is_friend', private.are_friends(v_uid, p.id),
             'followers', (select count(*) from public.follows f where f.followee_id = p.id)) order by p.rank, p.level desc)
      from (
        select id, level,
               case when lower(username) = v_q then 0 when lower(username) like v_q || '%' then 1 else 2 end as rank
          from public.profiles
         where (lower(username) like v_pattern or lower(display_name) like v_pattern)
           and account_status = 'active'
           and not exists (select 1 from public.blocks b where b.blocker_id = profiles.id and b.blocked_id = v_uid)
         order by rank, level desc
         limit least(greatest(coalesce(p_limit, 20), 1), 50) offset greatest(coalesce(p_offset, 0), 0)
      ) p), '[]'::jsonb);
end $$;

-- Friends + people you follow + you, newest first, privacy-filtered.
create function public.get_feed(p_limit int default 30, p_before timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'data', e.data, 'created_at', e.created_at,
                                        'user', private.player_card(e.user_id)) order by e.created_at desc)
      from (
        select ae.* from public.activity_events ae
         where (ae.user_id = v_uid
                or ae.user_id in (select friend_id from public.friendships where user_id = v_uid)
                or ae.user_id in (select followee_id from public.follows where follower_id = v_uid))
           and ae.created_at < coalesce(p_before, now() + interval '1 minute')
           and ae.created_at > now() - interval '30 days'
           and private.can_view(ae.user_id, 'activity')
         order by ae.created_at desc
         limit least(greatest(coalesce(p_limit, 30), 1), 100)
      ) e), '[]'::jsonb);
end $$;

create function public.get_user_activity(p_user uuid, p_limit int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if not private.can_view(p_user, 'activity') then
    perform private.fail('PRIVATE_LIST', 'This player keeps their activity private.');
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'data', e.data,
                                                      'created_at', e.created_at) order by e.created_at desc)
                     from (select * from public.activity_events where user_id = p_user
                            order by created_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) e), '[]'::jsonb);
end $$;

create function public.mark_notifications_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_count int;
begin
  update public.notifications set read_at = now()
   where user_id = v_uid and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;
