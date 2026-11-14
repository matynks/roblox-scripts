import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { toAppError } from '@/api/errors';
import { ProfileView } from '@/components/feature/ProfileView';
import { Button } from '@/components/ui/Button';
import { useIsOnline } from '@/components/ui/Overlays';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { recordProfileVisit, useFollow, useProfileSummary } from '@/features/social/api';
import { haptics } from '@/lib/haptics';
import { useUserId } from '@/stores/session';
import { toast } from '@/stores/toast';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useUserId();
  const profile = useProfileSummary(id);
  const follow = useFollow();
  const online = useIsOnline();

  useEffect(() => {
    if (id && id !== me) void recordProfileVisit(id);
  }, [id, me]);

  useEffect(() => {
    // Viewing yourself: use the Profile tab instead.
    if (id && id === me) router.replace('/profile');
  }, [id, me]);

  const data = profile.data;
  const following = data?.relationship.is_following ?? false;

  return (
    <Screen back title={data ? data.display_name : 'Player'} bottomInset refreshing={profile.isRefetching} onRefresh={() => profile.refetch()}>
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError && !data ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : data ? (
        <ProfileView
          profile={data}
          actions={
            <Button
              label={following ? 'Following' : data.relationship.follows_you ? 'Follow back' : 'Follow'}
              icon={following ? 'checkmark' : 'person-add'}
              variant={following ? 'secondary' : 'primary'}
              disabled={!online}
              onPress={() => {
                haptics.light();
                follow.mutate(
                  { userId: data.id, follow: !following },
                  { onError: (e) => toast.error("Couldn't update follow", toAppError(e).message) },
                );
              }}
              fullWidth
              testID="follow-button"
            />
          }
        />
      ) : null}
    </Screen>
  );
}
