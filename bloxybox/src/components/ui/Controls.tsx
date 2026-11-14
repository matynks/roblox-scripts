import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { colors, hitSlop, minTouch, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Segmented tabs (e.g. Followers / Following / Friends). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                haptics.tap();
                onChange(option.value);
              }
            }}
            style={[styles.segment, active ? styles.segmentActive : null]}
          >
            <AppText variant="caption" color={active ? colors.text : colors.textSecondary} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Chip = memo(function Chip({
  label,
  selected,
  onPress,
  icon,
  color = colors.primary,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[
        styles.chip,
        selected ? { backgroundColor: color, borderColor: color } : null,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? colors.textOnPrimary : colors.textSecondary} /> : null}
      <AppText variant="caption" color={selected ? colors.textOnPrimary : colors.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
});

/** Horizontally scrolling row of chips. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      style={styles.chipRowScroll}
    >
      {children}
    </ScrollView>
  );
}

export const ProgressBar = memo(function ProgressBar({
  progress,
  color = colors.primary,
  height = 8,
}: {
  progress: number;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
});

export const ListRow = memo(function ListRow({
  icon,
  iconColor = colors.textSecondary,
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
  chevron = !!onPress,
  destructive,
  testID,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  testID?: string;
}) {
  const content = (
    <>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={20} color={destructive ? colors.danger : iconColor} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.text} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress && !onLongPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={
        onPress
          ? () => {
              haptics.tap();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
      delayLongPress={600}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.surfaceRaised } : null]}
    >
      {content}
    </Pressable>
  );
});

export const SwitchRow = memo(function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      chevron={false}
      right={
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.text}
        />
      }
    />
  );
});

export const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  onAction,
  right,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      {right}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={hitSlop}>
          <AppText variant="caption" color={colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
});

export const IconButton = memo(function IconButton({
  icon,
  label,
  onPress,
  color = colors.text,
  background = colors.surfaceRaised,
  size = 44,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  background?: string;
  size?: number;
  badge?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={color} />
      {badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
});

export const Divider = memo(function Divider() {
  return <View style={styles.divider} />;
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentActive: {
    backgroundColor: colors.surfaceHigh,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipRowScroll: {
    flexGrow: 0,
    marginHorizontal: -spacing.lg,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  track: {
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouch + 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surfaceRaised,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
});
