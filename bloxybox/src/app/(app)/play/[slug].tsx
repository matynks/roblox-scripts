import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useExperience } from '@/features/discover/api';
import { GameShell } from '@/games/GameShell';
import { getGame } from '@/games/registry';

export default function PlayScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const experience = useExperience(slug ?? '');
  const game = getGame(slug ?? '');

  if (experience.isPending) return <Screen back title=""><LoadingState /></Screen>;
  if (!experience.data) {
    return (
      <Screen back title="Play">
        {experience.isError ? (
          <ErrorState error={experience.error} onRetry={() => experience.refetch()} />
        ) : (
          <EmptyState icon="help-circle-outline" title="Experience not found" actionLabel="Back" onAction={() => router.back()} />
        )}
      </Screen>
    );
  }
  if (!game || experience.data.status !== 'playable') {
    return (
      <Screen back title={experience.data.title}>
        <EmptyState
          icon="construct-outline"
          title="Not playable yet"
          message={`${experience.data.title} is still in development.`}
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  return <GameShell game={game} experience={experience.data} />;
}
