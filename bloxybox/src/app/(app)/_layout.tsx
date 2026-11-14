import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="play/[slug]" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="dev/index" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
