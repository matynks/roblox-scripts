import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SLOT_LABELS, SLOTS, type Listing } from '@/api/types';
import { ListingCard } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { Chip, ChipRow, ListRow, SwitchRow } from '@/components/ui/Controls';
import { Sheet } from '@/components/ui/Overlays';
import { ScreenHeader } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useInventory } from '@/features/inventory/api';
import { useListings } from '@/features/market/api';
import { DEFAULT_FILTERS, filterListings, SORT_LABELS, type ListingFilters, type ListingSort } from '@/features/market/filters';
import { useWallet } from '@/features/wallet/api';
import { colors, fontFamily, radii, rarityColors, spacing, type Rarity } from '@/theme/tokens';

const RARITIES = Object.keys(rarityColors) as Rarity[];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listings = useListings();
  const inventory = useInventory();
  const wallet = useWallet();
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [filterSheet, setFilterSheet] = useState(false);

  const owned = useMemo(() => new Set((inventory.data ?? []).map((i) => i.item_id)), [inventory.data]);
  const results = useMemo(() => filterListings(listings.data ?? [], filters, owned), [listings.data, filters, owned]);
  const cardWidth = Math.floor((width - spacing.lg * 2 - spacing.md) / 2);
  const set = (patch: Partial<ListingFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const activeFilterCount = (filters.rarity !== 'all' ? 1 : 0) + (filters.hideOwned ? 1 : 0) + (filters.sort !== 'featured' ? 1 : 0);

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingCard
        listing={item}
        owned={owned.has(item.item_id)}
        width={cardWidth}
        onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.item_id } })}
      />
    ),
    [owned, cardWidth],
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={filters.query}
            onChangeText={(query) => set({ query })}
            placeholder="Search items"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            accessibilityLabel="Search items"
            autoCorrect={false}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters and sorting${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
          onPress={() => setFilterSheet(true)}
          style={[styles.filterButton, activeFilterCount ? { borderColor: colors.primary } : null]}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount ? colors.primary : colors.text} />
        </Pressable>
      </View>
      <ChipRow>
        <Chip label="All" selected={filters.slot === 'all'} onPress={() => set({ slot: 'all' })} />
        {SLOTS.map((s) => (
          <Chip key={s} label={SLOT_LABELS[s]} selected={filters.slot === s} onPress={() => set({ slot: s })} />
        ))}
      </ChipRow>
      <AppText variant="caption" color={colors.textSecondary}>
        {results.length} item{results.length === 1 ? '' : 's'} · {SORT_LABELS[filters.sort]}
      </AppText>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Shop"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => router.push('/wallet')} style={styles.balance}>
            <CoinAmount amount={wallet.data?.balance ?? 0} compact />
          </Pressable>
        }
      />
      {listings.isPending ? (
        <LoadingState label="Loading the shop…" />
      ) : listings.isError && !listings.data ? (
        <ErrorState error={listings.error} onRetry={() => listings.refetch()} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(l) => l.id}
          numColumns={2}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon="bag-outline"
              title="Nothing matches"
              message="Try another category or clear your filters."
              actionLabel="Clear filters"
              onAction={() => setFilters(DEFAULT_FILTERS)}
            />
          }
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          refreshing={listings.isRefetching}
          onRefresh={() => {
            void listings.refetch();
            void inventory.refetch();
          }}
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
        />
      )}

      <Sheet visible={filterSheet} onClose={() => setFilterSheet(false)}>
        <AppText variant="heading">Sort & filter</AppText>
        <View>
          {(Object.keys(SORT_LABELS) as ListingSort[]).map((sort) => (
            <ListRow
              key={sort}
              title={SORT_LABELS[sort]}
              chevron={false}
              onPress={() => set({ sort })}
              right={filters.sort === sort ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            />
          ))}
        </View>
        <AppText variant="subheading">Rarity</AppText>
        <View style={styles.rarityRow}>
          <Chip label="Any" selected={filters.rarity === 'all'} onPress={() => set({ rarity: 'all' })} />
          {RARITIES.map((r) => (
            <Chip
              key={r}
              label={r[0]!.toUpperCase() + r.slice(1)}
              selected={filters.rarity === r}
              color={rarityColors[r]}
              onPress={() => set({ rarity: r })}
            />
          ))}
        </View>
        <SwitchRow title="Hide items I own" value={filters.hideOwned} onValueChange={(hideOwned) => set({ hideOwned })} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBlock: { gap: spacing.md, paddingBottom: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily, fontSize: 16, paddingVertical: spacing.sm },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  column: { gap: spacing.md },
  rarityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
