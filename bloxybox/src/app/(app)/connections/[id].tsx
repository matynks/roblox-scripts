import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerRow } from '@/components/feature/Cards';
import { Divider, SegmentedControl } from '@/components/ui/Controls';
import { ScreenHeader } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useConnections, useProfileSummary, type ConnectionKind } from '@/features/social/api';
import { useUserId } from '@/stores/session';
import { colors, spacing } from '@/theme/tokens';

const EMPTY: Record<ConnectionKind, string> = {
  followers: 'No player followers yet.',
  following: 'Not following anyone yet.',
  friends: 'Friends are players who follow each other.',
};

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; kind?: string }>();
  const me = useUserId();
  const userId = params.id ?? me;
  const initial: ConnectionKind =
    params.kind === 'following' || params.kind === 'friends' ? params.kind : 'followers';
  const [kind, setKind] = useState<ConnectionKind>(initial);
  const profile = useProfileSummary(userId);
  const list = useConnections(userId, kind);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader back title={profile.data?.display_name ?? 'Connections'} subtitle="Players on BloxyBox" />
      <View style={styles.tabs}>
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: 'followers', label: 'Followers' },
            { value: 'following', label: 'Following' },
            { value: 'friends', label: 'Friends' },
          ]}
        />
      </View>
      {list.isPending ? (
        <LoadingState />
      ) : list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PlayerRow
              player={item}
              onPress={() =>
                item.id === me ? router.push('/profile') : router.push({ pathname: '/user/[id]', params: { id: item.id } })
              }
            />
          )}
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={EMPTY[kind]}
              message={
                kind === 'followers' && (profile.data?.social.followers_simulated ?? 0) > 0
                  ? 'Simulated followers are counted on the profile but are not real players, so they are not listed here.'
                  : undefined
              }
              actionLabel={userId === me ? 'Find players' : undefined}
              onAction={userId === me ? () => router.push('/players') : undefined}
            />
          }
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabs: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
