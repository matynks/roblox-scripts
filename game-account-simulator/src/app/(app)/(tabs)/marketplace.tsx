import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/api';
import type { GamePassListing, ItemSlot, MarketCategory, MarketSort, Rarity } from '@/api/types';
import { BalanceChip } from '@/components/BalanceChip';
import { ItemCard } from '@/components/ItemCard';
import { useInventory, useMarket, useMe } from '@/hooks/queries';
import { ChipRow } from '@/ui/Chips';
import { GameThumb } from '@/ui/GameThumb';
import { GlyphIcon, Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Pill, Row } from '@/ui/primitives';
import { TAB_BAR_HEIGHT } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { EmptyState, ErrorState, LoadingGrid } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { RARITY_COLORS, RARITY_LABEL, radius, space, useTheme } from '@/ui/theme';
import { SLOT_LABEL } from '@/utils/format';

type Cat = MarketCategory | 'passes';

const CATEGORIES: { value: Cat; label: string; icon: any }[] = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'clothing', label: 'Clothing', icon: 'shirt' },
  { value: 'accessories', label: 'Accessories', icon: 'glasses' },
  { value: 'avatar', label: 'Head & Body', icon: 'happy' },
  { value: 'collectibles', label: 'Collectibles', icon: 'diamond' },
  { value: 'special', label: 'Special', icon: 'sparkles' },
  { value: 'passes', label: 'Game Passes', icon: 'ticket' },
];
const SLOTS: Record<string, ItemSlot[]> = {
  clothing: ['shirt', 'pants', 'shoes'],
  accessories: ['hat', 'face_accessory', 'neck', 'back'],
  avatar: ['hair', 'face'],
};
const SORTS: { value: MarketSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Best selling' },
  { value: 'newest', label: 'New releases' },
  { value: 'favorites', label: 'Most favorited' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

function PassRow({ pass }: { pass: GamePassListing }) {
  const t = useTheme();
  return (
    <Pressable testID={`pass-${pass.id}`} onPress={() => router.push(`/game/${pass.game_id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: pressed ? t.surfacePressed : t.surface, borderWidth: 1, borderColor: t.border })}>
      <View>
        <GameThumb thumbnail={pass.thumbnail} width={64} height={64} radius={14} />
        <View style={{ position: 'absolute', right: -6, bottom: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: pass.icon.color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.surface }}>
          <GlyphIcon glyph={pass.icon.glyph} size={14} color="#111" />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {pass.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {pass.game_title} · {pass.description}
        </Text>
      </View>
      {pass.owned ? <Pill label="Owned" color={t.success} icon="checkmark" /> : <OrbAmount amount={pass.price} variant="subheading" />}
    </Pressable>
  );
}

export default function Marketplace() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: string; slot?: string }>();
  const [category, setCategory] = useState<Cat>('all');
  const [slot, setSlot] = useState<ItemSlot | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [sort, setSort] = useState<MarketSort>('featured');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sheet, setSheet] = useState(false);
  const me = useMe();
  const inv = useInventory(me.data?.profile.id);

  useEffect(() => {
    if (params.category) setCategory(params.category as Cat);
    if (params.slot) {
      const s = params.slot as ItemSlot;
      setCategory((Object.keys(SLOTS).find((k) => SLOTS[k].includes(s)) as Cat) ?? 'all');
      setSlot(s);
    }
  }, [params.category, params.slot]);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  const query = useMemo(() => ({ category: (category === 'passes' ? 'all' : category) as MarketCategory, slot, rarity, sort, search: debounced, pageSize: 24, maxPrice: null }), [category, slot, rarity, sort, debounced]);
  const market = useMarket(query);
  const passes = useQuery({ queryKey: ['passes'], queryFn: () => backend.listGamePasses(), enabled: category === 'passes' });

  const owned = useMemo(() => {
    const m = new Map<string, number>();
    (inv.data ?? []).forEach((i) => m.set(i.item_id, (m.get(i.item_id) ?? 0) + 1));
    return m;
  }, [inv.data]);

  const cols = width >= 600 ? 4 : 3;
  const itemW = (Math.min(width, 900) - space.lg * 2 - space.md * (cols - 1)) / cols;
  const items = market.data?.pages.flatMap((p) => p.items) ?? [];
  const filtersActive = (rarity ? 1 : 0) + (sort !== 'featured' ? 1 : 0);

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Row justify="space-between">
        <Text variant="display" accessibilityRole="header">
          Market
        </Text>
        <BalanceChip testID="market-balance" />
      </Row>
      <Row gap={space.sm}>
        <View style={{ flex: 1 }}>
          <TextField testID="market-search" icon="search" placeholder="Search items" value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" />
        </View>
        <Pressable testID="market-filters" accessibilityRole="button" accessibilityLabel="Sort and filter" onPress={() => setSheet(true)} style={{ width: 50, height: 50, borderRadius: radius.md, backgroundColor: filtersActive ? t.primary : t.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="options" size={22} color={filtersActive ? '#fff' : t.text} />
        </Pressable>
      </Row>
      <ChipRow
        testIDPrefix="cat"
        value={category}
        onChange={(c) => {
          setCategory(c);
          setSlot(null);
        }}
        options={CATEGORIES}
      />
      {SLOTS[category] ? <ChipRow testIDPrefix="slot" value={(slot ?? 'any') as any} onChange={(s: string) => setSlot(s === 'any' ? null : (s as ItemSlot))} options={[{ value: 'any', label: 'Everything' }, ...SLOTS[category].map((s) => ({ value: s, label: SLOT_LABEL[s] }))] as any} /> : null}
      {category === 'collectibles' ? (
        <Text variant="caption" tone="muted">
          Limited items have a fixed number of copies, each with its own serial number. When they're gone, they're gone.
        </Text>
      ) : null}
    </View>
  );

  if (category === 'passes') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <FlatList
          testID="market-passes"
          data={passes.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40, gap: space.sm }}
          ListHeaderComponent={header}
          renderItem={({ item }) => <PassRow pass={item} />}
          ListEmptyComponent={passes.isLoading ? <LoadingGrid count={4} columns={1} height={80} /> : passes.error ? <ErrorState error={passes.error} onRetry={() => passes.refetch()} /> : undefined}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <FlatList
        key={cols}
        testID="market-grid"
        data={items}
        numColumns={cols}
        keyExtractor={(i) => i.id}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40, gap: space.md }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ItemCard item={item} width={itemW} owned={owned.get(item.id)} badge={item.season_key ? 'SEASON' : undefined} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => market.hasNextPage && !market.isFetchingNextPage && market.fetchNextPage()}
        refreshing={market.isRefetching && !market.isFetchingNextPage}
        onRefresh={() => market.refetch()}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          market.isLoading ? (
            <LoadingGrid count={9} columns={cols} height={itemW + 50} />
          ) : market.error ? (
            <ErrorState error={market.error} onRetry={() => market.refetch()} />
          ) : (
            <EmptyState icon="search" title="Nothing here" message="Try another search, category or filter." />
          )
        }
        ListFooterComponent={market.isFetchingNextPage ? <ActivityIndicator color={t.primary} style={{ margin: space.lg }} /> : undefined}
      />
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Sort & filter" testID="market-sheet">
        <Text variant="label" tone="muted">
          Sort by
        </Text>
        <View style={{ gap: 6 }}>
          {SORTS.map((s) => (
            <Pressable key={s.value} testID={`sort-${s.value}`} onPress={() => setSort(s.value)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md, borderRadius: radius.md, backgroundColor: sort === s.value ? t.primarySoft : t.surfaceAlt }}>
              <Text variant="bodyStrong" tone={sort === s.value ? 'primary' : 'default'}>
                {s.label}
              </Text>
              {sort === s.value ? <Icon name="checkmark" size={18} color={t.primary} /> : null}
            </Pressable>
          ))}
        </View>
        <Text variant="label" tone="muted">
          Rarity
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as Rarity[]).map((r) => (
            <Pressable key={r} testID={`rarity-${r}`} onPress={() => setRarity(rarity === r ? null : r)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: rarity === r ? RARITY_COLORS[r] : `${RARITY_COLORS[r]}22` }}>
              <Text variant="caption" color={rarity === r ? '#111' : RARITY_COLORS[r]} style={{ fontFamily: 'Nunito_800ExtraBold' }}>
                {RARITY_LABEL[r]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text
          variant="caption"
          tone="primary"
          onPress={() => {
            setSort('featured');
            setRarity(null);
          }}
        >
          Reset filters
        </Text>
      </Sheet>
    </View>
  );
}
