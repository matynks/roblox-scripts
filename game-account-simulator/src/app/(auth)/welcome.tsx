import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isOnline } from '@/api';
import { AvatarView } from '@/avatar/AvatarView';
import type { AvatarConfig } from '@/content/types';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';
import { OrbIcon } from '@/ui/Orb';
import { GradientFill, Row } from '@/ui/primitives';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';

const SHOWCASE: AvatarConfig[] = [
  { skin_tone: '#C68642', body_type: 'slim', height_scale: 1, head_scale: 1, equipped: { hair: 'hair-cotton-candy', face: 'face-starstruck', shirt: 'shirt-galaxy-tee', pants: 'pants-pleated-skirt', shoes: 'shoes-red-hightops', back: 'back-butterfly-wings' } },
  { skin_tone: '#F2C9A0', body_type: 'classic', height_scale: 1.05, head_scale: 1, equipped: { hair: 'hair-electric-spikes', face: 'face-too-cool', hat: 'hat-blockora-cap', shirt: 'shirt-blockora-tee', pants: 'pants-camo-cargo', shoes: 'shoes-white-sneakers', face_accessory: 'fx-aviator-shades' } },
  { skin_tone: '#8D5524', body_type: 'broad', height_scale: 1, head_scale: 1, equipped: { hair: 'hair-galaxy-afro', face: 'face-big-grin', shirt: 'shirt-knight-armor', pants: 'pants-knight-greaves', shoes: 'shoes-knight-sabatons', back: 'back-royal-cape' } },
];

export default function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }} testID="welcome-screen">
      <GradientFill colors={['#2A1A6E', t.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 460 }} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <View style={{ flex: 1, paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, justifyContent: 'space-between', paddingBottom: insets.bottom + space.xl }}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', gap: space.md }}>
          <Logo size={42} />
          <Text variant="body" tone="muted" align="center">
            Build your look. Play original games. Collect rare items.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(150).duration(600)}>
          <Row justify="center" align="flex-end" gap={0}>
            <AvatarView config={SHOWCASE[0]} size={120} />
            <AvatarView config={SHOWCASE[1]} size={150} style={{ zIndex: 2, marginHorizontal: -30 }} />
            <AvatarView config={SHOWCASE[2]} size={120} />
          </Row>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(300).duration(600)} style={{ gap: space.md }}>
          <Row gap={8} justify="center">
            {['14 games', '118 items', 'Live economy'].map((f) => (
              <View key={f} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: t.surfaceAlt }}>
                <Text variant="small" tone="muted">
                  {f}
                </Text>
              </View>
            ))}
          </Row>
          <Button title="Create account" size="lg" fullWidth onPress={() => router.push('/register')} testID="go-register" />
          <Button title="I already have an account" variant="secondary" size="lg" fullWidth onPress={() => router.push('/login')} testID="go-login" />
          <Row gap={6} justify="center" style={{ marginTop: space.xs }}>
            <OrbIcon size={13} />
            <Text variant="small" tone="faint" align="center" style={{ flexShrink: 1 }}>
              Independent simulator · not affiliated with Roblox · Orbs have no real value
              {isOnline ? '' : ' · progress saved on this device'}
            </Text>
          </Row>
        </Animated.View>
      </View>
    </View>
  );
}
