import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/lib/haptics';
import { colors, minTouch, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'coin';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ComponentProps<typeof Ionicons>['name'];
  trailing?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
};

const VARIANTS: Record<Variant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.textOnPrimary, border: colors.primary },
  secondary: { bg: colors.surfaceHigh, pressed: colors.border, fg: colors.text, border: colors.border },
  ghost: { bg: colors.transparent, pressed: colors.surfaceRaised, fg: colors.text, border: colors.transparent },
  danger: { bg: colors.dangerSoft, pressed: 'rgba(255, 84, 112, 0.24)', fg: colors.danger, border: 'rgba(255, 84, 112, 0.4)' },
  coin: { bg: colors.coin, pressed: colors.coinDeep, fg: colors.textOnGold, border: colors.coin },
};

const SIZES: Record<Size, { height: number; paddingX: number; icon: number }> = {
  sm: { height: 36, paddingX: spacing.md, icon: 16 },
  md: { height: minTouch, paddingX: spacing.lg, icon: 18 },
  lg: { height: 56, paddingX: spacing.xl, icon: 20 },
};

export const Button = memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  trailing,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const theme = VARIANTS[variant];
  const dims = SIZES[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: dims.height,
          paddingHorizontal: dims.paddingX,
          backgroundColor: pressed ? theme.pressed : theme.bg,
          borderColor: theme.border,
          opacity: disabled && !loading ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={dims.icon} color={theme.fg} /> : null}
          <AppText variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={theme.fg} numberOfLines={1}>
            {label}
          </AppText>
          {trailing}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
