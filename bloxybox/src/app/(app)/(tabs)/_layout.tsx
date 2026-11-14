import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { colors, fontFamily } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.backgroundDeep,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily, fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
      screenListeners={{ tabPress: () => haptics.tap() }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: tabIcon('compass', 'compass-outline') }} />
      <Tabs.Screen name="avatar" options={{ title: 'Avatar', tabBarIcon: tabIcon('happy', 'happy-outline') }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: tabIcon('bag-handle', 'bag-handle-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
