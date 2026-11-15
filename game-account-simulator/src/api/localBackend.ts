import { CATALOG, ITEM_SETS } from '@/content/catalog';
import { GAMES, GAME_PASSES } from '@/content/games';
import { ACHIEVEMENTS, QUESTS } from '@/content/progression';
import type { AvatarConfig, ItemSlot } from '@/content/types';
import { ITEM_SLOTS } from '@/content/types';
import { buildWorld } from '@/content/world';
import {
  activeQuestIndexes,
  addDays,
  computeGameReward,
  dailyRewardForStreak,
  DISPLAY_NAME_COOLDOWN_DAYS,
  levelForXp,
  levelReward,
  MAX_BALANCE,
  MAX_FRIENDS,
  MAX_LIMITED_COPIES,
  MAX_OUTFITS,
  PROFILE_THEME_LEVELS,
  seasonEnd,
  seasonForDate,
  SIGNUP_BONUS,
  USERNAME_CHANGE_COST,
  utcDay,
  xpForLevel,
} from '@/domain/rules';
import { validateDisplayName, validatePassword, validateUsername } from '@/domain/validation';

import type { AdminApi, AuthEvent, Backend, SessionInfo, SignUpInput } from './backend';
import { AppError } from './errors';
import type * as T from './types';

/**
 * Offline backend: a complete on-device simulation of the Blockora server.
 * It follows the same rules as the SQL functions (src/domain/rules.ts is
 * parity-tested against Postgres). Because there is no server, there is no
 * developer authority offline: every admin call is refused.
 */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface LocalDeps {
  store: KeyValueStore;
  uuid: () => string;
  sha256: (s: string) => Promise<string>;
  now?: () => Date;
  persistDelayMs?: number;
}

const DB_KEY = 'blockora.offline.db.v1';
const SESSION_KEY = 'blockora.offline.session.v1';
const DAY_MS = 86_400_000;

interface Account { id: string; email: string; salt: string; hash: string }
interface ProfileRow {
  id: string; username: string; display_name: string; bio: string; status_text: string; profile_theme: string;
  level: number; xp: number; reputation: number; is_npc: boolean; is_test_account: boolean;
  account_status: 'active' | 'suspended'; created_at: string; last_seen_at: string;
  username_changed_at: string | null; display_name_changed_at: string | null;
}
interface Wallet { balance: number; lifetime_earned: number; lifetime_spent: number }
interface Txn extends T.Transaction { user_id: string; idempotency_key: string | null; metadata: Record<string, any> }
interface Inv extends T.InventoryEntry {}
interface Req { id: string; sender_id: string; receiver_id: string; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; created_at: string }
interface Session { id: string; user_id: string; game_id: string; status: 'active' | 'completed' | 'rejected' | 'expired'; perks: Record<string, number>; started_at: string; result: any; orbs: number; duration_ms: number }
interface Stat { plays: number; best_score: number; total_score: number; total_orbs: number; last_played_at: string }
interface Note extends T.AppNotification { user_id: string }
interface Activity extends T.FeedEvent { user_id: string }
interface Streak { current_streak: number; longest_streak: number; last_claim_date: string | null; total_claims: number }

interface DB {
  version: 1;
  accounts: Record<string, Account>;
  profiles: Record<string, ProfileRow>;
  settings: Record<string, T.Settings>;
  wallets: Record<string, Wallet>;
  txns: Txn[];
  inventory: Inv[];
  favorites: string[]; // `${user}|${item}`
  claims: string[]; // `${user}|${set}`
  avatars: Record<string, AvatarConfig>;
  outfits: (T.Outfit & { user_id: string })[];
  stock: Record<string, number>;
  sales: Record<string, number>;
  favCounts: Record<string, number>;
  pricePoints: Record<string, { day: string; avg_price: number; volume: number }[]>;
  gameStats: Record<string, { visits: number; likes: number; dislikes: number; favorites: number }>;
  passes: string[]; // `${user}|${pass}`
  sessions: Session[];
  stats: Record<string, Stat>; // `${user}|${game}`
  votes: Record<string, 1 | -1>;
  gameFavs: string[];
  requests: Req[];
  friendships: string[]; // `${a}|${b}` both directions stored
  follows: string[]; // `${follower}|${followee}`
  blocks: string[]; // `${blocker}|${blocked}`
  notifications: Note[];
  activity: Activity[];
  achievements: Record<string, Record<string, string>>;
  streaks: Record<string, Streak>;
  quests: Record<string, { progress: number; claimed_at: string | null }>; // `${user}|${day}|${key}`
}

const DEFAULT_SETTINGS: T.Settings = {
  inventory_visibility: 'everyone',
  friends_visibility: 'everyone',
  activity_visibility: 'friends',
  allow_friend_requests: true,
  show_online_status: true,
  notify_social: true,
  notify_rewards: true,
};

const fail = (code: string, message: string): never => {
  throw new AppError(code, message);
};

function hashText(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class LocalBackend implements Backend {
  readonly mode = 'offline' as const;
  private db!: DB;
  private ready: Promise<void>;
  private sessionUser: string | null = null;
  private listeners = new Set<(e: AuthEvent, s: SessionInfo | null) => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private catalogById = new Map(CATALOG.map((c) => [c.id, c]));
  private gameById = new Map(GAMES.map((g) => [g.id, g]));

  constructor(private deps: LocalDeps) {
    this.ready = this.load();
  }

  // ── persistence ───────────────────────────────────────────────────────
  private now(): Date {
    return this.deps.now ? this.deps.now() : new Date();
  }
  private iso(offsetMs = 0): string {
    return new Date(this.now().getTime() + offsetMs).toISOString();
  }

  private async load() {
    const raw = await this.deps.store.getItem(DB_KEY).catch(() => null);
    if (raw) {
      try {
        this.db = JSON.parse(raw);
      } catch {
        this.db = this.freshWorld();
      }
    } else {
      this.db = this.freshWorld();
      await this.persistNow();
    }
    const s = await this.deps.store.getItem(SESSION_KEY).catch(() => null);
    if (s && this.db.profiles[s]) this.sessionUser = s;
  }

  private schedulePersist() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => void this.persistNow(), this.deps.persistDelayMs ?? 250);
  }

  async persistNow() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = null;
    // Bound growth so the store stays small on low-end devices.
    if (this.db.sessions.length > 300) this.db.sessions = this.db.sessions.slice(-300);
    if (this.db.activity.length > 600) this.db.activity = this.db.activity.slice(-600);
    if (this.db.notifications.length > 400) this.db.notifications = this.db.notifications.slice(-400);
    await this.deps.store.setItem(DB_KEY, JSON.stringify(this.db));
  }

  private freshWorld(): DB {
    const w = buildWorld();
    const t = this.now().getTime();
    const daysAgo = (d: number) => new Date(t - d * DAY_MS).toISOString();
    const db: DB = {
      version: 1, accounts: {}, profiles: {}, settings: {}, wallets: {}, txns: [], inventory: [], favorites: [], claims: [],
      avatars: {}, outfits: [], stock: {}, sales: {}, favCounts: {}, pricePoints: {}, gameStats: {}, passes: [], sessions: [],
      stats: {}, votes: {}, gameFavs: [], requests: [], friendships: [], follows: [], blocks: [], notifications: [], activity: [],
      achievements: {}, streaks: {}, quests: {},
    };
    CATALOG.forEach((c) => {
      if (c.limited) db.stock[c.id] = c.limited.stock - c.limited.sold;
      db.sales[c.id] = c.limited ? c.limited.sold : c.baseSales ?? 0;
      db.favCounts[c.id] = Math.round(db.sales[c.id] * 0.18);
    });
    GAMES.forEach((g) => (db.gameStats[g.id] = { visits: g.baseVisits, likes: g.baseLikes, dislikes: g.baseDislikes, favorites: g.baseFavorites }));
    const today = utcDay(this.now());
    w.pricePoints.forEach((p) => {
      (db.pricePoints[p.item_id] ??= []).push({ day: addDays(today, -p.days_ago), avg_price: p.avg_price, volume: p.volume });
    });
    w.npcs.forEach((n) => {
      db.profiles[n.id] = {
        id: n.id, username: n.username, display_name: n.display_name, bio: n.bio, status_text: n.status_text,
        profile_theme: n.profile_theme, level: n.level, xp: n.xp, reputation: n.reputation, is_npc: true, is_test_account: false,
        account_status: 'active', created_at: daysAgo(n.age_days), last_seen_at: daysAgo(0), username_changed_at: null, display_name_changed_at: null,
      };
      db.wallets[n.id] = { balance: n.balance, lifetime_earned: n.balance, lifetime_spent: 0 };
      db.avatars[n.id] = n.avatar;
      n.inventory.forEach((i) =>
        db.inventory.push({ id: this.deps.uuid(), user_id: n.id, item_id: i.item_id, serial_number: i.serial_number, acquired_via: 'seed', price_paid: 0, acquired_at: daysAgo(i.age_days) }),
      );
      n.game_stats.forEach((g) => {
        db.stats[`${n.id}|${g.game_id}`] = { plays: g.plays, best_score: g.best_score, total_score: g.total_score, total_orbs: g.total_orbs, last_played_at: new Date(t - g.last_played_hours * 3600000).toISOString() };
      });
      db.achievements[n.id] = Object.fromEntries(n.achievements.map((a) => [a, daysAgo(n.age_days / 2)]));
    });
    w.follows.forEach(([a, b]) => db.follows.push(`${a}|${b}`));
    w.friendships.forEach(([a, b]) => db.friendships.push(`${a}|${b}`, `${b}|${a}`));
    w.activity.forEach((e) => db.activity.push({ id: this.deps.uuid(), user_id: e.user_id, kind: e.kind, data: e.data, created_at: new Date(t - e.minutes_ago * 60000).toISOString() }));
    db.activity.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return db;
  }

  private async uid(): Promise<string> {
    await this.ready;
    if (!this.sessionUser) fail('NOT_AUTHENTICATED', 'Your session ended. Please sign in again.');
    const p = this.db.profiles[this.sessionUser!];
    if (!p) fail('PROFILE_NOT_FOUND', 'Your player profile was not found.');
    if (p.account_status === 'suspended') fail('ACCOUNT_SUSPENDED', 'This account is suspended.');
    return this.sessionUser!;
  }

  private emit(e: AuthEvent) {
    const s = this.sessionUser ? { userId: this.sessionUser, email: this.db.accounts[this.sessionUser]?.email ?? null } : null;
    this.listeners.forEach((l) => l(e, s));
  }

  // ── engine (mirrors the SQL private schema) ───────────────────────────
  private today() {
    return utcDay(this.now());
  }

  private applyCurrency(user: string, amount: number, kind: T.TxnKind, description: string, ref: [string | null, string | null] = [null, null], idem: string | null = null, meta: Record<string, any> = {}) {
    const w = this.db.wallets[user];
    if (!w) fail('WALLET_NOT_FOUND', 'Wallet not found.');
    if (amount === 0) return { balance: w.balance, duplicate: false };
    if (idem) {
      const existing = this.db.txns.find((t) => t.user_id === user && t.idempotency_key === idem);
      if (existing) return { balance: w.balance, duplicate: true, txn: existing };
    }
    const next = w.balance + amount;
    if (next < 0) fail('INSUFFICIENT_FUNDS', `You need ${(-next).toLocaleString('en-US')} more Orbs.`);
    if (next > MAX_BALANCE) fail('BALANCE_LIMIT', 'Balance cannot exceed 1,000,000,000 Orbs.');
    w.balance = next;
    if (amount > 0) w.lifetime_earned += amount;
    else w.lifetime_spent -= amount;
    const txn: Txn = { id: this.deps.uuid(), user_id: user, amount, balance_after: next, kind, description: description.slice(0, 200), reference_type: ref[0], reference_id: ref[1], idempotency_key: idem, metadata: meta, created_at: this.iso() };
    this.db.txns.push(txn);
    return { balance: next, duplicate: false, txn };
  }

  private notify(user: string, kind: T.NotificationKind, title: string, body: string, data: Record<string, any> = {}) {
    const p = this.db.profiles[user];
    if (!p || p.is_npc) return;
    const s = this.db.settings[user] ?? DEFAULT_SETTINGS;
    if (kind === 'new_follower' && !s.notify_social) return;
    if ((kind === 'reward' || kind === 'quest') && !s.notify_rewards) return;
    this.db.notifications.push({ id: this.deps.uuid(), user_id: user, kind, title: title.slice(0, 120), body: body.slice(0, 300), data, read_at: null, created_at: this.iso() });
  }

  private log(user: string, kind: string, data: Record<string, any> = {}) {
    this.db.activity.push({ id: this.deps.uuid(), user_id: user, kind, data, created_at: this.iso() });
  }

  private addXp(user: string, amount: number) {
    const p = this.db.profiles[user];
    if (amount <= 0) return { leveled_up: false };
    p.xp = Math.min(p.xp + amount, 10_000_000);
    const next = levelForXp(p.xp);
    if (next > p.level) {
      let reward = 0;
      for (let l = p.level + 1; l <= next; l++) {
        reward += levelReward(l);
        this.applyCurrency(user, levelReward(l), 'level_reward', `Reached level ${l}`, ['level', String(l)], `level:${l}`);
      }
      p.level = next;
      this.notify(user, 'level_up', `Level ${next} reached!`, `You earned ${reward} Orbs for leveling up.`, { level: next });
      this.log(user, 'level_up', { level: next });
      return { leveled_up: true };
    }
    return { leveled_up: false };
  }

  private activeQuests(day = this.today()) {
    const sorted = [...QUESTS].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
    return activeQuestIndexes(day, sorted.length).map((i) => sorted[i]);
  }

  private bumpQuests(user: string, goal: string, amount: number) {
    if (amount <= 0) return;
    const day = this.today();
    this.activeQuests(day)
      .filter((q) => q.goalType === goal)
      .forEach((q) => {
        const key = `${user}|${day}|${q.key}`;
        const row = (this.db.quests[key] ??= { progress: 0, claimed_at: null });
        const was = row.progress >= q.target;
        row.progress = Math.min(row.progress + amount, q.target);
        if (!was && row.progress >= q.target) this.notify(user, 'quest', `Quest complete: ${q.title}`, `Claim ${q.rewardOrbs} Orbs in Rewards.`, { quest_key: q.key });
      });
  }

  private metrics(user: string): Record<string, number> {
    const inv = this.db.inventory.filter((i) => i.user_id === user);
    const stats = Object.entries(this.db.stats).filter(([k]) => k.startsWith(`${user}|`));
    return {
      joined: 1,
      items_owned: new Set(inv.filter((i) => i.acquired_via !== 'starter').map((i) => i.item_id)).size,
      limited_owned: inv.filter((i) => this.catalogById.get(i.item_id)?.limited).length,
      outfits_saved: this.db.outfits.filter((o) => o.user_id === user).length,
      games_played: stats.reduce((s, [, v]) => s + v.plays, 0),
      distinct_games: stats.filter(([, v]) => v.plays > 0).length,
      friends: this.db.friendships.filter((f) => f.startsWith(`${user}|`)).length,
      followers: this.db.follows.filter((f) => f.endsWith(`|${user}`)).length,
      following: this.db.follows.filter((f) => f.startsWith(`${user}|`)).length,
      streak: this.db.streaks[user]?.longest_streak ?? 0,
      level: this.db.profiles[user].level,
      balance: this.db.wallets[user].balance,
      sets_completed: this.db.claims.filter((c) => c.startsWith(`${user}|`)).length,
      passes_owned: this.db.passes.filter((c) => c.startsWith(`${user}|`)).length,
      purchases: this.db.txns.filter((t) => t.user_id === user && (t.kind === 'purchase' || t.kind === 'gamepass_purchase')).length,
    };
  }

  private bestForEngine(user: string, engine: string) {
    return Math.max(0, ...Object.entries(this.db.stats).filter(([k]) => k.startsWith(`${user}|`) && this.gameById.get(k.split('|')[1])?.engine === engine).map(([, v]) => v.best_score));
  }

  private evaluateAchievements(user: string): T.UnlockedAchievement[] {
    if (this.db.profiles[user]?.is_npc) return [];
    const unlocked: T.UnlockedAchievement[] = [];
    const mine = (this.db.achievements[user] ??= {});
    for (let pass = 0; pass < 4; pass++) {
      let fresh = 0;
      const m = this.metrics(user);
      for (const a of [...ACHIEVEMENTS].sort((x, y) => x.sortOrder - y.sortOrder)) {
        if (mine[a.key]) continue;
        const value = a.metric === 'best_score_engine' ? this.bestForEngine(user, a.engine!) : m[a.metric] ?? 0;
        if (value >= a.target) {
          mine[a.key] = this.iso();
          fresh++;
          if (a.rewardOrbs > 0) this.applyCurrency(user, a.rewardOrbs, 'achievement_reward', `Achievement: ${a.name}`, ['achievement', a.key], `ach:${a.key}`);
          this.addXp(user, a.rewardXp);
          this.notify(user, 'achievement', `Achievement unlocked: ${a.name}`, a.rewardOrbs > 0 ? `+${a.rewardOrbs} Orbs` : a.description, { achievement_key: a.key });
          this.log(user, 'achievement', { key: a.key, name: a.name });
          unlocked.push({ key: a.key, name: a.name, icon: a.icon, reward_orbs: a.rewardOrbs });
        }
      }
      if (!fresh) break;
    }
    return unlocked;
  }

  private checkSets(user: string) {
    const done: { key: string; name: string; reward_orbs: number }[] = [];
    const owned = new Set(this.db.inventory.filter((i) => i.user_id === user).map((i) => i.item_id));
    ITEM_SETS.forEach((s) => {
      if (this.db.claims.includes(`${user}|${s.key}`)) return;
      const members = CATALOG.filter((c) => c.setKey === s.key);
      if (members.length && members.every((c) => owned.has(c.id))) {
        this.db.claims.push(`${user}|${s.key}`);
        this.applyCurrency(user, s.rewardOrbs, 'collection_reward', `Set complete: ${s.name}`, ['item_set', s.key], `set:${s.key}`);
        this.notify(user, 'reward', `Set complete: ${s.name}`, `You collected every item. +${s.rewardOrbs} Orbs`, { set_key: s.key });
        this.log(user, 'set_complete', { set_key: s.key, name: s.name });
        done.push({ key: s.key, name: s.name, reward_orbs: s.rewardOrbs });
      }
    });
    return done;
  }

  private state(user: string): T.EconomyState {
    const p = this.db.profiles[user];
    return { balance: this.db.wallets[user].balance, level: p.level, total_xp: p.xp };
  }

  private isBlocked(a: string, b: string) {
    return this.db.blocks.includes(`${a}|${b}`) || this.db.blocks.includes(`${b}|${a}`);
  }
  private areFriends(a: string, b: string) {
    return this.db.friendships.includes(`${a}|${b}`);
  }
  private canView(owner: string, viewer: string, scope: 'inventory' | 'friends' | 'activity') {
    if (owner === viewer) return true;
    if (this.isBlocked(owner, viewer)) return false;
    const vis = this.db.settings[owner]?.[`${scope}_visibility` as const] ?? 'everyone';
    return vis === 'everyone' || (vis === 'friends' && this.areFriends(owner, viewer));
  }
  private npcOnline(id: string) {
    const d = this.now();
    return hashText(id + d.toISOString().slice(0, 13)) % 3 === 0;
  }
  private card(id: string): T.PlayerCard {
    const p = this.db.profiles[id];
    const s = this.db.settings[id];
    return {
      id: p.id, username: p.username, display_name: p.display_name, level: p.level, is_npc: p.is_npc, profile_theme: p.profile_theme,
      is_online: p.is_npc ? this.npcOnline(p.id) : s?.show_online_status === false ? null : Date.parse(p.last_seen_at) > this.now().getTime() - 5 * 60000,
      avatar: this.db.avatars[id] ?? null,
    };
  }

  private validateAvatar(user: string, c: AvatarConfig): AvatarConfig {
    if (!/^#[0-9A-Fa-f]{6}$/.test(c.skin_tone)) fail('INVALID_AVATAR', 'Invalid skin tone.');
    if (!['classic', 'slim', 'broad'].includes(c.body_type)) fail('INVALID_AVATAR', 'Invalid body type.');
    if (c.height_scale < 0.9 || c.height_scale > 1.1 || c.head_scale < 0.9 || c.head_scale > 1.1) fail('INVALID_AVATAR', 'Body scale out of range.');
    const owned = new Set(this.db.inventory.filter((i) => i.user_id === user).map((i) => i.item_id));
    const equipped: AvatarConfig['equipped'] = {};
    Object.entries(c.equipped ?? {}).forEach(([slot, itemId]) => {
      if (!itemId) return;
      const item = this.catalogById.get(itemId);
      if (!item) fail('ITEM_NOT_FOUND', 'An equipped item does not exist.');
      if (item!.slot !== slot) fail('WRONG_SLOT', 'An item is equipped in the wrong slot.');
      if (!owned.has(itemId)) fail('NOT_OWNED', 'You can only wear items you own.');
      equipped[slot as ItemSlot] = itemId;
    });
    return { skin_tone: c.skin_tone.toUpperCase(), body_type: c.body_type, height_scale: Math.round(c.height_scale * 100) / 100, head_scale: Math.round(c.head_scale * 100) / 100, equipped };
  }

  private toCatalogItem(id: string): T.CatalogItem {
    const c = this.catalogById.get(id)!;
    const t = Date.parse('2026-11-14T00:00:00Z');
    return {
      id: c.id, name: c.name, description: c.description, slot: c.slot, rarity: c.rarity, price: c.price, is_for_sale: c.forSale ?? true,
      is_limited: !!c.limited, stock_total: c.limited?.stock ?? null, stock_remaining: c.limited ? this.db.stock[c.id] : null,
      season_key: c.seasonKey ?? null, set_key: c.setKey ?? null, is_starter: !!c.starter, featured: !!c.featured, creator_name: c.creator ?? 'Blockora Studio',
      asset: c.asset, sales_count: this.db.sales[c.id] ?? 0, favorites_count: this.db.favCounts[c.id] ?? 0, created_at: new Date(t - c.ageDays * DAY_MS).toISOString(),
    };
  }

  private gameCard(id: string): T.GameCard {
    const g = this.gameById.get(id)!;
    const s = this.db.gameStats[id];
    const d = this.now();
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
    const wave = 0.75 + 0.25 * Math.sin((2 * Math.PI * (hour + (hashText(id) % 24))) / 24);
    const active = this.db.sessions.filter((x) => x.game_id === id && x.status === 'active' && Date.parse(x.started_at) > d.getTime() - 600000).length;
    return {
      id: g.id, title: g.title, tagline: g.tagline, genre: g.genre, engine: g.engine, thumbnail: g.thumbnail, creator_name: g.creator,
      visits: s.visits, likes: s.likes, dislikes: s.dislikes, favorites: s.favorites,
      rating: s.likes + s.dislikes === 0 ? null : Math.round((100 * s.likes) / (s.likes + s.dislikes)),
      playing_now: Math.max(0, Math.round(g.baseCcu * wave)) + active, featured: !!g.featured,
      created_at: new Date(Date.parse('2026-11-14T00:00:00Z') - g.ageDays * DAY_MS).toISOString(),
    };
  }

  private requireReasonless(): never {
    return fail('FORBIDDEN', 'The Modify Menu requires an online Blockora server.');
  }

  // ── auth ──────────────────────────────────────────────────────────────
  async getSession() {
    await this.ready;
    return this.sessionUser ? { userId: this.sessionUser, email: this.db.accounts[this.sessionUser]?.email ?? null } : null;
  }
  onAuthChange(cb: (event: AuthEvent, session: SessionInfo | null) => void) {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
  async checkUsername(username: string) {
    await this.ready;
    const v = username.trim();
    if (!validateUsername(v).ok) return { available: false, reason: 'INVALID_USERNAME' };
    const taken = Object.values(this.db.profiles).some((p) => p.username.toLowerCase() === v.toLowerCase());
    return { available: !taken, reason: taken ? 'USERNAME_TAKEN' : null };
  }
  async signUp(input: SignUpInput) {
    await this.ready;
    const email = input.email.trim().toLowerCase();
    const pw = validatePassword(input.password);
    if (!pw.ok) fail('WEAK_PASSWORD', pw.message);
    if (Object.values(this.db.accounts).some((a) => a.email === email)) fail('EMAIL_TAKEN', 'An account with this email already exists on this device.');
    const avail = await this.checkUsername(input.username);
    if (!avail.available) fail(avail.reason!, avail.reason === 'USERNAME_TAKEN' ? 'That username is already taken.' : 'Usernames are 3–20 letters, numbers and at most one underscore.');
    const id = this.deps.uuid();
    const salt = this.deps.uuid();
    this.db.accounts[id] = { id, email, salt, hash: await this.deps.sha256(`${salt}:${input.password}`) };
    const username = input.username.trim();
    const display = validateDisplayName(input.displayName).ok ? input.displayName.trim() : username;
    const now = this.iso();
    this.db.profiles[id] = { id, username, display_name: display, bio: '', status_text: '', profile_theme: 'default', level: 1, xp: 0, reputation: 0, is_npc: false, is_test_account: false, account_status: 'active', created_at: now, last_seen_at: now, username_changed_at: null, display_name_changed_at: null };
    this.db.settings[id] = { ...DEFAULT_SETTINGS };
    this.db.wallets[id] = { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };
    this.db.streaks[id] = { current_streak: 0, longest_streak: 0, last_claim_date: null, total_claims: 0 };
    this.applyCurrency(id, SIGNUP_BONUS, 'signup_bonus', 'Welcome bonus', ['account', id], 'signup');
    const starters = CATALOG.filter((c) => c.starter);
    starters.forEach((c) => this.db.inventory.push({ id: this.deps.uuid(), user_id: id, item_id: c.id, serial_number: null, acquired_via: 'starter', price_paid: 0, acquired_at: now }));
    const equipped: AvatarConfig['equipped'] = {};
    ITEM_SLOTS.forEach((slot) => {
      const opts = starters.filter((c) => c.slot === slot).map((c) => c.id).sort();
      if (opts.length) equipped[slot] = opts[hashText(id + slot) % opts.length];
    });
    const tones = ['#F2C9A0', '#E0AC69', '#C68642', '#8D5524', '#FFDBB4', '#A86B3C'];
    this.db.avatars[id] = { skin_tone: tones[hashText(id) % tones.length], body_type: 'classic', height_scale: 1, head_scale: 1, equipped };
    this.notify(id, 'system', 'Welcome to Blockora!', 'You received 750 Orbs to get started. Orbs are simulated and have no real-world value.');
    this.log(id, 'joined');
    this.evaluateAchievements(id);
    this.sessionUser = id;
    await this.deps.store.setItem(SESSION_KEY, id);
    await this.persistNow();
    this.emit('SIGNED_IN');
    return { needsEmailConfirmation: false };
  }
  async signIn(email: string, password: string) {
    await this.ready;
    const acct = Object.values(this.db.accounts).find((a) => a.email === email.trim().toLowerCase());
    if (!acct || (await this.deps.sha256(`${acct.salt}:${password}`)) !== acct.hash) fail('INVALID_CREDENTIALS', 'Incorrect email or password.');
    this.sessionUser = acct!.id;
    await this.deps.store.setItem(SESSION_KEY, acct!.id);
    this.emit('SIGNED_IN');
  }
  async signOut() {
    await this.ready;
    this.sessionUser = null;
    await this.deps.store.removeItem(SESSION_KEY);
    await this.persistNow();
    this.emit('SIGNED_OUT');
  }
  async requestPasswordReset(): Promise<void> {
    fail('OFFLINE_ONLY', 'Offline accounts are stored only on this device, so there is no email to send a reset link to.');
  }
  async verifyRecoveryCode(): Promise<void> {
    fail('OFFLINE_ONLY', 'Password recovery needs an online account.');
  }
  async updatePassword(newPassword: string) {
    const id = await this.uid();
    const pw = validatePassword(newPassword);
    if (!pw.ok) fail('WEAK_PASSWORD', pw.message);
    const acct = this.db.accounts[id];
    acct.salt = this.deps.uuid();
    acct.hash = await this.deps.sha256(`${acct.salt}:${newPassword}`);
    this.schedulePersist();
  }
  async resendConfirmation() {}

  // ── account ───────────────────────────────────────────────────────────
  async getMe(): Promise<T.Me> {
    const id = await this.uid();
    const p = this.db.profiles[id];
    p.last_seen_at = this.iso();
    const s = this.db.streaks[id];
    const today = this.today();
    const nextStreak = s.last_claim_date === addDays(today, -1) ? s.current_streak + 1 : s.last_claim_date === today ? s.current_streak : 1;
    const d = this.now();
    return {
      profile: {
        id, username: p.username, display_name: p.display_name, bio: p.bio, status_text: p.status_text, profile_theme: p.profile_theme,
        level: p.level, xp: p.xp, xp_for_level: xpForLevel(p.level), xp_for_next: xpForLevel(Math.min(p.level + 1, 100)), reputation: p.reputation,
        is_test_account: p.is_test_account, created_at: p.created_at, username_changed_at: p.username_changed_at, display_name_changed_at: p.display_name_changed_at,
      },
      wallet: { ...this.db.wallets[id] },
      settings: { ...(this.db.settings[id] ?? DEFAULT_SETTINGS) },
      avatar: this.db.avatars[id],
      daily: {
        current_streak: s.current_streak, longest_streak: s.longest_streak, can_claim: s.last_claim_date !== today,
        next_reward: dailyRewardForStreak(nextStreak), next_streak: nextStreak,
        next_claim_at: s.last_claim_date === today ? `${addDays(today, 1)}T00:00:00.000Z` : null,
        cycle: [1, 2, 3, 4, 5, 6, 7].map(dailyRewardForStreak),
      },
      access: { is_developer: false, role: null },
      counts: {
        unread_notifications: this.db.notifications.filter((n) => n.user_id === id && !n.read_at).length,
        pending_friend_requests: this.db.requests.filter((r) => r.receiver_id === id && r.status === 'pending').length,
        friends: this.db.friendships.filter((f) => f.startsWith(`${id}|`)).length,
        followers: this.db.follows.filter((f) => f.endsWith(`|${id}`)).length,
        following: this.db.follows.filter((f) => f.startsWith(`${id}|`)).length,
      },
      season: { key: seasonForDate(d), ends_at: seasonEnd(d).toISOString() },
    };
  }
  async touchPresence() {
    const id = await this.uid().catch(() => null);
    if (id) this.db.profiles[id].last_seen_at = this.iso();
  }
  async updateProfile(i: { display_name: string; bio: string; status_text: string; profile_theme: string }) {
    const id = await this.uid();
    const p = this.db.profiles[id];
    const display = i.display_name.trim();
    const v = validateDisplayName(display);
    if (!v.ok) fail('INVALID_DISPLAY_NAME', v.message);
    if (display !== p.display_name && p.display_name_changed_at && Date.parse(p.display_name_changed_at) > this.now().getTime() - DISPLAY_NAME_COOLDOWN_DAYS * DAY_MS) {
      fail('DISPLAY_NAME_COOLDOWN', `You can change your display name again on ${new Date(Date.parse(p.display_name_changed_at) + 7 * DAY_MS).toDateString().slice(4, 10)}.`);
    }
    if (i.bio.length > 500) fail('BIO_TOO_LONG', 'Bios can be up to 500 characters.');
    if (i.status_text.length > 60) fail('STATUS_TOO_LONG', 'Status can be up to 60 characters.');
    const req = PROFILE_THEME_LEVELS[i.profile_theme];
    if (!req) fail('INVALID_THEME', 'Unknown profile theme.');
    if (p.level < req) fail('THEME_LOCKED', `This theme unlocks at level ${req}.`);
    if (display !== p.display_name) p.display_name_changed_at = this.iso();
    Object.assign(p, { display_name: display, bio: i.bio, status_text: i.status_text.trim(), profile_theme: i.profile_theme });
    this.schedulePersist();
  }
  async changeUsername(newUsername: string, key: string) {
    const id = await this.uid();
    const p = this.db.profiles[id];
    const v = newUsername.trim();
    if (v === p.username) fail('SAME_USERNAME', 'That is already your username.');
    let cost = USERNAME_CHANGE_COST;
    if (v.toLowerCase() === p.username.toLowerCase()) cost = 0;
    else {
      const a = await this.checkUsername(v);
      if (!a.available) fail(a.reason!, a.reason === 'USERNAME_TAKEN' ? 'That username is already taken.' : 'Usernames are 3–20 letters, numbers and at most one underscore.');
    }
    if (cost) {
      const r = this.applyCurrency(id, -cost, 'username_change', `Username change to @${v}`, ['profile', id], `username:${key}`);
      if (r.duplicate) return { username: p.username, cost, ...this.state(id) };
    }
    p.username = v;
    p.username_changed_at = this.iso();
    this.schedulePersist();
    return { username: v, cost, ...this.state(id) };
  }
  async updateSettings(patch: Partial<T.Settings>) {
    const id = await this.uid();
    this.db.settings[id] = { ...(this.db.settings[id] ?? DEFAULT_SETTINGS), ...patch };
    this.schedulePersist();
    return { ...this.db.settings[id] };
  }
  async claimDailyReward(): Promise<T.DailyClaimResult> {
    const id = await this.uid();
    const today = this.today();
    const s = this.db.streaks[id];
    if (s.last_claim_date === today) fail('ALREADY_CLAIMED', "You already claimed today's reward. Come back tomorrow!");
    const streak = s.last_claim_date === addDays(today, -1) ? s.current_streak + 1 : 1;
    const reward = dailyRewardForStreak(streak);
    this.applyCurrency(id, reward, 'daily_reward', `Daily reward (day ${streak})`, ['daily', today], `daily:${today}`);
    Object.assign(s, { current_streak: streak, longest_streak: Math.max(s.longest_streak, streak), last_claim_date: today, total_claims: s.total_claims + 1 });
    const xp = this.addXp(id, 15);
    this.bumpQuests(id, 'daily_claimed', 1);
    const unlocked = this.evaluateAchievements(id);
    this.schedulePersist();
    return { reward, streak, next_reward: dailyRewardForStreak(streak + 1), leveled_up: xp.leveled_up, unlocked, ...this.state(id) };
  }
  async getDailyQuests(): Promise<T.DailyQuests> {
    const id = await this.uid();
    const day = this.today();
    return {
      day,
      resets_at: `${addDays(day, 1)}T00:00:00.000Z`,
      quests: this.activeQuests(day).map((q) => {
        const row = this.db.quests[`${id}|${day}|${q.key}`];
        const progress = row?.progress ?? 0;
        return { key: q.key, title: q.title, description: q.description, goal_type: q.goalType, target: q.target, reward_orbs: q.rewardOrbs, reward_xp: q.rewardXp, progress, completed: progress >= q.target, claimed: !!row?.claimed_at };
      }),
    };
  }
  async claimQuest(key: string) {
    const id = await this.uid();
    const day = this.today();
    const q = this.activeQuests(day).find((x) => x.key === key);
    if (!q) fail('QUEST_NOT_ACTIVE', 'This quest is not active today.');
    const row = this.db.quests[`${id}|${day}|${key}`];
    if (!row || row.progress < q!.target) fail('QUEST_INCOMPLETE', 'Finish the quest before claiming.');
    if (row.claimed_at) fail('ALREADY_CLAIMED', 'Reward already claimed.');
    row.claimed_at = this.iso();
    this.applyCurrency(id, q!.rewardOrbs, 'quest_reward', `Quest: ${q!.title}`, ['quest', key], `quest:${day}:${key}`);
    this.addXp(id, q!.rewardXp);
    const unlocked = this.evaluateAchievements(id);
    this.schedulePersist();
    return { reward: q!.rewardOrbs, unlocked, ...this.state(id) };
  }
  async getAchievements(): Promise<T.AchievementProgress[]> {
    const id = await this.uid();
    const m = this.metrics(id);
    const mine = this.db.achievements[id] ?? {};
    return [...ACHIEVEMENTS].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => ({
      key: a.key, name: a.name, description: a.description, icon: a.icon, category: a.category, target: a.target, reward_orbs: a.rewardOrbs, reward_xp: a.rewardXp,
      is_secret: !!a.isSecret, unlocked_at: mine[a.key] ?? null,
      progress: Math.min(a.target, a.metric === 'best_score_engine' ? this.bestForEngine(id, a.engine!) : m[a.metric] ?? 0),
    }));
  }
  async getAnalytics(): Promise<T.Analytics> {
    const id = await this.uid();
    const txns = this.db.txns.filter((t) => t.user_id === id);
    const earned: Record<string, number> = {};
    const spent: Record<string, number> = {};
    txns.forEach((t) => {
      if (t.amount > 0) earned[t.kind] = (earned[t.kind] ?? 0) + t.amount;
      else spent[t.kind] = (spent[t.kind] ?? 0) - t.amount;
    });
    const today = this.today();
    const stats = Object.entries(this.db.stats).filter(([k]) => k.startsWith(`${id}|`));
    const genre: Record<string, number> = {};
    stats.forEach(([k, v]) => {
      const g = this.gameById.get(k.split('|')[1])!;
      genre[g.genre] = (genre[g.genre] ?? 0) + v.plays;
    });
    const inv = this.db.inventory.filter((i) => i.user_id === id);
    return {
      earned_by_kind: earned, spent_by_kind: spent,
      last_7_days: [6, 5, 4, 3, 2, 1, 0].map((n) => {
        const day = addDays(today, -n);
        const dayTx = txns.filter((t) => t.created_at.slice(0, 10) === day);
        return { day, earned: dayTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), spent: -dayTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0) };
      }),
      favorite_genre: Object.entries(genre).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      total_plays: stats.reduce((s, [, v]) => s + v.plays, 0),
      play_time_ms: this.db.sessions.filter((s) => s.user_id === id && s.status === 'completed').reduce((s, x) => s + Math.min(x.duration_ms, 3600000), 0),
      items_owned: inv.length,
      collection_value: inv.reduce((s, i) => s + (this.catalogById.get(i.item_id)?.price ?? 0), 0),
      achievements_unlocked: Object.keys(this.db.achievements[id] ?? {}).length,
      achievements_total: ACHIEVEMENTS.length,
      member_days: Math.floor((this.now().getTime() - Date.parse(this.db.profiles[id].created_at)) / DAY_MS),
    };
  }
  async listTransactions(page: number, pageSize: number, kind?: T.TxnKind | null) {
    const id = await this.uid();
    return this.db.txns
      .filter((t) => t.user_id === id && (!kind || t.kind === kind))
      .slice()
      .reverse()
      .slice(page * pageSize, (page + 1) * pageSize)
      .map(({ user_id, idempotency_key, metadata, ...t }) => t);
  }
  async listNotifications(page: number, pageSize: number) {
    const id = await this.uid();
    return this.db.notifications.filter((n) => n.user_id === id).slice().reverse().slice(page * pageSize, (page + 1) * pageSize);
  }
  async markNotificationsRead(ids?: string[]) {
    const id = await this.uid();
    this.db.notifications.forEach((n) => {
      if (n.user_id === id && !n.read_at && (!ids || ids.includes(n.id))) n.read_at = this.iso();
    });
    this.schedulePersist();
  }
  async deleteNotification(nid: string) {
    const id = await this.uid();
    this.db.notifications = this.db.notifications.filter((n) => !(n.id === nid && n.user_id === id));
    this.schedulePersist();
  }

  // ── marketplace ───────────────────────────────────────────────────────
  async getCatalog() {
    await this.ready;
    return CATALOG.map((c) => this.toCatalogItem(c.id));
  }
  async getItemSets() {
    return ITEM_SETS.map((s) => ({ key: s.key, name: s.name, description: s.description, reward_orbs: s.rewardOrbs, sort_order: s.sortOrder }));
  }
  async searchCatalog(q: T.CatalogQuery) {
    await this.ready;
    const season = seasonForDate(this.now());
    const groups: Record<string, string[]> = { clothing: ['shirt', 'pants', 'shoes'], accessories: ['hat', 'face_accessory', 'neck', 'back'], avatar: ['hair', 'face'] };
    let items = CATALOG.map((c) => this.toCatalogItem(c.id)).filter((c) => c.is_for_sale && (!c.season_key || c.season_key === season));
    if (groups[q.category]) items = items.filter((c) => groups[q.category].includes(c.slot));
    if (q.category === 'collectibles') items = items.filter((c) => c.is_limited);
    if (q.category === 'special') items = items.filter((c) => c.season_key || c.rarity === 'legendary' || c.rarity === 'mythic');
    if (q.slot) items = items.filter((c) => c.slot === q.slot);
    if (q.rarity) items = items.filter((c) => c.rarity === q.rarity);
    if (q.maxPrice != null) items = items.filter((c) => c.price <= q.maxPrice!);
    const term = q.search?.trim().toLowerCase();
    if (term) items = items.filter((c) => c.name.toLowerCase().includes(term));
    const cmp: Record<T.MarketSort, (a: T.CatalogItem, b: T.CatalogItem) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sales_count - a.sales_count,
      popular: (a, b) => b.sales_count - a.sales_count,
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      favorites: (a, b) => b.favorites_count - a.favorites_count,
    };
    items.sort((a, b) => cmp[q.sort](a, b) || a.id.localeCompare(b.id));
    const start = q.page * q.pageSize;
    return { items: items.slice(start, start + q.pageSize), hasMore: items.length > start + q.pageSize };
  }
  async getItem(itemId: string): Promise<T.ItemDetail> {
    const id = await this.uid();
    if (!this.catalogById.has(itemId)) fail('ITEM_NOT_FOUND', 'This item no longer exists.');
    const item = this.toCatalogItem(itemId);
    const set = item.set_key ? ITEM_SETS.find((s) => s.key === item.set_key)! : null;
    return {
      item,
      owned_copies: this.db.inventory.filter((i) => i.user_id === id && i.item_id === itemId).map((i) => ({ id: i.id, serial_number: i.serial_number, acquired_at: i.acquired_at })),
      favorited: this.db.favorites.includes(`${id}|${itemId}`),
      price_points: (this.db.pricePoints[itemId] ?? []).slice(-30),
      set: set ? { key: set.key, name: set.name, description: set.description, reward_orbs: set.rewardOrbs, sort_order: set.sortOrder, items: CATALOG.filter((c) => c.setKey === set.key).map((c) => c.id) } : null,
    };
  }
  async purchaseItem(itemId: string, expectedPrice: number, key: string): Promise<T.PurchaseResult> {
    const id = await this.uid();
    if (!key || key.length < 8) fail('INVALID_REQUEST', 'Missing purchase token.');
    const idem = `purchase:${key}`;
    const dup = this.db.txns.find((t) => t.user_id === id && t.idempotency_key === idem);
    if (dup) return { status: 'duplicate', item_id: itemId, inventory_item_id: dup.metadata.inventory_item_id ?? null, serial_number: dup.metadata.serial_number ?? null, unlocked: [], sets_completed: [], ...this.state(id) };
    const c = this.catalogById.get(itemId);
    if (!c) fail('ITEM_NOT_FOUND', 'This item no longer exists.');
    if (c!.forSale === false) fail('NOT_FOR_SALE', 'This item is not for sale.');
    if (c!.seasonKey && c!.seasonKey !== seasonForDate(this.now())) fail('OFF_SEASON', 'This seasonal item is not available right now.');
    if (expectedPrice !== c!.price) fail('PRICE_CHANGED', `The price changed to ${c!.price} Orbs. Please review and try again.`);
    const copies = this.db.inventory.filter((i) => i.user_id === id && i.item_id === itemId).length;
    if (c!.limited) {
      if (this.db.stock[itemId] <= 0) fail('SOLD_OUT', 'This limited item is sold out.');
      if (copies >= MAX_LIMITED_COPIES) fail('COPY_LIMIT', 'You can own up to 3 copies of a limited item.');
    } else if (copies > 0) fail('ALREADY_OWNED', 'You already own this item.');
    if (this.db.wallets[id].balance < c!.price) fail('INSUFFICIENT_FUNDS', `You need ${(c!.price - this.db.wallets[id].balance).toLocaleString('en-US')} more Orbs.`);
    let serial: number | null = null;
    if (c!.limited) {
      this.db.stock[itemId] -= 1;
      serial = c!.limited.stock - this.db.stock[itemId];
    }
    const invId = this.deps.uuid();
    this.db.inventory.push({ id: invId, user_id: id, item_id: itemId, serial_number: serial, acquired_via: 'purchase', price_paid: c!.price, acquired_at: this.iso() });
    if (c!.price > 0) this.applyCurrency(id, -c!.price, 'purchase', `Purchased ${c!.name}`, ['catalog_item', itemId], idem, { inventory_item_id: invId, serial_number: serial });
    this.db.sales[itemId] = (this.db.sales[itemId] ?? 0) + 1;
    const pts = (this.db.pricePoints[itemId] ??= []);
    const today = this.today();
    const last = pts[pts.length - 1];
    if (last?.day === today) {
      last.avg_price = Math.floor((last.avg_price * last.volume + c!.price) / (last.volume + 1));
      last.volume += 1;
    } else pts.push({ day: today, avg_price: c!.price, volume: 1 });
    this.log(id, 'purchase', { item_id: itemId, name: c!.name, rarity: c!.rarity });
    const xp = this.addXp(id, Math.min(50, 5 + Math.floor(c!.price / 100)));
    this.bumpQuests(id, 'items_bought', 1);
    const sets = this.checkSets(id);
    const unlocked = this.evaluateAchievements(id);
    this.schedulePersist();
    return { status: 'ok', item_id: itemId, inventory_item_id: invId, serial_number: serial, unlocked, sets_completed: sets, leveled_up: xp.leveled_up, ...this.state(id) };
  }
  async toggleItemFavorite(itemId: string) {
    const id = await this.uid();
    const k = `${id}|${itemId}`;
    const has = this.db.favorites.includes(k);
    this.db.favorites = has ? this.db.favorites.filter((x) => x !== k) : [...this.db.favorites, k];
    this.db.favCounts[itemId] = Math.max(0, (this.db.favCounts[itemId] ?? 0) + (has ? -1 : 1));
    this.schedulePersist();
    return { favorited: !has, favorites_count: this.db.favCounts[itemId] };
  }
  async listFavoriteItemIds() {
    const id = await this.uid();
    return this.db.favorites.filter((f) => f.startsWith(`${id}|`)).map((f) => f.split('|')[1]);
  }
  async listInventory(userId: string) {
    const id = await this.uid();
    if (!this.canView(userId, id, 'inventory')) return [];
    return this.db.inventory.filter((i) => i.user_id === userId).slice().reverse();
  }
  async getSetClaims() {
    const id = await this.uid();
    return this.db.claims.filter((c) => c.startsWith(`${id}|`)).map((c) => c.split('|')[1]);
  }

  // ── avatar ────────────────────────────────────────────────────────────
  async saveAvatar(config: AvatarConfig) {
    const id = await this.uid();
    const v = this.validateAvatar(id, config);
    this.db.avatars[id] = v;
    this.schedulePersist();
    return v;
  }
  async listOutfits() {
    const id = await this.uid();
    return this.db.outfits.filter((o) => o.user_id === id).slice().reverse();
  }
  async saveOutfit(name: string, config: AvatarConfig, isPublic: boolean) {
    const id = await this.uid();
    const n = name.trim();
    if (n.length < 1 || n.length > 30) fail('INVALID_NAME', 'Outfit names are 1-30 characters.');
    if (this.db.outfits.filter((o) => o.user_id === id).length >= MAX_OUTFITS) fail('OUTFIT_LIMIT', 'You can save up to 50 outfits.');
    const v = this.validateAvatar(id, config);
    const oid = this.deps.uuid();
    this.db.outfits.push({ ...v, id: oid, user_id: id, name: n, is_public: isPublic, created_at: this.iso(), updated_at: this.iso() });
    if (isPublic) this.log(id, 'outfit_shared', { outfit_id: oid, name: n });
    this.bumpQuests(id, 'outfit_actions', 1);
    const unlocked = this.evaluateAchievements(id);
    this.schedulePersist();
    return { id: oid, unlocked };
  }
  async updateOutfit(oid: string, name: string, isPublic: boolean, config?: AvatarConfig) {
    const id = await this.uid();
    const o = this.db.outfits.find((x) => x.id === oid && x.user_id === id);
    if (!o) fail('OUTFIT_NOT_FOUND', 'Outfit not found.');
    if (config) Object.assign(o!, this.validateAvatar(id, config));
    Object.assign(o!, { name: name.trim().slice(0, 30), is_public: isPublic, updated_at: this.iso() });
    this.schedulePersist();
  }
  async deleteOutfit(oid: string) {
    const id = await this.uid();
    const before = this.db.outfits.length;
    this.db.outfits = this.db.outfits.filter((o) => !(o.id === oid && o.user_id === id));
    if (this.db.outfits.length === before) fail('OUTFIT_NOT_FOUND', 'Outfit not found.');
    this.schedulePersist();
  }
  async wearOutfit(oid: string) {
    const id = await this.uid();
    const o = this.db.outfits.find((x) => x.id === oid && (x.user_id === id || (x.is_public && !this.isBlocked(x.user_id, id))));
    if (!o) fail('OUTFIT_NOT_FOUND', 'Outfit not found.');
    const owned = new Set(this.db.inventory.filter((i) => i.user_id === id).map((i) => i.item_id));
    const missing = Object.values(o!.equipped).filter((x): x is string => !!x && !owned.has(x)).map((x) => ({ item_id: x, name: this.catalogById.get(x)!.name, price: this.catalogById.get(x)!.price }));
    if (missing.length) return { status: 'missing_items' as const, missing };
    await this.saveAvatar(o!);
    this.bumpQuests(id, 'outfit_actions', 1);
    return { status: 'ok' as const, missing: [] };
  }

  // ── games ─────────────────────────────────────────────────────────────
  async getDiscover(): Promise<T.Discover> {
    const id = await this.uid();
    const cards = GAMES.map((g) => this.gameCard(g.id));
    const mine = (gid: string) => this.db.stats[`${id}|${gid}`];
    const total = GAMES.reduce((s, g) => s + (mine(g.id)?.plays ?? 0), 0);
    const genrePlays = (genre: string) => GAMES.filter((g) => g.genre === genre).reduce((s, g) => s + (mine(g.id)?.plays ?? 0), 0);
    const day = this.today();
    const trend = (c: T.GameCard) => {
      const seed = this.gameById.get(c.id)!.trendSeed;
      const t = this.now().getTime();
      return seed + this.db.sessions.filter((s) => s.game_id === c.id && s.status === 'completed' && Date.parse(s.started_at) > t - 7 * DAY_MS).reduce((acc, s) => acc + Math.exp(-(t - Date.parse(s.started_at)) / 3600000 / 36), 0);
    };
    const friendIds = this.db.friendships.filter((f) => f.startsWith(`${id}|`)).map((f) => f.split('|')[1]);
    const ratio = (c: T.GameCard) => c.likes / Math.max(c.likes + c.dislikes, 1);
    return {
      featured: GAMES.filter((g) => g.featured).sort((a, b) => a.sortOrder - b.sortOrder).map((g) => this.gameCard(g.id)),
      recommended: [...cards]
        .map((c) => ({ c, s: (genrePlays(c.genre) * 2) / Math.max(total, 1) + ratio(c) + (mine(c.id) ? -0.4 : 0.25) + (hashText(c.id + id + day) % 100) / 1000 }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c),
      trending: [...cards].map((c) => ({ ...c, trend_score: Math.round(trend(c) * 100) / 100 })).sort((a, b) => (b.trend_score ?? 0) - (a.trend_score ?? 0)),
      popular: [...cards].sort((a, b) => b.visits - a.visits),
      top_rated: [...cards].sort((a, b) => ratio(b) - ratio(a)),
      new: [...cards].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      continue_playing: cards.filter((c) => mine(c.id)).sort((a, b) => mine(b.id)!.last_played_at.localeCompare(mine(a.id)!.last_played_at)).map((c) => ({ ...c, best_score: mine(c.id)!.best_score })),
      friends_playing: cards
        .map((c) => ({ c, f: friendIds.filter((f) => this.db.stats[`${f}|${c.id}`] && Date.parse(this.db.stats[`${f}|${c.id}`].last_played_at) > this.now().getTime() - 14 * DAY_MS) }))
        .filter((x) => x.f.length)
        .map((x) => ({ ...x.c, friends: x.f.length })),
      genres: [...new Set(GAMES.map((g) => g.genre))].sort(),
    };
  }
  async getGame(gid: string): Promise<T.GameDetail> {
    const id = await this.uid();
    const g = this.gameById.get(gid);
    if (!g) fail('GAME_NOT_FOUND', 'This game does not exist.');
    const stats = this.db.stats[`${id}|${gid}`];
    const dayStart = `${this.today()}T00:00:00.000Z`;
    return {
      ...this.gameCard(gid),
      description: g!.description, config: g!.config, updated_at: new Date(Date.parse('2026-11-14T00:00:00Z') - Math.max(1, Math.floor(g!.ageDays / 6)) * DAY_MS).toISOString(),
      score_per_orb: g!.scorePerOrb, max_orbs_per_session: g!.maxOrbsPerSession, daily_orb_cap: g!.dailyOrbCap,
      orbs_today: this.db.sessions.filter((s) => s.user_id === id && s.game_id === gid && s.status === 'completed' && s.started_at >= dayStart).reduce((a, s) => a + s.orbs, 0),
      passes: GAME_PASSES.filter((p) => p.gameId === gid).sort((a, b) => a.price - b.price).map((p) => ({
        id: p.id, name: p.name, description: p.description, price: p.price, perk_type: p.perkType, perk_value: p.perkValue, icon: p.icon, sales_count: p.baseSales, owned: this.db.passes.includes(`${id}|${p.id}`),
      })),
      my_stats: stats ? { plays: stats.plays, best_score: stats.best_score, total_orbs: stats.total_orbs, last_played_at: stats.last_played_at } : null,
      my_vote: this.db.votes[`${id}|${gid}`] ?? null,
      is_favorite: this.db.gameFavs.includes(`${id}|${gid}`),
    };
  }
  async getLeaderboard(gid: string, limit = 25): Promise<T.Leaderboard> {
    const id = await this.uid();
    const rows = Object.entries(this.db.stats)
      .filter(([k, v]) => k.endsWith(`|${gid}`) && v.best_score > 0 && this.db.profiles[k.split('|')[0]]?.account_status === 'active')
      .map(([k, v]) => ({ user: k.split('|')[0], best: v.best_score }))
      .sort((a, b) => b.best - a.best);
    const rankOf = (score: number) => 1 + rows.filter((r) => r.best > score).length;
    const mine = this.db.stats[`${id}|${gid}`];
    return {
      entries: rows.slice(0, limit).map((r) => ({ rank: rankOf(r.best), best_score: r.best, user: this.card(r.user), is_me: r.user === id })),
      me: mine ? { best_score: mine.best_score, rank: rankOf(mine.best_score) } : null,
    };
  }
  async rateGame(gid: string, vote: 1 | -1 | null) {
    const id = await this.uid();
    if (!this.db.stats[`${id}|${gid}`]?.plays) fail('PLAY_FIRST', 'Play this game before rating it.');
    const k = `${id}|${gid}`;
    const old = this.db.votes[k];
    const s = this.db.gameStats[gid];
    if (old === 1) s.likes--;
    if (old === -1) s.dislikes--;
    if (vote === 1) s.likes++;
    if (vote === -1) s.dislikes++;
    if (vote) this.db.votes[k] = vote;
    else delete this.db.votes[k];
    this.schedulePersist();
    return { my_vote: vote, likes: s.likes, dislikes: s.dislikes };
  }
  async toggleGameFavorite(gid: string) {
    const id = await this.uid();
    const k = `${id}|${gid}`;
    const has = this.db.gameFavs.includes(k);
    this.db.gameFavs = has ? this.db.gameFavs.filter((x) => x !== k) : [...this.db.gameFavs, k];
    this.db.gameStats[gid].favorites += has ? -1 : 1;
    this.schedulePersist();
    return { favorited: !has, favorites: this.db.gameStats[gid].favorites };
  }
  async listGamePasses(): Promise<T.GamePassListing[]> {
    const id = await this.uid();
    return [...GAME_PASSES].sort((a, b) => a.price - b.price).map((p) => {
      const g = this.gameById.get(p.gameId)!;
      return { id: p.id, name: p.name, description: p.description, price: p.price, perk_type: p.perkType, perk_value: p.perkValue, icon: p.icon, sales_count: p.baseSales, owned: this.db.passes.includes(`${id}|${p.id}`), game_id: g.id, game_title: g.title, thumbnail: g.thumbnail };
    });
  }
  async purchaseGamePass(passId: string, expectedPrice: number, key: string) {
    const id = await this.uid();
    const idem = `pass:${key}`;
    if (this.db.txns.some((t) => t.user_id === id && t.idempotency_key === idem)) return { status: 'duplicate', unlocked: [], ...this.state(id) };
    const p = GAME_PASSES.find((x) => x.id === passId);
    if (!p) fail('PASS_NOT_FOUND', 'This game pass does not exist.');
    if (expectedPrice !== p!.price) fail('PRICE_CHANGED', `The price changed to ${p!.price} Orbs.`);
    if (this.db.passes.includes(`${id}|${passId}`)) fail('ALREADY_OWNED', 'You already own this game pass.');
    const game = this.gameById.get(p!.gameId)!;
    this.applyCurrency(id, -p!.price, 'gamepass_purchase', `Game pass: ${p!.name} (${game.title})`, ['game_pass', passId], idem);
    this.db.passes.push(`${id}|${passId}`);
    this.log(id, 'pass_purchase', { pass_id: passId, name: p!.name, game_id: game.id, game_title: game.title });
    this.addXp(id, Math.min(50, 5 + Math.floor(p!.price / 100)));
    this.bumpQuests(id, 'items_bought', 1);
    const unlocked = this.evaluateAchievements(id);
    this.schedulePersist();
    return { status: 'ok', unlocked, ...this.state(id) };
  }
  async startGameSession(gid: string): Promise<T.GameSession> {
    const id = await this.uid();
    const g = this.gameById.get(gid);
    if (!g) fail('GAME_NOT_FOUND', 'This game does not exist.');
    const perks: Record<string, number> = {};
    GAME_PASSES.filter((p) => p.gameId === gid && this.db.passes.includes(`${id}|${p.id}`)).forEach((p) => (perks[p.perkType] = Math.max(perks[p.perkType] ?? 0, p.perkValue)));
    const s: Session = { id: this.deps.uuid(), user_id: id, game_id: gid, status: 'active', perks, started_at: this.iso(), result: null, orbs: 0, duration_ms: 0 };
    this.db.sessions.push(s);
    return { session_id: s.id, game_id: gid, engine: g!.engine, config: g!.config, perks, started_at: s.started_at };
  }
  async submitGameScore(sid: string, score: number, durationMs: number, _stats: Record<string, unknown> = {}): Promise<T.ScoreResult> {
    const id = await this.uid();
    const s = this.db.sessions.find((x) => x.id === sid && x.user_id === id);
    if (!s) fail('SESSION_NOT_FOUND', 'Game session not found.');
    if (s!.status === 'completed') return { ...s!.result, status: 'duplicate', ...this.state(id) };
    if (s!.status !== 'active') fail('SESSION_CLOSED', 'This game session has ended.');
    const g = this.gameById.get(s!.game_id)!;
    const elapsed = (this.now().getTime() - Date.parse(s!.started_at)) / 1000;
    const dayStart = `${this.today()}T00:00:00.000Z`;
    const today = this.db.sessions.filter((x) => x.user_id === id && x.game_id === g.id && x.status === 'completed' && x.started_at >= dayStart).reduce((a, x) => a + x.orbs, 0);
    const r = computeGameReward({ score, elapsedSeconds: elapsed, scorePerOrb: g.scorePerOrb, maxOrbsPerSession: g.maxOrbsPerSession, dailyOrbCap: g.dailyOrbCap, orbsEarnedToday: today, maxScorePerSecond: g.maxScorePerSecond, scoreGrace: g.scoreGrace, xpPerPlay: g.xpPerPlay, orbMultiplier: s!.perks.orb_multiplier, xpMultiplier: s!.perks.xp_multiplier });
    if (r.status === 'rejected') {
      s!.status = 'rejected';
      this.schedulePersist();
      return { status: 'rejected', reason: r.reason, orbs: 0, xp: 0, ...this.state(id) };
    }
    const key = `${id}|${g.id}`;
    const prev = this.db.stats[key];
    const first = !prev;
    const newBest = first || score > prev.best_score;
    this.db.stats[key] = { plays: (prev?.plays ?? 0) + 1, best_score: Math.max(prev?.best_score ?? 0, score), total_score: (prev?.total_score ?? 0) + score, total_orbs: (prev?.total_orbs ?? 0) + r.orbs, last_played_at: this.iso() };
    this.db.gameStats[g.id].visits++;
    if (r.orbs > 0) this.applyCurrency(id, r.orbs, 'game_reward', `${g.title} reward`, ['game_session', sid], `game:${sid}`, { game_id: g.id, score });
    const xp = this.addXp(id, r.xp);
    if (first) {
      this.log(id, 'game_played', { game_id: g.id, title: g.title });
      this.bumpQuests(id, 'new_games_played', 1);
    } else if (newBest && score > 0) this.log(id, 'new_best', { game_id: g.id, title: g.title, score });
    this.bumpQuests(id, 'games_played', 1);
    this.bumpQuests(id, 'game_orbs_earned', r.orbs);
    const unlocked = this.evaluateAchievements(id);
    const result = { status: 'ok' as const, score, orbs: r.orbs, xp: r.xp, orb_multiplier: s!.perks.orb_multiplier ?? 1, daily_cap_reached: r.dailyCapReached, is_new_best: newBest, best_score: Math.max(score, prev?.best_score ?? 0), leveled_up: xp.leveled_up, unlocked };
    Object.assign(s!, { status: 'completed', result, orbs: r.orbs, duration_ms: durationMs });
    this.schedulePersist();
    return { ...result, ...this.state(id) };
  }

  // ── social ────────────────────────────────────────────────────────────
  private target(uid: string) {
    const p = this.db.profiles[uid];
    if (!p) fail('USER_NOT_FOUND', 'That player does not exist.');
    return p;
  }
  private makeFriends(a: string, b: string) {
    if (!this.areFriends(a, b)) this.db.friendships.push(`${a}|${b}`, `${b}|${a}`);
    this.log(a, 'friend', { user_id: b });
    this.log(b, 'friend', { user_id: a });
  }
  async getProfile(username: string): Promise<T.PublicProfile> {
    const id = await this.uid();
    const p = Object.values(this.db.profiles).find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!p) fail('USER_NOT_FOUND', 'That player does not exist.');
    if (p!.id !== id && this.db.blocks.includes(`${p!.id}|${id}`)) fail('USER_UNAVAILABLE', 'This profile is unavailable.');
    const pid = p!.id;
    const inv = this.canView(pid, id, 'inventory');
    const stats = Object.entries(this.db.stats).filter(([k]) => k.startsWith(`${pid}|`));
    const owned = this.db.inventory.filter((i) => i.user_id === pid);
    return {
      card: this.card(pid),
      profile: { id: pid, username: p!.username, display_name: p!.display_name, bio: p!.bio, status_text: p!.status_text, profile_theme: p!.profile_theme, level: p!.level, xp: p!.xp, reputation: p!.reputation, is_npc: p!.is_npc, created_at: p!.created_at, account_status: p!.account_status },
      counts: {
        friends: this.db.friendships.filter((f) => f.startsWith(`${pid}|`)).length,
        followers: this.db.follows.filter((f) => f.endsWith(`|${pid}`)).length,
        following: this.db.follows.filter((f) => f.startsWith(`${pid}|`)).length,
        items: inv ? owned.length : null,
        games_played: stats.reduce((s, [, v]) => s + v.plays, 0),
        achievements: Object.keys(this.db.achievements[pid] ?? {}).length,
      },
      relationship: {
        is_self: pid === id, is_friend: this.areFriends(id, pid), is_following: this.db.follows.includes(`${id}|${pid}`), follows_you: this.db.follows.includes(`${pid}|${id}`),
        outgoing_request_id: this.db.requests.find((r) => r.sender_id === id && r.receiver_id === pid && r.status === 'pending')?.id ?? null,
        incoming_request_id: this.db.requests.find((r) => r.sender_id === pid && r.receiver_id === id && r.status === 'pending')?.id ?? null,
        is_blocked: this.db.blocks.includes(`${id}|${pid}`),
      },
      visibility: { inventory: inv, friends: this.canView(pid, id, 'friends'), activity: this.canView(pid, id, 'activity') },
      badges: Object.entries(this.db.achievements[pid] ?? {}).sort((a, b) => b[1].localeCompare(a[1])).map(([key, at]) => {
        const a = ACHIEVEMENTS.find((x) => x.key === key)!;
        return { key, name: a?.name ?? key, icon: a?.icon ?? 'star', unlocked_at: at };
      }),
      top_games: stats.sort((a, b) => b[1].plays - a[1].plays || b[1].best_score - a[1].best_score).slice(0, 6).map(([k, v]) => {
        const g = this.gameById.get(k.split('|')[1])!;
        return { game_id: g.id, title: g.title, plays: v.plays, best_score: v.best_score, thumbnail: g.thumbnail };
      }),
      favorite_games: this.db.gameFavs.filter((f) => f.startsWith(`${pid}|`)).map((f) => f.split('|')[1]),
      showcase: inv ? [...new Set(owned.map((i) => i.item_id))].sort((a, b) => (this.catalogById.get(b)?.price ?? 0) - (this.catalogById.get(a)?.price ?? 0)).slice(0, 12) : null,
      public_outfits: this.db.outfits.filter((o) => o.user_id === pid && o.is_public),
    };
  }
  async searchUsers(query: string) {
    const id = await this.uid();
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return Object.values(this.db.profiles)
      .filter((p) => (p.username.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q)) && p.account_status === 'active' && !this.db.blocks.includes(`${p.id}|${id}`))
      .map((p) => ({ p, rank: p.username.toLowerCase() === q ? 0 : p.username.toLowerCase().startsWith(q) ? 1 : 2 }))
      .sort((a, b) => a.rank - b.rank || b.p.level - a.p.level)
      .slice(0, 30)
      .map(({ p }) => ({ ...this.card(p.id), is_friend: this.areFriends(id, p.id), followers: this.db.follows.filter((f) => f.endsWith(`|${p.id}`)).length }));
  }
  async listConnections(userId: string, kind: 'friends' | 'followers' | 'following', page: number, pageSize: number) {
    const id = await this.uid();
    if (!this.canView(userId, id, 'friends')) fail('PRIVATE_LIST', 'This player keeps their connections private.');
    const ids =
      kind === 'friends'
        ? this.db.friendships.filter((f) => f.startsWith(`${userId}|`)).map((f) => f.split('|')[1])
        : kind === 'followers'
          ? this.db.follows.filter((f) => f.endsWith(`|${userId}`)).map((f) => f.split('|')[0])
          : this.db.follows.filter((f) => f.startsWith(`${userId}|`)).map((f) => f.split('|')[1]);
    return ids
      .filter((o) => !this.isBlocked(id, o) && this.db.profiles[o])
      .reverse()
      .slice(page * pageSize, (page + 1) * pageSize)
      .map((o) => ({ ...this.card(o), since: this.iso(), is_friend: this.areFriends(id, o), is_following: this.db.follows.includes(`${id}|${o}`) }));
  }
  async listFriendRequests() {
    const id = await this.uid();
    const pending = this.db.requests.filter((r) => r.status === 'pending');
    return {
      incoming: pending.filter((r) => r.receiver_id === id).reverse().map((r) => ({ id: r.id, created_at: r.created_at, user: this.card(r.sender_id) })),
      outgoing: pending.filter((r) => r.sender_id === id).reverse().map((r) => ({ id: r.id, created_at: r.created_at, user: this.card(r.receiver_id) })),
    };
  }
  async sendFriendRequest(target: string) {
    const id = await this.uid();
    if (target === id) fail('INVALID_TARGET', 'You cannot friend yourself.');
    const t = this.target(target);
    if (this.isBlocked(id, target)) fail('USER_UNAVAILABLE', 'You cannot interact with this player.');
    if (this.areFriends(id, target)) fail('ALREADY_FRIENDS', 'You are already friends.');
    if (this.db.friendships.filter((f) => f.startsWith(`${id}|`)).length >= MAX_FRIENDS) fail('FRIEND_LIMIT', 'You have reached the 1,000 friend limit.');
    const me = this.db.profiles[id];
    const reverse = this.db.requests.find((r) => r.sender_id === target && r.receiver_id === id && r.status === 'pending');
    if (reverse || t.is_npc) {
      if (reverse) reverse.status = 'accepted';
      else this.db.requests.push({ id: this.deps.uuid(), sender_id: id, receiver_id: target, status: 'accepted', created_at: this.iso() });
      this.makeFriends(id, target);
      if (t.is_npc) this.notify(id, 'friend_accepted', `${t.display_name} accepted your friend request`, `@${t.username}`, { user_id: target, username: t.username });
      else this.notify(target, 'friend_accepted', `${me.display_name} accepted your friend request`, `@${me.username}`, { user_id: id, username: me.username });
      this.bumpQuests(id, 'social_actions', 1);
      const unlocked = this.evaluateAchievements(id);
      this.schedulePersist();
      return { status: 'friends' as const, unlocked };
    }
    if (this.db.requests.some((r) => r.sender_id === id && r.receiver_id === target && r.status === 'pending')) fail('REQUEST_PENDING', 'Your friend request is already pending.');
    if (this.db.settings[target]?.allow_friend_requests === false) fail('NOT_ACCEPTING', 'This player is not accepting friend requests.');
    const req: Req = { id: this.deps.uuid(), sender_id: id, receiver_id: target, status: 'pending', created_at: this.iso() };
    this.db.requests.push(req);
    this.notify(target, 'friend_request', `${me.display_name} sent you a friend request`, `@${me.username}`, { user_id: id, username: me.username, request_id: req.id });
    this.bumpQuests(id, 'social_actions', 1);
    this.schedulePersist();
    return { status: 'pending' as const, unlocked: [] };
  }
  async respondFriendRequest(rid: string, accept: boolean) {
    const id = await this.uid();
    const r = this.db.requests.find((x) => x.id === rid && x.receiver_id === id && x.status === 'pending');
    if (!r) fail('REQUEST_NOT_FOUND', 'This friend request is no longer available.');
    r!.status = accept ? 'accepted' : 'declined';
    if (accept) {
      this.makeFriends(id, r!.sender_id);
      const me = this.db.profiles[id];
      this.notify(r!.sender_id, 'friend_accepted', `${me.display_name} accepted your friend request`, `@${me.username}`, { user_id: id });
      this.evaluateAchievements(id);
    }
    this.schedulePersist();
  }
  async cancelFriendRequest(rid: string) {
    const id = await this.uid();
    const r = this.db.requests.find((x) => x.id === rid && x.sender_id === id && x.status === 'pending');
    if (!r) fail('REQUEST_NOT_FOUND', 'This friend request is no longer pending.');
    r!.status = 'cancelled';
    this.schedulePersist();
  }
  async removeFriend(target: string) {
    const id = await this.uid();
    this.db.friendships = this.db.friendships.filter((f) => f !== `${id}|${target}` && f !== `${target}|${id}`);
    this.schedulePersist();
  }
  async follow(target: string) {
    const id = await this.uid();
    if (target === id) fail('INVALID_TARGET', 'You cannot follow yourself.');
    const t = this.target(target);
    if (this.isBlocked(id, target)) fail('USER_UNAVAILABLE', 'You cannot interact with this player.');
    if (this.db.follows.includes(`${id}|${target}`)) return { followed_back: false };
    this.db.follows.push(`${id}|${target}`);
    let back = false;
    if (t.is_npc && hashText(id + target) % 2 === 0 && !this.db.follows.includes(`${target}|${id}`)) {
      this.db.follows.push(`${target}|${id}`);
      back = true;
      this.notify(id, 'new_follower', `${t.display_name} followed you back`, `@${t.username}`, { user_id: target, username: t.username });
    }
    if (!t.is_npc) {
      const me = this.db.profiles[id];
      this.notify(target, 'new_follower', `${me.display_name} started following you`, `@${me.username}`, { user_id: id, username: me.username });
    }
    this.bumpQuests(id, 'social_actions', 1);
    this.evaluateAchievements(id);
    this.schedulePersist();
    return { followed_back: back };
  }
  async unfollow(target: string) {
    const id = await this.uid();
    this.db.follows = this.db.follows.filter((f) => f !== `${id}|${target}`);
    this.schedulePersist();
  }
  async block(target: string) {
    const id = await this.uid();
    if (target === id) fail('INVALID_TARGET', 'You cannot block yourself.');
    this.target(target);
    if (!this.db.blocks.includes(`${id}|${target}`)) this.db.blocks.push(`${id}|${target}`);
    this.db.friendships = this.db.friendships.filter((f) => f !== `${id}|${target}` && f !== `${target}|${id}`);
    this.db.follows = this.db.follows.filter((f) => f !== `${id}|${target}` && f !== `${target}|${id}`);
    this.db.requests.forEach((r) => {
      if (r.status === 'pending' && ((r.sender_id === id && r.receiver_id === target) || (r.sender_id === target && r.receiver_id === id))) r.status = 'cancelled';
    });
    this.schedulePersist();
  }
  async unblock(target: string) {
    const id = await this.uid();
    this.db.blocks = this.db.blocks.filter((b) => b !== `${id}|${target}`);
    this.schedulePersist();
  }
  async listBlocked() {
    const id = await this.uid();
    return this.db.blocks.filter((b) => b.startsWith(`${id}|`)).map((b) => ({ ...this.card(b.split('|')[1]), since: this.iso() }));
  }
  async report(target: string) {
    const id = await this.uid();
    if (target === id) fail('INVALID_TARGET', 'You cannot report yourself.');
    this.target(target);
    // Offline: there are no moderators; the report is acknowledged locally.
  }
  async getFeed(limit = 40) {
    const id = await this.uid();
    const circle = new Set([id, ...this.db.friendships.filter((f) => f.startsWith(`${id}|`)).map((f) => f.split('|')[1]), ...this.db.follows.filter((f) => f.startsWith(`${id}|`)).map((f) => f.split('|')[1])]);
    const since = this.now().getTime() - 30 * DAY_MS;
    return this.db.activity
      .filter((e) => circle.has(e.user_id) && Date.parse(e.created_at) > since && this.canView(e.user_id, id, 'activity'))
      .slice(-limit)
      .reverse()
      .map(({ user_id, ...e }) => ({ ...e, user: this.card(user_id) }));
  }
  async getUserActivity(userId: string) {
    const id = await this.uid();
    if (!this.canView(userId, id, 'activity')) fail('PRIVATE_LIST', 'This player keeps their activity private.');
    return this.db.activity.filter((e) => e.user_id === userId).slice(-30).reverse().map(({ user_id, ...e }) => e);
  }

  // ── developer: never available offline ────────────────────────────────
  async getAccess() {
    return { is_developer: false, role: null };
  }
  readonly admin: AdminApi = new Proxy({} as AdminApi, {
    // Every admin method rejects; `then` stays undefined so the object is never mistaken for a promise.
    get: (_t, prop) => (prop === 'then' || typeof prop === 'symbol' ? undefined : async () => this.requireReasonless()),
  });
}
