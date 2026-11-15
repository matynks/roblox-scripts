import { useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/ProfileView';
import { useProfile } from '@/hooks/queries';
import { Header, Screen } from '@/ui/Screen';

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const q = useProfile(username ?? '');
  return (
    <Screen header={<Header title={q.data ? q.data.profile.display_name : 'Profile'} subtitle={q.data ? `@${q.data.profile.username}` : undefined} />} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <ProfileView username={username ?? ''} />
    </Screen>
  );
}
