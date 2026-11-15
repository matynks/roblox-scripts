import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { ItemCard } from '@/components/ItemCard';
import { GameCard } from '@/components/GameCard';
import { PlayerRow } from '@/components/PlayerRow';
import { useDiscover, useMarket, useSocialAction, useUserSearch } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Chips';
import { Card } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { EmptyState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { space } from '@/ui/theme';

type Tab = 'players' | 'games' | 'items';

export default function Search() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('players');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const h = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(h);
  }, [q]);
  const users = useUserSearch(tab === 'players' ? term : '');
  const discover = useDiscover();
  const items = useMarket({ category: 'all', sort: 'popular', search: tab === 'items' ? term : '', pageSize: 24, slot: null, rarity: null, maxPrice: null });
  const act = useSocialAction();
  const games = useMemo(() => (discover.data?.popular ?? []).filter((g) => term && (g.title.toLowerCase().includes(term.toLowerCase()) || g.genre.toLowerCase().includes(term.toLowerCase()))), [discover.data, term]);
  const cardW = (Math.min(width, 700) - space.lg * 2 - space.md) / 2;
  const itemW = (Math.min(width, 700) - space.lg * 2 - space.md * 2) / 3;

  return (
    <Screen keyboard header={<Header title="Search" />} testID="search-screen">
      <TextField testID="search-input" icon="search" placeholder="Players, games or items" value={q} onChangeText={setQ} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      <Segmented testIDPrefix="stab" value={tab} onChange={setTab} options={[{ value: 'players', label: 'Players', icon: 'people' }, { value: 'games', label: 'Games', icon: 'game-controller' }, { value: 'items', label: 'Items', icon: 'shirt' }]} />
      {term.length < 2 ? (
        <EmptyState icon="search" title="Start typing" message="Search by username or display name, game title, or item name." />
      ) : tab === 'players' ? (
        users.isLoading ? (
          <LoadingList rows={5} />
        ) : (users.data ?? []).length === 0 ? (
          <EmptyState icon="person-outline" title="No players found" message={`Nobody matches “${term}”.`} />
        ) : (
          <Card padded={false}>
            {(users.data ?? []).map((u) => (
              <PlayerRow
                key={u.id}
                user={u}
                testID={`search-user-${u.username}`}
                subtitle={`@${u.username} · ${u.followers.toLocaleString('en-US')} followers`}
                right={u.is_friend ? <Text variant="small" tone="success">Friend</Text> : <Button title="Add" size="sm" variant="outline" icon="person-add" onPress={() => act.mutate({ type: 'friend', userId: u.id, name: u.display_name })} testID={`search-add-${u.username}`} />}
              />
            ))}
          </Card>
        )
      ) : tab === 'games' ? (
        games.length === 0 ? (
          <EmptyState icon="game-controller-outline" title="No games found" />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {games.map((g) => (
              <GameCard key={g.id} game={g} width={cardW} />
            ))}
          </View>
        )
      ) : items.isLoading ? (
        <LoadingList rows={3} height={120} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {(items.data?.pages.flatMap((p) => p.items) ?? []).map((i) => (
            <ItemCard key={i.id} item={i} width={itemW} />
          ))}
          {(items.data?.pages[0]?.items.length ?? 0) === 0 ? <EmptyState icon="shirt-outline" title="No items found" actionLabel="Browse Market" onAction={() => router.push('/marketplace')} /> : null}
        </View>
      )}
    </Screen>
  );
}
