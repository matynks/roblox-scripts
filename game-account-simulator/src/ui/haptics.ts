import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { usePrefs } from '@/state/prefs';

const enabled = () => Platform.OS !== 'web' && usePrefs.getState().haptics;

export const haptic = {
  tap: () => enabled() && Haptics.selectionAsync().catch(() => undefined),
  light: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  medium: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  success: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  error: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
  warning: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
