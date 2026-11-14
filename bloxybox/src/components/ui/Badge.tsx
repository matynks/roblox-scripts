import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type BadgeProps = {
  label: string;
  color?: string;
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
};

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Badge = memo(function Badge({ label, color = colors.textSecondary, solid = false, style }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: solid ? color : withAlpha(color, 0.14),
          borderColor: solid ? color : withAlpha(color, 0.4),
        },
        style,
      ]}
    >
      <AppText variant="micro" color={solid ? colors.backgroundDeep : color} uppercase numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
});

/** Marker used next to every simulated statistic. */
export const SimBadge = memo(function SimBadge() {
  return <Badge label="Sim" color={colors.info} />;
});

export { withAlpha };

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
