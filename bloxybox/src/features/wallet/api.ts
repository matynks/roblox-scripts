import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { num, requireOnline, rpc, select } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { DailyRewardClaim, DailyRewardStatus, Transaction, Wallet } from '@/api/types';
import { useUserId } from '@/stores/session';

export const TRANSACTIONS_PAGE_SIZE = 30;

function normaliseWallet(row: Record<string, unknown>): Wallet {
  return {
    user_id: String(row.user_id),
    balance: num(row.balance),
    lifetime_earned: num(row.lifetime_earned),
    lifetime_spent: num(row.lifetime_spent),
    updated_at: String(row.updated_at),
  };
}

export function normaliseTransaction(row: Record<string, unknown>): Transaction {
  return {
    ...(row as unknown as Transaction),
    id: num(row.id),
    amount: num(row.amount),
    balance_after: num(row.balance_after),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export function useWallet() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: async () => {
      const row = await select<Record<string, unknown>>((db) =>
        db.from('wallets').select('*').eq('user_id', userId).single(),
      );
      return normaliseWallet(row);
    },
  });
}

/**
 * Writes the balance the SERVER returned after a mutation into the cache.
 * The client never calculates balances itself.
 */
export function applyServerBalance(client: QueryClient, balance: number): void {
  client.setQueryData<Wallet>(queryKeys.wallet, (old) => (old ? { ...old, balance } : old));
}

/** Invalidates everything that changes when BoxCoins move. */
export function invalidateEconomy(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: queryKeys.wallet });
  void client.invalidateQueries({ queryKey: queryKeys.transactions });
}

export function useTransactions() {
  const userId = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.transactions,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * TRANSACTIONS_PAGE_SIZE;
      const rows = await select<Record<string, unknown>[]>((db) =>
        db
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + TRANSACTIONS_PAGE_SIZE - 1),
      );
      return rows.map(normaliseTransaction);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.length === TRANSACTIONS_PAGE_SIZE ? pages.length : undefined),
  });
}

export function useTransaction(id: number) {
  const userId = useUserId();
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: async () => {
      const row = await select<Record<string, unknown>>((db) =>
        db.from('transactions').select('*').eq('user_id', userId).eq('id', id).single(),
      );
      return normaliseTransaction(row);
    },
    initialData: () => {
      const pages = client.getQueryData<{ pages: Transaction[][] }>(queryKeys.transactions)?.pages;
      return pages?.flat().find((t) => t.id === id);
    },
    enabled: Number.isFinite(id),
  });
}

export function useDailyRewardStatus() {
  return useQuery({
    queryKey: queryKeys.dailyReward,
    queryFn: async () => {
      const status = await rpc<DailyRewardStatus>('get_daily_reward_status');
      return { ...status, next_amount: num(status.next_amount), streak: num(status.streak), next_streak: num(status.next_streak) };
    },
    staleTime: 60_000,
  });
}

export function useClaimDailyReward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      requireOnline();
      const result = await rpc<DailyRewardClaim>('claim_daily_reward');
      return { ...result, amount: num(result.amount), balance: num(result.balance) };
    },
    onSuccess: (result) => {
      applyServerBalance(client, result.balance);
      invalidateEconomy(client);
      void client.invalidateQueries({ queryKey: queryKeys.dailyReward });
      void client.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: queryKeys.dailyReward });
    },
  });
}

export const TRANSACTION_LABELS: Record<Transaction['kind'], string> = {
  welcome_bonus: 'Welcome bonus',
  daily_reward: 'Daily reward',
  game_reward: 'Game reward',
  item_purchase: 'Item purchase',
  pass_purchase: 'Game Pass purchase',
  dev_adjustment: 'Developer adjustment',
  dev_set_balance: 'Developer balance change',
  dev_reset: 'Test data reset',
};
