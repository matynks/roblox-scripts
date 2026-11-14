import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { Divider } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { TRANSACTION_LABELS, useTransaction } from '@/features/wallet/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

const METADATA_LABELS: Record<string, string> = {
  price: 'Price',
  item_name: 'Item',
  rarity: 'Rarity',
  pass_name: 'Game Pass',
  experience: 'Experience',
  perk: 'Perk',
  score: 'Score',
  outcome: 'Outcome',
  doubled: 'Double Coins applied',
  capped: 'Daily limit reached',
  streak: 'Streak day',
  previous: 'Previous balance',
  target: 'Target balance',
  reason: 'Reason',
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="body" color={colors.textSecondary}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.detailValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function display(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return formatNumber(value);
  return String(value);
}

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const txId = Number(id);
  const tx = useTransaction(txId);

  if (tx.isPending) return <Screen back title="Transaction"><LoadingState /></Screen>;
  if (tx.isError || !tx.data) {
    return (
      <Screen back title="Transaction">
        <ErrorState error={tx.error} onRetry={() => tx.refetch()} />
      </Screen>
    );
  }

  const t = tx.data;
  const positive = t.amount > 0;
  const metadata = Object.entries(t.metadata ?? {})
    .filter(([key]) => METADATA_LABELS[key] && key !== 'listing_id')
    .map(([key, value]) => [METADATA_LABELS[key]!, display(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  const link =
    t.reference_type === 'item' && t.reference_id
      ? { label: 'View item', go: () => router.push({ pathname: '/item/[id]', params: { id: t.reference_id! } }) }
      : t.reference_type === 'game_pass' && t.reference_id
        ? { label: 'View Game Pass', go: () => router.push({ pathname: '/pass/[id]', params: { id: t.reference_id! } }) }
        : typeof t.metadata?.experience === 'string'
          ? {
              label: 'View experience',
              go: () => router.push({ pathname: '/experience/[slug]', params: { slug: String(t.metadata.experience) } }),
            }
          : null;

  return (
    <Screen back title="Transaction" bottomInset>
      <Card tone={positive ? 'coin' : 'default'}>
        <View style={styles.hero}>
          <Badge label={TRANSACTION_LABELS[t.kind]} color={positive ? colors.success : colors.textSecondary} />
          <CoinAmount amount={t.amount} signed size="xl" color={positive ? colors.success : colors.text} />
          <AppText variant="body" color={colors.textSecondary} align="center">
            {t.description}
          </AppText>
        </View>
      </Card>

      <Card padded={false}>
        <Detail label="Date" value={formatDateTime(t.created_at)} />
        <Divider />
        <Detail label="Balance after" value={`${formatNumber(t.balance_after)} BoxCoins`} />
        {metadata.map(([label, value]) => (
          <View key={label}>
            <Divider />
            <Detail label={label} value={value} />
          </View>
        ))}
        <Divider />
        <Detail label="Transaction ID" value={`#${t.id}`} />
      </Card>

      {link ? <Button label={link.label} variant="secondary" onPress={link.go} /> : null}
      <AppText variant="micro" color={colors.textMuted} align="center">
        Every BoxCoins change is recorded by the BloxyBox server. Simulated currency only.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  detailValue: { flexShrink: 1, textAlign: 'right' },
});
