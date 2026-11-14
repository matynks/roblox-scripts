import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/lib/haptics';
import { colors, radii, spacing } from '@/theme/tokens';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  tone?: 'default' | 'raised' | 'primary' | 'coin';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const TONES = {
  default: { bg: colors.surface, border: colors.border },
  raised: { bg: colors.surfaceRaised, border: colors.border },
  primary: { bg: colors.primarySoft, border: colors.primaryBorder },
  coin: { bg: colors.coinSoft, border: 'rgba(255, 194, 61, 0.35)' },
} as const;

export const Card = memo(function Card({
  children,
  onPress,
  onLongPress,
  padded = true,
  tone = 'default',
  style,
  accessibilityLabel,
  testID,
}: CardProps) {
  const t = TONES[tone];
  const base = [styles.card, { backgroundColor: t.bg, borderColor: t.border }, padded ? styles.padded : null, style];

  if (!onPress && !onLongPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={
        onPress
          ? () => {
              haptics.tap();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
      style={({ pressed }) => [...base, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
