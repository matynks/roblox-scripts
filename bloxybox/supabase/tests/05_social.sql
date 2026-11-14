-- Follows, friends, profile summaries, search and visits.

do $$
declare
  v_ann uuid := tests.create_user('ann', 'Ann');
  v_ben uuid := tests.create_user('ben', 'Ben');
  v_cat uuid := tests.create_user('cat_100', 'Cat');
  v_summary jsonb;
  v_list jsonb;
begin
  perform tests.authenticate(v_ann);
  perform tests.assert_throws(format('select public.follow_user(%L)', v_ann), 'CANNOT_FOLLOW_SELF', 'no self follow');
  perform tests.assert_throws(format('select public.follow_user(%L)', gen_random_uuid()), 'USER_NOT_FOUND', 'unknown user');

  perform tests.assert_eq((public.follow_user(v_ben) ->> 'is_friend')::boolean, false, 'one-way follow is not a friendship');
  perform public.follow_user(v_ben); -- idempotent
  perform public.follow_user(v_cat);

  perform tests.authenticate(v_ben);
  perform tests.assert_eq((public.follow_user(v_ann) ->> 'is_friend')::boolean, true, 'mutual follow is a friendship');

  v_summary := public.get_profile_summary(v_ann);
  perform tests.assert_eq((v_summary -> 'social' ->> 'followers_real')::integer, 1, 'ann has one real follower');
  perform tests.assert_eq((v_summary -> 'social' ->> 'following')::integer, 2, 'ann follows two');
  perform tests.assert_eq((v_summary -> 'social' ->> 'friends')::integer, 1, 'ann has one friend');
  perform tests.assert_eq((v_summary -> 'relationship' ->> 'is_following')::boolean, true, 'ben follows ann');
  perform tests.assert_eq((v_summary -> 'relationship' ->> 'follows_you')::boolean, true, 'ann follows ben');
  perform tests.assert_eq((v_summary -> 'relationship' ->> 'is_self')::boolean, false, 'not self');
  perform tests.assert_eq(jsonb_array_length(v_summary -> 'avatar' -> 'equipped'), 3, 'avatar equipped items included');

  -- Simulated followers are reported separately and added to the total.
  perform tests.as_owner();
  update public.profile_stats set simulated_followers = 1200 where user_id = v_ann;
  perform tests.authenticate(v_ben);
  v_summary := public.get_profile_summary(v_ann);
  perform tests.assert_eq((v_summary -> 'social' ->> 'followers_simulated')::integer, 1200, 'simulated followers reported');
  perform tests.assert_eq((v_summary -> 'social' ->> 'followers_total')::integer, 1201, 'total = real + simulated');

  v_list := public.list_connections(v_ann, 'following');
  perform tests.assert_eq(jsonb_array_length(v_list), 2, 'following list');
  v_list := public.list_connections(v_ann, 'friends');
  perform tests.assert_eq(jsonb_array_length(v_list), 1, 'friends list');
  perform tests.assert_eq(v_list -> 0 ->> 'username', 'ben', 'friend is ben');
  v_list := public.list_connections(v_ann, 'followers');
  perform tests.assert_eq(v_list -> 0 ->> 'username', 'ben', 'follower is ben');
  perform tests.assert_throws(format($q$select public.list_connections(%L, 'enemies')$q$, v_ann), 'INVALID_KIND', 'bad kind');

  -- Unfollow ends the friendship
  perform public.unfollow_user(v_ann);
  perform tests.assert_eq((public.get_profile_summary(v_ann) -> 'social' ->> 'friends')::integer, 0, 'friendship ended');

  -- Search: literal matching (wildcards are escaped), excludes self
  v_list := public.search_players('an');
  perform tests.assert_eq(jsonb_array_length(v_list), 1, 'search finds ann');
  v_list := public.search_players('%');
  perform tests.assert_eq(jsonb_array_length(v_list), 0, 'percent sign is not a wildcard');
  v_list := public.search_players('t_1');
  perform tests.assert_eq(v_list -> 0 ->> 'username', 'cat_100', 'underscore matched literally');
  v_list := public.search_players('ben');
  perform tests.assert_eq(jsonb_array_length(v_list), 0, 'search excludes the caller');
  perform tests.assert_eq(jsonb_array_length(public.search_players('a')), 0, 'one-character queries return nothing');

  -- Profile visits count once per visitor per day, never for yourself
  perform tests.assert_eq((public.record_profile_visit(v_ann) ->> 'counted')::boolean, true, 'first visit counted');
  perform tests.assert_eq((public.record_profile_visit(v_ann) ->> 'counted')::boolean, false, 'repeat visit not counted');
  perform tests.assert_eq((public.record_profile_visit(v_ben) ->> 'counted')::boolean, false, 'self visit not counted');
  perform tests.assert_eq((public.get_profile_summary(v_ann) -> 'stats' ->> 'profile_visits')::integer, 1, 'visit stored');
end $$;
