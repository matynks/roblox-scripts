import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import type { PlayerCard } from '@/api/types';
import { Headshot } from '@/avatar/AvatarView';
import { haptic } from '@/ui/haptics';
import { Row } from '@/ui/primitives';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';

export function OnlineDot({ online, size = 12 }: { online: boolean | null | undefined; size?: number }) {
  const t = useTheme();
  if (online == null) return null;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: online ? t.success : t.textFaint, borderWidth: 2, borderColor: t.surface }} />;
}

export function PlayerAvatar({ user, size = 46 }: { user: PlayerCard; size?: number }) {
  return (
    <View>
      <Headshot config={user.avatar} size={size} />
      <View style={{ position: 'absolute', right: -1, bottom: -1 }}>
        <OnlineDot online={user.is_online} size={Math.max(10, size * 0.26)} />
      </View>
    </View>
  );
}

export function PlayerRow({ user, subtitle, right, onPress, testID }: { user: PlayerCard; subtitle?: string; right?: ReactNode; onPress?: () => void; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${user.display_name}, @${user.username}`}
      onPress={() => {
        haptic.tap();
        (onPress ?? (() => router.push(`/user/${user.username}`)))();
      }}
      style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: space.md, borderRadius: 14, backgroundColor: pressed ? t.surfacePressed : 'transparent' })}
    >
      <Row gap={space.md}>
        <PlayerAvatar user={user} />
        <View style={{ flex: 1 }}>
          <Row gap={6}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {user.display_name}
            </Text>
            <Text variant="small" tone="faint">
              Lv {user.level}
            </Text>
          </Row>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle ?? `@${user.username}`}
          </Text>
        </View>
        {right}
      </Row>
    </Pressable>
  );
}
