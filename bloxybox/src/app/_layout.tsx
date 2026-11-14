import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner, ToastHost } from '@/components/ui/Overlays';
import { useBootstrap } from '@/features/auth/bootstrap';
import { persistOptions, queryClient, wireQueryEnvironment } from '@/lib/queryClient';
import { useSessionStore } from '@/stores/session';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
wireQueryEnvironment();

function RootNavigator() {
  useBootstrap();
  const boot = useSessionStore((s) => s.boot);
  const signedIn = useSessionStore((s) => s.session !== null);

  useEffect(() => {
    if (boot !== 'booting') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [boot]);

  if (boot === 'booting') {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={boot === 'needs-setup'}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={boot === 'ready' && !signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={boot === 'ready' && signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <StatusBar style="light" />
          <RootNavigator />
          <OfflineBanner />
          <ToastHost />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
