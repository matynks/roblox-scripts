import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { num, requireOnline, rpc, select } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { GamePass, PassOwnership, Perk, PurchaseResult } from '@/api/types';
import { applyServerBalance, invalidateEconomy } from '@/features/wallet/api';

export const PERK_ICONS: Record<Perk, 'cash-outline' | 'resize-outline' | 'timer-outline' | 'shield-checkmark-outline' | 'magnet-outline'> = {
  double_coins: 'cash-outline',
  wide_start: 'resize-outline',
  slow_motion: 'timer-outline',
  extra_life: 'shield-checkmark-outline',
  coin_magnet: 'magnet-outline',
};

export function useGamePasses() {
  return useQuery({
    queryKey: queryKeys.gamePasses,
    queryFn: async () => {
      const rows = await select<Record<string, unknown>[]>((db) =>
        db
          .from('game_passes')
          .select('*, experience:experiences(id, slug, title, accent_color)')
          .eq('is_active', true)
          .order('sort_order'),
      );
      return rows.map((row) => ({ ...(row as unknown as GamePass), price: num(row.price) }));
    },
    staleTime: 10 * 60_000,
  });
}

export function usePassOwnership() {
  return useQuery({
    queryKey: queryKeys.passOwnership,
    queryFn: async () => {
      // RLS limits this to the caller's own rows.
      const rows = await select<PassOwnership[]>((db) => db.from('game_pass_ownership').select('*'));
      return new Map(rows.map((row) => [row.pass_id, row]));
    },
    meta: { persist: false },
  });
}

export function usePurchasePass() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (passId: string) => {
      requireOnline();
      const result = await rpc<PurchaseResult & { pass_id: string }>('purchase_game_pass', { p_pass_id: passId });
      return { ...result, balance: num(result.balance) };
    },
    onSuccess: (result) => {
      applyServerBalance(client, result.balance);
      invalidateEconomy(client);
      void client.invalidateQueries({ queryKey: queryKeys.passOwnership });
    },
    onError: () => {
      invalidateEconomy(client);
      void client.invalidateQueries({ queryKey: queryKeys.passOwnership });
    },
  });
}

export function useSetPassEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { passId: string; enabled: boolean }) => {
      requireOnline();
      return rpc('set_game_pass_enabled', { p_pass_id: input.passId, p_enabled: input.enabled });
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.passOwnership });
    },
  });
}
