import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { num, requireOnline, rpc, select } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { AvatarAppearance, InventoryEntry, Slot } from '@/api/types';
import { useUserId } from '@/stores/session';
import type { HeadShape } from '@/theme/tokens';

type AvatarRow = { user_id: string; skin_color: string; head_shape: HeadShape };

export function useInventory() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.inventory,
    queryFn: async () => {
      const rows = await select<Record<string, unknown>[]>((db) =>
        db.from('inventory').select('*, item:items(*)').eq('user_id', userId).order('acquired_at', { ascending: false }),
      );
      return rows.map((row) => ({ ...(row as unknown as InventoryEntry), price_paid: num(row.price_paid) }));
    },
  });
}

export function useAvatarBase() {
  const userId = useUserId();
  return useQuery({
    queryKey: [...queryKeys.inventory, 'avatar'],
    queryFn: () => select<AvatarRow>((db) => db.from('avatars').select('*').eq('user_id', userId).single()),
  });
}

/** The signed-in player's current look, assembled from their avatar row + equipped items. */
export function useMyAppearance(): AvatarAppearance | null {
  const inventory = useInventory();
  const avatar = useAvatarBase();
  return useMemo(() => {
    if (!avatar.data) return null;
    return {
      skin_color: avatar.data.skin_color,
      head_shape: avatar.data.head_shape,
      equipped: (inventory.data ?? [])
        .filter((entry) => entry.equipped)
        .map((entry) => ({
          item_id: entry.item_id,
          slot: entry.slot,
          asset_key: entry.item.asset_key,
          primary_color: entry.item.primary_color,
          secondary_color: entry.item.secondary_color,
        })),
    };
  }, [avatar.data, inventory.data]);
}

/**
 * Equip/unequip update the cache optimistically (purely cosmetic) and roll back
 * if the server rejects the change. Ownership is still checked server-side.
 */
function useEquipMutation(kind: 'equip' | 'unequip') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { item_id: string; slot: Slot }) => {
      requireOnline();
      await rpc(kind === 'equip' ? 'equip_item' : 'unequip_item', { p_item_id: entry.item_id });
    },
    onMutate: async (entry) => {
      await client.cancelQueries({ queryKey: queryKeys.inventory, exact: true });
      const previous = client.getQueryData<InventoryEntry[]>(queryKeys.inventory);
      client.setQueryData<InventoryEntry[]>(queryKeys.inventory, (old) =>
        old?.map((row) => {
          if (row.item_id === entry.item_id) return { ...row, equipped: kind === 'equip' };
          if (kind === 'equip' && row.slot === entry.slot) return { ...row, equipped: false };
          return row;
        }),
      );
      return { previous };
    },
    onError: (_error, _entry, context) => {
      if (context?.previous) client.setQueryData(queryKeys.inventory, context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.inventory, exact: true });
      void client.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useEquipItem() {
  return useEquipMutation('equip');
}

export function useUnequipItem() {
  return useEquipMutation('unequip');
}

export function useUpdateAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { skin_color: string; head_shape: HeadShape }) => {
      requireOnline();
      return rpc<AvatarRow>('update_avatar', { p_skin_color: input.skin_color, p_head_shape: input.head_shape });
    },
    onSuccess: (row) => {
      client.setQueryData([...queryKeys.inventory, 'avatar'], row);
      void client.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
