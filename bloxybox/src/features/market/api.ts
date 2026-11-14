import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { num, requireOnline, rpc, select } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { Item, Listing, PurchaseResult } from '@/api/types';
import { applyServerBalance, invalidateEconomy } from '@/features/wallet/api';

export function useListings() {
  return useQuery({
    queryKey: queryKeys.listings,
    queryFn: async () => {
      const rows = await select<Record<string, unknown>[]>((db) =>
        db.from('marketplace_listings').select('*, item:items(*)').eq('is_active', true),
      );
      return rows.map((row) => ({ ...(row as unknown as Listing), price: num(row.price) }));
    },
    staleTime: 5 * 60_000,
  });
}

export function useItems() {
  return useQuery({
    queryKey: queryKeys.items,
    queryFn: () => select<Item[]>((db) => db.from('items').select('*').order('slot').order('name')),
    staleTime: 10 * 60_000,
  });
}

export function usePurchaseItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      requireOnline();
      const result = await rpc<PurchaseResult & { item_id: string }>('purchase_item', { p_listing_id: listingId });
      return { ...result, balance: num(result.balance), price: num(result.price) };
    },
    onSuccess: (result) => {
      applyServerBalance(client, result.balance);
      invalidateEconomy(client);
      void client.invalidateQueries({ queryKey: queryKeys.inventory });
      void client.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      // Our view of the balance or ownership may be stale; refresh it.
      invalidateEconomy(client);
      void client.invalidateQueries({ queryKey: queryKeys.inventory });
    },
  });
}
