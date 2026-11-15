import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from './haptics';
import { Icon } from './Icon';
import { Row } from './primitives';
import { Text } from './Text';
import { space, useTheme } from './theme';

export const TAB_BAR_HEIGHT = 64;

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  header?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  /** add bottom padding so content clears the floating tab bar */
  tabInset?: boolean;
  keyboard?: boolean;
  testID?: string;
}

export function Screen({ children, scroll = true, padded = true, header, refreshing, onRefresh, contentStyle, tabInset, keyboard, testID }: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (tabInset ? TAB_BAR_HEIGHT + 12 : 0) + insets.bottom + space.xl;
  const body = scroll ? (
    <ScrollView
      testID={testID}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ paddingHorizontal: padded ? space.lg : 0, paddingTop: space.sm, paddingBottom: bottom, gap: space.lg }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.primary} colors={[t.primary]} progressBackgroundColor={t.surface} /> : undefined}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[{ flex: 1, paddingHorizontal: padded ? space.lg : 0 }, contentStyle]}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {header}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

export function Header({ title, subtitle, back = true, right, onBack }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; onBack?: () => void }) {
  const t = useTheme();
  return (
    <Row style={{ paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 52 }} gap={space.sm}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace('/home');
          }}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.surfacePressed : t.surfaceAlt })}
        >
          <Icon name="chevron-back" size={22} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, paddingLeft: back ? 2 : space.xs }}>
        <Text variant="title" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Row>
  );
}

export function SectionHeader({ title, action, onAction, icon }: { title: string; action?: string; onAction?: () => void; icon?: ReactNode }) {
  return (
    <Row justify="space-between">
      <Row gap={8}>
        {icon}
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
      </Row>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
          <Text variant="caption" tone="primary" style={{ fontFamily: 'Nunito_800ExtraBold' }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}
