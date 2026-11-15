import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect } from 'react';
import { Pressable, type PressableProps, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { haptic } from './haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

export function Card({ style, padded = true, elevated = false, ...rest }: ViewProps & { padded?: boolean; elevated?: boolean }) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: elevated ? t.surfaceAlt : t.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
          padding: padded ? space.lg : 0,
        },
        t.scheme === 'light' && styles.lightShadow,
        style,
      ]}
    />
  );
}

/** A card that animates a gentle press-in and fires a tap haptic. */
export function PressableCard({ style, children, onPress, accessibilityLabel, ...rest }: PressableProps & { style?: ViewStyle | ViewStyle[]; children: ReactNode }) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => (scale.value = withTiming(0.97, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 140 }))}
      onPress={(e) => {
        haptic.tap();
        onPress?.(e);
      }}
      {...rest}
    >
      <Animated.View
        style={[
          { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, overflow: 'hidden' },
          t.scheme === 'light' && styles.lightShadow,
          style,
          anim,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function Row({ style, gap = space.sm, align = 'center', justify, ...rest }: ViewProps & { gap?: number; align?: ViewStyle['alignItems']; justify?: ViewStyle['justifyContent'] }) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: align, gap, justifyContent: justify }, style]} />;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: inset }} />;
}

export function Pill({ label, color, icon, solid = false, size = 'md' }: { label: string; color?: string; icon?: IconName; solid?: boolean; size?: 'sm' | 'md' }) {
  const t = useTheme();
  const c = color ?? t.primary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: size === 'sm' ? 7 : 10,
        paddingVertical: size === 'sm' ? 2 : 4,
        borderRadius: radius.pill,
        backgroundColor: solid ? c : `${c}22`,
      }}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 13} color={solid ? '#fff' : c} /> : null}
      <Text variant="small" color={solid ? '#fff' : c} style={size === 'sm' ? { fontSize: 10.5, lineHeight: 13 } : undefined}>
        {label}
      </Text>
    </View>
  );
}

export function CountBadge({ count, style }: { count: number; style?: ViewStyle }) {
  const t = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, style]}>
      <Text variant="small" color="#fff" style={{ fontSize: 10.5, lineHeight: 13 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export function IconButton({ icon, onPress, label, size = 40, tone = 'surface', badge = 0, color }: { icon: IconName; onPress: () => void; label: string; size?: number; tone?: 'surface' | 'ghost' | 'primary'; badge?: number; color?: string }) {
  const t = useTheme();
  const bg = tone === 'surface' ? t.surfaceAlt : tone === 'primary' ? t.primary : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: pressed ? 0.7 : 1 })}
    >
      <Icon name={icon} size={size * 0.5} color={color ?? (tone === 'primary' ? '#fff' : t.text)} />
      {badge > 0 ? <CountBadge count={badge} style={{ position: 'absolute', top: -2, right: -2 }} /> : null}
    </Pressable>
  );
}

export function ProgressBar({ value, color, height = 8, track }: { value: number; color?: string; height?: number; track?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [pct, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? t.surfacePressed, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color ?? t.primary }, anim]} />
    </View>
  );
}

export function Skeleton({ width, height, radius: r = radius.md, style }: { width: ViewStyle['width']; height: number; radius?: number; style?: ViewStyle }) {
  const t = useTheme();
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: t.skeleton }, anim, style]} />;
}

export function GradientFill({ colors, style, children, start = { x: 0, y: 0 }, end = { x: 1, y: 1 } }: { colors: readonly [string, string, ...string[]]; style?: ViewStyle | ViewStyle[]; children?: ReactNode; start?: { x: number; y: number }; end?: { x: number; y: number } }) {
  return (
    <LinearGradient colors={colors} start={start} end={end} style={style as any}>
      {children}
    </LinearGradient>
  );
}

export function StatTile({ label, value, icon, color }: { label: string; value: string; icon?: IconName; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: 4 }}>
      <Row gap={6}>
        {icon ? <Icon name={icon} size={14} color={color ?? t.textMuted} /> : null}
        <Text variant="label" tone="faint" numberOfLines={1}>
          {label}
        </Text>
      </Row>
      <Text variant="heading" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function ListRow({ icon, iconColor, title, subtitle, right, onPress, danger, testID }: { icon?: IconName; iconColor?: string; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; danger?: boolean; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13, paddingHorizontal: space.lg, backgroundColor: pressed ? t.surfacePressed : 'transparent' })}
    >
      {icon ? (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${iconColor ?? (danger ? t.danger : t.primary)}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={iconColor ?? (danger ? t.danger : t.primary)} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" tone={danger ? 'danger' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={t.textFaint} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lightShadow: { shadowColor: '#1B2440', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
});
