import { memo, useEffect, useId, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Rect } from 'react-native-svg';

import { CATALOG } from '@/content/catalog';
import type { AvatarConfig, ItemAsset, ItemSlot } from '@/content/types';
import { usePrefs } from '@/state/prefs';

import { bodyLayout, DEFAULT_AVATAR, shade } from './layout';
import { backItem, backItemFront, face, faceAccessory, hairBack, hairFront, hat, neckItem, pants, shirtBody, shirtShoulders, shoes, sleeveStyle } from './parts';

const ASSETS = new Map(CATALOG.map((c) => [c.id, c.asset]));

export function assetFor(itemId: string | undefined | null): ItemAsset | undefined {
  return itemId ? ASSETS.get(itemId) : undefined;
}

/** Pure SVG body (no animation) — shared by full avatars, headshots and item previews. */
function AvatarSvgBody({ config, uid }: { config: AvatarConfig; uid: string }) {
  const L = bodyLayout(config);
  const eq = config.equipped ?? {};
  const a = (slot: ItemSlot) => assetFor(eq[slot]);
  const skin = config.skin_tone || DEFAULT_AVATAR.skin_tone;
  const skinShade = shade(skin, -0.12);
  const shirt = a('shirt');
  const sleeves = sleeveStyle(shirt);
  const sleeveColor = shirt?.primary ?? '#6B7280';
  const back = a('back');
  const hairA = a('hair');
  const hatA = a('hat');
  const H = L.head;

  const arm = (x: number, y: number, h: number, key: string) => (
    <G key={key}>
      <Rect x={x} y={y} width={L.armW} height={h} rx={L.armW / 2} fill={sleeves === 'long' ? sleeveColor : skin} />
      {sleeves === 'short' ? <Rect x={x} y={y} width={L.armW} height={h * 0.42} rx={L.armW / 2} fill={sleeveColor} /> : null}
      {sleeves === 'long' && shirt?.shape === 'jacket' ? <Rect x={x} y={y + h - 8} width={L.armW} height={6} fill={shade(sleeveColor, -0.2)} /> : null}
      <Circle cx={x + L.armW / 2} cy={y + h} r={L.armW / 2 + 0.5} fill={skin} />
    </G>
  );

  return (
    <G>
      {/* ground shadow */}
      <Ellipse cx={L.cx} cy={L.feetY + 1} rx={L.torso.w * 0.62} ry={5} fill="#000000" opacity={0.18} />
      {back ? backItem(back, L, `${uid}bk`) : null}
      {hairA ? hairBack(hairA, L) : null}
      {pants(a('pants'), L, skin, `${uid}pn`)}
      {shoes(a('shoes'), L, skin)}
      {arm(L.leftArm.x, L.leftArm.y, L.leftArm.h, 'la')}
      {arm(L.rightArm.x, L.rightArm.y, L.rightArm.h, 'ra')}
      {shirtBody(shirt, L, `${uid}sh`)}
      {shirtShoulders(shirt, L)}
      {back ? backItemFront(back, L) : null}
      {a('neck') ? neckItem(a('neck')!, L, `${uid}nk`) : null}
      {/* head */}
      <Rect x={H.x} y={H.y} width={H.w} height={H.h} rx={H.r} fill={skin} />
      <Rect x={H.x} y={H.y + H.h * 0.55} width={H.w} height={H.h * 0.45} rx={H.r} fill={skinShade} opacity={0.18} />
      {hatA?.shape === 'helmet' ? null : face(a('face'), L, skin)}
      {a('face_accessory') && hatA?.shape !== 'helmet' ? faceAccessory(a('face_accessory')!, L, `${uid}fa`) : null}
      {hairA && hatA?.shape !== 'helmet' && hatA?.shape !== 'tophat' && hatA?.shape !== 'wizard' ? hairFront(hairA, L, `${uid}hr`) : null}
      {hatA ? hat(hatA, L, `${uid}ht`) : null}
    </G>
  );
}

export interface AvatarViewProps {
  config: AvatarConfig | null | undefined;
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/** Full-body avatar with a subtle idle "breathing" bob. */
export const AvatarView = memo(function AvatarView({ config, size = 220, animated = true, style, testID }: AvatarViewProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = usePrefs((s) => s.reduceMotion);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!animated || reduce) return;
    bob.value = withRepeat(withSequence(withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })), -1);
  }, [animated, reduce, bob]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const cfg = config ?? DEFAULT_AVATAR;
  return (
    <View style={[{ width: size, height: size * 1.2 }, style]} testID={testID} accessibilityRole="image" accessibilityLabel="Avatar">
      <Animated.View style={anim}>
        <Svg width={size} height={size * 1.2} viewBox="0 0 200 240">
          <AvatarSvgBody config={cfg} uid={uid} />
        </Svg>
      </Animated.View>
    </View>
  );
});

/** Circular head-and-shoulders portrait used for profile pictures and lists. */
export const Headshot = memo(function Headshot({ config, size = 44, ring, background }: { config: AvatarConfig | null | undefined; size?: number; ring?: string; background?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cfg = config ?? DEFAULT_AVATAR;
  const L = bodyLayout(cfg);
  const vbY = L.head.y - 22;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: background ?? '#26314F', borderWidth: ring ? 2 : 0, borderColor: ring }}
      accessibilityRole="image"
      accessibilityLabel="Avatar portrait"
    >
      <Svg width="100%" height="100%" viewBox={`30 ${vbY} 140 140`}>
        <AvatarSvgBody config={cfg} uid={uid} />
      </Svg>
    </View>
  );
});

// Square crop boxes (viewBox x y w h) framing each slot on the mannequin.
const THUMB_VIEW: Record<ItemSlot, string> = {
  hat: '30 -4 140 140',
  hair: '30 6 140 140',
  face: '50 42 100 100',
  face_accessory: '48 44 104 104',
  neck: '52 104 96 96',
  back: '-12 36 224 224',
  shirt: '42 108 116 116',
  pants: '54 166 92 92',
  shoes: '62 186 76 76',
};

const MANNEQUIN = '#E9C9A6';

/** Preview of a single catalog item, drawn on a neutral mannequin and cropped to its slot. */
export const ItemThumb = memo(function ItemThumb({ itemId, size = 96, slot, background }: { itemId: string; size?: number; slot: ItemSlot; background?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cfg = useMemo<AvatarConfig>(() => ({ ...DEFAULT_AVATAR, skin_tone: MANNEQUIN, equipped: { [slot]: itemId, ...(slot === 'face' || slot === 'face_accessory' ? {} : { face: undefined }) } }), [itemId, slot]);
  return (
    <View style={{ width: size, height: size, backgroundColor: background }} accessibilityRole="image">
      <Svg width="100%" height="100%" viewBox={THUMB_VIEW[slot]}>
        <AvatarSvgBody config={cfg} uid={uid} />
      </Svg>
    </View>
  );
});
