import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CatalogItem, ItemSlot, Rarity } from '@/api/types';
import { ItemThumb } from '@/avatar/AvatarView';
import { ItemCard } from '@/components/ItemCard';
import { useCatalog, useFavoriteItems, useInventory, useItemSets, useMe, useSetClaims } from '@/hooks/queries';
import { ChipRow, Segmented } from '@/ui/Chips';
import { Icon } from '@/ui/Icon';
import { compact, OrbAmount } from '@/ui/Orb';
import { Card, Pill, ProgressBar, Row, StatTile } from '@/ui/primitives';
import { Header } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingGrid } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { RARITIES } from '@/content/types';
import { radius, space, useTheme } from '@/ui/theme';
import { SLOT_LABEL } from '@/utils/format';

type Sort = 'recent' | 'rarity' | 'value' | 'name';
const SLOTS: ItemSlot[] = ['hair', 'face', 'hat', 'face_accessory', 'neck', 'back', 'shirt', 'pants', 'shoes'];

export default function Inventory() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const me = useMe();
  const inv = useInventory(me.data?.profile.id);
  const catalog = useCatalog();
  const favs = useFavoriteItems();
  const sets = useItemSets();
  const claims = useSetClaims();
  const [tab, setTab] = useState<'items' | 'collections'>('items');
  const [slot, setSlot] = useState<'all' | 'favorites' | ItemSlot>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const m = new Map<string, { item: CatalogItem; copies: number; latest: string }>();
    (inv.data ?? []).forEach((i) => {
      const c = catalog.byId.get(i.item_id);
      if (!c) return;
      const e = m.get(i.item_id);
      if (e) {
        e.copies++;
        if (i.acquired_at > e.latest) e.latest = i.acquired_at;
      } else m.set(i.item_id, { item: c, copies: 1, latest: i.acquired_at });
    });
    return [...m.values()];
  }, [inv.data, catalog.byId]);

  const favSet = useMemo(() => new Set(favs.data ?? []), [favs.data]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rank = (r: Rarity) => RARITIES.indexOf(r);
    return grouped
      .filter((g) => (slot === 'all' ? true : slot === 'favorites' ? favSet.has(g.item.id) : g.item.slot === slot) && (!q || g.item.name.toLowerCase().includes(q)))
      .sort((a, b) =>
        sort === 'recent' ? b.latest.localeCompare(a.latest) : sort === 'rarity' ? rank(b.item.rarity) - rank(a.item.rarity) || b.item.price - a.item.price : sort === 'value' ? b.item.price * b.copies - a.item.price * a.copies : a.item.name.localeCompare(b.item.name),
      );
  }, [grouped, slot, sort, search, favSet]);

  const total = inv.data?.length ?? 0;
  const value = grouped.reduce((s, g) => s + g.item.price * g.copies, 0);
  const limiteds = grouped.filter((g) => g.item.is_limited).reduce((s, g) => s + g.copies, 0);
  const dupes = grouped.filter((g) => g.copies > 1).length;
  const cols = width >= 600 ? 4 : 3;
  const itemW = (Math.min(width, 900) - space.lg * 2 - space.md * (cols - 1)) / cols;
  const ownedIds = new Set(grouped.map((g) => g.item.id));
  const counts = Object.fromEntries(SLOTS.map((s) => [s, grouped.filter((g) => g.item.slot === s).length]));

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Row gap={space.sm}>
        <StatTile label="Items" value={compact(total)} icon="cube" />
        <StatTile label="Unique" value={String(grouped.length)} icon="sparkles" />
        <StatTile label="Value" value={compact(value)} icon="diamond" color={t.gold} />
      </Row>
      {limiteds || dupes ? (
        <Row gap={6}>
          {limiteds ? <Pill label={`${limiteds} limited cop${limiteds === 1 ? 'y' : 'ies'}`} color="#F472B6" icon="diamond" /> : null}
          {dupes ? <Pill label={`${dupes} with duplicates`} color={t.accent} icon="copy" /> : null}
        </Row>
      ) : null}
      <Segmented testIDPrefix="invtab" value={tab} onChange={setTab} options={[{ value: 'items', label: 'Items', icon: 'cube' }, { value: 'collections', label: 'Collections', icon: 'layers' }]} />
      {tab === 'items' ? (
        <>
          <TextField icon="search" placeholder="Search your items" value={search} onChangeText={setSearch} testID="inv-search" />
          <ChipRow testIDPrefix="invslot" value={slot} onChange={setSlot} options={[{ value: 'all', label: 'All', count: grouped.length }, { value: 'favorites', label: 'Favorites', icon: 'heart' }, ...SLOTS.filter((s) => counts[s]).map((s) => ({ value: s, label: SLOT_LABEL[s], count: counts[s] }))] as any} />
          <ChipRow testIDPrefix="invsort" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Recent', icon: 'time' }, { value: 'rarity', label: 'Rarity', icon: 'star' }, { value: 'value', label: 'Value', icon: 'trending-up' }, { value: 'name', label: 'A–Z', icon: 'text' }]} />
        </>
      ) : null}
    </View>
  );

  if (tab === 'collections') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <Header title="Inventory" />
        <FlatList
          data={sets.data ?? []}
          keyExtractor={(s) => s.key}
          contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + 40 }}
          ListHeaderComponent={header}
          renderItem={({ item: s }) => {
            const members = (catalog.data ?? []).filter((c) => c.set_key === s.key);
            const have = members.filter((m) => ownedIds.has(m.id)).length;
            const claimed = (claims.data ?? []).includes(s.key);
            return (
              <Card style={{ gap: space.md }} testID={`set-${s.key}`}>
                <Row justify="space-between">
                  <View style={{ flex: 1 }}>
                    <Text variant="heading">{s.name}</Text>
                    <Text variant="caption" tone="muted">
                      {s.description}
                    </Text>
                  </View>
                  {claimed ? <Pill label="Complete" color={t.success} icon="checkmark-circle" /> : <OrbAmount amount={s.reward_orbs} variant="caption" size={14} />}
                </Row>
                <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
                  {members.map((m) => (
                    <Pressable key={m.id} onPress={() => router.push(`/item/${m.id}`)} accessibilityLabel={`${m.name}${ownedIds.has(m.id) ? ', owned' : ''}`} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: t.surfaceAlt, opacity: ownedIds.has(m.id) ? 1 : 0.4, borderWidth: 2, borderColor: ownedIds.has(m.id) ? t.success : 'transparent' }}>
                      <ItemThumb itemId={m.id} slot={m.slot} size={52} />
                    </Pressable>
                  ))}
                </Row>
                <Row gap={8}>
                  <View style={{ flex: 1 }}>
                    <ProgressBar value={have / Math.max(members.length, 1)} color={claimed ? t.success : t.primary} />
                  </View>
                  <Text variant="small" tone="muted">
                    {have}/{members.length}
                  </Text>
                </Row>
              </Card>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }} testID="inventory-screen">
      <Header title="Inventory" subtitle={`${grouped.length} unique items`} right={<Pressable onPress={() => router.push('/marketplace')} accessibilityRole="button" accessibilityLabel="Open market"><Icon name="storefront-outline" size={24} color={t.primary} /></Pressable>} />
      <FlatList
        key={cols}
        data={list}
        numColumns={cols}
        keyExtractor={(g) => g.item.id}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={header}
        renderItem={({ item: g }) => <ItemCard item={g.item} width={itemW} owned={g.copies} />}
        initialNumToRender={12}
        removeClippedSubviews
        ListEmptyComponent={
          inv.isLoading || catalog.isLoading ? (
            <LoadingGrid count={9} columns={cols} height={itemW + 50} />
          ) : inv.error ? (
            <ErrorState error={inv.error} onRetry={() => inv.refetch()} />
          ) : (
            <EmptyState icon="cube-outline" title={slot === 'favorites' ? 'No favorites yet' : 'Nothing here yet'} message={slot === 'favorites' ? 'Tap the heart on any item to favorite it.' : 'Visit the Market to grow your collection.'} actionLabel="Open Market" onAction={() => router.push('/marketplace')} />
          )
        }
      />
    </View>
  );
}
