import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AvatarAppearance } from '@/api/types';
import { LogoMark, Wordmark } from '@/components/brand/Brand';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { AvatarView } from '@/features/avatar/AvatarView';
import { colors, radii, spacing } from '@/theme/tokens';

const HERO_AVATAR: AvatarAppearance = {
  skin_color: '#8FE3C4',
  head_shape: 'cube',
  equipped: [
    { item_id: 'hero-hat', slot: 'hat', asset_key: 'propeller', primary_color: '#FFC83D', secondary_color: '#4F7CFF' },
    { item_id: 'hero-face', slot: 'face', asset_key: 'grin', primary_color: '#1B1B2A', secondary_color: '#FFFFFF' },
    { item_id: 'hero-top', slot: 'top', asset_key: 'jacket', primary_color: '#3048C9', secondary_color: '#F3F4FF' },
    { item_id: 'hero-bottom', slot: 'bottom', asset_key: 'sport', primary_color: '#222638', secondary_color: '#FF4F8B' },
    { item_id: 'hero-back', slot: 'back', asset_key: 'cape', primary_color: '#E63946', secondary_color: '#FFD166' },
  ],
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
        <LogoMark size={44} />
        <Wordmark />
      </Animated.View>

      <View style={styles.stage}>
        <View style={styles.glow} />
        <View style={styles.platform} />
        <AvatarView appearance={HERO_AVATAR} size={190} accessibilityLabel="A BloxyBox avatar" />
      </View>

      <Animated.View entering={FadeInUp.duration(500).delay(150)} style={styles.copy}>
        <AppText variant="display" align="center">
          Build your box. Play your way.
        </AppText>
        <AppText variant="body" color={colors.textSecondary} align="center">
          Customise your Boxling, collect gear with BoxCoins and play original mini-games.
        </AppText>
      </Animated.View>

      <View style={styles.actions}>
        <Button label="Create account" size="lg" fullWidth onPress={() => router.push('/sign-up')} />
        <Button label="I already have an account" variant="secondary" size="lg" fullWidth onPress={() => router.push('/sign-in')} />
        <AppText variant="caption" color={colors.textMuted} align="center">
          BoxCoins and all stats are simulated inside BloxyBox and have no real-world value.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primarySoft,
  },
  platform: {
    position: 'absolute',
    bottom: 4,
    width: 180,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHigh,
  },
  copy: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
