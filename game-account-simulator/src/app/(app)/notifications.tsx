import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/api';
import type { AppNotification, NotificationKind } from '@/api/types';
import { useNotifications } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { haptic } from '@/ui/haptics';
import { Icon, type IconName } from '@/ui/Icon';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';
import { timeAgo } from '@/utils/format';

const KIND: Record<NotificationKind, { icon: IconName; color: string }> = {
  system: { icon: 'sparkles', color: '#7C5CFF' },
  friend_request: { icon: 'person-add', color: '#A78BFA' },
  friend_accepted: { icon: 'people', color: '#34D399' },
  new_follower: { icon: 'heart', color: '#F472B6' },
  purchase: { icon: 'bag-handle', color: '#22D3EE' },
  reward: { icon: 'gift', color: '#FFC53D' },
  achievement: { icon: 'trophy', color: '#FFC53D' },
  level_up: { icon: 'arrow-up-circle', color: '#34D399' },
  quest: { icon: 'flag', color: '#22D3EE' },
  admin: { icon: 'construct', color: '#F59E0B' },
};

function target(n: AppNotification): string | null {
  if (n.kind === 'friend_request') return '/friends?tab=requests';
  if (n.data?.username) return `/user/${n.data.username}`;
  if (n.data?.item_id) return `/item/${n.data.item_id}`;
  if (n.kind === 'achievement') return '/achievements';
  if (n.kind === 'quest') return '/rewards';
  if (n.kind === 'level_up') return '/profile';
  if (n.kind === 'admin') return '/transactions';
  return null;
}

export default function Notifications() {
  const t = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const q = useNotifications();
  const items = useMemo(() => q.data?.pages.flat() ?? [], [q.data]);
  const unread = items.filter((n) => !n.read_at).length;

  const markAll = async () => {
    await backend.markNotificationsRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['me'] });
  };

  const open = async (n: AppNotification) => {
    haptic.tap();
    if (!n.read_at) {
      backend.markNotificationsRead([n.id]).then(() => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['me'] });
      });
    }
    const href = target(n);
    if (href) router.push(href as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="notifications-screen">
      <Header title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} right={unread ? <Button title="Mark all read" size="sm" variant="ghost" onPress={markAll} testID="mark-all-read" /> : undefined} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: insets.bottom + 40 }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        renderItem={({ item: n }) => {
          const k = KIND[n.kind] ?? KIND.system;
          return (
            <Pressable
              testID={`notification-${n.kind}`}
              onPress={() => open(n)}
              onLongPress={async () => {
                await backend.deleteNotification(n.id);
                qc.invalidateQueries({ queryKey: ['notifications'] });
              }}
              accessibilityHint="Long-press to delete"
              style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: pressed ? t.surfacePressed : n.read_at ? t.surface : t.primarySoft, borderWidth: 1, borderColor: n.read_at ? t.border : 'transparent' })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: `${k.color}22`, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={k.icon} size={20} color={k.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {n.title}
                </Text>
                {n.body ? (
                  <Text variant="caption" tone="muted" numberOfLines={3}>
                    {n.body}
                  </Text>
                ) : null}
                <Text variant="small" tone="faint">
                  {timeAgo(n.created_at)}
                </Text>
              </View>
              {!n.read_at ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.primary, marginTop: 6 }} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={q.isLoading ? <LoadingList rows={6} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <EmptyState icon="notifications-off-outline" title="No notifications" message="Friend requests, rewards and achievements will show up here." />}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={t.primary} /> : undefined}
      />
    </View>
  );
}
