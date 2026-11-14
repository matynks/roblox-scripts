-- BloxyBox core schema
-- Tables, constraints, indexes, row level security and table privileges.
--
-- Security model:
--   * RLS is enabled on every table.
--   * anon/authenticated receive no table privileges by default (Supabase grants
--     them broadly through default privileges, so each table revokes them first).
--   * Clients may only SELECT. Every write goes through SECURITY DEFINER
--     functions defined in later migrations.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique
                  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name  text not null
                  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 30),
  bio           text not null default ''
                  constraint profiles_bio_length check (char_length(bio) <= 200),
  accent        text not null default 'violet'
                  constraint profiles_accent_valid check (accent in ('violet', 'cyan', 'lime', 'amber', 'rose', 'sky')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Trusted role system. Rows are only ever inserted by the project owner (SQL editor / service role).
create table public.user_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null constraint user_roles_role_valid check (role in ('developer')),
  granted_at  timestamptz not null default now(),
  note        text,
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------------
-- Economy
-- ---------------------------------------------------------------------------
create table public.wallets (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  balance          bigint not null default 0
                     constraint wallets_balance_non_negative check (balance >= 0)
                     constraint wallets_balance_limit check (balance <= 1000000000000),
  lifetime_earned  bigint not null default 0 constraint wallets_lifetime_earned_non_negative check (lifetime_earned >= 0),
  lifetime_spent   bigint not null default 0 constraint wallets_lifetime_spent_non_negative check (lifetime_spent >= 0),
  updated_at       timestamptz not null default now()
);

create table public.transactions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  amount          bigint not null constraint transactions_amount_non_zero check (amount <> 0),
  balance_after   bigint not null constraint transactions_balance_after_non_negative check (balance_after >= 0),
  kind            text not null constraint transactions_kind_valid check (kind in (
                    'welcome_bonus', 'daily_reward', 'game_reward', 'item_purchase', 'pass_purchase',
                    'dev_adjustment', 'dev_set_balance', 'dev_reset')),
  description     text not null,
  reference_type  text constraint transactions_reference_type_valid check (reference_type in ('item', 'game_pass', 'game_session', 'daily_reward')),
  reference_id    text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index transactions_user_created_idx on public.transactions (user_id, created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- Catalog: items and marketplace
-- ---------------------------------------------------------------------------
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique constraint items_slug_format check (slug ~ '^[a-z0-9-]{3,40}$'),
  name             text not null,
  description      text not null,
  slot             text not null constraint items_slot_valid check (slot in ('hat', 'face', 'top', 'bottom', 'accessory', 'back')),
  rarity           text not null constraint items_rarity_valid check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  asset_key        text not null,
  primary_color    text not null constraint items_primary_color_hex check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color  text not null constraint items_secondary_color_hex check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_starter       boolean not null default false,
  created_at       timestamptz not null default now()
);
create index items_slot_idx on public.items (slot);

create table public.marketplace_listings (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null unique references public.items (id) on delete cascade,
  price        bigint not null constraint marketplace_listings_price_positive check (price > 0),
  is_active    boolean not null default true,
  is_featured  boolean not null default false,
  listed_at    timestamptz not null default now()
);
create index marketplace_listings_active_idx on public.marketplace_listings (is_active, listed_at desc);

-- Ownership records
create table public.inventory (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  item_id       uuid not null references public.items (id) on delete restrict,
  slot          text not null constraint inventory_slot_valid check (slot in ('hat', 'face', 'top', 'bottom', 'accessory', 'back')),
  equipped      boolean not null default false,
  acquired_via  text not null constraint inventory_acquired_via_valid check (acquired_via in ('purchase', 'starter', 'dev_grant', 'reward')),
  price_paid    bigint not null default 0 constraint inventory_price_paid_non_negative check (price_paid >= 0),
  acquired_at   timestamptz not null default now(),
  constraint inventory_user_item_unique unique (user_id, item_id)
);
-- At most one equipped item per slot per user.
create unique index inventory_one_equipped_per_slot on public.inventory (user_id, slot) where equipped;
create index inventory_item_idx on public.inventory (item_id);

-- Base avatar appearance (colours/shapes that are free to change)
create table public.avatars (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  skin_color  text not null default '#FFD86B'
                constraint avatars_skin_color_valid check (skin_color in (
                  '#F5D0B0', '#E8B48C', '#C98E62', '#9A6440', '#6B4429',
                  '#FFD86B', '#8FE3C4', '#9DB8FF', '#D7A8FF', '#FF9DB0')),
  head_shape  text not null default 'cube' constraint avatars_head_shape_valid check (head_shape in ('cube', 'round', 'tall')),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Experiences, game passes, sessions, progress
-- ---------------------------------------------------------------------------
create table public.experiences (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique constraint experiences_slug_format check (slug ~ '^[a-z0-9-]{3,40}$'),
  title                  text not null,
  tagline                text not null,
  description            text not null,
  how_to_play            text not null default '',
  category               text not null constraint experiences_category_valid check (category in ('arcade', 'action', 'puzzle', 'casual', 'simulation', 'adventure')),
  status                 text not null constraint experiences_status_valid check (status in ('playable', 'in_development')),
  is_featured            boolean not null default false,
  sort_order             integer not null default 0,
  accent_color           text not null constraint experiences_accent_hex check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  score_label            text not null default 'Score',
  released_at            date,
  -- Reward and anti-abuse rules (server-side only; the client never decides rewards)
  coins_per_point        numeric(8, 3) not null default 0 constraint experiences_coins_per_point_non_negative check (coins_per_point >= 0),
  win_bonus              integer not null default 0 constraint experiences_win_bonus_non_negative check (win_bonus >= 0),
  max_reward_per_run     integer not null default 0 constraint experiences_max_reward_non_negative check (max_reward_per_run >= 0),
  daily_reward_cap       integer not null default 0 constraint experiences_daily_cap_non_negative check (daily_reward_cap >= 0),
  xp_per_point           numeric(8, 3) not null default 0 constraint experiences_xp_per_point_non_negative check (xp_per_point >= 0),
  max_xp_per_run         integer not null default 0 constraint experiences_max_xp_non_negative check (max_xp_per_run >= 0),
  max_points_per_second  numeric(8, 2) not null default 0 constraint experiences_rate_non_negative check (max_points_per_second >= 0),
  win_score              integer not null default 0 constraint experiences_win_score_non_negative check (win_score >= 0),
  min_win_seconds        integer not null default 0 constraint experiences_min_win_non_negative check (min_win_seconds >= 0),
  max_session_minutes    integer not null default 30 constraint experiences_session_minutes_positive check (max_session_minutes > 0),
  play_count             bigint not null default 0 constraint experiences_play_count_non_negative check (play_count >= 0),
  created_at             timestamptz not null default now(),
  constraint experiences_playable_has_rules check (
    status <> 'playable' or (max_points_per_second > 0 and max_reward_per_run > 0 and win_score > 0)
  )
);

create table public.game_passes (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique constraint game_passes_slug_format check (slug ~ '^[a-z0-9-]{3,40}$'),
  experience_id  uuid not null references public.experiences (id) on delete cascade,
  name           text not null,
  description    text not null,
  price          bigint not null constraint game_passes_price_positive check (price > 0),
  perk           text not null constraint game_passes_perk_valid check (perk in ('double_coins', 'wide_start', 'slow_motion', 'extra_life', 'coin_magnet')),
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint game_passes_one_perk_per_experience unique (experience_id, perk)
);

create table public.game_pass_ownership (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  pass_id       uuid not null references public.game_passes (id) on delete cascade,
  enabled       boolean not null default true,
  acquired_via  text not null constraint game_pass_ownership_acquired_via_valid check (acquired_via in ('purchase', 'dev_grant')),
  price_paid    bigint not null default 0 constraint game_pass_ownership_price_non_negative check (price_paid >= 0),
  acquired_at   timestamptz not null default now(),
  primary key (user_id, pass_id)
);
create index game_pass_ownership_pass_idx on public.game_pass_ownership (pass_id);

create table public.game_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  experience_id      uuid not null references public.experiences (id) on delete cascade,
  status             text not null default 'active'
                       constraint game_sessions_status_valid check (status in ('active', 'completed', 'abandoned', 'expired', 'rejected')),
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  score              integer constraint game_sessions_score_non_negative check (score >= 0),
  outcome            text constraint game_sessions_outcome_valid check (outcome in ('win', 'loss')),
  reward             bigint not null default 0 constraint game_sessions_reward_non_negative check (reward >= 0),
  xp_gained          integer not null default 0 constraint game_sessions_xp_non_negative check (xp_gained >= 0),
  perks              text[] not null default '{}',
  client_duration_ms integer,
  rejection_reason   text
);
create index game_sessions_user_started_idx on public.game_sessions (user_id, started_at desc);
create index game_sessions_reward_day_idx on public.game_sessions (user_id, experience_id, ended_at) where status = 'completed';
create index game_sessions_active_idx on public.game_sessions (user_id, experience_id) where status = 'active';

create table public.game_progress (
  user_id             uuid not null references public.profiles (id) on delete cascade,
  experience_id       uuid not null references public.experiences (id) on delete cascade,
  best_score          integer not null default 0 constraint game_progress_best_non_negative check (best_score >= 0),
  total_plays         integer not null default 0 constraint game_progress_plays_non_negative check (total_plays >= 0),
  wins                integer not null default 0 constraint game_progress_wins_non_negative check (wins >= 0),
  total_coins_earned  bigint not null default 0 constraint game_progress_coins_non_negative check (total_coins_earned >= 0),
  last_played_at      timestamptz,
  primary key (user_id, experience_id)
);
create index game_progress_leaderboard_idx on public.game_progress (experience_id, best_score desc);

-- ---------------------------------------------------------------------------
-- Social and statistics (simulation data, clearly labelled in the app)
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  followee_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

create table public.profile_stats (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  xp                   bigint not null default 0 constraint profile_stats_xp_non_negative check (xp >= 0),
  level                integer not null default 1 constraint profile_stats_level_positive check (level >= 1),
  simulated_followers  bigint not null default 0 constraint profile_stats_sim_followers_non_negative check (simulated_followers >= 0),
  profile_visits       bigint not null default 0 constraint profile_stats_visits_non_negative check (profile_visits >= 0),
  games_played         bigint not null default 0 constraint profile_stats_games_non_negative check (games_played >= 0),
  daily_streak         integer not null default 0 constraint profile_stats_streak_non_negative check (daily_streak >= 0),
  last_daily_claim     date,
  updated_at           timestamptz not null default now()
);

create table public.profile_visits (
  visitor_id  uuid not null references public.profiles (id) on delete cascade,
  visited_id  uuid not null references public.profiles (id) on delete cascade,
  visit_day   date not null,
  primary key (visitor_id, visited_id, visit_day)
);

-- ---------------------------------------------------------------------------
-- Developer audit log and metadata
-- ---------------------------------------------------------------------------
create table public.dev_audit_log (
  id              bigint generated always as identity primary key,
  actor_id        uuid references public.profiles (id) on delete set null,
  action          text not null,
  target_user_id  uuid references public.profiles (id) on delete set null,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index dev_audit_log_created_idx on public.dev_audit_log (created_at desc);

create table public.app_meta (
  key    text primary key,
  value  text not null
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.user_roles           enable row level security;
alter table public.wallets              enable row level security;
alter table public.transactions         enable row level security;
alter table public.items                enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.inventory            enable row level security;
alter table public.avatars              enable row level security;
alter table public.experiences          enable row level security;
alter table public.game_passes          enable row level security;
alter table public.game_pass_ownership  enable row level security;
alter table public.game_sessions        enable row level security;
alter table public.game_progress        enable row level security;
alter table public.follows              enable row level security;
alter table public.profile_stats        enable row level security;
alter table public.profile_visits       enable row level security;
alter table public.dev_audit_log        enable row level security;
alter table public.app_meta             enable row level security;

-- Remove every privilege Supabase's default privileges may have granted.
revoke all on table
  public.profiles, public.user_roles, public.wallets, public.transactions, public.items,
  public.marketplace_listings, public.inventory, public.avatars, public.experiences,
  public.game_passes, public.game_pass_ownership, public.game_sessions, public.game_progress,
  public.follows, public.profile_stats, public.profile_visits, public.dev_audit_log, public.app_meta
from anon, authenticated;

revoke all on sequence public.transactions_id_seq, public.dev_audit_log_id_seq from anon, authenticated;

-- Read-only access for signed-in users. No INSERT/UPDATE/DELETE grants at all.
grant select on table
  public.profiles, public.wallets, public.transactions, public.items, public.marketplace_listings,
  public.inventory, public.avatars, public.experiences, public.game_passes, public.game_pass_ownership,
  public.game_sessions, public.game_progress, public.follows, public.profile_stats
to authenticated;

-- Public profile data
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy avatars_read on public.avatars for select to authenticated using (true);
create policy profile_stats_read on public.profile_stats for select to authenticated using (true);
create policy follows_read on public.follows for select to authenticated using (true);
create policy game_progress_read on public.game_progress for select to authenticated using (true);

-- Catalog
create policy items_read on public.items for select to authenticated using (true);
create policy marketplace_listings_read on public.marketplace_listings for select to authenticated using (true);
create policy experiences_read on public.experiences for select to authenticated using (true);
create policy game_passes_read on public.game_passes for select to authenticated using (true);

-- Private economy data: owner only
create policy wallets_read_own on public.wallets for select to authenticated
  using (user_id = (select auth.uid()));
create policy transactions_read_own on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy game_pass_ownership_read_own on public.game_pass_ownership for select to authenticated
  using (user_id = (select auth.uid()));
create policy game_sessions_read_own on public.game_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- Inventory: your own items, plus what other players are wearing (needed to draw their avatars)
create policy inventory_read on public.inventory for select to authenticated
  using (user_id = (select auth.uid()) or equipped);

-- user_roles, profile_visits, dev_audit_log, app_meta: no policies, no grants.
