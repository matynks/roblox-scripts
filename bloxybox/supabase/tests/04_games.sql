-- Game sessions and server-authoritative rewards.

-- Backdates a session so tests can simulate play time (now() is fixed inside a transaction).
create function tests.age_session(p_session uuid, p_seconds integer)
returns void
language sql
security definer
as $$
  update public.game_sessions set started_at = now() - make_interval(secs => p_seconds) where id = p_session;
$$;
grant execute on function tests.age_session(uuid, integer) to authenticated;

do $$
declare
  v_uid uuid := tests.create_user('gamer');
  v_intruder uuid := tests.create_user('intruder');
  v_session uuid;
  v_result jsonb;
begin
  perform tests.authenticate(v_uid);

  -- Not playable / unknown
  perform tests.assert_throws($q$select public.start_game_session('orbit-hop')$q$, 'EXPERIENCE_NOT_PLAYABLE', 'in-development experience cannot start');
  perform tests.assert_throws($q$select public.start_game_session('nope')$q$, 'EXPERIENCE_NOT_FOUND', 'unknown experience');

  -- Valid loss: 12 floors in 40 s => 12 * 4 = 48 coins, xp = 60
  v_result := public.start_game_session('box-stack');
  v_session := (v_result ->> 'session_id')::uuid;
  perform tests.assert_eq(jsonb_array_length(v_result -> 'perks'), 0, 'no perks without passes');
  perform tests.age_session(v_session, 40);
  v_result := public.submit_game_result(v_session, 12, 'loss', 39000);
  perform tests.assert_eq((v_result ->> 'accepted')::boolean, true, 'accepted');
  perform tests.assert_eq((v_result ->> 'reward')::integer, 48, 'reward computed server-side');
  perform tests.assert_eq((v_result ->> 'xp')::integer, 60, 'xp computed server-side');
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 548::bigint, 'balance credited');
  perform tests.assert_eq((v_result ->> 'new_best')::boolean, true, 'first run is a new best');

  -- Same session cannot be submitted twice
  perform tests.assert_throws(format($q$select public.submit_game_result(%L, 12, 'loss')$q$, v_session), 'SESSION_CLOSED', 'no double submit');

  -- Another user cannot submit my session
  v_result := public.start_game_session('box-stack');
  v_session := (v_result ->> 'session_id')::uuid;
  perform tests.authenticate(v_intruder);
  perform tests.assert_throws(format($q$select public.submit_game_result(%L, 5, 'loss')$q$, v_session), 'SESSION_NOT_FOUND', 'foreign session rejected');
  perform tests.authenticate(v_uid);

  -- Score faster than humanly possible: 30 floors in 2 s
  perform tests.age_session(v_session, 2);
  v_result := public.submit_game_result(v_session, 30, 'win', 2000);
  perform tests.assert_eq((v_result ->> 'accepted')::boolean, false, 'implausible rate rejected');
  perform tests.assert_eq(v_result ->> 'reason', 'score_rate_exceeded', 'rejection reason');
  perform tests.assert_eq((select status from public.game_sessions where id = v_session), 'rejected', 'rejection persisted');

  -- A "win" below the win score is rejected
  v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 60);
  v_result := public.submit_game_result(v_session, 10, 'win');
  perform tests.assert_eq(v_result ->> 'reason', 'win_not_plausible', 'fake win rejected');

  -- Expired session
  v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 31 * 60);
  v_result := public.submit_game_result(v_session, 10, 'loss');
  perform tests.assert_eq(v_result ->> 'reason', 'session_expired', 'expired session rejected');

  -- Starting again abandons an older active run
  v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
  perform public.start_game_session('box-stack');
  perform tests.assert_eq((select status from public.game_sessions where id = v_session), 'abandoned', 'old run abandoned');

  -- Malformed input
  perform tests.assert_throws(format($q$select public.submit_game_result(%L, -1, 'loss')$q$, v_session), 'INVALID_RESULT', 'negative score');
  perform tests.assert_throws(format($q$select public.submit_game_result(%L, 1, 'draw')$q$, v_session), 'INVALID_RESULT', 'bad outcome');

  -- Valid win: 30 floors in 50 s => 30 * 4 + 80 = 200, xp = min(150 + 50, 250) = 200
  v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 50);
  v_result := public.submit_game_result(v_session, 30, 'win');
  perform tests.assert_eq((v_result ->> 'reward')::integer, 200, 'win reward with bonus');
  perform tests.assert_eq((v_result ->> 'xp')::integer, 200, 'win xp');
  -- 260 xp total => level 2 (needs 100), level 3 needs 400
  perform tests.assert_eq((v_result ->> 'level')::integer, 2, 'level from xp');
  perform tests.assert_eq((v_result ->> 'level_up')::boolean, true, 'level up flagged');
  perform tests.assert_eq((v_result ->> 'followers_gained')::integer, 50, '25 x level 2 simulated followers');

  perform tests.as_owner();
  perform tests.assert_eq((select best_score from public.game_progress gp join public.experiences e on e.id = gp.experience_id
                           where gp.user_id = v_uid and e.slug = 'box-stack'), 30, 'best score tracked');
  perform tests.assert_eq((select wins from public.game_progress gp join public.experiences e on e.id = gp.experience_id
                           where gp.user_id = v_uid and e.slug = 'box-stack'), 1, 'wins tracked');
  perform tests.assert_eq((select simulated_followers from public.profile_stats where user_id = v_uid), 50::bigint, 'followers applied');
  perform tests.assert_eq((select games_played from public.profile_stats where user_id = v_uid), 2::bigint, 'only accepted runs counted');
  perform tests.assert_ledger_consistent();
end $$;

-- Double Coins pass, perks reported at start, and the daily cap.
do $$
declare
  v_uid uuid := tests.create_user('booster');
  v_pass uuid := (select id from public.game_passes where slug = 'box-stack-double-coins');
  v_session uuid;
  v_result jsonb;
  v_total integer := 0;
  i integer;
begin
  perform tests.as_owner();
  update public.wallets set balance = 10000 where user_id = v_uid;
  insert into public.transactions (user_id, amount, balance_after, kind, description)
  values (v_uid, 9500, 10000, 'dev_adjustment', 'test funding');

  perform tests.authenticate(v_uid);
  perform public.purchase_game_pass(v_pass);

  v_result := public.start_game_session('box-stack');
  perform tests.assert_eq(v_result -> 'perks', '["double_coins"]'::jsonb, 'perk reported at session start');
  v_session := (v_result ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 40);
  v_result := public.submit_game_result(v_session, 12, 'loss');
  perform tests.assert_eq((v_result ->> 'reward')::integer, 96, 'double coins applied (48 x 2)');
  perform tests.assert_eq((v_result ->> 'doubled')::boolean, true, 'doubled flag');

  -- Disabled pass: no doubling
  perform public.set_game_pass_enabled(v_pass, false);
  v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 40);
  perform tests.assert_eq((public.submit_game_result(v_session, 12, 'loss') ->> 'reward')::integer, 48, 'disabled pass not applied');
  perform public.set_game_pass_enabled(v_pass, true);

  -- Daily cap (1500 for Box Stack): keep winning until capped
  v_total := 96 + 48;
  for i in 1..5 loop
    v_session := (public.start_game_session('box-stack') ->> 'session_id')::uuid;
    perform tests.age_session(v_session, 50);
    v_result := public.submit_game_result(v_session, 30, 'win');
    v_total := v_total + (v_result ->> 'reward')::integer;
  end loop;
  -- Each win = min(200, 250) x 2 = 400. 144 + 400 x 3 = 1344, then 156, then 0.
  perform tests.assert_eq(v_total, 1500, 'daily cap enforced');
  perform tests.assert_eq((v_result ->> 'reward')::integer, 0, 'nothing beyond the cap');
  perform tests.assert_eq((v_result ->> 'capped')::boolean, true, 'capped flag');

  perform tests.as_owner();
  perform tests.assert_ledger_consistent();
end $$;

-- Leaderboard
do $$
declare
  v_a uuid := tests.create_user('leader_a');
  v_b uuid := tests.create_user('leader_b');
  v_session uuid;
  v_board jsonb;
begin
  perform tests.authenticate(v_a);
  v_session := (public.start_game_session('lane-dash') ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 90);
  perform public.submit_game_result(v_session, 450, 'win');

  perform tests.authenticate(v_b);
  v_session := (public.start_game_session('lane-dash') ->> 'session_id')::uuid;
  perform tests.age_session(v_session, 30);
  perform public.submit_game_result(v_session, 120, 'loss');

  v_board := public.get_leaderboard('lane-dash', 10);
  perform tests.assert_eq(jsonb_array_length(v_board), 2, 'two entries');
  perform tests.assert_eq(v_board -> 0 ->> 'username', 'leader_a', 'highest first');
  perform tests.assert_eq((v_board -> 0 ->> 'rank')::integer, 1, 'rank 1');
  perform tests.assert_eq((v_board -> 1 ->> 'best_score')::integer, 120, 'second score');
end $$;
