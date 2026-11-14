import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { SLOT_LABELS, SLOTS, type InventoryEntry, type Slot } from '@/api/types';
import { AppText } from '@/components/ui/AppText';
import { withAlpha } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow, SegmentedControl } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/StateViews';
import { AvatarView, ItemPreview } from '@/features/avatar/AvatarView';
import { useAvatarBase, useEquipItem, useInventory, useMyAppearance, useUnequipItem, useUpdateAvatar } from '@/features/inventory/api';
import { haptics } from '@/lib/haptics';
import { toast } from '@/stores/toast';
import { colors, headShapes, radii, rarityColors, skinColors, spacing, type HeadShape } from '@/theme/tokens';

const SHAPE_LABELS: Record<HeadShape, string> = { cube: 'Cube', round: 'Round', tall: 'Tall' };

function InventoryTile({
  entry,
  size,
  onToggle,
  onOpen,
}: {
  entry: InventoryEntry;
  size: number;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const rarity = rarityColors[entry.item.rarity];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.item.name}, ${entry.equipped ? 'equipped. Tap to unequip' : 'tap to equip'}. Long press for details`}
      accessibilityState={{ selected: entry.equipped }}
      onPress={onToggle}
      onLongPress={onOpen}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.tile,
        { width: size, borderColor: entry.equipped ? colors.primary : withAlpha(rarity, 0.3) },
        entry.equipped ? { backgroundColor: colors.primarySoft } : null,
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <ItemPreview item={entry.item} size={size - spacing.lg} />
      <AppText variant="micro" numberOfLines={1} color={colors.text}>
        {entry.item.name}
      </AppText>
      {entry.equipped ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={12} color={colors.textOnPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AvatarScreen() {
  const { width } = useWindowDimensions();
  const inventory = useInventory();
  const avatar = useAvatarBase();
  const appearance = useMyAppearance();
  const equip = useEquipItem();
  const unequip = useUnequipItem();
  const updateAvatar = useUpdateAvatar();
  const [mode, setMode] = useState<'items' | 'body'>('items');
  const [slot, setSlot] = useState<Slot>('hat');

  const tileSize = Math.floor((width - spacing.lg * 2 - spacing.sm * 2) / 3);
  const slotItems = useMemo(() => (inventory.data ?? []).filter((e) => e.slot === slot), [inventory.data, slot]);

  const onToggle = (entry: InventoryEntry) => {
    haptics.light();
    const mutation = entry.equipped ? unequip : equip;
    mutation.mutate(
      { item_id: entry.item_id, slot: entry.slot },
      { onError: (e) => toast.error("Couldn't change outfit", toAppError(e).message) },
    );
  };

  const onBody = (patch: Partial<{ skin_color: string; head_shape: HeadShape }>) => {
    if (!avatar.data) return;
    haptics.tap();
    updateAvatar.mutate(
      { skin_color: patch.skin_color ?? avatar.data.skin_color, head_shape: patch.head_shape ?? avatar.data.head_shape },
      { onError: (e) => toast.error("Couldn't update avatar", toAppError(e).message) },
    );
  };

  return (
    <Screen title="Avatar" refreshing={inventory.isRefetching} onRefresh={() => { void inventory.refetch(); void avatar.refetch(); }}>
      <View style={styles.stage}>
        <View style={styles.glow} />
        {appearance ? (
          <AvatarView appearance={appearance} size={150} accessibilityLabel="Your avatar" />
        ) : (
          <Skeleton width={150} height={210} radius={radii.xl} />
        )}
      </View>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: 'items', label: 'Items' },
          { value: 'body', label: 'Body' },
        ]}
      />

      {mode === 'body' ? (
        <Card>
          <AppText variant="subheading">Skin colour</AppText>
          <View style={styles.swatches}>
            {skinColors.map((c) => {
              const selected = avatar.data?.skin_color === c;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={`Skin colour ${c}`}
                  accessibilityState={{ selected }}
                  onPress={() => onBody({ skin_color: c })}
                  style={[styles.swatch, { backgroundColor: c }, selected ? styles.swatchSelected : null]}
                />
              );
            })}
          </View>
          <AppText variant="subheading" style={styles.mtLg}>
            Head shape
          </AppText>
          <View style={styles.mtSm}>
            <SegmentedControl
              value={avatar.data?.head_shape ?? 'cube'}
              onChange={(head_shape) => onBody({ head_shape })}
              options={headShapes.map((s) => ({ value: s, label: SHAPE_LABELS[s] }))}
            />
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.mtSm}>
            Body options are free and can be changed any time.
          </AppText>
        </Card>
      ) : (
        <>
          <ChipRow>
            {SLOTS.map((s) => (
              <Chip key={s} label={SLOT_LABELS[s]} selected={slot === s} onPress={() => setSlot(s)} />
            ))}
          </ChipRow>
          {inventory.isPending ? (
            <View style={styles.grid}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width={tileSize} height={tileSize + 20} radius={radii.md} />
              ))}
            </View>
          ) : inventory.isError && !inventory.data ? (
            <ErrorState error={inventory.error} onRetry={() => inventory.refetch()} />
          ) : slotItems.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title={`No ${SLOT_LABELS[slot].toLowerCase()} yet`}
              message="Visit the shop to find something you like."
              actionLabel="Open shop"
              onAction={() => router.push('/shop')}
            />
          ) : (
            <>
              <View style={styles.grid}>
                {slotItems.map((entry) => (
                  <InventoryTile
                    key={entry.id}
                    entry={entry}
                    size={tileSize}
                    onToggle={() => onToggle(entry)}
                    onOpen={() => router.push({ pathname: '/item/[id]', params: { id: entry.item_id } })}
                  />
                ))}
              </View>
              <AppText variant="caption" color={colors.textMuted} align="center">
                Tap to equip or unequip · long-press for details
              </AppText>
            </>
          )}
          <Button label="Get more items" variant="secondary" icon="bag-handle-outline" onPress={() => router.push('/shop')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primarySoft,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.border },
  swatchSelected: { borderColor: colors.text, borderWidth: 3, transform: [{ scale: 1.08 }] },
  mtLg: { marginTop: spacing.xl },
  mtSm: { marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
