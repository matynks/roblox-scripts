import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { num, requireOnline, rpc } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { PlayerCard, ProfileSummary } from '@/api/types';
import type { Accent } from '@/theme/tokens';

export type ConnectionKind = 'followers' | 'following' | 'friends';

function normaliseSummary(s: ProfileSummary): ProfileSummary {
  return {
    ...s,
    stats: {
      ...s.stats,
      xp: num(s.stats.xp),
      xp_level_start: num(s.stats.xp_level_start),
      xp_next_level: num(s.stats.xp_next_level),
      games_played: num(s.stats.games_played),
      profile_visits: num(s.stats.profile_visits),
      items_owned: num(s.stats.items_owned),
      experiences_played: num(s.stats.experiences_played),
    },
    social: {
      followers_real: num(s.social.followers_real),
      followers_simulated: num(s.social.followers_simulated),
      followers_total: num(s.social.followers_total),
      following: num(s.social.following),
      friends: num(s.social.friends),
    },
  };
}

export function useProfileSummary(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? 'none'),
    queryFn: async () => normaliseSummary(await rpc<ProfileSummary>('get_profile_summary', { p_user_id: userId })),
    enabled: !!userId,
  });
}

export function useConnections(userId: string, kind: ConnectionKind) {
  return useQuery({
    queryKey: queryKeys.connections(userId, kind),
    queryFn: () => rpc<PlayerCard[]>('list_connections', { p_user_id: userId, p_kind: kind, p_limit: 100, p_offset: 0 }),
  });
}

export function usePlayerSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.playerSearch(trimmed.toLowerCase()),
    queryFn: () => rpc<PlayerCard[]>('search_players', { p_query: trimmed, p_limit: 30 }),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    meta: { persist: false },
  });
}

export function useFollow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; follow: boolean }) => {
      requireOnline();
      return rpc<{ following: boolean; is_friend: boolean }>(input.follow ? 'follow_user' : 'unfollow_user', {
        p_user_id: input.userId,
      });
    },
    onMutate: async (input) => {
      const key = queryKeys.profile(input.userId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ProfileSummary>(key);
      if (previous && previous.relationship.is_following !== input.follow) {
        const delta = input.follow ? 1 : -1;
        client.setQueryData<ProfileSummary>(key, {
          ...previous,
          relationship: { ...previous.relationship, is_following: input.follow },
          social: {
            ...previous.social,
            followers_real: previous.social.followers_real + delta,
            followers_total: previous.social.followers_total + delta,
          },
        });
      }
      return { previous };
    },
    onError: (_e, input, context) => {
      if (context?.previous) client.setQueryData(queryKeys.profile(input.userId), context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['profile'] });
      void client.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

/** Counts a profile view (once per visitor per day, enforced server-side). Failures are ignored. */
export async function recordProfileVisit(userId: string): Promise<void> {
  try {
    await rpc('record_profile_visit', { p_user_id: userId });
  } catch {
    // Visits are a cosmetic statistic; never surface errors for them.
  }
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { displayName: string; bio: string; accent: Accent }) => {
      requireOnline();
      return rpc('update_profile', { p_display_name: input.displayName, p_bio: input.bio, p_accent: input.accent });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useSetUsername() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      requireOnline();
      return rpc<{ username: string }>('set_username', { p_username: username });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
