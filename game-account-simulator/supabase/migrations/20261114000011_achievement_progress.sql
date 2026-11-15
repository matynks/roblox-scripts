-- Blockora — achievements with live progress for the signed-in player
create function public.get_achievements() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_metrics jsonb := private.player_metrics(v_uid);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'key', a.key, 'name', a.name, 'description', a.description, 'icon', a.icon, 'category', a.category,
             'target', a.target, 'reward_orbs', a.reward_orbs, 'reward_xp', a.reward_xp, 'is_secret', a.is_secret,
             'unlocked_at', ua.unlocked_at,
             'progress', least(a.target, case when a.metric = 'best_score_engine' then
                 (select coalesce(max(s.best_score), 0) from public.player_game_stats s
                    join public.games g on g.id = s.game_id where s.user_id = v_uid and g.engine = a.engine)
               else coalesce((v_metrics ->> a.metric)::numeric, 0) end))
           order by a.sort_order)
      from public.achievements a
      left join public.user_achievements ua on ua.user_id = v_uid and ua.achievement_key = a.key), '[]'::jsonb);
end $$;

revoke execute on function public.get_achievements() from public, anon;
grant execute on function public.get_achievements() to authenticated;
