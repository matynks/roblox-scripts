import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { toAppError } from '@/api/errors';
import { AvatarView, ItemThumb } from '@/avatar/AvatarView';
import { Sparkline } from '@/components/Sparkline';
import { SEASONS } from '@/content/catalog';
import { useCatalog, useInventory, useItem, useMe, usePurchase, useSaveAvatar, useToggleItemFavorite } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, GradientFill, IconButton, Pill, ProgressBar, Row, StatTile } from '@/ui/primitives';
import { Header, Screen, SectionHeader } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { RARITY_COLORS, RARITY_LABEL, radius, space, useTheme } from '@/ui/theme';
import { SLOT_LABEL } from '@/utils/format';

export default function ItemDetail() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useItem(id ?? '');
  const me = useMe();
  const catalog = useCatalog();
  const inventory = useInventory(me.data?.profile.id);
  const purchase = usePurchase();
  const fav = useToggleItemFavorite();
  const saveAvatar = useSaveAvatar();
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One idempotency key per purchase intent; retries and double taps reuse it.
  const intentKey = useRef<string | null>(null);

  if (q.isLoading) return <Screen header={<Header title="Item" />}><LoadingList rows={4} height={140} /></Screen>;
  if (q.error || !q.data) return <Screen header={<Header title="Item" />}><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;

  const { item, owned_copies, favorited, price_points, set } = q.data;
  const rc = RARITY_COLORS[item.rarity];
  const balance = me.data?.wallet.balance ?? 0;
  const owns = owned_copies.length > 0;
  const soldOut = item.is_limited && (item.stock_remaining ?? 0) <= 0;
  const canBuyAnother = item.is_limited ? owned_copies.length < 3 : !owns;
  const offSeason = !!item.season_key && item.season_key !== me.data?.season.key;
  const purchasable = item.is_for_sale && !soldOut && canBuyAnother && !offSeason;
  const short = Math.max(0, item.price - balance);
  const equipped = me.data?.avatar.equipped[item.slot] === item.id;

  const startPurchase = () => {
    intentKey.current = randomUUID();
    setError(null);
    setConfirming(true);
  };

  const doPurchase = () => {
    if (!intentKey.current) intentKey.current = randomUUID();
    purchase.mutate(
      { item, key: intentKey.current },
      {
        onSuccess: () => {
          setConfirming(false);
          intentKey.current = null;
        },
        onError: (e) => {
          const err = toAppError(e);
          setError(err.message);
          // A definitive server refusal ends this intent; network errors keep the key for a safe retry.
          if (!err.retryable) intentKey.current = null;
          if (err.code === 'PRICE_CHANGED') q.refetch();
        },
      },
    );
  };

  const wearNow = () => {
    if (!me.data) return;
    saveAvatar.mutate({ ...me.data.avatar, equipped: { ...me.data.avatar.equipped, [item.slot]: item.id } }, { onSuccess: () => toast.success('Equipped', `You're wearing ${item.name}.`) });
  };

  const previewCfg = me.data ? { ...me.data.avatar, equipped: { ...me.data.avatar.equipped, [item.slot]: item.id } } : null;
  const setItems = set ? set.items.map((x) => catalog.byId.get(x)).filter(Boolean) : [];
  const ownedIds = new Set((inventory.data ?? []).map((i) => i.item_id));
  const setOwned = set ? set.items.filter((x) => ownedIds.has(x)).length : 0;

  return (
    <Screen
      header={<Header title={item.name} subtitle={`${SLOT_LABEL[item.slot]} · ${item.creator_name}`} right={<IconButton icon={favorited ? 'heart' : 'heart-outline'} color={favorited ? t.danger : undefined} label={favorited ? 'Remove from favorites' : 'Add to favorites'} onPress={() => fav.mutate(item.id)} />} />}
      testID="item-screen"
    >
      <GradientFill colors={[`${rc}44`, t.surface]} style={{ borderRadius: radius.xl, alignItems: 'center', paddingVertical: space.lg, borderWidth: 1, borderColor: `${rc}66` }}>
        <Pressable onPress={() => setPreview((v) => !v)} accessibilityRole="button" accessibilityLabel={preview ? 'Show item' : 'Try it on your avatar'}>
          {preview && previewCfg ? (
            <Animated.View entering={ZoomIn}>
              <AvatarView config={previewCfg} size={Math.min(220, width * 0.55)} />
            </Animated.View>
          ) : (
            <ItemThumb itemId={item.id} slot={item.slot} size={Math.min(240, width * 0.6)} />
          )}
        </Pressable>
        <Button title={preview ? 'Show item' : 'Try it on'} icon={preview ? 'cube-outline' : 'body-outline'} variant="secondary" size="sm" onPress={() => setPreview((v) => !v)} testID="try-on" />
        <Row gap={6} style={{ position: 'absolute', top: 12, left: 12 }}>
          <Pill label={RARITY_LABEL[item.rarity]} color={rc} solid />
          {item.is_limited ? <Pill label="Limited" color="#F472B6" icon="diamond" /> : null}
          {item.season_key ? <Pill label={SEASONS[item.season_key].name} color={t.accent} icon="sparkles" /> : null}
        </Row>
      </GradientFill>

      <Card style={{ gap: space.md }}>
        <Row justify="space-between">
          <View>
            <Text variant="label" tone="muted">
              Price
            </Text>
            {item.price > 0 ? <OrbAmount amount={item.price} variant="title" showSim /> : <Text variant="title" tone="success">Free</Text>}
          </View>
          {owns ? <Pill label={item.is_limited ? `Owned ×${owned_copies.length}` : 'Owned'} color={t.success} icon="checkmark-circle" /> : null}
        </Row>
        {item.is_limited ? (
          <View style={{ gap: 6 }}>
            <Row justify="space-between">
              <Text variant="caption" tone="muted">
                {soldOut ? 'Sold out' : `${(item.stock_remaining ?? 0).toLocaleString('en-US')} of ${item.stock_total?.toLocaleString('en-US')} left`}
              </Text>
              <Text variant="caption" tone="muted">
                {(item.stock_total! - item.stock_remaining!).toLocaleString('en-US')} sold
              </Text>
            </Row>
            <ProgressBar value={(item.stock_total! - item.stock_remaining!) / item.stock_total!} color="#F472B6" />
            {owned_copies.filter((c) => c.serial_number).length ? (
              <Text variant="caption" tone="primary">
                Your serials: {owned_copies.map((c) => `#${c.serial_number}`).join(', ')}
              </Text>
            ) : null}
          </View>
        ) : null}
        {offSeason ? (
          <Text variant="caption" tone="warning">
            Returns during {item.season_key ? SEASONS[item.season_key].name : 'its season'}.
          </Text>
        ) : null}
        {owns && !item.is_limited ? (
          <Button title={equipped ? 'Wearing now' : 'Wear now'} icon="body" variant={equipped ? 'secondary' : 'primary'} disabled={equipped} loading={saveAvatar.isPending} onPress={wearNow} fullWidth testID="wear-now" />
        ) : (
          <Button
            testID="buy-button"
            title={soldOut ? 'Sold out' : !item.is_for_sale ? 'Not for sale' : offSeason ? 'Unavailable this season' : !canBuyAnother ? 'Copy limit reached' : owns ? 'Buy another copy' : 'Buy'}
            icon="bag-handle"
            variant="gold"
            size="lg"
            fullWidth
            disabled={!purchasable}
            onPress={startPurchase}
          />
        )}
        {owns && item.is_limited ? <Button title={equipped ? 'Wearing now' : 'Wear now'} variant="secondary" disabled={equipped} onPress={wearNow} fullWidth /> : null}
      </Card>

      <Text variant="body" tone="muted">
        {item.description}
      </Text>

      <Row gap={space.sm}>
        <StatTile label="Sold" value={item.sales_count.toLocaleString('en-US')} icon="bag-check" />
        <StatTile label="Favorites" value={item.favorites_count.toLocaleString('en-US')} icon="heart" color={t.danger} />
        <StatTile label="Slot" value={SLOT_LABEL[item.slot]} icon="layers" />
      </Row>

      {price_points.length >= 2 ? (
        <Card style={{ gap: space.md }}>
          <Text variant="heading">{item.is_limited ? 'Recent average price' : 'Price history'}</Text>
          <Sparkline values={price_points.map((p) => p.avg_price)} width={Math.min(width, 700) - space.lg * 4} color={item.is_limited ? '#F472B6' : t.accent} />
          <Text variant="small" tone="faint">
            Simulated market data based on Orb sales.
          </Text>
        </Card>
      ) : null}

      {set ? (
        <>
          <SectionHeader title={`Part of the ${set.name} set`} />
          <Card style={{ gap: space.md }}>
            <Text variant="caption" tone="muted">
              {set.description} Collect every piece for a {set.reward_orbs.toLocaleString('en-US')} Orb bonus.
            </Text>
            <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
              {setItems.map((c) => (
                <Pressable key={c!.id} onPress={() => router.push(`/item/${c!.id}`)} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: t.surfaceAlt, borderWidth: 2, borderColor: c!.id === item.id ? t.primary : ownedIds.has(c!.id) ? t.success : 'transparent' }} accessibilityLabel={c!.name}>
                  <ItemThumb itemId={c!.id} slot={c!.slot} size={60} />
                </Pressable>
              ))}
            </Row>
            <Text variant="small" tone="faint">
              {setOwned}/{set.items.length} collected{setOwned === set.items.length ? ' — set complete!' : ''}
            </Text>
          </Card>
        </>
      ) : null}

      <Sheet
        visible={confirming}
        onClose={() => !purchase.isPending && setConfirming(false)}
        title="Confirm purchase"
        testID="purchase-sheet"
        footer={
          <>
            <Button title={short > 0 ? `Need ${short.toLocaleString('en-US')} more Orbs` : `Buy for ${item.price.toLocaleString('en-US')} Orbs`} variant="gold" size="lg" fullWidth disabled={short > 0} loading={purchase.isPending} onPress={doPurchase} testID="confirm-purchase" />
            {short > 0 ? <Button title="Earn Orbs in games" variant="ghost" fullWidth onPress={() => { setConfirming(false); router.push('/discover'); }} /> : null}
          </>
        }
      >
        <Row gap={space.md}>
          <View style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: t.surfaceAlt, overflow: 'hidden' }}>
            <ItemThumb itemId={item.id} slot={item.slot} size={84} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading">{item.name}</Text>
            <Pill label={RARITY_LABEL[item.rarity]} color={rc} size="sm" />
          </View>
        </Row>
        <Card elevated style={{ gap: 10 }}>
          <Row justify="space-between">
            <Text variant="body" tone="muted">
              Your balance
            </Text>
            <OrbAmount amount={balance} variant="bodyStrong" />
          </Row>
          <Row justify="space-between">
            <Text variant="body" tone="muted">
              Price
            </Text>
            <OrbAmount amount={-item.price} variant="bodyStrong" />
          </Row>
          <View style={{ height: 1, backgroundColor: t.border }} />
          <Row justify="space-between">
            <Text variant="bodyStrong">After purchase</Text>
            <OrbAmount amount={Math.max(0, balance - item.price)} variant="bodyStrong" color={short > 0 ? t.danger : undefined} />
          </Row>
        </Card>
        {error ? (
          <Row gap={8} style={{ backgroundColor: t.dangerSoft, padding: space.md, borderRadius: radius.md }}>
            <Icon name="alert-circle" size={18} color={t.danger} />
            <Text variant="caption" tone="danger" style={{ flex: 1 }} testID="purchase-error">
              {error}
            </Text>
          </Row>
        ) : null}
        <Text variant="small" tone="faint">
          Orbs are simulated currency with no real value. Purchases are final.
        </Text>
      </Sheet>
    </Screen>
  );
}
