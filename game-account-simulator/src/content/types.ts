export type ItemSlot =
  | 'hair'
  | 'face'
  | 'hat'
  | 'face_accessory'
  | 'neck'
  | 'back'
  | 'shirt'
  | 'pants'
  | 'shoes';

export const ITEM_SLOTS: ItemSlot[] = [
  'hair',
  'face',
  'hat',
  'face_accessory',
  'neck',
  'back',
  'shirt',
  'pants',
  'shoes',
];

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export type Pattern = 'none' | 'stripes' | 'dots' | 'emblem' | 'zigzag' | 'stars' | 'checker' | 'flames';

export interface ItemAsset {
  shape: string;
  primary: string;
  secondary?: string;
  accent?: string;
  pattern?: Pattern;
  glow?: boolean;
}

export type SeasonKey = 'frostbyte' | 'bloom' | 'solar' | 'neon_harvest';

export interface ItemSetSeed {
  key: string;
  name: string;
  description: string;
  rewardOrbs: number;
  sortOrder: number;
}

export interface CatalogItemSeed {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  rarity: Rarity;
  price: number;
  asset: ItemAsset;
  forSale?: boolean;
  limited?: { stock: number; sold: number };
  seasonKey?: SeasonKey;
  setKey?: string;
  starter?: boolean;
  featured?: boolean;
  creator?: string;
  tags?: string[];
  /** days before content release that the item was "published" (drives New sorting) */
  ageDays: number;
  /** seeded lifetime sales for non-limited items (popularity sorting) */
  baseSales?: number;
}

export type GameEngine = 'orb_rush' | 'stacker' | 'glyph_match' | 'reflex';
export type PerkType = 'orb_multiplier' | 'xp_multiplier' | 'extra_life' | 'time_bonus' | 'hint' | 'precision';

export interface GameThumbnail {
  from: string;
  to: string;
  emblem: string;
  accent: string;
}

export interface GameSeed {
  id: string;
  title: string;
  tagline: string;
  description: string;
  genre: string;
  engine: GameEngine;
  config: Record<string, number | string | boolean>;
  thumbnail: GameThumbnail;
  creator: string;
  scorePerOrb: number;
  maxOrbsPerSession: number;
  dailyOrbCap: number;
  maxScorePerSecond: number;
  scoreGrace: number;
  xpPerPlay: number;
  baseVisits: number;
  baseLikes: number;
  baseDislikes: number;
  baseFavorites: number;
  baseCcu: number;
  trendSeed: number;
  featured?: boolean;
  sortOrder: number;
  ageDays: number;
}

export interface GamePassSeed {
  id: string;
  gameId: string;
  name: string;
  description: string;
  price: number;
  perkType: PerkType;
  perkValue: number;
  icon: { glyph: string; color: string };
  baseSales: number;
}

export interface AchievementSeed {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'account' | 'collection' | 'games' | 'social' | 'progression';
  metric: string;
  target: number;
  engine?: GameEngine;
  rewardOrbs: number;
  rewardXp: number;
  isSecret?: boolean;
  sortOrder: number;
}

export type QuestGoal =
  | 'games_played'
  | 'game_orbs_earned'
  | 'items_bought'
  | 'social_actions'
  | 'new_games_played'
  | 'outfit_actions'
  | 'daily_claimed';

export interface QuestSeed {
  key: string;
  title: string;
  description: string;
  goalType: QuestGoal;
  target: number;
  rewardOrbs: number;
  rewardXp: number;
  sortOrder: number;
}

export interface AvatarConfig {
  skin_tone: string;
  body_type: 'classic' | 'slim' | 'broad';
  height_scale: number;
  head_scale: number;
  equipped: Partial<Record<ItemSlot, string>>;
}
