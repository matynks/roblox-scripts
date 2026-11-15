import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/api';
import type { AdminAccountRow } from '@/api/types';
import { DevBanner } from '@/components/admin';
import { ChipRow } from '@/ui/Chips';
import { OrbAmount } from '@/ui/Orb';
import { Pill, Row } from '@/ui/primitives';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { radius, space, useTheme } from '@/ui/theme';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'players', label: 'Players' },
  { value: 'npc', label: 'Simulated' },
  { value: 'test', label: 'Test' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'developers', label: 'Developers' },
];

function AccountRow({ a }: { a: AdminAccountRow }) {
  const t = useTheme();
  return (
    <Pressable testID={`acct-${a.username}`} onPress={() => router.push(`/modify/account/${a.id}`)} style={({ pressed }) => ({ padding: space.md, borderRadius: radius.md, backgroundColor: pressed ? t.surfacePressed : t.surface, borderWidth: 1, borderColor: t.border, gap: 4 })}>
      <Row justify="space-between">
        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
          {a.display_name} <Text variant="caption" tone="muted">@{a.username}</Text>
        </Text>
        <OrbAmount amount={a.balance ?? 0} variant="caption" size={14} short />
      </Row>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Pill label={`Lv ${a.level}`} color={t.primary} size="sm" />
        {a.is_npc ? <Pill label="Simulated" color={t.textMuted} size="sm" /> : null}
        {a.is_test_account ? <Pill label="Test" color={t.accent} size="sm" /> : null}
        {a.account_status === 'suspended' ? <Pill label="Suspended" color={t.danger} size="sm" /> : null}
        {a.role ? <Pill label={a.role} color={t.warning} size="sm" /> : null}
        {a.email ? <Text variant="small" tone="faint">{a.email}</Text> : null}
      </Row>
    </Pressable>
  );
}

export default function Accounts() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const h = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(h);
  }, [q]);
  const list = useInfiniteQuery({
    queryKey: ['admin', 'accounts', term, filter],
    queryFn: ({ pageParam }) => backend.admin.searchAccounts(term, filter, pageParam, 25),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (all.length * 25 < last.total ? all.length : undefined),
  });
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.accounts) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="modify-accounts">
      <Header title="Accounts" subtitle={`${total.toLocaleString('en-US')} matching`} />
      <FlatList
        data={rows}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingBottom: space.sm }}>
            <DevBanner />
            <TextField icon="search" placeholder="Username, display name or account id" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} testID="acct-search" />
            <ChipRow testIDPrefix="acctf" value={filter} onChange={setFilter} options={FILTERS} />
          </View>
        }
        renderItem={({ item }) => <AccountRow a={item} />}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshing={list.isRefetching}
        onRefresh={() => list.refetch()}
        ListEmptyComponent={list.isLoading ? <LoadingList rows={6} /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : <EmptyState icon="search" title="No accounts found" />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={t.primary} /> : undefined}
      />
    </View>
  );
}
