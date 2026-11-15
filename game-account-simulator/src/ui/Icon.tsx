import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme } from './theme';

type Ion = ComponentProps<typeof Ionicons>['name'];
type Mci = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Semantic icon names used across the app (achievements, glyphs, UI). */
const MAP: Record<string, { set: 'ion'; name: Ion } | { set: 'mci'; name: Mci }> = {
  rocket: { set: 'ion', name: 'rocket' },
  bag: { set: 'ion', name: 'bag-handle' },
  cube: { set: 'ion', name: 'cube' },
  cubes: { set: 'mci', name: 'cube-unfolded' },
  crown: { set: 'mci', name: 'crown' },
  diamond: { set: 'ion', name: 'diamond' },
  layers: { set: 'ion', name: 'layers' },
  shirt: { set: 'ion', name: 'shirt' },
  gamepad: { set: 'ion', name: 'game-controller' },
  joystick: { set: 'mci', name: 'controller-classic' },
  trophy: { set: 'ion', name: 'trophy' },
  compass: { set: 'ion', name: 'compass' },
  globe: { set: 'ion', name: 'earth' },
  bolt: { set: 'ion', name: 'flash' },
  tower: { set: 'mci', name: 'office-building' },
  target: { set: 'mci', name: 'target' },
  brain: { set: 'mci', name: 'brain' },
  ticket: { set: 'ion', name: 'ticket' },
  users: { set: 'ion', name: 'people' },
  userplus: { set: 'ion', name: 'person-add' },
  star: { set: 'ion', name: 'star' },
  flame: { set: 'ion', name: 'flame' },
  fire: { set: 'mci', name: 'fire' },
  medal: { set: 'ion', name: 'medal' },
  chevron: { set: 'mci', name: 'chevron-double-up' },
  chevrons: { set: 'mci', name: 'chevron-triple-up' },
  shield: { set: 'ion', name: 'shield-checkmark' },
  orb: { set: 'mci', name: 'hexagon-slice-6' },
  heart: { set: 'ion', name: 'heart' },
  clock: { set: 'ion', name: 'time' },
  eye: { set: 'ion', name: 'eye' },
  gem: { set: 'mci', name: 'diamond-stone' },
  bug: { set: 'ion', name: 'bug' },
  paw: { set: 'ion', name: 'paw' },
  x2: { set: 'mci', name: 'numeric-2-box-multiple' },
};

export type IconName = Ion;

export function Icon({ name, size = 20, color }: { name: Ion; size?: number; color?: string }) {
  const t = useTheme();
  return <Ionicons name={name} size={size} color={color ?? t.text} />;
}

/** Icon by semantic key (e.g. achievement icon names stored in content). */
export function GlyphIcon({ glyph, size = 20, color }: { glyph: string; size?: number; color?: string }) {
  const t = useTheme();
  const entry = MAP[glyph] ?? { set: 'ion' as const, name: 'sparkles' as Ion };
  return entry.set === 'ion' ? (
    <Ionicons name={entry.name} size={size} color={color ?? t.text} />
  ) : (
    <MaterialCommunityIcons name={entry.name} size={size} color={color ?? t.text} />
  );
}
