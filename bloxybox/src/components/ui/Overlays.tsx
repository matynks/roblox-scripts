import Ionicons from '@expo/vector-icons/Ionicons';
import { onlineManager } from '@tanstack/react-query';
import { memo, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoxCoinIcon } from '@/components/brand/Brand';
import { useToastStore, type Toast } from '@/stores/toast';
import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  );
}

export const OfflineBanner = memo(function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View pointerEvents="none" style={[styles.offline, { top: insets.top + spacing.xs }]} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline" size={14} color={colors.textOnGold} />
      <AppText variant="micro" color={colors.textOnGold} uppercase>
        Offline · showing saved data
      </AppText>
    </View>
  );
});

const TOAST_ICONS = {
  success: { icon: 'checkmark-circle', color: colors.success },
  error: { icon: 'alert-circle', color: colors.danger },
  info: { icon: 'information-circle', color: colors.info },
} as const;

const ToastView = memo(function ToastView({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.tone === 'error' ? 4500 : 3000);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);

  const meta = toast.tone === 'coin' ? null : TOAST_ICONS[toast.tone];
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => dismiss(toast.id)}
        style={[styles.toast, { borderColor: meta?.color ?? colors.coin }]}
      >
        {meta ? <Ionicons name={meta.icon} size={22} color={meta.color} /> : <BoxCoinIcon size={22} />}
        <View style={styles.toastText}>
          <AppText variant="bodyStrong">{toast.title}</AppText>
          {toast.message ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {toast.message}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.toastHost, { top: insets.top + spacing.sm }]}>
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </View>
  );
}

/** Bottom sheet used for confirmations (purchases, resets). */
export function Sheet({
  visible,
  onClose,
  children,
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (dismissable) onClose();
      }}
    >
      <View style={styles.sheetRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => {
            if (dismissable) onClose();
          }}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  offline: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    zIndex: 50,
    elevation: 50,
  },
  toastHost: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    zIndex: 100,
    elevation: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
  },
  toastText: {
    flex: 1,
    gap: 2,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
});
