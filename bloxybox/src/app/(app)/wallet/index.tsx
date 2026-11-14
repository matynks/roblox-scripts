import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Transaction } from '@/api/types';
import { TransactionRow } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { Divider } from '@/components/ui/Controls';
import { ScreenHeader } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/StateViews';
import { useTransactions, useWallet } from '@/features/wallet/api';
import { formatNumber } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

const ROW_HEIGHT = 64;

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const wallet = useWallet();
  const transactions = useTransactions();
  const rows = useMemo(() => transactions.data?.pages.flat() ?? [], [transactions.data]);

  const header = (
    <View style={styles.header}>
      <Card tone="primary">
        <AppText variant="caption" color={colors.textSecondary}>
          Current balance
        </AppText>
        {wallet.data ? <CoinAmount amount={wallet.data.balance} size="xl" /> : <Skeleton width={160} height={36} />}
        <View style={styles.lifetime}>
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.textSecondary}>
              Earned (lifetime)
            </AppText>
            <AppText variant="bodyStrong" color={colors.success}>
              +{formatNumber(wallet.data?.lifetime_earned ?? 0)}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.textSecondary}>
              Spent (lifetime)
            </AppText>
            <AppText variant="bodyStrong">-{formatNumber(wallet.data?.lifetime_spent ?? 0)}</AppText>
          </View>
        </View>
        <AppText variant="micro" color={colors.textMuted} style={styles.note}>
          BoxCoins are simulated inside BloxyBox. They are not real money and can’t be bought or cashed out.
        </AppText>
      </Card>
      <AppText variant="heading">Transaction history</AppText>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Wallet" back />
      {transactions.isPending ? (
        <LoadingState />
      ) : transactions.isError && rows.length === 0 ? (
        <ErrorState error={transactions.error} onRetry={() => transactions.refetch()} />
      ) : (
        <FlatList<Transaction>
          data={rows}
          keyExtractor={(t) => String(t.id)}
          ListHeaderComponent={header}
          ListHeaderComponentStyle={styles.headerPad}
          renderItem={({ item }) => (
            <TransactionRow transaction={item} onPress={() => router.push({ pathname: '/wallet/[id]', params: { id: String(item.id) } })} />
          )}
          ItemSeparatorComponent={Divider}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          onEndReached={() => {
            if (transactions.hasNextPage && !transactions.isFetchingNextPage) void transactions.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            transactions.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null
          }
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No transactions yet" />}
          refreshing={transactions.isRefetching}
          onRefresh={() => {
            void wallet.refetch();
            void transactions.refetch();
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          windowSize={9}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { gap: spacing.lg },
  headerPad: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  lifetime: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  note: { marginTop: spacing.md },
  footer: { padding: spacing.lg },
});
