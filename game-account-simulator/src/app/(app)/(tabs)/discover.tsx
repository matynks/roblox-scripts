import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import type { GameCard as GameCardT } from '@/api/types';
import { GameCard, GameRail } from '@/components/GameCard';
import { useDiscover } from '@/hooks/queries';
import { ChipRow } from '@/ui/Chips';
import { GameThumb } from '@/ui/GameThumb';
import { haptic } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { compact } from '@/ui/Orb';
import { Card, Row } from '@/ui/primitives';
import { Screen, SectionHeader } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { radius, space, useTheme } from '@/ui/theme';

function FeaturedCard({ game, width }: { game: GameCardT; width: number }) {
  return (
    <Pressable
      testID={`featured-${game.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${game.title}`}
      onPress={() => {
        haptic.tap();
        router.push(`/game/${game.id}`);
      }}
      style={{ width }}
    >
      <GameThumb thumbnail={game.thumbnail} width={width} height={width * 0.5} radius={radius.xl} />
      <View style={{ position: 'absolute', left: 14, bottom: 12, right: 14 }}>
        <Text variant="label" color="rgba(255,255,255,0.85)">
          Featured · {game.genre}
        </Text>
        <Text variant="title" color="#fff" numberOfLines={1}>
          {game.title}
        </Text>
        <Text variant="caption" color="rgba(255,255,255,0.9)" numberOfLines={1}>
          {game.tagline}
        </Text>
      </View>
    </Pressable>
  );
}

function RankedRow({ games }: { games: GameCardT[] }) {
  const t = useTheme();
  return (
    <Card padded={false}>
      {games.slice(0, 5).map((g, i) => (
        <Pressable key={g.id} testID={`trending-${g.id}`} onPress={() => router.push(`/game/${g.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: pressed ? t.surfacePressed : 'transparent' })}>
          <Text variant="title" tone={i < 3 ? 'primary' : 'faint'} style={{ width: 26, textAlign: 'center' }}>
            {i + 1}
          </Text>
          <GameThumb thumbnail={g.thumbnail} width={64} height={42} radius={10} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {g.title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {g.genre} · {compact(g.playing_now)} playing
            </Text>
          </View>
          <Icon name="trending-up" size={18} color={t.success} />
        </Pressable>
      ))}
    </Card>
  );
}

export default function Discover() {
  const { width } = useWindowDimensions();
  const d = useDiscover();
  const [genre, setGenre] = useState<string>('all');
  const [search, setSearch] = useState('');
  const cardW = (Math.min(width, 640) - space.lg * 2 - space.md) / 2;

  const filtered = useMemo(() => {
    const all = d.data?.popular ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((g) => (genre === 'all' || g.genre === genre) && (!q || g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q)));
  }, [d.data, genre, search]);

  if (d.error) {
    return (
      <Screen tabInset>
        <ErrorState error={d.error} onRetry={() => d.refetch()} />
      </Screen>
    );
  }

  const browsing = genre !== 'all' || search.trim().length > 0;
  return (
    <Screen tabInset refreshing={d.isRefetching} onRefresh={() => d.refetch()} testID="discover-screen">
      <Text variant="display" accessibilityRole="header">
        Discover
      </Text>
      <TextField testID="discover-search" icon="search" placeholder="Search experiences" value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" />
      <ChipRow testIDPrefix="genre" value={genre} onChange={setGenre} options={[{ value: 'all', label: 'All', icon: 'apps' }, ...(d.data?.genres ?? []).map((g) => ({ value: g, label: g }))]} />
      {d.isLoading ? (
        <LoadingList rows={4} height={140} />
      ) : browsing ? (
        filtered.length === 0 ? (
          <EmptyState icon="search" title="No experiences found" message="Try a different search or genre." />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {filtered.map((g) => (
              <GameCard key={g.id} game={g} width={cardW} />
            ))}
          </View>
        )
      ) : (
        <>
          <ScrollView horizontal pagingEnabled={false} snapToInterval={width - space.lg * 2 + space.md} decelerationRate="fast" showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {(d.data?.featured ?? []).map((g) => (
              <FeaturedCard key={g.id} game={g} width={Math.min(width, 640) - space.lg * 2} />
            ))}
          </ScrollView>
          {d.data?.friends_playing?.length ? (
            <>
              <SectionHeader title="Friends are playing" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                <GameRail games={d.data.friends_playing} extra={(g) => `${g.friends} friend${g.friends === 1 ? '' : 's'}`} />
              </ScrollView>
            </>
          ) : null}
          <SectionHeader title="Recommended for you" icon={<Icon name="sparkles" size={18} color="#A78BFA" />} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
            <GameRail games={(d.data?.recommended ?? []).slice(0, 8)} />
          </ScrollView>
          <SectionHeader title="Trending now" icon={<Icon name="flame" size={18} color="#F97316" />} />
          <RankedRow games={d.data?.trending ?? []} />
          <SectionHeader title="Most popular" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
            <GameRail games={(d.data?.popular ?? []).slice(0, 8)} extra={(g) => `${compact(g.visits)} visits`} />
          </ScrollView>
          <SectionHeader title="Top rated" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
            <GameRail games={(d.data?.top_rated ?? []).slice(0, 8)} />
          </ScrollView>
          <SectionHeader title="New & updated" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
            <GameRail games={(d.data?.new ?? []).slice(0, 8)} />
          </ScrollView>
          <Row justify="center">
            <Text variant="small" tone="faint">
              All {d.data?.popular.length ?? 0} experiences are original and playable.
            </Text>
          </Row>
        </>
      )}
    </Screen>
  );
}
