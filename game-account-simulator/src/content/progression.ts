import type { AchievementSeed, QuestSeed } from './types';

export const ACHIEVEMENTS: AchievementSeed[] = [
  { key: 'welcome', name: 'Welcome Aboard', description: 'Create your Blockora account.', icon: 'rocket', category: 'account', metric: 'joined', target: 1, rewardOrbs: 50, rewardXp: 10, sortOrder: 1 },
  { key: 'first_purchase', name: 'First Haul', description: 'Buy your first marketplace item.', icon: 'bag', category: 'collection', metric: 'purchases', target: 1, rewardOrbs: 100, rewardXp: 20, sortOrder: 2 },
  { key: 'collector_10', name: 'Collector', description: 'Collect 10 different items (starter items don\'t count).', icon: 'cube', category: 'collection', metric: 'items_owned', target: 10, rewardOrbs: 250, rewardXp: 40, sortOrder: 3 },
  { key: 'collector_25', name: 'Curator', description: 'Collect 25 different items.', icon: 'cubes', category: 'collection', metric: 'items_owned', target: 25, rewardOrbs: 500, rewardXp: 80, sortOrder: 4 },
  { key: 'collector_50', name: 'Museum Grade', description: 'Collect 50 different items.', icon: 'crown', category: 'collection', metric: 'items_owned', target: 50, rewardOrbs: 1000, rewardXp: 150, sortOrder: 5 },
  { key: 'limited_owner', name: 'Serial Collector', description: 'Own a limited item with a serial number.', icon: 'diamond', category: 'collection', metric: 'limited_owned', target: 1, rewardOrbs: 500, rewardXp: 60, sortOrder: 6 },
  { key: 'set_complete', name: 'Full Set', description: 'Complete an item set.', icon: 'layers', category: 'collection', metric: 'sets_completed', target: 1, rewardOrbs: 300, rewardXp: 50, sortOrder: 7 },
  { key: 'fashionista', name: 'Fashionista', description: 'Save 3 outfits.', icon: 'shirt', category: 'collection', metric: 'outfits_saved', target: 3, rewardOrbs: 150, rewardXp: 30, sortOrder: 8 },
  { key: 'first_game', name: 'Player One', description: 'Finish your first game.', icon: 'gamepad', category: 'games', metric: 'games_played', target: 1, rewardOrbs: 50, rewardXp: 15, sortOrder: 9 },
  { key: 'gamer_25', name: 'Regular', description: 'Finish 25 games.', icon: 'joystick', category: 'games', metric: 'games_played', target: 25, rewardOrbs: 300, rewardXp: 60, sortOrder: 10 },
  { key: 'gamer_100', name: 'Arcade Legend', description: 'Finish 100 games.', icon: 'trophy', category: 'games', metric: 'games_played', target: 100, rewardOrbs: 1000, rewardXp: 200, sortOrder: 11 },
  { key: 'explorer', name: 'Explorer', description: 'Play 5 different experiences.', icon: 'compass', category: 'games', metric: 'distinct_games', target: 5, rewardOrbs: 200, rewardXp: 40, sortOrder: 12 },
  { key: 'globetrotter', name: 'Globetrotter', description: 'Play every experience on Blockora.', icon: 'globe', category: 'games', metric: 'distinct_games', target: 14, rewardOrbs: 1500, rewardXp: 250, sortOrder: 13 },
  { key: 'rush_pro', name: 'Rush Pro', description: 'Score 2,500 in any Orb Rush experience.', icon: 'bolt', category: 'games', metric: 'best_score_engine', engine: 'orb_rush', target: 2500, rewardOrbs: 400, rewardXp: 60, sortOrder: 14 },
  { key: 'stack_master', name: 'Skyscraper', description: 'Stack a tower 25 blocks high.', icon: 'tower', category: 'games', metric: 'best_score_engine', engine: 'stacker', target: 25, rewardOrbs: 400, rewardXp: 60, sortOrder: 15 },
  { key: 'reflex_ace', name: 'Lightning Reflexes', description: 'Score 450 in any reflex experience.', icon: 'target', category: 'games', metric: 'best_score_engine', engine: 'reflex', target: 450, rewardOrbs: 400, rewardXp: 60, sortOrder: 16 },
  { key: 'memory_genius', name: 'Memory Genius', description: 'Score 1,800 in any matching experience.', icon: 'brain', category: 'games', metric: 'best_score_engine', engine: 'glyph_match', target: 1800, rewardOrbs: 400, rewardXp: 60, sortOrder: 17 },
  { key: 'pass_holder', name: 'VIP', description: 'Own a game pass.', icon: 'ticket', category: 'games', metric: 'passes_owned', target: 1, rewardOrbs: 150, rewardXp: 25, sortOrder: 18 },
  { key: 'social_5', name: 'Social Butterfly', description: 'Have 5 friends.', icon: 'users', category: 'social', metric: 'friends', target: 5, rewardOrbs: 200, rewardXp: 40, sortOrder: 19 },
  { key: 'networker', name: 'Networker', description: 'Follow 10 players.', icon: 'userplus', category: 'social', metric: 'following', target: 10, rewardOrbs: 100, rewardXp: 20, sortOrder: 20 },
  { key: 'popular', name: 'Rising Star', description: 'Get 10 followers.', icon: 'star', category: 'social', metric: 'followers', target: 10, rewardOrbs: 300, rewardXp: 50, sortOrder: 21 },
  { key: 'streak_3', name: 'Warming Up', description: 'Reach a 3-day login streak.', icon: 'flame', category: 'progression', metric: 'streak', target: 3, rewardOrbs: 100, rewardXp: 20, sortOrder: 22 },
  { key: 'streak_7', name: 'On Fire', description: 'Reach a 7-day login streak.', icon: 'fire', category: 'progression', metric: 'streak', target: 7, rewardOrbs: 400, rewardXp: 60, sortOrder: 23 },
  { key: 'streak_30', name: 'Unstoppable', description: 'Reach a 30-day login streak.', icon: 'medal', category: 'progression', metric: 'streak', target: 30, rewardOrbs: 2000, rewardXp: 300, sortOrder: 24 },
  { key: 'level_5', name: 'Level 5', description: 'Reach level 5.', icon: 'chevron', category: 'progression', metric: 'level', target: 5, rewardOrbs: 200, rewardXp: 0, sortOrder: 25 },
  { key: 'level_10', name: 'Level 10', description: 'Reach level 10.', icon: 'chevrons', category: 'progression', metric: 'level', target: 10, rewardOrbs: 500, rewardXp: 0, sortOrder: 26 },
  { key: 'level_25', name: 'Level 25', description: 'Reach level 25.', icon: 'shield', category: 'progression', metric: 'level', target: 25, rewardOrbs: 1500, rewardXp: 0, sortOrder: 27 },
  { key: 'orb_hoarder', name: 'Orb Hoarder', description: 'Hold 10,000 Orbs at once.', icon: 'orb', category: 'progression', metric: 'balance', target: 10000, rewardOrbs: 500, rewardXp: 50, isSecret: true, sortOrder: 28 },
];

export const QUESTS: QuestSeed[] = [
  { key: 'play_3', title: 'Warm-up', description: 'Finish 3 games.', goalType: 'games_played', target: 3, rewardOrbs: 75, rewardXp: 20, sortOrder: 1 },
  { key: 'earn_100', title: 'Orb Collector', description: 'Earn 100 Orbs from games.', goalType: 'game_orbs_earned', target: 100, rewardOrbs: 80, rewardXp: 20, sortOrder: 2 },
  { key: 'buy_1', title: 'Shopping Spree', description: 'Buy 1 item or game pass.', goalType: 'items_bought', target: 1, rewardOrbs: 60, rewardXp: 15, sortOrder: 3 },
  { key: 'social_2', title: 'Make Connections', description: 'Send 2 friend requests or follows.', goalType: 'social_actions', target: 2, rewardOrbs: 50, rewardXp: 15, sortOrder: 4 },
  { key: 'new_game', title: 'Try Something New', description: 'Play an experience for the first time.', goalType: 'new_games_played', target: 1, rewardOrbs: 90, rewardXp: 25, sortOrder: 5 },
  { key: 'outfit_1', title: 'Style Check', description: 'Save or wear an outfit.', goalType: 'outfit_actions', target: 1, rewardOrbs: 40, rewardXp: 10, sortOrder: 6 },
  { key: 'daily_1', title: 'Show Up', description: 'Claim your daily reward.', goalType: 'daily_claimed', target: 1, rewardOrbs: 30, rewardXp: 10, sortOrder: 7 },
  { key: 'play_6', title: 'Marathon', description: 'Finish 6 games.', goalType: 'games_played', target: 6, rewardOrbs: 140, rewardXp: 35, sortOrder: 8 },
];

export const PROFILE_THEMES: { key: string; name: string; level: number; colors: [string, string] }[] = [
  { key: 'default', name: 'Blockora', level: 1, colors: ['#7C5CFF', '#22D3EE'] },
  { key: 'midnight', name: 'Midnight', level: 1, colors: ['#1E293B', '#475569'] },
  { key: 'sunset', name: 'Sunset', level: 3, colors: ['#F97316', '#DB2777'] },
  { key: 'ocean', name: 'Ocean', level: 5, colors: ['#0EA5E9', '#14B8A6'] },
  { key: 'forest', name: 'Forest', level: 8, colors: ['#15803D', '#84CC16'] },
  { key: 'neon', name: 'Neon', level: 12, colors: ['#39FF14', '#F72585'] },
  { key: 'galaxy', name: 'Galaxy', level: 20, colors: ['#4C1D95', '#0EA5E9'] },
  { key: 'gold', name: 'Gold', level: 30, colors: ['#F59E0B', '#FDE68A'] },
];
