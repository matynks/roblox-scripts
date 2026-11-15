-- Blockora — Row Level Security and privileges
--
-- Principle: the client may READ what it is allowed to see and may WRITE almost
-- nothing directly. Every state change that matters goes through a SECURITY
-- DEFINER function (see later migrations).

-- ---------------------------------------------------------------------------
-- Privacy helper (used by policies)
-- ---------------------------------------------------------------------------
create function private.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships where user_id = a and friend_id = b);
$$;

-- Can the current user see `scope` ('inventory' | 'friends' | 'activity') of `owner`?
create function private.can_view(owner uuid, scope text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_vis public.visibility_level;
begin
  if v_me is null then return false; end if;
  if owner = v_me then return true; end if;
  if private.is_blocked_between(owner, v_me) then return false; end if;
  select case scope
           when 'inventory' then inventory_visibility
           when 'friends' then friends_visibility
           when 'activity' then activity_visibility
         end
    into v_vis
    from public.user_settings where user_id = owner;
  if v_vis is null then v_vis := 'everyone'; end if;  -- NPCs have no settings row
  return case v_vis
           when 'everyone' then true
           when 'friends' then private.are_friends(owner, v_me)
           else false
         end;
end $$;

grant usage on schema private to authenticated;  -- needed so policies can call helpers
revoke all on all functions in schema private from public;
grant execute on function private.can_view(uuid, text) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.are_friends(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges: start from nothing, grant back the minimum
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- profiles: every column except presence (exposed through RPCs that honour
-- the player's "show online status" setting)
grant select (id, username, display_name, bio, status_text, profile_theme, level, xp,
              reputation, is_npc, is_test_account, account_status, created_at)
  on public.profiles to authenticated;

grant select on
  public.user_settings, public.wallets, public.currency_transactions,
  public.item_sets, public.catalog_items, public.item_price_points, public.inventory_items,
  public.item_favorites, public.collection_claims, public.avatars, public.outfits,
  public.games, public.game_passes, public.game_pass_ownership, public.game_sessions,
  public.player_game_stats, public.game_votes, public.game_favorites,
  public.friend_requests, public.friendships, public.follows, public.blocks,
  public.notifications, public.activity_events,
  public.achievements, public.user_achievements, public.daily_streaks,
  public.quests, public.quest_progress, public.app_meta
to authenticated;

-- Narrow, column-level writes the client is allowed to make itself
grant update (inventory_visibility, friends_visibility, activity_visibility,
              allow_friend_requests, show_online_status, notify_social, notify_rewards)
  on public.user_settings to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Policies (authenticated only; anon sees nothing)
-- ---------------------------------------------------------------------------
-- Public content
create policy "content readable" on public.catalog_items for select to authenticated using (true);
create policy "content readable" on public.item_sets for select to authenticated using (true);
create policy "content readable" on public.item_price_points for select to authenticated using (true);
create policy "content readable" on public.games for select to authenticated using (true);
create policy "content readable" on public.game_passes for select to authenticated using (true);
create policy "content readable" on public.achievements for select to authenticated using (true);
create policy "content readable" on public.quests for select to authenticated using (true);
create policy "content readable" on public.app_meta for select to authenticated using (true);

-- Profiles and avatars are public to signed-in players (like real platforms)
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "avatars readable" on public.avatars for select to authenticated using (true);
create policy "game stats readable" on public.player_game_stats for select to authenticated using (true);
create policy "badges readable" on public.user_achievements for select to authenticated using (true);

-- Own-only data
create policy "own settings" on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy "own settings update" on public.user_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wallet" on public.wallets for select to authenticated using (user_id = auth.uid());
create policy "own ledger" on public.currency_transactions for select to authenticated using (user_id = auth.uid());
create policy "own favorites" on public.item_favorites for select to authenticated using (user_id = auth.uid());
create policy "own set claims" on public.collection_claims for select to authenticated using (user_id = auth.uid());
create policy "own passes" on public.game_pass_ownership for select to authenticated using (user_id = auth.uid());
create policy "own sessions" on public.game_sessions for select to authenticated using (user_id = auth.uid());
create policy "own votes" on public.game_votes for select to authenticated using (user_id = auth.uid());
create policy "own game favorites" on public.game_favorites for select to authenticated using (user_id = auth.uid());
create policy "own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "own streak" on public.daily_streaks for select to authenticated using (user_id = auth.uid());
create policy "own quests" on public.quest_progress for select to authenticated using (user_id = auth.uid());
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications delete" on public.notifications for delete to authenticated
  using (user_id = auth.uid());
create policy "own friend requests" on public.friend_requests for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Privacy-aware data
create policy "inventory by privacy" on public.inventory_items for select to authenticated
  using (user_id = auth.uid() or private.can_view(user_id, 'inventory'));
create policy "outfits own or public" on public.outfits for select to authenticated
  using (user_id = auth.uid() or (is_public and not private.is_blocked_between(user_id, auth.uid())));
create policy "activity by privacy" on public.activity_events for select to authenticated
  using (user_id = auth.uid() or private.can_view(user_id, 'activity'));
-- A relationship row is visible to its participants, or to others only if BOTH
-- participants allow their social lists to be seen.
create policy "friendships by privacy" on public.friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid()
         or (private.can_view(user_id, 'friends') and private.can_view(friend_id, 'friends')));
create policy "follows by privacy" on public.follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid()
         or (private.can_view(follower_id, 'friends') and private.can_view(followee_id, 'friends')));

-- developer_roles, audit_logs, reports, rate_limit_buckets: RLS enabled, no
-- policies and no grants => unreachable through the API. Only SECURITY DEFINER
-- functions can touch them.
