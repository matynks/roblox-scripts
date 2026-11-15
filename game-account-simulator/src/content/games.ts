import type { GamePassSeed, GameSeed } from './types';

/**
 * Every experience listed in Discover is playable. Four original engines are
 * re-themed and re-tuned into distinct experiences, each with its own
 * leaderboard, stats and passes.
 *
 * Anti-cheat bounds (maxScorePerSecond + scoreGrace) are derived from each
 * engine's scoring rules — see src/games/engines/*.ts — with generous headroom.
 */

const rush = {
  engine: 'orb_rush' as const,
  scorePerOrb: 20,
  maxOrbsPerSession: 150,
  dailyOrbCap: 600,
  maxScorePerSecond: 140,
  scoreGrace: 100,
  xpPerPlay: 12,
};
const stack = {
  engine: 'stacker' as const,
  scorePerOrb: 1,
  maxOrbsPerSession: 60,
  dailyOrbCap: 400,
  maxScorePerSecond: 8,
  scoreGrace: 10,
  xpPerPlay: 10,
};
const reflex = {
  engine: 'reflex' as const,
  scorePerOrb: 8,
  maxOrbsPerSession: 80,
  dailyOrbCap: 450,
  maxScorePerSecond: 90,
  scoreGrace: 60,
  xpPerPlay: 10,
};
const glyph = {
  engine: 'glyph_match' as const,
  scorePerOrb: 20,
  maxOrbsPerSession: 90,
  dailyOrbCap: 450,
  maxScorePerSecond: 220,
  scoreGrace: 1200,
  xpPerPlay: 10,
};

export const GAMES: GameSeed[] = [
  {
    id: 'orb-rush', title: 'Orb Rush', tagline: 'Dodge, dash and grab every orb.', genre: 'Action',
    description: 'Swipe between three lanes to dodge falling blocks and scoop up glowing orbs. The track speeds up the longer you survive — how far can you go?',
    ...rush, config: { lanes: 3, startSpeed: 0.5, accel: 0.012, maxSpeed: 1.6, spawnEvery: 0.85, orbChance: 0.45, lives: 3, bg: '#120E2E', lane: '#1E1A4A', player: '#22D3EE', block: '#FF4D6D', orb: '#FFC53D' },
    thumbnail: { from: '#4F46E5', to: '#22D3EE', emblem: 'rush', accent: '#FFC53D' }, creator: 'Blockora Studio',
    baseVisits: 2480000, baseLikes: 41200, baseDislikes: 3100, baseFavorites: 18900, baseCcu: 1800, trendSeed: 8.5, featured: true, sortOrder: 1, ageDays: 300,
  },
  {
    id: 'lava-lanes', title: 'Lava Lanes', tagline: 'The floor is lava. So are the walls.', genre: 'Action',
    description: 'A scorching remix of Orb Rush: faster blocks, rarer orbs and a track that never cools down.',
    ...rush, config: { lanes: 3, startSpeed: 0.62, accel: 0.016, maxSpeed: 1.8, spawnEvery: 0.75, orbChance: 0.38, lives: 3, bg: '#2A0A0A', lane: '#4A1410', player: '#FFD166', block: '#FF7B00', orb: '#FFE066' },
    thumbnail: { from: '#DC2626', to: '#F59E0B', emblem: 'flame', accent: '#FFE066' }, creator: 'Magma Works',
    baseVisits: 940000, baseLikes: 15400, baseDislikes: 1900, baseFavorites: 6200, baseCcu: 640, trendSeed: 6.1, sortOrder: 2, ageDays: 140,
  },
  {
    id: 'neon-highway', title: 'Neon Highway', tagline: 'Race the grid at light speed.', genre: 'Racing',
    description: 'Neon lanes, synth skies and an ever-climbing top speed. Chain orb pickups for massive scores.',
    ...rush, config: { lanes: 3, startSpeed: 0.7, accel: 0.02, maxSpeed: 2.0, spawnEvery: 0.7, orbChance: 0.5, lives: 3, bg: '#050816', lane: '#0B1437', player: '#39FF14', block: '#F72585', orb: '#4CC9F0' },
    thumbnail: { from: '#7C3AED', to: '#F72585', emblem: 'bolt', accent: '#39FF14' }, creator: 'Synthline',
    baseVisits: 1320000, baseLikes: 22800, baseDislikes: 2100, baseFavorites: 9400, baseCcu: 980, trendSeed: 9.2, featured: true, sortOrder: 3, ageDays: 45,
  },
  {
    id: 'frost-dash', title: 'Frost Dash', tagline: 'Slide through the glacier gauntlet.', genre: 'Adventure',
    description: 'A chilly, slightly gentler run through ice caverns — perfect for chasing a long streak.',
    ...rush, config: { lanes: 3, startSpeed: 0.45, accel: 0.01, maxSpeed: 1.4, spawnEvery: 0.9, orbChance: 0.5, lives: 3, bg: '#06202F', lane: '#0C3A52', player: '#FFFFFF', block: '#7FDBFF', orb: '#C77DFF' },
    thumbnail: { from: '#0EA5E9', to: '#E0F2FE', emblem: 'snow', accent: '#C77DFF' }, creator: 'Polar Pixel',
    baseVisits: 610000, baseLikes: 10100, baseDislikes: 900, baseFavorites: 4100, baseCcu: 310, trendSeed: 3.4, sortOrder: 4, ageDays: 210,
  },
  {
    id: 'sky-stack', title: 'Sky Stack', tagline: 'Stack higher than the clouds.', genre: 'Casual',
    description: 'Tap to drop each sliding block. Overhangs get sliced off — land a perfect drop to keep your tower wide.',
    ...stack, config: { startWidth: 0.6, speed: 0.9, speedup: 0.035, perfectTolerance: 0.018, from: '#38BDF8', to: '#1E3A8A', block: '#FDE68A', blockAlt: '#F59E0B' },
    thumbnail: { from: '#38BDF8', to: '#6366F1', emblem: 'stack', accent: '#FDE68A' }, creator: 'Blockora Studio',
    baseVisits: 1870000, baseLikes: 30500, baseDislikes: 2600, baseFavorites: 12800, baseCcu: 1250, trendSeed: 7.4, featured: true, sortOrder: 5, ageDays: 280,
  },
  {
    id: 'gem-tower', title: 'Gem Tower', tagline: 'Every block is a precious gem.', genre: 'Casual',
    description: 'A faster stacker where each layer is a gem. The higher you go, the brighter it shines.',
    ...stack, config: { startWidth: 0.55, speed: 1.1, speedup: 0.04, perfectTolerance: 0.016, from: '#581C87', to: '#0F172A', block: '#C084FC', blockAlt: '#22D3EE' },
    thumbnail: { from: '#9333EA', to: '#0F172A', emblem: 'gem', accent: '#22D3EE' }, creator: 'Gemcraft',
    baseVisits: 720000, baseLikes: 11900, baseDislikes: 1300, baseFavorites: 4800, baseCcu: 420, trendSeed: 5.2, sortOrder: 6, ageDays: 95,
  },
  {
    id: 'candy-stacker', title: 'Candy Stacker', tagline: 'Sweet, sticky, surprisingly tricky.', genre: 'Casual',
    description: 'Pastel candy layers with a gentle start. Great for warming up — but the pace picks up!',
    ...stack, config: { startWidth: 0.65, speed: 0.8, speedup: 0.03, perfectTolerance: 0.02, from: '#FBCFE8', to: '#A78BFA', block: '#FDA4AF', blockAlt: '#93C5FD' },
    thumbnail: { from: '#F9A8D4', to: '#A78BFA', emblem: 'candy', accent: '#FFFFFF' }, creator: 'Sugar Cube Games',
    baseVisits: 530000, baseLikes: 9800, baseDislikes: 700, baseFavorites: 3900, baseCcu: 280, trendSeed: 2.8, sortOrder: 7, ageDays: 180,
  },
  {
    id: 'block-smash', title: 'Block Smash', tagline: '30 seconds. Smash everything.', genre: 'Arcade',
    description: 'Blocks pop up all over the board — tap them before they vanish. Golden blocks are worth triple, but never tap a bomb!',
    ...reflex, config: { duration: 30, spawnEvery: 0.55, lifetime: 1.25, goldenChance: 0.1, bombChance: 0.14, grid: 4, bg: '#0F172A', target: '#22D3EE', golden: '#FFC53D', bomb: '#EF4444' },
    thumbnail: { from: '#0EA5E9', to: '#6366F1', emblem: 'smash', accent: '#FFC53D' }, creator: 'Blockora Studio',
    baseVisits: 1590000, baseLikes: 26100, baseDislikes: 2400, baseFavorites: 10200, baseCcu: 1100, trendSeed: 6.9, sortOrder: 8, ageDays: 260,
  },
  {
    id: 'glow-bugs', title: 'Glow Bugs', tagline: 'Catch the fireflies, skip the wasps.', genre: 'Arcade',
    description: 'A twilight meadow full of glowing bugs. Quick taps catch fireflies; wasps cost you points.',
    ...reflex, config: { duration: 30, spawnEvery: 0.5, lifetime: 1.1, goldenChance: 0.12, bombChance: 0.16, grid: 4, bg: '#052E16', target: '#A3E635', golden: '#FDE047', bomb: '#F97316' },
    thumbnail: { from: '#166534', to: '#A3E635', emblem: 'bug', accent: '#FDE047' }, creator: 'Meadowlight',
    baseVisits: 460000, baseLikes: 8100, baseDislikes: 800, baseFavorites: 3100, baseCcu: 230, trendSeed: 4.6, sortOrder: 9, ageDays: 60,
  },
  {
    id: 'meteor-defense', title: 'Meteor Defense', tagline: 'Protect the station. Tap fast.', genre: 'Sci-Fi',
    description: 'Meteors streak toward your space station. Blast them before impact — and don\'t hit the friendly satellites.',
    ...reflex, config: { duration: 35, spawnEvery: 0.6, lifetime: 1.3, goldenChance: 0.08, bombChance: 0.12, grid: 4, bg: '#020617', target: '#F97316', golden: '#FACC15', bomb: '#38BDF8' },
    thumbnail: { from: '#1E1B4B', to: '#F97316', emblem: 'meteor', accent: '#FACC15' }, creator: 'Orbital Arcade',
    baseVisits: 380000, baseLikes: 6400, baseDislikes: 700, baseFavorites: 2500, baseCcu: 190, trendSeed: 3.9, sortOrder: 10, ageDays: 25,
  },
  {
    id: 'glyph-match', title: 'Glyph Match', tagline: 'Flip, remember, match.', genre: 'Puzzle',
    description: 'Find every pair of ancient glyphs before time runs out. Consecutive matches build a combo bonus.',
    ...glyph, config: { cols: 4, rows: 4, timeLimit: 90, theme: 'glyphs', bg: '#1C1917', card: '#F59E0B', face: '#FFFBEB', accent: '#B45309' },
    thumbnail: { from: '#B45309', to: '#FDE68A', emblem: 'glyph', accent: '#1C1917' }, creator: 'Blockora Studio',
    baseVisits: 1210000, baseLikes: 21900, baseDislikes: 1500, baseFavorites: 9900, baseCcu: 760, trendSeed: 5.8, sortOrder: 11, ageDays: 240,
  },
  {
    id: 'ocean-pairs', title: 'Ocean Pairs', tagline: 'Dive deep for matching treasures.', genre: 'Puzzle',
    description: 'Shells, fish and sunken treasure hide beneath the waves. A relaxed memory game with a generous timer.',
    ...glyph, config: { cols: 4, rows: 4, timeLimit: 110, theme: 'ocean', bg: '#082F49', card: '#0EA5E9', face: '#F0F9FF', accent: '#0369A1' },
    thumbnail: { from: '#0369A1', to: '#5EEAD4', emblem: 'wave', accent: '#FFFFFF' }, creator: 'Tidepool',
    baseVisits: 410000, baseLikes: 7600, baseDislikes: 500, baseFavorites: 3300, baseCcu: 170, trendSeed: 2.6, sortOrder: 12, ageDays: 150,
  },
  {
    id: 'rune-recall', title: 'Rune Recall', tagline: 'Twenty runes. One sharp mind.', genre: 'Strategy',
    description: 'A bigger 5×4 board of shifting runes and a tight timer. Only true memory masters clear it.',
    ...glyph, config: { cols: 4, rows: 5, timeLimit: 100, theme: 'runes', bg: '#1E1B4B', card: '#6366F1', face: '#EEF2FF', accent: '#4338CA' },
    thumbnail: { from: '#312E81', to: '#A78BFA', emblem: 'rune', accent: '#FDE68A' }, creator: 'Arcane Labs',
    baseVisits: 290000, baseLikes: 5900, baseDislikes: 600, baseFavorites: 2200, baseCcu: 120, trendSeed: 4.1, sortOrder: 13, ageDays: 18,
  },
  {
    id: 'pixel-pets', title: 'Pixel Pets', tagline: 'Match the cutest critters.', genre: 'Puzzle',
    description: 'Adorable pixel pets are hiding behind the cards. Find every pair and earn a bonus for speed.',
    ...glyph, config: { cols: 4, rows: 4, timeLimit: 100, theme: 'pets', bg: '#3B0764', card: '#F472B6', face: '#FDF2F8', accent: '#BE185D' },
    thumbnail: { from: '#DB2777', to: '#FBCFE8', emblem: 'paw', accent: '#FFFFFF' }, creator: 'Sugar Cube Games',
    baseVisits: 670000, baseLikes: 12900, baseDislikes: 800, baseFavorites: 5600, baseCcu: 340, trendSeed: 4.4, sortOrder: 14, ageDays: 75,
  },
];

export const GAME_PASSES: GamePassSeed[] = [
  { id: 'orb-rush-double-orbs', gameId: 'orb-rush', name: 'Double Orbs', description: 'Earn 2× Orbs from every run.', price: 400, perkType: 'orb_multiplier', perkValue: 2, icon: { glyph: 'x2', color: '#FFC53D' }, baseSales: 3100 },
  { id: 'orb-rush-extra-life', gameId: 'orb-rush', name: 'Extra Life', description: 'Start every run with one more heart.', price: 250, perkType: 'extra_life', perkValue: 1, icon: { glyph: 'heart', color: '#FF4D6D' }, baseSales: 4200 },
  { id: 'lava-lanes-heat-shield', gameId: 'lava-lanes', name: 'Heat Shield', description: 'One extra heart against the lava.', price: 300, perkType: 'extra_life', perkValue: 1, icon: { glyph: 'shield', color: '#FF7B00' }, baseSales: 1500 },
  { id: 'neon-highway-turbo', gameId: 'neon-highway', name: 'Turbo Rewards', description: 'Earn 1.5× Orbs on the highway.', price: 350, perkType: 'orb_multiplier', perkValue: 1.5, icon: { glyph: 'bolt', color: '#39FF14' }, baseSales: 2200 },
  { id: 'frost-dash-xp', gameId: 'frost-dash', name: 'Glacier XP', description: 'Earn 2× XP from every dash.', price: 200, perkType: 'xp_multiplier', perkValue: 2, icon: { glyph: 'star', color: '#C77DFF' }, baseSales: 900 },
  { id: 'sky-stack-steady', gameId: 'sky-stack', name: 'Steady Hands', description: 'Perfect drops are twice as forgiving.', price: 300, perkType: 'precision', perkValue: 2, icon: { glyph: 'target', color: '#FDE68A' }, baseSales: 2700 },
  { id: 'sky-stack-double', gameId: 'sky-stack', name: 'Double Orbs', description: 'Earn 2× Orbs from every tower.', price: 400, perkType: 'orb_multiplier', perkValue: 2, icon: { glyph: 'x2', color: '#FFC53D' }, baseSales: 2000 },
  { id: 'gem-tower-magnet', gameId: 'gem-tower', name: 'Gem Magnet', description: 'Earn 1.5× Orbs from every tower.', price: 300, perkType: 'orb_multiplier', perkValue: 1.5, icon: { glyph: 'gem', color: '#C084FC' }, baseSales: 1100 },
  { id: 'candy-stacker-xp', gameId: 'candy-stacker', name: 'Sugar Rush', description: 'Earn 2× XP from every tower.', price: 200, perkType: 'xp_multiplier', perkValue: 2, icon: { glyph: 'star', color: '#FDA4AF' }, baseSales: 800 },
  { id: 'block-smash-time-warp', gameId: 'block-smash', name: 'Time Warp', description: '+10 seconds on every round.', price: 300, perkType: 'time_bonus', perkValue: 10, icon: { glyph: 'clock', color: '#22D3EE' }, baseSales: 2400 },
  { id: 'glow-bugs-net', gameId: 'glow-bugs', name: 'Golden Net', description: 'Earn 1.5× Orbs from every catch.', price: 350, perkType: 'orb_multiplier', perkValue: 1.5, icon: { glyph: 'bug', color: '#FDE047' }, baseSales: 700 },
  { id: 'meteor-defense-double', gameId: 'meteor-defense', name: 'Double Orbs', description: 'Earn 2× Orbs defending the station.', price: 400, perkType: 'orb_multiplier', perkValue: 2, icon: { glyph: 'x2', color: '#FACC15' }, baseSales: 600 },
  { id: 'glyph-match-peek', gameId: 'glyph-match', name: 'Sneak Peek', description: 'See every glyph for 2 seconds at the start.', price: 250, perkType: 'hint', perkValue: 2, icon: { glyph: 'eye', color: '#F59E0B' }, baseSales: 2900 },
  { id: 'ocean-pairs-tide', gameId: 'ocean-pairs', name: 'Tide Timer', description: '+15 seconds on the clock.', price: 200, perkType: 'time_bonus', perkValue: 15, icon: { glyph: 'clock', color: '#0EA5E9' }, baseSales: 800 },
  { id: 'rune-recall-sight', gameId: 'rune-recall', name: 'Rune Sight', description: 'See every rune for 3 seconds at the start.', price: 300, perkType: 'hint', perkValue: 3, icon: { glyph: 'eye', color: '#A78BFA' }, baseSales: 650 },
  { id: 'pixel-pets-treats', gameId: 'pixel-pets', name: 'Pet Treats', description: 'Earn 1.5× Orbs from every board.', price: 250, perkType: 'orb_multiplier', perkValue: 1.5, icon: { glyph: 'paw', color: '#F472B6' }, baseSales: 1200 },
];
