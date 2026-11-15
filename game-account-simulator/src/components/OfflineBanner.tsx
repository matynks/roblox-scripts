import { useNetInfo } from '@react-native-community/netinfo';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isOnline } from '@/api';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Shown when the device loses connectivity (online mode only — offline mode never needs the network). */
export function OfflineBanner() {
  const net = useNetInfo();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!isOnline || net.isConnected !== false) return null;
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp} pointerEvents="none" style={{ position: 'absolute', top: insets.top + 4, alignSelf: 'center', zIndex: 900 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.warning, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 }} accessibilityRole="alert">
        <Icon name="cloud-offline" size={15} color="#1A1200" />
        <Text variant="small" color="#1A1200">
          No connection — changes will sync when you're back
        </Text>
      </View>
    </Animated.View>
  );
}
