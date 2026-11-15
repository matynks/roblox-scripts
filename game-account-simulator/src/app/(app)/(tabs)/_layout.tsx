import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Headshot } from '@/avatar/AvatarView';
import { useMe } from '@/hooks/queries';
import { haptic } from '@/ui/haptics';
import { Icon, type IconName } from '@/ui/Icon';
import { CountBadge, GradientFill } from '@/ui/primitives';
import { TAB_BAR_HEIGHT } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { BRAND_GRADIENT, useTheme } from '@/ui/theme';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  home: { label: 'Home', icon: 'home-outline', active: 'home' },
  discover: { label: 'Discover', icon: 'compass-outline', active: 'compass' },
  avatar: { label: 'Avatar', icon: 'body-outline', active: 'body' },
  marketplace: { label: 'Market', icon: 'storefront-outline', active: 'storefront' },
  profile: { label: 'Profile', icon: 'person-circle-outline', active: 'person-circle' },
};

function TabButton({ name, focused, onPress, badge }: { name: string; focused: boolean; onPress: () => void; badge?: number }) {
  const t = useTheme();
  const cfg = TABS[name];
  const me = useMe();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(focused ? 1.06 : 1, { damping: 14 }) }] }));
  if (name === 'avatar') {
    return (
      <Pressable testID={`tab-${name}`} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={cfg.label} onPress={onPress} style={{ flex: 1, alignItems: 'center' }}>
        <Animated.View style={[{ marginTop: -22 }, anim]}>
          <GradientFill colors={BRAND_GRADIENT as unknown as [string, string]} style={{ width: 58, height: 58, borderRadius: 29, padding: 3 }}>
            <View style={{ flex: 1, borderRadius: 26, backgroundColor: t.bgElevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Headshot config={me.data?.avatar} size={52} background={t.surfaceAlt} />
            </View>
          </GradientFill>
        </Animated.View>
        <Text variant="small" tone={focused ? 'primary' : 'faint'} style={{ marginTop: 2, fontSize: 10.5 }}>
          {cfg.label}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable testID={`tab-${name}`} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={cfg.label} onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Animated.View style={anim}>
        <Icon name={focused ? cfg.active : cfg.icon} size={24} color={focused ? t.primary : t.textFaint} />
        {badge ? <CountBadge count={badge} style={{ position: 'absolute', top: -4, right: -10 }} /> : null}
      </Animated.View>
      <Text variant="small" tone={focused ? 'primary' : 'faint'} style={{ fontSize: 10.5 }}>
        {cfg.label}
      </Text>
    </Pressable>
  );
}

function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const t = useTheme();
  const me = useMe();
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(insets.bottom, 10), height: TAB_BAR_HEIGHT, borderRadius: 24, backgroundColor: t.tabBar, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 }} accessibilityRole="tablist">
      {state.routes.map((route, i) => (
        <TabButton
          key={route.key}
          name={route.name}
          focused={state.index === i}
          badge={route.name === 'profile' ? me.data?.counts.pending_friend_requests : undefined}
          onPress={() => {
            haptic.tap();
            navigateToTab(route.key);
          }}
        />
      ))}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="avatar" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
