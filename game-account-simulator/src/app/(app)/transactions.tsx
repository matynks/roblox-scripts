import { useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Transaction, TxnKind } from '@/api/types';
import { useMe, useTransactions } from '@/hooks/queries';
import { ChipRow } from '@/ui/Chips';
import { Icon, type IconName } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, Row } from '@/ui/primitives';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { TXN_LABEL } from '@/utils/format';

const ICON: Record<TxnKind, IconName> = {
  signup_bonus: 'sparkles',
  daily_reward: 'flame',
  purchase: 'bag-handle',
  gamepass_purchase: 'ticket',
  game_reward: 'game-controller',
  achievement_reward: 'trophy',
  quest_reward: 'flag',
  level_reward: 'arrow-up-circle',
  collection_reward: 'layers',
  username_change: 'at',
  admin_adjustment: 'construct',
  refund: 'return-down-back',
};

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'game_reward', label: 'Games' },
  { value: 'daily_reward', label: 'Daily' },
  { value: 'achievement_reward', label: 'Achievements' },
  { value: 'quest_reward', label: 'Quests' },
  { value: 'gamepass_purchase', label: 'Passes' },
  { value: 'admin_adjustment', label: 'Adjustments' },
];

export default function Transactions() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [filter, setFilter] = useState('all');
  const q = useTransactions(filter === 'all' ? null : (filter as TxnKind));
  const sections = useMemo(() => {
    const rows = q.data?.pages.flat() ?? [];
    const by = new Map<string, Transaction[]>();
    rows.forEach((r) => {
      const d = new Date(r.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      by.set(d, [...(by.get(d) ?? []), r]);
    });
    return [...by.entries()].map(([title, data]) => ({ title, data }));
  }, [q.data]);

  const w = me.data?.wallet;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="transactions-screen">
      <Header title="Transactions" subtitle="Simulated currency ledger" />
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 40 }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingBottom: space.md }}>
            {w ? (
              <Card style={{ gap: space.md }}>
                <Text variant="label" tone="muted">
                  Current balance
                </Text>
                <OrbAmount amount={w.balance} variant="display" showSim />
                <Row gap={space.lg}>
                  <Row gap={6}>
                    <Icon name="arrow-down-circle" size={16} color={t.success} />
                    <Text variant="caption" tone="muted">
                      Earned {w.lifetime_earned.toLocaleString('en-US')}
                    </Text>
                  </Row>
                  <Row gap={6}>
                    <Icon name="arrow-up-circle" size={16} color={t.danger} />
                    <Text variant="caption" tone="muted">
                      Spent {w.lifetime_spent.toLocaleString('en-US')}
                    </Text>
                  </Row>
                </Row>
              </Card>
            ) : null}
            <ChipRow testIDPrefix="txf" value={filter} onChange={setFilter} options={FILTERS} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="label" tone="faint" style={{ marginTop: space.md, marginBottom: space.sm }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item: r }) => (
          <Row gap={space.md} style={{ paddingVertical: 10 }} testID={`txn-${r.kind}`}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: r.amount > 0 ? t.successSoft : t.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={ICON[r.kind] ?? 'swap-horizontal'} size={18} color={r.amount > 0 ? t.success : t.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {r.description}
              </Text>
              <Text variant="small" tone="faint">
                {TXN_LABEL[r.kind] ?? r.kind} · {new Date(r.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="number" tone={r.amount > 0 ? 'success' : 'danger'}>
                {r.amount > 0 ? '+' : ''}
                {r.amount.toLocaleString('en-US')}
              </Text>
              <Text variant="small" tone="faint">
                bal {r.balance_after.toLocaleString('en-US')}
              </Text>
            </View>
          </Row>
        )}
        ListEmptyComponent={q.isLoading ? <LoadingList rows={6} height={52} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <EmptyState icon="receipt-outline" title="No transactions" message="Earn Orbs by playing games and claiming rewards." />}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={t.primary} style={{ margin: space.lg }} /> : undefined}
      />
    </View>
  );
}
