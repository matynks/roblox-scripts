-- BloxyBox social graph and profile read helpers.
-- Friends are mutual follows. Follower totals shown in the app are
-- real followers + simulated followers, always displayed with a breakdown.

create function public._avatar_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'skin_color', a.skin_color,
    'head_shape', a.head_shape,
    'equipped', coalesce((
      select jsonb_agg(jsonb_build_object(
               'item_id', i.id, 'slot', i.slot, 'asset_key', i.asset_key,
               'primary_color', i.primary_color, 'secondary_color', i.secondary_color)
             order by i.slot)
      from public.inventory inv
      join public.items i on i.id = inv.item_id
      where inv.user_id = p_user_id and inv.equipped
    ), '[]'::jsonb)
  )
  from public.avatars a
  where a.user_id = p_user_id;
$$;

create function public._player_card(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'accent', p.accent,
    'level', s.level,
    'avatar', public._avatar_json(p.id)
  )
  from public.profiles p
  left join public.profile_stats s on s.user_id = p.id
  where p.id = p_user_id;
$$;

create function public.follow_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
begin
  if p_user_id = v_uid then
    raise exception 'CANNOT_FOLLOW_SELF' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.follows (follower_id, followee_id)
  values (v_uid, p_user_id)
  on conflict do nothing;

  return jsonb_build_object(
    'following', true,
    'is_friend', exists (select 1 from public.follows where follower_id = p_user_id and followee_id = v_uid)
  );
end;
$$;

create function public.unfollow_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
begin
  delete from public.follows where follower_id = v_uid and followee_id = p_user_id;
  return jsonb_build_object('following', false, 'is_friend', false);
end;
$$;

create function public.get_profile_summary(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_profile public.profiles;
  v_stats public.profile_stats;
  v_followers bigint;
  v_following bigint;
  v_friends bigint;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_stats from public.profile_stats where user_id = p_user_id;

  select count(*) into v_followers from public.follows where followee_id = p_user_id;
  select count(*) into v_following from public.follows where follower_id = p_user_id;
  select count(*) into v_friends
  from public.follows a
  join public.follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id
  where a.follower_id = p_user_id;

  return jsonb_build_object(
    'id', v_profile.id,
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'bio', v_profile.bio,
    'accent', v_profile.accent,
    'created_at', v_profile.created_at,
    'avatar', public._avatar_json(p_user_id),
    'stats', jsonb_build_object(
      'level', v_stats.level,
      'xp', v_stats.xp,
      'xp_level_start', public.xp_for_level(v_stats.level),
      'xp_next_level', public.xp_for_level(v_stats.level + 1),
      'games_played', v_stats.games_played,
      'profile_visits', v_stats.profile_visits,
      'daily_streak', v_stats.daily_streak,
      'items_owned', (select count(*) from public.inventory where user_id = p_user_id),
      'experiences_played', (select count(*) from public.game_progress where user_id = p_user_id and total_plays > 0)
    ),
    'social', jsonb_build_object(
      'followers_real', v_followers,
      'followers_simulated', v_stats.simulated_followers,
      'followers_total', v_followers + v_stats.simulated_followers,
      'following', v_following,
      'friends', v_friends
    ),
    'relationship', jsonb_build_object(
      'is_self', p_user_id = v_uid,
      'is_following', exists (select 1 from public.follows where follower_id = v_uid and followee_id = p_user_id),
      'follows_you', exists (select 1 from public.follows where follower_id = p_user_id and followee_id = v_uid)
    )
  );
end;
$$;

create function public.list_connections(p_user_id uuid, p_kind text, p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_ids uuid[];
begin
  perform public._require_user();

  if p_kind = 'followers' then
    select array_agg(follower_id order by created_at desc) into v_ids
    from (select follower_id, created_at from public.follows where followee_id = p_user_id
          order by created_at desc limit v_limit offset v_offset) s;
  elsif p_kind = 'following' then
    select array_agg(followee_id order by created_at desc) into v_ids
    from (select followee_id, created_at from public.follows where follower_id = p_user_id
          order by created_at desc limit v_limit offset v_offset) s;
  elsif p_kind = 'friends' then
    select array_agg(friend_id order by since desc) into v_ids
    from (select a.followee_id as friend_id, greatest(a.created_at, b.created_at) as since
          from public.follows a
          join public.follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id
          where a.follower_id = p_user_id
          order by since desc limit v_limit offset v_offset) s;
  else
    raise exception 'INVALID_KIND' using errcode = '22023';
  end if;

  return coalesce((
    select jsonb_agg(public._player_card(id) order by ord)
    from unnest(v_ids) with ordinality as u(id, ord)
  ), '[]'::jsonb);
end;
$$;

create function public.search_players(p_query text, p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
begin
  if char_length(v_query) < 2 then
    return '[]'::jsonb;
  end if;
  -- Escape LIKE wildcards so the query is matched literally.
  v_pattern := '%' || replace(replace(replace(left(v_query, 30), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return coalesce((
    select jsonb_agg(public._player_card(p.id) order by (p.username = lower(v_query)) desc, p.username)
    from (
      select id, username
      from public.profiles
      where id <> v_uid and (username ilike v_pattern or display_name ilike v_pattern)
      order by username
      limit least(greatest(coalesce(p_limit, 30), 1), 50)
    ) p
  ), '[]'::jsonb);
end;
$$;

create function public.record_profile_visit(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_counted boolean := false;
begin
  if p_user_id <> v_uid and exists (select 1 from public.profiles where id = p_user_id) then
    insert into public.profile_visits (visitor_id, visited_id, visit_day)
    values (v_uid, p_user_id, (now() at time zone 'utc')::date)
    on conflict do nothing;

    if found then
      update public.profile_stats set profile_visits = profile_visits + 1, updated_at = now()
      where user_id = p_user_id;
      v_counted := true;
    end if;
  end if;

  return jsonb_build_object('counted', v_counted);
end;
$$;

revoke all on function public._avatar_json(uuid) from public, anon, authenticated;
revoke all on function public._player_card(uuid) from public, anon, authenticated;
revoke all on function public.follow_user(uuid) from public, anon, authenticated;
revoke all on function public.unfollow_user(uuid) from public, anon, authenticated;
revoke all on function public.get_profile_summary(uuid) from public, anon, authenticated;
revoke all on function public.list_connections(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.search_players(text, integer) from public, anon, authenticated;
revoke all on function public.record_profile_visit(uuid) from public, anon, authenticated;

grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.get_profile_summary(uuid) to authenticated;
grant execute on function public.list_connections(uuid, text, integer, integer) to authenticated;
grant execute on function public.search_players(text, integer) to authenticated;
grant execute on function public.record_profile_visit(uuid) to authenticated;
