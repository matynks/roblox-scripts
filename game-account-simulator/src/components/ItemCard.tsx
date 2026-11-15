import { router } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import type { CatalogItem } from '@/api/types';
import { ItemThumb } from '@/avatar/AvatarView';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { PressableCard, Row } from '@/ui/primitives';
import { Text } from '@/ui/Text';
import { RARITY_COLORS, RARITY_LABEL, space, useTheme } from '@/ui/theme';

export const ItemCard = memo(function ItemCard({ item, owned, width, onPress, badge }: { item: CatalogItem; owned?: number; width: number; onPress?: () => void; badge?: string }) {
  const t = useTheme();
  const rc = RARITY_COLORS[item.rarity];
  const soldOut = item.is_limited && (item.stock_remaining ?? 0) <= 0;
  return (
    <PressableCard
      testID={`item-${item.id}`}
      accessibilityLabel={`${item.name}, ${RARITY_LABEL[item.rarity]}, ${item.price} Orbs${owned ? ', owned' : ''}`}
      onPress={onPress ?? (() => router.push(`/item/${item.id}`))}
      style={{ width }}
    >
      <View style={{ height: width, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: rc }} />
        <ItemThumb itemId={item.id} slot={item.slot} size={width * 0.86} />
        {item.is_limited ? (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: soldOut ? t.textFaint : '#F472B6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text variant="small" color="#fff" style={{ fontSize: 9.5, lineHeight: 12 }}>
              {soldOut ? 'SOLD OUT' : 'LIMITED'}
            </Text>
          </View>
        ) : badge ? (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: t.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text variant="small" color="#00222A" style={{ fontSize: 9.5, lineHeight: 12 }}>
              {badge}
            </Text>
          </View>
        ) : null}
        {owned ? (
          <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: t.success, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            {owned > 1 ? (
              <Text variant="small" color="#fff" style={{ fontSize: 10 }}>
                ×{owned}
              </Text>
            ) : (
              <Icon name="checkmark" size={13} color="#fff" />
            )}
          </View>
        ) : null}
      </View>
      <View style={{ padding: space.sm, gap: 3 }}>
        <Text variant="caption" style={{ fontFamily: 'Nunito_700Bold' }} numberOfLines={1}>
          {item.name}
        </Text>
        <Row justify="space-between">
          {item.price > 0 ? <OrbAmount amount={item.price} variant="small" size={13} short /> : <Text variant="small" tone="success">Free</Text>}
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: rc }} accessibilityLabel={RARITY_LABEL[item.rarity]} />
        </Row>
      </View>
    </PressableCard>
  );
});
