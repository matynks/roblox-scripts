-- Blockora — games, sessions, passes, discovery

-- Simulated concurrent players: a daily wave around each game's base CCU, plus
-- real players who started a session in the last 10 minutes.
create function private.game_playing_now(p_game public.games) returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, round(p_game.base_ccu * (0.75 + 0.25 * sin(2 * pi() *
           ((extract(hour from now() at time zone 'utc') + extract(minute from now() at time zone 'utc') / 60.0
             + abs(hashtext(p_game.id)) % 24) / 24.0))))::int
         + (select count(*)::int from public.game_sessions s
             where s.game_id = p_game.id and s.status = 'active' and s.started_at > now() - interval '10 minutes'));
$$;

-- Time-decayed trending score: seeded baseline + recent plays (36h half-life-ish).
create function private.game_trend_score(p_game public.games) returns numeric
language sql stable security definer set search_path = '' as $$
  select p_game.trend_seed + coalesce((
    select sum(exp(-extract(epoch from now() - s.started_at) / 3600.0 / 36.0))
      from public.game_sessions s
     where s.game_id = p_game.id and s.status = 'completed' and s.started_at > now() - interval '7 days'), 0);
$$;

create function private.game_card(p_game public.games) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p_game.id, 'title', p_game.title, 'tagline', p_game.tagline, 'genre', p_game.genre,
    'engine', p_game.engine, 'thumbnail', p_game.thumbnail, 'creator_name', p_game.creator_name,
    'visits', p_game.visits, 'likes', p_game.likes, 'dislikes', p_game.dislikes, 'favorites', p_game.favorites,
    'rating', case when p_game.likes + p_game.dislikes = 0 then null
                   else round(100.0 * p_game.likes / (p_game.likes + p_game.dislikes)) end,
    'playing_now', private.game_playing_now(p_game),
    'featured', p_game.featured, 'created_at', p_game.created_at);
$$;

create function public.get_discover() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_total numeric;
begin
  select coalesce(sum(plays), 0) into v_total from public.player_game_stats where user_id = v_uid;
  return jsonb_build_object(
    'featured', coalesce((select jsonb_agg(private.game_card(g) order by g.sort_order)
                            from public.games g where g.featured), '[]'::jsonb),
    'recommended', coalesce((select jsonb_agg(x.card order by x.score desc) from (
        select private.game_card(g) as card,
               coalesce((select sum(s.plays) from public.player_game_stats s join public.games g2 on g2.id = s.game_id
                          where s.user_id = v_uid and g2.genre = g.genre), 0) * 2.0 / greatest(v_total, 1)
               + g.likes::numeric / greatest(g.likes + g.dislikes, 1)
               + case when exists (select 1 from public.player_game_stats s where s.user_id = v_uid and s.game_id = g.id)
                      then -0.4 else 0.25 end
               + (abs(hashtext(g.id || v_uid::text || private.today()::text)) % 100) / 1000.0 as score
          from public.games g limit 50) x), '[]'::jsonb),
    'trending', coalesce((select jsonb_agg(x.card order by x.score desc) from (
        select private.game_card(g) || jsonb_build_object('trend_score', round(private.game_trend_score(g), 2)) as card,
               private.game_trend_score(g) as score from public.games g) x), '[]'::jsonb),
    'popular', coalesce((select jsonb_agg(private.game_card(g) order by g.visits desc) from public.games g), '[]'::jsonb),
    'top_rated', coalesce((select jsonb_agg(private.game_card(g)
                                            order by g.likes::numeric / greatest(g.likes + g.dislikes, 1) desc)
                             from public.games g), '[]'::jsonb),
    'new', coalesce((select jsonb_agg(private.game_card(g) order by g.created_at desc) from public.games g), '[]'::jsonb),
    'continue_playing', coalesce((select jsonb_agg(private.game_card(g) || jsonb_build_object('best_score', s.best_score)
                                                   order by s.last_played_at desc)
                                    from public.player_game_stats s join public.games g on g.id = s.game_id
                                   where s.user_id = v_uid), '[]'::jsonb),
    'friends_playing', coalesce((select jsonb_agg(x.card order by x.last desc) from (
        select private.game_card(g) || jsonb_build_object('friends', count(*)) as card, max(s.last_played_at) as last
          from public.player_game_stats s
          join public.friendships f on f.friend_id = s.user_id and f.user_id = v_uid
          join public.games g on g.id = s.game_id
         where s.last_played_at > now() - interval '14 days'
         group by g.id) x), '[]'::jsonb),
    'genres', coalesce((select jsonb_agg(distinct genre) from public.games), '[]'::jsonb)
  );
end $$;

create function public.get_game(p_game_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  g public.games;
begin
  select * into g from public.games where id = p_game_id;
  if not found then perform private.fail('GAME_NOT_FOUND', 'This game does not exist.'); end if;
  return private.game_card(g) || jsonb_build_object(
    'description', g.description, 'config', g.config, 'updated_at', g.updated_at,
    'score_per_orb', g.score_per_orb, 'max_orbs_per_session', g.max_orbs_per_session, 'daily_orb_cap', g.daily_orb_cap,
    'orbs_today', (select coalesce(sum(orbs_awarded), 0) from public.game_sessions
                    where user_id = v_uid and game_id = g.id and status = 'completed'
                      and started_at >= (private.today()::timestamp at time zone 'utc')),
    'passes', coalesce((select jsonb_agg(jsonb_build_object('id', gp.id, 'name', gp.name, 'description', gp.description,
                                   'price', gp.price, 'perk_type', gp.perk_type, 'perk_value', gp.perk_value,
                                   'icon', gp.icon, 'sales_count', gp.sales_count,
                                   'owned', exists (select 1 from public.game_pass_ownership o
                                                     where o.user_id = v_uid and o.pass_id = gp.id))
                                 order by gp.price)
                          from public.game_passes gp where gp.game_id = g.id), '[]'::jsonb),
    'my_stats', (select jsonb_build_object('plays', plays, 'best_score', best_score, 'total_orbs', total_orbs,
                                           'last_played_at', last_played_at)
                   from public.player_game_stats where user_id = v_uid and game_id = g.id),
    'my_vote', (select vote from public.game_votes where user_id = v_uid and game_id = g.id),
    'is_favorite', exists (select 1 from public.game_favorites where user_id = v_uid and game_id = g.id));
end $$;

create function public.get_leaderboard(p_game_id text, p_limit int default 20) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  return jsonb_build_object(
    'entries', coalesce((select jsonb_agg(jsonb_build_object('rank', r.rnk, 'best_score', r.best_score,
                                                             'user', private.player_card(r.user_id),
                                                             'is_me', r.user_id = v_uid) order by r.rnk)
        from (select s.user_id, s.best_score, rank() over (order by s.best_score desc) as rnk
                from public.player_game_stats s join public.profiles p on p.id = s.user_id
               where s.game_id = p_game_id and s.best_score > 0 and p.account_status = 'active'
               order by s.best_score desc limit least(greatest(coalesce(p_limit, 20), 1), 100)) r), '[]'::jsonb),
    'me', (select jsonb_build_object('best_score', s.best_score,
              'rank', 1 + (select count(*) from public.player_game_stats s2 join public.profiles p2 on p2.id = s2.user_id
                            where s2.game_id = p_game_id and s2.best_score > s.best_score and p2.account_status = 'active'))
             from public.player_game_stats s where s.user_id = v_uid and s.game_id = p_game_id));
end $$;

create function public.rate_game(p_game_id text, p_vote int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_old smallint;
  g public.games;
begin
  perform private.rate_limit('rate_game', 60, 3600);
  if p_vote is not null and p_vote not in (-1, 1) then perform private.fail('INVALID_VOTE', 'Invalid vote.'); end if;
  if not exists (select 1 from public.player_game_stats where user_id = v_uid and game_id = p_game_id and plays > 0) then
    perform private.fail('PLAY_FIRST', 'Play this game before rating it.');
  end if;
  select vote into v_old from public.game_votes where user_id = v_uid and game_id = p_game_id for update;
  if p_vote is null then
    delete from public.game_votes where user_id = v_uid and game_id = p_game_id;
  else
    insert into public.game_votes (user_id, game_id, vote) values (v_uid, p_game_id, p_vote)
    on conflict (user_id, game_id) do update set vote = excluded.vote, created_at = now();
  end if;
  update public.games
     set likes = greatest(0, likes - case when v_old = 1 then 1 else 0 end + case when p_vote = 1 then 1 else 0 end),
         dislikes = greatest(0, dislikes - case when v_old = -1 then 1 else 0 end + case when p_vote = -1 then 1 else 0 end)
   where id = p_game_id returning * into g;
  return jsonb_build_object('my_vote', p_vote, 'likes', g.likes, 'dislikes', g.dislikes);
end $$;

create function public.toggle_game_favorite(p_game_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_fav boolean;
  v_count int;
begin
  perform private.rate_limit('favorite', 120, 3600);
  if not exists (select 1 from public.games where id = p_game_id) then
    perform private.fail('GAME_NOT_FOUND', 'This game does not exist.');
  end if;
  delete from public.game_favorites where user_id = v_uid and game_id = p_game_id;
  if found then
    v_fav := false;
    update public.games set favorites = greatest(favorites - 1, 0) where id = p_game_id returning favorites into v_count;
  else
    insert into public.game_favorites (user_id, game_id) values (v_uid, p_game_id);
    v_fav := true;
    update public.games set favorites = favorites + 1 where id = p_game_id returning favorites into v_count;
  end if;
  return jsonb_build_object('favorited', v_fav, 'favorites', v_count);
end $$;

create function public.purchase_game_pass(p_pass_id text, p_expected_price int, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  gp record;
  v_idem text;
  v_unlocked jsonb;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 80 then
    perform private.fail('INVALID_REQUEST', 'Missing purchase token.');
  end if;
  v_idem := 'pass:' || p_idempotency_key;
  perform private.rate_limit('purchase', 60, 3600);
  perform 1 from public.wallets where user_id = v_uid for update;
  if exists (select 1 from public.currency_transactions where user_id = v_uid and idempotency_key = v_idem) then
    return jsonb_build_object('status', 'duplicate', 'pass_id', p_pass_id, 'unlocked', '[]'::jsonb) || private.player_state(v_uid);
  end if;
  select gp2.*, g.title as game_title into gp
    from public.game_passes gp2 join public.games g on g.id = gp2.game_id where gp2.id = p_pass_id;
  if not found then perform private.fail('PASS_NOT_FOUND', 'This game pass does not exist.'); end if;
  if p_expected_price is not null and p_expected_price <> gp.price then
    perform private.fail('PRICE_CHANGED', format('The price changed to %s Orbs. Please review and try again.', gp.price));
  end if;
  if exists (select 1 from public.game_pass_ownership where user_id = v_uid and pass_id = p_pass_id) then
    perform private.fail('ALREADY_OWNED', 'You already own this game pass.');
  end if;
  perform private.apply_currency(v_uid, -gp.price, 'gamepass_purchase', 'Game pass: ' || gp.name || ' (' || gp.game_title || ')',
    'game_pass', gp.id, v_idem);
  insert into public.game_pass_ownership (user_id, pass_id) values (v_uid, p_pass_id);
  update public.game_passes set sales_count = sales_count + 1 where id = p_pass_id;
  perform private.log_activity(v_uid, 'pass_purchase', jsonb_build_object('pass_id', gp.id, 'name', gp.name,
                                                                          'game_id', gp.game_id, 'game_title', gp.game_title));
  perform private.add_xp(v_uid, least(50, 5 + gp.price / 100));
  perform private.bump_quests(v_uid, 'items_bought', 1);
  v_unlocked := private.evaluate_achievements(v_uid);
  return jsonb_build_object('status', 'ok', 'pass_id', p_pass_id, 'unlocked', v_unlocked) || private.player_state(v_uid);
end $$;

-- ---------------------------------------------------------------------------
-- Sessions & scoring
-- ---------------------------------------------------------------------------
create function public.start_game_session(p_game_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  g public.games;
  v_perks jsonb;
  v_id uuid;
begin
  perform private.rate_limit('game_session', 120, 3600);
  select * into g from public.games where id = p_game_id;
  if not found then perform private.fail('GAME_NOT_FOUND', 'This game does not exist.'); end if;
  -- Perks are snapshotted now; buying a pass mid-run does not change this run.
  select coalesce(jsonb_object_agg(perk_type, perk_value), '{}'::jsonb) into v_perks
    from (select gp.perk_type, max(gp.perk_value) as perk_value
            from public.game_passes gp join public.game_pass_ownership o on o.pass_id = gp.id and o.user_id = v_uid
           where gp.game_id = g.id group by gp.perk_type) x;
  update public.game_sessions set status = 'expired'
   where user_id = v_uid and status = 'active' and started_at < now() - interval '3 hours';
  insert into public.game_sessions (user_id, game_id, perks) values (v_uid, g.id, v_perks) returning id into v_id;
  return jsonb_build_object('session_id', v_id, 'game_id', g.id, 'engine', g.engine, 'config', g.config,
                            'perks', v_perks, 'started_at', now());
end $$;

create function public.submit_game_score(p_session_id uuid, p_score bigint, p_duration_ms int, p_stats jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  s public.game_sessions;
  g public.games;
  v_elapsed numeric;
  v_orbs int;
  v_xp int;
  v_today_orbs int;
  v_prev record;
  v_first_play boolean;
  v_new_best boolean;
  v_mult numeric;
  v_xp_res jsonb;
  v_unlocked jsonb;
  v_result jsonb;
  v_capped boolean := false;
begin
  select * into s from public.game_sessions where id = p_session_id and user_id = v_uid for update;
  if not found then perform private.fail('SESSION_NOT_FOUND', 'Game session not found.'); end if;
  if s.status = 'completed' then
    return coalesce(s.result, '{}'::jsonb) || jsonb_build_object('status', 'duplicate') || private.player_state(v_uid);
  end if;
  if s.status <> 'active' then perform private.fail('SESSION_CLOSED', 'This game session has ended.'); end if;
  select * into g from public.games where id = s.game_id;
  v_elapsed := extract(epoch from now() - s.started_at);
  if v_elapsed > 3 * 3600 then
    update public.game_sessions set status = 'expired', submitted_at = now() where id = s.id;
    perform private.fail('SESSION_EXPIRED', 'This game session expired.');
  end if;
  if p_score is null or p_score < 0 or p_score > 100000000 then
    perform private.fail('INVALID_SCORE', 'Invalid score.');
  end if;

  -- Plausibility: no engine can legitimately score faster than its cap.
  if p_score > g.max_score_per_second * greatest(v_elapsed, 1) + g.score_grace then
    update public.game_sessions
       set status = 'rejected', score = p_score, submitted_at = now(), duration_ms = p_duration_ms,
           reject_reason = 'IMPLAUSIBLE_SCORE', stats = coalesce(p_stats, '{}'::jsonb)
     where id = s.id;
    return jsonb_build_object('status', 'rejected', 'reason', 'IMPLAUSIBLE_SCORE', 'orbs', 0, 'xp', 0)
           || private.player_state(v_uid);
  end if;

  v_mult := coalesce((s.perks ->> 'orb_multiplier')::numeric, 1);
  v_orbs := least(floor(p_score::numeric / g.score_per_orb), g.max_orbs_per_session);
  v_orbs := floor(v_orbs * v_mult)::int;
  if v_elapsed < 3 then v_orbs := 0; end if;
  select coalesce(sum(orbs_awarded), 0) into v_today_orbs from public.game_sessions
   where user_id = v_uid and game_id = g.id and status = 'completed'
     and started_at >= (private.today()::timestamp at time zone 'utc');
  if v_orbs > greatest(g.daily_orb_cap - v_today_orbs, 0) then
    v_orbs := greatest(g.daily_orb_cap - v_today_orbs, 0);
    v_capped := true;
  end if;
  v_xp := floor((g.xp_per_play + least(floor(p_score::numeric / g.score_per_orb), 20))
                * coalesce((s.perks ->> 'xp_multiplier')::numeric, 1))::int;

  select * into v_prev from public.player_game_stats where user_id = v_uid and game_id = g.id for update;
  v_first_play := not found;
  v_new_best := v_first_play or p_score > v_prev.best_score;
  insert into public.player_game_stats as st (user_id, game_id, plays, best_score, total_score, total_orbs)
  values (v_uid, g.id, 1, p_score, p_score, v_orbs)
  on conflict (user_id, game_id) do update
    set plays = st.plays + 1, best_score = greatest(st.best_score, excluded.best_score),
        total_score = st.total_score + excluded.total_score, total_orbs = st.total_orbs + excluded.total_orbs,
        last_played_at = now();
  update public.games set visits = visits + 1 where id = g.id;

  if v_orbs > 0 then
    perform private.apply_currency(v_uid, v_orbs, 'game_reward', g.title || ' reward', 'game_session', s.id::text,
      'game:' || s.id, null, jsonb_build_object('game_id', g.id, 'score', p_score));
  end if;
  v_xp_res := private.add_xp(v_uid, v_xp);

  if v_first_play then
    perform private.log_activity(v_uid, 'game_played', jsonb_build_object('game_id', g.id, 'title', g.title));
    perform private.bump_quests(v_uid, 'new_games_played', 1);
  elsif v_new_best and p_score > 0 then
    perform private.log_activity(v_uid, 'new_best', jsonb_build_object('game_id', g.id, 'title', g.title, 'score', p_score));
  end if;
  perform private.bump_quests(v_uid, 'games_played', 1);
  perform private.bump_quests(v_uid, 'game_orbs_earned', v_orbs);
  v_unlocked := private.evaluate_achievements(v_uid);

  v_result := jsonb_build_object(
    'status', 'ok', 'score', p_score, 'orbs', v_orbs, 'xp', v_xp, 'orb_multiplier', v_mult,
    'daily_cap_reached', v_capped, 'is_new_best', v_new_best,
    'best_score', greatest(p_score, coalesce(v_prev.best_score, 0)),
    'leveled_up', (v_xp_res ->> 'leveled_up')::boolean, 'unlocked', v_unlocked);
  update public.game_sessions
     set status = 'completed', score = p_score, orbs_awarded = v_orbs, xp_awarded = v_xp, submitted_at = now(),
         duration_ms = p_duration_ms, stats = coalesce(p_stats, '{}'::jsonb), result = v_result
   where id = s.id;
  return v_result || private.player_state(v_uid);
end $$;
