/** Row and RPC result types. Kept in sync with supabase/migrations by hand. */
import type { Accent, HeadShape, Rarity } from '@/theme/tokens';

export type Slot = 'hat' | 'face' | 'top' | 'bottom' | 'accessory' | 'back';
export const SLOTS: Slot[] = ['hat', 'face', 'top', 'bottom', 'accessory', 'back'];
export const SLOT_LABELS: Record<Slot, string> = {
  hat: 'Hats',
  face: 'Faces',
  top: 'Tops',
  bottom: 'Bottoms',
  accessory: 'Accessories',
  back: 'Back',
};

export type Item = {
  id: string;
  slug: string;
  name: string;
  description: string;
  slot: Slot;
  rarity: Rarity;
  asset_key: string;
  primary_color: string;
  secondary_color: string;
  is_starter: boolean;
};

export type Listing = {
  id: string;
  item_id: string;
  price: number;
  is_active: boolean;
  is_featured: boolean;
  listed_at: string;
  item: Item;
};

export type InventoryEntry = {
  id: string;
  user_id: string;
  item_id: string;
  slot: Slot;
  equipped: boolean;
  acquired_via: 'purchase' | 'starter' | 'dev_grant' | 'reward';
  price_paid: number;
  acquired_at: string;
  item: Item;
};

export type EquippedPart = {
  item_id: string;
  slot: Slot;
  asset_key: string;
  primary_color: string;
  secondary_color: string;
};

export type AvatarAppearance = {
  skin_color: string;
  head_shape: HeadShape;
  equipped: EquippedPart[];
};

export type Wallet = {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  updated_at: string;
};

export type TransactionKind =
  | 'welcome_bonus'
  | 'daily_reward'
  | 'game_reward'
  | 'item_purchase'
  | 'pass_purchase'
  | 'dev_adjustment'
  | 'dev_set_balance'
  | 'dev_reset';

export type Transaction = {
  id: number;
  user_id: string;
  amount: number;
  balance_after: number;
  kind: TransactionKind;
  description: string;
  reference_type: 'item' | 'game_pass' | 'game_session' | 'daily_reward' | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ExperienceStatus = 'playable' | 'in_development';
export type ExperienceCategory = 'arcade' | 'action' | 'puzzle' | 'casual' | 'simulation' | 'adventure';

export type Experience = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  how_to_play: string;
  category: ExperienceCategory;
  status: ExperienceStatus;
  is_featured: boolean;
  sort_order: number;
  accent_color: string;
  score_label: string;
  released_at: string | null;
  coins_per_point: number;
  win_bonus: number;
  max_reward_per_run: number;
  daily_reward_cap: number;
  win_score: number;
  play_count: number;
};

export type Perk = 'double_coins' | 'wide_start' | 'slow_motion' | 'extra_life' | 'coin_magnet';

export type GamePass = {
  id: string;
  slug: string;
  experience_id: string;
  name: string;
  description: string;
  price: number;
  perk: Perk;
  is_active: boolean;
  sort_order: number;
  experience?: Pick<Experience, 'id' | 'slug' | 'title' | 'accent_color'>;
};

export type PassOwnership = {
  user_id: string;
  pass_id: string;
  enabled: boolean;
  acquired_via: 'purchase' | 'dev_grant';
  price_paid: number;
  acquired_at: string;
};

export type GameProgress = {
  user_id: string;
  experience_id: string;
  best_score: number;
  total_plays: number;
  wins: number;
  total_coins_earned: number;
  last_played_at: string | null;
};

export type ProfileStats = {
  level: number;
  xp: number;
  xp_level_start: number;
  xp_next_level: number;
  games_played: number;
  profile_visits: number;
  daily_streak: number;
  items_owned: number;
  experiences_played: number;
};

export type ProfileSummary = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  accent: Accent;
  created_at: string;
  avatar: AvatarAppearance;
  stats: ProfileStats;
  social: {
    followers_real: number;
    followers_simulated: number;
    followers_total: number;
    following: number;
    friends: number;
  };
  relationship: {
    is_self: boolean;
    is_following: boolean;
    follows_you: boolean;
  };
};

export type PlayerCard = {
  id: string;
  username: string;
  display_name: string;
  accent: Accent;
  level: number | null;
  avatar: AvatarAppearance | null;
};

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  accent: Accent;
  best_score: number;
  wins: number;
};

export type DailyRewardStatus = {
  available: boolean;
  streak: number;
  next_streak: number;
  next_amount: number;
  next_claim_at: string;
  server_time: string;
};

export type DailyRewardClaim = {
  amount: number;
  streak: number;
  balance: number;
  transaction_id: number;
  next_claim_at: string;
};

export type PurchaseResult = {
  price: number;
  balance: number;
  transaction_id: number;
};

export type GameSessionStart = {
  session_id: string;
  started_at: string;
  perks: Perk[];
  expires_at: string;
};

export type GameResult =
  | {
      accepted: true;
      reward: number;
      xp: number;
      doubled: boolean;
      capped: boolean;
      daily_cap: number;
      earned_today: number;
      new_best: boolean;
      best_score: number;
      level: number;
      level_up: boolean;
      followers_gained: number;
      balance: number;
      transaction_id: number | null;
    }
  | {
      accepted: false;
      reason: 'session_expired' | 'score_rate_exceeded' | 'win_not_plausible';
      reward: 0;
      xp: 0;
    };

// Developer tools
export type DevUser = {
  id: string;
  username: string;
  display_name: string;
  balance: number | null;
  level: number | null;
  simulated_followers: number | null;
};

export type DevUserSnapshot = {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  is_developer: boolean;
  wallet: { balance: number; lifetime_earned: number; lifetime_spent: number };
  stats: {
    xp: number;
    level: number;
    simulated_followers: number;
    profile_visits: number;
    games_played: number;
    daily_streak: number;
    last_daily_claim: string | null;
  };
  item_ids: string[];
  pass_ids: string[];
  followers_real: number;
  following: number;
};

export type DevDiagnostics = {
  server_time: string;
  database_version: string;
  schema_version: string | null;
  counts: Record<string, number>;
  economy: {
    boxcoins_in_circulation: number;
    ledger_total: number;
    ledger_consistent: boolean;
  };
};

export type DevTransaction = Transaction & { username: string };

export type DevAuditEntry = {
  id: number;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
  actor_username: string | null;
  target_user_id: string | null;
  target_username: string | null;
};
