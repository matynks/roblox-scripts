import type { SeasonKey } from '@/content/types';

/**
 * Pure rule tables. These mirror the SQL functions in
 * supabase/migrations/20261114000003_internal_engine.sql exactly; the
 * integration suite asserts both produce identical results.
 */

export const SIGNUP_BONUS = 750;
export const USERNAME_CHANGE_COST = 1000;
export const MAX_LIMITED_COPIES = 3;
export const MAX_OUTFITS = 50;
export const MAX_FRIENDS = 1000;
export const DISPLAY_NAME_COOLDOWN_DAYS = 7;
export const MAX_BALANCE = 1_000_000_000;

export function levelForXp(xp: number): number {
  return Math.min(100, Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * Math.max(xp, 0))) / 2)));
}

export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelReward(level: number): number {
  return 25 * level;
}

const DAILY_CYCLE = [50, 75, 100, 125, 150, 200, 400];

export function dailyRewardForStreak(streak: number): number {
  const s = Math.max(streak, 1);
  return DAILY_CYCLE[(s - 1) % 7] + Math.min(300, 50 * Math.floor((s - 1) / 7));
}

export function dailyCycle(): number[] {
  return [1, 2, 3, 4, 5, 6, 7].map(dailyRewardForStreak);
}

export function seasonForDate(d: Date): SeasonKey {
  const m = d.getUTCMonth() + 1;
  if (m === 12 || m <= 2) return 'frostbyte';
  if (m <= 5) return 'bloom';
  if (m <= 8) return 'solar';
  return 'neon_harvest';
}

/** Exclusive end (00:00 UTC of the first day after the season). */
export function seasonEnd(d: Date): Date {
  const m = d.getUTCMonth() + 1;
  const add = { 12: 3, 1: 2, 2: 1, 3: 3, 4: 2, 5: 1, 6: 3, 7: 2, 8: 1, 9: 3, 10: 2, 11: 1 }[m as 1]!;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + add, 1));
}

/** UTC calendar day as YYYY-MM-DD */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDay(d);
}

/** Index of the three active daily quests within a pool ordered by sortOrder. */
export function activeQuestIndexes(day: string, poolSize: number): number[] {
  const dayIndex = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse('2026-01-01T00:00:00Z')) / 86400000);
  const mod = (x: number) => ((x % poolSize) + poolSize) % poolSize;
  return [mod(dayIndex * 3), mod(dayIndex * 3 + 1), mod(dayIndex * 3 + 2)].sort((a, b) => a - b);
}

export const PROFILE_THEME_LEVELS: Record<string, number> = {
  default: 1,
  midnight: 1,
  sunset: 3,
  ocean: 5,
  forest: 8,
  neon: 12,
  galaxy: 20,
  gold: 30,
};

export interface GameRewardInput {
  score: number;
  elapsedSeconds: number;
  scorePerOrb: number;
  maxOrbsPerSession: number;
  dailyOrbCap: number;
  orbsEarnedToday: number;
  maxScorePerSecond: number;
  scoreGrace: number;
  xpPerPlay: number;
  orbMultiplier?: number;
  xpMultiplier?: number;
}

export type GameRewardResult =
  | { status: 'rejected'; reason: 'IMPLAUSIBLE_SCORE' | 'INVALID_SCORE'; orbs: 0; xp: 0 }
  | { status: 'ok'; orbs: number; xp: number; dailyCapReached: boolean };

/** Mirrors public.submit_game_score reward maths. */
export function computeGameReward(i: GameRewardInput): GameRewardResult {
  if (!Number.isFinite(i.score) || i.score < 0 || i.score > 100_000_000) {
    return { status: 'rejected', reason: 'INVALID_SCORE', orbs: 0, xp: 0 };
  }
  if (i.score > i.maxScorePerSecond * Math.max(i.elapsedSeconds, 1) + i.scoreGrace) {
    return { status: 'rejected', reason: 'IMPLAUSIBLE_SCORE', orbs: 0, xp: 0 };
  }
  let orbs = Math.min(Math.floor(i.score / i.scorePerOrb), i.maxOrbsPerSession);
  orbs = Math.floor(orbs * (i.orbMultiplier ?? 1));
  if (i.elapsedSeconds < 3) orbs = 0;
  const remaining = Math.max(i.dailyOrbCap - i.orbsEarnedToday, 0);
  let dailyCapReached = false;
  if (orbs > remaining) {
    orbs = remaining;
    dailyCapReached = true;
  }
  const xp = Math.floor((i.xpPerPlay + Math.min(Math.floor(i.score / i.scorePerOrb), 20)) * (i.xpMultiplier ?? 1));
  return { status: 'ok', orbs, xp, dailyCapReached };
}
