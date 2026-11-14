import { memo } from 'react';
import Svg, { G } from 'react-native-svg';

import type { AvatarAppearance, EquippedPart, Slot } from '@/api/types';
import type { HeadShape } from '@/theme/tokens';

import {
  Accessory,
  BackFront,
  BackLayer,
  BASE_LEGS,
  BASE_SUIT,
  BlankFace,
  Body,
  BottomDetail,
  Face,
  Hat,
  Head,
  HEADS,
  SHORTS_ASSETS,
  TopDetail,
  TOP_STYLES,
  type PartColors,
} from './parts';

export type AvatarFrame = 'full' | 'head' | Slot;

const VIEWBOXES: Record<AvatarFrame, string> = {
  full: '0 -44 200 284',
  head: '22 -40 156 166',
  hat: '26 -78 148 140',
  face: '40 14 120 110',
  top: '20 96 160 104',
  bottom: '44 160 112 76',
  accessory: '50 98 100 74',
  back: '0 96 200 140',
};

export const DEFAULT_SKIN = '#FFD86B';

function colorsOf(part: EquippedPart | undefined): PartColors {
  return { primary: part?.primary_color ?? BASE_SUIT, secondary: part?.secondary_color ?? '#FFFFFF' };
}

function bySlot(equipped: EquippedPart[]): Partial<Record<Slot, EquippedPart>> {
  const map: Partial<Record<Slot, EquippedPart>> = {};
  for (const part of equipped) map[part.slot] = part;
  return map;
}

export function appearanceKey(appearance: AvatarAppearance | null | undefined): string {
  if (!appearance) return 'none';
  const parts = appearance.equipped
    .map((p) => `${p.slot}:${p.asset_key}:${p.primary_color}:${p.secondary_color}`)
    .sort()
    .join('|');
  return `${appearance.skin_color}/${appearance.head_shape}/${parts}`;
}

type AvatarViewProps = {
  appearance: AvatarAppearance | null | undefined;
  size: number;
  frame?: AvatarFrame;
  accessibilityLabel?: string;
};

function AvatarViewInner({ appearance, size, frame = 'full', accessibilityLabel }: AvatarViewProps) {
  const skin = appearance?.skin_color ?? DEFAULT_SKIN;
  const shape: HeadShape = appearance?.head_shape ?? 'cube';
  const head = HEADS[shape];
  const parts = bySlot(appearance?.equipped ?? []);

  const top = parts.top;
  const topStyle = top ? TOP_STYLES[top.asset_key] : undefined;
  const topColors = colorsOf(top);
  const bottom = parts.bottom;
  const bottomColors = colorsOf(bottom);
  const back = parts.back;
  const face = parts.face;
  const hat = parts.hat;
  const accessory = parts.accessory;
  const height = frame === 'full' ? size * (284 / 200) : size;

  return (
    <Svg
      width={size}
      height={height}
      viewBox={VIEWBOXES[frame]}
      accessibilityLabel={accessibilityLabel ?? 'Avatar'}
      accessibilityRole="image"
    >
      <G>
        {back ? <BackLayer asset={back.asset_key} c={colorsOf(back)} /> : null}
        <Body
          skin={skin}
          torso={top ? topColors.primary : BASE_SUIT}
          sleeves={top && topStyle ? topStyle.sleeveColor(topColors) : BASE_SUIT}
          sleeveLength={topStyle?.sleeves ?? 'short'}
          legs={bottom ? bottomColors.primary : BASE_LEGS}
          shorts={bottom ? SHORTS_ASSETS.has(bottom.asset_key) : false}
        />
        {top ? <TopDetail asset={top.asset_key} c={topColors} /> : null}
        {bottom ? <BottomDetail asset={bottom.asset_key} c={bottomColors} /> : null}
        {back ? <BackFront asset={back.asset_key} c={colorsOf(back)} /> : null}
        {accessory ? <Accessory asset={accessory.asset_key} c={colorsOf(accessory)} /> : null}
        <Head skin={skin} shape={shape} />
        {face ? <Face asset={face.asset_key} c={colorsOf(face)} y={head.faceY} /> : <BlankFace y={head.faceY} />}
        {hat ? <Hat asset={hat.asset_key} c={colorsOf(hat)} top={head.y} head={head} /> : null}
      </G>
    </Svg>
  );
}

/** Memoised on the visual appearance only, so lists don't re-draw unchanged avatars. */
export const AvatarView = memo(
  AvatarViewInner,
  (a, b) =>
    a.size === b.size &&
    a.frame === b.frame &&
    a.accessibilityLabel === b.accessibilityLabel &&
    appearanceKey(a.appearance) === appearanceKey(b.appearance),
);

/** Renders a single catalog item on a neutral mannequin, framed on its slot. */
export const ItemPreview = memo(function ItemPreview({
  item,
  size,
}: {
  item: { slot: Slot; asset_key: string; primary_color: string; secondary_color: string; id: string };
  size: number;
}) {
  const appearance: AvatarAppearance = {
    skin_color: '#C9CCDD',
    head_shape: 'cube',
    equipped: [
      { item_id: item.id, slot: item.slot, asset_key: item.asset_key, primary_color: item.primary_color, secondary_color: item.secondary_color },
    ],
  };
  return <AvatarView appearance={appearance} size={size} frame={item.slot} accessibilityLabel="Item preview" />;
});
