import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import type { AvatarConfig, CatalogItem, ItemSlot } from '@/api/types';
import { AvatarView, ItemThumb } from '@/avatar/AvatarView';
import { SKIN_TONES } from '@/avatar/layout';
import { useCatalog, useInventory, useMe, useSaveAvatar } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { ChipRow, Segmented } from '@/ui/Chips';
import { haptic } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { GradientFill, IconButton, Pill, Row } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingGrid } from '@/ui/states';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { RARITY_COLORS, radius, space, useTheme } from '@/ui/theme';
import { SLOT_LABEL } from '@/utils/format';

type Tab = ItemSlot | 'body';
const TABS: { value: Tab; label: string; icon: any }[] = [
  { value: 'hair', label: 'Hair', icon: 'cut' },
  { value: 'face', label: 'Face', icon: 'happy' },
  { value: 'hat', label: 'Hats', icon: 'school' },
  { value: 'face_accessory', label: 'Face Gear', icon: 'glasses' },
  { value: 'neck', label: 'Neck', icon: 'ribbon' },
  { value: 'back', label: 'Back', icon: 'airplane' },
  { value: 'shirt', label: 'Tops', icon: 'shirt' },
  { value: 'pants', label: 'Bottoms', icon: 'walk' },
  { value: 'shoes', label: 'Shoes', icon: 'footsteps' },
  { value: 'body', label: 'Body', icon: 'body' },
];
const REQUIRED: ItemSlot[] = [];

const same = (a: AvatarConfig, b: AvatarConfig) => JSON.stringify({ ...a, equipped: Object.fromEntries(Object.entries(a.equipped).filter(([, v]) => v).sort()) }) === JSON.stringify({ ...b, equipped: Object.fromEntries(Object.entries(b.equipped).filter(([, v]) => v).sort()) });

function Stepper({ label, value, onChange, min = 0.9, max = 1.1, step = 0.05 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const t = useTheme();
  const pct = Math.round(value * 100);
  return (
    <Row justify="space-between" style={{ backgroundColor: t.surfaceAlt, borderRadius: radius.md, padding: space.sm, paddingLeft: space.md }}>
      <Text variant="bodyStrong">{label}</Text>
      <Row gap={space.sm}>
        <IconButton icon="remove" label={`Decrease ${label}`} size={36} tone="ghost" onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} />
        <Text variant="number" style={{ width: 48, textAlign: 'center' }}>
          {pct}%
        </Text>
        <IconButton icon="add" label={`Increase ${label}`} size={36} tone="ghost" onPress={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))} />
      </Row>
    </Row>
  );
}

export default function AvatarEditor() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const me = useMe();
  const inv = useInventory(me.data?.profile.id);
  const catalog = useCatalog();
  const save = useSaveAvatar();
  const [tab, setTab] = useState<Tab>('hair');
  const [draft, setDraft] = useState<AvatarConfig | null>(null);
  const [popKey, setPopKey] = useState(0);

  useEffect(() => {
    if (me.data?.avatar && !draft) setDraft(me.data.avatar);
  }, [me.data?.avatar, draft]);

  const owned = useMemo(() => {
    const map = new Map<ItemSlot, CatalogItem[]>();
    const seen = new Set<string>();
    (inv.data ?? []).forEach((i) => {
      if (seen.has(i.item_id)) return;
      seen.add(i.item_id);
      const c = catalog.byId.get(i.item_id);
      if (c) map.set(c.slot, [...(map.get(c.slot) ?? []), c]);
    });
    map.forEach((list) => list.sort((a, b) => b.price - a.price));
    return map;
  }, [inv.data, catalog.byId]);

  if (me.error) return <Screen tabInset><ErrorState error={me.error} onRetry={() => me.refetch()} /></Screen>;
  if (!draft || !me.data) return <Screen tabInset><LoadingGrid count={6} /></Screen>;

  const dirty = !same(draft, me.data.avatar);
  const equip = (slot: ItemSlot, id: string | null) => {
    haptic.light();
    setPopKey((k) => k + 1);
    setDraft((d) => (d ? { ...d, equipped: { ...d.equipped, [slot]: id ?? undefined } } : d));
  };
  const tileW = (Math.min(width, 700) - space.lg * 2 - space.sm * 3) / 4;
  const list = tab === 'body' ? [] : owned.get(tab) ?? [];

  return (
    <Screen tabInset testID="avatar-screen">
      <Row justify="space-between">
        <Text variant="display" accessibilityRole="header">
          Avatar
        </Text>
        <Row gap={8}>
          <IconButton icon="albums-outline" label="Outfits" onPress={() => router.push('/outfits')} />
          <IconButton icon="cube-outline" label="Inventory" onPress={() => router.push('/inventory')} />
        </Row>
      </Row>

      <GradientFill colors={t.scheme === 'dark' ? ['#1B1450', '#0C1120'] : ['#E6E1FF', '#F5F7FF']} style={{ borderRadius: radius.xl, alignItems: 'center', paddingTop: space.md, paddingBottom: space.sm, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', bottom: 18, width: 180, height: 26, borderRadius: 90, backgroundColor: t.scheme === 'dark' ? 'rgba(124,92,255,0.22)' : 'rgba(124,92,255,0.15)' }} />
        <Animated.View key={popKey} entering={popKey ? ZoomIn.springify().damping(14) : undefined}>
          <AvatarView config={draft} size={Math.min(210, width * 0.52)} testID="avatar-preview" />
        </Animated.View>
        {dirty ? (
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <Pill label="Unsaved changes" color={t.warning} icon="ellipse" size="sm" />
          </View>
        ) : null}
      </GradientFill>

      <Row gap={space.sm}>
        <Button title="Reset" variant="secondary" icon="refresh" disabled={!dirty} onPress={() => setDraft(me.data!.avatar)} style={{ flex: 1 }} testID="avatar-reset" />
        <Button
          title="Save look"
          icon="checkmark"
          disabled={!dirty}
          loading={save.isPending}
          onPress={() => save.mutate(draft, { onSuccess: () => toast.success('Look saved', 'Everyone will see your new style.') })}
          style={{ flex: 2 }}
          testID="avatar-save"
        />
      </Row>

      <ChipRow testIDPrefix="avtab" value={tab} onChange={setTab} options={TABS.map((x) => ({ ...x, count: x.value === 'body' ? undefined : owned.get(x.value as ItemSlot)?.length ?? 0 }))} />

      {tab === 'body' ? (
        <View style={{ gap: space.lg }}>
          <Text variant="label" tone="muted">
            Skin tone
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SKIN_TONES.map((c) => (
              <Pressable key={c} testID={`skin-${c}`} accessibilityRole="button" accessibilityLabel={`Skin tone ${c}`} accessibilityState={{ selected: draft.skin_tone.toUpperCase() === c }} onPress={() => setDraft({ ...draft, skin_tone: c })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: 3, borderColor: draft.skin_tone.toUpperCase() === c ? t.primary : 'transparent' }} />
            ))}
          </View>
          <Text variant="label" tone="muted">
            Body type
          </Text>
          <Segmented testIDPrefix="body" value={draft.body_type} onChange={(v) => setDraft({ ...draft, body_type: v })} options={[{ value: 'slim', label: 'Slim' }, { value: 'classic', label: 'Classic' }, { value: 'broad', label: 'Broad' }]} />
          <Stepper label="Height" value={Number(draft.height_scale)} onChange={(v) => setDraft({ ...draft, height_scale: v })} />
          <Stepper label="Head size" value={Number(draft.head_scale)} onChange={(v) => setDraft({ ...draft, head_scale: v })} />
        </View>
      ) : inv.isLoading || catalog.isLoading ? (
        <LoadingGrid count={8} columns={4} height={tileW} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {!REQUIRED.includes(tab) ? (
            <Pressable testID={`equip-none-${tab}`} onPress={() => equip(tab, null)} style={{ width: tileW, height: tileW, borderRadius: radius.md, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: !draft.equipped[tab] ? t.primary : 'transparent' }}>
              <Icon name="ban" size={24} color={t.textFaint} />
              <Text variant="small" tone="faint">
                None
              </Text>
            </Pressable>
          ) : null}
          {list.map((c) => {
            const on = draft.equipped[tab] === c.id;
            return (
              <Pressable key={c.id} testID={`equip-${c.id}`} accessibilityRole="button" accessibilityLabel={`${on ? 'Unequip' : 'Equip'} ${c.name}`} accessibilityState={{ selected: on }} onPress={() => equip(tab, on ? null : c.id)} style={{ width: tileW, height: tileW, borderRadius: radius.md, backgroundColor: t.surfaceAlt, borderWidth: 2, borderColor: on ? t.primary : 'transparent', overflow: 'hidden' }}>
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: RARITY_COLORS[c.rarity] }} />
                <ItemThumb itemId={c.id} slot={c.slot} size={tileW - 4} />
                {on ? (
                  <View style={{ position: 'absolute', right: 5, top: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="checkmark" size={12} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable testID={`shop-${tab}`} onPress={() => router.push({ pathname: '/marketplace', params: { slot: tab } })} style={{ width: tileW, height: tileW, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.borderStrong, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon name="add-circle" size={24} color={t.primary} />
            <Text variant="small" tone="primary">
              Get more
            </Text>
          </Pressable>
          {list.length === 0 ? (
            <View style={{ width: '100%' }}>
              <EmptyState icon="bag-handle-outline" title={`No ${SLOT_LABEL[tab].toLowerCase()} yet`} message="Find something you like in the Market." actionLabel="Browse" onAction={() => router.push({ pathname: '/marketplace', params: { slot: tab } })} />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
