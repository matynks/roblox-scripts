import { Stack } from 'expo-router';

import { useTheme } from '@/ui/theme';

export default function AppLayout() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="play/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
