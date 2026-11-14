import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { PurchaseSheet } from '@/components/feature/PurchaseSheet';
import { AppText } from '@/components/ui/AppText';
import { Badge, withAlpha } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { ListRow, SwitchRow } from '@/components/ui/Controls';
import { useIsOnline } from '@/components/ui/Overlays';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { PERK_ICONS, useGamePasses, usePassOwnership, usePurchasePass, useSetPassEnabled } from '@/features/passes/api';
import { useWallet } from '@/features/wallet/api';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { toast } from '@/stores/toast';
import { colors, radii, spacing } from '@/theme/tokens';

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const passes = useGamePasses();
  const ownership = usePassOwnership();
  const wallet = useWallet();
  const purchase = usePurchasePass();
  const setEnabled = useSetPassEnabled();
  const online = useIsOnline();
  const [confirming, setConfirming] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const pass = passes.data?.find((p) => p.id === id);
  const owned = pass ? ownership.data?.get(pass.id) : undefined;

  if (passes.isPending) return <Screen back title=""><LoadingState /></Screen>;
  if (!pass) {
    return (
      <Screen back title="Game Pass">
        {passes.isError ? (
          <ErrorState error={passes.error} onRetry={() => passes.refetch()} />
        ) : (
          <EmptyState icon="ticket-outline" title="Game Pass not found" actionLabel="My Game Passes" onAction={() => router.replace('/passes')} />
        )}
      </Screen>
    );
  }

  const accent = pass.experience?.accent_color ?? colors.primary;

  const buy = () => {
    setPurchaseError(null);
    purchase.mutate(pass.id, {
      onSuccess: () => {
        haptics.success();
        setConfirming(false);
        toast.success('Game Pass unlocked!', `${pass.name} is active in ${pass.experience?.title ?? 'its experience'}.`);
      },
      onError: (e) => {
        haptics.error();
        setPurchaseError(toAppError(e).message);
      },
    });
  };

  return (
    <Screen
      back
      title="Game Pass"
      bottomInset
      footer={
        owned ? null : (
          <Button
            label={online ? `Buy for ${pass.price}` : 'Connect to buy'}
            variant="coin"
            icon="ticket-outline"
            size="lg"
            fullWidth
            disabled={!online}
            onPress={() => {
              setPurchaseError(null);
              setConfirming(true);
            }}
          />
        )
      }
    >
      <View style={[styles.hero, { backgroundColor: withAlpha(accent, 0.14), borderColor: withAlpha(accent, 0.4) }]}>
        <View style={[styles.ticket, { borderColor: accent }]}>
          <Ionicons name={PERK_ICONS[pass.perk]} size={56} color={accent} />
        </View>
      </View>
      <View style={styles.titleBlock}>
        <Badge label={`${pass.experience?.title ?? 'Experience'} pass`} color={accent} />
        <AppText variant="title">{pass.name}</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {pass.description}
        </AppText>
      </View>

      {owned ? (
        <Card padded={false}>
          <ListRow
            icon="checkmark-circle"
            iconColor={colors.success}
            title="You own this pass"
            subtitle={`${owned.acquired_via === 'purchase' ? 'Purchased' : 'Granted by a developer'} · ${formatDate(owned.acquired_at)}`}
          />
          <SwitchRow
            icon="flash-outline"
            title="Perk enabled"
            subtitle="Turn off to play without this perk. You can switch it back on any time."
            value={owned.enabled}
            onValueChange={(enabled) =>
              setEnabled.mutate(
                { passId: pass.id, enabled },
                { onError: (e) => toast.error("Couldn't update pass", toAppError(e).message) },
              )
            }
          />
        </Card>
      ) : (
        <Card>
          <View style={styles.priceRow}>
            <AppText variant="body" color={colors.textSecondary}>
              Price
            </AppText>
            <CoinAmount amount={pass.price} size="lg" />
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.note}>
            Passes are simulated, exist only inside BloxyBox and are paid for with BoxCoins.
          </AppText>
        </Card>
      )}

      {pass.experience ? (
        <Button
          label={`Open ${pass.experience.title}`}
          variant="secondary"
          icon="game-controller-outline"
          onPress={() => router.push({ pathname: '/experience/[slug]', params: { slug: pass.experience!.slug } })}
        />
      ) : null}

      <PurchaseSheet
        visible={confirming && !owned}
        title={pass.name}
        subtitle={`${pass.experience?.title ?? ''} Game Pass`}
        price={pass.price}
        balance={wallet.data?.balance}
        busy={purchase.isPending}
        error={purchaseError}
        onConfirm={buy}
        onClose={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 200,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticket: {
    width: 120,
    height: 120,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { gap: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { marginTop: spacing.sm },
});
