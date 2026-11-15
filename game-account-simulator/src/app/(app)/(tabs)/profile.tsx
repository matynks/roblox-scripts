import { ProfileScreen } from '@/components/ProfileView';
import { useMe } from '@/hooks/queries';
import { Screen } from '@/ui/Screen';
import { ErrorState, LoadingList } from '@/ui/states';

export default function MyProfile() {
  const me = useMe();
  if (me.isLoading) return <Screen tabInset><LoadingList rows={4} height={120} /></Screen>;
  if (!me.data) return <Screen tabInset><ErrorState error={me.error} onRetry={() => me.refetch()} /></Screen>;
  return <ProfileScreen username={me.data.profile.username} isSelfTab />;
}
