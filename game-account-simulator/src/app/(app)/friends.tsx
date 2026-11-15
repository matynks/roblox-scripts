import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Connection, FriendRequest } from '@/api/types';
import { PlayerRow } from '@/components/PlayerRow';
import { useConnections, useFriendRequests, useMe, useSocialAction } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Chips';
import { IconButton, Row } from '@/ui/primitives';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { timeAgo } from '@/utils/format';

type Tab = 'friends' | 'requests' | 'followers' | 'following';

function RequestRow({ r, incoming }: { r: FriendRequest; incoming: boolean }) {
  const act = useSocialAction();
  return (
    <PlayerRow
      user={r.user}
      subtitle={`${incoming ? 'Sent you a request' : 'Request sent'} · ${timeAgo(r.created_at)}`}
      testID={`request-${r.user.username}`}
      right={
        incoming ? (
          <Row gap={6}>
            <Button title="Accept" size="sm" loading={act.isPending && act.variables?.type === 'accept'} onPress={() => act.mutate({ type: 'accept', requestId: r.id, name: r.user.display_name })} testID={`accept-${r.user.username}`} />
            <IconButton icon="close" label="Decline" size={36} onPress={() => act.mutate({ type: 'decline', requestId: r.id })} />
          </Row>
        ) : (
          <Button title="Cancel" size="sm" variant="secondary" onPress={() => act.mutate({ type: 'cancel', requestId: r.id })} />
        )
      }
    />
  );
}

function ConnectionRow({ c, kind, isMine }: { c: Connection; kind: Tab; isMine: boolean }) {
  const act = useSocialAction();
  const me = useMe();
  if (c.id === me.data?.profile.id) return <PlayerRow user={c} subtitle="You" />;
  const action =
    kind === 'followers' && isMine && !c.is_following ? (
      <Button title="Follow back" size="sm" variant="outline" onPress={() => act.mutate({ type: 'follow', userId: c.id, name: c.display_name })} />
    ) : kind === 'following' && isMine ? (
      <Button title="Unfollow" size="sm" variant="secondary" onPress={() => act.mutate({ type: 'unfollow', userId: c.id })} />
    ) : c.is_friend ? (
      <Text variant="small" tone="success">
        Friend
      </Text>
    ) : undefined;
  return <PlayerRow user={c} subtitle={`@${c.username}`} right={action} testID={`conn-${c.username}`} />;
}

export default function Friends() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const params = useLocalSearchParams<{ userId?: string; username?: string; tab?: Tab }>();
  const userId = params.userId ?? me.data?.profile.id;
  const isMine = !params.userId || params.userId === me.data?.profile.id;
  const [tab, setTab] = useState<Tab>((params.tab as Tab) ?? 'friends');
  const requests = useFriendRequests();
  const kind = tab === 'requests' ? 'friends' : tab;
  const list = useConnections(userId, kind, tab !== 'requests');
  const rows = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  const tabs = [
    { value: 'friends' as Tab, label: 'Friends' },
    ...(isMine ? [{ value: 'requests' as Tab, label: 'Requests', count: incoming.length || undefined }] : []),
    { value: 'followers' as Tab, label: 'Followers' },
    { value: 'following' as Tab, label: 'Following' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="friends-screen">
      <Header title={isMine ? 'Connections' : `@${params.username}`} right={isMine ? <IconButton icon="person-add-outline" label="Find players" onPress={() => router.push('/search')} /> : undefined} />
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Segmented testIDPrefix="ftab" value={tab} onChange={setTab} options={tabs} />
      </View>
      {tab === 'requests' ? (
        <FlatList
          data={[...incoming.map((r) => ({ r, incoming: true })), ...outgoing.map((r) => ({ r, incoming: false }))]}
          keyExtractor={(x) => x.r.id}
          contentContainerStyle={{ paddingHorizontal: space.sm, paddingBottom: insets.bottom + 40 }}
          refreshing={requests.isRefetching}
          onRefresh={() => requests.refetch()}
          renderItem={({ item }) => <RequestRow r={item.r} incoming={item.incoming} />}
          ListEmptyComponent={requests.isLoading ? <LoadingList rows={4} /> : <EmptyState icon="mail-open-outline" title="No pending requests" message="When someone sends you a friend request it shows up here." />}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: space.sm, paddingBottom: insets.bottom + 40 }}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          renderItem={({ item }) => <ConnectionRow c={item} kind={tab} isMine={isMine} />}
          ListEmptyComponent={
            list.isLoading ? (
              <View style={{ padding: space.lg }}><LoadingList rows={6} /></View>
            ) : list.error ? (
              <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : (
              <EmptyState icon="people-outline" title={tab === 'friends' ? 'No friends yet' : tab === 'followers' ? 'No followers yet' : 'Not following anyone'} message={isMine ? 'Search for players and say hi — simulated players accept right away.' : undefined} actionLabel={isMine ? 'Find players' : undefined} onAction={() => router.push('/search')} />
            )
          }
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={t.primary} /> : undefined}
        />
      )}
    </View>
  );
}
