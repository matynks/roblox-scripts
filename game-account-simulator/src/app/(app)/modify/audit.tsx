import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/api';
import type { AuditLogRow } from '@/api/types';
import { DevBanner } from '@/components/admin';
import { Icon } from '@/ui/Icon';
import { Row } from '@/ui/primitives';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';
import { timeAgo } from '@/utils/format';

function Entry({ l }: { l: AuditLogRow }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} testID={`audit-${l.action}`} style={{ padding: space.md, borderRadius: radius.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, gap: 4 }}>
      <Row justify="space-between">
        <Text variant="bodyStrong">{l.action.replace(/_/g, ' ')}</Text>
        <Text variant="small" tone="faint">
          {timeAgo(l.created_at)}
        </Text>
      </Row>
      <Text variant="caption" tone="muted">
        by @{l.actor_username ?? 'system'}
        {l.target_username ? ` → @${l.target_username}` : ''}
        {l.target_type ? ` · ${l.target_type}${l.target_id && l.target_type !== 'profile' && l.target_type !== 'wallet' ? ` ${l.target_id}` : ''}` : ''}
      </Text>
      {l.reason ? (
        <Row gap={6}>
          <Icon name="chatbox-ellipses-outline" size={13} color={t.textFaint} />
          <Text variant="caption">{l.reason}</Text>
        </Row>
      ) : null}
      {open && (l.before || l.after) ? (
        <View style={{ gap: 6, marginTop: 6 }}>
          {l.before ? (
            <Text variant="small" tone="danger" style={{ fontFamily: 'monospace' }}>
              − {JSON.stringify(l.before)}
            </Text>
          ) : null}
          {l.after ? (
            <Text variant="small" tone="success" style={{ fontFamily: 'monospace' }}>
              + {JSON.stringify(l.after)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Audit() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const q = useInfiniteQuery({
    queryKey: ['admin', 'audit'],
    queryFn: ({ pageParam }) => backend.admin.auditLogs(pageParam, 40),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === 40 ? all.length : undefined),
  });
  const rows = useMemo(() => q.data?.pages.flat() ?? [], [q.data]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="modify-audit">
      <Header title="Audit log" subtitle="Tap an entry to see before/after" />
      <FlatList
        data={rows}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={<View style={{ paddingBottom: space.sm }}><DevBanner /></View>}
        renderItem={({ item }) => <Entry l={item} />}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListEmptyComponent={q.isLoading ? <LoadingList rows={6} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <EmptyState icon="document-text-outline" title="No audit entries yet" />}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={t.primary} /> : undefined}
      />
    </View>
  );
}
