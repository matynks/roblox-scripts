import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { SLOT_LABELS, type AvatarAppearance } from '@/api/types';
import { PurchaseSheet } from '@/components/feature/PurchaseSheet';
import { AppText } from '@/components/ui/AppText';
import { Badge, withAlpha } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { SegmentedControl } from '@/components/ui/Controls';
import { useIsOnline } from '@/components/ui/Overlays';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { AvatarView, ItemPreview } from '@/features/avatar/AvatarView';
import { useEquipItem, useInventory, useMyAppearance, useUnequipItem } from '@/features/inventory/api';
import { useItems, useListings, usePurchaseItem } from '@/features/market/api';
import { useWallet } from '@/features/wallet/api';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { toast } from '@/stores/toast';
import { colors, radii, rarityColors, spacing } from '@/theme/tokens';

const ACQUIRED_LABELS = { purchase: 'Purchased', starter: 'Starter item', dev_grant: 'Granted by a developer', reward: 'Reward' } as const;

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listings = useListings();
  const items = useItems();
  const inventory = useInventory();
  const wallet = useWallet();
  const appearance = useMyAppearance();
  const purchase = usePurchaseItem();
  const equip = useEquipItem();
  const unequip = useUnequipItem();
  const online = useIsOnline();
  const [preview, setPreview] = useState<'item' | 'you'>('item');
  const [confirming, setConfirming] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const listing = listings.data?.find((l) => l.item_id === id);
  const item = listing?.item ?? items.data?.find((i) => i.id === id);
  const entry = inventory.data?.find((e) => e.item_id === id);

  const tryOn = useMemo<AvatarAppearance | null>(() => {
    if (!appearance || !item) return null;
    return {
      ...appearance,
      equipped: [
        ...appearance.equipped.filter((p) => p.slot !== item.slot),
        { item_id: item.id, slot: item.slot, asset_key: item.asset_key, primary_color: item.primary_color, secondary_color: item.secondary_color },
      ],
    };
  }, [appearance, item]);

  if ((listings.isPending || items.isPending) && !item) return <Screen back title=""><LoadingState /></Screen>;
  if (!item) {
    if (listings.isError || items.isError) {
      return (
        <Screen back title="Item">
          <ErrorState error={listings.error ?? items.error} onRetry={() => { void listings.refetch(); void items.refetch(); }} />
        </Screen>
      );
    }
    return (
      <Screen back title="Item">
        <EmptyState icon="help-circle-outline" title="Item not found" actionLabel="Back to shop" onAction={() => router.replace('/shop')} />
      </Screen>
    );
  }

  const rarity = rarityColors[item.rarity];
  const owned = !!entry;

  const buy = () => {
    if (!listing) return;
    setPurchaseError(null);
    purchase.mutate(listing.id, {
      onSuccess: () => {
        haptics.success();
        setConfirming(false);
        toast.success('Purchased!', `${item.name} is now in your inventory.`);
      },
      onError: (e) => {
        haptics.error();
        setPurchaseError(toAppError(e).message);
      },
    });
  };

  const toggleEquip = () => {
    if (!entry) return;
    const mutation = entry.equipped ? unequip : equip;
    mutation.mutate(
      { item_id: entry.item_id, slot: entry.slot },
      {
        onSuccess: () => toast.success(entry.equipped ? 'Unequipped' : 'Equipped', item.name),
        onError: (e) => toast.error("Couldn't change outfit", toAppError(e).message),
      },
    );
  };

  let footer: React.ReactNode;
  if (owned) {
    footer = (
      <Button
        label={entry?.equipped ? 'Unequip' : 'Equip'}
        icon={entry?.equipped ? 'remove-circle-outline' : 'shirt-outline'}
        variant={entry?.equipped ? 'secondary' : 'primary'}
        size="lg"
        fullWidth
        loading={equip.isPending || unequip.isPending}
        disabled={!online}
        onPress={toggleEquip}
      />
    );
  } else if (listing) {
    footer = (
      <Button
        label={online ? `Buy for ${listing.price}` : 'Connect to buy'}
        icon="bag-add-outline"
        variant="coin"
        size="lg"
        fullWidth
        disabled={!online}
        onPress={() => {
          setPurchaseError(null);
          setConfirming(true);
        }}
        testID="buy-button"
      />
    );
  } else {
    footer = (
      <AppText variant="caption" color={colors.textSecondary} align="center">
        This item is not currently for sale.
      </AppText>
    );
  }

  return (
    <Screen back title={item.name} bottomInset footer={footer}>
      <View style={[styles.stage, { backgroundColor: withAlpha(rarity, 0.1), borderColor: withAlpha(rarity, 0.35) }]}>
        {preview === 'you' && tryOn ? (
          <AvatarView appearance={tryOn} size={150} accessibilityLabel="Your avatar wearing this item" />
        ) : (
          <ItemPreview item={item} size={200} />
        )}
      </View>
      <SegmentedControl
        value={preview}
        onChange={setPreview}
        options={[
          { value: 'item', label: 'Item' },
          { value: 'you', label: 'Try it on' },
        ]}
      />

      <View style={styles.titleBlock}>
        <View style={styles.badges}>
          <Badge label={item.rarity} color={rarity} />
          <Badge label={SLOT_LABELS[item.slot].replace(/s$/, '')} color={colors.textSecondary} />
          {listing?.is_featured ? <Badge label="Featured" color={colors.coin} /> : null}
        </View>
        <AppText variant="title">{item.name}</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {item.description}
        </AppText>
      </View>

      <Card>
        {owned && entry ? (
          <View style={styles.ownedRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">You own this</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {ACQUIRED_LABELS[entry.acquired_via]} · {formatDate(entry.acquired_at)}
                {entry.price_paid > 0 ? ` · paid ${entry.price_paid} BoxCoins` : ''}
              </AppText>
            </View>
            {entry.equipped ? <Badge label="Equipped" color={colors.primary} /> : null}
          </View>
        ) : listing ? (
          <View style={styles.priceRow}>
            <AppText variant="body" color={colors.textSecondary}>
              Price
            </AppText>
            <CoinAmount amount={listing.price} size="lg" />
          </View>
        ) : (
          <AppText variant="body" color={colors.textSecondary}>
            Not for sale.
          </AppText>
        )}
      </Card>

      {listing && !owned ? (
        <PurchaseSheet
          visible={confirming}
          title={item.name}
          subtitle={`${item.rarity} ${SLOT_LABELS[item.slot].replace(/s$/, '').toLowerCase()}`}
          price={listing.price}
          balance={wallet.data?.balance}
          busy={purchase.isPending}
          error={purchaseError}
          onConfirm={buy}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: {
    height: 260,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  ownedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
