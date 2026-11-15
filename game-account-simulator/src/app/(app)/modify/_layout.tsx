import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { backend } from '@/api';
import { Button } from '@/ui/Button';
import { Header, Screen } from '@/ui/Screen';
import { EmptyState, LoadingList } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { router } from 'expo-router';

/**
 * Modify Menu gate. This check only decides what to render — authorization is
 * enforced by the server on every admin_* call (developer_roles + SECURITY
 * DEFINER functions), so a modified client gains nothing.
 */
export default function ModifyLayout() {
  const t = useTheme();
  const access = useQuery({ queryKey: ['access'], queryFn: () => backend.getAccess(), staleTime: 30_000, retry: false });
  if (access.isLoading) {
    return (
      <Screen header={<Header title="Modify Menu" />}>
        <LoadingList rows={3} />
      </Screen>
    );
  }
  if (!access.data?.is_developer) {
    return (
      <Screen header={<Header title="Restricted" />} testID="modify-denied">
        <EmptyState icon="lock-closed" title="Developer access required" message={backend.mode === 'offline' ? 'The Modify Menu needs an online Blockora server so every change can be authorized and audited.' : 'Your account does not have developer permissions.'} />
        <Button title="Go back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }} />;
}
