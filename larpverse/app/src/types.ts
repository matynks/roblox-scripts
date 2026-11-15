export type Asset = { style: string; colors: string[]; glow?: boolean; pattern?: string };
export type AvatarItem = Asset & { id: number; slot: string };
export type BodyColors = { head: string; torso: string; leftArm: string; rightArm: string; leftLeg: string; rightLeg: string };
export type AvatarSpec = { bodyColors: BodyColors; bodyType: string; items: AvatarItem[] };

export type BadgeChip = { key: string; name: string; label: string; icon: string; color: string; kind: string };
export type Presence = { status: 'online' | 'offline' | 'in_experience'; experienceId?: number; experienceName?: string; sessionId?: number; lastOnlineAt?: number };

export type AccountCard = {
  id: number;
  username: string;
  displayName: string;
  picture: string | null;
  avatar: AvatarSpec;
  badges: BadgeChip[];
  verified: boolean;
  presence: Presence;
  status: string;
  isFictional?: boolean;
  isCurrent?: boolean;
  balance?: number;
};

export type Item = {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  slot: string;
  asset: Asset;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  isLimited: boolean;
  stock: number | null;
  remaining: number | null;
  soldCount: number;
  onSale: boolean;
  isFeatured: boolean;
  isArchived: boolean;
  creatorId: number | null;
  thumbnail: string | null;
  tags: string[];
  bundleItemIds: number[];
  owned?: boolean;
  equipped?: boolean;
  favorite?: boolean;
  favorites?: number;
  serial?: number | null;
  acquiredAt?: number | null;
  source?: string | null;
};

export type ExperienceArt = { palette: string[]; motif: string; tagline?: string };

export type Experience = {
  id: number;
  name: string;
  description: string;
  genre: string;
  art: ExperienceArt;
  thumbnail: string | null;
  engine: 'larp' | 'showcase';
  defaultScenarioId: number | null;
  maxPlayers: number;
  isFeatured: boolean;
  status: string;
  creator: AccountCard | null;
  group: { id: number; name: string } | null;
  visits: number;
  likes: number;
  dislikes: number;
  rating: number | null;
  favorites: number;
  playing: number;
  livePlaying: number;
  isFavorite: boolean;
  myVote: number;
  createdAt: number;
  updatedAt: number;
};

export type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: any;
  actor: AccountCard | null;
  read: boolean;
  createdAt: number;
};

export type Me = {
  user: { id: number; username: string; staffRole: string; mfaEnabled: boolean; permissions: string[] };
  account: AccountCard & { isPrimary: boolean; isFictional: boolean; createdAt: number };
  accounts: AccountCard[];
  wallet: { balance: number };
  unreadNotifications: number;
  elevatedUntil: number | null;
  settings: { privacy: Record<string, any>; notifications: Record<string, boolean>; preferences: Record<string, any> };
  perks: { verified: boolean; featuredCreator: boolean; hostLimitBonus: number; freeGroups: boolean };
  config: {
    platform: { name: string; currencyName: string; currencySymbol: string; motd: string };
    economy: { dailyReward: number; usernameChangeCost: number; groupCreateCost: number; refundWindowMinutes: number; maxAltAccounts: number };
  };
};

export type Paged<T> = { items: T[]; nextOffset: number | null };

export type Group = {
  id: number;
  name: string;
  description: string;
  emblem: { shape: string; color: string; accent: string; symbol: string };
  isPublic: boolean;
  members: number;
  owner: AccountCard | null;
  shout: { text: string; at: number } | null;
  myRank: string | null;
  createdAt: number;
};

export type Role = {
  id: number; key: string; name: string; description: string; color: string; icon: string; permissions: string[];
  salary: number; workZone: string | null; maxPerSession: number | null; isDefault: boolean; hostOnly: boolean;
};

export type GameItem = { id: number; key: string; name: string; description: string; icon: string; price: number; soldIn: string | null; effect: any };

export type SessionSummary = {
  id: number; name: string; status: 'lobby' | 'active' | 'paused' | 'ended'; privacy: string; experienceId: number;
  scenario: { id: number; key: string; name: string } | null; host: { id: number; username: string; displayName: string } | null;
  players: number; connected: number; maxPlayers: number; settings: any; accessCode?: string; createdAt: number; startedAt: number | null;
  endedAt: number | null; elapsedMs: number | null; summary?: any;
};
