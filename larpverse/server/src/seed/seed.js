import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../app.js';
import { hashPassword } from '../security.js';
import { createAccount } from '../services/accounts.js';
import { equipItem } from '../services/avatar.js';
import { assignBadge, syncSystemBadges } from '../services/badges.js';
import { getFlag, setFlag } from '../services/config.js';
import { grantItem } from '../services/inventory.js';
import { notify } from '../services/notify.js';
import { now, rng, toJson } from '../util.js';
import { buildCatalog, C } from './catalog-data.js';

const DAY = 86400_000;

// ───────────────────────── Essentials (always present) ─────────────────────────

const BADGES = [
  { key: 'administrator', name: 'Administrator', description: 'Larpverse staff administrator. Shown only on real staff accounts.', icon: 'shield', color: '#ef476f', kind: 'system', required: 'admin', perks: { verified: true, hostLimitBonus: 20, freeGroups: true }, sort: 1 },
  { key: 'moderator', name: 'Moderator', description: 'Larpverse moderator. Shown only on real moderator accounts.', icon: 'shield', color: '#118ab2', kind: 'system', required: 'moderator', perks: { hostLimitBonus: 8 }, sort: 2 },
  { key: 'roleplay_verified', name: 'Roleplay Verified', description: 'Verified inside the Larpverse roleplay platform. This is not an official verification by any other company or platform.', icon: 'check', color: '#7c5cff', kind: 'awarded', perks: { verified: true, hostLimitBonus: 8 }, sort: 10 },
  { key: 'featured_creator', name: 'Featured Creator', description: 'Creator spotlighted across Discover and the Marketplace.', icon: 'star', color: '#ffb703', kind: 'awarded', perks: { featuredCreator: true, freeGroups: true }, sort: 11 },
  { key: 'special_event', name: 'Special Event Participant', description: 'Took part in a special Larpverse roleplay event.', icon: 'trophy', color: '#06d6a0', kind: 'awarded', perks: {}, sort: 20 },
  { key: 'collector', name: 'Collector', description: 'Owns an impressive collection of limited items.', icon: 'gem', color: '#4cc9f0', kind: 'awarded', perks: {}, sort: 21 },
  { key: 'early_member', name: 'Early Member', description: 'Joined Larpverse in its first season.', icon: 'sparkle', color: '#f15bb5', kind: 'awarded', perks: {}, sort: 22 },
  { key: 'top_host', name: 'Top Host', description: 'Hosted memorable LARP sessions.', icon: 'crown', color: '#fb8500', kind: 'awarded', perks: { hostLimitBonus: 10 }, sort: 23 },
];

const ROLES = [
  { key: 'citizen', name: 'Citizen', description: 'Live your city life. Odd jobs in Maple Park pay a little.', color: '#64748b', icon: 'user', permissions: [], salary: 12, zone: 'park', isDefault: true, sort: 1 },
  { key: 'shopkeeper', name: 'Shopkeeper', description: 'Run the Corner Market. Earn a commission when customers buy while you are on duty.', color: '#e07a5f', icon: 'cart', permissions: ['sell'], salary: 30, zone: 'market', sort: 2 },
  { key: 'barista', name: 'Barista', description: 'Brew drinks at the Bean Scene Café.', color: '#9c6644', icon: 'coffee', permissions: ['sell'], salary: 25, zone: 'cafe', sort: 3 },
  { key: 'banker', name: 'Banker', description: 'Keep the Larpverse Bank running.', color: '#3d5a80', icon: 'bank', permissions: [], salary: 35, zone: 'bank', sort: 4 },
  { key: 'police', name: 'Police Officer', description: 'Patrol the city, write citations and solve mysteries.', color: '#1d3557', icon: 'shield', permissions: ['cite'], salary: 30, zone: 'police', sort: 5 },
  { key: 'medic', name: 'Medic', description: 'Restore energy to tired citizens at City Hospital.', color: '#2a9d8f', icon: 'cross', permissions: ['heal'], salary: 30, zone: 'hospital', sort: 6 },
  { key: 'reporter', name: 'Reporter', description: 'Interview citizens and broadcast breaking news for LVN.', color: '#e63946', icon: 'mic', permissions: ['broadcast', 'interview'], salary: 25, zone: 'news', sort: 7 },
  { key: 'mayor', name: 'Mayor', description: 'Lead the city: announcements and city bonuses from the fund.', color: '#b08968', icon: 'landmark', permissions: ['announce', 'grant_bonus'], salary: 40, zone: 'cityhall', max: 1, sort: 8 },
  { key: 'performer', name: 'Performer', description: 'Perform on the Grand Stage; tips grow with your audience.', color: '#9b5de5', icon: 'music', permissions: ['perform'], salary: 20, zone: 'stage', sort: 9 },
  { key: 'arcade_host', name: 'Arcade Host', description: 'Keep the Pixel Arcade buzzing.', color: '#ff006e', icon: 'gamepad', permissions: ['sell'], salary: 22, zone: 'arcade', sort: 10 },
  { key: 'director', name: 'Director', description: 'Session director: triggers scripted events and makes announcements.', color: '#ffd166', icon: 'clapper', permissions: ['trigger_events', 'announce'], salary: 0, zone: null, max: 1, hostOnly: true, sort: 11 },
];

const GAME_ITEMS = [
  { key: 'coffee', name: 'Coffee', description: '+30 energy', icon: 'coffee', price: 8, soldIn: 'cafe', effect: { energy: 30 } },
  { key: 'donut', name: 'Donut', description: '+15 energy', icon: 'donut', price: 5, soldIn: 'cafe', effect: { energy: 15 } },
  { key: 'smoothie', name: 'Smoothie', description: '+45 energy', icon: 'cup', price: 12, soldIn: 'cafe', effect: { energy: 45 } },
  { key: 'soda', name: 'Soda', description: '+10 energy', icon: 'can', price: 4, soldIn: 'market', effect: { energy: 10 } },
  { key: 'sandwich', name: 'Sandwich', description: '+40 energy', icon: 'sandwich', price: 10, soldIn: 'market', effect: { energy: 40 } },
  { key: 'flowers', name: 'Flowers', description: 'A gift. Giving it earns reputation.', icon: 'flower', price: 15, soldIn: 'market', effect: { giftReputation: 2 } },
  { key: 'balloon', name: 'Balloon', description: 'Fun! Makes you cheer.', icon: 'balloon', price: 6, soldIn: 'market', effect: { emote: 'cheer' } },
  { key: 'camera', name: 'Camera', description: 'Snap a photo: +1 reputation, +5 XP', icon: 'camera', price: 60, soldIn: 'news', effect: { reputation: 1, xp: 5 } },
  { key: 'newspaper', name: 'Newspaper', description: 'Catch up on the news: +5 XP', icon: 'news', price: 3, soldIn: 'news', effect: { xp: 5 } },
  { key: 'medkit', name: 'Med Kit', description: 'Full energy', icon: 'cross', price: 25, soldIn: 'hospital', effect: { energy: 100 } },
  { key: 'vitamins', name: 'Vitamins', description: '+25 energy', icon: 'pill', price: 9, soldIn: 'hospital', effect: { energy: 25 } },
  { key: 'trophy', name: 'Trophy', description: '+5 reputation', icon: 'trophy', price: 120, soldIn: 'stage', effect: { reputation: 5 } },
  { key: 'glowstick', name: 'Glow Stick', description: 'Party time! Makes you dance.', icon: 'sparkle', price: 5, soldIn: 'stage', effect: { emote: 'dance' } },
  { key: 'arcade_token', name: 'Arcade Token', description: 'Play a round: +3 XP', icon: 'coin', price: 2, soldIn: 'arcade', effect: { xp: 3 } },
];

const ALL_ROLE_KEYS = ROLES.map((r) => r.key);

const SCENARIOS = [
  {
    key: 'city_life', name: 'City Life', description: 'An open day in Larpverse City. Pick a job, earn cash, meet people and collect sparks.',
    config: {
      roles: ALL_ROLE_KEYS, startingCash: 100, lighting: 'day', initialPickups: 14, minPickups: 8, completionReward: 50,
      objectives: [
        { type: 'earn', target: 300, label: 'Earn $300' }, { type: 'work', target: 8, label: 'Work 8 shifts' },
        { type: 'collect', target: 10, label: 'Collect 10 sparks' }, { type: 'chat', target: 3, label: 'Chat with the city (3 messages)' },
      ],
      autoEvents: [{ type: 'coin_rain', everySeconds: 180, params: { count: 18 } }],
    },
  },
  {
    key: 'market_rush', name: 'Marketplace Rush', description: 'Prices drop, crowds gather, shopkeepers hustle. Shop, sell and report on the frenzy.',
    config: {
      roles: ['citizen', 'shopkeeper', 'barista', 'reporter', 'arcade_host', 'director'], startingCash: 250, lighting: 'day', initialPickups: 8, completionReward: 60,
      objectives: [{ type: 'visit', zone: 'market', label: 'Visit the Corner Market' }, { type: 'buy', target: 5, label: 'Buy 5 items' }, { type: 'earn', target: 150, label: 'Earn $150' }],
      autoEvents: [{ type: 'market_sale', everySeconds: 150, params: { multiplier: 0.5, durationSeconds: 45 } }],
    },
  },
  {
    key: 'midnight_mystery', name: 'Midnight Mystery', description: 'Night falls and strange clues appear across the city. Detectives, reporters and citizens race to solve it.',
    config: {
      roles: ['citizen', 'police', 'reporter', 'mayor', 'medic', 'director'], startingCash: 60, lighting: 'night', initialPickups: 6, initialClues: 8, completionReward: 80,
      objectives: [{ type: 'clue', target: 4, label: 'Find 4 clues' }, { type: 'chat', target: 2, label: 'Share a theory (2 messages)' }, { type: 'cite', target: 1, label: 'Write a citation', roles: ['police'] }],
      autoEvents: [{ type: 'blackout', everySeconds: 200, params: { durationSeconds: 30 } }, { type: 'clue_hunt', everySeconds: 240, params: { count: 4 } }],
      botLines: ['Did anyone else hear that?', 'I found something near the bank…', 'The lights keep flickering.', 'Who was at City Hall last night?'],
    },
  },
  {
    key: 'star_awards', name: 'Star Awards Night', description: 'The city’s biggest night on the Grand Stage. Perform, interview the stars, and crown a winner.',
    config: {
      roles: ['citizen', 'performer', 'reporter', 'mayor', 'director'], startingCash: 80, lighting: 'dusk', initialPickups: 8, completionReward: 70,
      objectives: [{ type: 'visit', zone: 'stage', label: 'Attend the show at the Grand Stage' }, { type: 'perform', target: 3, label: 'Perform 3 times', roles: ['performer'] },
        { type: 'interview', target: 2, label: 'Interview 2 stars', roles: ['reporter'] }, { type: 'chat', target: 2, label: 'Cheer in chat (2 messages)' }],
      autoEvents: [{ type: 'coin_rain', everySeconds: 240, params: { count: 12 } }],
      botLines: ['What a performance!', 'Who do you think will win tonight?', 'Encore! Encore!', 'This is the best show of the year.'],
    },
  },
  {
    key: 'hospital_shift', name: 'Hospital Shift', description: 'A busy day at City Hospital. Exhausted citizens need medics fast.',
    config: {
      roles: ['medic', 'citizen', 'reporter', 'director'], startingCash: 50, lighting: 'day', startEnergyByRole: { citizen: 25 }, completionReward: 60,
      objectives: [{ type: 'heal', target: 4, label: 'Treat 4 patients', roles: ['medic'] }, { type: 'visit', zone: 'hospital', label: 'Visit City Hospital' }, { type: 'work', target: 4, label: 'Work 4 shifts' }],
      autoEvents: [],
    },
  },
  {
    key: 'sandbox', name: 'Sandbox', description: 'No objectives, lots of cash. Perfect for free roleplay and filming.',
    config: { roles: ALL_ROLE_KEYS, startingCash: 1000, lighting: 'day', initialPickups: 10, objectives: [], autoEvents: [] },
  },
];

const EVENTS = [
  { scope: 'platform', type: 'scripted_transaction', name: 'Welcome bonus payout', description: 'Credit 1,000 Sparks with a notification.', params: { amount: 1000, description: 'Welcome bonus', notify: true } },
  { scope: 'platform', type: 'scripted_transaction', name: 'Group payout (50K)', description: 'A big fictional group payout.', params: { amount: 50000, description: 'Group payout from Nova Studio', notify: true } },
  { scope: 'platform', type: 'friend_request_wave', name: 'Friend request wave', description: 'Three fictional accounts send friend requests.', params: { count: 3 } },
  { scope: 'platform', type: 'follower_surge', name: 'Follower surge (10K)', description: 'Displayed followers +10,000 and 5 real follows from fictional accounts.', params: { count: 10000, realFollows: 5, notify: true } },
  { scope: 'platform', type: 'reward', name: 'Roleplay Verified ceremony', description: 'Award the Roleplay Verified badge with a notification.', params: { badgeKey: 'roleplay_verified', title: 'You are now Roleplay Verified!', body: 'Your Larpverse roleplay profile now shows the Roleplay Verified badge.' } },
  { scope: 'platform', type: 'marketplace_drop', name: 'Limited drop: Neon Shades', description: 'Feature the Neon Shades collectible and announce it.', params: { itemSkus: ['collectible-neon-shades'], feature: true, title: 'Limited drop: Neon Shades are live!' } },
  { scope: 'platform', type: 'profile_announcement', name: 'Profile announcement', description: 'Post an announcement on the profile and notify followers.', params: { text: 'New roleplay video out now! 🎬', notifyFollowers: true } },
  { scope: 'platform', type: 'group_event', name: 'Group shout', description: 'Post a group shout and notify members.', params: { groupId: null, shout: 'Meeting at City Hall tonight — everyone welcome!', title: 'new shout' } },
  { scope: 'platform', type: 'notification', name: 'Item sold notification', description: 'A scripted "your item sold" notification.', params: { type: 'sale', title: 'Someone bought your Neon Hoodie!', body: '+350 Sparks (fictional)' } },
  { scope: 'platform', type: 'notification', name: 'Delayed message (5s)', description: 'Arrives 5 seconds after you trigger it — handy on camera.', params: { type: 'system', title: 'You have a new message', body: 'Check your inbox!', delaySeconds: 5 } },
  { scope: 'platform', type: 'reward', name: "Founder's Halo reward", description: "Grant Founder's Halo and 2,500 Sparks.", params: { itemSku: 'special-founder-s-halo', sparks: 2500, title: "You received Founder's Halo!" } },
  { scope: 'game', type: 'coin_rain', name: 'Spark shower', description: 'Spawn 30 sparks around the plaza, park and stage.', params: { count: 30 } },
  { scope: 'game', type: 'market_sale', name: 'Flash sale', description: 'Half price everywhere for 60 seconds.', params: { multiplier: 0.5, durationSeconds: 60 } },
  { scope: 'game', type: 'breaking_news', name: 'Breaking news', description: 'A breaking news banner.', params: { text: 'Mysterious lights spotted over Maple Park!' } },
  { scope: 'game', type: 'blackout', name: 'Blackout', description: 'The city goes dark for 30 seconds.', params: { durationSeconds: 30 } },
  { scope: 'game', type: 'award_ceremony', name: 'Star of the Night award', description: 'Spotlight the top earner and grant real platform rewards.', params: { title: 'Star of the Night', winner: 'top_earner', rewardSparks: 500, rewardItemSku: 'special-spotlight-aura', badgeKey: 'special_event' } },
  { scope: 'game', type: 'cash_bonus', name: 'City bonus', description: 'Everyone gets $75 cash in-game.', params: { amount: 75 } },
  { scope: 'game', type: 'clue_hunt', name: 'Clue hunt', description: 'Hide 6 clues inside buildings.', params: { count: 6 } },
  { scope: 'game', type: 'weather_rain', name: 'Rainstorm', description: 'Rain for a minute.', params: { durationSeconds: 60 } },
  { scope: 'game', type: 'announcement', name: 'Mayor announcement', description: 'A city-wide announcement banner.', params: { text: 'Free coffee at Bean Scene Café for the next hour!' } },
];

const STARTER_SKUS = ['face-classic-smile', 'shirt-basic-tee', 'pants-basic-jeans', 'hair-starter-side-part', 'emote-wave'];

const PRESETS = [
  {
    kind: 'new_account', name: 'New Account', description: 'Fresh account: starting balance, starter outfit, no badges or staged stats.',
    data: {
      balance: 500, joinDateDaysAgo: 0, statOverrides: { followers: null, following: null, friends: null, visits: null, presence: null },
      badges: { mode: 'replace', keys: [] }, inventory: { mode: 'replace', skus: STARTER_SKUS },
      look: { bodyColors: { head: '#f2c9a0', torso: '#4f7cff', leftArm: '#f2c9a0', rightArm: '#f2c9a0', leftLeg: '#2f3b52', rightLeg: '#2f3b52' }, equippedSkus: STARTER_SKUS },
      profile: { bio: '', statusText: '', announcement: null, showcaseSkus: [] },
      notifications: { clear: true, items: [{ type: 'system', title: 'Welcome to Larpverse!', body: 'Customize your avatar and jump into a LARP session.' }] },
    },
  },
  {
    kind: 'experienced', name: 'Experienced Account', description: 'Two-and-a-half-year veteran with a modest wardrobe and an active friend list.',
    data: {
      balance: 8450, joinDateDaysAgo: 912, statOverrides: { followers: 342, following: 118, friends: 86, visits: 12800 },
      badges: { mode: 'add', keys: ['early_member'] },
      inventory: { mode: 'add', skus: ['hat-midnight-cap', 'hair-spiky-black', 'shirt-varsity-jacket', 'pants-cargo-pants', 'accessory-aviator-shades', 'accessory-adventure-backpack', 'emote-dance', 'emote-cheer', 'face-too-cool', 'animation-ninja-animation-pack'] },
      look: { equippedSkus: ['hat-midnight-cap', 'hair-spiky-black', 'shirt-varsity-jacket', 'pants-cargo-pants', 'accessory-aviator-shades', 'face-too-cool', 'emote-wave', 'emote-dance'] },
      profile: { statusText: 'Roleplaying since season one', bio: 'City Life regular. Find me at the Bean Scene Café.' },
    },
  },
  {
    kind: 'verified', name: 'Verified Roleplay Account', description: 'Roleplay Verified creator with a big audience.',
    data: {
      balance: 42000, joinDateDaysAgo: 1400, statOverrides: { followers: 125000, following: 64, friends: 200, visits: 2500000, presence: 'online' },
      badges: { mode: 'add', keys: ['roleplay_verified', 'featured_creator'] },
      inventory: { mode: 'add', skus: ['hat-studio-headphones', 'shirt-leather-jacket', 'pants-black-jeans', 'accessory-gold-chain', 'face-smirk', 'emote-victory-pose'] },
      look: { equippedSkus: ['hat-studio-headphones', 'shirt-leather-jacket', 'pants-black-jeans', 'accessory-gold-chain', 'face-smirk', 'emote-wave', 'emote-victory-pose'] },
      profile: { statusText: 'Creator · Roleplay Verified', bio: 'Building roleplay worlds in Larpverse. New episode every Friday!' },
    },
  },
  {
    kind: 'collector', name: 'Collector Account', description: 'Limited collectibles with serial numbers and the Collector badge.',
    data: {
      balance: 15000, joinDateDaysAgo: 1100, statOverrides: { followers: 4800, following: 210, friends: 150 },
      badges: { mode: 'add', keys: ['collector'] },
      inventory: { mode: 'add', skus: ['collectible-frost-dragon', 'collectible-neon-shades', 'collectible-shadow-aura', 'collectible-ember-crown', 'collectible-frost-aura', 'accessory-baby-dragon', 'hat-golden-halo'] },
      look: { equippedSkus: ['collectible-ember-crown', 'collectible-neon-shades', 'collectible-frost-dragon', 'collectible-shadow-aura'] },
      profile: { statusText: 'Collector · DM for trades (roleplay)', showcaseSkus: ['collectible-frost-dragon', 'collectible-neon-shades', 'collectible-shadow-aura', 'collectible-ember-crown', 'collectible-frost-aura'] },
    },
  },
  {
    kind: 'high_balance', name: 'High-Balance Account', description: '2.5 million fictional Sparks with a believable payout history.',
    data: {
      transactions: [{ amount: 1500000, description: 'Group payout: Nova Studio' }, { amount: 750000, description: 'Experience revenue: Larpverse City RP' }, { amount: 250000, description: 'Marketplace sales' }],
      balance: 2500000, statOverrides: { followers: 21000, visits: 900000 },
      profile: { statusText: 'Tycoon of Larpverse City' },
    },
  },
  {
    kind: 'rare_showcase', name: 'Rare Item Showcase', description: 'Wears and showcases the rarest items in the catalog.',
    data: {
      balance: 60000, badges: { mode: 'add', keys: ['collector'] },
      inventory: { mode: 'add', skus: ['collectible-golden-crown-of-larpverse', 'collectible-valkyrie-wings', 'collectible-rainbow-aura', 'collectible-diamond-tiara', 'special-golden-aura', 'accessory-seraph-wings'] },
      look: { equippedSkus: ['collectible-golden-crown-of-larpverse', 'collectible-valkyrie-wings', 'collectible-rainbow-aura', 'face-starstruck'] },
      profile: { statusText: 'Rare item showcase', showcaseSkus: ['collectible-golden-crown-of-larpverse', 'collectible-valkyrie-wings', 'collectible-rainbow-aura', 'collectible-diamond-tiara', 'special-golden-aura', 'accessory-seraph-wings'] },
    },
  },
  {
    kind: 'marketplace_demo', name: 'Marketplace Demonstration', description: 'Starter outfit with 25,000 Sparks so every purchase can be filmed.',
    data: {
      balance: 25000, inventory: { mode: 'replace', skus: STARTER_SKUS }, look: { equippedSkus: STARTER_SKUS },
      notifications: { clear: true, items: [] }, profile: { statusText: 'Shopping day!' },
    },
  },
  {
    kind: 'larp_session', name: 'LARP Session', description: 'Hosts a City Life session with six roleplay extras already wandering the city.',
    data: { balance: 3000, larpSession: { scenarioKey: 'city_life', name: 'Downtown Roleplay', extras: 6, start: true } },
  },
  {
    kind: 'custom', name: 'Custom Scenario: Unboxing Day', description: 'Example of a timed notification sequence for a recording.',
    data: {
      balance: 12000,
      notifications: {
        clear: true,
        items: [
          { type: 'friend_request', title: 'NovaStudio sent you a friend request', delaySeconds: 3 },
          { type: 'reward', title: 'You received 5,000 Sparks', body: 'Group payout (fictional roleplay currency)', delaySeconds: 8 },
          { type: 'badge', title: 'You earned the Special Event Participant badge', delaySeconds: 14 },
        ],
      },
    },
  },
];

function insertCatalog() {
  const { db } = app;
  const t = now();
  const items = buildCatalog();
  const ids = new Map();
  for (const it of items) {
    const id = db.run(
      `INSERT INTO items (sku, name, description, category, slot, asset, price, rarity, is_limited, stock, on_sale, is_featured, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      it.sku, it.name, it.description, it.category, it.slot, toJson(it.asset), it.price, it.rarity, it.isLimited ? 1 : 0, it.stock,
      it.onSale ? 1 : 0, it.isFeatured ? 1 : 0, toJson(it.tags), t - Math.floor(Math.random() * 60) * DAY, t,
    ).id;
    ids.set(it.sku, id);
  }
  for (const it of items.filter((x) => x.bundle)) {
    db.run('UPDATE items SET bundle_item_ids = ? WHERE sku = ?', toJson(it.bundle.map((s) => ids.get(s)).filter(Boolean)), it.sku);
  }
  // A handful of featured picks across categories.
  for (const sku of ['shirt-neon-hoodie', 'accessory-feather-wings', 'hair-teal-waves', 'bundle-street-style-bundle', 'emote-victory-pose', 'animation-levitation-animation-pack']) {
    db.run('UPDATE items SET is_featured = 1 WHERE sku = ?', sku);
  }
}

export async function seedEssentials() {
  const { db } = app;
  if (getFlag('seed_essentials') === '1') return;
  db.tx(() => {
    const t = now();
    for (const b of BADGES) {
      db.run('INSERT OR IGNORE INTO badges (key, name, description, icon, color, kind, required_staff_role, perks, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        b.key, b.name, b.description, b.icon, b.color, b.kind, b.required ?? null, toJson(b.perks), b.sort, t, t);
    }
    if (!db.value('SELECT COUNT(*) FROM items')) insertCatalog();
    for (const r of ROLES) {
      db.run(`INSERT OR IGNORE INTO game_roles (key, name, description, color, icon, permissions, salary, work_zone, max_per_session, is_default, host_only, sort, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.key, r.name, r.description, r.color, r.icon, toJson(r.permissions), r.salary, r.zone, r.max ?? null, r.isDefault ? 1 : 0, r.hostOnly ? 1 : 0, r.sort, t, t);
    }
    for (const g of GAME_ITEMS) {
      db.run('INSERT OR IGNORE INTO game_items (key, name, description, icon, price, sold_in, effect, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        g.key, g.name, g.description, g.icon, g.price, g.soldIn, toJson(g.effect), t);
    }
    for (const s of SCENARIOS) {
      db.run('INSERT OR IGNORE INTO scenarios (key, name, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', s.key, s.name, s.description, toJson(s.config), t, t);
    }
    if (!db.get("SELECT 1 FROM experiences WHERE engine = 'larp'")) {
      db.run(`INSERT INTO experiences (name, description, genre, art, engine, default_scenario_id, max_players, is_featured, visits, likes, dislikes, created_at, updated_at)
              VALUES (?, ?, 'roleplay', ?, 'larp', ?, 16, 1, 0, 0, 0, ?, ?)`,
        'Larpverse City RP',
        'The flagship roleplay city. Choose a character and a job — shopkeeper, medic, police officer, reporter, mayor or performer — then live your story in a shared multiplayer city with scripted events, objectives and a cash economy.',
        toJson({ palette: ['#6d4aff', '#ff6b9a', '#ffd166'], motif: 'city', tagline: 'Live your story' }), db.value("SELECT id FROM scenarios WHERE key = 'city_life'"), t, t);
    }
    for (const e of EVENTS) {
      db.run('INSERT INTO scripted_events (name, description, scope, type, params, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', e.name, e.description, e.scope, e.type, toJson(e.params), t, t);
    }
    for (const p of PRESETS) {
      db.run('INSERT INTO presets (name, kind, description, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', p.name, p.kind, p.description, toJson({ version: 1, ...p.data }), t, t);
    }
    setFlag('seed_essentials', '1');
  });
}

// ───────────────────────── Owner bootstrap ─────────────────────────

export async function bootstrapOwner(cfg) {
  const { db } = app;
  const existing = db.get("SELECT id, username FROM users WHERE staff_role = 'owner' ORDER BY id LIMIT 1");
  if (existing) return { id: existing.id, username: existing.username, created: false };
  const password = cfg.ownerPassword ?? `Lv-${crypto.randomBytes(9).toString('base64url')}7`;
  const hash = await hashPassword(password);
  const id = db.tx(() => {
    const t = now();
    const uid = db.run("INSERT INTO users (username, password_hash, staff_role, created_at, password_changed_at) VALUES (?, ?, 'owner', ?, ?)", cfg.ownerUsername, hash, t, t).id;
    const accId = createAccount({ ownerUserId: uid, username: cfg.ownerUsername, displayName: 'Larpverse Owner', isPrimary: true, startingBalance: 5000 });
    syncSystemBadges(uid);
    notify(accId, { type: 'system', title: 'Your Larpverse server is ready', body: 'Open the Modify Menu from More → Modify Menu. You will be asked for your password to unlock it.' });
    return uid;
  });
  if (!cfg.ownerPassword) {
    const file = path.join(cfg.dataDir, 'owner-credentials.txt');
    fs.writeFileSync(file, `Larpverse owner login\nusername: ${cfg.ownerUsername}\npassword: ${password}\n\nChange this password in Settings → Security after signing in, then delete this file.\n`, { mode: 0o600 });
    app.log(`created owner login "${cfg.ownerUsername}". Password written to ${file}`);
    console.log(`\n  Owner login → username: ${cfg.ownerUsername}  password: ${password}\n`);
  }
  return { id, username: cfg.ownerUsername, created: true, password: cfg.ownerPassword ? undefined : password };
}

// ───────────────────────── Demo world ─────────────────────────

const PEOPLE = [
  { u: 'NovaStudio', d: 'Nova Studio', bio: 'We build roleplay worlds. Creators of Larpverse City RP scenarios.', badges: ['roleplay_verified', 'featured_creator'], bal: 184000, colors: { torso: C.purple }, look: ['hat-studio-headphones', 'hair-teal-waves', 'shirt-leather-jacket', 'pants-black-jeans', 'face-smirk'], followers: 98200, presence: 'online' },
  { u: 'PixelForge', d: 'Pixel Forge', bio: 'Accessory maker. Wings, halos, crowns — if it shines, we forge it.', badges: ['roleplay_verified', 'featured_creator'], bal: 92000, look: ['hat-astro-helmet', 'shirt-knight-armor', 'pants-armored-greaves', 'accessory-rocket-jetpack'], followers: 41500, presence: 'in_experience' },
  { u: 'ThreadLab', d: 'Thread Lab', bio: 'Clothing designer. Hoodies, suits and everything in between.', badges: ['featured_creator'], bal: 51000, look: ['hair-chestnut-bob', 'shirt-neon-hoodie', 'pants-track-joggers', 'accessory-round-glasses'], followers: 12800 },
  { u: 'MayorMaple', d: 'Mayor Maple', bio: 'Mayor of Larpverse City (in roleplay). Town hall every Friday.', badges: ['top_host'], bal: 23000, look: ['hat-dapper-top-hat', 'shirt-business-suit', 'pants-suit-trousers', 'accessory-office-tie', 'face-happy-days'], presence: 'in_experience' },
  { u: 'OfficerByte', d: 'Officer Byte', bio: 'Keeping Larpverse City safe, one citation at a time.', badges: [], bal: 4200, look: ['shirt-police-uniform', 'pants-suit-trousers', 'hair-buzz-cut', 'face-determined', 'accessory-aviator-shades'], presence: 'in_experience' },
  { u: 'DrJuniper', d: 'Dr. Juniper', bio: 'Head medic at City Hospital. Remember to drink water!', badges: ['special_event'], bal: 6100, look: ['shirt-medic-scrubs', 'pants-light-wash-jeans', 'hair-top-bun', 'face-happy-days', 'accessory-round-glasses'], presence: 'online' },
  { u: 'LunaVox', d: 'Luna Vox', bio: 'LVN News anchor. Got a story? Find me at the studio.', badges: ['roleplay_verified'], bal: 18800, look: ['hair-long-raven-hair', 'shirt-business-suit', 'pants-pleated-skirt', 'accessory-pearl-necklace', 'face-wink'], followers: 23100, presence: 'online' },
  { u: 'BeanBarista', d: 'Bean Barista', bio: 'Best latte art in the city. Bean Scene Café, 7am–late.', badges: [], bal: 2300, look: ['hair-curly-brown', 'shirt-cozy-sweater', 'pants-cargo-pants', 'hat-chef-toque', 'face-big-grin'] },
  { u: 'Starlight', d: 'Starlight', bio: 'Performer. Catch my show at the Grand Stage!', badges: ['special_event'], bal: 9900, look: ['hair-cotton-candy-bob', 'shirt-gala-gown', 'hat-crystal-tiara', 'face-starstruck', 'accessory-feather-wings'], presence: 'online' },
  { u: 'CaptainCrumb', d: 'Captain Crumb', bio: 'Pirate cove adventurer. Arr!', badges: [], bal: 1500, look: ['hat-frontier-hat', 'accessory-pirate-eyepatch', 'shirt-sailor-stripes', 'pants-summer-shorts', 'accessory-pal-parrot'] },
  { u: 'ZenithZoe', d: 'Zoe Zenith', bio: 'Obby speedrunner and arcade champion.', badges: ['early_member'], bal: 7700, look: ['hair-pink-pigtails', 'shirt-team-jersey', 'pants-track-joggers', 'face-cheeky'] },
  { u: 'RoboRiley', d: 'Riley', bio: 'Beep boop. Building robots in my spare time.', badges: [], bal: 3100, look: ['face-robo-face', 'hat-signal-antenna', 'shirt-midnight-tee', 'pants-cargo-pants'] },
  { u: 'MintyMarlo', d: 'Marlo', bio: 'Shopkeeper at the Corner Market. Fresh sandwiches daily.', badges: [], bal: 2800, look: ['hair-brown-ponytail', 'shirt-mint-tee', 'pants-summer-shorts', 'face-happy-days'] },
  { u: 'EchoFrost', d: 'Echo Frost', bio: 'Collector of rare things. Serial #1 hunter.', badges: ['collector', 'early_member'], bal: 310000, look: ['collectible-diamond-tiara', 'collectible-frost-dragon', 'collectible-frost-aura', 'hair-silver-waves', 'shirt-tuxedo', 'pants-tux-trousers'], followers: 7400, extra: ['collectible-golden-crown-of-larpverse', 'collectible-valkyrie-wings', 'collectible-rainbow-aura', 'collectible-neon-shades'] },
  { u: 'SunnyDaze', d: 'Sunny', bio: 'Just here to vibe in Maple Park.', badges: [], bal: 900, look: ['hat-flower-crown', 'hair-long-golden-hair', 'shirt-sundress', 'face-happy-days'] },
  { u: 'QuillTheBard', d: 'Quill', bio: 'Storyteller and Midnight Mystery game master.', badges: ['top_host'], bal: 5400, look: ['hat-starry-wizard-hat', 'shirt-flannel', 'pants-cargo-pants', 'accessory-wise-owl', 'face-smirk'] },
];

const SKINS = ['#f2c9a0', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#f1c27d'];

const EXPERIENCES = [
  { name: 'Market Rush RP', scenario: 'market_rush', genre: 'roleplay', art: { palette: ['#ff8c69', '#ffd166'], motif: 'market', tagline: 'Shop till you drop' }, creator: 'ThreadLab', visits: 184000, likes: 9200, dislikes: 610, active: 140, featured: true, desc: 'Flash sales, busy shopkeepers and a city-wide shopping frenzy. Roleplay the busiest day of the year.' },
  { name: 'Midnight Mystery', scenario: 'midnight_mystery', genre: 'roleplay', art: { palette: ['#1d3557', '#7b2cbf'], motif: 'night', tagline: 'Who did it?' }, creator: 'QuillTheBard', visits: 412000, likes: 31200, dislikes: 1900, active: 380, featured: true, desc: 'Night falls on Larpverse City. Find clues hidden in buildings, survive blackouts and solve the case together.' },
  { name: 'Star Awards Night', scenario: 'star_awards', genre: 'social', art: { palette: ['#9b5de5', '#f15bb5'], motif: 'stage', tagline: 'And the winner is…' }, creator: 'NovaStudio', visits: 268000, likes: 18800, dislikes: 950, active: 220, desc: 'Perform on the Grand Stage, interview the stars and crown the Star of the Night.' },
  { name: 'Hospital Shift RP', scenario: 'hospital_shift', genre: 'roleplay', art: { palette: ['#2a9d8f', '#bde0fe'], motif: 'hospital', tagline: 'Every second counts' }, creator: 'DrJuniper', visits: 96000, likes: 5100, dislikes: 400, active: 60, desc: 'City Hospital is overwhelmed. Medics treat exhausted citizens while reporters cover the story.' },
  { name: 'Sandbox City', scenario: 'sandbox', genre: 'roleplay', art: { palette: ['#06d6a0', '#118ab2'], motif: 'city', tagline: 'Free roleplay' }, creator: 'NovaStudio', visits: 52000, likes: 2600, dislikes: 220, active: 35, desc: 'No objectives, plenty of cash. The perfect set for free roleplay and filming.' },
  { name: 'Sky Islands Obby', engine: 'showcase', genre: 'obby', art: { palette: ['#4cc9f0', '#80ed99'], motif: 'islands', tagline: '100 stages' }, creator: 'ZenithZoe', visits: 1250000, likes: 88000, dislikes: 7000, active: 900, desc: 'Leap across 100 floating islands. Showcase listing in Larpverse.' },
  { name: 'Pet Paradise Simulator', engine: 'showcase', genre: 'simulator', art: { palette: ['#ffafcc', '#ffd166'], motif: 'pets', tagline: 'Hatch & collect' }, creator: 'PixelForge', visits: 2300000, likes: 150000, dislikes: 11000, active: 1700, featured: true, desc: 'Hatch, raise and collect adorable pets. Showcase listing in Larpverse.' },
  { name: 'Burger Tycoon', engine: 'showcase', genre: 'tycoon', art: { palette: ['#e63946', '#f4a261'], motif: 'food', tagline: 'Build an empire' }, creator: 'MintyMarlo', visits: 640000, likes: 33000, dislikes: 4100, active: 410, desc: 'Grow a tiny burger stand into a restaurant empire. Showcase listing in Larpverse.' },
  { name: 'Turbo Kart League', engine: 'showcase', genre: 'racing', art: { palette: ['#ffbe0b', '#3a86ff'], motif: 'racing', tagline: 'Drift to win' }, creator: 'RoboRiley', visits: 870000, likes: 51000, dislikes: 5200, active: 520, desc: 'Fast karts, wild tracks, power-ups. Showcase listing in Larpverse.' },
  { name: 'Haunted Manor', engine: 'showcase', genre: 'horror', art: { palette: ['#2b2d42', '#8d99ae'], motif: 'haunted', tagline: 'Do not look back' }, creator: 'QuillTheBard', visits: 455000, likes: 29000, dislikes: 2600, active: 300, desc: 'Explore a manor where the lights never stay on. Showcase listing in Larpverse.' },
  { name: 'Block Ball Arena', engine: 'showcase', genre: 'sports', art: { palette: ['#06d6a0', '#073b4c'], motif: 'sports', tagline: '5 v 5' }, creator: 'ZenithZoe', visits: 330000, likes: 17000, dislikes: 1900, active: 180, desc: 'Team ball matches in a neon arena. Showcase listing in Larpverse.' },
  { name: 'Puzzle Temple', engine: 'showcase', genre: 'puzzle', art: { palette: ['#e9c46a', '#264653'], motif: 'temple', tagline: 'Think fast' }, creator: 'PixelForge', visits: 120000, likes: 8800, dislikes: 500, active: 70, desc: 'Ancient puzzles and hidden rooms. Showcase listing in Larpverse.' },
  { name: 'Pirate Cove Adventure', engine: 'showcase', genre: 'adventure', art: { palette: ['#118ab2', '#ffd166'], motif: 'pirate', tagline: 'Find the treasure' }, creator: 'CaptainCrumb', visits: 510000, likes: 34000, dislikes: 2800, active: 260, desc: 'Sail, explore and dig for treasure. Showcase listing in Larpverse.' },
  { name: 'Chill Café Hangout', engine: 'showcase', genre: 'social', art: { palette: ['#9c6644', '#f1e3c6'], motif: 'cafe', tagline: 'Coffee & chats' }, creator: 'BeanBarista', visits: 205000, likes: 15000, dislikes: 700, active: 150, desc: 'A cozy café to hang out with friends. Showcase listing in Larpverse.' },
];

const GROUPS = [
  { name: 'Larpverse City Council', owner: 'MayorMaple', desc: 'Official (roleplay) city government of Larpverse City. Town halls, elections and city events.', emblem: { shape: 'shield', color: '#b08968', accent: '#ffd166', symbol: 'crown' }, members: ['OfficerByte', 'DrJuniper', 'LunaVox', 'BeanBarista', 'MintyMarlo', 'SunnyDaze'], count: 48200, shout: 'Town hall at the Grand Stage tonight!' },
  { name: 'Nova Studio Fans', owner: 'NovaStudio', desc: 'Fan club for Nova Studio roleplay worlds.', emblem: { shape: 'star', color: '#7b2cbf', accent: '#ff6b9a', symbol: 'rocket' }, members: ['Starlight', 'ZenithZoe', 'RoboRiley', 'SunnyDaze', 'EchoFrost'], count: 210000, shout: 'New scenario dropping this weekend 🎬' },
  { name: 'Pixel Forge Collective', owner: 'PixelForge', desc: 'Accessory creators and fans.', emblem: { shape: 'hexagon', color: '#4f7cff', accent: '#e9c46a', symbol: 'gem' }, members: ['EchoFrost', 'ThreadLab'], count: 15400 },
  { name: 'LVN News Network', owner: 'LunaVox', desc: 'Larpverse City’s favorite (fictional) news network.', emblem: { shape: 'circle', color: '#e63946', accent: '#f5f5f7', symbol: 'music' }, members: ['MayorMaple', 'QuillTheBard'], count: 8900, shout: 'Breaking: Star Awards nominations are in!' },
  { name: 'Collectors Guild', owner: 'EchoFrost', desc: 'For collectors of limited Larpverse items.', emblem: { shape: 'diamond', color: '#00b4d8', accent: '#f5f5f7', symbol: 'gem' }, members: ['PixelForge', 'Starlight'], count: 3100 },
  { name: 'Midnight Detectives', owner: 'QuillTheBard', desc: 'We solve Midnight Mysteries. Bring a flashlight.', emblem: { shape: 'shield', color: '#1d3557', accent: '#c8b6ff', symbol: 'skull' }, members: ['OfficerByte', 'LunaVox', 'CaptainCrumb'], count: 6600 },
];

export async function seedDemo(owner) {
  const { db } = app;
  if (getFlag('seed_demo') === '1') return;
  const rand = rng(42);
  const t = now();
  db.tx(() => {
    const sku = (s) => db.value('SELECT id FROM items WHERE sku = ?', s);
    const ids = {};
    PEOPLE.forEach((p, i) => {
      const skin = SKINS[i % SKINS.length];
      const id = createAccount({
        ownerUserId: owner.id, username: p.u, displayName: p.d, bio: p.bio, isFictional: true, startingBalance: p.bal,
        bodyColors: { head: skin, leftArm: skin, rightArm: skin, torso: p.colors?.torso ?? '#4f7cff' },
      });
      ids[p.u] = id;
      db.run('UPDATE accounts SET created_at = ? WHERE id = ?', t - (200 + Math.floor(rand() * 1200)) * DAY, id);
      for (const s of [...p.look, ...(p.extra ?? [])]) {
        const itemId = sku(s);
        if (!itemId) continue;
        grantItem(id, itemId, { source: 'purchase', allowSoldOut: true });
      }
      for (const s of p.look) { const itemId = sku(s); if (itemId) { try { equipItem(id, itemId); } catch { /* skip */ } } }
      for (const b of p.badges) assignBadge(id, b, { userId: owner.id });
      const overrides = {};
      if (p.followers) overrides.followers = p.followers;
      if (p.presence) overrides.presence = p.presence;
      db.run('UPDATE profiles SET stat_overrides = ?, status_text = ? WHERE account_id = ?', toJson(overrides), p.presence === 'in_experience' ? 'Playing Larpverse City RP' : '', id);
    });
    if (ids.EchoFrost) {
      db.run('UPDATE profiles SET showcase_item_ids = (SELECT json_group_array(item_id) FROM inventory WHERE account_id = ? AND item_id IN (SELECT id FROM items WHERE is_limited = 1)) WHERE account_id = ?', ids.EchoFrost, ids.EchoFrost);
    }

    // Creators for catalog items: clothing → ThreadLab, accessories/hats/collectibles → PixelForge, the rest → NovaStudio.
    db.run("UPDATE items SET creator_account_id = ? WHERE category IN ('shirt', 'pants', 'hair')", ids.ThreadLab);
    db.run("UPDATE items SET creator_account_id = ? WHERE category IN ('accessory', 'hat', 'collectible', 'face')", ids.PixelForge);
    db.run("UPDATE items SET creator_account_id = ? WHERE category IN ('bundle', 'animation', 'emote', 'special')", ids.NovaStudio);
    db.run("UPDATE items SET creator_account_id = NULL WHERE tags LIKE '%\"starter\"%'");
    for (const it of db.all('SELECT id, price, rarity FROM items WHERE price > 0')) {
      const sold = Math.floor(rand() * (it.rarity === 'common' ? 9000 : it.rarity === 'uncommon' ? 4000 : 900));
      db.run('UPDATE items SET sold_count = CASE WHEN is_limited = 1 THEN MIN(COALESCE(stock, 0), sold_count + ?) ELSE sold_count + ? END WHERE id = ?', Math.floor(sold / 20), sold, it.id);
    }

    // Experiences
    const flagship = db.get("SELECT id FROM experiences WHERE engine = 'larp' ORDER BY id LIMIT 1");
    db.run('UPDATE experiences SET creator_account_id = ?, visits = 3_450_000, likes = 241000, dislikes = 12000, active_override = 1250 WHERE id = ?', ids.NovaStudio, flagship.id);
    EXPERIENCES.forEach((e, i) => {
      db.run(`INSERT INTO experiences (name, description, creator_account_id, genre, art, engine, default_scenario_id, max_players, is_featured, visits, likes, dislikes, active_override, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.name, e.desc, ids[e.creator], e.genre, toJson(e.art), e.engine ?? 'larp', e.scenario ? db.value('SELECT id FROM scenarios WHERE key = ?', e.scenario) : null,
        12, e.featured ? 1 : 0, e.visits, e.likes, e.dislikes, e.active, t - (300 - i * 15) * DAY, t - i * 2 * DAY - Math.floor(rand() * DAY));
    });
    const larpIds = db.all("SELECT id FROM experiences WHERE engine = 'larp'").map((r) => r.id);
    db.run("UPDATE profiles SET stat_overrides = json_set(stat_overrides, '$.presenceExperienceId', ?) WHERE json_extract(stat_overrides, '$.presence') = 'in_experience'", flagship.id);

    // Groups
    for (const g of GROUPS) {
      const gid = db.run('INSERT INTO user_groups (name, description, owner_account_id, emblem, member_count_override, shout, shout_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        g.name, g.desc, ids[g.owner], toJson(g.emblem), g.count, g.shout ?? null, g.shout ? t - 3600_000 : null, t - 400 * DAY, t).id;
      db.run("INSERT INTO group_members (group_id, account_id, rank, joined_at) VALUES (?, ?, 'owner', ?)", gid, ids[g.owner], t - 400 * DAY);
      g.members.forEach((m, i) => db.run("INSERT INTO group_members (group_id, account_id, rank, joined_at) VALUES (?, ?, ?, ?)", gid, ids[m], i === 0 ? 'admin' : 'member', t - (300 - i) * DAY));
      db.run('INSERT INTO group_posts (group_id, account_id, body, created_at) VALUES (?, ?, ?, ?)', gid, ids[g.owner], `Welcome to ${g.name}! Introduce yourself below.`, t - 30 * DAY);
      if (g.members[0]) db.run('INSERT INTO group_posts (group_id, account_id, body, created_at) VALUES (?, ?, ?, ?)', gid, ids[g.members[0]], 'Glad to be here 🎉', t - 29 * DAY);
      if (g.name === 'Larpverse City Council') {
        db.run("UPDATE scripted_events SET params = json_set(params, '$.groupId', ?) WHERE type = 'group_event'", gid);
        db.run('UPDATE experiences SET creator_group_id = ? WHERE id = ?', gid, flagship.id);
      }
    }

    // Social graph among fictional accounts
    const names = Object.keys(ids);
    const pairs = new Set();
    const friend = (x, y, status = 'accepted', requester = null) => {
      const [a, b] = x < y ? [x, y] : [y, x];
      const key = `${a}:${b}`;
      if (a === b || pairs.has(key)) return;
      pairs.add(key);
      db.run('INSERT INTO friendships (account_a, account_b, requester_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?)', a, b, requester ?? x, status, t - Math.floor(rand() * 300) * DAY, status === 'accepted' ? t - Math.floor(rand() * 200) * DAY : null);
    };
    for (let i = 0; i < names.length; i++) {
      for (let k = 1; k <= 4; k++) friend(ids[names[i]], ids[names[(i + k * 3) % names.length]]);
    }
    for (const n of names) {
      for (const target of ['NovaStudio', 'LunaVox', 'PixelForge', 'MayorMaple']) {
        if (n !== target) db.run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', ids[n], ids[target], t - Math.floor(rand() * 300) * DAY);
      }
    }

    // The owner's own account gets a lively social circle.
    const me = db.value('SELECT id FROM accounts WHERE owner_user_id = ? AND is_primary = 1', owner.id);
    if (me) {
      for (const n of ['NovaStudio', 'LunaVox', 'MayorMaple', 'OfficerByte', 'DrJuniper', 'Starlight', 'BeanBarista', 'EchoFrost']) friend(me, ids[n]);
      friend(ids.ZenithZoe, me, 'pending', ids.ZenithZoe);
      friend(ids.CaptainCrumb, me, 'pending', ids.CaptainCrumb);
      for (const n of ['NovaStudio', 'PixelForge', 'LunaVox']) db.run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', me, ids[n], t);
      for (const n of ['Starlight', 'SunnyDaze', 'RoboRiley']) db.run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', ids[n], me, t);
      db.run('INSERT OR IGNORE INTO experience_favorites (account_id, experience_id, created_at) VALUES (?, ?, ?)', me, flagship.id, t);
      db.run("INSERT INTO group_members (group_id, account_id, rank, joined_at) SELECT id, ?, 'member', ? FROM user_groups WHERE name IN ('Larpverse City Council', 'Nova Studio Fans')", me, t);
      notify(me, { type: 'friend_request', title: 'Zoe Zenith sent you a friend request', actorId: ids.ZenithZoe, data: { accountId: ids.ZenithZoe }, at: t - 600_000 });
      notify(me, { type: 'group', title: 'Larpverse City Council: new shout', body: 'Town hall at the Grand Stage tonight!', at: t - 3600_000 });
    }

    // Play history so "recently played" and recommendations have signal.
    for (const n of names) {
      for (let k = 0; k < 3; k++) {
        const e = larpIds[Math.floor(rand() * larpIds.length)];
        db.run('INSERT INTO play_history (account_id, experience_id, started_at, ended_at) VALUES (?, ?, ?, ?)', ids[n], e, t - Math.floor(rand() * 20) * DAY, t - Math.floor(rand() * 19) * DAY);
      }
    }
    for (const n of ['NovaStudio', 'LunaVox', 'Starlight']) {
      for (const e of db.all('SELECT id FROM experiences ORDER BY random() LIMIT 3')) db.run('INSERT OR IGNORE INTO experience_favorites (account_id, experience_id, created_at) VALUES (?, ?, ?)', ids[n], e.id, t);
    }
    setFlag('seed_demo', '1');
  });
}

