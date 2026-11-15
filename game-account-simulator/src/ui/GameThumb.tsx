import { memo, useId } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import type { GameThumbnail } from '@/content/types';

/** Original procedural thumbnail art for each experience (viewBox 0 0 160 100). */
function Emblem({ kind, accent }: { kind: string; accent: string }) {
  const w = '#FFFFFF';
  switch (kind) {
    case 'rush':
      return (
        <G>
          {[0, 1, 2].map((i) => (
            <Rect key={i} x={48 + i * 22} y={22} width={16} height={58} rx={4} fill={w} opacity={0.14} />
          ))}
          <Rect x={70} y={30} width={18} height={18} rx={4} fill="#FF4D6D" />
          <Polygon points="101,62 109,56 117,62 109,68" fill={accent} />
          <Circle cx={79} cy={72} r={8} fill={w} />
        </G>
      );
    case 'flame':
      return <Path d="M80 18 C96 38 104 48 100 64 C97 78 87 84 80 84 C70 84 60 76 60 62 C60 50 70 44 72 32 C78 40 78 46 82 50 C86 42 84 30 80 18Z" fill={accent} stroke={w} strokeWidth={3} />;
    case 'bolt':
      return <Polygon points="86,14 58,56 78,56 70,86 102,40 82,40" fill={accent} stroke={w} strokeWidth={3} strokeLinejoin="round" />;
    case 'snow':
      return (
        <G stroke={w} strokeWidth={5} strokeLinecap="round">
          {[0, 60, 120].map((r) => (
            <G key={r} transform={`rotate(${r} 80 50)`}>
              <Path d="M80 18 V82 M72 26 L80 34 L88 26 M72 74 L80 66 L88 74" fill="none" />
            </G>
          ))}
          <Circle cx={80} cy={50} r={6} fill={accent} stroke="none" />
        </G>
      );
    case 'stack':
    case 'candy':
    case 'gem':
      return (
        <G>
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={52 + i * 3} y={72 - i * 14} width={56 - i * 6} height={12} rx={kind === 'candy' ? 6 : 3} fill={i % 2 ? accent : w} opacity={0.95} />
          ))}
          {kind === 'gem' ? <Polygon points="80,14 92,24 80,34 68,24" fill={accent} /> : null}
        </G>
      );
    case 'smash':
      return (
        <G>
          {[
            [44, 22, 0.9],
            [86, 30, 1],
            [60, 58, 0.8],
            [100, 62, 0.7],
          ].map(([x, y, o], i) => (
            <Rect key={i} x={x} y={y} width={22} height={22} rx={5} fill={i === 1 ? accent : w} opacity={o} />
          ))}
          <Path d="M96 32 l10 -10 M104 40 l12 -2 M92 26 l0 -12" stroke={w} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'bug':
      return (
        <G>
          {[
            [56, 30],
            [100, 40],
            [72, 66],
          ].map(([x, y], i) => (
            <G key={i}>
              <Circle cx={x} cy={y} r={14} fill={accent} opacity={0.3} />
              <Circle cx={x} cy={y} r={6} fill={i === 1 ? w : accent} />
            </G>
          ))}
        </G>
      );
    case 'meteor':
      return (
        <G>
          <Path d="M30 20 L84 58" stroke={accent} strokeWidth={10} strokeLinecap="round" opacity={0.5} />
          <Circle cx={92} cy={62} r={16} fill={accent} stroke={w} strokeWidth={3} />
          <Circle cx={124} cy={30} r={4} fill={w} />
          <Circle cx={40} cy={74} r={3} fill={w} />
        </G>
      );
    case 'glyph':
    case 'rune':
      return (
        <G>
          {[0, 1].map((i) => (
            <G key={i} transform={`translate(${i * 40} 0)`}>
              <Rect x={42} y={22} width={34} height={50} rx={6} fill={i ? accent : w} />
              <Path d={i ? 'M52 36 L66 58 M66 36 L52 58' : 'M59 32 V62 M50 42 L59 32 L68 42'} stroke={i ? w : accent} strokeWidth={4} strokeLinecap="round" fill="none" />
            </G>
          ))}
        </G>
      );
    case 'wave':
      return (
        <G>
          <Path d="M20 62 Q40 46 60 62 T100 62 T140 62 V100 H20Z" fill={w} opacity={0.35} />
          <Path d="M20 72 Q40 56 60 72 T100 72 T140 72 V100 H20Z" fill={w} opacity={0.6} />
          <Path d="M72 26 q16 -8 20 10 q-12 4 -20 -10Z" fill={accent} />
        </G>
      );
    case 'paw':
      return (
        <G fill={w}>
          <Circle cx={80} cy={62} r={14} />
          <Circle cx={62} cy={42} r={7} />
          <Circle cx={74} cy={32} r={7} />
          <Circle cx={88} cy={32} r={7} />
          <Circle cx={99} cy={42} r={7} />
        </G>
      );
    default:
      return <Circle cx={80} cy={50} r={20} fill={accent} />;
  }
}

export const GameThumb = memo(function GameThumb({ thumbnail, width, height, radius = 14, style }: { thumbnail: GameThumbnail; width: number | `${number}%`; height: number; radius?: number; style?: ViewStyle }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden' }, style]} accessibilityRole="image">
      <Svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={thumbnail.from} />
            <Stop offset="1" stopColor={thumbnail.to} />
          </LinearGradient>
        </Defs>
        <Rect width={160} height={100} fill={`url(#g${id})`} />
        <Circle cx={18} cy={14} r={34} fill="#FFFFFF" opacity={0.08} />
        <Circle cx={150} cy={96} r={46} fill="#000000" opacity={0.12} />
        <Path d="M0 84 L40 70 L80 82 L120 66 L160 78 V100 H0Z" fill="#000000" opacity={0.12} />
        <Emblem kind={thumbnail.emblem} accent={thumbnail.accent} />
      </Svg>
    </View>
  );
});
