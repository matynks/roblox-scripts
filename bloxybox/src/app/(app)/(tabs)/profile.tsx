import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProfileView } from '@/components/feature/ProfileView';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useProfileSummary } from '@/features/social/api';
import { useUserId } from '@/stores/session';
import { spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const userId = useUserId();
  const profile = useProfileSummary(userId);

  return (
    <Screen
      title="Profile"
      headerRight={<IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />}
      refreshing={profile.isRefetching}
      onRefresh={() => profile.refetch()}
    >
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError && !profile.data ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : profile.data ? (
        <ProfileView
          profile={profile.data}
          actions={
            <View style={styles.actions}>
              <Button label="Edit profile" icon="create-outline" variant="secondary" onPress={() => router.push('/settings/edit-profile')} style={styles.flex} />
              <Button label="Find players" icon="person-add-outline" variant="secondary" onPress={() => router.push('/players')} style={styles.flex} />
            </View>
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
