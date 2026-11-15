import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from './haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { BRAND_GRADIENT, radius, useTheme } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, fullWidth, style, testID, accessibilityHint }: ButtonProps) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const height = size === 'sm' ? 36 : size === 'lg' ? 54 : 46;
  const inactive = disabled || loading;

  const fg = { primary: '#fff', gold: '#2A1A00', danger: '#fff', secondary: t.text, ghost: t.primary, outline: t.text }[variant];
  const bg = { primary: 'transparent', gold: t.gold, danger: t.danger, secondary: t.surfaceAlt, ghost: 'transparent', outline: 'transparent' }[variant];

  const content = (
    <View style={[styles.inner, { height, paddingHorizontal: size === 'sm' ? 14 : 20 }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} color={fg} /> : null}
          <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={fg} style={{ fontFamily: 'Nunito_800ExtraBold' }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 18} color={fg} /> : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPressIn={() => (scale.value = withTiming(0.96, { duration: 80 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      style={[fullWidth && { alignSelf: 'stretch' }, style]}
    >
      <Animated.View
        style={[
          styles.base,
          { backgroundColor: bg, opacity: disabled && !loading ? 0.45 : 1 },
          variant === 'outline' && { borderWidth: 1.5, borderColor: t.borderStrong },
          anim,
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient colors={BRAND_GRADIENT as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        {content}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: 'hidden' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
