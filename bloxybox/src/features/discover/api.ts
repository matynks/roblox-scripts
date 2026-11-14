import { useQuery } from '@tanstack/react-query';

import { num, rpc, select } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { Experience, ExperienceCategory, GameProgress, LeaderboardEntry } from '@/api/types';
import { useUserId } from '@/stores/session';

export const CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  arcade: 'Arcade',
  action: 'Action',
  puzzle: 'Puzzle',
  casual: 'Casual',
  simulation: 'Simulation',
  adventure: 'Adventure',
};

function normaliseExperience(row: Record<string, unknown>): Experience {
  return {
    ...(row as unknown as Experience),
    coins_per_point: num(row.coins_per_point),
    play_count: num(row.play_count),
    win_bonus: num(row.win_bonus),
    max_reward_per_run: num(row.max_reward_per_run),
    daily_reward_cap: num(row.daily_reward_cap),
    win_score: num(row.win_score),
  };
}

export function useExperiences() {
  return useQuery({
    queryKey: queryKeys.experiences,
    queryFn: async () => {
      const rows = await select<Record<string, unknown>[]>((db) =>
        db
          .from('experiences')
          .select(
            'id, slug, title, tagline, description, how_to_play, category, status, is_featured, sort_order, accent_color, score_label, released_at, coins_per_point, win_bonus, max_reward_per_run, daily_reward_cap, win_score, play_count',
          )
          .order('sort_order'),
      );
      return rows.map(normaliseExperience);
    },
    staleTime: 5 * 60_000,
  });
}

export function useExperience(slug: string) {
  const query = useExperiences();
  return { ...query, data: query.data?.find((e) => e.slug === slug) };
}

export function useMyProgress() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.progress,
    queryFn: async () => {
      const rows = await select<Record<string, unknown>[]>((db) => db.from('game_progress').select('*').eq('user_id', userId));
      return rows.map((row) => ({
        ...(row as unknown as GameProgress),
        total_coins_earned: num(row.total_coins_earned),
      }));
    },
  });
}

export function useLeaderboard(slug: string) {
  return useQuery({
    queryKey: queryKeys.leaderboard(slug),
    queryFn: () => rpc<LeaderboardEntry[]>('get_leaderboard', { p_slug: slug, p_limit: 20 }),
    enabled: slug.length > 0,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers for the Discover screen (unit tested)
// ---------------------------------------------------------------------------
export function featuredExperiences(list: Experience[]): Experience[] {
  return list.filter((e) => e.is_featured).sort((a, b) => a.sort_order - b.sort_order);
}

export function popularExperiences(list: Experience[]): Experience[] {
  return list
    .filter((e) => e.status === 'playable')
    .sort((a, b) => b.play_count - a.play_count || a.sort_order - b.sort_order);
}

export function newExperiences(list: Experience[]): Experience[] {
  return list
    .filter((e) => e.status === 'playable' && e.released_at)
    .sort((a, b) => (b.released_at ?? '').localeCompare(a.released_at ?? ''));
}

export function inDevelopment(list: Experience[]): Experience[] {
  return list.filter((e) => e.status === 'in_development');
}

export function searchExperiences(list: Experience[], query: string, category: ExperienceCategory | 'all'): Experience[] {
  const q = query.trim().toLowerCase();
  return list
    .filter((e) => category === 'all' || e.category === category)
    .filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.tagline.toLowerCase().includes(q) ||
        CATEGORY_LABELS[e.category].toLowerCase().includes(q),
    )
    .sort((a, b) => Number(b.status === 'playable') - Number(a.status === 'playable') || a.sort_order - b.sort_order);
}
