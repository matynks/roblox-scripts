import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { backend } from '@/api';
import { OfflineBanner } from '@/components/OfflineBanner';
import { queryClient, SessionProvider, useSession } from '@/state/session';
import { ThemeProvider, useTheme } from '@/ui/theme';
import { toast, ToastHost } from '@/ui/Toast';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const t = useTheme();
  const { ready, session, recovering, setRecovering } = useSession();
  const url = Linking.useLinkingURL();

  // Supabase email links (password recovery / confirmation) open the app via blockora://
  useEffect(() => {
    if (!url || !('handleDeepLink' in backend)) return;
    (backend as any)
      .handleDeepLink(url)
      .then((r: string | null) => {
        if (r === 'recovery') {
          setRecovering(true);
          router.replace('/reset-password');
        }
        if (r === 'signed_in') toast.success('Email confirmed', 'Welcome to Blockora!');
      })
      .catch(() => toast.error('Link expired', 'Please request a new link.'));
  }, [url, setRecovering]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const signedIn = !!session && !recovering;
  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade' }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <OfflineBanner />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
