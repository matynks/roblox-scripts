import type { AvatarConfig, GameEngine, GameThumbnail, ItemAsset, ItemSlot, PerkType, Rarity, SeasonKey } from '@/content/types';

export type { AvatarConfig, ItemSlot, Rarity };
export type Visibility = 'everyone' | 'friends' | 'nobody';

export interface PlayerCard {
  id: string;
  username: string;
  display_name: string;
  level: number;
  is_npc: boolean;
  profile_theme: string;
  is_online: boolean | null;
  avatar: AvatarConfig | null;
}

export interface Settings {
  inventory_visibility: Visibility;
  friends_visibility: Visibility;
  activity_visibility: Visibility;
  allow_friend_requests: boolean;
  show_online_status: boolean;
  notify_social: boolean;
  notify_rewards: boolean;
}

export interface Me {
  profile: {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    status_text: string;
    profile_theme: string;
    level: number;
    xp: number;
    xp_for_level: number;
    xp_for_next: number;
    reputation: number;
    is_test_account: boolean;
    created_at: string;
    username_changed_at: string | null;
    display_name_changed_at: string | null;
  };
  wallet: { balance: number; lifetime_earned: number; lifetime_spent: number };
  settings: Settings;
  avatar: AvatarConfig;
  daily: {
    current_streak: number;
    longest_streak: number;
    can_claim: boolean;
    next_reward: number;
    next_streak: number;
    next_claim_at: string | null;
    cycle: number[];
  };
  access: { is_developer: boolean; role: 'developer' | 'owner' | null };
  counts: { unread_notifications: number; pending_friend_requests: number; friends: number; followers: number; following: number };
  season: { key: SeasonKey; ends_at: string };
}

export interface UnlockedAchievement {
  key: string;
  name: string;
  icon: string;
  reward_orbs: number;
}

export interface EconomyState {
  balance: number;
  level: number;
  total_xp: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  rarity: Rarity;
  price: number;
  is_for_sale: boolean;
  is_limited: boolean;
  stock_total: number | null;
  stock_remaining: number | null;
  season_key: SeasonKey | null;
  set_key: string | null;
  is_starter: boolean;
  featured: boolean;
  creator_name: string;
  asset: ItemAsset;
  sales_count: number;
  favorites_count: number;
  created_at: string;
}

export interface ItemSet {
  key: string;
  name: string;
  description: string;
  reward_orbs: number;
  sort_order: number;
}

export type MarketCategory = 'all' | 'clothing' | 'accessories' | 'avatar' | 'collectibles' | 'special';
export type MarketSort = 'featured' | 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'favorites';

export interface CatalogQuery {
  category: MarketCategory;
  slot?: ItemSlot | null;
  rarity?: Rarity | null;
  search?: string;
  sort: MarketSort;
  maxPrice?: number | null;
  page: number;
  pageSize: number;
}

export interface ItemDetail {
  item: CatalogItem;
  owned_copies: { id: string; serial_number: number | null; acquired_at: string }[];
  favorited: boolean;
  price_points: { day: string; avg_price: number; volume: number }[];
  set: (ItemSet & { items: string[] }) | null;
}

export interface InventoryEntry {
  id: string;
  user_id: string;
  item_id: string;
  serial_number: number | null;
  acquired_via: string;
  price_paid: number;
  acquired_at: string;
}

export interface PurchaseResult extends EconomyState {
  status: 'ok' | 'duplicate';
  item_id: string;
  inventory_item_id: string | null;
  serial_number: number | null;
  unlocked: UnlockedAchievement[];
  sets_completed: { key: string; name: string; reward_orbs: number }[];
  leveled_up?: boolean;
}

export interface Outfit extends AvatarConfig {
  id: string;
  user_id?: string;
  name: string;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TxnKind =
  | 'signup_bonus'
  | 'daily_reward'
  | 'purchase'
  | 'gamepass_purchase'
  | 'game_reward'
  | 'achievement_reward'
  | 'quest_reward'
  | 'level_reward'
  | 'collection_reward'
  | 'username_change'
  | 'admin_adjustment'
  | 'refund';

export interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  kind: TxnKind;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export type NotificationKind =
  | 'system'
  | 'friend_request'
  | 'friend_accepted'
  | 'new_follower'
  | 'purchase'
  | 'reward'
  | 'achievement'
  | 'level_up'
  | 'quest'
  | 'admin';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export interface GameCard {
  id: string;
  title: string;
  tagline: string;
  genre: string;
  engine: GameEngine;
  thumbnail: GameThumbnail;
  creator_name: string;
  visits: number;
  likes: number;
  dislikes: number;
  favorites: number;
  rating: number | null;
  playing_now: number;
  featured: boolean;
  created_at: string;
  best_score?: number;
  friends?: number;
  trend_score?: number;
}

export interface GamePass {
  id: string;
  name: string;
  description: string;
  price: number;
  perk_type: PerkType;
  perk_value: number;
  icon: { glyph: string; color: string };
  sales_count: number;
  owned: boolean;
}

export interface GamePassListing extends GamePass {
  game_id: string;
  game_title: string;
  thumbnail: GameThumbnail;
}

export interface GameDetail extends GameCard {
  description: string;
  config: Record<string, any>;
  updated_at: string;
  score_per_orb: number;
  max_orbs_per_session: number;
  daily_orb_cap: number;
  orbs_today: number;
  passes: GamePass[];
  my_stats: { plays: number; best_score: number; total_orbs: number; last_played_at: string } | null;
  my_vote: 1 | -1 | null;
  is_favorite: boolean;
}

export interface Discover {
  featured: GameCard[];
  recommended: GameCard[];
  trending: GameCard[];
  popular: GameCard[];
  top_rated: GameCard[];
  new: GameCard[];
  continue_playing: GameCard[];
  friends_playing: GameCard[];
  genres: string[];
}

export interface LeaderboardEntry {
  rank: number;
  best_score: number;
  user: PlayerCard;
  is_me: boolean;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  me: { best_score: number; rank: number } | null;
}

export interface GameSession {
  session_id: string;
  game_id: string;
  engine: GameEngine;
  config: Record<string, any>;
  perks: Partial<Record<PerkType, number>>;
  started_at: string;
}

export interface ScoreResult extends EconomyState {
  status: 'ok' | 'rejected' | 'duplicate';
  reason?: string;
  score?: number;
  orbs: number;
  xp: number;
  orb_multiplier?: number;
  daily_cap_reached?: boolean;
  is_new_best?: boolean;
  best_score?: number;
  leveled_up?: boolean;
  unlocked?: UnlockedAchievement[];
}

export interface Relationship {
  is_self: boolean;
  is_friend: boolean;
  is_following: boolean;
  follows_you: boolean;
  outgoing_request_id: string | null;
  incoming_request_id: string | null;
  is_blocked: boolean;
}

export interface PublicProfile {
  card: PlayerCard;
  profile: {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    status_text: string;
    profile_theme: string;
    level: number;
    xp: number;
    reputation: number;
    is_npc: boolean;
    created_at: string;
    account_status: string;
  };
  counts: { friends: number; followers: number; following: number; items: number | null; games_played: number; achievements: number };
  relationship: Relationship;
  visibility: { inventory: boolean; friends: boolean; activity: boolean };
  badges: { key: string; name: string; icon: string; unlocked_at: string }[];
  top_games: { game_id: string; title: string; plays: number; best_score: number; thumbnail: GameThumbnail }[];
  favorite_games: string[];
  showcase: string[] | null;
  public_outfits: Outfit[];
}

export interface Connection extends PlayerCard {
  since: string;
  is_friend: boolean;
  is_following: boolean;
}

export interface FriendRequest {
  id: string;
  created_at: string;
  user: PlayerCard;
}

export interface FeedEvent {
  id: string;
  kind: string;
  data: Record<string, any>;
  created_at: string;
  user?: PlayerCard;
}

export interface Quest {
  key: string;
  title: string;
  description: string;
  goal_type: string;
  target: number;
  reward_orbs: number;
  reward_xp: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyQuests {
  day: string;
  resets_at: string;
  quests: Quest[];
}

export interface AchievementProgress {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  target: number;
  reward_orbs: number;
  reward_xp: number;
  is_secret: boolean;
  unlocked_at: string | null;
  progress: number;
}

export interface Analytics {
  earned_by_kind: Record<string, number>;
  spent_by_kind: Record<string, number>;
  last_7_days: { day: string; earned: number; spent: number }[];
  favorite_genre: string | null;
  total_plays: number;
  play_time_ms: number;
  items_owned: number;
  collection_value: number;
  achievements_unlocked: number;
  achievements_total: number;
  member_days: number;
}

export interface DailyClaimResult extends EconomyState {
  reward: number;
  streak: number;
  next_reward: number;
  leveled_up: boolean;
  unlocked: UnlockedAchievement[];
}

// ── Developer (Modify Menu) ──────────────────────────────────────────────
export interface AdminAccountRow {
  id: string;
  username: string;
  display_name: string;
  level: number;
  xp: number;
  reputation: number;
  is_npc: boolean;
  is_test_account: boolean;
  account_status: 'active' | 'suspended';
  created_at: string;
  last_seen_at: string;
  balance: number | null;
  role: 'developer' | 'owner' | null;
  email: string | null;
}

export interface AdminAccountDetail {
  account: AdminAccountRow;
  profile: { bio: string; status_text: string; profile_theme: string; terms_accepted_at: string | null; username_changed_at: string | null };
  wallet: { balance: number; lifetime_earned: number; lifetime_spent: number; updated_at: string } | null;
  metrics: Record<string, number>;
  settings: Partial<Settings> | null;
  streak: { current_streak: number; longest_streak: number; last_claim_date: string | null; total_claims: number } | null;
  avatar: AvatarConfig | null;
  game_stats: { game_id: string; title: string; plays: number; best_score: number; total_orbs: number; last_played_at: string }[];
  passes: { pass_id: string; name: string; acquired_via: string; acquired_at: string }[];
  achievements: string[];
  rejected_sessions: number;
  reports_against: number;
}

export interface AdminInventoryRow {
  id: string;
  item_id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  serial_number: number | null;
  acquired_via: string;
  price_paid: number;
  acquired_at: string;
  asset: ItemAsset;
}

export interface AdminTransactionRow extends Transaction {
  user_id: string;
  username: string;
  actor_id: string | null;
  actor_username: string | null;
  metadata: Record<string, any>;
}

export interface AuditLogRow {
  id: number;
  action: string;
  reason: string;
  target_type: string | null;
  target_id: string | null;
  before: any;
  after: any;
  created_at: string;
  actor_id: string | null;
  actor_username: string | null;
  target_user_id: string | null;
  target_username: string | null;
}

export interface DiagnosticCheck {
  key: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface SystemStatus {
  server_time: string;
  schema_version: string;
  season: SeasonKey;
  database_size_mb: number;
  accounts: Record<string, number>;
  economy: Record<string, number>;
  games: Record<string, number>;
  content: Record<string, number>;
  moderation: Record<string, number>;
  audit: Record<string, number>;
}

export interface AdminReport {
  id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  reporter: AdminAccountRow;
  target: AdminAccountRow;
}

export interface AdminCatalogLookup {
  items: { id: string; name: string; slot: ItemSlot; rarity: Rarity; price: number; is_limited: boolean; stock_remaining: number | null; asset: ItemAsset }[];
  sets: { key: string; name: string }[];
  passes: { id: string; name: string; game_title: string }[];
}
