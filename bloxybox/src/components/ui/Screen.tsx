import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, hitSlop, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). Use false for screens that own a FlatList. */
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  /** Show a back button in the header (stack screens). */
  back?: boolean;
  headerRight?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Apply the bottom safe-area inset (true for stack screens without a tab bar). */
  bottomInset?: boolean;
  footer?: ReactNode;
  testID?: string;
};

export function goBack(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  if (!title && !back && !right) return null;
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={hitSlop}
          style={({ pressed }) => [styles.backButton, pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.headerTitles}>
        {title ? (
          <AppText variant={back ? 'heading' : 'title'} numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
});

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  back,
  headerRight,
  refreshing,
  onRefresh,
  contentStyle,
  bottomInset = false,
  footer,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = bottomInset ? insets.bottom + spacing.lg : spacing.xxl;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
      <ScreenHeader title={title} subtitle={subtitle} back={back} right={headerRight} />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surfaceRaised}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
