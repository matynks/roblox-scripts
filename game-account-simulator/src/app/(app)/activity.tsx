import { router } from 'expo-router';

import { FeedItem } from '@/components/FeedItem';
import { useFeed } from '@/hooks/queries';
import { Card } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { space } from '@/ui/theme';

export default function Activity() {
  const q = useFeed();
  return (
    <Screen header={<Header title="Activity" subtitle="You, your friends and people you follow" />} refreshing={q.isRefetching} onRefresh={() => q.refetch()} testID="activity-screen">
      {q.isLoading ? (
        <LoadingList rows={8} height={48} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon="pulse-outline" title="Quiet around here" message="Add friends or follow players to fill your feed." actionLabel="Find players" onAction={() => router.push('/search')} />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.md, paddingVertical: space.xs }}>
          {(q.data ?? []).map((e) => (
            <FeedItem key={e.id} event={e} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
