import { CATALOG } from './catalog';
import { GAMES } from './games';
import type { AvatarConfig, GameEngine, ItemSlot } from './types';

/**
 * Deterministic generator for the simulated community (NPC players).
 * The same seed always produces the same world, so the Supabase migration and
 * the offline backend contain identical players.
 */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (r: Rng, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
function shuffle<T>(r: Rng, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uuidFrom(r: Rng): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const xpForLevel = (level: number) => 50 * level * (level - 1);

const NPC_SEEDS: [string, string, string][] = [
  ['PixelPioneer', 'Pixel Pioneer', 'Building worlds one block at a time. Stack Sky main.'],
  ['NovaKnight', 'Nova Knight', 'Knight set collector. Ask me about armor.'],
  ['LunaBuilds', 'Luna', 'Designer by day, Orb Rush speedrunner by night.'],
  ['TurboTaco', 'Turbo Taco', 'gotta go fast 🌮'],
  ['QuietQuasar', 'Quasar', 'Memory games are my zen.'],
  ['BlazeRunner', 'Blaze', 'Lava Lanes leaderboard or bust.'],
  ['MintyMango', 'Minty Mango', 'Pastel everything. Candy Stacker enjoyer.'],
  ['CaptainCrumb', 'Captain Crumb', 'Full pirate set and proud of it.'],
  ['EchoFox', 'Echo', 'Collector of rare hats.'],
  ['ZiggyZap', 'Ziggy', 'Block Smash is a lifestyle.'],
  ['OrbitOllie', 'Ollie', 'Space suit, rocket boots, zero chill.'],
  ['SakuraStorm', 'Sakura', 'Gem Tower record holder (for now).'],
  ['MossyMoss', 'Mossy', 'Forest theme supremacy.'],
  ['VoltViper', 'Volt', 'Neon Highway every day.'],
  ['CocoaBean', 'Cocoa', 'Just here to vibe and match pets.'],
  ['IronIvy', 'Ivy', 'Limited collector. Serial #1 hunter.'],
  ['RiftRaven', 'Raven', 'Dusk wings, dark fits.'],
  ['SunnySide', 'Sunny', 'Daily streak: never broken.'],
  ['ByteBandit', 'Byte Bandit', 'I trade tips, not items (yet).'],
  ['GlitchGoblin', 'Glitch', 'If it breaks, I found it first.'],
  ['ArcticAce', 'Arctic Ace', 'Frost Dash or nothing.'],
  ['JellyJam', 'Jelly', 'Tower builder, candy lover.'],
  ['PrismPilot', 'Prism', 'Visors, wings, sparkle.'],
  ['DuneDrifter', 'Drifter', 'Exploring every experience.'],
  ['KiwiKick', 'Kiwi', 'Speed, style and snacks.'],
  ['MarbleMage', 'Marble', 'Wizard hat collector.'],
  ['RocketRue', 'Rue', 'Race me on Neon Highway.'],
  ['FableFern', 'Fern', 'Quiet player, loud outfits.'],
  ['TidalTess', 'Tess', 'Ocean Pairs completionist.'],
  ['ComboCam', 'Cam', 'Combos are everything.'],
  ['StarlitSam', 'Sam', 'Stars in my eyes, literally.'],
  ['CrispCactus', 'Cactus', 'Prickly about leaderboards.'],
  ['HaloHaru', 'Haru', 'Angel halo since day one.'],
  ['NimbusNox', 'Nox', 'Cloud surfer.'],
  ['ToastyTam', 'Toasty', 'Lava Lanes made me this way.'],
  ['WillowWisp', 'Willow', 'Glow Bugs catcher extraordinaire.'],
];

const SKIN = ['#F2C9A0', '#E0AC69', '#C68642', '#8D5524', '#FFDBB4', '#A86B3C', '#F7D7C4', '#5C3A21'];
const BODIES: AvatarConfig['body_type'][] = ['classic', 'slim', 'broad'];

const SCORE_RANGE: Record<GameEngine, [number, number]> = {
  orb_rush: [600, 4200],
  stacker: [6, 42],
  reflex: [140, 560],
  glyph_match: [800, 2200],
};

export interface NpcPlayer {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  status_text: string;
  level: number;
  xp: number;
  reputation: number;
  profile_theme: string;
  age_days: number;
  balance: number;
  avatar: AvatarConfig;
  inventory: { item_id: string; serial_number: number | null; age_days: number }[];
  game_stats: { game_id: string; plays: number; best_score: number; total_score: number; total_orbs: number; last_played_hours: number }[];
  achievements: string[];
}

export interface World {
  npcs: NpcPlayer[];
  follows: [string, string][];
  friendships: [string, string][];
  activity: { user_id: string; kind: string; data: Record<string, unknown>; minutes_ago: number }[];
  pricePoints: { item_id: string; days_ago: number; avg_price: number; volume: number }[];
}

const WEARABLE = CATALOG.filter((c) => !c.limited && !c.seasonKey);

export function buildWorld(seed = 20261114): World {
  const r = mulberry32(seed);
  const npcs: NpcPlayer[] = NPC_SEEDS.map(([username, display_name, bio]) => {
    const level = int(r, 3, 48);
    const equipped: Partial<Record<ItemSlot, string>> = {};
    const chance: Record<ItemSlot, number> = {
      hair: 1, face: 1, shirt: 1, pants: 1, shoes: 1, hat: 0.55, face_accessory: 0.3, neck: 0.3, back: 0.4,
    };
    (Object.keys(chance) as ItemSlot[]).forEach((slot) => {
      if (r() < chance[slot]) equipped[slot] = pick(r, WEARABLE.filter((c) => c.slot === slot)).id;
    });
    const owned = new Set(Object.values(equipped) as string[]);
    const extra = int(r, 3, 14);
    for (let i = 0; i < extra; i++) owned.add(pick(r, WEARABLE).id);
    const games = shuffle(r, GAMES).slice(0, int(r, 3, 10));
    const game_stats = games.map((g) => {
      const [lo, hi] = SCORE_RANGE[g.engine];
      const plays = int(r, 1, 160);
      const best = int(r, lo, hi);
      const total = Math.round(best * plays * (0.45 + r() * 0.3));
      return {
        game_id: g.id,
        plays,
        best_score: best,
        total_score: total,
        total_orbs: Math.min(Math.floor(total / g.scorePerOrb), plays * g.maxOrbsPerSession),
        last_played_hours: int(r, 1, 24 * 12),
      };
    });
    return {
      id: uuidFrom(r),
      username,
      display_name,
      bio,
      status_text: pick(r, ['', '', 'Grinding Orb Rush', 'Looking for friends!', 'AFK snack break', 'Collecting limiteds', 'New outfit drop soon']),
      level,
      xp: xpForLevel(level) + int(r, 0, level * 60),
      reputation: int(r, 0, 900),
      profile_theme: pick(r, ['default', 'midnight', 'sunset', 'ocean', 'forest', 'neon', 'galaxy'].filter((_, i) => i < 3 || level >= [0, 0, 0, 5, 8, 12, 20][i])),
      age_days: int(r, 20, 720),
      balance: int(r, 4, 400) * 125,
      avatar: {
        skin_tone: pick(r, SKIN),
        body_type: pick(r, BODIES),
        height_scale: Math.round((0.94 + r() * 0.12) * 100) / 100,
        head_scale: Math.round((0.95 + r() * 0.1) * 100) / 100,
        equipped,
      },
      inventory: [...owned].map((item_id) => ({ item_id, serial_number: null, age_days: int(r, 1, 300) })),
      game_stats,
      achievements: [],
    };
  });

  // Limited copies sold before launch are held by the community, serials 1..sold.
  CATALOG.filter((c) => c.limited).forEach((c) => {
    for (let s = 1; s <= c.limited!.sold; s++) {
      const holder = npcs[(s * 7 + c.id.length) % npcs.length];
      holder.inventory.push({ item_id: c.id, serial_number: s, age_days: int(r, 1, c.ageDays) });
    }
  });

  const follows = new Set<string>();
  const friendships = new Set<string>();
  npcs.forEach((n, i) => {
    const followCount = int(r, 3, 12);
    for (let k = 0; k < followCount; k++) {
      const j = int(r, 0, npcs.length - 1);
      if (j !== i) follows.add(`${n.id}|${npcs[j].id}`);
    }
    const friendCount = int(r, 1, 5);
    for (let k = 0; k < friendCount; k++) {
      const j = int(r, 0, npcs.length - 1);
      if (j !== i) {
        const [a, b] = [n.id, npcs[j].id].sort();
        friendships.add(`${a}|${b}`);
      }
    }
  });
  const followPairs = [...follows].map((s) => s.split('|') as [string, string]);
  const friendPairs = [...friendships].map((s) => s.split('|') as [string, string]);

  npcs.forEach((n) => {
    const plays = n.game_stats.reduce((s, g) => s + g.plays, 0);
    const friends = friendPairs.filter(([a, b]) => a === n.id || b === n.id).length;
    const followers = followPairs.filter(([, b]) => b === n.id).length;
    const distinctItems = new Set(n.inventory.map((i) => i.item_id)).size;
    const a = ['welcome', 'first_game'];
    if (plays >= 25) a.push('gamer_25');
    if (plays >= 100) a.push('gamer_100');
    if (n.game_stats.length >= 5) a.push('explorer');
    if (distinctItems >= 10) a.push('collector_10');
    if (n.inventory.some((i) => i.serial_number)) a.push('limited_owner');
    if (friends >= 5) a.push('social_5');
    if (followers >= 10) a.push('popular');
    if (n.level >= 5) a.push('level_5');
    if (n.level >= 10) a.push('level_10');
    if (n.level >= 25) a.push('level_25');
    n.game_stats.forEach((g) => {
      const engine = GAMES.find((x) => x.id === g.game_id)!.engine;
      if (engine === 'orb_rush' && g.best_score >= 2500 && !a.includes('rush_pro')) a.push('rush_pro');
      if (engine === 'stacker' && g.best_score >= 25 && !a.includes('stack_master')) a.push('stack_master');
      if (engine === 'reflex' && g.best_score >= 450 && !a.includes('reflex_ace')) a.push('reflex_ace');
      if (engine === 'glyph_match' && g.best_score >= 1800 && !a.includes('memory_genius')) a.push('memory_genius');
    });
    n.achievements = a;
  });

  const activity: World['activity'] = [];
  npcs.forEach((n) => {
    const count = int(r, 2, 5);
    for (let k = 0; k < count; k++) {
      const roll = r();
      const minutes_ago = int(r, 5, 60 * 24 * 9);
      if (roll < 0.35) {
        const g = pick(r, n.game_stats);
        const game = GAMES.find((x) => x.id === g.game_id)!;
        activity.push({ user_id: n.id, kind: 'new_best', data: { game_id: game.id, title: game.title, score: g.best_score }, minutes_ago });
      } else if (roll < 0.6) {
        const inv = pick(r, n.inventory);
        const item = CATALOG.find((c) => c.id === inv.item_id)!;
        activity.push({ user_id: n.id, kind: 'purchase', data: { item_id: item.id, name: item.name, rarity: item.rarity }, minutes_ago });
      } else if (roll < 0.8) {
        activity.push({ user_id: n.id, kind: 'level_up', data: { level: n.level }, minutes_ago });
      } else {
        const g = pick(r, n.game_stats);
        const game = GAMES.find((x) => x.id === g.game_id)!;
        activity.push({ user_id: n.id, kind: 'game_played', data: { game_id: game.id, title: game.title }, minutes_ago });
      }
    }
  });

  // 30 days of simulated average sale prices for collectibles.
  const pricePoints: World['pricePoints'] = [];
  CATALOG.filter((c) => c.limited || c.rarity === 'legendary' || c.rarity === 'epic').forEach((c) => {
    let p = c.price * (c.limited ? 0.92 : 1);
    for (let d = 29; d >= 1; d--) {
      const drift = c.limited ? 1.004 + (c.limited.sold / c.limited.stock) * 0.01 : 1;
      p = p * drift * (0.97 + r() * 0.06);
      pricePoints.push({ item_id: c.id, days_ago: d, avg_price: Math.max(1, Math.round(c.limited ? p : c.price)), volume: int(r, 1, c.limited ? 6 : 40) });
    }
  });

  return { npcs, follows: followPairs, friendships: friendPairs, activity, pricePoints };
}
