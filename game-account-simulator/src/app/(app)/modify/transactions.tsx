import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/api';
import { DevBanner } from '@/components/admin';
import { ChipRow } from '@/ui/Chips';
import { Row } from '@/ui/primitives';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { timeAgo, TXN_LABEL } from '@/utils/format';

const KINDS = ['all', 'purchase', 'game_reward', 'daily_reward', 'admin_adjustment', 'gamepass_purchase', 'achievement_reward', 'quest_reward', 'signup_bonus'];

export default function PlatformTransactions() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState('all');
  const q = useInfiniteQuery({
    queryKey: ['admin', 'txns', kind],
    queryFn: ({ pageParam }) => backend.admin.listTransactions(null, kind === 'all' ? null : kind, pageParam, 40),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === 40 ? all.length : undefined),
  });
  const rows = useMemo(() => q.data?.pages.flat() ?? [], [q.data]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="modify-transactions">
      <Header title="Platform ledger" />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingBottom: space.md }}>
            <DevBanner />
            <ChipRow testIDPrefix="ptx" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: k === 'all' ? 'All' : TXN_LABEL[k] ?? k }))} />
          </View>
        }
        renderItem={({ item: r }) => (
          <Pressable onPress={() => router.push(`/modify/account/${r.user_id}`)}>
            <Row gap={space.md} style={{ paddingVertical: 9, borderBottomWidth: 1, borderColor: t.border }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ fontFamily: 'Nunito_800ExtraBold' }} numberOfLines={1}>
                  @{r.username} · {r.description}
                </Text>
                <Text variant="small" tone="faint">
                  {TXN_LABEL[r.kind] ?? r.kind} · {timeAgo(r.created_at)}
                  {r.actor_username ? ` · by @${r.actor_username}` : ''}
                </Text>
              </View>
              <Text variant="number" tone={r.amount > 0 ? 'success' : 'danger'}>
                {r.amount > 0 ? '+' : ''}
                {r.amount.toLocaleString('en-US')}
              </Text>
            </Row>
          </Pressable>
        )}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListEmptyComponent={q.isLoading ? <LoadingList rows={8} height={44} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <EmptyState icon="receipt-outline" title="No transactions" />}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={t.primary} /> : undefined}
      />
    </View>
  );
}
