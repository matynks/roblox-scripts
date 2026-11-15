import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { FeedEvent } from '@/api/types';
import { Icon, type IconName } from '@/ui/Icon';
import { Row } from '@/ui/primitives';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { timeAgo } from '@/utils/format';

import { PlayerAvatar } from './PlayerRow';

const KIND: Record<string, { icon: IconName; color: string; text: (d: any) => string; href?: (d: any) => string }> = {
  joined: { icon: 'sparkles', color: '#7C5CFF', text: () => 'joined Blockora' },
  purchase: { icon: 'bag-handle', color: '#22D3EE', text: (d) => `bought ${d.name}`, href: (d) => `/item/${d.item_id}` },
  pass_purchase: { icon: 'ticket', color: '#22D3EE', text: (d) => `got the ${d.name} pass in ${d.game_title}`, href: (d) => `/game/${d.game_id}` },
  game_played: { icon: 'game-controller', color: '#34D399', text: (d) => `played ${d.title} for the first time`, href: (d) => `/game/${d.game_id}` },
  new_best: { icon: 'trophy', color: '#FBBF24', text: (d) => `set a new best of ${Number(d.score).toLocaleString('en-US')} in ${d.title}`, href: (d) => `/game/${d.game_id}` },
  achievement: { icon: 'medal', color: '#FBBF24', text: (d) => `unlocked “${d.name}”` },
  friend: { icon: 'people', color: '#A78BFA', text: () => 'made a new friend' },
  level_up: { icon: 'arrow-up-circle', color: '#34D399', text: (d) => `reached level ${d.level}` },
  outfit_shared: { icon: 'shirt', color: '#F472B6', text: (d) => `shared the outfit “${d.name}”` },
  set_complete: { icon: 'layers', color: '#F472B6', text: (d) => `completed the ${d.name} set` },
};

export function FeedItem({ event, showUser = true }: { event: FeedEvent; showUser?: boolean }) {
  const t = useTheme();
  const k = KIND[event.kind] ?? { icon: 'ellipse' as IconName, color: t.textMuted, text: () => event.kind };
  const href = k.href?.(event.data);
  return (
    <Pressable accessibilityRole={href ? 'link' : undefined} disabled={!href} onPress={() => href && router.push(href as any)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Row gap={space.md} align="flex-start" style={{ paddingVertical: 8 }}>
        {showUser && event.user ? (
          <Pressable onPress={() => router.push(`/user/${event.user!.username}`)} accessibilityLabel={`Open ${event.user.display_name}'s profile`}>
            <PlayerAvatar user={event.user} size={40} />
          </Pressable>
        ) : (
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${k.color}22`, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={k.icon} size={17} color={k.color} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="caption" numberOfLines={3}>
            {showUser && event.user ? <Text variant="caption" style={{ fontFamily: 'Nunito_800ExtraBold' }}>{event.user.display_name} </Text> : null}
            <Text variant="caption" tone="muted">{k.text(event.data)}</Text>
          </Text>
          <Row gap={5} style={{ marginTop: 2 }}>
            <Icon name={k.icon} size={11} color={k.color} />
            <Text variant="small" tone="faint">
              {timeAgo(event.created_at)}
            </Text>
          </Row>
        </View>
      </Row>
    </Pressable>
  );
}
