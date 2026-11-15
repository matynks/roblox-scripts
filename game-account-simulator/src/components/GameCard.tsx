import { router } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import type { GameCard as GameCardT } from '@/api/types';
import { GameThumb } from '@/ui/GameThumb';
import { Icon } from '@/ui/Icon';
import { compact } from '@/ui/Orb';
import { PressableCard, Row } from '@/ui/primitives';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';

export const GameCard = memo(function GameCard({ game, width = 168, extra }: { game: GameCardT; width?: number; extra?: string }) {
  const t = useTheme();
  return (
    <PressableCard testID={`game-${game.id}`} accessibilityLabel={`${game.title}. ${game.playing_now} playing`} onPress={() => router.push(`/game/${game.id}`)} style={{ width, borderWidth: 0, backgroundColor: 'transparent' }}>
      <GameThumb thumbnail={game.thumbnail} width={width} height={width * 0.62} />
      <View style={{ paddingTop: 7, gap: 2 }}>
        <Text variant="subheading" numberOfLines={1}>
          {game.title}
        </Text>
        <Row gap={10}>
          <Row gap={3}>
            <Icon name="thumbs-up" size={12} color={t.textMuted} />
            <Text variant="small" tone="muted">
              {game.rating ?? '—'}%
            </Text>
          </Row>
          <Row gap={4}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.success }} />
            <Text variant="small" tone="muted">
              {compact(game.playing_now)}
            </Text>
          </Row>
          {extra ? (
            <Text variant="small" tone="accent" numberOfLines={1} style={{ flexShrink: 1 }}>
              {extra}
            </Text>
          ) : null}
        </Row>
      </View>
    </PressableCard>
  );
});

export function GameRail({ games, extra }: { games: GameCardT[]; extra?: (g: GameCardT) => string | undefined }) {
  return (
    <Row gap={space.md} align="flex-start">
      {games.map((g) => (
        <GameCard key={g.id} game={g} extra={extra?.(g)} />
      ))}
    </Row>
  );
}
