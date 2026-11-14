import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { toAppError } from '@/api/errors';
import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const LoadingState = memo(function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
});

export const ErrorState = memo(function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const appError = toAppError(error);
  const offline = appError.code === 'NETWORK';
  return (
    <View style={styles.center}>
      <View style={[styles.iconWrap, { backgroundColor: offline ? colors.warningSoft : colors.dangerSoft }]}>
        <Ionicons
          name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={28}
          color={offline ? colors.warning : colors.danger}
        />
      </View>
      <AppText variant="subheading" align="center">
        {offline ? "You're offline" : title}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} align="center">
        {appError.message}
      </AppText>
      {onRetry ? <Button label="Try again" variant="secondary" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
});

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={colors.textSecondary} align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
});

/** Pulsing placeholder shown while content loads. */
export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  radius = radii.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.9, { duration: 750 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceHigh }, animated, style]}
    />
  );
});

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
