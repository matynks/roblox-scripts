import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireOnline, rpc } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { DevAuditEntry, DevDiagnostics, DevTransaction, DevUser, DevUserSnapshot } from '@/api/types';

/** Asks the server whether the signed-in user holds the developer role. */
export async function devWhoAmI(): Promise<boolean> {
  requireOnline();
  const result = await rpc<{ is_developer: boolean }>('dev_whoami');
  return result.is_developer === true;
}

export function useDevAccess() {
  return useQuery({
    queryKey: [...queryKeys.dev, 'whoami'],
    queryFn: devWhoAmI,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    meta: { persist: false },
  });
}

export function useDevUsers(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dev, 'users', query],
    queryFn: () => rpc<DevUser[]>('dev_find_users', { p_query: query }),
    enabled,
    meta: { persist: false },
  });
}

export function useDevUser(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dev, 'user', userId ?? 'none'],
    queryFn: () => rpc<DevUserSnapshot>('dev_get_user', { p_user_id: userId }),
    enabled: enabled && !!userId,
    meta: { persist: false },
  });
}

export function useDevDiagnostics(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dev, 'diagnostics'],
    queryFn: () => rpc<DevDiagnostics>('dev_diagnostics'),
    enabled,
    meta: { persist: false },
  });
}

export function useDevTransactions(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dev, 'transactions', userId ?? 'all'],
    queryFn: () => rpc<DevTransaction[]>('dev_list_transactions', { p_user_id: userId, p_limit: 100 }),
    enabled,
    meta: { persist: false },
  });
}

export function useDevAuditLog(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dev, 'audit'],
    queryFn: () => rpc<DevAuditEntry[]>('dev_list_audit_log', { p_limit: 100 }),
    enabled,
    meta: { persist: false },
  });
}

export type DevAction =
  | { type: 'set_balance'; userId: string; balance: number; reason: string }
  | { type: 'adjust_balance'; userId: string; delta: number; reason: string }
  | { type: 'set_stats'; userId: string; simulatedFollowers?: number; xp?: number; profileVisits?: number; gamesPlayed?: number }
  | { type: 'grant_item'; userId: string; itemId: string }
  | { type: 'revoke_item'; userId: string; itemId: string }
  | { type: 'grant_pass'; userId: string; passId: string }
  | { type: 'revoke_pass'; userId: string; passId: string }
  | { type: 'reset_user'; userId: string; includeSocial: boolean };

function callFor(action: DevAction): [string, Record<string, unknown>] {
  switch (action.type) {
    case 'set_balance':
      return ['dev_set_balance', { p_user_id: action.userId, p_balance: action.balance, p_reason: action.reason }];
    case 'adjust_balance':
      return ['dev_adjust_balance', { p_user_id: action.userId, p_delta: action.delta, p_reason: action.reason }];
    case 'set_stats':
      return [
        'dev_set_stats',
        {
          p_user_id: action.userId,
          p_simulated_followers: action.simulatedFollowers ?? null,
          p_xp: action.xp ?? null,
          p_profile_visits: action.profileVisits ?? null,
          p_games_played: action.gamesPlayed ?? null,
        },
      ];
    case 'grant_item':
      return ['dev_grant_item', { p_user_id: action.userId, p_item_id: action.itemId }];
    case 'revoke_item':
      return ['dev_revoke_item', { p_user_id: action.userId, p_item_id: action.itemId }];
    case 'grant_pass':
      return ['dev_grant_pass', { p_user_id: action.userId, p_pass_id: action.passId }];
    case 'revoke_pass':
      return ['dev_revoke_pass', { p_user_id: action.userId, p_pass_id: action.passId }];
    case 'reset_user':
      return ['dev_reset_user', { p_user_id: action.userId, p_include_social: action.includeSocial }];
  }
}

export function useDevAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action: DevAction) => {
      requireOnline();
      const [fn, args] = callFor(action);
      return rpc<Record<string, unknown>>(fn, args);
    },
    onSettled: () => {
      // Developer changes can affect anything the player sees.
      void client.invalidateQueries();
    },
  });
}

export { callFor as devCallFor };
