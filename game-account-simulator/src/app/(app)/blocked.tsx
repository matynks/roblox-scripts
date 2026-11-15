import { PlayerRow } from '@/components/PlayerRow';
import { useBlocked, useSocialAction } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';

export default function Blocked() {
  const q = useBlocked();
  const act = useSocialAction();
  return (
    <Screen header={<Header title="Blocked players" subtitle="They can't see your profile or contact you" />} testID="blocked-screen">
      {q.isLoading ? (
        <LoadingList rows={3} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="No one is blocked" message="You can block a player from their profile." />
      ) : (
        <Card padded={false}>
          {(q.data ?? []).map((u) => (
            <PlayerRow key={u.id} user={u} right={<Button title="Unblock" size="sm" variant="secondary" onPress={() => act.mutate({ type: 'unblock', userId: u.id })} />} onPress={() => undefined} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
