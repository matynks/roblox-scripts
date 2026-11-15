-- Blockora — core schema
-- Every table lives in `public` (exposed through PostgREST) with RLS enabled.
-- Internal helpers live in `private`, which is never exposed.

create schema if not exists private;
revoke all on schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema private from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on schema private from authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.item_slot as enum
  ('hair', 'face', 'hat', 'face_accessory', 'neck', 'back', 'shirt', 'pants', 'shoes');
create type public.item_rarity as enum
  ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');
create type public.txn_kind as enum
  ('signup_bonus', 'daily_reward', 'purchase', 'gamepass_purchase', 'game_reward',
   'achievement_reward', 'quest_reward', 'level_reward', 'collection_reward',
   'username_change', 'admin_adjustment', 'refund');
create type public.visibility_level as enum ('everyone', 'friends', 'nobody');
create type public.notification_kind as enum
  ('system', 'friend_request', 'friend_accepted', 'new_follower', 'purchase', 'reward',
   'achievement', 'level_up', 'quest', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.developer_role as enum ('developer', 'owner');
create type public.report_reason as enum
  ('spam', 'harassment', 'inappropriate_profile', 'cheating', 'impersonation', 'other');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  username text not null,
  display_name text not null,
  bio text not null default '' check (char_length(bio) <= 500),
  status_text text not null default '' check (char_length(status_text) <= 60),
  profile_theme text not null default 'default',
  level int not null default 1 check (level between 1 and 100),
  xp bigint not null default 0 check (xp >= 0),
  reputation int not null default 0 check (reputation between -1000 and 100000),
  is_npc boolean not null default false,
  is_test_account boolean not null default false,
  account_status public.account_status not null default 'active',
  terms_accepted_at timestamptz,
  username_changed_at timestamptz,
  display_name_changed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint username_format check (
    username ~ '^[A-Za-z0-9_]{3,20}$'
    and username !~ '^_' and username !~ '_$'
    and char_length(username) - char_length(replace(username, '_', '')) <= 1
  ),
  constraint display_name_format check (
    display_name ~ '^[A-Za-z0-9_][A-Za-z0-9_ ]{1,18}[A-Za-z0-9_]$'
    and display_name !~ '  '
  )
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_display_name_lower_idx on public.profiles (lower(display_name));
create index profiles_level_idx on public.profiles (level desc);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  inventory_visibility public.visibility_level not null default 'everyone',
  friends_visibility public.visibility_level not null default 'everyone',
  activity_visibility public.visibility_level not null default 'friends',
  allow_friend_requests boolean not null default true,
  show_online_status boolean not null default true,
  notify_social boolean not null default true,
  notify_rewards boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.developer_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.developer_role not null default 'developer',
  granted_by uuid references public.profiles (id) on delete set null,
  note text not null default '',
  granted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Economy
-- ---------------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0 and balance <= 1000000000),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.currency_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  kind public.txn_kind not null,
  description text not null check (char_length(description) between 1 and 200),
  reference_type text,
  reference_id text,
  idempotency_key text check (idempotency_key is null or char_length(idempotency_key) between 4 and 120),
  actor_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  -- clock_timestamp(): rows written in one transaction keep their true order
  created_at timestamptz not null default clock_timestamp()
);
create unique index currency_transactions_idem_idx
  on public.currency_transactions (user_id, idempotency_key) where idempotency_key is not null;
create index currency_transactions_user_time_idx on public.currency_transactions (user_id, created_at desc);
create index currency_transactions_time_idx on public.currency_transactions (created_at desc);

create table public.item_sets (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  description text not null default '',
  reward_orbs int not null default 0 check (reward_orbs >= 0),
  sort_order int not null default 0
);

create table public.catalog_items (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '',
  slot public.item_slot not null,
  rarity public.item_rarity not null default 'common',
  price int not null check (price >= 0),
  is_for_sale boolean not null default true,
  is_limited boolean not null default false,
  stock_total int,
  stock_remaining int,
  season_key text,
  set_key text references public.item_sets (key),
  is_starter boolean not null default false,
  featured boolean not null default false,
  creator_name text not null default 'Blockora Studio',
  asset jsonb not null,
  tags text[] not null default '{}',
  sales_count int not null default 0 check (sales_count >= 0),
  favorites_count int not null default 0 check (favorites_count >= 0),
  created_at timestamptz not null default now(),
  constraint limited_stock check (
    (is_limited and stock_total > 0 and stock_remaining between 0 and stock_total)
    or (not is_limited and stock_total is null and stock_remaining is null)
  )
);
create index catalog_items_slot_idx on public.catalog_items (slot);
create index catalog_items_created_idx on public.catalog_items (created_at desc);
create index catalog_items_sales_idx on public.catalog_items (sales_count desc);
create index catalog_items_name_lower_idx on public.catalog_items (lower(name));

create table public.item_price_points (
  item_id text not null references public.catalog_items (id) on delete cascade,
  day date not null,
  avg_price int not null check (avg_price >= 0),
  volume int not null default 0 check (volume >= 0),
  primary key (item_id, day)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.catalog_items (id),
  serial_number int check (serial_number is null or serial_number > 0),
  acquired_via text not null check (acquired_via in ('purchase', 'starter', 'reward', 'admin_grant', 'seed')),
  price_paid int not null default 0 check (price_paid >= 0),
  acquired_at timestamptz not null default now()
);
create index inventory_items_user_idx on public.inventory_items (user_id, acquired_at desc);
create index inventory_items_item_idx on public.inventory_items (item_id);
create unique index inventory_items_serial_idx
  on public.inventory_items (item_id, serial_number) where serial_number is not null;

create table public.item_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.catalog_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.collection_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_key text not null references public.item_sets (key) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, set_key)
);

-- ---------------------------------------------------------------------------
-- Avatar
-- ---------------------------------------------------------------------------
create table public.avatars (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  skin_tone text not null default '#F2C9A0' check (skin_tone ~ '^#[0-9A-Fa-f]{6}$'),
  body_type text not null default 'classic' check (body_type in ('classic', 'slim', 'broad')),
  height_scale numeric(3, 2) not null default 1.00 check (height_scale between 0.90 and 1.10),
  head_scale numeric(3, 2) not null default 1.00 check (head_scale between 0.90 and 1.10),
  equipped jsonb not null default '{}'::jsonb check (jsonb_typeof(equipped) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  skin_tone text not null check (skin_tone ~ '^#[0-9A-Fa-f]{6}$'),
  body_type text not null check (body_type in ('classic', 'slim', 'broad')),
  height_scale numeric(3, 2) not null check (height_scale between 0.90 and 1.10),
  head_scale numeric(3, 2) not null check (head_scale between 0.90 and 1.10),
  equipped jsonb not null check (jsonb_typeof(equipped) = 'object'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outfits_user_idx on public.outfits (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------
create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  title text not null,
  tagline text not null default '',
  description text not null default '',
  genre text not null,
  engine text not null check (engine in ('orb_rush', 'stacker', 'glyph_match', 'reflex')),
  config jsonb not null default '{}'::jsonb,
  thumbnail jsonb not null default '{}'::jsonb,
  creator_name text not null default 'Blockora Studio',
  score_per_orb int not null check (score_per_orb > 0),
  max_orbs_per_session int not null check (max_orbs_per_session >= 0),
  daily_orb_cap int not null check (daily_orb_cap >= 0),
  max_score_per_second numeric not null check (max_score_per_second > 0),
  score_grace int not null default 50 check (score_grace >= 0),
  xp_per_play int not null default 10 check (xp_per_play >= 0),
  visits bigint not null default 0 check (visits >= 0),
  likes int not null default 0 check (likes >= 0),
  dislikes int not null default 0 check (dislikes >= 0),
  favorites int not null default 0 check (favorites >= 0),
  base_ccu int not null default 0 check (base_ccu >= 0),
  trend_seed numeric not null default 0,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_passes (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  game_id text not null references public.games (id) on delete cascade,
  name text not null,
  description text not null default '',
  price int not null check (price > 0),
  perk_type text not null check (perk_type in ('orb_multiplier', 'xp_multiplier', 'extra_life', 'time_bonus', 'hint', 'precision')),
  perk_value numeric not null check (perk_value > 0),
  icon jsonb not null default '{}'::jsonb,
  sales_count int not null default 0 check (sales_count >= 0),
  created_at timestamptz not null default now()
);
create index game_passes_game_idx on public.game_passes (game_id);

create table public.game_pass_ownership (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pass_id text not null references public.game_passes (id) on delete cascade,
  acquired_via text not null default 'purchase' check (acquired_via in ('purchase', 'admin_grant')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, pass_id)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'rejected', 'expired')),
  perks jsonb not null default '{}'::jsonb,
  score bigint,
  orbs_awarded int not null default 0,
  xp_awarded int not null default 0,
  duration_ms int,
  stats jsonb not null default '{}'::jsonb,
  reject_reason text,
  result jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index game_sessions_user_idx on public.game_sessions (user_id, started_at desc);
create index game_sessions_game_idx on public.game_sessions (game_id, started_at desc);

create table public.player_game_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  plays int not null default 0 check (plays >= 0),
  best_score bigint not null default 0 check (best_score >= 0),
  total_score bigint not null default 0 check (total_score >= 0),
  total_orbs bigint not null default 0 check (total_orbs >= 0),
  first_played_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
create index player_game_stats_board_idx on public.player_game_stats (game_id, best_score desc);

create table public.game_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table public.game_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> receiver_id)
);
create unique index friend_requests_pending_pair_idx
  on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status = 'pending';
create index friend_requests_receiver_idx on public.friend_requests (receiver_id, status);
create index friend_requests_sender_idx on public.friend_requests (sender_id, status);

create table public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index friendships_friend_idx on public.friendships (friend_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('joined', 'purchase', 'game_played', 'new_best', 'achievement',
                                     'friend', 'level_up', 'outfit_shared', 'set_complete', 'pass_purchase')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index activity_events_user_idx on public.activity_events (user_id, created_at desc);
create index activity_events_time_idx on public.activity_events (created_at desc);

-- ---------------------------------------------------------------------------
-- Progression
-- ---------------------------------------------------------------------------
create table public.achievements (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  description text not null,
  icon text not null,
  category text not null,
  metric text not null,
  target numeric not null check (target > 0),
  engine text,
  reward_orbs int not null default 0 check (reward_orbs >= 0),
  reward_xp int not null default 0 check (reward_xp >= 0),
  is_secret boolean not null default false,
  sort_order int not null default 0
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_key text not null references public.achievements (key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create table public.daily_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_claim_date date,
  total_claims int not null default 0 check (total_claims >= 0)
);

create table public.quests (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  title text not null,
  description text not null,
  goal_type text not null check (goal_type in ('games_played', 'game_orbs_earned', 'items_bought',
                                               'social_actions', 'new_games_played', 'outfit_actions', 'daily_claimed')),
  target int not null check (target > 0),
  reward_orbs int not null check (reward_orbs >= 0),
  reward_xp int not null default 0 check (reward_xp >= 0),
  sort_order int not null default 0
);

create table public.quest_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_day date not null,
  quest_key text not null references public.quests (key) on delete cascade,
  progress int not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, quest_day, quest_key)
);

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_type text,
  target_id text,
  reason text not null default '',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index audit_logs_time_idx on public.audit_logs (created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_user_id, created_at desc);

create table public.rate_limit_buckets (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, action, window_start)
);

create table public.app_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_meta (key, value) values ('schema_version', '"2026.11.1"'::jsonb);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- Non-limited items can be owned at most once per player (defense in depth: the
-- purchase and grant functions check this too).
create function private.enforce_single_ownership() returns trigger
language plpgsql set search_path = '' as $$
declare v_limited boolean;
begin
  select is_limited into v_limited from public.catalog_items where id = new.item_id;
  if not coalesce(v_limited, false) then
    if exists (select 1 from public.inventory_items
               where user_id = new.user_id and item_id = new.item_id and id <> new.id) then
      raise exception 'ALREADY_OWNED' using errcode = 'P0001', hint = 'You already own this item.';
    end if;
  end if;
  return new;
end $$;
create trigger inventory_single_ownership before insert on public.inventory_items
  for each row execute function private.enforce_single_ownership();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger user_settings_touch before update on public.user_settings
  for each row execute function private.touch_updated_at();

-- profiles are linked to auth.users by trigger rather than a foreign key so that
-- simulated NPC players can exist without auth accounts. Deleting an auth user
-- still removes the player's data.
create function private.handle_deleted_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.profiles where id = old.id and not is_npc;
  return old;
end $$;
create trigger on_auth_user_deleted after delete on auth.users
  for each row execute function private.handle_deleted_user();
