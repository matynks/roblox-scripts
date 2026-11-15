import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import type { UnlockedAchievement } from '@/api/types';

import { haptic } from './haptics';
import { GlyphIcon, Icon, type IconName } from './Icon';
import { OrbAmount } from './Orb';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

type ToastKind = 'success' | 'error' | 'info' | 'reward' | 'achievement';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  amount?: number;
  glyph?: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
const useToasts = create<ToastStore>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.slice(-2), { ...t, id: ++seq }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) => {
    haptic.success();
    useToasts.getState().push({ kind: 'success', title, message });
  },
  error: (title: string, message?: string) => {
    haptic.error();
    useToasts.getState().push({ kind: 'error', title, message });
  },
  info: (title: string, message?: string) => useToasts.getState().push({ kind: 'info', title, message }),
  reward: (title: string, amount: number, message?: string) => {
    haptic.success();
    useToasts.getState().push({ kind: 'reward', title, amount, message });
  },
  achievements: (list: UnlockedAchievement[] | undefined) =>
    list?.forEach((a) => useToasts.getState().push({ kind: 'achievement', title: `Achievement: ${a.name}`, amount: a.reward_orbs, glyph: a.icon })),
};

const ICON: Record<ToastKind, IconName> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  reward: 'gift',
  achievement: 'trophy',
};

function ToastCard({ item }: { item: ToastItem }) {
  const t = useTheme();
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const h = setTimeout(() => dismiss(item.id), item.kind === 'error' ? 4200 : 3200);
    return () => clearTimeout(h);
  }, [item, dismiss]);
  const color = { success: t.success, error: t.danger, info: t.accent, reward: t.gold, achievement: t.gold }[item.kind];
  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(160)} layout={LinearTransition}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => dismiss(item.id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: t.bgElevated, borderRadius: radius.lg, padding: space.md, paddingRight: space.lg, borderWidth: 1, borderColor: `${color}55`, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
          {item.glyph ? <GlyphIcon glyph={item.glyph} size={20} color={color} /> : <Icon name={ICON[item.kind]} size={22} color={color} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {item.title}
          </Text>
          {item.message ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}
        </View>
        {item.amount ? <OrbAmount amount={item.amount} signed variant="subheading" /> : null}
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const items = useToasts((s) => s.items);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: space.md, right: space.md, gap: space.sm, zIndex: 1000 }}>
      {items.map((i) => (
        <ToastCard key={i.id} item={i} />
      ))}
    </View>
  );
}
