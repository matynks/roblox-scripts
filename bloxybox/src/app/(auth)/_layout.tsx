import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
