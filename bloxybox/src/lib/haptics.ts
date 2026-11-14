import * as Haptics from 'expo-haptics';

import { usePreferences } from '@/stores/preferences';

function enabled(): boolean {
  return usePreferences.getState().haptics;
}

/** Fire-and-forget haptics that respect the player's preference and never throw. */
export const haptics = {
  tap() {
    if (enabled()) Haptics.selectionAsync().catch(() => undefined);
  },
  light() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  medium() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  heavy() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  },
  success() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  error() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  },
};
