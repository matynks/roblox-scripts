-- BloxyBox game sessions and server-authoritative rewards.
--
-- Flow: start_game_session(slug) -> play on device -> submit_game_result(...)
-- The server measures elapsed time with its own clock, rejects implausible
-- results, computes the reward and XP, applies Game Pass perks and daily caps,
-- and credits the wallet through the ledger. A client-side game can never be
-- made fully cheat-proof; these checks bound what a tampered client can gain.

create function public.start_game_session(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_experience public.experiences;
  v_perks text[];
  v_session public.game_sessions;
begin
  select * into v_experience from public.experiences where slug = p_slug;
  if not found then
    raise exception 'EXPERIENCE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_experience.status <> 'playable' then
    raise exception 'EXPERIENCE_NOT_PLAYABLE' using errcode = 'P0001';
  end if;

  -- One active run per experience: older active runs are abandoned.
  update public.game_sessions
  set status = 'abandoned', ended_at = now()
  where user_id = v_uid and experience_id = v_experience.id and status = 'active';

  select coalesce(array_agg(gp.perk order by gp.perk), '{}')
  into v_perks
  from public.game_pass_ownership o
  join public.game_passes gp on gp.id = o.pass_id
  where o.user_id = v_uid and o.enabled and gp.is_active and gp.experience_id = v_experience.id;

  insert into public.game_sessions (user_id, experience_id, perks)
  values (v_uid, v_experience.id, v_perks)
  returning * into v_session;

  return jsonb_build_object(
    'session_id', v_session.id,
    'started_at', v_session.started_at,
    'perks', to_jsonb(v_perks),
    'expires_at', v_session.started_at + make_interval(mins => v_experience.max_session_minutes)
  );
end;
$$;

create function public.submit_game_result(
  p_session_id uuid,
  p_score integer,
  p_outcome text,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_session public.game_sessions;
  v_experience public.experiences;
  v_elapsed numeric;
  v_max_score integer;
  v_reason text;
  v_base bigint;
  v_doubled boolean;
  v_earned_today bigint;
  v_reward bigint;
  v_capped boolean;
  v_xp integer;
  v_old_best integer;
  v_stats public.profile_stats;
  v_new_xp bigint;
  v_new_level integer;
  v_followers_gain bigint := 0;
  v_balance bigint;
  v_tx public.transactions;
  v_day_start timestamptz := (((now() at time zone 'utc')::date)::timestamp at time zone 'utc');
begin
  if p_score is null or p_score < 0 or p_score > 1000000 or p_outcome is null or p_outcome not in ('win', 'loss') then
    raise exception 'INVALID_RESULT' using errcode = '22023';
  end if;

  select * into v_session from public.game_sessions where id = p_session_id for update;
  if not found or v_session.user_id <> v_uid then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_session.status <> 'active' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;

  select * into v_experience from public.experiences where id = v_session.experience_id;
  v_elapsed := extract(epoch from (now() - v_session.started_at));

  -- Validation (recorded, not raised, so the rejection is persisted)
  if v_elapsed > v_experience.max_session_minutes * 60 then
    v_reason := 'session_expired';
  else
    v_max_score := ceil(v_experience.max_points_per_second * greatest(v_elapsed, 1))::integer + 2;
    if p_score > v_max_score then
      v_reason := 'score_rate_exceeded';
    elsif p_outcome = 'win' and (p_score < v_experience.win_score or v_elapsed < v_experience.min_win_seconds) then
      v_reason := 'win_not_plausible';
    end if;
  end if;

  if v_reason is not null then
    update public.game_sessions
    set status = case when v_reason = 'session_expired' then 'expired' else 'rejected' end,
        ended_at = now(), score = p_score, outcome = p_outcome,
        client_duration_ms = p_duration_ms, rejection_reason = v_reason
    where id = v_session.id;

    return jsonb_build_object('accepted', false, 'reason', v_reason, 'reward', 0, 'xp', 0);
  end if;

  -- Reward
  v_base := floor(p_score * v_experience.coins_per_point)::bigint
            + case when p_outcome = 'win' then v_experience.win_bonus else 0 end;
  v_base := least(v_base, v_experience.max_reward_per_run);

  -- Perks are read from current ownership (not from the client).
  v_doubled := exists (
    select 1
    from public.game_pass_ownership o
    join public.game_passes gp on gp.id = o.pass_id
    where o.user_id = v_uid and o.enabled and gp.is_active
      and gp.experience_id = v_experience.id and gp.perk = 'double_coins'
  );
  if v_doubled then
    v_base := v_base * 2;
  end if;

  select coalesce(sum(reward), 0) into v_earned_today
  from public.game_sessions
  where user_id = v_uid and experience_id = v_experience.id
    and status = 'completed' and ended_at >= v_day_start;

  v_reward := greatest(0, least(v_base, v_experience.daily_reward_cap - v_earned_today));
  v_capped := v_reward < v_base;

  v_xp := least(
    floor(p_score * v_experience.xp_per_point)::integer + case when p_outcome = 'win' then 50 else 0 end,
    v_experience.max_xp_per_run
  );

  update public.game_sessions
  set status = 'completed', ended_at = now(), score = p_score, outcome = p_outcome,
      reward = v_reward, xp_gained = v_xp, client_duration_ms = p_duration_ms
  where id = v_session.id;

  -- Progress
  select best_score into v_old_best
  from public.game_progress
  where user_id = v_uid and experience_id = v_experience.id
  for update;

  insert into public.game_progress (user_id, experience_id, best_score, total_plays, wins, total_coins_earned, last_played_at)
  values (v_uid, v_experience.id, p_score, 1, case when p_outcome = 'win' then 1 else 0 end, v_reward, now())
  on conflict (user_id, experience_id) do update
  set best_score = greatest(public.game_progress.best_score, excluded.best_score),
      total_plays = public.game_progress.total_plays + 1,
      wins = public.game_progress.wins + excluded.wins,
      total_coins_earned = public.game_progress.total_coins_earned + excluded.total_coins_earned,
      last_played_at = now();

  -- XP, level and simulated followers (25 x each new level reached)
  select * into v_stats from public.profile_stats where user_id = v_uid for update;
  v_new_xp := v_stats.xp + v_xp;
  v_new_level := public.level_for_xp(v_new_xp);
  if v_new_level > v_stats.level then
    select coalesce(sum(25 * l), 0) into v_followers_gain
    from generate_series(v_stats.level + 1, v_new_level) as l;
  end if;

  update public.profile_stats
  set xp = v_new_xp,
      level = v_new_level,
      simulated_followers = simulated_followers + v_followers_gain,
      games_played = games_played + 1,
      updated_at = now()
  where user_id = v_uid;

  update public.experiences set play_count = play_count + 1 where id = v_experience.id;

  if v_reward > 0 then
    v_tx := public._apply_wallet_change(
      v_uid, v_reward, 'game_reward', v_experience.title || ' reward',
      'game_session', v_session.id::text,
      jsonb_build_object('score', p_score, 'outcome', p_outcome, 'doubled', v_doubled, 'capped', v_capped, 'experience', v_experience.slug)
    );
    v_balance := v_tx.balance_after;
  else
    select balance into v_balance from public.wallets where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'accepted', true,
    'reward', v_reward,
    'xp', v_xp,
    'doubled', v_doubled,
    'capped', v_capped,
    'daily_cap', v_experience.daily_reward_cap,
    'earned_today', v_earned_today + v_reward,
    'new_best', v_old_best is null or p_score > v_old_best,
    'best_score', greatest(coalesce(v_old_best, 0), p_score),
    'level', v_new_level,
    'level_up', v_new_level > v_stats.level,
    'followers_gained', v_followers_gain,
    'balance', v_balance,
    'transaction_id', v_tx.id
  );
end;
$$;

create function public.get_leaderboard(p_slug text, p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_to_json(r) order by r.rank), '[]'::jsonb)
  from (
    select rank() over (order by gp.best_score desc) as rank,
           p.id as user_id, p.username, p.display_name, p.accent,
           gp.best_score, gp.wins
    from public.game_progress gp
    join public.experiences e on e.id = gp.experience_id
    join public.profiles p on p.id = gp.user_id
    where e.slug = p_slug and gp.best_score > 0
    order by gp.best_score desc, gp.last_played_at asc
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  ) r;
$$;

revoke all on function public.start_game_session(text) from public, anon, authenticated;
revoke all on function public.submit_game_result(uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.get_leaderboard(text, integer) from public, anon, authenticated;

grant execute on function public.start_game_session(text) to authenticated;
grant execute on function public.submit_game_result(uuid, integer, text, integer) to authenticated;
grant execute on function public.get_leaderboard(text, integer) to authenticated;
